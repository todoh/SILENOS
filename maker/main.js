// main.js - LÓGICA PRINCIPAL Y CONTROL DE INTERACCIONES DE ENTIDADES

// Variable en memoria para almacenar la copia de respaldo antes de jugar
let playModeBackup = null;

function setMode(play) {
    isPlayMode = play;
    const btnModeEdit = document.getElementById('btn-mode-edit');
    const btnModePlay = document.getElementById('btn-mode-play');
    const gameUI = document.getElementById('game-ui');

    if (play) {
        // 1. GUARDAR COPIA EXACTA DEL ESTADO ANTES DE EMPEZAR A JUGAR
        playModeBackup = JSON.parse(JSON.stringify(projectData));
        document.body.classList.add('play-mode-active');
        if (btnModeEdit) btnModeEdit.classList.remove('active');
        if (btnModePlay) btnModePlay.classList.add('active');
        if (gameUI) gameUI.style.display = 'block';

        selectedElementId = null;
        currentSceneId = projectData.startScene || Object.keys(projectData.scenes)[0];
        initRuntimeVariables();
        inventoryManager.clear();

        // Inicializar el bucle de movimiento una sola vez al entrar en Play Mode
        resetCamera();
        renderStage(true); // Pasar flag indicando cambio de escena/reinicio de cámara
        renderInventory();
        if (typeof movementEngine !== 'undefined') {
            movementEngine.init();
        }
    } else {
        // Detener el bucle de movimiento al salir a Edit Mode
        if (typeof movementEngine !== 'undefined') {
            movementEngine.stop();
        }

        // 2. RESTAURAR EL ESTADO ORIGINAL AL SALIR DEL MODO PLAY
        if (playModeBackup) {
            projectData = JSON.parse(JSON.stringify(playModeBackup));
            playModeBackup = null; // Limpiar buffer de respaldo
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
        renderStage();
        renderInventory();
    }
}

function resetCamera() {
    const dim = getStageDimensions();
    const maxDim = Math.max(dim.width, dim.height);
    cameraState.zoom = 1.0;
    cameraState.panX = 0;
    cameraState.panY = 0;

    if (maxDim > 4000) {
        cameraState.minZoom = 0.9;
        cameraState.maxZoom = 5.0;
    } else {
        cameraState.minZoom = 0.9;
        cameraState.maxZoom = 2.4;
    }
}

function fitStage(instantCamera = false) {
    const stage = document.getElementById('stage');
    const viewport = document.getElementById('viewport-container');
    if (!stage || !viewport) return;

    const dim = getStageDimensions();
    stage.style.width = dim.width + 'px';
    stage.style.height = dim.height + 'px';

    const padding = isPlayMode ? 0 : 40;
    const availableWidth = Math.max(100, viewport.clientWidth - padding);
    const availableHeight = Math.max(100, viewport.clientHeight - padding);
    const scaleX = availableWidth / dim.width;
    const scaleY = availableHeight / dim.height;
    const baseScale = Math.min(scaleX, scaleY);

    const effectiveScale = isPlayMode ? baseScale : Math.max(baseScale, 0.05);
    const finalScale = effectiveScale * cameraState.zoom;

    if (isPlayMode) {
        const scene = projectData.scenes[currentSceneId];
        const player = scene ? scene.elements.find(e => e.isPlayer) : null;

        if (player) {
            const playerCenterX = player.x + (player.width / 2);
            const playerCenterY = player.y + (player.height / 2);
            const targetPanX = (viewport.clientWidth / 2) - (playerCenterX * finalScale);
            const targetPanY = (viewport.clientHeight / 2) - (playerCenterY * finalScale);

            // Si es renderizado estático/cambio de escena o panX/panY están en 0, fijar instantáneamente
            if (instantCamera || (cameraState.panX === 0 && cameraState.panY === 0)) {
                cameraState.panX = targetPanX;
                cameraState.panY = targetPanY;
            } else {
                const cameraLerp = 0.08;
                cameraState.panX += (targetPanX - cameraState.panX) * cameraLerp;
                cameraState.panY += (targetPanY - cameraState.panY) * cameraLerp;
            }

            stage.style.transformOrigin = '0 0';
            stage.style.transform = `translate(${cameraState.panX}px, ${cameraState.panY}px) scale(${finalScale})`;
        } else {
            const centerX = (viewport.clientWidth - (dim.width * finalScale)) / 2;
            const centerY = (viewport.clientHeight - (dim.height * finalScale)) / 2;
            cameraState.panX = centerX;
            cameraState.panY = centerY;
            stage.style.transformOrigin = '0 0';
            stage.style.transform = `translate(${centerX}px, ${centerY}px) scale(${finalScale})`;
        }
    } else {
        const baseCenterX = (viewport.clientWidth - (dim.width * finalScale)) / 2;
        const baseCenterY = (viewport.clientHeight - (dim.height * finalScale)) / 2;
        stage.style.transformOrigin = '0 0';
        stage.style.transform = `translate(${baseCenterX + cameraState.panX}px, ${baseCenterY + cameraState.panY}px) scale(${finalScale})`;
    }
}

function setupCameraControls() {
    const viewport = document.getElementById('viewport-container');
    if (!viewport || viewport.dataset.cameraControlsAttached) return;
    viewport.dataset.cameraControlsAttached = "true";

    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    let hasDragged = false;

    viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
        const newZoom = Math.max(cameraState.minZoom, Math.min(cameraState.maxZoom, cameraState.zoom * zoomFactor));
        cameraState.zoom = newZoom;
        fitStage();
    }, { passive: false });

    viewport.addEventListener('mousedown', (e) => {
        const isRightClickEditing = !isPlayMode && e.button === 2;
        const isMiddleClick = e.button === 1;
        const isShiftLeftClick = e.button === 0 && e.shiftKey;

        if (isMiddleClick || isShiftLeftClick || isRightClickEditing) {
            isPanning = true;
            hasDragged = false;
            startPanX = e.clientX - cameraState.panX;
            startPanY = e.clientY - cameraState.panY;
            viewport.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        hasDragged = true;
        cameraState.panX = e.clientX - startPanX;
        cameraState.panY = e.clientY - startPanY;
        fitStage();
    });

    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            viewport.style.cursor = 'default';
        }
    });

    viewport.addEventListener('contextmenu', (e) => {
        if (hasDragged) {
            e.preventDefault();
            e.stopPropagation();
            hasDragged = false;
        }
    }, true);
}

