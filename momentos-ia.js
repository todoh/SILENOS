// =======================================================================
//  IA - GENERACIÓN DE AVENTURA Y AUTO-LAYOUT
// =======================================================================

/**
 * Abre y prepara el modal para la generación de aventura con IA.
 */
function abrirModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    if (!overlay || !modal) return;

    const guionSelectModal = document.getElementById('guion-select-modal');
    if (typeof cargarGuionesEnDropdown === 'function') {
        cargarGuionesEnDropdown(guionSelectModal); 
    }

    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalMomentosIA;

    const nodosInput = document.getElementById('ia-nodos-input');
    const finalesInput = document.getElementById('ia-finales-input');
    const densidadSlider = document.getElementById('ia-densidad-slider');
    const generarBtn = document.getElementById('generar-aventura-ia-btn-modal');
    
    [nodosInput, finalesInput, densidadSlider].forEach(input => {
        input.addEventListener('input', actualizarCalculosAventuraIA);
    });
    
    generarBtn.addEventListener('click', generarAventuraConIA);

    actualizarCalculosAventuraIA();
}

/**
 * Cierra el modal de generación con IA.
 */
function cerrarModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    if (overlay && modal) {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        overlay.onclick = null;
    }
}

/**
 * Actualiza los cálculos y validaciones en el modal de IA en tiempo real.
 */
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

    const densidadDesc = { 1: "Muy Lineal", 2: "Baja", 3: "Moderada", 4: "Alta", 5: "Muy Compleja" };
    densidadLabel.textContent = densidadDesc[densidad] || "Moderada";
    
    const minNodos = Math.ceil((numFinales * 1.5) + (densidad * 1.5));
    minNodosDisplay.textContent = `Nodos mínimos recomendados: ${minNodos}`;

    const estimatedCalls = 1 + numNodos;
    apiCallsDisplay.textContent = `Peticiones a la API estimadas: ~${estimatedCalls}`;

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
 * Orquesta el proceso completo de generación de la aventura con IA.
 */
async function generarAventuraConIA() {
    cerrarModalMomentosIA();
    if (progressBarManager.isActive) {
        alert("Ya hay un proceso de IA en ejecución.");
        return;
    }
    progressBarManager.start('Iniciando Aventura Interactiva...');

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
        const respuestaJson = await llamarIAConFeedback(prompt, "Generando Red de Aventura Interactiva", true);
        
        progressBarManager.set(50, 'IA respondió. Procesando y creando momentos...');
        if (!respuestaJson?.momentos?.length) throw new Error("La respuesta de la IA no tuvo el formato esperado.");

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
            idMap.set(datos.id, nuevoId);
            crearNodoEnLienzo({ ...datos, id: nuevoId, acciones: [], x: 0, y: 0 }); // Llama a la función del core
        });
        
        progressBarManager.set(75, 'Conectando acciones y decisiones...');
        momentosData.forEach(datos => {
            const nodo = document.getElementById(idMap.get(datos.id));
            if (!nodo) return;
            const accionesTraducidas = (datos.acciones || []).map(a => ({
                ...a,
                idDestino: idMap.get(a.idDestino)
            })).filter(a => a.idDestino);
            nodo.dataset.acciones = JSON.stringify(accionesTraducidas);
        });

        progressBarManager.set(85, 'Organizando el lienzo...');
        organizarNodosEnLienzo(momentosData, idMap, offsetX);
        
        progressBarManager.set(95, 'Finalizando...');
        if (momentosData.length > 0 && !lienzo.querySelector('.momento-nodo.inicio')) {
            const primerId = idMap.get(momentosData[0].id);
            marcarComoInicio(primerId); // Llama a la función del core
        }
        if (momentosData.length > 0) {
            const primerId = idMap.get(momentosData[0].id);
            setTimeout(() => centrarVistaEnNodo(document.getElementById(primerId)), 100); // Llama a la función de vista
        }

        progressBarManager.finish();
        alert("¡Nueva aventura añadida al lienzo con éxito!");

    } catch (error) {
        console.error("Error generando aventura con IA:", error);
        progressBarManager.error('Error en la IA');
        alert(`Ocurrió un error: ${error.message}`);
    }
}


// --- FUNCIONES DE AUTO-LAYOUT ---

function organizarNodosEnLienzo(momentos, idMap, offsetX = 0) {
    if (!momentos || momentos.length === 0) return;

    const adyacencias = new Map();
    const nodosEnEstaAventura = new Set();

    momentos.forEach(momento => {
        const idReal = idMap.get(momento.id);
        nodosEnEstaAventura.add(idReal);
        if (!adyacencias.has(idReal)) adyacencias.set(idReal, []);
        (momento.acciones || []).forEach(accion => {
            const idDestinoReal = idMap.get(accion.idDestino);
            if(idDestinoReal) adyacencias.get(idReal).push(idDestinoReal);
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
        if(!visitados.has(nodeId)) niveles.set(nodeId, 0);
    });

    const nodosPorNivel = new Map();
    niveles.forEach((nivel, id) => {
        if(!nodosPorNivel.has(nivel)) nodosPorNivel.set(nivel, []);
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