// editor-escenas-modelos.js



import * as THREE from 'three';
import { appState, gltfLoader, textureLoader } from './editor-escenas-main.js'; // Importa variables globales
import { createBrickTexture } from './editor-escenas-terreno.js';
import { alignObjectToGround } from './editor-escenas-objects.js'; // Importa la función de alineación

// --- HELPERS DE TEXTURAS ---

/**
 * Crea una textura de madera simple para la caja.
 * @returns {THREE.CanvasTexture}
 */
function createWoodenCrateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Fondo de madera
    ctx.fillStyle = '#A0522D'; // sienna
    ctx.fillRect(0, 0, 256, 256);

    // Líneas de tablones
    ctx.strokeStyle = '#8B4513'; // saddlebrown
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(256, 128);
    ctx.moveTo(128, 0);
    ctx.lineTo(128, 256);
    ctx.stroke();

    // Bordes
    ctx.lineWidth = 16;
    ctx.strokeRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}


// --- IMPORTACIÓN Y CREACIÓN DE ASSETS ---

/**
 * Maneja la selección de archivos GLB/GLTF, los convierte a Data URL,
 * genera una miniatura y lo añade a la paleta.
 * @param {Event} event - El evento del input de archivo.
 * @param {Function} addPaletteItem - Función para añadir un item a la paleta de la UI.
 * @param {Object} thumbnailGenerator - Objeto para generar miniaturas.
 */
export function onGltfFileSelected(event, addPaletteItem, thumbnailGenerator) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const url = e.target.result; // URL de datos (Data URL)
        const fileName = file.name.split('.').slice(0, -1).join('.') || file.name;
        const objectType = `gltf_${fileName}`;

        gltfLoader.load(url, (gltf) => {
            const modelScene = gltf.scene;
            modelScene.userData.name = fileName;
            modelScene.userData.assetUrl = url; // **CORRECCIÓN: Guardar la Data URL**
            modelScene.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            appState.customModels.set(objectType, modelScene);
            const thumbnail = thumbnailGenerator.generate(modelScene);
            addPaletteItem(objectType, fileName, thumbnail);

        }, undefined, (error) => {
            console.error('Error al cargar GLB.', error);
        });
    };
    reader.readAsDataURL(file); // Leer el archivo como Data URL
}

/**
 * Maneja la selección de archivos de imagen, los convierte a Data URL,
 * crea un plano con la textura y lo añade a la paleta.
 * @param {Event} event - El evento del input de archivo.
 * @param {Function} addPaletteItem - Función para añadir un item a la paleta de la UI.
 */
export function onImageFileSelected(event, addPaletteItem) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const url = e.target.result; // URL de datos (Data URL)
        const fileName = file.name.split('.').slice(0, -1).join('.') || file.name;
        const objectType = `image_${fileName}`;

        if (file.type === 'image/gif') {

            const canvas = document.createElement('canvas');
gifler(url).animate(canvas); 

const texture = new THREE.CanvasTexture(canvas);
texture.colorSpace = THREE.SRGBColorSpace; // <-- ¡LUGAR CORRECTO! Justo después de crear la textura.
appState.animatedTextures.push(texture);

const tempImg = new Image();
tempImg.onload = () => {
    const planeHeight = 10;
    const aspectRatio = tempImg.width / tempImg.height;
    const geometry = new THREE.PlaneGeometry(planeHeight * aspectRatio, planeHeight);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // mesh.castShadow = true; // No es necesario con MeshBasicMaterial
    mesh.userData.name = fileName;
    mesh.userData.assetUrl = url;
    
    // La línea de colorSpace ya no va aquí.
    
    appState.customImages.set(objectType, mesh);
    addPaletteItem(objectType, fileName, url);
};
tempImg.src = url;

        } else {
       // ESTE ES EL NUEVO BLOQUE CORRECTO
textureLoader.load(url, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;

    const planeHeight = 10;
    const imageElement = texture.image;
    const aspectRatio = imageElement.width / imageElement.height;
    const geometry = new THREE.PlaneGeometry(planeHeight * aspectRatio, planeHeight);

    // Usamos la misma configuración que te funciona para los GIFs
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide ,
           color:  0xe4e4e4
    });

    // NOTA: Con MeshBasicMaterial no necesitamos emissive, castShadow ni receiveShadow.
    // El material ya ignora toda la iluminación por defecto. Es más simple y directo.

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.name = fileName;
    mesh.userData.assetUrl = url;

    appState.customImages.set(objectType, mesh);
    addPaletteItem(objectType, fileName, url);
});
        }
    };
    reader.readAsDataURL(file); // Leer el archivo como Data URL
}


