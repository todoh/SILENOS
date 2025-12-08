// --- IA KOREH: CEREBRO CENTRAL DE INTELIGENCIA ARTIFICIAL ---
import { getApiKeysList } from './apikey.js';

console.log("Módulo IA Koreh Cargado (Núcleo de Procesamiento)");

// --- UTILIDADES COMPARTIDAS ---

export const delay = ms => new Promise(res => setTimeout(res, ms));

export function cleanAndParseJSON(str) {
    try {
        const firstBrace = str.indexOf('{');
        const lastBrace = str.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            str = str.substring(firstBrace, lastBrace + 1);
        }

        let clean = str.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(clean);
    } catch (e) {
        console.error("Koreh: Error parseando JSON:", e);
        console.log("Raw string recibida:", str);
        // Retornamos null para manejar el error en el controlador
        return null;
    }
}

// --- FUNCIÓN MAESTRA DE LLAMADA A API (Soporta Configuración) ---
export async function callGoogleAPI(systemPrompt, userPrompt, config = {}) {
    
    // AWAIT IMPORTANTE: Esperamos a que el módulo apikey decida si usa local o server
    const keyList = await getApiKeysList();
    
    if (!keyList || keyList.length === 0) {
        throw new Error("Koreh: No hay API Keys disponibles (ni locales ni en servidor).");
    }

    // Configuración por defecto (mezclada con la recibida)
    const settings = {
        model: config.model || "gemma-3-27b-it", // Modelo base por defecto
        temperature: config.temperature !== undefined ? config.temperature : 0.8,
        maxRetries: config.maxRetries || 27,
        maxOutputTokens: config.maxOutputTokens || 8192
    };

    let lastError = null;

    // Bucle de rotación de KEYS (Modo Metralleta)
    for (let attempt = 0; attempt < settings.maxRetries; attempt++) {
        
        // Rotación segura usando módulo
        const currentKey = keyList[attempt % keyList.length];
        
        // URL dinámica según el modelo solicitado
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${currentKey}`;

        const combinedPrompt = `
        === SISTEMA (KOREH SYSTEM) ===
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
                // Si es un error 429 (Too Many Requests) o 5xx, vale la pena reintentar con otra key
                throw new Error(`API Error (${status}): ${msg}`);
            }
            
            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("Koreh: La IA devolvió una respuesta vacía.");
            }

            // ÉXITO
            return data.candidates[0].content.parts[0].text;

        } catch (error) {
            lastError = error;
            console.warn(`Koreh: Fallo conexión (${attempt + 1}/${settings.maxRetries}) usando modelo ${settings.model}: ${error.message}. Rotando Key...`);
            
            // Pausa progresiva si estamos fallando mucho, para no saturar
            if (attempt < settings.maxRetries - 1) {
                await delay(500 + (attempt * 100)); 
            }
        }
    }

    throw new Error(`Koreh: Fallo total tras ${settings.maxRetries} intentos. Último error: ${lastError.message}`);
}