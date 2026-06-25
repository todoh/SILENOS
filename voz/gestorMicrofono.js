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