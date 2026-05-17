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

// ─── SISTEMA DE INTERRUPCIÓN FLUIDA ───
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