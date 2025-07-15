// =================================================================
// ARCHIVO REFACTORIZADO: generador.js (Versión 9 - Corrección de funciones)
// =================================================================
// OBJETIVOS DE ESTA VERSIÓN:
// 1. CORRECCIÓN DE ERROR: Se añaden las definiciones de las funciones
//    `createEnrichmentPrompt`, `createStructuralSvgPrompt`, y
//    `createSuperRealisticPrompt` que faltaban y causaban el error.
// 2. MANTENIMIENTO DE ESTRUCTURA: Se conserva la lógica existente
//    y solo se añade el código necesario para la funcionalidad del botón '💎'.
// =================================================================

// -----------------------------------------------------------------
// MÓDULO 1: CONFIGURACIÓN Y UTILIDADES
// -----------------------------------------------------------------

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

let lastGeneratedSceneData = null;
let fabricCanvas = null;

function showCustomAlert(message) {
    const existingAlert = document.getElementById('custom-alert-modal');
    if (existingAlert) existingAlert.remove();

    const modal = document.createElement('div');
    modal.id = 'custom-alert-modal';
    modal.style.cssText = `position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #2c3e50; color: #ecf0f1; padding: 15px 25px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; gap: 15px; font-family: sans-serif;`;
    modal.innerHTML = `<p style="margin: 0;">${message}</p><button style="padding: 5px 10px; background-color: #3498db; color: #fff; border: none; border-radius: 5px; cursor: pointer;">OK</button>`;
    document.body.appendChild(modal);
    modal.querySelector('button').onclick = () => modal.remove();
    setTimeout(() => modal.remove(), 5000);
}

const delay = ms => new Promise(res => setTimeout(res, ms));


// -----------------------------------------------------------------
// MÓDULO 2: MANEJO DEL DOM Y EVENTOS
// -----------------------------------------------------------------

const DOM = {
    promptInput: document.getElementById('user-prompt-input'),
    generateButton: document.getElementById('btn-generate'),
    saveButton: document.getElementById('btn-save-generation'),
    statusMessage: document.getElementById('status-message'),
    canvas: document.getElementById('render-canvas'),
    renderContainer: document.getElementById('render-container'),
};

function inicializarEventos() {
    if (DOM.generateButton) DOM.generateButton.addEventListener('click', handleGeneration);
    if (DOM.saveButton) DOM.saveButton.addEventListener('click', handleSaveCurrentCanvas);
    if (DOM.promptInput) {
        DOM.promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGeneration();
            }
        });
    }

    if (DOM.canvas) {
        DOM.canvas.width = CANVAS_WIDTH;
        DOM.canvas.height = CANVAS_HEIGHT;
        fabricCanvas = new fabric.Canvas(DOM.canvas);
        fabricCanvas.setBackgroundColor('#f0f0f0', fabricCanvas.renderAll.bind(fabricCanvas));
    }
}

function actualizarUI(generando, mensaje = '') {
    if (DOM.statusMessage) DOM.statusMessage.textContent = mensaje;
    if (DOM.generateButton) DOM.generateButton.disabled = generando;
    if (DOM.saveButton) DOM.saveButton.style.display = !generando && lastGeneratedSceneData ? 'inline-block' : 'none';
    if (DOM.renderContainer) DOM.renderContainer.style.display = 'block';
    console.log(`[GENERADOR SVG]: ${mensaje}`);
}

// -----------------------------------------------------------------
// MÓDULO 3: LÓGICA DE GENERACIÓN Y MEJORA
// -----------------------------------------------------------------

