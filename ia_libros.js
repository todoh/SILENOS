// --- IA: GENERACIÓN DE LIBROS (Arquitectura Pipeline v3.1 - Bugfix & Continuity) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';

console.log("Módulo IA Libros Cargado (v3.1 - Silent Editor & Deep Memory)");

const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs');
const btnGenLibro = document.getElementById('btn-gen-libro');
const progressContainer = document.getElementById('libro-progress');

const PARAGRAPHS_PER_CHUNK = 5; 

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

// Limpiador agresivo para eliminar cabeceras y comentarios de la IA
function cleanOutputText(text) {
    if (!text) return "";
    // Elimina bloques tipo === SISTEMA ===
    text = text.replace(/===.*?===/g, '');
    // Elimina frases introductorias comunes
    text = text.replace(/^(Aquí está|He aquí|El texto|Texto pulido).*?:/i, '');
    // Elimina bloques de "Notas sobre cambios" si aparecen al final
    const notesIndex = text.toLowerCase().indexOf('notas sobre los cambios');
    if (notesIndex !== -1) {
        text = text.substring(0, notesIndex);
    }
    return text.trim();
}

document.addEventListener('DOMContentLoaded', refreshScriptSelector);

// --- LÓGICA PRINCIPAL (PIPELINE) ---

async function generateBookFromText() {
    const keys = await getApiKeysList();
    if (!keys || keys.length === 0) return alert("Error: No hay API Keys disponibles.");

    const scriptId = scriptSelector.value;
    if (!scriptId) return alert("Selecciona un guion.");
    
    const nuanceText = nuanceInput ? nuanceInput.value.trim() : "Narrativa estándar";
    let targetParagraphs = paragraphsInput ? parseInt(paragraphsInput.value) : 15;
    if (targetParagraphs < 5) targetParagraphs = 5;

    const totalBlocksPerChapter = Math.ceil(targetParagraphs / PARAGRAPHS_PER_CHUNK);

    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    const sourceScript = scripts.find(s => s.id == scriptId);
    if (!sourceScript) return;
    
    let globalContext = "";
    let chapterScenes = [];

    if (sourceScript.scenes.length > 1) {
        globalContext = sourceScript.scenes[0].paragraphs.map(p => p.text).join('\n');
        chapterScenes = sourceScript.scenes.slice(1);
    } else {
        globalContext = "Trama basada en desarrollo secuencial.";
        chapterScenes = sourceScript.scenes;
    }

    const totalChapters = chapterScenes.length;

    if(btnGenLibro) {
        btnGenLibro.disabled = true;
        btnGenLibro.innerText = "Iniciando Pipeline...";
    }
    showProgress(true);

    const newBookChapters = [];
    
    // MEMORIA PERSISTENTE: Guarda el final del capítulo anterior para guiar al siguiente
    let narrativeHistory = "Inicio de la novela."; 

    try {
        for (let i = 0; i < totalChapters; i++) {
            const sceneData = chapterScenes[i];
            const sceneTitle = sceneData.title;
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            
            updateProgress((i / totalChapters) * 100, `Capítulo ${i+1}: Planificando...`);

            // FASE 1: ARQUITECTO (Con memoria de lo anterior)
            const chapterPlan = await phaseArchitect(sceneTitle, sceneContent, globalContext, narrativeHistory, totalBlocksPerChapter);
            
            let fullChapterText = [];
            // La ventana deslizante empieza con la historia previa para no perder el hilo
            let slidingWindowContext = narrativeHistory.slice(-2000); 

            for (let b = 0; b < chapterPlan.length; b++) {
                const currentBeat = chapterPlan[b];
                const blockNum = b + 1;
                
                const baseProg = (i / totalChapters) * 100;
                const chunkProg = (blockNum / chapterPlan.length) * (100 / totalChapters);
                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}/${chapterPlan.length}]: Escribiendo...`);

                // FASE 2: ESCRITOR
                const draftText = await phaseWriter(blockNum, chapterPlan.length, currentBeat, slidingWindowContext);

                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}/${chapterPlan.length}]: Editando estilo...`);

                // FASE 3: EDITOR (Silencioso)
                let polishedText = await phaseEditor(draftText, nuanceText, blockNum === 1);
                
                // Limpieza de seguridad por si la IA habla
                polishedText = cleanOutputText(polishedText);

                fullChapterText.push(polishedText);

                // Actualizar contexto deslizante
                slidingWindowContext = polishedText.slice(-2000); // Aumentamos memoria a 2000 caracteres
                await delay(800);
            }

            const finalChapterContent = fullChapterText.join("\n\n");
            
            // Actualizamos la historia global con el final de este capítulo
            narrativeHistory = finalChapterContent.slice(-3000);

            const structuredParagraphs = finalChapterContent.split('\n\n')
                .filter(p => p.trim().length > 0)
                .map(p => ({ text: p.trim(), image: null }));

            newBookChapters.push({
                title: sceneTitle,
                paragraphs: structuredParagraphs
            });
        }

        updateProgress(100, "Guardando Libro...");
        
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
        alert("¡Libro completado con éxito!");
        if (window.renderBookList) window.renderBookList();

    } catch (err) {
        console.error(err);
        alert("Error en el proceso: " + err.message);
        updateProgress(0, "Error crítico");
    } finally {
        if(btnGenLibro) {
            btnGenLibro.disabled = false;
            btnGenLibro.innerText = "Generar Libro";
        }
        setTimeout(() => showProgress(false), 3000);
    }
}

