// ==================================================
// --- LÓGICA DE IA PARA ANIMACIONES SVG (VERSIÓN MEJORADA MULTI-PASO) ---
// ==================================================
// Al principio de animacionessvggemini.js
let escenasGeneradasIA = [];
let escenaActivaIA = null;
document.addEventListener('DOMContentLoaded', () => {
    const aiGenerateButton = document.getElementById('ai-generate-button');
    if (aiGenerateButton) {
        aiGenerateButton.addEventListener('click', iniciarProcesoGeneracionAnimacionIA);
    }
});

/**
 * Muestra un mensaje de estado o de carga en la interfaz.
 * @param {string} mensaje - El texto a mostrar.
 * @param {boolean} isLoading - Si es true, muestra un spinner.
 */
function mostrarEstadoIA(mensaje, isLoading = true) {
    const statusContainer = document.getElementById('ai-status-container');
    if (!statusContainer) return;

    statusContainer.style.display = 'block';
    let spinnerHTML = isLoading ? '<div class="spinner-carga-modal"></div>' : '';
    statusContainer.innerHTML = `${spinnerHTML}<p>${mensaje}</p>`;
}


// ==================================================
// --- ORQUESTADOR PRINCIPAL DE LA GENERACIÓN IA ---
// ==================================================

/**
 * Inicia la secuencia completa de generación de animación por IA.
 */
async function iniciarProcesoGeneracionAnimacionIA() {
    const generateBtn = document.getElementById('ai-generate-button');
    const promptInput = document.getElementById('ai-prompt-input');
    const promptUsuario = promptInput ? promptInput.value.trim() : '';

    if (!promptUsuario) {
        mostrarEstadoIA("Por favor, escribe una descripción para la animación.", false);
        return;
    }

    if (generateBtn) generateBtn.disabled = true;

    try {
        // PASO 1: Identificar todos los recursos visuales mencionados en el prompt.
        mostrarEstadoIA("Paso 1/5: Analizando recursos visuales...", true);
        const todosLosAssets = await analizarRecursosVisuales(promptUsuario);
        if (!todosLosAssets || !todosLosAssets.assets || todosLosAssets.assets.length === 0) {
            throw new Error("No se pudieron identificar elementos en el prompt inicial.");
        }

        // PASO 2: Dividir el prompt en "tomas" con duraciones.
        mostrarEstadoIA("Paso 2/5: Dividiendo el guion en tomas...", true);
        const divisionTomas = await dividirEnTomas(promptUsuario);
        if (!divisionTomas || !divisionTomas.tomas || divisionTomas.tomas.length === 0) {
            throw new Error("No se pudo dividir el guion en tomas.");
        }

        // PASO 3: Procesar cada toma en paralelo para obtener sus datos de animación.
        mostrarEstadoIA(`Paso 3/5: Procesando ${divisionTomas.tomas.length} tomas en paralelo...`, true);
        const promesasTomas = divisionTomas.tomas.map((toma, index) => {
            return procesarTomaCompleta(toma, todosLosAssets, index + 1);
        });
        const tomasProcesadas = await Promise.all(promesasTomas);

        // PASO 4: Ensamblar los resultados de todas las tomas en una única línea de tiempo.
        mostrarEstadoIA("Paso 4/5: Ensamblando la escena final...", true);
        const instruccionesFinales = ensamblarEscenaFinal(tomasProcesadas);
        const duracionTotal = divisionTomas.tomas.reduce((acc, t) => acc + t.duracion_segundos, 0);

        // PASO 5: Montar la animación en el canvas SVG.
        mostrarEstadoIA("Paso 5/5: Reconstruyendo la animación en el editor...", true);
        await interpretarYMontarAnimacionIA(todosLosAssets, instruccionesFinales, duracionTotal);

        const statusContainer = document.getElementById('ai-status-container');
        if (statusContainer) statusContainer.style.display = 'none';

    } catch (error) {
        console.error("Error en el proceso de generación IA:", error);
        mostrarEstadoIA(`Error: ${error.message}`, false);
    } finally {
        if (generateBtn) generateBtn.disabled = false;
    }
}


// ==================================================
// --- FUNCIONES DE CADA PASO DE LA GENERACIÓN ---
// ==================================================

