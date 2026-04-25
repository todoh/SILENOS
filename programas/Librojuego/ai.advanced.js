// Archivo: Librojuego/ai.advanced.js

window.AIAdvanced = {
    generatingNodes: new Set(),
    extractingNodes: new Set(), 
    
    // ----------------------------------------------------
    // PUNTO 2: SUB-TRAMA FRACTAL (EN 2º PLANO)
    // ----------------------------------------------------
    async generateFractal(nodeId) {
        if (this.generatingNodes.has(nodeId)) return;

        const parent = Core.getNode(nodeId);
        if (!parent || !parent.text) return alert("El nodo necesita texto base para generar una subtrama.");

        this.generatingNodes.add(nodeId);
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();

        try {
            const analysisReport = await window.AISupport.analyzeContext(nodeId);
            const taskInstructions = "Diseñar una subtrama fractal: 2 caminos divergentes derivados del nodo actual que, hagan lo que hagan, convergen ineludiblemente en un mismo punto o sala final.";
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, parent.text, taskInstructions);

            const sysPrompt = "Eres un Arquitecto de Librojuegos. Genera una aventura fractal basada fielmente en los informes previos. Devuelve ESTRICTAMENTE JSON PURO.";
            const geoContext = window.AISupport && typeof window.AISupport.getGeographicContext === 'function' ? window.AISupport.getGeographicContext(nodeId) : ""; 

            const userPrompt = `
                INFORME DE DISEÑO PREVIO:
                Enfoques sugeridos: ${JSON.stringify(optionsReport.enfoques_propuestos)}
                
                SITUACIÓN ACTUAL: "${parent.text}"
                ${geoContext}
                
                Crea las 2 rutas alternativas y el punto de convergencia siguiendo los enfoques.
                
                FORMATO JSON ESPERADO:
                {
                    "ruta_A": { "accion_boton": "Acción 1", "texto_nodo": "Texto de la rama 1..." },
                    "ruta_B": { "accion_boton": "Acción 2", "texto_nodo": "Texto de la rama 2..." },
                    "convergencia": { "accion_boton": "Avanzar", "texto_nodo": "Texto de la sala final convergente..." }
                }
            `;

            const data = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'nova-fast', jsonMode: true, temperature: 0.7
            }, (d) => d && d.ruta_A && d.ruta_B && d.convergencia);

            const idA = `nodo_${Math.random().toString(36).substr(2, 5)}`;
            const idB = `nodo_${Math.random().toString(36).substr(2, 5)}`;
            const idConv = `nodo_${Math.random().toString(36).substr(2, 5)}`;

            Core.book.nodes.push({ id: idA, text: data.ruta_A.texto_nodo, choices: [], x: parent.x + 350, y: parent.y - 150, scoreImpact: 0 });
            Core.book.nodes.push({ id: idB, text: data.ruta_B.texto_nodo, choices: [], x: parent.x + 350, y: parent.y + 150, scoreImpact: 0 });
            Core.book.nodes.push({ id: idConv, text: data.convergencia.texto_nodo, choices: [], x: parent.x + 700, y: parent.y, scoreImpact: 0 });

            if (!parent.choices) parent.choices = [];
            parent.choices.push({ text: data.ruta_A.accion_boton, targetId: idA });
            parent.choices.push({ text: data.ruta_B.accion_boton, targetId: idB });

            Core.getNode(idA).choices.push({ text: data.convergencia.accion_boton, targetId: idConv });
            Core.getNode(idB).choices.push({ text: data.convergencia.accion_boton, targetId: idConv });

            if (Core.scheduleSave) Core.scheduleSave();
        } catch (e) {
            alert("Error del Oráculo Fractal: " + e.message);
        } finally {
            this.generatingNodes.delete(nodeId);
            if (typeof Canvas !== 'undefined') Canvas.render();
        }
    },

    // ----------------------------------------------------
    // PUNTO 3: PUZLES MORTALES (EN 2º PLANO)
    // ----------------------------------------------------
    async generatePuzzle(nodeId) {
        if (this.generatingNodes.has(nodeId)) return;

        const node = Core.getNode(nodeId);
        if (!node) return;

        this.generatingNodes.add(nodeId);
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();

        try {
            const analysisReport = await window.AISupport.analyzeContext(nodeId);
            const taskInstructions = "Diseñar un acertijo, trampa mortal o enigma mecánico coherente con el inventario y estado del jugador. Debe tener 1 opción correcta para avanzar y 2 opciones de trampa letales o dañinas.";
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, node.text || "Una sala vacía", taskInstructions);

            const sysPrompt = "Eres un Game Designer experto. Convierte la situación en una trampa mortal basada en el diseño previo. Devuelve ESTRICTAMENTE JSON PURO.";
            const geoContext = window.AISupport && typeof window.AISupport.getGeographicContext === 'function' ? window.AISupport.getGeographicContext(nodeId) : ""; 

            const userPrompt = `
                INFORME DE DISEÑO PREVIO:
                Enfoques de Trampa: ${JSON.stringify(optionsReport.enfoques_propuestos)}
                
                SITUACIÓN ACTUAL: "${node.text || 'Una sala vacía'}"
                ${geoContext}
                
                Modifica el texto para introducir la trampa, 1 salida correcta y 2 castigos severos.
                
                FORMATO JSON ESPERADO:
                {
                    "nuevo_texto_nodo": "La narrativa rediseñada planteando la trampa/enigma...",
                    "opcion_correcta": { "texto_boton": "Acción correcta", "consecuencia": "Texto de éxito..." },
                    "opcion_falsa_1": { "texto_boton": "Acción trampa 1", "consecuencia": "Recibes daño..." },
                    "opcion_falsa_2": { "texto_boton": "Acción trampa 2", "consecuencia": "Castigo fatal..." }
                }
            `;

            const data = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'nova-fast', jsonMode: true, temperature: 0.7
            }, (d) => d && d.nuevo_texto_nodo && d.opcion_correcta);

            node.text = data.nuevo_texto_nodo;
            node.choices = []; 

            const idCorrect = `nodo_${Math.random().toString(36).substr(2, 5)}`;
            const idFalse1 = `nodo_${Math.random().toString(36).substr(2, 5)}`;
            const idFalse2 = `nodo_${Math.random().toString(36).substr(2, 5)}`;

            Core.book.nodes.push({ id: idCorrect, text: data.opcion_correcta.consecuencia, choices: [], x: node.x + 350, y: node.y - 150, scoreImpact: 10 });
            Core.book.nodes.push({ id: idFalse1, text: data.opcion_falsa_1.consecuencia, choices: [], x: node.x + 350, y: node.y, scoreImpact: -5, eff: {type: 'vida', op: '-', val: '3'} });
            Core.book.nodes.push({ id: idFalse2, text: data.opcion_falsa_2.consecuencia, choices: [], x: node.x + 350, y: node.y + 150, scoreImpact: -5, eff: {type: 'vida', op: '-', val: '3'} });

            node.choices.push({ text: data.opcion_correcta.texto_boton, targetId: idCorrect });
            node.choices.push({ text: data.opcion_falsa_1.texto_boton, targetId: idFalse1 });
            node.choices.push({ text: data.opcion_falsa_2.texto_boton, targetId: idFalse2 });

            if (Core.scheduleSave) Core.scheduleSave();
        } catch (e) {
            alert("Error al crear Puzzle: " + e.message);
        } finally {
            this.generatingNodes.delete(nodeId);
            if (typeof Canvas !== 'undefined') Canvas.render();
        }
    },

    // ----------------------------------------------------
    // PUNTO 4: CAMBIO DE PERSPECTIVA
    // ----------------------------------------------------
    async changePerspective(nodeId, perspective) {
        const node = Core.getNode(nodeId);
        if (!node || !node.text) return;

        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        UI.setLoading(true, "Analizando Historial...", 20, "Capturando tono original", 20);

        try {
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            UI.setLoading(true, "Procesando Guía de Estilo...", 50, "Traduciendo gramática", 50);
            const taskInstructions = `Proponer directrices estilísticas estrictas para reescribir ESTE TEXTO EXACTO a ${perspective} persona, manteniendo absolutamente la coherencia con el tono y el estado mental del jugador.`;
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, node.text, taskInstructions);

            UI.setLoading(true, `Aplicando ${perspective} Persona...`, 80, "Modificando prosa final", 80);
            const sysPrompt = `Eres un editor literario de élite. Reescribe el texto proporcionado ESTRICTAMENTE en ${perspective} persona. Mantén el mismo tono y detalles guiándote por el informe. RESPONDE SOLO CON EL TEXTO LITERARIO, NADA MÁS.`;
            const userPrompt = `
                GUÍA ESTILÍSTICA OBTENIDA:
                ${JSON.stringify(optionsReport.enfoques_propuestos)}
                
                TEXTO A REESCRIBIR:
                "${node.text}"
            `;
            
            const rewritten = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'nova-fast', jsonMode: false, temperature: 0.3
            }, (d) => d && d.length > 10);

            node.text = rewritten.trim();
            if (Core.selectedNodeId === nodeId && typeof Editor !== 'undefined') Editor.loadNode(nodeId);
            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            if (Core.scheduleSave) Core.scheduleSave();
        } catch (e) {
            alert("Error al cambiar perspectiva: " + e.message);
        } finally {
            UI.setLoading(false);
        }
    },

    // 🔮 5. Radar de Tensión Dramática
    async analyzeTension(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node || !node.text) return;

        UI.setLoading(true, "Analizando Tensión...", 50, "Midiendo pulso narrativo", 50);
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();

        try {
            const sysPrompt = "Analiza la tensión dramática, urgencia y peligro de este texto. Devuelve ESTRICTAMENTE JSON PURO.";
            const userPrompt = `
                TEXTO: "${node.text}"
                
                FORMATO JSON:
                {
                    "tension_score": 8, // (De 0 a 10)
                    "emocion_predominante": "Miedo / Calma / Épica...",
                    "consejo_editor": "Breve consejo sobre cómo mejorar o mantener el impacto de esta escena."
                }
            `;

            const data = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'gemini-fast', jsonMode: true, temperature: 0.4
            }, (d) => d && typeof d.tension_score !== 'undefined');

            alert(`📊 RADAR DE TENSIÓN (Nivel ${data.tension_score}/10)\n\n🎭 Emoción: ${data.emocion_predominante}\n\n✍️ Consejo IA: ${data.consejo_editor}`);
        } catch (e) {
            alert("Fallo al analizar tensión: " + e.message);
        } finally {
            UI.setLoading(false);
        }
    },

    // 🔮 6. Extracción de Lore Visual a la Biblia (A SEGUNDO PLANO)
    async extractLore(nodeId) {
        if (this.extractingNodes.has(nodeId)) return;
        const node = Core.getNode(nodeId);
        if (!node || !node.text) return;

        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        
        // Bloqueamos el nodo y renderizamos para pintar el indicador visual de lore
        this.extractingNodes.add(nodeId);
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();

        try {
            let bible = Core.bookData?.visualBible || Core.book?.visualBible;
            if (typeof bible !== 'object') {
                bible = { style: typeof bible === 'string' ? bible : "", characters: "", places: "", flora_fauna: "", objects_tech: "", clothing: "", magic_fx: "" };
            }

            const currentLoreContext = JSON.stringify({
                characters: bible.characters,
                places: bible.places,
                flora_fauna: bible.flora_fauna,
                objects_tech: bible.objects_tech,
                clothing: bible.clothing,
                magic_fx: bible.magic_fx
            });

            const sysPromptExtract = "Eres un extractor de entidades de worldbuilding. Lee el texto y localiza personajes, lugares, criaturas u objetos clave. Separa los que ya existan en el LORE ACTUAL de los que sean totalmente NUEVOS. Devuelve ESTRICTAMENTE JSON PURO.";
            const userPromptExtract = `
                LORE ACTUAL EN LA BIBLIA VISUAL:
                ${currentLoreContext}
                
                TEXTO A ANALIZAR:
                "${node.text}"
                
                INSTRUCCIONES: 
                1. "nuevos_elementos": Identifica elementos NUEVOS que NO ESTÉN en el lore actual (categorías: characters, places, flora_fauna, objects_tech, clothing, magic_fx).
                2. "elementos_presentes": Lista los NOMBRES EXACTOS de TODAS las entidades relevantes que aparecen en este texto (tanto las nuevas como las que ya existen en el lore).

                FORMATO JSON ESPERADO:
                {
                    "nuevos_elementos": [
                        { "nombre": "Nombre del Elemento", "categoria": "characters" }
                    ],
                    "elementos_presentes": ["Nombre1", "Nombre2"]
                }
            `;

            const extractData = await window.Koreh.Text.generateWithRetry(sysPromptExtract, userPromptExtract, {
                model: 'gemini-fast', jsonMode: true, temperature: 0.3
            }, (d) => d && Array.isArray(d.elementos_presentes));

            let elementosAñadidos = [];
            const validCats = ['characters', 'places', 'flora_fauna', 'objects_tech', 'clothing', 'magic_fx'];

            if (extractData.nuevos_elementos && Array.isArray(extractData.nuevos_elementos)) {
                for (let i = 0; i < extractData.nuevos_elementos.length; i++) {
                    const el = extractData.nuevos_elementos[i];
                    
                    const cleanName = el.nombre.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_ÁÉÍÓÚÑ]/g, '');
                    const targetCat = validCats.includes(el.categoria) ? el.categoria : 'characters';

                    if (!bible[targetCat].includes(`@${cleanName}:`)) {
                        const sysPromptDesc = "Eres un Concept Artist y Worldbuilder experto. Escribe una ficha visual técnica usando TAGS (etiquetas separadas por comas) describiendo físicamente este elemento. PROHIBIDO frases completas, verbos o contexto.";
                        const userPromptDesc = `
                            Elemento a detallar: "${el.nombre}"
                            Categoría: "${el.categoria}"
                            Contexto de la historia: "${node.text}"
                            
                            Genera las etiquetas físicas en inglés:
                        `;

                        const description = await window.Koreh.Text.generateWithRetry(sysPromptDesc, userPromptDesc, {
                            model: 'nova-fast', jsonMode: false, temperature: 0.5
                        }, (d) => d && d.length > 5);

                        const newEntry = `\n@${cleanName}: ${description.trim()}\n`;
                        bible[targetCat] += newEntry;
                        
                        elementosAñadidos.push(`@${cleanName}`);
                    }
                }
            }

            let etiquetasFinales = [];
            if (extractData.elementos_presentes && Array.isArray(extractData.elementos_presentes)) {
                extractData.elementos_presentes.forEach(name => {
                    let clean = name.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_ÁÉÍÓÚÑ]/g, '');
                    if (!clean.startsWith('@')) clean = '@' + clean;
                    if (!etiquetasFinales.includes(clean)) etiquetasFinales.push(clean);
                });
            }

            if (etiquetasFinales.length > 0) {
                // Reemplazamos si ya existía para evitar sobreescribirlo de mala manera
                node.text = node.text.replace(/\n\n\[Canon Visual:.*?\]/g, '');
                // Inyectamos al final del todo
                node.text += `\n\n[Canon Visual: ${etiquetasFinales.join(', ')}]`;
            }

            if (Core.bookData) Core.bookData.visualBible = bible;
            if (Core.book) Core.book.visualBible = bible;

            if (typeof AIVisual !== 'undefined' && AIVisual.loadManualBible) {
                AIVisual.loadManualBible(bible);
            }

            if (Core.scheduleSave) Core.scheduleSave();

            if (elementosAñadidos.length > 0 || etiquetasFinales.length > 0) {
                let msg = "📚 Extracción exitosa.\n";
                if (elementosAñadidos.length > 0) msg += `\nAñadidos a la Biblia:\n- ${elementosAñadidos.join('\n- ')}`;
                if (etiquetasFinales.length > 0) msg += `\n\nEtiquetas inyectadas al nodo:\n${etiquetasFinales.join(', ')}`;
                alert(msg);
            } else {
                alert("No se detectaron entidades relevantes en este pasaje.");
            }

        } catch (e) {
            alert("Error al extraer lore visual: " + e.message);
        } finally {
            // Liberamos y renderizamos canvas
            this.extractingNodes.delete(nodeId);
            if (typeof Canvas !== 'undefined') Canvas.renderNodes();
            // Actualizar vista del editor si estamos en él
            if (Core.selectedNodeId === nodeId && typeof Editor !== 'undefined') Editor.loadNode(nodeId);
        }
    },

    // ⚙️ 7. Test de Mortalidad (Monte Carlo)
    simulateMortality(nodeId) {
        const startNode = Core.getNode(nodeId);
        if (!startNode) return;

        const RUNS = 1000;
        let survivals = 0;
        let deaths = 0;
        let avgScore = 0;

        for (let i = 0; i < RUNS; i++) {
            let curr = startNode;
            let hp = 10;
            let score = curr.scoreImpact || 0;
            let infiniteLoopCheck = 0;

            while (curr && curr.choices && curr.choices.length > 0 && hp > 0 && infiniteLoopCheck < 100) {
                infiniteLoopCheck++;
                
                if (curr.eff && curr.eff.type === 'vida') {
                    let val = Number(curr.eff.val);
                    if (curr.eff.op === '-') hp -= val;
                    if (curr.eff.op === '+') hp += val;
                }

                if (hp <= 0) break;

                const randomChoice = curr.choices[Math.floor(Math.random() * curr.choices.length)];
                
                if (randomChoice.eff && randomChoice.eff.type === 'vida') {
                    let val = Number(randomChoice.eff.val);
                    if (randomChoice.eff.op === '-') hp -= val;
                }

                if (hp <= 0) break;

                curr = Core.getNode(randomChoice.targetId);
                if (curr) score += (curr.scoreImpact || 0);
            }

            if (curr && curr.eff && curr.eff.type === 'vida' && hp > 0) {
                let val = Number(curr.eff.val);
                if (curr.eff.op === '-') hp -= val;
            }

            if (hp > 0 && curr && (!curr.choices || curr.choices.length === 0)) {
                survivals++;
            } else {
                deaths++;
            }
            avgScore += score;
        }

        const survivalRate = ((survivals / RUNS) * 100).toFixed(1);
        const finalAvgScore = (avgScore / RUNS).toFixed(1);

        alert(`☠️ SIMULADOR DE MORTALIDAD (1000 Partidas)\n\nDesde este nodo hacia adelante (con Vida base 10):\n- Sobrevivientes: ${survivals}\n- Muertes: ${deaths}\n\nProbabilidad de Supervivencia: ${survivalRate}%\nPuntuación Media Lograda: ${finalAvgScore}`);
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
    }
};