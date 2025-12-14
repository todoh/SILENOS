/* NEXUS SILENOS/chronos.js */
/**
 * CHRONOS K-M ENGINE - LINKED EDITION
 * Sistema Temporal con soporte para Base de Datos de Lugares.
 */

import { ChronosGenerator } from './chronos_gen.js';

class ChronosApp {
    constructor() {
        this.canvas = document.getElementById('chronosCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // --- ESTADO DEL MUNDO (Carriles Visuales) ---
        this.projectMeta = { timeStart: 0, timeEnd: 100 };
        this.places = this.loadData(); // 'places' aquí son los Carriles (Lanes)
        
        // --- GENERADOR IA ---
        this.generator = new ChronosGenerator({
            places: this.places,
            characters: [],
            maps: [] // Placeholder para mapas
        });
        
        // --- CÁMARA & VISTA ---
        this.view = {
            offsetX: 100,
            offsetY: 100,
            zoom: 1,
            rowHeight: 120
        };

        // --- INTERACCIÓN ---
        this.dragging = {
            active: false, type: null, targetPlace: null, targetEvent: null, lastX: 0, lastY: 0
        };

        this.editing = { placeId: null, eventId: null, targetPlace: null };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
        window.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));

        this.bindUI();
        this.fitViewToRange();

