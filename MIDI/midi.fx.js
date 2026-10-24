// ════════════════════════════════════════════════════════════════
//  STUDIO FX: STEREO CHORUS, PING-PONG DELAY, REVERB & MASTERING (midi.fx.js)
// ════════════════════════════════════════════════════════════════

window.MidiFX = {
  impulseCache: new WeakMap(),

  // Genera un Impulse Response (IR) True-Stereo denso de Sala Sinfónica con modulación de cola
  getConcertHallImpulse(audioCtx, duration = 2.6, decay = 2.4) {
    if (this.impulseCache.has(audioCtx)) {
      return this.impulseCache.get(audioCtx);
    }

    const rate = audioCtx.sampleRate;
    const length = Math.floor(rate * duration);
    const impulse = audioCtx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    // Early reflections binaurales (primeros 85ms)
    const earlyTaps = [
      { delay: 0.009, gainL: 0.50, gainR: 0.18 },
      { delay: 0.016, gainL: 0.20, gainR: 0.52 },
      { delay: 0.024, gainL: 0.42, gainR: 0.30 },
      { delay: 0.035, gainL: 0.26, gainR: 0.44 },
      { delay: 0.047, gainL: 0.38, gainR: 0.25 },
      { delay: 0.061, gainL: 0.22, gainR: 0.36 },
      { delay: 0.076, gainL: 0.29, gainR: 0.28 },
      { delay: 0.089, gainL: 0.18, gainR: 0.24 }
    ];

    earlyTaps.forEach(tap => {
      const idx = Math.floor(tap.delay * rate);
      if (idx < length) {
        left[idx] += tap.gainL;
        right[idx] += tap.gainR;
      }
    });

    // Cola difusa con filtro de absorción de aire progresivo
    let lpL = 0;
    let lpR = 0;
    for (let i = Math.floor(0.012 * rate); i < length; i++) {
      const t = i / length;
      const env = Math.pow(1 - t, decay);
      // Absorción natural del aire en altas frecuencias conforme pasa el tiempo
      const airDamp = 0.22 + 0.62 * Math.pow(1 - t, 1.4);

      const nL = (Math.random() * 2 - 1) * env * 0.42;
      const nR = (Math.random() * 2 - 1) * env * 0.42;

      lpL = lpL + airDamp * (nL - lpL);
      lpR = lpR + airDamp * (nR - lpR);

      left[i] += lpL;
      right[i] += lpR;
    }

    this.impulseCache.set(audioCtx, impulse);
    return impulse;
  },

  // Saturador de válvulas / cinta magnética asimétrico suave (añade armónicos pares e impares cálidos)
  getAnalogTapeCurve() {
    const samples = 16384;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Ligera asimetría para generar segundo armónico cálido tipo válvula
      const shifted = x + 0.04 * (x * x);
      curve[i] = Math.tanh(shifted * 1.55) / Math.tanh(1.55);
    }
    return curve;
  },

  // Crea un Chorus Estéreo Analógico real (tipo Roland Dimension D / Juno)
  createStereoChorusBus(audioCtx, destinationNode, totalDurationSec = 180) {
    const input = audioCtx.createGain();
    input.gain.value = 1.0;

    const splitter = audioCtx.createChannelSplitter(2);
    const merger = audioCtx.createChannelMerger(2);

    const delayL = audioCtx.createDelay(0.1);
    const delayR = audioCtx.createDelay(0.1);
    delayL.delayTime.value = 0.014;
    delayR.delayTime.value = 0.019;

    const lfoL = audioCtx.createOscillator();
    const lfoR = audioCtx.createOscillator();
    lfoL.type = 'sine';
    lfoR.type = 'triangle';
    lfoL.frequency.value = 0.68;
    lfoR.frequency.value = 0.83;

    const depthL = audioCtx.createGain();
    const depthR = audioCtx.createGain();
    depthL.gain.value = 0.0032;
    depthR.gain.value = 0.0036;

    lfoL.connect(depthL);
    lfoR.connect(depthR);
    depthL.connect(delayL.delayTime);
    depthR.connect(delayR.delayTime);

    const now = audioCtx.currentTime;
    lfoL.start(now);
    lfoR.start(now);
    lfoL.stop(now + totalDurationSec + 5);
    lfoR.stop(now + totalDurationSec + 5);

    input.connect(splitter);
    splitter.connect(delayL, 0);
    splitter.connect(delayR, 1);

    delayL.connect(merger, 0, 0);
    delayR.connect(merger, 0, 1);

    const chorusFilter = audioCtx.createBiquadFilter();
    chorusFilter.type = 'highpass';
    chorusFilter.frequency.value = 220;

    const wetOut = audioCtx.createGain();
    wetOut.gain.value = 0.65;

    merger.connect(chorusFilter);
    chorusFilter.connect(wetOut);
    wetOut.connect(destinationNode);

    return input;
  },

  // Crea un Delay Estéreo Ping-Pong sincronizado al BPM (corchea con puntillo)
  createStereoDelayBus(audioCtx, destinationNode, bpm = 120) {
    const input = audioCtx.createGain();
    input.gain.value = 1.0;

    const secPerBeat = 60 / (bpm || 120);
    const delayTimeL = Math.min(0.85, secPerBeat * 0.75); // Corchea con puntillo
    const delayTimeR = Math.min(0.85, secPerBeat * 0.50); // Corchea

    const delayL = audioCtx.createDelay(1.5);
    const delayR = audioCtx.createDelay(1.5);
    delayL.delayTime.value = delayTimeL;
    delayR.delayTime.value = delayTimeR;

    const fbL = audioCtx.createGain();
    const fbR = audioCtx.createGain();
    fbL.gain.value = 0.28;
    fbR.gain.value = 0.26;

    const dampFilter = audioCtx.createBiquadFilter();
    dampFilter.type = 'lowpass';
    dampFilter.frequency.value = 2800;

    const panL = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    const panR = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    if (panL && panR) {
      panL.pan.value = -0.65;
      panR.pan.value = 0.65;
    }

    const wetOut = audioCtx.createGain();
    wetOut.gain.value = 0.32;

    input.connect(dampFilter);
    dampFilter.connect(delayL);
    dampFilter.connect(delayR);

    delayL.connect(fbL);
    fbL.connect(delayR);
    delayR.connect(fbR);
    fbR.connect(delayL);

    if (panL && panR) {
      delayL.connect(panL);
      delayR.connect(panR);
      panL.connect(wetOut);
      panR.connect(wetOut);
    } else {
      delayL.connect(wetOut);
      delayR.connect(wetOut);
    }

    wetOut.connect(destinationNode);
    return input;
  },

  // Crea la Consola Maestra de Estudio:
  // Dry Bus + Chorus Bus + Delay Bus + Reverb Convolver -> EQ Analógico -> Cinta -> Compresor -> Limitador
  createMasterStudioBus(audioCtx, destinationNode, bpm = 120, totalDurationSec = 180) {
    const sumBus = audioCtx.createGain();
    sumBus.gain.value = 0.90;

    const dryBus = audioCtx.createGain();
    dryBus.gain.value = 0.90;
    dryBus.connect(sumBus);

    // 1. Bus de Reverb de Convolución
    const reverbBus = audioCtx.createGain();
    reverbBus.gain.value = 0.55;

    const reverbHP = audioCtx.createBiquadFilter();
    reverbHP.type = 'highpass';
    reverbHP.frequency.value = 180;

    const reverbLP = audioCtx.createBiquadFilter();
    reverbLP.type = 'lowpass';
    reverbLP.frequency.value = 5800;

    const convolver = audioCtx.createConvolver();
    convolver.buffer = this.getConcertHallImpulse(audioCtx, 2.5, 2.4);

    const reverbReturn = audioCtx.createGain();
    reverbReturn.gain.value = 0.62;

    reverbBus.connect(reverbHP);
    reverbHP.connect(reverbLP);
    reverbLP.connect(convolver);
    convolver.connect(reverbReturn);
    reverbReturn.connect(sumBus);

    // 2. Bus de Chorus Estéreo
    const chorusBus = this.createStereoChorusBus(audioCtx, sumBus, totalDurationSec);

    // 3. Bus de Delay Ping-Pong
    const delayBus = this.createStereoDelayBus(audioCtx, sumBus, bpm);

    // 4. Cadena de Masterización (EQ Pultec-style + Tape Saturator + Glue Compressor)
    const subCut = audioCtx.createBiquadFilter();
    subCut.type = 'highpass';
    subCut.frequency.value = 28;

    const lowWarmth = audioCtx.createBiquadFilter();
    lowWarmth.type = 'lowshelf';
    lowWarmth.frequency.value = 95;
    lowWarmth.gain.value = 2.8;

    const mudCut = audioCtx.createBiquadFilter();
    mudCut.type = 'peaking';
    mudCut.frequency.value = 340;
    mudCut.Q.value = 1.4;
    mudCut.gain.value = -1.8;

    const presenceBoost = audioCtx.createBiquadFilter();
    presenceBoost.type = 'peaking';
    presenceBoost.frequency.value = 3200;
    presenceBoost.Q.value = 0.9;
    presenceBoost.gain.value = 1.6;

    const airShelf = audioCtx.createBiquadFilter();
    airShelf.type = 'highshelf';
    airShelf.frequency.value = 8500;
    airShelf.gain.value = 2.4;

    const tapeSaturator = audioCtx.createWaveShaper();
    tapeSaturator.curve = this.getAnalogTapeCurve();
    tapeSaturator.oversample = '2x';

    const glueCompressor = audioCtx.createDynamicsCompressor();
    glueCompressor.threshold.value = -15;
    glueCompressor.knee.value = 10;
    glueCompressor.ratio.value = 3.2;
    glueCompressor.attack.value = 0.012;
    glueCompressor.release.value = 0.16;

    const masterOut = audioCtx.createGain();
    masterOut.gain.value = 0.95;

    sumBus.connect(subCut);
    subCut.connect(lowWarmth);
    lowWarmth.connect(mudCut);
    mudCut.connect(presenceBoost);
    presenceBoost.connect(airShelf);
    airShelf.connect(tapeSaturator);
    tapeSaturator.connect(glueCompressor);
    glueCompressor.connect(masterOut);
    masterOut.connect(destinationNode);

    return {
      dryBus,
      reverbBus,
      chorusBus,
      delayBus,
      masterOut
    };
  },

  // Strip de canal por pista con envíos independientes a Reverb (CC91), Chorus (CC93) y Delay
  createTrackChannelStrip(audioCtx, studioBus, panVal = 64, reverbVal = 42, chorusVal = 25, delaySendVal = 15) {
    const input = audioCtx.createGain();
    input.gain.value = 1.0;

    const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    const postPan = panner || input;

    if (panner) {
      const normPan = Math.max(-1, Math.min(1, (panVal - 64) / 64));
      panner.pan.value = normPan;
      input.connect(panner);
    }

    // Salida directa al Dry Bus
    postPan.connect(studioBus.dryBus);

    // Envío Reverb (CC91)
    if (studioBus.reverbBus) {
      const revSend = audioCtx.createGain();
      revSend.gain.value = Math.max(0, Math.min(1.0, (reverbVal !== undefined ? reverbVal : 42) / 127)) * 0.78;
      postPan.connect(revSend);
      revSend.connect(studioBus.reverbBus);
    }

    // Envío Chorus Estéreo (CC93)
    if (studioBus.chorusBus && chorusVal > 0) {
      const choSend = audioCtx.createGain();
      choSend.gain.value = Math.max(0, Math.min(1.0, chorusVal / 127)) * 0.65;
      postPan.connect(choSend);
      choSend.connect(studioBus.chorusBus);
    }

    // Envío Delay Ping-Pong
    if (studioBus.delayBus && delaySendVal > 0) {
      const delSend = audioCtx.createGain();
      delSend.gain.value = Math.max(0, Math.min(1.0, delaySendVal / 127)) * 0.45;
      postPan.connect(delSend);
      delSend.connect(studioBus.delayBus);
    }

    return { input, panner };
  }
};