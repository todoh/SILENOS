// main.js
// Controlador General de Eventos e Interacciones del Panel CORE-AI
import { queryPollinations } from './pollinations.js';
import { queryGemini } from './gemini.js';
import { queryOllama, fetchOllamaModels } from './ollama.js';
import { fetchDynamicPollinationsTextModels, MODELOS_POLLINATIONS, MODELOS_GEMINI } from './modelos.js';
import { fetchDynamicPollinationsImageModels, MODELOS_IMAGEN, queryImageGeneration } from './imagenes.js';
import { iniciarSesionPollinations, procesarRetornoAutenticacion } from './login.js';
import { runAgentPipeline, requestAgentPause } from './agente.js';
import { filterLibraryWithFlashLite } from './agent_helpers.js';
import { 
    activeConversationId, currentBufferAttachments, favoritosText, favoritosImage, conversations,
    saveConversations, createNewConversation, getChatPayload, setFavoritosText, setFavoritosImage,
    saveFavorites, directoryHandle, saveSettingsToFolder 
} from './conversations.js';
import { 
    renderAgentToolsListUI, renderConversationSidebarUI, renderActiveConversationUI,
    renderAttachmentPreviewsUI, buildModelDropdownUI, appendChatMessageToDOMUI,
    appendWaitingMessageUI, formatModelOutput 
} from './ui.js';
import { injectReferencedLibraryFunctions } from './mode_html.js';
import { 
    state, setAppMode, setWithFunctionsMode, setListadoModelosTexto,
    setActiveModelIndex, setActiveImageModelIndex, getCombinedFunctionLibrary 
} from './app_state.js';
import { 
    syncWorkspaceFolder, checkAndDisplayCheckpointBanner, initToolsModalHandlers,
    initFunctionsModalHandlers, initGalleryModalHandlers, initStatsModalHandlers 
} from './app_modals.js';

import { runModoFXAgent } from './mode_fx_agent.js';
import { classifyTaskMode } from './mode_classifier.js';
import { runModoEscritura } from './mode_escritura.js';
import { runModoHTML } from './mode_html.js';
import { runModoInvestigacion } from './mode_investigacion.js';
import { runModoLibre } from './mode_libre.js';

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

const dropdownTrigger = document.getElementById('dropdown-trigger');
const dropdownMenu = document.getElementById('dropdown-menu');
const dropdownOptions = document.getElementById('dropdown-options');
const selectedModelText = document.getElementById('selected-model-text');
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const btnSend = document.getElementById('btn-send');
const btnToolImage = document.getElementById('btn-tool-image');
const btnToolAgent = document.getElementById('btn-tool-agent');
const imageAspectSelector = document.getElementById('image-aspect-ratio-selector');
const agentConfigBar = document.getElementById('agent-config-bar');
const selectAgentFastModel = document.getElementById('select-agent-fast-model');
const selectAgentStrongLimit = document.getElementById('select-agent-strong-limit');
const selectAgentFastLimit = document.getElementById('select-agent-fast-limit');
const btnNewChat = document.getElementById('btn-new-chat');
const chatsContainer = document.getElementById('chats-container');
const btnAttach = document.getElementById('btn-attach');
const btnToggleFnMode = document.getElementById('btn-toggle-fn-mode');
const fileUploader = document.getElementById('file-uploader');
const attachmentPreviewArea = document.getElementById('attachment-preview-area');
const modalFolderRequired = document.getElementById('modal-folder-required');
const btnModalSelectFolder = document.getElementById('btn-modal-select-folder');
const btnLoadFolder = document.getElementById('btn-load-folder');
const folderBtnLabel = document.getElementById('folder-btn-label');
const modalSettings = document.getElementById('modal-settings');
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnSaveSettings = document.getElementById('btn-save-settings');
const btnOpenGallery = document.getElementById('btn-open-gallery');
const modalGallery = document.getElementById('modal-gallery');
const btnCloseGallery = document.getElementById('btn-close-gallery');
const galleryGrid = document.getElementById('gallery-grid');
const apiKeyPollinationsInput = document.getElementById('api-key-pollinations');
const btnLoginPollinations = document.getElementById('btn-login-pollinations');
const apiKeyGeminiInput = document.getElementById('api-key-gemini');
const endpointOllamaInput = document.getElementById('endpoint-ollama');
const modalTools = document.getElementById('modal-tools');
const btnOpenTools = document.getElementById('btn-open-tools');
const btnCloseTools = document.getElementById('btn-close-tools');
const btnAddTool = document.getElementById('btn-add-tool');
const toolNewName = document.getElementById('tool-new-name');
const toolNewDesc = document.getElementById('tool-new-desc');
const toolsListContainer = document.getElementById('tools-list-container');
const modalFunctions = document.getElementById('modal-functions');
const btnOpenFunctions = document.getElementById('btn-open-functions');
const btnCloseFunctions = document.getElementById('btn-close-functions');
const btnAddFunction = document.getElementById('btn-add-function');
const fnNewName = document.getElementById('fn-new-name');
const fnNewDesc = document.getElementById('fn-new-desc');
const functionsListContainer = document.getElementById('functions-list-container');
const btnOpenStats = document.getElementById('btn-open-stats');
const modalStats = document.getElementById('modal-stats');
const btnCloseStats = document.getElementById('btn-close-stats');
const statsContainer = document.getElementById('stats-container');

