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
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey, {
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

async function desarrollarFramesDesdeGeminimente(nombreBaseHTML) {
    const numEscenasParaCrear = parseInt(document.getElementById("cantidadescenas").value) || 0;
    // La cantidad de frames del input ya no se usa para la creación inicial, la IA los definirá.

    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Info Ejecución:</strong> Iniciando desarrollo de historia. Se crearán hasta ${numEscenasParaCrear} escenas basadas en la historia de la IA.</p>`;
    }

    if (!ultimaHistoriaGeneradaJson || !ultimaHistoriaGeneradaJson.historia || ultimaHistoriaGeneradaJson.historia.length === 0) {
        alert("Primero genera una historia usando el botón 'Generar Historia'. El JSON base no está disponible.");
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += "<p><strong>Error:</strong> No hay historia base (JSON) para desarrollar los frames.</p>";
        }
        return;
    }

    let nombreBaseReal = nombreBaseHTML;
    if (ultimaHistoriaGeneradaJson && ultimaHistoriaGeneradaJson.titulo_historia) {
        nombreBaseReal = ultimaHistoriaGeneradaJson.titulo_historia;
        if (typeof chatDiv !== 'undefined') {
             chatDiv.innerHTML += `<p><strong>Info:</strong> Usando el título de la historia de la IA como nombre base: "${nombreBaseReal}".</p>`;
        }
    } else {
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>Info:</strong> No se encontró título de historia en el JSON de la IA. Usando el nombre del input HTML: "${nombreBaseHTML}".</p>`;
        }
    }

    // PASO 1: Crear solo las escenas, sin frames (pasando 0 como cantidad de frames).
    if (typeof crearEscenasAutomaticamente === 'function') {
        // Se asegura que la cantidad de escenas a crear no exceda las disponibles en el JSON
        const escenasDisponiblesEnJson = ultimaHistoriaGeneradaJson.historia.length;
        const escenasACrearReal = Math.min(numEscenasParaCrear, escenasDisponiblesEnJson);

        if (numEscenasParaCrear > escenasDisponiblesEnJson && typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>Advertencia:</strong> Se solicitaron ${numEscenasParaCrear} escenas, pero la historia de la IA solo tiene ${escenasDisponiblesEnJson}. Se crearán ${escenasACrearReal} escenas.</p>`;
        }
        crearEscenasAutomaticamente(nombreBaseReal, escenasACrearReal, 0); 
    } else {
        alert("Error: La función crearEscenasAutomaticamente no está disponible.");
        if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += "<p><strong>Error Crítico:</strong> La función `crearEscenasAutomaticamente` no se encontró.</p>";
        return;
    }
    
    // Obtener los IDs de las escenas recién creadas para poder referenciarlas
    const idsEscenasCreadasEnPrincipal = Object.keys(escenas)
                                          .filter(id => id.startsWith(nombreBaseReal)) 
                                          .sort(); 

    // Bucle principal: Itera sobre cada ESCENA del plan original de la IA (limitado por idsEscenasCreadasEnPrincipal)
    for (let i = 0; i < idsEscenasCreadasEnPrincipal.length; i++) {
        const idEscenaPrincipal = idsEscenasCreadasEnPrincipal[i];
        // Encontrar la data original correspondiente al idEscenaPrincipal puede ser un poco más complejo
        // si los números no coinciden exactamente. Asumimos por ahora que el orden se mantiene.
        const escenaOriginalData = ultimaHistoriaGeneradaJson.historia[i];

        if (!escenaOriginalData) { // Si no hay más datos en el JSON de la IA, aunque se hayan creado escenas
            if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Info:</strong> No hay más datos en el JSON de la IA para la escena ${i+1} ('${idEscenaPrincipal}').</p>`;
            continue; 
        }
        
        // Actualizar el título de la escena en la UI de Silenos
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
            if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Info:</strong> La escena "${escenaOriginalData.titulo_escena}" no tenía frames en el plan original de la IA. Se deja vacía.</p>`;
            // Aunque la escena original no tenga frames, la escena en Silenos (escenas[idEscenaPrincipal]) ya existe vacía.
            // Aseguramos que el array de frames exista para evitar errores posteriores.
            if (escenas[idEscenaPrincipal] && !escenas[idEscenaPrincipal].frames) {
                escenas[idEscenaPrincipal].frames = [];
            }
            continue;
        }

        // Bucle secundario: Itera sobre cada FRAME del plan original de la IA para una escena dada
        for (let j = 0; j < escenaOriginalData.frames.length; j++) {
            const frameOriginalData = escenaOriginalData.frames[j];
            
            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Enviando a IA:</strong> Desarrollar punto clave ${j+1} de la escena ("${escenaOriginalData.titulo_escena}")...</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }

            const promptDesarrollo = `
Contexto General de la Historia: ${ultimaHistoriaGeneradaJson.titulo_historia || 'N/A'}
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

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: promptDesarrollo }] }] })
                });

                if (!response.ok) {
                    const errorBody = await response.text(); // Intenta obtener más detalles del error
                    throw new Error(`Error de la API: ${response.status} ${response.statusText}. Cuerpo: ${errorBody}`);
                }
                
                const data = await response.json();
                const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!replyText) throw new Error("La respuesta de la IA estaba vacía o no tenía la estructura esperada.");

                try {
                    const respuestaJson = JSON.parse(replyText);
                    const nuevosFrames = respuestaJson.nuevos_frames_desarrollados;

                    if (!nuevosFrames || !Array.isArray(nuevosFrames)) {
                        throw new Error("El JSON de la IA no tiene la estructura esperada (falta 'nuevos_frames_desarrollados' o no es un array).");
                    }
                    
                    if (typeof chatDiv !== 'undefined') {
                        chatDiv.innerHTML += `<p><strong>IA Respondió:</strong> Se generaron ${nuevosFrames.length} nuevos frames detallados para el punto clave ${j+1}.</p>`;
                    }

                    // Asegurarse de que el array de frames exista en la escena de Silenos
                    if (!escenas[idEscenaPrincipal].frames) {
                        escenas[idEscenaPrincipal].frames = [];
                    }

                    nuevosFrames.forEach(subFrame => {
                        if (subFrame && typeof subFrame.texto_sub_frame === 'string') {
                            const nuevoFrameSilenos = { texto: subFrame.texto_sub_frame, imagen: "" };
                            escenas[idEscenaPrincipal].frames.push(nuevoFrameSilenos);
                        } else {
                             if (typeof chatDiv !== 'undefined') chatDiv.innerHTML += `<p><strong>Advertencia:</strong> Un sub-frame recibido de la IA no tenía el formato esperado y fue omitido.</p>`;
                        }
                    });

                } catch (parseError) {
                    if (typeof chatDiv !== 'undefined') {
                        chatDiv.innerHTML += `<p><strong>Error de IA (Parseo):</strong> La respuesta para el punto clave ${j+1} no fue un JSON válido o estructura incorrecta. Se insertará un marcador de error. (${parseError.message})</p><p><pre>${replyText.substring(0,200)}...</pre></p>`;
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                     if (!escenas[idEscenaPrincipal].frames) escenas[idEscenaPrincipal].frames = [];
                    const frameDeError = { texto: `(Error: No se pudo generar el contenido detallado para este punto. Respuesta de la IA no era JSON válido o estructura incorrecta: ${replyText.substring(0, 100)}...)`, imagen: "" };
                    escenas[idEscenaPrincipal].frames.push(frameDeError);
                }

            } catch (fetchError) {
                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Error de Conexión con IA:</strong> No se pudo desarrollar el punto clave ${j+1}. ${fetchError.message}</p>`;
                }
                if (!escenas[idEscenaPrincipal].frames) escenas[idEscenaPrincipal].frames = [];
                const frameDeError = { texto: `(Error: Falla de conexión con la API al intentar desarrollar este frame.)`, imagen: "" };
                escenas[idEscenaPrincipal].frames.push(frameDeError);
            }
            
            if (typeof actualizarLista === 'function') {
                actualizarLista();
            }
            await sleep(1000); // Pausa entre llamadas a la API (reducida a 1000ms)
        } 
    } 

    if (typeof guardarCambios === 'function') guardarCambios();
    if (typeof actualizarLista === 'function') actualizarLista(); 

    alert(`Proceso de desarrollo de frames completado.`);
    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Proceso Completado:</strong> El desarrollo de la historia ha finalizado.</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}
