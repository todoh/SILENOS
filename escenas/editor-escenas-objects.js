// editor-escenas-objects.js

import * as THREE from 'three';
// MODIFICADO: Importar groundSize de main.js
import { appState, scene, camera, renderer, ground, transformControls, controls, raycaster, mouse, cameraMinHeight, firstPersonEyeHeight, gltfLoader, textureLoader, groundSize } from './editor-escenas-main.js';
import { updateObjectList, updateInspector, showModal } from './editor-escenas-ui.js'; // Importar funciones de UI
import { createTree, createFlower, createPyramid, createAnimatedPerson, createCustomCharacter, createBonfire, createWoodenCrate, createLamppost } from './editor-escenas-modelos.js'; // Importar fábricas de modelos
import { updateTimelineUI } from './editor-escenas-animacion.js'; // Importar para actualizar timeline al eliminar animación
import TWEEN from 'tween'; // Importar TWEEN para animaciones
// MODIFICADO: updateTerrainHeight se importa directamente desde terreno.js
import { paintOnGround, updateTerrainHeight, getHeightAtCoordinates } from './editor-escenas-terreno.js';

window.addObjectCallback = function(object3D) {
    if (!object3D) return;

    // Lógica clave para integrar el objeto en la aplicación
    scene.add(object3D);
    appState.allObjects.set(object3D.uuid, object3D); 
    
    // Configurar animación si la tiene
    if (object3D.userData.animations && object3D.userData.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(object3D);
        object3D.userData.mixer = mixer; 
        appState.animationMixers.push(mixer);
        const clip = object3D.userData.animations[0];
        const action = mixer.clipAction(clip);
        action.play();
    }

    alignObjectToGround(object3D);
    updateObjectList(); 
    selectObject(object3D);

    console.log("Objeto añadido a la escena via callback:", object3D);
}
// Variables para el seguimiento del clic en primera persona
let firstPersonClickStart = { x: 0, y: 0 };
let isFirstPersonClicking = false; // Bandera para saber si el clic en primera persona está activo


// --- LÓGICA DE OBJETOS Y ESCENA ---

/**
 * Establece el modo de colocación de objetos o de herramienta.
 * @param {string} type - El tipo de modo ('paint', 'sculpt', 'tree', etc.).
 */
export function setPlacementMode(type) {
    appState.placementMode = type;
    deselectObject(); // Deseleccionar cualquier objeto actual
    
    // Desactivar todos los botones de modo de forma genérica
    document.querySelectorAll('.palette-item.active').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#terrain-brush-toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('#terrain-sculpt-toggle-btn').forEach(b => b.classList.remove('active'));

    // Activar el botón de modo específico
    if (type === 'paint') {
        const terrainBrushToggleBtn = document.getElementById('terrain-brush-toggle-btn');
        if (terrainBrushToggleBtn) terrainBrushToggleBtn.classList.add('active');
    } else if (type === 'sculpt') {
        const terrainSculptToggleBtn = document.getElementById('terrain-sculpt-toggle-btn');
        if (terrainSculptToggleBtn) terrainSculptToggleBtn.classList.add('active');
    } else {
        const btn = document.querySelector(`.palette-item[data-type='${type}']`);
        if (btn) btn.classList.add('active');
    }
}

/**
 * Coloca un objeto en la escena en la posición indicada.
 * @param {THREE.Vector3} clickPoint - La posición en el mundo donde el usuario hizo clic.
 */
