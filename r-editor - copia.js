// =======================================================================
// === LÓGICA DEL EDITOR (UI, EVENTOS E INICIALIZACIÓN) ==================
// =======================================================================

// Estado actual del editor
let activeTool = { type: 'texture', id: 'grass' };
let currentZoom = 1.0;

// Referencias a los elementos del DOM.
const editorDOM = {
    mapGridContainer: document.getElementById('r-map-grid-container'),
    mapGrid: document.getElementById('r-map-grid'),
    texturePalette: document.getElementById('r-texture-palette'),
    entityPalette: document.getElementById('r-entity-palette'),
    previewButton: document.getElementById('r-preview-button'),
    saveButton: document.getElementById('r-save-button'),
    previewModal: document.getElementById('r-preview-modal'),
    previewModalCloseBtn: document.querySelector('#r-preview-modal .modal-close-button1'),
    zoomInButton: document.getElementById('r-zoom-in-button'),
    zoomOutButton: document.getElementById('r-zoom-out-button'),
    importCharacterButton: document.getElementById('r-import-character-button'),
    characterModal: document.getElementById('r-character-modal-overlay'),
    characterModalCloseBtn: document.querySelector('#r-character-modal-overlay .character-modal-close-button'),
    characterGrid: document.getElementById('r-character-grid'),
};

function renderGrid() {
    editorDOM.mapGrid.innerHTML = '';
    editorDOM.mapGrid.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, 1fr)`;

    for (let z = 0; z < GRID_HEIGHT; z++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            const chunkId = `${x}_${z}`;
            const chunkCell = document.createElement('div');
            chunkCell.classList.add('grid-cell');
            chunkCell.dataset.chunkId = chunkId;

            if (!worldData.chunks[chunkId]) {
                worldData.chunks[chunkId] = { groundTextureKey: 'empty', objects: [] };
            }
            const chunk = worldData.chunks[chunkId];
            chunkCell.classList.add(`texture-${chunk.groundTextureKey || 'empty'}`);

            for (let subZ = 0; subZ < SUBGRID_SIZE; subZ++) {
                for (let subX = 0; subX < SUBGRID_SIZE; subX++) {
                    const subCell = document.createElement('div');
                    subCell.className = 'subgrid-cell';
                    subCell.dataset.subX = subX;
                    subCell.dataset.subZ = subZ;

                    const entity = chunk.objects.find(obj => obj.subX === subX && obj.subZ === subZ);
                    if (entity) {
                        const toolData = tools.entities[entity.type] || tools.customEntities[entity.type];
                        if (toolData) {
                            if (toolData.type === 'custom') {
                                if (toolData.modelType === 'json3d') {
                                    subCell.innerHTML = `<span style="font-size: 20px;">🧊</span>`;
                                } else {
                                    subCell.innerHTML = `<img src="${toolData.icon}" style="width: 20px; height: 20px; object-fit: contain;">`;
                                }
                            } else {
                                subCell.textContent = toolData.icon || '❓';
                            }
                        }
                    }

                    const playerStart = worldData.metadata.playerStartPosition;
                    if (playerStart && playerStart.chunkX === x && playerStart.chunkZ === z && playerStart.subX === subX && playerStart.subZ === subZ) {
                        subCell.textContent = tools.entities.playerStart.icon;
                    }
                    chunkCell.appendChild(subCell);
                }
            }
            editorDOM.mapGrid.appendChild(chunkCell);
        }
    }
}

function handleGridClick(event) {
    if (event.button !== 0) return;
    const subCell = event.target.closest('.subgrid-cell');
    if (!subCell) return;

    const chunkCell = subCell.closest('.grid-cell');
    const chunkId = chunkCell.dataset.chunkId;
    const chunk = worldData.chunks[chunkId];
    const [chunkX, chunkZ] = chunkId.split('_').map(Number);
    const subX = parseInt(subCell.dataset.subX, 10);
    const subZ = parseInt(subCell.dataset.subZ, 10);

    if (activeTool.category === 'texture') {
        chunk.groundTextureKey = activeTool.id;
    } else if (activeTool.category === 'entity' || activeTool.category === 'customEntity') {
        const existingIndex = chunk.objects.findIndex(obj => obj.subX === subX && obj.subZ === subZ);
        if (existingIndex > -1) chunk.objects.splice(existingIndex, 1);
        
        const playerStart = worldData.metadata.playerStartPosition;
        if (playerStart && playerStart.chunkX === chunkX && playerStart.chunkZ === chunkZ && playerStart.subX === subX && playerStart.subZ === subZ) {
            worldData.metadata.playerStartPosition = null;
        }

        if (activeTool.id === 'playerStart') {
            worldData.metadata.playerStartPosition = { chunkX, chunkZ, subX, subZ };
        } else {
            chunk.objects.push({ type: activeTool.id, subX, subZ });
        }
    }
    renderGrid();
}

function populatePalettes() {
    editorDOM.texturePalette.innerHTML = '<h2>Texturas de Terreno</h2>';
    editorDOM.entityPalette.innerHTML = '<h2>Entidades</h2>';
    
    for (const id in tools.textures) {
        const tool = tools.textures[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'texture';
        btn.dataset.id = id;
        btn.innerHTML = `<div class="color-swatch" style="background-color:${tool.color};"></div> ${tool.name}`;
        btn.onclick = () => selectTool('texture', id);
        editorDOM.texturePalette.appendChild(btn);
    }
    
    for (const id in tools.entities) {
        const tool = tools.entities[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'entity';
        btn.dataset.id = id;
        btn.innerHTML = `<span style="font-size: 20px; margin-right: 10px;">${tool.icon}</span> ${tool.name}`;
        btn.onclick = () => selectTool('entity', id);
        editorDOM.entityPalette.appendChild(btn);
    }
}

function selectTool(category, id) {
    activeTool = { category, id };
    document.querySelectorAll('.palette-item.selected').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.palette-item[data-id='${id}']`).classList.add('selected');
}

