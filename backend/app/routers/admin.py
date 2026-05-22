from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import os
import shutil
from uuid import uuid4

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
)
from app.schemas import CambioEstadoEmpresa, CambiarEstadoTicket, CambioEstadoUsuarioAdmin, AdminCuentaActualizar, AdminPasswordCambiar, AdminCrear
from app.seguridad import crear_hash_password, verificar_password

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
