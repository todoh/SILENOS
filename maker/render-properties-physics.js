// render-properties-physics.js - PROPIEDADES DE FÍSICA, COLISIONES Y MOVIMIENTO
function renderPhysicsPropertiesSection(propsContent, dimPropsContainer, elem, isSavedElement) {
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
    const wallHeightVal = elem.wallHeight !== undefined ? elem.wallHeight : 100;
    elem.wallHeight = wallHeightVal;
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
                <div class="form-group">
                    <label style="font-size:10px; font-weight:600; color:var(--accent-blue);">Altura 3D del Muro (Proyección px):</label>
                    <input type="number" id="prop-wall-height" value="${wallHeightVal}" min="1">
                    <span style="font-size: 8px; color: var(--text-secondary);">* Ancho y Profundidad del cubo se controlan con el tamaño 2D de la imagen en el mapa.</span>
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
            if (elem.billboardMode === 'muro' || elem.billboardMode === 'wall') {
                if (elem.wallHeight === undefined) elem.wallHeight = 100;
            }
            const groupMuro = document.getElementById('group-muro-properties');
            if (groupMuro) {
                groupMuro.style.display = (elem.billboardMode === 'muro' || elem.billboardMode === 'wall') ? 'flex' : 'none';
            }
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (!isSavedElement) renderStage();
        });
    }

    const inputWallHeight = document.getElementById('prop-wall-height');
    if (inputWallHeight) {
        inputWallHeight.addEventListener('input', (e) => {
            elem.wallHeight = parseInt(e.target.value, 10) || 100;
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
}