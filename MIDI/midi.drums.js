// ════════════════════════════════════════════════════════════════
//  STUDIO ACOUSTIC DRUMKIT & PERCUSSION ENGINE (midi.drums.js)
// ════════════════════════════════════════════════════════════════

window.MidiDrums = {
  sampleCache: new WeakMap(),

  getCtxCache(audioCtx) {
    if (!this.sampleCache.has(audioCtx)) {
      this.sampleCache.set(audioCtx, {});
    }
    return this.sampleCache.get(audioCtx);
  },

  // Pre-sintetiza buffers PCM de alta definición para cada pieza de la batería (evita sobrecarga de nodos y suena a estudio real)
  getDrumBuffer(audioCtx, type) {
    const cache = this.getCtxCache(audioCtx);
    if (cache[type]) return cache[type];

    const sr = audioCtx.sampleRate;
    let buf = null;

    // 1. BOMBO DE ESTUDIO (Punchy Sub + Beater Click + Compresión de Parche)
    if (type === 'kick_36' || type === 'kick_35') {
      const dur = 0.45;
      const len = Math.floor(sr * dur);
      buf = audioCtx.createBuffer(1, len, sr);
      const out = buf.getChannelData(0);

      let phase = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        // Caída exponencial doble de frecuencia (de 165Hz a 46Hz en 35ms, luego a 34Hz)
        const freq = 34 + 125 * Math.exp(-t * 48) + 22 * Math.exp(-t * 8);
        phase += (2 * Math.PI * freq) / sr;

        const subBody = Math.sin(phase) * Math.exp(-t * 7.5);
        const punchHarmonic = Math.sin(phase * 2) * 0.25 * Math.exp(-t * 22);
        const beaterClick = (Math.random() * 2 - 1) * Math.exp(-t * 140) * 0.45;

        out[i] = Math.tanh((subBody + punchHarmonic + beaterClick) * 1.55);
      }
    }

    // 2. CAJA ACÚSTICA DE ESTUDIO (2 Modos de Parche + Bordona Metálica + Impacto de Baqueta)
    else if (type === 'snare_38' || type === 'snare_40') {
      const dur = 0.34;
      const len = Math.floor(sr * dur);
      buf = audioCtx.createBuffer(1, len, sr);
      const out = buf.getChannelData(0);

      let p1 = 0, p2 = 0;
      let bpState = 0;
      const fBase = type === 'snare_40' ? 215 : 185;

      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const f1 = fBase + 85 * Math.exp(-t * 45);
        const f2 = fBase * 1.58 + 60 * Math.exp(-t * 40); // Modo circular de membrana Bessel
        p1 += (2 * Math.PI * f1) / sr;
        p2 += (2 * Math.PI * f2) / sr;

        const shell = (Math.sin(p1) * 0.65 + Math.sin(p2) * 0.35) * Math.exp(-t * 16);

        // Bordona de alambre con envolvente de doble etapa
        const white = Math.random() * 2 - 1;
        bpState = 0.68 * bpState + 0.32 * white;
        const wires = (white - bpState * 0.5) * Math.exp(-t * (type === 'snare_40' ? 10.5 : 13.0)) * 0.78;

        const rimTransient = Math.sin(t * 2800) * Math.exp(-t * 110) * 0.4;
        out[i] = Math.tanh((shell + wires + rimTransient) * 1.4);
      }
    }

    // 3. HI-HATS & PLATOS BRONCE B20 (Matriz de 12 Parciales FM Inarmónicos + Brillo de Aire)
    else if (type === 'chh' || type === 'ohh' || type === 'crash' || type === 'ride') {
      const dur = type === 'chh' ? 0.085 : (type === 'ohh' ? 0.46 : (type === 'ride' ? 0.85 : 1.45));
      const len = Math.floor(sr * dur);
      buf = audioCtx.createBuffer(1, len, sr);
      const out = buf.getChannelData(0);

      // Frecuencias modales de aleación de bronce B20
      const modes = [318, 436, 587, 742, 965, 1245, 1680, 2240, 3120, 4480, 6150, 8420];
      const phases = new Float32Array(modes.length);
      const decayRate = type === 'chh' ? 48 : (type === 'ohh' ? 7.5 : (type === 'ride' ? 4.2 : 2.6));

      let hpPrev = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        let metalSum = 0;
        for (let m = 0; m < modes.length; m++) {
          const fmMod = Math.sin(t * modes[(m + 3) % modes.length] * 2 * Math.PI) * 18;
          phases[m] += (2 * Math.PI * (modes[m] + fmMod)) / sr;
          metalSum += Math.sin(phases[m]) * (m > 5 ? 0.14 : 0.08);
        }

        const shimmerNoise = (Math.random() * 2 - 1) * 0.55;
        const raw = (metalSum + shimmerNoise);
        const highpassed = raw - hpPrev * 0.82;
        hpPrev = raw;

        // Campana definida para el plato Ride
        const bellPing = type === 'ride' ? Math.sin(2 * Math.PI * 528 * t) * Math.exp(-t * 9) * 0.35 : 0;
        const env = Math.exp(-t * decayRate);

        out[i] = Math.tanh((highpassed * env + bellPing) * 1.15);
      }
    }

    cache[type] = buf;
    return buf;
  },

  triggerDrum(audioCtx, destNode, midiNote, startTime, velocity = 100) {
    if (startTime < 0) return;
    const vel = Math.max(0.08, Math.min(1.0, (velocity || 100) / 127));
    const gainVal = Math.pow(vel, 1.3) * 0.52;

    const playBuf = (type, rate = 1.0, scale = 1.0) => {
      const buf = this.getDrumBuffer(audioCtx, type);
      if (!buf) return;
      const src = audioCtx.createBufferSource();
      const g = audioCtx.createGain();
      src.buffer = buf;
      src.playbackRate.setValueAtTime(rate, startTime);
      g.gain.setValueAtTime(gainVal * scale, startTime);
      src.connect(g);
      g.connect(destNode);
      src.start(startTime);
    };

    // Kick (35, 36)
    if (midiNote === 35 || midiNote === 36) {
      playBuf(midiNote === 36 ? 'kick_36' : 'kick_35', 1.0, 1.35);
      return;
    }

    // Snare (38, 40)
    if (midiNote === 38 || midiNote === 40) {
      playBuf(midiNote === 40 ? 'snare_40' : 'snare_38', 0.98 + vel * 0.04, 1.15);
      return;
    }

    // Closed / Pedal Hi-Hat (42, 44)
    if (midiNote === 42 || midiNote === 44) {
      playBuf('chh', midiNote === 44 ? 0.92 : 1.02, 0.72);
      return;
    }

    // Open Hi-Hat (46)
    if (midiNote === 46) {
      playBuf('ohh', 1.0, 0.75);
      return;
    }

    // Crash Cymbals (49, 52, 55, 57)
    if ([49, 52, 55, 57].includes(midiNote)) {
      const rate = midiNote === 57 ? 1.08 : (midiNote === 55 ? 1.18 : 1.0);
      playBuf('crash', rate, 0.78);
      return;
    }

    // Ride Cymbals (51, 53, 59)
    if ([51, 53, 59].includes(midiNote)) {
      playBuf('ride', midiNote === 53 ? 1.12 : 1.0, 0.75);
      return;
    }

    // Toms Acústicos (41, 43, 45, 47, 48, 50)
    if ([41, 43, 45, 47, 48, 50].includes(midiNote)) {
      const tomMap = { 41: 0.58, 43: 0.70, 45: 0.84, 47: 0.98, 48: 1.14, 50: 1.32 };
      playBuf('kick_36', tomMap[midiNote] || 0.9, 1.05);
      return;
    }

    // Rimshot / Clap / Percusión Auxiliar
    playBuf('snare_38', 1.35, 0.65);
  }
};