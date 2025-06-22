import * as THREE from 'three';
import { appState, scene, camera, renderer, ground, controls, transformControls, raycaster, mouse, grassTexture, sceneContainer } from './editor-escenas-main.js'; // Importa variables globales y elementos de Three.js desde main.js
import { createTree, createFlower, createPyramid } from './editor-escenas-modelos.js'; // Importa fábricas de modelos desde modelos.js
import { onGltfFileSelected, onImageFileSelected } from './editor-escenas-modelos.js';
import { exportToPNG, startRealtimeRecording, stopRealtimeRecording } from './editor-escenas-exportar.js';
import { handleAnimationSetup, createAnimation, updateTimelineUI, playAllAnimations, pauseAllAnimations, resetAllAnimations } from './editor-escenas-animacion.js'; // Importa funciones de animación
import { setDayTime, togglePrecipitation, setFogDensity, setCloudDensity, setVolumetricClouds } from './editor-escenas-weather.js'; // Importa funciones de clima
import { setPlacementMode, selectObject, deselectObject, removeObject, alignObjectToGround, focusOnObject, placeObject, onPointerDown } from './editor-escenas-objects.js'; // Importa funciones de objetos


// --- LÓGICA DE LA UI Y DOM ---

export function setupEventListeners() {
    // Event listeners para los botones de añadir objetos
    document.querySelectorAll('.btn-base[data-type]').forEach(btn => {
        btn.addEventListener('click', () => setPlacementMode(btn.dataset.type));
    });

    // Event listeners para los botones de herramientas
    document.getElementById('export-btn').addEventListener('click', exportToPNG);
    document.getElementById('start-realtime-record-btn').addEventListener('click', startRealtimeRecording);
    document.getElementById('stop-realtime-record-btn').addEventListener('click', stopRealtimeRecording);

    // Event listeners para la importación de archivos
    document.getElementById('gltf-input').addEventListener('change', onGltfFileSelected);
    document.getElementById('image-input').addEventListener('change', onImageFileSelected);

    // Event listener para la interacción con la escena (clic)
    // Asegurarse de que sceneContainer es el elemento correcto para adjuntar el listener
    // En este contexto, sceneContainer ya se importa de main.js
    sceneContainer.addEventListener('pointerdown', onPointerDown, false);


    // Toggle de la textura del suelo
    document.getElementById('ground-texture-toggle').addEventListener('change', (e) => {
        ground.material.map = e.target.checked ? grassTexture : null;
        ground.material.color.set(e.target.checked ? 0xffffff : 0x808080);
        ground.material.needsUpdate = true;
    });

    // Controles de animación de la línea de tiempo
    document.getElementById('play-btn').addEventListener('click', playAllAnimations);
    document.getElementById('pause-btn').addEventListener('click', pauseAllAnimations);
    document.getElementById('reset-btn').addEventListener('click', resetAllAnimations);

    // Nuevos event listeners para el ciclo día/noche y clima
    document.getElementById('day-time-slider').addEventListener('input', (e) => {
        setDayTime(parseFloat(e.target.value));
    });

    document.getElementById('precipitation-select').addEventListener('change', (e) => {
        togglePrecipitation(e.target.value);
    });

    document.getElementById('fog-density-slider').addEventListener('input', (e) => {
        setFogDensity(parseFloat(e.target.value));
    });

    document.getElementById('cloud-density-slider').addEventListener('input', (e) => {
        setCloudDensity(parseFloat(e.target.value));
    });

    // Nuevo event listener para nubes volumétricas
    document.getElementById('volumetric-cloud-slider').addEventListener('input', (e) => {
        setVolumetricClouds(parseFloat(e.target.value));
    });


    // Deshabilitar controles de órbita mientras se transforman objetos
    transformControls.addEventListener('dragging-changed', event => {
        controls.enabled = !event.value;
    });

    // Manejar el redimensionamiento de la ventana
    window.addEventListener('resize', onWindowResize);
}

