"use strict";

const raiz = new URL("../", document.currentScript.src);
const categoriaActual = document.documentElement.dataset.category;
const herramientaActual = document.documentElement.dataset.tool;
const barra = document.getElementById("barra");
const listado = document.getElementById("listado");
const claveTema = "silenos-herramientas-tema";

function elemento(tipo, texto, clase) {
  const nodo = document.createElement(tipo);
  if (texto) nodo.textContent = texto;
  if (clase) nodo.className = clase;
  return nodo;
}

function enlace(texto, ruta, actual = false) {
  const nodo = elemento("a", texto);
  nodo.href = new URL(ruta, raiz);
  if (actual) nodo.setAttribute("aria-current", "page");
  return nodo;
}

function despliegue(texto, clase) {
  const nodo = elemento("details", "", clase);
  nodo.append(elemento("summary", texto));
  return nodo;
}

function herramientasDe(id) {
  return herramientas.filter(herramienta => herramienta.categoria === id);
}

const contenidoBarra = elemento("div", "", "bar-inner");
const marca = enlace("SILENOS", "/");
marca.className = "brand";
const navegacion = elemento("nav");
navegacion.setAttribute("aria-label", "Categorías de herramientas");
const menu = despliegue("Categorías", "menu");
const listaMenu = elemento("ul", "", "menu-list");

for (const categoria of categorias) {
  const fila = elemento("li", "", "category-row");
  const apps = herramientasDe(categoria.id);
  fila.append(enlace(categoria.nombre, categoria.id + "/", categoriaActual === categoria.id && !herramientaActual));
  if (apps.length) {
    const sub = despliegue("Herramientas", "submenu");
    sub.name = "silenos-categorias";
    sub.firstElementChild.setAttribute("aria-label", "Herramientas de " + categoria.nombre);
    const listaApps = elemento("ul");
    for (const app of apps) {
      const item = elemento("li");
      item.append(enlace(app.nombre, categoria.id + "/" + app.id + "/", categoriaActual === categoria.id && herramientaActual === app.id));
      listaApps.append(item);
    }
    sub.append(listaApps);
    fila.append(sub);
  }
  listaMenu.append(fila);
}

menu.append(listaMenu);
navegacion.append(menu);
const tema = elemento("button", "", "theme");
tema.type = "button";
function aplicarTema(oscuro) {
  document.documentElement.dataset.theme = oscuro ? "oscuro" : "claro";
  tema.textContent = oscuro ? "Tema claro" : "Tema oscuro";
}

try {
  aplicarTema(localStorage.getItem(claveTema) === "oscuro");
} catch {
  aplicarTema(false);
}

tema.addEventListener("click", () => {
  const oscuro = document.documentElement.dataset.theme !== "oscuro";
  aplicarTema(oscuro);
  try {
    localStorage.setItem(claveTema, oscuro ? "oscuro" : "claro");
  } catch {
    // El tema sigue funcionando durante la visita aunque no pueda guardarse.
  }
});

document.addEventListener("click", evento => {
  if (!menu.contains(evento.target)) menu.open = false;
});
menu.addEventListener("keydown", evento => {
  if (evento.key !== "Escape" || !menu.open) return;
  const sub = evento.target.closest(".submenu[open]");
  const desplegado = sub || menu;
  desplegado.open = false;
  desplegado.firstElementChild.focus();
});

contenidoBarra.append(marca, navegacion, tema);
barra.append(contenidoBarra);

const entradas = categoriaActual ? herramientasDe(categoriaActual) : categorias;
if (listado && entradas.length) {
  const cuadricula = elemento("ul", "", "cards");
  for (const entrada of entradas) {
    const item = elemento("li");
    const ruta = categoriaActual ? categoriaActual + "/" + entrada.id : entrada.id;
    const tarjeta = enlace("", ruta + "/");
    tarjeta.className = "card";
    tarjeta.append(elemento("h2", entrada.nombre), elemento("p", entrada.descripcion));
    item.append(tarjeta);
    cuadricula.append(item);
  }
  listado.replaceChildren(cuadricula);
}
