/* NEXUS SILENOS/timeline.js */
/**
 * TIMELINE MANAGER ULTRA (K - CAMINO)
 * Gestión de múltiples líneas temporales con precisión matemática.
 * Soporta:
 * - Múltiples Timelines (Multiverso).
 * - Edición numérica (Start/End Values).
 * - División visual (Regla) basada en rango numérico.
 */

class TimelineManager {
    constructor(nodeData, saveCallback, notifyCallback) {
        this.nodeData = this._ensureDataStructure(nodeData);
        this.save = saveCallback;    
        this.notify = notifyCallback; 
        
        // Estado UI temporal
        this.currentTlId = this.nodeData.activeTimelineId;
        this.activeEventId = null;
        this.isDragging = false;
        this.dragTarget = null;

        // Bindings
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
    }

    /**
     * Asegura que los datos antiguos (v1) se conviertan a la estructura nueva (v2).
     */
    _ensureDataStructure(data) {
        // Si no tiene array de timelines, es un formato viejo o vacío
        if (!data.timelines) {
            console.log("TimelineManager: Migrando datos a estructura V2...");
            const defaultId = 'tl_' + Date.now();
            
            // Creamos una línea base con lo que hubiera
            const baseTimeline = {
                id: defaultId,
                name: 'Línea Principal',
                startLabel: data.startLabel || 'Origen',
                endLabel: data.endLabel || 'Destino',
                startVal: 0,
                endVal: 100,
                events: data.events || []
            };

            return {
                timelines: [baseTimeline],
                activeTimelineId: defaultId
            };
        }
        return data;
    }

    get activeTimeline() {
        return this.nodeData.timelines.find(t => t.id === this.currentTlId) || this.nodeData.timelines[0];
    }

    mount(container) {
        this.container = container;
        this.renderBaseLayout();
        this.updateUI();
    }

    // --- RENDERIZADO BASE ---

    renderBaseLayout() {
        this.container.innerHTML = `
            <div class="timeline-container">
                <div class="timeline-manager-header">
                    <div class="timeline-selector-group">
                        <select id="tlSelect" class="timeline-select"></select>
                        <input type="text" id="tlNameEdit" class="timeline-name-edit" style="display:none">
                    </div>
                    <button class="icon-btn" id="btnEditName" title="Renombrar Línea">✎</button>
                    <button class="icon-btn" id="btnAddTl" title="Nueva Línea Temporal">＋</button>
                    <button class="icon-btn danger" id="btnDelTl" title="Eliminar Línea">🗑</button>
                </div>

                <div class="timeline-wrapper-flex">
                    <div class="limit-group">
                        <input type="text" class="timeline-input-text" id="lblStart" placeholder="Etiqueta Inicio">
                        <input type="number" class="timeline-input-num" id="valStart" placeholder="0">
                    </div>

                    <div class="timeline-track-wrapper" id="trackWrapper">
                        <div class="timeline-track" id="timelineTrack">
                            <div class="timeline-ruler" id="timelineRuler"></div>
                        </div>
                    </div>

                    <div class="limit-group">
                        <input type="text" class="timeline-input-text" id="lblEnd" placeholder="Etiqueta Fin">
                        <input type="number" class="timeline-input-num" id="valEnd" placeholder="100">
                    </div>
                </div>

                <div style="text-align:center">
                     <button class="action-btn" id="btnAddEvent">⚡ CREAR EVENTO AQUÍ</button>
                </div>

                <div id="eventEditor" class="timeline-editor-panel">
                    <label style="color:#d63031; font-weight:bold; margin-bottom:10px; display:block;">EDICIÓN DE EVENTO</label>
                    
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="number" id="evtValInput" class="timeline-input-num" style="width:80px" placeholder="Valor">
                        <input type="text" id="evtTitle" class="timeline-input-text" style="text-align:left; font-size:1rem; border:none; background:#f9f9f9; padding:8px; border-radius:6px;" placeholder="Título del suceso...">
                    </div>
                    
                    <textarea id="evtDesc" style="width:100%; height:80px; border:none; border-radius:8px; padding:10px; box-shadow:inset 2px 2px 5px #ddd;" placeholder="Descripción..."></textarea>
                    
                    <div style="display:flex; gap:15px; justify-content:flex-end; margin-top:15px;">
                        <button class="action-btn danger-btn" id="btnDelEvent" style="font-size:0.75rem">ELIMINAR</button>
                        <button class="action-btn" id="btnSaveEvent" style="color:#27ae60; font-size:0.75rem">GUARDAR</button>
                    </div>
                </div>
            </div>
        `;

        this.bindGlobalEvents();
    }

