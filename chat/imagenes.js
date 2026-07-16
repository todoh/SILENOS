/**
 * Pipeline de Genereación de Imágenes mediante Pollinations AI
 * Catálogo completo de modelos visuales incorporados con soporte de favoritos.
 */
export let MODELOS_IMAGEN = [];

/**
 * Recupera de forma dinámica el catálogo de modelos de imágenes de Pollinations AI
 * Ordena situando los modelos marcados como "free" (gratuitos) al principio.
 */
export async function fetchDynamicPollinationsImageModels() {
    try {
        const response = await fetch("https://gen.pollinations.ai/image/models");
        if (!response.ok) throw new Error("Error en la respuesta del servidor de modelos de imagen.");
        const data = await response.json();
        
        const models = data.map(m => {
            const name = m.name || m.id || m;
            const tag = m.id || m.name || m;
            return { name: name, tag: tag };
        });

        // Ordenación de gratis ("free") a premium
        models.sort((a, b) => {
            const aFree = a.name.toLowerCase().includes('free') || a.tag.toLowerCase().includes('free');
            const bFree = b.name.toLowerCase().includes('free') || b.tag.toLowerCase().includes('free');
            if (aFree && !bFree) return -1;
            if (!aFree && bFree) return 1;
            return a.name.localeCompare(b.name);
        });

        MODELOS_IMAGEN = models;
        return models;
    } catch (e) {
        console.error("No se pudieron sincronizar los modelos de imagen de Pollinations:", e);
        return [];
    }
}

/**
 * Genera una imagen a partir de un prompt y un modelo seleccionado.
 * Sube automáticamente las imágenes de referencia pesadas al almacenamiento de Pollinations.
 * @param {string} prompt - Texto descriptivo para la generación
 * @param {string} modelTag - Tag identificador del modelo en Pollinations
 * @param {string} apiKey - Clave de Pollinations (sk_ o pk_) para la transacción de pollen
 * @param {Array} attachments - Lista opcional de adjuntos para usar como imagen de entrada
 * @param {string} aspect - Formato de relación de aspecto ('1:1', '9:16', '16:9')
 * @returns {Promise<string>} Retorna un ObjectURL local con los datos binarios de la imagen
 */
export async function queryImageGeneration(prompt, modelTag, apiKey, attachments = [], aspect = '1:1') {
    if (!prompt) {
        throw new Error("Se requiere un prompt textual para generar la imagen.");
    }
    
    const encodedPrompt = encodeURIComponent(prompt);
    let url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=${modelTag}`;

    // Configuración minimalista de la resolución basada en la relación de aspecto elegida
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