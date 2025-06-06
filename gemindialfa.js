// geminialfa.js

let ultimaHistoriaGeneradaJson = null;
let planteamientoGeneralGlobal = "";
let resumenPorEscenasGlobal = [];
let tituloHistoriaGlobal = "";

/**
 * Recolecta y agrupa los datos de la sección "Datos" por su etiqueta,
 * ignorando los indeterminados.
 * @returns {Object} Un objeto con los datos agrupados por categoría.
 */
function recolectarYAgruparDatos() {
    const datosAgrupados = {};
    const contenedorDatos = document.getElementById("listapersonajes");
    if (!contenedorDatos) return datosAgrupados;

    for (const nodoDato of contenedorDatos.children) {
        const nombre = nodoDato.querySelector("input.nombreh")?.value.trim() || "";
        const descripcion = nodoDato.querySelector("textarea")?.value.trim() || "";
        const etiquetaEl = nodoDato.querySelector(".etiqueta-personaje");
        const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';

        if (etiqueta === 'indeterminado' || !nombre) {
            continue;
        }

        const nombreCategoria = etiqueta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (!datosAgrupados[nombreCategoria]) {
            datosAgrupados[nombreCategoria] = [];
        }

        datosAgrupados[nombreCategoria].push({ nombre, descripcion });
    }
    return datosAgrupados;
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function llamarIAConFeedback(prompt, etapaDescriptiva, esJsonEsperado = true) {
    const chatDiv = window.chatDiv;

    if (chatDiv) {
        chatDiv.innerHTML += `<p><strong>Silenos está trabajando:</strong> Consultando a la IA para ${etapaDescriptiva}...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    try {
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("La API Key de Gemini no está definida. Configúrala en la sección de Ajustes.");
        }

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorDataText = await response.text();
            throw new Error(`Error de API en ${etapaDescriptiva}: ${response.status} ${response.statusText}. Detalles: ${errorDataText}`);
        }

        const data = await response.json();
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || (esJsonEsperado ? "{}" : "");

        if (esJsonEsperado) {
            const inicioJson = replyText.indexOf('{');
            const finJson = replyText.lastIndexOf('}');
            if (inicioJson !== -1 && finJson !== -1 && finJson > inicioJson) {
                const textoJsonLimpio = replyText.substring(inicioJson, finJson + 1);
                return JSON.parse(textoJsonLimpio);
            }
            throw new Error(`La respuesta de la IA para ${etapaDescriptiva} no fue un JSON válido.`);
        }
        return replyText;

    } catch (error) {
        if (chatDiv) {
            chatDiv.innerHTML += `<p><strong>Error en ${etapaDescriptiva}:</strong> ${error.message}</p>`;
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
        throw error;
    }
}


async function enviarTextoConInstrucciones() {
    actualizarParametrosIA();

    const geminichat = document.getElementById("gemini1").value;
    if (!geminichat.trim()) {
        alert("Por favor, escribe la idea para tu historia.");
        return;
    }

    const geminimenteDiv = document.getElementById("geminimente");
    if (geminimenteDiv) geminimenteDiv.innerHTML = '';

    if (typeof chatDiv !== 'undefined') {
        chatDiv.innerHTML += `<p><strong>Tu idea inicial:</strong><br>${geminichat}</p>`;
    }

    // Reiniciar variables globales de la historia
    planteamientoGeneralGlobal = "";
    resumenPorEscenasGlobal = [];
    tituloHistoriaGlobal = "";
    ultimaHistoriaGeneradaJson = { titulo_historia: "", historia: [] };

    // --- LÓGICA DE DATOS ---
    const incluirDatos = document.getElementById('incluir-datos-ia').checked;
    let contextoDeDatos = "";

    if (incluirDatos) {
        const datosAgrupados = recolectarYAgruparDatos();
        if (Object.keys(datosAgrupados).length > 0) {
            contextoDeDatos += "Aquí tienes una lista de Datos Fundamentales que DEBEN ser incluidos y desarrollados en la historia. Intégralos de forma natural y coherente:\n\n";
            for (const categoria in datosAgrupados) {
                contextoDeDatos += `**Categoría: ${categoria}**\n`;
                datosAgrupados[categoria].forEach(dato => {
                    contextoDeDatos += `- **${dato.nombre}**: ${dato.descripcion}\n`;
                });
                contextoDeDatos += "\n";
            }
        }
    }
    // --- FIN LÓGICA ---

    try {
        // --- PASO 1: Generar Planteamiento General y Título ---
        const promptPaso1 = `
${contextoDeDatos}
**Idea Inicial del Usuario:**
"${geminichat}"

**Tarea:**
1.  Genera un título creativo y general para esta historia.
2.  Basado en la idea del usuario y OBLIGATORIAMENTE en el contexto de los "Datos Fundamentales" proporcionados arriba (si los hay), escribe un planteamiento general **muy extenso y muy detallado**. Este planteamiento debe ser rico en descripciones, presentar a los personajes principales, establecer el conflicto y el tono de la historia. Debe tener una longitud de varios párrafos, como mínimo 400 palabras.

**Formato de Respuesta:**
Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura. No incluyas ningún texto explicativo antes o después del JSON.
{
  "titulo_historia_sugerido": "El título que generaste",
  "planteamiento_general_historia": "El texto muy extenso y detallado del planteamiento general."
}`;

        const respuestaPaso1 = await llamarIAConFeedback(promptPaso1, "Paso 1: Planteamiento General y Título");
        tituloHistoriaGlobal = respuestaPaso1.titulo_historia_sugerido || "Historia Sin Título (IA)";
        planteamientoGeneralGlobal = respuestaPaso1.planteamiento_general_historia || "No se generó planteamiento general.";
        
        ultimaHistoriaGeneradaJson.titulo_historia = tituloHistoriaGlobal; 
        if (geminimenteDiv) {
            const tituloElem = document.createElement('h3');
            tituloElem.textContent = `Título: ${tituloHistoriaGlobal}`;
            geminimenteDiv.appendChild(tituloElem);
            const pGeneral = document.createElement('p');
            pGeneral.innerHTML = `<strong>Planteamiento General:</strong><br>${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}`;
            geminimenteDiv.appendChild(pGeneral);
        }

        await sleep(1000);

        // --- PASO 2: Dividir Planteamiento en Resúmenes de Escenas ---
        if (window.cantidaddeescenas <= 0) throw new Error("La cantidad de escenas debe ser mayor a cero.");
        
        const promptPaso2 = `Título de la Historia: ${tituloHistoriaGlobal}
Planteamiento General de la Historia:
${planteamientoGeneralGlobal}

Tarea:
Divide el "Planteamiento General de la Historia" en exactamente ${window.cantidaddeescenas} resúmenes de escena. Cada resumen debe ser un **párrafo completo y detallado** que describa en profundidad los eventos, personajes clave y el ambiente de esa escena. No debe ser una simple frase, sino una base sólida para su posterior desarrollo.

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "resumen_por_escenas": [
    { "resumen_escena": "Resumen detallado y completo de la Escena 1." } 
  ]
}
Asegúrate de que haya exactamente ${window.cantidaddeescenas} objetos en el array "resumen_por_escenas".`;

        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Dividir en ${window.cantidaddeescenas} Resúmenes de Escena`);
        if (!respuestaPaso2.resumen_por_escenas || !Array.isArray(respuestaPaso2.resumen_por_escenas) || respuestaPaso2.resumen_por_escenas.length === 0) {
            throw new Error("La IA no devolvió los resúmenes de escenas en el formato esperado.");
        }
        resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas;

        if (geminimenteDiv) {
            const resumenTitulo = document.createElement('h4');
            resumenTitulo.textContent = "Resumen por Escenas (Plan de la IA):";
            geminimenteDiv.appendChild(resumenTitulo);
            const ulResumen = document.createElement('ul');
            resumenPorEscenasGlobal.forEach((res, idx) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>Escena ${idx + 1}:</strong> ${(res.resumen_escena || "").replace(/\n/g, "<br>")}`;
                ulResumen.appendChild(li);
            });
            geminimenteDiv.appendChild(ulResumen);
        }

        // --- PASO 3: Desarrollar Cada Escena en Frames ---
        if (window.cantidadframes <= 0) throw new Error("La cantidad de frames por escena debe ser mayor a cero.");
        let contextoEscenaAnteriorSerializado = "";

        for (let i = 0; i < resumenPorEscenasGlobal.length; i++) {
            if (i > 0) await sleep(1000);
            
            const resumenEscenaActualTexto = resumenPorEscenasGlobal[i].resumen_escena;
            const promptPaso3 = `Título Global de la Historia: ${tituloHistoriaGlobal}
Planteamiento General Completo: ${planteamientoGeneralGlobal}
Resumen Específico para la Escena Actual (Escena ${i + 1}): ${resumenEscenaActualTexto}
${contextoEscenaAnteriorSerializado ? `Contenido de la Escena Anterior (Escena ${i}):\n${contextoEscenaAnteriorSerializado}` : ""}

Tarea:
1.  Desarrolla en gran detalle la Escena ${i + 1}.
2.  Divide este desarrollo en exactamente ${window.cantidadframes} frames.
3.  Genera un título descriptivo para esta Escena ${i + 1}.

Responde ÚNICAMENTE con un objeto JSON con la estructura:
{
  "titulo_escena_desarrollada": "Título descriptivo para la Escena ${i + 1}",
  "frames_desarrollados": [
    { "contenido_frame": "Texto detallado del primer frame." }
  ]
}`;
            
            const respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Desarrollando Escena ${i + 1}/${resumenPorEscenasGlobal.length}`);
            
            if (!respuestaPaso3Escena.titulo_escena_desarrollada || !respuestaPaso3Escena.frames_desarrollados || !Array.isArray(respuestaPaso3Escena.frames_desarrollados) || respuestaPaso3Escena.frames_desarrollados.length === 0) {
                throw new Error(`La IA no devolvió el desarrollo de la escena ${i+1} en el formato JSON esperado.`);
            }

            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: respuestaPaso3Escena.frames_desarrollados.map(f => ({ contenido: f.contenido_frame || "" }))
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);
            contextoEscenaAnteriorSerializado = JSON.stringify(respuestaPaso3Escena, null, 2); 

            if (geminimenteDiv) {
                const escenaContainer = document.createElement('div');
                escenaContainer.className = 'gemini-escena'; 
                const tituloEscenaElem = document.createElement('h4');
                tituloEscenaElem.textContent = escenaProcesada.titulo_escena;
                escenaContainer.appendChild(tituloEscenaElem);
                escenaProcesada.frames.forEach((frameData, frameIndex) => {
                    const frameDiv = document.createElement('div');
                    frameDiv.className = 'gemini-frame';
                    frameDiv.innerHTML = `<p><strong>Frame ${frameIndex + 1}:</strong></p><p>${(frameData.contenido || "").replace(/\n/g, "<br>")}</p>`;
                    escenaContainer.appendChild(frameDiv);
                });
                geminimenteDiv.appendChild(escenaContainer);
            }
             if (chatDiv) chatDiv.innerHTML += `<p><strong>Éxito:</strong> Escena ${i+1} ("${escenaProcesada.titulo_escena}") desarrollada con ${escenaProcesada.frames.length} frames.</p>`;
        } 

        // --- PASO 4: Crear Capítulo en Guion Literario ---
        if (typeof agregarCapituloYMostrar === 'function') {
             agregarCapituloYMostrar(); 
            if (indiceCapituloActivo >= 0 && guionLiterarioData[indiceCapituloActivo]) {
                guionLiterarioData[indiceCapituloActivo].titulo = tituloHistoriaGlobal || "Guion de Historia IA";
                let contenidoGuion = `<h1>${tituloHistoriaGlobal}</h1>\n\n<h2>Planteamiento General</h2>\n<pre>${planteamientoGeneralGlobal}</pre>\n\n`;
                ultimaHistoriaGeneradaJson.historia.forEach((escena, idx) => {
                    contenidoGuion += `<h3>${escena.titulo_escena || `Escena ${idx + 1}`}</h3>\n`;
                    escena.frames.forEach((frame, frameIdx) => {
                        contenidoGuion += `<h4>Frame ${frameIdx + 1}</h4>\n<pre>${frame.contenido || ""}</pre>\n`;
                    });
                    contenidoGuion += "\n";
                });
                guionLiterarioData[indiceCapituloActivo].contenido = contenidoGuion;
                renderizarGuion(); 
            }
        }
        if (chatDiv) chatDiv.innerHTML += `<p><strong>PROCESO COMPLETADO:</strong> La generación de la historia y el guion ha finalizado.</p>`;
        alert("¡Proceso de generación de historia completado!");

    } catch (error) {
        console.error("Error general en enviarTextoConInstrucciones:", error);
        if (chatDiv) chatDiv.innerHTML += `<p><strong>Error Fatal en Generación:</strong> ${error.message}</p>`;
        if (geminimenteDiv) geminimenteDiv.innerHTML = `<p style="color: red;">Error fatal durante la generación: ${error.message}</p>`;
        ultimaHistoriaGeneradaJson = null; 
    } finally {
        if (chatDiv) chatDiv.scrollTop = chatDiv.scrollHeight;
    }
}
