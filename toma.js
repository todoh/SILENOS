/**
 * @file toma.js
 * @description Orquesta la generación de una toma de escena, utilizando una IA para analizar
 * y planificar la reutilización de datos existentes de forma semántica.
 * @version 7.2 - Corrección de caracteres de escape para compatibilidad con editores.
 */

// Aseguramos que los objetos globales existan.
window.datos = window.datos || {};
window.personajes = window.personajes || [];

// =================================================================================
// FUNCIÓN DE ENTRADA - Se llama desde la UI
// =================================================================================

async function iniciarGeneracionDeToma(toma, tomaContainerElement) {
    const promptUsuario = toma.guionTecnico;
    if (!promptUsuario || !promptUsuario.trim()) {
        mostrarModalError('El Guion Técnico (Prompt) de la toma está vacío.');
        return;
    }

    const imagenArea = tomaContainerElement.querySelector('.toma-imagen-area');
    const statusDiv = mostrarEstado(imagenArea, 'Iniciando proceso...');
    const statusUpdater = (mensaje, esError = false) => actualizarEstado(statusDiv, mensaje, esError);

    try {
        const imagenFinalUrl = await generarYComponerToma(promptUsuario, statusUpdater);
        
        toma.imagen = imagenFinalUrl;
        
        if (typeof renderEscenasUI === 'function') {
            renderEscenasUI(); 
        } else {
            console.warn("renderEscenasUI no está definida. La UI no se actualizará automáticamente.");
            const imgElement = imagenArea.querySelector('img');
            if(imgElement) imgElement.src = imagenFinalUrl;
        }

        if (statusDiv && statusDiv.parentElement) {
            setTimeout(() => statusDiv.remove(), 1000);
        }

    } catch (error) {
        console.error("Error en el proceso de generación de la toma:", error);
        statusUpdater(`Error: ${error.message}`, true);
        setTimeout(() => { if (statusDiv && statusDiv.parentElement) statusDiv.remove(); }, 8000);
    }
}


// =================================================================================
// LÓGICA CENTRAL DE GENERACIÓN
// =================================================================================

async function generarYComponerToma(promptUsuario, statusUpdater) {
    try {
        statusUpdater('Analizando datos existentes...');
        const datosDisponibles = obtenerDatosCompletosDelDOM();
        
        const plan = await crearPlanDeEscenaMultiPaso(promptUsuario, datosDisponibles, statusUpdater);

        if (!plan) {
            throw new Error("No se pudo determinar un plan válido para la escena.");
        }

        const elementosGenerados = await generarElementosNecesarios(plan.elementos_a_generar || [], statusUpdater);

        statusUpdater('Recopilando recursos para la composición...');
        const recursosCompletos = await recopilarRecursos(plan, elementosGenerados, datosDisponibles, statusUpdater);

        statusUpdater('Componiendo la imagen final...');
        const imagenFinalUrl = await componerEscenaFinal(plan.composicion_final, recursosCompletos, statusUpdater);

        statusUpdater('¡Toma generada con éxito!', false);
        return imagenFinalUrl;

    } catch (error) {
        console.error('Error grave en generarYComponerToma:', error);
        statusUpdater(`Error: ${error.message}`, true);
        throw error;
    }
}

// =================================================================================
// SISTEMA DE PLANIFICACIÓN MULTI-PASO
// =================================================================================

async function crearPlanDeEscenaMultiPaso(prompt, datosDisponibles, statusUpdater) {
    statusUpdater('Paso 1/4: Identificando componentes...');
    const componentes = await identificarComponentes(prompt);
    if (!componentes || componentes.length === 0) {
        throw new Error("La IA no pudo identificar componentes en el prompt.");
    }

    statusUpdater('Paso 2/4: Mapeando componentes a datos...');
    const planParcial = {
        elementos_a_usar: new Set(),
        elementos_a_generar_temp: []
    };

    const nombresDeDatos = datosDisponibles.map(d => d.nombre);
    for (const componente of componentes) {
        const decision = await mapearComponenteAAsset(componente, nombresDeDatos);
        if (decision === "__GENERATE__" || !nombresDeDatos.includes(decision)) {
            planParcial.elementos_a_generar_temp.push(componente);
        } else {
            planParcial.elementos_a_usar.add(decision);
        }
    }

    statusUpdater('Paso 3/4: Detallando nuevos elementos...');
    const elementos_a_generar = [];
    for (const componenteAGenerar of planParcial.elementos_a_generar_temp) {
        const detallesNuevoElemento = await obtenerDetallesParaNuevoAsset(componenteAGenerar);
        elementos_a_generar.push(detallesNuevoElemento);
    }
    
    statusUpdater('Paso 4/4: Diseñando la composición...');
    const nombresDisponibles = [
        ...Array.from(planParcial.elementos_a_usar),
        ...elementos_a_generar.map(e => e.nombre)
    ];
    const composicion_final = await crearComposicionFinal(prompt, nombresDisponibles);

    return {
        elementos_a_usar: Array.from(planParcial.elementos_a_usar),
        elementos_a_generar,
        composicion_final
    };
}

