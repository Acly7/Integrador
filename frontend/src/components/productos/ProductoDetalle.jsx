import { obtenerColorHex, obtenerUrlImagen } from "../../services/api";

export default function ProductoDetalle({ producto, onVolver }) {
  if (!producto) return null;

  return (
    <div className="empresa-section">
      <div className="section-header">
        <div>
          <span>Detalle del producto</span>
          <h2>{producto.nombre_producto}</h2>
        </div>

        <button type="button" onClick={onVolver}>
          Volver
        </button>
      </div>

      <div className="producto-detalle">
        <div className="producto-detalle-imagen">
          {producto.imagen_principal ? (
            <img
              src={obtenerUrlImagen(producto.imagen_principal)}
              alt={producto.nombre_producto}
            />
          ) : (
            <span>Sin imagen</span>
          )}
        </div>

        <div className="producto-detalle-info">
          <p className="producto-categoria">{producto.categoria}</p>

          <h3>{producto.nombre_producto}</h3>

          <p>
            {producto.descripcion ||
              "Este producto no tiene descripción registrada."}
          </p>

          <div className="detalle-datos">
            <div>
              <span>Precio</span>
              <strong>{producto.precio} Bs</strong>
            </div>

            <div>
              <span>Marca</span>
              <strong>{producto.marca || "Sin marca"}</strong>
            </div>

            <div>
              <span>Estado</span>
              <strong>{producto.estado_producto}</strong>
            </div>
          </div>

          <div className="detalle-variantes">
            <h4>Colores y tallas</h4>

            {producto.variantes?.length > 0 ? (
              producto.variantes.map((variante) => (
                <span className="variante-chip" key={variante.id_variante}>
                  <i
                    style={{
                      backgroundColor: obtenerColorHex(variante.color)
                    }}
                  ></i>
                  {variante.color} · Talla {variante.talla} · Stock {variante.stock}
                </span>
              ))
            ) : (
              <p>No hay variantes registradas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
