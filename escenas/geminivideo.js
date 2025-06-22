
// --- Variables Globales para la Escena y el Modal ---
let localScene, localCamera, localRenderer, localControls;
let modalContainer = null;
let animationFrameId = null;

/**
 * Función principal para generar una escena. Es el punto de entrada.
 * @param {string} userPrompt El texto descriptivo del usuario.
 */
async function generarToma(userPrompt) {
    console.log("Iniciando generación de escena por capas para el prompt:", userPrompt);

    if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined') {
        const errorMsg = "Error: THREE.js o OrbitControls no están cargados globalmente.";
        console.error(errorMsg);
        showModalWithMessage(errorMsg);
        return;
    }

    try {
        // 1. Analizar el prompt del usuario para dividirlo en categorías.
        showModalWithMessage("Analizando tu idea...");
        const analysisResult = await llamarApiYParsearJson(createAnalysisPrompt(userPrompt));
        console.log("Análisis del prompt completado:", analysisResult);
        
        // 2. Generar datos para el cielo y el suelo.
        showModalWithMessage("Creando el mundo (cielo y suelo)...");
        const [ground, sky] = await Promise.all([
            llamarApiYParsearJson(createGroundPrompt(analysisResult.suelo)),
            llamarApiYParsearJson(createSkyPrompt(analysisResult.cielo))
        ]);

        // 3. Generar los objetos en dos pasos para mayor detalle.
        showModalWithMessage("Diseñando elementos gigantes y grandes...");
        const [giant, large] = await Promise.all([
            generarObjetosPorCategoria(analysisResult.gigante, "gigante"),
            generarObjetosPorCategoria(analysisResult.grande, "grande")
        ]);

        showModalWithMessage("Poblando la escena con detalles medianos y pequeños...");
        const [medium, small] = await Promise.all([
            generarObjetosPorCategoria(analysisResult.mediano, "mediano"),
            generarObjetosPorCategoria(analysisResult.pequeno, "pequeno")
        ]);
        
        showModalWithMessage("Ensamblando la escena final...");

        // 4. Combinar los resultados (ya vienen parseados).
        const sceneElements = { sky, ground, giant, large, medium, small };
        console.log("Datos de la escena recibidos:", sceneElements);

        // 5. Construir la escena 3D a partir de todos los elementos.
        buildComplexScene(sceneElements);

    } catch (error) {
        console.error("Error completo en generarToma:", error);
        showModalWithMessage(`Error al generar la escena: ${error.message}. Revisa la consola.`);
    }
}


/**
 * Orquesta la generación de objetos en dos pasos: prediseño y generación de JSON.
 * @param {string} description La descripción inicial de la categoría.
 * @param {string} sizeCategory La categoría de tamaño ('gigante', 'grande', etc.).
 * @returns {Promise<object>} El objeto JSON final con los modelos 3D.
 */
async function generarObjetosPorCategoria(description, sizeCategory) {
    if (!description) {
        return { objects: [] }; // Si no hay descripción, devuelve un objeto vacío.
    }

    console.log(`Iniciando generación en 2 pasos para [${sizeCategory}]: ${description}`);

    // Paso 1: Generar el prediseño textual.
    const preDesignPrompt = createObjectPreDesignPrompt(description);
    const detailedDescription = await llamarApiGeminiInterna(preDesignPrompt);
    console.log(`[${sizeCategory}] Prediseño obtenido:`, detailedDescription);

    // Paso 2: Generar el JSON final usando el prediseño detallado.
    const finalJsonPrompt = createObjectJsonPrompt(detailedDescription, sizeCategory);
    const finalJson = await llamarApiYParsearJson(finalJsonPrompt);
    console.log(`[${sizeCategory}] JSON final generado.`);

    return finalJson;
}


// --- Funciones generadoras de Prompts para la API ---

function createAnalysisPrompt(userPrompt) {
     return `
        Analiza el siguiente prompt de un usuario para una escena 3D: "${userPrompt}".
        Identifica los elementos y clasifícalos en categorías: cielo, suelo, gigante (montañas, cañones), grande (árboles, casas), mediano (coches, rocas) y pequeño (hoguera, flores).
        Genera un JSON con una descripción textual para cada categoría. Si una categoría no tiene elementos, su valor debe ser un string vacío.
        SOLO GENERA EL JSON, SIN TEXTO ADICIONAL NI COMENTARIOS.

        Ejemplo de entrada: "una hoguera rodeada de arboles en las montañas en un cielo de luna llena"
        Ejemplo de salida JSON:
        {
          "cielo": "Un cielo nocturno oscuro con una luna llena brillante y muchas estrellas.",
          "suelo": "Un suelo de hierba verde, un poco irregular.",
          "gigante": "Grandes montañas rocosas en la distancia.",
          "grande": "Varios pinos altos alrededor de la zona central.",
          "mediano": "personas, coches y rocas en la carretera.",
          "pequeno": "Una hoguera crepitante en el centro."
        }
    `;
}

