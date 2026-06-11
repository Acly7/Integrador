from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
from PIL import Image
from sentence_transformers import SentenceTransformer
import chromadb
import shutil
import tempfile
import os
import unicodedata
import numpy as np

from app.database import get_db
from app.models import (
    Usuario,
    Rol,
    Empresa,
    Categoria,
    Producto,
    ProductoVariante,
    ProductoImagen
)

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
CHROMA_DIR = BASE_DIR / "chroma_db"
NOMBRE_COLECCION = "zyra_productos_imagenes"

_modelo_clip = None
_chroma_client = None
_coleccion = None
_textos_categoria_cache = None

# Umbrales más estrictos para evitar resultados que no tienen relación.
LIMITE_MAXIMO_RESULTADOS = 8
MINIMO_COINCIDENCIA_GENERAL = 76
MINIMO_SIN_CATEGORIA_SEGURA = 82

# Prompts usados por CLIP para reconocer el tipo de prenda de la foto.
# Se usan en inglés y español porque CLIP suele responder mejor con prompts en inglés,
# pero mantenemos palabras locales para el contexto del proyecto.
PROMPTS_CATEGORIAS = {
    "POLERAS": [
        "a photo of a t-shirt",
        "a white t-shirt",
        "a black t-shirt",
        "a short sleeve shirt",
        "a raglan t-shirt",
        "camiseta",
        "polera"
    ],
    "BUSOS": [
        "a sweatshirt without hood",
        "an oversized sweatshirt",
        "a long sleeve sweatshirt",
        "buso oversize",
        "buso"
    ],
    "VESTIDOS": [
        "a dress",
        "a long dress",
        "a short dress",
        "an elegant dress",
        "vestido"
    ],
    "PANTALONES": [
        "pants",
        "jeans",
        "trousers",
        "cargo pants",
        "pantalon",
        "pantalones"
    ],
    "CHOMPAS": [
        "a sweater",
        "a knit sweater",
        "a wool sweater",
        "chompa",
        "sueter"
    ],
    "CANGUROS": [
        "a hoodie",
        "a hooded sweatshirt",
        "canguro",
        "poleron con capucha"
    ],
    "CHAMARRAS": [
        "a jacket",
        "a leather jacket",
        "a coat jacket",
        "chamarra",
        "chaqueta"
    ],
    "SACOS": [
        "a blazer",
        "a formal jacket",
        "a suit jacket",
        "saco"
    ]
}


def obtener_modelo_clip():
    global _modelo_clip

    if _modelo_clip is None:
        _modelo_clip = SentenceTransformer("clip-ViT-B-32")

    return _modelo_clip


def obtener_cliente_chroma():
    global _chroma_client

    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    return _chroma_client


def obtener_coleccion():
    global _coleccion

    cliente = obtener_cliente_chroma()

    if _coleccion is None:
        _coleccion = cliente.get_or_create_collection(
            name=NOMBRE_COLECCION,
            metadata={"hnsw:space": "cosine"}
        )

    return _coleccion


def reiniciar_coleccion_productos():
    """Borra vectores viejos y crea la colección desde cero.
    Esto evita que aparezcan productos inactivos o imágenes anteriores.
    """
    global _coleccion

    cliente = obtener_cliente_chroma()

    try:
        cliente.delete_collection(NOMBRE_COLECCION)
    except Exception:
        pass

    _coleccion = cliente.get_or_create_collection(
        name=NOMBRE_COLECCION,
        metadata={"hnsw:space": "cosine"}
    )

    return _coleccion


def verificar_admin(db: Session, id_admin: int):
    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_admin
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Administrador no encontrado")

    rol = db.query(Rol).filter(
        Rol.id_rol == usuario.id_rol
    ).first()

    nombre_rol = rol.nombre_rol.upper() if rol else ""

    if nombre_rol not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    return usuario


def convertir_float(valor):
    return float(valor) if valor is not None else 0


def limpiar_metadata(metadata: dict):
    limpia = {}

    for clave, valor in metadata.items():
        if valor is None:
            limpia[clave] = ""
        elif isinstance(valor, (str, int, float, bool)):
            limpia[clave] = valor
        else:
            limpia[clave] = str(valor)

    return limpia


