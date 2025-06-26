/**
 * Director de Escena Interactivo - animacion2d.js (Versión Final y Corregida)
 *
 * CORRECCIONES EN ESTA VERSIÓN:
 * - Todo el código, incluido el 'ResizeObserver', ha sido movido dentro del
 * evento 'DOMContentLoaded' para solucionar el 'ReferenceError'.
 * - Se ha limpiado el código duplicado para mayor claridad y estabilidad.
 * - Mantiene la lógica de renderizado 3D, el prompt de IA mejorado y las rutas de imagen corregidas.
 */
document.addEventListener('DOMContentLoaded', () => {

    // --- I. REFERENCIAS AL DOM (Declaradas de forma segura al inicio) ---
    const scriptInput = document.getElementById('script-input');
    const analyzeButton = document.getElementById('analyze-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const analyzeIcon = document.getElementById('analyze-icon');
    const elementsSection = document.getElementById('elements-section');
    const elementsList = document.getElementById('elements-list');
    const renderButton = document.getElementById('render-button');
    const sceneCanvas = document.getElementById('scene-canvas');
    const threeContainer = document.getElementById('three-container');
    const canvasContainer = document.getElementById('canvas-container');
    const canvasPlaceholder = document.getElementById('canvas-placeholder');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');

    // Verificación robusta de que todos los elementos existen en el HTML
    if (!scriptInput || !analyzeButton || !threeContainer || !canvasContainer || !sceneCanvas) {
        console.error("Error crítico: Falta uno o más elementos esenciales del DOM en index.html.");
        if (errorText) errorText.textContent = "Error de configuración: Faltan elementos HTML. Revisa la consola.";
        if (errorMessage) errorMessage.classList.remove('oculto');
        return;
    }

    console.log("--- [OK] Cargado animacion2d.js vFINAL ---");

    // --- II. ESTADO DE LA APLICACIÓN ---
    let requiredElements = [], loadedImages = {}, animationSequence = [], elementStates = { foreground: {} };
    let animationLoopId = null, currentActionIndex = 0;
    const ctx = sceneCanvas.getContext('2d');
    let threeScene, threeCamera, threeRenderer;

      const savedImages = {
        "Gorila": "img/gorila.png",
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
    "Caballo": "img/caballo.png", 
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
    function hideError() { errorMessage.classList.add('oculto'); }
    
    function resetUI() {
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        animationLoopId = null;
        if (threeContainer) threeContainer.innerHTML = '';
        if (ctx) ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
        sceneCanvas.classList.add('oculto');
        canvasPlaceholder.classList.remove('oculto');
        elementsSection.classList.add('oculto');
        elementsList.innerHTML = '';
        renderButton.disabled = true;
        renderButton.classList.remove('pulse-animation');
        requiredElements = []; loadedImages = {}; animationSequence = []; elementStates = { foreground: {} };
    }

    // --- V. LÓGICA DE ANÁLISIS ---

    async function handleAnalyzeScript() {
        const scriptText = scriptInput.value.trim();
        if (!scriptText) { showError("Por favor, escribe un guion."); return; }
        // Se asume que la variable 'apiKey' está definida globalmente en otro script, como en google.js
        if (typeof apiKey === 'undefined' || !apiKey) { showError("La API Key de Google no está configurada."); return; }
        
        hideError();
        setAnalyzeLoading(true);
        resetUI();

const prompt = `Actúa como un director de animación 3D. Tu tarea es analizar un guion y devolver un JSON.
        
        MI BIBLIOTECA DE IMÁGENES DISPONIBLES (claves exactas):
        ${Object.keys(savedImages).join(', ')}

        GUION DEL USUARIO: "${scriptText}"

        INSTRUCCIONES:
        1.  **Escenario 3D:** Identifica la 'textura_suelo' (usando una clave de mi biblioteca) y un 'color_cielo' hexadecimal.
        2.  **Elementos 2D:**
            -   Para los elementos del guion que **encuentres en mi biblioteca**, añádelos a 'elementos_mapeados'.
            -   **REGLA IMPORTANTE:** Cada elemento mapeado debe ser un objeto. La clave "nombre" es el nombre del personaje en el guion. La clave "mapeo" DEBE SER EXACTAMENTE la clave correspondiente de mi biblioteca. Ejemplo: si el guion dice "un gorila sabio", el objeto debe ser { "nombre": "gorila sabio", "mapeo": "Gorila" }.
            -   Para los que **NO encuentres**, añádelos a 'elementos_requeridos'.
        3.  **Acciones:** Genera la secuencia de 'acciones'.`;

        
        
        const schema = {
             type: "OBJECT", properties: { escenario: { type: "OBJECT", properties: { textura_suelo: { type: "STRING" }, color_cielo: { type: "STRING" } }, required: ["textura_suelo", "color_cielo"] }, elementos_mapeados: { type: "ARRAY", items: { type: "OBJECT", properties: { nombre: { type: "STRING" }, mapeo: { type: "STRING" } }, required: ["nombre", "mapeo"] } }, elementos_requeridos: { type: "ARRAY", items: { type: "OBJECT", properties: { nombre: { type: "STRING" }, tipo: { type: "STRING" }, tamaño: { type: "STRING" } }, required: ["nombre", "tipo"] } }, acciones: { type: "ARRAY", items: { type: "OBJECT", properties: { elemento: { type: "STRING" }, accion: { type: "STRING" }, objetivo: { type: "STRING" }, dialogo: { type: "STRING" } }, required: ["elemento", "accion"] } } }, required: ["escenario", "acciones"]
        };

        try {
            const response = await fetch(API_URL_BASE + apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseSchema: schema } }) });
            if (!response.ok) throw new Error(`Error de la API: ${response.statusText}`);
            const result = await response.json();
            const parsed = JSON.parse(result.candidates[0].content.parts[0].text || '{}');
            
            console.log("Respuesta de la API:", parsed);

            const { escenario, elementos_mapeados = [], elementos_requeridos = [], acciones = [] } = parsed;
            animationSequence = acciones;
            requiredElements = elementos_requeridos;
            
            if (escenario && escenario.textura_suelo && savedImages[escenario.textura_suelo]) {
                loadedImages['textura_suelo'] = { dataUrl: savedImages[escenario.textura_suelo], color_cielo: escenario.color_cielo };
                 console.log(`Escenario definido: Suelo con textura '${escenario.textura_suelo}' y cielo '${escenario.color_cielo}'`);
            }
            elementos_mapeados.forEach(el => { if (el && el.mapeo && savedImages[el.mapeo]) { loadedImages[el.nombre] = { dataUrl: savedImages[el.mapeo] }; }});
            
            displayElementLoaders(elementos_mapeados, escenario);
        } catch (error) {
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
             div.innerHTML = `<h4>Escenario:</h4><ul><li>Suelo: <b>${scenario.textura_suelo}</b></li><li>Cielo: <b style="background:${scenario.color_cielo}; color: white; padding: 2px 6px; border-radius: 4px;">${scenario.color_cielo}</b></li></ul>`;
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
                item.innerHTML = `<label class="lista-elementos__label">${el.nombre} (${el.tipo})</label><input type="file" accept="image/*" data-element-name="${el.nombre}" class="lista-elementos__input">`;
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
    
    // --- VII. MOTOR DE RENDERIZADO Y ANIMACIÓN ---

    async function handleRenderScene() {
        if (!loadedImages['textura_suelo']) { showError("No se ha definido una textura de suelo."); return; }
        if (animationLoopId) cancelAnimationFrame(animationLoopId);
        
        sceneCanvas.classList.remove('oculto');
        canvasPlaceholder.classList.add('oculto');
        
        const imagePromises = Object.entries(loadedImages).filter(([name]) => name !== 'textura_suelo').map(([name, data]) => {
            const elData = (requiredElements.find(e => e.nombre === name) || {});
            return new Promise(res => {
                const img = new Image();
                img.onload = () => res({ name, img, ...elData });
                img.onerror = () => res(null);
                img.src = data.dataUrl;
            });
        });
        const loadedElements = (await Promise.all(imagePromises)).filter(Boolean);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(loadedImages.textura_suelo.dataUrl, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(20, 20);

            initThreeScene(loadedImages.textura_suelo.color_cielo, texture);
            initializeActorStates(loadedElements);
            startAnimation();
            if (renderButton) renderButton.classList.remove('pulse-animation');
        }, undefined, (err) => {
            showError("No se pudo cargar la textura del suelo. Revisa la ruta de la imagen.");
            console.error("Error de carga de textura:", err);
        });
    }

    function initThreeScene(bgColor, groundTex) {
        threeScene = new THREE.Scene();
        threeScene.background = new THREE.Color(bgColor);
        const aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
        threeCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        threeCamera.position.set(0, 8, 25);
        threeCamera.lookAt(0, 0, 0);
        threeScene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
        dirLight.position.set(5, 10, 7.5);
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

    function initializeActorStates(loadedElementsArray) {
        const spacing = sceneCanvas.width / (loadedElementsArray.length + 1);
        elementStates.foreground = {};
        loadedElementsArray.forEach((el, i) => {
            if (!el.img) return;
            const sizes = { 'muy grande': 0.8, 'grande': 0.6, 'mediano': 0.4, 'pequeño': 0.2, 'muy pequeño': 0.1 };
            const mult = sizes[el.tamaño] || 0.4;
            const h = sceneCanvas.height * mult;
            const w = h * (el.img.width / el.img.height);
            const x = spacing * (i + 1) - (w / 2);
            const y = sceneCanvas.height - h - (sceneCanvas.height * 0.1);
            elementStates.foreground[el.name] = {
                img: el.img, x, y, startX: x, startY: y, width: w, height: h, visible: true, isMoving: false, moveSpeed: 2, targetX: x, targetY: y, isJumping: false, velocityY: 0, gravity: 0.5, isScaling: false, scale: 1, targetScale: 1, isFading: false, opacity: 1, targetOpacity: 1, isRotating: false, rotation: 0, targetRotation: 0, isSpeaking: false, speakTime: 0, dialogue: '', isShaking: false, shakeTime: 0, isBlinking: false, blinkTime: 0, direction: 1
            };
        });
    }

    function startAnimation() {
        currentActionIndex = 0;
        if(animationLoopId) cancelAnimationFrame(animationLoopId);
        
        const animate = () => {
            animationLoopId = requestAnimationFrame(animate);
            if (threeRenderer) threeRenderer.render(threeScene, threeCamera);
            
            ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
            updateStates();
            drawCurrentFrame();

            if (isActionComplete()) {
                currentActionIndex++;
                if (currentActionIndex >= animationSequence.length) {
                    cancelAnimationFrame(animationLoopId);
                    animationLoopId = null;
                    console.log("Fin de la animación.");
                    return;
                }
                processNextAction();
            }
        };
        processNextAction();
        animate();
    }
    
    function updateStates() {
        for (const name in elementStates.foreground) {
            const state = elementStates.foreground[name];
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
             if (state.isJumping) {
                state.y += state.velocityY;
                state.velocityY += state.gravity;
                if (state.y >= state.startY) {
                    state.y = state.startY;
                    state.isJumping = false;
                }
            }
        }
    }

    function drawCurrentFrame() {
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
                ctx.drawImage(actorState.img, drawX, drawY, actorState.width * actorState.scale, actorState.height * actorState.scale);
                ctx.restore();
                drawSpeechBubble(ctx, actorState);
            }
        }
    }

    function processNextAction() {
        if (currentActionIndex >= animationSequence.length) return;
        const action = animationSequence[currentActionIndex];
        const actor = elementStates.foreground[action.elemento];
        if (!actor) {
            currentActionIndex++;
            processNextAction();
            return;
        }
        
        switch (action.accion) {
            case 'entrar_por_izquierda':
                actor.x = -actor.width;
                actor.targetX = actor.startX;
                actor.isMoving = true;
                break;
            case 'hablar':
                actor.isSpeaking = true;
                actor.dialogue = action.dialogo;
                actor.speakTime = 180; // 3 segundos
                break;
            case 'saltar':
                 if (!actor.isJumping) {
                    actor.isJumping = true;
                    actor.velocityY = -12;
                }
                break;
        }
    }

    function isActionComplete() {
        if (currentActionIndex >= animationSequence.length) return true;
        const action = animationSequence[currentActionIndex];
        const actor = elementStates.foreground[action.elemento];
        if (!actor) return true;
        
        if (actor.isMoving) return false;
        if (actor.isJumping) return false;
        if (actor.isSpeaking) {
            actor.speakTime--;
            if (actor.speakTime <= 0) {
                actor.isSpeaking = false;
                return true;
            }
            return false;
        }
        return true;
    }

    function drawSpeechBubble(ctx, actor) {
        if (!actor.isSpeaking || !actor.dialogue) return;
        const text = actor.dialogue;
        const x = actor.x + actor.width / 2;
        const y = actor.y - 25;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        const padding = 10;
        const textMetrics = ctx.measureText(text);
        const w = textMetrics.width + padding * 2;
        const h = 20 + padding * 2;
        const bubbleX = x - w / 2;
        const bubbleY = y - h;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, w, h, 15);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, bubbleY + h);
        ctx.lineTo(x - 10, bubbleY + h);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 10, bubbleY + h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'black';
        ctx.fillText(text, x, bubbleY + h / 2);
    }
    
    function resizeAllCanvas() {
        const rect = canvasContainer.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            sceneCanvas.width = rect.width;
            sceneCanvas.height = rect.height;
            if (threeCamera && threeRenderer) {
                threeCamera.aspect = rect.width / rect.height;
                threeCamera.updateProjectionMatrix();
                threeRenderer.setSize(rect.width, rect.height);
            }
        }
    }
});
