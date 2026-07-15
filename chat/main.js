import { queryPollinations } from './pollinations.js';
import { queryGemini } from './gemini.js';
import { queryOllama, fetchOllamaModels } from './ollama.js';
import { MODELOS_POLLINATIONS, MODELOS_GEMINI } from './modelos.js';
import { MODELOS_IMAGEN, queryImageGeneration } from './imagenes.js';
import { iniciarSesionPollinations, procesarRetornoAutenticacion } from './login.js';

// --- INICIALIZACIÓN DEL SISTEMA DE CANVAS [SOLICITUD LITERAL EXPLICITA] ---
function initCanvasSystem() {
    const canvas = document.getElementById('canvas-procesado');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 512;
        ctx.fillStyle = "#0c111d";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// Estado del Canal y Modelos
let appMode = 'chat'; // Puede ser 'chat' o 'image'
let modelosActuales = [...MODELOS_POLLINATIONS];
let activeModelIndex = 0;

// Gestión de Favoritos Independientes
let favoritosText = [];
let favoritosImage = [];

// --- GESTIÓN DE CONVERSACIONES MULTI-HILO ---
let conversations = [];
let activeConversationId = null;
let currentBufferAttachments = []; // Archivos en cola

// Referencias DOM Base
const providerSelect = document.getElementById('provider-select');
const providerContainer = document.getElementById('provider-container');
const dropdownTrigger = document.getElementById('dropdown-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
const dropdownArrow = document.getElementById('dropdown-arrow');
const dropdownOptions = document.getElementById('dropdown-options');
const selectedModelText = document.getElementById('selected-model-text');
const modelLabelText = document.getElementById('model-label-text');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const btnSend = document.getElementById('btn-send');

// selectores de Modo de Operación
const btnModeChat = document.getElementById('btn-mode-chat');
const btnModeImage = document.getElementById('btn-mode-image');

// Referencias de Gestión de Conversaciones
const btnNewChat = document.getElementById('btn-new-chat');
const chatsContainer = document.getElementById('chats-container');

// Referencias de Carga de Archivos
const btnAttach = document.getElementById('btn-attach');
const fileUploader = document.getElementById('file-uploader');
const attachmentPreviewArea = document.getElementById('attachment-preview-area');

// Referencias DOM Sistema de Modales Integrado
const modalSettings = document.getElementById('modal-settings');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnSaveSettings = document.getElementById('btn-save-settings');

// Inputs de Configuración del Modal y Botón de Login BYOP
const apiKeyPollinationsInput = document.getElementById('api-key-pollinations');
const btnLoginPollinations = document.getElementById('btn-login-pollinations');
const apiKeyGeminiInput = document.getElementById('api-key-gemini');
const endpointOllamaInput = document.getElementById('endpoint-ollama');

// Cargar persistencia al arrancar
window.addEventListener('load', () => {
    initCanvasSystem();
    
    // Procesar el posible retorno de autenticación BYOP de Pollinations
    const tokenAutenticado = procesarRetornoAutenticacion();
    if (tokenAutenticado) {
        console.log("Sesión de Pollinations BYOP iniciada de forma exitosa.");
    }

    loadSavedSettings();
    loadConversations();
    loadFavorites();
    updateProviderLayout();
    initModeHandlers();
});

function loadSavedSettings() {
    apiKeyPollinationsInput.value = localStorage.getItem('hub_key_pollinations') || '';
    apiKeyGeminiInput.value = localStorage.getItem('hub_key_gemini') || '';
    endpointOllamaInput.value = localStorage.getItem('hub_endpoint_ollama') || 'http://127.0.0.1:11434';
    providerSelect.value = localStorage.getItem('hub_active_provider') || 'pollinations';
}

// Cargar y guardar favoritos de forma persistente e independiente
function loadFavorites() {
    const dataText = localStorage.getItem('hub_favorites_text');
    favoritosText = dataText ? JSON.parse(dataText) : [];

    const dataImg = localStorage.getItem('hub_favorites_image');
    favoritosImage = dataImg ? JSON.parse(dataImg) : [];
}

function saveFavorites() {
    if (appMode === 'chat') {
        localStorage.setItem('hub_favorites_text', JSON.stringify(favoritosText));
    } else {
        localStorage.setItem('hub_favorites_image', JSON.stringify(favoritosImage));
    }
}

// Control de Eventos de Interfaz para el Modal Flotante
btnOpenSettings.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
});

