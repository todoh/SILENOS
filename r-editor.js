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
async function exportStandaloneHTML() {
    try {
        const worldNameRaw = document.getElementById('r-load-world-select')?.value || 'Mi-Mundo';
        const worldName = worldNameRaw.replace(WORLD_DATA_NAME_PREFIX, '').replace(/\s+/g, '-');
        const fileName = `${worldName}.html`;

        alert(`Iniciando la exportación de "${fileName}". El proceso puede tardar unos segundos...`);

        const rDataJsContent = await fetch(document.querySelector('script[src*="r-data.js"]').src).then(res => res.text());
        let rPreview3dJsContent = await fetch(document.querySelector('script[src*="r-preview-3d.js"]').src).then(res => res.text());

        // --- PARCHES DE CÓDIGO PARA EL ARCHIVO EXPORTADO ---

        // 1. Eliminar la dependencia del modal del editor
        rPreview3dJsContent = rPreview3dJsContent
            .replace("document.getElementById('r-preview-modal').style.display = 'flex';", "")
            .replace("document.getElementById('r-preview-modal').style.display = 'none';", "");

        // 2. <-- ¡CORRECCIÓN CLAVE! Anular la función que busca imágenes en el DOM del editor.
        rPreview3dJsContent = rPreview3dJsContent.replace(
            /function findCharacterImageSrc\s*\([^)]*\)\s*\{[\s\S]*?\}/, 
            'function findCharacterImageSrc(dataRefName) { return null; }'
        );

        // 3. <-- ¡CORRECCIÓN CLAVE! Modificar la lógica de carga para que use los datos internos.
        rPreview3dJsContent = rPreview3dJsContent.replace(
            "iconSrc = findCharacterImageSrc(obj.dataRef);",
            "iconSrc = entityData ? entityData.icon : null;"
        );
        
        // --- FIN DE LOS PARCHES ---

        const worldDataJson = JSON.stringify(worldData, null, 2);
        const customEntitiesJson = JSON.stringify(tools.customEntities, null, 2);

        const htmlTemplate = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visor de Mundo: ${worldName}</title>
    <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
        #r-game-container { width: 100%; height: 100%; }
        .info-box { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 5px; font-family: sans-serif; }
    </style>
</head>
<body>
    <div id="r-game-container"></div>
    <div class="info-box">Mundo: ${worldName}</div>

    <script src="https://cdn.jsdelivr.net/npm/three@0.138.3/build/three.min.js"><\/script>

    <script id="r-data-script">
        ${rDataJsContent}
    <\/script>
    
    <script id="exported-world-data">
        worldData = ${worldDataJson};
    <\/script>

    <script id="exported-custom-entities">
        if (window.tools) {
            window.tools.customEntities = ${customEntitiesJson};
        }
    <\/script>

    <script id="r-preview-3d-script">
        ${rPreview3dJsContent}
    <\/script>

    <script id="launcher">
        window.addEventListener('load', () => {
            console.log("Iniciando vista previa del mundo exportado...");
            startPreview();
        });
    <\/script>
</body>
</html>`;

        const blob = new Blob([htmlTemplate], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        alert(`¡"${fileName}" exportado con éxito!`);

    } catch (error) {
        console.error("Error durante la exportación a HTML:", error);
        alert("Ocurrió un error al intentar exportar el archivo. Revisa la consola para más detalles.");
    }
}


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

function updateCollisionFieldsVisibility() {
    const tipo = editorDOM.editColisionTipoSelect.value;
    const radioContainer = document.getElementById('edit-colision-radio-container');
    const alturaContainer = document.getElementById('edit-colision-altura-container');

    radioContainer.style.display = (tipo === 'capsula' || tipo === 'esfera') ? 'block' : 'none';
    alturaContainer.style.display = (tipo === 'capsula' || tipo === 'caja') ? 'block' : 'none';
}

async function generate3DPreview(modelJson, size = 450) {
    if (typeof THREE === 'undefined' || typeof createModelFromJSON === 'undefined') {
        console.error("generate3DPreview requiere THREE.js y createModelFromJSON.");
        return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="40">❓</text></svg>';
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(1.5, 2, 1);
    scene.add(dirLight);

    const model = createModelFromJSON(modelJson);
    scene.add(model);

    const box = new THREE.Box3().setFromObject(model);
    const modelSize = box.getSize(new THREE.Vector3());
    const modelCenter = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.6;

    camera.position.set(modelCenter.x, modelCenter.y, modelCenter.z + cameraZ);
    camera.lookAt(modelCenter);

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    renderer.dispose();
    model.traverse(object => {
        if (object.isMesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) object.material.dispose();
        }
    });

    return dataUrl;
}

// EN: r-editor.js
// REEMPLAZA ESTA FUNCIÓN COMPLETA

async function populatePalettes() {
    editorDOM.texturePalette.innerHTML = '<h2>Texturas de Terreno</h2>';
    editorDOM.entityPalette.innerHTML = '<h2>Entidades</h2>';

    const textureGrid = document.createElement('div');
    textureGrid.className = 'palette-container';
    editorDOM.texturePalette.appendChild(textureGrid);

    const entityGrid = document.createElement('div');
    entityGrid.className = 'palette-container';
    editorDOM.entityPalette.appendChild(entityGrid);

    // Dibuja la herramienta de borrar
    const eraserTool = tools.entities.eraser;
    if (eraserTool) {
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'entity';
        btn.dataset.id = 'eraser';
        btn.innerHTML = `<div class="palette-item-preview palette-item-preview-emoji">${eraserTool.icon}</div><span>${eraserTool.name}</span>`;
        btn.onclick = () => selectTool('entity', 'eraser');
        entityGrid.appendChild(btn);
    }

    // Dibuja las texturas de terreno
    for (const id in tools.textures) {
        const tool = tools.textures[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'texture';
        btn.dataset.id = id;
        btn.innerHTML = `<div class="palette-item-preview"><div class="color-swatch" style="background-color:${tool.color};"></div></div><span>${tool.name}</span>`;
        btn.onclick = () => selectTool('texture', id);
        textureGrid.appendChild(btn);
    }

    // --- LÓGICA CORREGIDA ---
    // 1. Carga PRIMERO todas las entidades predefinidas de r-data.js
    for (const id in tools.entities) {
        if (id === 'eraser') continue;

        const tool = tools.entities[id];
        const btn = document.createElement('button');
        btn.className = 'palette-item';
        btn.dataset.category = 'entity';
        btn.dataset.id = id;

        let previewHTML = '';
        if (tool.model) {
            // Genera la preview 3D para los modelos predefinidos
            try {
                const previewSrc = await generate3DPreview(tool.model);
                previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${tool.name}"></div>`;
            } catch (e) {
                console.error(`Falló la previsualización para el modelo predefinido '${id}':`, e);
                previewHTML = `<div class="palette-item-preview palette-item-preview-emoji">⚠️</div>`;
            }
        } else {
            previewHTML = `<div class="palette-item-preview palette-item-preview-emoji">${tool.icon || '❓'}</div>`;
        }
        
        btn.innerHTML = `${previewHTML}<span>${tool.name}</span>`;
        btn.onclick = () => selectTool('entity', id);
        entityGrid.appendChild(btn);
    }

    // 2. DESPUÉS, llama a la función para cargar los assets personalizados del arco "Videojuego".
    // Esto asegura que no haya conflictos y que el flujo de carga sea correcto.
    await autoLoadGameAssets();
}