def normalizar_texto(texto: str):
    if not texto:
        return ""

    texto = str(texto).lower().strip()
    texto = unicodedata.normalize("NFD", texto)
    texto = "".join(caracter for caracter in texto if unicodedata.category(caracter) != "Mn")
    return texto


def familia_categoria(categoria: str):
    texto = normalizar_texto(categoria)

    if any(palabra in texto for palabra in ["polera", "camiseta", "playera", "remera", "tshirt", "t-shirt", "top"]):
        return "POLERAS"

    if any(palabra in texto for palabra in ["buso", "sudadera"]):
        return "BUSOS"

    if any(palabra in texto for palabra in ["vestido"]):
        return "VESTIDOS"

    if any(palabra in texto for palabra in ["pantalon", "jean", "mezclilla", "cargo"]):
        return "PANTALONES"

    if any(palabra in texto for palabra in ["chompa", "sueter", "sweater", "lana"]):
        return "CHOMPAS"

    if any(palabra in texto for palabra in ["canguro", "hoodie", "capucha"]):
        return "CANGUROS"

    if any(palabra in texto for palabra in ["chamarra", "chaqueta", "jacket", "casaca"]):
        return "CHAMARRAS"

    if any(palabra in texto for palabra in ["saco", "blazer"]):
        return "SACOS"

    return None


def resolver_ruta_imagen(url_imagen: str):
    if not url_imagen:
        return None

    ruta_relativa = url_imagen.lstrip("/")
    ruta_archivo = BASE_DIR / ruta_relativa

    if ruta_archivo.exists():
        return ruta_archivo

    return None


