/* NEXUS SILENOS/ia_koreh.js */
// --- IA KOREH: CEREBRO CENTRAL DE INTELIGENCIA ARTIFICIAL ---
import { getApiKeysList, getUserAIModel } from './apikey.js';

console.log("Módulo IA Koreh Cargado (Núcleo de Procesamiento V2.1 - Robust)");

// --- UTILIDADES COMPARTIDAS ---

export const delay = ms => new Promise(res => setTimeout(res, ms));

export function cleanAndParseJSON(str) {
    if (!str) return null;

    try {
        // 1. Limpieza básica de Markdown
        let clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();

        // 2. Intento directo
        try {
            return JSON.parse(clean);
        } catch (e1) {
            // FALLO 1: Puede que la IA haya devuelto objetos separados por comas sin corchetes
            // Ejemplo: {a:1}, {b:2} -> Esto rompe JSON.parse
            
            // Si empieza por '{' y contiene '},{' o '}, {' pero NO empieza por '['
            if (clean.startsWith('{') && (clean.includes('},{') || clean.includes('}, {'))) {
                console.warn("Koreh: Detectado formato lista sin corchetes. Reparando...");
                try {
                    return JSON.parse(`[${clean}]`);
                } catch (e2) {
                    // Si falla la reparación simple, seguimos
                }
            }

            // 3. Extracción quirúrgica (Buscar el primer [ o { y el último ] o })
            const firstBrace = clean.indexOf('{');
            const firstBracket = clean.indexOf('[');
            const lastBrace = clean.lastIndexOf('}');
            const lastBracket = clean.lastIndexOf(']');

            let start = -1;
            let end = -1;

            // Determinamos si parece un array o un objeto
            // Priorizamos Array si el corchete aparece antes que la llave o no hay llave
            if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
                start = firstBracket;
                end = lastBracket;
            } else if (firstBrace !== -1) {
                start = firstBrace;
                end = lastBrace;
            }

            if (start !== -1 && end !== -1) {
                let substring = clean.substring(start, end + 1);
                return JSON.parse(substring);
            }

            throw e1; // Si nada funciona, lanzamos el error original
        }
    } catch (e) {
        console.error("Koreh: Error fatal parseando JSON:", e);
        console.log("Raw string recibida:", str);
        return null; // Retornamos null para manejar el error elegantemente
    }
}

// --- FUNCIÓN MAESTRA DE LLAMADA A API ---
export async function callGoogleAPI(systemPrompt, userPrompt, config = {}) {
    
    const keyList = await getApiKeysList();
    
    if (!keyList || keyList.length === 0) {
        throw new Error("Koreh: No hay API Keys disponibles. Configúralas en el botón ⚙️.");
    }

    const preferredModel = getUserAIModel(); 

    const settings = {
        model: config.model || preferredModel || "gemma-3-27b-it", 
        temperature: config.temperature !== undefined ? config.temperature : 0.8,
        maxRetries: keyList.length * 2, 
        maxOutputTokens: config.maxOutputTokens || 8192
    };

    let lastError = null;

    for (let attempt = 0; attempt < settings.maxRetries; attempt++) {
        const currentKey = keyList[attempt % keyList.length];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${currentKey}`;

        const combinedPrompt = `
        === SISTEMA (SYSTEM) ===
        ${systemPrompt}
        
        === USUARIO (INPUT) ===
        ${userPrompt}
        `;

        const payload = {
            contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
            generationConfig: {
                temperature: settings.temperature,
                maxOutputTokens: settings.maxOutputTokens
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
                if (status === 400) console.warn(`Koreh: Error 400. Verifica modelo '${settings.model}'.`);
                throw new Error(`API Error (${status}): ${msg}`);
            }
            
            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) throw new Error("Respuesta vacía de IA.");

            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            lastError = error;
            console.warn(`Koreh: Fallo (${attempt + 1}) Key[..${currentKey.slice(-4)}]: ${error.message}`);
            if (attempt < settings.maxRetries - 1) await delay(300 + (attempt * 50)); 
        }
    }

    throw new Error(`Koreh: Fallo total. Último error: ${lastError.message}`);
}