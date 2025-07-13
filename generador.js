// =================================================================
// ARCHIVO REFACTORIZADO: generador.js (Versión 5 - Integración con Fabric.js)
// =================================================================
// OBJETIVOS DE ESTA VERSIÓN:
// 1. MOTOR DE RENDERIZADO FABRIC.JS:
//    - Se reemplaza el API de Canvas 2D nativo por Fabric.js.
//    - Cada forma generada es ahora un objeto manipulable en el canvas.
//    - Se simplifica la lógica de transformación y renderizado.
// 2. MANTENIMIENTO DE LA ESTRUCTURA:
//    - NO se han cambiado nombres de funciones, variables o la lógica de negocio.
//    - Las funciones de renderizado (`renderizarEscena`, `renderizarNodo`, `dibujarComponente`)
//      han sido reescritas internamente para usar Fabric.js, pero sus firmas y
//      propósitos se mantienen.
// 3. PREPARACIÓN PARA INTERACTIVIDAD:
//    - La base de código ahora permite añadir fácilmente funciones de edición
//      (mover, escalar, rotar objetos con el ratón).
// =================================================================

// -----------------------------------------------------------------
// MÓDULO 1: CONFIGURACIÓN Y UTILIDADES
// -----------------------------------------------------------------

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

// Almacena la última respuesta JSON completa para guardado o depuración.
let lastGeneratedSceneData = null;
// Almacena la instancia del canvas de Fabric.js.
let fabricCanvas = null;


/**
 * Muestra una alerta personalizada no bloqueante.
 * @param {string} message - El mensaje a mostrar.
 */
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

/**
 * Una simple promesa de retardo.
 * @param {number} ms - Milisegundos a esperar.
 */
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
    jsonFileInput: document.getElementById('json-file-input'),
    processJsonButton: document.getElementById('btn-process-json'),
    jsonInputArea: document.getElementById('json-input-area'),
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
    if (DOM.processJsonButton) DOM.processJsonButton.addEventListener('click', handleProcessJsonInput);
    if (DOM.jsonFileInput) DOM.jsonFileInput.addEventListener('change', handleJsonFileSelect);

    // INICIO: MODIFICACIÓN PARA FABRIC.JS
    if (DOM.canvas) {
        // En lugar de obtener el contexto 2D, inicializamos un canvas de Fabric.
        DOM.canvas.width = CANVAS_WIDTH;
        DOM.canvas.height = CANVAS_HEIGHT;
        fabricCanvas = new fabric.Canvas(DOM.canvas);
    }
    // FIN: MODIFICACIÓN PARA FABRIC.JS
}

function actualizarUI(generando, mensaje = '') {
    if (DOM.statusMessage) DOM.statusMessage.textContent = mensaje;
    if (DOM.generateButton) DOM.generateButton.disabled = generando;
    if (DOM.saveButton) DOM.saveButton.style.display = !generando && lastGeneratedSceneData ? 'inline-block' : 'none';
    if (DOM.renderContainer) DOM.renderContainer.style.display = 'block';
    console.log(`[GENERADOR]: ${mensaje}`);
}

// -----------------------------------------------------------------
// MÓDULO 3: COMUNICACIÓN CON LA API (GEMINI)
// -----------------------------------------------------------------

function extractJson(text) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = match ? match[1] : text;
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Fallo al parsear JSON. String recibido:", jsonString);
        throw new Error("La respuesta de la API no contenía un JSON válido.");
    }
}