def generar_embedding_imagen(ruta_imagen: Path):
    modelo = obtener_modelo_clip()
    imagen = Image.open(ruta_imagen).convert("RGB")

    embedding = modelo.encode(
        imagen,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    return embedding.astype("float32")


def obtener_textos_categoria_embeddings():
    global _textos_categoria_cache

    if _textos_categoria_cache is not None:
        return _textos_categoria_cache

    modelo = obtener_modelo_clip()
    textos = []
    familias = []

    for familia, prompts in PROMPTS_CATEGORIAS.items():
        for prompt in prompts:
            textos.append(prompt)
            familias.append(familia)

    embeddings = modelo.encode(
        textos,
        convert_to_numpy=True,
        normalize_embeddings=True
    ).astype("float32")

    _textos_categoria_cache = {
        "familias": familias,
        "embeddings": embeddings
    }

    return _textos_categoria_cache


def detectar_familia_por_imagen(embedding_imagen):
    """Clasifica de forma aproximada la prenda subida.
    No entrena el modelo, solo compara la imagen contra prompts de categorías.
    """
    cache = obtener_textos_categoria_embeddings()
    familias = cache["familias"]
    embeddings_textos = cache["embeddings"]

    similitudes = embeddings_textos @ embedding_imagen
    puntajes = {}

    for indice, familia in enumerate(familias):
        puntajes[familia] = max(puntajes.get(familia, -1), float(similitudes[indice]))

    ordenadas = sorted(puntajes.items(), key=lambda item: item[1], reverse=True)

    if not ordenadas:
        return None, 0, []

    familia_ganadora, score_ganador = ordenadas[0]
    segundo_score = ordenadas[1][1] if len(ordenadas) > 1 else -1
    diferencia = score_ganador - segundo_score

    # Si la diferencia es muy baja, la clasificación no es confiable.
    # Igual usamos el top del producto si la imagen exacta existe en catálogo.
    if diferencia < 0.012:
        return None, score_ganador, ordenadas[:4]

    return familia_ganadora, score_ganador, ordenadas[:4]


def generar_embedding_lista(embedding_np):
    return embedding_np.tolist()


def obtener_producto_detalle(db: Session, id_producto: int, score: float | None = None):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        return None

    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == producto.id_empresa
    ).first()

    categoria = db.query(Categoria).filter(
        Categoria.id_categoria == producto.id_categoria
    ).first()

    imagen = db.query(ProductoImagen).filter(
        ProductoImagen.id_producto == producto.id_producto,
        ProductoImagen.es_principal == True
    ).first()

    variantes = db.query(ProductoVariante).filter(
        ProductoVariante.id_producto == producto.id_producto
    ).all()

    stock_total = sum(variante.stock for variante in variantes)

    if score is None:
        nivel = None
    elif score >= 96:
        nivel = "Coincidencia exacta o casi exacta"
    elif score >= 88:
        nivel = "Coincidencia muy alta"
    elif score >= 80:
        nivel = "Coincidencia alta"
    elif score >= 74:
        nivel = "Coincidencia media"
    else:
        nivel = "Coincidencia baja"

    return {
        "id_producto": producto.id_producto,
        "nombre_producto": producto.nombre_producto,
        "descripcion": producto.descripcion,
        "marca": producto.marca,
        "genero": producto.genero,
        "precio": convertir_float(producto.precio),
        "estado_producto": producto.estado_producto,
        "categoria": categoria.nombre_categoria if categoria else "Sin categoría",
        "familia_categoria": familia_categoria(categoria.nombre_categoria if categoria else ""),
        "imagen_principal": imagen.url_imagen if imagen else None,
        "stock_total": stock_total,
        "score_similitud": round(score, 2) if score is not None else None,
        "nivel_similitud": nivel,
        "empresa": {
            "id_empresa": empresa.id_empresa if empresa else None,
            "nombre_empresa": empresa.nombre_empresa if empresa else "Sin tienda",
            "descripcion": empresa.descripcion if empresa else None,
            "direccion": empresa.direccion if empresa else None,
            "ciudad": empresa.ciudad if empresa else None,
            "whatsapp": empresa.whatsapp if empresa else None,
            "instagram": empresa.instagram if empresa else None,
            "facebook": empresa.facebook if empresa else None,
            "logo_url": getattr(empresa, "logo_url", None) if empresa else None,
            "estado_empresa": empresa.estado_empresa if empresa else None,
        },
        "variantes": [
            {
                "id_variante": variante.id_variante,
                "color": variante.color,
                "talla": variante.talla,
                "stock": variante.stock,
                "disponible": variante.disponible,
            }
            for variante in variantes
        ],
    }


def eliminar_producto_indexado_ia(id_producto: int):
    """Quita un producto de ChromaDB sin romper el flujo principal.
    Se usa cuando el producto queda INACTIVO, AGOTADO, sin imagen o cuando su tienda
    deja de estar APROBADA.
    """
    id_vector = f"producto_{id_producto}"

    try:
        coleccion = obtener_coleccion()
        coleccion.delete(ids=[id_vector])
        return {
            "accion": "eliminado",
            "id_producto": id_producto,
            "id_vector": id_vector
        }
    except Exception as error:
        # Chroma puede lanzar error si el vector no existía. No debe bloquear el sistema.
        return {
            "accion": "sin_vector_o_no_eliminado",
            "id_producto": id_producto,
            "id_vector": id_vector,
            "detalle": str(error)
        }