// --- FASE 1: ARQUITECTO ---
async function phaseArchitect(title, rawContent, globalContext, prevHistory, numBlocks) {
    const systemPrompt = `Eres un Arquitecto Narrativo.
    TAREA: Crear una escaleta de ${numBlocks} puntos ("beats") para la escena actual.
    
    CONTEXTO GLOBAL: ${globalContext.substring(0,500)}...
    LO QUE ACABA DE PASAR (CAPÍTULO ANTERIOR): "${prevHistory.substring(0,800)}..."
    ESCENA ACTUAL A DESARROLLAR: ${title} - ${rawContent.substring(0,500)}...
    
    OBJETIVO: Asegurar continuidad. Si el capítulo anterior terminó con X personajes, el beat 1 debe incluirlos o explicar la transición.
    
    FORMATO JSON ESTRICTO: { "beats": ["Instrucción 1", "Instrucción 2", ...] }`;

    const userPrompt = `Genera la escaleta de ${numBlocks} pasos.`;

    try {
        const raw = await callGoogleAPI(systemPrompt, userPrompt, { temperature: 0.7 });
        const data = cleanAndParseJSON(raw);
        if (data && data.beats && Array.isArray(data.beats)) return data.beats; 
        else throw new Error("Fallo JSON Arquitecto");
    } catch (e) {
        return Array(numBlocks).fill("Continúa la historia manteniendo la coherencia con lo anterior.");
    }
}

// --- FASE 2: ESCRITOR ---
async function phaseWriter(blockIndex, totalBlocks, beatInstruction, prevContext) {
    const roleInstruction = blockIndex === 1 
        ? "Inicia esta sección conectando suavemente con lo anterior." 
        : "Continúa la acción inmediatamente.";

    const systemPrompt = `Eres un Novelista. Escribe el BORRADOR del bloque ${blockIndex}/${totalBlocks}.
    
    INSTRUCCIÓN DE TRAMA: "${beatInstruction}"
    CONTEXTO INMEDIATO (TEXTO PREVIO): "...${prevContext}"
    
    REGLAS:
    1. Mantén la continuidad absoluta de personajes y lugar. NO inventes personajes nuevos si no están en la instrucción.
    2. Si el contexto previo menciona a "Taumante", sigue con él. No cambies a "Elara" aleatoriamente.
    3. Escribe solo la historia.`;

    const userPrompt = `Redacta el texto.`;
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.80 });
}

// --- FASE 3: EDITOR (CORREGIDO) ---
async function phaseEditor(draftText, styleNuance, isStart) {
    const systemPrompt = `Eres un Editor Literario y Corrector de Estilo.
    TU MISIÓN: Pulir el siguiente texto para que tenga calidad de publicación.
    ESTILO: ${styleNuance}
    
    REGLAS ABSOLUTAS DE SALIDA (CRÍTICO):
    1. Devuelve SOLAMENTE el texto narrativo pulido.
    2. PROHIBIDO poner títulos, cabeceras como "=== SISTEMA ===", o frases como "Aquí está el texto".
    3. PROHIBIDO incluir listas de cambios, notas o explicaciones.
    4. El output debe ser puro texto de novela, listo para pegar en el libro.
    
    INSTRUCCIONES DE EDICIÓN:
    - Mejora la prosa, elimina repeticiones.
    - Mantén la fidelidad a los hechos del borrador.`;

    const userPrompt = `Pule este texto (SOLO NARRATIVA):\n${draftText}`;

    // Bajamos temperatura para que sea obediente y no creativo con el formato
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.5 });
}

window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;