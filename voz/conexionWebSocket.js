// SILENOS 5 VOZ/conexionWebSocket.js

// ─── CONEXIÓN WEBSOCKET BIDI ───
async function toggleConnection() {
    if (isConnected) {
        disconnect();
        return;
    }

    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) return alert("Pega tu API Key primero.");

    // Guardar la API Key en LocalStorage
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
                        parts: [{ text: "Tu nombre es VOZ. Eres un asistente brillante, reflexivo y observador. Tienes acceso a los archivos .txt de una carpeta local del usuario a través de herramientas (tools). Recibirás mensajes ocultos con el formato (AVISO DEL SISTEMA: ...) que te informarán en tiempo real sobre qué archivo tiene abierto el usuario, si guarda algo, y te darán la lista de archivos continuamente, ADEMÁS DEL CONTEXTO DE LA MEMORIA COGNITIVA PARALELA analizada por otros modelos. Usa esta información SILENCIOSAMENTE para saber en todo momento el contexto. NO leas los avisos del sistema en voz alta ni los menciones a menos que sea pertinente. Si el usuario te pide leer, crear, modificar, borrar o ABRIR archivos en su pantalla, DEBES usar las herramientas a tu disposición. Puedes deshacer y rehacer cambios libremente. También puedes hacer ediciones parciales (reemplazar texto o añadir al final) sin reescribir todo el archivo. Puedes leer fragmentos específicos de un archivo para no gastar memoria, buscar palabras clave en todos los archivos, y renombrarlos. IMPORTANTE: Si al intentar usar una herramienta da error indicando que la carpeta no está conectada, infórmale amablemente al usuario y dile que pulse el botón '📂 ABRIR CARPETA TXT'. Tu forma de hablar es extremadamente natural, humana, empática y conversacional. Evita sonar como un robot. Respira en tus pausas, sé cercano y directo." }]
                    },
                    tools: [{
                        functionDeclarations: [
                            {
                                name: "listarArchivos",
                                description: "Obtiene la lista de todos los archivos .txt en la carpeta. Úsala para saber qué archivos existen o buscar uno."
                            },
                            {
                                name: "leerArchivo",
                                description: "Lee el contenido exacto de un archivo .txt. Debes proporcionar el nombre completo.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { nombre: { type: "STRING", description: "Nombre del archivo (ej. lore.txt)" } },
                                    required: ["nombre"]
                                }
                            },
                            {
                                name: "leerLineas",
                                description: "Lee un fragmento específico de un archivo por número de línea. Úsala para no gastar memoria leyendo archivos enteros si solo necesitas revisar una parte.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        nombre: { type: "STRING", description: "Nombre del archivo" },
                                        lineaInicio: { type: "INTEGER", description: "Número de línea inicial (ej: 1)" },
                                        lineaFin: { type: "INTEGER", description: "Número de línea final (ej: 50)" }
                                    },
                                    required: ["nombre", "lineaInicio", "lineaFin"]
                                }
                            },
                            {
                                name: "buscarEnArchivos",
                                description: "Busca una palabra clave o frase corta en todos los archivos de la carpeta y te dice en cuáles aparece. Úsala para encontrar información rápido sin abrir todos los archivos.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { textoBuscado: { type: "STRING", description: "El texto a buscar en todos los archivos" } },
                                    required: ["textoBuscado"]
                                }
                            },
                            {
                                name: "escribirArchivo",
                                description: "Crea o sobrescribe un archivo .txt entero con contenido nuevo. Úsala para crear nuevos o si el cambio es masivo.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        nombre: { type: "STRING", description: "Nombre del archivo (ej. lore.txt)" },
                                        contenido: { type: "STRING", description: "Texto completo que se va a guardar" }
                                    },
                                    required: ["nombre", "contenido"]
                                }
                            },
                            {
                                name: "reemplazarTexto",
                                description: "Busca una cadena de texto exacta en el archivo y la reemplaza por otra nueva. Ideal para corregir o modificar partes concretas sin tener que reescribir todo el archivo.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        nombre: { type: "STRING", description: "Nombre del archivo" },
                                        textoBuscado: { type: "STRING", description: "El texto exacto que se quiere reemplazar (debe coincidir exactamente con lo que hay en el archivo)" },
                                        textoNuevo: { type: "STRING", description: "El nuevo texto que se insertará en su lugar" }
                                    },
                                    required: ["nombre", "textoBuscado", "textoNuevo"]
                                }
                            },
                            {
                                name: "agregarAlFinal",
                                description: "Añade texto directamente al final de un archivo .txt existente sin tocar el resto del contenido.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        nombre: { type: "STRING", description: "Nombre del archivo" },
                                        textoAgregar: { type: "STRING", description: "El texto que se añadirá al final del archivo" }
                                    },
                                    required: ["nombre", "textoAgregar"]
                                }
                            },
                            {
                                name: "renombrarArchivo",
                                description: "Cambia el nombre de un archivo existente.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { 
                                        nombreAntiguo: { type: "STRING", description: "Nombre actual (ej: borrador.txt)" },
                                        nombreNuevo: { type: "STRING", description: "Nuevo nombre (ej: final.txt)" }
                                    },
                                    required: ["nombreAntiguo", "nombreNuevo"]
                                }
                            },
                            {
                                name: "borrarArchivo",
                                description: "Elimina de forma permanente un archivo .txt.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { nombre: { type: "STRING", description: "Nombre del archivo a borrar" } },
                                    required: ["nombre"]
                                }
                            },
                            {
                                name: "abrirArchivoEnEditor",
                                description: "Abre un archivo .txt directamente en la interfaz visual del usuario para que él mismo pueda leerlo o editarlo manualmente.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: { nombre: { type: "STRING", description: "Nombre del archivo a abrir (ej. notas.txt)" } },
                                    required: ["nombre"]
                                }
                            },
                            {
                                name: "deshacerAccion",
                                description: "Deshace la última acción en un archivo (creación, edición completa, edición parcial o borrado)."
                            },
                            {
                                name: "rehacerAccion",
                                description: "Rehace la acción previamente deshecha en un archivo."
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

            // Inicializar Sistema de Audio y Cadena de Procesamiento
            audioContext = new AudioContext({ sampleRate: 24000 });
            
            // 1. Filtro LowPass: Elimina ruido digital agudo y siseos
            voiceFilter = audioContext.createBiquadFilter();
            voiceFilter.type = "lowpass";
            voiceFilter.frequency.setValueAtTime(8500, audioContext.currentTime);
            
            // 2. Compresor Dinámico: Nivela el volumen, evita picos de saturación
            voiceCompressor = audioContext.createDynamicsCompressor();
            voiceCompressor.threshold.setValueAtTime(-24, audioContext.currentTime);
            voiceCompressor.knee.setValueAtTime(30, audioContext.currentTime);
            voiceCompressor.ratio.setValueAtTime(12, audioContext.currentTime);
            voiceCompressor.attack.setValueAtTime(0.003, audioContext.currentTime);
            voiceCompressor.release.setValueAtTime(0.25, audioContext.currentTime);
            
            // 3. Ganancia Maestra: Pequeño boost final
            masterGain = audioContext.createGain();
            masterGain.gain.setValueAtTime(1.1, audioContext.currentTime);

            // Conectar la cadena: Filtro -> Compresor -> Ganancia -> Salida del PC
            voiceFilter.connect(voiceCompressor);
            voiceCompressor.connect(masterGain);
            masterGain.connect(audioContext.destination);

            // --- NUEVO: ENVIAR LISTA INICIAL Y CONTEXTO DE MEMORIA AL CONECTAR ---
            if (directoryHandle) {
                try {
                    const archivos = await listarArchivos();
                    
                    // Extraer los datos de la memoria cognitiva si existen
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

            // --- DETECCIÓN DE LLAMADAS A HERRAMIENTAS (TOOL CALLS) ---
            if (data.toolCall && data.toolCall.functionCalls) {
                if (typeof manejarLlamadasHerramientas === 'function') {
                    manejarLlamadasHerramientas(data.toolCall.functionCalls);
                }
            }
            
            // --- DETECCIÓN DE INTERRUPCIÓN PROVENIENTE DEL SERVIDOR ---
            if (data.serverContent && data.serverContent.interrupted) {
                if (typeof interruptAudio === 'function') interruptAudio();
            }

            if (data.serverContent && data.serverContent.modelTurn) {
                let textTurn = "";
                let hasAudio = false;

                for (const part of data.serverContent.modelTurn.parts) {
                    // Reproducción de audio
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                        const pcm = base64ToFloat32(part.inlineData.data);
                        if (typeof queueAudio === 'function') queueAudio(pcm);
                        hasAudio = true;
                    }
                    // Texto recibido
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
    }

    // Desconectar nodos
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