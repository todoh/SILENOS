// =================================================================
// ARCHIVO REFACTORIZADO: generador.js (Versión 3 - Plan y Ejecución)
// =================================================================
// OBJETIVOS DE LA REFACTORIZACIÓN:
// 1. GENERACIÓN EN DOS PASOS (NUEVA LÓGICA):
//    - PASO 1: Descomposición conceptual. Define qué componentes existen y cómo deben ensamblarse.
//    - PASO 2: Ejecución geométrica. Traduce el plan en formas, posiciones y estilos visuales.
// 2. RENDERIZADO MEJORADO: Se añade soporte para degradados lineales.
// 3. ARQUITECTURA MODULAR: Lógica de API, Renderizado y Generación separada.
// 4. MANTENIBILIDAD: Código más limpio, comentado y fácil de extender.
// =================================================================

// -----------------------------------------------------------------
// MÓDULO 1: CONFIGURACIÓN Y UTILIDADES
// -----------------------------------------------------------------

const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

// Variable para almacenar la última respuesta geométrica para el guardado.
let lastGeometricData = null;

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
    if (DOM.saveButton) DOM.saveButton.style.display = !generando && lastGeometricData ? 'inline-block' : 'none';
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
    
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.8,
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
// MÓDULO 4: LÓGICA DE RENDERIZADO (CANVAS 2D)
// -----------------------------------------------------------------

/**
 * Dibuja un único componente en el canvas.
 * Ahora soporta colores sólidos y degradados lineales.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 * @param {object} comp - El objeto componente a dibujar.
 */
function dibujarComponente(ctx, comp) {
    if (!comp || !comp.forma || !comp.posición || !comp.estilo) return;
    ctx.save();

    const estilo = comp.estilo;
    const relleno = estilo.relleno || {};
    
    ctx.globalAlpha = estilo.opacidad ?? 1;
    ctx.strokeStyle = estilo.borde_color || 'transparent';
    ctx.lineWidth = estilo.borde_grosor || 0;

    // --- Configuración de Relleno (Sólido o Degradado) ---
    if (relleno.tipo === 'solido') {
        ctx.fillStyle = relleno.color || 'transparent';
    } else if (relleno.tipo === 'degradado_lineal' && Array.isArray(relleno.colores) && relleno.colores.length >= 2) {
        try {
            // Las coordenadas del degradado son relativas al centro de la forma, que ahora está en (0,0) por el translate
            const grad = ctx.createLinearGradient(relleno.inicio.x, relleno.inicio.y, relleno.fin.x, relleno.fin.y);
            const step = 1 / (relleno.colores.length - 1);
            relleno.colores.forEach((color, index) => {
                grad.addColorStop(index * step, color);
            });
            ctx.fillStyle = grad;
        } catch (e) {
            console.error("Error al crear el degradado. Usando color sólido por defecto.", e);
            ctx.fillStyle = relleno.colores[0] || 'transparent';
        }
    } else {
        ctx.fillStyle = 'transparent';
    }

    ctx.translate(comp.posición[0], comp.posición[1]);
    ctx.rotate((comp.rotación || 0) * Math.PI / 180);

    // --- Dibujo de la Forma ---
    ctx.beginPath();
    switch (comp.forma) {
        case 'rectángulo':
            if (comp.tamaño?.ancho) ctx.rect(-comp.tamaño.ancho / 2, -comp.tamaño.alto / 2, comp.tamaño.ancho, comp.tamaño.alto);
            break;
        case 'círculo':
            if (comp.tamaño?.radio) ctx.arc(0, 0, comp.tamaño.radio, 0, 2 * Math.PI);
            break;
        case 'poligono':
            if (comp.puntos?.length > 1) {
                ctx.moveTo(comp.puntos[0].x, comp.puntos[0].y);
                for (let i = 1; i < comp.puntos.length; i++) ctx.lineTo(comp.puntos[i].x, comp.puntos[i].y);
                ctx.closePath();
            }
            break;
    }

    if (ctx.fillStyle !== 'transparent') ctx.fill();
    if (ctx.lineWidth > 0) ctx.stroke();
    
    ctx.restore();
}


