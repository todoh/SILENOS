/**
 * Director de Escena Interactivo - animacion2d.js (Versión 3D Unificada y Corregida)
 *
 * MEJORAS EN ESTA VERSIÓN:
 * - Código Reestructurado: Se ha reorganizado y limpiado todo el código para eliminar duplicados y corregir errores de referencia ('ReferenceError').
 * - Sistema Unificado: Los personajes 2D ahora son Sprites que existen y se mueven en el mundo 3D de Three.js.
 * - Coordenadas 3D: Toda la lógica de movimiento y posicionamiento utiliza vectores (x, y, z).
 * - IA 3D-Aware: El prompt y el schema se han actualizado para que la IA defina posiciones en 3D.
 * - Motor de Animación Robusto: La lógica de procesamiento de acciones y actualización de estado ha sido reescrita para trabajar nativamente con objetos de Three.js.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- I. REFERENCIAS AL DOM ---
    const scriptInput = document.getElementById('script-input');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const analyzeIcon = document.getElementById('analyze-icon');
    const elementsSection = document.getElementById('elements-section');
    const elementsList = document.getElementById('elements-list');
    const renderButton = document.getElementById('render-button');
    const threeContainer = document.getElementById('three-container');
    const canvasContainer = document.getElementById('canvas-container');
    const canvasPlaceholder = document.getElementById('canvas-placeholder');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // Verificación robusta de que todos los elementos existen
    if (!scriptInput || !analyzeButton || !threeContainer || !canvasContainer) {
        console.error("Error crítico: Falta uno o más elementos esenciales del DOM en index.html.");
        if (errorText) errorText.textContent = "Error de configuración: Faltan elementos HTML. Revisa la consola.";
        if (errorMessage) errorMessage.classList.remove('oculto');
        return;
    }

    console.log("--- [OK] Cargado animacion2d.js v3D-Unificada ---");

    // --- II. ESTADO DE LA APLICACIÓN ---
    let requiredElements = [],
        loadedImages = {},
        animationSequence = [];
    let elementStates = {};
    let animationLoopId = null,
        currentActionIndex = 0;
    let threeScene, threeCamera, threeRenderer, textureLoader;
  

    // Objeto NUEVO para gestionar el estado y los objetivos de la cámara
    let cameraState = {
        isMoving: false,
        isZooming: false,
        isFollowing: false,
            isOrbiting: false, // <-- NUEVO
        followTarget: null,
        orbitTarget: null, // <-- NUEVO: El nombre del sprite a orbitar
        orbitRadius: 30,   // <-- NUEVO: Distancia de la órbita
        orbitAngle: 0,     // <-- NUEVO: Ángulo actual en la órbita
        orbitSpeed: 0.005, // <-- NUEVO: Velocidad de la órbita
        followOffset: new THREE.Vector3(0, 7, 20), // Distancia a la que seguir al objetivo
        targetPosition: new THREE.Vector3(0, 15, 35), // A donde se debe mover la cámara
        targetLookAt: new THREE.Vector3(0, 0, 0),     // Hacia donde debe mirar
        targetZoom: 1.0,                              // Nivel de zoom objetivo
        moveSpeed: 0.02, // Velocidad de interpolación (lerp)
        zoomSpeed: 0.02
    };

    const skyColors = {
        "dia": "#87CEEB",
        "atardecer": "#FF7F50",
        "noche": "#0b0b23",
        "amanecer": "#FFDAB9",
        "nublado": "#B0C4DE"
    };

    const savedImages = {
        "Gorila": "https://raw.githubusercontent.com/todoh/SILENOS/refs/heads/main/img/gorila.png",
        "Orangutan": "img/orangutan.png",
        "Pino": "img/pino.png",
        "Camino": "img/caminodesal.png",
        "Mago": "img/alto_mago.png",
        "Cohete": "img/cohete.png",
        "Muralla Driyes": "img/muralla_driyes.png",
        "Llanura Nevada": "img/llanura_nevada.png",
        "Cima Nevada": "img/cima_nevada.png",
        "Textura Hierba": "img/textura_cesped.jpg",
        "Textura Tierra": "img/textura_tierra.jpg",
        "Textura Nieve": "img/textura_nieve.jpg",
        "Aguila": "img/aguila.png",
        "Buho": "img/buho.png",
        "Unicornio": "img/unicornio.png",
        "Lobo": "img/lobo.png",
        "Caballo": "img/caballo.png",
        "Zebra": "img/zebra.png",
        "Caracol": "img/caracol.png",
        "Jirafa": "img/jirafa.png",
        "Luciernaga": "img/luciernaga.png",
        "Polilla": "img/polilla.png",
    };
    const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=';

    // --- III. EVENTOS ---
    analyzeButton.addEventListener('click', handleAnalyzeScript);
    renderButton.addEventListener('click', handleRenderScene);
    new ResizeObserver(resizeAllCanvas).observe(canvasContainer);


    // --- IV. FUNCIONES DE UI Y AUXILIARES ---
    function setAnalyzeLoading(isLoading) {
        analyzeButton.disabled = isLoading;
        loadingSpinner.classList.toggle('oculto', !isLoading);
        analyzeIcon.classList.toggle('oculto', isLoading);
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('oculto');
    }

    function hideError() {
        errorMessage.classList.add('oculto');
    }

    function resetUI() {
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        animationLoopId = null;
        if (threeRenderer) {
            while (threeScene.children.length > 0) {
                const object = threeScene.children[0];
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (object.material.map) object.material.map.dispose();
                    object.material.dispose();
                }
                threeScene.remove(object);
            }
            threeContainer.innerHTML = '';
            threeRenderer = null;
        }
        canvasPlaceholder.classList.remove('oculto');
        elementsSection.classList.add('oculto');
        elementsList.innerHTML = '';
        renderButton.disabled = true;
        renderButton.classList.remove('pulse-animation');
        requiredElements = [];
        loadedImages = {};
        animationSequence = [];
        elementStates = {};
    }

    function getContrastingTextColor(hexColor) {
        if (!hexColor) return '#000';
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000' : '#FFF';
    }


async function traducirGuionNaturalATecnico(guionUsuario) {
        console.log("Paso 1: Traduciendo guion del usuario a lenguaje técnico...");
        const listaAccionesDisponibles = [
            "entrar", "salir", "moverse_hacia", "hablar", "saltar", "girar", "temblar", "parpadear", 
            "agrandarse", "encogerse", "desvanecerse", "aparecer_gradualmente", "mirar_a", "esperar",
            "camara_mover_a", "camara_hacer_zoom", "camara_seguir_elemento", "camara_mirar_a", "camara_girar_en_torno_a"
        ].join(', ');

        const prompt = `Eres un director de animación que traduce las peticiones de un humano a un guion técnico.
        
        **Petición del Usuario (Lenguaje Natural):**
        ---
        ${guionUsuario}
        ---

        **Tu Tarea:**
        Convierte la petición del usuario en una secuencia de comandos técnicos claros y secuenciales. Utiliza el siguiente vocabulario de acciones. Sé explícito con las coordenadas 3D (x, y, z) y otros parámetros cuando sea necesario.

        **Vocabulario Técnico Disponible:**
        -   **Elementos:** Cualquier personaje u objeto mencionado, y la palabra clave 'camara'.
        -   **Acciones:** ${listaAccionesDisponibles}
        -   **Parámetros:**
            -   'posicion': {x, y, z}
            -   'objetivo': "NombreDeOtroElemento"
            -   'dialogo': "Texto a decir"
            -   'nivel_zoom': 1.0 (normal), >1.0 (acercar), <1.0 (alejar)
            -   'distancia': número (para la órbita de la cámara)

        **Ejemplo de Traducción:**
        -   **Usuario dice:** "Un gorila aparece en el centro y saluda. La cámara le hace un primer plano."
        -   **Tu traducción técnica sería:**
            Un Gorila entra y se posiciona en x:0 y:0 z:0.
            El Gorila habla: "Hola a todos".
            La cámara mira al Gorila.
            La cámara hace zoom a un nivel de 1.8.

        **Salida Esperada:**
        Devuelve únicamente el texto del guion técnico traducido.
        `;

        try {
            const response = await fetch(API_URL_BASE + apiKey, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
            });

            if (!response.ok) throw new Error(`Error de la API en la traducción: ${response.status}`);
            const result = await response.json();
            const guionTecnico = result.candidates[0].content.parts[0].text;
            if (!guionTecnico) throw new Error("La IA no devolvió un guion técnico.");
            
            console.log("Guion Técnico Generado:", guionTecnico);
            scriptInput.value = guionTecnico; // Opcional: mostrar al usuario el guion técnico
            return guionTecnico;

        } catch (error) {
            showError(`Error en el Paso 1 (Traducción): ${error.message}`);
            throw error; // Lanzar el error para detener el proceso
        }
    }

    // ===================================================================
    // --- PASO 2: ANÁLISIS DEL GUION TÉCNICO (Función anterior) ---
    // ===================================================================
    async function analizarGuionTecnico(scriptText) {
        console.log("Paso 2: Analizando guion técnico para extraer JSON...");
        const prompt = `Actúa como un director de animación 3D experto. Analiza el siguiente guion TÉCNICO y genera un JSON para controlar la escena.
        
        MI BIBLIOTECA DE IMÁGENES (claves exactas):
        ${Object.keys(savedImages).join(', ')}

        GUION TÉCNICO: "${scriptText}"

        INSTRUCCIONES:
        1.  **Escenario 3D:** Define 'textura_suelo' y 'momento_del_dia'.
        2.  **Elementos:** Identifica todos los personajes y objetos. Mapea los que existan en mi biblioteca y requiere los que no.
        3.  **Acciones:** Genera la secuencia de 'acciones' para los elementos Y PARA LA CÁMARA.`;
        
        const schema = { /* ... (tu schema completo va aquí, sin cambios) ... */ };

        try {
            const response = await fetch(API_URL_BASE + apiKey, { /* ... (tu llamada a la API sin cambios) ... */ });
            // ... (resto de la lógica de la función sin cambios) ...
            const result = await response.json();
            const parsed = JSON.parse(result.candidates[0].content.parts[0].text || '{}');
            return parsed;
        } catch (error) {
            showError(`Error en el Paso 2 (Análisis): ${error.message}`);
            throw error;
        }
    }
    
    // ===================================================================
    // --- FUNCIÓN ORQUESTADORA PRINCIPAL ---
    // ===================================================================
    async function handleMasterProcess() {
        const guionUsuario = scriptInput.value.trim();
        if (!guionUsuario) {
            showError("Por favor, escribe un guion.");
            return;
        }
        if (typeof apiKey === 'undefined' || !apiKey) {
            showError("La API Key de Google no está configurada.");
            return;
        }

        hideError();
        setAnalyzeLoading(true);
        resetUI();

        try {
            // PASO 1
            const guionTecnico = await traducirGuionNaturalATecnico(guionUsuario);
            
            // PASO 2
            const parsed = await analizarGuionTecnico(guionTecnico);
            
            console.log("Respuesta de la API (3D):", parsed);

            const { escenario, acciones = [] } = parsed;
            const elementos_mapeados = Array.isArray(parsed.elementos_mapeados) ? parsed.elementos_mapeados : [];
            const elementos_requeridos = Array.isArray(parsed.elementos_requeridos) ? parsed.elementos_requeridos : [];

            animationSequence = acciones;
            requiredElements = elementos_requeridos;

            if (escenario && escenario.textura_suelo && savedImages[escenario.textura_suelo]) {
                loadedImages['textura_suelo'] = { dataUrl: savedImages[escenario.textura_suelo], momento_del_dia: escenario.momento_del_dia };
            }
            
            elementos_mapeados.forEach(el => {
                if (el && el.mapeo && savedImages[el.mapeo]) {
                    loadedImages[el.nombre] = { dataUrl: savedImages[el.mapeo] };
                }
            });

            displayElementLoaders(elementos_mapeados, escenario);

        } catch (error) {
            console.error("Fallo en el proceso maestro:", error);
            // La función específica que falló ya debería haber mostrado un error.
        } finally {
            setAnalyzeLoading(false);
        }
    }



    // --- V. LÓGICA DE ANÁLISIS (ADAPTADA PARA 3D) ---
    // EN: datos/animacion2d.js

