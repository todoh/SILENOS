/**
 * Pipeline de Generación de Imágenes mediante Pollinations AI y Google Gemini (Imagen 4)
 * Catálogo completo de modelos visuales incorporados con soporte de favoritos.
 */
import { writeFileToDirectory } from './conversations.js';
import { MODELOS_GEMINI } from './modelos.js';

export let MODELOS_IMAGEN = [];

/**
 * Recupera de forma dinámica el catálogo de modelos de imágenes de Pollinations AI
 * e integra los modelos de Imagen 4 de Gemini al inicio.
 */
export async function fetchDynamicPollinationsImageModels() {
    try {
        const response = await fetch("https://gen.pollinations.ai/image/models");
        if (!response.ok) throw new Error("Error en la respuesta del servidor de modelos de imagen.");
        const data = await response.json();
        
        const pollinationsModels = data.map(m => {
            const name = m.name || m.id || m;
            const tag = m.id || m.name || m;
            return { name: name, tag: tag, provider: 'pollinations' };
        });

        // Ordenación de gratis ("free") a premium para Pollinations
        pollinationsModels.sort((a, b) => {
            const aFree = a.name.toLowerCase().includes('free') || a.tag.toLowerCase().includes('free');
            const bFree = b.name.toLowerCase().includes('free') || b.tag.toLowerCase().includes('free');
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return a.name.localeCompare(b.name);
        });

        // Extraer los modelos de Imagen 4 definidos en Gemini
        const imagenGeminiModels = MODELOS_GEMINI.filter(m => m.isImageModel);

        // Unificar los modelos visuales (Imagen 4 primero)
        MODELOS_IMAGEN = [...imagenGeminiModels, ...pollinationsModels];
        return MODELOS_IMAGEN;
    } catch (e) {
        console.error("No se pudieron sincronizar los modelos de imagen:", e);
        const imagenGeminiModels = MODELOS_GEMINI.filter(m => m.isImageModel);
        MODELOS_IMAGEN = [...imagenGeminiModels];
        return MODELOS_IMAGEN;
    }
}

/**
 * Genera una imagen a partir de un prompt y un modelo seleccionado.
 * Soporta llamadas a la API de Pollinations AI o llamadas directas a Google Gemini API (Imagen 4).
 * @param {string} prompt - Texto descriptivo para la generación
 * @param {string} modelTag - Tag identificador del modelo (Pollinations o Gemini Imagen 4)
 * @param {string} apiKey - Clave API de la plataforma elegida o fallback
 * @param {Array} attachments - Lista opcional de adjuntos
 * @param {string} aspect - Formato de relación de aspecto ('1:1', '9:16', '16:9')
 * @param {string} geminiApiKey - Clave de Gemini explícita
 * @returns {Promise<string>} Retorna un ObjectURL local con los datos binarios de la imagen
 */
export async function queryImageGeneration(prompt, modelTag, apiKey, attachments = [], aspect = '1:1', geminiApiKey = '') {
    if (!prompt) {
        throw new Error("Se requiere un prompt textual para generar la imagen.");
    }

    // --- RAMA 1: GENERACIÓN VÍA GOOGLE GEMINI (IMAGEN 4) ---
    if (modelTag.startsWith('imagen-4.0')) {
        const keyToUse = geminiApiKey || apiKey;
        if (!keyToUse) {
            throw new Error("API Key de Google Gemini no detectada en la configuración.");
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelTag}:predict?key=${keyToUse}`;

        // Mapeo de relación de aspecto para Imagen 4 API
        let aspectRatioParam = "1:1";
        if (aspect === '9:16') aspectRatioParam = "9:16";
        else if (aspect === '16:9') aspectRatioParam = "16:9";

        const payload = {
            instances: [
                { prompt: prompt }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: aspectRatioParam,
                outputMimeType: "image/png"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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

    // --- RAMA 2: GENERACIÓN VÍA POLLINATIONS AI ---
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${modelTag}`;

    if (aspect === '9:16') {
        url += `&width=720&height=1280`;
    } else if (aspect === '16:9') {
        url += `&width=1280&height=720`;
    } else {
        url += `&width=1024&height=1024`;
    }

    if (apiKey) {
        url += `&key=${apiKey}`;
    }

    if (attachments && attachments.length > 0) {
        const firstImage = attachments.find(file => file.isImage);
        if (firstImage) {
            let imageReferenceUrl = firstImage.data;
            if (imageReferenceUrl.startsWith('data:')) {
                if (!apiKey) {
                    throw new Error("Se requiere configurar una API Key de Pollinations para subir imágenes de referencia.");
                }
                try {
                    const uploadResponse = await fetch("https://media.pollinations.ai/upload", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            data: firstImage.data,
                            contentType: firstImage.type || "image/png",
                            name: firstImage.name || "referencia.png"
                        })
                    });

                    if (!uploadResponse.ok) {
                        throw new Error(`No se pudo subir la imagen de referencia (Status: ${uploadResponse.status})`);
                    }

                    const uploadData = await uploadResponse.json();
                    const shortUrl = uploadData.url || uploadData.link || uploadData.id;
                    imageReferenceUrl = shortUrl.startsWith('http') ? shortUrl : `https://media.pollinations.ai/${shortUrl}`;
                } catch (uploadError) {
                    throw new Error(`Error en la carga de medios: ${uploadError.message}`);
                }
            }
            url += `&image=${encodeURIComponent(imageReferenceUrl)}`;
        }
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error en el Gateway de Imágenes Pollinations (Status: ${response.status})`);
    }

    const blob = await response.blob();
    const fileName = `imagen_${Date.now()}.png`;
    await writeFileToDirectory(fileName, blob);
    return URL.createObjectURL(blob);
}