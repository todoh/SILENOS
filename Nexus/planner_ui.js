/* NEXUS SILENOS/planner_ui.js */
/**
 * PLANNER UI - VISUAL INTERFACE (V2.5 - COLLAPSIBLE & SCROLL FIX)
 * Gestiona el HTML, Tabs, Listados de Entidades y la Jerarquía de Eventos.
 * MEJORA: Soporte para plegar tuberías y corrección de la barra de desplazamiento.
 */

class PlannerUI {
    constructor(manager) {
        this.manager = manager; // Referencia al Core
        // Estado local para recordar qué grupos están plegados (collapsed)
        this.collapsedGroups = {}; 
    }

    renderLayout(container) {
    container.innerHTML = `
        <div class="planner-wrapper">
            <div class="project-sidebar">
                <div class="proj-sidebar-header">
                    MIS PROYECTOS
                    <button id="btnCreateProj" class="icon-btn-mini" style="background:#0984e3; color:white;" title="Crear Nuevo">＋</button>
                </div>
                <div id="projectList" class="project-list"></div>
                <div class="project-actions-footer">
                    <small style="color:#636e72;">Nexus guarda automáticamente.</small>
                </div>
            </div>

            <div class="planner-main-area">
                <div class="planner-top-bar">
                    <div style="flex:1; display:flex; flex-direction:column; gap:5px;">
                        <input type="text" id="planTitle" value="${this.manager.activeProject.title}" 
                            class="planner-title-input" placeholder="TÍTULO DE LA OBRA">
                        
                        <div style="display:flex; align-items:center; gap:10px;">
                            <label style="font-size:0.7rem; font-weight:bold; color:#888;">ESTILO NARRATIVO:</label>
                            <select id="planStyle" style="border:none; background:transparent; font-size:0.8rem; font-weight:bold; color:#6c5ce7; cursor:pointer;">
                                <option value="STANDARD">Estándar / Equilibrado</option>
                                <option value="NOVEL_DRAMA">Novela Dramática (Introspectivo)</option>
                                <option value="DARK_FANTASY">Fantasía Oscura (Grimdark)</option>
                                <option value="SCI_FI_HARD">Ciencia Ficción Hard (Técnico)</option>
                                <option value="MYSTERY_NOIR">Misterio / Noir</option>
                                <option value="EPIC_MYTH">Épico / Mitológico</option>
                                <option value="JOURNALISTIC">Crónica / Periodístico</option>
                            </select>
                        </div>
                    </div>
                    <div class="planner-stats" id="planStats">0 Pers | 0 Lug | 0 Evt</div>
                </div>

                <div class="planner-tabs">
                    <button class="p-tab-btn active" data-tab="select">1. SELECCIÓN</button>
                    <button class="p-tab-btn" data-tab="structure">2. ESTRUCTURA</button>
                    <button class="p-tab-btn" data-tab="export">3. EXPORTAR JSON</button>
                    <button class="p-tab-btn" data-tab="data" style="color:var(--ai-color)">4. DATOS (TEXTO)</button>
                </div>

                <div id="tab-select" class="planner-content active">
                    <div class="col-source">
                        <div class="col-header">PERSONAJES</div>
                        <div class="filter-box"><input type="text" placeholder="Filtrar..." onkeyup="window.plannerFilter(this, 'poolChars')"></div>
                        <div id="poolChars" class="entity-list"></div>
                    </div>
                    
                    <div class="col-source">
                        <div class="col-header">LUGARES (MAPA + LORE)</div>
                        <div class="filter-box"><input type="text" placeholder="Filtrar..." onkeyup="window.plannerFilter(this, 'poolPlaces')"></div>
                        <div id="poolPlaces" class="entity-list"></div>
                    </div>
                    
                    <div class="col-source" style="flex:1.5;"> 
                        <div class="col-header">LÍNEA TEMPORAL (JERARQUÍA)</div>
                        <div class="filter-box"><input type="text" placeholder="Filtrar eventos..." onkeyup="window.plannerFilter(this, 'poolEvents')"></div>
                        <div id="poolEvents" class="entity-list"></div> </div>
                </div>

                <div id="tab-structure" class="planner-content">
                    <div class="chapter-list-container" id="chapterList">
                        <div class="empty-placeholder">Crea un capítulo para empezar a organizar la trama.</div>
                    </div>
                    <div class="event-pool-sidebar">
                        <div class="col-header">POOL DE EVENTOS</div>
                        <div class="help-text">Arrastra estos eventos dentro de los capítulos.</div>
                        <div id="structureEventPool" class="entity-list"></div>
                    </div>
                </div>

                <div id="tab-export" class="planner-content column-mode">
                    <div class="export-card">
                        <h3>RESUMEN DEL PROYECTO ACTUAL (JSON)</h3>
                        <div id="exportSummary">...</div>
                        <div class="json-preview-box" id="jsonPreview"></div>
                    </div>
                    <div class="action-bar-center">
                        <button id="btnDownloadSilenos" class="btn primary big-btn">
                            📥 DESCARGAR PROYECTO ACTUAL (.JSON)
                        </button>
                    </div>
                </div>

                <div id="tab-data" class="planner-content column-mode" style="overflow-y:auto; padding-right:10px;">
                    <div class="data-grid">
                        <div class="data-block full-width">
                            <div class="data-header-row">
                                <span>📜 NARRATIVA (ESCALETA JSON)</span>
                                <div style="display:flex; gap:10px;">
                                    <button id="btnAiNarrative" class="copy-btn" style="background: linear-gradient(135deg, #6a11cb, #2575fc); color:white;">✨ GENERAR CON IA</button>
                                    <button class="copy-btn" onclick="window.downloadNarrativeJson()">⬇ JSON</button>
                                    <button class="copy-btn" onclick="window.copyData('txtNarrativa')">COPIAR</button>
                                </div>
                            </div>
                            <textarea id="txtNarrativa" class="data-text-area" readonly></textarea>
                        </div>

                        <div class="data-block">
                            <div class="data-header-row">
                                <span>👥 PERSONAJES</span>
                                <button class="copy-btn" onclick="window.copyData('txtPersonajes')">COPIAR</button>
                            </div>
                            <textarea id="txtPersonajes" class="data-text-area" readonly></textarea>
                        </div>

                        <div class="data-block">
                            <div class="data-header-row">
                                <span>🗺️ LUGARES</span>
                                <button class="copy-btn" onclick="window.copyData('txtLugares')">COPIAR</button>
                            </div>
                            <textarea id="txtLugares" class="data-text-area" readonly></textarea>
                        </div>

                        <div class="data-block">
                            <div class="data-header-row">
                                <span>⏳ EVENTOS CRONOLÓGICOS</span>
                                <button class="copy-btn" onclick="window.copyData('txtEventos')">COPIAR</button>
                            </div>
                            <textarea id="txtEventos" class="data-text-area" readonly></textarea>
                        </div>
                    </div>
                </div>
                
                <button id="btnAddChapter" class="fab-btn planner-fab" style="display:none;">＋</button>
            </div>
        </div>
    `;

    this.injectGlobalHelpers();
}

renderProjectList() {
    const list = document.getElementById('projectList');
    if (!list) return;
    list.innerHTML = '';
    
    this.manager.sagaData.plannerProjects.forEach(p => {
        const div = document.createElement('div');
        div.className = `project-item ${p.id === this.manager.activeProjectId ? 'active' : ''}`;
        const safeTitle = p.title.length > 20 ? p.title.substring(0, 18) + '...' : p.title;
        div.innerHTML = `
            <span>${safeTitle || 'Sin Título'}</span>
            <button class="btn-del-proj" onclick="window.PlannerManagerInstance.deleteProject('${p.id}', event)">×</button>
        `;
        div.onclick = () => this.manager.selectProject(p.id);
        list.appendChild(div);
    });
}

refreshSelectionLists() {
    const p = this.manager.activeProject;
    
    // 1. Personajes (Lista Plana)
    this.renderEntityList('poolChars', this.manager.sagaData.characters, 'CHAR', p.selectedCharIds);
    
    // 2. Lugares (Lista Plana: Mapas + Lore)
    const allPlaces = [
        ...this.manager.sagaData.places.map(x => ({...x, type_label: 'CARRIL'})),
        ...(this.manager.sagaData.placeDb || []).map(x => ({...x, type_label: 'LORE'})),
        ...(this.manager.sagaData.maps || []).map(x => ({...x, type_label: 'MAPA'}))
    ];
    this.renderEntityList('poolPlaces', allPlaces, 'PLACE', p.selectedPlaceIds);

    // 3. Eventos (JERARQUÍA: TUBERÍA -> CARRIL -> EVENTOS)
    this.renderEventHierarchy('poolEvents', p.selectedEventIds);

    this.updateStats();
}

/**
 * RENDERIZADOR JERÁRQUICO DE EVENTOS CON SOPORTE DE PLEGADO
 */
renderEventHierarchy(containerId, selectedIds) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = ''; // Limpiar lista

