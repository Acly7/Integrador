from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
import os
import shutil
from uuid import uuid4

from app.database import get_db
from app.models import Usuario, Rol, Empresa, Categoria, Producto, ProductoVariante, ProductoImagen, Carrito, CarritoDetalle, Pedido, PedidoDetalle, Pago, SoporteTicket, SoporteMensaje, Notificacion
from app.schemas import RegistroCliente, RegistroEmpresa, LoginUsuario, CambioEstadoEmpresa, ProductoCrear, ProductoActualizar, CambioEstadoProducto, VarianteAgregar, VarianteActualizar, AgregarCarrito, ActualizarCantidadCarrito, CrearPedido, RegistrarPago, CambioEstadoPagoEmpresa, CambioEstadoPedidoEmpresa, CrearTicketSoporte, CrearMensajeSoporte, CambiarEstadoTicket, CategoriaCrear
from app.seguridad import crear_hash_password, verificar_password

router = APIRouter()

def verificar_empresa_aprobada(db: Session, id_empresa: int):

    empresa = db.query(Empresa).filter(
        Empresa.id_empresa == id_empresa
    ).first()

    if not empresa:
        raise HTTPException(
            status_code=404,
            detail="Empresa no encontrada"
        )

    if empresa.estado_empresa != "APROBADA":
        raise HTTPException(
            status_code=403,
            detail="La empresa debe estar APROBADA para realizar esta acción"
        )

    return empresa

def pedido_tiene_productos_de_empresa(
    db: Session,
    id_pedido: int,
    id_empresa: int
):
    detalle = db.query(PedidoDetalle).join(
        ProductoVariante,
        PedidoDetalle.id_variante == ProductoVariante.id_variante
    ).join(
        Producto,
        ProductoVariante.id_producto == Producto.id_producto
    ).filter(
        PedidoDetalle.id_pedido == id_pedido,
        Producto.id_empresa == id_empresa
    ).first()

    return detalle is not None

@router.get("/empresa/{id_empresa}/pedidos")
def listar_pedidos_empresa(
    id_empresa: int,
    db: Session = Depends(get_db)
):
    empresa = verificar_empresa_aprobada(db, id_empresa)

    detalles_empresa = db.query(PedidoDetalle).join(
        ProductoVariante,
        PedidoDetalle.id_variante == ProductoVariante.id_variante
    ).join(
        Producto,
        ProductoVariante.id_producto == Producto.id_producto
    ).filter(
        Producto.id_empresa == id_empresa
    ).all()

    ids_pedidos = sorted(
        list({detalle.id_pedido for detalle in detalles_empresa}),
        reverse=True
    )

    resultado = []

    for id_pedido in ids_pedidos:
        pedido = db.query(Pedido).filter(
            Pedido.id_pedido == id_pedido
        ).first()

        if not pedido:
            continue

        cliente = db.query(Usuario).filter(
            Usuario.id_usuario == pedido.id_usuario
        ).first()

        pago = db.query(Pago).filter(
            Pago.id_pedido == pedido.id_pedido
        ).first()

        detalles_del_pedido = db.query(PedidoDetalle, ProductoVariante, Producto).join(
            ProductoVariante,
            PedidoDetalle.id_variante == ProductoVariante.id_variante
        ).join(
            Producto,
            ProductoVariante.id_producto == Producto.id_producto
        ).filter(
            PedidoDetalle.id_pedido == pedido.id_pedido,
            Producto.id_empresa == id_empresa
        ).all()

        items = []
        total_empresa = 0

        for detalle, variante, producto in detalles_del_pedido:
            subtotal = float(detalle.subtotal)
            total_empresa += subtotal

            items.append({
                "id_pedido_detalle": detalle.id_pedido_detalle,
                "id_producto": producto.id_producto,
                "nombre_producto": producto.nombre_producto,
                "color": variante.color,
                "talla": variante.talla,
                "cantidad": detalle.cantidad,
                "precio_unitario": float(detalle.precio_unitario),
                "subtotal": subtotal
            })

        resultado.append({
            "id_pedido": pedido.id_pedido,
            "estado_pedido": pedido.estado_pedido,
            "total_general_pedido": float(pedido.total),
            "total_para_esta_empresa": total_empresa,
            "cliente": {
                "id_usuario": cliente.id_usuario if cliente else None,
                "nombre": cliente.nombre if cliente else None,
                "apellido": cliente.apellido if cliente else None,
                "email": cliente.email if cliente else None,
                "telefono": cliente.telefono if cliente else None
            },
            "pago": {
                "id_pago": pago.id_pago,
                "metodo_pago": pago.metodo_pago,
                "monto": float(pago.monto),
                "estado_pago": pago.estado_pago,
                "comprobante_url": pago.comprobante_url
            } if pago else None,
            "items": items
        })

    return {
        "mensaje": "Pedidos de la empresa",
        "empresa": {
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa
        },
        "total_pedidos": len(resultado),
        "pedidos": resultado
    }


