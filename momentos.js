// ===================================
// GESTIÓN DE LA SECCIÓN DE MOMENTOS
// ===================================

const NODE_SIZE = 150;
const NODE_GAP = 60; // Aumentado para más espacio
const EXPANSION_MARGIN = 300; // Margen para expandir el lienzo
const EXPANSION_AMOUNT = 1000; // Cuánto se expande el lienzo
let previsualizacionActiva = false; // Hecho global para acceso desde editor-momento.js

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
    document.getElementById('generar-aventura-ia-btn')?.addEventListener('click', generarAventuraConIA);
    document.getElementById('preview-connections-btn')?.addEventListener('click', alternarPrevisualizacionConexiones);
    
    // --- Listeners para Zoom ---
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => zoom(1));
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => zoom(-1));

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
    
    // Convertir el centro de la vista a coordenadas del lienzo (considerando el zoom)
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

    // Seleccionar el nuevo momento para edición inmediata
    if (nuevoNodo) {
        seleccionarMomentoParaEdicion(nuevoNodo);
    }
}


/**
 * Selecciona un momento para editarlo en el panel flotante.
 * @param {HTMLElement} nodo - El nodo del momento que se ha seleccionado.
 */
function seleccionarMomentoParaEdicion(nodo) {
    // Deseleccionar cualquier otro nodo que estuviera seleccionado
    const nodoYaSeleccionado = document.querySelector('.momento-nodo.momento-seleccionado');
    if (nodoYaSeleccionado) {
        nodoYaSeleccionado.classList.remove('momento-seleccionado');
    }

    // Seleccionar el nuevo nodo
    nodo.classList.add('momento-seleccionado');

    // Mostrar el panel de edición con los datos de este nodo
    // Esta función ahora vive en editor-momento.js
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
    let initialX, initialY, initialLeft, initialTop;
    const lienzo = document.getElementById('momentos-lienzo');

    const onMouseDown = (e) => {
        // MODIFICADO: No iniciar arrastre si se hace clic en el botón de editar.
        if (e.target.isContentEditable || e.target.closest('.btn-eliminar, .marcador-inicio')) return;
        
        // Si se hace clic en el botón de editar, se selecciona, no se arrastra.
        if (e.target.closest('.btn-editar')) {
            seleccionarMomentoParaEdicion(element);
            return;
        }

        // Si se hace clic en cualquier otra parte del nodo, se selecciona Y se prepara para arrastrar.
        seleccionarMomentoParaEdicion(element);
        
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
/**
* Abre el modal de generación de IA para la sección Momentos.
 * Mueve los controles de IA desde la barra inferior al modal.
 */function abrirModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    const placeholder = document.getElementById('modal-ia-content-placeholder');

    if (!overlay || !modal || !placeholder) {
        console.error("No se encontraron los elementos necesarios para el modal de IA de Momentos.");
        return;
    }

    // Cargar los guiones disponibles en el dropdown del modal
    const guionSelectModal = document.getElementById('guion-select-modal');
    // Usamos el mismo nombre de función, pero ahora apunta al <select> del modal
    if (typeof cargarGuionesEnDropdown === 'function') {
        cargarGuionesEnDropdown(guionSelectModal); 
    }

    // Mostrar el modal
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalMomentosIA;

    // --- NUEVA LÓGICA DE LISTENERS ---
    const nodosInput = document.getElementById('ia-nodos-input');
    const finalesInput = document.getElementById('ia-finales-input');
    const densidadSlider = document.getElementById('ia-densidad-slider');
    const generarBtn = document.getElementById('generar-aventura-ia-btn-modal');
    
    // Añadir listeners para recalcular en tiempo real
    [nodosInput, finalesInput, densidadSlider].forEach(input => {
        input.addEventListener('input', actualizarCalculosAventuraIA);
    });
    
    // Listener para el botón de generar
    generarBtn.addEventListener('click', generarAventuraConIA);

    // Ejecutar cálculos iniciales al abrir el modal
    actualizarCalculosAventuraIA();
}

function actualizarCalculosAventuraIA() {
    const nodosInput = document.getElementById('ia-nodos-input');
    const finalesInput = document.getElementById('ia-finales-input');
    const densidadSlider = document.getElementById('ia-densidad-slider');
    const densidadLabel = document.getElementById('ia-densidad-label');
    const minNodosDisplay = document.getElementById('ia-min-nodos-display');
    const apiCallsDisplay = document.getElementById('ia-api-calls-display');
    const generarBtn = document.getElementById('generar-aventura-ia-btn-modal');

    const numNodos = parseInt(nodosInput.value);
    const numFinales = parseInt(finalesInput.value);
    const densidad = parseInt(densidadSlider.value);

    // Diccionario para la descripción de la densidad
    const densidadDesc = { 1: "Muy Lineal", 2: "Baja", 3: "Moderada", 4: "Alta", 5: "Muy Compleja" };
    densidadLabel.textContent = densidadDesc[densidad] || "Moderada";
    
    // Heurística para calcular nodos mínimos:
    // Se necesitan al menos N-1 bifurcaciones para N finales.
    // Cada final necesita su propio nodo.
    // La densidad añade complejidad.
    const minNodos = Math.ceil((numFinales * 1.5) + (densidad * 1.5));
    minNodosDisplay.textContent = `Nodos mínimos recomendados: ${minNodos}`;

    // Estimación de llamadas a la API:
    // 1 llamada para el plan general + 1 llamada por cada nodo para su detalle.
    const estimatedCalls = 1 + numNodos;
    apiCallsDisplay.textContent = `Peticiones a la API estimadas: ~${estimatedCalls}`;

    // Validar y habilitar/deshabilitar el botón de generación
    if (numNodos < minNodos) {
        generarBtn.disabled = true;
        nodosInput.style.borderColor = 'red';
        minNodosDisplay.style.color = 'red';
    } else {
        generarBtn.disabled = false;
        nodosInput.style.borderColor = '';
        minNodosDisplay.style.color = '';
    }
}


/**
 * Cierra el modal de generación de IA y devuelve los controles a su lugar original.
 */
function cerrarModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    const controlesFlotantes = document.getElementById('momentos-controles-flotantes');
    const controlesIA = document.getElementById('momentos-controles-ia');

    if (!overlay || !modal || !controlesFlotantes || !controlesIA) {
        return;
    }
    
    // Devolver los controles a su contenedor original en la barra flotante
    controlesFlotantes.appendChild(controlesIA);
        controlesIA.style.display = 'none';
    // Ocultar el modal
    overlay.style.display = 'none';
    modal.style.display = 'none';
    overlay.onclick = null;
}
// =======================================================================
//  GENERACIÓN DE AVENTURA CON IA (sin cambios)
// =======================================================================

