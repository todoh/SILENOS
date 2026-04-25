// Archivo: Librojuego/ai.links.js

window.AILinks = {
    generatingNodes: new Set(),

    async rewriteLinks(nodeId) {
        if (this.generatingNodes.has(nodeId)) {
            console.warn(`[AILinks] El nodo ${nodeId} ya se está procesando.`);
            return;
        }

        const node = Core.getNode(nodeId);
        
        if (!node || !node.choices || node.choices.length === 0) {
            alert("Este nodo no tiene opciones (enlaces) para reescribir. Crea bifurcaciones primero.");
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
            return;
        }

        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        
        // Bloqueamos el nodo y renderizamos para mostrar el indicador de carga
        this.generatingNodes.add(nodeId);
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();

        try {
            // Mapear los enlaces actuales y buscar el texto del nodo destino para darle contexto a la IA
            const choicesData = node.choices.map(c => {
                const targetNode = Core.getNode(c.targetId);
                return {
                    targetId: c.targetId,
                    texto_actual_boton: c.text || "Continuar...",
                    consecuencia_en_el_destino: targetNode && targetNode.text ? targetNode.text.substring(0, 400) : "Se avanza a una nueva zona desconocida."
                };
            });

            const sysPrompt = "Eres un diseñador narrativo experto en librojuegos. Tu objetivo es reescribir los textos de las opciones (botones de decisión) para que sean inmersivos, usen verbos de acción directa (en infinitivo o primera persona) y conecten lógicamente la escena actual con lo que ocurre inmediatamente después en el nodo de destino. Devuelve ESTRICTAMENTE JSON PURO.";
            
            const userPrompt = `
                ESCENA ACTUAL (Donde se encuentra el jugador): 
                "${node.text || 'Sin contexto descriptivo aún.'}"

                OPCIONES DISPONIBLES Y SUS DESTINOS:
                ${JSON.stringify(choicesData, null, 2)}

                TAREA: Reescribe el "texto_actual_boton" de cada opción basándote de forma lógica en lo que va a ocurrir en "consecuencia_en_el_destino". Mantenlo corto (1 frase máximo por botón).
                
                FORMATO JSON ESPERADO:
                {
                    "enlaces_reescritos": [
                        { "targetId": "ID_DEL_DESTINO", "nuevo_texto_boton": "Acción inmersiva y concisa..." }
                    ]
                }
            `;

            const data = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'nova-fast', 
                jsonMode: true, 
                temperature: 0.6
            }, (d) => d && Array.isArray(d.enlaces_reescritos) && d.enlaces_reescritos.length === node.choices.length);

            // Aplicar los nuevos textos a los enlaces del nodo
            data.enlaces_reescritos.forEach(link => {
                const choice = node.choices.find(c => c.targetId === link.targetId);
                if (choice) {
                    choice.text = link.nuevo_texto_boton;
                }
            });

            // Refrescar UI si estamos en el editor
            if (Core.selectedNodeId === nodeId && typeof Editor !== 'undefined') {
                Editor.loadNode(nodeId);
            }
            
            if (typeof Canvas !== 'undefined') {
                Canvas.renderEdges();
            }
            Core.scheduleSave();

        } catch (e) {
            alert("Error al reescribir los enlaces: " + e.message);
            console.error("Fallo detallado en AILinks:", e);
        } finally {
            // Liberamos el nodo al terminar y repintamos para quitar el icono
            this.generatingNodes.delete(nodeId);
            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        }
    }
};