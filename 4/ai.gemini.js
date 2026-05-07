// --- AI GEMINI OFFICIAL MODE (ai.gemini.js) ---
window.GeminiOfficialAI = {
    async generate({ prompt, system = "Eres un asistente experto.", temperature = 0.7, model = 'gemini-2.5-flash', history = [] }) {
        // Recuperar la llave desde el LocalStorage (ingresada en el Config-Window de Silenos 4)
        const apiKey = localStorage.getItem('google_api_key') || (window.parent && window.parent.googleapikey) || '';

        if (!apiKey) {
            throw new Error("Autenticación denegada: Configura tu API Key de Google Gemini en el panel de Sistema (CFG) de Silenos.");
        }

        // TRADUCCIÓN PROFUNDA DE MODELO: Aislamos los IDs del frontend a la API de Google.
        // El error 404 se produce si el ID enviado no existe en el catálogo de Google.
        let officialGoogleModel = 'gemini-2.5-flash'; // Valor seguro por defecto y existente

        if (model === 'gemini-large') {
            officialGoogleModel = 'gemini-1.5-pro'; // ID oficial de la versión Pro
        } else if (model === 'gemini-fast' || model === 'gemini-flash-lite-3.1' || model === 'gemini' || model === 'gemini-search') {
            officialGoogleModel = 'gemini-2.5-flash'; // Modelo rápido y existente en producción
        } else {
            // Validación de emergencia por si se inyecta un modelo desconocido
            officialGoogleModel = model.includes('gemini') ? model : 'gemini-2.5-flash';
        }

        // Utilizamos el endpoint de Google Gemini compatible con la estructura de OpenAI para máxima compatibilidad
        const url = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

        // Estructurar los mensajes basándonos en el historial
        const messages = history.map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
        }));

        if (system) {
            messages.unshift({ role: 'system', content: system });
        }

        messages.push({ role: 'user', content: prompt });

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: officialGoogleModel, // Inyectamos el ID oficial traducido y válido aquí
                    messages: messages,
                    temperature: temperature,
                    max_tokens: 8192
                })
            });

            if (!response.ok) {
                let errorMsg = response.statusText;
                try {
                    const errData = await response.json();
                    if (errData.error && errData.error.message) {
                        errorMsg = errData.error.message;
                    }
                } catch(e) { }

                throw new Error(`API de Gemini respondió con error: ${response.status} - ${errorMsg}`);
            }

            const data = await response.json();

            return {
                text: data.choices[0].message.content,
                usage: data.usage
            };

        } catch (e) {
            console.error("Fallo profundo en la capa GeminiOfficialAI:", e);
            throw e;
        }
    }
};