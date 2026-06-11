from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from sqlalchemy.exc import SQLAlchemyError
import os
import shutil
from uuid import uuid4
from datetime import datetime

from app.database import get_db
from app.models import (
    Usuario,
    Rol,
    Empresa,
    Categoria,
    Producto,
    ProductoVariante,
    ProductoImagen,
    Pedido,
    PedidoDetalle,
    Pago,
    SoporteTicket,
    SoporteMensaje,
    Notificacion,
    Carrito,
    CarritoDetalle,
    ProductoVista,
    TiendaVisita,
    BusquedaRegistro,
    ProductoCotizacion,
    VentaRegistro,
    BackupRegistro,
    LogSistema,
)
from app.schemas import CambioEstadoEmpresa, CambiarEstadoTicket, CambioEstadoUsuarioAdmin, AdminCuentaActualizar, AdminPasswordCambiar, AdminCrear
from app.seguridad import crear_hash_password, verificar_password
from app.estadisticas import sincronizar_ventas_pagadas

router = APIRouter()


def verificar_admin(db: Session, id_admin: int):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_admin).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="No existe el usuario administrador")

    rol = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first()
    nombre_rol = rol.nombre_rol.upper() if rol else ""

    if nombre_rol not in ["ADMIN", "ADMINISTRADOR"]:
        raise HTTPException(status_code=403, detail="No tienes permisos de administrador")

    return usuario


def convertir_float(valor):
    return float(valor) if valor is not None else 0


