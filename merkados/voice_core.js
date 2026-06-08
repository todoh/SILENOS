// voice_core.js
// --- CONTROLADOR CENTRAL, WEBSOCKET Y ESTADO DEL ASISTENTE GEMINI LIVE V5 ---
let voiceWs = null;
let isVoiceConnected = false;
let voiceAudioContext = null;
let voiceAudioQueue = [];
let isVoicePlayingAudio = false;
let nextVoiceAudioTime = 0;
let currentVoiceActiveSource = null;
let lastVoiceInterruptTime = 0;
const VOICE_MODEL = 'gemini-3.1-flash-live-preview'; // OBLIGATORIO

function initVoiceLiveCanvas() {
    const canvas = document.getElementById('flowCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        console.log("[CANVAS-VOICE] Contexto de control gr fico acoplado con  xito.");
    }
}

async function toggleVoiceLiveConnection() {
    if (isVoiceConnected) {
        disconnectVoiceLive();
        return;
    }
         
    document.getElementById('voiceStatusText').innerText = "CONECTANDO...";
    document.getElementById('voiceStatusText').className = "text-[8px] uppercase font-mono font-bold text-amber-500";
         
    const apiKey = localStorage.getItem('koreh_gemini_key') || localStorage.getItem('gemini_api_key_standalone') || "";
    if (!apiKey) {
        alert("Configura primero una API Key v lida de Gemini en el panel del generador o asistencia.");
        document.getElementById('voiceStatusText').innerText = "DESCONECTADO";
        document.getElementById('voiceStatusText').className = "text-[8px] uppercase font-mono font-bold text-red-600";
        return;
    }
         
    try {
        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
        voiceWs = new WebSocket(wsUrl);
                 
        voiceWs.onopen = async () => {
            const systemInstructionText = 
                "Tu nombre es ASISTENTE OMNIDIRECCIONAL MERKADOS. Eres un compa ero inmersivo e inteligente de dise o narrativo interactivo en espa ol. " +
                "Tienes acceso directo al lienzo y al mapa de nodos del librojuego mediante herramientas especializadas. Puedes crear, conectar, eliminar o modificar nodos en tiempo real cuando el usuario te lo solicite. " +
                "Utiliza las llamadas a funciones de manera precisa para interactuar con el ecosistema visual. Al mismo tiempo, responde al usuario con voz natural, fluida y dram tica, evitando sonar rob tico.";
                             
            const setup = {
                setup: {
                    model: `models/${VOICE_MODEL}`,
                    generation_config: {
                        response_modalities: ['AUDIO'],
                        speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } }
                    },
                    system_instruction: {
                        parts: [{ text: systemInstructionText }]
                    },
                    tools: [{
                        functionDeclarations: [
                            {
                                name: "obtenerGrafoCompleto",
                                description: "Recupera la lista  ntegra de todos los nodos y conexiones actuales del mapa para evaluar la obra global.",
                                parameters: { type: "OBJECT", properties: {} }
                            },
                            {
                                name: "crearNodoNarrativo",
                                description: "Crea un nuevo nodo o paso narrativo en el mapa del librojuego.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        title: { type: "STRING", description: "T tulo descriptivo y corto del paso en may sculas." },
                                        content: { type: "STRING", description: "Texto o prosa literaria inmersiva correspondiente al fragmento de historia." },
                                        autoConnect: { type: "BOOLEAN", description: "Indica si se debe conectar autom ticamente desde el nodo seleccionado actual." },
                                        connectionLabel: { type: "STRING", description: "Texto de la opci n de decision que conecta el nodo previo con el nuevo." }
                                    },
                                    required: ["title", "content"]
                                }
                            },
                            {
                                name: "modificarNodoNarrativo",
                                description: "Modifica o edita los campos del nodo seleccionado actualmente en el espacio de trabajo.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        nodeId: { type: "STRING", description: "ID opcional del nodo espec fico a alterar. Si se omite, afectar  al nodo seleccionado actual." },
                                        title: { type: "STRING", description: "Nuevo t tulo para el paso en may sculas." },
                                        content: { type: "STRING", description: "Nueva prosa literaria optimizada para el fragmento." },
                                        isEnding: { type: "BOOLEAN", description: "Establece si el nodo pasa a ser un punto de finalizaci n o desenlace de la obra." }
                                    }
                                }
                            },
                            {
                                name: "conectarNodosNarrativos",
                                description: "Establece una l nea de flujo o conexi n orientada entre dos pasos existentes.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        fromId: { type: "STRING", description: "ID del nodo padre de origen." },
                                        toId: { type: "STRING", description: "ID del nodo hijo de destino." },
                                        label: { type: "STRING", description: "Texto visible de la acci n o decisi n que pulsa el jugador." }
                                    },
                                    required: ["fromId", "toId", "label"]
                                }
                            },
                            {
                                name: "eliminarNodoNarrativo",
                                description: "Elimina f sicamente un nodo del grafo por su ID y limpia todas sus conexiones asociadas.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        nodeId: { type: "STRING", description: "ID  nico del nodo que se va a destruir." }
                                    },
                                    required: ["nodeId"]
                                }
                            }
                        ]
                    }],
                    input_audio_transcription: {},
                    output_audio_transcription: {}
                }
            };
                         
            voiceWs.send(JSON.stringify(setup));
            isVoiceConnected = true;
                         
            document.getElementById('voiceStatusText').innerText = "ONLINE";
            document.getElementById('voiceStatusText').className = "text-[8px] uppercase font-mono font-bold text-emerald-600";
            document.getElementById('voiceConnectBtn').innerText = "Cerrar";
            document.getElementById('voiceConnectBtn').classList.add('bg-red-700');
            document.getElementById('voiceMicBtn').disabled = false;
            document.getElementById('voiceTextInput').disabled = false;
            document.getElementById('voiceSendBtn').disabled = false;
                         
            voiceAudioContext = new AudioContext({ sampleRate: 24000 });
            addVoiceChatMessage('system', 'Conexi n bidireccional activa con Gemini Live (Omni-Voz V5). Herramientas de Canvas acopladas.');
                         
            if (typeof data !== 'undefined' && data.nodes) {
                const initMsg = `(AVISO INTERNO: Conectado al proyecto estructural "${data.name}". El ecosistema consta de ${data.nodes.length} nodos y ${data.connections.length} conexiones funcionales.)`;
                sendVoiceLiveSilentSystemPrompt(initMsg);
            }
        };
                 
        voiceWs.onmessage = async (evt) => {
            let textData = evt.data;
            if (textData instanceof Blob) textData = await textData.text();
            const parsed = JSON.parse(textData);
                         
            if (parsed.serverContent && parsed.serverContent.interrupted) {
                if (Date.now() - lastVoiceInterruptTime < 800) {
                    interruptVoiceLiveAudio();
                }
            }
                         
            if (parsed.toolCall && parsed.toolCall.functionCalls) {
                const functionResponses = [];
                // Verificamos el estado del interruptor de edición en el DOM
                const isCanvasEditAllowed = document.getElementById('voiceCanvasEditToggle')?.checked ?? true;

                for (const call of parsed.toolCall.functionCalls) {
                    let toolResultText = "Operaci n fallida.";
                    let args = call.args || {};
                    console.log("[MUTADOR VOZ] Solicitud de funci n nativa de Gemini Live:", call.name, args);
                                         
                    try {
                        if (call.name === 'obtenerGrafoCompleto') {
                            if (typeof obtenerResumenEstructuralGrafo === 'function') {
                                toolResultText = obtenerResumenEstructuralGrafo();
                            } else {
                                toolResultText = JSON.stringify({ nodes: data.nodes.map(n => ({id: n.id, title: n.title})), connections: data.connections });
                            }
                        }
                        else if (!isCanvasEditAllowed) {
                            // Si el interruptor está desactivado y es una función de escritura, bloqueamos y notificamos
                            toolResultText = "Error: La edición del canvas por voz está desactivada en este momento por el usuario. No puedes realizar modificaciones visuales ni estructurales, limítate a hablar, guiar o comentar.";
                            console.warn(`[MUTADOR VOZ] Bloqueada llamada a herramienta '${call.name}' por restricción del interruptor de edición.`);
                        }
                        else if (call.name === 'crearNodoNarrativo') {
                            const mutationCmd = {
                                action: 'CREATE_NODE',
                                title: args.title,
                                content: args.content,
                                autoConnect: args.autoConnect !== undefined ? args.autoConnect : true,
                                connectionLabel: args.connectionLabel || "Continuar"
                            };
                            const success = executeStructuralMutation(mutationCmd);
                            if (success) toolResultText = `Nodo creado con  xito titulado "${args.title}" con ID: ${window.selectedNode.id}.`;
                        }
                        else if (call.name === 'modificarNodoNarrativo') {
                            const mutationCmd = {
                                action: 'EDIT_NODE',
                                nodeId: args.nodeId,
                                title: args.title,
                                content: args.content,
                                isEnding: args.isEnding
                            };
                            const success = executeStructuralMutation(mutationCmd);
                            if (success) toolResultText = `Nodo modificado correctamente.`;
                        }
                        else if (call.name === 'conectarNodosNarrativos') {
                            const mutationCmd = {
                                action: 'CONNECT_NODES',
                                fromId: args.fromId,
                                toId: args.toId,
                                label: args.label
                            };
                            const success = executeStructuralMutation(mutationCmd);
                            if (success) toolResultText = `Nodos conectados bajo la acci n "${args.label}".`;
                        }
                        else if (call.name === 'eliminarNodoNarrativo') {
                            const mutationCmd = {
                                action: 'DELETE_NODE',
                                nodeId: args.nodeId
                            };
                            const success = executeStructuralMutation(mutationCmd);
                            if (success) toolResultText = `Nodo ${args.nodeId} y sus ramificaciones asociadas eliminadas de la red.`;
                        }
                    } catch (err) {
                        toolResultText = `Error de ejecuci n: ${err.message}`;
                    }
                                         
                    functionResponses.push({
                        name: call.name,
                        id: call.id,
                        response: { result: toolResultText }
                    });
                }
                                 
                if (voiceWs && voiceWs.readyState === WebSocket.OPEN) {
                    voiceWs.send(JSON.stringify({
                        toolResponse: { functionResponses: functionResponses }
                    }));
                    addVoiceChatMessage('system', isCanvasEditAllowed ? 'Ejecuci n de mutaci n visual confirmada al servidor de IA.' : 'Aviso de canvas protegido enviado a la IA.');
                }
            }
                         
            if (parsed.serverContent && parsed.serverContent.modelTurn) {
                for (const part of parsed.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                        const pcm = base64ToFloat32Voice(part.inlineData.data);
                        queueVoiceAudio(pcm);
                    }
                }
            }
                         
            if (parsed.serverContent && parsed.serverContent.modelTurn) {
                let voiceText = "";
                if (parsed.serverContent.modelTurn.parts) {
                    parsed.serverContent.modelTurn.parts.forEach(p => {
                        if (p.text) voiceText += p.text;
                    });
                }
                if (parsed.serverContent.outputAudioTranscription) {
                    voiceText += parsed.serverContent.outputAudioTranscription;
                }
                if (voiceText.trim()) {
                    addVoiceChatMessage('gemini', voiceText);
                }
            }
        };
                 
        voiceWs.onerror = (e) => {
            console.error("Voice WebSocket Error:", e);
            disconnectVoiceLive();
        };
                 
        voiceWs.onclose = () => {
            disconnectVoiceLive();
        };
    } catch (err) {
        alert("Error en canal Live: " + err.message);
        disconnectVoiceLive();
    }
}

