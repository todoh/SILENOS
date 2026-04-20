// Archivo: Librojuego/ai.generator.combat.js

window.AIGenerator = window.AIGenerator || {};

// Función auxiliar para lotes asíncronos (Procesa de 30 en 30 para no saturar)
async function processInBatchesCombat(items, batchSize, asyncFn, onProgress) {
    let results = [];
    let processed = 0;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (item) => {
            const res = await asyncFn(item);
            processed++;
            if (onProgress) onProgress(processed, items.length);
            return res;
        }));
        results.push(...batchResults);
        // Latencia de seguridad entre ráfagas
        await new Promise(r => setTimeout(r, 1500));
    }
    return results;
}

window.AIGenerator.generateCombatBook = async function() {
    if (!Core.targetHandle && typeof Core.targetHandle !== 'undefined') {
        return alert("Selecciona una carpeta primero para poder guardar la obra.");
    }
    
    const premise = document.getElementById('ai-premise')?.value || "";
    const startState = document.getElementById('ai-start')?.value || "";
    const idealEnd = document.getElementById('ai-ideal-end')?.value || "";
    const characters = document.getElementById('ai-characters')?.value || "";
    const waypoints = document.getElementById('ai-waypoints')?.value || "";
    const protagonist = document.getElementById('ai-protagonist')?.value || "Héroe";
    const style = document.getElementById('ai-style')?.value || "Aventura interactiva táctica";

    if (!premise || !startState || !idealEnd) {
        return alert("Es obligatorio rellenar al menos: Premisa, Inicio y Final Idóneo.");
    }

    try {
        // ==========================================
        // FASE 1: MACRO-ESTRUCTURA (LOS 5 ACTOS)
        // ==========================================
        UI.setLoading(true, "Fase 1: Trazando los 5 Actos Militares...", 5, "Definiendo Cuellos de Botella", 10);
        
        const macroPromptSystem = "Eres un Arquitecto Narrativo de ficción bélica y supervivencia. Divide la historia en 5 grandes Actos ineludibles. Devuelve ESTRICTAMENTE JSON PURO.";
        const macroPromptUser = `
            Premisa: ${premise}
            Inicio: ${startState}
            Final: ${idealEnd}
            Hitos: ${waypoints}
            
            Define el contexto narrativo de los 5 grandes Actos (Cuellos de Botella) enfocados en combate y supervivencia.
            FORMATO JSON EXACTO:
            {
                "title": "Título Épico",
                "combat_style": "Descripción del tipo de combate (visceral, mágico, táctico...)",
                "acts": [
                    { "act": 1, "context": "Contexto del inicio..." },
                    { "act": 2, "context": "Contexto del segundo acto..." },
                    { "act": 3, "context": "Contexto del ecuador..." },
                    { "act": 4, "context": "Contexto del clímax..." },
                    { "act": 5, "context": "Contexto de las batallas finales..." }
                ]
            }
        `;

        const macroData = await window.Koreh.Text.generateWithRetry(macroPromptSystem, macroPromptUser, {
            model: 'gemini-fast', jsonMode: true, temperature: 0.7
        }, (d) => d && d.acts && d.acts.length === 5);

        const bookTitle = macroData.title;

        // ==========================================
        // FASE 2: TOPOLOGÍA COLOSAL CON MATRICES DE COMBATE
        // ==========================================
        UI.setLoading(true, "Fase 2: Esculpiendo Topología Colosal...", 15, "Generando miles de nodos con matrices de combate de 16 nodos", 20);

        let treeNodes = [];
        const actWidths = [3, 8, 15, 25, 15, 8, 3]; // Bloques lógicos por capa
        
        let nexusNodes = [];
        for (let i = 0; i <= 5; i++) {
            nexusNodes.push({
                id: i === 0 ? "start" : `nexus_${i}`,
                type: 'nexus',
                act: i === 0 ? 1 : i,
                summary: i === 0 ? startState : macroData.acts[(i-1) === 4 ? 4 : i-1].context,
                text: "", choices: [], scoreImpact: 0,
                x: i * 5000, y: 2000
            });
        }
        treeNodes.push(nexusNodes[0]);

        // Función para generar una Matriz de Combate completa
        const buildCombatMatrix = (xOffset, yOffset, act, prefix) => {
            const getSevere = () => Math.floor(Math.random() * 3) + 2;
            const getBot = () => Math.floor(Math.random() * 4) + 1;
            const nodes = [];
            const combatTopo = {
                'A': { desc: "Inicio del combate", pen: 0, dx: 0, dy: 0 },
                'B0': { desc: "Ronda 1: Éxito total sin daño", pen: 0, dx: 300, dy: -250 },
                'B1': { desc: "Ronda 1: Ataque exitoso, un roce", pen: 1, dx: 300, dy: 0 },
                'B2': { desc: "Ronda 1: Fallo crítico, el enemigo alcanza", pen: getSevere(), dx: 300, dy: 250 },
                'C0': { desc: "Ronda 2: Éxito total", pen: 0, dx: 600, dy: -500 },
                'C1': { desc: "Ronda 2: Roce leve", pen: 1, dx: 600, dy: -350 },
                'C2': { desc: "Ronda 2: Golpe severo", pen: getSevere(), dx: 600, dy: -200 },
                'C3': { desc: "Ronda 2: Éxito total", pen: 0, dx: 600, dy: -100 },
                'C4': { desc: "Ronda 2: Roce leve", pen: 1, dx: 600, dy: 0 },
                'C5': { desc: "Ronda 2: Golpe severo", pen: getSevere(), dx: 600, dy: 100 },
                'C6': { desc: "Ronda 2: Éxito total", pen: 0, dx: 600, dy: 200 },
                'C7': { desc: "Ronda 2: Roce leve", pen: 1, dx: 600, dy: 350 },
                'C8': { desc: "Ronda 2: Golpe severo", pen: getSevere(), dx: 600, dy: 500 },
                'D0': { desc: "Apertura perfecta, golpe de gracia", pen: 0, dx: 900, dy: -150 },
                'D1': { desc: "El enemigo te acorrala antes del final", pen: getBot(), dx: 900, dy: 150 },
                'E':  { desc: "Victoria. El enemigo cae.", pen: 0, dx: 1200, dy: 0 }
            };
            const map = {};
            for (let k in combatTopo) {
                let nd = combatTopo[k];
                let cNode = {
                    id: `${prefix}_${k}`, combatKey: k, type: 'combat_internal', act: act,
                    desc_teorica: nd.desc, summary: "", text: "", choices: [], scoreImpact: k === 'E' ? 15 : 0,
                    x: xOffset + nd.dx, y: yOffset + nd.dy
                };
                if (nd.pen > 0) cNode.eff = { type: 'vida', op: '-', val: nd.pen.toString() };
                nodes.push(cNode);
                map[k] = cNode;
            }
            const linkCombat = (fromKey, toKeys) => {
                toKeys.forEach(tk => { map[fromKey].choices.push({ targetId: map[tk].id, _combatTargetKey: tk }); });
            };
            linkCombat('A', ['B0', 'B1', 'B2']);
            linkCombat('B0', ['C0', 'C1', 'C2']);
            linkCombat('B1', ['C3', 'C4', 'C5']);
            linkCombat('B2', ['C6', 'C7', 'C8']);
            ['C0','C1','C2','C3','C4','C5','C6','C7','C8'].forEach(cKey => linkCombat(cKey, ['D0', 'D1']));
            linkCombat('D0', ['E']);
            linkCombat('D1', ['E']);

            map['A'].type = 'combat_root'; // Para identificarlo en la fase 3
            map['A'].matrixNodes = nodes; // Referencia para el batch

            return { entry: map['A'], exit: map['E'], allNodes: nodes };
        };

        // Generar 4 Actos Convergentes (Diamantes)
        for (let act = 1; act <= 4; act++) {
            let startNexus = { entry: nexusNodes[act - 1], exit: nexusNodes[act - 1] };
            let endNexus = { entry: nexusNodes[act], exit: nexusNodes[act] };
            
            let levels = [[startNexus]];
            let xOffset = startNexus.entry.x;

            for (let w of actWidths) {
                xOffset += 800; // Espacio amplio para acomodar matrices de combate
                let layer = [];
                for (let i = 0; i < w; i++) {
                    const rand = Math.random();
                    const blockY = 2000 - ((w * 200) / 2) + (i * 200);
                    const prefix = `A${act}_L${levels.length}_N${i}_${Math.random().toString(36).substr(2,4)}`;
                    
                    if (rand < 0.25) {
                        // 25% COMBATE (Matriz de 16 nodos)
                        const cMatrix = buildCombatMatrix(xOffset, blockY, act, prefix);
                        treeNodes.push(...cMatrix.allNodes);
                        layer.push(cMatrix);
                    } else if (rand < 0.45) {
                        // 20% REWARD (Botín)
                        const rNode = {
                            id: prefix, type: 'reward', act: act, summary: "Encuentras un botín y curas heridas.", text: "", choices: [], 
                            scoreImpact: 10, eff: { type: 'vida', op: '+', val: '5' }, x: xOffset, y: blockY
                        };
                        treeNodes.push(rNode);
                        layer.push({ entry: rNode, exit: rNode });
                    } else {
                        // 55% TRANSIT (Narrativa normal)
                        const tNode = {
                            id: prefix, type: 'transit', act: act, summary: "", text: "", choices: [], scoreImpact: 0, x: xOffset, y: blockY
                        };
                        treeNodes.push(tNode);
                        layer.push({ entry: tNode, exit: tNode });
                    }
                }
                levels.push(layer);
            }
            levels.push([endNexus]);
            if (act < 4) treeNodes.push(endNexus.entry);

            // Conectar capas: L -> L+1
            for (let l = 0; l < levels.length - 1; l++) {
                let currentLayer = levels[l];
                let nextLayer = levels[l + 1];
                
                // Asegurar que todo entry en nextLayer tiene al menos 1 padre (exit en currentLayer)
                nextLayer.forEach(target => {
                    let parent = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                    parent.exit.choices.push({ targetId: target.entry.id });
                });

                // Completar hasta 2 o 3 opciones por exit en currentLayer
                currentLayer.forEach(block => {
                    let numChoices = Math.floor(Math.random() * 2) + 1;
                    while (block.exit.choices.length < numChoices) {
                        let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                        if (!block.exit.choices.find(c => c.targetId === target.entry.id)) {
                            block.exit.choices.push({ targetId: target.entry.id });
                        } else {
                            break; 
                        }
                    }
                });
            }
        }

        // Generar Acto 5 Divergente (Explosión a Finales)
        let act5Nexus = { entry: nexusNodes[4], exit: nexusNodes[4] };
        treeNodes.push(act5Nexus.entry);
        let a5Levels = [[act5Nexus]];
        let xOff5 = act5Nexus.entry.x;
        const act5Widths = [3, 8, 15, 25]; // No converge
        
        for (let w of act5Widths) {
            xOff5 += 800;
            let layer = [];
            for (let i = 0; i < w; i++) {
                const prefix = `A5_L${a5Levels.length}_N${i}_${Math.random().toString(36).substr(2,4)}`;
                const rand = Math.random();
                const blockY = 2000 - ((w * 200) / 2) + (i * 200);

                if (rand < 0.3) {
                    const cMatrix = buildCombatMatrix(xOff5, blockY, 5, prefix);
                    treeNodes.push(...cMatrix.allNodes);
                    layer.push(cMatrix);
                } else {
                    const tNode = {
                        id: prefix, type: 'transit', act: 5, summary: "", text: "", choices: [], scoreImpact: 0, x: xOff5, y: blockY
                    };
                    treeNodes.push(tNode);
                    layer.push({ entry: tNode, exit: tNode });
                }
            }
            a5Levels.push(layer);
        }

        // Capa Final (100 Finales Menores y Mayores)
        let endingLayer = [];
        xOff5 += 1000;
        for (let i = 0; i < 100; i++) {
            let isMajor = Math.random() > 0.8;
            let finalScore = isMajor ? (Math.random() > 0.5 ? 100 : 0) : Math.floor(Math.random() * 80) + 10;
            let eNode = {
                id: `FINAL_${i}_${Math.random().toString(36).substr(2,4)}`,
                type: isMajor ? 'ending_major' : 'ending_minor', act: 5,
                summary: isMajor ? "Desenlance total absoluto." : "Final prematuro o de sacrificio.", 
                text: "", choices: [], scoreImpact: finalScore,
                x: xOff5, y: 2000 - ((100 * 80) / 2) + (i * 80)
            };
            treeNodes.push(eNode);
            endingLayer.push({ entry: eNode, exit: eNode });
        }
        a5Levels.push(endingLayer);

        // Conectar capas Acto 5
        for (let l = 0; l < a5Levels.length - 1; l++) {
            let currentLayer = a5Levels[l];
            let nextLayer = a5Levels[l + 1];
            nextLayer.forEach(target => {
                let parent = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                parent.exit.choices.push({ targetId: target.entry.id });
            });
            currentLayer.forEach(block => {
                let numChoices = Math.floor(Math.random() * 2) + 1;
                while (block.exit.choices.length < numChoices) {
                    let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                    if (!block.exit.choices.find(c => c.targetId === target.entry.id)) block.exit.choices.push({ targetId: target.entry.id }); else break;
                }
            });
        }

        // ==========================================
        // FASE 3: ESQUELETO NARRATIVO Y TÁCTICO (LOTES)
        // ==========================================
        
        // 3.1 Procesar Nodos Normales (Transit, Reward, Nexus)
        const normalNodes = treeNodes.filter(n => (n.type === 'transit' || n.type === 'reward' || n.type === 'nexus') && n.choices.length > 0);
        
        const buildNormalSkeleton = async (node) => {
            const actInfo = macroData.acts[node.act - 1].context;
            const routeCount = node.choices.length;
            const sysPrompt = "Eres un Motor Lógico de supervivencia. Genera opciones tácticas. Devuelve ESTRICTAMENTE JSON PURO.";
            const usrPrompt = `
                Acto ${node.act}: ${actInfo}
                Contexto actual del nodo: "${node.summary || "Avanzando en territorio hostil..."}"
                
                Genera EXACTAMENTE ${routeCount} rutas lógicas.
                FORMATO: { "rutas": [ { "accion": "Escabullirse", "consecuencia": "Evades a la patrulla" } ] }
            `;
            
            try {
                const data = await window.Koreh.Text.generateWithRetry(sysPrompt, usrPrompt, { model: 'nova-fast', jsonMode: true, temperature: 0.6 }, (d) => d && Array.isArray(d.rutas) && d.rutas.length >= 1);
                for (let i = 0; i < routeCount; i++) {
                    const r = data.rutas[i] || data.rutas[0];
                    node.choices[i].text = r.accion;
                    const targetNode = treeNodes.find(tn => tn.id === node.choices[i].targetId);
                    if (targetNode && !targetNode.summary && targetNode.type !== 'combat_root') {
                        targetNode.summary = r.consecuencia;
                    }
                }
            } catch (e) {
                for (let i = 0; i < routeCount; i++) node.choices[i].text = `Avanzar cautelosamente`;
            }
        };

        await processInBatchesCombat(normalNodes, 60, buildNormalSkeleton, (done, total) => {
            let pct = 20 + ((done / total) * 15);
            UI.setLoading(true, `Fase 3: Tejiendo Exploración...`, pct, `Nodos mapeados: ${done}/${total}`, pct);
        });

        // 3.2 Procesar Raíces de Combate (Generan el esqueleto de sus 16 nodos internos)
        const combatRoots = treeNodes.filter(n => n.type === 'combat_root');

        const buildCombatSkeleton = async (rootNode) => {
            const sysPromptC = "Eres un Diseñador Táctico. Genera un armazón lógico para un combate complejo de 16 nodos. Las 'accion_previa' deben ser acciones NEUTRALES y CIEGAS (ej. 'Atacar por la izquierda') que no revelen si hay éxito o fracaso. Devuelve ESTRICTAMENTE JSON PURO.";
            
            let descList = rootNode.matrixNodes.map(n => `- ${n.combatKey}: ${n.desc_teorica} (Penalización de vida: ${n.eff ? '-'+n.eff.val : '0'})`).join('\n');
            
            const userPromptC = `
                Biblia de Combate: ${macroData.combat_style}
                
                Define el armazón lógico para los 16 nodos de esta matriz de combate.
                DESCRIPCIONES TEÓRICAS OBLIGATORIAS POR NODO:
                ${descList}

                FORMATO JSON EXACTO:
                {
                    "nodos": {
                        "A": { "accion_previa": "Desenvainar arma", "resumen": "El combate inicia..." },
                        "B0": { "accion_previa": "Estocada rápida", "resumen": "Impactas limpiamente..." },
                        "E": { "accion_previa": "Golpe de gracia", "resumen": "El enemigo muere." }
                    }
                }
            `;

            try {
                const skeletonData = await window.Koreh.Text.generateWithRetry(sysPromptC, userPromptC, { model: 'gemini-fast', jsonMode: true, temperature: 0.6 }, (d) => d && d.nodos && d.nodos.A && d.nodos.E);
                
                rootNode.matrixNodes.forEach(node => {
                    const sData = skeletonData.nodos[node.combatKey] || { accion_previa: "Atacar", resumen: node.desc_teorica };
                    node.summary = sData.resumen;
                    
                    // Poner texto a las opciones que apuntan a este nodo interno
                    rootNode.matrixNodes.forEach(parent => {
                        const choice = parent.choices.find(c => c.targetId === node.id);
                        if (choice) choice.text = sData.accion_previa;
                    });
                });
            } catch (e) {
                rootNode.matrixNodes.forEach(node => {
                    node.summary = node.desc_teorica;
                    rootNode.matrixNodes.forEach(parent => {
                        const choice = parent.choices.find(c => c.targetId === node.id);
                        if (choice) choice.text = "Atacar";
                    });
                });
            }
        };

        await processInBatchesCombat(combatRoots, 30, buildCombatSkeleton, (done, total) => {
            let pct = 35 + ((done / total) * 15);
            UI.setLoading(true, `Fase 3: Forjando Matrices Tácticas...`, pct, `Combates complejos: ${done}/${total} (x16 nodos)`, pct);
        });

        // ==========================================
        // FASE 4: REDACCIÓN LITERARIA (LOTES MASIVOS)
        // ==========================================
        const writeLiterature = async (node) => {
            let styleInstruction = "ESTILO TRANSICIÓN: Escribe 1 o 2 frases rápidas y tensas.";
            if (node.type === 'nexus') styleInstruction = "ESTILO NEXUS: Escribe 2 párrafos épicos e inmersivos estableciendo el escenario mayor.";
            if (node.type === 'reward') styleInstruction = "ESTILO BOTÍN: Narra cómo el jugador se cura y encuentra suministros tras la masacre (1 párrafo).";
            if (node.type === 'combat_internal' || node.type === 'combat_root') styleInstruction = "ESTILO COMBATE: Escribe la prosa épica, sangrienta y táctica de este instante exacto de la batalla (1-2 párrafos).";
            if (node.type.includes('ending')) styleInstruction = `ESTILO FINAL: Cierre definitivo. Calidad: ${node.scoreImpact}/100. Ajusta la gloria o miseria a este número. (2 párrafos).`;

            const sysPrompt = "Eres un novelista bélico y de fantasía interactiva. Escribes en segunda persona ('Tú haces...'). RESPONDE ÚNICAMENTE CON LITERATURA PLANA.";
            const usrPrompt = `
                Estilo de Combate: ${macroData.combat_style}
                
                Narra lo siguiente: "${node.summary || "Avanzas con cautela."}"
                
                ${styleInstruction}
                Opciones que elegirá el jugador luego (dales sentido lógico): ${JSON.stringify(node.choices.map(c => c.text))}
            `;

            try {
                const text = await window.Koreh.Text.generateWithRetry(sysPrompt, usrPrompt, {
                    model: 'nova-fast', jsonMode: false, temperature: 0.75
                }, (d) => typeof d === 'string' && d.length > 10);
                node.text = text.trim();
            } catch (e) {
                node.text = `[Fallo narrativo en nodo de combate/trama] ${node.summary}`;
            }
        };

        await processInBatchesCombat(treeNodes, 60, writeLiterature, (done, total) => {
            let pct = 50 + ((done / total) * 45);
            UI.setLoading(true, `Fase 4: Inyectando Alma Literaria Colosal...`, pct, `Textos generados: ${done}/${total} nodos`, pct);
        });

        // ==========================================
        // FASE 5: RESOLUCIÓN Y ENSAMBLAJE
        // ==========================================
        UI.setLoading(true, "Fase 5: Compilando Obra Definitiva...", 98, "Limpiando variables temporales...", 100);

        treeNodes.forEach(n => { 
            delete n.act; delete n.type; delete n.summary; 
            delete n.combatKey; delete n.desc_teorica; delete n.matrixNodes;
            if (n.choices) {
                n.choices.forEach(c => delete c._combatTargetKey);
            }
        });

        Core.book = Core.book || {};
        Core.book.title = bookTitle;
        if (document.getElementById('book-title')) document.getElementById('book-title').value = Core.book.title;
        
        if (Core.bookData) { Core.bookData.title = bookTitle; Core.bookData.nodes = treeNodes; } 
        else { Core.book.nodes = treeNodes; }
        
        if (typeof Canvas !== 'undefined' && Canvas.render) {
            Canvas.render();
            // Desactivamos auto-reorder para evitar congelar el navegador con 2000+ nodos.
        }
        
        if (typeof UI !== 'undefined') {
            if (typeof UI.switchTab === 'function') UI.switchTab('canvas');
            if (typeof UI.switchView === 'function') UI.switchView('editor');
        }
        if (typeof Core.scheduleSave === 'function') Core.scheduleSave();

    } catch (e) {
        console.error(e);
        alert("Caos Crítico en el motor Colosal de Combate. Revisa la consola.\n" + e.message);
    } finally {
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
    }
};

if (typeof Canvas !== 'undefined') {
    Canvas.render = function() {
        if(this.renderNodes) this.renderNodes();
        if(this.renderEdges) this.renderEdges();
        if(this.applyPan) this.applyPan();
    };
}