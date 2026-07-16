/**
 * Renderizado de Interfaz, Componentes Visuales y Gestión del DOM
 */
import { 
    conversations, activeConversationId, currentBufferAttachments, favoritosText, favoritosImage, agentTools,
    saveAgentTools, selectConversation, renameConversation, deleteConversation, saveFavorites,
    setCurrentBufferAttachments
} from './conversations.js';

export function renderAgentToolsListUI(toolsListContainer) {
    if (!toolsListContainer) return;
    toolsListContainer.innerHTML = '';
    
    agentTools.forEach(tool => {
        const row = document.createElement('div');
        row.className = "flex flex-col p-2.5 bg-neutral-100 border border-neutral-200 rounded-xl space-y-1.5 relative group";
        
        // Formatear el código asociado para previsualizarlo de forma segura en la interfaz
        const rawCode = tool.javascript_code || `function execute(args) {\n  return "Sin lógica de script asociada";\n}`;

        row.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-black text-xs font-mono outline-none focus:bg-white focus:px-1 rounded cursor-pointer" contenteditable="true" data-field="name" title="Click para editar nombre">[${tool.name}]</span>
                <button class="btn-delete-tool text-neutral-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity text-[10px]" title="Quitar Herramienta">x</button>
            </div>
            <p class="text-[11px] text-neutral-600 leading-normal font-sans outline-none focus:bg-white focus:p-1 rounded cursor-pointer" contenteditable="true" data-field="desc" title="Click para editar descripción">${tool.desc}</p>
            <details class="w-full mt-1">
                <summary class="text-[9px] text-neutral-400 cursor-pointer font-mono hover:text-black select-none">Ver / Editar Código JS de la herramienta</summary>
                <textarea class="w-full h-24 mt-1 bg-neutral-900 text-neutral-100 text-[10px] font-mono rounded p-2 border border-neutral-300 focus:outline-none focus:border-black resize-y" data-field="code" placeholder="function execute(args) { ... }">${rawCode}</textarea>
            </details>
        `;
        
        const nameEl = row.querySelector('[data-field="name"]');
        const descEl = row.querySelector('[data-field="desc"]');
        const codeEl = row.querySelector('[data-field="code"]');

        const updateToolField = () => {
            let newName = nameEl.textContent.trim().replace(/^\[|\]$/g, '').trim().toLowerCase().replace(/\s+/g, '_');
            let newDesc = descEl.textContent.trim();
            let newCode = codeEl.value;
            
            if (newName && (tool.name !== newName || tool.desc !== newDesc || tool.javascript_code !== newCode)) {
                tool.name = newName;
                tool.desc = newDesc;
                tool.javascript_code = newCode;
                saveAgentTools();
                nameEl.textContent = `[${newName}]`;
            }
        };

        nameEl.addEventListener('blur', updateToolField);
        descEl.addEventListener('blur', updateToolField);
        codeEl.addEventListener('blur', updateToolField);

        // Evitar saltos de línea molestos en el nombre al presionar Enter
        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        });

        row.querySelector('.btn-delete-tool').addEventListener('click', () => {
            const updated = agentTools.filter(t => t.id !== tool.id);
            agentTools.length = 0;
            Object.assign(agentTools, updated);
            saveAgentTools();
            renderAgentToolsListUI(toolsListContainer);
        });
        
        toolsListContainer.appendChild(row);
    });
}

export function renderConversationSidebarUI(chatsContainer, sidebarRender, activeRender) {     
    if (!chatsContainer) return;
    chatsContainer.innerHTML = '';     
    conversations.forEach(c => {         
        const isActive = c.id === activeConversationId;         
        const item = document.createElement('div');         
        item.className = `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${             
            isActive ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-500 hover:bg-neutral-50'         }`;                  
        
        let statusDot = '';
        if (c.status === 'processing') {
            statusDot = `<span class="w-2 h-2 rounded-full bg-orange-500 shrink-0 inline-block ml-1 animate-pulse"></span>`;
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
        item.addEventListener('click', () => selectConversation(c.id, sidebarRender, activeRender));         
        item.querySelector('.btn-rename').addEventListener('click', (e) => renameConversation(c.id, e, sidebarRender));         
        item.querySelector('.btn-delete').addEventListener('click', (e) => deleteConversation(c.id, e, sidebarRender, activeRender));         
        chatsContainer.appendChild(item);     
    }); 
}

export function renderActiveConversationUI(chatHistory) {     
    if (!chatHistory) return;
    chatHistory.innerHTML = '';     
    const currentChat = conversations.find(c => c.id === activeConversationId);     
    if (!currentChat) return;     
    if (currentChat.messages.length === 0) {         
        chatHistory.innerHTML = `             
            <div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 max-w-xl mx-auto my-auto">                 
                <div class="space-y-1">                     
                    <h3 class="text-xl font-bold tracking-tight text-black font-mono"> S I L E N <span class="text-red-500">O S</span></h3>                     
                    <p class="text-sm text-black leading-relaxed"> CHAT </p>                 
                </div>             
            </div>         `;     
    } else {         
        currentChat.messages.forEach(m => {             
            appendChatMessageToDOMUI(chatHistory, m.role, m.content, m.modelName || "Modelo", false, m.imageUrl);         
        });     
    }     
    chatHistory.scrollTop = chatHistory.scrollHeight; 
}

export function renderAttachmentPreviewsUI(attachmentPreviewArea) {     
    if (!attachmentPreviewArea) return;
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
            setCurrentBufferAttachments(currentBufferAttachments.filter(f => f.id !== file.id));             
            renderAttachmentPreviewsUI(attachmentPreviewArea);         
        });         
        attachmentPreviewArea.appendChild(item);     
    }); 
}

