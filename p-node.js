// --- Lógica de la API de IA (CORREGIDA) ---
// Esta función encapsula la llamada a la API de generación de imágenes.
async function pGenerarImagenIA(prompt, outputDiv) {
    if (typeof apiKey === 'undefined' || !apiKey) {
        const errorMsg = "Error: La API Key de Google no está configurada.";
        console.error(errorMsg);
        outputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
        return null;
    }

    outputDiv.innerHTML += `<p>🖼️ Enviando petición a la IA para generar: "${prompt}"...</p>`;

    const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    const payload = {
        "contents": [{
            "parts": [
                { "text": `Crea una ilustración cinematográfica de alta calidad para la siguiente escena: "${prompt}". Formato 16:9. No incluyas texto en la imagen.` },
                { "inlineData": { "mimeType": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
            ]
        }],
        "generationConfig": { "responseModalities": ["TEXT", "IMAGE"] },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error?.message || "Error desconocido de la API.");
        }

        const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart?.inlineData?.data) {
            const imageDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            outputDiv.innerHTML += `<p>✅ Imagen recibida. Mostrando...</p><img src="${imageDataUrl}" style="max-width: 100%; border-radius: 5px; margin-top: 10px;" alt="Imagen generada por IA">`;
           if (typeof archivarImagenComoDato === 'function') {
                archivarImagenComoDato(imageDataUrl);
            }
            return imageDataUrl;
        } else {
            const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen en la respuesta.";
            throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
        }

    } catch (error) {
        console.error("Error en pGenerarImagenIA:", error);
        outputDiv.innerHTML += `<p style="color: red;">❌ Fallo al generar la imagen: ${error.message}</p>`;
        return null;
    }
}

 
// Definiciones de los tipos de nodos
const pNodeDefinitions = {
    // --- NUEVO NODO ---
    initiator: {
        title: '🚀 Iniciador',
        inputs: 0, // No tiene entradas, es un punto de partida.
        outputs: 1,
        content: `<span>Punto de inicio de la ejecución.</span>`,
        process: () => {
            // Envía una señal 'true' para activar el siguiente nodo.
            return true;
        }
    },
    // --- NODO MODIFICADO ---
    text_variable: {
        title: '📝 Variable de Texto',
        inputs: 1, // Ahora necesita una señal para activarse.
        outputs: 1,
        content: `<input type="text" data-save="value" placeholder="Escribe algo..." value="un perro con un sombrero">`,
        process: (pNode, pInputs) => {
            // Cuando se activa, ignora la señal de entrada y devuelve su propio valor.
            return pNode.element.querySelector('input').value;
        }
    },
    // --- NUEVO NODO ---
    await_delay: {
        title: '⏳ Esperar (Await)',
        inputs: 1,
        outputs: 1,
        content: `<span>Retrasar señal por: </span><input type="number" data-save="delay" value="1000" style="width: 60px;"> ms`,
        process: async (pNode, pInputs) => {
            const inputValue = pInputs[0];
            const delay = parseInt(pNode.element.querySelector('input[data-save="delay"]').value, 10) || 1000;
            
            // Pausa la ejecución por el tiempo especificado.
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Después de la pausa, deja pasar el valor original.
            return inputValue;
        }
    },
    uppercase: {
        title: 'Abc ➜ ABC',
        inputs: 1,
        outputs: 1,
        content: `<span>Convierte el texto a mayúsculas.</span>`,
        process: (pNode, pInputs) => pInputs[0] ? String(pInputs[0]).toUpperCase() : ''
    },
    suffix: {
        title: 'Añadir Sufijo',
        inputs: 1,
        outputs: 1,
        content: `<input type="text" data-save="value" placeholder="Sufijo..." value="!">`,
        process: (pNode, pInputs) => {
            const pSuffix = pNode.element.querySelector('input').value;
            return pInputs[0] ? `${pInputs[0]}${pSuffix}` : pSuffix;
        }
    },
    log: {
        title: '➜ Mostrar Resultado',
        inputs: 1,
        outputs: 0,
        content: `<span>Muestra la entrada en el panel de salida.</span>`,
        process: (pNode, pInputs) => {
            const pOutputDiv = document.getElementById('p-output');
            const pLogMessage = `[${pNode.id}]: ${pInputs[0] || 'N/A'}\n`;
            pOutputDiv.innerHTML += `<p>${pLogMessage}</p>`;
        }
    },
    generacion_imagen: {
        title: '🖼️ Generación de Imagen',
        inputs: 1,
        outputs: 1,
        content: `<input type="text" data-save="prompt" placeholder="Añadir contexto o estilo (ej: foto realista)">`,
        process: async (pNode, pInputs) => {
            const pOutputDiv = document.getElementById('p-output');
            const promptContexto = pNode.element.querySelector('input[data-save="prompt"]').value.trim();
            const promptsEntrada = pInputs[0];

            if (!promptsEntrada || typeof promptsEntrada !== 'string') {
                pOutputDiv.innerHTML += `<p style="color: orange;">Advertencia: El nodo de Generación de Imagen necesita una cadena de texto en su entrada.</p>`;
                return null;
            }
            
            const promptsIndividuales = promptsEntrada.split('@').map(p => p.trim()).filter(p => p.length > 0);
            
            if (promptsIndividuales.length === 0) {
                pOutputDiv.innerHTML += `<p style="color: orange;">Advertencia: La entrada no contenía prompts válidos.</p>`;
                return null;
            }

            pOutputDiv.innerHTML += `<p>🚀 Lanzando ${promptsIndividuales.length} peticiones de imagen en paralelo...</p>`;
            
            const promesasDeImagenes = promptsIndividuales.map(prompt => {
                const promptFinal = `${prompt} ${promptContexto}`.trim();
                return pGenerarImagenIA(promptFinal, pOutputDiv);
            });
            
            const urlsDeImagenes = await Promise.all(promesasDeImagenes);
            
            return urlsDeImagenes.filter(url => url);
        }
    }
};