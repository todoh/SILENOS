// =======================================================================
// === LÓGICA DEL VISOR 3D (THREE.JS) ====================================
// =======================================================================

let previewState = { isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null, groundMeshes: [], collidableObjects: [], interactiveObjects: [] };
const CHUNK_SIZE = 32;
const SUB_CELL_SIZE = CHUNK_SIZE / SUBGRID_SIZE;
const textureColors = { grass: 0x7C9C4A, sand: 0xEDC9AF, stone: 0x615953, water: 0x3B698B, forest: 0x3E7C4F };
const playerController = { height: 1.8, speed: 18.0, radius: 0.5, mesh: null, targetPosition: null };
const cameraController = { distance: 18, angle: Math.PI / 4, offset: new THREE.Vector3() };
const INTERACTION_DISTANCE = 5; // Distancia máxima para interactuar

function startPreview() {
    if (previewState.isActive) return;
    const container = document.getElementById('r-game-container');
    container.innerHTML = '';
    
    previewState.collidableObjects = [];
    previewState.groundMeshes = [];
    previewState.interactiveObjects = [];

    previewState.scene = new THREE.Scene();
    previewState.scene.background = new THREE.Color(0x87ceeb);
    previewState.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);
    previewState.clock = new THREE.Clock();
    previewState.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    
    const playerGeo = new THREE.CylinderGeometry(playerController.radius, playerController.radius, playerController.height, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    playerController.mesh = new THREE.Mesh(playerGeo, playerMat);
    playerController.mesh.castShadow = true;

    let startX = 0, startZ = 0;
    if (worldData.metadata.playerStartPosition) {
        const { chunkX, chunkZ, subX, subZ } = worldData.metadata.playerStartPosition;
        startX = (chunkX * CHUNK_SIZE) + (subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
        startZ = (chunkZ * CHUNK_SIZE) + (subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
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
    document.getElementById('r-preview-modal').style.display = 'flex';
    
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
    previewState = { isActive: false, scene: null, camera: null, renderer: null, clock: null, animationFrameId: null, groundMeshes: [], collidableObjects: [], interactiveObjects: [] };
    document.getElementById('r-preview-modal').style.display = 'none';
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

    const intersectsInteractive = raycaster.intersectObjects(previewState.interactiveObjects, true);
    if (intersectsInteractive.length > 0) {
        const mainObject = intersectsInteractive[0].object.userData.mainObject;
        if (mainObject && mainObject.name === 'building_door_pivot') {
            const distance = playerController.mesh.position.distanceTo(mainObject.position);
            if (distance < INTERACTION_DISTANCE) {
                toggleDoor(mainObject);
            }
            return;
        }
    }

    const intersectsGround = raycaster.intersectObjects(previewState.groundMeshes, true);
    if (intersectsGround.length > 0) {
        if (intersectsGround[0].object.userData.isPassable === false) {
            return;
        }
        playerController.targetPosition = intersectsGround[0].point;
    }
}

function toggleDoor(doorPivot) {
    const doorMesh = doorPivot.userData.doorMesh;
    if (doorPivot.userData.isOpen) {
        doorPivot.rotation.y = 0;
        if (!previewState.collidableObjects.includes(doorMesh)) {
            previewState.collidableObjects.push(doorMesh);
        }
        doorPivot.userData.isOpen = false;
    } else {
        doorPivot.rotation.y = Math.PI / 2.2;
        const index = previewState.collidableObjects.indexOf(doorMesh);
        if (index > -1) {
            previewState.collidableObjects.splice(index, 1);
        }
        doorPivot.userData.isOpen = true;
    }
}

function checkCollision(proposedPosition) {
    for (const collidable of previewState.collidableObjects) {
        let collisionData = null;
        if (collidable.userData.collisionType === 'box') {
            const box = new THREE.Box3().setFromObject(collidable);
            const playerCenter = proposedPosition.clone();
            playerCenter.y = box.getCenter(new THREE.Vector3()).y;
            const closestPoint = box.clampPoint(playerCenter, new THREE.Vector3());
            const distance = playerCenter.distanceTo(closestPoint);
            if (distance < playerController.radius) {
                collisionData = { point: closestPoint };
            }
        } else { // 'circle'
            const dx = proposedPosition.x - collidable.position.x;
            const dz = proposedPosition.z - collidable.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const totalRadius = playerController.radius + (collidable.userData.radius || 1.0);
            if (distance < totalRadius) {
                collisionData = { point: collidable.position };
            }
        }
        if (collisionData) {
            const normal = new THREE.Vector3().subVectors(proposedPosition, collisionData.point).normalize();
            return normal;
        }
    }
    return null;
}

function updatePlayer(deltaTime) {
    if (!playerController.targetPosition || !playerController.mesh) return;
    const direction = playerController.targetPosition.clone().sub(playerController.mesh.position);
    direction.y = 0;
    const distanceToTarget = direction.length();
    if (distanceToTarget > 0.1) {
        const moveDistance = playerController.speed * deltaTime;
        let moveVector = direction.normalize().multiplyScalar(Math.min(moveDistance, distanceToTarget));
        let proposedPosition = playerController.mesh.position.clone().add(moveVector);
        const collisionNormal = checkCollision(proposedPosition);
        if (collisionNormal) {
            collisionNormal.y = 0;
            const dotProduct = moveVector.dot(collisionNormal);
            const projection = collisionNormal.clone().multiplyScalar(dotProduct);
            moveVector.sub(projection);
            proposedPosition = playerController.mesh.position.clone().add(moveVector);
            if (checkCollision(proposedPosition)) {
                moveVector.set(0, 0, 0);
            }
        }
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
    previewState.camera.lookAt(playerController.mesh.position.clone());
}

// NUEVA FUNCIÓN DE AYUDA: Busca la URL de la imagen de un "Dato" por su nombre.
function findCharacterImageSrc(dataRefName) {
    const allCharacters = document.querySelectorAll('#listapersonajes .personaje');
    for (const charElement of allCharacters) {
        const nameInput = charElement.querySelector('.nombreh');
        if (nameInput && nameInput.value === dataRefName) {
            const imgElement = charElement.querySelector('.personaje-visual img');
            if (imgElement && imgElement.src) {
                return imgElement.src;
            }
        }
    }
    return null; // Devuelve null si no se encuentra el dato o no tiene imagen.
}

function loadWorldFromData(data) {
    const textureLoader = new THREE.TextureLoader();
    for (const chunkId in data) {
        const chunk = data[chunkId];
        const [chunkX, chunkZ] = chunkId.split('_').map(Number);
        const textureData = tools.textures[chunk.groundTextureKey] || { color: 0x999999, isPassable: true };
        const groundMaterial = new THREE.MeshLambertMaterial({ color: textureColors[chunk.groundTextureKey] || 0x999999 });
        const groundGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.position.set(chunkX * CHUNK_SIZE + CHUNK_SIZE / 2, 0, chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2);
        groundMesh.receiveShadow = true;
        groundMesh.userData.isPassable = textureData.isPassable;
        previewState.scene.add(groundMesh);
        previewState.groundMeshes.push(groundMesh);

        if (chunk.objects) {
            chunk.objects.forEach(obj => {
                let entityData;
                let isCustom = false;
                let iconSrc = null;

                // --- LÓGICA DE BÚSQUEDA DE DATOS REESCRITA ---
                if (obj.dataRef) {
                    isCustom = true;
                    entityData = tools.customEntities[obj.type]; 
                    iconSrc = findCharacterImageSrc(obj.dataRef);
                } else if (obj.icon) { // Compatibilidad con guardados antiguos
                    isCustom = true;
                    entityData = { ...obj, ...tools.customEntities[obj.type] }; // Fusionar para obtener isSolid, etc.
                    iconSrc = obj.icon;
                } else {
                    entityData = tools.entities[obj.type];
                    isCustom = false;
                }

                if (!entityData) return;

                let objectMesh;
                const objX = (chunkX * CHUNK_SIZE) + (obj.subX * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);
                const objZ = (chunkZ * CHUNK_SIZE) + (obj.subZ * SUB_CELL_SIZE) + (SUB_CELL_SIZE / 2);

                if (isCustom) {
                    if (entityData.modelType === 'sprite') {
                        if (!iconSrc) {
                            console.warn(`No se pudo encontrar la imagen para la referencia: ${obj.dataRef}`);
                            return; 
                        }
                        const map = textureLoader.load(iconSrc);
                        const material = new THREE.SpriteMaterial({ map: map, transparent: true, alphaTest: 0.5 });
                        objectMesh = new THREE.Sprite(material);
                        objectMesh.scale.set(8, 8, 1);
                        objectMesh.position.set(objX, 4, objZ);
                        previewState.scene.add(objectMesh);
                        
                        // Asignar colisión
                        if (entityData.isSolid) {
                            objectMesh.userData.collisionType = 'circle';
                            objectMesh.userData.radius = entityData.radius || 1.2;
                            previewState.collidableObjects.push(objectMesh);
                        }
                    } else if (entityData.modelType === 'json3d') {
                        // Lógica para 3D custom
                    }
                }
                else if (entityData.model) {
                    const modelGroup = createModelFromJSON(entityData.model);
                    modelGroup.position.set(objX, 0, objZ);
                    modelGroup.updateMatrixWorld(true);
                    const childrenToProcess = [...modelGroup.children];
                    childrenToProcess.forEach(child => {
                        const worldPosition = new THREE.Vector3();
                        child.getWorldPosition(worldPosition);
                        const worldRotation = new THREE.Quaternion();
                        child.getWorldQuaternion(worldRotation);
                        modelGroup.remove(child);
                        switch (child.name) {
                            case 'building_door': {
                                const doorWidth = child.geometry.parameters.width;
                                const pivot = new THREE.Group();
                                pivot.position.copy(worldPosition);
                                pivot.quaternion.copy(worldRotation);
                                pivot.translateX(-doorWidth / 2);
                                child.position.set(doorWidth / 2, 0, 0);
                                child.rotation.set(0, 0, 0);
                                pivot.add(child);
                                pivot.name = 'building_door_pivot';
                                pivot.userData.isOpen = false;
                                pivot.userData.doorMesh = child;
                                child.userData.mainObject = pivot;
                                previewState.scene.add(pivot);
                                previewState.interactiveObjects.push(pivot);
                                child.userData.collisionType = 'box';
                                previewState.collidableObjects.push(child);
                                break;
                            }
                            case 'building_floor': {
                                child.position.copy(worldPosition);
                                child.quaternion.copy(worldRotation);
                                child.userData.isPassable = true;
                                previewState.groundMeshes.push(child);
                                previewState.scene.add(child);
                                break;
                            }
                            default: {
                                child.position.copy(worldPosition);
                                child.quaternion.copy(worldRotation);
                                previewState.scene.add(child);
                                if (entityData.isSolid) {
                                    child.userData.collisionType = 'box';
                                    previewState.collidableObjects.push(child);
                                }
                                break;
                            }
                        }
                    });
                } else {
                    if (obj.type === 'tree') {
                        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 8, 8), new THREE.MeshLambertMaterial({ color: 0x66402D }));
                        trunk.castShadow = true;
                        const leaves = new THREE.Mesh(new THREE.ConeGeometry(3, 6, 8), new THREE.MeshLambertMaterial({ color: 0x228B22 }));
                        leaves.position.y = 7;
                        leaves.castShadow = true;
                        objectMesh = new THREE.Group();
                        objectMesh.add(trunk);
                        objectMesh.add(leaves);
                    } else if (obj.type === 'rock') {
                        objectMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(2.5), new THREE.MeshLambertMaterial({ color: 0x5c5c5c }));
                        objectMesh.castShadow = true;
                    }

                    if (objectMesh) {
                        objectMesh.position.set(objX, objectMesh.position.y || 1.25, objZ);
                        previewState.scene.add(objectMesh);
                        if (entityData.isSolid) {
                            objectMesh.userData.collisionType = 'circle';
                            objectMesh.userData.radius = entityData.radius;
                            previewState.collidableObjects.push(objectMesh);
                        }
                    }
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