    const groups = this.manager.sagaData.groups || [];
    const places = this.manager.sagaData.places || [];

    // 1. RENDERIZAR GRUPOS (TUBERÍAS)
    groups.forEach(group => {
        // Buscar carriles en este grupo
        const groupLanes = places.filter(l => l.groupId === group.id);
        if(groupLanes.length === 0) return; // Si el grupo está vacío, no lo mostramos

        // Obtener todos los eventos del grupo para la lógica de "Seleccionar Todo"
        let groupEventIds = [];
        groupLanes.forEach(l => {
            if(l.events) l.events.forEach(e => groupEventIds.push(e.id));
        });
        if(groupEventIds.length === 0) return; // Grupo sin eventos

        // Contenedor del Grupo
        const groupDiv = document.createElement('div');
        groupDiv.style.marginBottom = "10px";
        groupDiv.style.border = "1px solid #ddd";
        groupDiv.style.borderRadius = "8px";
        groupDiv.style.background = "#fafafa";
        groupDiv.style.overflow = "hidden";
        groupDiv.style.flexShrink = "0"; // Evita que se aplaste en flex

        // Estado: ¿Está plegado? ¿Está todo seleccionado?
        const isCollapsed = this.collapsedGroups[group.id] || false;
        const allGroupSelected = groupEventIds.every(id => selectedIds.includes(id));
        const arrowIcon = isCollapsed ? '▶' : '▼';

        // Cabecera del Grupo (Clicable para plegar)
        const groupHeader = document.createElement('div');
        groupHeader.style.padding = "10px 12px";
        groupHeader.style.background = "#e0e0e0";
        groupHeader.style.color = "#333";
        groupHeader.style.fontWeight = "bold";
        groupHeader.style.fontSize = "0.8rem";
        groupHeader.style.display = "flex";
        groupHeader.style.justifyContent = "space-between";
        groupHeader.style.alignItems = "center";
        groupHeader.style.cursor = "pointer";
        groupHeader.style.userSelect = "none";
        
        groupHeader.innerHTML = `
            <span style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.7rem; width:15px; display:inline-block; text-align:center;">${arrowIcon}</span> 
                TUBERÍA: ${group.name.toUpperCase()}
            </span>
            <button class="btn small" style="font-size:0.65rem; padding:2px 8px; ${allGroupSelected ? 'background:#27ae60; color:white;' : 'background:white; color:#333;'}">
                ${allGroupSelected ? '✔ TODOS' : 'SELECCIONAR'}
            </button>
        `;
        
        // 1. Evento Click en la Cabecera (PLEGAR/DESPLEGAR)
        groupHeader.onclick = (e) => {
            // Si el click fue en el botón, no plegamos
            if(e.target.tagName !== 'BUTTON') {
                this.collapsedGroups[group.id] = !isCollapsed; // Invertir estado
                this.renderEventHierarchy(containerId, selectedIds); // Re-renderizar
            }
        };

        // 2. Evento Click en el Botón (SELECCIÓN MASIVA)
        groupHeader.querySelector('button').onclick = (e) => {
            e.stopPropagation(); // Evitar que burbujee al header y pliegue
            this.toggleBulkSelection(groupEventIds, !allGroupSelected);
        };

        groupDiv.appendChild(groupHeader);

        // Renderizar Carriles (SOLO SI NO ESTÁ PLEGADO)
        if (!isCollapsed) {
            const contentDiv = document.createElement('div');
            
            groupLanes.forEach(lane => {
                this._appendLaneToContainer(contentDiv, lane, selectedIds, true);
            });
            
            groupDiv.appendChild(contentDiv);
        }

        container.appendChild(groupDiv);
    });

