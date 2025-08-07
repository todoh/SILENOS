// =======================================================================
// === LÓGICA DEL EDITOR (UI, EVENTOS E INICIALIZACIÓN) ==================
// =======================================================================

// Estado actual del editor
let activeTool = { type: 'texture', id: 'grass' };
let currentZoom = 1.0;
const WORLD_DATA_NAME_PREFIX = 'Mundo - '; // Prefijo para los nombres de datos de mundos

// Referencias a los elementos del DOM.
const editorDOM = {
    mapGridContainer: document.getElementById('r-map-grid-container'),
    mapGrid: document.getElementById('r-map-grid'),
    texturePalette: document.getElementById('r-texture-palette'),
    entityPalette: document.getElementById('r-entity-palette'),
    previewButton: document.getElementById('r-preview-button'),
    saveButton: document.getElementById('r-save-button'),
    loadWorldSelect: document.getElementById('r-load-world-select'),
    saveToCharacterButton: document.getElementById('r-save-to-character-btn'),
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
                        let iconSrc = null;
                        let modelType = entity.modelType;

                        if (entity.dataRef) {
                            const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
                            for (const charElement of characterDataElements) {
                                const nombreInput = charElement.querySelector('.nombreh');
                                if (nombreInput && nombreInput.value === entity.dataRef) {
                                    const imgElement = charElement.querySelector('.personaje-visual img');
                                    if (imgElement) {
                                        iconSrc = imgElement.src;
                                    }
                                    break;
                                }
                            }
                        } 
                        else if (entity.icon) {
                            iconSrc = entity.icon;
                        } 
                        else {
                            const toolData = tools.entities[entity.type];
                            if (toolData) {
                                subCell.textContent = toolData.icon || '❓';
                            }
                        }

                        if (iconSrc) {
                            if (modelType === 'json3d') {
                                subCell.innerHTML = `<span style="font-size: 20px;">🧊</span>`;
                            } else {
                                subCell.innerHTML = `<img src="${iconSrc}" style="width: 20px; height: 20px; object-fit: contain;" alt="${entity.dataRef || ''}">`;
                            }
                        } else if (entity.dataRef) {
                            subCell.innerHTML = `❓`;
                            subCell.title = `Referencia rota a: ${entity.dataRef}`;
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
             chunk.objects.push({ type: activeTool.id, subX, subZ });
        } else {
            const newObject = { type: activeTool.id, subX, subZ };
            
            if (activeTool.category === 'customEntity') {
                const toolData = tools.customEntities[activeTool.id];
                if (toolData) {
                    newObject.dataRef = toolData.dataRef;
                    newObject.modelType = toolData.modelType;
                }
            }
            chunk.objects.push(newObject);
        }
    }
    renderGrid();
}

/**
 * Genera una previsualización 3D de un modelo JSON y la devuelve como una imagen DataURL.
 * @param {object} modelJson - El objeto JSON que define el modelo.
 * @param {number} [size=80] - El tamaño (ancho y alto) de la imagen de previsualización.
 * @returns {Promise<string>} Una promesa que se resuelve con el DataURL de la imagen.
 */
async function generate3DPreview(modelJson, size = 80) {
    // Asegurarse de que THREE.js y la función de creación de modelos estén disponibles
    if (typeof THREE === 'undefined' || typeof createModelFromJSON === 'undefined') {
        console.error("generate3DPreview requiere THREE.js y createModelFromJSON.");
        // Devuelve una imagen de marcador de posición en caso de error
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">❓</text></svg>';
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);

    // Iluminación básica para que el objeto se vea bien
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(1.5, 2, 1);
    scene.add(dirLight);

    // Crear el modelo a partir del JSON
    const model = createModelFromJSON(modelJson);
    scene.add(model);

    // Centrar la cámara en el objeto
    const box = new THREE.Box3().setFromObject(model);
    const modelSize = box.getSize(new THREE.Vector3());
    const modelCenter = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.6; // Añadir un poco de espacio para que no toque los bordes

    camera.position.set(modelCenter.x, modelCenter.y, modelCenter.z + cameraZ);
    camera.lookAt(modelCenter);

    // Renderizar la escena y obtener el resultado
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    // Limpieza para liberar memoria
    renderer.dispose();
    model.traverse(object => {
        if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        }
    });

    return dataUrl;
}


