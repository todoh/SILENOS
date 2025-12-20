// SILENOS 3/narrative-manager.js
// --- GESTOR DE DATOS NARRATIVOS ---

const NarrativeManager = {
    renderInWindow(windowId, fileId) {
        const file = FileSystem.getItem(fileId);
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        
        if (!file || !winContent) {
            if(winContent) winContent.innerHTML = '<div class="p-4 text-red-500">Error: Archivo no encontrado</div>';
            return;
        }

        const tag = file.content.tag || "";
        const text = file.content.text || "";

        winContent.innerHTML = `
            <div class="flex flex-col h-full w-full bg-[#e0e5ec] p-4 gap-4">
                
                <div class="flex items-center justify-between">
                     <div class="flex items-center gap-2 flex-1">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">ETIQUETA</span>
                        <input type="text" id="narrative-tag-${windowId}" value="${tag}" 
                            class="neumorph-in px-3 py-1 text-sm font-bold text-orange-600 outline-none w-1/2"
                            placeholder="Etiqueta...">
                     </div>
                     <span id="narrative-status-${windowId}" class="text-[10px] text-gray-400 font-mono opacity-0 transition-opacity">Guardado</span>
                </div>

                <div class="flex-1 relative overflow-hidden neumorph-in rounded-xl">
                    <textarea id="narrative-text-${windowId}" 
                        class="w-full h-full bg-transparent p-4 text-sm text-gray-700 outline-none resize-none border-none leading-relaxed"
                        placeholder="Escribe aquí tu contenido...">${text}</textarea>
                </div>
            </div>
        `;

        const tagInput = document.getElementById(`narrative-tag-${windowId}`);
        const textArea = document.getElementById(`narrative-text-${windowId}`);
        const statusEl = document.getElementById(`narrative-status-${windowId}`);

        let saveTimeout = null;

        const save = () => {
            const currentFile = FileSystem.getItem(fileId);
            if (!currentFile) return;

            currentFile.content.tag = tagInput.value;
            currentFile.content.text = textArea.value;
            FileSystem.save();

            statusEl.style.opacity = '1';
            setTimeout(() => { if(statusEl) statusEl.style.opacity = '0'; }, 1500);
        };

        const debouncedSave = () => {
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(save, 500);
        };

        tagInput.addEventListener('input', debouncedSave);
        textArea.addEventListener('input', debouncedSave);
        
        setTimeout(() => textArea.focus(), 100);
    }
};