// --- Lógica de Zoom y Paneo ---
const ZOOM_STEP = 0.2;
const MAX_ZOOM = 5.0;
const MIN_ZOOM = 0.2;
const PanningState = { isPanning: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, };

function applyZoom() { /* ... código sin cambios ... */ const container = editorDOM.mapGridContainer; const scrollLeft = container.scrollLeft; const scrollTop = container.scrollTop; const containerWidth = container.clientWidth; const containerHeight = container.clientHeight; const originX = scrollLeft + containerWidth / 2; const originY = scrollTop + containerHeight / 2; editorDOM.mapGrid.style.transformOrigin = `${originX}px ${originY}px`; editorDOM.mapGrid.style.transform = `scale(${currentZoom})`; }
function zoomIn() { currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP); applyZoom(); }
function zoomOut() { currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP); applyZoom(); }
function startPanning(event) { if (event.button !== 1) return; event.preventDefault(); const container = editorDOM.mapGridContainer; PanningState.isPanning = true; PanningState.startX = event.pageX - container.offsetLeft; PanningState.startY = event.pageY - container.offsetTop; PanningState.scrollLeft = container.scrollLeft; PanningState.scrollTop = container.scrollTop; container.style.cursor = 'grabbing'; container.style.userSelect = 'none'; }
function stopPanning() { if (!PanningState.isPanning) return; PanningState.isPanning = false; const container = editorDOM.mapGridContainer; container.style.cursor = 'grab'; container.style.removeProperty('user-select'); }
function doPanning(event) { if (!PanningState.isPanning) return; event.preventDefault(); const container = editorDOM.mapGridContainer; const x = event.pageX - container.offsetLeft; const y = event.pageY - container.offsetTop; const walkX = (x - PanningState.startX); const walkY = (y - PanningState.startY); container.scrollLeft = PanningState.scrollLeft - walkX; container.scrollTop = PanningState.scrollTop - walkY; }

