// saga.agents.js
// SAGA - ORQUESTADOR DE AGENTES MULTI-LLAMADA (RECURSIVO & PIPELINE)
window.Saga = window.Saga || {};
window.Saga.Agents = {
    async callGeminiRaw(systemInstruction, userPrompt, temp = 0.7) {
        const apiKey = window.Saga.Gemini.getApiKey();
        if (!apiKey) throw new Error("API Key de Gemini no configurada.");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
        const body = {
            contents: [
                { role: "user", parts: [{ text: `System Instructions: ${systemInstruction}` }] },
                { role: "model", parts: [{ text: "Entendido." }] },
                { role: "user", parts: [{ text: userPrompt }] }
            ],
            generationConfig: { temperature: temp, responseMimeType: "application/json" }
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`Error en agente Gemini: ${res.status}`);
        const data = await res.json();
        const rawText = data.candidates[0].content.parts[0].text;
        try {
            const sanitizedText = rawText.replace(/[\r\n]+/g, " ");
            return JSON.parse(sanitizedText);
        } catch (err) {
            console.warn("Fallo de parsing directo JSON en Gemini Raw. Ejecutando extracción de rescate...", err);
            
            const contentMatch = rawText.match(/\"(?:content|respuesta)\"\s*:\s*\"([\s\S]*?)\"\s*\}\s*$/);
            if (contentMatch && contentMatch[1]) {
                const extractedContent = contentMatch[1]
                    .replace(/\\"/g, '"')
                    .replace(/\\n/g, '\n');
                return { content: extractedContent };
            }
            
            const deepCleaned = rawText
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
                .trim();
            return JSON.parse(deepCleaned);
        }
    },
    async runDatabaseBuilderAgent(mode, premise, baseCategory, targetCount = 5, onProgress = null) {
        let existingNodes = window.Saga.Core.items.map(i => i.data);
        if (onProgress) onProgress("Fase 1: Diseñando estructura de ontología y categorías...");
        const planPrompt = `Premisa global: "${premise}". Modo: ${mode}. Nodos actuales: ${existingNodes.length}. Planifica una lista de ${targetCount} elementos conceptuales necesarios para estructurar o ampliar la base de datos. Devuelve un JSON array de objetos con: {"name": "...", "category": "...", "concept": "..."}`;
        
        const plan = await this.callGeminiRaw(
            "Eres un Arquitecto de Sistemática de Datos de Universos Ficticios.",
            planPrompt,
            0.5
        );
        const generatedResults = [];
        const planList = Array.isArray(plan) ? plan : [plan];
        
        for (let i = 0; i < planList.length; i++) {
            const itemPlan = planList[i];
            if (onProgress) onProgress(`Fase 2: Generando elemento ${i + 1}/${planList.length} [${itemPlan.name}]...`);
            
            const genPrompt = `Genera el elemento completo basado en la planificación:\nNombre: "${itemPlan.name}"\nCategoría: "${itemPlan.category}"\nConcepto base: "${itemPlan.concept}"\nContexto de mundo acumulado: ${JSON.stringify(existingNodes.slice(-5).map(n => n.name))}\nEstructura JSON requerida:\n{\n  "name": "${itemPlan.name}",\n  "type": "${itemPlan.category}",\n  "desc": "Descripción detallada",\n  "visualDesc": "Detailed image generation prompt completely in ENGLISH",\n  "tags": ["tag1", "tag2"]\n}`;
            
            const entity = await this.callGeminiRaw(
                "Eres un Generador de Entidades Únicas de Worldbuilding.",
                genPrompt,
                0.7
            );
            const cleanName = (entity.name || 'dato').trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${cleanName}_${Date.now()}_${i}.json`;
            await window.Saga.Core.saveNodeData(filename, entity);
            existingNodes.push(entity);
            generatedResults.push({ filename, data: entity });
        }
        await window.Saga.Core.scanFiles();
        return generatedResults;
    },
    async runLoreSynthesisAgent(allItems, existingLore = null, mode = 'zero', onProgress = null) {
        const loreParts = [
            { key: 'resumenGeneral', label: '1. Resumen General del Mundo' },
            { key: 'faccionesYPersonajes', label: '2. Facciones, Razas y Personajes Clave' },
            { key: 'tecnologiaYMagia', label: '3. Sistemas de Tecnología, Magia y Reglas' },
            { key: 'cronologia', label: '4. Línea Temporal y Eventos Históricos' },
            { key: 'conflictos', label: '5. Conflictos, Tramas y Dilemas Vigentes' },
            { key: 'geografiaYAsentamientos', label: '6. Geografía, Asentamientos y Biomas' },
            { key: 'misteriosYLeyendas', label: '7. Misterios, Rumores y Leyendas' },
            { key: 'glosarioYTerminologia', label: '8. Glosario, Terminología y Conceptos SILEN' }
        ];
        const summaryData = allItems.map(item => {
            const node = (window.Saga.Canvas.nodes || []).find(n => n.id === item.filename || n.title === item.name);
            let spatialMeta = null;
            if (node) {
                const region = window.Saga.Canvas.getNodeRegion(node);
                const calculatedDate = window.Saga.Canvas.worldXToDate(node.x);
                spatialMeta = {
                    x: Math.round(node.x),
                    y: Math.round(node.y),
                    region: region ? region.name : "Sin Zona",
                    fechaCronologica: window.Saga.Canvas.formatDateLabel(calculatedDate, 'day')
                };
            }
            return {
                name: item.name,
                type: item.type,
                desc: item.desc,
                tags: item.tags,
                ubicacionEspacialYTemporal: spatialMeta
            };
        });
        const resultLore = {
            resumenGeneral: "",
            faccionesYPersonajes: "",
            tecnologiaYMagia: "",
            cronologia: "",
            conflictos: "",
            geografiaYAsentamientos: "",
            misteriosYLeyendas: "",
            glosarioYTerminologia: "",
            ...(existingLore || {})
        };
        
        if (onProgress) onProgress("Fase Previa A: Extrayendo ontología y clasificando nodos del Canvas...");
        const sysInstructionA = "Eres un Analista Ontológico de Worldbuilding. Tu tarea es procesar una lista de nodos de datos y generar una estructuración jerárquica identificando patrones, entidades principales y conceptos clave. Devuelve un JSON objeto con las claves: {'ontologia': '...', 'mapaDeNodos': '...'}";
        const userPromptA = `Lista de datos del Canvas (${summaryData.length} nodos):\n${JSON.stringify(summaryData)}`;
        
        let ontologyContext = "";
        try {
            const resA = await this.callGeminiRaw(sysInstructionA, userPromptA, 0.3);
            ontologyContext = JSON.stringify(resA);
        } catch (err) {
            console.warn("Error en Llamada Previa A (Ontología):", err);
            ontologyContext = JSON.stringify(summaryData);
        }
        
        if (onProgress) onProgress("Fase Previa B: Diseñando Matriz de Coherencia y Directivas de Síntesis...");
        const sysInstructionB = "Eres el Gran Arquitecto de Coherencia Lore. Tu tarea es analizar la ontología de nodos y el Lore existente para generar un Plan Estratégico de Síntesis en 8 campos. Devuelve un JSON objeto con las claves: {'directivaGlobal': '...', 'asignacionesPorCampo': '...'}";
        const userPromptB = `Ontología del Canvas:\n${ontologyContext}\n\nEstado previo del Lore:\n${JSON.stringify(existingLore || {})}\n\nModo de operación: ${mode}`;
        
        let synthesisDirectives = "";
        try {
            const resB = await this.callGeminiRaw(sysInstructionB, userPromptB, 0.3);
            synthesisDirectives = JSON.stringify(resB);
        } catch (err) {
            console.warn("Error en Llamada Previa B (Directivas):", err);
            synthesisDirectives = "Procesar con máxima coherencia enciclopédica.";
        }
        
        for (const part of loreParts) {
            if (onProgress) onProgress(`Sintetizando sección: "${part.label}"...`);
            
            const modeInstruction = mode === 'zero' 
                ? "Construye esta sección totalmente desde cero utilizando únicamente los datos suministrados y las directivas globales."
                : mode === 'rebuild'
                ? "Reescribe y sintetiza toda esta sección desde el principio unificando todos los datos antiguos y nuevos."
                : "Complementa e integra la información nueva manteniendo y enriqueciendo lo existente sin borrar datos valiosos.";
            const systemInstruction = `Eres el Historiador Autónomo del Lore Global. Tu tarea es redactar enciclopédicamente la sección: "${part.label}". Instrucción de modo (${mode}): ${modeInstruction} Devuelve strictly un JSON objeto: {"content": "Texto enciclopédico estructurado de la sección en español"}`;
            const userPrompt = `Ontología y datos estructurados del Canvas:\n${ontologyContext}\n\nDirectiva de Síntesis Coherente:\n${synthesisDirectives}\n\nEstado previo de esta sección:\n${existingLore ? (existingLore[part.key] || 'Vacío') : 'Nulo'}`;
            try {
                const responseObj = await this.callGeminiRaw(systemInstruction, userPrompt, 0.4);
                resultLore[part.key] = responseObj.content || "";
            } catch (err) {
                console.error(`Error procesando la sección ${part.key}:`, err);
                resultLore[part.key] = existingLore ? (existingLore[part.key] || "") : "";
            }
        }
        return resultLore;
    }
};