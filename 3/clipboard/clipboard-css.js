/* SILENOS 3/clipboard/clipboard-css.js */

const CssPasteHandler = {
    cssPatterns: [
        /^[a-z0-9\.\-#\s,>+~:]+\s*\{/im,
        /@media\s/i,
        /@import\s/i,
        /@font-face\s/i,
        /@keyframes\s/i,
        /:\s*root\s*\{/i
    ],
    commonProps: ['display:', 'color:', 'background:', 'font-size:', 'margin:', 'padding:', 'border:'],

    canHandleText(text) {
        if (!text || typeof text !== 'string') return false;
        const cleanText = text.trim();

        if (cleanText.startsWith('{') || cleanText.startsWith('{"')) return false;

        const hasSelectorBlock = this.cssPatterns.some(regex => regex.test(cleanText));
        if (hasSelectorBlock) {
            const hasProps = this.commonProps.some(prop => cleanText.includes(prop));
            if (hasProps) return true;
        }
        return false;
    },

    _guessFileName(text) {
        const idMatch = text.match(/#([a-z0-9\-_]+)/i);
        if (idMatch) return `${idMatch[1]}.css`;
        return `styles-${Date.now()}.css`;
    },

    async handleText(text, destParentId, mouseX = null, mouseY = null) {
        console.log("🎨 CssHandler: Creando archivo CSS...");

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
            // Inyección Directa Manual
            const newId = 'css-' + Date.now() + Math.random().toString(36).substr(2, 5);
            
            const newFile = {
                id: newId,
                type: 'css',        // Tipo específico
                title: fileName,
                content: text,
                parentId: destParentId,
                x: finalX || 100,
                y: finalY || 100,
                icon: 'palette',    // Icono visual
                color: 'text-blue-400'
            };

            FileSystem.data.push(newFile);
            FileSystem.save();

            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            if (typeof showNotification === 'function') showNotification(`CSS pegado: ${fileName}`);
            
            return true;
        }

        return false;
    },

    async canHandle(item) { return false; },
    async handle(item, destParentId, mouseX, mouseY) { return false; }
};

if (typeof ClipboardProcessor !== 'undefined') {
    ClipboardProcessor.registerHandler(CssPasteHandler, 10);
}