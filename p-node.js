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
    },
  
generador_datos: {
    title: '🧩 Generador de Datos',
    inputs: 1,
    outputs: 1,
    content: `<span>Genera datos, imágenes y embeddings a partir de un texto.</span>`,
    process: async (pNode, pInputs) => {
        const pOutputDiv = document.getElementById('p-output');
        const peticionResumida = pInputs[0];

        if (!peticionResumida || typeof peticionResumida !== 'string') {
            const errorMsg = "Error: El nodo Generador de Datos necesita un texto de entrada.";
            pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
            return errorMsg;
        }

        if (typeof opcionesEtiqueta === 'undefined' || typeof agregarPersonajeDesdeDatos === 'undefined') {
            const errorMsg = "Error crítico: Funciones o variables globales requeridas no están disponibles.";
            console.error(errorMsg);
            pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
            return errorMsg;
        }

        pOutputDiv.innerHTML += `<p><strong>Silenos:</strong> Iniciando pipeline de generación creativa...</p>`;

        try {
            // ===== INICIO DEL BLOQUE RESTAURADO =====
            const etiquetasValidas = opcionesEtiqueta
                .map(o => o.valor)
                .filter(v => v !== 'indeterminado' && v !== 'personalizar')
                .join(', ');

            const promptGeneracion = `
                **Tarea Principal:** Basado en la siguiente solicitud, genera una lista de uno o más datos estructurados de forma creativa.
                **Solicitud del Usuario:** "${peticionResumida}"

                **Instrucciones:**
                - Produce contenido original y detallado que se ajuste a la petición.
                - Para CADA dato generado, proporciona: "nombre", "descripcion" (detallada, para el embedding), "promptVisual" (una descripción para generar una imagen detallada y repetible del dato; si es una persona, detalla con exactitud su morfología, TODOS los rasgos de su cara y su vestimenta), y la "etiqueta" MÁS APROPIADA de la lista [${etiquetasValidas}].

                **Formato de Salida Obligatorio:** Responde ÚNICAMENTE con un objeto JSON válido que sea un array de datos. Cada objeto en el array debe tener la estructura completa:
                { "nombre": "...", "descripcion": "...", "promptVisual": "...", "etiqueta": "..." }
            `;
            
            pOutputDiv.innerHTML += `<p>🧠 Generando datos textuales para: "${peticionResumida}"</p>`;
            let datosGenerados = await pLlamarIAGenerica(promptGeneracion, "gemini-2.5-flash", pOutputDiv);

            if (!Array.isArray(datosGenerados)) {
                if (typeof datosGenerados === 'object' && datosGenerados !== null) {
                    datosGenerados = [datosGenerados];
                } else {
                    throw new Error("La IA no devolvió un array de objetos válido.");
                }
            }
            // ===== FIN DEL BLOQUE RESTAURADO =====

            pOutputDiv.innerHTML += `<p>✅ Se han generado ${datosGenerados.length} perfiles de datos. Procesando cada uno...</p>`;
            let totalCreados = 0;

            for (const dato of datosGenerados) {
                if (!dato.nombre || !dato.descripcion || !dato.promptVisual) continue;
                
                pOutputDiv.innerHTML += `<hr><p>➡️ Procesando: <strong>${dato.nombre}</strong></p>`;

                const imagenUrl = await pGenerarImagenIA(dato.promptVisual, pOutputDiv, false);
                const embeddingVector = await pGenerarEmbedding(dato.descripcion, pOutputDiv);

                const datosCompletos = {
                    ...dato,
                    imagen: imagenUrl || '',
                    embedding: embeddingVector || [],
                };

                agregarPersonajeDesdeDatos(datosCompletos);
                pOutputDiv.innerHTML += `<p style="color: green; font-weight: bold;">✔️ Dato "${dato.nombre}" creado y añadido a la aplicación.</p>`;
                totalCreados++;
            }

            if (typeof reinicializarFiltrosYActualizarVista === 'function') {
                reinicializarFiltrosYActualizarVista();
            }
            
            const successMsg = `Proceso completado. Se crearon ${totalCreados} datos nuevos.`;
            pOutputDiv.innerHTML += `<hr><p style="font-weight: bold;">${successMsg}</p>`;
            return successMsg;

        } catch (error) {
            const errorMsg = `Fallo el proceso de generación: ${error.message}`;
            pOutputDiv.innerHTML += `<p style="color: red;">${errorMsg}</p>`;
            return errorMsg;
        }
    }
}
,
generador_personajesyobjetos: {
    title: '🧩 Generador de Personajes y Objetos',
    inputs: 1,
    outputs: 1,
    content: `<span>Genera datos, imágenes y embeddings a partir de un texto.</span>`,
   
    process: async (pNode, pInputs) => {
        // La única línea que necesitas. pInputs[0] es el texto que entra al nodo.
        return generarDatosConImagenAvanzada(pInputs[0]);
    }
}


};

