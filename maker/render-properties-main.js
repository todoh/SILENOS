// render-properties-main.js - PANEL PRINCIPAL DE PROPIEDADES Y DIMENSIONES DE OBJETOS
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

    // Invocar la inicialización de las subsecciones de propiedades
    if (typeof renderPhysicsPropertiesSection === 'function') {
        renderPhysicsPropertiesSection(propsContent, dimPropsContainer, elem, isSavedElement);
    }
    if (typeof renderTextPropertiesSection === 'function') {
        renderTextPropertiesSection(propsContent, elem, isSavedElement);
    }
    if (typeof renderInteractivePropertiesSection === 'function') {
        renderInteractivePropertiesSection(propsContent, elem, isSavedElement, propCondVar, propCondOp, propCondVal, propCondItem, propCondItemState, condVarGroup, condInvGroup, propSetVar, propSetVal, propTargetScene, interactiveProps, propCondType);
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