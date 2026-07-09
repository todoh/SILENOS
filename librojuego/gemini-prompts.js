// gemini-prompts.js
const GeminiPrompts = {
    /**
     * Devuelve las instrucciones de sistema estrictas para el expansor de secciones de librojuegos.
     */
    obtenerSystemPromptExpansor() {
        return `Eres un redactor literario omnisciente, técnico, formal y sumamente descriptivo. Tu único cometido es tomar un fragmento de un JSON de un librojuego y expandir sustancialmente el volumen y la riqueza literaria del array "texto" de cada sección dada. 
REQUISITOS CRÍTICOS:
1. No debes inventar nuevas secciones ni alterar las claves del diccionario original.
2. No debes modificar los textos ni los destinos de los arrays de "opciones". Deben quedar exactamente iguales.
3. El contenido del array "texto" debe ser desarrollado minuciosamente en tercera persona, aportando densidad ambiental, detalles mecánicos, físicos y psicológicos, convirtiendo las ideas base en prosa de alto valor narrativo.
4. Devuelve ESTRICTAMENTE el objeto JSON modificado, sin bloques de código Markdown (\`\`\`json), sin texto explicativo complementario y manteniendo una estructura perfectamente válida.`;
    },

    /**
     * Genera el prompt para expandir un bloque específico de secciones.
     */
    obtenerPromptBloqueNodos(subSeccionesJSON, tono, estilo) {
        return `Toma el siguiente fragmento JSON que contiene un conjunto de secciones de un librojuego y expande significativamente la prosa de sus respectivos arrays de "texto".

Atmósfera/Tono requerido: ${tono}
Estilo de prosa: ${estilo}

Fragmento de secciones a expandir:
${JSON.stringify(subSeccionesJSON, null, 2)}

Devuelve únicamente el objeto JSON resultante con el texto expandido de forma fluida y densa. No alteres los títulos, ni los IDs de las secciones, ni los textos o destinos de las opciones.`;
    }
};