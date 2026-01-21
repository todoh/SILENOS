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

    // Lógica recursiva: AHORA TRABAJA CON ARCHIVOS EN BRUTO
    async processRecursiveEntry(entry, list, parentId = 'desktop') {
        if (entry.isFile) {
            const file = await new Promise((res) => entry.file(res));
            
            // 1. Guardar el contenido crudo (Blob) en el sistema de almacenamiento
            const contentPath = await FileSystem.saveRawFile(file);
            
            if (!contentPath) {
                console.error("Error guardando archivo raw:", file.name);
                return;
            }

            const isImage = /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(file.name);
            const is3D = /\.(glb|gltf)$/i.test(file.name);
            
            // 2. Crear el item de metadatos apuntando al contenido crudo
            
            if (isImage) {
                // TIPO IMAGEN
                list.push({
                    id: 'image-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    type: 'image',
                    title: file.name,
                    content: contentPath, // Ruta interna
                    parentId: parentId,
                    icon: 'image',
                    color: 'text-blue-400',
                    x: 100 + Math.random() * 50,
                    y: 100 + Math.random() * 50
                });
            } else if (is3D) {
                // TIPO 3D (GLB/GLTF)
                console.log("ImportCore: Detectado archivo 3D", file.name);
                list.push({
                    id: 'model-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    type: 'file', 
                    subtype: 'glb', // IMPORTANTE: Subtipo explícito
                    title: file.name,
                    content: contentPath, 
                    mimeType: file.type || 'model/gltf-binary',
                    parentId: parentId,
                    icon: 'box', 
                    color: 'text-orange-400',
                    x: 100 + Math.random() * 50,
                    y: 100 + Math.random() * 50
                });
            } else {
                // GENÉRICO (TXT, JSON, JS, PDF...)
                list.push({
                    id: 'file-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    type: 'file',
                    title: file.name,
                    content: contentPath, 
                    mimeType: file.type,
                    parentId: parentId,
                    icon: this._getIconForType(file.name),
                    color: 'text-gray-200',
                    x: 100 + Math.random() * 50,
                    y: 100 + Math.random() * 50
                });
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

    _getIconForType(filename) {
        if (filename.endsWith('.js')) return 'file-code';
        if (filename.endsWith('.json')) return 'file-json';
        if (filename.endsWith('.css')) return 'file-code-2';
        if (filename.endsWith('.html')) return 'file-code';
        if (filename.endsWith('.txt')) return 'file-text';
        if (filename.endsWith('.glb') || filename.endsWith('.gltf')) return 'box';
        return 'file';
    },

    // Inserta datos en el sistema (Mantiene lógica de IDs)
    async importToSystem(data) {
        if (typeof ProgrammerManager !== 'undefined') await ProgrammerManager.init();

        const idMap = {};
        data.forEach(item => {
            if (item.id) {
                const prefix = item.type || 'item';
                const newId = prefix + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
                idMap[item.id] = newId;
            }
        });

        let count = 0;
        let modulesCount = 0;

        // --- FASE CRÍTICA: INSERCIÓN Y PERSISTENCIA ---
        data.forEach(item => {
            if (!item.type) return;

            // Actualizar IDs
            if (idMap[item.id]) item.id = idMap[item.id];
            if (item.parentId && idMap[item.parentId]) item.parentId = idMap[item.parentId];

            FileSystem.data.push(item); // Insertar en RAM
            
            // !! CORRECCIÓN VITAL !!
            // Marcar como "sucio" para que el FileSystem sepa que debe guardarlo en IndexedDB
            if (typeof FileSystem._markDirty === 'function') {
                FileSystem._markDirty(item.id);
            }

            count++;
        });

        this.recoverOrphans();
        
        // Forzar guardado inmediato
        await FileSystem.save(); 

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
                x: 50, y: 50,
                icon: 'folder', color: 'text-amber-500'
            });
            // Marcar carpeta recuperada también
            if (typeof FileSystem._markDirty === 'function') FileSystem._markDirty(pid);
        });
    },

    async generateBackupData() {
        return [...FileSystem.data];
    }
};