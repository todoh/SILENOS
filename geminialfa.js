// geminialfa.js

// Variable para almacenar la API Key (debería estar definida en gemini.js o globalmente)
// extern let apiKey; // Asegúrate de que apiKey esté accesible aquí

let inputNumber = 0;
let inputNumber2 = 0;
// let escenagenerada = 1; // Esta variable parece no usarse, considera si es necesaria

// NUEVA VARIABLE GLOBAL para almacenar la última historia generada por la IA
let ultimaHistoriaGeneradaJson = null;


// Función para actualizar las cifras de escenas y frames desde los inputs del HTML
function actualizarcifras() {
    inputNumber = parseInt(document.getElementById("cantidadescenas").value) || 0;
    // Asegúrate de que 'cantidaddeescenas' y 'cantidadframes' sean globales o definidas donde se necesiten
    window.cantidaddeescenas = inputNumber; // Ejemplo de asignación global si es necesario
    inputNumber2 = parseInt(document.getElementById("cantidadeframes").value) || 0;
    window.cantidadframes = inputNumber2; // Ejemplo de asignación global
}

// Función para sanitizar texto para usarlo en IDs (si es necesario para clases CSS, etc.)
function sanitizarParaId(texto) {
    if (typeof texto !== 'string') return 'parte_sin_titulo';
    return texto.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
}

