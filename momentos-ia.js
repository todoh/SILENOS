// =================================================================
// CÓDIGO ÚNICO Y DEFINITIVO PARA MOMENTOS-IA.JS
// Contiene la arquitectura estructural, el manejo del nuevo modal y el layout.
// =================================================================

/**
 * [NUEVA] Abre y prepara el modal para la generación de aventura ESTRUCTURAL.
 */
function abrirModalMomentosIA() {
    const overlay = document.getElementById('modal-overlay');
    const modal = document.getElementById('modal-momentos-ia');
    if (!overlay || !modal) {
        console.error("No se encontraron los elementos del modal de IA.");
        return;
    }

    // Poblar el dropdown de guiones
    const guionSelectModal = document.getElementById('guion-select-modal');
    if (typeof cargarGuionesEnDropdown === 'function') {
        cargarGuionesEnDropdown(guionSelectModal);
    }

    // Mostrar modal
    overlay.style.display = 'block';
    modal.style.display = 'flex';
    overlay.onclick = cerrarModalMomentosIA;

    // --- LÓGICA DE LISTENERS PARA EL NUEVO MODAL ---
    const finalesInput = document.getElementById('ia-finales-input');
    const tamanioInput = document.getElementById('ia-tamanio-input');
    const generarBtn = document.getElementById('generar-aventura-ia-btn-modal');

    // Limpia listeners antiguos y añade los nuevos para evitar duplicados
    const nuevoGenerarBtn = generarBtn.cloneNode(true);
    generarBtn.parentNode.replaceChild(nuevoGenerarBtn, generarBtn);
    nuevoGenerarBtn.addEventListener('click', generarAventuraEstructural);

    finalesInput.removeEventListener('input', actualizarCalculosAventuraIA);
    tamanioInput.removeEventListener('input', actualizarCalculosAventuraIA);
    finalesInput.addEventListener('input', actualizarCalculosAventuraIA);
    tamanioInput.addEventListener('input', actualizarCalculosAventuraIA);

    // Ejecutar el cálculo una vez al abrir para mostrar el valor inicial correcto
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
 * [NUEVA] Actualiza los cálculos en el modal rediseñado.
 */
function actualizarCalculosAventuraIA() {
    const finalesInput = document.getElementById('ia-finales-input');
    const tamanioInput = document.getElementById('ia-tamanio-input');
    const apiCallsDisplay = document.getElementById('ia-api-calls-display');

    if (!finalesInput || !tamanioInput || !apiCallsDisplay) return;

    const numFinales = parseInt(finalesInput.value) || 1;
    const tamanioObra = parseInt(tamanioInput.value) || 0;

    const estimatedCalls = 1 + (numFinales - 1) + tamanioObra;
    apiCallsDisplay.textContent = `Peticiones a la API estimadas: ~${estimatedCalls}`;
}

/**
 * [NUEVA] Convierte el estado actual del mapa de nodos en un resumen de texto para la IA.
 */
function generarResumenDeLaHistoriaParaIA(nodosGenerados) {
    let resumen = "Esta es la estructura y contenido actual de la historia:\n";
    for (const [id, data] of nodosGenerados.entries()) {
        const titulo = data.titulo || "Momento sin título";
        // Añadimos los primeros 60 caracteres de la descripción para dar contexto
        const descCorta = (data.descripcion || "Sin descripción.").substring(0, 60);
        resumen += `- Nodo ${id} ("${titulo}"): ${descCorta}...\n`;
    }
    return resumen;
}

/**
 * 
 * 
  const MODELO_PRINCIPAL = 'gemini-2.5-flash-lite';
    const MODELO_SECUNDARIO = 'gemini-2.5-flash-lite';
 * 
 * [NUEVO ORQUESTADOR] Genera la aventura siguiendo la nueva lógica estructural por fases.
 */

// =================================================================
// VERSIÓN FINAL CON CONTEXTO MEJORADO Y REGLA ANTI-REPETICIÓN
// =================================================================

async function generarAventuraEstructural() {
    cerrarModalMomentosIA();
    if (progressBarManager.isActive) {
        alert("Ya hay un proceso de IA en ejecución.");
        return;
    }
    progressBarManager.start('Iniciando generación estructural...');

    const finalesInput = document.getElementById('ia-finales-input');
    const tamanioInput = document.getElementById('ia-tamanio-input');
    const guionSelect = document.getElementById('guion-select-modal');
    
    const numFinales = parseInt(finalesInput.value);
    const tamanioObra = parseInt(tamanioInput.value);
    const tituloGuion = guionSelect.value;

  const MODELO_PRINCIPAL = 'gemini-2.5-flash-lite';
    const MODELO_SECUNDARIO = 'gemini-2.5-flash-lite';

    const capitulo = guionLiterarioData.find(g => g.titulo === tituloGuion);
    const contenidoGuion = capitulo ? _extraerTextoPlanoDeGuionHTML(capitulo.contenido) : '';
    if (!contenidoGuion) return progressBarManager.error("Guion vacío.");

    const nodosGenerados = new Map();
    const idMapMaestro = new Map();
    let totalPasos = 1 + (numFinales - 1) + tamanioObra;
    let pasoActual = 0;
    
    const prefijosUsados = new Set();
    function generarPrefijoUnico() {
        let prefijo;
        do {
            prefijo = Math.floor(1000 + Math.random() * 9000);
        } while (prefijosUsados.has(prefijo));
        prefijosUsados.add(prefijo);
        return prefijo;
    }

    try {
        // --- FASE 1: TRAMA PRINCIPAL ---
        pasoActual++;
        progressBarManager.set( (pasoActual / totalPasos) * 100, `Fase 1: Creando trama principal...`);
        const promptFase1 = `Basado en el guion: "${contenidoGuion}", crea la TRAMA PRINCIPAL de una historia. Debe ser una secuencia lineal de entre 7 y 15 momentos que lleve a un final. Responde ÚNICAMENTE con un JSON: {"momentos": [{"id": "...", "titulo": "...", "descripcion": "...", "esFinal": boolean}]}`;
        const respuestaFase1 = await llamarIAConFeedback(promptFase1, "Generando Trama Principal", MODELO_PRINCIPAL, true, 3);
        if (!respuestaFase1?.momentos?.length) throw new Error("La Fase 1 falló.");
        
        const momentosTroncoOriginales = respuestaFase1.momentos;
        const momentosTronco = momentosTroncoOriginales.map(datos => {
            const prefijo = generarPrefijoUnico();
            return { ...datos, titulo: `[${prefijo}] ${datos.titulo || 'Momento'}` };
        });

        momentosTronco.forEach((datos, index) => {
            if (!momentosTroncoOriginales[index].id) return;
            const nuevoId = `P-${index + 1}`;
            idMapMaestro.set(momentosTroncoOriginales[index].id, nuevoId);
            if (index < momentosTronco.length - 1) {
                datos.acciones = [{ textoBoton: momentosTronco[index+1].titulo, idDestino: momentosTroncoOriginales[index + 1].id }];
            }
            nodosGenerados.set(nuevoId, { ...datos, idFinal: nuevoId, tipo: 'Principal' });
        });

        // --- FASE 2: RAMAS DE FINALES ---
        for (let i = 0; i < numFinales - 1; i++) {
            pasoActual++;
            progressBarManager.set( (pasoActual / totalPasos) * 100,`Fase 2: Creando final alternativo ${i+1}...`);
            const resumenHistoria = generarResumenDeLaHistoriaParaIA(nodosGenerados);
            
            const promptFase2 = `Dada la historia actual:\n${resumenHistoria}\nCrea una RAMA ARGUMENTAL ALTERNATIVA de entre 7 y 15 momentos.
            REGLAS:
            1. Responde ÚNICAMENTE con JSON: {"momentos": [...], "idNodoPadre": "ID_DEL_NODO_P_ELEGIDO"}.
            2. CADA momento debe tener el formato: {"id": "...", "titulo": "...", "descripcion": "...", "esFinal": boolean}.
            3. IMPORTANTE: La nueva rama debe ser CONCEPTUALMENTE DIFERENTE a las ya existentes. NO REPITAS temas o títulos que ya ves en el resumen.`;
            
            const respuestaFase2 = await llamarIAConFeedback(promptFase2, "Generando Final Alternativo", MODELO_PRINCIPAL, true, 3);
            if (!respuestaFase2?.momentos?.length || !respuestaFase2.idNodoPadre) continue;

            const nodoPadreId = respuestaFase2.idNodoPadre.trim();
            if (!nodosGenerados.has(nodoPadreId)) continue;
            
            const momentosDeLaRamaOriginales = respuestaFase2.momentos;
            const momentosDeLaRama = momentosDeLaRamaOriginales.map(datos => {
                const prefijo = generarPrefijoUnico();
                return { ...datos, titulo: `[${prefijo}] ${datos.titulo || 'Momento'}` };
            });

            momentosDeLaRama.forEach((datos, index) => {
                const originalData = momentosDeLaRamaOriginales[index];
                if (!originalData.id) return;
                const nuevoId = `${nodoPadreId}-B${i+1}-${index + 1}`;
                idMapMaestro.set(originalData.id, nuevoId);
                if (index < momentosDeLaRama.length - 1) {
                    datos.acciones = [{ textoBoton: momentosDeLaRama[index+1].titulo, idDestino: momentosDeLaRamaOriginales[index + 1].id }];
                }
                nodosGenerados.set(nuevoId, { ...datos, idFinal: nuevoId, tipo: 'Bifurcacion' });
            });

            const nodoPadreData = nodosGenerados.get(nodoPadreId);
            if(nodoPadreData) {
                if (!nodoPadreData.nuevasAcciones) nodoPadreData.nuevasAcciones = [];
                const primerNodoRama = momentosDeLaRama.find(m => m.id);
                if(primerNodoRama) {
                    const idDestinoMapeado = idMapMaestro.get(momentosDeLaRamaOriginales.find(m => m.id === primerNodoRama.id).id);
                    nodoPadreData.nuevasAcciones.push({ textoBoton: primerNodoRama.titulo, idDestino: idDestinoMapeado });
                }
            }
        }
        
        // --- FASE 3: RAMAS DE RETORNO ---
        for (let i = 0; i < tamanioObra; i++) {
            pasoActual++;
            progressBarManager.set( (pasoActual / totalPasos) * 100,`Fase 3: Creando rama de retorno ${i+1}...`);
            const resumenHistoria = generarResumenDeLaHistoriaParaIA(nodosGenerados);
            
            const promptFase3 = `Dada la historia:\n${resumenHistoria}\nCrea una RAMA de RETORNO de entre 3 y 8 momentos.
            REGLAS:
            1. Debe empezar en un nodo que NO sea 'P' (una rama secundaria).
            2. Debe terminar conectando a un nodo 'P' posterior al origen de la rama secundaria.
            3. Responde ÚNICAMENTE con JSON: {"momentos": [...], "idNodoOrigenSecundario": "ID_ORIGEN", "idNodoDestinoPrincipal": "ID_DESTINO_P"}.
            4. CADA momento debe tener el formato: {"id": "...", "titulo": "...", "descripcion": "...", "esFinal": false}.
            5. IMPORTANTE: La nueva rama debe ser CONCEPTUALMENTE DIFERENTE a las ya existentes. NO REPITAS temas o títulos.`;
            
            const respuestaFase3 = await llamarIAConFeedback(promptFase3, "Generando Rama de Retorno", MODELO_SECUNDARIO, true, 3);
            if (!respuestaFase3?.momentos?.length || !respuestaFase3.idNodoOrigenSecundario || !respuestaFase3.idNodoDestinoPrincipal) continue;
            
            const nodoOrigenId = respuestaFase3.idNodoOrigenSecundario.trim();
            const nodoDestinoId = respuestaFase3.idNodoDestinoPrincipal.trim();
            if (!nodosGenerados.has(nodoOrigenId) || !nodosGenerados.has(nodoDestinoId)) continue;
            
            const momentosDeRetornoOriginales = respuestaFase3.momentos;
            const momentosDeRetorno = momentosDeRetornoOriginales.map(datos => {
                const prefijo = generarPrefijoUnico();
                return { ...datos, titulo: `[${prefijo}] ${datos.titulo || 'Momento'}` };
            });

            momentosDeRetorno.forEach((datos, index) => {
                const originalData = momentosDeRetornoOriginales[index];
                if (!originalData.id) return;
                const nuevoId = `${nodoOrigenId}-S${i+1}-${index + 1}`;
                idMapMaestro.set(originalData.id, nuevoId);
                if (index < momentosDeRetorno.length - 1) {
                    datos.acciones = [{ textoBoton: momentosDeRetorno[index+1].titulo, idDestino: momentosDeRetornoOriginales[index + 1].id }];
                }
                nodosGenerados.set(nuevoId, { ...datos, idFinal: nuevoId, tipo: 'Retorno' });
            });
            
            const nodoOrigenData = nodosGenerados.get(nodoOrigenId);
            if(nodoOrigenData) {
                 if (!nodoOrigenData.nuevasAcciones) nodoOrigenData.nuevasAcciones = [];
                 const primerNodoRetorno = momentosDeRetorno.find(m => m.id);
                 if(primerNodoRetorno) {
                    const idDestinoMapeado = idMapMaestro.get(momentosDeRetornoOriginales.find(m => m.id === primerNodoRetorno.id).id);
                    nodoOrigenData.nuevasAcciones.push({ textoBoton: primerNodoRetorno.titulo, idDestino: idDestinoMapeado });
                 }
            }

            const ultimoNodoRetorno = momentosDeRetorno[momentosDeRetorno.length - 1];
            if(ultimoNodoRetorno) {
                const ultimoNodoRetornoIdOriginal = momentosDeRetornoOriginales.find(m => m.id === ultimoNodoRetorno.id).id;
                const ultimoNodoRetornoIdFinal = idMapMaestro.get(ultimoNodoRetornoIdOriginal);
                const ultimoNodoRetornoData = nodosGenerados.get(ultimoNodoRetornoIdFinal);
                if(ultimoNodoRetornoData) {
                    if (!ultimoNodoRetornoData.acciones) ultimoNodoRetornoData.acciones = [];
                    ultimoNodoRetornoData.acciones.push({ textoBoton: "Volver a la trama", idDestino: nodoDestinoId });
                }
            }
        }

        // --- FASE DE CONSTRUCCIÓN Y RENDERIZADO FINAL ---
        progressBarManager.set(95, 'Construyendo y conectando todo...');
        for (const [id, data] of nodosGenerados.entries()) {
            crearNodoEnLienzo({
                id: data.idFinal,
                titulo: data.titulo || "Sin Título",
                descripcion: data.descripcion,
                entorno: data.entorno || {},
                entidades: data.entidades || [],
                acciones: [], x: 0, y: 0, tipo: data.tipo,
            });
        }
        for (const [id, data] of nodosGenerados.entries()) {
            const nodoElemento = document.getElementById(data.idFinal);
            if (!nodoElemento) continue;
            let accionesFinales = [];
            if (data.acciones) {
                const accionesTraducidas = data.acciones.map(accion => {
                    const idDestinoFinal = idMapMaestro.get(accion.idDestino) || accion.idDestino;
                    return { ...accion, idDestino: idDestinoFinal };
                }).filter(a => a.idDestino);
                accionesFinales.push(...accionesTraducidas);
            }
            if (data.nuevasAcciones) {
                accionesFinales.push(...data.nuevasAcciones);
            }
            nodoElemento.dataset.acciones = JSON.stringify(accionesFinales);
        }

        // --- FINALIZACIÓN Y AUTO-LAYOUT ---
        progressBarManager.set(98, 'Organizando el lienzo...');
        organizarNodosPorFases(nodosGenerados);
        progressBarManager.finish("¡Aventura estructural generada!");

    } catch (error) {
        console.error("Error en la generación estructural:", error);
        progressBarManager.error('Error en la IA');
        alert(`Ocurrió un error en el proceso estructural: ${error.message}`);
    }
}

/**
 * Organiza los nodos en el lienzo basándose en su nomenclatura jerárquica.
 */
function organizarNodosPorFases(nodosGenerados) {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo || nodosGenerados.size === 0) return;

    const NODE_WIDTH = 150;
    const GAP_X = 80;
    const BRANCH_GAP_Y = 250;
    const nodosPorTipo = {
        Principal: [],
        Bifurcacion: [],
        Retorno: []
    };
    const nodosPorPadre = new Map();

    for (const [id, data] of nodosGenerados.entries()) {
        if (nodosPorTipo[data.tipo]) nodosPorTipo[data.tipo].push(data);
        const partesId = id.split('-');
        if (partesId.length > 2) {
            const padreId = partesId.slice(0, -2).join('-');
            if (!nodosPorPadre.has(padreId)) nodosPorPadre.set(padreId, []);
            nodosPorPadre.get(padreId).push(data);
        }
    }

    if (nodosPorTipo.Principal.length === 0) return;

    nodosPorTipo.Principal.sort((a, b) => parseInt(a.idFinal.split('-')[1]) - parseInt(b.idFinal.split('-')[1]));

    const minRequiredWidth = nodosPorTipo.Principal.length * (NODE_WIDTH + GAP_X);
    const centerX = Math.max(200, (lienzo.clientWidth / 2) - (minRequiredWidth / 2));

    nodosPorTipo.Principal.forEach((nodoData, index) => {
        const x = centerX + index * (NODE_WIDTH + GAP_X);
        const y = 300;
        const nodoElement = document.getElementById(nodoData.idFinal);
        if (nodoElement) {
            nodoElement.style.left = `${x}px`;
            nodoElement.style.top = `${y}px`;
        }
    });

    let branchSide = 1;
    for (const padreId of nodosPorTipo.Principal.map(n => n.idFinal)) {
        if (nodosPorPadre.has(padreId)) {
            const hijos = nodosPorPadre.get(padreId);
            const nodoPadreElement = document.getElementById(padreId);
            if (!nodoPadreElement) continue;

            const startX = parseFloat(nodoPadreElement.style.left);
            const startY = parseFloat(nodoPadreElement.style.top) + (branchSide * BRANCH_GAP_Y);

            hijos.sort((a, b) => {
                const partsA = a.idFinal.split('-');
                const partsB = b.idFinal.split('-');
                return parseInt(partsA[partsA.length - 1]) - parseInt(partsB[partsB.length - 1]);
            });

            hijos.forEach((nodoData, index) => {
                const x = startX + index * (NODE_WIDTH + GAP_X);
                const y = startY;
                const nodoElement = document.getElementById(nodoData.idFinal);
                if (nodoElement) {
                    nodoElement.style.left = `${x}px`;
                    nodoElement.style.top = `${y}px`;
                }
            });
            branchSide *= -1;
        }
    }


    reajustarTamanioLienzo();
    setTimeout(() => {
        // Asumiendo que previsualizacionActiva y dibujarConexiones existen en otro fichero
        if (window.previsualizacionActiva) dibujarConexiones();
    }, 100);
}


