

        // --- DOM References ---
        const scriptInput = document.getElementById('script-input'),
              analyzeButton = document.getElementById('analyze-button'),
              loadingSpinner = document.getElementById('loading-spinner'),
              analyzeIcon = document.getElementById('analyze-icon'),
              elementsSection = document.getElementById('elements-section'),
              elementsList = document.getElementById('elements-list'),
              renderButton = document.getElementById('render-button'),
              sceneCanvas = document.getElementById('scene-canvas'),
              canvasPlaceholder = document.getElementById('canvas-placeholder'),
              errorMessage = document.getElementById('error-message'),
              errorText = document.getElementById('error-text');

        // --- State Management ---
        let requiredElements = [];
        let loadedImages = {};
        let animationSequence = [];
        let elementStates = {};
        let animationLoopId = null;
        let currentActionIndex = 0;

        // --- Gemini API ---
    //    const API_KEY = apiKey; // Handled by environment
      //  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

        // --- Event Listeners ---
        analyzeButton.addEventListener('click', handleAnalyzeScript);
        renderButton.addEventListener('click', handleRenderScene);

        // --- UI Functions ---
        const setAnalyzeLoading = (isLoading) => {
            analyzeButton.disabled = isLoading;
            loadingSpinner.classList.toggle('hidden', !isLoading);
            analyzeIcon.classList.toggle('hidden', isLoading);
        };
        const showError = (message) => {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
        };
        const hideError = () => errorMessage.classList.add('hidden');

        /**
         * Resets the entire application state for a new script.
         */
        function resetState() {
            if (animationLoopId) {
                cancelAnimationFrame(animationLoopId);
                animationLoopId = null;
            }
            elementsSection.classList.add('hidden');
            elementsList.innerHTML = '';
            renderButton.disabled = true;
            renderButton.classList.remove('pulse-animation');
            requiredElements = [];
            loadedImages = {};
            animationSequence = [];
            elementStates = {};
            const ctx = sceneCanvas.getContext('2d');
            ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
            sceneCanvas.classList.add('hidden');
            canvasPlaceholder.classList.remove('hidden');
        }

        /**
         * Analyzes the script to extract elements and a sequence of actions.
         */
        async function handleAnalyzeScript() {
            const scriptText = scriptInput.value.trim();
            if (!scriptText) {
                showError("Por favor, escribe un guion antes de analizar.");
                return;
            }
            hideError();
            setAnalyzeLoading(true);
            resetState();

            const prompt = `Actúa como un director de animación. Analiza el siguiente guion y desglósalo en dos partes: una lista de 'elementos' visuales y una secuencia de 'acciones'.

Para los 'elementos':
- Clasifícalos como 'personaje', 'objeto' o 'escenario'.
- Estima su tamaño relativo: "muy pequeño", "pequeño", "mediano", "grande", "muy grande" (o 'n/a' para el escenario).

Para las 'acciones':
- Extrae una lista ordenada de las acciones.
- Para cada acción, identifica el 'elemento' que la realiza.
- Clasifica la 'accion' como: 'entrar', 'salir', 'moverse_hacia', 'hablar'.
- Si la acción tiene un objetivo (ej, moverse HACIA otro elemento), identifica el 'objetivo'.

Guion: "${scriptText}"`;

            const schema = {
                type: "OBJECT",
                properties: {
                    elementos: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                nombre: { type: "STRING" },
                                tipo: { type: "STRING", enum: ["personaje", "objeto", "escenario"] },
                                tamaño: { type: "STRING", enum: ["muy pequeño", "pequeño", "mediano", "grande", "muy grande", "n/a"] }
                            },
                            required: ["nombre", "tipo", "tamaño"]
                        }
                    },
                    acciones: {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                elemento: { type: "STRING" },
                                accion: { type: "STRING", enum: ["entrar", "salir", "moverse_hacia", "hablar"] },
                                objetivo: { type: "STRING" }
                            },
                            required: ["elemento", "accion"]
                        }
                    }
                },
                required: ["elementos", "acciones"]
            };
              // Validamos que la API Key exista justo antes de usarla
            if (typeof apiKey === 'undefined' || !apiKey) {
                showError("La API Key de Gemini no está configurada. Ve a Ajustes para añadirla.");
                setAnalyzeLoading(false);
                return;
            }
            
            // Construimos la URL aquí, usando el valor actualizado de la variable global 'apiKey'
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: "user", parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json", responseSchema: schema }
                    })
                });
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                const result = await response.json();
                if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    const parsed = JSON.parse(result.candidates[0].content.parts[0].text);
                    requiredElements = parsed.elementos || [];
                    animationSequence = parsed.acciones || [];
                    if (requiredElements.length > 0) displayElementLoaders();
                    else showError("La IA no pudo identificar elementos. Intenta ser más descriptivo.");
                } else throw new Error("La respuesta de la API no es válida.");
            } catch (error) {
                console.error("Error en handleAnalyzeScript:", error);
                showError(`No se pudo analizar el guion. Detalle: ${error.message}`);
            } finally {
                setAnalyzeLoading(false);
            }
        }

        // --- Image Loading ---
        function displayElementLoaders() {
            elementsList.innerHTML = '';
            requiredElements.forEach(element => {
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between bg-gray-800 p-3 rounded-md';
                div.innerHTML = `
                    <label class="text-gray-300 capitalize">${element.nombre} (${element.tipo})</label>
                    <input type="file" accept="image/*" data-element-name="${element.nombre}" class="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">
                `;
                div.querySelector('input').addEventListener('change', handleImageUpload);
                elementsList.appendChild(div);
            });
            elementsSection.classList.remove('hidden');
        }

        function handleImageUpload(event) {
            const file = event.target.files[0];
            const elementName = event.target.dataset.elementName;
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadedImages[elementName] = { dataUrl: e.target.result };
                    event.target.previousElementSibling.classList.add('text-green-400');
                    event.target.previousElementSibling.textContent += ' ✔️';
                    if (Object.keys(loadedImages).length === requiredElements.length) {
                        renderButton.disabled = false;
                        renderButton.classList.add('pulse-animation');
                    }
                };
                reader.readAsDataURL(file);
            }
        }

        // --- Animation Engine ---
        function getSizeMultiplier(tamaño) {
            const sizes = { 'muy grande': 0.8, 'grande': 0.6, 'mediano': 0.4, 'pequeño': 0.2, 'muy pequeño': 0.05 };
            return sizes[tamaño] || 0.4;
        }
        
        /**
         * Sets up the scene and starts the animation loop.
         */
         async function handleRenderScene() {
            if (animationLoopId) cancelAnimationFrame(animationLoopId);

            const ctx = sceneCanvas.getContext('2d');
            sceneCanvas.classList.remove('hidden');
            canvasPlaceholder.classList.add('hidden');
            const rect = sceneCanvas.getBoundingClientRect();
            sceneCanvas.width = rect.width;
            sceneCanvas.height = rect.height;

            const imagePromises = Object.entries(loadedImages).map(([name, data]) => {
                // Use robust, case-insensitive matching for element data
                const elData = requiredElements.find(e => e.nombre.trim().toLowerCase() === name.trim().toLowerCase());
                return new Promise(res => {
                    if (!elData) {
                        console.warn(`Could not find element data for "${name}". Treating as default object.`);
                        res({ name, img: null, tipo: 'objeto', tamaño: 'mediano' }); // CORREGIDO: usa 'tipo'
                        return;
                    }
                    const img = new Image();
                    img.onload = () => res({ name, img, ...elData });
                    img.onerror = () => {
                         console.error(`Failed to load image for "${name}"`);
                         res({ name, img: null, ...elData });
                    }
                    img.src = data.dataUrl;
                });
            });
            const loaded = await Promise.all(imagePromises);

            elementStates = {};
            
            // CORRECCIÓN 1: Se cambió el.type por el.tipo
            const background = loaded.find(el => el && el.tipo && el.tipo.trim().toLowerCase() === 'escenario');
            if (background && background.img) {
                 elementStates.background = { img: background.img };
            }
            
            // CORRECCIÓN 2: Se cambió el.type por el.tipo
            const elementsToDraw = loaded.filter(el => el && el.img && (!el.tipo || el.tipo.trim().toLowerCase() !== 'escenario'));
            
            const spacing = sceneCanvas.width / (elementsToDraw.length + 1);

            elementsToDraw.forEach((el, i) => {
                const mult = getSizeMultiplier(el.tamaño);
                const h = sceneCanvas.height * mult;
                const w = h * (el.img.width / el.img.height);
                const x = spacing * (i + 1) - (w / 2);
                const y = sceneCanvas.height - h - (sceneCanvas.height * 0.1);
                elementStates[el.name] = { img: el.img, x, y, startX: x, startY: y, width: w, height: h, visible: true, isMoving: false, isSpeaking: false, speakTime: 0, targetX: x, targetY: y };
            });

            startAnimation(ctx);
            renderButton.classList.remove('pulse-animation');
        }
        
        function startAnimation(ctx) {
            currentActionIndex = 0;
            processNextAction();
            
            function animate() {
                ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
                
                if (elementStates.background) {
                    const img = elementStates.background.img;
                    const canvas = sceneCanvas;
                    const canvasAspect = canvas.width / canvas.height;
                    const imgAspect = img.width / img.height;
                    let sx, sy, sWidth, sHeight;

                    if (imgAspect > canvasAspect) {
                        sHeight = img.height;
                        sWidth = sHeight * canvasAspect;
                        sx = (img.width - sWidth) / 2;
                        sy = 0;
                    } else {
                        sWidth = img.width;
                        sHeight = sWidth / canvasAspect;
                        sx = 0;
                        sy = (img.height - sHeight) / 2;
                    }
                    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
                } else {
                    const grad = ctx.createLinearGradient(0, 0, 0, sceneCanvas.height);
                    grad.addColorStop(0, '#1a202c'); grad.addColorStop(1, '#2d3748');
                    ctx.fillStyle = grad; ctx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);
                }
                
                updateAndDrawElements(ctx);

                if (isActionComplete()) {
                    currentActionIndex++;
                    processNextAction();
                }
                animationLoopId = requestAnimationFrame(animate);
            }
            animate();
        }

        function processNextAction() {
            if (currentActionIndex >= animationSequence.length) return;
            const action = animationSequence[currentActionIndex];
            // Find actor using robust matching
            const actorName = Object.keys(elementStates).find(k => k.trim().toLowerCase() === action.elemento.trim().toLowerCase());
            const actor = elementStates[actorName];

            if (!actor) {
                currentActionIndex++;
                processNextAction();
                return;
            };
            
            Object.values(elementStates).forEach(s => { if (typeof s === 'object' && s !== null) { s.isMoving = false; s.isSpeaking = false; } });

            switch (action.accion) {
                case 'entrar':
                    actor.x = -actor.width;
                    actor.targetX = actor.startX;
                    actor.isMoving = true;
                    actor.visible = true;
                    break;
                case 'salir':
                    actor.targetX = sceneCanvas.width;
                    actor.isMoving = true;
                    break;
                case 'moverse_hacia':
                     const targetName = Object.keys(elementStates).find(k => k.trim().toLowerCase() === action.objetivo.trim().toLowerCase());
                     const target = elementStates[targetName];
                    if (target) {
                        actor.targetX = target.x;
                        actor.isMoving = true;
                    }
                    break;
                case 'hablar':
                    actor.isSpeaking = true;
                    actor.speakTime = 120; // 2s @ 60fps
                    break;
            }
        }

        function isActionComplete() {
            if (currentActionIndex >= animationSequence.length) return true;
            const action = animationSequence[currentActionIndex];
            const actorName = Object.keys(elementStates).find(k => k.trim().toLowerCase() === action.elemento.trim().toLowerCase());
            const actor = elementStates[actorName];
            if (!actor) return true;

            switch (action.accion) {
                case 'entrar': case 'salir': case 'moverse_hacia':
                    return !actor.isMoving;
                case 'hablar':
                    return actor.speakTime <= 0;
                default:
                    return true;
            }
        }

        function updateAndDrawElements(ctx) {
            const speed = 2;
            for (const name in elementStates) {
                if (name === 'background' || !elementStates[name].visible) continue;
                const state = elementStates[name];

                if (state.isMoving) {
                    const dx = state.targetX - state.x;
                    if (Math.abs(dx) < speed) {
                        state.x = state.targetX;
                        state.isMoving = false;
                    } else {
                        state.x += Math.sign(dx) * speed;
                    }
                }
                
                if (state.isSpeaking) {
                    state.speakTime--;
                    state.y = state.startY + Math.sin(state.speakTime * 0.5) * 2;
                    if (state.speakTime <= 0) {
                        state.isSpeaking = false;
                        state.y = state.startY;
                    }
                }

                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                ctx.drawImage(state.img, state.x, state.y, state.width, state.height);
                ctx.restore();
            }
        }
   
