import { llamarGemini, limpiarMarkdown } from './gemini.js';
import { sintetizarEInyectarImagenPollinations, updatePollinationsAuthUI, manualAuthPollinations } from './pollination.js';
import { appendLog, setPipelineStatus, crearCardNodoUI, actualizarCardNodoStatus } from './ui.js';

// Puente con el sistema de archivos / entorno de configuración padre
const Sys = window.parent.SystemConfig;

// Estado global de la aplicación compartida por referencia
export const CONFIG = {
    jsonLibrojuego: null,
    jsonArte: null,
    listaNodosSeleccionados: [],
    controlProgresoActivo: false,
    pollinationsApiKey: localStorage.getItem('pollinations_api_key') || (Sys ? Sys.authKey : null)
};

// Asignación de elementos interactivos directos
const fileLibrojuegoInput = document.getElementById('file-librojuego');
const fileArteInput = document.getElementById('file-arte');
const labelLibrojuego = document.getElementById('label-librojuego');
const labelArte = document.getElementById('label-arte');
const btnStart = document.getElementById('btn-start');
const btnAbort = document.getElementById('btn-abort');
const btnExport = document.getElementById('btn-export');
const polliAuthStatus = document.getElementById('polli-auth-status');

window.addEventListener('load', () => {
    // Captura del fragmento hash de Pollinations igual que en Imagenes.html
    if (window.location.hash) {
        const urlParams = new URLSearchParams(window.location.hash.slice(1));
        const apiKeyFromHash = urlParams.get('api_key');
        if (apiKeyFromHash) {
            CONFIG.pollinationsApiKey = apiKeyFromHash;
            localStorage.setItem('pollinations_api_key', CONFIG.pollinationsApiKey);
            window.location.hash = ""; // Limpiamos la barra de direcciones
            appendLog("[AUTH] Autenticación con Pollinations completada con éxito desde Callback.");
        }
    }

    updatePollinationsAuthUI();

    // Mantenemos soporte por mensaje o puente directo de entorno iframe
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'POLLI_AUTH_SUCCESS' && event.data.key) {
            CONFIG.pollinationsApiKey = event.data.key;
            localStorage.setItem('pollinations_api_key', CONFIG.pollinationsApiKey);
            updatePollinationsAuthUI();
            appendLog("[AUTH] Autenticación con Pollinations completada con éxito.");
        }
    });
});

polliAuthStatus.addEventListener('click', manualAuthPollinations);

fileLibrojuegoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            CONFIG.jsonLibrojuego = JSON.parse(evt.target.result);
            labelLibrojuego.innerText = file.name;
            labelLibrojuego.classList.add('text-emerald-400');
            appendLog(`[CARGA] Archivo de librojuego "${CONFIG.jsonLibrojuego.titulo || 'Sin título'}" inyectado con éxito.`);
            checkReadyState();
        } catch (err) {
            alert("Error al parsear el JSON del Librojuego.");
        }
    };
    reader.readAsText(file);
});

fileArteInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            CONFIG.jsonArte = JSON.parse(evt.target.result);
            labelArte.innerText = file.name;
            labelArte.classList.add('text-emerald-400');
            appendLog(`[CARGA] Guía de Arte Estética "${CONFIG.jsonArte.meta?.titulo || 'Asignada'}" inyectada con éxito.`);
            checkReadyState();
        } catch (err) {
            alert("Error al parsear el JSON de la Guía de Arte.");
        }
    };
    reader.readAsText(file);
});

function checkReadyState() {
    if (CONFIG.jsonLibrojuego && CONFIG.jsonArte) {
        btnStart.disabled = false;
        document.getElementById('pipeline-step-text').innerText = "Listo para iniciar el bucle analítico en cascada";
    }
}

/**
 * Realiza llamadas tolerantes a fallos a Gemini garantizando que la salida devuelta sea un JSON válido.
 */
