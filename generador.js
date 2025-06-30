    const generateButton = document.getElementById('btn-generate');
    const promptInput = document.getElementById('user-prompt-input');
    
    generateButton.addEventListener('click', handleGeneration);
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGeneration();
        }
    });

    const delay = ms => new Promise(res => setTimeout(res, ms));

    /**
     * Orchestrates the hierarchical generation process.
     */
    async function handleGeneration() {
        const userPrompt = promptInput.value;
        if (!userPrompt) {
            showCustomAlert("Por favor, describe la entidad que quieres crear.");
            return;
        }

        console.log("Iniciando diseño de la entidad:", userPrompt);
        const renderContainer = document.getElementById('render-container');
        const statusMessage = document.getElementById('status-message');
        const canvas = document.getElementById('render-canvas');
        const ctx = canvas.getContext('2d');

        renderContainer.style.display = 'block';
        generateButton.disabled = true;
        
        canvas.width = 512;
        canvas.height = 512;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const allDrawnShapes = [];

        try {
            statusMessage.textContent = 'Fase 1: Creando plan de diseño...';
            const planPrompt = createScenePlanPrompt(userPrompt);
            const scenePlanJson = await callApiAndParseJson(planPrompt);
            const scenePlan = scenePlanJson.scene_plan;
            console.log("Plan de diseño recibido:", scenePlan);

            if (!Array.isArray(scenePlan) || scenePlan.length === 0) {
                throw new Error("La IA no pudo planificar la entidad.");
            }

            statusMessage.textContent = 'Fase 2: Construyendo entidad...';
            
            for (const task of scenePlan) {
                await executeTask(task, userPrompt, allDrawnShapes, ctx, statusMessage);
            }

            // --- New process to scale and position at the bottom ---
            if (allDrawnShapes.length > 0) {
                let minX = Infinity;
                let maxX = -Infinity;
                let minY = Infinity;
                let maxY = -Infinity;

                // Calculate the bounding box of all shapes
                allDrawnShapes.forEach(comp => {
                    if (comp.type === 'rect' && comp.position && comp.size) {
                        minX = Math.min(minX, comp.position.x);
                        maxX = Math.max(maxX, comp.position.x + comp.size.width);
                        minY = Math.min(minY, comp.position.y);
                        maxY = Math.max(maxY, comp.position.y + comp.size.height);
                    } else if (comp.type === 'circle' && comp.position && comp.size && comp.size.radius) {
                        minX = Math.min(minX, comp.position.x - comp.size.radius);
                        maxX = Math.max(maxX, comp.position.x + comp.size.radius);
                        minY = Math.min(minY, comp.position.y - comp.size.radius);
                        maxY = Math.max(maxY, comp.position.y + comp.size.radius);
                    } else if (comp.type === 'line' && comp.start && comp.end) {
                        minX = Math.min(minX, comp.start.x, comp.end.x);
                        maxX = Math.max(maxX, comp.start.x, comp.end.x);
                        minY = Math.min(minY, comp.start.y, comp.end.y);
                        maxY = Math.max(maxY, comp.start.y, comp.end.y);
                    } else if (comp.type === 'polygon' && comp.points && comp.points.length > 0) {
                        comp.points.forEach(p => {
                            minX = Math.min(minX, p.x);
                            maxX = Math.max(maxX, p.x);
                            minY = Math.min(minY, p.y);
                            maxY = Math.max(maxY, p.y);
                        });
                    }
                });

                const compositionWidth = maxX - minX;
                const compositionHeight = maxY - minY;

                // Calculate scaling factor
                let scaleFactor = 1;
                if (compositionWidth > 0 && compositionHeight > 0) {
                    const scaleX = canvas.width / compositionWidth;
                    const scaleY = canvas.height / compositionHeight;
                    scaleFactor = Math.min(scaleX, scaleY);
                } else if (compositionWidth === 0 && compositionHeight > 0) { // Vertical line or point, scale by height
                    scaleFactor = canvas.height / compositionHeight;
                } else if (compositionHeight === 0 && compositionWidth > 0) { // Horizontal line or point, scale by width
                    scaleFactor = canvas.width / compositionWidth;
                }
                // If both are 0 (single point), scaleFactor remains 1

                const scaledWidth = compositionWidth * scaleFactor;
                const scaledHeight = compositionHeight * scaleFactor;

                // Calculate translation offsets
                // Center horizontally
                const translateX = (canvas.width - scaledWidth) / 2 - minX * scaleFactor;
                // Position at the bottom
                const translateY = canvas.height - scaledHeight - minY * scaleFactor;

                // Clear the canvas and re-render with new adjusted positions and scale
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save(); // Save the current canvas state
                ctx.translate(translateX, translateY); // Apply translation
                ctx.scale(scaleFactor, scaleFactor); // Apply scaling
                renderComponentGroup(allDrawnShapes, ctx);
                ctx.restore(); // Restore the canvas state
            }
            // --- End of new process ---

            statusMessage.textContent = '¡Entidad completada!';

        } catch (error) {
            console.error("Error en el proceso de generación:", error);
            statusMessage.textContent = `Error: ${error.message}`;
        } finally {
            generateButton.disabled = false;
        }
    }

    /**
     * Executes a task from the plan.
     */
    async function executeTask(task, contextPrompt, allDrawnShapes, ctx, statusMessage) {
        statusMessage.textContent = `Ejecutando: ${task.description}`;
        console.log(`--- Ejecutando Tarea: ${task.task_type} (${task.description}) ---`);
        
        if (task.task_type === "draw_character" && Array.isArray(task.sub_tasks)) {
            for (const subTask of task.sub_tasks) {
                 statusMessage.textContent = `Dibujando: ${subTask.description}`;
                 await executeLayer(subTask.description, contextPrompt, allDrawnShapes, ctx);
                 await delay(20);
            }
        } else {
            await executeLayer(task.description, contextPrompt, allDrawnShapes, ctx);
            await delay(20);
        }
    }
    
    /**
     * Generates and renders a specific layer.
     */
    async function executeLayer(layerDescription, contextPrompt, allDrawnShapes, ctx) {
        const layerPrompt = createLayerPrompt(layerDescription, contextPrompt, allDrawnShapes);
        const newLayer = await callApiAndParseJson(layerPrompt);
        
        console.log(`Capa '${layerDescription}' recibida:`, newLayer);
        
        if (newLayer.components && Array.isArray(newLayer.components)) {
            renderComponentGroup(newLayer.components, ctx);
            allDrawnShapes.push(...newLayer.components);
        }
    }
    
    /**
     * PHASE 1: Asks the AI for a design plan.
     */
    function createScenePlanPrompt(userPrompt) {
        return `
            Tu tarea es actuar como un director de arte y descomponer una entidad 2D en un plan de construcción lógico.
            La descripción es: "${userPrompt}".
            El plan debe ser una secuencia de tareas para construir el objeto o personaje principal.
            IMPORTANTE: El plan NO debe incluir una tarea para dibujar un fondo (como "draw_background"). El objetivo es generar solo el personaje/objeto principal sobre un fondo transparente.
            El resultado debe ser un único objeto JSON.
            Asegúrate de que el estilo general sea claro y definido, sin efectos de iluminación o sombreado complejos.
            Ejemplo de estructura para "un hechicero":
            { "scene_plan": [ { "task_type": "draw_character", "description": "el hechicero", "sub_tasks": [ { "step": "draw_base_body", "description": "la forma base del cuerpo del hechicero" }, { "step": "draw_clothing", "description": "la túnica y el sombrero del hechicero" }, { "step": "draw_accessories", "description": "el bastón mágico del hechicero" } ] } ] }
        `;
    }

    /**
     * PHASE 2: Asks the AI to design a specific layer.
     */
    function createLayerPrompt(layerDescription, contextPrompt, existingShapes) {
        const jsonStructure = `
          { "components": [ { "part": "nombre de la pieza", "type": "rect" | "circle" | "line" | "polygon", "style": { "fillStyle": "#hex", "strokeStyle": "#hex", "lineWidth": number }, "position": {"x": number, "y": number}, "size": {"width": number, "height": number, "radius": number}, "start": {"x": number, "y": number}, "end": {"x": number, "y": number}, "points": [ {"x": number, "y": number}, {"x": number, "y": number}, ... ] } ] }
        `;
        const existingShapesJSON = JSON.stringify(existingShapes.slice(-15), null, 2);
        return `
            Estás diseñando una entidad 2D pieza por pieza sobre un lienzo transparente de 512x512. El concepto general es: "${contextPrompt}".
            Los siguientes componentes ya han sido dibujados:
            ${existingShapesJSON}
            Tu tarea AHORA es diseñar la siguiente capa: "${layerDescription}".
            Devuelve un objeto JSON con un array de formas ("components") para esta capa. 
            ¡Usa "polygon" con múltiples puntos para crear formas detalladas y menos geométricas! Esto es clave para la calidad.
            Las nuevas formas deben encajar lógica y visualmente con las piezas existentes.
            Usa solo las formas "rect", "circle", "line" o "polygon". Sé muy estricto con la estructura JSON.
            Utiliza colores planos y definidos, sin efectos de brillo o sombreado. Evita los degradados.
            ESTRUCTURA JSON REQUERIDA:
            ---
            ${jsonStructure}
            ---
        `;
    }
    
    /**
     * Draws a group of components on the canvas.
     */
    function renderComponentGroup(components, ctx) {
        if (!Array.isArray(components)) return;
        components.forEach(comp => {
            if (!comp || !comp.type) { console.warn("Componente inválido, omitido:", comp); return; }
            const style = comp.style || {};
            ctx.fillStyle = style.fillStyle || 'transparent';
            ctx.strokeStyle = style.strokeStyle || '#000000';
            ctx.lineWidth = style.lineWidth || 1;
            ctx.beginPath();
            switch (comp.type) {
                case 'rect': if (comp.position && comp.size) { ctx.rect(comp.position.x, comp.position.y, comp.size.width, comp.size.height); } break;
                case 'circle': if (comp.position && comp.size && comp.size.radius) { ctx.arc(comp.position.x, comp.position.y, comp.size.radius, 0, Math.PI * 2); } break;
                case 'line': if (comp.start && comp.end) { ctx.moveTo(comp.start.x, comp.start.y); ctx.lineTo(comp.end.x, comp.end.y); } break;
                case 'polygon': if (comp.points && comp.points.length > 1) { ctx.moveTo(comp.points[0].x, comp.points[0].y); for (let i = 1; i < comp.points.length; i++) { ctx.lineTo(comp.points[i].x, comp.points[i].y); } ctx.closePath(); } break;
            }
            if (comp.type === 'line') { if ((style.lineWidth || 0) > 0) ctx.stroke(); } else { if (style.fillStyle && style.fillStyle !== 'transparent') ctx.fill(); if (style.strokeStyle && (style.lineWidth || 0) > 0) ctx.stroke(); }
        });
    }

    // applyOverallTexture function is removed to eliminate complex lighting and shading effects.
    // function applyOverallTexture(ctx, width, height) {
    //     const imageData = ctx.getImageData(0, 0, width, height);
    //     const pixels = imageData.data;
    //     const density = 0.05; // Adjust noise density

    //     for (let i = 0; i < pixels.length; i += 4) {
    //         // Only apply texture to non-transparent pixels
    //         if (pixels[i + 3] > 0) { 
    //             if (Math.random() < density) {
    //                 const brightnessOffset = (Math.random() - 0.5) * 30; // Adjust brightness range
    //                 pixels[i] = Math.max(0, Math.min(255, pixels[i] + brightnessOffset));     // Red
    //                 pixels[i + 1] = Math.max(0, Math.min(255, pixels[i + 1] + brightnessOffset)); // Green
    //                 pixels[i + 2] = Math.max(0, Math.min(255, pixels[i + 2] + brightnessOffset)); // Blue
    //             }
    //         }
    //     }
    //     ctx.putImageData(imageData, 0, 0);
    // }


    // --- API COMMUNICATION AND UTILITY FUNCTIONS (Full implementation) ---

    /**
     * Calls the Gemini API, extracts JSON, and manages retries.
     */
    async function callApiAndParseJson(prompt, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const rawResponse = await callGeminiApiInternal(prompt);
                const parsedJson = extractJson(rawResponse);
                return parsedJson; // If successful, return the JSON
            } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error);
                if (attempt === maxRetries) {
                    throw new Error("The API did not respond with valid JSON after several attempts.");
                }
                await delay(1000); // Wait before retrying
            }
        }
    }

    /**
     * Performs the fetch call to the Google Gemini API.
     */
    async function callGeminiApiInternal(prompt) {
        // We will use the gemini-2.0-flash model which is standard for this type of task.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7, // Increased temperature for more creativity in textures
                maxOutputTokens: 2048
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("API Error:", errorBody);
            throw new Error(`Error en la API de Gemini: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0].content.parts[0].text) {
             console.error("Unexpected API response:", data);
             throw new Error("The API response does not have the expected format.");
        }
        
        return data.candidates[0].content.parts[0].text;
    }

    /**
     * Extracts a JSON code block from the text returned by the API.
     */
    function extractJson(text) {
        // The API often returns JSON inside a markdown code block.
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = match ? match[1] : text;

        try {
            // Try to directly parse the clean string.
            return JSON.parse(jsonString);
        } catch (error) {
            console.error("Failed to parse JSON:", error);
            console.log("String that failed:", jsonString);
            throw new Error("The received text is not valid JSON.");
        }
    }
    
    /**
     * Displays a simple custom alert in the browser.
     */
    function showCustomAlert(message) {
        // Replace alert() with a custom modal for better UX
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background-color: #333; color: #eee; padding: 20px; border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 1000;
            text-align: center;
        `;
        modal.innerHTML = `<p>${message}</p><button style="margin-top: 10px; padding: 8px 15px; background-color: #03dac6; color: #121212; border: none; border-radius: 5px; cursor: pointer;">OK</button>`;
        document.body.appendChild(modal);

        modal.querySelector('button').onclick = () => {
            document.body.removeChild(modal);
        };
    }
