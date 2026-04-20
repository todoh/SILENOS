/**
 * AI CORE - Módulo de Conexión y Generación
 * Mantiene la compatibilidad con el ecosistema Silenos/Koreh
 */
window.Koreh = window.Koreh || {};

window.Koreh.Core = {
    config: {
        textBaseUrl: 'https://gen.pollinations.ai/v1/chat/completions',
        defaultTextModel: 'gemini-fast'
    },

    getAuthKey() {
        if (window.parent && window.parent.SystemConfig && window.parent.SystemConfig.authKey) {
            return window.parent.SystemConfig.authKey;
        }
        if (window.SystemConfig && window.SystemConfig.authKey) {
            return window.SystemConfig.authKey;
        }
        return localStorage.getItem('pollinations_api_key');
    },

    async fetchWrapper(url, options = {}) {
        const apiKey = this.getAuthKey();
        
        if (!options.headers) options.headers = {};
        if (apiKey) options.headers['Authorization'] = `Bearer ${apiKey}`;
        options.headers['Content-Type'] = 'application/json';

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }
            return response;
        } catch (error) {
            console.error("AI Network Error:", error);
            throw error;
        }
    }
};

window.Koreh.Text = {
    cleanJSON(str) {
        if (!str) return "";
        let clean = str.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstOpen = clean.indexOf('{');
        const firstArr = clean.indexOf('[');
        const first = (firstOpen > -1 && firstArr > -1) ? Math.min(firstOpen, firstArr) : Math.max(firstOpen, firstArr);
        const lastClose = clean.lastIndexOf('}');
        const lastArr = clean.lastIndexOf(']');
        const last = Math.max(lastClose, lastArr);

        if (first !== -1 && last !== -1) {
            clean = clean.substring(first, last + 1);
        }
        clean = clean.replace(/,\s*([\]}])/g, '$1');
        return clean;
    },

    async generate(systemPrompt, userPrompt, config = {}) {
        const model = config.model || window.Koreh.Core.config.defaultTextModel;
        const temperature = config.temperature ?? 0.7;
        const jsonMode = config.jsonMode || false;

        const body = {
            model: model,
            temperature: temperature,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        };

        if (jsonMode) {
            if (!body.messages[0].content.toLowerCase().includes("json")) {
                body.messages[0].content += " RESPOND ONLY IN STRICT JSON.";
            }
            body.response_format = { type: "json_object" };
        }

        const response = await window.Koreh.Core.fetchWrapper(
            window.Koreh.Core.config.textBaseUrl, 
            { method: 'POST', body: JSON.stringify(body) }
        );

        const data = await response.json();
        let content = data.choices[0].message.content;

        if (jsonMode) {
            try {
                const cleaned = this.cleanJSON(content);
                return JSON.parse(cleaned);
            } catch (e) {
                throw new Error("Fallo al parsear JSON devuelto por la IA.");
            }
        }
        return content;
    }
};