// ui.js
/**
 * Orquestador Centralizado del módulo UI - Reexportación e interoperabilidad sin rupturas de caché
 */
import { favoritosText, favoritosImage } from './conversations.js';

// Reexportar limpiamente todas las funciones de los sub-módulos creados
export { 
    renderAgentToolsListUI, 
    renderFunctionLibraryListUI,
    renderConversationSidebarUI, 
    renderAttachmentPreviewsUI 
} from './ui_tools.js';

export { 
    renderActiveConversationUI, 
    formatModelOutput, 
    appendChatMessageToDOMUI, 
    appendWaitingMessageUI,
    detectSvgStructuresUI,
    detectGenericCodeStructuresUI,
    detectBufferStructuresUI
} from './ui_messages.js';

export function buildModelDropdownUI(
    appMode, listadoModelosTexto, MODELOS_IMAGEN, activeModelIndex, activeImageModelIndex, 
    dropdownOptions, dropdownMenu, selectModelCallback, toggleFavoriteCallback
) {
    if (!dropdownOptions) return;
    dropdownOptions.innerHTML = '';
    
    const modelosDeEsteModo = (appMode === 'chat' || appMode === 'agent') ? listadoModelosTexto : MODELOS_IMAGEN;
    const favoritosActivos = (appMode === 'chat' || appMode === 'agent') ? favoritosText : favoritosImage;
    
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
        
        let badgeCoste = '';
        const lowerName = m.name.toLowerCase();
        const lowerTag = m.tag.toLowerCase();
        
        if (appMode === 'chat' || appMode === 'agent') {
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
            if (selectModelCallback) selectModelCallback(realIndex !== -1 ? realIndex : 0);
            dropdownMenu.classList.add('hidden');
        });
        
        row.querySelector('.btn-fav').addEventListener('click', (e) => {
            e.stopPropagation();
            if (toggleFavoriteCallback) toggleFavoriteCallback(m.tag);
        });

        dropdownOptions.appendChild(row);
    });
    
    const targetIdx = (appMode === 'chat' || appMode === 'agent') ? activeModelIndex : activeImageModelIndex;
    if (modelosDeEsteModo[targetIdx]) {
        if (selectModelCallback) selectModelCallback(targetIdx);
    } else {
        if (selectModelCallback) selectModelCallback(0);
    }
}