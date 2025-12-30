/* SILENOS 3/clipboard/clipboard-html.js */

const HtmlPasteHandler = {
    htmlPatterns: [
        /<!DOCTYPE\s+html>/i,
        /<html.*?>/i,
        /<head.*?>/i,
        /<body.*?>/i,
        /<div.*?>.*?<\/div>/i,
        /<span.*?>.*?<\/span>/i,
        /<p.*?>.*?<\/p>/i,
        /<script.*?>.*?<\/script>/i,
        /<style.*?>.*?<\/style>/i,
        /<table.*?>/i,
        /<form.*?>/i
    ],

    canHandleText(text) {
        if (!text || typeof text !== 'string') return false;
        const cleanText = text.trim();

        // [NUEVO] Si empieza por estructura JSON, NO es un HTML raíz.
        // Esto evita que robe los backups del sistema.
        if (cleanText.startsWith('{') || cleanText.startsWith('[')) return false;

        if (cleanText.startsWith('<') && cleanText.endsWith('>')) {
            if (cleanText.includes('</') || cleanText.includes('/>')) return true;
        }
        return this.htmlPatterns.some(regex => regex.test(cleanText));
    },

    _guessFileName(text) {
        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            return titleMatch[1].replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
        }
        return `page-${Date.now()}.html`;
    },

    async handleText(text, destParentId, mouseX = null, mouseY = null) {
        console.log("🌐 HtmlHandler: Creando archivo HTML...");

        const fileName = this._guessFileName(text);
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

        if (typeof FileSystem !== 'undefined') {
            const newId = 'html-' + Date.now() + Math.random().toString(36).substr(2, 5);
            
            const newFile = {
                id: newId,
                type: 'html',        
                title: fileName,
                content: text,       
                parentId: destParentId,
                x: finalX || 100,
                y: finalY || 100,
                icon: 'layout',      
                color: 'text-orange-500'
            };

            FileSystem.data.push(newFile);
            FileSystem.save();

            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            if (typeof showNotification === 'function') showNotification(`HTML pegado: ${fileName}`);
            
            return true;
        }
        return false;
    },

    async canHandle(item) { return false; },
    async handle(item, destParentId, mouseX, mouseY) { return false; }
};

if (typeof ClipboardProcessor !== 'undefined') {
    ClipboardProcessor.registerHandler(HtmlPasteHandler, 20);
}