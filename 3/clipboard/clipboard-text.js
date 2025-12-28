 

const TextPasteHandler = {
    async canHandle(item) {
        return item.kind === "string";
    },

    async handle(item, destParentId) {
        return new Promise(resolve => {
            item.getAsString(text => {
                console.log("📝 TextPasteHandler: Creando nota estándar.");
                FileSystem.createNarrative("Nota de Portapapeles", destParentId);
                const lastItem = FileSystem.data[FileSystem.data.length - 1];
                lastItem.content.text = text;
                FileSystem.save();
                resolve(true);
            });
        });
    }
};

// Siempre registrar al final para que actúe como último recurso
ClipboardProcessor.registerHandler(TextPasteHandler);