function renderizarEscena(componentes, ctx) {
    if (!Array.isArray(componentes) || componentes.length === 0) {
        showCustomAlert("No se recibieron componentes para dibujar.");
        return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    componentes.forEach(comp => {
        if (!comp?.posición) return;
        const pos = comp.posición;
        let cMinX, cMaxX, cMinY, cMaxY;
        const size = comp.tamaño || {};
        switch (comp.forma) {
            case 'rectángulo': cMinX = pos[0] - size.ancho / 2; cMaxX = pos[0] + size.ancho / 2; cMinY = pos[1] - size.alto / 2; cMaxY = pos[1] + size.alto / 2; break;
            case 'círculo': cMinX = pos[0] - size.radio; cMaxX = pos[0] + size.radio; cMinY = pos[1] - size.radio; cMaxY = pos[1] + size.radio; break;
            case 'poligono': const xs = comp.puntos.map(p => p.x); const ys = comp.puntos.map(p => p.y); cMinX = pos[0] + Math.min(...xs); cMaxX = pos[0] + Math.max(...xs); cMinY = pos[1] + Math.min(...ys); cMaxY = pos[1] + Math.max(...ys); break;
            default: return;
        }
        minX = Math.min(minX, cMinX); maxX = Math.max(maxX, cMaxX); minY = Math.min(minY, cMinY); maxY = Math.max(maxY, cMaxY);
    });
    if (minX === Infinity) { showCustomAlert("Los componentes no tenían formas válidas."); return; }
    const drawingWidth = maxX - minX;
    const drawingHeight = maxY - minY;
    const scale = Math.min(ctx.canvas.width / drawingWidth, ctx.canvas.height / drawingHeight) * 0.9;
    const offsetX = (ctx.canvas.width - drawingWidth * scale) / 2 - minX * scale;
    const offsetY = (ctx.canvas.height - drawingHeight * scale) / 2 - minY * scale;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    componentes.sort((a, b) => (a.estilo?.zIndex || 0) - (b.estilo?.zIndex || 0));
    componentes.forEach(comp => dibujarComponente(ctx, comp));
    ctx.restore();
}

// -----------------------------------------------------------------
// MÓDULO 5: GESTIÓN DE DATOS Y GUARDADO
// -----------------------------------------------------------------

async function handleSaveCurrentCanvas() {
    if (!DOM.canvas) return;
    
    const currentPrompt = DOM.promptInput.value;
    const imageDataUrl = DOM.canvas.toDataURL('image/png');
    
    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined' || typeof opcionesEtiqueta === 'undefined') {
            throw new Error("Las funciones para guardar en 'Datos' no están disponibles.");
        }
        
        const nombre = lastGeometricData?.nombre || "Sin Título";
        const etiqueta = lastGeometricData?.etiqueta || 'objeto';

        agregarPersonajeDesdeDatos({
            nombre: nombre,
            descripcion: `Copia guardada manualmente desde: "${currentPrompt}"`,
            imagen: imageDataUrl,
            etiqueta: etiqueta,
            arco: 'sin_arco'
        });
        showCustomAlert(`Elemento guardado como "${nombre}" en Datos.`);

    } catch (error) {
        console.error("Error al guardar la generación:", error);
        showCustomAlert(`Error al guardar: ${error.message}`);
    }
}

function autoSaveData(conceptualData, geometricData) {
    if (!DOM.canvas) return;
    
    try {
        if (typeof agregarPersonajeDesdeDatos === 'undefined') {
            throw new Error("La función 'agregarPersonajeDesdeDatos' no está disponible.");
        }
        
        const imageDataUrl = DOM.canvas.toDataURL('image/png');
        const nombre = conceptualData.nombre_modelo || "Modelo Generado";
        const etiqueta = conceptualData.etiqueta || "objeto";
        const descripcion = conceptualData.descripcion_general || `Generado desde: "${DOM.promptInput.value}"`;

        agregarPersonajeDesdeDatos({
            nombre: nombre,
            descripcion: descripcion,
            imagen: imageDataUrl,
            etiqueta: etiqueta,
            arco: 'sin_arco'
        });
        showCustomAlert(`Modelo "${nombre}" generado y guardado automáticamente.`);

        lastGeometricData = { ...geometricData, nombre: nombre, etiqueta: etiqueta };

    } catch(error) {
        console.error("Error en el guardado automático:", error);
        showCustomAlert(`Error en guardado automático: ${error.message}`);
    }
}