function createUnifiedPrompt(userPrompt) {
    return `
        Eres un asistente de diseño conceptual y gráfico. Tu tarea es analizar un prompt, extraer su información semántica y generar una representación visual en formato SVG.

        PROMPT DEL USUARIO: "${userPrompt}"

        INSTRUCCIONES:
        1.  Analiza el prompt y define los siguientes metadatos:
            - "nombre": Un nombre corto y descriptivo para el elemento (máx. 5 palabras).
            - "descripcion": Una descripción detallada de lo que representa la imagen.
            - "etiqueta": Clasifica el elemento. Elige UNA de las siguientes opciones: 'personaje', 'ubicacion', 'evento', 'objeto', 'atuendo', 'edificio', 'transporte', 'animal', 'planta', 'ser_vivo', 'elemento_geografico', 'concepto', 'visual', 'indeterminado'.
            - "arco": Asigna un arco temático. Elige UNO: 'videojuego', 'planteamiento', 'visuales'.
        2.  Crea una imagen vectorial de alta calidad que represente el prompt.
        3.  El código de esta imagen debe estar en formato SVG, dentro de una propiedad llamada "svgContent".
        4.  El SVG debe tener un viewBox="0 0 512 512", xmlns="http://www.w3.org/2000/svg", y fondo transparente. Usa estilos ricos (colores, degradados, filtros) y organiza los elementos en grupos (<g>) con IDs.
        5.  COHERENCIA ESTRUCTURAL (¡MUY IMPORTANTE!): Todos los elementos que dibujes deben formar una ÚNICA entidad visual coherente. Si dibujas un personaje, la cabeza debe estar conectada al cuello, el cuello al torso, los brazos al torso, etc. No dejes partes flotando en el espacio. Trata el sujeto como un objeto físico y sólido donde todas sus partes encajan y se tocan.
        6.  La composición general debe estar centrada y bien equilibrada dentro del viewBox.
        7.  Tu respuesta DEBE SER ÚNICAMENTE un objeto JSON válido que contenga todos los campos mencionados. No incluyas explicaciones ni markdown.

        EJEMPLO DE SALIDA PARA EL PROMPT "un veloz zorro naranja en un bosque":
        {
          "nombre": "Zorro Naranja Veloz",
          "descripcion": "Un zorro de color naranja brillante, capturado en pleno movimiento mientras corre a través de un estilizado bosque de tonos verdes y marrones.",
          "etiqueta": "animal",
          "arco": "visuales",
          "svgContent": "<svg viewBox=\\"0 0 512 512\\" xmlns=\\"http://www.w3.org/2000/svg\\"><g id=\\"zorro\\"><path d='...' fill='#E67E22'/><path d='...' fill='#FFFFFF'/></g></svg>"
        }
    `;
}

function createImprovementPrompt(svgContent, userPrompt) {
    return `
        Eres un diseñador gráfico experto en la mejora y refinamiento de arte vectorial. Tu tarea es tomar un SVG existente y mejorarlo basándote en una descripción.

        SVG ACTUAL:
        \`\`\`svg
        ${svgContent}
        \`\`\`

        INSTRUCCIONES DE MEJORA: "${userPrompt}"

        TAREAS A REALIZAR:
        1.  Analiza el SVG actual y la instrucción de mejora.
        2.  NO cambies el concepto fundamental del SVG, a menos que las instrucciones de mejora lo requieran. Tu objetivo es refinarlo, no reemplazarlo.
        2.5 Si es necesario, ajusta el tamaño del SVG para que se ajuste al viewBox="0 0 512 512" y mantén un fondo transparente.
        2.6 Incorpora elementos nuevos o cambia de lugar los que fueran necesarios para mejorar la composición.
        3.  Añade más detalles, tanto formas como texturas , mejora los colores, aplica degradados más sutiles, añade texturas o patrones si es apropiado, y mejora las sombras y luces.
        4.  Asegúrate de que la coherencia estructural se mantenga o mejore. Todas las partes deben seguir conectadas.
        5.  Tu respuesta DEBE SER ÚNICAMENTE el código del NUEVO SVG mejorado, comenzando con "<svg" y terminando con "</svg>". No incluyas explicaciones, comentarios, ni bloques de código markdown.
    `;
}

// --- INICIO: FUNCIONES AÑADIDAS PARA CORREGIR EL ERROR ---

/**
 * Crea un prompt para que la IA enriquezca una descripción simple.
 * @param {string} userPrompt - La descripción inicial del usuario.
 * @returns {string} El prompt para la IA.
 */
