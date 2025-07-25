let apiKey = localStorage.getItem('silenosGoogleApiKey') || ""; // Intenta cargar la clave al inicio

// Es importante que 'apiKey' y 'ultimaHistoriaGeneradaJson' sean accesibles por este script.
// Si 'ultimaHistoriaGeneradaJson' se define en 'geminialfa.js', asegúrate que 'geminialfa.js' se carga antes o que la variable es global.

// Helper function for delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function enviartexto() {
    const userInput = document.getElementById("user-input").value;
    if (!userInput) return;
    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Tú:</strong> ${userInput}</p>`;
        document.getElementById("user-input").value = "";
    }
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + apiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: userInput }] }] })
        });
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo obtener respuesta.";
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>IA:</strong> ${reply}</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
    } catch (error) {
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += "<p><strong>Error:</strong> No se pudo conectar a Gemini. " + error.message + "</p>";
        }
    }
}

// Actualiza la visualización de la API key al cargar la página
if (document.getElementById("apiKeyDisplay")) {
    document.getElementById("apiKeyDisplay").textContent = apiKey ? "Definida" : "[🔴]";
}

if(document.getElementById('apiInput')){
    document.getElementById('apiInput').value = apiKey;
}


function updateApiKey() {
    const newKey = document.getElementById("apiInput").value;
    if (newKey.trim() !== "") {
        apiKey = newKey;
        
        // --- LÍNEA AÑADIDA ---
        // Guarda la clave en localStorage para que otras ventanas puedan acceder a ella.
       // localStorage.setItem('silenosGoogleApiKey', newKey);
        
        if (document.getElementById("apiKeyDisplay")) {
            document.getElementById("apiKeyDisplay").textContent = "🟢";
        }
        alert("API Key actualizada correctamente.");
    } else {
        alert("Por favor, ingresa una API Key válida.");
    }
}

/**
 * FUNCIÓN AUXILIAR (NECESARIA)
 * Lee el contenido HTML de un guion guardado y lo vuelve a convertir en una estructura
 * de datos (un objeto similar a 'ultimaHistoriaGeneradaJson') para ser procesado.
 * @param {object} guionObject - El objeto completo del guion desde 'guionLiterarioData'.
 * @returns {object|null} Un objeto con la estructura de la historia o null si no se puede parsear.
 */
function reconstruirJsonDesdeGuionHTML(guionObject) {
    if (!guionObject || !guionObject.contenido) {
        console.error("El objeto de guion proporcionado o su contenido están vacíos.");
        return null;
    }
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(guionObject.contenido, 'text/html');
        const historiaReconstruida = {
            titulo_historia: doc.querySelector('h1')?.textContent.trim() || guionObject.titulo,
            historia: []
        };
        const escenasHTML = doc.querySelectorAll('.guion-ia-escena');
        if (escenasHTML.length === 0) {
            console.warn("No se encontraron secciones '.guion-ia-escena' en el HTML del guion.");
            return null;
        }
        escenasHTML.forEach(escenaEl => {
            const frames = [];
            escenaEl.querySelectorAll('.guion-ia-frame p').forEach(frameP => {
                frames.push({ contenido: frameP.innerText.trim() });
            });
            historiaReconstruida.historia.push({
                titulo_escena: escenaEl.querySelector('h3')?.textContent.trim() || 'Escena sin título',
                frames: frames
            });
        });
        console.log("Guion reconstruido desde HTML:", historiaReconstruida);
        return historiaReconstruida;
    } catch (error) {
        console.error("Error al reconstruir la estructura del guion desde el HTML:", error);
        return null;
    }
}


/**
 * VERSIÓN MODIFICADA DE TU FUNCIÓN
 * NO TOCA LA LÓGICA INTERNA, solo cambia el origen de los datos.
 * @param {string} guionSeleccionadoTitulo - Título del guion seleccionado en el modal.
 */
// Reemplaza esta función en datos/gemini.js

/**
 * Desarrolla los frames de un guion utilizando la función reutilizable callGenerativeApi.
 * Muestra un mensaje de "pensando" en el chat antes de cada llamada a la IA.
 *
 * @param {string} guionSeleccionadoTitulo - Título del guion seleccionado en el modal.
 */
/**
 * Desarrolla los frames de un guion utilizando la función reutilizable callGenerativeApi.
 * Esta versión es más robusta gracias a la nueva lógica de reintentos y limpieza de JSON.
 * @param {string} guionSeleccionadoTitulo - Título del guion seleccionado en el modal.
 */
async function desarrollarFramesDesdeGeminimente(guionSeleccionadoTitulo) {
    const guionObjeto = guionLiterarioData.find(g => g.titulo === guionSeleccionadoTitulo);
    if (!guionObjeto) {
        alert(`Error: No se pudo encontrar el guion con el título "${guionSeleccionadoTitulo}".`);
        return;
    }

    const datosHistoria = reconstruirJsonDesdeGuionHTML(guionObjeto);

    if (!datosHistoria || !datosHistoria.historia || datosHistoria.historia.length === 0) {
        alert("El guion seleccionado no contiene una estructura de historia válida o no se pudo procesar.");
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += "<p><strong>Error:</strong> El guion seleccionado no tiene un formato procesable.</p>";
        }
        return;
    }

    const nombreBaseReal = datosHistoria.titulo_historia;
    const escenasDisponibles = datosHistoria.historia;
    const escenasACrearReal = escenasDisponibles.length;

    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Info Ejecución:</strong> Iniciando desarrollo de historia desde el guion "${nombreBaseReal}". Se procesarán ${escenasACrearReal} escenas.</p>`;
    }

    try {
        if (typeof crearEscenasAutomaticamente === 'function') {
            crearEscenasAutomaticamente(nombreBaseReal, escenasACrearReal, 0);
        } else {
            alert("Error: La función crearEscenasAutomaticamente no está disponible.");
            return;
        }

        const idsEscenasCreadasEnPrincipal = Object.keys(escenas)
            .filter(id => id.startsWith(`${libroActivoId}-${nombreBaseReal}`))
            .sort();

        for (let i = 0; i < idsEscenasCreadasEnPrincipal.length; i++) {
            const idEscenaPrincipal = idsEscenasCreadasEnPrincipal[i];
            const escenaOriginalData = datosHistoria.historia[i];

            if (!escenaOriginalData) continue;

            if (escenas[idEscenaPrincipal]) {
                escenas[idEscenaPrincipal].texto = `${nombreBaseReal} ${String(i + 1).padStart(3, '0')} - ${escenaOriginalData.titulo_escena}`;
                escenas[idEscenaPrincipal].frames = []; // Limpiamos frames existentes
            } else {
                continue;
            }
            
            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Procesando Escena:</strong> "${escenas[idEscenaPrincipal].texto}"</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }

            if (!escenaOriginalData.frames || escenaOriginalData.frames.length === 0) {
                 if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Info:</strong> La escena "${escenaOriginalData.titulo_escena}" no tenía frames. Se deja vacía.</p>`;
                continue;
            }

            for (let j = 0; j < escenaOriginalData.frames.length; j++) {
                const frameOriginalData = escenaOriginalData.frames[j];
                const promptDesarrollo = `
Contexto General de la Historia: ${datosHistoria.titulo_historia || 'N/A'}
Capítulo Actual (del plan original): "${escenaOriginalData.titulo_escena || `Escena ${i+1}`}"
Contenido del capitulo Original a Desarrollar: "${frameOriginalData.contenido || 'Sin contenido inicial'}"
Tarea:
1. Desarrolla y expande el "Contenido del capitulo Original a Desarrollar" de manera coherente y detallada.
2. Una vez desarrollado, divide el contenido que has generado en una secuencia lógica de puntos clave o sub-capitulos.
3. Responde ÚNICAMENTE con un objeto JSON válido. No incluyas ningún texto explicativo ni marcadores como \`\`\`json o cualquiero otro.
La estructura exacta del JSON debe ser:
{
  "nuevos_frames_desarrollados": [
    { "texto_sub_frame": "Texto completo del primer sub-capitulo desarrollado." },
    { "texto_sub_frame": "Texto completo del segundo sub-capitulo desarrollado." }
  ]
}`;
                
                // --- INICIO DE LA LÓGICA DE REINTENTOS POR FRAME ---
                const maxFrameRetries = 4;
                let frameGeneratedSuccessfully = false;

                for (let attempt = 1; attempt <= maxFrameRetries; attempt++) {
                    let respuestaBrutaParaDebug = "";
                    try {
                        if (typeof chatDiv !== 'undefined') {
                            chatDiv.innerHTML += `<p><strong>Enviando a IA (Intento ${attempt}/${maxFrameRetries} 🧠):</strong> Desarrollando punto clave ${j+1} de la escena ("${escenaOriginalData.titulo_escena}")...</p>`;
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        }

                        // Usamos la robusta función callGenerativeApi
                        const respuestaJson = await callGenerativeApi(promptDesarrollo, 'gemini-2.5-flash-lite', true);
                        
                        respuestaBrutaParaDebug = JSON.stringify(respuestaJson, null, 2);
                        const nuevosFrames = respuestaJson.nuevos_frames_desarrollados;

                        if (!nuevosFrames || !Array.isArray(nuevosFrames)) {
                            throw new Error("El JSON de la IA no tiene la estructura esperada (falta 'nuevos_frames_desarrollados').");
                        }

                        if (typeof chatDiv !== 'undefined') {
                            chatDiv.innerHTML += `<p><strong>IA Respondió Correctamente:</strong> Se generaron ${nuevosFrames.length} nuevos frames detallados.</p>`;
                        }

                        nuevosFrames.forEach(subFrame => {
                            if (subFrame && typeof subFrame.texto_sub_frame === 'string') {
                                escenas[idEscenaPrincipal].frames.push({ texto: subFrame.texto_sub_frame, imagen: "" });
                            }
                        });
                        
                        frameGeneratedSuccessfully = true;
                        break; // ¡Éxito! Salimos del bucle de reintentos.

                    } catch (error) {
                        if (typeof chatDiv !== 'undefined') {
                            chatDiv.innerHTML += `<p><strong>Fallo en Intento ${attempt}/${maxFrameRetries}:</strong> ${error.message}</p><p><strong>Respuesta recibida:</strong><pre>${respuestaBrutaParaDebug.substring(0, 300)}...</pre></p>`;
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        }
                        
                        if (attempt === maxFrameRetries) {
                            // Si es el último intento, registramos el error definitivo.
                            if (typeof chatDiv !== 'undefined') {
                                chatDiv.innerHTML += `<p><strong>Error Definitivo de IA (Punto Clave ${j+1}):</strong> No se pudo generar el frame después de ${maxFrameRetries} intentos.</p>`;
                            }
                            escenas[idEscenaPrincipal].frames.push({ texto: `(Error al generar este frame. Mensaje: ${error.message})`, imagen: "" });
                        } else {
                            // Esperamos un poco antes del siguiente reintento
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }
                // --- FIN DE LA LÓGICA DE REINTENTOS POR FRAME ---

                if (typeof actualizarLista === 'function') actualizarLista();
                // La pausa de 8 segundos se ejecuta después de procesar un punto clave (con éxito o tras fallar todos los reintentos)
                await new Promise(resolve => setTimeout(resolve, 8000));
            }
        }
    } finally {
        if (typeof guardarCambios === 'function') guardarCambios();
        if (typeof actualizarLista === 'function') actualizarLista();
        alert(`Proceso de desarrollo de frames completado.`);
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>Proceso Completado:</strong> El desarrollo de la historia ha finalizado.</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
    }
}



