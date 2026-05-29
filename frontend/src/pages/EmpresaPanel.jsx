import { useEffect, useMemo, useRef, useState } from "react";
import ProductoCard from "../components/productos/ProductoCard";
import ProductoDetalle from "../components/productos/ProductoDetalle";
import ProductoForm from "../components/productos/ProductoForm";
import { EyeIcon } from "../components/auth/Icons";
import {
  obtenerColorHex,
  cambiarEstadoProductoApi,
  crearCategoria,
  crearProductoEmpresa,
  editarProductoEmpresa,
  obtenerCategorias,
  obtenerProductosEmpresa,
  subirImagenProducto,
  agregarVarianteProductoApi,
  editarVarianteProductoApi,
  cambiarEstadoVarianteApi,
  obtenerPedidosEmpresa,
  cambiarEstadoPagoEmpresaApi,
  cambiarEstadoPedidoEmpresaApi,
  obtenerUrlImagen,
  actualizarCuentaEmpresaApi,
  subirLogoEmpresaApi,
  cambiarPasswordEmpresaApi,
  obtenerCuentaEmpresaApi,
  subirQrPagoEmpresaApi,
  crearTicketSoporteApi,
  obtenerTicketsUsuarioApi,
  obtenerMensajesTicketApi,
  responderTicketSoporteApi,
  obtenerNotificacionesUsuarioApi,
  marcarNotificacionUsuarioLeidaApi
} from "../services/api";


function IconoPanel({ tipo = "punto" }) {
  const iconos = {
    menu: (<><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>),
    tienda: (<><path d="M4 10h16" /><path d="M5 10v10h14V10" /><path d="M8 10V6h8v4" /><path d="M9 20v-5h6v5" /></>),
    producto: (<><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="M3.3 7 12 12l8.7-5" /><path d="M12 22V12" /></>),
    agregar: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
    pedidos: (<><path d="M7 3h10l2 4v14H5V7z" /><path d="M7 7h10" /><path d="M8 12h8" /><path d="M8 16h6" /></>),
    pagos: (<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></>),
    resumen: (<><path d="M4 19V5" /><path d="M8 19v-7" /><path d="M12 19V8" /><path d="M16 19v-4" /><path d="M20 19V3" /></>),
    cuenta: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.7-4 5-6 8-6s6.3 2 8 6" /></>),
    soporte: (<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M8 9h8" /><path d="M8 13h6" /></>),
    campana: (<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>)
  };

  return (
    <svg className="empresa-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconos[tipo] || <circle cx="12" cy="12" r="4" />}
    </svg>
  );
}

const estadoInicialNuevoProducto = {
  id_categoria: "",
  nombre_producto: "",
  descripcion: "",
  marca: "",
  genero: "Unisex",
  precio: "",
  color: "",
  talla: "",
  stock: ""
};

const estadoInicialEditarProducto = {
  id_categoria: "",
  nombre_producto: "",
  descripcion: "",
  marca: "",
  genero: "Unisex",
  precio: ""
};


const COLORES_PREDETERMINADOS_EMPRESA = [
  "Negro", "Blanco", "Rojo", "Azul", "Verde", "Amarillo", "Rosado", "Morado",
  "Café", "Beige", "Gris", "Celeste", "Vino", "Marrón", "Naranja"
];

const TALLAS_ADULTO_EMPRESA = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TALLAS_NINOS_EMPRESA = ["2", "4", "6", "8", "10", "12", "14", "16"];
const VALOR_OTRO_EMPRESA = "__OTRO__";

const obtenerTallasEmpresa = (genero = "") => {
  const texto = String(genero || "").toLowerCase();
  if (texto.includes("niñ")) return TALLAS_NINOS_EMPRESA;
  return TALLAS_ADULTO_EMPRESA;
};

const obtenerValorSelectEmpresa = (valor, opciones) => {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  if (texto === VALOR_OTRO_EMPRESA) return VALOR_OTRO_EMPRESA;
  const encontrada = opciones.find((opcion) => opcion.toLowerCase() === texto.toLowerCase());
  return encontrada || VALOR_OTRO_EMPRESA;
};

const mostrarInputOtroEmpresa = (valor, opciones) => {
  const texto = String(valor || "").trim();
  if (!texto) return false;
  if (texto === VALOR_OTRO_EMPRESA) return true;
  return !opciones.some((opcion) => opcion.toLowerCase() === texto.toLowerCase());
};

const limpiarValorSeleccionableEmpresa = (valor) => {
  const texto = String(valor || "").trim();
  return texto === VALOR_OTRO_EMPRESA ? "" : texto;
};

const TEMAS_TIENDA = [
  { id: "elegante", nombre: "Elegante", descripcion: "Encabezados sobrios y detalles finos." },
  { id: "minimalista", nombre: "Minimalista", descripcion: "Diseño limpio, claro y con pocos adornos." },
  { id: "boutique", nombre: "Boutique", descripcion: "Estilo delicado para marcas de moda exclusiva." },
  { id: "urbano", nombre: "Urbano", descripcion: "Contrastes fuertes y apariencia moderna." },
  { id: "juvenil", nombre: "Juvenil", descripcion: "Visual alegre, dinámico y cercano." }
];

const COLOR_TIENDA_DEFAULT = {
  color_principal: "#8f174d",
  color_secundario: "#e879b4",
  color_acento: "#c02672",
  color_fondo: "#fff1f7",
  tema_tienda: "elegante"
};

const obtenerEstiloTienda = (empresa = {}) => ({
  "--tienda-principal": empresa.color_principal || COLOR_TIENDA_DEFAULT.color_principal,
  "--tienda-secundario": empresa.color_secundario || COLOR_TIENDA_DEFAULT.color_secundario,
  "--tienda-acento": empresa.color_acento || COLOR_TIENDA_DEFAULT.color_acento,
  "--tienda-fondo": empresa.color_fondo || COLOR_TIENDA_DEFAULT.color_fondo
});

const obtenerTemaNombre = (tema) =>
  TEMAS_TIENDA.find((item) => item.id === tema)?.nombre || "Elegante";

export default function EmpresaPanel({ usuario, onVolver, onCerrarSesion }) {
  const [seccionEmpresa, setSeccionEmpresa] = useState("vista");
  const [menuEmpresaContraido, setMenuEmpresaContraido] = useState(false);
  const [mostrarNotificacionesEmpresa, setMostrarNotificacionesEmpresa] = useState(false);
  const [notificacionesEmpresaLeidas, setNotificacionesEmpresaLeidas] = useState([]);
  const [notificacionesEmpresaRecientes, setNotificacionesEmpresaRecientes] = useState([]);
  const [notificacionesSistemaEmpresa, setNotificacionesSistemaEmpresa] = useState([]);
  const [productosEmpresa, setProductosEmpresa] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(false);
  const [errorEmpresa, setErrorEmpresa] = useState("");
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const resolverConfirmacionRef = useRef(null);
  const [toastEmpresa, setToastEmpresa] = useState(null);

  const mostrarAvisoEmpresa = (texto, tipo = "ok") => {
    setToastEmpresa({ texto, tipo });
    window.setTimeout(() => setToastEmpresa(null), 3200);
  };

  const pedirConfirmacion = (opciones) => {
    return new Promise((resolve) => {
      resolverConfirmacionRef.current = resolve;
      setModalConfirmacion(opciones);
    });
  };

  const cerrarConfirmacion = (respuesta) => {
    if (resolverConfirmacionRef.current) {
      resolverConfirmacionRef.current(respuesta);
    }
    resolverConfirmacionRef.current = null;
    setModalConfirmacion(null);
  };

  const [editandoCuenta, setEditandoCuenta] = useState(false);
const [mensajeCuenta, setMensajeCuenta] = useState("");
const [tipoMensajeCuenta, setTipoMensajeCuenta] = useState("");
const [logoCuenta, setLogoCuenta] = useState(null);

const [cuentaForm, setCuentaForm] = useState({
  nombre: usuario.nombre || "",
  apellido: usuario.apellido || "",
  email: usuario.email || "",
  telefono: usuario.telefono || "",
  nombre_empresa: usuario.nombre_empresa || "",
  descripcion: usuario.descripcion || "",
  nit: usuario.nit || "",
  direccion: usuario.direccion || "",
  ciudad: usuario.ciudad || "La Paz",
  whatsapp: usuario.whatsapp || "",
  instagram: usuario.instagram || "",
  facebook: usuario.facebook || "",
  color_principal: usuario.color_principal || COLOR_TIENDA_DEFAULT.color_principal,
  color_secundario: usuario.color_secundario || COLOR_TIENDA_DEFAULT.color_secundario,
  color_acento: usuario.color_acento || COLOR_TIENDA_DEFAULT.color_acento,
  color_fondo: usuario.color_fondo || COLOR_TIENDA_DEFAULT.color_fondo,
  tema_tienda: usuario.tema_tienda || COLOR_TIENDA_DEFAULT.tema_tienda,
  google_maps_url: usuario.google_maps_url || ""
});

const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);
const [passwordCuenta, setPasswordCuenta] = useState({
  password_actual: "",
  password_nueva: "",
  confirmar_password: ""
});

const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);
const [mostrarConfirmarPassword, setMostrarConfirmarPassword] = useState(false);

  const [pedidosEmpresa, setPedidosEmpresa] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [errorPedidos, setErrorPedidos] = useState("");

  const [pagosEmpresa, setPagosEmpresa] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [errorPagos, setErrorPagos] = useState("");
  const [filtroPagos, setFiltroPagos] = useState("TODOS");
  const [cuentaEmpresaActual, setCuentaEmpresaActual] = useState(usuario);
  const [qrPagoArchivo, setQrPagoArchivo] = useState(null);
  const [mensajeQrPago, setMensajeQrPago] = useState("");
  const [tipoMensajeQrPago, setTipoMensajeQrPago] = useState("");
  const [comprobanteViendo, setComprobanteViendo] = useState(null);

  const [ticketsSoporte, setTicketsSoporte] = useState([]);
  const [ticketSoporteActivo, setTicketSoporteActivo] = useState(null);
  const [mensajesSoporte, setMensajesSoporte] = useState([]);
  const [nuevoTicketSoporte, setNuevoTicketSoporte] = useState({ asunto: "", descripcion: "" });
  const [respuestaSoporte, setRespuestaSoporte] = useState("");
  const [mensajeSoporte, setMensajeSoporte] = useState("");
  const [tipoMensajeSoporte, setTipoMensajeSoporte] = useState("");
  const [cargandoSoporte, setCargandoSoporte] = useState(false);

  const [nuevoProducto, setNuevoProducto] = useState(estadoInicialNuevoProducto);
  const [imagenProducto, setImagenProducto] = useState(null);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [mensajeProducto, setMensajeProducto] = useState("");
  const [tipoMensajeProducto, setTipoMensajeProducto] = useState("");

  const [productoViendo, setProductoViendo] = useState(null);
  const [volverDetalleA, setVolverDetalleA] = useState("productos");
  const [productoEditando, setProductoEditando] = useState(null);
  const [productoEditar, setProductoEditar] = useState(estadoInicialEditarProducto);
  const [imagenEditando, setImagenEditando] = useState(null);
  const [mensajeEdicion, setMensajeEdicion] = useState("");
  const [tipoMensajeEdicion, setTipoMensajeEdicion] = useState("");
  const [variantesEditando, setVariantesEditando] = useState([]);
  const [mensajeVariante, setMensajeVariante] = useState("");
  const [tipoMensajeVariante, setTipoMensajeVariante] = useState("");

  const [nuevaVariante, setNuevaVariante] = useState({
  color: "",
  talla: "",
  stock: ""
});

  const agruparProductosPorCategoria = (listaProductos) => {
    return listaProductos.reduce((grupos, producto) => {
      const categoria = producto.categoria || "Sin categoría";

      if (!grupos[categoria]) {
        grupos[categoria] = [];
      }

      grupos[categoria].push(producto);

      return grupos;
    }, {});
  };

  const productosVisiblesEmpresa = useMemo(() => {
    return productosEmpresa.filter(
      (producto) => producto.estado_producto === "ACTIVO"
    );
  }, [productosEmpresa]);

  const productosPorCategoria = useMemo(() => {
    return agruparProductosPorCategoria(productosEmpresa);
  }, [productosEmpresa]);

  const productosVisiblesPorCategoria = useMemo(() => {
    return agruparProductosPorCategoria(productosVisiblesEmpresa);
  }, [productosVisiblesEmpresa]);

  const cargarProductosEmpresa = async () => {
    if (!usuario?.id_empresa) return;

    setCargandoEmpresa(true);
    setErrorEmpresa("");

    try {
      const productos = await obtenerProductosEmpresa(usuario.id_empresa);
      setProductosEmpresa(productos);
    } catch (error) {
      setErrorEmpresa(error.message || "No se pudieron cargar los productos.");
    }

    setCargandoEmpresa(false);
  };

  const cargarCategorias = async () => {
    try {
      const categoriasObtenidas = await obtenerCategorias();
      setCategorias(categoriasObtenidas);
    } catch (error) {
      console.log(error.message || "No se pudieron cargar categorías");
    }
  };

  const sincronizarCuentaConUsuario = () => {
  const datosCuenta = cuentaEmpresaActual || usuario;
  setCuentaForm({
    nombre: datosCuenta.nombre || "",
    apellido: datosCuenta.apellido || "",
    email: datosCuenta.email || "",
    telefono: datosCuenta.telefono || "",
    nombre_empresa: datosCuenta.nombre_empresa || "",
    descripcion: datosCuenta.descripcion || "",
    nit: datosCuenta.nit || "",
    direccion: datosCuenta.direccion || "",
    ciudad: datosCuenta.ciudad || "La Paz",
    whatsapp: datosCuenta.whatsapp || "",
    instagram: datosCuenta.instagram || "",
    facebook: datosCuenta.facebook || "",
    color_principal: datosCuenta.color_principal || COLOR_TIENDA_DEFAULT.color_principal,
    color_secundario: datosCuenta.color_secundario || COLOR_TIENDA_DEFAULT.color_secundario,
    color_acento: datosCuenta.color_acento || COLOR_TIENDA_DEFAULT.color_acento,
    color_fondo: datosCuenta.color_fondo || COLOR_TIENDA_DEFAULT.color_fondo,
    tema_tienda: datosCuenta.tema_tienda || COLOR_TIENDA_DEFAULT.tema_tienda,
    google_maps_url: datosCuenta.google_maps_url || ""
  });

  setLogoCuenta(null);
  setMensajeCuenta("");
  setTipoMensajeCuenta("");
};

