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
    const elementType = await callGenerativeApi(classificationPrompt, 'gemini-2.5-flash-lite', false);
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
        const generatedData = await callGenerativeApi(prompt, 'gemini-2.0-flash', true);

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
    const generatedData = await callGenerativeApi(promptDetallado, 'gemini-2.5-flash-lite', true);

// PASO 2.5: Mejorar la imagen con un prompt de texturizado.
    console.log("[Generador Externo SVG] Detallando...");
    // CORRECCIÓN: Se llama a mejorarImagenDesdeSVG con el svgContent del paso anterior.
    const generatedDataMejorada2 = await mejorarImagenDesdeSVG(generatedData.svgContent, 
    "Mejora la conexion entre los elementos del SVG y corrige las formas se vean naturales con lineas organicas y realistas.", 
    'gemini-2.5-flash-lite');

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

  

/**
 * Busca y extrae el primer bloque de código SVG de un texto.
 * @param {string} textoCompleto - La respuesta completa de la API.
 * @returns {string|null} El código SVG o null si no se encuentra.
 */
function extraerBloqueSVG(textoCompleto) {
    if (typeof textoCompleto !== 'string') return null;
    const regex = /<svg[\s\S]*?<\/svg>/;
    const match = textoCompleto.match(regex);
    return match ? match[0] : null;
}

 
 

//gemini-2.5-flash-lite-preview-06-17

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
    // --- INICIO DE LA MODIFICACIÓN PARA STREAMING ---

    // Por convención, la función buscará este elemento para mostrar el efecto "thinking".
    // Debes asegurarte de que este elemento exista en tu HTML si quieres ver el efecto.
    const streamingTargetId = 'ia-streaming-output';
    const outputElement = document.getElementById(streamingTargetId);

    // El efecto de escritura solo se mostrará si no esperamos un JSON y si el elemento existe.
    const showThinkingEffect = !expectJson && outputElement;

    // Si vamos a mostrar el efecto, limpiamos el contenido previo del contenedor.
    if (showThinkingEffect) {
        outputElement.innerHTML = '';
    }

    // Usamos el endpoint de streaming de la API.
    // La variable 'apiKey' debe estar disponible en el scope global.
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

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

    // Si se espera un JSON, lo especificamos en la configuración.
    // El efecto visual no se activará, pero seguiremos usando el stream para obtener la respuesta.
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

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullRawText = ''; // Variable para acumular la respuesta completa.

    // Leemos el stream hasta que se complete.
    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            break; // Se terminó el stream.
        }

        const chunkText = decoder.decode(value);
        const lines = chunkText.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonString = line.substring(6).trim();
                if (!jsonString) continue;

                try {
                    const data = JSON.parse(jsonString);
                    const newText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                    if (newText) {
                        // Acumulamos el texto para el resultado final.
                        fullRawText += newText;

                        // Si el efecto está activado, actualizamos el DOM.
                        if (showThinkingEffect) {
                            // Reemplazamos saltos de línea por <br> para una correcta visualización en HTML.
                            outputElement.innerHTML += newText.replace(/\n/g, '<br>');
                        }
                    }
                } catch (error) {
                    console.warn("Fallo al parsear un chunk del stream (ignorado):", jsonString);
                }
            }
        }
    }

    // --- FIN DE LA MODIFICACIÓN PARA STREAMING ---

    // A partir de aquí, la lógica es la misma que la original, pero usando 'fullRawText'.
    if (!fullRawText) {
        console.error("Respuesta de API inesperada (stream vacío):", fullRawText);
        throw new Error("La IA no devolvió contenido en la respuesta.");
    }

    if (expectJson) {
        try {
                        const jsonLimpio = limpiarYExtraerJson(fullRawText, `modelo ${model}`);
            return JSON.parse(jsonLimpio);

            // Devolvemos el JSON parseado.
          //  return JSON.parse(fullRawText);
        } catch (error) {
            console.error("Fallo al parsear JSON. String recibido:", fullRawText);
            throw new Error(`La respuesta de la API para el modelo ${model} no contenía un JSON válido.`);
        }
    } else {
        // Devolvemos el texto limpio, igual que en la función original.
        return fullRawText.replace(/```svg\n?/, '').replace(/```$/, '');
    }
}

 

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', inicializarEventos);



 
// =======================================================================
// SOLUCIÓN DEFINITIVA (V.6) - ADAPTADA A LA ESTRUCTURA DE DATOS.JS
// Este código está diseñado para funcionar con la forma en que
// 'actualizarListaPersonajes' construye el DOM.
// =======================================================================

