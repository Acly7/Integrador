import { useEffect, useState } from "react";
import "./App.css";
import "./theme-dark.css";
import LoginPage from "./pages/LoginPage";
import EmpresaPanel from "./pages/EmpresaPanel";
import ClientePanel from "./pages/ClientePanel";
import AdminPanel from "./pages/AdminPanel";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState("login");
  const [temaOscuro, setTemaOscuro] = useState(() => {
    return localStorage.getItem("tema_zyra") === "dark";
  });

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem("usuario_zyra");

    if (usuarioGuardado) {
      try {
        setUsuario(JSON.parse(usuarioGuardado));
      } catch (error) {
        localStorage.removeItem("usuario_zyra");
      }
    }
  }, []);

  useEffect(() => {
    const tema = temaOscuro ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", tema);
    document.body.setAttribute("data-theme", tema);
    localStorage.setItem("tema_zyra", tema);
  }, [temaOscuro]);

  useEffect(() => {
    document.body.setAttribute("data-vista-zyra", vista);
    document.body.setAttribute("data-rol-zyra", usuario?.rol || "publico");
  }, [vista, usuario?.rol]);

  const cerrarSesion = () => {
    localStorage.removeItem("usuario_zyra");
    setUsuario(null);
    setVista("login");
  };

  const actualizarUsuarioSesion = (usuarioActualizado) => {
    localStorage.setItem("usuario_zyra", JSON.stringify(usuarioActualizado));
    setUsuario(usuarioActualizado);
  };

  const claseBotonTema = vista === "login"
    ? "zyra-theme-toggle zyra-theme-toggle-login"
    : "zyra-theme-toggle zyra-theme-toggle-panel";

  const botonTema = (
    <button
      type="button"
      className={claseBotonTema}
      onClick={() => setTemaOscuro((valorActual) => !valorActual)}
      aria-label={temaOscuro ? "Activar modo claro" : "Activar modo oscuro"}
      title={temaOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      <span className="zyra-theme-toggle-icon">{temaOscuro ? "☀️" : "🌙"}</span>
      <span className="zyra-theme-toggle-text">{temaOscuro ? "Modo claro" : "Modo oscuro"}</span>
    </button>
  );

  if (vista === "empresa" && usuario?.rol === "EMPRESA") {
    return (
      <>
        {botonTema}
        <EmpresaPanel
          usuario={usuario}
          onVolver={() => setVista("login")}
          onCerrarSesion={cerrarSesion}
          onUsuarioActualizado={actualizarUsuarioSesion}
        />
      </>
    );
  }

  if (vista === "cliente" && usuario?.rol === "CLIENTE") {
    return (
      <>
        {botonTema}
        <ClientePanel
          usuario={usuario}
          onVolver={() => setVista("login")}
          onCerrarSesion={cerrarSesion}
        />
      </>
    );
  }

  if (vista === "admin" && usuario?.rol === "ADMIN") {
    return (
      <>
        {botonTema}
        <AdminPanel
          usuario={usuario}
          onVolver={() => setVista("login")}
          onCerrarSesion={cerrarSesion}
        />
      </>
    );
  }

  return (
    <>
      {botonTema}
      <LoginPage
        usuario={usuario}
        setUsuario={setUsuario}
        onIngresarEmpresa={() => setVista("empresa")}
        onIngresarCliente={() => setVista("cliente")}
        onIngresarAdmin={() => setVista("admin")}
      />
    </>
  );
}

export default App;
