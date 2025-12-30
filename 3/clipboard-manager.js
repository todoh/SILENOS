/* SILENOS 3/clipboard/clipboard-json.js */

const JsonPasteHandler = {
    
    // Extractor Robusto Mejorado: Cuenta llaves para aislar JSON preciso
    _extractJsonFromText(text) {
        if (!text) return null;
        let clean = text.trim();
        
        // 1. Limpieza básica de Markdown
        if (clean.startsWith('```')) {
            clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
        }
        
        // 2. Intento directo (Rápido)
        try { return JSON.parse(clean); } catch(e) {}

        // 3. Búsqueda Inteligente (Bracket Counting)
        let start = -1;
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');

        if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
        else if (firstBrace !== -1) start = firstBrace;
        else if (firstBracket !== -1) start = firstBracket;

        if (start === -1) return null;

        // Algoritmo de conteo de pila para encontrar el cierre correcto
        let stack = 0;
        let inString = false;
        let escaped = false;
        const openChar = clean[start];
        const closeChar = openChar === '{' ? '}' : ']';
        
        for (let i = start; i < clean.length; i++) {
            const char = clean[i];

            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }

            if (!inString) {
                if (char === openChar) {
                    stack++;
                } else if (char === closeChar) {
                    stack--;
                    if (stack === 0) {
                        // Cierre encontrado
                        let sub = clean.substring(start, i + 1);
                        
                        try { return JSON.parse(sub); } catch(e) {
                            try {
                                const sanitized = sub.replace(/(".*?"|'.*?')/gs, (match) => {
                                    if (match.startsWith('"')) {
                                        return match.replace(/\n/g, '\\n').replace(/\r/g, '');
                                    }
                                    return match;
                                });
                                return JSON.parse(sanitized);
                            } catch(err2) {}
                        }
                        return null; 
                    }
                }
            }
        }
        return null;
    },

    canHandleText(text) {
        const data = this._extractJsonFromText(text);
        if (!data) return false;
        
        const items = Array.isArray(data) ? data : [data];
        
        // Verificación de Integridad Silenos
        return items.some(obj => obj && typeof obj === 'object' && (obj.type || obj.id));
    },

    async handleText(text, destParentId, mouseX, mouseY) {
        return await this._processJsonText(text, destParentId, mouseX, mouseY);
    },

    async canHandle(item) {
        // Ahora también detecta archivos reales .json
        if (item.kind === "string") return true;
        if (item.kind === "file") {
            const file = item.getAsFile();
            return file && (file.type === "application/json" || file.name.toLowerCase().endsWith('.json'));
        }
        return false;
    },

    async handle(item, destParentId, mouseX, mouseY) {
        if (item.kind === "string") {
            return new Promise(resolve => {
                item.getAsString(async (text) => {
                    const result = await this._processJsonText(text, destParentId, mouseX, mouseY);
                    resolve(result);
                });
            });
        } else if (item.kind === "file") {
            const file = item.getAsFile();
            if (!file) return false;
            const text = await file.text();
            return await this._processJsonText(text, destParentId, mouseX, mouseY);
        }
        return false;
    },

    // Lógica centralizada de procesamiento con posicionamiento espacial
    async _processJsonText(text, destParentId, mouseX = null, mouseY = null) {
        try {
            const data = this._extractJsonFromText(text);
            if (!data) return false;

            let items = Array.isArray(data) ? data : [data];

            // Filtro final de seguridad
            const isSilenosItem = (obj) => obj && typeof obj === 'object' && (obj.type || obj.id);
            const validItems = items.filter(isSilenosItem);

            if (validItems.length > 0) {
                console.log(`📦 JsonPasteHandler: ${validItems.length} items de sistema detectados.`);
                
                const batchIds = new Set(validItems.map(i => i.id));
                
                // Redirigir raíces al destino actual y aplicar coordenadas
                validItems.forEach((i, idx) => {
                    if (!i.id) i.id = 'paste-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

                    if (!i.parentId || !batchIds.has(i.parentId)) {
                        i.parentId = destParentId;

                        // Si es un item suelto o una App, forzamos la posición del ratón
                        if (validItems.length < 5 && mouseX !== null && mouseY !== null) {
                            const offset = idx * 25; // Ligero desplazamiento si hay varios
                            
                            if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                                i.x = world.x + offset;
                                i.y = world.y + offset;
                            } else {
                                i.x = mouseX + offset;
                                i.y = mouseY + offset;
                            }
                        }
                    }
                });

                if (typeof ImportCore !== 'undefined') {
                    await ImportCore.importToSystem(validItems);
                    return true;
                } else {
                    console.error("CRITICAL: ImportCore no está disponible.");
                    return false;
                }
            }
            return false;
        } catch (err) {
            console.error("Error procesando JSON Paste:", err);
            return false;
        }
    }
};

ClipboardProcessor.registerHandler(JsonPasteHandler);