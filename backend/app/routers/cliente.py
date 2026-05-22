from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import os
import shutil
from uuid import uuid4

from app.database import get_db
from app.models import Usuario, Rol, Empresa, Categoria, Producto, ProductoVariante, ProductoImagen, Carrito, CarritoDetalle, Pedido, PedidoDetalle, Pago, SoporteTicket, SoporteMensaje, Notificacion
from app.schemas import RegistroCliente, RegistroEmpresa, LoginUsuario, CambioEstadoEmpresa, ProductoCrear, ProductoActualizar, CambioEstadoProducto, VarianteAgregar, VarianteActualizar, AgregarCarrito, ActualizarCantidadCarrito, CrearPedido, RegistrarPago, CambioEstadoPagoEmpresa, CambioEstadoPedidoEmpresa, CrearTicketSoporte, CrearMensajeSoporte, CambiarEstadoTicket, CategoriaCrear, ClienteCuentaActualizar, ClientePasswordCambiar
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
UPLOADS_COMPROBANTES_DIR = os.path.join(BASE_DIR, "uploads", "comprobantes")
UPLOADS_CLIENTES_DIR = os.path.join(BASE_DIR, "uploads", "clientes")
os.makedirs(UPLOADS_COMPROBANTES_DIR, exist_ok=True)
os.makedirs(UPLOADS_CLIENTES_DIR, exist_ok=True)




def verificar_cliente_activo(db: Session, id_usuario: int):
    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_usuario
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Cliente no encontrado"
        )

    if usuario.estado != "ACTIVO":
        raise HTTPException(
            status_code=403,
            detail="El usuario no está activo"
        )

    rol = db.query(Rol).filter(
        Rol.id_rol == usuario.id_rol
    ).first()

    if not rol or rol.nombre_rol.upper() != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Esta acción solo está disponible para clientes"
        )

    return usuario


@router.get("/cliente/cuenta/{id_usuario}")
def obtener_cuenta_cliente(
    id_usuario: int,
    db: Session = Depends(get_db)
):
    usuario = verificar_cliente_activo(db, id_usuario)

    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "foto_url": getattr(usuario, "foto_url", None),
        "estado": usuario.estado,
        "rol": "CLIENTE"
    }


@router.put("/cliente/cuenta/{id_usuario}")
def actualizar_cuenta_cliente(
    id_usuario: int,
    datos: ClienteCuentaActualizar,
    db: Session = Depends(get_db)
):
    usuario = verificar_cliente_activo(db, id_usuario)

    email_existente = db.query(Usuario).filter(
        Usuario.email == datos.email,
        Usuario.id_usuario != id_usuario
    ).first()

    if email_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado por otro usuario"
        )

    if not datos.nombre.strip():
        raise HTTPException(
            status_code=400,
            detail="El nombre es obligatorio"
        )

    if not datos.email.strip():
        raise HTTPException(
            status_code=400,
            detail="El correo es obligatorio"
        )

    telefono_limpio = datos.telefono.strip() if datos.telefono else None

    if telefono_limpio and len(telefono_limpio) != 8:
        raise HTTPException(
            status_code=400,
            detail="El teléfono debe tener 8 números"
        )

    usuario.nombre = datos.nombre.strip()
    usuario.apellido = datos.apellido.strip() if datos.apellido else None
    usuario.email = datos.email.strip()
    usuario.telefono = telefono_limpio

    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Cuenta actualizada correctamente",
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "foto_url": getattr(usuario, "foto_url", None),
        "estado": usuario.estado,
        "rol": "CLIENTE"
    }


@router.post("/cliente/cuenta/{id_usuario}/foto")
def subir_foto_cliente(
    id_usuario: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    usuario = verificar_cliente_activo(db, id_usuario)

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]
    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa jpg, jpeg, png o webp"
        )

    nombre_archivo = f"{uuid4()}.{extension}"
    ruta_archivo = os.path.join(UPLOADS_CLIENTES_DIR, nombre_archivo)

    with open(ruta_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    foto_url = f"/uploads/clientes/{nombre_archivo}"
    usuario.foto_url = foto_url

    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Foto actualizada correctamente",
        "foto_url": usuario.foto_url
    }


