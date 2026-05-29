from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import os
import shutil
import re
from uuid import uuid4
from pathlib import Path

from app.database import get_db
from app.models import Usuario, Rol, Empresa, Categoria, Producto, ProductoVariante, ProductoImagen, Carrito, CarritoDetalle, Pedido, PedidoDetalle, Pago, SoporteTicket, SoporteMensaje, Notificacion
from app.schemas import RegistroCliente, RegistroEmpresa, LoginUsuario, CambioEstadoEmpresa, ProductoCrear, ProductoActualizar, CambioEstadoProducto, VarianteAgregar, VarianteActualizar, AgregarCarrito, ActualizarCantidadCarrito, CrearPedido, RegistrarPago, CambioEstadoPagoEmpresa, CambioEstadoPedidoEmpresa, CrearTicketSoporte, CrearMensajeSoporte, CambiarEstadoTicket, CategoriaCrear, VarianteEmpresaCrear, VarianteEmpresaEditar, VarianteEstadoCambiar
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOADS_PRODUCTOS_DIR = BASE_DIR / "uploads" / "productos"
UPLOADS_PRODUCTOS_DIR.mkdir(parents=True, exist_ok=True)

print("CARPETA DONDE SE GUARDAN IMÁGENES:", UPLOADS_PRODUCTOS_DIR)


GENEROS_PERMITIDOS = {"UNISEX", "MUJER", "HOMBRE", "NIÑA", "NIÑO"}
VALORES_TEMPORALES_INVALIDOS = {"", "__OTRO__", "OTRO", "OTRA", "SELECCIONAR"}

def limpiar_campo_producto(valor):
    return str(valor or "").strip()

def validar_texto_obligatorio(valor, campo, maximo=150):
    texto = limpiar_campo_producto(valor)
    if not texto or texto.upper() in VALORES_TEMPORALES_INVALIDOS:
        raise HTTPException(status_code=400, detail=f"{campo} es obligatorio")
    if len(texto) > maximo:
        raise HTTPException(status_code=400, detail=f"{campo} no puede superar {maximo} caracteres")
    return texto

def validar_texto_opcional(valor, maximo=500):
    texto = limpiar_campo_producto(valor)
    if not texto:
        return None
    if len(texto) > maximo:
        raise HTTPException(status_code=400, detail=f"El texto no puede superar {maximo} caracteres")
    return texto

def validar_genero_producto(valor):
    texto = limpiar_campo_producto(valor or "Unisex")
    if not texto:
        return "Unisex"
    normalizado = texto.upper()
    if normalizado not in GENEROS_PERMITIDOS:
        raise HTTPException(status_code=400, detail="Género no válido. Usa Mujer, Hombre, Unisex, Niño o Niña")
    mapa = {
        "UNISEX": "Unisex",
        "MUJER": "Mujer",
        "HOMBRE": "Hombre",
        "NIÑA": "Niña",
        "NIÑO": "Niño"
    }
    return mapa[normalizado]

def validar_precio_producto(valor):
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="El precio debe ser un número válido")
    if numero <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor a 0")
    return numero

def validar_stock_producto(valor):
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="El stock debe ser un número entero válido")
    if numero < 0:
        raise HTTPException(status_code=400, detail="El stock no puede ser negativo")
    return numero

def validar_color_producto(valor):
    texto = validar_texto_obligatorio(valor, "El color", 50)
    return texto

def validar_talla_producto(valor):
    texto = validar_texto_obligatorio(valor, "La talla", 20)
    return texto.upper() if len(texto) <= 4 else texto

def verificar_empresa_aprobada(db: Session, id_empresa: int):
    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == id_empresa
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada"
        )

    if empresa.estado_empresa != "APROBADA":
        raise HTTPException(
            status_code=403,
            detail="La empresa debe estar APROBADA para realizar esta acción"
        )

    return empresa

