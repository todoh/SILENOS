// --- cronologia/ui.js ---
// INTERFAZ DE USUARIO (MODIFICADO PARA SELECCIÓN DE FORMATO)

const ui = {
    selectedFolderHandle: null,
    selectedEventId: null,

    init() {
        // Listeners básicos
        document.getElementById('inp-time').addEventListener('input', (e) => main.updateSelected('time', parseFloat(e.target.value)));
        document.getElementById('inp-title').addEventListener('input', (e) => main.updateSelected('description', e.target.value));
        
        // Listener Imagen (Subida manual)
        document.getElementById('inp-img').addEventListener('change', (e) => {
            const f = e.target.files[0];
            if(!f) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                main.updateSelected('image64', evt.target.result);
                this.renderInspectorImage(evt.target.result);
            };
            reader.readAsDataURL(f);
        });
    },

    updateAuthUI(isConnected) {
        const btn = document.getElementById('auth-btn');
        if (isConnected) {
            btn.innerText = "ONLINE";
            btn.classList.add('text-green-500');
        } else {
            btn.innerText = "CONECTAR IA";
            btn.classList.remove('text-green-500');
        }
    },

    toggleFileSelector() {
        const modal = document.getElementById('file-modal');
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) this.refreshFolderList();
    },

    toggleAIModal() { document.getElementById('ai-modal').classList.toggle('hidden'); },
    togglePremiseModal() { document.getElementById('premise-modal').classList.toggle('hidden'); },
    toggleStoryboardModal() { document.getElementById('storyboard-modal').classList.toggle('hidden'); },

    toggleLoading(show, text, subtext="") {
        const el = document.getElementById('ai-loading-overlay');
        if(show) {
            el.classList.remove('hidden');
            el.classList.add('flex');
            document.getElementById('ai-loading-text').innerText = text;
            document.getElementById('ai-loading-subtext').innerText = subtext;
        } else {
            el.classList.add('hidden');
            el.classList.remove('flex');
        }
    },

    // --- FILE SYSTEM UI ---
    async refreshFolderList() {
        const list = document.getElementById('folder-list'); 
        list.innerHTML = '';
        const FS = window.parent;
        
        if (!FS || !FS.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400 font-light">Root Handle no accesible.</div>';
            return;
        }
        this.addFolderOption(list, FS.rootHandle, 'RAÍZ DEL PROYECTO', true);
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
        const isSelected = this.selectedFolderHandle === handle;
        el.className = `px-6 py-3 cursor-pointer border-b border-gray-50 flex items-center gap-4 text-xs font-light transition-colors ${isSelected ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50'}`;
        el.innerHTML = `<i class="fa-solid ${isRoot?'fa-database':'fa-folder'} ${isRoot?'text-black':'text-gray-300'} text-[10px]"></i><span class="truncate w-full tracking-wide">${displayName}</span>`;
        el.onclick = () => {
            this.selectedFolderHandle = handle;
            document.getElementById('current-folder-label').innerText = displayName.split('/').pop();
            Array.from(container.children).forEach(c => c.classList.remove('bg-gray-100', 'text-black'));
            el.classList.add('bg-gray-100', 'text-black');
        };
        container.appendChild(el);
    },

    // --- INSPECTOR UI (MODIFICADO) ---
    showInspector(ev) {
        document.getElementById('inspector-empty').classList.add('hidden');
        document.getElementById('inspector-content').classList.remove('hidden');

        document.getElementById('inp-time').value = ev.time;
        document.getElementById('inp-title').value = ev.description || "";
        
        // IMAGEN
        this.renderInspectorImage(ev.image64);
        
        // PROMPT VISUAL Y CONTROLES (MODIFICADO)
        // Buscamos o creamos el textarea del prompt visual
        let promptContainer = document.getElementById('visual-prompt-container');
        if (!promptContainer) {
            // Si no existe (primera carga), lo creamos dinámicamente debajo de la imagen
            const parent = document.getElementById('inspector-img-section');
            promptContainer = document.createElement('div');
            promptContainer.id = 'visual-prompt-container';
            promptContainer.className = "mt-4 border-t border-gray-100 pt-4";
            promptContainer.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <label class="label-text text-purple-600">Prompt Visual (IA)</label>
                    
                    <div class="flex items-center gap-2">
                        <select id="inp-aspect-ratio" class="text-[9px] bg-white border border-gray-200 rounded px-1 py-1 text-gray-600 outline-none hover:border-purple-300 transition-colors">
                            <option value="landscape">Horizontal (16:9)</option>
                            <option value="portrait">Vertical (9:16)</option>
                        </select>

                        <button id="btn-gen-single" class="text-[9px] bg-black text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors uppercase font-bold tracking-wider">
                            <i class="fa-solid fa-paintbrush"></i>
                        </button>
                    </div>
                </div>
                <textarea id="inp-visual-prompt" class="config-input text-[10px] font-mono text-purple-800 bg-purple-50/30 p-2 border border-purple-100 rounded h-20 resize-none" placeholder="Prompt para la imagen..."></textarea>
            `;
            parent.appendChild(promptContainer);
        }

        // Configurar valores
        const txtArea = document.getElementById('inp-visual-prompt');
        txtArea.value = ev.visualPrompt || "";
        txtArea.onchange = (e) => main.updateSelected('visualPrompt', e.target.value);
        
        // Configurar Selector de Aspecto
        const ratioSelect = document.getElementById('inp-aspect-ratio');
        ratioSelect.value = ev.aspectRatio || 'landscape'; // Default a landscape
        ratioSelect.onchange = (e) => main.updateSelected('aspectRatio', e.target.value);

        // Actualizar onclick del botón con el ID actual
        const btnGen = document.getElementById('btn-gen-single');
        btnGen.onclick = () => ImgGen.generateSingle(ev.id);

        this.renderMoments(ev);
    },

    hideInspector() {
        document.getElementById('inspector-content').classList.add('hidden');
        document.getElementById('inspector-empty').classList.remove('hidden');
    },

    renderInspectorImage(base64) {
        const img = document.getElementById('img-element');
        const place = document.getElementById('img-placeholder');
        if (base64) {
            img.src = base64;
            img.classList.remove('hidden');
            place.classList.add('hidden');
        } else {
            img.classList.add('hidden');
            place.classList.remove('hidden');
        }
    },

    renderMoments(ev) {
        const list = document.getElementById('moments-list');
        list.innerHTML = '';
        const moments = ev.moments || [];
        
        moments.forEach((m, idx) => {
            const row = document.createElement('div');
            row.className = "flex flex-col gap-1 group relative";
            row.innerHTML = `
                <div class="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1 z-10">
                    <button class="w-5 h-5 bg-white shadow border border-gray-200 text-red-400 hover:text-red-600 rounded-full flex items-center justify-center text-[10px]"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <textarea class="config-input text-xs font-serif leading-relaxed text-gray-700 bg-white border border-gray-100 p-3 rounded shadow-sm focus:border-indigo-200 focus:shadow-md transition-all h-auto min-h-[80px]" placeholder="Escribe lo que ocurre...">${m.text}</textarea>
            `;
            
            const area = row.querySelector('textarea');
            area.style.height = 'auto';
            area.style.height = (area.scrollHeight) + 'px';
            
            area.oninput = (e) => { 
                m.text = e.target.value; 
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
                main.saveData(); 
            };
            
            row.querySelector('button').onclick = () => main.deleteMoment(idx);
            list.appendChild(row);
        });
    }
};