import * as THREE from 'three';
import TWEEN from 'tween';
// Importamos 'thumbnailGenerator' desde main.js
import { appState, renderer, scene, camera, controls, thumbnailGenerator } from './editor-escenas-main.js';

// Se importan las funciones y objetos necesarios de otros módulos.
// Quitamos 'thumbnailGenerator' de esta importación
import { 
    showModal, 
    updateObjectList, 
    onWindowResize, 
    addPaletteItem
} from './editor-escenas-ui.js';


import { resetAllAnimations, playAllAnimations, updateTimelineUI } from './editor-escenas-animacion.js';
import { setDayTime, setFogDensity, setCloudDensity, setVolumetricClouds, togglePrecipitation } from './editor-escenas-weather.js';
import { clearAllObjects, recreateObject, deselectObject } from './editor-escenas-objects.js';

let mediaRecorder;
let recordedChunks = [];
let canvasStream;


// --- LÓGICA DE EXPORTACIÓN ---

/**
 * Parsea el string de resolución del appState y devuelve width y height.
 * @returns {{width: number, height: number}}
 */
function getExportDimensions() {
    if (!appState.exportResolution || !appState.exportResolution.includes('x')) {
        return { width: 1280, height: 720 }; // Fallback a un valor por defecto
    }
    const [width, height] = appState.exportResolution.split('x').map(Number);
    return { width, height };
}

/**
 * Exporta la escena actual como una imagen PNG con la resolución seleccionada.
 */
export function exportToPNG() {
    try {
        const { width, height } = getExportDimensions();

        // 1. Redimensionar para la exportación
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);

        // 2. Generar el enlace de descarga
        const link = document.createElement('a');
        link.download = `escena-${width}x${height}.png`;
        link.href = renderer.domElement.toDataURL('image/png');
        link.click();

    } finally {
        // 3. Restaurar el tamaño original adaptable
        onWindowResize();
    }
}


/**
 * Inicia la grabación en tiempo real con la resolución seleccionada.
 */
export function startRealtimeRecording() {
    const canvas = renderer.domElement;
    if (!canvas) {
        console.error("No se encontró el elemento canvas del renderer.");
        return;
    }

    const { width, height } = getExportDimensions();

    resetAllAnimations();
    playAllAnimations();

    // 1. Redimensionar para la grabación
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    canvasStream = canvas.captureStream(30);
    mediaRecorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm; codecs=vp9' });

    recordedChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `escena_grabada_${width}x${height}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 2. Restaurar el tamaño original
        onWindowResize();

        document.getElementById('start-realtime-record-btn').style.display = 'block';
        document.getElementById('stop-realtime-record-btn').style.display = 'none';
    };

    mediaRecorder.start();
    console.log(`Grabación en tiempo real iniciada a ${width}x${height}...`);
    document.getElementById('start-realtime-record-btn').style.display = 'none';
    document.getElementById('stop-realtime-record-btn').style.display = 'block';

    const totalAnimationDuration = appState.allAnimations.reduce((max, anim) => Math.max(max, anim.duration), 0);
    if (totalAnimationDuration > 0) {
        setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                stopRealtimeRecording();
            }
        }, totalAnimationDuration * 1000 + 500);
    }
}

/**
 * Detiene la grabación en tiempo real.
 */
export function stopRealtimeRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        console.log("Grabación en tiempo real detenida. Descargando...");
    }
}

// ==========================================================================
// NUEVAS FUNCIONES Y CORRECCIONES
// ==========================================================================

/**
 * Guarda el estado completo de la escena en un archivo JSON.
 */
export function saveSceneState() {
    try {
        const state = {
            appState: {
                dayTime: document.getElementById('day-time-slider').value,
                precipitationType: appState.precipitationType,
                fogDensity: appState.fogDensity,
                exportResolution: appState.exportResolution
            },
            camera: {
                position: camera.position.toArray(),
                target: controls.target.toArray()
            },
            objects: [],
            animations: []
        };
        
        appState.allObjects.forEach(obj => {
            const objectData = {
                uuid: obj.uuid,
                name: obj.userData.name,
                type: obj.userData.type,
                assetUrl: obj.userData.assetUrl,
                position: obj.position.toArray(),
                rotation: obj.rotation.toArray(),
                scale: obj.scale.toArray(),
                // --- CORRECCIÓN: Guardar el ADN si es un personaje personalizado ---
                characterDNA: obj.userData.characterDNA 
            };
            state.objects.push(objectData);
        });

        appState.allAnimations.forEach(anim => {
            state.animations.push({
                objectUUID: anim.object.uuid,
                startPosition: anim.startPosition.toArray(),
                endPosition: anim.endPosition.toArray(),
                startTime: anim.startTime,
                duration: anim.duration
            });
        });

        const stateString = JSON.stringify(state, null, 2);
        const blob = new Blob([stateString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `escena-guardada-${new Date().toISOString().slice(0, 10)}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showModal("Escena guardada correctamente.");
    } catch (error) {
        console.error("Error al guardar la escena:", error);
        showModal("Error: No se pudo guardar la escena. Revisa la consola.");
    }
}

