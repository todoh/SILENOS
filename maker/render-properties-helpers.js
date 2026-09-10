// render-properties-helpers.js - HELPER FUNCTIONS Y MULTI-SELECT GRIDS
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