function hideModal() {
    modalSettings.classList.add('hidden');
}

btnCloseModal.addEventListener('click', hideModal);

// Iniciar sesión interactiva usando la clave proporcionada como client_id
btnLoginPollinations.addEventListener('click', () => {
    const customClientId = apiKeyPollinationsInput.value.trim();
    iniciarSesionPollinations(customClientId);
});

// Salvar datos explícitos en caché local y actualizar el entorno del buffer
btnSaveSettings.addEventListener('click', () => {
    localStorage.setItem('hub_key_pollinations', apiKeyPollinationsInput.value.trim());
    localStorage.setItem('hub_key_gemini', apiKeyGeminiInput.value.trim());
    localStorage.setItem('hub_endpoint_ollama', endpointOllamaInput.value.trim());
    hideModal();
    updateProviderLayout();
});

// Cerrar modal haciendo clic fuera de la tarjeta contenedora externa
modalSettings.addEventListener('click', (e) => {
    if (e.target === modalSettings) hideModal();
});

// --- INTERCONEXIÓN DE BOTONES DE MODO (CHAT vs IMAGEN) ---
function initModeHandlers() {
    btnModeChat.addEventListener('click', () => {
        if (appMode === 'chat') return;
        appMode = 'chat';
        btnModeChat.className = "py-2 text-xs font-bold rounded-lg transition-all font-mono bg-blue-600 text-white cursor-pointer uppercase tracking-wider";
        btnModeImage.className = "py-2 text-xs font-bold rounded-lg transition-all font-mono text-slate-400 hover:text-white cursor-pointer uppercase tracking-wider";
        
        // Mostrar selector de proveedor y label estándar
        providerContainer.classList.remove('hidden');
        modelLabelText.innerHTML = `<i class="fa-solid fa-robot mr-1.5"></i>Seleccionar Modelo`;
        userInput.placeholder = "Escribe un mensaje o arrastra un archivo...";
        btnAttach.classList.remove('hidden');
        
        updateProviderLayout();
    });

    btnModeImage.addEventListener('click', () => {
        if (appMode === 'image') return;
        appMode = 'image';
        btnModeImage.className = "py-2 text-xs font-bold rounded-lg transition-all font-mono bg-blue-600 text-white cursor-pointer uppercase tracking-wider";
        btnModeChat.className = "py-2 text-xs font-bold rounded-lg transition-all font-mono text-slate-400 hover:text-white cursor-pointer uppercase tracking-wider";
        
        // Ocultar selector de proveedor (imágenes van nativas por Pollinations en este hub)
        providerContainer.classList.add('hidden');
        modelLabelText.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles mr-1.5"></i>Modelo Generativo`;
        userInput.placeholder = "Describe detalladamente la imagen que deseas generar o adjunta una de referencia...";
        
        // Permitir adjuntar en modo imagen (no ocultamos el botón ni reiniciamos obligatoriamente a menos que se desee)
        btnAttach.classList.remove('hidden');
        currentBufferAttachments = [];
        renderAttachmentPreviews();

        modelosActuales = [...MODELOS_IMAGEN];
        buildModelDropdown();
    });
}

// --- LÓGICA DE GESTIÓN DE CONVERSACIONES ---
function loadConversations() {
    const data = localStorage.getItem('hub_conversations');
    if (data) {
        conversations = JSON.parse(data);
    } else {
        conversations = [];
    }

    if (conversations.length === 0) {
        createNewConversation("Nueva Conversación");
    } else {
        activeConversationId = localStorage.getItem('hub_active_conversation_id') || conversations[0].id;
        renderConversationSidebar();
        renderActiveConversation();
    }
}

