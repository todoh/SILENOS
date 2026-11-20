// fn_audio.js
// Módulo de Web Audio API y Sintetizadores Generativos (Core & Master Bus)

export function initAudioContext() {
  if (!window._globalAudioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      window._globalAudioContext = new AudioCtx();
    }
  }

  if (window._globalAudioContext && window._globalAudioContext.state === 'suspended') {
    window._globalAudioContext.resume();
  }

  if (window._globalAudioContext && !window._globalAudioMasterGain) {
    const ctx = window._globalAudioContext;
    const masterGain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();

    limiter.threshold.setValueAtTime(-1.0, ctx.currentTime);
    limiter.knee.setValueAtTime(0, ctx.currentTime);
    limiter.ratio.setValueAtTime(20, ctx.currentTime);
    limiter.attack.setValueAtTime(0.003, ctx.currentTime);
    limiter.release.setValueAtTime(0.1, ctx.currentTime);

    masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    window._globalAudioMasterGain = masterGain;
  }

  return window._globalAudioContext;
}

export function getMasterAudioDestination() {
  const ctx = initAudioContext();
  if (!ctx) return null;
  return window._globalAudioMasterGain || ctx.destination;
}

export function playTone(freq, duration = 0.2, type = 'sine', volume = 0.2) {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playSFXJump() {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(150, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(dest);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
}

export function playSFXExplosion() {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  whiteNoise.start();
  whiteNoise.stop(ctx.currentTime + 0.3);
}

export function playSFXCoin() {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(987.77, now);
  osc.frequency.setValueAtTime(1318.51, now + 0.08);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.3);
}

export function createSimpleSynth() {
  const ctx = initAudioContext();
  const dest = getMasterAudioDestination();

  return {
    triggerAttackRelease(freq, duration = 0.5, adsr = { a: 0.01, d: 0.1, s: 0.7, r: 0.2 }) {
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + adsr.a);
      gain.gain.linearRampToValueAtTime(0.3 * adsr.s, now + adsr.a + adsr.d);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + adsr.r);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(now);
      osc.stop(now + duration + adsr.r);
    }
  };
}

export function createAudioAnalyser(audioCtx, sourceNode, fftSize = 64) {
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = fftSize;
  if (sourceNode) sourceNode.connect(analyser);
  return analyser;
}

export function getFrequencyData(analyser) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);
  return dataArray;
}

export function setMasterVolume(gainNode, volume = 1.0) {
  const ctx = initAudioContext();
  const targetGain = gainNode || window._globalAudioMasterGain;
  if (targetGain && targetGain.gain) {
    targetGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx ? ctx.currentTime : 0);
  }
}

export async function loadAudioBuffer(url) {
  const ctx = initAudioContext();
  if (!ctx) throw new Error("AudioContext no inicializado");
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}