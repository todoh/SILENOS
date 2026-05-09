// --- AI GEMINI OFFICIAL MODE (ai.gemini.js) ---
window.GeminiOfficialAI = {
    async generate({ prompt, system = "Eres un asistente experto.", temperature = 0.7, model = 'gemini-2.5-flash', history = [] }) {
        // Recuperar la llave desde el LocalStorage (ingresada en el Config-Window de Silenos 4)
        const apiKey = localStorage.getItem('google_api_key') || (window.parent && window.parent.googleapikey) || '';

        if (!apiKey) {
            throw new Error("Autenticación denegada: Configura tu API Key de Google Gemini en el panel de Sistema (CFG) de Silenos.");
        }

        // TRADUCCIÓN PROFUNDA DE MODELO: Aislamos los IDs del frontend a la API de Google.
        let officialGoogleModel = 'gemini-2.5-flash'; // Valor seguro por defecto

        const modelMapping = {
            'gemini-large': 'gemini-1.5-pro',
            'gemini-fast': 'gemini-2.5-flash',
            'gemini-flash-lite-3.1': 'gemini-2.5-flash',
            'gemini': 'gemini-2.5-flash',
            'gemini-search': 'gemini-2.5-flash',
            'gemma-4-26b-a4b-it': 'gemini-2.5-flash',
            'gemma-4-31b': 'gemini-2.5-flash',
            'gemma-3-27b': 'gemini-2.5-flash',
            'gemini-3.1-flash-lite-preview': 'gemini-2.5-flash'
        };

        if (modelMapping[model]) {
            officialGoogleModel = modelMapping[model];
        } else if (model.includes('1.5-pro') || model.includes('2.5-flash') || model.includes('2.0-flash')) {
            officialGoogleModel = model;
        }

        // CONEXIÓN NATIVA PROFUNDA: Usamos el endpoint oficial de Gemini (evita errores CORS del wrapper de OpenAI)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${officialGoogleModel}:generateContent?key=${apiKey}`;

        // Estructuración nativa estricta (Gemini exige alternancia perfecta de roles)
        const geminiContents = [];
        let lastRole = null;

        if (history && history.length > 0) {
            history.forEach(m => {
                let currentRole = m.role === 'user' ? 'user' : 'model'; // Gemini usa 'model', no 'assistant'
                
                if (currentRole === lastRole) {
                    // Evita el colapso 400 Bad Request si hay dos mensajes seguidos del mismo rol
                    geminiContents[geminiContents.length - 1].parts[0].text += `\n\n${m.content}`;
                } else {
                    geminiContents.push({
                        role: currentRole,
                        parts: [{ text: m.content }]
                    });
                    lastRole = currentRole;
                }
            });
        }

        // Incorporar el prompt final asegurando la alternancia
        if (lastRole === 'user') {
            geminiContents[geminiContents.length - 1].parts[0].text += `\n\n${prompt}`;
        } else {
            geminiContents.push({
                role: 'user',
                parts: [{ text: prompt }]
            });
        }

        const requestBody = {
            contents: geminiContents,
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 8192
            }
        };

        // El prompt de sistema nativo tiene su propia estructura en Gemini
        if (system) {
            requestBody.systemInstruction = {
                parts: [{ text: system }]
            };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // Eliminamos el Authorization Bearer; la key va en la URL. Esto soluciona la conexión.
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (!response.ok) {
                let errorMsg = data.error?.message || response.statusText;
                throw new Error(`API Nativa de Gemini rechazó la petición: ${response.status} - ${errorMsg}`);
            }

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("Respuesta vacía de Gemini (posible bloqueo de seguridad).");
            }

            return {
                text: data.candidates[0].content.parts[0].text,
                usage: data.usageMetadata ? { total_tokens: data.usageMetadata.totalTokenCount } : { total_tokens: 'N/A' }
            };

        } catch (e) {
            console.error("Fallo profundo en la capa GeminiOfficialAI:", e);
            throw e;
        }
    }
};