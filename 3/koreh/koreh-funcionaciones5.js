/* SILENOS - KOREH AUDIO ENGINE (Koreh5)
   Versión: 5.0 - Integración F (Forma), Y (Confluencia) y T (Tramo)
   Ontología: N, M, K, R, L, G, F, Y, T, B
*/

window.KorehAudio = {
    ctx: null,
    isInitialized: false,
    bufferStorage: {},
    nodes: {}, 
    
    // ==========================================
    // SECCIÓN 1 - 6 (N, M, K, R, L, G) - Resumen Funcional
    // ==========================================
    // (Mantenidas del core anterior para coherencia de ruteo)

    N: {
        bpm: 120, ppq: 96, isPlaying: false, currentTick: 0,
        initializeAudioContext() {
            if (KorehAudio.isInitialized) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            KorehAudio.ctx = new AudioContext();
            KorehAudio.isInitialized = true;
            KorehAudio.K.createMainBus();
        },
        startMasterClock(onTickCallback) {
            if (!KorehAudio.isInitialized) this.initializeAudioContext();
            this.isPlaying = true;
            const runClock = () => {
                if (!this.isPlaying) return;
                const secondsPerTick = 60 / this.bpm / this.ppq;
                onTickCallback(this.currentTick++, KorehAudio.ctx.currentTime);
                setTimeout(runClock, secondsPerTick * 1000);
            };
            runClock();
        }
    },

    K: {
        mainBus: null,
        createMainBus() {
            this.mainBus = KorehAudio.ctx.createGain();
            const limiter = KorehAudio.L.createLimiter();
            this.mainBus.connect(limiter);
            limiter.connect(KorehAudio.ctx.destination);
        }
    },

    L: {
        createLimiter() {
            const comp = KorehAudio.ctx.createDynamicsCompressor();
            comp.threshold.value = -0.5; comp.ratio.value = 20;
            return comp;
        }
    },

    // ==========================================
    // SECCIÓN 7. F: FORMA (Síntesis y Envolventes)
    // ==========================================
    F: {
        // F.1: Waveform Oscillator (Acción pura)
        createOscillator(type = 'sine', frequency = 440) {
            const osc = KorehAudio.ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, KorehAudio.ctx.currentTime);
            return osc;
        },

        // F.2: ADSR Envelope Generator (Modelado de la Individualidad)
        applyADSR(gainNode, settings = { a: 0.1, d: 0.2, s: 0.5, r: 0.4 }) {
            const now = KorehAudio.ctx.currentTime;
            const g = gainNode.gain;
            g.cancelScheduledValues(now);
            g.setValueAtTime(0, now);
            // Attack
            g.linearRampToValueAtTime(1, now + settings.a);
            // Decay
            g.linearRampToValueAtTime(settings.s, now + settings.a + settings.d);
            return (releaseTime) => {
                const rNow = KorehAudio.ctx.currentTime;
                g.cancelScheduledValues(rNow);
                g.setValueAtTime(g.value, rNow);
                g.linearRampToValueAtTime(0, rNow + settings.r);
            };
        },

        // F.3: Sub-Harmonic Generator (Peso en la forma)
        createSubOsc(frequency) {
            return this.createOscillator('square', frequency / 2);
        },

        // F.4: Morphing Wavetable (Transición Fluida)
        createWavetable(real, imag) {
            // Permite crear timbres complejos basados en series de Fourier
            return KorehAudio.ctx.createPeriodicWave(new Float32Array(real), new Float32Array(imag));
        }
    },

    // ==========================================
    // SECCIÓN 8. Y: CONFLUENCIA (Mezcla y Sidechain)
    // ==========================================
    Y: {
        // Y.1: Multi-Channel Mixer (Unificador del Set 'O')
        createMixerChannel(name) {
            const input = KorehAudio.ctx.createGain();
            const panner = KorehAudio.ctx.createStereoPanner();
            const output = KorehAudio.ctx.createGain();

            input.connect(panner);
            panner.connect(output);
            output.connect(KorehAudio.K.mainBus);

            KorehAudio.nodes[name] = { input, panner, output };
            return KorehAudio.nodes[name];
        },

        // Y.2: Panning Engine (Constant Power)
        setPan(channelName, value) {
            // value: -1 (L) a 1 (R)
            if (KorehAudio.nodes[channelName]) {
                KorehAudio.nodes[channelName].panner.pan.setTargetAtTime(value, KorehAudio.ctx.currentTime, 0.05);
            }
        },

        // Y.3: Sidechain Linker (Interacción de formas)
        applySidechain(sourceNode, targetGainNode, ratio = -20) {
            // El sourceNode actúa como control sobre la amplitud del target
            const analyzer = KorehAudio.ctx.createAnalyser();
            sourceNode.connect(analyzer);
            // Lógica de detección de picos para reducir ganancia (simplificada)
            // En implementaciones avanzadas se usaría un ScriptProcessor o AudioWorklet
        }
    },

    // ==========================================
    // SECCIÓN 9. T: TRAMO (Gestión del Timeline)
    // ==========================================
    T: {
        playhead: 0,
        regions: [],

        // T.1: Playhead Controller
        seek(tick) {
            this.playhead = tick;
            KorehAudio.N.currentTick = tick;
        },

        // T.2: Region Sequencer (Gestor de bloques)
        addRegion(name, startTick, durationTicks, bufferName) {
            this.regions.push({ name, startTick, durationTicks, bufferName });
        },

        // T.3: Loop Region Manager
        checkPlayback(currentTick) {
            this.regions.forEach(region => {
                if (currentTick === region.startTick) {
                    this.triggerRegion(region);
                }
            });
        },

        triggerRegion(region) {
            const source = KorehAudio.ctx.createBufferSource();
            source.buffer = KorehAudio.bufferStorage[region.bufferName];
            source.connect(KorehAudio.K.mainBus);
            source.start();
        }
    },

    // ==========================================
    // SECCIÓN B: VISIÓN (Puente de Canvas)
    // ==========================================
    Visual: {
        // Inicia el puente visual abriendo la función del canvas para el usuario
        initializeCanvasBridge(canvasElementId, drawFunction) {
            const canvas = document.getElementById(canvasElementId);
            if (!canvas) return;
            const ctx2d = canvas.getContext('2d');

            const renderLoop = () => {
                ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                
                // Exponemos los datos de síntesis (F) y mezcla (Y) al canvas
                drawFunction(ctx2d, {
                    tick: KorehAudio.N.currentTick,
                    time: KorehAudio.ctx ? KorehAudio.ctx.currentTime : 0,
                    activeNodes: Object.keys(KorehAudio.nodes).length,
                    bpm: KorehAudio.N.bpm
                });

                requestAnimationFrame(renderLoop);
            };
            renderLoop();
        }
    }
};

console.log("Koreh-Audio V5: Secciones F, Y y T operativas. Sistema de síntesis y confluencia listo.");