function disconnectVoiceLive() {
    if (voiceWs) voiceWs.close();
    voiceWs = null;
    isVoiceConnected = false;
    if (typeof stopVoiceLiveMic === 'function') stopVoiceLiveMic();
    voiceAudioQueue = [];
    isVoicePlayingAudio = false;
    if (currentVoiceActiveSource) {
        try { currentVoiceActiveSource.stop(); } catch (e) {}
        currentVoiceActiveSource = null;
    }
    document.getElementById('voiceStatusText').innerText = "DESCONECTADO";
    document.getElementById('voiceStatusText').className = "text-[8px] uppercase font-mono font-bold text-red-600";
    document.getElementById('voiceConnectBtn').innerText = "Conectar";
    document.getElementById('voiceConnectBtn').classList.remove('bg-red-700');
    document.getElementById('voiceMicBtn').disabled = true;
    document.getElementById('voiceTextInput').disabled = true;
    document.getElementById('voiceSendBtn').disabled = true;
    addVoiceChatMessage('system', 'Asistente desconectado.');
}

function queueVoiceAudio(float32) {
    voiceAudioQueue.push(float32);
    if (!isVoicePlayingAudio) {
        if (voiceAudioContext) nextVoiceAudioTime = voiceAudioContext.currentTime + 0.02;
        playNextVoiceChunk();
    }
}

