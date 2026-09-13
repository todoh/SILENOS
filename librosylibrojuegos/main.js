// main.js
// Estado global del ciclo de vida de la aplicación
let biblioteca = [];
let noticias = [];
let libroActual = null;
let indiceBloqueActual = 0;
let bloquesLectura = [];
let mapaImagenes = {}; // Almacenará las URLs de GitHub indexadas por el nombre del archivo
let idiomaActual = 'ES'; // Idioma global por defecto para el filtrado de manuscritos
let filtrarSoloGamebooks = false; // Bandera de control para aislar librojuegos en las vistas

// Control de reintentos para evitar bucles infinitos si la red o el SDK tardan en inicializarse
let retriesCargaBiblioteca = 0;
const MAX_RETRIES_FIREBASE = 10;

// Estado específico para la Sección Tienda Remota
let tiendaLibros = [];
let tiendaColecciones = [];
let tiendaColeccionSeleccionada = "all";

// Configuración del origen de datos remoto (GitHub)
const GITHUB_USER = 'todoh';
const GITHUB_REPO = 'libros';
const GITHUB_BRANCH = 'main';

// URLs base de acceso a la API y al CDN rápido de archivos crudos
const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/libros`;
const RAW_BASE_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/libros/`;

// Endpoints modularizados para la sección de Noticias
const NOTICIAS_API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/noticias`;
const NOTICIAS_RAW_BASE_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_USER}/${GITHUB_REPO}@${GITHUB_BRANCH}/noticias/`;

// Endpoint CDN crudo para la carpeta /catalogo (Tienda)
const TIENDA_JSON_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/SILENOS/main/catalogo/inventario.json`;
const TIENDA_IMAGENES_BASE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/SILENOS/main/catalogo/`;

// Mapeador de seguridad para la estructura de bloques de lectura convencional
// Mapeador de seguridad para la estructura de bloques de lectura convencional y avanzada
function mapearBloquesLibro(libro) {
    if (!libro) return [];
    let lista = [];

    // 1. Portada si existe en el objeto raíz
    if (libro.portada) {
        lista.push({
            tipo: 'Portada',
            subtitulo: libro.titulo || 'Portada',
            esPortada: true,
            contenido: [libro.portada]
        });
    }

    // 2. Prólogo
    if (libro.prologo) {
        lista.push({
            tipo: 'Prólogo',
            subtitulo: 'Introducción del Manuscrito',
            contenido: Array.isArray(libro.prologo) ? libro.prologo : [libro.prologo]
        });
    }

    // 3. Estructura organizada por "partes" (como en metatron.json)
    if (libro.partes && Array.isArray(libro.partes)) {
        libro.partes.forEach(parte => {
            if (parte.capitulos && Array.isArray(parte.capitulos)) {
                parte.capitulos.forEach(cap => {
                    let fuenteContenido = cap.texto || cap.contenido || [];
                    let parrafosRaw = Array.isArray(fuenteContenido) ? fuenteContenido : [fuenteContenido];
                    let parrafosLimpios = parrafosRaw.filter(p => p !== null && p !== undefined);
                    lista.push({
                        tipo: parte.nombre || 'Capítulo',
                        subtitulo: cap.titulo || `Capítulo ${cap.numero || ''}`,
                        contenido: parrafosLimpios,
                        imagenIlustracion: cap.imagen || cap.image
                    });
                });
            }
        });
    }

    // 4. Estructura con "capitulos" en la raíz (sin partes)
    if (libro.capitulos && Array.isArray(libro.capitulos)) {
        libro.capitulos.forEach((cap, idx) => {
            let fuenteContenido = cap.texto || cap.contenido || [];
            let parrafosRaw = Array.isArray(fuenteContenido) ? fuenteContenido : [fuenteContenido];
            let parrafosLimpios = parrafosRaw.filter(p => p !== null && p !== undefined);
            lista.push({
                tipo: `Capítulo ${idx + 1}`,
                subtitulo: cap.titulo || cap.nombre || `CAPÍTULO ${idx + 1}`,
                contenido: parrafosLimpios,
                imagenIlustracion: cap.imagen || cap.image
            });
        });
    }

    // 5. Estructura con "bloques"
    if (libro.bloques && Array.isArray(libro.bloques)) {
        return libro.bloques;
    }

    // 6. Estructura con "paginas"
    if (libro.paginas && Array.isArray(libro.paginas)) {
        libro.paginas.forEach((pag, idx) => {
            let fuenteContenido = pag.texto || pag.contenido || [];
            let parrafosRaw = Array.isArray(fuenteContenido) ? fuenteContenido : [fuenteContenido];
            let parrafosLimpios = parrafosRaw.filter(p => p !== null && p !== undefined);
            lista.push({
                tipo: `Página ${idx + 1}`,
                subtitulo: pag.titulo || pag.nombre || `PÁGINA ${idx + 1}`,
                contenido: parrafosLimpios,
                imagenIlustracion: pag.imagen || pag.image
            });
        });
    }

    // 7. Apéndice
    if (libro.apendice && (typeof libro.apendice === 'string' ? libro.apendice.trim() !== '' : true)) {
        lista.push({
            tipo: 'Apéndice',
            subtitulo: 'Datos Técnicos Estructurales',
            contenido: Array.isArray(libro.apendice) ? libro.apendice : [libro.apendice]
        });
    }

    // 8. Nota Final
    if (libro.nota_final && (typeof libro.nota_final === 'string' ? libro.nota_final.trim() !== '' : true)) {
        lista.push({
            tipo: 'Nota Final',
            subtitulo: 'Consideraciones de Clausura',
            contenido: Array.isArray(libro.nota_final) ? libro.nota_final : [libro.nota_final]
        });
    }

    // 9. Fallback para manuscritos en texto plano
    if (lista.length === 0 || (lista.length === 1 && lista[0].esPortada)) {
        let textoRaw = libro.contenido || libro.texto || libro.descripcion || [];
        let lineas = Array.isArray(textoRaw) ? textoRaw : [textoRaw];
        if (lineas.length > 0 && lineas[0] !== '') {
            lista.push({
                tipo: "Lectura",
                subtitulo: libro.titulo || "Manuscrito",
                contenido: lineas
            });
        }
    }

    return lista;
}

