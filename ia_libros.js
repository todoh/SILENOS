// --- IA: GENERACIÓN DE LIBROS (Arquitectura Pipeline v5.1 - Clean Output Fix) ---
import { getApiKeysList } from './apikey.js';
import { callGoogleAPI, cleanAndParseJSON, delay } from './ia_koreh.js';
import { checkUsageLimit, registerUsage } from './usage_tracker.js'; 

console.log("Módulo IA Libros Cargado (v5.1 - Strict Cleaning)");

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

// --- FUNCIÓN DE LIMPIEZA MEJORADA (FIX PRINCIPAL) ---
function cleanOutputText(text) {
    if (!text) return "";

    // 1. Eliminar eco de instrucciones del sistema (System Prompt Leaks)
    // Detecta patrones como "Eres un Editor...", "ESTILO:...", "REGLA:..."
    text = text.replace(/^(Eres un|Actúa como) (Editor|Asistente|Redactor|Escritor).*?(\n|$)/gim, '');
    text = text.replace(/^ESTILO:.*?(\n|$)/gim, '');
    text = text.replace(/^REGLA:.*?(\n|$)/gim, '');
    text = text.replace(/^TAREA:.*?(\n|$)/gim, '');

    // 2. Eliminar cabeceras conversacionales de la IA
    text = text.replace(/^(\#\#\s*)?(Aquí (tienes|está)|He aquí|El texto|Texto pulido|Borrador|Propuesta|Versión mejorada).*?[:\n]/gmi, '');
    
    // 3. Eliminar repetición del input (ej: "Texto a pulir: ...")
    // Busca "Texto a pulir:" y borra hasta el siguiente salto de línea doble
    text = text.replace(/^Texto a pulir:[\s\S]*?(\n\n|\r\n\r\n)/mi, ''); 

    // 4. Eliminar secciones de meta-comentarios al final (Explicaciones, Notas, Cambios)
    const metaMarkers = [
        'Cambios realizados',
        'Justificación',
        'Notas sobre',
        'Comentarios:',
        'Cambios y justificación',
        '## Títulos propuestos', // Por si se cuela una lista de títulos
        'Opción 1:',
        'Nota del editor:'
    ];

    // Cortar el texto donde empiece cualquiera de estas secciones
    let cutIndex = text.length;
    metaMarkers.forEach(marker => {
        const idx = text.toLowerCase().indexOf(marker.toLowerCase());
        if (idx !== -1 && idx < cutIndex) {
            // Verificamos que no sea parte de la narrativa (ej: "Hizo cambios realizados con esfuerzo")
            // Asumimos que si aparece es una cabecera, chequeando si hay un salto de línea antes o está al inicio
            const linesBefore = text.substring(0, idx).split('\n');
            const lastLine = linesBefore[linesBefore.length -1].trim();
            if (lastLine === '' || lastLine.length < 5) { // Es probable que sea una cabecera
                 cutIndex = idx;
            }
        }
    });
    text = text.substring(0, cutIndex);

    // 5. Limpieza final de Markdown residual y espacios
    text = text.replace(/===.*?===/g, '');
    text = text.replace(/\-\-\-+/g, ''); // Líneas divisorias
    
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
    
    // --- EXTRACCIÓN DE CONTEXTO ---
    let globalContext = "Trama general.";
    let fullLoreContent = ""; 
    let chapterScenes = [];

    // Detectar si hay LORE en la última escena (Estándar v3.0 de Guiones)
    const lastScene = sourceScript.scenes[sourceScript.scenes.length - 1];
    const hasLore = lastScene && (lastScene.title.includes("LORE") || lastScene.title.includes("DATOS CLAVE"));

    if (sourceScript.scenes.length > 0) {
        globalContext = sourceScript.scenes[0].paragraphs.map(p => p.text).join('\n');
        
        if (hasLore) {
            fullLoreContent = lastScene.paragraphs.map(p => p.text).join('\n');
            chapterScenes = sourceScript.scenes.slice(1, sourceScript.scenes.length - 1);
            console.log("📚 Lore detectado e integrado en el pipeline.");
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
    let narrativeHistory = "Inicio de la historia."; // Últimos caracteres (Buffer inmediato)
    let previousSummaries = []; // Lista acumulativa de resúmenes (Memoria a largo plazo)

    try {
        for (let i = 0; i < totalChapters; i++) {
            const sceneData = chapterScenes[i];
            const sceneTitle = sceneData.title;
            const sceneContent = sceneData.paragraphs.map(p => p.text).join('\n');
            
            // --- NUEVO: PREVISIÓN DEL SIGUIENTE CAPÍTULO ---
            let nextChapterPreview = "Fin de la obra.";
            if (i + 1 < totalChapters) {
                 const nextSceneData = chapterScenes[i + 1];
                 const nextText = nextSceneData.paragraphs.map(p => p.text).join('\n');
                 nextChapterPreview = nextText.substring(0, 900); // 900 primeros caracteres
            }

            // FASE 0: RAG CONTEXTUAL (FILTRO DE LORE)
            updateProgress((i / totalChapters) * 100, `Cap ${i+1}: Analizando Lore y Contexto...`);
            let specificChapterLore = "";
            
            if (fullLoreContent && fullLoreContent.length > 10) {
                specificChapterLore = await phaseContextFilter(sceneTitle, sceneContent, fullLoreContent);
            }

            // FASE 1: ARQUITECTO (Ahora con Conciencia Temporal Completa)
            updateProgress((i / totalChapters) * 100, `Cap ${i+1}: Estructurando trama...`);
            
            const chapterPlan = await phaseArchitect(
                sceneTitle, 
                sceneContent, 
                globalContext, 
                narrativeHistory, 
                totalBlocksPerChapter, 
                specificChapterLore,
                previousSummaries.join("\n"), // Pasamos todos los resúmenes anteriores
                nextChapterPreview            // Pasamos el inicio del siguiente capítulo
            );
            
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
                const draftText = await phaseWriter(blockNum, chapterPlan.length, currentBeat, slidingWindowContext, specificChapterLore);

                updateProgress(baseProg + chunkProg, `Cap ${i+1} [Bloque ${blockNum}]: Pulido final...`);

                // FASE 3: EDITOR (Prompt Reforzado)
                let polishedText = await phaseEditor(draftText, nuanceText);
                
                polishedText = cleanOutputText(polishedText);
                fullChapterText.push(polishedText);
                slidingWindowContext = polishedText.slice(-2000); 
                
                await delay(500);
            }

            const finalChapterContent = fullChapterText.join("\n\n");

            // --- NUEVO: FASE DE RESUMEN (Generar memoria para el futuro) ---
            updateProgress(((i + 1) / totalChapters) * 100, `Cap ${i+1}: Sintetizando memoria...`);
            const chapterSummary = await phaseSummarizer(finalChapterContent);
            previousSummaries.push(`[RESUMEN CAPÍTULO ${i+1}]: ${chapterSummary}`);
            
            // FASE 4: TITULADOR AUTOMÁTICO (Prompt Reforzado)
            const generatedTitle = await phaseTitleGenerator(finalChapterContent, sceneTitle);

            // Actualizar buffer inmediato (solo texto final para continuidad de estilo)
            narrativeHistory = finalChapterContent.slice(-3000);

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
        alert("¡Libro generado! La IA ha mantenido la coherencia usando memoria a largo plazo y visión del futuro.");
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

// --- FASE 0: FILTRO DE CONTEXTO (RAG) ---
async function phaseContextFilter(chapTitle, chapSummary, fullLore) {
    const systemPrompt = `Eres un Asistente de Continuidad Narrativa.
    Extrae del LORE COMPLETO únicamente los datos (nombres, lugares, objetos) relevantes para el CAPÍTULO ACTUAL.
    OUTPUT: Lista concisa de hechos/datos.`;

    const userPrompt = `
    [CAPÍTULO A ESCRIBIR]: "${chapTitle}"
    ${chapSummary}

    [LORE COMPLETO]:
    ${fullLore.substring(0, 15000)}

    LISTA EL LORE APLICABLE AHORA:`;

    try {
        return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.3 });
    } catch (e) {
        return "";
    }
}

// --- FASE 1: ARQUITECTO TÉCNICO ---
async function phaseArchitect(title, rawContent, globalContext, prevHistory, numBlocks, specificLore, prevSummaries, nextPreview) {
    const safeContent = rawContent.substring(0, 4000); 
    
    const systemPrompt = `Eres un Arquitecto Narrativo Técnico.
    TU OBJETIVO: Desglosar la escena proporcionada en ${numBlocks} puntos ("beats") lógicos.
    
    INFORMACIÓN TEMPORAL:
    1. PASADO (Resúmenes): ${prevSummaries ? prevSummaries : "Inicio de novela."}
    2. PRESENTE (Buffer anterior): "...${prevHistory.substring(0,500)}"
    3. FUTURO INMEDIATO (Siguiente Cap): "${nextPreview}..."
    
    MATERIAL BASE (ESTE CAPÍTULO): 
    TÍTULO: "${title}"
    CONTENIDO: "${safeContent}"
    
    LORE OBLIGATORIO: ${specificLore || "N/A"}
    
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
    LORE ACTIVO: ${specificLore ? specificLore : "N/A"}
    
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
    // MODIFICADO: Instrucción explícita de NO incluir metadatos
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

// --- NUEVO: FASE DE RESUMEN (MEMORIA) ---
async function phaseSummarizer(chapterText) {
    const systemPrompt = `Eres un Analista de Archivo.
    Resume el siguiente capítulo en 3-4 frases concisas.
    Destaca: Eventos clave, cambios en personajes y objetos obtenidos/perdidos.`;

    const userPrompt = `Capítulo a resumir:\n${chapterText.substring(0, 8000)}`; // Límite seguro
    
    try {
        return await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.4 });
    } catch (e) {
        return "Capítulo procesado (Resumen no disponible).";
    }
}

// --- FASE 4: TITULADOR AUTOMÁTICO (Un solo título) ---
async function phaseTitleGenerator(chapterContent, originalTitle) {
    // MODIFICADO: Pedir explícitamente UN solo título
    const systemPrompt = `Genera UN (1) título literario corto (max 6 palabras) para este texto.
    INPUT: Título provisional "${originalTitle}".
    REGLA: Devuelve SOLAMENTE el título final. NO hagas una lista. NO uses comillas.`;
    
    const userPrompt = `Texto:\n${chapterContent.substring(0, 2000)}...`; 
    
    try {
        let title = await callGoogleAPI(systemPrompt, userPrompt, { model: "gemma-3-27b-it", temperature: 0.7 });
        
        // Limpieza extra por si la IA desobedece y manda lista
        title = title.split('\n')[0]; // Tomar solo la primera línea
        title = title.replace(/^\d+[\.\)]\s*/, ''); // Quitar "1. " o "1) "
        title = title.replace(/^[-*]\s*/, ''); // Quitar bullets
        title = title.replace(/^Título:\s*/i, '').replace(/["']/g, '').replace(/\.$/, '').trim();
        
        return title;
    } catch (e) {
        return originalTitle;
    }
}

window.refreshScriptSelector = refreshScriptSelector;
window.generateBookFromText = generateBookFromText;