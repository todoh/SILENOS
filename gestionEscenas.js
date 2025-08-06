// ===================================
// GESTIÓN DE LA NUEVA SECCIÓN DE ESCENAS
// ===================================

let draggedTomaId = null; // Variable global para el ID de la toma arrastrada

/**
 * Inicializa los listeners y la UI para la sección de escenas.
 */
function initEscenas() {
    document.getElementById('crear-escena-btn')?.addEventListener('click', crearNuevaEscena2);
    document.getElementById('agregar-toma-btn')?.addEventListener('click', () => agregarToma());
    document.getElementById('escenas-dropdown')?.addEventListener('change', seleccionarEscenaDesdeDropdown);
    document.getElementById('escena-nombre-input')?.addEventListener('input', cambiarNombreEscena);
    document.getElementById('generargraficos')?.addEventListener('click', generarGraficosSecuencialmente);
    
    const timelineDiv = document.getElementById('tomas-timeline');
    if (timelineDiv) {
        timelineDiv.addEventListener('dragover', handleDragOverTimeline);
        timelineDiv.addEventListener('drop', handleDropOnTimeline);
        timelineDiv.addEventListener('dragleave', handleDragLeaveTimeline);
    }

    // Añade el estilo para el estado de carga de la generación individual.
    const style = document.createElement('style');
    style.id = 'toma-procesando-style-individual';
    style.textContent = `
        .toma-procesando-individual .toma-imagen-area {
            outline: 3px solid #6a0dad; /* Borde morado */
            box-shadow: 0 0 15px rgba(106, 13, 173, 0.7);
            animation: pulse-purple 1.5s infinite;
        }
        @keyframes pulse-purple {
            0% { box-shadow: 0 0 15px rgba(106, 13, 173, 0.7); }
            50% { box-shadow: 0 0 25px rgba(106, 13, 173, 1); }
            100% { box-shadow: 0 0 15px rgba(106, 13, 173, 0.7); }
        }
    `;
    document.head.appendChild(style);


    renderEscenasUI();
}

/**
 * Crea una nueva escena, la añade al array global y refresca la UI.
 */
function crearNuevaEscena2() {
    const newId = 'escena_' + Date.now();
    const nuevaEscena = {
        id: newId,
        nombre: "Nueva Escena " + (storyScenes.length + 1),
        tomas: [] 
    };
    storyScenes.push(nuevaEscena);
    activeSceneId = newId;
    renderEscenasUI();
}

/**
 * Agrega una nueva toma a la escena activa, opcionalmente en un índice específico.
 */
function agregarToma(duracion = 8, index = -1) {
    if (!activeSceneId) {
        alert("Primero selecciona o crea una escena.");
        return;
    }
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        const nuevaToma = {
            id: 'toma_' + Date.now(),
            duracion: duracion,
            imagen: "",
            guionConceptual: "",
            guionTecnico: "",
            guionArtistico: ""
        };

        if (index > -1 && index < escenaActiva.tomas.length) {
            escenaActiva.tomas.splice(index + 1, 0, nuevaToma);
        } else {
            escenaActiva.tomas.push(nuevaToma);
        }
        renderEscenasUI();
    }
}

/**
 * Elimina una toma de la escena activa.
 */
function eliminarToma(tomaId) {
    if (!activeSceneId) return;
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        const tomaIndex = escenaActiva.tomas.findIndex(t => t.id === tomaId);
        if (tomaIndex > -1) {
            if (confirm("¿Seguro que quieres eliminar esta toma?")) {
                escenaActiva.tomas.splice(tomaIndex, 1);
                renderEscenasUI();
            }
        }
    }
}

/**
 * Actualiza la escena activa cuando se selecciona una del dropdown.
 */
function seleccionarEscenaDesdeDropdown(event) {
    activeSceneId = event.target.value;
    renderEscenasUI();
}

/**
 * Cambia el nombre de la escena activa a medida que el usuario escribe en el input.
 */
