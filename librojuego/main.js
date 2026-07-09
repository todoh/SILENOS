// main.js
let librojuegoData = null;
let agenteActivo = false;
let nodosProcesadosFlags = {}; // Control visual de qué secciones han sido expandidas

// Elementos del DOM
const apiKeyInput = document.getElementById('api-key');
const logConsole = document.getElementById('log-console');
const importFileInput = document.getElementById('import-file');
const btnPegarJSON = document.getElementById('btn-pegar-json');
const btnExportar = document.getElementById('btn-exportar');
const btnRunAgent = document.getElementById('btn-run-agent');
const btnAbortar = document.getElementById('btn-abortar');
const agentBadge = document.getElementById('agent-status-badge');
const docTitulo = document.getElementById('doc-titulo');
const docTono = document.getElementById('doc-tono');
const docEstilo = document.getElementById('doc-estilo');
const wrapperCapitulos = document.getElementById('wrapper-capitulos');

function log(texto) {
    const t = new Date().toLocaleTimeString();
    logConsole.innerText += `\n[${t}] ${texto}`;
    logConsole.scrollTop = logConsole.scrollHeight;
}

function actualizarMatrizUI(nodosEnProgresoKeys = []) {
    wrapperCapitulos.innerHTML = "";
    if (!librojuegoData || !librojuegoData.secciones) {
        wrapperCapitulos.innerHTML = "<p style='color:#6b7280; font-size:13px;'>Matriz vacía o formato no reconocido.</p>";
        btnRunAgent.disabled = true;
        return;
    }

    btnRunAgent.disabled = agenteActivo;

    const keys = Object.keys(librojuegoData.secciones);
    keys.forEach((key) => {
        const seccion = librojuegoData.secciones[key];
        const item = document.createElement('div');
        item.className = "chapter-editor-item";

        let statusClass = "status-pending";
        let statusText = "Pendiente";

        if (nodosEnProgresoKeys.includes(key)) {
            statusClass = "status-running";
            statusText = "Expandiendo Prosa...";
        } else if (nodosProcesadosFlags[key]) {
            statusClass = "status-done";
            statusText = `¡Expandido! (${seccion.texto ? seccion.texto.length : 0} Párrafos)`;
        }

        const opcionesInfo = seccion.opciones && seccion.opciones.length > 0 
            ? seccion.opciones.map(o => `<li>👉 <em>${o.texto}</em> -> <strong>[${o.destino}]</strong></li>`).join("")
            : "<li>🛑 Nodo Final (Sin salidas)</li>";

        item.innerHTML = `
            <div class="chapter-header">
                <div class="chapter-header-title">ID Sección: ${key}</div>
                <div class="chapter-status ${statusClass}">${statusText}</div>
            </div>
            <div style="margin-bottom: 6px;">
                <strong>Título:</strong> ${seccion.titulo || '(Sin título)'}
            </div>
            <div class="chapter-body-preview" style="margin-top:4px; padding-top:4px;">
                <label style="font-size:9px; margin-bottom:2px;">Contenido Actual del Texto</label>
                <div style="font-size:11px; color:#374151; max-height:100px; overflow-y:auto; padding-bottom:4px; line-height:1.5; background:#fafafa; padding:6px;">
                    ${seccion.texto && seccion.texto.length > 0 ? seccion.texto.join("<br/><br/>") : '<em>Vacio</em>'}
                </div>
                <label style="font-size:9px; margin-top:6px; margin-bottom:2px;">Saltos y Decisiones Conectadas</label>
                <ul style="font-size:11px; list-style:none; padding-left:0; color:#4b5563;">
                    ${opcionesInfo}
                </ul>
            </div>
        `;
        wrapperCapitulos.appendChild(item);
    });
}

function procesarEstructuraJSON(objetoJSON) {
    try {
        if (!objetoJSON.secciones) {
            throw new Error("El JSON no contiene un diccionario de 'secciones' válido.");
        }

        librojuegoData = objetoJSON;
        docTitulo.value = librojuegoData.titulo || "Librojuego sin título autónomo";
        
        // Inicializar banderas de procesamiento visual
        nodosProcesadosFlags = {};
        Object.keys(librojuegoData.secciones).forEach(key => {
            nodosProcesadosFlags[key] = false;
        });

        log(`[SISTEMA] Archivo cargado con éxito. Detectadas ${Object.keys(librojuegoData.secciones).length} secciones interconectadas.`);
        actualizarMatrizUI();
    } catch (err) {
        log(`Error crítico al procesar estructura de librojuego: ${err.message}`);
        alert("El formato del JSON no corresponde a un librojuego indexado por secciones.");
    }
}