async function handleAnalyzeScript() {
    const scriptText = scriptInput.value.trim();
    if (!scriptText) {
        showError("Por favor, escribe un guion.");
        return;
    }
    if (typeof apiKey === 'undefined' || !apiKey) {
        showError("La API Key de Google no está configurada.");
        return;
    }

    hideError();
    setAnalyzeLoading(true);
    resetUI();

    // El prompt y el schema no necesitan cambios para esta corrección
    const prompt = `Actúa como un director de animación 3D experto. Analiza el guion y genera un JSON para controlar una escena en Three.js.
    
    MI BIBLIOTECA DE IMÁGENES (claves exactas):
    ${Object.keys(savedImages).join(', ')}

    GUION: "${scriptText}"

    SISTEMA DE COORDENADAS:
    - El suelo es un plano en Y=0.
    - X: Izquierda / Derecha.
    - Y: Altura. Un personaje de altura media sobre el suelo estaría en Y=5.
    - Z: Profundidad. Z>0 está más cerca del espectador, Z<0 está más lejos. El centro de la escena es Z=0.

    INSTRUCCIONES:
    1.  **Escenario 3D:** Define 'textura_suelo' y 'momento_del_dia'.
    2.  **Elementos:** Identifica todos los personajes y objetos. Mapea los que existan en mi biblioteca y requiere los que no.
    3.  **Acciones:** Genera la secuencia de 'acciones' para los elementos Y PARA LA CÁMARA.
        -   **Acciones de Elementos:** 'entrar', 'salir', 'moverse_hacia', 'saltar', 'girar', 'agrandarse', 'encogerse', 'hablar', etc. Para movimientos, añade una propiedad "posicion" con {x, y, z}.
        -   **Acciones de Cámara:** ...
                -   'moverse_a': Mueve la cámara a una nueva {x, y, z}.
                -   'hacer_zoom': Cambia el nivel de zoom...
                -   'seguir_elemento': La cámara seguirá a un 'objetivo'.
                -   'mirar_a': Apunta la cámara hacia un 'objetivo'...
                -   'girar_en_torno_a': Orbita la cámara alrededor de un 'objetivo' a una 'distancia' específica.`;
        
    const schema = {
        type: "OBJECT",
        properties: {
            escenario: {
                type: "OBJECT",
                properties: { textura_suelo: { type: "STRING" }, momento_del_dia: { type: "STRING", enum: Object.keys(skyColors) } },
                required: ["textura_suelo", "momento_del_dia"]
            },
            elementos_mapeados: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: { nombre: { type: "STRING" }, mapeo: { type: "STRING" } },
                    required: ["nombre", "mapeo"]
                }
            },
            elementos_requeridos: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: { nombre: { type: "STRING" }, tipo: { type: "STRING" }, tamaño: { type: "STRING" } },
                    required: ["nombre", "tipo"]
                }
            },
            acciones: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        elemento: { type: "STRING", description: "El nombre del elemento o la palabra clave 'camara'." },
                        accion: { type: "STRING", enum: [
                            "entrar", "salir", "moverse_hacia", "hablar", "saltar", "girar", "temblar", "parpadear", 
                            "agrandarse", "encogerse", "desvanecerse", "aparecer_gradualmente", "mirar_a", "esperar",
                            "camara_mover_a", "camara_hacer_zoom", "camara_seguir_elemento", "camara_mirar_a", "camara_girar_en_torno_a"
                        ]},
                        objetivo: { type: "STRING" },
                        dialogo: { type: "STRING" },
                        posicion: {
                            type: "OBJECT",
                            properties: { x: { type: "NUMBER" }, y: { type: "NUMBER" }, z: { type: "NUMBER" } }
                        },
                        nivel_zoom: { type: "NUMBER", description: "Nivel de zoom. 1.0 es normal." },
                        // El campo "distancia" AHORA ESTÁ DENTRO de "properties", que es el lugar correcto.
                        distancia: { type: "NUMBER", description: "Distancia (radio) para la órbita de la cámara." }
                    },
                    required: ["elemento", "accion"]
                }
            }
        },
        required: ["escenario", "acciones"]
    };

    try {
        const response = await fetch(API_URL_BASE + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json", responseSchema: schema }
            })
        });

        if (!response.ok) {
            let errorDetails = `Código de estado: ${response.status}.`;
            try {
                const errorData = await response.json();
                if (errorData && errorData.error && errorData.error.message) {
                    errorDetails += ` Detalles: ${errorData.error.message}`;
                }
            } catch (e) {
                errorDetails += ` No se pudo obtener más información del cuerpo del error.`;
            }
            throw new Error(`Error de la API. ${errorDetails}`);
        }

        const result = await response.json();

        if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
            console.error("Respuesta inesperada de la API:", result);
            throw new Error("La API devolvió una respuesta con un formato inesperado.");
        }

        const parsed = JSON.parse(result.candidates[0].content.parts[0].text);

        console.log("Respuesta de la API (3D):", parsed);

        // ===== INICIO DE LA CORRECCIÓN CLAVE =====
        
        // Extraemos las propiedades de forma segura
        const { escenario, acciones = [] } = parsed;
        
        // Nos aseguramos de que 'elementos_mapeados' y 'elementos_requeridos' sean siempre arrays
        const elementos_mapeados = Array.isArray(parsed.elementos_mapeados) ? parsed.elementos_mapeados : [];
        const elementos_requeridos = Array.isArray(parsed.elementos_requeridos) ? parsed.elementos_requeridos : [];

        animationSequence = acciones;
        requiredElements = elementos_requeridos;

        // ===== FIN DE LA CORRECCIÓN CLAVE =====

        if (escenario && escenario.textura_suelo && savedImages[escenario.textura_suelo]) {
            loadedImages['textura_suelo'] = { dataUrl: savedImages[escenario.textura_suelo], momento_del_dia: escenario.momento_del_dia };
        }
        
        // Ahora, esta línea ya no dará error porque nos hemos asegurado de que 'elementos_mapeados' es un array.
        elementos_mapeados.forEach(el => {
            if (el && el.mapeo && savedImages[el.mapeo]) {
                loadedImages[el.nombre] = { dataUrl: savedImages[el.mapeo] };
            }
        });

        displayElementLoaders(elementos_mapeados, escenario);
    } catch (error) {
        console.error("Error detallado en handleAnalyzeScript:", error);
        showError(`Error al analizar: ${error.message}`);
    } finally {
        setAnalyzeLoading(false);
    }
}


    // --- VI. FUNCIONES DE CARGA Y VISUALIZACIÓN ---
    function displayElementLoaders(mapped, scenario) {
        elementsList.innerHTML = '';
        if (scenario) {
            const div = document.createElement('div');
            div.className = 'lista-elementos__mapeados';
            const skyColor = skyColors[scenario.momento_del_dia] || '#ccc';
            const textColor = getContrastingTextColor(skyColor);
            div.innerHTML = `<h4>Escenario:</h4><ul><li>Suelo: <b>${scenario.textura_suelo}</b></li><li>Cielo: <b style="background:${skyColor}; color: ${textColor}; padding: 2px 6px; border-radius: 4px; text-transform: capitalize;">${scenario.momento_del_dia}</b></li></ul>`;
            elementsList.appendChild(div);
        }
        if (mapped && mapped.length > 0) {
            const div = document.createElement('div');
            div.className = 'lista-elementos__mapeados';
            div.innerHTML = `<h4>Elementos de Biblioteca:</h4><ul>${mapped.map(el => `<li><b>${el.nombre || 'Desconocido'}</b> → <em>"${el.mapeo || 'Desconocido'}"</em></li>`).join('')}</ul>`;
            elementsList.appendChild(div);
        }
        if (requiredElements && requiredElements.length > 0) {
            const title = document.createElement('h4');
            title.textContent = 'Subir Imágenes Requeridas:';
            elementsList.appendChild(title);
            requiredElements.forEach(el => {
                const item = document.createElement('div');
                item.className = 'lista-elementos__item';
                item.innerHTML = `<label class="lista-elementos__label">${el.nombre} (${el.tipo || 'personaje'})</label><input type="file" accept="image/*" data-element-name="${el.nombre}" class="lista-elementos__input">`;
                item.querySelector('input').addEventListener('change', handleImageUpload);
                elementsList.appendChild(item);
            });
        }
        elementsSection.classList.remove('oculto');
        if (!requiredElements || requiredElements.length === 0) {
            renderButton.disabled = false;
            renderButton.classList.add('pulse-animation');
        }
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            loadedImages[event.target.dataset.elementName] = { dataUrl: e.target.result };
            event.target.previousElementSibling.textContent += ' ✔️';
            if (requiredElements.every(el => loadedImages[el.nombre])) {
                renderButton.disabled = false;
                renderButton.classList.add('pulse-animation');
            }
        };
        reader.readAsDataURL(file);
    }

    // --- VII. MOTOR DE RENDERIZADO 3D UNIFICADO ---

    function initThreeScene(momentoDelDia, groundTex) {
        const skyColor = skyColors[momentoDelDia] || skyColors['dia'];

        threeScene = new THREE.Scene();
        threeScene.background = new THREE.Color(skyColor);

        const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        threeCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        threeCamera.position.set(0, 15, 35);
        threeCamera.lookAt(0, 0, 0);

        threeScene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(5, 20, 15);
        threeScene.add(dirLight);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, side: THREE.DoubleSide });
        const groundPlane = new THREE.Mesh(groundGeo, groundMat);
        groundPlane.rotation.x = -Math.PI / 2;
        threeScene.add(groundPlane);

        threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        threeRenderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
        threeContainer.innerHTML = '';
        threeContainer.appendChild(threeRenderer.domElement);
    }

    function initializeActorSprites(loadedTextures) {
        elementStates = {};
        const spacingX = 40 / (loadedTextures.length + 1);

        loadedTextures.forEach((el, i) => {
            if (!el.texture) return;

            const material = new THREE.SpriteMaterial({ map: el.texture, transparent: true });
            const sprite = new THREE.Sprite(material);

            const sizes = { 'muy grande': 20, 'grande': 15, 'mediano': 10, 'pequeño': 5, 'muy pequeño': 2.5 };
            const baseHeight = sizes[el.tamaño] || 10;
            const aspectRatio = el.texture.image.width / el.texture.image.height;
            sprite.scale.set(baseHeight * aspectRatio, baseHeight, 1);

            const x = -20 + spacingX * (i + 1);
            const y = baseHeight / 2;
            const z = 0;
            sprite.position.set(x, y, z);

            threeScene.add(sprite);

            elementStates[el.name] = {
                sprite: sprite,
                isMoving: false,
                moveSpeed: 0.1,
                targetPosition: new THREE.Vector3(x, y, z),
                targetScale: new THREE.Vector3(sprite.scale.x, sprite.scale.y, sprite.scale.z),
                targetRotation: 0,
                isJumping: false,
                velocityY: 0,
                gravity: -0.02
            };
        });
    }

    async function handleRenderScene() {
        if (!loadedImages['textura_suelo']) {
            showError("No se ha definido una textura de suelo.");
            return;
        }
        if (animationLoopId) cancelAnimationFrame(animationLoopId);

        canvasPlaceholder.classList.add('oculto');

        textureLoader = new THREE.TextureLoader();

        const texturePromises = Object.entries(loadedImages)
            .filter(([name]) => name !== 'textura_suelo')
            .map(([name, data]) => {
                const elData = (requiredElements.find(e => e.nombre === name) || {});
                return new Promise(res => {
                    textureLoader.load(data.dataUrl,
                        (texture) => res({ name, texture, ...elData }),
                        undefined,
                        () => res(null)
                    );
                });
            });

        const loadedTextures = (await Promise.all(texturePromises)).filter(Boolean);

        textureLoader.load(loadedImages.textura_suelo.dataUrl, (groundTexture) => {
            groundTexture.wrapS = THREE.RepeatWrapping;
            groundTexture.wrapT = THREE.RepeatWrapping;
            groundTexture.repeat.set(20, 20);

            initThreeScene(loadedImages.textura_suelo.momento_del_dia, groundTexture);
            initializeActorSprites(loadedTextures);

   cameraState = {
        isMoving: false,
        isZooming: false,
        isFollowing: false,
            isOrbiting: false, // <-- NUEVO
        followTarget: null,
        orbitTarget: null, // <-- NUEVO: El nombre del sprite a orbitar
        orbitRadius: 30,   // <-- NUEVO: Distancia de la órbita
        orbitAngle: 0,     // <-- NUEVO: Ángulo actual en la órbita
        orbitSpeed: 0.005, // <-- NUEVO: Velocidad de la órbita
        followOffset: new THREE.Vector3(0, 7, 20), // Distancia a la que seguir al objetivo
        targetPosition: new THREE.Vector3(0, 15, 35), // A donde se debe mover la cámara
        targetLookAt: new THREE.Vector3(0, 0, 0),     // Hacia donde debe mirar
        targetZoom: 1.0,                              // Nivel de zoom objetivo
        moveSpeed: 0.02, // Velocidad de interpolación (lerp)
        zoomSpeed: 0.02
    };

            startAnimation();
            if (renderButton) renderButton.classList.remove('pulse-animation');
        }, undefined, (err) => {
            showError("No se pudo cargar la textura del suelo. Revisa la ruta de la imagen.");
            console.error("Error de carga de textura:", err);
        });
    }