// Actualiza la interfaz del inspector con los detalles del objeto seleccionado
export function updateInspector() {
    const content = document.getElementById('inspector-content');
    const { selectedObject, animationSetupData } = appState;

    if (selectedObject) {
        let animationButtonHTML = '';
        if (!animationSetupData) {
            // Botón para iniciar la configuración de animación
            animationButtonHTML = `<button id="setup-animation-btn" class="btn-base btn-danger mt-2">🎬 Añadir Animación</button>`;
        } else {
            // Botón para fijar el punto final de la animación
            animationButtonHTML = `<button id="set-endpoint-btn" class="btn-base btn-primary mt-2">🏁 Fijar Punto Final</button>`;
        }

        content.innerHTML = `
            <h3 class="font-bold text-lg mb-4">${selectedObject.userData.name}</h3>
            <div class="transform-controls">
                <button id="translate-btn" class="btn-base">Mover</button>
                <button id="rotate-btn" class="btn-base">Rotar</button>
            </div>
            <button id="drop-btn" class="btn-base mt-2">Dejar Caer</button>
            ${animationButtonHTML}
        `;
        // Event listeners para los controles de transformación
        document.getElementById('translate-btn').addEventListener('click', () => transformControls.setMode('translate'));
        document.getElementById('rotate-btn').addEventListener('click', () => transformControls.setMode('rotate'));
        document.getElementById('drop-btn').addEventListener('click', () => {
            if(appState.selectedObject) alignObjectToGround(appState.selectedObject);
        });

        // Event listener para el botón de configuración de animación
        const setupBtn = document.getElementById('setup-animation-btn');
        if (setupBtn) setupBtn.addEventListener('click', handleAnimationSetup);

        // Event listener para el botón de fijar punto final
        const endpointBtn = document.getElementById('set-endpoint-btn');
        if(endpointBtn) endpointBtn.addEventListener('click', createAnimation);

        // Resaltar el modo de control activo
        const modeBtn = document.getElementById(`${transformControls.mode}-btn`);
        if(modeBtn) modeBtn.classList.add('active');

    } else {
        content.innerHTML = `<p class="text-zinc-400">Selecciona un objeto para editarlo.</p>`;
        appState.animationSetupData = null; // Reiniciar datos de configuración de animación
    }
}

// Actualiza la lista de objetos en la escena
export function updateObjectList() {
    const list = document.getElementById('object-list');
    list.innerHTML = ''; // Limpiar lista existente
    appState.allObjects.forEach(object => {
        const li = document.createElement('li');
        li.id = `obj-${object.uuid}`;
        li.innerHTML = `
            <span data-uuid="${object.uuid}">${object.userData.name}</span>
            <button class="delete-btn" data-uuid="${object.uuid}">X</button>
        `;
        list.appendChild(li);

        // Resaltar el objeto seleccionado
        if (appState.selectedObject && appState.selectedObject.uuid === object.uuid) {
            li.classList.add('selected');
        }

        // Event listeners para seleccionar y eliminar objetos de la lista
        li.querySelector('span').addEventListener('click', (e) => {
            const objectToFocus = appState.allObjects.get(e.target.dataset.uuid);
            selectObject(objectToFocus);
            focusOnObject(objectToFocus);
        });
        li.querySelector('.delete-btn').addEventListener('click', (e) => removeObject(e.currentTarget.dataset.uuid));
    });
}

// --- MODALES PERSONALIZADOS ---
// Muestra un modal personalizado para mensajes o entradas de usuario
export function showModal(text, { isPrompt = false, defaultValue = '', showOk = true, showCancel = true } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-modal');
        const modalText = document.getElementById('modal-text');
        const modalProgress = document.getElementById('modal-progress');
        const modalInput = document.getElementById('modal-input');
        const okBtn = document.getElementById('modal-ok-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        modalText.textContent = text;
        modalProgress.textContent = ''; // Limpiar el progreso en un nuevo modal
        modalInput.style.display = isPrompt ? 'block' : 'none'; // Mostrar input si es un prompt
        modalInput.value = defaultValue;
        okBtn.style.display = showOk ? 'block' : 'none'; // Mostrar/ocultar botón OK
        cancelBtn.style.display = showCancel ? 'block' : 'none'; // Mostrar/ocultar botón Cancelar

        modal.style.display = 'flex'; // Mostrar el modal

        // Handlers para los botones del modal
        const onOk = () => {
            cleanup();
            resolve(isPrompt ? modalInput.value : true); // Resolver con el valor del input o true
        };

        const onCancel = () => {
            cleanup();
            resolve(null); // Resolver con null si se cancela
        };

        // Función para limpiar event listeners y ocultar el modal
        function cleanup() {
            modal.style.display = 'none';
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// Actualiza el texto de progreso en el modal
export function updateModalProgress(text) {
     document.getElementById('modal-progress').textContent = text;
}

// Oculta el modal
export function hideModal() {
    document.getElementById('custom-modal').style.display = 'none';
}

// Maneja el redimensionamiento de la ventana
export function onWindowResize() {
    const sceneContainer = document.getElementById('scene-container'); // Necesario para acceder al elemento aquí
    camera.aspect = sceneContainer.clientWidth / sceneContainer.clientHeight; // Actualizar relación de aspecto
    camera.updateProjectionMatrix(); // Actualizar matriz de proyección de la cámara
    renderer.setSize(sceneContainer.clientWidth, sceneContainer.clientHeight); // Ajustar tamaño del renderizador
}

 