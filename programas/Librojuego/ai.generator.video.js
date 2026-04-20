// Archivo: Librojuego/ai.generator.video.js

window.AIGenerator = window.AIGenerator || {};

// Función auxiliar para generar números con distribución normal (Campana de Gauss)
function randomGaussianVideo(mean = 50, stdev = 20) {
    let u = 1 - Math.random();
    let v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    let val = Math.round(z * stdev + mean);
    return Math.max(0, Math.min(100, val));
}

window.AIGenerator.generateVideoSize = async function() {
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
            Sintetiza la siguiente información para crear la Biblia de Diseño de un videolibrojuego rápido:
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
        // FASE 2: TOPOLOGÍA BINARIA DE VIDEO (31 Nodos)
        // ==========================================
        UI.setLoading(true, "Estructurando Matriz de Video...", 15, "Calculando 31 nodos y 16 finales", 20);

        const MAX_DEPTH = 4; // 2^0 + 2^1 + 2^2 + 2^3 + 2^4 = 31 nodos totales
        const totalNodesTarget = 31;
        const treeNodes = [];

        // 1. Crear nodos
        for (let d = 0; d <= MAX_DEPTH; d++) {
            const count = Math.pow(2, d);
            for (let i = 0; i < count; i++) {
                treeNodes.push({
                    id: d === 0 ? "start" : `d${d}_n${i}`,
                    depth: d,
                    index: i,
                    summary: "",
                    text: "",
                    choices: [],
                    scoreImpact: 0,
                    targetScore: 0,
                    x: 100 + (d * 320),
                    y: 100 + (i * 120) 
                });
            }
        }

        // 2. Generar 16 puntuaciones con campana de Gauss
        const scores = [];
        for(let i = 0; i < 16; i++) {
            scores.push(randomGaussianVideo(50, 22)); 
        }
        scores.sort(() => Math.random() - 0.5); // Mezclar aleatoriamente

        // 3. Asignar finales y calcular destino (Averages bottom-up)
        const leaves = treeNodes.filter(n => n.depth === MAX_DEPTH);
        leaves.forEach((leaf, i) => {
            leaf.scoreImpact = scores[i];
            leaf.targetScore = scores[i];
            leaf.summary = `[FINAL DEL JUEGO. Puntuación: ${scores[i]}/100]`; 
        });

        for (let d = MAX_DEPTH - 1; d >= 0; d--) {
            const nodesAtDepth = treeNodes.filter(n => n.depth === d);
            nodesAtDepth.forEach(node => {
                const child1 = treeNodes.find(n => n.depth === d + 1 && n.index === node.index * 2);
                const child2 = treeNodes.find(n => n.depth === d + 1 && n.index === node.index * 2 + 1);
                
                node.child1Id = child1.id;
                node.child2Id = child2.id;
                node.targetScore = Math.round((child1.targetScore + child2.targetScore) / 2);
            });
        }

        treeNodes[0].summary = `El jugador se encuentra en el comienzo de la historia. Contexto inicial: ${startState}`;

        // ==========================================
        // FASE 3: ESQUELETO NARRATIVO (DE FUERA A DENTRO)
        // ==========================================
        let skeletonProcessed = 0;
        const totalNonLeaves = 15; // 31 - 16

        const processSkeleton = async (nodeId) => {
            const node = treeNodes.find(n => n.id === nodeId);
            if (!node || node.depth === MAX_DEPTH) return; 

            let pct = 20 + ((skeletonProcessed / totalNonLeaves) * 30);
            UI.setLoading(true, `Tejiendo Esqueleto (${skeletonProcessed}/${totalNonLeaves} cruces)`, pct, `Nivel de profundidad ${node.depth}/4`, pct);

            const child1 = treeNodes.find(n => n.id === node.child1Id);
            const child2 = treeNodes.find(n => n.id === node.child2Id);

            let instruction = `ESTADO: Expansión narrativa (Profundidad ${node.depth}/4). Crea 2 opciones coherentes que avancen la trama.`;
            if (node.depth === MAX_DEPTH - 1) {
                instruction = "ESTADO CRÍTICO: PENÚLTIMA DECISIÓN. La 'consecuencia_inmediata' que generes aquí será directamente el DESENLACE FINAL de la aventura. Asegúrate de que los finales generados correspondan lógicamente a las puntuaciones objetivo indicadas para cada ruta.";
            }

            const skeletonSystemPrompt = "Eres un Arquitecto Narrativo. Construyes el esqueleto argumental de un librojuego dictando qué pasa en cada cruce basándote en un 'Destino de Puntuación'. Devuelve ESTRICTAMENTE JSON PURO.";
            const skeletonUserPrompt = `
                Biblia de diseño: ${JSON.stringify(bibleData)}
                ${instruction}

                CONTEXTO ACTUAL DEL NODO: "${node.summary}"

                Debes crear 2 rutas divergentes desde aquí. Para evitar repeticiones, guíate por el Destino Numérico precalculado de cada rama (0 es tragedia/muerte, 100 es el final idóneo):
                - La Ruta 1 (Acción A) debe encaminarse temáticamente hacia un destino de puntuación: ${child1.targetScore}/100.
                - La Ruta 2 (Acción B) debe encaminarse temáticamente hacia un destino de puntuación: ${child2.targetScore}/100.

                INSTRUCCIÓN MUY IMPORTANTE: NUNCA uses frases genéricas. La "accion_del_jugador" debe ser la acción inmersiva y directa que realiza el personaje.

                FORMATO JSON ESPERADO EXACTO:
                {
                    "rutas": [
                        { "accion_del_jugador": "[ESCRIBE AQUÍ LA ACCIÓN CONCRETA]", "consecuencia_inmediata": "Lo que sucede justo después de elegir esto." },
                        { "accion_del_jugador": "[ESCRIBE AQUÍ LA ACCIÓN CONCRETA]", "consecuencia_inmediata": "Lo que sucede justo después de elegir la segunda opción." }
                    ]
                }
            `;

            const skeletonData = await window.Koreh.Text.generateWithRetry(skeletonSystemPrompt, skeletonUserPrompt, {
                model: 'nova-fast', 
                jsonMode: true,
                temperature: 0.7
            }, (data) => data && Array.isArray(data.rutas) && data.rutas.length === 2);

            node.choices.push({ text: skeletonData.rutas[0].accion_del_jugador, targetId: child1.id });
            node.choices.push({ text: skeletonData.rutas[1].accion_del_jugador, targetId: child2.id });

            child1.summary = skeletonData.rutas[0].consecuencia_inmediata;
            child2.summary = skeletonData.rutas[1].consecuencia_inmediata;

            skeletonProcessed++;

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
        UI.setLoading(true, "Inyectando Alma Narrativa...", 50, "Escribiendo los 31 nodos", 50);

        let nodesWritten = 0;

        const writeNarrative = async (nodeId) => {
            const node = treeNodes.find(n => n.id === nodeId);
            if (!node || node.text) return;

            node.text = "escribiendo..."; // Candado

            const writerSystemPrompt = "Eres un novelista aclamado de ficción interactiva. Escribes en segunda persona ('Tú haces...'). Tu prosa es rica, sensorial e inmersiva. RESPONDE ÚNICAMENTE CON EL TEXTO LITERARIO PLANO (De 1 a 3 parrafos)(Nada de JSON, sin introducciones).";
            let promptExtras = `Resumen de lo que debes narrar: "${node.summary}"\nOpciones que se mostrarán después: ${JSON.stringify(node.choices.map(c => c.text))}`;
            
            if (node.depth === MAX_DEPTH) {
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
                UI.setLoading(true, `Literatura (${nodesWritten}/31 nodos listos)`, narrativePct, `Profundidad de rama actual: ${node.depth}`, narrativePct);
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
        UI.setLoading(true, "Aplicando topología final...", 95, "Ensamblaje del Canvas", 100);

        treeNodes.forEach(n => {
            delete n.child1Id;
            delete n.child2Id;
            delete n.targetScore;
            delete n.index;
            delete n.depth;
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
        alert("Caos Crítico en el motor de Agentes. Revisa la consola.\n" + e.message);
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