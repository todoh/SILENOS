// ===================================
// GESTIÓN DE GENERACIÓN VISUAL (TOMAS)
// ===================================

/**
 * Inicia el proceso de generación de tomas para un guion literario generado por IA.
 * @param {number} indiceCapitulo El índice del capítulo en guionLiterarioData.
 */
async function iniciarGeneracionDeTomas(indiceCapitulo) {
    const chatDiv = window.chatDiv || document.getElementById('chat');
    
    // 1. Validar que el capítulo existe y tiene escenas correspondientes
    if (indiceCapitulo < 0 || indiceCapitulo >= guionLiterarioData.length) {
        alert("Error: No se ha seleccionado un capítulo válido.");
        return;
    }
    
    const capituloGuion = guionLiterarioData[indiceCapitulo];
    const tituloGuion = capituloGuion.titulo;

    const escenasCapitulo = Object.keys(escenas)
        .filter(id => escenas[id].texto.startsWith(tituloGuion) && escenas[id].generadoPorIA)
        .sort((a, b) => a.localeCompare(b));

    if (escenasCapitulo.length === 0) {
        alert("No se encontraron escenas detalladas para este guion en la sección 'Capítulos'. Por favor, asegúrate de haber usado primero la opción 'Insertar Frames en la Historia'.");
        return;
    }

    if (chatDiv) {
        chatDiv.innerHTML += `<p><strong>Proceso Visual Iniciado:</strong> Preparando la generación de tomas para el guion "${tituloGuion}".</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    // 2. Preparar el contexto y la nueva escena de storyboard
    const { planteamientoGeneral, planteamientoPorEscenas } = extraerPlanteamientos(capituloGuion.contenido);
    const contextovisual = `Contexto General de la Historia: ${planteamientoGeneral}\n\nPlan de Escenas: ${planteamientoPorEscenas}`;

    // Crear una nueva escena en la sección "Escenas" (storyboard)
    const nuevaEscenaStoryId = crearNuevaEscenaStory(tituloGuion);

    // 3. Iterar y procesar cada frame de cada escena
    for (const idEscena of escenasCapitulo) {
        const escena = escenas[idEscena];
        if (!escena || !escena.frames || escena.frames.length === 0) continue;

        if (chatDiv) chatDiv.innerHTML += `<p><strong>Procesando:</strong> Escena "${escena.texto}".</p>`;

        for (const [index, frame] of escena.frames.entries()) {
            if (chatDiv) {
                chatDiv.innerHTML += `<p><strong>Enviando a IA:</strong> Frame ${index + 1} de ${escena.frames.length} ("${escena.texto}")...</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }
            
            const prompt = `
${contextovisual}

Contenido del Frame a procesar:
"${frame.texto}"

Tarea:
1.  Analiza el "Contenido del Frame a procesar" y determina en cuántas tomas cinematográficas se debe dividir para una correcta visualización.
2.  Para cada toma, elabora dos textos:
    - Un "guion_conceptual": Debe contener el diálogo, la voz en off, o la descripción del suceso de esa toma específica.
    - Un "prompt_visual": Debe ser un texto detallado y evocador, en inglés, optimizado para una IA de generación de imágenes (como Midjourney o Stable Diffusion), que describa visualmente la escena, personajes, iluminación, ángulo de cámara y ambiente para esa toma.

Responde ÚNICAMENTE con un objeto JSON válido. No incluyas texto explicativo ni marcadores de código. La estructura debe ser:
{
  "tomas_generadas": [
    {
      "guion_conceptual": "Diálogo o descripción de la primera toma.",
      "prompt_visual": "Detailed image prompt for the first shot."
    }
  ]
}`;
            
            try {
                const respuestaJson = await llamarIAConFeedback(prompt, `Frame ${index + 1}/${escena.frames.length} de la escena ${idEscena}`);

                if (respuestaJson && respuestaJson.tomas_generadas && Array.isArray(respuestaJson.tomas_generadas)) {
                    if (chatDiv) chatDiv.innerHTML += `<p><strong>IA Respondió:</strong> Se generaron ${respuestaJson.tomas_generadas.length} tomas para el frame.</p>`;
                    
                    respuestaJson.tomas_generadas.forEach(tomaData => {
                        agregarTomaAEscenaStory(nuevaEscenaStoryId, {
                            guionConceptual: tomaData.guion_conceptual || "",
                            guionTecnico: tomaData.prompt_visual || "" // Usamos guionTecnico para el prompt visual
                        });
                    });
                    
                    // Actualizar la UI para ver las tomas agregadas en tiempo real
                    if (typeof renderEscenasUI === 'function') {
                        renderEscenasUI();
                    }

                } else {
                    throw new Error("La respuesta de la IA no contiene 'tomas_generadas' en el formato esperado.");
                }

            } catch (error) {
                if (chatDiv) {
                    chatDiv.innerHTML += `<p><strong>Error de IA (Frame ${index + 1}):</strong> ${error.message}</p>`;
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                }
            }

            // Esperar antes de procesar el siguiente frame
            await sleep(1000); 
        }
    }

    if (chatDiv) {
        chatDiv.innerHTML += `<p><strong>PROCESO COMPLETADO:</strong> La generación de tomas para "${tituloGuion}" ha finalizado. Puedes ver el resultado en la sección 'Escenas'.</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
    alert(`Proceso de generación de tomas completado para "${tituloGuion}".`);
    cerrartodo();
    abrir('escenah');
}


// --- FUNCIONES AUXILIARES ---

/**
 * Extrae los planteamientos del contenido HTML del guion.
 * @param {string} contenidoHTML El contenido HTML del capítulo del guion.
 * @returns {{planteamientoGeneral: string, planteamientoPorEscenas: string}}
 */
function extraerPlanteamientos(contenidoHTML) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(contenidoHTML, 'text/html');
    
    let planteamientoGeneral = doc.querySelector('.guion-ia-general p')?.innerText || '';
    
    let planteamientoPorEscenas = '';
    const listaEscenas = doc.querySelectorAll('.guion-ia-general ul li');
    if (listaEscenas.length > 0) {
        const resumenes = Array.from(listaEscenas).map(li => li.innerText);
        planteamientoPorEscenas = resumenes.join('\n');
    }

    return { planteamientoGeneral, planteamientoPorEscenas };
}

/**
 * Crea una nueva escena en el array global 'storyScenes'.
 * @param {string} nombre - El nombre para la nueva escena.
 * @returns {string} El ID de la escena creada.
 */
function crearNuevaEscenaStory(nombre) {
    const nuevaEscena = {
        id: 'escena_story_' + Date.now() + Math.random().toString(36).substring(2, 9),
        nombre: nombre,
        tomas: []
    };
    storyScenes.push(nuevaEscena);
    activeSceneId = nuevaEscena.id; // La hacemos activa
    return nuevaEscena.id;
}

/**
 * Agrega una nueva toma a una escena de storyboard específica.
 * @param {string} escenaId - El ID de la escena a la que se agregará la toma.
 * @param {object} tomaData - Los datos de la toma a agregar.
 */
function agregarTomaAEscenaStory(escenaId, tomaData) {
    const escena = storyScenes.find(s => s.id === escenaId);
    if (!escena) {
        console.error(`No se encontró la escena de storyboard con ID: ${escenaId}`);
        return;
    }
    const nuevaToma = {
        id: 'toma_' + Date.now() + Math.random().toString(36).substring(2, 9),
        duracion: 8,
        imagen: "",
        guionConceptual: tomaData.guionConceptual || "",
        guionTecnico: tomaData.guionTecnico || "",
        guionArtistico: ""
    };
    escena.tomas.push(nuevaToma);
}
