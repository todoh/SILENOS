// main.js
let libroDataOriginal = null;
let baseDatosArtistica = {
    meta: { titulo: "", fecha_analisis: "", datos_visuales_manuales: "" },
    macro: {
        direccion_artistica: "",
        detalles_artisticos: null,
        enfoque_y_publico: null
    },
    listas_extraccion: {
        personajes: [], lugares: [], objetos: [], vehiculos: [], edificios: [], fx: []
    },
    evidencias_visuales: {
        personajes: {}, lugares: {}, objetos: {}, vehiculos: {}, edificios: {}, fx: {}
    },
    diseno_visual: {
        personajes: {}, lugares: {}, objetos: {}, vehiculos: {}, edificios: {}, fx: []
    }
};
let agenteActivo = false;
let faseActualGlobal = 1;

// Elementos DOM
const apiKeyInput = document.getElementById('api-key');
const datosVisualesManualesInput = document.getElementById('datos-visuales-manuales');
const logConsole = document.getElementById('log-console');
const importFileInput = document.getElementById('import-file');
const btnPegarJSON = document.getElementById('btn-pegar-json');
const btnExportarBBDD = document.getElementById('btn-exportar-bbdd');
const btnRunAgent = document.getElementById('btn-run-agent');
const btnContinuar = document.getElementById('btn-continuar');
const btnAbortar = document.getElementById('btn-abortar');
const agentBadge = document.getElementById('agent-status-badge');
const docTitulo = document.getElementById('doc-titulo');
const currentStepText = document.getElementById('current-step-text');

function log(texto) {
    const t = new Date().toLocaleTimeString();
    logConsole.innerText += `\n[${t}] ${texto}`;
    logConsole.scrollTop = logConsole.scrollHeight;
}

function limpiarMarkdown(jsonCrudo) {
    return jsonCrudo.replace(/```json/gi, "").replace(/```/gi, "").trim();
}

function actualizarVistaPreviaBBDD() {
    const previewWrapper = document.getElementById('wrapper-bbdd-preview');
    previewWrapper.innerHTML = "";

    if (!baseDatosArtistica.macro.direccion_artistica) {
        previewWrapper.innerHTML = "<p style='color:#6b7280; font-size:13px;'>Base de Datos vacía. Inicia el proceso agéntico en cascada.</p>";
        return;
    }

    let html = `<div style="padding: 10px; background: #f3f4f6; margin-bottom: 16px;">
        <strong>Dirección Artística General:</strong> <p style="font-size:12px; margin-top:4px;">${baseDatosArtistica.macro.direccion_artistica}</p>
    </div>`;

    if (baseDatosArtistica.meta.datos_visuales_manuales) {
        html += `<div style="padding: 8px 10px; background: #eef2ff; border-left: 3px solid #6366f1; margin-bottom: 16px; font-size: 11px;">
            <strong>Especificaciones Manuales Aplicadas:</strong> <br/>
            <span style="color:#374151;">${baseDatosArtistica.meta.datos_visuales_manuales}</span>
        </div>`;
    }

    if (baseDatosArtistica.macro.detalles_artisticos) {
        const det = baseDatosArtistica.macro.detalles_artisticos;
        html += `<div style="margin-bottom: 16px; font-size: 11px;">
            <strong>Matices:</strong> ${det.matices || '-'}<br/>
            <strong>Tiempo:</strong> ${det.tiempo || '-'}<br/>
            <strong>Lugar Macro:</strong> ${det.lugar_general || '-'}<br/>
            <strong>Atmósfera:</strong> ${det.ambientacion || '-'}
        </div>`;
    }

    const categorias = ['personajes', 'lugares', 'objetos', 'vehiculos', 'edificios', 'fx'];
    categorias.forEach(cat => {
        const totalElementos = baseDatosArtistica.listas_extraccion[cat] ? baseDatosArtistica.listas_extraccion[cat].length : 0;
        const disenados = baseDatosArtistica.diseno_visual[cat] ? Object.keys(baseDatosArtistica.diseno_visual[cat]).length : 0;
        
        html += `<div class="chapter-editor-item" style="border-bottom: 1px solid #eee; padding: 8px 0;">
            <div class="chapter-header">
                <div class="chapter-header-title" style="text-transform: uppercase; font-weight:bold;">${cat}</div>
                <div class="chapter-status ${disenados > 0 ? 'status-done' : 'status-pending'}">
                    ${disenados} / ${totalElementos} Diseñados
                </div>
            </div>
            <div style="font-size:11px; color:#4b5563; max-height:80px; overflow-y:auto; background:#fafafa; padding:6px;">
                ${totalElementos > 0 ? baseDatosArtistica.listas_extraccion[cat].join(", ") : '<em>Ninguno detectado aún</em>'}
            </div>
        </div>`;
    });

    previewWrapper.innerHTML = html;
}

