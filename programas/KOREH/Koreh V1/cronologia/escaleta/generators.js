// --- cronologia/escaleta/generators.js ---
// WRAPPERS DE GENERACIÓN (GROK VIDEO & OPENAI TTS)

const Generators = {
    selectedVoice: 'alloy',

    setVoice(voice) {
        this.selectedVoice = voice;
        // Actualizar UI botones
        document.querySelectorAll('.voice-btn').forEach(btn => {
            if(btn.dataset.voice === voice) btn.classList.add('active');
            else btn.classList.remove('active');
        });
    },

    // --- VIDEO GENERATION ---
    async generateVideoForTake(takeId) {
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if (!take) return;
        if (!ai.apiKey) return alert("Requiere Login");

        const model = document.getElementById('video-model-select').value;
        const card = document.getElementById(`card-${takeId}`);
        const statusBadge = card.querySelector('.video-status');
        const imgPreview = card.querySelector('.take-video-preview');
        
        // UI Loading
        if(statusBadge) { statusBadge.className = 'status-badge loading'; statusBadge.innerText = 'GENERANDO...'; }
        
        try {
            const prompt = encodeURIComponent(take.visual_prompt);
            const seed = Math.floor(Math.random() * 1000000);
            
            // URL Construction (Method GET como en Video Grok Weno)
            let url = `https://gen.pollinations.ai/image/${prompt}?model=${model}&width=1280&height=720&aspect_ratio=16:9&seed=${seed}&nologo=true&duration=5&key=${ai.apiKey}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error("API Error");

            const blob = await response.blob();
            if (!blob.type.includes('video')) throw new Error("El modelo devolvió una imagen estática.");

            // Guardar en disco
            const filename = `VID_${takeId}.mp4`;
            await EscaletaCore.saveMediaFile(blob, filename);

            // Actualizar Datos
            take.video_file = filename;
            take.videoBlobUrl = URL.createObjectURL(blob);
            EscaletaCore.triggerAutoSave();

            // UI Success
            if(statusBadge) { statusBadge.className = 'status-badge success'; statusBadge.innerText = 'LISTO'; }
            if(imgPreview) imgPreview.src = take.videoBlobUrl; // Asumiendo que es un elemento <video> o <img>

        } catch (e) {
            console.error(e);
            if(statusBadge) { statusBadge.className = 'status-badge error'; statusBadge.innerText = 'ERROR'; }
            alert(`Error generando video para Toma #${take.sequence_order}`);
        }
    },

    // --- AUDIO GENERATION ---
    async generateAudioForTake(takeId) {
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if (!take) return;
        if (!ai.apiKey) return alert("Requiere Login");

        const card = document.getElementById(`card-${takeId}`);
        const statusBadge = card.querySelector('.audio-status');
        
        if(statusBadge) { statusBadge.className = 'status-badge loading'; statusBadge.innerText = 'VOCEANDO...'; }

        try {
            // CORRECCIÓN: URL limpia, sin formato markdown extra
            const response = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ai.apiKey}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    input: take.narration_text,
                    voice: this.selectedVoice
                })
            });

            if (!response.ok) throw new Error("API Audio Error");
            const blob = await response.blob();

            // Guardar
            const filename = `AUD_${takeId}.mp3`;
            await EscaletaCore.saveMediaFile(blob, filename);

            // Actualizar Datos
            take.audio_file = filename;
            take.audioBlobUrl = URL.createObjectURL(blob);
            take.audioBlob = blob;
            EscaletaCore.triggerAutoSave();

            if(statusBadge) { statusBadge.className = 'status-badge success'; statusBadge.innerText = 'LISTO'; }

        } catch (e) {
            console.error(e);
            if(statusBadge) { statusBadge.className = 'status-badge error'; statusBadge.innerText = 'ERROR'; }
            alert("Error al generar audio. Revisa la consola.");
        }
    },

    // --- BATCH GENERATION (Masiva) ---
    async generateAllVideos() {
        const takes = EscaletaCore.data.takes.filter(t => !t.video_file); // Solo los que faltan
        if (takes.length === 0) return alert("Todas las tomas ya tienen video.");
        if (!confirm(`Se generarán ${takes.length} videos. Esto puede tomar tiempo. ¿Continuar?`)) return;

        EscaletaUI.toggleLoading(true, "PRODUCCIÓN EN MASA", "Generando videos secuencialmente...");
        
        // Procesar de 1 en 1 para seguridad (Grok puede fallar con concurrencia alta)
        for (let i = 0; i < takes.length; i++) {
            EscaletaUI.updateProgressBar(((i) / takes.length) * 100);
            await this.generateVideoForTake(takes[i].id);
        }
        
        EscaletaUI.toggleLoading(false);
    },

    async generateAllAudio() {
        const takes = EscaletaCore.data.takes; // Regenerar todo el audio para consistencia de voz
        if (!confirm(`Se generarán ${takes.length} pistas de audio. ¿Continuar?`)) return;

        EscaletaUI.toggleLoading(true, "DOBLAJE EN PROCESO", "Generando voces...");
        
        // Lote de 5 en 5
        const BATCH_SIZE = 5;
        for (let i = 0; i < takes.length; i += BATCH_SIZE) {
            const chunk = takes.slice(i, i + BATCH_SIZE);
            await Promise.all(chunk.map(t => this.generateAudioForTake(t.id)));
            EscaletaUI.updateProgressBar(((i + chunk.length) / takes.length) * 100);
        }

        EscaletaUI.toggleLoading(false);
    }
};