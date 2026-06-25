// live gemini/gamebook.js
// ─── LIBROJUEGO STUDIO: CORE & ARCHIVOS (gamebook.js) ─────────────────────────
// Este es el objeto principal. Las demás partes se conectan a él.

window.gamebookUI = {
    data: { title: "Nuevo Librojuego", visualStyle: "", nodes: [] },
    currentFileHandle: null,
    selectedNodeId: null,

    async open() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta primero', 'error');
            return;
        }
        document.getElementById('gamebookModal').classList.remove('hidden');
        
        const titleInput = document.getElementById('gbTitleInput');
        if (titleInput) {
            titleInput.value = this.data.title || "Nuevo Librojuego";
        }

        const styleInput = document.getElementById('gbStyleInput');
        if (styleInput) {
            styleInput.value = this.data.visualStyle || "";
        }
        
        this.initCanvas();
        this.render();
    },

    close() {
        document.getElementById('gamebookModal').classList.add('hidden');
    },

    async cacheImages() {
        if (!workspaceHandle) return;
        for (let node of this.data.nodes) {
            if (node.imageUrl && !node._cachedImageUrl) {
                try {
                    const imgHandle = await workspaceHandle.getFileHandle(node.imageUrl);
                    const imgFile = await imgHandle.getFile();
                    node._cachedImageUrl = URL.createObjectURL(imgFile);
                } catch(err) {
                    console.warn(`Imagen no encontrada localmente: ${node.imageUrl}`);
                }
            }
        }
    },

    async loadFromFile() {
        if (!workspaceHandle) return;
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{description: 'JSON', accept: {'application/json': ['.json']}}]
            });
            const file = await fileHandle.getFile();
            const text = await file.text();
            this.data = JSON.parse(text);
            this.currentFileHandle = fileHandle;
            
            document.getElementById('gbTitleInput').value = this.data.title || "Sin título";
            document.getElementById('gbStyleInput').value = this.data.visualStyle || "";
            
            await this.cacheImages();
            
            this.selectedNodeId = null;
            this.updateEditorPanel();
            this.focusAll(); // Carga visual optimizada
            if (typeof showToast === 'function') showToast('Librojuego cargado', 'success');
        } catch(e) {
            console.error("Error cargando JSON", e);
        }
    },

    async saveToFile() {
        if (!this.currentFileHandle) {
            try {
                this.currentFileHandle = await workspaceHandle.getFileHandle(`aventura_${Date.now()}.json`, { create: true });
            } catch(e) {
                return showToast('Error al crear archivo', 'error');
            }
        }
        try {
            const saveObj = JSON.parse(JSON.stringify(this.data));
            saveObj.nodes.forEach(n => delete n._cachedImageUrl);

            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(saveObj, null, 2));
            await writable.close();
            if (typeof showToast === 'function') showToast('Librojuego guardado en JSON', 'success');
        } catch(e) {
            if (typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
        }
    },

    async autoSave() {
        if (!this.currentFileHandle) return;
        try {
            const saveObj = JSON.parse(JSON.stringify(this.data));
            saveObj.nodes.forEach(n => delete n._cachedImageUrl);

            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(saveObj, null, 2));
            await writable.close();
        } catch(e) {
            console.error("Fallo auto-guardado en segundo plano", e);
        }
    },

    focusAll() {
        if (this.data.nodes && this.data.nodes.length > 0) {
            this.autoLayout();
            this.resetView();
        }
    },

    updateTitle(newTitle) {
        this.data.title = newTitle;
        this.autoSave();
    },

    updateStyle(newStyle) {
        this.data.visualStyle = newStyle;
        this.autoSave();
    },

    render() {
        this.renderNodes();
        this.renderEdges();
        this.applyPan();
    }
};