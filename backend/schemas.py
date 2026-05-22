from pydantic import BaseModel, Field


class RegistroCliente(BaseModel):
    nombre: str
    apellido: str | None = None
    email: str
    password: str
    telefono: str | None = None


class RegistroEmpresa(BaseModel):
    nombre: str
    apellido: str | None = None
    email: str
    password: str
    telefono: str | None = None

    nombre_empresa: str
    descripcion: str | None = None
    nit: str | None = None
    direccion: str | None = None
    ciudad: str | None = "La Paz"
    whatsapp: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    logo_url: str | None = None


class LoginUsuario(BaseModel):
    email: str
    password: str

class CambioEstadoEmpresa(BaseModel):
    id_admin: int
    estado_empresa: str

class ProductoVarianteCrear(BaseModel):
    color: str
    talla: str
    stock: int = 0
    disponible: bool = True


class ProductoCrear(BaseModel):
    id_empresa: int
    id_categoria: int
    nombre_producto: str
    descripcion: str | None = None
    marca: str | None = None
    genero: str | None = None
    precio: float
    imagen_principal: str | None = None
    variantes: list[ProductoVarianteCrear] = Field(default_factory=list)

class ProductoActualizar(BaseModel):
    id_empresa: int
    id_categoria: int | None = None
    nombre_producto: str | None = None
    descripcion: str | None = None
    marca: str | None = None
    genero: str | None = None
    precio: float | None = None
    imagen_principal: str | None = None


class CambioEstadoProducto(BaseModel):
    id_empresa: int
    estado_producto: str


class VarianteAgregar(BaseModel):
    id_empresa: int
    color: str
    talla: str
    stock: int = 0
    disponible: bool = True


class VarianteActualizar(BaseModel):
    id_empresa: int
    color: str | None = None
    talla: str | None = None
    stock: int | None = None
    disponible: bool | None = None

class AgregarCarrito(BaseModel):
    id_usuario: int
    id_variante: int
    cantidad: int = 1


class ActualizarCantidadCarrito(BaseModel):
    id_usuario: int
    cantidad: int

class CrearPedido(BaseModel):
    id_usuario: int


class RegistrarPago(BaseModel):
    id_usuario: int
    id_pedido: int
    metodo_pago: str = "QR"
    monto: float
    comprobante_url: str | None = None

class CambioEstadoPagoEmpresa(BaseModel):
    id_empresa: int
    estado_pago: str


class CambioEstadoPedidoEmpresa(BaseModel):
    id_empresa: int
    estado_pedido: str 

class CrearTicketSoporte(BaseModel):
    id_usuario: int
    asunto: str
    descripcion: str


class CrearMensajeSoporte(BaseModel):
    id_usuario: int
    mensaje: str


class CambiarEstadoTicket(BaseModel):
    id_admin: int
    estado_ticket: str

class CategoriaCrear(BaseModel):
    nombre_categoria: str
    descripcion: str | None = None

class EmpresaCuentaActualizar(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str | None = None
    email: str
    telefono: str | None = None
    nombre_empresa: str
    descripcion: str | None = None
    nit: str | None = None
    direccion: str | None = None
    ciudad: str | None = "La Paz"
    whatsapp: str | None = None
    instagram: str | None = None
    facebook: str | None = None


class EmpresaPasswordCambiar(BaseModel):
    id_usuario: int
    password_actual: str
    password_nueva: str
    confirmar_password: str