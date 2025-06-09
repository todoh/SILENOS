// ===================================
// GESTIÓN DE LA SECCIÓN DE MOMENTOS
// ===================================

const NODE_SIZE = 150;
const NODE_GAP = 60; // Aumentado para más espacio
const EXPANSION_MARGIN = 300; // Margen para expandir el lienzo
const EXPANSION_AMOUNT = 1000; // Cuánto se expande el lienzo
let nodoSiendoEditado = null;
let previsualizacionActiva = false;

// --- NUEVO: Estado para el Pan y Zoom ---
const canvasState = {
    scale: 1,
    panning: false,
    lastX: 0,
    lastY: 0,
};
const ZOOM_LEVELS = [0.25, 0.5, 1.0, 1.5];
let currentZoomIndex = 2; // Índice para ZOOM_LEVELS (1.0)


/**
 * Inicializa los listeners y componentes de la sección Momentos.
 */
function initMomentos() {
    document.getElementById('agregar-momento-btn')?.addEventListener('click', agregarMomento);
    document.getElementById('boton-agregar-accion')?.addEventListener('click', agregarAccion);
    document.getElementById('generar-aventura-ia-btn')?.addEventListener('click', generarAventuraConIA);
    document.getElementById('preview-connections-btn')?.addEventListener('click', alternarPrevisualizacionConexiones);
    
    // --- NUEVO: Listeners para Zoom ---
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoom(1));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoom(-1));

    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    // Se elimina el listener de la rueda del ratón para el zoom, según la petición anterior.
    wrapper?.addEventListener('mousedown', startPan);
    wrapper?.addEventListener('mousemove', pan);
    wrapper?.addEventListener('mouseup', endPan);
    wrapper?.addEventListener('mouseleave', endPan);


    const dropZone = document.getElementById('momento-editor-drop-zone');
    const fileInput = document.getElementById('momento-editor-file-input');
    const handleFileSelection = (e) => {
        e.preventDefault();
        const files = e.dataTransfer ? e.dataTransfer.files : e.target.files;
        if (files.length) handleFileSelect(files[0]);
    };
    dropZone?.addEventListener('click', () => fileInput.click());
    dropZone?.addEventListener('dragover', (e) => e.preventDefault());
    dropZone?.addEventListener('drop', handleFileSelection);
    fileInput?.addEventListener('change', handleFileSelection);
}


/**
 * Agrega un nuevo nodo (momento) al lienzo, centrado en la vista actual.
 */
function agregarMomento() {
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    if (!wrapper) return;

    const lienzo = document.getElementById('momentos-lienzo');
    const nodoId = `momento_${Date.now()}`;
    
    // Convertir el centro de la vista a coordenadas del lienzo (considerando el zoom)
    const centerX = (wrapper.scrollLeft + wrapper.clientWidth / 2) / canvasState.scale;
    const centerY = (wrapper.scrollTop + wrapper.clientHeight / 2) / canvasState.scale;

    crearNodoEnLienzo({
        id: nodoId,
        titulo: `Momento ${lienzo.querySelectorAll('.momento-nodo').length + 1}`,
        descripcion: "",
        x: Math.round(centerX - NODE_SIZE / 2),
        y: Math.round(centerY - NODE_SIZE / 2),
        imagen: "",
        acciones: []
    });
}


/**
 * Abre el modal para editar un nodo específico.
 */
function abrirModalEditarMomento(nodo) {
    nodoSiendoEditado = nodo;
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-editar-momento');

    document.getElementById('momento-editor-titulo').value = nodo.querySelector('.momento-titulo').textContent;
    document.getElementById('momento-editor-descripcion').value = nodo.dataset.descripcion || '';
    
    const preview = document.getElementById('momento-editor-imagen-preview');
    const imagenSrc = nodo.querySelector('.momento-imagen').src;
    if (imagenSrc && !imagenSrc.endsWith('/null') && !imagenSrc.includes('undefined')) {
        preview.src = imagenSrc;
        preview.style.display = 'block';
    } else {
        preview.src = '';
        preview.style.display = 'none';
    }

    const accionesContainer = document.getElementById('acciones-container');
    accionesContainer.innerHTML = '';
    const accionesData = JSON.parse(nodo.dataset.acciones || '[]');
    accionesData.forEach((accion, index) => {
        const accionDiv = crearElementoAccion(index + 1, accion.textoBoton, accion.idDestino);
        accionesContainer.appendChild(accionDiv);
    });

    if (overlay) {
        overlay.style.display = 'block';
        overlay.onclick = cerrarModalEditarMomento;
    }
    if (modal) modal.style.display = 'flex';
}