// --- Lógica del Modal de Personajes ---
function openCharacterModal() { /* ... código sin cambios ... */ editorDOM.characterGrid.innerHTML = ''; const modalTitle = editorDOM.characterModal.querySelector('h3'); if(modalTitle) { modalTitle.textContent = 'Selecciona un Dato para Importar'; } const characterDataElements = document.querySelectorAll('#listapersonajes .personaje'); characterDataElements.forEach(charElement => { const nombre = charElement.querySelector('.nombreh')?.value; if (!nombre) return; const promptVisualText = charElement.querySelector('.prompt-visualh')?.value; let isJsonModel = false; let jsonData = null; if (promptVisualText) { try { const parsed = JSON.parse(promptVisualText); if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) { isJsonModel = true; jsonData = parsed; } } catch (e) {} } const item = document.createElement('div'); item.className = 'character-grid-item'; item.dataset.name = nombre; if (isJsonModel) { item.dataset.type = 'json3d'; item.dataset.modelData = JSON.stringify(jsonData); item.innerHTML = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🧊</div><span>${nombre}</span>`; item.onclick = importCharacterAsTool; editorDOM.characterGrid.appendChild(item); } else { const imagenSrc = charElement.querySelector('.personaje-visual img')?.src; if (imagenSrc && !imagenSrc.endsWith('/')) { item.dataset.type = 'sprite'; item.dataset.imgSrc = imagenSrc; item.innerHTML = `<img src="${imagenSrc}" alt="${nombre}"><span>${nombre}</span>`; item.onclick = importCharacterAsTool; editorDOM.characterGrid.appendChild(item); } } }); editorDOM.characterModal.style.display = 'flex'; }
function closeCharacterModal() { editorDOM.characterModal.style.display = 'none'; }
function importCharacterAsTool(event) { /* ... código sin cambios ... */ const item = event.currentTarget; const name = item.dataset.name; const type = item.dataset.type; const toolId = `custom_${name.replace(/\s+/g, '_')}`; if (tools.customEntities[toolId]) { alert(`El dato "${name}" ya ha sido importado.`); return; } const newTool = { name: name, type: 'custom', modelType: type }; let buttonIconHTML = ''; if (type === 'sprite') { const imgSrc = item.dataset.imgSrc; newTool.icon = imgSrc; buttonIconHTML = `<img src="${imgSrc}" class="entity-image-icon" alt="${name}">`; } else if (type === 'json3d') { const modelData = JSON.parse(item.dataset.modelData); newTool.icon = modelData; buttonIconHTML = `<span style="font-size: 20px; margin-right: 10px;">🧊</span>`; } tools.customEntities[toolId] = newTool; const btn = document.createElement('button'); btn.className = 'palette-item'; btn.dataset.category = 'customEntity'; btn.dataset.id = toolId; btn.innerHTML = `${buttonIconHTML} ${name}`; btn.onclick = () => selectTool('customEntity', toolId); editorDOM.entityPalette.appendChild(btn); closeCharacterModal(); alert(`¡"${name}" añadido a la paleta de entidades!`); }

function saveWorldData() {
    try {
        localStorage.setItem('editorWorldData', JSON.stringify(worldData));
        alert('¡Mundo guardado en el navegador!');
    } catch (e) {
        console.error("Error al guardar en localStorage:", e);
        alert('Error: No se pudo guardar el mundo.');
    }
}

// --- INICIALIZACIÓN Y EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('editorWorldData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            worldData.metadata = parsedData.metadata || { playerStartPosition: null };
            worldData.chunks = parsedData.chunks || parsedData;
        } catch (e) { console.error("No se pudieron cargar los datos guardados.", e); }
    }

    populatePalettes();
    renderGrid();
    selectTool('texture', 'grass');

    editorDOM.mapGrid.addEventListener('mousedown', handleGridClick);
    editorDOM.zoomInButton.addEventListener('click', zoomIn);
    editorDOM.zoomOutButton.addEventListener('click', zoomOut);
    editorDOM.saveButton.addEventListener('click', saveWorldData);
    editorDOM.previewButton.addEventListener('click', startPreview); // Llama a la función de r-preview-3d.js
    editorDOM.previewModalCloseBtn.addEventListener('click', stopPreview); // Llama a la función de r-preview-3d.js
    
    if (editorDOM.importCharacterButton) {
        editorDOM.importCharacterButton.addEventListener('click', openCharacterModal);
    }
    if (editorDOM.characterModalCloseBtn) {
        editorDOM.characterModalCloseBtn.addEventListener('click', closeCharacterModal);
    }
    
    const container = editorDOM.mapGridContainer;
    container.addEventListener('mousedown', startPanning);
    container.addEventListener('mouseup', stopPanning);
    container.addEventListener('mouseleave', stopPanning);
    container.addEventListener('mousemove', doPanning);
});