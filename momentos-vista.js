// =======================================================================
//  VISTA - LÓGICA DE ZOOM, PAN Y PREVISUALIZACIÓN DE CONEXIONES
// =======================================================================

/**
 * Aplica la transformación de escala (zoom) al lienzo.
 */
function applyTransform() {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return;
    const wrapper = document.getElementById('momentos-lienzo-wrapper');

    lienzo.style.transform = `scale(${canvasState.scale})`;

    // Aplica clases para cambiar el nivel de detalle según el zoom
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

/**
 * Realiza zoom hacia adentro o afuera.
 * @param {number} direction - 1 para acercar, -1 para alejar.
 */
function zoom(direction) {
    const newZoomIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentZoomIndex + direction));
    if (newZoomIndex === currentZoomIndex) return;
    
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    if (!wrapper) return;

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

/**
 * Inicia el paneo del lienzo.
 */
function startPan(e) {
    if (e.target.closest('.momento-nodo')) return; // Deja que makeDraggable lo maneje

    canvasState.panning = true;
    canvasState.lastX = e.clientX;
    canvasState.lastY = e.clientY;
    e.currentTarget.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
}

/**
 * Ejecuta el paneo del lienzo.
 */
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

/**
 * Finaliza el paneo del lienzo.
 */
function endPan(e) {
    if (canvasState.panning) {
        canvasState.panning = false;
        e.currentTarget.style.cursor = 'default';
        document.body.style.cursor = 'default';
    }
}

/**
 * Centra la vista del lienzo en un nodo específico.
 * @param {HTMLElement} nodoElement - El elemento del nodo a centrar.
 */
function centrarVistaEnNodo(nodoElement) {
    const wrapper = document.getElementById('momentos-lienzo-wrapper');
    if (!wrapper || !nodoElement) return;

    const nodoX = parseFloat(nodoElement.style.left || 0);
    const nodoY = parseFloat(nodoElement.style.top || 0);

    const scrollToX = (nodoX + NODE_SIZE / 2) * canvasState.scale - wrapper.clientWidth / 2;
    const scrollToY = (nodoY + NODE_SIZE / 2) * canvasState.scale - wrapper.clientHeight / 2;
    
    wrapper.scrollTo({ left: scrollToX, top: scrollToY, behavior: 'smooth' });
}


// --- FUNCIONES PARA PREVISUALIZACIÓN DE CONEXIONES ---

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
/**
 * Vuelve a dibujar todas las conexiones. Es útil después de cargar un proyecto.
 */
function redibujarTodasLasConexiones() {
    // Solo dibuja las conexiones si la previsualización está activa.
    
        dibujarConexiones();
  
}