@router.put("/cliente/cuenta/{id_usuario}/password")
def cambiar_password_cliente(
    id_usuario: int,
    datos: ClientePasswordCambiar,
    db: Session = Depends(get_db)
):
    usuario = verificar_cliente_activo(db, id_usuario)

    if not verificar_password(datos.password_actual, usuario.password_hash):
        raise HTTPException(
            status_code=400,
            detail="La contraseña actual no es correcta"
        )

    if len(datos.password_nueva) < 6:
        raise HTTPException(
            status_code=400,
            detail="La nueva contraseña debe tener al menos 6 caracteres"
        )

    if datos.password_nueva != datos.confirmar_password:
        raise HTTPException(
            status_code=400,
            detail="Las contraseñas nuevas no coinciden"
        )

    usuario.password_hash = crear_hash_password(datos.password_nueva)

    db.commit()

    return {
        "mensaje": "Contraseña actualizada correctamente"
    }


@router.get("/cliente/productos")
def buscar_productos_cliente(
    buscar: str | None = None,
    color: str | None = None,
    talla: str | None = None,
    marca: str | None = None,
    id_categoria: int | None = None,
    empresa: str | None = None,
    precio_min: float | None = None,
    precio_max: float | None = None,
    db: Session = Depends(get_db)
):
    consulta = db.query(Producto, Empresa, Categoria).join(
        Empresa,
        Producto.id_empresa == Empresa.id_empresa
    ).join(
        Categoria,
        Producto.id_categoria == Categoria.id_categoria
    ).filter(
        Empresa.estado_empresa == "APROBADA",
        Producto.estado_producto == "ACTIVO"
    )

    if buscar:
        texto = f"%{buscar}%"
        consulta = consulta.filter(
            or_(
                Producto.nombre_producto.ilike(texto),
                Producto.descripcion.ilike(texto),
                Producto.marca.ilike(texto),
                Categoria.nombre_categoria.ilike(texto),
                Empresa.nombre_empresa.ilike(texto)
            )
        )

    if marca:
        consulta = consulta.filter(
            Producto.marca.ilike(f"%{marca}%")
        )

    if id_categoria:
        consulta = consulta.filter(
            Producto.id_categoria == id_categoria
        )

    if empresa:
        consulta = consulta.filter(
            Empresa.nombre_empresa.ilike(f"%{empresa}%")
        )

    if precio_min is not None:
        consulta = consulta.filter(
            Producto.precio >= precio_min
        )

    if precio_max is not None:
        consulta = consulta.filter(
            Producto.precio <= precio_max
        )

    productos = consulta.order_by(Producto.id_producto.desc()).all()

    resultado = []

    for producto, empresa_obj, categoria in productos:
        variantes_query = db.query(ProductoVariante).filter(
            ProductoVariante.id_producto == producto.id_producto,
            ProductoVariante.disponible == True,
            ProductoVariante.stock > 0
        )

        if color:
            variantes_query = variantes_query.filter(
                ProductoVariante.color.ilike(f"%{color}%")
            )

        if talla:
            variantes_query = variantes_query.filter(
                ProductoVariante.talla.ilike(f"%{talla}%")
            )

        variantes = variantes_query.all()

        if color or talla:
            if len(variantes) == 0:
                continue

        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        resultado.append({
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "descripcion": producto.descripcion,
            "marca": producto.marca,
            "genero": producto.genero,
            "precio": float(producto.precio),
            "estado_producto": producto.estado_producto,
            "categoria": categoria.nombre_categoria,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "empresa": {
                "id_empresa": empresa_obj.id_empresa,
                "nombre_empresa": empresa_obj.nombre_empresa,
                "descripcion": empresa_obj.descripcion,
                "direccion": empresa_obj.direccion,
                "ciudad": empresa_obj.ciudad,
                "whatsapp": empresa_obj.whatsapp,
                "instagram": empresa_obj.instagram,
                "facebook": empresa_obj.facebook,
                "logo_url": empresa_obj.logo_url,
                "qr_pago_url": getattr(empresa_obj, "qr_pago_url", None)
            },
            "variantes_disponibles": [
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
        "mensaje": "Resultados de búsqueda",
        "total": len(resultado),
        "productos": resultado
    }


@router.get("/cliente/empresas")
def listar_empresas_cliente(db: Session = Depends(get_db)):
    empresas = db.query(Empresa).filter(
        Empresa.estado_empresa == "APROBADA"
    ).order_by(Empresa.nombre_empresa).all()

    resultado = []

    for empresa in empresas:
        resultado.append({
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa,
            "descripcion": empresa.descripcion,
            "direccion": empresa.direccion,
            "ciudad": empresa.ciudad,
            "whatsapp": empresa.whatsapp,
            "instagram": empresa.instagram,
            "facebook": empresa.facebook,
            "logo_url": empresa.logo_url,
            "qr_pago_url": getattr(empresa, "qr_pago_url", None)
        })

    return {
        "mensaje": "Empresas disponibles en Zyra",
        "total": len(resultado),
        "empresas": resultado
    }


@router.get("/cliente/empresas/{id_empresa}/catalogo")
def ver_catalogo_empresa_cliente(
    id_empresa: int,
    db: Session = Depends(get_db)
):
    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == id_empresa,
        Empresa.estado_empresa == "APROBADA"
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada o no aprobada"
        )

    productos = db.query(Producto, Categoria).join(
        Categoria,
        Producto.id_categoria == Categoria.id_categoria
    ).filter(
        Producto.id_empresa == id_empresa,
        Producto.estado_producto == "ACTIVO"
    ).order_by(Producto.id_producto.desc()).all()

    resultado = []

    for producto, categoria in productos:
        variantes = db.query(ProductoVariante).filter(
            ProductoVariante.id_producto == producto.id_producto,
            ProductoVariante.disponible == True,
            ProductoVariante.stock > 0
        ).all()

        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        resultado.append({
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "descripcion": producto.descripcion,
            "marca": producto.marca,
            "genero": producto.genero,
            "precio": float(producto.precio),
            "categoria": categoria.nombre_categoria,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "variantes_disponibles": [
                {
                    "id_variante": variante.id_variante,
                    "color": variante.color,
                    "talla": variante.talla,
                    "stock": variante.stock
                }
                for variante in variantes
            ]
        })

    return {
        "mensaje": "Catálogo de empresa",
        "empresa": {
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa,
            "descripcion": empresa.descripcion,
            "direccion": empresa.direccion,
            "ciudad": empresa.ciudad,
            "whatsapp": empresa.whatsapp,
            "instagram": empresa.instagram,
            "facebook": empresa.facebook,
            "logo_url": empresa.logo_url,
            "qr_pago_url": getattr(empresa, "qr_pago_url", None)
        },
        "total_productos": len(resultado),
        "productos": resultado
    }


@router.get("/cliente/productos/{id_producto}")
def ver_detalle_producto_cliente(
    id_producto: int,
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id_producto == id_producto,
        Producto.estado_producto == "ACTIVO"
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no encontrado"
        )

    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == producto.id_empresa,
        Empresa.estado_empresa == "APROBADA"
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="La empresa del producto no está disponible"
        )

    categoria = db.query(Categoria).filter(
        Categoria.id_categoria == producto.id_categoria
    ).first()

    variantes = db.query(ProductoVariante).filter(
        ProductoVariante.id_producto == producto.id_producto,
        ProductoVariante.disponible == True
    ).all()

    imagenes = db.query(ProductoImagen).filter(
        ProductoImagen.id_producto == producto.id_producto
    ).all()

    return {
        "mensaje": "Detalle del producto",
        "producto": {
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "descripcion": producto.descripcion,
            "marca": producto.marca,
            "genero": producto.genero,
            "precio": float(producto.precio),
            "categoria": categoria.nombre_categoria if categoria else None,
            "empresa": {
                "id_empresa": empresa.id_empresa,
                "nombre_empresa": empresa.nombre_empresa,
                "descripcion": empresa.descripcion,
                "direccion": empresa.direccion,
                "ciudad": empresa.ciudad,
                "whatsapp": empresa.whatsapp,
                "instagram": empresa.instagram,
                "facebook": empresa.facebook,
                "logo_url": empresa.logo_url,
                "qr_pago_url": getattr(empresa, "qr_pago_url", None)
            },
            "imagenes": [
                {
                    "id_imagen": imagen.id_imagen,
                    "url_imagen": imagen.url_imagen,
                    "es_principal": imagen.es_principal
                }
                for imagen in imagenes
            ],
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
        }
    }