    bindGlobalEvents() {
        const ui = {
            select: this.container.querySelector('#tlSelect'),
            nameEdit: this.container.querySelector('#tlNameEdit'),
            btnEditName: this.container.querySelector('#btnEditName'),
            btnAddTl: this.container.querySelector('#btnAddTl'),
            btnDelTl: this.container.querySelector('#btnDelTl'),
            
            lblStart: this.container.querySelector('#lblStart'),
            valStart: this.container.querySelector('#valStart'),
            lblEnd: this.container.querySelector('#lblEnd'),
            valEnd: this.container.querySelector('#valEnd'),
            
            track: this.container.querySelector('#timelineTrack'),
            btnAddEvent: this.container.querySelector('#btnAddEvent'),
            
            // Editor
            editor: this.container.querySelector('#eventEditor'),
            evtTitle: this.container.querySelector('#evtTitle'),
            evtDesc: this.container.querySelector('#evtDesc'),
            evtVal: this.container.querySelector('#evtValInput'),
            btnSaveEvt: this.container.querySelector('#btnSaveEvent'),
            btnDelEvt: this.container.querySelector('#btnDelEvent')
        };
        this.ui = ui;

        // HEADER LOGIC
        ui.select.addEventListener('change', (e) => this.switchTimeline(e.target.value));
        ui.btnAddTl.onclick = () => this.createTimeline();
        ui.btnDelTl.onclick = () => this.deleteTimeline();
        
        // Renombrar inline
        ui.btnEditName.onclick = () => {
            ui.select.style.display = 'none';
            ui.nameEdit.style.display = 'block';
            ui.nameEdit.value = this.activeTimeline.name;
            ui.nameEdit.focus();
        };
        const saveName = () => {
            this.activeTimeline.name = ui.nameEdit.value;
            ui.nameEdit.style.display = 'none';
            ui.select.style.display = 'block';
            this.saveData();
            this.updateHeaderUI();
        };
        ui.nameEdit.addEventListener('blur', saveName);
        ui.nameEdit.addEventListener('keydown', (e) => { if(e.key === 'Enter') saveName(); });

        // LIMITS LOGIC
        const updateLimits = () => {
            const tl = this.activeTimeline;
            tl.startLabel = ui.lblStart.value;
            tl.startVal = parseFloat(ui.valStart.value) || 0;
            tl.endLabel = ui.lblEnd.value;
            tl.endVal = parseFloat(ui.valEnd.value) || 100;
            this.saveData();
            this.refreshTrackVisuals(); // Re-render ticks y posiciones
        };
        
        [ui.lblStart, ui.valStart, ui.lblEnd, ui.valEnd].forEach(el => {
            el.addEventListener('change', updateLimits);
        });

        // TRACK LOGIC
        ui.track.addEventListener('mousedown', this.handleMouseDown);
        ui.btnAddEvent.onclick = () => this.addEvent();

        // EDITOR LOGIC
        ui.btnSaveEvt.onclick = () => this.updateActiveEvent();
        ui.btnDelEvt.onclick = () => this.deleteActiveEvent();
        
        // Listener especial para el input de valor en el editor (mueve el nodo)
        ui.evtVal.addEventListener('change', () => {
             if(this.activeEventId) {
                 const evt = this.activeTimeline.events.find(e => e.id === this.activeEventId);
                 if(evt) {
                     evt.val = parseFloat(ui.evtVal.value);
                     this.refreshTrackVisuals();
                     this.saveData();
                 }
             }
        });
    }

    // --- LOGICA DE DATOS Y ESTADO ---

