// render-properties.js - PANEL LATERAL DE PROPIEDADES Y CONFIGURACIÓN DE ACCIONES

function updatePropertiesPanel() {
    const propsContent = document.getElementById('props-content');
    const propsEmptyMsg = document.getElementById('props-empty-msg');
    const propType = document.getElementById('prop-type');
    const propKeepAspect = document.getElementById('prop-keep-aspect');
    const propDialog = document.getElementById('prop-dialog');
    const propTargetScene = document.getElementById('prop-target-scene');
    const interactiveProps = document.getElementById('interactive-props');
    const btnCropElement = document.getElementById('btn-crop-element');

    const propCondType = document.getElementById('prop-cond-type');
    const propCondVar = document.getElementById('prop-cond-var');
    const propCondOp = document.getElementById('prop-cond-op');
    const propCondVal = document.getElementById('prop-cond-val');
    const propCondItem = document.getElementById('prop-cond-item');
    const propCondItemState = document.getElementById('prop-cond-item-state');

    const condVarGroup = document.getElementById('cond-variable-group');
    const condInvGroup = document.getElementById('cond-inventory-group');

    const propSetVar = document.getElementById('prop-set-var');
    const propSetVal = document.getElementById('prop-set-val');

    const scene = projectData.scenes[currentSceneId];
    const elem = scene ? scene.elements.find(e => e.id === selectedElementId) : null;

    if (!elem || isPlayMode) {
        if (propsContent) propsContent.style.display = 'none';
        if (propsEmptyMsg) propsEmptyMsg.style.display = 'block';
        return;
    }

    if (propsEmptyMsg) propsEmptyMsg.style.display = 'none';
    if (propsContent) propsContent.style.display = 'flex';

    if (btnCropElement) {
        if (!elem.isText) {
            btnCropElement.style.display = 'block';
            btnCropElement.onclick = () => {
                activeCropElemId = elem.id;
                renderStage();
            };
        } else {
            btnCropElement.style.display = 'none';
        }
    }

    propType.value = elem.type;
    propKeepAspect.checked = elem.keepAspect !== undefined ? elem.keepAspect : true;
    propDialog.value = elem.dialog || '';

    let physicsPropsContainer = document.getElementById('physics-element-props');
    if (!physicsPropsContainer) {
        physicsPropsContainer = document.createElement('div');
        physicsPropsContainer.id = 'physics-element-props';
        physicsPropsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 4px;';
        propsContent.insertBefore(physicsPropsContainer, propsContent.firstChild);
    }

    const cW = elem.collisionW !== undefined ? elem.collisionW : elem.width;
    const cH = elem.collisionH !== undefined ? elem.collisionH : elem.height;
    const cX = elem.collisionX !== undefined ? elem.collisionX : Math.round((elem.width - cW) / 2);
    const cY = elem.collisionY !== undefined ? elem.collisionY : (elem.height - cH);

    elem.collisionW = cW;
    elem.collisionH = cH;
    elem.collisionX = cX;
    elem.collisionY = cY;

    const movePatternVal = elem.movePattern || 'static';
    const wanderRadiusVal = elem.wanderRadius || 150;
    const waypointsArr = elem.waypoints || [];
    const waypointLoopVal = elem.waypointLoop || 'loop';

    physicsPropsContainer.innerHTML = `
        <div class="sidebar-title">Propiedades de Física / Movimiento</div>
        <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="prop-is-player" ${elem.isPlayer ? 'checked' : ''}>
            <label for="prop-is-player" style="margin:0; font-weight:600; color:var(--accent-blue);">Es Personaje Jugador</label>
        </div>
        <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="prop-has-collision" ${elem.hasCollision ? 'checked' : ''}>
            <label for="prop-has-collision" style="margin:0;">Activar Colisión Obstáculo</label>
        </div>
        <div id="collision-editor-fields" style="display: ${elem.hasCollision || elem.isPlayer ? 'flex' : 'none'}; flex-direction: column; gap: 6px; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 10px; font-weight: 600; color: #ff9500;">Ajuste de Caja de Colisión (px):</div>
            <div class="row-group" style="display:flex; gap:6px;">
                <div class="form-group" style="flex:1;">
                    <label style="font-size:9px;">Offset X:</label>
                    <input type="number" id="prop-col-x" value="${cX}">
                </div>
                <div class="form-group" style="flex:1;">
                    <label style="font-size:9px;">Offset Y:</label>
                    <input type="number" id="prop-col-y" value="${cY}">
                </div>
            </div>
            <div class="row-group" style="display:flex; gap:6px;">
                <div class="form-group" style="flex:1;">
                    <label style="font-size:9px;">Ancho (W):</label>
                    <input type="number" id="prop-col-w" value="${cW}" min="1">
                </div>
                <div class="form-group" style="flex:1;">
                    <label style="font-size:9px;">Alto (H):</label>
                    <input type="number" id="prop-col-h" value="${cH}" min="1">
                </div>
            </div>
        </div>
        ${elem.type === 'entidad' && !elem.isPlayer ? `
        <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(0,113,227,0.04); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,113,227,0.15); margin-top: 4px;">
            <div style="font-size: 10px; font-weight: 600; color: var(--accent-blue);">Movimiento Autónomo:</div>
            <div class="form-group">
                <label style="font-size:10px;">Patrón de Movimiento:</label>
                <select id="prop-move-pattern">
                    <option value="static" ${movePatternVal === 'static' ? 'selected' : ''}>Quieto (Estático)</option>
                    <option value="random" ${movePatternVal === 'random' ? 'selected' : ''}>Movimiento Aleatorio (Wander)</option>
                    <option value="waypoints" ${movePatternVal === 'waypoints' ? 'selected' : ''}>Ruta de Puntos (Waypoints)</option>
                </select>
            </div>
            <div id="group-wander-radius" class="form-group" style="display: ${movePatternVal === 'random' ? 'flex' : 'none'};">
                <label style="font-size:10px;">Radio de Desplazamiento (px):</label>
                <input type="number" id="prop-wander-radius" value="${wanderRadiusVal}" min="20" max="2000">
            </div>
            <div id="group-waypoints-editor" style="display: ${movePatternVal === 'waypoints' ? 'flex' : 'none'}; flex-direction: column; gap: 6px;">
                <div class="form-group">
                    <label style="font-size:10px;">Comportamiento del Bucle:</label>
                    <select id="prop-waypoint-loop">
                        <option value="loop" ${waypointLoopVal === 'loop' ? 'selected' : ''}>Ciclo Continuo (1->N->1)</option>
                        <option value="pingpong" ${waypointLoopVal === 'pingpong' ? 'selected' : ''}>Ping-Pong (1->N->1 en reverso)</option>
                        <option value="once" ${waypointLoopVal === 'once' ? 'selected' : ''}>Una sola vez</option>
                    </select>
                </div>
                <button class="btn" id="btn-toggle-route-edit" type="button" style="font-size: 10px; padding: 6px; background: ${isRouteEditingMode ? '#ff3b30' : '#0071e3'}; color: white; border: none; font-weight: 600;">
                    ${isRouteEditingMode ? 'Terminar Edición de Ruta' : 'Añadir Puntos en Mapa Real'}
                </button>
                <div style="font-size: 9px; color: var(--text-secondary);">
                    ${isRouteEditingMode ? 'Haz clic directamente sobre el escenario para añadir waypoints. Arrastra nodos para moverlos o clic secundario para borrar.' : `Puntos guardados: ${waypointsArr.length}`}
                </div>
            </div>
        </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid var(--border-subtle);">
    `;

    document.getElementById('prop-is-player').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        if (isChecked) {
            if (projectData && projectData.scenes) {
                Object.values(projectData.scenes).forEach(sc => {
                    if (sc.elements) {
                        sc.elements.forEach(el => el.isPlayer = false);
                    }
                });
            }
        }
        elem.isPlayer = isChecked;
        autoSaveJSON();
        renderStage();
        updatePropertiesPanel();
    });

    document.getElementById('prop-has-collision').addEventListener('change', (e) => {
        elem.hasCollision = e.target.checked;
        if (elem.hasCollision) {
            if (elem.collisionW === undefined) elem.collisionW = elem.width;
            if (elem.collisionH === undefined) elem.collisionH = elem.height;
            if (elem.collisionX === undefined) elem.collisionX = Math.round((elem.width - elem.collisionW) / 2);
            if (elem.collisionY === undefined) elem.collisionY = elem.height - elem.collisionH;
        }
        autoSaveJSON();
        renderStage();
        updatePropertiesPanel();
    });

    if (elem.type === 'entidad' && !elem.isPlayer) {
        const selectMovePattern = document.getElementById('prop-move-pattern');
        const inputWanderRadius = document.getElementById('prop-wander-radius');
        const groupWanderRadius = document.getElementById('group-wander-radius');
        const groupWaypointsEditor = document.getElementById('group-waypoints-editor');
        const selectWaypointLoop = document.getElementById('prop-waypoint-loop');
        const btnToggleRouteEdit = document.getElementById('btn-toggle-route-edit');

        if (selectMovePattern) {
            selectMovePattern.addEventListener('change', (e) => {
                elem.movePattern = e.target.value;
                isRouteEditingMode = false;
                if (groupWanderRadius) groupWanderRadius.style.display = elem.movePattern === 'random' ? 'flex' : 'none';
                if (groupWaypointsEditor) groupWaypointsEditor.style.display = elem.movePattern === 'waypoints' ? 'flex' : 'none';
                if (elem.movePattern === 'random') {
                    elem.originX = elem.x;
                    elem.originY = elem.y;
                }
                autoSaveJSON();
                renderStage();
            });
        }

        if (inputWanderRadius) {
            inputWanderRadius.addEventListener('input', (e) => {
                elem.wanderRadius = parseInt(e.target.value, 10) || 150;
                autoSaveJSON();
            });
        }

        if (selectWaypointLoop) {
            selectWaypointLoop.addEventListener('change', (e) => {
                elem.waypointLoop = e.target.value;
                autoSaveJSON();
                renderStage();
            });
        }

        if (btnToggleRouteEdit) {
            btnToggleRouteEdit.onclick = () => {
                isRouteEditingMode = !isRouteEditingMode;
                renderStage();
                updatePropertiesPanel();
            };
        }
    }

    const colXInput = document.getElementById('prop-col-x');
    const colYInput = document.getElementById('prop-col-y');
    const colWInput = document.getElementById('prop-col-w');
    const colHInput = document.getElementById('prop-col-h');

    const updateCollisionValues = () => {
        elem.collisionX = parseInt(colXInput.value, 10) || 0;
        elem.collisionY = parseInt(colYInput.value, 10) || 0;
        elem.collisionW = Math.max(1, parseInt(colWInput.value, 10) || elem.width);
        elem.collisionH = Math.max(1, parseInt(colHInput.value, 10) || elem.height);
        autoSaveJSON();
        renderStage();
    };

    if (colXInput) colXInput.addEventListener('input', updateCollisionValues);
    if (colYInput) colYInput.addEventListener('input', updateCollisionValues);
    if (colWInput) colWInput.addEventListener('input', updateCollisionValues);
    if (colHInput) colHInput.addEventListener('input', updateCollisionValues);

    let textPropsContainer = document.getElementById('text-element-props');
    if (!textPropsContainer) {
        textPropsContainer = document.createElement('div');
        textPropsContainer.id = 'text-element-props';
        textPropsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 4px;';
        propsContent.insertBefore(textPropsContainer, physicsPropsContainer.nextSibling);
    }

    if (elem.isText) {
        textPropsContainer.style.display = 'flex';
        textPropsContainer.innerHTML = `
            <div class="sidebar-title">Propiedades de Texto</div>
            <div class="form-group">
                <label>Contenido del Texto:</label>
                <textarea id="txt-prop-content" rows="2">${elem.textContent || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Tipografía:</label>
                <select id="txt-prop-font">
                    <option value="Arial, sans-serif" ${elem.fontFamily === 'Arial, sans-serif' ? 'selected' : ''}>Arial</option>
                    <option value="'Courier New', monospace" ${elem.fontFamily === "'Courier New', monospace" ? 'selected' : ''}>Courier New</option>
                    <option value="'Georgia', serif" ${elem.fontFamily === "'Georgia', serif" ? 'selected' : ''}>Georgia</option>
                    <option value="'Impact', sans-serif" ${elem.fontFamily === "'Impact', sans-serif" ? 'selected' : ''}>Impact</option>
                    <option value="'Trebuchet MS', sans-serif" ${elem.fontFamily === "'Trebuchet MS', sans-serif" ? 'selected' : ''}>Trebuchet MS</option>
                </select>
            </div>
            <div class="row-group" style="display:flex; gap:8px;">
                <div class="form-group" style="flex:1;">
                    <label>Tamaño (px):</label>
                    <input type="number" id="txt-prop-size" value="${elem.fontSize || 24}" min="8" max="200">
                </div>
                <div class="form-group" style="flex:1;">
                    <label>Color Texto:</label>
                    <input type="color" id="txt-prop-color" value="${elem.textColor || '#1d1d1f'}" style="height:32px; padding:2px; cursor:pointer;">
                </div>
            </div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="txt-prop-outline" ${elem.textOutline ? 'checked' : ''}>
                <label for="txt-prop-outline" style="margin:0;">Contorno</label>
                <input type="color" id="txt-prop-outline-color" value="${elem.textOutlineColor || '#000000'}" style="height:24px; padding:0; cursor:pointer; margin-left:auto;">
            </div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="txt-prop-shadow" ${elem.textShadow ? 'checked' : ''}>
                <label for="txt-prop-shadow" style="margin:0;">Sombra</label>
                <input type="color" id="txt-prop-shadow-color" value="${elem.textShadowColor || '#000000'}" style="height:24px; padding:0; cursor:pointer; margin-left:auto;">
            </div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="txt-prop-glow" ${elem.textGlow ? 'checked' : ''}>
                <label for="txt-prop-glow" style="margin:0;">Brillo</label>
                <input type="color" id="txt-prop-glow-color" value="${elem.textGlowColor || '#0071e3'}" style="height:24px; padding:0; cursor:pointer; margin-left:auto;">
            </div>
            <hr style="border: none; border-top: 1px solid var(--border-subtle);">
        `;

        const updateTextElementDOM = () => {
            const el = document.getElementById(`stage-el-${elem.id}`);
            if (!el) return;
            el.textContent = elem.textContent || '';
            el.style.fontSize = (elem.fontSize || 24) + 'px';
            el.style.fontFamily = elem.fontFamily || 'Arial, sans-serif';
            el.style.color = elem.textColor || '#1d1d1f';
            const outline = elem.textOutline ? `-1px -1px 0 ${elem.textOutlineColor || '#000'}, 1px -1px 0 ${elem.textOutlineColor || '#000'}, -1px 1px 0 ${elem.textOutlineColor || '#000'}, 1px 1px 0 ${elem.textOutlineColor || '#000'}` : '';
            const shadow = elem.textShadow ? `0px 4px 8px ${elem.textShadowColor || 'rgba(0,0,0,0.5)'}` : '';
            const glow = elem.textGlow ? `0px 0px 12px ${elem.textGlowColor || '#0071e3'}` : '';
            const textEffects = [outline, shadow, glow].filter(Boolean).join(', ');
            el.style.textShadow = textEffects || 'none';
            autoSaveJSON();
        };

        document.getElementById('txt-prop-content').addEventListener('input', (e) => {
            elem.textContent = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-font').addEventListener('change', (e) => {
            elem.fontFamily = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-size').addEventListener('input', (e) => {
            elem.fontSize = parseInt(e.target.value, 10) || 24;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-color').addEventListener('input', (e) => {
            elem.textColor = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-outline').addEventListener('change', (e) => {
            elem.textOutline = e.target.checked;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-outline-color').addEventListener('input', (e) => {
            elem.textOutlineColor = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-shadow').addEventListener('change', (e) => {
            elem.textShadow = e.target.checked;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-shadow-color').addEventListener('input', (e) => {
            elem.textShadowColor = e.target.value;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-glow').addEventListener('change', (e) => {
            elem.textGlow = e.target.checked;
            updateTextElementDOM();
        });
        document.getElementById('txt-prop-glow-color').addEventListener('input', (e) => {
            elem.textGlowColor = e.target.value;
            updateTextElementDOM();
        });
    } else {
        textPropsContainer.style.display = 'none';
    }

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
    propCondType.value = cond.type || 'none';

    if (cond.type === 'variable') {
        condVarGroup.style.display = 'flex';
        condInvGroup.style.display = 'none';
        if (cond.varId) propCondVar.value = cond.varId;
        propCondOp.value = cond.op || '==';
        propCondVal.value = cond.targetVal !== undefined ? cond.targetVal : '';
    } else if (cond.type === 'inventory') {
        condVarGroup.style.display = 'none';
        condInvGroup.style.display = 'flex';
        if (cond.itemId) propCondItem.value = cond.itemId;
        propCondItemState.value = cond.itemState || 'has';
    } else {
        condVarGroup.style.display = 'none';
        condInvGroup.style.display = 'none';
    }

    const setVar = elem.setVariable || { varId: '', value: '' };
    if (propSetVar) propSetVar.value = setVar.varId || '';
    if (propSetVal) propSetVal.value = setVar.value !== undefined ? setVar.value : '';

    propTargetScene.innerHTML = '<option value="">Sin cambio de zona</option>';
    Object.keys(projectData.scenes).forEach(sId => {
        const option = document.createElement('option');
        option.value = sId;
        option.textContent = projectData.scenes[sId].name;
        if (elem.targetScene === sId) option.selected = true;
        propTargetScene.appendChild(option);
    });

    interactiveProps.style.display = elem.type === 'entidad' ? 'flex' : 'none';

    if (elem.type === 'entidad') {
        let triggerContainer = document.getElementById('trigger-props-container');
        if (!triggerContainer) {
            triggerContainer = document.createElement('div');
            triggerContainer.id = 'trigger-props-container';
            triggerContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
            interactiveProps.insertBefore(triggerContainer, interactiveProps.firstChild);
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
            <!-- SISTEMA DE RECOLECCIÓN Y TRANSFORMACIÓN -->
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
            <!-- PANEL DE SELECCIÓN DE COORDENADAS DESTINO -->
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
                <button class="btn" id="btn-open-teleport-picker" type="button" style="font-size: 10px; padding: 4px; background: var(--accent-blue); color: white; border: none; margin-top: 2px;">
                    Seleccionar en Mapa
                </button>
            </div>
        `;

        // Lógica del Picker en cuadrícula para selección de Elementos Guardados (savedElementsConfig)
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

            // Opción por defecto (Sin transformación)
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
                autoSaveJSON();
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
                    autoSaveJSON();
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
                autoSaveJSON();
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
                        autoSaveJSON();
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
                autoSaveJSON();
            });
        }
        if (inputTargetY) {
            inputTargetY.addEventListener('change', () => {
                elem.targetY = inputTargetY.value !== '' ? parseInt(inputTargetY.value, 10) : undefined;
                autoSaveJSON();
            });
        }

        document.getElementById('prop-trigger-type').addEventListener('change', (e) => {
            elem.triggerType = e.target.value;
            const distGroup = document.getElementById('group-interaction-distance');
            if (distGroup) {
                distGroup.style.display = elem.triggerType !== 'click_distance' ? 'flex' : 'none';
            }
            autoSaveJSON();
        });

        document.getElementById('prop-interaction-distance').addEventListener('input', (e) => {
            elem.interactionDistance = parseInt(e.target.value, 10) || 100;
            autoSaveJSON();
        });

        renderItemMultiSelectGrid('grid-add-items', elem, 'addItem');
        renderItemMultiSelectGrid('grid-remove-items', elem, 'removeItem');
    }
}

