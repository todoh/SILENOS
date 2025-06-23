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
 * Llama a la API de IA, gestiona el feedback visual y parsea la respuesta JSON de forma robusta.
 * @param {string} prompt El prompt a enviar a la IA.
 * @param {string} etapaDescriptiva Descripción de la etapa actual para los mensajes de feedback.
 * @param {boolean} esJsonEsperado Indica si la respuesta esperada es JSON.
 * @returns {Promise<Object|string>} El objeto JSON parseado o el texto plano de la respuesta.
 */
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
            let textoJsonLimpio = replyText;
            const match = textoJsonLimpio.match(/```json\s*([\s\S]*?)\s*```/);
            if (match && match[1]) {
                textoJsonLimpio = match[1];
            } else {
                const inicioJson = textoJsonLimpio.indexOf('{');
                const finJson = textoJsonLimpio.lastIndexOf('}');
                if (inicioJson !== -1 && finJson !== -1 && finJson > inicioJson) {
                    textoJsonLimpio = textoJsonLimpio.substring(inicioJson, finJson + 1);
                } else {
                     const inicioArray = textoJsonLimpio.indexOf('[');
                    const finArray = textoJsonLimpio.lastIndexOf(']');
                    if (inicioArray !== -1 && finArray !== -1 && finArray > inicioArray) {
                        textoJsonLimpio = textoJsonLimpio.substring(inicioArray, finArray + 1);
                    } else {
                        throw new Error(`La respuesta de la IA para ${etapaDescriptiva} no parece contener un objeto o array JSON válido.`);
                    }
                }
            }
            try {
                // Primer intento de parseo directo
                return JSON.parse(textoJsonLimpio);
            } catch (parseError) {
                // Si falla, intentar sanitizar caracteres de control (como saltos de línea) y reintentar
                console.warn(`El parseo JSON inicial falló para ${etapaDescriptiva}. Intentando sanitizar...`, parseError.message);
                const textoSanitizado = textoJsonLimpio
                    .replace(/\n/g, "\\n")
                    .replace(/\r/g, "\\r")
                    .replace(/\t/g, "\\t");
                try {
                    return JSON.parse(textoSanitizado);
                } catch (errorSanitizado) {
                     console.error("Texto que falló el parseo JSON (después de sanitizar):", textoSanitizado);
                     // Si aún falla, lanzamos el error original que es más descriptivo del problema inicial.
                    throw new Error(`Error al analizar el JSON de la IA para ${etapaDescriptiva}. Detalles: ${parseError.message}`);
                }
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
    
    const chatDiv = window.chatDiv;
    planteamientoGeneralGlobal = "";
    resumenPorEscenasGlobal = [];
    tituloHistoriaGlobal = "";
    ultimaHistoriaGeneradaJson = { titulo_historia: "", historia: [] };

    const incluirDatos = document.getElementById('incluir-datos-ia').checked;
    let contextoDeDatos = "";

     if (incluirDatos) {
        const arcosSeleccionados = new Set();
        document.querySelectorAll('#ia-arcos-filter-container .ia-arc-filter-checkbox:checked').forEach(checkbox => {
            arcosSeleccionados.add(checkbox.value);
        });

        if (arcosSeleccionados.size > 0) {
            const todosLosDatos = [];
            const contenedorDatos = document.getElementById("listapersonajes");
            if (contenedorDatos) {
                for (const nodoDato of contenedorDatos.children) {
                    const nombre = nodoDato.querySelector("input.nombreh")?.value.trim() || "";
                    const descripcion = nodoDato.querySelector("textarea")?.value.trim() || "";
                    const etiquetaEl = nodoDato.querySelector(".change-tag-btn");
                    const arcoEl = nodoDato.querySelector(".change-arc-btn");
                    
                    const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
                    const arco = arcoEl ? arcoEl.dataset.arco : 'sin_arco';

                    if (etiqueta !== 'indeterminado' && etiqueta !== 'visual' && nombre) {
                        todosLosDatos.push({ nombre, descripcion, etiqueta, arco });
                    }
                }
            }

            const datosFiltrados = todosLosDatos.filter(dato => arcosSeleccionados.has(dato.arco));
            
            const datosAgrupados = datosFiltrados.reduce((acc, dato) => {
                const nombreCategoria = dato.etiqueta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                if (!acc[nombreCategoria]) {
                    acc[nombreCategoria] = [];
                }
                acc[nombreCategoria].push({ nombre: dato.nombre, descripcion: dato.descripcion });
                return acc;
            }, {});

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
    }
    try {
        const promptPaso1 = `
${contextoDeDatos}
**Idea Inicial del Usuario:**
"${geminichat}"

**Tarea:**

Determina el tipo de texto que se va a generar basandote en los Datos Fundamentales proporcionados (si los hay) y la idea del usuario siguiendo esta lista de referencias:
Clasificación de Textos
Narrativos: Relatan hechos/eventos (reales/ficticios) en un tiempo/lugar.

Cuento: Ficción breve, pocos personajes, trama simple.

Novela: Narración extensa/compleja, múltiples personajes/tramas.

Fábula: Relato breve con animales/objetos y moraleja.

Mito: Narración simbólica sobre orígenes (mundo, dioses, fenómenos).

Leyenda: Mezcla historia y fantasía, transmitido generacionalmente.

Crónica: Relato de hechos históricos en orden cronológico.

Biografía/Autobiografía: Narración de una vida.

Noticia: Relato objetivo/conciso de un suceso actual.

Descriptivos: Muestran características de personas, objetos, lugares, animales o situaciones.

Retrato: Rasgos físicos/psicológicos de una persona.

Topografía: Descripción de lugar/paisaje.

Zoografía: Descripción de un animal.

Guías turísticas: Describen lugares de interés.

Catálogos: Describen productos/servicios.

Ficha técnica: Descripción objetiva/detallada de un objeto/producto.

Expositivos (Informativos): Presentan información/explican un tema de forma clara y objetiva, sin opinión.

Ejemplos: Libros de texto, artículos de divulgación, enciclopedias, diccionarios, informes, monografías, manuales de instrucciones, conferencias.

Argumentativos: Defienden una idea/tesis y persuaden con razones/pruebas.

Ensayo: Analiza/interpreta un tema de forma personal.

Artículo de opinión: Punto de vista del autor sobre tema actual.

Crítica: Analiza y valora una obra (literaria, cine, arte).

Otros: Discurso político, debate, carta al director, anuncios publicitarios, tesis doctoral.

Instructivos (Directivos): Guían/ordenan acciones o tareas específicas.

Ejemplos: Recetas, manuales de uso, reglamentos, guías de montaje, protocolos.

Dialogados (Conversacionales): Representan un intercambio de información entre interlocutores.

Ejemplos: Entrevistas, guiones (teatro, cine, TV), conversaciones transcritas, cómics.

Científicos/Técnicos: De un área del saber, con lenguaje técnico para expertos.

Ejemplos: Artículos de investigación (papers), informes de laboratorio, leyes/teoremas, documentación de software.

Jurídicos/Administrativos: Propios del derecho y la administración; lenguaje formal/técnico.

Ejemplos: Leyes, decretos, sentencias, contratos, certificados, actas, solicitudes oficiales.

Publicitarios: Su objetivo es convencer para comprar, contratar o adoptar una idea.

Ejemplos: Anuncios, folletos, carteles, vallas, eslóganes.

Digitales: Producidos y leídos en soportes digitales; combinan texto, imagen y vídeo.

Ejemplos: Páginas web, blogs, emails, posts en redes sociales, chats, newsletters.


1.  Genera un título creativo y general para este tipo de texto.
2.  Basado en la idea del usuario y OBLIGATORIAMENTE en el contexto de los "Datos Fundamentales" proporcionados arriba (si los hay), escribe un planteamiento general extenso y detallado. Tu misión es tejer TODOS los datos fundamentales para que esten incluidos en el planteamiento general sin excepciones. Si la idea inicial ya los menciona, expándelos. Si no, introdúcelos tú.

**Formato de Respuesta:**
Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura. No incluyas ningún texto explicativo antes o después del JSON.
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

        if (window.cantidaddeescenas <= 0) throw new Error("La cantidad de escenas debe ser mayor a cero.");
        
        const promptPaso2 = `Título de la Historia: ${tituloHistoriaGlobal}
Planteamiento General de la Historia:
${planteamientoGeneralGlobal}

Tarea:
Divide el "Planteamiento General de la Historia" en exactamente ${window.cantidaddeescenas} resúmenes de secciónes. Cada resumen debe describir brevemente qué sucede en esa sección, manteniendo la coherencia con el planteamiento general.

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "resumen_por_escenas": [
    { "resumen_escena": "Resumen de la Sección 1." } 
  ]
}
Asegúrate de que haya exactamente ${window.cantidaddeescenas} objetos en el array "resumen_por_escenas".`;

        if(typeof progressBarManager !== 'undefined') progressBarManager.set(25, 'Dividiendo el texto en secciones...');
        
        const respuestaPaso2 = await llamarIAConFeedback(promptPaso2, `Paso 2: Dividir en ${window.cantidaddeescenas} Resúmenes de Escena`);
        if (!respuestaPaso2.resumen_por_escenas || !Array.isArray(respuestaPaso2.resumen_por_escenas) || respuestaPaso2.resumen_por_escenas.length === 0) {
            throw new Error("La IA no devolvió los resúmenes de escenas en el formato esperado.");
        }
        resumenPorEscenasGlobal = respuestaPaso2.resumen_por_escenas;

        if (window.cantidadframes <= 0) throw new Error("La cantidad de extensioones por sección debe ser mayor a cero.");
        let contextoEscenaAnteriorSerializado = "";

        for (let i = 0; i < resumenPorEscenasGlobal.length; i++) {
            if (i > 0) await sleep(500);
            
            const progress = 30 + (60 * (i / resumenPorEscenasGlobal.length));
            if(typeof progressBarManager !== 'undefined') progressBarManager.set(progress, `Desarrollando secciones ${i + 1} de ${resumenPorEscenasGlobal.length}...`);

            const resumenEscenaActualTexto = resumenPorEscenasGlobal[i].resumen_escena;
            const promptPaso3 = `Título Global de la Historia: ${tituloHistoriaGlobal}
Planteamiento General Completo: ${planteamientoGeneralGlobal}
Resumen Específico para la Sección Actual (Escena ${i + 1}): ${resumenEscenaActualTexto}
${contextoEscenaAnteriorSerializado ? `Contenido de la Sección Anterior (Escena ${i}):\n${contextoEscenaAnteriorSerializado}` : ""}

Tarea:
1.  Desarrolla en gran detalle la Sección ${i + 1}.
2.  Divide este desarrollo en exactamente ${window.cantidadframes} subsecciones.
3.  Genera un título descriptivo para esta Sección ${i + 1}.

Responde ÚNICAMENTE con un objeto JSON con la estructura:
{
  "titulo_escena_desarrollada": "Título descriptivo para la Sección ${i + 1}",
  "frames_desarrollados": [
    { "contenido_frame": "Texto detallado de la primera subsección." }
  ]
}`;
            
            // =======================================================================
            //  INICIO DE LA MODIFICACIÓN: BUCLE DE REINTENTO AUTOMÁTICO
            // =======================================================================
            let respuestaPaso3Escena;
            let exitoEscena = false;
            let reintentosEscena = 0;
            const maxReintentosEscena = 4; // Total de 3 intentos (1 original + 2 reintentos)

            while (!exitoEscena && reintentosEscena <= maxReintentosEscena) {
                try {
                    if (reintentosEscena > 0) {
                        if (chatDiv) {
                            chatDiv.innerHTML += `<p><strong>Aviso:</strong> Fallo al procesar la sección ${i + 1}. Reintentando automáticamente (Intento ${reintentosEscena} de ${maxReintentosEscena})...</p>`;
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        }
                        await sleep(1500); // Esperar un poco antes de reintentar
                    }

                    respuestaPaso3Escena = await llamarIAConFeedback(promptPaso3, `Paso 3: Desarrollando sección ${i + 1}/${resumenPorEscenasGlobal.length}`);
                    
                    if (!respuestaPaso3Escena.titulo_escena_desarrollada || !respuestaPaso3Escena.frames_desarrollados || !Array.isArray(respuestaPaso3Escena.frames_desarrollados) || respuestaPaso3Escena.frames_desarrollados.length === 0) {
                        throw new Error(`La respuesta de la IA para la sección ${i+1} no tiene el formato JSON esperado.`);
                    }

                    exitoEscena = true; // Si todo va bien, marcamos como éxito y salimos del bucle

                } catch (error) {
                    reintentosEscena++;
                    console.error(`Error en el intento ${reintentosEscena} para la sección ${i + 1}:`, error);
                    if (reintentosEscena > maxReintentosEscena) {
                        // Si se superan los reintentos, lanzamos el error para que sea capturado por el catch principal
                        throw new Error(`No se pudo generar la sección ${i + 1} después de ${maxReintentosEscena + 1} intentos. Último error: ${error.message}`);
                    }
                }
            }
            // =======================================================================
            //  FIN DE LA MODIFICACIÓN
            // =======================================================================

            const escenaProcesada = {
                titulo_escena: respuestaPaso3Escena.titulo_escena_desarrollada,
                frames: respuestaPaso3Escena.frames_desarrollados.map(f => ({ contenido: f.contenido_frame || "" })),
                generadoPorIA: true
            };
            ultimaHistoriaGeneradaJson.historia.push(escenaProcesada);
            contextoEscenaAnteriorSerializado = JSON.stringify(respuestaPaso3Escena, null, 2); 
        } 

        if(typeof progressBarManager !== 'undefined') progressBarManager.set(95, 'Guardando en la sección de Guion...');
        
        if (typeof agregarCapituloYMostrar === 'function') {
            agregarCapituloYMostrar(); 
            if (indiceCapituloActivo >= 0 && guionLiterarioData[indiceCapituloActivo]) {
                guionLiterarioData[indiceCapituloActivo].titulo = tituloHistoriaGlobal || "Guion de Historia IA";
                guionLiterarioData[indiceCapituloActivo].generadoPorIA = true;
                
                let contenidoGuion = `<h1>${tituloHistoriaGlobal}</h1>
                <div class="guion-ia-general">
                    <h2>Planteamiento General</h2>
                    <p>${planteamientoGeneralGlobal.replace(/\n/g, "<br>")}</p>
                </div>`;

                if (resumenPorEscenasGlobal && resumenPorEscenasGlobal.length > 0) {
                    contenidoGuion += `<div class="guion-ia-general">
                        <h2>Planteamiento por Escenas</h2>
                        <ul>`;
                    resumenPorEscenasGlobal.forEach((res, idx) => {
                        contenidoGuion += `<li><strong>Escena ${idx + 1}:</strong> ${res.resumen_escena || ""}</li>`;
                    });
                    contenidoGuion += `</ul></div>`;
                }

                ultimaHistoriaGeneradaJson.historia.forEach((escena, idx) => {
                    contenidoGuion += `<div class="guion-ia-escena">
                    <h3>${escena.titulo_escena || `Escena ${idx + 1}`}</h3>`;
                    escena.frames.forEach((frame, frameIdx) => {
                        contenidoGuion += `<div class="guion-ia-frame">
                        <h4>Frame ${frameIdx + 1}</h4>
                        <p>${(frame.contenido || "").replace(/\n/g, "<br>")}</p>
                    </div>`;
                    });
                    contenidoGuion += `</div>`;
                });

                guionLiterarioData[indiceCapituloActivo].contenido = contenidoGuion;
                mostrarCapituloSeleccionado(indiceCapituloActivo); 
            }
        }
        
        if(typeof progressBarManager !== 'undefined') progressBarManager.finish("¡Proceso completado!");
        await sleep(500);

        alert("¡Proceso completado! El texto ha sido generado y guardada. Serás redirigido a la sección 'Guion' para ver el resultado.");
        
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
    // Gather data from the new modal's inputs
    const idea = document.getElementById('gemini1-modal').value;
    const escenas = document.getElementById('cantidadescenas-modal').value;
    const frames = document.getElementById('cantidadeframes-modal').value;
    const usarDatos = document.getElementById('incluir-datos-ia-modal').checked;

    // Populate the old, now hidden, inputs for the main function to use
    document.getElementById('gemini1').value = idea;
    document.getElementById('cantidadescenas').value = escenas;
    document.getElementById('cantidadeframes').value = frames;
    document.getElementById('incluir-datos-ia').checked = usarDatos;

    // Close the modal and start the generation process
    cerrarModalIAHerramientas();
    enviarTextoConInstrucciones();
}