// --- CONTROLES DE CAMARA (PAN & ZOOM) v2.0 ---
// Gestiona el movimiento del lienzo infinito y el sistema de enfoque

console.log("Módulo Controles Gamebook Cargado (v2.0 - Focus System)");

// Estado de la cámara
let cameraState = {
    x: 0,
    y: 0,
    scale: 1
};

const ZOOM_SPEED = 0.1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

let canvasArea = null;
let viewport = null;

let isPanning = false;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;
let initialPinchDistance = null;
let lastScale = 1;

document.addEventListener('DOMContentLoaded', initControls);

function initControls() {
    canvasArea = document.getElementById('gb-canvas');
    viewport = document.getElementById('gb-viewport');

    if (!canvasArea || !viewport) {
        // Reintentar por si el DOM no estaba listo (especialmente en recargas dinámicas)
        setTimeout(initControls, 500);
        return;
    }

    // --- RATÓN ---
    canvasArea.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY);
        const factor = 1 + (delta * ZOOM_SPEED);
        zoomToPoint(factor, e.clientX, e.clientY);
    }, { passive: false });

    canvasArea.addEventListener('mousedown', (e) => {
        if (e.target === canvasArea || e.target === viewport || e.target.id === 'gb-connections-layer') {
            isPanning = true;
            startX = e.clientX;
            startY = e.clientY;
            lastX = cameraState.x;
            lastY = cameraState.y;
            canvasArea.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        cameraState.x = lastX + dx;
        cameraState.y = lastY + dy;
        updateTransform();
    });

    window.addEventListener('mouseup', () => {
        isPanning = false;
        if(canvasArea) canvasArea.style.cursor = 'grab';
    });

    // --- TÁCTIL ---
    canvasArea.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            if (e.target === canvasArea || e.target === viewport || e.target.id === 'gb-connections-layer') {
                isPanning = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                lastX = cameraState.x;
                lastY = cameraState.y;
            }
        } else if (e.touches.length === 2) {
            isPanning = false;
            initialPinchDistance = getDistance(e.touches);
            lastScale = cameraState.scale;
        }
    }, { passive: false });

    canvasArea.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (isPanning && e.touches.length === 1) {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            cameraState.x = lastX + dx;
            cameraState.y = lastY + dy;
            updateTransform();
        } else if (e.touches.length === 2 && initialPinchDistance) {
            const currentDistance = getDistance(e.touches);
            const factor = currentDistance / initialPinchDistance;
            let newScale = lastScale * factor;
            newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
            cameraState.scale = newScale;
            updateTransform();
        }
    }, { passive: false });

    canvasArea.addEventListener('touchend', () => {
        isPanning = false;
        initialPinchDistance = null;
    });
}

function zoomToPoint(factor, mouseX, mouseY) {
    const oldScale = cameraState.scale;
    let newScale = oldScale * factor;
    newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);

    const rect = canvasArea.getBoundingClientRect();
    const xRel = mouseX - rect.left;
    const yRel = mouseY - rect.top;

    cameraState.x = xRel - (xRel - cameraState.x) * (newScale / oldScale);
    cameraState.y = yRel - (yRel - cameraState.y) * (newScale / oldScale);
    cameraState.scale = newScale;

    updateTransform();
}

function updateTransform() {
    if (viewport) {
        viewport.style.transform = `translate(${cameraState.x}px, ${cameraState.y}px) scale(${cameraState.scale})`;
    }
}

function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// --- API PÚBLICA PARA UI ---

function getCameraState() {
    return { ...cameraState };
}

// Reseteo básico a 0,0
function resetCamera() {
    cameraState.x = 0;
    cameraState.y = 0;
    cameraState.scale = 1;
    updateTransform();
}

// Nuevo: Centrar en un punto específico (x, y) manteniendo el contenido en el centro de la pantalla
function focusPoint(targetX, targetY) {
    if (!canvasArea) return;
    const rect = canvasArea.getBoundingClientRect();
    const screenCX = rect.width / 2;
    const screenCY = rect.height / 2;
    
    // Fórmula: Queremos que (targetX * scale + camX) = screenCX
    // Asumimos escala 1 para ver todo mejor, o mantenemos la actual si prefieres
    const scale = 1; 
    
    cameraState.scale = scale;
    cameraState.x = screenCX - (targetX * scale);
    cameraState.y = screenCY - (targetY * scale);
    
    updateTransform();
}

// Exportar globalmente
window.gamebookControls = {
    getCameraState,
    resetCamera,
    focusPoint
};