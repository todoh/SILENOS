"use strict";

const categorias = [
  ["imagen","Imagen","Convierte, comprime, recorta y ajusta imágenes."],
  ["graficos","Gráficos y SVG","Crea gráficos vectoriales, patrones e ilustraciones."],
  ["audio","Audio y música","Graba, recorta y analiza audio. Explora ritmos y sonidos."],
  ["video","Vídeo y animación","Trabaja con vídeos, fotogramas, GIF y subtítulos."],
  ["texto","Texto y escritura","Edita, compara y transforma textos."],
  ["formatos","Formatos y datos","Convierte y reorganiza datos entre formatos."],
  ["desarrollo","Desarrollo web y código","Formatea, revisa y trabaja con código y datos web."],
  ["seguridad","Criptografía y seguridad","Calcula hashes y trabaja con cifrado y codificaciones."],
  ["css","CSS y diseño web","Prepara estilos, componentes y diseños para la web."],
  ["color","Color y paletas","Explora colores, crea paletas y comprueba contrastes."],
  ["matematicas","Matemáticas y estadística","Resuelve cálculos y explora conjuntos de datos."],
  ["finanzas","Finanzas y comercio","Haz cálculos de precios, descuentos y contabilidad."],
  ["productividad","Productividad y tiempo","Organiza tareas, mide tiempos y planifica tu semana."],
  ["archivos","Archivos y compresión","Comprime, organiza y compara archivos."],
  ["geometria","Geometría, mapas y física","Calcula medidas y explora mapas y simulaciones."],
  ["juegos","Juegos, azar y educación","Practica, aprende y organiza sorteos."],
].map(([id, nombre, descripcion]) => ({ id, nombre, descripcion }));

// Cada herramienta usa { categoria, id, nombre, descripcion }.
// La URL se forma como /herramientas/<categoria>/<id>/.
const herramientas = [
  { categoria: "imagen", id: "conversor", nombre: "Conversor de imágenes", descripcion: "Convierte imágenes entre formatos y ajusta su tamaño." },
  { categoria: "color", id: "selector", nombre: "Selector de color", descripcion: "Consulta valores HEX, RGB, HSL, HSV, CMYK y OKLCH." },
  { categoria: "color", id: "paletas-armonicas", nombre: "Paletas armónicas", descripcion: "Genera combinaciones a partir de un color." },
  { categoria: "color", id: "contraste", nombre: "Comprobador de contraste", descripcion: "Comprueba la legibilidad del texto y el fondo." },
  { categoria: "color", id: "escalas-tonales", nombre: "Escalas tonales", descripcion: "Genera tonos claros y oscuros a partir de un color." },
  { categoria: "color", id: "extractor-paleta", nombre: "Extractor de paleta de imagen", descripcion: "Obtén los colores predominantes de una imagen." },
  { categoria: "color", id: "cuentagotas", nombre: "Cuentagotas de pantalla", descripcion: "Obtén colores de una imagen o de la pantalla." },
  { categoria: "color", id: "paletas-aleatorias", nombre: "Paletas aleatorias", descripcion: "Genera colores y bloquea tus favoritos." },
  { categoria: "color", id: "exportar-paleta", nombre: "Exportador de paletas", descripcion: "Exporta colores a CSS, SCSS, JSON y SVG." },
  { categoria: "color", id: "luminancia", nombre: "Calculadora de luminancia", descripcion: "Calcula la luminancia relativa de un color." },
  { categoria: "color", id: "ordenar-colores", nombre: "Ordenador de colores", descripcion: "Ordena colores HEX por matiz o luminosidad." },
  { categoria: "color", id: "pastel-neon", nombre: "Colores pastel y neón", descripcion: "Genera una paleta de colores pastel o neón." },
  { categoria: "color", id: "legibilidad", nombre: "Probador de legibilidad", descripcion: "Prueba textos sobre un fondo y consulta su contraste." },
  { categoria: "color", id: "mezclador", nombre: "Mezclador de colores", descripcion: "Mezcla dos colores ajustando sus proporciones." },
  { categoria: "color", id: "ajustar-paleta", nombre: "Ajustador de paletas", descripcion: "Modifica el tono, la saturación y la luminosidad." },
  { categoria: "color", id: "armonia-monocromatica", nombre: "Armonías monocromáticas", descripcion: "Crea variaciones a partir de un color base." },
  { categoria: "color", id: "paletas-retro", nombre: "Paletas retro", descripcion: "Explora paletas inspiradas en consolas clásicas." },
  { categoria: "color", id: "rueda-cromatica", nombre: "Rueda cromática", descripcion: "Explora visualmente los matices de color." },
  { categoria: "color", id: "simulador-daltonismo", nombre: "Simulador de daltonismo", descripcion: "Compara una paleta con simulaciones aproximadas." },
  { categoria: "color", id: "mapas-color", nombre: "Mapas de color", descripcion: "Crea una escala continua entre dos colores." },
  { categoria: "color", id: "colores-marca", nombre: "Colores de marca", descripcion: "Explora un color de marca sobre superficies claras y oscuras." },
  { categoria: "color", id: "nombre-color", nombre: "Buscador de nombres de color", descripcion: "Busca el nombre CSS más cercano a un color." },
  { categoria: "color", id: "diferencia-color", nombre: "Diferencia perceptual de color", descripcion: "Compara dos colores mediante Delta E CIE76." },
  { categoria: "color", id: "degradado-malla", nombre: "Degradado de malla", descripcion: "Crea y descarga una imagen con cuatro colores." },
  { categoria: "color", id: "degradado-perceptual", nombre: "Degradado perceptual", descripcion: "Genera un degradado CSS interpolado en OKLab." }
];
