// --- IA: GENERACIÓN DE GUIONES (Controlador UI) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';

console.log("Módulo IA Guiones Cargado (v2.1 - Event Listener Fixed)");

const guionPromptInput = document.getElementById('ia-guion-prompt');
const chaptersInput = document.getElementById('ia-guion-chapters');
const btnGenGuion = document.getElementById('btn-gen-guion');
const useDataToggle = document.getElementById('ia-use-data');
const progressContainer = document.getElementById('guion-progress');

// --- CORRECCIÓN DE EVENTOS (FIX REFERENCE ERROR) ---
// Vinculamos el evento directamente en JS para no depender del HTML onclick
if (btnGenGuion) {
    btnGenGuion.onclick = null; // Eliminamos la referencia rota del HTML
    btnGenGuion.addEventListener('click', generateScriptFromText);
}

// --- HELPERS UI ---
function updateProgress(percent, text) {
    if(!progressContainer) return;
    const fill = progressContainer.querySelector('.progress-fill');
    const textEl = progressContainer.querySelector('.progress-text');
    const percentEl = progressContainer.querySelector('.progress-percent');
    
    if(fill) fill.style.width = `${percent}%`;
    if(textEl) textEl.textContent = text;
    if(percentEl) percentEl.textContent = `${Math.floor(percent)}%`;
}

function showProgress(show) {
    if(!progressContainer) return;
    if(show) progressContainer.classList.add('active');
    else progressContainer.classList.remove('active');
}

function getUniverseContext() {
    const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    if (rawData.length === 0) return "No hay datos definidos en el Universo. Usa el input del usuario como única fuente.";
    return rawData.map(d => `[DATO: ${d.category || 'GENERAL'}] TÍTULO: ${d.title}\nCONTENIDO: ${d.content}`).join('\n\n');
}

// --- LÓGICA PRINCIPAL ---

async function generateScriptFromText() {
    // Verificamos llaves antes de nada
    const keys = await getApiKeysList();
    
    if (!keys || keys.length === 0) return alert("El sistema no pudo recuperar las llaves del servidor y no hay ninguna configurada manualmente.");

    const promptText = guionPromptInput ? guionPromptInput.value.trim() : "";
    const numChapters = chaptersInput ? parseInt(chaptersInput.value) : 5;
    const useDeepData = useDataToggle ? useDataToggle.checked : false;

    if (!promptText) return alert("Escribe una descripción o pega tu índice de capítulos.");

    if(btnGenGuion) btnGenGuion.disabled = true;
    showProgress(true);
    updateProgress(5, "Analizando instrucciones...");

    try {
        if (useDeepData) {
            await generateDeepScript(promptText, numChapters);
        } else {
            await generateFastScript(promptText, numChapters);
        }

        updateProgress(100, "¡Guion Terminado!");
        await delay(500);
        alert("¡Guion generado correctamente!");
        // No borramos el prompt por si el usuario quiere reajustar algo
        
        if (window.renderScriptList) window.renderScriptList();
        if (window.refreshScriptSelector) window.refreshScriptSelector();

    } catch (err) {
        console.error(err);
        alert("Error en el proceso: " + err.message);
        updateProgress(0, "Proceso Detenido");
    } finally {
        if(btnGenGuion) {
            btnGenGuion.innerText = "Generar Guion";
            btnGenGuion.disabled = false;
        }
        setTimeout(() => showProgress(false), 3000);
    }
}