/**
 * Cierra el modal de edición de momentos.
 */
function cerrarModalEditarMomento() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-editar-momento');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.onclick = null;
    }
    if (modal) modal.style.display = 'none';
    
    document.getElementById('acciones-container').innerHTML = '';
    nodoSiendoEditado = null;
}

/**
 * Guarda los cambios del modal en el nodo correspondiente.
 */
function guardarCambiosMomento() {
    if (!nodoSiendoEditado) return;

    nodoSiendoEditado.querySelector('.momento-titulo').textContent = document.getElementById('momento-editor-titulo').value;
    nodoSiendoEditado.dataset.descripcion = document.getElementById('momento-editor-descripcion').value;

    const imagenNodo = nodoSiendoEditado.querySelector('.momento-imagen');
    const nuevaImagenSrc = document.getElementById('momento-editor-imagen-preview').src;
    if (nuevaImagenSrc && !nuevaImagenSrc.endsWith('/null') && nuevaImagenSrc.startsWith('data:image')) {
        imagenNodo.src = nuevaImagenSrc;
        imagenNodo.style.display = 'block';
        nodoSiendoEditado.classList.add('con-imagen');
    } else {
        imagenNodo.src = '';
        imagenNodo.style.display = 'none';
        nodoSiendoEditado.classList.remove('con-imagen');
    }

    const accionesItems = document.querySelectorAll('#acciones-container .accion-item');
    const accionesData = Array.from(accionesItems).map(item => ({
        textoBoton: item.querySelector('input[type="text"]').value,
        idDestino: item.querySelector('select.accion-destino-select').value
    })).filter(a => a.textoBoton && a.idDestino);
    
    nodoSiendoEditado.dataset.acciones = JSON.stringify(accionesData);
    
    cerrarModalEditarMomento();

    if (previsualizacionActiva) dibujarConexiones();
}

/**
 * Maneja la selección de un archivo de imagen y lo muestra en la vista previa.
 */
async function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const preview = document.getElementById('momento-editor-imagen-preview');
    preview.src = await fileToBase64(file);
    preview.style.display = 'block';
}

// --- LÓGICA PARA AÑADIR ACCIONES EN EL MODAL ---

function agregarAccion() {
    const accionesContainer = document.getElementById('acciones-container');
    if (accionesContainer.children.length >= 5) {
        alert("Se puede añadir un máximo de 5 acciones por momento.");
        return;
    }
    const nuevoNumero = accionesContainer.children.length + 1;
    accionesContainer.appendChild(crearElementoAccion(nuevoNumero));
}

/**
 * Crea el HTML para una acción (botón) en el modal de edición.
 */
function crearElementoAccion(numero, textoBoton = '', idDestino = '') {
    const accionDiv = document.createElement('div');
    accionDiv.className = 'accion-item';
    
    const textoInput = document.createElement('input');
    textoInput.type = 'text';
    textoInput.placeholder = `Texto del botón ${numero}`;
    textoInput.value = textoBoton;
    
    const selectDestino = document.createElement('select');
    selectDestino.className = 'accion-destino-select';
    selectDestino.innerHTML = '<option value="">Seleccionar destino...</option>';

    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(nodo => {
        if (nodo.id !== nodoSiendoEditado.id) {
            const option = document.createElement('option');
            option.value = nodo.id;
            option.textContent = nodo.querySelector('.momento-titulo').textContent.trim();
            selectDestino.appendChild(option);
        }
    });
    selectDestino.value = idDestino;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-accion-btn';
    deleteBtn.textContent = 'X';
    deleteBtn.title = 'Eliminar esta acción';
    deleteBtn.onclick = () => accionDiv.remove();
    
    accionDiv.append(textoInput, selectDestino, deleteBtn);
    return accionDiv;
}

/**
 * Hace que un elemento sea arrastrable y expande el lienzo si es necesario.
 */
