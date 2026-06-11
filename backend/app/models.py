from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, Boolean, DateTime, UniqueConstraint
from app.database import Base
from datetime import datetime


class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(Integer, primary_key=True, index=True)
    nombre_rol = Column(String(30), unique=True, nullable=False)


class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    id_rol = Column(Integer, ForeignKey("roles.id_rol"), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    telefono = Column(String(30))
    foto_url = Column(Text)
    acepto_terminos = Column(Boolean, default=False)
    fecha_aceptacion_terminos = Column(DateTime, nullable=True)
    estado = Column(String(20), default="ACTIVO")


class Empresa(Base):
    __tablename__ = "empresas"

    id_empresa = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), unique=True, nullable=False)
    nombre_empresa = Column(String(150), nullable=False)
    descripcion = Column(Text)
    nit = Column(String(50))
    direccion = Column(Text)
    ciudad = Column(String(100), default="La Paz")
    whatsapp = Column(String(30))
    instagram = Column(String(150))
    facebook = Column(String(150))
    logo_url = Column(Text)
    qr_pago_url = Column(Text)
    color_principal = Column(String(20), default="#8f174d")
    color_secundario = Column(String(20), default="#e879b4")
    color_acento = Column(String(20), default="#c02672")
    color_fondo = Column(String(20), default="#fff1f7")
    tema_tienda = Column(String(30), default="elegante")
    google_maps_url = Column(Text)
    estado_empresa = Column(String(20), default="PENDIENTE")

class Categoria(Base):
    __tablename__ = "categorias"

    id_categoria = Column(Integer, primary_key=True, index=True)
    nombre_categoria = Column(String(100), unique=True, nullable=False)
    descripcion = Column(Text)
    estado = Column(Boolean, default=True)


class Producto(Base):
    __tablename__ = "productos"

    id_producto = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresas.id_empresa"), nullable=False)
    id_categoria = Column(Integer, ForeignKey("categorias.id_categoria"), nullable=False)
    nombre_producto = Column(String(150), nullable=False)
    descripcion = Column(Text)
    marca = Column(String(100))
    genero = Column(String(30))
    precio = Column(Numeric(10, 2), nullable=False)
    estado_producto = Column(String(20), default="ACTIVO")


class ProductoVariante(Base):
    __tablename__ = "producto_variantes"

    id_variante = Column(Integer, primary_key=True, index=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False)
    color = Column(String(50), nullable=False)
    talla = Column(String(20), nullable=False)
    stock = Column(Integer, default=0)
    disponible = Column(Boolean, default=True)


class ProductoImagen(Base):
    __tablename__ = "producto_imagenes"

    id_imagen = Column(Integer, primary_key=True, index=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False)
    url_imagen = Column(Text, nullable=False)
    es_principal = Column(Boolean, default=False)

class Carrito(Base):
    __tablename__ = "carritos"

    id_carrito = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    estado_carrito = Column(String(20), default="ACTIVO")