/**
 * FUNCIÓN #1 DE 2: Itera sobre los personajes y actualiza el DOM.
 * Utiliza el selector correcto ('.personaje-visual') y guarda el SVG
 * en el atributo 'data-svg-content' del mismo div.
 */
/**
 * Itera sobre los personajes, genera las imágenes faltantes y las inserta
 * en el DOM, guardando el código SVG en el atributo 'data-svg-content'.
 */
 

async function generarImagenesFaltantes() {
    console.log("Iniciando generación de imágenes faltantes...");

    const listaPersonajes = document.querySelector('#personajes #listapersonajes');
    if (!listaPersonajes) return;

    const personajes = listaPersonajes.querySelectorAll('.personaje');
    if (personajes.length === 0) return;
    
    console.log(`Encontrados ${personajes.length} personajes para revisar.`);
    const delay = ms => new Promise(res => setTimeout(res, ms));

    for (const personaje of personajes) {
        const imgElement = personaje.querySelector('img');
        const necesitaImagen = !imgElement || !imgElement.getAttribute('src');

        // --- LÓGICA DE PROMPT MEJORADA ---
        
        // 1. Lee el nombre desde el <input> visible.
        const nombreTexto = personaje.querySelector('.nombreh')?.value.trim() || '';
        
        // 2. Lee la descripción desde el <textarea> del panel de edición, que es la fuente más fiable.
        //    Como alternativa, intenta leer desde el atributo 'data-descripcion'.
         
        // 3. Une ambos textos para crear un prompt más completo y detallado para la IA.
        const userPrompt = `${nombreTexto}  `.trim();
        
        // --- FIN DE LA LÓGICA MEJORADA ---

        // El resto del código solo se ejecuta si hay un prompt válido.
        if (necesitaImagen && !personaje.querySelector('svg') && userPrompt) {
            console.log(`[INFO] Preparando para generar imagen para: "${userPrompt}"`);
            const zonaVisual = personaje.querySelector('.personaje-visual');
            
            try {
                if (!zonaVisual) {
                    console.error(`Error de Estructura: No se encontró '.personaje-visual' para "${userPrompt}".`);
                    continue; 
                }
                
                zonaVisual.innerHTML = '<div class="spinner"></div>';
                
                const resultado = await generarImagenParaDatos(userPrompt);

                if (resultado && resultado.pngUrl && resultado.svgCode) {
                    zonaVisual.innerHTML = `<img src="${resultado.pngUrl}" alt="Imagen generada para ${userPrompt}">`;
                    zonaVisual.setAttribute('data-svg-content', resultado.svgCode);
                    console.log(`[ÉXITO] Imagen para "${userPrompt}" generada.`);
                } else {
                    throw new Error("El proceso de generación no devolvió un resultado completo.");
                }
            } catch (error) {
                console.error(`[FALLO] Proceso para "${userPrompt}" abortado:`, error);
                if (zonaVisual) zonaVisual.innerHTML = '<p style="color: red; text-align: center;">Error</p>';
            } finally {
                console.log('Esperando 8 segundos...');
                await delay(8000); 
            }
        }
    }
}
/**
 * FUNCIÓN #2 DE 2: Orquesta todo el proceso de IA y devuelve un objeto con los resultados.
 * @param {string} userPrompt - El nombre del personaje a generar.
 * @returns {Promise<{pngUrl: string, svgCode: string}|null>} Un objeto con la URL del PNG y el código del SVG, o null si falla.
 */
async function generarImagenParaDatos(userPrompt) {
    try { console.log("paso1");
        // PASO 1: Generar SVG base.
        const promptInicial = `Crea un SVG de "${userPrompt}". Responde solo con el código SVG.`;
        const respuestaSvgInicial = await callGenerativeApi(promptInicial, 'gemini-2.5-flash-lite', false);
        const svgInicial = extraerBloqueSVG(respuestaSvgInicial);
        if (!svgInicial) throw new Error("La IA no generó un SVG base.");

        // PASO 2: Mejorar SVG. 
        console.log("paso2");
        const promptMejora = `Refina este SVG para que sea más realista, añade detalles y texturas: \`\`\`xml\n${svgInicial}\n\`\`\` Responde solo con el nuevo código SVG.`;
        const respuestaSvgMejorado = await callGenerativeApi(promptMejora, 'gemini-2.5-flash-lite', false);
        const svgFinal = extraerBloqueSVG(respuestaSvgMejorado);
        if (!svgFinal) throw new Error("La IA no generó una mejora del SVG.");

        // PASO 3: Convertir a PNG.
        console.log("paso3");
        const pngDataUrl = await svgToPngDataURL(svgFinal);
        if (!pngDataUrl) throw new Error("La conversión de SVG a PNG falló.");

        // DEVOLUCIÓN DEL OBJETO COMPLETO CON LOS DOS DATOS NECESARIOS.
        return { 
            pngUrl: pngDataUrl, 
            svgCode: svgFinal 
        };

    } catch (error) {
        console.error(`[ERROR EN GENERACIÓN] El proceso para "${userPrompt}" falló. Causa:`, error);
        return null;
    }
}