// -----------------------------------------------------------------
// MÓDULO 6: LÓGICA DE GENERACIÓN PRINCIPAL (2 PASOS)
// -----------------------------------------------------------------

/**
 * PASO 1: Crea el prompt para la descomposición conceptual.
 * @param {string} userPrompt - El prompt del usuario.
 * @returns {string} El prompt para el Paso 1.
 */
function createConceptualPrompt(userPrompt) {
    return `
        Eres un arquitecto de escenas. Tu trabajo es desglosar una idea visual en sus elementos constituyentes y crear un plan de construcción.

        PROMPT DEL USUARIO: "${userPrompt}"

        INSTRUCCIONES:
        1.  Define un "nombre_modelo" y una "etiqueta" para la escena general.
        2.  Escribe una "descripcion_general" de la escena.
        3.  Crea una "lista_componentes". Cada componente es un objeto con:
            - "nombre_componente": Un identificador único (ej: "casco", "placa_pecho", "hoja_katana").
            - "descripcion": Detalles sobre su apariencia, material y función.
        4.  Crea un "plan_ensamblaje": Un texto detallado que explique cómo se deben posicionar y superponer los componentes de la lista para construir la escena final. Describe las relaciones espaciales (ej: "El 'casco' se coloca sobre la 'cabeza'. La 'visera' se superpone al 'casco' en la parte frontal").

        RESPONDE ÚNICAMENTE con un objeto JSON con la siguiente estructura:
        {
          "nombre_modelo": "...",
          "etiqueta": "...",
          "descripcion_general": "...",
          "lista_componentes": [
            {
              "nombre_componente": "...",
              "descripcion": "..."
            }
          ],
          "plan_ensamblaje": "..."
        }
    `;
}

/**
 * PASO 2: Crea el prompt para la ejecución geométrica.
 * @param {string} conceptualJsonString - El JSON resultante del Paso 1.
 * @returns {string} El prompt para el Paso 2.
 */