// =================================================================================
// FUNCIONES DE GENERACIÓN Y COMPOSICIÓN
// =================================================================================

async function generarElementosNecesarios(elementosAGenerar, statusUpdater) {
    const elementosCreados = [];
    if (!elementosAGenerar || elementosAGenerar.length === 0) {
        statusUpdater('No se necesitan generar nuevos elementos.');
        return elementosCreados;
    }
    if (typeof generarImagenDesdePrompt !== 'function') throw new Error("La función 'generarImagenDesdePrompt' no está disponible.");

    for (let i = 0; i < elementosAGenerar.length; i++) {
        const elemento = elementosAGenerar[i];
        if (!elemento || !elemento.nombre || !elemento.prompt_generacion) {
            console.warn("Se omitió la generación de un elemento malformado:", elemento);
            continue;
        }
        statusUpdater(`Generando ${i + 1}/${elementosAGenerar.length}: "${elemento.nombre}"...`);
        try {
            // Esta función devuelve un objeto: { imagen: 'data:url...', svgContent: '...' }
            const resultadoGeneracion = await generarImagenDesdePrompt(elemento.prompt_generacion);

            // ▼▼▼ LA CORRECCIÓN ESTÁ AQUÍ ▼▼▼
            // Nos aseguramos de acceder a la propiedad .imagen del objeto devuelto.
            const imageUrl = resultadoGeneracion.imagen; 
            
            const nuevoDato = {
                nombre: elemento.nombre,
                descripcion: elemento.descripcion || `Generado para la toma actual.`,
                imagen: imageUrl, // Usamos la URL extraída, no el objeto completo.
                etiqueta: elemento.etiqueta || 'visual',
                arco: elemento.arco || 'sin_arco'
            };
            // ▲▲▲ FIN DE LA CORRECCIÓN ▲▲▲
            
            if (typeof agregarPersonajeDesdeDatos === 'function') {
                // Aquí también pasamos el contenido SVG si existe, para guardarlo en el "Dato".
                agregarPersonajeDesdeDatos({ ...nuevoDato, svgContent: resultadoGeneracion.svgContent });
                if (typeof reinicializarFiltrosYActualizarVista === 'function') {
                    reinicializarFiltrosYActualizarVista();
                }
            }
            elementosCreados.push(nuevoDato);
        } catch(error) {
            console.error(`No se pudo generar el elemento "${elemento.nombre}":`, error);
            statusUpdater(`Error al generar "${elemento.nombre}". Continuando...`, true);
        }
    }
    return elementosCreados;
}

async function recopilarRecursos(plan, elementosGenerados, datosDelDOM, statusUpdater) {
    const recursosCompletos = [...elementosGenerados];

    if (plan.elementos_a_usar && plan.elementos_a_usar.length > 0) {
        for (const nombreElemento of plan.elementos_a_usar) {
            const datoExistente = datosDelDOM.find(p => p.nombre.toLowerCase() === nombreElemento.toLowerCase());
            
            if (datoExistente) {
                statusUpdater(`Reutilizando: "${datoExistente.nombre}"`);
                if (datoExistente.imagen) {
                    recursosCompletos.push({ ...datoExistente });
                } else {
                    statusUpdater(`Advertencia: El dato "${nombreElemento}" no tiene imagen.`, true);
                }
            } else {
                statusUpdater(`Advertencia: Se intentó usar "${nombreElemento}" pero no se encontró.`, true);
            }
        }
    }
    return recursosCompletos;
}