    // 2. RENDERIZAR HUÉRFANOS (Sin Grupo)
    const orphanLanes = places.filter(l => !l.groupId || !groups.find(g => g.id === l.groupId));
    
    if (orphanLanes.length > 0) {
        const orphanDiv = document.createElement('div');
        orphanDiv.style.marginTop = "15px";
        orphanDiv.style.borderTop = "2px dashed #eee";
        orphanDiv.style.paddingTop = "10px";
        orphanDiv.innerHTML = `<div style="font-size:0.7rem; font-weight:bold; color:#999; margin-bottom:5px; text-align:center;">OTROS CARRILES</div>`;
        
        orphanLanes.forEach(lane => {
            this._appendLaneToContainer(orphanDiv, lane, selectedIds, false);
        });
        
        container.appendChild(orphanDiv);
    }
}

_appendLaneToContainer(container, lane, selectedIds, isNested) {
    if(!lane.events || lane.events.length === 0) return;

    const laneEventIds = lane.events.map(e => e.id);
    const allLaneSelected = laneEventIds.every(id => selectedIds.includes(id));

    // Cabecera del Carril
    const laneHeader = document.createElement('div');
    laneHeader.style.padding = "6px 10px";
    laneHeader.style.marginLeft = isNested ? "10px" : "0px";
    laneHeader.style.marginBottom = "5px";
    laneHeader.style.marginTop = "5px";
    laneHeader.style.borderLeft = `4px solid ${lane.color}`;
    laneHeader.style.background = "white";
    laneHeader.style.display = "flex";
    laneHeader.style.justifyContent = "space-between";
    laneHeader.style.alignItems = "center";
    laneHeader.style.fontSize = "0.75rem";
    laneHeader.style.fontWeight = "bold";
    laneHeader.style.color = "#555";
    laneHeader.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)";
    
    laneHeader.innerHTML = `
        <span>${lane.name} (${lane.events.length})</span>
        <button class="btn small" style="font-size:0.6rem; padding:1px 6px; border:1px solid #eee; cursor:pointer;">
            ${allLaneSelected ? '✔' : 'TODO'}
        </button>
    `;

    // Acción Bulk Carril
    laneHeader.querySelector('button').onclick = () => {
        this.toggleBulkSelection(laneEventIds, !allLaneSelected);
    };

    container.appendChild(laneHeader);

    // Lista de Eventos (Tarjetas)
    const eventListDiv = document.createElement('div');
    eventListDiv.style.paddingLeft = isNested ? "20px" : "10px";
    eventListDiv.style.paddingRight = "5px";
    eventListDiv.style.display = "flex";
    eventListDiv.style.flexDirection = "column";
    eventListDiv.style.gap = "5px";

    lane.events.forEach(evt => {
        const card = document.createElement('div');
        const isSelected = selectedIds.includes(evt.id);
        card.className = 'p-card ' + (isSelected ? 'selected' : '');
        
        card.innerHTML = `
            <div class="p-card-info">
                <span class="p-name">${evt.title}</span>
                <span class="p-sub">[T:${Math.round(evt.k)}] ${evt.desc ? evt.desc.substring(0,30)+'...' : ''}</span>
            </div>
            <span class="p-tag">EVENT</span>
        `;

        card.onclick = () => {
            this.toggleSingleSelection(evt.id);
        };

        eventListDiv.appendChild(card);
    });

    container.appendChild(eventListDiv);
}

