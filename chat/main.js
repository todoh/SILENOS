/**
 * Controlador General de Eventos e Interacciones del Panel CORE-AI (Ligero y Refactorizado)
 */
import { queryPollinations } from './pollinations.js'; 
import { queryGemini } from './gemini.js'; 
import { queryOllama, fetchOllamaModels } from './ollama.js'; 
import { fetchDynamicPollinationsTextModels, MODELOS_POLLINATIONS, MODELOS_GEMINI } from './modelos.js'; 
import { fetchDynamicPollinationsImageModels, MODELOS_IMAGEN, queryImageGeneration } from './imagenes.js'; 
import { iniciarSesionPollinations, procesarRetornoAutenticacion } from './login.js'; 
import { runAgentPipeline } from './agente.js';
import {
    activeConversationId, currentBufferAttachments, favoritosText, favoritosImage, agentTools, conversations,
    loadSavedSettings, loadFavorites, loadAgentTools, loadConversations, createNewConversation, saveConversations, 
    getChatPayload, setFavoritosText, setFavoritosImage, saveFavorites
} from './conversations.js';
import {
    renderAgentToolsListUI, renderConversationSidebarUI, renderActiveConversationUI, renderAttachmentPreviewsUI,
    buildModelDropdownUI, appendChatMessageToDOMUI, appendWaitingMessageUI
} from './ui.js';

// --- INICIALIZACI N DEL SISTEMA DE CANVAS --- 
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
let appMode = 'chat'; 
let listadoModelosTexto = []; 
let activeModelIndex = 0; 
let activeImageModelIndex = 0; 

// Referencias DOM Base 
const dropdownTrigger = document.getElementById('dropdown-trigger'); 
const dropdownMenu = document.getElementById('dropdown-menu'); 
const dropdownOptions = document.getElementById('dropdown-options'); 
const selectedModelText = document.getElementById('selected-model-text'); 
const chatHistory = document.getElementById('chat-history'); 
const userInput = document.getElementById('user-input'); 
const btnSend = document.getElementById('btn-send'); 

// Herramienta de Crear Imagen e Interfaz de Agente
const btnToolImage = document.getElementById('btn-tool-image'); 
const btnToolAgent = document.getElementById('btn-tool-agent');
const imageAspectSelector = document.getElementById('image-aspect-ratio-selector');
const agentConfigBar = document.getElementById('agent-config-bar');
const selectAgentFastModel = document.getElementById('select-agent-fast-model');
const selectAgentStrongLimit = document.getElementById('select-agent-strong-limit');
const selectAgentFastLimit = document.getElementById('select-agent-fast-limit');

// Referencias de Gesti n de Conversaciones 
const btnNewChat = document.getElementById('btn-new-chat'); 
const chatsContainer = document.getElementById('chats-container'); 

// Referencias de Carga de Archivos 
const btnAttach = document.getElementById('btn-attach'); 
const fileUploader = document.getElementById('file-uploader'); 
const attachmentPreviewArea = document.getElementById('attachment-preview-area'); 

// Referencias DOM Sistema de Modales Integrado (Ajustes)
const modalSettings = document.getElementById('modal-settings'); 
const btnOpenSettings = document.getElementById('btn-open-settings'); 
const btnCloseModal = document.getElementById('btn-close-modal'); 
const btnSaveSettings = document.getElementById('btn-save-settings'); 

// Inputs de Configuraci n del Modal y Bot n de Login BYOP 
const apiKeyPollinationsInput = document.getElementById('api-key-pollinations'); 
const btnLoginPollinations = document.getElementById('btn-login-pollinations'); 
const apiKeyGeminiInput = document.getElementById('api-key-gemini'); 
const endpointOllamaInput = document.getElementById('endpoint-ollama'); 

// Referencias DOM Sistema de Herramientas del Agente
const modalTools = document.getElementById('modal-tools');
const btnOpenTools = document.getElementById('btn-open-tools');
const btnCloseTools = document.getElementById('btn-close-tools');
const btnAddTool = document.getElementById('btn-add-tool');
const toolNewName = document.getElementById('tool-new-name');
const toolNewDesc = document.getElementById('tool-new-desc');
const toolsListContainer = document.getElementById('tools-list-container');