@router.get("/empresa/{id_empresa}/pedidos/{id_pedido}")
def ver_detalle_pedido_empresa(
    id_empresa: int,
    id_pedido: int,
    db: Session = Depends(get_db)
):
    empresa = verificar_empresa_aprobada(db, id_empresa)

    pedido = db.query(Pedido).filter(
        Pedido.id_pedido == id_pedido
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    if not pedido_tiene_productos_de_empresa(db, id_pedido, id_empresa):
        raise HTTPException(
            status_code=403,
            detail="Este pedido no contiene productos de esta empresa"
        )

    cliente = db.query(Usuario).filter(
        Usuario.id_usuario == pedido.id_usuario
    ).first()

    pago = db.query(Pago).filter(
        Pago.id_pedido == pedido.id_pedido
    ).first()

    detalles = db.query(PedidoDetalle, ProductoVariante, Producto).join(
        ProductoVariante,
        PedidoDetalle.id_variante == ProductoVariante.id_variante
    ).join(
        Producto,
        ProductoVariante.id_producto == Producto.id_producto
    ).filter(
        PedidoDetalle.id_pedido == id_pedido,
        Producto.id_empresa == id_empresa
    ).all()

    items = []
    total_empresa = 0

    for detalle, variante, producto in detalles:
        imagen = db.query(ProductoImagen).filter(
            ProductoImagen.id_producto == producto.id_producto,
            ProductoImagen.es_principal == True
        ).first()

        subtotal = float(detalle.subtotal)
        total_empresa += subtotal

        items.append({
            "id_pedido_detalle": detalle.id_pedido_detalle,
            "id_producto": producto.id_producto,
            "nombre_producto": producto.nombre_producto,
            "imagen_principal": imagen.url_imagen if imagen else None,
            "color": variante.color,
            "talla": variante.talla,
            "cantidad": detalle.cantidad,
            "precio_unitario": float(detalle.precio_unitario),
            "subtotal": subtotal
        })

    return {
        "mensaje": "Detalle del pedido para la empresa",
        "empresa": {
            "id_empresa": empresa.id_empresa,
            "nombre_empresa": empresa.nombre_empresa
        },
        "pedido": {
            "id_pedido": pedido.id_pedido,
            "estado_pedido": pedido.estado_pedido,
            "total_general_pedido": float(pedido.total),
            "total_para_esta_empresa": total_empresa,
            "cliente": {
                "id_usuario": cliente.id_usuario if cliente else None,
                "nombre": cliente.nombre if cliente else None,
                "apellido": cliente.apellido if cliente else None,
                "email": cliente.email if cliente else None,
                "telefono": cliente.telefono if cliente else None
            },
            "pago": {
                "id_pago": pago.id_pago,
                "metodo_pago": pago.metodo_pago,
                "monto": float(pago.monto),
                "estado_pago": pago.estado_pago,
                "comprobante_url": pago.comprobante_url
            } if pago else None,
            "items": items
        }
    }


@router.put("/empresa/pagos/{id_pago}/estado")
def cambiar_estado_pago_empresa(
    id_pago: int,
    datos: CambioEstadoPagoEmpresa,
    db: Session = Depends(get_db)
):
    verificar_empresa_aprobada(db, datos.id_empresa)

    pago = db.query(Pago).filter(
        Pago.id_pago == id_pago
    ).first()

    if not pago:
        raise HTTPException(
            status_code=404,
            detail="Pago no encontrado"
        )

    pedido = db.query(Pedido).filter(
        Pedido.id_pedido == pago.id_pedido
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    if not pedido_tiene_productos_de_empresa(db, pedido.id_pedido, datos.id_empresa):
        raise HTTPException(
            status_code=403,
            detail="Este pago no pertenece a un pedido con productos de esta empresa"
        )

    estados_permitidos = ["EN_REVISION", "PAGADO", "RECHAZADO"]

    if datos.estado_pago not in estados_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Estado no válido. Usa: EN_REVISION, PAGADO o RECHAZADO"
        )

    pago.estado_pago = datos.estado_pago

    if datos.estado_pago == "PAGADO":
        pedido.estado_pedido = "PAGADO"

    if datos.estado_pago == "RECHAZADO":
        pedido.estado_pedido = "CONFIRMADO"

    db.commit()
    db.refresh(pago)
    db.refresh(pedido)

    return {
        "mensaje": "Estado del pago actualizado correctamente",
        "id_pago": pago.id_pago,
        "id_pedido": pedido.id_pedido,
        "nuevo_estado_pago": pago.estado_pago,
        "estado_pedido": pedido.estado_pedido
    }


@router.put("/empresa/pedidos/{id_pedido}/estado")
def cambiar_estado_pedido_empresa(
    id_pedido: int,
    datos: CambioEstadoPedidoEmpresa,
    db: Session = Depends(get_db)
):
    verificar_empresa_aprobada(db, datos.id_empresa)

    pedido = db.query(Pedido).filter(
        Pedido.id_pedido == id_pedido
    ).first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="Pedido no encontrado"
        )

    if not pedido_tiene_productos_de_empresa(db, id_pedido, datos.id_empresa):
        raise HTTPException(
            status_code=403,
            detail="Este pedido no contiene productos de esta empresa"
        )

    estados_permitidos = ["PENDIENTE", "CONFIRMADO", "PAGADO", "CANCELADO", "ENTREGADO"]

    if datos.estado_pedido not in estados_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Estado no válido. Usa: PENDIENTE, CONFIRMADO, PAGADO, CANCELADO o ENTREGADO"
        )

    pago = db.query(Pago).filter(
        Pago.id_pedido == id_pedido
    ).first()

    if datos.estado_pedido == "ENTREGADO":
        if not pago or pago.estado_pago != "PAGADO":
            raise HTTPException(
                status_code=400,
                detail="No puedes marcar como ENTREGADO un pedido que no tiene pago aprobado"
            )

    pedido.estado_pedido = datos.estado_pedido

    db.commit()
    db.refresh(pedido)

    return {
        "mensaje": "Estado del pedido actualizado correctamente",
        "id_pedido": pedido.id_pedido,
        "nuevo_estado_pedido": pedido.estado_pedido
    }


