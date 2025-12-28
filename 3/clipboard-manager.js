/* SILENOS 3/clipboard-manager.js */

const SystemClipboard = {
    ids: [],
    sourceMode: 'copy',

    copy(ids) {
        this.ids = [...ids];
        this.sourceMode = 'copy';
        console.log("Portapapeles: Copiado", this.ids);
    },

    hasItems() { return this.ids.length > 0; },
    getIds() { return this.ids; }
};

document.addEventListener('paste', async (e) => {
    let destParentId = 'desktop';
    if (typeof openWindows !== 'undefined' && openWindows.length > 0) {
        const activeWin = [...openWindows].sort((a, b) => b.zIndex - a.zIndex).find(w => !w.isMinimized);
        if (activeWin && activeWin.type === 'folder') {
            destParentId = activeWin.folderId;
        }
    }

    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            const file = items[i].getAsFile();
            // El nuevo saveImageFile redimensiona a 150x150 y devuelve Base64
            const b64Data = await FileSystem.saveImageFile(file);
            if (b64Data) {
                FileSystem.createImageItem(file.name || "Imagen Pegada", destParentId, b64Data);
                console.log("📸 Materia visual (150px Base64) materializada.");
            }
        } 
        else if (items[i].kind === "string") {
            items[i].getAsString(async (text) => {
                try {
                    const data = JSON.parse(text);
                    if (data.type || Array.isArray(data)) {
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        const mockWinId = 'clipboard-import';
                        document.body.appendChild(textarea);
                        textarea.id = `import-text-${mockWinId}`;
                        await ImportManager.executeImport(mockWinId);
                        textarea.remove();
                        return;
                    }
                } catch (err) {
                    FileSystem.createNarrative("Nota de Portapapeles", destParentId);
                    const lastItem = FileSystem.data[FileSystem.data.length - 1];
                    lastItem.content.text = text;
                    FileSystem.save();
                }
            });
        }
    }

    if (typeof refreshSystemViews === 'function') refreshSystemViews();
});

function handlePasteAction(targetParentId, mouseX, mouseY) {
    const ids = SystemClipboard.getIds();
    FileSystem.init();

    ids.forEach((id, index) => {
        let finalX, finalY, finalZ;
        
        if (targetParentId === 'desktop') {
            if (typeof ThreeDesktop !== 'undefined') {
                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                finalX = world.x - 48 + (index * 20);
                finalY = world.y - 48 + (index * 20);
                finalZ = world.z;
            } else {
                finalX = mouseX - 48 + (index * 20);
                finalY = mouseY - 48 + (index * 20);
                finalZ = 0; 
            }
        } else {
            finalX = index * 15;
            finalY = index * 15;
            finalZ = 0;
        }
        
        duplicateItemRecursive(id, targetParentId, finalX, finalY, finalZ);
    });

    FileSystem.save();
    if (typeof refreshSystemViews === 'function') refreshSystemViews();
}

function duplicateItemRecursive(itemId, newParentId, x = 0, y = 0, z = 0) {
    const original = FileSystem.getItem(itemId);
    if (!original) return;

    const clone = JSON.parse(JSON.stringify(original));
    clone.id = original.type + '-' + Date.now() + Math.floor(Math.random() * 1000000);
    clone.parentId = newParentId;
    
    clone.title = clone.title.includes('(Copia)') ? clone.title + " 2" : clone.title + " (Copia)";
    clone.x = x;
    clone.y = y;
    clone.z = z;
    
    FileSystem.data.push(clone);

    if (original.type === 'folder') {
        const children = FileSystem.getItems(itemId);
        children.forEach(child => {
            duplicateItemRecursive(child.id, clone.id, 0, 0, 0);
        });
    }
}