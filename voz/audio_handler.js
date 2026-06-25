// ─── AUDIO PLAYBACK ─────────────────────────────────────────────────

// Variables para el control continuo de audio sin gaps (anti-pop)
let nextAudioTime = 0; 
let currentActiveSource = null; 

function queueAudio(float32) {
  audioQueue.push(float32);
  if (!isPlayingAudio) {
    // Si la cola estaba vacía, establecemos la base de tiempo ligeramente en el futuro
    if (audioContext) {
      nextAudioTime = audioContext.currentTime + 0.05; // 50ms buffer
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
  src.connect(audioContext.destination);

  // Auto-corrección si el tiempo matemático se ha quedado atrás respecto a la realidad
  if (nextAudioTime < audioContext.currentTime) {
    nextAudioTime = audioContext.currentTime + 0.05;
  }

  // Programar el nodo en la línea de tiempo matemática exacta
  src.start(nextAudioTime);
  currentActiveSource = src;
  
  const duration = buf.duration;
  nextAudioTime += duration;

  // En lugar de onended, disparamos la preparación del siguiente nodo 
  // 50ms antes de que acabe el actual, logrando un empalme perfecto.
  const timeToNext = (nextAudioTime - audioContext.currentTime - 0.05) * 1000;
  setTimeout(playNextChunk, Math.max(0, timeToNext));
}