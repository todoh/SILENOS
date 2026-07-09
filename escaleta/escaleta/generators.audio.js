// --- cronologia/escaleta/generators.audio.js ---
// MÓDULO DE GENERACIÓN DE AUDIO (EXTENSIÓN DE GENERATORS) - V5.1

Object.assign(Generators, {
    
    async generateAudioForTake(takeId) {
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if (!take) return;

        const card = document.getElementById(`card-${takeId}`);
        const statusBadge = card.querySelector('.audio-status');
        
        if(statusBadge) { statusBadge.className = 'status-badge loading'; statusBadge.innerText = 'VOCEANDO...'; }

        try {
            let blob;

            // ============================================
            // RUTA 1: OPENAI (VÍA POLLINATIONS)
            // ============================================
            if (this.voiceProvider === 'openai') {
                if (!ai.apiKey) throw new Error("Requiere Login para Audio (Pollinations)");

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

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`API Audio Error ${response.status}: ${errText}`);
                }
                
                blob = await response.blob();
            } 
            // ============================================
            // RUTA 2: GOOGLE CLOUD TTS
            // ============================================
            else if (this.voiceProvider === 'google') {
                const apiKey = localStorage.getItem('googlecloud_api_key') || (window.parent && window.parent.googlecloudapikey);
                if (!apiKey) throw new Error("Falta la API Key de Google Cloud en la configuración [CFG].");
                if (!this.selectedGoogleVoice) throw new Error("No hay ninguna voz de Google seleccionada.");

                const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
                
                const payload = {
                    input: { text: take.narration_text },
                    voice: { languageCode: this.selectedGoogleLang, name: this.selectedGoogleVoice },
                    audioConfig: { audioEncoding: "MP3" }
                };

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (data.error) throw new Error(data.error.message);

                // Convertir la salida Base64 a Blob Binario MP3
                const byteCharacters = atob(data.audioContent);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                blob = new Blob([byteArray], {type: 'audio/mp3'});
            }

            // --- GUARDADO COMÚN PARA AMBAS RUTAS ---
            const filename = `AUD_${takeId}.mp3`;
            await EscaletaCore.saveMediaFile(blob, filename);

            take.audio_file = filename;
            take.audioBlobUrl = URL.createObjectURL(blob);
            take.audioBlob = blob;
            EscaletaCore.triggerAutoSave();

            if(statusBadge) { statusBadge.className = 'status-badge success'; statusBadge.innerText = 'LISTO'; }

        } catch (e) {
            console.error(e);
            if(statusBadge) { statusBadge.className = 'status-badge error'; statusBadge.innerText = 'ERROR'; }
            alert("Fallo al generar audio: " + e.message);
        }
    },

    async generateAllAudio() {
        const takes = EscaletaCore.data.takes;
        if (!confirm(`Se generarán ${takes.length} pistas de audio. ¿Continuar?`)) return;

        EscaletaUI.toggleLoading(true, "DOBLAJE EN PROCESO", "Generando voces...");
        const BATCH_SIZE = 5;
        for (let i = 0; i < takes.length; i += BATCH_SIZE) {
            const chunk = takes.slice(i, i + BATCH_SIZE);
            await Promise.all(chunk.map(t => this.generateAudioForTake(t.id)));
            EscaletaUI.updateProgressBar(((i + chunk.length) / takes.length) * 100);
        }
        EscaletaUI.toggleLoading(false);
    }
});