// Archivo: Librojuego/ai.generator.massive.js

window.AIGenerator = window.AIGenerator || {};

// Función auxiliar para generar números con distribución normal (Campana de Gauss)
function randomGaussianMassive(mean = 50, stdev = 20) {
    let u = 1 - Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    let val = Math.round(z * stdev + mean);
    return Math.max(0, Math.min(100, val));
}

window.AIGenerator.generateMassive = async function() {
    if (!Core.targetHandle && typeof Core.targetHandle !== 'undefined') {
        return alert("Selecciona una carpeta primero para poder guardar la obra.");
    }
    
    const premise = document.getElementById('ai-premise')?.value || "";
    const startState = document.getElementById('ai-start')?.value || "";
    const idealEnd = document.getElementById('ai-ideal-end')?.value || "";
    const characters = document.getElementById('ai-characters')?.value || "";
    const waypoints = document.getElementById('ai-waypoints')?.value || "";
    const protagonist = document.getElementById('ai-protagonist')?.value || "Héroe";
    const style = document.getElementById('ai-style')?.value || "Aventura interactiva";

    if (!premise || !startState || !idealEnd) {
        return alert("Es obligatorio rellenar al menos: Premisa, Inicio y Final Idóneo.");
    }

    try {
        // ==========================================
        // FASE 1: BIBLIA DEL MUNDO
        // ==========================================
        UI.setLoading(true, "Forjando la Biblia del Mundo...", 5, "gemini-fast preparando el lore", 10);
        
        const bibleSystemPrompt = "Eres un worldbuilder maestro. Analiza los fragmentos del usuario y construye una biblia de mundo sólida. Devuelve ESTRICTAMENTE JSON PURO. NO anides las propiedades, ponlas exactamente en la RAÍZ del objeto.";
        const bibleUserPrompt = `
            Sintetiza la siguiente información para crear la Biblia de Diseño de un librojuego masivo:
            - Premisa: ${premise}
            - Inicio: ${startState}
            - Final Idóneo (Meta 100/100): ${idealEnd}
            - Personajes: ${characters}
            - Sucesos Obligatorios: ${waypoints}
            - Protagonista: ${protagonist}
            - Tono/Estilo: ${style}

            FORMATO JSON EXACTO:
            {
                "title": "Un título épico y comercial",
                "world_rules": "Reglas inmutables de este universo",
                "core_conflict": "El conflicto principal",
                "character_arcs": "Guía de evolución de personajes",
                "ending_criteria": "Criterios para el éxito o fracaso absolutos"
            }
        `;

        const bibleData = await window.Koreh.Text.generateWithRetry(bibleSystemPrompt, bibleUserPrompt, {
            model: 'gemini-fast', 
            jsonMode: true,
            temperature: 0.7
        }, (data) => data && data.title && data.world_rules);

        const bookTitle = bibleData.title;

        // ==========================================
        // FASE 2: TOPOLOGÍA ASIMÉTRICA Y CAMPANA DE GAUSS (511 Nodos)
        // ==========================================
        UI.setLoading(true, "Estructurando Matriz Masiva...", 15, "Calculando 511 nodos y 256 finales orgánicos", 20);

        const treeNodes = [];
        const root = {
            id: "start", depth: 0, summary: `El jugador se encuentra en el comienzo de la historia. Contexto inicial: ${startState}`, 
            text: "", choices: [], scoreImpact: 0, targetScore: 0, x: 100, y: 100
        };
        treeNodes.push(root);

        let leaves = [];
        let currentLevel = [root];
        
        // Crecimiento hasta profundidad 9 (donde D9 son todo hojas)
        for (let d = 0; d < 9; d++) {
            let nextLevel = [];
            let nodesToExpand = currentLevel;
            
            // En profundidad 7 y 8, la mitad se convierten en finales prematuros
            if (d === 7 || d === 8) {
                nodesToExpand = [...currentLevel].sort(() => Math.random() - 0.5);
                const stopNodes = nodesToExpand.splice(0, Math.floor(nodesToExpand.length / 2));
                leaves.push(...stopNodes);
            }
            
            nodesToExpand.forEach((node, idx) => {
                const child1 = { id: `d${d+1}_n${idx*2}_${Math.random().toString(36).substr(2, 4)}`, depth: d+1, summary: "", text: "", choices: [], scoreImpact: 0, targetScore: 0, x: 100 + ((d+1) * 320), y: 0 };
                const child2 = { id: `d${d+1}_n${idx*2+1}_${Math.random().toString(36).substr(2, 4)}`, depth: d+1, summary: "", text: "", choices: [], scoreImpact: 0, targetScore: 0, x: 100 + ((d+1) * 320), y: 0 };
                
                node.child1Id = child1.id;
                node.child2Id = child2.id;
                
                treeNodes.push(child1, child2);
                nextLevel.push(child1, child2);
            });
            
            currentLevel = nextLevel;
            if (d === 8) {
                // Todo lo generado en profundidad 9 es final obligatorio
                leaves.push(...currentLevel);
            }
        }

        // Generar 256 puntuaciones con campana de Gauss
        const scores = [];
        for(let i = 0; i < leaves.length; i++) {
            scores.push(randomGaussianMassive(50, 22)); 
        }
        scores.sort(() => Math.random() - 0.5); 

        // Asignar finales y calcular destino (Averages bottom-up)
        leaves.forEach((leaf, i) => {
            leaf.scoreImpact = scores[i];
            leaf.targetScore = scores[i];
            leaf.summary = `[FINAL DEL JUEGO. Puntuación: ${scores[i]}/100]`; 
        });

        // Recorrer hacia arriba para promediar los target scores de las ramas
        for (let d = 8; d >= 0; d--) {
            const nodesAtDepth = treeNodes.filter(n => n.depth === d && n.child1Id); // Solo nodos que tienen hijos
            nodesAtDepth.forEach(node => {
                const child1 = treeNodes.find(n => n.id === node.child1Id);
                const child2 = treeNodes.find(n => n.id === node.child2Id);
                if (child1 && child2) {
                    node.targetScore = Math.round((child1.targetScore + child2.targetScore) / 2);
                }
            });
        }

        const totalNodesTarget = treeNodes.length; // ~511
        const totalNonLeaves = treeNodes.length - leaves.length; // ~255

        // ==========================================
        // FASE 3: ESQUELETO NARRATIVO (DE FUERA A DENTRO)
        // ==========================================
        let skeletonProcessed = 0;

        const processSkeleton = async (nodeId) => {
            const node = treeNodes.find(n => n.id === nodeId);
            if (!node || !node.child1Id) return; // Si es hoja, no tiene bifurcación

            let pct = 20 + ((skeletonProcessed / totalNonLeaves) * 30);
            UI.setLoading(true, `Tejiendo Esqueleto Masivo (${skeletonProcessed}/${totalNonLeaves} cruces)`, pct, `Nivel de profundidad ${node.depth}/9`, pct);

            const child1 = treeNodes.find(n => n.id === node.child1Id);
            const child2 = treeNodes.find(n => n.id === node.child2Id);
            
            const isPenultimate = (!child1.child1Id && !child2.child1Id);

            let instruction = `ESTADO: Expansión narrativa (Profundidad ${node.depth}/9). Crea 2 opciones coherentes que avancen la trama.`;
            if (isPenultimate) {
                instruction = "ESTADO CRÍTICO: PENÚLTIMA DECISIÓN. La 'consecuencia_inmediata' que generes aquí será directamente el DESENLACE FINAL de la aventura. Asegúrate de que los finales generados correspondan lógicamente a las puntuaciones objetivo indicadas para cada ruta.";
            }

            const skeletonSystemPrompt = "Eres un Arquitecto Narrativo. Construyes el esqueleto argumental de un librojuego dictando qué pasa en cada cruce basándote en un 'Destino de Puntuación'. Devuelve ESTRICTAMENTE JSON PURO.";
            const skeletonUserPrompt = `
                Biblia de diseño: ${JSON.stringify(bibleData)}
                ${instruction}

                CONTEXTO ACTUAL DEL NODO: "${node.summary}"

                Debes crear 2 rutas divergentes desde aquí. Guíate por el Destino Numérico precalculado de cada rama (0 es tragedia, 100 es ideal):
                - La Ruta 1 debe encaminarse temáticamente hacia un destino de puntuación: ${child1.targetScore}/100.
                - La Ruta 2 debe encaminarse temáticamente hacia un destino de puntuación: ${child2.targetScore}/100.

                INSTRUCCIÓN CRÍTICA: NUNCA uses frases genéricas. La "accion_del_jugador" debe ser inmersiva (Ej: "Saltar por la ventana", "Atacar al guardia").

                FORMATO JSON ESPERADO EXACTO:
                {
                    "rutas": [
                        { "accion_del_jugador": "[ACCIÓN CONCRETA RUTA 1]", "consecuencia_inmediata": "Lo que sucede justo después." },
                        { "accion_del_jugador": "[ACCIÓN CONCRETA RUTA 2]", "consecuencia_inmediata": "Lo que sucede justo después." }
                    ]
                }
            `;

            const skeletonData = await window.Koreh.Text.generateWithRetry(skeletonSystemPrompt, skeletonUserPrompt, {
                model: 'nova-fast', 
                jsonMode: true,
                temperature: 0.7
            }, (data) => data && Array.isArray(data.rutas) && data.rutas.length === 2);

            // Guardar opciones en el nodo actual
            node.choices.push({ text: skeletonData.rutas[0].accion_del_jugador, targetId: child1.id });
            node.choices.push({ text: skeletonData.rutas[1].accion_del_jugador, targetId: child2.id });

            // Propagar consecuencias a los hijos
            child1.summary = skeletonData.rutas[0].consecuencia_inmediata;
            child2.summary = skeletonData.rutas[1].consecuencia_inmediata;

            skeletonProcessed++;

            // Recursividad en paralelo con latencia
            await new Promise(resolve => setTimeout(resolve, 1500));
            await Promise.all([
                processSkeleton(child1.id),
                processSkeleton(child2.id)
            ]);
        };

        await processSkeleton("start");

        // ==========================================
        // FASE 4: REDACCIÓN LITERARIA EN CASCADA
        // ==========================================
        UI.setLoading(true, "Inyectando Alma Narrativa...", 50, `Escribiendo los ${totalNodesTarget} nodos`, 50);

        let nodesWritten = 0;

        const writeNarrative = async (nodeId) => {
            const node = treeNodes.find(n => n.id === nodeId);
            if (!node || node.text) return;

            node.text = "escribiendo..."; 

            const writerSystemPrompt = "Eres un novelista aclamado de ficción interactiva. Escribes en segunda persona ('Tú haces...'). Tu prosa es rica, sensorial e inmersiva. RESPONDE ÚNICAMENTE CON EL TEXTO LITERARIO PLANO (De 1 a 3 parrafos)(Nada de JSON, sin introducciones).";
            
            const isLeaf = !node.child1Id;
            let promptExtras = `Resumen de lo que debes narrar: "${node.summary}"\nOpciones que se mostrarán después: ${JSON.stringify(node.choices.map(c => c.text))}`;
            
            if (isLeaf) {
                promptExtras = `ESTE ES UN DESENLACE FINAL. Redacta el cierre definitivo de la historia basándote en este contexto previo: "${node.summary}".\nImpacto y calidad del final (0 a 100): ${node.scoreImpact}/100. Ajusta el dramatismo o la gloria a este número. No menciones el número directamente.`;
            }

            const writerUserPrompt = `
                Biblia del Mundo: ${JSON.stringify(bibleData)}
                Tu tarea es redactar la prosa inmersiva (1 a 3 párrafos).
                
                DATOS DEL NODO:
                ${promptExtras}
                
                INSTRUCCIONES CRÍTICAS: NO devuelvas JSON. Escribe solo literatura plana que fluya.
            `;

            const textTask = window.Koreh.Text.generateWithRetry(writerSystemPrompt, writerUserPrompt, {
                model: 'nova-fast',
                jsonMode: false, 
                temperature: 0.75
            }, (data) => data && typeof data === 'string' && data.length > 5)
            .then(data => {
                node.text = data.trim();
                nodesWritten++;
                let narrativePct = 50 + ((nodesWritten / totalNodesTarget) * 45);
                UI.setLoading(true, `Literatura (${nodesWritten}/${totalNodesTarget} nodos listos)`, narrativePct, `Profundidad de rama actual: ${node.depth}`, narrativePct);
            })
            .catch(err => {
                console.warn(`Fallo al redactar nodo ${node.id}`, err);
                node.text = `[Fallo narrativo] Contexto original: ${node.summary}`;
                nodesWritten++;
            });

            await new Promise(resolve => setTimeout(resolve, 1500)); 

            if (node.choices && node.choices.length > 0) {
                const branchPromises = node.choices.map(choice => writeNarrative(choice.targetId));
                await Promise.all(branchPromises);
            }

            await textTask;
        };

        await writeNarrative("start");

        // ==========================================
        // FASE 5: RESOLUCIÓN Y ENSAMBLAJE
        // ==========================================
        UI.setLoading(true, "Aplicando topología masiva...", 95, "Ensamblaje del Canvas", 100);

        treeNodes.forEach(n => {
            delete n.child1Id;
            delete n.child2Id;
            delete n.targetScore;
            delete n.summary;
        });

        // Guardar en Core
        Core.book = Core.book || {};
        Core.book.title = bookTitle;
        
        if (document.getElementById('book-title')) document.getElementById('book-title').value = Core.book.title;
        
        if (Core.bookData) {
            Core.bookData.title = bookTitle;
            Core.bookData.nodes = treeNodes;
        } else {
            Core.book.nodes = treeNodes;
        }
        
        if (typeof Canvas !== 'undefined' && Canvas.render) {
            Canvas.render();
            if(Canvas.reorderNodes) setTimeout(() => Canvas.reorderNodes(), 500);
        }
        if (typeof UI !== 'undefined') {
            if (typeof UI.switchTab === 'function') UI.switchTab('canvas');
            if (typeof UI.switchView === 'function') UI.switchView('editor');
        }
        if (typeof Core.scheduleSave === 'function') Core.scheduleSave();

    } catch (e) {
        console.error(e);
        alert("Caos Crítico en el motor Masivo. Revisa la consola.\n" + e.message);
    } finally {
        if (typeof UI !== 'undefined' && UI.setLoading) {
            UI.setLoading(false);
        }
    }
};

if (typeof Canvas !== 'undefined') {
    Canvas.render = function() {
        if(this.renderNodes) this.renderNodes();
        if(this.renderEdges) this.renderEdges();
        if(this.applyPan) this.applyPan();
    };
}