// --- MODO 1: RÁPIDO (Estructura Simple) ---
async function generateFastScript(promptText, numChapters) {
    if(btnGenGuion) btnGenGuion.innerText = "Estructurando...";
    updateProgress(30, "Creando esqueleto del guion...");

    const jsonTemplate = {
        "title": "Título del Guion",
        "plot_summary": "Resumen o Tesis del documento",
        "chapters": [ { "number": 1, "summary": "Descripción precisa del contenido..." } ]
    };

    // Prompt ajustado para OBEDECER estructuras
    const systemPrompt = `Eres un Arquitecto de Contenidos y Guionista Experto.
    TAREA: Crear una estructura de ${numChapters} capítulos basada ESTRICTAMENTE en la entrada del usuario.
    
    DIRECTRICES CRÍTICAS:
    1. SI EL USUARIO DA UN ÍNDICE/ESQUEMA: Úsalo tal cual. Tu trabajo es formatearlo a JSON, no inventar una historia nueva.
    2. SI ES NO-FICCIÓN (Ensayo, Tesis): Mantén el rigor, los temas y la estructura lógica. No inventes personajes ni drama.
    3. SI ES FICCIÓN (Idea vaga): Crea una estructura narrativa clásica.
    
    Tu salida debe ser un JSON válido que represente fielmente la voluntad del usuario.
    FORMATO: ${JSON.stringify(jsonTemplate)}`;

    const userPrompt = `[INSTRUCCIONES / ESQUEMA DEL USUARIO]:\n${promptText}`;

    const jsonRaw = await callGoogleAPI(systemPrompt, userPrompt, {
        model: "gemma-3-12b-it",
        temperature: 0.7 // Temperatura más baja para ser más fiel a las instrucciones
    });

    updateProgress(80, "Guardando estructura...");
    
    const scriptData = cleanAndParseJSON(jsonRaw);
    if (!scriptData) throw new Error("La IA no devolvió un JSON válido.");

    saveGeneratedScript(scriptData.title, scriptData.plot_summary, scriptData.chapters);
}

