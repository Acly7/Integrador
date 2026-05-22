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

@router.get("/")
def inicio():
    return {
        "mensaje": "Backend de Zyra funcionando correctamente"
    }


@router.get("/probar-db")
def probar_base_datos(db: Session = Depends(get_db)):
    resultado = db.execute(
        text("SELECT nombre_rol FROM roles ORDER BY id_rol")
    ).fetchall()

    roles = [fila[0] for fila in resultado]

    return {
        "mensaje": "Conexión exitosa con PostgreSQL",
        "roles": roles
    }