function createEnrichmentPrompt(userPrompt) {
    return `
     Eres un asistente de diseño conceptual y gráfico. Tu tarea es analizar un prompt, extraer su información semántica y generar una representación visual en formato SVG.

        PROMPT DEL USUARIO: "${userPrompt}"

        INSTRUCCIONES:
        1.  Analiza el prompt y define los siguientes metadatos:
            - "nombre": Un nombre corto y descriptivo para el elemento (máx. 5 palabras).
            - "descripcion": Una descripción detallada de lo que representa la imagen.
            - "etiqueta": Clasifica el elemento. Elige UNA de las siguientes opciones: 'personaje', 'ubicacion', 'evento', 'objeto', 'atuendo', 'edificio', 'transporte', 'animal', 'planta', 'ser_vivo', 'elemento_geografico', 'concepto', 'visual', 'indeterminado'.
            - "arco": Asigna un arco temático. Elige UNO: 'videojuego', 'planteamiento', 'visuales'.
        2.  Crea una imagen vectorial de alta calidad que represente el prompt.
        3.  El código de esta imagen debe estar en formato SVG, dentro de una propiedad llamada "svgContent".
        4.  El SVG debe tener un viewBox="0 0 512 512", xmlns="http://www.w3.org/2000/svg", y fondo transparente. Usa estilos ricos (colores, degradados, filtros) y organiza los elementos en grupos (<g>) con IDs.
        5.  COHERENCIA ESTRUCTURAL (¡MUY IMPORTANTE!): Todos los elementos que dibujes deben formar una ÚNICA entidad visual coherente. Si dibujas un personaje, la cabeza debe estar conectada al cuello, el cuello al torso, los brazos al torso, etc. No dejes partes flotando en el espacio. Trata el sujeto como un objeto físico y sólido donde todas sus partes encajan y se tocan.
        6.  La composición general debe estar centrada y bien equilibrada dentro del viewBox.
        7.  Tu respuesta DEBE SER ÚNICAMENTE un objeto JSON válido que contenga todos los campos mencionados. No incluyas explicaciones ni markdown.

        EJEMPLO DE SALIDA PARA EL PROMPT "un veloz zorro naranja en un bosque":
        {
          "nombre": "Zorro Naranja Veloz",
          "descripcion": "Un zorro de color naranja brillante, capturado en pleno movimiento mientras corre a través de un estilizado bosque de tonos verdes y marrones.",
          "etiqueta": "animal",
          "arco": "visuales",
          "svgContent": "<svg viewBox=\\"0 0 512 512\\" xmlns=\\"http://www.w3.org/2000/svg\\"><g id=\\"zorro\\"><path d='...' fill='#E67E22'/><path d='...' fill='#FFFFFF'/></g></svg>"
        }
    `;
}

/**
 * Crea un prompt para generar un SVG estructural básico.
 * @param {string} structuralSvg -
 * @param {string} richDescription - La descripción detallada generada en el paso anterior.
 * @returns {string} El prompt para la IA.
 */
function createStructuralSvgPrompt(svgContent, userPrompt) {
    return `
        Eres un diseñador gráfico experto en la mejora y refinamiento de arte vectorial. Tu tarea es tomar un SVG existente y mejorarlo basándote en una descripción.

        SVG ACTUAL:
        \`\`\`svg
        ${svgContent}
        \`\`\`

        INSTRUCCIONES DE MEJORA: "${userPrompt}"

        TAREAS A REALIZAR:
        1.  Analiza el SVG actual y la instrucción de mejora.
        2.  NO cambies el concepto fundamental del SVG, a menos que las instrucciones de mejora lo requieran. Tu objetivo es refinarlo, no reemplazarlo.
        2.5 Si es necesario, ajusta el tamaño del SVG para que se ajuste al viewBox="0 0 512 512" y mantén un fondo transparente.
        2.6 Incorpora elementos nuevos o cambia de lugar los que fueran necesarios para mejorar la composición.
        3.  Añade más detalles, tanto formas como texturas , mejora los colores, aplica degradados más sutiles, añade texturas o patrones si es apropiado, y mejora las sombras y luces.
        4.  Asegúrate de que la coherencia estructural se mantenga o mejore. Todas las partes deben seguir conectadas.
        5.  Tu respuesta DEBE SER ÚNICAMENTE el código del NUEVO SVG mejorado, comenzando con "<svg" y terminando con "</svg>". No incluyas explicaciones, comentarios, ni bloques de código markdown.
    `;
}

/**
 * Crea un prompt para refinar un SVG básico a un estilo superrealista.
 * @param {string} structuralSvg - El SVG básico del paso anterior.
 * @param {string} richDescription - La descripción detallada.
 * @returns {string} El prompt para la IA.
 */
