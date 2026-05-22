export const API_URL = "http://127.0.0.1:8000";

const procesarRespuesta = async (respuesta, mensajeError) => {
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || mensajeError);
  }

  return datos;
};

export const obtenerUrlImagen = (url) => {
  if (!url) return null;

  if (url.startsWith("http")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return `${API_URL}/uploads/productos/${url}`;
};

export const obtenerColorHex = (color) => {
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

  const colorLimpio = color.toLowerCase().trim();
  return colores[colorLimpio] || "#cbd5e1";
};

/* AUTH */

export const loginUsuario = async (credenciales) => {
  const respuesta = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(credenciales)
  });

  return procesarRespuesta(respuesta, "No se pudo iniciar sesión.");
};

export const registrarClienteApi = async (cliente) => {
  const respuesta = await fetch(`${API_URL}/auth/registro-cliente`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(cliente)
  });

  return procesarRespuesta(respuesta, "No se pudo registrar el cliente.");
};

export const registrarEmpresaApi = async (empresa) => {
  const respuesta = await fetch(`${API_URL}/auth/registro-empresa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(empresa)
  });

  return procesarRespuesta(respuesta, "No se pudo registrar la empresa.");
};

/* CATEGORÍAS */

export const obtenerCategorias = async () => {
  const respuesta = await fetch(`${API_URL}/categorias`);
  const datos = await procesarRespuesta(
    respuesta,
    "No se pudieron cargar las categorías."
  );

  return datos.categorias || [];
};

export const crearCategoria = async (categoria) => {
  const respuesta = await fetch(`${API_URL}/categorias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(categoria)
  });

  return procesarRespuesta(respuesta, "No se pudo crear la categoría.");
};

/* PRODUCTOS EMPRESA */

export const obtenerProductosEmpresa = async (idEmpresa) => {
  const respuesta = await fetch(`${API_URL}/empresa/${idEmpresa}/productos`);
  const datos = await procesarRespuesta(
    respuesta,
    "No se pudieron cargar los productos."
  );

  return datos.productos || [];
};

export const crearProductoEmpresa = async (producto) => {
  const respuesta = await fetch(`${API_URL}/empresa/productos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(producto)
  });

  return procesarRespuesta(respuesta, "No se pudo registrar el producto.");
};

export const editarProductoEmpresa = async (idProducto, producto) => {
  const respuesta = await fetch(`${API_URL}/empresa/productos/${idProducto}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(producto)
  });

  return procesarRespuesta(respuesta, "No se pudo editar el producto.");
};

export const subirImagenProducto = async (idProducto, idEmpresa, archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const respuesta = await fetch(
    `${API_URL}/empresa/productos/${idProducto}/imagen?id_empresa=${idEmpresa}`,
    {
      method: "POST",
      body: formData
    }
  );

  return procesarRespuesta(respuesta, "No se pudo subir la imagen.");
};

export const cambiarEstadoProductoApi = async (
  idProducto,
  idEmpresa,
  estadoProducto
) => {
  const respuesta = await fetch(
    `${API_URL}/empresa/productos/${idProducto}/estado`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id_empresa: idEmpresa,
        estado_producto: estadoProducto
      })
    }
  );

  return procesarRespuesta(
    respuesta,
    "No se pudo cambiar el estado del producto."
  );
};

export const inactivarProductoApi = async (idProducto, idEmpresa) => {
  const respuesta = await fetch(
    `${API_URL}/empresa/productos/${idProducto}?id_empresa=${idEmpresa}`,
    {
      method: "DELETE"
    }
  );

  return procesarRespuesta(respuesta, "No se pudo inactivar el producto.");
};

export const borrarProductoDefinitivoApi = async (idProducto, idEmpresa) => {
  const respuesta = await fetch(
    `${API_URL}/empresa/productos/${idProducto}/definitivo?id_empresa=${idEmpresa}`,
    {
      method: "DELETE"
    }
  );

  return procesarRespuesta(
    respuesta,
    "No se pudo borrar definitivamente el producto."
  );
};

export const agregarVarianteProductoApi = async (idProducto, variante) => {
  const respuesta = await fetch(`${API_URL}/empresa/productos/${idProducto}/variantes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(variante)
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudo agregar la variante.");
  }

  return datos;
};

export const editarVarianteProductoApi = async (idVariante, variante) => {
  const respuesta = await fetch(`${API_URL}/empresa/productos/variantes/${idVariante}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(variante)
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudo editar la variante.");
  }

  return datos;
};

