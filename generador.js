// =================================================================
// ARCHIVO REFACTORIZADO: generador.js (Versión 4 - Arquitectura Jerárquica)
// =================================================================
// OBJETIVOS DE ESTA VERSIÓN:
// 1. FORMATO JSON AVANZADO (v2.0):
//    - Soporte para una estructura de escena jerárquica con grupos anidados.
//    - Reutilización de componentes mediante una sección de "definitions".
//    - Sistema de transformación (posición, rotación, escala).
//    - Estilos avanzados: degradados radiales, sombras, modos de fusión.
// 2. RENDERIZADOR RECURSIVO:
//    - Un nuevo motor de renderizado capaz de procesar el árbol de la escena.
// 3. PROMPTS DE IA MEJORADOS:
//    - Se ha instruido a la IA para que piense y genere en términos de esta nueva estructura avanzada.
// =================================================================

// -----------------------------------------------------------------
// MÓDULO 1: CONFIGURACIÓN Y UTILIDADES
// -----------------------------------------------------------------

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

// Almacena la última respuesta JSON completa para guardado o depuración.
let lastGeneratedSceneData = null;

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
    if (DOM.canvas) {
        DOM.canvas.width = CANVAS_WIDTH;
        DOM.canvas.height = CANVAS_HEIGHT;
    }
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

async function callApi(prompt, maxRetries = 3) {
    // NOTA: La clave de la API debe estar definida en el ámbito global donde se ejecuta este script.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7, // Ligeramente reducido para mayor consistencia en la estructura
            maxOutputTokens: 8192,
        }
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
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

            if (!rawText) throw new Error("La respuesta de la API no tiene el formato esperado.");
            return extractJson(rawText);

        } catch (error) {
            console.error(`Intento ${attempt} de llamada a la API fallido:`, error.message);
            if (attempt === maxRetries) throw error;
            await delay(1000 * attempt);
        }
    }
}

// -----------------------------------------------------------------
// MÓDULO 4: LÓGICA DE RENDERIZADO AVANZADO (CANVAS 2D)
// -----------------------------------------------------------------

/**
 * Dibuja un único componente (nodo de forma) en el canvas.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 * @param {object} node - El objeto del nodo de la escena a dibujar.
 */
function dibujarComponente(ctx, node) {
    const style = node.style || {};
    const fill = style.fill || {};
    const stroke = style.stroke || {};
    const effects = style.effects || [];

    // Aplicar estilos
    ctx.globalAlpha = style.opacity ?? 1;
    ctx.globalCompositeOperation = style.blendMode || 'source-over';
    ctx.strokeStyle = stroke.color || 'transparent';
    ctx.lineWidth = stroke.width || 0;

    // Aplicar efectos (sombra)
    const shadow = effects.find(e => e.type === 'dropShadow');
    if (shadow) {
        ctx.shadowColor = shadow.color || 'rgba(0,0,0,0)';
        ctx.shadowBlur = shadow.blur || 0;
        ctx.shadowOffsetX = shadow.offsetX || 0;
        ctx.shadowOffsetY = shadow.offsetY || 0;
    }

    // Configuración de Relleno (Sólido, Degradados)
    if (fill.type === 'solido') {
        ctx.fillStyle = fill.color || 'transparent';
    } else if (fill.type === 'degradado_lineal' && Array.isArray(fill.colores)) {
        const grad = ctx.createLinearGradient(fill.inicio.x, fill.inicio.y, fill.fin.x, fill.fin.y);
        const step = 1 / (fill.colores.length - 1);
        fill.colores.forEach((color, index) => grad.addColorStop(index * step, color));
        ctx.fillStyle = grad;
    } else if (fill.type === 'radialGradient' && Array.isArray(fill.colores)) {
        const grad = ctx.createRadialGradient(fill.centro_inicio.x, fill.centro_inicio.y, fill.radio_inicio, fill.centro_fin.x, fill.centro_fin.y, fill.radio_fin);
        const step = 1 / (fill.colores.length - 1);
        fill.colores.forEach((color, index) => grad.addColorStop(index * step, color));
        ctx.fillStyle = grad;
    } else {
        ctx.fillStyle = 'transparent';
    }

    // Dibujo de la Forma
    ctx.beginPath();
    switch (node.type) {
        case 'rectángulo':
            if (node.tamaño?.ancho) ctx.rect(-node.tamaño.ancho / 2, -node.tamaño.alto / 2, node.tamaño.ancho, node.tamaño.alto);
            break;
        case 'círculo':
            if (node.tamaño?.radio) ctx.arc(0, 0, node.tamaño.radio, 0, 2 * Math.PI);
            break;
        case 'poligono':
            if (node.puntos?.length > 1) {
                ctx.moveTo(node.puntos[0].x, node.puntos[0].y);
                for (let i = 1; i < node.puntos.length; i++) ctx.lineTo(node.puntos[i].x, node.puntos[i].y);
                ctx.closePath();
            }
            break;
    }

    if (ctx.fillStyle !== 'transparent') ctx.fill();
    if (ctx.lineWidth > 0) ctx.stroke();
}