export function placeObject(clickPoint) {
    let newObject;
    const type = appState.placementMode;

    if (!type) return;

    if (type.startsWith('character_')) {
        const sourceCharacter = appState.userCharacters.get(type);
        if (sourceCharacter) {
            newObject = sourceCharacter.clone();
            // ¡Importante! Clonar también los datos de usuario para mantener las propiedades
            newObject.userData = JSON.parse(JSON.stringify(sourceCharacter.userData)); 
            // La animación no se copia con JSON, así que la reasignamos
            newObject.userData.animations = sourceCharacter.userData.animations;
        } else {
            showModal("Error: No se encontró el personaje personalizado de origen.");
            setPlacementMode(null);
            return;
        }
    } else if (type.startsWith('gltf_')) {
        const sourceModel = appState.customModels.get(type);
        if (sourceModel) {
            newObject = sourceModel.clone();
            newObject.userData.name = sourceModel.userData.name || 'Modelo GLTF';
            newObject.userData.type = type;
            newObject.userData.assetUrl = sourceModel.userData.assetUrl;
        } else {
            showModal("Error: No se encontró el modelo GLTF de origen.");
            setPlacementMode(null);
            return;
        }
    } else if (type.startsWith('image_')) {
        const sourceImage = appState.customImages.get(type);
        if (sourceImage) {
            newObject = sourceImage.clone();
            newObject.userData.name = sourceImage.userData.name || 'Imagen Plana';
            newObject.userData.type = type;
            newObject.userData.assetUrl = sourceImage.userData.assetUrl;
        } else {
            showModal("Error: No se encontró la imagen de origen.");
            setPlacementMode(null);
            return;
        }
    } else {
        // Manejar objetos predefinidos
        switch (type) {
            case 'tree':
                newObject = createTree();
                newObject.userData.name = 'Árbol';
                break;
            case 'red_flower':
                newObject = createFlower(0xff0000);
                newObject.userData.name = 'Flor Roja';
                break;
            case 'yellow_flower':
                newObject = createFlower(0xffff00);
                newObject.userData.name = 'Flor Amarilla';
                break;
            case 'pyramid':
                newObject = createPyramid();
                newObject.userData.name = 'Pirámide';
                break;
            case 'person':
                newObject = createAnimatedPerson();
                newObject.userData.name = 'Persona Animada';
                break;
            case 'bonfire':
                newObject = createBonfire();
                newObject.userData.name = 'Hoguera';
                break;
            case 'wooden_crate':
                newObject = createWoodenCrate();
                newObject.userData.name = 'Caja de Madera';
                break;
    
  case 'lamppost':
                newObject = createLamppost();
                newObject.userData.name = 'Farola';
                break;
            default:
                return; // Salir si el tipo no es reconocido
        }
        if (newObject) newObject.userData.type = type;
    }

    if (!newObject) {
        console.error("Error en placeObject: El objeto no pudo ser creado. Tipo recibido:", type);
        setPlacementMode(null);
        return;
    }

    // Establecer la posición X y Z directamente del clickPoint
    newObject.position.x = clickPoint.x;
    newObject.position.z = clickPoint.z;
    // La posición Y se ajustará por alignObjectToGround

    scene.add(newObject);
    appState.allObjects.set(newObject.uuid, newObject); 
    updateObjectList(); 
    selectObject(newObject);

    // *** CORRECCIÓN CLAVE ***
    // Configurar el mezclador de animación para CUALQUIER objeto que tenga animaciones
    if (newObject.userData.animations && newObject.userData.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(newObject);
        // Almacenar el mezclador en el objeto para referencia posterior (ej. eliminación)
        newObject.userData.mixer = mixer; 
        appState.animationMixers.push(mixer);
        
        const clip = newObject.userData.animations[0];
        const action = mixer.clipAction(clip);
        action.play();
    }

    // Siempre alinear al suelo, ya que ahora es el relieve lo que importa
    alignObjectToGround(newObject);
    
    setPlacementMode(null);
}

/**
 * Recrea un objeto a partir de datos serializados (para la carga de escenas).
 * @param {object} objectData - Los datos del objeto guardado.
 * @returns {Promise<THREE.Object3D|null>} Una promesa que se resuelve con el objeto 3D recreado.
 */