// MODIFICACIÓN en la función existente generarAventuraConIA
async function generarAventuraConIA() {
    cerrarModalMomentosIA(); // Cerrar el modal para ver la barra de progreso
    if (progressBarManager.isActive) {
        alert("Ya hay un proceso de IA en ejecución. Por favor, espera a que termine.");
        return;
    }
    progressBarManager.start('Iniciando Aventura Interactiva...');

    // Recoger los valores de los controles del modal
    const guionSelect = document.getElementById('guion-select-modal');
    const tituloGuion = guionSelect.value;
    const numeroDeNodos = document.getElementById('ia-nodos-input').value;
    const numeroDeFinales = document.getElementById('ia-finales-input').value;
    const densidadValor = document.getElementById('ia-densidad-slider').value;
    const densidadDesc = { 1: "muy lineal", 2: "con pocas bifurcaciones", 3: "con ramificación moderada", 4: "muy ramificada", 5: "extremadamente compleja" }[densidadValor];

    if (!tituloGuion) {
        progressBarManager.error("Selecciona un guion");
        return alert("Por favor, selecciona un guion de referencia.");
    }
    const capitulo = guionLiterarioData.find(g => g.titulo === tituloGuion);
    const contenido = capitulo ? _extraerTextoPlanoDeGuionHTML(capitulo.contenido) : '';
    if (!contenido) {
        progressBarManager.error("Guion vacío");
        return alert("El guion seleccionado está vacío.");
    }
    
    progressBarManager.set(10, 'Preparando prompt maestro...');

    // El nuevo "Super-Prompt"
const prompt = `
        Eres un diseñador de juegos experto en ficción interactiva. Tu tarea es convertir el siguiente guion en una red de "momentos" interconectados para un videojuego.

        **Guion de Referencia:**
        ---
        ${contenido}
        ---

        **REQUISITOS ESTRUCTURALES OBLIGATORIOS:**
        1.  **Total de Momentos (Nodos):** La aventura debe tener exactamente ${numeroDeNodos} momentos en total.
        2.  **Número de Finales:** La historia debe conducir a exactamente ${numeroDeFinales} momentos finales distintos.
        3.  **Densidad de Ramificación:** La estructura debe ser ${densidadDesc}.

        **FORMATO DE RESPUESTA (MUY IMPORTANTE):**
        Responde ÚNICAMENTE con un objeto JSON válido. NO incluyas explicaciones, comentarios, ni marcadores de código como \`\`\`json.
        La estructura de cada objeto dentro del array "momentos" DEBE ser la siguiente, respetando las comas entre cada propiedad:
        {
          "id": "string (identificador único, ej: 'inicio')",
          "titulo": "string (título corto y descriptivo)",
          "descripcion": "string (texto narrativo detallado del momento)",
          "esFinal": boolean (true si es un final, de lo contrario false),
          "acciones": [
            {
              "textoBoton": "string (texto del botón de decisión)",
              "idDestino": "string (el 'id' del momento de destino)"
            }
          ]
        }

        Ejemplo de un objeto momento VÁLIDO:
        {"id": "cueva_oscura", "titulo": "La Cueva Oscura", "descripcion": "Entras en una cueva húmeda y oscura. Un eco resuena en la distancia.", "esFinal": false, "acciones": [{"textoBoton": "Encender antorcha", "idDestino": "cueva_iluminada"}, {"textoBoton": "Avanzar a ciegas", "idDestino": "tropiezo_fatal"}]}
    `;

    try {
        progressBarManager.set(20, 'Consultando a la IA...');
        // La función llamarIAConFeedback ya existe y es robusta, la reutilizamos.
        const respuestaJson = await llamarIAConFeedback(prompt, "Generando Red de Aventura Interactiva", true);
        
        progressBarManager.set(50, 'IA respondió. Procesando y creando momentos...');
        if (!respuestaJson?.momentos?.length) throw new Error("La respuesta de la IA no tuvo el formato de momentos esperado.");

        // El resto del código para crear los nodos y organizarlos es el mismo que ya tenías y funciona bien.
        // Lo incluimos aquí para completitud.
        const lienzo = document.getElementById('momentos-lienzo');
        let offsetX = 0;
        lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
            const rightEdge = parseFloat(nodo.style.left || 0) + nodo.offsetWidth;
            if (rightEdge > offsetX) offsetX = rightEdge;
        });
        if (offsetX > 0) offsetX += 150;

        const momentosData = respuestaJson.momentos;
        const idMap = new Map();
        
        momentosData.forEach(datos => {
            const nuevoId = `momento_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            idMap.set(datos.id, nuevoId); // Mapeamos el id temporal de la IA a nuestro id único
            crearNodoEnLienzo({ ...datos, id: nuevoId, acciones: [], x: 0, y: 0 });
        });
        
        progressBarManager.set(75, 'Conectando acciones y decisiones...');
        momentosData.forEach(datos => {
            const nodo = document.getElementById(idMap.get(datos.id));
            if (!nodo) return;
            const accionesTraducidas = (datos.acciones || []).map(a => ({
                ...a,
                idDestino: idMap.get(a.idDestino) // Usamos el mapa para obtener el id real
            })).filter(a => a.idDestino);
            nodo.dataset.acciones = JSON.stringify(accionesTraducidas);
        });

        progressBarManager.set(85, 'Organizando el lienzo...');
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

        progressBarManager.finish();
        alert("¡Nueva aventura añadida al lienzo con éxito!");

    } catch (error) {
        console.error("Error generando aventura con IA:", error);
        progressBarManager.error('Error en la IA');
        alert(`Ocurrió un error: ${error.message}`);
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
    
    // Se mantiene el botón de "Editar" en el nodo, pero ahora funciona para seleccionar.
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="false" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
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
    
    // El botón de editar ahora selecciona el nodo
    nuevoNodo.querySelector('.btn-editar').onclick = (e) => { 
        e.stopPropagation(); // Evita que el mousedown del draggable se active
        seleccionarMomentoParaEdicion(nuevoNodo); 
    };
    
    nuevoNodo.querySelector('.btn-eliminar').onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este momento?')) {
            // Si el nodo a eliminar es el que se está editando, oculta el panel
            if (nuevoNodo.classList.contains('momento-seleccionado')) {
                ocultarPanelEdicion();
            }
            nuevoNodo.remove();
            if (previsualizacionActiva) dibujarConexiones();
        }
    };
    
    makeDraggable(nuevoNodo);
    return nuevoNodo;
}

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

function _extraerTextoPlanoDeGuionHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}

// --- FUNCIONES DE AUTO-LAYOUT (sin cambios) ---
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
    const cola = [[rootId, 0]];
    
    visitados.add(rootId);

    while(cola.length > 0) {
        const [nodoActualId, nivelActual] = cola.shift();
        niveles.set(nodoActualId, nivelActual);

        const hijos = adyacencias.get(nodoActualId) || [];
        hijos.forEach(hijoId => {
            if(!visitados.has(hijoId) && nodosEnEstaAventura.has(hijoId)) {
                visitados.add(hijoId);
                cola.push([hijoId, nivelActual + 1]);
            }
        });
    }
    
    nodosEnEstaAventura.forEach(nodeId => {
        if(!visitados.has(nodeId)){
             niveles.set(nodeId, 0);
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
//  LÓGICA DE ZOOM Y PAN (CORREGIDA)
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

function startPan(e) {
    // Si el clic se originó dentro de un nodo de momento, deja que makeDraggable lo maneje.
    if (e.target.closest('.momento-nodo')) {
        return;
    }

    // De lo contrario, inicia el paneo del lienzo.
    canvasState.panning = true;
    canvasState.lastX = e.clientX;
    canvasState.lastY = e.clientY;
    e.currentTarget.style.cursor = 'grabbing';
    document.body.style.cursor = 'grabbing';
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
    if (canvasState.panning) {
        canvasState.panning = false;
        e.currentTarget.style.cursor = 'default';
        document.body.style.cursor = 'default';
    }
}


// =======================================================================
//  FUNCIONES PARA PREVISUALIZACIÓN DE CONEXIONES (sin cambios)
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
