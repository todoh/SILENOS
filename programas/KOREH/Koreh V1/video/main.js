// --- GESTIÓN DE SISTEMA DE ARCHIVOS (BRIDGE CON SILENOS) ---
const Project = {
    data: { events: [] },
    selectedFolderHandle: null,
    saveTimer: null, // Timer para controlar el autoguardado y no saturar el disco

    // Carga definitiva al pulsar el botón del modal
    async confirmFolderSelection() {
        if (!this.selectedFolderHandle) return alert("Selecciona una carpeta primero.");
        
        UI.toggleFileSelector(); // Cerrar modal

        try {
            // Intenta leer el archivo de la línea de tiempo
            const fileHandle = await this.selectedFolderHandle.getFileHandle('TIMELINE_DATA.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            
            this.data = JSON.parse(text);
            if (!this.data.events) this.data.events = [];
            
            // --- HIDRATACIÓN DE AUDIOS (Base64 -> Blob) ---
            // Recuperamos los audios guardados para que el reproductor funcione al instante
            console.log("Cargando proyecto... Hidratando audios existentes.");
            for (const ev of this.data.events) {
                if (ev.audio64) {
                    try {
                        // Convertir la DataURL guardada (Base64) de nuevo a Blob para el navegador
                        const res = await fetch(ev.audio64);
                        ev.audioBlob = await res.blob();
                        ev.audioUrl = URL.createObjectURL(ev.audioBlob);
                    } catch (err) {
                        console.error(`Error recuperando audio evento ${ev.id}`, err);
                    }
                }
            }

            // Inicializar Interfaz
            UI.renderScript(this.data.events);
            UI.updateStats();
            Player.init(this.data.events);

            // Notificación visual
            const btn = document.querySelector('button[onclick="UI.toggleFileSelector()"]');
            btn.innerHTML = `<i class="fa-solid fa-check mr-2"></i> ${this.selectedFolderHandle.name}`;
            btn.classList.add('border-green-500', 'text-green-400');
            
        } catch (e) {
            console.error(e);
            alert("Error: No se encontró 'TIMELINE_DATA.json' en esta carpeta. Asegúrate de seleccionar una carpeta de proyecto de Cronología.");
        }
    },

    // Guardar audio en memoria y disparar autoguardado en disco
    async saveEventAudio(eventId, audioBlob) {
        const ev = this.data.events.find(e => e.id === eventId);
        if(ev) {
            ev.audioBlob = audioBlob;
            ev.audioUrl = URL.createObjectURL(audioBlob);
            
            // NUEVO: Convertir Blob a Base64 para persistencia en JSON
            ev.audio64 = await this.blobToBase64(audioBlob);

            UI.markEventAudio(eventId, true);
            
            // Disparar autoguardado (espera 2 segundos de inactividad para escribir)
            this.triggerAutoSave();
        }
    },

    // Utilidad auxiliar: Convertir Blob a String Base64
    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    // Sistema de Autoguardado (Debounce 2000ms)
    // Evita escribir en disco 50 veces seguidas si generas todas las voces
    triggerAutoSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        
        // Indicador visual de "Guardando..."
        const statusEl = document.getElementById('auth-status');
        if(statusEl) {
             statusEl.innerText = "GUARDANDO...";
             statusEl.className = "text-xs font-mono px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
        }

        this.saveTimer = setTimeout(() => this.saveToDisk(), 2000);
    },

    // Escritura física en el disco
    async saveToDisk() {
        if (!this.selectedFolderHandle) return;

        try {
            // Creamos/Sobrescribimos el archivo TIMELINE_DATA.json en la carpeta seleccionada
            const fileHandle = await this.selectedFolderHandle.getFileHandle('TIMELINE_DATA.json', { create: true });
            const writable = await fileHandle.createWritable();
            
            // Guardamos todo el objeto data (que ahora incluye audio64)
            // Nota: audioBlob y audioUrl no se guardan en JSON.stringify, pero audio64 sí.
            await writable.write(JSON.stringify(this.data, null, 2));
            await writable.close();

            console.log("Proyecto guardado correctamente en disco.");
            
            // Restaurar estado visual del indicador
            const statusEl = document.getElementById('auth-status');
            if(statusEl) {
                const isOnline = AudioEngine && AudioEngine.apiKey;
                statusEl.innerText = isOnline ? "ONLINE (GUARDADO)" : "OFFLINE (GUARDADO)";
                statusEl.className = isOnline 
                    ? "text-xs font-mono px-3 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30"
                    : "text-xs font-mono px-3 py-1 rounded bg-slate-800 text-slate-500";
                
                // Limpiar mensaje de guardado tras unos segundos
                setTimeout(() => {
                     if(isOnline && statusEl.innerText.includes("GUARDADO")) statusEl.innerText = "ONLINE";
                }, 2000);
            }

        } catch (e) {
            console.error("Error FATAL en autoguardado:", e);
            alert("Error al guardar cambios en disco: " + e.message);
        }
    }
};

