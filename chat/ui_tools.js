// ui_tools.js
/**
 * Componentes de Interfaz Periféricos, Herramientas del Agente, Librería de Funciones y Sidebar
 */
import { 
    agentTools, saveAgentTools, functionLibrary, saveFunctionLibrary, conversations, activeConversationId,
    selectConversation, renameConversation, deleteConversation,
    currentBufferAttachments, setCurrentBufferAttachments 
} from './conversations.js';

export function renderAgentToolsListUI(toolsListContainer) {
    if (!toolsListContainer) return;
    toolsListContainer.innerHTML = '';
    agentTools.forEach(tool => {
        const row = document.createElement('div');
        row.className = "flex flex-col p-2.5 bg-neutral-100 border border-neutral-200 rounded-xl space-y-1.5 relative group";
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

        const updateToolField = async () => {
            let newName = nameEl.textContent.trim().replace(/^\[|\]$/g, '').trim().toLowerCase().replace(/\s+/g, '_');
            let newDesc = descEl.textContent.trim();
            let newCode = codeEl.value;
            if (newName && (tool.name !== newName || tool.desc !== newDesc || tool.javascript_code !== newCode)) {
                tool.name = newName;
                tool.desc = newDesc;
                tool.javascript_code = newCode;
                await saveAgentTools();
                nameEl.textContent = `[${newName}]`;
            }
        };

        nameEl.addEventListener('blur', updateToolField);
        descEl.addEventListener('blur', updateToolField);
        codeEl.addEventListener('blur', updateToolField);
        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        });

        row.querySelector('.btn-delete-tool').addEventListener('click', async () => {
            const updated = agentTools.filter(t => t.id !== tool.id);
            agentTools.length = 0;
            Object.assign(agentTools, updated);
            await saveAgentTools();
            renderAgentToolsListUI(toolsListContainer);
        });

        toolsListContainer.appendChild(row);
    });
}

export function renderFunctionLibraryListUI(functionsContainer) {
    if (!functionsContainer) return;
    functionsContainer.innerHTML = '';
    functionLibrary.forEach(fnItem => {
        const row = document.createElement('div');
        row.className = "flex flex-col p-2.5 bg-neutral-100 border border-neutral-200 rounded-xl space-y-1.5 relative group";
        const rawCode = fnItem.javascript_code || `function ${fnItem.name}() {\n  // Tu lógica reutilizable aquí\n}`;
        row.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold text-black text-xs font-mono outline-none focus:bg-white focus:px-1 rounded cursor-pointer" contenteditable="true" data-field="name" title="Click para editar nombre">[${fnItem.name}]</span>
                <button class="btn-delete-fn text-neutral-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity text-[10px]" title="Quitar Función">x</button>
            </div>
            <p class="text-[11px] text-neutral-600 leading-normal font-sans outline-none focus:bg-white focus:p-1 rounded cursor-pointer" contenteditable="true" data-field="desc" title="Click para editar descripción">${fnItem.desc}</p>
            <details class="w-full mt-1">
                <summary class="text-[9px] text-neutral-400 cursor-pointer font-mono hover:text-black select-none">Ver / Editar Código JS de la función</summary>
                <textarea class="w-full h-24 mt-1 bg-neutral-900 text-neutral-100 text-[10px] font-mono rounded p-2 border border-neutral-300 focus:outline-none focus:border-black resize-y" data-field="code" placeholder="function miFuncion() { ... }">${rawCode}</textarea>
            </details>
        `;
        const nameEl = row.querySelector('[data-field="name"]');
        const descEl = row.querySelector('[data-field="desc"]');
        const codeEl = row.querySelector('[data-field="code"]');

        const updateFnField = async () => {
            let newName = nameEl.textContent.trim().replace(/^\[|\]$/g, '').trim().replace(/\s+/g, '_');
            let newDesc = descEl.textContent.trim();
            let newCode = codeEl.value;
            if (newName && (fnItem.name !== newName || fnItem.desc !== newDesc || fnItem.javascript_code !== newCode)) {
                fnItem.name = newName;
                fnItem.desc = newDesc;
                fnItem.javascript_code = newCode;
                await saveFunctionLibrary();
                nameEl.textContent = `[${newName}]`;
            }
        };

        nameEl.addEventListener('blur', updateFnField);
        descEl.addEventListener('blur', updateFnField);
        codeEl.addEventListener('blur', updateFnField);
        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameEl.blur();
            }
        });

        row.querySelector('.btn-delete-fn').addEventListener('click', async () => {
            const updated = functionLibrary.filter(f => f.id !== fnItem.id);
            functionLibrary.length = 0;
            Object.assign(functionLibrary, updated);
            await saveFunctionLibrary();
            renderFunctionLibraryListUI(functionsContainer);
        });

        functionsContainer.appendChild(row);
    });
}

export function renderConversationSidebarUI(chatsContainer, sidebarRender, activeRender) {
    if (!chatsContainer) return;
    chatsContainer.innerHTML = '';
    conversations.forEach(c => {
        const isActive = c.id === activeConversationId;
        const item = document.createElement('div');
        item.className = `group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            isActive ? 'bg-neutral-100 text-black font-semibold' : 'text-neutral-500 hover:bg-neutral-50'
        }`;
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
            </div>
        `;
        item.addEventListener('click', () => selectConversation(c.id, sidebarRender, activeRender));
        item.querySelector('.btn-rename').addEventListener('click', (e) => renameConversation(c.id, e, sidebarRender));
        item.querySelector('.btn-delete').addEventListener('click', (e) => deleteConversation(c.id, e, sidebarRender, activeRender));
        chatsContainer.appendChild(item);
    });
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
            </button>
        `;
        item.querySelector('.btn-remove').addEventListener('click', () => {
            setCurrentBufferAttachments(currentBufferAttachments.filter(f => f.id !== file.id));
            renderAttachmentPreviewsUI(attachmentPreviewArea);
        });
        attachmentPreviewArea.appendChild(item);
    });
}