/**
 * SAGA Anime Studio - Motor de Renderizado e Inferencia de Vídeo en Canvas
 * Renderiza planos animando zooms/paneos (Ken Burns) y exporta MP4/WebM.
 */
class SagaAnimePlayer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.canvas = null;
        this.ctx = null;
        this.shots = [];
        this.currentShotIndex = 0;
        this.isPlaying = false;
        this.animationFrameId = null;
        this.currentAudio = null;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.audioCtx = null;
        this.audioDestination = null;
    }

    init(shots) {
        this.canvas = document.getElementById(this.canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.shots = shots || [];
        this.currentShotIndex = 0;
        this.canvas.width = 1920;
        this.canvas.height = 1080;
        this.drawCurrentFrame(0, 0);
    }

    async playAll(onComplete) {
        if (this.isPlaying) this.stop();
        this.isPlaying = true;

        for (let i = 0; i < this.shots.length; i++) {
            if (!this.isPlaying) break;
            this.currentShotIndex = i;
            this.updateShotUI(i);
            await this.playShot(this.shots[i]);
        }

        this.isPlaying = false;
        if (onComplete) onComplete();
    }

    playShot(shot) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            
            // Imagen fallback si aún no se ha renderizado
            img.src = shot.imageUrl || "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%221920%22%20height%3D%221080%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20fill%3D%22%230f172a%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20fill%3D%22%2394a3b8%22%20font-size%3D%2248%22%20text-anchor%3D%22middle%22%3EPlano%20sin%20renderizar%3C%2Ftext%3E%3C%2Fsvg%3E";

            img.onload = () => {
                let duration = shot.audioDuration || 4.0;
                if (duration < 2.5) duration = 2.5;

                const startTime = performance.now();

                // Reproducir audio sintetizado si existe
                if (shot.audioUrl) {
                    if (this.currentAudio) {
                        this.currentAudio.pause();
                    }
                    this.currentAudio = new Audio(shot.audioUrl);
                    this.currentAudio.play().catch(e => console.warn("Audio autoplay bloqueado:", e));
                }

                const renderStep = (now) => {
                    if (!this.isPlaying) return resolve();
                    const elapsed = (now - startTime) / 1000;
                    const progress = Math.min(elapsed / duration, 1.0);

                    this.renderKenBurnsFrame(img, shot, progress);

                    if (progress < 1.0) {
                        this.animationFrameId = requestAnimationFrame(renderStep);
                    } else {
                        resolve();
                    }
                };

                this.animationFrameId = requestAnimationFrame(renderStep);
            };
        });
    }

    renderKenBurnsFrame(img, shot, progress) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.save();

        const motion = shot.movimiento || 'zoom-in';
        let scale = 1.0;
        let translateX = 0;
        let translateY = 0;

        // Efectos cinematográficos de cámara
        switch (motion) {
            case 'zoom-in':
                scale = 1.0 + (progress * 0.20);
                translateX = (w * (1 - scale)) / 2;
                translateY = (h * (1 - scale)) / 2;
                break;
            case 'zoom-out':
                scale = 1.20 - (progress * 0.20);
                translateX = (w * (1 - scale)) / 2;
                translateY = (h * (1 - scale)) / 2;
                break;
            case 'pan-right':
                scale = 1.15;
                translateX = - (progress * (w * 0.12));
                translateY = (h * (1 - scale)) / 2;
                break;
            case 'pan-left':
                scale = 1.15;
                translateX = - ((1 - progress) * (w * 0.12));
                translateY = (h * (1 - scale)) / 2;
                break;
            case 'pan-up':
                scale = 1.15;
                translateX = (w * (1 - scale)) / 2;
                translateY = - ((1 - progress) * (h * 0.12));
                break;
            case 'pan-down':
                scale = 1.15;
                translateX = (w * (1 - scale)) / 2;
                translateY = - (progress * (h * 0.12));
                break;
            default: // estático
                scale = 1.0;
                translateX = 0;
                translateY = 0;
                break;
        }

        this.ctx.translate(translateX, translateY);
        this.ctx.scale(scale, scale);
        this.ctx.drawImage(img, 0, 0, w, h);
        this.ctx.restore();

        // Subtítulos / Diálogos tipo Anime
        const text = shot.dialogo || shot.cartucho;
        if (text && text.trim() !== "") {
            this.drawAnimeSubtitles(text, shot.cartucho ? "narrador" : "dialogo");
        }
    }

    drawAnimeSubtitles(text, type) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.save();

        if (type === "narrador") {
            // Cuadro de voz en off top-left
            this.ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
            this.ctx.strokeStyle = "#3b82f6";
            this.ctx.lineWidth = 4;

            const boxW = 1200;
            const boxH = 100;
            const boxX = (w - boxW) / 2;
            const boxY = 60;

            this.ctx.fillRect(boxX, boxY, boxW, boxH);
            this.ctx.strokeRect(boxX, boxY, boxW, boxH);

            this.ctx.font = "bold 34px sans-serif";
            this.ctx.fillStyle = "#f8fafc";
            this.ctx.textAlign = "center";
            this.ctx.fillText(text.toUpperCase(), w / 2, boxY + 60);
        } else {
            // Subtítulo Anime inferior estilizado
            this.ctx.font = "black 42px sans-serif";
            this.ctx.textAlign = "center";
            const x = w / 2;
            const y = h - 90;

            // Sombra / Borde
            this.ctx.strokeStyle = "#000000";
            this.ctx.lineWidth = 8;
            this.ctx.strokeText(text.toUpperCase(), x, y);

            // Texto frontal
            this.ctx.fillStyle = "#facc15"; // Amarillo Anime clásico
            this.ctx.fillText(text.toUpperCase(), x, y);
        }

        this.ctx.restore();
    }

    stop() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
    }

    updateShotUI(index) {
        const badge = document.getElementById('anime-shot-indicator');
        if (badge) {
            badge.innerText = `Plano ${index + 1} de ${this.shots.length}`;
        }
    }

    drawCurrentFrame(index = 0, progress = 0) {
        if (!this.shots || !this.shots[index]) return;
        const shot = this.shots[index];
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = shot.imageUrl || "";
        img.onload = () => {
            this.renderKenBurnsFrame(img, shot, progress);
        };
    }

    async exportVideoMP4() {
        if (!this.shots || this.shots.length === 0) {
            return alert("No hay planos cargados para exportar a vídeo.");
        }
        alert("Iniciando renderizado en tiempo real... Por favor no cambies de pestaña hasta finalizar.");

        const stream = this.canvas.captureStream(30); // 30 FPS
        this.recordedChunks = [];

        let options = { mimeType: 'video/webm;codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
        }

        this.mediaRecorder = new MediaRecorder(stream, options);
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) this.recordedChunks.push(e.data);
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${ComicPipeline.state.comicCoverTitle || 'SAGA_Anime'}_Render.webm`;
            a.click();
            URL.revokeObjectURL(url);
            alert("¡Vídeo exportado exitosamente!");
        };

        this.mediaRecorder.start();
        await this.playAll();
        this.mediaRecorder.stop();
    }
}

window.SagaAnimePlayer = SagaAnimePlayer;