async function cargarBibliotecaDesdeGitHub() {
    if (!window.db || !window.getDocs || !window.collection) {
        retriesCargaBiblioteca++;
        if (retriesCargaBiblioteca <= MAX_RETRIES_FIREBASE) {
            console.warn(`Firestore aún no está inicializado (Intento ${retriesCargaBiblioteca}/${MAX_RETRIES_FIREBASE}). Reintentando...`);
            setTimeout(cargarBibliotecaDesdeGitHub, 300);
        } else {
            console.error("No se pudo inicializar Firestore después de múltiples intentos.");
            if (typeof gridView !== 'undefined' && gridView) {
                gridView.innerHTML = `<div class="empty-state">No se pudo conectar con Firebase. Revisa tu conexión a internet o la configuración del SDK.</div>`;
            }
        }
        return;
    }

    retriesCargaBiblioteca = 0;

    try {
        const fetchPromise = window.getDocs(window.collection(window.db, "libros"));
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Timeout de conexión al consultar libros en Firestore")), 6000)
        );

        const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]);
        biblioteca = [];
        
        querySnapshot.forEach((docSnap) => {
            const datos = docSnap.data();
            if (datos.titulo) {
                if (datos.fechaSubida && typeof datos.fechaSubida.toDate === 'function') {
                    datos.fechaSubida = datos.fechaSubida.toDate();
                } else if (datos.fechaSubida) {
                    datos.fechaSubida = new Date(datos.fechaSubida);
                } else {
                    datos.fechaSubida = new Date(0);
                }
                biblioteca.push(datos);
            }
        });
        biblioteca.sort((a, b) => b.fechaSubida - a.fechaSubida);
        renderizarGaleria();
    } catch (error) {
        console.error("Error al cargar manuscritos de Firestore:", error);
        if (typeof gridView !== 'undefined' && gridView) {
            gridView.innerHTML = `<div class="empty-state">Error de conexión con Firestore: ${error.message}. Revisa que las Reglas de Seguridad en Firebase permitan la lectura pública de la colección "libros".</div>`;
        }
    }
}

async function cargarNoticiasDesdeGitHub() {
    if (!window.db || !window.getDocs || !window.collection) return;
    try {
        const querySnapshot = await window.getDocs(window.collection(window.db, "noticias"));
        noticias = [];
        querySnapshot.forEach((docSnap) => {
            const datos = docSnap.data();
            if (datos.titulo) noticias.push(datos);
        });
        noticias.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
    } catch (error) {
        console.error("Error cargando noticias:", error);
    }
}

// Escuchar evento directo de inicialización de Firebase
window.addEventListener('firebase-ready', () => {
    cargarBibliotecaDesdeGitHub();
    cargarNoticiasDesdeGitHub();
});

