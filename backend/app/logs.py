from __future__ import annotations

import json
import re
from datetime import datetime
from typing import Any

from fastapi import Request
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import LogSistema, Usuario, Empresa, Producto, Pedido

CAMPOS_SENSIBLES = {
    "password",
    "password_hash",
    "password_actual",
    "password_nueva",
    "confirmar_password",
    "token",
    "access_token",
    "refresh_token",
}

RUTAS_EXCLUIDAS = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/uploads",
    "/favicon.ico",
    "/admin/logs",
)

METODOS_MOVIMIENTO = {"POST", "PUT", "PATCH", "DELETE"}


def limpiar_valor(valor: Any) -> Any:
    if isinstance(valor, dict):
        return limpiar_diccionario(valor)
    if isinstance(valor, list):
        return [limpiar_valor(item) for item in valor[:20]]
    if isinstance(valor, str) and len(valor) > 250:
        return valor[:247] + "..."
    return valor


def limpiar_diccionario(datos: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(datos, dict):
        return {}

    limpio = {}
    for clave, valor in datos.items():
        clave_str = str(clave)
        if clave_str.lower() in CAMPOS_SENSIBLES or "password" in clave_str.lower():
            limpio[clave_str] = "***"
        else:
            limpio[clave_str] = limpiar_valor(valor)
    return limpio


def primero_int(*valores: Any) -> int | None:
    for valor in valores:
        if valor is None or valor == "":
            continue
        try:
            return int(valor)
        except (TypeError, ValueError):
            continue
    return None


def buscar_entero_en_ruta(ruta: str, patron: str) -> int | None:
    encontrado = re.search(patron, ruta)
    if not encontrado:
        return None
    return primero_int(encontrado.group(1))


def modulo_por_ruta(ruta: str) -> str:
    if ruta.startswith("/auth"):
        return "Autenticación"
    if ruta.startswith("/admin"):
        return "Administración"
    if ruta.startswith("/empresa/productos") or ruta.startswith("/empresa/variantes") or ruta.startswith("/empresa/productos/variantes"):
        return "Productos empresa"
    if ruta.startswith("/empresa/cuenta"):
        return "Cuenta empresa"
    if ruta.startswith("/empresa/") and "/pedidos" in ruta:
        return "Pedidos empresa"
    if ruta.startswith("/empresa/pagos"):
        return "Pagos empresa"
    if ruta.startswith("/cliente"):
        return "Cliente"
    if ruta.startswith("/soporte") or "/soporte" in ruta:
        return "Soporte"
    if ruta.startswith("/categorias"):
        return "Categorías"
    if ruta.startswith("/ia"):
        return "IA visual"
    return "Sistema"


def accion_por_peticion(metodo: str, ruta: str, query: dict[str, Any], cuerpo: dict[str, Any]) -> tuple[str, str]:
    metodo = metodo.upper()

    reglas: list[tuple[str, str, str, str]] = [
        ("POST", r"^/auth/registro-cliente$", "Registro de cliente", "Se registró una nueva cuenta de cliente."),
        ("POST", r"^/auth/registro-empresa$", "Registro de empresa", "Se registró una nueva cuenta de empresa."),
        ("POST", r"^/auth/login$", "Inicio de sesión", "Un usuario intentó iniciar sesión en la plataforma."),
        ("PUT", r"^/auth/usuarios/\d+/terminos$", "Aceptación de términos", "Se registró la aceptación de términos y privacidad."),
        ("POST", r"^/empresa/productos$", "Producto creado", "Una empresa registró un nuevo producto."),
        ("PUT", r"^/empresa/productos/\d+$", "Producto editado", "Una empresa actualizó los datos de un producto."),
        ("DELETE", r"^/empresa/productos/\d+$", "Producto desactivado", "Una empresa desactivó un producto."),
        ("DELETE", r"^/empresa/productos/\d+/definitivo$", "Producto eliminado", "Una empresa eliminó definitivamente un producto."),
        ("PUT", r"^/empresa/productos/\d+/estado$", "Estado de producto", "Una empresa cambió el estado de un producto."),
        ("POST", r"^/empresa/productos/\d+/imagen$", "Imagen de producto", "Una empresa subió o cambió una imagen de producto."),
        ("POST", r"^/empresa/productos/\d+/variantes$", "Variante creada", "Una empresa agregó una variante de producto."),
        ("PUT", r"^/empresa/variantes/\d+$", "Variante editada", "Una empresa actualizó una variante de producto."),
        ("PUT", r"^/empresa/productos/variantes/\d+$", "Variante editada", "Una empresa actualizó una variante de producto."),
        ("PUT", r"^/empresa/productos/variantes/\d+/estado$", "Estado de variante", "Una empresa cambió el estado de una variante."),
        ("PUT", r"^/empresa/cuenta/\d+$", "Cuenta empresa actualizada", "Una empresa actualizó datos, colores o tema visual de su tienda."),
        ("POST", r"^/empresa/cuenta/\d+/logo$", "Logo de empresa", "Una empresa actualizó su logo."),
        ("POST", r"^/empresa/cuenta/\d+/qr-pago$", "QR de pago", "Una empresa actualizó su QR de pago."),
        ("PUT", r"^/empresa/cuenta/\d+/password$", "Contraseña empresa", "Una empresa cambió su contraseña."),
        ("PUT", r"^/empresa/pagos/\d+/estado$", "Estado de pago", "Una empresa cambió el estado de un pago."),
        ("PUT", r"^/empresa/pedidos/\d+/estado$", "Estado de pedido", "Una empresa cambió el estado de un pedido."),
        ("POST", r"^/cliente/empresas/\d+/visita$", "Visita a tienda", "Un cliente visitó una tienda."),
        ("GET", r"^/cliente/empresas/\d+/catalogo$", "Catálogo de tienda", "Un cliente abrió el catálogo público de una tienda."),
        ("GET", r"^/cliente/productos/\d+$", "Detalle de producto", "Un cliente abrió el detalle de un producto."),
        ("POST", r"^/cliente/carrito/agregar$", "Producto al carrito", "Un cliente agregó una prenda al carrito."),
        ("PUT", r"^/cliente/carrito/detalle/\d+$", "Carrito actualizado", "Un cliente actualizó la cantidad de una prenda del carrito."),
        ("DELETE", r"^/cliente/carrito/detalle/\d+$", "Carrito actualizado", "Un cliente eliminó una prenda del carrito."),
        ("POST", r"^/cliente/pedidos/crear$", "Pedido creado", "Un cliente generó un pedido."),
        ("POST", r"^/cliente/pagos/\d+/comprobante$", "Comprobante subido", "Un cliente subió un comprobante de pago."),
        ("POST", r"^/cliente/pagos/registrar$", "Pago registrado", "Un cliente registró información de pago."),
        ("POST", r"^/cliente/buscar-por-imagen$", "Búsqueda visual", "Un cliente buscó productos similares usando una imagen."),
        ("POST", r"^/soporte/publico$", "Soporte público", "Se registró una consulta pública de soporte."),
        ("POST", r"^/soporte/tickets$", "Ticket creado", "Un usuario creó un ticket de soporte."),
        ("POST", r"^/soporte/tickets/\d+/mensajes$", "Mensaje de soporte", "Un usuario respondió un ticket de soporte."),
        ("PUT", r"^/admin/soporte/tickets/\d+/estado$", "Estado de soporte", "Administración cambió el estado de un ticket."),
        ("PUT", r"^/admin/soporte/\d+/estado$", "Estado de soporte", "Administración cambió el estado de un ticket."),
        ("PUT", r"^/admin/empresas/\d+/estado$", "Estado de empresa", "Administración cambió el estado de una empresa."),
        ("POST", r"^/admin/usuarios/administradores$", "Administrador creado", "Administración creó una cuenta administradora."),
        ("PUT", r"^/admin/usuarios/\d+/estado$", "Estado de usuario", "Administración cambió el estado de un usuario."),
        ("DELETE", r"^/admin/usuarios/\d+$", "Usuario eliminado", "Administración eliminó un usuario."),
        ("PUT", r"^/admin/cuenta/\d+$", "Cuenta admin actualizada", "Administración actualizó datos de su cuenta."),
        ("POST", r"^/admin/cuenta/\d+/foto$", "Foto admin", "Administración cambió su foto de perfil."),
        ("PUT", r"^/admin/cuenta/\d+/password$", "Contraseña admin", "Administración cambió su contraseña."),
        ("POST", r"^/admin/backups/crear$", "Backup creado", "Administración generó una copia de seguridad."),
        ("POST", r"^/ia/indexar-productos$", "Indexación IA", "Administración ejecutó la indexación de productos para IA visual."),
        ("POST", r"^/categorias$", "Categoría creada", "Se creó una categoría de productos."),
    ]

    for metodo_regla, patron, accion, descripcion in reglas:
        if metodo == metodo_regla and re.match(patron, ruta):
            return accion, descripcion

    if metodo == "GET" and ruta == "/cliente/productos" and any(query.get(k) for k in ["busqueda", "q", "categoria", "color", "talla", "marca", "empresa", "precio_min", "precio_max"]):
        return "Búsqueda en catálogo", "Un cliente realizó una búsqueda o aplicó filtros en el catálogo."

    if metodo in METODOS_MOVIMIENTO:
        return f"{metodo} {ruta}", "Se registró un movimiento del sistema."

    return f"Consulta {ruta}", "Se registró una consulta relevante del sistema."


def extraer_ids(ruta: str, query: dict[str, Any], cuerpo: dict[str, Any]) -> dict[str, int | None]:
    id_usuario = primero_int(
        query.get("id_usuario"), query.get("id_cliente"), query.get("id_admin"),
        cuerpo.get("id_usuario"), cuerpo.get("id_cliente"), cuerpo.get("id_admin"),
        buscar_entero_en_ruta(ruta, r"/usuarios/(\d+)"),
        buscar_entero_en_ruta(ruta, r"/cuenta/(\d+)"),
    )
    id_empresa = primero_int(
        query.get("id_empresa"), cuerpo.get("id_empresa"),
        buscar_entero_en_ruta(ruta, r"/empresas/(\d+)"),
        buscar_entero_en_ruta(ruta, r"/empresa/cuenta/(\d+)"),
        buscar_entero_en_ruta(ruta, r"/empresa/(\d+)/"),
    )
    id_producto = primero_int(
        query.get("id_producto"), cuerpo.get("id_producto"),
        buscar_entero_en_ruta(ruta, r"/productos/(\d+)"),
    )
    id_pedido = primero_int(
        query.get("id_pedido"), cuerpo.get("id_pedido"),
        buscar_entero_en_ruta(ruta, r"/pedidos/(\d+)"),
        buscar_entero_en_ruta(ruta, r"/pagos/(\d+)/comprobante"),
    )
    return {
        "id_usuario": id_usuario,
        "id_empresa": id_empresa,
        "id_producto": id_producto,
        "id_pedido": id_pedido,
    }


def completar_detalle_con_nombres(db: Session, detalle: dict[str, Any], ids: dict[str, int | None]) -> dict[str, Any]:
    try:
        if ids.get("id_usuario"):
            usuario = db.query(Usuario).filter(Usuario.id_usuario == ids["id_usuario"]).first()
            if usuario:
                detalle["usuario"] = {
                    "id_usuario": usuario.id_usuario,
                    "nombre": f"{usuario.nombre} {usuario.apellido or ''}".strip(),
                    "email": usuario.email,
                }
        if ids.get("id_empresa"):
            empresa = db.query(Empresa).filter(Empresa.id_empresa == ids["id_empresa"]).first()
            if empresa:
                detalle["empresa"] = {
                    "id_empresa": empresa.id_empresa,
                    "nombre_empresa": empresa.nombre_empresa,
                    "estado_empresa": empresa.estado_empresa,
                }
        if ids.get("id_producto"):
            producto = db.query(Producto).filter(Producto.id_producto == ids["id_producto"]).first()
            if producto:
                detalle["producto"] = {
                    "id_producto": producto.id_producto,
                    "nombre_producto": producto.nombre_producto,
                    "estado_producto": producto.estado_producto,
                }
        if ids.get("id_pedido"):
            pedido = db.query(Pedido).filter(Pedido.id_pedido == ids["id_pedido"]).first()
            if pedido:
                detalle["pedido"] = {
                    "id_pedido": pedido.id_pedido,
                    "estado_pedido": pedido.estado_pedido,
                    "total": float(pedido.total or 0),
                }
    except Exception:
        pass
    return detalle


def debe_registrarse(metodo: str, ruta: str, query: dict[str, Any]) -> bool:
    if any(ruta.startswith(prefijo) for prefijo in RUTAS_EXCLUIDAS):
        return False
    if metodo.upper() in METODOS_MOVIMIENTO:
        return True
    if ruta == "/cliente/productos" and any(query.get(k) for k in ["busqueda", "q", "categoria", "color", "talla", "marca", "empresa", "precio_min", "precio_max"]):
        return True
    if re.match(r"^/cliente/productos/\d+$", ruta):
        return True
    if re.match(r"^/cliente/empresas/\d+/catalogo$", ruta):
        return True
    return False


def registrar_log_sistema(
    db: Session,
    *,
    metodo: str,
    ruta: str,
    modulo: str,
    accion: str,
    descripcion: str,
    resultado: str,
    estado_http: int | None = None,
    id_usuario: int | None = None,
    id_empresa: int | None = None,
    id_producto: int | None = None,
    id_pedido: int | None = None,
    ip: str | None = None,
    origen: str | None = None,
    detalle: dict[str, Any] | None = None,
) -> None:
    try:
        log = LogSistema(
            fecha=datetime.utcnow(),
            metodo=metodo[:10],
            ruta=ruta[:255],
            modulo=modulo[:80],
            accion=accion[:150],
            descripcion=descripcion,
            resultado=resultado[:30],
            estado_http=estado_http,
            id_usuario=id_usuario,
            id_empresa=id_empresa,
            id_producto=id_producto,
            id_pedido=id_pedido,
            ip=(ip or "")[:80] or None,
            origen=(origen or "")[:120] or None,
            detalle=json.dumps(detalle or {}, ensure_ascii=False),
        )
        db.add(log)
        db.commit()
    except Exception:
        db.rollback()


async def registrar_movimiento_http(request: Request, call_next):
    metodo = request.method.upper()
    ruta = request.url.path
    query = dict(request.query_params)
    content_type = request.headers.get("content-type", "") or ""
    cuerpo: dict[str, Any] = {}

    if not debe_registrarse(metodo, ruta, query):
        return await call_next(request)

    request_para_ruta = request
    if "application/json" in content_type:
        try:
            body_bytes = await request.body()
            if body_bytes:
                cuerpo = json.loads(body_bytes.decode("utf-8"))
                if not isinstance(cuerpo, dict):
                    cuerpo = {"payload": cuerpo}

            async def receive():
                return {"type": "http.request", "body": body_bytes, "more_body": False}

            request_para_ruta = Request(request.scope, receive)
        except Exception:
            cuerpo = {}

    response = None
    error_servidor = None
    try:
        response = await call_next(request_para_ruta)
        return response
    except Exception as exc:
        error_servidor = exc
        raise
    finally:
        estado_http = getattr(response, "status_code", 500 if error_servidor else None)
        resultado = "ERROR" if (error_servidor or (estado_http and estado_http >= 400)) else "OK"
        modulo = modulo_por_ruta(ruta)
        accion, descripcion = accion_por_peticion(metodo, ruta, query, cuerpo)
        ids = extraer_ids(ruta, query, cuerpo)
        detalle = {
            "query": limpiar_diccionario(query),
            "body": limpiar_diccionario(cuerpo),
            "content_type": content_type.split(";")[0],
        }
        if error_servidor:
            detalle["error"] = str(error_servidor)[:500]

        db = SessionLocal()
        try:
            detalle = completar_detalle_con_nombres(db, detalle, ids)
            registrar_log_sistema(
                db,
                metodo=metodo,
                ruta=ruta,
                modulo=modulo,
                accion=accion,
                descripcion=descripcion,
                resultado=resultado,
                estado_http=estado_http,
                id_usuario=ids.get("id_usuario"),
                id_empresa=ids.get("id_empresa"),
                id_producto=ids.get("id_producto"),
                id_pedido=ids.get("id_pedido"),
                ip=request.client.host if request.client else None,
                origen=request.headers.get("referer") or request.headers.get("origin"),
                detalle=detalle,
            )
        finally:
            db.close()
