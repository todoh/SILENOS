/**
 * Director de Escena Interactivo - animacion2d.js (Versión Mejorada)
 * Este script maneja la lógica para analizar un guion, cargar los recursos
 * de imagen y renderizar una animación 2D avanzada en un canvas HTML.
 *
 * MEJORAS INTEGRADAS:
 * 1.  Nuevas acciones: Saltar, correr, girar, cambiar tamaño, opacidad, temblar, etc.
 * 2.  Estado del actor ampliado para soportar las nuevas transformaciones.
 * 3.  Prompt y Schema de la API actualizados para reconocer las nuevas acciones.
 * 4.  Motor de física simple (gravedad para saltos).
 * 5.  Motor de renderizado mejorado para aplicar transformaciones (rotación, escala).
 * 6.  Añadidos logs en la consola (Pulsa F12) para diagnosticar problemas.
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
    const sceneCanvas = document.getElementById('scene-canvas');
    const canvasContainer = document.getElementById('canvas-container');
    const canvasPlaceholder = document.getElementById('canvas-placeholder');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    console.log("--- [OK] Cargado animacion2d.js vMEJORADA (Corregido) ---");

    if (!scriptInput || !analyzeButton || !renderButton || !sceneCanvas || !canvasContainer) {
        console.error("Error crítico: No se encontraron uno o más elementos esenciales del DOM.");
        return;
    }

    // --- II. ESTADO DE LA APLICACIÓN ---
    let requiredElements = [];
    let loadedImages = {};
    let animationSequence = [];
    // NUEVO: El estado global ahora incluye una cámara para futuros efectos.
    let globalState = {
        camera: { x: 0, y: 0, zoom: 1 }
    };
    let elementStates = { background: null, foreground: {} };
    let animationLoopId = null;
    let currentActionIndex = 0;
    const ctx = sceneCanvas.getContext('2d');
 const savedImages = {
        "Gorila": "./img/gorila.png",
        "Orangutan": "./img/orangutan.png",
        "Pino": "./img/pino.png",
        "Camino": "./img/caminodesal.png",
        "Mago": "./img/alto_mago.png", 
        "Cohete": "./img/cohete.png", 
        "Muralla Driyes": "./img/muralla_driyes.png",
        "llanura nevada": "./img/llanura_nevada.png",
        "cima nevada": "./img/cima_nevada.png",

    };
    // --- III. API ---
    const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=';

    // --- IV. EVENTOS ---
    analyzeButton.addEventListener('click', handleAnalyzeScript);
    renderButton.addEventListener('click', handleRenderScene);

    // --- V. FUNCIONES DE UI ---
    const setAnalyzeLoading = (isLoading) => {
        analyzeButton.disabled = isLoading;
        loadingSpinner.classList.toggle('oculto', !isLoading);
        analyzeIcon.classList.toggle('oculto', isLoading);
    };

    const showError = (message) => {
        errorText.textContent = message;
        errorMessage.classList.remove('oculto');
    };

    const hideError = () => errorMessage.classList.add('oculto');

    function resetUI() {
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        animationLoopId = null;
        currentActionIndex = 0; // CORRECCIÓN: Asegurarse de reiniciar el índice de acción.
        elementsSection.classList.add('oculto');
        elementsList.innerHTML = '';
        renderButton.disabled = true;
        renderButton.classList.remove('pulse-animation');
        requiredElements = [];
        loadedImages = {};
        animationSequence = [];
        elementStates = { background: null, foreground: {} };
        ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
        sceneCanvas.classList.add('oculto');
        canvasPlaceholder.classList.remove('oculto');
    }

    // --- VI. LÓGICA PRINCIPAL (ANÁLISIS Y CARGA) ---
   // --- Reemplaza esta función completa ---

async function handleAnalyzeScript() {
    const scriptText = scriptInput.value.trim();
    if (!scriptText) {
        showError("Por favor, escribe un guion antes de analizar.");
        return;
    }
    if (typeof apiKey === 'undefined' || !apiKey) {
        showError("La API Key de Google no está configurada. Ve a Ajustes para añadirla.");
        return;
    }
    hideError();
    setAnalyzeLoading(true);
    resetUI();

    // --- INICIO DE LA LÓGICA MEJORADA ---

    // 1. Construir la lista de imágenes disponibles para el prompt.
    const availableImagesString = Object.entries(savedImages)
        .map(([name, path]) => `- '${name}' (ubicada en '${path}')`)
        .join('\n');

    // 2. Crear un prompt más inteligente y detallado.
    const prompt = `Actúa como un director de animación inteligente. Tienes acceso a una biblioteca de imágenes.
Tu tarea es analizar un guion y decidir qué elementos visuales se necesitan.

MI BIBLIOTECA DE IMÁGENES DISPONIBLES:
${availableImagesString}

GUION DEL USUARIO: "${scriptText}"

INSTRUCCIONES:
1.  Lee el guion para identificar todos los 'elementos' (personajes, objetos, escenarios).
2.  Compara CADA elemento del guion con la lista de MI BIBLIOTECA DE IMÁGENES.
3.  Si un elemento del guion puede ser representado de forma lógica por una imagen de mi biblioteca, clasifícalo en 'elementos_mapeados'.
4.  Si un elemento del guion NO coincide con ninguna imagen de la biblioteca, clasifícalo en 'elementos_requeridos' para que yo pueda subir un archivo nuevo.
5.  Genera también la secuencia de 'acciones' como siempre, incluyendo el campo 'dialogo' para la acción 'hablar'.`;

    // 3. Definir un nuevo schema que espera dos listas de elementos.
    const schema = {
        type: "OBJECT",
        properties: {
            elementos_mapeados: {
                type: "ARRAY",
                description: "Elementos del guion que SÍ encontraste en mi biblioteca.",
                items: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING", description: "Nombre del elemento en el guion (ej: 'oso')" },
                        mapeo: { type: "STRING", description: "Nombre de la imagen de la biblioteca a usar (ej: 'Oso Pardo Amistoso')" }
                    },
                    required: ["nombre", "mapeo"]
                }
            },
            elementos_requeridos: {
                type: "ARRAY",
                description: "Elementos del guion que NO están en mi biblioteca y para los que debo subir un archivo.",
                items: {
                    type: "OBJECT",
                    properties: {
                        nombre: { type: "STRING" },
                        tipo: { type: "STRING", enum: ["personaje", "objeto", "escenario"] },
                        tamaño: { type: "STRING" }
                    },
                    required: ["nombre", "tipo"]
                }
            },
            acciones: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        elemento: { type: "STRING" },
                        accion: { type: "STRING" },
                        objetivo: { type: "STRING" },
                        dialogo: { type: "STRING" }
                    },
                    required: ["elemento", "accion"]
                }
            }
        },
        required: ["acciones"]
    };

    // --- FIN DE LA LÓGICA MEJORADA ---

    try {
        const response = await fetch(API_URL_BASE + apiKey, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } })
        });

        if (!response.ok) throw new Error(`Error de la API: ${response.status} ${response.statusText}`);
        const result = await response.json();
        const parsed = JSON.parse(result.candidates[0].content.parts[0].text || '{}');

        // Procesamos la nueva respuesta de la IA
        const mappedElements = parsed.elementos_mapeados || [];
        requiredElements = parsed.elementos_requeridos || []; // 'requiredElements' sigue siendo una variable global
        animationSequence = parsed.acciones || [];

        console.log("--- Análisis Inteligente de la IA ---");
        console.log("Elementos Mapeados (reutilizados):", mappedElements);
        console.log("Elementos Requeridos (pedir al usuario):", requiredElements);
        console.log("Secuencia de animación:", animationSequence);
        
        // Cargamos automáticamente las imágenes mapeadas
        mappedElements.forEach(el => {
            const imageName = el.mapeo;
            if (savedImages[imageName]) {
                loadedImages[el.nombre] = { dataUrl: savedImages[imageName] };
            }
        });

        // Mostramos los cargadores solo para los elementos que faltan
        displayElementLoaders(mappedElements);

    } catch (error) {
        console.error("Error en handleAnalyzeScript:", error);
        showError(`No se pudo analizar el guion. Detalle: ${error.message}`);
    } finally {
        setAnalyzeLoading(false);
    }
}

// --- Reemplaza esta función completa ---

function displayElementLoaders(mappedElements = []) {
   // elementsSection.innerHTML = '';
   // elementsList.innerHTML = '';

    // 1. Mostrar un mensaje informativo sobre las imágenes reutilizadas
    if (mappedElements.length > 0) {
        const mappedDiv = document.createElement('div');
        mappedDiv.className = 'lista-elementos__mapeados';
        let mappedHtml = '<h4>Imágenes encontradas en la biblioteca:</h4><ul>';
        mappedElements.forEach(el => {
            mappedHtml += `<li><b>${el.nombre}</b> usará la imagen <em>"${el.mapeo}"</em></li>`;
        });
        mappedHtml += '</ul>';
        mappedDiv.innerHTML = mappedHtml;
        elementsList.appendChild(mappedDiv);
    }

    // 2. Mostrar cargadores solo para los elementos que faltan
    if (requiredElements.length > 0) {
        const requiredTitle = document.createElement('h4');
        requiredTitle.textContent = 'Imágenes requeridas (por favor, sube los archivos):';
        elementsList.appendChild(requiredTitle);

        requiredElements.forEach(element => {
            const div = document.createElement('div');
            div.className = 'lista-elementos__item';
            div.innerHTML = `<label class="lista-elementos__label">${element.nombre} (${element.tipo})</label><input type="file" accept="image/*" data-element-name="${element.nombre}" class="lista-elementos__input">`;
            div.querySelector('input').addEventListener('change', handleImageUpload);
            elementsList.appendChild(div);
        });
    }

    elementsSection.classList.remove('oculto');
    
    // 3. Activar el botón de renderizar si no se necesita subir nada
    if (requiredElements.length === 0 && mappedElements.length > 0) {
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
            const label = event.target.previousElementSibling;
            if (label && !label.textContent.includes('✔')) label.textContent += ' ✔';
            if (requiredElements.every(el => loadedImages[el.nombre])) {
                renderButton.disabled = false;
                renderButton.classList.add('pulse-animation');
            }
        };
        reader.readAsDataURL(file);
    }

    // --- VII. MOTOR DE ANIMACIÓN ---
    function resizeCanvas() {
        const rect = canvasContainer.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            sceneCanvas.width = rect.width;
            sceneCanvas.height = rect.height;
            // Al redimensionar, reiniciamos las posiciones iniciales para que se adapten al nuevo tamaño
            if (Object.keys(elementStates.foreground).length > 0) {
                 initializeElementStates(Object.values(elementStates.foreground).map(s => ({...s, name: Object.keys(elementStates.foreground).find(key => elementStates.foreground[key] === s)})));
            }
            drawCurrentFrame();
        }
    }
    
    new ResizeObserver(resizeCanvas).observe(canvasContainer);

    // NUEVO: Función para inicializar/reiniciar los estados de los elementos
    function initializeElementStates(loadedElementsArray) {
        const foregroundData = Array.isArray(loadedElementsArray) ? loadedElementsArray : Object.values(loadedElementsArray);
        const spacing = sceneCanvas.width / (foregroundData.length + 1);
        
        foregroundData.forEach((el, i) => {
            if (!el.img) return; // Omitir si la imagen no se ha cargado
            const sizes = { 'muy grande': 0.8, 'grande': 0.6, 'mediano': 0.4, 'pequeño': 0.2, 'muy pequeño': 0.1 };
            const mult = sizes[el.tamaño] || 0.4;
            const h = sceneCanvas.height * mult;
            const w = h * (el.img.width / el.img.height);
            const x = spacing * (i + 1) - (w / 2);
            const y = sceneCanvas.height - h - (sceneCanvas.height * 0.1);

            // NUEVO: Estado del actor ampliado con todas las nuevas propiedades.
            elementStates.foreground[el.name] = {
                img: el.img,
                x, y,
                startX: x, startY: y,
                width: w, height: h,
                visible: true,
                
                // Estados de movimiento
                isMoving: false,
                moveSpeed: 2, // Velocidad normal
                targetX: x, targetY: y,

                // Estados de física (salto)
                isJumping: false,
                velocityY: 0,
                gravity: 0.5,

                // Estados de transformación
                isScaling: false,
                scale: 1,
                targetScale: 1,

                isFading: false,
                opacity: 1,
                targetOpacity: 1,
                
                isRotating: false,
                rotation: 0, // en radianes
                targetRotation: 0,

                // Estados de efectos
                isSpeaking: false, speakTime: 0,
                isShaking: false, shakeTime: 0,
                isBlinking: false, blinkTime: 0,

                // Otros
                direction: 1 // 1 para derecha, -1 para izquierda
            };
        });
    }


    async function handleRenderScene() {
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        sceneCanvas.classList.remove('oculto');
        canvasPlaceholder.classList.add('oculto');
        
        const imagePromises = Object.entries(loadedImages).map(([name, data]) => {
            const elData = requiredElements.find(e => e.nombre.toLowerCase() === name.toLowerCase());
            return new Promise(res => {
                const img = new Image();
                img.onload = () => res({ name, img, ...elData });
                img.onerror = () => res({ name, img: null, ...elData });
                img.src = data.dataUrl;
            });
        });
        
        const loadedElements = await Promise.all(imagePromises);
        console.log("Elementos cargados con sus tipos:", loadedElements);

        elementStates = { background: null, foreground: {} };

        const backgroundData = loadedElements.find(el => el && el.tipo && el.tipo.toLowerCase().trim() === 'escenario');
        const foregroundData = loadedElements.filter(el => el && el.img && (!el.tipo || el.tipo.toLowerCase().trim() !== 'escenario'));

        console.log("Elemento de fondo identificado:", backgroundData);
        console.log("Elementos de primer plano identificados:", foregroundData);

        if (backgroundData) {
            elementStates.background = { img: backgroundData.img };
        }
        
        // Usamos la nueva función para inicializar
        initializeElementStates(foregroundData);
        
        startAnimation();
        if (renderButton) renderButton.classList.remove('pulse-animation');
    }

    function startAnimation() {
        currentActionIndex = 0;
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        animationLoopId = 0; // CORRECCIÓN: Usar un valor no nulo para iniciar el bucle.

        function animate() {
            updateStates();
            drawCurrentFrame();
            if (isActionComplete()) {
                currentActionIndex++;
                processNextAction();
            }
            
            // CORRECCIÓN: Solo pedir el siguiente fotograma si el bucle no ha sido detenido.
            // processNextAction pondrá animationLoopId a 'null' al final de la secuencia.
            if (animationLoopId !== null) {
                animationLoopId = requestAnimationFrame(animate);
            }
        }
        processNextAction(); // Inicia la primera acción
        animate(); // Comienza el bucle
    }

   // CORRECCIÓN PARA animacion2d.js
function drawCurrentFrame() {
    ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);

    // DIBUJAR FONDO
    if (elementStates.background?.img) {
        ctx.drawImage(elementStates.background.img, 0, 0, sceneCanvas.width, sceneCanvas.height);
    } else {
        const grad = ctx.createLinearGradient(0, 0, 0, sceneCanvas.height);
        grad.addColorStop(0, '#1a202c'); grad.addColorStop(1, '#2d3748');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);
    }

    // DIBUJAR PERSONAJES Y BOCADILLOS
    for (const name in elementStates.foreground) {
        const actorState = elementStates.foreground[name];

        if (actorState.visible && actorState.img) {
            ctx.save();
            ctx.globalAlpha = actorState.opacity;
            
            const centerX = actorState.x + (actorState.width * actorState.scale) / 2;
            const centerY = actorState.y + (actorState.height * actorState.scale) / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate(actorState.rotation);
            ctx.scale(actorState.direction, 1);
            
            let drawX = -(actorState.width * actorState.scale) / 2;
            let drawY = -(actorState.height * actorState.scale) / 2;
            
            if (actorState.isShaking) {
                 drawX += (Math.random() - 0.5) * 5;
                 drawY += (Math.random() - 0.5) * 5;
            }

            ctx.drawImage(actorState.img, drawX, drawY, actorState.width * actorState.scale, actorState.height * actorState.scale);
            
            ctx.restore();

            // LLAMADA CLAVE: Se dibuja el bocadillo DESPUÉS del personaje.
            drawSpeechBubble(ctx, actorState);
        }
    }
}

    function updateStates() {
    for (const name in elementStates.foreground) {
        const state = elementStates.foreground[name];

        // Movimiento
        if (state.isMoving) {
            const dx = state.targetX - state.x;
            const dy = state.targetY - state.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < state.moveSpeed) {
                state.x = state.targetX;
                state.y = state.targetY;
                state.isMoving = false;
            } else {
                state.x += (dx / dist) * state.moveSpeed;
                state.y += (dy / dist) * state.moveSpeed;
            }
        }

        // Salto
        if (state.isJumping) {
            state.y += state.velocityY;
            state.velocityY += state.gravity;
            if (state.y >= state.startY) {
                state.y = state.startY;
                state.isJumping = false;
            }
        }

        // Escala
        if(state.isScaling) {
            if (Math.abs(state.targetScale - state.scale) < 0.01) {
                state.scale = state.targetScale;
                state.isScaling = false;
            } else {
                state.scale += (state.targetScale - state.scale) * 0.1;
            }
        }
        
        // Opacidad
        if(state.isFading) {
            if (Math.abs(state.targetOpacity - state.opacity) < 0.01) {
                state.opacity = state.targetOpacity;
                state.isFading = false;
            } else {
                state.opacity += (state.targetOpacity - state.opacity) * 0.1;
            }
        }
        
        // Rotación
        if(state.isRotating) {
            if (Math.abs(state.targetRotation - state.rotation) < 0.05) {
                state.rotation = state.targetRotation;
                state.isRotating = false;
            } else {
                state.rotation += (state.targetRotation - state.rotation) * 0.1;
            }
        }

        // --- LÓGICA DE DIÁLOGO CORREGIDA ---
        // La vibración (state.y = state.startY + Math.sin...) se ha eliminado.
        if (state.isSpeaking) {
            state.speakTime--; // El temporizador se controla aquí.
            if (state.speakTime <= 0) {
                state.isSpeaking = false;
                state.dialogue = null; // Se limpia el diálogo para que el bocadillo desaparezca.
            }
        }
        // --- FIN DE LA CORRECCIÓN ---

        // Temblor
        if (state.isShaking) {
            state.shakeTime--;
            if(state.shakeTime <= 0) state.isShaking = false;
        }

        // Parpadeo
        if (state.isBlinking) {
            state.blinkTime--;
            state.visible = state.blinkTime % 10 > 5;
            if(state.blinkTime <= 0) {
                 state.isBlinking = false;
                 state.visible = true;
            }
        }
    }
}
    
    // NUEVO: Función de proceso de acciones totalmente renovada
    // --- Reemplaza esta función completa en animacion2d.js ---

function processNextAction() {
    if (currentActionIndex >= animationSequence.length) {
        console.log("Fin de la animación.");
        if(animationLoopId) cancelAnimationFrame(animationLoopId);
        animationLoopId = null;
        return;
    }

    const action = animationSequence[currentActionIndex];
    const actor = elementStates.foreground[action.elemento];
    
    if (!actor) {
        console.warn(`Elemento "${action.elemento}" no encontrado. Saltando acción.`);
        currentActionIndex++;
        // Importante: Llama a processNextAction de nuevo para no perder un fotograma.
        requestAnimationFrame(processNextAction);
        return;
    }
    
    // --- LÓGICA DE RESETEO MEJORADA ---
    // Reseteamos el estado del actor ANTES de procesar la nueva acción.
    Object.values(elementStates.foreground).forEach(act => {
        act.isMoving = false;
        act.isJumping = false;
        act.isScaling = false;
        act.isFading = false;
        act.isRotating = false;
        act.isShaking = false;
        act.isBlinking = false;
        // NO reseteamos isSpeaking aquí para permitir que el bocadillo se muestre.
    });

    console.log(`Acción ${currentActionIndex}: El actor '${action.elemento}' va a '${action.accion}'`);

    switch (action.accion) {
        case 'entrar':
            actor.x = -actor.width;
            actor.targetX = actor.startX;
            actor.isMoving = true;
            actor.visible = true;
            actor.opacity = 1;
            break;
        case 'entrar_por_derecha':
            actor.x = sceneCanvas.width;
            actor.targetX = actor.startX;
            actor.isMoving = true;
            actor.visible = true;
            actor.opacity = 1;
            break;
        // ... (el resto de tus 'case' de movimiento como 'salir', 'moverse_hacia', etc., no necesitan cambios) ...
        case 'salir':
            actor.targetX = sceneCanvas.width + actor.width;
            actor.isMoving = true;
            break;
        case 'moverse_hacia':
            const targetMove = elementStates.foreground[action.objetivo];
            if (targetMove) {
                actor.targetX = targetMove.x;
                actor.isMoving = true;
            }
            break;
        
        // --- CASO 'HABLAR' REFORZADO ---
        case 'hablar':
            actor.isSpeaking = true;
            actor.dialogue = action.dialogo || "…"; // Si no viene diálogo, muestra puntos suspensivos.
            actor.speakTime = 180; // 3 segundos (180 frames / 60 fps).
            console.log(`[HABLAR] ${actor.name} dice: "${actor.dialogue}". Tiempo: ${actor.speakTime} frames.`);
            break;

        // ... (el resto de tus 'case' como 'saltar', 'girar', etc., no necesitan cambios) ...
        case 'saltar':
            if (!actor.isJumping) {
                actor.isJumping = true;
                actor.velocityY = -12;
            }
            break;
        case 'girar':
            actor.targetRotation += Math.PI * 2;
            actor.isRotating = true;
            break;
        
        default:
            // Para acciones que no hemos definido explícitamente.
            console.log(`Acción desconocida o no manejada: ${action.accion}`);
            break;
    }
}

    // NUEVO: Función de comprobación de fin de acción renovada
    function isActionComplete() {
        if (currentActionIndex >= animationSequence.length) return true;
        
        const action = animationSequence[currentActionIndex];
        const actor = elementStates.foreground[action.elemento];
        if (!actor) return true; // Si el actor no existe, la acción se completa instantáneamente

        switch (action.accion) {
            case 'entrar':
            case 'salir':
            case 'moverse_hacia':
            case 'correr_hacia':
            case 'entrar_por_derecha':
            case 'entrar_por_arriba':
            case 'entrar_por_abajo':
            case 'salir_por_izquierda':
            case 'salir_por_arriba':
            case 'salir_por_abajo':
            case 'posicionarse_en_centro':
            case 'posicionarse_en_izquierda':
            case 'posicionarse_en_derecha':
                return !actor.isMoving;
            
            case 'hablar': return !actor.isSpeaking;
            case 'saltar': return !actor.isJumping;
            case 'agrandarse':
            case 'encogerse':
                return !actor.isScaling;
            case 'girar': return !actor.isRotating;
            case 'desvanecerse':
            case 'aparecer_gradualmente':
                return !actor.isFading;
            case 'temblar': return !actor.isShaking;
            case 'parpadear': return !actor.isBlinking;
            
            case 'mirar_a': return true; // Es instantáneo

            case 'esperar':
                if (actor.isWaiting) {
                    actor.waitTime--;
                    if(actor.waitTime <= 0) {
                        actor.isWaiting = false;
                        return true;
                    }
                    return false;
                }
                return true;

            default: return true; // Acciones desconocidas se completan al instante
        }
    }
});



    function draw() {
        ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
        const grad = ctx.createLinearGradient(0, 0, 0, sceneCanvas.height);
        grad.addColorStop(0, '#6DD5FA'); grad.addColorStop(1, '#2980B9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);

        for (const name in actors) {
            const actor = actors[name];
            if (!actor.visible || !actor.img) continue;

            ctx.save();
            ctx.globalAlpha = actor.opacity;

            let tempVisible = true;
            if(actor.isBlinking && actor.blinkTime % 10 < 5) {
                tempVisible = false;
            }

            if (tempVisible) {
                const centerX = actor.x + (actor.width * actor.scale) / 2;
                const centerY = actor.y + (actor.height * actor.scale) / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(actor.rotation * Math.PI / 180);
                ctx.scale(actor.direction, 1);
                
                let drawX = -(actor.width * actor.scale) / 2;
                let drawY = -(actor.height * actor.scale) / 2;
                
                if (actor.isShaking) {
                     drawX += (Math.random() - 0.5) * 8;
                     drawY += (Math.random() - 0.5) * 8;
                }
                ctx.drawImage(actor.img, drawX, drawY, actor.width * actor.scale, actor.height * actor.scale);
            }
            
            ctx.restore();
            
            if (actor.isSpeaking && actor.dialogue) {
                drawDialogueBubble(ctx, actor);
            }
        }
    }

    // --- VI. FUNCIONES DE UI Y AUXILIARES ---
    function setAnalyzingState(isAnalyzing) {
        analyzeButton.disabled = isAnalyzing;
        scriptInput.disabled = isAnalyzing;
        loadingSpinner.style.display = isAnalyzing ? 'block' : 'none';
        analyzeIcon.style.display = isAnalyzing ? 'none' : 'block';
    }
    function showError(message) { errorText.textContent = message; errorMessage.classList.remove('oculto'); }
    function hideError() { errorMessage.classList.add('oculto'); }
    function resetUI() {
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        animationLoopId = null;
        images = {};
        elementsSection.classList.add('oculto');
        elementsList.innerHTML = '';
        renderButton.disabled = true;
        renderButton.classList.remove('pulse-animation');
        ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
        sceneCanvas.classList.add('oculto');
        canvasPlaceholder.classList.remove('oculto');
    }
    function drawDialogueBubble(ctx, actor) {
        const text = actor.dialogue;
        ctx.font = "bold 16px 'Arial'";
        const textMetrics = ctx.measureText(text);
        const padding = 10;
        const bubbleWidth = textMetrics.width + padding * 2;
        const bubbleHeight = 35;
        let bubbleX = actor.x + actor.width / 2 - bubbleWidth / 2;
        const bubbleY = actor.y - bubbleHeight - 15;
        if(bubbleX < 0) bubbleX = 5;
        if(bubbleX + bubbleWidth > sceneCanvas.width) bubbleX = sceneCanvas.width - bubbleWidth - 5;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 15);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(actor.x + actor.width/2 - 10, bubbleY + bubbleHeight - 2);
        ctx.lineTo(actor.x + actor.width/2, bubbleY + bubbleHeight + 10);
        ctx.lineTo(actor.x + actor.width/2 + 10, bubbleY + bubbleHeight - 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a202c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
    }
    new ResizeObserver(() => {
        const rect = canvasContainer.getBoundingClientRect();
        if (rect.width > 0 && sceneCanvas.width !== rect.width) {
            sceneCanvas.width = rect.width;
            sceneCanvas.height = rect.height;
            if (animationLoopId) { initializeActorStates(); }
        }
    }).observe(canvasContainer);
    
    const initialRect = canvasContainer.getBoundingClientRect();
    if(initialRect.width > 0) {
        sceneCanvas.width = initialRect.width;
        sceneCanvas.height = initialRect.height;
    }

        function initiateAction(actor, action) {
        actor.visible = true;
        actor.moveSpeed = 200; // Reset speed

        const targetActor = action.objetivo ? actors[action.objetivo] : null;

        switch (action.accion) {
            case 'entrar_por_izquierda': actor.x = -actor.width; actor.targetX = sceneCanvas.width / 4; actor.isMoving = true; break;
            case 'entrar_por_derecha': actor.x = sceneCanvas.width; actor.targetX = sceneCanvas.width * 0.75 - actor.width; actor.isMoving = true; break;
            case 'entrar_por_arriba': actor.y = -actor.height; actor.targetY = actor.startY; actor.isMoving = true; break;
            case 'entrar_por_abajo': actor.y = sceneCanvas.height; actor.targetY = actor.startY; actor.isMoving = true; break;
            case 'salir_por_izquierda': actor.targetX = -actor.width; actor.isMoving = true; break;
            case 'salir_por_derecha': actor.targetX = sceneCanvas.width; actor.isMoving = true; break;
            case 'salir_por_arriba': actor.targetY = -actor.height; actor.isMoving = true; break;
            case 'salir_por_abajo': actor.targetY = sceneCanvas.height; actor.isMoving = true; break;
            case 'moverse_hacia': if(targetActor) { actor.targetX = targetActor.x; actor.targetY = targetActor.y; actor.isMoving = true; } break;
            case 'correr_hacia': if(targetActor) { actor.targetX = targetActor.x; actor.targetY = targetActor.y; actor.moveSpeed = 400; actor.isMoving = true; } break;
            case 'posicionarse_en_centro': actor.targetX = sceneCanvas.width / 2 - actor.width / 2; actor.isMoving = true; break;
            case 'posicionarse_en_izquierda': actor.targetX = sceneCanvas.width / 4 - actor.width / 2; actor.isMoving = true; break;
            case 'posicionarse_en_derecha': actor.targetX = sceneCanvas.width * 0.75 - actor.width / 2; actor.isMoving = true; break;
            case 'hablar': actor.isSpeaking = true; actor.dialogue = action.dialogo; break;
            case 'saltar': if (!actor.isJumping) { actor.isJumping = true; actor.velocityY = -15; } break;
            case 'agrandarse': actor.isScaling = true; actor.targetScale = 1.5; break;
            case 'encogerse': actor.isScaling = true; actor.targetScale = 0.5; break;
            case 'girar': actor.isRotating = true; actor.targetRotation += 360; break;
            case 'desvanecerse': actor.isFading = true; actor.targetOpacity = 0; break;
            case 'aparecer_gradualmente': actor.opacity = 0; actor.isFading = true; actor.targetOpacity = 1; break;
            case 'temblar': actor.isShaking = true; actor.shakeTime = 50; break; // frames
            case 'parpadear': actor.isBlinking = true; actor.blinkTime = 30; break; // frames
            case 'mirar_a': if (targetActor) { actor.direction = (targetActor.x > actor.x) ? 1 : -1; } break;
            case 'esperar': actor.isWaiting = true; actor.waitTime = (action.duracion || 1) * 60; break; // frames
        }
    }

/**
 * Dibuja un bocadillo de diálogo estilo cómic sobre un actor.
 * @param {CanvasRenderingContext2D} ctx - El contexto del canvas.
 * @param {object} actor - El objeto de estado del actor que está hablando.
 */