export function recreateObject(objectData) {
    return new Promise((resolve, reject) => {
        let newObject;
        const { type, name, assetUrl, uuid, position, rotation, scale, characterParams } = objectData;

        const setupObject = (obj) => {
            if (uuid) obj.uuid = uuid;
            obj.userData.type = type;
            obj.userData.name = name;
            obj.userData.assetUrl = assetUrl;
            if (position) obj.position.fromArray(position);
            if (rotation) obj.rotation.fromArray(rotation);
            if (scale) obj.scale.fromArray(scale);
            if (characterParams) obj.userData.characterParams = characterParams;

            // *** CORRECCIÓN CLAVE ***
            // Configurar el mezclador de animación para CUALQUIER objeto cargado que tenga animaciones
            if (obj.userData.animations && obj.userData.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(obj);
                obj.userData.mixer = mixer;
                appState.animationMixers.push(mixer);
                const clip = obj.userData.animations[0];
                const action = mixer.clipAction(clip);
                action.play();
            }
            resolve(obj);
        };

        if (typeof type !== 'string') {
            console.error('Tipo de objeto inválido al cargar:', objectData);
            return resolve(null);
        }
        
        // La lógica de recreación de objetos
        if (type.startsWith('character_')) {
            newObject = createCustomCharacter(characterParams);
            if(newObject) setupObject(newObject);
        } else if (type.startsWith('gltf_')) {
            const sourceModel = appState.customModels.get(type);
            if (sourceModel) {
                newObject = sourceModel.clone();
                setupObject(newObject);
            } else {
                 gltfLoader.load(assetUrl, (gltf) => {
                    newObject = gltf.scene;
                    // Guardar el modelo cargado para futuras instancias
                    appState.customModels.set(type, newObject.clone());
                    setupObject(newObject);
                }, undefined, () => reject(`No se pudo cargar el modelo GLTF: ${assetUrl}`));
            }
        } else if (type.startsWith('image_')) {
             const sourceImage = appState.customImages.get(type);
            if (sourceImage) {
                newObject = sourceImage.clone();
                setupObject(newObject);
            } else {
                textureLoader.load(assetUrl, (texture) => {
                    const planeHeight = 10;
                    const aspectRatio = texture.image.width / texture.image.height;
                    const geometry = new THREE.PlaneGeometry(planeHeight * aspectRatio, planeHeight);
                    const material = new THREE.MeshStandardMaterial({
                        map: texture,
                        transparent: true,
                        side: THREE.DoubleSide,
                        alphaTest: 0.1
                    });
                    newObject = new THREE.Mesh(geometry, material);
                    newObject.castShadow = true;
                    // Guardar la imagen cargada para futuras instancias
                    appState.customImages.set(type, newObject.clone());
                    setupObject(newObject);
                }, undefined, () => reject(`No se pudo cargar la imagen: ${assetUrl}`));
            }
        } else {
            // Manejar objetos predefinidos
            switch (type) {
                case 'tree': newObject = createTree(); break;
                case 'red_flower': newObject = createFlower(0xff0000); break;
                case 'yellow_flower': newObject = createFlower(0xffff00); break;
                case 'pyramid': newObject = createPyramid(); break;
                case 'person': newObject = createAnimatedPerson(); break;
                case 'bonfire': newObject = createBonfire(); break;
                case 'wooden_crate': newObject = createWoodenCrate(); break;
                default:
                    console.warn("Tipo de objeto desconocido al cargar:", type);
                    resolve(null);
                    return;
            }
            if (newObject) setupObject(newObject);
        }
    });
}


/**
 * Selecciona un objeto en la escena.
 * @param {THREE.Object3D} object - El objeto a seleccionar.
 */
export function selectObject(object) {
    if (appState.selectedObject) {
        deselectObject();
    }
    appState.selectedObject = object;
    transformControls.attach(object);
    updateInspector();
    updateObjectList();
}

/**
 * Deselecciona el objeto actual.
 */
export function deselectObject() {
    if (appState.selectedObject) {
        transformControls.detach();
        appState.selectedObject = null;
        updateInspector();
        updateObjectList();
    }
}

/**
 * Elimina un objeto de la escena.
 * @param {string} uuid - El UUID del objeto a eliminar.
 */
export function removeObject(uuid) {
    const objectToRemove = appState.allObjects.get(uuid);
    if (objectToRemove) {
        // Detener y eliminar el mezclador si existe
        if (objectToRemove.userData.mixer) {
            objectToRemove.userData.mixer.stopAllAction();
            const mixerIndex = appState.animationMixers.indexOf(objectToRemove.userData.mixer);
            if (mixerIndex > -1) {
                appState.animationMixers.splice(mixerIndex, 1);
            }
        }

        scene.remove(objectToRemove);
        
        objectToRemove.traverse(child => {
            if (child.isMesh || child.isPoints) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => { if(m.map) m.map.dispose(); m.dispose() });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            }
        });

        appState.allObjects.delete(uuid);

        if (appState.selectedObject && appState.selectedObject.uuid === uuid) {
            deselectObject();
        }

        appState.allAnimations = appState.allAnimations.filter(anim => anim.object.uuid !== uuid);
        updateTimelineUI();
        updateObjectList();
    }
}