// --- Fábricas de Objetos Primitivos ---
export function createLamppost() {
    const lamppostGroup = new THREE.Group();
    const postHeight = 7;
    const armLength = 1.5;

    // Materiales
    const postMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.4
    });
    const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffee,
        emissive: 0xffd8a0, // Color de la emisión para que parezca encendida
        emissiveIntensity: 2
    });

    // Poste principal
    const postGeometry = new THREE.CylinderGeometry(0.1, 0.15, postHeight, 12);
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.y = postHeight / 2;
    lamppostGroup.add(post);

    // Brazo horizontal
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, armLength, 12);
    const arm = new THREE.Mesh(armGeometry, postMaterial);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(armLength / 2, postHeight - 0.5, 0);
    lamppostGroup.add(arm);

    // Cabeza de la lámpara
    const headGeometry = new THREE.ConeGeometry(0.5, 0.8, 16);
    const head = new THREE.Mesh(headGeometry, postMaterial);
    head.position.set(armLength, postHeight - 0.9, 0);
    lamppostGroup.add(head);

    // Bombilla (la parte que brilla)
    const bulbGeometry = new THREE.SphereGeometry(0.2, 16, 8);
    const bulb = new THREE.Mesh(bulbGeometry, lightMaterial);
    bulb.position.set(armLength, postHeight - 1.2, 0);
    lamppostGroup.add(bulb);

    // Luz del foco (SpotLight)
    const spotLight = new THREE.SpotLight(0xffd8a0, 100, 25, Math.PI / 6, 0.2, 2);
    spotLight.position.set(armLength, postHeight - 1, 0);
    spotLight.castShadow = true;
    
    // Configuración de sombras de alta calidad
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 1;
    spotLight.shadow.camera.far = 25;
    spotLight.shadow.bias = -0.001;

    // El objetivo de la luz (hacia dónde apunta)
    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(armLength, 0, 0);
    spotLight.target = lightTarget;
    
    lamppostGroup.add(spotLight);
    lamppostGroup.add(lightTarget);

    // Permitir que todos los componentes de la farola proyecten y reciban sombras
    lamppostGroup.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    return lamppostGroup;
}

/**
 * NUEVO: Crea una caja de madera.
 * @returns {THREE.Mesh}
 */
export function createWoodenCrate() {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({
        map: createWoodenCrateTexture()
    });
    const crate = new THREE.Mesh(geometry, material);
    crate.castShadow = true;
    crate.receiveShadow = true;
    return crate;
}


/**
 * NUEVO: Crea una hoguera animada con luz.
 * @returns {THREE.Group}
 */
export function createBonfire() {
    const bonfireGroup = new THREE.Group();
    bonfireGroup.userData.isBonfire = true; // Flag for animation

    // Material para los troncos
    const logMaterial = new THREE.MeshStandardMaterial({
        color: 0x6B4F3A, // Un color marrón para la madera
        roughness: 0.9
    });

    // Crear y posicionar los troncos
    const logGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 8);
    
    const logs = [];
    for (let i = 0; i < 6; i++) {
        logs.push(new THREE.Mesh(logGeometry, logMaterial));
    }

    logs[0].rotation.set(0, 0, Math.PI / 2);
    logs[0].position.set(0, 0.15, 0.5);

    logs[1].rotation.set(0, 0, Math.PI / 2);
    logs[1].position.set(0, 0.15, -0.5);

    logs[2].rotation.set(Math.PI / 4, 0, Math.PI / 2);
    logs[2].position.set(0, 0.8, 0);

    logs[3].rotation.set(-Math.PI / 4, 0, Math.PI / 2);
    logs[3].position.set(0, 0.8, 0);

    logs[4].rotation.set(0, Math.PI / 3, Math.PI / 1.5);
    logs[4].position.y = 0.4;
    
    logs[5].rotation.set(0, -Math.PI / 3, Math.PI / 1.5);
    logs[5].position.y = 0.4;

    logs.forEach(log => {
        log.castShadow = true;
        log.receiveShadow = true;
        bonfireGroup.add(log);
    });

    // Luz parpadeante para el fuego
    // Ajustada para tener mayor alcance e intensidad, especialmente de noche
    const fireLight = new THREE.PointLight(0xffaa33, 1, 50, 2); 
    fireLight.position.set(0, 1, 0);
    fireLight.castShadow = true; // La hoguera debe proyectar sombras
    // Mejorar la calidad de las sombras de la luz puntual
    fireLight.shadow.mapSize.width = 1024; // Resolución más alta para sombras de la fogata
    fireLight.shadow.mapSize.height = 1024;
    fireLight.shadow.bias = -0.001; // Ajuste de bias para evitar artefactos
    fireLight.shadow.camera.far = 50; // Rango de las sombras
    bonfireGroup.add(fireLight);
    bonfireGroup.userData.flickeringLight = fireLight;

    // Partículas para la llama (sistema simple)
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < particleCount; i++) {
        positions.push(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 2,
            (Math.random() - 0.5) * 1.5
        );
    }
    particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    // Shader para las partículas de la llama
    const flameMaterial = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.4,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false
    });

    const flameParticles = new THREE.Points(particles, flameMaterial);
    flameParticles.position.y = 0.2;
    bonfireGroup.add(flameParticles);
    bonfireGroup.userData.flameParticles = flameParticles; // Guardar referencia para animar

    return bonfireGroup;
}


