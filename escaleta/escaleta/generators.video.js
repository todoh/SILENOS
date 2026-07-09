// --- cronologia/escaleta/generators.video.js ---
// MÓDULO DE GENERACIÓN DE VIDEO (EXTENSIÓN DE GENERATORS) - V5.5 (Inyección de Diseño Sonoro y Dinamismo Anti-SlowMo)

Object.assign(Generators, {
    
    async generateVideoForTake(takeId) {
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if (!take) return;
        
        const model = document.getElementById('video-model-select').value;
        const aspectSelect = document.getElementById('video-aspect-select');
        
        const isPortrait = aspectSelect && aspectSelect.value === 'portrait';
        const isSquare = aspectSelect && aspectSelect.value === 'square';
        const useAirforce = document.getElementById('provider-switch')?.checked;

        const card = document.getElementById(`card-${takeId}`);
        const statusBadge = card.querySelector('.video-status');
        const imgPreview = card.querySelector('.take-video-preview');
        
        if(statusBadge) { 
            statusBadge.className = 'status-badge loading'; 
            statusBadge.innerText = useAirforce ? 'AIRFORCE...' : 'GENERANDO...'; 
        }
        
        try {
            // ==========================================================
            // MAGIA AQUÍ: INTERCEPCIÓN DEL DISEÑO SONORO Y DINAMISMO
            // ==========================================================
            let basePrompt = take.visual_prompt; 
            
            // INYECCIÓN ANTI-SLOWMOTION Y ANTI-ABURRIMIENTO
            // Fuerza a los motores (Grok Imagine, Luma, etc.) a moverse en tiempo real
            const promptLower = basePrompt.toLowerCase();
            if (!promptLower.includes("slow motion") && !promptLower.includes("slomo") && !promptLower.includes("slow-mo")) {
                basePrompt += ", dynamic camera movement, real-time playback speed, highly energetic action, vivid motion, fast-paced, fluid movement";
            }

            let finalPrompt = basePrompt;
            
            try {
                // Llamamos a nuestro nuevo cerebro de sonido (usa openai-fast)
                const audioInstructions = await SoundDesigner.generateAudioPrompt(take);
                if (audioInstructions) {
                    // Lo concatenamos explícitamente para que los modelos de video nativos 
                    // entiendan que rige el canal de audio.
                    finalPrompt = `${basePrompt} --- AUDIO & SOUND INSTRUCTIONS: ${audioInstructions}`;
                    console.log(`[Sound Designer] Prompt final ensamblado para Toma ${takeId}:\n`, finalPrompt);
                }
            } catch (audioErr) {
                console.warn("[Sound Designer] No se pudo inyectar el audio. Se usará el prompt visual base.", audioErr);
            }
            // ==========================================================

            // CONFIGURACIÓN DE DIMENSIONES
            let width = 854;
            let height = 480;
            let aspectRatio = "16:9";

            if (isPortrait) {
                width = 480;
                height = 854;
                aspectRatio = "9:16";
            } else if (isSquare) {
                width = 720;
                height = 720;
                aspectRatio = "1:1";
            }

            let blob = null;

            // --- BIFURCACIÓN DE PROVEEDOR ---
            if (useAirforce) {
                if (typeof AirforceBridge === 'undefined') throw new Error("Falta el archivo airforce.js");
                if (typeof window.apikeyairforce === 'undefined' || !window.apikeyairforce) {
                    throw new Error("No has introducido la API Key de Airforce.");
                }

                // Llamada al puente (ahora pasamos el finalPrompt con el audio y dinamismo inyectados)
                blob = await AirforceBridge.generateVideo(finalPrompt, width, height, window.apikeyairforce, model);

            } else {
                // POLLINATIONS.AI (VIDEO)
                if (!ai.apiKey) throw new Error("Requiere Login en Pollinations.");
                const seed = Math.floor(Math.random() * 1000000);
                const safePrompt = encodeURIComponent(finalPrompt);
                
                // URL para Video
                let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${width}&height=${height}&aspect_ratio=${aspectRatio}&seed=${seed}&nologo=true&duration=5&key=${ai.apiKey}&t=${Date.now()}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error(`API Error: ${response.status}`);
                blob = await response.blob();
                if (!blob.type.includes('video')) throw new Error("Formato incorrecto recibido (¿Es una imagen?).");
            }

            // --- GUARDADO ---
            const filename = `VID_${takeId}.mp4`;
            await EscaletaCore.saveMediaFile(blob, filename);

            take.video_file = filename;
            take.videoBlobUrl = URL.createObjectURL(blob);
            take.aspectRatio = isSquare ? 'square' : (isPortrait ? 'portrait' : 'landscape');
            
            EscaletaCore.triggerAutoSave();

            if(statusBadge) { statusBadge.className = 'status-badge success'; statusBadge.innerText = 'LISTO'; }
            if(imgPreview) imgPreview.src = take.videoBlobUrl;

        } catch (e) {
            console.error(e);
            if(statusBadge) { statusBadge.className = 'status-badge error'; statusBadge.innerText = 'FALLO'; }
            throw e;
        }
    },

    async generateAllVideos() {
        const takes = EscaletaCore.data.takes.filter(t => !t.video_file);
        if (takes.length === 0) return alert("Todas las tomas ya tienen video.");
        
        const useAirforce = document.getElementById('provider-switch')?.checked;
        
        // 1. Configuración Previa
        let delaySeconds = 2; // Default Pollinations
        let batchMode = 'cadence';
        let concurrency = 1;
        
        if (useAirforce) {
            if (!window.apikeyairforce) return alert("Falta API Key de Airforce.");
            
            const keysCount = window.apikeyairforce.split(',').filter(k => k.trim()).length;
            if (keysCount === 0) return alert("No hay API Keys válidas.");
            
            concurrency = keysCount;

            // Preguntar Configuración de Cadencia / Modo Ráfaga
            const config = await this.askBatchConfig(takes.length, keysCount);
            if (!config) return; // Cancelado
            
            delaySeconds = config.delay;
            batchMode = config.mode;
        } else {
            if (!confirm(`Se generarán ${takes.length} videos usando POLLINATIONS. ¿Continuar?`)) return;
            batchMode = 'cadence'; // Pollinations siempre en cadencia por seguridad
        }

        EscaletaUI.toggleLoading(true, "PRODUCCIÓN EN CADENA", "Iniciando secuencia de lanzamientos...");
        
        let successCount = 0;
        let failCount = 0;
        let completedCount = 0;
        const total = takes.length;

        if (batchMode === 'cadence') {
            // =================================================================
            // MODO 1: CADENCIA SECUENCIAL (Semi-Paralelo con esperas)
            // =================================================================
            const generationPromises = [];

            for (let i = 0; i < takes.length; i++) {
                const take = takes[i];
                const currentNum = i + 1;

                EscaletaUI.toggleLoading(true, `LANZANDO TOMA ${currentNum}/${total}`, `Modo: ${useAirforce ? 'Airforce Cadencia' : 'Pollinations'} | Cadencia: ${delaySeconds}s`);
                
                const card = document.getElementById(`card-${take.id}`);
                if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Lanzamos sin await y concatenamos el .then para llevar cuenta
                const p = this.generateVideoForTake(take.id)
                    .then(() => { 
                        successCount++; 
                        completedCount++; 
                        EscaletaUI.updateProgressBar((completedCount / total) * 100); 
                    })
                    .catch((err) => {
                        console.warn(`[BATCH] Error en toma ${take.id}.`, err);
                        failCount++;
                        completedCount++; 
                        EscaletaUI.updateProgressBar((completedCount / total) * 100); 
                    });
                
                generationPromises.push(p);

                // Cadencia de Seguridad
                if (i < takes.length - 1) {
                    for (let s = delaySeconds; s > 0; s--) {
                         const sub = document.getElementById('loading-subtitle');
                         if(sub) sub.innerText = `Peticiones enviadas: ${i+1}. Siguiente disparo en ${s}s`;
                         await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            EscaletaUI.toggleLoading(true, "PROCESANDO RENDERS", "Todos los disparos realizados. Esperando a que terminen los servidores...");
            await Promise.allSettled(generationPromises);

        } else if (batchMode === 'burst') {
            // =================================================================
            // MODO 2: RÁFAGA PARALELA (Cola de tareas por llave)
            // =================================================================
            EscaletaUI.toggleLoading(true, `RÁFAGA PARALELA`, `Usando ${concurrency} llaves simultáneas...`);
            
            let currentIndex = 0;
            
            // Definimos el Worker que procesará videos sin parar
            const worker = async (workerId) => {
                while (currentIndex < takes.length) {
                    // Tomamos el siguiente índice de forma atómica
                    const takeIndex = currentIndex++;
                    const take = takes[takeIndex];
                    
                    const sub = document.getElementById('loading-subtitle');
                    if(sub) sub.innerText = `Canales activos: ${concurrency} | Procesados: ${completedCount}/${total}`;

                    const card = document.getElementById(`card-${take.id}`);
                    if(card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    try {
                        await this.generateVideoForTake(take.id);
                        successCount++;
                    } catch(err) {
                        console.warn(`[WORKER ${workerId}] Fallo en toma ${take.id}:`, err);
                        failCount++;
                    } finally {
                        completedCount++;
                        EscaletaUI.updateProgressBar((completedCount / total) * 100);
                        if(sub) sub.innerText = `Canales activos: ${concurrency} | Procesados: ${completedCount}/${total}`;
                    }
                }
            };

            // Desplegamos los workers (uno por cada API Key)
            const workers = [];
            for (let i = 0; i < concurrency; i++) {
                workers.push(worker(i));
            }

            // Esperamos a que todos los workers vacíen la cola
            await Promise.all(workers);
        }

        EscaletaUI.toggleLoading(false);
        alert(`Proceso Finalizado.\n\n✅ Éxitos: ${successCount}\n❌ Fallos: ${failCount}\n\nLos videos fallidos pueden reintentarse manualmente.`);
    },

    askBatchConfig(count, keysCount) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = "fixed inset-0 bg-black/80 z-[300] flex items-center justify-center backdrop-blur-sm animate-fade-in";
            overlay.innerHTML = `
                <div class="bg-white p-6 shadow-2xl border-t-4 border-indigo-600 w-[450px] flex flex-col gap-4 rounded-sm">
                    <div class="text-center">
                        <h3 class="font-bold text-lg text-gray-800 uppercase tracking-widest">Configuración de Barrido</h3>
                        <p class="text-xs text-gray-500 mt-1">Cola de trabajo: <strong>${count} tomas</strong> pendientes.</p>
                        <div class="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full">
                            <i class="fa-solid fa-key text-indigo-500 text-[10px]"></i>
                            <span class="text-[10px] font-bold text-indigo-800">${keysCount} LLAVES DETECTADAS</span>
                        </div>
                    </div>
                    
                    <div class="space-y-3 mt-2">
                        <label class="block cursor-pointer bg-gray-50 border border-gray-200 rounded p-3 hover:border-indigo-400 transition-colors">
                            <div class="flex items-center gap-3">
                                <input type="radio" name="batch_mode" value="cadence" class="w-4 h-4 text-indigo-600">
                                <div>
                                    <span class="block text-xs font-bold text-gray-800 uppercase">Modo Cadencia (Seguro)</span>
                                    <span class="block text-[10px] text-gray-500 mt-0.5 leading-tight">Dispara un video, espera X segundos, y dispara el siguiente. Ideal si tienes pocas llaves y quieres evitar errores 429.</span>
                                </div>
                            </div>
                            <div class="mt-3 pl-7 flex items-center gap-2 opacity-50 pointer-events-none transition-opacity" id="cadence-settings">
                                <span class="text-[10px] font-bold text-gray-600 uppercase">Espera:</span>
                                <input type="number" id="batch-delay" value="15" min="5" max="300" class="w-16 p-1 text-center font-mono font-bold border border-gray-300 rounded text-indigo-700 outline-none">
                                <span class="text-[10px] text-gray-600">segundos</span>
                            </div>
                        </label>

                        <label class="block cursor-pointer bg-indigo-50 border border-indigo-200 rounded p-3 hover:border-indigo-400 transition-colors">
                            <div class="flex items-start gap-3">
                                <input type="radio" name="batch_mode" value="burst" checked class="w-4 h-4 text-indigo-600 mt-0.5">
                                <div>
                                    <span class="block text-xs font-bold text-indigo-900 uppercase">Ráfaga Paralela (Max. Rendimiento)</span>
                                    <span class="block text-[10px] text-indigo-600 mt-0.5 leading-tight">Abre <strong>${keysCount} canales simultáneos</strong> (uno por llave). En cuanto un canal se libera, toma el siguiente video de la cola instantáneamente.</span>
                                </div>
                            </div>
                        </label>
                    </div>

                    <div class="flex gap-2 mt-4">
                        <button id="batch-cancel" class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold uppercase rounded transition-colors">Cancelar</button>
                        <button id="batch-start" class="flex-1 py-3 bg-black hover:bg-gray-800 text-white text-xs font-bold uppercase rounded shadow-lg transition-colors">
                            <i class="fa-solid fa-play mr-2"></i> Iniciar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const radios = overlay.querySelectorAll('input[name="batch_mode"]');
            const cadenceSettings = overlay.querySelector('#cadence-settings');
            
            radios.forEach(r => {
                r.addEventListener('change', (e) => {
                    if (e.target.value === 'cadence') {
                        cadenceSettings.classList.remove('opacity-50', 'pointer-events-none');
                    } else {
                        cadenceSettings.classList.add('opacity-50', 'pointer-events-none');
                    }
                });
            });

            const inpDelay = overlay.querySelector('#batch-delay');
            
            overlay.querySelector('#batch-start').onclick = () => {
                const mode = overlay.querySelector('input[name="batch_mode"]:checked').value;
                const delay = parseInt(inpDelay.value) || 15;
                overlay.remove();
                resolve({ delay: delay, mode: mode });
            };

            overlay.querySelector('#batch-cancel').onclick = () => {
                overlay.remove();
                resolve(null);
            };
        });
    }
});