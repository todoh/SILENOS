 

const ImagePasteHandler = {
    async canHandle(item) {
        return item.type.indexOf("image") !== -1;
    },

    async handle(item, destParentId) {
        const file = item.getAsFile();
        const b64Data = await FileSystem.saveImageFile(file);
        if (b64Data) {
            FileSystem.createImageItem(file.name || "Imagen Pegada", destParentId, b64Data);
            console.log("📸 ImagePasteHandler: Imagen materializada.");
            return true;
        }
        return false;
    }
};

// Auto-registro
ClipboardProcessor.registerHandler(ImagePasteHandler);