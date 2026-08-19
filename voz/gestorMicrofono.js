// SILENOS 5 VOZ / gestorMicrofono.js

let aecWorkletNode = null;

// Variables de estado para el VAD Dinámico
let noiseFloor = 0.005;      // Estimación inicial del suelo de ruido
const alphaNoise = 0.05;     // Factor de suavizado para el ruido (lento)
const vadMargin = 2.5;       // Multiplicador de margen sobre el suelo de ruido
const minThresh = 0.008;     // Umbral mínimo absoluto
const maxThresh = 0.06;      // Umbral máximo absoluto

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
                autoGainControl: true 
            } 
        });
        
        micCtx = new AudioContext({ sampleRate: 16000 });

        let processedSourceNode = null;
        try {
            await micCtx.audioWorklet.addModule('aec-processor.js');
            
            aecWorkletNode = new AudioWorkletNode(micCtx, 'aec-processor', {
                numberOfInputs: 2,
                numberOfOutputs: 1,
                processorOptions: { filterLength: 256, delaySamples: 128, mu: 0.15 }
            });

            const micSource = micCtx.createMediaStreamSource(micStream);
            micSource.connect(aecWorkletNode, 0, 0);

            if (typeof mainRefGainNode !== 'undefined' && mainRefGainNode) {
                const refSource = micCtx.createMediaStreamSource(mainRefGainNode.mediaStream || micStream);
                refSource.connect(aecWorkletNode, 0, 1);
            }

            processedSourceNode = aecWorkletNode;
        } catch (e) {
            console.warn("AEC AudioWorklet no disponible, usando captura de micrófono directa:", e);
            processedSourceNode = micCtx.createMediaStreamSource(micStream);
        }

        micProcessor = micCtx.createScriptProcessor(2048, 1, 1);
        processedSourceNode.connect(micProcessor);
        micProcessor.connect(micCtx.destination);

        micProcessor.onaudioprocess = (e) => {
            if (!ws || ws.readyState !== WebSocket.OPEN) return;
            
            const input = e.inputBuffer.getChannelData(0);
            
            // --- CÁLCULO DE RMS ---
            let sum = 0;
            for (let i = 0; i < input.length; i++) {
                sum += input[i] * input[i];
            }
            let rms = Math.sqrt(sum / input.length);
            
            // --- CÁLCULO DINÁMICO DEL UMBRAL (EMA) ---
            // Si el nivel RMS actual está cerca o por debajo del suelo de ruido estimado, actualizamos el suelo
            if (rms < noiseFloor * 1.5) {
                noiseFloor = (alphaNoise * rms) + ((1 - alphaNoise) * noiseFloor);
            } else {
                // Recuperación / caída gradual si el ambiente cambia o se vuelve más silencioso
                noiseFloor = noiseFloor * 0.999;
            }

            // El umbral adaptativo escala según el ambiente con límites de seguridad
            let dynamicThreshold = Math.min(maxThresh, Math.max(minThresh, noiseFloor * vadMargin));

            // --- EVALUACIÓN VAD PARA INTERRUPCIÓN ULTRARRÁPIDA ---
            if (rms > dynamicThreshold && (isPlayingAudio || audioQueue.length > 0)) {
                const now = Date.now();
                if (now - lastInterruptTime > 350) {
                    if (typeof interruptAudio === 'function') {
                        interruptAudio();
                    }
                    lastInterruptTime = now;
                }
            }

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
        if (btn) {
            btn.classList.add('active');
            btn.innerText = "🛑 DETENER MIC";
        }

    } catch (e) {
        alert("Error al acceder al micrófono: " + e.message);
    }
}

function stopMic() {
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (aecWorkletNode) {
        try { aecWorkletNode.disconnect(); } catch(e) {}
        aecWorkletNode = null;
    }
    if (micCtx) {
        try { micCtx.close(); } catch(e) {}
    }
    
    if (ws && ws.readyState === WebSocket.OPEN && isMicActive) {
        ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }

    isMicActive = false;
    const btn = document.getElementById('micBtn');
    if (btn) {
        btn.classList.remove('active');
        btn.innerText = "🎤 MICRÓFONO";
    }
}