@router.post("/empresa/productos")
def registrar_producto_empresa(datos: ProductoCrear, db: Session = Depends(get_db)):
    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == datos.id_empresa
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada"
        )

    if empresa.estado_empresa != "APROBADA":
        raise HTTPException(
            status_code=403,
            detail="La empresa debe estar APROBADA para registrar productos"
        )

    categoria = db.query(Categoria).filter(
        Categoria.id_categoria == datos.id_categoria
    ).first()

    if not categoria:
        raise HTTPException(
            status_code=404,
            detail="Categoría no encontrada"
        )

    nombre_limpio = validar_texto_obligatorio(datos.nombre_producto, "El nombre del producto", 150)
    descripcion_limpia = validar_texto_opcional(datos.descripcion, 500)
    marca_limpia = validar_texto_opcional(datos.marca, 100)
    genero_limpio = validar_genero_producto(datos.genero)
    precio_limpio = validar_precio_producto(datos.precio)

    if not datos.variantes:
        raise HTTPException(status_code=400, detail="Debes registrar al menos una variante con color, talla y stock")

    variantes_limpias = []
    combinaciones = set()

    for variante in datos.variantes:
        color_limpio = validar_color_producto(variante.color)
        talla_limpia = validar_talla_producto(variante.talla)
        stock_limpio = validar_stock_producto(variante.stock)
        clave = (color_limpio.lower(), talla_limpia.lower())

        if clave in combinaciones:
            raise HTTPException(status_code=400, detail="No repitas la misma combinación de color y talla")

        combinaciones.add(clave)
        variantes_limpias.append({
            "color": color_limpio,
            "talla": talla_limpia,
            "stock": stock_limpio,
            "disponible": bool(variante.disponible) and stock_limpio > 0
        })

    nuevo_producto = Producto(
        id_empresa=datos.id_empresa,
        id_categoria=datos.id_categoria,
        nombre_producto=nombre_limpio,
        descripcion=descripcion_limpia,
        marca=marca_limpia,
        genero=genero_limpio,
        precio=precio_limpio,
        estado_producto="ACTIVO"
    )

    db.add(nuevo_producto)
    db.flush()

    for variante in variantes_limpias:
        nueva_variante = ProductoVariante(
            id_producto=nuevo_producto.id_producto,
            color=variante["color"],
            talla=variante["talla"],
            stock=variante["stock"],
            disponible=variante["disponible"]
        )
        db.add(nueva_variante)

    if datos.imagen_principal:
        nueva_imagen = ProductoImagen(
            id_producto=nuevo_producto.id_producto,
            url_imagen=datos.imagen_principal,
            es_principal=True
        )
        db.add(nueva_imagen)

    db.commit()
    db.refresh(nuevo_producto)

    return {
        "mensaje": "Producto registrado correctamente",
        "id_producto": nuevo_producto.id_producto,
        "id_empresa": nuevo_producto.id_empresa,
        "nombre_producto": nuevo_producto.nombre_producto,
        "precio": float(nuevo_producto.precio),
        "estado_producto": nuevo_producto.estado_producto,
        "total_variantes": len(variantes_limpias)
    }


@router.get("/empresa/{id_empresa}/productos")
def listar_productos_empresa(id_empresa: int, db: Session = Depends(get_db)):
    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == id_empresa
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada"
        )

    productos = db.query(Producto).filter(
        Producto.id_empresa == id_empresa
    ).order_by(Producto.id_producto).all()

    resultado = []

    for producto in productos:
        variantes = db.query(ProductoVariante).filter(
            ProductoVariante.id_producto == producto.id_producto
        ).all()

        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        categoria = db.query(Categoria).filter(
            Categoria.id_categoria == producto.id_categoria
        ).first()

        resultado.append({
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "descripcion": producto.descripcion,
            "marca": producto.marca,
            "genero": producto.genero,
            "precio": float(producto.precio),
            "estado_producto": producto.estado_producto,
            "categoria": categoria.nombre_categoria if categoria else None,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "variantes": [
                {
                    "id_variante": variante.id_variante,
                    "color": variante.color,
                    "talla": variante.talla,
                    "stock": variante.stock,
                    "disponible": variante.disponible
                }
                for variante in variantes
            ]
        })

    return {
        "mensaje": "Productos de la empresa",
        "id_empresa": empresa.id_empresa,
        "nombre_empresa": empresa.nombre_empresa,
        "total": len(resultado),
        "productos": resultado
    }

