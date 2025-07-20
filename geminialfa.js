// ============== Contenido para geminialfa.js (CORREGIDO Y ROBUSTO) ==============

let ultimaHistoriaGeneradaJson = null;
let planteamientoGeneralGlobal = "";
let resumenPorEscenasGlobal = [];
let tituloHistoriaGlobal = "";

/**
 * Recolecta y agrupa los datos de la sección "Datos" por su etiqueta.
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

        datosAgrupados[nombreCategoria].push({
            nombre: nombre,
            descripcion: descripcion
        });
    }
    return datosAgrupados;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Limpia la respuesta de la IA para extraer un objeto JSON válido.
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


/**
 * **FUNCIÓN CORREGIDA CON REINTENTOS AUTOMÁTICOS Y MODELO DINÁMICO**
 * Llama a la IA y reintenta automáticamente si la respuesta no es un JSON válido.
 * @param {string} prompt - El prompt para la IA.
 * @param {string} etapaDescriptiva - Descripción del paso actual para los logs.
 * @param {string} model - El modelo de IA a utilizar (ej. 'gemini-2.5-pro').
 * @param {boolean} esJsonEsperado - Si se espera una respuesta JSON.
 * @param {number} maxRetries - El número máximo de reintentos.
 * @returns {Promise<any>} La respuesta de la API, parseada si es JSON.
 */
