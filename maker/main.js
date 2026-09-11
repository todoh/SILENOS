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
let _lastStageTransform = '';
let _lastStageWidth = '';
let _lastStageHeight = '';

let fpsFrameCount = 0;
let fpsLastTime = performance.now();
let currentFPS = 0;
let fpsElement = null;

function getBaseResolution() {
    const baseW = (projectData && projectData.baseWidth) ? parseInt(projectData.baseWidth, 10) : 1920;
    const baseH = (projectData && projectData.baseHeight) ? parseInt(projectData.baseHeight, 10) : 1080;
    return {
        baseWidth: Math.max(100, baseW || 1920),
        baseHeight: Math.max(100, baseH || 1080)
    };
}

function getScreenOffsetY() {
    if (!isPlayMode) return 0;
    const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
    const player = scene && scene.elements ? scene.elements.find(e => e.isPlayer) : null;
    if (!player) return 0;
    const minZ = cameraState.minZoom || 0.5;
    const maxZ = cameraState.maxZoom || 3.0;
    const zoomRatio = Math.max(0, Math.min(1, (cameraState.zoom - minZ) / (maxZ - minZ)));
    const headOffset = typeof CAMERA_SETTINGS !== 'undefined' ? CAMERA_SETTINGS.headScreenOffsetPx : 350;
    return headOffset * zoomRatio;
}

function getCanvasWorldCoordinates(e) {
    const viewport = document.getElementById('viewport-container');
    const dim = getStageDimensions();
    if (!viewport || !dim.width || !dim.height) return { clickX: 0, clickY: 0, finalScale: 1 };
    
    const viewportRect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - viewportRect.left;
    const mouseY = e.clientY - viewportRect.top;
    
    const vw = cachedViewportDimensions.width || viewport.clientWidth || window.innerWidth;
    const vh = cachedViewportDimensions.height || viewport.clientHeight || window.innerHeight;
    
    const refWidth = 1920;
    const refHeight = 1080;
    const baseScale = Math.min(vw / refWidth, vh / refHeight);
    const finalScale = (isPlayMode ? baseScale : Math.max(baseScale, 0.05)) * cameraState.zoom;
    
    const fx = cameraState.focusX !== undefined ? cameraState.focusX : (dim.width / 2);
    const fy = cameraState.focusY !== undefined ? cameraState.focusY : (dim.height / 2);
    
    const is3DView = isIsometricView || (cameraState.pitch !== undefined && cameraState.pitch !== 0) || (cameraState.rotation !== undefined && cameraState.rotation !== 0);
    const pitch = is3DView ? (cameraState.pitch !== undefined ? cameraState.pitch : (isIsometricView ? 60 : 0)) : 0;
    const yaw = is3DView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0;
    const screenOffsetY = getScreenOffsetY();
    
    const dyCenter = mouseY - (vh / 2);
    const perspectiveD = 1200;
    let X2, Y2;
    
    if (is3DView && Math.abs(pitch) > 0.1) {
        const pitchRad = pitch * (Math.PI / 180);
        const sinPitch = Math.sin(pitchRad);
        const cosPitch = Math.cos(pitchRad);
        let denomY = perspectiveD * cosPitch + dyCenter * sinPitch;
        if (Math.abs(denomY) < 0.001) denomY = 0.001 * (denomY < 0 ? -1 : 1);
        Y2 = (perspectiveD * (dyCenter - screenOffsetY)) / (finalScale * denomY);
        X2 = ((mouseX - (vw / 2)) * (perspectiveD - finalScale * Y2 * sinPitch)) / (perspectiveD * finalScale);
    } else {
        X2 = (mouseX - (vw / 2)) / finalScale;
        Y2 = (dyCenter - screenOffsetY) / finalScale;
    }
    
    const yawRad = yaw * (Math.PI / 180);
    const cosYaw = Math.cos(yawRad);
    const sinYaw = Math.sin(yawRad);
    
    const worldDx = X2 * cosYaw + Y2 * sinYaw;
    const worldDy = -X2 * sinYaw + Y2 * cosYaw;
    
    const clickX = Math.round(fx + worldDx);
    const clickY = Math.round(fy + worldDy);
    
    return { clickX, clickY, finalScale };
}

function initFPSCounter() {
    const gameUI = document.getElementById('game-ui');
    if (!gameUI) return;
    
    fpsElement = document.getElementById('fps-counter');
    if (!fpsElement) {
        fpsElement = document.createElement('div');
        fpsElement.id = 'fps-counter';
        fpsElement.style.cssText = `
            position: absolute;
            top: 16px;
            left: 16px;
            background: rgba(0, 0, 0, 0.75);
            color: #00ff66;
            font-family: monospace;
            font-size: 12px;
            font-weight: bold;
            padding: 4px 8px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            pointer-events: none;
            z-index: 100000;
            display: none;
        `;
        gameUI.appendChild(fpsElement);
    }
}

