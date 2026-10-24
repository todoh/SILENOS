// ════════════════════════════════════════════════════════════════
//  PHYSICAL MODELING (KARPLUS-STRONG) & FOURIER WAVETABLES (midi.wavetables.js)
// ════════════════════════════════════════════════════════════════

window.MidiWavetables = {
  waveCache: new WeakMap(),
  ksCache: new Map(),

  getCtxCache(audioCtx) {
    if (!this.waveCache.has(audioCtx)) {
      this.waveCache.set(audioCtx, {});
    }
    return this.waveCache.get(audioCtx);
  },

  // Construye un PeriodicWave personalizado a partir de amplitudes armónicas reales (Fourier)
  createCustomWave(audioCtx, name, realCoeffs, imagCoeffs) {
    const cache = this.getCtxCache(audioCtx);
    if (cache[name]) return cache[name];

    const real = new Float32Array(realCoeffs.length);
    const imag = new Float32Array(imagCoeffs.length);
    for (let i = 0; i < realCoeffs.length; i++) {
      real[i] = realCoeffs[i];
      imag[i] = imagCoeffs[i];
    }
    const wave = audioCtx.createPeriodicWave(real, imag, { disableNormalization: false });
    cache[name] = wave;
    return wave;
  },

  // Espectros armónicos extraídos de instrumentos acústicos reales
  getAcousticWave(audioCtx, type) {
    switch (type) {
      case 'grand_piano':
        // Espectro cálido y rico en armónicos fundamentales con caída progresiva
        return this.createCustomWave(
          audioCtx,
          'grand_piano',
          [0, 0.15, 0.08, 0.04, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005],
          [0, 1.00, 0.58, 0.36, 0.22, 0.14, 0.09,  0.05,  0.03,  0.015]
        );

      case 'epiano_tine':
        // Timbre Rhodes/Wurlitzer con sobretonos cristalinos en armónicos 2, 3 y 7
        return this.createCustomWave(
          audioCtx,
          'epiano_tine',
          [0, 0.10, 0.25, 0.05, 0.02, 0.01, 0.08, 0.02],
          [0, 1.00, 0.45, 0.28, 0.08, 0.04, 0.15, 0.06]
        );

      case 'violin_bow':
        // Onda de diente de sierra acústica Helmholtz con énfasis en armónicos medios
        return this.createCustomWave(
          audioCtx,
          'violin_bow',
          [0, 0.20, 0.12, 0.08, 0.06, 0.04, 0.03, 0.02, 0.015, 0.01, 0.008, 0.005],
          [0, 1.00, 0.68, 0.52, 0.40, 0.31, 0.24, 0.18, 0.14,  0.10, 0.07,  0.04]
        );

      case 'brass_horn':
        // Metales: fuerte presencia de armónicos 2, 3, 4 y 5 que dan cuerpo y proyección
        return this.createCustomWave(
          audioCtx,
          'brass_horn',
          [0, 0.25, 0.35, 0.28, 0.18, 0.12, 0.08, 0.05, 0.03, 0.02, 0.01],
          [0, 0.85, 1.00, 0.82, 0.60, 0.42, 0.28, 0.18, 0.11, 0.06, 0.03]
        );

      case 'clarinet_reed':
        // Lengüeta cilíndrica: predominio de armónicos impares (1, 3, 5, 7) + pares suaves
        return this.createCustomWave(
          audioCtx,
          'clarinet_reed',
          [0, 0.10, 0.02, 0.08, 0.01, 0.05, 0.01, 0.03, 0.005],
          [0, 1.00, 0.14, 0.72, 0.12, 0.46, 0.08, 0.25, 0.05]
        );

      case 'oboe_double_reed':
        // Lengüeta doble: formantes intensos en armónicos 2, 3, 4 y 5
        return this.createCustomWave(
          audioCtx,
          'oboe_double_reed',
          [0, 0.15, 0.30, 0.35, 0.20, 0.12, 0.08, 0.04, 0.02],
          [0, 0.65, 0.95, 1.00, 0.70, 0.45, 0.28, 0.15, 0.08]
        );

      case 'flute_pipe':
        // Flauta: fundamental pura con segundo y tercer armónico sedosos
        return this.createCustomWave(
          audioCtx,
          'flute_pipe',
          [0, 0.08, 0.03, 0.01, 0.004],
          [0, 1.00, 0.28, 0.09, 0.025]
        );

      case 'choir_voice':
        // Voz humana rica en armónicos para ser esculpida por filtros de formantes
        return this.createCustomWave(
          audioCtx,
          'choir_voice',
          [0, 0.22, 0.18, 0.15, 0.12, 0.09, 0.07, 0.05, 0.03, 0.02, 0.01],
          [0, 1.00, 0.80, 0.65, 0.50, 0.38, 0.28, 0.20, 0.14, 0.09, 0.05]
        );

      case 'hammond_organ':
        // Drawbars 888442211 clásicos
        return this.createCustomWave(
          audioCtx,
          'hammond_organ',
          [0, 0.1, 0.1, 0.08, 0.05, 0.03, 0.02, 0.01, 0.01],
          [0, 1.0, 1.0, 0.85, 0.55, 0.40, 0.30, 0.20, 0.15]
        );

      default:
        return this.createCustomWave(
          audioCtx,
          'default_warm',
          [0, 0.1, 0.05, 0.02, 0.01],
          [0, 1.0, 0.45, 0.22, 0.10]
        );
    }
  },

  // ════════════════════════════════════════════════════════════════
  //  MODELADO FÍSICO KARPLUS-STRONG DE CUERDA PULSADA / GOLPEADA
  //  Genera un AudioBuffer real simulando la física de la cuerda
  // ════════════════════════════════════════════════════════════════
  generatePluckedStringBuffer(audioCtx, freq, durationSec, options = {}) {
    const sampleRate = audioCtx.sampleRate;
    const safeFreq = Math.max(27.5, Math.min(4200, freq));
    const totalSamples = Math.floor(sampleRate * Math.min(6.0, durationSec + 0.4));
    const buffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
    const out = buffer.getChannelData(0);

    // Parámetros físicos según el instrumento (Nylon, Acero, Bajo, Arpa, Martillo Piano)
    const damping = options.damping || 0.9965;        // Pérdida de energía por ciclo
    const brightness = options.brightness || 0.42;    // Brillo de la púa/dedo (0.1 = cálido/nylon, 0.7 = metálico)
    const pickPos = options.pickPosition || 0.18;     // Posición de pulsación en la cuerda (filtro peine natural)
    const stiffness = options.stiffness || 0.04;      // Rigidez/Inarmonicidad del metal

    const period = Math.max(4, Math.round(sampleRate / safeFreq));
    const delayLine = new Float32Array(period);

    // 1. Excitación inicial de la cuerda (pulso de púa/dedo filtrado + efecto comb de posición de mano)
    const rawNoise = new Float32Array(period);
    let lpState = 0;
    const lpAlpha = 0.18 + brightness * 0.65;

    for (let i = 0; i < period; i++) {
      // Forma de impulso mitad seno + ruido rosado para dar cuerpo tonal inmediato
      const pluckShape = Math.sin((i / period) * Math.PI * 2) * 0.55;
      const white = (Math.random() * 2 - 1) * 0.85;
      lpState = lpState + lpAlpha * (white - lpState);
      rawNoise[i] = pluckShape + lpState;
    }

    // Filtro peine por la posición donde se pulsa la cuerda
    const combOffset = Math.max(1, Math.floor(period * pickPos));
    for (let i = 0; i < period; i++) {
      const prevIdx = (i - combOffset + period) % period;
      delayLine[i] = (rawNoise[i] - rawNoise[prevIdx] * 0.65) * 0.75;
    }

    // 2. Bucle de propagación de onda Karplus-Strong con filtro de absorción del puente + all-pass de rigidez
    let ptr = 0;
    let prevSample = 0;
    let allPassState = 0;
    const lowpassBlend = 0.5 - (brightness * 0.32); // Cuanto menor, más brillan los agudos

    for (let i = 0; i < totalSamples; i++) {
      const current = delayLine[ptr];
      const nextPtr = (ptr + 1) % period;
      const nextVal = delayLine[nextPtr];

      // Filtro de media ponderada de 2 puntos (absorción de agudos en las cejuelas)
      let averaged = (1 - lowpassBlend) * current + lowpassBlend * nextVal;

      // Dispersión de fase ligera por rigidez de la cuerda
      const apOut = stiffness * (averaged - allPassState) + prevSample;
      prevSample = averaged;
      allPassState = apOut;

      // Realimentación con decaimiento
      delayLine[ptr] = apOut * damping;
      out[i] = current;

      ptr = nextPtr;
    }

    return buffer;
  }
};