function openTeleportMapModal(targetSceneId, onSelectCallback) {
    let modal = document.getElementById('teleport-picker-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'teleport-picker-modal';
        modal.style.cssText = `
            position: fixed; inset: 0; z-index: 99999;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'flex';

    const targetScene = projectData.scenes[targetSceneId];
    const dim = getStageDimensions();

    modal.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; max-width: 90vw; max-height: 90vh; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px; align-items: center;">
                <span style="font-weight: 600; font-size: 13px;">Haz clic en el lugar exacto de teletransporte (${targetScene.name}):</span>
                <button id="close-teleport-modal" style="background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
            </div>
            <div id="teleport-mini-stage" style="position: relative; width: 640px; height: 360px; background: #eee; border: 2px solid var(--accent-blue); overflow: hidden; cursor: crosshair; border-radius: 8px;"></div>
            <div style="font-size: 10px; color: var(--text-secondary); margin-top: 8px;">
                Clica sobre el mapa para fijar la posición inicial del jugador al ser teletransportado.
            </div>
        </div>
    `;

    document.getElementById('close-teleport-modal').onclick = () => {
        modal.style.display = 'none';
    };

    const miniStage = document.getElementById('teleport-mini-stage');
    miniStage.innerHTML = '';

    if (targetScene && targetScene.elements) {
        const scaleX = 640 / dim.width;
        const scaleY = 360 / dim.height;

        targetScene.elements.forEach(elData => {
            if (elData.isText) return;
            const elImg = document.createElement('img');
            const asset = assetsMap[elData.image];
            elImg.src = asset ? asset.url : elData.image;
            elImg.style.cssText = `
                position: absolute;
                left: ${elData.x * scaleX}px;
                top: ${elData.y * scaleY}px;
                width: ${elData.width * scaleX}px;
                height: ${elData.height * scaleY}px;
                pointer-events: none;
                object-fit: fill;
            `;
            miniStage.appendChild(elImg);
        });
    }

    miniStage.onclick = (e) => {
        const rect = miniStage.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const realX = Math.round((clickX / rect.width) * dim.width);
        const realY = Math.round((clickY / rect.height) * dim.height);

        if (onSelectCallback) onSelectCallback(realX, realY);
        modal.style.display = 'none';
    };
}

function renderItemMultiSelectGrid(containerId, element, propertyKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const itemsConfig = projectData.itemsConfig || {};
    const itemIds = Object.keys(itemsConfig);

    if (itemIds.length === 0) {
        container.innerHTML = '<span style="font-size:10px; color:var(--text-secondary); grid-column:span 3; text-align:center; padding:10px;">No hay ítems en Inventario</span>';
        return;
    }

    let currentSelected = [];
    if (Array.isArray(element[propertyKey])) {
        currentSelected = element[propertyKey];
    } else if (typeof element[propertyKey] === 'string' && element[propertyKey].trim() !== '') {
        currentSelected = element[propertyKey].split(',').map(s => s.trim());
    }

    itemIds.forEach(itemId => {
        const item = itemsConfig[itemId];
        const isSelected = currentSelected.includes(itemId);

        const card = document.createElement('div');
        card.className = `multi-select-card ${isSelected ? 'selected' : ''}`;

        const asset = assetsMap[item.imageAsset];
        const imgSrc = asset ? asset.url : '';

        card.innerHTML = `
            ${imgSrc ? `<img src="${imgSrc}" alt="${item.name}">` : `<div style="width:28px;height:28px;background:#ddd;border-radius:4px;"></div>`}
            <span title="${item.name}">${item.name}</span>
            <div class="check-badge">✓</div>
        `;

        card.addEventListener('click', () => {
            let updatedList = [...currentSelected];
            if (updatedList.includes(itemId)) {
                updatedList = updatedList.filter(id => id !== itemId);
            } else {
                updatedList.push(itemId);
            }
            element[propertyKey] = updatedList;
            autoSaveJSON();
            renderItemMultiSelectGrid(containerId, element, propertyKey);
        });

        container.appendChild(card);
    });
}

function getSelectedElement() {
    const scene = projectData.scenes[currentSceneId];
    return scene ? scene.elements.find(e => e.id === selectedElementId) : null;
}

function editSceneName(sId) {
    const scene = projectData.scenes[sId];
    if (!scene) return;
    const newName = prompt("Editar nombre de la zona:", scene.name);
    if (newName && newName.trim() !== '') {
        scene.name = newName.trim();
        renderSceneTabs();
        updatePropertiesPanel();
        autoSaveJSON();
    }
}

function deleteScene(sId) {
    const sceneKeys = Object.keys(projectData.scenes);
    if (sceneKeys.length <= 1) {
        alert("No puedes borrar la única zona disponible del juego.");
        return;
    }

    const scene = projectData.scenes[sId];
    if (confirm(`¿Estás seguro de borrar la zona "${scene.name}"?`)) {
        delete projectData.scenes[sId];
        if (currentSceneId === sId) {
            currentSceneId = Object.keys(projectData.scenes)[0];
            selectedElementId = null;
        }
        if (projectData.startScene === sId) {
            projectData.startScene = Object.keys(projectData.scenes)[0];
        }
        renderSceneTabs();
        renderStage();
        autoSaveJSON();
    }
}

function renderSceneTabs() {
    const sceneTabsContainer = document.getElementById('scene-tabs-container');
    const selectStartScene = document.getElementById('select-start-scene');
    const selectAspectRatio = document.getElementById('select-aspect-ratio');
    const customDimContainer = document.getElementById('custom-dim-container');
    const inputCustomWidth = document.getElementById('input-custom-width');
    const inputCustomHeight = document.getElementById('input-custom-height');

    if (!sceneTabsContainer) return;
    sceneTabsContainer.innerHTML = '';

    if (selectAspectRatio) {
        selectAspectRatio.innerHTML = `
            <option value="horizontal">Horizontal (960x540)</option>
            <option value="vertical">Vertical (540x960)</option>
            <option value="square">Cuadrado (720x720)</option>
            <option value="medium">Mediano (1920x1080 - Full HD)</option>
            <option value="large">Grande (1920x1920 - CUADRÓN)</option>
            <option value="giant">Gigante (7680x4320 - 8K)</option>
            <option value="immense">Inmenso (12000x8000)</option>
            <option value="extreme">Extremo (20000x20000 - World Map)</option>
            <option value="custom">-- Personalizado (Px) --</option>
        `;
        selectAspectRatio.value = projectData.aspectRatio || "horizontal";

        if (customDimContainer) {
            customDimContainer.style.display = projectData.aspectRatio === 'custom' ? 'flex' : 'none';
        }
        if (inputCustomWidth) inputCustomWidth.value = projectData.customWidth || 1920;
        if (inputCustomHeight) inputCustomHeight.value = projectData.customHeight || 1080;
    }

    if (selectStartScene) selectStartScene.innerHTML = '';

    if (!projectData.startScene && Object.keys(projectData.scenes).length > 0) {
        projectData.startScene = Object.keys(projectData.scenes)[0];
    }

    Object.keys(projectData.scenes).forEach(sId => {
        const tab = document.createElement('div');
        tab.className = `scene-tab ${sId === currentSceneId ? 'active' : ''}`;

        const titleSpan = document.createElement('span');
        titleSpan.textContent = projectData.scenes[sId].name;
        tab.appendChild(titleSpan);

        const editBtn = document.createElement('button');
        editBtn.className = 'scene-action-btn';
        editBtn.title = "Editar nombre";
        editBtn.innerHTML = "✏️";
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editSceneName(sId);
        };
        tab.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'scene-action-btn delete';
        deleteBtn.title = "Eliminar zona";
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteScene(sId);
        };
        tab.appendChild(deleteBtn);

        tab.addEventListener('click', () => {
            currentSceneId = sId;
            selectedElementId = null;
            renderSceneTabs();
            renderStage();
        });

        tab.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            editSceneName(sId);
        });

        sceneTabsContainer.appendChild(tab);

        if (selectStartScene) {
            const option = document.createElement('option');
            option.value = sId;
            option.textContent = projectData.scenes[sId].name;
            if (projectData.startScene === sId) option.selected = true;
            selectStartScene.appendChild(option);
        }
    });
}