/**
 * AI CORE - Módulo de Configuración y Autenticación Central
 * Espacio de nombres: window.Koreh.Core
 */

window.Koreh = window.Koreh || {};

window.Koreh.Core = {
    config: {
        textBaseUrl: 'https://gen.pollinations.ai/v1/chat/completions',
        imageBaseUrl: 'https://gen.pollinations.ai/image/',
        defaultTextModel: 'openai-large',
        defaultImageModel: 'flux'
    },

    // Obtiene la API Key del sistema padre (Silenos) o localStorage local
    getAuthKey() {
        // 1. Intentar desde Silenos (window.parent)
        if (window.parent && window.parent.SystemConfig && window.parent.SystemConfig.authKey) {
            return window.parent.SystemConfig.authKey;
        }
        // 2. Intentar desde variable global local (fallback)
        if (window.SystemConfig && window.SystemConfig.authKey) {
            return window.SystemConfig.authKey;
        }
        // 3. Intentar localStorage (fallback para desarrollo standalone)
        return localStorage.getItem('pollinations_api_key');
    },

    // Wrapper central para fetch con manejo de errores
    async fetchWrapper(url, options = {}) {
        const apiKey = this.getAuthKey();
        
        if (!apiKey) {
            throw new Error("KOREH_AUTH_ERROR: Falta API Key. Conecta Silenos.");
        }

        // Inyectar Authorization si no existe
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${apiKey}`;
        options.headers['Content-Type'] = 'application/json';

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error (${response.status}): ${errorText}`);
            }

            return response;
        } catch (error) {
            console.error("Koreh AI Network Error:", error);
            throw error; // Re-lanzar para manejo en UI
        }
    }
};