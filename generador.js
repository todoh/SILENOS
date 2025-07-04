// =================================================================
// ARCHIVO CORREGIDO: datos/generador.js
// Se ha restaurado la funcionalidad para procesar archivos JSON de dibujo,
// manteniendo al mismo tiempo el generador principal basado en prompts.
// =================================================================

// --- Elementos del DOM y Event Listeners ---
const generateButton = document.getElementById('btn-generate');
const saveButton = document.getElementById('btn-save-generation');
const promptInput = document.getElementById('user-prompt-input');
const processJsonButton = document.getElementById('btn-process-json');
const jsonFileInput = document.getElementById('json-file-input');

// Listeners para la generación principal por prompt
if (generateButton) {
    generateButton.addEventListener('click', handleGeneration);
}
if (saveButton) {
    saveButton.addEventListener('click', saveGeneration);
}
if (promptInput) {
    promptInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGeneration();
        }
    });
}

// --- INICIO: CÓDIGO RESTAURADO PARA IMPORTAR JSON ---
// Listeners para la funcionalidad de importar JSON
if (processJsonButton) {
    processJsonButton.addEventListener('click', processJsonInput);
}
if (jsonFileInput) {
    jsonFileInput.addEventListener('change', handleJsonFileSelect);
}

/**
 * Maneja la selección de un archivo JSON y lo carga en el área de texto.
 * @param {Event} event - El evento 'change' del input.
 */
function handleJsonFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const fileContent = e.target.result;
        const jsonInputArea = document.getElementById('json-input-area');
        if (jsonInputArea) {
            jsonInputArea.value = fileContent;
            processJsonInput(); // Procesa automáticamente el contenido
        }
    };
    reader.readAsText(file);
}

/**
 * Procesa el JSON que contiene instrucciones de dibujo (formas)
 * y reconstruye las imágenes para añadirlas a la galería.
 */
function processJsonInput() {
    const jsonInputArea = document.getElementById('json-input-area');
    if (!jsonInputArea) return;

    const jsonText = jsonInputArea.value;
    if (!jsonText.trim()) {
        showCustomAlert('El área de texto JSON está vacía.');
        return;
    }

    try {
        let data = JSON.parse(jsonText);
        // Asegura que siempre trabajemos con un array
        if (!Array.isArray(data)) {
            data = [data];
        }

        let itemsAdded = 0;
        data.forEach(itemData => {
            // Verifica que el objeto tenga las propiedades necesarias
            if (!itemData.nombre || !itemData.formas || !Array.isArray(itemData.formas)) {
                console.warn('Saltando un elemento del JSON. Debe tener "nombre" y un array de "formas".', itemData);
                return;
            }

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 512;
            tempCanvas.height = 512;
            const tempCtx = tempCanvas.getContext('2d');
            
            // Dibuja las formas en el canvas temporal
            itemData.formas.forEach(forma => {
                dibujarForma(tempCtx, forma);
            });

            // Guarda la imagen generada en la galería
            agregarImagenAGaleria(tempCanvas.toDataURL(), itemData.nombre);
            itemsAdded++;
        });

        if (itemsAdded > 0) {
            jsonInputArea.value = '';
            showCustomAlert(`¡${itemsAdded} imágenes reconstruidas desde JSON y añadidas a la galería!`);
        } else {
            showCustomAlert('No se añadieron nuevos elementos. Revisa el formato del JSON.');
        }

    } catch (error) {
        console.error('Error al procesar JSON:', error);
        showCustomAlert('Error al procesar el JSON. Revisa el formato y la consola.');
    }
}

/**
 * Dibuja una forma simple en el canvas.
 * Esta función es la que interpreta el formato de formas del JSON importado.
 */
function dibujarForma(ctx, forma) {
    ctx.fillStyle = forma.color || '#333';
    ctx.strokeStyle = forma.color || '#333';
    ctx.lineWidth = 2;

    ctx.save();
    ctx.translate(forma.posición[0], forma.posición[1]);
    ctx.rotate((forma.rotación || 0) * Math.PI / 180);

    switch (forma.forma) {
        case 'rectángulo':
            ctx.fillRect(-forma.tamaño[0] / 2, -forma.tamaño[1] / 2, forma.tamaño[0], forma.tamaño[1]);
            break;
        case 'círculo':
            ctx.beginPath();
            ctx.arc(0, 0, forma.tamaño, 0, 2 * Math.PI);
            ctx.fill();
            break;
    }
    ctx.restore();
}

