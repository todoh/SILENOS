// history.js
// --- UNDO / REDO + BACKUP AUTOMÁTICO ---

const HISTORY_LIMIT = 60;
let historyStack = [];
let historyIndex = -1;
let historyLock = false; // evita registrar cambios durante undo/redo
let saveIndicatorTimeout = null;

function snapshotData() {
    const cleanData = JSON.parse(JSON.stringify(data));
    if (cleanData && cleanData.nodes) {
        cleanData.nodes.forEach(n => {
            if (n.image && n.image.startsWith('data:image')) {
                n.image = "db_stored";
            }
        });
    }
    return JSON.stringify(cleanData);
}

function resetHistory() {
    historyStack = [snapshotData()];
    historyIndex = 0;
}

function pushHistory() {
    if (historyLock) return;
    const snap = snapshotData();
    // Evita pushes duplicados consecutivos
    if (historyStack[historyIndex] === snap) return;
    // Si hicimos undo y luego cambio, descartamos el "futuro"
    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push(snap);
    if (historyStack.length > HISTORY_LIMIT) historyStack.shift();
    historyIndex = historyStack.length - 1;
}

function undo() {
    if (historyIndex <= 0) return;
    historyLock = true;
    historyIndex--;
    data = JSON.parse(historyStack[historyIndex]);
    projects[currentId] = data;
    historyLock = false;
    if (typeof closeEditor === 'function') closeEditor();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof document !== 'undefined') {
        const inp = document.getElementById('project-name-input');
        if (inp) inp.value = data.name;
    }
    flashSaveIndicator('UNDO');
}

function redo() {
    if (historyIndex >= historyStack.length - 1) return;
    historyLock = true;
    historyIndex++;
    data = JSON.parse(historyStack[historyIndex]);
    projects[currentId] = data;
    historyLock = false;
    if (typeof closeEditor === 'function') closeEditor();
    if (typeof renderSidebar === 'function') renderSidebar();
    if (typeof document !== 'undefined') {
        const inp = document.getElementById('project-name-input');
        if (inp) inp.value = data.name;
    }
    flashSaveIndicator('REDO');
}

// --- INDICADOR VISUAL DE GUARDADO ---
function flashSaveIndicator(msg = 'GUARDADO') {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(saveIndicatorTimeout);
    saveIndicatorTimeout = setTimeout(() => {
        el.style.opacity = '0';
    }, 1200);
}

// --- BACKUP AUTOMÁTICO ---
// Cada 5 minutos guarda un backup adicional con timestamp sin cadenas base64
const BACKUP_KEY = 'koreh_v3_backups';
const BACKUP_MAX = 5;

function makeBackup() {
    try {
        const cleanProjects = JSON.parse(JSON.stringify(projects));
        Object.keys(cleanProjects).forEach(id => {
            if (cleanProjects[id] && cleanProjects[id].nodes) {
                cleanProjects[id].nodes.forEach(n => {
                    if (n.image && n.image.startsWith('data:image')) {
                        n.image = "db_stored";
                    }
                });
            }
        });

        const backups = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
        backups.unshift({
            ts: Date.now(),
            projects: cleanProjects
        });
        while (backups.length > BACKUP_MAX) backups.pop();
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    } catch (e) {
        console.warn('Backup falló:', e);
    }
}

function listBackups() {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
}

function restoreBackup(index) {
    const backups = listBackups();
    if (!backups[index]) return false;
    projects = backups[index].projects;
    Object.keys(projects).forEach(id => projects[id] = normalizeProject(projects[id]));
    const firstId = Object.keys(projects)[0];
    if (firstId) {
        loadProjectLogic(firstId);
        if (typeof handleLoadProject === 'function') handleLoadProject(firstId);
    }
    return true;
}

// Backup periódico
setInterval(makeBackup, 5 * 60 * 1000);
// Backup al cerrar pestaña
window.addEventListener('beforeunload', makeBackup);

document.addEventListener('DOMContentLoaded', () => {
    // Reset history una vez que logic está cargado
    setTimeout(() => {
        if (typeof data !== 'undefined') resetHistory();
    }, 100);
});