def verificar_cliente(db: Session, id_usuario: int):
    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_usuario
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    rol = db.query(Rol).filter(
        Rol.id_rol == usuario.id_rol
    ).first()

    if not rol or rol.nombre_rol != "CLIENTE":
        raise HTTPException(
            status_code=403,
            detail="Solo los clientes pueden usar el carrito"
        )

    if usuario.estado != "ACTIVO":
        raise HTTPException(
            status_code=403,
            detail="El usuario no está activo"
        )

    return usuario


def obtener_o_crear_carrito(db: Session, id_usuario: int):
    carrito = db.query(Carrito).filter(
        Carrito.id_usuario == id_usuario,
        Carrito.estado_carrito == "ACTIVO"
    ).first()

    if carrito:
        return carrito

    nuevo_carrito = Carrito(
        id_usuario=id_usuario,
        estado_carrito="ACTIVO"
    )

    db.add(nuevo_carrito)
    db.flush()

    return nuevo_carrito


@router.post("/cliente/carrito/agregar")
def agregar_producto_carrito(
    datos: AgregarCarrito,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, datos.id_usuario)

    if datos.cantidad <= 0:
        raise HTTPException(
            status_code=400,
            detail="La cantidad debe ser mayor a 0"
        )

    variante = db.query(ProductoVariante).filter(
        ProductoVariante.id_variante == datos.id_variante
    ).first()

    if not variante:
        raise HTTPException(
            status_code=404,
            detail="Variante no encontrada"
        )

    if not variante.disponible or variante.stock <= 0:
        raise HTTPException(
            status_code=400,
            detail="Esta variante no está disponible"
        )

    producto = db.query(Producto).filter(
        Producto.id_producto == variante.id_producto,
        Producto.estado_producto == "ACTIVO"
    ).first()

    if not producto:
        raise HTTPException(
            status_code=404,
            detail="Producto no disponible"
        )

    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == producto.id_empresa,
        Empresa.estado_empresa == "APROBADA"
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=403,
            detail="La empresa de este producto no está aprobada"
        )

    carrito = obtener_o_crear_carrito(db, datos.id_usuario)

    detalle_existente = db.query(CarritoDetalle).filter(
        CarritoDetalle.id_carrito == carrito.id_carrito,
        CarritoDetalle.id_variante == datos.id_variante
    ).first()

    if detalle_existente:
        nueva_cantidad = detalle_existente.cantidad + datos.cantidad

        if nueva_cantidad > variante.stock:
            raise HTTPException(
                status_code=400,
                detail=f"No hay suficiente stock. Stock disponible: {variante.stock}"
            )

        detalle_existente.cantidad = nueva_cantidad
        db.commit()
        db.refresh(detalle_existente)

        return {
            "mensaje": "Cantidad actualizada en el carrito",
            "id_carrito": carrito.id_carrito,
            "id_carrito_detalle": detalle_existente.id_carrito_detalle,
            "cantidad": detalle_existente.cantidad
        }

    if datos.cantidad > variante.stock:
        raise HTTPException(
            status_code=400,
            detail=f"No hay suficiente stock. Stock disponible: {variante.stock}"
        )

    nuevo_detalle = CarritoDetalle(
        id_carrito=carrito.id_carrito,
        id_variante=datos.id_variante,
        cantidad=datos.cantidad,
        precio_unitario=producto.precio
    )

    db.add(nuevo_detalle)
    db.commit()
    db.refresh(nuevo_detalle)

    return {
        "mensaje": "Producto agregado al carrito correctamente",
        "id_carrito": carrito.id_carrito,
        "id_carrito_detalle": nuevo_detalle.id_carrito_detalle,
        "id_variante": nuevo_detalle.id_variante,
        "cantidad": nuevo_detalle.cantidad,
        "precio_unitario": float(nuevo_detalle.precio_unitario)
    }


