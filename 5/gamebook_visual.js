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
        return "Imagen generada por IA nativa en formato SVG.";
    },

    async illustrateNode(nodeId) {
        const node = gamebookUI.data.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (!isConnected || !session?.ws) {
            if (typeof showToast === 'function') showToast(`Error: Conecta a VOZ SILENOS primero`, "error");
            return;
        }

        if (typeof showToast === 'function') showToast(`Pidiendo arte SVG a la IA...`, "listening");
        
        this.generatingNodes.add(nodeId);
        if (gamebookUI.selectedNodeId === nodeId) this.updateUI(node);

        const promptText = `Por favor, ilustra el nodo '${nodeId}' de mi librojuego usando arte vectorial SVG de alta calidad.
Contexto de la escena: "${node.text || 'Sin texto'}".
Estilo visual del libro: "${gamebookUI.data.visualStyle || 'Estilo libre'}".
Usa la herramienta 'manage_gamebook' con la acción 'illustrate_node_svg' e inyecta el código SVG final.`;

        try {
            session.ws.send(JSON.stringify({
                realtimeInput: { text: promptText }
            }));
            if (typeof addMessage === 'function') {
                addMessage('user', `[Comando UI]: Ilustrar nodo '${nodeId}' con SVG.`);
            }
        } catch (err) {
            console.error(err);
            this.generatingNodes.delete(nodeId);
            if (gamebookUI.selectedNodeId === nodeId) this.updateUI(node);
        }
    },

    async illustrateAllNodes() {
        if (!isConnected || !session?.ws) {
            if (typeof showToast === 'function') showToast(`Error: Conecta a VOZ SILENOS primero`, "error");
            return;
        }
        if (typeof showToast === 'function') showToast("Pidiendo ilustración masiva SVG...", "listening");
        
        const promptText = `Por favor, ilustra TODOS los nodos de mi librojuego uno por uno usando arte vectorial SVG. Usa tu herramienta 'manage_gamebook' con la acción 'illustrate_node_svg' para cada uno. El estilo del libro es: "${gamebookUI.data.visualStyle || 'Estilo libre'}".`;
        
        try {
            session.ws.send(JSON.stringify({
                realtimeInput: { text: promptText }
            }));
            if (typeof addMessage === 'function') {
                addMessage('user', `[Comando UI]: Ilustrar TODOS los nodos con SVG.`);
            }
        } catch (err) {
            console.error(err);
        }
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
            illBtn.innerText = "PINTANDO SVG (IA TRABAJANDO)...";
            illBtn.disabled = true;
            illBtn.style.opacity = "0.5";
        } else {
            illBtn.innerText = "✨ ILUSTRAR CON SVG (IA)";
            illBtn.disabled = false;
            illBtn.style.opacity = "1";
        }
    }
};