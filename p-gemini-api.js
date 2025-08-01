async function pCallGeminiApi(prompt, modelName, expectJson = false) {
    const outputDiv = document.getElementById('p-output');
    
    // La variable 'apiKey' debe estar disponible globalmente (definida en gemini.js)
    if (typeof apiKey === 'undefined' || !apiKey) {
        const errorMsg = "Error Crítico: La API Key de Google no está configurada.";
        console.error(errorMsg);
        if (outputDiv) outputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
        return null;
    }

    if (!prompt) {
        if (outputDiv) outputDiv.innerHTML += `<p style="color: orange;">Advertencia: El prompt para la IA está vacío.</p>`;
        return null;
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{
            parts: [{ text: prompt }]
        }]
    };

    // Si se espera un JSON, se añade la configuración específica.
    if (expectJson) {
        payload.generationConfig = {
            response_mime_type: "application/json"
        };
    }

    try {
        if (outputDiv) outputDiv.innerHTML += `<p>⏳ Llamando a ${modelName}...</p>`;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorDetails = responseData.error?.message || JSON.stringify(responseData);
            throw new Error(`Error en la respuesta de la API: ${errorDetails}`);
        }

        const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (typeof textResponse !== 'string') {
            throw new Error("La API no devolvió una respuesta de texto válida.");
        }
        
        if (outputDiv) outputDiv.innerHTML += `<p>✅ Respuesta recibida de ${modelName}.</p>`;

        // Si se esperaba JSON, se intenta parsear. Si no, se devuelve el texto.
        return expectJson ? JSON.parse(textResponse) : textResponse;

    } catch (error) {
        console.error(`Error al llamar a la API de Gemini: ${error.message}`, error);
        if (outputDiv) outputDiv.innerHTML += `<p style="color: red;">❌ Fallo en la llamada a ${modelName}: ${error.message}</p>`;
        return null; // Devuelve null para que el flujo pueda manejar el error.
    }
}