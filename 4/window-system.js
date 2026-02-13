// --- WINDOW-SYSTEM.JS (MANAGER) ---

const WindowManager = {
    windows: [],
    zIndexCounter: 100,
    container: null,
    taskbarContainer: null,

    init() {
        this.container = document.getElementById('drop-zone'); 
        this.taskbarContainer = document.getElementById('taskbar-container');
        
        if (!this.container) {
            console.error("WindowManager: No se encontró el contenedor principal 'drop-zone'.");
            return;
        }
        
        this.container.style.position = 'relative'; 
        
        if (typeof WindowInteraction !== 'undefined') {
            WindowInteraction.init();
        }

        console.log("🔲 WindowManager: Sistema Suizo Inicializado.");
        this.renderTaskbar();
    },

    /**
     * Abre una nueva ventana
     * @param {string} title - Título
     * @param {any} content - Contenido (URL, Texto o FileHandle)
     * @param {string} type - 'html', 'iframe', 'image', 'video', 'txt', 'dir'
     */
    openWindow(title, content, type = 'html') {
        const id = 'win-' + Date.now() + Math.floor(Math.random() * 1000);
        this.zIndexCounter++;

        const offset = this.windows.length * 30;
        const initialX = 50 + (offset % 300);
        const initialY = 50 + (offset % 200);

        const winData = {
            id: id,
            title: title,
            type: type,
            handle: (type === 'dir') ? content : null, // Guardar handle si es dir
            isMaximized: false,
            zIndex: this.zIndexCounter,
            minimized: false // Estado minimizado
        };

        this.windows.push(winData);
        this.renderWindow(winData, content, initialX, initialY);
        
        // Actualizar barra de tareas
        this.renderTaskbar();
        this.focusWindow(id); // Para marcar como activo inmediatamente
        
        return id;
    },

    renderWindow(winData, contentSource, x, y) {
        const winEl = document.createElement('div');
        winEl.id = winData.id;
        winEl.className = 'silenos-window animate-entry';
        winEl.style.width = '800px';
        winEl.style.height = '550px';
        winEl.style.left = `${x}px`;
        winEl.style.top = `${y}px`;
        winEl.style.zIndex = winData.zIndex;

        // Botón extra de PASTE solo si es directorio
        const pasteBtn = winData.type === 'dir' 
            ? `<button class="win-btn ml-2 border border-white px-1 text-[10px]" onclick="Actions.pasteToWindow('${winData.id}')">[PASTE]</button>` 
            : '';

        winEl.innerHTML = `
            <div class="resize-handle res-n" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'n')"></div>
            <div class="resize-handle res-s" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 's')"></div>
            <div class="resize-handle res-e" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'e')"></div>
            <div class="resize-handle res-w" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'w')"></div>
            <div class="resize-handle res-ne" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'ne')"></div>
            <div class="resize-handle res-nw" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'nw')"></div>
            <div class="resize-handle res-se" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'se')"></div>
            <div class="resize-handle res-sw" onmousedown="WindowInteraction.startResize(event, '${winData.id}', 'sw')"></div>

            <div class="window-header" onmousedown="WindowInteraction.startDrag(event, '${winData.id}')">
                <div class="flex items-center gap-2 overflow-hidden">
                    <span class="window-title">${winData.title}</span>
                    ${pasteBtn}
                </div>
                <div class="window-controls">
                    <button class="win-btn" onclick="WindowManager.minimizeWindow('${winData.id}')">_</button>
                    <button class="win-btn" onclick="WindowManager.toggleMaximize('${winData.id}')">[ ]</button>
                    <button class="win-btn" onclick="WindowManager.closeWindow('${winData.id}')">X</button>
                </div>
            </div>

            <div class="window-content bg-white relative">
                <div class="window-overlay"></div> 
                ${this.generateContentHTML(winData.type, contentSource, winData.id)}
            </div>
        `;

        winEl.addEventListener('mousedown', () => {
            this.focusWindow(winData.id);
        });

        // Evento drop básico para evitar redirecciones
        winEl.addEventListener('dragover', e => e.preventDefault());
        winEl.addEventListener('drop', e => e.preventDefault());

        this.container.appendChild(winEl);

        // Post-render actions
        if (winData.type === 'dir') {
            this.populateDirectoryWindow(winData.id, contentSource);
        }
    },

    generateContentHTML(type, source, id) {
        if (type === 'iframe' || type === 'html') {
            return `<iframe srcdoc="${(typeof source === 'string' ? source : '').replace(/"/g, '&quot;')}" class="w-full h-full border-none" sandbox="allow-scripts allow-same-origin allow-forms allow-modals"></iframe>`;
        } else if (type === 'image') {
            return `<div class="w-full h-full flex items-center justify-center bg-gray-100">
                        <img src="${source}" class="max-w-full max-h-full object-contain">
                    </div>`;
        } else if (type === 'video') {
            return `<div class="w-full h-full flex items-center justify-center bg-black">
                        <video src="${source}" controls autoplay class="max-w-full max-h-full outline-none"></video>
                    </div>`;
        } else if (type === 'txt') {
            return `<textarea class="w-full h-full p-2 bg-white font-mono text-sm resize-none border-none outline-none" readonly>${source}</textarea>`;
        } else if (type === 'dir') {
            // Contenedor para los iconos
            return `<div id="win-dir-${id}" class="w-full h-full p-4 overflow-auto grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4 content-start">
                        <div class="text-xs font-mono text-gray-400 col-span-full">LOADING...</div>
                    </div>`;
        }
        return `<div class="p-4">Contenido desconocido</div>`;
    },

    async populateDirectoryWindow(winId, dirHandle) {
        const container = document.getElementById(`win-dir-${winId}`);
        if (!container) return;

        container.innerHTML = ''; // Clear loading

        try {
            const entries = [];
            for await (const entry of dirHandle.values()) {
                entries.push(entry);
            }
            
            // Ordenar: Carpetas primero
            entries.sort((a, b) => {
                if (a.kind === b.kind) return a.name.localeCompare(b.name);
                return a.kind === 'directory' ? -1 : 1;
            });

            if (entries.length === 0) {
                container.innerHTML = '<div class="text-xs font-mono text-gray-400 col-span-full">EMPTY FOLDER</div>';
                return;
            }

            for (const entry of entries) {
                const itemEl = document.createElement('div');
                itemEl.className = 'flex flex-col items-center gap-1 p-2 hover:bg-gray-100 cursor-pointer group rounded';
                
                let visualContent = '';

                // --- LOGICA DE VISUALIZACIÓN DE ICONOS/IMAGENES/VIDEOS ---
                if (entry.kind === 'directory') {
                     visualContent = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
                } else {
                    // Detección de tipos
                    const isImage = entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
                    const isVideo = entry.name.match(/\.(mp4|webm|ogg|mov|m4v)$/i);
                    const isJson = entry.name.endsWith('.json');
                    
                    if (isImage) {
                        try {
                            const file = await entry.getFile();
                            const blobUrl = URL.createObjectURL(file);
                            visualContent = `<div class="w-10 h-10 flex items-center justify-center overflow-hidden bg-gray-50 border border-gray-200">
                                                <img src="${blobUrl}" class="w-full h-full object-cover" style="pointer-events: none;">
                                             </div>`;
                        } catch (e) {
                            visualContent = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
                        }
                    } else if (isVideo) {
                        try {
                            const file = await entry.getFile();
                            const blobUrl = URL.createObjectURL(file);
                            visualContent = `<div class="w-10 h-10 flex items-center justify-center overflow-hidden bg-black border border-gray-200 relative">
                                                <video src="${blobUrl}" muted loop class="w-full h-full object-cover" onmouseover="this.play()" onmouseout="this.pause()"></video>
                                                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div class="w-0 h-0 border-t-[3px] border-t-transparent border-l-[6px] border-l-white border-b-[3px] border-b-transparent ml-0.5"></div>
                                                </div>
                                             </div>`;
                        } catch (e) {
                             visualContent = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
                        }
                    } else if (isJson) {
                        // --- DETECCIÓN DE CONTENIDO JSON VISUAL ---
                        try {
                            const file = await entry.getFile();
                            const text = await file.text();
                            const json = JSON.parse(text);
                            
                            if (json.imagen64 && typeof json.imagen64 === 'string') {
                                const src = json.imagen64.startsWith('data:') 
                                    ? json.imagen64 
                                    : `data:image/png;base64,${json.imagen64}`;
                                    
                                visualContent = `<div class="w-10 h-10 flex items-center justify-center overflow-hidden bg-white border-2 border-black">
                                                    <img src="${src}" class="w-full h-full object-cover" style="pointer-events: none;">
                                                 </div>`;
                            } else {
                                visualContent = `<div class="w-10 h-10 flex items-center justify-center border border-gray-200 bg-white">
                                                    <span class="text-[8px] font-mono font-bold">JSON</span>
                                                 </div>`;
                            }
                        } catch(e) {
                             visualContent = `<div class="w-10 h-10 flex items-center justify-center border border-gray-200 bg-white">
                                                <span class="text-[8px] font-mono">{}</span>
                                             </div>`;
                        }
                    } else {
                        // Archivo Genérico
                        visualContent = `<div class="w-10 h-10 flex items-center justify-center">
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                         </div>`;
                    }
                }

                itemEl.innerHTML = `
                    ${visualContent}
                    <span class="text-[10px] font-mono text-center break-words leading-tight w-full" 
                          style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                        ${entry.name}
                    </span>
                `;

                // INTERACCIÓN
                itemEl.onclick = async (e) => {
                    e.stopPropagation();
                    if (entry.kind === 'directory') {
                        WindowManager.openWindow(entry.name, entry, 'dir');
                    } else {
                        // FIX: PASAMOS dirHandle COMO CONTEXTO AL ABRIR
                        if (typeof handleOpenFile === 'function') handleOpenFile(entry, dirHandle);
                    }
                };

                itemEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof Actions !== 'undefined') {
                        Actions.openContextMenu(e.clientX, e.clientY, entry, dirHandle);
                    }
                });

                container.appendChild(itemEl);
            }
            
            // Listener de fondo
            container.addEventListener('contextmenu', (e) => {
                if(e.target === container) {
                    e.preventDefault();
                    if (typeof Actions !== 'undefined') {
                         Actions.openContextMenu(e.clientX, e.clientY, null, dirHandle);
                    }
                }
            });

        } catch (err) {
            console.error("Error leyendo directorio ventana:", err);
            container.innerHTML = '<div class="text-red-500 text-xs">ERROR READING DIR</div>';
        }
    },

    closeWindow(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
        this.windows = this.windows.filter(w => w.id !== id);
        this.renderTaskbar(); // Update taskbar
    },

    toggleMaximize(id) {
        const el = document.getElementById(id);
        const win = this.windows.find(w => w.id === id);
        if (!el || !win) return;

        if (win.isMaximized) {
            el.style.width = win.prevWidth;
            el.style.height = win.prevHeight;
            el.style.left = win.prevLeft;
            el.style.top = win.prevTop;
            el.setAttribute('data-maximized', 'false');
            win.isMaximized = false;
        } else {
            win.prevWidth = el.style.width;
            win.prevHeight = el.style.height;
            win.prevLeft = el.style.left;
            win.prevTop = el.style.top;
            el.style.width = '100%';
            el.style.height = '100%';
            el.style.left = '0';
            el.style.top = '0';
            el.setAttribute('data-maximized', 'true');
            win.isMaximized = true;
        }
        this.focusWindow(id); // Traer al frente al maximizar
    },

    minimizeWindow(id) {
        const el = document.getElementById(id);
        const win = this.windows.find(w => w.id === id);
        if (el && win) {
            el.classList.add('hidden');
            win.minimized = true;
            
            // Buscar la siguiente ventana activa más alta
            const activeWindows = this.windows.filter(w => !w.minimized && w.id !== id);
            if (activeWindows.length > 0) {
                 activeWindows.sort((a,b) => b.zIndex - a.zIndex);
                 this.focusWindow(activeWindows[0].id);
            } else {
                 this.renderTaskbar(); 
            }
        }
    },

    focusWindow(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            this.zIndexCounter++;
            win.zIndex = this.zIndexCounter;
            win.minimized = false; 

            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('hidden'); 
                el.style.zIndex = win.zIndex;
                
                document.querySelectorAll('.silenos-window').forEach(w => w.classList.remove('active'));
                el.classList.add('active');
            }
            this.renderTaskbar(); 
        }
    },

    // --- TASKBAR RENDERER (SWISS STYLE) ---
    renderTaskbar() {
        if (!this.taskbarContainer) return;
        this.taskbarContainer.innerHTML = '';

        let activeId = null;
        const visibleWindows = this.windows.filter(w => !w.minimized);
        if (visibleWindows.length > 0) {
            const topWin = visibleWindows.reduce((prev, current) => (prev.zIndex > current.zIndex) ? prev : current);
            activeId = topWin.id;
        }

        this.windows.forEach(win => {
            const btn = document.createElement('button');
            const isActive = (win.id === activeId) && !win.minimized;
            
            btn.className = `taskbar-item ${isActive ? 'active' : ''}`;
            const typeLabel = win.type === 'dir' ? 'DIR' : win.type.toUpperCase();
            btn.textContent = `[ ${typeLabel} : ${win.title} ]`;
            
            btn.onclick = (e) => {
                e.stopPropagation();
                if (isActive) {
                    this.minimizeWindow(win.id);
                } else {
                    this.focusWindow(win.id);
                }
            };
            
            this.taskbarContainer.appendChild(btn);
        });
    }
};

window.spawnWindow = function(title, content, type) {
    WindowManager.openWindow(title, content, type);
};

if (document.readyState === 'complete') {
    WindowManager.init();
} else {
    window.addEventListener('load', () => WindowManager.init());
}