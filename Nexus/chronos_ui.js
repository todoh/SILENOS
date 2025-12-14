
/* NEXUS SILENOS/chronos_ui.js */
/**
 * CHRONOS UI (INTERFAZ DE USUARIO)
 * Manejo de Modales, Botones HTML y Formularios.
 */

export class ChronosUI {
    constructor(manager) {
        this.manager = manager;
        this.editing = manager.editing; // Referencia al estado de edición del Manager
    }

    bindEvents() {
        // --- INPUTS DE RANGO ---
        const inpStart = document.getElementById('inpTimeStart');
        const inpEnd = document.getElementById('inpTimeEnd');
        if(inpStart && inpEnd) {
            inpStart.value = this.manager.projectMeta.timeStart;
            inpEnd.value = this.manager.projectMeta.timeEnd;
            inpStart.addEventListener('change', () => this.updateRangeFromInputs());
            inpEnd.addEventListener('change', () => this.updateRangeFromInputs());
        }
        
        const btnReset = document.getElementById('btnResetZoom');
        if(btnReset) btnReset.onclick = () => this.manager.view.fitViewToRange();

        // --- BOTONES DE ACCIÓN SUPERIOR ---
        const btnAddPlace = document.getElementById('btnAddPlace');
        if(btnAddPlace) btnAddPlace.onclick = () => this.createNewLane();

        // Inyección del botón de Tubería si no existe
        this.injectGroupButton();

        const btnNewProj = document.getElementById('btnNewProject');
        if(btnNewProj) btnNewProj.onclick = () => this.manager.newProject();

        const btnDown = document.getElementById('btnDownload');
        if(btnDown) btnDown.onclick = () => this.manager.io.downloadData();
        
        const btnLoad = document.getElementById('btnLoad');
        const fileInp = document.getElementById('fileInput');
        if(btnLoad && fileInp) {
            btnLoad.onclick = () => fileInp.click();
            fileInp.onchange = (e) => this.manager.io.uploadData(e);
        }

        // --- MODAL EVENTOS ---
        const evModal = document.getElementById('eventModal');
        const closeEv = document.getElementById('closeEventModal');
        if(closeEv) closeEv.onclick = () => evModal.classList.add('hidden');
        
        ['evtTitle', 'evtTime', 'evtDesc'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', () => this.syncEventData());
        });

        const btnAddStage = document.getElementById('btnAddStage');
        if(btnAddStage) btnAddStage.onclick = () => { this.addStageRow(''); this.syncEventData(); };

        const btnDelEvt = document.getElementById('btnDeleteEvent');
        if(btnDelEvt) btnDelEvt.onclick = () => this.deleteActiveEvent();

        // --- MODAL LUGARES ---
        const plModal = document.getElementById('placeModal');
        const closePl = document.getElementById('closePlaceModal');
        if(closePl) closePl.onclick = () => plModal.classList.add('hidden');

        const plName = document.getElementById('placeName');
        const plColor = document.getElementById('placeColor');
        if(plName) plName.addEventListener('input', () => this.syncPlaceData());
        if(plColor) plColor.addEventListener('input', () => this.syncPlaceData());

        const dbSelect = document.getElementById('placeDbSelect');
        if(dbSelect) dbSelect.addEventListener('change', (e) => this.linkPlaceFromDb(e.target.value));

        const btnDelPl = document.getElementById('btnDeletePlace');
        if(btnDelPl) btnDelPl.onclick = () => this.deleteActivePlace();

        // --- MODAL GRUPOS (TUBERÍAS) ---
        const grpModal = document.getElementById('groupModal');
        const closeGrp = document.getElementById('closeGroupModal');
        if (closeGrp) closeGrp.onclick = () => grpModal.classList.add('hidden');

        const grpName = document.getElementById('groupName');
        const grpColor = document.getElementById('groupColor');
        if (grpName) grpName.addEventListener('input', () => this.syncGroupData());
        if (grpColor) grpColor.addEventListener('input', () => this.syncGroupData());

        const btnDissolve = document.getElementById('btnDissolveGroup');
        if (btnDissolve) btnDissolve.onclick = () => this.dissolveActiveGroup();

        const btnDelGrp = document.getElementById('btnDeleteGroup');
        if (btnDelGrp) btnDelGrp.onclick = () => this.deleteActiveGroup();

