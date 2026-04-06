// live gemini/datos_studio.js

window.datosStudioUI = {
    items: [],
    currentFileHandle: null,
    currentData: null,
    currentFolderHandle: null, // Carpeta independiente para Datos Studio

    async selectFolder() {
        try {
            this.currentFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            const label = document.getElementById('dsFolderLabel');
            if(label) label.innerText = `(${this.currentFolderHandle.name})`;
            if (typeof showToast === 'function') showToast(`Carpeta de Datos: ${this.currentFolderHandle.name}`, 'success');
            await this.loadFiles();
        } catch(e) {
            console.warn("Selección de carpeta cancelada", e);
        }
    },

    async open() {
        if (!this.currentFolderHandle) {
            if (workspaceHandle) {
                this.currentFolderHandle = workspaceHandle; // Por defecto hereda la raíz
            } else {
                if (typeof showToast === 'function') showToast('Selecciona una carpeta para Datos Studio', 'error');
                return;
            }
        }
        
        const modal = document.getElementById('datosStudioModal');
        if (modal) {
            modal.classList.remove('hidden');
        } else {
            console.warn("Falta el modal 'datosStudioModal' en el HTML. Se requiere para visualización.");
        }

        const label = document.getElementById('dsFolderLabel');
        if(label && this.currentFolderHandle) label.innerText = `(${this.currentFolderHandle.name})`;

        await this.loadFiles();
    },

    close() {
        const modal = document.getElementById('datosStudioModal');
        if (modal) modal.classList.add('hidden');
    },

    async loadFiles() {
        if (!this.currentFolderHandle) return;
        this.items = [];
        try {
            for await (const entry of this.currentFolderHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('RESUMEN') && !entry.name.includes('TRAMAS')) {
                    try {
                        const file = await entry.getFile();
                        const text = await file.text();
                        const json = JSON.parse(text);
                        this.items.push({ handle: entry, data: json, name: entry.name });
                    } catch(e) {
                        console.warn("Archivo omitido o JSON inválido en Datos Studio:", entry.name);
                    }
                }
            }
            if (typeof datosStudioGrid !== 'undefined') {
                datosStudioGrid.render();
            }
        } catch(e) {
            console.error("Error profundo cargando archivos en Datos Studio", e);
        }
    },

    async saveCurrentItem() {
        if (!this.currentFileHandle || !this.currentData) return;
        try {
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 2));
            await writable.close();
            await this.loadFiles();
            if (typeof showToast === 'function') showToast('Dato guardado correctamente', 'success');
        } catch (e) {
            console.error(e);
            if (typeof showToast === 'function') showToast('Error al guardar dato', 'error');
        }
    }
};