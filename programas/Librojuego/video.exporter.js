// Archivo: Librojuego/video.exporter.js

window.VideoExporter = {
    fps: 30,
    activeTasks: new Map(),

    getSettings() {
        const format = document.getElementById('vid-format').value;
        const res = parseInt(document.getElementById('vid-res').value);
        const showSubs = document.getElementById('vid-subs-switch') ? document.getElementById('vid-subs-switch').checked : true;
        const animStyle = document.getElementById('vid-text-anim') ? document.getElementById('vid-text-anim').value : 'cascada';
        
        let w, h;
        
        if (format === 'landscape') {
            h = res;
            w = Math.round(res * (16/9));
        } else if (format === 'portrait') {
            w = res;
            h = Math.round(res * (16/9));
        } else {
            w = res; 
            h = res;
        }

        w = w % 2 !== 0 ? w + 1 : w;
        h = h % 2 !== 0 ? h + 1 : h;
        
        return { width: w, height: h, showSubs: showSubs, animStyle: animStyle };
    },

    initTaskUI() {
        let container = document.getElementById('video-export-tasks');
        if (!container) {
            container = document.createElement('div');
            container.id = 'video-export-tasks';
            container.className = 'fixed bottom-8 left-8 z-[200] flex flex-col gap-3 w-80 pointer-events-none';
            document.body.appendChild(container);
        }
        return container;
    },

    startTask(taskId, taskName) {
        this.initTaskUI();
        const container = document.getElementById('video-export-tasks');
        
        const taskEl = document.createElement('div');
        taskEl.id = `vtask-${taskId}`;
        taskEl.className = 'bg-white border border-gray-200 rounded-xl p-4 shadow-2xl pointer-events-auto transition-all transform translate-x-0';
        taskEl.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <span class="text-[10px] font-bold uppercase text-indigo-600 truncate flex-1"><i class="fa-solid fa-film fa-spin mr-1"></i> ${taskName}</span>
                <span id="vtask-pct-${taskId}" class="text-[10px] font-bold text-gray-500 w-8 text-right">0%</span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden">
                <div id="vtask-bar-${taskId}" class="bg-indigo-500 h-full rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
            <div id="vtask-msg-${taskId}" class="text-[9px] text-gray-400 font-mono truncate">Iniciando...</div>
        `;
        container.appendChild(taskEl);
        this.activeTasks.set(taskId, { name: taskName });
    },

    updateTask(taskId, title, pct, subMsg) {
        const bar = document.getElementById(`vtask-bar-${taskId}`);
        const pctText = document.getElementById(`vtask-pct-${taskId}`);
        const msg = document.getElementById(`vtask-msg-${taskId}`);
        
        if (bar) bar.style.width = `${Math.round(pct)}%`;
        if (pctText) pctText.innerText = `${Math.round(pct)}%`;
        if (msg) msg.innerText = `[${title}] ${subMsg}`;
    },

    finishTask(taskId, success = true, errorMsg = "") {
        const el = document.getElementById(`vtask-${taskId}`);
        if (el) {
            if (success) {
                el.classList.replace('border-gray-200', 'border-emerald-500');
                el.querySelector('.bg-indigo-500').classList.replace('bg-indigo-500', 'bg-emerald-500');
                el.querySelector('.text-indigo-600').classList.replace('text-indigo-600', 'text-emerald-600');
                el.querySelector('.text-indigo-600 i')?.classList.replace('fa-spin', 'fa-bounce');
                document.getElementById(`vtask-msg-${taskId}`).innerText = "¡Exportación completada!";
                document.getElementById(`vtask-pct-${taskId}`).innerText = "100%";
            } else {
                el.classList.replace('border-gray-200', 'border-red-500');
                el.querySelector('.bg-indigo-500').classList.replace('bg-indigo-500', 'bg-red-500');
                el.querySelector('.text-indigo-600').classList.replace('text-indigo-600', 'text-red-600');
                document.getElementById(`vtask-msg-${taskId}`).innerText = errorMsg;
                document.getElementById(`vtask-pct-${taskId}`).innerText = "ERROR";
            }
            
            setTimeout(() => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                setTimeout(() => el.remove(), 500);
            }, success ? 5000 : 10000);
        }
        this.activeTasks.delete(taskId);
    },

    async exportCurrentNode() {
        if (!Core.selectedNodeId) return alert("Selecciona un nodo en el lienzo o editor primero.");
        const node = Core.getNode(Core.selectedNodeId);
        if (!node) return alert("Nodo no válido.");
        
        const taskId = `task_${node.id}_${Date.now()}`;
        this.renderVideo([node], `NODO_${node.id}`, taskId, `Clip: ${node.id}`);
    },

    async exportAllNodesSequential() {
        const nodes = Core.bookData?.nodes || Core.book?.nodes || [];
        if (nodes.length === 0) return alert("El librojuego no tiene nodos.");
        
        const confirmExport = confirm(`¿Estás seguro de que quieres exportar los ${nodes.length} nodos como vídeos SEPARADOS? Esto procesará uno tras otro.`);
        if (!confirmExport) return;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const taskId = `task_node_${node.id}_${Date.now()}`;
            
            // Renderizamos un solo nodo y esperamos a que termine antes de pasar al siguiente
            await this.renderVideo([node], `NODO_${node.id}`, taskId, `Nodo ${i+1}/${nodes.length}: ${node.id}`);
            
            // Pausa de 1.5s entre vídeos para dar un respiro al navegador y liberar memoria
            await new Promise(r => setTimeout(r, 1500));
        }
        
        alert("¡Todos los vídeos han sido exportados por separado con éxito!");
    },

    async renderVideo(nodes, filenamePrefix, taskId, taskName) {
        if (typeof WebMMuxer === 'undefined') {
            return alert("El motor WebMMuxer no está cargado. Asegúrate de tener conexión a Internet y recarga la página.");
        }

        const settings = this.getSettings();
        
        this.startTask(taskId, taskName);
        
        const canvas = document.createElement('canvas');
        canvas.width = settings.width;
        canvas.height = settings.height;
        const ctx = canvas.getContext('2d', { alpha: false });

        try {
            this.updateTask(taskId, "PREPARANDO ASSETS", 0, "Cargando imágenes, voces y subtítulos...");
            const assets = await this.preloadAssets(nodes, taskId, settings.animStyle);
            const rawDuration = assets.reduce((acc, curr) => acc + curr.duration, 0);

            if (rawDuration === 0) throw new Error("Duración total es 0. Faltan imágenes o audio.");

            // Asegurar que el vídeo dure como mínimo 61 segundos (1 minuto y 1 segundo)
            const totalDuration = Math.max(rawDuration, 61);

            this.updateTask(taskId, "INICIANDO MOTORES", 5, `Resolución: ${settings.width}x${settings.height}`);

            const sampleRate = 48000;
            const muxer = new WebMMuxer.Muxer({
                target: new WebMMuxer.ArrayBufferTarget(),
                video: { codec: 'V_VP9', width: settings.width, height: settings.height, frameRate: this.fps },
                audio: { codec: 'A_OPUS', sampleRate: sampleRate, numberOfChannels: 2 }
            });

            const bitrate = Math.floor(settings.width * settings.height * this.fps * 0.15);
            
            const videoEncoder = new VideoEncoder({
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
                error: e => console.error(`[Task ${taskId}] Video Encoder Error:`, e)
            });
            videoEncoder.configure({ codec: 'vp09.00.10.08', width: settings.width, height: settings.height, bitrate });

            const audioEncoder = new AudioEncoder({
                output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
                error: e => console.error(`[Task ${taskId}] Audio Encoder Error:`, e)
            });
            audioEncoder.configure({ codec: 'opus', sampleRate, numberOfChannels: 2, bitrate: 192000 });

            // El canvas de audio se extiende hasta el totalDuration ajustado, rellenando con silencio si es necesario.
            const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate) + sampleRate, sampleRate);
            let currentTime = 0;

            assets.forEach(asset => {
                if (asset.audioBuffer) {
                    const source = offlineCtx.createBufferSource();
                    source.buffer = asset.audioBuffer;
                    source.connect(offlineCtx.destination);
                    source.start(currentTime);
                }
                asset.startTime = currentTime;
                currentTime += asset.duration;
            });

            this.updateTask(taskId, "MEZCLANDO AUDIO", 10, "Generando pista maestra...");
            const mixedAudioBuffer = await offlineCtx.startRendering();

            let globalTime = 0;
            const frameDuration = 1 / this.fps;
            const totalFrames = Math.ceil(totalDuration * this.fps);
            let currentAssetIndex = 0;

            for (let f = 0; f < totalFrames; f++) {
                if (f % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    this.updateTask(taskId, "RENDERIZANDO", 10 + ((f / totalFrames) * 80), `Frame ${f}/${totalFrames}`);
                }

                if (globalTime >= assets[currentAssetIndex].startTime + assets[currentAssetIndex].duration) {
                    if (currentAssetIndex < assets.length - 1) currentAssetIndex++;
                }
                
                const asset = assets[currentAssetIndex];

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, settings.width, settings.height);

                if (asset.img && asset.img.width > 0) {
                    const scale = Math.max(settings.width / asset.img.width, settings.height / asset.img.height);
                    const w = asset.img.width * scale;
                    const h = asset.img.height * scale;
                    const x = (settings.width - w) / 2;
                    const y = (settings.height - h) / 2;
                    ctx.drawImage(asset.img, x, y, w, h);
                }

                if (settings.showSubs) {
                    const localTime = globalTime - asset.startTime;
                    // Congelar la animación si sobrepasamos la duración original del asset (relleno silencioso)
                    const displayTime = Math.min(localTime, asset.duration);
                    this.drawTextOverlay(ctx, asset, settings.width, settings.height, displayTime, settings.animStyle);
                }

                const timestamp = Math.round(globalTime * 1_000_000);
                const frame = new VideoFrame(canvas, { timestamp });
                const isKeyFrame = (f % (this.fps * 2) === 0);

                if (videoEncoder.encodeQueueSize > 15) await new Promise(r => setTimeout(r, 10));
                videoEncoder.encode(frame, { keyFrame: isKeyFrame });
                frame.close();

                globalTime += frameDuration;
            }

            this.updateTask(taskId, "CODIFICANDO AUDIO", 95, "Inyectando pista maestra...");
            await this.encodeAudio(audioEncoder, mixedAudioBuffer, taskId);

            await videoEncoder.flush();
            await audioEncoder.flush();
            muxer.finalize();

            const blob = new Blob([muxer.target.buffer], { type: 'video/webm' });
            this.download(blob, filenamePrefix);

            this.finishTask(taskId, true);

        } catch (error) {
            console.error(`[Task ${taskId}] Caos Crítico:`, error);
            this.finishTask(taskId, false, error.message);
        }
    },

    async preloadAssets(nodes, taskId, animStyle) {
        const assets = [];
        const audioCtx = new AudioContext();
        
        for (let i = 0; i < nodes.length; i++) {
            await new Promise(r => setTimeout(r, 0));
            this.updateTask(taskId, "PREPARANDO ASSETS", (i / nodes.length) * 10, `Leyendo Nodo ${i+1}/${nodes.length}...`);

            const node = nodes[i];
            let img = null;
            let audioBuffer = null;
            let duration = 6.0;

            if (node._cachedImageUrl) {
                img = new Image();
                img.crossOrigin = "anonymous";
                img.src = node._cachedImageUrl;
                await new Promise(r => { img.onload = r; img.onerror = r; });
            }

            if (node._cachedAudioUrl) {
                try {
                    const response = await fetch(node._cachedAudioUrl);
                    const arrayBuffer = await response.arrayBuffer();
                    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    duration = audioBuffer.duration + 1.0;
                } catch(e) {
                    console.warn(`Error al precargar audio:`, e);
                }
            }

            // Reparto de palabras según el estilo de animación
            let maxWordsPerChunk = 14;
            if (animStyle === 'valhausen') maxWordsPerChunk = 4;
            if (animStyle === 'cascada') maxWordsPerChunk = 5;

            const words = (node.text || "").replace(/\n/g, ' ').split(' ').filter(w => w.trim() !== '');
            
            const chunks = [];
            let currentChunk = [];
            for (let w of words) {
                currentChunk.push(w);
                if (currentChunk.length >= maxWordsPerChunk) {
                    chunks.push(currentChunk.join(' '));
                    currentChunk = [];
                }
            }
            if (currentChunk.length > 0) chunks.push(currentChunk.join(' '));

            // Metadatos de Aleatoriedad para Valhausen
            const valhausenProps = chunks.map(() => ({
                rx: (Math.random() * 0.5) - 0.25,
                ry: (Math.random() * 0.5) - 0.25,
                rot: (Math.random() * 0.16) - 0.08,
                scale: (Math.random() * 0.3) + 0.9
            }));

            // Lógica de llenado de huecos y sobreposición para CASCADA
            let cascadeProps = [];
            if (animStyle === 'cascada') {
                const slotsAvailable = [0, 1, 2, 3, 4, 5];
                let lastSlot = -1;
                cascadeProps = chunks.map((chunk, idx) => {
                    let slot;
                    do {
                        slot = slotsAvailable[Math.floor(Math.random() * slotsAvailable.length)];
                    } while (slot === lastSlot);
                    lastSlot = slot;
        
                    return {
                        startTime: idx * (duration / chunks.length),
                        duration: Math.min((duration / chunks.length) * 2.5, duration), // Stays 2.5x longer to accumulate!
                        slot: slot,
                        rx: (Math.random() * 0.4) - 0.2
                    };
                });
            }

            assets.push({
                node: node,
                img: img,
                audioBuffer: audioBuffer,
                duration: duration,
                textChunks: chunks,
                fullText: words.join(' '),
                valhausenProps: valhausenProps,
                cascadeProps: cascadeProps
            });
        }
        
        audioCtx.close();
        return assets;
    },

    drawTextOverlay(ctx, asset, width, height, localTime, animStyle) {
        const fullText = asset.fullText;
        const textChunks = asset.textChunks;
        const totalDuration = asset.duration;

        if (!fullText) return;

        // ==========================================
        // CASCADA ACUMULATIVA (Letras Blancas / Llenar Huecos)
        // ==========================================
        if (animStyle === 'cascada') {
            const vFontSize = Math.max(26, Math.floor(height * 0.045));
            ctx.font = `900 ${vFontSize}px 'Inter', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.shadowColor = 'rgba(0,0,0,0.9)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            asset.textChunks.forEach((chunk, idx) => {
                const props = asset.cascadeProps[idx];
                const startT = props.startTime;
                const endT = startT + props.duration;

                // Si está dentro de su ventana de vida (más tiempo para desvanecerse)
                if (localTime >= startT && localTime <= endT + 1.0) {
                    let chunkAlpha = 1;
                    if (localTime > endT) {
                        chunkAlpha = Math.max(0, 1 - (localTime - endT)); // fade out sobre 1s
                    }
                    
                    if (chunkAlpha <= 0) return;

                    const drawX = (width / 2) + (width * props.rx);
                    // Reparte los huecos entre el 15% y 85% de la pantalla para llenar todo aleatoriamente
                    const slotSpacing = (height * 0.7) / 5; 
                    const drawY = (height * 0.15) + (props.slot * slotSpacing);

                    const words = chunk.split(' ');
                    
                    let totalWidth = 0;
                    const wordWidths = words.map(w => {
                        const wW = ctx.measureText(w + ' ').width;
                        totalWidth += wW;
                        return wW;
                    });

                    let currentX = drawX - (totalWidth / 2);

                    words.forEach((word, wIdx) => {
                        // Delay por cada palabra para hacer el efecto Cascada de izquierda a derecha
                        const wordDelay = startT + (wIdx * 0.1); 
                        let wordAlpha = 0;
                        if (localTime >= wordDelay) {
                            wordAlpha = Math.min(1, (localTime - wordDelay) / 0.15); // Fade in suave (150ms)
                        }

                        const finalAlpha = wordAlpha * chunkAlpha;

                        if (finalAlpha > 0) {
                            ctx.save();
                            ctx.globalAlpha = finalAlpha;
                            
                            // Animación "Suavisimoo" entrando deslizada desde la derecha
                            const slideX = 30 * (1 - wordAlpha);
                            const finalX = currentX + (wordWidths[wIdx] / 2) - slideX;
                            
                            ctx.lineWidth = vFontSize * 0.2;
                            ctx.strokeStyle = '#000000';
                            ctx.strokeText(word, finalX, drawY);

                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillText(word, finalX, drawY);
                            
                            ctx.restore();
                        }
                        currentX += wordWidths[wIdx];
                    });
                }
            });
            return;
        }

        // ==========================================
        // DISEÑO VALHAUSEN (Ultra Potente)
        // ==========================================
        if (animStyle === 'valhausen') {
            if (!textChunks || textChunks.length === 0) return;

            const chunkDuration = totalDuration / textChunks.length;
            let chunkIndex = Math.floor(localTime / chunkDuration);
            if (chunkIndex >= textChunks.length) chunkIndex = textChunks.length - 1;
            if (chunkIndex < 0) chunkIndex = 0;

            const activeText = textChunks[chunkIndex];
            const localChunkTime = localTime - (chunkIndex * chunkDuration);
            const props = asset.valhausenProps[chunkIndex];

            const drawX = (width / 2) + (width * props.rx);
            const drawY = (height / 2) + (height * props.ry);

            const vFontSize = Math.max(35, Math.floor(height * 0.08)); 
            ctx.font = `900 ${vFontSize}px 'Inter', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const progress = localChunkTime / chunkDuration;
            let popScale = 1;
            if (progress < 0.15) {
                popScale = 0.5 + (progress / 0.15) * 0.5;
            }
            const driftY = drawY - (progress * 15);
            const finalScale = props.scale * popScale;

            ctx.save();
            ctx.translate(drawX, driftY);
            ctx.rotate(props.rot);
            ctx.scale(finalScale, finalScale);

            const vWords = activeText.split(' ');
            let vLines = [];
            if (vWords.length > 2) {
                vLines.push(vWords.slice(0, 2).join(' '));
                if (vWords.length > 4) {
                    vLines.push(vWords.slice(2, 4).join(' '));
                    vLines.push(vWords.slice(4).join(' '));
                } else {
                    vLines.push(vWords.slice(2).join(' '));
                }
            } else {
                vLines.push(activeText);
            }

            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;

            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 8;

            const colors = ['#FFFFFF', '#FFDF00', '#00FFFF', '#FF3366', '#55FF55'];
            const fillColor = colors[chunkIndex % colors.length];

            vLines.forEach((line, idx) => {
                const yOffset = (idx - (vLines.length-1)/2) * (vFontSize * 1.1);
                
                ctx.lineWidth = vFontSize * 0.35;
                ctx.strokeStyle = '#000000';
                ctx.strokeText(line, 0, yOffset);

                ctx.lineWidth = vFontSize * 0.1;
                ctx.strokeStyle = '#222222';
                ctx.strokeText(line, 0, yOffset);

                ctx.fillStyle = fillColor;
                ctx.fillText(line, 0, yOffset);
            });

            ctx.restore();
            return;
        }

        // ==========================================
        // DISEÑO ESTÁNDAR PARA EL RESTO DE ESTILOS
        // ==========================================
        const fontSize = Math.max(22, Math.floor(height * 0.04));
        ctx.font = `bold ${fontSize}px 'Inter', sans-serif`;

        const gradHeight = fontSize * 3;
        const gradY = height - gradHeight;
        const grad = ctx.createLinearGradient(0, gradY, 0, height);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.3, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, gradY, width, gradHeight);

        const baseY = height - (fontSize * 1.5);

        // MARQUESINA
        if (animStyle === 'scroll') {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            const textWidth = ctx.measureText(fullText).width;
            
            const startX = width;
            const endX = -textWidth;
            const progress = localTime / totalDuration;
            const drawX = startX + (endX - startX) * progress;

            ctx.save();
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.strokeText(fullText, drawX, baseY);
            ctx.fillStyle = 'white';
            ctx.fillText(fullText, drawX, baseY);
            ctx.restore();
            return;
        }

        // ANIMACIONES CLÁSICAS (Sutil, Elegante, Typewriter, Vacilona)
        if (!textChunks || textChunks.length === 0) return;

        const chunkDuration = totalDuration / textChunks.length;
        let chunkIndex = Math.floor(localTime / chunkDuration);
        if (chunkIndex >= textChunks.length) chunkIndex = textChunks.length - 1;
        if (chunkIndex < 0) chunkIndex = 0;

        const activeText = textChunks[chunkIndex];
        const localChunkTime = localTime - (chunkIndex * chunkDuration);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const x = width / 2;
        
        let alpha = 1;
        let drawY = baseY;
        let displayText = activeText;
        let scale = 1;
        let rot = 0;

        if (animStyle === 'sutil') {
            alpha = Math.min(1, localChunkTime / 0.3);
            if (chunkDuration - localChunkTime < 0.3) {
                alpha = Math.min(1, (chunkDuration - localChunkTime) / 0.3);
            }
        } 
        else if (animStyle === 'elegante') {
            alpha = Math.min(1, localChunkTime / 0.4);
            if (chunkDuration - localChunkTime < 0.3) {
                alpha = Math.min(1, (chunkDuration - localChunkTime) / 0.3);
            }
            const slide = Math.max(0, 15 * (1 - (localChunkTime / 0.4)));
            drawY = baseY + slide;
        } 
        else if (animStyle === 'typewriter') {
            const chars = Math.floor((localChunkTime / (chunkDuration * 0.7)) * activeText.length);
            displayText = activeText.substring(0, Math.min(activeText.length, chars));
        } 
        else if (animStyle === 'vacilona') {
            if (localChunkTime < 0.4) {
                const t = localChunkTime / 0.4;
                scale = 1 + Math.sin(t * Math.PI) * 0.15 * (1 - t);
                rot = Math.sin(t * Math.PI * 2) * 0.02 * (1 - t);
            }
            alpha = Math.min(1, localChunkTime / 0.2);
            if (chunkDuration - localChunkTime < 0.2) {
                alpha = Math.min(1, (chunkDuration - localChunkTime) / 0.2);
            }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        
        ctx.translate(x, drawY);
        if (scale !== 1 || rot !== 0) {
            ctx.scale(scale, scale);
            ctx.rotate(rot);
        }
        
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText(displayText, 0, 0);
        
        ctx.fillStyle = 'white';
        ctx.fillText(displayText, 0, 0);
        
        ctx.restore();
    },

    async encodeAudio(encoder, buffer, taskId) {
        const channels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const length = buffer.length;
        const dataL = buffer.getChannelData(0);
        const dataR = channels > 1 ? buffer.getChannelData(1) : dataL;

        const chunkSize = 48000;
        let offset = 0;
        let iteration = 0;

        while (offset < length) {
            if (iteration % 10 === 0) {
                await new Promise(r => setTimeout(r, 0));
                this.updateTask(taskId, "CODIFICANDO AUDIO", 90 + ((offset / length) * 10), `Procesando ondas...`);
            }

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
            iteration++;
        }
    },

    download(blob, filenamePrefix) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filenamePrefix}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 200);
    }
};