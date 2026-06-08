// voice_hardware.js
// --- ENTRADA DE HARDWARE, STREAMING DE MICR FONO Y FILTRO VAD ---
let voiceMicStream = null;
let voiceMicCtx = null;
let voiceMicProcessor = null;
let isVoiceMicActive = false;

async function toggleVoiceLiveMic() {
    if (isVoiceMicActive) {
        stopVoiceLiveMic();
        return;
    }
    try {
        voiceMicStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        voiceMicCtx = new AudioContext({ sampleRate: 16000 });
        const src = voiceMicCtx.createMediaStreamSource(voiceMicStream);
        voiceMicProcessor = voiceMicCtx.createScriptProcessor(4096, 1, 1);
        src.connect(voiceMicProcessor);
        voiceMicProcessor.connect(voiceMicCtx.destination);
                 
        voiceMicProcessor.onaudioprocess = (e) => {
            if (!voiceWs || voiceWs.readyState !== WebSocket.OPEN) return;
            const input = e.inputBuffer.getChannelData(0);
                         
            let sum = 0;
            for (let i = 0; i < input.length; i++) {
                sum += input[i] * input[i];
            }
            let rms = Math.sqrt(sum / input.length);
                         
            // Incrementamos el umbral VAD a 0.045 para ignorar clicks de rat n o tecleo r pido en caliente
            if (rms > 0.045 && (isVoicePlayingAudio || voiceAudioQueue.length > 0)) {
                const now = Date.now();
                if (now - lastVoiceInterruptTime > 800) {
                    if (typeof interruptVoiceLiveAudio === 'function') {
                        interruptVoiceLiveAudio();
                    }
                    lastVoiceInterruptTime = now;
                }
            }
                         
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
            }
            const b64 = arrayBufferToBase64Voice(pcm16.buffer);
            voiceWs.send(JSON.stringify({
                realtimeInput: {
                    audio: { data: b64, mimeType: 'audio/pcm;rate=16000' }
                }
            }));
        };
        isVoiceMicActive = true;
        document.getElementById('voiceMicBtn').innerText = "Silenciar";
        document.getElementById('voiceMicBtn').classList.add('bg-black', 'text-white');
    } catch (e) {
        alert("Imposible capturar micr fono local: " + e.message);
    }
}

function stopVoiceLiveMic() {
    if (voiceMicStream) {
        voiceMicStream.getTracks().forEach(t => { try { t.stop(); } catch(e) {} });
        voiceMicStream = null;
    }
    if (voiceMicCtx) {
        try { if (voiceMicCtx.state !== 'closed') voiceMicCtx.close(); } catch(e) {}
        voiceMicCtx = null;
    }
    if (voiceWs && voiceWs.readyState === WebSocket.OPEN && isVoiceMicActive) {
        try { voiceWs.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch(e) {}
    }
    isVoiceMicActive = false;
    document.getElementById('voiceMicBtn').innerText = "Micr fono";
    document.getElementById('voiceMicBtn').classList.remove('bg-black', 'text-white');
}

function arrayBufferToBase64Voice(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}