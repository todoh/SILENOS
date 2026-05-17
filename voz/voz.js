// ─── MOTOR DE REPRODUCCIÓN (ANTI-POP CONTINUO + PROCESADO) ───
function queueAudio(float32) {
    audioQueue.push(float32);
    if (!isPlayingAudio) {
        if (audioContext) {
            nextAudioTime = audioContext.currentTime + 0.05; // 50ms buffer para suavidad
        }
        playNextChunk();
    }
}

function playNextChunk() {
    if (!audioContext || audioQueue.length === 0) {
        isPlayingAudio = false;
        return;
    }
    
    isPlayingAudio = true;
    const data = audioQueue.shift();
    const buf = audioContext.createBuffer(1, data.length, 24000); 
    buf.getChannelData(0).set(data);
    
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    
    // Conectar el audio a la cadena de procesamiento en lugar de salida directa
    src.connect(voiceFilter);

    // Auto-corrección si el tiempo matemático se ha quedado atrás respecto a la realidad
    if (nextAudioTime < audioContext.currentTime) {
        nextAudioTime = audioContext.currentTime + 0.05;
    }

    // Programar el nodo en la línea de tiempo matemática exacta
    src.start(nextAudioTime);
    currentActiveSource = src;
    
    const duration = buf.duration;
    nextAudioTime += duration;
    
    // Disparamos la preparación del siguiente nodo 50ms antes de que acabe el actual (empalme perfecto)
    const timeToNext = (nextAudioTime - audioContext.currentTime - 0.05) * 1000;
    setTimeout(playNextChunk, Math.max(0, timeToNext));
}

// ─── SISTEMA DE INTERRUPCIÓN FLUIDA (NUEVO) ───
let lastInterruptTime = 0;

function interruptAudio() {
    audioQueue = []; // Vaciar la cola de audio pendiente instantáneamente
    isPlayingAudio = false;
    
    if (currentActiveSource) {
        try { 
            currentActiveSource.stop(); 
        } catch(e) {}
        currentActiveSource = null;
    }

    // Enviar señal de interrupción al servidor (corte de turno)
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            clientContent: {
                turnComplete: true
            }
        }));
    }
}

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

        ws.onopen = () => {
            const setup = {
                setup: {
                    model: `models/${MODEL}`,
                    generation_config: {
                        response_modalities: ['AUDIO'],
                        speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } }
                    },
                    system_instruction: {
                        parts: [{ text: "Tu nombre es VOZ. Eres un asistente brillante, reflexivo y observador. Tu forma de hablar es extremadamente natural, humana, empática y conversacional. Evita por completo sonar como un robot o una máquina. Respira en tus pausas, sé cercano y directo." }]
                    },
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
        };

        ws.onmessage = async (evt) => {
            let textData = evt.data;
            if (textData instanceof Blob) textData = await textData.text();
            
            const data = JSON.parse(textData);
            
            // --- DETECCIÓN DE INTERRUPCIÓN PROVENIENTE DEL SERVIDOR ---
            if (data.serverContent && data.serverContent.interrupted) {
                interruptAudio();
            }

            if (data.serverContent && data.serverContent.modelTurn) {
                let textTurn = "";
                let hasAudio = false;

                for (const part of data.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                        const pcm = base64ToFloat32(part.inlineData.data);
                        queueAudio(pcm);
                        hasAudio = true;
                    }
                    if (part.text) {
                        textTurn += part.text;
                    }
                }

                if (textTurn) addMessage('gemini', textTurn, hasAudio);
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
    
    stopMic();
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

// ─── GESTIÓN DE MICRÓFONO ───
async function toggleMic() {
    if (isMicActive) {
        stopMic();
        return;
    }
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { 
                sampleRate: 16000, 
                channelCount: 1, 
                echoCancellation: true, 
                noiseSuppression: true,
                autoGainControl: true // Limpieza de entrada
            } 
        });
        
        micCtx = new AudioContext({ sampleRate: 16000 });
        const src = micCtx.createMediaStreamSource(micStream);
        
        micProcessor = micCtx.createScriptProcessor(4096, 1, 1);
        src.connect(micProcessor);
        micProcessor.connect(micCtx.destination);

        micProcessor.onaudioprocess = (e) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            
            const input = e.inputBuffer.getChannelData(0);
            
            // --- DETECCIÓN DE ACTIVIDAD DE VOZ (VAD) PARA INTERRUPCIÓN ---
            let sum = 0;
            for (let i = 0; i < input.length; i++) {
                sum += input[i] * input[i];
            }
            let rms = Math.sqrt(sum / input.length);
            
            // Si el volumen supera el umbral (0.015) y hay audio reproduciéndose
            if (rms > 0.015 && (isPlayingAudio || audioQueue.length > 0)) {
                const now = Date.now();
                // Evitar múltiples llamadas seguidas (cooldown de 500ms)
                if (now - lastInterruptTime > 500) {
                    interruptAudio();
                    lastInterruptTime = now;
                }
            }
            // -------------------------------------------------------------

            const pcm16 = new Int16Array(input.length);
            
            for (let i = 0; i < input.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
            }
            
            const b64 = arrayBufferToBase64(pcm16.buffer);
            
            ws.send(JSON.stringify({
                realtimeInput: {
                    audio: { data: b64, mimeType: 'audio/pcm;rate=16000' }
                }
            }));
        };

        isMicActive = true;
        const btn = document.getElementById('micBtn');
        btn.classList.add('active');
        btn.innerText = "🛑 DETENER MIC";

    } catch (e) {
        alert("Error al acceder al micrófono: " + e.message);
    }
}

function stopMic() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (micCtx) {
        try { micCtx.close(); } catch(e) {}
    }
    
    if (ws && ws.readyState === WebSocket.OPEN && isMicActive) {
        ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }

    isMicActive = false;
    const btn = document.getElementById('micBtn');
    btn.classList.remove('active');
    btn.innerText = "🎤 MICRÓFONO";
}