// Cargar persistencia al arrancar 
window.addEventListener('load', async () => {
    initCanvasSystem();
    
    const tokenAutenticado = procesarRetornoAutenticacion();
    if (tokenAutenticado) {
        console.log("Sesi n de Pollinations BYOP iniciada de forma exitosa.");
    }
    
    loadSavedSettings(apiKeyPollinationsInput, apiKeyGeminiInput, endpointOllamaInput);
    loadConversations(renderSidebar, renderActive);
    loadFavorites();
    loadAgentTools(() => renderAgentToolsListUI(toolsListContainer));

    await fetchDynamicPollinationsTextModels();
    await fetchDynamicPollinationsImageModels();
    await buildUnifiedTextModels();
    
    initModeHandlers(); 
    initAspectLabelsHandler();
    initToolsModalHandlers();
});

function renderSidebar() {
    renderConversationSidebarUI(chatsContainer, renderSidebar, renderActive);
}

function renderActive() {
    renderActiveConversationUI(chatHistory);
}

async function buildUnifiedTextModels() {
    listadoModelosTexto = [];
    
    MODELOS_GEMINI.forEach(m => {
        listadoModelosTexto.push({ ...m, provider: 'gemini' });
    });
    
    MODELOS_POLLINATIONS.forEach(m => {
        listadoModelosTexto.push({ ...m, provider: 'pollinations' });
    });
    
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
    
    if (appMode === 'chat' || appMode === 'agent') {
        buildModelDropdown();
    } 
    populateAgentFastModels();
}

function populateAgentFastModels() {
    if (!selectAgentFastModel) return;
    selectAgentFastModel.innerHTML = '';
    
    listadoModelosTexto.forEach(m => {
        const option = document.createElement('option');
        option.value = m.tag;
        option.textContent = `${m.name} (${m.provider.toUpperCase()})`;
        if (m.tag.includes('flash-lite') || m.tag.includes('8b') || m.tag.includes('llama-3.1-8b')) {
            option.selected = true;
        }
        selectAgentFastModel.appendChild(option);
    });
}

function initModeHandlers() {
    btnToolImage.addEventListener('click', () => {
        if (appMode === 'image') {
            setAppMode('chat');
        } else {
            setAppMode('image');
        }
    });

    btnToolAgent.addEventListener('click', () => {
        if (appMode === 'agent') {
            setAppMode('chat');
        } else {
            setAppMode('agent');
        }
    });
}

function setAppMode(mode) {
    appMode = mode;
    btnToolImage.className = "text-xs font-semibold text-neutral-400 hover:text-black transition-colors cursor-pointer";
    btnToolAgent.className = "text-xs font-semibold text-neutral-400 hover:text-black transition-colors cursor-pointer";
    imageAspectSelector.classList.add('hidden');
    agentConfigBar.classList.add('hidden');

    if (mode === 'chat') {
        userInput.placeholder = "Escribe tu consulta aqu ...";
        buildModelDropdown();
    } else if (mode === 'image') {
        btnToolImage.className = "text-xs font-bold text-black transition-all cursor-pointer";
        userInput.placeholder = "Describe detalladamente la imagen que deseas generar...";
        imageAspectSelector.classList.remove('hidden');
        if (activeImageModelIndex >= MODELOS_IMAGEN.length) {
            activeImageModelIndex = 0;
        }
        buildModelDropdown();
    } else if (mode === 'agent') {
        btnToolAgent.className = "text-xs font-bold text-black transition-all cursor-pointer";
        userInput.placeholder = "Indica la tarea compleja u objetivo para que el Agente Orquestador la resuelva...";
        agentConfigBar.classList.remove('hidden');
        buildModelDropdown();
    }
}

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