function triggerWorkspaceSync() {
    syncWorkspaceFolder(
        {
            folderBtnLabel, modalFolderRequired, apiKeyPollinationsInput, 
            apiKeyGeminiInput, endpointOllamaInput, toolsListContainer, 
            functionsListContainer, chatHistory
        },
        {
            renderSidebar, renderActive, buildUnifiedTextModels, handleSend
        }
    );
}

window.addEventListener('load', async () => {
    initCanvasSystem();
    
    const tokenAutenticado = procesarRetornoAutenticacion();
    if (tokenAutenticado) {
        console.log("Sesión de Pollinations BYOP iniciada de forma exitosa.");
    }
    
    await fetchDynamicPollinationsTextModels();
    await fetchDynamicPollinationsImageModels();
    
    initModeHandlers();
    initAspectLabelsHandler();
    initToolsModalHandlers(btnOpenTools, btnCloseTools, modalTools, btnAddTool, toolNewName, toolNewDesc, toolsListContainer);
    initFunctionsModalHandlers(btnOpenFunctions, btnCloseFunctions, modalFunctions, btnAddFunction, fnNewName, fnNewDesc, functionsListContainer);
    initGalleryModalHandlers(btnOpenGallery, btnCloseGallery, modalGallery, galleryGrid, modalFolderRequired);
    initStatsModalHandlers(btnOpenStats, btnCloseStats, modalStats, statsContainer);
    initFnToggleHandler();
    
    btnModalSelectFolder.addEventListener('click', triggerWorkspaceSync);
    btnLoadFolder.addEventListener('click', triggerWorkspaceSync);
});

function initFnToggleHandler() {
    if (!btnToggleFnMode) return;
    btnToggleFnMode.addEventListener('click', () => {
        setWithFunctionsMode(!state.withFunctionsMode);
        if (state.withFunctionsMode) {
            btnToggleFnMode.textContent = "fx: on";
            btnToggleFnMode.className = "text-[10px] font-mono border border-black bg-black text-white px-2 py-0.5 rounded transition-all cursor-pointer font-bold";
        } else {
            btnToggleFnMode.textContent = "fx: off";
            btnToggleFnMode.className = "text-[10px] font-mono border border-neutral-200 text-neutral-400 hover:text-black px-2 py-0.5 rounded transition-all cursor-pointer bg-transparent";
        }
    });
}

function renderSidebar() {
    renderConversationSidebarUI(chatsContainer, renderSidebar, renderActive);
}

function renderActive() {
    renderActiveConversationUI(chatHistory);
    checkAndDisplayCheckpointBanner(chatHistory, handleSend);
}

async function buildUnifiedTextModels() {
    const listado = [];
    
    MODELOS_GEMINI.forEach(m => {
        if (!m.isImageModel) {
            listado.push({ ...m, provider: 'gemini' });
        }
    });
    
    MODELOS_POLLINATIONS.forEach(m => {
        listado.push({ ...m, provider: 'pollinations' });
    });
    
    try {
        const list = await fetchOllamaModels(endpointOllamaInput.value.trim());
        if (list && list.length > 0) {
            list.forEach(m => {
                listado.push({ name: m.name.toUpperCase(), tag: m.name, provider: 'ollama' });
            });
        }
    } catch (e) {
        console.warn("Ollama local no disponible o desconectado.");
    }
    
    setListadoModelosTexto(listado);
    
    if (state.appMode === 'chat' || state.appMode === 'agent') {
        buildModelDropdown();
    }
    populateAgentFastModels();
}

