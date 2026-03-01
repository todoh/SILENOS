// --- BLUEPRINT-MANAGER.JS ---

window.BlueprintManager = {
    blueprintsHandle: null,
    folderName: null,

    init() {
        const btn = document.getElementById('btn-blueprints');
        const menu = document.getElementById('menu-blueprints');
        
        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
                if (!menu.classList.contains('hidden')) {
                    this.refreshList();
                }
            });
            window.addEventListener('click', () => menu.classList.add('hidden'));
            menu.addEventListener('click', (e) => e.stopPropagation());
        }
        console.log("Blueprint Manager Initialized.");
    },

    async selectFolder() {
        const FS = window.parent; 
        
        if (!FS.rootHandle) {
            alert("Silenos Root no montado.");
            return;
        }

        const modal = document.getElementById('folder-selector-modal');
        const list = document.getElementById('folder-list');
        const title = modal.querySelector('h3');
        
        title.innerText = "SELECCIONAR CARPETA DE PLANOS";
        list.innerHTML = '';
        
        this.renderFolderOption(list, FS.rootHandle, 'ROOT', true);
        await this.scanFolders(FS.rootHandle, list, 'ROOT');
        
        modal.classList.remove('hidden');
    },

    async scanFolders(dirHandle, list, path, depth=0) {
        if(depth > 2) return;
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'directory') {
                const currentPath = `${path}/${entry.name}`;
                this.renderFolderOption(list, entry, currentPath);
                await this.scanFolders(entry, list, currentPath, depth+1);
            }
        }
    },

    renderFolderOption(list, handle, name) {
        const div = document.createElement('div');
        div.className = "text-[10px] font-mono p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 truncate";
        div.innerHTML = `<i class="fa-solid fa-folder text-blue-500"></i> ${name}`;
        div.onclick = () => {
            this.setBlueprintFolder(handle, name);
            UI.closeFolderModal();
        };
        list.appendChild(div);
    },

    setBlueprintFolder(handle, name) {
        this.blueprintsHandle = handle;
        this.folderName = name;
        const label = document.getElementById('blueprint-folder-label');
        if(label) label.innerText = name;
        window.app.log(`Carpeta de Planos montada: ${name}`, "success");
        this.refreshList();
    },

    // --- AQUÍ ESTÁ EL CAMBIO CLAVE (FILTRO) ---
    async refreshList() {
        const listContainer = document.getElementById('blueprint-list');
        if (!listContainer) return;
        listContainer.innerHTML = '<div class="p-2 text-[9px] text-gray-400 flex items-center gap-2"><i class="fa-solid fa-spinner fa-spin"></i> Escaneando...</div>';

        if (!this.blueprintsHandle) {
            listContainer.innerHTML = '<div class="p-2 text-[9px] text-gray-400">Selecciona carpeta primero.</div>';
            return;
        }

        try {
            listContainer.innerHTML = ''; // Limpiar loader
            let found = false;

            for await (const entry of this.blueprintsHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                    // VERIFICACIÓN INTELIGENTE
                    try {
                        const file = await entry.getFile();
                        // Leemos el texto para comprobar si es un blueprint válido
                        const text = await file.text();
                        const json = JSON.parse(text);

                        // CRITERIO DE FILTRADO:
                        // 1. Tiene la firma nueva "koreh-blueprint"
                        // 2. O tiene estructura antigua válida (nodes array + connections array)
                        const isValid = (json.app === 'koreh-blueprint') || 
                                      (Array.isArray(json.nodes) && Array.isArray(json.connections));

                        if (isValid) {
                            this.renderBlueprintItem(listContainer, entry);
                            found = true;
                        }
                    } catch (err) {
                        // Si falla al leer o parsear, simplemente lo ignoramos (no es un blueprint válido)
                    }
                }
            }
            
            if (!found) {
                listContainer.innerHTML = '<div class="p-4 text-center text-[9px] text-gray-300">No hay planos en esta carpeta.</div>';
            }

        } catch (e) {
            console.error(e);
            listContainer.innerHTML = '<div class="p-2 text-red-500">Error leyendo carpeta.</div>';
        }
    },

    renderBlueprintItem(container, handle) {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between p-2 hover:bg-gray-50 border-b border-gray-100 group";
        div.innerHTML = `
            <div class="flex items-center gap-2 overflow-hidden w-full">
                <i class="fa-solid fa-code-branch text-purple-400 text-[10px]"></i>
                <span class="text-[10px] font-mono text-gray-600 truncate cursor-pointer hover:text-black hover:font-bold transition-all w-32" onclick="BlueprintManager.load('${handle.name}')">
                    ${handle.name.replace('.json', '')}
                </span>
            </div>
            <button onclick="BlueprintManager.delete('${handle.name}')" class="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                <i class="fa-solid fa-trash text-[10px]"></i>
            </button>
        `;
        container.appendChild(div);
    },

    async save() {
        if (!this.blueprintsHandle) {
            alert("Selecciona una carpeta de planos primero.");
            this.selectFolder();
            return;
        }

        const name = prompt("Nombre del Plano (sin extensión):", "mi_flujo_v1");
        if (!name) return;

        const filename = `${name}.json`;
        const data = Logic.serializeState();
        const jsonStr = JSON.stringify(data, null, 2);

        try {
            const fileHandle = await this.blueprintsHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(jsonStr);
            await writable.close();
            
            window.app.log(`Plano guardado: ${filename}`, "success");
            this.refreshList();
        } catch (e) {
            window.app.log(`Error guardando: ${e.message}`, "error");
        }
    },

    async load(filename) {
        if (!confirm("Cargar este plano borrará el lienzo actual. ¿Continuar?")) return;

        try {
            const fileHandle = await this.blueprintsHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);

            Logic.loadState(data);
            document.getElementById('menu-blueprints').classList.add('hidden');

        } catch (e) {
            window.app.log(`Error cargando: ${e.message}`, "error");
        }
    },

    async delete(filename) {
        if (!confirm(`¿Borrar definitivamente ${filename}?`)) return;
        
        try {
            await this.blueprintsHandle.removeEntry(filename);
            this.refreshList();
            window.app.log(`Borrado: ${filename}`, "info");
        } catch (e) {
            window.app.log(`Error borrando: ${e.message}`, "error");
        }
    }
};

window.addEventListener('load', () => setTimeout(() => BlueprintManager.init(), 500));