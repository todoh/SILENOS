/* SILENOS 3/clipboard/clipboard-json.js */

const JsonPasteHandler = {
    
    _extractJsonFromText(text) {
        if (!text) return null;
        let clean = text.replace(/\u00A0/g, ' ').trim();
        
        // --- 1. LIMPIEZA DE MARKDOWN ---
        if (clean.startsWith('```')) {
            clean = clean.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
        }

        // --- 2. [CRÍTICO] PROTECCIÓN ANTI-ROBO ---
        // Si el texto limpio empieza claramente como HTML o JS, 
        // abortamos INMEDIATAMENTE para que los handlers específicos (HTML/JS) lo procesen.
        
        // A. Si parece HTML (empieza por < o doctype)
        if (clean.startsWith('<') || /^<!DOCTYPE/i.test(clean)) return null;

        // B. Si parece JS (empieza por keywords reservadas o comentarios)
        // Esto evita que robe archivos JS que empiezan con imports o clases
        const jsStartRegex = /^(import|export|const|let|var|function|class|window\.|document\.)\s/i;
        if (jsStartRegex.test(clean) || clean.startsWith('/*') || clean.startsWith('//')) return null;

        // --- 3. INTENTO DE PARSEO DIRECTO ---
        try { return JSON.parse(clean); } catch(e) {}

        // --- 4. BÚSQUEDA PROFUNDA (Smart Extract) ---
        // Solo llegamos aquí si NO parece código de otro tipo.
        let start = -1;
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');

        if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
        else if (firstBrace !== -1) start = firstBrace;
        else if (firstBracket !== -1) start = firstBracket;

        if (start === -1) return null;

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
                        let sub = clean.substring(start, i + 1);
                        try { 
                            const stringPattern = /"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*'/gs;
                            const sanitized = sub.replace(stringPattern, (match) => {
                                if (match.startsWith('"')) return match.replace(/\n/g, '\\n').replace(/\r/g, '');
                                return match;
                            });
                            return JSON.parse(sanitized);
                        } catch(err2) {}
                        return null; 
                    }
                }
            }
        }
        return null;
    },

    canHandleText(text) {
        const data = this._extractJsonFromText(text);
        return !!data;
    },

    async handleText(text, destParentId, mouseX, mouseY) {
        return await this._processJsonText(text, destParentId, mouseX, mouseY);
    },

    async canHandle(item) {
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
                    resolve(await this._processJsonText(text, destParentId, mouseX, mouseY));
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

    async _processJsonText(text, destParentId, mouseX = null, mouseY = null) {
        try {
            const data = this._extractJsonFromText(text);
            if (!data) return false;

            let items = Array.isArray(data) ? data : [data];

            // --- DETECCIÓN DE BACKUPS/SISTEMA ---
            const isSilenosItem = (obj) => {
                if (!obj || typeof obj !== 'object') return false;
                if (!obj.id || !obj.type) return false;
                
                if (obj.parentId !== undefined || (obj.x !== undefined && obj.y !== undefined)) return true;
                if (obj.content !== undefined) return true;

                const knownTypes = [
                    'executable', 'folder', 'link', 'image-link', 'window', 
                    'program', 'custom-module', 'book', 'file', 'image',
                    'javascript', 'css', 'html', 'json', 'text', 'markdown',
                    'chat', 'query', 'vector', 'backup', 'config'
                ];
                return knownTypes.includes(obj.type);
            };

            const validItems = items.filter(isSilenosItem);
            const purity = validItems.length / items.length;
            const looksLikeBackup = validItems.length > 0 && purity >= 0.5;

            if (looksLikeBackup) {
                console.log(`📦 JsonPasteHandler: ${validItems.length} items de sistema detectados. Importando...`);
                const batchIds = new Set(validItems.map(i => i.id));
                
                validItems.forEach((i, idx) => {
                    if (!i.id) i.id = 'paste-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                    if (!i.parentId || !batchIds.has(i.parentId)) {
                        if (i.type !== 'custom-module') {
                            i.parentId = destParentId;
                            if (mouseX !== null && mouseY !== null && i.x === undefined) {
                                const offset = idx * 20;
                                if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                                    const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                                    i.x = world.x + offset;
                                    i.y = world.y + offset;
                                    i.z = 0;
                                } else {
                                    i.x = mouseX + offset;
                                    i.y = mouseY + offset;
                                }
                            }
                        }
                    }
                });

                if (typeof ImportCore !== 'undefined') {
                    await ImportCore.importToSystem(validItems);
                    if (typeof showNotification === 'function') showNotification(`Backup restaurado: ${validItems.length} items`);
                    return true;
                }
            } 
            // CASO B: JSON Puro
            else {
                console.log(`📦 JsonPasteHandler: JSON Puro detectado. Creando archivo contenedor...`);
                
                let fx, fy;
                if (mouseX !== null && mouseY !== null) {
                    if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined') {
                        const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                        fx = world.x;
                        fy = world.y;
                    } else {
                        fx = mouseX;
                        fy = mouseY;
                    }
                }

                if (typeof FileSystem !== 'undefined') {
                    const newId = 'json-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
                    const newFile = {
                        id: newId,
                        type: 'json',         
                        title: `datos_${Date.now()}.json`,
                        content: data,        
                        parentId: destParentId,
                        x: fx || 100,
                        y: fy || 100,
                        icon: 'database',     
                        color: 'text-green-400'
                    };
                    
                    FileSystem.data.push(newFile);
                    FileSystem.save();
                    
                    if (typeof refreshSystemViews === 'function') refreshSystemViews();
                    if (typeof showNotification === 'function') showNotification("Archivo JSON de datos creado");
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error("Error procesando JSON:", err);
            return false;
        }
    }
};

ClipboardProcessor.registerHandler(JsonPasteHandler, 30);