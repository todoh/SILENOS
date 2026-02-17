// --- cronologia/escaleta/ui.js ---
// INTERFAZ DE USUARIO

const EscaletaUI = {

    init() {
        // Listeners globales si son necesarios
    },
    
    // --- COMPATIBILIDAD CON AI.JS (BRIDGE) ---
    // Esta función permite que ai.js actualice el botón de conexión en Escaleta
    updateAuthUI(isConnected) {
        const text = document.getElementById('auth-status-text');
        const indicator = document.getElementById('auth-indicator');
        
        if (isConnected) {
            if(text) text.innerText = "ONLINE";
            if(indicator) indicator.className = "w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
        } else {
            if(text) text.innerText = "OFFLINE";
            if(indicator) indicator.className = "w-2 h-2 rounded-full bg-gray-300";
        }
    },
    
    // --- MODALES & LOADING ---
    toggleFileSelector() {
        const modal = document.getElementById('file-modal');
        modal.classList.toggle('hidden');
        if(!modal.classList.contains('hidden')) this.refreshFolderList();
    },

    // Toggle para el modal de Script Manual
    toggleScriptModal() {
        const modal = document.getElementById('script-input-modal');
        if (modal) {
            modal.classList.toggle('hidden');
            // Foco al textarea si se abre
            if (!modal.classList.contains('hidden')) {
                setTimeout(() => document.getElementById('manual-script-text').focus(), 100);
            }
        }
    },

    // --- NUEVO: ESTA ES LA FUNCIÓN QUE FALTABA ---
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
            bar.classList.remove('hidden'); // Mostrar barra siempre por defecto en loading
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
        const duration = count * 5; // Estimado 5s por toma
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        document.getElementById('timeline-stats').innerText = `${count} TOMAS | ${mins}:${secs.toString().padStart(2,'0')} TOTAL (EST)`;
    },
    
    // --- RENDER DE LISTA DE TOMAS ---
    renderTakes(takes) {
        const container = document.getElementById('takes-list');
        container.innerHTML = '';
    
        if (!takes || takes.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }
        document.getElementById('empty-state').classList.add('hidden');
    
        takes.forEach(take => {
            const card = document.createElement('div');
            card.id = `card-${take.id}`;
            card.className = "take-card flex p-4 gap-4 items-start";
            
            // Estado de Video
            const vidStatusClass = take.video_file ? 'success' : 'pending';
            const vidStatusText = take.video_file ? 'LISTO' : 'PENDIENTE';
            
            // Estado de Audio
            const audStatusClass = take.audio_file ? 'success' : 'pending';
            const audStatusText = take.audio_file ? 'LISTO' : 'PENDIENTE';
    
            // Preview Thumbnail (Si hay video, mostramos video muted en hover, si no placeholder)
            let mediaHtml = `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-300">
                                <i class="fa-solid fa-film text-xl"></i>
                             </div>`;
            
            if (take.videoBlobUrl) {
                mediaHtml = `<video src="${take.videoBlobUrl}" class="take-video-preview w-full h-full object-cover" muted onmouseover="this.play()" onmouseout="this.pause()"></video>`;
            }
    
            card.innerHTML = `
                <div class="flex flex-col items-center gap-2 pt-1">
                    <span class="text-xs font-bold text-gray-400 font-mono">#${take.sequence_order.toString().padStart(2,'0')}</span>
                    <button onclick="Inspector.selectTake('${take.id}')" class="text-indigo-500 hover:text-indigo-700"><i class="fa-solid fa-pen-to-square"></i></button>
                </div>
    
                <div class="w-32 aspect-video bg-black rounded overflow-hidden shrink-0 border border-gray-200 cursor-pointer" onclick="Inspector.selectTake('${take.id}')">
                    ${mediaHtml}
                </div>
    
                <div class="flex-1 space-y-2">
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[9px] uppercase font-bold text-gray-400">Visual Prompt</span>
                            <span class="status-badge video-status ${vidStatusClass}">${vidStatusText}</span>
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
    
                <div class="flex flex-col gap-2 pt-6">
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
    },
    
    // --- FOLDER SELECTOR LOGIC (Reutilizada de Cronologia) ---
    async refreshFolderList() {
        const list = document.getElementById('folder-list');
        list.innerHTML = '';
        const FS = window.parent; 
        if (!FS || !FS.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400 font-light">No se detecta Silenos (Root).</div>';
            return;
        }
        this.addFolderOption(list, FS.rootHandle, 'RAÍZ', true);
        await this.scanDirRecursive(FS.rootHandle, list, 'ROOT');
    },
    
    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 2) return;
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${pathString} / ${entry.name}`;
                this.addFolderOption(listElement, entry, currentPath);
                await this.scanDirRecursive(entry, listElement, currentPath, depth + 1);
            }
        }
    },
    
    addFolderOption(container, handle, displayName, isRoot = false) {
        const el = document.createElement('div');
        el.className = "px-6 py-3 cursor-pointer border-b border-gray-50 flex items-center gap-4 text-xs font-light text-gray-600 hover:bg-gray-50";
        el.innerHTML = `<i class="fa-solid ${isRoot?'fa-database':'fa-folder'} text-indigo-400"></i><span>${displayName}</span>`;
        el.onclick = () => {
            EscaletaCore.loadProject(handle);
            this.toggleFileSelector();
        };
        container.appendChild(el);
    }
};
    
// --- INSPECTOR (Panel Derecho) ---
const Inspector = {
    selectedTakeId: null,
    
    selectTake(takeId) {
        this.selectedTakeId = takeId;
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if(!take) return;
    
        // Highlight Card
        document.querySelectorAll('.take-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`card-${takeId}`).classList.add('active');
    
        // Setup Player
        const videoEl = document.getElementById('inspector-video');
        const placeholder = document.getElementById('video-placeholder');
        
        if (take.videoBlobUrl) {
            videoEl.src = take.videoBlobUrl;
            videoEl.classList.remove('hidden');
            placeholder.classList.add('hidden');
            videoEl.play();
        } else {
            videoEl.pause();
            videoEl.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    
        // Render Edit Form
        const container = document.getElementById('inspector-forms');
        container.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="label-text">ID TÉCNICO</label>
                    <input disabled value="${take.id}" class="escaleta-input text-gray-400 font-mono">
                </div>
                <div>
                    <label class="label-text">ARCHIVO VIDEO</label>
                    <input disabled value="${take.video_file || '---'}" class="escaleta-input text-gray-400">
                </div>
                <div>
                    <label class="label-text">ARCHIVO AUDIO</label>
                    <input disabled value="${take.audio_file || '---'}" class="escaleta-input text-gray-400">
                </div>
            </div>
        `;
    },
    
    togglePlay() {
        const v = document.getElementById('inspector-video');
        if(v.paused) v.play(); else v.pause();
    },
    
    toggleMute() {
        const v = document.getElementById('inspector-video');
        v.muted = !v.muted;
    }
};
    
// --- ALIAS GLOBAL ---
window.ui = EscaletaUI;