function initToolsModalHandlers() {
    btnOpenTools.addEventListener('click', () => modalTools.classList.remove('hidden'));
    btnCloseTools.addEventListener('click', () => modalTools.classList.add('hidden'));
    modalTools.addEventListener('click', (e) => { if (e.target === modalTools) modalTools.classList.add('hidden'); });
    
    btnAddTool.addEventListener('click', () => {
        const name = toolNewName.value.trim().toLowerCase().replace(/\s+/g, '_');
        const desc = toolNewDesc.value.trim();
        if (!name || !desc) return;
        
        // CORRECCIÓN: Se le añade una estructura de código ejecutable por defecto para que compile al guardarse manualmente
        const defaultJsCode = `function execute(args) {\n  // Escribe tu lógica personalizada aquí\n  return "Herramienta ${name} ejecutada correctamente";\n}`;
        
        agentTools.push({
            id: `tool-${Date.now()}`,
            name: name,
            desc: desc,
            javascript_code: defaultJsCode
        });
        
        localStorage.setItem('hub_agent_tools', JSON.stringify(agentTools));
        renderAgentToolsListUI(toolsListContainer);
        
        toolNewName.value = '';
        toolNewDesc.value = '';
    });
}

btnOpenSettings.addEventListener('click', () => {
    modalSettings.classList.remove('hidden');
});

function hideModal() {
    modalSettings.classList.add('hidden');
}

btnCloseModal.addEventListener('click', hideModal);

btnLoginPollinations.addEventListener('click', () => {
    const customClientId = apiKeyPollinationsInput.value.trim();
    iniciarSesionPollinations(customClientId);
});

btnSaveSettings.addEventListener('click', async () => {
    localStorage.setItem('hub_key_pollinations', apiKeyPollinationsInput.value.trim());
    localStorage.setItem('hub_key_gemini', apiKeyGeminiInput.value.trim());
    localStorage.setItem('hub_endpoint_ollama', endpointOllamaInput.value.trim());
    hideModal();
    
    await fetchDynamicPollinationsTextModels();
    await fetchDynamicPollinationsImageModels();
    await buildUnifiedTextModels();
});

modalSettings.addEventListener('click', (e) => {
    if (e.target === modalSettings) hideModal();
});

function buildModelDropdown() {
    buildModelDropdownUI(
        appMode, listadoModelosTexto, MODELOS_IMAGEN, activeModelIndex, activeImageModelIndex, 
        dropdownOptions, dropdownMenu, selectModel, toggleFavorite
    );
}

function selectModel(index) {
    if (appMode === 'chat' || appMode === 'agent') {
        activeModelIndex = index;
        if (listadoModelosTexto[index]) {
            const rolAgenteLabel = appMode === 'agent' ? ' (FUERTE / ORQUESTADOR)' : '';
            selectedModelText.textContent = `${listadoModelosTexto[index].name} (${listadoModelosTexto[index].provider.toUpperCase()})${rolAgenteLabel}`;
        }
    } else {
        activeImageModelIndex = index;
        localStorage.setItem('hub_active_image_model_index', index);
        if (MODELOS_IMAGEN[index]) {
            selectedModelText.textContent = `${MODELOS_IMAGEN[index].name} (GENERATIVO)`;
        }
    }
}

function toggleFavorite(tag) {
    if (appMode === 'chat' || appMode === 'agent') {
        if (favoritosText.includes(tag)) {
            setFavoritosText(favoritosText.filter(f => f !== tag));
        } else {
            favoritosText.push(tag);
        }
    } else {
        if (favoritosImage.includes(tag)) {
            setFavoritosImage(favoritosImage.filter(f => f !== tag));
        } else {
            favoritosImage.push(tag);
        }
    }
    saveFavorites(appMode);
    buildModelDropdown();
}

dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    if (!dropdownTrigger.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add('hidden');
    }
});

btnNewChat.addEventListener('click', () => createNewConversation("Nueva Conversaci n", renderSidebar, renderActive));

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
    fileUploader.value = '';
    renderAttachmentPreviewsUI(attachmentPreviewArea);
});

