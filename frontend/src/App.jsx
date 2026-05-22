import { useEffect, useState } from "react";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import EmpresaPanel from "./pages/EmpresaPanel";
import ClientePanel from "./pages/ClientePanel";
import AdminPanel from "./pages/AdminPanel";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState("login");

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

  const cerrarSesion = () => {
    localStorage.removeItem("usuario_zyra");
    setUsuario(null);
    setVista("login");
  };

  if (vista === "empresa" && usuario?.rol === "EMPRESA") {
    return (
      <EmpresaPanel
        usuario={usuario}
        onVolver={() => setVista("login")}
        onCerrarSesion={cerrarSesion}
      />
    );
  }

  if (vista === "cliente" && usuario?.rol === "CLIENTE") {
    return (
      <ClientePanel
        usuario={usuario}
        onVolver={() => setVista("login")}
        onCerrarSesion={cerrarSesion}
      />
    );
  }

  if (vista === "admin" && usuario?.rol === "ADMIN") {
    return (
      <AdminPanel
        usuario={usuario}
        onVolver={() => setVista("login")}
        onCerrarSesion={cerrarSesion}
      />
    );
  }

  return (
    <LoginPage
      usuario={usuario}
      setUsuario={setUsuario}
      onIngresarEmpresa={() => setVista("empresa")}
      onIngresarCliente={() => setVista("cliente")}
      onIngresarAdmin={() => setVista("admin")}
    />
  );
}

export default App;
