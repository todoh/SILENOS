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

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=" + apiKey, {
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

    // --- INICIO DE LA CORRECCIÓN ---
    // 1. Preparamos la vista en la sección del guion
    if (typeof prepararVistaParaGeneracionIA === 'function') {
        prepararVistaParaGeneracionIA();
    } else {
        console.error("La función prepararVistaParaGeneracionIA no está definida en guion.js");
        alert("Error: No se puede iniciar la generación del guion.");
        return; 
    }

    // 2. Iniciamos el gestor de progreso global
    if (typeof progressBarManager !== 'undefined') {
        progressBarManager.start("Generando Guion", () => {
             // Esta función se ejecuta si se hace clic en la barra de progreso
            if(typeof abrirGuion === 'function') abrirGuion();
        });
    }
    
    // 3. Lanzamos la generación
    // Usamos un pequeño timeout para asegurar que la UI se actualice antes del proceso pesado
    setTimeout(() => {
        enviarTextoConInstrucciones(idea, escenas, frames, usarDatos);
    }, 100);
    // --- FIN DE LA CORRECCIÓN ---
}

// Reemplaza esta función en geminialfa.js

async function enviarTextoConInstrucciones() {
    actualizarParametrosIA();
    const geminichat = document.getElementById("gemini1").value;

    if (!geminichat.trim()) {
        alert("Por favor, escribe la idea para tu historia.");
        return;
    }

    // 1. Prepara la UI y la barra de progreso
    if (typeof prepararVistaParaGeneracionIA !== 'function' || typeof progressBarManager === 'undefined') {
        alert("Error: Las funciones de UI (guion.js) o la barra de progreso (animaciones.js) no están cargadas.");
        return;
    }
    prepararVistaParaGeneracionIA();
    progressBarManager.start('Iniciando proceso de IA...');

    // Resetear variables
    let historiaContenidoHTML = ""; // Acumulador para el contenido final
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
        // --- PASO 1: Título y Planteamiento General ---
        progressBarManager.set(10, 'Generando título y planteamiento...');
        const promptPaso1 = `
            ${contextoDeDatos}
            **Idea Inicial:** "${geminichat}"
            **Tarea:** Genera un título creativo y un resumen general detallado de la historia.
            **Formato JSON OBLIGATORIO:** {"titulo_historia_sugerido": "string", "planteamiento_general_historia": "string"}`;
        
        const respuestaPaso1 = await llamarIAConFeedback(promptPaso1, "Paso 1: Título y Planteamiento");
        const tituloHistoriaGlobal = respuestaPaso1.titulo_historia_sugerido || "Historia Sin Título (IA)";
        const planteamientoGeneralGlobal = respuestaPaso1.planteamiento_general_historia || "No se generó planteamiento.";
        
        ultimaHistoriaGeneradaJson.titulo_historia = tituloHistoriaGlobal;

        // Visualización en tiempo real
        let chunkHTML = `<h1>${tituloHistoriaGlobal}</h1><div class="guion-ia-general"><h2>Planteamiento General</h2><p>${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}</p></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);
        await sleep(500);

        // --- PASO 2: Resúmenes por Capítulos ---
        progressBarManager.set(25, 'Dividiendo la historia en capítulos...');
        const promptPaso2 = `
            Título: ${tituloHistoriaGlobal}
            Planteamiento: ${planteamientoGeneralGlobal}
            **Tarea:** Divide el planteamiento en ${window.cantidaddeescenas} resúmenes de capítulo.
            **Formato JSON OBLIGATORIO:** {"resumen_por_escenas": [{"resumen_escena": "string"}]}`;

        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Resúmenes de Capítulos`);
        const resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas || [];

        // Visualización en tiempo real
        chunkHTML = `<div class="guion-ia-general"><h2>Planteamiento por Capítulos</h2><ul>`;
        resumenPorEscenasGlobal.forEach((res, idx) => {
            chunkHTML += `<li><strong>Capítulo ${idx + 1}:</strong> ${res.resumen_escena || ""}</li>`;
        });
        chunkHTML += `</ul></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);
        await sleep(500);

        // --- PASO 3: Desarrollo de cada Capítulo ---
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
            
            const respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Capítulo ${i + 1}`);
            
            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: respuestaPaso3Escena.frames_desarrollados.map(f => ({ contenido: f.contenido_frame || "" }))
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);
            
            // Visualización en tiempo real
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

        // --- FINALIZACIÓN ---
        progressBarManager.set(95, 'Finalizando y guardando...');
        
        // Llama a la función de finalización de guion.js
        finalizarGeneracionGuion(tituloHistoriaGlobal, historiaContenidoHTML);
        
        progressBarManager.finish("¡Proceso completado!");
        alert("¡Proceso completado! El guion se ha generado en su sección.");
        if (typeof abrirGuion === 'function') abrirGuion();

    } catch (error) {
        console.error("Error en enviarTextoConInstrucciones:", error);
        progressBarManager.error(`Error: ${error.message}`);
        alert(`Se produjo un error: ${error.message}`);
        // Limpia el guion en progreso en caso de error
        if (typeof finalizarGeneracionGuion === 'function') {
            finalizarGeneracionGuion("Error de Generación", `<p>Ocurrió un error: ${error.message}</p>`);
        }
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

    // NOTA: El error "no se encontró el modal generador-ia-modal" ocurre aquí.
    // Asegúrate de que el ID del modal en tu archivo HTML es exactamente "generador-ia-modal".
    if (typeof cerrarModal === 'function') {
        cerrarModal('generador-ia-modal');
    }

    // --- INICIO DE LA CORRECCIÓN ---
    // 1. Preparamos la vista en la sección del guion llamando a la función correcta.
    if (typeof prepararVistaParaGeneracionIA === 'function') {
        prepararVistaParaGeneracionIA();
    } else {
        console.error("La función prepararVistaParaGeneracionIA no está definida en guion.js");
        alert("Error: No se puede iniciar la generación del guion.");
        return; 
    }

    // 2. Iniciamos el gestor de progreso global
    if (typeof progressBarManager !== 'undefined') {
        progressBarManager.start("Generando Guion", () => {
             // Esta función se ejecuta si se hace clic en la barra de progreso
            if(typeof abrirGuion === 'function') abrirGuion();
        });
    }
    
    // 3. Lanzamos la generación
    setTimeout(() => {
        enviarTextoConInstrucciones(idea, escenas, frames, usarDatos);
    }, 100);
    // --- FIN DE LA CORRECCIÓN ---
}