/**
 * Función recursiva que procesa y dibuja cada nodo de la escena.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 * @param {object} node - El nodo actual (puede ser un grupo o una forma).
 * @param {object} definitions - El objeto de definiciones para resolver referencias.
 */
function renderizarNodo(ctx, node, definitions) {
    if (!node) return;

    // Si el nodo es una referencia, busca la definición y úsala.
    if (node.ref) {
        const definition = definitions[node.ref];
        if (!definition) {
            console.warn(`Definición no encontrada para la referencia: "${node.ref}"`);
            return;
        }
        // Combina la transformación de la referencia con la del nodo definido
        node = { ...definition, transform: { ...definition.transform, ...node.transform } };
    }

    ctx.save();

    // Aplicar transformaciones del nodo
    const transform = node.transform || {};
    const pos = transform.posición || [0, 0];
    const rot = transform.rotación || 0;
    const scale = transform.escala || [1, 1];
    
    ctx.translate(pos[0], pos[1]);
    ctx.rotate(rot * Math.PI / 180);
    ctx.scale(scale[0], scale[1]);

    // Si es un grupo, renderiza a sus hijos recursivamente
    if (node.type === 'group' && Array.isArray(node.children)) {
        // Ordena los hijos por zIndex antes de dibujarlos
        const sortedChildren = [...node.children].sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0));
        for (const child of sortedChildren) {
            renderizarNodo(ctx, child, definitions);
        }
    } else {
        // Si es una forma, la dibuja
        dibujarComponente(ctx, node);
    }

    ctx.restore();
}

/**
/**
 * Renderiza la escena completa, calculando límites y centrando/escalando el dibujo para que ocupe el máximo espacio posible.
 * @param {object} sceneData - El objeto JSON completo de la escena.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 */