async function llamarIAConFeedback(prompt, etapaDescriptiva, model, esJsonEsperado = true, maxRetries = 3) {
    const chatDiv = window.chatDiv;

    if (chatDiv) {
        chatDiv.innerHTML += `<p><strong>Silenos está trabajando:</strong> Consultando a la IA (${model}) para ${etapaDescriptiva}...</p>`;
        chatDiv.scrollTop = chatDiv.scrollHeight;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (typeof apiKey === 'undefined' || !apiKey) {
                throw new Error("La API Key de Gemini no está definida. Configúrala en la sección de Ajustes.");
            }

            // Llamada a la API - Usando el modelo dinámico
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` + apiKey, {
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
                const parsedJson = JSON.parse(textoJsonLimpio); // Intento de parseo
                
                if (chatDiv && attempt > 1) {
                     chatDiv.innerHTML += `<p><strong>Silenos informa:</strong> Éxito en el intento ${attempt} para ${etapaDescriptiva}.</p>`;
                     chatDiv.scrollTop = chatDiv.scrollHeight;
                }
                return parsedJson;
            }
            
            return replyText; // Si no se esperaba JSON

        } catch (error) {
            console.error(`Intento ${attempt}/${maxRetries} fallido para '${etapaDescriptiva}':`, error.message);
            
            if (chatDiv) {
                chatDiv.innerHTML += `<p><strong>Aviso de Silenos:</strong> El intento ${attempt} para ${etapaDescriptiva} falló. Reintentando...</p>`;
                chatDiv.scrollTop = chatDiv.scrollHeight;
            }

            if (attempt === maxRetries) {
                const finalError = new Error(`Fallaron todos los ${maxRetries} intentos para '${etapaDescriptiva}'. Último error: ${error.message}`);
                if (chatDiv) {
                    chatDiv.innerHTML += `<p><strong>Error Crítico:</strong> ${finalError.message}</p>`;
                    chatDiv.scrollTop = chatDiv.scrollHeight;
                }
                throw finalError; // Lanzamos el error final después de todos los reintentos
            }
            
            await sleep(1000 + attempt * 500); 
        }
    }
}

// El resto de tus funciones se mantienen intactas
function lanzarGeneracionHistoria() {
    const idea = document.getElementById('gemini1-modal').value;
    const escenas = document.getElementById('cantidadescenas-modal').value;
    const frames = document.getElementById('cantidadeframes-modal').value;
    const usarDatos = document.getElementById('incluir-datos-ia-modal').checked;

    document.getElementById('gemini1').value = idea;
    document.getElementById('cantidadescenas').value = escenas;
    document.getElementById('cantidadeframes').value = frames;
    document.getElementById('incluir-datos-ia').checked = usarDatos;

    cerrarModal('generador-ia-modal');

    if (typeof prepararVistaParaGeneracionIA === 'function') {
        prepararVistaParaGeneracionIA();
    } else {
        console.error("La función prepararVistaParaGeneracionIA no está definida en guion.js");
        alert("Error: No se puede iniciar la generación del guion.");
        return; 
    }

    if (typeof progressBarManager !== 'undefined') {
        progressBarManager.start("Generando Guion", () => {
            if(typeof abrirGuion === 'function') abrirGuion();
        });
    }
    
    setTimeout(() => {
        enviarTextoConInstrucciones(idea, escenas, frames, usarDatos);
    }, 100);
}

async function enviarTextoConInstrucciones() {
    actualizarParametrosIA();
    const geminichat = document.getElementById("gemini1").value;

    if (!geminichat.trim()) {
        alert("Por favor, escribe la idea para tu historia.");
        return;
    }

    if (typeof prepararVistaParaGeneracionIA !== 'function' || typeof progressBarManager === 'undefined') {
        alert("Error: Las funciones de UI (guion.js) o la barra de progreso (animaciones.js) no están cargadas.");
        return;
    }
    prepararVistaParaGeneracionIA();
    progressBarManager.start('Iniciando proceso de IA...');

    let historiaContenidoHTML = "";
    ultimaHistoriaGeneradaJson = { historia: [] };

    const incluirDatos = document.getElementById('incluir-datos-ia').checked;
    let contextoDeDatos = "";
    if (incluirDatos) {
        const datosAgrupados = recolectarYAgruparDatos();
        if (Object.keys(datosAgrupados).length > 0) {
            contextoDeDatos += "Aquí tienes una lista de Datos Fundamentales que DEBEN ser incluidos y desarrollados en la historia:\n\n";
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
        progressBarManager.set(10, 'Generando título y planteamiento...');
        const promptPaso1 = `
            ${contextoDeDatos}
            **Idea Inicial:** "${geminichat}"
            **Tarea:** Genera un título creativo y un resumen general detallado de la historia.
            **Formato JSON OBLIGATORIO:** {"titulo_historia_sugerido": "string", "planteamiento_general_historia": "string"}`;
        
        const respuestaPaso1 = await llamarIAConFeedback(promptPaso1, "Paso 1: Título y Planteamiento", 'gemini-2.5-pro');
        const tituloHistoriaGlobal = respuestaPaso1.titulo_historia_sugerido || "Historia Sin Título (IA)";
        const planteamientoGeneralGlobal = respuestaPaso1.planteamiento_general_historia || "No se generó planteamiento.";
        
        ultimaHistoriaGeneradaJson.titulo_historia = tituloHistoriaGlobal;

        let chunkHTML = `<h1>${tituloHistoriaGlobal}</h1><div class="guion-ia-general"><h2>Planteamiento General</h2><p>${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}</p></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);
        await sleep(500);

        progressBarManager.set(25, 'Dividiendo la historia en capítulos...');
        const promptPaso2 = `
            Título: ${tituloHistoriaGlobal}
            Planteamiento: ${planteamientoGeneralGlobal}
            **Tarea:** Divide el planteamiento en ${window.cantidaddeescenas} resúmenes de capítulo.
            **Formato JSON OBLIGATORIO:** {"resumen_por_escenas": [{"resumen_escena": "string"}]}`;

        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Resúmenes de Capítulos`, 'gemini-2.5-pro');
        const resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas || [];

        chunkHTML = `<div class="guion-ia-general"><h2>Planteamiento por Capítulos</h2><ul>`;
        resumenPorEscenasGlobal.forEach((res, idx) => {
            chunkHTML += `<li><strong>Capítulo ${idx + 1}:</strong> ${res.resumen_escena || ""}</li>`;
        });
        chunkHTML += `</ul></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);
        await sleep(500);

        let contextoEscenaAnteriorSerializado = "";
        for (let i = 0; i < resumenPorEscenasGlobal.length; i++) {
            const progress = 30 + (60 * (i / resumenPorEscenasGlobal.length));
            progressBarManager.set(progress, `Desarrollando capítulo ${i + 1}...`);
            
            const promptPaso3 = `
                Título: ${tituloHistoriaGlobal}
                Resumen del Capítulo ${i + 1}: ${resumenPorEscenasGlobal[i].resumen_escena}
                ${contextoEscenaAnteriorSerializado ? `Contenido del Capítulo Anterior:\n${contextoEscenaAnteriorSerializado}` : ""}
                **Tarea:** Desarrolla el capítulo ${i + 1}, divídelo en ${window.cantidadframes} frames y dale un título.
                **Formato JSON OBLIGATORIO:** {"titulo_escena_desarrollada": "string", "frames_desarrollados": [{"contenido_frame": "string"}]}`;
            
            const respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Capítulo ${i + 1}`, 'gemini-2.5-flash');
            
            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: respuestaPaso3Escena.frames_desarrollados.map(f => ({ contenido: f.contenido_frame || "" }))
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);
            
            chunkHTML = `<div class="guion-ia-escena"><h3>${escenaProcesada.titulo_escena || `Capítulo ${i + 1}`}</h3>`;
            escenaProcesada.frames.forEach((frame, frameIdx) => {
                chunkHTML += `<div class="guion-ia-frame"><h4>Frame ${frameIdx + 1}</h4><p>${(frame.contenido || "").replace(/\n/g, "<br>")}</p></div>`;
            });
            chunkHTML += `</div>`;
            historiaContenidoHTML += chunkHTML;
            actualizarContenidoGuionEnProgreso(chunkHTML);
            
            contextoEscenaAnteriorSerializado = JSON.stringify(respuestaPaso3Escena, null, 2);
            await sleep(500);
        }

        progressBarManager.set(95, 'Finalizando y guardando...');
        
        finalizarGeneracionGuion(tituloHistoriaGlobal, historiaContenidoHTML);
        
        progressBarManager.finish("¡Proceso completado!");
        alert("¡Proceso completado! El guion se ha generado en su sección.");
        if (typeof abrirGuion === 'function') abrirGuion();

    } catch (error) {
        console.error("Error en enviarTextoConInstrucciones:", error);
        progressBarManager.error(`Error: ${error.message}`);
        alert(`Se produjo un error: ${error.message}`);
        if (typeof finalizarGeneracionGuion === 'function') {
            finalizarGeneracionGuion("Error de Generación", `<p>Ocurrió un error: ${error.message}</p>`);
        }
    }
}
