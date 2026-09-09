// render-properties.js - PANEL LATERAL DE PROPIEDADES, DIMENSIONES Y CONFIGURACIÓN DE ACCIONES
let currentEditingSceneId = null;

function getStageDimensions(sceneId = currentSceneId) {
    if (!projectData) return { width: 960, height: 540 };
    const scene = (projectData && projectData.scenes) ? projectData.scenes[sceneId || currentSceneId] : null;
    const ratio = (scene && scene.aspectRatio) ? scene.aspectRatio : (projectData.aspectRatio || "horizontal");
    if (ratio === "custom") {
        const w = (scene && scene.customWidth) ? parseInt(scene.customWidth, 10) : (projectData.customWidth || 1920);
        const h = (scene && scene.customHeight) ? parseInt(scene.customHeight, 10) : (projectData.customHeight || 1080);
        return {
            width: Math.max(100, w || 1920),
            height: Math.max(100, h || 1080)
        };
    }
    if (ratio === "vertical") return { width: 540, height: 960 };
    if (ratio === "square") return { width: 720, height: 720 };
    if (ratio === "horizontal") return { width: 960, height: 540 };
    if (ratio === "medium") return { width: 1920, height: 1080 };
    if (ratio === "large") return { width: 1920, height: 1920 };
    if (ratio === "giant") return { width: 7680, height: 4320 };
    if (ratio === "immense") return { width: 12000, height: 8000 };
    if (ratio === "extreme") return { width: 20000, height: 20000 };
    return { width: 960, height: 540 };
}

function openSceneEditModal(sId = null) {
    currentEditingSceneId = sId;
    const modal = document.getElementById('scene-edit-modal');
    const modalTitle = document.getElementById('scene-modal-title');
    const inputName = document.getElementById('modal-scene-name');
    const selectRatio = document.getElementById('modal-scene-aspect-ratio');
    const customContainer = document.getElementById('modal-scene-custom-dim');
    const inputWidth = document.getElementById('modal-scene-width');
    const inputHeight = document.getElementById('modal-scene-height');
    const btnSave = document.getElementById('btn-save-scene-modal');
    const btnCancel = document.getElementById('btn-cancel-scene-modal');
    const btnClose = document.getElementById('scene-modal-close');

    if (!modal) return;

    if (sId && projectData.scenes && projectData.scenes[sId]) {
        const scene = projectData.scenes[sId];
        if (modalTitle) modalTitle.textContent = `Editar Configuración: ${scene.name}`;
        if (inputName) inputName.value = scene.name || '';
        if (selectRatio) selectRatio.value = scene.aspectRatio || projectData.aspectRatio || 'horizontal';
        if (inputWidth) inputWidth.value = scene.customWidth || projectData.customWidth || 1920;
        if (inputHeight) inputHeight.value = scene.customHeight || projectData.customHeight || 1080;
    } else {
        if (modalTitle) modalTitle.textContent = "Crear Nuevo Mapa / Zona";
        if (inputName) inputName.value = `Zona ${Object.keys((projectData && projectData.scenes) ? projectData.scenes : {}).length + 1}`;
        if (selectRatio) selectRatio.value = 'horizontal';
        if (inputWidth) inputWidth.value = 1920;
        if (inputHeight) inputHeight.value = 1080;
    }

    if (customContainer && selectRatio) {
        customContainer.style.display = selectRatio.value === 'custom' ? 'flex' : 'none';
        selectRatio.onchange = () => {
            customContainer.style.display = selectRatio.value === 'custom' ? 'flex' : 'none';
        };
    }

    if (btnSave) btnSave.onclick = () => saveSceneModal();
    if (btnCancel) btnCancel.onclick = () => { modal.style.display = 'none'; };
    if (btnClose) btnClose.onclick = () => { modal.style.display = 'none'; };

    modal.style.display = 'flex';
}

