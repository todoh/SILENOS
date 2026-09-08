// logic-picker.js - SELECTOR Y PICKER VISUAL DE ASSETS
let selectedPickerAssetKey = '';

function renderAssetPickerGrid() {
    const grid = document.getElementById('picker-grid-content');
    if (!grid) return;
    grid.innerHTML = '';
         
    const assetKeys = Object.keys(assetsMap);
    if (assetKeys.length === 0) {
        grid.innerHTML = '<span style="font-size: 10px; color: var(--text-secondary); grid-column: span 3; text-align: center; padding: 12px 0;">No hay assets cargados</span>';
        return;
    }
         
    assetKeys.forEach(key => {
        const asset = assetsMap[key];
        const cell = document.createElement('div');
        cell.className = `asset-picker-cell ${selectedPickerAssetKey === key ? 'selected' : ''}`;
        cell.title = key;
        cell.innerHTML = `<img src="${asset.url}" alt="${key}">`;
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            selectPickerAsset(key);
            const dropdown = document.getElementById('picker-grid-dropdown');
            if (dropdown) dropdown.style.display = 'none';
        });
        grid.appendChild(cell);
    });
}

function selectPickerAsset(key) {
    selectedPickerAssetKey = key;
    const triggerText = document.getElementById('picker-trigger-text');
    if (key && assetsMap[key]) {
        triggerText.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${assetsMap[key].url}" style="width: 20px; height: 20px; object-fit: contain;">
                <span style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${key}</span>
            </div>
        `;
    } else {
        if (triggerText) triggerText.textContent = '-- Seleccionar Imagen --';
    }
    renderAssetPickerGrid();
}