function playNextVoiceChunk() {
    if (!voiceAudioContext || voiceAudioQueue.length === 0) {
        isVoicePlayingAudio = false;
        return;
    }
    isVoicePlayingAudio = true;
    const chunkData = voiceAudioQueue.shift();
    const buf = voiceAudioContext.createBuffer(1, chunkData.length, 24000);
    buf.getChannelData(0).set(chunkData);
    const src = voiceAudioContext.createBufferSource();
    src.buffer = buf;
    src.connect(voiceAudioContext.destination);
         
    if (nextVoiceAudioTime < voiceAudioContext.currentTime) {
        nextVoiceAudioTime = voiceAudioContext.currentTime + 0.02;
    }
    src.start(nextVoiceAudioTime);
    currentVoiceActiveSource = src;
         
    const duration = buf.duration;
    nextVoiceAudioTime += duration;
    const timeToNext = (nextVoiceAudioTime - voiceAudioContext.currentTime - 0.02) * 1000;
    setTimeout(playNextVoiceChunk, Math.max(0, timeToNext));
}

function interruptVoiceLiveAudio() {
    voiceAudioQueue = [];
    isVoicePlayingAudio = false;
    if (currentVoiceActiveSource) {
        try { currentVoiceActiveSource.stop(); } catch (e) {}
        currentVoiceActiveSource = null;
    }
    if (voiceWs && voiceWs.readyState === WebSocket.OPEN) {
        voiceWs.send(JSON.stringify({ clientContent: { turnComplete: true } }));
    }
}

