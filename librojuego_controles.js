
// --- CONTROLES DE CAMARA (PAN & ZOOM) ---
// Gestiona el movimiento del lienzo infinito

console.log("Módulo Controles Gamebook Cargado (v1.0)");

// Estado de la cámara
let cameraState = {
    x: 0,
    y: 0,
    scale: 1
};

// Configuración
const ZOOM_SPEED = 0.1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

// Referencias
let canvasArea = null;
let viewport = null;

// Variables internas de arrastre
let isPanning = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;

// Variables internas de touch (Móvil)
let initialPinchDistance = null;
let lastScale = 1;

document.addEventListener('DOMContentLoaded', initControls);

function initControls() {
    canvasArea = document.getElementById('gb-canvas');
    viewport = document.getElementById('gb-viewport');

    if (!canvasArea || !viewport) return;

    // --- RATÓN (DESKTOP) ---
    
    // Zoom con rueda
    canvasArea.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = -Math.sign(e.deltaY);
        const factor = 1 + (delta * ZOOM_SPEED);
        zoomToPoint(factor, e.clientX, e.clientY);
    }, { passive: false });

    // Pan (Arrastrar fondo)
    canvasArea.addEventListener('mousedown', (e) => {
        // Solo iniciar si pulsamos directamente en el fondo, no en un nodo o botón
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

    // --- TÁCTIL (MÓVIL) ---

    canvasArea.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            // Un dedo: Pan
            if (e.target === canvasArea || e.target === viewport || e.target.id === 'gb-connections-layer') {
                isPanning = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                lastX = cameraState.x;
                lastY = cameraState.y;
            }
        } else if (e.touches.length === 2) {
            // Dos dedos: Zoom Pinch
            isPanning = false; // Cancelamos pan
            initialPinchDistance = getDistance(e.touches);
            lastScale = cameraState.scale;
        }
    }, { passive: false });

    canvasArea.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Evitar scroll nativo del navegador

        if (isPanning && e.touches.length === 1) {
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            cameraState.x = lastX + dx;
            cameraState.y = lastY + dy;
            updateTransform();
        } else if (e.touches.length === 2 && initialPinchDistance) {
            const currentDistance = getDistance(e.touches);
            const factor = currentDistance / initialPinchDistance;
            
            // Zoom centrado (aproximado al centro de los dedos)
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

            // Calculamos nuevo scale temporal
            let newScale = lastScale * factor;
            newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);
            
            // Aplicamos zoom (simplificado para evitar saltos bruscos en móvil)
            // Para un zoom perfecto al punto exacto en touch se requiere más matemática de matriz,
            // aquí usamos un enfoque directo sobre el scale.
            cameraState.scale = newScale;
            updateTransform();
        }
    }, { passive: false });

    canvasArea.addEventListener('touchend', () => {
        isPanning = false;
        initialPinchDistance = null;
    });
}

// --- LÓGICA DE ZOOM ---

function zoomToPoint(factor, mouseX, mouseY) {
    const oldScale = cameraState.scale;
    let newScale = oldScale * factor;
    
    // Limitar
    newScale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);

    // Ajustar posición para que el zoom sea hacia el ratón
    const rect = canvasArea.getBoundingClientRect();
    const xRel = mouseX - rect.left; // Posición ratón relativa al canvas
    const yRel = mouseY - rect.top;

    // Fórmula mágica de zoom offset
    // (Posición actual - Ratón) * (NuevoFactor / ViejoFactor) + Ratón
    // Simplificado: movemos el mundo para compensar el escalado
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

// Helpers para otros módulos
function getCameraState() {
    return { ...cameraState };
}

function centerCanvas() {
    cameraState.x = 0;
    cameraState.y = 0;
    cameraState.scale = 1;
    updateTransform();
}

// Exportamos globalmente para que librojuego_ui.js pueda leer el zoom actual
window.gamebookControls = {
    getCameraState,
    centerCanvas
};
