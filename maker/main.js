// main.js - LOGICA PRINCIPAL Y CONTROL DE CÁMARA
const CAMERA_SETTINGS = {
    minPitch: 40,            // Ángulo en Zoom Out
    maxPitch: 88,            // Ángulo en Zoom In (prácticamente frontal)
    headScreenOffsetPx: 350, // Píxeles reales en PANTALLA para bajar al personaje y mostrar la cara
    zoomLerp: 0.12,          // Inercia de zoom
    cameraLerp: 0.15         // Inercia del seguimiento
};

let playModeBackup = null;
let cachedViewportDimensions = { width: 0, height: 0 };

function updateViewportCache() {
    const viewport = document.getElementById('viewport-container');
    if (viewport) {
        cachedViewportDimensions.width = viewport.clientWidth;
        cachedViewportDimensions.height = viewport.clientHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('viewport-container');
    if (viewport && typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(() => {
            updateViewportCache();
            fitStage();
        });
        ro.observe(viewport);
    } else {
        updateViewportCache();
    }
    setupCameraControls();
    updateViewportCache();

    const selectAspectRatio = document.getElementById('select-aspect-ratio');
    if (selectAspectRatio) {
        selectAspectRatio.addEventListener('change', () => {
            projectData.aspectRatio = selectAspectRatio.value;
            resetCamera();
            autoSaveJSON();
            renderStage(true);
        });
    }

    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxClose = document.getElementById('lightbox-close');
    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) closeLightbox();
        });
    }
    if (lightboxClose) {
        lightboxClose.addEventListener('click', (e) => {
            e.stopPropagation();
            closeLightbox();
        });
    }

    const btnOpenGeminiConfig = document.getElementById('btn-open-gemini-config');
    const geminiModal = document.getElementById('gemini-config-modal');
    const geminiModalClose = document.getElementById('gemini-modal-close');
    const btnSaveGeminiKey = document.getElementById('btn-save-gemini-key');
    const inputGeminiKey = document.getElementById('modal-gemini-key');

    if (btnOpenGeminiConfig && geminiModal) {
        btnOpenGeminiConfig.addEventListener('click', () => {
            if (inputGeminiKey) {
                inputGeminiKey.value = localStorage.getItem('koreh_gemini_book_api_key') || '';
            }
            geminiModal.style.display = 'flex';
        });
    }
    if (geminiModalClose && geminiModal) {
        geminiModalClose.addEventListener('click', () => {
            geminiModal.style.display = 'none';
        });
    }
    if (geminiModal) {
        geminiModal.addEventListener('click', (e) => {
            if (e.target === geminiModal) {
                geminiModal.style.display = 'none';
            }
        });
    }
    if (btnSaveGeminiKey && inputGeminiKey && geminiModal) {
        btnSaveGeminiKey.addEventListener('click', () => {
            const keyVal = inputGeminiKey.value.trim();
            localStorage.setItem('koreh_gemini_book_api_key', keyVal);
            geminiModal.style.display = 'none';
            alert('API Key de Gemini guardada correctamente.');
        });
    }
});

function setMode(play) {
    isPlayMode = play;
    const btnModeEdit = document.getElementById('btn-mode-edit');
    const btnModePlay = document.getElementById('btn-mode-play');
    const gameUI = document.getElementById('game-ui');

    if (play) {
        playModeBackup = JSON.parse(JSON.stringify(projectData));
        document.body.classList.add('play-mode-active');
        if (btnModeEdit) btnModeEdit.classList.remove('active');
        if (btnModePlay) btnModePlay.classList.add('active');
        if (gameUI) gameUI.style.display = 'block';

        selectedElementId = null;
        currentSceneId = projectData.startScene || Object.keys(projectData.scenes)[0];
        initRuntimeVariables();
        inventoryManager.clear();
        resetCamera();
        renderStage(true);
        renderInventory();
        if (typeof movementEngine !== 'undefined') {
            movementEngine.init();
        }
    } else {
        if (typeof movementEngine !== 'undefined') {
            movementEngine.stop();
        }
        if (playModeBackup) {
            projectData = JSON.parse(JSON.stringify(playModeBackup));
            playModeBackup = null;
        }
        document.body.classList.remove('play-mode-active');
        if (btnModeEdit) btnModeEdit.classList.add('active');
        if (btnModePlay) btnModePlay.classList.remove('active');
        if (gameUI) gameUI.style.display = 'none';

        inventoryManager.clear();
        if (typeof updatePropertiesPanel === 'function') {
            updatePropertiesPanel();
        }
        resetCamera();
        renderStage(true);
        renderInventory();
    }
}