function saveSceneModal() {
    const modal = document.getElementById('scene-edit-modal');
    const inputName = document.getElementById('modal-scene-name');
    const selectRatio = document.getElementById('modal-scene-aspect-ratio');
    const inputWidth = document.getElementById('modal-scene-width');
    const inputHeight = document.getElementById('modal-scene-height');

    const name = inputName ? inputName.value.trim() : '';
    if (!name) {
        alert("Por favor introduce un nombre para el mapa.");
        return;
    }

    const ratio = selectRatio ? selectRatio.value : 'horizontal';
    const customW = inputWidth ? (parseInt(inputWidth.value, 10) || 1920) : 1920;
    const customH = inputHeight ? (parseInt(inputHeight.value, 10) || 1080) : 1080;

    if (currentEditingSceneId && projectData.scenes && projectData.scenes[currentEditingSceneId]) {
        const scene = projectData.scenes[currentEditingSceneId];
        scene.name = name;
        scene.aspectRatio = ratio;
        scene.customWidth = customW;
        scene.customHeight = customH;
    } else {
        const newId = 'zona_' + Date.now();
        if (!projectData.scenes) projectData.scenes = {};
        projectData.scenes[newId] = {
            name: name,
            aspectRatio: ratio,
            customWidth: customW,
            customHeight: customH,
            elements: []
        };
        if (!projectData.startScene) projectData.startScene = newId;
        currentSceneId = newId;
    }

    if (modal) modal.style.display = 'none';
    if (typeof autoSaveJSON === 'function') autoSaveJSON();
    renderSceneTabs();
    resetCamera();
    renderStage(true);
}

// Herramienta de Recorte Inline para la ventana derecha
function openInlineCropTool(elem) {
    let inlineCropSection = document.getElementById('inline-crop-section');
    const propsContent = document.getElementById('props-content');
    if (!propsContent) return;

    if (!inlineCropSection) {
        inlineCropSection = document.createElement('div');
        inlineCropSection.id = 'inline-crop-section';
        inlineCropSection.style.cssText = 'display: flex; flex-direction: column; gap: 8px; background: #1e1e24; padding: 10px; border-radius: 8px; color: white; margin-top: 8px; border: 1px solid #333;';
        propsContent.appendChild(inlineCropSection);
    }

    const asset = typeof assetsMap !== 'undefined' ? assetsMap[elem.image] : null;
    if (!asset) {
        alert("No hay una imagen válida para recortar.");
        return;
    }

    inlineCropSection.style.display = 'flex';
    inlineCropSection.innerHTML = `
        <div style="font-size: 10px; font-weight: bold; color: #34c759; display: flex; justify-content: space-between; align-items: center;">
            <span>RECORTE DE IMAGEN INLINE</span>
            <button id="btn-close-inline-crop" style="background:none; border:none; color:white; font-size:14px; cursor:pointer;">&times;</button>
        </div>
        <div style="width: 100%; height: 160px; background: #2a2a32; border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; border: 1px dashed #555;">
            <canvas id="inline-crop-canvas" width="220" height="150" style="max-width: 100%; max-height: 100%; cursor: crosshair; object-fit: contain;"></canvas>
        </div>
        <span style="font-size: 9px; color: #aaa; text-align: center;">Arrastra con el ratón sobre la imagen para seleccionar el área.</span>
        <button class="btn" id="btn-apply-inline-crop" style="background: #34c759; color: white; border: none; font-weight: 600; padding: 6px; font-size: 10px; cursor: pointer;">Aplicar Recorte</button>
    `;

    document.getElementById('btn-close-inline-crop').onclick = () => {
        inlineCropSection.style.display = 'none';
    };

    const canvas = document.getElementById('inline-crop-canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    let cropRect = null;
    let isDragging = false;
    let startPos = { x: 0, y: 0 };

    const drawPreview = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!img.complete || img.naturalWidth === 0) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (cropRect) {
            ctx.strokeStyle = '#34c759';
            ctx.lineWidth = 2;
            ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
            ctx.fillStyle = 'rgba(52, 199, 89, 0.25)';
            ctx.fillRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
        }
    };

    img.onload = () => drawPreview();
    img.src = asset.dataUrl || asset.url;

    canvas.onmousedown = (e) => {
        const rect = canvas.getBoundingClientRect();
        startPos = {
            x: (e.clientX - rect.left) * (canvas.width / rect.width),
            y: (e.clientY - rect.top) * (canvas.height / rect.height)
        };
        isDragging = true;
        cropRect = { x: startPos.x, y: startPos.y, w: 0, h: 0 };
    };

    canvas.onmousemove = (e) => {
        if (!isDragging) return;
        const rect = canvas.getBoundingClientRect();
        const currX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const currY = (e.clientY - rect.top) * (canvas.height / rect.height);
        cropRect.x = Math.min(startPos.x, currX);
        cropRect.y = Math.min(startPos.y, currY);
        cropRect.w = Math.abs(currX - startPos.x);
        cropRect.h = Math.abs(currY - startPos.y);
        drawPreview();
    };

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            if (cropRect && (cropRect.w < 5 || cropRect.h < 5)) {
                cropRect = null;
                drawPreview();
            }
        }
    }, { once: true });

    document.getElementById('btn-apply-inline-crop').onclick = async () => {
        if (!cropRect || cropRect.w <= 0 || cropRect.h <= 0) {
            alert("Por favor selecciona un área válida sobre la imagen para recortar.");
            return;
        }

        const scaleX = img.naturalWidth / canvas.width;
        const scaleY = img.naturalHeight / canvas.height;

        const realX = Math.round(cropRect.x * scaleX);
        const realY = Math.round(cropRect.y * scaleY);
        const realW = Math.round(cropRect.w * scaleX);
        const realH = Math.round(cropRect.h * scaleY);

        const cCanvas = document.createElement('canvas');
        cCanvas.width = realW;
        cCanvas.height = realH;
        const cCtx = cCanvas.getContext('2d');
        cCtx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);

        cCanvas.toBlob(async (blob) => {
            const newFileName = `crop_${Date.now()}.png`;
            await registerAsset(newFileName, blob, true);

            if (typeof dirHandle !== 'undefined' && dirHandle) {
                try {
                    const newFileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                    const writable = await newFileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (err) {
                    console.error("Error guardando recorte en disco:", err);
                }
            }

            elem.image = newFileName;
            elem.width = realW;
            elem.height = realH;

            inlineCropSection.style.display = 'none';
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            if (typeof updateElementsUI === 'function') updateElementsUI();
            updatePropertiesPanel();
        }, 'image/png');
    };
}

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
    const dim = getStageDimensions(targetSceneId);

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
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            renderItemMultiSelectGrid(containerId, element, propertyKey);
        });

        container.appendChild(card);
    });
}

