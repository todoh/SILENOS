// En editor-escenas-main.js
 

// Importaciones de Three.js y sus complementos
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import TWEEN from 'tween';

// Importaciones para Post-Procesado
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- IMPORTACIONES DE MÓDULOS LOCALES (CORREGIDO Y CONSOLIDADO) ---
import { initCharacterCreator } from './character-creator.js';
import { initTimeline, updateTimelineUI } from './editor-escenas-animacion.js';
import { 
    setupEventListeners, 
    onWindowResize, 
    setCameraMode
,populateObjectPalette    
} from './editor-escenas-ui.js';
import { 
    animateParticles, 
    setupDayNightCycle, 
    updateDayNightCycle,
    setVolumetricClouds 
} from './editor-escenas-weather.js';
import { 
    createPaintableGroundTexture, 
    createGrassTexture, 
    initializeHeightmap,
    paintOnGround, 
    setBrushTexture, 
    setBrushSize, 
    terrainTextures
} from './editor-escenas-terreno.js';
const thumbnailGenerator = {
    renderer: null,
    scene: null,
    camera: null,
    init: function() {
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(128, 128);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);
    },
    generate: function(object) {
        if (!this.renderer) this.init();

        while(this.scene.children.length > 2){
            this.scene.remove(this.scene.children[2]);
        }

        const objClone = object.clone();
        this.scene.add(objClone);

        const box = new THREE.Box3().setFromObject(objClone);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        if(maxDim === 0) return '';

        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.2;

        this.camera.position.set(center.x, center.y, center.z + cameraZ);
        this.camera.lookAt(center);

        this.renderer.render(this.scene, this.camera);
        return this.renderer.domElement.toDataURL('image/png');
    }
};
// --- CONSTANTES Y GLOBALES ---
const sceneContainer = document.getElementById('scene-container');
const groundSize = 1200;
const gltfLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const cameraMinHeight = 0.1; 
const firstPersonEyeHeight = 1.7;

const PROGRAMMED_CAMERA_POSITION = new THREE.Vector3(0, 3, 90);
const PROGRAMMED_CAMERA_TARGET = new THREE.Vector3(0, 8, 0);

let scene, camera, renderer, ground, controls, transformControls, composer;
let raycaster, mouse;
let grassTexture;
let paintableGroundTexture;
let clock;

let terrainGeometry;
let heightmapTexture;
const groundSegments = 256;

// --- GESTIÓN DE ESTADO ---
const appState = {
    isRenderingVideo: false,
    placementMode: null,
    selectedObject: null,
    customModels: new Map(),
    customImages: new Map(),
    userCharacters: new Map(),
    allObjects: new Map(),
    animatedTextures: [],
    allAnimations: [],
    animationMixers: [],
    animationSetupData: null,
    isDay: true,
    precipitationType: 'none',
    fogDensity: 0.00025,
    cloudDensity: 0,
    volumetricCloudAmount: 0,
    cameraMode: 'free',
    applyGravityOnPlacement: true,
    exportResolution: '1280x720',
    currentAspectRatio: '16/9',
    timelineDuration: 0,
    currentTime: 0,
    isPlaying: false,
    isPainting: false,
    brushStrength: 0.1,
    currentTerrainTexture: 'grass',
    brushSize: 50,
    isSculpting: false,
    sculptStrength: 1.0,
    sculptMode: 'raise',
    flattenHeight: 0.0
};

// Se expone appState y otras variables globales de Three.js
export {
    scene, camera, renderer, ground, controls, transformControls, raycaster, mouse, grassTexture, composer,
    appState, groundSize, gltfLoader, textureLoader, sceneContainer, cameraMinHeight, firstPersonEyeHeight,
    paintOnGround, setBrushTexture, setBrushSize, terrainTextures,
    terrainGeometry, heightmapTexture, groundSegments, thumbnailGenerator
};

export function applyCameraModeSettings(mode) {
    appState.cameraMode = mode;
    controls.enabled = true;
    
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
    };

    switch (mode) {
        case 'free':
            controls.enablePan = true;
            controls.enableZoom = true;
            controls.minDistance = 0.1;
            controls.maxDistance = Infinity;
            controls.minPolarAngle = 0;
            controls.maxPolarAngle = Math.PI;
            controls.target.set(0, 5, 0); 
            break;
        case 'firstPerson':
            controls.enablePan = false; 
            controls.enableZoom = false; 
            controls.minDistance = 0.001; 
            controls.maxDistance = 0.001; 
            controls.minPolarAngle = 0; 
            controls.maxPolarAngle = Math.PI - 0.01; 
            controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: null 
            };
            break;
        case 'programmed':
            controls.enabled = false;
            
            new TWEEN.Tween(camera.position)
                .to(PROGRAMMED_CAMERA_POSITION, 1500) 
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();

            new TWEEN.Tween(controls.target)
                .to(PROGRAMMED_CAMERA_TARGET, 1500)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
            break;
    }
    controls.update();
}


