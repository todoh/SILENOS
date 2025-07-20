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

/**
 * Crea un prompt unificado después de clasificar la intención del usuario.
 * Primero, usa un modelo rápido para determinar el tipo de elemento.
 * Luego, construye un prompt específico y muy detallado para el tipo de elemento detectado.
 * @param {string} userPrompt - La descripción original del usuario.
 * @returns {Promise<string>} El prompt detallado y específico para la generación del SVG.
 */
async function createUnifiedPrompt(userPrompt) {
    console.log("[Clasificación Avanzada] Iniciando análisis del prompt...");

    // Prompt para la primera llamada de clasificación, ahora con más categorías.
    const classificationPrompt = `
        Analiza el siguiente prompt de usuario y clasifícalo en UNA de las siguientes categorías: 
        'personaje', 'animal', 'planta', 'vehiculo', 'edificio', 'objeto', 'paisaje', 'logo', 'abstracto'.
        Responde ÚNICAMENTE con la palabra de la categoría.

        PROMPT: "${userPrompt}"

        CATEGORÍA:
    `;

    // Usamos el modelo rápido y eficiente que especificaste para la clasificación.
    const elementType = await callGenerativeApi(classificationPrompt, 'gemini-2.5-flash-lite-preview-06-17', false);
    const tipoElemento = elementType.trim().toLowerCase();
    console.log(`[Clasificación Avanzada] Elemento detectado: ${tipoElemento}`);

    // Construcción de instrucciones ultra-detalladas basadas en la clasificación.
    let specificInstructions = '';
    switch (tipoElemento) {
        case 'personaje':
            specificInstructions = `
                **Tipo de Elemento:** Personaje.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Cuerpo Completo:** Dibuja SIEMPRE el personaje de cuerpo entero.
                2.  **Anatomía y Proporciones:** La anatomía debe ser correcta y las proporciones realistas y coherentes. 
                2.5 **La Cabeza, cuello, torso (pecho, abdomen y caderas), brazos (hombro, antebrazo, brazo y manos) y piernas (muslo y piernas y pies) deben estar conectados de forma anatómicamente creíble. 
                      Evita el estilo "chibi" o caricaturas deformes a menos que el prompt lo pida explícitamente.
                3.  **Rostro Detallado:** El personaje DEBE tener un rostro visible y detallado (ojos, nariz, boca con labios, orejas y expresion facial). 
                3.2  Si el personaje tubiera, Dibuja el cabello con el pelo detras de la cabeza , que se vea bien el rostro, solo la barba, el bigote y el flequillo se pueden dibujar encima de la cara.
                3.5 **Expresión Facial:** La expresión debe coincidir con la descripción del prompt.
                4.  **Vestimenta Completa:** La ropa debe cubrir el cuerpo de forma lógica. Dibuja pliegues y sombras en la tela para dar volumen. Los accesorios deben estar bien integrados.
                4.1 **Evita sombrear la cara.
                4.3 **Calzado:** El personaje debe tener calzado visible (zapatos, botas, sandalias, etc.) que se ajuste a la vestimenta.
                5.  **Postura y Composición:** El personaje debe tener una postura clara y definida (de pie, sentado, corriendo, etc.), centrada en la composición.
           usa esta estructura para el personaje:
           <svg width="512" height="512" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
    <!-- 
      Este es un SVG de un dummy o maniquí humano, con las partes del cuerpo agrupadas.
      Puedes modificar los estilos (fill, stroke) o las posiciones de cada grupo.
    -->
<svg width="512" height="512" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
    <!-- 
      Este es un SVG de un dummy o maniquí humano, con una estructura anatómica detallada.
      Todas las partes principales del cuerpo están agrupadas para facilitar su manipulación.
    -->
    <style>
        .body-part {
            stroke: #444;
            stroke-width: 1.5;
            stroke-linejoin: round;
            stroke-linecap: round;
        }
        .major-muscle { fill: #E0E0E0; }
        .minor-muscle { fill: #D0D0D0; }
        .joints { fill: #BDBDBD; }
        .core-body { fill: #ECECEC; }
        .face-lines { stroke: #BDBDBD; stroke-width: 1; }
    </style>

    <!-- Grupo General del Dummy Anatómico -->
    <g id="dummy-anatomico-completo">

        <!-- Grupo de la Cabeza -->
        <g id="cabeza">
            <title>Cabeza</title>
            <path class="body-part core-body" d="M150,20 C169.3,20 185,35.7 185,55 C185,74.3 169.3,90 150,90 C130.7,90 115,74.3 115,55 C115,35.7 130.7,20 150,20 Z" />
            <path class="face-lines" d="M150,45 L150,65 M135,55 L165,55" /> <!-- Guías faciales -->
        </g>

        <!-- Grupo del Cuello -->
        <g id="cuello">
            <title>Cuello</title>
            <path class="body-part minor-muscle" d="M142,88 L158,88 L162,105 L138,105 Z" />
        </g>

        <!-- Grupo del Tronco -->
        <g id="tronco">
            <title>Tronco</title>
            <!-- Pecho -->
            <g id="pecho">
                <title>Pecho</title>
                <path class="body-part major-muscle" d="M150,110 C130,112 118,130 120,150 L150,155 Z" />
                <path class="body-part major-muscle" d="M150,110 C170,112 182,130 180,150 L150,155 Z" />
            </g>
            <!-- Abdomen -->
            <g id="abdomen">
                <title>Abdomen</title>
                <path class="body-part core-body" d="M130,155 L170,155 L165,200 L135,200 Z" />
            </g>
            <!-- Cintura y Cadera/Pelvis -->
            <g id="cintura-y-cadera">
                 <title>Cintura y Cadera</title>
                 <path class="body-part core-body" d="M135,200 L165,200 L180,230 L120,230 Z" />
            </g>
        </g>

        <!-- Grupo del Brazo Derecho -->
        <g id="brazo-derecho">
            <g id="hombro-derecho">
                <title>Hombro Derecho</title>
                <path class="body-part major-muscle" d="M180,110 C195,115 200,130 195,145 C190,130 180,120 180,110 Z" />
            </g>
            <g id="brazo-superior-derecho">
                <title>Brazo Superior Derecho</title>
                <path class="body-part minor-muscle" d="M188,125 L215,160 L205,165 L182,135 Z" />
            </g>
            <g id="codo-derecho">
                <title>Codo Derecho</title>
                <circle class="body-part joints" cx="218" cy="163" r="6" />
            </g>
            <g id="antebrazo-derecho">
                <title>Antebrazo Derecho</title>
                <path class="body-part minor-muscle" d="M210,170 L240,200 L235,208 L205,175 Z" />
            </g>
         
            <g id="mano-derecha">
                <title>Mano Derecha</title>
                <path class="body-part minor-muscle" d="M238,210 C258,210 260,230 245,230 C230,230 230,215 238,210 Z" />
                <line class="body-part" x1="248" y1="230" x2="252" y2="234" /> <!-- Dedos -->
            </g>
        </g>

        <!-- Grupo del Brazo Izquierdo -->
        <g id="brazo-izquierdo">
            <g id="hombro-izquierdo">
                <title>Hombro Izquierdo</title>
                <path class="body-part major-muscle" d="M120,110 C105,115 100,130 105,145 C110,130 120,120 120,110 Z" />
            </g>
            <g id="brazo-superior-izquierdo">
                <title>Brazo Superior Izquierdo</title>
                <path class="body-part minor-muscle" d="M112,125 L85,160 L95,165 L118,135 Z" />
            </g>
            <g id="codo-izquierdo">
                <title>Codo Izquierdo</title>
                <circle class="body-part joints" cx="82" cy="163" r="6" />
            </g>
            <g id="antebrazo-izquierdo">
                <title>Antebrazo Izquierdo</title>
                <path class="body-part minor-muscle" d="M90,170 L60,200 L65,208 L95,175 Z" />
            </g>
           
            <g id="mano-izquierda">
                <title>Mano Izquierda</title>
                <path class="body-part minor-muscle" d="M62,210 C42,210 40,230 55,230 C70,230 70,215 62,210 Z" />
                <line class="body-part" x1="52" y1="230" x2="48" y2="234" /> <!-- Dedos -->
            </g>
        </g>

        <!-- Grupo de la Pierna Derecha -->
        <g id="pierna-derecha">
            <g id="muslo-derecho">
                <title>Muslo Derecho</title>
                <path class="body-part major-muscle" d="M155,230 L175,300 L160,305 L145,232 Z" />
            </g>
            <g id="rodilla-derecha">
                <title>Rodilla Derecha</title>
                <circle class="body-part joints" cx="176" cy="303" r="8" />
            </g>
            <g id="pantorrilla-derecha">
                <title>Pantorrilla Derecha</title>
                <path class="body-part minor-muscle" d="M170,310 L180,360 L168,365 L160,312 Z" />
            </g>
          
            <g id="pie-derecho">
                <title>Pie Derecho</title>
                <path class="body-part minor-muscle" d="M175,370 L205,370 L190,385 L170,380 Z" />
            </g>
        </g>

        <!-- Grupo de la Pierna Izquierda -->
        <g id="pierna-izquierda">
            <g id="muslo-izquierdo">
                <title>Muslo Izquierdo</title>
                <path class="body-part major-muscle" d="M145,230 L125,300 L140,305 L155,232 Z" />
            </g>
            <g id="rodilla-izquierda">
                <title>Rodilla Izquierda</title>
                <circle class="body-part joints" cx="124" cy="303" r="8" />
            </g>
            <g id="pantorrilla-izquierda">
                <title>Pantorrilla Izquierda</title>
                <path class="body-part minor-muscle" d="M130,310 L120,360 L132,365 L140,312 Z" />
            </g>
            
            <g id="pie-izquierdo">
                <title>Pie Izquierdo</title>
                <path class="body-part minor-muscle" d="M125,370 L95,370 L110,385 L130,380 Z" />
            </g>
        </g>

    </g>
</svg>

                `;
            break;

        case 'animal':
            specificInstructions = `
                **Tipo de Elemento:** Animal.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Sub-Clasificación:** Identifica el tipo de animal y sigue las guías:
                    - **Cuadrúpedos (perro, león, caballo):** Enfócate en la musculatura, la estructura ósea de las patas y una pose natural.
                    - **Aves (águila, gorrión):** Detalla el plumaje, la forma de las alas (en reposo o en vuelo) y el pico.
                    - **Peces (pez payaso, tiburón):** Dibuja escamas con patrones, aletas translúcidas y el brillo del agua sobre el cuerpo.
                    - **Reptiles (serpiente, lagarto):** Simula la textura de las escamas y la piel, y una pose característica de su especie.
                    - **Insectos (mariposa, abeja):** Presta atención a los detalles: antenas, patas segmentadas, patrones en las alas.
                2.  **Anatomía Específica:** Respeta rigurosamente la anatomía de la especie.
                3.  **Textura y Pelaje:** Usa degradados y patrones SVG para simular pelaje, plumas o escamas de forma realista.
            `;
            break;

        case 'planta':
            specificInstructions = `
                **Tipo de Elemento:** Planta/Vegetación.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Sub-Clasificación:** Identifica el tipo de planta y sigue las guías:
                    - **Árboles:** Dibuja un tronco robusto con textura de corteza, ramas que se dividen de forma orgánica y una copa frondosa con grupos de hojas.
                    - **Flores:** Dibuja un tallo definido, hojas con sus nervaduras y pétalos con volumen, color y degradados sutiles. Cada parte debe estar conectada.
                    - **Arbustos/Matorrales:** Crea una masa densa de hojas y ramas, mostrando profundidad con hojas más oscuras en el interior.
                2.  **Estructura Botánica:** Todas las partes deben estar conectadas de forma natural.
            `;
            break;

        case 'vehiculo':
            specificInstructions = `
                **Tipo de Elemento:** Vehículo.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Sub-Clasificación:** Identifica el tipo de vehículo y sigue las guías:
                    - **Coches/Motos:** Dibuja la carrocería con reflejos metálicos, ruedas con llantas detalladas, ventanas/parabrisas translúcidos, y luces (faros, luces traseras).
                    - **Bicicletas:** Detalla el cuadro, el manillar, el sillín, los pedales y las ruedas con radios finos.
                    - **Barcos:** Dibuja el casco con su forma hidrodinámica, la cubierta con sus elementos (mástiles, cabina) y el reflejo o estela en el agua.
                    - **Aviones:** Detalla el fuselaje, las alas con su forma aerodinámica, los motores y la cabina del piloto.
                2.  **Perspectiva y Materiales:** Usa perspectiva para dar tridimensionalidad. Simula metal, cristal y goma con brillos y sombras.
            `;
            break;

        case 'edificio':
            specificInstructions = `
                **Tipo de Elemento:** Edificio/Arquitectura.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Perspectiva:** Utiliza una perspectiva clara (uno o dos puntos de fuga) para dar profundidad y realismo.
                2.  **Estructura:** Dibuja paredes, techo, cimientos.
                3.  **Detalles Arquitectónicos:** Incluye puertas, ventanas (con marcos y cristales), balcones, cornisas, etc.
                4.  **Materiales:** Simula las texturas de los materiales (ladrillo, hormigón, cristal, madera) mediante patrones o colores.
                5.  **Contexto:** Coloca el edificio sobre una base (suelo, acera) para que no flote en el vacío.
            `;
            break;

        default: // Incluye 'objeto', 'paisaje', 'logo', 'abstracto'
            specificInstructions = `
                **Tipo de Elemento:** ${tipoElemento}.
                **Instrucciones de Dibujo Generales:**
                1.  **Composición:** Centra el elemento principal. Si es un paisaje, usa capas (primer plano, plano medio, fondo) para crear profundidad.
                2.  **Coherencia Visual:** Todos los componentes deben compartir un estilo de iluminación, color y trazo consistente.
                3.  **Volumen y Profundidad:** Utiliza luces y sombras para evitar un resultado plano.
            `;
    }

    // Este es el prompt final que se enviará a la IA de generación principal.
    return `
        Eres un diseñador gráfico experto en SVG y un ilustrador técnico. Tu tarea es generar un objeto JSON que contenga metadatos y el código SVG de una imagen, siguiendo un plan de ejecución estricto y detallado.

        PROMPT ORIGINAL DEL USUARIO: "${userPrompt}"

        ==================================================
        PLAN DE EJECUCIÓN OBLIGATORIO (TIENE PRIORIDAD MÁXIMA):
        ${specificInstructions}
        ==================================================

        INSTRUCCIONES FINALES DE FORMATO:
        1.  Ejecuta el PLAN al pie de la letra para crear la imagen.
        2.  Define los metadatos ("nombre", "descripcion", "etiqueta", "arco"). La "etiqueta" DEBE ser '${tipoElemento}'.
        3.  Genera el código SVG en la propiedad "svgContent". El SVG debe ser de alta calidad, con viewBox="0 0 512 512" y fondo transparente.
        4.  Tu respuesta DEBE SER ÚNICAMENTE el objeto JSON válido. No incluyas texto explicativo, comentarios o markdown fuera del JSON.
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

    // PASO 1: Obtener el prompt detallado y específico llamando a nuestra función refactorizada.
    // Esta función ahora contiene la lógica de clasificación y la construcción del prompt final.
    const promptDetallado = await createUnifiedPrompt(userPrompt);

    console.log("[Generador Externo SVG] Prompt detallado recibido. Generando JSON y SVG...");

    // PASO 2: Usar el prompt detallado para la generación final del SVG.
    // La IA que recibe este prompt ya sabe qué tipo de elemento dibujar y cómo hacerlo.
    const generatedData = await callApiForGeneratedJson(promptDetallado, true);
    const { svgContent } = generatedData;

    if (!svgContent) {
        throw new Error("La respuesta de la IA para la generación externa no contenía 'svgContent'.");
    }

    console.log("[Generador Externo SVG] SVG recibido. Convirtiendo a PNG...");
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







/**
 * Genera una imagen SVG a través de un proceso de 10 pasos con múltiples modelos de IA.
 * @param {string} userPrompt - La descripción inicial del usuario.
 * @returns {Promise<{imagen: string, svgContent: string}>} Un objeto con la imagen en formato PNG (Data URL) y el contenido del SVG final.
 */
// ============== CÓDIGO PARA AÑADIR EN generador.js ==============

/**
 * Llama a la API generativa de Google con el prompt y modelo especificados.
 * @param {string} prompt - El prompt para enviar a la IA.
 * @param {string} model - El modelo a utilizar (ej: 'gemini-pro', 'gemini-1.5-flash').
 * @param {boolean} expectJson - Si se debe esperar una respuesta en formato JSON.
 * @returns {Promise<any>} La respuesta de la API, parseada si es JSON.
 */
async function callGenerativeApi(prompt, model = 'gemini-2.5-flash', expectJson = true) {
    // Asumimos que 'apiKey' está disponible en el scope global
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
        throw new Error(`Error en la API (${model}): ${response.statusText}. Cuerpo: ${errorBody}`);
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
            throw new Error(`La respuesta de la API para el modelo ${model} no contenía un JSON válido.`);
        }
    } else {
        return rawText.replace(/```svg\n?/, '').replace(/```$/, '');
    }
}


/**
 * Genera una imagen SVG a través de un proceso de 5 pasos con múltiples modelos de IA.
 * @param {string} userPrompt - La descripción inicial del usuario.
 * @returns {Promise<{imagen: string, svgContent: string}>} Un objeto con la imagen en formato PNG (Data URL) y el contenido del SVG final.
 */
async function generarImagenHiperUltraDesdePrompt(userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    const statusLog = (message) => console.log(`[HIPER-ULTRA] ${message}`);
    statusLog(`Iniciando para: "${userPrompt}"`);

    // --- Función de validación interna ---
    const validateSvg = (svgString, step) => {
        if (!svgString || typeof svgString !== 'string' || !svgString.trim().startsWith('<svg')) {
            throw new Error(`La IA no devolvió un SVG válido en el Paso ${step}.`);
        }
        return svgString.trim();
    };

    // --- NUEVA CADENA DE GENERACIÓN DE 5 PASOS CON VALIDACIÓN ---

    // PASO 1: 1x PRO - Generación del SVG base
    statusLog("Paso 1/5: Generando SVG base con formas y composición (PRO)...");
    const baseSvgPrompt = `Basado en la idea del usuario: "${userPrompt}", genera un código SVG completo y bien estructurado. Dibuja todas las formas principales, establece la composición general y aplica una paleta de colores base. El SVG debe ser coherente y visualmente agradable. Tu respuesta DEBE ser ÚNICAMENTE el código SVG, sin explicaciones ni markdown.`;
    let svgStep = await callGenerativeApi(baseSvgPrompt, 'gemini-2.5-pro', false);
    svgStep = validateSvg(svgStep, 1);

    // PASO 2: 1x FLASH LITE - Mejora de detalles de formas
    statusLog("Paso 2/5: Mejorando detalles de las formas (FLASH LITE)...");
    const shapeDetailPrompt = `Toma el siguiente SVG y refina los detalles de todas las formas. Haz los contornos más precisos, las curvas más suaves y añade pequeños detalles estructurales para aumentar el realismo y la definición. Devuelve ÚNICAMENTE el código SVG completo y mejorado. SVG: \`\`\`svg\n${svgStep}\`\`\``;
    svgStep = await callGenerativeApi(shapeDetailPrompt, 'gemini-2.5-flash', false);
    svgStep = validateSvg(svgStep, 2);

    // PASO 3: 1x FLASH LITE - Texturizado
    statusLog("Paso 3/5: Aplicando texturas y degradados (FLASH LITE)...");
    const texturizePrompt = `Añade texturas y degradados de color al siguiente SVG para darle profundidad y realismo. Usa patrones SVG y filtros si es necesario para simular materiales (metal, tela, piel, etc.). Devuelve ÚNICAMENTE el código SVG completo y mejorado. SVG: \`\`\`svg\n${svgStep}\`\`\``;
    svgStep = await callGenerativeApi(texturizePrompt, 'gemini-2.5-flash-lite-preview-06-17', false);
    svgStep = validateSvg(svgStep, 3);

    // PASO 4: 1x FLASH LITE - Depuración de formas y texturas
    statusLog("Paso 4/5: Depurando y armonizando formas y texturas (FLASH LITE)...");
    const debugPrompt = `Revisa este SVG y depura la interacción entre las formas y las texturas. Asegúrate de que las texturas se apliquen correctamente a las formas, que no haya solapamientos extraños y que el conjunto se vea armonioso. Devuelve ÚNICAMENTE el código SVG completo y mejorado. SVG: \`\`\`svg\n${svgStep}\`\`\``;
    svgStep = await callGenerativeApi(debugPrompt, 'gemini-2.5-flash-lite-preview-06-17', false);
    svgStep = validateSvg(svgStep, 4);

    // PASO 5: 1x FLASH - Supervisión y retoques finales
    statusLog("Paso 5/5: Supervisando y retocando posiciones, ángulos y tamaños (FLASH)...");
    const finalTouchupPrompt = `Realiza una supervisión final a este SVG. Si es necesario, haz pequeños ajustes en las posiciones, ángulos y tamaños de los elementos para lograr una composición perfecta y un acabado profesional. Devuelve ÚNICAMENTE el código SVG completo y mejorado. SVG: \`\`\`svg\n${svgStep}\`\`\``;
    const finalSvg = await callGenerativeApi(finalTouchupPrompt, 'gemini-2.5-flash', false);
    validateSvg(finalSvg, 5);

    statusLog("Convirtiendo a PNG...");
    const pngDataUrl = await svgToPngDataURL(finalSvg);

    statusLog("Proceso HIPER-ULTRA completado.");
    return { imagen: pngDataUrl, svgContent: finalSvg };
}









// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);
