# ZYRA
### Moda, tecnología e inteligencia artificial en un solo lugar

**Plataforma web multiempresa para la búsqueda visual y gestión comercial de prendas de moda en Bolivia.**

Zyra nace de una idea sencilla: encontrar una prenda que nos gusta no debería significar pasar horas revisando publicaciones y escribiendo a distintas tiendas para consultar precios, tallas o disponibilidad.

El proyecto reúne a emprendimientos y tiendas de moda en una misma plataforma. Las empresas pueden organizar sus catálogos y los clientes pueden explorar prendas de diferentes negocios, incluso usando **una imagen como referencia para encontrar productos visualmente similares**.

> **La idea detrás de Zyra:** conectar la moda local con herramientas digitales más prácticas, organizadas e inteligentes.

---

## ¿Qué se puede hacer en Zyra?

### Para clientes
- Crear una cuenta e iniciar sesión.
- Explorar prendas de distintas tiendas registradas.
- Buscar productos y filtrarlos por características como categoría, precio, talla y color.
- Consultar fotografías, detalles y disponibilidad de los productos.
- **Buscar prendas por imagen** para encontrar alternativas visualmente similares.
- Agregar productos al carrito, generar pedidos y adjuntar comprobantes de pago por QR.
- Consultar notificaciones y comunicarse mediante el módulo de soporte.

### Para empresas
- Registrar y administrar un perfil comercial.
- Publicar prendas con imágenes, descripciones y precios.
- Gestionar tallas, colores, variantes y stock.
- Revisar pedidos y comprobantes asociados a la tienda.
- Consultar información comercial sobre la actividad de sus productos.

### Para administración
- Gestionar usuarios, roles y permisos.
- Revisar y supervisar las empresas registradas.
- Administrar categorías y supervisar el catálogo.
- Consultar estadísticas, reportes y actividad de la plataforma.
- Gestionar soporte, notificaciones y respaldos de información.

> Las funcionalidades corresponden al alcance del proyecto y se desarrollan y validan progresivamente durante la etapa académica.

---

## Búsqueda visual con inteligencia artificial

Esta es una de las características principales de Zyra. En lugar de depender solamente de palabras, el usuario puede cargar una fotografía de la prenda que desea encontrar.

**¿Cómo funciona?**

1. El usuario sube una imagen de referencia.
2. El sistema la procesa mediante un modelo de inteligencia artificial **CLIP**.
3. La imagen se convierte en una representación numérica (*embedding*).
4. **ChromaDB** compara esa representación con las imágenes de los productos previamente indexados.
5. Zyra muestra prendas similares, ordenadas según su similitud visual.

Se utiliza un modelo preentrenado a través de **Sentence Transformers**; no se entrena una inteligencia artificial desde cero. La búsqueda depende de que las imágenes de los productos estén correctamente indexadas.

---

## Tecnologías utilizadas

| Área | Tecnologías | ¿Para qué se utilizan? |
| --- | --- | --- |
| Frontend | React, Vite, JavaScript, HTML y CSS | Interfaces y paneles de usuario |
| Backend | Python, FastAPI, Uvicorn | API REST y lógica del sistema |
| Base de datos | PostgreSQL, SQLAlchemy | Información comercial y relaciones entre datos |
| Validación | Pydantic | Validación de datos de entrada y salida |
| Inteligencia artificial | CLIP, Sentence Transformers | Procesamiento y comparación visual de imágenes |
| Búsqueda vectorial | ChromaDB | Almacenamiento y consulta de embeddings |
| Procesamiento de imágenes | Pillow, NumPy | Preparación de imágenes y manejo de vectores |
| Control de versiones | Git y GitHub | Historial de cambios y organización del proyecto |

---

## Organización del repositorio

```text
Integrador/
├── backend/                  # API y lógica del sistema
├── frontend/                 # Interfaz web
├── database/                 # Archivos relacionados con la base de datos
├── dataset/
│   └── fashion_ropa_zyra/   # Recursos de imágenes para el proyecto
├── .gitignore                # Archivos excluidos del control de versiones
└── README.md                 # Información general del proyecto
```

La plataforma sigue una arquitectura **cliente-servidor desacoplada**: React y Vite se encargan de la interfaz; FastAPI procesa las solicitudes; PostgreSQL conserva los datos comerciales; y el módulo de IA utiliza CLIP y ChromaDB para las búsquedas visuales.

---

## Ejecución del proyecto

Zyra está organizada en frontend, backend y servicios de almacenamiento. Para ejecutarla localmente se necesita preparar el entorno de Python, las dependencias del frontend y una base de datos PostgreSQL, además de la configuración correspondiente al módulo de búsqueda visual.

Los comandos exactos de instalación y arranque deben consultarse en la configuración de cada carpeta del proyecto. **No deben subirse credenciales, contraseñas, archivos `.env` con datos reales ni respaldos privados de la base de datos al repositorio público.**

---

## Desarrollo y organización

El proyecto se desarrolla de manera incremental, siguiendo una adaptación de **Scrum**: análisis de requerimientos, planificación, implementación por módulos, pruebas y documentación.

Este repositorio reúne el código fuente y sus actualizaciones mediante **Git y GitHub**, lo que permite conservar el historial de desarrollo y organizar los cambios.

**Estado:** proyecto académico en desarrollo y validación.

---

## Información académica

- **Proyecto:** Zyra: Plataforma Web Multiempresa con Inteligencia Artificial para la Búsqueda Visual, Gestión Comercial y Digitalización de Prendas de Moda en Bolivia.
- **Estudiante:** Abigail Celeste Loza Alberto.
- **Carrera:** Ingeniería de Sistemas.
- **Universidad:** Universidad Privada Franz Tamayo (UNIFRANZ).
- **Materia:** Proyecto Integrador Intermedio II.
- **Lugar y gestión:** La Paz, Bolivia — 2026.

---

**Hecho como parte de un proyecto académico que busca acercar nuevas herramientas digitales a la moda y a los emprendimientos bolivianos.** 💜
