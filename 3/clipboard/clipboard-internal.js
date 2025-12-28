 

const InternalPasteHandler = {
    execute(ids, targetParentId, mouseX, mouseY) {
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
            
            this.duplicateItemRecursive(id, targetParentId, finalX, finalY, finalZ);
        });
    },

    duplicateItemRecursive(itemId, newParentId, x = 0, y = 0, z = 0) {
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
                this.duplicateItemRecursive(child.id, clone.id, 0, 0, 0);
            });
        }
    }
};