// Archivo: Librojuego/ai.route_analyzer.js

window.AIRouteAnalyzer = {
    /**
     * Rastrea la ruta completa desde el nodo inicial hasta el nodo objetivo,
     * cruzando opciones estándar y saltos por efectos (combate, trampas de muerte).
     */
    findPathWithDetails(targetId) {
        const nodes = Core.book?.nodes || Core.bookData?.nodes || [];
        if (!nodes.length) return null;

        const startNode = nodes.find(n => n.isStartNode) || nodes[0];
        if (startNode.id === targetId) return { path: [startNode.id], choicesTaken: {} };

        let queue = [ { path: [startNode.id], choicesTaken: {} } ];
        let maxIterations = 2000; // Cortafuegos para bucles infinitos
        let iterations = 0;

        while(queue.length > 0 && iterations < maxIterations) {
            iterations++;
            let current = queue.shift();
            let currId = current.path[current.path.length - 1];
            
            if (currId === targetId) return current;

            let n = nodes.find(x => x.id === currId);
            if (!n) continue;

            let nextIds = [];

            // 1. Mapeo de Opciones y Condiciones
            if (n.choices) {
                n.choices.forEach(c => {
                    let reqText = "";
                    if (c.cond && c.cond.type) reqText = ` [Condición Requerida: ${c.cond.type} ${c.cond.op} ${c.cond.val || c.cond.qty}]`;
                    nextIds.push({ id: c.targetId, text: c.text + reqText });
                });
            }

            // 2. Mapeo de Saltos por Efectos Mecánicos
            let effs = n.effs || (n.eff ? [n.eff] : []);
            effs.forEach(eff => {
                if (eff.type === 'module_combat') {
                    if (eff.winTargetId) nextIds.push({ id: eff.winTargetId, text: "Gana el combate" });
                    if (eff.loseTargetId) nextIds.push({ id: eff.loseTargetId, text: "Cae derrotado en combate" });
                }
                if (eff.type === 'vida' && eff.op === '-' && eff.deathTarget) {
                    nextIds.push({ id: eff.deathTarget, text: "Fallece por daño/trampa y revive/cae" });
                }
            });

            // Exploración de nodos adyacentes
            for (let next of nextIds) {
                if (!current.path.includes(next.id)) { // Evitar retrocesos en la misma ruta
                    queue.push({
                        path: [...current.path, next.id],
                        choicesTaken: { ...current.choicesTaken, [currId]: next.text }
                    });
                }
            }
        }
        return null; 
    },

    /**
     * Extrae el hilo literario completo de toda la ruta calculada.
     */
    getFullStoryContext(targetId) {
        const nodes = Core.book?.nodes || Core.bookData?.nodes || [];
        const pathInfo = this.findPathWithDetails(targetId);
        
        if (!pathInfo) {
            const n = Core.getNode(targetId);
            return n ? n.text : "No se pudo trazar una ruta lógica hacia este nodo.";
        }

        let storyParts = [];
        for (let i = 0; i < pathInfo.path.length; i++) {
            let nId = pathInfo.path[i];
            let n = nodes.find(x => x.id === nId);
            if (n && n.text && n.text.trim() !== '') {
                let part = n.text;
                if (i < pathInfo.path.length - 1) {
                    let actionTaken = pathInfo.choicesTaken[nId] || "El destino lo arrastró a su siguiente desafío.";
                    part += `\n\n>> [DECISIÓN O DESTINO: ${actionTaken}] <<`;
                }
                storyParts.push(part);
            }
        }
        return storyParts.join("\n\n---\n\n");
    }
};