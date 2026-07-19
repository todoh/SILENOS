/**
 * AI CORE - Módulo de Configuración y Autenticación Central (Local/Híbrido/Pollinations/Gemini)
 * Espacio de nombres: window.Koreh.Core
 */
window.Koreh = window.Koreh || {};
window.Koreh.Core = {
    config: {
        ollamaUrl: 'http://127.0.0.1:11434/api',
        ollamaCloudUrl: localStorage.getItem('koreh_ollama_cloud_url') || 'http://127.0.0.1:11434/api',
        comfyUrl: 'http://127.0.0.1:8188',
        apiMode: localStorage.getItem('koreh_api_mode') || 'local' // 'local', 'pollinations' o 'gemini'
    },
    
    // Obtiene el token de autenticación del sistema o fallback de localStorage según el motor
    getAuthKey(targetMode = null) {
        if (window.parent && window.parent.SystemConfig && window.parent.SystemConfig.authKey) {
            return window.parent.SystemConfig.authKey;
        }
        if (window.SystemConfig && window.SystemConfig.authKey) {
            return window.SystemConfig.authKey;
        }
        
        const mode = targetMode || this.config.apiMode;
        if (mode === 'gemini') {
            return localStorage.getItem('koreh_gemini_book_api_key') || '';
        }
        
        return localStorage.getItem('pollinations_api_key') || localStorage.getItem('silenos_auth_key') || '';
    },
    
    // Inicializa o refresca los estados de configuración guardados
    syncConfig() {
        this.config.apiMode = localStorage.getItem('koreh_api_mode') || 'local';
        this.config.ollamaCloudUrl = localStorage.getItem('koreh_ollama_cloud_url') || 'http://127.0.0.1:11434/api';
    },
    
    // Conector clásico para la API nativa de Ollama Local
    async callOllamaAPI(modelName, prompt, isJsonMode, systemPrompt, signal = null) {
        const body = {
            model: modelName,
            prompt: prompt,
            stream: false,
            options: {
                temperature: isJsonMode ? 0.0 : 0.7
            }
        };
        if (systemPrompt) body.system = systemPrompt;
        if (isJsonMode) body.format = "json";
        
        const fetchOpts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        if (signal) fetchOpts.signal = signal;
        
        const res = await fetch(`${this.config.ollamaUrl}/generate`, fetchOpts);
        if (!res.ok) throw new Error(`Fallo en la API local de Ollama (Status: ${res.status})`);
        
        const json = await res.json();
        return json.response;
    },
    
    // Conector para la API remota de Ollama en la Nube
    async callOllamaCloudAPI(modelName, prompt, isJsonMode, systemPrompt, signal = null) {
        const body = {
            model: modelName,
            prompt: prompt,
            stream: false,
            options: {
                temperature: isJsonMode ? 0.0 : 0.7
            }
        };
        if (systemPrompt) body.system = systemPrompt;
        if (isJsonMode) body.format = "json";
        
        const fetchOpts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        if (signal) fetchOpts.signal = signal;
        
        const res = await fetch(`${this.config.ollamaCloudUrl}/generate`, fetchOpts);
        if (!res.ok) throw new Error(`Fallo en la API Cloud de Ollama Remoto (Status: ${res.status})`);
        
        const json = await res.json();
        return json.response;
    },
    
    // Nuevo Conector para la API de Chat Completions de Pollinations
    async callPollinationsAPI(modelName, prompt, isJsonMode, systemPrompt, signal = null) {
        const authKey = this.getAuthKey('pollinations');
        const headers = { 'Content-Type': 'application/json' };
        if (authKey) headers['Authorization'] = `Bearer ${authKey}`;
        
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt + (isJsonMode ? "\nOutput strictly valid pure JSON raw format without codeblocks." : "") });
        
        const body = {
            model: modelName,
            messages: messages,
            temperature: isJsonMode ? 0.1 : 0.6
        };
        
        const fetchOpts = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };
        if (signal) fetchOpts.signal = signal;
        
        const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', fetchOpts);
        if (!res.ok) throw new Error(`Fallo en la API de Pollinations (Status: ${res.status} - ${await res.text()})`);
        
        const json = await res.json();
        return json.choices[0].message.content;
    },

    // Nuevo Conector Global Nativo para la API Directa de Google Gemini
    async callGeminiDirectAPI(modelName, prompt, isJsonMode, systemPrompt, signal = null) {
        const apiKey = this.getAuthKey('gemini');
        if (!apiKey) throw new Error("API Key de Gemini no configurada en los parámetros globales.");
        
        const model = modelName || "gemini-3.1-flash-lite"; 
        let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        
        let finalUserPrompt = prompt;
        if (isJsonMode) {
            finalUserPrompt += "\nOutput strictly valid pure JSON raw format without codeblocks.";
        }
        
        const contents = [];
        if (systemPrompt) {
            contents.push({ role: "user", parts: [{ text: `System Instructions: ${systemPrompt}` }] });
            contents.push({ role: "model", parts: [{ text: "Understood." }] });
        }
        contents.push({ role: "user", parts: [{ text: finalUserPrompt }] });
        
        const body = { contents: contents };
        if (isJsonMode) {
            body.generationConfig = {
                responseMimeType: "application/json"
            };
        }
        
        const fetchOpts = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };
        if (signal) fetchOpts.signal = signal;
        
        const res = await fetch(url, fetchOpts);
        if (!res.ok) throw new Error(`Fallo en la API Directa de Gemini (Status: ${res.status} - ${await res.text()})`);
        
        const json = await res.json();
        return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
};