async function componerEscenaFinal(composicion, todosLosRecursos, statusUpdater) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 576;

    const datoFondo = todosLosRecursos.find(d => d.nombre.toLowerCase() === (composicion.fondo || '').toLowerCase());
    if (datoFondo && datoFondo.imagen) {
        await dibujarImagenEnCanvas(ctx, datoFondo.imagen, 0, 0, canvas.width, canvas.height);
    } else {
        statusUpdater(`Advertencia: Fondo "${composicion.fondo}" no encontrado. Usando fondo negro.`, true);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const elementosOrdenados = (composicion.elementos || []).sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    for (const elemento of elementosOrdenados) {
        const datoElemento = todosLosRecursos.find(d => d.nombre.toLowerCase() === (elemento.nombre || '').toLowerCase());
        if (datoElemento && datoElemento.imagen) {
            try {
                const img = await cargarImagen(datoElemento.imagen);
                const escala = elemento.escala || 1;
                const ratio = img.naturalWidth / img.naturalHeight;
                let h = (canvas.height * 0.6) * escala;
                let w = h * ratio;

                if (w > canvas.width * 0.95) {
                    w = canvas.width * 0.95;
                    h = w / ratio;
                }

                const x = (elemento.posicion[0] / 100) * canvas.width - (w / 2);
                const y = (elemento.posicion[1] / 100) * canvas.height - (h / 2);
                
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                ctx.drawImage(img, x, y, w, h);
                ctx.restore();

            } catch (error) {
                console.error(`No se pudo dibujar el elemento "${elemento.nombre}":`, error);
            }
        } else {
            statusUpdater(`Advertencia: Elemento de composición "${elemento.nombre}" no encontrado.`, true);
        }
    }

    return canvas.toDataURL('image/jpeg', 0.9);
}

// =================================================================================
// FUNCIONES DE UTILIDAD
// =================================================================================

function obtenerDatosCompletosDelDOM() {
    const datosExtraidos = [];
    const contenedorDatos = document.getElementById("listapersonajes");
    if (!contenedorDatos) {
        console.warn("No se encontró el contenedor de datos '#listapersonajes' en el DOM.");
        return datosExtraidos;
    }

    const elementosPersonaje = contenedorDatos.querySelectorAll('.personaje');
    
    elementosPersonaje.forEach(nodo => {
        const nombreInput = nodo.querySelector('input.nombreh');
        const descripcionTextarea = nodo.querySelector('textarea');
        const imagenElement = nodo.querySelector('.personaje-visual img');
        
        const nombre = nombreInput ? nombreInput.value.trim() : null;
        
        if (nombre) {
            datosExtraidos.push({
                nombre: nombre,
                descripcion: descripcionTextarea ? descripcionTextarea.value.trim() : '',
                imagen: imagenElement ? imagenElement.src : null
            });
        }
    });

    console.log(`Datos extraídos del DOM para la IA: ${datosExtraidos.length} elementos.`);
    return datosExtraidos;
}

// --- LLAMADAS A LA IA ---

async function identificarComponentes(prompt) {
    const promptIA = `Analiza la siguiente petición de escena y extráela en sus componentes lógicos principales (personajes, objetos, ubicaciones). Petición: "${prompt}". Responde ÚNICAMENTE con un array JSON de strings. Ejemplo: si la petición es "un faraón con una lanza en el valle de noche", la respuesta debe ser: ["un faraón", "una lanza", "el valle de noche"]`;
    return await llamarIA(promptIA, { response_mime_type: "application/json" });
}

