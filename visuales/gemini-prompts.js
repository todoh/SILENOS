// gemini-prompts.js
const GeminiPrompts = {
    obtenerSystemPromptBBDD: function() {
        return "Eres un Analista de Contenido y Diseñador de Producción Visual de élite. Tu único objetivo es procesar las peticiones de extracción de datos artísticos y responder EXCLUSIVAMENTE con estructuras JSON válidas. No incluyas explicaciones, no uses bloques de código ```json o ``` de markdown. Devuelve directamente el texto del JSON parseable.";
    },

    obtenerPromptMacroCompleto: function(libroJSON) {
        return `A partir de la siguiente estructura narrativa de un librojuego en JSON, realiza un análisis integral para definir la propuesta macro de la obra.
        
        Debes determinar con precisión absoluta:
        1. "direccion_artistica": Tono fundamental, paleta cromática dominante implícita y visión estética global en un string profundo.
        2. "detalles_artisticos": Un objeto que contenga los matices emocionales ("matices"), tiempo/época cronológica ("tiempo"), lugar macro ("lugar_general") y atmósfera ("ambientacion").
        3. "enfoque_y_publico": Un objeto con el "publico_objetivo" óptimo y el "enfoque_artistico" o formato conceptual recomendado.

        Devuelve un único objeto JSON con esta estructura exacta:
        {
            "direccion_artistica": "...",
            "detalles_artisticos": { "matices": "...", "tiempo": "...", "lugar_general": "...", "ambientacion": "..." },
            "enfoque_y_publico": { "publico_objetivo": "...", "enfoque_artistico": "..." }
        }

        Libro:
        ${JSON.stringify(libroJSON)}`;
    },

    obtenerPromptPersonajes: function(libroJSON) {
        return `Escanea minuciosamente cada nodo del librojuego en busca de TODOS los personajes (principales y secundarios) que aparezcan, se mencionen o interactúen en el texto.
        
        Devuelve un objeto JSON con una única clave "personajes" que contenga un Array de Strings con los nombres identificados:
        {
            "personajes": ["Nombre 1", "Nombre 2"]
        }

        Libro:
        ${JSON.stringify(libroJSON)}`;
    },

    obtenerPromptRestoElementos: function(libroJSON) {
        return `Analiza minuciosamente cada nodo del librojuego e indexa de forma independiente las siguientes categorías de elementos:
        - "lugares": Lugares específicos, estancias, parajes o escenarios geográficos.
        - "objetos": Objetos clave, armas, reliquias o enseres tangibles de relevancia.
        - "fx": Efectos especiales, fenómenos atmosféricos recurrentes, magias, luces o detalles ambientales.
        - "vehiculos": Vehículos, monturas, carruajes o medios de transporte.
        - "edificios": Edificios, fortalezas, posadas, iglesias o estructuras arquitectónicas.

        Devuelve un único objeto JSON con esta estructura exacta (si no hay elementos en una categoría, devuelve su array vacío):
        {
            "lugares": [],
            "objetos": [],
            "fx": [],
            "vehiculos": [],
            "edificios": []
        }

        Libro:
        ${JSON.stringify(libroJSON)}`;
    },

    obtenerPromptDisenoVisual: function(listaNombres, tipoElemento, dirArtistica, detalles, publicoEnfoque) {
        let detalleInstruccion = "";
        if (tipoElemento === "personajes") {
            detalleInstruccion = "Para cada personaje de la lista, debes diseñar un perfil visual exhaustivo definiendo de forma INCONFUNDIBLE: 'rasgos_faciales', 'expresion_cara', 'constitucion_fisica', 'ropa_y_vestimenta', 'accesorios' y 'detalles_identificativos'.";
        } else {
            detalleInstruccion = "Para cada elemento de la lista, describe minuciosamente su diseño conceptual, texturas, iluminación, apariencia física y volumetría integrándolo en el universo visual propuesto.";
        }

        return `Actuando como Concept Artist y Diseñador Visual, toma la siguiente lista de nombres de ${tipoElemento}: ${JSON.stringify(listaNombres)}.
        
        Diseña visualmente cada uno basándote EXCLUSIVAMENTE en el contexto conceptual de la obra (sin el manuscrito original delante para enfocar los detalles visuales de producción):
        - Dirección Artística: "${dirArtistica}"
        - Detalles Artísticos: ${JSON.stringify(detalles)}
        - Enfoque y Público: ${JSON.stringify(publicoEnfoque)}

        ${detalleInstruccion}

        Devuelve un objeto JSON con la clave "${tipoElemento}_disenados" que contenga un diccionario indexado por el nombre del elemento, donde el valor sea un objeto con la descripción visual detallada.
        
        LISTA DE ELEMENTOS A DISEÑAR: ${JSON.stringify(listaNombres)}`;
    }
};