function createSuperRealisticPrompt(svgContent, userPrompt) {
    return `
     Eres un diseñador gráfico experto en la mejora y refinamiento de arte vectorial. 
     Tu tarea es tomar un SVG existente y mejorarlo basándote en una descripción para hacerlo superrealista.
     Corrige el SVG para que sea más detallado, con la posición de los elementos correcta y con un estilo superrealista con posiciones y proporciones correctas.

        SVG ACTUAL:
        \`\`\`svg
        ${svgContent}
        \`\`\`

        INSTRUCCIONES DE MEJORA: "${userPrompt}"

        TAREAS A REALIZAR:
        1.  Analiza el SVG actual y la instrucción de mejora.
        2.  NO cambies el concepto fundamental del SVG, a menos que las instrucciones de mejora lo requieran. Tu objetivo es refinarlo, no reemplazarlo.
        2.5 Si es necesario, ajusta el tamaño del SVG para que se ajuste al viewBox="0 0 512 512" y mantén un fondo transparente.
        2.6 Incorpora elementos nuevos o cambia de lugar los que fueran necesarios para mejorar la composición.
        3.  Añade más detalles, tanto formas como texturas , mejora los colores, aplica degradados más sutiles, añade texturas o patrones si es apropiado, y mejora las sombras y luces.
        4.  Asegúrate de que la coherencia estructural se mantenga o mejore. Todas las partes deben seguir conectadas.
        5.  Tu respuesta DEBE SER ÚNICAMENTE el código del NUEVO SVG mejorado, comenzando con "<svg" y terminando con "</svg>". No incluyas explicaciones, comentarios, ni bloques de código markdown.
    `;
}

// --- FIN: FUNCIONES AÑADIDAS ---


async function callApiForGeneratedJson(prompt, expectJson = true) {
    // Asumimos que 'apiKey' está disponible en el scope global
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {},
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
    };

    if (expectJson) {
        payload.generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error en la API: ${response.statusText}. Cuerpo: ${errorBody}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
        console.error("Respuesta de API inesperada:", JSON.stringify(data, null, 2));
        throw new Error("La IA no devolvió contenido en la respuesta.");
    }
    
    if (expectJson) {
        try {
            return JSON.parse(rawText);
        } catch (error) {
            console.error("Fallo al parsear JSON. String recibido:", rawText);
            throw new Error("La respuesta de la API no contenía un JSON válido.");
        }
    } else {
        // Limpia el texto si viene con markdown para SVG
        return rawText.replace(/```svg\n?/, '').replace(/```$/, '');
    }
}

async function handleGeneration() {
    const userPrompt = DOM.promptInput.value.trim();
    if (!userPrompt) {
        showCustomAlert("Por favor, describe la imagen que quieres crear.");
        return;
    }

    lastGeneratedSceneData = null;
    actualizarUI(true, 'Generando concepto y SVG con la IA...');

    try {
        const prompt = createUnifiedPrompt(userPrompt);
        const generatedData = await callApiForGeneratedJson(prompt, true);

        const { nombre, descripcion, etiqueta, arco, svgContent } = generatedData;

        if (!svgContent) {
            throw new Error("El JSON de la IA no contenía la propiedad 'svgContent'.");
        }

        actualizarUI(true, 'Cargando SVG en el canvas...');
        await delay(100);

        fabricCanvas.clear();
        fabricCanvas.setBackgroundColor('#f0f0f0', fabricCanvas.renderAll.bind(fabricCanvas));

        fabric.loadSVGFromString(svgContent, (objects, options) => {
            if (!objects || objects.length === 0) {
                showCustomAlert("Error: El SVG generado no pudo ser interpretado o estaba vacío.");
                actualizarUI(false, 'Error al parsear SVG.');
                return;
            }

            const group = fabric.util.groupSVGElements(objects, options);
            const scaleFactor = Math.min((fabricCanvas.width * 0.9) / group.width, (fabricCanvas.height * 0.9) / group.height);
            group.scale(scaleFactor);
            group.set({ left: fabricCanvas.width / 2, top: fabricCanvas.height / 2, originX: 'center', originY: 'center' });

            fabricCanvas.add(group);
            fabricCanvas.renderAll();

            lastGeneratedSceneData = { nombre, descripcion, etiqueta, arco, svgContent };
            actualizarUI(false, '¡Imagen y metadatos generados con éxito!');
        });

    } catch (error) {
        console.error("Error en el proceso de generación:", error);
        actualizarUI(false, `Error: ${error.message}`);
        lastGeneratedSceneData = null;
    }
}

// -----------------------------------------------------------------
// MÓDULO 4: GESTIÓN DE DATOS Y GUARDADO
// -----------------------------------------------------------------

