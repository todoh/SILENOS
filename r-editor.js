// =======================================================================
// === LÓGICA DEL EDITOR (UI, EVENTOS E INICIALIZACIÓN) ==================
// =======================================================================

// Estado actual del editor
let activeTool = { type: 'texture', id: 'grass' };
let currentZoom = 1.0;
const WORLD_DATA_NAME_PREFIX = 'Mundo - '; // Prefijo para los nombres de datos de mundos
let editorState = {
    isPickingCoordinate: false, // ¿Estamos esperando un clic en el mapa?
    entityBeingEdited: null,    // ¿Qué objeto del mapa estábamos editando?
};
// Referencias a los elementos del DOM.
const editorDOM = {
    mapGridContainer: document.getElementById('r-map-grid-container'),
    mapGrid: document.getElementById('r-map-grid'),
    texturePalette: document.getElementById('r-texture-palette'),
    entityPalette: document.getElementById('r-entity-palette'),
    previewButton: document.getElementById('r-preview-button'),
    saveButton: document.getElementById('r-save-button'),
    exportHtmlButton: document.getElementById('r-export-html-button'),
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
    editEntityModal: document.getElementById('r-edit-entity-modal'),
    editEntityCloseBtn: document.getElementById('r-edit-entity-close-btn'),
    editEntitySaveBtn: document.getElementById('r-edit-entity-save-btn'),
    editEntityNameSpan: document.getElementById('r-edit-entity-name'),
    editColisionTipoSelect: document.getElementById('edit-colision-tipo'),
    
};

// =======================================================================
// === FUNCIÓN DE EXPORTACIÓN A HTML (CORREGIDA) =========================
// =======================================================================

