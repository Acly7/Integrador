import { useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/layout/PortalLayout";
import {
  actualizarCuentaAdminApi,
  cambiarEstadoEmpresaAdminApi,
  cambiarEstadoSoporteAdminApi,
  cambiarEstadoUsuarioAdminApi,
  cambiarPasswordAdminApi,
  crearAdministradorAdminApi,
  eliminarUsuarioAdminApi,
  obtenerCuentaAdminApi,
  obtenerEmpresasAdminApi,
  obtenerPagosAdminApi,
  obtenerPedidosAdminApi,
  obtenerProductosAdminApi,
  obtenerResumenAdminApi,
  obtenerSoporteAdminApi,
  obtenerMensajesTicketApi,
  responderTicketSoporteApi,
  obtenerUsuariosAdminApi,
  obtenerUrlImagen,
  subirFotoAdminApi
} from "../services/api";

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EstadoBadge({ estado = "" }) {
  const texto = estado || "SIN ESTADO";
  const textoVisible = texto === "EN_PROCESO" ? "EN REVISIÓN" : texto;
  return <span className={`admin-estado-badge ${texto}`}>{textoVisible}</span>;
}

function AdminAvatar({ nombre, imagen }) {
  const inicial = nombre?.trim()?.charAt(0)?.toUpperCase() || "Z";

  return (
    <div className="admin-avatar">
      {imagen ? <img src={obtenerUrlImagen(imagen)} alt={nombre} /> : <span>{inicial}</span>}
    </div>
  );
}

function formatearMonto(valor) {
  const numero = Number(valor || 0);
  return `${numero.toFixed(2)} Bs`;
}

function nombreCompleto(usuario) {
  if (!usuario) return "Sin usuario";
  return `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() || usuario.email || "Sin nombre";
}

function normalizarRol(rol) {
  return String(rol || "").toUpperCase();
}

function normalizarEstadoUsuario(estado) {
  return String(estado || "ACTIVO").toUpperCase();
}

function agruparProductosPorEmpresa(productos) {
  const grupos = {};

  productos.forEach((producto) => {
    const nombre = producto.empresa?.nombre_empresa || "Sin tienda";
    if (!grupos[nombre]) {
      grupos[nombre] = {
        nombre_empresa: nombre,
        logo_url: producto.empresa?.logo_url,
        estado_empresa: producto.empresa?.estado_empresa,
        productos: []
      };
    }
    grupos[nombre].productos.push(producto);
  });

  return Object.values(grupos).sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa));
}

function agruparPedidosPorEmpresa(pedidos) {
  const grupos = {};

  pedidos.forEach((pedido) => {
    const empresasPedido = pedido.items?.length
      ? [...new Set(pedido.items.map((item) => item.empresa || "Sin tienda"))]
      : pedido.tiendas?.length
        ? pedido.tiendas
        : ["Sin tienda"];

    empresasPedido.forEach((nombreEmpresa) => {
      if (!grupos[nombreEmpresa]) {
        grupos[nombreEmpresa] = {
          nombre_empresa: nombreEmpresa,
          pedidos: []
        };
      }
      grupos[nombreEmpresa].pedidos.push(pedido);
    });
  });

  return Object.values(grupos)
    .map((grupo) => ({
      ...grupo,
      pedidos: grupo.pedidos.sort((a, b) => Number(b.id_pedido) - Number(a.id_pedido)),
      total: grupo.pedidos.reduce((suma, pedido) => suma + Number(pedido.total || 0), 0)
    }))
    .sort((a, b) => (b.pedidos[0]?.id_pedido || 0) - (a.pedidos[0]?.id_pedido || 0));
}

function agruparPagosPorEmpresa(pagos) {
  const grupos = {};

  pagos.forEach((pago) => {
    const empresasPago = pago.items?.length
      ? [...new Set(pago.items.map((item) => item.empresa || "Sin tienda"))]
      : pago.tiendas?.length
        ? pago.tiendas
        : ["Sin tienda"];

    empresasPago.forEach((nombreEmpresa) => {
      if (!grupos[nombreEmpresa]) {
        grupos[nombreEmpresa] = {
          nombre_empresa: nombreEmpresa,
          pagos: []
        };
      }
      grupos[nombreEmpresa].pagos.push(pago);
    });
  });

  return Object.values(grupos)
    .map((grupo) => ({
      ...grupo,
      pagos: grupo.pagos.sort((a, b) => Number(b.id_pago) - Number(a.id_pago)),
      total: grupo.pagos.reduce((suma, pago) => suma + Number(pago.monto || 0), 0),
      enRevision: grupo.pagos.filter((pago) => pago.estado_pago === "EN_REVISION").length
    }))
    .sort((a, b) => (b.pagos[0]?.id_pago || 0) - (a.pagos[0]?.id_pago || 0));
}

export default function AdminPanel({ usuario, onVolver, onCerrarSesion }) {
  const [seccion, setSeccion] = useState("resumen");
  const [resumen, setResumen] = useState(null);
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("TODAS");
  const [filtroPago, setFiltroPago] = useState("TODOS");
  const [imagenModal, setImagenModal] = useState(null);
  const [detalleModal, setDetalleModal] = useState(null);
  const [empresaPedidosSeleccionada, setEmpresaPedidosSeleccionada] = useState(null);
  const [empresaPagosSeleccionada, setEmpresaPagosSeleccionada] = useState(null);
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [notificacionesLeidas, setNotificacionesLeidas] = useState([]);
  const [notificacionesRecientes, setNotificacionesRecientes] = useState([]);
  const [ticketConversacion, setTicketConversacion] = useState(null);
  const [mensajesTicket, setMensajesTicket] = useState([]);
  const [respuestaTicket, setRespuestaTicket] = useState("");
  const [cargandoMensajesTicket, setCargandoMensajesTicket] = useState(false);
  const [enviandoRespuestaTicket, setEnviandoRespuestaTicket] = useState(false);


  const [cuentaAdmin, setCuentaAdmin] = useState({
    nombre: usuario?.nombre || "",
    apellido: usuario?.apellido || "",
    email: usuario?.email || "",
    telefono: usuario?.telefono || "",
    foto_url: usuario?.foto_url || null
  });
  const [editandoCuenta, setEditandoCuenta] = useState(false);
  const [fotoAdmin, setFotoAdmin] = useState(null);
  const [mensajeCuenta, setMensajeCuenta] = useState("");
  const [tipoMensajeCuenta, setTipoMensajeCuenta] = useState("");
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordCuenta, setPasswordCuenta] = useState({
    password_actual: "",
    password_nueva: "",
    confirmar_password: ""
  });
  const [verPasswordNueva, setVerPasswordNueva] = useState(false);
  const [verPasswordConfirmar, setVerPasswordConfirmar] = useState(false);
  const [mostrarFormularioAdmin, setMostrarFormularioAdmin] = useState(false);
  const [nuevoAdmin, setNuevoAdmin] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    telefono: ""
  });
  const [verPasswordNuevoAdmin, setVerPasswordNuevoAdmin] = useState(false);

  const menu = [
    { id: "resumen", nombre: "Resumen", icono: "resumen" },
    { id: "empresas", nombre: "Empresas", icono: "producto" },
    { id: "usuarios", nombre: "Usuarios", icono: "usuario" },
    { id: "productos", nombre: "Productos", icono: "catalogo" },
    { id: "pedidos", nombre: "Pedidos", icono: "pedidos" },
    { id: "pagos", nombre: "Pagos", icono: "pagos" },
    { id: "soporte", nombre: "Soporte", icono: "imagen" },
    { id: "mi_cuenta", nombre: "Mi cuenta", icono: "usuario" }
  ];

  const cargarResumen = async () => {
    const datos = await obtenerResumenAdminApi(usuario.id_usuario);
    setResumen(datos);
  };

  const cargarEmpresas = async () => {
    const datos = await obtenerEmpresasAdminApi(usuario.id_usuario);
    setEmpresas(datos);
  };

  const cargarUsuarios = async () => {
    const datos = await obtenerUsuariosAdminApi(usuario.id_usuario);
    setUsuarios(datos);
  };

  const cargarProductos = async () => {
    const datos = await obtenerProductosAdminApi(usuario.id_usuario);
    setProductos(datos);
  };

  const cargarPedidos = async () => {
    const datos = await obtenerPedidosAdminApi(usuario.id_usuario);
    setPedidos(datos);
  };

  const cargarPagos = async () => {
    const datos = await obtenerPagosAdminApi(usuario.id_usuario);
    setPagos(datos);
  };

  const cargarSoporte = async () => {
    const datos = await obtenerSoporteAdminApi(usuario.id_usuario);
    setTickets(datos);
  };

  const cargarCuentaAdmin = async () => {
    const datos = await obtenerCuentaAdminApi(usuario.id_usuario);
    setCuentaAdmin({
      nombre: datos.nombre || "",
      apellido: datos.apellido || "",
      email: datos.email || "",
      telefono: datos.telefono || "",
      foto_url: datos.foto_url || null
    });
  };

  const cargarDatos = async () => {
    setCargando(true);
    setError("");

    try {
      if (seccion === "resumen") {
        await Promise.all([
          cargarResumen(),
          cargarEmpresas(),
          cargarPedidos(),
          cargarPagos(),
          cargarSoporte().catch(() => setTickets([]))
        ]);
      }

      if (seccion === "empresas") await cargarEmpresas();
      if (seccion === "usuarios") await cargarUsuarios();
      if (seccion === "productos") await cargarProductos();
      if (seccion === "pedidos") await cargarPedidos();
      if (seccion === "pagos") await cargarPagos();
      if (seccion === "soporte") await cargarSoporte();
      if (seccion === "mi_cuenta") await cargarCuentaAdmin();
    } catch (err) {
      setError(err.message || "No se pudieron cargar los datos.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion]);

  useEffect(() => {
    if (!usuario?.id_usuario) return;

    const guardadas = localStorage.getItem(
      `zyra_notificaciones_admin_leidas_${usuario.id_usuario}`
    );

    setNotificacionesLeidas(guardadas ? JSON.parse(guardadas) : []);
  }, [usuario?.id_usuario]);

  const usuariosPorRol = useMemo(() => {
    const clientes = usuarios.filter((u) => normalizarRol(u.rol) === "CLIENTE");
    const empresasUsuarios = usuarios.filter((u) => normalizarRol(u.rol) === "EMPRESA");
    const administradores = usuarios.filter((u) => ["ADMIN", "ADMINISTRADOR"].includes(normalizarRol(u.rol)));
    return { clientes, empresasUsuarios, administradores };
  }, [usuarios]);

  const empresasFiltradas = useMemo(() => {
    if (filtroEmpresa === "TODAS") return empresas;
    return empresas.filter((empresa) => empresa.estado_empresa === filtroEmpresa);
  }, [empresas, filtroEmpresa]);

  const productosPorEmpresa = useMemo(() => agruparProductosPorEmpresa(productos), [productos]);

  const pedidosPorEmpresa = useMemo(() => agruparPedidosPorEmpresa(pedidos), [pedidos]);

  const pagosFiltrados = useMemo(() => {
    if (filtroPago === "TODOS") return pagos;
    return pagos.filter((pago) => pago.estado_pago === filtroPago);
  }, [pagos, filtroPago]);

  const pagosPorEmpresa = useMemo(() => agruparPagosPorEmpresa(pagosFiltrados), [pagosFiltrados]);

  const notificaciones = useMemo(() => {
    const avisos = [];

    empresas
      .filter((empresa) => empresa.estado_empresa === "PENDIENTE")
      .slice(0, 4)
      .forEach((empresa) => {
        avisos.push({
          id: `empresa-pendiente-${empresa.id_empresa}`,
          tipo: "warning",
          titulo: `Empresa pendiente: ${empresa.nombre_empresa}`,
          texto: "Hay una solicitud empresarial esperando revisión.",
          accion: "empresas"
        });
      });

    pagos
      .filter((pago) => pago.estado_pago === "EN_REVISION")
      .slice(0, 4)
      .forEach((pago) => {
        avisos.push({
          id: `pago-revision-${pago.id_pago}`,
          tipo: "info",
          titulo: `Pago en revisión #${pago.id_pago}`,
          texto: "Hay un comprobante registrado que puede necesitar seguimiento administrativo.",
          accion: "pagos"
        });
      });

    tickets
      .filter((ticket) => ["ABIERTO", "EN_REVISION", "EN_PROCESO"].includes(ticket.estado_ticket))
      .filter((ticket) => {
        const rolUltimoAutor = String(ticket.ultimo_autor?.rol || "").toUpperCase();
        return !["ADMIN", "ADMINISTRADOR"].includes(rolUltimoAutor);
      })
      .slice(0, 6)
      .forEach((ticket) => {
        avisos.push({
          id: `soporte-ticket-${ticket.id_ticket}-msg-${ticket.ultimo_id_mensaje || ticket.total_mensajes || ticket.estado_ticket}`,
          tipo: "alerta",
          titulo: `Soporte: ${ticket.asunto}`,
          texto: "Un usuario respondió o abrió un ticket de soporte.",
          accion: "soporte",
          ticket
        });
      });

    return avisos.slice(0, 10);
  }, [empresas, pagos, tickets]);

  const notificacionesNuevas = useMemo(() => {
    return notificaciones.filter((noti) => !notificacionesLeidas.includes(noti.id)).length;
  }, [notificaciones, notificacionesLeidas]);

  const abrirNotificaciones = () => {
    if (notificacionesAbiertas) {
      setNotificacionesAbiertas(false);
      setNotificacionesRecientes([]);
      return;
    }

    const idsNuevas = notificaciones
      .filter((noti) => !notificacionesLeidas.includes(noti.id))
      .map((noti) => noti.id);

    setNotificacionesRecientes(idsNuevas);

    if (idsNuevas.length > 0) {
      const nuevasLeidas = Array.from(new Set([...notificacionesLeidas, ...idsNuevas]));
      setNotificacionesLeidas(nuevasLeidas);
      localStorage.setItem(
        `zyra_notificaciones_admin_leidas_${usuario.id_usuario}`,
        JSON.stringify(nuevasLeidas)
      );
    }

    setNotificacionesAbiertas(true);
  };

  const irDesdeNotificacion = (noti) => {
    setNotificacionesAbiertas(false);
    setNotificacionesRecientes([]);
    setSeccion(noti.accion);

    if (noti.accion === "soporte" && noti.ticket) {
      setTimeout(() => {
        abrirConversacionTicket(noti.ticket);
      }, 120);
    }
  };

  const mostrarDetalle = (tipo, datos) => {
    setDetalleModal({ tipo, datos });
  };

  const cambiarEstadoEmpresa = async (empresa, estado) => {
    const confirmar = window.confirm(`¿Seguro que quieres cambiar ${empresa.nombre_empresa} a ${estado}?`);
    if (!confirmar) return;

    try {
      await cambiarEstadoEmpresaAdminApi(empresa.id_empresa, usuario.id_usuario, estado);
      await cargarEmpresas();
      await cargarResumen().catch(() => {});
    } catch (err) {
      alert(err.message || "No se pudo cambiar el estado de la empresa.");
    }
  };

  const cambiarEstadoUsuario = async (usuarioSeleccionado, estado) => {
    const confirmar = window.confirm(`¿Seguro que quieres cambiar a ${nombreCompleto(usuarioSeleccionado)} a ${estado}?`);
    if (!confirmar) return;

    try {
      await cambiarEstadoUsuarioAdminApi(usuarioSeleccionado.id_usuario, usuario.id_usuario, estado);
      await cargarUsuarios();
      await cargarResumen().catch(() => {});
    } catch (err) {
      alert(err.message || "No se pudo cambiar el estado del usuario.");
    }
  };

  const eliminarUsuario = async (usuarioSeleccionado) => {
    const confirmar = window.confirm(
      `¿Seguro que quieres eliminar a ${nombreCompleto(usuarioSeleccionado)}?\n\nSi tiene pedidos, empresa, productos o tickets relacionados, el sistema puede impedirlo.`
    );
    if (!confirmar) return;

    try {
      await eliminarUsuarioAdminApi(usuarioSeleccionado.id_usuario, usuario.id_usuario);
      await cargarUsuarios();
      await cargarResumen().catch(() => {});
    } catch (err) {
      alert(err.message || "No se pudo eliminar el usuario. Puedes deshabilitarlo si tiene registros relacionados.");
    }
  };

  const cambiarEstadoTicket = async (ticket, estado) => {
    try {
      await cambiarEstadoSoporteAdminApi(ticket.id_ticket, usuario.id_usuario, estado);
      await cargarSoporte();
    } catch (err) {
      alert(err.message || "No se pudo cambiar el estado del ticket.");
    }
  };


  const abrirConversacionTicket = async (ticket) => {
    setTicketConversacion(ticket);
    setMensajesTicket([]);
    setRespuestaTicket("");
    setCargandoMensajesTicket(true);

    try {
      const datos = await obtenerMensajesTicketApi(ticket.id_ticket, usuario.id_usuario);
      setMensajesTicket(datos.mensajes || []);
    } catch (err) {
      alert(err.message || "No se pudieron cargar los mensajes del ticket.");
    } finally {
      setCargandoMensajesTicket(false);
    }
  };

  const enviarRespuestaTicket = async (e) => {
    e.preventDefault();

    if (!ticketConversacion) return;
    if (!respuestaTicket.trim()) {
      alert("Escribe una respuesta antes de enviarla.");
      return;
    }

    setEnviandoRespuestaTicket(true);

    try {
      await responderTicketSoporteApi(ticketConversacion.id_ticket, usuario.id_usuario, respuestaTicket.trim());
      setRespuestaTicket("");
      const datos = await obtenerMensajesTicketApi(ticketConversacion.id_ticket, usuario.id_usuario);
      setMensajesTicket(datos.mensajes || []);
      await cargarSoporte();
    } catch (err) {
      alert(err.message || "No se pudo enviar la respuesta.");
    } finally {
      setEnviandoRespuestaTicket(false);
    }
  };

  const crearAdministrador = async (e) => {
    e.preventDefault();
    setMensajeCuenta("");
    setTipoMensajeCuenta("");

    try {
      await crearAdministradorAdminApi({
        id_admin: usuario.id_usuario,
        nombre: nuevoAdmin.nombre,
        apellido: nuevoAdmin.apellido,
        email: nuevoAdmin.email,
        password: nuevoAdmin.password,
        telefono: nuevoAdmin.telefono
      });

      setNuevoAdmin({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        telefono: ""
      });
      setMostrarFormularioAdmin(false);
      await cargarUsuarios();
      await cargarResumen().catch(() => {});
      setTipoMensajeCuenta("ok");
      setMensajeCuenta("Nuevo administrador registrado correctamente.");
    } catch (err) {
      setTipoMensajeCuenta("error");
      setMensajeCuenta(err.message || "No se pudo registrar el nuevo administrador.");
    }
  };

  const guardarCuentaAdmin = async (e) => {
    e.preventDefault();
    setMensajeCuenta("");
    setTipoMensajeCuenta("");

    try {
      const datos = await actualizarCuentaAdminApi(usuario.id_usuario, {
        nombre: cuentaAdmin.nombre,
        apellido: cuentaAdmin.apellido,
        email: cuentaAdmin.email,
        telefono: cuentaAdmin.telefono
      });

      let fotoActualizada = datos.foto_url || cuentaAdmin.foto_url || null;

      if (fotoAdmin) {
        const datosFoto = await subirFotoAdminApi(usuario.id_usuario, fotoAdmin);
        fotoActualizada = datosFoto.foto_url;
      }

      const usuarioActualizado = {
        ...usuario,
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        telefono: datos.telefono,
        foto_url: fotoActualizada
      };

      localStorage.setItem("usuarioZyra", JSON.stringify(usuarioActualizado));

      setCuentaAdmin({
        nombre: datos.nombre || "",
        apellido: datos.apellido || "",
        email: datos.email || "",
        telefono: datos.telefono || "",
        foto_url: fotoActualizada
      });
      setFotoAdmin(null);
      setEditandoCuenta(false);
      setTipoMensajeCuenta("ok");
      setMensajeCuenta("Cuenta administrativa actualizada correctamente.");
    } catch (err) {
      setTipoMensajeCuenta("error");
      setMensajeCuenta(err.message || "No se pudo actualizar la cuenta.");
    }
  };

  const guardarPasswordAdmin = async (e) => {
    e.preventDefault();
    setMensajeCuenta("");
    setTipoMensajeCuenta("");

    try {
      await cambiarPasswordAdminApi(usuario.id_usuario, passwordCuenta);
      setPasswordCuenta({ password_actual: "", password_nueva: "", confirmar_password: "" });
      setCambiandoPassword(false);
      setTipoMensajeCuenta("ok");
      setMensajeCuenta("Contraseña actualizada correctamente.");
    } catch (err) {
      setTipoMensajeCuenta("error");
      setMensajeCuenta(err.message || "No se pudo cambiar la contraseña.");
    }
  };

  const renderResumen = () => (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <span>Control general</span>
          <h2>Bienvenido al panel administrativo</h2>
          <p>
            Desde aquí puedes supervisar empresas, usuarios, productos, pedidos,
            pagos y soporte de Zyra desde una sola vista.
          </p>
        </div>

        <div className="admin-hero-mini">
          <strong>{resumen?.empresas?.pendientes || 0}</strong>
          <span>Empresas pendientes</span>
          <strong>{resumen?.pagos?.pagos_en_revision || 0}</strong>
          <span>Pagos por revisar</span>
        </div>
      </section>

      <section className="admin-metricas-grid">
        <article className="admin-metrica principal">
          <span>Ventas registradas</span>
          <strong>{formatearMonto(resumen?.pagos?.total_ventas_registradas || 0)}</strong>
          <p>Pagos aprobados dentro de la plataforma.</p>
        </article>

        <article className="admin-metrica">
          <span>Usuarios</span>
          <strong>{resumen?.usuarios?.total_usuarios || 0}</strong>
          <p>{resumen?.usuarios?.total_clientes || 0} clientes registrados.</p>
        </article>

        <article className="admin-metrica warning">
          <span>Empresas pendientes</span>
          <strong>{resumen?.empresas?.pendientes || 0}</strong>
          <p>Solicitudes esperando aprobación.</p>
        </article>

        <article className="admin-metrica info">
          <span>Productos</span>
          <strong>{resumen?.productos?.total_productos || 0}</strong>
          <p>{resumen?.productos?.productos_activos || 0} productos activos.</p>
        </article>

        <article className="admin-metrica">
          <span>Pedidos</span>
          <strong>{resumen?.pedidos?.total_pedidos || 0}</strong>
          <p>{resumen?.pedidos?.pagados || 0} pedidos pagados o entregados.</p>
        </article>

        <article className="admin-metrica alerta">
          <span>Soporte</span>
          <strong>{resumen?.soporte?.tickets_abiertos || 0}</strong>
          <p>Tickets abiertos por usuarios.</p>
        </article>
      </section>

      <section className="admin-dos-columnas">
        <article className="admin-panel-card">
          <div className="admin-panel-title">
            <span>Acciones rápidas</span>
            <h3>Revisión pendiente</h3>
          </div>

          <div className="admin-acciones-rapidas">
            <button type="button" onClick={() => setSeccion("empresas")}>Revisar empresas</button>
            <button type="button" onClick={() => setSeccion("pagos")}>Revisar pagos</button>
            <button type="button" onClick={() => setSeccion("soporte")}>Ver soporte</button>
          </div>
        </article>

        <article className="admin-panel-card">
          <div className="admin-panel-title">
            <span>Estado de plataforma</span>
            <h3>Tiendas y pagos</h3>
          </div>

          <div className="admin-estado-plataforma">
            <div><span>Empresas aprobadas</span><strong>{resumen?.empresas?.aprobadas || 0}</strong></div>
            <div><span>Empresas deshabilitadas</span><strong>{resumen?.empresas?.deshabilitadas || 0}</strong></div>
            <div><span>Pagos rechazados</span><strong>{resumen?.pagos?.pagos_rechazados || 0}</strong></div>
          </div>
        </article>
      </section>
    </div>
  );

  const renderEmpresas = () => (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <span>Gestión de empresas</span>
          <h2>Solicitudes y tiendas registradas</h2>
        </div>
        <button type="button" onClick={cargarEmpresas}>Actualizar</button>
      </div>

      <div className="admin-filtros-pills">
        {["TODAS", "PENDIENTE", "APROBADA", "DESHABILITADA"].map((estado) => (
          <button
            key={estado}
            type="button"
            className={filtroEmpresa === estado ? "activo" : ""}
            onClick={() => setFiltroEmpresa(estado)}
          >
            {estado}
          </button>
        ))}
      </div>

      <div className="admin-empresas-grid admin-scroll-grid">
        {empresasFiltradas.map((empresa) => (
          <article className="admin-empresa-card" key={empresa.id_empresa}>
            <div className="admin-empresa-top">
              <AdminAvatar nombre={empresa.nombre_empresa} imagen={empresa.logo_url} />
              <EstadoBadge estado={empresa.estado_empresa} />
            </div>

            <h3>{empresa.nombre_empresa}</h3>
            <p>{empresa.descripcion || "Sin descripción registrada."}</p>

            <div className="admin-info-lista">
              <div><span>Responsable</span><strong>{empresa.nombre_responsable} {empresa.apellido_responsable || ""}</strong></div>
              <div><span>Correo</span><strong>{empresa.email}</strong></div>
              <div><span>Teléfono</span><strong>{empresa.telefono || "No registrado"}</strong></div>
              <div><span>Dirección</span><strong>{empresa.direccion || "No registrada"}</strong></div>
              <div><span>Ciudad</span><strong>{empresa.ciudad || "La Paz"}</strong></div>
              <div><span>WhatsApp</span><strong>{empresa.whatsapp || "No registrado"}</strong></div>
            </div>

            <div className="admin-empresa-acciones">
              <button type="button" className="ver" onClick={() => mostrarDetalle("Empresa", empresa)}>Ver</button>
              {empresa.estado_empresa !== "APROBADA" && (
                <button type="button" className="aprobar" onClick={() => cambiarEstadoEmpresa(empresa, "APROBADA")}>Aprobar</button>
              )}
              {empresa.estado_empresa !== "DESHABILITADA" && (
                <button type="button" className="deshabilitar" onClick={() => cambiarEstadoEmpresa(empresa, "DESHABILITADA")}>Deshabilitar</button>
              )}
              {empresa.estado_empresa !== "PENDIENTE" && (
                <button type="button" className="pendiente" onClick={() => cambiarEstadoEmpresa(empresa, "PENDIENTE")}>Pendiente</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderGrupoUsuarios = (titulo, subtitulo, lista, accionesExtra = null) => (
    <article className="admin-usuarios-grupo">
      <div className="admin-grupo-header">
        <div>
          <span>{subtitulo}</span>
          <h3>{titulo}</h3>
        </div>
        <div className="admin-grupo-header-lado">
          <strong>{lista.length}</strong>
          {accionesExtra}
        </div>
      </div>

      <div className="admin-usuarios-scroll">
        {lista.length === 0 && <p className="admin-vacio-texto">No hay registros en este grupo.</p>}

        {lista.map((u) => {
          const estado = normalizarEstadoUsuario(u.estado);
          const puedeModificar = u.id_usuario !== usuario.id_usuario;

          return (
            <div className="admin-usuario-row" key={u.id_usuario}>
              <div className="admin-user-cell">
                <AdminAvatar nombre={u.nombre} imagen={u.foto_url} />
                <div>
                  <strong>{nombreCompleto(u)}</strong>
                  <p>{u.email}</p>
                </div>
              </div>

              <div className="admin-usuario-meta">
                <span>{u.telefono || "Sin teléfono"}</span>
                <EstadoBadge estado={estado} />
              </div>

              <div className="admin-mini-acciones">
                <button type="button" className="ver" onClick={() => mostrarDetalle("Usuario", u)}>Ver</button>
                {estado !== "ACTIVO" && puedeModificar && (
                  <button type="button" className="aprobar" onClick={() => cambiarEstadoUsuario(u, "ACTIVO")}>Habilitar</button>
                )}
                {estado === "ACTIVO" && puedeModificar && (
                  <button type="button" className="deshabilitar" onClick={() => cambiarEstadoUsuario(u, "INACTIVO")}>Deshabilitar</button>
                )}
                {puedeModificar && (
                  <button type="button" className="eliminar" onClick={() => eliminarUsuario(u)}>Eliminar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );

  const renderUsuarios = () => (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <span>Usuarios</span>
          <h2>Clientes, empresas y administradores</h2>
        </div>
        <button type="button" onClick={cargarUsuarios}>Actualizar</button>
      </div>

      {mensajeCuenta && <div className={`mensaje-producto ${tipoMensajeCuenta}`}>{mensajeCuenta}</div>}

      {mostrarFormularioAdmin && (
        <form className="admin-nuevo-admin-card" onSubmit={crearAdministrador}>
          <div className="admin-panel-title">
            <span>Nuevo acceso</span>
            <h3>Crear administrador</h3>
            <p>Este usuario podrá ingresar al panel administrativo de Zyra.</p>
          </div>

          <div className="form-grid">
            <label className="campo-panel">
              Nombre *
              <input
                value={nuevoAdmin.nombre}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, nombre: e.target.value })}
                required
              />
            </label>
            <label className="campo-panel">
              Apellido
              <input
                value={nuevoAdmin.apellido}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, apellido: e.target.value })}
              />
            </label>
            <label className="campo-panel">
              Correo *
              <input
                type="email"
                value={nuevoAdmin.email}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, email: e.target.value })}
                required
              />
            </label>
            <label className="campo-panel">
              Teléfono
              <input
                value={nuevoAdmin.telefono}
                onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, telefono: e.target.value })}
              />
            </label>
            <label className="campo-panel">
              Contraseña *
              <div className="password-input-panel">
                <input
                  type={verPasswordNuevoAdmin ? "text" : "password"}
                  value={nuevoAdmin.password}
                  onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, password: e.target.value })}
                  minLength="6"
                  required
                />
                <button
                  type="button"
                  className="btn-ojo-password"
                  onClick={() => setVerPasswordNuevoAdmin(!verPasswordNuevoAdmin)}
                >
                  <EyeIcon />
                </button>
              </div>
            </label>
          </div>

          <div className="acciones-form">
            <button type="button" className="btn-panel-secundario" onClick={() => setMostrarFormularioAdmin(false)}>Cancelar</button>
            <button type="submit" className="btn-panel-principal">Guardar administrador</button>
          </div>
        </form>
      )}

      <div className="admin-usuarios-grupos-grid">
        {renderGrupoUsuarios("Clientes", "Usuarios compradores", usuariosPorRol.clientes)}
        {renderGrupoUsuarios("Empresas", "Cuentas empresariales", usuariosPorRol.empresasUsuarios)}
        {renderGrupoUsuarios("Administradores", "Acceso administrativo", usuariosPorRol.administradores, (
          <button
            type="button"
            className="admin-add-admin-btn"
            onClick={() => setMostrarFormularioAdmin(true)}
          >
            Añadir administrador
          </button>
        ))}
      </div>
    </div>
  );

  const renderProductos = () => (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <span>Catálogo global</span>
          <h2>Productos publicados en Zyra</h2>
        </div>
        <button type="button" onClick={cargarProductos}>Actualizar</button>
      </div>

      <div className="admin-empresa-grupos-lista">
        {productosPorEmpresa.map((grupo) => (
          <section className="admin-categoria-admin" key={grupo.nombre_empresa}>
            <div className="admin-categoria-titulo">
              <div>
                <span>Empresa</span>
                <h3>{grupo.nombre_empresa}</h3>
              </div>
              <strong>{grupo.productos.length} producto(s)</strong>
            </div>

            <div className="admin-productos-grid admin-productos-scroll">
              {grupo.productos.map((producto) => (
                <article className="admin-producto-card" key={producto.id_producto}>
                  <div className="admin-producto-img">
                    {producto.imagen_principal ? (
                      <img src={obtenerUrlImagen(producto.imagen_principal)} alt={producto.nombre_producto} />
                    ) : (
                      <span>Imagen</span>
                    )}
                  </div>
                  <div className="admin-producto-info">
                    <span>{producto.categoria}</span>
                    <h3>{producto.nombre_producto}</h3>
                    <p>{producto.empresa?.nombre_empresa}</p>
                    <div className="admin-producto-meta">
                      <strong>{formatearMonto(producto.precio)}</strong>
                      <EstadoBadge estado={producto.estado_producto} />
                    </div>
                    <small>Stock total: {producto.stock_total}</small>
                    <div className="admin-mini-acciones izquierda">
                      <button type="button" className="ver" onClick={() => mostrarDetalle("Producto", producto)}>Ver</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  const renderPedidos = () => {
    const grupoSeleccionado = empresaPedidosSeleccionada
      ? pedidosPorEmpresa.find((grupo) => grupo.nombre_empresa === empresaPedidosSeleccionada)
      : null;

    return (
      <div className="admin-page">
        <div className="admin-section-header">
          <div>
            <span>Pedidos globales</span>
            <h2>{grupoSeleccionado ? `Pedidos de ${grupoSeleccionado.nombre_empresa}` : "Pedidos por empresa"}</h2>
          </div>
          <div className="admin-header-botones">
            {grupoSeleccionado && <button type="button" onClick={() => setEmpresaPedidosSeleccionada(null)}>Ver empresas</button>}
            <button type="button" onClick={cargarPedidos}>Actualizar</button>
          </div>
        </div>

        {!grupoSeleccionado ? (
          <div className="admin-empresa-selector-grid">
            {pedidosPorEmpresa.map((grupo) => (
              <button
                type="button"
                className="admin-empresa-selector-card"
                key={grupo.nombre_empresa}
                onClick={() => setEmpresaPedidosSeleccionada(grupo.nombre_empresa)}
              >
                <span>Empresa</span>
                <h3>{grupo.nombre_empresa}</h3>
                <p>{grupo.pedidos.length} pedido(s) registrados</p>
                <strong>{formatearMonto(grupo.total)}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="admin-lista">
            {grupoSeleccionado.pedidos.map((pedido) => (
              <article className="admin-pedido-card" key={pedido.id_pedido}>
                <div className="admin-pedido-top">
                  <div>
                    <span>Pedido #{pedido.id_pedido} de {grupoSeleccionado.nombre_empresa}</span>
                    <h3>{formatearMonto(pedido.total)}</h3>
                    <p>{nombreCompleto(pedido.cliente)} · {pedido.cliente?.email}</p>
                  </div>
                  <div className="admin-pedido-estados">
                    <EstadoBadge estado={pedido.estado_pedido} />
                    <EstadoBadge estado={pedido.pago?.estado_pago || "SIN PAGO"} />
                  </div>
                </div>

                <div className="admin-items-lista">
                  {pedido.items
                    .filter((item) => item.empresa === grupoSeleccionado.nombre_empresa)
                    .map((item, index) => (
                      <div key={`${pedido.id_pedido}-${index}`}>
                        <strong>{item.nombre_producto}</strong>
                        <p>{item.color} · Talla {item.talla} · Cantidad {item.cantidad}</p>
                        <span>{formatearMonto(item.subtotal)}</span>
                      </div>
                    ))}
                </div>

                <div className="admin-mini-acciones derecha">
                  <button type="button" className="ver" onClick={() => mostrarDetalle("Pedido", pedido)}>Ver pedido</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPagos = () => {
    const grupoSeleccionado = empresaPagosSeleccionada
      ? pagosPorEmpresa.find((grupo) => grupo.nombre_empresa === empresaPagosSeleccionada)
      : null;

    return (
      <div className="admin-page">
        <div className="admin-section-header">
          <div>
            <span>Pagos globales</span>
            <h2>{grupoSeleccionado ? `Pagos de ${grupoSeleccionado.nombre_empresa}` : "Pagos por empresa"}</h2>
          </div>
          <div className="admin-header-botones">
            {grupoSeleccionado && <button type="button" onClick={() => setEmpresaPagosSeleccionada(null)}>Ver empresas</button>}
            <button type="button" onClick={cargarPagos}>Actualizar</button>
          </div>
        </div>

        <div className="admin-filtros-pills">
          {["TODOS", "EN_REVISION", "PAGADO", "RECHAZADO", "PENDIENTE"].map((estado) => (
            <button
              key={estado}
              type="button"
              className={filtroPago === estado ? "activo" : ""}
              onClick={() => {
                setFiltroPago(estado);
                setEmpresaPagosSeleccionada(null);
              }}
            >
              {estado}
            </button>
          ))}
        </div>

        {!grupoSeleccionado ? (
          <div className="admin-empresa-selector-grid">
            {pagosPorEmpresa.map((grupo) => (
              <button
                type="button"
                className="admin-empresa-selector-card"
                key={grupo.nombre_empresa}
                onClick={() => setEmpresaPagosSeleccionada(grupo.nombre_empresa)}
              >
                <span>Empresa</span>
                <h3>{grupo.nombre_empresa}</h3>
                <p>{grupo.pagos.length} pago(s) · {grupo.enRevision} en revisión</p>
                <strong>{formatearMonto(grupo.total)}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="admin-lista">
            {grupoSeleccionado.pagos.map((pago) => (
              <article className="admin-pago-card" key={pago.id_pago}>
                <div className="admin-pedido-top">
                  <div>
                    <span>Pago #{pago.id_pago} · Pedido #{pago.id_pedido}</span>
                    <h3>{formatearMonto(pago.monto)}</h3>
                    <p>{nombreCompleto(pago.cliente)} · {pago.cliente?.email}</p>
                  </div>
                  <EstadoBadge estado={pago.estado_pago} />
                </div>

                <div className="admin-info-lista compacta">
                  <div><span>Método</span><strong>{pago.metodo_pago}</strong></div>
                  <div><span>Estado pedido</span><strong>{pago.estado_pedido || "Sin pedido"}</strong></div>
                  <div><span>Tienda</span><strong>{grupoSeleccionado.nombre_empresa}</strong></div>
                </div>

                <div className="admin-items-lista compacta">
                  {pago.items
                    ?.filter((item) => item.empresa === grupoSeleccionado.nombre_empresa)
                    .map((item, index) => (
                      <div key={`${pago.id_pago}-${index}`}>
                        <strong>{item.nombre_producto}</strong>
                        <p>{item.color} · Talla {item.talla} · Cantidad {item.cantidad}</p>
                        <span>{formatearMonto(item.subtotal)}</span>
                      </div>
                    ))}
                </div>

                <div className="admin-pago-acciones">
                  {pago.comprobante_url ? (
                    <button type="button" onClick={() => setImagenModal(obtenerUrlImagen(pago.comprobante_url))}>Ver comprobante</button>
                  ) : (
                    <span>Sin comprobante</span>
                  )}
                  <button type="button" onClick={() => mostrarDetalle("Pago", pago)}>Ver detalle</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSoporte = () => (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <span>Soporte</span>
          <h2>Tickets de usuarios</h2>
        </div>
        <button type="button" onClick={cargarSoporte}>Actualizar</button>
      </div>

      <div className="admin-lista">
        {tickets.length === 0 && (
          <div className="admin-vacio-card">
            <h3>No hay tickets de soporte</h3>
            <p>Cuando un cliente o una empresa escriba una queja o consulta, aparecerá aquí.</p>
          </div>
        )}

        {tickets.map((ticket) => (
          <article className="admin-ticket-card admin-ticket-mejorado" key={ticket.id_ticket}>
            <div className="admin-pedido-top">
              <div>
                <span>Ticket #{ticket.id_ticket}</span>
                <h3>{ticket.asunto}</h3>
                <p>
                  {ticket.usuario?.nombre} {ticket.usuario?.apellido || ""} · {ticket.usuario?.email} · {ticket.usuario?.rol || "Usuario"}
                </p>
              </div>
              <EstadoBadge estado={ticket.estado_ticket} />
            </div>

            <div className="admin-ticket-descripcion">
              <span>Mensaje principal</span>
              <p>{ticket.descripcion}</p>
            </div>

            {ticket.ultimo_mensaje && ticket.ultimo_mensaje !== ticket.descripcion && (
              <div className="admin-ticket-ultimo">
                <span>Último mensaje</span>
                <p>{ticket.ultimo_mensaje}</p>
              </div>
            )}

            <div className="admin-empresa-acciones admin-ticket-acciones">
              <button type="button" className="ver" onClick={() => abrirConversacionTicket(ticket)}>Ver y responder</button>
              <button type="button" className="pendiente" onClick={() => cambiarEstadoTicket(ticket, "EN_PROCESO")}>En revisión</button>
              <button type="button" className="aprobar" onClick={() => cambiarEstadoTicket(ticket, "CERRADO")}>Cerrar</button>
              <button type="button" className="deshabilitar" onClick={() => cambiarEstadoTicket(ticket, "ABIERTO")}>Reabrir</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  const renderMiCuenta = () => (
    <div className="admin-page">
      <div className="admin-section-header">
        <div>
          <span>Cuenta administrativa</span>
          <h2>Mi cuenta</h2>
        </div>
        <button type="button" onClick={() => setEditandoCuenta(!editandoCuenta)}>
          {editandoCuenta ? "Cancelar edición" : "Editar datos"}
        </button>
      </div>

      {mensajeCuenta && <div className={`mensaje-producto ${tipoMensajeCuenta}`}>{mensajeCuenta}</div>}

      {!editandoCuenta ? (
        <div className="admin-cuenta-grid">
          <article className="admin-cuenta-principal">
            <AdminAvatar nombre={cuentaAdmin.nombre} imagen={cuentaAdmin.foto_url} />
            <span>Administrador</span>
            <h3>{cuentaAdmin.nombre} {cuentaAdmin.apellido || ""}</h3>
            <p>Cuenta con permisos para revisar empresas, usuarios, pedidos, pagos y soporte dentro de Zyra.</p>
            <EstadoBadge estado={usuario.estado || "ACTIVO"} />
          </article>

          <article className="admin-cuenta-card">
            <span>Correo</span>
            <strong>{cuentaAdmin.email}</strong>
            <p>Correo usado para iniciar sesión.</p>
          </article>

          <article className="admin-cuenta-card">
            <span>Teléfono</span>
            <strong>{cuentaAdmin.telefono || "No registrado"}</strong>
            <p>Contacto administrativo opcional.</p>
          </article>

          <article className="admin-cuenta-card seguridad">
            <span>Seguridad</span>
            <strong>Contraseña</strong>
            <p>Tu contraseña se mantiene protegida. Puedes cambiarla cuando lo necesites.</p>
            <button type="button" onClick={() => setCambiandoPassword(!cambiandoPassword)}>
              {cambiandoPassword ? "Cancelar cambio" : "Cambiar contraseña"}
            </button>
          </article>
        </div>
      ) : (
        <form className="admin-cuenta-form" onSubmit={guardarCuentaAdmin}>
          <div className="admin-cuenta-foto-editor">
            <AdminAvatar nombre={cuentaAdmin.nombre} imagen={fotoAdmin ? URL.createObjectURL(fotoAdmin) : cuentaAdmin.foto_url} />
            <label>
              Foto de perfil
              <input type="file" accept="image/*" onChange={(e) => setFotoAdmin(e.target.files?.[0] || null)} />
            </label>
            <p>Si no subes foto, se mostrará la primera letra de tu nombre.</p>
          </div>

          <div className="form-grid">
            <label className="campo-panel">
              Nombre *
              <input value={cuentaAdmin.nombre} onChange={(e) => setCuentaAdmin({ ...cuentaAdmin, nombre: e.target.value })} required />
            </label>
            <label className="campo-panel">
              Apellido
              <input value={cuentaAdmin.apellido || ""} onChange={(e) => setCuentaAdmin({ ...cuentaAdmin, apellido: e.target.value })} />
            </label>
            <label className="campo-panel">
              Correo *
              <input type="email" value={cuentaAdmin.email} onChange={(e) => setCuentaAdmin({ ...cuentaAdmin, email: e.target.value })} required />
            </label>
            <label className="campo-panel">
              Teléfono
              <input value={cuentaAdmin.telefono || ""} onChange={(e) => setCuentaAdmin({ ...cuentaAdmin, telefono: e.target.value })} />
            </label>
          </div>

          <div className="acciones-form">
            <button type="button" className="btn-panel-secundario" onClick={() => setEditandoCuenta(false)}>Cancelar</button>
            <button type="submit" className="btn-panel-principal">Guardar cambios</button>
          </div>
        </form>
      )}

      {editandoCuenta && !cambiandoPassword && (
        <article className="admin-cuenta-card seguridad admin-cuenta-seguridad-horizontal">
          <div>
            <span>Seguridad</span>
            <strong>Contraseña</strong>
            <p>Tu contraseña actual se mantiene protegida. Puedes cambiarla sin afectar tus otros datos.</p>
          </div>
          <button type="button" onClick={() => setCambiandoPassword(true)}>Cambiar contraseña</button>
        </article>
      )}

      {cambiandoPassword && (
        <form className="admin-password-form" onSubmit={guardarPasswordAdmin}>
          <div className="admin-panel-title">
            <span>Seguridad</span>
            <h3>Cambiar contraseña</h3>
          </div>

          <div className="form-grid">
            <label className="campo-panel">
              Contraseña actual
              <input
                type="password"
                value={passwordCuenta.password_actual}
                onChange={(e) => setPasswordCuenta({ ...passwordCuenta, password_actual: e.target.value })}
                required
              />
            </label>
            <label className="campo-panel">
              Nueva contraseña
              <div className="password-input-panel">
                <input
                  type={verPasswordNueva ? "text" : "password"}
                  value={passwordCuenta.password_nueva}
                  onChange={(e) => setPasswordCuenta({ ...passwordCuenta, password_nueva: e.target.value })}
                  required
                />
                <button type="button" className="btn-ojo-password" onClick={() => setVerPasswordNueva(!verPasswordNueva)}><EyeIcon /></button>
              </div>
            </label>
            <label className="campo-panel">
              Confirmar nueva contraseña
              <div className="password-input-panel">
                <input
                  type={verPasswordConfirmar ? "text" : "password"}
                  value={passwordCuenta.confirmar_password}
                  onChange={(e) => setPasswordCuenta({ ...passwordCuenta, confirmar_password: e.target.value })}
                  required
                />
                <button type="button" className="btn-ojo-password" onClick={() => setVerPasswordConfirmar(!verPasswordConfirmar)}><EyeIcon /></button>
              </div>
            </label>
          </div>

          <div className="acciones-form">
            <button type="button" className="btn-panel-secundario" onClick={() => setCambiandoPassword(false)}>Cancelar</button>
            <button type="submit" className="btn-panel-principal">Guardar nueva contraseña</button>
          </div>
        </form>
      )}
    </div>
  );

  const renderDetalleModal = () => {
    if (!detalleModal) return null;

    const { tipo, datos } = detalleModal;

    return (
      <div className="admin-detalle-modal-fondo" onClick={() => setDetalleModal(null)}>
        <article className="admin-detalle-modal" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="admin-modal-cerrar" onClick={() => setDetalleModal(null)}>×</button>
          <span>Detalle</span>
          <h2>{tipo}</h2>

          {tipo === "Usuario" && (
            <div className="admin-detalle-layout">
              <AdminAvatar nombre={datos.nombre} imagen={datos.foto_url} />
              <div className="admin-info-lista">
                <div><span>Nombre</span><strong>{nombreCompleto(datos)}</strong></div>
                <div><span>Correo</span><strong>{datos.email}</strong></div>
                <div><span>Teléfono</span><strong>{datos.telefono || "No registrado"}</strong></div>
                <div><span>Rol</span><strong>{datos.rol}</strong></div>
                <div><span>Estado</span><strong>{datos.estado}</strong></div>
              </div>
            </div>
          )}

          {tipo === "Empresa" && (
            <div className="admin-detalle-layout">
              <AdminAvatar nombre={datos.nombre_empresa} imagen={datos.logo_url} />
              <div className="admin-info-lista">
                <div><span>Empresa</span><strong>{datos.nombre_empresa}</strong></div>
                <div><span>Estado</span><strong>{datos.estado_empresa}</strong></div>
                <div><span>Responsable</span><strong>{datos.nombre_responsable} {datos.apellido_responsable || ""}</strong></div>
                <div><span>Correo</span><strong>{datos.email}</strong></div>
                <div><span>Teléfono</span><strong>{datos.telefono || "No registrado"}</strong></div>
                <div><span>Dirección</span><strong>{datos.direccion || "No registrada"}</strong></div>
                <div><span>Ciudad</span><strong>{datos.ciudad || "La Paz"}</strong></div>
                <div><span>WhatsApp</span><strong>{datos.whatsapp || "No registrado"}</strong></div>
                <div><span>NIT</span><strong>{datos.nit || "No registrado"}</strong></div>
                <div><span>Instagram</span><strong>{datos.instagram || "No registrado"}</strong></div>
                <div><span>Facebook</span><strong>{datos.facebook || "No registrado"}</strong></div>
              </div>
            </div>
          )}

          {tipo === "Producto" && (
            <div className="admin-detalle-producto">
              <div className="admin-producto-img grande">
                {datos.imagen_principal ? <img src={obtenerUrlImagen(datos.imagen_principal)} alt={datos.nombre_producto} /> : <span>Sin imagen</span>}
              </div>
              <div className="admin-info-lista">
                <div><span>Producto</span><strong>{datos.nombre_producto}</strong></div>
                <div><span>Empresa</span><strong>{datos.empresa?.nombre_empresa}</strong></div>
                <div><span>Categoría</span><strong>{datos.categoria}</strong></div>
                <div><span>Precio</span><strong>{formatearMonto(datos.precio)}</strong></div>
                <div><span>Stock total</span><strong>{datos.stock_total}</strong></div>
                <div><span>Estado</span><strong>{datos.estado_producto}</strong></div>
              </div>
            </div>
          )}

          {tipo === "Pedido" && (
            <div className="admin-info-lista">
              <div><span>Pedido</span><strong>#{datos.id_pedido}</strong></div>
              <div><span>Total</span><strong>{formatearMonto(datos.total)}</strong></div>
              <div><span>Cliente</span><strong>{nombreCompleto(datos.cliente)}</strong></div>
              <div><span>Correo</span><strong>{datos.cliente?.email}</strong></div>
              <div><span>Estado pedido</span><strong>{datos.estado_pedido}</strong></div>
              <div><span>Estado pago</span><strong>{datos.pago?.estado_pago || "Sin pago"}</strong></div>
              <div><span>Tiendas</span><strong>{datos.tiendas?.join(", ") || "No registrado"}</strong></div>
            </div>
          )}

          {tipo === "Pago" && (
            <div className="admin-info-lista">
              <div><span>Pago</span><strong>#{datos.id_pago}</strong></div>
              <div><span>Pedido</span><strong>#{datos.id_pedido}</strong></div>
              <div><span>Monto</span><strong>{formatearMonto(datos.monto)}</strong></div>
              <div><span>Método</span><strong>{datos.metodo_pago}</strong></div>
              <div><span>Estado pago</span><strong>{datos.estado_pago}</strong></div>
              <div><span>Estado pedido</span><strong>{datos.estado_pedido}</strong></div>
              <div><span>Cliente</span><strong>{nombreCompleto(datos.cliente)}</strong></div>
              <div><span>Tiendas</span><strong>{datos.tiendas?.join(", ") || "No registrado"}</strong></div>
            </div>
          )}
        </article>
      </div>
    );
  };

  return (
    <PortalLayout
      logo="Zyra Admin"
      titulo={seccion === "mi_cuenta" ? "Mi cuenta" : usuario?.nombre || "Administrador"}
      subtitulo="Panel administrativo"
      menu={menu}
      activo={seccion}
      onMenuClick={setSeccion}
      onVolver={onVolver}
      onCerrarSesion={onCerrarSesion}
    >
      <div className="admin-top-actions">
        <button type="button" className="admin-bell" onClick={abrirNotificaciones}>
          <BellIcon />
          {notificacionesNuevas > 0 && <span>{notificacionesNuevas}</span>}
        </button>

        {notificacionesAbiertas && (
          <div className="admin-notificaciones-popover">
            <button type="button" className="admin-popover-close" onClick={() => { setNotificacionesAbiertas(false); setNotificacionesRecientes([]); }}>
              <XIcon />
            </button>
            <span>Notificaciones</span>
            <h3>Actividad administrativa</h3>
            {notificaciones.length === 0 ? (
              <p className="admin-notificacion-vacia">No hay avisos pendientes.</p>
            ) : (
              <div className="admin-notificaciones-lista">
                {notificaciones.map((noti) => (
                  <button
                    type="button"
                    key={noti.id}
                    className={`admin-notificacion-item ${noti.tipo} ${
                      notificacionesRecientes.includes(noti.id) ? "sin-leer" : ""
                    }`}
                    onClick={() => irDesdeNotificacion(noti)}
                  >
                    <strong>{noti.titulo}</strong>
                    <p>{noti.texto}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && <div className="admin-error-box">{error}</div>}
      {cargando && <div className="admin-cargando-box">Cargando información...</div>}

      {!cargando && seccion === "resumen" && renderResumen()}
      {!cargando && seccion === "empresas" && renderEmpresas()}
      {!cargando && seccion === "usuarios" && renderUsuarios()}
      {!cargando && seccion === "productos" && renderProductos()}
      {!cargando && seccion === "pedidos" && renderPedidos()}
      {!cargando && seccion === "pagos" && renderPagos()}
      {!cargando && seccion === "soporte" && renderSoporte()}
      {!cargando && seccion === "mi_cuenta" && renderMiCuenta()}

      {imagenModal && (
        <div className="admin-imagen-modal" onClick={() => setImagenModal(null)}>
          <button type="button" onClick={() => setImagenModal(null)}>×</button>
          <img src={imagenModal} alt="Comprobante" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {ticketConversacion && (
        <div className="admin-soporte-modal-fondo" onClick={() => setTicketConversacion(null)}>
          <article className="admin-soporte-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="admin-modal-cerrar" onClick={() => setTicketConversacion(null)}>×</button>
            <span>Conversación de soporte</span>
            <h2>{ticketConversacion.asunto}</h2>
            <p className="admin-soporte-modal-subtitulo">
              Ticket #{ticketConversacion.id_ticket} · {ticketConversacion.usuario?.nombre} {ticketConversacion.usuario?.apellido || ""} · {ticketConversacion.usuario?.email}
            </p>

            <div className="admin-soporte-mensajes">
              {cargandoMensajesTicket ? (
                <p className="admin-soporte-cargando">Cargando mensajes...</p>
              ) : mensajesTicket.length === 0 ? (
                <p className="admin-soporte-cargando">Todavía no hay mensajes registrados.</p>
              ) : (
                mensajesTicket.map((mensaje) => {
                  const rol = String(mensaje.rol || "").toUpperCase();
                  const esAdminMensaje = rol === "ADMIN" || rol === "ADMINISTRADOR";
                  return (
                    <div
                      className={`admin-soporte-mensaje ${esAdminMensaje ? "admin" : "usuario"}`}
                      key={mensaje.id_mensaje}
                    >
                      <strong>{esAdminMensaje ? "Zyra soporte" : `${mensaje.nombre || "Usuario"} ${mensaje.apellido || ""}`}</strong>
                      <p>{mensaje.mensaje}</p>
                    </div>
                  );
                })
              )}
            </div>

            <form className="admin-soporte-respuesta" onSubmit={enviarRespuestaTicket}>
              <label>Responder como Zyra</label>
              <textarea
                value={respuestaTicket}
                onChange={(e) => setRespuestaTicket(e.target.value)}
                placeholder="Escribe la respuesta para el usuario..."
              />
              <button type="submit" disabled={enviandoRespuestaTicket}>
                {enviandoRespuestaTicket ? "Enviando..." : "Enviar respuesta"}
              </button>
            </form>
          </article>
        </div>
      )}

      {renderDetalleModal()}
    </PortalLayout>
  );
}
