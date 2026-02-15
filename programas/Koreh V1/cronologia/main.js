// --- main.js: CONTROLADOR PRINCIPAL ---

const main = {
    data: { events: [] },
    fileHandle: null,
    rootHandle: null, // Guardamos la referencia a la raíz

    init() {
        console.log("Inicializando Cronología v5...");
        ui.init();
        
        // CORRECCIÓN: Conexión con el sistema de archivos padre correcta
        // En Cronologia.html, 'FS' es window.parent directamente.
        if (window.parent && window.parent.rootHandle) {
            this.rootHandle = window.parent.rootHandle;
        }
    },

    // --- CARGA DE DATOS ---
    async confirmFolderSelection() {
        if (!ui.selectedFolderHandle) return alert("Selecciona una carpeta.");
        
        // Guardamos la referencia para que la IA pueda escanear después
        this.rootHandle = ui.selectedFolderHandle; 
        
        ui.toggleFileSelector();
        
        try {
            // Intenta obtener TIMELINE_DATA.json
            this.fileHandle = await ui.selectedFolderHandle.getFileHandle('TIMELINE_DATA.json', { create: true });
            const file = await this.fileHandle.getFile();
            const text = await file.text();
            
            try {
                const json = JSON.parse(text);
                this.data = { ...json }; 
                if (!this.data.events) this.data.events = [];
            } catch (e) {
                this.data = { events: [] }; 
            }
            
            this.loadEvents(this.data.events);
            // Notificar a la IA dónde estamos
            ai.setContext(ui.selectedFolderHandle);

        } catch (err) {
            console.error("Error cargando timeline:", err);
            alert("Error cargando TIMELINE_DATA.json. Verifica permisos.");
        }
    },

    async saveData() {
        if (!this.fileHandle) return;
        try {
            const writable = await this.fileHandle.createWritable();
            await writable.write(JSON.stringify(this.data, null, 2));
            await writable.close();
        } catch (e) {
            console.error("Error guardando:", e);
        }
    },

    // --- MANEJO DE EVENTOS ---
    loadEvents(events) {
        this.data.events = events;
        timeline.setData(events);
        if(events.length > 0) this.selectEvent(events[0].id);
    },

    selectEvent(id) {
        ui.selectedEventId = id;
        timeline.renderEvents(); 
        
        const ev = this.data.events.find(e => e.id === id);
        if (!ev) return;

        ui.showInspector(ev);
    },

    updateSelected(field, value) {
        const ev = this.data.events.find(e => e.id === ui.selectedEventId);
        if (!ev) return;
        ev[field] = value;
        timeline.renderEvents();
        this.saveData();
    },

    addMoment() {
        const ev = this.data.events.find(e => e.id === ui.selectedEventId);
        if(!ev) return;
        if(!ev.moments) ev.moments = [];
        ev.moments.push({ id: Date.now(), text: "Nuevo detalle..." });
        ui.renderMoments(ev);
        this.saveData();
    },

    deleteMoment(idx) {
        const ev = this.data.events.find(e => e.id === ui.selectedEventId);
        if(!ev) return;
        ev.moments.splice(idx, 1);
        ui.renderMoments(ev);
        this.saveData();
    },

    createEventAt(time) {
        const newEv = {
            id: 'evt-' + Date.now(),
            time: time,
            description: 'Nuevo Evento',
            moments: [],
            image64: null
        };
        this.data.events.push(newEv);
        this.saveData();
        timeline.setData(this.data.events);
        this.selectEvent(newEv.id);
    },

    createNewEvent() {
        // Crear en el centro de la vista actual
        const centerTime = (timeline.container.clientWidth / 2 - timeline.panX) / timeline.zoom;
        this.createEventAt(parseFloat(centerTime.toFixed(1)));
    },

    deleteEvent() {
        if(!ui.selectedEventId) return;
        if(!confirm("¿Eliminar evento seleccionado?")) return;
        this.data.events = this.data.events.filter(e => e.id !== ui.selectedEventId);
        this.saveData();
        ui.selectedEventId = null;
        timeline.setData(this.data.events);
        ui.hideInspector();
    },

    // --- ARRASTRAR EVENTOS ---
    startEventDrag(e, id) {
        const ev = this.data.events.find(x => x.id === id);
        const startX = e.clientX;
        const initialTime = ev.time;
        
        document.body.style.cursor = 'grabbing';
        
        const onMove = (mv) => {
            const dx = mv.clientX - startX;
            const dt = dx / timeline.zoom;
            ev.time = parseFloat((initialTime + dt).toFixed(1));
            timeline.renderEvents();
            
            // Actualizar inspector en tiempo real
            if (ui.selectedEventId === ev.id) {
                document.getElementById('inp-time').value = ev.time;
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.body.style.cursor = 'default';
            this.saveData();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
};

window.onload = () => main.init();