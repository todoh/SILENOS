// --- DECLARACIÓN DE VARIABLES GLOBALES ---
// Estas variables son compartidas entre los diferentes archivos.
let pCanvas, pOutputDiv, pUndoBtn, pRedoBtn, pCanvasContainer;
let pNodes = {};
let pConnections = [];
let pNodeIdCounter = 0;
let pActiveLine = null;
let pStartConnector = null;
let pZoomLevel = 1.0;
let pLastMousePosition = { x: 0, y: 0 };

// --- NUEVAS VARIABLES PARA PLANOS ---
let pSavedBlueprints = [];
const P_BLUEPRINTS_STORAGE_KEY = 'visualAutomationBlueprints';

// --- HISTORIAL PARA DESHACER/REHACER ---
let pHistory = [];
let pHistoryIndex = -1;
const P_MAX_HISTORY_STEPS = 20;

function pUpdateHistoryButtons() {
    if (!pUndoBtn || !pRedoBtn) return;
    pUndoBtn.disabled = pHistoryIndex <= 0;
    pRedoBtn.disabled = pHistoryIndex >= pHistory.length - 1;
}

function pRecordHistory() {
    if (pHistoryIndex < pHistory.length - 1) {
        pHistory = pHistory.slice(0, pHistoryIndex + 1);
    }
    
    // Usamos la nueva función para obtener el estado actual
    const pCurrentState = pGetCurrentStateObject(); 

    // Evitar grabar estados idénticos consecutivos
    if (pHistory.length > 0 && JSON.stringify(pCurrentState) === JSON.stringify(pHistory[pHistory.length - 1])) return;

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
    // No se graba en el historial aquí para evitar bucles
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
    if (confirm("¿Estás seguro de que quieres borrar todo el trabajo? Se limpiará el lienzo actual.")) {
        pClearCanvas();
        localStorage.removeItem('visualAutomationState');
        pHistory = [];
        pHistoryIndex = -1;
        pNodeIdCounter = 0;
        pRecordHistory(); // Graba el estado vacío como el nuevo inicio
        pUpdateHistoryButtons();
        pCenterView();
    }
}

// --- GESTIÓN DE PLANOS (BLUEPRINTS) ---

/**
 * Carga los planos guardados desde localStorage.
 */
function pLoadBlueprintsFromStorage() {
    const storedBlueprints = localStorage.getItem(P_BLUEPRINTS_STORAGE_KEY);
    pSavedBlueprints = storedBlueprints ? JSON.parse(storedBlueprints) : [];
}

/**
 * Actualiza la lista desplegable de planos con los datos cargados.
 */
function pUpdateBlueprintDropdown() {
    const select = document.getElementById('p-planos-select');
    if (!select) return;

    const selectedValue = select.value;
    select.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Seleccionar un plano...';
    defaultOption.value = '';
    select.appendChild(defaultOption);

    pSavedBlueprints.forEach((plano, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = plano.name;
        select.appendChild(option);
    });
    
    // Intenta restaurar la selección anterior si todavía existe
    select.value = selectedValue;
    pUpdateButtonStates();
}

/**
 * Guarda el estado actual del lienzo como un nuevo plano o sobrescribe uno existente.
 */
function pSaveCurrentBlueprint() {
    const name = prompt("Introduce un nombre para guardar el plano actual:");
    if (!name || name.trim() === '') return;

    const existingIndex = pSavedBlueprints.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    if (existingIndex > -1) {
        if (!confirm(`Ya existe un plano con el nombre "${name}". ¿Quieres sobrescribirlo?`)) {
            return;
        }
    }
    
    const currentState = pGetCurrentStateObject();
    const newBlueprint = { name, state: currentState };

    if (existingIndex > -1) {
        pSavedBlueprints[existingIndex] = newBlueprint;
    } else {
        pSavedBlueprints.push(newBlueprint);
    }
    
    localStorage.setItem(P_BLUEPRINTS_STORAGE_KEY, JSON.stringify(pSavedBlueprints));
    pUpdateBlueprintDropdown();
    
    // Seleccionar el plano recién guardado/actualizado
    const select = document.getElementById('p-planos-select');
    if(select) {
        select.value = (existingIndex > -1) ? existingIndex : pSavedBlueprints.length - 1;
        pUpdateButtonStates();
    }
}

/**
 * Carga el plano seleccionado desde la lista desplegable.
 */
function pLoadSelectedBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = parseInt(select.value, 10);
    if (isNaN(index) || index < 0) return;
    
    const blueprint = pSavedBlueprints[index];
    if (blueprint && confirm(`¿Quieres cargar el plano "${blueprint.name}"? Perderás los cambios no guardados en el lienzo actual.`)) {
        pRestoreState(blueprint.state);
        // El estado cargado se convierte en el nuevo punto de partida del historial
        pHistory = [blueprint.state];
        pHistoryIndex = 0;
        pUpdateHistoryButtons();
        pSaveStateToLocalStorage(blueprint.state); // Guardar como el estado de trabajo actual
    } else {
        // Si el usuario cancela, se resetea el select para no dejarlo en una posición engañosa
        select.value = '';
        pUpdateButtonStates();
    }
}

/**
 * Elimina el plano seleccionado.
 */
function pDeleteSelectedBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = parseInt(select.value, 10);
    if (isNaN(index) || index < 0) return;

    const blueprintName = pSavedBlueprints[index].name;
    if (confirm(`¿Estás seguro de que quieres borrar el plano "${blueprintName}"? Esta acción no se puede deshacer.`)) {
        pSavedBlueprints.splice(index, 1);
        localStorage.setItem(P_BLUEPRINTS_STORAGE_KEY, JSON.stringify(pSavedBlueprints));
        pUpdateBlueprintDropdown();
    }
}

/**
 * Renombra el plano seleccionado.
 */
function pRenameSelectedBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = parseInt(select.value, 10);
    if (isNaN(index) || index < 0) return;
    
    const oldName = pSavedBlueprints[index].name;
    const newName = prompt("Introduce el nuevo nombre para el plano:", oldName);

    if (newName && newName.trim() !== '' && newName !== oldName) {
        pSavedBlueprints[index].name = newName;
        localStorage.setItem(P_BLUEPRINTS_STORAGE_KEY, JSON.stringify(pSavedBlueprints));
        pUpdateBlueprintDropdown();
        select.value = index; // Mantener la selección
    }
}

/**
 * Crea un objeto que representa el estado completo del lienzo.
 * @returns {object} El estado del lienzo.
 */
function pGetCurrentStateObject() {
    return {
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
}

/**
 * Habilita o deshabilita los botones de renombrar y borrar según si hay un plano seleccionado.
 */
function pUpdateButtonStates() {
    const select = document.getElementById('p-planos-select');
    const renameBtn = document.getElementById('p-rename-plano-btn');
    const deleteBtn = document.getElementById('p-delete-plano-btn');
    const hasSelection = select && select.value !== '';
    
    if (renameBtn) renameBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

// --- FUNCIÓN PRINCIPAL DE INICIALIZACIÓN ---

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
    
    // 2. Configurar controles de planos
    const pSavePlanoBtn = document.getElementById('p-save-plano-btn');
    const pRenamePlanoBtn = document.getElementById('p-rename-plano-btn');
    const pDeletePlanoBtn = document.getElementById('p-delete-plano-btn');
    const pPlanosSelect = document.getElementById('p-planos-select');
    
    pLoadBlueprintsFromStorage();
    pUpdateBlueprintDropdown();
    pUpdateButtonStates();
    
    if (pSavePlanoBtn) pSavePlanoBtn.addEventListener('click', pSaveCurrentBlueprint);
    if (pRenamePlanoBtn) pRenamePlanoBtn.addEventListener('click', pRenameSelectedBlueprint);
    if (pDeletePlanoBtn) pDeletePlanoBtn.addEventListener('click', pDeleteSelectedBlueprint);
    if (pPlanosSelect) {
        pPlanosSelect.addEventListener('change', pLoadSelectedBlueprint);
        pPlanosSelect.addEventListener('change', pUpdateButtonStates);
    }

    // 3. Inicializar la UI (zoom, pan, etc.) desde p-ui.js
    pInitUI();

    // 4. Cargar el último estado de trabajo desde LocalStorage o empezar de cero
    const pSavedStateJSON = localStorage.getItem('visualAutomationState');
    pHistory = []; // Limpiar historial al iniciar

    if (pSavedStateJSON) {
        const savedState = JSON.parse(pSavedStateJSON);
        pRestoreState(savedState);
        pHistory.push(savedState); // El estado guardado es el primer registro del historial
    } else {
        // Empezar con un lienzo limpio y centrado
        setTimeout(() => {
            pCenterView();
            pHistory.push(pGetCurrentStateObject()); // Grabar el estado inicial vacío
            pHistoryIndex = pHistory.length - 1;
            pUpdateHistoryButtons();
        }, 0);
    }
    
    pHistoryIndex = pHistory.length - 1;
    pUpdateHistoryButtons();
    
    // 5. Observar cambios en la ventana para reposicionar las líneas
    const programadorWindow = document.getElementById('programador');
    if (programadorWindow) {
        const observer = new MutationObserver(() => setTimeout(pUpdateAllConnections, 50));
        observer.observe(programadorWindow, { attributes: true, attributeFilter: ['style'] });
    }
}

// Inicializar el editor cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', pInitProgramador);

/**
 * Inicializa los listeners para los nuevos controles de carga de JSON.
 */
function pInitJsonLoader() {
    const jsonInput = document.getElementById('p-json-input');
    const loadJsonBtn = document.getElementById('p-load-json-btn');
    const jsonUpload = document.getElementById('p-json-upload');

    if (!jsonInput || !loadJsonBtn || !jsonUpload) {
        console.error("No se encontraron los elementos para cargar planos.");
        return;
    }

    // Listener para el botón de cargar desde textarea
    loadJsonBtn.addEventListener('click', () => {
        const jsonText = jsonInput.value.trim();
        if (!jsonText) {
            alert("Por favor, pega el código JSON en el área de texto.");
            return;
        }
        try {
            const state = JSON.parse(jsonText);
            pLoadBlueprint(state);
            jsonInput.value = ''; // Limpiar el input después de cargar
        } catch (e) {
            alert(`Error al parsear el JSON: ${e.message}`);
        }
    });

    // Listener para el input de archivo
    jsonUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const state = JSON.parse(e.target.result);
                pLoadBlueprint(state);
            } catch (err) {
                alert(`Error al leer o parsear el archivo JSON: ${err.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Resetear el input para poder subir el mismo archivo de nuevo
    });
}