function makeDraggable(element) {
    let isDragging = false;
    let initialX, initialY, initialLeft, initialTop;
    const lienzo = document.getElementById('momentos-lienzo');

    const onMouseDown = (e) => {
        if (e.target.isContentEditable || e.target.closest('.momento-btn, .btn-editar, .btn-eliminar, .marcador-inicio')) return;
        
        e.preventDefault();
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001; 

        initialLeft = element.offsetLeft;
        initialTop = element.offsetTop;
        initialX = e.pageX / canvasState.scale;
        initialY = e.pageY / canvasState.scale;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp, { once: true });
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const currentX = e.pageX / canvasState.scale;
        const currentY = e.pageY / canvasState.scale;
        const dx = currentX - initialX;
        const dy = currentY - initialY;
        
        let newLeft = Math.max(0, initialLeft + dx);
        let newTop = Math.max(0, initialTop + dy);

        // --- Lógica de Expansión del Lienzo ---
        let lienzoWidth = lienzo.offsetWidth;
        let lienzoHeight = lienzo.offsetHeight;

        if (newLeft + element.offsetWidth + EXPANSION_MARGIN > lienzoWidth) {
            lienzo.style.width = `${lienzoWidth + EXPANSION_AMOUNT}px`;
        }
        if (newTop + element.offsetHeight + EXPANSION_MARGIN > lienzoHeight) {
            lienzo.style.height = `${lienzoHeight + EXPANSION_AMOUNT}px`;
        }

        element.style.left = `${newLeft}px`;
        element.style.top = `${newTop}px`;
        element.dataset.x = newLeft;
        element.dataset.y = newTop;

        if (previsualizacionActiva) dibujarConexiones();
    };

    const onMouseUp = () => {
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1;
        document.removeEventListener('mousemove', onMouseMove);
    };

    element.addEventListener('mousedown', onMouseDown);
}


// =======================================================================
//  GENERACIÓN DE AVENTURA CON IA
// =======================================================================
function marcarComoInicio(nodoId) {
    document.querySelectorAll('#momentos-lienzo .momento-nodo').forEach(n => n.classList.remove('inicio'));
    document.getElementById(nodoId)?.classList.add('inicio');
}

function centrarVistaEnNodo(nodoElement) {
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    if (!wrapper || !nodoElement) return;

    const nodoX = parseFloat(nodoElement.style.left || 0);
    const nodoY = parseFloat(nodoElement.style.top || 0);

    const scrollToX = (nodoX + NODE_SIZE / 2) * canvasState.scale - wrapper.clientWidth / 2;
    const scrollToY = (nodoY + NODE_SIZE / 2) * canvasState.scale - wrapper.clientHeight / 2;
    
    wrapper.scrollTo({ left: scrollToX, top: scrollToY, behavior: 'smooth' });
}


// EN EL ARCHIVO: momentos.js

// EN EL ARCHIVO: momentos.js
// REEMPLAZA LA FUNCIÓN EXISTENTE CON ESTA VERSIÓN