/**
 * Limpia todos los objetos de la escena.
 */
export async function clearAllObjects() {
    return new Promise(resolve => {
        deselectObject();
        const uuids = Array.from(appState.allObjects.keys());
        uuids.forEach(uuid => removeObject(uuid));
        updateObjectList();
        resolve();
    });
}


/**
 * Alinea un objeto a la superficie del suelo dinámico.
 * @param {THREE.Object3D} object - El objeto a alinear.
 */
export function alignObjectToGround(object) {
    object.updateMatrixWorld(true); // Asegúrate de que la matriz mundial del objeto esté actualizada

    // Obtener el bounding box del objeto en coordenadas globales
    const bbox = new THREE.Box3().setFromObject(object);

    // Crear un rayo desde la posición X, Z del objeto hacia abajo.
    // El origen del rayo debe estar por encima del punto más alto del bounding box del objeto,
    // para asegurar que siempre intersecte el terreno.
    const origin = new THREE.Vector3(object.position.x, bbox.max.y + 100, object.position.z);
    const direction = new THREE.Vector3(0, -1, 0); // Hacia abajo
    const downRaycaster = new THREE.Raycaster(origin, direction);

    // Intersectar con el terreno
    const intersects = downRaycaster.intersectObject(ground);

    if (intersects.length > 0) {
        // Encontró el terreno. La altura del suelo es intersects[0].point.y.
        // La diferencia entre el punto más bajo del objeto (bbox.min.y) y la altura del suelo
        // es el desfase actual. Necesitamos mover el objeto hacia abajo por este desfase.
        // Se añade una pequeña tolerancia para evitar z-fighting si el objeto se coloca exactamente en el suelo.
        const groundHeight = intersects[0].point.y;
        const currentObjectBaseY = bbox.min.y;
        const offset = groundHeight - currentObjectBaseY;
        object.position.y += offset; 
    } else {
        // Si no intersecta, podría estar fuera del terreno o demasiado alto.
        // Fallback a una posición Y base si el objeto está muy lejos del terreno.
        console.warn("Objeto no intersecta el terreno, no se pudo alinear a la gravedad.");
        // Calcula la altura del objeto desde su origen para el fallback
        const objectLocalBBox = new THREE.Box3().setFromObject(object.children[0] || object); // Usa el primer hijo o el objeto si es primitivo
        const objectBaseToOrigin = Math.abs(objectLocalBBox.min.y); // Distancia del punto más bajo del objeto a su origen local (generalmente 0)
        object.position.y = objectBaseToOrigin; // Coloca la base del objeto en Y=0 (el plano base)
    }
}

/**
 * Enfoca la cámara en un objeto específico.
 * @param {THREE.Object3D} object - El objeto en el que enfocar.
 */
export function focusOnObject(object) {
    const bbox = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    controls.target.copy(center); 

    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) + 5; 

    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.negate();
    camera.position.copy(center).add(direction.multiplyScalar(distance));

    if (camera.position.y < cameraMinHeight) {
        camera.position.y = cameraMinHeight;
    }
    controls.update();
}

/**
 * Maneja el evento de clic/toque en la escena.
 * @param {PointerEvent} event - El evento de puntero.
 */