/**
 * PASO 1: Analiza el prompt e identifica los recursos existentes por nombre.
 * @param {string} promptUsuario - El prompt completo del usuario.
 * @returns {Promise<object>} Un objeto con la lista de assets identificados.
 */
async function analizarRecursosVisuales(promptUsuario) {
    const personajesNodes = Array.from(document.querySelectorAll('#listapersonajes .personaje'));
    const personajesDisponibles = personajesNodes.map(node => ({
        nombre: node.querySelector('.nombreh').value,
        svg: node.dataset.svgContent || null,
        imagen: (node.querySelector('img')?.src.startsWith('data:image')) ? node.querySelector('img').src : null
    }));

    const promptPaso1 = `Analiza el siguiente prompt de animación. Tu tarea es identificar CADA elemento (personajes, objetos, fondos) que se mencionan. 
    Compara los nombres con la lista de "personajes disponibles, pueden ser nombres distintos pero referirse a lo mismo por ejemplo: "Kenshin" y "kenshin o arbol y olivo  o plaza de las palmeras y plaza de la palmera o edificio de policia y comisaria etc..".
Prompt del usuario: "${promptUsuario}"
Personajes disponibles: ${JSON.stringify(personajesDisponibles.map(p => p.nombre))}
Responde ÚNICAMENTE con un objeto JSON que contenga un array llamado "assets". Para CADA elemento, crea un objeto en el array con:
- "nombre": El nombre del elemento (ej: "Kenshin", "espada", "bosque").
- "existente": true si el nombre coincide con uno de la lista de "personajes disponibles", de lo contrario false.`;

    const analisisDesdeIA = await llamarIAConFeedback(promptPaso1, "Análisis de recursos", 'gemini-2.5-flash');

    // Enriquecer la respuesta de la IA con los datos gráficos reales
    if (analisisDesdeIA && analisisDesdeIA.assets) {
        for (const asset of analisisDesdeIA.assets) {
            if (asset.existente) {
                const personaje = personajesDisponibles.find(p => p.nombre.toLowerCase() === asset.nombre.toLowerCase());
                if (personaje) {
                    asset.svg = personaje.svg;
                    asset.imagen = personaje.imagen;
                    asset.tipo_grafico = personaje.svg ? 'svg' : 'imagen';
                }
            } else {
                asset.tipo_grafico = 'placeholder';
            }
        }
    }
    return analisisDesdeIA;
}

/**
 * PASO 2: Divide el prompt en una secuencia de tomas con duraciones de forma literal.
 * @param {string} promptUsuario - El prompt completo del usuario.
 * @returns {Promise<object>} Un objeto con un array de tomas.
 */
async function dividirEnTomas(promptUsuario) {
    // --- INICIO DE LA MEJORA ---
    const promptPaso2 = `Eres un analista de guiones técnico. Tu única tarea es dividir el siguiente texto en "tomas" basándote en cambios de escena explícitos.
Guion: "${promptUsuario}"

Reglas estrictas:
1.  **Una toma en base a la escena explícita:** Considera algo que esta pasando como una toma en la secuencia de tomas.
2.  **No subdividas:** NO dividas una única acción (ej: "un personaje camina de izquierda a derecha") en múltiples tomas o un dialogo como un cambio de tomas.
3.  **Busca delimitadores:** Usa frases como "Luego,", "Después,", "Mientras tanto," o simplemente el final de una acción como puntos de división claros.
4.  **Sé literal:** No inventes tomas ni acciones que no estén escritas explícitamente en el guion.

Responde ÚNICAMENTE con un objeto JSON que contenga un array llamado "tomas". Cada objeto en el array debe tener:
- "toma_texto": La descripción exacta de la acción en esta toma, extraída del guion.
- "duracion_segundos": Un número entero que represente una duración lógica para esa acción específica.`;
    // --- FIN DE LA MEJORA ---

    return await llamarIAConFeedback(promptPaso2, "División en tomas", 'gemini-2.5-flash-lite');
}

/**
 * Orquesta el procesamiento completo de una única toma (pasos 3a, 3b, 3c).
 * @param {object} toma - El objeto de la toma (texto y duración).
 * @param {object} todosLosAssets - La lista de todos los assets de la escena.
 * @param {number} indiceToma - El número de la toma (para los logs).
 * @returns {Promise<object>} Un objeto que contiene los datos procesados de la toma.
 */
