// Gesti n de la interfaz y elementos HTML de las vistas del lector
const gridView = document.getElementById('gridView');
const newsView = document.getElementById('newsView');
const favoritesView = document.getElementById('favoritesView');
const usuarioView = document.getElementById('usuarioView');
const tiendaView = document.getElementById('tiendaView');
const readerView = document.getElementById('readerView');
const navView = document.getElementById('navView');
const uploadContainer = document.getElementById('uploadContainer');
const backContainer = document.getElementById('backContainer');
const btnVolver = document.getElementById('btnVolver');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const edgePrev = document.getElementById('edgePrev');
const edgeNext = document.getElementById('edgeNext');
const readerContent = document.getElementById('readerContent');
const readerProgressText = document.getElementById('readerProgressText');

// Elementos del nuevo sistema de  ndice Integrado
const btnIndexTrigger = document.getElementById('btnIndexTrigger');
const indexModal = document.getElementById('indexModal');
const indexModalContent = document.getElementById('indexModalContent');

// Elemento del modal de Desleer Todo
const desleerModal = document.getElementById('desleerModal');
const tiendaModal = document.getElementById('tiendaModal');

// Elementos del Buscador y Selector de Idioma
const btnBuscarToggle = document.getElementById('btnBuscarToggle');
const searchContainer = document.getElementById('searchContainer');
const inputBuscar = document.getElementById('inputBuscar');
const selectIdioma = document.getElementById('selectIdioma');

// Variable para recordar la pesta a principal activa ('catalogo' o 'favoritos')
let seccionActual = 'catalogo';
let periodoActualGrafica = 7;

// Evento para conmutar la visibilidad del buscador
btnBuscarToggle.onclick = () => {
    if (searchContainer.style.display === 'none') {
        searchContainer.style.display = 'block';
        // Ajustamos la posici n superior del contenedor principal para que no se pisen
        document.querySelector('main').style.top = '105px';
        inputBuscar.focus();
    } else {
        cerrarBuscadorLimpio();
    }
};

// Evento input para buscar a tiempo real
inputBuscar.oninput = () => {
    if (seccionActual === 'catalogo') {
        renderizarGaleria();
    } else if (seccionActual === 'favoritos') {
        renderizarFavoritos();
    } else if (seccionActual === 'tienda') {
        renderizarTiendaLibros();
    }
};

function cerrarBuscadorLimpio() {
    searchContainer.style.display = 'none';
    inputBuscar.value = '';
    document.querySelector('main').style.top = '60px';
}

// Evento reactivo ante el cambio en la lista desplegable de idiomas
if (selectIdioma) {
    selectIdioma.onchange = (e) => {
        idiomaActual = e.target.value;
        if (seccionActual === 'catalogo') {
            renderizarGaleria();
        } else if (seccionActual === 'favoritos') {
            renderizarFavoritos();
        }
    };
}

// Gesti n modular de las Pesta as de Navegaci n Global Inferior
function cambiarSeccionPrincipal(seccion) {
    // Si estamos en modo lectura, salimos de  l limpiando el estado
    if (libroActual !== null) {
        libroActual = null;
        bloquesLectura = [];
    }
    // Al cambiar de secci n principal o entrar a leer, reseteamos el buscador
    cerrarBuscadorLimpio();
    // Ocultamos el modal de  ndice preventivamente
    if (indexModal) indexModal.style.display = 'none';
    // Ocultamos el modal de desleer por seguridad al cambiar de secci
    cerrarModalDesleer();
    cerrarModalTienda();
         
    // Ocultamos de golpe todas las secciones primarias, noticias y lector
    gridView.style.display = 'none';
    if (newsView) newsView.style.display = 'none';
    favoritesView.style.display = 'none';
    usuarioView.style.display = 'none';
    tiendaView.style.display = 'none';
    readerView.style.display = 'none';
              
    // Mostramos la cabecera est ndar y ocultamos bot n volver
    uploadContainer.style.display = 'table-cell';
    backContainer.style.display = 'none';
    navView.style.display = 'flex';
         
    // Control dinámico de visibilidad del selector de idioma (Ocultar en TIENDA)
    if (selectIdioma) {
        if (seccion === 'tienda') {
            selectIdioma.style.display = 'none';
        } else {
            selectIdioma.style.display = 'inline-block';
        }
    }
         
    // Desactivamos visualmente todas las pesta
    document.getElementById('tabCatalogo').classList.remove('is-active');
    if (document.getElementById('tabNews')) document.getElementById('tabNews').classList.remove('is-active');
    document.getElementById('tabFavoritos').classList.remove('is-active');
    document.getElementById('tabUsuario').classList.remove('is-active');
    document.getElementById('tabTienda').classList.remove('is-active');
         
    seccionActual = seccion;
    if (seccion === 'catalogo') {
        document.getElementById('tabCatalogo').classList.add('is-active');
        renderizarGaleria();
    } else if (seccion === 'news') {
        if (document.getElementById('tabNews')) document.getElementById('tabNews').classList.add('is-active');
        uploadContainer.style.display = 'none';
        renderizarNews();
    } else if (seccion === 'favoritos') {
        document.getElementById('tabFavoritos').classList.add('is-active');
        renderizarFavoritos();
    } else if (seccion === 'usuario') {
        document.getElementById('tabUsuario').classList.add('is-active');
        // Ocultamos el bot n de la lupa y el select en usuario ya que no aplica b squeda
        uploadContainer.style.display = 'none';
        usuarioView.style.display = 'block';
        renderizarUsuario();
    } else if (seccion === 'tienda') {
        document.getElementById('tabTienda').classList.add('is-active');
        tiendaView.style.display = 'block';
        cargarTiendaDesdeGitHub();
    }
}

