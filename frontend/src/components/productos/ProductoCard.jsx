import { obtenerColorHex, obtenerUrlImagen } from "../../services/api";

export default function ProductoCard({ producto }) {
  return (
    <article className="producto-card">
      <div className="producto-imagen">
        {producto.imagen_principal ? (
          <img
            src={obtenerUrlImagen(producto.imagen_principal)}
            alt={producto.nombre_producto}
          />
        ) : (
          <span>Sin imagen</span>
        )}
      </div>

      <div className="producto-info">
        <p className="producto-categoria">{producto.categoria}</p>

        <h3>{producto.nombre_producto}</h3>

        <p className="producto-descripcion">
          {producto.descripcion || "Sin descripción"}
        </p>

        <div className="producto-meta">
          <strong>{producto.precio} Bs</strong>
          <span>{producto.estado_producto}</span>
        </div>

        <div className="producto-variantes">
          {producto.variantes?.slice(0, 4).map((variante) => (
            <span className="variante-chip" key={variante.id_variante}>
              <i style={{ backgroundColor: obtenerColorHex(variante.color) }}></i>
              {variante.color} · {variante.talla}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
