// --- IA: GENERACIÓN DE LIBROS (Arquitectura Pipeline v3.3 - Auto Titulado) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; // <--- IMPORTANTE

console.log("Módulo IA Libros Cargado (v3.3 - Auto Title Update)");

const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs');
const btnGenLibro = document.getElementById('btn-gen-libro');
const progressContainer = document.getElementById('libro-progress');

// Agrupamos párrafos para no saturar
const PARAGRAPHS_PER_CHUNK = 5; 

if (btnGenLibro) {
    btnGenLibro.onclick = null; 
    btnGenLibro.addEventListener('click', generateBookFromText);
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

function cleanOutputText(text) {
    if (!text) return "";
    text = text.replace(/===.*?===/g, '');
    text = text.replace(/^(Aquí está|He aquí|El texto|Texto pulido|Borrador).*?:/i, '');
    const notesIndex = text.toLowerCase().indexOf('notas sobre');
    if (notesIndex !== -1) {
        text = text.substring(0, notesIndex);
    }
    return text.trim();
}

document.addEventListener('DOMContentLoaded', refreshScriptSelector);

// --- LÓGICA PRINCIPAL (PIPELINE) ---

async function generateBookFromText() {
    // 1. CHEQUEO DE LÍMITE
    const canProceed = await checkUsageLimit('book');
    if (!canProceed) return;

    const keys = await getApiKeysList();
    if (!keys || keys.length === 0) return alert("Error: No hay API Keys disponibles.");

    const scriptId = scriptSelector.value;
    if (!scriptId) return alert("Selecciona un guion.");
    
    const nuanceText = nuanceInput ? nuanceInput.value.trim() : "Narrativa inmersiva y fiel";
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
        globalContext = "Trama basada en desarrollo secuencial del guion.";
        chapterScenes = sourceScript.scenes;
    }

    const totalChapters = chapterScenes.length;

    if(btnGenLibro) {
        btnGenLibro.disabled = true;
        btnGenLibro.innerText = "Procesando...";
    }
    showProgress(true);

    const newBookChapters = [];
    let narrativeHistory = "Inicio de la historia."; 

    try {
        for (let i = 0; i < totalChapters; i++) {
            const sceneData = chapterScenes[i];
            const sceneTitle = sceneData.title;
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            
            updateProgress((i / totalChapters) * 100, `Cap ${i+1}: Estructurando fidelidad...`);

            // FASE 1: ARQUITECTO
            const chapterPlan = await phaseArchitect(sceneTitle, sceneContent, globalContext, narrativeHistory, totalBlocksPerChapter);
            
            let fullChapterText = [];
            let slidingWindowContext = narrativeHistory.slice(-2000); 

            // BUCLE DE BLOQUES (ESCRITURA)
            for (let b = 0; b < chapterPlan.length; b++) {
                const currentBeat = chapterPlan[b];
                const blockNum = b + 1;
                
                const baseProg = (i / totalChapters) * 100;
                const chunkProg = (blockNum / chapterPlan.length) * (100 / totalChapters);
                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}]: Escribiendo...`);

                // FASE 2: ESCRITOR
                const draftText = await phaseWriter(blockNum, chapterPlan.length, currentBeat, slidingWindowContext);

                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}]: Pulido final...`);

                // FASE 3: EDITOR
                let polishedText = await phaseEditor(draftText, nuanceText);
                
                polishedText = cleanOutputText(polishedText);
                fullChapterText.push(polishedText);
                slidingWindowContext = polishedText.slice(-2000); 
                
                await delay(500);
            }

            const finalChapterContent = fullChapterText.join("\n\n");
            
            // FASE 4: TITULADOR AUTOMÁTICO (NUEVO)
            // Ejecutamos en "paralelo" lógico al cierre del capítulo
            updateProgress(((i + 1) / totalChapters) * 100, `Cap ${i+1}: Generando título...`);
            const generatedTitle = await phaseTitleGenerator(finalChapterContent, sceneTitle);

            narrativeHistory = finalChapterContent.slice(-3000);

            const structuredParagraphs = finalChapterContent.split('\n\n')
                .filter(p => p.trim().length > 0)
                .map(p => ({ text: p.trim(), image: null }));

            newBookChapters.push({
                title: generatedTitle || sceneTitle, // Usamos el título generado si existe
                paragraphs: structuredParagraphs
            });
        }

        // 2. REGISTRO DE USO
        await registerUsage('book'); 

        updateProgress(100, "Finalizando Libro...");
        
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
        alert("¡Libro generado con éxito! Títulos y contenido creados.");
        if (window.renderBookList) window.renderBookList();

    } catch (err) {
        console.error(err);
        alert("Error en el proceso: " + err.message);
        updateProgress(0, "Proceso Detenido");
    } finally {
        if(btnGenLibro) {
            btnGenLibro.disabled = false;
            btnGenLibro.innerText = "Generar Libro";
        }
        setTimeout(() => showProgress(false), 3000);
    }
}