/**
 * Recopila todos los recursos necesarios (JS, CSS, datos del mundo y entidades personalizadas) 
 * y los empaqueta en un único archivo HTML auto-ejecutable que se descarga.
 */


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

                        // **MODIFICADO**: Detectar si es un modelo 3D por su tipo
                        if (modelType === 'json3d') {
                             subCell.innerHTML = `<span style="font-size: 20px;">🧊</span>`;
                             subCell.title = entity.dataRef || entity.type;
                        } else {
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
                                subCell.innerHTML = `<img src="${iconSrc}" style="width: 20px; height: 20px; object-fit: contain;" alt="${entity.dataRef || ''}">`;
                            } else if (entity.dataRef) {
                                subCell.innerHTML = `❓`;
                                subCell.title = `Referencia rota a: ${entity.dataRef}`;
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
    const [chunkX, chunkZ] = chunkId.split('_').map(Number);
    const subX = parseInt(subCell.dataset.subX, 10);
    const subZ = parseInt(subCell.dataset.subZ, 10);
    const chunk = worldData.chunks[chunkId];

    if (editorState.isPickingCoordinate) {
        if (!editorState.entityBeingEdited) {
            console.warn("Se intentó seleccionar coordenada sin una entidad en edición. Saliendo del modo selección.");
            editorState.isPickingCoordinate = false;
            editorDOM.mapGrid.style.cursor = 'pointer';
            return; 
        }

        const worldX = (chunkX * CHUNK_SIZE) + (subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
        const worldZ = (chunkZ * CHUNK_SIZE) + (subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
        
        const datoElement = findDatoElementByName(editorState.entityBeingEdited.dataRef);
        if (datoElement) {
            const props = procesarPropiedadesVideojuego(datoElement);
            const nuevoPaso = { tipo: 'ir_a', coordenadas: { x: worldX, z: worldZ } };
            
            if (!props.movimiento) props.movimiento = [];
            props.movimiento.push(nuevoPaso);

            const KEYWORD = 'Videojuego';
            const SEPARATOR = '---';
            const oldText = datoElement.querySelector('.descripcionh').value;
            const separatorIndex = oldText.indexOf(SEPARATOR);
            const descriptionText = separatorIndex > -1 ? oldText.substring(separatorIndex) : '';
            const newJsonString = JSON.stringify(props, null, 2);
            datoElement.querySelector('.descripcionh').value = `${KEYWORD}\n${newJsonString}\n\n${descriptionText}`.trim();

            console.log(`Coordenada (${worldX}, ${worldZ}) añadida a la ruta de ${editorState.entityBeingEdited.dataRef}`);
        }
        openEntityEditorModal(editorState.entityBeingEdited);
        editorState.isPickingCoordinate = false;
        editorDOM.mapGrid.style.cursor = 'pointer';
        return;
    }

    const existingObjectIndex = chunk.objects.findIndex(obj => obj.subX === subX && obj.subZ === subZ);
    
    if (activeTool.id === 'eraser') {
        let somethingWasDeleted = false;
        if (existingObjectIndex > -1) {
            chunk.objects.splice(existingObjectIndex, 1);
            somethingWasDeleted = true;
        }
        const playerStart = worldData.metadata.playerStartPosition;
        if (playerStart && playerStart.chunkX === chunkX && playerStart.chunkZ === chunkZ && playerStart.subX === subX && playerStart.subZ === subZ) {
            worldData.metadata.playerStartPosition = null;
            somethingWasDeleted = true;
        }
        if (somethingWasDeleted) {
            renderGrid();
        }
        return;
    }

    if (existingObjectIndex > -1) {
        const existingObject = chunk.objects[existingObjectIndex];
        openEntityEditorModal(existingObject);
        return;
    }

    if (activeTool.category === 'texture') {
        chunk.groundTextureKey = activeTool.id;
    } else if (activeTool.category === 'entity' || activeTool.category === 'customEntity') {
        if (activeTool.id === 'playerStart') {
            worldData.metadata.playerStartPosition = { chunkX, chunkZ, subX, subZ };
        } else {
            const newObject = { type: activeTool.id, subX, subZ };
            if (activeTool.category === 'customEntity') {
                const toolData = tools.customEntities[activeTool.id];
                if (toolData) {
                    newObject.dataRef = toolData.dataRef;
                    newObject.modelType = toolData.modelType; // **IMPORTANTE**: Guardar el tipo de modelo
                }
            }
            chunk.objects.push(newObject);
        }
    }
    
    renderGrid();
}

function findDatoElementByName(name) {
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of characterDataElements) {
        if (charElement.querySelector('.nombreh')?.value === name) {
            return charElement;
        }
    }
    return null;
}

function openEntityEditorModal(entity) {
    if (!entity.dataRef) {
        alert("Este objeto no es personalizable (no proviene de un 'Dato').");
        return;
    }

    const datoElement = findDatoElementByName(entity.dataRef);
    if (!datoElement) {
        alert(`No se encontró el "Dato" original llamado "${entity.dataRef}".`);
        return;
    }

    editorState.entityBeingEdited = entity;

    const props = procesarPropiedadesVideojuego(datoElement);
    renderizarRutaMovimiento(props.movimiento || []);
    
    editorDOM.editEntityNameSpan.textContent = entity.dataRef;
    document.getElementById('edit-tamano-x').value = props.tamano?.x || 1;
    document.getElementById('edit-tamano-y').value = props.tamano?.y || 1.8;
    document.getElementById('edit-tamano-z').value = props.tamano?.z || 1;
    document.getElementById('edit-rotacion-y').value = props.rotacionY || 0;
    document.getElementById('edit-es-cubo-3d').checked = props.esCubo3D || false;
    document.getElementById('edit-es-cilindro-3d').checked = props.esCilindro3D || false;
    document.getElementById('edit-colision-tipo').value = props.colision?.tipo || 'ninguna';
    document.getElementById('edit-colision-radio').value = props.colision?.radio || 0.5;
    document.getElementById('edit-colision-altura').value = props.colision?.altura || 1.8;
    
    updateCollisionFieldsVisibility();

    editorDOM.editEntityModal.dataset.editingDatoName = entity.dataRef;
    editorDOM.editEntityModal.style.display = 'flex';
}

function saveEntityProperties() {
    const datoName = editorDOM.editEntityModal.dataset.editingDatoName;
    if (!datoName) return;

    const datoElement = findDatoElementByName(datoName);
    if (!datoElement) {
        alert("Error: Se perdió la referencia al 'Dato' original.");
        return;
    }

    const newProps = {
        tamano: {
            x: parseFloat(document.getElementById('edit-tamano-x').value),
            y: parseFloat(document.getElementById('edit-tamano-y').value),
            z: parseFloat(document.getElementById('edit-tamano-z').value)
        },
        rotacionY: parseFloat(document.getElementById('edit-rotacion-y').value),
        esCubo3D: document.getElementById('edit-es-cubo-3d').checked,
        esCilindro3D: document.getElementById('edit-es-cilindro-3d').checked,
        colision: {
            tipo: document.getElementById('edit-colision-tipo').value,
            radio: parseFloat(document.getElementById('edit-colision-radio').value),
            altura: parseFloat(document.getElementById('edit-colision-altura').value)
        },
        movimiento: []
    };
    
    const pasos = document.querySelectorAll('#edit-movimiento-lista .ruta-paso');
    pasos.forEach(pasoEl => {
        const pasoData = {
            tipo: pasoEl.dataset.tipo,
        };
        if (pasoData.tipo === 'aleatorio') {
            pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
        } else if (pasoData.tipo === 'ir_a') {
            pasoData.coordenadas = {
                x: parseFloat(pasoEl.dataset.x),
                z: parseFloat(pasoEl.dataset.z)
            };
        }
        newProps.movimiento.push(pasoData);
    });

    const KEYWORD = 'Videojuego';
    const SEPARATOR = '---';
    const promptVisualTextarea = datoElement.querySelector('.descripcionh');
    const oldText = promptVisualTextarea.value;
    
    const separatorIndex = oldText.indexOf(SEPARATOR);
    const descriptionText = separatorIndex > -1 ? oldText.substring(separatorIndex) : '';

    const newJsonString = JSON.stringify(newProps, null, 2);
    promptVisualTextarea.value = `${KEYWORD}\n${newJsonString}\n\n${descriptionText}`.trim();

    alert(`Propiedades de "${datoName}" actualizadas!`);
    editorDOM.editEntityModal.style.display = 'none';
}

function renderizarRutaMovimiento(ruta) {
    const listaEl = document.getElementById('edit-movimiento-lista');
    listaEl.innerHTML = '';

    if (!ruta || ruta.length === 0) {
        listaEl.innerHTML = '<p style="color: #999; font-style: italic;">Sin ruta de movimiento.</p>';
        return;
    }

    ruta.forEach((paso, index) => {
        const pasoEl = document.createElement('div');
        pasoEl.className = 'ruta-paso';
        pasoEl.dataset.tipo = paso.tipo;

        let textoPaso = '';
        if (paso.tipo === 'aleatorio') {
            const duracionTexto = paso.duracion === null ? '(infinito)' : `(${paso.duracion}s)`;
            textoPaso = `Movimiento Aleatorio ${duracionTexto}`;
            pasoEl.dataset.duracion = paso.duracion;
        } else if (paso.tipo === 'ir_a') {
            textoPaso = `Ir a Coordenada (X: ${paso.coordenadas.x}, Z: ${paso.coordenadas.z})`;
            pasoEl.dataset.x = paso.coordenadas.x;
            pasoEl.dataset.z = paso.coordenadas.z;
        }

        pasoEl.innerHTML = `<span>${index + 1}. ${textoPaso}</span> <button title="Eliminar paso">&times;</button>`;
        pasoEl.querySelector('button').onclick = () => {
            ruta.splice(index, 1);
            renderizarRutaMovimiento(ruta);
        };

        listaEl.appendChild(pasoEl);
    });
}
 
function iniciarModoSeleccionCoordenada() {
    if (!editorState.entityBeingEdited) {
        alert("Error: No hay ninguna entidad seleccionada para editar.");
        return;
    }
    console.log("Iniciando modo de selección de coordenadas...");
    editorState.isPickingCoordinate = true;
    editorDOM.editEntityModal.style.display = 'none';
    editorDOM.mapGrid.style.cursor = 'crosshair';
}
 
document.addEventListener('DOMContentLoaded', () => {
    if (!worldData.metadata.playerStartPosition) {
        console.log("No se encontró una posición de inicio. Estableciendo por defecto en (0,0).");
        worldData.metadata.playerStartPosition = { chunkX: 0, chunkZ: 0, subX: 0, subZ: 0 };
    }

    populatePalettes();
    renderGrid();
    selectTool('texture', 'grass');
    populateWorldList();

    editorDOM.mapGrid.addEventListener('mousedown', handleGridClick);
    editorDOM.zoomInButton.addEventListener('click', zoomIn);
    editorDOM.zoomOutButton.addEventListener('click', zoomOut);
    editorDOM.saveButton.addEventListener('click', saveWorldToCharacter);
    
    if (editorDOM.exportHtmlButton) {
        editorDOM.exportHtmlButton.addEventListener('click', exportStandaloneHTML);
    }
    
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

    if (editorDOM.editEntityModal) {
        editorDOM.editEntityCloseBtn.addEventListener('click', () => editorDOM.editEntityModal.style.display = 'none');
        editorDOM.editEntitySaveBtn.addEventListener('click', saveEntityProperties);
        editorDOM.editColisionTipoSelect.addEventListener('change', updateCollisionFieldsVisibility);

        const cuboCheckbox = document.getElementById('edit-es-cubo-3d');
        const cilindroCheckbox = document.getElementById('edit-es-cilindro-3d');

        cuboCheckbox.addEventListener('change', () => {
            if (cuboCheckbox.checked) {
                cilindroCheckbox.checked = false;
            }
        });

        cilindroCheckbox.addEventListener('change', () => {
            if (cilindroCheckbox.checked) {
                cuboCheckbox.checked = false;
            }
        });
    }
    
    const btnAnadirAleatorio = document.getElementById('movimiento-anadir-aleatorio-btn');
    const btnSeleccionarCoord = document.getElementById('movimiento-seleccionar-coord-btn');
    const paramsAleatorioContainer = document.getElementById('movimiento-params-aleatorio');
    const btnConfirmarAleatorio = document.getElementById('movimiento-confirmar-aleatorio-btn');

    if (btnAnadirAleatorio) {
        btnAnadirAleatorio.addEventListener('click', () => {
            paramsAleatorioContainer.style.display = 'block';
        });
    }

    if (btnSeleccionarCoord) {
        btnSeleccionarCoord.addEventListener('click', iniciarModoSeleccionCoordenada);
    }

    if (btnConfirmarAleatorio) {
        btnConfirmarAleatorio.addEventListener('click', () => {
            paramsAleatorioContainer.style.display = 'none';
            const listaEl = document.getElementById('edit-movimiento-lista');
            let rutaActual = [];
            const pasosActuales = listaEl.querySelectorAll('.ruta-paso');
            pasosActuales.forEach(pasoEl => {
                const pasoData = { tipo: pasoEl.dataset.tipo };
                if (pasoData.tipo === 'aleatorio') pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
                else if (pasoData.tipo === 'ir_a') pasoData.coordenadas = { x: parseFloat(pasoEl.dataset.x), z: parseFloat(pasoEl.dataset.z) };
                rutaActual.push(pasoData);
            });

            const duracionInput = document.getElementById('movimiento-duracion-nuevo');
            const nuevoPaso = { 
                tipo: 'aleatorio',
                duracion: duracionInput.value ? parseFloat(duracionInput.value) : null 
            };
            
            rutaActual.push(nuevoPaso);
            renderizarRutaMovimiento(rutaActual);
        });
    }
});






document.addEventListener('DOMContentLoaded', async () => {
    await populatePalettes();
    renderGrid();
    selectTool('texture', 'grass');
    populateWorldList();

    editorDOM.mapGrid.addEventListener('mousedown', handleGridClick);
    editorDOM.zoomInButton.addEventListener('click', zoomIn);
    if (editorDOM.editEntityModal) {
        editorDOM.editEntityCloseBtn.addEventListener('click', () => editorDOM.editEntityModal.style.display = 'none');
        editorDOM.editEntitySaveBtn.addEventListener('click', saveEntityProperties);
        editorDOM.editColisionTipoSelect.addEventListener('change', updateCollisionFieldsVisibility);
    }
});

function selectTool(category, id) {
    activeTool = { category, id };
    document.querySelectorAll('.palette-item.selected').forEach(el => el.classList.remove('selected'));
    document.querySelector(`.palette-item[data-id='${id}']`).classList.add('selected');
}

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

// **MODIFICADO**: Ahora detecta modelos 3D en el 'promptVisual'
function openCharacterModal() { editorDOM.characterGrid.innerHTML = ''; const modalTitle = editorDOM.characterModal.querySelector('h3'); if(modalTitle) { modalTitle.textContent = 'Selecciona un Dato para Importar'; } const characterDataElements = document.querySelectorAll('#listapersonajes .personaje'); characterDataElements.forEach(charElement => { const nombre = charElement.querySelector('.nombreh')?.value; if (!nombre) return; const promptVisualText = charElement.querySelector('.prompt-visualh')?.value; let isJsonModel = false; let jsonData = null; if (promptVisualText) { try { const parsed = JSON.parse(promptVisualText); if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) { isJsonModel = true; jsonData = parsed; } } catch (e) {} } const item = document.createElement('div'); item.className = 'character-grid-item'; item.dataset.name = nombre; if (isJsonModel) { item.dataset.type = 'json3d'; item.dataset.modelData = JSON.stringify(jsonData); item.innerHTML = `<div style="width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🧊</div><span>${nombre}</span>`; item.onclick = importCharacterAsTool; editorDOM.characterGrid.appendChild(item); } else { const imagenSrc = charElement.querySelector('.personaje-visual img')?.src; if (imagenSrc && !imagenSrc.endsWith('/')) { item.dataset.type = 'sprite'; item.dataset.imgSrc = imagenSrc; item.innerHTML = `<img src="${imagenSrc}" alt="${nombre}"><span>${nombre}</span>`; item.onclick = importCharacterAsTool; editorDOM.characterGrid.appendChild(item); } } }); editorDOM.characterModal.style.display = 'flex'; }
function closeCharacterModal() { editorDOM.characterModal.style.display = 'none'; }



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

window.addEventListener('load', () => {
    let attempts = 0;
    const maxAttempts = 20;

    const tryLoadAssets = () => {
        const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
        const videoGameAssets = Array.from(characterDataElements).filter(el => el.querySelector('.change-arc-btn')?.dataset.arco === 'videojuego');

        if (videoGameAssets.length > 0 && videoGameAssets.every(el => el.querySelector('.personaje-visual img')?.complete)) {
            console.log("Assets de 'Videojuego' listos. Cargando en la paleta...");
            autoLoadGameAssets();
                 renderizarPreviewsInicialesDeDatos();
        } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(tryLoadAssets, 500);
        } else {
            console.warn("No se pudieron cargar automáticamente los assets de 'Videojuego' después de varios intentos.");
        }
    };

    tryLoadAssets();
});


 