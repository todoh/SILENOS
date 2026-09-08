// render-selection.js - SELECCIÓN Y CÁLCULO DE COORDENADAS / SELECCIÓN DE PÍXEL EN EDITOR
function getCanvasWorldCoordinates(e) {
    const stage = document.getElementById('stage');
    if (!stage) return { clickX: 0, clickY: 0, finalScale: 1 };
    
    const dim = getStageDimensions();
    const stageRect = stage.getBoundingClientRect();
    
    if (!stageRect.width || !stageRect.height || !dim.width || !dim.height) {
        return { clickX: 0, clickY: 0, finalScale: 1 };
    }
    
    // Calcula la escala real exacta directamente desde el Bounding Rect del DOM
    const scaleX = stageRect.width / dim.width;
    const scaleY = stageRect.height / dim.height;
    
    const clickX = Math.round((e.clientX - stageRect.left) / scaleX);
    const clickY = Math.round((e.clientY - stageRect.top) / scaleY);
    
    return {
        clickX,
        clickY,
        finalScale: scaleX
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