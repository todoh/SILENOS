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
            // Protección física: Se elimina del objeto visual pero no de la carpeta real.
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
        const node = gamebookUI.data.nodes.find(n => n.id === nodeId);
        if (!node) throw new Error("Nodo no encontrado.");

        const contextText = this.getPathText(nodeId);
        const globalStyle = gamebookUI.data.visualStyle ? `\nGlobal Visual Style to strictly enforce: "${gamebookUI.data.visualStyle}"\n` : '';

        const sysPrompt2 = "You are an expert prompt engineer. Create a PERFECT but CONCISE text-to-image prompt (MAX 80 WORDS) IN ENGLISH based on the scene description. Return ONLY the raw prompt string.";
        const userPrompt2 = `
            Scene Context: "${contextText.substring(0, 1500)}"
            Current Scene to Illustrate: "${node.text}"
            ${globalStyle}
            
            Instructions: Create a descriptive, prompt-friendly structure for an illustration. STRICTLY apply the Global Visual Style if provided. Focus on physical details, atmosphere, lighting. No text in the image.
        `;

        if (typeof showToast === 'function') showToast("Diseñando Prompt...", "listening");
        
        const res = await fetch(POLLINATIONS_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${pollinationsKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: 'gemini-fast', 
                messages: [ { role: 'system', content: sysPrompt2 }, { role: 'user', content: userPrompt2 } ],
                seed: Math.floor(Math.random() * 1000)
            })
        });
        const data = await res.json();
        let finalPrompt = data.choices[0].message.content.trim().replace(/\n/g, ' ');
        if (finalPrompt.length > 900) finalPrompt = finalPrompt.substring(0, 900);
        return finalPrompt;
    },

    async illustrateNode(nodeId) {
        if (!pollinationsKey) {
            if (typeof showToast === 'function') showToast("Conecta IA Pollinations primero", "error");
            return;
        }
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast("Selecciona una carpeta primero", "error");
            return;
        }
        
        if (this.generatingNodes.has(nodeId)) return;

        const node = gamebookUI.data.nodes.find(n => n.id === nodeId);
        if (!node) return;

        this.generatingNodes.add(nodeId);
        this.updateUI(node);

        try {
            const prompt = await this.generateNodePrompt(nodeId);
            
            if (typeof showToast === 'function') showToast(`Generando Imagen (${nodeId})...`, "listening");
            
            const safePrompt = encodeURIComponent(prompt);
            const seed = Math.floor(Math.random() * 9999999);
            
            // Usando modelo zimage y el método de adjuntar la key en la URL
            let url = `https://gen.pollinations.ai/image/${safePrompt}?model=zimage&width=1024&height=1024&seed=${seed}&nologo=true`;
            if (pollinationsKey) {
                url += `&key=${pollinationsKey}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fallo en el servidor gráfico.");

            const blob = await response.blob();
            const filename = `IMG_${nodeId}_${Date.now()}.jpg`;
            
            const fileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            node.imageUrl = filename;
            node.imagePrompt = prompt;
            if (node._cachedImageUrl) URL.revokeObjectURL(node._cachedImageUrl);
            node._cachedImageUrl = URL.createObjectURL(blob); 

            gamebookUI.autoSave();
            gamebookUI.renderNodes();
            if (gamebookUI.selectedNodeId === nodeId) gamebookUI.updateEditorPanel();
            
            if (typeof showToast === 'function') showToast(`Imagen generada ✓ (${nodeId})`, "success");

        } catch (error) {
            console.error("Error al ilustrar:", error);
            if (typeof showToast === 'function') showToast(`Error al generar imagen (${nodeId})`, "error");
        } finally {
            this.generatingNodes.delete(nodeId);
            if (gamebookUI.selectedNodeId === nodeId) this.updateUI(node);
        }
    },

    async illustrateAllNodes() {
        if (!pollinationsKey) {
            if (typeof showToast === 'function') showToast("Conecta IA Pollinations primero", "error");
            return;
        }
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast("Selecciona una carpeta primero", "error");
            return;
        }
        if (!gamebookUI.data.nodes || gamebookUI.data.nodes.length === 0) return;

        if (typeof showToast === 'function') showToast("Iniciando ilustración masiva...", "listening");

        for (const node of gamebookUI.data.nodes) {
            if (!this.generatingNodes.has(node.id)) {
                await this.illustrateNode(node.id);
            }
        }
        if (typeof showToast === 'function') showToast("Ilustración masiva completada ✨", "success");
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