import { useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/layout/PortalLayout";

const API_URL = "http://127.0.0.1:8000";

const obtenerUrlImagen = (url) => {
  if (!url) return null;

  if (url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return `${API_URL}/uploads/productos/${url}`;
};

const obtenerColorHex = (color) => {
  if (!color) return "#cbd5e1";

  const colores = {
    negro: "#111827",
    blanco: "#ffffff",
    rojo: "#ef4444",
    azul: "#2563eb",
    verde: "#16a34a",
    amarillo: "#facc15",
    naranja: "#f97316",
    rosado: "#ec4899",
    rosa: "#ec4899",
    morado: "#9333ea",
    lila: "#a855f7",
    cafe: "#92400e",
    café: "#92400e",
    marron: "#92400e",
    gris: "#6b7280",
    beige: "#d6b98c",
    celeste: "#38bdf8",
    vino: "#7f1d1d"
  };

  return colores[color.toLowerCase().trim()] || "#cbd5e1";
};

const obtenerNotificacionesBackend = async (idUsuario) => {
  const respuesta = await fetch(`${API_URL}/usuario/${idUsuario}/notificaciones`);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudieron cargar las notificaciones.");
  }

  return datos.notificaciones || [];
};

const marcarNotificacionBackendLeida = async (idNotificacion, idUsuario) => {
  const respuesta = await fetch(
    `${API_URL}/usuario/notificaciones/${idNotificacion}/leer?id_usuario=${idUsuario}`,
    { method: "PUT" }
  );

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudo marcar la notificación como leída.");
  }

  return datos;
};

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L23 6H6" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function UserCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}