// --- INICIALIZACIÓN DE LA ESCENA ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    scene.fog = new THREE.FogExp2(0x333333, appState.fogDensity);

    camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    camera.position.set(0, 40, 80);

    renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    sceneContainer.appendChild(renderer.domElement);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const ssaoPass = new SSAOPass(scene, camera, renderer.domElement.width, renderer.domElement.height);
    ssaoPass.kernelRadius = 0.1;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.03;
    composer.addPass(ssaoPass);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.9;
    bloomPass.strength = 0.4;
    bloomPass.radius = 0.2;
    composer.addPass(bloomPass);
    
    const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());
    composer.addPass(smaaPass);
    
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 5, 0);

    applyCameraModeSettings('free'); 

    transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls);

    transformControls.addEventListener('dragging-changed', (event) => {
        controls.enabled = !event.value;
        if (event.value === false && appState.selectedObject && appState.applyGravityOnPlacement) {
            // Suponiendo que alignObjectToGround existe en otro módulo importado correctamente
            // alignObjectToGround(appState.selectedObject);
        }
    });

    setupDayNightCycle(); 
    setVolumetricClouds(appState.volumetricCloudAmount);

    grassTexture = createGrassTexture();
    paintableGroundTexture = createPaintableGroundTexture(groundSize, grassTexture);

    const initialHeightmapData = initializeHeightmap(groundSegments);
    heightmapTexture = new THREE.DataTexture(initialHeightmapData.data, initialHeightmapData.width, initialHeightmapData.height, initialHeightmapData.format);
    heightmapTexture.needsUpdate = true;
    heightmapTexture.magFilter = THREE.LinearFilter;
    heightmapTexture.minFilter = THREE.LinearFilter;
    heightmapTexture.wrapS = THREE.ClampToEdgeWrapping;
    heightmapTexture.wrapT = THREE.ClampToEdgeWrapping;

    terrainGeometry = new THREE.PlaneGeometry(groundSize, groundSize, groundSegments, groundSegments);
    
    const groundMaterial = new THREE.MeshStandardMaterial({
        map: paintableGroundTexture,
        metalness: 0.1,
        roughness: 0.8,
    });
    ground = new THREE.Mesh(terrainGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    clock = new THREE.Clock();

      // --- ORDEN DE INICIALIZACIÓN CORREGIDO Y ROBUSTO ---
    thumbnailGenerator.init(); // 1. Inicializa la herramienta de miniaturas primero.
    populateObjectPalette();   // 2. Llena la paleta de objetos (ahora puede usar el thumbnailGenerator).
    setupEventListeners();     // 3. Configura todos los listeners de la UI.
    initCharacterCreator();    // 4. Inicializa el creador de personajes.
    initTimeline();
    onWindowResize();          // 5. Ajusta el tamaño del canvas por primera vez.
    
    animate();
    setTimeout(() => {
        setCameraMode('programmed');
    }, 800);
}

// Bucle principal de animación
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); 
    const time = performance.now(); 
    controls.update();

    if (appState.cameraMode === 'firstPerson') {
        camera.position.y = firstPersonEyeHeight;
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        controls.target.copy(camera.position).add(direction.multiplyScalar(0.01)); 
    } else {
        if (camera.position.y < cameraMinHeight) {
            camera.position.y = cameraMinHeight;
        }
        controls.target.y = Math.max(controls.target.y, camera.position.y - 50); 
    }
    
    for (const mixer of appState.animationMixers) {
        mixer.update(delta);
    }

    appState.allObjects.forEach(obj => {
        if (obj.userData.isBonfire) {
            const light = obj.userData.flickeringLight;
            if (light) {
                const baseIntensity = appState.isDay ? 0.3 : 2.5; 
                light.intensity = baseIntensity + Math.sin(time * 0.005) * (baseIntensity * 0.4) + Math.random() * (baseIntensity * 0.3);
                light.power = light.intensity * 4 * Math.PI;
            }
            const particles = obj.userData.flameParticles;
            if (particles) {
                const positions = particles.geometry.attributes.position.array;
                const particleSpeed = appState.isDay ? 0.02 : 0.04; 
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += particleSpeed + Math.random() * (particleSpeed * 0.5);
                    if (positions[i + 1] > 2.5) {
                        positions[i+1] = Math.random() * 0.5;
                        positions[i] = (Math.random() - 0.5) * 1.0;
                        positions[i+2] = (Math.random() - 0.5) * 1.0;
                    }
                }
                particles.geometry.attributes.position.needsUpdate = true;
                particles.material.opacity = appState.isDay ? 0.6 : 0.9; 
            }
        }
    });

    TWEEN.update();
    updateDayNightCycle();
    animateParticles();

    for (const texture of appState.animatedTextures) {
        texture.needsUpdate = true;
    }

    composer.render(delta);
}

// --- START APPLICATION ---
document.addEventListener('DOMContentLoaded', () => {
    init();
});