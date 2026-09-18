// gemini-prompts.js
const GeminiPrompts = {
    obtenerSystemPromptBBDD: function() {
        return "Eres un Analista de Contenido y Diseñador de Producción Visual de élite. Tu objetivo es procesar solicitudes de extracción y diseño de datos artísticos. Debes ceñirte ESTRICTAMENTE a las instrucciones visuales manuales del usuario y a la evidencia textual del manuscrito, SIN inventar, modificar o extrapolar datos que contradigan o ignoren las especificaciones proporcionadas. Responde EXCLUSIVAMENTE con estructuras JSON válidas. No incluyas explicaciones ni bloques de código markdown (```json o ```). Devuelve directamente el texto del JSON parseable.";
    },

    obtenerPromptMacroCompleto: function(libroJSON, datosVisualesManuales) {
        return `A partir de la siguiente estructura narrativa de un librojuego en JSON y de las especificaciones visuales manuales del usuario, realiza un análisis integral para definir la propuesta macro de la obra.

        ESPECIFICACIONES Y DATOS VISUALES MANUALES DEL USUARIO (PRIORIDAD MÁXIMA):
        "${datosVisualesManuales || 'Sin especificaciones manuales previas.'}"

        Debes determinar con precisión absoluta:
        1. "direccion_artistica": Tono fundamental, paleta cromática dominante implícita y visión estética global en un string profundo, integrando obligatoriamente las especificaciones manuales del usuario.
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

    obtenerPromptExtraccionCategoria: function(libroJSON, categoria, datosVisualesManuales) {
        return `Analiza minuciosamente cada nodo del librojuego en busca de TODOS los elementos pertenecientes a la categoría de "${categoria.toUpperCase()}".
        
        Además de identificar los nombres de los elementos, extrae minuciosamente cualquier descripción visual o rasgo estético mencionado explícitamente en el texto para cada uno.

        DATOS VISUALES MANUALES PROPORCIONADOS POR EL USUARIO:
        "${datosVisualesManuales || 'Sin datos manuales.'}"

        Devuelve un objeto JSON con una única clave "${categoria}" que contenga una lista de objetos con el nombre del elemento y su evidencia o descripción visual literal extraída:
        {
            "${categoria}": [
                {
                    "nombre": "Nombre del elemento",
                    "evidencia_visual": "Cita o descripción visual extraída del texto o especificaciones del usuario"
                }
            ]
        }

        Libro:
        ${JSON.stringify(libroJSON)}`;
    },

    obtenerPromptDisenoVisual: function(listaElementos, evidenciasExtraidas, tipoElemento, dirArtistica, detalles, publicoEnfoque, datosVisualesManuales) {
        let detalleInstruccion = "";
        if (tipoElemento === "personajes") {
            detalleInstruccion = "Para cada personaje de la lista, diseña un perfil visual exhaustivo definiendo de forma INCONFUNDIBLE: 'rasgos_faciales', 'expresion_cara', 'constitucion_fisica', 'ropa_y_vestimenta', 'accesorios' y 'detalles_identificativos'. APLICA FIELMENTE la evidencia visual extraída y las especificaciones manuales sin inventar rasgos contrapuestos.";
        } else {
            detalleInstruccion = "Para cada elemento de la lista, describe minuciosamente su diseño conceptual, texturas, iluminación, apariencia física y volumetría. APLICA FIELMENTE la evidencia visual extraída y las especificaciones manuales del usuario.";
        }

        return `Actuando como Concept Artist y Diseñador Visual de Producción, toma la siguiente lista de ${tipoElemento}: ${JSON.stringify(listaElementos)}.

        EVIDENCIA VISUAL EXTRAÍDA DEL TEXTO:
        ${JSON.stringify(evidenciasExtraidas)}

        ESPECIFICACIONES Y DATOS VISUALES MANUALES DEL USUARIO (OBLIGATORIAS):
        "${datosVisualesManuales || 'Sin especificaciones manuales.'}"

        CONTEXTO GLOBAL DE LA OBRA:
        - Dirección Artística: "${dirArtistica}"
        - Detalles Artísticos: ${JSON.stringify(detalles)}
        - Enfoque y Público: ${JSON.stringify(publicoEnfoque)}

        ${detalleInstruccion}

        Devuelve un objeto JSON con la clave "${tipoElemento}_disenados" que contenga un diccionario indexado por el nombre del elemento, donde el valor sea un objeto con la descripción visual detallada.
        
        LISTA DE ELEMENTOS A DISEÑAR: ${JSON.stringify(listaElementos)}`;
    }
};