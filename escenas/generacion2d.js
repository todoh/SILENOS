// datos/escenas/generacion2d.js

// --- DOM Element References ---
        const scriptInput = document.getElementById('script-input');
        const analyzeButton = document.getElementById('analyze-button');
        const loadingSpinner = document.getElementById('loading-spinner');
        const analyzeIcon = document.getElementById('analyze-icon');
        const elementsSection = document.getElementById('elements-section');
        const elementsList = document.getElementById('elements-list');
        const renderButton = document.getElementById('render-button');
        const sceneCanvas = document.getElementById('scene-canvas');
        const canvasPlaceholder = document.getElementById('canvas-placeholder');
        const errorMessage = document.getElementById('error-message');
        const errorText = document.getElementById('error-text');

        // --- State Management ---
        let requiredElements = [];
        let loadedImages = {};
        let loadedImageObjects = []; // Almacenará los objetos de imagen cargados para su uso posterior

        // --- Gemini API Configuration ---
        // IMPORTANTE: Reemplaza "TU_API_KEY_AQUI" con tu clave de API de Google AI Studio.
        const API_KEY =  apiKey ; 
        const API_URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;


        // --- Schema for Element Extraction ---
        const elementExtractionSchema = {
            type: "OBJECT",
            properties: {
                elementos: {
                    type: "ARRAY",
                    description: "Lista de elementos visuales en la escena.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            nombre: { type: "STRING", description: "Nombre del elemento, ej: 'caballero valiente'." },
                            tipo: { type: "STRING", enum: ["personaje", "objeto", "escenario"], description: "Tipo de elemento." }
                        },
                        required: ["nombre", "tipo"]
                    }
                }
            },
            required: ["elementos"]
        };

        // --- Event Listeners ---
        analyzeButton.addEventListener('click', () => {
            handleAnalyzeScript(scriptInput.value);
        });
        renderButton.addEventListener('click', handleRenderScene);

        // --- UI Functions ---
        function setAnalyzeLoading(isLoading) {
            analyzeButton.disabled = isLoading;
            loadingSpinner.classList.toggle('hidden', !isLoading);
            analyzeIcon.classList.toggle('hidden', isLoading);
        }
        
        function showError(message) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
        }

        function hideError() {
            errorMessage.classList.add('hidden');
        }
        
        function resetState() {
            elementsSection.classList.add('hidden');
            elementsList.innerHTML = '';
            renderButton.disabled = true;
            renderButton.classList.remove('pulse-animation');
            requiredElements = [];
            loadedImages = {};
            const ctx = sceneCanvas.getContext('2d');
            ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
            sceneCanvas.classList.add('hidden');
            canvasPlaceholder.classList.remove('hidden');
            hideError();
        }

        // --- Helper Functions ---
        /**
         * Extracts a JSON code block from a string.
         */
        function extractJson(text) {
            const match = text.match(/```json\n([\s\S]*?)\n```/);
            if (match && match[1]) {
                return match[1];
            }
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex !== -1 && endIndex > startIndex) {
                return text.substring(startIndex, endIndex + 1);
            }
            return text; // Return text as-is if no JSON is found
        }
        
        // --- Core Logic ---

        /**
         * Step 1: Analyze the script to extract visual elements.
         */
        async function handleAnalyzeScript(scriptText) {
            
            if (API_KEY === "TU_API_KEY_AQUI") {
                 showError("Por favor, reemplaza 'TU_API_KEY_AQUI' en el código con tu clave de API real de Google AI Studio.");
                 return;
            }
            if (!scriptText) {
                showError("Por favor, escribe un guion antes de analizar.");
                return;
            }
            resetState();
            setAnalyzeLoading(true);

            const prompt = `Analiza el siguiente guion de una escena y extrae una lista de todos los elementos visuales necesarios. Clasifica cada elemento estrictamente como 'personaje', 'objeto', o 'escenario'. Si hay múltiples fondos descritos, elige solo uno como 'escenario'.\n\nGuion: "${scriptText}"`;
            
            try {
                const payload = {
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json", responseSchema: elementExtractionSchema }
                };
                const response = await fetch(API_URL_BASE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    const errorBody = await response.json().catch(() => null);
                    const apiMessage = errorBody?.error?.message || response.statusText;
                    let errorDetail = `Error de la API: ${response.status} (${apiMessage})`;
                    if (response.status === 400) {
                        errorDetail += " (Bad Request). La solicitud es incorrecta, posiblemente por el schema de extracción.";
                    } else if (response.status === 403) {
                        errorDetail += ". La clave de API es inválida o no tiene permisos.";
                    }
                    throw new Error(errorDetail);
                }
                const result = await response.json();

                if (result.candidates && result.candidates[0].content.parts[0].text) {
                    const parsedJson = JSON.parse(result.candidates[0].content.parts[0].text);
                    requiredElements = parsedJson.elementos || [];
                    if (requiredElements.length > 0) {
                        await generateAllElements(); // Proceed to image generation
                    } else {
                         showError("La IA no pudo identificar elementos visuales. Intenta ser más descriptivo.");
                    }
                } else {
                     const feedback = result.promptFeedback;
                     if (feedback && feedback.blockReason) {
                        throw new Error(`Solicitud bloqueada por seguridad: ${feedback.blockReason}. Intenta con un guion diferente.`);
                     } else {
                        throw new Error("La respuesta de la API no contiene los datos esperados.");
                     }
                }

            } catch (error) {
                console.error("Error en handleAnalyzeScript:", error);
                showError(`${error.message}`);
            } finally {
                setAnalyzeLoading(false);
                handleRenderScene();
            }
        }

        // Exponer la función al objeto window para acceso global
        window.handleAnalyzeScript = handleAnalyzeScript;

        /**
         * Step 2: Orchestrate the generation of all required visual elements.
         */
        async function generateAllElements() {
            elementsSection.classList.remove('hidden');
            elementsList.innerHTML = '';
            
            requiredElements.forEach(element => {
                const li = document.createElement('li');
                li.id = `status-${element.nombre.replace(/\s+/g, '-')}`;
                li.className = 'flex items-center justify-between bg-gray-800 p-3 rounded-md text-gray-300';
                li.innerHTML = `<span class="capitalize">${element.nombre} (${element.tipo})</span><div class="status-icon pending"></div>`;
                elementsList.appendChild(li);
            });

            const generationPromises = requiredElements.map(element => generateImageForElement(element));
            
            await Promise.allSettled(generationPromises);

            const successfulElements = Object.keys(loadedImages);
            if (successfulElements.length > 0) {
                 renderButton.disabled = false;
                 renderButton.classList.add('pulse-animation');
            }
            
            if (successfulElements.length < requiredElements.length) {
                const failedElements = requiredElements.filter(el => !successfulElements.includes(el.nombre));
                const failedNames = failedElements.map(el => el.nombre).join(', ');
                showError(`Algunos elementos no se pudieron generar: ${failedNames}. Puedes renderizar la escena con los elementos exitosos.`);
            }
        }

        /**
         * Robust API call function with retry logic for parsing JSON.
         */
        async function callApiAndParseJson(prompt, maxRetries = 2) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const payload = { contents: [{ parts: [{ text: prompt }] }] };
                    const response = await fetch(API_URL_BASE, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                         const errorBody = await response.json().catch(() => ({ error: { message: response.statusText }}));
                         const errorMessage = errorBody?.error?.message || `Error de API (${response.status})`;
                         throw new Error(errorMessage);
                    }
                    
                    const data = await response.json();
                    if (!data.candidates || data.candidates.length === 0) {
                        const blockReason = data.promptFeedback?.blockReason;
                        if (blockReason) throw new Error(`Bloqueado por seguridad: ${blockReason}.`);
                        throw new Error("La API no devolvió candidatos.");
                    }
                    
                    const text = data.candidates[0]?.content?.parts?.[0]?.text;
                    if (!text) throw new Error("La respuesta de la API no contiene texto válido.");
                    
                    const jsonString = extractJson(text);
                    return JSON.parse(jsonString); // Attempt to parse
                } catch (error) {
                    console.warn(`Intento ${attempt}/${maxRetries} fallido. Error:`, error.message);
                    if (attempt === maxRetries) {
                         throw new Error(`No se pudo obtener una respuesta JSON válida tras ${maxRetries} intentos.`);
                    }
                }
            }
        }

        /**
         * Generates a single image for a given element using the robust API call function.
         */
        async function generateImageForElement(element) {
            const prompt = `Diseña una entidad 2D basada en la siguiente descripción: "${element.nombre}".
                El resultado debe ser un único objeto JSON, sin texto adicional ni markdown.
                La estructura del JSON debe ser:
                {
                  "canvas": { "width": 512, "height": 512, "backgroundColor": "rgba(0,0,0,0)" },
                  "shapes": [
                    {
                      "type": "rect" | "circle" | "path" | "group",
                      "name": "descripción de la forma",
                      "position": { "x": number, "y": number },
                      "size": { "width": number, "height": number } | { "radius": number },
                      "style": { "fillStyle": "#hex | gradient", "strokeStyle": "#hex", "lineWidth": number },
                      "pathData": "string (SVG path 'd' attribute)",
                      "children": [ ... (array de formas) ]
                    }
                  ]
                }
                Descompón la entidad en formas geométricas. Sé creativo y detallado.`;

            const statusElement = document.getElementById(`status-${element.nombre.replace(/\s+/g, '-')}`);

            try {
                const designJson = await callApiAndParseJson(prompt);
                
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                render2dObject(designJson, tempCanvas, tempCtx);

                loadedImages[element.nombre] = {
                    type: element.tipo,
                    dataUrl: tempCanvas.toDataURL('image/png')
                };

                if (statusElement) {
                   const icon = statusElement.querySelector('.status-icon');
                   icon.classList.remove('pending', 'animate-spin');
                   icon.classList.add('done');
                   icon.innerHTML = '✔️';
                }

            } catch (error) {
                console.error(`Error generando '${element.nombre}':`, error);
                if (statusElement) {
                    const icon = statusElement.querySelector('.status-icon')
                    icon.classList.remove('pending', 'animate-spin');
                    icon.innerHTML = '❌';
                    statusElement.classList.add('text-red-400');
                }
            }
        }

        /**
         * [NUEVO] Calculates the bounding box of a set of shapes.
         * This is a simplified implementation, especially for paths.
         */
        function getBoundingBox(shapes) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            function processShape(shape, offsetX = 0, offsetY = 0) {
                const x = (shape.position?.x || 0) + offsetX;
                const y = (shape.position?.y || 0) + offsetY;

                if (shape.type === 'group' && shape.children) {
                    shape.children.forEach(child => processShape(child, x, y));
                    return;
                }

                let sMinX = x, sMinY = y, sMaxX = x, sMaxY = y;

                switch (shape.type) {
                    case 'rect':
                        sMinX = x;
                        sMinY = y;
                        sMaxX = x + shape.size.width;
                        sMaxY = y + shape.size.height;
                        break;
                    case 'circle':
                        sMinX = x - shape.size.radius;
                        sMinY = y - shape.size.radius;
                        sMaxX = x + shape.size.radius;
                        sMaxY = y + shape.size.radius;
                        break;
                    case 'path':
                        if (shape.pathData) {
                            const nums = shape.pathData.match(/-?\d+(\.\d+)?/g);
                            if (nums) {
                                let pMinX = x, pMaxX = x, pMinY = y, pMaxY = y;
                                for (let i = 0; i < nums.length; i += 2) {
                                    if (i + 1 < nums.length) {
                                        const px = parseFloat(nums[i]) + x;
                                        const py = parseFloat(nums[i + 1]) + y;
                                        pMinX = Math.min(pMinX, px);
                                        pMinY = Math.min(pMinY, py);
                                        pMaxX = Math.max(pMaxX, px);
                                        pMaxY = Math.max(pMaxY, py);
                                    }
                                }
                                sMinX = pMinX;
                                sMinY = pMinY;
                                sMaxX = pMaxX;
                                sMaxY = pMaxY;
                            }
                        }
                        break;
                    default:
                        return;
                }

                minX = Math.min(minX, sMinX);
                minY = Math.min(minY, sMinY);
                maxX = Math.max(maxX, sMaxX);
                maxY = Math.max(maxY, sMaxY);
            }

            shapes.forEach(shape => processShape(shape));

            if (minX === Infinity || maxX === -Infinity) {
                return { x: 0, y: 0, width: 0, height: 0 };
            }

            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }

        /**
         * [MODIFICADO] Renders a 2D object onto a canvas from a JSON design.
         * Now centers and scales the drawing to fit the canvas.
         */
        function render2dObject(design, canvas, ctx) {
            if (!design || !design.canvas || !design.shapes) {
                throw new Error("El JSON de diseño recibido es inválido o está mal formado.");
            }
            canvas.width = design.canvas.width || 512;
            canvas.height = design.canvas.height || 512;
            ctx.fillStyle = design.canvas.backgroundColor || 'rgba(0,0,0,0)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const bounds = getBoundingBox(design.shapes);

            if (bounds.width === 0 || bounds.height === 0) {
                design.shapes.forEach(shape => drawShape(shape, ctx));
                return; // No content to scale or center
            }

            // Calculate scale to fit canvas, with a margin ("casi todo")
            const margin = 0.90; // Use 90% of the canvas space
            const scale = Math.min((canvas.width * margin) / bounds.width, (canvas.height * margin) / bounds.height);

            // Calculate translation to center the scaled drawing
            const scaledWidth = bounds.width * scale;
            const scaledHeight = bounds.height * scale;
            const translateX = (canvas.width - scaledWidth) / 2 - bounds.x * scale;
            const translateY = (canvas.height - scaledHeight) / 2 - bounds.y * scale;

            ctx.save();
            ctx.translate(translateX, translateY);
            ctx.scale(scale, scale);

            design.shapes.forEach(shape => drawShape(shape, ctx));

            ctx.restore();
        }

        /**
         * Recursively draws a shape and its children.
         */
        function drawShape(shape, ctx) {
            ctx.save();
            if (shape.position) ctx.translate(shape.position.x, shape.position.y);
            
            if (shape.style) {
                const style = shape.style;
                ctx.shadowColor = style.shadowColor || 'rgba(0,0,0,0)';
                ctx.shadowBlur = style.shadowBlur || 0;
                ctx.shadowOffsetX = style.shadowOffsetX || 0;
                ctx.shadowOffsetY = style.shadowOffsetY || 0;
                ctx.strokeStyle = style.strokeStyle || 'rgba(0,0,0,0)';
                ctx.lineWidth = style.lineWidth || 1;
                if (typeof style.fillStyle === 'object' && style.fillStyle && style.fillStyle.type) {
                     ctx.fillStyle = createGradient(style.fillStyle, ctx);
                } else {
                     ctx.fillStyle = style.fillStyle || 'rgba(0,0,0,0)';
                }
            }

            ctx.beginPath();
            switch (shape.type) {
                case 'rect': ctx.rect(0, 0, shape.size.width, shape.size.height); break;
                case 'circle': ctx.arc(0, 0, shape.size.radius, 0, Math.PI * 2); break;
                case 'path': if (shape.pathData) { const p = new Path2D(shape.pathData); ctx.fill(p); if (ctx.lineWidth > 0) ctx.stroke(p); } break;
                case 'group': if (shape.children) shape.children.forEach(child => drawShape(child, ctx)); break;
            }

            if(shape.type === 'rect' || shape.type === 'circle') {
                ctx.fill();
                if (ctx.lineWidth > 0 && ctx.strokeStyle !== 'rgba(0,0,0,0)') ctx.stroke();
            }
            ctx.restore();
        }
        
        function createGradient(gradientData, ctx) {
            let gradient;
            if (gradientData.type === 'linear') {
                gradient = ctx.createLinearGradient(gradientData.start[0], gradientData.start[1], gradientData.end[0], gradientData.end[1]);
            } else { // Radial
                 gradient = ctx.createRadialGradient(gradientData.start[0], gradientData.start[1], gradientData.start[2] || 0, gradientData.end[0], gradientData.end[1], gradientData.end[2] || 100);
            }
            gradientData.stops.forEach(stop => {
                gradient.addColorStop(stop.offset, stop.color);
            });
            return gradient;
        }

