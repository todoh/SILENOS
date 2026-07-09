// main.js
let libroData = {
    "titulo": "",
    "portada": " ",
    "autores": "",
    "disclaimer": "",
    "tono": "",
    "estilo": "",
    "indice": [],
    "prologo": "",
    "partes": [],
    "apendice": "",
    "nota_final": ""
};

let agenteActivo = false;

// Elementos del DOM
const apiKeyInput = document.getElementById('api-key');
const logConsole = document.getElementById('log-console');
const importFileInput = document.getElementById('import-file');
const btnPegarJSON = document.getElementById('btn-pegar-json');
const btnExportar = document.getElementById('btn-exportar');
const btnRunAgent = document.getElementById('btn-run-agent');
const btnAbortar = document.getElementById('btn-abortar');
const btnPromptIA = document.getElementById('btn-prompt-ia');
const agentBadge = document.getElementById('agent-status-badge');
const docTitulo = document.getElementById('doc-titulo');
const docAutores = document.getElementById('doc-autores');
const docDisclaimer = document.getElementById('doc-disclaimer');
const docTono = document.getElementById('doc-tono');
const docEstilo = document.getElementById('doc-estilo');
const docIdea = document.getElementById('doc-idea');
const docNumCaps = document.getElementById('doc-num-caps');
const wrapperCapitulos = document.getElementById('wrapper-capitulos');

function sincronizarDatosBase() {
    libroData.titulo = docTitulo.value;
    libroData.autores = docAutores.value;
    libroData.disclaimer = docDisclaimer.value;
    libroData.tono = docTono.value;
    libroData.estilo = docEstilo.value;
     
    libroData.partes.forEach(parte => {
        parte.capitulos.forEach(cap => {
            const titleInput = document.getElementById(`ui-title-cap-${cap.numero}`);
            const synInput = document.getElementById(`ui-syn-cap-${cap.numero}`);
             
            if (titleInput) cap.titulo = titleInput.value;
            if (synInput) cap.sinopsis = synInput.value;
        });
    });
}

function log(texto) {
    const t = new Date().toLocaleTimeString();
    logConsole.innerText += `\n[${t}] ${texto}`;
    logConsole.scrollTop = logConsole.scrollHeight;
}

function inicializarEstructuraBaseVacia() {
    const totalCaps = parseInt(docNumCaps.value) || 15;
     
    if (libroData.partes.length === 0) {
        libroData.indice = ["Prólogo"];
        const parteUnica = {
            "nombre": "Bloque Único de Desarrollo",
            "capitulos": []
        };
        for (let i = 1; i <= totalCaps; i++) {
            parteUnica.capitulos.push({
                "numero": i,
                "titulo": `Capítulo ${i}`,
                "sinopsis": "", 
                "texto": [],
                "expandido": false
            });
            libroData.indice.push(`Capítulo ${i}`);
        }
        libroData.indice.push("Apéndice", "Nota Final");
        libroData.partes = [parteUnica];
    }
    actualizarMatrizUI();
}

