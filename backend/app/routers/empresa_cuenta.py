from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from pathlib import Path
from uuid import uuid4
import shutil
import re

from app.database import get_db
from app.models import Usuario, Empresa
from app.schemas import EmpresaPasswordCambiar
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOADS_EMPRESAS_DIR = BASE_DIR / "uploads" / "empresas"
UPLOADS_EMPRESAS_DIR.mkdir(parents=True, exist_ok=True)

UPLOADS_QR_DIR = BASE_DIR / "uploads" / "empresas" / "qr"
UPLOADS_QR_DIR.mkdir(parents=True, exist_ok=True)


DOMINIOS_CORREO_PERMITIDOS = {"gmail.com"}
TEMAS_TIENDA_PERMITIDOS = {"elegante", "minimalista", "boutique", "urbano", "juvenil"}

def limpiar_texto(valor):
    return str(valor or "").strip()

def validar_email_permitido(email: str):
    correo = limpiar_texto(email).lower()
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", correo):
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


def validar_color_hex(valor, defecto):
    texto = limpiar_texto(valor) or defecto
    if not re.match(r"^#[0-9A-Fa-f]{6}$", texto):
        raise HTTPException(status_code=400, detail="Los colores de la tienda deben estar en formato hexadecimal, por ejemplo #8f174d")
    return texto.lower()


def validar_tema_tienda(valor):
    tema = limpiar_texto(valor).lower() or "elegante"
    if tema not in TEMAS_TIENDA_PERMITIDOS:
        raise HTTPException(status_code=400, detail="Tema de tienda no válido")
    return tema


def validar_google_maps_url(valor):
    url = limpiar_texto(valor)
    if not url:
        return None
    if not (url.startswith("https://") or url.startswith("http://")):
        raise HTTPException(status_code=400, detail="La ubicación debe ser un enlace válido de Google Maps o un enlace web")
    return url


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
        "color_principal": getattr(empresa, "color_principal", None) or "#8f174d",
        "color_secundario": getattr(empresa, "color_secundario", None) or "#e879b4",
        "color_acento": getattr(empresa, "color_acento", None) or "#c02672",
        "color_fondo": getattr(empresa, "color_fondo", None) or "#fff1f7",
        "tema_tienda": getattr(empresa, "tema_tienda", None) or "elegante",
        "google_maps_url": getattr(empresa, "google_maps_url", None),
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




@router.get("/cliente/empresas/{id_empresa}")
def obtener_empresa_publica(
    id_empresa: int,
    db: Session = Depends(get_db)
):
    empresa = db.query(Empresa).filter(Empresa.id_empresa == id_empresa).first()

    if not empresa:
        raise HTTPException(status_code=404, detail="Tienda no encontrada")

    return {
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
            "qr_pago_url": getattr(empresa, "qr_pago_url", None),
            "color_principal": getattr(empresa, "color_principal", None) or "#8f174d",
            "color_secundario": getattr(empresa, "color_secundario", None) or "#e879b4",
            "color_acento": getattr(empresa, "color_acento", None) or "#c02672",
            "color_fondo": getattr(empresa, "color_fondo", None) or "#fff1f7",
            "tema_tienda": getattr(empresa, "tema_tienda", None) or "elegante",
            "google_maps_url": getattr(empresa, "google_maps_url", None),
            "estado_empresa": empresa.estado_empresa
        }
    }

@router.put("/empresa/cuenta/{id_empresa}")
async def actualizar_cuenta_empresa(
    id_empresa: int,
    request: Request,
    db: Session = Depends(get_db)
):
    # Se lee el JSON directamente para no depender de que el schema ignore campos nuevos.
    # Así se conservan colores, tema visual y enlace de mapa sin tocar otros módulos.
    datos = await request.json()

    def dato(clave, defecto=None):
        return datos.get(clave, defecto)

    id_usuario = dato("id_usuario")
    if not id_usuario:
        raise HTTPException(status_code=400, detail="El usuario de la empresa es obligatorio")

    empresa, usuario = verificar_empresa_usuario(
        db,
        id_empresa,
        int(id_usuario)
    )

    email_limpio = validar_email_permitido(dato("email"))
    telefono_limpio = validar_telefono_opcional(dato("telefono"))
    whatsapp_limpio = validar_whatsapp_obligatorio(dato("whatsapp"))
    color_principal = validar_color_hex(dato("color_principal"), "#8f174d")
    color_secundario = validar_color_hex(dato("color_secundario"), "#e879b4")
    color_acento = validar_color_hex(dato("color_acento"), "#c02672")
    color_fondo = validar_color_hex(dato("color_fondo"), "#fff1f7")
    tema_tienda = validar_tema_tienda(dato("tema_tienda"))
    google_maps_url = validar_google_maps_url(dato("google_maps_url"))

    if not limpiar_texto(dato("nombre")):
        raise HTTPException(status_code=400, detail="El nombre del responsable es obligatorio")

    if not limpiar_texto(dato("nombre_empresa")):
        raise HTTPException(status_code=400, detail="El nombre de la empresa es obligatorio")

    email_existente = db.query(Usuario).filter(
        Usuario.email == email_limpio,
        Usuario.id_usuario != int(id_usuario)
    ).first()

    if email_existente:
        raise HTTPException(
            status_code=400,
            detail="Ese correo ya está registrado por otro usuario"
        )

    usuario.nombre = limpiar_texto(dato("nombre"))
    usuario.apellido = limpiar_texto(dato("apellido")) or None
    usuario.email = email_limpio
    usuario.telefono = telefono_limpio

    empresa.nombre_empresa = limpiar_texto(dato("nombre_empresa"))
    empresa.descripcion = limpiar_texto(dato("descripcion")) or None
    empresa.nit = limpiar_texto(dato("nit")) or None
    empresa.direccion = limpiar_texto(dato("direccion")) or None
    empresa.ciudad = limpiar_texto(dato("ciudad")) or "La Paz"
    empresa.whatsapp = whatsapp_limpio
    empresa.instagram = limpiar_texto(dato("instagram")) or None
    empresa.facebook = limpiar_texto(dato("facebook")) or None
    empresa.color_principal = color_principal
    empresa.color_secundario = color_secundario
    empresa.color_acento = color_acento
    empresa.color_fondo = color_fondo
    empresa.tema_tienda = tema_tienda
    empresa.google_maps_url = google_maps_url

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
        "color_principal": getattr(empresa, "color_principal", None) or "#8f174d",
        "color_secundario": getattr(empresa, "color_secundario", None) or "#e879b4",
        "color_acento": getattr(empresa, "color_acento", None) or "#c02672",
        "color_fondo": getattr(empresa, "color_fondo", None) or "#fff1f7",
        "tema_tienda": getattr(empresa, "tema_tienda", None) or "elegante",
        "google_maps_url": getattr(empresa, "google_maps_url", None),
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