/**
         * Step 3: Renders the final scene on the main canvas using the generated images.
         * [MODIFICADO v2] Ahora ordena los objetos por un prefijo numérico (ej: "1-base") antes de apilarlos.
         */
        async function handleRenderScene() {
            const ctx = sceneCanvas.getContext('2d');
            sceneCanvas.classList.remove('hidden');
            canvasPlaceholder.classList.add('hidden');

            const rect = sceneCanvas.getBoundingClientRect();
            sceneCanvas.width = rect.width;
            sceneCanvas.height = rect.height;
            ctx.clearRect(0, 0, sceneCanvas.width, sceneCanvas.height);
            
            const imagePromises = Object.entries(loadedImages).map(([name, data]) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve({ name, img, type: data.type });
                    img.onerror = () => reject(new Error(`No se pudo cargar la imagen para ${name}`));
                    img.src = data.dataUrl;
                });
            });

            // Asignamos al estado global para que otras funciones puedan acceder a las imágenes cargadas
            loadedImageObjects = await Promise.all(imagePromises);
            
            const background = loadedImageObjects.find(el => el.type === 'escenario');
            const characters = loadedImageObjects.filter(el => el.type === 'personaje');
            const objects = loadedImageObjects.filter(el => el.type === 'objeto');

            // Dibujar fondo
            if (background) {
                ctx.drawImage(background.img, 0, 0, sceneCanvas.width, sceneCanvas.height);
            } else {
                const gradient = ctx.createLinearGradient(0, 0, 0, sceneCanvas.height);
                gradient.addColorStop(0, '#1a202c');
                gradient.addColorStop(1, '#2d3748');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, sceneCanvas.width, sceneCanvas.height);
            }

            // --- INICIO DE LA LÓGICA MODIFICADA v2 ---

            if (characters.length > 0) {
                // Lógica original para escenas con personajes
                const elementsToDraw = [...characters, ...objects];
                const elementSpacing = sceneCanvas.width / (elementsToDraw.length + 1);

                elementsToDraw.forEach((element, index) => {
                    const aspectRatio = element.img.width / element.img.height;
                    let elementHeight = sceneCanvas.height * (element.type === 'personaje' ? 0.6 : 0.25);
                    let elementWidth = elementHeight * aspectRatio;
                    
                    if (elementWidth > elementSpacing * 0.8) {
                        elementWidth = elementSpacing * 0.8;
                        elementHeight = elementWidth / aspectRatio;
                    }

                    const x = elementSpacing * (index + 1) - (elementWidth / 2);
                    const y = sceneCanvas.height - elementHeight - (sceneCanvas.height * 0.1);

                    ctx.drawImage(element.img, x, y, elementWidth, elementHeight);
                });

            } else if (objects.length > 0) {
                // LÓGICA DE APILADO MEJORADA: Ordenar por nombre antes de apilar

                // Función para extraer el número del prefijo (ej: "1-base" -> 1)
                const getOrderNumber = (name) => {
                    const match = name.match(/^(\d+)/);
                    return match ? parseInt(match[1], 10) : Infinity; // Si no hay número, va al final
                };

                // Ordenamos los objetos. El que tenga el número más bajo (ej: "1-base") irá primero.
                objects.sort((a, b) => getOrderNumber(a.name) - getOrderNumber(b.name));
                
                let currentY = sceneCanvas.height * 0.95; 
                const totalObjectHeight = objects.reduce((sum, el) => {
                     const aspectRatio = el.img.width / el.img.height;
                     return sum + (sceneCanvas.width * 0.35) / aspectRatio;
                }, 0);
                
                const scale = Math.min(1, (sceneCanvas.height * 0.9) / totalObjectHeight);

                // Dibujamos de arriba hacia abajo (orden natural del array ordenado)
                // Pero calculamos la posición Y total primero para centrarlo verticalmente
                const finalRenderHeight = objects.reduce((sum, el) => {
                    const aspectRatio = el.img.width / el.img.height;
                    return sum + ((sceneCanvas.width * 0.35) * scale) / aspectRatio;
                }, 0);

                let startY = (sceneCanvas.height / 2) - (finalRenderHeight / 2);

                // Invertimos el array para dibujar de abajo hacia arriba
                const reversedObjects = objects.reverse();
                
                let renderY = sceneCanvas.height * 0.95;

                reversedObjects.forEach(element => {
                    const aspectRatio = element.img.width / element.img.height;
                    let elementWidth = (sceneCanvas.width * 0.35) * scale;
                    let elementHeight = elementWidth / aspectRatio;

                    const x = (sceneCanvas.width / 2) - (elementWidth / 2);
                    const y = renderY - elementHeight;

                    ctx.save();
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 5;
                    ctx.shadowOffsetY = 5;
                    ctx.drawImage(element.img, x, y, elementWidth, elementHeight);
                    ctx.restore();

                    renderY = y;
                });
            }
            // --- FIN DE LA LÓGICA MODIFICADA v2 ---
            
            renderButton.classList.remove('pulse-animation');
        }

        /**
         * [NUEVO] Captura la escena actual del canvas principal y la muestra en una miniatura.
         * Se activa al hacer clic en un botón con la clase '.toma-video-btn'.
         * Busca el contenedor '.toma-imagen-preview' dentro del '.toma-card' correspondiente.
         * @param {Event} event - El evento de clic del botón.
         */
        function handleCaptureScene(event) {
            const button = event.currentTarget;
            const card = button.closest('.toma-card'); // Busca el 'toma-card' más cercano

            if (!card) {
                console.error("Error: No se pudo encontrar el elemento '.toma-card' padre del botón.");
                return;
            }

            const previewDiv = card.querySelector('.toma-imagen-preview');
            if (!previewDiv) {
                console.error("Error: No se encontró el div '.toma-imagen-preview' dentro del card.");
                return;
            }

            // Asegurarse de que la escena esté renderizada y tenga contenido
            if (sceneCanvas.classList.contains('hidden') || loadedImageObjects.length === 0) {
                showError("Primero debes generar y renderizar una escena para poder capturarla.");
                return;
            }

            // Capturar la imagen del canvas como un Data URL (JPEG es más eficiente para escenas complejas)
            const imageDataUrl = sceneCanvas.toDataURL('image/jpeg', 0.9);

            // Asignar la imagen como fondo del div de previsualización para un mejor ajuste
            previewDiv.style.backgroundImage = `url(${imageDataUrl})`;
            previewDiv.style.backgroundSize = 'cover';
            previewDiv.style.backgroundPosition = 'center';
        }

        // --- Event Listeners para la captura de tomas ---
        // Este código asume que tu HTML tiene botones con la clase 'toma-video-btn'.
        // Se ejecutará cuando el script se cargue.
        document.querySelectorAll('.toma-video-btn').forEach(button => {
            button.addEventListener('click', handleCaptureScene);
        });