@router.get("/cliente/{id_usuario}/carrito")
def ver_carrito_cliente(
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, id_usuario)

    carrito = db.query(Carrito).filter(
        Carrito.id_usuario == id_usuario,
        Carrito.estado_carrito == "ACTIVO"
    ).first()

    if not carrito:
        return {
            "mensaje": "Carrito vacío",
            "id_usuario": id_usuario,
            "total_productos": 0,
            "total": 0,
            "items": []
        }

    detalles = db.query(CarritoDetalle).filter(
        CarritoDetalle.id_carrito == carrito.id_carrito
    ).all()

    items = []
    total = 0

    for detalle in detalles:
        variante = db.query(ProductoVariante).filter(
            ProductoVariante.id_variante == detalle.id_variante
        ).first()

        producto = db.query(Producto).filter(
            Producto.id_producto == variante.id_producto
        ).first()

        empresa = db.query(Empresa).filter(
            Empresa.id_empresa == producto.id_empresa
        ).first()

        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        subtotal = float(detalle.precio_unitario) * detalle.cantidad
        total += subtotal

        items.append({
            "id_carrito_detalle": detalle.id_carrito_detalle,
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "empresa": empresa.nombre_empresa if empresa else None,
            "id_empresa": empresa.id_empresa if empresa else None,
            "empresa_info": {
                "id_empresa": empresa.id_empresa,
                "nombre_empresa": empresa.nombre_empresa,
                "descripcion": empresa.descripcion,
                "direccion": empresa.direccion,
                "ciudad": empresa.ciudad,
                "whatsapp": empresa.whatsapp,
                "instagram": empresa.instagram,
                "facebook": empresa.facebook,
                "logo_url": empresa.logo_url,
                "qr_pago_url": getattr(empresa, "qr_pago_url", None)
            } if empresa else None,
            "qr_pago_url": getattr(empresa, "qr_pago_url", None) if empresa else None,
            "id_variante": variante.id_variante,
            "color": variante.color,
            "talla": variante.talla,
            "cantidad": detalle.cantidad,
            "stock_disponible": variante.stock,
            "precio_unitario": float(detalle.precio_unitario),
            "subtotal": subtotal
        })

    return {
        "mensaje": "Carrito del cliente",
        "id_carrito": carrito.id_carrito,
        "id_usuario": id_usuario,
        "total_productos": len(items),
        "total": total,
        "items": items
    }


