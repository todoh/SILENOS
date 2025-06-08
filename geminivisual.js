// ===================================
// GESTIÓN DE GENERACIÓN VISUAL (TOMAS)
// ===================================

/**
 * Inicia el proceso de generación de tomas para un guion literario generado por IA.
 * Este proceso ahora incluye una fase de creación de un "Universo Visual"
 * para dar un contexto detallado a la IA antes de generar las tomas.
 * @param {number} indiceCapitulo El índice del capítulo en guionLiterarioData.
 */
async function iniciarGeneracionDeTomas(indiceCapitulo) {
    const chatDiv = window.chatDiv || document.getElementById('chat');

    // --- FASE 1: VALIDACIÓN ---
    if (chatDiv) chatDiv.innerHTML += `<p><strong>Proceso Visual Iniciado:</strong> Validando datos...</p>`;
    
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

    try {
        // --- FASE 2: CREACIÓN DEL UNIVERSO VISUAL ---
        if (chatDiv) {
            chatDiv.innerHTML += `<hr><p><strong>Fase 1/3: Creando el Universo Visual...</strong></p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        const { planteamientoGeneral, planteamientoPorEscenas } = extraerPlanteamientos(capituloGuion.contenido);
        const resumenTrama = `Planteamiento General: ${planteamientoGeneral}\n\nPlan de Escenas: ${planteamientoPorEscenas}`;

        const datosAgrupados = recolectarYAgruparDatos(); // Función de geminialfa.js
        
        // 2.1. Síntesis visual de la trama
        const promptSintesisTrama = `Basado en el siguiente resumen de la trama, genera una "Síntesis Visual General". Describe el estilo artístico, la paleta de colores principal, la atmósfera general y el tono cinematográfico de la historia.\n\nTrama:\n${resumenTrama}`;
        const sintesisVisualTrama = await llamarIAConFeedback(promptSintesisTrama, "sintetizando visualmente la trama", false);

        // 2.2. Enriquecimiento visual de los "Datos" en un directorio estructurado.
        const directorioVisual = new Map();
        if (Object.keys(datosAgrupados).length > 0) {
            for (const categoria in datosAgrupados) {
                const datosCategoria = datosAgrupados[categoria].map(d => `- ${d.nombre}: ${d.descripcion}`).join('\n');
                
                const promptEnriquecer = `Dada la siguiente categoría de elementos y sus descripciones, 
                genera una descripción VISUAL detallada para CADA uno.
Categoría: ${categoria}
Elementos:
${datosCategoria}

Responde ÚNICAMENTE con un objeto JSON válido con la estructura de un array:
[
  {
    "nombre_elemento": "Nombre exacto del primer elemento",
    "descripcion_visual": "Descripción visual detallada y evocadora del primer elemento."
  }
]`;
                const descripcionesEnriquecidasJson = await llamarIAConFeedback(promptEnriquecer, `enriqueciendo datos para ${categoria}`, true);
                
                if (Array.isArray(descripcionesEnriquecidasJson)) {
                    descripcionesEnriquecidasJson.forEach(item => {
                        directorioVisual.set(item.nombre_elemento.toLowerCase(), item.descripcion_visual);
                    });
                }
            }
        }
        
        if (chatDiv) {
            let resumenDirectorioHTML = '<ul>';
            directorioVisual.forEach((desc, nombre) => {
                resumenDirectorioHTML += `<li><strong>${nombre.charAt(0).toUpperCase() + nombre.slice(1)}:</strong> ${desc}</li>`;
            });
            resumenDirectorioHTML += '</ul>';
            chatDiv.innerHTML += `<p><strong>Directorio Visual Creado:</strong></p><div class="visual-universe-summary"><h4>Síntesis General</h4><p>${sintesisVisualTrama}</p><h4>Elementos Clave</h4>${resumenDirectorioHTML}</div>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        // --- FASE 3: GENERACIÓN DE TOMAS ---
        if (chatDiv) {
            chatDiv.innerHTML += `<hr><p><strong>Fase 2/3: Preparando el storyboard...</strong></p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
        const nuevaEscenaStoryId = crearNuevaEscenaStory(tituloGuion);
        
        if (chatDiv) {
            chatDiv.innerHTML += `<p><strong>Fase 3/3: Generando tomas cinematográficas...</strong></p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        for (const idEscena of escenasCapitulo) {
            const escena = escenas[idEscena];
            if (!escena || !escena.frames || escena.frames.length === 0) continue;

            if (chatDiv) chatDiv.innerHTML += `<p><strong>Procesando:</strong> Escena "${escena.texto}".</p>`;

            for (const [index, frame] of escena.frames.entries()) {
                if (chatDiv) {
                    chatDiv.innerHTML += `<p><strong>Enviando a IA:</strong> Frame ${index + 1} de ${escena.frames.length} ("${escena.texto}")...</p>`;
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                }

                // Identificar elementos relevantes para ESTE frame específico.
                let contextoTomaEspecifico = '';
                directorioVisual.forEach((descripcion, nombre) => {
                    if (frame.texto.toLowerCase().includes(nombre)) {
                        contextoTomaEspecifico += `Descripción de ${nombre.charAt(0).toUpperCase() + nombre.slice(1)}: ${descripcion}\n`;
                    }
                });
                
                const promptFinal = `
--- INICIO CONTEXTO VISUAL GLOBAL (Estilo General) ---
${sintesisVisualTrama}
--- FIN CONTEXTO VISUAL GLOBAL ---

${contextoTomaEspecifico ? `--- INICIO DESCRIPCIONES DE ELEMENTOS RELEVANTES PARA ESTA TOMA ---\n${contextoTomaEspecifico}--- FIN DESCRIPCIONES DE ELEMENTOS RELEVANTES ---\n` : ''}
--- INICIO TAREA ESPECÍFICA ---
Contenido del Frame a procesar:
"${frame.texto}"

Tarea:
1.  Analiza el "Contenido del Frame a procesar" basándote en el Estilo General y las descripciones de elementos relevantes.
2.  Divide el frame en las tomas cinematográficas necesarias.
3.  Para CADA toma, genera:
    -   Un "guion_conceptual": El diálogo, acción o descripción de esa toma.
    -   Un "prompt_visual": Párrafo en inglés, AUTOCONTENIDO y DETALLADO. Describe la composición, personajes, vestuario, entorno, iluminación, ángulo de cámara, etc. INCLUYE EN EL PROMT TODOS LOS DETALLES DE DISEÑO VISUAL DE LOS PERSONAJES QUE SALGAN EN LA TOMA ASI COMO DE LOS LUGARES, OBJETOS, ETC..**

Responde ÚNICAMENTE con un objeto JSON válido. Estructura:
{
  "tomas_generadas": [
    {
      "guion_conceptual": "Diálogo/descripción de la toma.",
      "prompt_visual": "Detailed, self-contained image prompt..."
    }
  ]
}`;
                
                const respuestaJson = await llamarIAConFeedback(promptFinal, `Frame ${index + 1}/${escena.frames.length} de la escena ${idEscena}`);

                if (respuestaJson && respuestaJson.tomas_generadas && Array.isArray(respuestaJson.tomas_generadas)) {
                    if (chatDiv) chatDiv.innerHTML += `<p><strong>IA Respondió:</strong> Se generaron ${respuestaJson.tomas_generadas.length} tomas para el frame.</p>`;
                    
                    respuestaJson.tomas_generadas.forEach(tomaData => {
                        agregarTomaAEscenaStory(nuevaEscenaStoryId, {
                            guionConceptual: tomaData.guion_conceptual || "",
                            guionTecnico: tomaData.prompt_visual || ""
                        });
                    });
                    
                    if (typeof renderEscenasUI === 'function') renderEscenasUI();

                } else {
                    throw new Error("La respuesta de la IA no contiene 'tomas_generadas' en el formato esperado.");
                }

                await sleep(1000); 
            }
        }

        if (chatDiv) {
            chatDiv.innerHTML += `<hr><p><strong>PROCESO COMPLETADO:</strong> La generación de tomas para "${tituloGuion}" ha finalizado. Puedes ver el resultado en la sección 'Escenas'.</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
        alert(`Proceso de generación de tomas completado para "${tituloGuion}".`);
        cerrartodo();
        abrir('escenah');

    } catch (error) {
        if (chatDiv) {
            chatDiv.innerHTML += `<p><strong>Error Fatal en Generación Visual:</strong> ${error.message}</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
        alert("Ocurrió un error durante la generación de tomas. Revisa la consola para más detalles.");
        console.error("Error en iniciarGeneracionDeTomas:", error);
    }
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
        guionTecnico: tomaData.guionTecnico || "", // Usamos guionTecnico para el prompt visual
        guionArtistico: ""
    };
    escena.tomas.push(nuevaToma);
}