export const cambiarEstadoVarianteApi = async (idVariante, datosEstado) => {
  const respuesta = await fetch(`${API_URL}/empresa/productos/variantes/${idVariante}/estado`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosEstado)
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudo cambiar el estado de la variante.");
  }

  return datos;
};

/* PEDIDOS EMPRESA */

export const obtenerPedidosEmpresa = async (idEmpresa) => {
  const respuesta = await fetch(`${API_URL}/empresa/${idEmpresa}/pedidos`);
  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudieron cargar los pedidos.");
  }

  return datos.pedidos || [];
};

/* GESTIÓN DE PEDIDOS Y PAGOS EMPRESA */

export const cambiarEstadoPagoEmpresaApi = async (
  idPago,
  idEmpresa,
  estadoPago
) => {
  const respuesta = await fetch(`${API_URL}/empresa/pagos/${idPago}/estado`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id_empresa: idEmpresa,
      estado_pago: estadoPago
    })
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudo cambiar el estado del pago.");
  }

  return datos;
};

export const cambiarEstadoPedidoEmpresaApi = async (
  idPedido,
  idEmpresa,
  estadoPedido
) => {
  const respuesta = await fetch(
    `${API_URL}/empresa/pedidos/${idPedido}/estado`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id_empresa: idEmpresa,
        estado_pedido: estadoPedido
      })
    }
  );

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.detail || "No se pudo cambiar el estado del pedido.");
  }

  return datos;
};

/* CUENTA EMPRESA */

export const actualizarCuentaEmpresaApi = async (idEmpresa, datosCuenta) => {
  const respuesta = await fetch(`${API_URL}/empresa/cuenta/${idEmpresa}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosCuenta)
  });

  return procesarRespuesta(respuesta, "No se pudo actualizar la cuenta.");
};

export const subirLogoEmpresaApi = async (idEmpresa, idUsuario, archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const respuesta = await fetch(
    `${API_URL}/empresa/cuenta/${idEmpresa}/logo?id_usuario=${idUsuario}`,
    {
      method: "POST",
      body: formData
    }
  );

  return procesarRespuesta(respuesta, "No se pudo subir el logo.");
};

export const cambiarPasswordEmpresaApi = async (idEmpresa, datosPassword) => {
  const respuesta = await fetch(`${API_URL}/empresa/cuenta/${idEmpresa}/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosPassword)
  });

  return procesarRespuesta(respuesta, "No se pudo cambiar la contraseña.");
};

export const obtenerCuentaEmpresaApi = async (idEmpresa, idUsuario) => {
  const respuesta = await fetch(
    `${API_URL}/empresa/cuenta/${idEmpresa}?id_usuario=${idUsuario}`
  );

  return procesarRespuesta(respuesta, "No se pudieron cargar los datos de la empresa.");
};

export const subirQrPagoEmpresaApi = async (idEmpresa, idUsuario, archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const respuesta = await fetch(
    `${API_URL}/empresa/cuenta/${idEmpresa}/qr-pago?id_usuario=${idUsuario}`,
    {
      method: "POST",
      body: formData
    }
  );

  return procesarRespuesta(respuesta, "No se pudo actualizar el QR de pago.");
};


/* ADMINISTRACIÓN */

export const obtenerResumenAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/resumen?id_admin=${idAdmin}`);
  return procesarRespuesta(respuesta, "No se pudo cargar el resumen del administrador.");
};

export const obtenerEmpresasAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/empresas?id_admin=${idAdmin}`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar las empresas.");
  return datos.empresas || [];
};

export const cambiarEstadoEmpresaAdminApi = async (idEmpresa, idAdmin, estadoEmpresa) => {
  const respuesta = await fetch(`${API_URL}/admin/empresas/${idEmpresa}/estado`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id_admin: idAdmin,
      estado_empresa: estadoEmpresa
    })
  });

  return procesarRespuesta(respuesta, "No se pudo cambiar el estado de la empresa.");
};

export const obtenerUsuariosAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/usuarios?id_admin=${idAdmin}`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar los usuarios.");
  return datos.usuarios || [];
};

export const obtenerProductosAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/productos?id_admin=${idAdmin}`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar los productos.");
  return datos.productos || [];
};

export const obtenerPedidosAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/pedidos?id_admin=${idAdmin}`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar los pedidos.");
  return datos.pedidos || [];
};

export const obtenerPagosAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/pagos?id_admin=${idAdmin}`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar los pagos.");
  return datos.pagos || [];
};

