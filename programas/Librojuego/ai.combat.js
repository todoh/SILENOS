// Archivo: Librojuego/ai.combat.js

window.AICombat = {
    async generateCombatStructure(nodeId) {
        const parent = Core.getNode(nodeId);
        if (!parent) return;

        const parentContext = parent.text || "Un enemigo bloquea el paso.";

        try {
            // ==========================================
            // FASE 1: ANÁLISIS DE CONTEXTO
            // ==========================================
            UI.setLoading(true, "Fase 1/4: Analizando Contexto...", 10, "Estudiando la historia previa", 10);
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            // ==========================================
            // FASE 2: TOPOLOGÍA Y PENALIZACIONES
            // ==========================================
            UI.setLoading(true, "Fase 2/4: Preparando Topología...", 20, "Definiendo daños y estructura", 20);
            
            const startX = parent.x + 350;
            const startY = parent.y;

            const getSevere = () => Math.floor(Math.random() * 3) + 2; // 2 a 4
            const getBot = () => Math.floor(Math.random() * 4) + 1; // 1 a 4

            // Definición de los 16 nodos de la matriz de combate
            const topo = {
                'A': { desc: "Inicio del combate", pen: 0, x: startX, y: startY },
                'B0': { desc: "Ronda 1: Éxito total sin recibir daño", pen: 0, x: startX + 350, y: startY - 300, parent: 'A' },
                'B1': { desc: "Ronda 1: Ataque exitoso pero con un roce", pen: 1, x: startX + 350, y: startY, parent: 'A' },
                'B2': { desc: "Ronda 1: Fallo crítico, el enemigo te alcanza", pen: getSevere(), x: startX + 350, y: startY + 300, parent: 'A' },
                'C0': { desc: "Ronda 2 (Desde éxito): Éxito total", pen: 0, x: startX + 700, y: startY - 600, parent: 'B0' },
                'C1': { desc: "Ronda 2 (Desde éxito): Roce leve", pen: 1, x: startX + 700, y: startY - 450, parent: 'B0' },
                'C2': { desc: "Ronda 2 (Desde éxito): Golpe severo", pen: getSevere(), x: startX + 700, y: startY - 300, parent: 'B0' },
                'C3': { desc: "Ronda 2 (Desde roce): Éxito total", pen: 0, x: startX + 700, y: startY - 150, parent: 'B1' },
                'C4': { desc: "Ronda 2 (Desde roce): Roce leve", pen: 1, x: startX + 700, y: startY, parent: 'B1' },
                'C5': { desc: "Ronda 2 (Desde roce): Golpe severo", pen: getSevere(), x: startX + 700, y: startY + 150, parent: 'B1' },
                'C6': { desc: "Ronda 2 (Desde crítico): Éxito total", pen: 0, x: startX + 700, y: startY + 300, parent: 'B2' },
                'C7': { desc: "Ronda 2 (Desde crítico): Roce leve", pen: 1, x: startX + 700, y: startY + 450, parent: 'B2' },
                'C8': { desc: "Ronda 2 (Desde crítico): Golpe severo", pen: getSevere(), x: startX + 700, y: startY + 600, parent: 'B2' },
                'D0': { desc: "Cuello de botella: Apertura perfecta para el golpe de gracia", pen: 0, x: startX + 1050, y: startY - 150, multiParent: true },
                'D1': { desc: "Cuello de botella: El enemigo te acorrala y te hiere antes del final", pen: getBot(), x: startX + 1050, y: startY + 150, multiParent: true },
                'E':  { desc: "El combate termina con tu victoria. El enemigo cae.", pen: 0, x: startX + 1400, y: startY, multiParent: true }
            };

            // ==========================================
            // FASE 3: ARMAZÓN LÓGICO (GEMINI-FAST)
            // ==========================================
            UI.setLoading(true, "Fase 3/4: Armazón Lógico...", 35, "gemini-fast mapeando 16 nodos", 35);

            const sysPromptSkel = "Eres un Diseñador Táctico de librojuegos. Diseña las acciones (textos de los botones) y los resúmenes narrativos para una matriz de combate. OBLIGATORIO: Las acciones deben ser tácticas neutrales y ciegas respecto a su resultado. Devuelve ESTRICTAMENTE JSON PURO.";
            const userPromptSkel = `
                SITUACIÓN PREVIA: "${parentContext}"
                ESTADO JUGADOR: ${analysisReport.estado_logica}
                INVENTARIO/ARMA PREVISTA: ${analysisReport.inventario_implicito}

                Debes definir el "armazón lógico" para los 16 nodos de este combate. 
                Para cada clave (A, B0... E), proporciona:
                - "accion_previa": Representa el texto del botón que el jugador pulsará para llegar a este nodo.
                - "resumen": Una frase de 1 línea indicando qué ocurre en ese nodo, respetando la descripción teórica obligatoria.

                INSTRUCCIÓN CRÍTICA DE DISEÑO PARA 'accion_previa':
                Debe ser una decisión táctica NEUTRAL y EQUILIBRADA (ej: "Lanzar una estocada al pecho", "Esquivar hacia la izquierda", "Protegerse con el escudo", "Aprovechar el entorno"). 
                ESTÁ TERMINANTEMENTE PROHIBIDO usar palabras que anticipen el resultado (como "Atacar con éxito", "Tropezar", "Fallar", "Golpe letal", "Roce"). 
                Todas las opciones deben parecer igual de válidas y buenas para el jugador. El fracaso o éxito solo se revela después, en el 'resumen'.

                DESCRIPCIONES TEÓRICAS OBLIGATORIAS POR NODO (Para el resumen):
                ${Object.entries(topo).map(([k, v]) => `- ${k}: ${v.desc} (Penalización de vida: -${v.pen})`).join('\n')}

                FORMATO JSON EXACTO:
                {
                    "nodos": {
                        "A": { "accion_previa": "Desenvainar y prepararse", "resumen": "..." },
                        "B0": { "accion_previa": "...", "resumen": "..." },
                        ...
                        "E": { "accion_previa": "...", "resumen": "..." }
                    }
                }
            `;

            const skeletonData = await window.Koreh.Text.generateWithRetry(sysPromptSkel, userPromptSkel, {
                model: 'gemini-fast', jsonMode: true, temperature: 0.6
            }, (d) => d && d.nodos && d.nodos.A && d.nodos.E);

            const skel = skeletonData.nodos;

            // Inyección de nodos físicos en el Core basados en el esqueleto
            const nodeIds = {};
            for (const key in topo) {
                const nodeData = topo[key];
                const skelNode = skel[key] || { accion_previa: "Continuar", resumen: nodeData.desc };
                
                const nId = `nodo_${Math.random().toString(36).substr(2, 5)}`;
                nodeIds[key] = nId;
                
                const newNode = {
                    id: nId, text: "", choices: [],
                    x: nodeData.x, y: nodeData.y, scoreImpact: 0,
                    _combatResumen: skelNode.resumen // Dato temporal
                };

                if (nodeData.pen > 0) {
                    newNode.eff = { type: 'vida', op: '-', val: nodeData.pen.toString() };
                }
                Core.book.nodes.push(newNode);
            }

            // Conexiones topológicas
            if (!parent.choices) parent.choices = [];
            parent.choices.push({ text: skel.A?.accion_previa || "Iniciar combate", targetId: nodeIds['A'] });

            const link = (fromKey, toKeys) => {
                const n = Core.getNode(nodeIds[fromKey]);
                toKeys.forEach(tKey => {
                    n.choices.push({ text: skel[tKey]?.accion_previa || "Acción táctica", targetId: nodeIds[tKey] });
                });
            };

            link('A', ['B0', 'B1', 'B2']);
            link('B0', ['C0', 'C1', 'C2']);
            link('B1', ['C3', 'C4', 'C5']);
            link('B2', ['C6', 'C7', 'C8']);
            
            // Los 9 nodos C van a D0 y D1
            ['C0','C1','C2','C3','C4','C5','C6','C7','C8'].forEach(cKey => {
                link(cKey, ['D0', 'D1']);
            });

            link('D0', ['E']);
            link('D1', ['E']);

            // ==========================================
            // FASE 4: CASCADA LITERARIA (NOVA-FAST)
            // ==========================================
            let nodesWritten = 0;
            const writeLiterature = async (key, contextText) => {
                const n = Core.getNode(nodeIds[key]);
                if (!n) return;

                let pct = 40 + ((nodesWritten / 16) * 55);
                UI.setLoading(true, `Fase 4/4: Narrativa de Combate...`, pct, `nova-fast redactando nodo ${key} (16 totales)`, pct);

                const sysPromptLit = "Eres un escritor experto en literatura de combate para librojuegos. Escribes en segunda persona. Describe la acción de forma épica, visceral e inmersiva. RESPONDE ÚNICAMENTE CON LITERATURA PLANA (1-2 párrafos, sin JSON ni introducciones).";
                
                const userPromptLit = `
                    CONTEXTO INMEDIATO (Lo que acaba de pasar):
                    "${contextText}"

                    LO QUE DEBES NARRAR AHORA:
                    "${n._combatResumen}"

                    Escribe la prosa de este instante del combate con gran intensidad.
                `;

                try {
                    const text = await window.Koreh.Text.generateWithRetry(sysPromptLit, userPromptLit, {
                        model: 'nova-fast', jsonMode: false, temperature: 0.7
                    }, (d) => d && d.length > 10);
                    n.text = text.trim();
                } catch(e) {
                    n.text = `[Fallo literario] ${n._combatResumen}`;
                }
                delete n._combatResumen; // Limpiar variable temporal
                nodesWritten++;
                return n.text;
            };

            // Nivel 1
            const txtA = await writeLiterature('A', parentContext);

            // Nivel 2
            const txtBs = await Promise.all([
                writeLiterature('B0', txtA + `\n>> El jugador intentó: ${skel.B0?.accion_previa} <<`),
                writeLiterature('B1', txtA + `\n>> El jugador intentó: ${skel.B1?.accion_previa} <<`),
                writeLiterature('B2', txtA + `\n>> El jugador intentó: ${skel.B2?.accion_previa} <<`)
            ]);

            // Nivel 3
            const txtCs = await Promise.all([
                writeLiterature('C0', txtBs[0] + `\n>> El jugador intentó: ${skel.C0?.accion_previa} <<`),
                writeLiterature('C1', txtBs[0] + `\n>> El jugador intentó: ${skel.C1?.accion_previa} <<`),
                writeLiterature('C2', txtBs[0] + `\n>> El jugador intentó: ${skel.C2?.accion_previa} <<`),
                writeLiterature('C3', txtBs[1] + `\n>> El jugador intentó: ${skel.C3?.accion_previa} <<`),
                writeLiterature('C4', txtBs[1] + `\n>> El jugador intentó: ${skel.C4?.accion_previa} <<`),
                writeLiterature('C5', txtBs[1] + `\n>> El jugador intentó: ${skel.C5?.accion_previa} <<`),
                writeLiterature('C6', txtBs[2] + `\n>> El jugador intentó: ${skel.C6?.accion_previa} <<`),
                writeLiterature('C7', txtBs[2] + `\n>> El jugador intentó: ${skel.C7?.accion_previa} <<`),
                writeLiterature('C8', txtBs[2] + `\n>> El jugador intentó: ${skel.C8?.accion_previa} <<`)
            ]);

            // Nivel 4 (Cuello de botella)
            const dContext = "Tras una agotadora segunda ronda, el combate alcanza su punto crítico. Se abre la última oportunidad de definir el duelo.";
            const txtDs = await Promise.all([
                writeLiterature('D0', dContext + `\n>> El jugador intentó: ${skel.D0?.accion_previa} <<`),
                writeLiterature('D1', dContext + `\n>> El jugador intentó: ${skel.D1?.accion_previa} <<`)
            ]);

            // Nivel 5 (Desenlace)
            const eContext = "El clímax del enfrentamiento acaba de ocurrir. Es el momento del golpe de gracia y el fin de la batalla.";
            await writeLiterature('E', eContext + `\n>> El jugador intentó: ${skel.E?.accion_previa} <<`);

            // ==========================================
            // FINALIZACIÓN
            // ==========================================
            UI.setLoading(true, "Finalizando...", 100, "Conectando nodos al lienzo", 100);

            if (typeof Canvas !== 'undefined' && Canvas.render) Canvas.render();
            if (Core.scheduleSave) Core.scheduleSave();
            
        } catch (error) {
            console.error("Error al generar combate IA:", error);
            alert("Error al generar combate en red: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        }
    }
};