async function handleSend() {
    const promptText = userInput.value.trim();
    const hasAttachments = currentBufferAttachments.length > 0;
    
    if (!promptText && !hasAttachments) return;
    
    const activeModel = (appMode === 'chat' || appMode === 'agent') ? listadoModelosTexto[activeModelIndex] : MODELOS_IMAGEN[activeImageModelIndex];
    if (!activeModel) return;
    
    userInput.value = '';
    
    const thisTurnAttachments = [...currentBufferAttachments];
    currentBufferAttachments.length = 0;
    renderAttachmentPreviewsUI(attachmentPreviewArea);
    
    const targetConversationId = activeConversationId;
    const currentChat = conversations.find(c => c.id === targetConversationId);
    if (currentChat) {
        currentChat.messages.push({
            role: 'usuario',
            content: promptText || "[Archivos Adjuntos]",
            modelName: 'T'
        });
        currentChat.status = 'processing';
        if (currentChat.title === "Nueva Conversaci n") {
            currentChat.title = promptText.substring(0, 24) || "Hilo Activo";
        }
        saveConversations();
        renderSidebar();
    }
    
    let waitingNodeId = "";
    if (targetConversationId === activeConversationId) {
        appendChatMessageToDOMUI(chatHistory, "usuario", promptText || "[Archivos Adjuntos]");
        waitingNodeId = appendWaitingMessageUI(chatHistory, activeModel.name, targetConversationId);
    }
    
    (async () => {
        try {
            let responseText = "";
            let generatedImageUrl = "";
            
            if (appMode === 'image') {
                const pollinationsKey = apiKeyPollinationsInput.value.trim();
                const selectedAspectInput = document.querySelector('input[name="aspect-ratio"]:checked');
                const aspectValue = selectedAspectInput ? selectedAspectInput.value : '1:1';
                
                generatedImageUrl = await queryImageGeneration(promptText, activeModel.tag, pollinationsKey, thisTurnAttachments, aspectValue);
                responseText = `He generado con  xito la imagen utilizando el modelo **${activeModel.name}** con el prompt:\n\n*"${promptText}"*`;
            } 
            else if (appMode === 'agent') {
                const configKeys = {
                    gemini: apiKeyGeminiInput.value.trim(),
                    pollinations: apiKeyPollinationsInput.value.trim(),
                    ollamaEndpoint: endpointOllamaInput.value.trim()
                };
                const agentLimits = {
                    maxStrong: selectAgentStrongLimit.value,
                    maxFast: selectAgentFastLimit.value
                };
                const fastModelTag = selectAgentFastModel.value;
                const fastModel = listadoModelosTexto.find(m => m.tag === fastModelTag) || activeModel;
                const historyPayload = getChatPayload(targetConversationId);
                
                responseText = await runAgentPipeline(
                    historyPayload,
                    activeModel,
                    fastModel,
                    configKeys,
                    agentLimits,
                    waitingNodeId,
                    thisTurnAttachments
                );
            } 
            else {
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
                    modelName: appMode === 'agent' ? `${activeModel.name} (AGENTE)` : activeModel.name
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
                appendChatMessageToDOMUI(chatHistory, "asistente", responseText, appMode === 'agent' ? `${activeModel.name} (AGENTE)` : activeModel.name, true, generatedImageUrl);
            } else {
                renderSidebar();
            }
        } catch (err) {
            if (targetConversationId === activeConversationId) {
                const waitingNode = document.querySelector(`[data-waiting-chat="${targetConversationId}"]`);
                if (waitingNode) waitingNode.remove();
                appendChatMessageToDOMUI(chatHistory, "sistema-error", `Pipeline interrumpido: ${err.message}`);
            }
            const chatConError = conversations.find(c => c.id === targetConversationId);
            if (chatConError) {
                chatConError.status = 'none';
                saveConversations();
                renderSidebar();
            }
        } finally {
            if (targetConversationId === activeConversationId) {
                userInput.focus();
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
        }
    })();
}

btnSend.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});