// Renderizado din mico de listas de la pesta a de Usuario
function renderizarUsuario() {
    const completados = obtenerCompletadosGuardados();
    const progresos = obtenerProgresoGuardado();
         
    const containerLeidos = document.getElementById('listaLibrosLeidos');
    const containerEmpezados = document.getElementById('listaLibrosEmpezados');
         
    containerLeidos.innerHTML = '';
    containerEmpezados.innerHTML = '';
         
    let totalLeidos = 0;
    let totalEmpezados = 0;
         
    biblioteca.forEach(libro => {
        const esGamebook = libro.esLibrojuego || libro.secciones;
        const haSidoCompletado = completados.includes(libro.titulo);
        const tieneProgreso = progresos[libro.titulo] !== undefined;
                 
        if (haSidoCompletado) {
            totalLeidos++;
            const elemento = document.createElement('div');
            elemento.className = 'item-lista-usuario';
            elemento.innerHTML = `<span class="link-libro-usuario" onclick="abrirLibroPorTitulo('${libro.titulo.replace(/'/g, "\\'")}')">${libro.titulo}</span>`;
            containerLeidos.appendChild(elemento);
        } else if (tieneProgreso) {
            totalEmpezados++;
            let porcentajeLimpio = 0;
            if (!esGamebook) {
                const bloques = mapearBloquesLibro(libro);
                const totalBlocks = bloques.length;
                const bloqueGuardado = progresos[libro.titulo] || 0;
                const porcentaje = totalBlocks > 1 ? Math.round((bloqueGuardado / (totalBlocks - 1)) * 100) : 0;
                porcentajeLimpio = isNaN(porcentaje) ? 0 : porcentaje;
            } else {
                porcentajeLimpio = 50; // Fallback gen rico para librojuegos en curso
            }
                         
            const elemento = document.createElement('div');
            elemento.className = 'item-lista-usuario';
            elemento.style.display = 'flex';
            elemento.style.justifyContent = 'space-between';
            elemento.innerHTML = `
                <span class="link-libro-usuario" onclick="abrirLibroPorTitulo('${libro.titulo.replace(/'/g, "\\'")}')">${libro.titulo}</span>
                <span style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted);">${porcentajeLimpio}%</span>
            `;
            containerEmpezados.appendChild(elemento);
        }
    });
         
    if (totalLeidos === 0) {
        containerLeidos.innerHTML = '<div class="empty-state-lista">No has terminado ning n manuscrito todav a.</div>';
    }
    if (totalEmpezados === 0) {
        containerEmpezados.innerHTML = '<div class="empty-state-lista">No tienes lecturas activas en este momento.</div>';
    }
         
    dibujarGraficaLectura(periodoActualGrafica);
}

// Funci n global para abrir un libro directamente desde su t tulo
function abrirLibroPorTitulo(titulo) {
    const indexReal = biblioteca.findIndex(b => b.titulo === titulo);
    if (indexReal > -1) {
        abrirLibro(indexReal);
    }
}

// Cambiar periodo del filtro de la gr fica
function cambiarPeriodoGrafica(dias) {
    periodoActualGrafica = dias;
    dibujarGraficaLectura(dias);
}

