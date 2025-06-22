import * as THREE from 'three';
import { appState, thumbnailGenerator } from './editor-escenas-main.js';
import { addPaletteItem, showModal } from './editor-escenas-ui.js';
import { createCustomCharacter } from './editor-escenas-modelos.js';

// --- Estado del Módulo ---
let modal, previewContainer;
let previewScene, previewCamera, previewRenderer, previewObject, previewMixer;
let nameInput, skinColorInput, shirtColorInput, heightInput, heightValueSpan;
let morphSliders = {};
let previewClock;
let isInitialized = false;

/**
 * Inicializa el creador de personajes, configurando la escena de previsualización y los listeners.
 */
// ===== CORRECCIÓN: Se añade 'export' para que la función sea visible desde otros módulos =====
export function initCharacterCreator() {
    if (isInitialized) return;

    modal = document.getElementById('character-creator-modal');
    previewContainer = document.getElementById('character-preview-advanced');
    
    nameInput = document.getElementById('char-name');
    skinColorInput = document.getElementById('char-skin-color');
    shirtColorInput = document.getElementById('char-shirt-color');
    heightInput = document.getElementById('char-height');
    heightValueSpan = document.getElementById('char-height-value');

    previewClock = new THREE.Clock();

    if (!previewContainer) {
        console.error("El contenedor de previsualización de personaje no se encontró en el DOM.");
        return;
    }

    // --- Escena de Previsualización ---
    previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    previewContainer.appendChild(previewRenderer.domElement);

    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x404040);

    previewCamera = new THREE.PerspectiveCamera(50, previewContainer.clientWidth / previewContainer.clientHeight, 0.1, 100);
    previewCamera.position.set(0, 0.9, 2.5);
    previewCamera.lookAt(0, 0.8, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    previewScene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(3, 5, 5);
    previewScene.add(directionalLight);
    
    // --- Listeners de la UI ---
    document.getElementById('create-character-btn-container').addEventListener('click', openCharacterCreator);
    document.getElementById('cancel-char-creation-btn').addEventListener('click', closeCharacterCreator);
    document.getElementById('save-char-btn').addEventListener('click', saveCharacter);

    [nameInput, skinColorInput, shirtColorInput, heightInput].forEach(input => {
        if(input) input.addEventListener('input', updatePreviewCharacter);
    });
    
    animatePreview();
    isInitialized = true;
}

/**
 * Genera dinámicamente los sliders para los morph targets.
 */
function createMorphSliders(mesh) {
    const container = document.getElementById('morph-controls-container');
    if (!container) return;
    container.innerHTML = '';
    morphSliders = {};

    if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
        const value = mesh.morphTargetInfluences[index];
        const controlGroup = document.createElement('div');
        controlGroup.className = 'control-group';
        const label = document.createElement('label');
        label.className = 'control-label';
        label.htmlFor = `morph-${index}`;
        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        const valueSpan = document.createElement('span');
        valueSpan.id = `morph-value-${index}`;
        valueSpan.textContent = value.toFixed(2);
        label.appendChild(nameSpan);
        label.appendChild(valueSpan);
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `morph-${index}`;
        slider.min = 0;
        slider.max = 1;
        slider.step = 0.01;
        slider.value = value;
        slider.dataset.morphName = name;
        controlGroup.appendChild(label);
        controlGroup.appendChild(slider);
        container.appendChild(controlGroup);
        morphSliders[name] = slider;
        slider.addEventListener('input', () => {
             valueSpan.textContent = parseFloat(slider.value).toFixed(2);
             updatePreviewCharacter();
        });
    }
}

/**
 * Recoge los valores de la UI y los empaqueta en un objeto "ADN".
 */
function buildDnaFromUI() {
    const morphs = {};
    for (const morphName in morphSliders) {
        morphs[morphName] = parseFloat(morphSliders[morphName].value);
    }
    return {
        name: nameInput.value.trim(),
        skinColor: skinColorInput.value,
        shirtColor: shirtColorInput.value,
        height: parseFloat(heightInput.value),
        morphs: morphs
    };
}

/**
 * Actualiza el personaje en la previsualización.
 */
function updatePreviewCharacter() {
    if (previewObject) {
        previewScene.remove(previewObject);
        previewObject.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else if(child.material) {
                    child.material.dispose();
                }
            }
        });
    }
    
    if (heightValueSpan) {
        heightValueSpan.textContent = parseFloat(heightInput.value).toFixed(2);
    }
    
    const dna = buildDnaFromUI();
    previewObject = createCustomCharacter(dna);
    previewScene.add(previewObject);

    if (previewObject.userData.animations && previewObject.userData.animations.length > 0) {
        previewMixer = new THREE.AnimationMixer(previewObject);
        const action = previewMixer.clipAction(previewObject.userData.animations[0]);
        action.play();
    }
}

/**
 * Abre el creador de personajes.
 */
function openCharacterCreator() {
    modal.style.display = 'flex';
    
    const tempCharacter = createCustomCharacter();
    const headMesh = tempCharacter.getObjectByName('headMesh');
    createMorphSliders(headMesh);
    
    if (previewRenderer && previewContainer.clientWidth > 0) {
        previewCamera.aspect = previewContainer.clientWidth / previewContainer.clientHeight;
        previewCamera.updateProjectionMatrix();
        previewRenderer.setSize(previewContainer.clientWidth, previewContainer.clientHeight);
    }

    updatePreviewCharacter();
}

function closeCharacterCreator() {
    modal.style.display = 'none';
}

async function saveCharacter() {
    const dna = buildDnaFromUI();
    if (!dna.name) {
        await showModal("Por favor, dale un nombre a tu personaje.");
        return;
    }

    const objectType = `character_${Date.now()}`;
    dna.type = objectType;

    appState.userCharacters.set(objectType, dna);

    const thumbnailObject = createCustomCharacter(dna);
    const thumbnail = thumbnailGenerator.generate(thumbnailObject);
    
    addPaletteItem(objectType, dna.name, thumbnail);

    await showModal(`'${dna.name}' ha sido guardado en la paleta.`);
    closeCharacterCreator();
}

function animatePreview() {
    requestAnimationFrame(animatePreview);
    if (modal.style.display !== 'none' && previewObject) {
        if (previewMixer) {
            previewMixer.update(previewClock.getDelta());
        }
        previewObject.rotation.y += 0.01;
        previewRenderer.render(previewScene, previewCamera);
    }
}
