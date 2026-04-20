// Archivo: Librojuego/ai.generator.js

window.AIGenerator = window.AIGenerator || {};

window.AIGenerator.generate = async function() {
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
    const totalNodesTarget = parseInt(document.getElementById('ai-nodes')?.value) || 50;

    if (!premise || !startState || !idealEnd) {
        return alert("Es obligatorio rellenar al menos: Premisa, Inicio y Final Idóneo.");
    }

    const finalNodes = [];
    let nodesGenerated = 0;

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

            FORMATO JSON EXACTO (Las claves deben llamarse exactamente así y no pueden estar dentro de otro objeto):
            {
                "title": "Un título épico y comercial para la obra",
                "world_rules": "Reglas inmutables de este universo",
                "core_conflict": "El conflicto principal sintetizado",
                "character_arcs": "Guía de cómo deben evolucionar los personajes principales",
                "ending_criteria": "Criterios que determinan si el jugador alcanza el final idóneo o fracasa"
            }
        `;

        const bibleData = await window.Koreh.Text.generateWithRetry(bibleSystemPrompt, bibleUserPrompt, {
            model: 'gemini-fast', 
            jsonMode: true,
            temperature: 0.7
        }, (data) => data && data.title && data.world_rules);

        const bookTitle = bibleData.title;

        // ==========================================
        // FASE 2: PUNTOS DE INTERÉS (SECUENCIAL)
        // ==========================================
        const totalPOIs = Math.max(1, Math.floor(totalNodesTarget / 5));
        const poiBatches = Math.ceil(totalPOIs / 7);
        let generatedPOIs = [];

        UI.setLoading(true, `Trazando ${totalPOIs} Puntos de Interés...`, 15, "Mapeando la trama", 20);

        for (let i = 0; i < poiBatches; i++) {
            const poisToGenerate = Math.min(7, totalPOIs - (i * 7));
            const poiSystemPrompt = "Eres un director de narrativa interactiva. Devuelve ESTRICTAMENTE JSON PURO.";
            const poiUserPrompt = `
                Biblia de diseño base:
                ${JSON.stringify(bibleData)}

                Necesito que generes ${poisToGenerate} NUEVOS Puntos de Interés.
                FORMATO JSON:
                {
                    "pois": [
                        { "id_evento": "poi_unico_X", "description": "Descripción clara del evento que debe ocurrir" }
                    ]
                }
            `;
            
            const poiData = await window.Koreh.Text.generateWithRetry(poiSystemPrompt, poiUserPrompt, {
                model: 'gemini-fast',
                jsonMode: true,
                temperature: 0.8
            }, (data) => data && Array.isArray(data.pois));

            if (poiData && poiData.pois) {
                generatedPOIs = generatedPOIs.concat(poiData.pois);
            }
            
            // Pausa para evitar el bloqueo 429 de la API
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // ==========================================
        // FASE 3: TOPOLOGÍA DINÁMICA (CRECIMIENTO EN ÁRBOL PARALELO)
        // ==========================================
        let currentPoiIndex = 0;

        // Función recursiva que expande una rama a su propio ritmo
        const processBranch = async (task) => {
            let tensionLevel = nodesGenerated / totalNodesTarget;
            let pct = 30 + (Math.min(1, tensionLevel) * 40); 
            UI.setLoading(true, `Tejiendo Árbol Fractal (${nodesGenerated}/${totalNodesTarget} nodos en expansión)`, pct, `El Director evaluando ramas en paralelo`, pct);

            let tensionInstruction = "ESTADO: Expansión. Bifurca libremente creando situaciones de 1 a 3 rutas posibles.";
            if (tensionLevel >= 0.95) {
                tensionInstruction = "ALERTA CRÍTICA: Límite de historia alcanzado. DEBES forzar el cierre. Usa estado: 'final' obligatoriamente a menos que falte un paso ineludible.";
            } else if (tensionLevel >= 0.75) {
                tensionInstruction = "ESTADO: Convergencia. La historia debe empezar a concluir. Cierra subtramas y fomenta desenlaces.";
            }

            let poiText = "";
            if (tensionLevel < 0.9 && currentPoiIndex < generatedPOIs.length) {
                poiText = `\nIntenta integrar lógicamente este suceso cercano: ${JSON.stringify(generatedPOIs[currentPoiIndex])}`;
                currentPoiIndex++; 
            }

            const directorSystemPrompt = "Eres un Director de Juego (Oráculo). Tu trabajo NO es escribir literatura, sino decidir la estructura y viabilidad de las ramas argumentales de forma lógica. Devuelve ESTRICTAMENTE JSON PURO.";
            const directorUserPrompt = `
                Biblia de diseño: ${JSON.stringify(bibleData)}
                Instrucción de Tensión Actual: ${tensionInstruction}${poiText}
                Estás evaluando esta rama: Contexto / Lo que acaba de ocurrir: "${task.context}"
                
                Decide si la historia debe "continuar" o llegar a un "final" en este punto.
                Si continúa, idea entre 1 y 3 posibles acciones para salir de esta situación, y especifica la consecuencia lógica.
                Si es "final", determina el score (0 a 100) y deja "nuevas_rutas" como un array vacío [].

                REGLA DE PUNTUACIÓN DE FINALES (Ajuste Fino):
                Si el estado es "final", debes evaluar el desenlace de forma orgánica, variada y justa. Usa TODO el espectro de números del 0 al 100 sin anclarte en los extremos. Evita repetir siempre el mismo valor. Evalúa según esta guía:
                - 0 a 25: Desastre total, muerte evitable o traición (ej. 4, 12, 19, 24).
                - 26 a 50: Fracaso doloroso, supervivencia amarga, se pierde mucho (ej. 31, 38, 42, 47).
                - 51 a 75: Final neutral o agridulce, victoria pírrica, empate (ej. 53, 62, 68, 74).
                - 76 a 95: Final positivo, victoria con sacrificios menores (ej. 78, 85, 89, 93).
                - 96 a 100: Final perfecto reservado para el éxito absoluto.
                ¡CRÍTICO: NUNCA pongas todos los finales en 0 ni en 35. Varía matemáticamente la puntuación!
                
                FORMATO JSON ESPERADO:
                {
                    "analisis_dramatico": "Tu razonamiento interno justificando la puntuación específica elegida.",
                    "estado": "continuar", 
                    "scoreImpact": 0,
                    "nuevas_rutas": [
                        {
                            "accion_del_jugador": "Abrir puerta",
                            "consecuencia_logica": "El jugador huye por el pasillo."
                        }
                    ]
                }
            `;

            const directorData = await window.Koreh.Text.generateWithRetry(directorSystemPrompt, directorUserPrompt, {
                model: 'nova-fast', 
                jsonMode: true,
                temperature: 0.6
            }, (data) => data && data.estado && (data.estado === 'final' || Array.isArray(data.nuevas_rutas)));

            const node = {
                id: task.id,
                x: 100 + (Math.random() * 1200),
                y: 100 + (Math.random() * 800),
                summary: task.context,
                scoreImpact: directorData.scoreImpact || 0,
                choices: [],
                text: "" 
            };

            // Aseguramos el nodo en el array y sumamos al contador global
            finalNodes.push(node);
            nodesGenerated++;

            const forceEmergencyFinal = nodesGenerated >= (totalNodesTarget * 1.5);

            if (directorData.estado === "continuar" && !forceEmergencyFinal && Array.isArray(directorData.nuevas_rutas)) {
                
                // Espera de 2 segundos de latencia antes de lanzar el siguiente cluster en paralelo
                await new Promise(resolve => setTimeout(resolve, 2000));

                const branchPromises = directorData.nuevas_rutas.map(ruta => {
                    const newId = `nodo_${Math.random().toString(36).substr(2, 6)}`;
                    node.choices.push({
                        text: ruta.accion_del_jugador,
                        targetId: newId
                    });
                    
                    // Llamada recursiva en paralelo para esta nueva ruta
                    return processBranch({
                        id: newId,
                        context: ruta.consecuencia_logica
                    });
                });

                // Esperamos a que todo este sub-árbol termine de ramificarse
                await Promise.all(branchPromises);
            }
        };

        // Arrancamos el árbol con el nodo inicial y esperamos que toda la cascada termine
        await processBranch({ 
            id: "start", 
            context: `El jugador se encuentra en el comienzo de la historia. Contexto inicial: ${startState}` 
        });

        // ==========================================
        // FASE 4: REDACCIÓN NARRATIVA (CASCADA ASÍNCRONA EN ÁRBOL)
        // ==========================================
        UI.setLoading(true, "Inyectando Alma Narrativa...", 75, "Escribiendo nodos literarios por ramas", 75);

        let nodesWritten = 0;
        const totalNodesToWrite = finalNodes.length;

        // Función recursiva para propagar la narrativa sin bloquearse
        const writeNarrativeBranch = async (nodeId) => {
            const node = finalNodes.find(n => n.id === nodeId);
            
            // Si no existe o ya empezó a redactarse (estado de protección), salimos
            if (!node || node.text) return;

            // Marcador temporal para evitar que ramas convergentes dupliquen el trabajo
            node.text = "escribiendo..."; 

            const writerSystemPrompt = "Eres un novelista aclamado de ficción interactiva. Escribes en segunda persona ('Tú haces...'). Tu prosa es rica, sensorial e inmersiva. RESPONDE ÚNICAMENTE CON EL TEXTO LITERARIO PLANO (Nada de JSON, sin introducciones).";
            const writerUserPrompt = `
                Biblia del Mundo: ${JSON.stringify(bibleData)}
                
                Tu tarea es redactar la prosa inmersiva del siguiente nodo argumental. Solo debes darle riqueza literaria al resumen.
                
                DATOS DEL NODO ACTUAL:
                - Resumen de lo que debes narrar: "${node.summary}"
                - Opciones que el sistema mostrará tras tu texto: ${JSON.stringify(node.choices.map(c => c.text))}
                - Impacto en Puntuación (Si es un final): ${node.scoreImpact}
                
                INSTRUCCIONES CRÍTICAS:
                1. NO devuelvas JSON.
                2. NO pongas títulos.
                3. Escribe de 1 a 3 párrafos ricos, con diálogos y narrativa. Usa los saltos de línea naturales (Enters) que necesites.
                4. La narración debe fluir hasta dar sentido a las opciones presentadas.
                5. Devuelve EXCLUSIVAMENTE la literatura.
            `;

            // 1. Lanzamos la petición a la IA pero SIN hacer await. Guardamos la promesa.
            const textTask = window.Koreh.Text.generateWithRetry(writerSystemPrompt, writerUserPrompt, {
                model: 'nova-fast',
                jsonMode: false, 
                temperature: 0.75
            }, (data) => data && typeof data === 'string' && data.length > 5)
            .then(data => {
                node.text = data.trim();
                delete node.summary; 
                nodesWritten++;
                
                let narrativePct = 75 + ((nodesWritten / totalNodesToWrite) * 20);
                UI.setLoading(true, `Inyectando Alma Narrativa (${nodesWritten}/${totalNodesToWrite})`, narrativePct, `Escribiendo ramas en paralelo`, narrativePct);
            })
            .catch(err => {
                console.warn(`Fallo al redactar nodo ${node.id}, usando fallback.`, err);
                node.text = `[Fallo de comunicación] Situación: ${node.summary}`;
                delete node.summary;
                nodesWritten++;
            });

            // 2. Espera de 2 segundos de latencia de propagación (para evitar Rate Limit)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. Propagación INMEDIATA hacia los hijos. No esperamos a que el texto actual termine.
            if (node.choices && node.choices.length > 0) {
                const branchPromises = node.choices.map(choice => writeNarrativeBranch(choice.targetId));
                await Promise.all(branchPromises);
            }

            // 4. Por seguridad estructural, esperamos a que la tarea original termine antes de cerrar la rama del todo.
            await textTask;
        };

        // Arrancamos la cascada desde la raíz
        await writeNarrativeBranch("start");

        // Chequeo de seguridad por si algún nodo quedó aislado y no fue recorrido por el árbol
        const unwrittenNodes = finalNodes.filter(n => n.text === "escribiendo...");
        if (unwrittenNodes.length > 0) {
            unwrittenNodes.forEach(n => {
                n.text = n.summary ? n.summary : "[Nodo huérfano sin texto]";
                delete n.summary;
            });
        }

        // ==========================================
        // FASE 5: RESOLUCIÓN Y ENSAMBLAJE
        // ==========================================
        UI.setLoading(true, "Aplicando físicas de topología...", 98, "Ensamblaje del Canvas", 100);

        const allValidIds = finalNodes.map(n => n.id);
        finalNodes.forEach(node => {
            if (node.choices) {
                node.choices = node.choices.filter(choice => allValidIds.includes(choice.targetId));
            }
        });

        // Guardar en Core
        Core.book = Core.book || {};
        Core.book.title = bookTitle;
        
        if (document.getElementById('book-title')) document.getElementById('book-title').value = Core.book.title;
        
        if (Core.bookData) {
            Core.bookData.title = bookTitle;
            Core.bookData.nodes = finalNodes;
        } else {
            Core.book.nodes = finalNodes;
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