function reajustarTamanioLienzo() {
    const lienzo = document.getElementById('momentos-lienzo');
    if (!lienzo) return;
    const EXPANSION_MARGIN = 300;
    let maxX = 0,
        maxY = 0;
    lienzo.querySelectorAll('.momento-nodo').forEach(nodo => {
        const x = parseFloat(nodo.style.left) + nodo.offsetWidth;
        const y = parseFloat(nodo.style.top) + nodo.offsetHeight;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    });
    const nuevoAncho = Math.max(lienzo.offsetWidth, maxX + EXPANSION_MARGIN);
    const nuevoAlto = Math.max(lienzo.offsetHeight, maxY + EXPANSION_MARGIN);
    lienzo.style.width = `${nuevoAncho}px`;
    lienzo.style.height = `${nuevoAlto}px`;
}

function _extraerTextoPlanoDeGuionHTML(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
}
 
 

/**
 * [NUEVA FUNCIÓN DE RENDERIZADO]
 * Dibuja el SVG en un canvas panorámico, lo convierte a PNG y lo guarda en el nodo.
 * @param {HTMLElement} nodo - El nodo del momento que se va a actualizar.
 * @param {string} svgContent - El código SVG generado por la IA.
 */
async function guardarIlustracionEnNodo(nodo, svgContent) {
    // 1. Guardamos el SVG crudo en el dataset del nodo.
    // Esto es clave para la exportación y para futuras ediciones.
    nodo.dataset.svgIlustracion = svgContent;

    // 2. Creamos un Data URL directamente desde el string SVG para la visualización.
    // Usamos btoa para codificar en base64 y unescape/encodeURIComponent para manejar caracteres especiales.
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

    // 3. Actualizamos la imagen en el nodo del lienzo principal.
    const imgElementoEnNodo = nodo.querySelector('.momento-imagen');
    if (imgElementoEnNodo) {
        imgElementoEnNodo.src = svgDataUrl;
        nodo.classList.add('con-imagen');
    }

    // 4. Actualizamos la vista previa en el panel de edición si está abierto.
    const imgPreviewEnPanel = document.getElementById('panel-editor-imagen-preview');
    if (imgPreviewEnPanel && panelState.nodoActual === nodo) {
        imgPreviewEnPanel.src = svgDataUrl;
        imgPreviewEnPanel.style.display = 'block';
    }
    
    // La función ya no necesita ser una promesa explícita.
    return Promise.resolve();
}
 

