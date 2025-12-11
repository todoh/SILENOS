// --- IA: GENERACIÓN DE LIBROS (Arquitectura Pipeline v6.0 - Token Optimized) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 

console.log("Módulo IA Libros Cargado (v6.0 - RAG & Memory Optimized)");

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

// --- HELPERS UI & PARSING ---

function parseLoreFromText(loreText) {
    // Convierte el texto plano del Lore en un Mapa { "Nombre": "Definición" }
    // Asume formato: "**Nombre**: Definición" o simplemente párrafos separados
    const loreMap = new Map();
    if (!loreText) return loreMap;

    // Dividimos por saltos de línea dobles (párrafos generados en guiones)
    const blocks = loreText.split(/\n\s*\n/);
    
    blocks.forEach(block => {
        const cleanBlock = block.trim();
        if (cleanBlock.length < 5) return;

        // Intentar extraer el nombre entre asteriscos **Nombre**
        const match = cleanBlock.match(/^\*\*(.*?)\*\*/);
        if (match && match[1]) {
            loreMap.set(match[1].toUpperCase(), cleanBlock);
        } else {
            // Si no tiene formato negrita, usamos las primeras 5 palabras como key (fallback)
            const fallbackKey = cleanBlock.split(' ').slice(0, 5).join(' ').toUpperCase();
            loreMap.set(fallbackKey, cleanBlock);
        }
    });
    return loreMap;
}

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