function saveConversations() {
    localStorage.setItem('hub_conversations', JSON.stringify(conversations));
    localStorage.setItem('hub_active_conversation_id', activeConversationId);
}

function createNewConversation(titleName = "Nueva Conversación") {
    const newChat = {
        id: `chat-${Date.now()}`,
        title: titleName,
        messages: []
    };
    conversations.unshift(newChat);
    activeConversationId = newChat.id;
    saveConversations();
    renderConversationSidebar();
    renderActiveConversation();
}

function selectConversation(id) {
    activeConversationId = id;
    saveConversations();
    renderConversationSidebar();
    renderActiveConversation();
}

function deleteConversation(id, event) {
    event.stopPropagation();
    conversations = conversations.filter(c => c.id !== id);
    if (conversations.length === 0) {
        createNewConversation("Nueva Conversación");
    } else {
        if (activeConversationId === id) {
            activeConversationId = conversations[0].id;
        }
        saveConversations();
        renderConversationSidebar();
        renderActiveConversation();
    }
}

function renameConversation(id, event) {
    event.stopPropagation();
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;
    
    const newTitle = prompt("Escribe el nuevo nombre de la conversación:", chat.title);
    if (newTitle && newTitle.trim() !== "") {
        chat.title = newTitle.trim();
        saveConversations();
        renderConversationSidebar();
    }
}

function renderConversationSidebar() {
    chatsContainer.innerHTML = '';
    conversations.forEach(c => {
        const isActive = c.id === activeConversationId;
        const item = document.createElement('div');
        item.className = `group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            isActive ? 'bg-blue-600/10 text-white border border-blue-500/30' : 'text-slate-400 hover:bg-[#121826] hover:text-slate-200 border border-transparent'
        }`;
        
        item.innerHTML = `
            <div class="flex items-center gap-2 truncate max-w-[70%]">
                <i class="fa-regular fa-comment text-[11px] shrink-0"></i>
                <span class="truncate" title="${c.title}">${c.title}</span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="btn-rename text-slate-400 hover:text-blue-400 p-1 rounded" title="Renombrar">
                    <i class="fa-solid fa-pen text-[9px]"></i>
                </button>
                <button class="btn-delete text-slate-400 hover:text-rose-400 p-1 rounded" title="Eliminar">
                    <i class="fa-solid fa-trash-can text-[9px]"></i>
                </button>
            </div>
        `;

        item.addEventListener('click', () => selectConversation(c.id));
        item.querySelector('.btn-rename').addEventListener('click', (e) => renameConversation(c.id, e));
        item.querySelector('.btn-delete').addEventListener('click', (e) => deleteConversation(c.id, e));

        chatsContainer.appendChild(item);
    });
}

function renderActiveConversation() {
    chatHistory.innerHTML = '';
    const currentChat = conversations.find(c => c.id === activeConversationId);
    if (!currentChat) return;

    if (currentChat.messages.length === 0) {
        chatHistory.innerHTML = `
            <div class="flex gap-4 max-w-4xl mx-auto items-start bg-[#0c111d] border border-slate-800/60 p-5 rounded-2xl">
                <div class="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-robot text-sm"></i>
                </div>
                <div class="space-y-1 flex-1">
                    <p class="text-xs text-blue-400 font-bold uppercase tracking-wider font-mono">Asistente Unificado</p>
                    <p class="text-sm text-slate-300 leading-relaxed">¿En qué puedo ayudarte hoy? Elige tu modelo preferido a la izquierda y comencemos a trabajar.</p>
                </div>
            </div>
        `;
    } else {
        currentChat.messages.forEach(m => {
            appendChatMessageToDOM(m.role, m.content, m.modelName || "Modelo", false, m.imageUrl);
        });
    }
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

btnNewChat.addEventListener('click', () => createNewConversation());

// --- GESTIÓN DE ADJUNTAR ARCHIVOS ---
btnAttach.addEventListener('click', () => fileUploader.click());

fileUploader.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    for (const file of files) {
        const isImage = file.type.startsWith('image/');
        const fileObj = {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            type: file.type,
            isImage: isImage
        };

        const reader = new FileReader();
        if (isImage) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }

        await new Promise((resolve) => {
            reader.onload = () => {
                fileObj.data = reader.result;
                currentBufferAttachments.push(fileObj);
                resolve();
            };
        });
    }

    fileUploader.value = ''; // Resetear input
    renderAttachmentPreviews();
});

