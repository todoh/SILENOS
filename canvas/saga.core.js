// SAGA MINI - CORE & FILE SYSTEM ENGINE
window.Saga = window.Saga || {};

window.Saga.Core = {
    dirHandle: null,
    items: [],
    tramas: [],

    async openFolder() {
        try {
            this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            await this.scanFiles();
            return this.dirHandle.name;
        } catch (err) {
            console.warn("Acceso a carpeta cancelado:", err);
            return null;
        }
    },

    async scanFiles() {
        if (!this.dirHandle) return;
        this.items = [];
        this.tramas = [];

        for await (const entry of this.dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                try {
                    const file = await entry.getFile();
                    const text = await file.text();
                    const data = JSON.parse(text);

                    if (entry.name === 'TRAMAS_GLOBAL.json') {
                        this.tramas = Array.isArray(data) ? data : [];
                        continue;
                    }

                    let displayUrl = null;
                    if (data.imageFile) {
                        try {
                            const imgHandle = await this.dirHandle.getFileHandle(data.imageFile);
                            const imgFile = await imgHandle.getFile();
                            displayUrl = URL.createObjectURL(imgFile);
                        } catch (e) {
                            console.warn("Imagen no encontrada:", data.imageFile);
                        }
                    }

                    this.items.push({
                        handle: entry,
                        filename: entry.name,
                        data: data,
                        displayUrl: displayUrl
                    });
                } catch (e) {
                    console.warn("Error leyendo JSON:", entry.name);
                }
            }
        }

        if (window.Saga.Canvas) {
            window.Saga.Canvas.syncNodesFromCore();
        }
    },

    async saveNodeData(filename, dataPayload) {
        if (!this.dirHandle) return;
        try {
            const sagaStandard = {
                name: dataPayload.name || "Sin nombre",
                type: dataPayload.type || "Dato",
                desc: dataPayload.desc || "",
                visualDesc: dataPayload.visualDesc || "",
                tags: dataPayload.tags || [],
                imagen64: dataPayload.imagen64 || null,
                imageFile: dataPayload.imageFile || null,
                connections: dataPayload.connections || [],
                x: dataPayload.x !== undefined ? dataPayload.x : 100,
                y: dataPayload.y !== undefined ? dataPayload.y : 100
            };

            const handle = await this.dirHandle.getFileHandle(filename, { create: true });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(sagaStandard, null, 2));
            await writable.close();
            
            const existing = this.items.find(i => i.filename === filename);
            if (existing) {
                existing.data = sagaStandard;
            } else {
                this.items.push({ handle, filename, data: sagaStandard, displayUrl: null });
            }
        } catch (e) {
            console.error("Error al guardar archivo:", filename, e);
        }
    },

    async deleteNodeData(filename) {
        if (!this.dirHandle) return;
        try {
            await this.dirHandle.removeEntry(filename);
            this.items = this.items.filter(i => i.filename !== filename);
        } catch (e) {
            console.error("Error al eliminar archivo:", filename, e);
        }
    },

    async saveRegions(regionsPayload) {
        if (!this.dirHandle) return;
        try {
            const nonRegions = this.tramas.filter(t => t.type !== 'Region');
            const fullTramas = [...nonRegions, ...regionsPayload];
            this.tramas = fullTramas;

            const handle = await this.dirHandle.getFileHandle('TRAMAS_GLOBAL.json', { create: true });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(fullTramas, null, 2));
            await writable.close();
        } catch (e) {
            console.error("Error al guardar TRAMAS_GLOBAL.json:", e);
        }
    },

    async saveImageBlob(jsonFilename, blob) {
        if (!this.dirHandle) return null;
        const ext = blob.type === 'image/jpeg' ? 'jpg' : (blob.type === 'image/webp' ? 'webp' : 'png');
        const imgFilename = jsonFilename.replace('.json', `.${ext}`);
        
        try {
            const imgHandle = await this.dirHandle.getFileHandle(imgFilename, { create: true });
            const writable = await imgHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            const item = this.items.find(i => i.filename === jsonFilename);
            if (item) {
                item.data.imageFile = imgFilename;
                item.displayUrl = URL.createObjectURL(blob);
                await this.saveNodeData(jsonFilename, item.data);
            }
            return imgFilename;
        } catch (e) {
            console.error("Error al guardar imagen física:", e);
            return null;
        }
    }
};