/**
 * [NUEVA FUNCIÓN - El Constructor de Prompts]
 * Crea el prompt final para el ilustrador, combinando la acción del momento
 * con la guía de diseño detallada.
 * @param {string} descripcionMomento - La descripción original de la escena.
 * @param {object} elementosDescritos - El objeto con las descripciones visuales para la escena.
 * @returns {string} El prompt de ilustración final y detallado.
 */
function crearPromptConsistenteParaEscena(descripcionMomento, elementosDescritos) {
    let guiaVisualTexto = "Usa la siguiente guía de diseño obligatoria para los elementos:\n";
    for (const [elemento, descripcion] of Object.entries(elementosDescritos)) {
        guiaVisualTexto += `- **${elemento}:** ${descripcion}\n`;
    }

    // El prompt de ilustración original, ahora enriquecido
    return `
        Eres un ilustrador experto en crear escenas y paisajes atmosféricos en formato SVG.
        Tu tarea es convertir una descripción textual en una ilustración SVG panorámica, siguiendo una guía de diseño estricta.

        **Descripción de la Escena a Ilustrar:**
        ---
        ${descripcionMomento}
        ---

        **Guía de Diseño OBLIGATORIA:**
        ---
        ${guiaVisualTexto}
        ---

        **Instrucciones de Dibujo OBLIGATORIAS:**
        1.  **Estilo:** Utiliza un estilo de ilustración "flat design" o "vectorial limpio".
        2.  **Composición:** Crea una escena completa con fondo, plano medio y primer plano.
        3.  **Atmósfera:** Usa el color y la iluminación para transmitir la atmósfera descrita.
        4.  **Formato SVG Panorámico:** El SVG DEBE usar un viewBox="0 0 1920 1080".
        5.  **Fondo Transparente:** El fondo debe ser transparente.

        **Formato de Respuesta OBLIGATORIO:**
        Responde ÚNICAMENTE con un objeto JSON válido: { "svgContent": "<svg>...</svg>" }
    `;
}

 
/**
 * [MODIFICADA CON PASO DE COMPOSICIÓN]
 * Realiza el trabajo de generar y refinar la imagen para un único nodo.
 * Ahora incluye un "Paso 0" para decidir qué elementos de la guía usar.
 * @param {HTMLElement} nodo - El nodo del momento a procesar.
 * @param {object} guiaDeDiseno - La guía de diseño MAESTRA generada por el analizador.
 * @returns {Promise<{status: string, id: string, error?: string}>} El resultado del proceso.
 */