// --- UI HELPERS & BRIDGE ---
const UI = {
    toggleFileSelector() {
        const modal = document.getElementById('file-modal');
        modal.classList.toggle('hidden');
        if(!modal.classList.contains('hidden')) {
            this.refreshFolderList();
        }
    },

    toggleExportModal() {
        const modal = document.getElementById('export-modal');
        modal.classList.toggle('hidden');
    },

    // ESCÁNER DE CARPETAS (Igual que en Cronología)
    async refreshFolderList() {
        const list = document.getElementById('folder-list');
        list.innerHTML = '';
        
        // Conexión con ventana padre (Silenos)
        const FS = window.parent; 
        
        if (!FS || !FS.rootHandle) {
            list.innerHTML = '<div class="p-8 text-center text-xs text-red-400 font-light">Error: No se detecta el sistema de archivos padre (Silenos).</div>';
            return;
        }

        // Añadir raíz
        this.addFolderOption(list, FS.rootHandle, 'RAÍZ DEL PROYECTO', true);
        // Escanear
        await this.scanDirRecursive(FS.rootHandle, list, 'ROOT');
    },

    async scanDirRecursive(dirHandle, listElement, pathString, depth = 0) {
        if (depth > 2) return; // Limitar profundidad
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
        el.className = 'folder-option';
        const icon = isRoot ? 'fa-database text-black' : 'fa-folder text-yellow-500';
        
        el.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span class="truncate w-full">${displayName}</span>
        `;
        
        el.onclick = () => {
            // Deseleccionar anteriores
            Array.from(container.children).forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            Project.selectedFolderHandle = handle;
        };
        container.appendChild(el);
    },

    renderScript(events) {
        const c = document.getElementById('script-container');
        c.innerHTML = '';
        
        events.sort((a,b) => a.time - b.time).forEach((ev, idx) => {
            const div = document.createElement('div');
            div.id = `row-${ev.id}`;
            div.className = `script-row p-4 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-colors`;
            div.onclick = () => Player.loadScene(idx);
            
            const text = ev.moments ? ev.moments.map(m => m.text).join(" ") : ev.description;
            const shortText = text.length > 80 ? text.substring(0, 80) + '...' : text;
            const hasAudio = ev.audioUrl ? true : false;
            const hasImg = ev.image64 ? true : false;

            div.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[10px] font-mono text-pink-500 font-bold">#${idx + 1} | ${ev.time.toFixed(1)}s</span>
                    <div class="flex items-center gap-2 text-[10px]">
                        <span title="Imagen" class="${hasImg ? 'text-green-500' : 'text-slate-600'}"><i class="fa-regular fa-image"></i></span>
                        <span title="Estado Audio" class="status-icon ${hasAudio ? 'text-green-500' : 'text-slate-600'}"><i class="fa-solid fa-volume-high"></i></span>
                        <button class="btn-regen-audio ml-2 text-slate-500 hover:text-white transition-colors" onclick="event.stopPropagation(); AudioEngine.generateOne('${ev.id}')" title="Regenerar Audio">
                            <i class="fa-solid fa-rotate-right"></i>
                        </button>
                    </div>
                </div>
                <p class="text-xs text-slate-300 leading-relaxed">${shortText}</p>
            `;
            c.appendChild(div);
        });
    },
    
    markEventAudio(id, success) {
        const row = document.getElementById(`row-${id}`);
        if(row) {
            const icon = row.querySelector('.status-icon');
            icon.className = `status-icon ${success ? 'text-green-500' : 'text-red-500'}`;
            icon.innerHTML = success ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-triangle-exclamation"></i>';
        }
        this.updateStats();
    },

    updateStats() {
        const total = Project.data.events.length;
        const audioCount = Project.data.events.filter(e => e.audioUrl).length;
        document.getElementById('stats-events').innerText = `${total} Eventos`;
        document.getElementById('stats-audio').innerText = `${audioCount} Audios`;
    }
};

const App = {
    auth() {
        const key = prompt("Introduce tu API Key de Pollinations (sk-...):", AudioEngine.apiKey);
        if(key) {
            AudioEngine.apiKey = key;
            localStorage.setItem('pollinations_api_key', key);
            document.getElementById('auth-status').innerText = "ONLINE";
            document.getElementById('auth-status').className = "text-xs font-mono px-3 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30";
        }
    }
};

if(AudioEngine.apiKey) {
     document.getElementById('auth-status').innerText = "ONLINE";
     document.getElementById('auth-status').className = "text-xs font-mono px-3 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30";
}