/**
 * Carga el estado de una escena desde un archivo JSON.
 * @param {File} file - El archivo JSON a cargar.
 */
export async function loadSceneState(file) {
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const state = JSON.parse(event.target.result);
            
            await clearAllObjects();
            appState.allAnimations = [];
            TWEEN.removeAll();
            updateTimelineUI();

            const savedAppState = state.appState || {};
            setDayTime(savedAppState.dayTime || 0.5);
            setFogDensity(savedAppState.fogDensity || 0.00025);
            togglePrecipitation(savedAppState.precipitationType || 'none');
            appState.exportResolution = savedAppState.exportResolution || '1280x720';
            
            document.getElementById('day-time-slider').value = savedAppState.dayTime || 0.5;
            document.getElementById('fog-density-slider').value = savedAppState.fogDensity || 0.00025;
            document.getElementById('precipitation-select').value = savedAppState.precipitationType || 'none';
            document.getElementById('export-resolution-select').value = appState.exportResolution;

            if (state.objects) {
                for (const objData of state.objects) {
                    const newObj = await recreateObject(objData);
                    if (newObj) {
                        scene.add(newObj);
                        appState.allObjects.set(newObj.uuid, newObj);
                        
                        // --- CORRECCIÓN: Añadir a la paleta si es un personaje y no existe ---
                        if (objData.type.startsWith('character_')) {
                           // Re-poblar el mapa de ADNs de personajes en el estado de la app
                           if (!appState.userCharacters.has(objData.type)) {
                               appState.userCharacters.set(objData.type, objData.characterDNA);
                               // Generar miniatura y añadir a la UI
                               const thumbnailSrc = thumbnailGenerator.generate(newObj);
                               addPaletteItem(objData.type, objData.name, thumbnailSrc);
                           }
                        }
                    }
                }
                updateObjectList();
            }

            if (state.animations) {
                state.animations.forEach(animData => {
                    const animatedObject = appState.allObjects.get(animData.objectUUID);
                    if (animatedObject) {
                        appState.allAnimations.push({
                            object: animatedObject,
                            startPosition: new THREE.Vector3().fromArray(animData.startPosition),
                            endPosition: new THREE.Vector3().fromArray(animData.endPosition),
                            startTime: animData.startTime || 0,
                            duration: animData.duration
                        });
                    }
                });
                updateTimelineUI();
                resetAllAnimations();
            }
            
            if (state.camera) {
                camera.position.fromArray(state.camera.position);
                controls.target.fromArray(state.camera.target);
                controls.update();
            }

            deselectObject();
            showModal("Escena cargada correctamente.");

        } catch (error) {
            console.error("Error al cargar la escena:", error);
            showModal("Error: El archivo de guardado parece estar corrupto o en un formato incorrecto.");
        }
    };
    reader.readAsText(file);
}
