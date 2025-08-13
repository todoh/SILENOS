// ===================================
// NÚCLEO - GESTIÓN DE MOMENTOS
// ===================================

// --- Constantes y Estado Global ---
const NODE_SIZE = 150;
const NODE_GAP = 60;
const EXPANSION_MARGIN = 300;
const EXPANSION_AMOUNT = 1000;
let previsualizacionActiva = false;

const canvasState = {
    scale: 1,
    panning: false,
    lastX: 0,
    lastY: 0,
};
const ZOOM_LEVELS = [0.25, 0.5, 1.0, 1.5];
let currentZoomIndex = 2;


/**
 * Inicializa los listeners y componentes de la sección Momentos.
 * Llama a funciones que ahora pueden estar en otros archivos.
 */
function initMomentos() {
    // Listeners en botones principales
    document.getElementById('agregar-momento-btn')?.addEventListener('click', agregarMomento);
    document.getElementById('generar-aventura-ia-btn')?.addEventListener('click', abrirModalMomentosIA); // Modificado para abrir el modal
    document.getElementById('preview-connections-btn')?.addEventListener('click', alternarPrevisualizacionConexiones);

    // Listeners para Zoom (gestionados en momentos-vista.js)
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoom(1));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoom(-1));

    // Listeners para Pan (gestionados en momentos-vista.js)
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    wrapper?.addEventListener('mousedown', startPan);
    wrapper?.addEventListener('mousemove', pan);
    wrapper?.addEventListener('mouseup', endPan);
    wrapper?.addEventListener('mouseleave', endPan);
}

/**
 * Agrega un nuevo nodo (momento) al lienzo, centrado en la vista actual.
 */
function agregarMomento() {
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    if (!wrapper) return;

    const lienzo = document.getElementById('momentos-lienzo');
    const nodoId = `momento_${Date.now()}`;

    const centerX = (wrapper.scrollLeft + wrapper.clientWidth / 2) / canvasState.scale;
    const centerY = (wrapper.scrollTop + wrapper.clientHeight / 2) / canvasState.scale;

    const nuevoNodo = crearNodoEnLienzo({
        id: nodoId,
        titulo: `Momento ${lienzo.querySelectorAll('.momento-nodo').length + 1}`,
        descripcion: "",
        x: Math.round(centerX - NODE_SIZE / 2),
        y: Math.round(centerY - NODE_SIZE / 2),
        imagen: "",
        acciones: []
    });

    if (nuevoNodo) {
        seleccionarMomentoParaEdicion(nuevoNodo);
    }
}

/**
 * Crea el nodo visual en el lienzo.
 * @param {object} datos - Los datos del momento.
 * @returns {HTMLElement} El elemento del nodo creado.
 */
function crearNodoEnLienzo(datos) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;

    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = datos.id;
    
    // --- ESTRUCTURA HTML MODIFICADA ---
    // Se ha cambiado 'momento-contenido' para incluir un <img> (la futura imagen)
    // y un input de tipo 'file' oculto con su 'label' que actúa como botón.
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="false" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        
        <div class="momento-contenido">
            <img src="" alt="Fondo del momento" class="momento-imagen" />
            <label for="upload-${datos.id}" class="btn-cargar-imagen">
                <i class="fas fa-camera"></i> Cargar Imagen
            </label>
            <input type="file" id="upload-${datos.id}" class="input-imagen-oculto" accept="image/png, image/jpeg, image/gif, image/webp">
        </div>

        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    nuevoNodo.style.left = `${datos.x || 0}px`;
    nuevoNodo.style.top = `${datos.y || 0}px`;
    nuevoNodo.dataset.x = datos.x || 0;
    nuevoNodo.dataset.y = datos.y || 0;
    
    nuevoNodo.dataset.descripcion = datos.descripcion || "";
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || []);
    nuevoNodo.dataset.entorno = datos.entorno ? JSON.stringify(datos.entorno) : '{}';
    nuevoNodo.dataset.entidades = datos.entidades ? JSON.stringify(datos.entidades) : '[]';

    lienzo.appendChild(nuevoNodo);

    // --- LÓGICA NUEVA PARA CARGAR LA IMAGEN ---
    const inputImagen = nuevoNodo.querySelector(`#upload-${datos.id}`);
    const imgElement = nuevoNodo.querySelector('.momento-imagen');

    inputImagen.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                // El resultado es un DataURL (base64) que se puede usar como src
                // y que se guardará con el proyecto y se exportará.
                imgElement.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Listeners existentes (sin cambios) ---
    nuevoNodo.querySelector('.marcador-inicio').onclick = (e) => { e.stopPropagation(); marcarComoInicio(nuevoNodo.id); };
    nuevoNodo.querySelector('.btn-editar').onclick = (e) => { 
        e.stopPropagation();
        seleccionarMomentoParaEdicion(nuevoNodo); 
    };
    nuevoNodo.querySelector('.btn-eliminar').onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este momento?')) {
            if (nuevoNodo.classList.contains('momento-seleccionado')) {
                if (typeof ocultarPanelEdicion === 'function') ocultarPanelEdicion();
            }
            nuevoNodo.remove();
            if (previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
        }
    };
    
    makeDraggable(nuevoNodo);
    return nuevoNodo;
}