@router.get("/admin/resumen")
def resumen_admin_plataforma(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    total_usuarios = db.query(Usuario).count()
    total_empresas = db.query(Empresa).count()

    total_clientes = (
        db.query(Usuario)
        .join(Rol, Usuario.id_rol == Rol.id_rol)
        .filter(Rol.nombre_rol.in_(["CLIENTE", "Cliente"]))
        .count()
    )

    total_admins = (
        db.query(Usuario)
        .join(Rol, Usuario.id_rol == Rol.id_rol)
        .filter(Rol.nombre_rol.in_(["ADMIN", "ADMINISTRADOR", "Administrador"]))
        .count()
    )

    empresas_pendientes = db.query(Empresa).filter(Empresa.estado_empresa == "PENDIENTE").count()
    empresas_aprobadas = db.query(Empresa).filter(Empresa.estado_empresa == "APROBADA").count()
    empresas_deshabilitadas = db.query(Empresa).filter(Empresa.estado_empresa == "DESHABILITADA").count()

    total_productos = db.query(Producto).count()
    productos_activos = db.query(Producto).filter(Producto.estado_producto == "ACTIVO").count()

    total_pedidos = db.query(Pedido).count()
    pedidos_pendientes = db.query(Pedido).filter(Pedido.estado_pedido == "PENDIENTE").count()
    pedidos_pagados = db.query(Pedido).filter(Pedido.estado_pedido.in_(["PAGADO", "ENTREGADO"])).count()

    pagos_en_revision = db.query(Pago).filter(Pago.estado_pago == "EN_REVISION").count()
    pagos_pagados = db.query(Pago).filter(Pago.estado_pago == "PAGADO").all()
    pagos_rechazados = db.query(Pago).filter(Pago.estado_pago == "RECHAZADO").count()

    total_ventas_registradas = sum(convertir_float(pago.monto) for pago in pagos_pagados)

    tickets_abiertos = db.query(SoporteTicket).filter(SoporteTicket.estado_ticket == "ABIERTO").count()

    return {
        "mensaje": "Resumen general de Zyra",
        "usuarios": {
            "total_usuarios": total_usuarios,
            "total_clientes": total_clientes,
            "total_admins": total_admins,
        },
        "empresas": {
            "total_empresas": total_empresas,
            "pendientes": empresas_pendientes,
            "aprobadas": empresas_aprobadas,
            "deshabilitadas": empresas_deshabilitadas,
        },
        "productos": {
            "total_productos": total_productos,
            "productos_activos": productos_activos,
        },
        "pedidos": {
            "total_pedidos": total_pedidos,
            "pendientes": pedidos_pendientes,
            "pagados": pedidos_pagados,
        },
        "pagos": {
            "pagos_en_revision": pagos_en_revision,
            "pagos_rechazados": pagos_rechazados,
            "total_ventas_registradas": total_ventas_registradas,
        },
        "soporte": {
            "tickets_abiertos": tickets_abiertos,
        },
    }


@router.get("/admin/empresas")
def listar_empresas_admin(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    empresas = (
        db.query(Empresa, Usuario)
        .join(Usuario, Empresa.id_usuario == Usuario.id_usuario)
        .order_by(Empresa.id_empresa.desc())
        .all()
    )

    resultado = []

    for empresa, usuario in empresas:
        resultado.append({
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa,
            "descripcion": empresa.descripcion,
            "nit": empresa.nit,
            "direccion": empresa.direccion,
            "ciudad": empresa.ciudad,
            "whatsapp": empresa.whatsapp,
            "instagram": empresa.instagram,
            "facebook": empresa.facebook,
            "logo_url": getattr(empresa, "logo_url", None),
            "qr_pago_url": getattr(empresa, "qr_pago_url", None),
            "estado_empresa": empresa.estado_empresa,
            "id_usuario": usuario.id_usuario,
            "nombre_responsable": usuario.nombre,
            "apellido_responsable": usuario.apellido,
            "email": usuario.email,
            "telefono": usuario.telefono,
            "estado_usuario": usuario.estado,
        })

    return {"mensaje": "Lista de empresas registradas", "total": len(resultado), "empresas": resultado}


@router.get("/admin/empresas/pendientes")
def listar_empresas_pendientes(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    empresas = (
        db.query(Empresa, Usuario)
        .join(Usuario, Empresa.id_usuario == Usuario.id_usuario)
        .filter(Empresa.estado_empresa == "PENDIENTE")
        .order_by(Empresa.id_empresa.desc())
        .all()
    )

    resultado = []

    for empresa, usuario in empresas:
        resultado.append({
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa,
            "descripcion": empresa.descripcion,
            "nit": empresa.nit,
            "direccion": empresa.direccion,
            "ciudad": empresa.ciudad,
            "whatsapp": empresa.whatsapp,
            "instagram": empresa.instagram,
            "facebook": empresa.facebook,
            "logo_url": getattr(empresa, "logo_url", None),
            "qr_pago_url": getattr(empresa, "qr_pago_url", None),
            "estado_empresa": empresa.estado_empresa,
            "id_usuario": usuario.id_usuario,
            "nombre_responsable": usuario.nombre,
            "apellido_responsable": usuario.apellido,
            "email": usuario.email,
            "telefono": usuario.telefono,
            "estado_usuario": usuario.estado,
        })

    return {"mensaje": "Empresas pendientes de aprobación", "total": len(resultado), "empresas": resultado}


@router.put("/admin/empresas/{id_empresa}/estado")
def cambiar_estado_empresa(id_empresa: int, datos: CambioEstadoEmpresa, db: Session = Depends(get_db)):
    verificar_admin(db, datos.id_admin)

    empresa = db.query(Empresa).filter(Empresa.id_empresa == id_empresa).first()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")

    estados_permitidos = ["PENDIENTE", "APROBADA", "DESHABILITADA"]

    if datos.estado_empresa not in estados_permitidos:
        raise HTTPException(status_code=400, detail="Estado no válido. Usa: PENDIENTE, APROBADA o DESHABILITADA")

    empresa.estado_empresa = datos.estado_empresa
    db.commit()
    db.refresh(empresa)

    return {
        "mensaje": "Estado de empresa actualizado correctamente",
        "id_empresa": empresa.id_empresa,
        "nombre_empresa": empresa.nombre_empresa,
        "nuevo_estado": empresa.estado_empresa,
    }


@router.get("/admin/usuarios")
def listar_usuarios_admin(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    usuarios = (
        db.query(Usuario, Rol)
        .join(Rol, Usuario.id_rol == Rol.id_rol)
        .order_by(Usuario.id_usuario.desc())
        .all()
    )

    resultado = []

    for usuario, rol in usuarios:
        resultado.append({
            "id_usuario": usuario.id_usuario,
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "email": usuario.email,
            "telefono": usuario.telefono,
            "foto_url": getattr(usuario, "foto_url", None),
            "rol": rol.nombre_rol,
            "estado": usuario.estado,
        })

    return {"mensaje": "Lista de usuarios registrados", "total": len(resultado), "usuarios": resultado}


@router.get("/admin/productos")
def listar_productos_admin_solo_lectura(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    productos = (
        db.query(Producto, Empresa, Categoria)
        .join(Empresa, Producto.id_empresa == Empresa.id_empresa)
        .join(Categoria, Producto.id_categoria == Categoria.id_categoria)
        .order_by(Producto.id_producto.desc())
        .all()
    )

    resultado = []

    for producto, empresa, categoria in productos:
        variantes = db.query(ProductoVariante).filter(ProductoVariante.id_producto == producto.id_producto).all()
        imagen = (
            db.query(ProductoImagen)
            .filter(ProductoImagen.id_producto == producto.id_producto, ProductoImagen.es_principal == True)
            .first()
        )
        stock_total = sum(variante.stock for variante in variantes)

        resultado.append({
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "descripcion": producto.descripcion,
            "marca": producto.marca,
            "genero": producto.genero,
            "precio": convertir_float(producto.precio),
            "estado_producto": producto.estado_producto,
            "categoria": categoria.nombre_categoria,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "stock_total": stock_total,
            "empresa": {
                "id_empresa": empresa.id_empresa,
                "nombre_empresa": empresa.nombre_empresa,
                "estado_empresa": empresa.estado_empresa,
                "logo_url": getattr(empresa, "logo_url", None),
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
        })

    return {"mensaje": "Productos registrados en Zyra", "total": len(resultado), "productos": resultado}


@router.get("/admin/pedidos")
def listar_pedidos_admin_solo_lectura(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    pedidos = db.query(Pedido).order_by(Pedido.id_pedido.desc()).all()
    resultado = []

    for pedido in pedidos:
        cliente = db.query(Usuario).filter(Usuario.id_usuario == pedido.id_usuario).first()
        pago = db.query(Pago).filter(Pago.id_pedido == pedido.id_pedido).first()
        detalles = db.query(PedidoDetalle).filter(PedidoDetalle.id_pedido == pedido.id_pedido).all()

        items = []
        tiendas = {}

        for detalle in detalles:
            variante = db.query(ProductoVariante).filter(ProductoVariante.id_variante == detalle.id_variante).first()
            if not variante:
                continue

            producto = db.query(Producto).filter(Producto.id_producto == variante.id_producto).first()
            if not producto:
                continue

            empresa = db.query(Empresa).filter(Empresa.id_empresa == producto.id_empresa).first()
            nombre_empresa = empresa.nombre_empresa if empresa else "Sin tienda"
            tiendas[nombre_empresa] = True

            items.append({
                "id_producto": producto.id_producto,
                "nombre_producto": producto.nombre_producto,
                "empresa": nombre_empresa,
                "color": variante.color,
                "talla": variante.talla,
                "cantidad": detalle.cantidad,
                "precio_unitario": convertir_float(detalle.precio_unitario),
                "subtotal": convertir_float(detalle.subtotal),
            })

        resultado.append({
            "id_pedido": pedido.id_pedido,
            "estado_pedido": pedido.estado_pedido,
            "total": convertir_float(pedido.total),
            "tiendas": list(tiendas.keys()),
            "cliente": {
                "id_usuario": cliente.id_usuario if cliente else None,
                "nombre": cliente.nombre if cliente else None,
                "apellido": cliente.apellido if cliente else None,
                "email": cliente.email if cliente else None,
                "telefono": cliente.telefono if cliente else None,
            },
            "pago": {
                "id_pago": pago.id_pago,
                "metodo_pago": pago.metodo_pago,
                "monto": convertir_float(pago.monto),
                "estado_pago": pago.estado_pago,
                "comprobante_url": pago.comprobante_url,
            } if pago else None,
            "items": items,
        })

    return {"mensaje": "Pedidos generales de Zyra", "total": len(resultado), "pedidos": resultado}


@router.get("/admin/pagos")
def listar_pagos_admin_solo_lectura(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    pagos = db.query(Pago).order_by(Pago.id_pago.desc()).all()
    resultado = []

    for pago in pagos:
        pedido = db.query(Pedido).filter(Pedido.id_pedido == pago.id_pedido).first()
        cliente = None
        items = []
        tiendas = {}

        if pedido:
            cliente = db.query(Usuario).filter(Usuario.id_usuario == pedido.id_usuario).first()
            detalles = db.query(PedidoDetalle).filter(PedidoDetalle.id_pedido == pedido.id_pedido).all()

            for detalle in detalles:
                variante = db.query(ProductoVariante).filter(ProductoVariante.id_variante == detalle.id_variante).first()
                if not variante:
                    continue

                producto = db.query(Producto).filter(Producto.id_producto == variante.id_producto).first()
                if not producto:
                    continue

                empresa = db.query(Empresa).filter(Empresa.id_empresa == producto.id_empresa).first()
                nombre_empresa = empresa.nombre_empresa if empresa else "Sin tienda"
                tiendas[nombre_empresa] = True

                items.append({
                    "nombre_producto": producto.nombre_producto,
                    "empresa": nombre_empresa,
                    "color": variante.color,
                    "talla": variante.talla,
                    "cantidad": detalle.cantidad,
                    "subtotal": convertir_float(detalle.subtotal),
                })

        resultado.append({
            "id_pago": pago.id_pago,
            "id_pedido": pago.id_pedido,
            "metodo_pago": pago.metodo_pago,
            "monto": convertir_float(pago.monto),
            "estado_pago": pago.estado_pago,
            "comprobante_url": pago.comprobante_url,
            "estado_pedido": pedido.estado_pedido if pedido else None,
            "tiendas": list(tiendas.keys()),
            "cliente": {
                "id_usuario": cliente.id_usuario if cliente else None,
                "nombre": cliente.nombre if cliente else None,
                "apellido": cliente.apellido if cliente else None,
                "email": cliente.email if cliente else None,
                "telefono": cliente.telefono if cliente else None,
            } if cliente else None,
            "items": items,
        })

    return {"mensaje": "Pagos generales de Zyra", "total": len(resultado), "pagos": resultado}


@router.get("/admin/soporte")
def listar_soporte_admin(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    tickets = db.query(SoporteTicket).order_by(SoporteTicket.id_ticket.desc()).all()
    resultado = []

    for ticket in tickets:
        usuario = db.query(Usuario).filter(Usuario.id_usuario == ticket.id_usuario).first()
        rol_usuario = db.query(Rol).filter(Rol.id_rol == usuario.id_rol).first() if usuario else None

        mensajes = (
            db.query(SoporteMensaje)
            .filter(SoporteMensaje.id_ticket == ticket.id_ticket)
            .order_by(SoporteMensaje.id_mensaje.asc())
            .all()
        )
        ultimo_mensaje = mensajes[-1] if mensajes else None
        ultimo_autor = None

        if ultimo_mensaje:
            autor = db.query(Usuario).filter(Usuario.id_usuario == ultimo_mensaje.id_usuario).first()
            rol_autor = db.query(Rol).filter(Rol.id_rol == autor.id_rol).first() if autor else None
            ultimo_autor = {
                "id_usuario": autor.id_usuario if autor else None,
                "nombre": autor.nombre if autor else "Usuario",
                "apellido": autor.apellido if autor else None,
                "email": autor.email if autor else None,
                "rol": rol_autor.nombre_rol if rol_autor else "USUARIO",
            }

        resultado.append({
            "id_ticket": ticket.id_ticket,
            "asunto": ticket.asunto,
            "descripcion": ticket.descripcion,
            "estado_ticket": ticket.estado_ticket,
            "total_mensajes": len(mensajes),
            "ultimo_id_mensaje": ultimo_mensaje.id_mensaje if ultimo_mensaje else None,
            "ultimo_mensaje": ultimo_mensaje.mensaje if ultimo_mensaje else ticket.descripcion,
            "ultimo_autor": ultimo_autor,
            "usuario": {
                "id_usuario": usuario.id_usuario if usuario else None,
                "nombre": usuario.nombre if usuario else None,
                "apellido": usuario.apellido if usuario else None,
                "email": usuario.email if usuario else None,
                "rol": rol_usuario.nombre_rol if rol_usuario else None,
            } if usuario else None,
        })

    return {"mensaje": "Tickets de soporte", "total": len(resultado), "tickets": resultado}


@router.put("/admin/soporte/{id_ticket}/estado")
def cambiar_estado_soporte_admin(id_ticket: int, datos: CambiarEstadoTicket, db: Session = Depends(get_db)):
    verificar_admin(db, datos.id_admin)

    ticket = db.query(SoporteTicket).filter(SoporteTicket.id_ticket == id_ticket).first()

    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    estados_permitidos = ["ABIERTO", "EN_PROCESO", "CERRADO"]

    if datos.estado_ticket not in estados_permitidos:
        raise HTTPException(status_code=400, detail="Estado no válido. Usa: ABIERTO, EN_PROCESO o CERRADO")

    ticket.estado_ticket = datos.estado_ticket
    db.commit()
    db.refresh(ticket)

    return {
        "mensaje": "Estado del ticket actualizado correctamente",
        "id_ticket": ticket.id_ticket,
        "estado_ticket": ticket.estado_ticket,
    }


# ================= ADMIN: USUARIOS Y MI CUENTA =================

@router.post("/admin/usuarios/administradores")
def crear_administrador_admin(
    datos: AdminCrear,
    db: Session = Depends(get_db)
):
    verificar_admin(db, datos.id_admin)

    correo_existente = db.query(Usuario).filter(Usuario.email == datos.email).first()
    if correo_existente:
        raise HTTPException(status_code=400, detail="Ese correo ya está registrado")

    rol_admin = db.query(Rol).filter(Rol.nombre_rol.in_(["ADMIN", "ADMINISTRADOR", "Administrador"])).first()
    if not rol_admin:
        raise HTTPException(status_code=404, detail="No existe el rol ADMIN en la base de datos")

    if len(datos.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    nuevo_admin = Usuario(
        id_rol=rol_admin.id_rol,
        nombre=datos.nombre,
        apellido=datos.apellido,
        email=datos.email,
        telefono=datos.telefono,
        password_hash=crear_hash_password(datos.password),
        acepto_terminos=True,
        fecha_aceptacion_terminos=datetime.now(),
        estado="ACTIVO"
    )

    db.add(nuevo_admin)
    db.commit()
    db.refresh(nuevo_admin)

    return {
        "mensaje": "Administrador creado correctamente",
        "id_usuario": nuevo_admin.id_usuario,
        "nombre": nuevo_admin.nombre,
        "apellido": nuevo_admin.apellido,
        "email": nuevo_admin.email,
        "telefono": nuevo_admin.telefono,
        "foto_url": getattr(nuevo_admin, "foto_url", None),
        "rol": rol_admin.nombre_rol,
        "estado": nuevo_admin.estado
    }

@router.put("/admin/usuarios/{id_usuario}/estado")
def cambiar_estado_usuario_admin(
    id_usuario: int,
    datos: CambioEstadoUsuarioAdmin,
    db: Session = Depends(get_db)
):
    verificar_admin(db, datos.id_admin)

    usuario_objetivo = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()

    if not usuario_objetivo:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    estados_permitidos = ["ACTIVO", "INACTIVO"]

    if datos.estado_usuario not in estados_permitidos:
        raise HTTPException(status_code=400, detail="Estado no válido. Usa ACTIVO o INACTIVO")

    if id_usuario == datos.id_admin and datos.estado_usuario != "ACTIVO":
        raise HTTPException(status_code=400, detail="No puedes deshabilitar tu propia cuenta administrativa")

    usuario_objetivo.estado = datos.estado_usuario
    db.commit()
    db.refresh(usuario_objetivo)

    return {
        "mensaje": "Estado de usuario actualizado correctamente",
        "id_usuario": usuario_objetivo.id_usuario,
        "estado": usuario_objetivo.estado
    }


@router.delete("/admin/usuarios/{id_usuario}")
def eliminar_usuario_admin(
    id_usuario: int,
    id_admin: int,
    db: Session = Depends(get_db)
):
    verificar_admin(db, id_admin)

    if id_usuario == id_admin:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta administrativa")

    usuario_objetivo = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()

    if not usuario_objetivo:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        db.delete(usuario_objetivo)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar este usuario porque tiene registros relacionados. Puedes deshabilitarlo."
        )

    return {
        "mensaje": "Usuario eliminado correctamente",
        "id_usuario": id_usuario
    }


@router.get("/admin/cuenta/{id_admin}")
def obtener_cuenta_admin(
    id_admin: int,
    db: Session = Depends(get_db)
):
    admin = verificar_admin(db, id_admin)

    return {
        "mensaje": "Datos de cuenta administrativa",
        "id_usuario": admin.id_usuario,
        "nombre": admin.nombre,
        "apellido": admin.apellido,
        "email": admin.email,
        "telefono": admin.telefono,
        "foto_url": getattr(admin, "foto_url", None),
        "estado": admin.estado
    }


@router.put("/admin/cuenta/{id_admin}")
def actualizar_cuenta_admin(
    id_admin: int,
    datos: AdminCuentaActualizar,
    db: Session = Depends(get_db)
):
    admin = verificar_admin(db, id_admin)

    correo_existente = db.query(Usuario).filter(
        Usuario.email == datos.email,
        Usuario.id_usuario != id_admin
    ).first()

    if correo_existente:
        raise HTTPException(status_code=400, detail="Ese correo ya está registrado por otro usuario")

    admin.nombre = datos.nombre
    admin.apellido = datos.apellido
    admin.email = datos.email
    admin.telefono = datos.telefono

    db.commit()
    db.refresh(admin)

    return {
        "mensaje": "Cuenta administrativa actualizada correctamente",
        "id_usuario": admin.id_usuario,
        "nombre": admin.nombre,
        "apellido": admin.apellido,
        "email": admin.email,
        "telefono": admin.telefono,
        "foto_url": getattr(admin, "foto_url", None),
        "estado": admin.estado
    }


@router.post("/admin/cuenta/{id_admin}/foto")
def subir_foto_admin(
    id_admin: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    admin = verificar_admin(db, id_admin)

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]
    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa jpg, jpeg, png o webp")

    uploads_dir = os.path.join("uploads", "usuarios")
    os.makedirs(uploads_dir, exist_ok=True)

    nombre_archivo = f"{uuid4()}.{extension}"
    ruta_archivo = os.path.join(uploads_dir, nombre_archivo)

    with open(ruta_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    url_foto = f"/uploads/usuarios/{nombre_archivo}"
    admin.foto_url = url_foto

    db.commit()
    db.refresh(admin)

    return {
        "mensaje": "Foto del administrador actualizada correctamente",
        "id_usuario": admin.id_usuario,
        "foto_url": admin.foto_url,
        "url_completa": f"http://127.0.0.1:8000{url_foto}"
    }


@router.put("/admin/cuenta/{id_admin}/password")
def cambiar_password_admin(
    id_admin: int,
    datos: AdminPasswordCambiar,
    db: Session = Depends(get_db)
):
    admin = verificar_admin(db, id_admin)

    if datos.password_nueva != datos.confirmar_password:
        raise HTTPException(status_code=400, detail="Las contraseñas nuevas no coinciden")

    if len(datos.password_nueva) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")

    if not verificar_password(datos.password_actual, admin.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    admin.password_hash = crear_hash_password(datos.password_nueva)
    db.commit()

    return {
        "mensaje": "Contraseña administrativa actualizada correctamente",
        "id_usuario": admin.id_usuario
    }


# ================= ADMIN: REPORTES, ESTADÍSTICAS Y BACKUPS =================

BACKUPS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backups"))
os.makedirs(BACKUPS_DIR, exist_ok=True)


def _fecha_iso(valor):
    if not valor:
        return None
    if hasattr(valor, "isoformat"):
        return valor.isoformat()
    return str(valor)


def _float(valor):
    return float(valor) if valor is not None else 0


def _int(valor):
    return int(valor or 0)


def _serializar_top_productos(filas):
    return [
        {
            "id_producto": fila["id_producto"],
            "nombre_producto": fila["nombre_producto"],
            "categoria": fila.get("categoria"),
            "empresa": fila.get("nombre_empresa"),
            "imagen_principal": fila.get("imagen_principal"),
            "vistas": _int(fila.get("vistas")),
            "cotizaciones": _int(fila.get("cotizaciones")),
            "ventas": _int(fila.get("ventas")),
            "ingresos": _float(fila.get("ingresos")),
        }
        for fila in filas
    ]


@router.get("/admin/reportes")
def obtener_reportes_administrativos(
    id_admin: int,
    limite: int = 15,
    db: Session = Depends(get_db)
):
    verificar_admin(db, id_admin)
    sincronizar_ventas_pagadas(db)

    limite_seguro = max(1, min(int(limite or 15), 30))

    resumen = {
        "productos_registrados": db.query(Producto).count(),
        "productos_activos": db.query(Producto).filter(Producto.estado_producto == "ACTIVO").count(),
        "tiendas_registradas": db.query(Empresa).count(),
        "tiendas_aprobadas": db.query(Empresa).filter(Empresa.estado_empresa == "APROBADA").count(),
        "clientes": db.query(Usuario).join(Rol, Usuario.id_rol == Rol.id_rol).filter(Rol.nombre_rol.in_(["CLIENTE", "Cliente"])).count(),
        "pedidos": db.query(Pedido).count(),
        "pagos_pagados": db.query(Pago).filter(Pago.estado_pago == "PAGADO").count(),
        "vistas_productos": db.query(ProductoVista).count(),
        "visitas_tiendas": db.query(TiendaVisita).count(),
        "busquedas": db.query(BusquedaRegistro).count(),
        "cotizaciones": db.query(ProductoCotizacion).count(),
        "ventas_registradas": db.query(VentaRegistro).count(),
    }

    ventas_totales = db.execute(text("""
        SELECT
            COALESCE(SUM(cantidad), 0) AS prendas_vendidas,
            COALESCE(SUM(subtotal), 0) AS ingresos_totales
        FROM ventas_registro
    """)).mappings().first()

    resumen["prendas_vendidas"] = _int(ventas_totales["prendas_vendidas"] if ventas_totales else 0)
    resumen["ingresos_totales"] = _float(ventas_totales["ingresos_totales"] if ventas_totales else 0)

    sql_productos_base = """
        SELECT
            p.id_producto,
            p.nombre_producto,
            c.nombre_categoria AS categoria,
            e.nombre_empresa,
            pi.url_imagen AS imagen_principal,
            COALESCE(vistas.total, 0) AS vistas,
            COALESCE(cotizaciones.total, 0) AS cotizaciones,
            COALESCE(ventas.cantidad, 0) AS ventas,
            COALESCE(ventas.ingresos, 0) AS ingresos
        FROM productos p
        JOIN empresas e ON e.id_empresa = p.id_empresa
        LEFT JOIN categorias c ON c.id_categoria = p.id_categoria
        LEFT JOIN producto_imagenes pi ON pi.id_producto = p.id_producto AND pi.es_principal = TRUE
        LEFT JOIN (
            SELECT id_producto, COUNT(*) AS total
            FROM producto_vistas
            GROUP BY id_producto
        ) vistas ON vistas.id_producto = p.id_producto
        LEFT JOIN (
            SELECT id_producto, SUM(cantidad) AS total
            FROM producto_cotizaciones
            GROUP BY id_producto
        ) cotizaciones ON cotizaciones.id_producto = p.id_producto
        LEFT JOIN (
            SELECT id_producto, SUM(cantidad) AS cantidad, SUM(subtotal) AS ingresos
            FROM ventas_registro
            GROUP BY id_producto
        ) ventas ON ventas.id_producto = p.id_producto
    """

    top_productos_vistas = db.execute(text(sql_productos_base + " ORDER BY vistas DESC, ventas DESC, cotizaciones DESC, p.id_producto DESC LIMIT :limite"), {"limite": limite_seguro}).mappings().all()
    top_productos_ventas = db.execute(text(sql_productos_base + " ORDER BY ventas DESC, ingresos DESC, vistas DESC, p.id_producto DESC LIMIT :limite"), {"limite": limite_seguro}).mappings().all()
    top_productos_cotizados = db.execute(text(sql_productos_base + " ORDER BY cotizaciones DESC, ventas DESC, vistas DESC, p.id_producto DESC LIMIT :limite"), {"limite": limite_seguro}).mappings().all()

    tiendas_visitas = db.execute(text("""
        SELECT
            e.id_empresa,
            e.nombre_empresa,
            e.logo_url,
            e.estado_empresa,
            COALESCE(v.total, 0) AS visitas,
            COALESCE(ventas.cantidad, 0) AS prendas_vendidas,
            COALESCE(ventas.ingresos, 0) AS ingresos
        FROM empresas e
        LEFT JOIN (
            SELECT id_empresa, COUNT(*) AS total
            FROM tienda_visitas
            GROUP BY id_empresa
        ) v ON v.id_empresa = e.id_empresa
        LEFT JOIN (
            SELECT id_empresa, SUM(cantidad) AS cantidad, SUM(subtotal) AS ingresos
            FROM ventas_registro
            GROUP BY id_empresa
        ) ventas ON ventas.id_empresa = e.id_empresa
        ORDER BY visitas DESC, ingresos DESC, e.id_empresa DESC
        LIMIT :limite
    """), {"limite": limite_seguro}).mappings().all()

    tiendas_ventas = db.execute(text("""
        SELECT
            e.id_empresa,
            e.nombre_empresa,
            e.logo_url,
            e.estado_empresa,
            COALESCE(v.total, 0) AS visitas,
            COALESCE(ventas.cantidad, 0) AS prendas_vendidas,
            COALESCE(ventas.ingresos, 0) AS ingresos
        FROM empresas e
        LEFT JOIN (
            SELECT id_empresa, COUNT(*) AS total
            FROM tienda_visitas
            GROUP BY id_empresa
        ) v ON v.id_empresa = e.id_empresa
        LEFT JOIN (
            SELECT id_empresa, SUM(cantidad) AS cantidad, SUM(subtotal) AS ingresos
            FROM ventas_registro
            GROUP BY id_empresa
        ) ventas ON ventas.id_empresa = e.id_empresa
        ORDER BY ingresos DESC, prendas_vendidas DESC, visitas DESC, e.id_empresa DESC
        LIMIT :limite
    """), {"limite": limite_seguro}).mappings().all()

    busquedas_populares = db.execute(text("""
        SELECT
            COALESCE(NULLIF(TRIM(termino), ''), 'Búsqueda con filtros') AS termino,
            COUNT(*) AS total,
            COALESCE(ROUND(AVG(total_resultados)::numeric, 2), 0) AS promedio_resultados
        FROM busquedas_registro
        GROUP BY COALESCE(NULLIF(TRIM(termino), ''), 'Búsqueda con filtros')
        ORDER BY total DESC, termino ASC
        LIMIT :limite
    """), {"limite": limite_seguro}).mappings().all()

    filtros_populares = db.execute(text("""
        SELECT 'Categoría' AS tipo, filtro_categoria AS valor, COUNT(*) AS total
        FROM busquedas_registro
        WHERE filtro_categoria IS NOT NULL
        GROUP BY filtro_categoria
        UNION ALL
        SELECT 'Color' AS tipo, filtro_color AS valor, COUNT(*) AS total
        FROM busquedas_registro
        WHERE filtro_color IS NOT NULL
        GROUP BY filtro_color
        UNION ALL
        SELECT 'Talla' AS tipo, filtro_talla AS valor, COUNT(*) AS total
        FROM busquedas_registro
        WHERE filtro_talla IS NOT NULL
        GROUP BY filtro_talla
        UNION ALL
        SELECT 'Tienda' AS tipo, filtro_empresa AS valor, COUNT(*) AS total
        FROM busquedas_registro
        WHERE filtro_empresa IS NOT NULL
        GROUP BY filtro_empresa
        ORDER BY total DESC
        LIMIT :limite
    """), {"limite": limite_seguro}).mappings().all()

    ventas_por_estado_pago = db.execute(text("""
        SELECT estado_pago, COUNT(*) AS total, COALESCE(SUM(monto), 0) AS monto
        FROM pagos
        GROUP BY estado_pago
        ORDER BY total DESC
    """)).mappings().all()

    ventas_por_dia = db.execute(text("""
        SELECT TO_CHAR(fecha_venta::date, 'YYYY-MM-DD') AS fecha, SUM(cantidad) AS cantidad, SUM(subtotal) AS ingresos
        FROM ventas_registro
        GROUP BY fecha_venta::date
        ORDER BY fecha_venta::date DESC
        LIMIT 14
    """)).mappings().all()

    return {
        "mensaje": "Reportes administrativos de Zyra",
        "resumen": resumen,
        "productos": {
            "mas_vistos": _serializar_top_productos(top_productos_vistas),
            "mas_vendidos": _serializar_top_productos(top_productos_ventas),
            "mas_cotizados": _serializar_top_productos(top_productos_cotizados),
        },
        "tiendas": {
            "mas_visitadas": [
                {
                    "id_empresa": fila["id_empresa"],
                    "nombre_empresa": fila["nombre_empresa"],
                    "logo_url": fila["logo_url"],
                    "estado_empresa": fila["estado_empresa"],
                    "visitas": _int(fila["visitas"]),
                    "prendas_vendidas": _int(fila["prendas_vendidas"]),
                    "ingresos": _float(fila["ingresos"]),
                }
                for fila in tiendas_visitas
            ],
            "mayores_ventas": [
                {
                    "id_empresa": fila["id_empresa"],
                    "nombre_empresa": fila["nombre_empresa"],
                    "logo_url": fila["logo_url"],
                    "estado_empresa": fila["estado_empresa"],
                    "visitas": _int(fila["visitas"]),
                    "prendas_vendidas": _int(fila["prendas_vendidas"]),
                    "ingresos": _float(fila["ingresos"]),
                }
                for fila in tiendas_ventas
            ],
        },
        "busquedas": {
            "populares": [
                {
                    "termino": fila["termino"],
                    "total": _int(fila["total"]),
                    "promedio_resultados": _float(fila["promedio_resultados"]),
                }
                for fila in busquedas_populares
            ],
            "filtros_populares": [
                {"tipo": fila["tipo"], "valor": fila["valor"], "total": _int(fila["total"])}
                for fila in filtros_populares
            ],
        },
        "ventas": {
            "por_estado_pago": [
                {"estado_pago": fila["estado_pago"], "total": _int(fila["total"]), "monto": _float(fila["monto"])}
                for fila in ventas_por_estado_pago
            ],
            "por_dia": [
                {"fecha": fila["fecha"], "cantidad": _int(fila["cantidad"]), "ingresos": _float(fila["ingresos"])}
                for fila in ventas_por_dia
            ][::-1],
        },
    }


def _serializar_modelo(objeto, columnas):
    fila = {}
    for columna in columnas:
        valor = getattr(objeto, columna, None)
        if hasattr(valor, "isoformat"):
            valor = valor.isoformat()
        elif hasattr(valor, "__float__") and valor.__class__.__name__ == "Decimal":
            valor = float(valor)
        fila[columna] = valor
    return fila



@router.get("/admin/logs")
def listar_logs_admin(
    id_admin: int,
    limite: int = 120,
    modulo: str | None = None,
    resultado: str | None = None,
    db: Session = Depends(get_db),
):
    verificar_admin(db, id_admin)

    limite = max(1, min(int(limite or 120), 500))
    consulta = db.query(LogSistema)

    if modulo and modulo != "TODOS":
        consulta = consulta.filter(LogSistema.modulo == modulo)

    if resultado and resultado != "TODOS":
        consulta = consulta.filter(LogSistema.resultado == resultado)

    logs = consulta.order_by(LogSistema.fecha.desc()).limit(limite).all()

    resumen_modulos = (
        db.query(LogSistema.modulo, func.count(LogSistema.id_log))
        .group_by(LogSistema.modulo)
        .order_by(func.count(LogSistema.id_log).desc())
        .limit(12)
        .all()
    )

    resumen_resultados = (
        db.query(LogSistema.resultado, func.count(LogSistema.id_log))
        .group_by(LogSistema.resultado)
        .all()
    )

    total_logs = db.query(LogSistema).count()
    total_ok = db.query(LogSistema).filter(LogSistema.resultado == "OK").count()
    total_error = db.query(LogSistema).filter(LogSistema.resultado == "ERROR").count()

    def parsear_detalle(valor):
        if not valor:
            return {}
        try:
            import json
            return json.loads(valor)
        except Exception:
            return {"raw": valor}

    return {
        "total": total_logs,
        "total_ok": total_ok,
        "total_error": total_error,
        "modulos": [
            {"modulo": modulo, "total": total}
            for modulo, total in resumen_modulos
        ],
        "resultados": [
            {"resultado": resultado or "SIN_RESULTADO", "total": total}
            for resultado, total in resumen_resultados
        ],
        "logs": [
            {
                "id_log": log.id_log,
                "fecha": log.fecha.isoformat() if log.fecha else None,
                "metodo": log.metodo,
                "ruta": log.ruta,
                "modulo": log.modulo,
                "accion": log.accion,
                "descripcion": log.descripcion,
                "resultado": log.resultado,
                "estado_http": log.estado_http,
                "id_usuario": log.id_usuario,
                "id_empresa": log.id_empresa,
                "id_producto": log.id_producto,
                "id_pedido": log.id_pedido,
                "ip": log.ip,
                "origen": log.origen,
                "detalle": parsear_detalle(log.detalle),
            }
            for log in logs
        ],
    }

@router.get("/admin/backups")
def listar_backups_admin(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    backups = db.query(BackupRegistro).order_by(BackupRegistro.fecha_backup.desc()).all()

    return {
        "mensaje": "Copias de seguridad registradas",
        "total": len(backups),
        "backups": [
            {
                "id_backup": backup.id_backup,
                "nombre_archivo": backup.nombre_archivo,
                "tipo_backup": backup.tipo_backup,
                "tamanio_bytes": backup.tamanio_bytes,
                "fecha_backup": _fecha_iso(backup.fecha_backup),
            }
            for backup in backups
        ],
    }


@router.post("/admin/backups/crear")
def crear_backup_admin(id_admin: int, db: Session = Depends(get_db)):
    verificar_admin(db, id_admin)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    nombre_archivo = f"zyra_backup_{timestamp}.json"
    ruta_archivo = os.path.join(BACKUPS_DIR, nombre_archivo)

    tablas = {
        "roles": ["id_rol", "nombre_rol"],
        "usuarios": ["id_usuario", "id_rol", "nombre", "apellido", "email", "telefono", "foto_url", "acepto_terminos", "fecha_aceptacion_terminos", "estado"],
        "empresas": ["id_empresa", "id_usuario", "nombre_empresa", "descripcion", "nit", "direccion", "ciudad", "whatsapp", "instagram", "facebook", "logo_url", "qr_pago_url", "color_principal", "color_secundario", "color_acento", "color_fondo", "tema_tienda", "google_maps_url", "estado_empresa"],
        "categorias": ["id_categoria", "nombre_categoria", "descripcion", "estado"],
        "productos": ["id_producto", "id_empresa", "id_categoria", "nombre_producto", "descripcion", "marca", "genero", "precio", "estado_producto"],
        "producto_variantes": ["id_variante", "id_producto", "color", "talla", "stock", "disponible"],
        "producto_imagenes": ["id_imagen", "id_producto", "url_imagen", "es_principal"],
        "carritos": ["id_carrito", "id_usuario", "estado_carrito"],
        "carrito_detalle": ["id_carrito_detalle", "id_carrito", "id_variante", "cantidad", "precio_unitario"],
        "pedidos": ["id_pedido", "id_usuario", "total", "estado_pedido"],
        "pedido_detalle": ["id_pedido_detalle", "id_pedido", "id_variante", "cantidad", "precio_unitario", "subtotal"],
        "pagos": ["id_pago", "id_pedido", "metodo_pago", "monto", "estado_pago", "comprobante_url"],
        "soporte_tickets": ["id_ticket", "id_usuario", "asunto", "descripcion", "estado_ticket"],
        "soporte_mensajes": ["id_mensaje", "id_ticket", "id_usuario", "mensaje"],
        "notificaciones": ["id_notificacion", "id_usuario", "titulo", "mensaje", "leido"],
        "producto_vistas": ["id_vista", "id_producto", "id_usuario", "origen", "fecha_vista"],
        "tienda_visitas": ["id_visita", "id_empresa", "id_usuario", "origen", "fecha_visita"],
        "busquedas_registro": ["id_busqueda", "id_usuario", "termino", "filtro_categoria", "filtro_color", "filtro_talla", "filtro_marca", "filtro_empresa", "precio_min", "precio_max", "total_resultados", "fecha_busqueda"],
        "producto_cotizaciones": ["id_cotizacion", "id_producto", "id_variante", "id_usuario", "cantidad", "fecha_cotizacion"],
        "ventas_registro": ["id_venta", "id_pedido", "id_pedido_detalle", "id_usuario", "id_empresa", "id_producto", "id_variante", "cantidad", "precio_unitario", "subtotal", "estado_venta", "fecha_venta"],
    }

    modelos = {
        "roles": Rol,
        "usuarios": Usuario,
        "empresas": Empresa,
        "categorias": Categoria,
        "productos": Producto,
        "producto_variantes": ProductoVariante,
        "producto_imagenes": ProductoImagen,
        "carritos": Carrito,
        "carrito_detalle": CarritoDetalle,
        "pedidos": Pedido,
        "pedido_detalle": PedidoDetalle,
        "pagos": Pago,
        "soporte_tickets": SoporteTicket,
        "soporte_mensajes": SoporteMensaje,
        "notificaciones": Notificacion,
        "producto_vistas": ProductoVista,
        "tienda_visitas": TiendaVisita,
        "busquedas_registro": BusquedaRegistro,
        "producto_cotizaciones": ProductoCotizacion,
        "ventas_registro": VentaRegistro,
    }

    contenido = {
        "metadata": {
            "proyecto": "Zyra",
            "tipo": "backup_json_administrativo",
            "fecha_backup": datetime.utcnow().isoformat(),
            "creado_por_admin": id_admin,
        },
        "tablas": {},
    }

    for nombre_tabla, columnas in tablas.items():
        modelo = modelos[nombre_tabla]
        contenido["tablas"][nombre_tabla] = [
            _serializar_modelo(objeto, columnas)
            for objeto in db.query(modelo).all()
        ]

    import json
    with open(ruta_archivo, "w", encoding="utf-8") as archivo:
        json.dump(contenido, archivo, ensure_ascii=False, indent=2)

    tamanio = os.path.getsize(ruta_archivo)

    backup = BackupRegistro(
        nombre_archivo=nombre_archivo,
        ruta_archivo=ruta_archivo,
        tipo_backup="JSON",
        tamanio_bytes=tamanio,
        id_admin=id_admin,
        fecha_backup=datetime.utcnow(),
    )

    db.add(backup)
    db.commit()
    db.refresh(backup)

    return {
        "mensaje": "Copia de seguridad creada correctamente",
        "backup": {
            "id_backup": backup.id_backup,
            "nombre_archivo": backup.nombre_archivo,
            "tipo_backup": backup.tipo_backup,
            "tamanio_bytes": backup.tamanio_bytes,
            "fecha_backup": _fecha_iso(backup.fecha_backup),
        },
    }