export const obtenerSoporteAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/soporte?id_admin=${idAdmin}`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar los tickets de soporte.");
  return datos.tickets || [];
};

export const cambiarEstadoSoporteAdminApi = async (idTicket, idAdmin, estadoTicket) => {
  const respuesta = await fetch(`${API_URL}/admin/soporte/${idTicket}/estado`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id_admin: idAdmin,
      estado_ticket: estadoTicket
    })
  });

  return procesarRespuesta(respuesta, "No se pudo cambiar el estado del ticket.");
};


/* ADMINISTRACIÓN: USUARIOS Y MI CUENTA */

export const crearAdministradorAdminApi = async (datosAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/usuarios/administradores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosAdmin)
  });

  return procesarRespuesta(respuesta, "No se pudo crear el administrador.");
};

export const cambiarEstadoUsuarioAdminApi = async (idUsuario, idAdmin, estadoUsuario) => {
  const respuesta = await fetch(`${API_URL}/admin/usuarios/${idUsuario}/estado`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id_admin: idAdmin,
      estado_usuario: estadoUsuario
    })
  });

  return procesarRespuesta(respuesta, "No se pudo cambiar el estado del usuario.");
};

export const eliminarUsuarioAdminApi = async (idUsuario, idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/usuarios/${idUsuario}?id_admin=${idAdmin}`, {
    method: "DELETE"
  });

  return procesarRespuesta(respuesta, "No se pudo eliminar el usuario.");
};

export const obtenerCuentaAdminApi = async (idAdmin) => {
  const respuesta = await fetch(`${API_URL}/admin/cuenta/${idAdmin}`);
  return procesarRespuesta(respuesta, "No se pudieron cargar los datos del administrador.");
};

export const actualizarCuentaAdminApi = async (idAdmin, datosCuenta) => {
  const respuesta = await fetch(`${API_URL}/admin/cuenta/${idAdmin}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosCuenta)
  });

  return procesarRespuesta(respuesta, "No se pudo actualizar la cuenta administrativa.");
};

export const subirFotoAdminApi = async (idAdmin, archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);

  const respuesta = await fetch(`${API_URL}/admin/cuenta/${idAdmin}/foto`, {
    method: "POST",
    body: formData
  });

  return procesarRespuesta(respuesta, "No se pudo subir la foto del administrador.");
};

export const cambiarPasswordAdminApi = async (idAdmin, datosPassword) => {
  const respuesta = await fetch(`${API_URL}/admin/cuenta/${idAdmin}/password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosPassword)
  });

  return procesarRespuesta(respuesta, "No se pudo cambiar la contraseña administrativa.");
};


/* SOPORTE TÉCNICO */

export const crearSoportePublicoApi = async (datosSoporte) => {
  const respuesta = await fetch(`${API_URL}/soporte/publico`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(datosSoporte)
  });

  return procesarRespuesta(respuesta, "No se pudo enviar el mensaje a soporte técnico.");
};

export const crearTicketSoporteApi = async (ticket) => {
  const respuesta = await fetch(`${API_URL}/soporte/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(ticket)
  });

  return procesarRespuesta(respuesta, "No se pudo crear el ticket de soporte.");
};

export const obtenerTicketsUsuarioApi = async (idUsuario) => {
  const respuesta = await fetch(`${API_URL}/usuario/${idUsuario}/soporte/tickets`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar tus tickets de soporte.");
  return datos.tickets || [];
};


export const obtenerMensajesTicketApi = async (idTicket, idUsuario) => {
  const respuesta = await fetch(`${API_URL}/soporte/tickets/${idTicket}/mensajes?id_usuario=${idUsuario}`);
  return procesarRespuesta(respuesta, "No se pudieron cargar los mensajes del ticket.");
};

export const responderTicketSoporteApi = async (idTicket, idUsuario, mensaje) => {
  const respuesta = await fetch(`${API_URL}/soporte/tickets/${idTicket}/mensajes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id_usuario: idUsuario,
      mensaje
    })
  });

  return procesarRespuesta(respuesta, "No se pudo enviar la respuesta de soporte.");
};


/* NOTIFICACIONES DE USUARIO */

export const obtenerNotificacionesUsuarioApi = async (idUsuario) => {
  const respuesta = await fetch(`${API_URL}/usuario/${idUsuario}/notificaciones`);
  const datos = await procesarRespuesta(respuesta, "No se pudieron cargar las notificaciones.");
  return datos.notificaciones || [];
};

export const marcarNotificacionUsuarioLeidaApi = async (idNotificacion, idUsuario) => {
  const respuesta = await fetch(
    `${API_URL}/usuario/notificaciones/${idNotificacion}/leer?id_usuario=${idUsuario}`,
    { method: "PUT" }
  );

  return procesarRespuesta(respuesta, "No se pudo marcar la notificación como leída.");
};
