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
     // ▼▼▼ AÑADE ESTAS NUEVAS REFERENCIAS AL MODAL DE EDICIÓN ▼▼▼
    editEntityModal: document.getElementById('r-edit-entity-modal'),
    editEntityCloseBtn: document.getElementById('r-edit-entity-close-btn'),
    editEntitySaveBtn: document.getElementById('r-edit-entity-save-btn'),
    editEntityNameSpan: document.getElementById('r-edit-entity-name'),
    editColisionTipoSelect: document.getElementById('edit-colision-tipo'),
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

// EN: r-editor.js
// REEMPLAZA ESTA FUNCIÓN

function handleGridClick(event) {
    if (event.button !== 0) return;
    const subCell = event.target.closest('.subgrid-cell');
    if (!subCell) return;

    const chunkCell = subCell.closest('.grid-cell');
    const chunkId = chunkCell.dataset.chunkId;
    const [chunkX, chunkZ] = chunkId.split('_').map(Number);
    const subX = parseInt(subCell.dataset.subX, 10);
    const subZ = parseInt(subCell.dataset.subZ, 10);

    // ▼▼▼ LÓGICA PRINCIPAL AÑADIDA ▼▼▼
    // Si estamos en modo de selección, capturamos la coordenada y terminamos.
    if (editorState.isPickingCoordinate) {
        // 1. Calcular las coordenadas del mundo real
        const worldX = (chunkX * CHUNK_SIZE) + (subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
        const worldZ = (chunkZ * CHUNK_SIZE) + (subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);

        // 2. Encontrar el "Dato" original que estábamos editando
        const datoElement = findDatoElementByName(editorState.entityBeingEdited.dataRef);
        if (datoElement) {
            // 3. Leer las propiedades actuales (incluyendo la ruta de movimiento)
            const props = procesarPropiedadesVideojuego(datoElement);
            
            // 4. Crear el nuevo paso y añadirlo a la ruta
            const nuevoPaso = { tipo: 'ir_a', coordenadas: { x: worldX, z: worldZ } };
            props.movimiento.push(nuevoPaso);

            // 5. Reconstruir y guardar el contenido en la descripción del "Dato"
            const KEYWORD = 'Videojuego';
            const SEPARATOR = '---';
            const oldText = datoElement.querySelector('.descripcionh').value;
            const separatorIndex = oldText.indexOf(SEPARATOR);
            const descriptionText = separatorIndex > -1 ? oldText.substring(separatorIndex) : '';
            const newJsonString = JSON.stringify(props, null, 2);
            datoElement.querySelector('.descripcionh').value = `${KEYWORD}\n${newJsonString}\n\n${descriptionText}`.trim();

            console.log(`Coordenada (${worldX}, ${worldZ}) añadida a la ruta de ${editorState.entityBeingEdited.dataRef}`);
        }

        // 6. Volver a abrir el modal, que ahora mostrará el paso añadido
        openEntityEditorModal(editorState.entityBeingEdited);

        // 7. Resetear el estado del editor
        editorState.isPickingCoordinate = false;
        editorState.entityBeingEdited = null;
        editorDOM.mapGrid.style.cursor = 'pointer'; // Restaurar cursor
        return; // Detenemos la ejecución aquí
    }
    // ▲▲▲ FIN DE LA LÓGICA DE SELECCIÓN ▲▲▲

    // --- El resto de la función (lógica para colocar/editar/borrar) sigue igual ---
    const chunk = worldData.chunks[chunkId];
    const existingObjectIndex = chunk.objects.findIndex(obj => obj.subX === subX && obj.subZ === subZ);

    if (existingObjectIndex > -1) {
        const existingObject = chunk.objects[existingObjectIndex];
        openEntityEditorModal(existingObject);
        return;
    }

    if (activeTool.category === 'texture') {
        chunk.groundTextureKey = activeTool.id;
    } else if (activeTool.category === 'entity' || activeTool.category === 'customEntity') {
        // ... (resto de la lógica para colocar objetos) ...
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

    renderGrid();
}
// EN: r-editor.js

/**
 * Busca el elemento DOM de un "Dato" en #listapersonajes por su nombre.
 * @param {string} name - El nombre del dato a buscar.
 * @returns {HTMLElement|null} El elemento del DOM o null si no se encuentra.
 */
function findDatoElementByName(name) {
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of characterDataElements) {
        if (charElement.querySelector('.nombreh')?.value === name) {
            return charElement;
        }
    }
    return null;
}

/**
 * Abre el modal de edición, lo rellena con las propiedades actuales del objeto
 * y prepara el botón de guardado.
 * @param {object} entity - El objeto de la entidad del grid cuyos datos se van a editar.
 */
// EN: r-editor.js
// REEMPLAZA ESTA FUNCIÓN

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

    // ▼▼▼ AÑADE ESTA LÍNEA ▼▼▼
    // Guardamos la referencia al objeto del mapa que estamos editando
    editorState.entityBeingEdited = entity;
    // ▲▲▲ FIN DEL AÑADIDO ▲▲▲

    const props = procesarPropiedadesVideojuego(datoElement);
    renderizarRutaMovimiento(props.movimiento || []);
    
    editorDOM.editEntityNameSpan.textContent = entity.dataRef;
    document.getElementById('edit-tamano-x').value = props.tamano?.x || 1;
    document.getElementById('edit-tamano-y').value = props.tamano?.y || 1.8;
    document.getElementById('edit-tamano-z').value = props.tamano?.z || 1;
    
    document.getElementById('edit-colision-tipo').value = props.colision?.tipo || 'ninguna';
    document.getElementById('edit-colision-radio').value = props.colision?.radio || 0.5;
    document.getElementById('edit-colision-altura').value = props.colision?.altura || 1.8;
    
    updateCollisionFieldsVisibility();

    editorDOM.editEntityModal.dataset.editingDatoName = entity.dataRef;
    editorDOM.editEntityModal.style.display = 'flex';
}

