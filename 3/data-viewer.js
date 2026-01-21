/* SILENOS 3/data-viewer.js */
// --- VISOR DE DATOS (DATA VIEWER) INTEGRADO EN VENTANAS ---

const DataViewer = {
    renderInWindow(windowId, fileId) {
        // 1. Obtener referencia al archivo de forma segura
        if (!window.FileSystem) return;
        const file = FileSystem.getItem(fileId);
        
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        if (!file) {
            winContent.innerHTML = '<div class="p-4 text-red-500">Error: Archivo no encontrado en DB.</div>';
            return;
        }

        console.log(`DataViewer: Analizando seguridad de ${fileId}...`);

        // --- SALVAGUARDA ANTI-CRASH (NIVEL EXTREMO) ---
        
        let isDangerous = false;
        let dangerReason = "";

        // Chequeo 1: Referencia interna a Blob
        if (typeof file.content === 'string' && file.content.startsWith('/files/')) {
            isDangerous = true;
            dangerReason = "Es un archivo binario interno.";
        }
        
        // Chequeo 2: String demasiado largo (Base64 crudo)
        else if (typeof file.content === 'string' && file.content.length > 50000) {
            isDangerous = true;
            dangerReason = `Texto excesivo (${(file.content.length/1024).toFixed(1)} KB). Posible Base64.`;
        }

        // Chequeo 3: Objeto JSON con propiedades gigantes (TU CASO ESPECÍFICO)
        else if (typeof file.content === 'object' && file.content !== null) {
            try {
                // Revisamos valores sin hacer stringify de todo el objeto
                const keys = Object.keys(file.content);
                for (const key of keys) {
                    const val = file.content[key];
                    if (typeof val === 'string' && val.length > 20000) {
                        isDangerous = true;
                        dangerReason = `Propiedad JSON '${key}' es demasiado grande para editar.`;
                        break;
                    }
                    // Si es un objeto anidado con url (estructura three.js exporter)
                    if (val && typeof val === 'object' && val.url && val.url.length > 20000) {
                        isDangerous = true;
                        dangerReason = "Detectado Modelo 3D incrustado en JSON.";
                        break;
                    }
                }
            } catch (e) {
                isDangerous = true;
                dangerReason = "Estructura corrupta o ilegible.";
            }
        }

        // --- SI ES PELIGROSO, BLOQUEAMOS EL RENDERIZADO ---
        if (isDangerous) {
            console.warn("DataViewer: Bloqueado renderizado por seguridad.", dangerReason);
            winContent.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full bg-gray-900 text-gray-400 p-6 text-center">
                    <div class="mb-4 p-4 bg-gray-800 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    </div>
                    <h3 class="text-lg font-bold text-gray-200 mb-2">Vista de Texto Deshabilitada</h3>
                    <p class="text-sm mb-4">${dangerReason}</p>
                    <p class="text-xs text-gray-500 max-w-xs">
                        Este archivo contiene datos masivos que colgarían el navegador si se muestran como texto. 
                        Usa el visor específico (3D/Imagen) o conviértelo a formato optimizado.
                    </p>
                    <button onclick="WindowManager.openFile('${fileId}')" class="mt-6 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                        Intentar Abrir con Visor Adecuado
                    </button>
                </div>
            `;
            return; 
        }

        // --- RENDERIZADO SEGURO (Solo si pasa los filtros) ---
        let contentStr = "{}";
        try {
            contentStr = typeof file.content === 'string' 
                ? file.content 
                : JSON.stringify(file.content, null, 2);
        } catch (e) {
            contentStr = "// Error al procesar contenido";
        }

        winContent.innerHTML = `
            <div class="flex flex-col h-full w-full bg-[#1e1e1e]">
                <div class="h-8 flex items-center justify-between px-4 bg-[#252526] border-b border-black select-none shrink-0">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">EDITOR DE CÓDIGO</span>
                    <span id="status-${windowId}" class="text-[10px] text-gray-500 font-mono">Lectura</span>
                </div>
                <textarea id="textarea-${windowId}" 
                    class="flex-1 w-full bg-[#1e1e1e] p-4 text-xs font-mono text-[#d4d4d4] outline-none resize-none border-none"
                    spellcheck="false">${contentStr}</textarea>
            </div>
        `;

        // Lógica de guardado simple
        const ta = document.getElementById(`textarea-${windowId}`);
        if(ta) {
            ta.addEventListener('input', () => {
                const status = document.getElementById(`status-${windowId}`);
                if(status) { status.innerText = "Editado (Sin guardar)"; status.className = "text-[10px] text-yellow-500 font-mono"; }
            });
            ta.addEventListener('blur', () => {
                 // Auto-guardado básico al salir del foco
                 try {
                    let val = ta.value;
                    if (val.trim().startsWith('{') || val.trim().startsWith('[')) val = JSON.parse(val);
                    file.content = val;
                    FileSystem.save(); // Llamada directa
                    const status = document.getElementById(`status-${windowId}`);
                    if(status) { status.innerText = "Guardado"; status.className = "text-[10px] text-green-500 font-mono"; }
                 } catch(e) {}
            });
        }
    }
};