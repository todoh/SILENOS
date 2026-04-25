// Archivo: Librojuego/ai.context.js

window.AISupport = {
    getGeographicContext(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) return "";
        
        const elements = Core.book?.mapElements || Core.bookData?.mapElements || { areas: [], emojis: [] };
        if (!elements.areas && !elements.emojis) return "";

        const nX = node.x + 110; 
        const nY = node.y + 140; 
        let geoParts = [];

        const activeAreas = (elements.areas || []).filter(a => nX >= a.x && nX <= (a.x + a.width) && nY >= a.y && nY <= (a.y + a.height));
        if (activeAreas.length > 0) {
            const aNames = activeAreas.map(a => `[${a.name}]${a.description ? ` (Detalles: ${a.description})` : ''}`).join(', ');
            geoParts.push(`ZONA GEOGRÁFICA ACTUAL (Área del Mapa): La escena ocurre físicamente dentro de ${aNames}.`);
        }

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
    
    getCanonInstruction() {
        const bible = Core.book?.visualBible || Core.bookData?.visualBible || {};
        const tags = new Set();
        const regex = /@[a-zA-Z0-9_áéíóúÁÉÍÓÚñÑ]+/g;
        Object.values(bible).forEach(text => {
            if (typeof text === 'string') {
                let m;
                while ((m = regex.exec(text)) !== null) {
                    tags.add(m[0]);
                }
            }
        });
        if (tags.size > 0) {
            return `\n*** ENTIDADES DEL CANON (BIBLIA VISUAL) ***\nElementos registrados: [${Array.from(tags).join(', ')}]\n-> INSTRUCCIÓN CRÍTICA OBLIGATORIA: Si en tu respuesta (ya sea en la descripción narrativa, consecuencia o en el botón de acción) mencionas a alguno de estos elementos, DEBES escribirlo exactamente con su etiqueta usando la arroba (ejemplo: "Atacar al @ORCO", "Huyes hacia el @BOSQUE_OSCURO"). NUNCA uses sus nombres sin la arroba inicial.\n`;
        }
        return "";
    }
};

