// ================================================================= //
//               p-main.js - Lógica Principal del Editor             //
// ================================================================= //

// --- VARIABLES GLOBALES ---
let pCanvas, pOutputDiv, pCanvasContainer;
let pNodes = {};
let pConnections = [];
let pNodeIdCounter = 0;
let pActiveLine = null;
let pStartConnector = null;
let pZoomLevel = 1.0;

// --- VARIABLES PARA PLANOS Y LOCALSTORAGE ---
let pSavedBlueprints = [];
const P_BLUEPRINTS_STORAGE_KEY = 'visualAutomationBlueprints';

// --- HISTORIAL PARA DESHACER/REHACER ---
let pHistory = [];
let pHistoryIndex = -1;
const P_MAX_HISTORY_STEPS = 30;


// --- INICIALIZACIÓN PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    pCanvas = document.getElementById('p-canvas');
    pOutputDiv = document.getElementById('p-output');
    pCanvasContainer = document.getElementById('p-canvas-container');

    if (!pCanvas || !pCanvasContainer) {
        console.error("Faltan elementos esenciales del DOM (canvas, container).");
        return;
    }
    
    // Configuración de todos los listeners de eventos
    pSetupEventListeners();
    
    // Lógica de UI (zoom, pan)
    pInitUI(); 
    
    // Carga los nodos en el menú desplegable
  //  pPopulateNodeDropdown();
    
    // Carga los planos guardados
    pLoadBlueprintsFromStorage();
    pUpdateBlueprintDropdown();

    // Carga el último estado o empieza de cero
    pLoadLastState();
    pSetupAccordionMenu(); 

});
function pSetupAccordionMenu() {
    const accordion = document.querySelector('.p-menu-accordion');
    if (!accordion) return;

    const detailsElements = accordion.querySelectorAll('details.p-dropdown-category');

    detailsElements.forEach(details => {
        details.addEventListener('toggle', (event) => {
            // Si el elemento se está abriendo
            if (details.open) {
                // Cierra todos los demás
                detailsElements.forEach(otherDetails => {
                    if (otherDetails !== details) {
                        otherDetails.removeAttribute('open');
                    }
                });
            }
        });
    });
}
/**
 * Configura todos los event listeners de la aplicación.
 */
function pSetupEventListeners() {
    // Botones de la cabecera
    document.getElementById('p-undo-btn')?.addEventListener('click', pUndo);
    document.getElementById('p-redo-btn')?.addEventListener('click', pRedo);
    document.getElementById('p-run-btn')?.addEventListener('click', pRunAutomation);
    document.getElementById('p-clear-all-btn')?.addEventListener('click', pClearAll);
    
    // --- CAMBIO: Listener del botón de guardar ahora es más inteligente ---
    document.getElementById('p-save-plano-btn')?.addEventListener('click', pSaveOrUpdateBlueprint);
    document.getElementById('p-rename-plano-btn')?.addEventListener('click', pRenameSelectedBlueprint);
    document.getElementById('p-delete-plano-btn')?.addEventListener('click', pDeleteSelectedBlueprint);
    document.getElementById('p-planos-select')?.addEventListener('change', pLoadSelectedBlueprint);
    
    // INICIALIZADOR DE CARGA JSON
    pInitJsonLoader();
}

// ================================================================= //
// --- LÓGICA DE CARGA DE PLANOS DESDE JSON ---
// ================================================================= //

/**
 * Añade listeners a los controles de carga de JSON (textarea, input de archivo).
 */