class CarritoDetalle(Base):
    __tablename__ = "carrito_detalle"

    id_carrito_detalle = Column(Integer, primary_key=True, index=True)
    id_carrito = Column(Integer, ForeignKey("carritos.id_carrito"), nullable=False)
    id_variante = Column(Integer, ForeignKey("producto_variantes.id_variante"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

class Pedido(Base):
    __tablename__ = "pedidos"

    id_pedido = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    total = Column(Numeric(10, 2), default=0)
    estado_pedido = Column(String(30), default="PENDIENTE")


class PedidoDetalle(Base):
    __tablename__ = "pedido_detalle"

    id_pedido_detalle = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    id_variante = Column(Integer, ForeignKey("producto_variantes.id_variante"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)


class Pago(Base):
    __tablename__ = "pagos"

    id_pago = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False)
    metodo_pago = Column(String(50), default="QR")
    monto = Column(Numeric(10, 2), nullable=False)
    estado_pago = Column(String(30), default="PENDIENTE")
    comprobante_url = Column(Text)

class SoporteTicket(Base):
    __tablename__ = "soporte_tickets"

    id_ticket = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    asunto = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    estado_ticket = Column(String(30), default="ABIERTO")


class SoporteMensaje(Base):
    __tablename__ = "soporte_mensajes"

    id_mensaje = Column(Integer, primary_key=True, index=True)
    id_ticket = Column(Integer, ForeignKey("soporte_tickets.id_ticket"), nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    mensaje = Column(Text, nullable=False)


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id_notificacion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    titulo = Column(String(150), nullable=False)
    mensaje = Column(Text, nullable=False)
    leido = Column(Boolean, default=False)

class ProductoVista(Base):
    __tablename__ = "producto_vistas"

    id_vista = Column(Integer, primary_key=True, index=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True, index=True)
    origen = Column(String(80), default="detalle_producto")
    fecha_vista = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class TiendaVisita(Base):
    __tablename__ = "tienda_visitas"

    id_visita = Column(Integer, primary_key=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresas.id_empresa"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True, index=True)
    origen = Column(String(80), default="cliente")
    fecha_visita = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class BusquedaRegistro(Base):
    __tablename__ = "busquedas_registro"

    id_busqueda = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True, index=True)
    termino = Column(String(150), nullable=True, index=True)
    filtro_categoria = Column(String(100), nullable=True)
    filtro_color = Column(String(50), nullable=True)
    filtro_talla = Column(String(30), nullable=True)
    filtro_marca = Column(String(100), nullable=True)
    filtro_empresa = Column(String(150), nullable=True)
    precio_min = Column(Numeric(10, 2), nullable=True)
    precio_max = Column(Numeric(10, 2), nullable=True)
    total_resultados = Column(Integer, default=0)
    fecha_busqueda = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class ProductoCotizacion(Base):
    __tablename__ = "producto_cotizaciones"

    id_cotizacion = Column(Integer, primary_key=True, index=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False, index=True)
    id_variante = Column(Integer, ForeignKey("producto_variantes.id_variante"), nullable=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True, index=True)
    cantidad = Column(Integer, default=1)
    fecha_cotizacion = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class VentaRegistro(Base):
    __tablename__ = "ventas_registro"
    __table_args__ = (UniqueConstraint("id_pedido_detalle", name="uq_ventas_registro_pedido_detalle"),)

    id_venta = Column(Integer, primary_key=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=False, index=True)
    id_pedido_detalle = Column(Integer, ForeignKey("pedido_detalle.id_pedido_detalle"), nullable=False, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False, index=True)
    id_empresa = Column(Integer, ForeignKey("empresas.id_empresa"), nullable=False, index=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=False, index=True)
    id_variante = Column(Integer, ForeignKey("producto_variantes.id_variante"), nullable=True, index=True)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    estado_venta = Column(String(30), default="PAGADA")
    fecha_venta = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class BackupRegistro(Base):
    __tablename__ = "backup_registros"

    id_backup = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String(255), nullable=False)
    ruta_archivo = Column(Text, nullable=False)
    tipo_backup = Column(String(40), default="JSON")
    tamanio_bytes = Column(Integer, default=0)
    id_admin = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True)
    fecha_backup = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class LogSistema(Base):
    __tablename__ = "logs_sistema"

    id_log = Column(Integer, primary_key=True, index=True)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    metodo = Column(String(10), nullable=False)
    ruta = Column(String(255), nullable=False, index=True)
    modulo = Column(String(80), nullable=False, index=True)
    accion = Column(String(150), nullable=False, index=True)
    descripcion = Column(Text)
    resultado = Column(String(30), default="OK", index=True)
    estado_http = Column(Integer, nullable=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=True, index=True)
    id_empresa = Column(Integer, ForeignKey("empresas.id_empresa"), nullable=True, index=True)
    id_producto = Column(Integer, ForeignKey("productos.id_producto"), nullable=True, index=True)
    id_pedido = Column(Integer, ForeignKey("pedidos.id_pedido"), nullable=True, index=True)
    ip = Column(String(80), nullable=True)
    origen = Column(String(120), nullable=True)
    detalle = Column(Text)
