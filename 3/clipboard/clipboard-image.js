/* SILENOS 3/clipboard/clipboard-image.js */

const ImagePasteHandler = {
    async canHandle(item) {
        return item.type.indexOf("image") !== -1;
    },

    // [CORRECCIÓN] Aceptamos mouseX y mouseY
    async handle(item, destParentId, mouseX = null, mouseY = null) {
        const file = item.getAsFile();
        const b64Data = await FileSystem.saveImageFile(file);
        
        // 1. Cálculo de coordenadas
        let finalX, finalY;
        if (mouseX !== null && mouseY !== null) {
            if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                finalX = world.x;
                finalY = world.y;
            } else {
                finalX = mouseX;
                finalY = mouseY;
            }
        }

        if (b64Data) {
            // [CORRECCIÓN] Pasamos las coordenadas calculadas
            FileSystem.createImageItem(file.name || "Imagen Pegada", destParentId, b64Data, finalX, finalY);
            console.log("📸 ImagePasteHandler: Imagen materializada.");
            return true;
        }
        return false;
    }
};

// Auto-registro
ClipboardProcessor.registerHandler(ImagePasteHandler);