// imagenes.js
// Pipeline de Generación de Imágenes mediante Google Gemini (Imagen 4)
import { writeFileToDirectory } from './conversations.js';
import { MODELOS_GEMINI } from './modelos.js';

export let MODELOS_IMAGEN = [];

export async function fetchDynamicImageModels() {
    const imagenGeminiModels = MODELOS_GEMINI.filter(m => m.isImageModel);
    MODELOS_IMAGEN = [...imagenGeminiModels];
    return MODELOS_IMAGEN;
}

/**
 * Genera una imagen a partir de un prompt utilizando la API de Google Gemini (Imagen 4).
 * @param {string} prompt - Texto descriptivo para la generación
 * @param {string} modelTag - Tag identificador del modelo Gemini Imagen 4
 * @param {string} apiKey - Clave API de Gemini
 * @param {Array} attachments - Lista opcional de adjuntos
 * @param {string} aspect - Formato de relación de aspecto ('1:1', '9:16', '16:9')
 * @returns {Promise<string>} Retorna un ObjectURL local con los datos binarios de la imagen
 */
export async function queryImageGeneration(prompt, modelTag, apiKey, attachments = [], aspect = '1:1') {
    if (!prompt) {
        throw new Error("Se requiere un prompt textual para generar la imagen.");
    }
    if (!apiKey) {
        throw new Error("API Key de Google Gemini no detectada en la configuración.");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelTag}:predict?key=${apiKey}`;

    let aspectRatioParam = "1:1";
    if (aspect === '9:16') aspectRatioParam = "9:16";
    else if (aspect === '16:9') aspectRatioParam = "16:9";

    const payload = {
        instances: [{ prompt: prompt }],
        parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatioParam,
            outputMimeType: "image/png"
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errDetails = await response.text();
        throw new Error(`Google Imagen 4 API Error (Status: ${response.status}): ${errDetails}`);
    }

    const data = await response.json();

    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
        const base64Data = data.predictions[0].bytesBase64Encoded;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const fileName = `imagen_${Date.now()}.png`;
        await writeFileToDirectory(fileName, blob);
        return URL.createObjectURL(blob);
    }

    throw new Error("La estructura de respuesta de Imagen 4 no contiene datos de imagen válidos.");
}