// Crea un objeto de árbol
export function createTree() {
    const tree = new THREE.Group();
    const trunkHeight = Math.random() * 4 + 4;
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.7, trunkHeight, 8),
        new THREE.MeshStandardMaterial({ color: 0x8B4513 })
    );
    trunk.position.y = trunkHeight / 2;
    const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(Math.random() * 1 + 2.5, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x006400 })
    );
    leaves.position.y = trunkHeight;
    leaves.scale.y = 0.7;
    tree.add(trunk, leaves);
    tree.traverse(child => { if(child.isMesh) child.castShadow = true; });
    return tree;
}

// Crea un objeto de flor
export function createFlower(color) {
    const flower = new THREE.Group();
    const stemHeight = Math.random() * 0.4 + 0.2;
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, stemHeight, 5),
        new THREE.MeshStandardMaterial({ color: 0x008000 })
    );
    stem.position.y = stemHeight / 2;
    const petals = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.1, 0),
        new THREE.MeshStandardMaterial({ color: color || 0xff0000 })
    );
    petals.position.y = stemHeight;
    flower.add(stem, petals);
    flower.traverse(child => { if(child.isMesh) child.castShadow = true; });
    return flower;
}

// Crea un objeto de pirámide
export function createPyramid() {
    const pyramid = new THREE.Mesh(
        new THREE.ConeGeometry(5, 8, 4),
        new THREE.MeshStandardMaterial({ map: createBrickTexture() })
    );
    pyramid.castShadow = true;
    return pyramid;
}

/**
 * MODIFICADO: Crea un modelo de persona poligonal animada con mayor detalle anatómico.
 * Se utilizan más polígonos y formas más orgánicas para un resultado más realista.
 * @returns {THREE.Group} Un grupo que contiene a la persona animada.
 */
