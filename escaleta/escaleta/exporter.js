// --- cronologia/escaleta/exporter.js ---
// MOTOR DE EXPORTACIÓN (CANVAS + WEBCODECS) + MEZCLADOR DE AUDIO DUAL

const Exporter = {
    canvas: null,
    ctx: null,

    width: 1920,
    height: 1080,
    fps: 30,

    async renderFullMovie(exportMode = 'full_mix', showSubtitles = true, outputFormat = 'landscape') {
        
        if (outputFormat === 'portrait') {
            this.width = 1080;
            this.height = 1920;
        } else if (outputFormat === 'square') {
            this.width = 1080;
            this.height = 1080;
        } else {
            this.width = 1920;
            this.height = 1080;
        }

        const includeVideo = (exportMode !== 'audio_only');
        const includeTTS = (exportMode === 'voice_only' || exportMode === 'full_mix' || exportMode === 'audio_only');
        const includeAmbience = (exportMode === 'ambience_only' || exportMode === 'full_mix' || exportMode === 'audio_only');
        
        const takes = EscaletaCore.data.takes.filter(t => t.video_file || t.image_file);
        if (takes.length === 0) return alert("No hay tomas visuales para renderizar.");

        EscaletaUI.toggleLoading(true, "PRODUCCIÓN FINAL", `Modo: ${exportMode.toUpperCase()} | Formato: ${outputFormat.toUpperCase()}`);

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        try {
            const assets = await this.preloadAssets(takes, includeTTS, includeAmbience);
            
            const muxerOptions = {
                target: new WebMMuxer.ArrayBufferTarget(),
            };

            if (includeVideo) {
                muxerOptions.video = { codec: 'V_VP9', width: this.width, height: this.height, frameRate: this.fps };
            }

            if (includeTTS || includeAmbience) {
                muxerOptions.audio = { codec: 'A_OPUS', sampleRate: 48000, numberOfChannels: 2 };
            }

            const muxer = new WebMMuxer.Muxer(muxerOptions);

            let videoEncoder = null;
            if (includeVideo) {
                videoEncoder = new VideoEncoder({
                    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                    error: (e) => console.error("Video Enc Error", e)
                });
                videoEncoder.configure({
                    codec: 'vp09.00.10.08',
                    width: this.width,
                    height: this.height,
                    bitrate: 6e6
                });
            }

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
                const totalDuration = assets.reduce((acc, curr) => acc + curr.duration, 0); 
                const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * 48000) + 48000, 48000); 
                
                let currentTime = 0;
                
                assets.forEach(asset => {
                    if (includeAmbience && asset.videoAudioBuffer) {
                        try {
                            const ambDur = asset.videoAudioBuffer.duration;
                            const loops = ambDur > 0.05 ? Math.ceil(asset.duration / ambDur) : 1;
                            for (let k = 0; k < loops; k++) {
                                const sourceVideo = offlineCtx.createBufferSource();
                                sourceVideo.buffer = asset.videoAudioBuffer;
                                const gainVideo = offlineCtx.createGain();
                                gainVideo.gain.value = 1.0;
                                sourceVideo.connect(gainVideo);
                                gainVideo.connect(offlineCtx.destination);
                                const startAt = currentTime + (k * ambDur);
                                const remaining = (currentTime + asset.duration) - startAt;
                                if (remaining <= 0) break;
                                sourceVideo.start(startAt, 0, Math.min(ambDur, remaining));
                            }
                        } catch(e) { }
                    }

                    if (includeTTS && asset.ttsAudioBuffer) {
                        try {
                            const sourceTTS = offlineCtx.createBufferSource();
                            sourceTTS.buffer = asset.ttsAudioBuffer;
                            sourceTTS.connect(offlineCtx.destination);
                            sourceTTS.start(currentTime);
                        } catch(e) { }
                    }

                    asset.startTime = currentTime;
                    currentTime += asset.duration;
                });

                mixedAudioBuffer = await offlineCtx.startRendering();
                audioContext.close();
            } else {
                let currentTime = 0;
                assets.forEach(asset => {
                    asset.startTime = currentTime;
                    currentTime += asset.duration;
                });
            }
            
            if (includeVideo) {
                EscaletaUI.toggleLoading(true, "RENDERIZANDO VIDEO", "Procesando frames...");
                
                let globalTime = 0;
                const frameDuration = 1 / this.fps;
                
                for (let i = 0; i < assets.length; i++) {
                    const asset = assets[i];
                    const frameCount = Math.ceil(asset.duration * this.fps);
                    
                    if (asset.isImage) {
                        for (let f = 0; f < frameCount; f++) {
                            this.ctx.fillStyle = 'black';
                            this.ctx.fillRect(0,0, this.width, this.height);
                            
                            if (asset.imageElement.width > 0) {
                                const scale = Math.min(this.width / asset.imageElement.width, this.height / asset.imageElement.height);
                                const w = asset.imageElement.width * scale;
                                const h = asset.imageElement.height * scale;
                                const x = (this.width - w) / 2;
                                const y = (this.height - h) / 2;
                                this.ctx.drawImage(asset.imageElement, x, y, w, h);
                            }

                            if (showSubtitles) this.drawSubtitles(asset.text, this.ctx);

                            const timestamp = Math.round(globalTime * 1_000_000);
                            const frame = new VideoFrame(this.canvas, { timestamp });
                            const isKeyFrame = (f % (this.fps * 2) === 0);
                            
                            if (videoEncoder.encodeQueueSize > 10) await new Promise(r => setTimeout(r, 10));
                            videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                            frame.close();

                            globalTime += frameDuration;
                        }
                    } else {
                        const videoElement = asset.videoElement;
                        videoElement.currentTime = 0;
                        
                        for (let f = 0; f < frameCount; f++) {
                            const videoTime = (f * frameDuration) % (videoElement.duration || 5.0); 
                            videoElement.currentTime = videoTime;
                            
                            await new Promise(r => {
                                const onSeek = () => { videoElement.removeEventListener('seeked', onSeek); r(); };
                                videoElement.addEventListener('seeked', onSeek);
                                if(videoElement.readyState >= 2) r();
                            });

                            this.ctx.fillStyle = 'black';
                            this.ctx.fillRect(0,0, this.width, this.height);
                            
                            if (videoElement.videoWidth > 0) {
                                const scale = Math.min(this.width / videoElement.videoWidth, this.height / videoElement.videoHeight);
                                const w = videoElement.videoWidth * scale;
                                const h = videoElement.videoHeight * scale;
                                const x = (this.width - w) / 2;
                                const y = (this.height - h) / 2;
                                this.ctx.drawImage(videoElement, x, y, w, h);
                            }

                            if (showSubtitles) this.drawSubtitles(asset.text, this.ctx);

                            const timestamp = Math.round(globalTime * 1_000_000);
                            const frame = new VideoFrame(this.canvas, { timestamp });
                            const isKeyFrame = (f % (this.fps * 2) === 0);
                            
                            if (videoEncoder.encodeQueueSize > 10) await new Promise(r => setTimeout(r, 10));
                            videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                            frame.close();

                            globalTime += frameDuration;
                        }
                    }
                    
                    EscaletaUI.updateProgressBar(((i+1) / assets.length) * 100);
                }
            } else {
                EscaletaUI.toggleLoading(false);
            }

            if (hasAudioToMix && mixedAudioBuffer) {
                EscaletaUI.toggleLoading(true, "MEZCLANDO SONIDO", "Masterizando audio final...");
                await this.encodeAudio(audioEncoder, mixedAudioBuffer);
                await audioEncoder.flush();
            }

            if (includeVideo) await videoEncoder.flush();
            muxer.finalize();

            const buffer = muxer.target.buffer;
            let suffix = "_MUDO";
            if (exportMode === 'ambience_only') suffix = "_AMBIENTE";
            if (exportMode === 'voice_only') suffix = "_VOZ";
            if (exportMode === 'full_mix') suffix = "_MASTER";
            if (exportMode === 'audio_only') suffix = "_SOLO_SONIDO";
            
            if (outputFormat === 'portrait') {
                suffix += '_VERTICAL';
            } else if (outputFormat === 'square') {
                suffix += '_CUADRADO';
            } else {
                suffix += '_HORIZONTAL';
            }

            this.download(new Blob([buffer], { type: includeVideo ? 'video/webm' : 'audio/webm' }), suffix);

            EscaletaUI.toggleLoading(false);

        } catch (e) {
            console.error(e);
            EscaletaUI.toggleLoading(false);
            alert("Error crítico en renderizado: " + e.message);
        }
    },

    async preloadAssets(takes, loadTTS, loadAmbience) {
        const assets = [];
        const audioCtx = new AudioContext(); 

        for (const take of takes) {
            let vid = null;
            let img = null;
            let duration = 5.0; 

            let durationBuffer = null;
            let audioBlobToUse = take.audioBlob;
            if (!audioBlobToUse && take.audioBlobUrl) {
                try {
                    const res = await fetch(take.audioBlobUrl);
                    audioBlobToUse = await res.blob();
                } catch(e){}
            }

            if (audioBlobToUse) {
                try {
                    const arrayBuffer = await audioBlobToUse.arrayBuffer();
                    durationBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                } catch(e) { }
            }

            let ttsBuffer = loadTTS ? durationBuffer : null;

            let videoBuffer = null;
            if (loadAmbience && take.videoBlobUrl) {
                try {
                    const response = await fetch(take.videoBlobUrl);
                    const videoBlob = await response.blob();
                    const arrayBuffer = await videoBlob.arrayBuffer();
                    videoBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                } catch(e) { }
            }

            if (take.videoBlobUrl) {
                vid = document.createElement('video');
                vid.src = take.videoBlobUrl;
                vid.muted = true; 
                vid.playsInline = true;
                vid.crossOrigin = "anonymous";
                
                await new Promise((resolve) => {
                    vid.onloadedmetadata = () => resolve();
                    vid.onerror = (e) => resolve();
                });
                
                const vidNatural = vid.duration && isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 4.0;
                if (durationBuffer && durationBuffer.duration > 0) {
                    duration = durationBuffer.duration;
                } else {
                    duration = vidNatural;
                }
            } else if (take.imageBlobUrl) {
                img = new Image();
                img.src = take.imageBlobUrl;
                img.crossOrigin = "anonymous";
                
                await new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                });
                
                duration = (durationBuffer && durationBuffer.duration > 0) ? durationBuffer.duration : 4.0;
            }

            assets.push({
                isImage: !!img,
                imageElement: img,
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
        
        const fontSize = this.width < 1000 ? 40 : 50; 
        
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 6;
        ctx.textAlign = "center";
        
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

        const bottomMargin = this.height * 0.15;
        
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
        
        a.style.display = 'none';
        a.href = url;
        a.download = `Escaleta_Final_${Date.now()}${suffix}.webm`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
};