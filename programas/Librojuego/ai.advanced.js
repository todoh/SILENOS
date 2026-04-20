// Archivo: Librojuego/ai.advanced.js

window.AIAdvanced = {
    
    // ----------------------------------------------------
    // PUNTO 2: SUB-TRAMA FRACTAL (CON MEJORA DE 3 FASES)
    // ----------------------------------------------------
    async generateFractal(nodeId) {
        const parent = Core.getNode(nodeId);
        if (!parent || !parent.text) return alert("El nodo necesita texto base para generar una subtrama.");

        try {
            UI.setLoading(true, "Fase 1/3: Analizando Historial (BFS)...", 20, "Escaneando estado actual", 20);
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            UI.setLoading(true, "Fase 2/3: Diseñando Estructura Fractal...", 50, "Creando nudos narrativos", 50);
            const taskInstructions = "Diseñar una subtrama fractal: 2 caminos divergentes derivados del nodo actual que, hagan lo que hagan, convergen ineludiblemente en un mismo punto o sala final.";
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, parent.text, taskInstructions);

            UI.setLoading(true, "Fase 3/3: Forjando Topología...", 80, "Inyectando 3 nodos interconectados", 80);
            const sysPrompt = "Eres un Arquitecto de Librojuegos. Genera una aventura fractal basada fielmente en los informes previos. Devuelve ESTRICTAMENTE JSON PURO.";
            const geoContext = window.AISupport && typeof window.AISupport.getGeographicContext === 'function' ? window.AISupport.getGeographicContext(nodeId) : ""; // Inyección cartográfica

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

            Canvas.render();
            Core.scheduleSave();
        } catch (e) {
            alert("Error del Oráculo Fractal: " + e.message);
        } finally {
            UI.setLoading(false);
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        }
    },

    // ----------------------------------------------------
    // PUNTO 3: PUZLES MORTALES (CON MEJORA DE 3 FASES)
    // ----------------------------------------------------
    async generatePuzzle(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) return;

        try {
            UI.setLoading(true, "Fase 1/3: Analizando Historial (BFS)...", 20, "Revisando inventario y entorno", 20);
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            UI.setLoading(true, "Fase 2/3: Diseñando Engaño Lógico...", 50, "Mapeando trampas y salidas", 50);
            const taskInstructions = "Diseñar un acertijo, trampa mortal o enigma mecánico coherente con el inventario y estado del jugador. Debe tener 1 opción correcta para avanzar y 2 opciones de trampa letales o dañinas.";
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, node.text || "Una sala vacía", taskInstructions);

            UI.setLoading(true, "Fase 3/3: Forjando Trampa en Canvas...", 80, "Conectando consecuencias", 80);
            const sysPrompt = "Eres un Game Designer experto. Convierte la situación en una trampa mortal basada en el diseño previo. Devuelve ESTRICTAMENTE JSON PURO.";
            const geoContext = window.AISupport && typeof window.AISupport.getGeographicContext === 'function' ? window.AISupport.getGeographicContext(nodeId) : ""; // Inyección cartográfica

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

            Canvas.render();
            Core.scheduleSave();
        } catch (e) {
            alert("Error al crear Puzzle: " + e.message);
        } finally {
            UI.setLoading(false);
            ContextMenu.hide();
        }
    },

    // ----------------------------------------------------
    // PUNTO 4: CAMBIO DE PERSPECTIVA (CON MEJORA DE 3 FASES)
    // ----------------------------------------------------
    async changePerspective(nodeId, perspective) {
        const node = Core.getNode(nodeId);
        if (!node || !node.text) return;

        try {
            UI.setLoading(true, "Fase 1/3: Analizando Historial (BFS)...", 20, "Capturando tono original", 20);
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            UI.setLoading(true, "Fase 2/3: Procesando Guía de Estilo...", 50, "Traduciendo gramática", 50);
            const taskInstructions = `Proponer directrices estilísticas estrictas para reescribir ESTE TEXTO EXACTO a ${perspective} persona, manteniendo absolutamente la coherencia con el tono y el estado mental del jugador.`;
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, node.text, taskInstructions);

            UI.setLoading(true, `Fase 3/3: Aplicando ${perspective} Persona...`, 80, "Modificando prosa final", 80);
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
            Canvas.renderNodes();
            Core.scheduleSave();
        } catch (e) {
            alert("Error al cambiar perspectiva: " + e.message);
        } finally {
            UI.setLoading(false);
            ContextMenu.hide();
        }
    },

    // 🔮 5. Radar de Tensión Dramática
    async analyzeTension(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node || !node.text) return;

        UI.setLoading(true, "Analizando Tensión...", 50, "Midiendo pulso narrativo", 50);

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
            ContextMenu.hide();
        }
    },

    // 🔮 6. Extracción de Lore Visual a la Biblia (Totalmente rediseñado)
    async extractLore(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node || !node.text) return;

        UI.setLoading(true, "Fase 1/3: Escaneando Nodo...", 20, "Buscando elementos que falten en la Biblia Visual", 20);

        try {
            // 1. Obtener el estado actual de la biblia para evitar repeticiones
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

            // 2. Extraer novedades con gemini-fast
            const sysPromptExtract = "Eres un extractor de entidades de worldbuilding. Lee el texto y localiza personajes, lugares, criaturas u objetos clave que NO ESTÉN ya definidos en el LORE ACTUAL proporcionado. Devuelve ESTRICTAMENTE JSON PURO.";
            const userPromptExtract = `
                LORE ACTUAL EN LA BIBLIA VISUAL:
                ${currentLoreContext}
                
                TEXTO A ANALIZAR (Busca novedades aquí):
                "${node.text}"
                
                INSTRUCCIONES: Identifica únicamente elementos NUEVOS. Si no hay elementos nuevos y relevantes, devuelve un array vacío.
                Las categorías permitidas son: "characters", "places", "flora_fauna", "objects_tech", "clothing", "magic_fx".

                FORMATO JSON ESPERADO:
                {
                    "nuevos_elementos": [
                        { "nombre": "Nombre del Elemento", "categoria": "characters" }
                    ]
                }
            `;

            const extractData = await window.Koreh.Text.generateWithRetry(sysPromptExtract, userPromptExtract, {
                model: 'gemini-fast', jsonMode: true, temperature: 0.3
            }, (d) => d && Array.isArray(d.nuevos_elementos));

            if (!extractData.nuevos_elementos || extractData.nuevos_elementos.length === 0) {
                alert("No se detectaron elementos o conceptos visuales NUEVOS en este nodo que no estén ya en la Biblia Visual.");
                return;
            }

            // 3. Generar descripciones ULTRA DETALLADAS individualmente usando nova-fast
            let elementosAñadidos = [];
            const validCats = ['characters', 'places', 'flora_fauna', 'objects_tech', 'clothing', 'magic_fx'];

            for (let i = 0; i < extractData.nuevos_elementos.length; i++) {
                const el = extractData.nuevos_elementos[i];
                let pct = 30 + ((i / extractData.nuevos_elementos.length) * 60);
                
                UI.setLoading(true, "Fase 2/3: Forjando Concept Art...", pct, `Describiendo con nova-fast: ${el.nombre}`, pct);

                const sysPromptDesc = "Eres un Concept Artist y Worldbuilder experto. Tu tarea es describir de forma ULTRA DETALLADA el aspecto físico, diseño visual, materiales, colores y aura del elemento solicitado. NO narres acciones ni contexto argumental. Enfócate exclusiva y exhaustivamente en el DISEÑO VISUAL para una futura ilustración. Escribe de 1 a 2 párrafos densos.";
                const userPromptDesc = `
                    Elemento a detallar: "${el.nombre}"
                    Categoría del elemento: "${el.categoria}"
                    Contexto narrativo de donde surge: "${node.text}"
                    
                    Genera ahora la descripción estricta y ultra detallada de su aspecto:
                `;

                const description = await window.Koreh.Text.generateWithRetry(sysPromptDesc, userPromptDesc, {
                    model: 'nova-fast', jsonMode: false, temperature: 0.5
                }, (d) => d && d.length > 20);

                // 4. Agrupar y ensamblar en la categoría correcta de la Biblia Visual
                const targetCat = validCats.includes(el.categoria) ? el.categoria : 'characters';
                
                // Formateamos para que encaje como etiqueta de la biblia: [NOMBRE]: Descripción
                const newEntry = `\n[${el.nombre.toUpperCase()}]: ${description.trim()}\n`;
                bible[targetCat] = (bible[targetCat] || "") + newEntry;
                
                elementosAñadidos.push(el.nombre);
            }

            // 5. Guardado final de la Biblia Visual y sincronización global
            UI.setLoading(true, "Fase 3/3: Ensamblando y Guardando...", 95, "Sincronizando el núcleo", 95);

            if (Core.bookData) Core.bookData.visualBible = bible;
            if (Core.book) Core.book.visualBible = bible;

            // Intentamos cargar la nueva información visual en el UI si la ventana de la Biblia estuviera inicializada
            if (typeof AIVisual !== 'undefined' && AIVisual.loadManualBible) {
                AIVisual.loadManualBible(bible);
            }

            Core.scheduleSave();

            alert(`📚 Extracción exitosa. Se han añadido los siguientes elementos a la Biblia Visual:\n\n- ${elementosAñadidos.join('\n- ')}`);

        } catch (e) {
            alert("Error al extraer lore visual: " + e.message);
            console.error("Fallo detallado en extractLore:", e);
        } finally {
            UI.setLoading(false);
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
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