function renderizarEscena(sceneData, ctx) {
    if (!sceneData || !sceneData.scene || !Array.isArray(sceneData.scene.children)) {
        showCustomAlert("El formato de datos de la escena es inválido.");
        return;
    }
    
    const { scene, definitions } = sceneData;

    // --- Parte 1: Calcular límites (Bounding Box) de todas las formas ---
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    // Función auxiliar recursiva para encontrar los límites de todas las formas.
    // Esta función SI considera la jerarquía y las transformaciones de los grupos.
    function findBounds(node, parentTransform) {
        if (!node) return;

        let currentNode = node;
        if (currentNode.ref) {
            const definition = (definitions || {})[currentNode.ref];
            if (!definition) return;
            // Combina las transformaciones de la definición y la instancia
            currentNode = { ...definition, transform: { ...definition.transform, ...currentNode.transform } };
        }

        const t = currentNode.transform || {};
        const pos = t.posición || [0, 0];
        const rot = (t.rotación || 0) * Math.PI / 180;
        const scale = t.escala || [1, 1];
        
        // Acumulamos la transformación del padre para obtener la del mundo
        const currentTransform = parentTransform.translate(pos[0], pos[1]).rotate(rot * 180 / Math.PI).scale(scale[0], scale[1]);

        if (currentNode.type === 'group' && Array.isArray(currentNode.children)) {
            currentNode.children.forEach(child => findBounds(child, currentTransform));
        } else {
            // Es una forma, calculamos sus puntos en el espacio del mundo
            const shapePoints = [];
            const tamaño = currentNode.tamaño || {};
            
            switch (currentNode.type) {
                case 'rectángulo':
                    const w = (tamaño.ancho || 0) / 2;
                    const h = (tamaño.alto || 0) / 2;
                    shapePoints.push({x: -w, y: -h}, {x: w, y: -h}, {x: w, y: h}, {x: -w, y: h});
                    break;
                case 'círculo':
                    const r = tamaño.radio || 0;
                    // Aproximamos el círculo para el bounding box
                    shapePoints.push({x: r, y: 0}, {x: -r, y: 0}, {x: 0, y: r}, {x: 0, y: -r});
                    break;
                case 'poligono':
                    shapePoints.push(...(currentNode.puntos || []));
                    break;
            }
            
            // Transformamos cada punto de la forma al espacio del mundo y actualizamos los límites
            shapePoints.forEach(p => {
                const worldPoint = currentTransform.transformPoint(new DOMPoint(p.x, p.y));
                minX = Math.min(minX, worldPoint.x);
                maxX = Math.max(maxX, worldPoint.x);
                minY = Math.min(minY, worldPoint.y);
                maxY = Math.max(maxY, worldPoint.y);
            });
        }
    }
    
    // Empezamos la búsqueda recursiva desde la raíz de la escena.
    scene.children.forEach(node => findBounds(node, new DOMMatrix()));

    // --- Parte 2: Calcular escala y offset para centrar y alinear ---
    const backgroundColor = scene.config?.backgroundColor || '#FFFFFF';
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Si no se encontraron formas válidas, no continuamos.
    if (minX === Infinity) {
        console.warn("No se encontraron formas con tamaño para calcular los límites de la escena.");
        // Aun así, dibujamos los nodos por si hay algo sin tamaño definido
        const sortedChildren = [...scene.children].sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0));
        for (const node of sortedChildren) {
            renderizarNodo(ctx, node, definitions || {});
        }
        return;
    }
    
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    
    // Dejar un margen del 10% (multiplicar por 0.9)
    const scale = Math.min(ctx.canvas.width / drawingWidth, ctx.canvas.height / drawingHeight) * 0.9;
    
    // Offset para centrar horizontalmente
    const offsetX = (ctx.canvas.width - drawingWidth * scale) / 2;

    // Offset para alinear al fondo verticalmente (con un pequeño margen del 5%)
    const offsetY = (ctx.canvas.height - drawingHeight * scale) - (ctx.canvas.height * 0.05);

    // --- Parte 3: Dibujar la escena con la nueva transformación ---
    ctx.save();
    // Aplicamos la transformación global
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    // Movemos el origen del canvas al (minX, minY) del dibujo antes de escalarlo
    ctx.translate(-minX, -minY);

    // Usamos el renderizador de nodos original. Él seguirá dibujando en las coordenadas
    // que dice el JSON, pero todo el canvas está ahora transformado, escalando y posicionando el resultado.
    const sortedChildren = [...scene.children].sort((a, b) => (a.style?.zIndex || 0) - (b.style?.zIndex || 0));
    for (const node of sortedChildren) {
        renderizarNodo(ctx, node, definitions || {});
    }
    
    ctx.restore();
}

// -----------------------------------------------------------------
// MÓDULO 5: GESTIÓN DE DATOS Y GUARDADO
// -----------------------------------------------------------------

