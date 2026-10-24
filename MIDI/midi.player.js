// ════════════════════════════════════════════════════════════════
//  MIDI PLAYER, HUMANIZER, CANVAS VISUALIZER & WAV RENDERER (midi.player.js)
// ════════════════════════════════════════════════════════════════

window.MidiPlayer = {
  activeInstances: {},

  noteToFreq(noteStr) {
    if (!noteStr || typeof noteStr !== 'string') return 440;
    const notes = { 'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11 };
    const match = noteStr.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
    if (!match) return 440;
    const semitone = notes[match[1]];
    const octave = parseInt(match[2], 10);
    const midi = (octave + 1) * 12 + semitone;
    return 440 * Math.pow(2, (midi - 69) / 12);
  },

  noteToMidi(noteStr) {
    if (typeof noteStr === 'number') return noteStr;
    if (!noteStr || typeof noteStr !== 'string') return 60;
    const notes = { 'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5, 'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11 };
    const match = noteStr.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
    if (!match) {
      const asNum = parseInt(noteStr, 10);
      return !isNaN(asNum) ? asNum : 60;
    }
    return (parseInt(match[2], 10) + 1) * 12 + notes[match[1]];
  },

  durationToBeats(dur) {
    if (typeof dur === 'number') return dur;
    if (!dur) return 1;
    const d = String(dur).trim();
    const map = {
      '1': 4, 'd1': 6, '2': 2, 'd2': 3, '4': 1, 'd4': 1.5,
      '8': 0.5, 'd8': 0.75, '16': 0.25, 'd16': 0.375,
      '32': 0.125, '4t': 0.666, '8t': 0.333, '16t': 0.166
    };
    if (map[d]) return map[d];
    const parsed = parseFloat(d);
    return !isNaN(parsed) && parsed > 0 ? (4 / parsed) : 1;
  },

  getTotalBeats(song) {
    if (!song || !song.tracks) return 16;
    let maxBeat = 0;
    song.tracks.forEach(t => {
      if (t.notes && Array.isArray(t.notes)) {
        t.notes.forEach(n => {
          const end = (parseFloat(n.start_beat) || 0) + this.durationToBeats(n.duration);
          if (end > maxBeat) maxBeat = end;
        });
      }
    });
    return Math.max(maxBeat, 4);
  },

  // Programa todas las pistas aplicando Humanización Interpretativa (Strumming de acordes, acentos de compás y Bus FX completo)
  scheduleSongToContext(audioCtx, destinationNode, song, offsetBeats = 0, mutedTracks = {}) {
    const bpm = song.bpm || 120;
    const secPerBeat = 60 / bpm;
    const totalBeats = this.getTotalBeats(song);
    const totalDurationSec = ((totalBeats - offsetBeats) * secPerBeat) + 4;
    const now = audioCtx.currentTime + 0.06;

    // Crear Consola Maestra de Estudio (Dry + Chorus Estéreo + Delay Ping-Pong + Reverb Convolutiva + Masterizador)
    const studioBus = window.MidiFX
      ? window.MidiFX.createMasterStudioBus(audioCtx, destinationNode, bpm, Math.max(10, totalDurationSec))
      : { dryBus: destinationNode };

    song.tracks.forEach((track, tIdx) => {
      if (mutedTracks[tIdx]) return;
      const channel = track.channel !== undefined ? track.channel : ((tIdx % 16) + 1);
      const program = track.program !== undefined ? track.program : 0;
      const patch = window.MidiInstruments ? window.MidiInstruments.getPatch(program) : {};

      const trackVol = (track.volume !== undefined ? track.volume : 100) / 100;
      const pan = track.pan !== undefined ? track.pan : 64;
      const reverb = track.reverb !== undefined ? track.reverb : (channel === 10 ? 25 : 48);
      const chorus = track.chorus !== undefined ? track.chorus : (channel === 10 ? 0 : (patch.defaultChorus || 28));
      const delaySend = channel === 10 ? 5 : (patch.defaultDelay || 18);
      const sustainPedal = track.sustain !== undefined ? !!track.sustain : (program <= 7);

      const strip = window.MidiFX
        ? window.MidiFX.createTrackChannelStrip(audioCtx, studioBus, pan, reverb, chorus, delaySend)
        : { input: destinationNode };

      // Automatizaciones de pista para Volumen (CC7) y Paneo (CC10)
      if (track.automation && Array.isArray(track.automation)) {
        track.automation.forEach(auto => {
          const autoBeat = parseFloat(auto.start_beat) || 0;
          if (autoBeat < offsetBeats) return;
          const t = now + (autoBeat - offsetBeats) * secPerBeat;
          if ((auto.type === 'volume' || (auto.type === 'cc' && auto.number === 7)) && strip.input) {
            const v = Math.max(0, Math.min(1.35, (auto.value || 100) / 100));
            try { strip.input.gain.linearRampToValueAtTime(v, t); } catch (e) {}
          } else if ((auto.type === 'pan' || (auto.type === 'cc' && auto.number === 10)) && strip.panner) {
            const p = Math.max(-1, Math.min(1, ((auto.value || 64) - 64) / 64));
            try { strip.panner.pan.linearRampToValueAtTime(p, t); } catch (e) {}
          }
        });
      }

      if (!track.notes || !Array.isArray(track.notes)) return;

      // Determinar si el instrumento se rasguea/arpegia naturalmente en los acordes (Guitarras, Arpa, Pianos)
      const isStrummedInstrument = (program >= 24 && program <= 31) || program === 46 || program <= 7;
      const strumSpreadSec = (program >= 24 && program <= 31) ? 0.016 : (program === 46 ? 0.022 : 0.008);

      track.notes.forEach((n, nIdx) => {
        const noteStartBeat = parseFloat(n.start_beat) || 0;
        if (noteStartBeat < offsetBeats) return;

        const relBeats = noteStartBeat - offsetBeats;
        const baseStartTime = now + relBeats * secPerBeat;
        const durBeats = this.durationToBeats(n.duration);
        const rawDurSec = Math.max(0.05, durBeats * secPerBeat);
        const durSec = sustainPedal ? rawDurSec * 1.48 : rawDurSec * 1.08; // Ligero legato natural

        // Acento métrico natural (los tiempos 1 y 3 del compás tienen un 6% más de peso orgánico)
        const beatInBar = noteStartBeat % 4;
        const metricAccent = (Math.abs(beatInBar) < 0.05) ? 1.07 : (Math.abs(beatInBar - 2) < 0.05 ? 1.03 : 0.98);
        const baseVel = (n.velocity || 90) * trackVol * metricAccent;

        const rawPitches = Array.isArray(n.note) ? n.note : [n.note];
        // Ordenamos las notas del acorde de grave a agudo para un rasgueo y conducción de voces realistas
        const sortedPitches = [...rawPitches].filter(Boolean).sort((a, b) => this.noteToMidi(a) - this.noteToMidi(b));

        sortedPitches.forEach((pStr, chordIdx) => {
          // Micro-humanización determinista (sin perder el groove) + Strumming en acordes
          const microHumanOffset = ((nIdx * 7 + chordIdx * 13) % 5) * 0.0012;
          const chordStrumOffset = (sortedPitches.length > 1 && isStrummedInstrument && channel !== 10)
            ? chordIdx * strumSpreadSec
            : 0;

          const startTime = baseStartTime + microHumanOffset + chordStrumOffset;

          // En los acordes, la voz superior (melodía/top note) y el bajo suenan ligeramente más definidos que las voces internas
          let voiceWeight = 1.0;
          if (sortedPitches.length > 2) {
            if (chordIdx === sortedPitches.length - 1) voiceWeight = 1.08;
            else if (chordIdx === 0) voiceWeight = 1.04;
            else voiceWeight = 0.90;
          }
          const finalVel = Math.min(127, Math.max(1, Math.round(baseVel * voiceWeight)));

          if (channel === 10 && window.MidiDrums) {
            const midiNum = this.noteToMidi(pStr);
            window.MidiDrums.triggerDrum(audioCtx, strip.input, midiNum, baseStartTime, finalVel);
          } else if (window.MidiInstruments) {
            const freq = this.noteToFreq(pStr);
            window.MidiInstruments.triggerNote(audioCtx, strip.input, freq, startTime, durSec, finalVel, program, {
              startBeat: noteStartBeat,
              durBeats,
              secPerBeat,
              automation: track.automation
            });
          }
        });
      });
    });
  },

  play(msgId, songData) {
    this.stopAll();
    if (!songData || !songData.tracks) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContextClass();

    const prevInstance = this.activeInstances[msgId];
    const startOffsetBeat = prevInstance && prevInstance.pausedBeat ? prevInstance.pausedBeat : 0;
    const mutedTracks = prevInstance && prevInstance.mutedTracks ? prevInstance.mutedTracks : {};

    const bpm = songData.bpm || 120;
    const totalBeats = this.getTotalBeats(songData);

    this.scheduleSongToContext(ctx, ctx.destination, songData, startOffsetBeat, mutedTracks);

    const instance = {
      ctx,
      songData,
      isPlaying: true,
      bpm,
      totalBeats,
      startWallTime: performance.now(),
      startOffsetBeat,
      pausedBeat: startOffsetBeat,
      mutedTracks,
      rafId: null
    };

    this.activeInstances[msgId] = instance;
    this.updatePlayButtonUI(msgId, true);

    const tick = () => {
      if (!instance.isPlaying) return;
      const elapsedSec = (performance.now() - instance.startWallTime) / 1000;
      const currentBeat = instance.startOffsetBeat + elapsedSec * (instance.bpm / 60);
      instance.pausedBeat = currentBeat;

      this.drawPianoRoll(msgId, songData, currentBeat, instance.totalBeats, instance.mutedTracks);
      this.updateTimeUI(msgId, currentBeat, instance.totalBeats, instance.bpm);

      if (currentBeat >= instance.totalBeats) {
        this.stop(msgId, true);
        return;
      }
      instance.rafId = requestAnimationFrame(tick);
    };

    instance.rafId = requestAnimationFrame(tick);
  },

  pause(msgId) {
    const inst = this.activeInstances[msgId];
    if (!inst || !inst.isPlaying) return;
    inst.isPlaying = false;
    if (inst.rafId) cancelAnimationFrame(inst.rafId);
    if (inst.ctx) {
      try { inst.ctx.close(); } catch (e) {}
    }
    this.updatePlayButtonUI(msgId, false);
  },

  stop(msgId, resetToZero = true) {
    const inst = this.activeInstances[msgId];
    if (inst) {
      inst.isPlaying = false;
      if (inst.rafId) cancelAnimationFrame(inst.rafId);
      if (inst.ctx) {
        try { inst.ctx.close(); } catch (e) {}
      }
      if (resetToZero) inst.pausedBeat = 0;
      this.drawPianoRoll(msgId, inst.songData, inst.pausedBeat, inst.totalBeats, inst.mutedTracks);
      this.updateTimeUI(msgId, inst.pausedBeat, inst.totalBeats, inst.bpm);
    }
    this.updatePlayButtonUI(msgId, false);
  },

  stopAll() {
    Object.keys(this.activeInstances).forEach(id => {
      if (this.activeInstances[id]?.isPlaying) {
        this.pause(id);
      }
    });
  },

  seek(msgId, songData, targetBeat) {
    let inst = this.activeInstances[msgId];
    const wasPlaying = inst && inst.isPlaying;
    if (wasPlaying) this.pause(msgId);

    if (!inst) {
      inst = {
        songData,
        isPlaying: false,
        bpm: songData.bpm || 120,
        totalBeats: this.getTotalBeats(songData),
        pausedBeat: targetBeat,
        mutedTracks: {}
      };
      this.activeInstances[msgId] = inst;
    } else {
      inst.pausedBeat = targetBeat;
    }

    this.drawPianoRoll(msgId, songData, targetBeat, inst.totalBeats, inst.mutedTracks);
    this.updateTimeUI(msgId, targetBeat, inst.totalBeats, inst.bpm);

    if (wasPlaying) {
      this.play(msgId, songData);
    }
  },

  toggleTrackMute(msgId, songData, trackIdx) {
    let inst = this.activeInstances[msgId];
    if (!inst) {
      inst = {
        songData,
        isPlaying: false,
        bpm: songData.bpm || 120,
        totalBeats: this.getTotalBeats(songData),
        pausedBeat: 0,
        mutedTracks: {}
      };
      this.activeInstances[msgId] = inst;
    }
    inst.mutedTracks[trackIdx] = !inst.mutedTracks[trackIdx];
    const wasPlaying = inst.isPlaying;
    if (wasPlaying) {
      this.pause(msgId);
      this.play(msgId, songData);
    } else {
      this.drawPianoRoll(msgId, songData, inst.pausedBeat || 0, inst.totalBeats, inst.mutedTracks);
    }
    return inst.mutedTracks[trackIdx];
  },

  updatePlayButtonUI(msgId, isPlaying) {
    const btn = document.querySelector(`#player-${msgId} .midi-play-btn`);
    if (btn) {
      btn.innerHTML = isPlaying ? '⏸ Pausar' : '▶ Escuchar MIDI';
      btn.classList.toggle('playing', isPlaying);
    }
  },

  updateTimeUI(msgId, currentBeat, totalBeats, bpm) {
    const timeEl = document.querySelector(`#player-${msgId} .midi-time-readout`);
    if (!timeEl) return;
    const curSec = Math.max(0, Math.floor((currentBeat / bpm) * 60));
    const totSec = Math.max(0, Math.floor((totalBeats / bpm) * 60));
    const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    timeEl.textContent = `${fmt(curSec)} / ${fmt(totSec)}  ·  Beat ${Math.floor(currentBeat)}/${Math.ceil(totalBeats)}  ·  ${bpm} BPM`;
  },

  drawPianoRoll(msgId, songData, playheadBeat = 0, totalBeats = null, mutedTracks = {}) {
    const canvas = document.querySelector(`#player-${msgId} .midi-canvas`);
    if (!canvas || !songData || !songData.tracks) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const maxBeats = totalBeats || this.getTotalBeats(songData);

    ctx.fillStyle = '#101216';
    ctx.fillRect(0, 0, W, H);

    for (let b = 0; b <= maxBeats; b += 4) {
      const x = (b / maxBeats) * W;
      ctx.strokeStyle = (b % 32 === 0) ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = (b % 32 === 0) ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];
    const minMidi = 24;
    const maxMidi = 96;

    songData.tracks.forEach((track, tIdx) => {
      if (mutedTracks[tIdx]) return;
      const color = track.channel === 10 ? '#f97316' : palette[tIdx % palette.length];
      if (!track.notes || !Array.isArray(track.notes)) return;

      track.notes.forEach(n => {
        const sb = parseFloat(n.start_beat) || 0;
        const db = this.durationToBeats(n.duration);
        const x = (sb / maxBeats) * W;
        const w = Math.max(2, (db / maxBeats) * W);

        const pitches = Array.isArray(n.note) ? n.note : [n.note];
        pitches.forEach(pStr => {
          const m = Math.max(minMidi, Math.min(maxMidi, this.noteToMidi(pStr)));
          const normY = 1 - ((m - minMidi) / (maxMidi - minMidi));
          const y = normY * (H - 12) + 4;

          const isActive = playheadBeat >= sb && playheadBeat <= (sb + db);
          ctx.fillStyle = isActive ? '#ffffff' : color;
          ctx.globalAlpha = isActive ? 1.0 : 0.82;
          ctx.fillRect(x, y, w, 4);
        });
      });
    });

    ctx.globalAlpha = 1.0;

    const px = Math.min(W, Math.max(0, (playheadBeat / maxBeats) * W));
    ctx.strokeStyle = '#ff3b30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, H);
    ctx.stroke();
  },

  async exportToWav(songData, buttonEl = null) {
    if (!songData || !songData.tracks) return;
    const originalText = buttonEl ? buttonEl.innerHTML : '';
    if (buttonEl) {
      buttonEl.disabled = true;
      buttonEl.innerHTML = '⏳ Masterizando WAV HD...';
    }

    try {
      const bpm = songData.bpm || 120;
      const totalBeats = this.getTotalBeats(songData);
      const durationSec = Math.ceil((totalBeats / bpm) * 60) + 4.0;
      const sampleRate = 44100;

      const offlineCtx = new OfflineAudioContext(2, Math.floor(sampleRate * durationSec), sampleRate);
      this.scheduleSongToContext(offlineCtx, offlineCtx.destination, songData, 0, {});

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = this.audioBufferToWavBlob(renderedBuffer);

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (songData.title || 'Silenos_Composicion').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}_${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando WAV:', err);
      alert('Error renderizando audio WAV: ' + err.message);
    } finally {
      if (buttonEl) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = originalText;
      }
    }
  },

  audioBufferToWavBlob(buffer) {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const out = new ArrayBuffer(length);
    const view = new DataView(out);
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    const setUint16 = data => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = data => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (let i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }

    return new Blob([out], { type: 'audio/wav' });
  },

  saveToLibrary(item) {
    if (!state.midiLibrary) state.midiLibrary = [];
    const existingIdx = state.midiLibrary.findIndex(x => x.id === item.id);
    if (existingIdx !== -1) {
      state.midiLibrary[existingIdx] = item;
    } else {
      state.midiLibrary.unshift(item);
    }
    if (state.midiLibrary.length > 50) state.midiLibrary = state.midiLibrary.slice(0, 50);
    save();
  },

  renderLibraryModal() {
    const body = document.getElementById('midi-manager-body');
    if (!body) return;
    body.innerHTML = '';

    if (!state.midiLibrary || state.midiLibrary.length === 0) {
      body.innerHTML = '<div style="font-size:12px;opacity:0.4;padding:24px 0;text-align:center;">Aún no hay composiciones MIDI en tu biblioteca. Genera una con el sistema agéntico o el conversor.</div>';
      return;
    }

    state.midiLibrary.forEach(item => {
      const card = document.createElement('div');
      card.className = 'midi-lib-card';
      const trackCount = item.songData?.tracks?.length || 0;
      const totalBeats = this.getTotalBeats(item.songData);
      const bpm = item.songData?.bpm || 120;

      card.innerHTML = `
        <div class="midi-lib-header">
          <div>
            <div class="midi-lib-title">${item.title || 'Composición sin título'}</div>
            <div class="midi-lib-meta">${new Date(item.created).toLocaleString()} · ${bpm} BPM · ${item.songData?.keySignature || 'C'} · ${trackCount} pistas · ${Math.ceil(totalBeats)} negras</div>
          </div>
          <button class="doc-btn stop-btn lib-del-btn" data-id="${item.id}">Eliminar</button>
        </div>
        <div id="player-lib_${item.id}" class="midi-player-box" style="margin-top:10px;">
          <canvas class="midi-canvas" width="620" height="90"></canvas>
          <div class="midi-player-controls">
            <button class="doc-btn midi-play-btn">▶ Escuchar</button>
            <button class="doc-btn midi-stop-btn">⏹ Stop</button>
            <button class="doc-btn midi-wav-btn">🔊 .WAV</button>
            <button class="doc-btn midi-mid-btn">⬇ .MID</button>
            <span class="midi-time-readout">0:00 / 0:00 · ${bpm} BPM</span>
          </div>
        </div>
      `;

      body.appendChild(card);

      const libPlayerId = `lib_${item.id}`;
      setTimeout(() => {
        this.drawPianoRoll(libPlayerId, item.songData, 0, totalBeats, {});
        this.updateTimeUI(libPlayerId, 0, totalBeats, bpm);
      }, 20);

      const canvas = card.querySelector('.midi-canvas');
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        this.seek(libPlayerId, item.songData, ratio * totalBeats);
      });

      card.querySelector('.midi-play-btn').addEventListener('click', () => {
        const inst = this.activeInstances[libPlayerId];
        if (inst && inst.isPlaying) this.pause(libPlayerId);
        else this.play(libPlayerId, item.songData);
      });

      card.querySelector('.midi-stop-btn').addEventListener('click', () => {
        this.stop(libPlayerId, true);
      });

      card.querySelector('.midi-wav-btn').addEventListener('click', (e) => {
        this.exportToWav(item.songData, e.currentTarget);
      });

      card.querySelector('.midi-mid-btn').addEventListener('click', () => {
        if (!item.midiData) return;
        const a = document.createElement('a');
        a.href = item.midiData;
        a.download = `${(item.title || 'Silenos').replace(/[^a-zA-Z0-9_-]/g, '_')}.mid`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });

      card.querySelector('.lib-del-btn').addEventListener('click', () => {
        this.stop(libPlayerId, true);
        state.midiLibrary = state.midiLibrary.filter(x => x.id !== item.id);
        save();
        this.renderLibraryModal();
      });
    });
  }
};