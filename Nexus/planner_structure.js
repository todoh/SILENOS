/* NEXUS SILENOS/planner_structure.js */
/**
 * PLANNER STRUCTURE - CHAPTER MANAGEMENT
 * Gestiona la lógica de capítulos, POV, Drag & Drop de eventos.
 */

class PlannerStructure {
    constructor(manager) {
        this.manager = manager;
    }

    refreshStructureView() {
        const p = this.manager.activeProject;
        const list = document.getElementById('chapterList');
        if(!list) return;

        list.innerHTML = '';
        if(p.chapters.length === 0) list.innerHTML = '<div class="empty-placeholder">Crea un capítulo para empezar a organizar la trama.</div>';

        // Obtener personajes seleccionados para el selector POV
        const projectChars = this.manager.sagaData.characters.filter(c => p.selectedCharIds.includes(c.id));

        p.chapters.forEach((chap, idx) => {
            const card = document.createElement('div');
            card.className = 'chapter-card';
            
            let eventsHtml = '';
            chap.linkedEventIds.forEach(eid => {
                const evtInfo = this.manager.findEventInfo(eid);
                eventsHtml += `<div class="chap-event-chip"><span>${evtInfo.title}</span><button onclick="window.removeEvtFromChap(${idx}, '${eid}')">×</button></div>`;
            });

            // Generar opciones de POV
            let povOptions = `<option value="">Narrador Omnisciente</option>`;
            projectChars.forEach(c => {
                const selected = chap.povId === c.id ? 'selected' : '';
                povOptions += `<option value="${c.id}" ${selected}>POV: ${c.name}</option>`;
            });

            card.innerHTML = `
                <div class="chap-header">
                    <div class="chap-num">#${idx + 1}</div>
                    <input type="text" class="chap-input" value="${chap.title}" placeholder="Título del Capítulo" oninput="window.updateChapTitle(${idx}, this.value)">
                    <button class="icon-btn-mini danger" onclick="window.deleteChap(${idx})">🗑</button>
                </div>
                
                <div style="display:flex; gap:10px; margin-top:5px; margin-bottom:5px;">
                     <select class="char-input" style="flex:1; font-weight:bold; color:#6c5ce7; font-size:0.8rem;" onchange="window.updateChapPov(${idx}, this.value)" title="Punto de Vista">
                        ${povOptions}
                     </select>
                </div>

                <div style="display:flex; gap:10px;">
                    <textarea class="chap-desc" style="flex:1;" placeholder="Sinopsis: ¿Qué ocurre?" oninput="window.updateChapDesc(${idx}, this.value)">${chap.desc}</textarea>
                    <textarea class="chap-desc" style="flex:1; border-left:2px solid #eee; padding-left:10px; color:#6c5ce7;" placeholder="Foco Dramático / Instrucciones IA (Ej: 'Resaltar la soledad', 'Atmósfera terrorífica')..." oninput="window.updateChapFocus(${idx}, this.value)">${chap.focus||''}</textarea>
                </div>

                <div class="chap-dropzone" id="dropZone_${idx}" ondragover="event.preventDefault(); this.classList.add('drag-over');" ondragleave="this.classList.remove('drag-over')" ondrop="window.dropEvent(${idx}, event)">
                    ${eventsHtml || '<span style="opacity:0.5">Arrastra eventos clave aquí</span>'}
                </div>
            `;
            list.appendChild(card);
        });

        // Event Pool
        const pool = document.getElementById('structureEventPool');
        pool.innerHTML = '';
        p.selectedEventIds.forEach(eid => {
            const evt = this.manager.findEventInfo(eid);
            if(evt) {
                const div = document.createElement('div');
                div.className = 'pool-item draggable';
                div.draggable = true;
                div.innerHTML = `<span class="pool-time">T:${Math.round(evt.k)}</span> ${evt.title}`;
                div.ondragstart = (e) => { e.dataTransfer.setData("text/plain", eid); };
                pool.appendChild(div);
            }
        });

        this.injectStructureHelpers();
    }

    addChapter() {
        const p = this.manager.activeProject;
        // Inicializar con campos vacíos
        p.chapters.push({ title: "", desc: "", focus: "", povId: "", linkedEventIds: [] });
        this.manager.saveProjectData();
        this.refreshStructureView();
        setTimeout(() => { 
            const el = document.getElementById('chapterList');
            if(el) el.scrollTop = el.scrollHeight; 
        }, 50);
    }

    injectStructureHelpers() {
        // Funciones window para los eventos inline del HTML
        window.updateChapTitle = (i, v) => { this.manager.activeProject.chapters[i].title = v; this.manager.saveProjectData(); };
        window.updateChapDesc = (i, v) => { this.manager.activeProject.chapters[i].desc = v; this.manager.saveProjectData(); };
        window.updateChapFocus = (i, v) => { this.manager.activeProject.chapters[i].focus = v; this.manager.saveProjectData(); };
        window.updateChapPov = (i, v) => { this.manager.activeProject.chapters[i].povId = v; this.manager.saveProjectData(); };

        window.deleteChap = (i) => { 
            if(confirm("¿Borrar capítulo?")) { 
                this.manager.activeProject.chapters.splice(i, 1); 
                this.manager.saveProjectData(); 
                this.refreshStructureView(); 
            } 
        };
        
        window.dropEvent = (chapIdx, e) => {
            e.preventDefault(); 
            document.getElementById(`dropZone_${chapIdx}`).classList.remove('drag-over');
            const eid = e.dataTransfer.getData("text/plain");
            if(eid && !this.manager.activeProject.chapters[chapIdx].linkedEventIds.includes(eid)) {
                this.manager.activeProject.chapters[chapIdx].linkedEventIds.push(eid);
                this.manager.saveProjectData();
                this.refreshStructureView();
            }
        };
        
        window.removeEvtFromChap = (chapIdx, eid) => {
            const ch = this.manager.activeProject.chapters[chapIdx];
            ch.linkedEventIds = ch.linkedEventIds.filter(id => id !== eid);
            this.manager.saveProjectData();
            this.refreshStructureView();
        };
    }
}