async function mapearComponenteAAsset(componente, nombresDeDatos) {
    const promptIA = `Dado el componente de escena "${componente}" y la lista de assets disponibles: [${nombresDeDatos.map(n => `"${n}"`).join(', ')}], ¿cuál es la mejor coincidencia semántica? Responde con UNA SOLA PALABRA: el nombre EXACTO del asset de la lista, o la palabra clave "__GENERATE__" si no hay ninguna coincidencia buena.`;
    const resultado = await llamarIA(promptIA);
    return resultado.trim().replace(/"/g, '');
}

async function obtenerDetallesParaNuevoAsset(componente) {
    const promptIA = `Necesito crear un nuevo asset para una escena. El concepto es: "${componente}". Genera los detalles para este nuevo asset. Responde ÚNICAMENTE con un objeto JSON con las claves: "nombre" (corto y descriptivo), "descripcion", "etiqueta" (ej: "personaje", "objeto", "ubicacion"), y "prompt_generacion" (muy detallado para un generador de imágenes).`;
    return await llamarIA(promptIA, { response_mime_type: "application/json" });
}

async function crearComposicionFinal(promptOriginal, nombresDeRecursos) {
    const promptIA = `Tu tarea es crear un plan de composición de escena. Petición: "${promptOriginal}". Recursos Disponibles: [${nombresDeRecursos.map(n => `"${n}"`).join(', ')}]. Crea un objeto JSON que describa la composición. Identifica el "fondo". Coloca el resto en "elementos", especificando "nombre", "posicion" ([x, y] en %), "escala" (ej: 1.0) y "zIndex". Responde ÚNICAMENTE con el objeto JSON.`;
    return await llamarIA(promptIA, { response_mime_type: "application/json" });
}

/**
 * Función centralizada para llamar a la API de Gemini.
 * @version 2.1 - Sintaxis corregida.
 */
async function llamarIA(prompt, generationConfig = {}) {
    if (typeof apiKey === 'undefined' || !apiKey) {
        throw new Error("La API Key de Google no está configurada.");
    }
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, ...generationConfig },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`Error en la API (${response.status}): ${await response.text()}`);
        
        const result = await response.json();
        if (result.promptFeedback?.blockReason) throw new Error(`Bloqueado por la API: ${result.promptFeedback.blockReason}`);
        
        const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) throw new Error("La IA no devolvió una respuesta de texto válida.");
        
        if (generationConfig.response_mime_type === "application/json") {
            let cleanedText = textResponse.trim();
            if (cleanedText.startsWith("```json")) {
                cleanedText = cleanedText.substring(7, cleanedText.length - 3).trim();
            } else if (cleanedText.startsWith("```")) {
                 cleanedText = cleanedText.substring(3, cleanedText.length - 3).trim();
            }
            
            try {
                return JSON.parse(cleanedText);
            } catch (e) {
                console.error("Fallo al parsear JSON de la IA, texto recibido:", cleanedText);
                throw new Error("La IA devolvió un JSON con formato incorrecto.");
            }
        }
        return textResponse;

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('La llamada a la API ha tardado demasiado (timeout).');
        console.error("Error en llamada a la IA:", error);
        throw new Error(`Fallo en la comunicación con la IA: ${error.message}`);
    }
}


function mostrarEstado(container, mensaje) {
    let statusDiv = container.querySelector('.toma-loading-overlay');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.className = 'toma-loading-overlay';
        container.style.position = 'relative';
        container.appendChild(statusDiv);
    }
    statusDiv.innerHTML = `<div class="loading-spinner-toma"></div><p>${mensaje}</p>`;
    return statusDiv;
}

function actualizarEstado(statusDiv, mensaje, esError = false) {
    if (statusDiv && statusDiv.parentElement) {
        const p = statusDiv.querySelector('p');
        if (p) p.textContent = mensaje;
        const spinner = statusDiv.querySelector('.loading-spinner-toma');
        if (esError) {
            if (p) { p.style.color = '#ff4d4d'; p.style.fontWeight = 'bold'; }
            if (spinner) spinner.style.display = 'none';
        } else {
             if (p) { p.style.color = ''; p.style.fontWeight = ''; }
             if (spinner) spinner.style.display = 'block';
        }
    }
}

function cargarImagen(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`No se pudo cargar la imagen desde ${src.slice(0,100)}...`));
        img.src = src;
    });
}

async function dibujarImagenEnCanvas(ctx, src, x, y, w, h) {
    try {
        const img = await cargarImagen(src);
        ctx.drawImage(img, x, y, w, h);
    } catch (error) {
        console.error("Error al dibujar imagen en canvas:", error);
        ctx.fillStyle = 'red';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'white';
        ctx.fillText("Error", x + 10, y + 20);
    }
}

function mostrarModalError(mensaje) {
    console.error("MODAL_ERROR:", mensaje);
    alert(mensaje); // Reemplazar con un modal real y personalizado.
}