@router.put("/cliente/carrito/detalle/{id_carrito_detalle}")
def actualizar_cantidad_carrito(
    id_carrito_detalle: int,
    datos: ActualizarCantidadCarrito,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, datos.id_usuario)

    detalle = db.query(CarritoDetalle).filter(
        CarritoDetalle.id_carrito_detalle == id_carrito_detalle
    ).first()

    if not detalle:
        raise HTTPException(
            status_code=404,
            detail="Producto del carrito no encontrado"
        )

    carrito = db.query(Carrito).filter(
        Carrito.id_carrito == detalle.id_carrito,
        Carrito.id_usuario == datos.id_usuario,
        Carrito.estado_carrito == "ACTIVO"
    ).first()

    if not carrito:
        raise HTTPException(
            status_code=403,
            detail="Este producto no pertenece al carrito del usuario"
        )

    if datos.cantidad <= 0:
        raise HTTPException(
            status_code=400,
            detail="La cantidad debe ser mayor a 0"
        )

    variante = db.query(ProductoVariante).filter(
        ProductoVariante.id_variante == detalle.id_variante
    ).first()

    if datos.cantidad > variante.stock:
        raise HTTPException(
            status_code=400,
            detail=f"No hay suficiente stock. Stock disponible: {variante.stock}"
        )

    detalle.cantidad = datos.cantidad

    db.commit()
    db.refresh(detalle)

    return {
        "mensaje": "Cantidad actualizada correctamente",
        "id_carrito_detalle": detalle.id_carrito_detalle,
        "nueva_cantidad": detalle.cantidad
    }


@router.delete("/cliente/carrito/detalle/{id_carrito_detalle}")
def quitar_producto_carrito(
    id_carrito_detalle: int,
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, id_usuario)

    detalle = db.query(CarritoDetalle).filter(
        CarritoDetalle.id_carrito_detalle == id_carrito_detalle
    ).first()

    if not detalle:
        raise HTTPException(
            status_code=404,
            detail="Producto del carrito no encontrado"
        )

    carrito = db.query(Carrito).filter(
        Carrito.id_carrito == detalle.id_carrito,
        Carrito.id_usuario == id_usuario,
        Carrito.estado_carrito == "ACTIVO"
    ).first()

    if not carrito:
        raise HTTPException(
            status_code=403,
            detail="Este producto no pertenece al carrito del usuario"
        )

    db.delete(detalle)
    db.commit()

    return {
        "mensaje": "Producto quitado del carrito correctamente",
        "id_carrito_detalle": id_carrito_detalle
    }