function abrirLibro(index) {
    libroActual = biblioteca[index];
    if (typeof cerrarBuscadorLimpio === 'function') cerrarBuscadorLimpio();
    
    // Ocultar banner publicitario superior durante la lectura
    const headerAd = document.querySelector('.adsense-slot-header');
    if (headerAd) headerAd.style.display = 'none';
    if (libroActual.esLibrojuego || libroActual.secciones) {
        abrirLibrojuego(libroActual);
        return;
    }
    
    bloquesLectura = mapearBloquesLibro(libroActual);
    if (bloquesLectura.length === 0) {
        alert('El manuscrito no posee una estructura compatible.');
        return;
    }
    
    const progresos = obtenerProgresoGuardado();
    indiceBloqueActual = progresos[libroActual.titulo] || 0;
    if (indiceBloqueActual >= bloquesLectura.length) {
        indiceBloqueActual = 0;
    }
    
    gridView.style.display = 'none';
    favoritesView.style.display = 'none';
    usuarioView.style.display = 'none';
    tiendaView.style.display = 'none';
    if (document.getElementById('newsView')) document.getElementById('newsView').style.display = 'none';
    
    navView.style.display = 'none';
    readerView.style.display = 'block';
    document.getElementById('normalReaderNav').style.display = 'table';
    document.getElementById('gamebookReaderNav').style.display = 'none';
    uploadContainer.style.display = 'none';
    backContainer.style.display = 'table-cell';
    renderizarBloqueLectura();
}

function irBloqueAnterior() {
    if (libroActual && (libroActual.esLibrojuego || libroActual.secciones)) return;
    if (indiceBloqueActual > 0) {
        indiceBloqueActual--;
        renderizarBloqueLectura();
    }
}

function irBloqueSiguiente() {
    if (libroActual && (libroActual.esLibrojuego || libroActual.secciones)) return;
    if (indiceBloqueActual < bloquesLectura.length - 1) {
        indiceBloqueActual++;
        renderizarBloqueLectura();
    }
}

async function cargarTiendaDesdeGitHub() {
    const grid = document.getElementById('tiendaBooksGrid');
    if (tiendaLibros.length > 0) {
        renderizarTiendaFiltros();
        renderizarTiendaLibros();
        return;
    }
    
    try {
        const res = await fetch(TIENDA_JSON_URL);
        if (!res.ok) throw new Error(`HTTP Status ${res.status}`);
        const data = await res.json();
        
        tiendaColecciones = data.collections || [];
        tiendaLibros = data.books || [];
        
        renderizarTiendaFiltros();
        renderizarTiendaLibros();
    } catch (err) {
        console.error("Fallo descargando catálogo comercial de la tienda:", err);
        if (grid) grid.innerHTML = `<div class="empty-state">Error cargando inventario comercial: ${err.message}</div>`;
    }
}

function renderizarTiendaFiltros() {
    const container = document.getElementById('tiendaCollectionsList');
    if (!container) return;
    container.innerHTML = '';
    
    let html = `<button class="tienda-chip ${tiendaColeccionSeleccionada === 'all' ? 'is-active' : ''}" onclick="filtrarTiendaColeccion('all')">Todas (${tiendaLibros.length})</button>`;
    
    tiendaColecciones.forEach(col => {
        const count = tiendaLibros.filter(b => b.collection === col).length;
        html += `<button class="tienda-chip ${tiendaColeccionSeleccionada === col ? 'is-active' : ''}" onclick="filtrarTiendaColeccion('${col.replace(/'/g, "\\'")}')">${col} (${count})</button>`;
    });
    container.innerHTML = html;
}

function filtrarTiendaColeccion(col) {
    tiendaColeccionSeleccionada = col;
    renderizarTiendaFiltros();
    renderizarTiendaLibros();
}

