// --- VISOR DE DATOS (DATA VIEWER) INTEGRADO EN VENTANAS ---

const DataViewer = {
    // Ya no usamos un currentFileId global, sino por instancia de ventana
    
    renderInWindow(windowId, fileId) {
        // 1. Obtener referencia al archivo
        FileSystem.init();
        const file = FileSystem.getItem(fileId);
        
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!file || !winContent) {
            if(winContent) winContent.innerHTML = '<div class="p-4 text-red-500">Error: Archivo no encontrado</div>';
            return;
        }

        console.log("DataViewer: Renderizando en ventana", windowId);

        // 2. Preparar contenido
        let contentStr = '';
        try {
            contentStr = typeof file.content === 'string' 
                ? file.content 
                : JSON.stringify(file.content, null, 2);
        } catch (e) {
            contentStr = "{}";
        }

        // 3. Renderizar Estructura dentro de la ventana (Flexbox para ocupar altura)
        // Usamos background del theme
        winContent.innerHTML = `
            <div class="flex flex-col h-full w-full bg-[#e0e5ec]">
                
                <div class="h-8 flex items-center justify-between px-4 bg-[#e0e5ec] border-b border-white/50 select-none shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">JSON EDITOR</span>
                    </div>
                    <div class="flex items-center gap-2">
                         <span id="status-${windowId}" class="text-[10px] text-gray-400 font-mono">Ready</span>
                    </div>
                </div>

                <div class="flex-1 p-2 relative overflow-hidden">
                    <textarea id="textarea-${windowId}" 
                        class="w-full h-full bg-[#e0e5ec] neumorph-in p-4 text-xs font-mono text-gray-700 outline-none resize-none border-none"
                        spellcheck="false">${contentStr}</textarea>
                </div>
            </div>
        `;

        // 4. Lógica de Autoguardado Específica para esta ventana
        const textArea = document.getElementById(`textarea-${windowId}`);
        const statusEl = document.getElementById(`status-${windowId}`);
        
        let saveTimeout = null;
        let statusClearTimeout = null;

        const showStatus = (msg, colorClass, autoClear = true) => {
            if (statusClearTimeout) clearTimeout(statusClearTimeout);
            statusEl.innerText = msg;
            statusEl.className = `text-[10px] font-mono font-bold ${colorClass}`;
            
            if (autoClear) {
                statusClearTimeout = setTimeout(() => {
                    if (document.getElementById(`status-${windowId}`)) {
                        statusEl.innerText = "AutoSave Active";
                        statusEl.className = "text-[10px] text-gray-400 font-mono";
                    }
                }, 2000);
            }
        };

        const save = () => {
            const rawVal = textArea.value;
            try {
                const jsonVal = JSON.parse(rawVal);
                
                FileSystem.init();
                // Verificamos si el archivo aún existe
                const item = FileSystem.getItem(fileId);
                if (!item) {
                    showStatus("Error: Archivo borrado", "text-red-600", false);
                    return;
                }

                item.content = jsonVal;
                FileSystem.save();
                
                // IMPORTANTE: No refrescamos todas las vistas (refreshSystemViews)
                // porque redibujaría esta ventana y perderíamos el foco/cursor.
                // Solo guardamos en silencio.
                showStatus("Guardado", "text-green-600");

            } catch (e) {
                showStatus("Error JSON", "text-red-500", false);
            }
        };

        // Eventos
        textArea.addEventListener('input', () => {
            showStatus("Escribiendo...", "text-blue-500", false);
            if (saveTimeout) clearTimeout(saveTimeout);
            saveTimeout = setTimeout(save, 500); 
        });

        textArea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const s = textArea.selectionStart;
                textArea.value = textArea.value.substring(0, s) + "  " + textArea.value.substring(textArea.selectionEnd);
                textArea.selectionStart = textArea.selectionEnd = s + 2;
            }
        });
        
        // Foco inicial
        // Pequeño timeout para asegurar que el DOM está listo y la animación de ventana no interfiere
        setTimeout(() => textArea.focus(), 100);
    },
    
    // Mantenemos open por compatibilidad antigua, redirigiendo a window-manager si existe
    open(fileId) {
        if (typeof openDataWindow === 'function') {
            openDataWindow(fileId);
        } else {
            alert("Necesitas actualizar window-manager.js para abrir este archivo.");
        }
    }
};