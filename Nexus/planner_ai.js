/* NEXUS SILENOS/planner_ai.js */
import { callGoogleAPI, cleanAndParseJSON } from './ia_koreh.js';

/**
 * PLANNER AI V6.1 - FULL NARRATIVE ENGINE
 * - Genera Introducción/Prólogo real con IA.
 * - Integra el Lore como capítulo final dentro del JSON.
 */
export class PlannerAI {
    constructor(sagaData) {
        this.sagaData = sagaData;
    }

    /**
     * Punto de entrada principal.
     */
    async generateNarrative(plan, updateCallback) {
        // 1. Construir Contexto Rico
        const context = this._buildRichContext(plan);
        const style = plan.narrativeStyle || 'STANDARD';

        // Estructura Base del JSON de Salida
        const finalJson = {
            id: Date.now(),
            title: plan.title,
            isAI: true,
            scenes: [], 
            lore: []    
        };

        // --- FASE 0: VERIFICACIÓN DE ESTRUCTURA ---
        if (!plan.chapters || plan.chapters.length === 0) {
            updateCallback("Diseñando estructura de capítulos...");
            const structData = await this._generateStructureOnly(plan, context);
            plan.chapters = structData.chapters; 
        }

        // --- FASE 1: GENERACIÓN DE INTRODUCCIÓN (PLANTEAMIENTO) ---
        updateCallback("Escribiendo Planteamiento General...");
        const introScene = await this._generateIntroduction(plan, context, style);
        finalJson.scenes.push(introScene);

        // --- FASE 2: ESCRITURA DE CAPÍTULOS ---
        let accumulatedTextForLore = "";

        for (let i = 0; i < plan.chapters.length; i++) {
            const chapter = plan.chapters[i];
            const chapterNum = i + 1;
            
            updateCallback(`Escribiendo Cap ${chapterNum}/${plan.chapters.length}: "${chapter.title}"...`);
            
            let povName = "NARRADOR OMNISCIENTE";
            if (chapter.povId) {
                const c = this.sagaData.characters.find(x => x.id === chapter.povId);
                if (c) povName = c.name;
            }

            const sceneData = await this._generateChapterJSON(chapter, chapterNum, context, plan.title, style, povName);
            
            if (sceneData) {
                finalJson.scenes.push(sceneData);
                accumulatedTextForLore += `[CAP ${chapterNum}] ${sceneData.paragraphs.map(p => p.text).join(' ')}\n`;
            }
        }

        // --- FASE 3: DEDUCCIÓN DE LORE ---
        updateCallback("Analizando narrativa para extraer Lore...");
        const loreData = await this._generateLoreFromText(accumulatedTextForLore, context);
        finalJson.lore = loreData;

        // --- FASE 4: INTEGRAR LORE COMO CAPÍTULO FINAL ---
        if (loreData && loreData.length > 0) {
            updateCallback("Integrando Lore en el guion...");
            
            const loreParagraphs = loreData.map(item => ({
                text: `**${item.term.toUpperCase()}**: ${item.definition}`
            }));

            finalJson.scenes.push({
                title: "LORE (GLOSARIO)",
                paragraphs: loreParagraphs
            });
        }

        updateCallback("¡Guion Completado!");
        
        return { 
            type: 'TEXT', 
            content: JSON.stringify(finalJson, null, 2) 
        };
    }

    // --- NUEVO: GENERADOR DE INTRODUCCIÓN/PRÓLOGO ---
    async _generateIntroduction(plan, context, style) {
        // Resumen de los capítulos para que la IA sepa de qué va la obra
        const chaptersSummary = plan.chapters.map((c, i) => `Cap ${i+1}: ${c.title} (${c.desc})`).join('\n');

        const prompt = `
            Eres un ESCRITOR EXPERTO. Vas a escribir el PLANTEAMIENTO / PRÓLOGO de una obra.
            
            DATOS DE LA OBRA:
            - Título: ${plan.title}
            - Estilo Narrativo: ${style}
            - Resumen de la trama:
            ${chaptersSummary}

            CONTEXTO DEL MUNDO:
            ${context}

            TAREA:
            Escribe una introducción potente que establezca el tono, la atmósfera y el conflicto central sin entrar en los detalles específicos del capítulo 1 todavía. Sirve de gancho para el lector.

            FORMATO DE SALIDA (JSON ÚNICO):
            {
                "title": "INTRODUCCIÓN: EL PLANTEAMIENTO",
                "paragraphs": [
                    { "text": "Párrafo introductorio..." },
                    { "text": "Segundo párrafo estableciendo la atmósfera..." }
                ]
            }
        `;

        try {
            const res = await callGoogleAPI(prompt, "Escribiendo Intro...");
            return cleanAndParseJSON(res) || { title: "INTRODUCCIÓN", paragraphs: [{ text: "Error generando introducción." }] };
        } catch (e) {
            return { title: "INTRODUCCIÓN", paragraphs: [{ text: "No se pudo generar la introducción." }] };
        }
    }

