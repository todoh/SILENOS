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
// Array de niveles de zoom desde 10% a 200% en saltos de 10%
const ZOOM_LEVELS = Array.from({length: 20}, (_, i) => parseFloat(((i + 1) * 0.1).toFixed(1)));
// El índice inicial ahora apunta al valor 1.0 (100%) en el nuevo array
let currentZoomIndex = 9;

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
 *//**
 * CORRECCIÓN FINAL: Usa 'transform' para un arrastre fluido y sin saltos.
 * Actualiza 'left' y 'top' solo al final del arrastre.
 */
function makeDraggable(element) {
    let isDragging = false;
    let initialX, initialY;
    // Guardamos la posición original al inicio del arrastre
    let startLeft, startTop;
    const lienzo = document.getElementById('momentos-lienzo');

    const onMouseDown = (e) => {
        if (e.target.isContentEditable || e.target.closest('.btn-eliminar, .marcador-inicio, .btn-editar')) {
            if (e.target.closest('.btn-editar')) {
                seleccionarMomentoParaEdicion(element);
            }
            return;
        }

        seleccionarMomentoParaEdicion(element);
        
        e.preventDefault();
        isDragging = true;
        element.style.cursor = 'grabbing';
        element.style.zIndex = 1001;
        // Quita cualquier transición que pueda interferir con el arrastre
        element.style.transition = 'none'; 

        // Posiciones al comenzar
        startLeft = element.offsetLeft;
        startTop = element.offsetTop;
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
        
        // ¡CAMBIO CLAVE! Usamos transform para mover el elemento visualmente.
        // Esto es mucho más fluido y no afecta al layout de la página en tiempo real.
        element.style.transform = `translate(${dx}px, ${dy}px)`;

        // (La lógica de expansión del lienzo se deja como estaba,
        // pero se basa en la posición teórica, no en la visual)
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

    const onMouseUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        element.style.cursor = 'grab';
        element.style.zIndex = 1;
        // Limpiamos la transformación y la transición
        element.style.transform = '';
        element.style.transition = '';

        // ¡CAMBIO CLAVE! Ahora calculamos y asignamos la posición final
        // a 'left' y 'top' una sola vez.
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

        // Las conexiones se redibujan al final, como debe ser.
        if (previsualizacionActiva) {
            dibujarConexiones();
        }
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
/**
 * Genera una red de momentos de aventura interactiva utilizando la IA.
 * Recoge los datos de un modal, construye un "Super-Prompt" y llama a la IA.
 * Luego, procesa la respuesta para crear y organizar los nodos en el lienzo.
 */
async function generarAventuraConIA2222() {
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
    
    // Asumimos que guionLiterarioData y _extraerTextoPlanoDeGuionHTML están disponibles globalmente
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
        Responde ÚNICAMENTE con un objeto JSON válido que contenga un array llamado "momentos". NO incluyas explicaciones, comentarios, ni marcadores de código como \`\`\`json.
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
        // Reutilizamos la función robusta llamarIAConFeedback
        const respuestaJson = await llamarIAConFeedback(prompt, "Generando Red de Aventura Interactiva", 'gemini-2.5-flash-lite', true, 3); // Usamos un modelo potente
        
        progressBarManager.set(50, 'IA respondió. Procesando y creando momentos...');
        if (!respuestaJson?.momentos || !Array.isArray(respuestaJson.momentos) || respuestaJson.momentos.length === 0) {
            throw new Error("La respuesta de la IA no tuvo el formato de momentos esperado.");
        }

        const momentosData = respuestaJson.momentos;
        const lienzo = document.getElementById('momentos-lienzo');
        let offsetX = 0;
        
        // Calculamos el desplazamiento para los nuevos nodos
        lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
            const rightEdge = parseFloat(nodo.style.left || 0) + nodo.offsetWidth;
            if (rightEdge > offsetX) offsetX = rightEdge;
        });
        if (offsetX > 0) offsetX += 150; // Añadimos un margen

        const idMap = new Map();
        
        // Primera pasada: Crear nodos y mapear IDs
        momentosData.forEach(datos => {
            const nuevoId = `momento_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            idMap.set(datos.id, nuevoId); // Mapeamos el id temporal de la IA a nuestro id único y seguro
            // Asumimos que crearNodoEnLienzo está disponible globalmente
            crearNodoEnLienzo({ ...datos, id: nuevoId, acciones: [], x: 0, y: 0 }); 
        });
        
        progressBarManager.set(75, 'Conectando acciones y decisiones...');
        
        // Segunda pasada: Conectar las acciones usando los IDs mapeados
        momentosData.forEach(datos => {
            const idOriginal = datos.id;
            const nuevoId = idMap.get(idOriginal);
            const nodo = document.getElementById(nuevoId);
            if (!nodo) return;

            const accionesTraducidas = (datos.acciones || []).map(a => ({
                ...a,
                idDestino: idMap.get(a.idDestino) // Traducimos el id de destino usando el mapa
            })).filter(a => a.idDestino); // Filtramos acciones que no llevan a ningún sitio
            
            nodo.dataset.acciones = JSON.stringify(accionesTraducidas);
        });

        progressBarManager.set(85, 'Organizando el lienzo...');
        // Asumimos que organizarNodosEnLienzo está disponible globalmente
        organizarNodosEnLienzo(momentosData, idMap, offsetX);
        
        progressBarManager.set(95, 'Finalizando...');
        if (momentosData.length > 0) {
            const primerId = idMap.get(momentosData[0].id);
            if (!lienzo.querySelector('.momento-nodo.inicio')) {
                marcarComoInicio(primerId);
            }
            // Centramos la vista en el primer nodo creado
            setTimeout(() => centrarVistaEnNodo(document.getElementById(primerId)), 100);
        }

        progressBarManager.finish();
        alert("¡Nueva aventura añadida al lienzo con éxito!");

    } catch (error) {
        console.error("Error generando aventura con IA:", error);
        progressBarManager.error('Error en la IA');
        alert(`Ocurrió un error al generar la aventura: ${error.message}`);
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
    
    // La apariencia del nodo en el editor sigue siendo simple.
    // La complejidad está en los datos que almacena.
    nuevoNodo.innerHTML = `
        <span class="marcador-inicio" title="Marcar como inicio de la historia">🚩</span>
        <p contenteditable="false" class="momento-titulo">${datos.titulo || 'Sin Título'}</p>
        <div class="momento-contenido">
             <i class="fas fa-cube fa-2x" style="color: #ccc;"></i>
             <p style="font-size: 10px; color: #888;">Escena 3D</p>
        </div>
        <div class="momento-botones">
            <button class="momento-btn btn-editar">Editar</button>
            <button class="momento-btn btn-eliminar">Eliminar</button>
        </div>
    `;

    // Posición en el lienzo 2D
    nuevoNodo.style.left = `${datos.x || 0}px`;
    nuevoNodo.style.top = `${datos.y || 0}px`;
    nuevoNodo.dataset.x = datos.x || 0;
    nuevoNodo.dataset.y = datos.y || 0;
    
    // --- DATOS CLAVE PARA 3D ---
    nuevoNodo.dataset.descripcion = datos.descripcion || "";
    nuevoNodo.dataset.acciones = JSON.stringify(datos.acciones || []);
    // Inicializa los nuevos datasets para la escena 3D
    nuevoNodo.dataset.entorno = datos.entorno ? JSON.stringify(datos.entorno) : '{}';
    nuevoNodo.dataset.entidades = datos.entidades ? JSON.stringify(datos.entidades) : '[]';

    lienzo.appendChild(nuevoNodo);

    // Listeners (sin cambios)
    nuevoNodo.querySelector('.marcador-inicio').onclick = (e) => { e.stopPropagation(); marcarComoInicio(nuevoNodo.id); };
    nuevoNodo.querySelector('.btn-editar').onclick = (e) => { 
        e.stopPropagation();
        seleccionarMomentoParaEdicion(nuevoNodo); 
    };
    nuevoNodo.querySelector('.btn-eliminar').onclick = (e) => {
        e.stopPropagation();
        if (confirm('¿Eliminar este momento?')) {
            if (nuevoNodo.classList.contains('momento-seleccionado')) {
                ocultarPanelEdicion();
            }
            nuevoNodo.remove();
            if (previsualizacionActiva) dibujarConexiones();
        }
    };
    
    makeDraggable(nuevoNodo); // makeDraggable no necesita cambios
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