async function importCharacterAsTool(event) {
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
            const loadedChunks = {};

            for (const chunkId in parsedData.chunks) {
                const chunkData = parsedData.chunks[chunkId];
                if (Array.isArray(chunkData)) {
                    loadedChunks[chunkId] = {
                        groundTextureKey: chunkData[0],
                        objects: chunkData[1] || []
                    };
                } else {
                    loadedChunks[chunkId] = chunkData;
                }
            }
            
            worldData = {
                metadata: parsedData.metadata || { playerStartPosition: null },
                chunks: loadedChunks
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

    const finalName = `${WORLD_DATA_NAME_PREFIX}${name.trim()}`;

    const dataToSave = {
        metadata: worldData.metadata,
        chunks: {}
    };

    for (const chunkId in worldData.chunks) {
        const chunk = worldData.chunks[chunkId];
        dataToSave.chunks[chunkId] = [
            chunk.groundTextureKey,
            chunk.objects
        ];
    }

    const worldJson = JSON.stringify(dataToSave, null, 2);
    let existingDatoElement = null;
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === finalName) {
            existingDatoElement = charElement;
            break;
        }
    }

    if (existingDatoElement) {
        if (confirm(`Ya existe un mundo llamado "${name.trim()}". ¿Quieres sobrescribirlo?`)) {
            const promptVisualTextarea = existingDatoElement.querySelector('.prompt-visualh');
            if (promptVisualTextarea) {
                promptVisualTextarea.value = worldJson;
                alert(`¡Mundo "${name.trim()}" sobrescrito correctamente!`);
            } else {
                alert("Error: No se pudo encontrar el campo de datos del mundo existente para sobrescribir.");
            }
        } else {
            alert("Guardado cancelado.");
            return;
        }
    } else {
        if (typeof agregarPersonajeDesdeDatos !== 'function') {
            alert("Error: La función para crear datos ('agregarPersonajeDesdeDatos') no está disponible.");
            return;
        }
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
        alert(`¡Mundo "${name.trim()}" guardado como un dato completo!`);
    }

    if (typeof reinicializarFiltrosYActualizarVista === 'function') {
        reinicializarFiltrosYActualizarVista();
    }
    populateWorldList();
}