    saveData() {
        this.nodeData.activeTimelineId = this.currentTlId;
        this.save();
    }

    updateUI() {
        this.updateHeaderUI();
        this.updateLimitsUI();
        this.refreshTrackVisuals();
        this.toggleEditor(false);
    }

    updateHeaderUI() {
        // Rellenar Select
        this.ui.select.innerHTML = '';
        this.nodeData.timelines.forEach(tl => {
            const opt = document.createElement('option');
            opt.value = tl.id;
            opt.innerText = tl.name;
            if (tl.id === this.currentTlId) opt.selected = true;
            this.ui.select.appendChild(opt);
        });
    }

    updateLimitsUI() {
        const tl = this.activeTimeline;
        this.ui.lblStart.value = tl.startLabel;
        this.ui.valStart.value = tl.startVal;
        this.ui.lblEnd.value = tl.endLabel;
        this.ui.valEnd.value = tl.endVal;
    }

    switchTimeline(id) {
        this.currentTlId = id;
        this.activeEventId = null;
        this.updateUI();
        this.notify(`Cargada: ${this.activeTimeline.name}`);
    }

    createTimeline() {
        const newId = 'tl_' + Date.now();
        this.nodeData.timelines.push({
            id: newId,
            name: 'Nueva Realidad',
            startLabel: 'Alpha', endLabel: 'Omega',
            startVal: 0, endVal: 100,
            events: []
        });
        this.switchTimeline(newId);
    }

    deleteTimeline() {
        if (this.nodeData.timelines.length <= 1) {
            this.notify("No puedes eliminar la última línea temporal.");
            return;
        }
        
        // No usaremos confirm() nativo si podemos evitarlo, pero para borrado destructivo es seguro.
        // Como pidió "sin ventanas emergentes", lo haremos directo si tiene 0 eventos, o avisaremos en log.
        // Haremos borrado directo por simplicidad UI.
        const idx = this.nodeData.timelines.findIndex(t => t.id === this.currentTlId);
        this.nodeData.timelines.splice(idx, 1);
        this.currentTlId = this.nodeData.timelines[0].id; // Volver al primero
        this.saveData();
        this.updateUI();
        this.notify("Línea temporal eliminada.");
    }

    // --- VISUALIZACIÓN DEL TRACK Y MATEMÁTICAS ---

    refreshTrackVisuals() {
        const tl = this.activeTimeline;
        const track = this.ui.track;
        
        // 1. Limpiar nodos (excepto la regla)
        // Guardamos la regla para no regenerarla si no hace falta, o la regeneramos siempre
        track.innerHTML = '<div class="timeline-ruler" id="timelineRuler"></div>';
        
        // 2. Generar Regla (División visual)
        this.renderRuler(tl.startVal, tl.endVal);

        // 3. Renderizar Eventos
        tl.events.forEach(evt => {
            const posPercent = this.mapValueToPercent(evt.val, tl.startVal, tl.endVal);
            
            // Si el evento está fuera de rango visual, ¿lo mostramos? 
            // Sí, pero pegado a los bordes con indicación, o simplemente hidden si overflow.
            // CSS hará el resto, pero clamp 0-100 es seguro.
            const displayPos = Math.max(0, Math.min(100, posPercent));

            const el = document.createElement('div');
            el.className = 'timeline-event';
            if (evt.id === this.activeEventId) el.classList.add('active');
            el.style.left = `${displayPos}%`;
            el.dataset.id = evt.id;

            el.innerHTML = `
                <div class="event-label">
                    <span class="val">${Math.round(evt.val * 100) / 100}</span>
                    ${evt.title || 'Evento'}
                </div>
            `;
            
            track.appendChild(el);
        });
    }

    renderRuler(start, end) {
        const ruler = this.container.querySelector('#timelineRuler');
        ruler.innerHTML = '';
        
        const range = Math.abs(end - start);
        if (range === 0) return;

        // Calcular cuántos ticks caben visualmente. Supongamos max 1 tick cada 20px.
        // No tenemos el ancho real en px fácil aquí sin DOM read, asumimos ~600px.
        // Max ticks ~ 30.
        
        let steps = 10;
        if (range <= 10) steps = range; 
        else if (range > 1000) steps = 10;
        else steps = 20;

        for (let i = 0; i <= steps; i++) {
            const tick = document.createElement('div');
            tick.className = (i === 0 || i === steps || i === steps/2) ? 'tick major' : 'tick';
            ruler.appendChild(tick);
        }
    }

