// logic.js - MANEJO DE NAVEGACI N, PESTA AS LATERALES Y BINDINGS DE UI PRINCIPAL
document.addEventListener('DOMContentLoaded', () => {
    const btnSelectDir = document.getElementById('btn-select-dir');
    const btnExportHtml = document.getElementById('btn-export-html');
    const btnLoadFiles = document.getElementById('btn-load-files');
    const fileInput = document.getElementById('file-input');
    const btnAddScene = document.getElementById('btn-add-scene');
    const btnModeEdit = document.getElementById('btn-mode-edit');
    const btnModePlay = document.getElementById('btn-mode-play');
    const btnToggleView = document.getElementById('btn-toggle-view');
    const btnDeleteElement = document.getElementById('btn-delete-element');
    const selectStartScene = document.getElementById('select-start-scene');
    const selectAspectRatio = document.getElementById('select-aspect-ratio');
    
    const propType = document.getElementById('prop-type');
    const propKeepAspect = document.getElementById('prop-keep-aspect');
    const propDialog = document.getElementById('prop-dialog');
    const propTargetScene = document.getElementById('prop-target-scene');
    
    const btnMenuAssets = document.getElementById('btn-menu-assets');
    const btnMenuElements = document.getElementById('btn-menu-elements');
    const btnMenuInventory = document.getElementById('btn-menu-inventory');
    const btnMenuStats = document.getElementById('btn-menu-stats');
    const btnMenuGeneration = document.getElementById('btn-menu-generation');
    const btnMenuAgent = document.getElementById('btn-menu-agent');
    const btnMenuLogic = document.getElementById('btn-menu-logic');
    const btnMenuIO = document.getElementById('btn-menu-io');
    
    const viewAssets = document.getElementById('view-assets');
    const viewElements = document.getElementById('view-elements');
    const viewInventoryConfig = document.getElementById('view-inventory-config');
    const viewStats = document.getElementById('view-stats');
    const viewGeneration = document.getElementById('view-generation');
    const viewAgent = document.getElementById('view-agent');
    const viewLogic = document.getElementById('view-logic');
    const viewIO = document.getElementById('view-io');

    const btnStartAgent = document.getElementById('btn-start-agent');
    const btnResumeAgent = document.getElementById('btn-resume-agent');

    // BOTÓN DE CAMBIO ENTRE VISTA 2D Y VISTA 2.5D (MODE 7)
    if (btnToggleView) {
        btnToggleView.addEventListener('click', () => {
            isIsometricView = !isIsometricView;
            btnToggleView.textContent = isIsometricView ? 'Vista: 2.5D (Mode 7)' : 'Vista: 2D';
            btnToggleView.classList.toggle('active', isIsometricView);
            renderStage();
        });
    }

    // --- CAMBIO DE PESTA AS EN LA BARRA LATERAL ---
    function switchSidebarTab(activeBtn, activeView) {
        [btnMenuAssets, btnMenuElements, btnMenuInventory, btnMenuStats, btnMenuGeneration, btnMenuAgent, btnMenuLogic, btnMenuIO].forEach(b => b && b.classList.remove('active'));
        [viewAssets, viewElements, viewInventoryConfig, viewStats, viewGeneration, viewAgent, viewLogic, viewIO].forEach(v => v && (v.style.display = 'none'));
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeView) activeView.style.display = 'flex';
    }

    if (btnMenuAssets) btnMenuAssets.addEventListener('click', () => switchSidebarTab(btnMenuAssets, viewAssets));
    if (btnMenuElements) {
        btnMenuElements.addEventListener('click', () => {
            switchSidebarTab(btnMenuElements, viewElements);
            if (typeof updateElementsUI === 'function') updateElementsUI();
        });
    }
    if (btnMenuInventory) {
        btnMenuInventory.addEventListener('click', () => {
            switchSidebarTab(btnMenuInventory, viewInventoryConfig);
            if (typeof updateInventoryConfigUI === 'function') updateInventoryConfigUI();
            if (typeof renderAssetPickerGrid === 'function') renderAssetPickerGrid();
        });
    }
    if (btnMenuStats) {
        btnMenuStats.addEventListener('click', () => {
            switchSidebarTab(btnMenuStats, viewStats);
            if (typeof updateStatsUI === 'function') updateStatsUI();
        });
    }
    if (btnMenuGeneration) btnMenuGeneration.addEventListener('click', () => switchSidebarTab(btnMenuGeneration, viewGeneration));
    if (btnMenuAgent) btnMenuAgent.addEventListener('click', () => switchSidebarTab(btnMenuAgent, viewAgent));
    if (btnMenuLogic) {
        btnMenuLogic.addEventListener('click', () => {
            switchSidebarTab(btnMenuLogic, viewLogic);
            if (typeof updateVariablesConfigUI === 'function') updateVariablesConfigUI();
        });
    }
    if (btnMenuIO) btnMenuIO.addEventListener('click', () => switchSidebarTab(btnMenuIO, viewIO));

    // Listeners del Agente ODS
    if (btnStartAgent) {
        btnStartAgent.addEventListener('click', () => {
            if (typeof agentOrchestrator !== 'undefined') agentOrchestrator.startPipeline();
        });
    }
    if (btnResumeAgent) {
        btnResumeAgent.addEventListener('click', () => {
            if (typeof agentOrchestrator !== 'undefined') agentOrchestrator.resumePipeline();
        });
    }

    // --- CONFIGURACI N DE BARRA SUPERIOR Y ABRIR CARPETA DE PROYECTO ---
    if (selectAspectRatio) {
        selectAspectRatio.value = projectData.aspectRatio || "horizontal";
    }

    if (btnSelectDir) {
        btnSelectDir.addEventListener('click', async () => {
            try {
                dirHandle = await window.showDirectoryPicker();
                if (typeof loadProjectFromDir === 'function') {
                    await loadProjectFromDir();
                }
            } catch (e) {
                console.warn("Acceso a directorio cancelado:", e);
            }
        });
    }

    if (btnExportHtml) btnExportHtml.addEventListener('click', exportStandaloneHTML);

    if (btnLoadFiles) btnLoadFiles.addEventListener('click', () => fileInput.click());
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            for (const file of e.target.files) {
                await registerAsset(file.name, file);
                if (dirHandle) {
                    try {
                        const newFileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                        const writable = await newFileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                    } catch (err) {
                        console.error("Error guardando archivo en directorio:", err);
                    }
                }
            }
        });
    }

    // --- LISTENERS DE PROPIEDADES INDIVIDUALES ---
    if (propType) {
        propType.addEventListener('change', () => {
            const elem = getSelectedElement();
            if (elem) {
                elem.type = propType.value;
                renderStage();
                autoSaveJSON();
            }
        });
    }

    if (propKeepAspect) {
        propKeepAspect.addEventListener('change', () => {
            const elem = getSelectedElement();
            if (elem) {
                elem.keepAspect = propKeepAspect.checked;
                autoSaveJSON();
            }
        });
    }

    if (selectStartScene) {
        selectStartScene.addEventListener('change', () => {
            projectData.startScene = selectStartScene.value;
            autoSaveJSON();
        });
    }

    [propDialog, propTargetScene].forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                const elem = getSelectedElement();
                if (elem) {
                    elem.dialog = propDialog.value;
                    elem.targetScene = propTargetScene.value;
                    autoSaveJSON();
                }
            });
        }
    });

    // --- CONDICIONES Y BINDINGS DE PROPIEDADES ---
    const propCondType = document.getElementById('prop-cond-type');
    const propCondVar = document.getElementById('prop-cond-var');
    const propCondOp = document.getElementById('prop-cond-op');
    const propCondVal = document.getElementById('prop-cond-val');
    const propCondItem = document.getElementById('prop-cond-item');
    const propCondItemState = document.getElementById('prop-cond-item-state');

    const updateConditionData = () => {
        const elem = getSelectedElement();
        if (!elem) return;
        
        const type = propCondType.value;
        if (type === 'none') {
            elem.condition = { type: 'none' };
        } else if (type === 'variable') {
            elem.condition = {
                type: 'variable',
                varId: propCondVar.value,
                op: propCondOp.value,
                targetVal: propCondVal.value
            };
        } else if (type === 'inventory') {
            elem.condition = {
                type: 'inventory',
                itemId: propCondItem.value,
                itemState: propCondItemState.value
            };
        }
        autoSaveJSON();
        renderStage();
    };

    [propCondType, propCondVar, propCondOp, propCondVal, propCondItem, propCondItemState].forEach(el => {
        if (el) el.addEventListener('change', updateConditionData);
    });

    const propSetVar = document.getElementById('prop-set-var');
    const propSetVal = document.getElementById('prop-set-val');

    const updateSetVarData = () => {
        const elem = getSelectedElement();
        if (!elem) return;
        
        elem.setVariable = {
            varId: propSetVar.value,
            value: propSetVal.value
        };
        autoSaveJSON();
    };

    if (propSetVar) propSetVar.addEventListener('change', updateSetVarData);
    if (propSetVal) propSetVal.addEventListener('change', updateSetVarData);

    if (btnDeleteElement) {
        btnDeleteElement.addEventListener('click', () => {
            const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
            if (scene && scene.elements && selectedElementId) {
                scene.elements = scene.elements.filter(e => e.id !== selectedElementId);
                selectedElementId = null;
                renderStage();
                autoSaveJSON();
            }
        });
    }

    if (btnAddScene) {
        btnAddScene.addEventListener('click', () => {
            const id = 'zona_' + Date.now();
            const name = prompt("Nombre de la nueva zona/mapa:", "Nueva Zona");
            if (name) {
                if (!projectData.scenes) projectData.scenes = {};
                projectData.scenes[id] = { name, elements: [] };
                if (!projectData.startScene) projectData.startScene = id;
                currentSceneId = id;
                renderSceneTabs();
                renderStage();
                autoSaveJSON();
            }
        });
    }

    if (btnModeEdit) btnModeEdit.addEventListener('click', () => setMode(false));
    if (btnModePlay) btnModePlay.addEventListener('click', () => setMode(true));

    // INICIALIZAR EL ESCENARIO Y PESTA AS AL CARGAR LA P GINA
    setMode(false);
    renderSceneTabs();
    renderStage();
});

function updateVariablesConfigUI() {
    const list = document.getElementById('registered-variables-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!projectData.variablesConfig || Object.keys(projectData.variablesConfig).length === 0) {
        list.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary);">No hay variables configuradas.</span>';
        return;
    }
    
    Object.keys(projectData.variablesConfig).forEach(varId => {
        const variable = projectData.variablesConfig[varId];
        const card = document.createElement('div');
        card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.7); border: 1px solid var(--border-subtle); padding: 6px 10px; border-radius: 8px;';
        
        card.innerHTML = `
            <div>
                <strong style="font-size: 11px; display: block; color: var(--text-primary);">${varId}</strong>
                <span style="font-size: 9px; color: var(--text-secondary);">${variable.type} = ${variable.value}</span>
            </div>
            <button class="btn" style="padding: 2px 6px; font-size: 10px; background: #ff3b30; color: white; border: none;">Borrar</button>
        `;
        
        card.querySelector('button').onclick = () => {
            delete projectData.variablesConfig[varId];
            autoSaveJSON();
            updateVariablesConfigUI();
            updatePropertiesPanel();
        };
        
        list.appendChild(card);
    });
}