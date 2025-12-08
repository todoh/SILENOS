// --- IA: GENERACIÓN DE GUIONES (Google Gemma 3 - MODO METRALLETA) ---
import { getApiKeysList } from './apikey.js';

console.log("Módulo IA Guiones Cargado (Rotación de Keys Activa)");

const guionPromptInput = document.getElementById('ia-guion-prompt');
const chaptersInput = document.getElementById('ia-guion-chapters');
const btnGenGuion = document.getElementById('btn-gen-guion');
const useDataToggle = document.getElementById('ia-use-data');

// Referencias a UI de progreso
const progressContainer = document.getElementById('guion-progress');

// Helper de espera
const delay = ms => new Promise(res => setTimeout(res, ms));

// Helper UI Progreso
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

// Helper para limpiar respuesta JSON
function cleanAndParseJSON(str) {
    try {
        const firstBrace = str.indexOf('{');
        const lastBrace = str.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            str = str.substring(firstBrace, lastBrace + 1);
        }

        let clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("Fallo parseando JSON:", e);
        console.log("Raw string recibida:", str);
        return null;
    }
}

function getUniverseContext() {
    const rawData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
    if (rawData.length === 0) return "No hay datos definidos en el Universo.";
    return rawData.map(d => `[CATEGORÍA: ${d.category || 'GENERAL'}] TÍTULO: ${d.title}\nCONTENIDO: ${d.content}`).join('\n\n');
}

// --- FUNCIÓN PRINCIPAL DE LLAMADA A GOOGLE (MODO METRALLETA) ---
async function callGoogleAPI(systemPrompt, userPrompt, temperature = 0.7) {
    
    const keyList = getApiKeysList();
    if (!keyList || keyList.length === 0) throw new Error("No hay API Keys configuradas.");

    const MODEL_NAME = "gemma-3-12b-it"; 
    const MAX_RETRIES = 27; // Límite de intentos total
    let lastError = null;

    // Bucle de rotación
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        
        // Selección de Key rotativa: 0%3=0, 1%3=1, 2%3=2, 3%3=0...
        const currentKey = keyList[attempt % keyList.length];
        
        // Log discreto para depuración
        console.log(`Intento ${attempt + 1}/${MAX_RETRIES} usando Key finalizada en ...${currentKey.slice(-4)}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${currentKey}`;

        const combinedPrompt = `
        === INSTRUCCIONES DEL SISTEMA ===
        ${systemPrompt}
        
        === ENTRADA DEL USUARIO ===
        ${userPrompt}
        `;

        const payload = {
            contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 8192
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            // Si la respuesta NO es ok, lanzamos error para que lo capture el catch y rote
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const status = response.status;
                const msg = errData.error?.message || response.statusText;
                
                // Errores "Retryables": 429 (Too Many Requests), 503 (Service Unavailable), 500 (Internal)
                // En realidad, en modo metralleta, ante CUALQUIER error probamos la siguiente llave.
                throw new Error(`Error API (${status}): ${msg}`);
            }
            
            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                // Si devuelve 200 pero vacío, es un fallo lógico, quizás no merezca la pena rotar, 
                // pero por seguridad, rotamos.
                throw new Error("La IA no devolvió candidatos de texto (Respuesta vacía).");
            }

            // ÉXITO: Retornamos el texto inmediatamente y rompemos el bucle
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            lastError = error;
            console.warn(`Fallo en intento ${attempt + 1}: ${error.message}. Cambiando cargador...`);
            
            // Pequeña pausa antes de recargar (opcional, ayuda a no saturar CPU local)
            // Si es el último intento, no esperamos
            if (attempt < MAX_RETRIES - 1) {
                await delay(500); // 0.5s de tiempo de recarga
            }
        }
    }

    // Si llegamos aquí, han fallado los 27 intentos
    throw new Error(`Fallo total tras ${MAX_RETRIES} intentos. Último error: ${lastError.message}`);
}

async function generateScriptFromText() {
    // Verificación inicial de existencia de keys
    const keys = getApiKeysList();
    if (keys.length === 0) return alert("Configura al menos una Google API Key.");

    const promptText = guionPromptInput ? guionPromptInput.value.trim() : "";
    const numChapters = chaptersInput ? parseInt(chaptersInput.value) : 5;
    const useDeepData = useDataToggle ? useDataToggle.checked : false;

    if (!promptText) return alert("Escribe una descripción.");

    if(btnGenGuion) btnGenGuion.disabled = true;
    showProgress(true);
    updateProgress(5, "Iniciando secuencia de disparo...");

    try {
        if (useDeepData) {
            await generateDeepScript(promptText, numChapters);
        } else {
            await generateFastScript(promptText, numChapters);
        }

        updateProgress(100, "¡Objetivo Neutralizado (Completado)!");
        await delay(500);
        alert("¡Guion generado correctamente!");
        if(guionPromptInput) guionPromptInput.value = "";
        
        if (window.renderScriptList) window.renderScriptList();
        if (window.refreshScriptSelector) window.refreshScriptSelector();

    } catch (err) {
        alert("Error Crítico: " + err.message);
        updateProgress(0, "Misión Fallida");
    } finally {
        if(btnGenGuion) {
            btnGenGuion.innerText = "Generar Guion";
            btnGenGuion.disabled = false;
        }
        setTimeout(() => showProgress(false), 2000);
    }
}

