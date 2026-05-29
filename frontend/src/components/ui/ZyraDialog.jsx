import { useCallback, useState } from "react";

const TIPOS = {
  info: {
    clase: "info",
    icono: "i",
    titulo: "Aviso de Zyra"
  },
  ok: {
    clase: "ok",
    icono: "✓",
    titulo: "Acción completada"
  },
  error: {
    clase: "error",
    icono: "!",
    titulo: "No se pudo completar"
  },
  warning: {
    clase: "warning",
    icono: "?",
    titulo: "Confirmar acción"
  },
  danger: {
    clase: "danger",
    icono: "!",
    titulo: "Acción delicada"
  }
};

function normalizarOpciones(opciones, modo) {
  if (typeof opciones === "string") {
    return { mensaje: opciones, modo };
  }

  return { ...(opciones || {}), modo };
}

export function useZyraDialog() {
  const [dialogoZyra, setDialogoZyra] = useState(null);

  const cerrarDialogoZyra = useCallback((respuesta = false) => {
    setDialogoZyra((dialogoActual) => {
      if (dialogoActual?.resolver) {
        setTimeout(() => dialogoActual.resolver(respuesta), 0);
      }
      return null;
    });
  }, []);

  const alertaZyra = useCallback((opciones) => {
    return new Promise((resolve) => {
      setDialogoZyra({
        tipo: "info",
        textoConfirmar: "Entendido",
        ...normalizarOpciones(opciones, "alerta"),
        resolver: resolve
      });
    });
  }, []);

  const confirmarZyra = useCallback((opciones) => {
    return new Promise((resolve) => {
      setDialogoZyra({
        tipo: "warning",
        textoConfirmar: "Sí, continuar",
        textoCancelar: "Cancelar",
        ...normalizarOpciones(opciones, "confirmacion"),
        resolver: resolve
      });
    });
  }, []);

  return {
    dialogoZyra,
    alertaZyra,
    confirmarZyra,
    cerrarDialogoZyra
  };
}

export function ZyraDialogHost({ dialogo, onClose }) {
  if (!dialogo) return null;

  const tipo = TIPOS[dialogo.tipo] || TIPOS.info;
  const titulo = dialogo.titulo || tipo.titulo;
  const mensaje = dialogo.mensaje || dialogo.texto || "";
  const esConfirmacion = dialogo.modo === "confirmacion";

  return (
    <div className="zyra-dialog-backdrop" onClick={() => onClose(false)}>
      <article
        className={`zyra-dialog-card ${tipo.clase}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="zyra-dialog-title"
      >
        <button
          type="button"
          className="zyra-dialog-close"
          onClick={() => onClose(false)}
          aria-label="Cerrar"
        >
          ×
        </button>

        <div className="zyra-dialog-icon">{dialogo.icono || tipo.icono}</div>

        <span className="zyra-dialog-label">Zyra</span>
        <h2 id="zyra-dialog-title">{titulo}</h2>

        {mensaje && <p>{mensaje}</p>}

        {dialogo.detalle && <small>{dialogo.detalle}</small>}

        <div className="zyra-dialog-actions">
          {esConfirmacion && (
            <button
              type="button"
              className="zyra-dialog-btn secundario"
              onClick={() => onClose(false)}
            >
              {dialogo.textoCancelar || "Cancelar"}
            </button>
          )}

          <button
            type="button"
            className="zyra-dialog-btn principal"
            onClick={() => onClose(true)}
          >
            {dialogo.textoConfirmar || "Entendido"}
          </button>
        </div>
      </article>
    </div>
  );
}
