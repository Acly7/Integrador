"""Carga el catálogo académico en una base de datos vacía."""

import argparse
import json
import os
from datetime import datetime
from decimal import Decimal
from getpass import getpass
from pathlib import Path

from sqlalchemy import DateTime, Numeric, func, select, text

from app.database import Base, SessionLocal, engine
from app.models import Producto
from app.seguridad import crear_hash_password


def cargar_datos(snapshot, password):
    tablas = [Base.metadata.tables[nombre] for nombre in snapshot]
    if engine.dialect.name == "postgresql":
        # Impide que dos cargas de demostración se ejecuten a la vez.
        bloqueo = "LOCK TABLE " + ", ".join(tabla.name for tabla in tablas) + " IN SHARE ROW EXCLUSIVE MODE"
    Base.metadata.create_all(engine)
    with SessionLocal.begin() as db:
        if engine.dialect.name == "postgresql":
            db.execute(text(bloqueo))
        if any(db.scalar(select(func.count()).select_from(tabla)) for tabla in tablas):
            raise SystemExit("Usa una base vacía. La carga no reemplaza registros existentes.")

        for tabla in tablas:
            filas = snapshot[tabla.name]
            for fila in filas:
                for columna in tabla.columns:
                    valor = fila.get(columna.name)
                    if isinstance(columna.type, DateTime) and valor is not None:
                        fila[columna.name] = datetime.fromisoformat(valor)
                    elif isinstance(columna.type, Numeric) and valor is not None:
                        fila[columna.name] = Decimal(str(valor))
                if tabla.name == "usuarios":
                    fila["password_hash"] = crear_hash_password(password)
            if filas:
                db.execute(tabla.insert(), filas)
                if engine.dialect.name == "postgresql":
                    primaria = next(iter(tabla.primary_key.columns)).name
                    db.execute(text("SELECT setval(pg_get_serial_sequence(:tabla, :columna), :ultimo)"), {
                        "tabla": tabla.name, "columna": primaria, "ultimo": max(f[primaria] for f in filas),
                    })


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--indexar", action="store_true", help="Genera el índice visual CLIP/ChromaDB después de cargar.")
    args = parser.parse_args()
    raiz = Path(__file__).resolve().parents[2]
    snapshot = json.loads((raiz / "database" / "zyra_demo.json").read_text(encoding="utf-8"))
    for imagen in snapshot["producto_imagenes"]:
        if not (raiz / "backend" / imagen["url_imagen"].lstrip("/")).is_file():
            raise SystemExit(f"No existe la imagen {imagen['url_imagen']}")
    password = os.getenv("ZYRA_DEMO_PASSWORD") or getpass("Contraseña local para las cuentas de demostración: ")
    if len(password) < 8 or len(password.encode()) > 72:
        raise SystemExit("La contraseña debe tener al menos 8 caracteres y como máximo 72 bytes.")
    cargar_datos(snapshot, password)
    print(f"Cargadas {len(snapshot['usuarios'])} cuentas, {len(snapshot['empresas'])} tiendas y {len(snapshot['productos'])} prendas.")
    if args.indexar:
        from app.routers.ia_busqueda import sincronizar_producto_ia_seguro

        with SessionLocal() as db:
            ids = db.scalars(select(Producto.id_producto).order_by(Producto.id_producto)).all()
            fallidos = [id_producto for id_producto in ids
                        if not sincronizar_producto_ia_seguro(db, id_producto).get("indexado")]
        if fallidos:
            raise SystemExit(f"Datos cargados. Reintenta la sincronización visual de estos productos: {fallidos}")
        print(f"Índice visual generado para {len(ids)} prendas.")


if __name__ == "__main__":
    main()