function updateCameraState() {
    if (!threeCamera) return;
if (cameraState.isOrbiting && cameraState.orbitTarget && elementStates[cameraState.orbitTarget]) {
        const targetSprite = elementStates[cameraState.orbitTarget].sprite;
        
        // Incrementamos el ángulo para girar
        cameraState.orbitAngle += cameraState.orbitSpeed;
        
        // Calculamos la nueva posición en un círculo alrededor del objetivo
        const camX = targetSprite.position.x + cameraState.orbitRadius * Math.cos(cameraState.orbitAngle);
        const camZ = targetSprite.position.z + cameraState.orbitRadius * Math.sin(cameraState.orbitAngle);
        // Mantenemos la altura de la cámara, puedes ajustarla si quieres
        const camY = threeCamera.position.y; 
        
        threeCamera.position.set(camX, camY, camZ);
        
        // La cámara siempre debe mirar al centro de la órbita (el objetivo)
        cameraState.targetLookAt.copy(targetSprite.position);


    // 1. Lógica de seguimiento
   } else   if (cameraState.isFollowing && cameraState.followTarget && elementStates[cameraState.followTarget]) {
        const targetSprite = elementStates[cameraState.followTarget].sprite;
        // La cámara se posiciona relativa al objetivo, con un desfase (offset)
        cameraState.targetPosition.copy(targetSprite.position).add(cameraState.followOffset);
        // La cámara siempre mira al objetivo que está siguiendo
        cameraState.targetLookAt.copy(targetSprite.position);
    }
    
    // 2. Interpolar posición (movimiento suave)
    if (!threeCamera.position.equals(cameraState.targetPosition)) {
        threeCamera.position.lerp(cameraState.targetPosition, cameraState.moveSpeed);
        if (threeCamera.position.distanceTo(cameraState.targetPosition) < 0.1) {
            threeCamera.position.copy(cameraState.targetPosition);
            cameraState.isMoving = false;
        }
    }

    // 3. Interpolar zoom
    if (Math.abs(threeCamera.zoom - cameraState.targetZoom) > 0.01) {
        threeCamera.zoom = THREE.MathUtils.lerp(threeCamera.zoom, cameraState.targetZoom, cameraState.zoomSpeed);
        threeCamera.updateProjectionMatrix(); // ¡Esencial al cambiar el zoom!
    } else if (cameraState.isZooming) {
        threeCamera.zoom = cameraState.targetZoom;
        threeCamera.updateProjectionMatrix();
        cameraState.isZooming = false;
    }

    // 4. Actualizar el punto de mira de la cámara
    threeCamera.lookAt(cameraState.targetLookAt);
}
    // --- VIII. BUCLE DE ANIMACIÓN Y LÓGICA 3D ---
   function startAnimation() {
    currentActionIndex = 0;
    if (animationLoopId) cancelAnimationFrame(animationLoopId);

    const animate = () => {
        animationLoopId = requestAnimationFrame(animate);
        
        updateSpriteStates(); // Actualiza los personajes
        updateCameraState();  // NUEVO: Actualiza la cámara
        
        threeRenderer.render(threeScene, threeCamera);

        if (isActionComplete()) {
            currentActionIndex++;
            if (currentActionIndex >= animationSequence.length) {
                // ... (lógica de fin de animación)
                return;
            }
            processNextAction();
        }
    };
    processNextAction();
    animate();
}

    function updateSpriteStates() {
        for (const name in elementStates) {
            const state = elementStates[name];
            const sprite = state.sprite;

            if (!sprite.position.equals(state.targetPosition)) {
                sprite.position.lerp(state.targetPosition, state.moveSpeed);
            }

            if (!sprite.scale.equals(state.targetScale)) {
                sprite.scale.lerp(state.targetScale, 0.1);
            }

            if (Math.abs(sprite.material.rotation - state.targetRotation) > 0.01) {
                sprite.material.rotation += (state.targetRotation - sprite.material.rotation) * 0.1;
            }

            if (state.isJumping) {
                sprite.position.y += state.velocityY;
                state.velocityY += state.gravity;
                if (sprite.position.y <= state.targetPosition.y) {
                    sprite.position.y = state.targetPosition.y;
                    state.isJumping = false;
                }
            }
        }
    }

    function processNextAction() {
        if (currentActionIndex >= animationSequence.length) return;
        const action = animationSequence[currentActionIndex];

 // --- Lógica para la cámara ---
    if (action.elemento === 'camara') {
        cameraState.isFollowing = false; // Detenemos el seguimiento si llega una nueva acción de cámara
        
        switch(action.accion) {
            case 'camara_mover_a':
                if (action.posicion) {
                    cameraState.targetPosition.set(action.posicion.x, action.posicion.y, action.posicion.z);
                    cameraState.isMoving = true;
                }
                break;
            case 'camara_hacer_zoom':
                if (action.nivel_zoom !== undefined) {
                    cameraState.targetZoom = action.nivel_zoom;
                    cameraState.isZooming = true;
                }
                break;
            case 'camara_mirar_a':
                if (action.objetivo && elementStates[action.objetivo]) {
                    const targetSprite = elementStates[action.objetivo].sprite;
                    cameraState.targetLookAt.copy(targetSprite.position);
                } else if (action.posicion) {
                    cameraState.targetLookAt.set(action.posicion.x, action.posicion.y, action.posicion.z);
                }
                break;
            case 'camara_seguir_elemento':
                 if (action.objetivo && elementStates[action.objetivo]) {
                    cameraState.isFollowing = true;
                    cameraState.followTarget = action.objetivo;
                 }
                break;
         case 'camara_girar_en_torno_a':
                if (action.objetivo && elementStates[action.objetivo]) {
                    cameraState.isOrbiting = true;
                    cameraState.orbitTarget = action.objetivo;
                    // Usa la distancia del guion, o un valor por defecto si no se especifica
                    cameraState.orbitRadius = action.distancia || 30;
                }
                break;
            // =====================================
        }
        // MODIFICADO: Salimos temprano para CUALQUIER acción de cámara
        currentActionIndex++;
        processNextAction();
        return;


        
        
    }


        const actorState = elementStates[action.elemento];
        if (!actorState) {
            console.warn(`Actor "${action.elemento}" no encontrado. Saltando acción.`);
            currentActionIndex++;
            processNextAction();
            return;
        }

        switch (action.accion) {
            case 'moverse_hacia':
            case 'entrar':
            case 'salir':
                if (action.posicion) {
                    const { x, y, z } = action.posicion;
                    const baseHeight = actorState.sprite.scale.y;
                    actorState.targetPosition.set(x, y !== undefined ? y : baseHeight / 2, z);
                } else if (action.objetivo && elementStates[action.objetivo]) {
                    const targetSprite = elementStates[action.objetivo].sprite;
                    actorState.targetPosition.copy(targetSprite.position);
                }
                break;

            case 'saltar':
                if (!actorState.isJumping) {
                    actorState.isJumping = true;
                    actorState.velocityY = 1;
                }
                break;

            case 'agrandarse':
                actorState.targetScale.multiplyScalar(1.5);
                break;

            case 'encogerse':
                actorState.targetScale.multiplyScalar(0.5);
                break;

            case 'girar':
                actorState.targetRotation += Math.PI * 2;
                break;

            case 'mirar_a':
            case 'hablar':
            case 'esperar':
            case 'temblar':
            case 'parpadear':
                break;
        }
    }


function isActionComplete() {
    if (currentActionIndex >= animationSequence.length) return true;
    const action = animationSequence[currentActionIndex];

    // MODIFICADO: Las acciones de cámara ya no bloquean el flujo.
    // La función processNextAction() ya las maneja para que no se queden "activas".
    // Por lo tanto, podemos eliminar la lógica específica de la cámara de aquí.

    const actorState = elementStates[action.elemento];
    // Si la acción es para un elemento que no existe (o para la cámara, que ya fue procesada),
    // consideramos la acción completada para no bloquear la secuencia.
    if (!actorState) return true;

    // ... (el resto de la lógica para 'moverse_hacia', 'saltar', etc. no cambia)
    if (['moverse_hacia', 'entrar', 'salir'].includes(action.accion)) {
        return actorState.sprite.position.distanceTo(actorState.targetPosition) < 0.1;
    }
    // ...
    return true;
}

    function resizeAllCanvas() {
        const rect = canvasContainer.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && threeRenderer) {
            if (threeCamera) {
                threeCamera.aspect = rect.width / rect.height;
                threeCamera.updateProjectionMatrix();
            }
            threeRenderer.setSize(rect.width, rect.height);
        }
    }
});
