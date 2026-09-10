// render-properties-interactive.js - PROPIEDADES DE INTERACCIÓN, TRIGGERS Y CONDICIONES
function renderInteractivePropertiesSection(propsContent, elem, isSavedElement, propCondVar, propCondOp, propCondVal, propCondItem, propCondItemState, condVarGroup, condInvGroup, propSetVar, propSetVal, propTargetScene, interactiveProps, propCondType) {
    const varsConfig = projectData.variablesConfig || {};
    const varKeys = Object.keys(varsConfig);
    if (propCondVar) {
        propCondVar.innerHTML = '';
        varKeys.forEach(vk => {
            const opt = document.createElement('option');
            opt.value = vk;
            opt.textContent = vk;
            propCondVar.appendChild(opt);
        });
    }

    if (propSetVar) {
        propSetVar.innerHTML = '<option value="">Sin cambio de variable</option>';
        varKeys.forEach(vk => {
            const opt = document.createElement('option');
            opt.value = vk;
            opt.textContent = vk;
            propSetVar.appendChild(opt);
        });
    }

    const itemsConfig = projectData.itemsConfig || {};
    const itemIds = Object.keys(itemsConfig);
    if (propCondItem) {
        propCondItem.innerHTML = '';
        itemIds.forEach(ik => {
            const opt = document.createElement('option');
            opt.value = ik;
            opt.textContent = itemsConfig[ik].name || ik;
            propCondItem.appendChild(opt);
        });
    }

    const cond = elem.condition || { type: 'none' };
    if (propCondType) propCondType.value = cond.type || 'none';
    if (cond.type === 'variable') {
        if (condVarGroup) condVarGroup.style.display = 'flex';
        if (condInvGroup) condInvGroup.style.display = 'none';
        if (cond.varId && propCondVar) propCondVar.value = cond.varId;
        if (propCondOp) propCondOp.value = cond.op || '==';
        if (propCondVal) propCondVal.value = cond.targetVal !== undefined ? cond.targetVal : '';
    } else if (cond.type === 'inventory') {
        if (condVarGroup) condVarGroup.style.display = 'none';
        if (condInvGroup) condInvGroup.style.display = 'flex';
        if (cond.itemId && propCondItem) propCondItem.value = cond.itemId;
        if (propCondItemState) propCondItemState.value = cond.itemState || 'has';
    } else {
        if (condVarGroup) condVarGroup.style.display = 'none';
        if (condInvGroup) condInvGroup.style.display = 'none';
    }

    const setVar = elem.setVariable || { varId: '', value: '' };
    if (propSetVar) propSetVar.value = setVar.varId || '';
    if (propSetVal) propSetVal.value = setVar.value !== undefined ? setVar.value : '';

    if (propTargetScene) {
        propTargetScene.innerHTML = '<option value="">Sin cambio de zona</option>';
        if (projectData.scenes) {
            Object.keys(projectData.scenes).forEach(sId => {
                const option = document.createElement('option');
                option.value = sId;
                option.textContent = projectData.scenes[sId].name;
                if (elem.targetScene === sId) option.selected = true;
                propTargetScene.appendChild(option);
            });
        }
    }

    if (interactiveProps) {
        interactiveProps.style.display = elem.type === 'entidad' ? 'flex' : 'none';
    }

    if (elem.type === 'entidad') {
        let triggerContainer = document.getElementById('trigger-props-container');
        if (!triggerContainer) {
            triggerContainer = document.createElement('div');
            triggerContainer.id = 'trigger-props-container';
            triggerContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
            if (interactiveProps) interactiveProps.insertBefore(triggerContainer, interactiveProps.firstChild);
        }

        const currentTrigger = elem.triggerType || 'click_distance';
        const currentDist = elem.interactionDistance || 100;
        const targetXVal = elem.targetX !== undefined ? elem.targetX : '';
        const targetYVal = elem.targetY !== undefined ? elem.targetY : '';
        const transformElementVal = elem.transformAsset || '';

        triggerContainer.innerHTML = `
            <div class="form-group">
                <label for="prop-trigger-type">Modo de Activación:</label>
                <select id="prop-trigger-type">
                    <option value="passive" ${currentTrigger === 'passive' ? 'selected' : ''}>Pasivo (Al estar al lado / Automático)</option>
                    <option value="click_distance" ${currentTrigger === 'click_distance' ? 'selected' : ''}>Clic a distancia</option>
                    <option value="click_proximity" ${currentTrigger === 'click_proximity' ? 'selected' : ''}>Clic estando al lado (Jugador)</option>
                </select>
            </div>
            <div id="group-interaction-distance" class="form-group" style="display: ${currentTrigger !== 'click_distance' ? 'flex' : 'none'};">
                <label for="prop-interaction-distance">Distancia de Cercanía (px):</label>
                <input type="number" id="prop-interaction-distance" value="${currentDist}" min="10" max="1000">
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(52, 199, 89, 0.08); padding: 8px; border-radius: 8px; border: 1px solid rgba(52, 199, 89, 0.25); margin-top: 4px;">
                <div style="font-size: 10px; font-weight: 600; color: #248a3d;">Recolección y Transformación:</div>
                <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                    <input type="checkbox" id="prop-destroy-on-interact" ${elem.destroyOnInteract ? 'checked' : ''}>
                    <label for="prop-destroy-on-interact" style="margin:0; font-weight:600; color:#ff3b30;">Eliminar del mapa al interactuar</label>
                </div>
                <div class="form-group" id="group-transform-asset" style="display: ${elem.destroyOnInteract ? 'none' : 'flex'}; flex-direction: column; gap: 4px;">
                    <label style="font-size:10px;">Transformar en Elemento Guardado:</label>
                    <div id="custom-transform-picker" class="asset-picker-container">
                        <button type="button" class="btn asset-picker-trigger" id="btn-transform-picker-trigger" style="width:100%; justify-content:space-between; display:flex; align-items:center;">
                            <span id="transform-picker-trigger-text">-- No transformar (Mantener actual) --</span>
                            <span style="font-size: 8px; margin-left: 6px;">▼</span>
                        </button>
                        <div id="transform-picker-grid-dropdown" class="asset-picker-dropdown" style="display: none;">
                            <div id="transform-picker-grid-content" class="asset-picker-grid"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="group-target-coords" style="display: ${elem.targetScene ? 'flex' : 'none'}; flex-direction: column; gap: 6px; background: rgba(0,113,227,0.06); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,113,227,0.2); margin-top: 4px;">
                <div style="font-size: 10px; font-weight: 600; color: var(--accent-blue);">Punto exacto de Teletransporte:</div>
                <div class="row-group" style="display:flex; gap:6px;">
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:9px;">X Destino:</label>
                        <input type="number" id="prop-target-x" value="${targetXVal}" placeholder="Auto">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:9px;">Y Destino:</label>
                        <input type="number" id="prop-target-y" value="${targetYVal}" placeholder="Auto">
                    </div>
                </div>
                ${!isSavedElement ? `
                <button class="btn" id="btn-open-teleport-picker" type="button" style="font-size: 10px; padding: 4px; background: var(--accent-blue); color: white; border: none; margin-top: 2px;">
                    Seleccionar en Mapa
                </button>` : ''}
            </div>
        `;

        const transformBtnTrigger = document.getElementById('btn-transform-picker-trigger');
        const transformDropdown = document.getElementById('transform-picker-grid-dropdown');
        const transformTriggerText = document.getElementById('transform-picker-trigger-text');

        const updateTransformPickerUI = (elemKey) => {
            const savedConfig = projectData.savedElementsConfig || {};
            if (elemKey && savedConfig[elemKey]) {
                const savedElem = savedConfig[elemKey];
                let previewHTML = '';
                if (savedElem.isText) {
                    previewHTML = `<span style="font-size:12px; font-weight:bold; color:${savedElem.textColor || '#000'}">${savedElem.textContent || 'Texto'}</span>`;
                } else {
                    const asset = assetsMap[savedElem.image];
                    const imgSrc = asset ? asset.url : savedElem.image;
                    previewHTML = `<img src="${imgSrc}" style="width: 20px; height: 20px; object-fit: contain;">`;
                }
                transformTriggerText.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${previewHTML}
                        <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${savedElem.savedName || elemKey}</span>
                    </div>
                `;
            } else {
                transformTriggerText.textContent = '-- No transformar (Mantener actual) --';
            }
        };

        const renderTransformPickerGrid = () => {
            const grid = document.getElementById('transform-picker-grid-content');
            if (!grid) return;
            grid.innerHTML = '';

            const noneCell = document.createElement('div');
            noneCell.className = `asset-picker-cell ${!elem.transformAsset ? 'selected' : ''}`;
            noneCell.title = "No transformar";
            noneCell.style.cssText = "font-size: 10px; text-align: center; display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--text-secondary); padding: 4px;";
            noneCell.textContent = "Ninguno";
            noneCell.addEventListener('click', (e) => {
                e.stopPropagation();
                elem.transformAsset = '';
                updateTransformPickerUI('');
                renderTransformPickerGrid();
                if (transformDropdown) transformDropdown.style.display = 'none';
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
            grid.appendChild(noneCell);

            const savedConfig = projectData.savedElementsConfig || {};
            const savedKeys = Object.keys(savedConfig);

            if (savedKeys.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.cssText = "font-size: 9px; color: var(--text-secondary); grid-column: span 3; text-align: center; padding: 8px 0;";
                emptyMsg.textContent = "No hay Elementos Guardados. Guarda uno primero en la pestaña Elementos.";
                grid.appendChild(emptyMsg);
                return;
            }

            savedKeys.forEach(key => {
                const savedElem = savedConfig[key];
                const cell = document.createElement('div');
                cell.className = `asset-picker-cell ${elem.transformAsset === key ? 'selected' : ''}`;
                cell.title = savedElem.savedName || key;

                if (savedElem.isText) {
                    cell.innerHTML = `<span style="font-size: 10px; font-weight: bold; color: ${savedElem.textColor || '#000'}; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${savedElem.textContent || 'Texto'}</span>`;
                } else {
                    const asset = assetsMap[savedElem.image];
                    const imgSrc = asset ? asset.url : savedElem.image;
                    cell.innerHTML = `<img src="${imgSrc}" alt="${savedElem.savedName}">`;
                }

                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    elem.transformAsset = key;
                    updateTransformPickerUI(key);
                    renderTransformPickerGrid();
                    if (transformDropdown) transformDropdown.style.display = 'none';
                    if (typeof autoSaveJSON === 'function') autoSaveJSON();
                });

                grid.appendChild(cell);
            });
        };

        updateTransformPickerUI(transformElementVal);

        if (transformBtnTrigger && transformDropdown) {
            transformBtnTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = transformDropdown.style.display === 'none' || transformDropdown.style.display === '';
                transformDropdown.style.display = isHidden ? 'block' : 'none';
                if (isHidden) {
                    renderTransformPickerGrid();
                }
            });

            document.addEventListener('click', () => {
                if (transformDropdown) transformDropdown.style.display = 'none';
            });

            transformDropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        const chkDestroy = document.getElementById('prop-destroy-on-interact');
        if (chkDestroy) {
            chkDestroy.addEventListener('change', (e) => {
                elem.destroyOnInteract = e.target.checked;
                const groupTransform = document.getElementById('group-transform-asset');
                if (groupTransform) {
                    groupTransform.style.display = elem.destroyOnInteract ? 'none' : 'flex';
                }
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
        }

        const btnTeleportPicker = document.getElementById('btn-open-teleport-picker');
        if (btnTeleportPicker) {
            btnTeleportPicker.onclick = () => {
                if (elem.targetScene && projectData.scenes[elem.targetScene]) {
                    openTeleportMapModal(elem.targetScene, (selectedX, selectedY) => {
                        elem.targetX = selectedX;
                        elem.targetY = selectedY;
                        document.getElementById('prop-target-x').value = selectedX;
                        document.getElementById('prop-target-y').value = selectedY;
                        if (typeof autoSaveJSON === 'function') autoSaveJSON();
                    });
                } else {
                    alert("Selecciona primero una Zona/Mapa de destino.");
                }
            };
        }

        const inputTargetX = document.getElementById('prop-target-x');
        const inputTargetY = document.getElementById('prop-target-y');
        if (inputTargetX) {
            inputTargetX.addEventListener('change', () => {
                elem.targetX = inputTargetX.value !== '' ? parseInt(inputTargetX.value, 10) : undefined;
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
        }

        if (inputTargetY) {
            inputTargetY.addEventListener('change', () => {
                elem.targetY = inputTargetY.value !== '' ? parseInt(inputTargetY.value, 10) : undefined;
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
        }

        document.getElementById('prop-trigger-type').addEventListener('change', (e) => {
            elem.triggerType = e.target.value;
            const distGroup = document.getElementById('group-interaction-distance');
            if (distGroup) {
                distGroup.style.display = elem.triggerType !== 'click_distance' ? 'flex' : 'none';
            }
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });

        document.getElementById('prop-interaction-distance').addEventListener('input', (e) => {
            elem.interactionDistance = parseInt(e.target.value, 10) || 100;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });

        if (typeof renderItemMultiSelectGrid === 'function') {
            renderItemMultiSelectGrid('grid-add-items', elem, 'addItem');
            renderItemMultiSelectGrid('grid-remove-items', elem, 'removeItem');
        }
    }
}