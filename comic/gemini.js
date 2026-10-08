const SagaGemini = {
    /**
     * Limpia la cadena de texto devuelta por el modelo eliminando cercados de código Markdown (```json ... ```)
     * y sanitiza caracteres de control invisibles que rompen JSON.parse.
     */
    cleanJson(text) {
        if (!text) return "";
        let cleaned = String(text).trim();

        // 1. Eliminación de etiquetas de bloque Markdown de código
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        cleaned = cleaned.trim();

        // 2. Extrae el fragmento situado entre llaves o corchetes principales
        const firstCurly = cleaned.indexOf("{");
        const firstSquare = cleaned.indexOf("[");
        let firstBracket = -1;

        if (firstCurly !== -1 && firstSquare !== -1) {
            firstBracket = Math.min(firstCurly, firstSquare);
        } else if (firstCurly !== -1) {
            firstBracket = firstCurly;
        } else if (firstSquare !== -1) {
            firstBracket = firstSquare;
        }

        const lastCurly = cleaned.lastIndexOf("}");
        const lastSquare = cleaned.lastIndexOf("]");
        const lastBracket = Math.max(lastCurly, lastSquare);

        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        }

        cleaned = cleaned.trim();

        // 3. Sanitización de caracteres de control invisibles dentro de cadenas de texto JSON
        cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
            if (match === '\n') return '\\n';
            if (match === '\r') return '\\r';
            if (match === '\t') return '\\t';
            return '';
        });

        return cleaned;
    },

    async generateText(promptText, retries = 3) {
        const apiKey = document.getElementById('gemini-api-key')?.value.trim() || localStorage.getItem('koreh_gemini_book_api_key') || '';
        if (!apiKey) throw new Error("Configura la API Key de Gemini en el panel izquierdo.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const body = { contents: [{ parts: [{ text: promptText }] }] };

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    if (response.status === 429 && attempt < retries) {
                        let waitSec = 45;
                        try {
                            const parsed = JSON.parse(errText);
                            const retryInfo = parsed.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                            if (retryInfo?.retryDelay) {
                                waitSec = parseInt(retryInfo.retryDelay, 10) || 45;
                            }
                        } catch (e) {}
                        console.warn(`[Gemini API] Límite 429 alcanzado. Reintentando automáticamente en ${waitSec + 2}s (intento ${attempt + 1}/${retries})...`);
                        await new Promise(r => setTimeout(r, (waitSec + 2) * 1000));
                        continue;
                    }
                    throw new Error(`Error Gemini: ${response.status} - ${errText}`);
                }

                const json = await response.json();
                let textResult = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
                return this.cleanJson(textResult);
            } catch (err) {
                if (attempt === retries || !err.message.includes('429')) {
                    throw err;
                }
            }
        }
    },

    async generateMultimodal(promptText, base64Image, mimeType = "image/jpeg", retries = 3) {
        const apiKey = document.getElementById('gemini-api-key')?.value.trim() || localStorage.getItem('koreh_gemini_book_api_key') || '';
        if (!apiKey) throw new Error("Configura la API Key de Gemini en el panel izquierdo.");

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

        const body = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: cleanBase64
                        }
                    }
                ]
            }]
        };

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (!response.ok) {
                    const errText = await response.text();
                    if (response.status === 429 && attempt < retries) {
                        let waitSec = 45;
                        try {
                            const parsed = JSON.parse(errText);
                            const retryInfo = parsed.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
                            if (retryInfo?.retryDelay) {
                                waitSec = parseInt(retryInfo.retryDelay, 10) || 45;
                            }
                        } catch (e) {}
                        console.warn(`[Gemini API] Límite 429 alcanzado. Reintentando en ${waitSec + 2}s (intento ${attempt + 1}/${retries})...`);
                        await new Promise(r => setTimeout(r, (waitSec + 2) * 1000));
                        continue;
                    }
                    throw new Error(`Error Gemini: ${response.status} - ${errText}`);
                }

                const json = await response.json();
                let textResult = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
                return this.cleanJson(textResult);
            } catch (err) {
                if (attempt === retries || !err.message.includes('429')) {
                    throw err;
                }
            }
        }
    }
};

window.SagaGemini = SagaGemini;