import { useState } from "react";
import { EyeIcon, EyeOffIcon, SparkIcon } from "../components/auth/Icons";
import {
  loginUsuario,
  registrarClienteApi,
  registrarEmpresaApi,
  crearSoportePublicoApi
} from "../services/api";

const estadoInicialCliente = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  confirmarPassword: "",
  telefono: ""
};

const estadoInicialEmpresa = {
  nombre: "",
  apellido: "",
  email: "",
  password: "",
  telefono: "",
  nombre_empresa: "",
  descripcion: "",
  nit: "",
  direccion: "",
  ciudad: "La Paz",
  whatsapp: "",
  instagram: "",
  facebook: "",
  logo_url: ""
};

const estadoInicialSoporte = {
  nombre: "",
  email: "",
  tipo_usuario: "Visitante",
  asunto: "",
  mensaje: ""
};

export default function LoginPage({
  usuario,
  setUsuario,
  onIngresarEmpresa,
  onIngresarCliente,
  onIngresarAdmin
}) {
  const [modo, setModo] = useState("login");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const [login, setLogin] = useState({
    email: "empresa1@zyra.com",
    password: "123456"
  });

  const [cliente, setCliente] = useState(estadoInicialCliente);
  const [empresa, setEmpresa] = useState(estadoInicialEmpresa);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  const [mostrarSoporte, setMostrarSoporte] = useState(false);
  const [soporte, setSoporte] = useState(estadoInicialSoporte);
  const [mensajeSoporte, setMensajeSoporte] = useState("");
  const [tipoMensajeSoporte, setTipoMensajeSoporte] = useState("");
  const [enviandoSoporte, setEnviandoSoporte] = useState(false);

  const limpiarTexto = (texto) => String(texto || "").trim();

  const esEmailValido = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const mostrarError = (texto) => {
    setMensaje(texto);
    setTipoMensaje("error");
  };

  const mostrarOk = (texto) => {
    setMensaje(texto);
    setTipoMensaje("ok");
  };

  const cambiarLogin = (e) => {
    setMensaje("");
    setTipoMensaje("");
    setLogin({
      ...login,
      [e.target.name]: e.target.value
    });
  };

  const cambiarCliente = (e) => {
    setMensaje("");
    setTipoMensaje("");

    const { name, value } = e.target;

    if (name === "telefono") {
      setCliente({
        ...cliente,
        [name]: value.replace(/\D/g, "").slice(0, 8)
      });
      return;
    }

    setCliente({
      ...cliente,
      [name]: value
    });
  };

  const cambiarEmpresa = (e) => {
    setMensaje("");
    setTipoMensaje("");

    const { name, value } = e.target;

    if (name === "telefono" || name === "whatsapp") {
      setEmpresa({
        ...empresa,
        [name]: value.replace(/\D/g, "").slice(0, 8)
      });
      return;
    }

    if (name === "nit") {
      setEmpresa({
        ...empresa,
        [name]: value.replace(/\D/g, "")
      });
      return;
    }

    setEmpresa({
      ...empresa,
      [name]: value
    });
  };


  const abrirSoporte = () => {
    setMensajeSoporte("");
    setTipoMensajeSoporte("");
    setSoporte({
      ...estadoInicialSoporte,
      nombre: usuario?.nombre ? `${usuario.nombre} ${usuario.apellido || ""}`.trim() : "",
      email: usuario?.email || login.email || "",
      tipo_usuario: usuario?.rol || "Visitante"
    });
    setMostrarSoporte(true);
  };

  const cambiarSoporte = (e) => {
    setMensajeSoporte("");
    setTipoMensajeSoporte("");
    const { name, value } = e.target;
    setSoporte({
      ...soporte,
      [name]: value
    });
  };

  const validarSoportePublico = () => {
    if (!limpiarTexto(soporte.nombre)) return "Debes ingresar tu nombre.";
    if (!limpiarTexto(soporte.email)) return "Debes ingresar tu correo.";
    if (!esEmailValido(soporte.email)) return "El correo no tiene un formato válido.";
    if (!limpiarTexto(soporte.asunto)) return "Debes escribir el asunto.";
    if (!limpiarTexto(soporte.mensaje)) return "Debes explicar tu consulta.";
    if (limpiarTexto(soporte.mensaje).length < 10) return "El mensaje debe tener al menos 10 caracteres.";
    return "";
  };

  const enviarSoportePublico = async (e) => {
    e.preventDefault();
    setMensajeSoporte("");
    setTipoMensajeSoporte("");

    const error = validarSoportePublico();
    if (error) {
      setMensajeSoporte(error);
      setTipoMensajeSoporte("error");
      return;
    }

    setEnviandoSoporte(true);

    try {
      await crearSoportePublicoApi({
        nombre: limpiarTexto(soporte.nombre),
        email: limpiarTexto(soporte.email),
        tipo_usuario: soporte.tipo_usuario || "Visitante",
        asunto: limpiarTexto(soporte.asunto),
        mensaje: limpiarTexto(soporte.mensaje)
      });

      setMensajeSoporte("Tu mensaje fue enviado a soporte técnico. Te responderemos lo antes posible.");
      setTipoMensajeSoporte("ok");
      setSoporte(estadoInicialSoporte);
    } catch (error) {
      setMensajeSoporte(error.message || "No se pudo enviar tu mensaje a soporte.");
      setTipoMensajeSoporte("error");
    }

    setEnviandoSoporte(false);
  };

  const validarLogin = () => {
    if (!limpiarTexto(login.email)) return "Debes ingresar tu correo electrónico.";
    if (!esEmailValido(login.email)) return "El correo electrónico no tiene un formato válido.";
    if (!login.password) return "Debes ingresar tu contraseña.";
    if (login.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    return "";
  };

  const validarCliente = () => {
    if (!limpiarTexto(cliente.nombre)) return "Debes ingresar tu nombre.";
    if (!limpiarTexto(cliente.email)) return "Debes ingresar tu correo electrónico.";
    if (!esEmailValido(cliente.email)) return "El correo electrónico no tiene un formato válido.";
    if (!cliente.password) return "Debes crear una contraseña.";
    if (cliente.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (cliente.password !== cliente.confirmarPassword) return "Las contraseñas no coinciden.";
    if (cliente.telefono && cliente.telefono.length !== 8) return "El teléfono debe tener exactamente 8 números.";
    return "";
  };

  const validarEmpresa = () => {
    if (!limpiarTexto(empresa.nombre)) return "Debes ingresar el nombre del responsable.";
    if (!limpiarTexto(empresa.nombre_empresa)) return "Debes ingresar el nombre de la empresa.";
    if (!limpiarTexto(empresa.email)) return "Debes ingresar el correo electrónico de la empresa.";
    if (!esEmailValido(empresa.email)) return "El correo electrónico no tiene un formato válido.";
    if (!empresa.password) return "Debes crear una contraseña para la cuenta empresarial.";
    if (empresa.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
    if (empresa.telefono && empresa.telefono.length !== 8) return "El teléfono debe tener exactamente 8 números.";
    if (empresa.whatsapp && empresa.whatsapp.length !== 8) return "El WhatsApp debe tener exactamente 8 números.";
    if (empresa.nit && empresa.nit.length < 5) return "El NIT debe tener al menos 5 números o puedes dejarlo vacío.";
    if (empresa.descripcion && empresa.descripcion.length < 10) return "La descripción debe tener al menos 10 caracteres o puedes dejarla vacía.";
    return "";
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipoMensaje("");

    const error = validarLogin();
    if (error) {
      mostrarError(error);
      return;
    }

    setCargando(true);

    try {
      const datos = await loginUsuario({
        email: limpiarTexto(login.email),
        password: login.password
      });

      setUsuario(datos);
      setAceptaTerminos(false);
      localStorage.setItem("usuario_zyra", JSON.stringify(datos));
    } catch (error) {
      mostrarError(error.message || "No se pudo iniciar sesión.");
    }

    setCargando(false);
  };

  const registrarCliente = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipoMensaje("");

    const error = validarCliente();
    if (error) {
      mostrarError(error);
      return;
    }

    setCargando(true);

    try {
      await registrarClienteApi({
        nombre: limpiarTexto(cliente.nombre),
        apellido: limpiarTexto(cliente.apellido),
        email: limpiarTexto(cliente.email),
        password: cliente.password,
        telefono: cliente.telefono || null
      });

      mostrarOk("Cuenta creada correctamente. Ahora puedes iniciar sesión.");

      setLogin({
        email: cliente.email,
        password: cliente.password
      });

      setCliente(estadoInicialCliente);

      setTimeout(() => {
        setModo("login");
      }, 1200);
    } catch (error) {
      mostrarError(error.message || "No se pudo registrar el cliente.");
    }

    setCargando(false);
  };

  const registrarEmpresa = async (e) => {
    e.preventDefault();
    setMensaje("");
    setTipoMensaje("");

    const error = validarEmpresa();
    if (error) {
      mostrarError(error);
      return;
    }

    setCargando(true);

    try {
      await registrarEmpresaApi({
        nombre: limpiarTexto(empresa.nombre),
        apellido: limpiarTexto(empresa.apellido),
        email: limpiarTexto(empresa.email),
        password: empresa.password,
        telefono: empresa.telefono || null,
        nombre_empresa: limpiarTexto(empresa.nombre_empresa),
        descripcion: limpiarTexto(empresa.descripcion) || null,
        nit: empresa.nit || null,
        direccion: limpiarTexto(empresa.direccion) || null,
        ciudad: limpiarTexto(empresa.ciudad) || "La Paz",
        whatsapp: empresa.whatsapp || null,
        instagram: limpiarTexto(empresa.instagram) || null,
        facebook: limpiarTexto(empresa.facebook) || null,
        logo_url: ""
      });

      mostrarOk(
        "Solicitud enviada correctamente. Tu empresa queda pendiente de aprobación. El equipo de Zyra revisará tus datos."
      );

      setLogin({
        email: empresa.email,
        password: empresa.password
      });

      setEmpresa(estadoInicialEmpresa);

      setTimeout(() => {
        setModo("login");
      }, 1800);
    } catch (error) {
      mostrarError(error.message || "No se pudo registrar la empresa.");
    }

    setCargando(false);
  };

  const textoPorRol = () => {
    if (!usuario) return null;

    if (usuario.rol === "EMPRESA") {
      if (usuario.estado_empresa === "PENDIENTE") {
        return {
          estado: "pendiente",
          titulo: "Tu empresa está en revisión",
          texto:
            "Gracias por solicitar formar parte de Zyra. Nuestro equipo revisará la información de tu tienda y, cuando sea aprobada, podrás acceder al panel empresarial.",
          extra: "Estado actual: PENDIENTE DE APROBACIÓN"
        };
      }

      if (usuario.estado_empresa === "APROBADA") {
        return {
          estado: "aprobada",
          titulo: "Tu empresa ya forma parte de Zyra",
          texto:
            "Tu tienda ha sido aprobada correctamente. Ahora puedes ingresar al panel empresarial para administrar tu catálogo, productos, imágenes, pedidos y pagos.",
          extra: `Empresa: ${usuario.nombre_empresa} · Estado: APROBADA`
        };
      }

      return {
        estado: "deshabilitada",
        titulo: "Tu empresa se encuentra deshabilitada",
        texto:
          "Actualmente tu cuenta empresarial no tiene acceso al panel de Zyra. Comunícate con soporte técnico para recibir más información.",
        extra: "Estado actual: DESHABILITADA"
      };
    }

    if (usuario.rol === "CLIENTE") {
      return {
        estado: "cliente",
        titulo: "Bienvenida/o a Zyra",
        texto:
          "Explora prendas de diferentes tiendas bolivianas desde un solo lugar. Busca por nombre, color, talla o categoría, y próximamente podrás encontrar productos similares usando una imagen.",
        extra: "Encuentra moda local de una forma más rápida e inteligente."
      };
    }

    return {
      estado: "admin",
      titulo: "Panel de administración",
      texto:
        "Desde aquí podrás supervisar empresas registradas, usuarios, productos, pedidos, pagos y solicitudes de soporte.",
      extra: "Administrador general de Zyra."
    };
  };

  const contenidoRol = textoPorRol();

  return (
    <main className="pagina">
      <section className="contenedor">
        <aside className="panel-info">
          <div className="marca">
            <div className="logo">Z</div>
            <span>ZYRA</span>
          </div>

          <div className="texto-principal">
            <p className="subtitulo">Moda local inteligente</p>

            <h1>Conecta productos, tiendas y clientes desde una sola plataforma.</h1>

            <p className="descripcion">
              Zyra nace para ayudar a las tiendas de moda bolivianas a mostrar
              su catálogo de forma organizada y permitir que los clientes
              encuentren prendas de una manera más rápida, visual y moderna.
            </p>
          </div>

          <div className="info-lista">
            <div className="info-item">
              <SparkIcon />
              <div>
                <h3>Catálogos digitales</h3>
                <p>
                  Las empresas podrán registrar prendas con imágenes,
                  descripciones, tallas, colores, precios y disponibilidad.
                </p>
              </div>
            </div>

            <div className="info-item">
              <SparkIcon />
              <div>
                <h3>Búsqueda inteligente</h3>
                <p>
                  Los clientes podrán encontrar productos por nombre, color,
                  talla, categoría o marca desde un solo lugar.
                </p>
              </div>
            </div>

            <div className="info-item">
              <SparkIcon />
              <div>
                <h3>Visión con inteligencia artificial</h3>
                <p>
                  Próximamente, Zyra permitirá buscar prendas similares usando
                  una imagen como referencia.
                </p>
              </div>
            </div>
          </div>

          <p className="frase">
            Tu tienda puede ser parte de una nueva forma de descubrir moda local.
          </p>
        </aside>

        <section className="auth-card">
          {!usuario ? (
            <>
              <div className="auth-header">
                <p className="mini-texto">
                  {modo === "login"
                    ? "Acceso seguro"
                    : modo === "cliente"
                    ? "Registro de cliente"
                    : "Solicitud empresarial"}
                </p>

                <h2>
                  {modo === "login"
                    ? "Iniciar sesión"
                    : modo === "cliente"
                    ? "Crear cuenta"
                    : "Solicitar acceso"}
                </h2>

                <p>
                  {modo === "login"
                    ? "Ingresa con tu correo y contraseña para acceder a Zyra."
                    : modo === "cliente"
                    ? "Crea tu cuenta para buscar productos, guardar tu carrito y realizar pedidos."
                    : "Completa los datos principales de tu empresa para solicitar acceso a la plataforma."}
                </p>
              </div>

              {mensaje && <div className={`mensaje ${tipoMensaje}`}>{mensaje}</div>}


              {modo !== "empresa" && (
                <div className="tabs-auth">
                  <button
                    type="button"
                    className={modo === "login" ? "activo" : ""}
                    onClick={() => {
                      setModo("login");
                      setMensaje("");
                      setTipoMensaje("");
                    }}
                  >
                    Iniciar sesión
                  </button>

                  <button
                    type="button"
                    className={modo === "cliente" ? "activo" : ""}
                    onClick={() => {
                      setModo("cliente");
                      setMensaje("");
                      setTipoMensaje("");
                    }}
                  >
                    Registrarse
                  </button>
                </div>
              )}

              {modo === "login" ? (
                <form className="formulario" onSubmit={iniciarSesion} noValidate>
                  <div className="campo">
                    <label>Correo electrónico</label>
                    <input
                      type="email"
                      name="email"
                      value={login.email}
                      onChange={cambiarLogin}
                      placeholder="correo@empresa.com"
                    />
                  </div>

                  <div className="campo">
                    <label>Contraseña</label>

                    <div className="password-box">
                      <input
                        type={mostrarPassword ? "text" : "password"}
                        name="password"
                        value={login.password}
                        onChange={cambiarLogin}
                        placeholder="Ingresa tu contraseña"
                      />

                      <button
                        type="button"
                        className="btn-ojo"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <button className="btn-principal" type="submit" disabled={cargando}>
                    {cargando ? "Ingresando..." : "Ingresar"}
                  </button>

                  <div className="auth-links">
                    <button
                      type="button"
                      onClick={() => {
                        setModo("empresa");
                        setMensaje("");
                        setTipoMensaje("");
                      }}
                    >
                      ¿Tu empresa quiere formar parte de Zyra?
                    </button>
                  </div>
                </form>
              ) : modo === "cliente" ? (
                <form className="formulario formulario-scroll" onSubmit={registrarCliente} noValidate>
                  <div className="grid-dos">
                    <div className="campo">
                      <label>Nombre *</label>
                      <input
                        name="nombre"
                        value={cliente.nombre}
                        onChange={cambiarCliente}
                        placeholder="Tu nombre"
                      />
                    </div>

                    <div className="campo">
                      <label>Apellido</label>
                      <input
                        name="apellido"
                        value={cliente.apellido}
                        onChange={cambiarCliente}
                        placeholder="Tu apellido"
                      />
                    </div>
                  </div>

                  <div className="campo">
                    <label>Correo electrónico *</label>
                    <input
                      type="email"
                      name="email"
                      value={cliente.email}
                      onChange={cambiarCliente}
                      placeholder="cliente@correo.com"
                    />
                  </div>

                  <div className="campo">
                    <label>Contraseña *</label>
                    <div className="password-box">
                      <input
                        type={mostrarPassword ? "text" : "password"}
                        name="password"
                        value={cliente.password}
                        onChange={cambiarCliente}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        className="btn-ojo"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="campo">
                    <label>Confirmar contraseña *</label>
                    <div className="password-box">
                      <input
                        type={mostrarPassword ? "text" : "password"}
                        name="confirmarPassword"
                        value={cliente.confirmarPassword}
                        onChange={cambiarCliente}
                        placeholder="Repite tu contraseña"
                      />
                      <button
                        type="button"
                        className="btn-ojo"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="campo">
                    <label>Teléfono</label>
                    <input
                      name="telefono"
                      value={cliente.telefono}
                      onChange={cambiarCliente}
                      placeholder="8 números"
                      maxLength="8"
                      inputMode="numeric"
                    />
                  </div>

                  <button className="btn-principal" type="submit" disabled={cargando}>
                    {cargando ? "Creando cuenta..." : "Crear cuenta"}
                  </button>

                  <div className="auth-links">
                    <button
                      type="button"
                      onClick={() => {
                        setModo("login");
                        setMensaje("");
                        setTipoMensaje("");
                      }}
                    >
                      Ya tengo una cuenta
                    </button>
                  </div>
                </form>
              ) : (
                <form className="formulario formulario-scroll" onSubmit={registrarEmpresa} noValidate>
                  <div className="grid-dos">
                    <div className="campo">
                      <label>Nombre del responsable *</label>
                      <input
                        name="nombre"
                        value={empresa.nombre}
                        onChange={cambiarEmpresa}
                        placeholder="Nombre"
                      />
                    </div>

                    <div className="campo">
                      <label>Apellido</label>
                      <input
                        name="apellido"
                        value={empresa.apellido}
                        onChange={cambiarEmpresa}
                        placeholder="Apellido"
                      />
                    </div>
                  </div>

                  <div className="campo">
                    <label>Nombre de la empresa *</label>
                    <input
                      name="nombre_empresa"
                      value={empresa.nombre_empresa}
                      onChange={cambiarEmpresa}
                      placeholder="Ej: Moda Aby"
                    />
                  </div>

                  <div className="campo">
                    <label>Correo electrónico *</label>
                    <input
                      type="email"
                      name="email"
                      value={empresa.email}
                      onChange={cambiarEmpresa}
                      placeholder="empresa@correo.com"
                    />
                  </div>

                  <div className="campo">
                    <label>Contraseña *</label>
                    <div className="password-box">
                      <input
                        type={mostrarPassword ? "text" : "password"}
                        name="password"
                        value={empresa.password}
                        onChange={cambiarEmpresa}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        className="btn-ojo"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        aria-label="Mostrar u ocultar contraseña"
                      >
                        {mostrarPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="grid-dos">
                    <div className="campo">
                      <label>Teléfono</label>
                      <input
                        name="telefono"
                        value={empresa.telefono}
                        onChange={cambiarEmpresa}
                        placeholder="8 números"
                        maxLength="8"
                        inputMode="numeric"
                      />
                    </div>

                    <div className="campo">
                      <label>WhatsApp</label>
                      <input
                        name="whatsapp"
                        value={empresa.whatsapp}
                        onChange={cambiarEmpresa}
                        placeholder="8 números"
                        maxLength="8"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div className="campo">
                    <label>NIT</label>
                    <input
                      name="nit"
                      value={empresa.nit}
                      onChange={cambiarEmpresa}
                      placeholder="Opcional"
                      inputMode="numeric"
                    />
                  </div>

                  <div className="campo">
                    <label>Dirección</label>
                    <input
                      name="direccion"
                      value={empresa.direccion}
                      onChange={cambiarEmpresa}
                      placeholder="Zona, calle o referencia"
                    />
                  </div>

                  <div className="campo">
                    <label>Descripción breve</label>
                    <textarea
                      name="descripcion"
                      value={empresa.descripcion}
                      onChange={cambiarEmpresa}
                      placeholder="Cuéntanos brevemente sobre tu tienda"
                    />
                  </div>

                  <button className="btn-principal" type="submit" disabled={cargando}>
                    {cargando ? "Enviando..." : "Enviar solicitud"}
                  </button>

                  <div className="auth-links">
                    <button
                      type="button"
                      onClick={() => {
                        setModo("login");
                        setMensaje("");
                        setTipoMensaje("");
                      }}
                    >
                      Ya tengo una cuenta
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="bienvenida">
              <div className={`bienvenida-icono ${contenidoRol.estado}`}>
                {usuario.nombre?.charAt(0).toUpperCase()}
              </div>

              <p className="mini-texto">Acceso confirmado</p>

              <h2>{contenidoRol.titulo}</h2>

              <p className="bienvenida-texto">{contenidoRol.texto}</p>

              <div className={`bienvenida-extra ${contenidoRol.estado}`}>
                {contenidoRol.extra}
              </div>

              <div className="terminos-acceso-card">
                <div>
                  <strong>Términos y condiciones de uso</strong>
                  <p>
                    Para ingresar a la plataforma, acepta que Zyra actúa como intermediaria digital.
                    Las tiendas son responsables de sus productos, datos publicados, pagos, entregas
                    y atención directa al cliente.
                  </p>
                  <button type="button" onClick={() => setMostrarTerminos(true)}>
                    Ver términos completos
                  </button>
                </div>

                <label>
                  <input
                    type="checkbox"
                    checked={aceptaTerminos}
                    onChange={(e) => setAceptaTerminos(e.target.checked)}
                  />
                  <span>Acepto los términos y condiciones para continuar.</span>
                </label>
              </div>

              {usuario.rol === "EMPRESA" && usuario.estado_empresa === "APROBADA" && (
                <button className="btn-principal" type="button" onClick={onIngresarEmpresa} disabled={!aceptaTerminos}>
                  Ingresar a mi empresa
                </button>
              )}

              {usuario.rol === "CLIENTE" && (
                <button className="btn-principal" type="button" onClick={onIngresarCliente} disabled={!aceptaTerminos}>
                  Ver plataforma
                </button>
              )}

              {usuario.rol === "ADMIN" && (
                <button className="btn-principal" type="button" onClick={onIngresarAdmin} disabled={!aceptaTerminos}>
                  Entrar a administración
                </button>
              )}

              {usuario.rol === "EMPRESA" && usuario.estado_empresa === "PENDIENTE" && (
                <div className="caja-ayuda">
                  <strong>Tiempo de revisión</strong>
                  <p>
                    Tu solicitud será revisada por el equipo de Zyra. Cuando sea
                    aprobada, podrás acceder al panel empresarial.
                  </p>
                </div>
              )}

              {usuario.rol === "EMPRESA" && usuario.estado_empresa === "DESHABILITADA" && (
                <div className="caja-ayuda alerta">
                  <strong>Soporte técnico</strong>
                  <p>
                    Si crees que se trata de un error, comunícate con el soporte
                    de Zyra para revisar el estado de tu cuenta.
                  </p>
                </div>
              )}

              <button
                className="btn-secundario"
                type="button"
                onClick={() => {
                  localStorage.removeItem("usuario_zyra");
                  setUsuario(null);
                  setMensaje("");
                  setTipoMensaje("");
                  setModo("login");
                }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </section>
      </section>

      {mostrarTerminos && (
        <div className="login-modal-fondo">
          <section className="login-modal-card terminos-modal-card">
            <button className="login-modal-cerrar" type="button" onClick={() => setMostrarTerminos(false)}>×</button>
            <span>Términos y condiciones</span>
            <h2>Uso responsable de Zyra</h2>
            <div className="terminos-texto-scroll">
              <p>
                Zyra es una plataforma digital de conexión entre clientes y tiendas de moda. La plataforma permite visualizar productos, registrar pedidos, cargar comprobantes y facilitar la comunicación entre las partes.
              </p>
              <p>
                Las tiendas registradas son responsables de la veracidad de sus productos, precios, imágenes, tallas, colores, disponibilidad, datos de contacto, QR de pago, dirección y condiciones de entrega o recojo.
              </p>
              <p>
                Los clientes son responsables de revisar los datos del pedido, realizar el pago correspondiente, subir un comprobante válido y coordinar el recojo o entrega con la tienda cuando corresponda.
              </p>
              <p>
                Zyra no se responsabiliza por acuerdos externos, errores de datos publicados por terceros, incumplimientos de entrega, diferencias de producto, pagos realizados fuera del flujo mostrado o conflictos comerciales entre cliente y tienda.
              </p>
              <p>
                El administrador puede revisar empresas, tickets de soporte, pedidos y pagos registrados con fines de control académico, operativo y de seguridad dentro de la plataforma.
              </p>
            </div>
            <button className="btn-principal" type="button" onClick={() => { setAceptaTerminos(true); setMostrarTerminos(false); }}>
              Aceptar términos
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