/**
 * Lee los valores del modal, reconstruye el string del promptVisual y lo
 * guarda en el textarea del "Dato" original.
 */
function saveEntityProperties() {
    const datoName = editorDOM.editEntityModal.dataset.editingDatoName;
    if (!datoName) return;

    const datoElement = findDatoElementByName(datoName);
    if (!datoElement) {
        alert("Error: Se perdió la referencia al 'Dato' original.");
        return;
    }

    // 1. Lee los nuevos valores del formulario del modal
    const newProps = {
        tamano: {
            x: parseFloat(document.getElementById('edit-tamano-x').value),
            y: parseFloat(document.getElementById('edit-tamano-y').value),
            z: parseFloat(document.getElementById('edit-tamano-z').value)
        },
        colision: {
            tipo: document.getElementById('edit-colision-tipo').value,
            radio: parseFloat(document.getElementById('edit-colision-radio').value),
            altura: parseFloat(document.getElementById('edit-colision-altura').value)
        },

     // ▼▼▼ NUEVA LÓGICA PARA LEER LA RUTA DESDE LA UI ▼▼▼
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
    // ▲▲▲ FIN DE LA NUEVA LÓGICA ▲▲▲

    // 2. Reconstruye el contenido del promptVisual
    const KEYWORD = 'Videojuego';
    const SEPARATOR = '---';
    const promptVisualTextarea = datoElement.querySelector('.descripcionh');
    const oldText = promptVisualTextarea.value;
    
    // Extraemos la descripción de la IA (el texto después del separador)
    const separatorIndex = oldText.indexOf(SEPARATOR);
    const descriptionText = separatorIndex > -1 ? oldText.substring(separatorIndex) : '';

    // Creamos el nuevo contenido
    const newJsonString = JSON.stringify(newProps, null, 2);
    promptVisualTextarea.value = `${KEYWORD}\n${newJsonString}\n\n${descriptionText}`.trim();

    alert(`Propiedades de "${datoName}" actualizadas!`);
    editorDOM.editEntityModal.style.display = 'none';
}
// EN: r-editor.js (añade este bloque de código nuevo)

/**
 * Renderiza la lista de pasos de una ruta de movimiento en el modal.
 * @param {Array} ruta - El array de objetos de movimiento.
 */
function renderizarRutaMovimiento(ruta) {
    const listaEl = document.getElementById('edit-movimiento-lista');
    listaEl.innerHTML = ''; // Limpia la lista actual

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
            ruta.splice(index, 1); // Elimina el paso del array
            renderizarRutaMovimiento(ruta); // Vuelve a renderizar la lista
        };

        listaEl.appendChild(pasoEl);
    });
}
 
/**
 * Activa el modo de selección de coordenadas, ocultando el modal y
 * preparando el editor para capturar el próximo clic en el mapa.
 */