function actualizarMatrizUI(capituloEnProgresoNum = null) {
    wrapperCapitulos.innerHTML = "";
    if (!libroData.partes || libroData.partes.length === 0) {
        wrapperCapitulos.innerHTML = "<p style='color:#6b7280; font-size:13px;'>Matriz vacía o índice no generado aún.</p>";
        return;
    }
    libroData.partes.forEach((parte) => {
        const parteDiv = document.createElement('div');
        parteDiv.style.margin = "8px 0";
        parteDiv.innerHTML = `<h3 style="font-size:11px; font-weight:700; color:#000; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">${parte.nombre}</h3>`;
        wrapperCapitulos.appendChild(parteDiv);
        parte.capitulos.forEach((cap) => {
            const item = document.createElement('div');
            item.className = "chapter-editor-item";
             
            let statusClass = "status-pending";
            let statusText = "Pendiente";
            
            if (capituloEnProgresoNum === cap.numero) {
                statusClass = "status-running";
                statusText = "Escribiendo 20-30 Párrafos...";
            } else if (cap.expandido && cap.texto && cap.texto.length > 5) {
                statusClass = "status-done";
                statusText = `¡Expandido! (${cap.texto.length} Párrafos)`;
            } else if (cap.texto && cap.texto.length > 0) {
                statusClass = "status-pending";
                statusText = "Semilla Base Cargada";
            }
            
            item.innerHTML = `
                <div class="chapter-header">
                    <div class="chapter-header-title">Capítulo ${cap.numero}</div>
                    <div class="chapter-status ${statusClass}">${statusText}</div>
                </div>
                <div style="margin-bottom: 8px;">
                    <label style="font-size:9px; margin-bottom:2px;">Título del Capítulo</label>
                    <input type="text" id="ui-title-cap-${cap.numero}" value="${cap.titulo || ''}" placeholder="Ej. El Despertar del Óxido">
                </div>
                <div style="margin-bottom: 8px;">
                    <label style="font-size:9px; margin-bottom:2px;">¿Qué sucede en este capítulo?</label>
                    <textarea id="ui-syn-cap-${cap.numero}" style="min-height:45px; font-size:12px; padding:6px 0;" placeholder="Describe los eventos, datos mecánicos o giros...">${cap.sinopsis || ''}</textarea>
                </div>
                ${cap.texto && cap.texto.length > 0 ? `
                <div class="chapter-body-preview">
                    <label style="font-size:9px; margin-bottom:2px;">Muestra del Contenido (${cap.texto.length > 5 ? 'Manuscrito Expandido' : 'Borrador Estructural'})</label>
                    <div style="font-size:11px; color:#374151; max-height:125px; overflow-y:auto; border-bottom:1px solid #e5e7eb; padding-bottom:4px; line-height: 1.6;">
                        ${cap.texto.map((p, idx) => `<strong>[Bloque ${idx+1}]</strong> ${p}`).join("<br/><br/>")}
                    </div>
                </div>` : ''}
            `;
            wrapperCapitulos.appendChild(item);
        });
    });
}