function createSkyPrompt(description) {
    if (!description) {
        return 'Genera un JSON para un cielo simple de color azul claro. La estructura debe ser: { "type": "color", "colors": ["#87CEEB"] }';
    }
    return `
        Genera un JSON para un cielo de Three.js basado en: "${description}".
        - Si es un color sólido, usa type: "color" y un color en "colors".
        - Si es un degradado, usa type: "gradient" y dos colores en "colors".
        - Si hay estrellas, añade un objeto "stars" con "count" y "size".
        - Si hay una luna, añade un objeto "moon" con "size", "color" y "position" (lejos, en el cielo).
        SOLO GENERA EL JSON, SIN TEXTO ADICIONAL NI COMENTARIOS.
        JSON ESTRUCTURA: { "type": "color"|"gradient", "colors": ["#hex1", "#hex2"], "stars": {"count": int, "size": float}, "moon": {"size": float, "color":"#hex", "position": {"x":int, "y":int, "z":int}} }
    `;
}

function createGroundPrompt(description) {
    if (!description) {
        return 'Genera un JSON para un suelo de color marrón por defecto. La estructura debe ser: { "texture": "color", "color": "#A0522D" }';
    }
    return `
        Genera un JSON para un suelo (un plano) en Three.js basado en: "${description}".
        Por ahora, solo implementa la opción de color sólido.
        SOLO GENERA EL JSON, SIN TEXTO ADICIONAL NI COMENTARIOS.
        JSON ESTRUCTURA: { "texture": "color", "color": "#hexcolor" }
    `;
}

/**
 * (Paso 1) Crea el prompt para obtener la descripción textual detallada de un objeto.
 * @param {string} description La descripción inicial.
 * @returns {string} El prompt para la fase de prediseño.
 */
function createObjectPreDesignPrompt(description) {
    return `
        Describe con gran detalle los componentes visuales de lo siguiente para una escena 3D: "${description}".
        Desglosa el objeto en sus partes geométricas básicas (ej: cilindro, cono, esfera), mencionando sus colores y relaciones.
        Si se mencionan varios objetos (ej. "árboles"), describe las características de un solo árbol genérico que luego se pueda replicar.
        El resultado debe ser solo texto descriptivo, no JSON.
        
        Ejemplo de entrada: "Varios pinos altos alrededor de la zona central."
        Ejemplo de salida: "Un pino alto consiste en un tronco cilíndrico de color marrón oscuro (#A0522D) y una copa cónica de color verde intenso (#228B22) que se asienta sobre el tronco."
    `;
}


/**
 * (Paso 2) Crea el prompt para generar el JSON final a partir de una descripción detallada.
 * @param {string} detailedDescription La descripción textual obtenida en el paso 1.
 * @param {string} sizeCategory La categoría de tamaño.
 * @returns {string} El prompt final para generar el JSON.
 */
function createObjectJsonPrompt(detailedDescription, sizeCategory) {
    return `
        Genera un array de objetos 3D para Three.js en JSON basado en la siguiente descripción detallada: "${detailedDescription}".
        La categoría de tamaño es "${sizeCategory}", ajusta las dimensiones de "size" a esta escala (gigante > 100, grande > 10, mediano > 1, pequeño < 1).
        - Para modelos complejos, usa type: "Group" y anida sus partes (tronco y copa) en "children".
        - Define una posición razonable para cada objeto. Si la descripción implica varios objetos, crea al menos 3 instancias con posiciones distintas y ligeras variaciones.
        SOLO GENERA EL JSON, SIN TEXTO ADICIONAL NI COMENTARIOS.
        JSON ESTRUCTURA: { "objects": [{"type": "Box"|"Sphere"|"Cylinder"|"Cone"|"Group", "name": "string", "position": {"x", "y", "z"}, "size": {"width", "height",...}, "color": "#hex", "children": []}] }
    `;
}


/**
 * Construye la escena 3D completa a partir de los datos de todas las capas.
 * @param {object} sceneElements Objeto que contiene los datos parseados de cada capa.
 */
