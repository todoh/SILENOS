/**
 * Pipeline de Generación de Imágenes mediante Pollinations AI
 * Catálogo completo de modelos visuales incorporados con soporte de favoritos.
 */
export const MODELOS_IMAGEN = [
    { name: "Flux Schnell", tag: "flux" },
    { name: "Z-Image Turbo", tag: "zimage" },
    { name: "Pruna p-image", tag: "p-image" },
    { name: "GPT Image 1 Mini", tag: "gptimage" },
    { name: "FLUX.2 Klein 4B", tag: "klein" },
    { name: "Pruna p-image-edit", tag: "p-image-edit" },
    { name: "Grok Imagine", tag: "grok-imagine" },
    { name: "Seedream 4.0", tag: "seedream" },
    { name: "Ideogram 4.0 Turbo", tag: "ideogram-v4-turbo" },
    { name: "Wan 2.7 Image Pro", tag: "wan-image-pro" },
    { name: "Qwen Image Plus", tag: "qwen-image" },
    { name: "Wan 2.7 Image", tag: "wan-image" },
    { name: "NanoBanana 2 Lite", tag: "nanobanana-2-lite" },
    { name: "Seedream 5.0 Lite", tag: "seedream5" },
    { name: "NanoBanana", tag: "nanobanana" },
    { name: "Seedream 4.5 Pro", tag: "seedream-pro" },
    { name: "Nova Canvas", tag: "nova-canvas" },
    { name: "FLUX.1 Kontext", tag: "kontext" },
    { name: "GPT Image 2", tag: "gpt-image-2" },
    { name: "Grok Imagine Pro", tag: "grok-imagine-pro" },
    { name: "GPT Image 1.5", tag: "gptimage-large" },
    { name: "NanoBanana 2", tag: "nanobanana-2" },
    { name: "Seedream 5.0 Pro", tag: "seedream5-pro" },
    { name: "Ideogram 4.0 Quality", tag: "ideogram-v4-quality" },
    { name: "NanoBanana Pro", tag: "nanobanana-pro" },
    { name: "Ideogram 4.0 Balanced", tag: "ideogram-v4-balanced" }
];

/**
 * Genera una imagen a partir de un prompt y un modelo seleccionado.
 * Sube automáticamente las imágenes de referencia pesadas al almacenamiento de Pollinations.
 * @param {string} prompt - Texto descriptivo para la generación
 * @param {string} modelTag - Tag identificador del modelo en Pollinations
 * @param {string} apiKey - Clave de Pollinations (sk_ o pk_) para la transacción de pollen
 * @param {Array} attachments - Lista opcional de adjuntos para usar como imagen de entrada
 * @returns {Promise<string>} Retorna un ObjectURL local con los datos binarios de la imagen
 */
export async function queryImageGeneration(prompt, modelTag, apiKey, attachments = []) {
    if (!prompt) {
        throw new Error("Se requiere un prompt textual para generar la imagen.");
    }
    
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${modelTag}`;

    if (apiKey) {
        url += `&key=${apiKey}`;
    }

    // Buscar la primera imagen adjunta en cola para utilizar como referencia (Image-to-Image / Edición)
    if (attachments && attachments.length > 0) {
        const firstImage = attachments.find(file => file.isImage);
        if (firstImage) {
            let imageReferenceUrl = firstImage.data;

            // Si es un Data URL en Base64, lo subimos al Media Storage de Pollinations para obtener una URL corta
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
                    // Resolvemos la URL corta retornada por el CDN de Pollinations
                    const shortUrl = uploadData.url || uploadData.link || uploadData.id;
                    imageReferenceUrl = shortUrl.startsWith('http') ? shortUrl : `https://media.pollinations.ai/${shortUrl}`;
                } catch (uploadError) {
                    throw new Error(`Error en la carga de medios: ${uploadError.message}`);
                }
            }

            // Añadimos de forma segura la URL corta de la imagen al parámetro de consulta
            url += `&image=${encodeURIComponent(imageReferenceUrl)}`;
        }
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error en el Gateway de Imágenes Pollinations (Status: ${response.status})`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}