async function generarYRefinarImagenParaNodo(nodo, guiaDeDiseno) {
    const tituloNodo = nodo.querySelector('.momento-titulo').textContent;
    const descripcionMomento = nodo.dataset.descripcion;

    try {
        // --- PASO 0: Composición de la Escena ---
        // Se hace una llamada a la IA para que decida qué elementos de la guía aplican a esta escena.
        const promptComposicion = `
            Eres un Director de Fotografía y Compositor de Escenas. Tu misión es interpretar la narrativa de una escena y seleccionar los elementos visuales precisos de un catálogo para construirla.

            **FILOSOFÍA DE COMPOSICIÓN:**
            - **Menos es más:** Selecciona SOLO los elementos esenciales para contar la historia de este momento. No satures la escena.
            - **Foco narrativo:** Tu selección debe guiar la mirada del espectador hacia el punto clave de la descripción.
            - **Respeto al catálogo:** No inventes elementos. Usa únicamente los que se proveen en la guía de diseño.

            **Guía de Diseño Disponible (Catálogo de Elementos):**
            ---
            ${JSON.stringify(guiaDeDiseno, null, 2)}
            ---

            **Descripción de la Escena Específica a Componer:**
            ---
            "${descripcionMomento}"
            ---

            **Tu Tarea:**
            1. Lee la "Descripción de la Escena Específica".
            2. Revisa la "Guía de Diseño Disponible" y elige SÓLO los elementos que aparecen explícita o implícitamente en la descripción.
            3. Devuelve ÚNICAMENTE un objeto JSON con una clave "elementos". El valor será un objeto que contiene solo los elementos seleccionados y sus descripciones completas de la guía.

            **Ejemplo de respuesta JSON esperada:**
            {
              "elementos": {
                "Kaelen, el Guardián del Velo": {
                  "Concepto Central": "Un antiguo guerrero cuya armadura se ha fusionado con la corteza de un árbol arcano...",
                  "F - Forma y Estructura": "Silueta imponente y ancha...",
                  "M - Material y Textura": "La armadura es de un metal similar al bronce...",
                  "C - Paleta de Color": "Tonos tierra dominantes...",
                  "L - Interacción con la Luz": "La superficie es mayormente mate...",
                  "Detalles Distintivos": "Una enredadera con pequeñas flores blancas..."
                },
                "Puente de los Susurros": "..."
              }
            }
        `;
        
        const feedbackComposicion = `Componiendo: "${tituloNodo}"`;
        const respuestaComposicion = await llamarIAConFeedback(promptComposicion, feedbackComposicion, 'gemini-2.5-flash-lite', true, 1);
        
        if (!respuestaComposicion || !respuestaComposicion.elementos) {
            throw new Error("La IA de composición no devolvió una lista de elementos válida.");
        }
        
        // Creamos el prompt de ilustración final con los elementos seleccionados para esta escena.
        const promptConsistente = crearPromptConsistenteParaEscena(descripcionMomento, respuestaComposicion.elementos);


        // --- PASO A: Generar Borrador (utiliza el prompt recién creado) ---
        const respuestaIlustracion = await llamarIAConFeedback(promptConsistente, `Ilustrando: "${tituloNodo}"`, 'gemini-2.5-flash', true, 1);
        if (!respuestaIlustracion || !respuestaIlustracion.svgContent) {
            throw new Error("La IA no devolvió un borrador de SVG.");
        }
        const svgInicial = respuestaIlustracion.svgContent;

        // --- PASO B: Primer Refinamiento (Artístico) ---
        const promptDeMejoraGenerico = `
            Eres un Artista Digital especialista en refinamiento de ilustraciones SVG. Tu tarea es tomar un borrador y elevarlo a un nivel profesional.

            **FILOSOFÍA DE REFINAMIENTO:**
            - **Mejora, no reemplaces:** Mantén la composición y los elementos centrales del borrador. Tu trabajo es embellecerlo.
            - **Coherencia Visual:** Respeta el estilo y las descripciones de la guía de diseño implícita en el SVG original.
            - **Impacto Emocional:** Usa la luz, el color y la textura para acentuar la atmósfera descrita en la escena.

            **Tu Tarea:**
            1. Analiza el SVG base.
            2. Mejora la **iluminación**: añade fuentes de luz creíbles, sombras profundas y brillos para dar volumen.
            3. Enriquece las **texturas**: simula las superficies descritas (metal, piedra, tela, piel).
            4. Refina el **trazado**: ajusta el grosor de las líneas para crear profundidad y foco.
            5. Devuelve únicamente el código SVG mejorado.
        `;
        const svgMejorado = await mejorarSVG(svgInicial, promptDeMejoraGenerico, `Refinando: "${tituloNodo}"`, 'gemini-2.0-flash');

        // --- PASO C: Refinamiento Final ---
        const svgRefinadoFinal = svgMejorado;
        
        // --- PASO D: Guardar en el nodo ---
        await guardarIlustracionEnNodo(nodo, svgRefinadoFinal);

        return { status: 'fulfilled', id: nodo.id };

    } catch (error) {
        console.error(`Error procesando el nodo ${nodo.id}:`, error);
        const imgElemento = nodo.querySelector('.momento-imagen');
        if (imgElemento) imgElemento.parentElement.innerHTML += '<p style="color:red; font-size:10px;">Error IA</p>';
        
        return { status: 'rejected', id: nodo.id, error: error.message };
    }
}