// --- MODO 2: PROFUNDO (Plan + Ejecución) ---
async function generateDeepScript(promptText, numChapters) {
    const universeContext = getUniverseContext();
    
    // FASE 1: EL PLAN MAESTRO
    if(btnGenGuion) btnGenGuion.innerText = "Planificando...";
    updateProgress(10, "Interpretando estructura del usuario...");
    
    const systemPromptPlan = `Eres un Editor Jefe y Arquitecto Narrativo.
    TU OBJETIVO: Analizar la solicitud del usuario y crear un PLAN DE CAPÍTULOS DETALLADO.
    
    REGLA DE ORO (STRICT MODE):
    - Si el input del usuario contiene un ÍNDICE, LISTA DE TEMAS o ESQUEMA DE CAPÍTULOS: ¡COPIA Y ADAPTA ESA ESTRUCTURA! No inventes nada fuera de ella.
    - Si el input es abstracto, entonces propón una estructura creativa.
    - Diferencia claramente entre FICCIÓN (Narrativa) y NO-FICCIÓN (Ensayo, Documental).
    
    Debes generar una lista 'chapter_plan' con EXACTAMENTE ${numChapters} elementos (o los que dicte el esquema del usuario si es explícito).
    
    FORMATO JSON: 
    { 
        "title": "Título del Proyecto", 
        "global_context": "Contexto general o Tesis central", 
        "chapter_plan": [
            "Instrucción detallada para el Cap 1",
            "Instrucción detallada para el Cap 2",
            ...
        ] 
    }`;
    
    const userPromptPlan = `
    [CONTEXTO DEL UNIVERSO/DATOS]:
    ${universeContext}
    
    [INPUT DEL USUARIO (ESTRUCTURA BASE)]:
    ${promptText}
    `;

    const planJsonRaw = await callGoogleAPI(systemPromptPlan, userPromptPlan, {
        model: "gemma-3-27b-it", // Usamos modelo mayor para mejor comprensión lectora
        temperature: 0.7 
    });

    const planData = cleanAndParseJSON(planJsonRaw);
    if (!planData || !planData.chapter_plan || !Array.isArray(planData.chapter_plan)) {
        throw new Error("La IA no pudo interpretar el esquema. Intenta simplificar el input o usa el modo rápido.");
    }

    const planList = planData.chapter_plan;
    const totalSteps = planList.length;
    const generatedChapters = [];
    
    // FASE 2: EJECUCIÓN DEL PLAN
    updateProgress(20, "Plan aprobado. Escribiendo contenidos...");

    for (let i = 0; i < totalSteps; i++) {
        const currentStepNum = i + 1;
        const currentInstruction = planList[i];
        
        if(btnGenGuion) btnGenGuion.innerText = `Escribiendo Cap ${currentStepNum}/${totalSteps}...`;
        const percent = 20 + ((currentStepNum / totalSteps) * 80);
        updateProgress(percent, `Redactando Capítulo ${currentStepNum}: ${currentInstruction.substring(0, 20)}...`);

        // Pausa técnica
        if (i > 0) await delay(800);

        let chapterContent = "";
        let retries = 0;
        let success = false;

        while (!success && retries < 3) {
            const systemPromptWrite = `Eres un Redactor Profesional (Ghostwriter).
            ESTAMOS EN: Capítulo ${currentStepNum} de ${totalSteps}.
            CONTEXTO GLOBAL: ${planData.global_context}
            
            TU ORDEN: Escribe el contenido COMPLETO para este capítulo basándote ÚNICAMENTE en la instrucción específica del plan.
            - Si la instrucción pide teoría/ensayo: Escribe teoría profunda.
            - Si la instrucción pide escena/diálogo: Escribe narrativa.
            - NO te desvíes del tema asignado a este capítulo.
            - NO repitas introducciones, ve al grano.
            
            OUTPUT: JSON estricto { "content": "Texto del contenido..." }`;

            const userPromptWrite = `
            [PLAN DE CAPÍTULO ACTUAL]: "${currentInstruction}"
            
            [RESUMEN DE LO ANTERIOR]:
            ${generatedChapters.length > 0 ? generatedChapters[generatedChapters.length - 1].summary.substring(0, 200) + "..." : "Inicio del documento."}
            `;

            try {
                const chapJsonRaw = await callGoogleAPI(systemPromptWrite, userPromptWrite, {
                    model: "gemma-3-27b-it",
                    temperature: 0.8
                });

                const chapData = cleanAndParseJSON(chapJsonRaw);
                
                if (chapData && chapData.content) {
                    chapterContent = chapData.content;
                    success = true;
                } else {
                    // Fallback texto plano si falla JSON
                    if (chapJsonRaw && chapJsonRaw.length > 20) {
                        chapterContent = chapJsonRaw;
                        success = true;
                    } else {
                        retries++;
                    }
                }
            } catch (e) {
                console.error(`Error cap ${currentStepNum}`, e);
                retries++;
                await delay(1000);
            }
        }

        generatedChapters.push({
            number: currentStepNum,
            summary: chapterContent || "[Error: La IA no pudo generar contenido para este punto]"
        });
    }

    saveGeneratedScript(planData.title, planData.global_context, generatedChapters);
}

// --- GUARDADO ---
function saveGeneratedScript(title, plot, chaptersArr) {
    const scenes = [];

    // Escena 0: Planteamiento / Contexto
    scenes.push({
        title: "INTRODUCCIÓN / CONTEXTO GLOBAL",
        paragraphs: [{ 
            text: plot || "Sin resumen general.", 
            image: null 
        }]
    });

    // Escenas de Capítulos
    if (chaptersArr && Array.isArray(chaptersArr)) {
        chaptersArr.forEach(chap => {
            scenes.push({ 
                title: `CAPÍTULO ${chap.number}`, 
                paragraphs: [{ 
                    text: chap.summary || "Contenido pendiente.", 
                    image: null 
                }] 
            });
        });
    }

    const newScript = {
        id: Date.now(),
        title: title || "Guion Generado (IA)",
        isAI: true,
        scenes: scenes
    };

    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    scripts.push(newScript);
    localStorage.setItem('minimal_scripts_v1', JSON.stringify(scripts));
}

// Mantenemos la exportación por compatibilidad, aunque el listener ya se encarga
window.generateScriptFromText = generateScriptFromText;