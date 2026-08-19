// ─── CONSTANTES Y PRESETS DE PERSONALIDAD ───
const PERSONALITY_PRESETS = {
    default: "Tu nombre es VOZ, tu titulo es SILENOS, tu nombre completo es Silenos Voz. Eres un asistente y arquitecto de desarrollo web brillante y observador. Tienes acceso completo a una carpeta local de trabajo a través de herramientas especializadas. Puedes leer, crear, modificar y eliminar archivos de texto (.txt) y código fuente (.html, .css, .js), así como administrar subcarpetas (crear, renombrar y borrar). REGLA CRÍTICA DE SEGURIDAD PARA CARPETAS: Está ESTRICTAMENTE PROHIBIDO ejecutar la función 'borrarCarpeta' sin antes haber preguntado verbalmente o por texto al usuario y haber recibido su confirmación o autorización explícita dentro de la conversación actual. Si el usuario te ha dado su permiso explícito en la charla justo antes, debes llamar a 'borrarCarpeta' pasando la propiedad 'autorizacionExpresa' en true. REGLA CRÍTICA DE INVOCACIÓN DE HERRAMIENTA: Antes de llamar a 'analisisCompleto', DEBES preguntar e informar verbalmente/por texto al usuario de que vas a utilizar el 'MODELO FUERTE' (gemini-3.6-flash).",
    concise: "Eres un asistente de desarrollo ultra conciso y directo. Responde con la menor cantidad de palabras posible. Si hay código que modificar, genera directamente la instrucción o función correspondiente sin introducciones, saludos ni explicaciones innecesarias.",
    creative: "Eres un colaborador creativo y entusiasta especializado en arquitectura narrativa, librojuegos e interfaces dinámicas. Aporta sugerencias estéticas, propone giros argumentales interesantes y mantén un tono inspirador y fluido."
};

// ─── RECUPERAR API KEY Y PERSONALIDAD AL CARGAR ───
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key_standalone');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
    
    const savedPersonality = localStorage.getItem('gemini_assistant_personality');
    const personalityTextarea = document.getElementById('personalityInstruction');
    const presetSelect = document.getElementById('personalityPreset');
    
    if (savedPersonality && personalityTextarea) {
        personalityTextarea.value = savedPersonality;
        if (presetSelect) presetSelect.value = 'custom';
    } else if (personalityTextarea) {
        personalityTextarea.value = PERSONALITY_PRESETS.default;
    }
});

function cambiarPresetPersonalidad() {
    const presetSelect = document.getElementById('personalityPreset');
    const personalityTextarea = document.getElementById('personalityInstruction');
    if (!presetSelect || !personalityTextarea) return;
    
    const val = presetSelect.value;
    if (val !== 'custom' && PERSONALITY_PRESETS[val]) {
        personalityTextarea.value = PERSONALITY_PRESETS[val];
    }
}

// ─── GESTIÓN DE UI DEL CHAT ───
function addMessage(role, text, isAudio = false) {
    if (!text.trim() && !isAudio) return;
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    
    let label = '';
    if (role === 'user') label = 'TÚ';
    else if (role === 'gemini') label = 'GEMINI';
    else if (role === 'system') label = 'SISTEMA';

    div.innerHTML = `<strong>${label}:</strong><br>${text} ${isAudio ? ' 🔊' : ''}`;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

// ─── GESTIÓN DE TEXTO DEL USUARIO ───
function sendText() {
    const input = document.getElementById('textInput');
    const text = input.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    
    // --- INTERRUMPIR AUDIO LOCAL SIN ENVIAR TURN COMPLETE AL SERVIDOR ---
    audioQueue = [];
    isPlayingAudio = false;
    if (currentActiveSource) {
        try { currentActiveSource.stop(); } catch(e) {}
        currentActiveSource = null;
    }

    ws.send(JSON.stringify({
        clientContent: {
            turns: [{
                role: "user",
                parts: [{ text: text }]
            }],
            turnComplete: true
        }
    }));
    
    addMessage('user', text);
    input.value = '';
}

function handleKey(e) {
    if (e.key === 'Enter') sendText();
}

// ─── GESTIÓN DE MODAL CONFIGURACIÓN ───
function abrirModalConfig() {
    document.getElementById('apiModal').style.display = 'flex';
}

function cerrarModalConfig() {
    document.getElementById('apiModal').style.display = 'none';
}

function guardarApiKey() {
    const key = document.getElementById('apiKey').value.trim();
    const personality = document.getElementById('personalityInstruction').value.trim();

    if (key) {
        localStorage.setItem('gemini_api_key_standalone', key);
        if (personality) {
            localStorage.setItem('gemini_assistant_personality', personality);
        }
        cerrarModalConfig();
    } else {
        alert("Por favor, introduce una API Key válida.");
    }
}