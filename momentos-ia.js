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
        4.  **Formato SVG Panorámico:** El SVG DEBE usar un viewBox="0 0 1920 1080" para crear una imagen panorámica (aspecto 16:9).
        5.  **Fondo Transparente:** El SVG no debe tener un <rect> de fondo de color sólido. El fondo debe ser transparente.

        **Formato de Respuesta OBLIGATORIO:**
        Responde ÚNICAMENTE con un objeto JSON válido que contenga el código SVG. No incluyas explicaciones ni texto fuera del JSON.
        Ejemplo de respuesta válida:
        {
          "svgContent": "<svg viewBox='0 0 1920 1080' xmlns='http://www.w3.org/2000/svg'>...</svg>"
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
        canvas.width = 1920;
        canvas.height = 1080;

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
 * [MODIFICADA] Contiene la lógica para ilustrar un único nodo en DOS PASOS:
 * 1. Genera un SVG base.
 * 2. Lo refina con otra llamada a la IA.
 * @param {HTMLElement} nodo - El nodo del momento a ilustrar.
 */
async function procesarIlustracionParaUnNodo(nodo) {
    const descripcion = nodo.dataset.descripcion;
    if (!descripcion || descripcion.trim().length < 10) {
        if (!progressBarManager.isActive) {
            alert("La descripción del momento es muy corta. Escribe más detalles.");
        }
        return Promise.reject("Descripción demasiado corta.");
    }

    // --- INICIO DE LA MODIFICACIÓN ---

    // PASO 1: Generar el SVG inicial (el "borrador")
    const promptParaEscena = crearPromptParaIlustrarEscena(descripcion);
    const respuestaInicial = await llamarIAConFeedback(promptParaEscena, `Creando borrador para: "${nodo.querySelector('.momento-titulo').textContent}"`, 'gemini-2.5-flash-lite', true, 1);

    if (!respuestaInicial || !respuestaInicial.svgContent) {
        throw new Error("La IA no devolvió un SVG inicial válido.");
    }
    const svgInicial = respuestaInicial.svgContent;

    // PASO 2: Mejorar el SVG recién generado
    const promptDeMejoraGenerico = "Añade más detalle, mejora la iluminación y las texturas para un acabado más profesional y artístico.";
    const svgMejorado = await mejorarSVG(svgInicial, promptDeMejoraGenerico, `Refinando ilustración para: "${nodo.querySelector('.momento-titulo').textContent}"`);
    
    // PASO 3: Renderizar y guardar la imagen MEJORADA
    await guardarIlustracionEnNodo(nodo, svgMejorado);
    
    // --- FIN DE LA MODIFICACIÓN ---
}

/**
 * [NUEVA FUNCIÓN - El Director de Arte]
 * Analiza una descripción, identifica elementos clave y los describe visualmente,
 * manteniendo consistencia con una guía de diseño existente.
 * @param {string} descripcionMomento - La descripción de la escena actual. ej: "hombre en la luna".
 * @param {object} guiaDeDisenoExistente - El objeto con los diseños ya definidos.
 * @returns {Promise<object>} Un objeto con las descripciones de los elementos para ESTA escena.
 */
async function analizarYDescribirElementos(descripcionMomento, guiaDeDisenoExistente) {
    const promptAnalisis = `
        Eres un director de arte y diseñador de producción. Tu tarea es mantener la consistencia visual.
        Analiza la descripción de una nueva escena y una guía de diseño con elementos ya definidos.

        **Guía de Diseño Existente (JSON):**
        ---
        ${JSON.stringify(guiaDeDisenoExistente, null, 2)}
        ---

        **Descripción de la Nueva Escena:**
        ---
        "${descripcionMomento}"
        ---

        **Tus Tareas:**
        1.  Identifica los 2-4 sustantivos o elementos visuales más importantes de la "Nueva Escena" (ej: 'hombre', 'luna', 'nave espacial').
        2.  Para cada elemento, comprueba si ya existe en la "Guía de Diseño Existente".
        3.  Si un elemento YA EXISTE en la guía, usa su descripción tal cual.
        4.  Si un elemento es NUEVO, crea una descripción visual detallada y específica (2-10 palabras). Sé creativo y concreto. Por ejemplo, en lugar de "coche", define "un sedán rojo de los años 90, algo abollado".
        5.  Devuelve ÚNICAMENTE un objeto JSON con los elementos y sus descripciones para la escena actual. NO incluyas elementos que no estén en la descripción de la nueva escena.

        Ejemplo de respuesta para la escena "un ogro cruza un puente de madera":
        {
          "ogro": "un ogro corpulento de piel verde musgo y con un solo ojo",
          "puente de madera": "un viejo puente colgante de tablones oscuros y cuerdas gastadas"
        }
    `;

    // Usamos el modelo secundario para esta tarea, puede ser más rápido y barato.
    const respuestaIA = await llamarIAConFeedback(promptAnalisis, `Analizando diseño para: "${descripcionMomento}"`, 'gemini-2.5-flash', true, 1);

    if (!respuestaIA) {
        console.error("La IA de análisis de diseño no devolvió respuesta.");
        return {}; // Devuelve un objeto vacío en caso de fallo
    }
    return respuestaIA;
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
 * [MODIFICADA CON 3 PASOS]
 * Realiza el trabajo de generar y refinar la imagen para un único nodo en TRES PASOS.
 * @param {HTMLElement} nodo - El nodo del momento a procesar.
 * @param {string} promptConsistente - El prompt ya enriquecido con la guía de diseño.
 * @returns {Promise<{status: string, id: string, error?: string}>} El resultado del proceso.
 */
async function generarYRefinarImagenParaNodo(nodo, promptConsistente) {
    const tituloNodo = nodo.querySelector('.momento-titulo').textContent;
    try {
        // --- PASO A: Generar Borrador ---
        const respuestaIlustracion = await llamarIAConFeedback(promptConsistente, `Ilustrando: "${tituloNodo}"`, 'gemini-2.5-flash', true, 1);
        if (!respuestaIlustracion || !respuestaIlustracion.svgContent) {
            throw new Error("La IA no devolvió un borrador de SVG.");
        }
        const svgInicial = respuestaIlustracion.svgContent;

        // --- PASO B: Primer Refinamiento (Artístico) ---
        const promptDeMejoraGenerico = "Añade más detalle, mejora la iluminación y las texturas para un acabado más profesional y artístico, respetando la guía de diseño.";
        const svgMejorado = await mejorarSVG(svgInicial, promptDeMejoraGenerico, `Refinando: "${tituloNodo}"`, 'gemini-2.0-flash');

        // --- [NUEVO] PASO C: Refinamiento Final (Pulido) ---
     //   const promptRefinamientoFinal = "Pule los detalles finales, ajusta las líneas para que sean más limpias y orgánicas y asegúrate de que el estilo sea cohesivo.";
      //  const svgRefinadoFinal = await mejorarSVG(svgMejorado, promptRefinamientoFinal, `Puliendo: "${tituloNodo}"`, 'gemini-2.0-flash-lite');
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
 * [VERSIÓN MEJORADA CON REINTENTOS]
 * Analiza un LOTE completo de momentos. Ahora incluye un bucle de reintento
 * para ser más robusto frente a respuestas inesperadas de la IA.
 * @param {Array<object>} loteDeMomentos - Array de objetos, ej: [{idTemporal: 1, descripcion: "..."}].
 * @param {object} guiaDeDisenoExistente - El objeto con los diseños de lotes anteriores.
 * @returns {Promise<{guiaActualizada: object, elementosPorMomento: object}>} El resultado del análisis.
 */
async function analizarLoteDeMomentos(loteDeMomentos, guiaDeDisenoExistente) {
    const promptAnalisisPorLote = `
        Eres un director de arte y diseñador de producción. Tu tarea es analizar un LOTE de escenas y mantener una estricta consistencia visual.

        **Guía de Diseño Existente (de lotes anteriores):**
        ---
        ${JSON.stringify(guiaDeDisenoExistente, null, 2)}
        ---

        **Nuevo Lote de Escenas a Analizar (procesar en orden):**
        ---
        ${JSON.stringify(loteDeMomentos, null, 2)}
        ---

        **Tus Tareas:**
        1. Procesa las escenas del lote EN ORDEN. La consistencia debe mantenerse tanto con la guía existente como DENTRO del lote actual.
        2. Para cada escena, identifica sus elementos clave (sustantivos).
        3. Si un elemento ya existe en la guía (o en un momento anterior de ESTE LOTE), REUTILIZA su descripción.
        4. Si un elemento es NUEVO, crea una descripción visual detallada y específica.
        5. Devuelve ÚNICAMENTE un objeto JSON con dos claves:
            - "guiaActualizada": Un objeto JSON con la guía de diseño COMPLETA Y ACTUALIZADA después de procesar este lote.
            - "elementosPorMomento": Un objeto JSON donde cada clave es el "idTemporal" de una escena y su valor es un objeto con los elementos y descripciones específicos para ESE momento.

        **Ejemplo de respuesta JSON esperada:**
        {
          "guiaActualizada": { "ogro": "...", "puente": "...", "princesa": "..." },
          "elementosPorMomento": { "temp_1": { "ogro": "...", "puente": "..." }, "temp_2": { "ogro": "...", "princesa": "..." } }
        }
    `;

    // --- [INICIO DE LA MODIFICACIÓN] Lógica de reintento ---
    const MAX_INTENTOS = 3;
    for (let i = 1; i <= MAX_INTENTOS; i++) {
        try {
            const feedback = `Analizando lote (${loteDeMomentos.length} escenas, Intento ${i}/${MAX_INTENTOS})...`;
            
            // Asegúrate de usar un modelo potente para esta tarea. 'gemini-2.5-pro' es una buena opción.
            const respuestaIA = await llamarIAConFeedback(promptAnalisisPorLote, feedback, 'gemini-2.5-flash', true, 1);

            // Se valida que la respuesta tenga la estructura correcta
            if (respuestaIA && respuestaIA.guiaActualizada && respuestaIA.elementosPorMomento) {
                console.log(`Análisis del lote exitoso en el intento ${i}.`);
                return respuestaIA; // ¡Éxito! Salimos de la función.
            }
            
            // Si la estructura no es correcta, se registra y se preparara el reintento.
            console.warn(`Intento ${i}/${MAX_INTENTOS} no devolvió la estructura JSON esperada. Respuesta recibida:`, respuestaIA);

        } catch (error) {
            console.warn(`Intento ${i}/${MAX_INTENTOS} falló con un error de API:`, error.message);
        }

        // Si no es el último intento, esperamos un momento antes de reintentar.
        if (i < MAX_INTENTOS) {
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
    }
    
    // Si el bucle termina, todos los intentos fallaron. Lanzamos el error final.
    throw new Error("La IA de análisis de lote no devolvió la estructura JSON esperada después de varios intentos.");
    // --- [FIN DE LA MODIFICACIÓN] ---
}

/**
 * [VERSIÓN FINAL CON INICIO ESCALONADO]
 * Orquesta la ilustración con una fase de análisis secuencial y una fase de generación
 * que lanza lotes en paralelo a intervalos fijos, sin esperar a que el anterior termine.
 */
/**
 * [VERSIÓN FINAL CON ANÁLISIS Y GENERACIÓN POR LOTES]
 * Orquesta la ilustración completa. La fase de análisis ahora también se ejecuta por lotes.
 */
/**
 * [VERSIÓN FINAL CON LÓGICA DE PIPELINE]
 * Orquesta la ilustración de forma que el análisis de un lote y la ilustración
 * del lote anterior puedan ocurrir de forma concurrente.
 */
async function ilustrarTodoEnParaleloPorLotes() {
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

        // 1. Dividimos todos los nodos en lotes desde el principio.
        const lotesDeNodos = [];
        for (let i = 0; i < nodosAIlustrar.length; i += BATCH_SIZE) {
            lotesDeNodos.push(nodosAIlustrar.slice(i, i + BATCH_SIZE));
        }

        // --- [NUEVO BUCLE PRINCIPAL DE PIPELINE] ---
        // Este bucle itera una vez por lote, realizando el análisis y programando la ilustración.
        for (let i = 0; i < lotesDeNodos.length; i++) {
            const loteActualNodos = lotesDeNodos[i];
            const numeroDeLote = i + 1;

            // --- PASO 1: ANALIZAR EL LOTE ACTUAL (Bloqueante para este bucle) ---
            const progress = 5 + (i / lotesDeNodos.length) * 45; // El análisis ocupa la primera mitad de la barra.
            progressBarManager.set(progress, `Analizando lote de diseño ${numeroDeLote} de ${lotesDeNodos.length}...`);

            const momentosParaAnalizar = loteActualNodos.map((nodo, index) => ({
                idTemporal: `temp_${index}`,
                descripcion: nodo.dataset.descripcion
            }));

            // Esperamos a que el análisis de ESTE lote termine para tener la guía actualizada.
            const resultadoAnalisis = await analizarLoteDeMomentos(momentosParaAnalizar, guiaDeDisenoMaestra);
            guiaDeDisenoMaestra = resultadoAnalisis.guiaActualizada; // Actualizamos la guía para el siguiente lote.

            // Preparamos los datos para la fase de ilustración de este lote.
            const nodosConPromptsParaEsteLote = [];
            for (let j = 0; j < loteActualNodos.length; j++) {
                const nodo = loteActualNodos[j];
                const idTemporal = `temp_${j}`;
                const elementosDescritos = resultadoAnalisis.elementosPorMomento[idTemporal];
                if (elementosDescritos) {
                    const promptConsistente = crearPromptConsistenteParaEscena(nodo.dataset.descripcion, elementosDescritos);
                    nodosConPromptsParaEsteLote.push({ nodo, promptConsistente });
                }
            }

            // --- PASO 2: PROGRAMAR LA ILUSTRACIÓN DEL LOTE ACTUAL (No bloqueante) ---
            const delayDeInicio = i * DELAY_ENTRE_LOTES;
            console.log(`Análisis del Lote ${numeroDeLote} completado. Programando su ilustración para que inicie en ${delayDeInicio / 1000}s.`);

            const promesaDelLote = new Promise(resolve => {
                setTimeout(async () => {
                    // La función procesarLote se encarga de la ilustración en paralelo de este lote.
                    // Su barra de progreso interna se actualizará al comenzar.
                    await procesarLote(nodosConPromptsParaEsteLote, numeroDeLote, lotesDeNodos.length);
                    resolve(); // Resolvemos la promesa cuando este lote ha terminado de ilustrarse.
                }, delayDeInicio);
            });

            promesasDeTodosLosLotes.push(promesaDelLote);
            // El bucle principal NO espera aquí. Continúa inmediatamente para analizar el siguiente lote.
        }

        // Al final, esperamos a que todas las promesas de ilustración programadas se completen.
        await Promise.all(promesasDeTodosLosLotes);

        progressBarManager.finish('¡Proceso de ilustración en pipeline finalizado!');

    } catch (error) {
        console.error("Error crítico en el proceso de ilustración en pipeline:", error);
        progressBarManager.error("Proceso cancelado por un error crítico");
        alert(`Ocurrió un error general durante la ilustración: ${error.message}`);
    }
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