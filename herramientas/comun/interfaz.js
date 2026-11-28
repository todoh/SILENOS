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
marca.replaceChildren(document.createTextNode("SILEN"), elemento("span", "OS"));
const tituloHerramientas = enlace("HERRAMIENTAS", "./");
tituloHerramientas.className = "brand-section";
const navegacion = elemento("nav");
navegacion.setAttribute("aria-label", "Categorías de herramientas");
const menu = despliegue("Categorías", "menu");
const listaMenu = elemento("ul", "", "menu-list");

for (const categoria of categorias) {
  const fila = elemento("li", "", "category-row");
  const apps = herramientasDe(categoria.id);
  const encabezado = elemento("div", "", "category-heading");
  encabezado.append(enlace(categoria.nombre, categoria.id + "/", categoriaActual === categoria.id && !herramientaActual));
  fila.append(encabezado);
  if (apps.length) {
    const listaApps = elemento("ul", "", "submenu");
    listaApps.id = "menu-" + categoria.id;
    listaApps.hidden = true;
    const boton = elemento("button", "", "category-toggle");
    boton.type = "button";
    boton.setAttribute("aria-label", "Mostrar herramientas de " + categoria.nombre);
    boton.setAttribute("aria-expanded", "false");
    boton.setAttribute("aria-controls", listaApps.id);
    boton.addEventListener("click", () => {
      const abierto = listaApps.hidden;
      listaApps.hidden = !abierto;
      boton.setAttribute("aria-expanded", String(abierto));
      boton.setAttribute("aria-label", (abierto ? "Ocultar" : "Mostrar") + " herramientas de " + categoria.nombre);
    });
    encabezado.append(boton);
    for (const app of apps) {
      const item = elemento("li");
      item.append(enlace(app.nombre, categoria.id + "/" + app.id + "/", categoriaActual === categoria.id && herramientaActual === app.id));
      listaApps.append(item);
    }
    fila.append(listaApps);
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
  menu.open = false;
  menu.firstElementChild.focus();
});

contenidoBarra.append(marca, tituloHerramientas, navegacion, tema);
barra.append(contenidoBarra);

const entradas = categoriaActual ? herramientasDe(categoriaActual) : categorias;
if (listado && entradas.length) {
  const cuadricula = elemento("ul", "", "cards");
  for (const entrada of entradas) {
    const item = elemento("li");
    const ruta = categoriaActual ? categoriaActual + "/" + entrada.id : entrada.id;
    const tarjeta = elemento("div", "", "card");
    const titulo = elemento("h2");
    titulo.append(enlace(entrada.nombre, ruta + "/"));
    tarjeta.append(titulo, elemento("p", entrada.descripcion));
    if (!categoriaActual) {
      const apps = herramientasDe(entrada.id);
      if (apps.length) {
        const lista = elemento("ul", "", "card-tools");
        for (const app of apps) {
          const herramienta = elemento("li");
          herramienta.append(enlace(app.nombre, entrada.id + "/" + app.id + "/"));
          lista.append(herramienta);
        }
        tarjeta.append(lista);
      }
    }
    item.append(tarjeta);
    cuadricula.append(item);
  }
  listado.replaceChildren(cuadricula);
}

const principal = document.querySelector("main");
if (principal) {
  const marco = elemento("div", "", "page-frame");
  const publicidadIzquierda = elemento("aside", "Publicidad", "ad-slot ad-left");
  const publicidadDerecha = elemento("aside", "Publicidad", "ad-slot ad-right");
  publicidadIzquierda.setAttribute("aria-label", "Espacio publicitario izquierdo");
  publicidadDerecha.setAttribute("aria-label", "Espacio publicitario derecho");
  principal.before(marco);
  marco.append(publicidadIzquierda, principal, publicidadDerecha);
}
