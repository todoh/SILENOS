// --- cronologia/escaleta/exporter.js ---
// MOTOR DE EXPORTACIÓN (CANVAS + WEBCODECS) + MEZCLADOR DE AUDIO DUAL

const Exporter = {
    canvas: null,
    ctx: null,

    // Configuración de salida (se sobreescribirá según formato)
    width: 1920,
    height: 1080,
    fps: 30,

    // exportMode: 'video_only', 'voice_only', 'ambience_only', 'full_mix'
    // showSubtitles: boolean
    // outputFormat: 'landscape' | 'portrait'
    async renderFullMovie(exportMode = 'full_mix', showSubtitles = true, outputFormat = 'landscape') {
        
        // --- 0. CONFIGURACIÓN DE FORMATO ---
        if (outputFormat === 'portrait') {
            this.width = 1080;
            this.height = 1920;
        } else {
            this.width = 1920;
            this.height = 1080;
        }

        // --- 1. CONFIGURACIÓN DE PISTAS ---
        const includeTTS = (exportMode === 'voice_only' || exportMode === 'full_mix');
        const includeAmbience = (exportMode === 'ambience_only' || exportMode === 'full_mix');
        
        // --- 2. FILTRADO DE TOMAS ---
        let takes;
        if (exportMode === 'video_only') {
            takes = EscaletaCore.data.takes.filter(t => t.video_file);
            if (takes.length === 0) return alert("No hay tomas con video disponibles.");
        } else {
            // En cualquier modo con audio, necesitamos video. El audio es opcional (si falla, silencio).
            takes = EscaletaCore.data.takes.filter(t => t.video_file);
            if (takes.length === 0) return alert("No hay tomas de video para renderizar.");
        }

        EscaletaUI.toggleLoading(true, "PRODUCCIÓN FINAL", `Modo: ${exportMode.toUpperCase()} | Formato: ${outputFormat.toUpperCase()}`);

        // --- 3. SETUP CANVAS & ASSETS ---
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        try {
            // Pre-cargar recursos (Extrae audio si las flags lo indican)
            const assets = await this.preloadAssets(takes, includeTTS, includeAmbience);
            
            // --- 4. CONFIGURAR MUXER ---
            const muxerOptions = {
                target: new WebMMuxer.ArrayBufferTarget(),
                video: { codec: 'V_VP9', width: this.width, height: this.height, frameRate: this.fps }
            };

            // Si hay CUALQUIER tipo de audio activo, añadimos pista
            if (includeTTS || includeAmbience) {
                muxerOptions.audio = { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 2 };
            }

            const muxer = new WebMMuxer.Muxer(muxerOptions);

            // --- 5. ENCODERS ---
            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: (e) => console.error("Video Enc Error", e)
            });
            videoEncoder.configure({
                codec: 'vp09.00.10.08',
                width: this.width,
                height: this.height,
                bitrate: 6e6
            });

            // --- 6. MEZCLA DE AUDIO ---
            let audioEncoder = null;
            let mixedAudioBuffer = null;
            const hasAudioToMix = includeTTS || includeAmbience;

            if (hasAudioToMix) {
                audioEncoder = new AudioEncoder({
                    output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                    error: (e) => console.error("Audio Enc Error", e)
                });
                audioEncoder.configure({
                    codec: 'opus',
                    sampleRate: 48000,
                    numberOfChannels: 2,
                    bitrate: 128000
                });

                const audioContext = new AudioContext({ sampleRate: 48000 });
                // Fallback 5s si no hay audio
                const totalDuration = assets.reduce((acc, curr) => acc + curr.duration, 0); 
                const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * 48000) + 48000, 48000); // +1s buffer
                
                let currentTime = 0;
                
                assets.forEach(asset => {
                    // Pista de Ambiente (Sonido del Video Grok)
                    if (includeAmbience && asset.videoAudioBuffer) {
                        try {
                            const sourceVideo = offlineCtx.createBufferSource();
                            sourceVideo.buffer = asset.videoAudioBuffer;
                            
                            const gainVideo = offlineCtx.createGain();
                            gainVideo.gain.value = 1.0; 
                            
                            sourceVideo.connect(gainVideo);
                            gainVideo.connect(offlineCtx.destination);
                            sourceVideo.start(currentTime);
                        } catch(e) { console.warn("Fallo mezcla video audio", e); }
                    }

                    // Pista de Voz (TTS)
                    if (includeTTS && asset.ttsAudioBuffer) {
                        try {
                            const sourceTTS = offlineCtx.createBufferSource();
                            sourceTTS.buffer = asset.ttsAudioBuffer;
                            sourceTTS.connect(offlineCtx.destination);
                            sourceTTS.start(currentTime);
                        } catch(e) { console.warn("Fallo mezcla TTS", e); }
                    }

                    asset.startTime = currentTime;
                    currentTime += asset.duration;
                });

                mixedAudioBuffer = await offlineCtx.startRendering();
                audioContext.close();
            } else {
                // Solo Video: Calculamos tiempos visuales secuenciales
                let currentTime = 0;
                assets.forEach(asset => {
                    asset.startTime = currentTime;
                    currentTime += asset.duration;
                });
            }
            
            // --- 7. RENDERIZADO VISUAL ---
            EscaletaUI.toggleLoading(true, "RENDERIZANDO VIDEO", "Procesando frames...");
            
            let globalTime = 0;
            const frameDuration = 1 / this.fps;
            
            for (let i = 0; i < assets.length; i++) {
                const asset = assets[i];
                const frameCount = Math.ceil(asset.duration * this.fps);
                const videoElement = asset.videoElement;

                videoElement.currentTime = 0;
                
                for (let f = 0; f < frameCount; f++) {
                    const videoTime = (f * frameDuration) % (videoElement.duration || 5); 
                    videoElement.currentTime = videoTime;
                    
                    await new Promise(r => {
                        const onSeek = () => { videoElement.removeEventListener('seeked', onSeek); r(); };
                        videoElement.addEventListener('seeked', onSeek);
                        if(videoElement.readyState >= 2) r();
                    });

                    // Dibujar fondo negro
                    this.ctx.fillStyle = 'black';
                    this.ctx.fillRect(0,0, this.width, this.height);
                    
                    if (videoElement.videoWidth > 0) {
                        // Lógica de escalado inteligente (Letterbox: FIT)
                        const scale = Math.min(this.width / videoElement.videoWidth, this.height / videoElement.videoHeight);
                        const w = videoElement.videoWidth * scale;
                        const h = videoElement.videoHeight * scale;
                        const x = (this.width - w) / 2;
                        const y = (this.height - h) / 2;
                        this.ctx.drawImage(videoElement, x, y, w, h);
                    }

                    // Subtítulos (CONTROLADO POR LA CASILLA)
                    if (showSubtitles) {
                        this.drawSubtitles(asset.text, this.ctx);
                    }

                    // Encode
                    const timestamp = Math.round(globalTime * 1_000_000);
                    const frame = new VideoFrame(this.canvas, { timestamp });
                    const isKeyFrame = (f % (this.fps * 2) === 0);
                    
                    if (videoEncoder.encodeQueueSize > 10) await new Promise(r => setTimeout(r, 10));
                    videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                    frame.close();

                    globalTime += frameDuration;
                }
                
                EscaletaUI.updateProgressBar(((i+1) / assets.length) * 100);
            }

            // --- 8. CODIFICAR AUDIO ---
            if (hasAudioToMix && mixedAudioBuffer) {
                EscaletaUI.toggleLoading(true, "MEZCLANDO SONIDO", "Masterizando audio final...");
                await this.encodeAudio(audioEncoder, mixedAudioBuffer);
                await audioEncoder.flush();
            }

            // --- 9. FINALIZAR ---
            await videoEncoder.flush();
            muxer.finalize();

            const buffer = muxer.target.buffer;
            // Generar sufijo descriptivo
            let suffix = "_MUDO";
            if (exportMode === 'ambience_only') suffix = "_AMBIENTE";
            if (exportMode === 'voice_only') suffix = "_VOZ";
            if (exportMode === 'full_mix') suffix = "_MASTER";
            
            // Añadir formato al nombre
            suffix += (outputFormat === 'portrait' ? '_VERTICAL' : '_HORIZONTAL');

            this.download(new Blob([buffer], { type: 'video/webm' }), suffix);

            EscaletaUI.toggleLoading(false);

        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert("Error crítico en renderizado: " + e.message);
        }
    },

    async preloadAssets(takes, loadTTS, loadAmbience) {
        const assets = [];
        const audioCtx = (loadTTS || loadAmbience) ? new AudioContext() : null;

        for (const take of takes) {
            // Video Element
            const vid = document.createElement('video');
            vid.src = take.videoBlobUrl;
            vid.muted = true; 
            vid.playsInline = true;
            vid.crossOrigin = "anonymous";
            
            await new Promise((resolve) => {
                vid.onloadedmetadata = () => resolve();
                vid.onerror = (e) => { console.warn("Error cargando video", e); resolve(); };
            });

            // TTS
            let ttsBuffer = null;
            if (loadTTS && take.audioBlob) {
                try {
                    const arrayBuffer = await take.audioBlob.arrayBuffer();
                    ttsBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                } catch(e) { console.warn("Error TTS", e); }
            }

            // Audio Original del Video
            let videoBuffer = null;
            if (loadAmbience && take.videoBlobUrl) {
                try {
                    const response = await fetch(take.videoBlobUrl);
                    const videoBlob = await response.blob();
                    const arrayBuffer = await videoBlob.arrayBuffer();
                    videoBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                } catch(e) { 
                    // Silencioso si no tiene audio
                }
            }

            // Duración: Lo que dure más (Video o TTS)
            let duration = vid.duration || 5.0; 
            if (!isFinite(duration)) duration = 5.0;

            if (ttsBuffer && ttsBuffer.duration > duration) duration = ttsBuffer.duration;

            assets.push({
                videoElement: vid,
                ttsAudioBuffer: ttsBuffer,
                videoAudioBuffer: videoBuffer,
                duration: duration,
                text: take.narration_text
            });
        }
        
        if(audioCtx) audioCtx.close();
        return assets;
    },

    drawSubtitles(text, ctx) {
        if (!text) return;
        
        // Ajuste dinámico de fuente según el ancho del canvas
        const fontSize = this.width < 1000 ? 40 : 50; // Más pequeño en vertical (width=1080? No, 720. Espera, output es 1080 en vertical)
        // Bueno, en vertical 1080px sigue siendo ancho, pero necesitamos márgenes más seguros.
        
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 6;
        ctx.textAlign = "center";
        
        // Margen de seguridad: 10% a cada lado
        const maxWidth = this.width * 0.8;
        
        const words = text.split(' ');
        let line = '';
        const lines = [];
        
        for (let w of words) {
            const test = line + w + ' ';
            if (ctx.measureText(test).width > maxWidth && line.length > 0) {
                lines.push(line);
                line = w + ' ';
            } else {
                line = test;
            }
        }
        lines.push(line);

        // Renderizar de abajo hacia arriba
        const bottomMargin = this.height * 0.15; // 15% desde abajo
        
        lines.reverse().forEach((l, idx) => {
            const y = this.height - bottomMargin - (idx * (fontSize + 10));
            ctx.strokeText(l, this.width / 2, y);
            ctx.fillText(l, this.width / 2, y);
        });
    },

    async encodeAudio(encoder, buffer) {
        const channels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length;
        const dataL = buffer.getChannelData(0);
        const dataR = channels > 1 ? buffer.getChannelData(1) : dataL;
        
        const chunkSize = 48000; 
        let offset = 0;

        while (offset < length) {
            const size = Math.min(chunkSize, length - offset);
            const timestamp = Math.round((offset / sampleRate) * 1_000_000);

            const planarData = new Float32Array(size * 2);
            planarData.set(dataL.subarray(offset, offset + size), 0);
            planarData.set(dataR.subarray(offset, offset + size), size);

            const data = new AudioData({
                format: 'f32-planar',
                sampleRate: sampleRate,
                numberOfFrames: size,
                numberOfChannels: 2,
                timestamp: timestamp,
                data: planarData
            });

            if (encoder.encodeQueueSize > 10) await new Promise(r => setTimeout(r, 10));
            encoder.encode(data);
            data.close();

            offset += size;
        }
    },

    download(blob, suffix) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Escaleta_Final_${Date.now()}${suffix}.webm`;
        a.click();
    }
};