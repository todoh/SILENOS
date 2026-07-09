// --- cronologia/escaleta/player.js ---
// REPRODUCTOR DE SECUENCIA Y PREVISUALIZACIÓN AVANZADA

const SequencePlayer = {
    isOpen: false,
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
    currentTakeIndex: 0,
    takesMap: [],
    activeTakes: [],
    animFrame: null,
    lastTimeMs: 0,
    loadedTakeId: null,

    async openModal() {
        this.activeTakes = EscaletaCore.data.takes.filter(t => t.video_file || t.videoBlobUrl || t.image_file || t.imageBlobUrl);
        if(this.activeTakes.length === 0) return alert("No hay tomas con recursos visuales renderizados para reproducir.");

        EscaletaUI.toggleLoading(true, "CARGANDO REPRODUCTOR", "Calculando duraciones de medios exactas...");

        for (let t of this.activeTakes) {
            // Forzamos recálculo SIEMPRE para evitar cachés obsoletos que descuadren la regla audio→duración
            t.cachedDurations = { video: 0, audio: 0 };
            
            if (t.videoBlobUrl) {
                t.cachedDurations.video = await this.getMediaDuration(t.videoBlobUrl, 'video');
            } else if (t.imageBlobUrl) {
                t.cachedDurations.video = 0; // imágenes no tienen duración intrínseca
            }
            
            if (t.audioBlobUrl) {
                t.cachedDurations.audio = await this.getMediaDuration(t.audioBlobUrl, 'audio');
            }
        }

        EscaletaUI.toggleLoading(false);

        document.getElementById('seq-video').loop = true;

        this.buildTimeline();
        document.getElementById('seq-player-modal').classList.remove('hidden');
        this.isOpen = true;
        
        this.startLoop();
        this.updateTracks(); 
        this.onVolume(document.getElementById('seq-volume').value);
        
        this.seek(0);
    },

    closeModal() {
        this.pause();
        this.stopLoop();
        document.getElementById('seq-player-modal').classList.add('hidden');
        this.isOpen = false;
        this.loadedTakeId = null;
    },

    getMediaDuration(url, type) {
        return new Promise(async resolve => {
            if (type === 'audio') {
                try {
                    // Decodificación forzosa a bajo nivel para evitar el bug de "Infinity" de Chrome
                    const response = await fetch(url);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const decodedData = await audioCtx.decodeAudioData(arrayBuffer);
                    resolve(decodedData.duration);
                } catch(e) {
                    console.warn("Fallo en AudioContext, usando fallback...", e);
                    const el = new Audio(url);
                    el.addEventListener('loadedmetadata', () => {
                        if (el.duration === Infinity) {
                            el.currentTime = 1e101;
                            el.addEventListener('timeupdate', () => {
                                el.currentTime = 0;
                                resolve(el.duration);
                            }, {once: true});
                        } else {
                            resolve(el.duration && isFinite(el.duration) ? el.duration : 0);
                        }
                    });
                    el.addEventListener('error', () => resolve(0));
                }
                return;
            }

            // Para video
            const el = document.createElement(type);
            el.src = url;
            el.preload = 'auto';
            
            const onReady = () => {
                el.removeEventListener('loadedmetadata', onReady);
                resolve(el.duration && isFinite(el.duration) ? el.duration : 5.0);
            };
            
            el.addEventListener('loadedmetadata', onReady);
            el.onerror = () => resolve(5.0);
            
            setTimeout(() => {
                el.removeEventListener('loadedmetadata', onReady);
                resolve(5.0);
            }, 2000);

            try { el.load(); } catch(e){}
        });
    },

    buildTimeline() {
        const useVoice = document.getElementById('seq-chk-voice').checked;
        this.takesMap = [];
        let time = 0;
        
        const debugRows = [];
        for (let t of this.activeTakes) {
            const d = t.cachedDurations;
            let dur;
            let regla;
            
            // REGLA: la imagen/video en pantalla dura EXACTAMENTE lo que dura el audio de voz.
            // Si no hay voz: imagen = 4s, video = su duración natural.
            if (d.audio > 0) {
                dur = d.audio;
                regla = "VOZ";
            } else if (t.imageBlobUrl && !t.videoBlobUrl) {
                dur = 4.0;
                regla = "IMG-SIN-VOZ(4s)";
            } else {
                dur = d.video > 0 ? d.video : 4.0;
                regla = "VIDEO-SIN-VOZ";
            }
            
            this.takesMap.push({ take: t, start: time, end: time + dur, duration: dur });
            debugRows.push({ id: t.id, tipo: t.videoBlobUrl ? 'video' : 'imagen', vid: +d.video.toFixed(2), voz: +d.audio.toFixed(2), final: +dur.toFixed(2), regla });
            time += dur;
        }
        
        console.log("[SequencePlayer] Timeline construida — regla: la VOZ dicta la duración");
        if (console.table) console.table(debugRows); else console.log(debugRows);
        console.log(`[SequencePlayer] Duración total: ${time.toFixed(2)}s`);
        
        this.totalDuration = time;
        document.getElementById('seq-progress').max = this.totalDuration;
        document.getElementById('seq-time-total').innerText = this.formatTime(this.totalDuration);
        
        if (this.currentTime > this.totalDuration) this.currentTime = this.totalDuration;
        
        this.updateIndexFromTime();
    },

    updateIndexFromTime() {
        this.currentTakeIndex = 0;
        for(let i = 0; i < this.takesMap.length; i++) {
            if (this.currentTime >= this.takesMap[i].start && this.currentTime < this.takesMap[i].end) {
                this.currentTakeIndex = i;
                break;
            }
        }
        if (this.currentTime === this.totalDuration && this.takesMap.length > 0) {
            this.currentTakeIndex = this.takesMap.length - 1;
        }
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    },

    togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play();
    },

    async play() {
        if (this.currentTime >= this.totalDuration) {
            this.seek(0);
            return;
        }
        this.isPlaying = true;
        document.getElementById('seq-btn-play').innerHTML = '<i class="fa-solid fa-pause"></i>';
        this.lastTimeMs = performance.now();
        
        this.loadCurrentTake(true);
    },

    pause() {
        this.isPlaying = false;
        document.getElementById('seq-btn-play').innerHTML = '<i class="fa-solid fa-play"></i>';
        const v = document.getElementById('seq-video');
        if (v.getAttribute('src')) v.pause();
        document.getElementById('seq-audio').pause();
    },

    seek(time) {
        this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
        this.updateIndexFromTime();
        this.loadCurrentTake(true);
        this.updateUI();
    },

    onSeek(val) {
        this.seek(parseFloat(val));
    },

    onVolume(val) {
        const vol = parseFloat(val) / 100;
        document.getElementById('seq-video').volume = vol;
        document.getElementById('seq-audio').volume = vol;
    },

    updateTracks() {
        this.buildTimeline();

        const v = document.getElementById('seq-video');
        const a = document.getElementById('seq-audio');
        const sub = document.getElementById('seq-subtitles');
        
        v.muted = !document.getElementById('seq-chk-ambience').checked;
        a.muted = !document.getElementById('seq-chk-voice').checked;
        
        if (document.getElementById('seq-chk-subs').checked) {
            sub.classList.remove('hidden');
        } else {
            sub.classList.add('hidden');
        }

        this.loadCurrentTake(true);
        this.updateUI();
    },

    updateSubtitle(text) {
        document.getElementById('seq-subtitles').innerText = text || "";
    },

    loadCurrentTake(forceScrub = false) {
        if (this.takesMap.length === 0) return;
        
        const map = this.takesMap[this.currentTakeIndex];
        const v = document.getElementById('seq-video');
        const img = document.getElementById('seq-image');
        const a = document.getElementById('seq-audio');
        
        const localTime = this.currentTime - map.start;

        if (this.loadedTakeId !== map.take.id) {
            this.loadedTakeId = map.take.id;
            
            // Visual Swap
            if (map.take.videoBlobUrl) {
                if (v.src !== map.take.videoBlobUrl) {
                    v.src = map.take.videoBlobUrl;
                    v.loop = true;
                    v.load();
                }
                v.classList.remove('hidden');
                img.classList.add('hidden');
                img.src = '';
            } else if (map.take.imageBlobUrl) {
                v.removeAttribute('src');
                v.pause();
                v.load();
                v.classList.add('hidden');
                img.src = map.take.imageBlobUrl;
                img.classList.remove('hidden');
            }
            
            // Audio Swap
            if (map.take.audioBlobUrl) {
                if (a.src !== map.take.audioBlobUrl) {
                    a.src = map.take.audioBlobUrl;
                    a.load();
                }
            } else {
                a.removeAttribute('src');
                a.load();
            }
            
            this.updateSubtitle(map.take.narration_text);

            // Iniciar Video Inicial
            if (map.take.videoBlobUrl) {
                const vidDur = map.take.cachedDurations.video && isFinite(map.take.cachedDurations.video) && map.take.cachedDurations.video > 0.5 ? map.take.cachedDurations.video : 5.0;
                const playVideo = () => {
                    try { v.currentTime = localTime % vidDur; } catch(e){}
                    if (this.isPlaying) {
                        const p = v.play();
                        if(p !== undefined) p.catch(e=>{});
                    }
                };
                if (v.readyState >= 2) playVideo();
                else {
                    const onVidReady = () => {
                        v.removeEventListener('canplay', onVidReady);
                        playVideo();
                    };
                    v.addEventListener('canplay', onVidReady);
                }
            }

            // Iniciar Audio
            if (a.getAttribute('src')) {
                const playAudio = () => {
                    const audioLimit = map.take.cachedDurations.audio > 0.1 ? map.take.cachedDurations.audio : 999;
                    if (localTime < audioLimit) {
                        try { a.currentTime = localTime; } catch(e){}
                        // BLOQUEO DE LOOP: Solo hacer play si NO ha terminado
                        if (this.isPlaying && !a.ended) {
                            const p = a.play();
                            if(p !== undefined) p.catch(e=>{});
                        }
                    } else {
                        a.pause();
                    }
                };
                
                if (a.readyState >= 2) playAudio();
                else {
                    const onAudReady = () => {
                        a.removeEventListener('canplay', onAudReady);
                        playAudio();
                    };
                    a.addEventListener('canplay', onAudReady);
                }
            }
            
        } else if (forceScrub) {
            
            if (map.take.videoBlobUrl) {
                const vidDur = map.take.cachedDurations.video && isFinite(map.take.cachedDurations.video) && map.take.cachedDurations.video > 0.5 ? map.take.cachedDurations.video : 5.0;
                try { 
                    const expectedVidTime = localTime % vidDur;
                    if (Math.abs(v.currentTime - expectedVidTime) > 0.25) {
                        v.currentTime = expectedVidTime; 
                    }
                } catch(e){}
                if (this.isPlaying && v.paused) {
                    const p = v.play();
                    if(p !== undefined) p.catch(e=>{});
                }
            }
            
            if (a.getAttribute('src')) {
                const audioLimit = map.take.cachedDurations.audio > 0.1 ? map.take.cachedDurations.audio : 999;
                if (localTime < audioLimit) {
                    try { 
                        if (Math.abs(a.currentTime - localTime) > 0.25) {
                            a.currentTime = localTime; 
                        }
                    } catch(e){}
                    if (this.isPlaying && a.paused && !a.ended) {
                        const p = a.play();
                        if(p !== undefined) p.catch(e=>{});
                    }
                } else if (!a.paused) {
                    a.pause();
                }
            }
        }
    },

    startLoop() {
        this.lastTimeMs = performance.now();
        const loop = (now) => {
            if (this.isPlaying && this.takesMap.length > 0) {
                const dt = (now - this.lastTimeMs) / 1000;
                this.currentTime += dt;
                
                let map = this.takesMap[this.currentTakeIndex];
                
                if (this.currentTime >= map.end) {
                    if (this.currentTakeIndex < this.takesMap.length - 1) {
                        this.currentTakeIndex++;
                        const a = document.getElementById('seq-audio');
                        if (a) a.pause();
                        
                        this.loadCurrentTake(true); 
                        map = this.takesMap[this.currentTakeIndex];
                    } else {
                        this.currentTime = this.totalDuration;
                        this.pause();
                        this.updateUI();
                        this.lastTimeMs = now;
                        this.animFrame = requestAnimationFrame(loop);
                        return;
                    }
                }

                const localTime = this.currentTime - map.start;
                
                const v = document.getElementById('seq-video');
                if (v && map.take.videoBlobUrl) {
                    const vidDur = map.take.cachedDurations.video && isFinite(map.take.cachedDurations.video) && map.take.cachedDurations.video > 0.5 ? map.take.cachedDurations.video : 5.0;
                    const expectedVidTime = localTime % vidDur;
                    
                    if (Math.abs(v.currentTime - expectedVidTime) > 0.25) {
                        try { v.currentTime = expectedVidTime; } catch(e){}
                    }
                    if (v.paused) {
                        const p = v.play();
                        if(p !== undefined) p.catch(e=>{});
                    }
                }

                const a = document.getElementById('seq-audio');
                if (a && a.getAttribute('src')) {
                    const audioLimit = map.take.cachedDurations.audio > 0.1 ? map.take.cachedDurations.audio : 999;
                    if (localTime >= audioLimit) {
                        if (!a.paused) a.pause();
                    } else {
                        // Sincronización suave
                        if (Math.abs(a.currentTime - localTime) > 0.3) {
                            try { a.currentTime = localTime; } catch(e){}
                        }
                        // ANTI-LOOP: Solo reanuda si no ha llegado al final nativo (!a.ended)
                        if (a.paused && !a.ended) {
                            const p = a.play();
                            if(p !== undefined) p.catch(e=>{});
                        }
                    }
                }
                
                this.updateUI();
            }
            this.lastTimeMs = now;
            this.animFrame = requestAnimationFrame(loop);
        };
        this.animFrame = requestAnimationFrame(loop);
    },
    
    stopLoop() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
    },

    updateUI() {
        document.getElementById('seq-progress').value = this.currentTime;
        document.getElementById('seq-time-current').innerText = this.formatTime(this.currentTime);
    }
};

window.SequencePlayer = SequencePlayer;