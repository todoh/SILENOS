// =================================================================
// ARCHIVO REFACTORIZADO: generador.js (Versión 10 - Corrección de API)
// =================================================================
// OBJETIVOS DE ESTA VERSIÓN:
// 1. CORRECCIÓN DE ERROR "Method Not Allowed": Se unifica el uso de la función
//    `callGenerativeApi` para todas las llamadas, asegurando que la URL
//    se construya siempre correctamente.
// 2. MANTENIMIENTO DE ESTRUCTURA: Se conserva la lógica existente
//    y solo se realizan los cambios mínimos para corregir el error.
// =================================================================

// -----------------------------------------------------------------
// MÓDULO 1: CONFIGURACIÓN Y UTILIDADES
// -----------------------------------------------------------------

// API_URL global se elimina para evitar confusiones.
// La URL se construirá dinámicamente en callGenerativeApi.

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

async function createUnifiedPrompt(userPrompt) {
    console.log("[Clasificación Avanzada] Iniciando análisis del prompt...");

    const classificationPrompt = `
        Analiza el siguiente prompt de usuario y clasifícalo en UNA de las siguientes categorías: 
        'personaje', 'animal', 'arbol', 'planta-no-arbol', 'coche', 'bicicleta', 'motocicleta', 'avion', 'helicoptero', 'barco', 'edificio', 'objeto', 'paisaje', 'logo', 'abstracto'.
        Responde ÚNICAMENTE con la palabra de la categoría.

        PROMPT: "${userPrompt}"

        CATEGORÍA:
    `;
    
    // CORRECCIÓN: Se usa callGenerativeApi para la clasificación.
    const elementType = await callGenerativeApi(classificationPrompt, 'gemini-2.5-flash-lite-preview-06-17', false);
    const tipoElemento = elementType.trim().toLowerCase();
    console.log(`[Clasificación Avanzada] Elemento detectado: ${tipoElemento}`);

    let specificInstructions = '';
    switch (tipoElemento) {



     case 'personaje':
    specificInstructions = `
        **Filosofía de Diseño y Estilo OBLIGATORIA:**
        El objetivo es crear un personaje **humanoide** con un estilo de animación moderno, orgánico y fluido. La clave es mantener **proporciones anatómicas realistas y creíbles** (cabeza, cuello, torso, extremidades) adaptadas a un estilo de dibujo limpio y estilizado. Las líneas deben ser suaves y definir una silueta clara y reconocible.

        **Instrucciones de Dibujo OBLIGATORIAS:**

        1.  **Silueta y Proporciones Humanoides:**
            * Dibuja SIEMPRE el personaje de cuerpo entero con una postura clara y natural.
            * La anatomía debe ser la de un ser humano. Presta especial atención a la relación entre hombros y caderas, la presencia de un cuello definido y la forma en que las extremidades se conectan al torso.
            * La silueta general debe ser lo primero que se defina y debe ser anatómicamente coherente.

        2.  **Anatomía Fluida pero Definida:**
            * Usa **curvas suaves y elegantes (comandos C, S, Q en paths SVG)** para delinear el cuerpo.
            * Los brazos y las piernas deben tener una forma cónica y orgánica, más anchos donde se conectan al torso y más delgados hacia las manos y los pies. Evita las "extremidades de fideo" (grosor uniforme).
            * Aunque el estilo es simplificado, insinúa la estructura subyacente (codos, rodillas, pantorrillas, hombros) a través de cambios sutiles en la curvatura de las líneas, no con círculos o ángulos.

        3.  **Rostro Detallado y Expresivo:**
            * El rostro es el foco emocional. DEBE ser visible, detallado y tener una expresión clara que coincida con la descripción del prompt.
            * Dibuja ojos, nariz y boca que formen un conjunto armónico y estén correctamente situados en la cabeza.

        4.  **Vestimenta y Accesorios Integrados:**
            * La ropa debe envolver la forma del cuerpo, siguiendo sus curvas y volúmenes. Usa pliegues y superposiciones para dar sensación de tela y profundidad.
            * Los accesorios deben estar correctamente posicionados y escalados con respecto al cuerpo.

        5.  **Estructura SVG de Referencia (Guía de Estilo Humanoide):**
            * **Utiliza la siguiente estructura SVG como BASE y GUÍA DE ESTILO.**
            * **NO COPIES los atributos "d" exactos.** En su lugar, usa este modelo para entender cómo construir una forma humanoide creíble con curvas suaves.
            * Adapta, modifica y deforma estas formas base para ajustarlas al género, la complexión, la ropa y la postura que se describen en el prompt.

        <svg width="512" height="512" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
                    .body-part { stroke: #444; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
        .major-muscle { fill: #E0E0E0; }
        .minor-muscle { fill: #D0D0D0; }
        .joints { fill: #BDBDBD; }
        .core-body { fill: #ECECEC; }
        .face-lines { stroke: #BDBDBD; stroke-width: 1; }
        /* --- Nuevos Estilos --- */
        .hair { fill: #A0522D; stroke: #444; stroke-width: 1; }
        .hat { fill: #594D43; }
        .hat-band { fill: #332C26; }
                    <g id="dummy-anatomico-completo">
        <!-- --- Cabeza --- -->
        <g id="cabeza">
            <title>Cabeza</title>
            <path class="body-part core-body" d="M150,20 C169.3,20 185,35.7 185,55 C185,74.3 169.3,90 150,90 C130.7,90 115,74.3 115,55 C115,35.7 130.7,20 150,20 Z" />
            <g id="frente"><title>Frente</title><path style="fill:none; stroke:none;" d="M125,40 C135,35, 165,35, 175,40 L175,55 L125,55 Z" /></g>
            <g id="cuero-cabelludo"><title>Cuero cabelludo</title><path style="fill:none; stroke:none;" d="M115,55 C115,35.7 130.7,20 150,20 C169.3,20 185,35.7 185,55" /></g>
            <path class="face-lines" d="M150,45 L150,65 M135,55 L165,55" />
            <g id="pelo" class="hair"><title>Pelo</title><path d="M116,56 C105,40 120,20 150,18 C180,20 195,40 184,56 C170,45 130,45 116,56 Z" /></g>
            <g id="sombrero" class="body-part"><title>Sombrero</title><path class="hat" d="M105,45 C100,35 200,35 195,45 C190,55 110,55 105,45 Z"/><path class="hat" d="M120,44 C118,30 182,30 180,44 Z"/><path class="hat" d="M120,32 C120,15 180,15 180,32 L120,32 Z"/><path class="hat-band" d="M120,44 C118,38 182,38 180,44 L182,42 C182,36 118,36 118,42 Z"/></g>
        </g>
        
        <!-- --- Cuerpo con Diseño Anatómico Mejorado --- -->
        <g id="cuello"><title>Cuello</title><path class="body-part minor-muscle" d="M142,88 L158,88 L162,105 L138,105 Z" /></g>
        <g id="tronco"><title>Tronco</title>
            <g id="pecho"><title>Pecho</title><path class="body-part major-muscle" d="M150,105 C125,108 115,130 120,150 L150,152 Z" /><path class="body-part major-muscle" d="M150,105 C175,108 185,130 180,150 L150,152 Z" /></g>
            <g id="abdomen"><title>Abdomen</title><path class="body-part core-body" d="M120,150 L180,150 L170,200 L130,200 Z" /></g>
            <g id="cintura"><title>Cintura</title><path class="body-part core-body" d="M130,200 L170,200 L180,215 L120,215 Z" /></g>
            <g id="cadera"><title>Cadera</title><path class="body-part core-body" d="M120,215 L180,215 L175,240 C150,245 150,245 125,240 Z" /></g>
        </g>
        <g id="brazo-derecho"><title>Brazo Derecho</title>
            <g id="hombro-derecho"><title>Hombro Derecho</title><path class="body-part major-muscle" d="M180,108 C198,115 205,130 198,145 C190,130 180,120 180,108 Z" /></g>
            <g id="brazo-superior-derecho"><title>Brazo Superior Derecho</title><path class="body-part minor-muscle" d="M190,125 L215,160 L205,168 L182,135 Z" /></g>
            <g id="codo-derecho"><title>Codo Derecho</title><circle class="body-part joints" cx="218" cy="163" r="6" /></g>
            <g id="antebrazo-derecho"><title>Antebrazo Derecho</title><path class="body-part minor-muscle" d="M210,170 L240,200 L235,208 L205,175 Z" /></g>
            <g id="mano-derecha"><title>Mano Derecha</title><path class="body-part minor-muscle" d="M238,208 C255,208 260,225 245,230 C230,235 230,215 238,208 Z" /></g>
        </g>
        <g id="brazo-izquierdo"><title>Brazo Izquierdo</title>
            <g id="hombro-izquierdo"><title>Hombro Izquierdo</title><path class="body-part major-muscle" d="M120,108 C102,115 95,130 102,145 C110,130 120,120 120,108 Z" /></g>
            <g id="brazo-superior-izquierdo"><title>Brazo Superior Izquierdo</title><path class="body-part minor-muscle" d="M110,125 L85,160 L95,168 L118,135 Z" /></g>
            <g id="codo-izquierdo"><title>Codo Izquierdo</title><circle class="body-part joints" cx="82" cy="163" r="6" /></g>
            <g id="antebrazo-izquierdo"><title>Antebrazo Izquierdo</title><path class="body-part minor-muscle" d="M90,170 L60,200 L65,208 L95,175 Z" /></g>
            <g id="mano-izquierda"><title>Mano Izquierda</title><path class="body-part minor-muscle" d="M62,208 C45,208 40,225 55,230 C70,235 70,215 62,208 Z" /></g>
        </g>
        <g id="pierna-derecha"><title>Pierna Derecha</title>
            <g id="muslo-derecho"><title>Muslo Derecho</title><path class="body-part major-muscle" d="M158,242 L180,300 L165,308 L150,244 Z" /></g>
            <g id="rodilla-derecha"><title>Rodilla Derecha</title><circle class="body-part joints" cx="178" cy="303" r="8" /></g>
            <g id="pantorrilla-derecha"><title>Pantorrilla Derecha</title><path class="body-part minor-muscle" d="M172,310 L185,360 L170,365 L165,312 Z" /></g>
            <g id="pie-derecho"><title>Pie Derecho</title><path class="body-part minor-muscle" d="M178,368 L205,370 L190,385 L173,380 Z" /></g>
        </g>
        <g id="pierna-izquierda"><title>Pierna Izquierda</title>
            <g id="muslo-izquierdo"><title>Muslo Izquierdo</title><path class="body-part major-muscle" d="M142,242 L120,300 L135,308 L150,244 Z" /></g>
            <g id="rodilla-izquierda"><title>Rodilla Izquierda</title><circle class="body-part joints" cx="122" cy="303" r="8" /></g>
            <g id="pantorrilla-izquierda"><title>Pantorrilla Izquierda</title><path class="body-part minor-muscle" d="M128,310 L115,360 L130,365 L135,312 Z" /></g>
            <g id="pie-izquierdo"><title>Pie Izquierdo</title><path class="body-part minor-muscle" d="M122,368 L95,370 L110,385 L127,380 Z" /></g>
        </g>
    </g>
                </svg>
  Manten la cara libre de sombras y cuida que el pelo o los adcesorios no la tapen.  `; 
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
        case 'planta-no-arbol':
            specificInstructions = `
                **Tipo de Elemento:** Planta/Vegetación.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Sub-Clasificación:** Identifica el tipo de planta y sigue las guías:
                     - **Flores:** Dibuja un tallo definido, hojas con sus nervaduras y pétalos con volumen, color y degradados sutiles. Cada parte debe estar conectada.
                    - **Arbustos/Matorrales:** Crea una masa densa de hojas y ramas, mostrando profundidad con hojas más oscuras en el interior.
                2.  **Estructura Botánica:** Todas las partes deben estar conectadas de forma natural.
            `;
            break;

case 'arbol':
    specificInstructions = `
        **Tipo de Elemento:** Árbol.
        **Instrucciones de Dibujo OBLIGATORIAS:**
        1.  **Estructura Jerárquica:** El árbol debe tener una estructura clara y lógica.
            - **Tronco:** Dibuja un tronco robusto que se ensancha en la base. Usa líneas para simular la textura de la corteza.
            - **Ramas Principales:** Desde el tronco, dibuja de 2 a 5 ramas principales. Deben ser más gruesas en la base y adelgazarse hacia las puntas.
            - **Ramas Secundarias:** De cada rama principal deben nacer varias ramas secundarias, más delgadas que las principales.
            - **Ramas Terciarias/Ramitas:** De las ramas secundarias, dibuja ramitas aún más finas. Son la estructura que soportará las hojas.
        2.  **Follaje (Hojas):**
            - Las hojas deben agruparse en cúmulos (grupos de follaje) alrededor de las ramas terciarias.
            - No dibujes hojas individuales flotando, deben estar conectadas visualmente a las ramitas.
            - Varía la densidad y el tamaño de los cúmulos de hojas para dar un aspecto más natural y con profundidad.
        3.  **Conexión Orgánica:** Todas las partes del árbol (tronco, ramas, ramitas) deben estar conectadas de forma fluida y natural, sin interrupciones abruptas.
    4. Sigue la estructura de la planta, siguiendo las guías de anatomía y cuidando de dar un aspecto natural y realista.
    5. Usa este svg como base para la construcción de tu obra de arte:
    
    <svg width="512" height="512" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <style>
        .trunk { fill: #8B4513; stroke: #5A2D0C; stroke-width: 2; }
        .main-branch { fill: #8B4513; stroke: #5A2D0C; stroke-width: 1.5; }
        .secondary-branch { stroke: #5A2D0C; stroke-width: 1; }
        .twig { stroke: #5A2D0C; stroke-width: 0.5; }
        .foliage { fill: #228B22; stroke: #1A681A; stroke-width: 0.5; opacity: 0.85; }

        /* --- Efectos Interactivos --- */
        #tree-example g:hover > .foliage {
            fill: #3CB371; /* Verde más claro al pasar el cursor */
            cursor: pointer;
            opacity: 1;
        }
        #tree-example g:hover > .trunk,
        #tree-example g:hover > .main-branch {
            fill: #A0522D; /* Marrón más claro */
            cursor: pointer;
        }
    </style>

    <g id="tree-example">
        <title>Árbol Detallado</title>

        <!-- --- Tronco y Ramas Principales --- -->
        <g id="estructura-principal">
            <title>Tronco y Ramas Principales</title>
            <path id="tronco" class="trunk" d="M200,380 Q195,300 200,250 T205,180" />
            
            <g id="ramas-principales">
                <!-- Rama Principal Izquierda -->
                <path id="rama-p-1" class="main-branch" d="M202,220 Q150,200 120,150" />
                <!-- Rama Principal Derecha -->
                <path id="rama-p-2" class="main-branch" d="M204,210 Q250,190 280,160" />
                 <!-- Rama Principal Central -->
                <path id="rama-p-3" class="main-branch" d="M204,185 Q200,150 210,120" />
            </g>
        </g>

        <!-- --- Ramas Secundarias y Terciarias --- -->
        <g id="estructura-secundaria">
            <title>Ramas Secundarias y Terciarias</title>
            <!-- Ramas de la rama p-1 -->
            <path id="rama-s-1-1" class="secondary-branch" d="M148,178 Q110,170 90,140" />
            <path id="ramita-1-1-1" class="twig" d="M100,145 Q85,130 95,115" />
            <path id="rama-s-1-2" class="secondary-branch" d="M125,155 Q140,130 130,110" />
            <path id="ramita-1-2-1" class="twig" d="M132,115 Q125,100 135,95" />

            <!-- Ramas de la rama p-2 -->
            <path id="rama-s-2-1" class="secondary-branch" d="M255,170 Q280,150 290,130" />
            <path id="ramita-2-1-1" class="twig" d="M285,135 Q295,120 280,110" />
            <path id="rama-s-2-2" class="secondary-branch" d="M275,162 Q260,140 250,120" />
            <path id="ramita-2-2-1" class="twig" d="M252,125 Q240,110 255,100" />
            
            <!-- Ramas de la rama p-3 -->
            <path id="rama-s-3-1" class="secondary-branch" d="M208,125 Q190,110 180,90" />
            <path id="ramita-3-1-1" class="twig" d="M182,95 Q170,80 185,75" />
            <path id="rama-s-3-2" class="secondary-branch" d="M210,122 Q220,100 230,80" />
            <path id="ramita-3-2-1" class="twig" d="M228,85 Q240,70 230,60" />
        </g>

        <!-- --- Follaje / Cúmulos de Hojas --- -->
        <g id="follaje">
            <title>Follaje</title>
            <!-- Hojas alrededor de ramita 1-1-1 -->
            <path class="foliage" d="M95,120 C75,125 70,105 90,100 C110,95 115,115 95,120 Z" />
            <!-- Hojas alrededor de ramita 1-2-1 -->
            <path class="foliage" d="M135,100 C120,105 115,85 135,80 C155,85 150,105 135,100 Z" />
            <!-- Hojas alrededor de ramita 2-1-1 -->
            <path class="foliage" d="M280,115 C265,120 260,100 280,95 C300,100 295,120 280,115 Z" />
            <!-- Hojas alrededor de ramita 2-2-1 -->
            <path class="foliage" d="M255,105 C235,110 230,90 250,85 C270,90 270,110 255,105 Z" />
             <!-- Hojas alrededor de ramita 3-1-1 -->
            <path class="foliage" d="M185,80 C165,85 160,65 180,60 C200,65 200,85 185,80 Z" />
             <!-- Hojas alrededor de ramita 3-2-1 -->
            <path class="foliage" d="M230,65 C210,70 215,50 235,45 C255,50 250,70 230,65 Z" />
            <!-- Cúmulo central grande -->
            <path class="foliage" d="M210,90 C180,95 170,70 210,60 C250,70 240,95 210,90 Z" />
        </g>
    </g>
</svg>

    
        `;
    break;



        case 'coche':
            specificInstructions = `
                **Tipo de Elemento:** Coche.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Estructura y Proporciones:** Dibuja la carrocería con proporciones correctas y líneas de diseño claras.
                2.  **Detalles Clave:** Incluye ruedas con llantas detalladas, ventanas y parabrisas translúcidos, faros delanteros y luces traseras.
                3.  **Materiales y Reflejos:** Simula la pintura metálica con brillos y reflejos. Usa degradados para dar volumen.
                4.  **Perspectiva:** Aplica perspectiva para dar una sensación tridimensional creíble.
                5.  Usa esta estructura para el coche:
          <svg width="512" height="512" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad-car-body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(210,210,220);stop-opacity:1" />
            <stop offset="50%" style="stop-color:rgb(150,150,160);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgb(110,110,120);stop-opacity:1" />
        </linearGradient>
        <linearGradient id="grad-windows" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(150,180,210);stop-opacity:0.7" />
            <stop offset="100%" style="stop-color:rgb(60,90,130);stop-opacity:0.8" />
        </linearGradient>
        <radialGradient id="grad-headlight">
            <stop offset="10%" stop-color="white" stop-opacity="1"/>
            <stop offset="90%" stop-color="#f0e68c" stop-opacity="0.5"/>
        </radialGradient>
        <radialGradient id="grad-rim-shine">
            <stop offset="5%" stop-color="#FFFFFF" stop-opacity=".8"/>
            <stop offset="100%" stop-color="#A0A0A0" stop-opacity="0"/>
        </radialGradient>
        <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    </defs>
    <g id="coche-completo">
        <g id="sombra-suelo"><title>Sombra del Coche</title><ellipse cx="300" cy="350" rx="220" ry="25" fill="#000" opacity="0.2"/></g>
        <g id="chasis"><title>Chasis</title><path class="car-body" d="M50,340 L50,220 C60,180 120,170 150,170 L450,180 C520,185 550,220 550,250 L550,340 Z" fill="url(#grad-car-body)" stroke="#222" stroke-width="2"/><path class="rocker-panel" d="M195,340 L415,340 L410,350 L200,350 Z" fill="#444" /></g>
        <g id="cabina"><title>Cabina y Ventanas</title><path class="windows" d="M160,172 L280,170 L380,175 L420,220 L180,220 Z" fill="url(#grad-windows)" stroke="#111" stroke-width="1.5"/><path class="pillars" d="M280,170 L285,220" stroke="#555" stroke-width="4" fill="none"/><g id="limpiaparabrisas" transform="translate(390, 220) rotate(-15)"><rect width="50" height="3" fill="#222" /><rect y="-5" width="50" height="2" fill="#333" /></g></g>
        <g id="ruedas"><title>Ruedas</title><g id="rueda-trasera"><title>Rueda Trasera</title><circle cx="150" cy="320" r="45" fill="#282828"/><g id="llanta-trasera" transform="translate(150, 320)"><circle r="38" fill="#DDD" stroke="#888" stroke-width="2"/><path d="M 0 -35 L 0 35 M -35 0 L 35 0 M -25 -25 L 25 25 M -25 25 L 25 -25" stroke="#999" stroke-width="3"/><circle r="10" fill="#BBB" stroke="#888"/></g><circle cx="150" cy="320" r="44" fill="url(#grad-rim-shine)" opacity="0.4"/></g><g id="rueda-delantera"><title>Rueda Delantera</title><circle cx="460" cy="320" r="45" fill="#282828"/><g id="llanta-delantera" transform="translate(460, 320)"><circle r="38" fill="#DDD" stroke="#888" stroke-width="2"/><path d="M -10 -35 A 35 35 0 0 1 10 -35 L 5 -25 A 25 25 0 0 0 -5 -25 Z" fill="darkred"/><path d="M 0 -35 L 0 35 M -35 0 L 35 0 M -25 -25 L 25 25 M -25 25 L 25 -25" stroke="#999" stroke-width="3"/><circle r="10" fill="#BBB" stroke="#888"/></g><circle cx="460" cy="320" r="44" fill="url(#grad-rim-shine)" opacity="0.4"/></g></g>
        <g id="frontal"><title>Parte Frontal</title><g id="parrilla-frontal" transform="skewX(-15) translate(25, 0)"><rect x="460" y="240" width="80" height="40" rx="5" fill="#333" stroke="#111"/><line x1="465" y1="250" x2="535" y2="250" stroke="#777" stroke-width="2"/><line x1="465" y1="260" x2="535" y2="260" stroke="#777" stroke-width="2"/><line x1="465" y1="270" x2="535" y2="270" stroke="#777" stroke-width="2"/></g><g id="faro-delantero"><path d="M545,210 L500,205 C490,220 530,230 545,220 Z" fill="url(#grad-headlight)" stroke="#555" filter="url(#glow)"/></g><g id="parachoques-delantero"><path d="M480,340 L550,340 L565,320 L485,315 Z" fill-opacity="0.1" fill="#FFF" /><rect x="495" y="295" width="50" height="15" fill="#222" rx="3" transform="skewX(-15)"/></g></g>
        <g id="trasera"><title>Parte Trasera</title><g id="luz-trasera"><path d="M55,230 L80,235 L85,255 L58,250 Z" fill="#C00" stroke="#A00" stroke-width="1" filter="url(#glow)"/></g><g id="tubo-escape"><ellipse cx="90" cy="345" rx="15" ry="5" fill="#777" stroke="#222"/></g></g>
        <g id="detalles-laterales"><title>Detalles Laterales</title><g id="manilla-puerta"><rect x="295" y="235" width="40" height="8" rx="3" fill="#444" stroke="#222" stroke-width="0.5"/></g><g id="espejo-retrovisor"><path d="M165,215 L150,210 L155,195 L170,200 Z" fill="url(#grad-car-body)" stroke="#222"/></g><path d="M70,260 C200,250 400,265 520,270" stroke="#888" stroke-width="2" fill="none" opacity="0.4"/><g id="antena"><line x1="120" y1="175" x2="100" y2="120" stroke="#333" stroke-width="2"/></g></g>
    </g>
</svg>
            `;
            break;
        case 'bicicleta':
            specificInstructions = `
                **Tipo de Elemento:** Bicicleta.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Estructura del Cuadro:** Dibuja el cuadro, el manillar, el sillín y los pedales con precisión.
                2.  **Ruedas Detalladas:** Las ruedas deben tener radios finos y visibles, conectando el buje con la llanta.
                3.  **Componentes:** Incluye la cadena, los platos y los piñones si la vista lo permite.
                4.  **Líneas Limpias:** Utiliza trazos finos y definidos para una apariencia técnica y ligera.
                5. usa esta estructura para la bicicleta:
                <svg width="512" height="512" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <linearGradient id="grad-metal-frame" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:rgb(180,180,190);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(100,100,110);stop-opacity:1" /></linearGradient>
        <linearGradient id="grad-rubber-tire" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:rgb(60,60,60);stop-opacity:1" /><stop offset="100%" style="stop-color:rgb(40,40,40);stop-opacity:1" /></linearGradient>
    </defs>
    <g id="bicicleta-completa">
        <g id="cuadro" fill="none" stroke="url(#grad-metal-frame)" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><title>Cuadro de la Bicicleta</title><path d="M 200 130 L 400 120 L 280 280 Z" /><line x1="280" y1="280" x2="200" y2="130" /><path d="M 280 280 L 120 300 L 200 130" /></g>
        <g id="direccion"><title>Dirección</title><path id="horquilla" d="M 400 120 L 480 300" stroke="url(#grad-metal-frame)" stroke-width="10" fill="none" stroke-linecap="round" /><line id="potencia" x1="400" y1="120" x2="430" y2="100" stroke="url(#grad-metal-frame)" stroke-width="8" /><path id="manillar" d="M 410 85 L 450 115" stroke="url(#grad-metal-frame)" stroke-width="7" fill="none" stroke-linecap="round" /><g id="puños"><title>Puños</title><circle cx="408" cy="84" r="5" fill="#333"/><circle cx="452" cy="116" r="5" fill="#333"/></g></g>
        <g id="sillin-y-tija"><title>Sillín y Tija</title><line id="tija" x1="200" y1="130" x2="200" y2="100" stroke="#555" stroke-width="8" /><path id="sillin" d="M 170 95 L 230 105 L 220 115 L 175 105 Z" fill="#222" stroke="#111" stroke-width="1"/></g>
        <g id="ruedas"><title>Ruedas</title><g id="rueda-trasera"><title>Rueda Trasera</title><circle cx="120" cy="300" r="80" fill="none" stroke="url(#grad-rubber-tire)" stroke-width="8"/><circle cx="120" cy="300" r="70" fill="none" stroke="#AAA" stroke-width="3"/><line x1="120" y1="300" x2="189" y2="270" stroke="#999" stroke-width="1"/><line x1="120" y1="300" x2="120" y2="230" stroke="#999" stroke-width="1"/><line x1="120" y1="300" x2="51" y2="270" stroke="#999" stroke-width="1"/><line x1="120" y1="300" x2="51" y2="330" stroke="#999" stroke-width="1"/><line x1="120" y1="300" x2="120" y2="370" stroke="#999" stroke-width="1"/><line x1="120" y1="300" x2="189" y2="330" stroke="#999" stroke-width="1"/><circle cx="120" cy="300" r="8" fill="#777" stroke="#555"/></g><g id="rueda-delantera"><title>Rueda Delantera</title><circle cx="480" cy="300" r="80" fill="none" stroke="url(#grad-rubber-tire)" stroke-width="8"/><circle cx="480" cy="300" r="70" fill="none" stroke="#AAA" stroke-width="3"/><line x1="480" y1="300" x2="549" y2="270" stroke="#999" stroke-width="1"/><line x1="480" y1="300" x2="480" y2="230" stroke="#999" stroke-width="1"/><line x1="480" y1="300" x2="411" y2="270" stroke="#999" stroke-width="1"/><line x1="480" y1="300" x2="411" y2="330" stroke="#999" stroke-width="1"/><line x1="480" y1="300" x2="480" y2="370" stroke="#999" stroke-width="1"/><line x1="480" y1="300" x2="549" y2="330" stroke="#999" stroke-width="1"/><circle cx="480" cy="300" r="8" fill="#777" stroke="#555"/></g></g>
        <g id="transmision"><title>Transmisión</title><g id="platos-y-bielas"><circle cx="280" cy="280" r="25" fill="none" stroke="#666" stroke-width="4"/><circle cx="280" cy="280" r="5" fill="#555"/><line x1="280" y1="280" x2="300" y2="220" stroke="#777" stroke-width="6"/><rect x="295" y="210" width="20" height="8" fill="#444"/></g><g id="cassette-trasero"><circle cx="120" cy="300" r="18" fill="none" stroke="#888" stroke-width="3"/></g><path id="cadena" d="M 280 255 C 200 245, 140 270, 120 282 M 120 318 C 180 325, 260 300, 280 305" fill="none" stroke="#444" stroke-width="3" stroke-dasharray="4 2"/></g>
    </g>
</svg>
            `;
            break;
        case 'motocicleta':
            specificInstructions = `
                **Tipo de Elemento:** Motocicleta.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Chasis y Motor:** Dibuja el chasis, el motor visible, el tanque de combustible y el asiento.
                2.  **Ruedas y Suspensión:** Detalla las ruedas, los frenos de disco y las horquillas de suspensión.
                3.  **Manillar y Controles:** Muestra el manillar, los espejos y los controles de forma clara.
                4.  **Materiales:** Simula cromo, metal pintado y goma con brillos y texturas adecuadas.
            `;
            break;
        case 'avion':
            specificInstructions = `
                **Tipo de Elemento:** Avión.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Aerodinámica:** Dibuja el fuselaje, las alas con su forma aerodinámica característica, y la cola (estabilizadores).
                2.  **Motores:** Coloca los motores en la posición correcta (bajo las alas, en la cola, etc.).
                3.  **Cabina y Ventanas:** Dibuja la cabina del piloto y las ventanas de los pasajeros a lo largo del fuselaje.
                4.  **Composición:** Muéstralo en una pose dinámica, como en vuelo o despegando, para mayor impacto.
            `;
            break;
        case 'helicoptero':
            specificInstructions = `
                **Tipo de Elemento:** Helicóptero.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Rotores:** El rotor principal y el rotor de cola son cruciales. Dibuja las palas con precisión. Considera añadir un efecto de desenfoque de movimiento si está en vuelo.
                2.  **Cabina y Fuselaje:** Dibuja la cabina (la "burbuja" de cristal) y el cuerpo principal del helicóptero.
                3.  **Tren de Aterrizaje:** Incluye los patines o ruedas del tren de aterrizaje.
                4.  **Detalles Funcionales:** Añade elementos como la puerta, las tomas de aire y las luces.
            `;
            break;
        case 'barco':
            specificInstructions = `
                **Tipo de Elemento:** Barco.
                **Instrucciones de Dibujo OBLIGATORIAS:**
                1.  **Casco y Cubierta:** Dibuja el casco con su forma hidrodinámica y la cubierta con sus elementos (cabina, barandillas, mástiles si aplica).
                2.  **Superestructura:** Detalla la cabina de mando, las chimeneas o cualquier otra estructura sobre la cubierta.
                3.  **Contexto Acuático:** Sitúa el barco en el agua. Dibuja la línea de flotación y, opcionalmente, una estela o reflejos en la superficie.
                4.  **Escala y Tipo:** Asegúrate de que los detalles coincidan con el tipo de barco (velero, yate, carguero, etc.).
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
        default:
            specificInstructions = `
                **Tipo de Elemento:** ${tipoElemento}.
                **Instrucciones de Dibujo Generales:**
                1.  **Composición:** Centra el elemento principal. Si es un paisaje, usa capas (primer plano, plano medio, fondo) para crear profundidad.
                2.  **Coherencia Visual:** Todos los componentes deben compartir un estilo de iluminación, color y trazo consistente.
                3.  **Volumen y Profundidad:** Utiliza luces y texturas  para evitar un resultado plano.
                4.  **Claridad y Realismo:**  Utiliza perspectivas claras y realistas para dar profundidad y realismo.
                5.  **Estructura:** Usa un orden lógico para organizar los elementos. Los detalles deben estar dentro de los elementos principales.
            `;
    }

    return `
        Eres un diseñador gráfico experto en SVG y un ilustrador técnico. Tu tarea es generar un objeto JSON que contenga metadatos y el código SVG de una imagen, siguiendo un plan de ejecución estricto y detallado.

        PROMPT ORIGINAL DEL USUARIO: "${userPrompt}"

        ==================================================
        PLAN DE EJECUCIÓN OBLIGATORIO (TIENE PRIORIDAD MÁXIMA):
        ${specificInstructions}
        ==================================================

        INSTRUCCIONES FINALES DE FORMATO:
        1.  Ejecuta el PLAN al pie de la letra para crear la imagen.
        2.  Define los metadatos ("nombre", "descripcion", "etiqueta"). La "etiqueta" DEBE ser '${tipoElemento}'.
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

// CORRECCIÓN: Se elimina la función `callApiForGeneratedJson` porque es redundante.
// Se usará `callGenerativeApi` en su lugar.

async function handleGeneration() {
    const userPrompt = DOM.promptInput.value.trim();
    if (!userPrompt) {
        showCustomAlert("Por favor, describe la imagen que quieres crear.");
        return;
    }

    lastGeneratedSceneData = null;
    actualizarUI(true, 'Generando concepto y SVG con la IA...');

    try {
        // CORRECCIÓN: Se pasa la apiKey a la función que la necesita.
        const prompt = await createUnifiedPrompt(userPrompt);
        // CORRECCIÓN: Se usa callGenerativeApi en lugar de la función eliminada.
        const generatedData = await callGenerativeApi(prompt, 'gemini-1.5-pro', true);

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

    // PASO 1: Obtener el prompt detallado.
    const promptDetallado = await createUnifiedPrompt(userPrompt);
    console.log("[Generador Externo SVG] Prompt detallado recibido. Generando JSON y SVG...");

    // PASO 2: Generar el SVG inicial.
    // CORRECCIÓN: Se usa callGenerativeApi con el modelo y la clave correctos.
    const generatedData = await callGenerativeApi(promptDetallado, 'gemini-2.5-flash', true);

// PASO 2.5: Mejorar la imagen con un prompt de texturizado.
    console.log("[Generador Externo SVG] Detallando...");
    // CORRECCIÓN: Se llama a mejorarImagenDesdeSVG con el svgContent del paso anterior.
    const generatedDataMejorada2 = await mejorarImagenDesdeSVG(generatedData.svgContent, 
    "Mejora la conexion entre los elementos del SVG y corrige las formas se vean naturales con lineas organicas y realistas.", 
    'gemini-2.5-flash-lite-preview-06-17');

    // PASO 3: Mejorar la imagen con un prompt de texturizado.
   // console.log("[Generador Externo SVG] Texturizando...");
    // CORRECCIÓN: Se llama a mejorarImagenDesdeSVG con el svgContent del paso anterior.
   // const generatedDataMejorada = await mejorarImagenDesdeSVG(generatedDataMejorada2.svgContent, 
    //"texturiza el SVG con texturas y detalles realistas, manteniendo la coherencia estructural y el estilo realista.", 
    //'gemini-2.5-flash-lite-preview-06-17');

    const { svgContent } = generatedDataMejorada2;
    if (!svgContent) {
        throw new Error("La respuesta de la IA para la generación externa no contenía 'svgContent'.");
    }

    console.log("[Generador Externo SVG] SVG recibido. Convirtiendo a PNG...");
    const pngDataUrl = await svgToPngDataURL(svgContent);
    
    return { imagen: pngDataUrl, svgContent: svgContent };
}


async function mejorarImagenDesdeSVG(svgExistente, userPrompt, modelo = 'gemini-2.5-flash') {
    if (!svgExistente) {
        throw new Error("No se proporcionó un SVG existente para mejorar.");
    }
    // Se actualiza el log para mostrar qué modelo se está usando
    console.log(`[Generador Externo SVG] Iniciando mejora para: "${userPrompt}" usando el modelo: ${modelo}`);

    const prompt = createImprovementPrompt(svgExistente, userPrompt);
    
    // Se usa el parámetro 'modelo' en la llamada a la API
    const svgMejorado = await callGenerativeApi(prompt, modelo, false);

    if (!svgMejorado) {
        throw new Error("La IA no devolvió un SVG mejorado.");
    }

    const pngDataUrl = await svgToPngDataURL(svgMejorado);

    return { imagen: pngDataUrl, svgContent: svgMejorado };
}

async function generarImagenSuperrealistaDesdePrompt(userPrompt, modelConfig = {}) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    console.log(`[Generador Superrealista] Iniciando para: "${userPrompt}"`);

    const defaultModels = {
        // Usamos un modelo rápido para el primer SVG base
        step1: 'gemini-2.5-pro',
        // Usamos un modelo más potente para el refinamiento
        step2: 'gemini-2.5-pro',
        // Y un modelo rápido para el toque final
        step3: 'gemini-2.5-flash'
    };
    const models = { ...defaultModels, ...modelConfig };

    // --- PASO 1: Crear el prompt detallado para la generación inicial ---
    console.log(`[Paso 1/4] Creando prompt de generación inicial...`);
    const initialGenerationPrompt = await createUnifiedPrompt(userPrompt);

    // --- PASO 2: Generar el primer SVG (estructural) a partir del prompt ---
    console.log(`[Paso 2/4] Creando SVG estructural con ${models.step1}...`);
    // Se espera un JSON, así que el último argumento es true
    const initialData = await callGenerativeApi(initialGenerationPrompt, models.step1, true);
    if (!initialData || !initialData.svgContent) {
        throw new Error("La IA no devolvió 'svgContent' en la generación inicial.");
    }
    const structuralSvg = initialData.svgContent;
    // Añadimos un log para depurar y ver qué se generó
    console.log("[Paso 2/4] SVG Estructural generado.");

    // --- PASO 3: Crear el prompt para el refinamiento superrealista ---
    console.log(`[Paso 3/4] Refinando a SVG superrealista con ${models.step2}...`);
    // Ahora sí pasamos el SVG real (structuralSvg) a la función que crea el prompt de mejora.
    // Usamos el prompt 'detalle' original como guía de mejora.
    const superRealisticPrompt = createSuperRealisticPrompt(structuralSvg, 
        `Toma este SVG estructural y transfórmalo en una imagen superrealista. Mejora las texturas, la iluminación, y los detalles anatómicos/estructurales basándote en esta descripción: '${userPrompt}'. Asegúrate de que todas las partes estén perfectamente conectadas y las proporciones sean creíbles.`
    );
    const finalSvg = await callGenerativeApi(superRealisticPrompt, models.step2, false);

    if (!finalSvg || !finalSvg.trim().startsWith('<svg')) {
         console.error("Contenido recibido en el paso final que no es un SVG:", finalSvg);
        throw new Error("La IA no devolvió un SVG válido en el paso de refinamiento final.");
    }
    console.log("[Paso 3/4] SVG Superrealista generado.");

    // --- PASO 4: Convertir el SVG final a PNG ---
    console.log("[Paso 4/4] Convirtiendo a PNG...");
    const pngDataUrl = await svgToPngDataURL(finalSvg);

    console.log("[Generador Superrealista] Proceso completado.");
    return { imagen: pngDataUrl, svgContent: finalSvg };
}

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

 

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);
