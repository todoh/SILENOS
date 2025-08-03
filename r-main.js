const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;
const SUBGRID_SIZE = 5;

let worldData = {
    metadata: {
        playerStartPosition: null
    },
    chunks: {}
};

let activeTool = { type: 'texture', id: 'grass' };
let currentZoom = 1.0;

// MODIFICADO: Se añade una nueva categoría para entidades personalizadas
const tools = {
    textures: {
        grass: { color: '#7C9C4A', name: 'Hierba' },
        sand: { color: '#EDC9AF', name: 'Arena' },
        stone: { color: '#615953', name: 'Roca' },
        water: { color: '#3B698B', name: 'Agua' },
        forest: { color: '#3E7C4F', name: 'Bosque' },
    },
    entities: {
        playerStart: { icon: '🚩', name: 'Inicio del Jugador' },
        tree: { icon: '🌳', name: 'Árbol' },
        rock: { icon: '🪨', name: 'Roca Grande' }
    },
    // NUEVO: Objeto para almacenar los personajes importados
    customEntities: {}
};

// MODIFICADO: Se añaden los nuevos elementos del DOM para el modal de personajes
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
    // NUEVO: Elementos del DOM para la importación de personajes
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
                                // MODIFICADO: Muestra un icono diferente si es un modelo 3D
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
        if (existingIndex > -1) {
            chunk.objects.splice(existingIndex, 1);
        }

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

// --- Lógica de Zoom y Paneo (sin cambios) ---
const ZOOM_STEP = 0.2;
const MAX_ZOOM = 5.0;
const MIN_ZOOM = 0.2;
function applyZoom() { const container = editorDOM.mapGridContainer; const scrollLeft = container.scrollLeft; const scrollTop = container.scrollTop; const containerWidth = container.clientWidth; const containerHeight = container.clientHeight; const originX = scrollLeft + containerWidth / 2; const originY = scrollTop + containerHeight / 2; editorDOM.mapGrid.style.transformOrigin = `${originX}px ${originY}px`; editorDOM.mapGrid.style.transform = `scale(${currentZoom})`; }
function zoomIn() { currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP); applyZoom(); }
function zoomOut() { currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP); applyZoom(); }
function saveWorldData() { try { localStorage.setItem('editorWorldData', JSON.stringify(worldData)); alert('¡Mundo guardado en el navegador!'); } catch (e) { console.error("Error al guardar en localStorage:", e); alert('Error: No se pudo guardar el mundo.'); } }
const PanningState = { isPanning: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, };
function startPanning(event) { if (event.button !== 1) return; event.preventDefault(); const container = editorDOM.mapGridContainer; PanningState.isPanning = true; PanningState.startX = event.pageX - container.offsetLeft; PanningState.startY = event.pageY - container.offsetTop; PanningState.scrollLeft = container.scrollLeft; PanningState.scrollTop = container.scrollTop; container.style.cursor = 'grabbing'; container.style.userSelect = 'none'; }
function stopPanning() { if (!PanningState.isPanning) return; PanningState.isPanning = false; const container = editorDOM.mapGridContainer; container.style.cursor = 'grab'; container.style.removeProperty('user-select'); }
function doPanning(event) { if (!PanningState.isPanning) return; event.preventDefault(); const container = editorDOM.mapGridContainer; const x = event.pageX - container.offsetLeft; const y = event.pageY - container.offsetTop; const walkX = (x - PanningState.startX); const walkY = (y - PanningState.startY); container.scrollLeft = PanningState.scrollLeft - walkX; container.scrollTop = PanningState.scrollTop - walkY; }


// =======================================================================
// === LÓGICA DEL MODAL DE PERSONAJES (ACTUALIZADA) ======================
// =======================================================================