function cambiarNombreEscena(event) {
    if (!activeSceneId) return;
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (escenaActiva) {
        escenaActiva.nombre = event.target.value;
        const dropdown = document.getElementById('escenas-dropdown');
        const optionToUpdate = dropdown.querySelector(`option[value="${activeSceneId}"]`);
        if (optionToUpdate) {
            optionToUpdate.textContent = escenaActiva.nombre;
        }
    }
}

function renderEscenasUI() {
    const dropdown = document.getElementById('escenas-dropdown');
    const nombreInput = document.getElementById('escena-nombre-input');
    const timelineDiv = document.getElementById('tomas-timeline');

    if (!dropdown || !nombreInput || !timelineDiv) return;

    const scrollLeft = timelineDiv.scrollLeft;
    dropdown.innerHTML = '';
    storyScenes.forEach(escena => {
        const option = document.createElement('option');
        option.value = escena.id;
        option.textContent = escena.nombre;
        dropdown.appendChild(option);
    });

    timelineDiv.innerHTML = '';

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);

    if (escenaActiva) {
        dropdown.value = activeSceneId;
        nombreInput.value = escenaActiva.nombre;
        nombreInput.disabled = false;
        document.getElementById('agregar-toma-btn').disabled = false;

        if (escenaActiva.tomas && escenaActiva.tomas.length > 0) {
            escenaActiva.tomas.forEach((toma, index) => {
                const tomaContainer = document.createElement('div');
                tomaContainer.className = 'toma-card';
                tomaContainer.dataset.tomaId = toma.id;
                tomaContainer.draggable = true;

                tomaContainer.addEventListener('dragstart', handleDragStart);
                tomaContainer.addEventListener('dragend', handleDragEnd);
                tomaContainer.addEventListener('dragover', handleDragOver);
                tomaContainer.addEventListener('dragleave', handleDragLeave);
                tomaContainer.addEventListener('drop', handleDrop);

                const controlesDiv = document.createElement('div');
                controlesDiv.className = 'toma-controles';
                const addBtn = document.createElement('button');
                addBtn.className = 'toma-btn';
                addBtn.innerHTML = '&#10133;';
                addBtn.title = 'Crear toma a la derecha';
                addBtn.onclick = () => agregarToma(8, index);
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'toma-btn';
                deleteBtn.innerHTML = '&#10006;';
                deleteBtn.title = 'Eliminar toma';
                deleteBtn.onclick = () => eliminarToma(toma.id);
                controlesDiv.appendChild(addBtn);
                controlesDiv.appendChild(deleteBtn);

                const imagenArea = document.createElement('div');
                imagenArea.className = 'toma-imagen-area';
                const imagenPreview = document.createElement('img');
                imagenPreview.className = 'toma-imagen-preview';
                if (toma.imagen) {
                    imagenPreview.src = toma.imagen;
                } else {
                    imagenPreview.style.display = 'none'; 
                    imagenArea.innerHTML += '<span class="imagen-placeholder">🖼️</span>';
                }

                const uploadLabel = document.createElement('label');
                uploadLabel.className = 'toma-upload-btn';
                uploadLabel.innerHTML = '&#128247;';
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                fileInput.id = `fileInput-${toma.id}`;
                uploadLabel.htmlFor = fileInput.id;
                fileInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (file) {
                        try {
                            toma.imagen = await fileToBase64(file);
                            renderEscenasUI();
                        } catch (error) {
                            console.error("Error al procesar la imagen:", error);
                        }
                    }
                };
                imagenArea.appendChild(imagenPreview);
                imagenArea.appendChild(uploadLabel);
                imagenArea.appendChild(fileInput);

                const textosArea = document.createElement('div');
                textosArea.className = 'toma-textos-area';
                const textoToma = document.createElement('textarea');
                textoToma.placeholder = 'Guion Conceptual...';
                textoToma.value = toma.guionConceptual || '';
                textoToma.oninput = (e) => { toma.guionConceptual = e.target.value; };
                
                const promptTomaContainer = document.createElement('div');
                promptTomaContainer.className = 'toma-prompt-container';
                const promptToma = document.createElement('textarea');
                promptToma.placeholder = 'Guion Técnico (Prompt)...';
                promptToma.value = toma.guionTecnico || '';
                promptToma.oninput = (e) => { toma.guionTecnico = e.target.value; };
                
                const copyBtn = document.createElement('button');
                copyBtn.className = 'toma-copy-btn';
                copyBtn.innerHTML = '&#128203;';
                copyBtn.title = 'Copiar prompt';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(promptToma.value).then(() => {
                        copyBtn.textContent = '✔️';
                        setTimeout(() => { copyBtn.innerHTML = '&#128203;'; }, 1500);
                    });
                };

                const videoBtn = document.createElement('button');
                videoBtn.className = 'toma-video-btn';
                videoBtn.innerHTML = '✨';
                videoBtn.title = 'Generar Imagen con IA';
                videoBtn.onclick = () => {
                    generarImagenParaTomaConIA(toma.id);
                };

                // --- INICIO: NUEVO BOTÓN ---
                const variasTomaVideoBtn = document.createElement('button');
                variasTomaVideoBtn.className = 'toma-video-btn2'; // Misma clase para estilo similar
                variasTomaVideoBtn.innerHTML = '✨x9';
                variasTomaVideoBtn.title = 'Generar 9 Imágenes con IA (esta + 8 siguientes)';
                variasTomaVideoBtn.onclick = () => generarMultiplesImagenesParaTomaConIA(index);
                // --- FIN: NUEVO BOTÓN ---

                promptTomaContainer.appendChild(promptToma);
                promptTomaContainer.appendChild(copyBtn);
                promptTomaContainer.appendChild(videoBtn);
                promptTomaContainer.appendChild(variasTomaVideoBtn); // Añadir el nuevo botón

                textosArea.appendChild(textoToma);
                textosArea.appendChild(promptTomaContainer);

                tomaContainer.appendChild(controlesDiv);
                tomaContainer.appendChild(imagenArea);
                tomaContainer.appendChild(textosArea);
                timelineDiv.appendChild(tomaContainer);
            });
        } else {
             timelineDiv.innerHTML = '<p class="mensaje-placeholder"> </p>';
        }

    } else {
        activeSceneId = null;
        nombreInput.value = 'Crea o selecciona una escena';
        nombreInput.disabled = true;
        document.getElementById('agregar-toma-btn').disabled = true;
        timelineDiv.innerHTML = '<p class="mensaje-placeholder"> </p>';
    }

    timelineDiv.scrollLeft = scrollLeft;
}