/**
 * [VERSIÓN FINAL EN PARALELO Y POR LOTES]
 * Orquesta la ilustración de todos los momentos aplicando una fase de análisis secuencial
 * seguida de una fase de generación y refinamiento en paralelo por lotes de 12.
 */
/**
 * [NUEVA FUNCIÓN AYUDANTE PARA LOTES]
 * Se encarga de procesar un único lote de imágenes en paralelo.
 * @param {Array} lote - El array de nodos con datos para procesar.
 * @param {number} numeroDeLote - El número identificador del lote (ej. 1, 2, 3...).
 * @param {number} totalLotes - El número total de lotes.
 */
async function procesarLote(lote, numeroDeLote, totalLotes) {
    console.log(`--- INICIANDO LOTE ${numeroDeLote} de ${totalLotes} ---`);
    
    // Actualizamos la barra de progreso al iniciar el lote.
    // El progreso se calcula basado en el número de lotes que han comenzado.
    const progress = 30 + ((numeroDeLote - 1) / totalLotes) * 70;
    progressBarManager.set(progress, `Procesando lote ${numeroDeLote} de ${totalLotes} (${lote.length} imágenes en paralelo)...`);

    // Creamos el array de promesas para el lote actual.
    const promesasDelLote = lote.map(({ nodo, promptConsistente }) =>
        generarYRefinarImagenParaNodo(nodo, promptConsistente)
    );

    // Ejecutamos todas las promesas del lote en paralelo y esperamos a que terminen.
    const resultados = await Promise.allSettled(promesasDelLote);
    
    console.log(`--- LOTE ${numeroDeLote} FINALIZADO. Resultados:`, resultados);
}
/**
 * [MODIFICADA] Analiza un LOTE completo de momentos para crear una GUÍA DE DISEÑO única y consistente.
 * Ya no se encarga de asignar elementos a cada momento individual.
 * @param {Array<object>} loteDeMomentos - Array de objetos, ej: [{idTemporal: 1, descripcion: "..."}].
 * @param {object} guiaDeDisenoExistente - El objeto con los diseños de lotes anteriores.
 * @returns {Promise<object>} Devuelve únicamente el objeto de la guía de diseño actualizada.
 */