function pInitJsonLoader() {
    const jsonInput = document.getElementById('p-json-input');
    const loadJsonBtn = document.getElementById('p-load-json-btn');
    const jsonUpload = document.getElementById('p-json-upload');

    if (!jsonInput || !loadJsonBtn || !jsonUpload) return;

    // Cargar desde el área de texto
    loadJsonBtn.addEventListener('click', () => {
        const jsonText = jsonInput.value.trim();
        if (!jsonText) {
            alert("Por favor, pega el código JSON en el área de texto.");
            return;
        }
        try {
            const state = JSON.parse(jsonText);
            pLoadBlueprint(state);
            jsonInput.value = ''; // Limpiar
        } catch (e) {
            alert(`Error al procesar el JSON: ${e.message}`);
        }
    });

    // Cargar desde un archivo
    jsonUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const state = JSON.parse(e.target.result);
                pLoadBlueprint(state);
            } catch (err) {
                alert(`Error al leer el archivo JSON: ${err.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Resetear para poder subirlo de nuevo
    });
}

 

// ================================================================= //
// --- FUNCIONES DE GESTIÓN DEL LIENZO ---
// ================================================================= //

/**
 * Limpia todos los nodos y conexiones del lienzo, pidiendo confirmación.
 */
function pClearAll() {
    if (confirm("¿Estás seguro de que quieres limpiar todo el lienzo? Se perderá el trabajo no guardado.")) {
        pClearCanvas();
        pRecordHistory();
    }
}

/**
 * Lógica interna para limpiar el lienzo. No pide confirmación.
 */
function pClearCanvas() {
    if (pConnections) {
        [...pConnections].forEach(c => c.line?.remove());
    }
    pConnections = [];
    if (pNodes) {
        for (const nodeId in pNodes) {
            pNodes[nodeId].element?.remove();
        }
    }
    pNodes = {};
    pNodeIdCounter = 0;
    pActiveLine = null;
    pStartConnector = null;
    // Limpia también el panel de salida si existe
    if(pOutputDiv) pOutputDiv.innerHTML = '';
}


// ================================================================= //
// --- GESTIÓN DE PLANOS GUARDADOS (LocalStorage) ---
// ================================================================= //

function pLoadBlueprintsFromStorage() {
    const stored = localStorage.getItem(P_BLUEPRINTS_STORAGE_KEY);
    pSavedBlueprints = stored ? JSON.parse(stored) : [];
}

function pUpdateBlueprintDropdown() {
    const select = document.getElementById('p-planos-select');
    if (!select) return;
    const selectedValue = select.value;
    select.innerHTML = '<option value="">Seleccionar plano...</option>';
    pSavedBlueprints.forEach((plano, index) => {
        select.innerHTML += `<option value="${index}">${plano.name}</option>`;
    });
    select.value = selectedValue;
    pUpdateButtonStates();
}

/**
 * --- NUEVA FUNCIÓN MEJORADA ---
 * Guarda un plano nuevo o actualiza uno existente.
 */
function pSaveOrUpdateBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = select.value;
    const state = pGetCurrentStateObject();

    if (index !== "") {
        // Actualizar plano existente
        pSavedBlueprints[index].state = state;
        alert(`Plano "${pSavedBlueprints[index].name}" actualizado.`);
    } else {
        // Guardar como plano nuevo
        const name = prompt("Introduce el nombre para el nuevo plano:", `Plano ${pSavedBlueprints.length + 1}`);
        if (!name) return;
        pSavedBlueprints.push({ name, state });
    }

    localStorage.setItem(P_BLUEPRINTS_STORAGE_KEY, JSON.stringify(pSavedBlueprints));
    pUpdateBlueprintDropdown();
    // Re-seleccionar el plano si se actualizó o se creó uno nuevo
    select.value = (index !== "") ? index : pSavedBlueprints.length - 1;
    pUpdateButtonStates();
}

function pRenameSelectedBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = select.value;
    if (index === "") {
        alert("Por favor, selecciona un plano para renombrar.");
        return;
    }
    const oldName = pSavedBlueprints[index].name;
    const newName = prompt(`Renombrar plano "${oldName}":`, oldName);
    if (newName && newName !== oldName) {
        pSavedBlueprints[index].name = newName;
        localStorage.setItem(P_BLUEPRINTS_STORAGE_KEY, JSON.stringify(pSavedBlueprints));
        pUpdateBlueprintDropdown();
        select.value = index; // Mantener la selección
    }
}

function pLoadSelectedBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = select.value;
    if (index === "") return;

    const blueprint = pSavedBlueprints[index];
    if (blueprint && confirm(`¿Cargar el plano "${blueprint.name}"? Se perderán los cambios no guardados.`)) {
        pLoadBlueprint(blueprint.state);
    }
}

function pDeleteSelectedBlueprint() {
    const select = document.getElementById('p-planos-select');
    const index = select.value;
    if (index === "" || !confirm(`¿Borrar el plano "${pSavedBlueprints[index].name}"?`)) {
        return;
    }
    pSavedBlueprints.splice(index, 1);
    localStorage.setItem(P_BLUEPRINTS_STORAGE_KEY, JSON.stringify(pSavedBlueprints));
    pUpdateBlueprintDropdown();
}


function pUpdateButtonStates() {
    const hasSelection = document.getElementById('p-planos-select')?.value !== "";
    document.getElementById('p-rename-plano-btn').disabled = !hasSelection;
    document.getElementById('p-delete-plano-btn').disabled = !hasSelection;
    // El botón de guardar siempre está activo
    document.getElementById('p-save-plano-btn').disabled = false;
}

// ================================================================= //
// --- HISTORIAL (DESHACER / REHACER) ---
// ================================================================= //

/**
 * --- FUNCIÓN CORREGIDA ---
 * Crea un objeto que representa el estado completo y actual del lienzo,
 * incluyendo los valores de todos los campos editables en los nodos.
 * @returns {object} El estado del lienzo listo para ser guardado.
 */
function pGetCurrentStateObject() {
    // Itera sobre cada nodo en el lienzo
    const nodeStates = Object.values(pNodes).map(pNode => {
        
        // Objeto para guardar el estado de este nodo específico
        const stateData = {};

        // Busca TODOS los elementos que tienen el atributo 'data-save' dentro del nodo
        pNode.element.querySelectorAll('[data-save]').forEach(el => {
            const key = el.getAttribute('data-save');
            
            // Determina qué propiedad guardar según el tipo de elemento
            switch (el.type) {
                case 'checkbox':
                    stateData[key] = el.checked; // Para checkboxes, guardamos si está marcado o no
                    break;
                case 'select-one':
                case 'text':
                case 'textarea':
                case 'number':
                default:
                    stateData[key] = el.value; // Para los demás, guardamos su valor
                    break;
            }
        });

        // Devuelve el objeto completo del nodo
        return {
            id: pNode.id,
            type: pNode.type,
            position: { x: pNode.element.offsetLeft, y: pNode.element.offsetTop },
            state: stateData // Usamos el estado que acabamos de leer del DOM
        };
    });

    const connectionStates = pConnections.map(pConn => ({ from: pConn.from, to: pConn.to }));

    return { nodes: nodeStates, connections: connectionStates, nodeIdCounter: pNodeIdCounter };
}


function pRecordHistory() {
    if (pHistoryIndex < pHistory.length - 1) {
        pHistory = pHistory.slice(0, pHistoryIndex + 1);
    }
    const state = pGetCurrentStateObject(); // Ahora llama a nuestra nueva función
    pHistory.push(state);
    if (pHistory.length > P_MAX_HISTORY_STEPS) {
        pHistory.shift();
    }
    pHistoryIndex = pHistory.length - 1;
    pUpdateHistoryButtons();
    localStorage.setItem('visualAutomationState', JSON.stringify(state)); // Guardado automático
}

/**
 * --- FUNCIÓN MEJORADA ---
 * Restaura un estado del historial. Ahora solo llama a pLoadBlueprint.
 */
function pRestoreState(state) {
    if (!state || !state.nodes) return;
    pLoadBlueprint(state, false); // No grabar en el historial al restaurar desde el historial
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

function pUpdateHistoryButtons() {
    document.getElementById('p-undo-btn').disabled = pHistoryIndex <= 0;
    document.getElementById('p-redo-btn').disabled = pHistoryIndex >= pHistory.length - 1;
}

function pLoadLastState() {
    const savedStateJSON = localStorage.getItem('visualAutomationState');
    if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        pRestoreState(savedState);
        pHistory = [savedState];
        pHistoryIndex = 0;
    } else {
        pHistory = [pGetCurrentStateObject()];
        pHistoryIndex = 0;
    }
    pUpdateHistoryButtons();
}

// Las funciones pAddNode, pCreateConnection, pRunAutomation, pPopulateNodeDropdown, pInitUI, pUpdateAllConnections
// deben estar definidas en tus otros archivos JS (p-node.js, p-conexion.js, p-ejecucion.js, p-ui.js, etc.)
