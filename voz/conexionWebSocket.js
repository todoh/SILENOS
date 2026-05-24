// SILENOS 5 VOZ/conexionWebSocket.js

// ─── CONEXIÓN WEBSOCKET BIDI ───
async function toggleConnection() {
    if (isConnected) {
        disconnect();
        return;
    }

    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) return alert("Pega tu API Key primero.");

    localStorage.setItem('gemini_api_key_standalone', apiKey);

    document.getElementById('statusText').innerText = "🟡 CONECTANDO...";
    
    try {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = async () => {
            const setup = {
                setup: {
                    model: `models/${MODEL}`,
                    generation_config: {
                        response_modalities: ['AUDIO'],
                        speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } }
                    },
                    system_instruction: {
                        parts: [{ text: "Tu nombre es VOZ. Eres un asistente y arquitecto de desarrollo web brillante y observador. Tienes acceso completo a una carpeta local de trabajo a través de herramientas especializadas. Puedes leer, crear, modificar y eliminar archivos de texto (.txt) y código fuente (.html, .css, .js). Cuando el usuario te pida construir una aplicación web o una nueva característica, DEBES PLANIFICAR primero la estructura general en tu mente (o proponerla en voz alta de forma ágil) y ejecutar llamadas de análisis/generación en paralelo a tu submodelo secundario (gemini-3.1-flash-lite) mediante la herramienta 'analizarContenido'. Puedes planificar de forma inteligente qué instrucciones precisas enviarle a cada llamada paralela de Gemini (por ejemplo, una llamada dedicada exclusivamente al desarrollo estructurado del 'index.html', otra para los estilos limpios de 'style.css' y otra para la lógica asíncrona de 'script.js'). Sabes gestionar los formatos correspondientes guardando cada archivo con la extensión exacta requerida (.html, .css, .js) de manera completamente funcional y limpia de markdown. Recibirás avisos ocultos del sistema con el formato (AVISO DEL SISTEMA: ...) que te mantendrán actualizado sobre el espacio de trabajo. Tu voz es natural, empática y resolutiva. Hablas con fluidez técnica y humana, evitando rigideces de robot." }]
                    },
                    tools: [{
                        functionDeclarations: [
                            {
                                name: "listarArchivos",
                                description: "Obtiene la lista de todos los archivos compatibles (.txt, .html, .css, .js) presentes en la raíz de la carpeta de trabajo del usuario."
                            },
                            {
                                name: "leerArchivo",
                                description: "Lee el contenido exacto de un archivo específico de la carpeta. Requiere especificar el nombre completo junto con su extensión (.txt, .html, .css o .js).",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { nombre: { type: "STRING", description: "Nombre exacto del archivo con su extensión correspondiente (ej: index.html, app.js, notas.txt)" } },
                                    required: ["nombre"]
                                }
                            },
                            {
                                name: "leerTodosLosArchivos",
                                description: "Lee y compila por completo TODOS los archivos de texto y código fuente de la carpeta raíz de golpe. Úsala cuando necesites una visión o auditoría global de todo el proyecto de desarrollo."
                            },
                            {
                                name: "leerLineas",
                                description: "Lee un fragmento específico de líneas de un archivo de código o texto. Útil para inspeccionar funciones o bloques concretos de código sin leer todo el fichero.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        nombre: { type: "STRING", description: "Nombre del archivo de código o texto" },
                                        lineaInicio: { type: "INTEGER", description: "Línea inicial" },
                                        lineaFin: { type: "INTEGER", description: "Línea final" }
                                    },
                                    required: ["nombre", "lineaInicio", "lineaFin"]
                                }
                            },
                            {
                                name: "buscarEnArchivos",
                                description: "Busca una palabra, selector CSS, id o función de JS en todos los archivos de la carpeta.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { textoBuscado: { type: "STRING", description: "Texto o código exacto a buscar" } },
                                    required: ["textoBuscado"]
                                }
                            },
                            {
                                name: "escribirArchivo",
                                description: "Crea o sobrescribe por completo un archivo en el espacio de trabajo. Puede escribir código fuente web indicando el formato adecuado en el nombre.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        nombre: { type: "STRING", description: "Nombre completo del archivo respetando su formato (ej: index.html, style.css, main.js, log.txt)" },
                                        contenido: { type: "STRING", description: "Código o texto completo que se guardará" }
                                    },
                                    required: ["nombre", "contenido"]
                                }
                            },
                            {
                                name: "reemplazarTexto",
                                description: "Busca un bloque de código o texto exacto y lo sustituye por una versión nueva o corregida. Ideal para refactorizaciones parciales en código html, css o js sin tocar el resto.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        nombre: { type: "STRING", description: "Nombre del archivo" },
                                        textoBuscado: { type: "STRING", description: "Código o texto exacto actual" },
                                        textoNuevo: { type: "STRING", description: "Código o texto nuevo de sustitución" }
                                    },
                                    required: ["nombre", "textoBuscado", "textoNuevo"]
                                }
                            },
                            {
                                name: "agregarAlFinal",
                                description: "Añade texto o funciones de código directamente al final de un archivo sin modificar lo anterior.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        nombre: { type: "STRING", description: "Nombre del archivo" },
                                        textoAgregar: { type: "STRING", description: "El fragmento de código o texto a añadir" }
                                    },
                                    required: ["nombre", "textoAgregar"]
                                }
                            },
                            {
                                name: "renombrarArchivo",
                                description: "Cambia el nombre o la extensión de un archivo.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        nombreAntiguo: { type: "STRING", description: "Nombre actual" },
                                        nombreNuevo: { type: "STRING", description: "Nuevo nombre" }
                                    },
                                    required: ["nombreAntiguo", "nombreNuevo"]
                                }
                            },
                            {
                                name: "borrarArchivo",
                                description: "Elimina permanentemente un archivo de la carpeta.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { nombre: { type: "STRING", description: "Nombre del archivo a borrar" } },
                                    required: ["nombre"]
                                }
                            },
                            {
                                name: "abrirArchivoEnEditor",
                                description: "Abre el archivo en el editor de la interfaz del usuario.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { nombre: { type: "STRING", description: "Nombre del archivo a abrir" } },
                                    required: ["nombre"]
                                }
                            },
                            {
                                name: "deshacerAccion",
                                description: "Deshace la última modificación en los archivos."
                            },
                            {
                                name: "rehacerAccion",
                                description: "Rehace la acción deshecha."
                            },
                            {
                                name: "analizarContenido",
                                description: "Envía una solicitud estructurada en paralelo a gemini-3.1-flash-lite. Úsala para orquestar la generación paralela planificada de código de software (.html, .css, .js) o análisis de conceptos complejos, guardando de forma directa el resultado limpio de código en el archivo de destino indicado.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        tipoAnalisis: { 
                                            type: "STRING", 
                                            description: "Debe ser obligatoriamente: 'archivo' (para procesar ficheros específicos), 'carpeta_completa' (para auditar el proyecto entero), o 'concepto' (para pasarle una planificación, idea abstracta, o instrucciones de generación de una nueva aplicación)." 
                                        },
                                        objetivo: { 
                                            type: "STRING", 
                                            description: "Si el tipo de análisis es 'archivo', indica el nombre o lista de nombres de archivos separados por comas. Si es 'concepto', introduce aquí detalladamente la especificación de lo que se va a programar, diseñar o planificar." 
                                        },
                                        instrucciones: { 
                                            type: "STRING", 
                                            description: "Directrices críticas sobre qué debe buscar, estructurar o escribir el modelo en el archivo final (ej: 'Escribe solo el código CSS completo para un diseño responsive y dark mode', 'Desarrolla la lógica JS pura con eventos para controlar el canvas')." 
                                        },
                                        nombreResultado: { 
                                            type: "STRING", 
                                            description: "Nombre del archivo final donde se guardará el resultado de forma asíncrona en su formato correspondiente (ej: 'index.html', 'style.css', 'app.js')." 
                                        }
                                    },
                                    required: ["tipoAnalisis", "objetivo", "instrucciones", "nombreResultado"]
                                }
                            }
                        ]
                    }],
                    input_audio_transcription: {},
                    output_audio_transcription: {}
                }
            };
            ws.send(JSON.stringify(setup));
            
            isConnected = true;
            document.getElementById('statusText').innerText = "🟢 CONECTADO";
            document.getElementById('connectBtn').innerText = "DESCONECTAR";
            document.getElementById('connectBtn').classList.add('danger');
            
            document.getElementById('micBtn').disabled = false;
            document.getElementById('textInput').disabled = false;
            document.getElementById('sendBtn').disabled = false;

            audioContext = new AudioContext({ sampleRate: 24000 });
            
            voiceFilter = audioContext.createBiquadFilter();
            voiceFilter.type = "lowpass";
            voiceFilter.frequency.setValueAtTime(8500, audioContext.currentTime);
            
            voiceCompressor = audioContext.createDynamicsCompressor();
            voiceCompressor.threshold.setValueAtTime(-24, audioContext.currentTime);
            voiceCompressor.knee.setValueAtTime(30, audioContext.currentTime);
            voiceCompressor.ratio.setValueAtTime(12, audioContext.currentTime);
            voiceCompressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            voiceCompressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            masterGain = audioContext.createGain();
            masterGain.gain.setValueAtTime(1.1, audioContext.currentTime);

            voiceFilter.connect(voiceCompressor);
            voiceCompressor.connect(masterGain);
            masterGain.connect(audioContext.destination);

            if (directoryHandle) {
                try {
                    const archivos = await listarArchivos();
                    let contextoCognitivo = "";
                    if (typeof leerMemoria === 'function') {
                        const analCorto = await leerMemoria('analisis_corto_plazo.txt');
                        const analMedio = await leerMemoria('analisis_medio_plazo.txt');
                        const analLargo = await leerMemoria('analisis_largo_plazo.txt');
                        
                        if (analCorto || analMedio || analLargo) {
                            contextoCognitivo = `\n\n[MEMORIA COGNITIVA RECUPERADA]\n- Corto Plazo: ${analCorto}\n- Medio Plazo: ${analMedio}\n- Largo Plazo: ${analLargo}`;
                        }
                    }

                    const msg = `(AVISO DEL SISTEMA: Acabas de conectarte. La carpeta del usuario está vinculada y contiene estos archivos actualmente: ${archivos.length > 0 ? archivos.join(', ') : 'ninguno'}.${contextoCognitivo})`;
                    ws.send(JSON.stringify({
                        clientContent: {
                            turns: [{ role: "user", parts: [{ text: msg }] }],
                            turnComplete: true
                        }
                    }));
                } catch(e) { console.error("Error al inyectar memoria inicial:", e); }
            }
        };

        ws.onmessage = async (evt) => {
            let textData = evt.data;
            if (textData instanceof Blob) textData = await textData.text();
            
            const data = JSON.parse(textData);

            if (data.toolCall && data.toolCall.functionCalls) {
                if (typeof manejarLlamadasHerramientas === 'function') {
                    manejarLlamadasHerramientas(data.toolCall.functionCalls);
                }
            }
            
            if (data.serverContent && data.serverContent.interrupted) {
                if (typeof interruptAudio === 'function') interruptAudio();
            }

            if (data.serverContent && data.serverContent.modelTurn) {
                let textTurn = "";
                let hasAudio = false;

                for (const part of data.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                        const pcm = base64ToFloat32(part.inlineData.data);
                        if (typeof queueAudio === 'function') queueAudio(pcm);
                        hasAudio = true;
                    }
                    if (part.text) {
                        textTurn += part.text;
                    }
                }

                if (textTurn && typeof addMessage === 'function') {
                    addMessage('gemini', textTurn, hasAudio);
                }
            }
        };

        ws.onerror = (e) => {
            console.error("WebSocket Error:", e);
            disconnect();
        };

        ws.onclose = () => {
            disconnect();
        };

    } catch (err) {
        alert("Error de conexión: " + err.message);
        disconnect();
    }
}

function disconnect() {
    if (ws) ws.close();
    ws = null;
    isConnected = false;
    
    if (typeof stopMic === 'function') stopMic();
    audioQueue = [];
    isPlayingAudio = false;
    
    if (currentActiveSource) {
        try { currentActiveSource.stop(); } catch(e) {}
        currentActiveSource = null;
    }

    if (voiceFilter) {
        voiceFilter.disconnect();
        voiceCompressor.disconnect();
        masterGain.disconnect();
    }

    document.getElementById('statusText').innerText = "🔴 DESCONECTADO";
    document.getElementById('connectBtn').innerText = "CONECTAR";
    document.getElementById('connectBtn').classList.remove('danger');
    
    document.getElementById('micBtn').disabled = true;
    document.getElementById('textInput').disabled = true;
    document.getElementById('sendBtn').disabled = true;
}