async function procesarTomaCompleta(toma, todosLosAssets, indiceToma) {
    mostrarEstadoIA(`Paso 3.${indiceToma}.a: Identificando elementos en la toma ${indiceToma}...`, true);
    const elementosEnToma = await identificarElementosEnToma(toma, todosLosAssets);

    mostrarEstadoIA(`Paso 3.${indiceToma}.b: Definiendo posiciones iniciales para la toma ${indiceToma}...`, true);
    const layoutInicial = await determinarPosicionesInicialesToma(toma, elementosEnToma);

    mostrarEstadoIA(`Paso 3.${indiceToma}.c: Generando animaciones para la toma ${indiceToma}...`, true);
    const animaciones = await generarAnimacionesToma(toma, layoutInicial);

    return {
        ...toma,
        layout_inicial: layoutInicial.layout_inicial_toma,
        animaciones: animaciones.animaciones_toma
    };
}

/**
 * PASO 3a: Identifica qué assets de la lista maestra aparecen en una toma específica.
 */
async function identificarElementosEnToma(toma, todosLosAssets) {
    const nombresDeTodosLosAssets = todosLosAssets.assets.map(a => a.nombre);
    const prompt = `Dado un listado MAESTRO de elementos y el texto de una TOMA específica, identifica cuáles de los elementos del listado MAESTRO aparecen en el texto de la TOMA.
Listado MAESTRO de elementos: ${JSON.stringify(nombresDeTodosLosAssets)}
Texto de la TOMA: "${toma.toma_texto}"
Responde ÚNICAMENTE con un objeto JSON que contenga un array de strings llamado "elementos_en_toma" con los nombres de los elementos que aparecen.`;
    return await llamarIAConFeedback(prompt, "Identificación de elementos por toma", 'gemini-2.5-flash-lite');
}

/**
 * PASO 3b: Determina la posición, escala y rotación inicial de los elementos al empezar una toma.
 */
async function determinarPosicionesInicialesToma(toma, elementosEnToma) {
    const canvasRect = document.getElementById('svg-canvas').getBoundingClientRect();
    const prompt = `Eres un director de escena. Para la siguiente toma, define el estado inicial (posición, escala, rotación) de cada elemento.
Lienzo: ${canvasRect.width}px de ancho x ${canvasRect.height}px de alto. Centro en (${canvasRect.width / 2}, ${canvasRect.height / 2}).
Texto de la TOMA: "${toma.toma_texto}"
Elementos en esta TOMA: ${JSON.stringify(elementosEnToma.elementos_en_toma)}
Considera: Si un personaje "entra desde la izquierda", su 'x' inicial debe estar fuera del lienzo (ej: -100). La escala debe ser apropiada (ej: 0.2 para un personaje).
Responde ÚNICAMENTE con un objeto JSON que contenga un array llamado "layout_inicial_toma". Cada objeto debe tener: "elemento", "x", "y", "escala", "rotacion" (en grados), y "opacidad" (de 0 a 1).`;
    return await llamarIAConFeedback(prompt, "Layout inicial de toma", 'gemini-2.5-flash-lite');
}

/**
 * PASO 3c: Genera los keyframes de animación para los elementos de una toma.
 */
