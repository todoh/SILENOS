// ============== Contenido para geminialfa.js (CORREGIDO) ==============

let ultimaHistoriaGeneradaJson = null;
let planteamientoGeneralGlobal = "";
let resumenPorEscenasGlobal = [];
let tituloHistoriaGlobal = "";

/**
 * Recolecta y agrupa los datos de la sección "Datos" por su etiqueta.
 * CORRECCIÓN: Se usa el selector '.change-tag-btn' que es el correcto en tu HTML final.
 */
function recolectarYAgruparDatos() {
    const datosAgrupados = {};
    const contenedorDatos = document.getElementById("listapersonajes");
    if (!contenedorDatos) return datosAgrupados;

    for (const nodoDato of contenedorDatos.children) {
        const nombre = nodoDato.querySelector("input.nombreh")?.value.trim() || "";
        const descripcion = nodoDato.querySelector("textarea")?.value.trim() || "";
        
        const etiquetaEl = nodoDato.querySelector(".change-tag-btn"); 
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

/**
 * CORRECCIÓN: Función mejorada para limpiar la respuesta de la IA.
 * Maneja bloques de código, comentarios y asegura que la estructura sea un objeto o array.
 */
function limpiarYExtraerJson(textoCrudo, etapaDescriptiva) {
    let textoJson = textoCrudo;

    const match = textoJson.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
        textoJson = match[1];
    }

    textoJson = textoJson.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    const primerCorchete = textoJson.indexOf('[');
    const primerLlave = textoJson.indexOf('{');
    
    if (primerCorchete !== -1 && (primerLlave === -1 || primerCorchete < primerLlave)) {
        const fin = textoJson.lastIndexOf(']');
        if (fin > primerCorchete) return textoJson.substring(primerCorchete, fin + 1).trim();
    } else if (primerLlave !== -1) {
        const fin = textoJson.lastIndexOf('}');
        if (fin > primerLlave) return textoJson.substring(primerLlave, fin + 1).trim();
    }

    console.error(`No se pudo extraer una estructura JSON válida del texto para '${etapaDescriptiva}'. Respuesta cruda:`, textoCrudo);
    throw new Error(`La respuesta de la IA para ${etapaDescriptiva} no contenía un objeto o array JSON válido.`);
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

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey, {
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
            const textoJsonLimpio = limpiarYExtraerJson(replyText, etapaDescriptiva);
            try {
                return JSON.parse(textoJsonLimpio);
            } catch (parseError) {
                console.error("Texto que falló el parseo JSON (después de limpiar):", textoJsonLimpio);
                throw new Error(`Error final al analizar el JSON de la IA para ${etapaDescriptiva}. Detalles: ${parseError.message}`);
            }
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

    if(typeof progressBarManager !== 'undefined') progressBarManager.start('Iniciando proceso de IA...');
    
    // Resetear variables globales
    planteamientoGeneralGlobal = "";
    resumenPorEscenasGlobal = [];
    tituloHistoriaGlobal = "";
    ultimaHistoriaGeneradaJson = { titulo_historia: "", historia: [] };

    const incluirDatos = document.getElementById('incluir-datos-ia').checked;
    let contextoDeDatos = "";

    if (incluirDatos) {
        // La lógica para filtrar por arcos es compleja, la simplificamos por ahora para asegurar la funcionalidad
        // principal, basándonos en el código que funcionaba.
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

    try {
        const promptPaso1 = `
            ${contextoDeDatos}
            **Idea Inicial del Usuario:**
            "${geminichat}"

            **Tarea Principal:**
            Tu objetivo es estructurar una historia completa. Sigue estos pasos:

            1.  **Genera un Título Creativo:** Crea un título para la historia.
            2.  **Escribe un Planteamiento General:** Basado en la idea del usuario y OBLIGATORIAMENTE en los "Datos Fundamentales" (si se proporcionaron), escribe un resumen general y detallado de la historia.

            **Formato de Respuesta OBLIGATORIO:**
            Responde ÚNICAMENTE con un objeto JSON válido. No incluyas explicaciones ni texto fuera del JSON.
            {
              "titulo_historia_sugerido": "El título que generaste",
              "planteamiento_general_historia": "El texto extenso del planteamiento general."
            }`;
        
        if(typeof progressBarManager !== 'undefined') progressBarManager.set(10, 'Generando título y planteamiento...');
        
        const respuestaPaso1 = await llamarIAConFeedback(promptPaso1, "Paso 1: Planteamiento General y Título");
        tituloHistoriaGlobal = respuestaPaso1.titulo_historia_sugerido || "Historia Sin Título (IA)";
        planteamientoGeneralGlobal = respuestaPaso1.planteamiento_general_historia || "No se generó planteamiento general.";
        ultimaHistoriaGeneradaJson.titulo_historia = tituloHistoriaGlobal;

        await sleep(500);

        if (window.cantidaddeescenas <= 0) throw new Error("La cantidad de capítulos debe ser mayor a cero.");
        
        const promptPaso2 = `
            Título de la Historia: ${tituloHistoriaGlobal}
            Planteamiento General: ${planteamientoGeneralGlobal}

            **Tarea:**
            Divide el "Planteamiento General" en exactamente ${window.cantidaddeescenas} resúmenes de capítulo. Cada resumen debe describir qué sucede en esa parte de la historia.

            **Formato de Respuesta OBLIGATORIO:**
            Responde ÚNICAMENTE con un objeto JSON válido.
            {
              "resumen_por_escenas": [
                { "resumen_escena": "Resumen del Capítulo 1." }
              ]
            }
            Asegúrate de que haya exactamente ${window.cantidaddeescenas} objetos en el array.`;

        if(typeof progressBarManager !== 'undefined') progressBarManager.set(25, 'Dividiendo la historia en capítulos...');
        
        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Dividir en ${window.cantidaddeescenas} Capítulos`);
        if (!respuestaPaso2.resumen_por_escenas || !Array.isArray(respuestaPaso2.resumen_por_escenas)) {
            throw new Error("La IA no devolvió los resúmenes de capítulos en el formato esperado.");
        }
        resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas;

        if (window.cantidadframes <= 0) throw new Error("La cantidad de frames por capítulo debe ser mayor a cero.");
        let contextoEscenaAnteriorSerializado = "";

        for (let i = 0; i < resumenPorEscenasGlobal.length; i++) {
            if (i > 0) await sleep(500);
            
            const progress = 30 + (60 * (i / resumenPorEscenasGlobal.length));
            if(typeof progressBarManager !== 'undefined') progressBarManager.set(progress, `Desarrollando capítulo ${i + 1} de ${resumenPorEscenasGlobal.length}...`);

            const resumenEscenaActualTexto = resumenPorEscenasGlobal[i].resumen_escena;
            const promptPaso3 = `
                Título Global: ${tituloHistoriaGlobal}
                Planteamiento General: ${planteamientoGeneralGlobal}
                Resumen del Capítulo Actual (Capítulo ${i + 1}): ${resumenEscenaActualTexto}
                ${contextoEscenaAnteriorSerializado ? `Contenido del Capítulo Anterior (Capítulo ${i}):\n${contextoEscenaAnteriorSerializado}` : ""}

                **Tarea:**
                1. Desarrolla en detalle el Capítulo ${i + 1}.
                2. Divide este desarrollo en exactamente ${window.cantidadframes} frames o escenas.
                3. Genera un título descriptivo para este Capítulo ${i + 1}.

                **Formato de Respuesta OBLIGATORIO:**
                Responde ÚNICAMENTE con un objeto JSON válido.
                {
                  "titulo_escena_desarrollada": "Título descriptivo para el Capítulo ${i + 1}",
                  "frames_desarrollados": [
                    { "contenido_frame": "Texto detallado del primer frame." }
                  ]
                }`;
            
            // Lógica de reintento
            let respuestaPaso3Escena;
            let exitoEscena = false;
            let reintentosEscena = 0;
            const maxReintentosEscena = 3;

            while (!exitoEscena && reintentosEscena < maxReintentosEscena) {
                try {
                    respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Desarrollando capítulo ${i + 1}/${resumenPorEscenasGlobal.length}`);
                    if (!respuestaPaso3Escena.titulo_escena_desarrollada || !respuestaPaso3Escena.frames_desarrollados || !Array.isArray(respuestaPaso3Escena.frames_desarrollados)) {
                        throw new Error(`Formato JSON inválido para el capítulo ${i+1}.`);
                    }
                    exitoEscena = true;
                } catch (error) {
                    reintentosEscena++;
                    console.error(`Intento ${reintentosEscena} fallido para el capítulo ${i + 1}:`, error);
                    if (reintentosEscena >= maxReintentosEscena) {
                        throw new Error(`No se pudo generar el capítulo ${i + 1} después de ${maxReintentosEscena} intentos.`);
                    }
                    await sleep(1500);
                }
            }

            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: respuestaPaso3Escena.frames_desarrollados.map(f => ({ contenido: f.contenido_frame || "" })),
                generadoPorIA: true
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);
            contextoEscenaAnteriorSerializado = JSON.stringify(respuestaPaso3Escena, null, 2); 
        } 

        if(typeof progressBarManager !== 'undefined') progressBarManager.set(95, 'Guardando en la sección de Guion...');
        
        // El resto de la lógica para guardar el guion y mostrarlo no necesita cambios.
        if (typeof agregarCapituloYMostrar === 'function') {
            agregarCapituloYMostrar(); 
            if (indiceCapituloActivo >= 0 && guionLiterarioData[indiceCapituloActivo]) {
                guionLiterarioData[indiceCapituloActivo].titulo = tituloHistoriaGlobal || "Guion de Historia IA";
                guionLiterarioData[indiceCapituloActivo].generadoPorIA = true;
                
                let contenidoGuion = `<h1>${tituloHistoriaGlobal}</h1>
                <div class="guion-ia-general"><h2>Planteamiento General</h2><p>${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}</p></div>`;

                if (resumenPorEscenasGlobal && resumenPorEscenasGlobal.length > 0) {
                    contenidoGuion += `<div class="guion-ia-general"><h2>Planteamiento por Capítulos</h2><ul>`;
                    resumenPorEscenasGlobal.forEach((res, idx) => {
                        contenidoGuion += `<li><strong>Capítulo ${idx + 1}:</strong> ${res.resumen_escena || ""}</li>`;
                    });
                    contenidoGuion += `</ul></div>`;
                }

                ultimaHistoriaGeneradaJson.historia.forEach((escena, idx) => {
                    contenidoGuion += `<div class="guion-ia-escena"><h3>${escena.titulo_escena || `Capítulo ${idx + 1}`}</h3>`;
                    escena.frames.forEach((frame, frameIdx) => {
                        contenidoGuion += `<div class="guion-ia-frame"><h4>Frame ${frameIdx + 1}</h4><p>${(frame.contenido || "").replace(/\n/g, "<br>")}</p></div>`;
                    });
                    contenidoGuion += `</div>`;
                });

                guionLiterarioData[indiceCapituloActivo].contenido = contenidoGuion;
                mostrarCapituloSeleccionado(indiceCapituloActivo); 
            }
        }
        
        if(typeof progressBarManager !== 'undefined') progressBarManager.finish("¡Proceso completado!");
        await sleep(500);

        alert("¡Proceso completado! El texto ha sido generado y guardado. Serás redirigido a la sección 'Guion' para ver el resultado.");
        
        if(typeof abrirGuion === 'function') abrirGuion();
        if(typeof actualizarBotonContextual === 'function') actualizarBotonContextual();

    } catch (error) {
        console.error("Error general en enviarTextoConInstrucciones:", error);
        if(typeof progressBarManager !== 'undefined') progressBarManager.error(`Error: ${error.message}`);
        alert(`Se produjo un error durante la generación: ${error.message}`);
        ultimaHistoriaGeneradaJson = null; 
    }
}

function lanzarGeneracionHistoria() {
    const idea = document.getElementById('gemini1-modal').value;
    const escenas = document.getElementById('cantidadescenas-modal').value;
    const frames = document.getElementById('cantidadeframes-modal').value;
    const usarDatos = document.getElementById('incluir-datos-ia-modal').checked;

    document.getElementById('gemini1').value = idea;
    document.getElementById('cantidadescenas').value = escenas;
    document.getElementById('cantidadeframes').value = frames;
    document.getElementById('incluir-datos-ia').checked = usarDatos;

    cerrarModalIAHerramientas();
    enviarTextoConInstrucciones();
}