function inicializarLibroJuego(objetoJSON) {
    try {
        if (!objetoJSON.secciones) {
            throw new Error("El JSON no posee un mapa o diccionario indexado de 'secciones'.");
        }
        libroDataOriginal = objetoJSON;
        docTitulo.value = libroDataOriginal.titulo || "Matriz Interactiva Anonimizada";
        baseDatosArtistica.meta.titulo = libroDataOriginal.titulo || "Matriz Interactiva Anonimizada";
        baseDatosArtistica.meta.fecha_analisis = new Date().toISOString();
        faseActualGlobal = 1;
        
        log(`[SISTEMA] Matriz cargada con éxito. Listo para ejecutar cascada analítica conceptual.`);
        btnRunAgent.disabled = false;
        btnContinuar.classList.add('hidden');
        actualizarVistaPreviaBBDD();
    } catch (err) {
        log(`Error al procesar archivo: ${err.message}`);
        alert("Estructura JSON no reconocida como librojuego compatible.");
    }
}

async function ejecutarCascadaArtistica(faseInicial = 1) {
    if (!libroDataOriginal) return;

    faseActualGlobal = faseInicial;
    agenteActivo = true;
    btnRunAgent.disabled = true;
    btnContinuar.classList.add('hidden');
    btnAbortar.classList.remove('hidden');
    agentBadge.classList.remove('hidden');
    agentBadge.classList.add('agent-active');

    const apiKey = apiKeyInput.value.trim();
    const datosVisualesManuales = datosVisualesManualesInput ? datosVisualesManualesInput.value.trim() : "";
    baseDatosArtistica.meta.datos_visuales_manuales = datosVisualesManuales;

    const systemPrompt = GeminiPrompts.obtenerSystemPromptBBDD();
    const categorias = ['personajes', 'lugares', 'objetos', 'vehiculos', 'edificios', 'fx'];

    try {
        // --- LLAMADA 1: CONFIGURACIÓN MACRO COMPLETA CON DATOS VISUALES MANUALES ---
        if (agenteActivo && faseActualGlobal === 1) {
            currentStepText.innerText = "Fase 1/13: Generando Dirección Artística Macro con Datos Visuales Manuales...";
            log("[FASE 1] Solicitando Núcleo Estético Completo incorporando especificaciones visuales...");
            const prompt1 = GeminiPrompts.obtenerPromptMacroCompleto(libroDataOriginal, datosVisualesManuales);
            const res1 = await llamarGemini(prompt1, systemPrompt, apiKey);
            const dataMacro = JSON.parse(limpiarMarkdown(res1));
            
            baseDatosArtistica.macro.direccion_artistica = dataMacro.direccion_artistica;
            baseDatosArtistica.macro.detalles_artisticos = dataMacro.detalles_artisticos;
            baseDatosArtistica.macro.enfoque_y_publico = dataMacro.enfoque_y_publico;
            
            log("[ÉXITO FASE 1] Estructura marco de producción unificada.");
            actualizarVistaPreviaBBDD();
            faseActualGlobal = 2;
        }

        // --- LLAMADAS 2 A 7: EXTRACCIÓN Y EVIDENCIAS VISUALES INDEPENDIENTES POR CATEGORÍA ---
        for (let i = 0; i < categorias.length; i++) {
            const numFase = 2 + i;
            if (!agenteActivo) return;

            if (faseActualGlobal === numFase) {
                const cat = categorias[i];
                currentStepText.innerText = `Fase ${numFase}/13: Extrayendo Inventario y Evidencias Visuales de ${cat.toUpperCase()}...`;
                log(`[FASE ${numFase}] Analizando manuscrito y pautas manuales para aislar ${cat.toUpperCase()} y sus datos estéticos...`);
                
                const promptExtraccion = GeminiPrompts.obtenerPromptExtraccionCategoria(libroDataOriginal, cat, datosVisualesManuales);
                const resExtraccion = await llamarGemini(promptExtraccion, systemPrompt, apiKey);
                const dataExtraccion = JSON.parse(limpiarMarkdown(resExtraccion));

                const rawList = dataExtraccion[cat] || [];
                const nombres = [];
                const evidencias = {};

                rawList.forEach(item => {
                    if (typeof item === 'string') {
                        nombres.push(item);
                        evidencias[item] = "Sin mención explícita en texto";
                    } else if (item && typeof item === 'object') {
                        const nom = item.nombre || item.elemento || "Elemento";
                        nombres.push(nom);
                        evidencias[nom] = item.evidencia_visual || item.descripcion_visual || "Sin mención explícita";
                    }
                });

                baseDatosArtistica.listas_extraccion[cat] = nombres;
                baseDatosArtistica.evidencias_visuales[cat] = evidencias;

                log(`[ÉXITO FASE ${numFase}] Catalogados ${nombres.length} elementos en ${cat.toUpperCase()} con sus evidencias estéticas.`);
                actualizarVistaPreviaBBDD();
                faseActualGlobal = numFase + 1;
            }
        }

        // --- LLAMADAS 8 A 13: DISEÑO CONCEPTUAL VISUAL GROUNDED (1 POR CATEGORÍA) ---
        for (let i = 0; i < categorias.length; i++) {
            const numFase = 8 + i;
            if (!agenteActivo) return;

            if (faseActualGlobal === numFase) {
                const cat = categorias[i];
                currentStepText.innerText = `Fase ${numFase}/13: Diseñando Fichas Visuales de ${cat.toUpperCase()}...`;
                
                const listaElementos = baseDatosArtistica.listas_extraccion[cat] || [];
                const evidenciasCat = baseDatosArtistica.evidencias_visuales[cat] || {};

                if (listaElementos.length === 0) {
                    log(`[FASE ${numFase}] Saltando diseño de ${cat} por lista vacía.`);
                    baseDatosArtistica.diseno_visual[cat] = {};
                    faseActualGlobal = numFase + 1;
                    continue;
                }

                log(`[FASE ${numFase}] Generando fichas de producción visual para ${cat} aplicando evidencias extraídas y pautas manuales...`);
                const promptDiseno = GeminiPrompts.obtenerPromptDisenoVisual(
                    listaElementos,
                    evidenciasCat,
                    cat,
                    baseDatosArtistica.macro.direccion_artistica,
                    baseDatosArtistica.macro.detalles_artisticos,
                    baseDatosArtistica.macro.enfoque_y_publico,
                    datosVisualesManuales
                );

                const resDiseno = await llamarGemini(promptDiseno, systemPrompt, apiKey);
                const parsedDiseno = JSON.parse(limpiarMarkdown(resDiseno));
                
                baseDatosArtistica.diseno_visual[cat] = parsedDiseno[`${cat}_disenados`] || parsedDiseno;
                log(`[ÉXITO FASE ${numFase}] Fichas estéticas de ${cat} consolidadas.`);
                actualizarVistaPreviaBBDD();
                faseActualGlobal = numFase + 1;
            }
        }

        if (agenteActivo && faseActualGlobal > 13) {
            currentStepText.innerText = "Proceso Concluido con Éxito (13 Llamadas)";
            log("[SISTEMA AGÉNTICO COMPLETE] Se ha consolidado la Base de Datos Visual en un Pipeline optimizado de 13 llamadas sin extrapolaciones.");
            btnContinuar.classList.add('hidden');
        }

    } catch (err) {
        log(`[INTERRUPCIÓN / ERROR EN FASE ${faseActualGlobal}] ${err.message}`);
        
        if (err.status === 429 || err.message.includes("429")) {
            currentStepText.innerText = `Pausado en Fase ${faseActualGlobal}/13 por Límite de Cuota (Error 429).`;
            log(`[SISTEMA PAUSADO] Espera unos segundos a que se reasigne la cuota y pulsa "CONTINUAR DESDE FASE INTERRUMPIDA".`);
        } else {
            currentStepText.innerText = `Pausado por error en Fase ${faseActualGlobal}/13.`;
        }

        btnContinuar.classList.remove('hidden');
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

btnRunAgent.addEventListener('click', () => ejecutarCascadaArtistica(1));

btnContinuar.addEventListener('click', () => {
    log(`[REANUDACIÓN] Continuando la secuencia agéntica desde la Fase ${faseActualGlobal}/13...`);
    ejecutarCascadaArtistica(faseActualGlobal);
});

btnAbortar.addEventListener('click', () => {
    log("[OPERACIÓN] Cancelado por el usuario.");
    desactivarAgenteUI();
    currentStepText.innerText = `Interrumpido en Fase ${faseActualGlobal}/13. Puedes reanudar cuando desees.`;
    btnContinuar.classList.remove('hidden');
});

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const parsed = JSON.parse(evt.target.result);
            inicializarLibroJuego(parsed);
        } catch (e) { log("Error al decodificar JSON."); }
    };
    reader.readAsText(file);
});

btnPegarJSON.addEventListener('click', async () => {
    try {
        const texto = await navigator.clipboard.readText();
        if (texto) inicializarLibroJuego(JSON.parse(texto.trim()));
    } catch (err) { alert("Error al pegar desde el portapapeles."); }
});

btnExportarBBDD.addEventListener('click', () => {
    if (!baseDatosArtistica.macro.direccion_artistica) {
        alert("No hay base de datos artística compilada.");
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(baseDatosArtistica, null, 2));
    const downloadAnchor = document.createElement('a');
    const filename = `bbdd_artistica_${(baseDatosArtistica.meta.titulo).toLowerCase().replace(/ /g, "_")}.json`;
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    log(`[EXPORTACIÓN] Base de Datos Visual salvada en: ${filename}`);
});