/**
 * NUEVA FUNCIÓN AUXILIAR (CORREGIDA Y ACTIVADA)
 * Lee el contenido HTML de un guion guardado y lo vuelve a convertir en una estructura
 * de datos (un objeto similar a 'ultimaHistoriaGeneradaJson') para ser procesado.
 * @param {object} guionObject - El objeto completo del guion desde 'guionLiterarioData'.
 * @returns {object|null} Un objeto con la estructura de la historia o null si no se puede parsear.
 */
function reconstruirJsonDesdeGuionHTML(guionObject) {
    if (!guionObject || !guionObject.contenido) {
        console.error("El objeto de guion proporcionado o su contenido están vacíos.");
        return null;
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(guionObject.contenido, 'text/html');

        const historiaReconstruida = {
            titulo_historia: doc.querySelector('h1')?.textContent.trim() || guionObject.titulo,
            historia: []
        };

        const escenasHTML = doc.querySelectorAll('.guion-ia-escena');
        if (escenasHTML.length === 0) {
            console.warn("No se encontraron secciones '.guion-ia-escena' en el HTML del guion.");
            return null; 
        }

        escenasHTML.forEach(escenaEl => {
            const frames = [];
            // Usamos .querySelectorAll para ser más robustos
            escenaEl.querySelectorAll('.guion-ia-frame p').forEach(frameP => {
                frames.push({ contenido: frameP.innerText.trim() });
            });
            
            historiaReconstruida.historia.push({
                titulo_escena: escenaEl.querySelector('h3')?.textContent.trim() || 'Escena sin título',
                frames: frames
            });
        });

        console.log("Guion reconstruido desde HTML:", historiaReconstruida);
        return historiaReconstruida;

    } catch (error) {
        console.error("Error al reconstruir la estructura del guion desde el HTML:", error);
        return null;
    }
}
