// SILENOS 5 VOZ/main.js

// ─── VARIABLES GLOBALES ───
let ws = null;
let isConnected = false;

// Audio Output (Gemini a Altavoz)
let audioContext = null;
let audioQueue = [];
let isPlayingAudio = false;
let nextAudioTime = 0;
let currentActiveSource = null;

// Nodos de procesamiento de voz (Limpiado y Filtrado)
let voiceFilter = null;
let voiceCompressor = null;
let masterGain = null;

// Audio Input (Micro a Gemini)
let micStream = null;
let micCtx = null;
let micProcessor = null;
let isMicActive = false;

// Modelo exacto solicitado principal
const MODEL = 'gemini-3.1-flash-live-preview';

// ─── UTILIDADES GLOBALES ───
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

// ─── MEMORIA COGNITIVA PARALELA (GEMMA 4 31B) ───
let intervalosCognitivos = [];

function iniciarAnalisisCognitivo() {
    detenerAnalisisCognitivo();
    
    // Bucle 1: Corto Plazo (Cada 5 segundos)
    intervalosCognitivos.push(setInterval(() => {
        ejecutarAnalisisParalelo('corto_plazo', 'Analiza estrictamente la conversación actual y acciones inmediatas a corto plazo. Sé muy conciso. ¿Qué se está haciendo justo ahora?');
    }, 5000));
    
    // Bucle 2: Medio Plazo (Cada 15 segundos)
    intervalosCognitivos.push(setInterval(() => {
        ejecutarAnalisisParalelo('medio_plazo', 'Analiza los datos desde otra perspectiva: táctica y a medio plazo. ¿Qué se está construyendo o intentando resolver en general en esta sesión?');
    }, 15000));
    
    // Bucle 3: Largo Plazo (Cada 30 segundos)
    intervalosCognitivos.push(setInterval(() => {
        ejecutarAnalisisParalelo('largo_plazo', 'Analiza el flujo de trabajo desde OOOTRa perspectiva: estratégica, filosófica y a largo plazo. ¿Cuál es el objetivo final y el patrón de comportamiento del usuario?');
    }, 30000));
}

function detenerAnalisisCognitivo() {
    intervalosCognitivos.forEach(clearInterval);
    intervalosCognitivos = [];
}

async function ejecutarAnalisisParalelo(tipo, promptSistema) {
    const apiKey = localStorage.getItem('gemini_api_key_standalone');
    if (!apiKey) return;

    // Recopilar el contexto actual extrayendo el texto del chat
    const chatElement = document.getElementById('chat');
    const contextoChat = chatElement ? chatElement.innerText.slice(-4000) : ''; // Últimos ~4000 caracteres para no saturar tokens
    
    if (!contextoChat.trim()) return; 

    const promptFinal = `${promptSistema}\n\n[CONTEXTO ACTUAL DE CHARLA Y ACCIONES]:\n${contextoChat}\n\nEscribe tu análisis:`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptFinal }] }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.candidates && data.candidates.length > 0) {
                const analisis = data.candidates[0].content.parts[0].text;
                
                if (typeof escribirMemoria === 'function') {
                    await escribirMemoria(`analisis_${tipo}.txt`, analisis);
                }
            }
        }
    } catch (error) {
        // Fallos silenciosos para resiliencia
    }
}