def indexar_producto_individual_ia(db: Session, id_producto: int):
    """Indexa o actualiza un solo producto en ChromaDB.
    Esta función es la base de la indexación automática. Si el producto no cumple
    condiciones para aparecer en la búsqueda visual, su vector se elimina.
    """
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        eliminacion = eliminar_producto_indexado_ia(id_producto)
        return {
            "indexado": False,
            "motivo": "Producto no encontrado",
            "sincronizacion": eliminacion
        }

    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == producto.id_empresa
    ).first()

    categoria = db.query(Categoria).filter(
        Categoria.id_categoria == producto.id_categoria
    ).first()

    imagen = db.query(ProductoImagen).filter(
        ProductoImagen.id_producto == producto.id_producto,
        ProductoImagen.es_principal == True
    ).first()

    if producto.estado_producto != "ACTIVO":
        eliminacion = eliminar_producto_indexado_ia(producto.id_producto)
        return {
            "indexado": False,
            "motivo": f"Producto en estado {producto.estado_producto}",
            "sincronizacion": eliminacion
        }

    if not empresa or empresa.estado_empresa != "APROBADA":
        eliminacion = eliminar_producto_indexado_ia(producto.id_producto)
        return {
            "indexado": False,
            "motivo": "La tienda no está aprobada",
            "sincronizacion": eliminacion
        }

    if not imagen or not imagen.url_imagen:
        eliminacion = eliminar_producto_indexado_ia(producto.id_producto)
        return {
            "indexado": False,
            "motivo": "El producto no tiene imagen principal",
            "sincronizacion": eliminacion
        }

    ruta_imagen = resolver_ruta_imagen(imagen.url_imagen)

    if not ruta_imagen:
        eliminacion = eliminar_producto_indexado_ia(producto.id_producto)
        return {
            "indexado": False,
            "motivo": "No se encontró el archivo físico de la imagen principal",
            "sincronizacion": eliminacion
        }

    coleccion = obtener_coleccion()
    embedding = generar_embedding_lista(generar_embedding_imagen(ruta_imagen))
    id_vector = f"producto_{producto.id_producto}"
    familia = familia_categoria(categoria.nombre_categoria if categoria else "")

    metadata = limpiar_metadata({
        "id_producto": producto.id_producto,
        "id_empresa": empresa.id_empresa,
        "nombre_producto": producto.nombre_producto,
        "nombre_empresa": empresa.nombre_empresa,
        "categoria": categoria.nombre_categoria if categoria else "",
        "familia_categoria": familia or "",
        "precio": convertir_float(producto.precio),
        "imagen_principal": imagen.url_imagen,
        "estado_producto": producto.estado_producto,
        "estado_empresa": empresa.estado_empresa
    })

    documento = (
        f"{producto.nombre_producto} "
        f"{producto.descripcion or ''} "
        f"{producto.marca or ''} "
        f"{categoria.nombre_categoria if categoria else ''} "
        f"{familia or ''} "
        f"{empresa.nombre_empresa}"
    )

    coleccion.upsert(
        ids=[id_vector],
        embeddings=[embedding],
        metadatas=[metadata],
        documents=[documento]
    )

    return {
        "indexado": True,
        "id_producto": producto.id_producto,
        "id_vector": id_vector,
        "nombre_producto": producto.nombre_producto,
        "total_en_chromadb": coleccion.count()
    }


def sincronizar_producto_ia_seguro(db: Session, id_producto: int):
    """Sincroniza un producto sin detener la operación principal.
    Si CLIP/ChromaDB falla, el producto igual se guarda en PostgreSQL y se reporta
    el problema para que pueda revisarse luego.
    """
    try:
        return indexar_producto_individual_ia(db, id_producto)
    except Exception as error:
        print(f"[IA Zyra] No se pudo sincronizar el producto {id_producto}: {error}")
        return {
            "indexado": False,
            "id_producto": id_producto,
            "motivo": str(error),
            "error": True
        }


def sincronizar_productos_empresa_ia_seguro(db: Session, id_empresa: int):
    """Sincroniza todos los productos de una tienda.
    Sirve cuando el administrador aprueba, deshabilita o cambia el estado de una empresa.
    """
    productos = db.query(Producto).filter(
        Producto.id_empresa == id_empresa
    ).all()

    resultados = []

    for producto in productos:
        resultados.append(
            sincronizar_producto_ia_seguro(db, producto.id_producto)
        )

    return {
        "id_empresa": id_empresa,
        "total_productos": len(productos),
        "indexados": sum(1 for item in resultados if item.get("indexado")),
        "omitidos": sum(1 for item in resultados if not item.get("indexado")),
        "resultados": resultados
    }


@router.get("/ia/estado")
def estado_ia():
    coleccion = obtener_coleccion()

    return {
        "mensaje": "Motor de búsqueda visual activo",
        "coleccion": NOMBRE_COLECCION,
        "productos_indexados": coleccion.count()
    }


