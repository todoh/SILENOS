// ============== Contenido para geminialfa.js (ACTUALIZADO CON SOPORTE MULTILINGÜE) ==============

let ultimaHistoriaGeneradaJson = null;
let planteamientoGeneralGlobal = "";
let resumenPorEscenasGlobal = [];
let tituloHistoriaGlobal = "";
let arcosFiltrados = new Set();
/**
 * Lee los checkboxes del modal y guarda los valores seleccionados
 * en la variable global 'arcosFiltrados'.
 */
function actualizarArcosSeleccionados() {
    const checkboxesMarcados = document.querySelectorAll('.ia-arc-filter-checkbox:checked');
    // Creamos un nuevo Set con los valores de los checkboxes marcados
    arcosFiltrados = new Set(Array.from(checkboxesMarcados).map(cb => cb.value));
    
    console.log("Arcos seleccionados para el filtro:", arcosFiltrados); // Útil para depurar
}
 
function recolectarYAgruparDatos() {
    // Ya no se consultan los checkboxes aquí. Se usa la variable global 'arcosFiltrados'.
    // Si el set de filtros está vacío, es mejor devolver un objeto vacío para evitar procesar todo.
    if (!arcosFiltrados || arcosFiltrados.size === 0) {
        console.warn("Filtro de arcos vacío. No se recolectaron datos para la IA.");
        return {};
    }

    const datosAgrupados = {};
    const contenedorDatos = document.getElementById("listapersonajes");
    if (!contenedorDatos) return datosAgrupados;

    for (const nodoDato of contenedorDatos.children) {
        const nombre = nodoDato.querySelector("input.nombreh")?.value.trim() || "";
        if (!nombre) {
            continue; // Siempre omitir datos sin nombre.
        }

        const descripcion = nodoDato.querySelector("textarea")?.value.trim() || "";
        
        // --- CORRECCIÓN 1: Obtener el ARCO del dato ---
        // El filtro se aplica sobre el arco, no sobre la etiqueta.
        const arcoEl = nodoDato.querySelector(".change-arc-btn");
        const arco = arcoEl ? arcoEl.dataset.arco : 'sin_arco'; // Asignar un arco por defecto

        // --- CORRECCIÓN 2: Usar la variable global y comprobar el ARCO ---
        // Se comprueba si el 'arco' de este dato está en el set 'arcosFiltrados'.
        if (!arcosFiltrados.has(arco)) {
            continue; // Si el arco no está en el filtro, se salta este dato.
        }

        // Se mantiene la etiqueta para usarla como nombre de la categoría en el resultado.
        const etiquetaEl = nodoDato.querySelector(".change-tag-btn"); 
        const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';

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
 * Llama a la IA para generación de contenido y reintenta automáticamente.
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
                const parsedJson = JSON.parse(textoJsonLimpio);
                if (chatDiv && attempt > 1) {
                     chatDiv.innerHTML += `<p><strong>Silenos informa:</strong> Éxito en el intento ${attempt} para ${etapaDescriptiva}.</p>`;
                     chatDiv.scrollTop = chatDiv.scrollHeight;
                }
                return parsedJson;
            }
            return replyText;
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
                throw finalError;
            }
            await sleep(1000 + attempt * 500);
        }
    }
}


