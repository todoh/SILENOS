// ============== Contenido para geminialfa.js (FLUJO CORREGIDO Y COMPLETO) ==============

let ultimaHistoriaGeneradaJson = null;
let planteamientoGeneralGlobal = "";
let resumenPorEscenasGlobal = [];
let tituloHistoriaGlobal = "";
let arcosFiltrados = new Set();
// NUEVO: Almacenamiento para guiones generados
let guionesGuardados = {};

// NUEVO: Cargar guiones al iniciar la aplicación
function cargarGuionesGuardados() {
    const data = localStorage.getItem('silenosGuiones');
    if (data) {
        try {
            guionesGuardados = JSON.parse(data);
            console.log("Guiones guardados cargados desde localStorage.");
        } catch(e) {
            console.error("Error al parsear guiones guardados:", e);
            guionesGuardados = {};
        }
    }
}
// NUEVO: Guardar guiones en localStorage
function guardarGuiones() {
    localStorage.setItem('silenosGuiones', JSON.stringify(guionesGuardados));
    console.log("Guiones actualizados guardados en localStorage.");
}
// Llamamos a la carga inicial
cargarGuionesGuardados();


/**
 * Lee los checkboxes del modal y guarda los valores seleccionados
 * en la variable global 'arcosFiltrados'.
 */
function actualizarArcosSeleccionados() {
    const checkboxesMarcados = document.querySelectorAll('.ia-arc-filter-checkbox:checked');
    arcosFiltrados = new Set(Array.from(checkboxesMarcados).map(cb => cb.value));
    console.log("Arcos seleccionados para el filtro:", arcosFiltrados);
}
 
/**
 * Recolecta los datos de Personajes, Lugares, etc., que coinciden
 * con los arcos narrativos seleccionados por el usuario.
 * @returns {object} Un objeto con los datos agrupados por categoría.
 */