@router.post("/ia/productos/{id_producto}/sincronizar")
def sincronizar_producto_ia_manual(
    id_producto: int,
    id_admin: int,
    db: Session = Depends(get_db)
):
    verificar_admin(db, id_admin)
    return sincronizar_producto_ia_seguro(db, id_producto)


@router.post("/ia/empresas/{id_empresa}/sincronizar")
def sincronizar_empresa_ia_manual(
    id_empresa: int,
    id_admin: int,
    db: Session = Depends(get_db)
):
    verificar_admin(db, id_admin)
    return sincronizar_productos_empresa_ia_seguro(db, id_empresa)


@router.post("/ia/indexar-productos")
def indexar_productos_ia(
    id_admin: int,
    db: Session = Depends(get_db)
):
    verificar_admin(db, id_admin)

    # Reindexación limpia para que no queden vectores antiguos.
    coleccion = reiniciar_coleccion_productos()

    productos = (
        db.query(Producto, Empresa, Categoria, ProductoImagen)
        .join(Empresa, Producto.id_empresa == Empresa.id_empresa)
        .join(Categoria, Producto.id_categoria == Categoria.id_categoria)
        .join(ProductoImagen, Producto.id_producto == ProductoImagen.id_producto)
        .filter(Producto.estado_producto == "ACTIVO")
        .filter(Empresa.estado_empresa == "APROBADA")
        .filter(ProductoImagen.es_principal == True)
        .order_by(Producto.id_producto.desc())
        .all()
    )

    indexados = 0
    omitidos = []

    for producto, empresa, categoria, imagen in productos:
        ruta_imagen = resolver_ruta_imagen(imagen.url_imagen)

        if not ruta_imagen:
            omitidos.append({
                "id_producto": producto.id_producto,
                "nombre_producto": producto.nombre_producto,
                "motivo": "No se encontró el archivo de imagen"
            })
            continue

        try:
            embedding = generar_embedding_lista(generar_embedding_imagen(ruta_imagen))
            id_vector = f"producto_{producto.id_producto}"
            familia = familia_categoria(categoria.nombre_categoria if categoria else "")

            metadata = limpiar_metadata({
                "id_producto": producto.id_producto,
                "id_empresa": empresa.id_empresa,
                "nombre_producto": producto.nombre_producto,
                "nombre_empresa": empresa.nombre_empresa,
                "categoria": categoria.nombre_categoria if categoria else "",
                "familia_categoria": familia or "",
                "precio": convertir_float(producto.precio),
                "imagen_principal": imagen.url_imagen,
                "estado_producto": producto.estado_producto,
                "estado_empresa": empresa.estado_empresa
            })

            documento = (
                f"{producto.nombre_producto} "
                f"{producto.descripcion or ''} "
                f"{producto.marca or ''} "
                f"{categoria.nombre_categoria if categoria else ''} "
                f"{familia or ''} "
                f"{empresa.nombre_empresa}"
            )

            coleccion.upsert(
                ids=[id_vector],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[documento]
            )

            indexados += 1

        except Exception as error:
            omitidos.append({
                "id_producto": producto.id_producto,
                "nombre_producto": producto.nombre_producto,
                "motivo": str(error)
            })

    return {
        "mensaje": "Indexación visual finalizada",
        "productos_encontrados": len(productos),
        "productos_indexados": indexados,
        "productos_omitidos": omitidos,
        "total_en_chromadb": coleccion.count()
    }