function createGeometricPrompt(conceptualJsonString) {
    return `
        Eres un artista técnico y geómetra. Tu tarea es convertir un plan de ensamblaje y una lista de componentes en una estructura de datos visual y renderizable para un canvas 2D.

        PLAN DE CONSTRUCCIÓN (en JSON):
        ${conceptualJsonString}

        INSTRUCCIONES:
        1.  Lee el "plan_ensamblaje" y la "lista_componentes" para entender la estructura completa.
        2.  Para CADA componente de la "lista_componentes", crea uno o más objetos geométricos.
        3.  Asigna una forma geométrica a cada objeto: "círculo", "rectángulo", o "poligono" (para formas complejas como triángulos, hexágonos o formas orgánicas).
        4.  Define la "posición" [x, y], "rotación" y "tamaño" para cada forma, siguiendo el "plan_ensamblaje" para asegurar que todo encaje correctamente. El canvas es de 512x512.
        5.  Define el "estilo" para cada forma:
            - "zIndex": ¡Esencial! Úsalo para controlar la superposición según el "plan_ensamblaje".
            - "relleno": Puede ser de dos tipos:
                - Sólido: { "tipo": "solido", "color": "#RRGGBB" }
                - Degradado: { "tipo": "degradado_lineal", "colores": ["#...", "#..."], "inicio": {"x": val, "y": val}, "fin": {"x": val, "y": val} } (las coordenadas del degradado son relativas al centro de la forma).
            - "borde_color" y "borde_grosor" (opcional).

        RESPONDE ÚNICAMENTE con el objeto JSON final que contenga la clave "componentes".

        EJEMPLO DETALLADO DE ALTA CALIDAD (para un "samurái en posición de combate"):
        {
          "componentes": [
            {
              "forma": "poligono", "posición": [250, 380], "puntos": [{"x": -40, "y": 0}, {"x": -20, "y": 60}, {"x": 20, "y": 60}, {"x": 40, "y": 0}],
              "estilo": { "relleno": { "tipo": "solido", "color": "#333333" }, "zIndex": 1, "borde_color": "#1a1a1a", "borde_grosor": 2 }
            },
            {
              "forma": "poligono", "posición": [260, 280], "puntos": [{"x": -50, "y": 0}, {"x": 50, "y": 0}, {"x": 40, "y": 100}, {"x": -40, "y": 100}],
              "estilo": { "relleno": { "tipo": "solido", "color": "#8B0000" }, "zIndex": 2, "borde_color": "#5a0000", "borde_grosor": 2 }
            },
            {
              "forma": "poligono", "posición": [260, 280], "puntos": [{"x": -45, "y": -10}, {"x": 45, "y": -10}, {"x": 60, "y": 20}, {"x": -60, "y": 20}],
              "estilo": { "relleno": { "tipo": "solido", "color": "#4d4d4d" }, "zIndex": 3, "borde_color": "#262626", "borde_grosor": 2 }
            },
            {
              "forma": "círculo", "posición": [260, 220], "tamaño": { "radio": 35 },
              "estilo": { "relleno": { "tipo": "solido", "color": "#ffdbac" }, "zIndex": 4 }
            },
            {
              "forma": "rectángulo", "posición": [350, 250], "tamaño": { "ancho": 10, "alto": 200 }, "rotación": -70,
              "estilo": { "relleno": { "tipo": "degradado_lineal", "colores": ["#e0e0e0", "#a0a0a0"], "inicio": {"x": 0, "y": -100}, "fin": {"x": 0, "y": 100} }, "zIndex": 5, "borde_color": "#808080", "borde_grosor": 1 }
            },
            {
              "forma": "rectángulo", "posición": [280, 295], "tamaño": { "ancho": 25, "alto": 15 }, "rotación": -70,
              "estilo": { "relleno": { "tipo": "solido", "color": "#3b3b3b" }, "zIndex": 6 }
            }
          ]
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
    lastGeometricData = null;
    actualizarUI(true, 'Paso 1/2: Descomponiendo la idea en componentes...');

    try {
        const conceptualPrompt = createConceptualPrompt(userPrompt);
        const conceptualData = await callApi(conceptualPrompt);

        actualizarUI(true, 'Paso 2/2: Construyendo la geometría y aplicando estilos...');
        await delay(100);

        const geometricPrompt = createGeometricPrompt(JSON.stringify(conceptualData, null, 2));
        const geometricData = await callApi(geometricPrompt);

        if (!geometricData || !Array.isArray(geometricData.componentes)) {
            throw new Error("La respuesta del paso 2 no generó un array de componentes válido.");
        }
        
        actualizarUI(true, 'Renderizando la escena final...');
        await delay(100);

        renderizarEscena(geometricData.componentes, ctx);
        autoSaveData(conceptualData, geometricData);
        
        actualizarUI(false, '¡Generación completada y guardada!');

    } catch (error) {
        console.error("Error en el proceso de generación principal:", error);
        actualizarUI(false, `Error: ${error.message}`);
        lastGeometricData = null;
    }
}

// -----------------------------------------------------------------
// MÓDULO 7: FUNCIONALIDAD DE IMPORTACIÓN DE JSON (Sin cambios)
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
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = CANVAS_WIDTH;
        tempCanvas.height = CANVAS_HEIGHT;
        const tempCtx = tempCanvas.getContext('2d');
        items.forEach(itemData => {
            if (!itemData.nombre || !itemData.componentes) return;
            renderizarEscena(itemData.componentes, tempCtx);
            itemsAdded++;
        });
        if (itemsAdded > 0) {
            DOM.jsonInputArea.value = '';
            showCustomAlert(`¡${itemsAdded} imágenes reconstruidas desde JSON!`);
        } else {
            showCustomAlert('No se añadieron nuevos elementos válidos desde el JSON.');
        }
    } catch (error) {
        console.error('Error al procesar JSON:', error);
        showCustomAlert(`Error al procesar el JSON: ${error.message}`);
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);
