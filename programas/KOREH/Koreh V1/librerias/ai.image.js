/**
 * AI IMAGE - Módulo de Generación de Imágenes
 * Dependencia: ai.core.js
 * Espacio de nombres: window.Koreh.Image
 */

window.Koreh = window.Koreh || {};

window.Koreh.Image = {

    generate: async function(prompt, config = {}) {
        // Aseguramos que Core existe
        if (!window.Koreh.Core) throw new Error("Koreh.Core no cargado.");
        
        const apiKey = window.Koreh.Core.getAuthKey();
        if (!apiKey) throw new Error("KOREH_AUTH_ERROR: Falta API Key.");

        const width = config.width || 1024;
        const height = config.height || 1024;
        const model = config.model || window.Koreh.Core.config.defaultImageModel;
        const seed = config.seed || Math.floor(Math.random() * 999999);
        const nologo = config.nologo !== false; // Default true

        const safePrompt = encodeURIComponent(prompt);
        
        // Construcción de URL
        const url = `${window.Koreh.Core.config.imageBaseUrl}${safePrompt}?model=${model}&width=${width}&height=${height}&seed=${seed}&nologo=${nologo}&key=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("AI_IMAGE_ERROR: Fallo al generar imagen.");
            
            const blob = await response.blob();
            
            // Si piden Base64, convertimos aquí
            if (config.returnType === 'base64') {
                return await this.blobToBase64(blob);
            }
            
            return blob; // Por defecto devuelve Blob
        } catch (error) {
            console.error("Koreh Image Error:", error);
            throw error;
        }
    },

    blobToBase64: function(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
};