export function onPointerDown(event) {
    // Si los controles de transformación están arrastrando, o si es un clic secundario y no estamos pintando, ignorar.
    if (transformControls.dragging || (event.button !== 0 && appState.placementMode !== 'paint' && appState.placementMode !== 'sculpt')) return; // MODIFICADO: Añadir 'sculpt'

    firstPersonClickStart.x = event.clientX;
    firstPersonClickStart.y = event.clientY;
    isFirstPersonClicking = true; 

    // Obtener las coordenadas del ratón normalizadas
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (appState.placementMode === 'paint') {
        controls.enabled = false;
        appState.isPainting = true;
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            paintOnGround(intersects[0].uv, appState.brushStrength);
        }
    } else if (appState.placementMode === 'sculpt') { // NUEVO: Lógica para el modo de esculpido
        controls.enabled = false;
        appState.isSculpting = true;
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            // Asegúrate de que los parámetros pasados sean correctos:
            // uv, brushSize, sculptStrength, sculptMode, flattenHeight, groundSize
            updateTerrainHeight(
                intersects[0].uv,
                appState.brushSize,          // Tamaño del pincel en unidades de mundo
                appState.sculptStrength,     // Fuerza del esculpido
                appState.sculptMode,         // Modo de esculpido ('raise', 'lower', 'flatten', 'smooth')
                appState.flattenHeight,      // Altura para aplanar
                groundSize                   // Tamaño total del terreno
            );
        }
    }
    else if (appState.placementMode) { // Modo de colocación de objetos (árboles, etc.)
        if (appState.cameraMode === 'firstPerson') {
            showModal("Para insertar objetos, cambia al 'Modo Libre' o 'Modo Cámara'.");
            setPlacementMode(null); 
            return;
        }
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) placeObject(intersects[0].point);
    } else { // No hay modo de colocación/herramienta, se selecciona objeto
        if (!(appState.cameraMode === 'firstPerson' && event.button === 0)) {
            const clickableObjects = Array.from(appState.allObjects.values());
            const intersects = raycaster.intersectObjects(clickableObjects, true);
            if (intersects.length > 0) {
                let objectToSelect = intersects[0].object;
                while (objectToSelect.parent && !appState.allObjects.has(objectToSelect.uuid)) {
                    objectToSelect = objectToSelect.parent;
                }
                if (appState.allObjects.has(objectToSelect.uuid)) selectObject(objectToSelect);
            } else if (!transformControls.dragging) {
                deselectObject();
            }
        }
    }
}

/**
 * Maneja el evento de movimiento del puntero para pintar o esculpir.
 * @param {PointerEvent} event - El evento de puntero.
 */
export function onPointerMove(event) {
    if (appState.isPainting && appState.placementMode === 'paint') {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            paintOnGround(intersects[0].uv, appState.brushStrength);
        }
    } else if (appState.isSculpting && appState.placementMode === 'sculpt') { // NUEVO: Lógica para esculpido continuo
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            updateTerrainHeight(
                intersects[0].uv,
                appState.brushSize,
                appState.sculptStrength,
                appState.sculptMode,
                appState.flattenHeight,
                groundSize
            );
        }
    }
}


/**
 * Maneja el evento de soltar el clic/toque en la escena.
 * @param {PointerEvent} event - El evento de puntero.
 */
export function onPointerUp(event) {
    // Si estábamos pintando o esculpiendo, detener la acción y re-habilitar los controles de órbita
    if (appState.isPainting && appState.placementMode === 'paint') {
        appState.isPainting = false;
        controls.enabled = true; // Re-habilitar OrbitControls
        return;
    }
    if (appState.isSculpting && appState.placementMode === 'sculpt') { // NUEVO: Detener esculpido
        appState.isSculpting = false;
        controls.enabled = true; // Re-habilitar OrbitControls
        return;
    }

    if (!isFirstPersonClicking || event.button !== 0) {
        isFirstPersonClicking = false;
        return;
    }
    isFirstPersonClicking = false;

    const clickThreshold = 5;
    const deltaX = Math.abs(event.clientX - firstPersonClickStart.x);
    const deltaY = Math.abs(event.clientY - firstPersonClickStart.y);

    if (deltaX > clickThreshold || deltaY > clickThreshold) {
        return;
    }

    if (appState.cameraMode === 'firstPerson') {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
            const targetPoint = intersects[0].point;
            const currentPosition = camera.position.clone();
            controls.enabled = false;

            new TWEEN.Tween(currentPosition)
                .to({ x: targetPoint.x, z: targetPoint.z }, 500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => {
                    camera.position.x = currentPosition.x;
                    camera.position.z = currentPosition.z;
                    camera.position.y = firstPersonEyeHeight;

                    const direction = new THREE.Vector3();
                    camera.getWorldDirection(direction);
                    controls.target.copy(camera.position).add(direction.multiplyScalar(0.01));
                    controls.update();
                })
                .onComplete(() => {
                    controls.enabled = true;
                })
                .start();
        }
    }
}

/**
 * Maneja el evento de que el puntero sale del área del canvas.
 */
export function onPointerLeave() {
    isFirstPersonClicking = false;
    // Si el usuario suelta el clic fuera del canvas, también debería detenerse la pintura/esculpido.
    appState.isPainting = false;
    appState.isSculpting = false; // NUEVO: Detener esculpido
    controls.enabled = true; // Asegurarse de re-habilitar OrbitControls
}




