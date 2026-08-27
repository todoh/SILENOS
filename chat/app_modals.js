// app_modals.js
// Gestor de modales, sincronización del espacio de trabajo y visualizadores periféricos
import { 
    selectWorkspaceDirectory, loadSavedSettings, loadConversations, loadFavorites, 
    loadAgentTools, loadFunctionLibrary, saveFunctionLibrary, saveAgentTools, 
    agentTools, functionLibrary, directoryHandle, loadAgentCheckpoint, saveSettingsToFolder, 
    getGalleryFilesFromDirectory, activeConversationId 
} from './conversations.js';
import { 
    renderAgentToolsListUI, renderFunctionLibraryListUI, renderConversationSidebarUI, 
    renderActiveConversationUI 
} from './ui.js';
import { UNIFIED_FUNCTION_LIBRARY } from './fn_library_index.js';

export async function syncWorkspaceFolder(elements, callbacks) {
    const dir = await selectWorkspaceDirectory();
    if (dir) {
        if (elements.folderBtnLabel) elements.folderBtnLabel.textContent = dir.name;
        if (elements.modalFolderRequired) elements.modalFolderRequired.classList.add('hidden');
        
        await loadSavedSettings(elements.apiKeyPollinationsInput, elements.apiKeyGeminiInput, elements.endpointOllamaInput);
        await loadConversations(callbacks.renderSidebar, callbacks.renderActive);
        await loadFavorites();
        await loadAgentTools(() => renderAgentToolsListUI(elements.toolsListContainer));
        
        await loadFunctionLibrary(async () => {
            let hasChanges = false;
            UNIFIED_FUNCTION_LIBRARY.forEach(baseFn => {
                const exists = functionLibrary.some(f => f.name === baseFn.name);
                if (!exists) {
                    functionLibrary.push(baseFn);
                    hasChanges = true;
                }
            });
            if (hasChanges) {
                await saveFunctionLibrary();
            }
            renderFunctionLibraryListUI(elements.functionsListContainer);
        });
        
        if (callbacks.buildUnifiedTextModels) await callbacks.buildUnifiedTextModels();
        await checkAndDisplayCheckpointBanner(elements.chatHistory, callbacks.handleSend);
    }
}

export async function checkAndDisplayCheckpointBanner(chatHistory, handleSendCallback) {
    if (!activeConversationId) return;
    const checkpoint = await loadAgentCheckpoint(activeConversationId);
    let banner = document.getElementById('agent-checkpoint-banner');
    
    if (checkpoint) {
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'agent-checkpoint-banner';
            banner.className = "flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-xs font-mono text-amber-900 mb-3 select-none";
            const chatHeader = chatHistory.parentNode;
            chatHeader.insertBefore(banner, chatHistory);
        }
        
        banner.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-bookmark text-amber-600 animate-pulse"></i>
                <span>Existe un <strong>checkpoint guardado</strong> en la vuelta #${checkpoint.currentStrongCalls} (${new Date(checkpoint.timestamp).toLocaleTimeString()}).</span>
            </div>
            <button id="btn-resume-checkpoint" class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer text-[10px]">
                <i class="fa-solid fa-play mr-1"></i> Reanudar Agente
            </button>
        `;
        banner.classList.remove('hidden');
        
        document.getElementById('btn-resume-checkpoint').addEventListener('click', () => {
            banner.classList.add('hidden');
            if (handleSendCallback) handleSendCallback(true);
        });
    } else if (banner) {
        banner.classList.add('hidden');
    }
}

export function initToolsModalHandlers(btnOpenTools, btnCloseTools, modalTools, btnAddTool, toolNewName, toolNewDesc, toolsListContainer) {
    btnOpenTools.addEventListener('click', () => modalTools.classList.remove('hidden'));
    btnCloseTools.addEventListener('click', () => modalTools.classList.add('hidden'));
    modalTools.addEventListener('click', (e) => { if (e.target === modalTools) modalTools.classList.add('hidden'); });
    
    btnAddTool.addEventListener('click', async () => {
        const name = toolNewName.value.trim().toLowerCase().replace(/\s+/g, '_');
        const desc = toolNewDesc.value.trim();
        if (!name || !desc) return;
        
        const defaultJsCode = `function execute(args) {\n  return "Herramienta ${name} ejecutada correctamente";\n}`;
        agentTools.push({
            id: `tool-${Date.now()}`,
            name: name,
            desc: desc,
            javascript_code: defaultJsCode
        });
        await saveAgentTools();
        renderAgentToolsListUI(toolsListContainer);
        toolNewName.value = '';
        toolNewDesc.value = '';
    });
}

export function initFunctionsModalHandlers(btnOpenFunctions, btnCloseFunctions, modalFunctions, btnAddFunction, fnNewName, fnNewDesc, functionsListContainer) {
    if (!btnOpenFunctions) return;
    btnOpenFunctions.addEventListener('click', () => modalFunctions.classList.remove('hidden'));
    btnCloseFunctions.addEventListener('click', () => modalFunctions.classList.add('hidden'));
    modalFunctions.addEventListener('click', (e) => { if (e.target === modalFunctions) modalFunctions.classList.add('hidden'); });
    
    btnAddFunction.addEventListener('click', async () => {
        const name = fnNewName.value.trim().replace(/\s+/g, '_');
        const desc = fnNewDesc.value.trim();
        if (!name || !desc) return;
        
        const defaultJsCode = `function ${name}() {\n  // Lógica reutilizable\n}`;
        functionLibrary.push({
            id: `fn-${Date.now()}`,
            name: name,
            desc: desc,
            javascript_code: defaultJsCode
        });
        await saveFunctionLibrary();
        renderFunctionLibraryListUI(functionsListContainer);
        fnNewName.value = '';
        fnNewDesc.value = '';
    });
}

