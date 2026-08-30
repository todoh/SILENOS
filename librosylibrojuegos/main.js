// Estado global del ciclo de vida de la aplicación
let biblioteca = [];
let noticias = [];
let libroActual = null;
let indiceBloqueActual = 0;
let bloquesLectura = [];
let mapaImagenes = {}; // Almacenará las URLs de GitHub indexadas por el nombre del archivo
let idiomaActual = 'ES'; // Idioma global por defecto para el filtrado de manuscritos
let filtrarSoloGamebooks = false; // Bandera de control para aislar librojuegos en las vistas

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

async function cargarBibliotecaDesdeGitHub() {
    try {
        const respuesta = await fetch(API_URL);
        if (!respuesta.ok) {
            throw new Error(`Error del servidor GitHub: ${respuesta.status}`);
        }
        
        const archivos = await respuesta.json();
        if (!Array.isArray(archivos)) return;
        biblioteca = [];
        mapaImagenes = {};
        
        // 1. Mapeamos las imágenes del repositorio con sus respectivas URLs remotas de producción
        archivos.forEach(archivo => {
            const nombre = archivo.name;
            const extension = nombre.substring(nombre.lastIndexOf('.')).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(extension)) {
                mapaImagenes[nombre] = `${RAW_BASE_URL}${nombre}`;
            }
        });
        
        // 2. Filtramos los manuscritos structured en formato JSON
        const archivosJson = archivos.filter(archivo => {
            const nombre = archivo.name.toLowerCase();
            return nombre.endsWith('.json') && nombre !== 'package.json';
        });
        
        if (archivosJson.length === 0) {
            gridView.innerHTML = '<div class="empty-state">Error: No se detectaron archivos .json de manuscritos en el repositorio.</div>';
            return;
        }
        
        // Extensiones de imagen soportadas ordenadas por prioridad de emparejamiento
        const extensionesImagen = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
        
        // Limpiar el contenedor de carga inicial para prepararlo para la inserción incremental
        gridView.innerHTML = '';

        // 3. Procesamiento paralelo y renderizado incremental de los JSONs
        const promesasCarga = archivosJson.map(async (archivo) => {
            try {
                const urlJson = `${RAW_BASE_URL}${archivo.name}`;
                const resJson = await fetch(urlJson);
                if (!resJson.ok) return;
                
                const datos = await resJson.json();
                const nombreBase = archivo.name.substring(0, archivo.name.lastIndexOf('.'));
                let portadaEncontrada = null;
                
                // Buscamos si existe un archivo de imagen en el repositorio con el mismo nombre base
                for (const ext of extensionesImagen) {
                    const nombreArchivoImagen = `${nombreBase}${ext}`;
                    if (mapaImagenes[nombreArchivoImagen]) {
                        portadaEncontrada = mapaImagenes[nombreArchivoImagen];
                        break;
                    } else {
                        const coincidenciaCiega = Object.keys(mapaImagenes).find(k => k.toLowerCase() === nombreArchivoImagen.toLowerCase());
                        if (coincidenciaCiega) {
                            portadaEncontrada = mapaImagenes[coincidenciaCiega];
                            break;
                        }
                    }
                }
                
                if (portadaEncontrada) {
                    datos.portada = portadaEncontrada;
                } else {
                    datos.portada = null;
                }
                
                delete datos.imagen;
                
                if (!datos.titulo && datos.metadatos && datos.metadatos.titulo) {
                    datos.titulo = datos.metadatos.titulo;
                }
                if (!datos.autores && datos.metadatos && datos.metadatos.autores) {
                    datos.autores = datos.metadatos.autores;
                }
                
                if (datos.titulo) {
                    biblioteca.push(datos);
                    // Ordenación reactiva e incremental por orden alfabético
                    biblioteca.sort((a, b) => a.titulo.localeCompare(b.titulo));
                    // Forzar el renderizado en tiempo real a medida que llega el manuscrito
                    renderizarGaleria();
                }
            } catch (err) {
                console.error(`Error al procesar el archivo remoto ${archivo.name}: ${err.message}`);
            }
        });

        // Esperamos a que terminen todas las peticiones concurrentes en segundo plano
        await Promise.all(promesasCarga);

        if (biblioteca.length === 0) {
            gridView.innerHTML = '<div class="empty-state">Error: Ninguno de los archivos .json analizados contenía una estructura válida.</div>';
        }
    } catch (error) {
        console.error("Error crítico durante la carga remota:", error);
        gridView.innerHTML = `<div class="empty-state">Error al conectar con GitHub: ${error.message}. Verifica la conexión.</div>`;
    }
}

function abrirLibro(index) {
    libroActual = biblioteca[index];
    cerrarBuscadorLimpio();
    
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

async function cargarNoticiasDesdeGitHub() {
    try {
        const respuesta = await fetch(NOTICIAS_API_URL);
        if (!respuesta.ok) {
            throw new Error(`Error al conectar con la carpeta de noticias de GitHub: ${respuesta.status}`);
        }
        
        const archivos = await respuesta.json();
        if (!Array.isArray(archivos)) return;
        noticias = [];
        
        const archivosJson = archivos.filter(archivo => {
            const nombre = archivo.name.toLowerCase();
            return nombre.endsWith('.json');
        });
        
        for (const archivo of archivosJson) {
            try {
                const urlJson = `${NOTICIAS_RAW_BASE_URL}${archivo.name}`;
                const resJson = await fetch(urlJson);
                if (!resJson.ok) continue;
                
                const datos = await resJson.json();
                if (datos.titulo) {
                    if (datos.imagenes && Array.isArray(datos.imagenes)) {
                        datos.imagenes = datos.imagenes.map(img => {
                            if (img.startsWith('http') || img.startsWith('data:')) return img;
                            return `${NOTICIAS_RAW_BASE_URL}${img}`;
                        });
                    }
                    noticias.push(datos);
                }
            } catch (err) {
                console.error(`Error al procesar la noticia remota ${archivo.name}: ${err.message}`);
            }
        }
        
        noticias.sort((a, b) => {
            const fechaA = new Date(a.fecha || 0);
            const fechaB = new Date(b.fecha || 0);
            return fechaB - fechaA;
        });
    } catch (error) {
        console.error("Error crítico durante la carga asíncrona de noticias:", error);
    }
}

/* LÓGICA EXCLUSIVA DEL MOTOR DE LA TIENDA DE SILENOS */
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
        grid.innerHTML = `<div class="empty-state">Error cargando inventario comercial: ${err.message}</div>`;
    }
}

function renderizarTiendaFiltros() {
    const container = document.getElementById('tiendaCollectionsList');
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
    grid.innerHTML = '';
    
    const filtroBuscador = inputBuscar.value.trim().toLowerCase();
    
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
    librosFiltrados.forEach((libro, idx) => {
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