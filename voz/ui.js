// ─── RECUPERAR API KEY AL CARGAR ───
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key_standalone');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }
});

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
    // Hacemos esto a mano para no usar interruptAudio() que mandaría un paquete colisionando con el texto
    audioQueue = [];
    isPlayingAudio = false;
    if (currentActiveSource) {
        try { currentActiveSource.stop(); } catch(e) {}
        currentActiveSource = null;
    }
    // -----------------------------------------------------

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
    if (key) {
        localStorage.setItem('gemini_api_key_standalone', key);
        cerrarModalConfig();
    } else {
        alert("Por favor, introduce una API Key válida.");
    }
}