async function generarEmbedding(texto, maxRetries = 3) {
    const model = 'gemini-embedding-001';
    const chatDiv = window.chatDiv;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (typeof apiKey === 'undefined' || !apiKey) {
                throw new Error("La API Key de Gemini no está definida.");
            }
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=` + apiKey, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: `models/${model}`,
                    content: { parts: [{ text: texto }] }
                })
            });

            if (!response.ok) {
                const errorDataText = await response.text();
                throw new Error(`Error de API en embedding: ${response.status}. Detalles: ${errorDataText}`);
            }

            const data = await response.json();
            if (data.embedding?.values) {
                return data.embedding.values;
            } else {
                throw new Error("La respuesta de la API de embedding no contenía un vector válido.");
            }

        } catch (error) {
            console.error(`Intento de embedding ${attempt}/${maxRetries} fallido:`, error.message);
            if (attempt === maxRetries) {
                 if (chatDiv) chatDiv.innerHTML += `<p><strong>Error Crítico:</strong> Falló la generación de embedding.</p>`;
                throw error;
            }
            await sleep(500 * attempt);
        }
    }
}


function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
}


function lanzarGeneracionHistoria() {
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
        enviarTextoConInstrucciones();
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
    let datosConEmbeddings = []; 

    try {
        if (incluirDatos) {
            progressBarManager.set(5, 'Procesando y vectorizando datos...');
            const datosAgrupados = recolectarYAgruparDatos();
            if (Object.keys(datosAgrupados).length > 0) {
                let datosParaEmbeber = [];
                for (const categoria in datosAgrupados) {
                    datosAgrupados[categoria].forEach(dato => {
                        const textoCompleto = `Categoría: ${categoria}, Nombre: ${dato.nombre}, Descripción: ${dato.descripcion}`;
                        datosParaEmbeber.push({ original: textoCompleto });
                    });
                }
                await Promise.all(datosParaEmbeber.map(async (dato) => {
                    dato.embedding = await generarEmbedding(dato.original);
                }));
                datosConEmbeddings = datosParaEmbeber;
                console.log("Embeddings generados para todos los datos.", datosConEmbeddings);
            }
        }

        progressBarManager.set(10, 'Generando título y planteamiento...');

        let contextoInicialDatos = "";
        if (incluirDatos && datosConEmbeddings.length > 0) {
            contextoInicialDatos += "**Instrucción Maestra OBLIGATORIA:** La historia que vas a crear DEBE basarse fundamentalmente en los siguientes datos. Los personajes listados DEBEN ser los protagonistas. La trama DEBE ocurrir en las ubicaciones mencionadas y girar en torno a los eventos descritos.\n\n**DATOS FUNDAMENTALES:**\n";
            datosConEmbeddings.forEach(dato => {
                 contextoInicialDatos += `- ${dato.original}\n`;
            });
            contextoInicialDatos += "\n";
        }

        // CAMBIO 1: Instrucción de idioma explícita en el primer prompt.
        const promptPaso1 = `
            ${contextoInicialDatos}
            **Idea Inicial del Usuario:** "${geminichat}"
            
            **Instrucción de Idioma OBLIGATORIA:** Tu respuesta COMPLETA debe estar en el mismo idioma que la "Idea Inicial del Usuario". Si la idea está en árabe, toda tu respuesta (título y planteamiento) DEBE ser en árabe.
            
            **Tarea:** Usando la Idea Inicial como inspiración, genera un título creativo y un resumen general detallado de la historia. Asegúrate de que los personajes y lugares de los DATOS FUNDAMENTALES sean los elementos centrales y protagonistas de tu propuesta. No inventes protagonistas nuevos si ya se han proporcionado.
            **Formato JSON OBLIGATORIO:** {"titulo_historia_sugerido": "string", "planteamiento_general_historia": "string"}`;

        const respuestaPaso1 = await llamarIAConFeedback(promptPaso1, "Paso 1: Título y Planteamiento", 'gemini-2.5-pro');
        tituloHistoriaGlobal = respuestaPaso1.titulo_historia_sugerido || "Historia Sin Título (IA)";
        planteamientoGeneralGlobal = respuestaPaso1.planteamiento_general_historia || "No se generó planteamiento.";
        ultimaHistoriaGeneradaJson.titulo_historia = tituloHistoriaGlobal;

        let chunkHTML = `<h1 dir="auto">${tituloHistoriaGlobal}</h1><div class="guion-ia-general"><h2>Planteamiento General</h2><p dir="auto">${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}</p></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);
        await sleep(500);

        progressBarManager.set(25, 'Dividiendo la historia en capítulos...');
        // CAMBIO 2: Instrucción de idioma en el segundo prompt.
        const promptPaso2 = `
            **Instrucción de Idioma OBLIGATORIA:** Tu respuesta COMPLETA debe estar en el mismo idioma que el Título y el Planteamiento. Si están en árabe, la respuesta DEBE ser en árabe.

            Título: ${tituloHistoriaGlobal}
            Planteamiento: ${planteamientoGeneralGlobal}
            **Tarea:** Divide el planteamiento en ${window.cantidaddeescenas} resúmenes de capítulo.
            **Formato JSON OBLIGATORIO:** {"resumen_por_escenas": [{"resumen_escena": "string"}]}`;

        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Resúmenes de Capítulos`, 'gemini-2.5-pro');
        resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas || [];

        chunkHTML = `<div class="guion-ia-general"><h2>Planteamiento por Capítulos</h2><ul>`;
        resumenPorEscenasGlobal.forEach((res, idx) => {
            chunkHTML += `<li dir="auto"><strong>Capítulo ${idx + 1}:</strong> ${res.resumen_escena || ""}</li>`;
        });
        chunkHTML += `</ul></div>`;
        historiaContenidoHTML += chunkHTML;
        actualizarContenidoGuionEnProgreso(chunkHTML);
        await sleep(500);

        let contextoEscenaAnteriorSerializado = "";
        for (let i = 0; i < resumenPorEscenasGlobal.length; i++) {
            const progress = 30 + (60 * (i / resumenPorEscenasGlobal.length));
            progressBarManager.set(progress, `Analizando y desarrollando capítulo ${i + 1}...`);

            let contextoRelevante = "";
            if (datosConEmbeddings.length > 0) {
                const resumenEscena = resumenPorEscenasGlobal[i].resumen_escena;
                const embeddingQuery = await generarEmbedding(resumenEscena);
                
                datosConEmbeddings.forEach(dato => {
                    dato.similitud = cosineSimilarity(embeddingQuery, dato.embedding);
                });

                const datosMasRelevantes = datosConEmbeddings.sort((a, b) => b.similitud - a.similitud).slice(0, 3);
                
                contextoRelevante = "**Instrucciones Obligatorias para este capítulo:**\n" +
                                   "1. **Protagonistas y Ubicación:** La historia DEBE centrarse en los personajes y lugares descritos a continuación. No inventes nuevos protagonistas.\n" +
                                   "2. **Eventos:** El desarrollo del capítulo DEBE girar en torno a los eventos mencionados.\n\n" +
                                   "**Datos de Alta Relevancia para este capítulo:**\n";
                datosMasRelevantes.forEach(dato => {
                    contextoRelevante += `- ${dato.original}\n`;
                });
            }

            // CAMBIO 3: Instrucción de idioma en el prompt del bucle principal.
            const promptPaso3 = `
                **Instrucción de Idioma OBLIGATORIA:** Tu respuesta COMPLETA debe estar en el mismo idioma que el Título General. Si está en árabe, la respuesta DEBE ser en árabe.

                Título General: ${tituloHistoriaGlobal}
                Planteamiento General de la Historia: ${planteamientoGeneralGlobal}
                Resumen Específico del Capítulo ${i + 1}: ${resumenPorEscenasGlobal[i].resumen_escena}
                ${contextoEscenaAnteriorSerializado ? `Contexto del Capítulo Anterior:\n${contextoEscenaAnteriorSerializado}` : ""}
                
                ${contextoRelevante}

                **Tarea Principal:** Desarrolla el capítulo ${i + 1} siguiendo ESTRICTAMENTE las instrucciones y datos proporcionados. La narrativa debe ser coherente con el planteamiento general y el resumen del capítulo. Divídelo en ${window.cantidadframes} frames y dale un título al capítulo.
                **Formato JSON OBLIGATORIO:** {"titulo_escena_desarrollada": "string", "frames_desarrollados": [{"contenido_frame": "string"}]}`;
            
            const respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Capítulo ${i + 1}`, 'gemini-2.5-flash');
            
            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: respuestaPaso3Escena.frames_desarrollados.map(f => ({ contenido: f.contenido_frame || "" }))
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);
            
            chunkHTML = `<div class="guion-ia-escena"><h3 dir="auto">${escenaProcesada.titulo_escena || `Capítulo ${i + 1}`}</h3>`;
            escenaProcesada.frames.forEach((frame, frameIdx) => {
                chunkHTML += `<div class="guion-ia-frame"><h4>Frame ${frameIdx + 1}</h4><p dir="auto">${(frame.contenido || "").replace(/\n/g, "<br>")}</p></div>`;
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
