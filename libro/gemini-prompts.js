// gemini-prompts.js
const GeminiPrompts = {
    /**
     * Genera el prompt para la creación del prólogo.
     */
    obtenerPromptPrologo(idea, tono, estilo) {
        return `Teniendo en cuenta el universo "${idea}", el tono "${tono}" y el estilo "${estilo}", escribe la introducción del prólogo de la obra. Devuelve el texto limpio, sin JSON ni markdown.`;
    },

    /**
     * Genera el prompt para la consolidación de los bloques de cierre.
     */
    obtenerPromptCierres(idea, tono) {
        return `Basado en el universo "${idea}" bajo el tono "${tono}", genera los bloques de cierre. Devuelve un JSON estricto sin markdown: {"apendice": "Texto técnico...", "nota_final": "Agradecimientos..."}`;
    },

    /**
     * Devuelve las instrucciones de sistema estrictas para el escritor de capítulos.
     */
    obtenerSystemPromptEscritor() {
        return "Eres un redactor literario omnisciente, técnico, formal y sumamente descriptivo. Tu objetivo es la producción de prosa extensa, rica y de alto valor narrativo. Debes devolver estrictamente el texto del capítulo estructurado en párrafos fluidos y densos, separados exclusivamente por dos saltos de línea (\\n\\n). No utilices formatos estructurados como JSON, ni viñetas, ni bloques de código Markdown.";
    },

    /**
     * Genera el prompt detallado para la escritura de un capítulo específico enfocado en volumen masivo.
     */
    obtenerPromptCapitulo(numero, titulo, idea, tono, estilo, sinopsis, prologo) {
        return `Escribe el contenido íntegro, masivo y ultra detallado del Capítulo ${numero} titulado "${titulo}".
Contexto global de la obra: "${idea}".
Tono atmosférico: "${tono}".
Estilo de escritura: "${estilo}".
Guía u objetivo de lo que sucede en este capítulo específico: "${sinopsis || 'Desarrollo continuo del arco argumental central.'}".
Prólogo de referencia: "${prologo}".

REQUISITO CRÍTICO DE VOLUMEN: Debes expandir exhaustivamente el arco de este capítulo redactando de 8 a 14 párrafos literarios largos y descriptivos. Desarrolla minuciosamente cada interacción, entorno, subtexto y detalle mecánico o ambiental.

Formato de salida: Devuelve el texto plano, separando cada párrafo únicamente con un doble salto de línea (\\n\\n). No uses markdown ni introducciones explicativas.`;
    },

    /**
     * Construye la plantilla de instrucciones y el JSON de configuración para exportar a la IA externa.
     */
    construirPlantillaInstruccionesIA(libroData, idea) {
        const estructuraLimpia = JSON.parse(JSON.stringify(libroData));
        
        return {
            "instrucciones_de_uso": "Actúa como un redactor literario experto de alto nivel. Tu tarea fundamental es tomar la estructura provista en 'plantilla_estructura' y COMPLETARLA O EXPANDIRLA TOTALMENTE. Debes rellenar los campos 'prologo', 'apendice', 'nota_final' y el array de strings de 'texto' dentro de cada uno de los capítulos en 'partes.capitulos' convirtiendo cada párrafo extenso en un elemento del array. Cada capítulo debe contener entre 8 y 14 párrafos descriptivos complejos, basándote fielmente en la 'sinopsis', el 'concepto_central', el 'tono' y el 'estilo' indicados. Devuelve UN ÚNICO OBJETO JSON LIMPIO que siga exactamente la misma forma que la propiedad 'plantilla_estructura', sin texto explicativo complementario y sin bloques de código Markdown.",
            "meta_configuracion": {
                "titulo": estructuraLimpia.titulo,
                "autores": estructuraLimpia.autores,
                "concepto_central": idea,
                "tono": estructuraLimpia.tono,
                "estilo": estructuraLimpia.estilo,
                "disclaimer": estructuraLimpia.disclaimer
            },
            "plantilla_estructura": estructuraLimpia
        };
    }
};