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

@router.get("/categorias")
def listar_categorias(db: Session = Depends(get_db)):
    categorias = db.query(Categoria).filter(
        Categoria.estado == True
    ).order_by(Categoria.id_categoria).all()

    resultado = []

    for categoria in categorias:
        resultado.append({
            "id_categoria": categoria.id_categoria,
            "nombre_categoria": categoria.nombre_categoria,
            "descripcion": categoria.descripcion
        })

    return {
        "mensaje": "Lista de categorías",
        "total": len(resultado),
        "categorias": resultado
    }


@router.post("/categorias")
def crear_categoria(datos: CategoriaCrear, db: Session = Depends(get_db)):
    nombre_limpio = datos.nombre_categoria.strip()

    if not nombre_limpio:
        raise HTTPException(
            status_code=400,
            detail="El nombre de la categoría es obligatorio"
        )

    categoria_existente = db.query(Categoria).filter(
        Categoria.nombre_categoria.ilike(nombre_limpio)
    ).first()

    if categoria_existente:
        return {
            "mensaje": "La categoría ya existía",
            "id_categoria": categoria_existente.id_categoria,
            "nombre_categoria": categoria_existente.nombre_categoria
        }

    nueva_categoria = Categoria(
        nombre_categoria=nombre_limpio,
        descripcion=datos.descripcion,
        estado=True
    )

    db.add(nueva_categoria)
    db.commit()
    db.refresh(nueva_categoria)

    return {
        "mensaje": "Categoría creada correctamente",
        "id_categoria": nueva_categoria.id_categoria,
        "nombre_categoria": nueva_categoria.nombre_categoria
    }

