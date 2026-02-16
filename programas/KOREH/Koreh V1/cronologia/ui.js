// --- ui.js: INTERFAZ DE USUARIO ---

const ui = {
    selectedFolderHandle: null,
    selectedEventId: null,

    init() {
        // Listeners para el inspector
        document.getElementById('inp-time').addEventListener('input', (e) => main.updateSelected('time', parseFloat(e.target.value)));
        document.getElementById('inp-title').addEventListener('input', (e) => main.updateSelected('description', e.target.value));
        
        // Listener Imagen
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

    toggleAIModal() {
        document.getElementById('ai-modal').classList.toggle('hidden');
    },

    // --- NUEVO: PREMISE MODAL UI ---
    togglePremiseModal() {
        const modal = document.getElementById('premise-modal');
        modal.classList.toggle('hidden');
        
        // Reset visual simple si se abre
        if (!modal.classList.contains('hidden')) {
            document.getElementById('genesis-direction').focus();
        }
    },

    // --- FUNCIÓN RESTAURADA ---
    toggleStoryboardModal() {
        document.getElementById('storyboard-modal').classList.toggle('hidden');
    },

    useGeneratedPremise() {
        const txt = document.getElementById('genesis-output').value;
        if (!txt) return;
        document.getElementById('ai-prompt').value = txt;
        this.togglePremiseModal();
        // Asegurar que el modal principal está visible
        document.getElementById('ai-modal').classList.remove('hidden');
    },

    // --- FILE SYSTEM UI ---
    async refreshFolderList() {
        const list = document.getElementById('folder-list'); 
        list.innerHTML = '';
        
        // CORRECCIÓN: Usar window.parent directamente como en Cronologia.html
        const FS = window.parent;
        
        if (!FS || !FS.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400 font-light">Root Handle no accesible o no definido en el padre.</div>';
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

    // --- INSPECTOR UI ---
    showInspector(ev) {
        document.getElementById('inspector-empty').classList.add('hidden');
        document.getElementById('inspector-content').classList.remove('hidden');

        document.getElementById('inp-time').value = ev.time;
        document.getElementById('inp-title').value = ev.description;
        this.renderInspectorImage(ev.image64);
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
            // Auto resize
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