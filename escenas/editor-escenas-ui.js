// editor-escenas-ui.js

import * as THREE from 'three'; 
import {
    appState, camera, renderer, ground, controls, transformControls, grassTexture, sceneContainer, composer, // <- Se importa composer
    applyCameraModeSettings, cameraMinHeight, firstPersonEyeHeight,
    paintOnGround, setBrushTexture, setBrushSize, terrainTextures,    thumbnailGenerator 
} from './editor-escenas-main.js';

import { updateTerrainHeight } from './editor-escenas-terreno.js'; // Importar updateTerrainHeight directamente
import { onGltfFileSelected, onImageFileSelected, createTree, createFlower, createPyramid, createAnimatedPerson, createLamppost, createBonfire, createWoodenCrate } from './editor-escenas-modelos.js';
import { exportToPNG, startRealtimeRecording, stopRealtimeRecording, saveSceneState, loadSceneState } from './editor-escenas-exportar.js';
import { handleAnimationSetup, createAnimation, playAllAnimations, pauseAllAnimations, resetAllAnimations,  updateTimelineUI } from './editor-escenas-animacion.js';
import { setDayTime, togglePrecipitation, setFogDensity, setCloudDensity, setVolumetricClouds } from './editor-escenas-weather.js';
import { setPlacementMode, selectObject, deselectObject, removeObject, alignObjectToGround, focusOnObject, onPointerDown, onPointerUp, onPointerLeave, onPointerMove } from './editor-escenas-objects.js'; 

 

// --- LÓGICA DE LA UI Y DOM ---

export function addPaletteItem(type, name, thumbnailSrc) {
    const grid = document.getElementById('object-palette-grid');
    
    let item = grid.querySelector(`.palette-item[data-type="${type}"]`);
    if (!item) {
        item = document.createElement('div');
        item.className = 'palette-item';
        item.dataset.type = type;
        grid.appendChild(item);
    }

    item.innerHTML = `
        <div class="thumbnail-container">
            <img src="${thumbnailSrc}" alt="${name}" onerror="this.style.display='none'">
        </div>
        <span>${name}</span>
    `;

    item.addEventListener('click', () => {
        setPlacementMode(type);
    });
}

export async function populateObjectPalette() {
    const predefinedObjects = [
     { type: 'lamppost', name: 'Farola', factory: createLamppost },
        { type: 'bonfire', name: 'Hoguera', factory: createBonfire },
     
        { type: 'wooden_crate', name: 'Caja Madera', factory: createWoodenCrate },
        { type: 'tree', name: 'Árbol', factory: createTree },
        { type: 'red_flower', name: 'Flor Roja', factory: () => createFlower(0xff0000) },
        { type: 'yellow_flower', name: 'Flor Amarilla', factory: () => createFlower(0xffff00) },
        { type: 'pyramid', name: 'Pirámide', factory: createPyramid },
        { type: 'person', name: 'Persona', factory: createAnimatedPerson }
    ];

    for (const objInfo of predefinedObjects) {
        const object3D = objInfo.factory();
        object3D.userData.type = objInfo.type;
        object3D.userData.name = objInfo.name;
        const thumbnail = thumbnailGenerator.generate(object3D);
        addPaletteItem(objInfo.type, objInfo.name, thumbnail);
    }
}

/**
 * Cambia el aspect ratio de la escena y actualiza el canvas.
 * @param {string} aspectRatio - El nuevo aspect ratio (e.g., '16/9', '9/16', '1/1').
 */