/**
 * Genera una imagen desde un prompt, la guarda en el sistema de datos
 * a través de la función `actualizarVisual` y la devuelve.
 * Esta es la solución que integra la generación con el guardado.
 *
 * @param {string} userPrompt La descripción de la imagen a generar, que también actúa como identificador.
 * @returns {Promise<{imagen: string, svgContent: null, error: string|null}>}
 * Un objeto con la imagen en formato Data URL PNG.
 */

 
async function ultras(userPrompt) { // Renombrada para coincidir con el código que la llama
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
            // Parte 1: Tu instrucción en texto. Es opcional pero muy recomendable.
            {
                "text": "Genera una nueva imagen BASANDOTE EN el promt: " + userPrompt + ". Si vas a crear personajes antropomorficos usa la imagen de referencia solo para las proporciones realistas adaptandolo al genero y edad del personaje, ajusta la pose para ilustrar la esencia del personaje. Si no es un ser antropomorfico, no tengas en cuenta la imagen de referencia para NADA. Los personajes antropomorficos; HAZLO DE CUERPO ENTERO (desde el calzado o los pies hasta la cabeza) CON EL FONDO COLOR CHROMA VERDE Lime / #00ff00 / #0f0 código de color hex PURO. Si es un objeto, artefacto, animal, planta, vehiculo, ropa, comida, personaje, cualquier cosa que sea un elemento aislado, CREALO sobre FONDO COLOR VERDE Lime / #00ff00 / #0f0 código de color hex PURO "
            },
            
            // Parte 2: La imagen. Aquí es donde pegas tu cadena Base64.
            {
                "inlineData": {
                    "mimeType": "image/png", // ¡Importante! Cambia esto a "image/jpeg" o el formato correcto de tu imagen.
                    "data": "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" // <-- REEMPLAZA ESTO CON TU CADENA BASE64 COMPLETA
                }
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

    // --- MEJORA: Lógica de Reintentos ---
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
                let imageToUse = imagePart;

                try {
                    console.log("🖼️ Procesando imagen para quitar fondo verde...");
                    imageToUse = await removeGreenScreen(imagePart);
                    console.log("✅ ¡Imagen procesada con transparencia!");
                } catch (error) {
                    console.error("Fallo el procesamiento de la imagen, se usará la original:", error);
                }

                const base64ImageData = imageToUse.inlineData.data;
                const mimeType = imageToUse.inlineData.mimeType;
                const pngDataUrl = `data:${mimeType};base64,${base64ImageData}`;

                console.log("[Generador] Imagen extraída con éxito. Devolviendo resultado.");

                // Si tenemos éxito, devolvemos el resultado y salimos de la función.
                return { imagen: pngDataUrl, svgContent: null, error: null };

            } else {
                const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen en la respuesta.";
                throw new Error(`La API no devolvió una imagen. Respuesta de texto: ${textResponse}`);
            }

        } catch (error) {
            lastError = error;
            console.error(`[Generador con Guardado] El intento ${attempt} ha fallado:`, error);
            
            // Si no es el último intento, esperamos antes de reintentar.
            if (attempt < maxRetries) {
                console.log("Esperando 2 segundos antes de reintentar...");
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    // Si el bucle termina, significa que todos los intentos fallaron.
    console.error("[Generador con Guardado] Todos los intentos de generación han fallado.");
    return { imagen: null, svgContent: null, error: lastError ? lastError.message : "Error desconocido tras múltiples intentos." };
}
async function ultrascorregir(userPrompt) { // Nombre corregido a 'ultras' para coincidir con el código que la llama
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

    const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation'; // Modelo actualizado a uno más reciente y versátil
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    // --- CAMBIO 1: Payload simplificado ---
    // El prompt es ahora una descripción directa, y se ha eliminado la parte 'inlineData' vacía.
    const payload = {
        "contents": [{
        "parts": [
            // Parte 1: Tu instrucción en texto. Es opcional pero muy recomendable.
            {
                "text": "Genera una nueva imagen BASANDOTE EN el promt: " + userPrompt + ". Si vas a crear personajes antropomorficos usa la imagen de referencia solo para la pose del personaje. Si no es un ser antropomorfico, no tengas en cuenta la imagen de referencia para NADA. Los personajes antropomorficos; HAZLO DE CUERPO ENTERO (desde el calzado o los pies hasta la cabeza) CON EL FONDO COLOR CHROMA VERDE Lime / #00ff00 / #0f0 código de color hex PURO. Si es un objeto, artefacto, animal, planta, vehiculo, ropa, comida, personaje, cualquier cosa que sea un elemento aislado, CREALO sobre FONDO COLOR VERDE Lime / #00ff00 / #0f0 código de color hex PURO"
            },
            
            // Parte 2: La imagen. Aquí es donde pegas tu cadena Base64.
            {
                "inlineData": {
                    "mimeType": "image/png", // ¡Importante! Cambia esto a "image/jpeg" o el formato correcto de tu imagen.
                    "data": "" // <-- REEMPLAZA ESTO CON TU CADENA BASE64 COMPLETA
                }
            }
        ]
    }],
        "generationConfig": {
            "responseMimeType": "application/json", // Pedimos JSON para que la respuesta sea estructurada
        },
        "safetySettings": [
            { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
            { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
        ]
    };

    try {
        console.log("[Generador con Guardado] Enviando petición a la API de Gemini...");
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error?.message || "Unknown API error.";
          //  console.error("API Error Response:", response.status, responseData);
           // throw new Error(`API Error: ${errorMessage}`);
        }

        console.log("[Generador con Guardado] Respuesta de API recibida.");

        // Se busca la parte de la respuesta que contiene la imagen
        const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

        if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
            let imageToUse = imagePart;

            try {
                console.log("🖼️ Procesando imagen para quitar fondo verde...");
                imageToUse = await removeGreenScreen(imagePart);
                console.log("✅ ¡Imagen procesada con transparencia!");
            } catch (error) {
                console.error("Fallo el procesamiento de la imagen, se usará la original:", error);
            }

            const base64ImageData = imageToUse.inlineData.data;
            const mimeType = imageToUse.inlineData.mimeType;
            const pngDataUrl = `data:${mimeType};base64,${base64ImageData}`;

            console.log("[Generador] Imagen extraída. Devolviendo resultado.");

            // --- CAMBIO 2: La función ahora solo devuelve el resultado ---
            // Se ha eliminado la llamada directa a 'actualizarVisual'.
            return { imagen: pngDataUrl, svgContent: null, error: null };

        } else {
            // Si la API no devuelve imagen, se captura la respuesta de texto para depuración.
            const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen en la respuesta.";
            throw new Error(`La API no devolvió una imagen. Respuesta de texto: ${textResponse}`);
        }

    } catch (error) {
        console.error(`[Generador con Guardado] El proceso ha fallado:`, error);
        return { imagen: null, svgContent: null, error: error.message };
    }
}

/**
 * Orquesta la generación de una portada usando IA para un libro específico.
 * Ahora crea un modal para recopilar detalles y los usa para generar la portada.
 * @param {object} libro - El objeto libro al que se le asignará la portada.
 */
async function generarPortadaConIA(libro) {
    // --- 1. CREACIÓN Y GESTIÓN DEL MODAL ---
    // Usamos una promesa para esperar la entrada del usuario desde el modal.
    const obtenerDatosDelModal = new Promise((resolve, reject) => {
         

        const overlay = document.createElement('div');
        overlay.className = 'ia-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'ia-modal-content';
        modal.innerHTML = `
            <h3>Generar Portada con IA</h3>
            <p>Describe los elementos para crear la portada de "${libro.titulo}".</p>
            <form id="ia-portada-form">
                <label for="ia-titulo">Título del Libro:</label>
                <input type="text" id="ia-titulo" value="${libro.titulo}" required>

                <label for="ia-prompt-visual">Descripción Visual (Prompt):</label>
                <textarea id="ia-prompt-visual" rows="4" placeholder="Ej: Un astronauta solitario mirando una nebulosa de colores..." required></textarea>

                <label for="ia-autores">Autor(es):</label>
                <input type="text" id="ia-autores" placeholder="Ej: C.S. Lewis">

                <label for="ia-editorial">Editorial:</label>
                <input type="text" id="ia-editorial" placeholder="Ej: Planeta">

                <div class="ia-modal-buttons">
                    <button type="button" class="btn-cancelar">Cancelar</button>
                    <button type="submit" class="btn-generar">Generar</button>
                </div>
            </form>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const form = modal.querySelector('#ia-portada-form');
        const btnCancel = modal.querySelector('.btn-cancelar');

        const closeModal = () => document.body.removeChild(overlay);

        form.onsubmit = (e) => {
            e.preventDefault();
            const datos = {
                titulo: form.querySelector('#ia-titulo').value,
                promptVisual: form.querySelector('#ia-prompt-visual').value,
                autores: form.querySelector('#ia-autores').value,
                editorial: form.querySelector('#ia-editorial').value,
            };
            closeModal();
            resolve(datos);
        };

        btnCancel.onclick = () => {
            closeModal();
            reject(new Error("Generación cancelada por el usuario."));
        };
        overlay.onclick = (e) => {
             if (e.target === overlay) {
                closeModal();
                reject(new Error("Generación cancelada por el usuario."));
             }
        };
    });

    let datosPortada;
    try {
        // Espera a que el usuario llene y envíe el formulario del modal.
        datosPortada = await obtenerDatosDelModal;
    } catch (error) {
        console.log(error.message);
        return; // Termina la función si el usuario cancela.
    }
    
    // --- 2. LLAMADA A LA API CON LOS DATOS DEL MODAL ---
    
    alert("Generando portada con IA... Esto puede tardar un momento. Por favor, espera.");

    if (typeof apiKey === 'undefined' || !apiKey) {
        alert("Error de configuración: La 'apiKey' global no está definida.");
        return;
    }

    const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

    // ==================== INICIO DE LA CORRECCIÓN ====================
    // Nuevo prompt de texto que utiliza los datos del modal.
    const promptFinal = `Crea una portada de libro artística y profesional.
    - Título del libro (debe ser visible): "${datosPortada.titulo}"
    - Descripción visual de la portada: "${datosPortada.promptVisual}"
    - Nombre del autor (si se proporciona, debe ser visible): "${datosPortada.autores}"
    - Editorial (si se proporciona, inclúyelo discretamente): "${datosPortada.editorial}"
    El diseño debe ser coherente, de alta calidad y adecuado para una portada de libro. 
    En formato vertical panoramico 9/16. 
    El título y el autor y la editorial deben estar bien integrados en la composición. 
    No incluyas el texto del promptVisual en la portada usalo solo para inspirarte y guiarte. `;

    const payload = {
        "contents": [{
            "parts": [
                { "text": promptFinal },
                { "inlineData": { "mimeType": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
            ]
        }],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"]
        },
        // ===================== FIN DE LA CORRECCIÓN ======================
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
            console.log(`Enviando petición para portada (Intento ${attempt}/${maxRetries})...`);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();

            if (!response.ok) {
         //       throw new Error(responseData.error?.message || "Error desconocido de la API.");
            }

            const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart?.inlineData?.data) {
                let imageToUse = imagePart;
                try {
                    if (typeof removeGreenScreen === 'function') {
                        imageToUse = await removeGreenScreen(imagePart);
                    }
                } catch (error) {
                    console.error("Falló el procesamiento de la imagen, se usará la original:", error);
                }

                const pngDataUrl = `data:${imageToUse.inlineData.mimeType};base64,${imageToUse.inlineData.data}`;
                libro.portadaUrl = pngDataUrl;
                renderizarVisorDeLibros();
                console.log(`Portada generada y asignada al libro "${libro.titulo}".`);
                return;

            } else {
                const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
          //      throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
            }

        } catch (error) {
            lastError = error;
            console.error(`Intento ${attempt} fallido:`, error);
            if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    alert(`No se pudo generar la portada. Error: ${lastError?.message || "Error desconocido."}`);
}

/**
 * Genera una imagen utilizando un flujo avanzado de IA de dos pasos:
 * 1. Analiza el texto del frame para identificar personajes existentes.
 * 2. Combina los prompts visuales de los personajes con el texto del frame para generar una imagen contextual.
 * @param {string} escenaId - El ID de la escena que contiene el frame.
 * @param {number} frameIndex - El índice del frame dentro de la escena.
 */
async function generarImagenParaFrameConIA(escenaId, frameIndex) {
    const frame = escenas[escenaId]?.frames?.[frameIndex];
   frame.textContent += estiloArtistico;// Asegura que frame tenga un objeto con texto
    if (!frame || !frame.texto.trim()) {
        alert("Por favor, escribe un texto en el frame antes de generar una imagen.");
        return;
    }

    const userPrompt = frame.texto.trim();
 const capituloDiv = document.querySelector(`.escena[data-id="${escenaId}"]`);
    const frameDiv = capituloDiv ? capituloDiv.querySelectorAll('.frameh')[frameIndex] : null;

    if (typeof apiKey === 'undefined' || !apiKey) {
        alert("Error de configuración: La 'apiKey' global no está definida.");
        return;
    }

    let promptFinal = `Crea una ilustración SIN TEXTO para la siguiente escena: "${userPrompt}". El aspecto debe ser de  16/9 estar en formato panoramico horizontal y ser de alta calidad. 
    EVITA USAR EL TEXTO DE LA ESCENA EN LA IMAGEN.`;

    try {
        // --- FASE 1: ANÁLISIS DE PERSONAJES EN LA ESCENA ---
 if (frameDiv) {
            frameDiv.classList.add('generando-imagen'); // Aplica el borde verde
        }
        // 1. Indexar todos los datos de personajes disponibles
        const datosIndexados = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(p => {
            const nombre = p.querySelector('.nombreh')?.value.trim();
            const descripcion = p.querySelector('.descripcionh')?.value.trim();
            const promptVisual = p.querySelector('.prompt-visualh')?.value.trim();
            if (nombre) {
                datosIndexados.push({ nombre, descripcion, promptVisual });
            }
        });

        // 2. Si hay datos para analizar, pedir a la IA que los identifique en el texto
        if (datosIndexados.length > 0) {
            console.log("Datos indexados para análisis:", datosIndexados);
            const contextoPersonajes = datosIndexados.map(p => `- ${p.nombre}: ${p.descripcion}`).join('\n');

            const promptAnalisis = `
                **Contexto:** Tienes una lista de personajes y sus descripciones:
                ${contextoPersonajes}

                **Tarea:** Lee el siguiente texto de una escena y devuelve ÚNICAMENTE un objeto JSON con una clave "personajes_en_escena" que contenga un array con los NOMBRES EXACTOS de los personajes de la lista que aparecen en el texto. Si no aparece ninguno, devuelve un array vacío.

                **Texto de la escena:** "${userPrompt}"
            `;

            // Llamada a la IA de texto para el análisis
            const respuestaAnalisis = await llamarIAConFeedback(promptAnalisis, "Identificando personajes...", 'gemini-2.0-flash', true);
            
            if (respuestaAnalisis && Array.isArray(respuestaAnalisis.personajes_en_escena)) {
                const nombresPersonajes = respuestaAnalisis.personajes_en_escena;
                console.log("Personajes identificados por la IA:", nombresPersonajes);

                // 3. Construir un prompt visual combinado
                const promptsVisuales = nombresPersonajes
                    .map(nombre => datosIndexados.find(p => p.nombre === nombre)?.promptVisual)
                    .filter(Boolean) // Filtra por si algún prompt visual está vacío
                    .join('. ');

                if (promptsVisuales) {
                    promptFinal += `\n\n**Construye visualmente los personajes y escenas usando estos prompts si esque coinciden:** ${promptsVisuales}`;
                    console.log("Prompt final enriquecido:", promptFinal);
                }
            }
        }

        // --- FASE 2: GENERACIÓN DE IMAGEN CON EL PROMPT FINAL ---
        const MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

        const payload = {
            "contents": [{
                "parts": [
                    { "text": promptFinal },
                    { "inlineData": { "mimeType": "image/png", "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" } }
                ]
            }],
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
                console.log(`Enviando petición para imagen de frame (Intento ${attempt}/${maxRetries})...`);
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const responseData = await response.json();

                if (!response.ok) {
                 //   throw new Error(responseData.error?.message || "Error desconocido de la API.");
                }

                const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

                if (imagePart?.inlineData?.data) {
                    const pngDataUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                    frame.imagen = pngDataUrl;
                    guardarCambios();
                    actualizarLista();
                    console.log(`Imagen generada y asignada al frame ${frameIndex} de la escena "${escenaId}".`);

if (frameDiv) {
            frameDiv.classList.remove('generando-imagen');
        }

                    return; // Éxito
                } else {
                    const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido de imagen.";
              //      throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
                }
            } catch (error) {
                lastError = error;
                console.error(`Intento ${attempt} fallido:`, error);
                if (attempt < maxRetries) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        // Si el bucle termina, todos los intentos fallaron
      //  throw lastError || new Error("Error desconocido tras múltiples intentos.");

    } catch (error) {
        alert(`No se pudo generar la imagen. Error: ${error.message || "Error desconocido."}`);
        console.error("Error en generarImagenParaFrameConIA:", error);
    }



}



async function ultras2(userPrompt) {
    if (!userPrompt) {
        throw new Error("El prompt de usuario no puede estar vacío.");
    }
    console.log(`[Generador SVG Refinado] Iniciando para: "${userPrompt}"`);

    // --- PASO 1: Generar SVG base ---
    console.log("[Generador SVG Refinado] PASO 1: Generando SVG base...");
    const promptInicial = `Crea un SVG simple de un "${userPrompt}". Responde únicamente con el código SVG, sin explicaciones ni otros textos.`;
    
    // Se asume que callGenerativeApi devuelve texto plano cuando el último parámetro es 'false'.
    const respuestaSvgInicial = await callGenerativeApi(promptInicial, 'gemini-2.5-flash-lite', false);
    const svgInicial = extraerBloqueSVG(respuestaSvgInicial);

    if (!svgInicial) {
        console.error("Respuesta recibida en PASO 1:", respuestaSvgInicial);
        throw new Error("La IA no generó un SVG base válido en el primer paso.");
    }
    console.log("[Generador SVG Refinado] SVG base generado.");

    // --- PASO 2: Mejorar el SVG ---
    console.log("[Generador SVG Refinado] PASO 2: Refinando el SVG...");
    const promptMejora = `Refina y mejora el siguiente código SVG para que sea más detallado, realista y visualmente atractivo. Añade texturas, sombras sutiles y líneas orgánicas. Responde únicamente con el nuevo código SVG completo y mejorado:\n\`\`\`xml\n${svgInicial}\n\`\`\``;
    
    const respuestaSvgMejorado = await callGenerativeApi(promptMejora, 'gemini-2.5-flash-lite', false);
    const svgFinal = extraerBloqueSVG(respuestaSvgMejorado);

    if (!svgFinal) {
        console.error("Respuesta recibida en PASO 2:", respuestaSvgMejorado);
        // Opcional: si la mejora falla, podrías decidir usar el SVG inicial en lugar de lanzar un error.
        // Por ejemplo: svgFinal = svgInicial;
        throw new Error("La IA no generó una mejora del SVG en el segundo paso.");
    }
    console.log("[Generador SVG Refinado] SVG refinado con éxito.");

    // --- PASO FINAL: Convertir a PNG y devolver ---
    console.log("[Generador SVG Refinado] Convirtiendo SVG final a PNG...");
    const pngDataUrl = await svgToPngDataURL(svgFinal);

    return { imagen: pngDataUrl, svgContent: svgFinal };
}





/**
 * Detecta un fondo verde croma, lo elimina, neutraliza el "spill" de color en los bordes y recorta.
 * @param {object} imagePart El objeto de imagen original (formato Gemini).
 * @returns {Promise<object>} El objeto de imagen procesado y recortado.
 */
async function removeGreenScreen(imagePart) {
    if (!imagePart?.inlineData?.data) {
        throw new Error("El objeto imagePart para procesar no es válido.");
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            // --- PASO 1: Detectar el color del fondo (solo verdes croma) ---
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            let data = imageData.data;
            const greenColorCounts = new Map();
            const borderSize = 10;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    // Solo analizamos los píxeles de los bordes
                    if (x < borderSize || x >= canvas.width - borderSize || y < borderSize || y >= canvas.height - borderSize) {
                        const index = (y * canvas.width + x) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];

                        // ¡FILTRO MEJORADO! Solo contamos los píxeles que son claramente "verde croma".
                        // Esto evita que se seleccionen fondos de otros colores (blanco, azul, etc.).
                        if (g > r * 1.3 && g > b * 1.3 && g > 90) {
                            const key = `${r},${g},${b}`;
                            greenColorCounts.set(key, (greenColorCounts.get(key) || 0) + 1);
                        }
                    }
                }
            }

            let dominantColorKey = '';
            let maxCount = 0;
            // Buscamos el verde más común entre los que pasaron el filtro
            for (const [key, count] of greenColorCounts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColorKey = key;
                }
            }
            
            if (!dominantColorKey) {
                return reject(new Error("No se pudo detectar un color verde croma dominante en los bordes."));
            }

            const [chromaR, chromaG, chromaB] = dominantColorKey.split(',').map(Number);

            // --- PASO 2: Eliminar el fondo con un borde suave (tolerancia dual) ---
            const hardTolerance = 35;
            const softTolerance = 70;

            for (let i = 0; i < data.length; i += 4) {
                const distance = Math.sqrt(
                    Math.pow(data[i] - chromaR, 2) +
                    Math.pow(data[i + 1] - chromaG, 2) +
                    Math.pow(data[i + 2] - chromaB, 2)
                );

                if (distance < hardTolerance) {
                    data[i + 3] = 0;
                } else if (distance < softTolerance) {
                    const ratio = (distance - hardTolerance) / (softTolerance - hardTolerance);
                    data[i + 3] = Math.floor(data[i + 3] * ratio);
                }
            }
            
            // --- PASO 3: Limpieza de Bordes (De-spill) ---
            // Neutraliza el "halo" verdoso que queda en los bordes.
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                // Si el píxel es visible y tiene un tinte verdoso...
                if (a > 0 && g > r && g > b) {
                    // Reduce la intensidad del verde, ajustándolo al promedio de rojo y azul.
                    const newGreen = (r + b) / 2;
                    data[i + 1] = newGreen;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            // --- PASO 4: Recortar el espacio transparente (autocrop) ---
            let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const alpha = data[(y * canvas.width + x) * 4 + 3];
                    if (alpha > 0) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            if (maxX === -1) {
                resolve({ inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' }});
                return;
            }

            const cropWidth = maxX - minX + 1;
            const cropHeight = maxY - minY + 1;
            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = cropWidth;
            cropCanvas.height = cropHeight;
            const cropCtx = cropCanvas.getContext('2d');
            cropCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            const newBase64Url = cropCanvas.toDataURL('image/png');
            const newBase64Data = newBase64Url.split(',')[1];

            resolve({
                inlineData: {
                    mimeType: 'image/png',
                    data: newBase64Data
                }
            });
        };

        img.onerror = (err) => reject(new Error("Error al cargar la imagen Base64 para procesarla. Detalles: " + err.message));
        img.src = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    });
}
/**
 * Genera en lote imágenes para el frame actual y los 8 siguientes.
 * @param {string} capituloId - El ID del capítulo que contiene los frames.
 * @param {number} startIndex - El índice del frame inicial en el array de frames del capítulo.
 */