async function autoLoadGameAssets() {
    console.log("Buscando y actualizando assets de videojuego para cargar...");

    document.querySelectorAll('.palette-item[data-category="customEntity"]').forEach(btn => btn.remove());
    tools.customEntities = {};

    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (!entityGrid) {
        console.error("No se encontró el contenedor de la paleta de entidades.");
        return;
    }

    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');

    for (const charElement of characterDataElements) {
        const arco = charElement.querySelector('.change-arc-btn')?.dataset.arco;

        if (arco === 'videojuego') {
            const nombre = charElement.querySelector('.nombreh')?.value;
            if (!nombre) continue;

            const propiedadesJuego = procesarPropiedadesVideojuego(charElement);
            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
            const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
            
            let modelType = 'sprite';
            let modelData = null;

            // **MODIFICADO**: Detectar modelos 3D
            if (promptVisualText) {
                try {
                    const parsed = JSON.parse(promptVisualText);
                    if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) {
                        modelType = 'json3d';
                        modelData = parsed;
                    }
                } catch (e) { /* No es JSON, se mantiene como 'sprite' */ }
            }

            const newTool = {
                name: nombre,
                type: 'custom',
                modelType: modelType,
                dataRef: nombre,
                isSolid: propiedadesJuego.fisica ? !propiedadesJuego.fisica.estatico : true,
                radius: propiedadesJuego.colision ? propiedadesJuego.colision.radio : 1.2,
                gameProps: propiedadesJuego 
            };

            let previewHTML = '';
            const imagenSrc = charElement.querySelector('.personaje-visual img')?.src;

            if (modelType === 'json3d' && modelData) {
                newTool.icon = modelData;
                const previewSrc = await generate3DPreview(modelData);
                previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${nombre}"></div>`;
            } else if (imagenSrc && !imagenSrc.endsWith('/')) {
                newTool.icon = imagenSrc;
                previewHTML = `<div class="palette-item-preview"><img src="${imagenSrc}" alt="${nombre}"></div>`;
            } else {
                console.warn(`Asset '${nombre}' omitido por falta de contenido visual válido.`);
                continue;
            }

            tools.customEntities[toolId] = newTool;

            const btn = document.createElement('button');
            btn.className = 'palette-item';
            btn.dataset.category = 'customEntity';
            btn.dataset.id = toolId;
            btn.innerHTML = `
                ${previewHTML}
                <span>${nombre}</span>
            `;
            btn.onclick = () => selectTool('customEntity', toolId);
            entityGrid.appendChild(btn);
        }
    }
    console.log(`Assets desde el arco 'videojuego' actualizados. Total: ${Object.keys(tools.customEntities).length}`);
}

async function refreshGameAssetsPalette() {
    console.log("Actualizando assets de la paleta...");

    document.querySelectorAll('.palette-item[data-category="customEntity"]').forEach(btn => btn.remove());
    tools.customEntities = {};

    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (!entityGrid) {
        console.error("No se encontró el contenedor de la paleta de entidades.");
        return;
    }
    
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    
    for (const charElement of characterDataElements) {
        const arco = charElement.querySelector('.change-arc-btn')?.dataset.arco;
        
        if (arco === 'videojuego') {
            const nombre = charElement.querySelector('.nombreh')?.value;
            if (!nombre) continue;

            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
            
            if (tools.customEntities[toolId]) continue;

            const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
            let modelType = 'sprite';
            let modelData = null;

            if (promptVisualText) {
                try {
                    const parsed = JSON.parse(promptVisualText);
                    if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.parts) || Array.isArray(parsed.objects))) {
                        modelType = 'json3d';
                        modelData = parsed;
                    }
                } catch (e) { /* No es JSON, se queda como sprite */ }
            }
            
            const newTool = {
                name: nombre,
                type: 'custom',
                modelType: modelType,
                dataRef: nombre,
                isSolid: true,
                radius: 1.2
            };

            let previewHTML = '';
            const imagenSrc = charElement.querySelector('.personaje-visual img')?.src;

            if (modelType === 'json3d' && modelData) {
                 newTool.icon = modelData;
                 const previewSrc = await generate3DPreview(modelData);
                 previewHTML = `<div class="palette-item-preview"><img src="${previewSrc}" alt="${nombre}"></div>`;
            } else if (imagenSrc && !imagenSrc.endsWith('/')) {
                 newTool.icon = imagenSrc;
                 previewHTML = `<div class="palette-item-preview"><img src="${imagenSrc}" alt="${nombre}"></div>`;
            } else {
                continue;
            }

            tools.customEntities[toolId] = newTool;

            const btn = document.createElement('button');
            btn.className = 'palette-item';
            btn.dataset.category = 'customEntity';
            btn.dataset.id = toolId;
            btn.innerHTML = `${previewHTML}<span>${nombre}</span>`;
            btn.onclick = () => selectTool('customEntity', toolId);
            entityGrid.appendChild(btn);
        }
    }
    console.log("Assets de la paleta actualizados.", tools.customEntities);
}

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