const esEmailValidoEmpresa = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
const esCorreoPermitidoEmpresa = (email) => ["gmail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "icloud.com"].includes(String(email || "").trim().toLowerCase().split("@").pop());
const telefonoValidoOpcional = (telefono) => !telefono || /^\d{7,8}$/.test(telefono);
const whatsappValidoObligatorio = (whatsapp) => /^\d{8}$/.test(whatsapp || "");

const cambiarCuentaForm = (e) => {
  const { name, value } = e.target;

  if (name === "telefono") {
    setCuentaForm({
      ...cuentaForm,
      [name]: value.replace(/\D/g, "").slice(0, 8)
    });
    return;
  }

  if (name === "whatsapp") {
    setCuentaForm({
      ...cuentaForm,
      [name]: value.replace(/\D/g, "").slice(0, 8)
    });
    return;
  }

  setCuentaForm({
    ...cuentaForm,
    [name]: value
  });
};

const guardarCuentaEmpresa = async (e) => {
  e.preventDefault();

  setMensajeCuenta("");
  setTipoMensajeCuenta("");

  if (!cuentaForm.nombre.trim()) {
    setMensajeCuenta("El nombre del responsable es obligatorio.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (!cuentaForm.email.trim()) {
    setMensajeCuenta("El correo es obligatorio.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (!cuentaForm.nombre_empresa.trim()) {
    setMensajeCuenta("El nombre de la empresa es obligatorio.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (!esEmailValidoEmpresa(cuentaForm.email) || !esCorreoPermitidoEmpresa(cuentaForm.email)) {
    setMensajeCuenta("Usa un correo válido de Gmail, Hotmail, Outlook, Live, Yahoo o iCloud.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (!telefonoValidoOpcional(cuentaForm.telefono)) {
    setMensajeCuenta("El teléfono debe tener entre 7 y 8 números o puedes dejarlo vacío.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (!whatsappValidoObligatorio(cuentaForm.whatsapp)) {
    setMensajeCuenta("El WhatsApp es obligatorio y debe tener exactamente 8 números.");
    setTipoMensajeCuenta("error");
    return;
  }

  try {
    const datosActualizados = await actualizarCuentaEmpresaApi(usuario.id_empresa, {
      id_usuario: usuario.id_usuario,
      nombre: cuentaForm.nombre.trim(),
      apellido: cuentaForm.apellido.trim() || null,
      email: cuentaForm.email.trim(),
      telefono: cuentaForm.telefono || null,
      nombre_empresa: cuentaForm.nombre_empresa.trim(),
      descripcion: cuentaForm.descripcion.trim() || null,
      nit: cuentaForm.nit || null,
      direccion: cuentaForm.direccion.trim() || null,
      ciudad: cuentaForm.ciudad.trim() || "La Paz",
      whatsapp: cuentaForm.whatsapp || null,
      instagram: cuentaForm.instagram.trim() || null,
      facebook: cuentaForm.facebook.trim() || null,
      color_principal: cuentaForm.color_principal || COLOR_TIENDA_DEFAULT.color_principal,
      color_secundario: cuentaForm.color_secundario || COLOR_TIENDA_DEFAULT.color_secundario,
      color_acento: cuentaForm.color_acento || COLOR_TIENDA_DEFAULT.color_acento,
      color_fondo: cuentaForm.color_fondo || COLOR_TIENDA_DEFAULT.color_fondo,
      tema_tienda: cuentaForm.tema_tienda || COLOR_TIENDA_DEFAULT.tema_tienda,
      google_maps_url: cuentaForm.google_maps_url.trim() || null
    });

    let usuarioActualizado = {
      ...usuario,
      ...datosActualizados
    };

    if (logoCuenta) {
      const datosLogo = await subirLogoEmpresaApi(
        usuario.id_empresa,
        usuario.id_usuario,
        logoCuenta
      );

      usuarioActualizado = {
        ...usuarioActualizado,
        logo_url: datosLogo.logo_url
      };
    }

    localStorage.setItem("usuario_zyra", JSON.stringify(usuarioActualizado));
    setCuentaEmpresaActual(usuarioActualizado);

    setMensajeCuenta("Datos de la cuenta actualizados correctamente.");
    setTipoMensajeCuenta("ok");
    setEditandoCuenta(false);
    setLogoCuenta(null);

    window.location.reload();
  } catch (error) {
    setMensajeCuenta(error.message || "No se pudo actualizar la cuenta.");
    setTipoMensajeCuenta("error");
  }
};

const cambiarPasswordCuenta = (e) => {
  const { name, value } = e.target;

  setPasswordCuenta({
    ...passwordCuenta,
    [name]: value
  });
};

const guardarNuevaPassword = async () => {
  setMensajeCuenta("");
  setTipoMensajeCuenta("");

  if (!passwordCuenta.password_actual) {
    setMensajeCuenta("Debes ingresar tu contraseña actual.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (!passwordCuenta.password_nueva || passwordCuenta.password_nueva.length < 6) {
    setMensajeCuenta("La nueva contraseña debe tener al menos 6 caracteres.");
    setTipoMensajeCuenta("error");
    return;
  }

  if (passwordCuenta.password_nueva !== passwordCuenta.confirmar_password) {
    setMensajeCuenta("Las contraseñas nuevas no coinciden.");
    setTipoMensajeCuenta("error");
    return;
  }

  const confirmar = await pedirConfirmacion({
    titulo: "Cambiar contraseña",
    mensaje: "¿Seguro que quieres cambiar tu contraseña?",
    textoConfirmar: "Cambiar contraseña",
    tipo: "seguro"
  });

  if (!confirmar) return;

  try {
    await cambiarPasswordEmpresaApi(usuario.id_empresa, {
      id_usuario: usuario.id_usuario,
      password_actual: passwordCuenta.password_actual,
      password_nueva: passwordCuenta.password_nueva,
      confirmar_password: passwordCuenta.confirmar_password
    });

    mostrarAvisoEmpresa("Contraseña actualizada correctamente. Vuelve a iniciar sesión con tu nueva contraseña.", "ok");

    setPasswordCuenta({
      password_actual: "",
      password_nueva: "",
      confirmar_password: ""
    });

    setMostrarCambioPassword(false);
    setMostrarNuevaPassword(false);
    setMostrarConfirmarPassword(false);
  } catch (error) {
    mostrarAvisoEmpresa(error.message || "No se pudo cambiar la contraseña.", "error");
  }
};

  const cargarPedidosEmpresa = async () => {
  if (!usuario?.id_empresa) return;

  setCargandoPedidos(true);
  setErrorPedidos("");

  try {
    const pedidos = await obtenerPedidosEmpresa(usuario.id_empresa);
    setPedidosEmpresa(pedidos);
  } catch (error) {
    setErrorPedidos(error.message || "No se pudieron cargar los pedidos.");
  }

  setCargandoPedidos(false);
};

const cargarPagosEmpresa = async () => {
  if (!usuario?.id_empresa) return;

  setCargandoPagos(true);
  setErrorPagos("");

  try {
    const pedidos = await obtenerPedidosEmpresa(usuario.id_empresa);

    const pagos = pedidos
      .filter((pedido) => pedido.pago)
      .map((pedido) => ({
        id_pedido: pedido.id_pedido,
        estado_pedido: pedido.estado_pedido,
        cliente: pedido.cliente,
        items: pedido.items,
        total_para_esta_empresa: pedido.total_para_esta_empresa,
        pago: pedido.pago
      }));

    setPagosEmpresa(pagos);
  } catch (error) {
    setErrorPagos(error.message || "No se pudieron cargar los pagos.");
  }

  setCargandoPagos(false);
};

const cargarCuentaEmpresa = async () => {
  if (!usuario?.id_empresa || !usuario?.id_usuario) return;

  try {
    const datosCuenta = await obtenerCuentaEmpresaApi(
      usuario.id_empresa,
      usuario.id_usuario
    );

    const usuarioActualizado = {
      ...usuario,
      ...datosCuenta
    };

    setCuentaEmpresaActual(usuarioActualizado);
    localStorage.setItem("usuario_zyra", JSON.stringify(usuarioActualizado));
  } catch (error) {
    console.error("No se pudieron cargar los datos de la cuenta:", error);
  }
};

const actualizarQrPagoEmpresa = async (e) => {
  e.preventDefault();

  setMensajeQrPago("");
  setTipoMensajeQrPago("");

  if (!qrPagoArchivo) {
    setMensajeQrPago("Selecciona una imagen QR antes de actualizar.");
    setTipoMensajeQrPago("error");
    return;
  }

  try {
    const respuestaQr = await subirQrPagoEmpresaApi(
      usuario.id_empresa,
      usuario.id_usuario,
      qrPagoArchivo
    );

    const usuarioActualizado = {
      ...cuentaEmpresaActual,
      qr_pago_url: respuestaQr.qr_pago_url
    };

    setCuentaEmpresaActual(usuarioActualizado);
    localStorage.setItem("usuario_zyra", JSON.stringify(usuarioActualizado));

    setQrPagoArchivo(null);
    setMensajeQrPago("QR de pago actualizado correctamente.");
    setTipoMensajeQrPago("ok");
  } catch (error) {
    setMensajeQrPago(error.message || "No se pudo actualizar el QR de pago.");
    setTipoMensajeQrPago("error");
  }
};

const aprobarPagoPedido = async (pedido) => {
  if (!pedido.pago?.id_pago) {
    mostrarAvisoEmpresa("Este pedido no tiene pago registrado.", "error");
    return;
  }

  const confirmar = await pedirConfirmacion({
    titulo: `Aprobar pago #${pedido.id_pedido}`,
    mensaje: "Al aprobarlo, el pedido quedará como pagado y el cliente podrá revisar el estado en sus pedidos.",
    textoConfirmar: "Aprobar pago",
    tipo: "ok"
  });

  if (!confirmar) return;

  try {
    await cambiarEstadoPagoEmpresaApi(
      pedido.pago.id_pago,
      usuario.id_empresa,
      "PAGADO"
    );

    mostrarAvisoEmpresa("Pago aprobado correctamente.", "ok");
    await cargarPedidosEmpresa();
    await cargarPagosEmpresa();
  } catch (error) {
    mostrarAvisoEmpresa(error.message || "No se pudo aprobar el pago.", "error");
  }
};

const rechazarPagoPedido = async (pedido) => {
  if (!pedido.pago?.id_pago) {
    mostrarAvisoEmpresa("Este pedido no tiene pago registrado.", "error");
    return;
  }

  const confirmar = await pedirConfirmacion({
    titulo: `Rechazar pago #${pedido.id_pedido}`,
    mensaje: "El pedido no podrá avanzar hasta que se registre y revise un comprobante válido.",
    textoConfirmar: "Rechazar pago",
    tipo: "peligro"
  });

  if (!confirmar) return;

  try {
    await cambiarEstadoPagoEmpresaApi(
      pedido.pago.id_pago,
      usuario.id_empresa,
      "RECHAZADO"
    );

    mostrarAvisoEmpresa("Pago rechazado correctamente.", "ok");
    await cargarPedidosEmpresa();
    await cargarPagosEmpresa();
  } catch (error) {
    mostrarAvisoEmpresa(error.message || "No se pudo rechazar el pago.", "error");
  }
};

const cambiarEstadoPedidoEmpresa = async (pedido, nuevoEstado) => {
  const textoEstado =
    nuevoEstado === "ENTREGADO"
      ? "marcar como entregado"
      : nuevoEstado === "CANCELADO"
      ? "cancelar"
      : "actualizar";

  const confirmar = await pedirConfirmacion({
    titulo: `Actualizar pedido #${pedido.id_pedido}`,
    mensaje: `¿Seguro que quieres ${textoEstado} este pedido?`,
    textoConfirmar: "Confirmar",
    tipo: nuevoEstado === "CANCELADO" ? "peligro" : "ok"
  });

  if (!confirmar) return;

  try {
    await cambiarEstadoPedidoEmpresaApi(
      pedido.id_pedido,
      usuario.id_empresa,
      nuevoEstado
    );

    mostrarAvisoEmpresa("Estado del pedido actualizado correctamente.", "ok");
    await cargarPedidosEmpresa();
  } catch (error) {
    mostrarAvisoEmpresa(error.message || "No se pudo actualizar el pedido.", "error");
  }
};

  useEffect(() => {
    cargarProductosEmpresa();
    cargarCategorias();
    cargarCuentaEmpresa();
    cargarPedidosEmpresa();
    cargarPagosEmpresa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id_empresa]);

  useEffect(() => {
  if (seccionEmpresa === "pedidos") {
    cargarPedidosEmpresa();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionEmpresa, usuario?.id_empresa]); 

  useEffect(() => {
  if (seccionEmpresa === "pagos") {
    cargarPagosEmpresa();
    cargarCuentaEmpresa();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [seccionEmpresa, usuario?.id_empresa]);


useEffect(() => {
  if (seccionEmpresa === "soporte") {
    cargarTicketsSoporte();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [seccionEmpresa, usuario?.id_usuario]);

useEffect(() => {
  if (seccionEmpresa === "informacion") {
    cargarPedidosEmpresa();
    cargarPagosEmpresa();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [seccionEmpresa, usuario?.id_empresa]);

useEffect(() => {
  if (seccionEmpresa === "cuenta") {
    sincronizarCuentaConUsuario();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [seccionEmpresa]);

  const cambiarNuevoProducto = (e) => {
    const { name, value } = e.target;

    if (name === "precio") {
      setNuevoProducto({
        ...nuevoProducto,
        [name]: value.replace(",", ".")
      });
      return;
    }

    if (name === "stock") {
      setNuevoProducto({
        ...nuevoProducto,
        [name]: value.replace(/\D/g, "")
      });
      return;
    }

    setNuevoProducto({
      ...nuevoProducto,
      [name]: value
    });
  };

  const validarNuevoProducto = () => {
    if (!nuevoProducto.nombre_producto.trim()) return "Debes ingresar el nombre del producto.";
    if (!nuevoProducto.id_categoria) return "Debes seleccionar una categoría.";
    if (nuevoProducto.id_categoria === "otro" && !nuevaCategoria.trim()) return "Debes escribir el nombre de la nueva categoría.";
    if (!nuevoProducto.precio || Number(nuevoProducto.precio) <= 0) return "El precio debe ser mayor a 0.";
    if (!limpiarValorSeleccionableEmpresa(nuevoProducto.color)) return "Debes seleccionar o escribir el color principal.";
    if (!limpiarValorSeleccionableEmpresa(nuevoProducto.talla)) return "Debes seleccionar o escribir la talla.";
    if (nuevoProducto.stock === "" || Number(nuevoProducto.stock) < 0) return "Debes ingresar un stock válido.";
    return "";
  };

  const registrarProductoEmpresa = async (e) => {
    e.preventDefault();

    setMensajeProducto("");
    setTipoMensajeProducto("");

    const error = validarNuevoProducto();

    if (error) {
      setMensajeProducto(error);
      setTipoMensajeProducto("error");
      return;
    }

    try {
      let idCategoriaFinal = Number(nuevoProducto.id_categoria);

      if (nuevoProducto.id_categoria === "otro") {
        const datosCategoria = await crearCategoria({
          nombre_categoria: nuevaCategoria.trim(),
          descripcion: `Categoría creada por ${usuario.nombre_empresa}`
        });

        idCategoriaFinal = datosCategoria.id_categoria;
        await cargarCategorias();
      }

      const datosProducto = {
        id_empresa: usuario.id_empresa,
        id_categoria: idCategoriaFinal,
        nombre_producto: nuevoProducto.nombre_producto.trim(),
        descripcion: nuevoProducto.descripcion.trim() || null,
        marca: nuevoProducto.marca.trim() || null,
        genero: nuevoProducto.genero || "Unisex",
        precio: Number(nuevoProducto.precio),
        imagen_principal: null,
        variantes: [
          {
            color: limpiarValorSeleccionableEmpresa(nuevoProducto.color),
            talla: limpiarValorSeleccionableEmpresa(nuevoProducto.talla),
            stock: Number(nuevoProducto.stock),
            disponible: Number(nuevoProducto.stock) > 0
          }
        ]
      };

      const productoCreado = await crearProductoEmpresa(datosProducto);

      if (imagenProducto) {
        await subirImagenProducto(
          productoCreado.id_producto,
          usuario.id_empresa,
          imagenProducto
        );
      }

      setMensajeProducto("Producto registrado correctamente.");
      setTipoMensajeProducto("ok");
      setNuevoProducto(estadoInicialNuevoProducto);
      setImagenProducto(null);
      setNuevaCategoria("");

      await cargarProductosEmpresa();
      setSeccionEmpresa("vista");
    } catch (error) {
      setMensajeProducto(error.message || "No se pudo registrar el producto.");
      setTipoMensajeProducto("error");
    }
  };

  const abrirVerProducto = (producto, volverA = "productos") => {
    setProductoViendo(producto);
    setVolverDetalleA(volverA);
    setSeccionEmpresa("ver");
  };

  const abrirEditarProducto = (producto) => {
    const categoriaEncontrada = categorias.find(
      (categoria) => categoria.nombre_categoria === producto.categoria
    );

    setProductoEditando(producto);

    setProductoEditar({
      id_categoria: producto.id_categoria || categoriaEncontrada?.id_categoria || "",
      nombre_producto: producto.nombre_producto || "",
      descripcion: producto.descripcion || "",
      marca: producto.marca || "",
      genero: producto.genero || "Unisex",
      precio: producto.precio || ""
    });

    setImagenEditando(null);
    setMensajeEdicion("");
    setTipoMensajeEdicion("");

    setVariantesEditando((producto.variantes || []).filter(Boolean));
    setNuevaVariante({
      color: "",
      talla: "",
      stock: ""
       });
    setMensajeVariante("");
    setTipoMensajeVariante("");
    setSeccionEmpresa("editar");
  };

  const cambiarProductoEditar = (e) => {
    const { name, value } = e.target;

    if (name === "precio") {
      setProductoEditar({
        ...productoEditar,
        [name]: value.replace(",", ".")
      });
      return;
    }

    setProductoEditar({
      ...productoEditar,
      [name]: value
    });
  };

  const validarProductoEditar = () => {
    if (!productoEditar.nombre_producto.trim()) return "Debes ingresar el nombre del producto.";
    if (!productoEditar.id_categoria) return "Debes seleccionar una categoría.";
    if (!productoEditar.precio || Number(productoEditar.precio) <= 0) return "El precio debe ser mayor a 0.";
    return "";
  };

  const guardarEdicionProducto = async (e) => {
    e.preventDefault();

    setMensajeEdicion("");
    setTipoMensajeEdicion("");

    const error = validarProductoEditar();

    if (error) {
      setMensajeEdicion(error);
      setTipoMensajeEdicion("error");
      return;
    }

    try {
      const datosProducto = {
        id_empresa: usuario.id_empresa,
        id_categoria: Number(productoEditar.id_categoria),
        nombre_producto: productoEditar.nombre_producto.trim(),
        descripcion: productoEditar.descripcion.trim() || null,
        marca: productoEditar.marca.trim() || null,
        genero: productoEditar.genero || "Unisex",
        precio: Number(productoEditar.precio)
      };

      await editarProductoEmpresa(productoEditando.id_producto, datosProducto);

      if (imagenEditando) {
        await subirImagenProducto(
          productoEditando.id_producto,
          usuario.id_empresa,
          imagenEditando
        );
      }

      setMensajeEdicion("Producto editado correctamente.");
      setTipoMensajeEdicion("ok");

      await cargarProductosEmpresa();

      setTimeout(() => {
        setSeccionEmpresa("productos");
        setProductoEditando(null);
        setImagenEditando(null);
      }, 900);
    } catch (error) {
      setMensajeEdicion(error.message || "No se pudo editar el producto.");
      setTipoMensajeEdicion("error");
    }
  };

const cambiarVarianteEditando = (idVariante, campo, valor) => {
  setVariantesEditando((variantesActuales) =>
    variantesActuales.map((variante) =>
      variante.id_variante === idVariante
        ? {
            ...variante,
            [campo]: campo === "stock" ? valor.replace(/\D/g, "") : valor
          }
        : variante
    )
  );
};

const guardarVarianteExistente = async (variante) => {
  setMensajeVariante("");
  setTipoMensajeVariante("");

  if (!limpiarValorSeleccionableEmpresa(variante.color)) {
    setMensajeVariante("Debes seleccionar o escribir el color de la variante.");
    setTipoMensajeVariante("error");
    return;
  }

  if (!limpiarValorSeleccionableEmpresa(variante.talla)) {
    setMensajeVariante("Debes seleccionar o escribir la talla de la variante.");
    setTipoMensajeVariante("error");
    return;
  }

  if (variante.stock === "" || Number(variante.stock) < 0) {
    setMensajeVariante("El stock debe ser un número válido.");
    setTipoMensajeVariante("error");
    return;
  }

  try {
    await editarVarianteProductoApi(variante.id_variante, {
      id_empresa: usuario.id_empresa,
      color: limpiarValorSeleccionableEmpresa(variante.color),
      talla: limpiarValorSeleccionableEmpresa(variante.talla),
      stock: Number(variante.stock),
      disponible: variante.disponible
    });

    setMensajeVariante("Variante actualizada correctamente.");
    setTipoMensajeVariante("ok");

    await cargarProductosEmpresa();
  } catch (error) {
    setMensajeVariante(error.message || "No se pudo actualizar la variante.");
    setTipoMensajeVariante("error");
  }
};

const agregarNuevaVariante = async () => {
  setMensajeVariante("");
  setTipoMensajeVariante("");

  if (!limpiarValorSeleccionableEmpresa(nuevaVariante.color)) {
    setMensajeVariante("Debes seleccionar o escribir el color de la nueva variante.");
    setTipoMensajeVariante("error");
    return;
  }

  if (!limpiarValorSeleccionableEmpresa(nuevaVariante.talla)) {
    setMensajeVariante("Debes seleccionar o escribir la talla de la nueva variante.");
    setTipoMensajeVariante("error");
    return;
  }

  if (nuevaVariante.stock === "" || Number(nuevaVariante.stock) < 0) {
    setMensajeVariante("Debes ingresar un stock válido.");
    setTipoMensajeVariante("error");
    return;
  }

  try {
    await agregarVarianteProductoApi(productoEditando.id_producto, {
      id_empresa: usuario.id_empresa,
      color: limpiarValorSeleccionableEmpresa(nuevaVariante.color),
      talla: limpiarValorSeleccionableEmpresa(nuevaVariante.talla),
      stock: Number(nuevaVariante.stock),
      disponible: Number(nuevaVariante.stock) > 0
    });

    const productosActualizados = await obtenerProductosEmpresa(usuario.id_empresa);
    setProductosEmpresa(productosActualizados);

    const productoActualizado = productosActualizados.find(
      (item) => item.id_producto === productoEditando.id_producto
    );

    if (productoActualizado) {
      setProductoEditando(productoActualizado);
      setVariantesEditando((productoActualizado.variantes || []).filter(Boolean));
    }

    setNuevaVariante({
      color: "",
      talla: "",
      stock: ""
    });

    setMensajeVariante("Variante agregada correctamente.");
    setTipoMensajeVariante("ok");
  } catch (error) {
    setMensajeVariante(error.message || "No se pudo agregar la variante.");
    setTipoMensajeVariante("error");
  }
};

const cambiarEstadoVariante = async (variante) => {
  const nuevoEstado = !variante.disponible;

  if (nuevoEstado && Number(variante.stock) <= 0) {
    setMensajeVariante("No puedes activar una variante sin stock.");
    setTipoMensajeVariante("error");
    return;
  }

  try {
    await cambiarEstadoVarianteApi(variante.id_variante, {
      id_empresa: usuario.id_empresa,
      disponible: nuevoEstado
    });

    setVariantesEditando((variantesActuales) =>
      variantesActuales.map((item) =>
        item.id_variante === variante.id_variante
          ? { ...item, disponible: nuevoEstado }
          : item
      )
    );

    setMensajeVariante(
      nuevoEstado
        ? "Variante activada correctamente."
        : "Variante desactivada correctamente."
    );
    setTipoMensajeVariante("ok");

    await cargarProductosEmpresa();
  } catch (error) {
    setMensajeVariante(error.message || "No se pudo cambiar el estado.");
    setTipoMensajeVariante("error");
  }
};


  const cambiarEstadoProducto = async (producto) => {
    const nuevoEstado = producto.estado_producto === "ACTIVO" ? "INACTIVO" : "ACTIVO";

    const confirmar = await pedirConfirmacion({
      titulo: nuevoEstado === "INACTIVO" ? "Desactivar producto" : "Activar producto",
      mensaje: nuevoEstado === "INACTIVO"
        ? `El producto "${producto.nombre_producto}" ya no se mostrará al cliente, pero seguirá guardado.`
        : `El producto "${producto.nombre_producto}" volverá a mostrarse si tiene stock disponible.`,
      textoConfirmar: nuevoEstado === "INACTIVO" ? "Desactivar" : "Activar",
      tipo: nuevoEstado === "INACTIVO" ? "advertencia" : "ok"
    });

    if (!confirmar) return;

    try {
      await cambiarEstadoProductoApi(
        producto.id_producto,
        usuario.id_empresa,
        nuevoEstado
      );

      mostrarAvisoEmpresa(
        nuevoEstado === "INACTIVO"
          ? "Producto desactivado correctamente."
          : "Producto activado correctamente.",
        "ok"
      );

      await cargarProductosEmpresa();
    } catch (error) {
      mostrarAvisoEmpresa(error.message || "No se pudo cambiar el estado del producto.", "error");
    }
  };

  const renderProductosPorCategoria = (modoLista = false, gruposProductos = productosPorCategoria) => (
    <div className="categorias-productos">
      {Object.entries(gruposProductos).map(([categoria, productos]) => (
        <div className="categoria-grupo" key={categoria}>
          <div className="categoria-titulo categoria-bonita">
  <div>
    <span className="categoria-mini-label">Categoría</span>
    <h3>{categoria}</h3>
  </div>

  <span className="categoria-cantidad-pill">
    {productos.length} producto(s)
  </span>
</div>

          {modoLista ? (
            <div className="tabla-productos">
              {productos.map((producto) => (
                <div className="fila-producto" key={producto.id_producto}>
                  <div>
                    <strong>{producto.nombre_producto}</strong>
                    <p>{producto.marca || "Sin marca"}</p>
                  </div>

                  <span>{producto.precio} Bs</span>
                  <span>{producto.estado_producto}</span>

                  <div className="acciones-producto">
                    <button
                      className="btn-ver-producto"
                      type="button"
                      onClick={() => abrirVerProducto(producto)}
                    >
                      Ver
                    </button>

                    <button
                      className="btn-editar-producto"
                      type="button"
                      onClick={() => abrirEditarProducto(producto)}
                    >
                      Editar
                    </button>

                    <button
                      className={
                        producto.estado_producto === "ACTIVO"
                          ? "btn-desactivar-producto"
                          : "btn-activar-producto"
                      }
                      type="button"
                      onClick={() => cambiarEstadoProducto(producto)}
                    >
                      {producto.estado_producto === "ACTIVO" ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="productos-grid">
              {productos.map((producto) => (
                <div
                  className="producto-card-clickable"
                  key={producto.id_producto}
                  role="button"
                  tabIndex={0}
                  onClick={() => abrirVerProducto(producto, modoLista ? "productos" : "vista")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      abrirVerProducto(producto, modoLista ? "productos" : "vista");
                    }
                  }}
                  title="Ver producto como cliente"
                >
                  <ProductoCard producto={producto} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );


  const cargarTicketsSoporte = async () => {
    if (!usuario?.id_usuario) return;
    setCargandoSoporte(true);
    setMensajeSoporte("");

    try {
      const datos = await obtenerTicketsUsuarioApi(usuario.id_usuario);
      setTicketsSoporte(datos || []);
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudo cargar soporte.");
      setTipoMensajeSoporte("error");
    } finally {
      setCargandoSoporte(false);
    }
  };

  const abrirTicketSoporte = async (ticket) => {
    setTicketSoporteActivo(ticket);
    setMensajesSoporte([]);
    setRespuestaSoporte("");
    setMensajeSoporte("");

    try {
      const datos = await obtenerMensajesTicketApi(ticket.id_ticket, usuario.id_usuario);
      setMensajesSoporte(datos.mensajes || []);
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudieron cargar los mensajes.");
      setTipoMensajeSoporte("error");
    }
  };

  const crearTicketSoporteEmpresa = async (e) => {
    e.preventDefault();
    setMensajeSoporte("");
    setTipoMensajeSoporte("");

    if (!nuevoTicketSoporte.asunto.trim() || !nuevoTicketSoporte.descripcion.trim()) {
      setMensajeSoporte("Escribe el asunto y el mensaje antes de enviar.");
      setTipoMensajeSoporte("error");
      return;
    }

    try {
      await crearTicketSoporteApi({
        id_usuario: usuario.id_usuario,
        asunto: nuevoTicketSoporte.asunto.trim(),
        descripcion: nuevoTicketSoporte.descripcion.trim()
      });
      setNuevoTicketSoporte({ asunto: "", descripcion: "" });
      setMensajeSoporte("Tu mensaje fue enviado a soporte de Zyra.");
      setTipoMensajeSoporte("ok");
      await cargarTicketsSoporte();
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudo enviar el mensaje.");
      setTipoMensajeSoporte("error");
    }
  };

  const responderTicketEmpresa = async (e) => {
    e.preventDefault();
    if (!ticketSoporteActivo) return;
    if (!respuestaSoporte.trim()) {
      setMensajeSoporte("Escribe una respuesta antes de enviar.");
      setTipoMensajeSoporte("error");
      return;
    }

    try {
      await responderTicketSoporteApi(ticketSoporteActivo.id_ticket, usuario.id_usuario, respuestaSoporte.trim());
      setRespuestaSoporte("");
      await abrirTicketSoporte(ticketSoporteActivo);
      await cargarTicketsSoporte();
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudo enviar la respuesta.");
      setTipoMensajeSoporte("error");
    }
  };

  const menu = [
    { id: "vista", nombre: "Vista de mi tienda", icono: "tienda" },
    { id: "productos", nombre: "Productos", icono: "producto" },
    { id: "registrar", nombre: "Registrar producto", icono: "agregar" },
    { id: "pedidos", nombre: "Pedidos", icono: "pedidos" },
    { id: "pagos", nombre: "Pagos", icono: "pagos" },
    { id: "informacion", nombre: "Resumen", icono: "resumen" },
    { id: "soporte", nombre: "Soporte", icono: "soporte" },
    { id: "cuenta", nombre: "Mi cuenta", icono: "cuenta" }
  ];

  useEffect(() => {
    if (!usuario?.id_empresa) return;

    const guardadas = localStorage.getItem(
      `zyra_notificaciones_empresa_leidas_${usuario.id_empresa}`
    );

    setNotificacionesEmpresaLeidas(guardadas ? JSON.parse(guardadas) : []);
  }, [usuario?.id_empresa]);

  const cargarNotificacionesSistemaEmpresa = async () => {
    if (!usuario?.id_usuario) return [];

    const datos = await obtenerNotificacionesUsuarioApi(usuario.id_usuario);
    setNotificacionesSistemaEmpresa(datos);
    return datos;
  };

  useEffect(() => {
    if (!usuario?.id_usuario) return;

    cargarNotificacionesSistemaEmpresa().catch(() => {});
    const intervalo = setInterval(() => {
      cargarNotificacionesSistemaEmpresa().catch(() => {});
    }, 25000);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id_usuario]);

  const notificacionesPedidosEmpresa = useMemo(() => {
    const avisos = [];

    (pedidosEmpresa || []).slice(0, 8).forEach((pedido) => {
      if (pedido.pago?.estado_pago === "EN_REVISION") {
        avisos.push({
          id: `pago-${pedido.pago.id_pago}`,
          tipo: "revision",
          titulo: `Comprobante pendiente · Pedido #${pedido.id_pedido}`,
          texto: "Un cliente subió su comprobante. Revisa si corresponde aprobarlo.",
          accion: "pagos"
        });
        return;
      }

      if (!pedido.pago) {
        avisos.push({
          id: `pedido-${pedido.id_pedido}-nuevo`,
          tipo: "nuevo",
          titulo: `Nuevo pedido recibido · #${pedido.id_pedido}`,
          texto: "Un cliente realizó una compra. Revisa el pedido y espera el comprobante.",
          accion: "pedidos"
        });
        return;
      }

      if (pedido.pago?.estado_pago === "PAGADO" && pedido.estado_pedido !== "ENTREGADO") {
        avisos.push({
          id: `pedido-${pedido.id_pedido}-pagado`,
          tipo: "ok",
          titulo: `Pedido #${pedido.id_pedido} pagado`,
          texto: "El pago fue aprobado. Puedes preparar el pedido para entregarlo.",
          accion: "pedidos"
        });
      }
    });

    return avisos;
  }, [pedidosEmpresa]);

  const notificacionesSoporteEmpresa = useMemo(() => {
    return (notificacionesSistemaEmpresa || []).map((notificacion) => ({
      id: `sistema-${notificacion.id_notificacion}`,
      idNotificacion: notificacion.id_notificacion,
      origen: "sistema",
      tipo: notificacion.leido ? "neutral" : "revision",
      titulo: notificacion.titulo || "Notificación de Zyra",
      texto: notificacion.mensaje || "Tienes una actualización pendiente.",
      leidoBackend: Boolean(notificacion.leido),
      accion: (notificacion.titulo || "").toLowerCase().includes("soporte") ? "soporte" : "pedidos"
    }));
  }, [notificacionesSistemaEmpresa]);

  const notificacionesEmpresa = useMemo(() => {
    return [...notificacionesSoporteEmpresa, ...notificacionesPedidosEmpresa].slice(0, 10);
  }, [notificacionesSoporteEmpresa, notificacionesPedidosEmpresa]);

  const notificacionesEmpresaNoLeidas = useMemo(() => {
    return notificacionesEmpresa.filter((notificacion) => {
      if (notificacion.origen === "sistema") {
        return !notificacion.leidoBackend;
      }

      return !notificacionesEmpresaLeidas.includes(notificacion.id);
    });
  }, [notificacionesEmpresa, notificacionesEmpresaLeidas]);

  const totalNotificacionesEmpresa = notificacionesEmpresaNoLeidas.length;

  const abrirNotificacionesEmpresa = async () => {
    if (mostrarNotificacionesEmpresa) {
      setMostrarNotificacionesEmpresa(false);
      setNotificacionesEmpresaRecientes([]);
      return;
    }

    cargarPedidosEmpresa();
    cargarPagosEmpresa();

    let sistemaActual = notificacionesSistemaEmpresa;
    try {
      sistemaActual = await cargarNotificacionesSistemaEmpresa();
    } catch (error) {
      sistemaActual = notificacionesSistemaEmpresa;
    }

    const idsSistemaNuevas = (sistemaActual || [])
      .filter((notificacion) => !notificacion.leido)
      .map((notificacion) => notificacion.id_notificacion);

    const idsSistemaRecientes = idsSistemaNuevas.map((id) => `sistema-${id}`);

    const idsPedidosNuevas = notificacionesPedidosEmpresa
      .filter((notificacion) => !notificacionesEmpresaLeidas.includes(notificacion.id))
      .map((notificacion) => notificacion.id);

    setNotificacionesEmpresaRecientes([...idsSistemaRecientes, ...idsPedidosNuevas]);

    if (idsPedidosNuevas.length > 0) {
      const nuevasLeidas = Array.from(
        new Set([...notificacionesEmpresaLeidas, ...idsPedidosNuevas])
      );

      setNotificacionesEmpresaLeidas(nuevasLeidas);
      localStorage.setItem(
        `zyra_notificaciones_empresa_leidas_${usuario.id_empresa}`,
        JSON.stringify(nuevasLeidas)
      );
    }

    if (idsSistemaNuevas.length > 0) {
      setNotificacionesSistemaEmpresa((actuales) =>
        actuales.map((notificacion) =>
          idsSistemaNuevas.includes(notificacion.id_notificacion)
            ? { ...notificacion, leido: true }
            : notificacion
        )
      );

      await Promise.all(
        idsSistemaNuevas.map((idNotificacion) =>
          marcarNotificacionUsuarioLeidaApi(idNotificacion, usuario.id_usuario).catch(() => null)
        )
      );
    }

    setMostrarNotificacionesEmpresa(true);
  };

  const cerrarNotificacionesEmpresa = () => {
    setMostrarNotificacionesEmpresa(false);
    setNotificacionesEmpresaRecientes([]);
  };

  const pagosFiltrados =
  filtroPagos === "TODOS"
    ? pagosEmpresa
    : pagosEmpresa.filter((item) => item.pago?.estado_pago === filtroPagos);

const totalPagado = pagosEmpresa
  .filter((item) => item.pago?.estado_pago === "PAGADO")
  .reduce((total, item) => total + Number(item.total_para_esta_empresa || 0), 0);

const totalEnRevision = pagosEmpresa.filter(
  (item) => item.pago?.estado_pago === "EN_REVISION"
).length;

const totalRechazados = pagosEmpresa.filter(
  (item) => item.pago?.estado_pago === "RECHAZADO"
).length;


const totalProductosResumen = productosEmpresa.length;

const productosActivosResumen = productosEmpresa.filter(
  (producto) => producto.estado_producto === "ACTIVO"
).length;

const productosInactivosResumen = productosEmpresa.filter(
  (producto) => producto.estado_producto === "INACTIVO"
).length;

const categoriasResumen = new Set(
  productosEmpresa.map((producto) => producto.categoria).filter(Boolean)
).size;

const productosBajoStockResumen = productosEmpresa.filter((producto) =>
  (producto.variantes || []).some((variante) => Number(variante.stock || 0) <= 3)
).length;

const pedidosResumen = pedidosEmpresa.length;

const totalVendidoResumen = pagosEmpresa
  .filter((item) => item.pago?.estado_pago === "PAGADO")
  .reduce(
    (total, item) => total + Number(item.total_para_esta_empresa || 0),
    0
  );

const pagosRevisionResumen = pagosEmpresa.filter(
  (item) => item.pago?.estado_pago === "EN_REVISION"
).length;

const ultimosPedidosResumen = pedidosEmpresa.slice(0, 3);

  const abrirSeccionDesdeNotificacionEmpresa = (notificacion) => {
    cerrarNotificacionesEmpresa();
    if (notificacion.accion === "pagos") {
      setSeccionEmpresa("pagos");
      return;
    }
    if (notificacion.accion === "soporte") {
      setSeccionEmpresa("soporte");
      return;
    }
    setSeccionEmpresa("pedidos");
  };

  const renderNotificacionesEmpresa = () => (
    <div className="empresa-notification-area">
      <button
        type="button"
        className="empresa-notification-top"
        onClick={abrirNotificacionesEmpresa}
        title="Ver notificaciones"
        aria-label="Ver notificaciones"
      >
        <IconoPanel tipo="campana" />
        {totalNotificacionesEmpresa > 0 && <span>{totalNotificacionesEmpresa}</span>}
      </button>

      {mostrarNotificacionesEmpresa && (
        <div className="empresa-notification-popover">
          <div className="empresa-notification-header">
            <div>
              <span>Notificaciones</span>
              <h3>Actividad de tu tienda</h3>
            </div>
            <button type="button" onClick={cerrarNotificacionesEmpresa}>×</button>
          </div>

          {notificacionesEmpresa.length === 0 ? (
            <p className="empresa-notification-empty">Todavía no hay avisos nuevos.</p>
          ) : (
            <div className="empresa-notification-list">
              {notificacionesEmpresa.map((notificacion) => {
                const esNueva = notificacionesEmpresaRecientes.includes(notificacion.id);

                return (
                  <button
                    type="button"
                    className={`empresa-notification-item ${notificacion.tipo} ${
                      esNueva ? "sin-leer" : ""
                    }`}
                    key={notificacion.id}
                    onClick={() => abrirSeccionDesdeNotificacionEmpresa(notificacion)}
                  >
                    <strong>{notificacion.titulo}</strong>
                    <p>{notificacion.texto}</p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="empresa-notification-actions">
            <button
              type="button"
              onClick={() => {
                cerrarNotificacionesEmpresa();
                setSeccionEmpresa("pedidos");
              }}
            >
              Ir a pedidos
            </button>
            <button
              type="button"
              onClick={() => {
                cerrarNotificacionesEmpresa();
                setSeccionEmpresa("pagos");
              }}
            >
              Ir a pagos
            </button>
          </div>
        </div>
      )}
    </div>
  );


  const renderSoporte = () => (
    <div className="empresa-section cliente-soporte-page">
      <div className="section-header">
        <div>
          <span>Soporte técnico</span>
          <h2>Escribir queja o consulta</h2>
        </div>
        <button type="button" onClick={cargarTicketsSoporte}>Actualizar</button>
      </div>

      {mensajeSoporte && <div className={`mensaje-producto ${tipoMensajeSoporte}`}>{mensajeSoporte}</div>}

      <div className="soporte-usuario-layout">
        <form className="soporte-form-card" onSubmit={crearTicketSoporteEmpresa}>
          <span>Nuevo mensaje</span>
          <h3>Comunícate con Zyra</h3>
          <label>
            Asunto
            <input
              value={nuevoTicketSoporte.asunto}
              onChange={(e) => setNuevoTicketSoporte({ ...nuevoTicketSoporte, asunto: e.target.value })}
              placeholder="Ej: Problema con mis pagos"
            />
          </label>
          <label>
            Mensaje
            <textarea
              value={nuevoTicketSoporte.descripcion}
              onChange={(e) => setNuevoTicketSoporte({ ...nuevoTicketSoporte, descripcion: e.target.value })}
              placeholder="Describe tu consulta o queja con detalle"
            />
          </label>
          <button type="submit">Enviar a soporte</button>
        </form>

        <div className="soporte-lista-card">
          <span>Mensajes recibidos</span>
          <h3>Respuestas de Zyra</h3>
          {cargandoSoporte ? (
            <p className="soporte-vacio-texto">Cargando soporte...</p>
          ) : ticketsSoporte.length === 0 ? (
            <p className="soporte-vacio-texto">Todavía no enviaste mensajes a soporte.</p>
          ) : (
            <div className="soporte-tickets-lista">
              {ticketsSoporte.map((ticket) => {
                const ultimoRol = String(ticket.ultimo_autor?.rol || "").toUpperCase();
                const respondioZyra = ultimoRol === "ADMIN" || ultimoRol === "ADMINISTRADOR";
                return (
                  <button
                    type="button"
                    key={ticket.id_ticket}
                    className={`soporte-ticket-item ${respondioZyra ? "respondido" : ""}`}
                    onClick={() => abrirTicketSoporte(ticket)}
                  >
                    <div>
                      <strong>Ticket #{ticket.id_ticket}: {ticket.asunto}</strong>
                      <p>{respondioZyra ? "Zyra te respondió. Toca para ver el mensaje." : ticket.ultimo_mensaje || ticket.descripcion}</p>
                    </div>
                    <span>{ticket.estado_ticket}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {ticketSoporteActivo && (
        <div className="soporte-conversacion-card">
          <div className="soporte-conversacion-header">
            <div>
              <span>Conversación</span>
              <h3>{ticketSoporteActivo.asunto}</h3>
            </div>
            <button type="button" onClick={() => setTicketSoporteActivo(null)}>Cerrar</button>
          </div>

          <div className="soporte-mensajes-lista">
            {mensajesSoporte.map((mensaje) => {
              const rol = String(mensaje.rol || "").toUpperCase();
              const esAdmin = rol === "ADMIN" || rol === "ADMINISTRADOR";
              return (
                <div className={`soporte-mensaje ${esAdmin ? "zyra" : "usuario"}`} key={mensaje.id_mensaje}>
                  <strong>{esAdmin ? "Zyra soporte" : "Tú"}</strong>
                  <p>{mensaje.mensaje}</p>
                </div>
              );
            })}
          </div>

          <form className="soporte-responder-form" onSubmit={responderTicketEmpresa}>
            <textarea
              value={respuestaSoporte}
              onChange={(e) => setRespuestaSoporte(e.target.value)}
              placeholder="Responder o agregar más información..."
            />
            <button type="submit">Enviar respuesta</button>
          </form>
        </div>
      )}
    </div>
  );

  return ( //return oficial
    <main className={`empresa-panel ${menuEmpresaContraido ? "menu-contraido" : ""}`}>
      {toastEmpresa && (
        <div className={`zyra-toast-profesional ${toastEmpresa.tipo}`}>
          <strong>{toastEmpresa.tipo === "error" ? "Revisa esta acción" : "Acción realizada"}</strong>
          <p>{toastEmpresa.texto}</p>
        </div>
      )}

      {modalConfirmacion && (
        <div className="zyra-confirmacion-fondo">
          <section className={`zyra-confirmacion-card ${modalConfirmacion.tipo || ""}`}>
            <span>Confirmación</span>
            <h3>{modalConfirmacion.titulo}</h3>
            <p>{modalConfirmacion.mensaje}</p>
            <div className="zyra-confirmacion-acciones">
              <button type="button" className="cancelar" onClick={() => cerrarConfirmacion(false)}>Cancelar</button>
              <button type="button" className="confirmar" onClick={() => cerrarConfirmacion(true)}>
                {modalConfirmacion.textoConfirmar || "Confirmar"}
              </button>
            </div>
          </section>
        </div>
      )}
      <aside className="empresa-sidebar">
        <button
          type="button"
          className="empresa-menu-toggle"
          onClick={() => setMenuEmpresaContraido(!menuEmpresaContraido)}
          title={menuEmpresaContraido ? "Abrir menú" : "Cerrar menú"}
          aria-label={menuEmpresaContraido ? "Abrir menú" : "Cerrar menú"}
        >
          <IconoPanel tipo="menu" />
        </button>
        <div className="empresa-brand empresa-brand-personalizada" style={obtenerEstiloTienda(cuentaEmpresaActual || usuario)}>
          <div className="empresa-brand-icon empresa-brand-logo">
            {(cuentaEmpresaActual?.logo_url || usuario.logo_url) ? (
              <img
                src={obtenerUrlImagen(cuentaEmpresaActual?.logo_url || usuario.logo_url)}
                alt={cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa || "Tienda"}
              />
            ) : (
              <span>{(cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa || "Z").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h2>{cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa || "Mi tienda"}</h2>
            <p>Panel empresarial</p>
          </div>
        </div>

        <div className="empresa-mini-card">
          <span>Tienda activa</span>
          <strong>{cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa}</strong>
          <p>{cuentaEmpresaActual?.estado_empresa || usuario.estado_empresa}</p>
        </div>

        <nav className="empresa-nav">
          {menu.map((item) => (
            <button
              key={item.id}
              className={seccionEmpresa === item.id ? "activo" : ""}
              onClick={() => setSeccionEmpresa(item.id)}
              type="button"
            >
              <IconoPanel tipo={item.icono} />
              <span>{item.nombre}</span>
            </button>
          ))}
        </nav>

        <div className="empresa-sidebar-footer">
          <button type="button" onClick={onVolver} title="Volver al inicio">
            <IconoPanel tipo="tienda" />
            <span>Volver al inicio</span>
          </button>

          <button type="button" onClick={onCerrarSesion} title="Cerrar sesión">
            <IconoPanel tipo="cuenta" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <section className="empresa-main">
        <header className="empresa-topbar">
          <div>
            <p>Bienvenida/o</p>
            <h1>{usuario.nombre_empresa}</h1>
          </div>

          <div className="empresa-top-actions">
            {renderNotificacionesEmpresa()}
            <div className="empresa-estado">{usuario.estado_empresa}</div>
          </div>
        </header>

        {seccionEmpresa === "vista" && (
          <div className="empresa-section">
            <div className="tienda-preview">
              <div>
                <span>Vista pública</span>
                <h2>{usuario.nombre_empresa}</h2>
                <p>
                  Así se verá tu tienda para los clientes dentro de Zyra.
                  Revisa que tus productos, imágenes, precios y datos estén
                  correctamente registrados.
                </p>
              </div>

              <button type="button" onClick={cargarProductosEmpresa}>
                Actualizar vista
              </button>
            </div>

            {cargandoEmpresa && (
              <p className="estado-carga">Cargando productos...</p>
            )}

            {errorEmpresa && <p className="estado-error">{errorEmpresa}</p>}

            {!cargandoEmpresa && productosVisiblesEmpresa.length === 0 && (
              <div className="vacio-card">
                <h3>Aún no tienes productos visibles</h3>
                <p>
                  Cuando registres prendas, aparecerán aquí como vista previa
                  para tus clientes.
                </p>
              </div>
            )}

            {renderProductosPorCategoria(false, productosVisiblesPorCategoria)}
          </div>
        )}

        {seccionEmpresa === "productos" && (
          <div className="empresa-section">
            <div className="section-header">
              <div>
                <span>Gestión de catálogo</span>
                <h2>Mis productos</h2>
              </div>

              <button type="button" onClick={cargarProductosEmpresa}>
                Actualizar
              </button>
            </div>

            {renderProductosPorCategoria(true)}
          </div>
        )}

        {seccionEmpresa === "pedidos" && (
  <div className="empresa-section">
    <div className="section-header">
      <div>
        <span>Gestión de pedidos</span>
        <h2>Pedidos recibidos</h2>
      </div>

      <div className="empresa-header-actions-mini">
        <button type="button" onClick={cargarPedidosEmpresa}>
          Actualizar
        </button>
        <button type="button" onClick={() => setSeccionEmpresa("pagos")}>
          Ir a pagos
        </button>
      </div>
    </div>

    {cargandoPedidos && (
      <p className="estado-carga">Cargando pedidos...</p>
    )}

    {errorPedidos && (
      <p className="estado-error">{errorPedidos}</p>
    )}

    {!cargandoPedidos && pedidosEmpresa.length === 0 && (
      <div className="vacio-card">
        <h3>Aún no tienes pedidos</h3>
        <p>
          Cuando los clientes compren productos de tu tienda, sus pedidos
          aparecerán en esta sección.
        </p>
      </div>
    )}

    <div className="pedidos-lista">
      {pedidosEmpresa.map((pedido) => (
        <article className="pedido-card" key={pedido.id_pedido}>
          <div className="pedido-card-header">
            <div>
              <span>Pedido #{pedido.id_pedido}</span>
              <h3>
                {pedido.cliente?.nombre || "Cliente"}{" "}
                {pedido.cliente?.apellido || ""}
              </h3>
              <p>{pedido.cliente?.email || "Sin correo registrado"}</p>
            </div>

            <div className="pedido-estados">
              <strong className="estado-badge">
                Pedido: {pedido.estado_pedido}
              </strong>

              <strong className="estado-badge pago">
                Pago: {pedido.pago?.estado_pago || "SIN PAGO"}
              </strong>
            </div>
          </div>

          <div className="pedido-items">
            {pedido.items.map((item) => (
              <div className="pedido-item" key={item.id_pedido_detalle}>
                <div>
                  <strong>{item.nombre_producto}</strong>
                  <p>
                    {item.color} · Talla {item.talla} · Cantidad {item.cantidad}
                  </p>
                </div>

                <span>{item.subtotal} Bs</span>
              </div>
            ))}
          </div>

          <div className="pedido-footer">
            <div>
              <span>Total para tu empresa</span>
              <strong>{pedido.total_para_esta_empresa} Bs</strong>
            </div>

            {pedido.pago && (
              <div>
                <span>Método de pago</span>
                <strong>{pedido.pago.metodo_pago}</strong>
              </div>
            )}

            {pedido.cliente?.telefono && (
              <div>
                <span>Teléfono cliente</span>
                <strong>{pedido.cliente.telefono}</strong>
              </div>
            )}
          </div>

                <div className="pedido-acciones">
  {pedido.pago?.estado_pago === "EN_REVISION" && (
    <>
      <button
        type="button"
        className="btn-aprobar-pago"
        onClick={() => aprobarPagoPedido(pedido)}
      >
        Aprobar pago
      </button>

      <button
        type="button"
        className="btn-rechazar-pago"
        onClick={() => rechazarPagoPedido(pedido)}
      >
        Rechazar pago
      </button>
    </>
  )}

  {pedido.pago?.estado_pago === "PAGADO" &&
    pedido.estado_pedido !== "ENTREGADO" &&
    pedido.estado_pedido !== "CANCELADO" && (
      <button
        type="button"
        className="btn-entregar-pedido"
        onClick={() => cambiarEstadoPedidoEmpresa(pedido, "ENTREGADO")}
      >
        Marcar como entregado
      </button>
    )}

  {pedido.estado_pedido !== "ENTREGADO" &&
    pedido.estado_pedido !== "CANCELADO" && (
      <button
        type="button"
        className="btn-cancelar-pedido"
        onClick={() => cambiarEstadoPedidoEmpresa(pedido, "CANCELADO")}
      >
        Cancelar pedido
      </button>
    )}

  {pedido.estado_pedido === "ENTREGADO" && (
    <span className="pedido-finalizado">
      Pedido finalizado
    </span>
  )}

  {pedido.estado_pedido === "CANCELADO" && (
    <span className="pedido-cancelado">
      Pedido cancelado
    </span>
  )}
</div>

        </article>
      ))}
    </div>
  </div>
)}

{seccionEmpresa === "pagos" && (
  <div className="empresa-section">
    <div className="section-header">
      <div>
        <span>Gestión de pagos</span>
        <h2>Pagos recibidos</h2>
      </div>

      <div className="empresa-header-actions-mini">
        <button type="button" onClick={cargarPagosEmpresa}>
          Actualizar
        </button>
        <button type="button" onClick={() => setSeccionEmpresa("pedidos")}>
          Ir a pedidos
        </button>
      </div>
    </div>

    {cargandoPagos && <p className="estado-carga">Cargando pagos...</p>}

    {errorPagos && <p className="estado-error">{errorPagos}</p>}

    <form className="qr-pago-card" onSubmit={actualizarQrPagoEmpresa}>
      <div className="qr-pago-info">
        <span>QR de pago de mi tienda</span>
        <h3>Configura el QR para recibir pagos</h3>
        <p>
          Este QR será mostrado al cliente cuando realice un pedido para que pueda
          depositar y luego subir su comprobante.
        </p>

        {mensajeQrPago && (
          <div className={`mensaje-producto ${tipoMensajeQrPago}`}>
            {mensajeQrPago}
          </div>
        )}

        <div className="qr-pago-acciones">
          <label className="qr-upload-label">
            Carga tu QR aquí
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => setQrPagoArchivo(e.target.files[0] || null)}
            />
          </label>

          <button type="submit" className="btn-panel-principal">
            Actualizar QR
          </button>
        </div>

        {qrPagoArchivo && (
          <p className="qr-archivo-seleccionado">
            Archivo seleccionado: <strong>{qrPagoArchivo.name}</strong>
          </p>
        )}
      </div>

      <div className="qr-pago-preview">
        {(cuentaEmpresaActual.qr_pago_url || usuario.qr_pago_url) ? (
          <button
            type="button"
            onClick={() =>
              setComprobanteViendo(
                obtenerUrlImagen(cuentaEmpresaActual.qr_pago_url || usuario.qr_pago_url)
              )
            }
            title="Ver QR en grande"
          >
            <img
              src={obtenerUrlImagen(cuentaEmpresaActual.qr_pago_url || usuario.qr_pago_url)}
              alt="QR de pago de la empresa"
            />
          </button>
        ) : (
          <div>
            <strong>Sin QR</strong>
            <p>Aún no subiste el QR de pago de tu tienda.</p>
          </div>
        )}
      </div>
    </form>

    <div className="pagos-resumen">
      <article>
        <span>Total recibido</span>
        <strong>{totalPagado} Bs</strong>
        <p>Pagos aprobados</p>
      </article>

      <article>
        <span>En revisión</span>
        <strong>{totalEnRevision}</strong>
        <p>Pagos pendientes</p>
      </article>

      <article>
        <span>Rechazados</span>
        <strong>{totalRechazados}</strong>
        <p>Pagos no aprobados</p>
      </article>
    </div>

    <div className="filtros-pagos">
      <button
        type="button"
        className={filtroPagos === "TODOS" ? "activo" : ""}
        onClick={() => setFiltroPagos("TODOS")}
      >
        Todos
      </button>

      <button
        type="button"
        className={filtroPagos === "EN_REVISION" ? "activo" : ""}
        onClick={() => setFiltroPagos("EN_REVISION")}
      >
        En revisión
      </button>

      <button
        type="button"
        className={filtroPagos === "PAGADO" ? "activo" : ""}
        onClick={() => setFiltroPagos("PAGADO")}
      >
        Pagados
      </button>

      <button
        type="button"
        className={filtroPagos === "RECHAZADO" ? "activo" : ""}
        onClick={() => setFiltroPagos("RECHAZADO")}
      >
        Rechazados
      </button>
    </div>

    {!cargandoPagos && pagosFiltrados.length === 0 && (
      <div className="vacio-card">
        <h3>No hay pagos para mostrar</h3>
        <p>
          Cuando los clientes registren pagos por productos de tu tienda,
          aparecerán aquí.
        </p>
      </div>
    )}

    <div className="pagos-lista">
      {pagosFiltrados.map((item) => (
        <article className="pago-card" key={`${item.id_pedido}-${item.pago.id_pago}`}>
          <div className="pago-card-header">
            <div>
              <span>Pedido #{item.id_pedido}</span>
              <h3>
                {item.cliente?.nombre || "Cliente"}{" "}
                {item.cliente?.apellido || ""}
              </h3>
              <p>{item.cliente?.email || "Sin correo registrado"}</p>
            </div>

            <strong className={`pago-estado ${item.pago.estado_pago}`}>
              {item.pago.estado_pago}
            </strong>
          </div>

          <div className="pago-info-grid">
            <div>
              <span>Monto</span>
              <strong>{item.total_para_esta_empresa} Bs</strong>
            </div>

            <div>
              <span>Método</span>
              <strong>{item.pago.metodo_pago}</strong>
            </div>

            <div>
              <span>Pedido</span>
              <strong>{item.estado_pedido}</strong>
            </div>
          </div>

          <div className="pago-productos">
            {item.items.map((producto) => (
              <div key={producto.id_pedido_detalle}>
                <strong>{producto.nombre_producto}</strong>
                <p>
                  {producto.color} · Talla {producto.talla} · Cantidad{" "}
                  {producto.cantidad}
                </p>
              </div>
            ))}
          </div>

          <div className="pago-comprobante-box">
            <div>
              <span>Comprobante del cliente</span>
              <strong>
                {item.pago.comprobante_url ? "Comprobante recibido" : "Sin comprobante"}
              </strong>
              <p>
                {item.pago.comprobante_url
                  ? "Revisa la imagen antes de aprobar o rechazar el pago."
                  : "El cliente todavía no subió un comprobante para este pago."}
              </p>
            </div>

            {item.pago.comprobante_url && (
              <button
                type="button"
                onClick={() =>
                  setComprobanteViendo(obtenerUrlImagen(item.pago.comprobante_url))
                }
              >
                Ver comprobante
              </button>
            )}
          </div>

          {item.pago.estado_pago === "EN_REVISION" && (
            <div className="pedido-acciones">
              <button
                type="button"
                className="btn-aprobar-pago"
                onClick={() => aprobarPagoPedido(item)}
              >
                Aprobar pago
              </button>

              <button
                type="button"
                className="btn-rechazar-pago"
                onClick={() => rechazarPagoPedido(item)}
              >
                Rechazar pago
              </button>
            </div>
          )}
        </article>
      ))}
    </div>
  </div>
)}

        {seccionEmpresa === "registrar" && (
          <div className="empresa-section">
            <div className="section-header">
              <div>
                <span>Nuevo producto</span>
                <h2>Registrar prenda</h2>
              </div>
            </div>

            <ProductoForm
              tituloBoton="Guardar producto"
              producto={nuevoProducto}
              categorias={categorias}
              mostrarCategoriaOtro={true}
              nuevaCategoria={nuevaCategoria}
              setNuevaCategoria={setNuevaCategoria}
              imagen={imagenProducto}
              setImagen={setImagenProducto}
              mensaje={mensajeProducto}
              tipoMensaje={tipoMensajeProducto}
              onChange={cambiarNuevoProducto}
              onSubmit={registrarProductoEmpresa}
              onCancel={() => setSeccionEmpresa("vista")}
            />
          </div>
        )}

        {seccionEmpresa === "editar" && productoEditando && (
          <div className="empresa-section">
            <div className="section-header">
              <div>
                <span>Editar producto</span>
                <h2>{productoEditando.nombre_producto}</h2>
              </div>

              <button type="button" onClick={() => setSeccionEmpresa("productos")}>
                Volver
              </button>
            </div>

            <ProductoForm
  tituloBoton="Guardar cambios"
  producto={productoEditar}
  categorias={categorias}
  mostrarCategoriaOtro={false}
  imagen={imagenEditando}
  setImagen={setImagenEditando}
  mensaje={mensajeEdicion}
  tipoMensaje={tipoMensajeEdicion}
  onChange={cambiarProductoEditar}
  onSubmit={guardarEdicionProducto}
  onCancel={() => setSeccionEmpresa("productos")}
>
  <div className="variantes-editor">
    <div className="variantes-header">
      <div>
        <span>Variantes del producto</span>
        <h3>Colores, tallas y stock</h3>
      </div>
    </div>

    {mensajeVariante && (
      <div className={`mensaje-producto ${tipoMensajeVariante}`}>
        {mensajeVariante}
      </div>
    )}

    <div className="variantes-lista">
      {variantesEditando.length === 0 && (
        <div className="vacio-card">
          <h3>No hay variantes registradas</h3>
          <p>Agrega al menos una variante con color, talla y stock.</p>
        </div>
      )}

      {variantesEditando.filter(Boolean).map((variante) => (
        <div className="variante-editor-card" key={variante.id_variante}>
          <div className="variante-color-preview">
            <i
              style={{
                backgroundColor: obtenerColorHex(variante.color || "")
              }}
            ></i>
          </div>

          <div className="campo-panel campo-opciones">
            <label>Color</label>
            <select
              value={obtenerValorSelectEmpresa(variante.color, COLORES_PREDETERMINADOS_EMPRESA)}
              onChange={(e) =>
                cambiarVarianteEditando(
                  variante.id_variante,
                  "color",
                  e.target.value === VALOR_OTRO_EMPRESA ? VALOR_OTRO_EMPRESA : e.target.value
                )
              }
            >
              <option value="">Seleccionar color</option>
              {COLORES_PREDETERMINADOS_EMPRESA.map((color) => (
                <option key={color} value={color}>{color}</option>
              ))}
              <option value={VALOR_OTRO_EMPRESA}>Otro / escribir manualmente</option>
            </select>
            {mostrarInputOtroEmpresa(variante.color, COLORES_PREDETERMINADOS_EMPRESA) && (
              <input
                className="campo-otro-input"
                value={variante.color === VALOR_OTRO_EMPRESA ? "" : variante.color || ""}
                onChange={(e) =>
                  cambiarVarianteEditando(
                    variante.id_variante,
                    "color",
                    e.target.value
                  )
                }
                placeholder="Escribe el color personalizado"
              />
            )}
          </div>

          <div className="campo-panel campo-opciones">
            <label>Talla</label>
            <select
              value={obtenerValorSelectEmpresa(variante.talla, obtenerTallasEmpresa(productoEditar.genero))}
              onChange={(e) =>
                cambiarVarianteEditando(
                  variante.id_variante,
                  "talla",
                  e.target.value === VALOR_OTRO_EMPRESA ? VALOR_OTRO_EMPRESA : e.target.value
                )
              }
            >
              <option value="">Seleccionar talla</option>
              {obtenerTallasEmpresa(productoEditar.genero).map((talla) => (
                <option key={talla} value={talla}>{talla}</option>
              ))}
              <option value={VALOR_OTRO_EMPRESA}>Otra / escribir manualmente</option>
            </select>
            {mostrarInputOtroEmpresa(variante.talla, obtenerTallasEmpresa(productoEditar.genero)) && (
              <input
                className="campo-otro-input"
                value={variante.talla === VALOR_OTRO_EMPRESA ? "" : variante.talla || ""}
                onChange={(e) =>
                  cambiarVarianteEditando(
                    variante.id_variante,
                    "talla",
                    e.target.value
                  )
                }
                placeholder="Escribe la talla personalizada"
              />
            )}
          </div>

          <div className="campo-panel">
            <label>Stock</label>
            <input
              value={variante.stock ?? ""}
              onChange={(e) =>
                cambiarVarianteEditando(
                  variante.id_variante,
                  "stock",
                  e.target.value
                )
              }
              inputMode="numeric"
              placeholder="Ej: 10"
            />
          </div>

          <div className="acciones-variante">
            <button
              type="button"
              className="btn-panel-principal"
              onClick={() => guardarVarianteExistente(variante)}
            >
              Guardar
            </button>

            <button
              type="button"
              className={
                variante.disponible
                  ? "btn-desactivar-producto"
                  : "btn-activar-producto"
              }
              onClick={() => cambiarEstadoVariante(variante)}
            >
              {variante.disponible ? "Desactivar" : "Activar"}
            </button>
          </div>
        </div>
      ))}
    </div>

    <div className="nueva-variante-card">
      <h3>Agregar nueva variante</h3>

      <div className="form-grid">
        <div className="campo-panel campo-opciones">
          <label>Color</label>
          <select
            value={obtenerValorSelectEmpresa(nuevaVariante.color, COLORES_PREDETERMINADOS_EMPRESA)}
            onChange={(e) =>
              setNuevaVariante({
                ...nuevaVariante,
                color: e.target.value === VALOR_OTRO_EMPRESA ? VALOR_OTRO_EMPRESA : e.target.value
              })
            }
          >
            <option value="">Seleccionar color</option>
            {COLORES_PREDETERMINADOS_EMPRESA.map((color) => (
              <option key={color} value={color}>{color}</option>
            ))}
            <option value={VALOR_OTRO_EMPRESA}>Otro / escribir manualmente</option>
          </select>
          {mostrarInputOtroEmpresa(nuevaVariante.color, COLORES_PREDETERMINADOS_EMPRESA) && (
            <input
              className="campo-otro-input"
              value={nuevaVariante.color === VALOR_OTRO_EMPRESA ? "" : nuevaVariante.color}
              onChange={(e) =>
                setNuevaVariante({
                  ...nuevaVariante,
                  color: e.target.value
                })
              }
              placeholder="Escribe el color personalizado"
            />
          )}
        </div>

        <div className="campo-panel campo-opciones">
          <label>Talla</label>
          <select
            value={obtenerValorSelectEmpresa(nuevaVariante.talla, obtenerTallasEmpresa(productoEditar.genero))}
            onChange={(e) =>
              setNuevaVariante({
                ...nuevaVariante,
                talla: e.target.value === VALOR_OTRO_EMPRESA ? VALOR_OTRO_EMPRESA : e.target.value
              })
            }
          >
            <option value="">Seleccionar talla</option>
            {obtenerTallasEmpresa(productoEditar.genero).map((talla) => (
              <option key={talla} value={talla}>{talla}</option>
            ))}
            <option value={VALOR_OTRO_EMPRESA}>Otra / escribir manualmente</option>
          </select>
          {mostrarInputOtroEmpresa(nuevaVariante.talla, obtenerTallasEmpresa(productoEditar.genero)) && (
            <input
              className="campo-otro-input"
              value={nuevaVariante.talla === VALOR_OTRO_EMPRESA ? "" : nuevaVariante.talla}
              onChange={(e) =>
                setNuevaVariante({
                  ...nuevaVariante,
                  talla: e.target.value
                })
              }
              placeholder="Escribe la talla personalizada"
            />
          )}
        </div>

        <div className="campo-panel">
          <label>Stock</label>
          <input
            value={nuevaVariante.stock}
            onChange={(e) =>
              setNuevaVariante({
                ...nuevaVariante,
                stock: e.target.value.replace(/\D/g, "")
              })
            }
            inputMode="numeric"
            placeholder="Ej: 8"
          />
        </div>
      </div>

      <button
        type="button"
        className="btn-panel-principal"
        onClick={agregarNuevaVariante}
      >
        Agregar variante
      </button>
    </div>
  </div>
</ProductoForm>
          </div>
        )}

        {seccionEmpresa === "ver" && productoViendo && (
          <ProductoDetalle
            producto={productoViendo}
            onVolver={() => setSeccionEmpresa(volverDetalleA)}
          />
        )}

        {seccionEmpresa === "informacion" && (
  <div className="empresa-section">
    <div className="section-header">
      <div>
        <span>Resumen empresarial</span>
        <h2>Estado general de mi tienda</h2>
      </div>

      <button
        type="button"
        onClick={() => {
          cargarProductosEmpresa();
          cargarPedidosEmpresa();
          cargarPagosEmpresa();
        }}
      >
        Actualizar resumen
      </button>
    </div>

    <div className="resumen-grid">
      <article className="resumen-card principal">
        <span>Total vendido</span>
        <strong>{totalVendidoResumen} Bs</strong>
        <p>Ingresos confirmados por pagos aprobados.</p>
      </article>

      <article className="resumen-card">
        <span>Productos</span>
        <strong>{totalProductosResumen}</strong>
        <p>{productosActivosResumen} activos · {productosInactivosResumen} inactivos</p>
      </article>

      <article className="resumen-card">
        <span>Categorías</span>
        <strong>{categoriasResumen}</strong>
        <p>Categorías usadas en tu catálogo.</p>
      </article>

      <article className="resumen-card">
        <span>Pedidos</span>
        <strong>{pedidosResumen}</strong>
        <p>Pedidos recibidos para tu empresa.</p>
      </article>

      <article className="resumen-card alerta">
        <span>Stock bajo</span>
        <strong>{productosBajoStockResumen}</strong>
        <p>Productos con alguna variante con stock menor o igual a 3.</p>
      </article>

      <article className="resumen-card revision">
        <span>Pagos en revisión</span>
        <strong>{pagosRevisionResumen}</strong>
        <p>Pagos pendientes de aprobación.</p>
      </article>
    </div>

    <div className="resumen-dos-columnas">
      <article className="resumen-panel">
        <div className="resumen-panel-header">
          <div>
            <span>Últimos pedidos</span>
            <h3>Actividad reciente</h3>
          </div>
        </div>

        {ultimosPedidosResumen.length === 0 ? (
          <p className="resumen-vacio">
            Todavía no hay pedidos recientes para mostrar.
          </p>
        ) : (
          <div className="resumen-lista">
            {ultimosPedidosResumen.map((pedido) => (
              <div className="resumen-item" key={pedido.id_pedido}>
                <div>
                  <strong>Pedido #{pedido.id_pedido}</strong>
                  <p>
                    {pedido.cliente?.nombre || "Cliente"}{" "}
                    {pedido.cliente?.apellido || ""} · {pedido.estado_pedido}
                  </p>
                </div>

                <span>{pedido.total_para_esta_empresa} Bs</span>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="resumen-panel">
        <div className="resumen-panel-header">
          <div>
            <span>Estado de la tienda</span>
            <h3>{cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa}</h3>
          </div>
        </div>

        <div className="resumen-estado-tienda">
          <div>
            <span>Estado</span>
            <strong>{usuario.estado_empresa || "SIN ESTADO"}</strong>
          </div>

          <div>
            <span>Responsable</span>
            <strong>
              {usuario.nombre || "Sin nombre"} {usuario.apellido || ""}
            </strong>
          </div>

          <div>
            <span>Correo</span>
            <strong>{usuario.email || "Sin correo"}</strong>
          </div>
        </div>

        <p className="resumen-nota">
          Los datos públicos de tu marca, descripción, contacto y foto de perfil
          los configuraremos en la sección Mi cuenta.
        </p>
      </article>
    </div>
  </div>
)}

{seccionEmpresa === "soporte" && renderSoporte()}

        {seccionEmpresa === "cuenta" && (
  <div className="empresa-section">
    <div className="section-header">
      <div>
        <span>Cuenta empresarial</span>
        <h2>Mi cuenta</h2>
      </div>

      {!editandoCuenta && (
        <button
          type="button"
          onClick={() => {
            sincronizarCuentaConUsuario();
            setEditandoCuenta(true);
          }}
        >
          Editar datos
        </button>
      )}
    </div>

    {mensajeCuenta && (
      <div className={`mensaje-producto ${tipoMensajeCuenta}`}>
        {mensajeCuenta}
      </div>
    )}

    {!editandoCuenta ? (
      <div className="cuenta-grid">
        <article className="cuenta-perfil-card">
          <div className="cuenta-logo-preview">
            {(cuentaEmpresaActual?.logo_url || usuario.logo_url) ? (
              <img
                src={obtenerUrlImagen(cuentaEmpresaActual?.logo_url || usuario.logo_url)}
                alt={cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa}
              />
            ) : (
              <span>{(cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa)?.charAt(0) || "Z"}</span>
            )}
          </div>

          <span>Marca</span>
          <h3>{cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa}</h3>

          <p>
            {cuentaEmpresaActual?.descripcion || usuario.descripcion ||
              "Aún no agregaste una descripción pública para tu tienda."}
          </p>

          <strong>{cuentaEmpresaActual?.estado_empresa || usuario.estado_empresa}</strong>
        </article>

        <article className="cuenta-info-card">
          <span>Responsable</span>
          <strong>
            {usuario.nombre || "Sin nombre"} {usuario.apellido || ""}
          </strong>
          <p>Persona encargada de administrar la tienda.</p>
        </article>

        <article className="cuenta-info-card">
          <span>Correo de acceso</span>
          <strong>{usuario.email}</strong>
          <p>Correo usado para iniciar sesión.</p>
        </article>

        <article className="cuenta-info-card">
          <span>Teléfono</span>
          <strong>{usuario.telefono || "No registrado"}</strong>
          <p>Número de contacto general.</p>
        </article>

        <article className="cuenta-info-card">
          <span>WhatsApp</span>
          <strong>{usuario.whatsapp || "No registrado"}</strong>
          <p>Contacto visible para clientes.</p>
        </article>

        <article className="cuenta-info-card">
          <span>Dirección</span>
          <strong>{usuario.direccion || "No registrada"}</strong>
          <p>{usuario.ciudad || "La Paz"}</p>
        </article>

        <article className="cuenta-info-card">
          <span>NIT</span>
          <strong>{usuario.nit || "No registrado"}</strong>
          <p>Dato tributario opcional.</p>
        </article>

        <article className="cuenta-info-card">
          <span>Redes sociales</span>
          <strong>
            {cuentaEmpresaActual?.instagram || usuario.instagram || cuentaEmpresaActual?.facebook || usuario.facebook || "No registradas"}
          </strong>
          <p>Instagram o Facebook de la marca.</p>
        </article>

        <article className="cuenta-info-card cuenta-tema-card" style={obtenerEstiloTienda(cuentaEmpresaActual || usuario)}>
          <span>Identidad visual</span>
          <strong>{obtenerTemaNombre(cuentaEmpresaActual?.tema_tienda || usuario.tema_tienda || "elegante")}</strong>
          <div className="cuenta-paleta-mini">
            <i style={{ background: cuentaEmpresaActual?.color_principal || usuario.color_principal || COLOR_TIENDA_DEFAULT.color_principal }} />
            <i style={{ background: cuentaEmpresaActual?.color_secundario || usuario.color_secundario || COLOR_TIENDA_DEFAULT.color_secundario }} />
            <i style={{ background: cuentaEmpresaActual?.color_acento || usuario.color_acento || COLOR_TIENDA_DEFAULT.color_acento }} />
            <i style={{ background: cuentaEmpresaActual?.color_fondo || usuario.color_fondo || COLOR_TIENDA_DEFAULT.color_fondo }} />
          </div>
          <p>Colores que verá el cliente al abrir tu tienda.</p>
        </article>

        <article className="cuenta-info-card">
          <span>Ubicación</span>
          <strong>{cuentaEmpresaActual?.google_maps_url || usuario.google_maps_url ? "Mapa registrado" : "No registrada"}</strong>
          <p>{cuentaEmpresaActual?.google_maps_url || usuario.google_maps_url ? "La tienda tiene un enlace de ubicación." : "Puedes agregar un enlace de Google Maps al editar."}</p>
        </article>
      </div>
    ) : (
      <form className="cuenta-form" onSubmit={guardarCuentaEmpresa}>
        <div className="cuenta-edicion-layout">
          <div className="cuenta-logo-editor">
            <div className="cuenta-logo-preview grande">
              {logoCuenta ? (
                <img
                  src={URL.createObjectURL(logoCuenta)}
                  alt="Vista previa"
                />
              ) : (cuentaEmpresaActual?.logo_url || usuario.logo_url) ? (
                <img
                  src={obtenerUrlImagen(cuentaEmpresaActual?.logo_url || usuario.logo_url)}
                  alt={cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa}
                />
              ) : (
                <span>{(cuentaEmpresaActual?.nombre_empresa || usuario.nombre_empresa)?.charAt(0) || "Z"}</span>
              )}
            </div>

            <label>Foto o logo de la marca</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => setLogoCuenta(e.target.files[0])}
            />
          </div>

          <div className="cuenta-campos">
            <div className="form-grid">
              <div className="campo-panel">
                <label>Nombre del responsable *</label>
                <input
                  name="nombre"
                  value={cuentaForm.nombre}
                  onChange={cambiarCuentaForm}
                />
              </div>

              <div className="campo-panel">
                <label>Apellido</label>
                <input
                  name="apellido"
                  value={cuentaForm.apellido}
                  onChange={cambiarCuentaForm}
                />
              </div>

              <div className="campo-panel">
                <label>Correo *</label>
                <input
                  name="email"
                  type="email"
                  value={cuentaForm.email}
                  onChange={cambiarCuentaForm}
                />
              </div>

              <div className="campo-panel">
                <label>Nombre de la empresa *</label>
                <input
                  name="nombre_empresa"
                  value={cuentaForm.nombre_empresa}
                  onChange={cambiarCuentaForm}
                />
              </div>

              <div className="campo-panel">
                <label>Teléfono</label>
                <input
                  name="telefono"
                  value={cuentaForm.telefono}
                  onChange={cambiarCuentaForm}
                  maxLength="8"
                  inputMode="numeric"
                />
              </div>

              <div className="campo-panel">
                <label>WhatsApp *</label>
                <input
                  name="whatsapp"
                  value={cuentaForm.whatsapp}
                  onChange={cambiarCuentaForm}
                  maxLength="8"
                  inputMode="numeric"
                />
              </div>

              <div className="campo-panel">
                <label>NIT</label>
                <input
                  name="nit"
                  value={cuentaForm.nit}
                  onChange={cambiarCuentaForm}
                />
              </div>

              <div className="campo-panel">
                <label>Ciudad</label>
                <input
                  name="ciudad"
                  value={cuentaForm.ciudad}
                  onChange={cambiarCuentaForm}
                />
              </div>
            </div>

            <div className="campo-panel">
              <label>Dirección</label>
              <input
                name="direccion"
                value={cuentaForm.direccion}
                onChange={cambiarCuentaForm}
              />
            </div>

            <div className="campo-panel">
              <label>Ubicación de Google Maps</label>
              <input
                name="google_maps_url"
                value={cuentaForm.google_maps_url}
                onChange={cambiarCuentaForm}
                placeholder="Pega aquí el enlace de ubicación de tu tienda"
              />
            </div>

            <div className="campo-panel">
              <label>Descripción pública de la tienda</label>
              <textarea
                name="descripcion"
                value={cuentaForm.descripcion}
                onChange={cambiarCuentaForm}
                placeholder="Ej: Somos una tienda de moda urbana en La Paz, con prendas modernas, cómodas y seleccionadas para cada estilo."
              />
            </div>

            <div className="form-grid">
              <div className="campo-panel">
                <label>Instagram</label>
                <input
                  name="instagram"
                  value={cuentaForm.instagram}
                  onChange={cambiarCuentaForm}
                  placeholder="@mi_tienda"
                />
              </div>

              <div className="campo-panel">
                <label>Facebook</label>
                <input
                  name="facebook"
                  value={cuentaForm.facebook}
                  onChange={cambiarCuentaForm}
                  placeholder="facebook.com/mi_tienda"
                />
              </div>
            </div>

            <div className="cuenta-personalizacion-box" style={obtenerEstiloTienda(cuentaForm)}>
              <div className="cuenta-personalizacion-header">
                <div>
                  <span>Personalización de tienda</span>
                  <h3>Colores y tema visual</h3>
                  <p>Estos colores se usarán cuando el cliente vea tu tienda.</p>
                </div>
                <strong>{obtenerTemaNombre(cuentaForm.tema_tienda)}</strong>
              </div>

              <div className="form-grid">
                <div className="campo-panel color-picker-field">
                  <label>Color principal</label>
                  <input type="color" name="color_principal" value={cuentaForm.color_principal} onChange={cambiarCuentaForm} />
                </div>

                <div className="campo-panel color-picker-field">
                  <label>Color secundario</label>
                  <input type="color" name="color_secundario" value={cuentaForm.color_secundario} onChange={cambiarCuentaForm} />
                </div>

                <div className="campo-panel color-picker-field">
                  <label>Color de acento</label>
                  <input type="color" name="color_acento" value={cuentaForm.color_acento} onChange={cambiarCuentaForm} />
                </div>

                <div className="campo-panel color-picker-field">
                  <label>Color de fondo</label>
                  <input type="color" name="color_fondo" value={cuentaForm.color_fondo} onChange={cambiarCuentaForm} />
                </div>
              </div>

              <div className="campo-panel">
                <label>Tema visual</label>
                <select name="tema_tienda" value={cuentaForm.tema_tienda} onChange={cambiarCuentaForm}>
                  {TEMAS_TIENDA.map((tema) => (
                    <option key={tema.id} value={tema.id}>{tema.nombre} - {tema.descripcion}</option>
                  ))}
                </select>
              </div>

              <div className={`tienda-preview-personalizada tema-${cuentaForm.tema_tienda || "elegante"}`}>
                <div className="tienda-preview-deco" />
                <div className="tienda-preview-logo">
                  {logoCuenta ? (
                    <img src={URL.createObjectURL(logoCuenta)} alt="Vista previa" />
                  ) : (cuentaEmpresaActual?.logo_url || usuario.logo_url) ? (
                    <img src={obtenerUrlImagen(cuentaEmpresaActual?.logo_url || usuario.logo_url)} alt={cuentaForm.nombre_empresa || "Tienda"} />
                  ) : (
                    <span>{cuentaForm.nombre_empresa?.charAt(0) || "Z"}</span>
                  )}
                </div>
                <div>
                  <span>Vista previa pública</span>
                  <h3>{cuentaForm.nombre_empresa || "Nombre de tu tienda"}</h3>
                  <p>{cuentaForm.descripcion || "Descripción breve de la tienda para tus clientes."}</p>
                  <button type="button">Ver productos</button>
                </div>
              </div>
            </div>

            <div className="cuenta-password-box">
              <div>
                <span>Seguridad</span>
                <h3>Contraseña</h3>
                <p>
                  Tu contraseña actual se mantiene igual si no decides cambiarla.
                </p>
              </div>

              <button
                type="button"
                className="btn-panel-secundario"
                onClick={() => setMostrarCambioPassword(!mostrarCambioPassword)}
              >
                {mostrarCambioPassword ? "Cancelar cambio" : "Cambiar contraseña"}
              </button>
            </div>

            {mostrarCambioPassword && (
              <div className="password-cambio-panel">
                <div className="form-grid">
                  <div className="campo-panel">
                    <label>Contraseña actual</label>
                    <input
                      type="password"
                      name="password_actual"
                      value={passwordCuenta.password_actual}
                      onChange={cambiarPasswordCuenta}
                    />
                  </div>

                  <div className="campo-panel">
  <label>Nueva contraseña</label>

  <div className="password-input-panel">
    <input
      type={mostrarNuevaPassword ? "text" : "password"}
      name="password_nueva"
      value={passwordCuenta.password_nueva}
      onChange={cambiarPasswordCuenta}
    />

    <button
      type="button"
      className="btn-ojo-password"
      onClick={() => setMostrarNuevaPassword(!mostrarNuevaPassword)}
      aria-label="Mostrar u ocultar nueva contraseña"
    >
      <EyeIcon />
    </button>
  </div>
</div>

<div className="campo-panel">
  <label>Confirmar nueva contraseña</label>

  <div className="password-input-panel">
    <input
      type={mostrarConfirmarPassword ? "text" : "password"}
      name="confirmar_password"
      value={passwordCuenta.confirmar_password}
      onChange={cambiarPasswordCuenta}
    />

    <button
      type="button"
      className="btn-ojo-password"
      onClick={() => setMostrarConfirmarPassword(!mostrarConfirmarPassword)}
      aria-label="Mostrar u ocultar confirmación de contraseña"
    >
      <EyeIcon />
    </button>
  </div>
</div>
                </div>

                <button
                  type="button"
                  className="btn-panel-principal"
                  onClick={guardarNuevaPassword}
                >
                  Guardar nueva contraseña
                </button>
              </div>
            )}

            <div className="acciones-form">
              <button type="submit" className="btn-panel-principal">
                Guardar cambios
              </button>

              <button
                type="button"
                className="btn-panel-secundario"
                onClick={() => {
                  setEditandoCuenta(false);
                  sincronizarCuentaConUsuario();
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </form>
    )}
  </div>
)}

        {comprobanteViendo && (
          <div
            className="comprobante-modal-fondo"
            onClick={() => setComprobanteViendo(null)}
          >
            <div className="comprobante-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="comprobante-modal-cerrar"
                onClick={() => setComprobanteViendo(null)}
              >
                ×
              </button>

              <img src={comprobanteViendo} alt="Comprobante o QR de pago" />
            </div>
          </div>
        )}

        {seccionEmpresa !== "vista" &&
        seccionEmpresa !== "productos" &&
        seccionEmpresa !== "registrar" &&
        seccionEmpresa !== "editar" &&
        seccionEmpresa !== "ver" &&
        seccionEmpresa !== "pedidos" && 
        seccionEmpresa !== "pagos" && 
        seccionEmpresa !== "cuenta" &&
        seccionEmpresa !== "soporte" &&
        seccionEmpresa !== "informacion" && (

        
            <div className="empresa-section">
              <div className="vacio-card">
                <h3>Sección en construcción</h3>
                <p>
                  Aquí construiremos la parte de {seccionEmpresa}. Iremos módulo
                  por módulo para que quede ordenado y profesional.
                </p>
              </div>
            </div>
          )}
      </section>
    </main>
  );
}