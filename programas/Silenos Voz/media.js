// ─── MIC & CONTINUOUS RECORDING ───────────────────────────────────────
let recognition = null; // Transcriptor local para el registro

// GRABACIÓN CONTINUA
async function startContinuousRecording() {
  if (!conversationsHandle) return;
  try {
    recordingsHandle = await conversationsHandle.getDirectoryHandle('grabaciones_voz', { create: true });
    // Pedimos acceso continuo al mic incluso si el mic de la IA está desactivado
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    
    function initRecorder() {
        continuousRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        continuousRecorder.ondataavailable = e => {
            if (e.data.size > 0) recordingChunks.push(e.data);
        };
        continuousRecorder.onstop = async () => {
            if (recordingChunks.length > 0) {
                const blob = new Blob(recordingChunks, { type: 'audio/webm' });
                recordingChunks = [];
                const filename = `bloque_voz_${Date.now()}.webm`;
                try {
                    const fileHandle = await recordingsHandle.getFileHandle(filename, { create: true });
                    const w = await fileHandle.createWritable();
                    await w.write(blob);
                    await w.close();
                    await cleanOldRecordings();
                } catch(err) { console.error("Error guardando bloque de voz", err); }
            }
        };
        continuousRecorder.start();
    }

    initRecorder();
    
    // Reiniciar el grabador cada 30 segundos (30000 ms) para generar bloques rápidos
    recordingInterval = setInterval(() => {
        if (continuousRecorder && continuousRecorder.state === 'recording') {
            continuousRecorder.stop();
            initRecorder(); // Inicia uno nuevo inmediatamente
        }
    }, 30000);
    
    console.log("Grabación continua iniciada en la carpeta 'grabaciones_voz'.");
  } catch(e) {
    console.error("No se pudo iniciar la grabación continua:", e);
  }
}

async function cleanOldRecordings() {
  if (!recordingsHandle) return;
  const now = Date.now();
  const limit = 60 * 60 * 1000; // 1 hora en milisegundos
  try {
      for await (const [name, handle] of recordingsHandle.entries()) {
          if (name.startsWith('bloque_voz_') && handle.kind === 'file') {
              const file = await handle.getFile();
              if (now - file.lastModified > limit) {
                  await recordingsHandle.removeEntry(name);
                  console.log("Grabación antigua purgada por tiempo (>1h):", name);
              }
          }
      }
  } catch(e) {}
}

function stopContinuousRecording() {
  if (recordingInterval) clearInterval(recordingInterval);
  if (continuousRecorder && continuousRecorder.state !== 'inactive') {
      continuousRecorder.stop();
  }
}

// MICROFONO PARA EL CHAT CON LA IA
async function toggleMic() {
  if (isMicActive) { stopMic(); return; }
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    
    const ctx = new AudioContext({ sampleRate: 16000 });
    const src = ctx.createMediaStreamSource(micStream);
    analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    src.connect(analyserNode);
    
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    analyserNode.connect(processor);
    processor.connect(ctx.destination);

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    animateActiveBars(dataArray);

    processor.onaudioprocess = (e) => {
      // Validación estricta de estado OPEN para evitar fugas en conexiones cerradas
      if (!session?.ws || !isConnected || session.ws.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768));
      const b64 = arrayBufferToBase64(pcm16.buffer);
      try {
        session.ws.send(JSON.stringify({
          realtimeInput: {
            audio: { data: b64, mimeType: 'audio/pcm;rate=16000' }
          }
        }));
      } catch(err) {
        // Silenciamos si ocurre en el microsegundo exacto de un cierre
      }
    };

    session._micCtx = ctx;
    session._micProcessor = processor;
    isMicActive = true;
    document.getElementById('micBtn').classList.add('active-mic');
    document.getElementById('micBtn').querySelector('svg').style.stroke = 'var(--gem-green)';
    setStatus('ESCUCHANDO', 'listening');

    // Iniciamos la transcripción local para capturar tu voz en texto
    startTranscription();

  } catch(e) {
    showToast('Sin acceso al micrófono', 'error');
  }
}

