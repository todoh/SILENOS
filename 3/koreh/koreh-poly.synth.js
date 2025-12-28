/* SILENOS - KOREH AUDIO ENGINE (Koreh5 - PolySynth + Resonance)
   Archivo: koreh-poly-synth-resonant.js
   Enfoque: Filtro global (R) aplicado a la polifonía (F)
*/

window.KorehAudio = {
    ...window.KorehAudio,

    // ==========================================
    // SECCIÓN 4. R: RESONANCIA (DSP / Filtro Global)
    // ==========================================
    R: {
        globalFilter: null,

        // R.4: Inicialización del filtro de arquitectura
        initGlobalResonance() {
            if (!KorehAudio.isInitialized) KorehAudio.N.initializeAudioContext();
            
            this.globalFilter = KorehAudio.ctx.createBiquadFilter();
            this.globalFilter.type = 'lowpass';
            this.globalFilter.frequency.setValueAtTime(2000, KorehAudio.ctx.currentTime);
            this.globalFilter.Q.setValueAtTime(1, KorehAudio.ctx.currentTime);

            // Ruteo: El filtro se sitúa justo antes del Main Bus
            this.globalFilter.connect(KorehAudio.K.mainBus);
            console.log("R -> Filtro de Resonancia Global insertado en el Ki (K).");
        },

        updateFilter(freq, q) {
            if (!this.globalFilter) return;
            const now = KorehAudio.ctx.currentTime;
            this.globalFilter.frequency.setTargetAtTime(freq, now, 0.05);
            this.globalFilter.Q.setTargetAtTime(q, now, 0.05);
        }
    },

    // ==========================================
    // SECCIÓN 7. F: FORMA (Gestión Polifónica)
    // ==========================================
    F: {
        activeVoices: new Map(),

        mToF(note) { return 440 * Math.pow(2, (note - 69) / 12); },

        noteOn(note, type = 'sawtooth', settings = { a: 0.02, d: 0.1, s: 0.5, r: 0.6 }) {
            if (!KorehAudio.isInitialized) KorehAudio.N.initializeAudioContext();
            // Aseguramos que el filtro exista
            if (!KorehAudio.R.globalFilter) KorehAudio.R.initGlobalResonance();
            
            if (this.activeVoices.has(note)) this.noteOff(note);

            const osc = KorehAudio.ctx.createOscillator();
            const voiceGain = KorehAudio.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(this.mToF(note), KorehAudio.ctx.currentTime);
            
            // CONEXIÓN: F (Osc) -> F (Envolvente) -> R (Filtro Global)
            osc.connect(voiceGain);
            voiceGain.connect(KorehAudio.R.globalFilter);

            osc.start();
            const triggerRelease = this.applyADSR(voiceGain, settings);

            this.activeVoices.set(note, { osc, gain: voiceGain, release: triggerRelease });
        },

        noteOff(note) {
            if (this.activeVoices.has(note)) {
                const voice = this.activeVoices.get(note);
                const rTime = voice.release();
                setTimeout(() => {
                    voice.osc.stop();
                    voice.osc.disconnect();
                    voice.gain.disconnect();
                    this.activeVoices.delete(note);
                }, rTime * 1000);
            }
        },

        applyADSR(gainNode, settings) {
            const now = KorehAudio.ctx.currentTime;
            const g = gainNode.gain;
            g.cancelScheduledValues(now);
            g.setValueAtTime(0, now);
            g.linearRampToValueAtTime(1, now + settings.a);
            g.linearRampToValueAtTime(settings.s, now + settings.a + settings.d);

            return () => {
                const rNow = KorehAudio.ctx.currentTime;
                g.cancelScheduledValues(rNow);
                g.setValueAtTime(g.value, rNow);
                g.linearRampToValueAtTime(0, rNow + settings.r);
                return settings.r;
            };
        }
    },

    // ==========================================
    // SECCIÓN B: VISIÓN (Puente de Canvas)
    // ==========================================
    Visual: {
        initializeCanvasBridge(canvasElementId, drawFunction) {
            const canvas = document.getElementById(canvasElementId);
            if (!canvas) return;
            const ctx2d = canvas.getContext('2d');

            // Controles de teclado
            const keyMap = { 'a': 60, 'w': 61, 's': 62, 'e': 63, 'd': 64, 'f': 65, 't': 66, 'g': 67, 'y': 68, 'h': 69, 'u': 70, 'j': 71, 'k': 72 };
            
            window.addEventListener('keydown', (e) => {
                if (keyMap[e.key] && !e.repeat) KorehAudio.F.noteOn(keyMap[e.key]);
                // Control de filtro con flechas (Resonancia)
                if (e.key === 'ArrowUp') KorehAudio.R.updateFilter(5000, 5);
                if (e.key === 'ArrowDown') KorehAudio.R.updateFilter(200, 10);
            });

            window.addEventListener('keyup', (e) => {
                if (keyMap[e.key]) KorehAudio.F.noteOff(keyMap[e.key]);
            });

            const renderLoop = () => {
                ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                
                // Abrimos la funcionalidad de dibujo
                drawFunction(ctx2d, {
                    activeNotes: Array.from(KorehAudio.F.activeVoices.keys()),
                    filterFreq: KorehAudio.R.globalFilter ? KorehAudio.R.globalFilter.frequency.value : 0,
                    filterQ: KorehAudio.R.globalFilter ? KorehAudio.R.globalFilter.Q.value : 0,
                    time: KorehAudio.ctx ? KorehAudio.ctx.currentTime : 0
                });

                requestAnimationFrame(renderLoop);
            };
            renderLoop();
        }
    }
};

// --- Ejemplo de uso con Canvas ---
/*
KorehAudio.Visual.initializeCanvasBridge('canvasSynthetizer', (ctx, data) => {
    // Dibujar el estado del filtro (Resonancia)
    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(100, 100, (data.filterFreq / 5000) * 50, 0, Math.PI * 2);
    ctx.stroke();

    // Dibujar las notas (Individualidad)
    data.activeNotes.forEach((note, i) => {
        ctx.fillStyle = "white";
        ctx.fillRect(50 + (i * 30), 200, 20, -50);
    });
});
*/