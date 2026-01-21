/* SILENOS 3/clipboard/clipboard-javascript.js */

const JavascriptPasteHandler = {
    headerRegex: /\/\*\s*SILENOS\s+(.*?)\s*\*\//,
    jsPatterns: [
        /function\s+\w+\s*\(/,
        /(const|let|var)\s+\w+\s*=\s*/,
        /=>\s*{/,
        /class\s+\w+\s*{/,
        /console\.(log|warn|error|info)\(/,
        /import\s+.*?from\s+['"]/,
        /export\s+(default|const|class|function)/,
        /document\.querySelector/,
        /window\.addEventListener/
    ],
    keywords: ['return', 'async', 'await', 'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'],

    canHandleText(text) {
        if (!text || typeof text !== 'string') return false;
        
        if (this.headerRegex.test(text)) return true;

        const cleanText = text.trim();
        // IGNORAR JSON (si empieza y termina con llaves/corchetes, dejalo al JSON Handler)
        if ((cleanText.startsWith('{') && cleanText.endsWith('}')) || 
            (cleanText.startsWith('[') && cleanText.endsWith(']'))) {
            return false;
        }
        if (cleanText.length < 10) return false;

        const hasPattern = this.jsPatterns.some(regex => regex.test(cleanText));
        if (hasPattern) return true;

        let keywordCount = 0;
        this.keywords.forEach(kw => {
            if (new RegExp(`\\b${kw}\\b`).test(cleanText)) keywordCount++;
        });

        if (keywordCount >= 2 && (cleanText.includes('{') || cleanText.includes(';'))) return true;
        return false; 
    },

    _guessFileName(text) {
        const funcMatch = text.match(/function\s+(\w+)/);
        if (funcMatch) return `${funcMatch[1]}.js`;
        const classMatch = text.match(/class\s+(\w+)/);
        if (classMatch) return `${classMatch[1]}.js`;
        const constMatch = text.match(/const\s+(\w+)\s*=/);
        if (constMatch) return `${constMatch[1]}.js`;
        return `script-${Date.now()}.js`;
    },

    async handleText(text, destParentId, mouseX = null, mouseY = null) {
        console.log("📜 JavascriptHandler: Creando archivo JS...");

        let fileName = "script.js";
        const match = text.match(this.headerRegex);
        if (match && match[1]) {
            const parts = match[1].trim().split('/');
            fileName = parts[parts.length - 1];
        } else {
            fileName = this._guessFileName(text);
        }

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
            // CORRECCIÓN: Usar la fábrica oficial FileSystem.createJS
            // Esto asegura:
            // 1. Estructura correcta: content: { text: "..." }
            // 2. Persistencia: Llama a _markDirty() internamente para guardar en DB.
            const coords = { x: finalX || 100, y: finalY || 100, z: 0 };
            
            if (typeof FileSystem.createJS === 'function') {
                FileSystem.createJS(fileName, text, destParentId, coords);
                
                // Forzar guardado físico inmediato
                if (typeof FileSystem.save === 'function') FileSystem.save();

                if (typeof refreshSystemViews === 'function') refreshSystemViews();
                if (typeof showNotification === 'function') showNotification(`JS creado: ${fileName}`);
                return true;
            } else {
                console.error("Error: FileSystem.createJS no está disponible.");
            }
        }

        return false;
    },

    async canHandle(item) { return false; },
    async handle(item, destParentId, mouseX, mouseY) { return false; }
};

if (typeof ClipboardProcessor !== 'undefined') {
    ClipboardProcessor.registerHandler(JavascriptPasteHandler, 10);
}