@router.post("/cliente/pedidos/crear")
def crear_pedido_desde_carrito(
    datos: CrearPedido,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, datos.id_usuario)

    carrito = db.query(Carrito).filter(
        Carrito.id_usuario == datos.id_usuario,
        Carrito.estado_carrito == "ACTIVO"
    ).first()

    if not carrito:
        raise HTTPException(
            status_code=404,
            detail="No tienes un carrito activo"
        )

    detalles = db.query(CarritoDetalle).filter(
        CarritoDetalle.id_carrito == carrito.id_carrito
    ).all()

    if len(detalles) == 0:
        raise HTTPException(
            status_code=400,
            detail="Tu carrito está vacío"
        )

    total_pedido = 0

    for detalle in detalles:
        variante = db.query(ProductoVariante).filter(
            ProductoVariante.id_variante == detalle.id_variante
        ).first()

        if not variante:
            raise HTTPException(
                status_code=404,
                detail="Una variante del carrito ya no existe"
            )

        if variante.stock < detalle.cantidad:
            raise HTTPException(
                status_code=400,
                detail=f"No hay suficiente stock para la talla {variante.talla}, color {variante.color}"
            )

        producto = db.query(Producto).filter(
            Producto.id_producto == variante.id_producto,
            Producto.estado_producto == "ACTIVO"
        ).first()

        if not producto:
            raise HTTPException(
                status_code=400,
                detail="Uno de los productos del carrito ya no está disponible"
            )

        subtotal = float(detalle.precio_unitario) * detalle.cantidad
        total_pedido += subtotal

    nuevo_pedido = Pedido(
        id_usuario=datos.id_usuario,
        total=total_pedido,
        estado_pedido="PENDIENTE"
    )

    db.add(nuevo_pedido)
    db.flush()

    for detalle in detalles:
        variante = db.query(ProductoVariante).filter(
            ProductoVariante.id_variante == detalle.id_variante
        ).first()

        subtotal = float(detalle.precio_unitario) * detalle.cantidad

        nuevo_detalle = PedidoDetalle(
            id_pedido=nuevo_pedido.id_pedido,
            id_variante=detalle.id_variante,
            cantidad=detalle.cantidad,
            precio_unitario=detalle.precio_unitario,
            subtotal=subtotal
        )

        db.add(nuevo_detalle)

        variante.stock = variante.stock - detalle.cantidad

        if variante.stock == 0:
            variante.disponible = False

    carrito.estado_carrito = "CERRADO"

    db.commit()
    db.refresh(nuevo_pedido)

    return {
        "mensaje": "Pedido creado correctamente desde el carrito",
        "id_pedido": nuevo_pedido.id_pedido,
        "id_usuario": nuevo_pedido.id_usuario,
        "total": float(nuevo_pedido.total),
        "estado_pedido": nuevo_pedido.estado_pedido
    }



def obtener_empresas_pago_pedido(db: Session, id_pedido: int):
    detalles = db.query(PedidoDetalle, ProductoVariante, Producto, Empresa).join(
        ProductoVariante,
        PedidoDetalle.id_variante == ProductoVariante.id_variante
    ).join(
        Producto,
        ProductoVariante.id_producto == Producto.id_producto
    ).join(
        Empresa,
        Producto.id_empresa == Empresa.id_empresa
    ).filter(
        PedidoDetalle.id_pedido == id_pedido
    ).all()

    empresas = {}

    for detalle, variante, producto, empresa in detalles:
        if empresa.id_empresa not in empresas:
            empresas[empresa.id_empresa] = {
                "id_empresa": empresa.id_empresa,
                "nombre_empresa": empresa.nombre_empresa,
                "descripcion": empresa.descripcion,
                "direccion": empresa.direccion,
                "ciudad": empresa.ciudad,
                "whatsapp": empresa.whatsapp,
                "instagram": empresa.instagram,
                "facebook": empresa.facebook,
                "logo_url": empresa.logo_url,
                "qr_pago_url": getattr(empresa, "qr_pago_url", None),
                "total_empresa": 0,
                "productos": []
            }

        subtotal = float(detalle.subtotal)
        empresas[empresa.id_empresa]["total_empresa"] += subtotal
        empresas[empresa.id_empresa]["productos"].append({
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "color": variante.color,
            "talla": variante.talla,
            "cantidad": detalle.cantidad,
            "subtotal": subtotal
        })

    return list(empresas.values())