function updateFPSCounter() {
    if (!isPlayMode) return;
    
    fpsFrameCount++;
    const now = performance.now();
    const delta = now - fpsLastTime;
    
    if (delta >= 500) {
        currentFPS = Math.round((fpsFrameCount * 1000) / delta);
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${currentFPS}`;
        }
        fpsFrameCount = 0;
        fpsLastTime = now;
    }
}

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

    const btnOpenSettings = document.getElementById('btn-open-settings');
    const settingsModal = document.getElementById('settings-modal');
    const settingsModalClose = document.getElementById('settings-modal-close');
    const btnSaveSettingsModal = document.getElementById('btn-save-settings-modal');
    const btnCancelSettingsModal = document.getElementById('btn-cancel-settings-modal');
    const selectBaseRes = document.getElementById('modal-base-resolution');
    const baseCustomDim = document.getElementById('modal-base-custom-dim');
    const inputBaseW = document.getElementById('modal-base-width');
    const inputBaseH = document.getElementById('modal-base-height');

    if (btnOpenSettings && settingsModal) {
        btnOpenSettings.addEventListener('click', () => {
            const { baseWidth, baseHeight } = getBaseResolution();
            if (inputBaseW) inputBaseW.value = baseWidth;
            if (inputBaseH) inputBaseH.value = baseHeight;
            const resStr = `${baseWidth}x${baseHeight}`;
            const matchingOpt = selectBaseRes ? Array.from(selectBaseRes.options).find(o => o.value === resStr) : null;
            if (matchingOpt) {
                selectBaseRes.value = resStr;
                if (baseCustomDim) baseCustomDim.style.display = 'none';
            } else if (selectBaseRes) {
                selectBaseRes.value = 'custom';
                if (baseCustomDim) baseCustomDim.style.display = 'flex';
            }
            settingsModal.style.display = 'flex';
        });
    }

    if (selectBaseRes && baseCustomDim) {
        selectBaseRes.addEventListener('change', () => {
            if (selectBaseRes.value === 'custom') {
                baseCustomDim.style.display = 'flex';
            } else {
                baseCustomDim.style.display = 'none';
                const [w, h] = selectBaseRes.value.split('x').map(Number);
                if (inputBaseW) inputBaseW.value = w;
                if (inputBaseH) inputBaseH.value = h;
            }
        });
    }

    const closeSettingsModal = () => {
        if (settingsModal) settingsModal.style.display = 'none';
    };

    if (settingsModalClose) settingsModalClose.addEventListener('click', closeSettingsModal);
    if (btnCancelSettingsModal) btnCancelSettingsModal.addEventListener('click', closeSettingsModal);
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeSettingsModal();
        });
    }

    if (btnSaveSettingsModal) {
        btnSaveSettingsModal.addEventListener('click', () => {
            let w = 1920;
            let h = 1080;
            if (selectBaseRes.value === 'custom') {
                w = parseInt(inputBaseW.value, 10) || 1920;
                h = parseInt(inputBaseH.value, 10) || 1080;
            } else {
                const parts = selectBaseRes.value.split('x').map(Number);
                w = parts[0] || 1920;
                h = parts[1] || 1080;
            }
            projectData.baseWidth = Math.max(100, w);
            projectData.baseHeight = Math.max(100, h);
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            resetCamera();
            fitStage(true);
            closeSettingsModal();
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
        
        initFPSCounter();
        if (fpsElement) fpsElement.style.display = 'block';
        fpsFrameCount = 0;
        fpsLastTime = performance.now();
        
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
        if (fpsElement) fpsElement.style.display = 'none';
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
    _lastStageTransform = '';
    
    if (typeof fitStage === 'function') {
        fitStage(true);
    }
}

function fitStage(instantCamera = false) {
    if (isPlayMode) {
        updateFPSCounter();
        if (inventoryManager.isMenuOpen) {
            inventoryManager.updateMenuPosition();
        }
    }
    
    const stage = document.getElementById('stage');
    const viewport = document.getElementById('viewport-container');
    if (!stage) return;
    
    if (cachedViewportDimensions.width === 0) {
        updateViewportCache();
    }
    
    const dim = getStageDimensions();
    const wStr = dim.width + 'px';
    const hStr = dim.height + 'px';
    
    if (_lastStageWidth !== wStr) {
        stage.style.width = wStr;
        _lastStageWidth = wStr;
    }
    if (_lastStageHeight !== hStr) {
        stage.style.height = hStr;
        _lastStageHeight = hStr;
    }
    
    if (stage.style.position !== 'absolute') {
        stage.style.position = 'absolute';
        stage.style.left = '0px';
        stage.style.top = '0px';
        stage.style.margin = '0';
        stage.style.transformOrigin = '0 0';
    }
    
    const vw = cachedViewportDimensions.width || window.innerWidth;
    const vh = cachedViewportDimensions.height || window.innerHeight;
    
    const refWidth = 1920;
    const refHeight = 1080;
    const framingScale = Math.min(vw / refWidth, vh / refHeight);
    
    const { baseWidth, baseHeight } = getBaseResolution();
    const isLowRes = (baseWidth < 1920 || baseHeight < 1080);
    
    if (viewport) {
        viewport.style.imageRendering = isLowRes ? 'pixelated' : 'auto';
    }
    if (stage) {
        stage.style.imageRendering = isLowRes ? 'pixelated' : 'auto';
    }
    
    if (cameraState.targetZoom === undefined) {
        cameraState.targetZoom = cameraState.zoom;
    }
    
    if (!isPlayMode || instantCamera) {
        cameraState.zoom = cameraState.targetZoom;
    } else {
        const diffZoom = cameraState.targetZoom - cameraState.zoom;
        if (Math.abs(diffZoom) > 0.0001) {
            cameraState.zoom += diffZoom * CAMERA_SETTINGS.zoomLerp;
        } else {
            cameraState.zoom = cameraState.targetZoom;
        }
    }
    
    const finalScale = (isPlayMode ? framingScale : Math.max(framingScale, 0.05)) * cameraState.zoom;
    
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
                const diffPitch = targetPitch - cameraState.pitch;
                if (Math.abs(diffPitch) > 0.01) {
                    cameraState.pitch += diffPitch * CAMERA_SETTINGS.zoomLerp;
                } else {
                    cameraState.pitch = targetPitch;
                }
            }
            
            const targetFocusX = player.x + (player.width / 2);
            const targetFocusY = player.y + player.height;
            screenOffsetY = CAMERA_SETTINGS.headScreenOffsetPx * zoomRatio;
            
            if (instantCamera || (cameraState.focusX === dim.width / 2 && cameraState.focusY === dim.height / 2)) {
                cameraState.focusX = targetFocusX;
                cameraState.focusY = targetFocusY;
            } else {
                const diffX = targetFocusX - cameraState.focusX;
                const diffY = targetFocusY - cameraState.focusY;
                if (Math.abs(diffX) > 0.05) {
                    cameraState.focusX += diffX * CAMERA_SETTINGS.cameraLerp;
                } else {
                    cameraState.focusX = targetFocusX;
                }
                if (Math.abs(diffY) > 0.05) {
                    cameraState.focusY += diffY * CAMERA_SETTINGS.cameraLerp;
                } else {
                    cameraState.focusY = targetFocusY;
                }
            }
        }
    }
    
    const fx = Math.round(cameraState.focusX * 100) / 100;
    const fy = Math.round(cameraState.focusY * 100) / 100;
    const pitch = Math.round((isIsometricView ? (cameraState.pitch !== undefined ? cameraState.pitch : 60) : 0) * 100) / 100;
    const yaw = Math.round((isIsometricView ? (cameraState.rotation !== undefined ? cameraState.rotation : 0) : 0) * 100) / 100;
    
    if (!isIsometricView) {
        cameraState.pitch = 0;
        cameraState.rotation = 0;
    }
    
    const centerY = Math.round(((vh / 2) + screenOffsetY) * 100) / 100;
    const scaleRound = Math.round(finalScale * 10000) / 10000;
    const halfVw = Math.round((vw / 2) * 100) / 100;
    
    let newTransform = '';
    if (isIsometricView) {
        newTransform = `translate3d(${halfVw}px, ${centerY}px, 0px) scale(${scaleRound}) rotateX(${pitch}deg) rotateZ(${yaw}deg) translate3d(${-fx}px, ${-fy}px, 0px)`;
    } else {
        newTransform = `translate3d(${halfVw}px, ${centerY}px, 0px) scale(${scaleRound}) translate3d(${-fx}px, ${-fy}px, 0px)`;
    }
    
    if (_lastStageTransform !== newTransform) {
        stage.style.transform = newTransform;
        _lastStageTransform = newTransform;
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

        if (isPlayMode && isRightClick) {
            const coords = getCanvasWorldCoordinates(e);
            const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
            const player = scene && scene.elements ? scene.elements.find(el => el.isPlayer) : null;
            if (player) {
                const inBounds = coords.clickX >= player.x && 
                                 coords.clickX <= player.x + player.width && 
                                 coords.clickY >= player.y && 
                                 coords.clickY <= player.y + player.height;
                
                let isPlayerClick = inBounds;
                if (inBounds && typeof isPixelOpaque === 'function') {
                    try {
                        const opaque = isPixelOpaque(player, coords.clickX, coords.clickY);
                        if (opaque !== false) isPlayerClick = true;
                    } catch (err) {
                        isPlayerClick = inBounds;
                    }
                }

                if (isPlayerClick) {
                    e.preventDefault();
                    e.stopPropagation();
                    inventoryManager.togglePlayerMenu();
                    return;
                }
            }
        }
        
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
    
    renderStage(false);
    
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