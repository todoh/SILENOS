// --- BRIDGE CON SILENOS (MODO DIRECTO) ---
// Extractor usa directamente window.parent como FS
const FS = window.parent; 
const Sys = window.parent.SystemConfig;

// --- UTILS UI ---
const ui = {
    selectedFolderHandle: null, // Guardamos el Handle real aquí

    updateAuthUI() {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');

        if (Sys && Sys.authKey) {
            indicator.className = "w-1.5 h-1.5 rounded-full bg-black"; 
            text.innerText = "CONECTADO";
            text.className = "text-[10px] font-medium text-black uppercase tracking-wider";
        } else {
            indicator.className = "w-1.5 h-1.5 rounded-full bg-gray-200"; 
            text.innerText = "DESCONECTADO";
            text.className = "text-[10px] font-medium text-gray-300 uppercase tracking-wider";
        }
    },
    
    log(msg, type = 'info') {
        const c = document.getElementById('process-log');
        const el = document.createElement('div');
        
        let base = 'log-enter flex gap-3 items-start text-[10px] font-mono leading-relaxed text-gray-500';
        let iconHTML = `<span class="mt-1 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>`;
        
        if(type === 'success' || type === 'ready') { 
            base = 'log-enter flex gap-3 items-start text-[10px] font-mono leading-relaxed text-black';
            iconHTML = `<i class="fa-solid fa-check mt-0.5 text-black text-[8px]"></i>`;
        }
        if(type === 'error') { 
            base = 'log-enter flex gap-3 items-start text-[10px] font-mono leading-relaxed text-red-500'; 
            iconHTML = `<i class="fa-solid fa-xmark mt-0.5 text-red-500 text-[8px]"></i>`;
        } 
        if(type === 'architect') {
            base = 'log-enter flex gap-3 items-start text-[10px] font-mono leading-relaxed text-architect';
            iconHTML = `<i class="fa-solid fa-compass-drafting mt-0.5 text-[8px]"></i>`;
        }
        if(type === 'writer') {
            base = 'log-enter flex gap-3 items-start text-[10px] font-mono leading-relaxed text-writer';
            iconHTML = `<i class="fa-solid fa-pen-nib mt-0.5 text-[8px]"></i>`;
        }
        if(type === 'critic') {
            base = 'log-enter flex gap-3 items-start text-[10px] font-mono leading-relaxed text-critic';
            iconHTML = `<i class="fa-solid fa-glasses mt-0.5 text-[8px]"></i>`;
        }

        el.className = base;
        el.innerHTML = `${iconHTML} <span>${msg}</span>`;
        c.prepend(el);
    },

    toggleFileSelector() {
        const modal = document.getElementById('file-modal');
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) this.refreshFolderList();
    },

    // --- LÓGICA DE ESCANEO DE CARPETAS (PORTADA DE EXTRACTOR) ---
    async refreshFolderList() {
        const list = document.getElementById('folder-list'); 
        list.innerHTML = '';

        if (!FS.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400 font-light">Error: Root Handle no encontrado en Silenos.</div>';
            return;
        }

        // Añadir Root
        this.addFolderOption(list, FS.rootHandle, 'ROOT', true);
        // Escaneo recursivo
        await this.scanDirRecursive(FS.rootHandle, list, 'ROOT');
    },

    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 3) return; 

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
        
        const iconClass = isRoot ? 'fa-database' : (isSelected ? 'fa-folder-open' : 'fa-folder');
        const colorClass = isRoot ? 'text-black' : 'text-gray-300';
        
        el.innerHTML = `
            <i class="fa-solid ${iconClass} ${colorClass} text-[10px]"></i>
            <span class="truncate w-full tracking-wide">${displayName}</span>
        `;
        
        el.onclick = () => {
            this.selectedFolderHandle = handle;
            document.getElementById('current-folder-label').innerText = displayName.split('/').pop();
            this.refreshFolderList(); 
        };
        container.appendChild(el);
    },

    appendManuscript(momentTitle, text) {
        const container = document.getElementById('chat-container');
        if (container.querySelector('.italic')) container.innerHTML = '';

        const div = document.createElement('div');
        div.className = "prose-content animate-fade-in";
        const titleHtml = momentTitle ? `<div class="text-[10px] font-sans font-bold text-gray-300 mb-4 uppercase tracking-widest border-b border-gray-100 pb-2">${momentTitle}</div>` : '';
        div.innerHTML = `${titleHtml}<div class="text-gray-800 leading-loose">${marked.parse(text)}</div>`;
        container.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth', block: 'end' });
    },

    showTyping() {
        const container = document.getElementById('chat-container');
        const div = document.createElement('div'); div.id = "typing-indicator";
        div.className = "flex gap-1 p-4 mb-4 w-16 mx-auto opacity-50";
        div.innerHTML = `<div class="w-1 h-1 bg-black rounded-full typing-dot"></div><div class="w-1 h-1 bg-black rounded-full typing-dot"></div>`;
        container.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth' });
    },
    
    hideTyping() { 
        const el = document.getElementById('typing-indicator'); 
        if(el) el.remove(); 
    }
};

window.addEventListener('load', () => {
    ui.updateAuthUI();
    window.parent.addEventListener('silenos:config-updated', ui.updateAuthUI);
});