function renderAttachmentPreviews() {
    if (currentBufferAttachments.length === 0) {
        attachmentPreviewArea.classList.add('hidden');
        attachmentPreviewArea.innerHTML = '';
        return;
    }

    attachmentPreviewArea.classList.remove('hidden');
    attachmentPreviewArea.innerHTML = '';

    currentBufferAttachments.forEach(file => {
        const item = document.createElement('div');
        item.className = "flex items-center gap-1.5 bg-[#1a2336] border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-200 max-w-[200px] shrink-0";
        
        let icon = `<i class="fa-regular fa-file-lines text-blue-400"></i>`;
        if (file.isImage) {
            icon = `<i class="fa-regular fa-image text-emerald-400"></i>`;
        }

        item.innerHTML = `
            ${icon}
            <span class="truncate flex-1" title="${file.name}">${file.name}</span>
            <button class="btn-remove hover:text-rose-400 transition-colors ml-1 cursor-pointer">
                <i class="fa-solid fa-xmark text-[10px]"></i>
            </button>
        `;

        item.querySelector('.btn-remove').addEventListener('click', () => {
            currentBufferAttachments = currentBufferAttachments.filter(f => f.id !== file.id);
            renderAttachmentPreviews();
        });

        attachmentPreviewArea.appendChild(item);
    });
}

// Re-renderizado estructural basado en el motor seleccionado
async function updateProviderLayout() {
    if (appMode === 'image') return; // En modo imagen no gestionamos proveedores de texto

    const provider = providerSelect.value;
    localStorage.setItem('hub_active_provider', provider);

    if (provider === 'pollinations') {
        modelosActuales = [...MODELOS_POLLINATIONS];
        buildModelDropdown();
    } else if (provider === 'gemini') {
        modelosActuales = [...MODELOS_GEMINI];
        buildModelDropdown();
    } else if (provider === 'ollama') {
        selectedModelText.textContent = "Buscando modelos en Ollama...";
        try {
            const list = await fetchOllamaModels(endpointOllamaInput.value.trim());
            if (list.length > 0) {
                modelosActuales = list.map(m => ({ name: m.name.toUpperCase(), tag: m.name }));
            } else {
                modelosActuales = [{ name: "LLAMA3 (FALLBACK)", tag: "llama3" }];
            }
        } catch (e) {
            modelosActuales = [{ name: "OLLAMA OFFLINE", tag: "error" }];
        }
        buildModelDropdown();
    }
}

providerSelect.addEventListener('change', updateProviderLayout);

