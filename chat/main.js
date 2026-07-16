import { queryPollinations } from './pollinations.js'; 
import { queryGemini } from './gemini.js'; 
import { queryOllama, fetchOllamaModels } from './ollama.js'; 
import { fetchDynamicPollinationsTextModels, MODELOS_POLLINATIONS, MODELOS_GEMINI } from './modelos.js'; 
import { fetchDynamicPollinationsImageModels, MODELOS_IMAGEN, queryImageGeneration } from './imagenes.js'; 
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

// Estado del Canal, Modos y Proveedores 
let appMode = 'chat'; // Puede ser 'chat' o 'image' 
let listadoModelosTexto = []; // Combinación ordenada de Gemini -> Pollinations -> Ollama 
let activeModelIndex = 0; // Índice de selección dentro de la lista actual en uso 
let activeImageModelIndex = 0; // Guardar persistencia del último modelo de imagen usado 

// Gestión de Favoritos Independientes 
let favoritosText = []; 
let favoritosImage = []; 

// --- GESTIÓN DE CONVERSACIONES MULTI-HILO --- 
let conversations = []; 
let activeConversationId = null; 
let currentBufferAttachments = []; // Archivos en cola 

// Referencias DOM Base 
const dropdownTrigger = document.getElementById('dropdown-trigger'); 
const dropdownMenu = document.getElementById('dropdown-menu'); 
const dropdownOptions = document.getElementById('dropdown-options'); 
const selectedModelText = document.getElementById('selected-model-text'); 
const chatHistory = document.getElementById('chat-history'); 
const userInput = document.getElementById('user-input'); 
const btnSend = document.getElementById('btn-send'); 

// Herramienta de Crear Imagen Estilo Gemini 
const btnToolImage = document.getElementById('btn-tool-image'); 
const imageAspectSelector = document.getElementById('image-aspect-ratio-selector');

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
window.addEventListener('load', async () => {     
    initCanvasSystem();          
    
    // Procesar el posible retorno de autenticación BYOP de Pollinations     
    const tokenAutenticado = procesarRetornoAutenticacion();     
    if (tokenAutenticado) {         
        console.log("Sesión de Pollinations BYOP iniciada de forma exitosa.");     
    }          
    
    loadSavedSettings();     
    loadConversations();     
    loadFavorites();     

    // Sincronizar dinámicamente los catálogos antes de renderizar la UI
    await fetchDynamicPollinationsTextModels();
    await fetchDynamicPollinationsImageModels();

    await buildUnifiedTextModels();     
    initModeHandlers(); 
    initAspectLabelsHandler();
});