function resetCamera() {
    const dim = typeof getStageDimensions === 'function' ? getStageDimensions() : { width: 960, height: 540 };
    const scene = (projectData && projectData.scenes) ? projectData.scenes[currentSceneId] : null;
    const player = scene && scene.elements ? scene.elements.find(e => e.isPlayer) : null;

    cameraState.zoom = 1.0;
    cameraState.targetZoom = 1.0;

    if (player) {
        cameraState.focusX = player.x + (player.width / 2);
        cameraState.focusY = player.y + (player.height / 2);
    } else {
        cameraState.focusX = dim.width / 2;
        cameraState.focusY = dim.height / 2;
    }

    cameraState.panX = 0;
    cameraState.panY = 0;
    cameraState.rotation = 0;
    cameraState.pitch = isIsometricView ? 60 : 0;
    cameraState.minZoom = 0.5;
    cameraState.maxZoom = 3.0;

    if (typeof fitStage === 'function') {
        fitStage(true);
    }
}

function fitStage(instantCamera = false) {
    const stage = document.getElementById('stage');
    if (!stage) return;
    if (cachedViewportDimensions.width === 0) {
        updateViewportCache();
    }
    const dim = getStageDimensions();
    stage.style.width = dim.width + 'px';
    stage.style.height = dim.height + 'px';
    stage.style.position = 'absolute';
    stage.style.left = '0px';
    stage.style.top = '0px';
    stage.style.margin = '0';
    stage.style.transformOrigin = '0 0';

    const vw = cachedViewportDimensions.width || window.innerWidth;
    const vh = cachedViewportDimensions.height || window.innerHeight;
    const refWidth = 1920;
    const refHeight = 1080;
    const baseScale = Math.min(vw / refWidth, vh / refHeight);

    if (cameraState.targetZoom === undefined) {
        cameraState.targetZoom = cameraState.zoom;
    }

    if (!isPlayMode || instantCamera) {
        cameraState.zoom = cameraState.targetZoom;
    } else {
        cameraState.zoom += (cameraState.targetZoom - cameraState.zoom) * CAMERA_SETTINGS.zoomLerp;
    }

    const finalScale = (isPlayMode ? baseScale : Math.max(baseScale, 0.05)) * cameraState.zoom;

    if (cameraState.focusX === undefined || cameraState.focusX === null) {
        cameraState.focusX = dim.width / 2;
    }
    if (cameraState.focusY === undefined || cameraState.focusY === null) {
        cameraState.focusY = dim.height / 2;
    }
    const minZ = cameraState.minZoom || 0.5;
    const maxZ = cameraState.maxZoom || 3.0;
    const zoomRatio = Math.max(0, Math.min(1, (cameraState.zoom - minZ) / (maxZ - minZ)));
    let screenOffsetY = 0;

    if (isPlayMode) {
        const scene = projectData.scenes[currentSceneId];
        const player = scene ? scene.elements.find(e => e.isPlayer) : null;
        if (player) {
            if (isIsometricView) {
                const targetPitch = CAMERA_SETTINGS.minPitch + (CAMERA_SETTINGS.maxPitch - CAMERA_SETTINGS.minPitch) * zoomRatio;
                if (cameraState.pitch === undefined) cameraState.pitch = 60;
                cameraState.pitch += (targetPitch - cameraState.pitch) * CAMERA_SETTINGS.zoomLerp;
            }
            const targetFocusX = player.x + (player.width / 2);
            const targetFocusY = player.y + player.height;
            screenOffsetY = CAMERA_SETTINGS.headScreenOffsetPx * zoomRatio;

            if (instantCamera || (cameraState.focusX === dim.width / 2 && cameraState.focusY === dim.height / 2)) {
                cameraState.focusX = targetFocusX;
                cameraState.focusY = targetFocusY;
            } else {
                cameraState.focusX += (targetFocusX - cameraState.focusX) * CAMERA_SETTINGS.cameraLerp;
                cameraState.focusY += (targetFocusY - cameraState.focusY) * CAMERA_SETTINGS.cameraLerp;
            }
        }
    }

    const fx = cameraState.focusX;
    const fy = cameraState.focusY;

    const pitch = isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
    const yaw = isIsometricView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;
    if (!isIsometricView) {
        cameraState.pitch = 0;
        cameraState.rotation = 0;
    }
    const centerY = (vh / 2) + screenOffsetY;
    if (isIsometricView) {
        stage.style.transform = `translate3d(${vw / 2}px, ${centerY}px, 0px) scale(${finalScale}) rotateX(${pitch}deg) rotateZ(${yaw}deg) translate3d(${-fx}px, ${-fy}px, 0px)`;
    } else {
        stage.style.transform = `translate3d(${vw / 2}px, ${centerY}px, 0px) scale(${finalScale}) translate3d(${-fx}px, ${-fy}px, 0px)`;
    }
}