// Desplegable de Modelos Activos (Ordena favoritos primero y dibuja la estrella interactiva)
function buildModelDropdown() {
    dropdownOptions.innerHTML = '';
    const favoritosActivos = appMode === 'chat' ? favoritosText : favoritosImage;

    // Ordenar modelos: Favoritos primero, respetando el orden relativo original
    const ordenados = [...modelosActuales].sort((a, b) => {
        const isAFav = favoritosActivos.includes(a.tag);
        const isBFav = favoritosActivos.includes(b.tag);
        if (isAFav && !isBFav) return -1;
        if (!isAFav && isBFav) return 1;
        return 0;
    });

    ordenados.forEach((m, index) => {
        const isFav = favoritosActivos.includes(m.tag);
        
        const row = document.createElement('div');
        row.className = "px-4 py-2.5 cursor-pointer hover:bg-blue-600/10 hover:text-white text-slate-300 transition-colors truncate flex justify-between items-center";
        
        row.innerHTML = `
            <span class="truncate pr-2">${m.name}</span>
            <button class="btn-fav text-slate-500 hover:text-yellow-400 transition-colors p-1" title="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star text-xs ${isFav ? 'text-yellow-400' : ''}"></i>
            </button>
        `;

        // Al hacer clic en la fila se selecciona el modelo, salvo si se hace clic en la estrella
        row.addEventListener('click', (e) => {
            if (e.target.closest('.btn-fav')) return;
            
            // Buscar el índice real en modelosActuales a partir del tag seleccionado
            const realIndex = modelosActuales.findIndex(original => original.tag === m.tag);
            selectModel(realIndex !== -1 ? realIndex : 0);
            closeDropdown();
        });

        // Evento de clic en la estrella de favoritos
        row.querySelector('.btn-fav').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(m.tag);
        });

        dropdownOptions.appendChild(row);
    });

    // Mantener la selección actual apuntando al primer elemento tras reordenar
    if (ordenados.length > 0) {
        const currentSelectedTag = modelosActuales[activeModelIndex]?.tag;
        const newIndex = modelosActuales.findIndex(original => original.tag === currentSelectedTag);
        selectModel(newIndex !== -1 ? newIndex : 0);
    }
}

function toggleFavorite(tag) {
    if (appMode === 'chat') {
        if (favoritosText.includes(tag)) {
            favoritosText = favoritosText.filter(f => f !== tag);
        } else {
            favoritosText.push(tag);
        }
    } else {
        if (favoritosImage.includes(tag)) {
            favoritosImage = favoritosImage.filter(f => f !== tag);
        } else {
            favoritosImage.push(tag);
        }
    }
    saveFavorites();
    buildModelDropdown(); // Regenera y reordena la lista de inmediato
}

function selectModel(index) {
    activeModelIndex = index;
    if (modelosActuales[index]) {
        selectedModelText.textContent = modelosActuales[index].name;
    }
}

dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
    dropdownArrow.classList.toggle('rotate-180');
});

function closeDropdown() {
    dropdownMenu.classList.add('hidden');
    dropdownArrow.classList.remove('rotate-180');
}

document.addEventListener('click', (e) => {
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) closeDropdown();
});