@router.get("/cliente/{id_usuario}/pedidos")
def listar_pedidos_cliente(
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, id_usuario)

    pedidos = db.query(Pedido).filter(
        Pedido.id_usuario == id_usuario
    ).order_by(Pedido.id_pedido.desc()).all()

    resultado = []

    for pedido in pedidos:
        pago = db.query(Pago).filter(
            Pago.id_pedido == pedido.id_pedido
        ).first()

        empresas_pago = obtener_empresas_pago_pedido(db, pedido.id_pedido)

        resultado.append({
            "id_pedido": pedido.id_pedido,
            "total": float(pedido.total),
            "estado_pedido": pedido.estado_pedido,
            "empresas_pago": empresas_pago,
            "pago": {
                "id_pago": pago.id_pago,
                "metodo_pago": pago.metodo_pago,
                "monto": float(pago.monto),
                "estado_pago": pago.estado_pago,
                "comprobante_url": pago.comprobante_url
            } if pago else None
        })

    return {
        "mensaje": "Pedidos del cliente",
        "id_usuario": id_usuario,
        "total_pedidos": len(resultado),
        "pedidos": resultado
    }


@router.get("/cliente/pedidos/{id_pedido}")
def ver_detalle_pedido_cliente(
    id_pedido: int,
    id_usuario: int,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, id_usuario)

    pedido = db.query(Pedido).filter(
        Pedido.id_pedido == id_pedido,
        Pedido.id_usuario == id_usuario
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    detalles = db.query(PedidoDetalle).filter(
        PedidoDetalle.id_pedido == id_pedido
    ).all()

    items = []

    for detalle in detalles:
        variante = db.query(ProductoVariante).filter(
            ProductoVariante.id_variante == detalle.id_variante
        ).first()

        producto = db.query(Producto).filter(
            Producto.id_producto == variante.id_producto
        ).first()

        empresa = db.query(Empresa).filter(
            Empresa.id_empresa == producto.id_empresa
        ).first()

        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        items.append({
            "id_pedido_detalle": detalle.id_pedido_detalle,
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "empresa": empresa.nombre_empresa if empresa else None,
            "id_empresa": empresa.id_empresa if empresa else None,
            "empresa_info": {
                "id_empresa": empresa.id_empresa,
                "nombre_empresa": empresa.nombre_empresa,
                "descripcion": empresa.descripcion,
                "direccion": empresa.direccion,
                "ciudad": empresa.ciudad,
                "whatsapp": empresa.whatsapp,
                "instagram": empresa.instagram,
                "facebook": empresa.facebook,
                "logo_url": empresa.logo_url,
                "qr_pago_url": getattr(empresa, "qr_pago_url", None)
            } if empresa else None,
            "qr_pago_url": getattr(empresa, "qr_pago_url", None) if empresa else None,
            "id_variante": variante.id_variante,
            "color": variante.color,
            "talla": variante.talla,
            "cantidad": detalle.cantidad,
            "precio_unitario": float(detalle.precio_unitario),
            "subtotal": float(detalle.subtotal)
        })

    pago = db.query(Pago).filter(
        Pago.id_pedido == id_pedido
    ).first()

    return {
        "mensaje": "Detalle del pedido",
        "pedido": {
            "id_pedido": pedido.id_pedido,
            "id_usuario": pedido.id_usuario,
            "total": float(pedido.total),
            "estado_pedido": pedido.estado_pedido,
            "items": items,
            "empresas_pago": obtener_empresas_pago_pedido(db, id_pedido),
            "pago": {
                "id_pago": pago.id_pago,
                "metodo_pago": pago.metodo_pago,
                "monto": float(pago.monto),
                "estado_pago": pago.estado_pago,
                "comprobante_url": pago.comprobante_url
            } if pago else None
        }
    }



@router.post("/cliente/pagos/{id_pedido}/comprobante")
def subir_comprobante_pago_cliente(
    id_pedido: int,
    id_usuario: int,
    metodo_pago: str = "QR",
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    verificar_cliente(db, id_usuario)

    pedido = db.query(Pedido).filter(
        Pedido.id_pedido == id_pedido,
        Pedido.id_usuario == id_usuario
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    empresas_pago = obtener_empresas_pago_pedido(db, id_pedido)

    if len(empresas_pago) == 0:
        raise HTTPException(
            status_code=400,
            detail="El pedido no tiene productos asociados"
        )

    if len(empresas_pago) > 1:
        raise HTTPException(
            status_code=400,
            detail="Por ahora registra pedidos de una sola tienda para usar un solo QR de pago"
        )

    if not empresas_pago[0].get("qr_pago_url"):
        raise HTTPException(
            status_code=400,
            detail="La empresa todavía no configuró su QR de pago"
        )

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]
    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa jpg, jpeg, png o webp"
        )

    nombre_archivo = f"{uuid4()}.{extension}"
    ruta_archivo = os.path.join(UPLOADS_COMPROBANTES_DIR, nombre_archivo)

    with open(ruta_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    comprobante_url = f"/uploads/comprobantes/{nombre_archivo}"

    pago_existente = db.query(Pago).filter(
        Pago.id_pedido == id_pedido
    ).first()

    if pago_existente and pago_existente.estado_pago == "PAGADO":
        raise HTTPException(
            status_code=400,
            detail="Este pedido ya tiene un pago aprobado"
        )

    if pago_existente:
        pago_existente.metodo_pago = metodo_pago
        pago_existente.monto = pedido.total
        pago_existente.estado_pago = "EN_REVISION"
        pago_existente.comprobante_url = comprobante_url
        pago = pago_existente
    else:
        pago = Pago(
            id_pedido=id_pedido,
            metodo_pago=metodo_pago,
            monto=pedido.total,
            estado_pago="EN_REVISION",
            comprobante_url=comprobante_url
        )
        db.add(pago)

    pedido.estado_pedido = "CONFIRMADO"

    db.commit()
    db.refresh(pago)
    db.refresh(pedido)

    return {
        "mensaje": "Comprobante registrado correctamente. El pago queda en revisión.",
        "id_pago": pago.id_pago,
        "id_pedido": pedido.id_pedido,
        "metodo_pago": pago.metodo_pago,
        "monto": float(pago.monto),
        "estado_pago": pago.estado_pago,
        "estado_pedido": pedido.estado_pedido,
        "comprobante_url": pago.comprobante_url
    }


@router.post("/cliente/pagos/registrar")
def registrar_pago_cliente(
    datos: RegistrarPago,
    db: Session = Depends(get_db)
):
    verificar_cliente(db, datos.id_usuario)

    pedido = db.query(Pedido).filter(
        Pedido.id_pedido == datos.id_pedido,
        Pedido.id_usuario == datos.id_usuario
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    pago_existente = db.query(Pago).filter(
        Pago.id_pedido == datos.id_pedido
    ).first()

    if pago_existente:
        raise HTTPException(
            status_code=400,
            detail="Este pedido ya tiene un pago registrado"
        )

    if datos.monto <= 0:
        raise HTTPException(
            status_code=400,
            detail="El monto debe ser mayor a 0"
        )

    if round(datos.monto, 2) != round(float(pedido.total), 2):
        raise HTTPException(
            status_code=400,
            detail=f"El monto debe ser igual al total del pedido: {float(pedido.total)}"
        )

    nuevo_pago = Pago(
        id_pedido=datos.id_pedido,
        metodo_pago=datos.metodo_pago,
        monto=datos.monto,
        estado_pago="EN_REVISION",
        comprobante_url=datos.comprobante_url
    )

    pedido.estado_pedido = "CONFIRMADO"

    db.add(nuevo_pago)
    db.commit()
    db.refresh(nuevo_pago)

    return {
        "mensaje": "Pago registrado correctamente. Queda en revisión.",
        "id_pago": nuevo_pago.id_pago,
        "id_pedido": nuevo_pago.id_pedido,
        "metodo_pago": nuevo_pago.metodo_pago,
        "monto": float(nuevo_pago.monto),
        "estado_pago": nuevo_pago.estado_pago,
        "estado_pedido": pedido.estado_pedido
    }

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
            detail="La empresa no está aprobada"
        )

    return empresa


def pedido_tiene_productos_de_empresa(db: Session, id_pedido: int, id_empresa: int):
    detalle = db.query(PedidoDetalle).join(
        ProductoVariante,
        PedidoDetalle.id_variante == ProductoVariante.id_variante
    ).join(
        Producto,
        ProductoVariante.id_producto == Producto.id_producto
    ).filter(
        PedidoDetalle.id_pedido == id_pedido,
        Producto.id_empresa == id_empresa
    ).first()

    return detalle is not None


