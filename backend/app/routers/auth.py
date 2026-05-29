from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import os
import shutil
import re
from datetime import datetime
from uuid import uuid4

from app.database import get_db
from app.models import Usuario, Rol, Empresa, Categoria, Producto, ProductoVariante, ProductoImagen, Carrito, CarritoDetalle, Pedido, PedidoDetalle, Pago, SoporteTicket, SoporteMensaje, Notificacion
from app.schemas import RegistroCliente, RegistroEmpresa, LoginUsuario, CambioEstadoEmpresa, ProductoCrear, ProductoActualizar, CambioEstadoProducto, VarianteAgregar, VarianteActualizar, AgregarCarrito, ActualizarCantidadCarrito, CrearPedido, RegistrarPago, CambioEstadoPagoEmpresa, CambioEstadoPedidoEmpresa, CrearTicketSoporte, CrearMensajeSoporte, CambiarEstadoTicket, CategoriaCrear
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()


DOMINIOS_CORREO_PERMITIDOS = {"gmail.com"}

def limpiar_texto(valor):
    return str(valor or "").strip()

def validar_email_permitido(email: str):
    correo = limpiar_texto(email).lower()
    patron = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    if not re.match(patron, correo):
        raise HTTPException(status_code=400, detail="El correo electrónico no tiene un formato válido")
    dominio = correo.split("@")[-1]
    if dominio not in DOMINIOS_CORREO_PERMITIDOS:
        raise HTTPException(status_code=400, detail="Usa un correo Gmail válido, por ejemplo usuario@gmail.com")
    return correo

def validar_telefono_opcional(telefono):
    if telefono is None or limpiar_texto(telefono) == "":
        return None
    numero = re.sub(r"\D", "", str(telefono))
    if len(numero) < 7 or len(numero) > 8:
        raise HTTPException(status_code=400, detail="El teléfono debe tener entre 7 y 8 números o dejarse vacío")
    return numero

def validar_whatsapp_obligatorio(whatsapp):
    numero = re.sub(r"\D", "", str(whatsapp or ""))
    if len(numero) != 8:
        raise HTTPException(status_code=400, detail="El WhatsApp es obligatorio y debe tener exactamente 8 números")
    return numero

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
    email_limpio = validar_email_permitido(datos.email)
    telefono_limpio = validar_telefono_opcional(datos.telefono)

    if not limpiar_texto(datos.nombre):
        raise HTTPException(status_code=400, detail="El nombre es obligatorio")

    if len(datos.password or "") < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    if not datos.acepto_terminos:
        raise HTTPException(status_code=400, detail="Debes aceptar los términos y condiciones para crear la cuenta")

    usuario_existente = db.query(Usuario).filter(
        Usuario.email == email_limpio
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado"
        )

    rol_cliente = obtener_rol(db, "CLIENTE")

    nuevo_usuario = Usuario(
        id_rol=rol_cliente.id_rol,
        nombre=limpiar_texto(datos.nombre),
        apellido=limpiar_texto(datos.apellido) or None,
        email=email_limpio,
        password_hash=crear_hash_password(datos.password),
        telefono=telefono_limpio,
        acepto_terminos=True,
        fecha_aceptacion_terminos=datetime.now(),
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
    email_limpio = validar_email_permitido(datos.email)
    telefono_limpio = validar_telefono_opcional(datos.telefono)
    whatsapp_limpio = validar_whatsapp_obligatorio(datos.whatsapp)

    if not limpiar_texto(datos.nombre):
        raise HTTPException(status_code=400, detail="El nombre del responsable es obligatorio")

    if not limpiar_texto(datos.nombre_empresa):
        raise HTTPException(status_code=400, detail="El nombre de la empresa es obligatorio")

    if len(datos.password or "") < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    if not datos.acepto_terminos:
        raise HTTPException(status_code=400, detail="Debes aceptar los términos y condiciones para registrar la empresa")

    usuario_existente = db.query(Usuario).filter(
        Usuario.email == email_limpio
    ).first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado"
        )

    rol_empresa = obtener_rol(db, "EMPRESA")

    nuevo_usuario = Usuario(
        id_rol=rol_empresa.id_rol,
        nombre=limpiar_texto(datos.nombre),
        apellido=limpiar_texto(datos.apellido) or None,
        email=email_limpio,
        password_hash=crear_hash_password(datos.password),
        telefono=telefono_limpio,
        acepto_terminos=True,
        fecha_aceptacion_terminos=datetime.now(),
        estado="ACTIVO"
    )

    db.add(nuevo_usuario)
    db.flush()

    nueva_empresa = Empresa(
        id_usuario=nuevo_usuario.id_usuario,
        nombre_empresa=limpiar_texto(datos.nombre_empresa),
        descripcion=limpiar_texto(datos.descripcion) or None,
        nit=limpiar_texto(datos.nit) or None,
        direccion=limpiar_texto(datos.direccion) or None,
        ciudad=limpiar_texto(datos.ciudad) or "La Paz",
        whatsapp=whatsapp_limpio,
        instagram=datos.instagram,
        facebook=datos.facebook,
        logo_url=datos.logo_url,
        color_principal=getattr(datos, "color_principal", None) or "#8f174d",
        color_secundario=getattr(datos, "color_secundario", None) or "#e879b4",
        color_acento=getattr(datos, "color_acento", None) or "#c02672",
        color_fondo=getattr(datos, "color_fondo", None) or "#fff1f7",
        tema_tienda=getattr(datos, "tema_tienda", None) or "elegante",
        google_maps_url=getattr(datos, "google_maps_url", None),
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
    email_limpio = validar_email_permitido(datos.email)

    usuario = db.query(Usuario).filter(
        Usuario.email == email_limpio
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
    if nombre_rol == "ADMINISTRADOR":
        nombre_rol = "ADMIN"

    datos_usuario = {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "foto_url": getattr(usuario, "foto_url", None),
        "acepto_terminos": bool(getattr(usuario, "acepto_terminos", False)),
        "fecha_aceptacion_terminos": str(getattr(usuario, "fecha_aceptacion_terminos", "")) if getattr(usuario, "fecha_aceptacion_terminos", None) else None,
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
            "color_principal": getattr(empresa, "color_principal", None) or "#8f174d",
            "color_secundario": getattr(empresa, "color_secundario", None) or "#e879b4",
            "color_acento": getattr(empresa, "color_acento", None) or "#c02672",
            "color_fondo": getattr(empresa, "color_fondo", None) or "#fff1f7",
            "tema_tienda": getattr(empresa, "tema_tienda", None) or "elegante",
            "google_maps_url": getattr(empresa, "google_maps_url", None),
            "estado_empresa": empresa.estado_empresa
        })

    return datos_usuario



@router.put("/auth/usuarios/{id_usuario}/terminos")
def aceptar_terminos_usuario(id_usuario: int, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    usuario.acepto_terminos = True
    usuario.fecha_aceptacion_terminos = datetime.now()
    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Términos y condiciones aceptados correctamente",
        "id_usuario": usuario.id_usuario,
        "acepto_terminos": bool(usuario.acepto_terminos),
        "fecha_aceptacion_terminos": str(usuario.fecha_aceptacion_terminos) if usuario.fecha_aceptacion_terminos else None
    }

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