    // --- GENERADOR DE ESTRUCTURA (SOLO SI NO HAY CAPÍTULOS) ---
    async _generateStructureOnly(plan, context) {
        const events = this._resolveEvents(plan.selectedEventIds);
        const chars = this.sagaData.characters.filter(c => plan.selectedCharIds.includes(c.id));

        const prompt = `
            Eres un ARQUITECTO NARRATIVO.
            Organiza los eventos disponibles en una lista de Capítulos coherente.
            
            EVENTOS: ${JSON.stringify(events.map(e => ({ title: e.title, time: Math.round(e.k) })))}
            PERSONAJES: ${JSON.stringify(chars.map(c => ({ name: c.name, role: c.role })))}
            CONTEXTO: ${context}

            Devuelve SOLO un JSON válido con esta estructura:
            {
                "chapters": [
                    { "title": "...", "desc": "...", "focus": "...", "povId": null, "linkedEventIds": [] }
                ]
            }
        `;

        try {
            const res = await callGoogleAPI(prompt, "Creando escaleta...");
            const json = cleanAndParseJSON(res);
            return { chapters: json.chapters || [] };
        } catch (e) {
            return { chapters: [] };
        }
    }

    // --- GENERADOR DE CAPÍTULO (FORMATO JSON SCENE) ---
    async _generateChapterJSON(chapter, num, context, workTitle, style, povName) {
        const linkedEvents = this._resolveEvents(chapter.linkedEventIds);
        
        const prompt = `
            Eres un ESCRITOR EXPERTO (MODO JSON).
            Escribe el CAPÍTULO ${num} de "${workTitle}".
            
            DATOS:
            - Título: ${chapter.title}
            - Sinopsis: ${chapter.desc}
            - POV: ${povName}
            - Estilo: ${style}
            - Foco: ${chapter.focus || 'Narrativa fluida'}
            
            EVENTOS A CUBRIR:
            ${linkedEvents.map(e => `- ${e.title}: ${e.desc}`).join('\n')}

            CONTEXTO GLOBAL:
            ${context}

            INSTRUCCIÓN IMPORTANTE:
            NO devuelvas texto plano. Devuelve un OBJETO JSON con la estructura exacta de una "Scene".
            Divide la narración en varios párrafos dentro del array "paragraphs".
            
            FORMATO DE SALIDA (JSON ÚNICO):
            {
                "title": "CAPÍTULO ${num}: ${chapter.title}",
                "paragraphs": [
                    { "text": "Primer párrafo de la narración..." },
                    { "text": "Segundo párrafo con diálogo..." },
                    { "text": "Tercer párrafo descriptivo..." }
                ]
            }
        `;

        try {
            const txt = await callGoogleAPI(prompt, `Escribiendo Cap ${num} (JSON)...`);
            const json = cleanAndParseJSON(txt);
            
            if (json && json.paragraphs) {
                return json;
            } else {
                throw new Error("Formato inválido");
            }
        } catch (e) {
            return {
                title: `CAPÍTULO ${num} (ERROR FORMATO)`,
                paragraphs: [{ text: `[Error generando JSON para este capítulo: ${e.message}]` }]
            };
        }
    }

    // --- GENERADOR DE LORE (EXTRACCIÓN) ---
    async _generateLoreFromText(narrativeText, context) {
        const prompt = `
            Eres un LOREMASTER (ARCHIVERO).
            Analiza el siguiente texto narrativo y extrae/deduce conceptos de Lore (lugares, facciones, magia, objetos) que se hayan mencionado o impliquen.

            TEXTO NARRATIVO RECIENTE:
            ${narrativeText.substring(0, 5000)}... (Extracto)

            CONTEXTO PREVIO:
            ${context}

            Genera una lista JSON de Lore.
            FORMATO:
            [
                { "term": "Nombre del Concepto", "definition": "Explicación breve." },
                { "term": "Nombre de Facción", "definition": "Explicación breve." }
            ]
        `;

        try {
            const res = await callGoogleAPI(prompt, "Generando Lore...");
            const json = cleanAndParseJSON(res);
            return Array.isArray(json) ? json : (json.lore || []);
        } catch (e) {
            return [{ term: "Error Lore", definition: "No se pudo extraer lore." }];
        }
    }

    // --- HELPERS ---

    _buildRichContext(plan) {
        let txt = "";
        const codex = this.sagaData.codex || {};
        if (codex.worldType) txt += `GÉNERO: ${codex.worldType}. TONO: ${codex.tone}\n`;
        if (codex.axioms) txt += `REGLAS: ${codex.axioms.join(', ')}\n`;
        
        if (plan.selectedCharIds.length > 0) {
            txt += "\nPERSONAJES CLAVE:\n";
            plan.selectedCharIds.forEach(id => {
                const c = this.sagaData.characters.find(x => x.id === id);
                if (c) txt += `- ${c.name} (${c.role}): Deseo=${c.goal}, Miedo=${c.fear}\n`;
            });
        }
        
        if (plan.selectedPlaceIds.length > 0) {
            txt += "\nESCENARIOS:\n";
            plan.selectedPlaceIds.forEach(id => {
                const p = this.sagaData.placeDb.find(x => x.id === id) || this.sagaData.places.find(x => x.id === id);
                if (p) txt += `- ${p.name} (${p.type}): ${p.desc}\n`;
            });
        }
        return txt;
    }

    _resolveEvents(eventIds) {
        if (!eventIds || eventIds.length === 0) return [];
        const resolved = [];
        this.sagaData.places.forEach(lane => {
            if (lane.events) {
                lane.events.forEach(evt => {
                    if (eventIds.includes(evt.id)) resolved.push(evt);
                });
            }
        });
        return resolved.sort((a,b) => a.k - b.k);
    }
}