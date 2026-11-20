// fn_audio2.js
// Módulo Extendido de Síntesis Pro, Efectos Brutales y Motores FM para la IA

import { initAudioContext, getMasterAudioDestination } from './fn_audio.js';

/**
 * Crea una curva de distorsión suave u Overdrive agresivo para WaveShaperNode
 */
export function createDistortionCurve(amount = 50) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Sintetizador FM (Frecuencia Modulada) brutal de 2 Operadores
 * Permite crear sonidos cyberpunk, bajos rasgados, campanas agresivas o sci-fi.
 */
export function playFMTone({
  carrierFreq = 110,
  modulatorFreq = 220,
  modulationIndex = 100,
  duration = 0.8,
  carrierType = 'sawtooth',
  modulatorType = 'sine',
  distortion = 0,
  volume = 0.3
}) {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const now = ctx.currentTime;

  // Operador Portador (Carrier) y Modulador
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  const mainGain = ctx.createGain();

  carrier.type = carrierType;
  carrier.frequency.setValueAtTime(carrierFreq, now);

  modulator.type = modulatorType;
  modulator.frequency.setValueAtTime(modulatorFreq, now);

  // El mod gain controla la intensidad de la modulación FM (Índice de modulación)
  modGain.gain.setValueAtTime(modulationIndex, now);
  modGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

  // Envolvente principal de amplitud
  mainGain.gain.setValueAtTime(volume, now);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  // Conectar modulador a la frecuencia del portador
  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  // Ruta opcional de distorsión saturada
  let lastNode = carrier;
  if (distortion > 0) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = createDistortionCurve(distortion);
    shaper.oversample = '4x';
    carrier.connect(shaper);
    lastNode = shaper;
  }

  lastNode.connect(mainGain);
  mainGain.connect(dest);

  modulator.start(now);
  carrier.start(now);
  modulator.stop(now + duration);
  carrier.stop(now + duration);
}

/**
 * Generador de Impactos Cinemáticos y Risers Pro
 */
export function playCinematicImpact({
  type = 'sub_drop', // 'sub_drop', 'cyber_blast', 'metal_hit'
  volume = 0.4
} = {}) {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const now = ctx.currentTime;

  if (type === 'sub_drop') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 1.2);
  } else if (type === 'cyber_blast') {
    playFMTone({
      carrierFreq: 80,
      modulatorFreq: 160,
      modulationIndex: 450,
      duration: 0.9,
      carrierType: 'sawtooth',
      modulatorType: 'square',
      distortion: 80,
      volume
    });
  }
}

/**
 * Motor de Interpretación de Parches JSON Complejos para la IA
 * Permite que Gemini o Ollama envíen una estructura completa de síntesis
 */
export function synthesizeCustomPatch(patchConfig) {
  const ctx = initAudioContext();
  if (!ctx) return;
  const dest = getMasterAudioDestination();
  const now = ctx.currentTime;

  const config = Object.assign({
    freq: 220,
    duration: 0.5,
    oscillators: [
      { type: 'sawtooth', detune: -10, gain: 0.5 },
      { type: 'sawtooth', detune: 10, gain: 0.5 }
    ],
    filter: { type: 'lowpass', frequency: 1200, envelopeAmount: 2000 },
    distortion: 20,
    volume: 0.3
  }, patchConfig);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(config.volume, now);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

  // Filtro
  const filterNode = ctx.createBiquadFilter();
  filterNode.type = config.filter.type || 'lowpass';
  filterNode.frequency.setValueAtTime(config.filter.frequency || 1000, now);
  if (config.filter.envelopeAmount) {
    filterNode.frequency.exponentialRampToValueAtTime(
      Math.max(20, config.filter.frequency + config.filter.envelopeAmount),
      now + config.duration * 0.3
    );
  }

  // Distorsión
  let outputPoint = filterNode;
  if (config.distortion > 0) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = createDistortionCurve(config.distortion);
    shaper.oversample = '4x';
    filterNode.connect(shaper);
    outputPoint = shaper;
  }
  outputPoint.connect(masterGain);
  masterGain.connect(dest);

  // Instanciar osciladores
  config.oscillators.forEach(oscCfg => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = oscCfg.type || 'sine';
    osc.frequency.setValueAtTime(config.freq, now);
    osc.detune.setValueAtTime(oscCfg.detune || 0, now);

    oscGain.gain.setValueAtTime(oscCfg.gain || 0.5, now);

    osc.connect(oscGain);
    oscGain.connect(filterNode);

    osc.start(now);
    osc.stop(now + config.duration);
  });
}