@router.post("/cliente/buscar-por-imagen")
def buscar_productos_por_imagen(
    id_usuario: int,
    archivo: UploadFile = File(...),
    limite: int = 12,
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_usuario
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]
    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa jpg, jpeg, png o webp"
        )

    coleccion = obtener_coleccion()

    if coleccion.count() == 0:
        raise HTTPException(
            status_code=400,
            detail="Aún no hay productos indexados para búsqueda visual"
        )

    ruta_temporal = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{extension}") as temporal:
            shutil.copyfileobj(archivo.file, temporal)
            ruta_temporal = temporal.name

        embedding_np = generar_embedding_imagen(Path(ruta_temporal))
        embedding_consulta = generar_embedding_lista(embedding_np)

        # Buscamos más candidatos internamente, pero luego filtramos fuerte.
        n_candidatos = min(max(limite * 5, 30), 60)

        consulta = coleccion.query(
            query_embeddings=[embedding_consulta],
            n_results=n_candidatos,
            include=["metadatas", "distances", "documents"]
        )

        ids = consulta.get("ids", [[]])[0]
        distancias = consulta.get("distances", [[]])[0]
        metadatas = consulta.get("metadatas", [[]])[0]

        candidatos = []

        for indice, id_vector in enumerate(ids):
            metadata = metadatas[indice] if indice < len(metadatas) else {}
            distancia = distancias[indice] if indice < len(distancias) else 1
            id_producto = metadata.get("id_producto")

            if not id_producto:
                continue

            score = max(0, min(100, (1 - distancia) * 100))

            candidatos.append({
                "id_producto": int(id_producto),
                "score": score,
                "categoria": metadata.get("categoria", ""),
                "familia": metadata.get("familia_categoria") or familia_categoria(metadata.get("categoria", ""))
            })

        candidatos.sort(key=lambda item: item["score"], reverse=True)

        if not candidatos:
            return {
                "mensaje": "No se encontraron coincidencias visuales.",
                "total": 0,
                "categoria_detectada": None,
                "resultados": []
            }

        top_score = candidatos[0]["score"]
        familia_top_producto = candidatos[0]["familia"] if top_score >= 94 else None
        familia_ia, confianza_categoria, ranking_categoria = detectar_familia_por_imagen(embedding_np)
        familia_final = familia_top_producto or familia_ia

        # Umbral dinámico. Si existe una coincidencia exacta, permitimos similares de la misma categoría,
        # pero nunca mostramos categorías distintas salvo que sean coincidencias casi exactas.
        if familia_final:
            umbral_minimo = max(MINIMO_COINCIDENCIA_GENERAL, top_score - 24)
        else:
            umbral_minimo = max(MINIMO_SIN_CATEGORIA_SEGURA, top_score - 16)

        resultados = []

        for candidato in candidatos:
            if len(resultados) >= min(limite, LIMITE_MAXIMO_RESULTADOS):
                break

            if candidato["score"] < umbral_minimo:
                continue

            # Filtro principal: solo la misma familia de prenda.
            # Ejemplo: si detecta POLERAS, no muestra vestidos ni pantalones.
            if familia_final and candidato["familia"] != familia_final:
                # Solo se permite otra categoría si es casi idéntica, para no ocultar un producto mal categorizado.
                if candidato["score"] < 96:
                    continue

            producto_detalle = obtener_producto_detalle(
                db=db,
                id_producto=candidato["id_producto"],
                score=candidato["score"]
            )

            if not producto_detalle:
                continue

            if producto_detalle["estado_producto"] != "ACTIVO":
                continue

            if producto_detalle["empresa"]["estado_empresa"] != "APROBADA":
                continue

            resultados.append(producto_detalle)

        # Si el filtro quedó muy estricto pero hay una coincidencia excelente, mostramos al menos esa.
        if not resultados and candidatos[0]["score"] >= 88:
            producto_detalle = obtener_producto_detalle(
                db=db,
                id_producto=candidatos[0]["id_producto"],
                score=candidatos[0]["score"]
            )
            if producto_detalle:
                resultados.append(producto_detalle)

        return {
            "mensaje": "Búsqueda visual realizada correctamente",
            "total": len(resultados),
            "categoria_detectada": familia_final,
            "confianza_categoria": round(float(confianza_categoria), 4) if confianza_categoria else None,
            "ranking_categoria": [
                {"categoria": categoria, "score": round(float(score), 4)}
                for categoria, score in ranking_categoria
            ],
            "umbral_usado": round(float(umbral_minimo), 2),
            "mejor_score": round(float(top_score), 2),
            "resultados": resultados
        }

    finally:
        if ruta_temporal and os.path.exists(ruta_temporal):
            os.remove(ruta_temporal)
