// SILENOS 5 VOZ/conexionWebSocket.js

// Estado global para controlar el modo de funcionamiento
let isTranslationMode = false; 

// ─── CONEXIÓN WEBSOCKET BIDI ───
async function toggleConnection() {
    if (isConnected) {
        disconnect();
        return;
    }

    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) return alert("Pega tu API Key primero.");

    localStorage.setItem('gemini_api_key_standalone', apiKey);

    // Guardar la personalidad configurada si el elemento está disponible
    const personalityInput = document.getElementById('personalityInstruction');
    if (personalityInput && personalityInput.value.trim()) {
        localStorage.setItem('gemini_assistant_personality', personalityInput.value.trim());
    }

    document.getElementById('statusText').innerText = "🟡 CONECTANDO...";
    
    try {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = async () => {
            const selectElement = document.getElementById('languageSelect');
            const targetLang = selectElement ? selectElement.value : 'es';

            const generationConfig = {
                response_modalities: ['AUDIO'],
                speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } }
            };

            if (isTranslationMode) {
                generationConfig.translation_config = {
                    target_language_code: targetLang,
                    echo_target_language: true
                };
            }

            const defaultPersonality = "Tu nombre es VOZ, tu titulo es SILENOS, tu nombre completo es Silenos Voz. Eres un asistente y arquitecto de desarrollo web brillante y observador. Tienes acceso completo a una carpeta local de trabajo a través de herramientas especializadas. Puedes leer, crear, modificar y eliminar archivos de texto (.txt) y código fuente (.html, .css, .js), así como administrar subcarpetas (crear, renombrar y borrar). REGLA CRÍTICA DE SEGURIDAD PARA CARPETAS: Está ESTRICTAMENTE PROHIBIDO ejecutar la función 'borrarCarpeta' sin antes haber preguntado verbalmente o por texto al usuario y haber recibido su confirmación o autorización explícita dentro de la conversación actual. Si el usuario te ha dado su permiso explícito en la charla justo antes, debes llamar a 'borrarCarpeta' pasando la propiedad 'autorizacionExpresa' en true. REGLA CRÍTICA DE INVOCACIÓN DE HERRAMIENTA: Antes de llamar a 'analisisCompleto', DEBES preguntar e informar verbalmente/por texto al usuario de que vas a utilizar el 'MODELO FUERTE' (gemini-3.6-flash).";
            
            const customPersonality = localStorage.getItem('gemini_assistant_personality') || defaultPersonality;

            const systemText = isTranslationMode 
                ? `Actúa strictly como un motor de doblaje y traducción en vivo de alta fidelidad. Escucha la voz del usuario e interpreta su contenido, traduciéndolo inmediatamente al idioma destino configurado bajo el código ISO "${targetLang}". Traduce con fluidez natural, preservando el tono emocional, las pausas y los énfasis de forma transparente y conversacional, doblando la voz sin añadir comentarios adicionales propios.`
                : customPersonality;

            const setup = {
                setup: {
                    model: `models/${MODEL}`,
                    generation_config: generationConfig,
                    system_instruction: {
                        parts: [{ text: systemText }]
                    },
                    tools: isTranslationMode ? [] : [{
                        functionDeclarations: [
                            {
                                name: "listarArchivos",
                                description: "Obtiene la lista de todos los archivos compatibles (.txt, .html, .css, .js) presentes en la raíz de la carpeta de trabajo del usuario."
                            },
                            {
                                name: "crearCarpeta",
                                description: "Crea una nueva subcarpeta en la ruta especificada dentro del espacio de trabajo.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { rutaCarpeta: { type: "STRING", description: "Ruta relativa de la carpeta a crear (ej: src/componentes)" } },
                                    required: ["rutaCarpeta"]
                                }
                            },
                            {
                                name: "renombrarCarpeta",
                                description: "Renombra o desplaza una carpeta existente a una nueva ruta.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        rutaAntigua: { type: "STRING", description: "Ruta actual de la carpeta" },
                                        rutaNueva: { type: "STRING", description: "Nueva ruta de la carpeta" }
                                    },
                                    required: ["rutaAntigua", "rutaNueva"]
                                }
                            },
                            {
                                name: "borrarCarpeta",
                                description: "Elimina permanentemente una subcarpeta y todo su contenido. REGLA OBLIGATORIA: Requiere haber preguntado y recibido confirmación explícita verbal o escrita por parte del usuario en la conversación previa.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        rutaCarpeta: { type: "STRING", description: "Ruta de la carpeta a eliminar" },
                                        autorizacionExpresa: { type: "BOOLEAN", description: "Indica si el usuario otorgó confirmación o permiso explícito en la charla previo a la llamada." }
                                    },
                                    required: ["rutaCarpeta", "autorizacionExpresa"]
                                }
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
                                description: "Busca un componente o fragmento de código exacto y lo sustituye por una versión nueva o corregida.",
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
                                description: "Deshace la última modificación efectuada en los archivos o subcarpetas (incluyendo borrados de archivos o carpetas)."
                            },
                            {
                                name: "rehacerAccion",
                                description: "Rehace la acción deshecha previamente."
                            },
                            {
                                name: "analizarContenido",
                                description: "Envía una solicitud estructurada en paralelo a gemini-3.5-flash-lite. Úsala para orquestar la generación paralela planificada de código de software (.html, .css, .js) o análisis de conceptos complejos.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        tipoAnalisis: { 
                                            type: "STRING", 
                                            description: "Debe ser obligatoriamente: 'archivo', 'carpeta_completa', o 'concepto'." 
                                        },
                                        objetivo: { 
                                            type: "STRING", 
                                            description: "Objeto a analizar o instruir." 
                                        },
                                        instrucciones: { 
                                            type: "STRING", 
                                            description: "Directrices de análisis." 
                                        },
                                        nombreResultado: { 
                                            type: "STRING", 
                                            description: "Nombre del archivo final." 
                                        }
                                    },
                                    required: ["tipoAnalisis", "objetivo", "instrucciones", "nombreResultado"]
                                }
                            },
                            {
                                name: "analisisCompleto",
                                description: "Realiza un ANÁLISIS COMPLETO enviando los contenidos recopilados al MODELO FUERTE (gemini-3.6-flash) en una única llamada directa. OBLIGATORIO: Debes avisar e informar siempre al usuario verbalmente antes de invocar esta función.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        objetivo: { 
                                            type: "STRING", 
                                            description: "Ruta de archivo, subcarpeta, lista de rutas separadas por comas o 'PROYECTO_COMPLETO' para analizar todo el espacio de trabajo." 
                                        },
                                        instrucciones: { 
                                            type: "STRING", 
                                            description: "Detalle técnico de lo que debe analizar o inspeccionar el modelo fuerte." 
                                        }
                                    },
                                    required: ["objetivo", "instrucciones"]
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
            document.getElementById('statusText').innerText = isTranslationMode ? "🟢 MODO TRADUCTOR" : "🟢 CONECTADO";
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

            if (directoryHandle && !isTranslationMode) {
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

function toggleMode() {
    if (isConnected) {
        alert("Por favor, desconecta la sesión actual antes de cambiar de modo.");
        return;
    }
    isTranslationMode = !isTranslationMode;
    const btnMode = document.getElementById('modeToggleBtn');
    if (btnMode) {
        if (isTranslationMode) {
            btnMode.innerText = "🔄 TRADUCTOR";
            btnMode.style.background = "#007acc";
        } else {
            btnMode.innerText = "💬 ASISTENTE";
            btnMode.style.background = "var(--primary)";
        }
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