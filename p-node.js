/**
 * Orchestrates a complete data generation pipeline.
 * 1. Takes a user's request and asks a text AI to create structured data (name, description, visual prompt).
 * 2. For each generated data profile, it calls the 'ultras' function to create a high-quality, transparent-background image.
 * 3. Combines the data and the image and adds it to the application.
 *
 * @param {string} peticionUsuario - A simple text request from the user (e.g., "three fantasy characters").
 * @returns {Promise<string>} A summary message of the operation.
 */
async function generarDatosConImagenAvanzada(peticionUsuario) {
    // We can use the output panel from the Programador tab if it exists
    const pOutputDiv = document.getElementById('p-output') || document.createElement('div');

    if (!peticionUsuario || typeof peticionUsuario !== 'string') {
        const errorMsg = "Error: The request for the Data Generator cannot be empty.";
        pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
        return errorMsg;
    }

    // Check for required global functions, as seen in your p-node.js
    if (typeof agregarPersonajeDesdeDatos === 'undefined') {
        const errorMsg = "Critical Error: The function 'agregarPersonajeDesdeDatos' is not available globally.";
        console.error(errorMsg);
        pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
        return errorMsg;
    }

    pOutputDiv.innerHTML += `<p><strong>Advanced Generator:</strong> Starting creative pipeline...</p>`;

    try {
        // --- STEP 1: GENERATE STRUCTURED TEXT DATA ---
        // This part is adapted from your 'generador_datos' node logic.
        const promptGeneracion = `
            Based on the following request, creatively generate a list of one or more structured data entries.
            User Request: "${peticionUsuario}"

            Instructions:
            - For EACH entry, provide: "nombre", "descripcion", and a "promptVisual" (a detailed description for generating a unique image of the entry).
            - The "promptVisual" must be very specific for repeatable results. Sin fondos. Solo el personaje o el objeto detallado. If it's a person, describe their morphology, facial features, and clothing in detail.
            
            Required Output Format: Respond ONLY with a valid JSON object that is an array of entries. Each object in the array must have the complete structure:
            { "nombre": "...", "descripcion": "...", "promptVisual": "..." }
        `;
        
        pOutputDiv.innerHTML += `<p>🧠 Generating textual data for: "${peticionUsuario}"</p>`;
        // This helper function calls the text model (its code is in the dependencies section below)
        let datosGenerados = await pLlamarIAGenerica(promptGeneracion, "gemini-2.5-flash");
 
        // Ensure the response is an array
        if (!Array.isArray(datosGenerados)) {
            if (typeof datosGenerados === 'object' && datosGenerados !== null) {
                datosGenerados = [datosGenerados]; // Handle cases where the AI returns a single object instead of an array
            } else {
                throw new Error("The AI did not return a valid array of data objects.");
            }
        }

        // --- STEP 2: GENERATE ADVANCED IMAGE FOR EACH DATA ENTRY ---
        pOutputDiv.innerHTML += `<p>✅ Generated ${datosGenerados.length} data profiles. Now generating advanced images for each...</p>`;
        let totalCreados = 0;

        for (const dato of datosGenerados) {
            if (!dato.nombre || !dato.descripcion || !dato.promptVisual) continue;
            
            pOutputDiv.innerHTML += `<hr><p>➡️ Processing: <strong>${dato.nombre}</strong></p>`;
            pOutputDiv.innerHTML += `<p>🖼️ Generating advanced image with prompt: "${dato.promptVisual}"</p>`;

            // **THIS IS THE KEY CHANGE**: We call 'ultras' instead of the simpler image generator.
            const resultadoImagen = await ultras(dato.promptVisual);

            // Combine the generated data with the new image URL
            const datosCompletos = {
                ...dato, // Includes nombre, descripcion, promptVisual
                imagen: resultadoImagen.error ? '' : resultadoImagen.imagen, // Use the image from ultras, or empty if error
                etiqueta: dato.etiqueta || 'indeterminado', // Add a default tag if missing
                svgContent: null // 'ultras' does not produce SVG
            };

            // Add the final, complete data object to the application
            agregarPersonajeDesdeDatos(datosCompletos);
            pOutputDiv.innerHTML += `<p style="color: green; font-weight: bold;">✔️ Data "${dato.nombre}" created and added to the application.</p>`;
            totalCreados++;
        }

        const successMsg = `Process complete. ${totalCreados} new data entries were created with advanced images.`;
        pOutputDiv.innerHTML += `<hr><p style="font-weight: bold;">${successMsg}</p>`;
        return successMsg;

    } catch (error) {
        const errorMsg = `The generation process failed: ${error.message}`;
        pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
        return errorMsg;
    }
}
/**
 * --- VERSIÓN EDITADA CON REINTENTOS Y PAYLOAD MEJORADO ---
 * Llama a la API de generación de imágenes con archivado opcional y lógica de reintentos.
 * @param {string} prompt - El prompt para la imagen.
 * @param {HTMLElement} outputDiv - El panel de salida para los logs.
 * @param {boolean} [archivar=true] - Si es true, guarda la imagen como un dato visual separado.
 * @returns {Promise<string|null>} - La URL de la imagen en base64 o null si falla.
 */
