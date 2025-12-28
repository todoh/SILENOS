 

const JsonPasteHandler = {
    async canHandle(item) {
        return item.kind === "string";
    },

    async handle(item, destParentId) {
        return new Promise(resolve => {
            item.getAsString(async (text) => {
                try {
                    const data = JSON.parse(text);
                    if (data.type || Array.isArray(data)) {
                        console.log("📦 JsonPasteHandler: Estructura detectada.");
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        const mockWinId = 'clipboard-import';
                        document.body.appendChild(textarea);
                        textarea.id = `import-text-${mockWinId}`;
                        await ImportManager.executeImport(mockWinId);
                        textarea.remove();
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    resolve(false);
                }
            });
        });
    }
};

ClipboardProcessor.registerHandler(JsonPasteHandler);