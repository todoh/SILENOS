// Archivo: Librojuego/ai.generator.advanced.js

window.AIGenerator = window.AIGenerator || {};

// Función auxiliar para lotes asíncronos
async function processInBatchesAdvanced(items, batchSize, asyncFn, onProgress) {
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
        await new Promise(r => setTimeout(r, 1500)); // Latencia de seguridad
    }
    return results;
}

window.AIGenerator.generateAdvanced = async function() {
    if (!Core.targetHandle && typeof Core.targetHandle !== 'undefined') {
        return alert("Selecciona una carpeta primero para poder guardar la obra.");
    }
    
    if (typeof window.AIAdvancedCalls === 'undefined') {
        return alert("Falta el módulo de IA (ai.generator.advanced2.js). Asegúrate de que esté enlazado en el HTML.");
    }

    const premise = document.getElementById('ai-premise')?.value || "";
    const startState = document.getElementById('ai-start')?.value || "";
    const idealEnd = document.getElementById('ai-ideal-end')?.value || "";
    const style = document.getElementById('ai-style')?.value || "Aventura RPG";

    if (!premise || !startState || !idealEnd) {
        return alert("Es obligatorio rellenar al menos: Premisa, Inicio y Final Idóneo.");
    }

    try {
        // ==========================================
        // FASE 1: BIBLIA HÍBRIDA (MECÁNICA + NARRATIVA)
        // ==========================================
        UI.setLoading(true, "Fase 1: Diseñando Sistemas RPG...", 10, "Creando atributos y economía", 10);
        
        const rpgData = await window.AIAdvancedCalls.designRPGSystem(premise, idealEnd, style);
        const bookTitle = rpgData.title;
        let treeNodes = [];
        
        // ==========================================
        // FASE 2: ESQUELETO MATEMÁTICO (TOPOLOGÍA 136 NODOS)
        // ==========================================
        UI.setLoading(true, "Fase 2: Forjando Matriz Física...", 25, "Generando Árbol de Diamante (Max 3 opciones)", 25);
        
        let idCount = 0;
        const getId = (prefix) => `${prefix}_${++idCount}_${Math.random().toString(36).substr(2,4)}`;
        
        // Nueva lógica de conexión: Reparto equitativo para evitar sobrecarga de opciones
        const connectForward = (layerA, layerB, maxChoices = 3) => {
            // Aseguramos que cada nodo de la capa B tenga exactamente 1 padre en la capa A
            // para evitar nodos huérfanos inalcanzables.
            let availableParents = [...layerA];
            
            layerB.forEach(nodeB => {
                // Ordenamos los padres por el número de opciones, de menor a mayor.
                availableParents.sort((a, b) => (a.choices?.length || 0) - (b.choices?.length || 0));
                let parent = availableParents[0];
                if (!parent.choices) parent.choices = [];
                parent.choices.push({ targetId: nodeB.id });
            });

            // Añadimos conexiones extra aleatorias (recombinación) para hacer la red más compleja
            layerA.forEach(nodeA => {
                if (!nodeA.choices) nodeA.choices = [];
                let extraLinks = Math.floor(Math.random() * 2); // 0 o 1 enlace extra
                for (let i = 0; i < extraLinks; i++) {
                    if (nodeA.choices.length < maxChoices) {
                        let randomTarget = layerB[Math.floor(Math.random() * layerB.length)];
                        // Evitamos duplicar rutas
                        if (!nodeA.choices.find(c => c.targetId === randomTarget.id)) {
                            nodeA.choices.push({ targetId: randomTarget.id });
                        }
                    }
                }
            });
        };

        // Renderizado centrado dinámico en el Canvas
        const createLayer = (prefix, count, act, startX, typesPool) => {
            let layer = [];
            const centerY = 1500;
            const ySpacing = 140;
            const startY = centerY - ((count - 1) * ySpacing) / 2;

            for (let i = 0; i < count; i++) {
                let type = typesPool[Math.floor(Math.random() * typesPool.length)];
                let node = { id: getId(prefix), type: type, act: act, summary: "", effs: [], text: "", choices: [], x: startX, y: startY + (i * ySpacing) };
                
                if (type === 'trap') {
                    node.effs = [{type: 'vida', op: '-', val: Math.floor(Math.random() * 2) + 1}]; 
                    node.summary = "Sufres un rasguño menor por una trampa o el entorno (1-2 HP).";
                } else if (type === 'reward_currency') {
                    node.effs = [{type: 'item', op: 'ADD', val: rpgData.currency, qty: Math.floor(Math.random() * 15) + 10}];
                    node.summary = `Encuentras un gran botín de ${rpgData.currency}.`;
                } else if (type === 'reward_key') {
                    node.effs = [{type: 'item', op: 'ADD', val: rpgData.key_item, qty: 1}];
                    node.summary = `Encuentras el objeto clave vital para tu destino: ${rpgData.key_item}.`;
                } else if (type === 'combat') {
                    node.effs = [{type: 'module_combat', enemyName: rpgData.minion_name, stats: {vida: 6, ataque: 3, defensa: 2, agilidad: 3, destreza: 3}}];
                    node.summary = `Combate rápido contra ${rpgData.minion_name}.`;
                } else if (type === 'shop') {
                    node.effs = [{type: 'module_shop', itemName: 'Poción de Curación', itemPrice: 10}];
                    node.summary = "Encuentras a un mercader errante o santuario de descanso.";
                } else {
                    node.summary = "Avanzas explorando el intrincado entorno.";
                }
                layer.push(node);
            }
            return layer;
        };

        const startNode = { id: 'start', type: 'start', act: 1, summary: startState, text: "", choices: [], scoreImpact: 0, x: 200, y: 1500 };
        
        // Estructura orgánica Acto 1 (Total: 47 nodos)
        const a1_l1 = createLayer('A1_L1', 3, 1, 600, ['explore', 'trap', 'reward_currency']);
        const a1_l2 = createLayer('A1_L2', 9, 1, 1000, ['explore', 'combat', 'reward_currency']);
        const a1_l3 = createLayer('A1_L3', 14, 1, 1400, ['explore', 'shop', 'combat']);
        a1_l3[0].type = 'reward_key';
        a1_l3[0].effs = [{type: 'item', op: 'ADD', val: rpgData.key_item, qty: 1}];
        a1_l3[0].summary = `Encuentras el objeto clave vital: ${rpgData.key_item}.`;
        
        const a1_l4 = createLayer('A1_L4', 11, 1, 1800, ['explore', 'trap']);
        const a1_l5 = createLayer('A1_L5', 6, 1, 2200, ['explore', 'reward_currency']);
        const a1_l6 = createLayer('A1_L6', 2, 1, 2600, ['explore']);
        const a1_boss = { id: getId('A1_BOSS'), type: 'combat', act: 1, summary: `Un ${rpgData.elite_name} bloquea el paso al siguiente acto.`, effs: [{type: 'module_combat', enemyName: rpgData.elite_name, stats: {vida: 12, ataque: 4, defensa: 3, agilidad: 4, destreza: 4}}], text: "", choices: [], x: 3000, y: 1500 };

        // Estructura orgánica Acto 2 (Total: 67 nodos)
        const a2_l1 = createLayer('A2_L1', 3, 2, 3400, ['explore', 'trap']);
        const a2_l2 = createLayer('A2_L2', 9, 2, 3800, ['explore', 'combat', 'reward_currency']);
        const a2_l3 = createLayer('A2_L3', 16, 2, 4200, ['explore', 'shop', 'trap']);
        const a2_l4 = createLayer('A2_L4', 20, 2, 4600, ['explore', 'combat']);
        const a2_l5 = createLayer('A2_L5', 11, 2, 5000, ['explore', 'trap']);
        const a2_l6 = createLayer('A2_L6', 4, 2, 5400, ['explore']);
        
        const a2_lock = { id: getId('A2_LOCK'), type: 'lock', act: 2, summary: `La Gran Puerta Central. Exige portar: ${rpgData.key_item}.`, effs: [], text: "", choices: [], x: 5800, y: 1500 };
        const a2_penalty1 = { id: getId('A2_PEN'), type: 'trap', act: 2, summary: `Al no tener la llave, caes a un foso de castigo.`, effs: [{type: 'vida', op: '-', val: 2}], text: "", choices: [], x: 5800, y: 1800 };
        const a2_penalty2 = { id: getId('A2_PEN'), type: 'trap', act: 2, summary: `El foso te desorienta, pasas un mal rato.`, effs: [{type: 'vida', op: '-', val: 2}], text: "", choices: [], x: 6100, y: 1800 };
        const a2_penalty3 = { id: getId('A2_PEN'), type: 'explore', act: 2, summary: `Logras salir del foso, exhausto, hacia el Acto 3.`, effs: [], text: "", choices: [], x: 6400, y: 1800 };

        // Estructura orgánica Acto 3 (Total: 20 nodos)
        const a3_l1 = createLayer('A3_L1', 3, 3, 6600, ['shop', 'explore', 'reward_currency']);
        const a3_l2 = createLayer('A3_L2', 7, 3, 7000, ['combat', 'trap']); 
        a3_l2.forEach(n => { if (n.type === 'combat') { n.effs[0].enemyName = rpgData.elite_name; n.effs[0].stats = {vida: 12, ataque: 4, defensa: 3, agilidad: 4, destreza: 4}; } });
        
        const a3_l3 = createLayer('A3_L3', 6, 3, 7400, ['shop', 'explore']);
        const a3_l4 = createLayer('A3_L4', 3, 3, 7800, ['explore', 'reward_currency']);
        const a3_boss = { id: getId('A3_BOSS'), type: 'combat', act: 3, summary: `El Clímax Absoluto. Te enfrentas a: ${rpgData.boss_name}.`, effs: [{type: 'module_combat', enemyName: rpgData.boss_name, stats: rpgData.boss_stats}], text: "", choices: [], x: 8200, y: 1500 };
        
        const l5_win = { id: getId('WIN'), type: 'ending', act: 3, summary: idealEnd, text: "", choices: [], scoreImpact: 100, x: 8600, y: 1300 };
        const l5_lose = { id: getId('LOSE'), type: 'ending', act: 3, summary: "Tu viaje termina en tragedia. Has muerto.", text: "", choices: [], scoreImpact: 0, x: 8600, y: 1700 };

        treeNodes.push(startNode, ...a1_l1, ...a1_l2, ...a1_l3, ...a1_l4, ...a1_l5, ...a1_l6, a1_boss, ...a2_l1, ...a2_l2, ...a2_l3, ...a2_l4, ...a2_l5, ...a2_l6, a2_lock, a2_penalty1, a2_penalty2, a2_penalty3, ...a3_l1, ...a3_l2, ...a3_l3, ...a3_l4, a3_boss, l5_win, l5_lose);

        // Ensamblar Conexiones Matemáticas
        connectForward([startNode], a1_l1, 3);
        connectForward(a1_l1, a1_l2, 3);
        connectForward(a1_l2, a1_l3, 3);
        connectForward(a1_l3, a1_l4, 3);
        connectForward(a1_l4, a1_l5, 3);
        connectForward(a1_l5, a1_l6, 3);
        connectForward(a1_l6, [a1_boss], 3);

        connectForward([a1_boss], a2_l1, 3);
        connectForward(a2_l1, a2_l2, 3);
        connectForward(a2_l2, a2_l3, 3);
        connectForward(a2_l3, a2_l4, 3);
        connectForward(a2_l4, a2_l5, 3);
        connectForward(a2_l5, a2_l6, 3);
        connectForward(a2_l6, [a2_lock], 3);

        a2_lock.choices.push({ targetId: a3_l1[0].id, cond: { type: 'item', op: 'HAS', val: rpgData.key_item } });
        if(a3_l1.length > 1) a2_lock.choices.push({ targetId: a3_l1[1].id, cond: { type: 'item', op: 'HAS', val: rpgData.key_item } });
        a2_lock.choices.push({ targetId: a2_penalty1.id, cond: { type: 'item', op: '!HAS', val: rpgData.key_item } });
        
        a2_penalty1.choices.push({ targetId: a2_penalty2.id });
        a2_penalty2.choices.push({ targetId: a2_penalty3.id });
        connectForward([a2_penalty3], a3_l1, 3);

        connectForward(a3_l1, a3_l2, 3);
        connectForward(a3_l2, a3_l3, 3);
        connectForward(a3_l3, a3_l4, 3);
        connectForward(a3_l4, [a3_boss], 3);

        treeNodes.forEach(n => {
            if (n.type === 'combat') {
                n.effs[0].loseTargetId = l5_lose.id;
                if (!n.effs[0].winTargetId && n.choices.length > 0) {
                    n.effs[0].winTargetId = n.choices[0].targetId; 
                }
            }
        });
        a3_boss.effs[0].winTargetId = l5_win.id;

        // ==========================================
        // FASE 3: ESQUELETO SEMÁNTICO DE LOS BOTONES
        // ==========================================
        UI.setLoading(true, "Fase 3: Contextualizando Enlaces...", 45, "Generando acciones de misterio", 45);
        
        const buildButtons = async (node) => {
            if (node.choices.length > 0 && node.type !== 'combat' && node.type !== 'lock') {
                const destSummary = node.choices.map(c => "- " + (treeNodes.find(n=>n.id===c.targetId)?.summary || 'Avanzar')).join("\n");
                try {
                    const skelData = await window.AIAdvancedCalls.generateButtonActions(destSummary, node.choices.length);
                    node.choices.forEach((c, idx) => {
                        c.text = skelData.acciones[idx] || "Explorar los alrededores";
                    });
                } catch(e) {
                    node.choices.forEach((c, idx) => c.text = `Investigar el camino ${idx + 1}`);
                }
            } else if (node.type === 'lock') {
                node.choices.forEach(c => {
                    c.text = c.cond && c.cond.op === 'HAS' ? `Usar la llave (${c.cond.val})` : "Intentar pasar por la fuerza";
                });
            }
        };

        await processInBatchesAdvanced(treeNodes, 25, buildButtons, (done, total) => {
            UI.setLoading(true, "Fase 3: Generando Textos Ciegos...", 45 + ((done/total)*10), `Nodo ${done}/${total}`, 45 + ((done/total)*10));
        });

        // ==========================================
        // FASE 4: REDACCIÓN LITERARIA DENSA EN BATCH
        // ==========================================
        UI.setLoading(true, "Fase 4: Inyectando Alma Literaria...", 60, "Redactando prosa masiva", 60);

        const writeLiterature = async (node) => {
            if (node.text) return;
            try {
                const text = await window.AIAdvancedCalls.writeNodeLiterature(node.summary, node.act, node.type, node.effs, rpgData);
                node.text = text.trim();
            } catch(e) {
                node.text = `[Fallo narrativo] ${node.summary}`;
            }
        };

        await processInBatchesAdvanced(treeNodes, 30, writeLiterature, (done, total) => {
            UI.setLoading(true, "Fase 4: Inyectando Alma Literaria...", 60 + ((done/total)*25), `Página ${done}/${total}`, 60 + ((done/total)*25));
        });

        // ==========================================
        // FASE 5: SIMULADOR DE BALANCEO (MONTE CARLO D6)
        // ==========================================
        UI.setLoading(true, "Fase 5: Balanceo de Dificultad IA...", 90, "Simulando 500 partidas tirando dados D6 virtuales...", 90);
        
        let wins = 0;
        const RUNS = 500;
        const INITIAL_HP = 25; 
        const HERO_ATK = 6;
        const HERO_DEF = 6;
        
        for (let i = 0; i < RUNS; i++) {
            let hp = INITIAL_HP;
            let currentId = 'start';
            let hasKey = false;
            
            let loopCount = 0;
            while (currentId !== l5_win.id && currentId !== l5_lose.id && loopCount < 50 && hp > 0) {
                loopCount++;
                let curr = treeNodes.find(n => n.id === currentId);
                if (!curr) break;

                if (curr.type === 'reward_key') hasKey = true;
                if (curr.type === 'trap') hp -= curr.effs[0].val;
                if (curr.type === 'shop') hp = Math.min(INITIAL_HP, hp + 10); 
                
                if (curr.type === 'combat') {
                    let eHp = curr.effs[0].stats.vida;
                    let eAtk = curr.effs[0].stats.ataque;
                    let eDef = curr.effs[0].stats.defensa;
                    
                    while(eHp > 0 && hp > 0) { 
                        let heroRoll = Math.floor(Math.random()*6)+1;
                        let hDmg = (heroRoll===6) ? ((heroRoll+HERO_ATK)-eDef)*2 : ((heroRoll+HERO_ATK)-eDef);
                        if(heroRoll !== 1) eHp -= Math.max(0, hDmg); 

                        if(eHp > 0) {
                            let eRoll = Math.floor(Math.random()*6)+1;
                            let eDmg = (eRoll===6) ? ((eRoll+eAtk)-HERO_DEF)*2 : ((eRoll+eAtk)-HERO_DEF);
                            if(eRoll !== 1) hp -= Math.max(0, eDmg); 
                        }
                    }
                    if (hp <= 0) currentId = curr.effs[0].loseTargetId;
                    else currentId = curr.effs[0].winTargetId;
                    continue;
                }

                let validChoices = curr.choices.filter(c => {
                    if (c.cond && c.cond.type === 'item') {
                        if (c.cond.op === 'HAS') return hasKey;
                        if (c.cond.op === '!HAS') return !hasKey;
                    }
                    return true;
                });
                
                if (validChoices.length === 0) break;
                currentId = validChoices[Math.floor(Math.random() * validChoices.length)].targetId;
            }
            if (currentId === l5_win.id) wins++;
        }

        let winRate = wins / RUNS;
        console.log(`[Playtest Automático] Win Rate original: ${(winRate*100).toFixed(1)}%`);
        
        if (winRate < 0.40) {
            const bStats = a3_boss.effs[0].stats;
            bStats.vida = Math.floor(bStats.vida * 0.7);
            if (bStats.ataque > 4) bStats.ataque -= 1;
            console.log(`[Playtest] Ajuste de dificultad a modo FÁCIL aplicado al Jefe Final. (Vida reajustada a ${bStats.vida})`);
        }

        // ==========================================
        // ENSAMBLAJE FINAL
        // ==========================================
        UI.setLoading(true, "Limpiando variables temporales...", 98, "Preparando el Canvas de 136 nodos", 98);
        treeNodes.forEach(n => { delete n.type; delete n.summary; delete n.act; });

        Core.book = Core.book || {};
        Core.book.title = bookTitle;
        Core.book.gameItems = [rpgData.key_item, rpgData.currency, "Poción de Curación"];
        Core.book.initialState = { vida: INITIAL_HP, vidaMax: INITIAL_HP, ataque: HERO_ATK, defensa: HERO_DEF, agilidad: 5, destreza: 5, inventario: [] };

        if (document.getElementById('book-title')) document.getElementById('book-title').value = Core.book.title;
        
        if (Core.bookData) { 
            Core.bookData.title = bookTitle; 
            Core.bookData.nodes = treeNodes; 
            Core.bookData.gameItems = Core.book.gameItems; 
            Core.bookData.initialState = Core.book.initialState; 
        } else { 
            Core.book.nodes = treeNodes; 
        }
        
        if (typeof UI !== 'undefined') {
            if (typeof UI.switchTab === 'function') UI.switchTab('canvas');
            if (typeof UI.switchView === 'function') UI.switchView('editor');
            if (typeof UI.renderSettingsItems === 'function') UI.renderSettingsItems();
        }
        if (typeof Core.scheduleSave === 'function') Core.scheduleSave();

        window.Canvas = window.Canvas || {};
        if (typeof window.Canvas.render === 'function') {
            window.Canvas.render();
        }

        alert(`¡Aventura RPG Mecánica Masiva generada y testeada con éxito!\n\n- Total Nodos Creados: ${treeNodes.length}\n- Moneda Base: ${rpgData.currency}\n- Objeto Obligatorio: ${rpgData.key_item}\n- Gran Jefe: ${rpgData.boss_name}\n- Tasa de Victoria en Pruebas (500 runs): ${(winRate*100).toFixed(1)}%`);

    } catch (error) {
        console.error(error);
        alert("Error crítico en el motor Avanzado (RPG). Revisa la consola.\n" + error.message);
    } finally {
        if (typeof UI !== 'undefined' && UI.setLoading) {
            UI.setLoading(false);
        }
    }
};

window.Canvas = window.Canvas || {};
if (typeof window.Canvas.render === 'function') {
    window.Canvas.render();
}