export default function ClientePanel({ usuario, onVolver, onCerrarSesion }) {
  const [seccionCliente, setSeccionCliente] = useState("inicio");
  const [usuarioCliente, setUsuarioCliente] = useState(usuario || {});


  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [errorProductos, setErrorProductos] = useState("");

  const [detalleProducto, setDetalleProducto] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [imagenGrande, setImagenGrande] = useState(null);
  const [varianteSeleccionada, setVarianteSeleccionada] = useState(null);
  const [cantidadDetalle, setCantidadDetalle] = useState(1);

  const [carritoCliente, setCarritoCliente] = useState({
    total_productos: 0,
    total: 0,
    items: []
  });
  const [cargandoCarrito, setCargandoCarrito] = useState(false);
  const [errorCarrito, setErrorCarrito] = useState("");
  const [mensajeCarrito, setMensajeCarrito] = useState("");
  const [toastCliente, setToastCliente] = useState(null);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);
  const [notificacionesClienteLeidas, setNotificacionesClienteLeidas] = useState([]);
  const [notificacionesClienteRecientes, setNotificacionesClienteRecientes] = useState([]);
  const [notificacionesSistemaCliente, setNotificacionesSistemaCliente] = useState([]);
  const [ticketsSoporte, setTicketsSoporte] = useState([]);
  const [ticketSoporteActivo, setTicketSoporteActivo] = useState(null);
  const [mensajesSoporte, setMensajesSoporte] = useState([]);
  const [nuevoTicketSoporte, setNuevoTicketSoporte] = useState({ asunto: "", descripcion: "" });
  const [respuestaSoporte, setRespuestaSoporte] = useState("");
  const [mensajeSoporte, setMensajeSoporte] = useState("");
  const [tipoMensajeSoporte, setTipoMensajeSoporte] = useState("");
  const [cargandoSoporte, setCargandoSoporte] = useState(false);


  const [pedidosCliente, setPedidosCliente] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [errorPedidos, setErrorPedidos] = useState("");

  const [pedidoPago, setPedidoPago] = useState(null);
  const [cargandoPago, setCargandoPago] = useState(false);
  const [mensajePago, setMensajePago] = useState("");
  const [comprobantePago, setComprobantePago] = useState(null);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  const [editandoCuentaCliente, setEditandoCuentaCliente] = useState(false);
  const [mensajeCuentaCliente, setMensajeCuentaCliente] = useState("");
  const [tipoMensajeCuentaCliente, setTipoMensajeCuentaCliente] = useState("");
  const [fotoCuentaCliente, setFotoCuentaCliente] = useState(null);
  const [mostrarCambioPasswordCliente, setMostrarCambioPasswordCliente] = useState(false);
  const [mostrarNuevaPasswordCliente, setMostrarNuevaPasswordCliente] = useState(false);
  const [mostrarConfirmarPasswordCliente, setMostrarConfirmarPasswordCliente] = useState(false);
  const [cuentaClienteForm, setCuentaClienteForm] = useState({
    nombre: usuario?.nombre || "",
    apellido: usuario?.apellido || "",
    email: usuario?.email || "",
    telefono: usuario?.telefono || ""
  });
  const [passwordClienteForm, setPasswordClienteForm] = useState({
    password_actual: "",
    password_nueva: "",
    confirmar_password: ""
  });

  const [filtros, setFiltros] = useState({
    buscar: "",
    categoria: "",
    tienda: "",
    color: "",
    talla: "",
    precioMin: "",
    precioMax: "",
    soloStock: true
  });

  const menu = [
    { id: "inicio", nombre: "Inicio", icono: "home" },
    { id: "catalogo", nombre: "Catálogo", icono: "catalogo" },
    { id: "buscarImagen", nombre: "Buscar por imagen", icono: "imagen" },
    { id: "carrito", nombre: "Mi carrito", icono: "carrito" },
    { id: "pedidos", nombre: "Mis pedidos", icono: "pedidos" },
    { id: "soporte", nombre: "Soporte", icono: "imagen" },
    { id: "cuenta", nombre: "Mi cuenta", icono: "usuario" }
  ];

  useEffect(() => {
    if (!usuario?.id_usuario) return;

    const guardadas = localStorage.getItem(
      `zyra_notificaciones_cliente_leidas_${usuario.id_usuario}`
    );

    setNotificacionesClienteLeidas(guardadas ? JSON.parse(guardadas) : []);
  }, [usuario?.id_usuario]);

  const cargarNotificacionesSistemaCliente = async () => {
    if (!usuario?.id_usuario) return [];

    const datos = await obtenerNotificacionesBackend(usuario.id_usuario);
    setNotificacionesSistemaCliente(datos);
    return datos;
  };

  useEffect(() => {
    if (!usuario?.id_usuario) return;

    cargarNotificacionesSistemaCliente().catch(() => {});
    const intervalo = setInterval(() => {
      cargarNotificacionesSistemaCliente().catch(() => {});
    }, 25000);

    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id_usuario]);

  useEffect(() => {
    cargarCuentaCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id_usuario]);

  const sincronizarCuentaCliente = (datosUsuario = usuarioCliente) => {
    setCuentaClienteForm({
      nombre: datosUsuario?.nombre || "",
      apellido: datosUsuario?.apellido || "",
      email: datosUsuario?.email || "",
      telefono: datosUsuario?.telefono || ""
    });

    setFotoCuentaCliente(null);
    setMensajeCuentaCliente("");
    setTipoMensajeCuentaCliente("");
    setPasswordClienteForm({
      password_actual: "",
      password_nueva: "",
      confirmar_password: ""
    });
    setMostrarCambioPasswordCliente(false);
    setMostrarNuevaPasswordCliente(false);
    setMostrarConfirmarPasswordCliente(false);
  };

  const cargarCuentaCliente = async () => {
    if (!usuario?.id_usuario) return;

    try {
      const respuesta = await fetch(`${API_URL}/cliente/cuenta/${usuario.id_usuario}`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo cargar la cuenta.");
      }

      const usuarioActualizado = {
        ...usuario,
        ...datos,
        rol: datos.rol || usuario.rol || "CLIENTE"
      };

      setUsuarioCliente(usuarioActualizado);
      localStorage.setItem("usuario_zyra", JSON.stringify(usuarioActualizado));

      if (!editandoCuentaCliente) {
        sincronizarCuentaCliente(usuarioActualizado);
      }
    } catch (error) {
      console.log(error.message || "No se pudo sincronizar la cuenta del cliente.");
    }
  };

  const cambiarCuentaClienteForm = (e) => {
    const { name, value } = e.target;

    if (name === "telefono") {
      setCuentaClienteForm({
        ...cuentaClienteForm,
        [name]: value.replace(/\D/g, "").slice(0, 8)
      });
      return;
    }

    setCuentaClienteForm({
      ...cuentaClienteForm,
      [name]: value
    });
  };

  const guardarCuentaCliente = async (e) => {
    e.preventDefault();

    setMensajeCuentaCliente("");
    setTipoMensajeCuentaCliente("");

    if (!cuentaClienteForm.nombre.trim()) {
      setMensajeCuentaCliente("El nombre es obligatorio.");
      setTipoMensajeCuentaCliente("error");
      return;
    }

    if (!cuentaClienteForm.email.trim()) {
      setMensajeCuentaCliente("El correo es obligatorio.");
      setTipoMensajeCuentaCliente("error");
      return;
    }

    if (cuentaClienteForm.telefono && cuentaClienteForm.telefono.length !== 8) {
      setMensajeCuentaCliente("El teléfono debe tener 8 números.");
      setTipoMensajeCuentaCliente("error");
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/cliente/cuenta/${usuario.id_usuario}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre: cuentaClienteForm.nombre.trim(),
          apellido: cuentaClienteForm.apellido.trim() || null,
          email: cuentaClienteForm.email.trim(),
          telefono: cuentaClienteForm.telefono || null
        })
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudieron guardar tus datos.");
      }

      let usuarioActualizado = {
        ...usuarioCliente,
        ...datos,
        rol: datos.rol || usuarioCliente.rol || "CLIENTE"
      };

      if (fotoCuentaCliente) {
        const formData = new FormData();
        formData.append("archivo", fotoCuentaCliente);

        const respuestaFoto = await fetch(
          `${API_URL}/cliente/cuenta/${usuario.id_usuario}/foto`,
          {
            method: "POST",
            body: formData
          }
        );

        const datosFoto = await respuestaFoto.json().catch(() => ({}));

        if (!respuestaFoto.ok) {
          throw new Error(datosFoto.detail || "Los datos se guardaron, pero no se pudo subir la foto.");
        }

        usuarioActualizado = {
          ...usuarioActualizado,
          foto_url: datosFoto.foto_url
        };
      }

      setUsuarioCliente(usuarioActualizado);
      localStorage.setItem("usuario_zyra", JSON.stringify(usuarioActualizado));
      sincronizarCuentaCliente(usuarioActualizado);
      setEditandoCuentaCliente(false);
      setMensajeCuentaCliente("Datos de la cuenta actualizados correctamente.");
      setTipoMensajeCuentaCliente("ok");
    } catch (error) {
      setMensajeCuentaCliente(error.message || "No se pudieron guardar tus datos.");
      setTipoMensajeCuentaCliente("error");
    }
  };

  const cambiarPasswordClienteForm = (e) => {
    const { name, value } = e.target;

    setPasswordClienteForm({
      ...passwordClienteForm,
      [name]: value
    });
  };

  const guardarPasswordCliente = async () => {
    setMensajeCuentaCliente("");
    setTipoMensajeCuentaCliente("");

    if (!passwordClienteForm.password_actual) {
      setMensajeCuentaCliente("Debes ingresar tu contraseña actual.");
      setTipoMensajeCuentaCliente("error");
      return;
    }

    if (!passwordClienteForm.password_nueva || passwordClienteForm.password_nueva.length < 6) {
      setMensajeCuentaCliente("La nueva contraseña debe tener al menos 6 caracteres.");
      setTipoMensajeCuentaCliente("error");
      return;
    }

    if (passwordClienteForm.password_nueva !== passwordClienteForm.confirmar_password) {
      setMensajeCuentaCliente("Las contraseñas nuevas no coinciden.");
      setTipoMensajeCuentaCliente("error");
      return;
    }

    const confirmar = window.confirm("¿Seguro que quieres cambiar tu contraseña?");

    if (!confirmar) return;

    try {
      const respuesta = await fetch(`${API_URL}/cliente/cuenta/${usuario.id_usuario}/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(passwordClienteForm)
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo cambiar la contraseña.");
      }

      setPasswordClienteForm({
        password_actual: "",
        password_nueva: "",
        confirmar_password: ""
      });
      setMostrarCambioPasswordCliente(false);
      setMostrarNuevaPasswordCliente(false);
      setMostrarConfirmarPasswordCliente(false);
      setMensajeCuentaCliente("Contraseña actualizada correctamente.");
      setTipoMensajeCuentaCliente("ok");
    } catch (error) {
      setMensajeCuentaCliente(error.message || "No se pudo cambiar la contraseña.");
      setTipoMensajeCuentaCliente("error");
    }
  };

  const cargarProductosCliente = async () => {
    setCargandoProductos(true);
    setErrorProductos("");

    const params = new URLSearchParams();

    if (filtros.buscar.trim()) params.append("buscar", filtros.buscar.trim());
    if (filtros.tienda) params.append("empresa", filtros.tienda);
    if (filtros.color) params.append("color", filtros.color);
    if (filtros.talla) params.append("talla", filtros.talla);
    if (filtros.precioMin) params.append("precio_min", filtros.precioMin);
    if (filtros.precioMax) params.append("precio_max", filtros.precioMax);

    try {
      const respuesta = await fetch(`${API_URL}/cliente/productos?${params.toString()}`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudieron cargar los productos.");
      }

      const productosObtenidos = datos.productos || [];

      const productosFiltradosPorCategoria = filtros.categoria
        ? productosObtenidos.filter(
            (producto) => producto.categoria === filtros.categoria
          )
        : productosObtenidos;

      setProductos(
        filtros.soloStock
          ? productosFiltradosPorCategoria.filter(
              (producto) => (producto.variantes_disponibles || []).length > 0
            )
          : productosFiltradosPorCategoria
      );
    } catch (error) {
      setErrorProductos(error.message || "No se pudo conectar con el servidor.");
    }

    setCargandoProductos(false);
  };

  const abrirDetalleProducto = async (producto) => {
    setCargandoDetalle(true);
    setDetalleProducto(null);
    setVarianteSeleccionada(null);
    setCantidadDetalle(1);

    try {
      const respuesta = await fetch(`${API_URL}/cliente/productos/${producto.id_producto}`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo cargar el detalle del producto.");
      }

      const productoDetalle = datos.producto;
      setDetalleProducto(productoDetalle);

      const primeraVarianteDisponible = (productoDetalle.variantes || []).find(
        (variante) => variante.disponible && Number(variante.stock) > 0
      );

      setVarianteSeleccionada(primeraVarianteDisponible || null);
    } catch (error) {
      alert(error.message || "No se pudo cargar el producto.");
    }

    setCargandoDetalle(false);
  };

  const cargarCarritoCliente = async () => {
    if (!usuario?.id_usuario) return;

    setCargandoCarrito(true);
    setErrorCarrito("");

    try {
      const respuesta = await fetch(`${API_URL}/cliente/${usuario.id_usuario}/carrito`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo cargar el carrito.");
      }

      setCarritoCliente({
        total_productos: datos.total_productos || 0,
        total: datos.total || 0,
        items: datos.items || []
      });
    } catch (error) {
      setErrorCarrito(error.message || "No se pudo conectar con el carrito.");
    }

    setCargandoCarrito(false);
  };

  const agregarProductoAlCarrito = async () => {
    if (!varianteSeleccionada) {
      alert("Selecciona un color y talla antes de agregar al carrito.");
      return;
    }

    if (cantidadDetalle <= 0) {
      alert("La cantidad debe ser mayor a 0.");
      return;
    }

    if (cantidadDetalle > Number(varianteSeleccionada.stock || 0)) {
      alert(`Solo hay ${varianteSeleccionada.stock} unidad(es) disponibles.`);
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/cliente/carrito/agregar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          id_variante: varianteSeleccionada.id_variante,
          cantidad: Number(cantidadDetalle)
        })
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo agregar al carrito.");
      }

      setMensajeCarrito("Producto agregado al carrito correctamente.");
      setToastCliente({
        tipo: "ok",
        texto: "Prenda agregada correctamente al carrito. Puedes seguir explorando."
      });
      setDetalleProducto(null);
      setImagenGrande(null);
      await cargarCarritoCliente();

      setTimeout(() => {
        setToastCliente(null);
      }, 2800);
    } catch (error) {
      alert(error.message || "No se pudo agregar al carrito.");
    }
  };

  const actualizarCantidadCarrito = async (item, nuevaCantidad) => {
    const cantidad = Number(nuevaCantidad);

    if (cantidad <= 0) {
      await quitarProductoCarrito(item);
      return;
    }

    if (cantidad > Number(item.stock_disponible || 0)) {
      alert(`Solo hay ${item.stock_disponible} unidad(es) disponibles.`);
      return;
    }

    try {
      const respuesta = await fetch(
        `${API_URL}/cliente/carrito/detalle/${item.id_carrito_detalle}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id_usuario: usuario.id_usuario,
            cantidad
          })
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo actualizar la cantidad.");
      }

      await cargarCarritoCliente();
    } catch (error) {
      alert(error.message || "No se pudo actualizar la cantidad.");
    }
  };

  const quitarProductoCarrito = async (item) => {
    const confirmar = window.confirm(
      `¿Quitar "${item.nombre_producto}" del carrito?`
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(
        `${API_URL}/cliente/carrito/detalle/${item.id_carrito_detalle}?id_usuario=${usuario.id_usuario}`,
        {
          method: "DELETE"
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo quitar el producto.");
      }

      await cargarCarritoCliente();
    } catch (error) {
      alert(error.message || "No se pudo quitar el producto del carrito.");
    }
  };

  const cargarPedidosCliente = async () => {
    if (!usuario?.id_usuario) return;

    setCargandoPedidos(true);
    setErrorPedidos("");

    try {
      const respuesta = await fetch(`${API_URL}/cliente/${usuario.id_usuario}/pedidos`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudieron cargar tus pedidos.");
      }

      setPedidosCliente(datos.pedidos || []);
    } catch (error) {
      setErrorPedidos(error.message || "No se pudo conectar con pedidos.");
    }

    setCargandoPedidos(false);
  };

  const obtenerDetallePedidoCliente = async (idPedido) => {
    const respuesta = await fetch(
      `${API_URL}/cliente/pedidos/${idPedido}?id_usuario=${usuario.id_usuario}`
    );
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      throw new Error(datos.detail || "No se pudo cargar el detalle del pedido.");
    }

    return datos.pedido;
  };

  const crearPedidoDesdeCarrito = async () => {
    if ((carritoCliente.items || []).length === 0) {
      alert("Tu carrito está vacío.");
      return;
    }

    const tiendasCarrito = new Set(
      (carritoCliente.items || [])
        .map((item) => item.id_empresa || item.empresa)
        .filter(Boolean)
    );

    if (tiendasCarrito.size > 1) {
      alert(
        "Por ahora realiza pedidos de una sola tienda a la vez, para que el pago vaya al QR correcto de esa empresa."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Crear pedido por ${Number(carritoCliente.total || 0).toFixed(2)} Bs?`
    );

    if (!confirmar) return;

    try {
      const respuesta = await fetch(`${API_URL}/cliente/pedidos/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario
        })
      });

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo crear el pedido.");
      }

      await cargarCarritoCliente();

      const detalle = await obtenerDetallePedidoCliente(datos.id_pedido);
      setPedidoPago(detalle);
      setComprobantePago(null);
      setMensajePago("Pedido creado correctamente. Ahora realiza el pago con el QR de la tienda y sube tu comprobante.");
      setSeccionCliente("pago");
    } catch (error) {
      alert(error.message || "No se pudo crear el pedido.");
    }
  };

  const abrirPagoPedido = async (pedido) => {
    try {
      const detalle = await obtenerDetallePedidoCliente(pedido.id_pedido);
      setPedidoPago(detalle);
      setComprobantePago(null);
      setMensajePago("");
      setSeccionCliente("pago");
    } catch (error) {
      alert(error.message || "No se pudo abrir el pago del pedido.");
    }
  };

  const registrarComprobantePago = async (e) => {
    e.preventDefault();

    if (!pedidoPago?.id_pedido) {
      alert("No hay un pedido seleccionado.");
      return;
    }

    if (!comprobantePago) {
      alert("Selecciona una imagen del comprobante de pago.");
      return;
    }

    const confirmar = window.confirm(
      "¿Subir este comprobante para que la empresa revise tu pago?"
    );

    if (!confirmar) return;

    setCargandoPago(true);

    try {
      const formData = new FormData();
      formData.append("archivo", comprobantePago);

      const respuesta = await fetch(
        `${API_URL}/cliente/pagos/${pedidoPago.id_pedido}/comprobante?id_usuario=${usuario.id_usuario}&metodo_pago=QR`,
        {
          method: "POST",
          body: formData
        }
      );

      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo registrar el comprobante.");
      }

      alert("Comprobante enviado correctamente. Tu pago queda en revisión.");
      setComprobantePago(null);
      setPedidoPago(null);
      await cargarPedidosCliente();
      setSeccionCliente("pedidos");
    } catch (error) {
      alert(error.message || "No se pudo registrar el pago.");
    }

    setCargandoPago(false);
  };

  const limpiarFiltros = () => {
    setFiltros({
      buscar: "",
      categoria: "",
      tienda: "",
      color: "",
      talla: "",
      precioMin: "",
      precioMax: "",
      soloStock: true
    });
  };

  useEffect(() => {
    cargarProductosCliente();
    cargarCarritoCliente();
    cargarPedidosCliente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (seccionCliente === "pedidos") {
      cargarPedidosCliente();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionCliente, usuario?.id_usuario]);


  const cargarTicketsSoporte = async () => {
    if (!usuario?.id_usuario) return;

    setCargandoSoporte(true);
    setMensajeSoporte("");

    try {
      const respuesta = await fetch(`${API_URL}/usuario/${usuario.id_usuario}/soporte/tickets`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudieron cargar tus mensajes de soporte.");
      }

      setTicketsSoporte(datos.tickets || []);
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
      const respuesta = await fetch(`${API_URL}/soporte/tickets/${ticket.id_ticket}/mensajes?id_usuario=${usuario.id_usuario}`);
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudieron cargar los mensajes.");
      }

      setMensajesSoporte(datos.mensajes || []);
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudieron cargar los mensajes.");
      setTipoMensajeSoporte("error");
    }
  };

  const crearTicketSoporte = async (e) => {
    e.preventDefault();
    setMensajeSoporte("");
    setTipoMensajeSoporte("");

    if (!nuevoTicketSoporte.asunto.trim() || !nuevoTicketSoporte.descripcion.trim()) {
      setMensajeSoporte("Escribe el asunto y el mensaje antes de enviar.");
      setTipoMensajeSoporte("error");
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/soporte/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          asunto: nuevoTicketSoporte.asunto.trim(),
          descripcion: nuevoTicketSoporte.descripcion.trim()
        })
      });
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo enviar la consulta.");
      }

      setNuevoTicketSoporte({ asunto: "", descripcion: "" });
      setMensajeSoporte("Tu mensaje fue enviado a soporte de Zyra.");
      setTipoMensajeSoporte("ok");
      await cargarTicketsSoporte();
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudo enviar el mensaje.");
      setTipoMensajeSoporte("error");
    }
  };

  const responderTicketUsuario = async (e) => {
    e.preventDefault();
    if (!ticketSoporteActivo) return;
    if (!respuestaSoporte.trim()) {
      setMensajeSoporte("Escribe una respuesta antes de enviar.");
      setTipoMensajeSoporte("error");
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/soporte/tickets/${ticketSoporteActivo.id_ticket}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          mensaje: respuestaSoporte.trim()
        })
      });
      const datos = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        throw new Error(datos.detail || "No se pudo enviar la respuesta.");
      }

      setRespuestaSoporte("");
      await abrirTicketSoporte(ticketSoporteActivo);
      await cargarTicketsSoporte();
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudo enviar la respuesta.");
      setTipoMensajeSoporte("error");
    }
  };

  useEffect(() => {
    if (seccionCliente === "soporte") {
      cargarTicketsSoporte();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccionCliente, usuario?.id_usuario]);

  const categoriasDisponibles = useMemo(() => {
    const mapa = new Map();

    productos.forEach((producto) => {
      if (producto.categoria) {
        mapa.set(producto.categoria, producto.categoria);
      }
    });

    return [...mapa.values()].sort();
  }, [productos]);

  const tiendasDisponibles = useMemo(() => {
    const mapa = new Map();

    productos.forEach((producto) => {
      if (producto.empresa?.nombre_empresa) {
        mapa.set(producto.empresa.nombre_empresa, producto.empresa.nombre_empresa);
      }
    });

    return [...mapa.values()].sort();
  }, [productos]);

  const coloresDisponibles = useMemo(() => {
    const colores = new Set();

    productos.forEach((producto) => {
      (producto.variantes_disponibles || []).forEach((variante) => {
        if (variante.color) colores.add(variante.color);
      });
    });

    return [...colores].sort();
  }, [productos]);

  const tallasDisponibles = useMemo(() => {
    const tallas = new Set();

    productos.forEach((producto) => {
      (producto.variantes_disponibles || []).forEach((variante) => {
        if (variante.talla) tallas.add(variante.talla);
      });
    });

    return [...tallas].sort();
  }, [productos]);

  const productosDestacados = useMemo(() => {
    return productos
      .filter((producto) => producto.imagen_principal)
      .slice(0, 6);
  }, [productos]);

  const tiendasInicio = useMemo(() => {
    const mapa = new Map();

    productos.forEach((producto) => {
      if (!producto.empresa?.id_empresa) return;

      if (!mapa.has(producto.empresa.id_empresa)) {
        mapa.set(producto.empresa.id_empresa, {
          ...producto.empresa,
          totalProductos: 0
        });
      }

      mapa.get(producto.empresa.id_empresa).totalProductos += 1;
    });

    return [...mapa.values()].slice(0, 4);
  }, [productos]);

  const totalVariantes = useMemo(() => {
    return productos.reduce(
      (total, producto) => total + (producto.variantes_disponibles || []).length,
      0
    );
  }, [productos]);

  const cambiarFiltro = (e) => {
    const { name, value, type, checked } = e.target;

    setFiltros({
      ...filtros,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const carritoCantidad = useMemo(() => {
    return (carritoCliente.items || []).reduce(
      (total, item) => total + Number(item.cantidad || 0),
      0
    );
  }, [carritoCliente]);

  const notificacionesPedidosCliente = useMemo(() => {
    return (pedidosCliente || [])
      .slice(0, 8)
      .map((pedido) => {
        const estadoPago = pedido.pago?.estado_pago || "SIN_PAGO";
        const estadoPedido = pedido.estado_pedido || "PENDIENTE";

        if (estadoPago === "PAGADO") {
          return {
            id: `pedido-${pedido.id_pedido}-pagado`,
            tipo: "ok",
            titulo: `Tu pedido #${pedido.id_pedido} fue aprobado`,
            texto: "Revisa tus pedidos para saber qué continúa.",
            accion: "pedidos"
          };
        }

        if (estadoPago === "EN_REVISION") {
          return {
            id: `pedido-${pedido.id_pedido}-revision`,
            tipo: "revision",
            titulo: `Tu pedido #${pedido.id_pedido} está en revisión`,
            texto: "La tienda está revisando tu comprobante de pago.",
            accion: "pedidos"
          };
        }

        if (estadoPago === "RECHAZADO") {
          return {
            id: `pedido-${pedido.id_pedido}-rechazado`,
            tipo: "error",
            titulo: `Tu comprobante del pedido #${pedido.id_pedido} fue rechazado`,
            texto: "Revisa tus pedidos para continuar con el pago.",
            accion: "pedidos"
          };
        }

        if (estadoPedido === "ENTREGADO") {
          return {
            id: `pedido-${pedido.id_pedido}-entregado`,
            tipo: "ok",
            titulo: `Tu pedido #${pedido.id_pedido} fue entregado`,
            texto: "Puedes revisar el detalle en tus pedidos.",
            accion: "pedidos"
          };
        }

        return {
          id: `pedido-${pedido.id_pedido}-pendiente`,
          tipo: "revision",
          titulo: `Tu pedido #${pedido.id_pedido} fue creado`,
          texto: "Completa el pago y sube tu comprobante para que la tienda lo revise.",
          accion: "pedidos"
        };
      });
  }, [pedidosCliente]);

  const notificacionesSoporteCliente = useMemo(() => {
    return (notificacionesSistemaCliente || []).map((notificacion) => ({
      id: `sistema-${notificacion.id_notificacion}`,
      idNotificacion: notificacion.id_notificacion,
      origen: "sistema",
      tipo: notificacion.leido ? "neutral" : "revision",
      titulo: notificacion.titulo || "Notificación de Zyra",
      texto: notificacion.mensaje || "Tienes una actualización pendiente.",
      leidoBackend: Boolean(notificacion.leido),
      accion: (notificacion.titulo || "").toLowerCase().includes("soporte") ? "soporte" : "pedidos"
    }));
  }, [notificacionesSistemaCliente]);

  const notificacionesCliente = useMemo(() => {
    return [...notificacionesSoporteCliente, ...notificacionesPedidosCliente].slice(0, 10);
  }, [notificacionesSoporteCliente, notificacionesPedidosCliente]);

  const notificacionesClienteNoLeidas = useMemo(() => {
    return notificacionesCliente.filter((notificacion) => {
      if (notificacion.origen === "sistema") {
        return !notificacion.leidoBackend;
      }

      return !notificacionesClienteLeidas.includes(notificacion.id);
    });
  }, [notificacionesCliente, notificacionesClienteLeidas]);

  const totalNotificacionesCliente = notificacionesClienteNoLeidas.length;

  const abrirNotificacionesCliente = async () => {
    if (mostrarNotificaciones) {
      setMostrarNotificaciones(false);
      setNotificacionesClienteRecientes([]);
      return;
    }

    cargarPedidosCliente();

    let sistemaActual = notificacionesSistemaCliente;
    try {
      sistemaActual = await cargarNotificacionesSistemaCliente();
    } catch (error) {
      sistemaActual = notificacionesSistemaCliente;
    }

    const idsSistemaNuevas = (sistemaActual || [])
      .filter((notificacion) => !notificacion.leido)
      .map((notificacion) => notificacion.id_notificacion);

    const idsSistemaRecientes = idsSistemaNuevas.map((id) => `sistema-${id}`);

    const idsPedidosNuevas = notificacionesPedidosCliente
      .filter((notificacion) => !notificacionesClienteLeidas.includes(notificacion.id))
      .map((notificacion) => notificacion.id);

    setNotificacionesClienteRecientes([...idsSistemaRecientes, ...idsPedidosNuevas]);

    if (idsPedidosNuevas.length > 0) {
      const nuevasLeidas = Array.from(
        new Set([...notificacionesClienteLeidas, ...idsPedidosNuevas])
      );

      setNotificacionesClienteLeidas(nuevasLeidas);
      localStorage.setItem(
        `zyra_notificaciones_cliente_leidas_${usuario.id_usuario}`,
        JSON.stringify(nuevasLeidas)
      );
    }

    if (idsSistemaNuevas.length > 0) {
      setNotificacionesSistemaCliente((actuales) =>
        actuales.map((notificacion) =>
          idsSistemaNuevas.includes(notificacion.id_notificacion)
            ? { ...notificacion, leido: true }
            : notificacion
        )
      );

      await Promise.all(
        idsSistemaNuevas.map((idNotificacion) =>
          marcarNotificacionBackendLeida(idNotificacion, usuario.id_usuario).catch(() => null)
        )
      );
    }

    setMostrarNotificaciones(true);
  };

  const cerrarNotificacionesCliente = () => {
    setMostrarNotificaciones(false);
    setNotificacionesClienteRecientes([]);
  };

  const abrirSeccionDesdeNotificacionCliente = (notificacion) => {
    cerrarNotificacionesCliente();
    if (notificacion.accion === "soporte") {
      setSeccionCliente("soporte");
      return;
    }
    setSeccionCliente("pedidos");
  };

  const renderAccionesTopCliente = () => (
    <div className="cliente-top-actions">
      <button
        type="button"
        className="cliente-notification-top"
        onClick={abrirNotificacionesCliente}
        aria-label="Abrir notificaciones"
        title="Ver notificaciones"
      >
        <BellIcon />
        {totalNotificacionesCliente > 0 && <span>{totalNotificacionesCliente}</span>}
      </button>

      <button
        type="button"
        className="cliente-cart-top"
        onClick={() => {
          cargarCarritoCliente();
          cerrarNotificacionesCliente();
          setSeccionCliente("carrito");
        }}
        aria-label="Abrir carrito"
        title="Ver mi carrito"
      >
        <CartIcon />
        {carritoCantidad > 0 && <span>{carritoCantidad}</span>}
      </button>

      {mostrarNotificaciones && (
        <div className="cliente-notification-popover">
          <div className="cliente-notification-header">
            <div>
              <span>Notificaciones</span>
              <h3>Estado de tus compras</h3>
            </div>
            <button type="button" onClick={cerrarNotificacionesCliente}>×</button>
          </div>

          {notificacionesCliente.length === 0 ? (
            <p className="cliente-notification-empty">Todavía no tienes notificaciones de pedidos.</p>
          ) : (
            <div className="cliente-notification-list">
              {notificacionesCliente.map((notificacion) => {
                const esNueva = notificacionesClienteRecientes.includes(notificacion.id);

                return (
                  <button
                    type="button"
                    className={`cliente-notification-item ${notificacion.tipo} ${
                      esNueva ? "sin-leer" : ""
                    }`}
                    key={notificacion.id}
                    onClick={() => abrirSeccionDesdeNotificacionCliente(notificacion)}
                  >
                    <strong>{notificacion.titulo}</strong>
                    <p>{notificacion.texto}</p>
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className="cliente-notification-link"
            onClick={() => {
              cerrarNotificacionesCliente();
              setSeccionCliente("pedidos");
            }}
          >
            Ir a mis pedidos
          </button>
        </div>
      )}
    </div>
  );

  const renderToastCliente = () =>
    toastCliente && (
      <div className={`cliente-toast ${toastCliente.tipo || "ok"}`}>
        <strong>{toastCliente.texto}</strong>
      </div>
    );

  const abrirDetalleEmpresa = (empresa) => {
    if (!empresa) return;
    setEmpresaSeleccionada(empresa);
  };

  const renderLogoEmpresa = (empresa, grande = false) => {
    const clase = grande ? "cliente-empresa-logo-modal" : "cliente-empresa-mini-logo";

    if (empresa?.logo_url) {
      return (
        <span className={clase}>
          <img src={obtenerUrlImagen(empresa.logo_url)} alt={empresa.nombre_empresa || "Empresa"} />
        </span>
      );
    }

    return (
      <span className={clase}>
        {empresa?.nombre_empresa?.charAt(0) || "Z"}
      </span>
    );
  };

  const obtenerMensajePedidoEmpresa = (pedido, empresa) => {
    const estadoPago = pedido.pago?.estado_pago || "SIN_PAGO";
    const estadoPedido = pedido.estado_pedido;
    const direccion = empresa?.direccion || "dirección aún no registrada";
    const tienda = empresa?.nombre_empresa || "la tienda";

    if (estadoPedido === "ENTREGADO") {
      return `Tu pedido fue marcado como ENTREGADO por ${tienda}. Gracias por comprar en Zyra.`;
    }

    if (estadoPedido === "CANCELADO") {
      return `Tu pedido fue CANCELADO. Puedes comunicarte con ${tienda} si necesitas más información.`;
    }

    if (estadoPago === "PAGADO") {
      return `Tu pedido ya fue pagado y aprobado. Puedes pasar por ${tienda}, ubicada en ${direccion}, para recogerlo o comunicarte por WhatsApp.`;
    }

    if (estadoPago === "RECHAZADO") {
      return `Tu comprobante fue rechazado por ${tienda}. Puedes volver a subir un comprobante válido desde este pedido.`;
    }

    if (estadoPago === "EN_REVISION") {
      return `Tu comprobante fue enviado a ${tienda}. El pago está en revisión.`;
    }

    return `Tu pedido fue creado. Para continuar, registra el pago por QR de ${tienda}.`;
  };

  const renderProductoCard = (producto, destacado = false) => (
    <article className={destacado ? "cliente-producto-card destacado" : "cliente-producto-card"} key={producto.id_producto}>
      <button
        type="button"
        className="cliente-producto-imagen"
        onClick={() => abrirDetalleProducto(producto)}
      >
        {producto.imagen_principal ? (
          <img
            src={obtenerUrlImagen(producto.imagen_principal)}
            alt={producto.nombre_producto}
          />
        ) : (
          <span>Sin imagen</span>
        )}

        <span className="cliente-card-ver">Ver detalle</span>
      </button>

      <div className="cliente-producto-info">
        <div className="cliente-producto-top">
          <span>{producto.categoria || "Sin categoría"}</span>
          <strong>{producto.precio} Bs</strong>
        </div>

        <h3>{producto.nombre_producto}</h3>
        <button
          type="button"
          className="cliente-producto-empresa-btn"
          onClick={() => abrirDetalleEmpresa(producto.empresa)}
        >
          {renderLogoEmpresa(producto.empresa)}
          <span>{producto.empresa?.nombre_empresa || producto.marca || "Tienda local"}</span>
        </button>

        <div className="cliente-mini-variantes">
          {(producto.variantes_disponibles || []).slice(0, 4).map((variante) => (
            <span key={variante.id_variante}>
              <i style={{ backgroundColor: obtenerColorHex(variante.color) }}></i>
              {variante.color} · {variante.talla}
            </span>
          ))}

          {(producto.variantes_disponibles || []).length === 0 && (
            <span>Sin stock disponible</span>
          )}
        </div>

        <button
          type="button"
          className="cliente-card-carrito"
          onClick={() => abrirDetalleProducto(producto)}
        >
          Ver detalle y agregar
        </button>
      </div>
    </article>
  );

  const renderInicio = () => (
    <div className="cliente-home cliente-page-con-carrito">
      <section className="cliente-home-hero">
        <div>
          <span>Moda local inteligente</span>
          <h2>Explora prendas reales de tiendas bolivianas.</h2>
          <p>
            Zyra reúne catálogos de moda local para que encuentres productos por
            tienda, categoría, color, talla o precio desde un solo lugar.
          </p>

          <div className="cliente-home-acciones">
            <button
              type="button"
              onClick={() => setSeccionCliente("catalogo")}
            >
              Explorar catálogo
            </button>

            <button
              type="button"
              className="secundario"
              onClick={() => setSeccionCliente("buscarImagen")}
            >
              Buscar por imagen
            </button>
          </div>
        </div>

        <div className="cliente-home-panel">
          <div>
            <strong>{productos.length}</strong>
            <span>productos visibles</span>
          </div>

          <div>
            <strong>{tiendasDisponibles.length}</strong>
            <span>tiendas disponibles</span>
          </div>

          <div>
            <strong>{totalVariantes}</strong>
            <span>colores y tallas</span>
          </div>
        </div>
      </section>

      <section className="cliente-home-section">
        <div className="cliente-section-title">
          <div>
            <span>Selección para ti</span>
            <h3>Prendas destacadas</h3>
          </div>

          <button type="button" onClick={() => setSeccionCliente("catalogo")}>
            Ver todo
          </button>
        </div>

        {productosDestacados.length === 0 ? (
          <div className="cliente-vacio">
            <h3>Aún no hay productos destacados</h3>
            <p>Cuando las tiendas suban imágenes, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="cliente-destacados-grid">
            {productosDestacados.map((producto) => renderProductoCard(producto, true))}
          </div>
        )}
      </section>

      <section className="cliente-home-section">
        <div className="cliente-section-title">
          <div>
            <span>Tiendas locales</span>
            <h3>Marcas dentro de Zyra</h3>
          </div>
        </div>

        <div className="cliente-tiendas-grid">
          {tiendasInicio.length === 0 ? (
            <div className="cliente-vacio">
              <h3>No hay tiendas para mostrar</h3>
              <p>Las empresas aprobadas aparecerán en esta sección.</p>
            </div>
          ) : (
            tiendasInicio.map((tienda) => (
              <button
                type="button"
                className="cliente-tienda-card clickable"
                key={tienda.id_empresa}
                onClick={() => abrirDetalleEmpresa(tienda)}
              >
                {renderLogoEmpresa(tienda)}

                <div>
                  <h4>{tienda.nombre_empresa}</h4>
                  <p>{tienda.ciudad || "Bolivia"} · {tienda.totalProductos} producto(s)</p>
                  <small>Ver información de la tienda</small>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );

  const renderCatalogo = () => (
    <div className="cliente-catalogo cliente-page-con-carrito">
      <section className="cliente-catalogo-hero">
        <div>
          <span>Catálogo cliente</span>
          <h2>Encuentra prendas por estilo, tienda, color y talla.</h2>
          <p>
            Usa los filtros para descubrir productos reales publicados por empresas
            aprobadas dentro de Zyra.
          </p>
        </div>

        <div className="cliente-catalogo-contador">
          <strong>{productos.length}</strong>
          <span>producto(s) encontrados</span>
        </div>
      </section>

      <section className="cliente-filtros-card">
        <div className="cliente-filtro-busqueda">
          <label>¿Qué prenda estás buscando?</label>
          <div>
            <input
              name="buscar"
              value={filtros.buscar}
              onChange={cambiarFiltro}
              placeholder="Buscar polera negra, jean azul, vestido, marca..."
            />

            <button type="button" onClick={cargarProductosCliente}>
              Buscar
            </button>
          </div>
        </div>

        <div className="cliente-filtros-grid">
          <label>
            Categoría
            <select name="categoria" value={filtros.categoria} onChange={cambiarFiltro}>
              <option value="">Todas</option>
              {categoriasDisponibles.map((categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tienda
            <select name="tienda" value={filtros.tienda} onChange={cambiarFiltro}>
              <option value="">Todas</option>
              {tiendasDisponibles.map((tienda) => (
                <option key={tienda} value={tienda}>
                  {tienda}
                </option>
              ))}
            </select>
          </label>

          <label>
            Color
            <select name="color" value={filtros.color} onChange={cambiarFiltro}>
              <option value="">Todos</option>
              {coloresDisponibles.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>

          <label>
            Talla
            <select name="talla" value={filtros.talla} onChange={cambiarFiltro}>
              <option value="">Todas</option>
              {tallasDisponibles.map((talla) => (
                <option key={talla} value={talla}>
                  {talla}
                </option>
              ))}
            </select>
          </label>

          <label>
            Precio mínimo
            <input
              name="precioMin"
              value={filtros.precioMin}
              onChange={cambiarFiltro}
              inputMode="numeric"
              placeholder="0"
            />
          </label>

          <label>
            Precio máximo
            <input
              name="precioMax"
              value={filtros.precioMax}
              onChange={cambiarFiltro}
              inputMode="numeric"
              placeholder="300"
            />
          </label>
        </div>

        <div className="cliente-filtros-acciones">
          <label className="cliente-check-stock">
            <input
              type="checkbox"
              name="soloStock"
              checked={filtros.soloStock}
              onChange={cambiarFiltro}
            />
            Solo productos con stock
          </label>

          <button type="button" onClick={limpiarFiltros}>
            Limpiar filtros
          </button>

          <button type="button" className="principal" onClick={cargarProductosCliente}>
            Actualizar
          </button>
        </div>
      </section>

      {cargandoProductos && (
        <div className="cliente-vacio">
          <h3>Cargando productos...</h3>
          <p>Estamos consultando el catálogo de las tiendas.</p>
        </div>
      )}

      {errorProductos && (
        <div className="cliente-error">
          {errorProductos}
        </div>
      )}

      {!cargandoProductos && productos.length === 0 && (
        <div className="cliente-vacio">
          <h3>No encontramos productos</h3>
          <p>Prueba cambiando los filtros o limpiando la búsqueda.</p>
        </div>
      )}

      <div className="cliente-productos-grid">
        {productos.map((producto) => renderProductoCard(producto))}
      </div>
    </div>
  );

  const renderBuscarImagen = () => (
    <div className="cliente-ia-page cliente-page-con-carrito">
      <section className="cliente-ia-hero">
        <div>
          <span>Búsqueda visual con inteligencia artificial</span>
          <h2>Próximamente podrás buscar prendas usando una imagen.</h2>
          <p>
            La idea es que subas una foto de referencia y Zyra busque productos
            parecidos dentro de los catálogos de empresas bolivianas.
          </p>
        </div>

        <div className="cliente-ia-upload">
          <div className="cliente-ia-icono">IA</div>
          <strong>Subir imagen</strong>
          <p>Este espacio queda reservado para el módulo de inteligencia artificial.</p>
          <button type="button" disabled>
            Próximamente
          </button>
        </div>
      </section>

      <div className="cliente-ia-cards">
        <article>
          <span>1</span>
          <h3>Subes una referencia</h3>
          <p>Una foto de una prenda, color, textura o estilo que te guste.</p>
        </article>

        <article>
          <span>2</span>
          <h3>Zyra analiza la imagen</h3>
          <p>El sistema compara visualmente con productos registrados.</p>
        </article>

        <article>
          <span>3</span>
          <h3>Encuentras opciones reales</h3>
          <p>Verás prendas similares disponibles en tiendas locales.</p>
        </article>
      </div>

      <section className="cliente-home-section">
        <div className="cliente-section-title">
          <div>
            <span>Tiendas disponibles</span>
            <h3>Explora marcas mientras llega la IA</h3>
          </div>
        </div>

        <div className="cliente-tiendas-grid">
          {tiendasInicio.map((tienda) => (
            <button
              type="button"
              className="cliente-tienda-card clickable"
              key={tienda.id_empresa}
              onClick={() => abrirDetalleEmpresa(tienda)}
            >
              {renderLogoEmpresa(tienda)}
              <div>
                <h4>{tienda.nombre_empresa}</h4>
                <p>{tienda.ciudad || "Bolivia"} · {tienda.totalProductos} producto(s)</p>
                <small>Ver información de la tienda</small>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );

  const renderCarrito = () => (
    <div className="cliente-carrito-page">
      <section className="cliente-carrito-header">
        <div>
          <span>Carrito de compras</span>
          <h2>Mis prendas seleccionadas</h2>
          <p>
            Revisa tus productos, cambia cantidades o elimina prendas antes de
            crear tu pedido.
          </p>
        </div>

        <button type="button" onClick={cargarCarritoCliente}>
          Actualizar carrito
        </button>
      </section>

      {mensajeCarrito && (
        <div className="cliente-mensaje-carrito">
          {mensajeCarrito}
        </div>
      )}

      {cargandoCarrito && (
        <div className="cliente-vacio">
          <h3>Cargando carrito...</h3>
          <p>Estamos revisando tus productos guardados.</p>
        </div>
      )}

      {errorCarrito && (
        <div className="cliente-error">{errorCarrito}</div>
      )}

      {!cargandoCarrito && (carritoCliente.items || []).length === 0 ? (
        <div className="cliente-carrito-vacio">
          <div className="cliente-carrito-vacio-icon">
            <CartIcon />
          </div>
          <h3>Tu carrito está vacío</h3>
          <p>Explora el catálogo y agrega prendas para preparar tu pedido.</p>
          <button type="button" onClick={() => setSeccionCliente("catalogo")}>
            Ir al catálogo
          </button>
        </div>
      ) : (
        <div className="cliente-carrito-layout">
          <div className="cliente-carrito-items">
            {(carritoCliente.items || []).map((item) => (
              <article className="cliente-carrito-item" key={item.id_carrito_detalle}>
                <div className="cliente-carrito-img">
                  {item.imagen_principal ? (
                    <img
                      src={obtenerUrlImagen(item.imagen_principal)}
                      alt={item.nombre_producto}
                    />
                  ) : (
                    <span>Sin imagen</span>
                  )}
                </div>

                <div className="cliente-carrito-info">
                  <span>{item.empresa || "Tienda local"}</span>
                  <h3>{item.nombre_producto}</h3>
                  <p>
                    {item.color} · Talla {item.talla} · Stock disponible {item.stock_disponible}
                  </p>
                  <strong>{item.precio_unitario} Bs</strong>
                </div>

                <div className="cliente-carrito-cantidad">
                  <button
                    type="button"
                    onClick={() => actualizarCantidadCarrito(item, item.cantidad - 1)}
                  >
                    −
                  </button>

                  <input
                    value={item.cantidad}
                    onChange={(e) =>
                      actualizarCantidadCarrito(
                        item,
                        e.target.value.replace(/\D/g, "") || 1
                      )
                    }
                    inputMode="numeric"
                  />

                  <button
                    type="button"
                    onClick={() => actualizarCantidadCarrito(item, item.cantidad + 1)}
                  >
                    +
                  </button>
                </div>

                <div className="cliente-carrito-subtotal">
                  <span>Subtotal</span>
                  <strong>{item.subtotal} Bs</strong>
                  <button type="button" onClick={() => quitarProductoCarrito(item)}>
                    Quitar
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cliente-carrito-resumen">
            <span>Resumen</span>
            <h3>{carritoCantidad} producto(s)</h3>

            <div>
              <p>Total</p>
              <strong>{Number(carritoCliente.total || 0).toFixed(2)} Bs</strong>
            </div>

            <button
              type="button"
              className="cliente-carrito-finalizar"
              onClick={crearPedidoDesdeCarrito}
            >
              Continuar con pedido
            </button>

            <button
              type="button"
              className="cliente-carrito-seguir"
              onClick={() => setSeccionCliente("catalogo")}
            >
              Seguir comprando
            </button>
          </aside>
        </div>
      )}
    </div>
  );

  const renderPagoPedido = () => {
    const empresasPago = pedidoPago?.empresas_pago || [];
    const empresaPago = empresasPago[0] || null;
    const pagoRegistrado = pedidoPago?.pago;

    return (
      <div className="cliente-pago-page">
        <section className="cliente-pago-hero">
          <div>
            <span>Pago del pedido</span>
            <h2>Completa tu pago por QR</h2>
            <p>
              Escanea el QR de la tienda, realiza el depósito y sube una foto del
              comprobante para que la empresa pueda revisarlo.
            </p>
          </div>

          <div className="cliente-pago-total">
            <span>Total del pedido</span>
            <strong>{Number(pedidoPago?.total || 0).toFixed(2)} Bs</strong>
            <p>Pedido #{pedidoPago?.id_pedido || "--"}</p>
          </div>
        </section>

        {mensajePago && <div className="cliente-mensaje-carrito">{mensajePago}</div>}

        {!pedidoPago ? (
          <div className="cliente-vacio">
            <h3>No hay pedido seleccionado</h3>
            <p>Primero crea un pedido desde tu carrito.</p>
            <button type="button" onClick={() => setSeccionCliente("carrito")}>
              Ir al carrito
            </button>
          </div>
        ) : (
          <div className="cliente-pago-layout">
            <article className="cliente-pago-qr-card">
              <span>QR de pago de la tienda</span>
              <h3>{empresaPago?.nombre_empresa || "Tienda"}</h3>

              {empresasPago.length > 1 && (
                <div className="cliente-pago-alerta">
                  Este pedido tiene productos de más de una tienda. Para esta versión,
                  realiza pedidos de una sola tienda por vez.
                </div>
              )}

              {empresaPago?.qr_pago_url ? (
                <button
                  type="button"
                  className="cliente-pago-qr-img"
                  onClick={() => setImagenGrande(empresaPago.qr_pago_url)}
                >
                  <img
                    src={obtenerUrlImagen(empresaPago.qr_pago_url)}
                    alt="QR de pago de la tienda"
                  />
                  <small>Toca para ver más grande</small>
                </button>
              ) : (
                <div className="cliente-pago-sin-qr">
                  La tienda aún no configuró su QR de pago.
                </div>
              )}

              <div className="cliente-pago-datos-tienda">
                <div>
                  <span>Total para esta tienda</span>
                  <strong>{Number(empresaPago?.total_empresa || pedidoPago.total || 0).toFixed(2)} Bs</strong>
                </div>

                {empresaPago?.whatsapp && (
                  <a
                    href={`https://wa.me/591${empresaPago.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consultar por WhatsApp
                  </a>
                )}
              </div>
            </article>

            <article className="cliente-pago-form-card">
              <span>Comprobante</span>
              <h3>Sube tu comprobante</h3>
              <p>
                Asegúrate de que la imagen muestre claramente el monto, fecha y
                referencia del depósito.
              </p>

              {pagoRegistrado && (
                <div className={`cliente-pago-estado ${pagoRegistrado.estado_pago}`}>
                  Pago actual: {pagoRegistrado.estado_pago}
                </div>
              )}

              <form onSubmit={registrarComprobantePago}>
                <label className="cliente-pago-file">
                  <span>Imagen del comprobante</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={(e) => setComprobantePago(e.target.files[0])}
                  />
                </label>

                {comprobantePago && (
                  <div className="cliente-pago-preview">
                    <img src={URL.createObjectURL(comprobantePago)} alt="Vista previa del comprobante" />
                    <p>{comprobantePago.name}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="cliente-carrito-finalizar"
                  disabled={cargandoPago || !empresaPago?.qr_pago_url || empresasPago.length > 1}
                >
                  {cargandoPago ? "Enviando comprobante..." : "Enviar comprobante"}
                </button>
              </form>

              <button
                type="button"
                className="cliente-carrito-seguir"
                onClick={() => setSeccionCliente("pedidos")}
              >
                Ver mis pedidos
              </button>
            </article>
          </div>
        )}
      </div>
    );
  };

  const renderMisPedidos = () => (
    <div className="cliente-pedidos-page">
      <section className="cliente-carrito-header">
        <div>
          <span>Historial y avisos de compra</span>
          <h2>Mis pedidos</h2>
          <p>
            Aquí verás lo que pediste, el estado del pago y los avisos de cada tienda
            para recoger tu pedido o comunicarte directamente.
          </p>
        </div>

        <button type="button" onClick={cargarPedidosCliente}>
          Actualizar pedidos
        </button>
      </section>

      {cargandoPedidos && (
        <div className="cliente-vacio">
          <h3>Cargando pedidos...</h3>
          <p>Estamos revisando tus compras.</p>
        </div>
      )}

      {errorPedidos && <div className="cliente-error">{errorPedidos}</div>}

      {!cargandoPedidos && pedidosCliente.length === 0 ? (
        <div className="cliente-carrito-vacio">
          <div className="cliente-carrito-vacio-icon">
            <CartIcon />
          </div>
          <h3>Aún no tienes pedidos</h3>
          <p>Cuando finalices una compra, aparecerá aquí.</p>
          <button type="button" onClick={() => setSeccionCliente("catalogo")}>
            Explorar catálogo
          </button>
        </div>
      ) : (
        <div className="cliente-pedidos-lista">
          {pedidosCliente.map((pedido) => (
            <article className="cliente-pedido-card detalle" key={pedido.id_pedido}>
              <div className="cliente-pedido-header">
                <div>
                  <span>Pedido #{pedido.id_pedido}</span>
                  <h3>{Number(pedido.total || 0).toFixed(2)} Bs</h3>
                  <p>
                    {(pedido.empresas_pago || [])
                      .map((empresa) => empresa.nombre_empresa)
                      .join(" · ") || "Tienda local"}
                  </p>
                </div>

                <div className="cliente-pedido-badges">
                  <strong>Pedido: {pedido.estado_pedido}</strong>
                  <strong>Pago: {pedido.pago?.estado_pago || "SIN_PAGO"}</strong>
                </div>
              </div>

              <div className="cliente-pedido-notificaciones">
                {(pedido.empresas_pago || []).map((empresa) => (
                  <div
                    className={`cliente-pedido-aviso ${pedido.pago?.estado_pago || "SIN_PAGO"}`}
                    key={empresa.id_empresa}
                  >
                    <div className="cliente-pedido-aviso-header">
                      <button
                        type="button"
                        className="cliente-pedido-tienda-btn"
                        onClick={() => abrirDetalleEmpresa(empresa)}
                      >
                        {renderLogoEmpresa(empresa)}
                        <span>{empresa.nombre_empresa}</span>
                      </button>

                      {empresa.whatsapp && (
                        <a
                          href={`https://wa.me/591${empresa.whatsapp}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>

                    <p>{obtenerMensajePedidoEmpresa(pedido, empresa)}</p>

                    <div className="cliente-pedido-direccion">
                      <span>Dirección de recojo</span>
                      <strong>{empresa.direccion || "La tienda aún no registró dirección"}</strong>
                      <small>{empresa.ciudad || "Bolivia"}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cliente-pedido-productos">
                {(pedido.empresas_pago || []).map((empresa) => (
                  <div className="cliente-pedido-tienda-productos" key={`productos-${empresa.id_empresa}`}>
                    <h4>Productos de {empresa.nombre_empresa}</h4>

                    {(empresa.productos || []).map((producto) => (
                      <button
                        type="button"
                        className="cliente-pedido-producto-item cliente-pedido-producto-boton"
                        key={`${empresa.id_empresa}-${producto.id_producto}-${producto.color}-${producto.talla}`}
                        onClick={() => abrirDetalleProducto(producto)}
                        title="Ver detalle del producto"
                      >
                        <span className="cliente-pedido-producto-info">
                          <strong>{producto.nombre_producto}</strong>
                          <small>
                            {producto.color} · Talla {producto.talla} · Cantidad {producto.cantidad}
                          </small>
                        </span>

                        <span className="cliente-pedido-producto-precio">
                          {Number(producto.subtotal || 0).toFixed(2)} Bs
                        </span>
                      </button>
                    ))}

                    <div className="cliente-pedido-total-tienda">
                      <span>Total en esta tienda</span>
                      <strong>{Number(empresa.total_empresa || 0).toFixed(2)} Bs</strong>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cliente-pedido-acciones">
                {pedido.pago?.comprobante_url && (
                  <button
                    type="button"
                    className="cliente-ver-comprobante"
                    onClick={() => setImagenGrande(pedido.pago.comprobante_url)}
                  >
                    Ver comprobante enviado
                  </button>
                )}

                {(!pedido.pago || pedido.pago.estado_pago === "RECHAZADO") && (
                  <button
                    type="button"
                    className="cliente-carrito-finalizar"
                    onClick={() => abrirPagoPedido(pedido)}
                  >
                    {pedido.pago?.estado_pago === "RECHAZADO"
                      ? "Volver a subir comprobante"
                      : "Registrar pago"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderAvatarCliente = (grande = false) => {
    const clase = grande ? "cliente-cuenta-avatar grande" : "cliente-cuenta-avatar";

    if (usuarioCliente?.foto_url) {
      return (
        <div className={clase}>
          <img src={obtenerUrlImagen(usuarioCliente.foto_url)} alt={usuarioCliente.nombre || "Cliente"} />
        </div>
      );
    }

    return (
      <div className={clase}>
        <span>{usuarioCliente?.nombre?.charAt(0)?.toUpperCase() || "C"}</span>
      </div>
    );
  };

  const renderSoporte = () => (
    <div className="cliente-soporte-page">
      <div className="cliente-carrito-header soporte-header">
        <div>
          <span>Soporte técnico</span>
          <h2>Escribir una queja o consulta</h2>
          <p>
            Envía tu mensaje al equipo de Zyra. Cuando el administrador responda,
            podrás ver la conversación aquí mismo.
          </p>
        </div>
        <button type="button" onClick={cargarTicketsSoporte}>Actualizar</button>
      </div>

      {mensajeSoporte && <div className={`mensaje-producto ${tipoMensajeSoporte}`}>{mensajeSoporte}</div>}

      <div className="soporte-usuario-layout">
        <form className="soporte-form-card" onSubmit={crearTicketSoporte}>
          <span>Nuevo mensaje</span>
          <h3>Cuéntanos qué pasó</h3>
          <label>
            Asunto
            <input
              value={nuevoTicketSoporte.asunto}
              onChange={(e) => setNuevoTicketSoporte({ ...nuevoTicketSoporte, asunto: e.target.value })}
              placeholder="Ej: Problema con mi pedido"
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

          <form className="soporte-responder-form" onSubmit={responderTicketUsuario}>
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

  const renderMiCuenta = () => (
    <div className="cliente-cuenta-page">
      <div className="cliente-cuenta-header">
        <div>
          <span>Cuenta cliente</span>
          <h2>Mi cuenta</h2>
          <p>Administra tus datos personales y la seguridad de tu acceso.</p>
        </div>

        {!editandoCuentaCliente && (
          <button
            type="button"
            onClick={() => {
              sincronizarCuentaCliente(usuarioCliente);
              setEditandoCuentaCliente(true);
            }}
          >
            Editar datos
          </button>
        )}
      </div>

      {mensajeCuentaCliente && (
        <div className={`mensaje-producto ${tipoMensajeCuentaCliente}`}>
          {mensajeCuentaCliente}
        </div>
      )}

      {!editandoCuentaCliente ? (
        <div className="cliente-cuenta-grid">
          <article className="cliente-cuenta-perfil">
            {renderAvatarCliente(true)}
            <span>Perfil</span>
            <h3>
              {usuarioCliente?.nombre || "Cliente"} {usuarioCliente?.apellido || ""}
            </h3>
            <p>Cuenta personal para comprar prendas, guardar carrito y revisar pedidos.</p>
          </article>

          <article className="cliente-cuenta-card">
            <span>Nombre</span>
            <strong>{usuarioCliente?.nombre || "No registrado"}</strong>
            <p>Nombre visible en tu cuenta.</p>
          </article>

          <article className="cliente-cuenta-card">
            <span>Apellido</span>
            <strong>{usuarioCliente?.apellido || "No registrado"}</strong>
            <p>Dato opcional para identificar tu perfil.</p>
          </article>

          <article className="cliente-cuenta-card">
            <span>Correo</span>
            <strong>{usuarioCliente?.email || "No registrado"}</strong>
            <p>Correo usado para iniciar sesión.</p>
          </article>

          <article className="cliente-cuenta-card">
            <span>Teléfono</span>
            <strong>{usuarioCliente?.telefono || "No registrado"}</strong>
            <p>Número de contacto para pedidos.</p>
          </article>
        </div>
      ) : (
        <form className="cliente-cuenta-form" onSubmit={guardarCuentaCliente}>
          <div className="cliente-cuenta-editor-layout">
            <aside className="cliente-cuenta-foto-box">
              <div className="cliente-cuenta-avatar grande">
                {fotoCuentaCliente ? (
                  <img src={URL.createObjectURL(fotoCuentaCliente)} alt="Vista previa" />
                ) : usuarioCliente?.foto_url ? (
                  <img src={obtenerUrlImagen(usuarioCliente.foto_url)} alt={usuarioCliente.nombre || "Cliente"} />
                ) : (
                  <span>{usuarioCliente?.nombre?.charAt(0)?.toUpperCase() || "C"}</span>
                )}
              </div>

              <label>Foto de perfil opcional</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => setFotoCuentaCliente(e.target.files[0] || null)}
              />
              <p>Si no agregas foto, mostraremos la primera letra de tu nombre.</p>
            </aside>

            <div className="cliente-cuenta-campos">
              <div className="form-grid">
                <div className="campo-panel">
                  <label>Nombre *</label>
                  <input
                    name="nombre"
                    value={cuentaClienteForm.nombre}
                    onChange={cambiarCuentaClienteForm}
                  />
                </div>

                <div className="campo-panel">
                  <label>Apellido</label>
                  <input
                    name="apellido"
                    value={cuentaClienteForm.apellido}
                    onChange={cambiarCuentaClienteForm}
                  />
                </div>

                <div className="campo-panel">
                  <label>Correo *</label>
                  <input
                    type="email"
                    name="email"
                    value={cuentaClienteForm.email}
                    onChange={cambiarCuentaClienteForm}
                  />
                </div>

                <div className="campo-panel">
                  <label>Teléfono</label>
                  <input
                    name="telefono"
                    value={cuentaClienteForm.telefono}
                    onChange={cambiarCuentaClienteForm}
                    maxLength="8"
                    inputMode="numeric"
                    placeholder="8 números"
                  />
                </div>
              </div>

              <div className="cliente-password-box">
                <div>
                  <span>Seguridad</span>
                  <h3>Contraseña</h3>
                  <p>Tu contraseña se mantiene igual si no decides cambiarla.</p>
                </div>

                <button
                  type="button"
                  className="btn-panel-secundario"
                  onClick={() => setMostrarCambioPasswordCliente(!mostrarCambioPasswordCliente)}
                >
                  {mostrarCambioPasswordCliente ? "Cancelar cambio" : "Cambiar contraseña"}
                </button>
              </div>

              {mostrarCambioPasswordCliente && (
                <div className="cliente-password-panel">
                  <div className="form-grid">
                    <div className="campo-panel">
                      <label>Contraseña actual</label>
                      <input
                        type="password"
                        name="password_actual"
                        value={passwordClienteForm.password_actual}
                        onChange={cambiarPasswordClienteForm}
                      />
                    </div>

                    <div className="campo-panel">
                      <label>Nueva contraseña</label>
                      <div className="password-input-panel">
                        <input
                          type={mostrarNuevaPasswordCliente ? "text" : "password"}
                          name="password_nueva"
                          value={passwordClienteForm.password_nueva}
                          onChange={cambiarPasswordClienteForm}
                        />
                        <button
                          type="button"
                          className="btn-ojo-password"
                          onClick={() => setMostrarNuevaPasswordCliente(!mostrarNuevaPasswordCliente)}
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
                          type={mostrarConfirmarPasswordCliente ? "text" : "password"}
                          name="confirmar_password"
                          value={passwordClienteForm.confirmar_password}
                          onChange={cambiarPasswordClienteForm}
                        />
                        <button
                          type="button"
                          className="btn-ojo-password"
                          onClick={() => setMostrarConfirmarPasswordCliente(!mostrarConfirmarPasswordCliente)}
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
                    onClick={guardarPasswordCliente}
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
                    setEditandoCuentaCliente(false);
                    sincronizarCuentaCliente(usuarioCliente);
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
  );

  const renderPlaceholder = (titulo, texto) => (
    <div className="cliente-vacio">
      <h3>{titulo}</h3>
      <p>{texto}</p>
    </div>
  );

  const imagenPrincipalDetalle =
    detalleProducto?.imagenes?.find((imagen) => imagen.es_principal)?.url_imagen ||
    detalleProducto?.imagenes?.[0]?.url_imagen ||
    null;

  return (
    <PortalLayout
      logo="Zyra"
      titulo={
        seccionCliente === "catalogo"
          ? "Catálogo de moda local"
          : seccionCliente === "buscarImagen"
          ? "Búsqueda inteligente"
          : seccionCliente === "carrito"
          ? "Mi carrito"
          : seccionCliente === "pago"
          ? "Pago del pedido"
          : seccionCliente === "pedidos"
          ? "Mis pedidos"
          : seccionCliente === "cuenta"
          ? "Mi cuenta"
          : "Descubre moda local en Zyra"
      }
      subtitulo="Plataforma cliente"
      menu={menu}
      activo={seccionCliente}
      onMenuClick={setSeccionCliente}
      onVolver={onVolver}
      onCerrarSesion={onCerrarSesion}
    >
      {renderToastCliente()}
      {renderAccionesTopCliente()}
      {seccionCliente === "inicio" && renderInicio()}
      {seccionCliente === "catalogo" && renderCatalogo()}
      {seccionCliente === "buscarImagen" && renderBuscarImagen()}
      {seccionCliente === "carrito" && renderCarrito()}
      {seccionCliente === "pago" && renderPagoPedido()}
      {seccionCliente === "pedidos" && renderMisPedidos()}
      {seccionCliente === "soporte" && renderSoporte()}
      {seccionCliente === "cuenta" && renderMiCuenta()}

      {(detalleProducto || cargandoDetalle) && (
        <div className="cliente-modal-fondo" onClick={() => setDetalleProducto(null)}>
          <div className="cliente-modal-producto" onClick={(e) => e.stopPropagation()}>
            {cargandoDetalle ? (
              <div className="cliente-vacio">
                <h3>Cargando detalle...</h3>
                <p>Estamos preparando la información del producto.</p>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="cliente-modal-cerrar"
                  onClick={() => setDetalleProducto(null)}
                >
                  ×
                </button>

                <div className="cliente-detalle-galeria">
                  <button
                    type="button"
                    className="cliente-detalle-img-principal"
                    onClick={() => imagenPrincipalDetalle && setImagenGrande(imagenPrincipalDetalle)}
                  >
                    {imagenPrincipalDetalle ? (
                      <img
                        src={obtenerUrlImagen(imagenPrincipalDetalle)}
                        alt={detalleProducto.nombre_producto}
                      />
                    ) : (
                      <span>Sin imagen</span>
                    )}
                  </button>

                  <div className="cliente-miniaturas">
                    {(detalleProducto.imagenes || []).map((imagen) => (
                      <button
                        type="button"
                        key={imagen.id_imagen}
                        onClick={() => setImagenGrande(imagen.url_imagen)}
                      >
                        <img
                          src={obtenerUrlImagen(imagen.url_imagen)}
                          alt={detalleProducto.nombre_producto}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cliente-detalle-info">
                  <span>{detalleProducto.categoria}</span>
                  <h2>{detalleProducto.nombre_producto}</h2>
                  <p>{detalleProducto.descripcion || "Sin descripción disponible."}</p>

                  <div className="cliente-detalle-precio">
                    <strong>{detalleProducto.precio} Bs</strong>
                    <button
                      type="button"
                      className="cliente-detalle-empresa-btn"
                      onClick={() => abrirDetalleEmpresa(detalleProducto.empresa)}
                    >
                      {renderLogoEmpresa(detalleProducto.empresa)}
                      <span>{detalleProducto.empresa?.nombre_empresa}</span>
                    </button>
                  </div>

                  <div className="cliente-detalle-datos">
                    <div>
                      <span>Marca</span>
                      <strong>{detalleProducto.marca || "Sin marca"}</strong>
                    </div>

                    <div>
                      <span>Género</span>
                      <strong>{detalleProducto.genero || "Unisex"}</strong>
                    </div>

                    <div>
                      <span>Tienda</span>
                      <strong>{detalleProducto.empresa?.ciudad || "Bolivia"}</strong>
                    </div>
                  </div>

                  <div className="cliente-variantes-selector">
                    <h3>Elige color y talla</h3>

                    <div className="cliente-variantes-lista">
                      {(detalleProducto.variantes || []).map((variante) => {
                        const disponible = variante.disponible && Number(variante.stock) > 0;
                        const activo = varianteSeleccionada?.id_variante === variante.id_variante;

                        return (
                          <button
                            key={variante.id_variante}
                            type="button"
                            className={activo ? "activo" : ""}
                            disabled={!disponible}
                            onClick={() => setVarianteSeleccionada(variante)}
                          >
                            <i style={{ backgroundColor: obtenerColorHex(variante.color) }}></i>
                            <span>{variante.color} · {variante.talla}</span>
                            <small>{disponible ? `${variante.stock} disponible(s)` : "Sin stock"}</small>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="cliente-detalle-cantidad">
                    <span>Cantidad</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => setCantidadDetalle((actual) => Math.max(1, actual - 1))}
                      >
                        −
                      </button>

                      <input
                        value={cantidadDetalle}
                        onChange={(e) =>
                          setCantidadDetalle(Number(e.target.value.replace(/\D/g, "") || 1))
                        }
                        inputMode="numeric"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setCantidadDetalle((actual) =>
                            varianteSeleccionada
                              ? Math.min(Number(varianteSeleccionada.stock || 1), actual + 1)
                              : actual + 1
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="cliente-detalle-acciones">
                    <button
                      type="button"
                      className="cliente-btn-carrito"
                      disabled={!varianteSeleccionada}
                      onClick={agregarProductoAlCarrito}
                    >
                      Agregar al carrito
                    </button>

                    {detalleProducto.empresa?.whatsapp && (
                      <a
                        href={`https://wa.me/591${detalleProducto.empresa.whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cliente-btn-whatsapp"
                      >
                        Consultar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {empresaSeleccionada && (
        <div className="cliente-modal-fondo" onClick={() => setEmpresaSeleccionada(null)}>
          <div className="cliente-empresa-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="cliente-modal-cerrar"
              onClick={() => setEmpresaSeleccionada(null)}
            >
              ×
            </button>

            <div className="cliente-empresa-modal-header">
              {renderLogoEmpresa(empresaSeleccionada, true)}
              <div>
                <span>Tienda dentro de Zyra</span>
                <h2>{empresaSeleccionada.nombre_empresa}</h2>
                <p>{empresaSeleccionada.descripcion || "Esta tienda aún no agregó una descripción pública."}</p>
              </div>
            </div>

            <div className="cliente-empresa-info-grid">
              <div>
                <span>Dirección</span>
                <strong>{empresaSeleccionada.direccion || "No registrada"}</strong>
                <p>{empresaSeleccionada.ciudad || "Bolivia"}</p>
              </div>

              <div>
                <span>WhatsApp</span>
                <strong>{empresaSeleccionada.whatsapp || "No registrado"}</strong>
                <p>Canal de contacto para consultas y recojo.</p>
              </div>

              <div>
                <span>Redes sociales</span>
                <strong>{empresaSeleccionada.instagram || empresaSeleccionada.facebook || "No registradas"}</strong>
                <p>Información pública de la marca.</p>
              </div>
            </div>

            <div className="cliente-empresa-modal-actions">
              {empresaSeleccionada.whatsapp && (
                <a
                  href={`https://wa.me/591${empresaSeleccionada.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cliente-btn-whatsapp"
                >
                  Contactar por WhatsApp
                </a>
              )}

              <button
                type="button"
                className="cliente-carrito-seguir"
                onClick={() => {
                  const nombreTienda = empresaSeleccionada.nombre_empresa || "";
                  setFiltros((actual) => ({
                    ...actual,
                    tienda: nombreTienda
                  }));
                  setProductos((actual) =>
                    nombreTienda
                      ? actual.filter((producto) => producto.empresa?.nombre_empresa === nombreTienda)
                      : actual
                  );
                  setEmpresaSeleccionada(null);
                  setSeccionCliente("catalogo");
                }}
              >
                Ver productos de esta tienda
              </button>
            </div>
          </div>
        </div>
      )}

      {imagenGrande && (
        <div className="cliente-lightbox" onClick={() => setImagenGrande(null)}>
          <button type="button" onClick={() => setImagenGrande(null)}>
            ×
          </button>

          <img src={obtenerUrlImagen(imagenGrande)} alt="Vista ampliada" />
        </div>
      )}
    </PortalLayout>
  );
}