// --- FASE 1: ARQUITECTO TÉCNICO ---
async function phaseArchitect(title, rawContent, globalContext, prevHistory, numBlocks) {
    const safeContent = rawContent.substring(0, 4000); 
    
    const systemPrompt = `Eres un Arquitecto Narrativo Técnico.
    TU OBJETIVO: Desglosar la escena proporcionada en ${numBlocks} puntos ("beats") lógicos y secuenciales.
    
    CONTEXTO GLOBAL: ${globalContext.substring(0,500)}...
    HISTORIA PREVIA (FINAL CAP ANTERIOR): "${prevHistory.substring(0,800)}..."
    MATERIAL BASE (ESCENA DEL GUION A ADAPTAR): 
    TÍTULO: "${title}"
    CONTENIDO: "${safeContent}"
    
    REGLAS DE FIDELIDAD (STRICT MODE):
    1. NO INVENTES TRAMA: Tu trabajo es ESTRUCTURAR únicamente lo que ya está escrito en el "MATERIAL BASE".
    2. SI EL MATERIAL ES CORTO: Divide la acción existente en micro-pasos para cumplir con los ${numBlocks} bloques.
    3. CONTINUIDAD: Asegura que el primer beat conecte lógicamente con la "HISTORIA PREVIA".
    
    FORMATO JSON ESTRICTO: { "beats": ["Instrucción paso 1", "Instrucción paso 2", ...] }`;

    const userPrompt = `Genera la escaleta estricta de ${numBlocks} pasos basada EXCLUSIVAMENTE en el material base.`;

    try {
        const raw = await callGoogleAPI(systemPrompt, userPrompt, { temperature: 0.3 });
        const data = cleanAndParseJSON(raw);
        if (data && data.beats && Array.isArray(data.beats)) return data.beats; 
        else throw new Error("Fallo JSON Arquitecto");
    } catch (e) {
        console.warn("Fallo en Arquitecto, usando fallback lineal.", e);
        return Array(numBlocks).fill("Narra la escena basándote estrictamente en el guion proporcionado, expandiendo las descripciones.");
    }
}

// --- FASE 2: ESCRITOR DE ADAPTACIÓN ---
async function phaseWriter(blockIndex, totalBlocks, beatInstruction, prevContext) {
    const systemPrompt = `Eres un Redactor de Novelizaciones (Ghostwriter).
    ESTAMOS EN: Bloque ${blockIndex} de ${totalBlocks}.
    
    INSTRUCCIÓN DEL PASO: "${beatInstruction}"
    CONTEXTO INMEDIATO (TEXTO ANTERIOR): "...${prevContext}"
    
    MANDAMIENTOS DE ESCRITURA:
    1. FIDELIDAD TOTAL: Estás "novelizando" un guion existente.
    2. PROHIBIDO INVENTAR EVENTOS: No agregues personajes sorpresa o giros que no estén explícitos.
    3. RITMO Y ESTILO: Si la instrucción es breve, detente en el ambiente o la introspección. "Show, don't tell".
    4. CONEXIÓN FLUIDA: Usa el "Contexto Inmediato".`;

    const userPrompt = `Escribe el texto narrativo para este bloque.`;
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.65 });
}

// --- FASE 3: EDITOR (Pulido) ---
async function phaseEditor(draftText, styleNuance) {
    const systemPrompt = `Eres un Editor Literario.
    TU MISIÓN: Pulir el siguiente texto para que tenga calidad de publicación.
    ESTILO DESEADO: ${styleNuance}
    
    REGLAS:
    1. Devuelve SOLAMENTE el texto narrativo pulido. Nada más.
    2. Mantén la fidelidad absoluta a los hechos narrados en el borrador. Mejora la forma, no cambies el fondo.`;

    const userPrompt = `Pule este texto:\n${draftText}`;
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.5 });
}

// --- FASE 4: TITULADOR AUTOMÁTICO (NUEVO) ---
async function phaseTitleGenerator(chapterContent, originalTitle) {
    const systemPrompt = `Eres un Editor de Títulos experto en la industria editorial.
    TU MISIÓN: Leer el texto de un capítulo recién escrito y generar un TÍTULO ÚNICO, corto, evocador y literario.
    
    INPUTS:
    - Título provisional (del guion): "${originalTitle}"
    - Contenido (extracto): Ver abajo.
    
    REGLAS:
    1. El título debe tener máximo 6-7 palabras.
    2. Debe capturar la esencia, emoción o evento principal del texto.
    3. Devuelve SOLAMENTE el título limpio, sin comillas, sin "Título:", sin markdown.
    4. Estilo: Elegante, misterioso o épico según el texto.`;

    const userPrompt = `Texto del capítulo (Primeros 3000 carácteres):\n${chapterContent.substring(0, 3000)}...`; 
    
    try {
        let title = await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.7 });
        // Limpieza extra por si acaso la IA es habladora
        title = title.replace(/^Título:\s*/i, '').replace(/["']/g, '').replace(/\.$/, '').trim();
        return title;
    } catch (e) {
        console.warn("Fallo generando título, usando original.", e);
        return originalTitle;
    }
}

window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;