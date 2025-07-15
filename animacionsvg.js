// =================================================================
// MÓDULO DE ANIMACIÓN SVG - animacionsvg.js (Versión Sincronizada y Robusta)
// =================================================================
// OBJETIVO: Orquestar la creación de animaciones basadas en SVG
// utilizando la IA de Gemini para la planificación y reutilización de recursos.
//
// MEJORAS CLAVE:
// 1. SINCRONIZADO CON GENERADOR.JS: La llamada a la API (modelo, API key,
//    y safety settings) es idéntica a la del archivo generador.js.
// 2. ESPERA DE API KEY: Se ha añadido una función que espera a que la
//    API key esté disponible, evitando errores de tiempo de carga.
// 3. MANEJO DE ERRORES MEJORADO: Se verifica que la respuesta de la IA sea un JSON válido.
// 4. LÓGICA DE REPRODUCCIÓN: Sistema robusto para detener y limpiar animaciones.
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Referencias a los elementos de la UI de animacion.html
    const generateBtn = document.getElementById('generate-animation-btn');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const promptTextarea = document.getElementById('animation-prompt');
    const canvasEl = document.getElementById('animation-canvas');

    if (!generateBtn) return; // Salir si no estamos en la página de animación correcta

    // --- CONFIGURACIÓN DEL CANVAS ---
    const CANVAS_WIDTH = 1280;
    const CANVAS_HEIGHT = 720;
    canvasEl.width = CANVAS_WIDTH;
    canvasEl.height = CANVAS_HEIGHT;

    const fabricCanvas = new fabric.Canvas(canvasEl, {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#1e1e1e',
        selection: false // Deshabilitar selección de grupo con el ratón
    });

    let animationPlan = null; // Aquí guardaremos el plan de la IA
    let isPlaying = false;
    let animationTimeouts = []; // Almacena los IDs de los setTimeout para poder detenerlos

    /**
     * Espera a que la variable global 'apiKey' esté disponible.
     * @returns {Promise<string>} La clave de la API.
     */
    function getApiKey() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // Espera hasta 5 segundos
            const interval = setInterval(() => {
                // 'apiKey' es la variable global que se espera que cargue otro script (como io.js)
                if (typeof apiKey !== 'undefined' && apiKey) {
                    clearInterval(interval);
                    resolve(apiKey);
                } else {
                    attempts++;
                    if (attempts > maxAttempts) {
                        clearInterval(interval);
                        reject(new Error("Tiempo de espera agotado para encontrar la API Key. Asegúrate de que la variable global 'apiKey' se está cargando correctamente."));
                    }
                }
            }, 100);
        });
    }


    // --- EVENT LISTENERS ---
    generateBtn.addEventListener('click', handleGenerateAnimation);
    playPauseBtn.addEventListener('click', handlePlayPause);

    /**
     * Llama a la API de Gemini para crear un plan de animación en formato JSON.
     * @param {string} userPrompt - La descripción de la animación solicitada por el usuario.
     * @param {Array} personajesDisponibles - Array de objetos de los personajes existentes.
     * @returns {Promise<object>} El plan de animación en formato JSON.
     */
    async function generarPlanDeAnimacion(userPrompt, personajesDisponibles) {
        console.log("🤖 Creando prompt para la IA...");

        const personajesParaPrompt = personajesDisponibles.map(p =>
            `- Nombre: "${p.nombre}", Descripción: "${p.descripcion}", svgContent: '${p.svgContent}'`
        ).join('\n');

        const systemPrompt = `
Eres un experto director de animación que crea planes de animación para Fabric.js.
Tu única tarea es devolver un objeto JSON válido basado en la petición del usuario y los recursos disponibles. No incluyas texto explicativo, solo el JSON.

El canvas tiene un tamaño de ${CANVAS_WIDTH}x${CANVAS_HEIGHT} píxeles.

El JSON debe tener la siguiente estructura:
{
  "personajes": [
    {
      "nombre": "nombre_del_personaje_a_usar",
      "svgContent": "<svg>...</svg>",
      "posicionInicial": { "x": number, "y": number, "width": number, "angulo": number }
    }
  ],
  "eventos": [
    {
      "tiempo": number,
      "target": "nombre_del_personaje_o_camara",
      "animacion": {
        "left": number, "top": number, "angle": number,
        "duracion": number, "ease": "string"
      }
    }
  ]
}

REGLAS IMPORTANTES:
1.  Utiliza SOLAMENTE los personajes de la lista proporcionada.
2.  Para cada personaje en la sección "personajes" del JSON, DEBES incluir su "svgContent" completo.
3.  Las coordenadas (left, top) deben estar dentro del canvas (${CANVAS_WIDTH}x${CANVAS_HEIGHT}).
4.  Crea una secuencia de eventos ("eventos") lógica y que dure varios segundos.
5.  Puedes animar la "camara" con la propiedad "zoom".
6.  Responde únicamente con el objeto JSON. No uses bloques de código markdown (\`\`\`json).
`;

        const fullPrompt = `
Petición del usuario: "${userPrompt}"

Personajes disponibles:
${personajesParaPrompt || "No hay personajes disponibles. Crea uno si es necesario."}

Genera el plan de animación en formato JSON siguiendo todas las reglas.
`;

        try {
            console.log("Esperando API key y enviando petición a Gemini...");
            
            const aKey = await getApiKey();
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aKey}`;

            const payload = {
                contents: [{ parts: [{ text: systemPrompt + fullPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                },
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ]
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Error en la API de Gemini: ${response.statusText}. Detalles: ${errorBody}`);
            }

            const result = await response.json();
            
            if (!result.candidates || result.candidates.length === 0) {
                throw new Error("La respuesta de la IA no contiene 'candidates'.");
            }
            
            const jsonText = result.candidates[0].content.parts[0].text;
            
            try {
                return JSON.parse(jsonText);
            } catch (parseError) {
                console.error("Error al parsear el JSON de la IA. Respuesta recibida:", jsonText);
                throw new Error("La respuesta de la IA no es un JSON válido.");
            }

        } catch (error) {
            console.error("❌ Error al contactar con la IA:", error);
            throw error;
        }
    }


    /**
     * Orquesta todo el proceso de generación de la animación.
     */
    async function handleGenerateAnimation() {
        const userPrompt = promptTextarea.value.trim();
        if (!userPrompt) {
            alert("Por favor, describe la animación que deseas crear.");
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generando...';
        detenerAnimacion();

        try {
            const personajesDisponibles = obtenerDatosCompletosDelDOM();
            console.log("Personajes disponibles enviados a la IA:", personajesDisponibles);

            animationPlan = await generarPlanDeAnimacion(userPrompt, personajesDisponibles);

            console.log("✅ Plan de animación recibido de la IA:", JSON.stringify(animationPlan, null, 2));

            if (animationPlan && animationPlan.personajes) {
                cargarEscena(animationPlan);
            } else {
                throw new Error("La respuesta de la IA no tiene el formato esperado (falta la clave 'personajes').");
            }

        } catch (error) {
            console.error("❌ Error al generar la animación:", error);
            alert(`Hubo un error al generar el plan de animación: ${error.message}. Revisa la consola para más detalles.`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generar Animación';
        }
    }

    /**
     * Carga los personajes y su estado inicial en el canvas.
     * @param {object} plan - El plan de animación generado por la IA.
     */
    function cargarEscena(plan) {
        fabricCanvas.clear();
        if (!plan || !plan.personajes) {
            console.error("El plan de animación es inválido o no contiene personajes.");
            return;
        }

        plan.personajes.forEach(personaje => {
            if (personaje.svgContent) {
                fabric.loadSVGFromString(personaje.svgContent, (objects, options) => {
                    const group = new fabric.Group(objects, {
                        data: { nombre: personaje.nombre }
                    });

                    const pos = personaje.posicionInicial || {};
                    const targetWidth = pos.width || 200;
                    
                    group.scaleToWidth(targetWidth);

                    group.set({
                        left: pos.x || CANVAS_WIDTH / 2,
                        top: pos.y || CANVAS_HEIGHT / 2,
                        angle: pos.angulo || 0,
                        originX: 'center',
                        originY: 'center'
                    });

                    fabricCanvas.add(group);
                    fabricCanvas.renderAll();
                });
            } else {
                 console.warn(`El personaje "${personaje.nombre}" no tiene svgContent para ser cargado.`);
            }
        });
        fabricCanvas.setZoom(1);
        fabricCanvas.absolutePan({ x: 0, y: 0 });
    }

    /**
     * Gestiona el botón de Play/Pause.
     */
    function handlePlayPause() {
        isPlaying = !isPlaying;
        playPauseBtn.textContent = isPlaying ? 'Detener' : 'Reproducir';

        if (isPlaying) {
            if (animationPlan) {
                reproducirAnimacion(animationPlan);
            } else {
                alert("Primero debes generar una animación.");
                isPlaying = false;
                playPauseBtn.textContent = 'Reproducir';
            }
        } else {
            detenerAnimacion();
        }
    }

    /**
     * Detiene todos los timeouts de animación y resetea el estado.
     */
    function detenerAnimacion() {
        console.log("🛑 Deteniendo animación...");
        animationTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        animationTimeouts = [];
        
        if (animationPlan) {
            cargarEscena(animationPlan);
        }

        isPlaying = false;
        playPauseBtn.textContent = 'Reproducir';
    }


    /**
     * Itera sobre los eventos del plan y los ejecuta con timeouts.
     * @param {object} plan - El plan de animación.
     */
    function reproducirAnimacion(plan) {
        console.log("▶️ Reproduciendo animación con el plan:", plan);
        if (!plan.eventos || plan.eventos.length === 0) {
            console.warn("⚠️ El plan no contiene eventos de animación para reproducir.");
            detenerAnimacion();
            return;
        }

        cargarEscena(plan);

        plan.eventos.forEach(evento => {
            const timeoutId = setTimeout(() => {
                console.log(`⏰ Evento [${evento.tiempo}ms] -> Target: ${evento.target}`);
                
                const targetObject = fabricCanvas.getObjects().find(obj => obj.data && obj.data.nombre === evento.target);

                if (targetObject) {
                    console.log(`   🎯 Objeto encontrado: "${evento.target}". Animando con:`, evento.animacion);
                    
                    const animProps = { ...evento.animacion };
                    const duration = Number(animProps.duracion) || 1000;
                    const ease = animProps.ease || 'easeOutQuad';
                    
                    delete animProps.duracion;
                    delete animProps.ease;

                    targetObject.animate(animProps, {
                        duration: duration,
                        onChange: fabricCanvas.renderAll.bind(fabricCanvas),
                        onComplete: () => {
                            console.log(`   ✅ Animación completada para "${evento.target}"`);
                        },
                        easing: fabric.util.ease[ease]
                    });

                } else if (evento.target === 'camara') {
                    console.log(`   🎥 Animando cámara:`, evento.animacion);
                    const { zoom, duracion } = evento.animacion;
                    fabricCanvas.zoomToPoint(
                        new fabric.Point(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2),
                        zoom,
                        {
                           duration: duracion || 1000,
                           onChange: fabricCanvas.renderAll.bind(fabricCanvas),
                           onComplete: () => console.log('   ✅ Animación de cámara completada')
                        }
                    );

                } else {
                    console.warn(`   ❓ No se encontró el objeto target en el canvas: "${evento.target}"`);
                }
            }, evento.tiempo);

            animationTimeouts.push(timeoutId);
        });
    }

    /**
     * Obtiene los datos de los personajes del DOM.
     * @returns {Array} - Un array de objetos de personaje.
     */
    function obtenerDatosCompletosDelDOM() {
        const datos = [];
        document.querySelectorAll('#listapersonajes .personaje').forEach(el => {
            const nombre = el.querySelector('.nombreh')?.value;
            if (nombre) {
                 datos.push({
                    nombre: nombre,
                    descripcion: el.querySelector('textarea')?.value || '',
                    svgContent: el.dataset.svgContent || '',
                    imagen: el.querySelector('.personaje-visual img')?.src || ''
                });
            }
        });
        return datos;
    }
});
