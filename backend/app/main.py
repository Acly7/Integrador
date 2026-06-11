from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

from app.database import Base, engine
from app import models  # registra todos los modelos antes de crear tablas nuevas
from app.logs import registrar_movimiento_http

from app.routers import (
    inicio,
    auth,
    admin,
    categorias,
    empresa_productos,
    empresa_pedidos,
    cliente,
    soporte,
    empresa_cuenta,
    ia_busqueda
)

app = FastAPI(
    title="Zyra API",
    description="Backend",
    version="1.0.0"
)

# Crea automáticamente las tablas nuevas de estadísticas/reportes si aún no existen.
Base.metadata.create_all(bind=engine)


@app.middleware("http")
async def middleware_registro_movimientos(request, call_next):
    return await registrar_movimiento_http(request, call_next)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[1]
UPLOADS_DIR = BASE_DIR / "uploads"
PRODUCTOS_DIR = UPLOADS_DIR / "productos"

os.makedirs(PRODUCTOS_DIR, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads"
)

print("CARPETA UPLOADS SERVIDA:", UPLOADS_DIR)

app.include_router(inicio.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(categorias.router)
app.include_router(empresa_productos.router)
app.include_router(empresa_pedidos.router)
app.include_router(cliente.router)
app.include_router(soporte.router)
app.include_router(empresa_cuenta.router)
app.include_router(ia_busqueda.router)