async function ejecutarFlujoAgentico() {
    sincronizarDatosBase();
    agenteActivo = true;
    btnRunAgent.disabled = true;
    btnAbortar.classList.remove('hidden');
    agentBadge.classList.remove('hidden');
    agentBadge.classList.add('agent-active');
    const apiKey = apiKeyInput.value.trim();
    try {
        const totalCapitulosRequeridos = libroData.partes.reduce((acc, p) => acc + p.capitulos.length, 0);
        log(`[AGENTE NÚCLEO] Iniciando expansión cuántica literaria. Objetivo: ${totalCapitulosRequeridos} capítulos.`);
        if (!agenteActivo) return;
        
        // FASE 1: Prólogo (Se fuerza siempre la regeneración total)
        log("[AGENTE] Forjando Prólogo desde la raíz conceptual...");
        const promptPrologo = GeminiPrompts.obtenerPromptPrologo(docIdea.value, libroData.tono, libroData.estilo);
        libroData.prologo = (await llamarGemini(promptPrologo, "", apiKey)).trim();
        log("[AGENTE] Prólogo integrated.");
        
        if (!agenteActivo) return;
        
        // FASE 2: Cierres (Se fuerza siempre la regeneración total)
        log("[AGENTE] Consolidando Apéndice Técnico y Cierres...");
        const promptCierres = GeminiPrompts.obtenerPromptCierres(docIdea.value, libroData.tono);
        let respuesta = await llamarGemini(promptCierres, "Devuelve únicamente JSON limpio.", apiKey);
        respuesta = respuesta.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(respuesta);
        libroData.apendice = parsed.apendice;
        libroData.nota_final = parsed.nota_final;
        log("[AGENTE] Estructuras de cierre validadas.");
        
        if (!agenteActivo) return;
        
        // FASE 3: Desarrollo Literario Masivo
        log("[AGENTE] Entrando en Fase de Ampliación de Prosa (20-30 párrafos por capítulo)...");
        const systemPromptEscritor = GeminiPrompts.obtenerSystemPromptEscritor();
        
        for (let p = 0; p < libroData.partes.length; p++) {
            for (let c = 0; c < libroData.partes[p].capitulos.length; c++) {
                if (!agenteActivo) return;
                let cap = libroData.partes[p].capitulos[c];
                
                log(`[AGENTE IA] Ejecutando llamadas para Capítulo ${cap.numero}: "${cap.titulo}"...`);
                actualizarMatrizUI(cap.numero);
                
                // Si ya existía texto de semilla o borrador estructural previo, se puede asimilar como hilo conductor, pero sin saltarse nunca el capítulo
                let guiaCronologica = "";
                if (cap.texto && cap.texto.length > 0 && !cap.expandido) {
                    guiaCronologica = `\n\nESTRUCTURA HILO CONDUCTOR OBLIGATORIO (Toma cada una de estas afirmaciones base y expande cada punto redactando 2 o 3 párrafos masivos interconectados, respetando este orden cronológico estricto):\n${cap.texto.map((linea, i) => `${i+1}. ${linea}`).join("\n")}`;
                }
                
                let promptCapitulo = GeminiPrompts.obtenerPromptCapitulo(
                    cap.numero,
                    cap.titulo,
                    docIdea.value || libroData.prologo,
                    libroData.tono,
                    libroData.estilo,
                    cap.sinopsis,
                    libroData.prologo
                );
                
                if (guiaCronologica) {
                    promptCapitulo += guiaCronologica;
                }
                
                try {
                    // Llamada al modelo usando el escritor de párrafos limpios por \n\n
                    let respuestaCruda = await llamarGemini(promptCapitulo, systemPromptEscritor, apiKey);
                    respuestaCruda = respuestaCruda.replace(/```markdown/g, "").replace(/```/g, "").trim();
                    
                    const parrafosProcesados = respuestaCruda
                        .split(/\n\s*\n/)
                        .map(parrafo => parrafo.trim())
                        .filter(parrafo => parrafo.length > 0);
                    
                    if (parrafosProcesados.length > 0) {
                        cap.texto = parrafosProcesados; // Sustituimos siempre por el nuevo manuscrito gigante
                        cap.expandido = true;          // Encendemos el flag de control visual
                        log(`[ÉXITO] Capítulo ${cap.numero} expandido a ${parrafosProcesados.length} párrafos masivos.`);
                    } else {
                        throw new Error("La respuesta no contiene bloques separados por saltos de línea válidos.");
                    }
                } catch (errCap) {
                    log(`[CRÍTICO CAPÍTULO ${cap.numero}] Error de flujo de texto plano: ${errCap.message}`);
                    const promptFallback = promptCapitulo + " Escribe el texto largo continuo en párrafos bien definidos.";
                    const respuestaFallback = await llamarGemini(promptFallback, "", apiKey);
                    cap.texto = respuestaFallback.trim().split(/\n\n/).filter(x => x.length > 0);
                    cap.expandido = true;
                    log(`[FALLBACK COMPLETADO] Capítulo ${cap.numero} salvaguardado.`);
                }
                actualizarMatrizUI();
            }
        }
        
        if (agenteActivo) {
            log("[AGENTE SISTEMA] ¡Proceso Completado con Éxito! El manuscrito complejo se ha expandido a gran volumen.");
            log("Pulsa 'Exportar JSON' para descargar el Manuscrito definitivo.");
            actualizarMatrizUI();
        }
    } catch (e) {
        log(`[FALLO INMANENTE] Error en la ejecución de la red neuronal: ${e.message}`);
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

function procesarEstructuraJSON(objetoJSON) {
    try {
        let parsed = objetoJSON;
        if (parsed.plantilla_estructura) {
            parsed = parsed.plantilla_estructura;
        }
        libroData.titulo = parsed.titulo || "";
        libroData.portada = parsed.portada || " ";
        libroData.autores = parsed.autores || "";
        libroData.disclaimer = parsed.disclaimer || "";
        libroData.tono = parsed.tono || "Fantasía heroica, misterio escolar, descriptivo, clásico";
        libroData.estilo = parsed.estilo || "Tercera persona omnisciente, descripciones narrativas precisas";
        libroData.indice = parsed.indice || [];
        libroData.prologo = parsed.prologo || "";
        libroData.partes = parsed.partes || [];
        libroData.apendice = parsed.apendice || "";
        libroData.nota_final = parsed.nota_final || "";

        docTitulo.value = libroData.titulo;
        docAutores.value = libroData.autores;
        docDisclaimer.value = libroData.disclaimer;
        docTono.value = libroData.tono;
        docEstilo.value = libroData.estilo;
        
        if(parsed.concepto_central || parsed.idea) {
            docIdea.value = parsed.concepto_central || parsed.idea;
        } else if(libroData.prologo) {
            docIdea.value = libroData.prologo;
        }

        let contadorCaps = 0;
        if(libroData.partes) {
            libroData.partes.forEach(p => { 
                if(p.capitulos) {
                    p.capitulos.forEach(c => {
                        // Reseteamos el flag para que la interfaz sepa que está listo para sobrescribirse
                        c.expandido = false;
                        contadorCaps++;
                    });
                }
            });
        }
        if(contadorCaps > 0) docNumCaps.value = contadorCaps;
        log(`[SISTEMA] Estructura JSON mapeada con éxito. Detectados ${contadorCaps} capítulos listos para su procesamiento.`);
        actualizarMatrizUI();
    } catch (err) {
        log(`Error crítico al procesar estructura JSON: ${err.message}`);
    }
}

docNumCaps.addEventListener('change', () => {
    libroData.partes = [];
    inicializarEstructuraBaseVacia();
});

btnRunAgent.addEventListener('click', ejecutarFlujoAgentico);

btnAbortar.addEventListener('click', () => {
    log("[AGENTE] Cancelación manual del operador.");
    desactivarAgenteUI();
    actualizarMatrizUI();
});

btnPromptIA.addEventListener('click', () => {
    sincronizarDatosBase();
    const plantillaInstrucciones = GeminiPrompts.construirPlantillaInstruccionesIA(libroData, docIdea.value);
    const jsonString = JSON.stringify(plantillaInstrucciones, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        log("[SISTEMA] Instrucciones copiadas al portapapeles.");
        alert("¡Copiado! Estructura de volumen lista.");
    }).catch(err => {
        log(`Error al copiar al portapapeles: ${err}`);
    });
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
            log("[PORTAPAPELES] El portapapeles está vacío.");
            alert("El portapapeles está vacío.");
            return;
        }
        const jsonMapeado = JSON.parse(textoPortapapeles.trim());
        log("[PORTAPAPELES] Datos obtenidos correctamente desde el portapapeles.");
        procesarEstructuraJSON(jsonMapeado);
    } catch (err) {
        log(`Error al pegar JSON desde el portapapeles: ${err.message}. Asegúrate de que los datos copiados sean un JSON válido.`);
        alert("Error al parsear el JSON del portapapeles.");
    }
});

btnExportar.addEventListener('click', () => {
    sincronizarDatosBase();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(libroData, null, 2));
    const downloadAnchor = document.createElement('a');
    const nombreArchivo = (libroData.titulo || "manuscrito_silenos").toLowerCase().replace(/ /g, "_") + ".json";
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", nombreArchivo);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    log(`Manuscrito final exportado con éxito: ${nombreArchivo}`);
});

inicializarEstructuraBaseVacia();