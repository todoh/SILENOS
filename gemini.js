let apiKey = ""; // Reemplaza con tu clave real o asegúrate que se carga desde otro sitio.
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
        const response = await fetch("[https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=](https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=)" + apiKey, {
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

if (document.getElementById("apiKeyDisplay") && apiKey !== "TU_API_KEY_AQUI") {
    document.getElementById("apiKeyDisplay").textContent = apiKey;
}

function updateApiKey() {
    const newKey = document.getElementById("apiInput").value;
    if (newKey.trim() !== "") {
        apiKey = newKey;
        if (document.getElementById("apiKeyDisplay")) {
            document.getElementById("apiKeyDisplay").textContent = apiKey;
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

async function desarrollarFramesDesdeGeminimente(guionSeleccionadoTitulo) {
    const guionObjeto = guionLiterarioData.find(g => g.titulo === guionSeleccionadoTitulo);
    if (!guionObjeto) {
        alert(`Error: No se pudo encontrar el guion con el título "${guionSeleccionadoTitulo}".`);
        return;
    }

    const datosHistoria = reconstruirJsonDesdeGuionHTML(guionObjeto);

    if (!datosHistoria || !datosHistoria.historia || datosHistoria.historia.length === 0) {
        alert("El guion seleccionado no contiene una estructura de historia válida o no se pudo procesar. No se pueden generar los frames.");
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
            if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += "<p><strong>Error Crítico:</strong> La función `crearEscenasAutomaticamente` no se encontró.</p>";
            return;
        }

      const idsEscenasCreadasEnPrincipal = Object.keys(escenas)
    .filter(id => id.startsWith(`${libroActivoId}-${nombreBaseReal}`))
    .sort();

        for (let i = 0; i < idsEscenasCreadasEnPrincipal.length; i++) {
            const idEscenaPrincipal = idsEscenasCreadasEnPrincipal[i];
            const escenaOriginalData = datosHistoria.historia[i];

            if (!escenaOriginalData) {
                if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Info:</strong> No hay más datos en el guion para la escena ${i+1} ('${idEscenaPrincipal}').</p>`;
                continue;
            }

            if (escenas[idEscenaPrincipal]) {
                escenas[idEscenaPrincipal].texto = `${nombreBaseReal} ${String(i + 1).padStart(3, '0')} - ${escenaOriginalData.titulo_escena}`;
            } else {
                if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Error Interno:</strong> La escena con ID '${idEscenaPrincipal}' no se encontró en la estructura 'escenas' de Silenos.</p>`;
                continue;
            }

            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Procesando Escena:</strong> "${escenas[idEscenaPrincipal].texto}"</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }

            if (!escenaOriginalData.frames || escenaOriginalData.frames.length === 0) {
                if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Info:</strong> La escena "${escenaOriginalData.titulo_escena}" no tenía frames en el plan original. Se deja vacía.</p>`;
                if (escenas[idEscenaPrincipal] && !escenas[idEscenaPrincipal].frames) {
                    escenas[idEscenaPrincipal].frames = [];
                }
                continue;
            }
            
            // =========================================================================================
            //  AÑADIDO: Limpiamos los frames que 'crearEscenasAutomaticamente' pudo haber creado
            //  para evitar duplicados antes de añadir los desarrollados.
            // =========================================================================================
             if (escenas[idEscenaPrincipal]) {
                escenas[idEscenaPrincipal].frames = [];
             }


            for (let j = 0; j < escenaOriginalData.frames.length; j++) {
                const frameOriginalData = escenaOriginalData.frames[j];

                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Enviando a IA:</strong> Desarrollar punto clave ${j+1} de la escena ("${escenaOriginalData.titulo_escena}")...</p>`;
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                }

                const promptDesarrollo = `
Contexto General de la Historia: ${datosHistoria.titulo_historia || 'N/A'}
Escena Actual (del plan original): "${escenaOriginalData.titulo_escena || `Escena ${i+1}`}"
Contenido del Frame Original a Desarrollar: "${frameOriginalData.contenido || 'Sin contenido inicial'}"

Tarea:
1. Desarrolla y expande el "Contenido del Frame Original a Desarrollar" de manera coherente y detallada, manteniendo el estilo y tono de la historia.
2. Una vez desarrollado, divide el contenido que has generado en una secuencia lógica de puntos clave o sub-frames. Tú decides el número de sub-frames necesarios para presentar la información de forma clara y secuencial.
3. Responde ÚNICAMENTE con un objeto JSON válido. No incluyas ningún texto explicativo, introductorio, ni marcadores de código como \`\`\`json antes o después del JSON.
La estructura exacta del JSON debe ser:
{
  "nuevos_frames_desarrollados": [
    { "texto_sub_frame": "Texto completo del primer sub-frame desarrollado." },
    { "texto_sub_frame": "Texto completo del segundo sub-frame desarrollado." }
  ]
}`;

                let replyText = "";
                try {
                    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ contents: [{ parts: [{ text: promptDesarrollo }] }] })
                    });

                    if (!response.ok) {
                        const errorBody = await response.text();
                        throw new Error(`Error de la API: ${response.status} ${response.statusText}. Cuerpo: ${errorBody}`);
                    }

                    const data = await response.json();
                    replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (!replyText) throw new Error("La respuesta de la IA estaba vacía o no tenía la estructura esperada.");

                    let textoJsonLimpio = replyText;
                    const match = textoJsonLimpio.match(/```json\s*([\s\S]*?)\s*```/);
                    if (match && match[1]) {
                        textoJsonLimpio = match[1];
                    } else {
                        const inicioJson = textoJsonLimpio.indexOf('{');
                        const finJson = textoJsonLimpio.lastIndexOf('}');
                        if (inicioJson !== -1 && finJson !== -1 && finJson > inicioJson) {
                            textoJsonLimpio = textoJsonLimpio.substring(inicioJson, finJson + 1);
                        }
                    }

                    const respuestaJson = JSON.parse(textoJsonLimpio);
                    const nuevosFrames = respuestaJson.nuevos_frames_desarrollados;

                    if (!nuevosFrames || !Array.isArray(nuevosFrames)) {
                        throw new Error("El JSON de la IA no tiene la estructura esperada (falta 'nuevos_frames_desarrollados' o no es un array).");
                    }

                    if (typeof chatDiv !== 'undefined') {
                        chatDiv.innerHTML += `<p><strong>IA Respondió:</strong> Se generaron ${nuevosFrames.length} nuevos frames detallados para el punto clave ${j+1}.</p>`;
                    }

                    nuevosFrames.forEach(subFrame => {
                        if (subFrame && typeof subFrame.texto_sub_frame === 'string') {
                            const nuevoFrameSilenos = { texto: subFrame.texto_sub_frame, imagen: "" };
                            escenas[idEscenaPrincipal].frames.push(nuevoFrameSilenos);
                        } else {
                            if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Advertencia:</strong> Un sub-frame recibido de la IA no tenía el formato esperado y fue omitido.</p>`;
                        }
                    });

                } catch (error) {
                    if (typeof chatDiv !== 'undefined') {
                        chatDiv.innerHTML += `<p><strong>Error de IA (Punto Clave ${j+1}):</strong> ${error.message}</p><p><strong>Respuesta recibida:</strong><pre>${replyText.substring(0, 200)}...</pre></p>`;
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                    const frameDeError = { texto: `(Error al generar este frame. Mensaje: ${error.message})`, imagen: "" };
                    escenas[idEscenaPrincipal].frames.push(frameDeError);
                }

                // Actualizar la UI después de procesar cada punto clave
                if (typeof actualizarLista === 'function') {
                    actualizarLista();
                }
                await sleep(1000);
            }
        }
    } finally {
        // Este bloque se ejecutará siempre, haya o no errores.
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
