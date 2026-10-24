/* SILENOS 3/import-ui.js */
/* Responsable de la Interfaz Gráfica (HTML y Modales) */

const ImportUI = {
    // Genera el HTML principal de la ventana
    getMainWindowTemplate(windowId) {
        return `
            <div class="flex flex-col h-full bg-[#f3f4f6] p-6 gap-6 relative">
                
                <div class="flex items-center gap-3 border-b border-gray-300 pb-4 shrink-0">
                    <div class="p-3 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">
                        <i data-lucide="hard-drive" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-700">Almacenamiento Global</h3>
                        <p class="text-xs text-gray-500">Importar/Exportar Proyectos, Libros, Programas y Datos</p>
                    </div>
                </div>

                <div class="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
                    
                    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 shrink-0">
                        <div class="flex items-center gap-2 mb-1">
                            <i data-lucide="save" class="w-4 h-4 text-indigo-500"></i>
                            <label class="text-xs font-bold text-gray-500 uppercase">Backup Completo (Sistema + Módulos)</label>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                            <p class="text-[11px] text-gray-400 leading-tight">
                                Descarga todo el sistema de archivos y los módulos de programación personalizados.
                            </p>
                            <button onclick="ImportManager.downloadBackup('${windowId}')" 
                                class="neumorph-btn px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-transform flex items-center gap-2 shrink-0">
                                <i data-lucide="download" class="w-4 h-4"></i> DESCARGAR
                            </button>
                        </div>
                    </div>

                    <div class="flex flex-col gap-2 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0" style="min-height: 200px;">
                        <div class="flex items-center gap-2 mb-1">
                            <i data-lucide="import" class="w-4 h-4 text-orange-500"></i>
                            <label class="text-xs font-bold text-gray-500 uppercase">Zona de Importación</label>
                        </div>

                        <div id="import-zone-${windowId}" class="flex-1 relative group bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors h-32">
                            <textarea id="import-text-${windowId}" 
                                class="import-drop-zone w-full h-full bg-transparent p-4 text-xs font-mono text-gray-600 outline-none resize-none placeholder-gray-400"
                                placeholder='Arrastra aquí archivos .JSON (Backups/Datos) o Carpetas con .TXT (Narrativas).\nTambién puedes pegar texto JSON directamente.'></textarea>
                            
                            <div id="import-overlay-${windowId}" class="absolute inset-0 bg-indigo-50/90 flex flex-col items-center justify-center rounded-lg opacity-0 pointer-events-none transition-opacity z-10">
                                <i data-lucide="upload-cloud" class="w-10 h-10 text-indigo-500 mb-2"></i>
                                <span class="text-sm font-bold text-indigo-600">Soltar para procesar</span>
                            </div>
                        </div>

                        <div class="flex justify-between items-center mt-2">
                            <span id="import-status-${windowId}" class="text-[10px] font-bold text-gray-400">Esperando datos...</span>
                            
                            <button onclick="ImportManager.executeImport('${windowId}')" 
                                class="neumorph-btn px-6 py-2 text-xs font-bold text-green-600 hover:text-green-700 active:scale-95 transition-transform flex items-center gap-2">
                                <i data-lucide="check-circle" class="w-4 h-4"></i> IMPORTAR AL SISTEMA
                            </button>
                        </div>
                    </div>

                    <div class="mt-4 pt-4 border-t border-red-200">
                        <div class="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
                            <div class="flex flex-col">
                                <div class="flex items-center gap-2 text-red-600 mb-1">
                                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                                    <span class="text-xs font-bold uppercase">Zona de Peligro</span>
                                </div>
                                <p class="text-[10px] text-red-400">Borra archivos y módulos. Mantiene API Keys.</p>
                            </div>
                            <button onclick="ImportManager.showResetModal('${windowId}')" 
                                class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform">
                                ☢️ VACIAR MEMORIA
                            </button>
                        </div>
                    </div>

                </div>

                <div id="modal-container-${windowId}"></div>
            </div>
        `;
    },

    // Genera el HTML del modal de confirmación de borrado
    getResetModalTemplate(windowId) {
        return `
            <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-b-[20px] pop-in">
                <div class="bg-white w-4/5 max-sm:w-full p-6 rounded-2xl shadow-2xl flex flex-col gap-4 items-center text-center border-2 border-red-100">
                    <div class="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mb-2">
                        <i data-lucide="trash-2" class="w-6 h-6"></i>
                    </div>
                    
                    <h3 class="text-lg font-bold text-gray-800">¿Estás seguro?</h3>
                    <p class="text-xs text-gray-500 leading-relaxed">
                        Esta acción borrará <b>TODOS</b> los archivos, carpetas, libros y módulos personalizados del sistema.<br>
                        <span class="text-green-600 font-bold">Tu API KEY se conservará.</span>
                    </p>

                    <div class="flex gap-3 w-full mt-2">
                        <button onclick="document.getElementById('modal-container-${windowId}').innerHTML=''" 
                            class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-xs transition-colors">
                            CANCELAR
                        </button>
                        <button onclick="ImportManager.executeReset('${windowId}')" 
                            class="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs shadow-lg transition-transform active:scale-95">
                            SÍ, BORRAR TODO
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Genera el HTML del loader de reinicio
    getResettingTemplate() {
        return `
            <div class="absolute inset-0 z-50 flex items-center justify-center bg-white rounded-b-[20px]">
                <div class="flex flex-col items-center gap-3 text-green-600 animate-pulse">
                    <i data-lucide="refresh-cw" class="w-8 h-8 animate-spin"></i>
                    <span class="text-sm font-bold">Reiniciando Sistema...</span>
                </div>
            </div>
        `;
    },

    // Utilidad para actualizar el texto de estado
    setStatus(windowId, msg, colorClass = "text-gray-500") {
        const el = document.getElementById(`import-status-${windowId}`);
        if (el) {
            el.innerHTML = msg;
            el.className = `text-[10px] font-bold ${colorClass}`;
        }
    }
};