function setAspectRatio(aspectRatio) {
    if (appState.currentAspectRatio === aspectRatio) return;
    
    appState.currentAspectRatio = aspectRatio;

    // Actualizar la clase 'active' en los botones
    document.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.aspect-btn[data-aspect="${aspectRatio}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Volver a calcular el tamaño del canvas con el nuevo aspect ratio
    onWindowResize();
}

/**
 * Configura todos los event listeners para los elementos de la interfaz de usuario.
 */
export function setupEventListeners() {
    // --- Lógica de Sidebars Plegables ---
    const paletteToggleBtn = document.getElementById('palette-toggle-btn');
    const palettePanel = document.getElementById('palette-panel');
    const inspectorToggleBtn = document.getElementById('inspector-toggle-btn');
    const inspectorPanel = document.getElementById('inspector-panel');

    const setupSidebarToggle = (button, panel) => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('open');
            setTimeout(() => onWindowResize(), 350);
        });
    };

    setupSidebarToggle(paletteToggleBtn, palettePanel);
    setupSidebarToggle(inspectorToggleBtn, inspectorPanel);

    document.querySelectorAll('#palette-panel .section-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            document.querySelectorAll('#palette-panel .sidebar-section-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('#palette-panel .section-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');
            btn.classList.add('active');
        });
    });

 
    
    // Event listeners para importación y escena
    document.getElementById('gltf-input').addEventListener('change', (e) => onGltfFileSelected(e, addPaletteItem, thumbnailGenerator));
    document.getElementById('image-input').addEventListener('change', (e) => onImageFileSelected(e, addPaletteItem));
    
    sceneContainer.addEventListener('pointerdown', onPointerDown, false);
    sceneContainer.addEventListener('pointerup', onPointerUp, false);
    sceneContainer.addEventListener('pointerleave', onPointerLeave, false);
    sceneContainer.addEventListener('pointermove', onPointerMove, false); 

    // Listeners para Guardar y Cargar
    document.getElementById('save-scene-btn').addEventListener('click', saveSceneState);
    document.getElementById('load-scene-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            loadSceneState(file);
        }
        event.target.value = null;
    });

    // Listener para el selector de resolución
    document.getElementById('export-resolution-select').addEventListener('change', (e) => {
        appState.exportResolution = e.target.value;
        const [width, height] = e.target.value.split('x').map(Number);
        if (width > height) {
            setAspectRatio('16/9');
        } else if (height > width) {
            setAspectRatio('9/16');
        } else {
            setAspectRatio('1/1');
        }
    });

    document.querySelectorAll('.aspect-btn').forEach(btn => {
        btn.addEventListener('click', () => setAspectRatio(btn.dataset.aspect));
    });
    
    // --- Listeners para la sección de Pincel de Terreno (Pintura) ---
    const terrainBrushToggleBtn = document.getElementById('terrain-brush-toggle-btn');
    if (terrainBrushToggleBtn) {
        terrainBrushToggleBtn.addEventListener('click', () => {
            setPlacementMode(appState.placementMode === 'paint' ? null : 'paint');
            terrainBrushToggleBtn.classList.toggle('active', appState.placementMode === 'paint');
            showModal(`Modo de pintura: ${appState.placementMode === 'paint' ? 'ACTIVADO' : 'DESACTIVADO'}`);
        });
    }

    document.querySelectorAll('.terrain-texture-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const textureKey = btn.dataset.texture;
            appState.currentTerrainTexture = textureKey;
            setBrushTexture(textureKey); // Llamar a la función del terreno para actualizar el pincel
            document.querySelectorAll('.terrain-texture-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // El slider de tamaño de pincel es compartido con el modelado
    document.getElementById('brush-size-slider').addEventListener('input', (e) => {
        appState.brushSize = parseFloat(e.target.value);
        setBrushSize(appState.brushSize); // Llamar a la función del terreno para actualizar el tamaño del pincel
    });

    document.getElementById('brush-strength-slider').addEventListener('input', (e) => {
        appState.brushStrength = parseFloat(e.target.value);
    });
    // --- Fin Listeners Pincel de Terreno ---


    // --- NUEVO: Listeners para la sección de Modelado de Terreno ---
    const terrainSculptToggleBtn = document.getElementById('terrain-sculpt-toggle-btn');
    if (terrainSculptToggleBtn) {
        terrainSculptToggleBtn.addEventListener('click', () => {
            setPlacementMode(appState.placementMode === 'sculpt' ? null : 'sculpt');
            terrainSculptToggleBtn.classList.toggle('active', appState.placementMode === 'sculpt');
            showModal(`Modo de modelado de terreno: ${appState.placementMode === 'sculpt' ? 'ACTIVADO' : 'DESACTIVADO'}`);
        });
    }

    document.querySelectorAll('.sculpt-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sculptMode = btn.dataset.mode;
            appState.sculptMode = sculptMode;
            document.querySelectorAll('.sculpt-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Si es 'aplanar', actualizar la altura de aplanado al hacer clic
            if (sculptMode === 'flatten' && appState.selectedObject) {
                // Obtener la altura actual del objeto seleccionado como altura de aplanado
                appState.flattenHeight = appState.selectedObject.position.y;
                document.getElementById('flatten-height-input').value = appState.flattenHeight.toFixed(2);
                showModal(`Altura de aplanado fijada en: ${appState.flattenHeight.toFixed(2)}`);
            }
        });
    });

    document.getElementById('sculpt-strength-slider').addEventListener('input', (e) => {
        appState.sculptStrength = parseFloat(e.target.value);
    });

    document.getElementById('flatten-height-input').addEventListener('change', (e) => {
        appState.flattenHeight = parseFloat(e.target.value);
        if (isNaN(appState.flattenHeight)) appState.flattenHeight = 0; // Fallback
        showModal(`Altura de aplanado cambiada a: ${appState.flattenHeight.toFixed(2)}`);
    });

    // --- Fin Listeners Modelado de Terreno ---


    document.getElementById('play-btn').addEventListener('click', playAllAnimations);
    document.getElementById('pause-btn').addEventListener('click', pauseAllAnimations);
    document.getElementById('reset-btn').addEventListener('click', resetAllAnimations);
    document.getElementById('day-time-slider').addEventListener('input', (e) => setDayTime(parseFloat(e.target.value)));
    document.getElementById('precipitation-select').addEventListener('change', (e) => togglePrecipitation(e.target.value));
    document.getElementById('fog-density-slider').addEventListener('input', (e) => setFogDensity(parseFloat(e.target.value)));
    document.getElementById('cloud-density-slider').addEventListener('input', (e) => setCloudDensity(parseFloat(e.target.value)));
    document.getElementById('volumetric-cloud-slider').addEventListener('input', (e) => setVolumetricClouds(parseFloat(e.target.value)));
    document.getElementById('free-mode-btn').addEventListener('click', () => setCameraMode('free'));
    document.getElementById('first-person-mode-btn').addEventListener('click', () => setCameraMode('firstPerson'));
    document.getElementById('programmed-mode-btn').addEventListener('click', () => setCameraMode('programmed'));
    document.getElementById('toggle-gravity-btn').addEventListener('click', toggleGravity);
    document.getElementById('export-btn').addEventListener('click', exportToPNG);
    document.getElementById('start-realtime-record-btn').addEventListener('click', startRealtimeRecording);
    document.getElementById('stop-realtime-record-btn').addEventListener('click', stopRealtimeRecording);
    
    transformControls.addEventListener('dragging-changed', event => {
        controls.enabled = !event.value;
        // Si el arrastre termina, alinea el objeto al suelo
        if (event.value === false && appState.selectedObject && appState.applyGravityOnPlacement) {
            alignObjectToGround(appState.selectedObject);
        }
    });
    
    window.addEventListener('resize', onWindowResize);
    
    document.getElementById('free-mode-btn').classList.add('active');
    updateGravityButtonText();

    // Establecer la textura de pincel inicial
    setBrushTexture(appState.currentTerrainTexture);
}

