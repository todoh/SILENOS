// main.js
let libroDataOriginal = null;
let baseDatosArtistica = {
    meta: { titulo: "", fecha_analisis: "" },
    macro: {
        direccion_artistica: "",
        detalles_artisticos: null,
        enfoque_y_publico: null
    },
    listas_extraccion: {
        personajes: [], lugares: [], objetos: [], vehiculos: [], edificios: [], fx: []
    },
    diseno_visual: {
        personajes: {}, lugares: {}, objetos: {}, vehiculos: {}, edificios: {}, fx: []
    }
};
let agenteActivo = false;

// Elementos DOM
const apiKeyInput = document.getElementById('api-key');
const logConsole = document.getElementById('log-console');
const importFileInput = document.getElementById('import-file');
const btnPegarJSON = document.getElementById('btn-pegar-json');
const btnExportarBBDD = document.getElementById('btn-exportar-bbdd');
const btnRunAgent = document.getElementById('btn-run-agent');
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
        
        log(`[SISTEMA] Matriz cargada con éxito. Listo para ejecutar cascada analítica conceptual.`);
        btnRunAgent.disabled = false;
        actualizarVistaPreviaBBDD();
    } catch (err) {
        log(`Error al procesar archivo: ${err.message}`);
        alert("Estructura JSON no reconocida como librojuego compatible.");
    }
}

async function ejecutarCascadaArtistica() {
    if (!libroDataOriginal) return;

    agenteActivo = true;
    btnRunAgent.disabled = true;
    btnAbortar.classList.remove('hidden');
    agentBadge.classList.remove('hidden');
    agentBadge.classList.add('agent-active');

    const apiKey = apiKeyInput.value.trim();
    const systemPrompt = GeminiPrompts.obtenerSystemPromptBBDD();

    try {
        // --- LLAMADA 1: CONFIGURACIÓN MACRO COMPLETA (DIRECCIÓN, DETALLES Y PÚBLICO) ---
        if (agenteActivo) {
            currentStepText.innerText = "Fase 1/9: Generando Dirección Artística, Detalles y Público Objetivo...";
            log("[FASE 1] Solicitando Núcleo Estético Completo (Dirección, Detalles y Audiencia)...");
            const prompt1 = GeminiPrompts.obtenerPromptMacroCompleto(libroDataOriginal);
            const res1 = await llamarGemini(prompt1, systemPrompt, apiKey);
            const dataMacro = JSON.parse(limpiarMarkdown(res1));
            
            baseDatosArtistica.macro.direccion_artistica = dataMacro.direccion_artistica;
            baseDatosArtistica.macro.detalles_artisticos = dataMacro.detalles_artisticos;
            baseDatosArtistica.macro.enfoque_y_publico = dataMacro.enfoque_y_publico;
            
            log("[ÉXITO FASE 1] Estructura marco de producción unificada.");
            actualizarVistaPreviaBBDD();
        }

        // --- LLAMADA 2: EXTRACCIÓN DE PERSONAJES ---
        if (agenteActivo) {
            currentStepText.innerText = "Fase 2/9: Extrayendo Inventario Global de PERSONAJES...";
            log("[FASE 2] Analizando manuscrito para aislar el reparto de personajes...");
            const prompt2 = GeminiPrompts.obtenerPromptPersonajes(libroDataOriginal);
            const res2 = await llamarGemini(prompt2, systemPrompt, apiKey);
            const dataPjs = JSON.parse(limpiarMarkdown(res2));
            
            baseDatosArtistica.listas_extraccion.personajes = dataPjs.personajes || [];
            log(`[ÉXITO FASE 2] Catalogados ${baseDatosArtistica.listas_extraccion.personajes.length} personajes.`);
            actualizarVistaPreviaBBDD();
        }

        // --- LLAMADA 3: EXTRACCIÓN DE RESTO DE ELEMENTOS (LUGARES, OBJETOS, FX, VEHÍCULOS, EDIFICIOS) ---
        if (agenteActivo) {
            currentStepText.innerText = "Fase 3/9: Indexando Entorno (Lugares, Objetos, FX, Vehículos y Edificios)...";
            log("[FASE 3] Realizando barrido consolidado de activos contextuales...");
            const prompt3 = GeminiPrompts.obtenerPromptRestoElementos(libroDataOriginal);
            const res3 = await llamarGemini(prompt3, systemPrompt, apiKey);
            const dataElementos = JSON.parse(limpiarMarkdown(res3));
            
            baseDatosArtistica.listas_extraccion.lugares = dataElementos.lugares || [];
            baseDatosArtistica.listas_extraccion.objetos = dataElementos.objetos || [];
            baseDatosArtistica.listas_extraccion.fx = dataElementos.fx || [];
            baseDatosArtistica.listas_extraccion.vehiculos = dataElementos.vehiculos || [];
            baseDatosArtistica.listas_extraccion.edificios = dataElementos.edificios || [];
            
            log("[ÉXITO FASE 3] Inventarios ambientales unificados e indexados.");
            actualizarVistaPreviaBBDD();
        }

        // --- LLAMADAS 4 A 9: DISEÑO CONCEPTUAL VISUAL CONTEXTUAL (1 POR CATEGORÍA, SIN EL LIBRO) ---
        const categorias = ['personajes', 'lugares', 'objetos', 'vehiculos', 'edificios', 'fx'];
        let faseActual = 4;

        for (const cat of categorias) {
            if (!agenteActivo) return;
            currentStepText.innerText = `Fase ${faseActual}/9: Diseñando Visualmente Atributos de ${cat.toUpperCase()}...`;
            
            const listaElementos = baseDatosArtistica.listas_extraccion[cat];
            if (listaElementos.length === 0) {
                log(`[FASE ${faseActual}] Saltando diseño de ${cat} por lista vacía.`);
                baseDatosArtistica.diseno_visual[cat] = {};
                faseActual++;
                continue;
            }

            log(`[FASE ${faseActual}] Generando fichas visuales para ${cat} utilizando el bloque de dirección como contexto...`);
            const promptDiseno = GeminiPrompts.obtenerPromptDisenoVisual(
                listaElementos,
                cat,
                baseDatosArtistica.macro.direccion_artistica,
                baseDatosArtistica.macro.detalles_artisticos,
                baseDatosArtistica.macro.enfoque_y_publico
            );

            const resDiseno = await llamarGemini(promptDiseno, systemPrompt, apiKey);
            const parsedDiseno = JSON.parse(limpiarMarkdown(resDiseno));
            
            baseDatosArtistica.diseno_visual[cat] = parsedDiseno[`${cat}_disenados`] || parsedDiseno;
            log(`[ÉXITO FASE ${faseActual}] Fichas estéticas de ${cat} consolidadas.`);
            actualizarVistaPreviaBBDD();
            faseActual++;
        }

        if (agenteActivo) {
            currentStepText.innerText = "Proceso Concluido con Éxito";
            log("[SISTEMA AGÉNTICO COMPLETE] Se ha consolidado la Base de Datos en un Pipeline optimizado de 9 llamadas.");
        }

    } catch (err) {
        log(`[FALLO CRÍTICO EN CASCADA] ${err.message}`);
        currentStepText.innerText = "Error en la ejecución";
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

btnRunAgent.addEventListener('click', ejecutarCascadaArtistica);

btnAbortar.addEventListener('click', () => {
    log("[OPERACIÓN] Cancelado por el usuario.");
    desactivarAgenteUI();
    currentStepText.innerText = "Interrumpido";
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