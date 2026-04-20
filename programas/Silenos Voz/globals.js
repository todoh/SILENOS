// live gemini/globals.js
// ─── STATE & CONSTANTS ───────────────────────────────────────────────────
let apiKey = localStorage.getItem('gemini_api_key') || '';
let pollinationsKey = localStorage.getItem('pollinations_api_key') || '';
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

// ─── CONTINUOUS RECORDING ─────────────────────────────────────────────────
let continuousRecorder = null;
let recordingChunks = [];
let recordingsHandle = null;
let recordingInterval = null;

// Estado del Resumidor y Agentes
let summaryInterval = null;
let fullConversationText = '';

// File System handles
let workspaceHandle = null;
let conversationsHandle = null;
let analysisHandle = null; // Handle para los JSON generados por los agentes
let currentConversationFileHandle = null;
let memoryHandle = null; // Handle para la carpeta de memoria de Gemini

const MODEL = 'gemini-3.1-flash-live-preview';
const WS_HOST = 'generativelanguage.googleapis.com';
const POLLINATIONS_API_URL = 'https://gen.pollinations.ai/v1/chat/completions';

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
            this.queue.sort((a, b) => b.priority - a.priority); // Mayor prioridad primero
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
            if (this.history.length > 50) this.history.shift(); // Evitar overflow de memoria
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

// Instancias globales de colas para llamadas de red y cálculos pesados
const apiTaskQueue = new AsyncQueueManager("Llamadas_Red", 5); // 5 conexiones concurrentes
const computeTaskQueue = new AsyncQueueManager("Calculos_Locales", 1); // 1 hilo para evitar congelar UI

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