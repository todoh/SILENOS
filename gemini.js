let apiKey = ""; // Reemplaza con tu clave real o asegúrate que se carga desde otro sitio.
// Es importante que 'apiKey' y 'ultimaHistoriaGeneradaJson' sean accesibles por este script.
// Si 'ultimaHistoriaGeneradaJson' se define en 'geminialfa.js', asegúrate que 'geminialfa.js' se carga antes o que la variable es global.
// Por simplicidad, asumiré que 'ultimaHistoriaGeneradaJson' es accesible globalmente.

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
    const numFramesPorEscenaParaCrear = parseInt(document.getElementById("cantidadeframes").value) || 0;

    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Info Ejecución:</strong> Creando ${numEscenasParaCrear} escenas, con ${numFramesPorEscenaParaCrear} frames cada una.</p>`;
    }

    if (!ultimaHistoriaGeneradaJson || !ultimaHistoriaGeneradaJson.historia || ultimaHistoriaGeneradaJson.historia.length === 0) {
        alert("Primero genera una historia usando el botón 'Generar Historia'. El JSON base no está disponible.");
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += "<p><strong>Error:</strong> No hay historia base (JSON) para desarrollar los frames.</p>";
        }
        return;
    }

    const instrucciones = "Desarrolla el contenido del frame de manera coherente y detallada, basándote en la siguiente información de la historia. Responde solo con el texto del frame, sin títulos o introducciones.";

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

    if (typeof crearEscenasAutomaticamente === 'function') {
        crearEscenasAutomaticamente(nombreBaseReal, numEscenasParaCrear, numFramesPorEscenaParaCrear);
    } else {
        alert("Error: La función crearEscenasAutomaticamente no está disponible.");
        return;
    }
    
    const idsEscenasCreadasEnPrincipal = Object.keys(escenas)
                                          .filter(id => id.startsWith(nombreBaseReal)) 
                                          .sort(); 

    for (let i = 0; i < numEscenasParaCrear && i < ultimaHistoriaGeneradaJson.historia.length && i < idsEscenasCreadasEnPrincipal.length; i++) {
        const idEscenaPrincipal = idsEscenasCreadasEnPrincipal[i]; 
        const escenaOriginalData = ultimaHistoriaGeneradaJson.historia[i];

        if (escenas[idEscenaPrincipal] && escenaOriginalData && escenaOriginalData.titulo_escena) {
            const numeroEscenaFormateado = String(i + 1).padStart(3, '0');
            escenas[idEscenaPrincipal].texto = `${nombreBaseReal} ${numeroEscenaFormateado} - ${escenaOriginalData.titulo_escena}`;
            
            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Info:</strong> Título para la escena principal '${idEscenaPrincipal}' actualizado a: "${escenas[idEscenaPrincipal].texto}".</p>`;
            }
        } else {
            if (escenas[idEscenaPrincipal]){ 
                 escenas[idEscenaPrincipal].texto = idEscenaPrincipal; 
            }
            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Advertencia:</strong> No se encontró título en el JSON para la escena original en el índice ${i} (para '${idEscenaPrincipal}'). Se usará el ID como nombre si no hay otro texto.</p>`;
            }
        }
    }
    
    let escenasProcesadasCount = 0;

    for (let i = 0; i < numEscenasParaCrear; i++) {
        if (i >= ultimaHistoriaGeneradaJson.historia.length || i >= idsEscenasCreadasEnPrincipal.length) {
            if (typeof chatDiv !== 'undefined') {
                 chatDiv.innerHTML += `<p><strong>Info:</strong> No hay más datos en la historia original JSON para procesar (escena ${i+1}), o no se creó la escena correspondiente en la estructura principal.</p>`;
            }
            break; 
        }

        const idEscenaPrincipal = idsEscenasCreadasEnPrincipal[i];
        const escenaOriginalData = ultimaHistoriaGeneradaJson.historia[i]; 

        const nombreEscenaParaLog = escenas[idEscenaPrincipal].texto || idEscenaPrincipal;

        if (!escenaOriginalData || !escenaOriginalData.frames) {
            console.warn(`Faltan datos originales (o frames) para la escena ${i+1} del JSON (esperado para ${idEscenaPrincipal}).`);
             if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Advertencia:</strong> Faltan datos en el JSON para la escena original en el índice ${i} (correspondiente a '${nombreEscenaParaLog}').</p>`;
            }
            if(escenas[idEscenaPrincipal] && escenas[idEscenaPrincipal].frames) {
                for (let k=0; k < numFramesPorEscenaParaCrear; k++){
                    if(escenas[idEscenaPrincipal].frames[k]){
                         escenas[idEscenaPrincipal].frames[k].texto = `(Contenido no definido en la historia original para este frame ${k+1})`;
                    }
                }
            }
            continue;
        }
        
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>Procesando Escena:</strong> "${nombreEscenaParaLog}" para la estructura principal...</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        for (let j = 0; j < numFramesPorEscenaParaCrear; j++) {
            if (!escenas[idEscenaPrincipal] || !escenas[idEscenaPrincipal].frames || !escenas[idEscenaPrincipal].frames[j]) {
                console.warn(`El frame ${j+1} no existe en la estructura principal para la escena ${idEscenaPrincipal}. Esto no debería ocurrir si crearEscenasAutomaticamente funcionó bien.`);
                 if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Advertencia interna:</strong> El frame ${j+1} no existe en la estructura principal para "${nombreEscenaParaLog}". Se omite.</p>`;
                }
                continue;
            }

            if (j >= escenaOriginalData.frames.length) {
                escenas[idEscenaPrincipal].frames[j].texto = `(Frame ${j+1} creado según solicitud, pero sin datos en la historia original de la IA)`;
                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Info:</strong> Frame ${j+1} para "${nombreEscenaParaLog}" no tenía datos en el JSON original de IA. Se dejó un marcador.</p>`;
                }
                // Actualizar UI y pausar incluso para frames sin datos de IA
                if (typeof actualizarLista === 'function') {
                    actualizarLista();
                }
                await sleep(1350);
                continue;
            }

            const frameOriginalData = escenaOriginalData.frames[j];
            const contenidoFrameOriginal = frameOriginalData.contenido;

            const contextoHistoria = `
Contexto General de la Historia: ${ultimaHistoriaGeneradaJson.titulo_historia || 'N/A'}
Escena Actual (del plan original): "${escenaOriginalData.titulo_escena || `Escena ${i+1}`}"
Frame Actual (del plan original - número ${j+1}): "${contenidoFrameOriginal || 'Sin contenido inicial'}"
Tarea: Desarrolla detalladamente el contenido para este frame.`;

            const textoEnviar = `${instrucciones}\n\n${contextoHistoria}`;

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contents: [{ parts: [{ text: textoEnviar }] }] })
                });
                const data = await response.json();
                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || `Texto no generado para Escena "${nombreEscenaParaLog}", Frame ${j + 1}.`;

                escenas[idEscenaPrincipal].frames[j].texto = reply; 
                
                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Frame ${j + 1} ("${nombreEscenaParaLog}") desarrollado:</strong><br>${reply.substring(0,100)}...</p>`;
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                }

            } catch (error) {
                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Error al desarrollar Frame ${j + 1} ("${nombreEscenaParaLog}"):</strong> ${error.message}</p>`;
                }
                escenas[idEscenaPrincipal].frames[j].texto = `Error al generar contenido para frame ${j+1}: ${error.message}`;
            }

            // Actualizar la lista para mostrar el frame recién generado
            if (typeof actualizarLista === 'function') {
                actualizarLista();
            }
            // Pausar antes de generar el siguiente frame
            await sleep(2050);

        } 
        escenasProcesadasCount++;
    } 

    if (typeof guardarCambios === 'function') guardarCambios();
    // La actualización final de la lista podría ser redundante si se actualiza después de cada frame, pero no hace daño.
    if (typeof actualizarLista === 'function') actualizarLista(); 

    alert(`Proceso de desarrollo de frames completado. Se intentaron procesar ${escenasProcesadasCount} escenas para la estructura principal, con ${numFramesPorEscenaParaCrear} frames cada una (según los valores actuales de los inputs).`);
    
}
