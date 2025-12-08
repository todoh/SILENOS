// --- IA: GENERACIÓN DE LIBROS (Controlador UI) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';

console.log("Módulo IA Libros Cargado (Conectado a Koreh)");

const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs');
const btnGenLibro = document.getElementById('btn-gen-libro');
const progressContainer = document.getElementById('libro-progress');

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

// --- LÓGICA PRINCIPAL ---

async function generateBookFromText() {
    // CORRECCIÓN CRÍTICA: Añadido 'await' para asegurar la sincronización con el servidor
    const keys = await getApiKeysList();
    
    if (!keys || keys.length === 0) return alert("El sistema no pudo recuperar las llaves del servidor y no hay ninguna configurada manualmente.");

    const scriptId = scriptSelector.value;
    if (!scriptId) return alert("Selecciona un guion.");
    
    const nuanceText = nuanceInput ? nuanceInput.value.trim() : "";
    let numParagraphs = paragraphsInput ? parseInt(paragraphsInput.value) : 5;
    if (numParagraphs < 1) numParagraphs = 1;

    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    const sourceScript = scripts.find(s => s.id == scriptId);
    if (!sourceScript) return;
    if (!sourceScript.scenes || sourceScript.scenes.length === 0) return alert("El guion está vacío.");

    // Preparación del Contexto
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
            
            const percent = ((i) / totalChapters) * 100;
            updateProgress(percent, `Redactando Capítulo ${i+1}/${totalChapters}...`);
            if(btnGenLibro) btnGenLibro.innerText = `Cap ${i+1}/${totalChapters}...`;

            const sceneData = chapterScenes[i];
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            const sceneTitle = sceneData.title;

            // Contexto narrativo deslizante
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

            // LLAMADA A KOREH
            // Usamos el modelo 27b para libros porque escribe mejor prosa
            const jsonRaw = await callGoogleAPI(systemPrompt, userPrompt, {
                model: "gemma-3-27b-it",
                temperature: 0.8
            });
            
            // Si callGoogleAPI falla lanza error y va al catch, si no, devuelve texto
            let chapterData = cleanAndParseJSON(jsonRaw);

            // Fallback si la IA devolvió texto plano en vez de JSON
            if (!chapterData) {
                chapterData = { chapter_title: sceneTitle, content: [jsonRaw] };
            }

            const structuredParagraphs = Array.isArray(chapterData.content) 
                ? chapterData.content.map(p => ({ text: p, image: null }))
                : [{ text: typeof chapterData.content === 'string' ? chapterData.content : JSON.stringify(chapterData), image: null }];

            newBookChapters.push({
                title: chapterData.chapter_title || `Capítulo ${i+1}`,
                paragraphs: structuredParagraphs
            });
            
            previousChapterText = Array.isArray(chapterData.content) ? chapterData.content.join(" ") : jsonRaw;

            // Pausa de cortesía para no saturar tras generar un capítulo largo
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