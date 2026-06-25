/**
 * AI CORE - Módulo de Configuración y Autenticación Central (Local/Híbrido/Pollinations)
 * Espacio de nombres: window.Koreh.Core
 */

window.Koreh = window.Koreh || {};

window.Koreh.Core = {
    config: {
        ollamaUrl: 'http://127.0.0.1:11434/api',
        ollamaCloudUrl: localStorage.getItem('koreh_ollama_cloud_url') || 'http://127.0.0.1:11434/api',
        comfyUrl: 'http://127.0.0.1:8188',
        apiMode: localStorage.getItem('koreh_api_mode') || 'local' // 'local' o 'pollinations'
    },

    // Obtiene el token de autenticación del sistema o fallback de localStorage
    getAuthKey() {
        if (window.parent && window.parent.SystemConfig && window.parent.SystemConfig.authKey) {
            return window.parent.SystemConfig.authKey;
        }
        if (window.SystemConfig && window.SystemConfig.authKey) {
            return window.SystemConfig.authKey;
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
        const authKey = this.getAuthKey();
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
    }
};