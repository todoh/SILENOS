// live gemini/globals.js
// ─── STATE & CONSTANTS ───────────────────────────────────────────────────
let apiKey = localStorage.getItem('gemini_api_key') || '';
let session = null;
let isConnected = false;
let isMicActive = false;
let isVideoActive = false;
let isScreenActive = false;
let micStream = null;
let videoStream = null;
let screenStream = null;
let audioContext = null;
let audioProcessor = null;
let audioQueue = [];
let isPlayingAudio = false;
let videoFrameInterval = null;
let analyserNode = null;
let bars = [];
let idleAnim;

// Estado de Agentes
let fullConversationText = '';

// File System handles
let workspaceHandle = null;
let conversationsHandle = null;
let analysisHandle = null; 
let currentConversationFileHandle = null;
let memoryHandle = null; 

const MODEL = 'gemini-3.1-flash-live-preview'; // O el modelo gemini que prefieras
const WS_HOST = 'generativelanguage.googleapis.com';

// ─── TASK QUEUES (ASÍNCRONAS MEDIO/LARGO PLAZO) ──────────────────────────
class AsyncQueueManager {
    constructor(name, concurrency = 3) {
        this.name = name;
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
        this.history = [];
    }

    enqueue(taskName, taskFn, priority = 0) {
        return new Promise((resolve, reject) => {
            this.queue.push({ id: Date.now() + Math.random(), taskName, taskFn, resolve, reject, priority });
            this.queue.sort((a, b) => b.priority - a.priority); 
            if (typeof showToast === 'function') showToast(`Encolado: ${taskName}`, '');
            this.processNext();
        });
    }

    async processNext() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const task = this.queue.shift();
        
        try {
            const result = await task.taskFn();
            this.history.push({ taskName: task.taskName, status: 'success', time: new Date() });
            task.resolve(result);
        } catch (err) {
            this.history.push({ taskName: task.taskName, status: 'error', error: err.message, time: new Date() });
            task.reject(err);
        } finally {
            this.running--;
            if (this.history.length > 50) this.history.shift(); 
            this.processNext();
        }
    }
    
    getStats() {
        return {
            name: this.name,
            running: this.running,
            queued: this.queue.length,
            completed: this.history.length
        };
    }
}

const apiTaskQueue = new AsyncQueueManager("Llamadas_Red", 5); 
const computeTaskQueue = new AsyncQueueManager("Calculos_Locales", 1); 

// ─── HISTORY & UNDO/REDO MANAGER (LOG ABSOLUTO) ───────────────────────────
const historyManager = {
    undoStack: [],
    redoStack: [],
    actionLog: [],
    
    logAction(agent, actionDesc) {
        const time = new Date().toLocaleTimeString('es-ES');
        const logEntry = `[${time}] ${agent}: ${actionDesc}`;
        this.actionLog.push(logEntry);
        if (this.actionLog.length > 250) this.actionLog.shift(); // Mantiene un histórico amplio
        console.log(`[AUDIT LOG] ${logEntry}`);
    },

    async saveState(handle, oldContent, newContent) {
        if (oldContent === newContent) return; // No guardar si no hay cambios reales
        this.undoStack.push({ handle, oldContent, newContent, timestamp: Date.now() });
        this.redoStack = []; // Si hacemos un cambio nuevo, perdemos el redo futuro
        if (this.undoStack.length > 100) this.undoStack.shift(); // Hasta 100 pasos atrás
    },

    async undo() {
        if (this.undoStack.length === 0) {
            if (typeof showToast === 'function') showToast("Historial: No hay nada que deshacer", "error");
            return "No hay acciones registradas en disco para deshacer.";
        }
        const state = this.undoStack.pop();
        this.redoStack.push(state);
        
        try {
            const writable = await state.handle.createWritable();
            await writable.write(state.oldContent || '');
            await writable.close();
            
            this.logAction('SISTEMA', `Deshizo cambios (Ctrl+Z) en el archivo: ${state.handle.name}`);
            this.refreshUIs(state.handle, state.oldContent);
            if (typeof showToast === 'function') showToast(`Deshecho (Ctrl+Z): ${state.handle.name}`, 'success');
            return `Cambios deshechos exitosamente en ${state.handle.name}.`;
        } catch(e) {
            return `Error crítico al deshacer en ${state.handle.name}: ${e.message}`;
        }
    },

    async redo() {
        if (this.redoStack.length === 0) {
            if (typeof showToast === 'function') showToast("Historial: No hay nada que rehacer", "error");
            return "No hay acciones registradas en disco para rehacer.";
        }
        const state = this.redoStack.pop();
        this.undoStack.push(state);

        try {
            const writable = await state.handle.createWritable();
            await writable.write(state.newContent || '');
            await writable.close();
            
            this.logAction('SISTEMA', `Rehizo cambios (Ctrl+Y) en el archivo: ${state.handle.name}`);
            this.refreshUIs(state.handle, state.newContent);
            if (typeof showToast === 'function') showToast(`Rehecho (Ctrl+Y): ${state.handle.name}`, 'success');
            return `Cambios rehechos exitosamente en ${state.handle.name}.`;
        } catch(e) {
            return `Error crítico al rehacer en ${state.handle.name}: ${e.message}`;
        }
    },

    refreshUIs(handle, content) {
        // Actualiza forzosamente la UI visual de los editores para reflejar el Undo/Redo
        if (typeof ide !== 'undefined' && ide.currentFileHandle && ide.currentFileHandle.name === handle.name) {
            const editor = document.getElementById('ideEditor');
            if (editor) editor.value = content;
        }
        if (typeof visualizadorUI !== 'undefined' && visualizadorUI.currentFileHandle && visualizadorUI.currentFileHandle.name === handle.name) {
            const editor = document.getElementById('visEditor');
            if (editor) editor.value = content;
        }
    },

    getLog() {
        return this.actionLog.length > 0 ? this.actionLog.join('\n') : "El registro de acciones está vacío.";
    }
};

// ─── ATAJOS GLOBALES DE TECLADO ──────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    // Si estamos escribiendo, el textarea tiene su propio Ctrl+Z para letras, 
    // pero si interceptamos a nivel global, forzamos el Undo a nivel de archivo.
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            historyManager.undo();
        } else if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            historyManager.redo();
        }
    }
});

// ─── UTILITIES ───────────────────────────────────────────────────────────
function base64ToFloat32(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pcm16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;
  return float32;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}