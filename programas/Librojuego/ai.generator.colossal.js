// Archivo: Librojuego/ai.generator.colossal.js

window.AIGenerator = window.AIGenerator || {};

// Función auxiliar para lotes asíncronos (Procesa de 30 en 30)
async function processInBatches(items, batchSize, asyncFn, onProgress) {
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
        // Latencia de seguridad entre ráfagas de 30
        await new Promise(r => setTimeout(r, 1500));
    }
    return results;
}

window.AIGenerator.generateColossal = async function() {
    if (!Core.targetHandle && typeof Core.targetHandle !== 'undefined') {
        return alert("Selecciona una carpeta primero para poder guardar la obra.");
    }
    
    const premise = document.getElementById('ai-premise')?.value || "";
    const startState = document.getElementById('ai-start')?.value || "";
    const idealEnd = document.getElementById('ai-ideal-end')?.value || "";
    const characters = document.getElementById('ai-characters')?.value || "";
    const waypoints = document.getElementById('ai-waypoints')?.value || "";
    const protagonist = document.getElementById('ai-protagonist')?.value || "Héroe";
    const style = document.getElementById('ai-style')?.value || "Aventura épica masiva";

    if (!premise || !startState || !idealEnd) {
        return alert("Es obligatorio rellenar al menos: Premisa, Inicio y Final Idóneo.");
    }

    try {
        // ==========================================
        // FASE 1: MACRO-ESTRUCTURA (LOS 5 ACTOS NEXUS)
        // ==========================================
        UI.setLoading(true, "Fase 1: Trazando los 5 Actos...", 5, "Definiendo Cuellos de Botella (Nexus)", 10);
        
        const macroPromptSystem = "Eres un Arquitecto Narrativo. Divide la historia en 5 grandes Actos ineludibles. Devuelve ESTRICTAMENTE JSON PURO.";
        const macroPromptUser = `
            Premisa: ${premise}
            Inicio: ${startState}
            Final: ${idealEnd}
            Hitos: ${waypoints}
            
            Define el contexto narrativo de los 5 grandes Actos (Cuellos de Botella).
            FORMATO JSON EXACTO:
            {
                "title": "Título Épico",
                "acts": [
                    { "act": 1, "context": "Contexto del inicio y la salida de la zona inicial..." },
                    { "act": 2, "context": "Contexto del segundo gran cuello de botella..." },
                    { "act": 3, "context": "Contexto del ecuador de la historia..." },
                    { "act": 4, "context": "Contexto del clímax y preludio al final..." },
                    { "act": 5, "context": "Contexto de las ramificaciones finales y el desenlace absoluto..." }
                ]
            }
        `;

        const macroData = await window.Koreh.Text.generateWithRetry(macroPromptSystem, macroPromptUser, {
            model: 'gemini-fast', jsonMode: true, temperature: 0.7
        }, (d) => d && d.acts && d.acts.length === 5);

        const bookTitle = macroData.title;

        // ==========================================
        // FASE 2: MATRIZ MATEMÁTICA (TOPOLOGÍA DIAMANTE)
        // ==========================================
        UI.setLoading(true, "Fase 2: Esculpiendo Topología...", 15, "Generando ~2000 nodos fractales puros", 20);

        let treeNodes = [];
        const actWidths = [4, 15, 40, 80, 120, 80, 40, 15, 4]; // ~400 nodos por acto
        
        let nexusNodes = [];
        for (let i = 0; i <= 5; i++) {
            nexusNodes.push({
                id: i === 0 ? "start" : `nexus_${i}`,
                type: 'nexus',
                act: i === 0 ? 1 : i,
                summary: i === 0 ? startState : macroData.acts[(i-1) === 4 ? 4 : i-1].context,
                text: "", choices: [], scoreImpact: 0,
                x: i * 3000, y: 1000
            });
        }
        treeNodes.push(nexusNodes[0]);

        // Generar 4 Actos Convergentes (Diamantes)
        for (let act = 1; act <= 4; act++) {
            let startNexus = nexusNodes[act - 1];
            let endNexus = nexusNodes[act];
            
            let levels = [[startNexus]];
            let xOffset = startNexus.x;

            for (let w of actWidths) {
                xOffset += 300;
                let layer = [];
                for (let i = 0; i < w; i++) {
                    let tNode = {
                        id: `A${act}_L${levels.length}_N${i}_${Math.random().toString(36).substr(2,4)}`,
                        type: 'transit', act: act, summary: "", text: "", choices: [], scoreImpact: 0,
                        x: xOffset, y: 1000 - ((w * 60) / 2) + (i * 60)
                    };
                    treeNodes.push(tNode);
                    layer.push(tNode);
                }
                levels.push(layer);
            }
            levels.push([endNexus]);
            if (act < 4) treeNodes.push(endNexus);

            // Conectar capas: L -> L+1
            for (let l = 0; l < levels.length - 1; l++) {
                let currentLayer = levels[l];
                let nextLayer = levels[l + 1];
                
                // Asegurar que todo nodo en nextLayer tiene al menos 1 padre
                nextLayer.forEach(target => {
                    let parent = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                    parent.choices.push({ targetId: target.id });
                });

                // Completar hasta 2 o 3 opciones por nodo en currentLayer
                currentLayer.forEach(node => {
                    let numChoices = Math.floor(Math.random() * 2) + 1; // 1 a 2 extra (total max 3)
                    while (node.choices.length < numChoices) {
                        let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                        if (!node.choices.find(c => c.targetId === target.id)) {
                            node.choices.push({ targetId: target.id });
                        } else {
                            break; // Evita bucle si hay pocos nodos en la siguiente capa
                        }
                    }
                });
            }
        }

        // Generar Acto 5 Divergente (Explosión a Finales)
        let act5Nexus = nexusNodes[4];
        treeNodes.push(act5Nexus);
        let a5Levels = [[act5Nexus]];
        let xOff5 = act5Nexus.x;
        const act5Widths = [4, 15, 40, 80, 120]; // No converge
        
        for (let w of act5Widths) {
            xOff5 += 300;
            let layer = [];
            for (let i = 0; i < w; i++) {
                let tNode = {
                    id: `A5_L${a5Levels.length}_N${i}_${Math.random().toString(36).substr(2,4)}`,
                    type: 'transit', act: 5, summary: "", text: "", choices: [], scoreImpact: 0,
                    x: xOff5, y: 1000 - ((w * 60) / 2) + (i * 60)
                };
                treeNodes.push(tNode);
                layer.push(tNode);
            }
            a5Levels.push(layer);
        }

        // Capa Final (120 Finales Menores y Mayores)
        let endingLayer = [];
        xOff5 += 300;
        for (let i = 0; i < 120; i++) {
            let isMajor = Math.random() > 0.8;
            let finalScore = isMajor ? (Math.random() > 0.5 ? 100 : 0) : Math.floor(Math.random() * 80) + 10;
            let eNode = {
                id: `FINAL_${i}_${Math.random().toString(36).substr(2,4)}`,
                type: isMajor ? 'ending_major' : 'ending_minor',
                act: 5, summary: isMajor ? "Desenlance total absoluto." : "Final prematuro o de sacrificio.", 
                text: "", choices: [], scoreImpact: finalScore,
                x: xOff5, y: 1000 - ((120 * 60) / 2) + (i * 60)
            };
            treeNodes.push(eNode);
            endingLayer.push(eNode);
        }
        a5Levels.push(endingLayer);

        // Conectar capas Acto 5
        for (let l = 0; l < a5Levels.length - 1; l++) {
            let currentLayer = a5Levels[l];
            let nextLayer = a5Levels[l + 1];
            nextLayer.forEach(target => {
                let parent = currentLayer[Math.floor(Math.random() * currentLayer.length)];
                parent.choices.push({ targetId: target.id });
            });
            currentLayer.forEach(node => {
                let numChoices = Math.floor(Math.random() * 2) + 1;
                while (node.choices.length < numChoices) {
                    let target = nextLayer[Math.floor(Math.random() * nextLayer.length)];
                    if (!node.choices.find(c => c.targetId === target.id)) node.choices.push({ targetId: target.id }); else break;
                }
            });
        }

        const totalNodes = treeNodes.length;

        // ==========================================
        // FASE 3: ESQUELETO NARRATIVO (LOTES DE 30)
        // ==========================================
        const nodesConSalida = treeNodes.filter(n => n.choices.length > 0);
        
        const buildSkeleton = async (node) => {
            const actInfo = macroData.acts[node.act - 1].context;
            const routeCount = node.choices.length;
            
            const sysPrompt = "Eres un Motor Lógico. Genera exactamente el número de consecuencias pedidas. Devuelve ESTRICTAMENTE JSON PURO.";
            const usrPrompt = `
                Acto ${node.act}: ${actInfo}
                Contexto actual del nodo: "${node.summary || "Avanzando en la trama..."}"
                
                CRÍTICO: Debes generar EXACTAMENTE ${routeCount} rutas lógicas.
                FORMATO:
                {
                    "rutas": [
                        { "accion": "Hacer esto", "consecuencia": "Pasa esto otro (1 frase)" }
                    ]
                }
            `;
            
            try {
                const data = await window.Koreh.Text.generateWithRetry(sysPrompt, usrPrompt, {
                    model: 'nova-fast', jsonMode: true, temperature: 0.6
                }, (d) => d && Array.isArray(d.rutas) && d.rutas.length >= 1);
                
                // Mapear rutas generadas a los targetIds forzados de la topología
                for (let i = 0; i < routeCount; i++) {
                    const r = data.rutas[i] || data.rutas[0];
                    node.choices[i].text = r.accion;
                    
                    const targetNode = treeNodes.find(tn => tn.id === node.choices[i].targetId);
                    if (targetNode && !targetNode.summary) {
                        targetNode.summary = r.consecuencia;
                    }
                }
            } catch (e) {
                for (let i = 0; i < routeCount; i++) {
                    node.choices[i].text = `Opción de emergencia ${i+1}`;
                    const targetNode = treeNodes.find(tn => tn.id === node.choices[i].targetId);
                    if (targetNode && !targetNode.summary) targetNode.summary = "Avanzando a ciegas...";
                }
            }
        };

        await processInBatches(nodesConSalida, 60, buildSkeleton, (done, total) => {
            let pct = 20 + ((done / total) * 60);
            UI.setLoading(true, `Fase 3: Tejiendo Esqueleto...`, pct, `Nodos mapeados: ${done}/${total}`, pct);
        });

        // ==========================================
        // FASE 4: REDACCIÓN LITERARIA (LOTES DE 30)
        // ==========================================
        const writeLiterature = async (node) => {
            const actInfo = macroData.acts[node.act - 1]?.context || "";
            let styleInstruction = node.type === 'transit' 
                ? "ESTILO TRANSICIÓN: Escribe SOLO 1 o 2 frases rápidas, directas y reactivas." 
                : "ESTILO NEXUS: Escribe de 2 a 3 párrafos épicos, detallados e inmersivos.";
                
            if (node.type.includes('ending')) {
                styleInstruction = `ESTILO FINAL: Redacta el cierre definitivo. Impacto de puntuación: ${node.scoreImpact}/100. Ajusta la gloria o la miseria a este número. (3 párrafos).`;
            }

            const sysPrompt = "Eres un novelista. Escribes en segunda persona. RESPONDE ÚNICAMENTE CON LITERATURA PLANA, SIN JSON NI TITULOS.";
            const usrPrompt = `
                Estilo Global: ${style}
                Contexto del Acto: ${actInfo}
                
                Narra lo siguiente: "${node.summary || "El protagonista continúa su viaje."}"
                
                ${styleInstruction}
                Opciones que elegirá el jugador luego (dales sentido lógico): ${JSON.stringify(node.choices.map(c => c.text))}
            `;

            try {
                const text = await window.Koreh.Text.generateWithRetry(sysPrompt, usrPrompt, {
                    model: 'nova-fast', jsonMode: false, temperature: 0.75
                }, (d) => typeof d === 'string' && d.length > 10);
                node.text = text.trim();
            } catch (e) {
                node.text = `[Fallo de la IA al narrar] ${node.summary}`;
            }
        };

        await processInBatches(treeNodes, 60, writeLiterature, (done, total) => {
            let pct = 50 + ((done / total) * 45);
            UI.setLoading(true, `Fase 4: Inyectando Alma Literaria...`, pct, `Textos generados: ${done}/${total}`, pct);
        });

        // ==========================================
        // FASE 5: RESOLUCIÓN Y ENSAMBLAJE
        // ==========================================
        UI.setLoading(true, "Fase 5: Compilando Matriz Colosal...", 98, "Limpiando y guardando...", 100);

        treeNodes.forEach(n => { delete n.act; delete n.type; delete n.summary; });

        Core.book = Core.book || {};
        Core.book.title = bookTitle;
        if (document.getElementById('book-title')) document.getElementById('book-title').value = Core.book.title;
        
        if (Core.bookData) { Core.bookData.title = bookTitle; Core.bookData.nodes = treeNodes; } 
        else { Core.book.nodes = treeNodes; }
        
        if (typeof Canvas !== 'undefined' && Canvas.render) {
            Canvas.render();
            // Desactivamos el auto-reorder masivo para no congelar el navegador con 2000 nodos
            // Canvas.reorderNodes() se podrá pulsar manualmente si el usuario lo desea
        }
        
        if (typeof UI !== 'undefined') {
            if (typeof UI.switchTab === 'function') UI.switchTab('canvas');
            if (typeof UI.switchView === 'function') UI.switchView('editor');
        }
        if (typeof Core.scheduleSave === 'function') Core.scheduleSave();

    } catch (e) {
        console.error(e);
        alert("Caos Crítico en el motor Colosal. Revisa la consola.\n" + e.message);
    } finally {
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
    }
};