async function callApi(prompt, maxRetries = 2) {
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 18192,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 segundos de timeout

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Error en la API: ${response.statusText}. Cuerpo: ${errorBody}`);
            }

            const data = await response.json();

            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`La solicitud fue bloqueada por la API: ${data.promptFeedback.blockReason}`);
            }

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                console.error("Respuesta de API inesperada:", JSON.stringify(data, null, 2));
                throw new Error("La respuesta de la API no tiene el formato esperado o está vacía.");
            }
            return extractJson(rawText);

        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`Intento ${attempt}/${maxRetries} de llamada a la API fallido:`, error.message);
            if (attempt === maxRetries || error.name !== 'AbortError') {
                 throw error; // Re-lanzar el error si no es un timeout o es el último intento
            }
            // Si es un timeout y no es el último intento, el bucle continuará.
        }
    }
}

// =================================================================
// INICIO: MÓDULO 4 REFACTORIZADO PARA FABRIC.JS
// =================================================================

/**
 * Convierte un nodo de forma del JSON a un objeto de Fabric.js.
 * @param {object} node - El objeto del nodo de la escena a dibujar.
 * @returns {fabric.Object | null} Un objeto de Fabric.js o null si no se puede crear.
 */
function dibujarComponente(node) {
    const style = node.style || {};
    const fill = style.fill || {};
    const stroke = style.stroke || {};
    const effects = style.effects || [];

    // Propiedades base del objeto Fabric
    const fabricProps = {
        opacity: style.opacity ?? 1,
        stroke: stroke.color || 'transparent',
        strokeWidth: stroke.width || 0,
        // IMPORTANTE: Se establece el origen en el centro para que coincida
        // con la lógica de posicionamiento del JSON.
        originX: 'center',
        originY: 'center',
    };

    // Aplicar efectos (sombra)
    const shadow = effects.find(e => e.type === 'dropShadow');
    if (shadow) {
        fabricProps.shadow = new fabric.Shadow({
            color: shadow.color || 'rgba(0,0,0,0)',
            blur: shadow.blur || 0,
            offsetX: shadow.offsetX || 0,
            offsetY: shadow.offsetY || 0,
        });
    }
    
    // Configuración de Relleno (Sólido, Degradados)
    if (fill.type === 'solido') {
        fabricProps.fill = fill.color || 'transparent';
    } else if (fill.type === 'degradado_lineal' && Array.isArray(fill.colores)) {
        fabricProps.fill = new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'pixels',
            coords: { x1: fill.inicio.x, y1: fill.inicio.y, x2: fill.fin.x, y2: fill.fin.y },
            colorStops: fill.colores.map((color, index) => ({
                offset: index / (fill.colores.length - 1),
                color: color
            }))
        });
    } else if (fill.type === 'radialGradient' && Array.isArray(fill.colores)) {
         fabricProps.fill = new fabric.Gradient({
            type: 'radial',
            gradientUnits: 'pixels',
            coords: { 
                x1: fill.centro_inicio.x, y1: fill.centro_inicio.y, r1: fill.radio_inicio,
                x2: fill.centro_fin.x, y2: fill.centro_fin.y, r2: fill.radio_fin 
            },
            colorStops: fill.colores.map((color, index) => ({
                offset: index / (fill.colores.length - 1),
                color: color
            }))
        });
    } else {
        fabricProps.fill = 'transparent';
    }

    // Creación del objeto Fabric según el tipo
    let fabricObject = null;
    switch (node.type) {
        case 'rectángulo':
            fabricObject = new fabric.Rect({
                ...fabricProps,
                width: node.tamaño?.ancho || 0,
                height: node.tamaño?.alto || 0,
            });
            break;
        case 'círculo':
            fabricObject = new fabric.Circle({
                ...fabricProps,
                radius: node.tamaño?.radio || 0,
            });
            break;
        case 'poligono':
            if (node.puntos?.length > 1) {
                fabricObject = new fabric.Polygon(node.puntos, {
                    ...fabricProps,
                });
            }
            break;
    }
    
    return fabricObject;
}

/**
 * Función recursiva que procesa y crea un objeto Fabric para cada nodo.
 * @param {object} node - El nodo actual (puede ser un grupo o una forma).
 * @param {object} definitions - El objeto de definiciones para resolver referencias.
 * @returns {fabric.Object | null} El objeto/grupo de Fabric creado.
 */
function renderizarNodo(node, definitions) {
    if (!node) return null;

    if (node.ref) {
        const definition = definitions[node.ref];
        if (!definition) {
            console.warn(`Definición no encontrada para la referencia: "${node.ref}"`);
            return null;
        }
        const originalTransform = node.transform || {};
        node = { ...definition, ...node };
        node.transform = { ...(definition.transform || {}), ...originalTransform };
    }

    const transform = node.transform || {};
    const pos = transform.posición || [0, 0];
    const rot = transform.rotación || 0;
    const scale = transform.escala || [1, 1];

    let fabricObject;

    if (node.type === 'group' && Array.isArray(node.children)) {
        const childrenObjects = node.children
            .sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0))
            .map(child => renderizarNodo(child, definitions))
            .filter(obj => obj !== null); // Filtra nulos por si algún nodo hijo falla

        fabricObject = new fabric.Group(childrenObjects, {
            originX: 'center',
            originY: 'center'
        });

    } else {
        fabricObject = dibujarComponente(node);
    }

    if (fabricObject) {
        fabricObject.set({
            left: pos[0],
            top: pos[1],
            angle: rot,
            scaleX: scale[0],
            scaleY: scale[1],
            globalCompositeOperation: node.style?.blendMode || 'source-over'
        });
    }

    return fabricObject;
}

/**
 * Renderiza la escena completa en el canvas de Fabric.js.
 * @param {object} sceneData - El objeto JSON completo de la escena.
 */
function renderizarEscena(sceneData) {
    if (!fabricCanvas) {
        console.error("El canvas de Fabric.js no está inicializado.");
        return;
    }
    if (!sceneData || !sceneData.scene || !Array.isArray(sceneData.scene.children)) {
        showCustomAlert("El formato de datos de la escena es inválido.");
        return;
    }

    const { scene, definitions } = sceneData;

    // Limpiar el canvas
    fabricCanvas.clear();

    // Establecer color de fondo
    const backgroundColor = scene.config?.backgroundColor || 'transparent';
    fabricCanvas.setBackgroundColor(backgroundColor, fabricCanvas.renderAll.bind(fabricCanvas));

    // Crear todos los objetos de la escena
    const sceneObjects = scene.children
        .sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0))
        .map(node => renderizarNodo(node, definitions || {}))
        .filter(obj => obj !== null);

    // Crear un grupo principal con todos los objetos para centrar y escalar
    const mainGroup = new fabric.Group(sceneObjects, {
        originX: 'center',
        originY: 'center'
    });
    
    if (mainGroup.width === 0 || mainGroup.height === 0) {
        console.warn("El grupo principal no tiene dimensiones. Renderizando en el centro sin escalar.");
        mainGroup.set({
            left: fabricCanvas.width / 2,
            top: fabricCanvas.height / 2,
        });
    } else {
        // Escalar el grupo para que quepa en el canvas con un margen
        const scaleFactor = Math.min(
            (fabricCanvas.width * 0.9) / mainGroup.getScaledWidth(),
            (fabricCanvas.height * 0.9) / mainGroup.getScaledHeight()
        );
        mainGroup.scale(scaleFactor);
        
        // Centrar el grupo en el canvas
        mainGroup.set({
            left: fabricCanvas.width / 2,
            top: fabricCanvas.height / 2
        });
    }

    fabricCanvas.add(mainGroup);
    fabricCanvas.renderAll();
}
// =================================================================
// FIN: MÓDULO 4 REFACTORIZADO
// =================================================================


// -----------------------------------------------------------------
// MÓDULO 5: GESTIÓN DE DATOS Y GUARDADO
// -----------------------------------------------------------------

function handleSaveCurrentCanvas() {
    if (!fabricCanvas || !lastGeneratedSceneData) return;
    
    // toDataURL funciona igual con el canvas de Fabric.js
    const imageDataUrl = fabricCanvas.toDataURL({ format: 'png' });
    
    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined') {
            throw new Error("La función 'agregarPersonajeDesdeDatos' no está disponible.");
        }
        
        agregarPersonajeDesdeDatos({
            nombre: lastGeneratedSceneData.nombre,
            descripcion: lastGeneratedSceneData.descripcion,
            imagen: imageDataUrl,
            etiqueta: lastGeneratedSceneData.etiqueta,
            arco: lastGeneratedSceneData.arco || 'sin_arco'
        });
        showCustomAlert(`Elemento guardado como "${lastGeneratedSceneData.nombre}" en Datos.`);

    } catch (error) {
        console.error("Error al guardar la generación:", error);
        showCustomAlert(`Error al guardar: ${error.message}`);
    }
}

function autoSaveData(sceneData) {
    if (!fabricCanvas) return;
    
    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined') {
            throw new Error("La función 'agregarPersonajeDesdeDatos' no está disponible.");
        }
        
        const imageDataUrl = fabricCanvas.toDataURL({ format: 'png' });
        
        agregarPersonajeDesdeDatos({
            nombre: sceneData.nombre,
            descripcion: sceneData.descripcion,
            imagen: imageDataUrl,
            etiqueta: sceneData.etiqueta,
            arco: sceneData.arco || 'sin_arco'
        });
        showCustomAlert(`Modelo "${sceneData.nombre}" generado y guardado automáticamente.`);

        lastGeneratedSceneData = sceneData;

    } catch(error) {
        console.error("Error en el guardado automático:", error);
        showCustomAlert(`Error en guardado automático: ${error.message}`);
    }
}

// -----------------------------------------------------------------
// MÓDULO 6: LÓGICA DE GENERACIÓN PRINCIPAL (2 PASOS - AVANZADO)
// -----------------------------------------------------------------

function createConceptualPrompt(userPrompt) {
    return `
        Eres un director de arte y arquitecto de elementos reales usando como erramienta CSS. 
        Tu trabajo es desglosar una idea visual en una estructura jerárquica (un "scene graph") para representar lo que
        se te pida en el prompt sin fondo o con fondo transparente.

        PROMPT DEL USUARIO: "${userPrompt}"

        INSTRUCCIONES:
        1.  Define metadatos globales: "nombre", "descripcion", "etiqueta" (elige una:   { emoji: '⦾', valor: 'indeterminado', titulo: 'Indeterminado' },
    { emoji: '🧍', valor: 'personaje', titulo: 'Personaje' },
    { emoji: '🗺️', valor: 'ubicacion', titulo: 'Ubicación' },
    { emoji: '🗓️', valor: 'evento', titulo: 'Evento' },
    { emoji: '🛠️', valor: 'objeto', titulo: 'Objeto' },
    { emoji: '👕', valor: 'atuendo', titulo: 'Atuendo' },
     { emoji: '🏡', valor: 'edificio', titulo: 'Edificio' },
    { emoji: '🚗', valor: 'transporte', titulo: 'Transporte' },
    { emoji: '🐾', valor: 'animal', titulo: 'Animal' },
     { emoji: '🌱', valor: 'planta', titulo: 'Planta' },
      { emoji: '🦠', valor: 'ser_vivo', titulo: 'Ser Vivo' },
    { emoji: '🏞️', valor: 'elemento_geográfico', titulo: 'Elemento Geográfico' },
    { emoji: '💭', valor: 'concepto', titulo: 'Concepto' },
    { emoji: '�', valor: 'nota', titulo: 'Nota' },
    { emoji: '👁️‍🗨️', valor: 'visual', titulo: 'Visual' } ), 
     
    y "arco" (elige uno:  
    { emoji: '🎮', valor: 'videojuego', titulo: 'Videojuego' },
    { emoji: '🎬', valor: 'planteamiento', titulo: 'Planteamiento' },
    { emoji: '👁️', valor: 'visuales', titulo: 'Visuales' }).
        2.  Piensa en componentes reutilizables. Si hay elementos que se repiten (ej: una rueda, una espada), defínelos en la sección "definitions". 
        Cada definición tiene un nombre clave (ej: "katana_base").
        3.  Diseña la "scene" principal. Esta contiene una lista de "children" (nodos raíz).
        4.  Estructura la escena para representar la entidad, objetos etc... usando nodos de tipo "group" para agrupar elementos lógicos (ej: "cabeza_grupo", "brazo_derecho"). Los grupos pueden contener otros grupos.
        5.  Dentro de los grupos, describe los nodos de formas ("círculo", "rectángulo", "poligono").
        6.  Para cada nodo, escribe una "descripcion" detallada de su apariencia, material, textura y su POSICIÓN RELATIVA a su padre o a otros elementos. Ej: "La guarda de la katana se sitúa en la base de la hoja".
        7.  **IMPORTANTE**: Si detectas que estás creando un personaje antropomórfico, utiliza una estructura corporal básica como punto de partida. 
        Define nodos para "cabeza", "cuello",  "pecho", "barriga_abdomen", "cadera_cintura",   "brazo izquierdo", "brazo derecho", "antebrazo izquierdo", "antebrazo derecho", 
        "muñeca izquierdo", "muñeca derecho", "mano izquierdo", "mano derecho", "muslo izquierdo", "muslo derecho", "tobillo izquierdo", "tobillo derecho", "pie izquierdo", "pie derecho".
        Para la "cabeza", incluye sub-componentes para los rasgos faciales: "pelo", "ceja izquierda", "ceja derecha", "ojo izquierdo", "ojo derecho", "nariz", "labios o boca", y si aplica, "pelo facial o maquillaje".
        Luego, construye sobre esta base la ropa, los accesorios, los detalles y realiza los ajustes de posición, 
        tamaño y proporción necesarios para respetar la anatomía básica.

        RESPONDE ÚNICAMENTE con un objeto JSON. NO uses coordenadas numéricas, solo descripciones textuales de la posición.

        EJEMPLO de la estructura que debes generar:
        {
          "nombre": "Samurái Conceptual",
          "descripcion": "Plan conceptual de un samurái...",
          "etiqueta": "🧍 Personaje",
          "arco": "Leyendas del Acero",
          "definitions": {
            "katana_completa": {
              "type": "group",
              "descripcion": "Una katana japonesa completa, con hoja y guarda.",
              "children": [
                { "type": "rectángulo", "id": "hoja", "descripcion": "Hoja larga y curvada, de acero brillante." },
                { "type": "rectángulo", "id": "guarda", "descripcion": "Guarda circular en la base de la hoja." }
              ]
            }
          },
          "scene": {
            "children": [
              {
                "type": "group", "id": "cuerpo_samurai",
                "descripcion": "El cuerpo principal del samurái.",
                "children": [
                  {
                    "type": "group", "id": "cabeza", "descripcion": "La cabeza del samurái, con casco y rasgos visibles.",
                    "children": [
                      { "type": "poligono", "id": "casco", "descripcion": "Un casco de samurái tradicional que cubre la parte superior y los lados de la cabeza." },
                      { "type": "poligono", "id": "pelo", "descripcion": "Pelo negro recogido, asomando por debajo del casco." },
                      { "type": "rectángulo", "id": "ceja_izquierda", "descripcion": "Ceja izquierda, fina y arqueada, con expresión seria." },
                      { "type": "rectángulo", "id": "ceja_derecha", "descripcion": "Ceja derecha, fina y arqueada, con expresión seria." },
                      { "type": "círculo", "id": "ojo_izquierdo", "descripcion": "Ojo izquierdo, de mirada penetrante." },
                      { "type": "círculo", "id": "ojo_derecho", "descripcion": "Ojo derecho, de mirada penetrante." },
                      { "type": "poligono", "id": "nariz", "descripcion": "Nariz recta y definida." },
                      { "type": "poligono", "id": "boca", "descripcion": "Boca cerrada en una línea fina y determinada." },
                      { "type": "poligono", "id": "bigote", "descripcion": "Un bigote fino y cuidado sobre el labio superior." },
                      { "type": "poligono", "id": "barba_perilla", "descripcion": "Una pequeña barba en la barbilla." }
                    ]
                  },
                  { "type": "poligono", "id": "torso", "descripcion": "El torso, cubierto con una armadura roja." }
                ]
              },
              {
                "ref": "katana_completa", "id": "katana_en_mano",
                "descripcion": "Una instancia de la katana, sostenida en la mano derecha del samurái, en ángulo."
              }
            ]
          }
        }
    `;
}

function createGeometricPrompt(conceptualJsonString) {
    return `
        Eres un artista técnico experto en motores de renderizado 2D. Tu tarea es convertir un plan de escena en un objeto JSON renderizable con coordenadas y estilos precisos.

        PLAN COMPLETO DE LA ESCENA (en JSON):
        ${conceptualJsonString}

        INSTRUCCIONES:
        0. ESTAS CONSTRUYENDO UN SOLO OBJETO/ENTIDAD/CONCEPTO VISUAL ETC 
        ASI QUE TODAS LAS PARTES QUE VAS A CREAR ESTAN  UNIDAS COHERENTEMENTE lado con lado 
        PARA QUE SEAN UNA UNICA ENTIDAD SIN FONDO NI ESCENARIO NI ELEMENTOS EXTRAS.
        1.  Traduce TODAS las descripciones de posición a datos numéricos concretos dentro de un objeto "transform":
            - "posición": [x, y] (coordenadas del centro del objeto relativas a su padre).
            - "rotación": ángulo en grados.
            - "escala": [x, y] (ej: [1, 1] es normal, [2, 1] es el doble de ancho).
        2.  Asigna un "type" geométrico a cada nodo de forma: "círculo", "rectángulo", o "poligono".
        3.  Define el "tamaño" para círculos y rectángulos, y una lista de "puntos" para polígonos (relativos al centro del polígono).
        4.  Crea un objeto "style" detallado para cada forma:
            - "zIndex": ¡ESENCIAL! Controla el apilamiento. Números más altos van delante.
            - "fill": Define el relleno. Tipos: "solido", "degradado_lineal", "radialGradient".
            - "stroke": Define el borde { "color": "#...", "width": num }.
            - "effects": Un array para efectos. Por ahora, soporta { "type": "dropShadow", "color": "rgba(...)", "blur": num, "offsetX": num, "offsetY": num }.
            - "blendMode": (opcional) Modos como "overlay", "multiply", etc.
        5.  Mantén la estructura jerárquica, las definiciones ("definitions") y las referencias ("ref") del plan original.
        Los componentes internos deben posicionarse siempre de forma RELATIVA a su grupo padre. ¡Esto es CRÍTICO para que el cuerpo esté conectado! Por ejemplo, para unir una 'cabeza' sobre un 'cuello', y el 'cuello' sobre un 'torso':
        - Si el 'torso' es un rectángulo de alto 100, su centro está en [0,0] y su borde superior en [0, -50] (porque el origen está en el centro).
        - Si el 'cuello' es un rectángulo de alto 20, su centro está en [0,0] y su borde inferior en [0, 10].
        - Para que el cuello se asiente sobre el torso, la 'posición' del grupo del cuello debe ser [0, -60] (posición del borde superior del torso + mitad de la altura del cuello = -50 + (-10)).
        - Del mismo modo, para poner la cabeza sobre el cuello, debes calcular su posición para que sus bordes se toquen.
        ¡DEBES realizar este tipo de cálculo para TODAS las conexiones anatómicas! No dejes espacios vacíos entre cabeza, cuello, torso, brazos y piernas. Trata el modelo como un objeto físico y sólido donde las partes se tocan y encajan perfectamente.
        6.  El canvas de destino es de 512x512. Distribuye la escena de forma centrada y equilibrada. Sin fondo o con fondo transparente.
        7. Asegurate de que todos los componentes estan unidos entre si FORMAN UNA UNICA ENTIDAD.
        RESPONDE ÚNICAMENTE con el objeto JSON final y completo, versión "2.0.0".

        EJEMPLO DETALLADO DE ALTA CALIDAD (para un "samurái"):
        {
          "version": "2.0.0",
          "nombre": "Samurái Ancestral Dinámico",
          "descripcion": "Una representación gráfica avanzada...",
          "etiqueta": "🧍 Personaje",
          "arco": "Base",
          "definitions": {
            "katana": {
              "type": "group",
              "children": [
                { "id": "katana_hoja", "type": "rectángulo", "transform": { "posición": [0, -100] }, "tamaño": { "ancho": 10, "alto": 200 }, "style": { "fill": { "type": "degradado_lineal", "colores": ["#ffffff", "#b0c4de"], "inicio": {"x": -5, "y": 0}, "fin": {"x": 5, "y": 0} } } },
                { "id": "katana_guarda", "type": "rectángulo", "transform": { "posición": [0, 5] }, "tamaño": { "ancho": 25, "alto": 15 }, "style": { "fill": { "type": "solido", "color": "#3b3b3b" } } }
              ]
            }
          },
          "scene": {
            "config": { "backgroundColor": "transparent" },
            "children": [
              {
                "id": "cuerpo_grupo", "type": "group", "transform": { "posición": [256, 280] },
                "children": [
                  { 
                    "id": "cabeza", "type": "group", "transform": { "posición": [0, -60] }, 
                    "children": [
                      { "id": "forma_cabeza", "type": "círculo", "tamaño": { "radio": 35 }, "style": { "fill": { "type": "solido", "color": "#ffdbac" }, "zIndex": 4 } },
                      { "id": "ojo_izquierdo", "type": "círculo", "transform": { "posición": [-12, -5] }, "tamaño": { "radio": 3 }, "style": { "fill": { "type": "solido", "color": "#000000" }, "zIndex": 5 } },
                      { "id": "ojo_derecho", "type": "círculo", "transform": { "posición": [12, -5] }, "tamaño": { "radio": 3 }, "style": { "fill": { "type": "solido", "color": "#000000" }, "zIndex": 5 } },
                      { "id": "boca", "type": "poligono", "transform": { "posición": [0, 15] }, "puntos": [{"x": -10, "y": 0}, {"x": 10, "y": 0}, {"x": 8, "y": 2}, {"x": -8, "y": 2}], "style": { "fill": { "type": "solido", "color": "#8b4513" }, "zIndex": 5 } }
                    ],
                    "style": { "effects": [{ "type": "dropShadow", "color": "rgba(0,0,0,0.4)", "blur": 10, "offsetY": 5 }] }
                  },
                  { "id": "torso", "type": "poligono", "puntos": [{"x": -50, "y": 0}, {"x": 50, "y": 0}, {"x": 40, "y": 100}, {"x": -40, "y": 100}], "style": { "fill": { "type": "radialGradient", "colores": ["#a52a2a", "#8B0000"], "centro_inicio": {"x": 0, "y": 40}, "radio_inicio": 10, "centro_fin": {"x": 0, "y": 50}, "radio_fin": 100 }, "zIndex": 2 } }
                ]
              },
              { "id": "katana_en_mano", "ref": "katana", "transform": { "posición": [300, 250], "rotación": -70, "escala": [1, 1] }, "style": { "zIndex": 5 } }
            ]
          }
        }
    `;
}

async function handleGeneration() {
    const userPrompt = DOM.promptInput.value.trim();
    if (!userPrompt) {
        showCustomAlert("Por favor, describe la escena que quieres crear.");
        return;
    }

    lastGeneratedSceneData = null;
    actualizarUI(true, 'Paso 1/2: Diseñando el plan de la escena...');

    try {
        const conceptualPrompt = createConceptualPrompt(userPrompt);
        const conceptualData = await callApi(conceptualPrompt);

        actualizarUI(true, 'Paso 2/2: Construyendo la geometría y los estilos...');
        await delay(100);

        const geometricPrompt = createGeometricPrompt(JSON.stringify(conceptualData, null, 2));
        const finalSceneData = await callApi(geometricPrompt);

        if (!finalSceneData || finalSceneData.version !== "2.0.0") {
            throw new Error("La respuesta del paso 2 no generó un JSON v2.0.0 válido.");
        }
        
        actualizarUI(true, 'Renderizando la escena final...');
        await delay(100);

        // La llamada a renderizarEscena ahora usa Fabric.js
        renderizarEscena(finalSceneData);
        autoSaveData(finalSceneData);
        
        actualizarUI(false, '¡Generación completada y guardada!');

    } catch (error) {
        console.error("Error en el proceso de generación principal:", error);
        actualizarUI(false, `Error: ${error.message}`);
        lastGeneratedSceneData = null;
    }
}

// -----------------------------------------------------------------
// MÓDULO 7: FUNCIONALIDAD DE IMPORTACIÓN DE JSON (AVANZADO)
// -----------------------------------------------------------------

function handleJsonFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (DOM.jsonInputArea) DOM.jsonInputArea.value = e.target.result;
    };
    reader.readAsText(file);
}

function handleProcessJsonInput() {
    if (!DOM.jsonInputArea) return;
    const jsonText = DOM.jsonInputArea.value;
    if (!jsonText.trim()) {
        showCustomAlert('El área de texto JSON está vacía.');
        return;
    }

    try {
        const data = JSON.parse(jsonText);
        const items = Array.isArray(data) ? data : [data];
        let itemsAdded = 0;
        let errors = [];

        items.forEach(sceneData => {
            if (sceneData.version !== "2.0.0" || !sceneData.nombre || !sceneData.scene?.children) {
                errors.push(sceneData.nombre || 'un objeto sin nombre');
                return;
            }

            // La llamada a renderizarEscena ahora usa Fabric.js
            renderizarEscena(sceneData);
            autoSaveData(sceneData);
            itemsAdded++;
        });

        if (itemsAdded > 0) {
            showCustomAlert(`¡${itemsAdded} escenas importadas y guardadas correctamente!`);
        }
        if (errors.length > 0) {
             showCustomAlert(`Error: ${errors.length} objeto(s) no tenían un formato válido y fueron omitidos: ${errors.join(', ')}`);
        }

        if (itemsAdded > 0 || errors.length > 0) {
            DOM.jsonInputArea.value = '';
            actualizarUI(false, `Proceso de importación finalizado.`);
        } else if (itemsAdded === 0 && errors.length === 0) {
            showCustomAlert('No se encontró ningún objeto para procesar en el JSON.');
        }

    } catch (error) {
        console.error('Error al procesar JSON:', error);
        actualizarUI(false, `Error al procesar el JSON: ${error.message}`);
        lastGeneratedSceneData = null;
    }
}

// -----------------------------------------------------------------
// MÓDULO 8: FUNCIÓN DE AYUDA PARA GENERACIÓN EXTERNA
// -----------------------------------------------------------------

/**
 * Genera una imagen a partir de un prompt y devuelve su Data URL sin afectar la UI principal.
 * Esta función es llamada desde otros módulos como el editor de datos.
 * @param {string} userPrompt - El prompt para generar la imagen.
 * @returns {Promise<string>} La URL de datos (Base64) de la imagen generada.
 */
async function generarImagenDesdePrompt(userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    console.log(`[Generador Externo] Iniciando generación para: "${userPrompt}"`);

    // 1. Reutilizar la lógica de generación en dos pasos
    const conceptualPrompt = createConceptualPrompt(userPrompt);
    const conceptualData = await callApi(conceptualPrompt);

    const geometricPrompt = createGeometricPrompt(JSON.stringify(conceptualData, null, 2));
    const finalSceneData = await callApi(geometricPrompt);

    if (!finalSceneData || finalSceneData.version !== "2.0.0") {
        throw new Error("La respuesta de la IA no generó un JSON v2.0.0 válido.");
    }

    // 2. Crear un canvas estático temporal de Fabric.js para renderizar fuera de pantalla.
    //    Es más eficiente que un canvas interactivo completo.
    const staticCanvas = new fabric.StaticCanvas(null, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
    
    // 3. Renderizar la escena en el canvas temporal
    //    (Se adapta la función `renderizarEscena` para que acepte un canvas como argumento)
    
    // Función de renderizado adaptada para canvas estático
    function renderizarEscenaEstatica(sceneData, canvas) {
        const { scene, definitions } = sceneData;
        canvas.clear();
        const backgroundColor = scene.config?.backgroundColor || 'transparent';
        canvas.setBackgroundColor(backgroundColor, canvas.renderAll.bind(canvas));

        const sceneObjects = scene.children
            .sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0))
            .map(node => renderizarNodo(node, definitions || {}))
            .filter(obj => obj !== null);

        const mainGroup = new fabric.Group(sceneObjects, { originX: 'center', originY: 'center' });
        
        if (mainGroup.width > 0 && mainGroup.height > 0) {
            const scaleFactor = Math.min(
                (canvas.width * 0.9) / mainGroup.getScaledWidth(),
                (canvas.height * 0.9) / mainGroup.getScaledHeight()
            );
            mainGroup.scale(scaleFactor);
        }
        
        mainGroup.set({ left: canvas.width / 2, top: canvas.height / 2 });
        canvas.add(mainGroup);
        canvas.renderAll();
    }

    renderizarEscenaEstatica(finalSceneData, staticCanvas);
    
    console.log("[Generador Externo] Generación completada. Devolviendo Data URL.");
    // 4. Devolver la imagen como una cadena Base64
    return staticCanvas.toDataURL({ format: 'png' });
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);