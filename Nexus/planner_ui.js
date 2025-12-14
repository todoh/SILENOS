/* NEXUS SILENOS/planner_ui.js */
/**
 * PLANNER UI - VISUAL INTERFACE
 * Gestiona el HTML, Tabs y Listados de Entidades.
 */

class PlannerUI {
    constructor(manager) {
        this.manager = manager; // Referencia al Core
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
                        <div class="col-source">
                            <div class="col-header">LÍNEA TEMPORAL (EVENTOS)</div>
                            <div class="filter-box"><input type="text" placeholder="Filtrar..." onkeyup="window.plannerFilter(this, 'poolEvents')"></div>
                            <div id="poolEvents" class="entity-list"></div>
                        </div>
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
        this.renderEntityList('poolChars', this.manager.sagaData.characters, 'CHAR', p.selectedCharIds);
        
        const allPlaces = [
            ...this.manager.sagaData.places.map(x => ({...x, type_label: 'CARRIL'})),
            ...(this.manager.sagaData.placeDb || []).map(x => ({...x, type_label: 'LORE'})),
            ...(this.manager.sagaData.maps || []).map(x => ({...x, type_label: 'MAPA'}))
        ];
        this.renderEntityList('poolPlaces', allPlaces, 'PLACE', p.selectedPlaceIds);

        const allEvents = [];
        this.manager.sagaData.places.forEach(lane => {
            if(lane.events) {
                lane.events.forEach(evt => {
                    allEvents.push({
                        id: evt.id,
                        name: `[T:${Math.round(evt.k)}] ${evt.title}`,
                        origin: lane.name
                    });
                });
            }
        });
        this.renderEntityList('poolEvents', allEvents, 'EVENT', p.selectedEventIds);
        this.updateStats();
    }

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