function drawSpeechBubble(ctx, actor) {
    // Solo se dibuja si el actor está en modo "hablar" y tiene un texto de diálogo.
    if (!actor.isSpeaking || !actor.dialogue) {
        return;
    }

    const text = actor.dialogue;
    // Posicionamos el bocadillo encima del actor.
    const x = actor.x + actor.width / 2;
    const y = actor.y - 25; // Un poco de espacio sobre la cabeza.

    // --- Configuración del texto ---
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // --- Propiedades del bocadillo ---
    const padding = 12;
    const textMetrics = ctx.measureText(text);
    const bubbleWidth = textMetrics.width + padding * 2;
    const bubbleHeight = 20 + padding * 2; // Alto del texto + padding.
    const bubbleX = x - bubbleWidth / 2;
    const bubbleY = y - bubbleHeight - 10; // Dejar 10px para el pico.

    // --- Dibujar el cuerpo del bocadillo (rectángulo redondeado) ---
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    const radius = 15;
    ctx.beginPath();
    ctx.moveTo(bubbleX + radius, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
    ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
    ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
    ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
    ctx.lineTo(bubbleX, bubbleY + radius);
    ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- Dibujar el pico del bocadillo ---
    ctx.beginPath();
    ctx.moveTo(x, bubbleY + bubbleHeight);
    ctx.lineTo(x - 10, bubbleY + bubbleHeight);
    ctx.lineTo(x, bubbleY + bubbleHeight + 15);
    ctx.lineTo(x + 10, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- Dibujar el texto del diálogo ---
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x, bubbleY + bubbleHeight / 2 + 2);
}