window.addEventListener('resize', () => fitStage());

document.addEventListener('DOMContentLoaded', () => {
    setupCameraControls();

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

function handleEntityInteraction(elem) {
    if (!elem || elem._isProcessingInteraction) return;
    elem._isProcessingInteraction = true;

    // Detener movimiento del jugador y limpiar entidad pendiente inmediatamente antes de continuar
    if (typeof movementEngine !== 'undefined') {
        movementEngine.pendingTargetEntity = null;
        movementEngine.path = [];
        movementEngine.isMoving = false;
        movementEngine.currentSpeed = 0;
    }

    const dialogBox = document.getElementById('dialog-box');
    const dialogText = document.getElementById('dialog-text');

    // 1. Modificación de variables globales
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

    // 2. Adición de ítems al inventario
    if (elem.addItem) {
        const itemsToAdd = Array.isArray(elem.addItem)
            ? elem.addItem
            : elem.addItem.split(',').map(s => s.trim()).filter(Boolean);
        itemsToAdd.forEach(itemId => inventoryManager.addItem(itemId, 1));
    }

    // 3. Remoción de ítems del inventario
    if (elem.removeItem) {
        const itemsToRemove = Array.isArray(elem.removeItem)
            ? elem.removeItem
            : elem.removeItem.split(',').map(s => s.trim()).filter(Boolean);
        itemsToRemove.forEach(itemId => inventoryManager.removeItem(itemId, 1));
    }

    // 4. Transformación Visual del Elemento
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

    // 5. Destrucción / Desaparición del Elemento del Mapa
    let elementDestroyed = false;
    if (elem.destroyOnInteract) {
        const currentScene = projectData.scenes[currentSceneId];
        if (currentScene && currentScene.elements) {
            currentScene.elements = currentScene.elements.filter(e => e.id !== elem.id);
            elementDestroyed = true;
        }
    }

    // 6. Mostrar diálogo si aplica
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

    // Renderizar escenario fijando la cámara directamente en la posición actual
    renderStage(true);

    // 7. Teletransporte / Cambio de Escena
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