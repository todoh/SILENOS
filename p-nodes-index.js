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
            const outputDiv = document.getElementById('p-output');
            const input = pInputs[0];
            let contentToLog;

            // Si la entrada es un objeto y no es nulo, lo formatea como JSON.
            if (typeof input === 'object' && input !== null) {
                // JSON.stringify con null y 2 formatea el JSON para que sea legible.
                contentToLog = `<pre contenteditable="true" >${JSON.stringify(input, null, 2)}</pre>`;
            } else {
                // Si es texto, número, etc., lo muestra directamente.
                contentToLog = input || 'N/A';
            }
            
            outputDiv.innerHTML += `<div style="margin-bottom: 8px;">[${pNode.id}]: ${contentToLog}</div>`;
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
, gemini_text_request: {
        title: '🤖 Petición de Texto a Gemini',
        inputs: 1,
        outputs: 1,
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label for="model-select">Modelo:</label>
                <select data-save="model">
                   <option value="gemini-2.5-flash">2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">2.5 Flash Lite</option>
                    <option value="gemini-2.5-pro">2.5 Pro</option>
                     <option value="gemini-2.0-flash">2.0 Flash</option>
                    <option value="gemini-2.0-flash-lite">2.0 Flash Lite</option>
                    <option value="gemini-2.0-pro">2.0 Pro</option>
                </select>
                <label for="system-prompt">Prompt de Sistema (opcional):</label>
                <textarea data-save="system_prompt" rows="3" placeholder="Ej: Eres un asistente experto en..."></textarea>
            </div>
        `,
        process: async (pNode, pInputs) => {
            const systemPrompt = pNode.element.querySelector('[data-save="system_prompt"]').value;
            const model = pNode.element.querySelector('[data-save="model"]').value;
            const userPrompt = pInputs[0] || '';
            
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`.trim();
            
            // Llama a la función de la nueva librería
            const result = await pCallGeminiApi(fullPrompt, model, false);
            return result; // Devuelve la respuesta de texto
        }
    },

     gemini_json_request: {
        title: '📄 Petición de JSON a Gemini',
        inputs: 1,
        outputs: 1,
        content: `
            <div style="display: flex; flex-direction: column; gap: 5px;">
                <label for="model-select">Modelo:</label>
                <select data-save="model">
                option value="gemini-2.5-flash">2.5 Flash</option>
                    <option value="gemini-2.5-flash-lite">2.5 Flash Lite</option>
                    <option value="gemini-2.5-pro">2.5 Pro</option>
                     <option value="gemini-2.0-flash">2.0 Flash</option>
                    <option value="gemini-2.0-flash-lite">2.0 Flash Lite</option>
                    <option value="gemini-2.0-pro">2.0 Pro</option>
                </select>
                <label for="system-prompt">Prompt de Sistema:</label>
                <textarea data-save="system_prompt" rows="3" placeholder="Ej: Devuelve un JSON con la clave 'respuesta'..."></textarea>
            </div>
        `,
        process: async (pNode, pInputs) => {
            const systemPrompt = pNode.element.querySelector('[data-save="system_prompt"]').value;
            const model = pNode.element.querySelector('[data-save="model"]').value;
            const userPrompt = pInputs[0] || '';

            const fullPrompt = `${systemPrompt}\n\nDatos de entrada: ${JSON.stringify(userPrompt)}`.trim();

            // Llama a la función de la nueva librería pidiendo un JSON
            const result = await pCallGeminiApi(fullPrompt, model, true);
            return result; // Devuelve el objeto JSON
        }
    }

};