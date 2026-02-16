// --- MOTOR DE AUDIO (TTS) ---
const AudioEngine = {
    voice: 'alloy',
    apiKey: localStorage.getItem('pollinations_api_key') || '',

    setVoice(v) {
        this.voice = v;
        document.querySelectorAll('.voice-btn').forEach(b => {
            b.classList.remove('active', 'border-pink-500', 'text-white', 'bg-slate-700');
            b.classList.add('border-transparent', 'text-slate-400', 'bg-slate-800');
            if(b.innerText.toLowerCase() === v) {
                b.classList.add('active', 'border-pink-500', 'text-white', 'bg-slate-700');
                b.classList.remove('border-transparent', 'text-slate-400', 'bg-slate-800');
            }
        });
    },

    async generateSingle(event) {
        if(!this.apiKey) return alert("Conecta la API Key primero.");
        
        const text = event.moments ? event.moments.map(m => m.text).join(" ") : event.description;
        if(!text || text.length < 2) return null;

        try {
            const response = await fetch("https://gen.pollinations.ai/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "tts-1",
                    input: text,
                    voice: this.voice
                })
            });

            if(!response.ok) throw new Error("Error API Audio");
            return await response.blob();

        } catch(e) {
            console.error(e);
            return null;
        }
    },

    // NUEVA FUNCIÓN: Genera audio para un solo evento desde la UI
    async generateOne(eventId) {
        const ev = Project.data.events.find(e => e.id === eventId);
        if(!ev) return;

        // Referencia al botón específico de esta fila
        const row = document.getElementById(`row-${eventId}`);
        const btn = row.querySelector('.btn-regen-audio');
        const icon = btn.querySelector('i');
        
        // Estado de carga visual
        const originalClass = icon.className;
        icon.className = 'fa-solid fa-circle-notch fa-spin text-pink-500';
        btn.disabled = true;

        const blob = await this.generateSingle(ev);

        if(blob) {
            Project.saveEventAudio(ev.id, blob);
            // Feedback visual de éxito
            icon.className = 'fa-solid fa-check text-green-500';
            setTimeout(() => {
                icon.className = 'fa-solid fa-rotate-right'; // Volver al icono original
                btn.disabled = false;
            }, 1500);
        } else {
            // Feedback de error
            icon.className = 'fa-solid fa-triangle-exclamation text-red-500';
            btn.disabled = false;
        }
    },

    // MODIFICADO: Generación por lotes (Batching) de 7 en 7
    async generateAll() {
        if(!Project.data.events.length) return alert("Carga un proyecto primero.");
        
        const btn = document.getElementById('btn-gen-all');
        const originalText = '<i class="fa-solid fa-microphone-lines mr-2"></i> Generar Todas las Voces';
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Inicializando...';

        const events = Project.data.events;
        const BATCH_SIZE = 7; // Tanda de 7 pistas simultáneas
        let completedCount = 0;

        // Iteramos sobre los eventos en saltos de BATCH_SIZE
        for (let i = 0; i < events.length; i += BATCH_SIZE) {
            // Crear el lote actual
            const chunk = events.slice(i, i + BATCH_SIZE);
            
            // Crear array de promesas para ejecución paralela
            const promises = chunk.map(async (ev) => {
                const row = document.getElementById(`row-${ev.id}`);
                
                // 1. UI Loading para este item
                if(row) row.querySelector('.status-icon').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-pink-500"></i>';

                // 2. Llamada a API
                const blob = await this.generateSingle(ev);
                
                // 3. Guardar y UI Resultado
                if(blob) {
                    await Project.saveEventAudio(ev.id, blob);
                    // El icono se actualiza dentro de saveEventAudio vía UI.markEventAudio, 
                    // pero por seguridad si fallara el bridge:
                    // if(row) row.querySelector('.status-icon').innerHTML = '<i class="fa-solid fa-volume-high text-green-500"></i>';
                } else {
                     if(row) row.querySelector('.status-icon').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-red-500"></i>';
                }

                // 4. Actualizar progreso global en el botón
                completedCount++;
                const percent = Math.round((completedCount / events.length) * 100);
                btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Generando... ${percent}%`;
            });

            // ESPERAR a que las 7 de este lote terminen antes de lanzar las siguientes 7
            await Promise.all(promises);
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Completado';
        setTimeout(() => btn.innerHTML = originalText, 3000);
    }
};