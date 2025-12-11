// SILENOS/history_io.js
// --- GESTOR DE HISTORIAL Y AUTOGUARDADO v1.0 ---
// H -> Coherencia (Mantiene el estado en el tiempo)
// T -> Tramo (Intervalos de guardado de 3s)

console.log("Módulo History IO Cargado (AutoSave 3s + Undo/Redo)");

const HISTORY_LIMIT = 30; // Pasos máximos de deshacer
const SAVE_INTERVAL = 3000; // 3 segundos

// Almacenes de Estado
const historyStacks = {}; // { script: [], book: [], ... }
const futureStacks = {};  // { script: [], book: [], ... }
const dirtyFlags = {};    // { script: false, book: false ... }
const handlers = {};      // { script: { save: fn, load: fn, get: fn } }

// Inicialización Global de Eventos
document.addEventListener('keydown', (e) => {
    // Detectar Ctrl+Z o Cmd+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const type = detectActiveContext();
        if (type) performUndo(type);
    }
    // Detectar Ctrl+Y o Cmd+Shift+Z
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        const type = detectActiveContext();
        if (type) performRedo(type);
    }
});

// Bucle de Autoguardado (Cada 3 segundos)
setInterval(() => {
    Object.keys(dirtyFlags).forEach(type => {
        if (dirtyFlags[type] && handlers[type]) {
            console.log(`💾 Auto-Save Ejecutado: ${type}`);
            // Obtenemos datos actuales y ejecutamos la función de guardado registrada
            const currentData = handlers[type].get();
            handlers[type].save(currentData);
            dirtyFlags[type] = false;
            
            showSaveIndicator();
        }
    });
}, SAVE_INTERVAL);

// --- FUNCIONES PÚBLICAS ---

export function registerHistoryContext(type, getFn, saveFn, loadFn) {
    handlers[type] = { get: getFn, save: saveFn, load: loadFn };
    historyStacks[type] = [];
    futureStacks[type] = [];
    dirtyFlags[type] = false;
}

// Llamar a esto cuando el usuario hace un cambio
export function recordChange(type) {
    if (!handlers[type]) return;

    const data = JSON.parse(JSON.stringify(handlers[type].get())); // Deep Copy
    
    // 1. Marcar para autoguardado
    dirtyFlags[type] = true;

    // 2. Gestión de Historial (Debounce simple: si el último estado es muy reciente o igual, no duplicar, pero aquí simplificamos)
    // Guardamos el estado ANTERIOR al cambio en el stack de deshacer
    // NOTA: Para que Ctrl+Z funcione natural, lo ideal es guardar snapshot ANTES de editar.
    // Como simplificación, asumimos que recordChange se llama con el estado NUEVO y gestionamos el stack.
    
    // Estrategia: Guardamos el estado actual en el historial
    const stack = historyStacks[type];
    
    // Evitar duplicados consecutivos exactos
    if (stack.length > 0) {
        const last = JSON.stringify(stack[stack.length - 1]);
        if (last === JSON.stringify(data)) return; 
    }

    stack.push(data);
    if (stack.length > HISTORY_LIMIT) stack.shift();

    // Al hacer un cambio nuevo, el futuro (Redo) se borra
    futureStacks[type] = [];
}

// --- LÓGICA INTERNA ---

function detectActiveContext() {
    // Detectar qué pestaña/sección está visible
    if (document.getElementById('section-guion').style.visibility === 'visible' || 
        document.getElementById('section-guion').style.display === 'block') return 'script';
        
    if (document.getElementById('section-libro').style.visibility === 'visible' || 
        document.getElementById('section-libro').style.display === 'block') return 'book';
        
    if (document.getElementById('data-editor-view').classList.contains('active')) return 'data';

    // Añadir más contextos si es necesario (game, etc)
    return null;
}

function performUndo(type) {
    const stack = historyStacks[type];
    const future = futureStacks[type];
    
    if (!stack || stack.length <= 1) return console.log("Nada que deshacer");

    // 1. El estado actual va al futuro
    const current = handlers[type].get();
    future.push(JSON.parse(JSON.stringify(current)));

    // 2. Sacamos el estado actual del historial (porque es lo que vemos)
    stack.pop(); 

    // 3. Obtenemos el anterior
    const previous = stack[stack.length - 1];
    
    if (previous) {
        handlers[type].load(previous); // Restaurar UI
        dirtyFlags[type] = true; // Marcar para guardar en disco en el prox ciclo
        console.log(`⏪ Undo: ${type}`);
    }
}

function performRedo(type) {
    const stack = historyStacks[type];
    const future = futureStacks[type];

    if (!future || future.length === 0) return console.log("Nada que rehacer");

    // 1. Sacamos del futuro
    const nextState = future.pop();

    // 2. Lo metemos en historial
    stack.push(JSON.parse(JSON.stringify(nextState)));

    // 3. Restauramos UI
    handlers[type].load(nextState);
    dirtyFlags[type] = true;
    console.log(`⏩ Redo: ${type}`);
}

// Indicador visual discreto
function showSaveIndicator() {
    let el = document.getElementById('auto-save-indicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'auto-save-indicator';
        el.style.position = 'fixed';
        el.style.bottom = '20px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.background = 'rgba(0,0,0,0.7)';
        el.style.color = 'white';
        el.style.padding = '5px 15px';
        el.style.borderRadius = '20px';
        el.style.fontSize = '0.7rem';
        el.style.pointerEvents = 'none';
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s';
        el.textContent = 'Guardado';
        document.body.appendChild(el);
    }
    
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 1500);
}