function handleSaveCurrentCanvas() {
    if (!DOM.canvas || !lastGeneratedSceneData) return;
    
    const imageDataUrl = DOM.canvas.toDataURL('image/png');
    
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
    if (!DOM.canvas) return;
    
    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined') {
            throw new Error("La función 'agregarPersonajeDesdeDatos' no está disponible.");
        }
        
        const imageDataUrl = DOM.canvas.toDataURL('image/png');
        
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
        Eres un director de arte y arquitecto de escenas digitales. Tu trabajo es desglosar una idea visual en una estructura jerárqu'ca (un "scene graph") para representar lo que
        se te pida en el prompt sin fondo o con fondo transparente ya que lo que vas a generar se usará en todos los medios digitales multimedia disponibles (como 2D, 3D, VR, AR, libros, animacion, videojuegos etc...).

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
    { emoji: '📝', valor: 'nota', titulo: 'Nota' },
    { emoji: '👁️‍🗨️', valor: 'visual', titulo: 'Visual' } ), y "arco" (elige uno:   { emoji: '⚪', valor: 'sin_arco', titulo: 'Base' },
    { emoji: 'Ⅰ', valor: '1º', titulo: 'Primero' },
    { emoji: 'ⅠⅠ', valor: '2º', titulo: 'Segundo' },
    { emoji: 'ⅠⅠⅠ', valor: '3º', titulo: 'Tercero' },
    { emoji: '🎮', valor: 'videojuego', titulo: 'Videojuego' },
    { emoji: '🎬', valor: 'planteamiento', titulo: 'Planteamiento' },
    { emoji: '👁️', valor: 'visuales', titulo: 'Visuales' },
    { emoji: '✒️', valor: 'personalizar', titulo: 'Personalizar' }).
        2.  Piensa en componentes reutilizables. Si hay elementos que se repiten (ej: una rueda, una espada), defínelos en la sección "definitions". Cada definición tiene un nombre clave (ej: "katana_base").
        3.  Diseña la "scene" principal. Esta contiene una lista de "children" (nodos raíz).
        4.  Estructura la escena usando nodos de tipo "group" para agrupar elementos lógicos (ej: "cabeza_grupo", "brazo_derecho"). Los grupos pueden contener otros grupos.
        5.  Dentro de los grupos, describe los nodos de formas ("círculo", "rectángulo", "poligono").
        6.  Para cada nodo, escribe una "descripcion" detallada de su apariencia, material, textura y su POSICIÓN RELATIVA a su padre o a otros elementos. Ej: "La guarda de la katana se sitúa en la base de la hoja".
        7.  **IMPORTANTE**: Si detectas que estás creando un personaje antropomórfico, utiliza una estructura corporal básica como punto de partida. 
        Define nodos para "cabeza", "cuello",  "pecho", "cadera_cintura", "brazo izquierdo", "brazo derecho", "antebrazo izquierdo", "antebrazo derecho", 
        "mano izquierdo", "mano derecho", "muslo izquierdo", "muslo derecho", "pie izquierdo", "pie derecho".
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
        Eres un artista técnico experto en motores de renderizado 2D. Tu tarea es convertir un plan de escena conceptual en un objeto JSON renderizable con coordenadas y estilos precisos.

        PLAN CONCEPTUAL (en JSON):
        ${conceptualJsonString}

        INSTRUCCIONES:
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
        Los componentes internos deben posicionarse siempre de forma RELATIVA a su grupo padre, no al canvas. 
        Un "ojo" con posición [0, 0] se centrará en su grupo "cabeza", no en el centro del canvas. 
        Construye el modelo desde su centro hacia afuera, pieza por pieza, como si ensamblaras un rompecabezas.
        Los componentes como ropas, armas o accesorios deben tener una posición relativa a su grupo padre, no al canvas. 
        La Ropa de un personaje debe estar centrada en su torso, no en el canvas. La espada debe estar centrada en la mano del personaje, no en el canvas.
         El pelo debe estar centrado en la cabeza del personaje, y los sombreros o accesorios de la cabeza deben estar centrados en la cabeza del personaje.
        6.  El canvas de destino es de 512x512. Distribuye la escena de forma centrada y equilibrada. Sin fondo o con fondo transparente.

        RESPONDE ÚNICAMENTE con el objeto JSON final y completo, versión "2.0.0".

        EJEMPLO DETALLADO DE ALTA CALIDAD (para un "samurái"):
        {
          "version": "2.0.0",
          "nombre": "Samurái Ancestral Dinámico",
          "descripcion": "Una representación gráfica avanzada...",
          "etiqueta": "🧍 Personaje",
          "arco": "Leyendas del Acero",
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

    const ctx = DOM.canvas.getContext('2d');
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

        renderizarEscena(finalSceneData, ctx);
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

// Reemplaza la función original en tu archivo generador.js con esta versión corregida.
function handleProcessJsonInput() {
    if (!DOM.jsonInputArea) return;
    const jsonText = DOM.jsonInputArea.value;
    if (!jsonText.trim()) {
        showCustomAlert('El área de texto JSON está vacía.');
        return;
    }

    try {
        const data = JSON.parse(jsonText);
        // Aseguramos que siempre trabajamos con un array de objetos
        const items = Array.isArray(data) ? data : [data];
        let itemsAdded = 0;
        let errors = [];

        // Iteramos sobre cada objeto en el array
        items.forEach(sceneData => {
            // La validación ahora se hace para CADA objeto individualmente
            if (sceneData.version !== "2.0.0" || !sceneData.nombre || !sceneData.scene?.children) {
                errors.push(sceneData.nombre || 'un objeto sin nombre');
                return; // Si uno es inválido, lo saltamos y continuamos con el siguiente
            }

            // RENDERIZADO Y GUARDADO (esta parte no cambia)
            const ctx = DOM.canvas.getContext('2d');
            renderizarEscena(sceneData, ctx);
            autoSaveData(sceneData); // Reutilizamos la función de autoguardado
            itemsAdded++;
        });

        // Informamos al usuario del resultado
        if (itemsAdded > 0) {
            showCustomAlert(`¡${itemsAdded} escenas importadas y guardadas correctamente!`);
        }

        if (errors.length > 0) {
             showCustomAlert(`Error: ${errors.length} objeto(s) no tenían un formato válido y fueron omitidos: ${errors.join(', ')}`);
        }

        // Limpiamos el área de texto si se procesó algo
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

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);
