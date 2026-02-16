// --- cronologia/images.js ---
// GESTOR DE IMÁGENES Y GENERACIÓN POR LOTES (CON ACTUALIZACIÓN DE FORMATO)

const ImgGen = {
    
    // Configuración Base (Defaults)
    model: 'klein-large', 
    defaultWidth: 1024,
    defaultHeight: 576, // 16:9 Cinematic

    // --- GENERACIÓN INDIVIDUAL ---
    async generateSingle(eventId) {
        const ev = main.data.events.find(e => e.id === eventId);
        if (!ev) return;
        if (!ev.visualPrompt) return alert("Este evento no tiene prompt visual.");

        const btn = document.getElementById('btn-gen-single');
        if(btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            btn.disabled = true;
        }

        try {
            // Determinar dimensiones según el evento
            let w = this.defaultWidth;
            let h = this.defaultHeight;

            if (ev.aspectRatio === 'portrait') {
                w = 576;
                h = 1024;
            }

            const base64 = await this.fetchImage(ev.visualPrompt, w, h);
            
            // Guardar
            ev.image64 = base64;
            main.saveData();
            
            // Actualizar UI
            timeline.renderEvents(); 
            ui.showInspector(ev); 
            
        } catch(e) {
            console.error(e);
            alert("Error generando imagen: " + e.message);
        } finally {
            if(btn) {
                btn.innerHTML = '<i class="fa-solid fa-paintbrush"></i>';
                btn.disabled = false;
            }
        }
    },

    // --- GENERACIÓN POR LOTES (BATCH) ---
    async generateBatch() {
        const eventsToGen = main.data.events.filter(e => e.visualPrompt && !e.image64);
        if(eventsToGen.length === 0) return alert("Todos los eventos ya tienen imagen o falta prompt.");

        // Verificar Auth
        if (!ai.apiKey && this.model.includes('klein-large')) {
            if(!confirm("Estás usando un modelo premium sin API Key. Es probable que falle. ¿Continuar?")) return;
        }

        // --- PREGUNTAR MODO DE GENERACIÓN ---
        const mode = await this.askBatchMode(eventsToGen.length);
        if (!mode) return; // Cancelado por el usuario

        const btn = document.getElementById('btn-gen-batch');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> PROCESANDO...';
        }

        const BATCH_SIZE = 5; 
        let processed = 0;
        const chunks = [];
        
        for (let i = 0; i < eventsToGen.length; i += BATCH_SIZE) {
            chunks.push(eventsToGen.slice(i, i + BATCH_SIZE));
        }

        ui.toggleLoading(true, "GENERANDO IMÁGENES", `Modo: ${this.getModeName(mode)} | Lotes: ${chunks.length}`);

        try {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                
                ui.toggleLoading(true, `LOTE ${i+1}/${chunks.length}`, `Generando ${chunk.length} imágenes (${this.getModeName(mode)})...`);
                
                // Ejecutar lote con el MODO seleccionado
                const promises = chunk.map(ev => this.processEventImage(ev, mode));
                await Promise.all(promises);
                
                processed += chunk.length;
                main.saveData(); 
                timeline.renderEvents();
            }

            alert("Generación por lotes completada.");

        } catch(e) {
            console.error(e);
            alert("Error en el proceso por lotes: " + e.message);
        } finally {
            ui.toggleLoading(false);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-solid fa-images"></i> ILUSTRAR TODO (Lotes)';
            }
        }
    },

    // --- PROCESAMIENTO INTERNO CON OVERRIDE ---
    async processEventImage(ev, mode) {
        try {
            let w = this.defaultWidth;
            let h = this.defaultHeight;
            let isPortrait = false;

            // Lógica de decisión según el modo elegido
            if (mode === 'force-landscape') {
                isPortrait = false;
            } else if (mode === 'force-portrait') {
                isPortrait = true;
            } else {
                // Modo 'mixed' (Respetar individual)
                isPortrait = (ev.aspectRatio === 'portrait');
            }

            // Aplicar dimensiones
            if (isPortrait) {
                w = 576;
                h = 1024;
            } else {
                w = 1024;
                h = 576;
            }

            const base64 = await this.fetchImage(ev.visualPrompt, w, h);
            ev.image64 = base64;
            
            // --- ACTUALIZACIÓN AUTOMÁTICA DEL FORMATO ---
            // Si forzamos un modo, actualizamos la propiedad del evento para que se visualice bien
            if (mode === 'force-landscape') {
                ev.aspectRatio = 'landscape';
            } else if (mode === 'force-portrait') {
                ev.aspectRatio = 'portrait';
            }
            // --------------------------------------------

        } catch(e) {
            console.error(`Fallo en evento ${ev.time}:`, e);
        }
    },

    // --- API CORE ---
    async fetchImage(prompt, width, height) {
        const seed = Math.floor(Math.random() * 999999);
        const safePrompt = encodeURIComponent(prompt);
        const finalW = width || this.defaultWidth;
        const finalH = height || this.defaultHeight;

        let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${this.model}&width=${finalW}&height=${finalH}&seed=${seed}&nologo=true`;
        
        if (ai && ai.apiKey) {
            url += `&key=${ai.apiKey}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            throw new Error(`API Error ${response.status}: ${errText}`);
        }
        
        const blob = await response.blob();
        return await this.blobToBase64(blob);
    },

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    // --- UI HELPERS PARA EL MODAL DE SELECCIÓN ---
    
    getModeName(mode) {
        if (mode === 'force-landscape') return "Forzado Horizontal";
        if (mode === 'force-portrait') return "Forzado Vertical";
        return "Configuración Individual";
    },

    askBatchMode(count) {
        return new Promise((resolve) => {
            // Crear modal dinámicamente
            const overlay = document.createElement('div');
            overlay.className = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm";
            overlay.innerHTML = `
                <div class="bg-white p-6 shadow-2xl border border-gray-200 w-[400px] flex flex-col gap-4 animate-fade-in">
                    <div class="text-center">
                        <h3 class="font-bold text-lg text-gray-800">Generación Masiva</h3>
                        <p class="text-xs text-gray-500 mt-1">Se generarán ${count} imágenes pendientes.</p>
                        <p class="text-sm text-gray-600 mt-2 font-medium">¿Qué formato deseas aplicar?</p>
                    </div>
                    
                    <div class="flex flex-col gap-2 mt-2">
                        <button id="mode-mixed" class="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold uppercase tracking-wider flex justify-between items-center transition-colors border border-gray-200">
                            <span><i class="fa-solid fa-shuffle mr-2"></i> Respetar Individual</span>
                            <span class="text-[9px] text-gray-400 font-normal normal-case">Según config. de cada evento</span>
                        </button>

                        <button id="mode-landscape" class="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold uppercase tracking-wider flex justify-between items-center transition-colors border border-indigo-100">
                            <span><i class="fa-solid fa-image mr-2"></i> Todo Horizontal</span>
                            <span class="text-[9px] text-indigo-400 font-normal normal-case">Cine (16:9)</span>
                        </button>
                        
                        <button id="mode-portrait" class="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold uppercase tracking-wider flex justify-between items-center transition-colors border border-purple-100">
                            <span><i class="fa-solid fa-mobile-screen mr-2"></i> Todo Vertical</span>
                            <span class="text-[9px] text-purple-400 font-normal normal-case">Social (9:16)</span>
                        </button>
                    </div>

                    <button id="mode-cancel" class="mt-2 text-[10px] text-gray-400 hover:text-red-500 underline text-center">Cancelar operación</button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Handlers
            const close = (val) => {
                overlay.remove();
                resolve(val);
            };

            overlay.querySelector('#mode-mixed').onclick = () => close('mixed');
            overlay.querySelector('#mode-landscape').onclick = () => close('force-landscape');
            overlay.querySelector('#mode-portrait').onclick = () => close('force-portrait');
            overlay.querySelector('#mode-cancel').onclick = () => close(null);
            
            // Click fuera para cancelar
            overlay.onclick = (e) => {
                if(e.target === overlay) close(null);
            };
        });
    }
};