function setupCameraControls() {
    const viewport = document.getElementById('viewport-container');
    if (!viewport || viewport.dataset.cameraControlsAttached) return;
    viewport.dataset.cameraControlsAttached = "true";

    let isPanning = false;
    let isRotatingCamera = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startFocusX = 0;
    let startFocusY = 0;
    let startYaw = 0;
    let hasDragged = false;
    let panAnimationFrame = null;

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
        const currentTarget = cameraState.targetZoom !== undefined ? cameraState.targetZoom : cameraState.zoom;
        const newZoom = Math.max(cameraState.minZoom, Math.min(cameraState.maxZoom, currentTarget * zoomFactor));
        cameraState.targetZoom = newZoom;
        fitStage();
    }, { passive: false });

    viewport.addEventListener('mousedown', (e) => {
        const isRightClick = e.button === 2;
        const isMiddleClick = e.button === 1;
        const isShiftLeftClick = e.button === 0 && e.shiftKey;

        if (isPlayMode && isRightClick && isIsometricView) {
            isRotatingCamera = true;
            hasDragged = false;
            startMouseX = e.clientX;
            startYaw = cameraState.rotation || 0;
            viewport.style.cursor = 'grabbing';
        } else if (isMiddleClick || isShiftLeftClick || (!isPlayMode && isRightClick)) {
            isPanning = true;
            hasDragged = false;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            startFocusX = cameraState.focusX !== undefined ? cameraState.focusX : getStageDimensions().width / 2;
            startFocusY = cameraState.focusY !== undefined ? cameraState.focusY : getStageDimensions().height / 2;
            viewport.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning && !isRotatingCamera) return;
        hasDragged = true;

        if (panAnimationFrame) cancelAnimationFrame(panAnimationFrame);
        panAnimationFrame = requestAnimationFrame(() => {
            if (isRotatingCamera && isIsometricView) {
                const deltaX = e.clientX - startMouseX;
                cameraState.rotation = (startYaw - deltaX * 0.5) % 360;
                fitStage();
            } else if (isPanning) {
                const vw = cachedViewportDimensions.width || window.innerWidth;
                const vh = cachedViewportDimensions.height || window.innerHeight;
                const refWidth = 1920;
                const refHeight = 1080;
                const baseScale = Math.min(vw / refWidth, vh / refHeight);
                const finalScale = (isPlayMode ? baseScale : Math.max(baseScale, 0.05)) * cameraState.zoom;
                const pitch = isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0;
                const cosAngle = Math.max(0.1, Math.cos(pitch * Math.PI / 180));

                const deltaX = (e.clientX - startMouseX) / finalScale;
                const deltaY = (e.clientY - startMouseY) / (finalScale * cosAngle);

                cameraState.focusX = startFocusX - deltaX;
                cameraState.focusY = startFocusY - deltaY;
                fitStage();
            }
        });
    });

    window.addEventListener('mouseup', () => {
        if (isPanning || isRotatingCamera) {
            isPanning = false;
            isRotatingCamera = false;
            viewport.style.cursor = 'default';
        }
    });

    viewport.addEventListener('contextmenu', (e) => {
        if (hasDragged || isPlayMode) {
            e.preventDefault();
            e.stopPropagation();
            hasDragged = false;
        }
    }, true);
}

window.addEventListener('resize', () => {
    updateViewportCache();
    fitStage();
});

