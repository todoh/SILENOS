// ============== Contenido para procedimiento.js (VERSIÓN AUTÓNOMA CON GENERACIÓN DE IMÁGENES Y GUION) ==============
let estiloArtistico = "";
document.addEventListener('DOMContentLoaded', () => {
     if (typeof window.libros === 'undefined') {
        console.warn("Variable global 'libros' no encontrada. Inicializando como array vacío.");
        window.libros = [];
    }
    if (typeof window.escenas === 'undefined') {
        console.warn("Variable global 'escenas' no encontrada. Inicializando como objeto vacío.");
        window.escenas = {};
    }
    // Referencias a los elementos de la interfaz
    const botonProcesar = document.getElementById('enviar-procedimiento');
    const areaPrompt = document.getElementById('prompt-procedimiento');
    const divResultado = document.getElementById('resultado-procedimiento');

    if (botonProcesar) {
        botonProcesar.addEventListener('click', iniciarProcesoAutonomo);
    }

    // =========================================================================
    // COPIA DE FUNCIONES Y VARIABLES NECESARIAS
    // Para que este script sea independiente.
    // =========================================================================

    // --- Variables y funciones para el guardado de guiones (NUEVO) ---
    let guionesGuardados = {};
    
    // Carga los guiones guardados al iniciar la página
    function cargarGuiones() {
        const guiones = localStorage.getItem('silenos_guionesGuardados');
        if (guiones) {
            guionesGuardados = JSON.parse(guiones);
            console.log("Guiones cargados desde localStorage.");
        }
    }

    function guardarGuiones() {
        localStorage.setItem('silenos_guionesGuardados', JSON.stringify(guionesGuardados));
        console.log("Guiones guardados en localStorage.");
    }
    
    // Llamamos a cargarGuiones una vez al inicio.
    cargarGuiones();
    
    // --- Fin de funciones de guardado de guiones ---

    function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

    function findClosingBracket(str, pos) {
        const openChar = str[pos], closeChar = openChar === '{' ? '}' : ']';
        let depth = 1;
        for (let i = pos + 1; i < str.length; i++) {
            if (str[i] === openChar) depth++;
            else if (str[i] === closeChar) depth--;
            if (depth === 0) return i;
        }
        return -1;
    }

    function limpiarYExtraerJson(textoCrudo, etapa) {
        const i = textoCrudo.search(/[[{]/);
        if (i === -1) throw new Error(`Respuesta inválida para ${etapa}: no es JSON.`);
        const j = findClosingBracket(textoCrudo, i);
        if (j === -1) throw new Error(`Respuesta para ${etapa} es un JSON incompleto.`);
        const json = textoCrudo.substring(i, j + 1);
        try { JSON.parse(json); return json; } catch (e) { throw new Error(`Error de sintaxis en JSON para ${etapa}.`); }
    }

    // La función peticionGemini ha sido eliminada de este archivo para evitar conflictos.
    // Se asume que una función global llamada 'callGenerativeApi' existe en otro script (ej: gemini.js o geminialfa.js)

    async function pipelineExtraccionDeCategoria(texto, chatDiv, cat, arco) {
        
        let datosCreados = [];
        try {
            chatDiv.innerHTML += `<p><strong>Silenos:</strong> Identificando: <strong>${cat.n}</strong>...</p>`;
            const promptIdentificacion = `**Tarea:** Del texto, extrae una lista de "${cat.d}". Identifica y selecciona los 8 más relevantes o importantes.\n**Texto:**"""${texto}"""\n**Formato:** Array de strings JSON.`;
            // Se cambia la llamada a la función global
            const listaNombres = await callGenerativeApi(promptIdentificacion, "gemini-2.5-flash-lite", true);

            if (!Array.isArray(listaNombres) || listaNombres.length === 0) return cat.eA === "personaje" ? [] : 0;
            
            chatDiv.innerHTML += `<p>-> Encontrados ${listaNombres.length} (se procesarán los 8 más relevantes). Elaborando detalles...</p>`;
            const nombresAProcesar = listaNombres.slice(0, 8);

            const promptElaboracion = `**Tarea:** Del texto, genera datos detallados para el siguiente lote de nombres.\n**Texto:**"""${texto}"""\n**Lote:**${JSON.stringify(nombresAProcesar)}\n**Instrucciones:** Para CADA nombre, crea un JSON con "nombre", "descripcion", "promptVisual", y "etiqueta" de [${cat.eS}].\n**Formato:** Array de objetos JSON.`;
            // Se cambia la llamada a la función global
            const datosChunk = await callGenerativeApi(promptElaboracion, "gemini-2.5-flash-lite", true);
            
            if (!Array.isArray(datosChunk)) throw new Error("La IA de elaboración no devolvió un array.");

            for (const dato of datosChunk) {
                if (!dato.nombre || !dato.descripcion) continue;
                const existeDato = document.querySelector(`#listapersonajes .personaje .nombreh[value="${dato.nombre}"]`);
                if (existeDato) {
                    console.warn(`[DUPLICADO DETECTADO] El dato con nombre "${dato.nombre}" ya existe. Se saltará.`);
                    continue;
                }
                agregarPersonajeDesdeDatos({ ...dato, arco });
                datosCreados.push(dato);
            }
        } catch (error) {
            console.error(`Error en categoría "${cat.n}":`, error);
            chatDiv.innerHTML += `<p style="color:orange;">Advertencia: Falló el procesamiento para "${cat.n}".</p>`;
        }
        return cat.eA === "personaje" ? datosCreados : datosCreados.length;
    }
    
    // =========================================================================
    // NUEVAS FUNCIONES PARA LA GENERACIÓN DE GUION (Añadido)
    // =========================================================================

 function recolectarYAgruparDatos() {
        const datosAgrupados = {};
        const contenedorDatos = document.getElementById("listapersonajes");
        
        if (!contenedorDatos) {
            console.warn("recolectarYAgruparDatos no encontró el contenedor #listapersonajes.");
            return {};
        }

        for (const nodoDato of contenedorDatos.children) {
            const nombre = nodoDato.querySelector("input.nombreh")?.value.trim() || "";
            if (!nombre) continue;

            const descripcion = nodoDato.querySelector("textarea")?.value.trim() || "";

            const etiquetaEl = nodoDato.querySelector(".change-tag-btn"); 
            const etiqueta = etiquetaEl ? etiquetaEl.dataset.etiqueta : 'indeterminado';
            
            const nombreCategoria = etiqueta.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (!datosAgrupados[nombreCategoria]) {
                datosAgrupados[nombreCategoria] = [];
            }

            datosAgrupados[nombreCategoria].push({
                nombre: nombre,
                descripcion: descripcion,
            });
        }
        
        if (Object.keys(datosAgrupados).length === 0) {
            console.warn("recolectarYAgruparDatos no encontró datos válidos en #listapersonajes.");
        } else {
            console.log("Datos recolectados para el guion:", datosAgrupados);
        }
        
        return datosAgrupados;
    }

async function generarGuionDesdeDatos() {
        const divResultado = document.getElementById('resultado-procedimiento');
        divResultado.innerHTML += `<hr><hr><h3>Iniciando Generación de Guion Automático</h3>`;
        
        const datosAgrupados = recolectarYAgruparDatos();
        if (Object.keys(datosAgrupados).length === 0) {
            divResultado.innerHTML += `<p style="color:orange;">No se encontraron datos para generar un guion. Proceso omitido.</p>`;
            return;
        }
        
        divResultado.innerHTML += `<p><strong>Silenos:</strong> Usando ${Object.keys(datosAgrupados).length} categorías de datos para crear un guion...</p>`;

        try {
            let contenidoHTMLFinal = "";

            divResultado.innerHTML += `<p>-> Paso 1: Generando título y planteamiento...</p>`;
            const contextoDatos = `**Instrucción Maestra:** Basa la historia en estos datos: ${JSON.stringify(datosAgrupados, null, 2)}\n\n`;
            const promptPaso1 = `${contextoDatos}**Tarea:** Genera un título y un resumen general (planteamiento) para una historia que una todos estos datos.\n**Formato JSON OBLIGATORIO:** {"titulo_historia": "string", "planteamiento_general": "string"}`;
            const respuestaPaso1 = await callGenerativeApi(promptPaso1, 'gemini-2.0-flash-lite', true);
            
            const tituloHistoria = respuestaPaso1.titulo_historia || "Historia Sin Título";
            const planteamientoGeneral = respuestaPaso1.planteamiento_general || "Sin planteamiento.";





            contenidoHTMLFinal += `<h1 dir="auto">${tituloHistoria}</h1><div class="guion-ia-general"><h2>Planteamiento General</h2><p dir="auto">${planteamientoGeneral.replace(/\n/g, "<br>")}</p></div>`;
            
            divResultado.innerHTML += `<div style="border: 1px solid #555; padding: 10px; margin-top: 10px; border-radius: 5px;"><h4>${tituloHistoria}</h4><p>${planteamientoGeneral.replace(/\n/g, "<br>")}</p></div>`;

            divResultado.innerHTML += `<p>-> Paso 2: Dividiendo la historia en 6 capítulos...</p>`;
            const promptPaso2 = `Título: ${tituloHistoria}\nPlanteamiento: ${planteamientoGeneral}\n**Tarea:** Divide la historia en **6 resúmen de capítulo**.\n**Formato JSON OBLIGATORIO:** {"resumenes_capitulos": [{"resumen": "string"}]}`;
            const respuestaPaso2 = await callGenerativeApi(promptPaso2, 'gemini-2.0-flash-lite', true);
            const resumenesCapitulos = (respuestaPaso2.resumenes_capitulos || []).slice(0, 6);

            contenidoHTMLFinal += `<div class="guion-ia-general"><h2>Planteamiento por Capítulos</h2><ul>`;
            resumenesCapitulos.forEach((r, i) => {
                contenidoHTMLFinal += `<li dir="auto"><strong>Capítulo ${i+1}:</strong> ${r.resumen}</li>`;
            });
            contenidoHTMLFinal += `</ul></div>`;

            divResultado.innerHTML += `<h5>Resumen de Capítulos:</h5><ul>${resumenesCapitulos.map((r, i) => `<li><strong>Cap. ${i+1}:</strong> ${r.resumen}</li>`).join('')}</ul>`;

            for (let i = 0; i < resumenesCapitulos.length; i++) {
                divResultado.innerHTML += `<p>-> Paso 3: Desarrollando capítulo ${i + 1}/2...</p>`;
                const resumenCap = resumenesCapitulos[i].resumen;
                
                const promptPaso3 = `Título General: ${tituloHistoria}\nResumen Específico del Capítulo ${i + 1}: ${resumenCap}\n**Tarea:** Desarrolla este capítulo. Dale un título y divídelo en exactamente **1 frame** narrativo.\n**Formato JSON OBLIGATORIO:** {"titulo_capitulo": "string", "frames_desarrollados": [{"contenido_frame": "string"}]}`;
                const respuestaPaso3 = await callGenerativeApi(promptPaso3, 'gemini-2.5-flash-lite', true);

                const escenaProcesada = {
                    titulo_escena: respuestaPaso3.titulo_capitulo || `Capítulo ${i + 1}`,
                    frames: (respuestaPaso3.frames_desarrollados || []).map(f => ({ contenido: f.contenido_frame || "" }))
                };
                
                let capituloHTML = `<div class="guion-ia-escena"><h3 dir="auto">${escenaProcesada.titulo_escena}</h3>`;
                escenaProcesada.frames.forEach((frame, frameIdx) => {
                    capituloHTML += `<div class="guion-ia-frame"><h4>Frame ${frameIdx + 1}</h4><p dir="auto">${(frame.contenido || "").replace(/\n/g, "<br>")}</p></div>`;
                });
                capituloHTML += `</div>`;
                contenidoHTMLFinal += capituloHTML;

                divResultado.innerHTML += capituloHTML;
            }
            
            if (typeof guionLiterarioData === 'undefined' || typeof renderizarGuion !== 'function' || typeof mostrarCapituloSeleccionado !== 'function') {
                throw new Error("El sistema de guiones principal no está disponible.");
            }

            const nuevoGuion = {
                titulo: tituloHistoria,
                contenido: contenidoHTMLFinal,
                generadoPorIA: true,
                enProgreso: false
            };

            guionLiterarioData.push(nuevoGuion);
            guionLiterarioData.sort((a, b) => a.titulo.localeCompare(b.titulo));
            const nuevoIndice = guionLiterarioData.findIndex(g => g === nuevoGuion);
            
            indiceCapituloActivo = nuevoIndice;

            renderizarGuion();
            mostrarCapituloSeleccionado(nuevoIndice);

            divResultado.innerHTML += `<hr><p style="color:lime;"><strong>✓ ¡Éxito!</strong> El guion se ha generado y añadido a la sección 'Guion'.</p>`;
            return nuevoGuion;

        } catch (error) {
            console.error("Error generando el guion:", error);
            divResultado.innerHTML += `<p style="color:red;">❌ Error durante la generación del guion: ${error.message}</p>`;
        }
    }

    // =========================================================================
    // FUNCIÓN PRINCIPAL DEL MÓDULO (ORQUESTADOR)
    // =========================================================================

async function iniciarProcesoAutonomo() {
    const textoUsuario = areaPrompt.value.trim();
    if (!textoUsuario) return alert("Por favor, introduce un texto o una idea.");

    divResultado.innerHTML = `<p><strong>Silenos:</strong> Analizando tus ideas...</p>`;
    botonProcesar.disabled = true;
    botonProcesar.textContent = '...';

    // ==> BARRA DE PROGRESO: Variable para controlar el éxito del proceso
    let procesoExitoso = false;
    // ==> BARRA DE PROGRESO: Inicia la barra al comenzar todo
    progressBarManager.start('Analizando tus ideas iniciales...');

    try {
        if (typeof agregarPersonajeDesdeDatos !== 'function' || typeof actualizarImagenDeDato !== 'function') {
            throw new Error("Funciones de datos.js no disponibles.");
        }
        this.closest('.procedimiento-container').style.display = 'none';
        divResultado.innerHTML += `<p><strong>Silenos:</strong> Convirtiendo tus ideas en una historia coherente...</p>`;
        const promptHistoria = `**Tarea:** Convierte el siguiente conjunto de ideas, datos y conceptos en una historia coherente y bien estructurada.\n**Conceptos/Datos de Entrada:** """${textoUsuario}"""\n**Instrucciones Cruciales:**\n1. La historia debe tener un inicio claro (presentación), un nudo (conflicto/desarrollo) y un desenlace (resolución).\n2. **DEBES** integrar **TODOS** los datos y detalles proporcionados en la entrada sin omitir ninguno.\n3. El resultado debe ser únicamente el texto de la historia, sin metatexto.\n**Formato de Salida:** Texto plano.`;
        const historiaGenerada = await callGenerativeApi(promptHistoria, "gemini-2.5-flash", false);

        if (!historiaGenerada || historiaGenerada.trim() === '') {
            throw new Error("La IA no pudo generar una historia a partir de las ideas proporcionadas.");
        }
        // ==> BARRA DE PROGRESO: Hito 1 (10%)
        progressBarManager.set(10, 'Historia base creada. Extrayendo datos...');
        divResultado.innerHTML += `<p style="color:lime;">✓ Historia creada con éxito.</p><hr><h4>Historia Generada:</h4><pre style="white-space: pre-wrap;   padding: 10px; border-radius: 5px; border: 1px solid #444;">${historiaGenerada}</pre><hr>`;

        let totalCreados = 0;
        const arcoPorDefecto = 'guion';
        const categorias = [
            { n: "Personajes", d: "Personajes, criaturas...", eA: "personaje", eS: "personaje, animal, ser_vivo, mitologia" },
            { n: "Lugares/Ubicaciones", d: "Ciudades, edificios, Lugares, Ubicaciones...", eA: "ubicacion", eS: "ubicacion, edificio, elemento_geografico" },
            { n: "Objetos/Artefactos", d: "Ítems, herramientas...", eA: "objeto", eS: "objeto, atuendo, comida, transporte, muebles, arte" },
            { n: "Sucesos/Eventos", d: "Acontecimientos clave...", eA: "evento", eS: "evento" },
            { n: "Conceptos/Lore", d: "Ideas abstractas, reglas...", eA: "concepto", eS: "concepto, nota, visual" }
        ];

        const personajesCreados = await pipelineExtraccionDeCategoria(historiaGenerada, divResultado, categorias[0], arcoPorDefecto);
        

        // DIFINIR EL ESTILO ARTÍSTICO GENERAL PARA EL LIBRO.
    
        const textoUsuarioInicial = document.getElementById('prompt-procedimiento')?.value.trim();
        const promptEstilo = `Analiza el siguiente texto y define un estilo artístico visual coherente para ilustrar una historia basada en él. 
        Sé conciso y específico. Describe el estilo en una sola frase, como si fuera un prompt para un generador de imágenes 
        (ej: "Fotorrealismo, Cine Noir blanco y negro, Óleo digital, claroscuro dramático", "Acuarela de fantasía con colores pastel", "Arte lineal ciberpunk con luces de neón").\n\nTexto de inspiración:\n"""${textoUsuarioInicial}"""`;
       estiloArtistico = await callGenerativeApi(promptEstilo, 'gemini-2.5-flash', false);
         console.log("imagen");
   
      





        // ==> BARRA DE PROGRESO: Hito 2 (25%)
        progressBarManager.set(25, 'Personajes extraídos. Procesando otras categorías...');



        const otrasCategorias = categorias.slice(1).map(cat => pipelineExtraccionDeCategoria(historiaGenerada, divResultado, cat, arcoPorDefecto));
        const resultadosParalelos = await Promise.all(otrasCategorias);

        totalCreados += personajesCreados.length;
        for (const count of resultadosParalelos) {
            if (typeof count === 'number') {
                totalCreados += count;
            }
        }
        
        // ==> BARRA DE PROGRESO: Hito 3 (40%)
        progressBarManager.set(40, 'Análisis de datos completo. Generando guion...');

        if (totalCreados > 0) {
            divResultado.innerHTML += `<hr><p style="color:lime;"><strong>Éxito:</strong> Se crearon ${totalCreados} datos nuevos a partir de la historia.</p>`;
            if (typeof reinicializarFiltrosYActualizarVista === 'function') reinicializarFiltrosYActualizarVista();
        } else {
            divResultado.innerHTML += `<hr><p style="color:orange;"><strong>Info:</strong> El proceso finalizó sin generar datos extraíbles de la historia.</p>`;
        }

        const guionGenerado = await generarGuionDesdeDatos();
        
        // ==> BARRA DE PROGRESO: Hito 4 (55%)
        progressBarManager.set(55, 'Guion generado. Creando estructura del libro...');

        if (guionGenerado) {
            await sleep(2000);
            await generarLibroDesdeGuion(guionGenerado);
        } else {
            divResultado.innerHTML += `<p style="color:orange;">La generación del guion no produjo un resultado válido. El proceso de creación de libro se ha cancelado.</p>`;
        }
        
        // ==> BARRA DE PROGRESO: Hito 5 (95%) - Casi al final
        progressBarManager.set(95, 'Libro creado y detallado. Finalizando...');
        
        // ==> BARRA DE PROGRESO: Marcamos como exitoso al llegar al final del try
        procesoExitoso = true;

    } catch (error) {
        console.error("Error en el proceso autónomo:", error);
        divResultado.innerHTML += `<hr><p style="color:red;"><strong>Error:</strong> ${error.message}</p>`;
        // ==> BARRA DE PROGRESO: Muestra el estado de error
        progressBarManager.error(`Error: ${error.message}`);
    } finally {
        botonProcesar.disabled = false;
        botonProcesar.textContent = '✨';
        divResultado.scrollTop = divResultado.scrollHeight;
        // ==> BARRA DE PROGRESO: Finaliza correctamente solo si no hubo errores
        if (procesoExitoso) {
            progressBarManager.finish();
        }
    }
}


    function actualizarImagenDeDato(nombre, imagenUrl) {
        return new Promise((resolve) => {
            let elementoDOM = null;
            document.querySelectorAll('#listapersonajes .personaje').forEach(personajeEl => {
                const nombreInput = personajeEl.querySelector('.nombreh');
                if (nombreInput && nombreInput.value.trim() === nombre) {
                    elementoDOM = personajeEl;
                }
            });
            
            if (elementoDOM) {
                const visualDiv = elementoDOM.querySelector('.personaje-visual');
                if (visualDiv) {
                    let imgElement = visualDiv.querySelector('img');
                    if (!imgElement) {
                        imgElement = document.createElement('img');
                        imgElement.alt = `Imagen de ${nombre}`;
                        visualDiv.appendChild(imgElement);
                    }
                    imgElement.src = imagenUrl;
                    imgElement.classList.remove('hidden');
                    imgElement.style.display = 'flex';
                    visualDiv.style.display = 'flex';
                    console.log(`Imagen de dato actualizada para: ${nombre}`);
                }
            } else {
                console.warn(`No se encontró el dato '${nombre}' en el DOM para actualizar la imagen.`);
            }
            resolve();
        });
    }
function ultras3 (userPrompt) {
  
}
    async function ultras2(userPrompt) {
        if (!userPrompt || userPrompt.trim() === '') {
            const errorMsg = "The user prompt cannot be empty.";
            console.error(errorMsg);
            return { imagen: null, svgContent: null, error: errorMsg };
        }

        console.log(`[Generador con Guardado] Iniciando para: "${userPrompt}"`);

        if (typeof apiKey === 'undefined') {
            const errorMsg = "The global 'apiKey' variable is not defined.";
            console.error(errorMsg);
            return { imagen: null, svgContent: null, error: errorMsg };
        }

        const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        const payload = {
            "contents": [{
                "parts": [
                    {
                        "text": "Generate an image based on the prompt: " + userPrompt + " "
                    }
                ]
            }],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"]
            },
            "safetySettings": [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };

        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Generador con Guardado] Enviando petición (Intento ${attempt}/${maxRetries})...`);
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();

                if (!response.ok) {
                    const errorMessage = responseData.error?.message || "Unknown API error.";
                    console.error(`API Error Response (Intento ${attempt}):`, response.status, responseData);
                    throw new Error(`API Error: ${errorMessage}`);
                }

                console.log(`[Generador con Guardado] Respuesta de API recibida (Intento ${attempt}).`);

                const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

                if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
                    const base64ImageData = imagePart.inlineData.data;
                    const mimeType = imagePart.inlineData.mimeType;
                    const pngDataUrl = `data:${mimeType};base64,${base64ImageData}`;
                    return { imagen: pngDataUrl, error: null };
                } else {
                    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen en la respuesta.";
                    throw new Error(`La API no devolvió una imagen. Respuesta de texto: ${textResponse}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`[Generador con Guardado] El intento ${attempt} ha fallado:`, error);
                
                if (attempt < maxRetries) {
                    console.log("Esperando 2 segundos antes de reintentar...");
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        console.error("[Generador con Guardado] Todos los intentos de generación han fallado.");
        return { imagen: null, error: lastError ? lastError.message : "Error desconocido tras múltiples intentos." };
    }
});

// ============== Pega y reemplaza estas dos funciones en procedimiento.js ==============

/**
 * Crea un nuevo libro y escenas vacías asociadas, compatible con la estructura de libro.js.
 * @param {string} nombreLibro - El título para el nuevo libro.
 * @param {number} cantEscenas - El número de capítulos/escenas a crear para este libro.
 * @returns {{libroId: string, idsEscenas: string[]}|null} Un objeto con el ID del nuevo libro y un array de los IDs de las escenas creadas, o null si hay un error.
 */
function crearEscenasAutomaticamente(nombreLibro, cantEscenas) {


    // Validación para asegurar que las estructuras de datos globales existen.
    if (typeof libros === 'undefined' || typeof escenas === 'undefined') {
        console.error("Las variables globales 'libros' y 'escenas' no están definidas.");
        alert("Error crítico: No se puede crear el libro porque las estructuras de datos no existen.");
        return null;
    }
    // 1. Crear el nuevo objeto Libro (siguiendo la estructura de Array de libro.js)
    const nuevoLibro = {
        id: `libro_${Date.now()}`,
        titulo: nombreLibro,
        portadaUrl: '' // Se puede añadir una portada por defecto o dejarla vacía
 };
    // 2. Añadir el nuevo libro al array global de libros.
    libros.push(nuevoLibro);
    
    // Opcional: Establecer el libro recién creado como el activo.
    // Esto es importante para que funciones como 'actualizarLista' funcionen inmediatamente.
    libroActivoId = nuevoLibro.id;
    console.log(`Nuevo libro creado con ID: ${nuevoLibro.id} y título: "${nuevoLibro.titulo}"`);
// 3. Actualizar la lista de libros en la interfaz.
 renderizarVisorDeLibros2();



    const idsEscenasCreadas = [];

    // 3. Crear las escenas/capítulos asociados al nuevo libro.
    for (let i = 1; i <= cantEscenas; i++) {
        const nombreEscena = `${nombreLibro} - Capítulo ${String(i).padStart(2, '0')}`;
        // El ID de la escena puede ser más simple, pero debe ser único.
        const idEscena = `escena_${Date.now()}_${i}`;

        // Crear el objeto escena, incluyendo el importantísimo 'libroId'.
        escenas[idEscena] = {
            id: idEscena,
            texto: nombreEscena, // El título del capítulo
            frames: [], // Los frames se llenarán después
            imagen: "", // Propiedad legada, mantener si se usa
            libroId: nuevoLibro.id // Enlace crucial al libro padre
        };

        idsEscenasCreadas.push(idEscena);
    }

    console.log(`Se crearon ${cantEscenas} escenas vacías para el libro "${nombreLibro}".`);

    // Guardar cambios si la función existe, para persistir los datos.
    if (typeof guardarCambios === 'function') {
        guardarCambios();
    }
    
    // Devolver los IDs necesarios para el siguiente paso del proceso.
    return { libroId: nuevoLibro.id, idsEscenas: idsEscenasCreadas };
}

/**
 * Orquesta la creación de un libro completo a partir de un objeto de guion.
 * (VERSIÓN CORREGIDA PARA RENDERIZADO FINAL EN EL DOM)
 * @param {object} guionObjeto - El objeto del guion que contiene 'titulo' y 'contenido' en formato HTML.
 */
 

/**
 * Orquesta la creación de un libro completo a partir de un objeto de guion.
 * (VERSIÓN CORREGIDA PARA RENDERIZADO FINAL EN EL DOM)
 * @param {object} guionObjeto - El objeto del guion que contiene 'titulo' y 'contenido' en formato HTML.
 */
async function generarLibroDesdeGuion(guionObjeto) {
    const divResultado = document.getElementById('resultado-procedimiento');
    divResultado.innerHTML += `<hr><h3>Iniciando Creación de Libro desde Guion...</h3>`;

    // Validaciones iniciales
    if (!guionObjeto || !guionObjeto.titulo || !guionObjeto.contenido) {
        divResultado.innerHTML += `<p style="color:red;">Error: El objeto del guion proporcionado no es válido.</p>`;
        return;
    }
    if (typeof libros === 'undefined' || typeof escenas === 'undefined' || typeof crearEscenasAutomaticamente !== 'function') {
        divResultado.innerHTML += `<p style="color:red;">Error: El sistema de libros no está disponible.</p>`;
        return;
    }

    try {
        // ================== INICIO DE LA CORRECCIÓN DEFINITIVA ==================

        // 1. Extraer la estructura del guion y generar la estructura del libro.
        // El objeto 'guionObjeto' que se pasa como parámetro ya es el guion completo que necesitamos.
        // No es necesario buscarlo en 'guionesGuardados' porque es un objeto recién creado.
        const guionCompleto = guionObjeto;

        // Se añade una validación para asegurar que el objeto recibido es usable.
        if (!guionCompleto || !guionCompleto.contenido) {
            throw new Error(`El objeto del guion recibido para crear el libro no tiene contenido.`);
        }

        divResultado.innerHTML += `<p>1. Analizando la estructura del guion...</p>`;
        const parser = new DOMParser();
        // Se usa la variable 'guionCompleto' para el resto de la lógica.
        const doc = parser.parseFromString(guionCompleto.contenido, 'text/html');
        const datosHistoria = {
            titulo_historia: doc.querySelector('h1')?.textContent || guionCompleto.titulo,
            historia: []
        };
        doc.querySelectorAll('.guion-ia-escena').forEach(escenaEl => {
            datosHistoria.historia.push({
                titulo_escena: escenaEl.querySelector('h3')?.textContent || 'Capítulo sin título',
                frames: Array.from(escenaEl.querySelectorAll('.guion-ia-frame p')).map(p => ({ contenido: p.textContent || '' }))
            });
        });
        if (datosHistoria.historia.length === 0) throw new Error("No se pudieron extraer capítulos del guion.");
        
        divResultado.innerHTML += `<p>2. Creando la estructura del nuevo libro: "${datosHistoria.titulo_historia}"...</p>`;
        const nombreLibro = datosHistoria.titulo_historia;
        const cantEscenas = datosHistoria.historia.length;
        const resultadoCreacion = crearEscenasAutomaticamente(nombreLibro, cantEscenas); 
        const idsEscenasCreadas = resultadoCreacion ? resultadoCreacion.idsEscenas : null;
        if (!idsEscenasCreadas || idsEscenasCreadas.length !== cantEscenas) {
            throw new Error("La creación automática de escenas en el libro falló.");
        }
        
        const libroRecienCreado = libros.find(l => l.id === resultadoCreacion.libroId);
        if (libroRecienCreado) {
            // Se pasa el objeto 'guionCompleto' a la función de la portada.
            generarPortadaAutomatica(libroRecienCreado, guionCompleto).catch(error => {
                console.error("La rutina de generación de portada automática finalizó con un error.", error);
            });
        }
        
        // ================== FIN DE LA CORRECCIÓN ===================

        divResultado.innerHTML += `<p>3. Iniciando desarrollo de contenido e ilustraciones en paralelo...</p>`;
        progressBarManager.set(65, 'Desarrollando capítulos e ilustraciones...');
        const promesasDeImagenes = [];

        for (let i = 0; i < idsEscenasCreadas.length; i++) {
            const idEscena = idsEscenasCreadas[i];
            const escenaOriginal = datosHistoria.historia[i];
            divResultado.innerHTML += `<p><strong>Procesando Capítulo ${i+1}/${cantEscenas}:</strong> "${escenaOriginal.titulo_escena}"</p>`;
            escenas[idEscena].texto = `${nombreLibro} ${String(i + 1).padStart(3, '0')} - ${escenaOriginal.titulo_escena}`;
            escenas[idEscena].frames = [];
            for (let j = 0; j < escenaOriginal.frames.length; j++) {
                const frameOriginal = escenaOriginal.frames[j];
                divResultado.innerHTML += `<p style="padding-left: 20px;">-> Desarrollando texto para el frame ${j+1}...</p>`;
                const promptExpansion = `Contexto: ${datosHistoria.titulo_historia}\nCapítulo: "${escenaOriginal.titulo_escena}"\nContenido del frame a desarrollar: "${frameOriginal.contenido}"\n\n**Tarea:**\n1. Desarrolla y expande el "Contenido del frame a desarrollar" en varios párrafos detallados.\n2. Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:\n{"nuevos_frames_desarrollados": [{"texto_sub_frame": "string"}]}`;
                const maxFrameRetries = 3;
                
                // ================== CAMBIO APLICADO AQUÍ (1/3) ==================
                // Se inicializa un contador para los párrafos de este frame.
                let contadorDeParrafos = 0;
                // ===============================================================

                for (let attempt = 1; attempt <= maxFrameRetries; attempt++) {
                    try {
                        const respuestaJson = await callGenerativeApi(promptExpansion, 'gemini-2.5-flash', true);
                        const nuevosFrames = respuestaJson.nuevos_frames_desarrollados;
                        if (!nuevosFrames || !Array.isArray(nuevosFrames) || nuevosFrames.length === 0) {
                            throw new Error("La IA no devolvió la estructura JSON esperada o el array de frames está vacío.");
                        }
                        for (const subFrame of nuevosFrames) {
                            if (subFrame && typeof subFrame.texto_sub_frame === 'string') {
                                const textoDesarrollado = subFrame.texto_sub_frame;
                                escenas[idEscena].frames.push({ texto: textoDesarrollado, imagen: "" });
                                const nuevoFrameIndex = escenas[idEscena].frames.length - 1;
                                divResultado.innerHTML += `<div style="padding-left: 40px; font-style: italic; color: #000000ff;">${textoDesarrollado.replace(/\n/g, "<br>")}</div>`;
                                
                                // ================== CAMBIO APLICADO AQUÍ (2/3) ==================
                                // Solo se genera la imagen si el contador es PAR (0, 2, 4...)
                                if (contadorDeParrafos % 2 === 0) {
                                    const promesaImagen = generarImagenParaFrameConIA(idEscena, nuevoFrameIndex)
                                        .then(() => { divResultado.innerHTML += `<p style="padding-left: 40px; color:lime;">✓ Ilustración para párrafo ${nuevoFrameIndex + 1} generada.</p>`; })
                                        .catch(error => {
                                            console.error(`Falló la generación de imagen para el frame ${nuevoFrameIndex} de la escena ${idEscena}:`, error);
                                            divResultado.innerHTML += `<p style="padding-left: 40px; color:red;">❌ Falló la ilustración para el párrafo ${nuevoFrameIndex + 1}.</p>`;
                                        });
                                    promesasDeImagenes.push(promesaImagen);
                                }
                                // =================================================================

                                // ================== CAMBIO APLICADO AQUÍ (3/3) ==================
                                // Se incrementa el contador para el siguiente párrafo.
                                contadorDeParrafos++;
                                // ===============================================================
                            }
                        }
                        break; 
                    } catch (error) {
                        divResultado.innerHTML += `<p style="color:orange; padding-left: 40px;">Intento ${attempt}/${maxFrameRetries} fallido para el frame ${j+1}: ${error.message}</p>`;
                        if (attempt === maxFrameRetries) {
                            divResultado.innerHTML += `<p style="color:red; padding-left: 40px;">Error definitivo al generar frame ${j+1}. Se insertará un marcador de error.</p>`;
                            escenas[idEscena].frames.push({ texto: `(Error al generar este frame. Causa: ${error.message})`, imagen: "" });
                        } else {
                            await sleep(2000); 
                        }
                    }
                }
                await sleep(7500);
            }
        }
        divResultado.innerHTML += `<hr><p>Esperando a que todas las ilustraciones terminen de generarse...</p>`;
        progressBarManager.set(90, 'Finalizando ilustraciones...');
        await Promise.all(promesasDeImagenes);
        if (typeof guardarCambios === 'function') guardarCambios();
        if (typeof renderizarVisorDeLibros2 === 'function') renderizarVisorDeLibros2();
        if (typeof seleccionarLibro === 'function') seleccionarLibro(resultadoCreacion.libroId);
        divResultado.innerHTML += `<hr><p style="color:lime;"><strong>✓ ¡Libro Completo!</strong> El libro "${nombreLibro}" ha sido generado, detallado e ilustrado con éxito.</p>`;
    } catch (error) {
        console.error("Error generando el libro desde el guion:", error);
        divResultado.innerHTML += `<p style="color:red;">❌ Error durante la creación del libro: ${error.message}</p>`;
        divResultado.scrollTop = divResultado.scrollHeight;
    }
}



/**
 * Actualiza la lista de capítulos en la interfaz para el libro activo.
 * (VERSIÓN CORREGIDA - COMPATIBLE CON LA ESTRUCTURA DE 'libros' COMO ARRAY)
 */
 /**
 * Orquesta la ilustración en serie de todos los párrafos (frames) de un libro.
 * @param {string} libroId - El ID del libro que se va a ilustrar.
 */
async function ilustrarLibroCompleto(libroId) {
    const divResultado = document.getElementById('resultado-procedimiento');
    divResultado.innerHTML += `<hr><h3>Iniciando Ilustración Automática del Libro...</h3>`;

    const escenasDelLibro = Object.values(escenas).filter(escena => escena.libroId === libroId);

    if (escenasDelLibro.length === 0) {
        divResultado.innerHTML += `<p style="color:orange;">El libro no tiene capítulos para ilustrar.</p>`;
        return;
    }

    console.log(`Iniciando ilustración para ${escenasDelLibro.length} capítulos del libro ${libroId}.`);

    // Iteramos sobre cada capítulo (escena)
    for (const escena of escenasDelLibro) {
        if (!escena.frames || escena.frames.length === 0) continue;

        divResultado.innerHTML += `<p><strong>Ilustrando Capítulo:</strong> "${escena.texto}"...</p>`;

        // Iteramos sobre cada párrafo (frame) dentro del capítulo
        for (let i = 0; i < escena.frames.length; i++) {
            // Saltamos si el frame ya tiene una imagen
            if (escena.frames[i].imagen) {
                console.log(`Saltando frame ${i} de la escena ${escena.id}, ya tiene imagen.`);
                continue;
            }

            divResultado.innerHTML += `<p style="padding-left: 20px;">-> Generando imagen para párrafo ${i + 1}...</p>`;
            try {
                // Llamamos a la función de generación que ya tienes
                await generarImagenParaFrameConIA(escena.id, i);
                divResultado.innerHTML += `<p style="padding-left: 40px; color:lime;">✓ Imagen generada.</p>`;

                // Pausa de 2 segundos entre cada imagen para no saturar la API
                console.log("Esperando 2 segundos antes de la siguiente imagen...");
                await sleep(2000);

            } catch (error) {
                console.error(`Falló la generación de imagen para el frame ${i} de la escena ${escena.id}:`, error);
                divResultado.innerHTML += `<p style="padding-left: 40px; color:red;">❌ Falló la imagen para el párrafo ${i + 1}.</p>`;
            }
        }
    }

    divResultado.innerHTML += `<hr><p style="color:lime;"><strong>✓ ¡Ilustración Completa!</strong> Todos los párrafos del libro han sido procesados.</p>`;
    divResultado.scrollTop = divResultado.scrollHeight;
   
}


/**
 * Copia de generador.js: Genera una imagen para un frame específico, analizando el contexto.
 * @param {string} escenaId - El ID de la escena que contiene el frame.
 * @param {number} frameIndex - El índice del frame dentro de la escena.
 */
async function generarImagenParaFrameConIA2(escenaId, frameIndex) {
    const frame = escenas[escenaId]?.frames?.[frameIndex];
    if (!frame || !frame.texto.trim()) {
        console.warn(`Frame en ${escenaId}[${frameIndex}] está vacío. Saltando.`);
        return;
    }

    if (typeof apiKey === 'undefined' || !apiKey) {
        alert("Error: La 'apiKey' global no está definida.");
        return;
    }
    
    // Mostramos un feedback visual en el frame que se está procesando
    const frameDiv = document.querySelector(`.escena[data-id="${escenaId}"] .frameh[data-index="${frameIndex}"]`);
    if(frameDiv) frameDiv.classList.add('generando-imagen');

    let promptFinal = `Crea una ilustración SIN TEXTO para la siguiente escena: "${frame.texto.trim()}". El aspecto debe ser de 16/9, en formato panorámico horizontal y de alta calidad. EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN.`;

    try {
        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre && promptVisual) { // Solo consideramos personajes con prompt visual
                datosIndexados.push({ nombre, promptVisual });
            }
        });

        if (datosIndexados.length > 0) {
            const contextoPersonajes = datosIndexados.map(p => `- ${p.nombre}`).join('\n');
            const promptAnalisis = `**Contexto:** Personajes disponibles: ${contextoPersonajes}\n**Tarea:** Del texto, devuelve un array JSON con los NOMBRES de los personajes que aparecen.\n**Texto:** "${frame.texto.trim()}"`;
            
            // Usamos try-catch aquí para que no detenga todo el proceso si el análisis falla
            try {
                const respuestaAnalisis = await callGenerativeApi(promptAnalisis, 'gemini-2.0-flash', true);
                if (respuestaAnalisis && Array.isArray(respuestaAnalisis)) {
                    const promptsVisuales = respuestaAnalisis
                        .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                        .filter(Boolean).join('. ');
                    if (promptsVisuales) {
                        promptFinal += `\n\n**Guía visual:** ${promptsVisuales}`;
                    }
                }
            } catch (analisisError) {
                console.warn("El análisis de personajes falló, se procederá con el prompt base.", analisisError);
            }
        }

        const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
        const payload = {
            "contents": [{"parts": [{ "text": promptFinal }]}],
            "generationConfig": { "responseModalities": ["IMAGE"] },
            "safetySettings": [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };

        const maxRetries = 3;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error?.message || "Error API");
                const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData?.data) {
                    frame.imagen = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    if (typeof guardarCambios === 'function') guardarCambios();
                    if (typeof actualizarLista === 'function') actualizarLista();
                    return; // Éxito
                }
                throw new Error("La API no devolvió una imagen.");
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await sleep(2000);
            }
        }
    } catch (error) {
        console.error(`Error final al generar imagen para frame ${escenaId}[${frameIndex}]:`, error);
        throw error; // Propagamos el error para que la función orquestadora lo capture
    } finally {
        // Quitamos el feedback visual independientemente del resultado
        if(frameDiv) frameDiv.classList.remove('generando-imagen');
    }
}

