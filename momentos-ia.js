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
 * [MEJORADA] Convierte el estado actual del mapa de nodos en un resumen de texto para la IA,
 * incluyendo ahora una parte de la descripción para dar más contexto.
 */

// Añade estas tres funciones a momentos-ia.js

/**
 * [NUEVA FUNCIÓN ORQUESTADORA]
 * Se activa al pulsar el botón 'Ilustrar' y gestiona todo el proceso.
 */
/**
 * [ACTUALIZADA] Orquestador para el botón individual.
 * Ahora simplemente envuelve la llamada a la nueva función de procesamiento.
 */
async function ilustrarMomentoConIA() {
    const nodoActual = panelState.nodoActual;
    if (!nodoActual) {
        alert("No hay ningún momento seleccionado para ilustrar.");
        return;
    }

    progressBarManager.start('Analizando descripción de la escena...');

    try {
        await procesarIlustracionParaUnNodo(nodoActual);
        progressBarManager.finish("¡Ilustración añadida con éxito!");
    } catch (error) {
        console.error("Error al ilustrar momento con IA:", error);
        progressBarManager.error("Error de la IA");
        // No mostramos alerta aquí porque procesarIlustracionParaUnNodo ya lo hace
    }
}

/**
 * [NUEVA FUNCIÓN DE PROMPT]
 * Crea un prompt de IA optimizado para generar una escena panorámica en SVG.
 * @param {string} descripcion - La descripción del momento.
 * @returns {string} El prompt completo para la IA.
 */
function crearPromptParaIlustrarEscena(descripcion) {
    return `
        Eres un ilustrador experto en crear escenas y paisajes atmosféricos en formato SVG.
        Tu tarea es convertir una descripción textual en una ilustración SVG panorámica.

        **Descripción de la Escena:**
        ---
        ${descripcion}
        ---

        **Instrucciones de Dibujo OBLIGATORIAS:**
        1.  **Estilo:** Utiliza un estilo de ilustración "flat design" o "vectorial limpio", con colores bien definidos y formas claras. Evita el fotorrealismo.
        2.  **Composición:** Crea una escena completa. Debe tener un fondo (cielo, paredes), un plano medio (árboles, edificios, terreno) y, si aplica, un primer plano (objetos cercanos).
        3.  **Atmósfera:** Usa el color y la iluminación para transmitir la atmósfera descrita (ej. tonos fríos para una escena nocturna, colores cálidos para una escena alegre).
        4.  **Formato SVG Panorámico:** El SVG DEBE usar un viewBox="0 0 1280 720" para crear una imagen panorámica (aspecto 16:9).
        5.  **Fondo Transparente:** El SVG no debe tener un <rect> de fondo de color sólido. El fondo debe ser transparente.

        **Formato de Respuesta OBLIGATORIO:**
        Responde ÚNICAMENTE con un objeto JSON válido que contenga el código SVG. No incluyas explicaciones ni texto fuera del JSON.
        Ejemplo de respuesta válida:
        {
          "svgContent": "<svg viewBox='0 0 1280 720' xmlns='http://www.w3.org/2000/svg'>...</svg>"
        }
    `;
}

/**
 * [NUEVA FUNCIÓN DE RENDERIZADO]
 * Dibuja el SVG en un canvas panorámico, lo convierte a PNG y lo guarda en el nodo.
 * @param {HTMLElement} nodo - El nodo del momento que se va a actualizar.
 * @param {string} svgContent - El código SVG generado por la IA.
 */
async function guardarIlustracionEnNodo(nodo, svgContent) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Dimensiones panorámicas (16:9)
        canvas.width = 1280;
        canvas.height = 720;

        // Convertir el SVG a un Data URL para que pueda ser cargado en un objeto Image
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // Dibujar la imagen SVG en el canvas
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url); // Liberar memoria

            // Convertir el contenido del canvas a un PNG en formato base64
            const pngDataUrl = canvas.toDataURL('image/png');

            // Actualizar la imagen directamente en el nodo del lienzo principal
            const imgElementoEnNodo = nodo.querySelector('.momento-imagen');
            if (imgElementoEnNodo) {
                imgElementoEnNodo.src = pngDataUrl;
                nodo.classList.add('con-imagen'); // Clase para mostrar la imagen y ocultar el botón de carga
            }
            
            // También actualizamos la vista previa en el panel de edición si está abierto
            const imgPreviewEnPanel = document.getElementById('panel-editor-imagen-preview');
            if (imgPreviewEnPanel && panelState.nodoActual === nodo) {
                imgPreviewEnPanel.src = pngDataUrl;
                imgPreviewEnPanel.style.display = 'block';
            }

            resolve();
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("No se pudo cargar el SVG generado en la imagen."));
        };

        img.src = url;
    });
}


