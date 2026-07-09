const MODELO_computacional = "gemini-3.1-flash-lite";

/**
 * Realiza una llamada directa a la API de Gemini.
 * @param {string} prompt - El texto principal de la solicitud.
 * @param {string} systemInstruction - Directrices del sistema para el comportamiento del modelo.
 * @param {string} apiKey - La clave de API proporcionada por el usuario.
 * @returns {Promise<string>} La respuesta de texto limpia del modelo.
 */
async function llamarGemini(prompt, systemInstruction = "", apiKey) {
    if (!apiKey) {
        alert("Es necesario introducir la clave Gemini API Key.");
        throw new Error("Falta API Key");
    }
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_computacional}:generateContent?key=${apiKey}`;
    const cuerpo = { contents: [{ parts: [{ text: prompt }] }] };
    if (systemInstruction) {
        cuerpo.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Error API (${response.status}): ${errText}`);
    }

    const data = await response.json();
    try {
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        throw new Error("Respuesta inválida o nula del ecosistema Gemini.");
    }
}