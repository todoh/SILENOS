// SAGA MINI - CONECTOR DIRECTO GEMINI IA
window.Saga = window.Saga || {};

window.Saga.Gemini = {
    getApiKey() {
        return localStorage.getItem('koreh_gemini_book_api_key') || '';
    },

    async generateEntity(premise, category = "General") {
        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error("API Key de Gemini no configurada.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

        const systemInstruction = "Eres un arquitecto enciclopédico de worldbuilding. Devuelve strictly JSON puro sin bloques de código markdown.";
        const userPrompt = `Analiza la premisa: "${premise}". Categoría: "${category}".
Genera 1 elemento con la siguiente estructura exacta:
{
    "name": "Nombre conciso del elemento en español",
    "type": "${category}",
    "desc": "Descripción enciclopédica detallada en español",
    "visualDesc": "Detailed image generation prompt completely in ENGLISH describing physical appearance, lighting, and textures"
}`;

        const body = {
            contents: [
                { role: "user", parts: [{ text: `System Instructions: ${systemInstruction}` }] },
                { role: "model", parts: [{ text: "Entendido." }] },
                { role: "user", parts: [{ text: userPrompt }] }
            ],
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Error Gemini API: ${response.status} - ${await response.text()}`);
        }

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return JSON.parse(rawText);
    },

    async arrangeNodesGraph(items) {
        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error("API Key de Gemini no configurada.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

        const summaryData = items.map(item => ({
            id: item.id,
            name: item.data.name || "Sin nombre",
            type: item.data.type || "Dato",
            tags: item.data.tags || [],
            desc: (item.data.desc || "").substring(0, 100)
        }));

        const systemInstruction = "Eres un organizador visual de datos semánticos. Recibirás un array de elementos. Asigna a cada elemento coordenadas relativas 'x' e 'y' en un rango de -600 a 600 según sus conexiones semánticas y etiquetas. Devuelve estrictamente un objeto JSON clave-valor donde la clave sea la id del elemento y el valor sea {x, y}. Sin bloques de formato markdown.";

        const body = {
            contents: [
                { role: "user", parts: [{ text: `System Instructions: ${systemInstruction}` }] },
                { role: "model", parts: [{ text: "Entendido." }] },
                { role: "user", parts: [{ text: JSON.stringify(summaryData) }] }
            ],
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Error Gemini API: ${response.status}`);
        }

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return JSON.parse(rawText);
    },

    async translateTextToEnglish(text) {
        const apiKey = this.getApiKey();
        if (!apiKey) throw new Error("API Key de Gemini no configurada.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;

        const systemInstruction = "Eres un traductor experto especializado en prompts de generación de imágenes por IA. Traduce el texto facilitado al inglés manteniendo los detalles visuales, el estilo y las texturas. Devuelve estrictamente un objeto JSON con la clave 'translatedText'.";

        const body = {
            contents: [
                { role: "user", parts: [{ text: `System Instructions: ${systemInstruction}` }] },
                { role: "model", parts: [{ text: "Entendido." }] },
                { role: "user", parts: [{ text: text }] }
            ],
            generationConfig: { responseMimeType: "application/json" }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Error Gemini API: ${response.status}`);
        }

        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const parsed = JSON.parse(rawText);
        return parsed.translatedText || "";
    }
};