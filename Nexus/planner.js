/* NEXUS SILENOS/planner.js */
import { PlannerAI } from './planner_ai.js';
// Asegúrate de que los otros archivos estén cargados en index.html ANTES que este
// (planner_ui.js, planner_structure.js, planner_export.js)

/**
 * PLANNER MANAGER (CORE) V4.1 - CON SOPORTE DE LORE
 * Orquestador principal.
 */

class PlannerManager {
    constructor(sagaData, saveCallback, notifyCallback) {
        this.sagaData = sagaData;
        this.save = saveCallback;
        this.notify = notifyCallback;
        
        // Inicialización de estructura de datos
        if (!this.sagaData.plannerProjects) {
            this.sagaData.plannerProjects = [];
            this.createProject("Proyecto Principal");
        }

        this.activeProjectId = this.sagaData.activePlannerProjectId || this.sagaData.plannerProjects[0].id;
        this.container = null;
        
        // --- SUB-MÓDULOS ---
        // Pasamos 'this' (el Manager) para que tengan acceso a los datos y métodos
        this.ui = new PlannerUI(this);
        this.structure = new PlannerStructure(this);
        this.exporter = new PlannerExport(this);
        
        // Motor IA (Independiente)
        this.ai = new PlannerAI(this.sagaData);
    }

    get activeProject() {
        let p = this.sagaData.plannerProjects.find(x => x.id === this.activeProjectId);
        if (!p) {
            if (this.sagaData.plannerProjects.length > 0) {
                p = this.sagaData.plannerProjects[0];
                this.activeProjectId = p.id;
            } else {
                return this.createProject("Nuevo Proyecto");
            }
        }
        if (!p.narrativeStyle) p.narrativeStyle = "STANDARD";
        // Asegurar campo de lore generado
        if (!p.aiGeneratedLore) p.aiGeneratedLore = []; 
        
        return p;
    }

    mount(containerElement) {
        this.container = containerElement;
        
        // 1. UI Genera el HTML Base
        this.ui.renderLayout(this.container);
        this.ui.renderProjectList();
        
        // 2. Bindings del Manager (Core)
        this.bindCoreEvents();
        
        // 3. Estado inicial
        this.ui.refreshSelectionLists();
    }

    // --- GESTIÓN DE PROYECTOS (CORE) ---

    createProject(title = "Nuevo Proyecto") {
        const newProj = {
            id: 'proj_' + Date.now(),
            title: title,
            narrativeStyle: 'STANDARD',
            selectedCharIds: [],
            selectedPlaceIds: [],
            selectedEventIds: [],
            chapters: [],
            aiGeneratedLore: [] // Nuevo campo para el lore deducido
        };
        this.sagaData.plannerProjects.push(newProj);
        this.activeProjectId = newProj.id;
        this.saveProjectData();
        return newProj;
    }

    selectProject(id) {
        this.activeProjectId = id;
        this.sagaData.activePlannerProjectId = id;
        this.saveProjectData();
        
        this.ui.renderProjectList();
        
        // Actualizar UI
        document.getElementById('planTitle').value = this.activeProject.title;
        const styleSel = document.getElementById('planStyle');
        if(styleSel) styleSel.value = this.activeProject.narrativeStyle || 'STANDARD';

        this.ui.refreshSelectionLists();
        
        // Forzar pestaña 1
        const tab1 = this.container.querySelector('.p-tab-btn[data-tab="select"]');
        if(tab1) tab1.click();
        
        this.notify(`Cargado: ${this.activeProject.title}`);
    }

    deleteProject(id, e) {
        if(e) e.stopPropagation();
        if (this.sagaData.plannerProjects.length <= 1) {
            this.notify("Debe existir al menos un proyecto.");
            return;
        }
        if(confirm("¿Estás seguro de eliminar este proyecto?")) {
            this.sagaData.plannerProjects = this.sagaData.plannerProjects.filter(p => p.id !== id);
            if (this.activeProjectId === id) {
                this.activeProjectId = this.sagaData.plannerProjects[0].id;
            }
            this.saveProjectData();
            this.ui.renderProjectList();
            this.selectProject(this.activeProjectId);
        }
    }

    saveProjectData() {
        this.sagaData.activePlannerProjectId = this.activeProjectId;
        this.save();
    }

    // --- BINDING & EVENTS ---

