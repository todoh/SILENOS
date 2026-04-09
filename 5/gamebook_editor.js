// live gemini/gamebook_editor.js
// ─── LIBROJUEGO STUDIO: EDITOR LATERAL (gamebook_editor.js) ──────────────────

Object.assign(window.gamebookUI, {
    updateEditorPanel() {
        if (!this.selectedNodeId) {
            document.getElementById('gbNodeEditor').classList.add('hidden');
            document.getElementById('gbEmptyState').style.display = 'block';
            return;
        }

        const node = this.data.nodes.find(n => n.id === this.selectedNodeId);
        if (!node) return;

        // AUTO-REPARACIÓN DE CACHÉ DE IMAGEN: Si el nodo tiene imagen asignada pero perdió la URL temporal (ej. por reemplazo del árbol de datos)
        if (node.imageUrl && !node._cachedImageUrl && typeof this.cacheImages === 'function') {
            this.cacheImages().then(() => {
                if (typeof gamebookVisual !== 'undefined') {
                    gamebookVisual.updateUI(node);
                }
                this.renderNodes(); // Refresca el canvas visual para garantizar que aparezcan las miniaturas reconstruidas
            });
        }

        document.getElementById('gbEmptyState').style.display = 'none';
        document.getElementById('gbNodeEditor').classList.remove('hidden');
        
        document.getElementById('gbNodeIdLabel').innerText = node.id;
        document.getElementById('gbNodeText').value = node.text || '';
        
        this.renderChoicesEditor(node);

        if (typeof gamebookVisual !== 'undefined') {
            gamebookVisual.updateUI(node);
        }
    },

    renderChoicesEditor(node) {
        const list = document.getElementById('gbChoicesList');
        list.innerHTML = '';
        
        (node.choices || []).forEach((c, idx) => {
            const row = document.createElement('div');
            row.style.cssText = "display:flex; flex-direction:column; gap:5px; background:var(--surface2); padding:10px; border-radius:4px;";
            
            row.innerHTML = `
                <div style="display:flex; gap:5px;">
                    <input type="text" class="gb-input gb-choice-text" placeholder="Acción (ej. Abrir)" value="${c.text || ''}" oninput="gamebookUI.saveNodeEdits()" style="margin:0;">
                    <button onclick="gamebookUI.removeChoice(${idx})" style="background:transparent; color:var(--gem-red); cursor:pointer; padding:0 5px; font-weight:bold;">✕</button>
                </div>
                <input type="text" class="gb-input gb-choice-target" placeholder="ID Nodo Destino" value="${c.targetId || ''}" oninput="gamebookUI.saveNodeEdits()" style="margin:0;">
            `;
            list.appendChild(row);
        });
    },

    addNode() {
        const id = prompt("Escribe el ID único para este nuevo nodo (ej. nodo_bosque):");
        if (!id) return;
        if (this.data.nodes.find(n => n.id === id)) return alert("El ID ya existe.");
        
        this.data.nodes.push({
            id: id,
            text: "Texto de ejemplo...",
            choices: [],
            x: 100 - (this.panX / this.zoom), 
            y: 100 - (this.panY / this.zoom)
        });
        this.selectedNodeId = id;
        this.updateEditorPanel();
        this.render();
        this.autoSave();
    },

    deleteSelectedNode() {
        if (!this.selectedNodeId) return;
        
        if (confirm(`¿Estás seguro de eliminar permanentemente el nodo '${this.selectedNodeId}' y borrar todas sus conexiones?`)) {
            const nodeId = this.selectedNodeId;
            const nodeIndex = this.data.nodes.findIndex(n => n.id === nodeId);
            
            if (nodeIndex !== -1) {
                // Elimina el nodo
                this.data.nodes.splice(nodeIndex, 1);
                
                // Desenlaza y limpia las conexiones que apuntaban a este nodo
                this.data.nodes.forEach(n => {
                    if (n.choices) {
                        n.choices = n.choices.filter(c => c.targetId !== nodeId);
                    }
                });
                
                this.selectedNodeId = null;
                this.updateEditorPanel();
                this.render();
                this.autoSave();
                if (typeof showToast === 'function') showToast("Nodo eliminado correctamente", "success");
            }
        }
    },

    addChoice() {
        if (!this.selectedNodeId) return;
        const node = this.data.nodes.find(n => n.id === this.selectedNodeId);
        if (!node.choices) node.choices = [];
        node.choices.push({ text: "Nueva Acción", targetId: "" });
        this.updateEditorPanel();
        this.renderEdges();
        this.autoSave();
    },

    removeChoice(index) {
        if (confirm("¿Estás seguro de eliminar esta decisión/conexión?")) {
            const node = this.data.nodes.find(n => n.id === this.selectedNodeId);
            if (node && node.choices) {
                node.choices.splice(index, 1);
                this.saveNodeEdits();
                if (typeof showToast === 'function') showToast("Conexión eliminada", "success");
            }
        }
    },

    saveNodeEdits() {
        if (!this.selectedNodeId) return;
        const node = this.data.nodes.find(n => n.id === this.selectedNodeId);
        if (!node) return;

        node.text = document.getElementById('gbNodeText').value;

        const choiceRows = document.getElementById('gbChoicesList').children;
        node.choices = [];
        for (let i = 0; i < choiceRows.length; i++) {
            const cText = choiceRows[i].querySelector('.gb-choice-text').value;
            const cTarget = choiceRows[i].querySelector('.gb-choice-target').value;
            node.choices.push({ text: cText, targetId: cTarget });
        }
        
        this.render();
        this.autoSave();
    }
});