// render-properties-modal.js - MODALES DE MAPAS, ZONAS Y TELETRANSPORTE
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