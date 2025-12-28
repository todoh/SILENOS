/* SILENOS 3/clipboard/clipboard-link.js */

const LinkPasteHandler = {
    urlRegex: /^(https?:\/\/[^\s]+)$/i,
    ytRegex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i,

    canHandleText(text) {
        const cleanText = text.trim();
        // Solo maneja si es URL y NO es de YouTube
        return this.urlRegex.test(cleanText) && !this.ytRegex.test(cleanText);
    },

    async handleText(text, destParentId) {
        const url = text.trim();
        const id = 'link-' + Date.now();
        
        const newItem = {
            id: id,
            type: 'launcher',
            title: "Enlace Web",
            parentId: destParentId,
            icon: '🌐',
            action: `window.open('${url}', '_blank')`,
            x: 50, y: 50, z: 0
        };
        
        FileSystem.data.push(newItem);
        FileSystem.save();
        console.log("🔗 Enlace Genérico creado:", url);
        return true;
    }
};

ClipboardProcessor.registerHandler(LinkPasteHandler);