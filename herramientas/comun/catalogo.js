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
const herramientas = [];