async function populatePalettes() {
    editorDOM.texturePalette.innerHTML = '<h2>Texturas de Terreno</h2>';
    editorDOM.entityPalette.innerHTML = '<h2>Entidades</h2>';

    // Crear los nuevos contenedores de cuadrícula
    const textureGrid = document.createElement('div');
    textureGrid.className = 'palette-container';
    editorDOM.texturePalette.appendChild(textureGrid);

    const entityGrid = document.createElement('div');
    entityGrid.className = 'palette-container';
    editorDOM.entityPalette.appendChild(entityGrid);

    // Poblar Texturas
    for (const id in tools.textures) {
        const tool = tools.textures[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'texture';
        btn.dataset.id = id;
        btn.innerHTML = `
            <div class="palette-item-preview">
                <div class="color-swatch" style="background-color:${tool.color};"></div>
            </div>
            <span>${tool.name}</span>
        `;
        btn.onclick = () => selectTool('texture', id);
        textureGrid.appendChild(btn);
    }

    // Poblar Entidades (base y personalizadas)
    const allEntities = {...tools.entities, ...tools.customEntities };
    for (const id in allEntities) {
        const tool = allEntities[id];
        const isCustom = !!tools.customEntities[id];
        const category = isCustom ? 'customEntity' : 'entity';
        
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = category;
        btn.dataset.id = id;

        let previewHTML = '';
        const modelData = tool.model || (tool.modelType === 'json3d' ? tool.icon : null);

        if (modelData) {
            // Generar previsualización 3D
            const previewSrc = await generate3DPreview(modelData);
            previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${tool.name}"></div>`;
        } else if (tool.icon && (tool.icon.startsWith('data:image') || tool.icon.startsWith('http'))) {
            // Usar imagen de sprite
            previewHTML = `<div class="palette-item-preview"><img src="${tool.icon}" alt="${tool.name}"></div>`;
        } else {
            // Usar icono de emoji como último recurso
            previewHTML = `<div class="palette-item-preview palette-item-preview-emoji">${tool.icon || '❓'}</div>`;
        }

        btn.innerHTML = `${previewHTML}<span>${tool.name}</span>`;
        btn.onclick = () => selectTool(category, id);
        entityGrid.appendChild(btn);
    }
}


async function importCharacterAsTool(event) { // <--- Función ahora es async
    const item = event.currentTarget;
    const name = item.dataset.name;
    const type = item.dataset.type;
    const toolId = `custom_${name.replace(/\s+/g, '_')}`;

    if (tools.customEntities[toolId]) {
        alert(`El dato "${name}" ya ha sido importado.`);
        return;
    }

    const newTool = {
        name: name,
        type: 'custom',
        modelType: type,
        dataRef: name,
        isSolid: true,
        radius: 1.2
    };

    let previewHTML = '';
    if (type === 'sprite') {
        const imgSrc = item.dataset.imgSrc;
        newTool.icon = imgSrc;
        previewHTML = `<div class="palette-item-preview"><img src="${imgSrc}" alt="${name}"></div>`;
    } else if (type === 'json3d') {
        const modelData = JSON.parse(item.dataset.modelData);
        newTool.icon = modelData;
        // Generar previsualización 3D al importar
        const previewSrc = await generate3DPreview(modelData);
        previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${name}"></div>`;
    }

    tools.customEntities[toolId] = newTool;

    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (entityGrid) {
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'customEntity';
        btn.dataset.id = toolId;
        btn.innerHTML = `${previewHTML}<span>${name}</span>`;
        btn.onclick = () => selectTool('customEntity', toolId);
        entityGrid.appendChild(btn);
    }

    closeCharacterModal();
    alert(`¡"${name}" añadido a la paleta de entidades!`);
}

// --- INICIALIZACIÓN Y EVENT LISTENERS (ACTUALIZADO) ---
document.addEventListener('DOMContentLoaded', async () => { // <--- Callback ahora es async
    await populatePalettes(); // <--- Esperar a que las paletas se generen
    renderGrid();
    selectTool('texture', 'grass');
    populateWorldList();

    // ... El resto de tus event listeners permanecen igual
    editorDOM.mapGrid.addEventListener('mousedown', handleGridClick);
    editorDOM.zoomInButton.addEventListener('click', zoomIn);
    // ... etc.
});

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

function applyZoom() { const container = editorDOM.mapGridContainer; const scrollLeft = container.scrollLeft; const scrollTop = container.scrollTop; const containerWidth = container.clientWidth; const containerHeight = container.clientHeight; const originX = scrollLeft + containerWidth / 2; const originY = scrollTop + containerHeight / 2; editorDOM.mapGrid.style.transformOrigin = `${originX}px ${originY}px`; editorDOM.mapGrid.style.transform = `scale(${currentZoom})`; }
function zoomIn() { currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP); applyZoom(); }
function zoomOut() { currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP); applyZoom(); }
function startPanning(event) { if (event.button !== 1) return; event.preventDefault(); const container = editorDOM.mapGridContainer; PanningState.isPanning = true; PanningState.startX = event.pageX - container.offsetLeft; PanningState.startY = event.pageY - container.offsetTop; PanningState.scrollLeft = container.scrollLeft; PanningState.scrollTop = container.scrollTop; container.style.cursor = 'grabbing'; container.style.userSelect = 'none'; }
function stopPanning() { if (!PanningState.isPanning) return; PanningState.isPanning = false; const container = editorDOM.mapGridContainer; container.style.cursor = 'grab'; container.style.removeProperty('user-select'); }
function doPanning(event) { if (!PanningState.isPanning) return; event.preventDefault(); const container = editorDOM.mapGridContainer; const x = event.pageX - container.offsetLeft; const y = event.pageY - container.offsetTop; const walkX = (x - PanningState.startX); const walkY = (y - PanningState.startY); container.scrollLeft = PanningState.scrollLeft - walkX; container.scrollTop = PanningState.scrollTop - walkY; }