@router.put("/empresa/productos/{id_producto}")
def actualizar_producto_empresa(
    id_producto: int,
    datos: ProductoActualizar,
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    if producto.id_empresa != datos.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes editar un producto que pertenece a otra empresa"
        )

    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == datos.id_empresa
    ).first()

    if not empresa or empresa.estado_empresa != "APROBADA":
        raise HTTPException(
            status_code=403,
            detail="La empresa debe estar APROBADA para editar productos"
        )

    if datos.id_categoria is not None:
        categoria = db.query(Categoria).filter(
            Categoria.id_categoria == datos.id_categoria
        ).first()

        if not categoria:
            raise HTTPException(
                status_code=404,
                detail="Categoría no encontrada"
            )

        producto.id_categoria = datos.id_categoria

    if datos.nombre_producto is not None:
        producto.nombre_producto = validar_texto_obligatorio(datos.nombre_producto, "El nombre del producto", 150)

    if datos.descripcion is not None:
        producto.descripcion = validar_texto_opcional(datos.descripcion, 500)

    if datos.marca is not None:
        producto.marca = validar_texto_opcional(datos.marca, 100)

    if datos.genero is not None:
        producto.genero = validar_genero_producto(datos.genero)

    if datos.precio is not None:
        producto.precio = validar_precio_producto(datos.precio)

    if datos.imagen_principal is not None:
        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        if imagen:
            imagen.url_imagen = datos.imagen_principal
        else:
            nueva_imagen = ProductoImagen(
                id_producto=producto.id_producto,
                url_imagen=datos.imagen_principal,
                es_principal=True
            )
            db.add(nueva_imagen)

    db.commit()
    db.refresh(producto)

    return {
        "mensaje": "Producto actualizado correctamente",
        "id_producto": producto.id_producto,
        "nombre_producto": producto.nombre_producto,
        "precio": float(producto.precio),
        "estado_producto": producto.estado_producto
    }

@router.delete("/empresa/productos/{id_producto}")
def eliminar_producto_empresa(
    id_producto: int,
    id_empresa: int,
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto,
        Producto.id_empresa == id_empresa
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado o no pertenece a esta empresa"
        )

    producto.estado_producto = "INACTIVO"

    db.commit()

    return {
        "mensaje": "Producto eliminado correctamente",
        "id_producto": id_producto
    }

@router.delete("/empresa/productos/{id_producto}/definitivo")
def eliminar_producto_definitivo_empresa(
    id_producto: int,
    id_empresa: int,
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto,
        Producto.id_empresa == id_empresa
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado o no pertenece a esta empresa"
        )

    try:
        db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == id_producto
        ).delete()

        db.query(ProductoVariante).filter(
            ProductoVariante.id_producto == id_producto
        ).delete()

        db.delete(producto)
        db.commit()

        return {
            "mensaje": "Producto borrado definitivamente",
            "id_producto": id_producto
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede borrar definitivamente este producto porque puede estar relacionado con carritos, pedidos o pagos. Puedes dejarlo INACTIVO."
        )

@router.put("/empresa/productos/{id_producto}/estado")
def cambiar_estado_producto_empresa(
    id_producto: int,
    datos: CambioEstadoProducto,
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    if producto.id_empresa != datos.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes cambiar el estado de un producto que pertenece a otra empresa"
        )

    estados_permitidos = ["ACTIVO", "INACTIVO", "AGOTADO"]

    if datos.estado_producto not in estados_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Estado no válido. Usa: ACTIVO, INACTIVO o AGOTADO"
        )

    producto.estado_producto = datos.estado_producto

    db.commit()
    db.refresh(producto)

    return {
        "mensaje": "Estado del producto actualizado correctamente",
        "id_producto": producto.id_producto,
        "nombre_producto": producto.nombre_producto,
        "nuevo_estado": producto.estado_producto
    }