export function initGalleryModalHandlers(btnOpenGallery, btnCloseGallery, modalGallery, galleryGrid, modalFolderRequired) {
    if (!btnOpenGallery) return;
    btnOpenGallery.addEventListener('click', async () => {
        if (!directoryHandle) {
            modalFolderRequired.classList.remove('hidden');
            return;
        }
        modalGallery.classList.remove('hidden');
        await renderGalleryGrid(galleryGrid);
    });
    btnCloseGallery.addEventListener('click', () => modalGallery.classList.add('hidden'));
    modalGallery.addEventListener('click', (e) => {
        if (e.target === modalGallery) modalGallery.classList.add('hidden');
    });
}

export async function renderGalleryGrid(galleryGrid) {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '<div class="col-span-full text-center py-8 font-mono text-xs text-neutral-400">Escaneando archivos de imagen y SVG...</div>';
    
    const items = await getGalleryFilesFromDirectory();
    galleryGrid.innerHTML = '';
    
    if (items.length === 0) {
        galleryGrid.innerHTML = '<div class="col-span-full text-center py-8 font-mono text-xs text-neutral-400">No se encontraron imágenes ni archivos SVG en esta carpeta.</div>';
        return;
    }
    
    for (const item of items) {
        let objectUrl = '';
        let displayElement = '';
        if (item.isSvg) {
            const rawSvgText = await item.file.text();
            const svgBlob = new Blob([rawSvgText], { type: 'image/svg+xml;charset=utf-8' });
            objectUrl = URL.createObjectURL(svgBlob);
            displayElement = `<div class="w-full h-full p-2 flex items-center justify-center overflow-hidden [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto [&>svg]:object-contain">${rawSvgText}</div>`;
        } else {
            objectUrl = URL.createObjectURL(item.file);
            displayElement = `<img src="${objectUrl}" class="max-h-full max-w-full object-contain" alt="${item.name}" />`;
        }
        
        const card = document.createElement('div');
        card.className = "group relative bg-neutral-50 border border-neutral-200 rounded-xl overflow-hidden flex flex-col justify-between p-2 space-y-2 hover:border-black transition-all h-48";
        card.innerHTML = `
            <div class="w-full flex-1 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-neutral-100 min-h-0">
                ${displayElement}
            </div>
            <div class="flex flex-col space-y-1 shrink-0">
                <span class="text-[10px] font-mono font-bold text-black truncate" title="${item.name}">${item.name}</span>
                <a href="${objectUrl}" download="${item.name}" class="text-[9px] font-mono font-bold uppercase tracking-wider text-center bg-neutral-200 hover:bg-black hover:text-white text-black py-1 rounded transition-colors block">
                    Descargar
                </a>
            </div>
        `;
        galleryGrid.appendChild(card);
    }
}
// Añadir en app_modals.js
import { renderStatsUI } from './estadisticas.js';

export function initStatsModalHandlers(btnOpenStats, btnCloseStats, modalStats, statsContainer) {
    if (!btnOpenStats || !modalStats) return;

    btnOpenStats.addEventListener('click', () => {
        modalStats.classList.remove('hidden');
        renderStatsUI(statsContainer, 'todos', 'modelos');
    });

    if (btnCloseStats) {
        btnCloseStats.addEventListener('click', () => modalStats.classList.add('hidden'));
    }

    modalStats.addEventListener('click', (e) => {
        if (e.target === modalStats) modalStats.classList.add('hidden');
    });
}