async function pGenerarImagenIA(prompt, outputDiv, archivar = true) {
    if (typeof apiKey === 'undefined' || !apiKey) {
        const errorMsg = "Error: La API Key de Google no está configurada.";
        console.error(errorMsg);
        outputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
        return null;
    }

    outputDiv.innerHTML += `<p>🖼️ Preparando la generación para: "${prompt}"...</p>`;

    const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation'; // Modelo actualizado
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    // Payload actualizado para seguir el formato más robusto
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

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            outputDiv.innerHTML += `<p>⏳ Enviando petición... (Intento ${attempt}/${maxRetries})</p>`;
            
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
                outputDiv.innerHTML += `<p>✅ ¡Éxito! Imagen recibida.</p><img src="${imageDataUrl}" style="max-width: 100%; border-radius: 5px; margin-top: 10px;" alt="Imagen generada por IA">`;

                if (archivar && typeof archivarImagenComoDato === 'function') {
                    outputDiv.innerHTML += `<p>📦 Archivando imagen como dato visual...</p>`;
                    archivarImagenComoDato(imageDataUrl);
                }
                
                // Si tenemos éxito, devolvemos la URL y salimos de la función.
                return imageDataUrl;
            } else {
                const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
                throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
            }
        } catch (error) {
            lastError = error;
            console.error(`Intento ${attempt} fallido:`, error);
            outputDiv.innerHTML += `<p style="color: orange;">⚠️ Intento ${attempt} fallido: ${error.message}</p>`;
            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2 segundos antes de reintentar
            }
        }
    }

    // Si el bucle termina, todos los intentos fallaron.
    console.error("Todos los intentos para generar la imagen fallaron.", lastError);
    outputDiv.innerHTML += `<p style="color: red;">❌ Fallo al generar la imagen tras ${maxRetries} intentos: ${lastError?.message || 'Error desconocido'}</p>`;
    return null;
}
/**
 * NUEVA FUNCIÓN: Llama a un modelo de texto de la IA y devuelve la respuesta JSON parseada.
 * @param {string} prompt - El prompt completo para la IA.
 * @param {string} model - El modelo a utilizar (ej: "gemini-1.5-flash-latest").
 * @param {HTMLElement} outputDiv - El panel de salida para mostrar logs.
 * @returns {Promise<any>} - La respuesta JSON parseada.
 */
async function pLlamarIAGenerica(prompt, model, outputDiv) {
    if (typeof apiKey === 'undefined' || !apiKey) {
        throw new Error("API Key de Google no configurada.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" }
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();
        
        if (!response.ok || !responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
             const errorDetails = responseData.error?.message || JSON.stringify(responseData);
             throw new Error(`Error en la respuesta de la IA: ${errorDetails}`);
        }
        
        const jsonText = responseData.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);

    } catch (error) {
        console.error(`Error en pLlamarIAGenerica: ${error.message}`);
        outputDiv.innerHTML += `<p style="color: red;">❌ Fallo en la llamada a la IA de texto: ${error.message}</p>`;
        throw error;
    }
}

/**
 * NUEVA FUNCIÓN: Genera un embedding para un texto dado.
 * @param {string} text - El texto para el que se generará el embedding.
 * @returns {Promise<Array<number>|null>} - El vector de embedding o null si falla.
 */
async function pGenerarEmbedding(text, outputDiv) {
    if (typeof apiKey === 'undefined' || !apiKey) return null;
    const MODEL_NAME = "gemini-embedding-001";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:embedContent?key=${apiKey}`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: `models/${MODEL_NAME}`, content: { parts: [{ text }] } })
        });
        const data = await response.json();
        if (data.embedding?.values) {
            outputDiv.innerHTML += `<p>✔️ Embedding generado para "${text.substring(0, 20)}..."</p>`;
            return data.embedding.values;
        }
        return null;
    } catch (error) {
        console.error("Error generando embedding:", error);
        outputDiv.innerHTML += `<p style="color: red;">❌ Fallo al generar embedding para "${text.substring(0, 20)}..."</p>`;
        return null;
    }
}


// Definiciones de los tipos de nodos