function iniciarModoSeleccionCoordenada() {
    console.log("Iniciando modo de selección de coordenadas...");
    editorState.isPickingCoordinate = true;
    
    // Ocultamos el modal para que el usuario pueda ver el mapa
    editorDOM.editEntityModal.style.display = 'none';

    // Cambiamos el cursor para dar feedback visual
    editorDOM.mapGrid.style.cursor = 'crosshair';
    
    // Opcional: Mostrar un pequeño aviso
    // alert("Haz clic en el mapa para seleccionar la coordenada de destino.");
}
function actualizarNuevosParamsMovimiento() {
    const tipo = document.getElementById('movimiento-tipo-nuevo').value;
    const container = document.getElementById('movimiento-params-nuevo');
    
    if (tipo === 'aleatorio') {
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 10px; align-items: center;">
                <label for="movimiento-duracion-nuevo">Duración (segundos):</label>
                <input type="number" id="movimiento-duracion-nuevo" placeholder="Dejar vacío para infinito" class="modal-input">
            </div>`;
    } else if (tipo === 'ir_a') {
        // ▼▼▼ CAMBIO PRINCIPAL ▼▼▼
        // Ahora mostramos un botón en lugar de los inputs de X y Z
        container.innerHTML = `
            <button id="movimiento-seleccionar-coord-btn" class="pro6" style="width: 100%; padding: 10px;">📍</button>`;
        // Conectamos el evento al nuevo botón
        document.getElementById('movimiento-seleccionar-coord-btn').onclick = iniciarModoSeleccionCoordenada;
        // ▲▲▲ FIN DEL CAMBIO ▲▲▲
    }
}

// Inicializa y conecta los eventos de la nueva sección del modal
document.addEventListener('DOMContentLoaded', () => {
    const tipoSelect = document.getElementById('movimiento-tipo-nuevo');
    const anadirBtn = document.getElementById('movimiento-anadir-paso-btn');

    if (tipoSelect) {
        tipoSelect.addEventListener('change', actualizarNuevosParamsMovimiento);
        // Llama una vez para inicializar los campos
        actualizarNuevosParamsMovimiento();
    }
    
    if (anadirBtn) {
        anadirBtn.addEventListener('click', () => {
            const listaEl = document.getElementById('edit-movimiento-lista');
            // 1. Leer la ruta actual desde la UI para no perder datos
            let rutaActual = [];
            const pasosActuales = listaEl.querySelectorAll('.ruta-paso');
            pasosActuales.forEach(pasoEl => {
                // (Esta es la misma lógica de lectura que en saveEntityProperties)
                const pasoData = { tipo: pasoEl.dataset.tipo };
                if (pasoData.tipo === 'aleatorio') pasoData.duracion = pasoEl.dataset.duracion === 'null' ? null : parseFloat(pasoEl.dataset.duracion);
                else if (pasoData.tipo === 'ir_a') pasoData.coordenadas = { x: parseFloat(pasoEl.dataset.x), z: parseFloat(pasoEl.dataset.z) };
                rutaActual.push(pasoData);
            });

            // 2. Crear el nuevo paso desde los inputs
            const tipo = document.getElementById('movimiento-tipo-nuevo').value;
            const nuevoPaso = { tipo };
            if (tipo === 'aleatorio') {
                const duracionInput = document.getElementById('movimiento-duracion-nuevo');
                nuevoPaso.duracion = duracionInput.value ? parseFloat(duracionInput.value) : null;
            } else if (tipo === 'ir_a') {
                nuevoPaso.coordenadas = {
                    x: parseFloat(document.getElementById('movimiento-x-nuevo').value),
                    z: parseFloat(document.getElementById('movimiento-z-nuevo').value)
                };
            }
            
            // 3. Añadir el nuevo paso y re-renderizar
            rutaActual.push(nuevoPaso);
            renderizarRutaMovimiento(rutaActual);
        });
    }
});
/**
 * Muestra u oculta los campos de radio y altura según el tipo de colisión seleccionado.
 */
function updateCollisionFieldsVisibility() {
    const tipo = editorDOM.editColisionTipoSelect.value;
    const radioContainer = document.getElementById('edit-colision-radio-container');
    const alturaContainer = document.getElementById('edit-colision-altura-container');

    radioContainer.style.display = (tipo === 'capsula' || tipo === 'esfera') ? 'block' : 'none';
    alturaContainer.style.display = (tipo === 'capsula' || tipo === 'caja') ? 'block' : 'none';
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
     // ▼▼▼ AÑADE ESTOS LISTENERS PARA EL NUEVO MODAL ▼▼▼
    if (editorDOM.editEntityModal) {
        editorDOM.editEntityCloseBtn.addEventListener('click', () => editorDOM.editEntityModal.style.display = 'none');
        editorDOM.editEntitySaveBtn.addEventListener('click', saveEntityProperties);
        editorDOM.editColisionTipoSelect.addEventListener('change', updateCollisionFieldsVisibility);
    }
    // ▲▲▲ FIN DE LOS NUEVOS LISTENERS ▲▲▲
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
/**
 * Limpia y recarga todos los assets del arco "videojuego" en la paleta de entidades.
 * La función es asíncrona para poder generar las previsualizaciones 3D.
 */
/**
 * Limpia y recarga todos los assets del arco "videojuego" en la paleta de entidades.
 * AHORA TAMBIÉN PROCESA Y GUARDA LAS PROPIEDADES DEL JUEGO.
 */
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

            // ▼▼▼ INTEGRACIÓN DE LA NUEVA LÓGICA ▼▼▼
            // Procesamos las propiedades ANTES de crear la herramienta
            const propiedadesJuego = procesarPropiedadesVideojuego(charElement);
            // ▲▲▲ FIN DE LA INTEGRACIÓN ▲▲▲

            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
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
                } catch (e) { /* No es JSON, se mantiene como 'sprite' */ }
            }

            const newTool = {
                name: nombre,
                type: 'custom',
                modelType: modelType,
                dataRef: nombre,
                isSolid: propiedadesJuego.fisica ? !propiedadesJuego.fisica.estatico : true,
                radius: propiedadesJuego.colision ? propiedadesJuego.colision.radio : 1.2,
                // Guardamos el objeto completo de propiedades para uso futuro
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

    // 1. Limpiar los assets personalizados existentes de la UI y del objeto 'tools'
    document.querySelectorAll('.palette-item[data-category="customEntity"]').forEach(btn => btn.remove());
    tools.customEntities = {};

    // 2. Volver a escanear los datos y cargarlos (lógica movida desde autoLoadGameAssets)
    const entityGrid = editorDOM.entityPalette.querySelector('.palette-container');
    if (!entityGrid) {
        console.error("No se encontró el contenedor de la paleta de entidades.");
        return;
    }
    
    const characterDataElements = document.querySelectorAll('#listapersonajes .personaje');
    
    // Usamos un bucle for...of para poder usar 'await' dentro
    for (const charElement of characterDataElements) {
        const arco = charElement.querySelector('.change-arc-btn')?.dataset.arco;
        
        if (arco === 'videojuego') {
            const nombre = charElement.querySelector('.nombreh')?.value;
            if (!nombre) continue;

            const toolId = `custom_${nombre.replace(/\s+/g, '_')}`;
            
            // Omitir si ya fue procesado (en caso de duplicados)
            if (tools.customEntities[toolId]) continue;

            const promptVisualText = charElement.querySelector('.prompt-visualh')?.value;
            let modelType = 'sprite'; // Por defecto
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
                isSolid: true, // Puedes ajustar estas propiedades por defecto
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
                // Si no tiene ni modelo 3D válido ni imagen, lo saltamos.
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
/**
 * Revisa el promptVisual de un "Dato" en busca de propiedades para el videojuego.
 * Si no existen, crea una estructura JSON por defecto y la escribe en el textarea.
 * Si existen, las lee y las devuelve.
 * @param {HTMLElement} charElement - El elemento DOM del "Dato" (div.personaje).
 * @returns {object} Un objeto con las propiedades del juego para ese "Dato".
 */
 

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
        colision: { tipo: 'capsula', radio: 0.5, altura: 1.8 },
        interactable: false,
        fisica: { estatico: true, masa: 0 },
             movimiento: [] 
    };

    if (currentText.startsWith(KEYWORD)) {
        // ▼▼▼ LÍNEA MODIFICADA ▼▼▼
        // Extraemos solo el texto entre la palabra clave y el separador "---"
        const separatorIndex = currentText.indexOf(SEPARATOR);
        const jsonText = currentText.substring(KEYWORD.length, separatorIndex > -1 ? separatorIndex : undefined).trim();
        // ▲▲▲ FIN DE LA MODIFICACIÓN ▲▲▲

        try {
            if (jsonText) { // Solo intentamos parsear si hay texto
                gameProps = JSON.parse(jsonText);
                console.log(`Propiedades de videojuego leídas para "${charElement.querySelector('.nombreh')?.value}".`);
            } else {
                 gameProps = defaultProps; // Si no hay JSON, usamos las de por defecto
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