// saga.generation.js
window.Saga = window.Saga || {};
window.Saga.Generation = {
    modes: {
        FREE: { name: "Libre", temp: 1.0, promptModifier: "Libertad absoluta en la interpretación de la premisa." },
        CREATIVE: { name: "Creativo", temp: 1.2, promptModifier: "Añade elementos disruptivos, giros inesperados y conceptos vanguardistas." },
        FAITHFUL: { name: "Fiel a la realidad", temp: 0.3, promptModifier: "Mantén coherencia física, técnica, histórica y lógica estricta." },
        CONTEXTUAL: { name: "Con Contexto Canvas", temp: 0.7, promptModifier: "Coherencia directa con los datos existentes en el canvas." },
        LORE: { name: "Con Lore Global", temp: 0.7, promptModifier: "Ajuste estricto al Lore global establecido para el mundo." }
    },

    async callGeminiRaw(systemInstruction, userPrompt, temp = 0.7, modelOverride = "gemini-3.5-flash-lite") {
        const apiKey = window.Saga.Gemini.getApiKey();
        if (!apiKey) throw new Error("API Key de Gemini no configurada.");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelOverride}:generateContent?key=${apiKey}`;
        const body = {
            contents: [
                { role: "user", parts: [{ text: `System Instructions: ${systemInstruction}` }] },
                { role: "model", parts: [{ text: "Entendido." }] },
                { role: "user", parts: [{ text: userPrompt }] }
            ],
            generationConfig: { temperature: temp, responseMimeType: "application/json" }
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error(`Error Gemini API (${modelOverride}): ${response.status} - ${await response.text()}`);
        const json = await response.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return JSON.parse(rawText);
    },

    async generateEntities(config, onProgress = null) {
        const { premise, category, count = 1, modeKey = 'LORE', useLore = true, useCanvasContext = true } = config;
        const mode = this.modes[modeKey] || this.modes.LORE;
        
        // --- 1. PREPARACIÓN DEL CONTEXTO PARA NARRATIVA / CONTENIDO ---
        let extendedContext = "";
        if (useCanvasContext && window.Saga.Core.items.length > 0) {
            const items = window.Saga.Core.items.map(i => {
                const node = (window.Saga.Canvas.nodes || []).find(n => n.id === i.filename);
                let pos = "";
                if (node) {
                    const r = window.Saga.Canvas.getNodeRegion(node);
                    pos = ` [Pos: X=${Math.round(node.x)}, Y=${Math.round(node.y)}, Zona: ${r ? r.name : 'Libre'}]`;
                }
                return `- ${i.data.name} (${i.data.type}): ${i.data.desc}${pos}`;
            }).join("\n");
            
            const regions = (window.Saga.Canvas.regions || []).map(r => 
                `- Zona/Región "${r.name}": X=[${Math.round(r.x)}..${Math.round(r.x+r.w)}], Y=[${Math.round(r.y)}..${Math.round(r.y+r.h)}]`
            ).join("\n");
            extendedContext += `\n[ESTRUCTURA ESPACIAL DEL CANVAS]:\nZonas Disponibles:\n${regions}\n\nNodos Existentes y Posiciones:\n${items}\n`;
        }

        if (useLore) {
            await window.Saga.Lore.loadLore();
            extendedContext += `\n${window.Saga.Lore.getLoreContext()}\n`;
        }

        // --- 2. CONSTRUCCIÓN DE TODO EL CANVAS REAL (SIEMPRE COMPLETO PARA UBICACIÓN DE TERCERA LLAMADA) ---
        const fullCanvasSnapshot = {
            regions: (window.Saga.Canvas.regions || []).map(r => ({
                id: r.id,
                name: r.name,
                x: Math.round(r.x),
                y: Math.round(r.y),
                w: Math.round(r.w),
                h: Math.round(r.h)
            })),
            nodes: (window.Saga.Core.items || []).map(i => {
                const node = (window.Saga.Canvas.nodes || []).find(n => n.id === i.filename);
                return {
                    id: i.filename,
                    name: i.data.name,
                    type: i.data.type,
                    tags: i.data.tags || [],
                    x: node ? Math.round(node.x) : 100,
                    y: node ? Math.round(node.y) : 100,
                    w: node ? Math.round(node.w) : 160,
                    h: node ? Math.round(node.h) : 160
                };
            })
        };

        // --- FASE 1: PLAN DE ACCIÓN CONCEPTUAL ---
        if (onProgress) onProgress("Fase 1/3: Diseñando Plan de Acción Estratégico...");
        const sysPlan = `Eres un Arquitecto de Worldbuilding y Director Narrativo. Tu objetivo es trazar un plan de acción para crear elementos enciclopédicos. Devuelve estrictamente un JSON Array con objetos: [{"itemIndex": 1, "targetConcept": "...", "actionPlan": "..."}]. Directiva: ${mode.promptModifier}`;
        const userPlan = `Premisa del usuario: "${premise}". Categoría: "${category}". Cantidad requerida: ${count}.${extendedContext}`;
        
        let planList = [];
        try {
            planList = await this.callGeminiRaw(sysPlan, userPlan, 0.5);
            if (!Array.isArray(planList)) planList = [planList];
        } catch (e) {
            console.warn("Fallo en Fase 1, recurriendo a plan por defecto", e);
            planList = Array.from({ length: count }, (_, i) => ({
                itemIndex: i + 1,
                targetConcept: `${category} ${i + 1}`,
                actionPlan: `Desarrollar un elemento para la premisa: ${premise}`
            }));
        }

        const finalEntities = [];

        for (let i = 0; i < planList.length; i++) {
            const itemPlan = planList[i];
            const itemNum = i + 1;

            // --- FASE 2: GENERACIÓN DE CONTENIDO DEL DATO (SIN RESPONSABILIDAD DE UBICACIÓN ESPACIAL) ---
            if (onProgress) onProgress(`Fase 2/3: Generando vertientes y redactando contenido del dato ${itemNum}/${planList.length}...`);
            const sysOptions = `Eres un Diseñador Creativo de Lore. Genera exactamente 4 opciones distintas de desarrollo para el concepto dado. Devuelve strictly un JSON con la estructura: {"options": [{ "id": 1, "title": "...", "context": "..." }, { "id": 2, "title": "...", "context": "..." }, { "id": 3, "title": "...", "context": "..." }, { "id": 4, "title": "...", "context": "..." }]}`;
            const userOptions = `Concepto objetivo: "${itemPlan.targetConcept}"\nPlan de Acción: "${itemPlan.actionPlan}"\nContexto:\n${extendedContext}`;
            
            let alternatives = null;
            try {
                alternatives = await this.callGeminiRaw(sysOptions, userOptions, 0.8);
            } catch (e) {
                console.warn(`Error generando opciones para item ${itemNum}`, e);
            }

            const sysFinal = `Eres un Historiador Enciclopédico de Worldbuilding. Elige la mejor alternativa de las 4 opciones y redacta la ficha técnica completa del elemento. Devuelve STRICTLY un JSON objeto con la estructura exacta:
{
  "chosenOptionId": 1,
  "name": "Nombre conciso en español",
  "type": "${category}",
  "desc": "Descripción enciclopédica detallada",
  "visualDesc": "Detailed image generation prompt completely in ENGLISH",
  "tags": ["etiqueta1", "etiqueta2"]
}`;
            const userFinal = `Plan: "${itemPlan.actionPlan}"\nOpciones: ${JSON.stringify(alternatives)}\nContexto:\n${extendedContext}`;
            
            let generatedData = null;
            try {
                generatedData = await this.callGeminiRaw(sysFinal, userFinal, mode.temp);
            } catch (e) {
                console.error(`Error en la síntesis del dato ${itemNum}:`, e);
                continue;
            }

            // --- FASE 3 (NUEVA LLAMADA DEDICADA): POSICIONAMIENTO EN CANVAS CON MODELO gemini-3.1-flash-lite ---
            if (onProgress) onProgress(`Fase 3/3: Calculando ubicación espacial en Canvas con gemini-3.1-flash-lite (${itemNum}/${planList.length})...`);
            
            const centerWorld = window.Saga.Canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            const defaultX = Math.round(centerWorld.x + (i * 180));
            const defaultY = Math.round(centerWorld.y);

            const sysPlacement = `Eres un Cartógrafo y Dispositor Espacial en un Canvas 2D. Tu ÚNICO trabajo es recibir los detalles de un nuevo elemento a colocar y el mapa completo de nodos y zonas existentes en el canvas, y determinar las mejores coordenadas X e Y para este nuevo dato de forma que no se solape de manera desordenada y quede cerca de nodos/zonas conceptualmente afinidad. Devuelve STRICTLY un JSON objeto con la estructura: {"x": número, "y": número}`;
            
            const userPlacement = `NUEVO DATO GENERADO PARA COLOCAR EN EL CANVAS:
- Nombre: "${generatedData.name}"
- Tipo: "${generatedData.type}"
- Etiquetas: ${JSON.stringify(generatedData.tags || [])}
- Descripción: "${(generatedData.desc || "").substring(0, 150)}"

ESTADO COMPLETO DEL CANVAS (ZONAS Y NODOS EXISTENTES):
${JSON.stringify(fullCanvasSnapshot)}

Coordenadas por defecto en caso de espacio despejado: X=${defaultX}, Y=${defaultY}.
Calcula y devuelve estrictamente las coordenadas X e Y exactas en JSON.`;

            let positionObj = { x: defaultX, y: defaultY };
            try {
                // LLAMADA NUEVA Y EXCLUSIVA A "gemini-3.1-flash-lite"
                positionObj = await this.callGeminiRaw(sysPlacement, userPlacement, 0.2, "gemini-3.1-flash-lite");
            } catch (posErr) {
                console.warn(`Error en tercera llamada de posicionamiento (lite) para el dato ${itemNum}, usando fallback:`, posErr);
            }

            const posX = (typeof positionObj.x === 'number' && !isNaN(positionObj.x)) ? positionObj.x : defaultX;
            const posY = (typeof positionObj.y === 'number' && !isNaN(positionObj.y)) ? positionObj.y : defaultY;

            // Guardamos la entidad generada junto con sus coordenadas asignadas por la 3ª llamada
            finalEntities.push({
                name: generatedData.name || itemPlan.targetConcept,
                type: generatedData.type || category,
                desc: generatedData.desc || "",
                visualDesc: generatedData.visualDesc || "",
                tags: Array.isArray(generatedData.tags) ? generatedData.tags : [],
                x: posX,
                y: posY
            });

            // Actualizamos la foto local del canvas para que si se generan varios elementos en bucle, el siguiente reconozca al anterior
            fullCanvasSnapshot.nodes.push({
                id: `temp_${i}`,
                name: generatedData.name,
                type: generatedData.type,
                tags: generatedData.tags || [],
                x: posX,
                y: posY,
                w: 160,
                h: 160
            });
        }

        return finalEntities;
    }
};