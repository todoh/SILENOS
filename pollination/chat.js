// chat.js

let chatHistory = JSON.parse(localStorage.getItem('silenos_chat_history')) || [];
let savedContexts = JSON.parse(localStorage.getItem('silenos_chat_contexts')) || [];
let currentContextId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar chat
    renderChat();
    // Inicializar contextos
    loadContexts();
});

function saveChatHistory() {
    localStorage.setItem('silenos_chat_history', JSON.stringify(chatHistory));
}

function clearChatHistory() {
    if(confirm("¿Estás seguro de que quieres borrar el historial de chat de la memoria?")) {
        chatHistory = [];
        saveChatHistory();
        renderChat();
    }
}

function handleChatKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
    }
}

// --- CONTEXT MANAGER LOGIC ---

function loadContexts() {
    savedContexts = JSON.parse(localStorage.getItem('silenos_chat_contexts')) || [];
    renderContextList();
}

function renderContextList() {
    const list = document.getElementById('chat-context-list');
    list.innerHTML = '<option value="">-- General (No Saved) --</option>';
    
    savedContexts.forEach(ctx => {
        const option = document.createElement('option');
        option.value = ctx.id;
        option.textContent = ctx.name;
        list.appendChild(option);
    });

    if (currentContextId) {
        list.value = currentContextId;
    }
}

function selectContext(id) {
    currentContextId = id;
    const nameInput = document.getElementById('chat-context-name');
    const systemInput = document.getElementById('chat-system');
    
    if (!id) {
        // Modo general
        nameInput.value = "";
        systemInput.value = ""; 
        return;
    }

    const ctx = savedContexts.find(c => c.id == id);
    if (ctx) {
        nameInput.value = ctx.name;
        systemInput.value = ctx.content;
    }
}

function createNewContext() {
    currentContextId = null;
    document.getElementById('chat-context-list').value = "";
    document.getElementById('chat-context-name').value = "";
    document.getElementById('chat-system').value = "";
    document.getElementById('chat-context-name').focus();
}

function saveCurrentContext() {
    const name = document.getElementById('chat-context-name').value.trim();
    const content = document.getElementById('chat-system').value.trim();
    
    if (!name) return alert("Please provide a name for this context.");

    if (currentContextId) {
        // Actualizar existente
        const index = savedContexts.findIndex(c => c.id == currentContextId);
        if (index !== -1) {
            savedContexts[index].name = name;
            savedContexts[index].content = content;
        }
    } else {
        // Crear nuevo
        const newId = Date.now().toString();
        savedContexts.push({
            id: newId,
            name: name,
            content: content
        });
        currentContextId = newId;
    }

    localStorage.setItem('silenos_chat_contexts', JSON.stringify(savedContexts));
    renderContextList();
    alert("Context saved successfully.");
}

function deleteCurrentContext() {
    if (!currentContextId) return;
    
    if (confirm("Are you sure you want to delete this context preset?")) {
        savedContexts = savedContexts.filter(c => c.id != currentContextId);
        localStorage.setItem('silenos_chat_contexts', JSON.stringify(savedContexts));
        createNewContext(); // Resetea a modo nuevo
        renderContextList();
    }
}

// --- END CONTEXT MANAGER LOGIC ---

async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const text = inputEl.value.trim();
    if (!text) return;

    const modelSelect = document.getElementById('chat-model').value;
    const systemPrompt = document.getElementById('chat-system').value.trim();
    const apiKey = localStorage.getItem('pollinations_api_key') || '';

    if (!apiKey) {
        alert("Por favor, conecta tu API Key de Pollination primero.");
        const modal = document.getElementById('login-modal');
        if (modal) modal.classList.remove('hidden');
        return;
    }

    // Agregar mensaje de usuario a la memoria local y renderizar
    chatHistory.push({ role: 'user', content: text });
    saveChatHistory();
    inputEl.value = '';
    renderChat();

    // Estado del botón y Loader de escritura
    const btn = document.getElementById('btn-send-chat');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    
    const messagesContainer = document.getElementById('chat-messages');
    const typingId = 'typing-' + Date.now();
    messagesContainer.insertAdjacentHTML('beforeend', `
        <div id="${typingId}" class="self-start bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-400 max-w-[80%] flex items-center gap-2">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Procesando...
        </div>
    `);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
        // Formatear payload para la API Pollinations de texto
        const payloadMessages = [];
        
        if (systemPrompt) {
            payloadMessages.push({ role: 'system', content: systemPrompt });
        }
        
        // Cargar todo el historial acumulado
        payloadMessages.push(...chatHistory);

        const payload = {
            model: modelSelect,
            messages: payloadMessages,
            temperature: 0.7
        };

        const response = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const replyText = data.choices[0].message.content;

        // Guardar respuesta del asistente en memoria y persistir
        chatHistory.push({ role: 'assistant', content: replyText });
        saveChatHistory();

    } catch (e) {
        console.error("Error en chat:", e);
        alert("Error de comunicación con la IA: " + e.message);
        // Si falla, removemos la etiqueta visual de "procesando"
        const el = document.getElementById(typingId);
        if(el) el.remove();
    } finally {
        // Restaurar estado e interfaz
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        renderChat();
    }
}

function renderChat() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    container.innerHTML = '';

    if (chatHistory.length === 0) {
        container.innerHTML = `
            <div class="m-auto flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
                <i class="fa-solid fa-message text-5xl"></i>
                <p class="text-sm font-light tracking-wide">Comienza una nueva conversación.</p>
            </div>
        `;
        return;
    }

    chatHistory.forEach(msg => {
        const isUser = msg.role === 'user';
        
        // Reemplazar saltos de línea y sanitizar texto básico
        const formattedContent = msg.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");

        const msgDiv = document.createElement('div');
        msgDiv.className = `px-4 py-3 text-sm max-w-[85%] leading-relaxed ${isUser 
            ? 'self-end bg-purple-600/80 border border-purple-500/50 text-white rounded-2xl rounded-tr-sm shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
            : 'self-start bg-white/5 border border-white/10 text-gray-200 rounded-2xl rounded-tl-sm'}`;
        
        msgDiv.innerHTML = formattedContent;
        container.appendChild(msgDiv);
    });

    // Auto-scroll al final del contenedor para ver el último mensaje
    container.scrollTop = container.scrollHeight;
}