function getSelectedElement() {
    if (typeof selectedSavedElementKey !== 'undefined' && selectedSavedElementKey && projectData.savedElementsConfig) {
        return projectData.savedElementsConfig[selectedSavedElementKey];
    }
    const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
    return scene && scene.elements ? scene.elements.find(e => e.id === selectedElementId) : null;
}

function editSceneName(sId) {
    openSceneEditModal(sId);
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
        resetCamera();
        renderStage(true);
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    }
}

function renderSceneTabs() {
    const sceneTabsContainer = document.getElementById('scene-tabs-container');
    const selectStartScene = document.getElementById('select-start-scene');
    if (!sceneTabsContainer) return;

    sceneTabsContainer.innerHTML = '';
    if (selectStartScene) selectStartScene.innerHTML = '';

    if (!projectData.startScene && Object.keys(projectData.scenes).length > 0) {
        projectData.startScene = Object.keys(projectData.scenes)[0];
    }

    Object.keys(projectData.scenes).forEach(sId => {
        const tab = document.createElement('div');
        tab.className = `scene-tab ${currentSceneId === sId ? 'active' : ''}`;
        tab.style.cssText = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; border: 1px solid var(--border-subtle);";
        
        tab.innerHTML = `
            <span>${projectData.scenes[sId].name}</span>
            <span class="btn-edit-sc" style="font-size:10px; opacity:0.6; margin-left:4px;" title="Editar Zona">✏️</span>
            <span class="btn-del-sc" style="font-size:10px; opacity:0.6; color:#ff3b30;" title="Borrar Zona">&times;</span>
        `;

        tab.onclick = () => {
            currentSceneId = sId;
            selectedElementId = null;
            if (typeof selectedSavedElementKey !== 'undefined') selectedSavedElementKey = null;
            renderSceneTabs();
            resetCamera();
            renderStage(true);
            updatePropertiesPanel();
        };

        tab.querySelector('.btn-edit-sc').onclick = (e) => {
            e.stopPropagation();
            editSceneName(sId);
        };

        tab.querySelector('.btn-del-sc').onclick = (e) => {
            e.stopPropagation();
            deleteScene(sId);
        };

        sceneTabsContainer.appendChild(tab);

        if (selectStartScene) {
            const opt = document.createElement('option');
            opt.value = sId;
            opt.textContent = projectData.scenes[sId].name;
            if (projectData.startScene === sId) opt.selected = true;
            selectStartScene.appendChild(opt);
        }
    });
}