@router.post("/empresa/productos/{id_producto}/variantes")
def agregar_variante_producto(
    id_producto: int,
    datos: VarianteAgregar,
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    if producto.id_empresa != datos.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes agregar variantes a un producto que pertenece a otra empresa"
        )

    color_limpio = validar_color_producto(datos.color)
    talla_limpia = validar_talla_producto(datos.talla)
    stock_limpio = validar_stock_producto(datos.stock)

    variante_existente = db.query(ProductoVariante).filter(
        ProductoVariante.id_producto == id_producto,
        ProductoVariante.color.ilike(color_limpio),
        ProductoVariante.talla.ilike(talla_limpia)
    ).first()

    if variante_existente:
        raise HTTPException(status_code=400, detail="Ya existe una variante con ese color y talla")

    nueva_variante = ProductoVariante(
        id_producto=id_producto,
        color=color_limpio,
        talla=talla_limpia,
        stock=stock_limpio,
        disponible=bool(datos.disponible) and stock_limpio > 0
    )

    db.add(nueva_variante)
    db.commit()
    db.refresh(nueva_variante)

    return {
        "mensaje": "Variante agregada correctamente",
        "id_variante": nueva_variante.id_variante,
        "id_producto": nueva_variante.id_producto,
        "color": nueva_variante.color,
        "talla": nueva_variante.talla,
        "stock": nueva_variante.stock,
        "disponible": nueva_variante.disponible
    }


@router.put("/empresa/variantes/{id_variante}")
def actualizar_variante_producto(
    id_variante: int,
    datos: VarianteActualizar,
    db: Session = Depends(get_db)
):
    variante = db.query(ProductoVariante).filter(
        ProductoVariante.id_variante == id_variante
    ).first()

    if not variante:
        raise HTTPException(
            status_code=404,
            detail="Variante no encontrada"
        )

    producto = db.query(Producto).filter(
        Producto.id_producto == variante.id_producto
    ).first()

    if producto.id_empresa != datos.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes editar una variante que pertenece a otra empresa"
        )

    if datos.color is not None:
        variante.color = validar_color_producto(datos.color)

    if datos.talla is not None:
        variante.talla = validar_talla_producto(datos.talla)

    if datos.stock is not None:
        variante.stock = validar_stock_producto(datos.stock)

    if datos.disponible is not None:
        variante.disponible = bool(datos.disponible) and variante.stock > 0

    db.commit()
    db.refresh(variante)

    return {
        "mensaje": "Variante actualizada correctamente",
        "id_variante": variante.id_variante,
        "color": variante.color,
        "talla": variante.talla,
        "stock": variante.stock,
        "disponible": variante.disponible
    }


@router.post("/empresa/productos/{id_producto}/imagen")
def subir_imagen_producto(
    id_producto: int,
    id_empresa: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    empresa = verificar_empresa_aprobada(db, id_empresa)

    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    if producto.id_empresa != empresa.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes subir imagen a un producto de otra empresa"
        )

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]

    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa jpg, jpeg, png o webp"
        )

    nombre_archivo = f"{uuid4()}.{extension}"
    ruta_archivo = UPLOADS_PRODUCTOS_DIR / nombre_archivo

    with open(ruta_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    url_imagen = f"/uploads/productos/{nombre_archivo}"

    imagenes_anteriores = db.query(ProductoImagen).filter(
        ProductoImagen.id_producto == id_producto
    ).all()

    for imagen in imagenes_anteriores:
        imagen.es_principal = False

    nueva_imagen = ProductoImagen(
        id_producto=id_producto,
        url_imagen=url_imagen,
        es_principal=True
    )

    db.add(nueva_imagen)

    if hasattr(producto, "imagen_principal"):
        producto.imagen_principal = url_imagen

    db.commit()
    db.refresh(nueva_imagen)

    return {
        "mensaje": "Imagen subida correctamente",
        "id_producto": id_producto,
        "id_empresa": id_empresa,
        "url_imagen": url_imagen,
        "url_completa": f"http://127.0.0.1:8000{url_imagen}"
    }

def verificar_usuario_activo(db: Session, id_usuario: int):
    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_usuario
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    if usuario.estado != "ACTIVO":
        raise HTTPException(
            status_code=403,
            detail="El usuario no está activo"
        )

    return usuario

@router.post("/empresa/productos/{id_producto}/variantes")
def agregar_variante_producto_empresa(
    id_producto: int,
    datos: VarianteEmpresaCrear,
    db: Session = Depends(get_db)
):
    empresa = verificar_empresa_aprobada(db, datos.id_empresa)

    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    if producto.id_empresa != empresa.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes agregar variantes a un producto de otra empresa"
        )

    color_limpio = validar_color_producto(datos.color)
    talla_limpia = validar_talla_producto(datos.talla)
    stock_limpio = validar_stock_producto(datos.stock)

    variante_existente = db.query(ProductoVariante).filter(
        ProductoVariante.id_producto == id_producto,
        ProductoVariante.color.ilike(color_limpio),
        ProductoVariante.talla.ilike(talla_limpia)
    ).first()

    if variante_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe una variante con ese color y talla"
        )

    nueva_variante = ProductoVariante(
        id_producto=id_producto,
        color=color_limpio,
        talla=talla_limpia,
        stock=stock_limpio,
        disponible=datos.disponible and stock_limpio > 0
    )

    db.add(nueva_variante)
    db.commit()
    db.refresh(nueva_variante)

    return {
        "mensaje": "Variante agregada correctamente",
        "variante": {
            "id_variante": nueva_variante.id_variante,
            "color": nueva_variante.color,
            "talla": nueva_variante.talla,
            "stock": nueva_variante.stock,
            "disponible": nueva_variante.disponible
        }
    }