// Enrutado de Mensajes del Pipeline General
async function handleSend() {
    const promptText = userInput.value.trim();
    const hasAttachments = currentBufferAttachments.length > 0;
    
    if ((!promptText && !hasAttachments) || modelosActuales[activeModelIndex]?.tag === 'error') return;

    userInput.value = '';
    userInput.disabled = true;
    btnSend.disabled = true;
    btnAttach.disabled = true;

    const provider = providerSelect.value;
    const activeModel = modelosActuales[activeModelIndex];

    // Clonar lista de adjuntos de este turno y resetear buffer inmediatamente
    const thisTurnAttachments = [...currentBufferAttachments];
    currentBufferAttachments = [];
    renderAttachmentPreviews();

    // Persistir el mensaje del usuario en el historial activo
    const currentChat = conversations.find(c => c.id === activeConversationId);
    if (currentChat) {
        currentChat.messages.push({
            role: 'usuario',
            content: promptText || "[Archivos Adjuntos]",
            modelName: 'Tú'
        });
        saveConversations();
    }

    appendChatMessageToDOM("usuario", promptText || "[Archivos Adjuntos]");
    const waitingId = appendWaitingMessage(activeModel.name);

    try {
        let responseText = "";
        let generatedImageUrl = "";

        if (appMode === 'image') {
            // Pipeline para la Generación Directa de Imágenes en el Chat
            const pollinationsKey = apiKeyPollinationsInput.value.trim();
            generatedImageUrl = await queryImageGeneration(promptText, activeModel.tag, pollinationsKey, thisTurnAttachments);
            responseText = `He generado con éxito la imagen utilizando el modelo **${activeModel.name}** con el prompt:\n\n*"${promptText}"*`;
        } else {
            // Pipeline de Chat Estándar (Texto)
            const historyPayload = getChatPayload();
            if (provider === 'pollinations') {
                responseText = await queryPollinations(historyPayload, activeModel.tag, apiKeyPollinationsInput.value.trim(), thisTurnAttachments);
            } else if (provider === 'gemini') {
                responseText = await queryGemini(historyPayload, activeModel.tag, apiKeyGeminiInput.value.trim(), thisTurnAttachments);
            } else if (provider === 'ollama') {
                responseText = await queryOllama(historyPayload, activeModel.tag, endpointOllamaInput.value.trim(), thisTurnAttachments);
            }
        }

        document.getElementById(waitingId)?.remove();

        // Guardar respuesta en la conversación activa
        if (currentChat) {
            const newMsg = {
                role: 'asistente',
                content: responseText,
                modelName: activeModel.name
            };
            if (generatedImageUrl) {
                newMsg.imageUrl = generatedImageUrl;
            }
            currentChat.messages.push(newMsg);

            // Si es el primer mensaje, renombramos automáticamente la conversación
            if (currentChat.title === "Nueva Conversación") {
                currentChat.title = promptText.substring(0, 24) || "Hilo Activo";
                renderConversationSidebar();
            }
            saveConversations();
        }

        appendChatMessageToDOM("asistente", responseText, activeModel.name, true, generatedImageUrl);

    } catch (err) {
        document.getElementById(waitingId)?.remove();
        appendChatMessageToDOM("sistema-error", `Pipeline interrumpido: ${err.message}`);
    } finally {
        userInput.disabled = false;
        btnSend.disabled = false;
        btnAttach.disabled = false; // Mantenemos habilitado para permitir adjuntar en cualquier modo de forma persistente
        userInput.focus();
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

function getChatPayload() {
    const currentChat = conversations.find(c => c.id === activeConversationId);
    if (!currentChat) return [];
    
    return currentChat.messages.map(m => ({
        role: m.role === 'usuario' ? 'user' : 'assistant',
        content: m.content
    }));
}

function formatModelOutput(text) {
    if (!text) return '';
    return text.replace(/<think>/gi, '<div class="think-block"><div class="think-header"><i class="fa-solid fa-brain mr-1.5"></i>Razonamiento Interno</div>')
               .replace(/<\/think>/gi, '</div>');
}

function appendChatMessageToDOM(role, text, modelName = "", autoScroll = true, imageUrl = "") {
    const messageId = `msg-${Date.now()}`;
    const card = document.createElement('div');
    card.id = messageId;
    card.className = "chat-card max-w-4xl mx-auto flex gap-4 items-start p-5 rounded-2xl transition-all";

    let icon = "";
    let title = "";

    if (role === 'usuario') {
        card.className += " bg-[#0a0f1d]/50 border border-slate-800/40";
        icon = `<div class="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-white"><i class="fa-solid fa-user text-xs"></i></div>`;
        title = `<p class="text-xs text-blue-500 font-bold uppercase tracking-wider font-mono">Tú (Usuario)</p>`;
    } else if (role === 'asistente') {
        card.className += " bg-[#0c111d] border border-slate-800";
        icon = `<div class="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center shrink-0"><i class="fa-solid fa-robot text-xs"></i></div>`;
        title = `<p class="text-xs text-blue-400 font-bold uppercase tracking-wider font-mono">${modelName}</p>`;
    } else {
        card.className += " bg-rose-950/20 border border-rose-900/40 text-rose-300";
        icon = `<div class="w-8 h-8 rounded-xl bg-rose-900/20 text-rose-400 flex items-center justify-center shrink-0"><i class="fa-solid fa-triangle-exclamation text-xs"></i></div>`;
        title = `<p class="text-xs text-rose-400 font-bold uppercase tracking-wider font-mono">Error de Telemetría</p>`;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = icon.trim();
    const iconNode = tempDiv.firstChild;

    const container = document.createElement('div');
    container.className = "space-y-3 flex-1 overflow-hidden";
    container.innerHTML = title;

    const textParagraph = document.createElement('div');
    textParagraph.className = "msg-content text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words";
    textParagraph.innerHTML = formatModelOutput(text);
    container.appendChild(textParagraph);

    // Renderizar la Imagen si viene en la respuesta del pipeline
    if (imageUrl) {
        const imgContainer = document.createElement('div');
        imgContainer.className = "mt-4 border border-slate-800 bg-slate-950 rounded-xl overflow-hidden p-4 space-y-3 max-w-lg";
        imgContainer.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                <span class="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-wider"><i class="fa-solid fa-image mr-1"></i>Imagen Generada</span>
                <a href="${imageUrl}" download="generacion_${messageId}.png" class="btn-down text-[10px] bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all flex items-center gap-1 cursor-pointer">
                    <i class="fa-solid fa-download"></i> Descargar Imagen
                </a>
            </div>
            <div class="flex items-center justify-center max-w-full rounded-lg overflow-hidden bg-[#0a0f1d] border border-slate-900">
                <img src="${imageUrl}" class="w-full h-auto max-h-[512px] object-contain rounded" alt="Imagen Generada" />
            </div>
        `;
        container.appendChild(imgContainer);
    }

    detectSvgStructures(text, container, messageId);

    card.appendChild(iconNode);
    card.appendChild(container);
    chatHistory.appendChild(card);
    
    if (autoScroll) {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
}

function appendWaitingMessage(modelName) {
    const waitingId = `wait-${Date.now()}`;
    const card = document.createElement('div');
    card.id = waitingId;
    card.className = "max-w-4xl mx-auto flex gap-4 items-start p-5 rounded-2xl bg-[#0c111d] border border-slate-800/60";
    card.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800 text-blue-400 flex items-center justify-center shrink-0 animate-spin">
            <i class="fa-solid fa-spinner text-xs"></i>
        </div>
        <div class="space-y-2 flex-1">
            <p class="text-xs text-blue-400 font-bold uppercase tracking-wider font-mono">${modelName}</p>
            <div class="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <span>Calculando respuesta de flujo</span><span class="animate-pulse">...</span>
            </div>
        </div>
    `;
    chatHistory.appendChild(card);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return waitingId;
}

function detectSvgStructures(rawText, container, messageId) {
    const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
    const matches = rawText.match(svgRegex);
    if (matches && matches.length > 0) {
        matches.forEach((svgStr, idx) => {
            const previewBox = document.createElement('div');
            previewBox.className = "mt-4 border border-slate-800 bg-slate-950 rounded-xl overflow-hidden p-4 space-y-3";
            previewBox.innerHTML = `
                <div class="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
                    <span class="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-wider"><i class="fa-solid fa-compass-drafting mr-1"></i>Previsualización Vectorial SVG #${idx + 1}</span>
                    <button class="btn-down text-[10px] bg-blue-900/60 hover:bg-blue-800 text-blue-300 px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all flex items-center gap-1 cursor-pointer">
                        <i class="fa-solid fa-download"></i> Descargar SVG
                    </button>
                </div>
                <div class="bg-transparent flex items-center justify-center max-w-full overflow-auto min-h-[150px] p-2 border border-slate-900/40 rounded-lg">
                    ${svgStr.trim()}
                </div>
            `;
            previewBox.querySelector('.btn-down').addEventListener('click', () => {
                const blob = new Blob([svgStr.trim()], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vector_${messageId}_${idx + 1}.svg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
            container.appendChild(previewBox);
        });
    }
}

btnSend.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});