function sendVoiceLiveText() {
    const input = document.getElementById('voiceTextInput');
    let text = input.value.trim();
    if (!text || !voiceWs || voiceWs.readyState !== WebSocket.OPEN) return;
         
    const lowerText = text.toLowerCase();
         
    if (lowerText === 'leer todo el librojuego' || lowerText === 'lee todo el juego' || lowerText === 'leer todo') {
        if (typeof serializeFullStoryBFS === 'function') {
            const fullContent = serializeFullStoryBFS();
            addVoiceChatMessage('user', "Comando: Leer todo el librojuego.");
            sendVoiceLiveSilentSystemPrompt(`[CONTEXTO COMPLETO PARA TU LECTURA]\n${fullContent}\n\nINSTRUCCI N: Lee la anterior cr nica completa en voz alta de forma fluida, dram tica y pausada.`);
        }
        input.value = '';
        return;
    }
         
    if (lowerText === 'leer esta parte' || lowerText === 'lee este nodo' || lowerText === 'leer fragmento') {
        if (window.selectedNode) {
            addVoiceChatMessage('user', `Comando: Leer nodo "${window.selectedNode.title}".`);
            sendVoiceLiveSilentSystemPrompt(`[LECTURA DE FRAGMENTO NARRATIVO]\nT tulo: ${window.selectedNode.title}\nContenido: ${window.selectedNode.content || '(Vac o)'}\n\nINSTRUCCI N: Lee the fragmento en voz alta.`);
        } else {
            addVoiceChatMessage('system', "No hay ning n nodo seleccionado para proceder a su lectura parcial.");
        }
        input.value = '';
        return;
    }
         
    if (lowerText === 'identificar espacio' || lowerText === 'analiza este nodo' || lowerText === 'd nde estoy') {
        if (window.selectedNode && typeof analyzeSpatialAngleOfNode === 'function') {
            const spatialReport = analyzeSpatialAngleOfNode(window.selectedNode.id);
            addVoiceChatMessage('user', `Comando: An lisis espacial de "${window.selectedNode.title}".`);
            sendVoiceLiveSilentSystemPrompt(`[REPORTE TOPOL GICO DE LA RED]\n${spatialReport}\n\nINSTRUCCI N: Expl cale al usuario su posici n exacta, conexiones de salida, nodos hermanos y dependencias narrativas.`);
        } else {
            addVoiceChatMessage('system', "Selecciona un nodo primero en el lienzo para ejecutar el tracking omnidireccional.");
        }
        input.value = '';
        return;
    }
         
    let syncHotContext = `[SITUACI N ACTUAL DEL LIENZO DE TRABAJO - TIEMPO REAL]\n`;
    // Enviamos el estado del interruptor a los inputs ocultos del prompt del sistema para que la IA sepa si puede editar o no
    const isCanvasEditAllowed = document.getElementById('voiceCanvasEditToggle')?.checked ?? true;
    syncHotContext += `PERMISOS DE EDICIÓN DEL CANVAS POR PARTE DE IA: ${isCanvasEditAllowed ? 'PERMITIDO. Puedes mutar la estructura si te lo piden.' : 'PROHIBIDO. Tienes prohibido usar herramientas estructurales. Dedícate solo a opinar, analizar y dialogar sin tocar nada.'}\n`;

    if (window.selectedNode) {
        syncHotContext += `NODO ACTIVO SELECCIONADO POR EL USUARIO: ID "${window.selectedNode.id}" | T tulo: "${window.selectedNode.title}"\n`;
        syncHotContext += `CONTENIDO TEXTUAL: ${window.selectedNode.content || '(Vac o)'}\n`;
        if (window.selectedNode.notes) syncHotContext += `NOTAS DE DISE O: ${window.selectedNode.notes}\n`;
    } else {
        syncHotContext += `NODO ACTIVO SELECCIONADO: Ninguno. El usuario est  visualizando el mapa general.\n`;
    }
         
    if (typeof obtenerResumenEstructuralGrafo === 'function') {
        syncHotContext += obtenerResumenEstructuralGrafo();
    }
         
    const finalPayloadText = `${syncHotContext}\n[MENSAJE DEL AUTOR]: ${text}`;
         
    voiceWs.send(JSON.stringify({
        clientContent: {
            turns: [{ role: "user", parts: [{ text: finalPayloadText }] }],
            turnComplete: true
        }
    }));
         
    addVoiceChatMessage('user', text);
    input.value = '';
}

function handleVoiceLiveKey(e) {
    if (e.key === 'Enter') sendVoiceLiveText();
}

function sendVoiceLiveSilentSystemPrompt(msg) {
    if (voiceWs && voiceWs.readyState === WebSocket.OPEN) {
        voiceWs.send(JSON.stringify({
            clientContent: {
                turns: [{ role: "user", parts: [{ text: msg }] }],
                turnComplete: true
            }
        }));
    }
}

function addVoiceChatMessage(role, text) {
    const panel = document.getElementById('voiceChatPanel');
    if (!panel) return;
    const msgDiv = document.createElement('div');
    let label = role.toUpperCase();
         
    if (role === 'user') msgDiv.className = "text-black text-right";
    else if (role === 'gemini') msgDiv.className = "text-blue-800 text-left";
    else msgDiv.className = "text-gray-400 italic text-center";
         
    msgDiv.innerHTML = `<strong>${label}:</strong> ${text}`;
    panel.appendChild(msgDiv);
    panel.scrollTop = panel.scrollHeight;
}

function base64ToFloat32Voice(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;
    return float32;
}

document.addEventListener('DOMContentLoaded', () => {
    initVoiceLiveCanvas();
});