    // --- MATEMÁTICAS ---

    mapValueToPercent(val, start, end) {
        if (start === end) return 50;
        return ((val - start) / (end - start)) * 100;
    }

    mapPercentToValue(percent, start, end) {
        return start + (percent / 100) * (end - start);
    }

    // --- INTERACCIÓN DRAG & DROP & EVENTOS ---

    addEvent() {
        const tl = this.activeTimeline;
        // Crear en el centro del rango actual
        const centerVal = tl.startVal + (tl.endVal - tl.startVal) / 2;
        
        const newEvt = {
            id: 'evt_' + Date.now(),
            val: centerVal,
            title: 'Nuevo Evento',
            desc: ''
        };
        tl.events.push(newEvt);
        this.saveData();
        this.setActiveEvent(newEvt.id);
        this.notify('Evento añadido.');
    }

    setActiveEvent(id) {
        this.activeEventId = id;
        this.refreshTrackVisuals();
        
        const evt = this.activeTimeline.events.find(e => e.id === id);
        if (evt) {
            this.ui.evtTitle.value = evt.title;
            this.ui.evtDesc.value = evt.desc || '';
            this.ui.evtVal.value = evt.val;
            this.toggleEditor(true);
        }
    }

    toggleEditor(show) {
        if(show) this.ui.editor.classList.add('active');
        else this.ui.editor.classList.remove('active');
    }

    updateActiveEvent() {
        if(!this.activeEventId) return;
        const evt = this.activeTimeline.events.find(e => e.id === this.activeEventId);
        if(evt) {
            evt.title = this.ui.evtTitle.value;
            evt.desc = this.ui.evtDesc.value;
            evt.val = parseFloat(this.ui.evtVal.value); // También actualizar desde editor
            this.saveData();
            this.refreshTrackVisuals();
            this.notify("Evento guardado.");
        }
    }

    deleteActiveEvent() {
        if(!this.activeEventId) return;
        const tl = this.activeTimeline;
        tl.events = tl.events.filter(e => e.id !== this.activeEventId);
        this.activeEventId = null;
        this.toggleEditor(false);
        this.saveData();
        this.refreshTrackVisuals();
    }

    // DRAGGING
    handleMouseDown(e) {
        const target = e.target.closest('.timeline-event');
        if (!target) return;

        e.preventDefault();
        this.isDragging = true;
        this.dragTarget = target;
        this.dragTarget.classList.add('dragging');

        const evtId = target.dataset.id;
        if (this.activeEventId !== evtId) {
            this.setActiveEvent(evtId);
        }

        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    handleMouseMove(e) {
        if (!this.isDragging || !this.dragTarget) return;
        e.preventDefault();

        const rect = this.ui.track.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let percent = (x / rect.width) * 100;
        
        // Clamping para que no salga del track visualmente
        percent = Math.max(0, Math.min(100, percent));

        // Calcular valor matemático real
        const tl = this.activeTimeline;
        const newVal = this.mapPercentToValue(percent, tl.startVal, tl.endVal);

        // Actualizar UI del nodo draggeado en vivo
        this.dragTarget.style.left = `${percent}%`;
        
        // Actualizar etiqueta flotante
        const labelVal = this.dragTarget.querySelector('.val');
        if(labelVal) labelVal.innerText = newVal.toFixed(1);

        // Actualizar datos en memoria (sin guardar en disco aún para performance)
        const evt = tl.events.find(ev => ev.id === this.activeEventId);
        if (evt) evt.val = newVal;
        
        // Actualizar input del editor en vivo
        this.ui.evtVal.value = newVal.toFixed(2);
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        if (this.dragTarget) this.dragTarget.classList.remove('dragging');
        this.dragTarget = null;
        
        this.saveData(); // Guardar al soltar
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    }
}