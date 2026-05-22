# Archivo puente para ejecutar el backend con:
# uvicorn main:app --reload
#
# La aplicación real está en app/main.py.
# Esto evita tener dos configuraciones distintas de /uploads.

from app.main import app