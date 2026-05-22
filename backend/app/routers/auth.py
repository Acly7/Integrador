from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import os
import shutil
from uuid import uuid4

from app.database import get_db
from app.models import Usuario, Rol, Empresa, Categoria, Producto, ProductoVariante, ProductoImagen, Carrito, CarritoDetalle, Pedido, PedidoDetalle, Pago, SoporteTicket, SoporteMensaje, Notificacion
from app.schemas import RegistroCliente, RegistroEmpresa, LoginUsuario, CambioEstadoEmpresa, ProductoCrear, ProductoActualizar, CambioEstadoProducto, VarianteAgregar, VarianteActualizar, AgregarCarrito, ActualizarCantidadCarrito, CrearPedido, RegistrarPago, CambioEstadoPagoEmpresa, CambioEstadoPedidoEmpresa, CrearTicketSoporte, CrearMensajeSoporte, CambiarEstadoTicket, CategoriaCrear
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()

def obtener_rol(db: Session, nombre_rol: str):
    rol = db.query(Rol).filter(Rol.nombre_rol == nombre_rol).first()

    if not rol:
        raise HTTPException(
            status_code=404,
            detail=f"No existe el rol {nombre_rol}"
        )

    return rol


@router.post("/auth/registro-cliente")
def registrar_cliente(datos: RegistroCliente, db: Session = Depends(get_db)):
    usuario_existente = db.query(Usuario).filter(
        Usuario.email == datos.email
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado"
        )

    rol_cliente = obtener_rol(db, "CLIENTE")

    nuevo_usuario = Usuario(
        id_rol=rol_cliente.id_rol,
        nombre=datos.nombre,
        apellido=datos.apellido,
        email=datos.email,
        password_hash=crear_hash_password(datos.password),
        telefono=datos.telefono,
        estado="ACTIVO"
    )

    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    return {
        "mensaje": "Cliente registrado correctamente",
        "id_usuario": nuevo_usuario.id_usuario,
        "rol": "CLIENTE"
    }


@router.post("/auth/registro-empresa")
def registrar_empresa(datos: RegistroEmpresa, db: Session = Depends(get_db)):
    usuario_existente = db.query(Usuario).filter(
        Usuario.email == datos.email
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado"
        )

    rol_empresa = obtener_rol(db, "EMPRESA")

    nuevo_usuario = Usuario(
        id_rol=rol_empresa.id_rol,
        nombre=datos.nombre,
        apellido=datos.apellido,
        email=datos.email,
        password_hash=crear_hash_password(datos.password),
        telefono=datos.telefono,
        estado="ACTIVO"
    )

    db.add(nuevo_usuario)
    db.flush()

    nueva_empresa = Empresa(
        id_usuario=nuevo_usuario.id_usuario,
        nombre_empresa=datos.nombre_empresa,
        descripcion=datos.descripcion,
        nit=datos.nit,
        direccion=datos.direccion,
        ciudad=datos.ciudad,
        whatsapp=datos.whatsapp,
        instagram=datos.instagram,
        facebook=datos.facebook,
        logo_url=datos.logo_url,
        estado_empresa="PENDIENTE"
    )

    db.add(nueva_empresa)
    db.commit()
    db.refresh(nuevo_usuario)
    db.refresh(nueva_empresa)

    return {
        "mensaje": "Empresa registrada correctamente. Queda pendiente de aprobación por el administrador.",
        "id_usuario": nuevo_usuario.id_usuario,
        "id_empresa": nueva_empresa.id_empresa,
        "rol": "EMPRESA",
        "estado_empresa": nueva_empresa.estado_empresa
    }

@router.post("/auth/login")
def login_usuario(
    datos: LoginUsuario,
    db: Session = Depends(get_db)
):
    usuario = db.query(Usuario).filter(
        Usuario.email == datos.email
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos"
        )

    if not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos"
        )

    if usuario.estado != "ACTIVO":
        raise HTTPException(
            status_code=403,
            detail="El usuario no está activo"
        )

    rol = db.query(Rol).filter(
        Rol.id_rol == usuario.id_rol
    ).first()

    if not rol:
        raise HTTPException(
            status_code=404,
            detail="Rol no encontrado"
        )

    nombre_rol = rol.nombre_rol.upper()

    datos_usuario = {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "foto_url": getattr(usuario, "foto_url", None),
        "estado": usuario.estado,
        "rol": nombre_rol
    }

    if nombre_rol == "EMPRESA":
        empresa = db.query(Empresa).filter(
            Empresa.id_usuario == usuario.id_usuario
        ).first()

        if not empresa:
            raise HTTPException(
                status_code=404,
                detail="Empresa no encontrada"
            )

        datos_usuario.update({
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa,
            "descripcion": empresa.descripcion,
            "nit": empresa.nit,
            "direccion": empresa.direccion,
            "ciudad": empresa.ciudad,
            "whatsapp": empresa.whatsapp,
            "instagram": empresa.instagram,
            "facebook": empresa.facebook,
            "logo_url": empresa.logo_url,
            "qr_pago_url": getattr(empresa, "qr_pago_url", None),
            "estado_empresa": empresa.estado_empresa
        })

    return datos_usuario


def verificar_admin(db: Session, id_admin: int):
    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_admin
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="No existe el usuario administrador"
        )

    rol = db.query(Rol).filter(
        Rol.id_rol == usuario.id_rol
    ).first()

    if not rol or rol.nombre_rol != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="No tienes permisos de administrador"
        )

    return usuario