function recolectarYAgruparDatos() {
    if (!arcosFiltrados || arcosFiltrados.size === 0) {
        console.warn("Filtro de arcos vacío. No se recolectaron datos para la IA.");
        return {};
    }

    const datosAgrupados = {};
    const contenedorDatos = document.getElementById("listapersonajes");
    if (!contenedorDatos) return datosAgrupados;

    for (const nodoDato of contenedorDatos.children) {
        const nombre = nodoDato.querySelector("input.nombreh")?.value.trim() || "";
        if (!nombre) continue;

        const descripcion = nodoDato.querySelector("textarea")?.value.trim() || "";
        const arcoEl = nodoDato.querySelector(".change-arc-btn");
        const arco = arcoEl ? arcoEl.dataset.arco : 'sin_arco';

        if (!arcosFiltrados.has(arco)) continue;

        const etiquetaEl = nodoDato.querySelector(".change-tag-btn"); 
        const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
        const nombreCategoria = etiqueta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (!datosAgrupados[nombreCategoria]) {
            datosAgrupados[nombreCategoria] = [];
        }

        const embedding = nodoDato.dataset.embedding || '[]';
        
        datosAgrupados[nombreCategoria].push({
            nombre: nombre,
            descripcion: descripcion,
            embedding: embedding 
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
    const primerLlave = textoJson.indexOf('{');
    const ultimaLlave = textoJson.lastIndexOf('}');
    if (primerLlave !== -1 && ultimaLlave > primerLlave) {
        return textoJson.substring(primerLlave, ultimaLlave + 1).trim();
    }
    console.error(`No se pudo extraer una estructura JSON válida del texto para '${etapaDescriptiva}'. Respuesta cruda:`, textoCrudo);
    throw new Error(`La respuesta de la IA para ${etapaDescriptiva} no contenía un objeto JSON válido.`);
}

/**
 * Llama a la IA para generación de contenido, con reintentos automáticos.
 */
async function llamarIAConFeedback(prompt, etapaDescriptiva, model, esJsonEsperado = true, maxRetries = 3) {
    // ... (código de la función sin cambios)
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (typeof apiKey === 'undefined' || !apiKey) {
                throw new Error("La API Key de Gemini no está definida. Configúrala en Ajustes.");
            }
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` + apiKey, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) {
                const errorDataText = await response.text();
                throw new Error(`Error de API en ${etapaDescriptiva}: ${response.status}. Detalles: ${errorDataText}`);
            }
            const data = await response.json();
            const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || (esJsonEsperado ? "{}" : "");

            if (esJsonEsperado) {
                const textoJsonLimpio = limpiarYExtraerJson(replyText, etapaDescriptiva);
                return JSON.parse(textoJsonLimpio);
            }
            return replyText;
        } catch (error) {
            console.error(`Intento ${attempt}/${maxRetries} fallido para '${etapaDescriptiva}':`, error.message);
            if (attempt === maxRetries) {
                throw new Error(`Fallaron todos los ${maxRetries} intentos para '${etapaDescriptiva}'. Último error: ${error.message}`);
            }
            await sleep(1000 + attempt * 500);
        }
    }
}

/**
 * Inicia el flujo de generación de historia desde el modal de la UI.
 */
function lanzarGeneracionHistoria() {
    // ... (código de la función sin cambios)
    actualizarArcosSeleccionados();
    const idea = document.getElementById('gemini1-modal').value;
    const escenas = document.getElementById('cantidadescenas-modal').value;
    const frames = document.getElementById('cantidadeframes-modal').value;
    const usarDatos = document.getElementById('incluir-datos-ia-modal').checked;

    document.getElementById('gemini1').value = idea;
    document.getElementById('cantidadescenas').value = escenas;
    document.getElementById('cantidadeframes').value = frames;
    document.getElementById('incluir-datos-ia').checked = usarDatos;

    cerrarModal('modal-ia-herramientas');
    cerrarModal('modal-overlay');

    if (typeof prepararVistaParaGeneracionIA === 'function') {
        prepararVistaParaGeneracionIA();
    } else {
        alert("Error: No se puede iniciar la generación del guion.");
        return;
    }
    if (typeof progressBarManager !== 'undefined') {
        progressBarManager.start("Generando Guion");
    }
    setTimeout(() => {
        enviarTextoConInstrucciones();
    }, 100);
}

/**
 * Función principal que orquesta todo el proceso de generación de la historia con IA.
 */
async function enviarTextoConInstrucciones() {
    actualizarParametrosIA(); 
    const geminichat = document.getElementById("gemini1").value;

    if (!geminichat.trim()) {
        alert("Por favor, escribe la idea para tu historia.");
        return;
    }
    
    // --- CORRECCIÓN CLAVE: YA NO SE VERIFICA EL LIBRO ACTIVO ---
    // El proceso de guion es independiente.
    
    prepararVistaParaGeneracionIA();
    progressBarManager.start('Iniciando proceso de IA...');

    let historiaContenidoHTML = "";
    ultimaHistoriaGeneradaJson = { historia: [] };

    try {
        // ... (Todo el proceso de llamadas a la IA para generar el guion se mantiene igual)
        progressBarManager.set(10, 'Generando título y planteamiento...');
        const datosAgrupados = recolectarYAgruparDatos();
        const contextoInicialDatos = Object.keys(datosAgrupados).length > 0 ?
            `**Instrucción Maestra OBLIGATORIA:** Basa la historia en estos datos: ${JSON.stringify(datosAgrupados, null, 2)}\n\n` : "";

        const promptPaso1 = `${contextoInicialDatos}**Idea Inicial:** "${geminichat}"\n\n**Tarea:** Genera un título y un resumen general de la historia.\n**Formato JSON OBLIGATORIO:** {"titulo_historia_sugerido": "string", "planteamiento_general_historia": "string"}`;
        const respuestaPaso1 = await llamarIAConFeedback(promptPaso1, "Paso 1: Título y Planteamiento", 'gemini-2.5-flash');

        tituloHistoriaGlobal = respuestaPaso1.titulo_historia_sugerido || "Historia Sin Título";
        planteamientoGeneralGlobal = respuestaPaso1.planteamiento_general_historia || "No se generó planteamiento.";
        
        ultimaHistoriaGeneradaJson = {
            tituloOriginal: tituloHistoriaGlobal,
            planteamientoGeneral: planteamientoGeneralGlobal,
            resumenPorEscenas: [],
            historia: [],
            ideaOriginal: geminichat,
            datosUsados: recolectarYAgruparDatos(),
            cantidadFramesOriginal: window.cantidadframes,
            fechaGeneracion: new Date().toISOString()
        };
        
        historiaContenidoHTML += `<h1 dir="auto">${tituloHistoriaGlobal}</h1><div class="guion-ia-general"><h2>Planteamiento General</h2><p dir="auto">${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}</p></div>`;
        actualizarContenidoGuionEnProgreso(historiaContenidoHTML);

        progressBarManager.set(25, 'Dividiendo la historia en capítulos...');
        const promptPaso2 = `Título: ${tituloHistoriaGlobal}\nPlanteamiento: ${planteamientoGeneralGlobal}\n**Tarea:** Divide el planteamiento en ${window.cantidaddeescenas} resúmenes de capítulo.\n**Formato JSON OBLIGATORIO:** {"resumen_por_escenas": [{"resumen_escena": "string"}]}`;
        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Resúmenes de Capítulos`, 'gemini-2.5-flash');
        resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas || [];
        ultimaHistoriaGeneradaJson.resumenPorEscenas = resumenPorEscenasGlobal;

        let chunkHTML = `<div class="guion-ia-general"><h2>Planteamiento por Capítulos</h2><ul>`;
        resumenPorEscenasGlobal.forEach((res, idx) => {
            chunkHTML += `<li dir="auto"><strong>Capítulo ${idx + 1}:</strong> ${res.resumen_escena || ""}</li>`;
        });
        chunkHTML += `</ul></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);

        for (let i = 0; i < resumenPorEscenasGlobal.length; i++) {
            const progress = 30 + (65 * (i / resumenPorEscenasGlobal.length));
            progressBarManager.set(progress, `Desarrollando capítulo ${i + 1}/${resumenPorEscenasGlobal.length}...`);

            const promptPaso3 = `Título General: ${tituloHistoriaGlobal}\nResumen Específico del Capítulo ${i + 1}: ${resumenPorEscenasGlobal[i].resumen_escena}\n**Tarea:** Desarrolla el capítulo ${i + 1}. Divídelo en ${window.cantidadframes} frames y dale un título.\n**Formato JSON OBLIGATORIO:** {"titulo_escena_desarrollada": "string", "frames_desarrollados": [{"contenido_frame": "string"}]}`;
            const respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Capítulo ${i + 1}`, 'gemini-2.5-flash');

            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: (respuestaPaso3Escena.frames_desarrollados || []).map(f => ({ contenido: f.contenido_frame || "" }))
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);

            chunkHTML = `<div class="guion-ia-escena"><h3 dir="auto">${escenaProcesada.titulo_escena || `Capítulo ${i + 1}`}</h3>`;
            escenaProcesada.frames.forEach((frame, frameIdx) => {
                chunkHTML += `<div class="guion-ia-frame"><h4>Frame ${frameIdx + 1}</h4><p dir="auto">${(frame.contenido || "").replace(/\n/g, "<br>")}</p></div>`;
            });
            chunkHTML += `</div>`;
            historiaContenidoHTML += chunkHTML;
            actualizarContenidoGuionEnProgreso(chunkHTML);
            await sleep(200);
        }

        // --- CAMBIO FUNDAMENTAL: SOLO GENERAR Y GUARDAR EL GUION ---
        progressBarManager.set(98, 'Finalizando y guardando guion...');
        finalizarGeneracionGuion(tituloHistoriaGlobal, historiaContenidoHTML);

        // Guardar el guion completo en nuestra variable de guiones
        const guionId = `guion-${Date.now()}`;
        guionesGuardados[guionId] = ultimaHistoriaGeneradaJson;
        guardarGuiones(); // Persistir en localStorage

        progressBarManager.finish("¡Guion generado y guardado con éxito!");
        alert("¡Guion generado con éxito! Ahora puedes seleccionarlo desde la sección 'Libro' para poblar un libro.");
        
        if (typeof abrirGuion === 'function') {
            abrirGuion();
        }
        // --- FIN DEL CAMBIO ---

    } catch (error) {
        console.error("Error en enviarTextoConInstrucciones:", error);
        progressBarManager.error(`Error: ${error.message}`);
        alert(`Se produjo un error: ${error.message}`);
        if (typeof finalizarGeneracionGuion === 'function') {
            finalizarGeneracionGuion("Error de Generación", `<p>Ocurrió un error: ${error.message}</p>`);
        }
    }
}
