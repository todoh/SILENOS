// --- UI-MODALS.JS ---
// Ventanas Modales y Selectores (File System)

Object.assign(window.UI, {

    openFolderSelect(nodeId) {
        this.currentNodeSelectingFolder = nodeId;
        const modal = document.getElementById('folder-selector-modal');
        const list = document.getElementById('folder-list');
        list.innerHTML = '';

        if (window.parent.rootHandle) {
            this.renderFolderOption(list, window.parent.rootHandle, 'ROOT', true);
            this.scanFolders(window.parent.rootHandle, list, 'ROOT');
        } else {
            list.innerHTML = '<div class="text-xs text-red-400 p-2">Root no montado en Silenos.</div>';
        }

        modal.classList.remove('hidden');
    },

    closeFolderModal() {
        document.getElementById('folder-selector-modal').classList.add('hidden');
        this.currentNodeSelectingFolder = null;
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

    renderFolderOption(list, handle, name, isRoot) {
        const div = document.createElement('div');
        div.className = "text-[10px] font-mono p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 truncate";
        div.innerHTML = `<i class="fa-solid fa-folder text-yellow-500"></i> ${name}`;
        div.onclick = () => {
            if (this.currentNodeSelectingFolder) {
                const node = Logic.nodes.find(n => n.id === this.currentNodeSelectingFolder);
                if (node) {
                    node.data.handle = handle;
                    node.data.pathName = name;
                    
                    // Actualizar UI del nodo inmediatamente
                    const btnSpan = document.querySelector(`#${node.id} button span`);
                    if(btnSpan) btnSpan.innerText = name;
                }
            }
            this.closeFolderModal();
        };
        list.appendChild(div);
    }
});