/**
 * Maneja la selección masiva (Groups/Lanes)
 */
toggleBulkSelection(ids, shouldSelect) {
    const p = this.manager.activeProject;
    
    if (shouldSelect) {
        // Añadir los que falten
        ids.forEach(id => {
            if (!p.selectedEventIds.includes(id)) p.selectedEventIds.push(id);
        });
    } else {
        // Remover todos
        p.selectedEventIds = p.selectedEventIds.filter(id => !ids.includes(id));
    }

    this.manager.saveProjectData();
    this.updateStats();
    // Re-renderizar (mantiene estado de collapse porque está en this.collapsedGroups)
    this.refreshSelectionLists(); 
}

toggleSingleSelection(id) {
    const p = this.manager.activeProject;
    if(p.selectedEventIds.includes(id)) {
        p.selectedEventIds = p.selectedEventIds.filter(x => x !== id);
    } else {
        p.selectedEventIds.push(id);
    }
    this.manager.saveProjectData();
    this.updateStats();
    this.refreshSelectionLists(); 
}

// --- RENDERIZADO GENÉRICO (Personajes / Lugares) ---
renderEntityList(containerId, dataArray, type, storageArray) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = '';
    dataArray.forEach(item => {
        const label = item.name || item.title || 'Sin Nombre';
        const tag = item.type_label || type;
        const card = document.createElement('div');
        card.className = 'p-card ' + (storageArray.includes(item.id) ? 'selected' : '');
        card.innerHTML = `
            <div class="p-card-info"><span class="p-name">${label}</span>${item.origin ? `<span class="p-sub">${item.origin}</span>` : ''}</div>
            <span class="p-tag">${tag}</span>
        `;
        card.onclick = () => {
            if(storageArray.includes(item.id)) {
                storageArray.splice(storageArray.indexOf(item.id), 1);
                card.classList.remove('selected');
            } else { storageArray.push(item.id); card.classList.add('selected'); }
            this.updateStats();
            this.manager.saveProjectData();
        };
        container.appendChild(card);
    });
}

updateStats() {
    const s = this.manager.activeProject;
    const stats = document.getElementById('planStats');
    if(stats) {
        stats.innerText = `${s.selectedCharIds.length} Pers | ${s.selectedPlaceIds.length} Lug | ${s.selectedEventIds.length} Evt`;
    }
}

injectGlobalHelpers() {
    // Helpers Globales para UI (Filtrado y Copia)
    window.plannerFilter = (input, containerId) => {
        const term = input.value.toLowerCase();
        // Buscar tarjetas genéricas
        const items = document.getElementById(containerId).getElementsByClassName('p-card');
        
        Array.from(items).forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(term) ? 'flex' : 'none';
        });
    };

    window.copyData = (elementId) => {
        const el = document.getElementById(elementId);
        el.select();
        document.execCommand('copy');
        this.manager.notify("Texto copiado al portapapeles.");
    };
}
}