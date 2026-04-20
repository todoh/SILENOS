// Archivo: Librojuego/ai.context.js

// Motor de Soporte Global para Algoritmos Avanzados
window.AISupport = {
    // --- NUEVO: MOTOR CARTOGRÁFICO (Cálculo Físico-Espacial) ---
    getGeographicContext(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) return "";
        
        const elements = Core.book?.mapElements || Core.bookData?.mapElements || { areas: [], emojis: [] };
        if (!elements.areas && !elements.emojis) return "";

        // Calculamos el centro del nodo basándonos en sus medidas del CSS (220x280)
        const nX = node.x + 110; 
        const nY = node.y + 140; 
        let geoParts = [];

        // 1. Colisión con Áreas (Cajas delimitadoras - AABB)
        const activeAreas = (elements.areas || []).filter(a => nX >= a.x && nX <= (a.x + a.width) && nY >= a.y && nY <= (a.y + a.height));
        if (activeAreas.length > 0) {
            const aNames = activeAreas.map(a => `[${a.name}]${a.description ? ` (Detalles: ${a.description})` : ''}`).join(', ');
            geoParts.push(`ZONA GEOGRÁFICA ACTUAL (Área del Mapa): La escena ocurre físicamente dentro de ${aNames}.`);
        }

        // 2. Colisión con Marcadores/Emojis (Radio de influencia)
        const activeMarkers = (elements.emojis || []).filter(e => {
            if (!e.zoneSize || e.zoneSize <= 0) return false;
            const radius = e.zoneSize / 2;
            const dist = Math.hypot(nX - e.x, nY - e.y);
            return dist <= radius;
        });
        if (activeMarkers.length > 0) {
            const eNames = activeMarkers.map(e => `[${e.label}]${e.description ? ` (Detalles: ${e.description})` : ''}`).join(', ');
            geoParts.push(`PUNTOS DE INTERÉS CERCANOS (Radio del Marcador): ${eNames}.`);
        }

        if (geoParts.length > 0) {
            return `\n*** CARTOGRAFÍA Y CONTEXTO ESPACIAL (Motor de Mapa) ***\n${geoParts.join('\n')}\n-> INSTRUCCIÓN CRÍTICA: Utiliza obligatoriamente esta información geográfica para dar contexto a la narrativa, el clima, el entorno físico y las opciones lógicas.\n`;
        }
        return "";
    },

    // 1. Algoritmo BFS para reconstruir la historia real del jugador
    getPathText(targetId) {
        const nodes = Core.book?.nodes || Core.bookData?.nodes || [];
        if (!nodes.length) return "";
        let queue = [[nodes[0].id]];
        let visited = new Set();
        let pathIds = [];
        
        while (queue.length > 0) {
            let path = queue.shift();
            let curr = path[path.length - 1];
            if (curr === targetId) { pathIds = path; break; }
            if (!visited.has(curr)) {
                visited.add(curr);
                let n = nodes.find(x => x.id === curr);
                if (n && n.choices) {
                    for (let c of n.choices) queue.push([...path, c.targetId]);
                }
            }
        }
        if (pathIds.length === 0) pathIds = [targetId];
        
        let storyParts = [];
        for (let i = 0; i < pathIds.length; i++) {
            let n = nodes.find(x => x.id === pathIds[i]);
            if (n && n.text && n.text.length > 5) {
                let part = n.text;
                if (i < pathIds.length - 1) {
                    let nextId = pathIds[i + 1];
                    let chosenChoice = n.choices ? n.choices.find(c => c.targetId === nextId) : null;
                    if (chosenChoice && chosenChoice.text) {
                        part += `\n\n>> [EL JUGADOR DECIDIÓ: ${chosenChoice.text}] <<`;
                    }
                }
                storyParts.push(part);
            }
        }
        return storyParts.join("\n\n---\n\n");
    },

    // LLAMADA DE APOYO 1: Informe Histórico y de Estado
    async analyzeContext(nodeId) {
        const pathText = this.getPathText(nodeId);
        const geoContext = this.getGeographicContext(nodeId); // Inyección cartográfica

        const sysPrompt = "Eres un Analista Lógico de librojuegos. Analiza la ruta narrativa hasta el momento actual. Devuelve ESTRICTAMENTE JSON PURO.";
        const userPrompt = `
            Ruta exacta del jugador hasta el nodo actual:
            ${pathText.substring(0, 10000)}
            ${geoContext}

            Genera un informe analizando:
            1. Resumen de la trama actual y qué acaba de suceder.
            2. Cambios en la lógica del juego y estado del jugador (físico/mental/heridas).
            3. Objetos, pistas o aliados relevantes obtenidos (inventario implícito).
            4. Tono y atmósfera predominante.
            
            FORMATO JSON EXACTO:
            {
                "resumen": "...",
                "estado_logica": "...",
                "inventario_implicito": "...",
                "tono": "..."
            }
        `;
        return await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, { model: 'nova-fast', jsonMode: true, temperature: 0.3 }, d => d && d.resumen);
    },

    // LLAMADA DE APOYO 2: Informe de Opciones y Avance
    async getOptionsReport(analysis, currentNodeText, taskInstructions) {
        const sysPrompt = "Eres un Diseñador de Narrativa Estratégica. Propón directrices geniales para continuar la historia basándote en el informe del estado actual. Devuelve ESTRICTAMENTE JSON PURO.";
        const userPrompt = `
            INFORME DE CONTEXTO PREVIO:
            Resumen: ${analysis.resumen}
            Estado y Lógica: ${analysis.estado_logica}
            Inventario Implícito: ${analysis.inventario_implicito}
            Tono: ${analysis.tono}

            TEXTO DEL NODO ACTUAL (Donde se tomará la decisión/acción):
            "${currentNodeText}"

            TAREA ESPECÍFICA DE DISEÑO A RESOLVER:
            ${taskInstructions}

            Genera un informe con las opciones o enfoques más interesantes, coherentes y emocionantes para cumplir la tarea, asegurándote de usar los objetos o el estado actual del jugador.
            
            FORMATO JSON EXACTO:
            {
                "enfoques_propuestos": ["idea de diseño detallada 1", "idea de diseño detallada 2", "idea de diseño detallada 3"],
                "justificacion_de_diseño": "Por qué estas ideas encajan perfectamente..."
            }
        `;
        return await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, { model: 'nova-fast', jsonMode: true, temperature: 0.7 }, d => d && Array.isArray(d.enfoques_propuestos));
    }
};