        // --- GENERADOR IA ---
        this.bindAIGenerator();
    }

    injectGroupButton() {
        let btnAddGroup = document.getElementById('btnAddGroup');
        if (!btnAddGroup) {
            const btnPlace = document.getElementById('btnAddPlace');
            if (btnPlace && btnPlace.parentNode) {
                btnAddGroup = document.createElement('button');
                btnAddGroup.id = 'btnAddGroup';
                btnAddGroup.className = 'btn';
                btnAddGroup.innerText = '＋ TUBERÍA';
                btnAddGroup.style.marginLeft = "5px";
                btnPlace.parentNode.insertBefore(btnAddGroup, btnPlace.nextSibling);
            }
        }
        if (btnAddGroup) {
            btnAddGroup.onclick = () => this.createGroup();
        }
    }

    // --- ACCIONES LÓGICAS UI ---

    updateRangeFromInputs() {
        this.manager.projectMeta.timeStart = parseFloat(document.getElementById('inpTimeStart').value);
        this.manager.projectMeta.timeEnd = parseFloat(document.getElementById('inpTimeEnd').value);
        this.manager.io.saveData();
        this.manager.view.fitViewToRange();
        this.toast(`Rango ajustado.`);
    }

    createNewLane() {
        const newLane = {
            id: 'p_' + Date.now(),
            name: 'Nuevo Carril',
            color: '#3498db',
            groupId: null,
            events: [],
            linkedDbId: null
        };
        this.manager.places.push(newLane);
        this.manager.io.saveData();
        this.manager.view.recalcRenderList();
        this.toast("Nuevo carril añadido.");
        this.openPlaceEditor(newLane);
    }

    createGroup() {
        const name = prompt("Nombre de la Tubería (Grupo):", "Nueva Trama");
        if(name) {
            this.manager.groups.push({
                id: 'g_' + Date.now(),
                name: name,
                color: '#bebebebb',
                collapsed: false
            });
            this.manager.io.saveData();
            this.manager.view.recalcRenderList();
            this.toast(`Tubería "${name}" creada.`);
        }
    }

    // --- EDITORES ---

    // Abre el nuevo modal de Grupo
    editGroup(group) {
        this.editing.groupId = group.id; // Guardamos referencia
        
        const grpName = document.getElementById('groupName');
        const grpColor = document.getElementById('groupColor');
        const grpModal = document.getElementById('groupModal');

        if (grpName && grpColor && grpModal) {
            grpName.value = group.name;
            grpColor.value = group.color || '#bebebe';
            grpModal.classList.remove('hidden');
        }
    }

    syncGroupData() {
        if (!this.editing.groupId) return;
        const group = this.manager.groups.find(g => g.id === this.editing.groupId);
        if (group) {
            const grpName = document.getElementById('groupName');
            const grpColor = document.getElementById('groupColor');
            
            group.name = grpName.value;
            group.color = grpColor.value;
            
            this.manager.io.saveData();
            this.manager.view.recalcRenderList();
        }
    }

    dissolveActiveGroup() {
        if (!this.editing.groupId) return;
        const groupId = this.editing.groupId;

        if(confirm("¿Liberar los carriles de esta tubería? (Los carriles NO se borrarán)")) {
            // Liberar carriles
            this.manager.places.forEach(p => {
                if (p.groupId === groupId) p.groupId = null;
            });

            // Borrar grupo
            this.manager.groups = this.manager.groups.filter(g => g.id !== groupId);

            this.manager.io.saveData();
            this.manager.view.recalcRenderList();
            document.getElementById('groupModal').classList.add('hidden');
            this.toast("Tubería disuelta.");
        }
    }

    deleteActiveGroup() {
        if (!this.editing.groupId) return;
        const groupId = this.editing.groupId;

        if(confirm("⚠ ¡PELIGRO! Esto borrará la tubería Y TODOS los carriles dentro. ¿Continuar?")) {
            // Borrar carriles
            this.manager.places = this.manager.places.filter(p => p.groupId !== groupId);

            // Borrar grupo
            this.manager.groups = this.manager.groups.filter(g => g.id !== groupId);

            this.manager.io.saveData();
            this.manager.view.recalcRenderList();
            document.getElementById('groupModal').classList.add('hidden');
            this.toast("Tubería y contenido eliminados.");
        }
    }

    openPlaceEditor(place) {
        this.editing.placeId = place.id;
        document.getElementById('placeName').value = place.name;
        document.getElementById('placeColor').value = place.color;

        // DB SELECT
        const raw = localStorage.getItem('nexus_saga_data');
        let dbPlaces = [];
        if (raw) { try { dbPlaces = JSON.parse(raw).placeDb || []; } catch(e){} }

        const sel = document.getElementById('placeDbSelect');
        sel.innerHTML = '<option value="">(Sin vincular - Carril libre)</option>';
        dbPlaces.forEach(dbp => {
            const opt = document.createElement('option');
            opt.value = dbp.id;
            opt.innerText = dbp.name;
            if(place.linkedDbId === dbp.id) opt.selected = true;
            sel.appendChild(opt);
        });

        // GROUP SELECT (Inyectar si falta)
        let grpContainer = document.getElementById('grpSelectContainer');
        if (!grpContainer) {
            const body = document.querySelector('#placeModal .panel-body');
            grpContainer = document.createElement('div');
            grpContainer.id = 'grpSelectContainer';
            grpContainer.style.marginBottom = "15px";
            grpContainer.innerHTML = `
                <label style="color:#636e72; font-weight:bold;">TUBERÍA (GRUPO)</label>
                <select id="placeGroupSelect" class="char-input"></select>
            `;
            sel.parentNode.insertBefore(grpContainer, sel.nextSibling);
            document.getElementById('placeGroupSelect').addEventListener('change', () => this.syncPlaceData());
        }

        const grpSel = document.getElementById('placeGroupSelect');
        grpSel.innerHTML = '<option value="">(Sin Agrupar)</option>';
        this.manager.groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.innerText = g.name;
            if(place.groupId === g.id) opt.selected = true;
            grpSel.appendChild(opt);
        });

        document.getElementById('placeModal').classList.remove('hidden');
    }

    syncPlaceData() {
        if (!this.editing.placeId) return;
        const p = this.manager.places.find(pl => pl.id === this.editing.placeId);
        if(p) {
            p.name = document.getElementById('placeName').value;
            p.color = document.getElementById('placeColor').value;
            const grpSel = document.getElementById('placeGroupSelect');
            if (grpSel) p.groupId = grpSel.value || null;
            
            this.manager.io.saveData();
            this.manager.view.recalcRenderList();
        }
    }

    linkPlaceFromDb(dbId) {
        if (!this.editing.placeId) return;
        const placeLane = this.manager.places.find(pl => pl.id === this.editing.placeId);
        if(!placeLane) return;

        if (!dbId) {
            placeLane.linkedDbId = null;
            this.manager.io.saveData();
            return;
        }

        const raw = localStorage.getItem('nexus_saga_data');
        if(!raw) return;
        const dbPlaces = JSON.parse(raw).placeDb || [];
        const targetDb = dbPlaces.find(d => d.id === dbId);

        if (targetDb) {
            placeLane.linkedDbId = dbId;
            placeLane.name = targetDb.name;
            placeLane.color = targetDb.color || '#3498db';
            document.getElementById('placeName').value = placeLane.name;
            document.getElementById('placeColor').value = placeLane.color;
            this.manager.io.saveData();
            this.toast("Vinculado: " + targetDb.name);
        }
    }

    deleteActivePlace() {
        if(confirm("¿Borrar lugar?")) {
            this.manager.places = this.manager.places.filter(p => p.id !== this.editing.placeId);
            this.manager.io.saveData();
            this.manager.view.recalcRenderList();
            document.getElementById('placeModal').classList.add('hidden');
        }
    }

    openEventEditor(evt, place) {
        this.editing.eventId = evt.id;
        this.editing.targetPlace = place; 
        document.getElementById('evtTitle').value = evt.title;
        document.getElementById('evtTime').value = Math.round(evt.k);
        
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
            this.manager.io.saveData();
        }
    }

    deleteActiveEvent() {
        if(confirm("¿Borrar evento?")) {
            this.editing.targetPlace.events = this.editing.targetPlace.events.filter(e => e.id !== this.editing.eventId);
            this.manager.io.saveData();
            document.getElementById('eventModal').classList.add('hidden');
        }
    }

    bindAIGenerator() {
        const btnGen = document.getElementById('btnGenTimeline');
        const genModal = document.getElementById('genTimelineModal');
        if (btnGen) {
            btnGen.onclick = () => genModal.classList.remove('hidden');
            document.getElementById('closeGenModal').onclick = () => genModal.classList.add('hidden');
            
            document.getElementById('btnRunGen').onclick = async () => {
                const prompt = document.getElementById('genPromptInput').value;
                const useContext = document.getElementById('genUseContext').checked;
                if (!prompt.trim()) return;

                const btn = document.getElementById('btnRunGen');
                btn.disabled = true; btn.innerText = "⏳ KOREH PENSANDO...";
                
                try {
                    await this.manager.runAIGeneration(prompt, useContext);
                    genModal.classList.add('hidden');
                } catch (err) {
                    alert("Error: " + err.message);
                } finally {
                    btn.disabled = false; btn.innerText = "✨ GENERAR REALIDAD";
                }
            };
        }
    }

    toast(msg) {
        const t = document.getElementById('toast');
        if(t) {
            t.innerText = msg; t.classList.remove('hidden');
            setTimeout(() => t.classList.add('hidden'), 2000);
        }
    }
}