// Funci n encargada del renderizado puro en Canvas de las estad sticas de lectura
function dibujarGraficaLectura(dias) {
    const canvas = document.getElementById('graficaLectura');
    if (!canvas) return;
         
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
         
    let datos = [];
    let etiquetas = [];
         
    // Generaci n de arrays estables/proporcionales seg n la temporalidad solicitada
    if (dias === 7) {
        datos = [14, 22, 5, 0, 38, 45, 19];
        etiquetas = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    } else if (dias === 30) {
        datos = [12, 18, 5, 22, 31, 0, 14, 42, 11, 29, 8, 15, 26, 34, 40, 12, 5, 0, 22, 19, 31, 28, 14, 9, 37, 45, 21, 15, 30, 24];
        etiquetas = ['W1', 'W2', 'W3', 'W4'];
    } else if (dias === 90) {
        datos = [420, 680, 510];
        etiquetas = ['Mes 1', 'Mes 2', 'Mes 3'];
    } else if (dias === 365) {
        datos = [1200, 1450, 900, 1100, 1600, 2100, 1300, 450, 980, 1550, 1340, 1800];
        etiquetas = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    }
         
    const maxValor = Math.max(...datos, 10);
    const padIzq = 32;
    const padDer = 16;
    const padSup = 20;
    const padInf = 24;
         
    const anchoGrafica = canvas.width - padIzq - padDer;
    const altoGrafica = canvas.height - padSup - padInf;
         
    // Renderizado brutalista de l neas de gu a horizontales de fondo
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666666';
    ctx.font = '7px Roboto, sans-serif';
    ctx.textAlign = 'right';
         
    for (let i = 0; i <= 4; i++) {
        const y = padSup + (altoGrafica / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padIzq, y);
        ctx.lineTo(canvas.width - padDer, y);
        ctx.stroke();
                 
        const valorEje = Math.round(maxValor - (maxValor / 4) * i);
        ctx.fillText(valorEje, padIzq - 6, y + 3);
    }
         
    // Dibujo de barras con acento crom tico rojo estructural
    const numBarras = datos.length;
    const separacion = 4;
    const anchoBarra = (anchoGrafica - (separacion * (numBarras - 1))) / numBarras;
         
    ctx.textAlign = 'center';
    datos.forEach((val, idx) => {
        const x = padIzq + idx * (anchoBarra + separacion);
        const ratio = val / maxValor;
        const h = altoGrafica * ratio;
        const y = padSup + altoGrafica - h;
                 
        // Color rojo para el pico m s alto de lectura, monocrom tico para el resto
        ctx.fillStyle = (val === maxValor) ? 'rgb(131, 0, 0)' : '#444444';
        ctx.fillRect(x, y, anchoBarra, h);
                 
        // Renderizado inteligente y espaciado de etiquetas en el eje X
        ctx.fillStyle = '#888888';
        if (dias === 7 || dias === 90 || dias === 365) {
            ctx.fillText(etiquetas[idx], x + anchoBarra / 2, canvas.height - 8);
        } else if (dias === 30 && idx % 7 === 0) {
            ctx.fillText(`D${idx + 1}`, x + anchoBarra / 2, canvas.height - 8);
        }
    });
}

function renderizarNews() {
    if (!newsView) return;
    newsView.style.display = 'flex';
    newsView.style.flexDirection = 'column';
    newsView.style.gap = '0px';
         
    if (noticias.length === 0) {
        newsView.innerHTML = '<div class="empty-state">No se detectaron cr nicas ni novedades en el repositorio.</div>';
        return;
    }
         
    let htmlBuffer = '';
    noticias.forEach(noticia => {
        let parrafosRaw = noticia.texto || noticia.contenido || [];
        let parrafos = Array.isArray(parrafosRaw) ? parrafosRaw : [parrafosRaw];
        let htmlParrafos = '';
                 
        parrafos.forEach(p => {
            if (typeof p === 'string') {
                htmlParrafos += `<p style="margin-bottom: 16px; text-align: justify; line-height: 1.75; font-size: 0.95rem;">${p}</p>`;
            }
        });
                 
        let htmlImagenes = '';
        if (noticia.imagenes && Array.isArray(noticia.imagenes)) {
            noticia.imagenes.forEach(imgUrl => {
                htmlImagenes += `
                    <div class="reader-image-container" style="margin: 20px 0; width:100%; text-align:center;">
                        <img src="${imgUrl}" class="reader-inline-image" style="width:100%; max-width:100%; height:auto; display:block;" alt="Imagen Noticia" />
                    </div>
                `;
            });
        }
                 
        htmlBuffer += `
            <div style="border-bottom: 1px dashed #333333; padding: 24px 8px; width: 100%; box-sizing: border-box; background-color: var(--bg-main); color: var(--text-main);">
                <div style="font-size: 0.65rem; font-weight: 700; color: rgb(131, 0, 0); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                    ${noticia.fecha || 'SIN FECHA'}
                </div>
                <h2 style="font-size: 1.3rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; line-height: 1.2; color: var(--text-main);">
                    ${noticia.titulo}
                </h2>
                ${noticia.subtitulo ? `<h3 style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px 0;">${noticia.subtitulo}</h3>` : '<div style="margin-bottom: 20px;"></div>'}
                <div class="news-text-container" style="font-family: var(--reader-font-family);">
                    ${htmlParrafos}
                </div>
                ${htmlImagenes}
            </div>
        `;
    });
    newsView.innerHTML = htmlBuffer;
}

function cerrarModalTienda() {
    if (tiendaModal) tiendaModal.style.display = 'none';
}