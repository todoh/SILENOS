// --- cronologia/escaleta/generators.js ---
// WRAPPERS DE GENERACIÓN (GROK VIDEO VIA AIRFORCE & POLLINATIONS) - V4.0 BATCH CONTROL

const Generators = {
selectedVoice: 'alloy',

setVoice(voice) {
    this.selectedVoice = voice;
    document.querySelectorAll('.voice-btn').forEach(btn => {
        if(btn.dataset.voice === voice) btn.classList.add('active');
        else btn.classList.remove('active');
    });
},

// --- VIDEO GENERATION INDIVIDUAL ---
async generateVideoForTake(takeId) {
    const take = EscaletaCore.data.takes.find(t => t.id === takeId);
    if (!take) return;
    
    const model = document.getElementById('video-model-select').value;
    const aspectSelect = document.getElementById('video-aspect-select');
    const isPortrait = aspectSelect && aspectSelect.value === 'portrait';
    const useAirforce = document.getElementById('provider-switch')?.checked;

    const card = document.getElementById(`card-${takeId}`);
    const statusBadge = card.querySelector('.video-status');
    const imgPreview = card.querySelector('.take-video-preview');
    
    if(statusBadge) { 
        statusBadge.className = 'status-badge loading'; 
        statusBadge.innerText = useAirforce ? 'AIRFORCE...' : 'GENERANDO...'; 
    }
    
    try {
        const prompt = take.visual_prompt; 
        
        // CONFIGURACIÓN DE DIMENSIONES
        let width = 1280;
        let height = 720;
        let aspectRatio = "16:9";

        if (isPortrait) {
            width = 720;
            height = 1280;
            aspectRatio = "9:16";
        }

        let blob = null;

        // --- BIFURCACIÓN DE PROVEEDOR ---
        if (useAirforce) {
            if (typeof AirforceBridge === 'undefined') throw new Error("Falta el archivo airforce.js");
            if (typeof window.apikeyairforce === 'undefined' || !window.apikeyairforce) {
                throw new Error("No has introducido la API Key de Airforce.");
            }

            // Llamada al puente (que gestiona la rotación de keys internamente)
            blob = await AirforceBridge.generateVideo(prompt, width, height, window.apikeyairforce, model);

        } else {
            // POLLINATIONS.AI
            if (!ai.apiKey) throw new Error("Requiere Login en Pollinations.");
            const seed = Math.floor(Math.random() * 1000000);
            const safePrompt = encodeURIComponent(prompt);
            let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${width}&height=${height}&aspect_ratio=${aspectRatio}&seed=${seed}&nologo=true&duration=5&key=${ai.apiKey}&t=${Date.now()}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            blob = await response.blob();
            if (!blob.type.includes('video')) throw new Error("Formato incorrecto recibido.");
        }

        // --- GUARDADO ---
        const filename = `VID_${takeId}.mp4`;
        await EscaletaCore.saveMediaFile(blob, filename);

        take.video_file = filename;
        take.videoBlobUrl = URL.createObjectURL(blob);
        take.aspectRatio = isPortrait ? 'portrait' : 'landscape';
        
        EscaletaCore.triggerAutoSave();

        if(statusBadge) { statusBadge.className = 'status-badge success'; statusBadge.innerText = 'LISTO'; }
        if(imgPreview) imgPreview.src = take.videoBlobUrl;

    } catch (e) {
        console.error(e);
        if(statusBadge) { statusBadge.className = 'status-badge error'; statusBadge.innerText = 'FALLO'; }
        // Re-lanzamos el error para que el Batch Loop sepa que falló
        throw e;
    }
},

// --- AUDIO GENERATION ---
async generateAudioForTake(takeId) {
    const take = EscaletaCore.data.takes.find(t => t.id === takeId);
    if (!take) return;
    if (!ai.apiKey) return alert("Requiere Login para Audio");

    const card = document.getElementById(`card-${takeId}`);
    const statusBadge = card.querySelector('.audio-status');
    
    if(statusBadge) { statusBadge.className = 'status-badge loading'; statusBadge.innerText = 'VOCEANDO...'; }

    try {
        const response = await fetch("[https://gen.pollinations.ai/v1/audio/speech](https://gen.pollinations.ai/v1/audio/speech)", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ai.apiKey}` },
            body: JSON.stringify({ model: "tts-1", input: take.narration_text, voice: this.selectedVoice })
        });

        if (!response.ok) throw new Error(`API Audio Error: ${response.status}`);
        const blob = await response.blob();

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
    }
},

// --- BATCH GENERATION: SMART LOOP ---
async generateAllVideos() {
    const takes = EscaletaCore.data.takes.filter(t => !t.video_file);
    if (takes.length === 0) return alert("Todas las tomas ya tienen video.");
    
    const useAirforce = document.getElementById('provider-switch')?.checked;
    
    // 1. Configuración Previa (Airforce necesita control de cadencia)
    let delaySeconds = 2; // Default Pollinations
    
    if (useAirforce) {
        if (!window.apikeyairforce) return alert("Falta API Key de Airforce.");
        
        // Preguntar Configuración de Cadencia
        const config = await this.askBatchConfig(takes.length);
        if (!config) return; // Cancelado
        delaySeconds = config.delay;
    } else {
        if (!confirm(`Se generarán ${takes.length} videos usando POLLINATIONS. ¿Continuar?`)) return;
    }

    // 2. Inicio del Loop
    EscaletaUI.toggleLoading(true, "PRODUCCIÓN EN CADENA", "Iniciando secuencia de generación...");
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < takes.length; i++) {
        const take = takes[i];
        const currentNum = i + 1;
        const total = takes.length;

        EscaletaUI.toggleLoading(true, `GENERANDO TOMA ${currentNum}/${total}`, `Modo: ${useAirforce ? 'Airforce Metralleta' : 'Pollinations'} | Cadencia: ${delaySeconds}s`);
        EscaletaUI.updateProgressBar((i / total) * 100);

        // Scroll hacia la tarjeta activa para seguimiento visual
        const card = document.getElementById(`card-${take.id}`);
        if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        try {
            // Intentar generar (AirforceBridge ya maneja la rotación de keys internamente)
            await this.generateVideoForTake(take.id);
            successCount++;
        } catch (err) {
            console.warn(`[BATCH] Error en toma ${take.id}. Saltando al siguiente.`, err);
            failCount++;
            // No lanzamos alert ni paramos el loop. Seguimos.
        }

        // 3. Cadencia de Seguridad (Cooldown)
        // Esperamos SIEMPRE, haya éxito o fallo, para enfriar las APIs
        if (i < takes.length - 1) {
            // Actualizamos subtítulo del loading con cuenta atrás
            for (let s = delaySeconds; s > 0; s--) {
                 // Solo actualizamos texto si el modal sigue abierto
                 const sub = document.getElementById('loading-subtitle');
                 if(sub) sub.innerText = `Enfriando motores... Siguiente disparo en ${s}s`;
                 await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    EscaletaUI.toggleLoading(false);
    alert(`Proceso Finalizado.\n\n✅ Éxitos: ${successCount}\n❌ Fallos: ${failCount}\n\nLos videos fallidos pueden reintentarse manualmente.`);
},

// --- MODAL DE CONFIGURACIÓN BATCH ---
askBatchConfig(count) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = "fixed inset-0 bg-black/80 z-[300] flex items-center justify-center backdrop-blur-sm animate-fade-in";
        overlay.innerHTML = `
            <div class="bg-white p-6 shadow-2xl border-t-4 border-indigo-600 w-[400px] flex flex-col gap-4 rounded-sm">
                <div class="text-center">
                    <h3 class="font-bold text-lg text-gray-800 uppercase tracking-widest">Configuración de Barrido</h3>
                    <p class="text-xs text-gray-500 mt-1">Cola de trabajo: <strong>${count} tomas</strong> pendientes.</p>
                </div>
                
                <div class="bg-indigo-50 p-4 rounded border border-indigo-100">
                    <label class="block text-[10px] font-bold text-indigo-800 uppercase mb-2">Cadencia de Disparo (Cooldown)</label>
                    <div class="flex items-center gap-2">
                        <input type="number" id="batch-delay" value="15" min="5" max="300" class="flex-1 p-2 text-center font-mono font-bold text-lg border border-indigo-200 rounded text-indigo-700 focus:outline-none focus:border-indigo-500">
                        <span class="text-xs text-indigo-600 font-bold">segundos</span>
                    </div>
                    <p class="text-[9px] text-indigo-400 mt-2 leading-tight">
                        <i class="fa-solid fa-circle-info mr-1"></i>
                        Tiempo de espera entre videos. Aumentar este valor reduce drásticamente los errores 429 (Rate Limit) y da tiempo a rotar las API Keys.
                    </p>
                </div>

                <div class="flex gap-2 mt-2">
                    <button id="batch-cancel" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold uppercase rounded">Cancelar</button>
                    <button id="batch-start" class="flex-1 py-3 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase rounded shadow-lg">
                        <i class="fa-solid fa-play mr-2"></i> Iniciar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const inp = overlay.querySelector('#batch-delay');
        
        overlay.querySelector('#batch-start').onclick = () => {
            const val = parseInt(inp.value) || 15;
            overlay.remove();
            resolve({ delay: val });
        };

        overlay.querySelector('#batch-cancel').onclick = () => {
            overlay.remove();
            resolve(null);
        };
    });
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
};