// --- Lógica del Modal de Personajes ---
function openCharacterModal() { editorDOM.characterGrid.innerHTML = ''; const modalTitle = editorDOM.characterModal.querySelector('h3'); if(modalTitle) { modalTitle.textContent = 'Selecciona un Dato para Importar'; } const characterDataElements = document.querySelectorAll('#listapersonajes .personaje'); characterDataElements.forEach(charElement => { const nombre = charElement.querySelector('.nombreh')?.value; if (!nombre) return; const promptVisualText = charElement.querySelector('.prompt-visualh')?.value; let isJsonModel = false; let jsonData = null; if (promptVisualText) { try { const parsed = JSON.parse(promptVisualText); if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects) || parsed.hasOwnProperty('chunks'))) { isJsonModel = true; jsonData = parsed; } } catch (e) {} } const item = document.createElement('div'); item.className = 'character-grid-item'; item.dataset.name = nombre; if (isJsonModel) { item.dataset.type = 'json3d'; item.dataset.modelData = JSON.stringify(jsonData); item.innerHTML = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🧊</div><span>${nombre}</span>`; item.onclick = importCharacterAsTool; editorDOM.characterGrid.appendChild(item); } else { const imagenSrc = charElement.querySelector('.personaje-visual img')?.src; if (imagenSrc && !imagenSrc.endsWith('/')) { item.dataset.type = 'sprite'; item.dataset.imgSrc = imagenSrc; item.innerHTML = `<img src="${imagenSrc}" alt="${nombre}"><span>${nombre}</span>`; item.onclick = importCharacterAsTool; editorDOM.characterGrid.appendChild(item); } } }); editorDOM.characterModal.style.display = 'flex'; }
function closeCharacterModal() { editorDOM.characterModal.style.display = 'none'; }

 

// --- Sistema de Guardado y Carga ---
function loadWorldData(worldName) {
    if (!worldName) return;
    let worldJson = null;
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === worldName) {
            const promptVisual = charElement.querySelector('.prompt-visualh');
            if (promptVisual) {
                worldJson = promptVisual.value;
                break;
            }
        }
    }
    if (worldJson) {
        try {
            const parsedData = JSON.parse(worldJson);
            worldData = {
                metadata: parsedData.metadata || { playerStartPosition: null },
                chunks: parsedData.chunks || {}
            };
            renderGrid();
            alert(`¡Mundo "${worldName}" cargado!`);
        } catch (e) {
            alert(`Error al cargar el mundo "${worldName}". El dato puede estar corrupto.`);
            console.error("Error al parsear los datos del mundo:", e);
        }
    } else {
        alert(`No se encontró un dato de mundo con el nombre "${worldName}".`);
    }
}

function populateWorldList() {
    const select = document.getElementById('r-load-world-select');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Cargar Mundo...</option>';
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    allCharacters.forEach(charElement => {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value.startsWith(WORLD_DATA_NAME_PREFIX)) {
            const worldName = nameInput.value;
            const option = document.createElement('option');
            option.value = worldName;
            option.textContent = worldName.substring(WORLD_DATA_NAME_PREFIX.length);
            select.appendChild(option);
        }
    });
    select.value = currentValue;
}

function saveWorldToCharacter() {
    const name = prompt("Introduce un nombre para este mundo:", "Mundo de Aventura");
    if (!name || name.trim() === "") {
        alert("Guardado cancelado: el nombre no puede estar vacío.");
        return;
    }
    if (typeof agregarPersonajeDesdeDatos !== 'function') {
        alert("Error: La función para crear datos ('agregarPersonajeDesdeDatos') no está disponible. Asegúrate de que 'datos.js' esté cargado.");
        return;
    }
    const finalName = `${WORLD_DATA_NAME_PREFIX}${name.trim()}`;
    const worldJson = JSON.stringify(worldData);
    const nuevoDatoMundo = {
        nombre: finalName,
        descripcion: 'Dato de Mundo 3D. Contiene la estructura completa de un mundo para el renderizador.',
        promptVisual: worldJson,
        etiqueta: 'ubicacion',
        arco: 'sin_arco',
        imagen: '',
        svgContent: '',
        embedding: []
    };
    agregarPersonajeDesdeDatos(nuevoDatoMundo);
    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    populateWorldList();
    alert(`¡Mundo "${name.trim()}" guardado como un dato completo!`);
}

// Carga automáticamente los datos con el arco "videojuego" como herramientas.
function autoLoadGameAssets() {
    console.log("Buscando assets de videojuego para cargar...");
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    
    characterDataElements.forEach(charElement => {
        const arco = charElement.querySelector('.change-arc-btn')?.dataset.arco;
        
        if (arco === 'videojuego') {
            const nombre = charElement.querySelector('.nombreh')?.value;
            if (!nombre) return;

            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
            if (tools.customEntities[toolId]) {
                return;
            }

            const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
            let modelType = 'sprite';
            
            if (promptVisualText) {
                try {
                    const parsed = JSON.parse(promptVisualText);
                    if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects) || parsed.hasOwnProperty('chunks'))) {
                        modelType = 'json3d';
                    }
                } catch (e) { /* No es JSON, se asume que es un sprite */ }
            }
            
            const newTool = {
                name: nombre,
                type: 'custom',
                modelType: modelType,
                dataRef: nombre,
                isSolid: true,
                radius: 1.2
            };

            let buttonIconHTML = '';
            const imagenSrc = charElement.querySelector('.personaje-visual img')?.src;

            if (modelType === 'json3d') {
                 newTool.icon = JSON.parse(promptVisualText);
                 buttonIconHTML = `<span style="font-size: 20px; margin-right: 10px;">🧊</span>`;
            } else if (imagenSrc && !imagenSrc.endsWith('/')) {
                 newTool.icon = imagenSrc;
                 buttonIconHTML = `<img src="${imagenSrc}" class="entity-image-icon" alt="${nombre}">`;
            } else {
                return;
            }

            tools.customEntities[toolId] = newTool;

            const btn = document.createElement('button');
            btn.className = 'palette-item';
            btn.dataset.category = 'customEntity';
            btn.dataset.id = toolId;
            btn.innerHTML = `${buttonIconHTML} ${nombre}`;
            btn.onclick = () => selectTool('customEntity', toolId);
            editorDOM.entityPalette.appendChild(btn);
            
            console.log(`Asset "${nombre}" cargado desde el arco 'videojuego'.`);
        }
    });
}


// --- INICIALIZACIÓN Y EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    populatePalettes();
    renderGrid();
    selectTool('texture', 'grass');
    populateWorldList();

    editorDOM.mapGrid.addEventListener('mousedown', handleGridClick);
    editorDOM.zoomInButton.addEventListener('click', zoomIn);
    editorDOM.zoomOutButton.addEventListener('click', zoomOut);
    editorDOM.saveButton.addEventListener('click', saveWorldToCharacter);
    if (editorDOM.saveToCharacterButton) {
        editorDOM.saveToCharacterButton.addEventListener('click', saveWorldToCharacter);
    }
    editorDOM.previewButton.addEventListener('click', startPreview);
    editorDOM.previewModalCloseBtn.addEventListener('click', stopPreview);
    if (editorDOM.loadWorldSelect) {
        editorDOM.loadWorldSelect.addEventListener('change', (event) => {
            loadWorldData(event.target.value);
        });
        editorDOM.loadWorldSelect.addEventListener('click', populateWorldList);
    }
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

// --- CORRECCIÓN DE SINCRONIZACIÓN ---
// Se ejecuta cuando la ventana principal se ha cargado, y luego se usa un
// sistema de reintentos para asegurar que los "Datos" y sus imágenes estén listos.
window.addEventListener('load', () => {
    let attempts = 0;
    const maxAttempts = 20; // Intentar durante 10 segundos

    const tryLoadAssets = () => {
        const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
        const videoGameAssets = Array.from(characterDataElements).filter(el => el.querySelector('.change-arc-btn')?.dataset.arco === 'videojuego');

        // Condición de éxito: Se encontraron assets Y TODAS sus imágenes están completamente cargadas.
        if (videoGameAssets.length > 0 && videoGameAssets.every(el => el.querySelector('.personaje-visual img')?.complete)) {
            console.log("Assets de 'Videojuego' listos. Cargando en la paleta...");
            autoLoadGameAssets();
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(tryLoadAssets, 500); // Reintentar en 500ms
        } else {
            console.warn("No se pudieron cargar automáticamente los assets de 'Videojuego' después de varios intentos.");
        }
    };

    tryLoadAssets();
});