function buildComplexScene(sceneElements) {
    const rendererContainer = document.getElementById('gemini-renderer-container');
    const messageContainer = document.getElementById('gemini-message-container');

    if (!rendererContainer || !messageContainer) {
        console.error("Contenedores del modal no encontrados.");
        return;
    }

    rendererContainer.style.display = 'block';
    messageContainer.style.display = 'none';

    cleanupScene();
    localScene = new THREE.Scene();

    // 1. Configurar el Cielo
    const sky = sceneElements.sky;
    if (sky.type === 'color') {
        localScene.background = new THREE.Color(sky.colors[0]);
    } else if (sky.type === 'gradient' && sky.colors.length >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        const gradient = context.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, sky.colors[0]);
        gradient.addColorStop(1, sky.colors[1]);
        context.fillStyle = gradient;
        context.fillRect(0, 0, 2, 256);
        localScene.background = new THREE.CanvasTexture(canvas);
    }
    if (sky.stars) addStars(sky.stars);
    if (sky.moon) addMoon(sky.moon);

    // 2. Configurar el Suelo
    const ground = sceneElements.ground;
    const groundMaterial = new THREE.MeshStandardMaterial({ color: ground.color || '#8C6854', side: THREE.DoubleSide });
    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    localScene.add(groundMesh);

    // 3. Añadir todos los objetos de todas las categorías.
    const allObjects = [
        ...(sceneElements.giant?.objects || []),
        ...(sceneElements.large?.objects || []),
        ...(sceneElements.medium?.objects || []),
        ...(sceneElements.small?.objects || [])
    ];
    allObjects.forEach(objData => {
        const mesh = createMeshFromData(objData);
        if (mesh) {
            localScene.add(mesh);
        }
    });
    
    // 4. Configurar Cámara
    localCamera = new THREE.PerspectiveCamera(75, rendererContainer.clientWidth / rendererContainer.clientHeight, 0.1, 2000);
    localCamera.position.set(15, 20, 40);
    localCamera.lookAt(0, 0, 0);

    // 5. Configurar Renderizador
    localRenderer = new THREE.WebGLRenderer({ antialias: true });
    localRenderer.setSize(rendererContainer.clientWidth, rendererContainer.clientHeight);
    rendererContainer.innerHTML = '';
    rendererContainer.appendChild(localRenderer.domElement);

    // 6. Configurar Controles
    localControls = new THREE.OrbitControls(localCamera, localRenderer.domElement);
    localControls.enableDamping = true;

    // 7. Añadir Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    localScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(50, 100, 25);
    localScene.add(directionalLight);

    // 8. Iniciar animación
    animateLocal();
}

/**
 * Función recursiva para crear un objeto o grupo de objetos 3D a partir de datos JSON.
 * @param {object} objData Los datos del objeto.
 * @returns {THREE.Object3D | null} El objeto de Three.js creado.
 */