function handleEntityInteraction(elem) {
    if (!elem || elem._isProcessingInteraction) return;
    elem._isProcessingInteraction = true;
    if (typeof movementEngine !== 'undefined') {
        movementEngine.pendingTargetEntity = null;
        movementEngine.path = [];
        movementEngine.isMoving = false;
        movementEngine.currentSpeed = 0;
    }
    const dialogBox = document.getElementById('dialog-box');
    const dialogText = document.getElementById('dialog-text');
    if (elem.setVariable && elem.setVariable.varId) {
        const varId = elem.setVariable.varId;
        const conf = projectData.variablesConfig ? projectData.variablesConfig[varId] : null;
        let val = elem.setVariable.value;
        if (conf) {
            if (conf.type === 'boolean') {
                val = val === 'true' || val === '1' || val === true;
            } else if (conf.type === 'number') {
                val = Number(val) || 0;
            }
        }
        gameState.variables[varId] = val;
    }
    if (elem.addItem) {
        const itemsToAdd = Array.isArray(elem.addItem)
             ? elem.addItem
             : elem.addItem.split(',').map(s => s.trim()).filter(Boolean);
        itemsToAdd.forEach(itemId => inventoryManager.addItem(itemId, 1));
    }
    if (elem.removeItem) {
        const itemsToRemove = Array.isArray(elem.removeItem)
             ? elem.removeItem
             : elem.removeItem.split(',').map(s => s.trim()).filter(Boolean);
        itemsToRemove.forEach(itemId => inventoryManager.removeItem(itemId, 1));
    }
    if (elem.transformAsset) {
        const savedConfig = projectData.savedElementsConfig || {};
        if (savedConfig[elem.transformAsset]) {
            const targetSavedElem = savedConfig[elem.transformAsset];
            if (targetSavedElem.isText) {
                elem.isText = true;
                elem.textContent = targetSavedElem.textContent || '';
                elem.textColor = targetSavedElem.textColor;
            } else {
                elem.isText = false;
                elem.image = targetSavedElem.image;
            }
            if (targetSavedElem.width) elem.width = targetSavedElem.width;
            if (targetSavedElem.height) elem.height = targetSavedElem.height;
        } else {
            elem.image = elem.transformAsset;
        }
    }
    let elementDestroyed = false;
    if (elem.destroyOnInteract) {
        const currentScene = projectData.scenes[currentSceneId];
        if (currentScene && currentScene.elements) {
            currentScene.elements = currentScene.elements.filter(e => e.id !== elem.id);
            elementDestroyed = true;
        }
    }
    if (elem.dialog) {
        if (dialogText) dialogText.textContent = elem.dialog;
        if (dialogBox) {
            dialogBox.style.display = 'block';
            const closeOnOutsideClick = (e) => {
                if (!dialogBox.contains(e.target)) {
                    dialogBox.style.display = 'none';
                    document.removeEventListener('click', closeOnOutsideClick, true);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeOnOutsideClick, true);
            }, 10);
        }
    }
    renderStage(true);
    if (elem.targetScene && projectData.scenes[elem.targetScene]) {
        changeSceneWithTransition(elem.targetScene, elem.targetX, elem.targetY);
    }
    if (!elementDestroyed) {
        setTimeout(() => {
            delete elem._isProcessingInteraction;
        }, 200);
    }
}

function changeSceneWithTransition(targetSceneId, targetX = null, targetY = null) {
    const fadeOverlay = document.getElementById('fade-overlay');
    if (fadeOverlay) fadeOverlay.style.opacity = '1';
    setTimeout(() => {
        if (projectData.scenes) {
            let currentPlayer = null;
            let currentSceneOwner = null;
            for (const [sKey, sc] of Object.entries(projectData.scenes)) {
                if (sc.elements) {
                    const p = sc.elements.find(e => e.isPlayer);
                    if (p) {
                        currentPlayer = p;
                        currentSceneOwner = sKey;
                        break;
                    }
                }
            }
            if (currentPlayer) {
                if (currentSceneOwner !== targetSceneId) {
                    projectData.scenes[currentSceneOwner].elements = projectData.scenes[currentSceneOwner].elements.filter(e => e.id !== currentPlayer.id);
                    if (!projectData.scenes[targetSceneId].elements) projectData.scenes[targetSceneId].elements = [];
                    projectData.scenes[targetSceneId].elements.push(currentPlayer);
                }
                if (targetX !== null && targetX !== undefined && targetX !== '') {
                    currentPlayer.x = parseInt(targetX, 10);
                }
                if (targetY !== null && targetY !== undefined && targetY !== '') {
                    currentPlayer.y = parseInt(targetY, 10);
                }
            }
        }
        currentSceneId = targetSceneId;
        resetCamera();
        renderStage(true);
        setTimeout(() => {
            if (fadeOverlay) fadeOverlay.style.opacity = '0';
        }, 50);
    }, 400);
}