async function generarAnimacionesToma(toma, layoutInicial) {
    // --- PASO 3c.1: Definir Acciones Abstractas (Verbos) ---
    const promptPaso3c_1 = `Eres un director de escena. Tu tarea es leer el guion de una toma y describir las acciones principales de cada elemento en forma de "verbos". No uses coordenadas, solo describe la acción.

Texto de la TOMA: "${toma.toma_texto}"
Duración de la TOMA: ${toma.duracion_segundos} segundos.
Elementos presentes: ${JSON.stringify(layoutInicial.layout_inicial_toma.map(el => el.elemento))}

Analiza el texto y responde ÚNICAMENTE con un objeto JSON que contenga un array llamado "acciones_abstractas". Para cada acción, crea un objeto con:
- "elemento": string (El nombre del elemento que realiza la acción).
- "verbo_accion": string (Una descripción clara de la acción, ej: "camina hacia la derecha del escenario", "crece el doble de su tamaño", "gira 360 grados", "aparece suavemente").
- "tiempo_sugerido_inicio_seg": number (Segundo de inicio sugerido para la acción).
- "duracion_sugerida_seg": number (Duración sugerida para la acción).`;

    const resultadoAbstracto = await llamarIAConFeedback(promptPaso3c_1, "Generación de acciones abstractas", 'gemini-2.5-flash');

    if (!resultadoAbstracto || !resultadoAbstracto.acciones_abstractas || resultadoAbstracto.acciones_abstractas.length === 0) {
        console.log("No se generaron acciones abstractas para la toma. Se devolverá una animación vacía.");
        return { animaciones_toma: [] };
    }

  // --- PASO 3c.2: Convertir Acciones Abstractas en Keyframes Técnicos ---
    const promptPaso3c_2 = `Eres un animador técnico. Tu tarea es convertir una lista de "acciones abstractas" en una secuencia de keyframes de animación con coordenadas y parámetros específicos.

Lienzo de la animación: 1920px de ancho x 1080px de alto. El centro es (960, 540).
Duración total de la TOMA: ${toma.duracion_segundos} segundos.
Estado Inicial de los elementos: ${JSON.stringify(layoutInicial.layout_inicial_toma)}
Acciones abstractas a animar: ${JSON.stringify(resultadoAbstracto.acciones_abstractas)}

Traduce cada "verbo_accion" a una o más acciones técnicas ("mover", "escalar", "rotar", "aparecer", "desvanecer"). Calcula los parámetros finales ('x_final', 'escala_final', etc.) basándote en la descripción y el estado inicial. Convierte los tiempos en segundos a milisegundos.

Responde ÚNICAMENTE con un objeto JSON con un array "animaciones_toma". Cada objeto debe tener:
- "elemento": string
- "accion": "mover" | "escalar" | "rotar" | "aparecer" | "desvanecer"
- "tiempo_inicio_ms": number (calculado a partir de tiempo_sugerido_inicio_seg * 1000)
- "duracion_ms": number (calculado a partir de duracion_sugerida_seg * 1000)
- "params": objeto con los valores finales (ej: para "mover", { "x_final": number, "y_final": number }; para "escalar", { "escala_final": number }; para "rotar", { "angulo_final": number }; para "aparecer" o "desvanecer", { "opacidad_final": number })`;
    
    return await llamarIAConFeedback(promptPaso3c_2, "Generación de animaciones de toma", 'gemini-2.0-flash');
}


// ==================================================
// --- FUNCIONES DE ENSAMBLAJE Y RENDERIZADO ---
// ==================================================

/**
 * PASO 4: Combina los resultados de todas las tomas en una sola lista de instrucciones de animación.
 * @param {Array<object>} tomasProcesadas - El array con los datos de cada toma ya procesados.
 * @returns {Array<object>} Una lista única y ordenada de instrucciones de animación.
 */
function ensamblarEscenaFinal(tomasProcesadas) {
    let instruccionesFinales = [];
    let tiempoAcumuladoMs = 0;

    tomasProcesadas.forEach(toma => {
        // Añadir keyframes para el estado inicial de cada elemento en la toma
        if (toma.layout_inicial) {
            toma.layout_inicial.forEach(layout => {
                instruccionesFinales.push({
                    elemento: layout.elemento,
                    accion: 'estado_inicial',
                    tiempo_inicio_ms: tiempoAcumuladoMs,
                    duracion_ms: 0,
                    params: {
                        x: layout.x,
                        y: layout.y,
                        escalaX: layout.escala,
                        escalaY: layout.escala,
                        rotacion: layout.rotacion,
                        opacidad: layout.opacidad
                    }
                });
            });
        }

        // Añadir las animaciones de la toma, ajustando su tiempo de inicio
        if (toma.animaciones) {
            toma.animaciones.forEach(anim => {
                instruccionesFinales.push({
                    ...anim,
                    tiempo_inicio_ms: tiempoAcumuladoMs + anim.tiempo_inicio_ms
                });
            });
        }
        
        tiempoAcumuladoMs += toma.duracion_segundos * 1000;
    });

    return instruccionesFinales;
}
/**
 * PASO 5: Guarda la animación como una nueva escena y la monta en el editor.
 * @param {object} todosLosAssets - Objeto con la lista de todos los assets.
 * @param {Array<object>} instruccionesFinales - La lista de todas las instrucciones de animación.
 * @param {number} duracionTotalSegundos - La duración total de la animación.
 */
