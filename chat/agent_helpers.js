// agent_helpers.js
// Funciones Auxiliares de Interconexión y Formateo
import { queryGemini } from './gemini.js';
import { queryPollinations } from './pollinations.js';
import { queryOllama } from './ollama.js';
import { directoryHandle } from './conversations.js';

const LAST_MODEL_CALL_TIMESTAMP = {};
const MIN_CALL_INTERVAL_MS = 3000;

export async function enforceModelRateLimit(modelTag) {
    const now = Date.now();
    const lastCall = LAST_MODEL_CALL_TIMESTAMP[modelTag] || 0;
    const timeElapsed = now - lastCall;
    if (timeElapsed < MIN_CALL_INTERVAL_MS) {
        const waitTime = MIN_CALL_INTERVAL_MS - timeElapsed;
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    LAST_MODEL_CALL_TIMESTAMP[modelTag] = Date.now();
}

export async function callSpecificModel(messages, model, configKeys, attachments = []) {
    await enforceModelRateLimit(model.tag);
    if (model.provider === 'gemini') {
        return await queryGemini(messages, model.tag, configKeys.gemini, attachments);
    } else if (model.provider === 'pollinations') {
        return await queryPollinations(messages, model.tag, configKeys.pollinations, attachments);
    } else if (model.provider === 'ollama') {
        return await queryOllama(messages, model.tag, configKeys.ollamaEndpoint, attachments);
    } else {
        throw new Error(`Proveedor de modelo no reconocido: ${model.provider}`);
    }
}

/**
 * Realiza una llamada previa rápida usando gemini-3.1-flash-lite para filtrar únicamente 
 * las funciones de la librería universal que la IA realmente pueda necesitar para el prompt.
 */
export async function filterLibraryWithFlashLite(userPrompt, fullLibrary, configKeys) {
    if (!configKeys.gemini || !Array.isArray(fullLibrary) || fullLibrary.length === 0) {
        return fullLibrary;
    }

    const simplifiedInventory = fullLibrary.map(f => ({
        name: f.name,
        signature: f.signature || `${f.name}()`,
        tags: f.tags || [],
        desc: f.desc || ''
    }));

    const selectorPrompt = [
        {
            role: 'system',
            content: `Eres un Selector Experto de Funciones y Dependencias de Código.
Tu única función es analizar la solicitud del usuario y seleccionar EXCLUSIVAMENTE las funciones de la biblioteca proporcionada que sean relevantes, necesarias o útiles para resolver la tarea.

BIBLIOTECA COMPLETA DISPONIBLE:
${JSON.stringify(simplifiedInventory, null, 2)}

REGLAS DE SALIDA:
1. Responde ÚNICAMENTE con un objeto JSON estricto en el siguiente formato:
{
  "selected_functions": ["nombreFuncion1", "nombreFuncion2"]
}
2. Si la consulta NO requiere ninguna función de la biblioteca (preguntas teóricas, texto plano, conversaciones generales), devuelve un array vacío: {"selected_functions": []}.
3. No incluyas explicaciones ni bloques fuera del JSON.`
        },
        {
            role: 'user',
            content: userPrompt
        }
    ];

    try {
        const flashLiteModel = { tag: 'gemini-3.5-flash-lite', provider: 'gemini' };
        const rawResponse = await callSpecificModel(selectorPrompt, flashLiteModel, configKeys, []);
        const parsed = extractJSONFromText(rawResponse);
        
        if (parsed && Array.isArray(parsed.selected_functions)) {
            const selectedSet = new Set(parsed.selected_functions);
            const filtered = fullLibrary.filter(f => selectedSet.has(f.name));
            return filtered;
        }
    } catch (err) {
        console.warn("Error o timeout en llamada previa a gemini-3.1-flash-lite. Se usará la librería completa:", err);
    }

    return fullLibrary;
}

export function extractJSONFromText(text) {
    let clean = text.trim();
    if (clean.startsWith('```json')) clean = clean.substring(7);
    if (clean.startsWith('```')) clean = clean.substring(3);
    if (clean.endsWith('```')) clean = clean.substring(0, clean.length - 3);
    clean = clean.trim();

    const firstOpen = clean.indexOf('{');
    const lastClose = clean.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        clean = clean.substring(firstOpen, lastClose + 1);
    }

    return JSON.parse(clean);
}

export function extractCodeBlocks(text) {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
        blocks.push({
            language: match[1].toLowerCase(),
            code: match[2]
        });
    }
    return blocks;
}

export async function getDirectoryFileList() {
    if (!directoryHandle) return [];
    const files = [];
    try {
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file') files.push(entry.name);
        }
    } catch (e) {}
    return files;
}