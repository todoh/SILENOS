// render-properties.js - PANEL LATERAL DE PROPIEDADES, DIMENSIONES Y CONFIGURACIÓN DE ACCIONES
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
    const btnDeleteElement = document.getElementById('btn-delete-element');

    const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
    let elem = null;
    let isSavedElement = false;

    if (selectedElementId) {
        elem = scene ? scene.elements.find(e => e.id === selectedElementId) : null;
        selectedSavedElementKey = null;
    } else if (typeof selectedSavedElementKey !== 'undefined' && selectedSavedElementKey && projectData.savedElementsConfig) {
        elem = projectData.savedElementsConfig[selectedSavedElementKey];
        isSavedElement = true;
    }

    if (!elem || isPlayMode) {
        if (propsContent) propsContent.style.display = 'none';
        if (propsEmptyMsg) {
            propsEmptyMsg.style.display = 'block';
            propsEmptyMsg.textContent = "Selecciona un elemento en el escenario o en 'Elementos' para ver sus propiedades.";
        }
        return;
    }

    if (propsEmptyMsg) propsEmptyMsg.style.display = 'none';
    if (propsContent) propsContent.style.display = 'flex';

    // Sección Especial: Nombre del Elemento Guardado
    let savedNameContainer = document.getElementById('saved-element-name-container');
    if (!savedNameContainer) {
        savedNameContainer = document.createElement('div');
        savedNameContainer.id = 'saved-element-name-container';
        savedNameContainer.className = 'form-group';
        propsContent.insertBefore(savedNameContainer, propsContent.firstChild);
    }

    if (isSavedElement) {
        savedNameContainer.style.display = 'flex';
        savedNameContainer.innerHTML = `
            <div style="font-size: 10px; font-weight: 700; color: #5856d6; background: rgba(88,86,214,0.1); padding: 4px 8px; border-radius: 4px; margin-bottom: 4px; text-align: center;">
                EDITANDO ELEMENTO GUARDADO
            </div>
            <label style="font-size:10px;">Nombre del Elemento:</label>
            <input type="text" id="prop-saved-name" value="${elem.savedName || ''}" style="padding: 4px; font-size: 11px;">
        `;
        document.getElementById('prop-saved-name').addEventListener('input', (e) => {
            elem.savedName = e.target.value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (typeof updateElementsUI === 'function') updateElementsUI();
        });
    } else {
        savedNameContainer.style.display = 'none';
    }

    // Sección Especial: Selector de Gráfico / Asset para Elementos
    let savedAssetContainer = document.getElementById('saved-element-asset-container');
    if (!savedAssetContainer) {
        savedAssetContainer = document.createElement('div');
        savedAssetContainer.id = 'saved-element-asset-container';
        savedAssetContainer.className = 'form-group';
        propsContent.insertBefore(savedAssetContainer, savedNameContainer.nextSibling);
    }

    if (!elem.isText) {
        savedAssetContainer.style.display = 'flex';
        const assetKeys = typeof assetsMap !== 'undefined' ? Object.keys(assetsMap) : [];
        const assetOpts = assetKeys.map(a => `<option value="${a}" ${elem.image === a ? 'selected' : ''}>${a}</option>`).join('');
        savedAssetContainer.innerHTML = `
            <label style="font-size:10px;">Imagen del Elemento (Asset):</label>
            <select id="prop-saved-asset-select" style="font-size: 11px; padding: 4px;">
                ${assetOpts || '<option value="">Sin assets cargados</option>'}
            </select>
        `;
        const selectAssetEl = document.getElementById('prop-saved-asset-select');
        if (selectAssetEl) {
            selectAssetEl.addEventListener('change', (e) => {
                elem.image = e.target.value;
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
                if (typeof updateElementsUI === 'function') updateElementsUI();
                if (!isSavedElement) renderStage();
            });
        }
    } else {
        savedAssetContainer.style.display = 'none';
    }

    // Dimensiones
    let dimPropsContainer = document.getElementById('dim-element-props');
    if (!dimPropsContainer) {
        dimPropsContainer = document.createElement('div');
        dimPropsContainer.id = 'dim-element-props';
        dimPropsContainer.className = 'form-group';
        propsContent.insertBefore(dimPropsContainer, savedAssetContainer.nextSibling);
    }

    dimPropsContainer.innerHTML = `
        <div class="row-group" style="display:flex; gap:6px;">
            <div class="form-group" style="flex:1;">
                <label style="font-size:9px;">Ancho (px):</label>
                <input type="number" id="prop-elem-w" value="${elem.width || 100}" min="10">
            </div>
            <div class="form-group" style="flex:1;">
                <label style="font-size:9px;">Alto (px):</label>
                <input type="number" id="prop-elem-h" value="${elem.height || 100}" min="10">
            </div>
        </div>
    `;

    document.getElementById('prop-elem-w').addEventListener('input', (e) => {
        elem.width = parseInt(e.target.value, 10) || 100;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
        if (typeof updateElementsUI === 'function') updateElementsUI();
        if (!isSavedElement) renderStage();
    });

    document.getElementById('prop-elem-h').addEventListener('input', (e) => {
        elem.height = parseInt(e.target.value, 10) || 100;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
        if (typeof updateElementsUI === 'function') updateElementsUI();
        if (!isSavedElement) renderStage();
    });

    // Botón de Recorte
    if (btnCropElement) {
        if (!elem.isText) {
            btnCropElement.style.display = 'block';
            btnCropElement.onclick = () => {
                if (!isSavedElement) {
                    activeCropElemId = elem.id;
                    renderStage();
                } else {
                    openInlineCropTool(elem);
                }
            };
        } else {
            btnCropElement.style.display = 'none';
        }
    }

    propType.value = elem.type || 'decoracion';
    propKeepAspect.checked = elem.keepAspect !== undefined ? elem.keepAspect : true;
    propDialog.value = elem.dialog || '';

    let physicsPropsContainer = document.getElementById('physics-element-props');
    if (!physicsPropsContainer) {
        physicsPropsContainer = document.createElement('div');
        physicsPropsContainer.id = 'physics-element-props';
        physicsPropsContainer.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 4px;';
        propsContent.insertBefore(physicsPropsContainer, dimPropsContainer.nextSibling);
    }

    const cW = elem.collisionW !== undefined ? elem.collisionW : elem.width || 100;
    const cH = elem.collisionH !== undefined ? elem.collisionH : elem.height || 100;
    const cX = elem.collisionX !== undefined ? elem.collisionX : Math.round(((elem.width || 100) - cW) / 2);
    const cY = elem.collisionY !== undefined ? elem.collisionY : ((elem.height || 100) - cH);
    elem.collisionW = cW;
    elem.collisionH = cH;
    elem.collisionX = cX;
    elem.collisionY = cY;

    const movePatternVal = elem.movePattern || 'static';
    const wanderRadiusVal = elem.wanderRadius || 150;
    const waypointsArr = elem.waypoints || [];
    const waypointLoopVal = elem.waypointLoop || 'loop';
    const billboardModeVal = elem.billboardMode || 'camera';
    const hasSkeletal = elem.hasSkeletalAnim || false;
    const skeletalClipVal = elem.skeletalClip || 'humanoid_idle';

    physicsPropsContainer.innerHTML = `
        <div class="sidebar-title">Propiedades de Física / Movimiento</div>
        ${!isSavedElement ? `
        <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="prop-is-player" ${elem.isPlayer ? 'checked' : ''}>
            <label for="prop-is-player" style="margin:0; font-weight:600; color:var(--accent-blue);">Es Personaje Jugador</label>
        </div>` : ''}
        <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
            <input type="checkbox" id="prop-has-collision" ${elem.hasCollision ? 'checked' : ''}>
            <label for="prop-has-collision" style="margin:0;">Activar Colisión Obstáculo</label>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(88,86,214,0.06); padding: 8px; border-radius: 8px; border: 1px solid rgba(88,86,214,0.2); margin-top: 4px;">
            <div style="font-size: 10px; font-weight: 600; color: #5856d6;">Animación Esquelética y Deformación 2D:</div>
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
                <input type="checkbox" id="prop-has-skeletal" ${hasSkeletal ? 'checked' : ''}>
                <label for="prop-has-skeletal" style="margin:0; font-weight:600;">Activar Esqueleto y Deformación</label>
            </div>
            <div id="group-skeletal-options" style="display: ${hasSkeletal ? 'flex' : 'none'}; flex-direction: column; gap: 6px; margin-top: 4px;">
                <div class="form-group">
                    <label style="font-size:10px;">Animación del Pool:</label>
                    <select id="prop-skeletal-clip">
                        <option value="humanoid_idle" ${skeletalClipVal === 'humanoid_idle' ? 'selected' : ''}>Humano - Quieto / Respiración</option>
                        <option value="humanoid_walk" ${skeletalClipVal === 'humanoid_walk' ? 'selected' : ''}>Humano - Andar</option>
                        <option value="humanoid_dance" ${skeletalClipVal === 'humanoid_dance' ? 'selected' : ''}>Humano - Bailar</option>
                        <option value="humanoid_fight" ${skeletalClipVal === 'humanoid_fight' ? 'selected' : ''}>Humano - Pelear / Guardia</option>
                        <option value="humanoid_grab" ${skeletalClipVal === 'humanoid_grab' ? 'selected' : ''}>Humano - Coger Objeto</option>
                        <option value="quadruped_walk" ${skeletalClipVal === 'quadruped_walk' ? 'selected' : ''}>Cuadrúpedo - Andar</option>
                    </select>
                </div>
                <button class="btn" id="btn-open-rig-editor" type="button" style="font-size: 10px; padding: 6px; background: #5856d6; color: white; border: none; font-weight: 600; margin-top: 2px;">
                    Editar Esqueleto y Nodos en Vivo
                </button>
            </div>
        </div>
        ${elem.type !== 'fondo' ? `
        <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(0,113,227,0.04); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,113,227,0.15); margin-top: 4px;">
            <div style="font-size: 10px; font-weight: 600; color: var(--accent-blue);">Visualización en 2.5D (Mode 7):</div>
            <div class="form-group">
                <label style="font-size:10px;">Modo de Billboard / Malla / Muro:</label>
                <select id="prop-billboard-mode">
                    <option value="camera" ${billboardModeVal === 'camera' ? 'selected' : ''}>Mirando a la cámara (Billboard)</option>
                    <option value="cross_x" ${billboardModeVal === 'cross_x' ? 'selected' : ''}>Planta en X (Cruz 90° Árboles/Farolas)</option>
                    <option value="fixed" ${billboardModeVal === 'fixed' ? 'selected' : ''}>Ángulo Fijo (Recto 90° al Suelo)</option>
                    <option value="flat" ${billboardModeVal === 'flat' || billboardModeVal === 'plano' ? 'selected' : ''}>Plano (Pegado al Suelo: Aguas, Charcos)</option>
                    <option value="muro" ${billboardModeVal === 'muro' || billboardModeVal === 'wall' ? 'selected' : ''}>Muro 3D / Cubo Texturizado</option>
                </select>
            </div>
            <div id="group-muro-properties" style="display: ${billboardModeVal === 'muro' || billboardModeVal === 'wall' ? 'flex' : 'none'}; flex-direction: column; gap: 6px; margin-top: 4px;">
                <div class="row-group" style="display:flex; gap:6px;">
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:9px;">Alto 3D (Muro):</label>
                        <input type="number" id="prop-wall-height" value="${elem.wallHeight !== undefined ? elem.wallHeight : elem.height}" min="1">
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label style="font-size:9px;">Grosor / Profundidad:</label>
                        <input type="number" id="prop-wall-depth" value="${elem.wallDepth !== undefined ? elem.wallDepth : elem.height}" min="1">
                    </div>
                </div>
            </div>
        </div>
        ` : ''}
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
                ${!isSavedElement ? `
                <button class="btn" id="btn-toggle-route-edit" type="button" style="font-size: 10px; padding: 6px; background: ${typeof isRouteEditingMode !== 'undefined' && isRouteEditingMode ? '#ff3b30' : '#0071e3'}; color: white; border: none; font-weight: 600;">
                    ${typeof isRouteEditingMode !== 'undefined' && isRouteEditingMode ? 'Terminar Edición de Ruta' : 'Añadir Puntos en Mapa Real'}
                </button>
                <div style="font-size: 9px; color: var(--text-secondary);">
                    ${typeof isRouteEditingMode !== 'undefined' && isRouteEditingMode ? 'Haz clic directamente sobre el escenario para añadir waypoints. Arrastra nodos para moverlos o clic secundario para borrar.' : `Puntos guardados: ${waypointsArr.length}`}
                </div>` : ''}
            </div>
        </div>
        ` : ''}
        <hr style="border: none; border-top: 1px solid var(--border-subtle);">
    `;

    document.getElementById('prop-has-skeletal').addEventListener('change', (e) => {
        elem.hasSkeletalAnim = e.target.checked;
        const groupSkel = document.getElementById('group-skeletal-options');
        if (groupSkel) groupSkel.style.display = elem.hasSkeletalAnim ? 'flex' : 'none';
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
        if (!isSavedElement) renderStage();
    });

    const selectSkeletalClip = document.getElementById('prop-skeletal-clip');
    if (selectSkeletalClip) {
        selectSkeletalClip.addEventListener('change', (e) => {
            elem.skeletalClip = e.target.value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (!isSavedElement) renderStage();
        });
    }

    const btnOpenRigEditor = document.getElementById('btn-open-rig-editor');
    if (btnOpenRigEditor) {
        btnOpenRigEditor.onclick = () => {
            if (typeof skeletalAnimationEngine !== 'undefined') {
                skeletalAnimationEngine.openRigEditorModal(elem);
            }
        };
    }

    const selectBillboardMode = document.getElementById('prop-billboard-mode');
    if (selectBillboardMode) {
        selectBillboardMode.addEventListener('change', (e) => {
            elem.billboardMode = e.target.value;
            const groupMuro = document.getElementById('group-muro-properties');
            if (groupMuro) {
                groupMuro.style.display = (elem.billboardMode === 'muro' || elem.billboardMode === 'wall') ? 'flex' : 'none';
            }
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (!isSavedElement) renderStage();
        });
    }

    const inputWallHeight = document.getElementById('prop-wall-height');
    const inputWallDepth = document.getElementById('prop-wall-depth');
    if (inputWallHeight) {
        inputWallHeight.addEventListener('input', (e) => {
            elem.wallHeight = parseInt(e.target.value, 10) || elem.height;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (!isSavedElement) renderStage();
        });
    }
    if (inputWallDepth) {
        inputWallDepth.addEventListener('input', (e) => {
            elem.wallDepth = parseInt(e.target.value, 10) || elem.height;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (!isSavedElement) renderStage();
        });
    }

    const chkPlayer = document.getElementById('prop-is-player');
    if (chkPlayer) {
        chkPlayer.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            if (isChecked && projectData && projectData.scenes) {
                Object.values(projectData.scenes).forEach(sc => {
                    if (sc.elements) {
                        sc.elements.forEach(el => el.isPlayer = false);
                    }
                });
            }
            elem.isPlayer = isChecked;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (!isSavedElement) renderStage();
            updatePropertiesPanel();
        });
    }

    document.getElementById('prop-has-collision').addEventListener('change', (e) => {
        elem.hasCollision = e.target.checked;
        if (elem.hasCollision) {
            if (elem.collisionW === undefined) elem.collisionW = elem.width;
            if (elem.collisionH === undefined) elem.collisionH = elem.height;
            if (elem.collisionX === undefined) elem.collisionX = Math.round((elem.width - elem.collisionW) / 2);
            if (elem.collisionY === undefined) elem.collisionY = elem.height - elem.collisionH;
        }
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
        if (!isSavedElement) renderStage();
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
                if (typeof isRouteEditingMode !== 'undefined') isRouteEditingMode = false;
                if (groupWanderRadius) groupWanderRadius.style.display = elem.movePattern === 'random' ? 'flex' : 'none';
                if (groupWaypointsEditor) groupWaypointsEditor.style.display = elem.movePattern === 'waypoints' ? 'flex' : 'none';
                if (elem.movePattern === 'random') {
                    elem.originX = elem.x;
                    elem.originY = elem.y;
                }
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
                if (!isSavedElement) renderStage();
            });
        }

        if (inputWanderRadius) {
            inputWanderRadius.addEventListener('input', (e) => {
                elem.wanderRadius = parseInt(e.target.value, 10) || 150;
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
        }

        if (selectWaypointLoop) {
            selectWaypointLoop.addEventListener('change', (e) => {
                elem.waypointLoop = e.target.value;
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
                if (!isSavedElement) renderStage();
            });
        }

        if (btnToggleRouteEdit) {
            btnToggleRouteEdit.onclick = () => {
                if (typeof isRouteEditingMode !== 'undefined') {
                    isRouteEditingMode = !isRouteEditingMode;
                }
                if (!isSavedElement) renderStage();
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
        elem.collisionW = Math.max(1, parseInt(colWInput.value, 10) || elem.width || 100);
        elem.collisionH = Math.max(1, parseInt(colHInput.value, 10) || elem.height || 100);
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
        if (!isSavedElement) renderStage();
    };

    if (colXInput) colXInput.addEventListener('input', updateCollisionValues);
    if (colYInput) colYInput.addEventListener('input', updateCollisionValues);
    if (colWInput) colWInput.addEventListener('input', updateCollisionValues);
    if (colHInput) colHInput.addEventListener('input', updateCollisionValues);

    // Propiedades de Texto
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
            if (!isSavedElement) {
                const el = document.getElementById(`stage-el-${elem.id}`);
                if (el) {
                    el.textContent = elem.textContent || '';
                    el.style.fontSize = (elem.fontSize || 24) + 'px';
                    el.style.fontFamily = elem.fontFamily || 'Arial, sans-serif';
                    el.style.color = elem.textColor || '#1d1d1f';
                    const outline = elem.textOutline ? `-1px -1px 0 ${elem.textOutlineColor || '#000'}, 1px -1px 0 ${elem.textOutlineColor || '#000'}, -1px 1px 0 ${elem.textOutlineColor || '#000'}, 1px 1px 0 ${elem.textOutlineColor || '#000'}` : '';
                    const shadow = elem.textShadow ? `0px 4px 8px ${elem.textShadowColor || 'rgba(0,0,0,0.5)'}` : '';
                    const glow = elem.textGlow ? `0px 0px 12px ${elem.textGlowColor || '#0071e3'}` : '';
                    const textEffects = [outline, shadow, glow].filter(Boolean).join(', ');
                    el.style.textShadow = textEffects || 'none';
                }
            }
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (typeof updateElementsUI === 'function') updateElementsUI();
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
    if (projectData.scenes) {
        Object.keys(projectData.scenes).forEach(sId => {
            const option = document.createElement('option');
            option.value = sId;
            option.textContent = projectData.scenes[sId].name;
            if (elem.targetScene === sId) option.selected = true;
            propTargetScene.appendChild(option);
        });
    }

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

        renderItemMultiSelectGrid('grid-add-items', elem, 'addItem');
        renderItemMultiSelectGrid('grid-remove-items', elem, 'removeItem');
    }

    // Botón Eliminar
    if (btnDeleteElement) {
        btnDeleteElement.textContent = isSavedElement ? "Eliminar Elemento Guardado" : "Eliminar Elemento";
        btnDeleteElement.onclick = () => {
            if (isSavedElement) {
                if (confirm(`¿Borrar el elemento guardado "${elem.savedName || selectedSavedElementKey}"?`)) {
                    delete projectData.savedElementsConfig[selectedSavedElementKey];
                    selectedSavedElementKey = null;
                    if (typeof autoSaveJSON === 'function') autoSaveJSON();
                    if (typeof updateElementsUI === 'function') updateElementsUI();
                    updatePropertiesPanel();
                }
            } else {
                if (scene && scene.elements && selectedElementId) {
                    scene.elements = scene.elements.filter(e => e.id !== selectedElementId);
                    selectedElementId = null;
                    renderStage();
                    if (typeof autoSaveJSON === 'function') autoSaveJSON();
                    updatePropertiesPanel();
                }
            }
        };
    }
}