async function ejecutarFlujoAgentico() {
    if (!librojuegoData || !librojuegoData.secciones) return;

    agenteActivo = true;
    btnRunAgent.disabled = true;
    btnAbortar.classList.remove('hidden');
    agentBadge.classList.remove('hidden');
    agentBadge.classList.add('agent-active');

    const apiKey = apiKeyInput.value.trim();
    const tono = docTono.value;
    const estilo = docEstilo.value;
    const systemPrompt = GeminiPrompts.obtenerSystemPromptExpansor();

    try {
        const todasLasKeys = Object.keys(librojuegoData.secciones);
        const tamañoLote = 10;
        log(`[AGENTE NÚCLEO] Iniciando expansión literaria controlada en bloques de ${tamañoLote}.`);

        for (let i = 0; i < todasLasKeys.length; i += tamañoLote) {
            if (!agenteActivo) return;

            const loteKeys = todasLasKeys.slice(i, i + tamañoLote);
            log(`[BLOQUE] Procesando lote de secciones: [${loteKeys.join(", ")}]...`);
            
            // Reflejar estados en ejecución en la UI
            actualizarMatrizUI(loteKeys);

            // Aislar fragmento del lote para enviárselo a la IA sin saturar la ventana de contexto
            let subSecciones = {};
            loteKeys.forEach(k => {
                subSecciones[k] = librojuegoData.secciones[k];
            });

            const promptBloque = GeminiPrompts.obtenerPromptBloqueNodos(subSecciones, tono, estilo);

            try {
                let respuestaCruda = await llamarGemini(promptBloque, systemPrompt, apiKey);
                
                // Limpieza drástica de selectores markdown si el modelo los añade de forma imprevista
                respuestaCruda = respuestaCruda.replace(/```json/gi, "").replace(/```/gi, "").trim();
                
                const subSeccionesExpandidas = JSON.parse(respuestaCruda);

                // Reintegrar las secciones expandidas preservando la coherencia estructural y de punteros
                loteKeys.forEach(k => {
                    if (subSeccionesExpandidas[k]) {
                        // Forzar sobreescritura de texto manteniendo intactos los metadatos estructurales de origen
                        librojuegoData.secciones[k].texto = subSeccionesExpandidas[k].texto;
                        nodosProcesadosFlags[k] = true;
                    }
                });

                log(`[ÉXITO] Lote completado de forma limpia. ${loteKeys.length} secciones actualizadas.`);
            } catch (errLote) {
                log(`[CRÍTICO EN LOTE] Error procesando el fragmento actual: ${errLote.message}. Pasando a modo reintento unitario recursivo...`);
                
                // Fallback unitario si el lote completo de 10 falla por saturación o sintaxis del JSON devuelto
                for (const keyUnica of loteKeys) {
                    if (!agenteActivo) return;
                    try {
                        actualizarMatrizUI([keyUnica]);
                        let singleObj = {};
                        singleObj[keyUnica] = librojuegoData.secciones[keyUnica];
                        
                        const promptIndividual = GeminiPrompts.obtenerPromptBloqueNodos(singleObj, tono, estilo);
                        let resUnica = await llamarGemini(promptIndividual, systemPrompt, apiKey);
                        resUnica = resUnica.replace(/```json/gi, "").replace(/```/gi, "").trim();
                        
                        const parsedUnico = JSON.parse(resUnica);
                        if (parsedUnico[keyUnica]) {
                            librojuegoData.secciones[keyUnica].texto = parsedUnico[keyUnica].texto;
                            nodosProcesadosFlags[keyUnica] = true;
                        }
                    } catch (eFallback) {
                        log(`[FALLO SECCIÓN INDIVIDUAL ${keyUnica}] Imposible procesar el nodo de forma automatizada: ${eFallback.message}`);
                    }
                }
            }

            actualizarMatrizUI();
        }

        if (agenteActivo) {
            log("[AGENTE SISTEMA] ¡Grafo literario expandido por completo con éxito sin pérdida de conectividad!");
            log("Utiliza 'Exportar JSON Expandido' para guardar tu nueva base de datos narrativa estructurada.");
        }

    } catch (e) {
        log(`[FALLO GLOBAL] Error en la ejecución del bucle agéntico: ${e.message}`);
    } finally {
        desactivarAgenteUI();
    }
}

function desactivarAgenteUI() {
    agenteActivo = false;
    btnRunAgent.disabled = false;
    btnAbortar.classList.add('hidden');
    agentBadge.classList.add('hidden');
    agentBadge.classList.remove('agent-active');
}

btnRunAgent.addEventListener('click', ejecutarFlujoAgentico);

btnAbortar.addEventListener('click', () => {
    log("[AGENTE] Cancelación manual solicitada por el operador.");
    desactivarAgenteUI();
    actualizarMatrizUI();
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            procesarEstructuraJSON(parsed);
        } catch (err) {
            log(`Error al leer archivo JSON: ${err.message}`);
        }
    };
    reader.readAsText(file);
});

btnPegarJSON.addEventListener('click', async () => {
    try {
        const textoPortapapeles = await navigator.clipboard.readText();
        if (!textoPortapapeles || textoPortapapeles.trim() === "") {
            log("[PORTAPAPELES] El portapapeles no contiene datos.");
            alert("El portapapeles está vacío.");
            return;
        }
        const jsonMapeado = JSON.parse(textoPortapapeles.trim());
        log("[PORTAPAPELES] Datos obtenidos correctamente.");
        procesarEstructuraJSON(jsonMapeado);
    } catch (err) {
        log(`Error al mapear JSON desde el portapapeles: ${err.message}.`);
        alert("Error al parsear el JSON del portapapeles.");
    }
});

btnExportar.addEventListener('click', () => {
    if (!librojuegoData) {
        alert("No hay ningún librojuego cargado para exportar.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(librojuegoData, null, 2));
    const downloadAnchor = document.createElement('a');
    const nombreArchivo = (librojuegoData.titulo || "librojuego_expandido").toLowerCase().replace(/ /g, "_") + ".json";
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", nombreArchivo);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    log(`Librojuego expandido guardado con éxito como: ${nombreArchivo}`);
});