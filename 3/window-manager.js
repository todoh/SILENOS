/* SILENOS 3/window-manager.js */

const WindowManager = {
    windows: [],
    activeWindowId: null,
    zIndexCounter: 100,

    init() {
        console.log("🪟 WindowManager: Iniciado");
        this.setupDesktopEvents();
    },

    setupDesktopEvents() {
        document.getElementById('desktop')?.addEventListener('dblclick', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (icon) {
                const fileId = icon.dataset.id;
                this.openFile(fileId);
            }
        });
    },

    openFile(fileId) {
        if (typeof FileSystem === 'undefined') return;
        
        // CORRECCIÓN: Usar getItem, que es el método nativo de FileSystem
        const file = FileSystem.getItem(fileId);
        if (!file) return console.error("Archivo no encontrado:", fileId);

        console.log(`📂 Abriendo archivo: ${file.title} (Tipo: ${file.type}, Subtipo: ${file.subtype})`);

        // ---------------------------------------------------------
        // 🚀 INTERCEPTOR DE MODELOS 3D 
        // ---------------------------------------------------------
        // Detecta si es un GLB/GLTF por extensión, subtipo o mimeType
        const isGlb = (file.subtype === 'glb') || 
                      (file.title && /\.(glb|gltf)$/i.test(file.title)) ||
                      (file.mimeType && file.mimeType.includes('model/'));
        
        if (isGlb) {
            console.log("🚀 Detectado modelo 3D -> Abriendo Visor GLB");
            this.createWindow('3d-viewer', { fileId: fileId, title: file.title });
            return; 
        }

        // Ruteo Estándar
        switch (file.type) {
            case 'folder':
                this.createWindow('folder', { folderId: fileId });
                break;
                
            case 'js':
            case 'javascript':
            case 'html':
            case 'css':
            case 'json': 
            case 'text':
            case 'txt':
                this.createWindow('code-editor', { fileId: fileId });
                break;

            case 'image':
                this.createWindow('image', { fileId: fileId });
                break;

            case 'book':
                this.createWindow('book', { bookId: fileId });
                break;
            
            case 'gamebook':
                this.createWindow('gamebook', { gamebookId: fileId });
                break;

            case 'program':
                this.createWindow('programrunner', { programId: fileId });
                break;

            default:
                console.warn("Tipo desconocido, intentando editor:", file.type);
                this.createWindow('code-editor', { fileId: fileId });
                break;
        }
    },

    createWindow(type, params = {}) {
        const appConfig = (typeof APPS !== 'undefined') ? APPS.find(a => a.id === type) : null;
        
        const id = 'win-' + Date.now();
        const winData = {
            id: id,
            type: type, 
            title: params.title || appConfig?.title || 'Ventana',
            x: 100 + (this.windows.length * 20),
            y: 50 + (this.windows.length * 20),
            width: appConfig?.width || 600,
            height: appConfig?.height || 400,
            isMinimized: false,
            isMaximized: false,
            params: params,
            zIndex: ++this.zIndexCounter
        };

        this.windows.push(winData);
        this.renderWindow(winData);
        return id;
    },

    renderWindow(winData) {
        const winEl = document.createElement('div');
        winEl.id = `window-${winData.id}`;
        winEl.className = 'absolute bg-gray-900 border border-gray-700 shadow-xl rounded-lg flex flex-col overflow-hidden window-anim';
        winEl.style.width = `${winData.width}px`;
        winEl.style.height = `${winData.height}px`;
        winEl.style.left = `${winData.x}px`;
        winEl.style.top = `${winData.y}px`;
        winEl.style.zIndex = winData.zIndex;

        const appConfig = (typeof APPS !== 'undefined') ? APPS.find(a => a.id === winData.type) : null;
        const iconName = appConfig?.icon || 'app-window';

        winEl.innerHTML = `
            <div class="window-header bg-gray-800 px-3 py-2 flex justify-between items-center cursor-move select-none border-b border-gray-700" 
                 onmousedown="WindowManager.startDrag('${winData.id}', event)">
                <div class="flex items-center gap-2">
                    <i data-lucide="${iconName}" class="w-4 h-4 text-blue-400"></i>
                    <span id="title-${winData.id}" class="text-sm font-medium text-gray-200">${winData.title}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="WindowManager.minimizeWindow('${winData.id}')" class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><i data-lucide="minus" class="w-3 h-3"></i></button>
                    <button onclick="WindowManager.maximizeWindow('${winData.id}')" class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><i data-lucide="square" class="w-3 h-3"></i></button>
                    <button onclick="WindowManager.closeWindow('${winData.id}')" class="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400"><i data-lucide="x" class="w-3 h-3"></i></button>
                </div>
            </div>
            <div class="content-area flex-1 bg-gray-950 overflow-hidden relative">
                <div class="flex items-center justify-center h-full text-gray-500">
                    <span class="animate-pulse">Cargando aplicación...</span>
                </div>
            </div>
        `;

        document.getElementById('windows-container').appendChild(winEl);
        
        if (window.lucide) lucide.createIcons();

        this.loadWindowContent(winData);
        this.bringToFront(winData.id);
    },

    loadWindowContent(winData) {
        setTimeout(() => {
            switch (winData.type) {
                case 'folder':
                    if (typeof WindowFolder !== 'undefined') WindowFolder.render(winData.id, winData.params.folderId);
                    break;
                case 'code-editor':
                    if (typeof WindowCodeEditor !== 'undefined') WindowCodeEditor.render(winData.id, winData.params.fileId);
                    break;
                case 'image':
                    if (typeof WindowImage !== 'undefined') WindowImage.render(winData.id, winData.params.fileId);
                    break;
                case 'gamebook':
                    if (typeof WindowGamebook !== 'undefined') WindowGamebook.render(winData.id, winData.params.gamebookId);
                    break;
                case 'book':
                    if (typeof WindowBook !== 'undefined') WindowBook.render(winData.id, winData.params.bookId);
                    break;
                case 'programrunner':
                    if (typeof WindowProgramRunner !== 'undefined') WindowProgramRunner.render(winData.id, winData.params.programId);
                    break;
                
                // --- CARGA DEL VISOR 3D ---
                case '3d-viewer':
                    if (typeof Window3DViewer !== 'undefined') {
                        Window3DViewer.render(winData.id, winData.params.fileId);
                    } else {
                        import('./window/window-3d-viewer.js').then(module => {
                            window.Window3DViewer = module.default || module.Window3DViewer;
                            Window3DViewer.render(winData.id, winData.params.fileId);
                        }).catch(e => {
                            const container = document.querySelector(`#window-${winData.id} .content-area`);
                            if(container) container.innerHTML = `<div class="p-4 text-red-400">Error: Window3DViewer no encontrado.</div>`;
                        });
                    }
                    break;

                default:
                    const container = document.querySelector(`#window-${winData.id} .content-area`);
                    if(container) container.innerHTML = `<div class="p-4 text-red-400">Aplicación ${winData.type} no instalada.</div>`;
            }
        }, 50);
    },

    closeWindow(id) {
        const el = document.getElementById(`window-${id}`);
        if (el) el.remove();
        this.windows = this.windows.filter(w => w.id !== id);
    },

    minimizeWindow(id) {
        const el = document.getElementById(`window-${id}`);
        if (el) el.style.display = 'none';
        const win = this.windows.find(w => w.id === id);
        if (win) win.isMinimized = true;
    },

    maximizeWindow(id) {
        const el = document.getElementById(`window-${id}`);
        const win = this.windows.find(w => w.id === id);
        if (!el || !win) return;

        if (win.isMaximized) {
            el.style.width = `${win.width}px`;
            el.style.height = `${win.height}px`;
            el.style.left = `${win.x}px`;
            el.style.top = `${win.y}px`;
            win.isMaximized = false;
        } else {
            el.style.width = '100%';
            el.style.height = 'calc(100% - 40px)'; // Menos header
            el.style.left = '0';
            el.style.top = '0';
            win.isMaximized = true;
        }
    },

    bringToFront(id) {
        const win = this.windows.find(w => w.id === id);
        if (win) {
            win.zIndex = ++this.zIndexCounter;
            const el = document.getElementById(`window-${id}`);
            if (el) el.style.zIndex = win.zIndex;
            this.activeWindowId = id;
        }
    },

    startDrag(id, e) {
        if (e.target.closest('button')) return;
        
        this.bringToFront(id);
        const el = document.getElementById(`window-${id}`);
        const win = this.windows.find(w => w.id === id);
        
        if (!el || win.isMaximized) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const rect = el.getBoundingClientRect();
        const offsetX = startX - rect.left;
        const offsetY = startY - rect.top;

        const onMouseMove = (ev) => {
            let newX = ev.clientX - offsetX;
            let newY = ev.clientY - offsetY;
            
            if (newY < 0) newY = 0;
            
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
            
            win.x = newX;
            win.y = newY;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
};