// logic.js - MANEJO DE NAVEGACIÓN, PESTAÑAS Y DROP EN CANVAS
let selectedPickerAssetKey = '';

function renderAssetPickerGrid() {
    const grid = document.getElementById('picker-grid-content');
    if (!grid) return;
    grid.innerHTML = '';
    
    const assetKeys = Object.keys(assetsMap);
    if (assetKeys.length === 0) {
        grid.innerHTML = '<span style="font-size: 10px; color: var(--text-secondary); grid-column: span 3; text-align: center; padding: 12px 0;">No hay assets cargados</span>';
        return;
    }
    
    assetKeys.forEach(key => {
        const asset = assetsMap[key];
        const cell = document.createElement('div');
        cell.className = `asset-picker-cell ${selectedPickerAssetKey === key ? 'selected' : ''}`;
        cell.title = key;
        cell.innerHTML = `<img src="${asset.url}" alt="${key}">`;
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            selectPickerAsset(key);
            const dropdown = document.getElementById('picker-grid-dropdown');
            if (dropdown) dropdown.style.display = 'none';
        });
        grid.appendChild(cell);
    });
}

function selectPickerAsset(key) {
    selectedPickerAssetKey = key;
    const triggerText = document.getElementById('picker-trigger-text');
    if (key && assetsMap[key]) {
        triggerText.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${assetsMap[key].url}" style="width: 20px; height: 20px; object-fit: contain;">
                <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${key}</span>
            </div>
        `;
    } else {
        if (triggerText) triggerText.textContent = '-- Seleccionar Imagen --';
    }
    renderAssetPickerGrid();
}

document.addEventListener('DOMContentLoaded', () => {
    const stage = document.getElementById('stage');
    const btnSelectDir = document.getElementById('btn-select-dir');
    const btnExportHtml = document.getElementById('btn-export-html');
    const btnLoadFiles = document.getElementById('btn-load-files');
    const fileInput = document.getElementById('file-input');
    const btnAddScene = document.getElementById('btn-add-scene');
    const btnModeEdit = document.getElementById('btn-mode-edit');
    const btnModePlay = document.getElementById('btn-mode-play');
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
    const btnMenuGeneration = document.getElementById('btn-menu-generation');
    const btnMenuAgent = document.getElementById('btn-menu-agent');
    const btnMenuLogic = document.getElementById('btn-menu-logic');
    const btnMenuIO = document.getElementById('btn-menu-io');
    
    const viewAssets = document.getElementById('view-assets');
    const viewElements = document.getElementById('view-elements');
    const viewInventoryConfig = document.getElementById('view-inventory-config');
    const viewGeneration = document.getElementById('view-generation');
    const viewAgent = document.getElementById('view-agent');
    const viewLogic = document.getElementById('view-logic');
    const viewIO = document.getElementById('view-io');

    const btnStartAgent = document.getElementById('btn-start-agent');
    const btnResumeAgent = document.getElementById('btn-resume-agent');

    // --- CAMBIO DE PESTAÑAS EN LA BARRA LATERAL ---
    function switchSidebarTab(activeBtn, activeView) {
        [btnMenuAssets, btnMenuElements, btnMenuInventory, btnMenuGeneration, btnMenuAgent, btnMenuLogic, btnMenuIO].forEach(b => b && b.classList.remove('active'));
        [viewAssets, viewElements, viewInventoryConfig, viewGeneration, viewAgent, viewLogic, viewIO].forEach(v => v && (v.style.display = 'none'));
        
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
            renderAssetPickerGrid();
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

    // --- CONFIGURACIÓN DE ASPECT RATIO Y BOTONES PRINCIPALES ---
    if (selectAspectRatio) {
        selectAspectRatio.value = projectData.aspectRatio || "horizontal";
        selectAspectRatio.addEventListener('change', () => {
            projectData.aspectRatio = selectAspectRatio.value;
            if (typeof resetCamera === 'function') resetCamera();
            autoSaveJSON();
            renderStage();
            fitStage();
        });
    }

    if (btnSelectDir) {
        btnSelectDir.addEventListener('click', async () => {
            try {
                dirHandle = await window.showDirectoryPicker();
                await loadProjectFromDir();
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

    // --- DRAG AND DROP EN EL STAGE (MANEJA TANTO ASSETS SUELTOS COMO ELEMENTOS GUARDADOS) ---
    if (stage) {
        stage.addEventListener('dragover', (e) => e.preventDefault());
        stage.addEventListener('drop', async (e) => {
            e.preventDefault();
            if (isPlayMode) return;

            if (!projectData) projectData = { scenes: {} };
            if (!projectData.scenes) projectData.scenes = {};
            if (!currentSceneId || !projectData.scenes[currentSceneId]) {
                const firstSceneKey = Object.keys(projectData.scenes)[0];
                if (firstSceneKey) {
                    currentSceneId = firstSceneKey;
                } else {
                    currentSceneId = "zona_1";
                    projectData.scenes[currentSceneId] = { name: "Zona Principal", elements: [] };
                }
            }
            if (!projectData.scenes[currentSceneId].elements) {
                projectData.scenes[currentSceneId].elements = [];
            }

            const rect = stage.getBoundingClientRect();
            const dim = getStageDimensions();
            const scaleX = dim.width / rect.width;
            const scaleY = dim.height / rect.height;

            const savedElemJson = e.dataTransfer.getData('application/json');
            const dropType = e.dataTransfer.getData('text/plain');

            // CASO A: Se soltó un Elemento Reutilizable Guardado
            if (dropType === 'saved_element' && savedElemJson) {
                const elemData = JSON.parse(savedElemJson);
                const newElement = JSON.parse(JSON.stringify(elemData));
                
                newElement.id = 'elem_' + Date.now();
                delete newElement.savedName;

                const targetW = elemData.width || 100;
                const targetH = elemData.height || 100;

                const x = Math.round(((e.clientX - rect.left) * scaleX) - (targetW / 2));
                const y = Math.round(((e.clientY - rect.top) * scaleY) - (targetH / 2));

                newElement.x = Math.max(0, x);
                newElement.y = Math.max(0, y);

                projectData.scenes[currentSceneId].elements.push(newElement);
                selectedElementId = newElement.id;
                renderStage();
                autoSaveJSON();
                return;
            }

            // CASO B: Se soltó una Imagen desde Assets directamente
            const fileName = dropType;
            if (!fileName || !assetsMap[fileName]) return;

            const asset = assetsMap[fileName];
            let targetW = Math.min(250, asset.width);
            let targetH = targetW / asset.aspect;

            const x = Math.round(((e.clientX - rect.left) * scaleX) - (targetW / 2));
            const y = Math.round(((e.clientY - rect.top) * scaleY) - (targetH / 2));

            const newElement = {
                id: 'elem_' + Date.now(),
                image: fileName,
                x: Math.max(0, x),
                y: Math.max(0, y),
                width: Math.round(targetW),
                height: Math.round(targetH),
                rotation: 0,
                type: 'decoracion',
                keepAspect: true,
                dialog: '',
                targetScene: '',
                addItem: [],
                removeItem: [],
                condition: { type: 'none' },
                setVariable: { varId: '', value: '' }
            };

            projectData.scenes[currentSceneId].elements.push(newElement);
            selectedElementId = newElement.id;
            renderStage();
            autoSaveJSON();
        });
    }

    // --- LISTENERS DE PROPIEDADES ---
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

    // --- CONDICIONES DE APARICIÓN ---
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

    // --- CAMBIO DE VARIABLES ---
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

    // --- GESTIÓN DE VARIABLES Y ZONAS ---
    const varKeyInput = document.getElementById('var-key');
    const varTypeInput = document.getElementById('var-type');
    const varValInput = document.getElementById('var-val');
    const btnSaveVariable = document.getElementById('btn-save-variable');

    if (btnSaveVariable) {
        btnSaveVariable.addEventListener('click', () => {
            const key = varKeyInput.value.trim().replace(/\s+/g, '_');
            const type = varTypeInput.value;
            let val = varValInput.value.trim();
            
            if (!key) {
                alert('Por favor introduce un ID válido para la variable.');
                return;
            }
            
            if (type === 'boolean') {
                val = val === 'true' || val === '1';
            } else if (type === 'number') {
                val = Number(val) || 0;
            }
            
            if (!projectData.variablesConfig) projectData.variablesConfig = {};
            projectData.variablesConfig[key] = { type, value: val };
            
            autoSaveJSON();
            updateVariablesConfigUI();
            updatePropertiesPanel();
            
            varKeyInput.value = '';
            varValInput.value = '';
        });
    }

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
    
    setMode(false);
    renderSceneTabs();
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

// MANEJADORES DE INPUTS DE TAMAÑO PERSONALIZADO
document.addEventListener('DOMContentLoaded', () => {
    const selectAspectRatio = document.getElementById('select-aspect-ratio');
    const customDimContainer = document.getElementById('custom-dim-container');
    const inputCustomWidth = document.getElementById('input-custom-width');
    const inputCustomHeight = document.getElementById('input-custom-height');

    if (selectAspectRatio) {
        selectAspectRatio.addEventListener('change', () => {
            projectData.aspectRatio = selectAspectRatio.value;
            if (customDimContainer) {
                customDimContainer.style.display = selectAspectRatio.value === 'custom' ? 'flex' : 'none';
            }
            if (typeof resetCamera === 'function') resetCamera();
            autoSaveJSON();
            renderStage();
            fitStage();
        });
    }

    const updateCustomDimensions = () => {
        if (inputCustomWidth && inputCustomHeight) {
            projectData.customWidth = Math.max(100, parseInt(inputCustomWidth.value, 10) || 1920);
            projectData.customHeight = Math.max(100, parseInt(inputCustomHeight.value, 10) || 1080);
            autoSaveJSON();
            renderStage();
            fitStage();
        }
    };

    if (inputCustomWidth) inputCustomWidth.addEventListener('input', updateCustomDimensions);
    if (inputCustomHeight) inputCustomHeight.addEventListener('input', updateCustomDimensions);
});