/**
 * NUEVA FUNCIÓN: Genera una imagen para una toma específica usando IA.
 * Adapta la lógica de `generarImagenParaFrameConIA`.
 * @param {string} tomaId - El ID de la toma para la que se generará una imagen.
 */
async function generarImagenParaTomaConIA(tomaId) {
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) return;
    const toma = escenaActiva.tomas.find(t => t.id === tomaId);

    if (!toma || !toma.guionConceptual.trim()) {
        alert("Por favor, escribe un guion conceptual en la toma antes de generar una imagen.");
        return;
    }

    const tomaContainer = document.querySelector(`.toma-card[data-toma-id="${toma.id}"]`);
    if (tomaContainer) {
        tomaContainer.classList.add('toma-procesando-individual');
    }

    try {
        const userPrompt = toma.guionConceptual.trim();
        let promptFinal = `Crea una ilustración cinematográfica SIN TEXTO para la siguiente escena: "${userPrompt}". El aspecto debe ser de 16:9, panorámico horizontal y de alta calidad. EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN.`;

        // FASE 1: ANÁLISIS DE PERSONAJES (Lógica reutilizada de tu función original)
        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const descripcion = p.querySelector('.descripcionh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre) {
                datosIndexados.push({ nombre, descripcion, promptVisual });
            }
        });

        if (datosIndexados.length > 0) {
            const contextoPersonajes = datosIndexados.map(p => `- ${p.nombre}: ${p.descripcion}`).join('\n');
            const promptAnalisis = `
                **Contexto:** Tienes una lista de personajes y sus descripciones:
                ${contextoPersonajes}
                **Tarea:** Lee el siguiente texto de una escena y devuelve ÚNICAMENTE un objeto JSON con una clave "personajes_en_escena" que contenga un array con los NOMBRES EXACTOS de los personajes de la lista que aparecen en el texto. Si no aparece ninguno, devuelve un array vacío.
                **Texto de la escena:** "${userPrompt}"
            `;
            if (typeof llamarIAConFeedback === 'function') {
                const respuestaAnalisis = await llamarIAConFeedback(promptAnalisis, "Identificando personajes en toma...", 'gemini-1.5-flash', true);
                if (respuestaAnalisis && Array.isArray(respuestaAnalisis.personajes_en_escena)) {
                    const nombresPersonajes = respuestaAnalisis.personajes_en_escena;
                    const promptsVisuales = nombresPersonajes
                        .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                        .filter(Boolean)
                        .join('. ');
                    if (promptsVisuales) {
                        promptFinal += `\n\n**Instrucciones visuales de personajes (muy importante):** ${promptsVisuales}`;
                    }
                }
            }
        }

        // FASE 2: GENERACIÓN DE IMAGEN (Lógica reutilizada de tu función original)
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("Error de configuración: La 'apiKey' global no está definida.");
        }
        
        const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const payload = {
            "contents": [{
                "parts": [
                    { "text": promptFinal },
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
                console.log(`Enviando petición para imagen de toma (Intento ${attempt}/${maxRetries})...`);
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
                    const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    toma.imagen = pngDataUrl;
                    renderEscenasUI();
                    console.log(`Imagen generada y asignada a la toma ${toma.id}.`);
                    return; // Éxito, salir de la función
                } else {
                    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
                    throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`Intento ${attempt} fallido:`, error);
                if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw lastError || new Error("Error desconocido tras múltiples intentos.");

    } catch (error) {
        alert(`No se pudo generar la imagen. Error: ${error.message || "Error desconocido."}`);
        console.error("Error en generarImagenParaTomaConIA:", error);
    } finally {
        if (tomaContainer) {
            tomaContainer.classList.remove('toma-procesando-individual');
        }
    }
}


/**
 * Genera secuencialmente las imágenes para todas las tomas de la escena activa.
 */
async function generarGraficosSecuencialmente() {
    const boton = document.getElementById('generargraficos');
    if (!boton || boton.disabled) return;

    const originalButtonText = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Generando...';

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);

    if (!escenaActiva || !escenaActiva.tomas || escenaActiva.tomas.length === 0) {
        alert("No hay tomas en la escena activa para generar gráficos.");
        boton.disabled = false;
        boton.textContent = originalButtonText;
        return;
    }

    const style = document.createElement('style');
    style.id = 'toma-procesando-style-secuencial';
    style.textContent = `
        .toma-procesando-secuencial .toma-imagen-area {
            outline: 3px solid #0d6efd;
            box-shadow: 0 0 15px rgba(13, 110, 253, 0.7);
            transition: outline 0.3s ease, box-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    for (const toma of escenaActiva.tomas) {
        const tomaContainer = document.querySelector(`.toma-card[data-toma-id="${toma.id}"]`);
        if (!tomaContainer) continue;

        // Para la generación secuencial, usaremos el guion conceptual como base.
        const prompt = toma.guionConceptual;
        if (!prompt || !prompt.trim() || toma.imagen) {
            console.log(`Saltando toma ${toma.id} por falta de guion conceptual o por tener ya una imagen.`);
            continue;
        }
        
        tomaContainer.classList.add('toma-procesando-secuencial');
        tomaContainer.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        try {
            // Reutilizamos la misma lógica de generación individual
            await generarImagenParaTomaConIA(toma.id);
        } catch (error) {
            console.error(`Error al generar imagen para la toma ${toma.id} en modo secuencial:`, error);
            // El manejo de errores ya está dentro de generarImagenParaTomaConIA
        } finally {
            tomaContainer.classList.remove('toma-procesando-secuencial');
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa entre generaciones
    }

    document.getElementById('toma-procesando-style-secuencial')?.remove();
    boton.disabled = false;
    boton.textContent = originalButtonText;
    alert("Generación de gráficos de la escena completada.");
}
/**
 * NUEVA FUNCIÓN: Genera en lote imágenes para la toma actual y las 8 siguientes.
 * @param {number} startIndex - El índice de la toma inicial en el array de tomas de la escena activa.
 */
async function generarMultiplesImagenesParaTomaConIA(startIndex) {
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) {
        alert("No se encontró la escena activa.");
        return;
    }

    const BATCH_SIZE = 9;
    const tomasParaProcesar = escenaActiva.tomas.slice(startIndex, startIndex + BATCH_SIZE);

    if (tomasParaProcesar.length === 0) {
        alert("No hay tomas suficientes para iniciar la generación en lote desde este punto.");
        return;
    }

    if (!confirm(`¿Confirmas la generación de ${tomasParaProcesar.length} imágenes con IA (la toma actual y las ${tomasParaProcesar.length - 1} siguientes)?`)) {
        return;
    }
    
    // Se asume que 'mostrarIndicadorCarga' está definida globalmente en main.js
    if (typeof mostrarIndicadorCarga !== 'function') {
        console.error("La función global 'mostrarIndicadorCarga' no fue encontrada.");
        alert("Error crítico: La función del indicador de carga no está disponible.");
        return;
    }

    mostrarIndicadorCarga(true, `Iniciando lote de ${tomasParaProcesar.length} imágenes...`);

    try {
        for (let i = 0; i < tomasParaProcesar.length; i++) {
            const toma = tomasParaProcesar[i];
            
            mostrarIndicadorCarga(true, `Generando imagen ${i + 1} de ${tomasParaProcesar.length}...`);

            // Saltar si la toma ya tiene imagen o no tiene guion conceptual
            if (toma.imagen || !toma.guionConceptual.trim()) {
                console.log(`Saltando la toma en el índice ${startIndex + i} porque ya tiene imagen o le falta guion.`);
                continue;
            }

            // La función 'generarImagenParaTomaConIA' se encarga de la lógica de generación
            // individual, incluyendo el feedback visual en la propia toma.
            await generarImagenParaTomaConIA(toma.id);
            
            // Pausa para evitar posibles límites de frecuencia de la API y para dar feedback visual
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        alert(`Generación en lote de ${tomasParaProcesar.length} imágenes ha finalizado.`);

    } catch (error) {
        console.error("Ocurrió un error durante la generación en lote:", error);
        alert("Ocurrió un error durante la generación en lote. Consulta la consola para más detalles.");
    } finally {
        mostrarIndicadorCarga(false);
    }
}
/**
 * NUEVA FUNCIÓN: Genera una imagen para una toma específica usando IA.
 * Adapta la lógica de `generarImagenParaFrameConIA`.
 * @param {string} tomaId - El ID de la toma para la que se generará una imagen.
 */
async function generarImagenParaTomaConIA(tomaId) {
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) return;
    const toma = escenaActiva.tomas.find(t => t.id === tomaId);

    if (!toma || !toma.guionConceptual.trim()) {
        alert("Por favor, escribe un guion conceptual en la toma antes de generar una imagen.");
        return;
    }

    const tomaContainer = document.querySelector(`.toma-card[data-toma-id="${toma.id}"]`);
    if (tomaContainer) {
        tomaContainer.classList.add('toma-procesando-individual');
    }

    try {
        const userPrompt = toma.guionConceptual.trim();
        let promptFinal = `Crea una ilustración cinematográfica SIN TEXTO para la siguiente escena: "${userPrompt}". El aspecto debe ser de 16:9, panorámico horizontal y de alta calidad. EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN.`;

        // FASE 1: ANÁLISIS DE PERSONAJES (Lógica reutilizada de tu función original)
        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const descripcion = p.querySelector('.descripcionh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre) {
                datosIndexados.push({ nombre, descripcion, promptVisual });
            }
        });

        if (datosIndexados.length > 0) {
            const contextoPersonajes = datosIndexados.map(p => `- ${p.nombre}: ${p.descripcion}`).join('\n');
            const promptAnalisis = `
                **Contexto:** Tienes una lista de personajes y sus descripciones:
                ${contextoPersonajes}
                **Tarea:** Lee el siguiente texto de una escena y devuelve ÚNICAMENTE un objeto JSON con una clave "personajes_en_escena" que contenga un array con los NOMBRES EXACTOS de los personajes de la lista que aparecen en el texto. Si no aparece ninguno, devuelve un array vacío.
                **Texto de la escena:** "${userPrompt}"
            `;
            if (typeof llamarIAConFeedback === 'function') {
                const respuestaAnalisis = await llamarIAConFeedback(promptAnalisis, "Identificando personajes en toma...", 'gemini-1.5-flash', true);
                if (respuestaAnalisis && Array.isArray(respuestaAnalisis.personajes_en_escena)) {
                    const nombresPersonajes = respuestaAnalisis.personajes_en_escena;
                    const promptsVisuales = nombresPersonajes
                        .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                        .filter(Boolean)
                        .join('. ');
                    if (promptsVisuales) {
                        promptFinal += `\n\n**Instrucciones visuales de personajes (muy importante):** ${promptsVisuales}`;
                    }
                }
            }
        }

        // FASE 2: GENERACIÓN DE IMAGEN (Lógica reutilizada de tu función original)
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("Error de configuración: La 'apiKey' global no está definida.");
        }
        
        const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const payload = {
            "contents": [{
                "parts": [
                    { "text": promptFinal },
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
                console.log(`Enviando petición para imagen de toma (Intento ${attempt}/${maxRetries})...`);
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
                    const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    toma.imagen = pngDataUrl;
                    renderEscenasUI();
                    console.log(`Imagen generada y asignada a la toma ${toma.id}.`);
                    return; // Éxito, salir de la función
                } else {
                    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
                    throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`Intento ${attempt} fallido:`, error);
                if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw lastError || new Error("Error desconocido tras múltiples intentos.");

    } catch (error) {
        alert(`No se pudo generar la imagen. Error: ${error.message || "Error desconocido."}`);
        console.error("Error en generarImagenParaTomaConIA:", error);
    } finally {
        if (tomaContainer) {
            tomaContainer.classList.remove('toma-procesando-individual');
        }
    }
}


/**
 * Genera secuencialmente las imágenes para todas las tomas de la escena activa.
 */
async function generarGraficosSecuencialmente() {
    const boton = document.getElementById('generargraficos');
    if (!boton || boton.disabled) return;

    const originalButtonText = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Generando...';

    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);

    if (!escenaActiva || !escenaActiva.tomas || escenaActiva.tomas.length === 0) {
        alert("No hay tomas en la escena activa para generar gráficos.");
        boton.disabled = false;
        boton.textContent = originalButtonText;
        return;
    }

    const style = document.createElement('style');
    style.id = 'toma-procesando-style-secuencial';
    style.textContent = `
        .toma-procesando-secuencial .toma-imagen-area {
            outline: 3px solid #0d6efd;
            box-shadow: 0 0 15px rgba(13, 110, 253, 0.7);
            transition: outline 0.3s ease, box-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    for (const toma of escenaActiva.tomas) {
        const tomaContainer = document.querySelector(`.toma-card[data-toma-id="${toma.id}"]`);
        if (!tomaContainer) continue;

        // Para la generación secuencial, usaremos el guion conceptual como base.
        const prompt = toma.guionConceptual;
        if (!prompt || !prompt.trim() || toma.imagen) {
            console.log(`Saltando toma ${toma.id} por falta de guion conceptual o por tener ya una imagen.`);
            continue;
        }
        
        tomaContainer.classList.add('toma-procesando-secuencial');
        tomaContainer.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        
        try {
            // Reutilizamos la misma lógica de generación individual
            await generarImagenParaTomaConIA(toma.id);
        } catch (error) {
            console.error(`Error al generar imagen para la toma ${toma.id} en modo secuencial:`, error);
            // El manejo de errores ya está dentro de generarImagenParaTomaConIA
        } finally {
            tomaContainer.classList.remove('toma-procesando-secuencial');
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña pausa entre generaciones
    }

    document.getElementById('toma-procesando-style-secuencial')?.remove();
    boton.disabled = false;
    boton.textContent = originalButtonText;
    alert("Generación de gráficos de la escena completada.");
}

// --- FUNCIONES DE DRAG AND DROP ---
function handleDragStart(e) {
    draggedTomaId = e.target.closest('.toma-card').dataset.tomaId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedTomaId);
    setTimeout(() => {
        e.target.closest('.toma-card').classList.add('toma-dragging');
    }, 0);
}
function handleDragEnd(e) {
    const draggedElement = document.querySelector('.toma-dragging');
    if (draggedElement) {
        draggedElement.classList.remove('toma-dragging');
    }
    draggedTomaId = null;
    removeDropIndicator();
}
function handleDragOver(e) {
    e.preventDefault();
    const targetCard = e.target.closest('.toma-card');
    if (targetCard && targetCard.dataset.tomaId !== draggedTomaId) {
        const timeline = document.getElementById('tomas-timeline');
        const rect = targetCard.getBoundingClientRect();
        const offset = e.clientX - rect.left;
        removeDropIndicator();
        const indicator = createDropIndicator();
        if (offset < rect.width / 2) {
            timeline.insertBefore(indicator, targetCard);
        } else {
            timeline.insertBefore(indicator, targetCard.nextSibling);
        }
    }
}
function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
         removeDropIndicator();
    }
}
function handleDrop(e) {
    e.preventDefault();
    removeDropIndicator();
    const targetCard = e.target.closest('.toma-card');
    if (!draggedTomaId || !targetCard || targetCard.dataset.tomaId === draggedTomaId) {
        return;
    }
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) return;
    const fromIndex = escenaActiva.tomas.findIndex(t => t.id === draggedTomaId);
    let toIndex = escenaActiva.tomas.findIndex(t => t.id === targetCard.dataset.tomaId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [draggedItem] = escenaActiva.tomas.splice(fromIndex, 1);
    if (fromIndex < toIndex) toIndex--;
    const rect = targetCard.getBoundingClientRect();
    const offset = e.clientX - rect.left;
    const insertAtIndex = (offset < rect.width / 2) ? toIndex : toIndex + 1;
    escenaActiva.tomas.splice(insertAtIndex, 0, draggedItem);
    renderEscenasUI();
}
function handleDragOverTimeline(e) {
    e.preventDefault();
    const isOverCard = e.target.closest('.toma-card');
    if (!isOverCard) {
        removeDropIndicator();
        const indicator = createDropIndicator();
        document.getElementById('tomas-timeline').appendChild(indicator);
    }
}
function handleDropOnTimeline(e){
    e.preventDefault();
     if (e.target.id !== 'tomas-timeline' || !draggedTomaId) {
         removeDropIndicator();
         return;
     }
    const escenaActiva = storyScenes.find(s => s.id === activeSceneId);
    if (!escenaActiva) return;
    const fromIndex = escenaActiva.tomas.findIndex(t => t.id === draggedTomaId);
    if (fromIndex === -1) return;
    const [draggedItem] = escenaActiva.tomas.splice(fromIndex, 1);
    escenaActiva.tomas.push(draggedItem);
    removeDropIndicator();
    renderEscenasUI();
}
function handleDragLeaveTimeline(e) {
    if (e.target.id === 'tomas-timeline' && !e.relatedTarget.closest('#tomas-timeline')) {
        removeDropIndicator();
    }
}
function createDropIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'toma-drop-indicator';
    return indicator;
}
function removeDropIndicator() {
    const existingIndicator = document.querySelector('.toma-drop-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
}

// --- Función de utilidad para convertir File a Base64 ---
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}