export function createAnimatedPerson() {
    const personGroup = new THREE.Group();
    personGroup.name = "person_root";

    const polyCount = 12; // Aumenta para más detalle (e.g., 12, 16)

    // --- Materiales ---
    const skinMaterial = new THREE.MeshStandardMaterial({
        color: 0xe0a98e, roughness: 0.6, metalness: 0.1,
    });
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x3a8dca, roughness: 0.8, metalness: 0.1,
    });
    const pantsMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333, roughness: 0.8, metalness: 0.1,
    });
    const shoesMaterial = new THREE.MeshStandardMaterial({
        color: 0x2b1a0e, roughness: 0.5
    });

    // --- Huesos (Estructura sin cambios) ---
    const root = new THREE.Bone();
    root.name = 'root';
    personGroup.add(root);
    
    const pelvis = new THREE.Bone();
    pelvis.name = "pelvis";
    root.add(pelvis);

    const torso = new THREE.Bone();
    const chest = new THREE.Bone(); 
    const neck = new THREE.Bone();
    const head = new THREE.Bone();

    const upperLegL = new THREE.Bone();
    const lowerLegL = new THREE.Bone();
    const footL = new THREE.Bone();
    const upperLegR = new THREE.Bone();
    const lowerLegR = new THREE.Bone();
    const footR = new THREE.Bone();

    const shoulderL = new THREE.Bone();
    const upperArmL = new THREE.Bone();
    const lowerArmL = new THREE.Bone();
    const handL = new THREE.Bone();

    const shoulderR = new THREE.Bone();
    const upperArmR = new THREE.Bone();
    const lowerArmR = new THREE.Bone();
    const handR = new THREE.Bone();
    
    // Asignar nombres
    torso.name = "torso";
    chest.name = "chest";
    neck.name = "neck";
    head.name = "head";
    upperLegL.name = "upperLegL";
    lowerLegL.name = "lowerLegL";
    footL.name = "footL";
    upperLegR.name = "upperLegR";
    lowerLegR.name = "lowerLegR";
    footR.name = "footR";
    shoulderL.name = "shoulderL";
    upperArmL.name = "upperArmL";
    lowerArmL.name = "lowerArmL";
    handL.name = "handL";
    shoulderR.name = "shoulderR";
    upperArmR.name = "upperArmR";
    lowerArmR.name = "lowerArmR";
    handR.name = "handR";

    // --- Jerarquía de Huesos ---
    pelvis.add(torso);
    torso.add(chest);
    chest.add(neck);
    neck.add(head);
    pelvis.add(upperLegL);
    upperLegL.add(lowerLegL);
    lowerLegL.add(footL);
    pelvis.add(upperLegR);
    upperLegR.add(lowerLegR);
    lowerLegR.add(footR);
    chest.add(shoulderL);
    shoulderL.add(upperArmL);
    upperArmL.add(lowerArmL);
    lowerArmL.add(handL);
    chest.add(shoulderR);
    shoulderR.add(upperArmR);
    upperArmR.add(lowerArmR);
    lowerArmR.add(handR);

    // --- Posiciones de los Huesos (Altura ~1.8m) ---
    const bodyHeight = 1.8;
    pelvis.position.y = bodyHeight / 2;
    torso.position.y = bodyHeight * 0.1;
    chest.position.y = bodyHeight * 0.25;
    neck.position.y = bodyHeight * 0.15;
    head.position.y = bodyHeight * 0.05;
    upperLegL.position.x = 0.1;
    lowerLegL.position.y = -bodyHeight * 0.25;
    footL.position.y = -bodyHeight * 0.25;
    upperLegR.position.x = -0.1;
    lowerLegR.position.y = -bodyHeight * 0.25;
    footR.position.y = -bodyHeight * 0.25;
    shoulderL.position.x = 0.22;
    shoulderL.position.y = 0.12;
    lowerArmL.position.y = -bodyHeight * 0.20;
    handL.position.y = -bodyHeight * 0.18;
    shoulderR.position.x = -0.22;
    shoulderR.position.y = 0.12;
    lowerArmR.position.y = -bodyHeight * 0.20;
    handR.position.y = -bodyHeight * 0.18;

    // --- Mallas Poligonales con más Detalle ---
    const headGeo = new THREE.SphereGeometry(bodyHeight * 0.07, polyCount * 2, polyCount);
    headGeo.scale(1, 1.1, 1);
    const headMesh = new THREE.Mesh(headGeo, skinMaterial);
    headMesh.position.y = bodyHeight * 0.065;
    head.add(headMesh);
    
    const neckGeo = new THREE.CylinderGeometry(bodyHeight * 0.04, bodyHeight * 0.045, bodyHeight * 0.07, polyCount);
    const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
    neck.add(neckMesh);

    // Torso más detallado
    const chestGeo = new THREE.BoxGeometry(bodyHeight * 0.24, bodyHeight * 0.2, bodyHeight * 0.14);
    const chestMesh = new THREE.Mesh(chestGeo, bodyMaterial);
    chestMesh.position.y = bodyHeight * 0.08;
    chest.add(chestMesh);

    const absGeo = new THREE.CylinderGeometry(bodyHeight * 0.1, bodyHeight * 0.12, bodyHeight * 0.22, polyCount);
    const absMesh = new THREE.Mesh(absGeo, bodyMaterial);
    torso.add(absMesh);

    const pelvisMesh = new THREE.Mesh(new THREE.CylinderGeometry(bodyHeight * 0.1, bodyHeight * 0.1, bodyHeight * 0.1, polyCount), pantsMaterial);
    pelvis.add(pelvisMesh);

    // Hombros
    const shoulderGeo = new THREE.SphereGeometry(bodyHeight * 0.05, polyCount, polyCount);
    shoulderL.add(new THREE.Mesh(shoulderGeo, bodyMaterial));
    shoulderR.add(new THREE.Mesh(shoulderGeo, bodyMaterial));

    // Geometrías para extremidades y articulaciones
    const upperLegGeo = new THREE.CylinderGeometry(bodyHeight * 0.06, bodyHeight * 0.05, bodyHeight * 0.25, polyCount);
    const lowerLegGeo = new THREE.CylinderGeometry(bodyHeight * 0.05, bodyHeight * 0.035, bodyHeight * 0.25, polyCount);
    const upperArmGeo = new THREE.CylinderGeometry(bodyHeight * 0.045, bodyHeight * 0.035, bodyHeight * 0.20, polyCount);
    const lowerArmGeo = new THREE.CylinderGeometry(bodyHeight * 0.035, bodyHeight * 0.025, bodyHeight * 0.18, polyCount);
    const jointGeo = new THREE.SphereGeometry(bodyHeight * 0.04, polyCount, polyCount);

    // Piernas con rodillas
    const upperLegLMesh = new THREE.Mesh(upperLegGeo, pantsMaterial);
    upperLegLMesh.position.y = -bodyHeight * 0.125;
    upperLegL.add(upperLegLMesh);
    const lowerLegLMesh = new THREE.Mesh(lowerLegGeo, pantsMaterial);
    lowerLegLMesh.position.y = -bodyHeight * 0.125;
    lowerLegL.add(lowerLegLMesh);
    lowerLegL.add(new THREE.Mesh(jointGeo, pantsMaterial)); // Rodilla
    
    const upperLegRMesh = new THREE.Mesh(upperLegGeo, pantsMaterial);
    upperLegRMesh.position.y = -bodyHeight * 0.125;
    upperLegR.add(upperLegRMesh);
    const lowerLegRMesh = new THREE.Mesh(lowerLegGeo, pantsMaterial);
    lowerLegRMesh.position.y = -bodyHeight * 0.125;
    lowerLegR.add(lowerLegRMesh);
    lowerLegR.add(new THREE.Mesh(jointGeo, pantsMaterial)); // Rodilla
    
    // Brazos con codos
    const upperArmLMesh = new THREE.Mesh(upperArmGeo, bodyMaterial);
    upperArmLMesh.position.y = -bodyHeight * 0.10;
    upperArmL.add(upperArmLMesh);
    const lowerArmLMesh = new THREE.Mesh(lowerArmGeo, skinMaterial);
    lowerArmLMesh.position.y = -bodyHeight * 0.09;
    lowerArmL.add(lowerArmLMesh);
    lowerArmL.add(new THREE.Mesh(jointGeo, skinMaterial)); // Codo
    
    const upperArmRMesh = new THREE.Mesh(upperArmGeo, bodyMaterial);
    upperArmRMesh.position.y = -bodyHeight * 0.10;
    upperArmR.add(upperArmRMesh);
    const lowerArmRMesh = new THREE.Mesh(lowerArmGeo, skinMaterial);
    lowerArmRMesh.position.y = -bodyHeight * 0.09;
    lowerArmR.add(lowerArmRMesh);
    lowerArmR.add(new THREE.Mesh(jointGeo, skinMaterial)); // Codo

    // Pies
    const footGeo = new THREE.BoxGeometry(bodyHeight * 0.06, bodyHeight * 0.04, bodyHeight * 0.13);
    const footLMesh = new THREE.Mesh(footGeo, shoesMaterial);
    footLMesh.position.z = bodyHeight * 0.045;
    footL.add(footLMesh);
    const footRMesh = new THREE.Mesh(footGeo, shoesMaterial);
    footRMesh.position.z = bodyHeight * 0.045;
    footR.add(footRMesh);

    // Manos
    const handGeo = new THREE.BoxGeometry(bodyHeight * 0.04, bodyHeight * 0.05, bodyHeight * 0.02);
    handL.add(new THREE.Mesh(handGeo, skinMaterial));
    handR.add(new THREE.Mesh(handGeo, skinMaterial));

    // --- Animación ---
    const walkCycleTime = 1.2;
    const times = [0, walkCycleTime / 4, walkCycleTime / 2, (3 * walkCycleTime) / 4, walkCycleTime];
    const swingAngle = Math.PI / 6;
    const elbowBendAngle = Math.PI / 3;

    const q_leg_fwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(-swingAngle, 0, 0));
    const q_leg_back = new THREE.Quaternion().setFromEuler(new THREE.Euler(swingAngle, 0, 0));
    const q_leg_mid = new THREE.Quaternion();
    const q_arm_fwd = new THREE.Quaternion().setFromEuler(new THREE.Euler(swingAngle, 0, 0));
    const q_arm_back = new THREE.Quaternion().setFromEuler(new THREE.Euler(-swingAngle, 0, 0));
    const q_arm_mid = new THREE.Quaternion();
    const q_elbow_bent = new THREE.Quaternion().setFromEuler(new THREE.Euler(-elbowBendAngle, 0, 0));
    const q_elbow_straight = new THREE.Quaternion();

    const upperLegL_track = new THREE.QuaternionKeyframeTrack('upperLegL.quaternion', times, [...q_leg_fwd.toArray(), ...q_leg_mid.toArray(), ...q_leg_back.toArray(), ...q_leg_mid.toArray(), ...q_leg_fwd.toArray()]);
    const upperLegR_track = new THREE.QuaternionKeyframeTrack('upperLegR.quaternion', times, [...q_leg_back.toArray(), ...q_leg_mid.toArray(), ...q_leg_fwd.toArray(), ...q_leg_mid.toArray(), ...q_leg_back.toArray()]);
    const upperArmL_track = new THREE.QuaternionKeyframeTrack('upperArmL.quaternion', times, [...q_arm_back.toArray(), ...q_arm_mid.toArray(), ...q_arm_fwd.toArray(), ...q_arm_mid.toArray(), ...q_arm_back.toArray()]);
    const upperArmR_track = new THREE.QuaternionKeyframeTrack('upperArmR.quaternion', times, [...q_arm_fwd.toArray(), ...q_arm_mid.toArray(), ...q_arm_back.toArray(), ...q_arm_mid.toArray(), ...q_arm_fwd.toArray()]);
    const lowerArmL_track = new THREE.QuaternionKeyframeTrack('lowerArmL.quaternion', times, [...q_elbow_bent.toArray(), ...q_elbow_straight.toArray(), ...q_elbow_bent.toArray(), ...q_elbow_straight.toArray(), ...q_elbow_bent.toArray()]);
    const lowerArmR_track = new THREE.QuaternionKeyframeTrack('lowerArmR.quaternion', times, [...q_elbow_bent.toArray(), ...q_elbow_straight.toArray(), ...q_elbow_bent.toArray(), ...q_elbow_straight.toArray(), ...q_elbow_bent.toArray()]);

    const walkClip = new THREE.AnimationClip('walk', -1, [upperLegL_track, upperLegR_track, upperArmL_track, upperArmR_track, lowerArmL_track, lowerArmR_track]);
    
    personGroup.userData.animations = [walkClip];
    personGroup.traverse(child => {
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    
    personGroup.scale.set(1, 1, 1);
    
    return personGroup;
}


/**
 * ACTUALIZADO: Crea un modelo de personaje personalizable usando la nueva base poligonal realista.
 * @param {object} params - Parámetros de personalización.
 * @returns {THREE.Group} Un grupo que contiene al personaje.
 */
export function createCustomCharacter(params = {}) {
    const {
        headColor = '#e0a98e', // Color de piel por defecto
        bodyColor = '#3a8dca', // Color de camiseta por defecto
        height = 1,
    } = params;

    const group = createAnimatedPerson();
    group.castShadow = true;
    group.receiveShadow = true;
    
    const headMaterial = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.6, metalness: 0.1 });
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8, metalness: 0.1 });

    group.traverse(child => {
        if (child.isMesh) {
            const parentBone = child.parent;
            if (!parentBone || !parentBone.isBone) return;

            const parentName = parentBone.name;

            // Aplicar materiales según el hueso padre
            if (['head', 'neck', 'lowerArmL', 'lowerArmR', 'handL', 'handR'].includes(parentName)) {
                 child.material = headMaterial; // Color de piel
            } else if (['chest', 'torso', 'upperArmL', 'upperArmR', 'shoulderL', 'shoulderR'].includes(parentName)) {
                 child.material = bodyMaterial; // Color de camiseta
            }
            
            // Asignar material a las articulaciones de los codos (que son parte de los antebrazos)
            if (parentName.includes('lowerArm') && child.geometry.type === 'SphereGeometry') {
                child.material = headMaterial; // Skin color for elbows
            }
        }
    });

    const baseScale = group.scale.x; 
    group.scale.set(baseScale * height, baseScale * height, baseScale * height);
    
    group.userData.characterParams = { headColor, bodyColor, height };

    return group;
}

 