function procesarPropiedadesVideojuego(charElement) {
    const promptVisualTextarea = charElement.querySelector('.descripcionh');
    if (!promptVisualTextarea) {
        console.warn("No se encontró el textarea '.descripcionh' para el dato:", charElement);
        return {};
    }

    const KEYWORD = 'Videojuego';
    const SEPARATOR = '---';
    let currentText = promptVisualTextarea.value.trim();
    let gameProps = {};

    const defaultProps = {
        tamano: { x: 3, y: 4.8, z: 1 },
        rotacionY: 0,
        esCubo3D: false,
        esCilindro3D: false,
        colision: { tipo: 'capsula', radio: 0.5, altura: 1.8 },
        interactable: false,
        fisica: { estatico: true, masa: 0 },
        movimiento: [] 
    };

    if (currentText.startsWith(KEYWORD)) {
        const separatorIndex = currentText.indexOf(SEPARATOR);
        const jsonText = currentText.substring(KEYWORD.length, separatorIndex > -1 ? separatorIndex : undefined).trim();

        try {
            if (jsonText) {
                gameProps = JSON.parse(jsonText);
                console.log(`Propiedades de videojuego leídas para "${charElement.querySelector('.nombreh')?.value}".`);
            } else {
                 gameProps = defaultProps;
            }
        } catch (e) {
            console.error(`Error al parsear las propiedades JSON para "${charElement.querySelector('.nombreh')?.value}". Se usarán las de por defecto. Error:`, e);
            gameProps = defaultProps;
        }
    } else {
        gameProps = defaultProps;
        const propsJsonString = JSON.stringify(gameProps, null, 2);
        
        let newTextContent = `${KEYWORD}\n${propsJsonString}`;
        if (currentText.length > 0) {
            newTextContent += `\n\n${SEPARATOR}\n\n${currentText}`;
        }

        promptVisualTextarea.value = newTextContent;
        console.log(`Propiedades de videojuego por defecto CREADAS para "${charElement.querySelector('.nombreh')?.value}".`);
    }

    return gameProps;
}

// EN: r-editor.js (Añadir al final del archivo)

/**
 * Recorre todos los datos en la lista principal (#listapersonajes) y genera
 * la previsualización 3D inicial para aquellos que tengan un modelo JSON válido.
 * Esta función se llama al cargar la página para asegurar que todo esté visible.
 */
async function renderizarPreviewsInicialesDeDatos() {
    console.log("Iniciando renderizado de previsualizaciones 3D en las tarjetas de Datos...");
    const todosLosDatos = document.querySelectorAll('#listapersonajes .personaje');

    for (const datoDIV of todosLosDatos) {
        const textarea = datoDIV.querySelector('.prompt-visualh');
        
        if (textarea && textarea.value) {
            let modelData = null;
            try {
                const parsed = JSON.parse(textarea.value);
                if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.objects) || (parsed.model && Array.isArray(parsed.model.objects)))) {
                    modelData = parsed.model || parsed;
                }
            } catch (e) {
                // No es un JSON 3D, no hacemos nada.
                continue;
            }

            if (modelData) {
                try {
                    // Llamamos a generate3DPreview (que está en este mismo archivo) con alta resolución.
                    const previewDataUrl = await generate3DPreview(modelData, 300);
                    
                    const imgPreview = datoDIV.querySelector('.personaje-visual img');
                    if (imgPreview) {
                        imgPreview.src = previewDataUrl;
                        imgPreview.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error(`Error generando preview inicial para el dato '${datoDIV.querySelector('.nombreh')?.value}':`, error);
                }
            }
        }
    }
}