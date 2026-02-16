// --- REPRODUCTOR (SOLO VISTA PREVIA) ---
const Player = {
    events: [],
    currentIndex: 0,
    isPlaying: false,
    audioEl: document.getElementById('audio-player'),
    imgEl: document.getElementById('player-img'),
    subsEl: document.getElementById('player-subs'),
    format: 'horizontal', // 'horizontal' (16:9) or 'vertical' (9:16)
    
    init(events) {
        this.events = events.sort((a,b) => a.time - b.time);
        this.loadScene(0);
        this.audioEl.onended = () => this.next();
        // Inicializar botones de formato
        this.setFormat('horizontal');
    },

    setFormat(fmt) {
        this.format = fmt;
        const screen = document.getElementById('screen-container');
        const btnH = document.getElementById('btn-fmt-h');
        const btnV = document.getElementById('btn-fmt-v');

        if (fmt === 'vertical') {
            // UI Visual
            screen.classList.add('vertical');
            
            // Botones Estado
            btnV.classList.remove('text-slate-500', 'bg-transparent');
            btnV.classList.add('bg-slate-600', 'text-white');
            
            btnH.classList.add('text-slate-500', 'bg-transparent');
            btnH.classList.remove('bg-slate-600', 'text-white');

            // Configurar Render Engine para Vertical
            RenderEngine.options.width = 1080;
            RenderEngine.options.height = 1920;

        } else {
            // UI Visual
            screen.classList.remove('vertical');

            // Botones Estado
            btnH.classList.remove('text-slate-500', 'bg-transparent');
            btnH.classList.add('bg-slate-600', 'text-white');
            
            btnV.classList.add('text-slate-500', 'bg-transparent');
            btnV.classList.remove('bg-slate-600', 'text-white');

            // Configurar Render Engine para Horizontal
            RenderEngine.options.width = 1920;
            RenderEngine.options.height = 1080;
        }

        // Refrescar canvas del render si estuviera visible
        const canvas = document.getElementById('render-canvas');
        canvas.width = RenderEngine.options.width;
        canvas.height = RenderEngine.options.height;
    },

    loadScene(index) {
        if(index >= this.events.length) {
            this.stop();
            return;
        }

        this.currentIndex = index;
        const ev = this.events[index];

        document.getElementById('player-placeholder').classList.add('hidden');
        this.imgEl.classList.remove('opacity-0');
        
        if(ev.image64) {
            this.imgEl.src = ev.image64;
        } else {
            // Placeholder SVG
            this.imgEl.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiMxZTI5M2IiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjEwIiBmaWxsPSIjNDc1NTY5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5TSU4gSU1BR0VOPC90ZXh0Pjwvc3ZnPg==';
        }

        // Subtítulos HTML (Solo para Preview)
        const text = ev.moments ? ev.moments.map(m => m.text).join(" ") : ev.description;
        this.subsEl.innerText = text;
        this.subsEl.classList.remove('opacity-0');

        document.querySelectorAll('.script-row').forEach(r => r.classList.remove('active-row'));
        const row = document.getElementById(`row-${ev.id}`);
        if(row) {
            row.classList.add('active-row');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.getElementById('scene-display').innerText = `Escena ${index + 1} / ${this.events.length}`;

        if(ev.audioUrl) {
            this.audioEl.src = ev.audioUrl;
            if(this.isPlaying) this.audioEl.play().catch(e => console.error(e));
        } else {
            this.audioEl.src = "";
            if(this.isPlaying) {
                setTimeout(() => this.next(), 3000); 
            }
        }
    },

    play() {
        this.isPlaying = true;
        document.getElementById('btn-play').innerHTML = '<i class="fa-solid fa-pause"></i>';
        if(this.audioEl.src && this.audioEl.src !== window.location.href) {
             this.audioEl.play();
        } else {
            this.loadScene(this.currentIndex);
        }
    },

    pause() {
        this.isPlaying = false;
        document.getElementById('btn-play').innerHTML = '<i class="fa-solid fa-play ml-1"></i>';
        this.audioEl.pause();
    },

    togglePlay() {
        if(this.isPlaying) this.pause();
        else this.play();
    },

    next() {
        if(!this.isPlaying) return;
        if(this.currentIndex < this.events.length - 1) {
            this.loadScene(this.currentIndex + 1);
        } else {
            this.stop();
        }
    },
    
    stop() {
        this.pause();
        this.currentIndex = 0;
        this.loadScene(0);
    }
};

// --- MOTOR DE RENDERIZADO TURBO (OFFLINE / WEBCODECS) ---
const RenderEngine = {
    canvas: document.getElementById('render-canvas'),
    ctx: null,
    events: [],
    imagesCache: {},
    audioBuffers: {},
    
    options: {
        width: 1920,
        height: 1080,
        fps: 30, // FPS del video final
        showSubtitles: true,
        bitrate: 6e6 // 6 Mbps
    },

    async startRender() {
        UI.toggleExportModal();
        if(Project.data.events.length === 0) return alert("No hay eventos cargados.");
        
        Player.pause();
        document.getElementById('render-progress').classList.remove('hidden');
        this.options.showSubtitles = document.getElementById('chk-subs').checked;
        
        // Asegurar dimensiones del canvas antes de obtener contexto
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.events = Project.data.events.sort((a,b) => a.time - b.time);

        try {
            // 1. CARGA DE RECURSOS (Imágenes y Decodificación Audio)
            await this.preloadAssets();

            // 2. PREPARACIÓN DE AUDIO (Mezcla Offline Instantánea)
            this.updateProgress(10, "Mezclando Audio Digitalmente...");
            const mixedAudioBuffer = await this.renderAudioMix();

            // 3. CONFIGURAR MUXER Y ENCODERS
            this.updateProgress(20, "Iniciando Encoders...");
            
            // Usamos WebMMuxer desde la librería importada
            const muxer = new WebMMuxer.Muxer({
                target: new WebMMuxer.ArrayBufferTarget(),
                video: { codec: 'V_VP9', width: this.options.width, height: this.options.height, frameRate: this.options.fps },
                audio: { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 2 }
            });

            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => console.error("Video Encoder Error", e)
            });
            videoEncoder.configure({
                codec: 'vp09.00.10.08',
                width: this.options.width,
                height: this.options.height,
                bitrate: this.options.bitrate
            });

            const audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: (e) => console.error("Audio Encoder Error", e)
            });
            audioEncoder.configure({
                codec: 'opus',
                sampleRate: 48000,
                numberOfChannels: 2,
                bitrate: 128000
            });

            // 4. GENERACIÓN DE VIDEO (Bucle Matemático Rápido)
            await this.processVideoFrames(videoEncoder);

            // 5. CODIFICACIÓN DE AUDIO
            this.updateProgress(90, "Codificando Audio...");
            await this.processAudioChunks(audioEncoder, mixedAudioBuffer);

            // 6. FINALIZAR
            this.updateProgress(99, "Empaquetando...");
            await videoEncoder.flush();
            await audioEncoder.flush();
            muxer.finalize();

            const buffer = muxer.target.buffer;
            this.downloadBlob(new Blob([buffer], { type: 'video/webm' }));
            
        } catch(e) {
            console.error(e);
            alert("Error: " + e.message);
            this.finish();
        }
    },

    async preloadAssets() {
        this.imagesCache = {};
        this.audioBuffers = {};
        const audioCtx = new AudioContext();

        let loaded = 0;
        const total = this.events.length;

        for (const ev of this.events) {
            // Imagen
            if (ev.image64) {
                await new Promise(r => {
                    const img = new Image();
                    img.onload = () => { this.imagesCache[ev.id] = img; r(); };
                    img.onerror = r; 
                    img.src = ev.image64;
                });
            }
            // Audio
            if (ev.audioBlob) {
                try {
                    const ab = await ev.audioBlob.arrayBuffer();
                    this.audioBuffers[ev.id] = await audioCtx.decodeAudioData(ab);
                } catch(e) {}
            }
            this.updateProgress((++loaded / total) * 10, "Cargando recursos...");
        }
        audioCtx.close();
    },

    // Genera un solo AudioBuffer con todo el audio del proyecto mezclado
    async renderAudioMix() {
        // Calcular duración total sumando duraciones de audios
        let totalDuration = 0;
        // Asignamos una duración estimada a cada evento
        for(let ev of this.events) {
            const buf = this.audioBuffers[ev.id];
            // Si hay audio, dura lo que el audio. Si no, 3 segundos.
            ev._renderDuration = buf ? buf.duration : 3.0;
            ev._startTime = totalDuration;
            totalDuration += ev._renderDuration;
        }

        // Crear contexto offline
        // 48kHz estándar para video
        // Protección: Mínimo 1 segundo para evitar errores de contexto vacío
        const safeDuration = Math.max(1, totalDuration);
        const offlineCtx = new OfflineAudioContext(2, Math.ceil(safeDuration * 48000), 48000);
        
        for(let ev of this.events) {
            const buf = this.audioBuffers[ev.id];
            if(buf) {
                const source = offlineCtx.createBufferSource();
                source.buffer = buf;
                source.connect(offlineCtx.destination);
                source.start(ev._startTime);
            }
        }

        return await offlineCtx.startRendering();
    },

    async processVideoFrames(videoEncoder) {
        const frameDuration = 1 / this.options.fps;
        let globalTime = 0; // Tiempo en segundos
        const totalEvents = this.events.length;
        
        // Control de GOP (Group of Pictures) para evitar Cluster Exceeded Error
        // Forzaremos un Keyframe al menos cada 3 segundos
        let lastKeyFrameTime = -100;

        for (let i = 0; i < totalEvents; i++) {
            const ev = this.events[i];
            const duration = ev._renderDuration; // Calculado en renderAudioMix
            const frameCount = Math.ceil(duration * this.options.fps);

            // Dibujar UNA VEZ la imagen base (optimización)
            this.drawSceneVisuals(ev);

            // Generar N frames para este evento
            for (let f = 0; f < frameCount; f++) {
                
                // --- PROTECCIÓN 1: BACKPRESSURE (Evitar Crash de Memoria) ---
                if (videoEncoder.encodeQueueSize > 20) {
                    await new Promise(resolve => {
                        const checkQueue = () => {
                            if (videoEncoder.encodeQueueSize < 5) resolve();
                            else setTimeout(checkQueue, 10);
                        };
                        checkQueue();
                    });
                }

                // El timestamp debe estar en microsegundos para VideoEncoder
                const timestamp = Math.round(globalTime * 1_000_000);
                
                // VideoFrame toma el canvas tal cual está
                const frame = new VideoFrame(this.canvas, { timestamp });
                
                // --- PROTECCIÓN 2: GOP CAPPING (Evitar Error Cluster Exceeded) ---
                // Si ha pasado mucho tiempo desde el último Keyframe, forzar uno nuevo.
                // WebM requiere cerrar clusters cada ~32 seg, nosotros lo hacemos cada 3 seg por seguridad.
                let isKeyFrame = (f === 0); // Normalmente al inicio de escena
                if ((globalTime - lastKeyFrameTime) >= 3.0) {
                    isKeyFrame = true;
                }

                if (isKeyFrame) {
                    lastKeyFrameTime = globalTime;
                }
                
                videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                frame.close(); // Importante liberar memoria

                globalTime += frameDuration;
            }

            // Barra de progreso visual (del 20% al 90%)
            const percent = 20 + ((i / totalEvents) * 70);
            this.updateProgress(percent, `Renderizando Visuales ${i+1}/${totalEvents}`);
            
            // Dejar respirar al UI loop
            await new Promise(r => setTimeout(r, 0));
        }
    },

    async processAudioChunks(audioEncoder, audioBuffer) {
        // AudioEncoder prefiere datos planares, WebCodecs usa AudioData
        // Tenemos que trocear el buffer gigante en pedazos pequeños para el encoder
        
        const channels = audioBuffer.numberOfChannels; // 2
        const sampleRate = audioBuffer.sampleRate; // 48000
        const totalSamples = audioBuffer.length;
        
        const dataChannel0 = audioBuffer.getChannelData(0);
        const dataChannel1 = audioBuffer.getChannelData(1);
        
        // Procesar en chunks de 1 segundo aprox (48000 muestras)
        const chunkSize = 48000; 
        let offset = 0;

        while(offset < totalSamples) {
            // Protección de cola también para audio
            if (audioEncoder.encodeQueueSize > 20) {
                await new Promise(r => setTimeout(r, 50));
            }

            const size = Math.min(chunkSize, totalSamples - offset);
            const timestamp = Math.round((offset / sampleRate) * 1_000_000);

            // Crear buffers para este chunk
            const chunkCh0 = new Float32Array(size);
            const chunkCh1 = new Float32Array(size);
            
            // Copiar datos (rápido)
            chunkCh0.set(dataChannel0.subarray(offset, offset + size));
            chunkCh1.set(dataChannel1.subarray(offset, offset + size));

            // Crear AudioData
            // Formato 'f32-planar' significa: [LLLL...RRRR...]
            // Necesitamos un buffer único que contenga ambos canales secuencialmente
            const planarData = new Float32Array(size * 2);
            planarData.set(chunkCh0, 0); // Canal L
            planarData.set(chunkCh1, size); // Canal R

            const audioData = new AudioData({
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: size,
                numberOfChannels: 2,
                timestamp: timestamp,
                data: planarData
            });

            audioEncoder.encode(audioData);
            audioData.close();

            offset += size;
            await new Promise(r => setTimeout(r, 0)); // Evitar congelar UI
        }
    },

    drawSceneVisuals(ev) {
        // Fondo Negro
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.options.width, this.options.height);

        // Imagen
        const img = this.imagesCache[ev.id];
        if (img) {
            const hRatio = this.options.width / img.width;
            const vRatio = this.options.height / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const centerShift_x = (this.options.width - img.width * ratio) / 2;
            const centerShift_y = (this.options.height - img.height * ratio) / 2;
            
            this.ctx.drawImage(img, 0, 0, img.width, img.height, 
                               centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
        }

        // Subtítulos
        if (this.options.showSubtitles) {
            const text = ev.moments ? ev.moments.map(m => m.text).join(" ") : ev.description;
            this.drawSubtitles(text);
        }
    },

    drawSubtitles(text) {
        if (!text) return;
        const fontSize = 50;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "bottom";
        
        const maxWidth = this.options.width - 100;
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = this.ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        const bottomMargin = 80;
        lines.reverse().forEach((l, idx) => {
            const y = this.options.height - bottomMargin - (idx * (fontSize + 10));
            this.ctx.lineWidth = 6;
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeText(l, this.options.width/2, y);
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(l, this.options.width/2, y);
        });
    },

    updateProgress(percent, text) {
        document.getElementById('render-bar').style.width = `${percent}%`;
        document.getElementById('render-status').innerText = text;
    },

    downloadBlob(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `story_turbo_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => { 
            document.body.removeChild(a); 
            window.URL.revokeObjectURL(url); 
            this.finish();
        }, 1000);
    },

    finish() {
        document.getElementById('render-progress').classList.add('hidden');
        alert("¡Renderizado Turbo Completado!");
    }
};