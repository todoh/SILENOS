 
 
function updatePropertiesPanel() {
    const panel = document.getElementById('properties-panel');
    const emptyMsg = document.getElementById('props-empty-msg');
    const propsContent = document.getElementById('props-content');

    if (!panel || !emptyMsg || !propsContent) return;

    // 1. Obtención del elemento activo (del canvas o de la biblioteca de elementos guardados)
    let activeElem = null;
    let isSavedElement = false;

    if (typeof selectedElementId !== 'undefined' && selectedElementId && projectData.scenes && projectData.scenes[currentSceneId]) {
        activeElem = projectData.scenes[currentSceneId].elements.find(e => e.id === selectedElementId);
    } else if (typeof selectedSavedElementKey !== 'undefined' && selectedSavedElementKey && projectData.savedElementsConfig) {
        activeElem = projectData.savedElementsConfig[selectedSavedElementKey];
        isSavedElement = true;
    }

    // 2. Si no hay nada seleccionado, mostrar estado vacío
    if (!activeElem) {
        emptyMsg.style.display = 'block';
        propsContent.style.display = 'none';
        propsContent.innerHTML = '';
        return;
    }

    emptyMsg.style.display = 'none';
    propsContent.style.display = 'flex';
    propsContent.style.flexDirection = 'column';
    propsContent.style.gap = '12px';
    propsContent.innerHTML = '';

    // Estilos de Scaffolding visual para ordenar todas las secciones del panel derecho
    if (!document.getElementById('properties-panel-custom-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'properties-panel-custom-styles';
        styleEl.textContent = `
            .prop-section-card {
                background: rgba(0, 0, 0, 0.03);
                border: 1px solid var(--border-subtle, #e5e5ea);
                border-radius: 8px;
                padding: 10px;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .prop-section-title {
                font-size: 11px;
                font-weight: 700;
                color: var(--accent-blue, #0071e3);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 2px;
            }
            .prop-grid-2 {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            .prop-code-textarea {
                font-family: monospace;
                font-size: 10.5px;
                background: #1e1e1e;
                color: #30d158;
                border: 1px solid #333;
                border-radius: 6px;
                padding: 6px;
                resize: vertical;
                width: 100%;
                box-sizing: border-box;
            }
            .prop-badge {
                font-size: 9px;
                background: #eee;
                color: #555;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: 600;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 1: TRANSFORMACIÓN, IMAGEN Y CAPA
    // -------------------------------------------------------------------------
    const sectionTransform = document.createElement('div');
    sectionTransform.className = 'prop-section-card';
    sectionTransform.innerHTML = `
        <div class="prop-section-title">
            <span> Transformación & Imagen</span>
            <span class="prop-badge">${isSavedElement ? 'Elemento Base' : 'Instancia Escena'}</span>
        </div>
        <div class="form-group">
            <label style="font-size: 10px;">Nombre / Identificador:</label>
            <input type="text" id="prop-elem-name" value="${activeElem.savedName || activeElem.id || ''}" style="font-size: 11px; padding: 4px;">
        </div>
        <div class="form-group">
            <label style="font-size: 10px;">Tipo de Capa:</label>
            <select id="prop-layer-type" style="font-size: 11px; padding: 4px;">
                <option value="fondo" ${activeElem.type === 'fondo' ? 'selected' : ''}>Fondo / Suelo</option>
                <option value="decoracion" ${activeElem.type === 'decoracion' ? 'selected' : ''}>Decoración Pasiva</option>
                <option value="entidad" ${activeElem.type === 'entidad' ? 'selected' : ''}>Entidad Interactiva</option>
            </select>
        </div>
        ${!activeElem.isText ? `
        <div class="form-group">
            <label style="font-size: 10px;">Cambiar Imagen (Asset):</label>
            <select id="prop-image-select" style="font-size: 11px; padding: 4px; font-weight: 600; color: var(--accent-blue);">
                <option value="">-- Seleccionar Asset --</option>
            </select>
        </div>
        ` : ''}
        ${!isSavedElement ? `
        <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px; background: rgba(0,113,227,0.06); padding: 6px; border-radius: 6px; border: 1px solid rgba(0,113,227,0.2);">
            <input type="checkbox" id="prop-is-player" ${activeElem.isPlayer ? 'checked' : ''} style="width: auto; cursor: pointer;">
            <label for="prop-is-player" style="margin: 0; cursor: pointer; font-size: 10.5px; font-weight: 700; color: var(--accent-blue);">¿Es el Personaje Jugador (Player)?</label>
        </div>
        ` : ''}
        <div class="prop-grid-2">
            <div class="form-group">
                <label style="font-size: 9px;">Ancho (px):</label>
                <input type="number" id="prop-width" value="${activeElem.width || 100}" style="font-size: 10px; padding: 4px;">
            </div>
            <div class="form-group">
                <label style="font-size: 9px;">Alto (px):</label>
                <input type="number" id="prop-height" value="${activeElem.height || 100}" style="font-size: 10px; padding: 4px;">
            </div>
        </div>
        <div class="prop-grid-2">
            <div class="form-group">
                <label style="font-size: 9px;">Posición X (px):</label>
                <input type="number" id="prop-pos-x" value="${Math.round(activeElem.x || 0)}" ${isSavedElement ? 'disabled' : ''} style="font-size: 10px; padding: 4px;">
            </div>
            <div class="form-group">
                <label style="font-size: 9px;">Posición Y (px):</label>
                <input type="number" id="prop-pos-y" value="${Math.round(activeElem.y || 0)}" ${isSavedElement ? 'disabled' : ''} style="font-size: 10px; padding: 4px;">
            </div>
        </div>
        <div class="prop-grid-2">
            <div class="form-group">
                <label style="font-size: 9px;">Rotación (°):</label>
                <input type="number" id="prop-rotation" value="${activeElem.rotation || 0}" style="font-size: 10px; padding: 4px;">
            </div>
            <div class="form-group">
                <label style="font-size: 9px;">Opacidad (0 - 1):</label>
                <input type="number" id="prop-opacity" min="0" max="1" step="0.1" value="${activeElem.opacity !== undefined ? activeElem.opacity : 1}" style="font-size: 10px; padding: 4px;">
            </div>
        </div>
        <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px; margin-top: 2px;">
            <input type="checkbox" id="prop-keep-aspect" ${activeElem.keepAspect ? 'checked' : ''} style="width: auto; cursor: pointer;">
            <label for="prop-keep-aspect" style="margin: 0; cursor: pointer; font-size: 10px;">Mantener Aspect Ratio</label>
        </div>
    `;
    propsContent.appendChild(sectionTransform);

    // Poblar selector de imágenes (Assets cargados)
    const selectImg = sectionTransform.querySelector('#prop-image-select');
    if (selectImg && typeof assetsMap !== 'undefined') {
        Object.keys(assetsMap).forEach(assetKey => {
            const opt = document.createElement('option');
            opt.value = assetKey;
            opt.textContent = assetKey;
            if (activeElem.image === assetKey) opt.selected = true;
            selectImg.appendChild(opt);
        });
        selectImg.addEventListener('change', (e) => {
            activeElem.image = e.target.value;
            if (typeof renderStage === 'function') renderStage();
            if (typeof updateElementsUI === 'function') updateElementsUI();
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });
    }

    // Eventos de Transformación y Jugador
    sectionTransform.querySelector('#prop-elem-name').addEventListener('input', (e) => {
        if (isSavedElement) activeElem.savedName = e.target.value;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionTransform.querySelector('#prop-layer-type').addEventListener('change', (e) => {
        activeElem.type = e.target.value;
        if (typeof renderStage === 'function') renderStage();
        if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    if (!isSavedElement) {
        const chkPlayer = sectionTransform.querySelector('#prop-is-player');
        if (chkPlayer) {
            chkPlayer.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked && projectData.scenes && projectData.scenes[currentSceneId]) {
                    projectData.scenes[currentSceneId].elements.forEach(el => {
                        if (el.id !== activeElem.id) el.isPlayer = false;
                    });
                }
                activeElem.isPlayer = isChecked;
                if (typeof renderStage === 'function') renderStage();
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
        }
    }
    sectionTransform.querySelector('#prop-width').addEventListener('change', (e) => {
        activeElem.width = Math.max(1, parseInt(e.target.value, 10) || 100);
        if (typeof renderStage === 'function') renderStage();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionTransform.querySelector('#prop-height').addEventListener('change', (e) => {
        activeElem.height = Math.max(1, parseInt(e.target.value, 10) || 100);
        if (typeof renderStage === 'function') renderStage();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    if (!isSavedElement) {
        sectionTransform.querySelector('#prop-pos-x').addEventListener('change', (e) => {
            activeElem.x = parseInt(e.target.value, 10) || 0;
            if (typeof renderStage === 'function') renderStage();
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });
        sectionTransform.querySelector('#prop-pos-y').addEventListener('change', (e) => {
            activeElem.y = parseInt(e.target.value, 10) || 0;
            if (typeof renderStage === 'function') renderStage();
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });
    }
    sectionTransform.querySelector('#prop-rotation').addEventListener('change', (e) => {
        activeElem.rotation = parseInt(e.target.value, 10) || 0;
        if (typeof renderStage === 'function') renderStage();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionTransform.querySelector('#prop-opacity').addEventListener('change', (e) => {
        activeElem.opacity = Math.max(0, Math.min(1, parseFloat(e.target.value) || 1));
        if (typeof renderStage === 'function') renderStage();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionTransform.querySelector('#prop-keep-aspect').addEventListener('change', (e) => {
        activeElem.keepAspect = e.target.checked;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });

    // -------------------------------------------------------------------------
    // SECCIÓN 2: PLANO VISUAL Y COLISIONES (Modo 7 y Físicas)
    // -------------------------------------------------------------------------
    const sectionPhysics = document.createElement('div');
    sectionPhysics.className = 'prop-section-card';
    sectionPhysics.innerHTML = `
        <div class="prop-section-title">
            <span> Plano 2.5D & Colisión Base</span>
        </div>
        <div class="form-group">
            <label style="font-size: 10px;">Proyección Visual (billboardMode):</label>
            <select id="prop-billboard-mode" style="font-size: 11px; padding: 4px;">
                <option value="fixed" ${activeElem.billboardMode === 'fixed' ? 'selected' : ''}>Plano Fijo 90° (Estructuras / Muebles)</option>
                <option value="camera" ${activeElem.billboardMode === 'camera' ? 'selected' : ''}>Orientado a Cámara (Billboard Personajes)</option>
                <option value="cross_x" ${activeElem.billboardMode === 'cross_x' ? 'selected' : ''}>Proyección en Cruz X (Árboles / Farolas)</option>
                <option value="flat" ${activeElem.billboardMode === 'flat' || activeElem.billboardMode === 'suelo' ? 'selected' : ''}>Suelo / Terreno (Flat)</option>
                <option value="muro" ${activeElem.billboardMode === 'muro' ? 'selected' : ''}>Muro 3D / Bloque Tridimensional</option>
            </select>
        </div>
        <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px;">
            <input type="checkbox" id="prop-has-collision" ${activeElem.hasCollision !== false ? 'checked' : ''} style="width: auto; cursor: pointer;">
            <label for="prop-has-collision" style="margin: 0; cursor: pointer; font-size: 10px; font-weight: 600;">Activar Caja de Colisión Física</label>
        </div>
        <div id="collision-box-settings" style="display: ${activeElem.hasCollision !== false ? 'flex' : 'none'}; flex-direction: column; gap: 6px; background: rgba(0,0,0,0.02); padding: 6px; border-radius: 6px;">
            <div class="prop-grid-2">
                <div class="form-group">
                    <label style="font-size: 8.5px;">Offset X Colisión:</label>
                    <input type="number" id="prop-col-x" value="${activeElem.collisionX || 0}" style="font-size: 10px; padding: 2px 4px;">
                </div>
                <div class="form-group">
                    <label style="font-size: 8.5px;">Offset Y Colisión:</label>
                    <input type="number" id="prop-col-y" value="${activeElem.collisionY || 0}" style="font-size: 10px; padding: 2px 4px;">
                </div>
            </div>
            <div class="prop-grid-2">
                <div class="form-group">
                    <label style="font-size: 8.5px;">Ancho Colisión (W):</label>
                    <input type="number" id="prop-col-w" value="${activeElem.collisionW !== undefined ? activeElem.collisionW : (activeElem.width || 100)}" style="font-size: 10px; padding: 2px 4px;">
                </div>
                <div class="form-group">
                    <label style="font-size: 8.5px;">Alto Colisión (H):</label>
                    <input type="number" id="prop-col-h" value="${activeElem.collisionH !== undefined ? activeElem.collisionH : (activeElem.height || 100)}" style="font-size: 10px; padding: 2px 4px;">
                </div>
            </div>
        </div>
    `;
    propsContent.appendChild(sectionPhysics);

    const chkCol = sectionPhysics.querySelector('#prop-has-collision');
    const boxCol = sectionPhysics.querySelector('#collision-box-settings');
    sectionPhysics.querySelector('#prop-billboard-mode').addEventListener('change', (e) => {
        activeElem.billboardMode = e.target.value;
        if (typeof renderStage === 'function') renderStage();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    chkCol.addEventListener('change', (e) => {
        activeElem.hasCollision = e.target.checked;
        boxCol.style.display = e.target.checked ? 'flex' : 'none';
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionPhysics.querySelector('#prop-col-x').addEventListener('change', (e) => {
        activeElem.collisionX = parseInt(e.target.value, 10) || 0;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionPhysics.querySelector('#prop-col-y').addEventListener('change', (e) => {
        activeElem.collisionY = parseInt(e.target.value, 10) || 0;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionPhysics.querySelector('#prop-col-w').addEventListener('change', (e) => {
        activeElem.collisionW = parseInt(e.target.value, 10) || 0;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionPhysics.querySelector('#prop-col-h').addEventListener('change', (e) => {
        activeElem.collisionH = parseInt(e.target.value, 10) || 0;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });

    // -------------------------------------------------------------------------
    // SECCIÓN 3: CONDICIÓN DE APARICIÓN EN MAPA
    // -------------------------------------------------------------------------
    const sectionCondition = document.createElement('div');
    sectionCondition.className = 'prop-section-card';
    const cond = activeElem.condition || { type: 'none' };
    sectionCondition.innerHTML = `
        <div class="prop-section-title">
            <span> Condición de Aparición</span>
        </div>
        <div class="form-group">
            <label style="font-size: 10px;">Verificar visibilidad con:</label>
            <select id="prop-cond-type" style="font-size: 11px; padding: 4px;">
                <option value="none" ${cond.type === 'none' ? 'selected' : ''}>Sin condición (Siempre Visible)</option>
                <option value="variable" ${cond.type === 'variable' ? 'selected' : ''}>Variable Global del Juego</option>
                <option value="inventory" ${cond.type === 'inventory' ? 'selected' : ''}>Ítem en Inventario</option>
            </select>
        </div>
        <div id="group-cond-var" style="display: ${cond.type === 'variable' ? 'flex' : 'none'}; flex-direction: column; gap: 6px;">
            <div class="form-group">
                <label style="font-size: 9px;">Variable Objetivo:</label>
                <select id="prop-cond-var-select" style="font-size: 10px; padding: 4px;"></select>
            </div>
            <div class="prop-grid-2">
                <div class="form-group">
                    <label style="font-size: 9px;">Operador:</label>
                    <select id="prop-cond-op" style="font-size: 10px; padding: 4px;">
                        <option value="==" ${cond.op === '==' ? 'selected' : ''}>== (Igual)</option>
                        <option value="!=" ${cond.op === '!=' ? 'selected' : ''}>!= (Diferente)</option>
                        <option value=">" ${cond.op === '>' ? 'selected' : ''}>&gt; (Mayor)</option>
                        <option value="<" ${cond.op === '<' ? 'selected' : ''}>&lt; (Menor)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="font-size: 9px;">Valor Esperado:</label>
                    <input type="text" id="prop-cond-val" value="${cond.targetVal !== undefined ? cond.targetVal : ''}" style="font-size: 10px; padding: 4px;">
                </div>
            </div>
        </div>
        <div id="group-cond-inv" style="display: ${cond.type === 'inventory' ? 'flex' : 'none'}; flex-direction: column; gap: 6px;">
            <div class="form-group">
                <label style="font-size: 9px;">Ítem Requerido:</label>
                <select id="prop-cond-item-select" style="font-size: 10px; padding: 4px;"></select>
            </div>
            <div class="form-group">
                <label style="font-size: 9px;">Estado del Ítem:</label>
                <select id="prop-cond-item-state" style="font-size: 10px; padding: 4px;">
                    <option value="has" ${cond.itemState === 'has' ? 'selected' : ''}>Posee el Ítem en Inventario</option>
                    <option value="not_has" ${cond.itemState === 'not_has' ? 'selected' : ''}>NO posee el Ítem</option>
                </select>
            </div>
        </div>
    `;
    propsContent.appendChild(sectionCondition);

    const selectCondVar = sectionCondition.querySelector('#prop-cond-var-select');
    const selectCondItem = sectionCondition.querySelector('#prop-cond-item-select');
    if (projectData.variablesConfig) {
        Object.keys(projectData.variablesConfig).forEach(vKey => {
            const opt = document.createElement('option');
            opt.value = vKey;
            opt.textContent = vKey;
            if (vKey === cond.varId) opt.selected = true;
            selectCondVar.appendChild(opt);
        });
    }
    if (projectData.itemsConfig) {
        Object.keys(projectData.itemsConfig).forEach(iKey => {
            const opt = document.createElement('option');
            opt.value = iKey;
            opt.textContent = projectData.itemsConfig[iKey].name || iKey;
            if (iKey === cond.itemId) opt.selected = true;
            selectCondItem.appendChild(opt);
        });
    }

    const selectCondType = sectionCondition.querySelector('#prop-cond-type');
    const groupCondVar = sectionCondition.querySelector('#group-cond-var');
    const groupCondInv = sectionCondition.querySelector('#group-cond-inv');

    selectCondType.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!activeElem.condition) activeElem.condition = {};
        activeElem.condition.type = val;
        groupCondVar.style.display = val === 'variable' ? 'flex' : 'none';
        groupCondInv.style.display = val === 'inventory' ? 'flex' : 'none';
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    selectCondVar.addEventListener('change', (e) => {
        if (!activeElem.condition) activeElem.condition = {};
        activeElem.condition.varId = e.target.value;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionCondition.querySelector('#prop-cond-op').addEventListener('change', (e) => {
        if (!activeElem.condition) activeElem.condition = {};
        activeElem.condition.op = e.target.value;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionCondition.querySelector('#prop-cond-val').addEventListener('input', (e) => {
        if (!activeElem.condition) activeElem.condition = {};
        activeElem.condition.targetVal = e.target.value;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    selectCondItem.addEventListener('change', (e) => {
        if (!activeElem.condition) activeElem.condition = {};
        activeElem.condition.itemId = e.target.value;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });
    sectionCondition.querySelector('#prop-cond-item-state').addEventListener('change', (e) => {
        if (!activeElem.condition) activeElem.condition = {};
        activeElem.condition.itemState = e.target.value;
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    });

    // -------------------------------------------------------------------------
    // SECCIÓN 4: INTERACCIÓN NARRATIVA Y CAMBIO DE ESCENA (Para Entidades)
    // -------------------------------------------------------------------------
    if (activeElem.type === 'entidad') {
        const sectionInteractive = document.createElement('div');
        sectionInteractive.className = 'prop-section-card';
        sectionInteractive.innerHTML = `
            <div class="prop-section-title">
                <span> Acciones & Diálogo</span>
            </div>
            <div class="form-group">
                <label style="font-size: 10px;">Texto de Diálogo al Activar:</label>
                <textarea id="prop-dialog" rows="3" placeholder="Mensaje expuesto al interactuar..." style="font-size: 11px; padding: 6px;">${activeElem.dialog || ''}</textarea>
            </div>
            <div class="form-group">
                <label style="font-size: 10px;">Teletransportar a Zona/Mapa:</label>
                <select id="prop-target-scene" style="font-size: 11px; padding: 4px;"></select>
            </div>
            <div class="form-group">
                <label style="font-size: 10px;">Modificar Variable al Interactuar:</label>
                <select id="prop-set-var-select" style="font-size: 11px; padding: 4px;"></select>
                <input type="text" id="prop-set-var-val" value="${activeElem.setVariable ? activeElem.setVariable.value : ''}" placeholder="Nuevo valor para la variable..." style="font-size: 10px; padding: 4px; margin-top: 4px;">
            </div>
        `;

        const selectTargetScene = sectionInteractive.querySelector('#prop-target-scene');
        selectTargetScene.innerHTML = '<option value="">-- Sin cambio de zona --</option>';
        if (projectData.scenes) {
            Object.keys(projectData.scenes).forEach(sId => {
                const opt = document.createElement('option');
                opt.value = sId;
                opt.textContent = `${projectData.scenes[sId].name || sId}`;
                if (sId === activeElem.targetScene) opt.selected = true;
                selectTargetScene.appendChild(opt);
            });
        }

        const selectSetVar = sectionInteractive.querySelector('#prop-set-var-select');
        selectSetVar.innerHTML = '<option value="">-- Sin modificación de variable --</option>';
        if (projectData.variablesConfig) {
            Object.keys(projectData.variablesConfig).forEach(vKey => {
                const opt = document.createElement('option');
                opt.value = vKey;
                opt.textContent = vKey;
                if (activeElem.setVariable && activeElem.setVariable.varId === vKey) opt.selected = true;
                selectSetVar.appendChild(opt);
            });
        }

        sectionInteractive.querySelector('#prop-dialog').addEventListener('input', (e) => {
            activeElem.dialog = e.target.value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });
        selectTargetScene.addEventListener('change', (e) => {
            activeElem.targetScene = e.target.value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });
        selectSetVar.addEventListener('change', (e) => {
            if (!activeElem.setVariable) activeElem.setVariable = { varId: '', value: '' };
            activeElem.setVariable.varId = e.target.value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });
        sectionInteractive.querySelector('#prop-set-var-val').addEventListener('input', (e) => {
            if (!activeElem.setVariable) activeElem.setVariable = { varId: '', value: '' };
            activeElem.setVariable.value = e.target.value;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        });

        propsContent.appendChild(sectionInteractive);
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 5: SCRIPTING JS Y CICLO DE VIDA (Sandbox de Programación)
    // -------------------------------------------------------------------------
    const sectionScripts = document.createElement('div');
    sectionScripts.className = 'prop-section-card';

    const scriptData = activeElem.customScript || {
        init: activeElem.scriptInit || '',
        update: activeElem.scriptUpdate || '',
        interact: activeElem.scriptInteract || '',
        destroy: activeElem.scriptDestroy || ''
    };

    sectionScripts.innerHTML = `
        <div class="prop-section-title">
            <span> Scripts del Elemento (JS)</span>
            <span class="prop-badge" style="background:#0071e3; color:#fff;">Live Engine</span>
        </div>
        
        <div class="form-group">
            <label style="font-size: 9.5px; font-weight:700;">onInit(self, scene, variables):</label>
            <textarea class="prop-code-textarea" id="script-editor-init" data-script-type="init" rows="2" placeholder="// Al cargar...">${scriptData.init || ''}</textarea>
        </div>

        <div class="form-group">
            <label style="font-size: 9.5px; font-weight:700;">onUpdate(self, dt):</label>
            <textarea class="prop-code-textarea" id="script-editor-update" data-script-type="update" rows="3" placeholder="// En cada frame...">${scriptData.update || ''}</textarea>
        </div>

        <div class="form-group">
            <label style="font-size: 9.5px; font-weight:700;">onInteract(self, player):</label>
            <textarea class="prop-code-textarea" id="script-editor-interact" data-script-type="interact" rows="3" placeholder="// Al hacer clic...">${scriptData.interact || ''}</textarea>
        </div>

        <div class="form-group">
            <label style="font-size: 9.5px; font-weight:700;">onDestroy(self):</label>
            <textarea class="prop-code-textarea" id="script-editor-destroy" data-script-type="destroy" rows="2" placeholder="// Al eliminar...">${scriptData.destroy || ''}</textarea>
        </div>
    `;

    propsContent.appendChild(sectionScripts);

    if (typeof elementScriptRuntime !== 'undefined' && elementScriptRuntime.syncTextareasWithMemory) {
        elementScriptRuntime.syncTextareasWithMemory();
    }

    // -------------------------------------------------------------------------
    // SECCIÓN 6: HERRAMIENTAS Y BOTONES DE ACCIÓN (Rigging, Recorte y Borrado)
    // -------------------------------------------------------------------------
    const sectionActions = document.createElement('div');
    sectionActions.style.cssText = 'margin-top: 4px; display: flex; flex-direction: column; gap: 6px;';

    const btnRig = document.createElement('button');
    btnRig.className = 'btn';
    btnRig.style.cssText = 'background: #5856d6; color: white; border: none; font-weight: 600; padding: 8px; width: 100%; cursor: pointer; border-radius: 6px;';
    btnRig.textContent = ' Editor Esquelético 2D / IK Rigging';
    btnRig.onclick = () => {
        if (typeof skeletalAnimationEngine !== 'undefined' && skeletalAnimationEngine.openRigEditorModal) {
            skeletalAnimationEngine.openRigEditorModal(activeElem);
        } else {
            alert('Motor de animación esquelética no cargado.');
        }
    };
    sectionActions.appendChild(btnRig);

    if (!activeElem.isText) {
        const btnCrop = document.createElement('button');
        btnCrop.className = 'btn';
        btnCrop.style.cssText = 'background: var(--accent-blue); color: white; border: none; font-weight: 600; padding: 8px; width: 100%; cursor: pointer; border-radius: 6px;';
        btnCrop.textContent = ' Recortar Espacios Vacíos de la Imagen';
        btnCrop.onclick = () => {
            if (typeof cropElementImage === 'function') {
                cropElementImage(activeElem);
            }
        };
        sectionActions.appendChild(btnCrop);
    }

    if (!isSavedElement) {
        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn';
        btnDelete.style.cssText = 'background: #ff3b30; color: white; border: none; font-weight: 600; padding: 8px; width: 100%; cursor: pointer; border-radius: 6px; margin-top: 4px;';
        btnDelete.textContent = ' Eliminar Elemento del Mapa';
        btnDelete.onclick = () => {
            if (typeof deleteSelectedElement === 'function') deleteSelectedElement();
        };
        sectionActions.appendChild(btnDelete);
    }

    propsContent.appendChild(sectionActions);
}

function injectScriptingPropertiesUI(elem) {
    const propsContent = document.getElementById('props-content');
    if (!propsContent) return;

    // Asegurar estructura del objeto customScript y compatibilidad legacy
    if (!elem.customScript) {
        elem.customScript = {
            init: elem.scriptInit || '',
            update: elem.scriptUpdate || '',
            interact: elem.scriptInteract || '',
            destroy: elem.scriptDestroy || ''
        };
    }

    let scriptSection = document.getElementById('scripting-properties-section');
    if (!scriptSection) {
        scriptSection = document.createElement('div');
        scriptSection.id = 'scripting-properties-section';
        scriptSection.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 8px; border-top: 1px solid var(--border-subtle); padding-top: 8px;';
        scriptSection.innerHTML = `
            <div class="sidebar-title" style="color: #0071e3; display: flex; align-items: center; gap: 6px;">
                <span>⚡ Scripting JS Contextual</span>
            </div>
            
            <div class="form-group">
                <label style="font-size: 9px; font-weight: 700;">onInit(self, scene, variables, input, audio, interface):</label>
                <textarea id="prop-script-init" rows="2" style="font-family: monospace; font-size: 10px; background: #1e1e1e; color: #a6e22e; padding: 6px; border-radius: 6px;" placeholder="// Ejecutado al cargar..."></textarea>
            </div>

            <div class="form-group">
                <label style="font-size: 9px; font-weight: 700;">onUpdate(self, scene, variables, input, audio, interface, dt):</label>
                <textarea id="prop-script-update" rows="3" style="font-family: monospace; font-size: 10px; background: #1e1e1e; color: #66d9ef; padding: 6px; border-radius: 6px;" placeholder="// Ejecutado en cada frame..."></textarea>
            </div>

            <div class="form-group">
                <label style="font-size: 9px; font-weight: 700;">onInteract(self, scene, variables, input, audio, interface, player):</label>
                <textarea id="prop-script-interact" rows="2" style="font-family: monospace; font-size: 10px; background: #1e1e1e; color: #fd971f; padding: 6px; border-radius: 6px;" placeholder="// Ejecutado al hacer clic..."></textarea>
            </div>

            <div class="form-group">
                <label style="font-size: 9px; font-weight: 700;">onDestroy(self, scene, variables):</label>
                <textarea id="prop-script-destroy" rows="2" style="font-family: monospace; font-size: 10px; background: #1e1e1e; color: #ff3b30; padding: 6px; border-radius: 6px;" placeholder="// Ejecutado al destruir..."></textarea>
            </div>

            <div class="sidebar-title" style="font-size: 10px; margin-top: 4px;">Snippets Rápidos:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <button type="button" class="btn" id="btn-snippet-float" style="font-size: 8px; padding: 3px;">🌊 Flotación Sinusoidal</button>
                <button type="button" class="btn" id="btn-snippet-pulse" style="font-size: 8px; padding: 3px;">💗 Pulsación Escala</button>
                <button type="button" class="btn" id="btn-snippet-dialog" style="font-size: 8px; padding: 3px;">💬 Diálogo Dinámico</button>
                <button type="button" class="btn" id="btn-snippet-rotate" style="font-size: 8px; padding: 3px;">🔄 Rotación Continua</button>
            </div>

            <div class="sidebar-title" style="font-size: 10px; margin-top: 6px; color: #ff3b30;">Consola de Depuración:</div>
            <div id="script-console-log" style="background: #1e1e24; color: #e6e6e6; font-family: monospace; font-size: 9px; padding: 6px; border-radius: 6px; height: 50px; overflow-y: auto; border: 1px solid var(--border-subtle);">
                <div style="color: #888;">System Ready. Sin errores.</div>
            </div>
        `;
        propsContent.appendChild(scriptSection);

        // Asignación de Snippets Rápidos
        document.getElementById('btn-snippet-float').onclick = () => {
            const txUpdate = document.getElementById('prop-script-update');
            if (txUpdate) {
                txUpdate.value = `self.state.t = (self.state.t || 0) + (dt || 0.016);\nself.y += Math.sin(self.state.t * 4) * 0.5;`;
                bindScriptPropertiesListeners();
            }
        };
        document.getElementById('btn-snippet-pulse').onclick = () => {
            const txUpdate = document.getElementById('prop-script-update');
            if (txUpdate) {
                txUpdate.value = `self.state.t = (self.state.t || 0) + (dt || 0.016);\nconst scale = 1 + Math.sin(self.state.t * 5) * 0.1;\nself.setSize(100 * scale, 100 * scale);`;
                bindScriptPropertiesListeners();
            }
        };
        document.getElementById('btn-snippet-dialog').onclick = () => {
            const txInteract = document.getElementById('prop-script-interact');
            if (txInteract) {
                txInteract.value = `interface.showDialog("¡Hola viajero! Tu posición actual es X:" + Math.round(self.x) + " Y:" + Math.round(self.y));`;
                bindScriptPropertiesListeners();
            }
        };
        document.getElementById('btn-snippet-rotate').onclick = () => {
            const txUpdate = document.getElementById('prop-script-update');
            if (txUpdate) {
                txUpdate.value = `self.rotation = (self.rotation + 45 * (dt || 0.016)) % 360;`;
                bindScriptPropertiesListeners();
            }
        };
    }

    // Cargar valores en las áreas de texto
    const initVal = elem.customScript.init || elem.scriptInit || '';
    const updateVal = elem.customScript.update || elem.scriptUpdate || '';
    const interactVal = elem.customScript.interact || elem.scriptInteract || '';
    const destroyVal = elem.customScript.destroy || elem.scriptDestroy || '';

    const txInit = document.getElementById('prop-script-init');
    const txUpdate = document.getElementById('prop-script-update');
    const txInteract = document.getElementById('prop-script-interact');
    const txDestroy = document.getElementById('prop-script-destroy');

    if (txInit) txInit.value = initVal;
    if (txUpdate) txUpdate.value = updateVal;
    if (txInteract) txInteract.value = interactVal;
    if (txDestroy) txDestroy.value = destroyVal;

    bindScriptPropertiesListeners();
}

// Función para vincular y guardar cambios en los scripts del elemento seleccionado
function bindScriptPropertiesListeners() {
    const scriptInitEl = document.getElementById('prop-script-init');
    const scriptUpdateEl = document.getElementById('prop-script-update');
    const scriptInteractEl = document.getElementById('prop-script-interact');
    const scriptDestroyEl = document.getElementById('prop-script-destroy');

    // Obtener el objeto destino (elemento en mapa o elemento guardado en biblioteca)
    let targetObj = null;
    if (typeof selectedElementId !== 'undefined' && selectedElementId && projectData.scenes && projectData.scenes[currentSceneId]) {
        targetObj = projectData.scenes[currentSceneId].elements.find(e => e.id === selectedElementId);
    } else if (typeof selectedSavedElementKey !== 'undefined' && selectedSavedElementKey && projectData.savedElementsConfig) {
        targetObj = projectData.savedElementsConfig[selectedSavedElementKey];
    }

    if (!targetObj) return;

    // Asegurar estructura del script personalizado
    if (!targetObj.customScript) {
        targetObj.customScript = { init: '', update: '', interact: '', destroy: '' };
    }

    const saveScripts = () => {
        if (scriptInitEl) targetObj.customScript.init = scriptInitEl.value;
        if (scriptUpdateEl) targetObj.customScript.update = scriptUpdateEl.value;
        if (scriptInteractEl) targetObj.customScript.interact = scriptInteractEl.value;
        if (scriptDestroyEl) targetObj.customScript.destroy = scriptDestroyEl.value;

        // Mantener compatibilidad con propiedades legacy
        targetObj.scriptInit = targetObj.customScript.init;
        targetObj.scriptUpdate = targetObj.customScript.update;
        targetObj.scriptInteract = targetObj.customScript.interact;
        targetObj.scriptDestroy = targetObj.customScript.destroy;

        if (typeof elementScriptRuntime !== 'undefined') {
            elementScriptRuntime.compileElementScripts(targetObj);
        }

        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    };

    [scriptInitEl, scriptUpdateEl, scriptInteractEl, scriptDestroyEl].forEach(input => {
        if (input) {
            input.oninput = saveScripts;
            input.onchange = saveScripts;
        }
    });
}