export default function ProductoForm({
  tituloBoton,
  producto,
  categorias,
  mostrarCategoriaOtro = false,
  nuevaCategoria,
  setNuevaCategoria,
  imagen,
  setImagen,
  mensaje,
  tipoMensaje,
  onChange,
  onSubmit,
  onCancel,
  children
}) {
  return (
    <form className="producto-form" onSubmit={onSubmit}>
      {mensaje && (
        <div className={`mensaje-producto ${tipoMensaje}`}>
          {mensaje}
        </div>
      )}

      <div className="form-grid">
        <div className="campo-panel">
          <label>Nombre del producto *</label>
          <input
            name="nombre_producto"
            value={producto.nombre_producto}
            onChange={onChange}
            placeholder="Ej: Polera negra oversize"
          />
        </div>

        <div className="campo-panel">
          <label>Categoría *</label>
          <select
            name="id_categoria"
            value={producto.id_categoria}
            onChange={onChange}
          >
            <option value="">Seleccionar categoría</option>

            {categorias.map((categoria) => (
              <option key={categoria.id_categoria} value={categoria.id_categoria}>
                {categoria.nombre_categoria}
              </option>
            ))}

            {mostrarCategoriaOtro && (
              <option value="otro">Otro / crear nueva categoría</option>
            )}
          </select>
        </div>

        {mostrarCategoriaOtro && producto.id_categoria === "otro" && (
          <div className="campo-panel">
            <label>Nueva categoría *</label>
            <input
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Ej: Blusas, Buzos, Ropa deportiva"
            />
          </div>
        )}

        <div className="campo-panel">
          <label>Marca</label>
          <input
            name="marca"
            value={producto.marca}
            onChange={onChange}
            placeholder="Ej: Moda Aby"
          />
        </div>

        <div className="campo-panel">
          <label>Género</label>
          <select
            name="genero"
            value={producto.genero}
            onChange={onChange}
          >
            <option value="Unisex">Unisex</option>
            <option value="Mujer">Mujer</option>
            <option value="Hombre">Hombre</option>
            <option value="Niña">Niña</option>
            <option value="Niño">Niño</option>
          </select>
        </div>

        <div className="campo-panel">
          <label>Precio Bs *</label>
          <input
            name="precio"
            value={producto.precio}
            onChange={onChange}
            placeholder="Ej: 120"
            inputMode="decimal"
          />
        </div>

        {"stock" in producto && (
          <div className="campo-panel">
            <label>Stock *</label>
            <input
              name="stock"
              value={producto.stock}
              onChange={onChange}
              placeholder="Ej: 10"
              inputMode="numeric"
            />
          </div>
        )}

        {"color" in producto && (
          <div className="campo-panel">
            <label>Color *</label>
            <input
              name="color"
              value={producto.color}
              onChange={onChange}
              placeholder="Ej: Negro"
            />
          </div>
        )}

        {"talla" in producto && (
          <div className="campo-panel">
            <label>Talla *</label>
            <input
              name="talla"
              value={producto.talla}
              onChange={onChange}
              placeholder="Ej: M"
            />
          </div>
        )}
      </div>

      <div className="campo-panel">
        <label>Descripción</label>
        <textarea
          name="descripcion"
          value={producto.descripcion}
          onChange={onChange}
          placeholder="Describe la prenda, material, estilo o detalles importantes"
        />
      </div>

      <div className="campo-panel">
        <label>{imagen ? "Imagen seleccionada" : "Imagen principal"}</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={(e) => setImagen(e.target.files[0] || null)}
        />
      </div>

{children}

      <div className="acciones-form">
        <button type="submit" className="btn-panel-principal">
          {tituloBoton}
        </button>

        <button
          type="button"
          className="btn-panel-secundario"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