/**
 * Analiza un lote de momentos o escenas para expandir una guía de diseño visual existente.
 * Utiliza un prompt detallado para instruir a la IA a actuar como un Director de Arte,
 * asegurando coherencia y descripciones ricas y estructuradas.
 *
 * @param {Array<Object>} loteDeMomentos - El nuevo conjunto de escenas a analizar.
 * @param {Object} guiaDeDisenoExistente - El objeto JSON con la guía de diseño actual.
 * @returns {Promise<Object>} Una promesa que se resuelve con la guía de diseño actualizada.
 * @throws {Error} Si la IA no devuelve la estructura JSON esperada después de varios intentos.
 */
async function analizarLoteDeMomentos(loteDeMomentos, guiaDeDisenoExistente) {
    // --- El Prompt Mejorado ---
    // Este prompt es mucho más detallado para guiar a la IA hacia un resultado de alta calidad.
    // Define una "persona", una filosofía de diseño y un formato de salida muy específico.
    const promptAnalisisPorLote = `
        Eres un prestigioso Director de Arte y Diseñador de Producción con una visión excepcional para la coherencia visual y la narrativa a través de la imagen. Tu especialidad es crear mundos cohesivos y memorables. Tu tarea es expandir una guía de diseño existente analizando un nuevo lote de momentos o escenas de una historia.

        **FILOSOFÍA DE DISEÑO:**
        - **Coherencia ante todo:** Cada nuevo elemento debe sentirse parte del mismo universo que los elementos existentes.
        - **La forma sigue a la función:** El diseño de un elemento (personaje, objeto, lugar) debe reflejar su propósito, historia y personalidad.
        - **Especificidad sobre generalidad:** Evita descripciones vagas. En lugar de "una espada", describe "una hoja de acero damasquino, con una guarda de bronce en forma de alas de halcón y una empuñadura de cuero gastado".

        **Guía de Diseño Existente (Base para tu trabajo):**
        ---
        ${JSON.stringify(guiaDeDisenoExistente, null, 2)}
        ---

        **Nuevo Lote de Momentos a Integrar:**
        ---
        ${JSON.stringify(loteDeMomentos, null, 2)}
        ---

        **INSTRUCCIONES DETALLADAS:**

        1.  **Analiza Holísticamente:** Lee y comprende todas las escenas del nuevo lote para captar el contexto y las interacciones entre los elementos.
        2.  **Identifica Entidades Clave:** Extrae los sustantivos principales que requieren diseño visual (personajes, criaturas, objetos importantes, localizaciones, vehículos, etc.).
        3.  **Verifica y Reutiliza:** Antes de crear algo nuevo, comprueba rigurosamente si la entidad ya existe en la "Guía de Diseño Existente". Si es así, **DEBES** reutilizar su descripción para mantener la consistencia. No la modifiques.
        4.  **Diseña Nuevas Entidades:** Si una entidad es nueva, crea una descripción visual rica y estructurada. Utiliza el siguiente formato como guía para tus descripciones:
            * **Concepto Central:** Una o dos frases que capturen la esencia del elemento.
            * **F - Forma y Estructura:** Describe su silueta, geometría, proporciones y construcción. ¿Es angular, orgánico, simétrico, caótico?
            * **M - Material y Textura:** ¿De qué está hecho? Describe los materiales (madera, piedra, metal, tela) y sus texturas (rugoso, liso, pulido, oxidado, gastado).
            * **C - Paleta de Color:** Define los colores dominantes, secundarios y de acento. Menciona la saturación y el brillo (p. ej., "ocres desaturados, con toques de carmesí y azul cobalto").
            * **L - Interacción con la Luz:** ¿Cómo refleja, absorbe o emite luz? ¿Es mate, brillante, translúcido, bioluminiscente?
            * **Detalles Distintivos:** Menciona cualquier característica única, como cicatrices, grabados, patrones recurrentes, o símbolos importantes.

        5.  **Genera el JSON Final:** Tu única salida debe ser un objeto JSON que contenga una única clave: \`guiaActualizada\`. El valor de esta clave será la guía de diseño completa, fusionando la guía existente con las nuevas descripciones que has creado. No añadas comentarios, explicaciones ni ningún otro texto fuera del objeto JSON.

        **Ejemplo Detallado de Respuesta JSON Esperada:**
        {
          "guiaActualizada": {
            "Kaelen, el Guardián del Velo": {
              "Concepto Central": "Un antiguo guerrero cuya armadura se ha fusionado con la corteza de un árbol arcano. Irradia una calma estoica y una fuerza latente.",
              "F - Forma y Estructura": "Silueta imponente y ancha. Formas angulares y masivas en la armadura de placas...",
              "M - Material y Textura": "La armadura es de un metal similar al bronce, pero con una pátina verde musgo...",
              "C - Paleta de Color": "Tonos tierra dominantes: marrones profundos, ocres, verdes musgo desaturados...",
              "L - Interacción con la Luz": "La superficie es mayormente mate, absorbiendo la luz...",
              "Detalles Distintivos": "Una enredadera con pequeñas flores blancas crece desde su guantelete derecho..."
            },
            "El Orbe del Silencio": {
              "Concepto Central": "Un artefacto esférico que absorbe todo sonido a su alrededor...",
              "F - Forma y Estructura": "Una esfera perfecta de aproximadamente 30 cm de diámetro...",
              "M - Material y Textura": "Parece obsidiana pulida, pero no refleja la luz...",
              "C - Paleta de Color": "Negro absoluto, un vacío de color...",
              "L - Interacción con la Luz": "Totalmente mate. No produce reflejos...",
              "Detalles Distintivos": "Cuando alguien intenta hablar cerca, finísimas y casi invisibles grietas de luz violeta recorren su superficie..."
            }
          }
        }
    `;

    // --- Lógica de Ejecución y Reintentos ---
    const MAX_INTENTOS = 3;
    const RETRY_DELAY_MS = 2500; // Tiempo de espera entre reintentos

    for (let i = 1; i <= MAX_INTENTOS; i++) {
        try {
            const feedback = `Analizando guía de diseño (${loteDeMomentos.length} escenas, Intento ${i}/${MAX_INTENTOS})...`;
            
            // Asumimos que esta función existe y maneja la llamada a la API de la IA.
            // El 'true' fuerza la respuesta en formato JSON.
            const respuestaIA = await llamarIAConFeedback(promptAnalisisPorLote, feedback, 'gemini-2.5-flash', true, 1);

            // Validación robusta: nos aseguramos de que la respuesta sea un objeto
            // y que contenga la clave `guiaActualizada`, que también debe ser un objeto.
            if (respuestaIA && typeof respuestaIA === 'object' && respuestaIA.guiaActualizada && typeof respuestaIA.guiaActualizada === 'object') {
                console.log(`✅ Análisis de guía de diseño exitoso en el intento ${i}.`);
                return respuestaIA.guiaActualizada; // ¡Éxito! Devolvemos solo el objeto de la guía.
            }
            
            // Si la estructura no es la correcta, lo registramos para depuración.
            console.warn(`Intento ${i}/${MAX_INTENTOS} no devolvió la estructura JSON esperada. Respuesta recibida:`, JSON.stringify(respuestaIA, null, 2));

        } catch (error) {
            // Capturamos errores de red o de la API.
            console.error(`Intento ${i}/${MAX_INTENTOS} falló con un error de API:`, error.message);
        }

        // Esperamos antes del siguiente reintento, solo si no es el último intento.
        if (i < MAX_INTENTOS) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
    
    // Si todos los intentos fallan, lanzamos un error claro.
    throw new Error("La IA de análisis de guía no devolvió una respuesta válida después de varios intentos.");
}

 
/**
 * [MODIFICADO] Orquesta la ilustración siguiendo el nuevo pipeline de 2 fases:
 * 1. Análisis por lotes para crear una guía de diseño maestra.
 * 2. Ilustración por lotes, donde cada nodo compone su propia escena.
 */
async function ilustrarTodoEnParaleloPorLotes() {
    // ... (código inicial de confirmación y filtrado de nodos sin cambios) ...
    const nodosTotales = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    const BATCH_SIZE = 9;
    const DELAY_ENTRE_LOTES = 55000;

    if (!confirm(`Esto iniciará un proceso de ilustración en modo PIPELINE.
- El análisis y la ilustración se harán por lotes de ${BATCH_SIZE}.
- La ilustración de un lote comenzará tan pronto como su análisis termine, de forma escalonada.
¿Deseas continuar?`)) {
        return;
    }

    const nodosAIlustrar = Array.from(nodosTotales).filter(nodo => {
        const descripcion = nodo.dataset.descripcion || '';
        const tieneImagen = nodo.querySelector('.momento-imagen')?.src.includes('data:image');
        return descripcion.trim().length >= 10 && !tieneImagen;
    });

    if (nodosAIlustrar.length === 0) {
        alert("No se encontraron momentos que necesiten ilustración.");
        return;
    }
    
    progressBarManager.start('Iniciando proceso de ilustración en pipeline...');

    try {
        let guiaDeDisenoMaestra = {};
        const promesasDeTodosLosLotes = [];

        const lotesDeNodos = [];
        for (let i = 0; i < nodosAIlustrar.length; i += BATCH_SIZE) {
            lotesDeNodos.push(nodosAIlustrar.slice(i, i + BATCH_SIZE));
        }

        for (let i = 0; i < lotesDeNodos.length; i++) {
            const loteActualNodos = lotesDeNodos[i];
            const numeroDeLote = i + 1;

            // --- PASO 1: ANALIZAR EL LOTE ACTUAL (para obtener la guía de diseño) ---
            const progress = 5 + (i / lotesDeNodos.length) * 45;
            progressBarManager.set(progress, `Analizando guía de diseño del lote ${numeroDeLote} de ${lotesDeNodos.length}...`);

            const momentosParaAnalizar = loteActualNodos.map((nodo, index) => ({
                idTemporal: `temp_${index}`,
                descripcion: nodo.dataset.descripcion
            }));
            
            // [MODIFICADO] Ahora solo esperamos la guía de diseño.
            guiaDeDisenoMaestra = await analizarLoteDeMomentos(momentosParaAnalizar, guiaDeDisenoMaestra);

            // [MODIFICADO] Preparamos los datos para la fase de ilustración.
            // Simplemente pasamos cada nodo junto con la guía maestra completa.
            const nodosParaIlustrarEsteLote = loteActualNodos.map(nodo => ({
                nodo,
                guiaDeDiseno: guiaDeDisenoMaestra
            }));

            // --- PASO 2: PROGRAMAR LA ILUSTRACIÓN DEL LOTE ACTUAL ---
            const delayDeInicio = i * DELAY_ENTRE_LOTES;
            console.log(`Análisis del Lote ${numeroDeLote} completado. Programando su ilustración para que inicie en ${delayDeInicio / 1000}s.`);
            
            // [MODIFICADO] Modificamos la función 'procesarLote' para que acepte el nuevo formato de datos.
            // (La adaptación de procesarLote es implícita y se muestra a continuación)

            const promesaDelLote = new Promise(resolve => {
                setTimeout(async () => {
                    await procesarLote(nodosParaIlustrarEsteLote, numeroDeLote, lotesDeNodos.length);
                    resolve();
                }, delayDeInicio);
            });

            promesasDeTodosLosLotes.push(promesaDelLote);
        }

        await Promise.all(promesasDeTodosLosLotes);
        progressBarManager.finish('¡Proceso de ilustración en pipeline finalizado!');

    } catch (error) {
        console.error("Error crítico en el proceso de ilustración en pipeline:", error);
        progressBarManager.error("Proceso cancelado por un error crítico");
        alert(`Ocurrió un error general durante la ilustración: ${error.message}`);
    }
}


// Es necesario un pequeño ajuste en `procesarLote` para que pase los argumentos correctos.
async function procesarLote(lote, numeroDeLote, totalLotes) {
    console.log(`--- INICIANDO LOTE ${numeroDeLote} de ${totalLotes} ---`);
    
    const progress = 30 + ((numeroDeLote - 1) / totalLotes) * 70;
    progressBarManager.set(progress, `Procesando lote ${numeroDeLote} de ${totalLotes} (${lote.length} imágenes)...`);

    // [MODIFICADO] El mapeo ahora extrae 'nodo' y 'guiaDeDiseno' para pasarlos a la función de ilustración.
    const promesasDelLote = lote.map(({ nodo, guiaDeDiseno }) =>
        generarYRefinarImagenParaNodo(nodo, guiaDeDiseno)
    );

    const resultados = await Promise.allSettled(promesasDelLote);
    console.log(`--- LOTE ${numeroDeLote} FINALIZADO. Resultados:`, resultados);
}
 


/**
 * [MODIFICADA] Toma un SVG existente y lo refina usando un modelo de IA específico.
 * @param {string} svgExistente - El código SVG del "borrador" a mejorar.
 * @param {string} promptMejora - La instrucción para la IA sobre cómo refinar el SVG.
 * @param {string} feedback - El mensaje a mostrar en la barra de progreso.
 
 * @returns {Promise<string>} El código del SVG mejorado.
 */
async function mejorarSVG(svgExistente, promptMejora, feedback, modelo = ' ') { // <-- Parámetro de modelo añadido
    // Creamos el prompt de mejora.
    const promptFinalMejora = `
        Eres un ilustrador experto en refinar arte vectorial. Tu tarea es mejorar un SVG existente basándote en una instrucción.
        SVG ACTUAL:
        \`\`\`xml
        ${svgExistente}
        \`\`\`
        INSTRUCCIÓN DE MEJORA: "${promptMejora}"
        TAREAS OBLIGATORIAS:
        1. Analiza el SVG y la instrucción.
        2. Refina el dibujo: añade más detalles, mejora los colores, aplica degradados sutiles y mejora las sombras y luces para dar más volumen y realismo.
        3. Mantén la coherencia estructural. Todas las partes deben seguir conectadas de forma lógica.
        4. Responde ÚNICAMENTE con el código del NUEVO SVG mejorado. No incluyas explicaciones ni comentarios.
    `;

    // Llamamos a la IA con el modelo especificado
    const respuestaMejora = await llamarIAConFeedback(promptFinalMejora, feedback, modelo, false);

    if (typeof extraerBloqueSVG !== 'function') {
        console.error("La función 'extraerBloqueSVG' no está disponible globalmente.");
        return respuestaMejora.match(/<svg[\s\S]*?<\/svg>/)?.[0] || respuestaMejora;
    }

    const svgMejorado = extraerBloqueSVG(respuestaMejora);
    if (!svgMejorado) {
        console.warn("La mejora no devolvió un SVG válido, se usará el SVG anterior.");
        return svgExistente;
    }

    return svgMejorado;
}