function createMeshFromData(objData) {
    if (objData.type.toLowerCase() === 'group') {
        const group = new THREE.Group();
        if (objData.children && Array.isArray(objData.children)) {
            objData.children.forEach(childData => {
                const childMesh = createMeshFromData(childData);
                if (childMesh) group.add(childMesh);
            });
        }
        group.position.set(objData.position?.x || 0, objData.position?.y || 0, objData.position?.z || 0);
        return group;
    }

    let geometry;
    const material = new THREE.MeshStandardMaterial({ color: objData.color || '#ffffff' });
    const s = objData.size || {};

    switch (objData.type.toLowerCase()) {
        case 'box':
            geometry = new THREE.BoxGeometry(s.width || 1, s.height || 1, s.depth || 1);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(s.radius || 1, 32, 32);
            break;
        case 'cylinder':
            geometry = new THREE.CylinderGeometry(s.radiusTop ?? s.radius ?? 1, s.radiusBottom ?? s.radius ?? 1, s.height || 2, 32);
            break;
        case 'cone':
            geometry = new THREE.ConeGeometry(s.radius || 1, s.height || 2, 32);
            break;
        default:
            return null;
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(objData.position?.x || 0, objData.position?.y || 0, objData.position?.z || 0);
    return mesh;
}


// --- Funciones auxiliares para elementos de la escena ---

function addStars(starData) {
    const starVertices = [];
    for (let i = 0; i < starData.count; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloat(100, 1000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: starData.size });
    const stars = new THREE.Points(starGeometry, starMaterial);
    localScene.add(stars);
}

function addMoon(moonData) {
    const moonGeometry = new THREE.SphereGeometry(moonData.size, 32, 32);
    const moonMaterial = new THREE.MeshBasicMaterial({ color: moonData.color });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.set(moonData.position.x, moonData.position.y, moonData.position.z);
    localScene.add(moon);
}

// --- Funciones de Utilidad y Gestión del DOM/Modal ---

function showModalWithMessage(message) {
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'gemini-video-modal';
        Object.assign(modalContainer.style, {
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(20, 20, 25, 0.95)', color: '#eee', padding: '20px',
            borderRadius: '10px', border: '1px solid #444', zIndex: '10001',
            width: '80%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        });
        document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = `
        <div id="gemini-renderer-container" style="width: 100%; height: 500px; display: none; border-radius: 8px; margin-bottom: 15px;"></div>
        <div id="gemini-message-container" style="font-family: monospace; text-align: center; white-space: pre-wrap; word-wrap: break-word;">${message}</div>
        <button id="close-gemini-modal" style="position: absolute; top: 10px; right: 10px; background: #555; border: none; color: white; cursor: pointer; border-radius: 50%; width: 30px; height: 30px; font-weight: bold;">X</button>
    `;
    modalContainer.style.display = 'flex';
    document.getElementById('close-gemini-modal').addEventListener('click', hideModal);
}

function hideModal() {
    if (modalContainer) {
        modalContainer.style.display = 'none';
        modalContainer.innerHTML = '';
    }
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (localRenderer) {
        localRenderer.dispose();
        localRenderer = null;
    }
    cleanupScene();
}

function cleanupScene() {
    if (!localScene) return;
    while(localScene.children.length > 0){
        const object = localScene.children[0];
        if(object.geometry) object.geometry.dispose();
        if(object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
            } else {
                object.material.dispose();
            }
        }
        localScene.remove(object);
    }
}

function animateLocal() {
    animationFrameId = requestAnimationFrame(animateLocal);
    if (modalContainer && modalContainer.style.display !== 'none' && localRenderer) {
        if(localControls) localControls.update();
        localRenderer.render(localScene, localCamera);
    }
}

/**
 * Extrae un string JSON de un texto más grande y lo limpia de comentarios.
 * @param {string} text El texto que puede contener JSON.
 * @returns {string} El string JSON extraído y limpio.
 */
function extractJson(text) {
    let jsonString = '';

    // 1. Busca un bloque de código JSON markdown y lo extrae.
    const markdownMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch && markdownMatch[1]) {
        jsonString = markdownMatch[1];
    } else {
        // 2. Si no, busca el primer '{' y el último '}'
        const startIndex = text.indexOf('{');
        const endIndex = text.lastIndexOf('}');

        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonString = text.substring(startIndex, endIndex + 1);
        } else {
            // Si no encuentra una estructura JSON básica, devuelve el texto original para que falle.
            return text;
        }
    }
    
    // 3. Elimina las líneas que son solo comentarios de JavaScript.
    const cleanedString = jsonString.replace(/^\s*\/\/.*$/gm, '');
    
    return cleanedString.trim();
}

/**
 * Llama a la API, parsea la respuesta como JSON y reintenta en caso de error.
 * @param {string} prompt El prompt para la API.
 * @param {number} maxRetries El número máximo de reintentos.
 * @returns {Promise<object>} El objeto JSON parseado.
 */
async function llamarApiYParsearJson(prompt, maxRetries = 3) {
    let lastError = null;
    let lastRawResponse = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const rawResponse = await llamarApiGeminiInterna(prompt);
            lastRawResponse = rawResponse; // Capturar la respuesta para el log de errores

            const jsonString = extractJson(rawResponse);
            const parsedJson = JSON.parse(jsonString);
            return parsedJson; // Éxito
        } catch (error) {
            lastError = error;
            console.warn(`Intento ${attempt}/${maxRetries} fallido al parsear JSON. Reintentando...`);
            console.warn(`Error: ${error.message}`);

            if (attempt === maxRetries) {
                console.error("Respuesta de la API que causó el error final:", lastRawResponse);
                const finalError = new Error(`No se pudo obtener una respuesta JSON válida de la API después de ${maxRetries} intentos.`);
                finalError.cause = lastError;
                throw finalError;
            }
            await new Promise(resolve => setTimeout(resolve, 500 * attempt)); // Espera un poco más cada vez
        }
    }
}


/**
 * Función interna para llamar a la API de Gemini.
 * @param {string} prompt El prompt completo para la API.
 * @returns {Promise<string>} La respuesta de texto de la API.
 */
async function llamarApiGeminiInterna(prompt) {
    if (typeof apiKey === 'undefined' || !apiKey) {
        throw new Error("La API Key de Gemini no está definida.");
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) {
        const errorDataText = await response.text();
        throw new Error(`Error de API (${response.status}): ${errorDataText}`);
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        throw new Error("La respuesta de la API no contiene texto válido.");
    }
    return text;
}