/**
 * Añade una imagen y su prompt a la galería de generaciones.
 */
function agregarImagenAGaleria(imageUrl, prompt) {
    const generacionesContainer = document.getElementById('generaciones-container');
    const generacionesGrid = document.getElementById('generaciones-grid');
    if (!generacionesGrid || !generacionesContainer) return;

    generacionesContainer.style.display = 'block';

    const itemContainer = document.createElement('div');
    itemContainer.className = 'generacion-item';

    const imgElement = document.createElement('img');
    imgElement.src = imageUrl;

    const infoContainer = document.createElement('div');
    infoContainer.className = 'generacion-info';

    const promptText = document.createElement('p');
    promptText.className = 'generacion-prompt';
    promptText.contentEditable = true;
    promptText.textContent = prompt || 'Sin prompt';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'generacion-delete-btn';
    deleteButton.innerHTML = '&times;';
    deleteButton.title = 'Eliminar esta imagen';
    deleteButton.onclick = () => itemContainer.remove();

    infoContainer.appendChild(promptText);
    infoContainer.appendChild(deleteButton);
    itemContainer.appendChild(imgElement);
    itemContainer.appendChild(infoContainer);

    generacionesGrid.prepend(itemContainer);
}
// --- FIN: CÓDIGO RESTAURADO PARA IMPORTAR JSON ---


const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Genera una imagen a partir de un prompt y devuelve su Data URL.
 */
async function generarImagenParaToma(prompt, statusContainer = null) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 512;
    tempCanvas.height = 512;

    const allDrawnShapes = [];

    const updateStatus = (message) => {
        if (statusContainer) {
            statusContainer.textContent = message;
        }
        console.log(message);
    };

    try {
        updateStatus('Creando plan de diseño...');
        const planPrompt = createScenePlanPrompt(prompt);
        const scenePlanJson = await callApiAndParseJson(planPrompt);
        const scenePlan = scenePlanJson.scene_plan;

        if (!Array.isArray(scenePlan) || scenePlan.length === 0) {
            throw new Error("La IA no pudo planificar la entidad.");
        }

        updateStatus('Construyendo entidad...');
        for (const task of scenePlan) {
            await executeTask(task, prompt, allDrawnShapes, tempCtx, (msg) => updateStatus(msg));
        }

        if (allDrawnShapes.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            allDrawnShapes.forEach(comp => {
                 if (comp.type === 'rect') { minX = Math.min(minX, comp.position.x); maxX = Math.max(maxX, comp.position.x + comp.size.width); minY = Math.min(minY, comp.position.y); maxY = Math.max(maxY, comp.position.y + comp.size.height); }
                 else if (comp.type === 'circle') { minX = Math.min(minX, comp.position.x - comp.size.radius); maxX = Math.max(maxX, comp.position.x + comp.size.radius); minY = Math.min(minY, comp.position.y - comp.size.radius); maxY = Math.max(maxY, comp.position.y + comp.size.radius); }
                 else if (comp.type === 'line') { minX = Math.min(minX, comp.start.x, comp.end.x); maxX = Math.max(maxX, comp.start.x, comp.end.x); minY = Math.min(minY, comp.start.y, comp.end.y); maxY = Math.max(maxY, comp.start.y, comp.end.y); }
                 else if (comp.type === 'polygon' && comp.points) { comp.points.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }); }
            });

            const compositionWidth = maxX - minX;
            const compositionHeight = maxY - minY;
            let scaleFactor = Math.min(tempCanvas.width / compositionWidth, tempCanvas.height / compositionHeight) * 0.9;
            const scaledWidth = compositionWidth * scaleFactor;
            const scaledHeight = compositionHeight * scaleFactor;
            const translateX = (tempCanvas.width - scaledWidth) / 2 - minX * scaleFactor;
            const translateY = tempCanvas.height - scaledHeight - minY * scaleFactor - (tempCanvas.height * 0.05);

            tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.save();
            tempCtx.translate(translateX, translateY);
            tempCtx.scale(scaleFactor, scaleFactor);
            renderComponentGroup(allDrawnShapes, tempCtx);
            tempCtx.restore();
        }

        updateStatus('¡Imagen completada!');
        return tempCanvas.toDataURL('image/png');

    } catch (error) {
        console.error("Error en el proceso de generación para la toma:", error);
        updateStatus(`Error: ${error.message}`);
        throw error;
    }
}

