/**
 * AI TEXT - Módulo de Generación de Texto y JSON (Ollama / Pollinations Router)
 * Dependencia: ai.core.js
 * Espacio de nombres: window.Koreh.Text
 */

window.Koreh = window.Koreh || {};

window.Koreh.Text = {
    
    // Limpieza de bloques de código Markdown
    cleanJSON(str) {
        if (!str) return "";
        let clean = str.replace(/```json/g, '').replace(/```/g, '');
        const firstOpen = clean.indexOf('{');
        const firstArr = clean.indexOf('[');
        const first = (firstOpen > -1 && firstArr > -1) ? Math.min(firstOpen, firstArr) : Math.max(firstOpen, firstArr);
        
        const lastClose = clean.lastIndexOf('}');
        const lastArr = clean.lastIndexOf(']');
        const last = Math.max(lastClose, lastArr);

        if (first !== -1 && last !== -1) {
            return clean.substring(first, last + 1);
        }
        return clean;
    },

    // Función principal de generación adaptada a la red de agentes local/cloud y online
    async generate(systemPrompt, userPrompt, config = {}) {
        if (!window.Koreh.Core) throw new Error("Koreh.Core no cargado.");
        window.Koreh.Core.syncConfig();

        const apiMode = window.Koreh.Core.config.apiMode;
        let model = config.model || localStorage.getItem('koreh_selected_ollama_model') || 'qwen3.5:cloud';
        const jsonMode = config.jsonMode || false;
        const signal = config.signal || null;
        
        let resultText = "";

        // Enrutamiento primario basado en la configuración global de la UI
        if (apiMode === 'pollinations') {
            // El modelo activo para pollinations se obtiene de la preferencia guardada si no viene forzado
            const pollinationsModel = localStorage.getItem('koreh_selected_pollinations_model') || 'gemini-fast';
            resultText = await window.Koreh.Core.callPollinationsAPI(pollinationsModel, userPrompt, jsonMode, systemPrompt, signal);
        } else {
            // Modo Ollama (Local / Remoto Cloud)
            const lowerModel = model.toLowerCase();
            if (lowerModel.includes(':cloud') || lowerModel.includes('-cloud') || lowerModel.includes('cloud')) {
                resultText = await window.Koreh.Core.callOllamaCloudAPI(model, userPrompt, jsonMode, systemPrompt, signal);
            } else {
                resultText = await window.Koreh.Core.callOllamaAPI(model, userPrompt, jsonMode, systemPrompt, signal);
            }
        }

        if (jsonMode) {
            try {
                const cleaned = this.cleanJSON(resultText);
                return JSON.parse(cleaned);
            } catch (e) {
                console.warn("Fallo al parsear JSON de IA, intentando rescate de strings:", e);
                try {
                    let escaped = resultText.trim().replace(/\n/g, "\\n").replace(/\r/g, "\\r");
                    const firstBrace = escaped.indexOf('{');
                    const lastBrace = escaped.lastIndexOf('}');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        escaped = escaped.substring(firstBrace, lastBrace + 1);
                    }
                    return JSON.parse(escaped);
                } catch (err) {
                    throw new Error("AI_JSON_PARSE_ERROR: La salida no contiene una estructura JSON procesable.");
                }
            }
        }

        return resultText;
    }
};