// --- FUNCIÓN DE LIMPIEZA MEJORADA ---
function cleanOutputText(text) {
    if (!text) return "";

    // 1. Eliminar eco de instrucciones del sistema
    text = text.replace(/^(Eres un|Actúa como) (Editor|Asistente|Redactor|Escritor).*?(\n|$)/gim, '');
    text = text.replace(/^ESTILO:.*?(\n|$)/gim, '');
    text = text.replace(/^REGLA:.*?(\n|$)/gim, '');
    text = text.replace(/^TAREA:.*?(\n|$)/gim, '');

    // 2. Eliminar cabeceras conversacionales
    text = text.replace(/^(\#\#\s*)?(Aquí (tienes|está)|He aquí|El texto|Texto pulido|Borrador|Propuesta|Versión mejorada).*?[:\n]/gmi, '');
    
    // 3. Eliminar repetición del input
    text = text.replace(/^Texto a pulir:[\s\S]*?(\n\n|\r\n\r\n)/mi, ''); 

    // 4. Eliminar meta-comentarios al final
    const metaMarkers = [
        'Cambios realizados', 'Justificación', 'Notas sobre', 'Comentarios:', 
        'Cambios y justificación', '## Títulos propuestos', 'Opción 1:', 'Nota del editor:'
    ];

    let cutIndex = text.length;
    metaMarkers.forEach(marker => {
        const idx = text.toLowerCase().indexOf(marker.toLowerCase());
        if (idx !== -1 && idx < cutIndex) {
            const linesBefore = text.substring(0, idx).split('\n');
            const lastLine = linesBefore[linesBefore.length -1].trim();
            if (lastLine === '' || lastLine.length < 5) cutIndex = idx;
        }
    });
    text = text.substring(0, cutIndex);

    // 5. Limpieza final
    text = text.replace(/===.*?===/g, '');
    text = text.replace(/\-\-\-+/g, '');
    
    return text.trim();
}

document.addEventListener('DOMContentLoaded', refreshScriptSelector);

// --- PIPELINE PRINCIPAL OPTIMIZADO ---

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
    
    // --- PREPARACIÓN DEL LORE (MODO SMART RAG) ---
    let globalContext = "Trama general.";
    let loreMap = new Map(); // Mapa JS local para RAG eficiente
    let chapterScenes = [];

    const lastScene = sourceScript.scenes[sourceScript.scenes.length - 1];
    const hasLore = lastScene && (lastScene.title.includes("LORE") || lastScene.title.includes("DATOS CLAVE"));

    if (sourceScript.scenes.length > 0) {
        globalContext = sourceScript.scenes[0].paragraphs.map(p => p.text).join('\n');
        
        if (hasLore) {
            const rawLoreText = lastScene.paragraphs.map(p => p.text).join('\n');
            // Parseamos el Lore una sola vez en memoria
            loreMap = parseLoreFromText(rawLoreText); 
            chapterScenes = sourceScript.scenes.slice(1, sourceScript.scenes.length - 1);
            console.log(`📚 Lore Parseado: ${loreMap.size} entradas indexadas.`);
        } else {
            chapterScenes = sourceScript.scenes.slice(1);
        }
    }

    const totalChapters = chapterScenes.length;

    if(btnGenLibro) {
        btnGenLibro.disabled = true;
        btnGenLibro.innerText = "Procesando...";
    }
    showProgress(true);

    const newBookChapters = [];
    let narrativeHistory = "Inicio de la historia."; 
    let previousSummaries = []; 

    try {
        for (let i = 0; i < totalChapters; i++) {
            const sceneData = chapterScenes[i];
            const sceneTitle = sceneData.title;
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            
            // Previsión del futuro
            let nextChapterPreview = "Fin de la obra.";
            if (i + 1 < totalChapters) {
                 const nextSceneData = chapterScenes[i + 1];
                 const nextText = nextSceneData.paragraphs.map(p => p.text).join('\n');
                 nextChapterPreview = nextText.substring(0, 500); // Solo el inicio
            }

            // --- FASE 0: SELECCIÓN DE LORE (RAG OPTIMIZADO) ---
            // Solo enviamos las KEYS a la IA, no el texto completo.
            updateProgress((i / totalChapters) * 100, `Cap ${i+1}: Filtrando Lore (Smart Keys)...`);
            
            let activeLoreContent = "";
            if (loreMap.size > 0) {
                const loreKeys = Array.from(loreMap.keys());
                // IA decide qué claves son relevantes
                const selectedKeys = await phaseLoreSelector(sceneTitle, sceneContent, loreKeys);
                
                // JS reconstruye el texto completo solo de las claves elegidas
                activeLoreContent = selectedKeys
                    .map(key => loreMap.get(key) || "")
                    .filter(t => t.length > 0)
                    .join("\n\n");
                
                console.log(`Cap ${i+1}: Lore seleccionado (${selectedKeys.length} items)`);
            }

            // --- FASE 1: ARQUITECTO ---
            updateProgress((i / totalChapters) * 100, `Cap ${i+1}: Estructurando trama...`);
            
            // OPTIMIZACIÓN DE MEMORIA: Solo últimos 3 resúmenes
            const memoryContext = previousSummaries.slice(-3).join("\n");

            const chapterPlan = await phaseArchitect(
                sceneTitle, 
                sceneContent, 
                globalContext, 
                narrativeHistory, 
                totalBlocksPerChapter, 
                activeLoreContent, // Lore ya filtrado
                memoryContext, 
                nextChapterPreview
            );
            
            let fullChapterText = [];
            let slidingWindowContext = narrativeHistory.slice(-1500); 

            // --- BUCLE DE ESCRITURA ---
            for (let b = 0; b < chapterPlan.length; b++) {
                const currentBeat = chapterPlan[b];
                const blockNum = b + 1;
                
                const baseProg = (i / totalChapters) * 100;
                const chunkProg = (blockNum / chapterPlan.length) * (100 / totalChapters);
                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}]: Escribiendo...`);

                // Delay dinámico basado en carga (simple)
                await delay(300); 

                // FASE 2: ESCRITOR
                const draftText = await phaseWriter(blockNum, chapterPlan.length, currentBeat, slidingWindowContext, activeLoreContent);

                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}]: Pulido final...`);

                // FASE 3: EDITOR
                let polishedText = await phaseEditor(draftText, nuanceText);
                
                polishedText = cleanOutputText(polishedText);
                fullChapterText.push(polishedText);
                slidingWindowContext = polishedText.slice(-1500); 
            }

            const finalChapterContent = fullChapterText.join("\n\n");

            // --- FASE DE RESUMEN OPTIMIZADA ---
            // Resumimos la ESCALETA (Plan), no el texto final masivo. Ahorra tokens.
            updateProgress(((i + 1) / totalChapters) * 100, `Cap ${i+1}: Sintetizando memoria...`);
            const compressedPlan = chapterPlan.join("\n");
            const chapterSummary = await phaseSummarizer(compressedPlan);
            previousSummaries.push(`[RESUMEN CAPÍTULO ${i+1}]: ${chapterSummary}`);
            
            // FASE 4: TITULADOR
            const generatedTitle = await phaseTitleGenerator(finalChapterContent, sceneTitle);

            // Actualizar buffer inmediato
            narrativeHistory = finalChapterContent.slice(-2000);

            const structuredParagraphs = finalChapterContent.split('\n\n')
                .filter(p => p.trim().length > 0)
                .map(p => ({ text: p.trim(), image: null }));

            newBookChapters.push({
                title: generatedTitle || sceneTitle,
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
        alert("¡Libro completado con arquitectura optimizada!");
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

// --- FASE 0: SELECTOR DE LORE (Input: Lista de Keys, Output: JSON lista seleccionada) ---
async function phaseLoreSelector(chapTitle, chapSummary, allKeys) {
    // Enviamos solo las claves, coste de token mínimo.
    const keysBlock = allKeys.join(", ");
    
    const systemPrompt = `Eres un Bibliotecario Experto.
    Tienes un INDICE de temas del Lore y un resumen de un capítulo.
    Tu tarea es identificar qué temas del índice son CRÍTICOS para este capítulo.
    
    INDICE: [${keysBlock}]
    
    REGLA: Devuelve un JSON con un array de strings exactos del índice.
    Ejemplo: { "selected": ["MERLIN", "EXCALIBUR"] }
    Selecciona máximo 6 temas.`;

    const userPrompt = `Capítulo: "${chapTitle}"\nResumen: ${chapSummary.substring(0, 800)}`;

    try {
        const raw = await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-12b-it", temperature: 0.2 });
        const data = cleanAndParseJSON(raw);
        return data.selected || [];
    } catch (e) {
        return [];
    }
}

// --- FASE 1: ARQUITECTO TÉCNICO ---
async function phaseArchitect(title, rawContent, globalContext, prevHistory, numBlocks, specificLore, memory, nextPreview) {
    const safeContent = rawContent.substring(0, 4000); 
    
    const systemPrompt = `Eres un Arquitecto Narrativo Técnico.
    TU OBJETIVO: Desglosar la escena proporcionada en ${numBlocks} puntos ("beats") lógicos.
    
    MEMORIA (Resumen Caps Anteriores):
    ${memory || "Inicio."}
    
    CONTEXTO RECIENTE: "...${prevHistory.substring(0,300)}"
    LORE ACTIVO: ${specificLore ? "Datos disponibles." : "N/A"}
    FUTURO: "${nextPreview}..."
    
    MATERIAL BASE (ESTE CAPÍTULO): 
    TÍTULO: "${title}"
    CONTENIDO: "${safeContent}"
    
    DIRECTRICES:
    - ESTRUCTURA: Crea una transición fluida desde el 'PASADO'.
    - DESARROLLO: Adapta fielmente el 'MATERIAL BASE' integrando el 'LORE'.
    - CIERRE: Prepara el final del capítulo para que conecte lógicamente con el 'FUTURO INMEDIATO'.
    
    FORMATO JSON ESTRICTO: { "beats": ["Instrucción paso 1", "Instrucción paso 2", ...] }`;

    const userPrompt = `Genera la escaleta de ${numBlocks} pasos conectando pasado, presente y futuro.`;

    try {
        const raw = await callGoogleAPI(systemPrompt, userPrompt, { temperature: 0.3 });
        const data = cleanAndParseJSON(raw);
        if (data && data.beats && Array.isArray(data.beats)) return data.beats; 
        else throw new Error("Fallo JSON Arquitecto");
    } catch (e) {
        console.warn("Fallo Arquitecto, fallback.", e);
        return Array(numBlocks).fill("Narra la escena integrando el lore y preparando el siguiente capítulo.");
    }
}

// --- FASE 2: ESCRITOR DE ADAPTACIÓN ---
async function phaseWriter(blockIndex, totalBlocks, beatInstruction, prevContext, specificLore) {
    const systemPrompt = `Eres un Redactor de Novelizaciones.
    ESTAMOS EN: Bloque ${blockIndex} de ${totalBlocks}.
    LORE ACTIVO: ${specificLore ? specificLore.substring(0, 2000) : "N/A"}
    
    INSTRUCCIÓN: "${beatInstruction}"
    TEXTO PREVIO: "...${prevContext}"
    
    REGLAS:
    1. Usa el LORE proporcionado.
    2. Mantén coherencia con el TEXTO PREVIO.
    3. NO incluyas introducciones ni notas. SOLO NARRATIVA.`;

    const userPrompt = `Escribe el bloque.`;
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.7 });
}

// --- FASE 3: EDITOR (Pulido con Strict Output) ---
async function phaseEditor(draftText, styleNuance) {
    const systemPrompt = `Eres un Editor Literario. Pule el texto para publicación.
    ESTILO: ${styleNuance}
    REGLAS ESTRICTAS:
    1. No cambies los hechos ni nombres del LORE.
    2. OUTPUT: ÚNICAMENTE el texto narrativo final.
    3. PROHIBIDO: Incluir notas del editor, listas de cambios o repetir la instrucción.
    4. PROHIBIDO: Usar frases como "Aquí está el texto pulido".`;

    const userPrompt = `Texto a pulir:\n${draftText}`;
    return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.5 });
}

