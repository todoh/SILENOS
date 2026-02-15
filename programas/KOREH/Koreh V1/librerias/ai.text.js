/**
 * AI TEXT - Módulo de Generación de Texto y JSON
 * Dependencia: ai.core.js
 * Espacio de nombres: window.Koreh.Text
 */

window.Koreh = window.Koreh || {};

window.Koreh.Text = {
    
    // Limpieza de bloques de código Markdown (usado en Cronología y Datos)
    cleanJSON(str) {
        if (!str) return "";
        // Eliminar bloques ```json ... ```
        let clean = str.replace(/```json/g, '').replace(/```/g, '');
        // Encontrar primer { o [ y último } o ]
        const firstOpen = clean.indexOf('{');
        const firstArr = clean.indexOf('[');
        const first = (firstOpen > -1 && firstArr > -1) ? Math.min(firstOpen, firstArr) : Math.max(firstOpen, firstArr);
        
        const lastClose = clean.lastIndexOf('}');
        const lastArr = clean.lastIndexOf(']');
        const last = Math.max(lastClose, lastArr);

        if (first !== -1 && last !== -1) {
            return clean.substring(first, last + 1);
        }
        return clean;
    },

    // Función principal de generación
    async generate(systemPrompt, userPrompt, config = {}) {
        const model = config.model || window.Koreh.Core.config.defaultTextModel;
        const temperature = config.temperature ?? 0.7; // Nullish coalescing para permitir 0
        const jsonMode = config.jsonMode || false; // Si es true, forzamos salida JSON y parseo

        const body = {
            model: model,
            temperature: temperature,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // Parámetros opcionales avanzados
            ...(config.seed && { seed: config.seed }),
            ...(config.max_tokens && { max_tokens: config.max_tokens }),
            ...(config.frequency_penalty && { frequency_penalty: config.frequency_penalty }),
            ...(config.presence_penalty && { presence_penalty: config.presence_penalty })
        };

        if (jsonMode) {
            // Refuerzo para modelos que necesitan instrucción explícita
            if (!body.messages[0].content.toLowerCase().includes("json")) {
                body.messages[0].content += " RESPOND ONLY IN STRICT JSON.";
            }
            body.response_format = { type: "json_object" };
        }

        const response = await window.Koreh.Core.fetchWrapper(
            window.Koreh.Core.config.textBaseUrl, 
            {
                method: 'POST',
                body: JSON.stringify(body)
            }
        );

        const data = await response.json();
        let content = data.choices[0].message.content;

        if (jsonMode) {
            try {
                // Usamos el limpiador interno antes de parsear
                const cleaned = this.cleanJSON(content);
                return JSON.parse(cleaned);
            } catch (e) {
                console.warn("Fallo al parsear JSON de IA, devolviendo texto crudo:", e);
                throw new Error("AI_JSON_PARSE_ERROR: La IA no devolvió un JSON válido.");
            }
        }

        return content;
    }
};