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
                        
                        // [MEJORA] Intento de parseo estándar
                        try { return JSON.parse(sub); } catch(e) {
                            // [NUEVO] Si falla, intentamos sanear saltos de línea dentro de strings
                            // Esto permite pegar JSONs "sucios" con saltos de línea reales en el código
                            try {
                                const sanitized = sub.replace(/(".*?"|'.*?')/gs, (match) => {
                                    // Solo reemplazamos newlines dentro de comillas dobles
                                    if (match.startsWith('"')) {
                                        return match.replace(/\n/g, '\\n').replace(/\r/g, '');
                                    }
                                    return match;
                                });
                                return JSON.parse(sanitized);
                            } catch(err2) {
                                // Si falla incluso saneado, es un error fatal de sintaxis
                            }
                        }
                        return null; // Si falla aquí, la sintaxis interna estaba mal
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

    async handleText(text, destParentId) {
        return await this._processJsonText(text, destParentId);
    },

    async canHandle(item) {
        return item.kind === "string";
    },

    async handle(item, destParentId) {
        return new Promise(resolve => {
            item.getAsString(async (text) => {
                const result = await this._processJsonText(text, destParentId);
                resolve(result);
            });
        });
    },

    // Lógica centralizada de procesamiento
    async _processJsonText(text, destParentId) {
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
                
                // Redirigir raíces al destino actual
                validItems.forEach(i => {
                    if (!i.id) i.id = 'paste-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);

                    if (!i.parentId || !batchIds.has(i.parentId)) {
                        i.parentId = destParentId;
                    }
                });

                if (typeof ImportCore !== 'undefined') {
                    await ImportCore.importToSystem(validItems);
                    return true; // Éxito
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