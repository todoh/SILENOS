// --- cronologia/escaleta/sound_designer.js ---
// MOTOR DE DISEÑO SONORO: FOLEY Y DIÁLOGOS (PRESERVACIÓN DE IDIOMA HABLADO)

const SoundDesigner = {
    async generateAudioPrompt(take) {
        if (!ai.apiKey) throw new Error("Se requiere conexión a la IA para el diseño sonoro.");

        const mode = take.audio_mode || 'diegetic';
        const customPrompt = take.audio_custom_prompt || '';
        const visualAction = take.visual_prompt || '';

        // Construir contexto de coherencia de voz extrayéndolo de la Biblia Audiovisual
        let voiceSignature = "";
        if (take.audio_voice_lock) {
            const signature = CoherenceEngine.getAudioPromptFor(take.audio_voice_lock);
            if (signature) {
                voiceSignature = `VOICE SIGNATURE FOR '${take.audio_voice_lock}': ${signature}`;
            } else {
                const visSignature = CoherenceEngine.getDetailedPromptFor(take.audio_voice_lock);
                if (visSignature) {
                     voiceSignature = `VOICE SIGNATURE (Inferred from visual): ${visSignature}`;
                }
            }
        }

        let systemPrompt = "";
        let userPrompt = "";

        if (mode === 'diegetic') {
            systemPrompt = `ACTÚA COMO: Diseñador de Sonido Foley para Cine.
            OBJETIVO: Crear un prompt técnico para un modelo generador de audio o video a partir de la acción visual.
            REGLAS:
            1. SOLO EFECTOS DE SONIDO Y AMBIENTE ESPACIAL (Foley) redactados en INGLÉS.
            2. ESTÁ ESTRICTAMENTE PROHIBIDO incluir música (añade negaciones explíctas).
            3. Describe los sonidos físicos de la acción en INGLÉS.
            FORMATO DE SALIDA: Solo el texto del prompt en INGLÉS, sin comillas ni explicaciones.`;

            userPrompt = `ACCIÓN VISUAL (EN INGLÉS): "${visualAction}"\n\nGenera el prompt de audio técnico. DEBE terminar con la cláusula: ", no music, no background music, no cinematic score, diegetic sound only"`;
        } else {
            systemPrompt = `ACTÚA COMO: Director de Diálogos y Diseñador de Sonido Multilingüe.
            OBJETIVO: Crear un prompt en inglés técnico para el canal de sonido, pero con una restricción absoluta: SI EXISTE UN DIÁLOGO O HABLA TEXTUAL, DEBE ORDENARSE AL MODELO QUE SE PROTIERTA Y SE HABLE CLARAMENTE EN ESPAÑOL.
            REGLAS:
            1. Combina los efectos de sonido del entorno en inglés con las líneas de texto del usuario.
            2. Si hay un diálogo o narración adjunta, es MANDATORIO exigir explícitamente "clear spoken Spanish dialogue/voice" o "narrated in perfect Spanish".
            3. PROHIBIDA la música de fondo.
            4. Usa la 'VOICE SIGNATURE' provista para emular la huella acústica.
            FORMATO DE SALIDA: Solo el texto del prompt mezclado, sin comillas ni preámbulos.`;

            userPrompt = `ACCIÓN VISUAL: "${visualAction}"
            DIRECTRICES DEL USUARIO (EFECTOS/DIÁLOGO EN ESPAÑOL): "${customPrompt}"
            ${voiceSignature}
            
            Genera el prompt de mezcla de audio en inglés técnico. DEBE especificar taxativamente "clear Spanish dialogue" u "oral voice track spoken clearly in Spanish" para encapsular el texto hablado, terminando rigurosamente con: ", no music, no background music"`;
        }

        const response = await ai.callModel(systemPrompt, userPrompt, 0.4, 'claude-fast');
        return response.trim();
    }
};

window.SoundDesigner = SoundDesigner;