export function setCameraMode(mode) {
    applyCameraModeSettings(mode);
    document.querySelectorAll('.camera-mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${mode}-mode-btn`).classList.add('active');
    deselectObject(); 
    setPlacementMode(null); // También desactiva el modo de pintura/esculpido
    if (mode === 'firstPerson') {
        camera.position.y = firstPersonEyeHeight;
        const direction = new THREE.Vector3();
        // CORREGIDO: camera.getWorldDirection(direction) en lugar de camera.getWorldWorld(direction)
        camera.getWorldDirection(direction); 
        controls.target.copy(camera.position).add(direction.multiplyScalar(0.01)); 
        controls.update();
    } else if (mode === 'free') {
        controls.update();
    }
}

function toggleGravity() {
    appState.applyGravityOnPlacement = !appState.applyGravityOnPlacement;
    updateGravityButtonText();
    showModal(`Gravedad al colocar objetos: ${appState.applyGravityOnPlacement ? 'ACTIVADA' : 'DESACTIVADA'}`);
}

function updateGravityButtonText() {
    const gravityBtn = document.getElementById('toggle-gravity-btn');
    if (gravityBtn) {
        gravityBtn.textContent = `🍎 Gravedad: ${appState.applyGravityOnPlacement ? 'ON' : 'OFF'}`;
        gravityBtn.classList.toggle('btn-active', appState.applyGravityOnPlacement);
    }
}

export function updateInspector() {
    const content = document.getElementById('inspector-content');
    const { selectedObject, animationSetupData } = appState;

    if (selectedObject) {
        let animationButtonHTML = '';
        if (!animationSetupData) {
            animationButtonHTML = `<button id="setup-animation-btn" class="btn-base btn-danger mt-2">🎬 Añadir Animación</button>`;
        } else {
            animationButtonHTML = `<button id="set-endpoint-btn" class="btn-base btn-primary mt-2">🏁 Fijar Punto Final</button>`;
        }

        // Add the scale slider HTML
        content.innerHTML = `
            <h3 class="font-bold text-lg mb-4">${selectedObject.userData.name}</h3>
            <div class="btn-group">
                <button id="translate-btn" class="btn-base">Mover</button>
                <button id="rotate-btn" class="btn-base">Rotar</button>
                <button id="scale-btn" class="btn-base">Escalar</button>
            </div>
            <div class="control-group mt-4">
                <label for="uniform-scale-slider" class="control-label">Escala Uniforme</label>
                <input type="range" id="uniform-scale-slider" min="0.1" max="5.0" step="0.01" value="${selectedObject.scale.x}">
            </div>
            <button id="drop-btn" class="btn-base mt-2">Dejar Caer</button>
            ${animationButtonHTML}
        `;
        document.getElementById('translate-btn').addEventListener('click', () => transformControls.setMode('translate'));
        document.getElementById('rotate-btn').addEventListener('click', () => transformControls.setMode('rotate'));
        document.getElementById('scale-btn').addEventListener('click', () => transformControls.setMode('scale'));
        
        // Event listener for the new uniform scale slider
        const uniformScaleSlider = document.getElementById('uniform-scale-slider');
        if (uniformScaleSlider) {
            uniformScaleSlider.addEventListener('input', (e) => {
                const scaleValue = parseFloat(e.target.value);
                if (appState.selectedObject) {
                    appState.selectedObject.scale.set(scaleValue, scaleValue, scaleValue);
                }
            });
        }

        document.getElementById('drop-btn').addEventListener('click', () => {
            if(appState.selectedObject) alignObjectToGround(appState.selectedObject);
        });
        const setupBtn = document.getElementById('setup-animation-btn');
        if (setupBtn) setupBtn.addEventListener('click', handleAnimationSetup);
        const endpointBtn = document.getElementById('set-endpoint-btn');
        if(endpointBtn) endpointBtn.addEventListener('click', createAnimation);
        const modeBtn = document.getElementById(`${transformControls.mode}-btn`);
        if(modeBtn) modeBtn.classList.add('active');

    } else {
        content.innerHTML = `<p class="placeholder-text">Selecciona un objeto para ver sus propiedades.</p>`;
        appState.animationSetupData = null; 
    }
}

export function updateObjectList() {
    const list = document.getElementById('object-list');
    list.innerHTML = ''; 
    appState.allObjects.forEach(object => {
        const li = document.createElement('li');
        li.id = `obj-${object.uuid}`;
        li.innerHTML = `
            <span data-uuid="${object.uuid}">${object.userData.name}</span>
            <button class="delete-btn" data-uuid="${object.uuid}">X</button>
        `;
        list.appendChild(li);
        if (appState.selectedObject && appState.selectedObject.uuid === object.uuid) {
            li.classList.add('selected');
        }
        li.querySelector('span').addEventListener('click', (e) => {
            const objectToFocus = appState.allObjects.get(e.target.dataset.uuid);
            selectObject(objectToFocus);
            focusOnObject(objectToFocus);
        });
        li.querySelector('.delete-btn').addEventListener('click', (e) => removeObject(e.currentTarget.dataset.uuid));
    });
}

export function showModal(text, { isPrompt = false, defaultValue = '', showOk = true, showCancel = true } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const modalText = document.getElementById('modal-text');
        const modalProgress = document.getElementById('modal-progress');
        const modalInput = document.getElementById('modal-input');
        const okBtn = document.getElementById('modal-ok-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        modalText.textContent = text;
        modalProgress.textContent = ''; 
        modalInput.style.display = isPrompt ? 'block' : 'none'; 
        modalInput.value = defaultValue;
        okBtn.style.display = showOk ? 'block' : 'none'; 
        cancelBtn.style.display = showCancel ? 'block' : 'none';
        modal.style.display = 'flex';

        const onOk = () => { cleanup(); resolve(isPrompt ? modalInput.value : true); };
        const onCancel = () => { cleanup(); resolve(null); };

        function cleanup() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

export function updateModalProgress(text) {
     document.getElementById('modal-progress').textContent = text;
}

export function hideModal() {
    document.getElementById('custom-modal').style.display = 'none';
}

export function onWindowResize() {
    if (!appState.currentAspectRatio) return;
    const ratioParts = appState.currentAspectRatio.split('/');
    const aspectRatio = parseFloat(ratioParts[0]) / parseFloat(ratioParts[1]);

    const availableWidth = sceneContainer.clientWidth;
    const availableHeight = sceneContainer.clientHeight*0.7;
    let newWidth, newHeight;
    
    if (availableWidth / aspectRatio < availableHeight) {
        newWidth = availableWidth;
        newHeight = newWidth / aspectRatio;
    } else {
        newHeight = availableHeight;
        newWidth = newHeight * aspectRatio;
    }

    if (camera && renderer && composer) {
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
        // --- CORRECCIÓN CLAVE: Redimensionar el composer ---
        composer.setSize(newWidth, newHeight);
    }
}