async function generarAventuraConIA() {
    // --- INICIO DE LA INTEGRACIÓN DE LA BARRA DE PROGRESO ---
    if (progressBarManager.isActive) {
        alert("Ya hay un proceso de IA en ejecución. Por favor, espera a que termine.");
        return;
    }
    progressBarManager.start('Iniciando Aventura...');
    // --- FIN DE LA INTEGRACIÓN ---

    const chatDiv = window.chatDiv || document.getElementById('chat');
    const tituloGuion = document.getElementById('guion-select').value;
    if (!tituloGuion) {
        progressBarManager.error("Selecciona un guion");
        return alert("Por favor, selecciona un guion.");
    }

    const capitulo = guionLiterarioData.find(g => g.titulo === tituloGuion);
    const contenido = capitulo ? _extraerTextoPlanoDeGuionHTML(capitulo.contenido) : '';
    if (!contenido) {
        progressBarManager.error("Guion vacío");
        return alert("El guion seleccionado está vacío.");
    }
    
    progressBarManager.set(10, 'Preparando prompt...');
    const prompt = `Eres un diseñador de juegos de ficción interactiva. Convierte el siguiente guion en una red de "momentos" JSON.
Guion:
---
${contenido}
---
Responde ÚNICAMENTE con un objeto JSON con una clave "momentos" que contenga un array de objetos. Cada objeto "momento" debe tener: "id" (temporal), "titulo", "descripcion", "acciones" (array de {"textoBoton", "idDestino"}), e "imagen" ("").`;

    try {
        progressBarManager.set(20, 'Consultando a la IA...');
        const respuestaJson = await llamarIAConFeedback(prompt, "Generando Aventura Interactiva", true);
        
        progressBarManager.set(50, 'IA respondió. Procesando...');
        if (!respuestaJson?.momentos?.length) throw new Error("La respuesta de la IA no tuvo el formato esperado.");

        const lienzo = document.getElementById('momentos-lienzo');
        let offsetX = 0;
        lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
            const rightEdge = parseFloat(nodo.style.left || 0) + nodo.offsetWidth;
            if (rightEdge > offsetX) offsetX = rightEdge;
        });
        if (offsetX > 0) offsetX += NODE_GAP * 2;

        const momentosData = respuestaJson.momentos;
        const idMap = new Map();
        const titulosExistentes = new Set();
        document.querySelectorAll('#momentos-lienzo .momento-titulo').forEach(tituloElem => {
            titulosExistentes.add(tituloElem.textContent.trim());
        });

        momentosData.forEach(datos => {
            let tituloOriginal = datos.titulo.trim();
            let tituloFinal = tituloOriginal;
            let contador = 2;
            while (titulosExistentes.has(tituloFinal)) {
                tituloFinal = `${tituloOriginal} (${contador})`;
                contador++;
            }
            datos.titulo = tituloFinal;
            titulosExistentes.add(tituloFinal);
        });

        progressBarManager.set(65, 'Creando momentos...');
        momentosData.forEach(datos => {
            const nuevoId = `momento_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            idMap.set(datos.id, nuevoId);
            crearNodoEnLienzo({ ...datos, id: nuevoId, acciones: [], x: 0, y: 0 });
        });
        
        progressBarManager.set(75, 'Conectando acciones...');
        momentosData.forEach(datos => {
            const nodo = document.getElementById(idMap.get(datos.id));
            if (!nodo) return;
            const accionesTraducidas = (datos.acciones || []).map(a => ({
                ...a,
                idDestino: idMap.get(a.idDestino)
            })).filter(a => a.idDestino);
            nodo.dataset.acciones = JSON.stringify(accionesTraducidas);
        });

        progressBarManager.set(85, 'Organizando lienzo...');
        organizarNodosEnLienzo(momentosData, idMap, offsetX);
        
        progressBarManager.set(95, 'Finalizando...');
        if (momentosData.length > 0 && !lienzo.querySelector('.momento-nodo.inicio')) {
            const primerId = idMap.get(momentosData[0].id);
            marcarComoInicio(primerId);
        }
        if (momentosData.length > 0) {
            const primerId = idMap.get(momentosData[0].id);
            setTimeout(() => centrarVistaEnNodo(document.getElementById(primerId)), 100);
        }

        progressBarManager.finish(); // ¡Proceso completado con éxito!
        alert("¡Nueva aventura añadida al lienzo con nombres únicos!");

    } catch (error) {
        console.error("Error generando aventura con IA:", error);
        progressBarManager.error('Error en la IA'); // Muestra error en la barra
        alert(`Ocurrió un error: ${error.message}`);
    }
}

function crearNodoEnLienzo(datos) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;

    const nuevoNodo = document.createElement('div');
    nuevoNodo.className = 'momento-nodo';
    nuevoNodo.id = datos.id;
    
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="true" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        <div class="momento-contenido">
             <img class="momento-imagen" src="" style="display: none;">
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
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || "[]");

    const imagenNodo = nuevoNodo.querySelector('.momento-imagen');
    if (datos.imagen) {
        imagenNodo.src = datos.imagen;
        imagenNodo.style.display = 'block';
        nuevoNodo.classList.add('con-imagen');
    }

    lienzo.appendChild(nuevoNodo);

    nuevoNodo.querySelector('.marcador-inicio').onclick = (e) => { e.stopPropagation(); marcarComoInicio(nuevoNodo.id); };
    nuevoNodo.querySelector('.btn-editar').onclick = () => abrirModalEditarMomento(nuevoNodo);
    nuevoNodo.querySelector('.btn-eliminar').onclick = () => {
        if (confirm('¿Eliminar este momento?')) {
            nuevoNodo.remove();
            if (previsualizacionActiva) dibujarConexiones();
        }
    };
    nuevoNodo.querySelector('.momento-titulo').addEventListener('mousedown', e => e.stopPropagation());
    
    makeDraggable(nuevoNodo);
    return nuevoNodo;
}

function _extraerTextoPlanoDeGuionHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// --- NUEVAS FUNCIONES PARA EL AUTO-LAYOUT ---

/**
 * Organiza los nodos en el lienzo usando un algoritmo de capas (BFS).
 * @param {Array} momentos - El array de datos de momentos de la IA.
 * @param {Map} idMap - El mapa que traduce IDs temporales de la IA a IDs reales del DOM.
 * @param {number} offsetX - El desplazamiento horizontal para colocar los nuevos nodos.
 */
function organizarNodosEnLienzo(momentos, idMap, offsetX = 0) {
    if (!momentos || momentos.length === 0) return;

    const adyacencias = new Map();
    const nodosEnEstaAventura = new Set();

    momentos.forEach(momento => {
        const idReal = idMap.get(momento.id);
        nodosEnEstaAventura.add(idReal);
        if (!adyacencias.has(idReal)) {
            adyacencias.set(idReal, []);
        }
        (momento.acciones || []).forEach(accion => {
            const idDestinoReal = idMap.get(accion.idDestino);
            if(idDestinoReal) {
                adyacencias.get(idReal).push(idDestinoReal);
            }
        });
    });

    const rootId = idMap.get(momentos[0].id);
    if (!rootId) return;

    const niveles = new Map();
    const visitados = new Set();
    const cola = [[rootId, 0]]; // [nodeId, nivel]
    
    visitados.add(rootId);

    // BFS para determinar niveles
    while(cola.length > 0) {
        const [nodoActualId, nivelActual] = cola.shift();
        niveles.set(nodoActualId, nivelActual);

        const hijos = adyacencias.get(nodoActualId) || [];
        hijos.forEach(hijoId => {
            if(!visitados.has(hijoId) && nodosEnEstaAventura.has(hijoId)) { // Solo visitar nodos de esta aventura
                visitados.add(hijoId);
                cola.push([hijoId, nivelActual + 1]);
            }
        });
    }
    
    nodosEnEstaAventura.forEach(nodeId => {
        if(!visitados.has(nodeId)){
             niveles.set(nodeId, 0); // Colocar nodos desconectados en el nivel 0
        }
    });

    const nodosPorNivel = new Map();
    niveles.forEach((nivel, id) => {
        if(!nodosPorNivel.has(nivel)) {
            nodosPorNivel.set(nivel, []);
        }
        nodosPorNivel.get(nivel).push(id);
    });

    const PADDING = 100;

    nodosPorNivel.forEach((nodosEnNivel, nivel) => {
        const x = offsetX + (nivel * (NODE_SIZE + NODE_GAP)) + PADDING;
        nodosEnNivel.forEach((nodoId, index) => {
            const y = index * (NODE_SIZE + NODE_GAP) + PADDING;
            const nodoElement = document.getElementById(nodoId);
            if (nodoElement) {
                nodoElement.style.left = `${x}px`;
                nodoElement.style.top = `${y}px`;
                nodoElement.dataset.x = x;
                nodoElement.dataset.y = y;
            }
        });
    });
    
    reajustarTamanioLienzo();
}


/**
 * Revisa las posiciones de todos los nodos y expande el lienzo si es necesario.
 */
function reajustarTamanioLienzo() {
    const lienzo = document.getElementById('momentos-lienzo');
    if(!lienzo) return;

    let maxX = 0;
    let maxY = 0;
    lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
        const x = parseFloat(nodo.style.left) + nodo.offsetWidth;
        const y = parseFloat(nodo.style.top) + nodo.offsetHeight;
        if(x > maxX) maxX = x;
        if(y > maxY) maxY = y;
    });

    const nuevoAncho = Math.max(lienzo.offsetWidth, maxX + EXPANSION_MARGIN);
    const nuevoAlto = Math.max(lienzo.offsetHeight, maxY + EXPANSION_MARGIN);
    
    lienzo.style.width = `${nuevoAncho}px`;
    lienzo.style.height = `${nuevoAlto}px`;
}


// =======================================================================
//  LÓGICA DE ZOOM Y PAN
// =======================================================================

function applyTransform() {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return;
    const wrapper = document.getElementById('momentos-lienzo-wrapper');


    lienzo.style.transform = `scale(${canvasState.scale})`;

    if (canvasState.scale < 0.4) {
        wrapper.classList.add('zoom-level-3');
        wrapper.classList.remove('zoom-level-2');
    } else if (canvasState.scale < 0.8) {
        wrapper.classList.add('zoom-level-2');
        wrapper.classList.remove('zoom-level-3');
    } else {
        wrapper.classList.remove('zoom-level-2');
        wrapper.classList.remove('zoom-level-3');
    }


    if (previsualizacionActiva) dibujarConexiones();
}

function zoom(direction) {
    const newZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIndex + direction));
    if (newZoomIndex === currentZoomIndex) return;
    
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    const lienzo = document.getElementById('momentos-lienzo');
    if (!wrapper || !lienzo) return;

    const oldScale = canvasState.scale;
    currentZoomIndex = newZoomIndex;
    canvasState.scale = ZOOM_LEVELS[currentZoomIndex];

    const mouseX = wrapper.clientWidth / 2;
    const mouseY = wrapper.clientHeight / 2;
    const newScrollX = (wrapper.scrollLeft + mouseX) * (canvasState.scale / oldScale) - mouseX;
    const newScrollY = (wrapper.scrollTop + mouseY) * (canvasState.scale / oldScale) - mouseY;

    applyTransform();
    wrapper.scrollLeft = newScrollX;
    wrapper.scrollTop = newScrollY;

    document.getElementById('zoom-level-indicator').textContent = `${Math.round(canvasState.scale * 100)}%`;
}

function handleWheelZoom(e) {
    // Esta función se mantiene por si se decide reactivarla, pero el listener está desactivado
    e.preventDefault();
    zoom(e.deltaY > 0 ? -1 : 1);
}

function startPan(e) {
    if (e.target.closest('.momento-nodo')) return;
    canvasState.panning = true;
    canvasState.lastX = e.clientX;
    canvasState.lastY = e.clientY;
    e.target.style.cursor = 'grabbing';
}

function pan(e) {
    if (!canvasState.panning) return;
    const dx = e.clientX - canvasState.lastX;
    const dy = e.clientY - canvasState.lastY;
    
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    wrapper.scrollLeft -= dx;
    wrapper.scrollTop -= dy;

    canvasState.lastX = e.clientX;
    canvasState.lastY = e.clientY;
}

function endPan(e) {
    canvasState.panning = false;
    e.target.style.cursor = 'grab';
}


// =======================================================================
//  FUNCIONES PARA PREVISUALIZACIÓN DE CONEXIONES (MODIFICADAS)
// =======================================================================

function getOrCreateSvgCanvas() {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return null;
    let svg = lienzo.querySelector('#connections-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'connections-svg';
        lienzo.insertBefore(svg, lienzo.firstChild);
    }
    return svg;
}

function alternarPrevisualizacionConexiones() {
    previsualizacionActiva = !previsualizacionActiva;
    const btn = document.getElementById('preview-connections-btn');
    if (previsualizacionActiva) {
        dibujarConexiones();
        if (btn) {
            btn.classList.add('active');
            btn.textContent = "Ocultar Conexiones";
        }
    } else {
        const svg = getOrCreateSvgCanvas();
        if (svg) svg.innerHTML = '';
        if (btn) {
            btn.classList.remove('active');
            btn.textContent = "Previsualizar Conexiones";
        }
    }
}

function dibujarConexiones() {
    const svg = getOrCreateSvgCanvas();
    const lienzo = document.getElementById('momentos-lienzo');
    if (!svg || !lienzo) return;

    svg.innerHTML = '';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto-start-reverse');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    marker.appendChild(path);
    defs.appendChild(marker);
    svg.appendChild(defs);

    lienzo.querySelectorAll('.momento-nodo').forEach(nodoInicial => {
        try {
            const acciones = JSON.parse(nodoInicial.dataset.acciones || '[]');
            acciones.forEach(accion => {
                const nodoFinal = document.getElementById(accion.idDestino);
                if (nodoFinal) {
                    const x1 = nodoInicial.offsetLeft + nodoInicial.offsetWidth / 2;
                    const y1 = nodoInicial.offsetTop + nodoInicial.offsetHeight / 2;
                    const x2 = nodoFinal.offsetLeft + nodoFinal.offsetWidth / 2;
                    const y2 = nodoFinal.offsetTop + nodoFinal.offsetHeight / 2;

                    const linea = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    linea.setAttribute('x1', String(x1));
                    linea.setAttribute('y1', String(y1));
                    linea.setAttribute('x2', String(x2));
                    linea.setAttribute('y2', String(y2));
                    linea.setAttribute('marker-end', 'url(#arrowhead)');
                    svg.appendChild(linea);
                }
            });
        } catch (e) {
            console.error(`Error procesando acciones para ${nodoInicial.id}:`, e);
        }
    });
}