//================================================================================
// DENTRO DE generador.js - FUNCIÓN EN SERIE MODIFICADA
//================================================================================

async function generarMultiplesImagenesParaFrameConIA(capituloId, startIndex) {
    const capitulo = escenas[capituloId];
    if (!capitulo) {
        alert("Error: No se encontró el capítulo activo.");
        return;
    }

    const BATCH_SIZE = 9;
    const framesParaProcesar = capitulo.frames.slice(startIndex, startIndex + BATCH_SIZE);

    if (framesParaProcesar.length === 0) {
        // No hay necesidad de una alerta aquí, un log es suficiente.
        console.warn("No hay frames suficientes para iniciar la generación en lote.");
        return;
    }

    // ELIMINADO: El diálogo de confirmación para una experiencia más fluida.
    // if (!confirm(`...`)) {
    //     return;
    // }
    
    if (typeof mostrarIndicadorCarga !== 'function') {
        console.error("La función global 'mostrarIndicadorCarga' no fue encontrada.");
        alert("Error crítico: La función del indicador de carga no está disponible.");
        return;
    }

    mostrarIndicadorCarga(true, `Iniciando lote de ${framesParaProcesar.length} imágenes...`);

    try {
        for (let i = 0; i < framesParaProcesar.length; i++) {
            const frameIndexActual = startIndex + i;
            const frame = framesParaProcesar[i];
            
            mostrarIndicadorCarga(true, `Generando imagen ${i + 1} de ${framesParaProcesar.length}...`);

            if (frame.imagen || !frame.texto.trim()) {
                console.log(`Saltando el frame en el índice ${frameIndexActual} porque ya tiene imagen o le falta texto.`);
                continue;
            }

            // Esta llamada ya contiene la nueva lógica del borde verde.
            // El borde aparecerá en el frame actual, y desaparecerá cuando 
            // `actualizarLista()` se llame al final de la generación de esa imagen.
            await generarImagenParaFrameConIA(capituloId, frameIndexActual);
            
            // Pausa para evitar sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        alert(`Generación en lote de ${framesParaProcesar.length} imágenes ha finalizado.`);

    } catch (error) {
        console.error("Ocurrió un error durante la generación en lote de frames:", error);
        alert("Ocurrió un error durante la generación en lote. Consulta la consola para más detalles.");
    } finally {
        mostrarIndicadorCarga(false);
    }
}