function renderizarTiendaLibros() {
    const grid = document.getElementById('tiendaBooksGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const filtroBuscador = typeof inputBuscar !== 'undefined' && inputBuscar ? inputBuscar.value.trim().toLowerCase() : '';
    
    let librosFiltrados = tiendaLibros;
    if (tiendaColeccionSeleccionada !== 'all') {
        librosFiltrados = librosFiltrados.filter(b => b.collection === tiendaColeccionSeleccionada);
    }
    
    if (filtroBuscador) {
        librosFiltrados = librosFiltrados.filter(b => 
            (b.title && b.title.toLowerCase().includes(filtroBuscador)) ||
            (b.description && b.description.toLowerCase().includes(filtroBuscador)) ||
            (b.collection && b.collection.toLowerCase().includes(filtroBuscador))
        );
    }
    
    if (librosFiltrados.length === 0) {
        grid.innerHTML = '<div class="empty-state">No se localizaron obras comerciales con los filtros activos.</div>';
        return;
    }
    
    let htmlBuffer = '';
    librosFiltrados.forEach((libro) => {
        let imgSrc = '';
        if (libro.image) {
            imgSrc = libro.image.startsWith('http') ? libro.image : (libro.image.startsWith('imagenes/') ? `${TIENDA_IMAGENES_BASE_URL}${libro.image}` : `${TIENDA_IMAGENES_BASE_URL}imagenes/${libro.image}`);
        }
        
        const autores = Array.isArray(libro.authors) ? libro.authors.join(', ') : (libro.authors || 'Autor');
        const renderPortada = imgSrc ? `<img src="${imgSrc}" class="book-cover-thumbnail" alt="${libro.title}">` : `<div class="book-cover-thumbnail" style="display:flex; align-items:center; justify-content:center; background:#e5e5e5;"><span style="font-size:0.5rem; color:#888;">${libro.title.substring(0,2).toUpperCase()}</span></div>`;
        
        htmlBuffer += `
            <div class="book-card" onclick="verDetallesTienda(${libro.id})">
                <div class="book-cover-container">
                    ${renderPortada}
                </div>
                <div class="tienda-badge">${libro.collection}</div>
                <div class="card-title">${libro.title}</div>
                <span class="card-authors">${autores}</span>
            </div>
        `;
    });
    grid.innerHTML = htmlBuffer;
}

function verDetallesTienda(id) {
    const libro = tiendaLibros.find(b => b.id === id);
    if (!libro) return;
    
    const modal = document.getElementById('tiendaModal');
    const content = document.getElementById('tiendaModalContent');
    
    let imgSrc = '';
    if (libro.image) {
        imgSrc = libro.image.startsWith('http') ? libro.image : (libro.image.startsWith('imagenes/') ? `${TIENDA_IMAGENES_BASE_URL}${libro.image}` : `${TIENDA_IMAGENES_BASE_URL}imagenes/${libro.image}`);
    }
    
    const autores = Array.isArray(libro.authors) ? libro.authors.join(', ') : (libro.authors || 'Autor');
    const descripcion = libro.description || "Esta obra de arte digital no posee una sinopsis descriptiva todavía.";
    
    let htmlBotonCompra = '';
    if (libro.links && libro.links.length > 0) {
        libro.links.forEach(link => {
            htmlBotonCompra += `
                <button class="gamebook-choice-btn" style="margin-top:12px; border-color:rgb(131,0,0); text-align:center; background:rgb(131,0,0); color:#fff;" onclick="window.open('${link.url}', '_blank')">
                    ADQUIRIR EN ${link.name.toUpperCase()}
                </button>
            `;
        });
    }
    
    content.innerHTML = `
        <div style="text-align: right; margin-bottom: 24px;">
            <button class="btn" style="color:#aaaaaa;" onclick="document.getElementById('tiendaModal').style.display='none'">Cerrar Ficha</button>
        </div>
        ${imgSrc ? `<div class="reader-image-container"><img src="${imgSrc}" class="reader-inline-image" style="max-height:40vh; object-fit:contain; margin:0 auto;"/></div>` : ''}
        <h2 style="color:#ffffff; margin-top:16px;">${libro.title}</h2>
        <h3 style="color:var(--text-muted); margin-bottom:16px;">Colección: ${libro.collection} &middot; por ${autores}</h3>
        <p style="color:#cccccc; text-align:justify; font-size:0.9rem; line-height:1.6;">${descripcion}</p>
        
        ${libro.countries && libro.countries.length > 0 ? `
            <h4 style="color:#ffffff; font-size:0.75rem;">Regiones Disponibles</h4>
            <ul style="color:#cccccc;">
                ${libro.countries.map(c => `<li>${c}</li>`).join('')}
            </ul>
        ` : ''}
        
        ${libro.keywords && libro.keywords.length > 0 ? `
            <h4 style="color:#ffffff; font-size:0.75rem;">Palabras Clave</h4>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:20px;">
                ${libro.keywords.map(k => `<span style="font-size:0.55rem; background:#222; padding:4px 8px; text-transform:uppercase;">#${k}</span>`).join('')}
            </div>
        ` : ''}
        
        ${htmlBotonCompra}
    `;
    
    modal.style.display = 'block';
}