// --- LOGIC.JS (UTILIDADES PURAS E IA GLOBAL) ---

function detectTextType(content) {
    const trimmed = content.trim();
    // Detección de SVG explícita y robusta
    if (trimmed.match(/<svg[\s>]/i) && trimmed.match(/<\/svg>/i)) return 'svg';
    if (trimmed.startsWith('<') && trimmed.includes('>')) return 'html';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { JSON.parse(trimmed); return 'json'; } catch(e){}
    }
    if (trimmed.includes('function') || trimmed.includes('const') || trimmed.includes('=>') || trimmed.includes(';')) return 'js';
    if (trimmed.includes('{') && trimmed.includes(':') && trimmed.includes(';')) return 'css';
    return 'txt';
}

function generateFilename(prefix, extension) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${prefix}_${timestamp}.${extension}`;
}

// --- SILENOS AI CORE ---
// Motor intrínseco de IA disponible para todo el sistema y futuras aplicaciones.
window.SilenosAI = {
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

    async generate({ prompt, system = "Eres un asistente experto.", temperature = 0.7, model = 'openai', jsonMode = false }) {
        const ollamaConfig = JSON.parse(localStorage.getItem('ollama_config')) || { enabled: false };
        const sys = window.SystemConfig || { authKey: localStorage.getItem('pollinations_api_key') };

        if (ollamaConfig.enabled) {
            // FLUJO OLLAMA LOCAL
            const url = ollamaConfig.url || 'http://localhost:11434';
            let modelName = model === 'openai' || model === 'gemini-fast' ? (ollamaConfig.logic || 'llama3') : (ollamaConfig.narrative || model);
            
            const body = {
                model: modelName,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: prompt }
                ],
                stream: false,
                options: {
                    temperature: temperature
                }
            };
            
            if (jsonMode) {
                body.messages[0].content += " RESPOND ONLY IN STRICT JSON. DO NOT TRUNCATE.";
                body.format = "json";
            }
            
            try {
                const response = await fetch(`${url}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) throw new Error(`Ollama Error: ${await response.text()}`);
                const data = await response.json();
                const content = data.message.content;
                
                if (jsonMode) {
                    try {
                        return JSON.parse(this.cleanJSON(content));
                    } catch (e) {
                        throw new Error("JSON malformado devuelto por Ollama.");
                    }
                }
                return content;
            } catch (e) {
                console.error("Fallo profundo en SilenosAI (Ollama):", e);
                throw e;
            }
        } else {
            // FLUJO POLLINATIONS ACTUALIZADO
            if (!sys || !sys.authKey) {
                throw new Error("Autenticación IA denegada: Conecta tu cuenta en la configuración del sistema (CFG).");
            }
            
            try {
                const body = {
                    model: model,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: prompt }
                    ],
                    temperature: temperature,
                    max_tokens: 4096
                };

                if (jsonMode) {
                    body.messages[0].content += " RESPOND ONLY IN STRICT JSON. DO NOT TRUNCATE.";
                    body.response_format = { type: "json_object" };
                }

                const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${sys.authKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                
                if (!response.ok) {
                    throw new Error(`API respondió con estado: ${response.status} - ${await response.text()}`);
                }
                
                const data = await response.json();
                const content = data.choices[0].message.content;
                
                if (jsonMode) {
                    return JSON.parse(this.cleanJSON(content));
                }
                return content;
            } catch (e) {
                console.error("Fallo profundo en SilenosAI (Pollinations):", e);
                throw e;
            }
        }
    },

    async generateImage({ prompt, width = 1024, height = 1024, seed = null, model = 'flux' }) {
        // Ollama no genera imágenes nativamente sin multimodales pesados que escapen al estándar, 
        // así que el pipeline de imagen usa Pollinations consistentemente.
        const safePrompt = encodeURIComponent(prompt);
        const sys = window.SystemConfig || { authKey: localStorage.getItem('pollinations_api_key') };
        const apiKey = sys.authKey || '';
        const finalSeed = seed || Math.floor(Math.random() * 9999999);
        
        let url = `https://image.pollinations.ai/prompt/${safePrompt}?model=${model}&width=${width}&height=${height}&seed=${finalSeed}&nologo=true`;
        if (apiKey) url += `&key=${apiKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("API Error: " + response.statusText);
            return await response.blob();
        } catch (e) {
            console.error("Fallo profundo en SilenosAI Image Generation:", e);
            throw e;
        }
    }
};