function stopMic() {
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (session?._micCtx) { try { session._micCtx.close(); } catch(e) {} }
  // Validación estricta para el envío de finalización
  if (session?.ws && isConnected && session.ws.readyState === WebSocket.OPEN) {
    try { session.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } })); } catch(e) {}
  }
  isMicActive = false;
  analyserNode = null;
  document.getElementById('micBtn').classList.remove('active-mic');
  document.getElementById('micBtn').querySelector('svg').style.stroke = '';
  if (isConnected) setStatus('CONECTADO', 'connected');
  animateIdleBars();

  // Detenemos la transcripción al apagar el mic
  stopTranscription();
}

function startTranscription() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
      console.warn("El navegador no soporta SpeechRecognition nativo.");
      return;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'es-ES';

  recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
          } else {
              interim += event.results[i][0].transcript;
          }
      }
      
      if (interim && typeof updateLiveTranscript === 'function') {
          updateLiveTranscript('TÚ: ' + interim);
      }
      
      if (final && final.trim() && typeof addMessage === 'function') {
          if (typeof clearLiveTranscript === 'function') clearLiveTranscript();
          // Añade el mensaje, lo pinta y lo manda al archivo .txt y a la memoria global
          addMessage('user', final.trim(), true); 
      }
  };

  recognition.onerror = (e) => {
      // Silenciamos errores menores de voz para no ensuciar la consola
  };
  
  recognition.onend = () => {
      // Si el micrófono sigue encendido pero la API de voz se pausó sola, la reiniciamos
      if (isMicActive && recognition) {
          try { recognition.start(); } catch(e) {}
      }
  };

  try { recognition.start(); } catch(e) {}
}

function stopTranscription() {
  if (recognition) {
      recognition.onend = null; 
      try { recognition.stop(); } catch(e) {}
      recognition = null;
  }
  if (typeof clearLiveTranscript === 'function') clearLiveTranscript();
}

// ─── VIDEO & SCREEN ───────────────────────────────────────────────────
async function toggleVideo() {
  if (isVideoActive) { stopVideo(); return; }
  try {
    videoStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } });
    const videoEl = document.getElementById('localVideo');
    videoEl.srcObject = videoStream;
    document.getElementById('videoOverlay').style.display = 'none';
    document.getElementById('videoStatus').classList.add('live');
    isVideoActive = true;
    document.getElementById('videoBtn').classList.add('active-video');
    startSendingFrames(videoEl);
    showToast('Cámara activa', 'success');
  } catch(e) {
    showToast('Sin acceso a la cámara', 'error');
  }
}

function stopVideo() {
  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }
  clearInterval(videoFrameInterval);
  document.getElementById('localVideo').srcObject = null;
  document.getElementById('videoOverlay').style.display = 'flex';
  document.getElementById('videoStatus').classList.remove('live');
  isVideoActive = false;
  document.getElementById('videoBtn').classList.remove('active-video');
}

async function toggleScreen() {
  if (isScreenActive) { stopScreen(); return; }
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const videoEl = document.getElementById('localVideo');
    videoEl.srcObject = screenStream;
    document.getElementById('videoOverlay').style.display = 'none';
    document.getElementById('videoStatus').textContent = '● PANTALLA';
    document.getElementById('videoStatus').classList.add('live');
    isScreenActive = true;
    document.getElementById('screenBtn').classList.add('active-video');
    startSendingFrames(videoEl);
    screenStream.getVideoTracks()[0].onended = () => stopScreen();
    showToast('Pantalla compartida', 'success');
  } catch(e) {
    if (e.name !== 'NotAllowedError') showToast('Error al compartir pantalla', 'error');
  }
}

function stopScreen() {
  if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
  clearInterval(videoFrameInterval);
  document.getElementById('localVideo').srcObject = null;
  document.getElementById('videoOverlay').style.display = 'flex';
  document.getElementById('videoStatus').textContent = '● EN VIVO';
  document.getElementById('videoStatus').classList.remove('live');
  isScreenActive = false;
  document.getElementById('screenBtn').classList.remove('active-video');
}

function startSendingFrames(videoEl) {
  clearInterval(videoFrameInterval);
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  
  videoFrameInterval = setInterval(() => {
    // Validación estricta de estado OPEN para evitar error al desconectar video
    if (!session?.ws || !isConnected || session.ws.readyState !== WebSocket.OPEN) return;
    if (videoEl.readyState < 2) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result.split(',')[1];
        try {
          session.ws.send(JSON.stringify({
            realtimeInput: {
              video: { data: b64, mimeType: 'image/jpeg' }
            }
          }));
        } catch(e) {}
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.7);
  }, 1000); // 1 frame/sec to reduce cost
}