/* SILENOS 3/import-core.js */
/* Responsable de la Lógica de Datos, Procesamiento de Archivos y FileSystem */

const ImportCore = {
    
    // Procesa los items arrastrados (Entry API)
    async processDroppedItems(dataTransferItems) {
        const entries = [];
        for (let i = 0; i < dataTransferItems.length; i++) {
            const item = dataTransferItems[i];
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
                if (entry) entries.push(entry);
            }
        }

        const collectedItems = [];
        for (const entry of entries) {
            await this.processRecursiveEntry(entry, collectedItems);
        }
        return collectedItems;
    },

    // Extractor Inteligente: Cuenta llaves para aislar JSON entre texto basura
    _smartJsonExtract(text) {
        if (!text) return null;
        let start = -1;
        const firstBrace = text.indexOf('{');
        const firstBracket = text.indexOf('[');

        // 1. Encontrar el inicio real
        if (firstBrace !== -1 && firstBracket !== -1) start = Math.min(firstBrace, firstBracket);
        else if (firstBrace !== -1) start = firstBrace;
        else if (firstBracket !== -1) start = firstBracket;

        if (start === -1) return null;

        // 2. Recorrer carácter a carácter contando niveles
        let stack = 0;
        let inString = false;
        let escaped = false;
        const openChar = text[start];
        const closeChar = openChar === '{' ? '}' : ']';
        
        for (let i = start; i < text.length; i++) {
            const char = text[i];

            if (escaped) { escaped = false; continue; }
            if (char === '\\') { escaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }

            if (!inString) {
                if (char === openChar) {
                    stack++;
                } else if (char === closeChar) {
                    stack--;
                    if (stack === 0) {
                        // ¡Fin del objeto encontrado!
                        const jsonStr = text.substring(start, i + 1);
                        try { return JSON.parse(jsonStr); } catch (e) { return null; }
                    }
                }
            }
        }
        return null;
    },

    // Lógica recursiva para leer carpetas y archivos
    async processRecursiveEntry(entry, list, parentId = 'desktop') {
        if (entry.isFile) {
            const file = await new Promise((res) => entry.file(res));
            const name = file.name.toLowerCase();
            const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);

            if (isImage) {
                const savedName = await FileSystem.saveImageFile(file);
                if (savedName) {
                    list.push({
                        id: 'image-' + Date.now() + Math.random().toString(36).substr(2, 5),
                        type: 'image',
                        title: file.name,
                        content: savedName,
                        parentId: parentId,
                        icon: 'image',
                        color: 'text-blue-400',
                        x: 100 + Math.random() * 100,
                        y: 100 + Math.random() * 100
                    });
                }
            } 
            else if (name.endsWith('.json')) {
                const text = await file.text();
                try { 
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                        data.forEach(d => { if(d.type && !d.id) d.id = 'gen-' + Date.now() + Math.random(); });
                        list.push(...data);
                    }
                    else {
                        if (data.type && !data.id) data.id = 'gen-' + Date.now();
                        list.push(data);
                    }
                } catch(e) { console.error("Error parseando JSON", e); }
            } 
            else if (name.endsWith('.txt')) {
                const text = await file.text();
                let importedAsData = false;

                // 1. Intento Limpio
                const tryParseDeep = (str) => {
                    try {
                        let clean = str.trim();
                        if (clean.charCodeAt(0) === 0xFEFF) clean = clean.slice(1);
                        return JSON.parse(clean);
                    } catch (e) { return null; }
                };

                let data = tryParseDeep(text);

                // 2. Si falla, usar Extractor Inteligente (Mejorado)
                if (!data) {
                    data = this._smartJsonExtract(text);
                }

                // 3. Verificación de Integridad de Silenos
                if (data && (Array.isArray(data) || data.type)) {
                    if (Array.isArray(data)) {
                        data.forEach(d => { 
                            if(d.type && !d.id) d.id = 'imported-' + Date.now() + Math.random(); 
                        });
                        list.push(...data);
                    }
                    else {
                        if (!data.id) data.id = 'imported-' + Date.now();
                        list.push(data);
                    }
                    importedAsData = true;
                }

                // 4. Fallback: Si no es JSON de sistema, es Narrativa
                if (!importedAsData) {
                    list.push({
                        id: 'narrative-' + Date.now(),
                        type: 'narrative',
                        title: file.name.replace('.txt', ''),
                        content: { tag: "IMPORT", text: text },
                        parentId: parentId,
                        icon: 'sticky-note',
                        color: 'text-orange-500'
                    });
                }
            }
        } else if (entry.isDirectory) {
            const folderId = 'folder-' + Date.now();
            list.push({
                id: folderId,
                type: 'folder',
                title: entry.name,
                parentId: parentId,
                icon: 'folder',
                color: 'text-blue-500'
            });
            const reader = entry.createReader();
            const subEntries = await new Promise(res => reader.readEntries(res));
            for (const sub of subEntries) {
                await this.processRecursiveEntry(sub, list, folderId);
            }
        }
    },

    // Inserta datos en el sistema manejando colisiones de IDs
    async importToSystem(data) {
        if (typeof ProgrammerManager !== 'undefined') await ProgrammerManager.init();

        const idMap = {};
        // 1. Crear mapa de nuevos IDs para evitar duplicados
        data.forEach(item => {
            if (item.id && item.type !== 'custom-module') {
                const newId = item.type + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
                idMap[item.id] = newId;
            }
        });

        let count = 0;
        let modulesCount = 0;

        // 2. Procesar inserción
        data.forEach(item => {
            if (!item.type) return;

            if (item.type === 'custom-module') {
                if (typeof ProgrammerManager !== 'undefined') {
                    const idx = ProgrammerManager.customModules.findIndex(m => m.id === item.id);
                    const moduleData = { ...item };
                    delete moduleData.type; 
                    
                    if (idx >= 0) ProgrammerManager.customModules[idx] = moduleData;
                    else ProgrammerManager.customModules.push(moduleData);
                    
                    modulesCount++;
                }
            } 
            else if (['folder', 'file', 'program', 'narrative', 'book', 'data', 'executable', 'image'].includes(item.type)) {
                
                // Remapear ID propio
                if (idMap[item.id]) item.id = idMap[item.id];
                
                // Remapear ID del padre
                if (item.parentId && idMap[item.parentId]) {
                    item.parentId = idMap[item.parentId];
                }

                FileSystem.data.push(item);
                count++;
            }
        });

        // 3. Recuperar carpetas huérfanas
        this.recoverOrphans();

        // 4. Guardar
        FileSystem.save();
        if (modulesCount > 0 && typeof ProgrammerManager !== 'undefined') ProgrammerManager.saveModules();

        return { count, modulesCount };
    },

    recoverOrphans() {
        const missingParents = new Set();
        FileSystem.data.forEach(item => {
            if (item.parentId && item.parentId !== 'desktop') {
                const parentExists = FileSystem.data.some(f => f.id === item.parentId);
                if (!parentExists) missingParents.add(item.parentId);
            }
        });

        missingParents.forEach(pid => {
            FileSystem.data.push({
                id: pid,
                type: 'folder',
                title: 'Carpeta Recuperada',
                parentId: 'desktop', 
                x: 50 + (Math.random() * 50), 
                y: 50 + (Math.random() * 50),
                icon: 'folder',
                color: 'text-amber-500'
            });
        });
    },

    async generateBackupData() {
        if (typeof ProgrammerManager !== 'undefined') await ProgrammerManager.init();

        let backupData = [...FileSystem.data];
        if (typeof ProgrammerManager !== 'undefined' && ProgrammerManager.customModules.length > 0) {
                const mods = ProgrammerManager.customModules.map(m => ({ ...m, type: 'custom-module' }));
                backupData = backupData.concat(mods);
        }
        return backupData;
    }
};