/**
 * Orchestrates the hierarchical generation process for the main UI.
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
    saveButton.style.display = 'none';
    
    canvas.width = 512;
    canvas.height = 512;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
        const imageUrl = await generarImagenParaToma(userPrompt, statusMessage);
        
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            statusMessage.textContent = '¡Entidad completada!';
            saveButton.style.display = 'inline-block';
        };
        img.src = imageUrl;

    } catch (error) {
        console.error("Error en el proceso de generación principal:", error);
        statusMessage.textContent = `Error: ${error.message}`;
    } finally {
        generateButton.disabled = false;
    }
}

/**
 * Executes a task from the plan, with delays between sub-tasks.
 */
async function executeTask(task, contextPrompt, allDrawnShapes, ctx, updateStatusCallback) {
    updateStatusCallback(`Ejecutando: ${task.description}`);
    console.log(`--- Ejecutando Tarea: ${task.task_type} (${task.description}) ---`);
    
    if (task.task_type === "draw_character" && Array.isArray(task.sub_tasks)) {
        for (const subTask of task.sub_tasks) {
             updateStatusCallback(`Dibujando: ${subTask.description}`);
             await executeLayer(subTask.description, contextPrompt, allDrawnShapes, ctx);
             await delay(500);
        }
    } else {
        await executeLayer(task.description, contextPrompt, allDrawnShapes, ctx);
        await delay(500);
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
 * Saves the current canvas content to the Generations gallery.
 */
function saveGeneration() {
    const canvas = document.getElementById('render-canvas');
    const currentPrompt = promptInput.value;
    if (!canvas) return;

    try {
        const imageDataUrl = canvas.toDataURL('image/png');
        // Reutilizamos la función ya creada
        agregarImagenAGaleria(imageDataUrl, currentPrompt);
        showCustomAlert('Imagen guardada en la galería de Generaciones.');
    } catch (error) {
        console.error("Error al guardar la imagen del canvas:", error);
        showCustomAlert(`Error al guardar la imagen: ${error.message}`);
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

// --- API COMMUNICATION AND UTILITY FUNCTIONS ---

/**
 * Calls the Gemini API, extracts JSON, and manages retries.
 */
async function callApiAndParseJson(prompt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const rawResponse = await callGeminiApiInternal(prompt);
            const parsedJson = extractJson(rawResponse);
            return parsedJson;
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt === maxRetries) {
                throw new Error("The API did not respond with valid JSON after several attempts.");
            }
            await delay(1000);
        }
    }
}

/**
 * Performs the fetch call to the Google Gemini API.
 */
async function callGeminiApiInternal(prompt) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 8192
        }
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("API Error Body:", errorBody);
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
    try {
        return JSON.parse(text);
    } catch (error) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonString = match ? match[1] : text;
        try {
            return JSON.parse(jsonString);
        } catch (parseError) {
            console.error("Failed to parse JSON:", parseError);
            console.log("String that failed:", jsonString);
            throw new Error("The received text is not valid JSON.");
        }
    }
}

/**
 * Displays a simple custom alert in the browser.
 */
function showCustomAlert(message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background-color: #333; color: #eee; padding: 15px 25px; border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 1001;
        text-align: center;
        display: flex; align-items: center; gap: 15px;
    `;
    modal.innerHTML = `<p style="margin: 0;">${message}</p><button style="padding: 5px 10px; background-color: #555; color: #fff; border: 1px solid #666; border-radius: 5px; cursor: pointer;">OK</button>`;
    document.body.appendChild(modal);

    modal.querySelector('button').onclick = () => {
        document.body.removeChild(modal);
    };
}