        requestAnimationFrame(() => this.loop());
    }

    // --- DATOS ---

    loadData() {
        const raw = localStorage.getItem('nexus_saga_data');
        if (raw) {
            try {
                const data = JSON.parse(raw);
                if (data.meta && data.meta.timeline) {
                    this.projectMeta = data.meta.timeline;
                }
                // 'places' en el JSON son los carriles.
                if (data.places && Array.isArray(data.places) && data.places.length > 0) {
                    return data.places;
                }
            } catch (e) { console.error("Error Chronos load", e); }
        }
        // Default
        return [
            { id: 'p1', name: 'Mundo Físico', color: '#2ecc71', y: 0, events: [
                { id: 'e1', k: 0, title: 'El Origen', desc: 'Inicio.', characters: [], stages: [] }
            ]}
        ];
    }

    saveData() {
        // Leemos todo para no sobrescribir char/maps/db
        const raw = localStorage.getItem('nexus_saga_data');
        let data = {};
        if (raw) { try { data = JSON.parse(raw); } catch (e) { data = {}; } }

        data.places = this.places; // Guardamos los carriles
        
        data.meta = data.meta || {};
        data.meta.lastModified = Date.now();
        data.meta.timeline = this.projectMeta;

        localStorage.setItem('nexus_saga_data', JSON.stringify(data));
    }

    saveCharacters(newChars) {
        if (!newChars || newChars.length === 0) return;
        const raw = localStorage.getItem('nexus_saga_data');
        let data = { characters: [] };
        if (raw) { try { data = JSON.parse(raw); } catch(e) {} }
        if (!data.characters) data.characters = [];
        data.characters = [...data.characters, ...newChars];
        localStorage.setItem('nexus_saga_data', JSON.stringify(data));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    fitViewToRange() {
        const start = parseFloat(this.projectMeta.timeStart) || 0;
        const end = parseFloat(this.projectMeta.timeEnd) || 100;
        let range = end - start;
        if (range === 0) range = 100; 
        const padding = 50; 
        const availableWidth = this.canvas.width - (padding * 2);
        this.view.zoom = availableWidth / range;
        this.view.offsetX = padding - (start * this.view.zoom);
        this.view.offsetY = 150; 
    }

    updateRangeFromInputs() {
        const startInp = document.getElementById('inpTimeStart');
        const endInp = document.getElementById('inpTimeEnd');
        this.projectMeta.timeStart = parseFloat(startInp.value);
        this.projectMeta.timeEnd = parseFloat(endInp.value);
        this.saveData();
        this.fitViewToRange();
        this.toast(`Rango ajustado: ${this.projectMeta.timeStart} a ${this.projectMeta.timeEnd}`);
    }

    // --- RENDER ---

    loop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.places.forEach((place, index) => {
            const y = this.view.offsetY + (index * this.view.rowHeight);
            this.drawLane(place, y);
        });
        requestAnimationFrame(() => this.loop());
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0,0,0,0.05)';
        this.ctx.lineWidth = 1;
        let step = 10;
        if (this.view.zoom > 10) step = 1;
        else if (this.view.zoom > 2) step = 5;
        else if (this.view.zoom < 0.1) step = 100;

        const startK = Math.floor(this.screenToK(0));
        const endK = Math.ceil(this.screenToK(this.canvas.width));
        const firstLineK = Math.floor(startK / step) * step;

        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'center';

        for (let k = firstLineK; k <= endK; k += step) {
            const x = this.view.offsetX + (k * this.view.zoom);
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
            this.ctx.fillText(k, x, 15);
        }
    }

    drawLane(place, y) {
        // Fondo
        this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
        this.ctx.fillRect(0, y, this.canvas.width, this.view.rowHeight - 10);

        // Línea central
        const midY = y + (this.view.rowHeight / 2);
        this.ctx.beginPath();
        this.ctx.moveTo(0, midY);
        this.ctx.lineTo(this.canvas.width, midY);
        this.ctx.strokeStyle = place.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Nombre Lugar
        this.ctx.fillStyle = place.color;
        this.ctx.font = 'bold 14px Helvetica';
        this.ctx.textAlign = 'left';
        
        // Icono de enlace si está vinculado
        let nameDisplay = place.name.toUpperCase();
        if(place.linkedDbId) nameDisplay = "🔗 " + nameDisplay;

        this.ctx.fillText(nameDisplay, 20, y + 30);

        // Botón Config
        this.ctx.beginPath();
        this.ctx.arc(30, y + 50, 8, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px Arial';
        this.ctx.fillText('⚙', 24.5, y + 53.5);

        // Eventos
        place.events.forEach(evt => {
            const x = this.view.offsetX + (evt.k * this.view.zoom);
            if(x < -50 || x > this.canvas.width + 50) return;

            this.ctx.beginPath();
            this.ctx.arc(x, midY, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.fill();
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = place.color;
            this.ctx.stroke();

            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(evt.title, x, midY - 15);
            
            this.ctx.fillStyle = '#999';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(Math.round(evt.k), x, midY + 22);

            // Indicador de ubicación geográfica (Si tiene)
            if(evt.mapLocation) {
                this.ctx.fillText("📍", x, midY + 45);
            }

            if((evt.characters && evt.characters.length > 0) || (evt.stages && evt.stages.length > 0)) {
                this.ctx.fillStyle = place.color;
                this.ctx.beginPath();
                this.ctx.arc(x, midY + 32, 2, 0, Math.PI*2);
                this.ctx.fill();
            }

            if(this.dragging.targetEvent === evt) {
                this.ctx.beginPath();
                this.ctx.arc(x, midY, 12, 0, Math.PI*2);
                this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                this.ctx.stroke();
            }
        });
        this.ctx.textAlign = 'left';
    }

    screenToK(screenX) {
        return (screenX - this.view.offsetX) / this.view.zoom;
    }

    // --- INTERACCIÓN ---

    onMouseDown(e) {
        const mx = e.clientX;
        const my = e.clientY;

        for (let pIndex = 0; pIndex < this.places.length; pIndex++) {
            const p = this.places[pIndex];
            const laneY = this.view.offsetY + (pIndex * this.view.rowHeight);
            const midY = laneY + (this.view.rowHeight / 2);

            // Click en Config
            if (Math.hypot(mx - 30, my - (laneY + 50)) < 15) {
                this.openPlaceEditor(p);
                return;
            }

            // Click en Evento
            for (let evt of p.events) {
                const ex = this.view.offsetX + (evt.k * this.view.zoom);
                if (Math.hypot(mx - ex, my - midY) < 15) {
                    this.dragging.active = true;
                    this.dragging.type = 'EVENT';
                    this.dragging.targetEvent = evt;
                    this.dragging.targetPlace = p;
                    this.dragging.lastX = mx;
                    return;
                }
            }
        }

        this.dragging.active = true;
        this.dragging.type = 'PAN';
        this.dragging.lastX = mx;
        this.dragging.lastY = my;
        this.canvas.style.cursor = 'grabbing';
    }

    onMouseMove(e) {
        if (!this.dragging.active) return;
        const mx = e.clientX;
        const my = e.clientY;
        const dx = mx - this.dragging.lastX;
        const dy = my - this.dragging.lastY;

        if (this.dragging.type === 'PAN') {
            this.view.offsetX += dx;
            this.view.offsetY += dy;
        } else if (this.dragging.type === 'EVENT') {
            const dk = dx / this.view.zoom;
            this.dragging.targetEvent.k += dk;
            const evtTimeInp = document.getElementById('evtTime');
            if(evtTimeInp && !document.getElementById('eventModal').classList.contains('hidden')) {
                evtTimeInp.value = Math.round(this.dragging.targetEvent.k);
            }
        }

        this.dragging.lastX = mx;
        this.dragging.lastY = my;
    }

    onMouseUp(e) {
        if (!this.dragging.active) return;
        if (this.dragging.type === 'EVENT') {
            this.saveData();
            this.openEventEditor(this.dragging.targetEvent, this.dragging.targetPlace);
        }
        this.dragging.active = false;
        this.dragging.targetEvent = null;
        this.dragging.type = null;
        this.canvas.style.cursor = 'grab';
    }

    onWheel(e) {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const mx = e.clientX;
        const kMouse = this.screenToK(mx); 
        const newZoom = this.view.zoom - (e.deltaY * zoomSpeed);
        this.view.zoom = Math.max(0.1, Math.min(50, newZoom));
        this.view.offsetX = mx - (kMouse * this.view.zoom);
    }

    onDoubleClick(e) {
        const mx = e.clientX;
        const my = e.clientY;
        const laneIndex = Math.floor((my - this.view.offsetY) / this.view.rowHeight);
        if (laneIndex >= 0 && laneIndex < this.places.length) {
            const place = this.places[laneIndex];
            const kVal = this.screenToK(mx);
            const newEvt = {
                id: 'evt_' + Date.now(),
                k: kVal,
                title: 'Nuevo Suceso',
                desc: '',
                characters: [],
                stages: []
            };
            place.events.push(newEvt);
            this.saveData();
            this.toast(`Evento creado en: ${place.name} (T: ${Math.round(kVal)})`);
        }
    }

    // --- UI BINDINGS ---

    bindUI() {
        const inpStart = document.getElementById('inpTimeStart');
        const inpEnd = document.getElementById('inpTimeEnd');
        inpStart.value = this.projectMeta.timeStart;
        inpEnd.value = this.projectMeta.timeEnd;
        inpStart.addEventListener('change', () => this.updateRangeFromInputs());
        inpEnd.addEventListener('change', () => this.updateRangeFromInputs());
        
        document.getElementById('btnResetZoom').onclick = () => this.fitViewToRange();

        // Botón AÑADIR CARRIL (PLACE)
        document.getElementById('btnAddPlace').onclick = () => {
            const newLane = {
                id: 'p_' + Date.now(),
                name: 'Nuevo Carril',
                color: '#3498db',
                events: [],
                linkedDbId: null // Referencia a DB
            };
            this.places.push(newLane);
            this.saveData();
            this.toast("Nuevo carril añadido. Pulsa ⚙ para vincular.");
            
            // Opcional: Abrir editor inmediatamente
            this.openPlaceEditor(newLane);
        };
        
        document.getElementById('btnNewProject').onclick = () => this.newProject();

        // --- MANEJO DEL GENERADOR IA ---
        const btnGen = document.getElementById('btnGenTimeline');
        const genModal = document.getElementById('genTimelineModal');
        if (btnGen) {
            btnGen.onclick = () => genModal.classList.remove('hidden');
            document.getElementById('closeGenModal').onclick = () => genModal.classList.add('hidden');
            
            document.getElementById('btnRunGen').onclick = async () => {
                const prompt = document.getElementById('genPromptInput').value;
                const useContext = document.getElementById('genUseContext').checked;
                if (!prompt.trim()) return;

                const timeRange = {
                    min: this.projectMeta.timeStart || 0,
                    max: this.projectMeta.timeEnd || 100
                };

                const btn = document.getElementById('btnRunGen');
                btn.disabled = true; btn.innerText = "⏳ KOREH PENSANDO...";
                
                try {
                    // ACTUALIZACIÓN: Leemos TODOS los datos (Maps, Chars) para alimentar a la IA
                    const rawData = localStorage.getItem('nexus_saga_data');
                    let currentChars = [];
                    let currentMaps = [];
                    if (rawData) { 
                        const d = JSON.parse(rawData);
                        currentChars = d.characters || [];
                        currentMaps = d.maps || []; // <-- MAPAS AÑADIDOS
                    }
                    
                    // Pasamos el contexto completo a la IA
                    this.generator.systemData = { 
                        places: this.places, 
                        characters: currentChars,
                        maps: currentMaps 
                    };

                    this.toast("Procesando realidad con datos geográficos...");
                    const result = await this.generator.generateTimeline(prompt, useContext, timeRange);
                    
                    if (result.newCharacters?.length) this.saveCharacters(result.newCharacters);
                    if (result.places) {
                        result.places.forEach(gp => {
                            if (gp._isUpdate) {
                                const rp = this.places.find(p => p.id === gp.id);
                                if (rp && gp.events) rp.events.push(...gp.events);
                            } else {
                                this.places.push(gp);
                            }
                        });
                        this.saveData();
                        this.toast("¡Integración completada!");
                    }
                    genModal.classList.add('hidden');
                } catch (err) {
                    alert("Error: " + err.message);
                } finally {
                    btn.disabled = false; btn.innerText = "✨ GENERAR REALIDAD";
                }
            };
        }

        // Modales Edición
        const evModal = document.getElementById('eventModal');
        document.getElementById('closeEventModal').onclick = () => evModal.classList.add('hidden');
        
        ['evtTitle', 'evtTime', 'evtDesc'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.syncEventData());
        });

        document.getElementById('btnAddStage').onclick = () => { this.addStageRow(''); this.syncEventData(); };
        document.getElementById('btnDeleteEvent').onclick = () => {
            if(confirm("¿Borrar evento?")) {
                this.editing.targetPlace.events = this.editing.targetPlace.events.filter(e => e.id !== this.editing.eventId);
                this.saveData();
                evModal.classList.add('hidden');
            }
        };

        const plModal = document.getElementById('placeModal');
        document.getElementById('closePlaceModal').onclick = () => plModal.classList.add('hidden');
        document.getElementById('placeName').addEventListener('input', () => this.syncPlaceData());
        document.getElementById('placeColor').addEventListener('input', () => this.syncPlaceData());
        
        // Listener del SELECT de Vinculación
        document.getElementById('placeDbSelect').addEventListener('change', (e) => this.linkPlaceFromDb(e.target.value));

        document.getElementById('btnDeletePlace').onclick = () => {
             if(confirm("¿Borrar lugar?")) {
                 this.places = this.places.filter(p => p.id !== this.editing.placeId);
                 this.saveData();
                 plModal.classList.add('hidden');
             }
        };

        document.getElementById('btnDownload').onclick = () => this.downloadData();
        document.getElementById('btnLoad').onclick = () => document.getElementById('fileInput').click();
        document.getElementById('fileInput').onchange = (e) => this.uploadData(e);
    }

    syncEventData() {
        if (!this.editing.eventId || !this.editing.targetPlace) return;
        const evt = this.editing.targetPlace.events.find(e => e.id === this.editing.eventId);
        if (evt) {
            evt.title = document.getElementById('evtTitle').value;
            const kVal = parseFloat(document.getElementById('evtTime').value);
            if(!isNaN(kVal)) evt.k = kVal;
            evt.desc = document.getElementById('evtDesc').value;
            evt.characters = Array.from(document.querySelectorAll('.char-checkbox:checked')).map(cb => cb.value);
            evt.stages = Array.from(document.querySelectorAll('.stage-input')).map(inp => inp.value).filter(v => v.trim()!=='');
            this.saveData();
        }
    }

    syncPlaceData() {
        if (!this.editing.placeId) return;
        const p = this.places.find(pl => pl.id === this.editing.placeId);
        if(p) {
            p.name = document.getElementById('placeName').value;
            p.color = document.getElementById('placeColor').value;
            this.saveData();
        }
    }

    // --- NUEVO: VINCULACIÓN DE LUGAR ---
    
    openPlaceEditor(place) {
        this.editing.placeId = place.id;
        document.getElementById('placeName').value = place.name;
        document.getElementById('placeColor').value = place.color;

        // 1. Obtener lista de la Base de Datos (placeDb)
        const raw = localStorage.getItem('nexus_saga_data');
        let dbPlaces = [];
        if (raw) { try { dbPlaces = JSON.parse(raw).placeDb || []; } catch(e){} }

        // 2. Rellenar Select
        const sel = document.getElementById('placeDbSelect');
        sel.innerHTML = '<option value="">(Sin vincular - Carril libre)</option>';
        
        dbPlaces.forEach(dbp => {
            const opt = document.createElement('option');
            opt.value = dbp.id;
            opt.innerText = dbp.name;
            if(place.linkedDbId === dbp.id) opt.selected = true;
            sel.appendChild(opt);
        });

        document.getElementById('placeModal').classList.remove('hidden');
    }

    linkPlaceFromDb(dbId) {
        if (!this.editing.placeId) return;
        const placeLane = this.places.find(pl => pl.id === this.editing.placeId);
        if(!placeLane) return;

        // Si seleccionó vacío
        if (!dbId) {
            placeLane.linkedDbId = null;
            this.saveData();
            return;
        }

        // Buscar info en DB
        const raw = localStorage.getItem('nexus_saga_data');
        if(!raw) return;
        const dbPlaces = JSON.parse(raw).placeDb || [];
        const targetDb = dbPlaces.find(d => d.id === dbId);

        if (targetDb) {
            // Actualizar carril con datos de DB
            placeLane.linkedDbId = dbId;
            placeLane.name = targetDb.name;
            placeLane.color = targetDb.color || '#3498db';
            
            // Actualizar inputs visuales
            document.getElementById('placeName').value = placeLane.name;
            document.getElementById('placeColor').value = placeLane.color;
            
            this.saveData();
            this.toast("Carril vinculado a: " + targetDb.name);
        }
    }

    openEventEditor(evt, place) {
        this.editing.eventId = evt.id;
        this.editing.targetPlace = place; 
        document.getElementById('evtTitle').value = evt.title;
        document.getElementById('evtTime').value = Math.round(evt.k);
        
        // Incluimos ubicación geográfica si existe
        let descText = evt.desc || '';
        if(evt.mapLocation) {
            descText = `📍 UBICACIÓN: ${evt.mapLocation}\n\n${descText}`;
        }
        document.getElementById('evtDesc').value = descText;

        this.renderCharacterSelector(evt.characters || []);
        
        const stageList = document.getElementById('evtStagesList');
        stageList.innerHTML = '';
        (evt.stages || []).forEach(st => this.addStageRow(st));
        document.getElementById('eventModal').classList.remove('hidden');
    }

    renderCharacterSelector(selectedIds) {
        const container = document.getElementById('evtCharsList');
        container.innerHTML = '';
        const rawData = localStorage.getItem('nexus_saga_data');
        let allChars = [];
        if (rawData) { try { allChars = JSON.parse(rawData).characters || []; } catch(e){} }

        if (!allChars.length) {
            container.innerHTML = '<div style="color:#999;font-size:0.8rem;text-align:center;">Sin personajes.</div>';
            return;
        }

        allChars.forEach(char => {
            const row = document.createElement('div');
            row.className = 'char-check-item';
            const isChecked = selectedIds.includes(char.id);
            row.innerHTML = `<input type="checkbox" class="char-checkbox" value="${char.id}" ${isChecked?'checked':''}><span>${char.name}</span>`;
            row.onclick = (e) => {
                if(e.target.type!=='checkbox') { const cb=row.querySelector('input'); cb.checked=!cb.checked; }
                this.syncEventData();
            };
            row.querySelector('input').addEventListener('change', () => this.syncEventData());
            container.appendChild(row);
        });
    }

    addStageRow(value='') {
        const container = document.getElementById('evtStagesList');
        const div = document.createElement('div');
        div.className = 'stage-row';
        div.innerHTML = `<input type="text" class="stage-input" value="${value}"><button class="btn danger remove-stage">×</button>`;
        div.querySelector('input').addEventListener('input', () => this.syncEventData());
        div.querySelector('.remove-stage').onclick = () => { div.remove(); this.syncEventData(); };
        container.appendChild(div);
    }

    toast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg; t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 2000);
    }

    newProject() {
        if(confirm("⚠ ¿Borrar todo e iniciar de cero?")) {
            localStorage.removeItem('nexus_saga_data');
            location.reload();
        }
    }

    downloadData() {
        this.saveData();
        const fullData = localStorage.getItem('nexus_saga_data');
        if(!fullData) return;
        const blob = new Blob([fullData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NEXUS_PROJECT_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    uploadData(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                if(json.places || json.maps || json.characters) {
                    localStorage.setItem('nexus_saga_data', JSON.stringify(json));
                    this.toast("Cargado. Reiniciando...");
                    setTimeout(() => location.reload(), 1000);
                }
            } catch(err) { alert("Error JSON inválido"); }
        };
        reader.readAsText(file);
    }
}

// ARRANQUE
window.onload = () => new ChronosApp();