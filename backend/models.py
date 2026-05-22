from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, Boolean
from database import Base


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