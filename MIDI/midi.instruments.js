// ════════════════════════════════════════════════════════════════
//  ACOUSTIC & STUDIO INSTRUMENT ENGINE (midi.instruments.js)
// ════════════════════════════════════════════════════════════════

window.MidiInstruments = {
  noiseBufferCache: new WeakMap(),

  getNoiseBuffer(audioCtx) {
    if (this.noiseBufferCache.has(audioCtx)) {
      return this.noiseBufferCache.get(audioCtx);
    }
    const len = audioCtx.sampleRate * 1.5;
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBufferCache.set(audioCtx, buf);
    return buf;
  },

  // Define la arquitectura acústica de los 128 instrumentos General MIDI
  getPatch(program = 0) {
    const p = Math.max(0, Math.min(127, parseInt(program, 10) || 0));

    // 0-7: Pianos Acústicos de Cola, Pianos Eléctricos y Clavicémbalos
    if (p === 0 || p === 1 || p === 3) {
      return {
        engine: 'steinway_grand',
        waveType: 'grand_piano',
        inharmonicity: p === 1 ? 0.00045 : 0.00028, // Cuerda rígida real
        hammerHardness: p === 1 ? 0.65 : 0.48,
        soundboardResonance: [180, 620, 1850],
        attack: 0.004, decay: 1.45, sustain: 0.14, release: 0.38,
        filterBase: 3200, filterVelScale: 4500, filterQ: 0.85,
        defaultChorus: p === 3 ? 65 : 18,
        defaultDelay: 12
      };
    }
    if (p === 2 || p === 4 || p === 5) {
      return {
        engine: 'fm_epiano',
        waveType: 'epiano_tine',
        modRatio: p === 5 ? 14.0 : 3.0,
        modIndex: p === 5 ? 240 : 120,
        modDecay: 0.48,
        stereoSpread: 0.35,
        attack: 0.005, decay: 1.15, sustain: 0.25, release: 0.42,
        filterBase: 3800, filterVelScale: 2800, filterQ: 1.0,
        defaultChorus: 58,
        defaultDelay: 25
      };
    }
    if (p === 6 || p === 7) {
      return {
        engine: 'karplus_plucked',
        damping: 0.9968,
        brightness: 0.68,
        pickPosition: 0.12,
        stiffness: 0.08,
        bodyFreqs: [320, 1100, 2600],
        attack: 0.002, decay: 0.75, sustain: 0.10, release: 0.22,
        defaultChorus: 30,
        defaultDelay: 18
      };
    }

    // 8-15: Percusión Cromática (Celesta, Vibráfono, Marimba, Xilófono, Campanas Tubulares)
    if (p >= 8 && p <= 15) {
      const isWooden = (p === 12 || p === 13);
      return {
        engine: 'fm_mallet',
        waveType: 'epiano_tine',
        modRatio: isWooden ? 4.0 : 2.756, // Proporción modal de barra vibratoria
        modIndex: isWooden ? 140 : 280,
        modDecay: isWooden ? 0.09 : 0.55,
        attack: 0.003,
        decay: isWooden ? 0.38 : 1.35,
        sustain: 0.04,
        release: isWooden ? 0.22 : 0.75,
        filterBase: 5500, filterVelScale: 2800,
        defaultChorus: p === 11 ? 52 : 20,
        defaultDelay: 28
      };
    }

    // 16-23: Órganos (Hammond B3 con Rotary, Órgano de Catedral, Acordeón)
    if (p >= 16 && p <= 23) {
      return {
        engine: 'cathedral_organ',
        waveType: 'hammond_organ',
        subOctave: p === 19 ? 0.65 : 0.4,
        fifthHarmonic: 0.35,
        octHarmonic: 0.5,
        vibratoRate: p <= 18 ? 6.4 : 4.5,
        vibratoDepth: p <= 18 ? 11 : 6,
        attack: p === 19 ? 0.085 : 0.012,
        decay: 0.15, sustain: 0.92, release: p === 19 ? 0.45 : 0.14,
        filterBase: 4600, filterVelScale: 1600,
        defaultChorus: 62,
        defaultDelay: 15
      };
    }

    // 24-31: Guitarras (Nylon Española, Acústica Acero, Jazz, Eléctrica Clean, Overdrive, Distorsión)
    if (p >= 24 && p <= 28) {
      const isNylon = (p === 24);
      const isJazz = (p === 26);
      return {
        engine: 'karplus_plucked',
        damping: isNylon ? 0.9958 : 0.9974,
        brightness: isNylon ? 0.34 : (isJazz ? 0.28 : 0.58),
        pickPosition: isNylon ? 0.24 : 0.15,
        stiffness: isNylon ? 0.02 : 0.05,
        bodyFreqs: isNylon ? [195, 420, 2100] : [115, 240, 1850],
        attack: 0.003, decay: 1.25, sustain: 0.15, release: 0.28,
        defaultChorus: p === 27 ? 55 : 22,
        defaultDelay: 24
      };
    }
    if (p >= 29 && p <= 31) {
      // Guitarra Eléctrica Lead / Overdrive / Distorsión con Simulador de Cabina 4x12
      return {
        engine: 'electric_lead_guitar',
        drive: p === 29 ? 4.5 : 8.5,
        attack: 0.005, decay: 0.95, sustain: 0.68, release: 0.26,
        vibratoRate: 5.5, vibratoDepth: 14, vibratoDelay: 0.20,
        defaultChorus: 45,
        defaultDelay: 42
      };
    }

    // 32-39: Bajos (Contrabajo Acústico, Eléctrico Dedos/Púa, Fretless, Slap, Synth Bass)
    if (p >= 32 && p <= 39) {
      const isSynth = (p >= 38);
      const isSlap = (p === 36 || p === 37);
      return {
        engine: isSynth ? 'analog_sub_bass' : 'acoustic_electric_bass',
        damping: 0.9975,
        brightness: isSlap ? 0.68 : 0.36,
        subLevel: 0.72,
        attack: 0.005, decay: 0.45, sustain: 0.55, release: 0.15,
        filterStart: isSlap ? 3800 : (isSynth ? 3400 : 1850),
        filterEnd: 290,
        filterDecay: 0.18,
        filterQ: isSynth ? 3.8 : 1.6,
        defaultChorus: p === 35 ? 45 : 10,
        defaultDelay: 0
      };
    }

    // 40-55: Cuerdas Orquestales, Arpa, Pizzicato y Coros Humanos
    if (p === 45 || p === 46) {
      // Pizzicato / Arpa de Concierto (Karplus-Strong puro)
      return {
        engine: 'karplus_plucked',
        damping: p === 46 ? 0.9978 : 0.9942,
        brightness: p === 46 ? 0.46 : 0.30,
        pickPosition: 0.22,
        stiffness: 0.03,
        bodyFreqs: [220, 580, 1650],
        attack: 0.003, decay: p === 46 ? 1.6 : 0.35, sustain: 0.06, release: p === 46 ? 0.55 : 0.16,
        defaultChorus: 35,
        defaultDelay: 28
      };
    }
    if (p >= 52 && p <= 54) {
      // Coro Sinfónico con Filtros de Formantes Vocales (Vocales A / O / E)
      return {
        engine: 'formant_choir',
        waveType: 'choir_voice',
        formants: [
          { freq: 720, Q: 4.5, gain: 1.0 },
          { freq: 1180, Q: 5.5, gain: 0.65 },
          { freq: 2650, Q: 6.0, gain: 0.35 }
        ],
        attack: 0.18, decay: 0.45, sustain: 0.85, release: 0.55,
        vibratoRate: 5.1, vibratoDepth: 9, vibratoDelay: 0.22,
        defaultChorus: 68,
        defaultDelay: 30
      };
    }
    if (p >= 40 && p <= 55) {
      const isSolo = (p <= 43);
      return {
        engine: 'symphonic_strings',
        waveType: 'violin_bow',
        voices: isSolo ? 3 : 5,
        detuneSpread: isSolo ? 6 : 14,
        bodyFormants: [285, 1150, 2450], // Resonancia de madera Stradivarius
        rosinNoise: isSolo ? 0.05 : 0.03,
        vibratoRate: 5.5,
        vibratoDepth: isSolo ? 13 : 8,
        vibratoDelay: 0.20,
        attack: isSolo ? 0.055 : 0.14,
        decay: 0.40, sustain: 0.84, release: 0.46,
        filterBase: 3400, filterVelScale: 2400, filterQ: 0.9,
        defaultChorus: isSolo ? 35 : 65,
        defaultDelay: 22
      };
    }

    // 56-63: Metales Sinfónicos (Trompeta, Trombón, Tuba, Trompa Francesa, Brass Section)
    if (p >= 56 && p <= 63) {
      return {
        engine: 'symphonic_brass',
        waveType: 'brass_horn',
        voices: p >= 60 ? 4 : 2,
        detuneSpread: p >= 60 ? 10 : 5,
        attack: 0.032, decay: 0.26, sustain: 0.78, release: 0.22,
        filterStart: 580, filterPeak: 4800, filterSustain: 2400, filterQ: 1.8,
        vibratoRate: 5.2, vibratoDepth: 9, vibratoDelay: 0.26,
        defaultChorus: 42,
        defaultDelay: 20
      };
    }

    // 64-79: Vientos Madera (Saxofón, Oboe, Clarinete, Fagot, Flauta Travesera, Flauta de Pan)
    if (p >= 64 && p <= 79) {
      const isFlute = (p >= 72);
      const isSingleReed = (p === 64 || p === 65 || p === 71);
      return {
        engine: 'symphonic_woodwind',
        waveType: isFlute ? 'flute_pipe' : (isSingleReed ? 'clarinet_reed' : 'oboe_double_reed'),
        breathNoise: isFlute ? 0.14 : 0.05,
        vibratoRate: 5.6, vibratoDepth: 11, vibratoDelay: 0.18,
        attack: 0.038, decay: 0.22, sustain: 0.82, release: 0.24,
        filterBase: isFlute ? 3600 : 2900, filterVelScale: 2200, filterQ: 1.3,
        defaultChorus: 32,
        defaultDelay: 26
      };
    }

    // 80-103: Sintetizadores Analógicos Polifónicos Leads & Pads
    if (p >= 80 && p <= 103) {
      const isPad = (p >= 88);
      return {
        engine: 'symphonic_strings',
        waveType: 'violin_bow',
        voices: isPad ? 5 : 3,
        detuneSpread: isPad ? 18 : 10,
        bodyFormants: [400, 1600, 3200],
        rosinNoise: 0.02,
        vibratoRate: 4.8, vibratoDepth: 10, vibratoDelay: 0.22,
        attack: isPad ? 0.25 : 0.015,
        decay: 0.4, sustain: 0.82, release: isPad ? 0.70 : 0.28,
        filterBase: isPad ? 2400 : 3800, filterVelScale: 3000, filterQ: 1.8,
        defaultChorus: 65,
        defaultDelay: 38
      };
    }

    // 104-127: Instrumentos Étnicos de Cuerda Pulsada (Sitar, Banjo, Koto, Kalimba, Shamisen)
    return {
      engine: 'karplus_plucked',
      damping: 0.9965,
      brightness: 0.65,
      pickPosition: 0.14,
      stiffness: 0.07,
      bodyFreqs: [260, 820, 2400],
      attack: 0.003, decay: 0.85, sustain: 0.10, release: 0.25,
      defaultChorus: 35,
      defaultDelay: 25
    };
  },

  // Aplica curvas de automatización MIDI en tiempo real sobre los osciladores/filtros de la nota
  applyNoteAutomation(oscList, filterNode, envNode, baseGain, startBeat, durBeats, secPerBeat, startTime, trackAutomation) {
    if (!trackAutomation || !Array.isArray(trackAutomation) || trackAutomation.length === 0) return;

    const endBeat = startBeat + durBeats;
    trackAutomation.forEach(ev => {
      const evBeat = parseFloat(ev.start_beat);
      if (isNaN(evBeat) || evBeat < startBeat - 2 || evBeat > endBeat + 0.5) return;

      const t = Math.max(startTime, startTime + (evBeat - startBeat) * secPerBeat);

      if (ev.type === 'pitchBend' && ev.value !== undefined) {
        const cents = ((ev.value - 8192) / 8192) * 200;
        oscList.forEach(osc => {
          if (osc && osc.detune) {
            try { osc.detune.linearRampToValueAtTime((osc._baseDetune || 0) + cents, t); } catch (e) {}
          }
        });
      } else if (ev.type === 'cc' && ev.number === 74 && filterNode) {
        const targetFreq = 250 + (ev.value / 127) * 7500;
        try { filterNode.frequency.linearRampToValueAtTime(targetFreq, t); } catch (e) {}
      } else if ((ev.type === 'cc' && ev.number === 11) || ev.type === 'aftertouch') {
        const exprScale = Math.max(0.18, Math.min(1.3, (ev.value || 100) / 100));
        try { envNode.gain.linearRampToValueAtTime(baseGain * exprScale, t); } catch (e) {}
      }
    });
  },

  triggerNote(audioCtx, destNode, freq, startTime, durationSec, velocity, program = 0, autoContext = null) {
    if (startTime < 0 || !isFinite(freq)) return;

    const patch = this.getPatch(program);
    const velNorm = Math.max(0.06, Math.min(1.0, (velocity || 90) / 127));
    const velGain = Math.pow(velNorm, 1.45) * 0.28;

    const atk = Math.min(patch.attack || 0.01, Math.max(0.003, durationSec * 0.45));
    const dec = patch.decay || 0.4;
    const sus = patch.sustain !== undefined ? patch.sustain : 0.45;
    const rel = patch.release || 0.28;
    const stopTime = startTime + durationSec + rel + 0.08;

    // Envolvente maestra de la voz
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(velGain, startTime + atk);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, velGain * sus), startTime + atk + dec);
    env.gain.setValueAtTime(Math.max(0.0002, velGain * sus), startTime + durationSec);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec + rel);
    env.connect(destNode);

    const oscList = [];

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 1: MODELADO FÍSICO KARPLUS-STRONG (Guitarras, Arpa, Pizzicato, Clave)
    // ════════════════════════════════════════════════════════════════
    if (patch.engine === 'karplus_plucked') {
      const ksBuffer = window.MidiWavetables.generatePluckedStringBuffer(audioCtx, freq, durationSec + rel, {
        damping: patch.damping,
        brightness: Math.min(0.85, (patch.brightness || 0.45) * (0.65 + 0.55 * velNorm)),
        pickPosition: patch.pickPosition || 0.18,
        stiffness: patch.stiffness || 0.04
      });

      const src = audioCtx.createBufferSource();
      src.buffer = ksBuffer;

      // Resonancia de caja armónica de madera (Body Formants)
      const bodyFilter = audioCtx.createBiquadFilter();
      bodyFilter.type = 'peaking';
      bodyFilter.frequency.value = (patch.bodyFreqs && patch.bodyFreqs[0]) || 210;
      bodyFilter.Q.value = 2.2;
      bodyFilter.gain.value = 4.5;

      const topFilter = audioCtx.createBiquadFilter();
      topFilter.type = 'lowpass';
      topFilter.frequency.setValueAtTime(2200 + velNorm * 5800, startTime);

      const ksBoost = audioCtx.createGain();
      ksBoost.gain.value = 1.65;

      src.connect(bodyFilter);
      bodyFilter.connect(topFilter);
      topFilter.connect(ksBoost);
      ksBoost.connect(env);

      src.start(startTime);
      src.stop(stopTime);
      oscList.push(src);
      return;
    }

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 2: STEINWAY GRAND PIANO (Wavetables Inarmónicas + Ataque Karplus + Tapa Armónica)
    // ════════════════════════════════════════════════════════════════
    if (patch.engine === 'steinway_grand') {
      const wave = window.MidiWavetables.getAcousticWave(audioCtx, 'grand_piano');
      const B = patch.inharmonicity || 0.0003;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      const cutoff = (patch.filterBase || 3200) + (patch.filterVelScale || 4500) * velNorm;
      filter.frequency.setValueAtTime(Math.min(15000, cutoff), startTime);
      filter.frequency.exponentialRampToValueAtTime(Math.max(600, cutoff * 0.28), startTime + Math.max(0.4, durationSec * 0.9));

      // Resonancia de tapa armónica de abeto
      const soundboard = audioCtx.createBiquadFilter();
      soundboard.type = 'peaking';
      soundboard.frequency.value = 240;
      soundboard.Q.value = 1.5;
      soundboard.gain.value = 3.2;

      filter.connect(soundboard);
      soundboard.connect(env);

      // 3 cuerdas por tecla (Unison Piano Strings) con inarmonicidad real
      const stringDetunes = [-1.8, 0, 1.9];
      stringDetunes.forEach((dt, idx) => {
        const osc = audioCtx.createOscillator();
        const sGain = audioCtx.createGain();
        osc.setPeriodicWave(wave);

        const inharmRatio = Math.sqrt(1 + B * (idx + 1) * (idx + 1));
        osc.frequency.setValueAtTime(freq * inharmRatio, startTime);
        osc._baseDetune = dt;
        osc.detune.setValueAtTime(dt, startTime);

        sGain.gain.value = 0.42;
        osc.connect(sGain);
        sGain.connect(filter);
        osc.start(startTime);
        osc.stop(stopTime);
        oscList.push(osc);
      });

      // Ataque físico de cuerda golpeada por martillo de fieltro (Karplus corto)
      const hammerKs = window.MidiWavetables.generatePluckedStringBuffer(audioCtx, freq, 0.25, {
        damping: 0.988,
        brightness: 0.35 + velNorm * 0.4,
        pickPosition: 0.12
      });
      const hSrc = audioCtx.createBufferSource();
      hSrc.buffer = hammerKs;
      const hGain = audioCtx.createGain();
      hGain.gain.setValueAtTime(0.65 * velNorm, startTime);
      hGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
      hSrc.connect(hGain);
      hGain.connect(filter);
      hSrc.start(startTime);
      hSrc.stop(startTime + 0.22);

      if (autoContext && autoContext.automation) {
        this.applyNoteAutomation(oscList, filter, env, velGain, autoContext.startBeat, autoContext.durBeats, autoContext.secPerBeat, startTime, autoContext.automation);
      }
      return;
    }

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 3: BAJO ACÚSTICO / ELÉCTRICO / SYNTH SUB-BASS
    // ════════════════════════════════════════════════════════════════
    if (patch.engine === 'acoustic_electric_bass' || patch.engine === 'analog_sub_bass') {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = patch.filterQ || 2.0;
      const fStart = (patch.filterStart || 2200) * (0.5 + 0.5 * velNorm);
      filter.frequency.setValueAtTime(fStart, startTime);
      filter.frequency.exponentialRampToValueAtTime(patch.filterEnd || 280, startTime + (patch.filterDecay || 0.18));
      filter.connect(env);

      // Cuerpo fundamental + Sub-octava sólida
      const mainOsc = audioCtx.createOscillator();
      const subOsc = audioCtx.createOscillator();
      mainOsc.setPeriodicWave(window.MidiWavetables.getAcousticWave(audioCtx, 'brass_horn'));
      subOsc.type = 'sine';

      mainOsc.frequency.setValueAtTime(freq, startTime);
      subOsc.frequency.setValueAtTime(freq, startTime);

      const mGain = audioCtx.createGain();
      const sGain = audioCtx.createGain();
      mGain.gain.value = 0.70;
      sGain.gain.value = patch.subLevel || 0.65;

      mainOsc.connect(mGain);
      subOsc.connect(sGain);
      mGain.connect(filter);
      sGain.connect(filter);

      mainOsc.start(startTime);
      subOsc.start(startTime);
      mainOsc.stop(stopTime);
      subOsc.stop(stopTime);
      oscList.push(mainOsc, subOsc);

      // Ataque de cuerda pulsada Karplus-Strong para definición de dedos/púa
      if (patch.engine === 'acoustic_electric_bass') {
        const ksAttack = window.MidiWavetables.generatePluckedStringBuffer(audioCtx, freq, 0.35, {
          damping: 0.995,
          brightness: patch.brightness || 0.42,
          pickPosition: 0.20
        });
        const ksSrc = audioCtx.createBufferSource();
        ksSrc.buffer = ksAttack;
        const ksG = audioCtx.createGain();
        ksG.gain.value = 0.85;
        ksSrc.connect(ksG);
        ksG.connect(filter);
        ksSrc.start(startTime);
        ksSrc.stop(startTime + 0.32);
      }
      return;
    }

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 4: GUITARRA ELÉCTRICA LEAD / OVERDRIVE CON SIMULADOR DE AMPLIFICADOR
    // ════════════════════════════════════════════════════════════════
    if (patch.engine === 'electric_lead_guitar') {
      const ksBuf = window.MidiWavetables.generatePluckedStringBuffer(audioCtx, freq, durationSec + rel, {
        damping: 0.9982,
        brightness: 0.72,
        pickPosition: 0.14
      });
      const ksSrc = audioCtx.createBufferSource();
      ksSrc.buffer = ksBuf;

      // Sustain Osc con Vibrato expresivo
      const susOsc = audioCtx.createOscillator();
      susOsc.setPeriodicWave(window.MidiWavetables.getAcousticWave(audioCtx, 'violin_bow'));
      susOsc.frequency.setValueAtTime(freq, startTime);

      const lfo = audioCtx.createOscillator();
      const lfoG = audioCtx.createGain();
      lfo.frequency.value = patch.vibratoRate || 5.5;
      lfoG.gain.setValueAtTime(0.01, startTime);
      lfoG.gain.linearRampToValueAtTime(patch.vibratoDepth || 14, startTime + 0.25);
      lfo.connect(lfoG);
      lfoG.connect(susOsc.detune);
      lfo.start(startTime);
      lfo.stop(stopTime);

      // Etapa de Overdrive Analógico + Simulación de Altavoz Celestion 4x12 (Bandpass + Lowpass 3.8kHz)
      const shaper = audioCtx.createWaveShaper();
      shaper.curve = window.MidiFX ? window.MidiFX.getAnalogTapeCurve() : null;

      const cabHP = audioCtx.createBiquadFilter();
      cabHP.type = 'highpass';
      cabHP.frequency.value = 110;

      const cabPeak = audioCtx.createBiquadFilter();
      cabPeak.type = 'peaking';
      cabPeak.frequency.value = 2100;
      cabPeak.Q.value = 1.8;
      cabPeak.gain.value = 4.5;

      const cabLP = audioCtx.createBiquadFilter();
      cabLP.type = 'lowpass';
      cabLP.frequency.value = 3900;

      const driveGain = audioCtx.createGain();
      driveGain.gain.value = patch.drive || 4.0;

      const postDrive = audioCtx.createGain();
      postDrive.gain.value = 0.35;

      ksSrc.connect(driveGain);
      susOsc.connect(driveGain);
      driveGain.connect(shaper);
      shaper.connect(cabHP);
      cabHP.connect(cabPeak);
      cabPeak.connect(cabLP);
      cabLP.connect(postDrive);
      postDrive.connect(env);

      ksSrc.start(startTime);
      susOsc.start(startTime);
      ksSrc.stop(stopTime);
      susOsc.stop(stopTime);
      oscList.push(susOsc);
      return;
    }

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 5: FM ELÉCTRICO & PERCUSIÓN CROMÁTICA (Rhodes, Vibráfono, Marimba)
    // ════════════════════════════════════════════════════════════════
    if (patch.engine === 'fm_epiano' || patch.engine === 'fm_mallet') {
      const carrier = audioCtx.createOscillator();
      const carrier2 = audioCtx.createOscillator();
      const mod = audioCtx.createOscillator();
      const modGain = audioCtx.createGain();

      const customWave = window.MidiWavetables.getAcousticWave(audioCtx, patch.waveType || 'epiano_tine');
      carrier.setPeriodicWave(customWave);
      carrier2.type = 'sine';
      mod.type = 'sine';

      carrier.frequency.setValueAtTime(freq, startTime);
      carrier2.frequency.setValueAtTime(freq, startTime);
      carrier2._baseDetune = 5;
      carrier2.detune.setValueAtTime(5, startTime);

      mod.frequency.setValueAtTime(freq * (patch.modRatio || 3.0), startTime);
      const mIdx = (patch.modIndex || 130) * velNorm;
      modGain.gain.setValueAtTime(mIdx, startTime);
      modGain.gain.exponentialRampToValueAtTime(Math.max(1, mIdx * 0.05), startTime + (patch.modDecay || 0.4));

      mod.connect(modGain);
      modGain.connect(carrier.frequency);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime((patch.filterBase || 3800) + (patch.filterVelScale || 2400) * velNorm, startTime);

      carrier.connect(filter);
      carrier2.connect(filter);
      filter.connect(env);

      mod.start(startTime);
      carrier.start(startTime);
      carrier2.start(startTime);
      mod.stop(stopTime);
      carrier.stop(stopTime);
      carrier2.stop(stopTime);
      oscList.push(carrier, carrier2);
      return;
    }

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 6: CORO SINFÓNICO CON FILTROS DE FORMANTES VOCALES
    // ════════════════════════════════════════════════════════════════
    if (patch.engine === 'formant_choir') {
      const wave = window.MidiWavetables.getAcousticWave(audioCtx, 'choir_voice');
      const sourceBus = audioCtx.createGain();
      sourceBus.gain.value = 0.55;

      const detunes = [-11, -4, 4, 12];
      detunes.forEach(dt => {
        const osc = audioCtx.createOscillator();
        osc.setPeriodicWave(wave);
        osc.frequency.setValueAtTime(freq, startTime);
        osc._baseDetune = dt;
        osc.detune.setValueAtTime(dt, startTime);
        osc.connect(sourceBus);
        osc.start(startTime);
        osc.stop(stopTime);
        oscList.push(osc);
      });

      // Banco paralelo de 3 filtros resonantes que modelan el tracto vocal humano
      patch.formants.forEach(f => {
        const bp = audioCtx.createBiquadFilter();
        const fg = audioCtx.createGain();
        bp.type = 'bandpass';
        bp.frequency.value = f.freq;
        bp.Q.value = f.Q;
        fg.gain.value = f.gain;
        sourceBus.connect(bp);
        bp.connect(fg);
        fg.connect(env);
      });
      return;
    }

    // ════════════════════════════════════════════════════════════════
    //  MOTOR 7: CUERDAS SINFÓNICAS, METALES, VIENTOS MADERA Y ÓRGANOS
    //  (Wavetables Acústicas + Unísono Estéreo + Resonancia de Cuerpo + Vibrato LFO)
    // ════════════════════════════════════════════════════════════════
    const wave = window.MidiWavetables.getAcousticWave(audioCtx, patch.waveType || 'violin_bow');
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = patch.filterQ || 1.0;

    if (patch.engine === 'symphonic_brass') {
      const fPeak = (patch.filterPeak || 4800) * (0.45 + 0.55 * velNorm);
      filter.frequency.setValueAtTime(patch.filterStart || 580, startTime);
      filter.frequency.linearRampToValueAtTime(fPeak, startTime + atk * 1.4);
      filter.frequency.exponentialRampToValueAtTime(patch.filterSustain || 2400, startTime + atk * 1.4 + dec);
    } else {
      const cutoff = (patch.filterBase || 3400) + (patch.filterVelScale || 2200) * velNorm;
      filter.frequency.setValueAtTime(Math.min(14000, cutoff), startTime);
    }

    // Resonador de cuerpo acústico (madera de violín / tubo de viento)
    const bodyResonator = audioCtx.createBiquadFilter();
    bodyResonator.type = 'peaking';
    bodyResonator.frequency.value = (patch.bodyFormants && patch.bodyFormants[1]) || 1150;
    bodyResonator.Q.value = 1.6;
    bodyResonator.gain.value = 3.2;

    filter.connect(bodyResonator);
    bodyResonator.connect(env);

    // Vibrato LFO natural con entrada progresiva
    let lfoGain = null;
    if (patch.vibratoRate && patch.vibratoDepth) {
      const lfo = audioCtx.createOscillator();
      lfoGain = audioCtx.createGain();
      lfo.frequency.setValueAtTime(patch.vibratoRate, startTime);
      const vDelay = patch.vibratoDelay || 0.18;
      lfoGain.gain.setValueAtTime(0.001, startTime);
      lfoGain.gain.linearRampToValueAtTime(patch.vibratoDepth, startTime + vDelay + 0.20);
      lfo.connect(lfoGain);
      lfo.start(startTime);
      lfo.stop(stopTime);
    }

    const numVoices = patch.voices || 3;
    const spread = patch.detuneSpread || 8;
    for (let i = 0; i < numVoices; i++) {
      const normPos = numVoices > 1 ? (i / (numVoices - 1)) * 2 - 1 : 0;
      const dt = normPos * spread;

      const osc = audioCtx.createOscillator();
      const vGain = audioCtx.createGain();
      osc.setPeriodicWave(wave);
      osc.frequency.setValueAtTime(freq, startTime);
      osc._baseDetune = dt;
      osc.detune.setValueAtTime(dt, startTime);

      if (lfoGain) lfoGain.connect(osc.detune);

      vGain.gain.value = (1 / numVoices) * 0.85;
      osc.connect(vGain);
      vGain.connect(filter);
      osc.start(startTime);
      osc.stop(stopTime);
      oscList.push(osc);
    }

    // Sub-octava para órganos de catedral
    if (patch.subOctave) {
      const sub = audioCtx.createOscillator();
      const sg = audioCtx.createGain();
      sub.setPeriodicWave(wave);
      sub.frequency.setValueAtTime(freq * 0.5, startTime);
      sg.gain.value = patch.subOctave * 0.35;
      sub.connect(sg);
      sg.connect(filter);
      sub.start(startTime);
      sub.stop(stopTime);
      oscList.push(sub);
    }

    // Fricción de arco con resina (cuerdas) o columna de aire (flautas y maderas)
    const airLevel = patch.breathNoise || patch.rosinNoise || 0;
    if (airLevel > 0) {
      const nSrc = audioCtx.createBufferSource();
      nSrc.buffer = this.getNoiseBuffer(audioCtx);
      nSrc.loop = true;
      const nFilt = audioCtx.createBiquadFilter();
      nFilt.type = 'bandpass';
      nFilt.frequency.setValueAtTime(Math.min(4800, freq * 2.5), startTime);
      nFilt.Q.value = 3.0;
      const nGain = audioCtx.createGain();
      nGain.gain.value = airLevel * 0.28;
      nSrc.connect(nFilt);
      nFilt.connect(nGain);
      nGain.connect(filter);
      nSrc.start(startTime);
      nSrc.stop(stopTime);
    }

    if (autoContext && autoContext.automation) {
      this.applyNoteAutomation(
        oscList,
        filter,
        env,
        velGain,
        autoContext.startBeat,
        autoContext.durBeats,
        autoContext.secPerBeat,
        startTime,
        autoContext.automation
      );
    }
  }
};