// Función principal para enviar el texto del usuario a Gemini y procesar la respuesta JSON
async function enviarTextoConInstrucciones() {
    actualizarcifras(); 

    const geminichat = document.getElementById("gemini1").value;
    if (!geminichat.trim()) {
        alert("Por favor, escribe la idea para tu historia.");
        return;
    }

    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Tu idea:</strong><br>${geminichat}</p>`;
        document.getElementById("gemini1").value = ""; 
    }

    // Instrucciones para forzar la respuesta JSON
    const instrucciones = `
Tu tarea es generar una estructura de historia en formato JSON.
La respuesta DEBE ser un objeto JSON válido y nada más, sin texto introductorio, explicaciones, ni marcadores de código como \`\`\`json.
El JSON debe tener la siguiente estructura exacta:
{
  "titulo_historia": "Un título creativo y general para toda la historia",
  "historia": [
    {
      "titulo_escena": "Un título descriptivo para la Escena 1",
      "frames": [
        { "contenido": "El texto detallado del primer frame de la Escena 1." },
        { "contenido": "El texto detallado del segundo frame de la Escena 1." }
      ]
    },
    {
      "titulo_escena": "Un título descriptivo para la Escena 2",
      "frames": [
        { "contenido": "El texto detallado del primer frame de la Escena 2." },
        { "contenido": "El texto detallado del segundo frame de la Escena 2." }
      ]
    }
  ]
}

Basado en la siguiente idea del usuario, genera un "titulo_historia" adecuado.
Luego, genera el contenido para exactamente ${window.cantidaddeescenas} escenas en la sección "historia".
Cada una de estas ${window.cantidaddeescenas} escenas debe tener un "titulo_escena" y exactamente ${window.cantidadframes} frames.
Asegúrate de que cada frame tenga un texto de "contenido" no vacío y relevante para la historia.

Idea del usuario: "${geminichat}"
`;

    const textoEnviar = instrucciones; 

    try {
        if (typeof apiKey === 'undefined' || !apiKey) {
            alert("Error: La API Key de Gemini no está definida.");
            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += "<p><strong>Error:</strong> API Key no configurada.</p>";
            }
            return;
        }

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: textoEnviar }] }],
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error de la API de Gemini:", errorData);
            throw new Error(`Error de la API: ${response.status} ${response.statusText}. Detalles: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"; 

        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>Respuesta JSON (cruda) de la IA:</strong><br><pre>${replyText}</pre></p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }

        // === INICIO DE LA NUEVA LÓGICA PARA MOSTRAR EL JSON EN geminimente ===
        try {
            const respuestaJson = JSON.parse(replyText);
            ultimaHistoriaGeneradaJson = respuestaJson; // Almacenar para uso posterior

            const geminimenteDiv = document.getElementById("geminimente");
            geminimenteDiv.innerHTML = ''; // Limpiar contenido anterior

            const nombreHistoriaGenerado = respuestaJson.titulo_historia || "Historia Sin Título";
            const tituloHistoriaElem = document.createElement('h3');
            tituloHistoriaElem.textContent = nombreHistoriaGenerado;
            geminimenteDiv.appendChild(tituloHistoriaElem);

            if (respuestaJson.historia && Array.isArray(respuestaJson.historia)) {
                respuestaJson.historia.forEach((escenaData, index) => {
                    if (!escenaData.titulo_escena || typeof escenaData.titulo_escena !== 'string' ||
                        !escenaData.frames || !Array.isArray(escenaData.frames)) {
                        console.warn(`La escena en el índice ${index} del JSON no tiene el formato esperado. Se omitirá.`);
                        if (typeof chatDiv !== 'undefined') {
                           chatDiv.innerHTML += `<p><strong>Advertencia:</strong> La escena ${index + 1} en el JSON no tiene el formato esperado y fue omitida.</p>`;
                        }
                        return; 
                    }

                    const escenaContainer = document.createElement('div');
                    escenaContainer.className = 'gemini-escena'; 

                    const tituloEscenaElem = document.createElement('h4');
                    tituloEscenaElem.textContent = escenaData.titulo_escena;
                    escenaContainer.appendChild(tituloEscenaElem);

                    escenaData.frames.forEach((frameData, frameIndex) => {
                        if (frameData && typeof frameData.contenido === 'string') {
                            const frameDiv = document.createElement('div');
                            frameDiv.className = 'gemini-frame';
                            
                            const frameIndicator = document.createElement('p');
                            frameIndicator.innerHTML = `<strong>Frame ${frameIndex + 1}:</strong>`;
                            frameDiv.appendChild(frameIndicator);

                            const contenidoFrameElem = document.createElement('p');
                            contenidoFrameElem.innerHTML = frameData.contenido.replace(/\n/g, "<br>");
                            frameDiv.appendChild(contenidoFrameElem);
                            escenaContainer.appendChild(frameDiv);
                        } else {
                            console.warn(`El frame ${frameIndex + 1} de la escena '${escenaData.titulo_escena}' no tiene contenido válido.`);
                             if (typeof chatDiv !== 'undefined') {
                                chatDiv.innerHTML += `<p><strong>Advertencia:</strong> El frame ${frameIndex + 1} de la escena '${escenaData.titulo_escena}' no tiene contenido válido y fue omitido.</p>`;
                            }
                        }
                    });
                    geminimenteDiv.appendChild(escenaContainer);
                });

                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Éxito:</strong> La historia generada se ha mostrado en el panel de la IA.</p>`;
                }
                // NO se llama a alert, ni a guardarCambios, ni actualizarLista, ni se cambia de vista.

            } else {
                if (typeof chatDiv !== 'undefined') {
                    chatDiv.innerHTML += `<p><strong>Error:</strong> El JSON recibido no tiene la estructura esperada (falta 'titulo_historia' o 'historia').</p>`;
                }
                alert("Error: El JSON recibido de la IA no tiene la estructura esperada.");
                ultimaHistoriaGeneradaJson = null; // Resetear si la estructura es incorrecta
            }

        } catch (parseError) {
            console.error("Error al interpretar el JSON:", parseError);
            if (typeof chatDiv !== 'undefined') {
                chatDiv.innerHTML += `<p><strong>Error:</strong> La respuesta de la IA no es un JSON válido. Detalles: ${parseError.message}</p>`;
            }
            alert("Error: La respuesta de la IA no pudo ser procesada como JSON.");
            ultimaHistoriaGeneradaJson = null; // Resetear en caso de error de parseo
        }
        // === FIN DE LA NUEVA LÓGICA ===

    } catch (error) {
        console.error("Error en enviarTextoConInstrucciones:", error);
        if (typeof chatDiv !== 'undefined') {
            chatDiv.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
        }
        alert(`Se produjo un error: ${error.message}`);
        ultimaHistoriaGeneradaJson = null; // Resetear en caso de error de fetch
    }
}
