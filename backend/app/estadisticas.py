from datetime import datetime
from sqlalchemy.orm import Session

from app.models import (
    Producto,
    ProductoVariante,
    Pedido,
    PedidoDetalle,
    Pago,
    ProductoVista,
    TiendaVisita,
    BusquedaRegistro,
    ProductoCotizacion,
    VentaRegistro,
)


def _safe_str(valor, limite=250):
    texto = str(valor or "").strip()
    return texto[:limite] if texto else None


def registrar_vista_producto(
    db: Session,
    id_producto: int,
    id_usuario: int | None = None,
    origen: str | None = "detalle_producto",
):
    if not id_producto:
        return None

    registro = ProductoVista(
        id_producto=id_producto,
        id_usuario=id_usuario,
        origen=_safe_str(origen, 80),
        fecha_vista=datetime.utcnow(),
    )
    db.add(registro)
    return registro


def registrar_visita_tienda(
    db: Session,
    id_empresa: int,
    id_usuario: int | None = None,
    origen: str | None = "cliente",
):
    if not id_empresa:
        return None

    registro = TiendaVisita(
        id_empresa=id_empresa,
        id_usuario=id_usuario,
        origen=_safe_str(origen, 80),
        fecha_visita=datetime.utcnow(),
    )
    db.add(registro)
    return registro


def registrar_busqueda(
    db: Session,
    termino: str | None = None,
    filtros: dict | None = None,
    id_usuario: int | None = None,
    total_resultados: int = 0,
):
    filtros = filtros or {}
    tiene_termino = bool(_safe_str(termino))
    tiene_filtros = any(valor not in [None, "", []] for valor in filtros.values())

    if not tiene_termino and not tiene_filtros:
        return None

    registro = BusquedaRegistro(
        id_usuario=id_usuario,
        termino=_safe_str(termino, 150),
        filtro_categoria=_safe_str(filtros.get("categoria"), 100),
        filtro_color=_safe_str(filtros.get("color"), 50),
        filtro_talla=_safe_str(filtros.get("talla"), 30),
        filtro_marca=_safe_str(filtros.get("marca"), 100),
        filtro_empresa=_safe_str(filtros.get("empresa"), 150),
        precio_min=filtros.get("precio_min"),
        precio_max=filtros.get("precio_max"),
        total_resultados=int(total_resultados or 0),
        fecha_busqueda=datetime.utcnow(),
    )
    db.add(registro)
    return registro


def registrar_cotizacion_producto(
    db: Session,
    id_producto: int,
    id_variante: int | None = None,
    id_usuario: int | None = None,
    cantidad: int = 1,
):
    if not id_producto:
        return None

    registro = ProductoCotizacion(
        id_producto=id_producto,
        id_variante=id_variante,
        id_usuario=id_usuario,
        cantidad=max(int(cantidad or 1), 1),
        fecha_cotizacion=datetime.utcnow(),
    )
    db.add(registro)
    return registro


def registrar_ventas_de_pedido(db: Session, pedido: Pedido | None):
    """Registra una venta por cada detalle de un pedido pagado.

    Usa id_pedido_detalle como llave lógica para evitar duplicar ventas si una
    empresa vuelve a guardar el estado PAGADO.
    """
    if not pedido:
        return []

    pago_pagado = (
        db.query(Pago)
        .filter(Pago.id_pedido == pedido.id_pedido, Pago.estado_pago == "PAGADO")
        .first()
    )

    if not pago_pagado:
        return []

    detalles = db.query(PedidoDetalle).filter(PedidoDetalle.id_pedido == pedido.id_pedido).all()
    ventas_creadas = []

    for detalle in detalles:
        venta_existente = (
            db.query(VentaRegistro)
            .filter(VentaRegistro.id_pedido_detalle == detalle.id_pedido_detalle)
            .first()
        )

        if venta_existente:
            continue

        variante = (
            db.query(ProductoVariante)
            .filter(ProductoVariante.id_variante == detalle.id_variante)
            .first()
        )

        if not variante:
            continue

        producto = db.query(Producto).filter(Producto.id_producto == variante.id_producto).first()

        if not producto:
            continue

        venta = VentaRegistro(
            id_pedido=pedido.id_pedido,
            id_pedido_detalle=detalle.id_pedido_detalle,
            id_usuario=pedido.id_usuario,
            id_empresa=producto.id_empresa,
            id_producto=producto.id_producto,
            id_variante=variante.id_variante,
            cantidad=detalle.cantidad,
            precio_unitario=detalle.precio_unitario,
            subtotal=detalle.subtotal,
            estado_venta="PAGADA",
            fecha_venta=datetime.utcnow(),
        )
        db.add(venta)
        ventas_creadas.append(venta)

    return ventas_creadas


def sincronizar_ventas_pagadas(db: Session):
    pedidos_pagados = (
        db.query(Pedido)
        .join(Pago, Pago.id_pedido == Pedido.id_pedido)
        .filter(Pago.estado_pago == "PAGADO")
        .all()
    )

    total_creadas = 0

    for pedido in pedidos_pagados:
        total_creadas += len(registrar_ventas_de_pedido(db, pedido))

    if total_creadas:
        db.commit()

    return total_creadas
