/* SILENOS - KOREH AUDIO ENGINE (Koreh4)
   Versión: 4.6 - Integración K, R, L, G
   Ontología: N (Número), M (Materia), K (Ki), R (Resonancia), L (Límite), G (Granularidad), B (Visión)
*/

window.KorehAudio = {
    ctx: null,
    isInitialized: false,
    bufferStorage: {}, 
    nodes: {}, // Almacén de nodos activos para evitar pérdida de referencia

    // ==========================================
    // SECCIÓN 1. N: NÚMERO (Sincronización)
    // ==========================================
    N: {
        bpm: 120,
        ppq: 96,
        isPlaying: false,
        startTime: 0,
        lastTickTime: 0,
        currentTick: 0,

        initializeAudioContext() {
            if (KorehAudio.isInitialized) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            KorehAudio.ctx = new AudioContext();
            KorehAudio.isInitialized = true;
            // Inicializar Main Bus de la sección K al arrancar
            KorehAudio.K.createMainBus();
            console.log("N -> Motor de Tiempo y Coherencia inicializado.");
        },

        startMasterClock(onTickCallback) {
            if (!KorehAudio.isInitialized) this.initializeAudioContext();
            if (this.isPlaying) return;
            this.isPlaying = true;
            this.startTime = KorehAudio.ctx.currentTime;
            this.lastTickTime = KorehAudio.ctx.currentTime;

            const runClock = () => {
                if (!this.isPlaying) return;
                const secondsPerTick = 60 / this.bpm / this.ppq;
                let nextTickTime = this.lastTickTime + secondsPerTick;
                while (nextTickTime < KorehAudio.ctx.currentTime + 0.1) {
                    if (nextTickTime > this.lastTickTime) {
                        this.currentTick++;
                        onTickCallback(this.currentTick, nextTickTime);
                        this.lastTickTime = nextTickTime;
                    }
                    nextTickTime += secondsPerTick;
                }
                requestAnimationFrame(runClock);
            };
            runClock();
        },

        stopMasterClock() {
            this.isPlaying = false;
            this.currentTick = 0;
            this.lastTickTime = 0;
        },

        getNoteDurations(bpm = this.bpm) {
            const beat = 60 / bpm;
            return {
                quarter: beat,
                eighth: beat / 2,
                sixteenth: beat / 4,
                ms: beat * 1000,
                samples: beat * (KorehAudio.ctx ? KorehAudio.ctx.sampleRate : 44100)
            };
        }
    },

    // ==========================================
    // SECCIÓN 2. M: MATERIAL (Buffers)
    // ==========================================
    M: {
        async loadSampleToMemory(name, url) {
            if (!KorehAudio.isInitialized) KorehAudio.N.initializeAudioContext();
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await KorehAudio.ctx.decodeAudioData(arrayBuffer);
                KorehAudio.bufferStorage[name] = audioBuffer;
                return audioBuffer;
            } catch (error) {
                console.error(`M -> Error cargando materia: ${name}`, error);
            }
        },

        extractBufferRegion(sourceBuffer, startSec, endSec) {
            const rate = sourceBuffer.sampleRate;
            const startFrame = Math.floor(startSec * rate);
            const endFrame = Math.floor(endSec * rate);
            const durationFrames = endFrame - startFrame;
            const newBuffer = KorehAudio.ctx.createBuffer(sourceBuffer.numberOfChannels, durationFrames, rate);
            for (let ch = 0; ch < sourceBuffer.numberOfChannels; ch++) {
                const data = sourceBuffer.getChannelData(ch).subarray(startFrame, endFrame);
                newBuffer.copyToChannel(data, ch);
            }
            return newBuffer;
        }
    },

    // ==========================================
    // SECCIÓN 3. K: KI O CAMINO (Ruteo y Flujo)
    // ==========================================
    K: {
        mainBus: null,

        // K.1: Main Bus Link (Punto de confluencia)
        createMainBus() {
            this.mainBus = KorehAudio.ctx.createGain();
            // El Main Bus pasa por el limitador de seguridad de la sección L antes de la salida
            const safetyLimiter = KorehAudio.L.createLimiter();
            this.mainBus.connect(safetyLimiter);
            safetyLimiter.connect(KorehAudio.ctx.destination);
        },

        // K.2: Signal Path Router (Conexión dinámica)
        connectNodes(source, destination) {
            if (source && destination) {
                source.connect(destination);
                return true;
            }
            return false;
        },

        // K.3: Virtual Patch Cables (Sends)
        createSend(sourceNode, gainAmount = 0.5) {
            const sendGain = KorehAudio.ctx.createGain();
            sendGain.gain.value = gainAmount;
            sourceNode.connect(sendGain);
            return sendGain;
        },

        // K.4: Mono/Stereo Downmixer
        createDownmixer() {
            const merger = KorehAudio.ctx.createChannelMerger(2);
            return merger;
        }
    },

    // ==========================================
    // SECCIÓN 4. R: RESONANCIA (DSP / Efectos)
    // ==========================================
    R: {
        // R.1: Multi-Mode Filter (F)
        createFilter(type = 'lowpass', frequency = 1000, q = 1) {
            const filter = KorehAudio.ctx.createBiquadFilter();
            filter.type = type;
            filter.frequency.setValueAtTime(frequency, KorehAudio.ctx.currentTime);
            filter.Q.setValueAtTime(q, KorehAudio.ctx.currentTime);
            return filter;
        },

        // R.2: Saturation Engine (Cálculo de curva sigmoide)
        createSaturation(amount = 50) {
            const waveShaper = KorehAudio.ctx.createWaveShaper();
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            for (let i = 0; i < n_samples; ++i) {
                let x = (i * 2) / n_samples - 1;
                curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
            }
            waveShaper.curve = curve;
            waveShaper.oversample = '4x';
            return waveShaper;
        },

        // R.3: Delay Lines
        createDelay(time = 0.3, feedback = 0.4) {
            const delay = KorehAudio.ctx.createDelay();
            const fbGain = KorehAudio.ctx.createGain();
            
            delay.delayTime.value = time;
            fbGain.gain.value = feedback;

            delay.connect(fbGain);
            fbGain.connect(delay); // Bucle de retroalimentación
            
            return { input: delay, output: delay, feedback: fbGain };
        }
    },

    // ==========================================
    // SECCIÓN 5. L: LÍMITE (Dinámica)
    // ==========================================
    L: {
        // L.1: Brickwall Limiter (Frontera física)
        createLimiter() {
            const limiter = KorehAudio.ctx.createDynamicsCompressor();
            limiter.threshold.setValueAtTime(-0.5, KorehAudio.ctx.currentTime);
            limiter.knee.setValueAtTime(0, KorehAudio.ctx.currentTime);
            limiter.ratio.setValueAtTime(20, KorehAudio.ctx.currentTime);
            limiter.attack.setValueAtTime(0.001, KorehAudio.ctx.currentTime);
            limiter.release.setValueAtTime(0.1, KorehAudio.ctx.currentTime);
            return limiter;
        },

        // L.2: Dynamic Compressor
        createCompressor(threshold = -24, ratio = 4) {
            const comp = KorehAudio.ctx.createDynamicsCompressor();
            comp.threshold.setValueAtTime(threshold, KorehAudio.ctx.currentTime);
            comp.ratio.setValueAtTime(ratio, KorehAudio.ctx.currentTime);
            return comp;
        },

        // L.3: Soft Clipper (Redondeo de picos)
        createSoftClipper() {
            return this.createSaturation(10); // Saturación leve para control de picos
        }
    },

    // ==========================================
    // SECCIÓN 6. G: GRANULARIDAD (Micro-Edición)
    // ==========================================
    G: {
        // G.1: Zero-Crossing Detector (Evitar clicks)
        findNearestZeroCrossing(buffer, frame) {
            const data = buffer.getChannelData(0);
            let i = frame;
            while (i < data.length - 1 && Math.sign(data[i]) === Math.sign(data[i+1])) {
                i++;
            }
            return i;
        },

        // G.2: Linear Fade In/Out (Rampas de volumen)
        applyFades(gainNode, duration, type = 'in') {
            const now = KorehAudio.ctx.currentTime;
            if (type === 'in') {
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(1, now + duration);
            } else {
                gainNode.gain.setValueAtTime(1, now);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
            }
        },

        // G.3: Micro-Stutter Generator
        createStutter(bufferName, rateInTicks = 12) {
            const duration = (60 / KorehAudio.N.bpm / (KorehAudio.N.ppq / rateInTicks));
            // Lógica interna para repetir un grano de materia sonora
            const playGrain = () => {
                if (!KorehAudio.N.isPlaying) return;
                const source = KorehAudio.ctx.createBufferSource();
                source.buffer = KorehAudio.bufferStorage[bufferName];
                source.connect(KorehAudio.K.mainBus);
                source.start(0, 0, duration * 0.8); // Grano con pequeño espacio de silencio
            };
            return playGrain;
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

            const renderLoop = () => {
                ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                
                // Función de dibujo abierta para el usuario
                drawFunction(ctx2d, {
                    currentTick: KorehAudio.N.currentTick,
                    currentTime: KorehAudio.ctx ? KorehAudio.ctx.currentTime : 0,
                    isPlaying: KorehAudio.N.isPlaying,
                    bpm: KorehAudio.N.bpm
                });

                requestAnimationFrame(renderLoop);
            };
            renderLoop();
        }
    }
};

console.log("Koreh-Audio: Secciones N, M, K, R, L y G integradas.");