/**
 * Selecciona un momento para editarlo en el panel flotante.
 * @param {HTMLElement} nodo - El nodo del momento que se ha seleccionado.
 */
function seleccionarMomentoParaEdicion(nodo) {
    document.querySelector('.momento-nodo.momento-seleccionado')?.classList.remove('momento-seleccionado');
    nodo.classList.add('momento-seleccionado');

    if (typeof mostrarPanelEdicion === 'function') {
        mostrarPanelEdicion(nodo);
    } else {
        console.error("La función mostrarPanelEdicion no está definida. Asegúrate de que editor-momento.js está cargado.");
    }
}

/**
 * Hace que un elemento sea arrastrable y expande el lienzo si es necesario.
 */
function makeDraggable(element) {
    let isDragging = false;
    let initialX, initialY;
    let startLeft, startTop;
    const lienzo = document.getElementById('momentos-lienzo');
dibujarConexiones();
    const onMouseDown = (e) => {
        if (e.target.isContentEditable || e.target.closest('.btn-eliminar, .marcador-inicio, .btn-editar')) {
            if (e.target.closest('.btn-editar')) seleccionarMomentoParaEdicion(element);
            return;
        }

        seleccionarMomentoParaEdicion(element);
        
        e.preventDefault();
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001;
        element.style.transition = 'none'; 

        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
        initialX = e.pageX / canvasState.scale;
        initialY = e.pageY / canvasState.scale;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => { dibujarConexiones();
        if (!isDragging) return;
        
        const currentX = e.pageX / canvasState.scale;
        const currentY = e.pageY / canvasState.scale;
        const dx = currentX - initialX;
        const dy = currentY - initialY;
        
        element.style.transform = `translate(${dx}px, ${dy}px)`;
dibujarConexiones();
        let newLeft = Math.max(0, startLeft + dx);
        let newTop = Math.max(0, startTop + dy);
        let lienzoWidth = lienzo.offsetWidth;
        let lienzoHeight = lienzo.offsetHeight;

        if (newLeft + element.offsetWidth + EXPANSION_MARGIN > lienzoWidth) {
            lienzo.style.width = `${lienzoWidth + EXPANSION_AMOUNT}px`;
        }
        if (newTop + element.offsetHeight + EXPANSION_MARGIN > lienzoHeight) {
            lienzo.style.height = `${lienzoHeight + EXPANSION_AMOUNT}px`;
        }
    };

    const onMouseUp = (e) => {dibujarConexiones();
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1;
        element.style.transform = '';
        element.style.transition = '';

        const finalX = e.pageX / canvasState.scale;
        const finalY = e.pageY / canvasState.scale;
        const dx = finalX - initialX;
        const dy = finalY - initialY;

        let newLeft = Math.max(0, startLeft + dx);
        let newTop = Math.max(0, startTop + dy);

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.dataset.x = newLeft;
        element.dataset.y = newTop;

        document.removeEventListener('mousemove', onMouseMove);

        if (previsualizacionActiva && typeof dibujarConexiones === 'function') {
            dibujarConexiones();
        }
    };

    element.addEventListener('mousedown', onMouseDown);
}

/**
 * Marca un nodo como el inicio de la aventura.
 * @param {string} nodoId - El ID del nodo a marcar.
 */
function marcarComoInicio(nodoId) {
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(n => n.classList.remove('inicio'));
    document.getElementById(nodoId)?.classList.add('inicio');
}

/**
 * Extrae el texto plano del contenido HTML de un guion.
 * @param {string} html - El contenido HTML.
 * @returns {string} El texto plano.
 */
function _extraerTextoPlanoDeGuionHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

/**
 * Crea un nodo de momento en el lienzo a partir de datos guardados.
 * Es similar a crearNodoEnLienzo, pero usa datos existentes.
 * @param {object} datos - Los datos del momento guardados en el JSON.
 */
function crearMomentoEnLienzoDesdeDatos(datos) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;

    // Se crea el elemento del nodo
    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = datos.id;
    
    // Se rellena la estructura HTML
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="false" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        <div class="momento-contenido">
            <img src="" alt="Fondo del momento" class="momento-imagen" />
            <label for="upload-${datos.id}" class="btn-cargar-imagen">
                <i class="fas fa-camera"></i> Cargar Imagen
            </label>
            <input type="file" id="upload-${datos.id}" class="input-imagen-oculto" accept="image/png, image/jpeg, image/gif, image/webp">
        </div>
        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    // --- Se aplican los datos guardados ---
    nuevoNodo.style.left = `${datos.x || 0}px`;
    nuevoNodo.style.top = `${datos.y || 0}px`;
    nuevoNodo.dataset.x = datos.x || 0;
    nuevoNodo.dataset.y = datos.y || 0;
    
    nuevoNodo.dataset.descripcion = datos.descripcion || "";
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || []);
    
    // Estos se mantienen por compatibilidad.
    nuevoNodo.dataset.entorno = '{}';
    nuevoNodo.dataset.entidades = '[]';
    
    const imgElement = nuevoNodo.querySelector('.momento-imagen');

    // --- LÓGICA CLAVE CORREGIDA ---
    // 1. Priorizamos el SVG si existe en los datos cargados.
    if (datos.svgIlustracion && datos.svgIlustracion.trim() !== '') {
        // Guardamos el SVG crudo en el dataset para que todo lo demás funcione.
        nuevoNodo.dataset.svgIlustracion = datos.svgIlustracion;

        // Creamos un Data URL a partir del SVG para mostrarlo en la imagen.
        const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(datos.svgIlustracion)));
        imgElement.src = svgDataUrl;
        nuevoNodo.classList.add('con-imagen');
    } else if (datos.imagen) {
        // 2. Si no hay SVG, usamos la imagen PNG de fallback.
        imgElement.src = datos.imagen;
        nuevoNodo.classList.add('con-imagen');
    }
    // --- FIN DE LA CORRECCIÓN ---

    // Se añade el nodo al lienzo
    lienzo.appendChild(nuevoNodo);

    // --- Se vuelven a conectar todos los eventos ---
    const inputImagen = nuevoNodo.querySelector(`#upload-${datos.id}`);
    inputImagen.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                imgElement.src = event.target.result;
                // Al cargar una nueva imagen, borramos el SVG viejo si existía.
                delete nuevoNodo.dataset.svgIlustracion;
            };
            reader.readAsDataURL(file);
        }
    });

    nuevoNodo.querySelector('.marcador-inicio').onclick = (e) => { e.stopPropagation(); marcarComoInicio(nuevoNodo.id); };
    nuevoNodo.querySelector('.btn-editar').onclick = (e) => { e.stopPropagation(); seleccionarMomentoParaEdicion(nuevoNodo); };
    nuevoNodo.querySelector('.btn-eliminar').onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este momento?')) {
            if (nuevoNodo.classList.contains('momento-seleccionado')) {
                if (typeof ocultarPanelEdicion === 'function') ocultarPanelEdicion();
            }
            nuevoNodo.remove();
            if (previsualizacionActiva && typeof dibujarConexiones === 'function') dibujarConexiones();
        }
    };
    
    makeDraggable(nuevoNodo);
    
    return nuevoNodo;
}