async function llamarGeminiConReintentosJSON(prompt, systemInstruction, maxReintentos = 3) {
    for (let intento = 1; intento <= maxReintentos; intento++) {
        try {
            const respuestaCruda = await llamarGemini(prompt, systemInstruction);
            const textoLimpio = limpiarMarkdown(respuestaCruda);
            return JSON.parse(textoLimpio);
        } catch (error) {
            appendLog(`[REINTENTO] Error de parsing u obtención en Gemini (Intento ${intento}/${maxReintentos}): ${error.message}. Reintentando síntesis de datos...`);
            if (intento === maxReintentos) {
                throw new Error(`Incapaz de recuperar un JSON estructurado válido tras ${maxReintentos} intentos. Detalle original: ${error.message}`);
            }
            // Pequeña pausa de seguridad milisegúndica antes de re-solicitar
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

async function ejecutarPipelineCascada() {
    if (!CONFIG.jsonLibrojuego || !CONFIG.jsonArte) return;
    
    CONFIG.controlProgresoActivo = true;
    btnStart.disabled = true;
    btnAbort.classList.remove('hidden');
    btnExport.disabled = true;
    document.getElementById('gallery-container').innerHTML = "";

    try {
        setPipelineStatus("Llamada 1/11: Identificando los 70 nodos críticos del universo narrativo...", 10);
        appendLog("[FASE 1] Analizando el mapa completo de secciones del librojuego para aislar los 70 nodos más impactantes visual y narrativamente...");

        const systemPromptSeleccion = "Eres un analista literario y diseñador de videojuegos experto. Tu misión es seleccionar exactamente los 70 nodos más interesantes, dramáticos o visualmente potentes de un archivo estructurado en JSON. Debes responder ÚNICAMENTE con un objeto JSON limpio que contenga una clave 'nodos' con el array de identificadores seleccionados (strings). Sin markdown, sin explicaciones.";
        
        const resumenNodos = {};
        for (const key in CONFIG.jsonLibrojuego.secciones) {
            resumenNodos[key] = {
                titulo: CONFIG.jsonLibrojuego.secciones[key].titulo,
                texto_breve: Array.isArray(CONFIG.jsonLibrojuego.secciones[key].texto) ? CONFIG.jsonLibrojuego.secciones[key].texto.join(" ").substring(0, 300) : ""
            };
        }

        const promptSeleccion = `Analiza los siguientes nodos estructurales y extrae exactamente una lista con los 70 IDs de los nodos más interesantes para ilustrar. Si la obra contiene menos de 70 nodos en total, selecciona todos los disponibles en la obra.
        
        Estructura de Secciones:
        ${JSON.stringify(resumenNodos)}`;

        // Reemplazado por el wrapper tolerante a fallos de parsing estructurado
        const dataSeleccion = await llamarGeminiConReintentosJSON(promptSeleccion, systemPromptSeleccion);
        CONFIG.listaNodosSeleccionados = dataSeleccion.nodos || Object.keys(CONFIG.jsonLibrojuego.secciones).slice(0, 70);

        appendLog(`[ÉXITO FASE 1] Se han seleccionado ${CONFIG.listaNodosSeleccionados.length} secciones críticas para ilustrar: ${CONFIG.listaNodosSeleccionados.join(", ")}`);

        CONFIG.listaNodosSeleccionados.forEach(idNodo => {
            if (CONFIG.jsonLibrojuego.secciones[idNodo]) {
                crearCardNodoUI(idNodo, CONFIG.jsonLibrojuego.secciones[idNodo].titulo);
            }
        });

        const totalNodos = CONFIG.listaNodosSeleccionados.length;
        const tamañoTanda = 3;
        let nodosProcesados = 0;

        for (let i = 0; i < totalNodos; i += tamañoTanda) {
            if (!CONFIG.controlProgresoActivo) break;

            const tanda = CONFIG.listaNodosSeleccionados.slice(i, i + tamañoTanda);
            const porcentajeProgreso = Math.floor(10 + ((nodosProcesados / totalNodos) * 85));
            
            setPipelineStatus(`Procesando Tanda de Nodos [${tanda.join(", ")}]...`, porcentajeProgreso);
            appendLog(`[TANDA] Solicitando prompts visuales a Gemini para los nodos: ${tanda.join(", ")}`);

            const bloqueNodosTexto = {};
            tanda.forEach(id => {
                if (CONFIG.jsonLibrojuego.secciones[id]) {
                    bloqueNodosTexto[id] = {
                        titulo: CONFIG.jsonLibrojuego.secciones[id].titulo,
                        texto: CONFIG.jsonLibrojuego.secciones[id].texto
                    };
                }
            });

            const systemPromptPrompts = "Eres un Concept Artist and Diseñador Visual de élite. Tu objetivo es componer descripciones visuales minuciosas e hiper-detalladas optimizadas para motores de Inteligencia Artificial Generativa. Debes responder EXCLUSIVAMENTE con un JSON estructurado mapeando cada ID de nodo a su respectivo prompt visual terminado en inglés.";
            
            const promptDisenoTanda = `A partir de la Guía de Arte Estética adjunta y la información específica del nodo aislado provisto (sin usar el resto del libro narrativo), identifica los elements clave de la escena y genera un prompt visual hiper-detallado y descriptivo en inglés para cada uno.
            
            CRITICAL DIRECTION: The output visual prompt for each node MUST BE ENTIRELY IN ENGLISH.
            
            Rules for the prompt construction:
            - Analyze the isolated node text to find characters, locations, actions, and items.
            - Match, paint and blend those elements seamlessly with the textures, volumetric lighting, palette, and style defined in the Art Guide.
            - If a character appears, detail their features, clothing, expressions and items based strictly on the Art Guide style rules.
            
            Return EXACTLY a JSON structure matching this example layout:
            {
                "node_id_1": "A highly detailed visual prompt in English containing scene description, character layout, aesthetic lighting, atmosphere matching the art guide...",
                "node_id_2": "Another hyper detailed prompt in English..."
            }

            GUÍA DE ARTE GLOBAL DE REFERENCIA:
            ${JSON.stringify(CONFIG.jsonArte)}

            NODOS EXCLUSIVOS DE ESTA TANDA A IDENTIFICAR Y PINTAR:
            ${JSON.stringify(bloqueNodosTexto)}`;

            // Reemplazado por el wrapper de reintentos para evitar roturas si una tanda genera un JSON inválido
            const parsedPrompts = await llamarGeminiConReintentosJSON(promptDisenoTanda, systemPromptPrompts);

            for (const idNodo of tanda) {
                if (!CONFIG.controlProgresoActivo) break;
                
                const visualPromptIngles = parsedPrompts[idNodo];
                if (!visualPromptIngles) continue;

                actualizarCardNodoStatus(idNodo, "Generando Imagen...", "text-amber-400");
                appendLog(`[POLLINATIONS] Despachando prompt visual a producción para el nodo [${idNodo}].`);

                try {
                    const base64Imagen = await sintetizarEInyectarImagenPollinations(idNodo, visualPromptIngles);
                    
                    if (CONFIG.jsonLibrojuego.secciones[idNodo]) {
                        CONFIG.jsonLibrojuego.secciones[idNodo].imagen = base64Imagen;
                    }
                    
                    actualizarCardNodoStatus(idNodo, "Listo / Completado", "text-emerald-400", base64Imagen);
                } catch (errImg) {
                    appendLog(`[ERROR IMAGEN] Fallo al procesar render del nodo ${idNodo}: ${errImg.message}`);
                    actualizarCardNodoStatus(idNodo, "Fallo en Render", "text-rose-500");
                }

                nodosProcesados++;
            }
        }

        if (CONFIG.controlProgresoActivo) {
            setPipelineStatus("Completado", 100, "complete");
            appendLog("[SISTEMA COMPLETO] El librojuego se ha compilado y enriquecido con imágenes Base64 de forma nativa.");
            btnExport.disabled = false;
        }

    } catch (errorGlobal) {
        appendLog(`[FALLO CRÍTICO] Ocurrió un error en el bucle principal: ${errorGlobal.message}`);
        setPipelineStatus("Error en la ejecución", 0, "inert");
    } finally {
        btnAbort.classList.add('hidden');
        btnStart.disabled = false;
    }
}

btnStart.addEventListener('click', ejecutarPipelineCascada);

btnAbort.addEventListener('click', () => {
    CONFIG.controlProgresoActivo = false;
    appendLog("[OPERACIÓN] Ejecución cancelada y abortada por instrucción de usuario.");
    setPipelineStatus("Interrumpido por usuario", 0, "inert");
});

btnExport.addEventListener('click', () => {
    if (!CONFIG.jsonLibrojuego) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(CONFIG.jsonLibrojuego, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `librojuego_ilustrado_${(CONFIG.jsonLibrojuego.titulo || 'output').toLowerCase().replace(/ /g, "_")}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    appendLog(`[EXPORTACIÓN] Obra unificación guardada y descargada: ${filename}`);
});