// --- DECLARACIÓN DE VARIABLES GLOBALES ---
// Estas variables son compartidas entre los diferentes archivos.
let pCanvas, pOutputDiv, pUndoBtn, pRedoBtn, pCanvasContainer;
let pNodes = {};
let pConnections = [];
let pNodeIdCounter = 0;
let pActiveLine = null;
let pStartConnector = null;
let pZoomLevel = 1.0;
let pLastMousePosition = { x: 0, y: 0 }; // NUEVA VARIABLE para la posición del ratón

// --- HISTORIAL PARA DESHACER/REHACER ---
let pHistory = [];
let pHistoryIndex = -1;
const P_MAX_HISTORY_STEPS = 15;

function pUpdateHistoryButtons() {
    if (!pUndoBtn || !pRedoBtn) return;
    pUndoBtn.disabled = pHistoryIndex <= 0;
    pRedoBtn.disabled = pHistoryIndex >= pHistory.length - 1;
}

function pRecordHistory() {
    if (pHistoryIndex < pHistory.length - 1) {
        pHistory = pHistory.slice(0, pHistoryIndex + 1);
    }

    const pCurrentState = {
        nodes: Object.values(pNodes).map(pNode => ({
            id: pNode.id, type: pNode.type,
            position: { x: pNode.element.offsetLeft, y: pNode.element.offsetTop },
            state: Array.from(pNode.element.querySelectorAll('[data-save]')).reduce((pAcc, pEl) => {
                pAcc[pEl.getAttribute('data-save')] = pEl.value;
                return pAcc;
            }, {})
        })),
        connections: pConnections.map(pC => ({ from: pC.from, to: pC.to })),
        nodeIdCounter: pNodeIdCounter
    };

    if (pHistory.length > 0 && JSON.stringify(pCurrentState) === JSON.stringify(pHistory[pHistoryIndex])) return;

    pHistory.push(pCurrentState);
    if (pHistory.length > P_MAX_HISTORY_STEPS) pHistory.shift();
    
    pHistoryIndex = pHistory.length - 1;
    pSaveStateToLocalStorage(pCurrentState);
    pUpdateHistoryButtons();
}

function pUndo() {
    if (pHistoryIndex > 0) {
        pHistoryIndex--;
        pRestoreState(pHistory[pHistoryIndex]);
        pUpdateHistoryButtons();
    }
}

function pRedo() {
    if (pHistoryIndex < pHistory.length - 1) {
        pHistoryIndex++;
        pRestoreState(pHistory[pHistoryIndex]);
        pUpdateHistoryButtons();
    }
}

function pRestoreState(pState) {
    pClearCanvas();
    pNodeIdCounter = pState.nodeIdCounter || 0;
    if (pState.nodes) {
        pState.nodes.forEach(d => pAddNode(d.type, d.id, d.position, d.state, false));
    }
    if (pState.connections) {
        pState.connections.forEach(d => pCreateConnection(d.from, d.to, false));
    }
}

function pSaveStateToLocalStorage(pState) {
    localStorage.setItem('visualAutomationState', JSON.stringify(pState));
}

function pClearCanvas() {
    pConnections.forEach(pC => { if(pC.line) pC.line.remove() });
    Object.values(pNodes).forEach(pN => pN.element.remove());
    pNodes = {};
    pConnections = [];
}

function pClearAll() {
    if (confirm("¿Estás seguro de que quieres borrar todo el trabajo?")) {
        // 1. Limpia los nodos y conexiones del canvas
        pClearCanvas();
        
        // 2. Borra el estado guardado en el navegador
        localStorage.removeItem('visualAutomationState');
        
        // 3. Resetea el historial de acciones
        pHistory = [];
        pHistoryIndex = -1;
        pNodeIdCounter = 0;
        pUpdateHistoryButtons(); // Actualiza los botones de deshacer/rehacer
        
        // 4. Mueve la vista a la esquina superior izquierda
        if (pCanvasContainer) {
            pCanvasContainer.scrollLeft = 0;
            pCanvasContainer.scrollTop = 0;
        }
    }
}

function pInitProgramador() {
    // 1. Obtener referencias a los elementos del DOM
    pCanvas = document.getElementById('p-canvas');
    pCanvasContainer = document.getElementById('p-canvas-container');
    pOutputDiv = document.getElementById('p-output');
    pUndoBtn = document.getElementById('p-undo-btn');
    pRedoBtn = document.getElementById('p-redo-btn');

    if (!pCanvas) {
        console.error("Error: Elemento 'p-canvas' no encontrado. La inicialización del programador se detiene.");
        return;
    }

    // 2. Inicializar la UI (zoom, pan, etc.) desde p-ui.js
    pInitUI();

    // 3. Cargar el estado desde LocalStorage o crear uno nuevo
    const pSavedStateJSON = localStorage.getItem('visualAutomationState');
    if (pSavedStateJSON) {
        pRestoreState(JSON.parse(pSavedStateJSON));
    } else {
        // Centrar la vista inicial y añadir nodos por defecto
        setTimeout(() => {
            pCenterView();
            pAddNode('start', null, null, null, false);
            pAddNode('uppercase', null, null, null, false);
            pAddNode('log', null, null, null, false);
            pRecordHistory(); // Grabar el estado inicial
        }, 0);
    }
    
    if(!pSavedStateJSON) pRecordHistory(); // Grabar si es un estado nuevo

    // 4. Observar cambios en la ventana para reposicionar las líneas
    const programadorWindow = document.getElementById('programador');
    if (programadorWindow) {
        const observer = new MutationObserver(() => setTimeout(pUpdateAllConnections, 50));
        observer.observe(programadorWindow, { attributes: true, attributeFilter: ['style'] });
    }
}

// Renombramos pLoadStateFromLocalStorage a pInitProgramador para que sea más claro
document.addEventListener('DOMContentLoaded', pInitProgramador);
