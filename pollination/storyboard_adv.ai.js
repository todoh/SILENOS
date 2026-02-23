// --- storyboard_adv.ai.js ---
// MOTOR DE LÓGICA ESTRUCTURAL TEXTUAL (GEMINI-FAST) PARA SILENOS

const SbAdvAI = {
    
    cleanJSON(str) {
        let clean = str.replace(/```json/g, '').replace(/```/g, '');
        const first = Math.min(
            clean.indexOf('{') > -1 ? clean.indexOf('{') : Infinity,
            clean.indexOf('[') > -1 ? clean.indexOf('[') : Infinity
        );
        const last = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
        if (first !== Infinity && last !== -1) {
            return clean.substring(first, last + 1);
        }
        return clean;
    },

    async callGeminiFast(system, user) {
        const key = localStorage.getItem('pollinations_api_key') || "";
        if (!key) throw new Error("Falta la API Key de Pollinations.");

        const response = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${key}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                model: 'gemini-fast', 
                temperature: 0.6,
                messages: [
                    { role: 'system', content: system }, 
                    { role: 'user', content: user }
                ]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    },

    async extractVisualBible(prompt, style, genre) {
        // 1. Identificar elementos y crear la DIRECCIÓN DE ARTE GLOBAL (Coherencia Cromática)
        const sysIdentify = `Eres un Director de Arte y Colorista Cinematográfico experto en continuidad visual.
        TU TAREA: 
        1. Definir una Dirección de Arte Global unificada para toda la historia (Color grading, iluminación, lente, atmósfera).
        2. Extraer una lista de todos los elementos visuales clave (Personajes, Lugares, Objetos, Vehículos).
        
        FORMATO JSON REQUERIDO:
        {
            "global_art_direction": "Descripción EN INGLÉS de la paleta de colores cohesiva, iluminación y tono (Ej: 'Teal and orange color grading, unified moody cinematic lighting, 35mm lens, cohesive cold chromatic palette, global cinematic look')",
            "elements": [
                { "name": "NombreOriginal", "type": "Character|Location|Object|Vehicle" }
            ]
        }`;

        const usrIdentify = `HISTORIA: "${prompt}"\nESTILO: "${style}"\nGÉNERO: "${genre}"\nGenera la Dirección de Arte Global y extrae los elementos en JSON.`;
        const identifyResult = await this.callGeminiFast(sysIdentify, usrIdentify);
        const parsedData = JSON.parse(this.cleanJSON(identifyResult));
        
        const globalArt = parsedData.global_art_direction || "cinematic lighting, cohesive color palette, masterpiece";
        const elements = parsedData.elements || [];

        console.log("Dirección de Arte Global:", globalArt);
        console.log("Elementos identificados:", elements);

        // 2. Generar en paralelo los detalles RÍGIDOS de CADA elemento
        const biblePromises = elements.map(async (el) => {
            let focusInstructions = "";
            if (el.type === 'Character' || el.type === 'Personaje') {
                focusInstructions = "cara exacta, color y corte de pelo. REGLA ESTRICTA: Debes incluir obligatoriamente 'bareheaded, no helmet, no hat' a menos que la historia exija lo contrario. Define la ROPA EXACTA de forma rígida para que nunca cambie de ropa. Evita ambigüedades.";
            } else {
                focusInstructions = "arquitectura, materiales, colores predominantes y texturas concretas, para que el objeto/lugar sea idéntico en cada plano.";
            }

            const sysDetail = `Eres un Concept Artist hiper-riguroso.
            TU TAREA: Crear una "visual_signature" CONCRETA y CERRADA en INGLÉS para el siguiente elemento.
            TIPO DE ELEMENTO: ${el.type}
            INSTRUCCIONES CLAVE: ${focusInstructions}
            ESTILO VISUAL OBJETIVO: ${style}
            
            FORMATO JSON REQUERIDO:
            {
                "visual_signature": "detailed physical description in english..."
            }`;

            const usrDetail = `NOMBRE DEL ELEMENTO: "${el.name}"\nCONTEXTO: "${prompt}"\nGenera la firma visual estricta.`;
            
            try {
                const detailResult = await this.callGeminiFast(sysDetail, usrDetail);
                const detailData = JSON.parse(this.cleanJSON(detailResult));
                return { name: el.name, visual_signature: detailData.visual_signature };
            } catch (e) {
                console.error(`Error generando detalles para ${el.name}`, e);
                return { name: el.name, visual_signature: `${el.name}, highly detailed` }; 
            }
        });

        const bible = await Promise.all(biblePromises);
        
        return { bible, globalArt };
    },

    async generateScenes(prompt, style, genre, count, bible, globalArt) {
        const bibleString = bible.map(b => `- "${b.name}": ${b.visual_signature}`).join('\n');

        // 1. Planificar las escenas
        const sysPlan = `Eres un Guionista Cinematográfico.
        TU TAREA: Divide la historia en EXACTAMENTE ${count} secuencias visuales.
        
        FORMATO JSON REQUERIDO:
        {
            "beats": [
                "Descripción narrativa de la escena 1",
                "Descripción narrativa de la escena 2"...
            ]
        }`;
        const usrPlan = `HISTORIA: "${prompt}"\nGenera exactamente ${count} beats en JSON.`;
        
        const planResult = await this.callGeminiFast(sysPlan, usrPlan);
        const beats = JSON.parse(this.cleanJSON(planResult)).beats || [];

        // 2. Generar y SUPERVISAR el prompt visual en PARALELO
        const scenePromises = beats.map(async (beat, index) => {
            
            // --- PASO A: BORRADOR (DRAFT) ---
            const sysDraft = `Eres un Artista de Storyboard Cinematográfico.
            TU TAREA: Traducir la escena en un prompt visual base.
            
            DIRECCIÓN DE ARTE GLOBAL: "${globalArt}"
            BIBLIA VISUAL (SUSTITUYE nombres propios por estas descripciones):
            ${bibleString}

            REGLAS PARA EL JSON:
            1. 'visual_prompt': En INGLÉS. Empieza estableciendo la Dirección de Arte Global, luego describe la acción usando la Biblia Visual. PROHIBIDO usar nombres propios.
            2. 'narrative_desc': En ESPAÑOL. Frase inmersiva sobre este momento (aquí sí usa nombres).

            FORMATO JSON REQUERIDO:
            {
                "visual_prompt": "...",
                "narrative_desc": "..."
            }`;

            const usrDraft = `ACCIÓN DE LA ESCENA ${index + 1}: "${beat}"\nGenera el JSON base.`;
            
            try {
                const draftResult = await this.callGeminiFast(sysDraft, usrDraft);
                const draftedScene = JSON.parse(this.cleanJSON(draftResult));

                // --- PASO B: SUPERVISIÓN Y CORRECCIÓN (ANTI-CLONES) ---
                const sysSupervise = `Eres un Supervisor de Continuidad de IA (Anti-Hallucination Agent).
                TU TAREA: Revisar el borrador del prompt visual y reescribirlo para evitar errores del modelo generativo.
                
                REGLA CRÍTICA (ANTI-DUPLICACIÓN): 
                Si la escena trata principalmente de UN SOLO personaje, DEBES inyectar al principio del prompt términos absolutos como: "A SINGLE PERSON, ONE SUBJECT ONLY, SOLO". Los modelos de IA tienden a clonar personajes si el prompt es muy largo; tu trabajo es forzar matemáticamente que solo haya uno si así lo pide la historia.
                
                REGLA DE COHERENCIA: Asegura que el prompt mantenga las directrices de la Biblia Visual intactas. Añade al final del prompt: "${style}, ${genre}, masterpiece, 8k resolution".
                
                FORMATO JSON REQUERIDO:
                {
                    "visual_prompt": "Prompt visual corregido, blindado y blindado contra duplicaciones (EN INGLÉS)",
                    "narrative_desc": "Misma narrativa original (EN ESPAÑOL)"
                }`;

                const usrSupervise = `ACCIÓN ORIGINAL REQUERIDA: "${beat}"
                PROMPT BORRADOR A CORREGIR: "${draftedScene.visual_prompt}"
                NARRATIVA: "${draftedScene.narrative_desc}"
                
                Devuelve el JSON final aplicando las medidas anti-duplicación si corresponde.`;

                const supervisedResult = await this.callGeminiFast(sysSupervise, usrSupervise);
                const finalScene = JSON.parse(this.cleanJSON(supervisedResult));

                console.log(`Escena ${index + 1} Supervisada:`, finalScene);
                return finalScene;

            } catch(e) {
                console.error(`Error en escena ${index + 1} durante generación o supervisión`, e);
                return { 
                    visual_prompt: `A SINGLE SUBJECT, ${globalArt}, cinematic shot, ${style}, masterpiece`, 
                    narrative_desc: beat 
                };
            }
        });

        return await Promise.all(scenePromises);
    }
};