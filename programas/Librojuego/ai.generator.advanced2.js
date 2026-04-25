// Archivo: Librojuego/ai.generator.advanced2.js

window.AIAdvancedCalls = {
    
    // FASE 1: Diseño del Sistema RPG y Lore
    async designRPGSystem(premise, idealEnd, style) {
        const sysPrompt = "Eres un Game Designer experto en librojuegos de papel. A partir de la premisa, diseña las mecánicas clave del juego. Devuelve ESTRICTAMENTE JSON PURO.";
        const userPrompt = `
            Premisa: ${premise}
            Final: ${idealEnd}
            Estilo: ${style}
            
            Crea la configuración mecánica de la aventura.
            - title: Título comercial del juego
            - currency: Nombre temático de la moneda (ej. "Oro", "Esquirlas de Luz")
            - key_item: Objeto crucial para desbloquear la puerta del Acto 3 (ej. "Sello Real")
            - minion_name: Enemigo básico recurrente
            - elite_name: Enemigo fuerte (Sub-jefe)
            - boss_name: Nombre del jefe final absoluto
            - boss_stats: Objeto con estadísticas. REGLA: Vida MAX 25, Ataque 5, Defensa 3.
            - lore: Breve trasfondo del mundo (1 párrafo).
            
            FORMATO JSON EXACTO ESPERADO:
            {
                "title": "...",
                "currency": "...",
                "key_item": "...",
                "minion_name": "...",
                "elite_name": "...",
                "boss_name": "...",
                "boss_stats": { "vida": 22, "ataque": 5, "defensa": 3, "agilidad": 4, "destreza": 4 },
                "lore": "..."
            }
        `;
        
        return await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, { 
            model: 'gemini-fast', 
            jsonMode: true, 
            temperature: 0.7 
        }, d => d && d.boss_stats);
    },

    // FASE 3: Generación de Botones (Acciones Ciegas)
    async generateButtonActions(destinationsSummary, numChoices) {
        const sysPrompt = "Eres un Dungeon Master. Define las acciones (textos de los botones) que el jugador puede elegir para avanzar. REGLA DE ORO: Las opciones DEBEN SER CIEGAS Y MISTERIOSAS (ej: 'Cruzar el puente de madera', 'Investigar el pasillo oscuro', 'Forzar la puerta'). ESTÁ TERMINANTEMENTE PROHIBIDO hacer spoilers de la trama, botines, curaciones o enemigos. Devuelve JSON PURO: { \"acciones\": [\"accion1\", \"accion2\"] }";
        const userPrompt = `Inventa ${numChoices} opciones distintas y atmosféricas para avanzar hacia estos destinos:\n${destinationsSummary}\nRecuerda: 1 a 4 palabras, sin spoilers.`;
        
        return await window.Koreh.Text.generateWithRetry(sysPrompt, userPrompt, { 
            model: 'nova-fast', 
            jsonMode: true, 
            temperature: 0.8 
        }, d => d && Array.isArray(d.acciones));
    },

    // FASE 4: Redacción Literaria Densa
    async writeNodeLiterature(nodeSummary, act, nodeType, nodeEffs, rpgData) {
        const sysPromptLit = "Eres un escritor de Librojuegos de Fantasía de élite. Escribe en segunda persona ('Tú haces...'). RESPONDE SÓLO CON LITERATURA PLANA (2 a 4 párrafos inmersivos y muy descriptivos). NO DEVUELVAS JSON NI TÍTULOS.";
        
        let extra = `ACTO ${act} de la aventura. Manten un tono de viaje épico y misterioso.`;
        
        if (nodeType === 'shop') extra += ` INSTRUCCIÓN CRÍTICA: Narra tu encuentro con un personaje MERCADER amigable. Al final de tu texto, ofrécele comprar una poción de curación.`;
        else if (nodeType === 'combat') extra += ` INSTRUCCIÓN CRÍTICA: Describe cómo el jugador es emboscado por un enemigo agresivo. Deja la acción en suspenso lista para pelear a muerte.`;
        else if (nodeType === 'reward_key') extra += ` INSTRUCCIÓN CRÍTICA: Describe épicamente el hallazgo de la llave vital: ${rpgData.key_item}.`;
        else if (nodeType === 'lock') extra += ` INSTRUCCIÓN CRÍTICA: Te encuentras frente a un obstáculo infranqueable y majestuoso. Describe la enorme puerta o guardián que exige entregar la llave ${rpgData.key_item} para pasar.`;
        else if (nodeType === 'reward_currency') extra += ` INSTRUCCIÓN CRÍTICA: Encuentras un cofre o alijo brillante repleto de ${rpgData.currency}.`;
        else if (nodeType === 'trap') extra += ` INSTRUCCIÓN CRÍTICA: Describe cómo el jugador tropieza y cae víctima de una pequeña trampa o un terreno traicionero que le quita el aliento.`;

        const usrPromptLit = `Lore del mundo: ${rpgData.lore}\n\nLo que debes narrar en esta página: "${nodeSummary}".\n\n${extra}\n\nEscribe la prosa atmosférica ahora:`;
        
        return await window.Koreh.Text.generateWithRetry(sysPromptLit, usrPromptLit, { 
            model: 'nova-fast', 
            jsonMode: false, 
            temperature: 0.75 
        }, d => d.length > 20);
    }
};