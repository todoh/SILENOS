// render-selection.js - SELECCIÓN Y CÁLCULO DE COORDENADAS / SELECCIÓN DE PÍXEL EN EDITOR

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
    const dim = typeof getStageDimensions === 'function' ? getStageDimensions() : { width: 960, height: 540 };
         
    if (!viewport || !dim.width || !dim.height) {
        return { clickX: 0, clickY: 0, finalScale: 1 };
    }
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

    return {
        clickX,
        clickY,
        finalScale
    };
}

function selectElement(id) {
    if (selectedElementId === id) {
        if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        return;
    }
    if (selectedElementId) {
        const prevEl = document.getElementById(`stage-el-${selectedElementId}`);
        if (prevEl) prevEl.classList.remove('selected');
    }
    selectedElementId = id;
    if (selectedElementId) {
        const currentEl = document.getElementById(`stage-el-${selectedElementId}`);
        if (currentEl) currentEl.classList.add('selected');
    }
    activeCropElemId = null;
    renderStage();
    if (typeof updatePropertiesPanel === 'function') {
        updatePropertiesPanel();
    }
}

function setupEditorPixelPerfectSelection() {
    const stage = document.getElementById('stage');
    if (!stage || stage.dataset.editorPixelSelectionAttached) return;
    stage.dataset.editorPixelSelectionAttached = "true";

    stage.addEventListener('mousedown', (e) => {
        if (isPlayMode || e.button !== 0 || e.shiftKey) return;
        if (e.target.closest('.handle-rotate') || 
            e.target.closest('.handle-resize') || 
            e.target.closest('.handle-col-resize') || 
            e.target.closest('.crop-overlay-gizmo') ||
            e.target.closest('.waypoint-node-gizmo')) {
            return;
        }

        const { clickX, clickY } = getCanvasWorldCoordinates(e);

        const scene = projectData.scenes[currentSceneId];
        if (!scene) return;

        const elementsToCheck = [...scene.elements].sort((a, b) => {
            const zA = a.type === 'fondo' ? 10 : 100 + Math.round((a.y || 0) + (a.height || 0));
            const zB = b.type === 'fondo' ? 10 : 100 + Math.round((b.y || 0) + (b.height || 0));
            return zB - zA;
        });

        let targetElem = null;
        for (const elem of elementsToCheck) {
            if (checkPixelOpacityForEditor(elem, clickX, clickY)) {
                targetElem = elem;
                break;
            }
        }

        if (targetElem) {
            selectElement(targetElem.id);
            const el = document.getElementById(`stage-el-${targetElem.id}`);
            if (el && el._startDragFunction) {
                el._startDragFunction(e);
            }
        } else {
            selectElement(null);
        }
    });
}

function checkPixelOpacityForEditor(elem, clickX, clickY) {
    if (clickX < elem.x || clickX > elem.x + elem.width || clickY < elem.y || clickY > elem.y + elem.height) {
        return false;
    }

    const rad = -elem.rotation * (Math.PI / 180);
    const centerX = elem.x + elem.width / 2;
    const centerY = elem.y + elem.height / 2;
    const dx = clickX - centerX;
    const dy = clickY - centerY;

    const localX = (dx * Math.cos(rad) - dy * Math.sin(rad)) + elem.width / 2;
    const localY = (dx * Math.sin(rad) + dy * Math.cos(rad)) + elem.height / 2;

    if (localX < 0 || localX > elem.width || localY < 0 || localY > elem.height) return false;

    if (elem.isText) return true;

    const asset = assetsMap[elem.image];
    if (!asset) return true;

    if (!asset.canvas) {
        const domEl = document.getElementById(`stage-el-${elem.id}`);
        const domImg = domEl ? domEl.querySelector('img') : null;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (domImg && domImg.complete && domImg.naturalWidth > 0) {
            canvas.width = domImg.naturalWidth;
            canvas.height = domImg.naturalHeight;
            ctx.drawImage(domImg, 0, 0);
            asset.canvas = canvas;
            asset.ctx = ctx;
        } else {
            const img = new Image();
            img.src = asset.dataUrl || asset.url;
            if (img.complete && img.naturalWidth > 0) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                asset.canvas = canvas;
                asset.ctx = ctx;
            } else {
                return true;
            }
        }
    }

    const imgX = Math.floor((localX / elem.width) * asset.canvas.width);
    const imgY = Math.floor((localY / elem.height) * asset.canvas.height);

    try {
        const pixelData = asset.ctx.getImageData(imgX, imgY, 1, 1).data;
        return pixelData[3] > 10;
    } catch (err) {
        return true;
    }
}