window.AIContext = {
    // ----------------------------------------------------
    // PUNTO 1: BIFURCAR / TRIFURCAR (CON MEJORA DE 3 FASES)
    // ----------------------------------------------------
    async bifurcateWithAI(nodeId, branchesCount) {
        const parent = Core.getNode(nodeId);
        if (!parent) return;

        const contextText = parent.text || "Un lugar misterioso.";
        if (contextText.length < 15) {
            return alert("El nodo actual necesita más texto narrativo para que la IA entienda el contexto y pueda bifurcarlo con sentido.");
        }

        try {
            UI.setLoading(true, "Fase 1/3: Analizando Historial (BFS)...", 20, "Reconstruyendo decisiones previas", 20);
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            UI.setLoading(true, "Fase 2/3: Ideando Estrategias...", 50, `Calculando ${branchesCount} caminos lógicos óptimos`, 50);
            const taskInstructions = `Diseñar exactamente ${branchesCount} caminos divergentes y lógicos para continuar desde el nodo actual.`;
            const optionsReport = await window.AISupport.getOptionsReport(analysisReport, contextText, taskInstructions);

            UI.setLoading(true, "Fase 3/3: Tejiendo Ramas Definitivas...", 80, `Escribiendo literatura y botones`, 80);
            
            const sysPrompt = `Eres un Oráculo Director de librojuegos. Genera EXACTAMENTE ${branchesCount} rutas o acciones basadas CUIDADOSAMENTE en los informes de diseño. Devuelve ESTRICTAMENTE JSON PURO.`;
            const geoContext = window.AISupport.getGeographicContext(nodeId); // Inyección cartográfica

            const userPrompt = `
                INFORME DE DISEÑO PREVIO:
                Enfoques sugeridos: ${JSON.stringify(optionsReport.enfoques_propuestos)}
                Justificación: ${optionsReport.justificacion_de_diseño}

                SITUACIÓN ACTUAL: "${contextText}"
                ${geoContext}
                
                Siguiendo los enfoques sugeridos, genera ${branchesCount} opciones divergentes y sus consecuencias inmediatas (1 o 2 frases).
                - La "accion" debe ser en imperativo o primera persona (Ej: "Usar la llave de hierro", "Atacar al orco").
                - El "texto_destino" debe ser la consecuencia directa de esa acción para iniciar el nuevo nodo.

                FORMATO JSON EXACTO:
                {
                    "rutas": [
                        { "accion": "Texto corto del botón", "texto_destino": "Consecuencia narrativa inicial..." }
                    ]
                }
            `;

            const data = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'nova-fast',
                jsonMode: true,
                temperature: 0.7
            }, (d) => d && Array.isArray(d.rutas) && d.rutas.length === branchesCount);

            if (!parent.choices) parent.choices = [];
            const startY = parent.y - ((branchesCount - 1) * 150);

            data.rutas.forEach((ruta, i) => {
                const childId = `nodo_${Math.random().toString(36).substr(2, 5)}`;
                Core.book.nodes.push({ 
                    id: childId, text: ruta.texto_destino, choices: [], x: parent.x + 350, y: startY + (i * 300), scoreImpact: 0 
                });
                parent.choices.push({ text: ruta.accion, targetId: childId });
            });

            Canvas.render();
            Core.scheduleSave();

        } catch (error) {
            console.error("Fallo al bifurcar con IA:", error);
            alert("El Oráculo falló al crear las rutas: " + error.message);
        } finally {
            UI.setLoading(false);
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        }
    },

    // ----------------------------------------------------
    // BIFURCACIÓN CON DIRECTOR (SLIDERS + GRAVEDAD)
    // ----------------------------------------------------
    async bifurcateWithDirectorAI(nodeId, branchesCount, directorConfig) {
        const parent = Core.getNode(nodeId);
        if (!parent) return;

        const contextText = parent.text || "Un lugar misterioso.";
        if (contextText.length < 15) {
            return alert("El nodo actual necesita más texto narrativo para que la IA entienda el contexto y pueda bifurcarlo con sentido.");
        }

        try {
            UI.setLoading(true, "Fase 1/3: Analizando Historial...", 20, "Reconstruyendo decisiones previas", 20);
            const analysisReport = await window.AISupport.analyzeContext(nodeId);

            UI.setLoading(true, "Fase 2/3: Evaluando Directrices del Director...", 50, `Aplicando Gravedad y Sliders`, 50);
            
            let gravityInstruction = "";
            if (directorConfig.targetPin) {
                let distConcept = "";
                if (directorConfig.distance === 'lejos') distConcept = "La meta está muy lejos. El jugador debe iniciar el viaje, planificar, u orientarse geográficamente hacia allí.";
                if (directorConfig.distance === 'media') distConcept = "La meta está a media distancia. El jugador se acerca, pero encuentra obstáculos físicos o narrativos en el camino relacionados con el destino.";
                if (directorConfig.distance === 'cerca') distConcept = "La meta es INMINENTE. El jugador está en el umbral, frente a la puerta o el evento a punto de desencadenarse.";
                
                gravityInstruction = `\n[META DE GRAVEDAD]: Tienes la obligación ineludible de guiar las opciones generadas hacia este destino: "${directorConfig.targetPin}".\n[DISTANCIA ACTUAL]: ${distConcept}\n`;
            }

            const sysPrompt = `Eres un Director de Juego (Oráculo) de ficción interactiva altamente estricto. Vas a generar EXACTAMENTE ${branchesCount} rutas cortas. Devuelve ESTRICTAMENTE JSON PURO.`;
            const geoContext = window.AISupport.getGeographicContext(nodeId); // Inyección cartográfica

            const userPrompt = `
                INFORME DEL JUGADOR ACTUAL:
                Resumen: ${analysisReport.resumen}
                Estado Mental/Físico: ${analysisReport.estado_logica}
                
                SITUACIÓN ACTUAL DE LA ESCENA: "${contextText}"
                ${geoContext}

                *** CONSOLA DEL DIRECTOR DE JUEGO (OBLIGATORIO OBEDECER) *** ${gravityInstruction}
                - Nivel de TENSIÓN / PELIGRO: ${directorConfig.tension} sobre 100. (A mayor valor, las opciones deben implicar trampas, daño, pánico o ataques inminentes. A 0, total calma).
                - Nivel de MISTERIO / LORE: ${directorConfig.mystery} sobre 100. (A mayor valor, las opciones deben enfocarse en descubrir secretos, examinar lo oculto, esoterismo o puzzles).
                - Nivel de ACCIÓN CINÉTICA: ${directorConfig.action} sobre 100. (A mayor valor, opciones de salto, carrera, combate, reflejos físicos. A menor valor, opciones de diálogo, observación estática o sigilo lento).
                
                Basándote en la Consola del Director, genera ${branchesCount} opciones divergentes y sus consecuencias inmediatas (1 o 2 frases).
                - "accion": Verbo en imperativo o 1ª persona ("Correr a la puerta").
                - "texto_destino": Consecuencia directa (lo que pasa justo al elegir).

                FORMATO JSON EXACTO ESPERADO:
                {
                    "rutas": [
                        { "accion": "Texto corto del botón", "texto_destino": "Consecuencia narrativa guiada por el Director..." }
                    ]
                }
            `;

            UI.setLoading(true, "Fase 3/3: Tejiendo Ramas Condicionadas...", 80, `Escribiendo literatura y botones`, 80);
            
            const data = await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, {
                model: 'nova-fast',
                jsonMode: true,
                temperature: 0.7
            }, (d) => d && Array.isArray(d.rutas) && d.rutas.length === branchesCount);

            if (!parent.choices) parent.choices = [];
            const startY = parent.y - ((branchesCount - 1) * 150);

            data.rutas.forEach((ruta, i) => {
                const childId = `nodo_${Math.random().toString(36).substr(2, 5)}`;
                Core.book.nodes.push({ 
                    id: childId, text: ruta.texto_destino, choices: [], x: parent.x + 350, y: startY + (i * 300), scoreImpact: 0 
                });
                parent.choices.push({ text: ruta.accion, targetId: childId });
            });

            Canvas.render();
            Core.scheduleSave();

        } catch (error) {
            console.error("Fallo del Director IA:", error);
            alert("El Director falló al crear las rutas: " + error.message);
        } finally {
            UI.setLoading(false);
            if (typeof ContextMenu !== 'undefined') ContextMenu.hide();
        }
    }
};