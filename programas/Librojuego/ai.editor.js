// Archivo: Librojuego/ai.editor.js

window.AIEnhancer = {
    generatingNodes: new Set(),

    async completeNode(nodeId) {
        if (this.generatingNodes.has(nodeId)) {
            console.warn(`[AIEnhancer] El nodo ${nodeId} ya se está auto-escribiendo en segundo plano.`);
            return;
        }

        const node = Core.getNode(nodeId);
        if (!node) return;

        this.generatingNodes.add(nodeId);
        this.updateUIState(nodeId, true);

        this._processNodeBackground(nodeId).catch(err => {
            console.error("Caos al auto-escribir:", err);
            alert(`Error al auto-escribir el nodo ${nodeId}: \n` + err.message);
        }).finally(() => {
            this.generatingNodes.delete(nodeId);
            this.updateUIState(nodeId, false);
        });
    },

    updateUIState(nodeId, isGenerating) {
        if (Core.selectedNodeId === nodeId) {
            const btn = document.getElementById('btn-auto-write');
            if (btn) {
                if (isGenerating) {
                    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ESCRIBIENDO...`;
                    btn.disabled = true;
                    btn.classList.add('opacity-50', 'cursor-not-allowed');
                } else {
                    btn.innerHTML = `<i class="fa-solid fa-pen-nib"></i> IA Auto-Escribir`;
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed');
                    if (typeof Editor !== 'undefined') Editor.loadNode(nodeId);
                }
            }
        }
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
    },

    getPathTextToNode(nodes, targetId) {
        if (!nodes.length) return "";
        let queue = [[nodes[0].id]];
        let visited = new Set();
        let pathIds = [];

        while (queue.length > 0) {
            let path = queue.shift();
            let curr = path[path.length - 1];
            
            if (curr === targetId) {
                pathIds = path;
                break;
            }
            
            if (!visited.has(curr)) {
                visited.add(curr);
                let n = nodes.find(x => x.id === curr);
                if (n && n.choices) {
                    for (let c of n.choices) {
                        queue.push([...path, c.targetId]);
                    }
                }
            }
        }
        
        if (pathIds.length === 0) pathIds = [targetId]; 
        
        let storyParts = [];
        for (let i = 0; i < pathIds.length; i++) {
            let n = nodes.find(x => x.id === pathIds[i]);
            if (n && n.text && n.text.length > 5) {
                let part = n.text;
                if (i < pathIds.length - 1) {
                    let nextId = pathIds[i + 1];
                    let chosenChoice = n.choices ? n.choices.find(c => c.targetId === nextId) : null;
                    if (chosenChoice && chosenChoice.text) {
                        part += `\n\n>> [EL JUGADOR DECIDIÓ: ${chosenChoice.text}] <<`;
                    }
                }
                storyParts.push(part);
            }
        }
        
        return storyParts.join("\n\n---\n\n");
    },

    async _processNodeBackground(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) return;

        const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
        
        // --- 1. CONTEXTO INMEDIATO ---
        const parents = allNodes.filter(n => n.choices && n.choices.some(c => c.targetId === nodeId));
        const parentTexts = parents.map(p => {
            const choiceTaken = p.choices.find(c => c.targetId === nodeId);
            return `[Nodo anterior]: ${p.text}\n>> [ACCIÓN TOMADA PARA LLEGAR AQUÍ: ${choiceTaken ? choiceTaken.text : 'Avanzar'}] <<`;
        }).join("\n\n");

        // --- 2. SÍNTESIS GLOBAL ---
        const pathText = this.getPathTextToNode(allNodes, nodeId);
        let globalSynthesis = "";
        
        if (pathText.length > 500) {
            const synthSys = "Eres un analista literario de ficción interactiva. Resume la historia de esta rama argumental hasta ahora. Destaca la trama principal y las decisiones clave tomadas por el jugador. Ignora por completo rutas alternativas no mencionadas.";
            const synthUser = `Historia de la ruta actual:\n${pathText.substring(0, 15000)}`;
            globalSynthesis = await window.Koreh.Text.generateWithRetry(synthSys, synthUser, {
                model: 'nova-fast',
                jsonMode: false,
                temperature: 0.3
            }, (data) => data && data.length > 10);
        } else {
            globalSynthesis = pathText || "La historia acaba de comenzar o está en blanco.";
        }

        // --- 3. UBICACIÓN TOPOLÓGICA ---
        let location = `Este es el nodo ${allNodes.indexOf(node) + 1} de un total de ${allNodes.length} nodos creados.`;
        const depth = this.calculateDepth(allNodes, nodeId);
        location += `\nProfundidad estructural en el árbol de decisiones: Nivel ${depth}.`;

        // --- 4. CREACIÓN (NARRATIVA Y BOTONES) ---
        const sysPrompt = "Eres un escritor experto en librojuegos interactivos. Tu objetivo es redactar o completar la narrativa de un nodo específico y el texto de sus opciones. Escribe en segunda persona ('Tú haces...'). NUNCA crees nuevas opciones ni cambies los targetId, SOLO debes redactar la literatura y los textos de los botones. Devuelve ESTRICTAMENTE JSON PURO.";
        const choicesContext = node.choices.map(c => ({ targetId: c.targetId, currentText: c.text }));
        
        const geoContext = typeof window.AISupport !== 'undefined' && typeof window.AISupport.getGeographicContext === 'function' ? window.AISupport.getGeographicContext(nodeId) : ""; // Inyección cartográfica
        const canonContext = typeof window.AISupport !== 'undefined' && typeof window.AISupport.getCanonInstruction === 'function' ? window.AISupport.getCanonInstruction() : ""; 

        const userPrompt = `
            SÍNTESIS DE LA HISTORIA HASTA ESTE PUNTO (Solo la rama del jugador):
            "${globalSynthesis}"

            UBICACIÓN EXACTA DEL NODO:
            ${location}
            ${geoContext}
            ${canonContext}

            CONTEXTO INMEDIATO (Lo que acaba de pasar y qué decisión tomó el jugador para llegar aquí):
            ${parentTexts || "Este es el comienzo de la aventura o un nodo huérfano. Inicia la historia aquí."}

            ESTADO ACTUAL DEL NODO QUE DEBES ESCRIBIR:
            Boceto actual o texto parcial (Úsalo de guía y mejóralo/complétalo): "${node.text || 'Sin texto'}"
            Opciones/Botones disponibles a rellenar: ${JSON.stringify(choicesContext)}

            TAREA:
            1. Escribe 1 o 2 párrafos inmersivos y coherentes para la narrativa del nodo, continuando lógicamente desde la [ACCIÓN TOMADA PARA LLEGAR AQUÍ].
            2. Redacta una acción corta en imperativo o primera persona ("Abrir la puerta", "Atacar con la espada") para CADA UNA de las opciones disponibles, respetando sus targetId.

            FORMATO JSON EXACTO ESPERADO:
            {
                "narrativa": "El texto inmersivo...",
                "opciones": [
                    { "targetId": "id_destino_1", "texto_boton": "Acción a realizar" }
                ]
            }
        `;

        const generatedData = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
            model: 'nova-fast',
            jsonMode: true,
            temperature: 0.7
        }, (data) => data && data.narrativa && Array.isArray(data.opciones));

        // --- 5. APLICAR RESULTADOS ---
        node.text = generatedData.narrativa;
        
        generatedData.opciones.forEach(op => {
            const targetChoice = node.choices.find(c => c.targetId === op.targetId);
            if (targetChoice) {
                targetChoice.text = op.texto_boton;
            }
        });

        if (Core.scheduleSave) Core.scheduleSave();

        // -------------------------------------------------------------------------
        // NUEVO: Auto-disparador de la Bitácora IA después de actualizar la historia
        // -------------------------------------------------------------------------
        if (typeof window.AIBitacora !== 'undefined') {
            window.AIBitacora.updateLogbook(nodeId);
        }
    },

    calculateDepth(nodes, targetId) {
        let depths = {};
        nodes.forEach(n => depths[n.id] = 0);
        let changed = true;
        let iterations = 0;
        
        while (changed && iterations < 100) {
            changed = false;
            nodes.forEach(node => {
                if (node.choices) {
                    node.choices.forEach(c => {
                        if (depths[c.targetId] < depths[node.id] + 1) {
                            depths[c.targetId] = depths[node.id] + 1;
                            changed = true;
                        }
                    });
                }
            });
            iterations++;
        }
        return depths[targetId] || 0;
    }
};