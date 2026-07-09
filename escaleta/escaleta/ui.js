// --- cronologia/escaleta/ui.js ---
// INTERFAZ DE USUARIO PRINCIPAL

const EscaletaUI = {

    init() {
        // Listeners globales
        setInterval(() => this.softRefresh(), 3000);
    },
    
    // --- ACTUALIZACIÓN DINÁMICA (SIN ROMPER FOCO) ---
    softRefresh() {
        if (!window.EscaletaCore || !EscaletaCore.data || !EscaletaCore.data.takes) return;

        EscaletaCore.data.takes.forEach(take => {
            const card = document.getElementById(`card-${take.id}`);
            if (!card) return;

            // 1. Refrescar contenedor visual (.aspect-video) solo si ha cambiado
            const mediaContainer = card.querySelector('.aspect-video');
            if (mediaContainer) {
                const currentVideo = mediaContainer.querySelector('video');
                const currentImage = mediaContainer.querySelector('img');

                if (take.videoBlobUrl) {
                    if (!currentVideo) {
                        mediaContainer.innerHTML = `<video src="${take.videoBlobUrl}" class="take-video-preview w-full h-full object-cover" muted onmouseover="this.play()" onmouseout="this.pause()"></video>`;
                    } else if (currentVideo.getAttribute('src') !== take.videoBlobUrl) {
                        currentVideo.src = take.videoBlobUrl;
                    }
                } else if (take.imageBlobUrl) {
                    if (!currentImage) {
                        mediaContainer.innerHTML = `<img src="${take.imageBlobUrl}" class="take-image-preview w-full h-full object-cover">`;
                    } else if (currentImage.getAttribute('src') !== take.imageBlobUrl) {
                        currentImage.src = take.imageBlobUrl;
                    }
                }
            }

            // 2. Refrescar el estado de los Badges si no están procesando activamente
            const videoStatus = card.querySelector('.video-status');
            if (videoStatus && !videoStatus.classList.contains('loading')) {
                if (take.video_file || take.image_file) {
                    videoStatus.className = 'status-badge video-status success';
                    videoStatus.innerText = take.video_file ? 'VIDEO LISTO' : 'IMAGEN LISTA';
                }
            }

            const audioStatus = card.querySelector('.audio-status');
            if (audioStatus && !audioStatus.classList.contains('loading')) {
                if (take.audio_file) {
                    audioStatus.className = 'status-badge audio-status success';
                    audioStatus.innerText = 'LISTO';
                }
            }
        });

        // 3. Si el Inspector está abierto y pertenece a la toma, actualizar también
        if (window.Inspector && Inspector.selectedTakeId) {
            const activeTake = EscaletaCore.data.takes.find(t => t.id === Inspector.selectedTakeId);
            if (activeTake && activeTake.videoBlobUrl) {
                const videoEl = document.getElementById('inspector-video');
                if (videoEl && videoEl.getAttribute('src') !== activeTake.videoBlobUrl) {
                    videoEl.src = activeTake.videoBlobUrl;
                    videoEl.classList.remove('hidden');
                    const imgEl = document.getElementById('inspector-image');
                    if(imgEl) imgEl.classList.add('hidden');
                    const placeholder = document.getElementById('video-placeholder');
                    if(placeholder) placeholder.classList.add('hidden');
                }
            }
        }
    },

    // --- COMPATIBILIDAD WITH AI.JS (BRIDGE) ---
    updateAuthUI(isConnected) {
        const text = document.getElementById('auth-status-text');
        const indicator = document.getElementById('auth-indicator');
        
        if (ai.aiProvider === 'ollama') {
            if(text) text.innerText = "LOCAL (OLLAMA)";
            if(indicator) indicator.className = "w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
            return;
        }

        if (isConnected) {
            if(text) text.innerText = "ONLINE";
            if(indicator) indicator.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
        } else {
            if(text) text.innerText = "OFFLINE";
            if(indicator) indicator.className = "w-2 h-2 rounded-full bg-gray-300";
        }
    },
    
    // --- MODALES & LOADING ---
    toggleConfigModal() {
        const modal = document.getElementById('system-config-modal');
        if(modal) {
            modal.classList.toggle('hidden');
            if(!modal.classList.contains('hidden')) {
                const savedKey = localStorage.getItem('googlecloud_api_key') || "";
                const inputKey = document.getElementById('cfg-google-key');
                if(inputKey) inputKey.value = savedKey;

                // Hidratar campos de Ollama y el Modelo de Lenguaje de Pollinations
                const providerSelect = document.getElementById('cfg-ai-provider');
                if(providerSelect) providerSelect.value = ai.aiProvider;

                const pollinationsModelSelect = document.getElementById('cfg-pollinations-model-select');
                if(pollinationsModelSelect) pollinationsModelSelect.value = ai.pollinationsModel;

                const ollamaUrlInp = document.getElementById('cfg-ollama-url');
                if(ollamaUrlInp) ollamaUrlInp.value = ai.ollamaUrl;
                
                // HIDRATAR VALORES DE COMFYUI LOCAL
                if(document.getElementById('cfg-comfy-model')) {
                    document.getElementById('cfg-comfy-model').value = localStorage.getItem('comfy_model') || "juggernautXL_ragnarokBy.safetensors";
                    document.getElementById('cfg-comfy-width').value = localStorage.getItem('comfy_width') || "1024";
                    document.getElementById('cfg-comfy-height').value = localStorage.getItem('comfy_height') || "1024";
                    document.getElementById('cfg-comfy-steps').value = localStorage.getItem('comfy_steps') || "6";
                    document.getElementById('cfg-comfy-cfg').value = localStorage.getItem('comfy_cfg') || "2.0";
                    document.getElementById('cfg-comfy-sampler').value = localStorage.getItem('comfy_sampler') || "dpmpp_sde";
                    document.getElementById('cfg-comfy-neg').value = localStorage.getItem('comfy_neg') || "bad anatomy, blurry, watermark, worst quality";
                }

                this.updateProviderFieldsVisibility(ai.aiProvider);
                this.fetchOllamaModels();
            }
        }
    },

    updateProviderFieldsVisibility(provider) {
        const polBlock = document.getElementById('cfg-pollinations-block');
        const polModelBlock = document.getElementById('cfg-pollinations-model-block');
        const ollBlock = document.getElementById('cfg-ollama-block');
        if(provider === 'pollinations') {
            if(polBlock) polBlock.classList.remove('hidden');
            if(polModelBlock) polModelBlock.classList.remove('hidden');
            if(ollBlock) ollBlock.classList.add('hidden');
        } else {
            if(polBlock) polBlock.classList.add('hidden');
            if(polModelBlock) polModelBlock.classList.add('hidden');
            if(ollBlock) ollBlock.classList.remove('hidden');
        }
    },

    async fetchOllamaModels() {
        const select = document.getElementById('cfg-ollama-model-select');
        if (!select) return;

        const baseUrl = localStorage.getItem('escaleta_ollama_url') || 'http://127.0.0.1:11434/api';
        
        try {
            const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            const res = await fetch(`${cleanUrl}/tags`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            select.innerHTML = '';
            if (data.models && data.models.length > 0) {
                const savedSelected = localStorage.getItem('escaleta_selected_ollama_model') || '';
                data.models.forEach(model => {
                    const opt = document.createElement('option');
                    opt.value = model.name;
                    opt.innerText = model.name.toUpperCase();
                    if (model.name === savedSelected) opt.selected = true;
                    select.appendChild(opt);
                });
            } else {
                select.innerHTML = '<option value="">SIN MODELOS LOCALES</option>';
            }
        } catch (e) {
            select.innerHTML = '<option value="">OLLAMA DISCONNECTED / OFFLINE</option>';
        }
    },

    saveSystemConfig() {
        const provider = document.getElementById('cfg-ai-provider').value;
        const pollinationsModel = document.getElementById('cfg-pollinations-model-select').value;
        const urlOllama = document.getElementById('cfg-ollama-url').value.trim();
        const modelOllama = document.getElementById('cfg-ollama-model-select').value;
        
        ai.aiProvider = provider;
        ai.pollinationsModel = pollinationsModel;
        ai.ollamaUrl = urlOllama;
        
        localStorage.setItem('escaleta_ai_provider', provider);
        localStorage.setItem('escaleta_pollinations_model', pollinationsModel);
        localStorage.setItem('escaleta_ollama_url', urlOllama);
        if(modelOllama) localStorage.setItem('escaleta_selected_ollama_model', modelOllama);

        // SALVAGUARDAR VALORES DE COMFYUI LOCAL EN DISCO
        if (document.getElementById('cfg-comfy-model')) {
            localStorage.setItem('comfy_model', document.getElementById('cfg-comfy-model').value);
            localStorage.setItem('comfy_width', document.getElementById('cfg-comfy-width').value);
            localStorage.setItem('comfy_height', document.getElementById('cfg-comfy-height').value);
            localStorage.setItem('comfy_steps', document.getElementById('cfg-comfy-steps').value);
            localStorage.setItem('comfy_cfg', document.getElementById('cfg-comfy-cfg').value);
            localStorage.setItem('comfy_sampler', document.getElementById('cfg-comfy-sampler').value);
            localStorage.setItem('comfy_neg', document.getElementById('cfg-comfy-neg').value);
        }

        this.updateAuthUI(!!ai.apiKey);
        alert("Configuración de Motores de Inteligencia Artificial guardada.");
        this.toggleConfigModal();
    },

    saveGoogleKeyFromModal() {
        const inputKey = document.getElementById('cfg-google-key');
        if(inputKey) {
            const val = inputKey.value.trim();
            localStorage.setItem('googlecloud_api_key', val);
            if(window.parent) window.parent.googlecloudapikey = val;
            alert("API Key de Google Cloud guardada correctamente.");
            this.toggleConfigModal();
            if(window.Generators && typeof Generators.loadGoogleVoices === 'function') {
                Generators.loadGoogleVoices();
            }
        }
    },

    async selectProjectFolderNative() {
        try {
            if (!window.showDirectoryPicker) {
                return alert("Tu navegador no soporta el acceso nativo al File System. Usa Chrome, Edge u Opera.");
            }
            const folderHandle = await window.showDirectoryPicker({
                mode: "readwrite"
            });
            if (folderHandle) {
                EscaletaCore.loadProject(folderHandle);
            }
        } catch (e) {
            console.warn("Selección de directorio cancelada o fallida:", e);
        }
    },

    toggleScriptModal() {
        const modal = document.getElementById('script-input-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                setTimeout(() => document.getElementById('manual-script-text').focus(), 100);
            }
        }
    },

    toggleComicModal() {
        const modal = document.getElementById('comic-input-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                setTimeout(() => document.getElementById('manual-comic-text').focus(), 100);
            }
        }
    },

    toggleExportModal() {
        const modal = document.getElementById('export-modal');
        if(modal) modal.classList.toggle('hidden');
    },
    
    toggleLoading(show, title, sub) {
        const el = document.getElementById('loading-overlay');
        const bar = document.getElementById('progress-container');
        
        if (show) {
            el.classList.remove('hidden');
            document.getElementById('loading-title').innerText = title || "PROCESANDO";
            document.getElementById('loading-subtitle').innerText = sub || "";
            bar.classList.remove('hidden'); 
            this.updateProgressBar(0);
        } else {
            el.classList.add('hidden');
        }
    },
    
    updateProgressBar(percent) {
        document.getElementById('progress-bar').style.width = `${percent}%`;
    },
    
    updateProjectName(name) {
        document.getElementById('project-name-display').innerText = name;
    },
    
    updateStats() {
        const count = EscaletaCore.data.takes.length;
        const duration = count * 4; 
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        document.getElementById('timeline-stats').innerText = `${count} TOMAS | ${mins}:${secs.toString().padStart(2,'0')} TOTAL (EST)`;
    },

    // --- NAVEGADOR DE ACTOS ---
    jumpToAct(takeId) {
        if (!takeId) return;
        
        let target = document.getElementById(`act-header-${takeId}`);
        if (!target) {
            target = document.getElementById(`card-${takeId}`);
        }
        
        if (target) {
            const container = document.getElementById('takes-list');
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        setTimeout(() => {
            const actNav = document.getElementById('act-navigator');
            if (actNav) actNav.value = "";
        }, 500);
    },
    
    // --- RENDER DE LISTA DE TOMAS ---
    renderTakes(takes) {
    const container = document.getElementById('takes-list');
    container.innerHTML = '';
    
    const actNav = document.getElementById('act-navigator');
    if (actNav) actNav.innerHTML = '<option value="">Navegar a Acto...</option>';

    if (!takes || takes.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
        return;
    }
    document.getElementById('empty-state').classList.add('hidden');

    takes.forEach(take => {

        // --- RENDER DEL MARCADOR DE ACTO ---
        if (take.act_marker) {
            const actDiv = document.createElement('div');
            actDiv.id = `act-header-${take.id}`;
            actDiv.className = "flex items-center gap-4 mb-2 mt-6 px-2";
            actDiv.innerHTML = `
                <div class="flex items-center justify-center w-8 h-8 rounded bg-indigo-100 text-indigo-600 shrink-0 shadow-sm border border-indigo-200">
                    <i class="fa-solid fa-bookmark"></i>
                </div>
                <input type="text" class="bg-transparent text-sm font-bold text-indigo-900 uppercase tracking-widest outline-none border-b border-transparent focus:border-indigo-300 transition-colors w-64" value="${take.act_marker}" onchange="EscaletaCore.updateTake('${take.id}', 'act_marker', this.value); EscaletaUI.renderTakes(EscaletaCore.data.takes)" placeholder="NOMBRE DEL ACTO">
                
                <button onclick="EscaletaCore.copyActPrompts('${take.id}')" class="text-blue-500 hover:text-blue-700 transition-colors text-xs px-2 font-bold" title="Copiar Prompts del Acto"><i class="fa-solid fa-copy mr-1"></i> Copiar Prompts</button>

                <button onclick="EscaletaCore.toggleActMarker('${take.id}')" class="text-gray-400 hover:text-orange-500 transition-colors text-xs px-2" title="Quitar Marcador (Mantiene tomas)"><i class="fa-solid fa-times"></i></button>
                
                <button onclick="EscaletaCore.deleteActAndTakes('${take.id}')" class="text-red-400 hover:text-red-600 transition-colors text-xs px-2 bg-red-50 hover:bg-red-100 border border-red-100 rounded py-1 px-2 ml-2 font-bold" title="Borrar Acto Completo y sus Tomas"><i class="fa-solid fa-trash mr-1"></i> Borrar Acto Completo</button>

                <div class="flex-1 h-px bg-indigo-100"></div>
            `;
            container.appendChild(actDiv);

            if (actNav) {
                const opt = document.createElement('option');
                opt.value = take.id;
                opt.innerText = take.act_marker;
                actNav.appendChild(opt);
            }
        }

        // --- RENDER DE LA TOMA ---
        const card = document.createElement('div');
        card.id = `card-${take.id}`;
        card.className = "take-card flex p-4 gap-4 items-start";
        
        let visualStatusClass = 'pending';
        let visualStatusText = 'PENDIENTE';
        
        if (take.video_file || take.image_file || take.image64) {
            visualStatusClass = 'success';
            visualStatusText = take.video_file ? 'VIDEO LISTO' : 'IMAGEN LISTA';
        }
        
        const audStatusClass = take.audio_file ? 'success' : 'pending';
        const audStatusText = take.audio_file ? 'LISTO' : 'PENDIENTE';

        // LÓGICA DE RENDERIZADO DE IMAGEN/VIDEO:
        // Prioridad: 1. Video Blob | 2. Imagen Base64 (de cronología) | 3. Imagen Blob (archivo local) | 4. Placeholder
        let mediaHtml = `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300">
                            <i class="fa-solid fa-film text-xl"></i>
                         </div>`;
        
        if (take.videoBlobUrl) {
            mediaHtml = `<video src="${take.videoBlobUrl}" class="take-video-preview w-full h-full object-cover" muted onmouseover="this.play()" onmouseout="this.pause()"></video>`;
        } else if (take.image64) {
            mediaHtml = `<img src="${take.image64}" class="take-image-preview w-full h-full object-cover">`;
        } else if (take.imageBlobUrl) {
            mediaHtml = `<img src="${take.imageBlobUrl}" class="take-image-preview w-full h-full object-cover">`;
        }
        
        const btnBookmarkColor = take.act_marker ? 'text-indigo-600' : 'text-gray-300';
        const btnBookmarkTitle = take.act_marker ? 'Quitar Marcador de Acto' : 'Añadir Marcador de Acto';

        card.innerHTML = `
            <div class="flex flex-col items-center gap-2 pt-1 h-full pb-1">
                <span class="text-xs font-bold text-gray-400 font-mono">#${take.sequence_order.toString().padStart(2,'0')}</span>
                <button onclick="Inspector.selectTake('${take.id}')" class="text-indigo-500 hover:text-indigo-700 mt-1" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                
                <div class="h-px w-6 bg-gray-100 my-1"></div>
                
                <button onclick="EscaletaCore.toggleActMarker('${take.id}')" class="${btnBookmarkColor} hover:text-indigo-500 text-xs mb-1 transition-colors" title="${btnBookmarkTitle}"><i class="fa-solid fa-bookmark"></i></button>

                <button onclick="EscaletaCore.addTake('${take.id}', 'before')" class="text-emerald-500 hover:text-emerald-700 text-xs flex flex-col items-center" title="Añadir toma antes">
                    <i class="fa-solid fa-plus"></i><i class="fa-solid fa-angle-up text-[9px] -mt-1"></i>
                </button>
                
                <button onclick="EscaletaCore.addTake('${take.id}', 'after')" class="text-emerald-500 hover:text-emerald-700 text-xs flex flex-col items-center mt-1" title="Añadir toma después">
                    <i class="fa-solid fa-angle-down text-[9px] -mb-1"></i><i class="fa-solid fa-plus"></i>
                </button>
                
                <div class="h-px w-6 bg-gray-100 my-1"></div>
                
                <button onclick="EscaletaCore.deleteTake('${take.id}')" class="text-red-400 hover:text-red-600 text-xs" title="Eliminar toma"><i class="fa-solid fa-trash"></i></button>
            </div>

            <div class="w-32 aspect-video bg-black rounded overflow-hidden shrink-0 border border-gray-200 cursor-pointer" onclick="Inspector.selectTake('${take.id}')">
                ${mediaHtml}
            </div>

            <div class="flex-1 space-y-2">
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[9px] uppercase font-bold text-gray-400">Visual Prompt</span>
                        <span class="status-badge video-status ${visualStatusClass}">${visualStatusText}</span>
                    </div>
                    <textarea class="escaleta-input text-gray-600 bg-gray-50/50 p-2 rounded h-16" onchange="EscaletaCore.updateTake('${take.id}', 'visual_prompt', this.value)">${take.visual_prompt}</textarea>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[9px] uppercase font-bold text-gray-400">Narración (TTS)</span>
                        <span class="status-badge audio-status ${audStatusClass}">${audStatusText}</span>
                    </div>
                    <input type="text" class="escaleta-input font-medium" value="${take.narration_text}" onchange="EscaletaCore.updateTake('${take.id}', 'narration_text', this.value)">
                </div>
            </div>

            <div class="flex flex-col gap-2 pt-4">
                <button title="Generar Imagen" onclick="Generators.generateImageForTake('${take.id}')" class="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:border-orange-500 hover:text-orange-600 transition-colors text-gray-400">
                    <i class="fa-solid fa-image"></i>
                </button>
                <button title="Generar Video" onclick="Generators.generateVideoForTake('${take.id}')" class="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:border-indigo-500 hover:text-indigo-600 transition-colors text-gray-400">
                    <i class="fa-solid fa-video"></i>
                </button>
                <button title="Generar Audio" onclick="Generators.generateAudioForTake('${take.id}')" class="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:border-pink-500 hover:text-pink-600 transition-colors text-gray-400">
                    <i class="fa-solid fa-microphone"></i>
                </button>
            </div>
        `;
        
        container.appendChild(card);
    });
},
    
    clearAll() {
        if(confirm("¿Borrar toda la lista de tomas? (Los archivos generados permanecerán en la carpeta, pero se perderá la referencia)")) {
            EscaletaCore.data.takes = [];
            EscaletaCore.saveToDisk();
            this.renderTakes([]);
            this.updateStats();
        }
    }
};

window.ui = EscaletaUI;
window.EscaletaUI = EscaletaUI;