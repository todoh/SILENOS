// --- IA: GENERACIÓN DE LIBROS (Arquitectura Pipeline v3.0) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';

console.log("Módulo IA Libros Cargado (Pipeline: Arquitecto -> Escritor -> Editor)");

const scriptSelector = document.getElementById('ia-script-selector');
const nuanceInput = document.getElementById('ia-libro-nuance');
const paragraphsInput = document.getElementById('ia-book-paragraphs');
const btnGenLibro = document.getElementById('btn-gen-libro');
const progressContainer = document.getElementById('libro-progress');

// Configuración de Lotes
const PARAGRAPHS_PER_CHUNK = 5; // Tu requisito: 5 párrafos por trozo

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

// --- LÓGICA PRINCIPAL (PIPELINE) ---

async function generateBookFromText() {
    // 1. Verificación Inicial
    const keys = await getApiKeysList();
    if (!keys || keys.length === 0) return alert("Error: No hay API Keys disponibles.");

    const scriptId = scriptSelector.value;
    if (!scriptId) return alert("Selecciona un guion.");
    
    const nuanceText = nuanceInput ? nuanceInput.value.trim() : "Narrativa estándar";
    let targetParagraphs = paragraphsInput ? parseInt(paragraphsInput.value) : 15;
    if (targetParagraphs < 5) targetParagraphs = 5;

    // Calculamos cuántos bloques (chunks) de 5 párrafos necesitamos
    const totalBlocksPerChapter = Math.ceil(targetParagraphs / PARAGRAPHS_PER_CHUNK);

    const scripts = JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [];
    const sourceScript = scripts.find(s => s.id == scriptId);
    if (!sourceScript) return;
    
    // Preparar escenas
    let globalContext = "";
    let chapterScenes = [];

    if (sourceScript.scenes.length > 1) {
        // Asumimos que la escena 0 es el planteamiento global
        globalContext = sourceScript.scenes[0].paragraphs.map(p => p.text).join('\n');
        chapterScenes = sourceScript.scenes.slice(1);
    } else {
        globalContext = "Trama basada en desarrollo secuencial.";
        chapterScenes = sourceScript.scenes;
    }

    const totalChapters = chapterScenes.length;

    // UI Start
    if(btnGenLibro) {
        btnGenLibro.disabled = true;
        btnGenLibro.innerText = "Iniciando Pipeline...";
    }
    showProgress(true);

    const newBookChapters = [];

    try {
        // --- BUCLE DE CAPÍTULOS ---
        for (let i = 0; i < totalChapters; i++) {
            const sceneData = chapterScenes[i];
            const sceneTitle = sceneData.title;
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            
            updateProgress((i / totalChapters) * 100, `Capítulo ${i+1}: Planificando...`);

            // --- FASE 1: EL ARQUITECTO (PLANNING) ---
            // Genera una escaleta de 'totalBlocksPerChapter' puntos
            const chapterPlan = await phaseArchitect(sceneTitle, sceneContent, globalContext, totalBlocksPerChapter);
            
            let fullChapterText = [];
            let slidingWindowContext = "Inicio del capítulo."; // Contexto deslizante para el Escritor

            // --- FASE 2 & 3: BUCLE DE ESCRITURA (Chunking) ---
            for (let b = 0; b < chapterPlan.length; b++) {
                const currentBeat = chapterPlan[b];
                const blockNum = b + 1;
                
                // Calculamos progreso fino dentro del capítulo
                const baseProg = (i / totalChapters) * 100;
                const chunkProg = (blockNum / chapterPlan.length) * (100 / totalChapters);
                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}/${chapterPlan.length}]: Escribiendo...`);

                // A. ESCRITOR (DRAFT)
                const draftText = await phaseWriter(blockNum, chapterPlan.length, currentBeat, slidingWindowContext, globalContext);

                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}/${chapterPlan.length}]: Editando estilo...`);

                // B. EDITOR (POLISH)
                const polishedText = await phaseEditor(draftText, nuanceText, blockNum === 1); // Pasamos flag si es inicio para evitar "En el capítulo anterior..."

                // Guardamos el texto pulido
                fullChapterText.push(polishedText);

                // Actualizamos la ventana deslizante (últimos ~1000 caracteres para dar continuidad)
                slidingWindowContext = polishedText.slice(-1200);

                // Pequeña pausa para no saturar API
                await delay(800);
            }

            // Consolidar Capítulo
            const finalChapterContent = fullChapterText.join("\n\n");
            
            // Estructura de párrafos para el lector
            const structuredParagraphs = finalChapterContent.split('\n\n')
                .filter(p => p.trim().length > 0)
                .map(p => ({ text: p.trim(), image: null }));

            newBookChapters.push({
                title: sceneTitle,
                paragraphs: structuredParagraphs
            });
        }

        // --- FINALIZACIÓN ---
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
async function phaseArchitect(title, rawContent, globalContext, numBlocks) {
    const systemPrompt = `Eres un Arquitecto Narrativo experto.
    TU OBJETIVO: Desglosar una escena de guion en ${numBlocks} "Beats" o micro-eventos narrativos secuenciales.
    
    INPUT: Una escena cruda.
    OUTPUT: Un JSON con una lista de ${numBlocks} pasos exactos para guiar a un escritor.
    
    REGLAS:
    1. El Beat 1 debe ser la introducción (Setting, ambiente).
    2. El último Beat debe ser la conclusión o cliffhanger.
    3. Los Beats intermedios deben desarrollar la acción progresivamente.
    4. NO escribas la historia, solo las instrucciones de qué pasa en cada bloque.
    
    FORMATO JSON: { "beats": ["Instrucción paso 1...", "Instrucción paso 2...", ...] }`;

    const userPrompt = `
    CONTEXTO GLOBAL: ${globalContext.substring(0,500)}...
    ESCENA ACTUAL: ${title}
    CONTENIDO DE LA ESCENA: ${rawContent}
    
    Genera exactamente ${numBlocks} instrucciones secuenciales.`;

    try {
        const raw = await callGoogleAPI(systemPrompt, userPrompt, { temperature: 0.7 });
        const data = cleanAndParseJSON(raw);
        
        // Validación de seguridad por si la IA falla al contar
        if (data && data.beats && Array.isArray(data.beats)) {
            // Si faltan beats, rellenamos; si sobran, cortamos (aunque Gemma suele ser precisa con JSON)
            return data.beats; 
        } else {
            throw new Error("Fallo en Arquitectura");
        }
    } catch (e) {
        console.warn("Fallback Arquitecto: Creando beats genéricos.", e);
        // Fallback simple si falla el JSON
        return Array(numBlocks).fill("Continúa la historia desarrollando la acción de la escena de forma lógica.");
    }
}