function openCharacterModal() {
    editorDOM.characterGrid.innerHTML = '';
    
    const modalTitle = editorDOM.characterModal.querySelector('h3');
    if(modalTitle) {
        modalTitle.textContent = 'Selecciona un Dato para Importar';
    }

    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    
    characterDataElements.forEach(charElement => {
        const nombre = charElement.querySelector('.nombreh')?.value;
        if (!nombre) return; // Saltar si el dato no tiene nombre

        const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
        let isJsonModel = false;
        let jsonData = null;

        // Intentar parsear el contenido de promptVisual como JSON
        if (promptVisualText) {
            try {
                const parsed = JSON.parse(promptVisualText);
                // --- INICIO DE LA CORRECCIÓN: Aceptar ambos formatos de JSON ---
                if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) {
                    isJsonModel = true;
                    jsonData = parsed;
                }
                // --- FIN DE LA CORRECCIÓN ---
            } catch (e) { /* No es JSON válido, se ignora y se tratará como texto normal */ }
        }
        
        const item = document.createElement('div');
        item.className = 'character-grid-item';
        item.dataset.name = nombre;

        // --- LÓGICA DE PRIORIDAD: Modelo 3D > Imagen Sprite ---
        if (isJsonModel) {
            // Si es un modelo 3D, se crea una entrada para él y se ignora la imagen
            item.dataset.type = 'json3d';
            item.dataset.modelData = JSON.stringify(jsonData);
            item.innerHTML = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🧊</div><span>${nombre}</span>`;
            item.onclick = importCharacterAsTool;
            editorDOM.characterGrid.appendChild(item);
        } else {
            // Si no es un modelo 3D, se busca una imagen para crear un sprite
            const imagenSrc = charElement.querySelector('.personaje-visual img')?.src;
            if (imagenSrc && !imagenSrc.endsWith('/')) {
                item.dataset.type = 'sprite';
                item.dataset.imgSrc = imagenSrc;
                item.innerHTML = `<img src="${imagenSrc}" alt="${nombre}"><span>${nombre}</span>`;
                item.onclick = importCharacterAsTool;
                editorDOM.characterGrid.appendChild(item);
            }
        }
    });

    editorDOM.characterModal.style.display = 'flex';
}

function closeCharacterModal() {
    editorDOM.characterModal.style.display = 'none';
}

function importCharacterAsTool(event) {
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
        modelType: type 
    };

    let buttonIconHTML = '';

    if (type === 'sprite') {
        const imgSrc = item.dataset.imgSrc;
        newTool.icon = imgSrc;
        buttonIconHTML = `<img src="${imgSrc}" class="entity-image-icon" alt="${name}">`;
    } else if (type === 'json3d') {
        const modelData = JSON.parse(item.dataset.modelData);
        newTool.icon = modelData;
        buttonIconHTML = `<span style="font-size: 20px; margin-right: 10px;">🧊</span>`;
    }

    tools.customEntities[toolId] = newTool;

    const btn = document.createElement('button');
    btn.className = 'palette-item';
    btn.dataset.category = 'customEntity';
    btn.dataset.id = toolId;
    btn.innerHTML = `${buttonIconHTML} ${name}`;
    btn.onclick = () => selectTool('customEntity', toolId);
    editorDOM.entityPalette.appendChild(btn);

    closeCharacterModal();
    alert(`¡"${name}" añadido a la paleta de entidades!`);
}

// =======================================================================
// === FUNCIÓN PARA CREAR MODELOS 3D DESDE JSON (ACTUALIZADA) ============
// =======================================================================

/**
 * Construye un objeto THREE.Group a partir de una definición JSON.
 * AHORA SOPORTA DOS FORMATOS DE JSON DIFERENTES.
 * @param {object} jsonData - El objeto JSON que define el modelo.
 * @returns {THREE.Group} El grupo de mallas que representa el modelo.
 */
function createModelFromJSON(jsonData) {
    const group = new THREE.Group();

    if (!jsonData || typeof jsonData !== 'object') {
        console.error("Datos JSON inválidos:", jsonData);
        return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    }

    // --- INICIO DE LA CORRECCIÓN: DETECTAR FORMATO ---
    const parts = jsonData.parts || jsonData.objects;
    if (!Array.isArray(parts)) {
        console.error("El JSON no contiene un array 'parts' u 'objects' válido.");
        return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
    }
    // --- FIN DE LA CORRECCIÓN ---

    parts.forEach(part => {
        let geometry;
        // Normalizar acceso a la definición de geometría y material
        const geoDef = part.geometry;
        const matDef = part.material;

        try {
            const geoType = geoDef.type || part.geometry; // "CylinderGeometry" o "Cylinder"
            const geoParams = geoDef || part.geometryParams;

            if (geoType.includes('Cylinder')) {
                geometry = new THREE.CylinderGeometry(geoParams.radiusTop ?? geoParams.radius, geoParams.radiusBottom ?? geoParams.radius, geoParams.height, geoParams.radialSegments);
            } else if (geoType.includes('Icosahedron')) {
                geometry = new THREE.IcosahedronGeometry(geoParams.radius, geoParams.detail);
            } else if (geoType.includes('Sphere')) {
                geometry = new THREE.SphereGeometry(geoParams.radius, geoParams.widthSegments ?? geoParams.width, geoParams.heightSegments ?? geoParams.height);
            } else if (geoType.includes('Box')) {
                geometry = new THREE.BoxGeometry(1, 1, 1); // Escala se aplica después
            } else {
                console.warn(`Geometría no soportada: ${geoType}. Usando un cubo.`);
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            }
        } catch (e) {
            console.error(`Error creando geometría:`, e, part);
            geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        }

        const color = matDef ? matDef.color : part.color;
        const material = matDef ? new THREE.MeshStandardMaterial(matDef) : new THREE.MeshLambertMaterial({ color });
        
        const mesh = new THREE.Mesh(geometry, material);

        if (part.position) {
            mesh.position.set(part.position.x || 0, part.position.y || 0, part.position.z || 0);
        }
        if (part.scale) {
            mesh.scale.set(part.scale.x || 1, part.scale.y || 1, part.scale.z || 1);
        }
        
        mesh.castShadow = true;
        group.add(mesh);
    });

    return group;
}


// =======================================================================
// === LÓGICA DEL VISOR 3D (CON MODIFICACIONES) ==========================
// =======================================================================
let previewState = { isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null, groundMeshes: [] };
const CHUNK_SIZE = 32;
const SUB_CELL_SIZE = CHUNK_SIZE / SUBGRID_SIZE;
const textureColors = { grass: 0x7C9C4A, sand: 0xEDC9AF, stone: 0x615953, water: 0x3B698B, forest: 0x3E7C4F };
const playerController = { height: 1.8, speed: 18.0, mesh: null, targetPosition: null };
const cameraController = { distance: 18, angle: Math.PI / 4, offset: new THREE.Vector3() };

function startPreview() {
    if (previewState.isActive) return;
    const container = document.getElementById('r-game-container');
    container.innerHTML = '';
    
    previewState.scene = new THREE.Scene();
    previewState.scene.background = new THREE.Color(0x87ceeb);
    previewState.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    previewState.clock = new THREE.Clock();
    previewState.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    previewState.groundMeshes = [];

    const playerGeo = new THREE.CylinderGeometry(0.5, 0.5, playerController.height, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    playerController.mesh = new THREE.Mesh(playerGeo, playerMat);
    playerController.mesh.castShadow = true;

    let startX = 0, startZ = 0;
    const playerStart = worldData.metadata.playerStartPosition;
    if (playerStart) {
        startX = (playerStart.chunkX * CHUNK_SIZE) + (playerStart.subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
        startZ = (playerStart.chunkZ * CHUNK_SIZE) + (playerStart.subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
    }
    playerController.mesh.position.set(startX, playerController.height / 2, startZ);
    previewState.scene.add(playerController.mesh);
    playerController.targetPosition = playerController.mesh.position.clone();

    previewState.renderer = new THREE.WebGLRenderer({ antialias: true });
    previewState.renderer.shadowMap.enabled = true;
    container.appendChild(previewState.renderer.domElement);

    previewState.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(2048, 2048);
    previewState.scene.add(directionalLight);
    
    loadWorldFromData(worldData.chunks);
    editorDOM.previewModal.style.display = 'flex';
    
    setTimeout(() => {
        handlePreviewResize();
        window.addEventListener('resize', handlePreviewResize, false);
        container.addEventListener('click', handlePreviewClick, false);
        previewState.isActive = true;
        animatePreview();
    }, 0);
}

function stopPreview() {
    if (!previewState.isActive) return;
    cancelAnimationFrame(previewState.animationFrameId);
    window.removeEventListener('resize', handlePreviewResize, false);
    const container = document.getElementById('r-game-container');
    container.removeEventListener('click', handlePreviewClick, false);
    if (previewState.renderer) previewState.renderer.dispose();
    container.innerHTML = '';
    previewState = { isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null, groundMeshes: [] };
    editorDOM.previewModal.style.display = 'none';
}

function handlePreviewResize() {
    if (!previewState.isActive) return;
    const container = document.getElementById('r-game-container');
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    previewState.camera.aspect = width / height;
    previewState.camera.updateProjectionMatrix();
    previewState.renderer.setSize(width, height);
}

function handlePreviewClick(event) {
    if (!previewState.isActive) return;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const container = document.getElementById('r-game-container');
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, previewState.camera);
    const intersects = raycaster.intersectObjects(previewState.groundMeshes);
    if (intersects.length > 0) {
        playerController.targetPosition = intersects[0].point;
    }
}

function updatePlayer(deltaTime) {
    if (!playerController.targetPosition) return;
    const direction = playerController.targetPosition.clone().sub(playerController.mesh.position);
    direction.y = 0; 
    const distanceToTarget = direction.length();
    if (distanceToTarget > 0.1) {
        const moveDistance = playerController.speed * deltaTime;
        const moveVector = direction.normalize().multiplyScalar(Math.min(moveDistance, distanceToTarget));
        playerController.mesh.position.add(moveVector);
        const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
        playerController.mesh.quaternion.slerp(targetQuaternion, 10 * deltaTime);
    }
}

function updateCamera() {
    if (!playerController.mesh) return;
    cameraController.offset.set(0, Math.sin(cameraController.angle), Math.cos(cameraController.angle));
    cameraController.offset.multiplyScalar(cameraController.distance);
    const cameraPosition = playerController.mesh.position.clone().add(cameraController.offset);
    previewState.camera.position.copy(cameraPosition);
    const lookAtPosition = playerController.mesh.position.clone();
    previewState.camera.lookAt(lookAtPosition);
}

function loadWorldFromData(data) {
    const textureLoader = new THREE.TextureLoader();

    for (const chunkId in data) {
        const chunk = data[chunkId];
        const [chunkX, chunkZ] = chunkId.split('_').map(Number);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: textureColors[chunk.groundTextureKey] || 0x999999 });
        const groundGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, 0, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
        groundMesh.receiveShadow = true;
        previewState.scene.add(groundMesh);
        previewState.groundMeshes.push(groundMesh);

        if (chunk.objects) {
            chunk.objects.forEach(obj => {
                let objectMesh;
                const entityData = tools.customEntities[obj.type] || tools.entities[obj.type];

                if (entityData && entityData.type === 'custom') {
                    // MODIFICADO: Diferencia entre renderizar un sprite o un modelo 3D
                    if (entityData.modelType === 'json3d') {
                        objectMesh = createModelFromJSON(entityData.icon);
                        objectMesh.position.y = 0; // La posición Y se define dentro del JSON
                    } else { // 'sprite'
                        const map = textureLoader.load(entityData.icon);
                        const material = new THREE.SpriteMaterial({ map: map, color: 0xffffff, transparent: true, alphaTest: 0.5 });
                        objectMesh = new THREE.Sprite(material);
                        objectMesh.scale.set(6, 6, 1); 
                        objectMesh.position.y = 3;
                    }
                } else if (obj.type === 'tree') {
                    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 8, 8), new THREE.MeshLambertMaterial({ color: 0x66402D }));
                    trunk.position.y = 4;
                    trunk.castShadow = true;
                    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 6, 8), new THREE.MeshLambertMaterial({ color: 0x228B22 }));
                    leaves.position.y = 8 + 3;
                    leaves.castShadow = true;
                    objectMesh = new THREE.Group();
                    objectMesh.add(trunk);
                    objectMesh.add(leaves);
                } else if (obj.type === 'rock') { 
                    objectMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5), new THREE.MeshLambertMaterial({ color: 0x5c5c5c }));
                    objectMesh.position.y = 1.5;
                    objectMesh.castShadow = true;
                }

                if (objectMesh) {
                    const objX = (chunkX * CHUNK_SIZE) + (obj.subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
                    const objZ = (chunkZ * CHUNK_SIZE) + (obj.subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
                    objectMesh.position.set(objX, objectMesh.position.y, objZ);
                    previewState.scene.add(objectMesh);
                }
            });
        }
    }
}

function animatePreview() {
    if (!previewState.isActive) return;
    previewState.animationFrameId = requestAnimationFrame(animatePreview);
    handlePreviewResize(); 
    const deltaTime = previewState.clock.getDelta();
    updatePlayer(deltaTime);
    updateCamera(); 
    previewState.renderer.render(previewState.scene, previewState.camera);
}

// =======================================================================
// === INICIALIZACIÓN Y EVENT LISTENERS (ACTUALIZADO) ====================
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('editorWorldData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            worldData.metadata = parsedData.metadata || { playerStartPosition: null };
            worldData.chunks = parsedData.chunks || parsedData;
        } catch (e) {
            console.error("No se pudieron cargar los datos guardados.", e);
        }
    }

    populatePalettes();
    renderGrid();
    selectTool('texture', 'grass');

    editorDOM.mapGrid.addEventListener('mousedown', handleGridClick);
    editorDOM.zoomInButton.addEventListener('click', zoomIn);
    editorDOM.zoomOutButton.addEventListener('click', zoomOut);
    editorDOM.saveButton.addEventListener('click', saveWorldData);
    editorDOM.previewButton.addEventListener('click', startPreview);
    editorDOM.previewModalCloseBtn.addEventListener('click', stopPreview);
    
    if(editorDOM.importCharacterButton) {
        editorDOM.importCharacterButton.addEventListener('click', openCharacterModal);
    }
    if(editorDOM.characterModalCloseBtn) {
        editorDOM.characterModalCloseBtn.addEventListener('click', closeCharacterModal);
    }
    
    const container = editorDOM.mapGridContainer;
    container.addEventListener('mousedown', startPanning);
    container.addEventListener('mouseup', stopPanning);
    container.addEventListener('mouseleave', stopPanning);
    container.addEventListener('mousemove', doPanning);
});
