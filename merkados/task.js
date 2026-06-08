// tasks.js
// --- GESTOR DE TAREAS IA EN PARALELO ---

const activeTasks = new Map();

function createTask(nodeId, type, title) {
    // Colisión: si ya hay una tarea en este nodo, la abortamos para dar paso a la nueva
    if (activeTasks.has(nodeId)) {
        console.warn(`[Tareas] Cancelando tarea anterior en nodo ${nodeId}`);
        abortTask(nodeId);
    }

    const controller = new AbortController();
    const task = {
        id: 't_' + Date.now() + '_' + Math.random().toString(36).substring(2,7),
        nodeId,
        type,
        title,
        progress: 0,
        status: 'Iniciando...',
        controller
    };
    
    activeTasks.set(nodeId, task);
    if (typeof renderTasksPanel === 'function') renderTasksPanel();
    return task;
}

function updateTask(nodeId, progress, status) {
    const task = activeTasks.get(nodeId);
    if (task) {
        if (progress !== null && progress !== undefined) task.progress = progress;
        if (status !== null && status !== undefined) task.status = status;
        if (typeof renderTasksPanel === 'function') renderTasksPanel();
    }
}

function finishTask(nodeId) {
    activeTasks.delete(nodeId);
    if (typeof renderTasksPanel === 'function') renderTasksPanel();
}

function abortTask(nodeId) {
    const task = activeTasks.get(nodeId);
    if (task) {
        task.controller.abort();
        activeTasks.delete(nodeId);
        if (typeof renderTasksPanel === 'function') renderTasksPanel();
    }
}