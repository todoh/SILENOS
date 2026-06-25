// --- Cronologia 3/main.js ---    
// REFACTORIZADO: Integración como Namespace no colisionante (mainCrono) en DatosStudio con inmunidad a InvalidStateError de caché en disco
const mainCrono = {
    data: { events: [] },
    visualBibleData: [],
    fileHandle: null,
    visualBibleHandle: null,
    rootHandle: null,
    availableTimelines: [], 
    currentTimelineName: localStorage.getItem('koreh_active_timeline_file') || 'TIMELINE_DATA.json',
        
    init() {
        console.log("Módulo Cronología Vinculado de forma armónica.");
    },
        
    async confirmFolderSelection() {
        if (!window.ui.selectedFolderHandle) return;
        this.rootHandle = window.ui.selectedFolderHandle;
                
        await this.scanAvailableTimelines();
        await this.loadActiveTimeline();
                
        try {
            this.visualBibleHandle = await this.rootHandle.getFileHandle('VISUAL_BIBLE.json', { create: true });
            const vFile = await this.visualBibleHandle.getFile();
            const vText = await vFile.text();
            this.visualBibleData = vText.trim() ? JSON.parse(vText) : [];
        } catch (err) {
            this.visualBibleData = [];
        }
                
        if (window.cronoAI) window.cronoAI.setContext(this.rootHandle);
    },
    async scanAvailableTimelines() {
        if (!this.rootHandle) return;
        this.availableTimelines = [];
        try {
            for await (const entry of this.rootHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    if (entry.name.includes('TIMELINE') || entry.name.startsWith('timeline_')) {
                        this.availableTimelines.push(entry.name);
                    }
                }
            }
            if (this.availableTimelines.length === 0) {
                this.availableTimelines.push('TIMELINE_DATA.json');
            }
            if (!this.availableTimelines.includes(this.currentTimelineName)) {
                this.currentTimelineName = this.availableTimelines[0];
                localStorage.setItem('koreh_active_timeline_file', this.currentTimelineName);
            }
            this.renderTimelineSelector();
        } catch (e) {
            console.error("Error escaneando cronologías:", e);
        }
    },
    async loadActiveTimeline() {
        if (!this.rootHandle) return;
        try {
            this.fileHandle = await this.rootHandle.getFileHandle(this.currentTimelineName, { create: true });
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            try {
                const parsed = JSON.parse(text);
                this.data = parsed && parsed.events ? parsed : { events: [] };
            } catch (e) {
                console.warn("Archivo JSON vacío o corrupto, preservando estado en memoria o forzando estructura base.");
                this.data = this.data && this.data.events && this.data.events.length > 0 ? this.data : { events: [] };
            }
            await this.loadEvents(this.data.events);
            if (window.Utils && typeof window.Utils.log === 'function') {
                window.Utils.log(`Línea de tiempo cargada: ${this.currentTimelineName}`, "success");
            }
        } catch (err) {
            console.error("Error cargando la cronología activa:", err);
            this.data = { events: [] };
            await this.loadEvents([]);
        }
    },
    renderTimelineSelector() {
        let container = document.getElementById('crono-timeline-select-container');
        if (!container) {
            const toolbar = document.getElementById('crono-toolbar');
            if (!toolbar) return;
                        
            container = document.createElement('div');
            container.id = 'crono-timeline-select-container';
            container.className = 'flex items-center gap-2 border-l border-gray-100 pl-4 h-8 mr-2';
            toolbar.insertBefore(container, toolbar.firstChild);
        }
        container.innerHTML = `
            <span class="label-text mb-0 text-[9px] font-bold">Línea de Tiempo:</span>
            <select id="crono-active-file-select" class="text-[11px] font-bold bg-gray-50 border border-gray-200 p-1 rounded-sm cursor-pointer hover:border-black outline-none transition-colors" onchange="mainCrono.switchTimelineFile(this.value)">
                ${this.availableTimelines.map(t => `<option value="${t}" ${t === this.currentTimelineName ? 'selected' : ''}>${t.replace('.json', '').replace('timeline_', '').toUpperCase()}</option>`).join('')}
            </select>
            <button onclick="mainCrono.promptCreateTimeline()" class="p-1 text-gray-400 hover:text-green-600 transition-colors text-xs" title="Nueva Línea de Tiempo"><i class="fa-solid fa-folder-plus"></i></button>
            <button onclick="mainCrono.deleteCurrentTimelineFile()" class="p-1 text-gray-400 hover:text-red-500 transition-colors text-xs" title="Eliminar Línea de Tiempo Activa"><i class="fa-regular fa-trash-can"></i></button>
        `;
    },
    async switchTimelineFile(filename) {
        if (this.currentTimelineName === filename) return;
        this.currentTimelineName = filename;
        localStorage.setItem('koreh_active_timeline_file', filename);
        window.ui.selectedEventId = null;
        if (window.uiCrono) window.uiCrono.selectedEventId = null;
                
        document.getElementById('inspector-crono-content').classList.add('hidden');
        document.getElementById('inspector-crono-empty').classList.remove('hidden');
        await this.loadActiveTimeline();
    },
    promptCreateTimeline() {
        window.ui.confirm("Deseas crear una nueva línea de tiempo autónoma en este proyecto?", () => {
            setTimeout(() => {
                const name = prompt("Introduce el nombre para la nueva Línea de Tiempo:");
                if (!name) return;
                const cleanName = name.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `timeline_${cleanName}.json`;
                mainCrono.createTimelineFile(filename);
            }, 300);
        });
    },
    async createTimelineFile(filename) {
        if (!this.rootHandle) return;
        try {
            const newHandle = await this.rootHandle.getFileHandle(filename, { create: true });
            const emptyData = { events: [] };
            const writable = await newHandle.createWritable();
            await writable.write(JSON.stringify(emptyData, null, 2));
            await writable.close();
                        
            await this.scanAvailableTimelines();
            await this.switchTimelineFile(filename);
        } catch (e) {
            alert("Error creando el archivo de cronología: " + e.message);
        }
    },
    async deleteCurrentTimelineFile() {
        if (this.currentTimelineName === 'TIMELINE_DATA.json') {
            return window.ui.alert("No se puede eliminar la línea de tiempo maestra por defecto (TIMELINE_DATA.json).");
        }
        window.ui.confirm(`¿Estás completamente seguro de eliminar la cronología '${this.currentTimelineName}'? Esta acción es irreversible.`, async () => {
            try {
                await this.rootHandle.removeEntry(this.currentTimelineName);
                this.currentTimelineName = 'TIMELINE_DATA.json';
                localStorage.setItem('koreh_active_timeline_file', 'TIMELINE_DATA.json');
                window.ui.selectedEventId = null;
                if (window.uiCrono) window.uiCrono.selectedEventId = null;
                                
                document.getElementById('inspector-crono-content').classList.add('hidden');
                document.getElementById('inspector-crono-empty').classList.remove('hidden');
                await this.scanAvailableTimelines();
                await this.loadActiveTimeline();
            } catch (e) {
                alert("Error al eliminar la línea de tiempo: " + e.message);
            }
        });
    },
    async saveData() {
        const activeRoot = this.rootHandle || window.ui.selectedFolderHandle || (window.app && window.app.targetHandle);
        if (!activeRoot) return;
        try {
            // REFACTORIZACIÓN CRÍTICA: Adquirir un file handle fresco en caliente para mitigar de raíz el InvalidStateError por colisiones de concurrencia masiva
            const freshHandle = await activeRoot.getFileHandle(this.currentTimelineName, { create: true });
            const writable = await freshHandle.createWritable();
            const cleanSaveData = {
                events: this.data.events.map(ev => ({
                    ...ev,
                    moments: ev.moments.map(m => {
                        const { displayUrl, ...cleanMoment } = m;
                        return cleanMoment;
                    })
                }))
            };
            await writable.write(JSON.stringify(cleanSaveData, null, 2));
            await writable.close();
            this.fileHandle = freshHandle; // Actualizar referencia segura
        } catch (e) {
            console.error("Error guardando timeline:", e);
        }
    },
    async rewritePrompt(eventId, momentId) {
        if (window.CronoAIPrompt && typeof window.CronoAIPrompt.rewrite === 'function') {
            await window.CronoAIPrompt.rewrite(eventId, momentId);
        } else {
            console.error("Módulo CronoAIPrompt no detectado en el entorno global.");
        }
    },
    loadPlanteamiento() {
        if(!this.rootHandle) return alert("Abre una carpeta primero.");
        alert("Buscando archivos PLANT_SAGA o PLANT_LIT en la raíz...");
    },
    async loadEvents(events) {
        const activeRoot = this.rootHandle || window.ui.selectedFolderHandle || (window.app && window.app.targetHandle);
        for (const ev of events) {
            if (!ev.moments || ev.moments.length === 0) {
                ev.moments = [{ 
                    id: Date.now() + Math.floor(Math.random() * 1000), 
                    text: ev.description || "Nueva subparte",
                    image64: null,
                    visualPrompt: "",
                    aspectRatio: 'landscape'
                }];
            }
            
            for (const m of ev.moments) {
                if (m.imageFile && !m.displayUrl && activeRoot) {
                    try {
                        const imgHandle = await activeRoot.getFileHandle(m.imageFile);
                        const imgFile = await imgHandle.getFile();
                        m.displayUrl = URL.createObjectURL(imgFile);
                    } catch (e) {
                        console.warn("No se pudo pre-cargar la imagen del timeline:", m.imageFile, e);
                    }
                }
            }
        }
        this.data.events = events;
        window.timeline.setData(events);
        if(events.length > 0) this.selectEvent(events[0].id);
    },
    selectEvent(id) {
        window.ui.selectedEventId = id;
        if (window.uiCrono) window.uiCrono.selectedEventId = id;
        window.timeline.renderEvents();
        const ev = this.data.events.find(e => e.id === id);
        if (ev) this.showInspector(ev);
    },
    showInspector(ev) {
        if (window.uiCrono && typeof window.uiCrono.showInspector === 'function') {
            window.uiCrono.showInspector(ev);
        }
    },
    updateSelected(field, value) {
        const ev = this.data.events.find(e => e.id === window.ui.selectedEventId);
        if (!ev) return;
        ev[field] = value;
        window.timeline.renderEvents();
        this.saveData();
    },
    addMoment() {
        const ev = this.data.events.find(e => e.id === window.ui.selectedEventId);
        if(!ev) return;
        if(!ev.moments) ev.moments = [];
        ev.moments.push({ 
            id: Date.now() + Math.floor(Math.random() * 1000), 
            text: "Nueva acción...",
            image64: null,
            visualPrompt: "",
            aspectRatio: 'landscape'
        });
        this.showInspector(ev);
        this.saveData();
    },
    deleteMoment(idx) {
        const ev = this.data.events.find(e => e.id === window.ui.selectedEventId);
        if(!ev) return;
        ev.moments.splice(idx, 1);
        this.showInspector(ev);
        this.saveData();
    },
    createEventAt(time) {
        const newEv = {
            id: 'evt-' + Date.now(),
            time: time,
            description: 'Nueva Escena',
            moments: [{
                id: Date.now(),
                text: "Detalle inicial...",
                image64: null,
                visualPrompt: "",
                aspectRatio: 'landscape'
            }]
        };
        this.data.events.push(newEv);
        this.saveData();
        window.timeline.setData(this.data.events);
        this.selectEvent(newEv.id);
    },
    createNewEvent() {
        const centerTime = (window.timeline.container.clientWidth / 2 - window.timeline.panX) / window.timeline.zoom;
        this.createEventAt(parseFloat(centerTime.toFixed(1)));
    },
    deleteEvent() {
        if(!window.ui.selectedEventId) return;
        this.data.events = this.data.events.filter(e => e.id !== window.ui.selectedEventId);
        this.saveData();
        window.ui.selectedEventId = null;
        if (window.uiCrono) window.uiCrono.selectedEventId = null;
        window.timeline.setData(this.data.events);
        document.getElementById('inspector-crono-content').classList.add('hidden');
        document.getElementById('inspector-crono-empty').classList.remove('hidden');
    },
    startEventDrag(e, id) {
        const ev = this.data.events.find(x => x.id === id);
        const startX = e.clientX;
        const initialTime = ev.time;
        const onMove = (mv) => {
            const dx = mv.clientX - startX;
            const dt = dx / window.timeline.zoom;
            ev.time = parseFloat((initialTime + dt).toFixed(1));
            window.timeline.renderEvents();
            if (window.ui.selectedEventId === ev.id) {
                document.getElementById('crono-inp-time').value = ev.time;
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            this.saveData();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    },
    changeAspect(eventId, momentId, val) {
        const ev = this.data.events.find(e => e.id === eventId);
        const m = ev.moments.find(x => x.id === momentId);
        if(m) { 
             m.aspectRatio = val; 
             this.saveData(); 
             window.timeline.renderEvents(); 
             this.showInspector(ev);
        }
    }
};
window.mainCrono = mainCrono;
window.addEventListener('load', () => mainCrono.init());