async function generarPortadaAutomatica(libro, guionObjeto) {
    const divResultado = document.getElementById('resultado-procedimiento');
    
    try {
        divResultado.innerHTML += `<p>2.1. Generando resumen visual para la portada...</p>`;
        progressBarManager.set(60, 'Creando prompt para portada...');

        // 1. Generar un prompt visual a partir del contenido del guion.
        const promptResumen = `Basado en el siguiente guion, crea una única frase muy descriptiva y visual para generar la imagen de una portada de libro. La frase debe capturar la esencia de la historia. No incluyas el título ni nombres de personajes, solo la descripción visual.\n\nGuion:\n${guionObjeto.contenido}`;
        const promptVisualGenerado = await callGenerativeApi(promptResumen, "gemini-2.0-flash-lite", false);

        if (!promptVisualGenerado) {
            throw new Error("La IA no pudo generar un prompt visual para la portada.");
        }

        divResultado.innerHTML += `<p style="padding-left: 20px;">-> Prompt Visual: "${promptVisualGenerado}"</p>`;
        progressBarManager.set(62, 'Generando imagen de portada...');
        
        // 2. Construir los datos para la portada.
        const datosPortada = {
            titulo: libro.titulo,
            promptVisual: promptVisualGenerado,
            autores: "", // Autor vacío como se solicitó
            editorial: "SILENOS" // Editorial fija como se solicitó
        };

        // --- 3. LLAMADA A LA API ---
        if (typeof apiKey === 'undefined' || !apiKey) {
            throw new Error("Error de configuración: La 'apiKey' global no está definida.");
        }

        const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        const promptFinal = `Crea una portada de libro artística y profesional.
        - Título del libro (debe ser visible y preferiblemente en Mayusculas): "${datosPortada.titulo}"
        - Descripción visual de la portada: "${datosPortada.promptVisual}"
        - La Editorial consiste en la palabra "SILEN" en blanco y "OS en rojo quedando como "SILENOS" en la parte inferior de la portada.
        El diseño debe ser coherente, de alta calidad y adecuado para una portada de libro. 
        En formato vertical panoramico 9/16. 
        El título y la editorial deben estar bien integrados en la composición. 
        No incluyas NINGUN TEXTO en la portada que no sean el titulo y la editorial. El prompt visual es solo para inspirarte y guiarte. 
        El único texto visible debe ser el título y la editorial.`;

        const payload = {
            "contents": [{"parts": [{ "text": promptFinal }]}],
            "generationConfig": { "responseModalities": ["TEXT", "IMAGE"] },
            "safetySettings": [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };

        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Enviando petición para portada automática (Intento ${attempt}/${maxRetries})...`);
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();
                if (!response.ok) throw new Error(responseData.error?.message || "Error desconocido de la API.");
                const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

                if (imagePart?.inlineData?.data) {
                    const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    libro.portadaUrl = pngDataUrl;
                    if (typeof renderizarVisorDeLibros2 === 'function') renderizarVisorDeLibros2();
                    console.log(`Portada automática generada y asignada al libro "${libro.titulo}".`);
                    divResultado.innerHTML += `<p style="color:lime;">✓ Portada generada automáticamente.</p>`;
                    return;

                } else {
                    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
                    throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`Intento de portada automática ${attempt} fallido:`, error);
                if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        throw lastError || new Error("Error desconocido tras múltiples reintentos.");
    } catch (error) {
        console.error("Error en generarPortadaAutomatica:", error);
        divResultado.innerHTML += `<p style="color:orange;">⚠️ Falló la generación automática de la portada: ${error.message}</p>`;
    }
        

    renderizarVisorDeLibros2();
}