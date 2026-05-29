const COLORES_PREDETERMINADOS = [
  "Negro",
  "Blanco",
  "Rojo",
  "Azul",
  "Verde",
  "Amarillo",
  "Rosado",
  "Morado",
  "Café",
  "Beige",
  "Gris",
  "Celeste",
  "Vino",
  "Marrón",
  "Naranja"
];

const TALLAS_ADULTO = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const TALLAS_NINOS = ["2", "4", "6", "8", "10", "12", "14", "16"];
const VALOR_OTRO = "__OTRO__";

const obtenerTallasPorGenero = (genero = "") => {
  const texto = String(genero || "").toLowerCase();
  if (texto.includes("niñ")) return TALLAS_NINOS;
  return TALLAS_ADULTO;
};

const obtenerOpcionNormalizada = (valor, opciones) => {
  const texto = String(valor || "").trim();
  if (!texto) return "";
  const encontrada = opciones.find(
    (opcion) => opcion.toLowerCase() === texto.toLowerCase()
  );
  return encontrada || VALOR_OTRO;
};

const esPersonalizado = (valor, opciones) => {
  const texto = String(valor || "").trim();
  if (!texto) return false;
  if (texto === VALOR_OTRO) return true;
  return !opciones.some((opcion) => opcion.toLowerCase() === texto.toLowerCase());
};

const enviarCambio = (onChange, name, value) => {
  onChange({ target: { name, value } });
};

function CampoConOpciones({ label, name, value, opciones, onChange, placeholder }) {
  const valorSelect = obtenerOpcionNormalizada(value, opciones);
  const mostrarOtro = esPersonalizado(value, opciones) || value === VALOR_OTRO;

  return (
    <div className="campo-panel campo-opciones">
      <label>{label}</label>
      <select
        name={name}
        value={valorSelect}
        onChange={(e) => {
          const nuevoValor = e.target.value;
          enviarCambio(onChange, name, nuevoValor === VALOR_OTRO ? VALOR_OTRO : nuevoValor);
        }}
      >
        <option value="">Seleccionar</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
        <option value={VALOR_OTRO}>Otro / escribir manualmente</option>
      </select>

      {mostrarOtro && (
        <input
          className="campo-otro-input"
          value={value === VALOR_OTRO ? "" : value}
          onChange={(e) => enviarCambio(onChange, name, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

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
  const tallas = obtenerTallasPorGenero(producto.genero);

  return (
    <form className="producto-form" onSubmit={onSubmit} noValidate>
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
            maxLength={150}
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
              maxLength={100}
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
            maxLength={100}
          />
        </div>

        <div className="campo-panel">
          <label>Género *</label>
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
          <CampoConOpciones
            label="Color *"
            name="color"
            value={producto.color}
            opciones={COLORES_PREDETERMINADOS}
            onChange={onChange}
            placeholder="Escribe el color personalizado"
          />
        )}

        {"talla" in producto && (
          <CampoConOpciones
            label="Talla *"
            name="talla"
            value={producto.talla}
            opciones={tallas}
            onChange={onChange}
            placeholder="Escribe la talla personalizada"
          />
        )}
      </div>

      <div className="campo-panel">
        <label>Descripción</label>
        <textarea
          name="descripcion"
          value={producto.descripcion}
          onChange={onChange}
          placeholder="Describe la prenda, material, estilo o detalles importantes"
          maxLength={500}
        />
      </div>

      <div className="campo-panel">
        <label>{imagen ? "Imagen seleccionada" : "Imagen principal"}</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={(e) => setImagen(e.target.files[0] || null)}
        />
        {imagen && (
          <small className="producto-imagen-nombre">{imagen.name}</small>
        )}
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
