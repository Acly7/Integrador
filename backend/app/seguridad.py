import hashlib
import hmac
import os
import secrets
import time

from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

_clave_reportes = (os.getenv("ZYRA_REPORTES_SECRET") or secrets.token_hex(32)).encode()


def _firma_reportes(id_admin: int, vence: str, password_hash: str):
    mensaje = f"{id_admin}:{vence}:{password_hash}".encode()
    return hmac.new(_clave_reportes, mensaje, hashlib.sha256).hexdigest()


def emitir_token_reportes(id_admin: int, password_hash: str):
    vence = str(int(time.time()) + 8 * 60 * 60)
    return f"{vence}.{_firma_reportes(id_admin, vence, password_hash)}"


def validar_token_reportes(token: str, id_admin: int, password_hash: str):
    vence, _, firma = token.partition(".")
    if len(vence) != 10 or not vence.isascii() or not vence.isdigit() or len(firma) != 64:
        return False
    if int(vence) <= time.time() or not firma.isascii():
        return False
    return hmac.compare_digest(firma, _firma_reportes(id_admin, vence, password_hash))


def crear_hash_password(password: str):
    return pwd_context.hash(password)


def verificar_password(password_normal: str, password_hash: str):
    try:
        return pwd_context.verify(password_normal, password_hash)
    except Exception:
        return password_normal == password_hash
