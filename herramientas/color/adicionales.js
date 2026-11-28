"use strict";

const tipo = document.documentElement.dataset.tool;
const zonaColor = document.getElementById("herramienta");
const controles = document.createElement("div");
controles.className = "color-fields";
const salida = document.createElement("div");
salida.className = "color-output";
salida.setAttribute("aria-live", "polite");
zonaColor.append(controles, salida);

function control(nombre, tipoControl, valor) {
  const etiqueta = document.createElement("label");
  etiqueta.textContent = nombre;
  const entrada = document.createElement(tipoControl === "textarea" ? "textarea" : "input");
  if (tipoControl !== "textarea") entrada.type = tipoControl;
  if (valor !== undefined) entrada.value = valor;
  etiqueta.append(entrada);
  controles.append(etiqueta);
  return entrada;
}
function boton(texto, accion) {
  const elemento = document.createElement("button");
  elemento.type = "button";
  elemento.textContent = texto;
  elemento.addEventListener("click", accion);
  controles.append(elemento);
  return elemento;
}
function texto(valor) {
  const p = document.createElement("p");
  p.textContent = valor;
  salida.append(p);
}
function listaColores(valor) {
  return valor.match(/#[0-9a-fA-F]{6}\b/g) || [];
}
function rgb(color) {
  return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
}
function hex(rgbColor) {
  return "#" + rgbColor.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
}
function luminancia(color) {
  const componentes = rgb(color).map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return .2126 * componentes[0] + .7152 * componentes[1] + .0722 * componentes[2];
}
function matiz(color) {
  const [r,g,b] = rgb(color).map(v => v / 255);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  if (!d) return 0;
  if (max === r) return ((g-b)/d + 6) % 6;
  return max === g ? (b-r)/d + 2 : (r-g)/d + 4;
}
function muestras(colores) {
  const caja = document.createElement("div");
  caja.className = "swatches";
  for (const color of colores) {
    const item = document.createElement("div");
    item.className = "swatch";
    const vista = document.createElement("div");
    vista.className = "swatch-color";
    vista.style.background = color;
    const codigo = document.createElement("code");
    codigo.textContent = color.toUpperCase();
    item.append(vista, codigo);
    caja.append(item);
  }
  salida.append(caja);
}
function descargar(nombre, contenido, tipoArchivo) {
  const url = URL.createObjectURL(new Blob([contenido], {type: tipoArchivo}));
  const link = document.createElement("a");
  link.href = url;
  link.download = nombre;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if (tipo === "luminancia" || tipo === "legibilidad") {
  const frente = control(tipo === "legibilidad" ? "Color del texto" : "Color", "color", "#3366cc");
  const fondo = tipo === "legibilidad" ? control("Color del fondo", "color", "#ffffff") : null;
  function actualizar() {
    salida.replaceChildren();
    const lum = luminancia(frente.value);
    if (!fondo) {
      muestras([frente.value]);
      texto("Luminancia relativa: " + lum.toFixed(4) + " (de 0 a 1).");
      return;
    }
    const otro = luminancia(fondo.value);
    const razon = (Math.max(lum, otro) + .05) / (Math.min(lum, otro) + .05);
    const vista = document.createElement("div");
    vista.className = "contrast-sample";
    vista.style.color = frente.value;
    vista.style.backgroundColor = fondo.value;
    const titulo = document.createElement("h2");
    titulo.textContent = "Así se lee un título";
    const parrafo = document.createElement("p");
    parrafo.style.color = "inherit";
    parrafo.textContent = "Este es un ejemplo de texto normal para comprobar la legibilidad de la combinación elegida.";
    vista.append(titulo, parrafo);
    salida.append(vista);
    texto("Contraste: " + razon.toFixed(2) + ":1. Texto normal AA: " + (razon >= 4.5 ? "aprobado" : "no aprobado") + ".");
  }
  frente.addEventListener("input", actualizar);
  fondo?.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "ordenar-colores" || tipo === "exportar-paleta") {
  const entrada = control("Colores HEX de seis dígitos, separados por espacios o líneas", "textarea", "#3366cc\n#ee5544\n#42a876\n#f6c453");
  entrada.rows = 5;
  if (tipo === "ordenar-colores") {
    function ordenar(criterio) {
      const colores = listaColores(entrada.value);
      salida.replaceChildren();
      if (!colores.length) return texto("Introduce al menos un color válido, por ejemplo #3366cc.");
      colores.sort((a,b) => criterio(a) - criterio(b));
      muestras(colores);
      texto(colores.join("  "));
    }
    boton("Ordenar por matiz", () => ordenar(matiz));
    boton("Ordenar por luminancia", () => ordenar(luminancia));
  } else {
    function exportar(formato) {
      const colores = listaColores(entrada.value);
      salida.replaceChildren();
      if (!colores.length) return texto("Introduce al menos un color válido, por ejemplo #3366cc.");
      muestras(colores);
      let contenido, mime = "text/plain";
      if (formato === "json") {
        contenido = JSON.stringify(colores, null, 2);
        mime = "application/json";
      } else if (formato === "svg") {
        contenido = '<svg xmlns="http://www.w3.org/2000/svg" width="' + colores.length * 100 + '" height="100">' +
          colores.map((color, i) => '<rect x="' + i * 100 + '" width="100" height="100" fill="' + color + '"/>').join("") + "</svg>";
        mime = "image/svg+xml";
      } else if (formato === "css") {
        contenido = ":root {\n" + colores.map((color, i) => "  --color-" + (i + 1) + ": " + color + ";").join("\n") + "\n}\n";
      } else {
        contenido = colores.map((color, i) => "$color-" + (i + 1) + ": " + color + ";").join("\n") + "\n";
      }
      descargar("paleta." + formato, contenido, mime);
    }
    for (const formato of ["css", "scss", "json", "svg"]) boton("Descargar " + formato.toUpperCase(), () => exportar(formato));
  }
}

if (tipo === "cuentagotas") {
  const archivo = control("Sube una imagen", "file");
  archivo.accept = "image/*";
  const instrucciones = document.createElement("p");
  instrucciones.textContent = "Sube una imagen y pulsa sobre ella para obtener el color de un píxel.";
  const canvas = document.createElement("canvas");
  canvas.className = "eyedropper-image";
  canvas.hidden = true;
  canvas.setAttribute("aria-label", "Imagen cargada. Pulsa sobre ella para seleccionar un color.");
  const resultadoColor = document.createElement("div");
  resultadoColor.setAttribute("aria-live", "polite");
  salida.append(instrucciones, canvas, resultadoColor);
  let cargaActual = 0;

  function mostrarColor(color, detalle = "") {
    resultadoColor.replaceChildren();
    const muestra = document.createElement("div");
    muestra.className = "eyedropper-result";
    const vista = document.createElement("span");
    vista.className = "eyedropper-swatch";
    vista.style.backgroundColor = color;
    const valor = document.createElement("strong");
    valor.textContent = color.toUpperCase() + detalle;
    muestra.append(vista, valor);
    resultadoColor.append(muestra);
  }

  archivo.addEventListener("change", async () => {
    const carga = ++cargaActual;
    canvas.hidden = true;
    resultadoColor.replaceChildren();
    if (!archivo.files.length) return;
    const url = URL.createObjectURL(archivo.files[0]);
    try {
      const imagen = new Image();
      imagen.src = url;
      await imagen.decode();
      if (carga !== cargaActual) return;
      canvas.width = imagen.naturalWidth;
      canvas.height = imagen.naturalHeight;
      canvas.getContext("2d", { willReadFrequently: true }).drawImage(imagen, 0, 0);
      canvas.hidden = false;
      instrucciones.textContent = "Pulsa sobre la imagen para seleccionar un color.";
    } catch {
      if (carga === cargaActual) resultadoColor.textContent = "No se pudo abrir la imagen. Prueba con otro archivo.";
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  canvas.addEventListener("click", evento => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.min(canvas.width - 1, Math.max(0, Math.floor((evento.clientX - rect.left) * canvas.width / rect.width)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.floor((evento.clientY - rect.top) * canvas.height / rect.height)));
    const pixel = canvas.getContext("2d").getImageData(x, y, 1, 1).data;
    mostrarColor(hex([pixel[0], pixel[1], pixel[2]]), pixel[3] < 255 ? " · Opacidad: " + Math.round(pixel[3] / 255 * 100) + "%" : "");
  });

  boton("Seleccionar color de pantalla", async () => {
    resultadoColor.replaceChildren();
    if (!("EyeDropper" in window)) {
      resultadoColor.textContent = "Tu navegador no permite usar el cuentagotas de pantalla. Puedes seleccionar un color de una imagen cargada.";
      return;
    }
    try {
      const resultado = await new EyeDropper().open();
      mostrarColor(resultado.sRGBHex);
    } catch (error) {
      if (error.name !== "AbortError") resultadoColor.textContent = "No se pudo seleccionar el color.";
    }
  });
}

if (tipo === "paletas-aleatorias" || tipo === "pastel-neon") {
  const colores = Array.from({length: 5}, () => ({color: "#000000", bloqueado: false}));
  let modo;
  if (tipo === "pastel-neon") {
    const etiqueta = document.createElement("label");
    etiqueta.textContent = "Estilo";
    modo = document.createElement("select");
    for (const nombre of ["Pastel", "Neón"]) {
      const opcion = document.createElement("option");
      opcion.textContent = nombre;
      modo.append(opcion);
    }
    etiqueta.append(modo);
    controles.append(etiqueta);
  }
  function generar() {
    salida.replaceChildren();
    for (const item of colores) {
      if (item.bloqueado) continue;
      if (modo) {
        const h = Math.floor(Math.random() * 360);
        const s = modo.value === "Pastel" ? 65 : 100;
        const l = modo.value === "Pastel" ? 80 : 50;
        item.color = "hsl(" + h + " " + s + "% " + l + "%)";
      } else item.color = hex(Array.from({length:3}, () => Math.random() * 255));
    }
    const caja = document.createElement("div");
    caja.className = "swatches";
    colores.forEach((item, i) => {
      const tarjeta = document.createElement("div");
      tarjeta.className = "swatch";
      const vista = document.createElement("div");
      vista.className = "swatch-color";
      vista.style.background = item.color;
      const etiqueta = document.createElement("label");
      etiqueta.style.display = "block";
      etiqueta.style.padding = ".5rem";
      const bloqueo = document.createElement("input");
      bloqueo.type = "checkbox";
      bloqueo.checked = item.bloqueado;
      bloqueo.addEventListener("change", () => item.bloqueado = bloqueo.checked);
      etiqueta.append(bloqueo, document.createTextNode(" Fijar color " + (i + 1)));
      const codigo = document.createElement("code");
      codigo.textContent = item.color;
      tarjeta.append(vista, etiqueta, codigo);
      caja.append(tarjeta);
    });
    salida.append(caja);
  }
  boton("Generar paleta", generar);
  generar();
}

if (tipo === "extractor-paleta") {
  const archivo = control("Selecciona una imagen", "file");
  archivo.accept = "image/*";
  archivo.addEventListener("change", async () => {
    salida.replaceChildren();
    if (!archivo.files.length) return;
    const url = URL.createObjectURL(archivo.files[0]);
    try {
      const imagen = new Image();
      imagen.src = url;
      await imagen.decode();
      const canvas = document.createElement("canvas");
      const escala = Math.min(1, 120 / Math.max(imagen.naturalWidth, imagen.naturalHeight));
      canvas.width = Math.max(1, Math.round(imagen.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagen.naturalHeight * escala));
      const contexto = canvas.getContext("2d", {willReadFrequently: true});
      contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);
      const pixeles = contexto.getImageData(0, 0, canvas.width, canvas.height).data;
      const grupos = new Map();
      for (let i = 0; i < pixeles.length; i += 4) {
        if (pixeles[i + 3] < 128) continue;
        const clave = [pixeles[i], pixeles[i+1], pixeles[i+2]].map(v => Math.min(255, Math.floor(v / 32) * 32 + 16)).join(",");
        grupos.set(clave, (grupos.get(clave) || 0) + 1);
      }
      const colores = [...grupos.entries()].sort((a,b) => b[1]-a[1]).slice(0, 8).map(([c]) => hex(c.split(",").map(Number)));
      if (!colores.length) return texto("La imagen no contiene píxeles visibles.");
      texto("Colores predominantes aproximados:");
      muestras(colores);
    } catch {
      texto("No se pudo abrir esta imagen.");
    } finally {
      URL.revokeObjectURL(url);
    }
  });
}

if (tipo === "mezclador") {
  const uno = control("Primer color", "color", "#3366cc");
  const dos = control("Segundo color", "color", "#ee5544");
  const cantidad = control("Porcentaje del segundo color", "range", "50");
  cantidad.min = 0;
  cantidad.max = 100;
  function actualizar() {
    salida.replaceChildren();
    const porcentaje = Number(cantidad.value);
    const a = rgb(uno.value), b = rgb(dos.value);
    const mezcla = hex(a.map((v, i) => v + (b[i] - v) * porcentaje / 100));
    muestras([uno.value, mezcla, dos.value]);
    texto("Mezcla RGB: " + porcentaje + "% del segundo color. Resultado: " + mezcla.toUpperCase());
  }
  for (const campo of [uno, dos, cantidad]) campo.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "ajustar-paleta") {
  const entrada = control("Colores HEX separados por espacios o líneas", "textarea", "#3366cc\n#ee5544\n#42a876");
  entrada.rows = 4;
  const tono = control("Giro de matiz (grados)", "range", "0");
  tono.min = -180;
  tono.max = 180;
  const saturacion = control("Saturación (%)", "range", "100");
  saturacion.min = 0;
  saturacion.max = 200;
  const brillo = control("Luminosidad (%)", "range", "100");
  brillo.min = 0;
  brillo.max = 200;
  function actualizar() {
    salida.replaceChildren();
    const colores = listaColores(entrada.value);
    if (!colores.length) return texto("Introduce colores HEX válidos, por ejemplo #3366cc.");
    const caja = document.createElement("div");
    caja.className = "swatches";
    for (const color of colores) {
      const item = document.createElement("div");
      item.className = "swatch";
      const vista = document.createElement("div");
      vista.className = "swatch-color";
      vista.style.background = color;
      vista.style.filter = "hue-rotate(" + tono.value + "deg) saturate(" + saturacion.value + "%) brightness(" + brillo.value + "%)";
      const codigo = document.createElement("code");
      codigo.textContent = color.toUpperCase();
      item.append(vista, codigo);
      caja.append(item);
    }
    salida.append(caja);
    texto("Matiz " + tono.value + "°, saturación " + saturacion.value + "%, luminosidad " + brillo.value + "%. Los códigos indican los colores originales.");
  }
  for (const campo of [entrada, tono, saturacion, brillo]) campo.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "armonia-monocromatica") {
  const color = control("Color base", "color", "#3366cc");
  function actualizar() {
    salida.replaceChildren();
    const base = rgb(color.value);
    muestras([.7, .4, .15, 0, -.2, -.4, -.6].map(p => hex(base.map(v => p > 0 ? v + (255-v)*p : v*(1+p)))));
  }
  color.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "paletas-retro") {
  const paletas = {
    "Game Boy, tonos verdes": ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
    "CGA, cian y magenta": ["#000000", "#55ffff", "#ff55ff", "#ffffff"],
    "CGA, verde y rojo": ["#000000", "#55ff55", "#ff5555", "#ffff55"]
  };
  const etiqueta = document.createElement("label");
  etiqueta.textContent = "Paleta";
  const select = document.createElement("select");
  for (const nombre of Object.keys(paletas)) {
    const opcion = document.createElement("option");
    opcion.textContent = nombre;
    select.append(opcion);
  }
  etiqueta.append(select);
  controles.append(etiqueta);
  function actualizar() {
    salida.replaceChildren();
    muestras(paletas[select.value]);
  }
  select.addEventListener("change", actualizar);
  actualizar();
}

if (tipo === "rueda-cromatica") {
  const matiz = control("Matiz (grados)", "range", "0");
  matiz.min = 0;
  matiz.max = 359;
  const rueda = document.createElement("div");
  rueda.className = "color-wheel";
  salida.append(rueda);
  const descripcion = document.createElement("p");
  salida.append(descripcion);
  function actualizar() {
    const h = Number(matiz.value);
    rueda.style.borderColor = "hsl(" + h + " 100% 50%)";
    descripcion.textContent = "Matiz seleccionado: " + h + "° · HSL(" + h + ", 100%, 50%).";
  }
  matiz.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "nombre-color") {
  const color = control("Color", "color", "#3366cc");
  const nombres = {
    black:"#000000", silver:"#c0c0c0", gray:"#808080", white:"#ffffff", maroon:"#800000",
    red:"#ff0000", purple:"#800080", fuchsia:"#ff00ff", green:"#008000", lime:"#00ff00",
    olive:"#808000", yellow:"#ffff00", navy:"#000080", blue:"#0000ff", teal:"#008080",
    aqua:"#00ffff", orange:"#ffa500", pink:"#ffc0cb", brown:"#a52a2a", coral:"#ff7f50",
    gold:"#ffd700", indigo:"#4b0082", khaki:"#f0e68c", orchid:"#da70d6", salmon:"#fa8072",
    tomato:"#ff6347", violet:"#ee82ee", turquoise:"#40e0d0", beige:"#f5f5dc", rebeccapurple:"#663399"
  };
  function actualizar() {
    salida.replaceChildren();
    const elegido = rgb(color.value);
    const [nombre, cercano] = Object.entries(nombres).sort((a,b) => {
      const distancia = c => rgb(c).reduce((s, n, i) => s + (n - elegido[i]) ** 2, 0);
      return distancia(a[1]) - distancia(b[1]);
    })[0];
    muestras([color.value, cercano]);
    texto("Nombre CSS más cercano entre los 30 colores disponibles: " + nombre + " (" + cercano.toUpperCase() + "). La comparación usa distancia RGB.");
  }
  color.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "colores-marca" || tipo === "mapas-color") {
  const primero = control(tipo === "mapas-color" ? "Color inicial" : "Color de marca", "color", "#3366cc");
  const segundo = tipo === "mapas-color" ? control("Color final", "color", "#f6c453") : null;
  function actualizar() {
    salida.replaceChildren();
    if (segundo) {
      const a = rgb(primero.value), b = rgb(segundo.value);
      muestras(Array.from({length: 11}, (_, i) => hex(a.map((v,j) => v + (b[j]-v)*i/10))));
      texto("Escala interpolada en RGB.");
    } else {
      for (const fondo of ["#ffffff", "#171717"]) {
        const vista = document.createElement("div");
        vista.className = "contrast-sample";
        vista.style.background = fondo;
        vista.style.color = primero.value;
        vista.textContent = "Ejemplo de color de marca";
        salida.append(vista);
        const a = luminancia(primero.value), b = luminancia(fondo);
        texto("Contraste sobre " + fondo.toUpperCase() + ": " + ((Math.max(a,b)+.05)/(Math.min(a,b)+.05)).toFixed(2) + ":1");
      }
    }
  }
  primero.addEventListener("input", actualizar);
  segundo?.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "simulador-daltonismo") {
  const entrada = control("Colores HEX separados por espacios o líneas", "textarea", "#e74c3c\n#2ecc71\n#3498db\n#f1c40f");
  entrada.rows = 4;
  const matrices = {
    "Protanopía aproximada": [[.567,.433,0],[.558,.442,0],[0,.242,.758]],
    "Deuteranopía aproximada": [[.625,.375,0],[.7,.3,0],[0,.3,.7]],
    "Tritanopía aproximada": [[.95,.05,0],[0,.433,.567],[0,.475,.525]]
  };
  function actualizar() {
    salida.replaceChildren();
    const colores = listaColores(entrada.value);
    if (!colores.length) return texto("Introduce colores válidos, por ejemplo #3366cc.");
    texto("Paleta original");
    muestras(colores);
    for (const [nombre, matriz] of Object.entries(matrices)) {
      texto(nombre);
      muestras(colores.map(color => {
        const original = rgb(color);
        return hex(matriz.map(fila => fila.reduce((s, n, i) => s + n * original[i], 0)));
      }));
    }
    texto("La simulación es orientativa; la percepción varía de una persona a otra.");
  }
  entrada.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "diferencia-color") {
  const primero = control("Primer color", "color", "#3366cc");
  const segundo = control("Segundo color", "color", "#436ed0");
  function lab(color) {
    const [r,g,b] = rgb(color).map(v => {
      v /= 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    const xyz = [
      (r*.4124564 + g*.3575761 + b*.1804375) / .95047,
      r*.2126729 + g*.7151522 + b*.072175,
      (r*.0193339 + g*.119192 + b*.9503041) / 1.08883
    ].map(v => v > 216/24389 ? Math.cbrt(v) : (24389/27*v + 16)/116);
    return [116*xyz[1]-16, 500*(xyz[0]-xyz[1]), 200*(xyz[1]-xyz[2])];
  }
  function actualizar() {
    salida.replaceChildren();
    muestras([primero.value, segundo.value]);
    const a = lab(primero.value), b = lab(segundo.value);
    const diferencia = Math.hypot(...a.map((v, i) => v-b[i]));
    texto("Delta E CIE76: " + diferencia.toFixed(2) + ". Un valor menor indica colores más parecidos.");
  }
  primero.addEventListener("input", actualizar);
  segundo.addEventListener("input", actualizar);
  actualizar();
}

if (tipo === "degradado-malla") {
  const colores = [
    control("Esquina superior izquierda", "color", "#3366cc"),
    control("Esquina superior derecha", "color", "#e84d88"),
    control("Esquina inferior izquierda", "color", "#57d7bf"),
    control("Esquina inferior derecha", "color", "#f6c453")
  ];
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 400;
  canvas.style.cssText = "display:block;width:100%;max-width:600px;border-radius:.5rem";
  salida.append(canvas);
  function actualizar() {
    const ctx = canvas.getContext("2d");
    const imagen = ctx.createImageData(canvas.width, canvas.height);
    const tonos = colores.map(c => rgb(c.value));
    for (let y = 0; y < canvas.height; y++) {
      const v = y / (canvas.height - 1);
      for (let x = 0; x < canvas.width; x++) {
        const u = x / (canvas.width - 1);
        const i = (y * canvas.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          imagen.data[i+c] = tonos[0][c]*(1-u)*(1-v) + tonos[1][c]*u*(1-v) + tonos[2][c]*(1-u)*v + tonos[3][c]*u*v;
        }
        imagen.data[i+3] = 255;
      }
    }
    ctx.putImageData(imagen, 0, 0);
  }
  for (const color of colores) color.addEventListener("input", actualizar);
  boton("Descargar PNG", () => {
    const enlace = document.createElement("a");
    enlace.download = "degradado.png";
    enlace.href = canvas.toDataURL("image/png");
    enlace.click();
  });
  actualizar();
}

if (tipo === "degradado-perceptual") {
  const primero = control("Color inicial", "color", "#3366cc");
  const segundo = control("Color final", "color", "#ee5544");
  const vista = document.createElement("div");
  vista.className = "swatch-color";
  vista.style.cssText = "height:10rem;border-radius:.5rem";
  const codigo = document.createElement("pre");
  codigo.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere";
  salida.append(vista, codigo);
  function actualizar() {
    const valor = "linear-gradient(in oklab, " + primero.value + ", " + segundo.value + ")";
    vista.style.background = valor;
    codigo.textContent = "background: " + valor + ";";
    if (!CSS.supports("background", valor)) codigo.textContent += "\nTu navegador no admite degradados en OKLab.";
  }
  primero.addEventListener("input", actualizar);
  segundo.addEventListener("input", actualizar);
  boton("Copiar CSS", async () => {
    try { await navigator.clipboard.writeText(codigo.textContent); }
    catch { texto("Selecciona y copia el código CSS mostrado."); }
  });
  actualizar();
}
