// --- IA: GENERACIÓN DE LIBROS (Google Gemma 3 - MODO METRALLETA) ---
import { getApiKeysList } from './apikey.js';

console.log("Módulo IA Libros Cargado (Rotación de Keys Activa)");

const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs');
const btnGenLibro = document.getElementById('btn-gen-libro');

// Referencias a UI de progreso
const progressContainer = document.getElementById('libro-progress');

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
        console.error("Error parseando JSON libro:", e);
        console.log("Raw string recibida:", str);
        return { chapter_title: "Borrador (Raw)", content: [str] };
    }
}

// --- FUNCIÓN DE LLAMADA API CON ROTACIÓN DE KEYS ---
async function callGoogleAPI(systemPrompt, userPrompt) {
    
    const keyList = getApiKeysList();
    if (!keyList || keyList.length === 0) throw new Error("No hay API Keys configuradas.");

    const MODEL_NAME = "gemma-3-27b-it"; // Modelo más potente para prosa
    const MAX_RETRIES = 27;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        
        const currentKey = keyList[attempt % keyList.length];
        
        // Debug
        // console.log(`[Libros] Intento ${attempt+1} con Key ...${currentKey.slice(-4)}`);

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${currentKey}`;

        const combinedPrompt = `
        === ROL Y TAREA (SYSTEM) ===
        ${systemPrompt}
        
        === CONTEXTO Y PETICIÓN (USER) ===
        ${userPrompt}
        `;

        const payload = {
            contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
            generationConfig: {
                temperature: 0.8,
                maxOutputTokens: 8192
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const status = response.status;
                const msg = errData.error?.message || response.statusText;
                throw new Error(`Error API (${status}): ${msg}`);
            }
            
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) throw new Error("IA no devolvió texto.");
            
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            lastError = error;
            console.warn(`[Libros] Error Intento ${attempt + 1}: ${error.message}. Rotando...`);
            
            if (attempt < MAX_RETRIES - 1) {
                await delay(1000); // Espera un poco más generosa para libros (modelos grandes)
            }
        }
    }

    throw new Error(`Fallo masivo tras ${MAX_RETRIES} intentos. Último: ${lastError.message}`);
}

function refreshScriptSelector() {
    if (!scriptSelector) return;
    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    
    scriptSelector.innerHTML = '<option value="">-- Selecciona un Guion Base --</option>';
    
    scripts.slice().reverse().forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.title;
        scriptSelector.appendChild(option);
    });
}

document.addEventListener('DOMContentLoaded', refreshScriptSelector);

async function generateBookFromText() {
    // Verificación de Keys
    const keys = getApiKeysList();
    if (keys.length === 0) return alert("Configura la API Key de Google (soporta múltiples separadas por coma).");

    const scriptId = scriptSelector.value;
    if (!scriptId) return alert("Selecciona un guion.");
    
    const nuanceText = nuanceInput ? nuanceInput.value.trim() : "";
    let numParagraphs = paragraphsInput ? parseInt(paragraphsInput.value) : 5;
    if (numParagraphs < 1) numParagraphs = 1;

    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    const sourceScript = scripts.find(s => s.id == scriptId);
    if (!sourceScript) return;
    if (!sourceScript.scenes || sourceScript.scenes.length === 0) return alert("El guion está vacío.");

    let globalContext = "";
    let chapterScenes = [];

    if (sourceScript.scenes.length > 1) {
        globalContext = sourceScript.scenes[0].paragraphs.map(p => p.text).join('\n');
        chapterScenes = sourceScript.scenes.slice(1);
    } else {
        globalContext = "Trama basada en el desarrollo secuencial.";
        chapterScenes = sourceScript.scenes;
    }

    const totalChapters = chapterScenes.length;

    if(btnGenLibro) {
        btnGenLibro.disabled = true;
        btnGenLibro.innerText = "Escribiendo...";
    }
    
    showProgress(true);
    updateProgress(0, "Preparando estructura...");

    const newBookChapters = [];
    let previousChapterText = ""; 

    try {
        for (let i = 0; i < totalChapters; i++) {
            // Actualizar progreso UI
            const percent = ((i) / totalChapters) * 100;
            updateProgress(percent, `Redactando Capítulo ${i+1}/${totalChapters}...`);
            if(btnGenLibro) btnGenLibro.innerText = `Cap ${i+1}/${totalChapters}...`;

            const sceneData = chapterScenes[i];
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            const sceneTitle = sceneData.title;

            const narrativePrev = previousChapterText.length > 1500 
                ? "..." + previousChapterText.slice(-1500) 
                : previousChapterText;

            const jsonTemplate = {
                "chapter_title": "Título Literario",
                "content": ["Párrafo 1", "Párrafo 2", "Etc..."]
            };

            const systemPrompt = `Eres un novelista profesional.
            TAREA: Convierte el PLANTEAMIENTO (Input) en un capítulo completo.
            PARÁMETROS: Extensión ${numParagraphs} párrafos. Estilo: ${nuanceText || "Narrativa inmersiva"}.
            CONTEXTO GLOBAL: "${globalContext.substring(0, 1000)}..."
            FORMATO: JSON válido estricto: ${JSON.stringify(jsonTemplate)}`;

            const userPrompt = `
            [LO QUE HA PASADO ANTES]: ${narrativePrev || "Inicio de la novela."}
            [INSTRUCCIÓN CAPÍTULO (${sceneTitle})]: ${sceneContent}`;

            const jsonRaw = await callGoogleAPI(systemPrompt, userPrompt);
            const chapterData = cleanAndParseJSON(jsonRaw);

            const structuredParagraphs = Array.isArray(chapterData.content) 
                ? chapterData.content.map(p => ({ text: p, image: null }))
                : [{ text: typeof chapterData.content === 'string' ? chapterData.content : JSON.stringify(chapterData), image: null }];

            newBookChapters.push({
                title: chapterData.chapter_title || `Capítulo ${i+1}`,
                paragraphs: structuredParagraphs
            });
            
            previousChapterText = Array.isArray(chapterData.content) ? chapterData.content.join(" ") : jsonRaw;

            if (i < totalChapters - 1) await delay(2000);
        }

        updateProgress(100, "Finalizando libro...");
        
        const newBook = {
            id: Date.now(),
            title: sourceScript.title.replace(/^(Guion|Estructura)\s*/i, '').trim() + " (Novela)",
            isAI: true,
            chapters: newBookChapters
        };

        const books = JSON.parse(localStorage.getItem('minimal_books_v4')) || [];
        books.push(newBook);
        localStorage.setItem('minimal_books_v4', JSON.stringify(books));

        await delay(500);
        alert("¡Libro generado exitosamente!");
        if (window.renderBookList) window.renderBookList();

    } catch (err) {
        console.error(err);
        alert("Error: " + err.message);
        updateProgress(0, "Error en generación");
    } finally {
        if(btnGenLibro) {
            btnGenLibro.disabled = false;
            btnGenLibro.innerText = "Generar Libro";
        }
        setTimeout(() => showProgress(false), 3000);
    }
}

window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;