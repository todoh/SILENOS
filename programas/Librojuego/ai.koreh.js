// Archivo: Librojuego/ai.koreh.js

window.Koreh = {
    Core: {
        getAuthKey() {
            if (window.parent && window.parent.SystemConfig && window.parent.SystemConfig.authKey) return window.parent.SystemConfig.authKey;
            if (window.SystemConfig && window.SystemConfig.authKey) return window.SystemConfig.authKey;
            return localStorage.getItem('pollinations_api_key');
        },
        async fetchWrapper(url, options = {}) {
            const apiKey = this.getAuthKey();
            if (!options.headers) options.headers = {};
            if (apiKey) options.headers['Authorization'] = `Bearer ${apiKey}`;
            options.headers['Content-Type'] = 'application/json';
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`API Error: ${await res.text()}`);
            return res;
        }
    },
    Text: {
        cleanJSON(str) {
            if (!str) return "{}";
            let clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
            const firstOpen = clean.indexOf('{');
            const firstArr = clean.indexOf('[');
            const first = (firstOpen > -1 && firstArr > -1) ? Math.min(firstOpen, firstArr) : Math.max(firstOpen, firstArr);
            const lastClose = clean.lastIndexOf('}');
            const lastArr = clean.lastIndexOf(']');
            const last = Math.max(lastClose, lastArr);
            if (first !== -1 && last !== -1) clean = clean.substring(first, last + 1);
            return clean.replace(/,\s*([\]}])/g, '$1');
        },
        async generate(sysPrompt, userPrompt, config = {}) {
            const ollamaConfig = JSON.parse(localStorage.getItem('ollama_config')) || { enabled: false };
            
            if (ollamaConfig.enabled) {
                // FLUJO OLLAMA LOCAL
                const url = ollamaConfig.url || 'http://localhost:11434';
                // gemini-fast era el modelo de estructura/lógica, nova-fast el narrativo
                let modelName = config.model === 'gemini-fast' ? ollamaConfig.logic : ollamaConfig.narrative;
                if (!modelName) modelName = ollamaConfig.logic || ollamaConfig.narrative; 
                
                if (!modelName) throw new Error("Ollama está activado pero no has seleccionado un modelo en los Ajustes.");

                const body = {
                    model: modelName,
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    options: {
                        temperature: config.temperature ?? 0.7
                    }
                };
                
                if (config.jsonMode) {
                    body.messages[0].content += " RESPOND ONLY IN STRICT JSON. DO NOT TRUNCATE.";
                    body.format = "json"; // Formato nativo de Ollama
                }
                
                const response = await fetch(`${url}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) throw new Error(`Ollama Error: ${await response.text()}`);
                const data = await response.json();
                const content = data.message.content;
                
                if (config.jsonMode) {
                    try {
                        return JSON.parse(this.cleanJSON(content));
                    } catch (e) {
                        console.error("Error parseando el JSON de Ollama:", e.message, "\nContenido problemático:\n", content.substring(0, 200));
                        throw new Error("JSON malformado (posibles comillas sin escapar o saltos de línea reales).");
                    }
                }
                return content;
            } else {
                // FLUJO ORIGINAL (Pollinations / Cloud)
                const body = {
                    model: config.model || 'gemini-fast',
                    temperature: config.temperature ?? 0.7,
                    max_tokens: 4096, 
                    messages: [
                        { role: 'system', content: sysPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                };
                
                if (config.jsonMode) {
                    body.messages[0].content += " RESPOND ONLY IN STRICT JSON. DO NOT TRUNCATE.";
                    body.response_format = { type: "json_object" };
                }
                
                const response = await window.Koreh.Core.fetchWrapper('https://gen.pollinations.ai/v1/chat/completions', { method: 'POST', body: JSON.stringify(body) });
                const data = await response.json();
                const content = data.choices[0].message.content;
                
                if (config.jsonMode) {
                    try {
                        return JSON.parse(this.cleanJSON(content));
                    } catch (e) {
                        console.error("Error parseando el JSON de la IA:", e.message, "\nContenido problemático:\n", content.substring(0, 200));
                        throw new Error("JSON malformado (posibles comillas sin escapar o saltos de línea reales).");
                    }
                }
                return content;
            }
        },
        async generateWithRetry(sysPrompt, userPrompt, config = {}, validator = null, maxRetries = 4) {
            let attempt = 0;
            let lastError = null;
            while (attempt < maxRetries) {
                try {
                    const result = await this.generate(sysPrompt, userPrompt, config);
                    if (validator) {
                        if (!validator(result)) throw new Error("Fallo de validación en la estructura generada por la IA.");
                    }
                    return result;
                } catch (error) {
                    attempt++;
                    lastError = error;
                    console.warn(`Intento ${attempt}/${maxRetries} fallido en modelo ${config.model}.`, error);
                    await new Promise(resolve => setTimeout(resolve, 2500)); // Mayor pausa en caso de fallo
                }
            }
            throw new Error(`Fallo definitivo tras ${maxRetries} intentos: ${lastError.message}`);
        }
    }
};