export function buildModelDropdownUI(appMode, listadoModelosTexto, MODELOS_IMAGEN, activeModelIndex, activeImageModelIndex, dropdownOptions, dropdownMenu, selectModelCallback, toggleFavoriteCallback) {     
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

export function formatModelOutput(text) {     
    if (!text) return '';     
    return text.replace(/<think>/gi, '<div class="think-block"><div class="think-header">Razonamiento Interno</div>')
               .replace(/<\/think>/gi, '</div>'); 
}

export function appendChatMessageToDOMUI(chatHistory, role, text, modelName = "", autoScroll = true, imageUrl = "") {     
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
    
    detectSvgStructuresUI(text, container, messageId);     
    detectHtmlStructuresUI(text, container, messageId);
    card.appendChild(iconNode);     
    card.appendChild(container);     
    chatHistory.appendChild(card);          
    
    if (autoScroll) {         
        chatHistory.scrollTop = chatHistory.scrollHeight;     
    } 
}

export function appendWaitingMessageUI(chatHistory, modelName, chatId) {     
    const waitingId = `wait-${Date.now()}`;     
    const card = document.createElement('div');     
    card.id = waitingId;     
    card.setAttribute('data-waiting-chat', chatId);
    card.className = "max-w-3xl mx-auto flex gap-4 items-start p-2 rounded-2xl text-black";     
    card.innerHTML = `         
        <div class="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 font-mono text-[10px]">             
            ...         
        </div>         
        <div class="space-y-1 flex-1 pt-1 text-black">             
            <p class="text-xs text-black font-bold uppercase tracking-wider font-mono">${modelName}</p>             
            <div class="flex items-center gap-1.5 text-xs text-black font-mono">                 
                <span>Iniciando ciclo del Agente...</span>             
            </div>
            <div class="space-y-1.5 mt-2"></div>
        </div>     `;     
    chatHistory.appendChild(card);     
    chatHistory.scrollTop = chatHistory.scrollHeight;     
    return waitingId; 
}

export function detectSvgStructuresUI(rawText, container, messageId) {     
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
        });     
    } 
}

export function detectHtmlStructuresUI(rawText, container, messageId) {
    const htmlBlockRegex = /```html([\s\S]*?)```/gi;
    let matches = [];
    let match;
    
    while ((match = htmlBlockRegex.exec(rawText)) !== null) {
        matches.push(match[1].trim());
    }

    if (matches.length === 0) {
        const htmlTagRegex = /<html[\s\S]*?<\/html>/gi;
        const tagMatches = rawText.match(htmlTagRegex);
        if (tagMatches) {
            tagMatches.forEach(m => matches.push(m.trim()));
        }
    }

    if (matches && matches.length > 0) {
        matches.forEach((htmlContent, idx) => {
            const previewBox = document.createElement('div');
            previewBox.className = "mt-4 border border-neutral-200 bg-white rounded-2xl overflow-hidden p-4 space-y-3 text-black";
            previewBox.innerHTML = `
                <div class="flex justify-between items-center border-b border-neutral-200 pb-2 mb-2">
                    <span class="text-[10px] font-bold text-black font-mono uppercase tracking-wider">Estructura HTML Detectada #${idx + 1}</span>
                    <div class="flex gap-2">
                        <button class="btn-copy text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all cursor-pointer">
                            Copiar Código
                        </button>
                        <button class="btn-down text-[10px] bg-neutral-100 hover:bg-neutral-200 text-black px-3 py-1.5 rounded-lg font-bold font-mono tracking-wider transition-all cursor-pointer">
                            Descargar HTML
                        </button>
                    </div>
                </div>
                <div class="bg-neutral-50 p-3 rounded-lg max-h-60 overflow-auto border border-neutral-100">
                    <pre class="text-xs font-mono whitespace-pre-wrap break-all text-neutral-800">${htmlContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                </div>
            `;

            previewBox.querySelector('.btn-copy').addEventListener('click', () => {
                navigator.clipboard.writeText(htmlContent).then(() => {
                    const btn = previewBox.querySelector('.btn-copy');
                    const origText = btn.textContent;
                    btn.textContent = "¡Copiado!";
                    setTimeout(() => btn.textContent = origText, 2000);
                });
            });

            previewBox.querySelector('.btn-down').addEventListener('click', () => {
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `documento_${messageId}_${idx + 1}.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });

            container.appendChild(previewBox);
        });
    }
}