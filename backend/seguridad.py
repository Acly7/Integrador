from passlib.context import CryptContext

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


def crear_hash_password(password: str):
    return pwd_context.hash(password)


def verificar_password(password_normal: str, password_hash: str):
    try:
        return pwd_context.verify(password_normal, password_hash)
    except Exception:
        return password_normal == password_hash