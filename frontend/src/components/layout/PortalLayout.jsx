import { useState } from "react";

function MenuIcon({ tipo = "dot" }) {
  const iconos = {
    menu: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
      </>
    ),
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.8V21h14V9.8" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
    catalogo: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </>
    ),
    imagen: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <circle cx="9" cy="9" r="1.5" />
        <path d="M4 16l4-4 4 4 3-3 5 5" />
      </>
    ),
    carrito: (
      <>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L23 6H6" />
      </>
    ),
    pedidos: (
      <>
        <path d="M7 3h10l2 4v14H5V7z" />
        <path d="M7 7h10" />
        <path d="M8 12h8" />
        <path d="M8 16h6" />
      </>
    ),
    usuario: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.7-4 5-6 8-6s6.3 2 8 6" />
      </>
    ),
    pagos: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
    resumen: (
      <>
        <path d="M4 19V5" />
        <path d="M8 19v-7" />
        <path d="M12 19V8" />
        <path d="M16 19v-4" />
        <path d="M20 19V3" />
      </>
    ),
    producto: (
      <>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.3 7 12 12l8.7-5" />
        <path d="M12 22V12" />
      </>
    )
  };

  return (
    <svg
      className="portal-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {iconos[tipo] || <circle cx="12" cy="12" r="4" />}
    </svg>
  );
}

export default function PortalLayout({
  titulo,
  subtitulo,
  logo = "Zyra",
  logoUrl = null,
  logoInicial = "",
  logoSubtitulo = "",
  menu = [],
  activo = "",
  onMenuClick,
  onVolver,
  onCerrarSesion,
  children
}) {
  const [menuContraido, setMenuContraido] = useState(false);
  const mostrarPerfil = Boolean(logoUrl || logoInicial || logoSubtitulo);
  const inicialVisible = String(logoInicial || logo || "Z").trim().charAt(0).toUpperCase();

  return (
    <main className={`portal-panel ${menuContraido ? "menu-contraido" : ""}`}>
      <aside className="portal-sidebar">
        <button
          type="button"
          className="portal-menu-toggle"
          onClick={() => setMenuContraido(!menuContraido)}
          aria-label={menuContraido ? "Abrir menú" : "Cerrar menú"}
          title={menuContraido ? "Abrir menú" : "Cerrar menú"}
        >
          <MenuIcon tipo="menu" />
        </button>

        {mostrarPerfil ? (
          <div className="portal-logo portal-logo-perfil" title={logo}>
            <div className="portal-logo-avatar">
              {logoUrl ? <img src={logoUrl} alt={logo || "Perfil"} /> : <span>{inicialVisible}</span>}
            </div>
            <div className="portal-logo-textos">
              <span className="portal-logo-nombre">{logo}</span>
              {logoSubtitulo && <small>{logoSubtitulo}</small>}
            </div>
          </div>
        ) : (
          <div className="portal-logo">
            <div className="portal-logo-marca">Z</div>
            <span>{logo}</span>
          </div>
        )}

        <nav>
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activo === item.id ? "activo" : ""}
              onClick={() => onMenuClick?.(item.id)}
              title={item.nombre}
            >
              <MenuIcon tipo={item.icono} />
              <span>{item.nombre}</span>
            </button>
          ))}
        </nav>

        <div className="portal-sidebar-footer">
          {onCerrarSesion && (
            <button
              className="portal-cerrar-sesion"
              type="button"
              onClick={onCerrarSesion}
              title="Cerrar sesión"
            >
              <MenuIcon tipo="usuario" />
              <span>Cerrar sesión</span>
            </button>
          )}

          {onVolver && (
            <button className="portal-volver" type="button" onClick={onVolver} title="Volver">
              <MenuIcon tipo="home" />
              <span>Volver</span>
            </button>
          )}
        </div>
      </aside>

      <section className="portal-main">
        <header className="portal-header">
          <div>
            <p>{subtitulo}</p>
            <h1>{titulo}</h1>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