    bindCoreEvents() {
        window.PlannerManagerInstance = this;

        // Crear Proyecto
        const btnCreate = document.getElementById('btnCreateProj');
        if(btnCreate) btnCreate.onclick = () => {
            const title = prompt("Nombre del nuevo proyecto:", "Proyecto " + (this.sagaData.plannerProjects.length + 1));
            if(title) {
                const p = this.createProject(title);
                this.ui.renderProjectList();
                this.selectProject(p.id);
            }
        };

        // Tabs
        this.container.querySelectorAll('.p-tab-btn').forEach(btn => {
            btn.onclick = () => {
                this.container.querySelectorAll('.p-tab-btn').forEach(b => b.classList.remove('active'));
                this.container.querySelectorAll('.planner-content').forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
                
                const fab = document.getElementById('btnAddChapter');
                
                // Delegar lógica a submódulos según tab
                if(btn.dataset.tab === 'structure') {
                    this.structure.refreshStructureView();
                    fab.style.display = 'flex';
                } else if(btn.dataset.tab === 'export') {
                    this.exporter.generatePreview();
                    fab.style.display = 'none';
                } else if(btn.dataset.tab === 'data') {
                    this.exporter.generateDataView(); 
                    fab.style.display = 'none';
                } else {
                    fab.style.display = 'none';
                }
            };
        });

        // Inputs Globales
        const titleInput = document.getElementById('planTitle');
        if(titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.activeProject.title = e.target.value;
                this.saveProjectData();
            });
            titleInput.addEventListener('blur', () => this.ui.renderProjectList());
        }

        const styleSelect = document.getElementById('planStyle');
        if(styleSelect) {
            styleSelect.addEventListener('change', (e) => {
                this.activeProject.narrativeStyle = e.target.value;
                this.saveProjectData();
                this.notify(`Estilo cambiado a: ${e.target.options[e.target.selectedIndex].text}`);
            });
        }

        // Botones de Acción
        const btnAddChap = document.getElementById('btnAddChapter');
        if(btnAddChap) btnAddChap.onclick = () => this.structure.addChapter();
        
        const btnDown = document.getElementById('btnDownloadSilenos');
        if(btnDown) btnDown.onclick = () => this.exporter.downloadPackage();
        
        const btnAi = document.getElementById('btnAiNarrative');
        if(btnAi) btnAi.onclick = () => this.runAiNarrative();
    }

    // --- LÓGICA DE IA (CENTRALIZADA) ---

    async runAiNarrative() {
        const btn = document.getElementById('btnAiNarrative');
        const txtArea = document.getElementById('txtNarrativa');
        
        const p = this.activeProject;
        if (!p.selectedCharIds.length && !p.selectedPlaceIds.length && !p.selectedEventIds.length) {
            this.notify("⚠️ Selecciona personajes, lugares o eventos primero (Pestaña 1).");
            return;
        }

        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "⏳ KOREH TRABAJANDO...";
        
        txtArea.value = `// Generando estructura y lore con estilo ${p.narrativeStyle || 'Neutro'}...\n// Por favor espera...`;

        try {
            const result = await this.ai.generateNarrative(p, (status) => {
                console.log(status);
            });
            
            if (result.type === 'STRUCTURE') {
                // Actualizar Capítulos
                p.chapters = result.content; 
                
                // Actualizar Lore Generado (Si existe)
                if (result.lore && Array.isArray(result.lore)) {
                    p.aiGeneratedLore = result.lore;
                }
                
                this.saveProjectData();
                
                // Actualizamos submódulos
                this.structure.refreshStructureView();
                this.exporter.generateDataView(); 
                
                this.notify(`✨ Escaleta creada + ${p.aiGeneratedLore.length} Entradas de Lore.`);
            } 
            else if (result.type === 'TEXT') {
                txtArea.value = result.content;
                this.notify("✨ Borrador narrativo generado.");
            }

        } catch (error) {
            console.error(error);
            this.notify("Error en la generación IA.");
            txtArea.value = JSON.stringify({ error: error.message }, null, 2);
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }

    // --- UTILIDADES COMPARTIDAS ---
    
    findEventInfo(id) {
        for(const lane of this.sagaData.places) {
            const found = lane.events.find(e => e.id === id);
            if(found) return found;
        }
        return { title: 'Evento Desconocido', k: 0 };
    }
}

// Exponer globalmente
window.PlannerManager = PlannerManager;