/**
 * [NUEVA FUNCIÓN PRINCIPAL]
 * Itera sobre todos los nodos del lienzo y los ilustra uno por uno con un retardo.
 */
async function ilustrarTodo() {
    // 1. Confirmación del usuario
    const nodosTotales = document.querySelectorAll('#momentos-lienzo .momento-nodo');
    if (!confirm(`Esto iniciará un proceso para ilustrar ${nodosTotales.length} momentos.
El proceso se ejecutará en segundo plano con una pausa de 6 segundos por cada momento.
¿Deseas continuar?`)) {
        return;
    }

    // 2. Obtener y filtrar los nodos que necesitan ilustración
    const nodosAIlustrar = Array.from(nodosTotales).filter(nodo => {
        const descripcion = nodo.dataset.descripcion || '';
        // Solo procesamos nodos con descripción y sin una imagen ya cargada (evita re-ilustrar)
        const tieneImagen = nodo.querySelector('.momento-imagen')?.src.includes('data:image');
        return descripcion.trim().length >= 10 && !tieneImagen;
    });

    if (nodosAIlustrar.length === 0) {
        alert("No se encontraron momentos con descripción suficiente que necesiten ser ilustrados.");
        return;
    }

    // 3. Iniciar el proceso
    progressBarManager.start(`Ilustrando 0 de ${nodosAIlustrar.length} momentos...`);
    let nodosProcesados = 0;

    try {
        // 4. Bucle principal con retardo
        for (const nodo of nodosAIlustrar) {
            progressBarManager.set(
                (nodosProcesados / nodosAIlustrar.length) * 100,
                `Ilustrando momento ${nodosProcesados + 1} de ${nodosAIlustrar.length}...`
            );

            try {
                // Llama a la lógica de ilustración para un solo nodo
                await procesarIlustracionParaUnNodo(nodo);
            } catch (error) {
                // Si un nodo falla, lo registramos y continuamos con el siguiente
                console.error(`Falló la ilustración para el nodo ${nodo.id}:`, error);
            }
            
            nodosProcesados++;

            // 5. Pausa de 6 segundos (excepto en el último nodo)
            if (nodosProcesados < nodosAIlustrar.length) {
                await new Promise(resolve => setTimeout(resolve, 6000));
            }
        }

        progressBarManager.finish('¡Todos los momentos han sido ilustrados!');

    } catch (error) {
        // Error general del proceso
        console.error("Error en el proceso de ilustración total:", error);
        progressBarManager.error("Proceso cancelado por un error");
        alert(`Ocurrió un error general durante la ilustración: ${error.message}`);
    }
}


/**
 * [NUEVA FUNCIÓN REFACTORIZADA]
 * Contiene la lógica para ilustrar un único nodo. Es llamada tanto por 'ilustrarTodo'
 * como por el botón individual del panel.
 * @param {HTMLElement} nodo - El nodo del momento a ilustrar.
 */
async function procesarIlustracionParaUnNodo(nodo) {
    const descripcion = nodo.dataset.descripcion;
    if (!descripcion || descripcion.trim().length < 10) {
        // Si se llama directamente, avisa al usuario. Si es en lote, simplemente retorna.
        if (!progressBarManager.isActive) {
            alert("La descripción del momento es muy corta. Escribe más detalles.");
        }
        return Promise.reject("Descripción demasiado corta.");
    }

    // Crear el prompt y llamar a la IA
    const promptParaEscena = crearPromptParaIlustrarEscena(descripcion);
    const respuestaIA = await llamarIAConFeedback(promptParaEscena, `Ilustrando: "${nodo.querySelector('.momento-titulo').textContent}"`, 'gemini-1.5-flash-latest', true, 1);

    if (!respuestaIA || !respuestaIA.svgContent) {
        throw new Error("La IA no devolvió un contenido SVG válido.");
    }

    // Renderizar y guardar la imagen
    await guardarIlustracionEnNodo(nodo, respuestaIA.svgContent);
}