@router.put("/empresa/productos/variantes/{id_variante}")
def editar_variante_producto_empresa(
    id_variante: int,
    datos: VarianteEmpresaEditar,
    db: Session = Depends(get_db)
):
    empresa = verificar_empresa_aprobada(db, datos.id_empresa)

    variante = db.query(ProductoVariante).filter(
        ProductoVariante.id_variante == id_variante
    ).first()

    if not variante:
        raise HTTPException(
            status_code=404,
            detail="Variante no encontrada"
        )

    producto = db.query(Producto).filter(
        Producto.id_producto == variante.id_producto
    ).first()

    if not producto or producto.id_empresa != empresa.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes editar una variante de otra empresa"
        )

    color_limpio = validar_color_producto(datos.color)
    talla_limpia = validar_talla_producto(datos.talla)
    stock_limpio = validar_stock_producto(datos.stock)

    variante_existente = db.query(ProductoVariante).filter(
        ProductoVariante.id_producto == producto.id_producto,
        ProductoVariante.id_variante != id_variante,
        ProductoVariante.color.ilike(color_limpio),
        ProductoVariante.talla.ilike(talla_limpia)
    ).first()

    if variante_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe otra variante con ese color y talla"
        )

    variante.color = color_limpio
    variante.talla = talla_limpia
    variante.stock = stock_limpio
    variante.disponible = datos.disponible and stock_limpio > 0

    db.commit()
    db.refresh(variante)

    return {
        "mensaje": "Variante actualizada correctamente",
        "variante": {
            "id_variante": variante.id_variante,
            "color": variante.color,
            "talla": variante.talla,
            "stock": variante.stock,
            "disponible": variante.disponible
        }
    }


@router.put("/empresa/productos/variantes/{id_variante}/estado")
def cambiar_estado_variante_producto_empresa(
    id_variante: int,
    datos: VarianteEstadoCambiar,
    db: Session = Depends(get_db)
):
    empresa = verificar_empresa_aprobada(db, datos.id_empresa)

    variante = db.query(ProductoVariante).filter(
        ProductoVariante.id_variante == id_variante
    ).first()

    if not variante:
        raise HTTPException(
            status_code=404,
            detail="Variante no encontrada"
        )

    producto = db.query(Producto).filter(
        Producto.id_producto == variante.id_producto
    ).first()

    if not producto or producto.id_empresa != empresa.id_empresa:
        raise HTTPException(
            status_code=403,
            detail="No puedes cambiar una variante de otra empresa"
        )

    if datos.disponible and variante.stock <= 0:
        raise HTTPException(
            status_code=400,
            detail="No puedes activar una variante sin stock"
        )

    variante.disponible = datos.disponible

    db.commit()
    db.refresh(variante)

    return {
        "mensaje": "Estado de variante actualizado correctamente",
        "variante": {
            "id_variante": variante.id_variante,
            "color": variante.color,
            "talla": variante.talla,
            "stock": variante.stock,
            "disponible": variante.disponible
        }
    }

