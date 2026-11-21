"""Recomendaciones personalizadas de ZYRA: TF-IDF sobre catálogo e historial.
No cambia tablas ni escribe datos; reutiliza los eventos existentes de ZYRA.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.database import get_db
from app.models import Usuario, Rol, BusquedaRegistro, ProductoVista
from app.routers.cliente import listar_productos_destacados_cliente

router = APIRouter(tags=["Machine Learning - Recomendaciones"])


def _texto_producto(p):
    empresa = p.get("empresa") or {}
    variantes = p.get("variantes_disponibles") or []
    colores_tallas = " ".join(f"{v.get('color', '')} {v.get('talla', '')}" for v in variantes)
    return " ".join(str(x or "") for x in [
        p.get("nombre_producto"), p.get("categoria"), p.get("categoria"),
        p.get("descripcion"), p.get("marca"), p.get("genero"),
        empresa.get("nombre_empresa"), colores_tallas,
    ]).strip()


def recomendar_productos(catalogo, terminos, ids_vistos, limite=15):
    """Entrena TF-IDF en el catálogo actual y ordena por gustos + popularidad.
    Si faltan eventos personales, retorna un ranking general sin inventar preferencias.
    """
    if not catalogo:
        return [], "sin_productos"
    limite = max(1, min(int(limite), 30))
    catalogo = list(catalogo)
    documentos = [_texto_producto(p) for p in catalogo]
    documentos = [x if x.strip() else "producto moda" for x in documentos]
    referencias = {int(p["id_producto"]): documentos[i] for i, p in enumerate(catalogo)}
    historial = [str(t).strip() for t in terminos if str(t).strip()]
    historial += [referencias[i] for i in ids_vistos if i in referencias]
    if not historial:
        return catalogo[:limite], "popularidad_sin_historial"
    # Caracteres n-grama: tolera singular/plural y variaciones de español.
    modelo = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), strip_accents="unicode", lowercase=True)
    matriz = modelo.fit_transform(documentos + historial)
    perfil = matriz[len(documentos):].mean(axis=0)
    import numpy as np
    perfil_vector = np.asarray(perfil)
    semejanza = cosine_similarity(matriz[:len(documentos)], perfil_vector).ravel()
    # Se mantiene un pequeño peso de popularidad de las tarjetas originales.
    max_pop = max(len(catalogo) - 1, 1)
    puntuaciones = [0.90 * float(semejanza[i]) + 0.10 * (len(catalogo)-1-i) / max_pop for i in range(len(catalogo))]
    indices = sorted(range(len(catalogo)), key=lambda i: (-puntuaciones[i], i))[:limite]
    resultado = []
    for i in indices:
        p = dict(catalogo[i]); p["afinidad_ml"] = round(float(semejanza[i]) * 100, 1)
        resultado.append(p)
    return resultado, "tfidf_personalizado"


@router.get("/ml/recomendaciones")
def recomendaciones_ml(id_usuario: int, limite: int = 15, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    if usuario is None or usuario.estado != "ACTIVO":
        raise HTTPException(404, "Usuario no disponible")
    rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first()
    if rol is None or rol.nombre_rol.upper() != "CLIENTE":
        raise HTTPException(403, "Recomendaciones personalizadas solo para clientes")

    return calcular_recomendaciones_cliente(db, id_usuario, limite)


def calcular_recomendaciones_cliente(db: Session, id_usuario: int, limite: int = 15):
    # Reutilizamos formato de tarjetas y filtros de productos activos/aprobados.
    catalogo = listar_productos_destacados_cliente(criterio="vistas", limite=30, db=db)["productos"]
    busquedas = (db.query(BusquedaRegistro)
                 .filter(BusquedaRegistro.id_usuario == id_usuario)
                 .filter(BusquedaRegistro.termino.isnot(None))
                 .order_by(BusquedaRegistro.fecha_busqueda.desc()).limit(25).all())
    vistas = (db.query(ProductoVista)
              .filter(ProductoVista.id_usuario == id_usuario)
              .order_by(ProductoVista.fecha_vista.desc()).limit(25).all())
    terminos = [b.termino for b in busquedas if b.termino]
    ids_vistos = [v.id_producto for v in vistas]
    productos, metodo = recomendar_productos(catalogo, terminos, ids_vistos, limite)
    return {
        "mensaje": "Recomendaciones calculadas con datos reales de ZYRA",
        "metodo": metodo,
        "historial_busquedas": len(terminos),
        "historial_vistas": len(ids_vistos),
        "total": len(productos),
        "productos": productos,
    }
