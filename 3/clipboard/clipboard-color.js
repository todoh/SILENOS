 

const ColorPasteHandler = {
    async canHandle(item) {
        return item.kind === "string";
    },

    async handle(item, destParentId) {
        return new Promise(resolve => {
            item.getAsString(text => {
                const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/i;
                if (colorRegex.test(text.trim())) {
                    FileSystem.createNarrative("Muestra de Color", destParentId);
                    const lastItem = FileSystem.data[FileSystem.data.length - 1];
                    lastItem.content.text = `Color: ${text.trim()}`;
                    lastItem.style = { backgroundColor: text.trim() };
                    FileSystem.save();
                    console.log("🎨 ColorPasteHandler: Color detectado.");
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    }
};

ClipboardProcessor.registerHandler(ColorPasteHandler);