function handleSaveCurrentCanvas() {
    if (!fabricCanvas || !lastGeneratedSceneData) {
        showCustomAlert("No hay ninguna imagen generada para guardar.");
        return;
    }

    const imageDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        backgroundColor: 'transparent'
    });

    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined') {
            throw new Error("La función 'agregarPersonajeDesdeDatos' no está disponible.");
        }

        agregarPersonajeDesdeDatos({
            nombre: lastGeneratedSceneData.nombre,
            descripcion: lastGeneratedSceneData.descripcion,
            imagen: imageDataUrl,
            svgContent: lastGeneratedSceneData.svgContent,
            etiqueta: lastGeneratedSceneData.etiqueta,
            arco: lastGeneratedSceneData.arco || 'sin_arco'
        });
        showCustomAlert(`Elemento guardado como "${lastGeneratedSceneData.nombre}" en Datos.`);

    } catch (error) {
        console.error("Error al guardar la generación:", error);
        showCustomAlert(`Error al guardar: ${error.message}`);
    }
}


// -----------------------------------------------------------------
// MÓDULO 5: FUNCIONES DE AYUDA PARA GENERACIÓN EXTERNA
// -----------------------------------------------------------------

async function svgToPngDataURL(svgString) {
    return new Promise((resolve, reject) => {
        const staticCanvas = new fabric.StaticCanvas(null, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
        fabric.loadSVGFromString(svgString, (objects, options) => {
            if (!objects || objects.length === 0) {
                return reject(new Error("El SVG generado para la conversión no pudo ser interpretado o estaba vacío."));
            }
            const group = fabric.util.groupSVGElements(objects, options);
            const scaleFactor = Math.min((staticCanvas.width * 0.9) / group.width, (staticCanvas.height * 0.9) / group.height);
            group.scale(scaleFactor);
            group.set({ left: staticCanvas.width / 2, top: staticCanvas.height / 2, originX: 'center', originY: 'center' });
            staticCanvas.add(group);
            staticCanvas.renderAll();
            const dataUrl = staticCanvas.toDataURL({ format: 'png', backgroundColor: 'transparent' });
            resolve(dataUrl);
        });
    });
}

async function generarImagenDesdePrompt(userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    console.log(`[Generador Externo SVG] Iniciando para: "${userPrompt}"`);

    const prompt = createUnifiedPrompt(userPrompt);
    const generatedData = await callApiForGeneratedJson(prompt, true);
    const { svgContent } = generatedData;

    if (!svgContent) {
        throw new Error("La respuesta de la IA para la generación externa no contenía 'svgContent'.");
    }

    const pngDataUrl = await svgToPngDataURL(svgContent);
    
    return { imagen: pngDataUrl, svgContent: svgContent };
}

async function mejorarImagenDesdeSVG(svgExistente, userPrompt) {
    if (!svgExistente) {
        throw new Error("No se proporcionó un SVG existente para mejorar.");
    }
    console.log(`[Generador Externo SVG] Iniciando mejora para: "${userPrompt}"`);

    const prompt = createImprovementPrompt(svgExistente, userPrompt);
    const svgMejorado = await callApiForGeneratedJson(prompt, false);

    if (!svgMejorado) {
        throw new Error("La IA no devolvió un SVG mejorado.");
    }

    const pngDataUrl = await svgToPngDataURL(svgMejorado);

    return { imagen: pngDataUrl, svgContent: svgMejorado };
}

async function generarImagenSuperrealistaDesdePrompt(userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    console.log(`[Generador Superrealista] Iniciando para: "${userPrompt}"`);
    
    // PASO 1: Enriquecer la descripción
    console.log("[Paso 1/3] Enriqueciendo la descripción...");
    const enrichmentPrompt = createEnrichmentPrompt(userPrompt);
    const richDescription = await callApiForGeneratedJson(enrichmentPrompt, false);

    // PASO 2: Crear el SVG estructural
    console.log("[Paso 2/3] Creando SVG estructural...");
    const structuralPrompt = createStructuralSvgPrompt(richDescription);
    const structuralSvg = await callApiForGeneratedJson(structuralPrompt, false);

    // PASO 3: Refinar a superrealista
    console.log("[Paso 3/3] Refinando a SVG superrealista...");
    const superRealisticPrompt = createSuperRealisticPrompt(structuralSvg, richDescription);
    const finalSvg = await callApiForGeneratedJson(superRealisticPrompt, false);

    if (!finalSvg) {
        throw new Error("La IA no devolvió un SVG final en el proceso de refinamiento.");
    }

    // PASO 4: Convertir a PNG para mostrar
    console.log("[Paso 4/4] Convirtiendo a PNG...");
    const pngDataUrl = await svgToPngDataURL(finalSvg);

    console.log("[Generador Superrealista] Proceso completado.");
    return { imagen: pngDataUrl, svgContent: finalSvg };
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);