// --- MODO 1: RÁPIDO ---
async function generateFastScript(promptText, numChapters) {
    if(btnGenGuion) btnGenGuion.innerText = "Creando Estructura...";
    updateProgress(30, "Generando estructura completa...");

    const jsonTemplate = {
        "title": "Título del Guion",
        "plot_summary": "Resumen general de toda la historia (Planteamiento General)",
        "chapters": [ { "number": 1, "summary": "Resumen específico de lo que pasa en este capítulo" } ]
    };

    const systemPrompt = `Eres un guionista experto. 
    Genera una estructura narrativa de ${numChapters} capítulos basada en la idea del usuario.
    
    ESTRUCTURA DE SALIDA:
    1. Un "plot_summary" que sirva como visión global.
    2. Una lista de "chapters", donde cada uno tiene su resumen específico.
    
    Responde SOLO con JSON válido siguiendo este esquema: ${JSON.stringify(jsonTemplate)}`;

    const userPrompt = `Idea: ${promptText}.`;

    // Ya no pasamos apiKey individual, la función callGoogleAPI gestiona la lista
    const jsonRaw = await callGoogleAPI(systemPrompt, userPrompt);
    updateProgress(80, "Procesando respuesta...");
    
    const scriptData = cleanAndParseJSON(jsonRaw);

    if (!scriptData) throw new Error("Gemma no devolvió un JSON válido tras múltiples intentos.");

    saveGeneratedScript(scriptData.title, scriptData.plot_summary, scriptData.chapters);
}

// --- MODO 2: PROFUNDO (Contexto Universo) ---
async function generateDeepScript(promptText, numChapters) {
    const universeContext = getUniverseContext();
    
    // Total steps = 1 (Plot) + numChapters
    const totalSteps = 1 + numChapters;
    let currentStep = 0;

    // Paso 1: Trama General
    if(btnGenGuion) btnGenGuion.innerText = "Consultando Universo...";
    updateProgress(10, "Creando trama maestra...");
    
    const systemPromptPlot = `Eres un Arquitecto Narrativo experto usando la 'Biblia de Universo' proporcionada.
    Crea una trama sólida de ${numChapters} capítulos.
    Responde ÚNICAMENTE con un JSON crudo: { "title": "Título", "plot_summary": "Resumen detallado de toda la obra..." }`;
    
    const userPromptPlot = `[DATOS DEL UNIVERSO]:\n${universeContext}\n\n[IDEA USUARIO]:\n${promptText}`;

    const plotJsonRaw = await callGoogleAPI(systemPromptPlot, userPromptPlot);
    const plotData = cleanAndParseJSON(plotJsonRaw);
    
    currentStep++;
    let percent = (currentStep / totalSteps) * 100;
    updateProgress(percent, "Trama maestra lista. Diseñando capítulos...");

    const generatedChapters = [];
    const title = plotData?.title || "Guion IA";
    const generalPlotFull = plotData?.plot_summary || "Trama generada...";

    // Paso 2: Loop de Capítulos
    for (let i = 1; i <= numChapters; i++) {
        if(btnGenGuion) btnGenGuion.innerText = `Diseñando Cap ${i}/${numChapters}...`;
        if (i > 1) await delay(1000); 

        const summariesSoFar = generatedChapters.map(c => `Cap ${c.number}: ${c.summary}`).join('\n');

        const systemPromptChap = `Eres un Guionista Técnico detallando el Capítulo ${i} de ${numChapters}.
        Responde ÚNICAMENTE con un JSON crudo: { "summary": "Acción específica y detalles de este capítulo..." }`;

        const userPromptChap = `
        [TRAMA GLOBAL]: ${generalPlotFull}
        [CAPÍTULOS ANTERIORES]: ${summariesSoFar || "Inicio"}
        [CONTEXTO UNIVERSO]: ${universeContext}
        `;

        const chapJsonRaw = await callGoogleAPI(systemPromptChap, userPromptChap);
        const chapData = cleanAndParseJSON(chapJsonRaw);

        generatedChapters.push({
            number: i,
            summary: chapData?.summary || "Error generando capítulo."
        });

        currentStep++;
        percent = (currentStep / totalSteps) * 100;
        updateProgress(percent, `Capítulo ${i} diseñado...`);
    }

    saveGeneratedScript(title, generalPlotFull, generatedChapters);
}

// --- FUNCIÓN DE GUARDADO ESTRUCTURAL ---
function saveGeneratedScript(title, plot, chaptersArr) {
    const scenes = [];

    // ESCENA 1: PLANTEAMIENTO GENERAL
    scenes.push({
        title: "ESCENA 1: PLANTEAMIENTO GENERAL",
        paragraphs: [{ 
            text: plot || "Sin resumen general.", 
            image: null 
        }]
    });

    // ESCENAS 2...N: PLANTEAMIENTOS DE CAPÍTULO
    if (chaptersArr && Array.isArray(chaptersArr)) {
        chaptersArr.forEach(chap => {
            scenes.push({ 
                title: `ESCENA ${parseInt(chap.number) + 1}: PLANTEAMIENTO CAPÍTULO ${chap.number}`, 
                paragraphs: [{ 
                    text: chap.summary || "Contenido pendiente.", 
                    image: null 
                }] 
            });
        });
    }

    const newScript = {
        id: Date.now(),
        title: title || "Guion Estructurado IA",
        isAI: true,
        scenes: scenes
    };

    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    scripts.push(newScript);
    localStorage.setItem('minimal_scripts_v1', JSON.stringify(scripts));
}

// Exportar funciones
window.generateScriptFromText = generateScriptFromText;