function populateAgentFastModels() {
    if (!selectAgentFastModel) return;
    selectAgentFastModel.innerHTML = '';
    
    state.listadoModelosTexto.forEach(m => {
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
        if (state.appMode === 'image') setMode('chat');
        else setMode('image');
    });
    btnToolAgent.addEventListener('click', () => {
        if (state.appMode === 'agent') setMode('chat');
        else setMode('agent');
    });
}

function setMode(mode) {
    setAppMode(mode);
    btnToolImage.className = "text-xs font-semibold text-neutral-400 hover:text-black transition-colors cursor-pointer";
    btnToolAgent.className = "text-xs font-semibold text-neutral-400 hover:text-black transition-colors cursor-pointer";
    imageAspectSelector.classList.add('hidden');
    agentConfigBar.classList.add('hidden');
    
    if (mode === 'chat') {
        userInput.placeholder = "Escribe tu consulta aquí...";
        buildModelDropdown();
    } else if (mode === 'image') {
        btnToolImage.className = "text-xs font-bold text-black transition-all cursor-pointer";
        userInput.placeholder = "Describe detalladamente la imagen que deseas generar...";
        imageAspectSelector.classList.remove('hidden');
        if (state.activeImageModelIndex >= MODELOS_IMAGEN.length) setActiveImageModelIndex(0);
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

btnOpenSettings.addEventListener('click', () => modalSettings.classList.remove('hidden'));
function hideModal() { modalSettings.classList.add('hidden'); }
btnCloseModal.addEventListener('click', hideModal);

btnLoginPollinations.addEventListener('click', () => {
    const customClientId = apiKeyPollinationsInput.value.trim();
    iniciarSesionPollinations(customClientId);
});

btnSaveSettings.addEventListener('click', async () => {
    await saveSettingsToFolder(
        apiKeyPollinationsInput.value.trim(),
        apiKeyGeminiInput.value.trim(),
        endpointOllamaInput.value.trim()
    );
    hideModal();
    await fetchDynamicPollinationsTextModels();
    await fetchDynamicPollinationsImageModels();
    await buildUnifiedTextModels();
});

modalSettings.addEventListener('click', (e) => { if (e.target === modalSettings) hideModal(); });

function buildModelDropdown() {
    buildModelDropdownUI(
        state.appMode, state.listadoModelosTexto, MODELOS_IMAGEN, state.activeModelIndex, state.activeImageModelIndex, 
        dropdownOptions, dropdownMenu, selectModel, toggleFavorite
    );
}

function selectModel(index) {
    if (state.appMode === 'chat' || state.appMode === 'agent') {
        setActiveModelIndex(index);
        if (state.listadoModelosTexto[index]) {
            const rolAgenteLabel = state.appMode === 'agent' ? ' (FUERTE / ORQUESTADOR)' : '';
            selectedModelText.textContent = `${state.listadoModelosTexto[index].name} (${state.listadoModelosTexto[index].provider.toUpperCase()})${rolAgenteLabel}`;
        }
    } else {
        setActiveImageModelIndex(index);
        if (MODELOS_IMAGEN[index]) {
            selectedModelText.textContent = `${MODELOS_IMAGEN[index].name} (GENERATIVO)`;
        }
    }
}

async function toggleFavorite(tag) {
    if (state.appMode === 'chat' || state.appMode === 'agent') {
        if (favoritosText.includes(tag)) setFavoritosText(favoritosText.filter(f => f !== tag));
        else favoritosText.push(tag);
    } else {
        if (favoritosImage.includes(tag)) setFavoritosImage(favoritosImage.filter(f => f !== tag));
        else favoritosImage.push(tag);
    }
    await saveFavorites(state.appMode);
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

btnNewChat.addEventListener('click', () => createNewConversation("Nueva Conversación", renderSidebar, renderActive));
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
        if (isImage) reader.readAsDataURL(file);
        else reader.readAsText(file);
        
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

async function handleSend(isResumingFromCheckpoint = false) {
    if (!directoryHandle) {
        modalFolderRequired.classList.remove('hidden');
        return;
    }
    
    const promptText = userInput.value.trim();
    const hasAttachments = currentBufferAttachments.length > 0;
    
    if (!promptText && !hasAttachments && !isResumingFromCheckpoint) return;
    
    const activeModel = (state.appMode === 'chat' || state.appMode === 'agent') ? state.listadoModelosTexto[state.activeModelIndex] : MODELOS_IMAGEN[state.activeImageModelIndex];
    if (!activeModel) return;
    
    let displayModelName = activeModel.name;
    if (state.appMode === 'agent') {
        displayModelName = `${activeModel.name} (AGENTE)`;
    } else if (state.appMode === 'chat' && state.withFunctionsMode) {
        displayModelName = `${activeModel.name} [+FX]`;
    } else if (state.appMode === 'image') {
        displayModelName = `${activeModel.name} (GENERATIVO)`;
    }

    const targetConversationId = activeConversationId;
    const currentChat = conversations.find(c => c.id === targetConversationId);
    
    let waitingNodeId = "";
    if (targetConversationId === activeConversationId) {
        if (!isResumingFromCheckpoint) {
            appendChatMessageToDOMUI(chatHistory, "usuario", promptText || "[Archivos Adjuntos]");
        }
        waitingNodeId = appendWaitingMessageUI(chatHistory, displayModelName, targetConversationId);
    }

    if (!isResumingFromCheckpoint) userInput.value = '';
    const thisTurnAttachments = [...currentBufferAttachments];
    currentBufferAttachments.length = 0;
    renderAttachmentPreviewsUI(attachmentPreviewArea);

    (async () => {
        try {
            if (currentChat && !isResumingFromCheckpoint) {
                currentChat.messages.push({
                    role: 'usuario',
                    content: promptText || "[Archivos Adjuntos]",
                    modelName: 'TÚ'
                });
                currentChat.status = 'processing';
                if (currentChat.title === "Nueva Conversación") {
                    currentChat.title = promptText.substring(0, 24) || "Hilo Activo";
                }
                saveConversations().then(() => renderSidebar());
            }

            let responseText = "";
            let generatedImageUrl = "";
            let responseMetrics = null;
            const startTime = performance.now();
            
            if (state.appMode === 'image') {
                const pollinationsKey = apiKeyPollinationsInput.value.trim();
                const geminiKey = apiKeyGeminiInput.value.trim();
                const selectedAspectInput = document.querySelector('input[name="aspect-ratio"]:checked');
                const aspectValue = selectedAspectInput ? selectedAspectInput.value : '1:1';
                
                generatedImageUrl = await queryImageGeneration(
                    promptText, activeModel.tag, pollinationsKey, thisTurnAttachments, aspectValue, geminiKey
                );
                responseText = `He generado con éxito la imagen utilizando el modelo **${activeModel.name}** con el prompt:\n\n*"${promptText}"*`;
            } 
            else if (state.appMode === 'agent') {
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
                const fastModel = state.listadoModelosTexto.find(m => m.tag === fastModelTag) || activeModel;
                
                const historyPayload = getChatPayload(targetConversationId);
                const waitingNode = document.getElementById(waitingNodeId);
                if (waitingNode) {
                    const btnPause = document.createElement('button');
                    btnPause.className = "text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-mono px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer select-none my-1";
                    btnPause.innerHTML = `<i class="fa-solid fa-pause"></i> Pausar Agente`;
                    btnPause.addEventListener('click', () => {
                        requestAgentPause(targetConversationId);
                        btnPause.disabled = true;
                        btnPause.textContent = "Guardando Checkpoint...";
                    });
                    const container = waitingNode.querySelector('.space-y-1\\.5');
                    if (container) container.appendChild(btnPause);
                }
                
                responseText = await runAgentPipeline(
                    historyPayload, activeModel, fastModel, configKeys, agentLimits, waitingNodeId, thisTurnAttachments, targetConversationId
                );
            } 
            else {
                let historyPayload = getChatPayload(targetConversationId);
                const configKeys = {
                    gemini: apiKeyGeminiInput.value.trim(),
                    pollinations: apiKeyPollinationsInput.value.trim(),
                    ollamaEndpoint: endpointOllamaInput.value.trim()
                };
                const fastModel = state.listadoModelosTexto.find(m => m.tag.includes('flash-lite')) || activeModel;
                
                if (state.withFunctionsMode) {
                    responseText = await runModoFXAgent(
                        historyPayload,
                        activeModel,
                        fastModel,
                        configKeys,
                        waitingNodeId
                    );
                } 
                else {
                    if (activeModel.provider === 'pollinations') {
                        responseText = await queryPollinations(historyPayload, activeModel.tag, apiKeyPollinationsInput.value.trim(), thisTurnAttachments);
                    } else if (activeModel.provider === 'gemini') {
                        responseText = await queryGemini(historyPayload, activeModel.tag, apiKeyGeminiInput.value.trim(), thisTurnAttachments);
                    } else if (activeModel.provider === 'ollama') {
                        const waitingNode = document.getElementById(waitingNodeId);
                        let streamTextContainer = null;
                        if (waitingNode) {
                            streamTextContainer = waitingNode.querySelector('.space-y-1\\.5') || waitingNode.querySelector('.flex.items-center').parentNode;
                        }
                        const resObj = await queryOllama(historyPayload, activeModel.tag, endpointOllamaInput.value.trim(), thisTurnAttachments, (currentProgress) => {
                            if (streamTextContainer && targetConversationId === activeConversationId) {
                                let innerLabel = streamTextContainer.querySelector('.stream-live-preview');
                                if (!innerLabel) {
                                    innerLabel = document.createElement('div');
                                    innerLabel.className = "stream-live-preview text-xs text-black font-sans leading-relaxed mt-2 p-1 whitespace-pre-wrap";
                                    streamTextContainer.appendChild(innerLabel);
                                }
                                innerLabel.innerHTML = formatModelOutput(currentProgress);
                                chatHistory.scrollTop = chatHistory.scrollHeight;
                            }
                        });
                        if (typeof resObj === 'object' && resObj.text) {
                            responseText = resObj.text;
                            responseMetrics = resObj.metrics;
                        } else {
                            responseText = resObj;
                        }
                    }
                    
                    if (responseText) {
                        const fullLibrary = getCombinedFunctionLibrary();
                        if (responseText.includes('```html')) {
                            responseText = responseText.replace(/```html([\s\S]*?)```/gi, (match, htmlContent) => {
                                const bundledHtml = injectReferencedLibraryFunctions(htmlContent, fullLibrary);
                                return '```html\n' + bundledHtml + '\n```';
                            });
                        } else {
                            responseText = injectReferencedLibraryFunctions(responseText, fullLibrary);
                        }
                    }
                }
            }
            
            // Cálculo genérico de respaldo para métricas si el proveedor API no lo generó nativamente
            if (!responseMetrics && responseText) {
                const totalTimeSec = (performance.now() - startTime) / 1000;
                const tokenCount = Math.ceil(responseText.length / 4);
                const tokSec = (tokenCount / (totalTimeSec || 1)).toFixed(1);
                responseMetrics = {
                    tokens: tokenCount,
                    tokSec: parseFloat(tokSec),
                    timeSec: totalTimeSec.toFixed(2)
                };
            }

            const chatAlFinalizar = conversations.find(c => c.id === targetConversationId);
            if (chatAlFinalizar) {
                const newMsg = {
                    role: 'asistente',
                    content: responseText,
                    modelName: displayModelName,
                    metrics: responseMetrics
                };
                if (generatedImageUrl) newMsg.imageUrl = generatedImageUrl;
                
                chatAlFinalizar.messages.push(newMsg);
                chatAlFinalizar.status = (targetConversationId === activeConversationId) ? 'none' : 'completed';
                await saveConversations();
            }
            
            if (targetConversationId === activeConversationId) {
                const waitingNode = document.querySelector(`[data-waiting-chat="${targetConversationId}"]`);
                if (waitingNode) waitingNode.remove();
                appendChatMessageToDOMUI(chatHistory, "asistente", responseText, displayModelName, true, generatedImageUrl, responseMetrics);
                checkAndDisplayCheckpointBanner(chatHistory, handleSend);
            } else {
                renderSidebar();
            }
        } catch (err) {
            if (targetConversationId === activeConversationId) {
                const waitingNode = document.querySelector(`[data-waiting-chat="${targetConversationId}"]`);
                if (waitingNode) waitingNode.remove();
                appendChatMessageToDOMUI(chatHistory, "sistema-error", `Pipeline interrumpido: ${err.message}`);
                checkAndDisplayCheckpointBanner(chatHistory, handleSend);
            }
            const chatConError = conversations.find(c => c.id === targetConversationId);
            if (chatConError) {
                chatConError.status = 'none';
                await saveConversations();
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

btnSend.addEventListener('click', () => handleSend(false));
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend(false);
    }
});