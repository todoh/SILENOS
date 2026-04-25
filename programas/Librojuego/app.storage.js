// Archivo: Librojuego/app.storage.js

window.Core = window.Core || {};

Object.assign(window.Core, {
    targetHandle: null,
    saveTimer: null,
    
    // Variables de navegación para el explorador
    navStack: [],
    baseRootDir: null,
    favorites: [], // Registro de carpetas favoritas

    initStorage() {
        console.log("Storage nativo / Silenos Bridge inicializado.");
        this.loadFavorites();
    },

    loadFavorites() {
        try {
            this.favorites = JSON.parse(localStorage.getItem('omega_favorites')) || [];
        } catch(e) { 
            this.favorites = []; 
        }
    },

    saveFavorites() {
        localStorage.setItem('omega_favorites', JSON.stringify(this.favorites));
    },

    // Resuelve el handle de la carpeta recorriendo el path desde la raíz
    async getHandleFromPathArray(pathArray) {
        if (!this.baseRootDir) return null;
        let current = this.baseRootDir;
        for (const part of pathArray) {
            try {
                current = await current.getDirectoryHandle(part);
            } catch(e) {
                return null;
            }
        }
        return current;
    },

    async selectProjectFolder() {
        const modal = document.getElementById('folder-modal');
        
        // Si el modal ya está abierto, lo cerramos (comportamiento toggle)
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            return;
        }

        try {
            if (!this.baseRootDir) {
                // 1. ESTRATEGIA SILENOS: Usar la carpeta raíz montada en el padre
                if (window.parent && window.parent.currentHandle) {
                    this.baseRootDir = window.parent.currentHandle;
                } 
                // 2. ESTRATEGIA STANDALONE: Pedir carpeta al usuario (si se abre fuera de Silenos)
                else if (typeof window.showDirectoryPicker !== 'undefined') {
                    this.baseRootDir = await window.showDirectoryPicker({ mode: 'readwrite' });
                } else {
                    throw new Error("API de archivos no soportada en este navegador.");
                }

                // Verificar permisos
                const permission = await this.baseRootDir.queryPermission({ mode: 'readwrite' });
                if (permission !== 'granted') {
                    const request = await this.baseRootDir.requestPermission({ mode: 'readwrite' });
                    if (request !== 'granted') {
                        alert("Permisos denegados.");
                        this.baseRootDir = null;
                        return;
                    }
                }
            }

            // Iniciar navegación desde la raíz
            this.navStack = [this.baseRootDir];
            await this.renderFolderBrowser();

            // MOSTRAR EL MODAL
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }

        } catch (e) {
            if (e.name !== 'AbortError') {
                console.error("Error al abrir el selector:", e);
                alert("Error: " + e.message);
            }
        }
    },

    async renderFolderBrowser() {
        const listEl = document.getElementById('folder-list');
        const modal = document.getElementById('folder-modal');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!this.favorites) this.loadFavorites();

        const currentDir = this.navStack[this.navStack.length - 1];
        const currentPathArray = this.navStack.slice(1).map(h => h.name);

        // Breadcrumbs / Ruta actual
        const pathText = this.navStack.map(h => h.name).join(' / ');
        const header = document.createElement('div');
        header.className = "text-[10px] font-bold text-gray-500 mb-4 p-3 bg-gray-200 rounded-xl uppercase tracking-widest break-words shadow-inner";
        header.innerHTML = "<i class='fa-solid fa-location-dot mr-2'></i> " + pathText;
        listEl.appendChild(header);

        // Contenedor de Botones de Acción Principales
        const actionsContainer = document.createElement('div');
        actionsContainer.className = "flex gap-2 mb-4";
        
        // Botón: Usar ESTA carpeta
        const selectBtn = document.createElement('button');
        selectBtn.className = "flex-1 bg-green-600 text-white p-3 rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md text-[11px] uppercase";
        selectBtn.innerHTML = "<i class='fa-solid fa-check'></i> <span>USAR ESTA CARPETA</span>";
        selectBtn.onclick = async () => {
            await this.setProjectFolder(currentDir);
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };
        actionsContainer.appendChild(selectBtn);

        // Botón: Crear nueva carpeta dentro de la actual
        const createBtn = document.createElement('button');
        createBtn.className = "flex-1 bg-black text-white p-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-md text-[11px] uppercase";
        createBtn.innerHTML = "<i class='fa-solid fa-folder-plus'></i> <span>NUEVA CARPETA AQUÍ</span>";
        createBtn.onclick = async () => {
            const name = prompt("Nombre de la nueva carpeta:");
            if (name && name.trim() !== "") {
                try {
                    await currentDir.getDirectoryHandle(name.trim(), { create: true });
                    await this.renderFolderBrowser();
                    
                    // Refrescamos Universo Silenos si está activo
                    if (window.parent && typeof window.parent.Universe !== 'undefined') {
                        await window.parent.Universe.loadDirectory(window.parent.currentHandle);
                    }
                } catch(err) {
                    alert("No se pudo crear la carpeta: " + err.message);
                }
            }
        };
        actionsContainer.appendChild(createBtn);
        listEl.appendChild(actionsContainer);

        // Botón VOLVER (sólo si no estamos en la raíz)
        if (this.navStack.length > 1) {
            const backBtn = document.createElement('button');
            backBtn.className = "w-full bg-white border border-gray-300 p-3 rounded-xl text-left font-bold mb-3 hover:bg-gray-100 transition-all flex items-center text-gray-600 text-[11px] uppercase";
            backBtn.innerHTML = "<i class='fa-solid fa-level-up-alt mr-3 text-lg'></i> SUBIR AL NIVEL ANTERIOR";
            backBtn.onclick = async () => {
                this.navStack.pop();
                await this.renderFolderBrowser();
            };
            listEl.appendChild(backBtn);
        }

        // --- SECCIÓN DE FAVORITOS EN LA RAÍZ ---
        if (this.navStack.length === 1 && this.favorites && this.favorites.length > 0) {
            const favContainer = document.createElement('div');
            favContainer.className = "mb-4 border border-yellow-200 bg-yellow-50 rounded-xl p-3 shadow-sm";
            favContainer.innerHTML = `<div class="text-[10px] font-bold text-yellow-700 mb-2 uppercase tracking-widest"><i class="fa-solid fa-star"></i> Carpetas Favoritas</div>`;
            
            for (const fav of this.favorites) {
                const favItem = document.createElement('div');
                favItem.className = "flex items-center justify-between bg-white p-2 rounded-lg border border-yellow-100 mb-1 hover:border-yellow-300 transition-colors";
                
                const nameDiv = document.createElement('div');
                nameDiv.className = "flex items-center cursor-pointer flex-1 overflow-hidden";
                nameDiv.innerHTML = `<i class="fa-solid fa-star text-yellow-500 mr-3 shrink-0"></i> <span class="text-xs font-bold text-gray-700 truncate">${fav.name}</span><span class="text-[9px] text-gray-400 ml-2 truncate">(${fav.pathStr})</span>`;
                
                const btnEnter = document.createElement('button');
                btnEnter.className = "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 text-[10px] uppercase font-bold mr-2 shrink-0";
                btnEnter.innerHTML = "<i class='fa-solid fa-check'></i> <span class='hidden sm:inline'>ELEGIR</span>";
                btnEnter.title = "Seleccionar este proyecto directamente";
                btnEnter.onclick = async () => {
                    const handle = await this.getHandleFromPathArray(fav.pathArray);
                    if (handle) {
                        await this.setProjectFolder(handle);
                        modal.classList.add('hidden');
                        modal.classList.remove('flex');
                    } else {
                        alert("No se encontró la carpeta. Puede que haya sido movida o eliminada fuera del programa.");
                    }
                };

                const btnRemove = document.createElement('button');
                btnRemove.className = "bg-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors shrink-0";
                btnRemove.innerHTML = `<i class="fa-solid fa-trash"></i>`;
                btnRemove.title = "Quitar de favoritos";
                btnRemove.onclick = async () => {
                    this.favorites = this.favorites.filter(f => f.pathStr !== fav.pathStr);
                    this.saveFavorites();
                    await this.renderFolderBrowser();
                };
                
                const rightDiv = document.createElement('div');
                rightDiv.className = "flex items-center shrink-0";
                rightDiv.appendChild(btnEnter);
                rightDiv.appendChild(btnRemove);
                
                favItem.appendChild(nameDiv);
                favItem.appendChild(rightDiv);
                favContainer.appendChild(favItem);
            }
            listEl.appendChild(favContainer);
        }

        // Listar carpetas como acordeón
        let hasFolders = false;
        for await (const entry of currentDir.values()) {
            if (entry.kind === 'directory') {
                hasFolders = true;
                const folderNode = await this.createFolderAccordion(entry, currentDir, modal, 0, currentPathArray);
                listEl.appendChild(folderNode);
            }
        }

        if (!hasFolders) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = "text-center text-gray-400 text-[10px] mt-6 font-bold tracking-widest uppercase";
            emptyMsg.innerText = "NO HAY SUBCARPETAS AQUÍ";
            listEl.appendChild(emptyMsg);
        }
    },

    // Acordeón recursivo
    async createFolderAccordion(entry, parentHandle, modal, level, parentPathArray = []) {
        const handle = await parentHandle.getDirectoryHandle(entry.name);
        
        // Construimos el path completo desde la raíz
        const myPathArray = [...parentPathArray, entry.name];
        const myPathStr = myPathArray.join('/');
        
        const container = document.createElement('div');
        container.className = "w-full flex flex-col mb-2";

        const header = document.createElement('div');
        header.className = "w-full bg-white border border-gray-200 p-2 rounded-xl text-left font-bold hover:border-indigo-500 hover:shadow-md transition-all flex items-center justify-between text-gray-700 text-xs";
        
        // Espaciado en árbol
        if (level > 0) {
            header.style.marginLeft = `${level * 20}px`;
            header.style.width = `calc(100% - ${level * 20}px)`;
        }

        const nameContainer = document.createElement('div');
        nameContainer.className = "flex items-center cursor-pointer flex-1 overflow-hidden p-2 select-none";
        
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-folder text-indigo-400 mr-4 text-xl transition-transform duration-200';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = "truncate";
        titleSpan.innerText = entry.name;
        
        nameContainer.appendChild(icon);
        nameContainer.appendChild(titleSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = "flex gap-2 items-center shrink-0";

        // Botón de Favorito
        this.favorites = this.favorites || [];
        const isFav = this.favorites.some(f => f.pathStr === myPathStr);
        const starBtn = document.createElement('button');
        starBtn.className = isFav ? "text-yellow-500 hover:text-yellow-600 px-2 text-lg transition-colors" : "text-gray-300 hover:text-yellow-500 px-2 text-lg transition-colors";
        starBtn.innerHTML = `<i class="fa-solid fa-star"></i>`;
        starBtn.title = isFav ? "Quitar de Favoritos" : "Añadir a Favoritos";
        starBtn.onclick = async (e) => {
            e.stopPropagation();
            if (this.favorites.some(f => f.pathStr === myPathStr)) {
                this.favorites = this.favorites.filter(f => f.pathStr !== myPathStr);
            } else {
                this.favorites.push({ name: entry.name, pathStr: myPathStr, pathArray: myPathArray });
            }
            this.saveFavorites();
            await this.renderFolderBrowser(); 
        };

        const addSubBtn = document.createElement('button');
        addSubBtn.className = "bg-gray-100 text-gray-600 hover:bg-black hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center text-[10px]";
        addSubBtn.innerHTML = "<i class='fa-solid fa-plus'></i>";
        addSubBtn.title = "Crear subcarpeta aquí";
        
        const selectDirectBtn = document.createElement('button');
        selectDirectBtn.className = "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-[10px] uppercase font-bold";
        selectDirectBtn.innerHTML = "<i class='fa-solid fa-check'></i> <span class='hidden sm:inline'>ELEGIR</span>";
        selectDirectBtn.title = "Seleccionar este proyecto directamente";
        selectDirectBtn.onclick = async (e) => {
            e.stopPropagation();
            await this.setProjectFolder(handle);
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        };

        const drillDownBtn = document.createElement('button');
        drillDownBtn.className = "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-[10px] uppercase font-bold";
        drillDownBtn.innerHTML = "<i class='fa-solid fa-arrow-right-to-bracket'></i> <span class='hidden sm:inline'>ENTRAR</span>";
        drillDownBtn.title = "Navegar dentro de esta carpeta";
        drillDownBtn.onclick = async (e) => {
            e.stopPropagation();
            this.navStack.push(handle);
            await this.renderFolderBrowser();
        };

        actionsDiv.appendChild(starBtn); // Insertamos la estrella
        actionsDiv.appendChild(addSubBtn);
        actionsDiv.appendChild(drillDownBtn);
        actionsDiv.appendChild(selectDirectBtn);

        header.appendChild(nameContainer);
        header.appendChild(actionsDiv);
        container.appendChild(header);

        // Contenedor de subcarpetas (Acordeón desplegable)
        const subContainer = document.createElement('div');
        subContainer.className = "flex-col hidden mt-2"; 
        container.appendChild(subContainer);

        let isLoaded = false;
        let isOpen = false;

        const toggleFolder = async () => {
            isOpen = !isOpen;
            
            if (isOpen) {
                icon.classList.replace('fa-folder', 'fa-folder-open');
                subContainer.classList.remove('hidden');
                subContainer.classList.add('flex');
                
                if (!isLoaded) {
                    subContainer.innerHTML = `<div class="text-center text-[10px] text-gray-400 py-2" style="margin-left: ${(level+1)*20}px"><i class="fa-solid fa-spinner fa-spin"></i> Desplegando...</div>`;
                    
                    let hasSub = false;
                    subContainer.innerHTML = '';
                    for await (const subEntry of handle.values()) {
                        if (subEntry.kind === 'directory') {
                            hasSub = true;
                            // Pasamos el array de la ruta actual hacia los hijos
                            const subNode = await this.createFolderAccordion(subEntry, handle, modal, level + 1, myPathArray);
                            subContainer.appendChild(subNode);
                        }
                    }
                    
                    if (!hasSub) {
                        subContainer.innerHTML = `<div class="text-left text-[10px] text-gray-400 font-bold py-2" style="margin-left: ${(level+1)*20 + 10}px">No hay subcarpetas</div>`;
                    }
                    isLoaded = true;
                }
            } else {
                icon.classList.replace('fa-folder-open', 'fa-folder');
                subContainer.classList.add('hidden');
                subContainer.classList.remove('flex');
            }
        };

        nameContainer.onclick = async (e) => {
            e.stopPropagation();
            await toggleFolder();
        };

        addSubBtn.onclick = async (e) => {
            e.stopPropagation();
            const name = prompt(`Nueva carpeta dentro de "${entry.name}":`);
            if (name && name.trim() !== "") {
                try {
                    await handle.getDirectoryHandle(name.trim(), { create: true });
                    isLoaded = false; // Forzamos recarga
                    if (!isOpen) {
                        await toggleFolder(); 
                    } else {
                        isOpen = false; 
                        await toggleFolder(); 
                    }
                    if (window.parent && typeof window.parent.Universe !== 'undefined') {
                        await window.parent.Universe.loadDirectory(window.parent.currentHandle);
                    }
                } catch(err) {
                    alert("Error al crear subcarpeta: " + err.message);
                }
            }
        };

        return container;
    },

    async setProjectFolder(handle) {
        this.targetHandle = handle;
        
        const label = document.getElementById('folder-name-label');
        if (label) label.innerText = handle.name;
        
        // Refrescar el explorador de Silenos si está activo
        if (window.parent && typeof window.parent.Universe !== 'undefined') {
            await window.parent.Universe.loadDirectory(window.parent.currentHandle);
        }

        await this.loadBookFromDisk();
    },

    clearAllUIFields() {
        const titleEl = document.getElementById('book-title');
        if (titleEl) titleEl.value = "Nuevo Librojuego";

        const visualFields = ['vb-style', 'vb-characters', 'vb-places', 'vb-flora_fauna', 'vb-objects_tech', 'vb-clothing', 'vb-magic_fx'];
        visualFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const aiFields = ['ai-premise', 'ai-start', 'ai-ideal-end', 'ai-characters', 'ai-waypoints', 'ai-protagonist', 'ai-style', 'ai-json-input'];
        aiFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        const statFields = ['set-vida', 'set-poder', 'new-item-name'];
        statFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'new-item-name') el.value = '';
                else el.value = '10';
            }
        });
        
        const itemsList = document.getElementById('settings-items-list');
        if (itemsList) itemsList.innerHTML = '';
    },

    async loadBookFromDisk() {
        if (!this.targetHandle) return;
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Cargando libro...");
        
        this.clearAllUIFields();
        
        try {
            const fileHandle = await this.targetHandle.getFileHandle('book.json');
            const file = await fileHandle.getFile();
            const text = await file.text();
            this.book = JSON.parse(text);
            
            if (!this.book.initialState) this.book.initialState = { vida: 10, poder: 10, inventario: [] };
            if (!this.book.gameItems) this.book.gameItems = [];
            if (!this.book.mapElements) this.book.mapElements = { areas: [], emojis: [] };
            if (!this.book.visualBible) this.book.visualBible = "";
            
            for (let node of this.book.nodes) {
                if (node.imageUrl) {
                    try {
                        const imgHandle = await this.targetHandle.getFileHandle(node.imageUrl);
                        const imgFile = await imgHandle.getFile();
                        node._cachedImageUrl = URL.createObjectURL(imgFile);
                    } catch(err) {}
                }
                if (node.audioUrl) {
                    try {
                        const audHandle = await this.targetHandle.getFileHandle(node.audioUrl);
                        const audFile = await audHandle.getFile();
                        node._cachedAudioUrl = URL.createObjectURL(audFile);
                    } catch(err) {}
                }
            }

            const titleEl = document.getElementById('book-title');
            if (titleEl) titleEl.value = this.book.title;

            if (typeof AIVisual !== 'undefined' && AIVisual.loadManualBible) {
                AIVisual.loadManualBible(this.book.visualBible);
            }

            this.selectedNodeId = null;
            if (typeof Editor !== 'undefined' && Editor.hide) Editor.hide();
            if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
            if (typeof UI !== 'undefined' && UI.switchTab) UI.switchTab('canvas');
            
        } catch (e) {
            console.log("Creando book.json nuevo.");
            this.book = { title: "Nuevo Librojuego", visualBible: {}, nodes: [], initialState: { vida: 10, poder: 10, inventario: [] }, gameItems: [], mapElements: { areas: [], emojis: [] } };
            
            this.addNode("Inicio", "Despiertas en un lugar desconocido...", 100, 100);
            
            const titleEl = document.getElementById('book-title');
            if (titleEl) titleEl.value = this.book.title;
            
            if (typeof AIVisual !== 'undefined' && AIVisual.loadManualBible) {
                AIVisual.loadManualBible(this.book.visualBible);
            }
            
            this.selectedNodeId = null;
            if (typeof Editor !== 'undefined' && Editor.hide) Editor.hide();
            if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
            if (typeof UI !== 'undefined' && UI.switchTab) UI.switchTab('canvas');
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    scheduleSave() {
        if (!this.targetHandle) return; 
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.saveBookToDisk(), 400);
    },

    async saveBookToDisk() {
        if (!this.targetHandle) return;
        try {
            const fileHandle = await this.targetHandle.getFileHandle('book.json', { create: true });
            const writable = await fileHandle.createWritable();
            
            const saveObj = JSON.parse(JSON.stringify(this.book));
            saveObj.nodes.forEach(n => {
                delete n._cachedImageUrl;
                delete n._cachedAudioUrl;
            });

            await writable.write(JSON.stringify(saveObj, null, 2));
            await writable.close();
            console.log("Librojuego guardado automáticamente.");
        } catch (e) {
            console.error("Error guardando book.json:", e);
        }
    }
});