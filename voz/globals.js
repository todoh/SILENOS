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