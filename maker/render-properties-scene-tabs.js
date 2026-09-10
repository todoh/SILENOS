// render-properties-scene-tabs.js - COMPONENTES DE PESTAÑAS Y NAVEGACIÓN DE ZONAS
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