// --- FASE DE RESUMEN OPTIMIZADA (Resume BEATS, no TEXTO) ---
async function phaseSummarizer(beatsText) {
    const systemPrompt = `Eres un Analista de Archivo.
    Resume esta ESCALETA de eventos en 3 frases clave.`;

    const userPrompt = `Escaleta:\n${beatsText}`; // Entrada muy ligera
    
    try {
        return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-12b-it", temperature: 0.3 });
    } catch (e) {
        return "Capítulo procesado.";
    }
}

// --- FASE 4: TITULADOR AUTOMÁTICO (Un solo título) ---
async function phaseTitleGenerator(chapterContent, originalTitle) {
    const systemPrompt = `Genera UN (1) título literario corto (max 6 palabras) para este texto.
    INPUT: Título provisional "${originalTitle}".
    REGLA: Devuelve SOLAMENTE el título final. NO hagas una lista. NO uses comillas.`;
    
    const userPrompt = `Texto:\n${chapterContent.substring(0, 1000)}...`; 
    
    try {
        let title = await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.7 });
        title = title.split('\n')[0]; 
        title = title.replace(/^\d+[\.\)]\s*/, ''); 
        title = title.replace(/^[-*]\s*/, '');
        title = title.replace(/^Título:\s*/i, '').replace(/["']/g, '').replace(/\.$/, '').trim();
        return title;
    } catch (e) {
        return originalTitle;
    }
}

window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;