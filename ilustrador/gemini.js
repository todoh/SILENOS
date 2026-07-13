const MODELO_COMPUTACIONAL = "gemini-3.1-flash-lite";

export async function llamarGemini(prompt, systemInstruction = "") {
    const apiKeyInput = document.getElementById('api-key');
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert("Por favor, introduce la Gemini API Key.");
        throw new Error("Falta API Key");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_COMPUTACIONAL}:generateContent?key=${apiKey}`;
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
        throw new Error(`Error API Gemini (${response.status}): ${errText}`);
    }

    const data = await response.json();
    try {
        return data.candidates[0].content.parts[0].text;
    } catch (e) {
        throw new Error("Estructura de respuesta no legible desde Gemini.");
    }
}

export function limpiarMarkdown(jsonCrudo) {
    return jsonCrudo.replace(/```json/gi, "").replace(/```/gi, "").trim();
}