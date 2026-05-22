from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pathlib import Path
from uuid import uuid4
import shutil

from app.database import get_db
from app.models import Usuario, Empresa
from app.schemas import EmpresaCuentaActualizar, EmpresaPasswordCambiar
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOADS_EMPRESAS_DIR = BASE_DIR / "uploads" / "empresas"
UPLOADS_EMPRESAS_DIR.mkdir(parents=True, exist_ok=True)

UPLOADS_QR_DIR = BASE_DIR / "uploads" / "empresas" / "qr"
UPLOADS_QR_DIR.mkdir(parents=True, exist_ok=True)


def verificar_empresa_usuario(db: Session, id_empresa: int, id_usuario: int):
    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == id_empresa,
        Empresa.id_usuario == id_usuario
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada o no pertenece a este usuario"
        )

    usuario = db.query(Usuario).filter(
        Usuario.id_usuario == id_usuario
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    return empresa, usuario


def armar_respuesta_cuenta(usuario: Usuario, empresa: Empresa):
    return {
        "mensaje": "Datos de cuenta empresarial",
        "id_usuario": usuario.id_usuario,
        "id_empresa": empresa.id_empresa,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "rol": "EMPRESA",
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
    }


@router.get("/empresa/cuenta/{id_empresa}")
def obtener_cuenta_empresa(
    id_empresa: int,
    id_usuario: int,
    db: Session = Depends(get_db)
):
    empresa, usuario = verificar_empresa_usuario(db, id_empresa, id_usuario)
    return armar_respuesta_cuenta(usuario, empresa)


@router.put("/empresa/cuenta/{id_empresa}")
def actualizar_cuenta_empresa(
    id_empresa: int,
    datos: EmpresaCuentaActualizar,
    db: Session = Depends(get_db)
):
    empresa, usuario = verificar_empresa_usuario(
        db,
        id_empresa,
        datos.id_usuario
    )

    email_existente = db.query(Usuario).filter(
        Usuario.email == datos.email,
        Usuario.id_usuario != datos.id_usuario
    ).first()

    if email_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado por otro usuario"
        )

    usuario.nombre = datos.nombre.strip()
    usuario.apellido = datos.apellido.strip() if datos.apellido else None
    usuario.email = datos.email.strip()
    usuario.telefono = datos.telefono if datos.telefono else None

    empresa.nombre_empresa = datos.nombre_empresa.strip()
    empresa.descripcion = datos.descripcion.strip() if datos.descripcion else None
    empresa.nit = datos.nit if datos.nit else None
    empresa.direccion = datos.direccion.strip() if datos.direccion else None
    empresa.ciudad = datos.ciudad.strip() if datos.ciudad else "La Paz"
    empresa.whatsapp = datos.whatsapp if datos.whatsapp else None
    empresa.instagram = datos.instagram.strip() if datos.instagram else None
    empresa.facebook = datos.facebook.strip() if datos.facebook else None

    db.commit()
    db.refresh(usuario)
    db.refresh(empresa)

    return {
        "mensaje": "Cuenta actualizada correctamente",
        "id_usuario": usuario.id_usuario,
        "id_empresa": empresa.id_empresa,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "telefono": usuario.telefono,
        "rol": "EMPRESA",
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
    }


@router.post("/empresa/cuenta/{id_empresa}/logo")
def subir_logo_empresa(
    id_empresa: int,
    id_usuario: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    empresa, usuario = verificar_empresa_usuario(db, id_empresa, id_usuario)

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]
    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa jpg, jpeg, png o webp"
        )

    nombre_archivo = f"{uuid4()}.{extension}"
    ruta_archivo = UPLOADS_EMPRESAS_DIR / nombre_archivo

    with open(ruta_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    logo_url = f"/uploads/empresas/{nombre_archivo}"
    empresa.logo_url = logo_url

    db.commit()
    db.refresh(empresa)

    return {
        "mensaje": "Logo actualizado correctamente",
        "logo_url": logo_url
    }


@router.post("/empresa/cuenta/{id_empresa}/qr-pago")
def subir_qr_pago_empresa(
    id_empresa: int,
    id_usuario: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    empresa, usuario = verificar_empresa_usuario(db, id_empresa, id_usuario)

    extensiones_permitidas = ["jpg", "jpeg", "png", "webp"]
    extension = archivo.filename.split(".")[-1].lower()

    if extension not in extensiones_permitidas:
        raise HTTPException(
            status_code=400,
            detail="Formato no permitido. Usa jpg, jpeg, png o webp"
        )

    nombre_archivo = f"{uuid4()}.{extension}"
    ruta_archivo = UPLOADS_QR_DIR / nombre_archivo

    with open(ruta_archivo, "wb") as buffer:
        shutil.copyfileobj(archivo.file, buffer)

    qr_pago_url = f"/uploads/empresas/qr/{nombre_archivo}"
    empresa.qr_pago_url = qr_pago_url

    db.commit()
    db.refresh(empresa)

    return {
        "mensaje": "QR de pago actualizado correctamente",
        "qr_pago_url": qr_pago_url
    }


@router.put("/empresa/cuenta/{id_empresa}/password")
def cambiar_password_empresa(
    id_empresa: int,
    datos: EmpresaPasswordCambiar,
    db: Session = Depends(get_db)
):
    empresa, usuario = verificar_empresa_usuario(
        db,
        id_empresa,
        datos.id_usuario
    )

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