window.AIContext = {
    generatingNodes: new Set(),

    async bifurcateWithAI(nodeId, branchesCount) {
        if (this.generatingNodes.has(nodeId)) {
            console.warn(`[AIContext] El nodo ${nodeId} ya se está bifurcando en segundo plano.`);
            return;
        }

        const parent = Core.getNode(nodeId);
        if (!parent) return;

        // Añadimos el nodo al Set para que el Canvas dibuje el icono de "Cargando en 2º plano"
        this.generatingNodes.add(nodeId);
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();

        try {
            // 1. CARGAR MACRO-TRAMA DE LA BITÁCORA
            let bitacoraMacro = "";
            if (typeof window.AIBitacora !== 'undefined') {
                try {
                    const bitacora = await window.AIBitacora.loadBitacora();
                    if (bitacora.resumen_general && bitacora.resumen_general.length > 10) {
                        bitacoraMacro = `
                        *** MACRO-TRAMA GLOBAL (BITÁCORA) ***
                        Resumen General: ${bitacora.resumen_general}
                        Hitos Clave: ${(bitacora.puntos_singulares && bitacora.puntos_singulares.length > 0) ? bitacora.puntos_singulares.join(" | ") : 'Sin hitos destacados'}
                        `;
                    }
                } catch(e) { console.warn("No se pudo cargar la bitácora en 2º plano."); }
            }

            // 2. CARGAR MICRO-CONTEXTO
            let fullStoryContext = "Contexto no disponible.";
            if (typeof window.AIRouteAnalyzer !== 'undefined') {
                fullStoryContext = window.AIRouteAnalyzer.getFullStoryContext(nodeId);
            } else {
                fullStoryContext = parent.text || "Un lugar misterioso."; 
            }
            
            let recentContext = fullStoryContext;
            if (recentContext.length > 6000) {
                recentContext = "...(Historia anterior resumida en la Bitácora)...\n\n" + recentContext.substring(recentContext.length - 6000);
            }

            const sysPrompt = `Eres un Oráculo Director de librojuegos. Analiza la historia global y los sucesos recientes, y genera EXACTAMENTE ${branchesCount} rutas o acciones lógicas divergentes para continuar desde el momento actual. Devuelve ESTRICTAMENTE JSON PURO.`;
            const geoContext = window.AISupport.getGeographicContext(nodeId); 
            const canonContext = window.AISupport.getCanonInstruction();

            const userPrompt = `
                ${bitacoraMacro}

                HISTORIA DETALLADA RECIENTE HASTA EL PUNTO ACTUAL:
                ${recentContext}
                ${geoContext}
                ${canonContext}
                
                Siguiendo el hilo de toda la trama, genera ${branchesCount} opciones divergentes y sus consecuencias inmediatas (1 o 2 frases).
                - La "accion" debe ser en imperativo o primera persona (Ej: "Usar la llave de hierro", "Atacar al orco").
                - El "texto_destino" debe ser la consecuencia directa de esa acción para iniciar el nuevo nodo.

                FORMATO JSON EXACTO:
                {
                    "rutas": [
                        { "accion": "Texto corto del botón", "texto_destino": "Consecuencia narrativa inicial..." }
                    ]
                }
            `;

            console.log(`[AIContext] Procesando bifurcación automática para el nodo ${nodeId} en segundo plano...`);

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

            if (Core.scheduleSave) Core.scheduleSave();
            console.log(`[AIContext] Bifurcación completada con éxito para el nodo ${nodeId}.`);

        } catch (error) {
            console.error("Fallo al bifurcar con IA:", error);
            alert("El Oráculo falló al crear las rutas en 2º plano: " + error.message);
        } finally {
            this.generatingNodes.delete(nodeId);
            if (typeof Canvas !== 'undefined') Canvas.render();
        }
    },

    async bifurcateWithDirectorAI(nodeId, branchesCount, directorConfig) {
        if (this.generatingNodes.has(nodeId)) {
            console.warn(`[AIContext] El nodo ${nodeId} ya se está bifurcando en segundo plano.`);
            return;
        }

        const parent = Core.getNode(nodeId);
        if (!parent) return;

        // Mostrar indicador visual de trabajo en 2º plano
        this.generatingNodes.add(nodeId);
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        if (typeof ContextMenu !== 'undefined') ContextMenu.hide();

        try {
            console.log(`[AIContext] El Director IA está procesando el nodo ${nodeId} en segundo plano...`);

            // 1. CARGAR MACRO-TRAMA DE LA BITÁCORA
            let bitacoraMacro = "";
            if (typeof window.AIBitacora !== 'undefined') {
                try {
                    const bitacora = await window.AIBitacora.loadBitacora();
                    if (bitacora.resumen_general && bitacora.resumen_general.length > 10) {
                        bitacoraMacro = `
                        *** MACRO-TRAMA GLOBAL (BITÁCORA) ***
                        Resumen General: ${bitacora.resumen_general}
                        Hitos Clave: ${(bitacora.puntos_singulares && bitacora.puntos_singulares.length > 0) ? bitacora.puntos_singulares.join(" | ") : 'Sin hitos destacados'}
                        `;
                    }
                } catch(e) { console.warn("No se pudo cargar la bitácora en 2º plano."); }
            }

            // 2. RECUPERACIÓN DE LORE RECIENTE
            let fullStoryContext = "Contexto no disponible.";
            if (typeof window.AIRouteAnalyzer !== 'undefined') {
                fullStoryContext = window.AIRouteAnalyzer.getFullStoryContext(nodeId);
            } else {
                fullStoryContext = parent.text || "Un lugar misterioso."; 
            }

            if (fullStoryContext.length < 15) {
                throw new Error("El nodo actual necesita texto narrativo para iniciar el análisis del Director.");
            }

            let recentContext = fullStoryContext;
            if (recentContext.length > 6000) {
                recentContext = "...(Historia anterior resumida en la Bitácora)...\n\n" + recentContext.substring(recentContext.length - 6000);
            }

            let tension = directorConfig.tension;
            let mystery = directorConfig.mystery;
            let action = directorConfig.action;

            // MODO AUTO: La IA deduce los sliders basándose en la trama silenciosamente
            if (directorConfig.autoMode) {
                const autoPromptSys = "Eres un Director de Juego. Analiza el transcurso de la historia hasta este punto y decide los niveles perfectos de Tensión, Misterio y Acción (de 0 a 100) para la siguiente bifurcación, para mantener una curva dramática perfecta. Devuelve ESTRICTAMENTE JSON PURO.";
                const autoPromptUsr = `
                    ${bitacoraMacro}
                    HISTORIA RECIENTE HASTA AHORA:
                    ${recentContext}

                    Genera los valores para la siguiente ramificación:
                    - tension: (0-100)
                    - mystery: (0-100)
                    - action: (0-100)
                    
                    FORMATO JSON:
                    { "tension": 80, "mystery": 20, "action": 90 }
                `;

                const autoVals = await window.Koreh.Text.generateWithRetry(autoPromptSys, autoPromptUsr, {
                    model: 'gemini-fast', jsonMode: true, temperature: 0.5
                }, (d) => d && typeof d.tension !== 'undefined');

                tension = autoVals.tension || 50;
                mystery = autoVals.mystery || 50;
                action = autoVals.action || 50;
            }

            // INSTRUCCIONES DE GRAVEDAD / DISTANCIA
            let gravityInstruction = "";
            if (directorConfig.targetPin) {
                let distConcept = "";
                if (directorConfig.distance === 'lejos') distConcept = "La meta está muy lejos. El jugador debe iniciar el viaje, planificar, u orientarse geográficamente hacia allí.";
                if (directorConfig.distance === 'media') distConcept = "La meta está a media distancia. El jugador se acerca, pero encuentra obstáculos físicos o narrativos en el camino relacionados con el destino.";
                if (directorConfig.distance === 'cerca') distConcept = "La meta es INMINENTE. El jugador está en el umbral, frente a la puerta o el evento a punto de desencadenarse.";
                
                gravityInstruction = `\n[META DE GRAVEDAD]: Tienes la obligación ineludible de guiar las opciones generadas hacia este destino: "${directorConfig.targetPin}".\n[DISTANCIA ACTUAL]: ${distConcept}\n`;
            }

            // DIRECTRIZ MANUAL DEL USUARIO
            let customGuidanceInstruction = "";
            if (directorConfig.customGuidance && directorConfig.customGuidance.trim() !== "") {
                customGuidanceInstruction = `\n[DIRECTRIZ MANUAL DEL DIRECTOR (PRIORIDAD MÁXIMA)]: Haz que las opciones y sucesos generados sigan esta intención o idea específica: "${directorConfig.customGuidance.trim()}"\n`;
            }

            const sysPrompt = `Eres un Director de Juego (Oráculo) de ficción interactiva altamente estricto. Vas a generar EXACTAMENTE ${branchesCount} rutas cortas. Devuelve ESTRICTAMENTE JSON PURO.`;
            const geoContext = typeof window.AISupport !== 'undefined' ? window.AISupport.getGeographicContext(nodeId) : "";
            const canonContext = typeof window.AISupport !== 'undefined' ? window.AISupport.getCanonInstruction() : "";

            const userPrompt = `
                ${bitacoraMacro}

                HISTORIA DETALLADA RECIENTE HASTA EL PUNTO ACTUAL:
                ${recentContext}
                ${geoContext}
                ${canonContext}

                *** CONSOLA DEL DIRECTOR DE JUEGO (OBLIGATORIO OBEDECER) *** ${gravityInstruction}
                ${customGuidanceInstruction}
                - Nivel de TENSIÓN / PELIGRO: ${tension} sobre 100. (A mayor valor, las opciones implican trampas, daño, o ataques. A 0, total calma).
                - Nivel de MISTERIO / LORE: ${mystery} sobre 100. (A mayor valor, las opciones se enfocan en descubrir secretos o examinar lo oculto).
                - Nivel de ACCIÓN CINÉTICA: ${action} sobre 100. (A mayor valor, opciones de salto, carrera o combate. A menor valor, diálogo o sigilo).
                
                Basándote en la Macro-Trama, lo Reciente y la Consola del Director, genera ${branchesCount} opciones divergentes coherentes para salir de esta situación y sus consecuencias inmediatas (1 o 2 frases).
                - "accion": Verbo en imperativo o 1ª persona ("Correr a la puerta").
                - "texto_destino": Consecuencia directa (lo que pasa justo al elegir).

                FORMATO JSON EXACTO ESPERADO:
                {
                    "rutas": [
                        { "accion": "Texto corto del botón", "texto_destino": "Consecuencia narrativa guiada por el Director..." }
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

            if (Core.scheduleSave) Core.scheduleSave();
            console.log(`[AIContext] El Director IA ha completado las rutas para el nodo ${nodeId}.`);

        } catch (error) {
            console.error("Fallo del Director IA:", error);
            alert("El Director falló al crear las rutas en 2º plano: " + error.message);
        } finally {
            this.generatingNodes.delete(nodeId);
            // Forzamos un repintado del canvas para quitar el spinner azul de procesamiento y mostrar las nuevas ramas
            if (typeof Canvas !== 'undefined') Canvas.render();
        }
    }
};