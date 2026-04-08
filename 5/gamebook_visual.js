// live gemini/gamebook_visual.js
// ─── LIBROJUEGO STUDIO: VISUAL ENGINE (gamebook_visual.js) ─────────────────
const gamebookVisual = {
    generatingNodes: new Set(),

    async triggerUpload(nodeId) {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast("Selecciona una carpeta en Entorno Local primero", "error");
            return;
        }
        this.uploadingNodeId = nodeId;
        const fileInput = document.getElementById('gb-hidden-file');
        if (fileInput) fileInput.click();
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.uploadingNodeId) return;

        const nodeId = this.uploadingNodeId;
        const node = gamebookUI.data.nodes.find(n => n.id === nodeId);
        if (!node) return;

        try {
            if (typeof showToast === 'function') showToast("Subiendo Imagen...", "listening");

            const extension = file.name.split('.').pop() || "png";
            const filename = `IMG_UPLOAD_${nodeId}_${Date.now()}.${extension}`;
            
            const fileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file);
            await writable.close();

            node.imageUrl = filename;
            node.imagePrompt = "Imagen cargada manualmente."; 
            node._cachedImageUrl = URL.createObjectURL(file);

            gamebookUI.autoSave();
            gamebookUI.renderNodes();
            gamebookUI.updateEditorPanel();

            if (typeof showToast === 'function') showToast("Imagen guardada en tu PC ✓", "success");
        } catch (error) {
            console.error("Error al subir imagen:", error);
            if (typeof showToast === 'function') showToast("Error al guardar imagen", "error");
        } finally {
            event.target.value = "";
            this.uploadingNodeId = null;
        }
    },

    async deleteImage(nodeId) {
        const node = gamebookUI.data.nodes.find(n => n.id === nodeId);
        if (!node || !node.imageUrl) return;

        if (!confirm("¿Seguro que deseas quitar la imagen del nodo? (Por seguridad, el archivo físico se conservará intacto en tu disco local).")) return;

        try {
            delete node.imageUrl;
            delete node.imagePrompt;
            if (node._cachedImageUrl) {
                URL.revokeObjectURL(node._cachedImageUrl);
                delete node._cachedImageUrl;
            }

            gamebookUI.autoSave();
            gamebookUI.renderNodes();
            gamebookUI.updateEditorPanel();
            
            if (typeof showToast === 'function') showToast("Imagen desenlazada de forma segura", "success");
        } catch (error) {
            console.error("Error al desenlazar imagen:", error);
        }
    },

    getPathText(targetId) {
        const nodes = gamebookUI.data.nodes || [];
        if (!nodes.length) return "";
        
        let queue = [[nodes[0].id]];
        let visited = new Set();
        let pathIds = [];
        
        while(queue.length > 0) {
            let path = queue.shift();
            let curr = path[path.length-1];
            if(curr === targetId) { pathIds = path; break; }
            if(!visited.has(curr)) {
                visited.add(curr);
                let n = nodes.find(x => x.id === curr);
                if(n && n.choices) {
                    for(let c of n.choices) queue.push([...path, c.targetId]);
                }
            }
        }
        if (pathIds.length === 0) pathIds = [targetId]; 
        
        let storyParts = [];
        for (let i = 0; i < pathIds.length; i++) {
            let n = nodes.find(x => x.id === pathIds[i]);
            if (n && n.text) storyParts.push(n.text);
        }
        return storyParts.join(" | ").substring(0, 3000);
    },

    async generateNodePrompt(nodeId) {
        // LLAMADA REST DESACTIVADA
        return "Imagen generada deshabilitada.";
    },

    async illustrateNode(nodeId) {
        if (typeof showToast === 'function') showToast(`Generación de imágenes con IA desactivada`, "error");
        this.generatingNodes.delete(nodeId);
        const node = gamebookUI.data.nodes.find(n => n.id === nodeId);
        if (node && gamebookUI.selectedNodeId === nodeId) this.updateUI(node);
        return;
    },

    async illustrateAllNodes() {
        if (typeof showToast === 'function') showToast("Ilustración masiva desactivada", "error");
    },

    updateUI(node) {
        const preview = document.getElementById('gb-img-preview');
        const deleteBtn = document.getElementById('gb-btn-del-img');
        const illBtn = document.getElementById('gb-btn-illustrate');
        
        if (!preview || !deleteBtn || !illBtn) return;

        if (node._cachedImageUrl) {
            preview.style.backgroundImage = `url('${node._cachedImageUrl}')`;
            preview.classList.remove('hidden');
            deleteBtn.style.display = 'block';
        } else {
            preview.classList.add('hidden');
            preview.style.backgroundImage = 'none';
            deleteBtn.style.display = 'none';
        }

        if (this.generatingNodes.has(node.id)) {
            illBtn.innerText = "GENERANDO EN 2º PLANO...";
            illBtn.disabled = true;
            illBtn.style.opacity = "0.5";
        } else {
            illBtn.innerText = "✨ ILUSTRAR ESCENA";
            illBtn.disabled = false;
            illBtn.style.opacity = "1";
        }
    }
};