// --- FASE 2: ESCRITOR (DRAFTING) ---
async function phaseWriter(blockIndex, totalBlocks, beatInstruction, prevContext, globalContext) {
    const isFirst = blockIndex === 1;
    const isLast = blockIndex === totalBlocks;

    let roleInstruction = "";
    if (isFirst) roleInstruction = "Inicia la escena. Establece el lugar, la atmósfera y el estado inicial de los personajes.";
    else if (isLast) roleInstruction = "Escribe el cierre de esta escena. Lleva la tensión a una conclusión o déjala en alto para el siguiente capítulo.";
    else roleInstruction = "Continúa la narrativa inmediatamente desde el texto anterior. Desarrolla el conflicto o diálogo.";

    const systemPrompt = `Eres un Novelista (Ghostwriter) enfocado en la productividad.
    OBJETIVO: Escribir un BORRADOR de aproximadamente 5 párrafos para la parte ${blockIndex} de ${totalBlocks} de este capítulo.
    
    INSTRUCCIÓN DE FASE: ${roleInstruction}
    INSTRUCCIÓN DE TRAMA (BEAT): "${beatInstruction}"
    
    CONTEXTO PREVIO (LO ÚLTIMO QUE SE ESCRIBIÓ):
    "${prevContext}..."
    
    REGLAS:
    1. Céntrate en que ocurran los hechos del Beat.
    2. Mantén la coherencia estricta con el contexto previo (no repitas saludos si ya se saludaron).
    3. Si es el inicio, NO resumas lo anterior, empieza la acción.
    4. Salida: Solo el texto de la narrativa, sin comentarios.`;

    const userPrompt = `Escribe el borrador del Bloque ${blockIndex}.`;

    // Usamos temperatura alta para creatividad en el borrador
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.85 });
}

// --- FASE 3: EDITOR (POLISHING) ---
async function phaseEditor(draftText, styleNuance, isStart) {
    const systemPrompt = `Eres un Editor Literario Senior implacable.
    OBJETIVO: Reescribir y elevar la calidad del siguiente borrador.
    
    ESTILO DESEADO: ${styleNuance}
    
    DIRECTRICES:
    1. Elimina adverbios innecesarios y verbos débiles.
    2. Mejora las descripciones sensoriales (olor, tacto, luz).
    3. Elimina repeticiones de palabras cercanas.
    4. NO cambies los hechos de la trama, solo la forma de contarlo.
    5. ${isStart ? "Asegúrate de que el gancho inicial sea potente." : "Asegúrate de que fluya naturalmente con lo que vendría antes."}
    
    Salida: El texto literario final pulido.`;

    const userPrompt = `BORRADOR A EDITAR:\n${draftText}`;

    // Temperatura baja para mantener fidelidad al contenido pero puliendo forma
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.6 });
}

window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;