async function interpretarYMontarAnimacionIA(todosLosAssets, instruccionesFinales, duracionTotalSegundos) {
    if (!instruccionesFinales) {
        throw new Error("No hay instrucciones finales para montar la animación.");
    }

    // Guardar los datos de la animación en un objeto de escena
    const nuevaEscena = {
        id: `ia-scene-${Date.now()}`,
        nombre: `Animación #${escenasGeneradasIA.length + 1}`,
        assets: JSON.parse(JSON.stringify(todosLosAssets)), // Copia profunda
        instrucciones: JSON.parse(JSON.stringify(instruccionesFinales)),
        duracion: duracionTotalSegundos
    };

    escenasGeneradasIA.push(nuevaEscena);
    
    // Cargar la escena recién creada en el editor
    await cargarEscenaIA(nuevaEscena.id);
    
    // Actualizar la lista de escenas en la UI
    renderizarListaDeEscenasIA();
}

/**
 * Renderiza la lista de escenas generadas por IA en el panel de la UI.
 */
function renderizarListaDeEscenasIA() {
    const listContainer = document.getElementById('ai-scenes-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Limpiar la lista

    if (escenasGeneradasIA.length === 0) {
        listContainer.innerHTML = '<p class="empty-list-placeholder">Aún no se han generado escenas.</p>';
        return;
    }

    escenasGeneradasIA.forEach(escena => {
        const item = document.createElement('div');
        item.className = 'ai-scene-item';
        item.dataset.sceneId = escena.id;
        if (escenaActivaIA && escenaActivaIA.id === escena.id) {
            item.classList.add('active');
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = escena.nombre;

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'scene-buttons';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Cargar';
        loadBtn.className = 'load-scene-btn';
        loadBtn.onclick = (e) => {
            e.stopPropagation();
            cargarEscenaIA(escena.id);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.className = 'delete-scene-btn';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            eliminarEscenaIA(escena.id);
        };

        buttonsDiv.appendChild(loadBtn);
        buttonsDiv.appendChild(deleteBtn);
        item.appendChild(nameSpan);
        item.appendChild(buttonsDiv);
        listContainer.appendChild(item);
    });
}

/**
 * Carga una escena generada por IA en el editor principal.
 * @param {string} sceneId - El ID de la escena a cargar.
 */
async function cargarEscenaIA(sceneId) {
    const escenaACargar = escenasGeneradasIA.find(s => s.id === sceneId);
    if (!escenaACargar) {
        console.error("Escena no encontrada:", sceneId);
        return;
    }
    
    escenaActivaIA = escenaACargar;

    // Limpieza del editor (usando funciones globales de animacionessvg.js)
    if (typeof stopAnimation === 'function') stopAnimation();
    if (typeof deselectAll === 'function') deselectAll();
    
    shapesContainer.innerHTML = '';
    animationData = {};

    // --- INICIO DE LA MODIFICACIÓN CLAVE ---
    // En lugar de manipular directamente DURATION, timelineSlider, etc.,
    // llamamos a la nueva función de sincronización global.
    const duracionMs = escenaACargar.duracion * 1000;
    if (typeof window.syncPlaybackControls === 'function') {
        window.syncPlaybackControls(duracionMs);
    } else {
        console.error("Error crítico: La función de sincronización 'syncPlaybackControls' no está disponible.");
        // Fallback por si acaso, aunque no es ideal.
        if (typeof DURATION !== 'undefined') DURATION = duracionMs;
        if (typeof timelineSlider !== 'undefined') timelineSlider.max = duracionMs;
        if (typeof durationInput !== 'undefined') durationInput.value = escenaACargar.duracion;
    }
    // --- FIN DE LA MODIFICACIÓN CLAVE ---

    const elementosEnEscena = {};

    // Crear elementos en el canvas (este bucle se mantiene igual)
    for (const asset of escenaACargar.assets.assets) {
        let nuevoElemento;
        if (asset.existente && (asset.svg || asset.imagen)) {
             if (asset.svg) {
                const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const content = new DOMParser().parseFromString(asset.svg, "image/svg+xml").documentElement;
                Array.from(content.children).forEach(child => wrapper.appendChild(child.cloneNode(true)));
                nuevoElemento = registerShape(wrapper);
            } else if (asset.imagen) {
                const svgImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                const img = new Image();
                img.src = asset.imagen;
                await new Promise(resolve => img.onload = resolve);
                svgImage.setAttribute('width', img.width);
                svgImage.setAttribute('height', img.height);
                svgImage.setAttribute('href', asset.imagen);
                nuevoElemento = registerShape(svgImage);
            }
        } else {
            const placeholder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            placeholder.setAttribute('width', 100);
            placeholder.setAttribute('height', 150);
            placeholder.setAttribute('fill', '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'));
            nuevoElemento = registerShape(placeholder);
        }
        elementosEnEscena[asset.nombre] = nuevoElemento;
    }

    // Aplicar keyframes (esta lógica se mantiene igual)
    escenaACargar.instrucciones.forEach(instruccion => {
        const elemento = elementosEnEscena[instruccion.elemento];
        if (!elemento) return;
        
        const shapeId = elemento.id;
        const keyframes = animationData[shapeId].keyframes;
        let estadoAnterior = keyframes.length > 0 ? {...keyframes[keyframes.length - 1].attrs} : getShapeTransforms(elemento);
        let estadoFinal = estadoAnterior;

        if(instruccion.accion === 'estado_inicial') {
            Object.assign(estadoFinal, instruccion.params);
            keyframes.push({ time: instruccion.tiempo_inicio_ms, attrs: estadoFinal, easing: 'linear' });
        } else {
            let estadoInicio = {...estadoAnterior};
            if (!keyframes.find(k => k.time === instruccion.tiempo_inicio_ms)) {
                 keyframes.push({ time: instruccion.tiempo_inicio_ms, attrs: estadoInicio, easing: 'linear' });
            }
            estadoFinal = estadoInicio;
            switch(instruccion.accion) {
                case 'mover':
                    estadoFinal.x = instruccion.params.x_final;
                    estadoFinal.y = instruccion.params.y_final;
                    break;
                case 'escalar':
                    estadoFinal.scaleX = instruccion.params.escala_final;
                    estadoFinal.scaleY = instruccion.params.escala_final;
                    break;
                case 'rotar':
                    estadoFinal.rotation = instruccion.params.angulo_final;
                    break;
            }
            keyframes.push({ time: instruccion.tiempo_inicio_ms + instruccion.duracion_ms, attrs: estadoFinal, easing: 'linear' });
        }
    });

    // Limpiar y ordenar keyframes (se mantiene igual)
    Object.keys(animationData).forEach(shapeId => {
        const kfs = animationData[shapeId].keyframes;
        if (kfs.length > 1) {
            const timeMap = new Map();
            kfs.forEach(kf => timeMap.set(kf.time, kf));
            animationData[shapeId].keyframes = Array.from(timeMap.values()).sort((a, b) => a.time - b.time);
        }
    });

    // Actualizar UI (la función de sincronización ya se encarga de la mayoría)
    renderLayerList();
    updateStateAtTime(0);
    renderizarListaDeEscenasIA(); // Para actualizar la clase 'active'
}

/**
 * Elimina una escena generada por IA de la lista.
 * @param {string} sceneId - El ID de la escena a eliminar.
 */
function eliminarEscenaIA(sceneId) {
    const sceneIndex = escenasGeneradasIA.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;

    escenasGeneradasIA.splice(sceneIndex, 1);

    // Si la escena eliminada era la activa, limpiar el editor
    if (escenaActivaIA && escenaActivaIA.id === sceneId) {
        escenaActivaIA = null;
        stopAnimation();
        deselectAll();
        shapesContainer.innerHTML = '';
        animationData = {};
        renderLayerList();
        updateStateAtTime(0);
    }
    
    renderizarListaDeEscenasIA();
}

/**
 * Abre el modal principal de animaciones IA.
 * Esta función se hace global para ser llamada desde otros scripts como main.js
 */
window.abrirModalAnimacionesIA = function() {
    // Asumimos que el modal principal tiene el ID 'ia-animations-modal'
    const modal = document.getElementById('ia-animations-modal');
    if (modal) {
        // Aquí iría la lógica para mostrar el modal, por ejemplo:
        modal.classList.remove('hidden');
        console.log("Modal de animaciones IA abierto.");
    } else {
        console.error('Error: No se encontró el elemento del modal con ID "ia-animations-modal"');
    }
}
