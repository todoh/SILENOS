"use strict";

const herramientaColor = document.documentElement.dataset.tool;
const zona = document.getElementById("herramienta");
const campos = document.createElement("div");
campos.className = "color-fields";
const resultado = document.createElement("div");
resultado.className = "color-output";
resultado.setAttribute("aria-live", "polite");
zona.append(campos, resultado);

function campoColor(nombre, valor) {
  const etiqueta = document.createElement("label");
  etiqueta.textContent = nombre;
  const entrada = document.createElement("input");
  entrada.type = "color";
  entrada.value = valor;
  etiqueta.append(entrada);
  campos.append(etiqueta);
  entrada.addEventListener("input", actualizar);
  return entrada;
}

function rgb(hex) {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
}

function hex(rgbColor) {
  return "#" + rgbColor.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
}

function hsl(color) {
  const [r, g, b] = rgb(color).map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
}

function desdeHsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return hex([f(0), f(8), f(4)]);
}

function muestras(colores) {
  const contenedor = document.createElement("div");
  contenedor.className = "swatches";
  for (const color of colores) {
    const tarjeta = document.createElement("div");
    tarjeta.className = "swatch";
    const muestra = document.createElement("div");
    muestra.className = "swatch-color";
    muestra.style.backgroundColor = color;
    const codigo = document.createElement("code");
    codigo.textContent = color.toUpperCase();
    tarjeta.append(muestra, codigo);
    contenedor.append(tarjeta);
  }
  resultado.append(contenedor);
}

function luminancia(color) {
  const [r, g, b] = rgb(color).map(v => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}

const primero = campoColor(herramientaColor === "contraste" ? "Color del texto" : "Color", "#3366cc");
let segundo, modo;
if (herramientaColor === "contraste") segundo = campoColor("Color del fondo", "#ffffff");
if (herramientaColor === "paletas-armonicas") {
  const etiqueta = document.createElement("label");
  etiqueta.textContent = "Tipo de armonía";
  modo = document.createElement("select");
  for (const [valor, texto] of [["complementaria", "Complementaria"], ["analoga", "Análoga"], ["triadica", "Triádica"], ["tetradica", "Tetrádica"]]) {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = texto;
    modo.append(opcion);
  }
  etiqueta.append(modo);
  campos.append(etiqueta);
  modo.addEventListener("change", actualizar);
}

function actualizar() {
  resultado.replaceChildren();
  const color = primero.value;
  if (herramientaColor === "selector") {
    muestras([color]);
    const [r, g, b] = rgb(color);
    const [h, s, l] = hsl(color);
    const texto = document.createElement("p");
    texto.textContent = `RGB: ${r}, ${g}, ${b} · HSL: ${Math.round(h)}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
    resultado.append(texto);
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const hsvS = max ? (max - min) / max : 0;
    const k = 1 - max;
    const cmy = [r, g, b].map(v => max ? (1 - v / 255 - k) / max : 0);
    const lineal = [r, g, b].map(v => {
      v /= 255;
      return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    const [rr, gg, bb] = lineal;
    const ll = Math.cbrt(.4122214708*rr + .5363325363*gg + .0514459929*bb);
    const mm = Math.cbrt(.2119034982*rr + .6806995451*gg + .1073969566*bb);
    const ss = Math.cbrt(.0883024619*rr + .2817188376*gg + .6299787005*bb);
    const light = .2104542553*ll + .793617785*mm - .0040720468*ss;
    const aa = 1.9779984951*ll - 2.428592205*mm + .4505937099*ss;
    const bb2 = .0259040371*ll + .7827717662*mm - .808675766*ss;
    const chroma = Math.hypot(aa, bb2);
    const hue = chroma < 0.000001 ? 0 : (Math.atan2(bb2, aa) * 180 / Math.PI + 360) % 360;
    const otros = document.createElement("p");
    otros.textContent = `HSV: ${Math.round(h)}°, ${Math.round(hsvS*100)}%, ${Math.round(max*100)}% · CMYK: ${[...cmy,k].map(v => Math.round(v*100) + "%").join(", ")} · OKLCH: ${(light*100).toFixed(1)}%, ${chroma.toFixed(4)}, ${hue.toFixed(1)}°`;
    resultado.append(otros);
  } else if (herramientaColor === "paletas-armonicas") {
    const [h, s, l] = hsl(color);
    const angulos = { complementaria: [0, 180], analoga: [-30, 0, 30], triadica: [0, 120, 240], tetradica: [0, 90, 180, 270] };
    muestras(angulos[modo.value].map(n => desdeHsl((h + n + 360) % 360, s, l)));
  } else if (herramientaColor === "escalas-tonales") {
    const original = rgb(color);
    muestras(Array.from({ length: 11 }, (_, i) => {
      const destino = i < 5 ? 255 : 0;
      const fuerza = i < 5 ? (5 - i) / 5 : (i - 5) / 5;
      return hex(original.map(v => v + (destino - v) * fuerza));
    }));
  } else if (herramientaColor === "contraste") {
    const a = luminancia(color), b = luminancia(segundo.value);
    const ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const muestra = document.createElement("div");
    muestra.className = "contrast-sample";
    muestra.style.color = color;
    muestra.style.backgroundColor = segundo.value;
    muestra.textContent = "Ejemplo de texto sobre este fondo";
    const detalle = document.createElement("p");
    detalle.textContent = `Contraste: ${ratio.toFixed(2)}:1. Texto normal: AA ${ratio >= 4.5 ? "aprobado" : "no aprobado"}, AAA ${ratio >= 7 ? "aprobado" : "no aprobado"}. Texto grande: AA ${ratio >= 3 ? "aprobado" : "no aprobado"}, AAA ${ratio >= 4.5 ? "aprobado" : "no aprobado"}.`;
    resultado.append(muestra, detalle);
  }
}

actualizar();
