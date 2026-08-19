// SILENOS 5 VOZ / reproductorAudio.js

// ─── MOTOR DE REPRODUCCIÓN (ANTI-POP CONTINUO + JITTER BUFFER BAJA LATENCIA) ───
function queueAudio(float32) {
    audioQueue.push(float32);
    if (!isPlayingAudio) {
        if (audioContext) {
            // Buffer inicial ajustado a 30ms para reducir la latencia de respuesta
            nextAudioTime = audioContext.currentTime + 0.03; 
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
    
    if (typeof voiceFilter !== 'undefined' && voiceFilter) {
        src.connect(voiceFilter);
    } else {
        src.connect(audioContext.destination);
    }

    if (nextAudioTime < audioContext.currentTime) {
        nextAudioTime = audioContext.currentTime + 0.03;
    }

    src.start(nextAudioTime);
    currentActiveSource = src;
    
    const duration = buf.duration;
    nextAudioTime += duration;
    
    // Empalme anticipado en 30ms
    const timeToNext = (nextAudioTime - audioContext.currentTime - 0.03) * 1000;
    setTimeout(playNextChunk, Math.max(0, timeToNext));
}

// ─── SISTEMA DE INTERRUPCIÓN FLUIDA (0ms CLIENTE) ───
let lastInterruptTime = 0;

function interruptAudio() {
    // Vaciar buffers en local inmediatamente
    audioQueue = []; 
    isPlayingAudio = false;
    
    if (currentActiveSource) {
        try { 
            currentActiveSource.stop(); 
        } catch(e) {}
        currentActiveSource = null;
    }

    // Notificación asíncrona al servidor WebSocket
    if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            clientContent: {
                turnComplete: true
            }
        }));
    }
}