function loadSavedSettings() {     
    apiKeyPollinationsInput.value = localStorage.getItem('hub_key_pollinations') || '';     
    apiKeyGeminiInput.value = localStorage.getItem('hub_key_gemini') || '';     
    endpointOllamaInput.value = localStorage.getItem('hub_endpoint_ollama') || 'http://127.0.0.1:11434';     
    activeImageModelIndex = parseInt(localStorage.getItem('hub_active_image_model_index') || '0', 10); 
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

// Salvar datos explícitos en cache local y actualizar el entorno del buffer 
btnSaveSettings.addEventListener('click', async () => {     
    localStorage.setItem('hub_key_pollinations', apiKeyPollinationsInput.value.trim());     
    localStorage.setItem('hub_key_gemini', apiKeyGeminiInput.value.trim());     
    localStorage.setItem('hub_endpoint_ollama', endpointOllamaInput.value.trim());     
    hideModal();     
    
    // Volver a descargar catálogos en caso de que cambien las llaves o accesos
    await fetchDynamicPollinationsTextModels();
    await fetchDynamicPollinationsImageModels();
    await buildUnifiedTextModels(); 
});

// Cerrar modal haciendo clic fuera de la tarjeta contenedora externa 
modalSettings.addEventListener('click', (e) => {     
    if (e.target === modalSettings) hideModal(); 
});

// --- CONSTRUCCIÓN DEL MODELO UNIFICADO DE TEXTO (GEMINI -> POLLINATIONS -> OLLAMA) --- 
async function buildUnifiedTextModels() {     
    listadoModelosTexto = [];          
    
    // 1. Google Gemini (Fijado primero)     
    MODELOS_GEMINI.forEach(m => {         
        listadoModelosTexto.push({ ...m, provider: 'gemini' });     
    });          
    
    // 2. Pollinations (Fijado segundo, ahora dinámico y ordenado por precio)     
    MODELOS_POLLINATIONS.forEach(m => {         
        listadoModelosTexto.push({ ...m, provider: 'pollinations' });     
    });          
    
    // 3. Ollama (Fijado tercero)     
    try {         
        const list = await fetchOllamaModels(endpointOllamaInput.value.trim());         
        if (list && list.length > 0) {             
            list.forEach(m => {                 
                listadoModelosTexto.push({ name: m.name.toUpperCase(), tag: m.name, provider: 'ollama' });             
            });         
        }     
    } catch (e) {         
        console.warn("Ollama local no disponible o desconectado.");     
    }          
    
    if (appMode === 'chat') {         
        buildModelDropdown();     
    } 
}

// --- INTERCONEXIÓN DE BOTONES DE MODO (CHAT vs IMAGEN) --- 
function initModeHandlers() {     
    btnToolImage.addEventListener('click', () => {         
        if (appMode === 'image') {             
            appMode = 'chat';             
            btnToolImage.className = "text-xs font-semibold text-neutral-400 hover:text-black transition-colors cursor-pointer";             
            userInput.placeholder = "Escribe tu consulta aquí...";             
            imageAspectSelector.classList.add('hidden');
            buildModelDropdown();         
        } else {             
            appMode = 'image';             
            btnToolImage.className = "text-xs font-bold text-black transition-all cursor-pointer";             
            userInput.placeholder = "Describe detalladamente la imagen que deseas generar...";                          
            imageAspectSelector.classList.remove('hidden');
            if (activeImageModelIndex >= MODELOS_IMAGEN.length) {                 
                activeImageModelIndex = 0;             
            }             
            buildModelDropdown();         
        }     
    }); 
}

// Estilos dinámicos para los radio buttons de aspecto minimalista
function initAspectLabelsHandler() {
    const radios = document.querySelectorAll('input[name="aspect-ratio"]');
    radios.forEach(radio => {
        radio.addEventListener('change', () => {
            radios.forEach(r => {
                const lbl = r.closest('label');
                if (r.checked) {
                    lbl.className = "flex items-center gap-1 cursor-pointer text-black font-semibold";
                } else {
                    lbl.className = "flex items-center gap-1 cursor-pointer text-neutral-400 hover:text-black transition-colors";
                }
            });
        });
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
        // Forzar limpieza de estados pendientes de UI al recargar la app por seguridad
        conversations.forEach(c => {
            if (c.id === activeConversationId) c.status = 'none';
        });
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
        messages: [],
        status: 'none' // 'none', 'processing', 'completed'
    };     
    conversations.unshift(newChat);     
    activeConversationId = newChat.id;     
    saveConversations();     
    renderConversationSidebar();     
    renderActiveConversation(); 
}

function selectConversation(id) {     
    activeConversationId = id;     
    const chat = conversations.find(c => c.id === id);
    if (chat && chat.status === 'completed') {
        chat.status = 'none';
    }
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
        renderConversationSidebar();     } 
}

function renderConversationSidebar() {     
    chatsContainer.innerHTML = '';     
    conversations.forEach(c => {         
        const isActive = c.id === activeConversationId;         
        const item = document.createElement('div');         
        item.className = `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${             
            isActive ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-500 hover:bg-neutral-50'         }`;                  
        
        let statusDot = '';
        if (c.status === 'processing') {
            statusDot = `<span class="w-2 h-2 rounded-full bg-orange-500 shrink-0 inline-block ml-1"></span>`;
        } else if (c.status === 'completed' && !isActive) {
            statusDot = `<span class="w-2 h-2 rounded-full bg-green-500 shrink-0 inline-block ml-1"></span>`;
        }

        item.innerHTML = `             
            <div class="flex items-center gap-2 truncate max-w-[75%]">                 
                <span class="truncate" title="${c.title}">${c.title}</span>             
                ${statusDot}
            </div>             
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">                 
                <button class="btn-rename text-neutral-400 hover:text-black p-1 rounded" title="Renombrar">                     
                    e                 
                </button>                 
                <button class="btn-delete text-neutral-400 hover:text-black p-1 rounded" title="Eliminar">                     
                    x                 
                </button>             
            </div>         `;         
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
            <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-xl mx-auto my-auto">                 
                <div class="space-y-1">                     
                    <h3 class="text-xl font-bold tracking-tight text-black font-mono">Te damos la bienvenida a Silenos Chat</h3>                     
                    <p class="text-sm text-black leading-relaxed">Selecciona un modelo y el modo arriba a la izquierda.</p>                 
                </div>             
            </div>         `;     
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
        });     }     
    fileUploader.value = '';     
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
        item.className = "flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 px-3 py-1.5 rounded-lg text-xs font-mono text-black max-w-[200px] shrink-0";                  
        item.innerHTML = `             
            <span class="truncate flex-1" title="${file.name}">${file.name}</span>             
            <button class="btn-remove hover:text-black transition-colors ml-1 cursor-pointer">                 
                x             
            </button>         `;         
        item.querySelector('.btn-remove').addEventListener('click', () => {             
            currentBufferAttachments = currentBufferAttachments.filter(f => f.id !== file.id);             
            renderAttachmentPreviews();         
        });         
        attachmentPreviewArea.appendChild(item);     
    }); 
}

function buildModelDropdown() {     
    dropdownOptions.innerHTML = '';          
    const modelosDeEsteModo = appMode === 'chat' ? listadoModelosTexto : MODELOS_IMAGEN;     
    const favoritosActivos = appMode === 'chat' ? favoritosText : favoritosImage;          
    
    const ordenados = [...modelosDeEsteModo].sort((a, b) => {         
        const isAFav = favoritosActivos.includes(a.tag);         
        const isBFav = favoritosActivos.includes(b.tag);         
        if (isAFav && !isBFav) return -1;         
        if (!isAFav && isBFav) return 1;         
        return 0;     
    });          
    
    ordenados.forEach((m) => {         
        const isFav = favoritosActivos.includes(m.tag);         
        const row = document.createElement('div');         
        row.className = "px-4 py-2.5 cursor-pointer hover:bg-neutral-100 text-black transition-colors truncate flex justify-between items-center";                  
        const providerBadge = m.provider ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-neutral-200 text-black uppercase font-bold tracking-wider mr-2">${m.provider}</span>` : '';                  
        
        // --- CÁLCULO DINÁMICO DE COSTES Y PREMIUM ---
        let badgeCoste = '';
        const lowerName = m.name.toLowerCase();
        const lowerTag = m.tag.toLowerCase();
        
        if (appMode === 'chat') {
            if (m.provider === 'ollama') {
                badgeCoste = `<span class="text-[9px] px-1 bg-green-50 text-green-700 rounded font-bold border border-green-200">LOCAL (FREE)</span>`;
            } else if (m.provider === 'gemini') {
                if (lowerTag.includes('flash-lite') || lowerTag.includes('2.5')) {
                    badgeCoste = `<span class="text-[9px] px-1 bg-blue-50 text-blue-600 rounded font-mono font-medium">$0.0001/1K</span>`;
                } else if (lowerTag.includes('flash')) {
                    badgeCoste = `<span class="text-[9px] px-1 bg-blue-50 text-blue-600 rounded font-mono font-medium">$0.0003/1K</span>`;
                } else {
                    badgeCoste = `<span class="text-[9px] px-1 bg-purple-50 text-purple-600 rounded font-bold border border-purple-200">PREMIUM</span>`;
                }
            } else if (m.provider === 'pollinations') {
                if (lowerName.includes('free') || lowerTag.includes('free')) {
                    badgeCoste = `<span class="text-[9px] px-1 bg-green-50 text-green-600 rounded font-bold">FREE</span>`;
                } else {
                    badgeCoste = `<span class="text-[9px] px-1 bg-purple-50 text-purple-600 rounded font-bold border border-purple-200">PREMIUM</span>`;
                }
            }
        } else {
            // Catálogo de imágenes (Generativo)
            if (lowerName.includes('free') || lowerTag.includes('free')) {
                badgeCoste = `<span class="text-[9px] px-1 bg-green-50 text-green-600 rounded font-bold">FREE</span>`;
            } else {
                badgeCoste = `<span class="text-[9px] px-1 bg-purple-50 text-purple-600 rounded font-bold border border-purple-200">PREMIUM</span>`;
            }
        }

        row.innerHTML = `             
            <div class="flex items-center truncate pr-2">                 
                ${providerBadge}                 
                <span class="truncate">${m.name}</span>             
            </div>             
            <div class="flex items-center gap-3 shrink-0">
                ${badgeCoste}
                <button class="btn-fav text-neutral-400 hover:text-black transition-colors p-1">                 
                    ${isFav ? '★' : '☆'}             
                </button>         
            </div>`;                  
        
        row.addEventListener('click', (e) => {             
            if (e.target.closest('.btn-fav')) return;             
            const realIndex = modelosDeEsteModo.findIndex(original => original.tag === m.tag);             
            selectModel(realIndex !== -1 ? realIndex : 0);             
            closeDropdown();         
        });                  
        row.querySelector('.btn-fav').addEventListener('click', (e) => {             
            e.stopPropagation();             
            toggleFavorite(m.tag);         
        });         
        dropdownOptions.appendChild(row);     
    });          
    
    const targetIdx = appMode === 'chat' ? activeModelIndex : activeImageModelIndex;     
    if (modelosDeEsteModo[targetIdx]) {         
        selectModel(targetIdx);     
    } else {         
        selectModel(0);     
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
    buildModelDropdown(); 
}

function selectModel(index) {     
    if (appMode === 'chat') {         
        activeModelIndex = index;         
        if (listadoModelosTexto[index]) {             
            selectedModelText.textContent = `${listadoModelosTexto[index].name} (${listadoModelosTexto[index].provider.toUpperCase()})`;         
        }     
    } else {         
        activeImageModelIndex = index;         
        localStorage.setItem('hub_active_image_model_index', index);         
        if (MODELOS_IMAGEN[index]) {             
            selectedModelText.textContent = `${MODELOS_IMAGEN[index].name} (GENERATIVO)`;         
        }     
    } 
}

dropdownTrigger.addEventListener('click', (e) => {     
    e.stopPropagation();     
    dropdownMenu.classList.toggle('hidden'); 
});

function closeDropdown() {     
    dropdownMenu.classList.add('hidden'); 
}

document.addEventListener('click', (e) => {     
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) closeDropdown(); 
});

async function handleSend() {     
    const promptText = userInput.value.trim();     
    const hasAttachments = currentBufferAttachments.length > 0;          
    if (!promptText && !hasAttachments) return;          
    const activeModel = appMode === 'chat' ? listadoModelosTexto[activeModelIndex] : MODELOS_IMAGEN[activeImageModelIndex];     
    if (!activeModel) return;          
    
    userInput.value = '';     
    
    const thisTurnAttachments = [...currentBufferAttachments];     
    currentBufferAttachments = [];     
    renderAttachmentPreviews();          
    
    const targetConversationId = activeConversationId;
    const currentChat = conversations.find(c => c.id === targetConversationId);     
    if (currentChat) {         
        currentChat.messages.push({             
            role: 'usuario',             
            content: promptText || "[Archivos Adjuntos]",             
            modelName: 'T'         
        });         
        currentChat.status = 'processing';
        if (currentChat.title === "Nueva Conversación") {                 
            currentChat.title = promptText.substring(0, 24) || "Hilo Activo";                 
        }
        saveConversations();     
        renderConversationSidebar();
    }          
    
    if (targetConversationId === activeConversationId) {
        appendChatMessageToDOM("usuario", promptText || "[Archivos Adjuntos]");     
        appendWaitingMessage(activeModel.name, targetConversationId);          
    }
    
    // Ejecución asíncrona desacoplada para permitir paralelismo multi-hilo
    (async () => {
        try {         
            let responseText = "";         
            let generatedImageUrl = "";                  
            if (appMode === 'image') {             
                const pollinationsKey = apiKeyPollinationsInput.value.trim();             
                
                // Obtener el formato de aspecto seleccionado de manera minimalista
                const selectedAspectInput = document.querySelector('input[name="aspect-ratio"]:checked');
                const aspectValue = selectedAspectInput ? selectedAspectInput.value : '1:1';
                
                generatedImageUrl = await queryImageGeneration(promptText, activeModel.tag, pollinationsKey, thisTurnAttachments, aspectValue);             
                responseText = `He generado con éxito la imagen utilizando el modelo **${activeModel.name}** con el prompt:\n\n*"${promptText}"*`;         
            } else {             
                const historyPayload = getChatPayload(targetConversationId);             
                if (activeModel.provider === 'pollinations') {                 
                    responseText = await queryPollinations(historyPayload, activeModel.tag, apiKeyPollinationsInput.value.trim(), thisTurnAttachments);             
                } else if (activeModel.provider === 'gemini') {                 
                    responseText = await queryGemini(historyPayload, activeModel.tag, apiKeyGeminiInput.value.trim(), thisTurnAttachments);             
                } else if (activeModel.provider === 'ollama') {                 
                    responseText = await queryOllama(historyPayload, activeModel.tag, endpointOllamaInput.value.trim(), thisTurnAttachments);             
                }         
            }                  
            
            const chatAlFinalizar = conversations.find(c => c.id === targetConversationId);
            if (chatAlFinalizar) {             
                const newMsg = {                 
                    role: 'asistente',                 
                    content: responseText,                 
                    modelName: activeModel.name             
                };             
                if (generatedImageUrl) {                 
                    newMsg.imageUrl = generatedImageUrl;             
                }             
                chatAlFinalizar.messages.push(newMsg);                          
                chatAlFinalizar.status = (targetConversationId === activeConversationId) ? 'none' : 'completed';
                saveConversations();         
            }         

            if (targetConversationId === activeConversationId) {
                const waitingNode = document.querySelector(`[data-waiting-chat="${targetConversationId}"]`);
                if (waitingNode) waitingNode.remove();
                appendChatMessageToDOM("asistente", responseText, activeModel.name, true, generatedImageUrl);     
            } else {
                renderConversationSidebar();
            }
        } catch (err) {         
            if (targetConversationId === activeConversationId) {
                const waitingNode = document.querySelector(`[data-waiting-chat="${targetConversationId}"]`);
                if (waitingNode) waitingNode.remove();
                appendChatMessageToDOM("sistema-error", `Pipeline interrumpido: ${err.message}`);     
            }
            const chatConError = conversations.find(c => c.id === targetConversationId);
            if (chatConError) {
                chatConError.status = 'none';
                saveConversations();
                renderConversationSidebar();
            }
        } finally {         
            if (targetConversationId === activeConversationId) {
                userInput.focus();         
                chatHistory.scrollTop = chatHistory.scrollHeight;     
            }
        } 
    })();
}

function getChatPayload(chatId) {     
    const currentChat = conversations.find(c => c.id === chatId);     
    if (!currentChat) return [];     
    return currentChat.messages.map(m => ({         
        role: m.role === 'usuario' ? 'user' : 'assistant',         
        content: m.content     })); 
}

function formatModelOutput(text) {     
    if (!text) return '';     
    return text.replace(/<think>/gi, '<div class="think-block"><div class="think-header">Razonamiento Interno</div>')                .replace(/<\/think>/gi, '</div>'); 
}

// Mantiene el código original para añadir mensajes al DOM con soporte SVG
function appendChatMessageToDOM(role, text, modelName = "", autoScroll = true, imageUrl = "") {     
    const messageId = `msg-${Date.now()}`;     
    const card = document.createElement('div');     
    card.id = messageId;     
    card.className = "chat-card max-w-3xl mx-auto flex gap-4 items-start p-2 rounded-2xl transition-all text-black";     
    let icon = "";     
    let title = "";          
    
    if (role === 'usuario') {         
        icon = `<div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 text-black">U</div>`;         
        title = `<p class="text-xs text-black font-bold uppercase tracking-wider font-mono">TÚ</p>`;     
    } else if (role === 'asistente') {         
        icon = `<div class="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center shrink-0 text-white">AI</div>`;         
        title = `<p class="text-xs text-black font-bold uppercase tracking-wider font-mono">${modelName}</p>`;     
    } else {         
        icon = `<div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">!</div>`;         
        title = `<p class="text-xs text-red-600 font-bold uppercase tracking-wider font-mono">Error de Red</p>`;     
    }          
    
    const tempDiv = document.createElement('div');     
    tempDiv.innerHTML = icon.trim();     
    const iconNode = tempDiv.firstChild;          
    
    const container = document.createElement('div');     
    container.className = "space-y-1.5 flex-1 overflow-hidden pt-1 text-black";     
    container.innerHTML = title;          
    
    const textParagraph = document.createElement('div');     
    textParagraph.className = "msg-content text-sm text-black leading-relaxed whitespace-pre-wrap break-words font-normal";     
    textParagraph.innerHTML = formatModelOutput(text);     
    container.appendChild(textParagraph);          
    
    if (imageUrl) {         
        const imgContainer = document.createElement('div');         
        imgContainer.className = "mt-4 border border-neutral-200 bg-white rounded-2xl overflow-hidden p-4 space-y-3 max-w-lg";         
        imgContainer.innerHTML = `             
            <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2">                 
                <span class="text-[10px] font-bold text-black font-mono uppercase tracking-wider">Imagen Generada</span>                 
                <a href="${imageUrl}" download="generacion_${messageId}.png" class="btn-down text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all flex items-center gap-1 cursor-pointer">                     
                    Descargar Imagen                 
                </a>             
            </div>             
            <div class="flex items-center justify-center max-w-full rounded-lg overflow-hidden bg-neutral-50">                 
                <img src="${imageUrl}" class="w-full h-auto max-h-[512px] object-contain rounded" alt="Imagen Generada" />             
            </div>         `;         
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

function appendWaitingMessage(modelName, chatId) {     
    const waitingId = `wait-${Date.now()}`;     
    const card = document.createElement('div');     
    card.id = waitingId;     
    card.setAttribute('data-waiting-chat', chatId);
    card.className = "max-w-3xl mx-auto flex gap-4 items-start p-2 rounded-2xl text-black";     
    card.innerHTML = `         
        <div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">             
            ...         
        </div>         
        <div class="space-y-1 flex-1 pt-1 text-black">             
            <p class="text-xs text-black font-bold uppercase tracking-wider font-mono">${modelName}</p>             
            <div class="flex items-center gap-1.5 text-xs text-black font-mono">                 
                <span>Generando respuesta...</span>             
            </div>         </div>     `;     
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
            previewBox.className = "mt-4 border border-neutral-200 bg-white rounded-2xl overflow-hidden p-4 space-y-3 text-black";             
            previewBox.innerHTML = `                 
                <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2">                     
                    <span class="text-[10px] font-bold text-black font-mono uppercase tracking-wider">Previsualización Vectorial SVG #${idx + 1}</span>                     
                    <button class="btn-down text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all flex items-center gap-1 cursor-pointer">                         
                        Descargar SVG                     
                    </button>                 
                </div>                 
                <div class="bg-transparent flex items-center justify-center max-w-full overflow-auto min-h-[150px] p-2 rounded-lg">                     
                    ${svgStr.trim()}                 
                </div>             `;             
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
        });     } 
}

btnSend.addEventListener('click', handleSend); 
userInput.addEventListener('keydown', (e) => {     
    if (e.key === 'Enter' && !e.shiftKey) {         
        e.preventDefault();         
        handleSend();     
    } 
});