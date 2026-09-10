// agent-orchestrator.js - ORQUESTADOR GENERAL Y CONTROL DE SUB-PESTAÑAS DEL AGENTE

class AgentOrchestrator {
    constructor() {
        this.currentStageTab = 'stage1'; // 'stage1', 'stage2', 'stage3'
        this.abortController = null;
        this.initUIEvents();
    }

    log(msg) {
        const consoleEl = document.getElementById('agent-console');
        if (consoleEl) {
            const time = new Date().toLocaleTimeString();
            consoleEl.innerHTML += `<div>[${time}] ${msg}</div>`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    updateProgress(percent, label) {
        const fill = document.getElementById('agent-progress-fill');
        const text = document.getElementById('agent-progress-text');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = label;
    }

    initUIEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            // 1. Selector de Escala (Px / Metro)
            const selectScale = document.getElementById('agent-px-per-meter');
            if (selectScale) {
                selectScale.addEventListener('change', (e) => {
                    const val = parseInt(e.target.value, 10);
                    agentScaleGuide.setPxPerMeter(val);
                    this.log(`Relación de escala actualizada: ${val} píxeles = 1 metro.`);
                });
            }

            // 2. Navegación por Sub-pestañas de Fase
            const btnTab1 = document.getElementById('agent-tab-stage1');
            const btnTab2 = document.getElementById('agent-tab-stage2');
            const btnTab3 = document.getElementById('agent-tab-stage3');

            const viewStage1 = document.getElementById('agent-view-stage1');
            const viewStage2 = document.getElementById('agent-view-stage2');
            const viewStage3 = document.getElementById('agent-view-stage3');

            const switchSubTab = (tabKey, activeBtn, activeView) => {
                this.currentStageTab = tabKey;
                [btnTab1, btnTab2, btnTab3].forEach(b => b && b.classList.remove('active'));
                [viewStage1, viewStage2, viewStage3].forEach(v => v && (v.style.display = 'none'));

                if (activeBtn) activeBtn.classList.add('active');
                if (activeView) activeView.style.display = 'flex';

                if (tabKey === 'stage3') {
                    this.populateStage3SceneSelect();
                }
            };

            if (btnTab1) btnTab1.addEventListener('click', () => switchSubTab('stage1', btnTab1, viewStage1));
            if (btnTab2) btnTab2.addEventListener('click', () => switchSubTab('stage2', btnTab2, viewStage2));
            if (btnTab3) btnTab3.addEventListener('click', () => switchSubTab('stage3', btnTab3, viewStage3));

            // 3. Botones de Ejecución de Fase
            const btnExecStage1 = document.getElementById('btn-exec-stage1');
            const btnExecStage2 = document.getElementById('btn-exec-stage2');
            const btnExecStage3 = document.getElementById('btn-exec-stage3');

            if (btnExecStage1) btnExecStage1.addEventListener('click', () => this.runStage1());
            if (btnExecStage2) btnExecStage2.addEventListener('click', () => this.runStage2());
            if (btnExecStage3) btnExecStage3.addEventListener('click', () => this.runStage3());
        });
    }

    // Poblar el selector de mapas para la Fase 3
    populateStage3SceneSelect() {
        const selectMap = document.getElementById('stage3-target-map');
        if (!selectMap) return;

        selectMap.innerHTML = '';
        const scenes = projectData.scenes || {};
        const sceneKeys = Object.keys(scenes);

        if (sceneKeys.length === 0) {
            selectMap.innerHTML = '<option value="">Sin mapas disponibles</option>';
            return;
        }

        sceneKeys.forEach(sId => {
            const opt = document.createElement('option');
            opt.value = sId;
            opt.textContent = `${scenes[sId].name || sId} (${sId})`;
            if (sId === currentSceneId) opt.selected = true;
            selectMap.appendChild(opt);
        });
    }

    // Validar API Key de Gemini
    getApiKey() {
        const apiKey = localStorage.getItem('koreh_gemini_book_api_key') || '';
        if (!apiKey) {
            alert("Por favor, configura tu API Key de Gemini desde la barra superior.");
            return null;
        }
        return apiKey;
    }

    // EJECUCIÓN FASE 1: ELEMENTOS Y OBJETOS
    async runStage1() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const promptText = document.getElementById('stage1-prompt').value.trim();
        if (!promptText) {
            alert("Por favor introduce una descripción de los elementos a generar.");
            return;
        }

        const stylePrompt = document.getElementById('agent-style').value.trim() || "Flat Design minimalista vectorial para videojuego 2D";
        this.abortController = new AbortController();

        try {
            this.log("Iniciando FASE 1: Elaboración de Elementos y Objetos...");
            await agentStage1Elements.generateElementsBatch(
                promptText,
                stylePrompt,
                apiKey,
                this.abortController,
                (percent, label) => {
                    this.updateProgress(percent, label);
                    this.log(label);
                }
            );
        } catch (err) {
            this.log(`Error en Fase 1: ${err.message}`);
            this.updateProgress(0, "Proceso pausado por error.");
        }
    }

    // EJECUCIÓN FASE 2: ELABORACIÓN DE MAPAS
    async runStage2() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const promptText = document.getElementById('stage2-prompt').value.trim();
        if (!promptText) {
            alert("Por favor introduce una descripción para la creación de mapas.");
            return;
        }

        const numMaps = parseInt(document.getElementById('stage2-maps-count').value, 10) || 1;
        const mapPresetKey = document.getElementById('stage2-map-size').value || 'mediano';
        const stylePrompt = document.getElementById('agent-style').value.trim() || "Flat Design minimalista vectorial para videojuego 2D";
        this.abortController = new AbortController();

        try {
            this.log(`Iniciando FASE 2: Elaboración de ${numMaps} Mapa(s)...`);
            await agentStage2Maps.generateMapsPipeline(
                promptText,
                numMaps,
                mapPresetKey,
                stylePrompt,
                apiKey,
                this.abortController,
                (percent, label) => {
                    this.updateProgress(percent, label);
                    this.log(label);
                }
            );
        } catch (err) {
            this.log(`Error en Fase 2: ${err.message}`);
            this.updateProgress(0, "Proceso pausado por error.");
        }
    }

    // EJECUCIÓN FASE 3: EDICIÓN DE PRECISIÓN
    async runStage3() {
        const apiKey = this.getApiKey();
        if (!apiKey) return;

        const targetSceneId = document.getElementById('stage3-target-map').value;
        if (!targetSceneId) {
            alert("Por favor selecciona un mapa objetivo para editar.");
            return;
        }

        const userInstructions = document.getElementById('stage3-instructions').value.trim();
        if (!userInstructions) {
            alert("Por favor introduce las instrucciones precisas de edición.");
            return;
        }

        this.abortController = new AbortController();

        try {
            this.log(`Iniciando FASE 3: Edición de Precisión sobre el mapa "${targetSceneId}"...`);
            await agentStage3Precision.executePrecisionEdit(
                targetSceneId,
                userInstructions,
                apiKey,
                this.abortController,
                (percent, label) => {
                    this.updateProgress(percent, label);
                    this.log(label);
                }
            );
        } catch (err) {
            this.log(`Error en Fase 3: ${err.message}`);
            this.updateProgress(0, "Proceso pausado por error.");
        }
    }
}

const agentOrchestrator = new AgentOrchestrator();