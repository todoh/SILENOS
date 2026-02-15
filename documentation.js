// documentation.js
// KOREH SUITE & SILENOS OS TECHNICAL BIBLE
// Versión: 4.0.2 (Ultimate Reference)
// Estado: Generado por Análisis de Código Fuente

const DOCS_DATA = [
    // =============================================================================
    // SECCIÓN 1: ARQUITECTURA DEL SISTEMA (SILENOS OS)
    // =============================================================================
    {
        id: "sys-01",
        category: "SILENOS CORE",
        title: "Filosofía del Sistema (Local-First)",
        content: `Silenos v4 rompe con el paradigma de las webapps tradicionales. 
        
        Principios Fundamentales:
        1. **Soberanía de Datos (LocalFS):** Utiliza la 'File System Access API' para montar carpetas reales del disco duro. No hay bases de datos en la nube; tu disco duro es la base de datos.
        2. **Sin Backend (Serverless):** Toda la lógica se ejecuta en el cliente. El único servicio externo es la inferencia de IA (Pollinations).
        3. **Interoperabilidad JSON:** Todas las aplicaciones se comunican mediante archivos JSON estandarizados. Un personaje de 'Datos Studio' es legible por 'Animation Studio' inmediatamente.`
    },
    {
        id: "sys-02",
        category: "SILENOS CORE",
        title: "Universe Engine (Visualización)",
        content: `Núcleo visual del sistema de archivos (fs-universe-*.js). Sustituye listas por nodos físicos en un espacio 2D.
        
        Técnicas:
        - **Renderizado:** Canvas HTML5.
        - **Física:** Sistema de fuerzas de repulsión entre nodos y atracción a posiciones de grid.
        - **Cámara:** Sistema de Pan/Zoom con conversión de coordenadas de mundo a pantalla.
        - **Input:** Selección múltiple (Caja de arrastre), arrastre de nodos y menús contextuales.`
    },
    {
        id: "sys-03",
        category: "SILENOS CORE",
        title: "HTML Processor (El 'Resolver')",
        content: `Cargador de aplicaciones (html-processor.js) que permite ejecutar archivos HTML locales complejos.
        
        Funcionamiento:
        1. **Intercepción:** Lee el archivo HTML seleccionado.
        2. **Escaneo:** Busca etiquetas script, link e img con rutas relativas.
        3. **Resolución Recursiva:** Navega por el FileSystemHandle para encontrar los archivos referenciados.
        4. **Inyección Blob:** Convierte recursos en Blob URLs y reescribe el HTML en memoria, permitiendo módulos ES6 locales.`
    },

    // =============================================================================
    // SECCIÓN 2: KOREH ANIMATION STUDIO
    // =============================================================================
    {
        id: "anim-01",
        category: "ANIMATION STUDIO",
        title: "Director IA & Budget Optimizer",
        content: `El módulo 'AIStudio' (ai.js) actúa como director.
        
        Algoritmo de Desglose:
        1. **Clasificación:** Determina tipo de plano (Interior/Exterior) y clima.
        2. **Budget Optimizer:** Fusiona conceptos para ahorrar generaciones (ej: "Hombre" + "Sombrero" -> "Hombre con sombrero").
        3. **Layout Auto:** Calcula matemáticamente la posición (X, Y) y escala de cada sprite en el canvas 1280x720.`
    },
    {
        id: "anim-02",
        category: "ANIMATION STUDIO",
        title: "Motor de Generación Paralela",
        content: `Para velocidad máxima, lanza peticiones asíncronas simultáneas (Promise.all) para el fondo y todos los sprites.
        
        Pipeline:
        - Hilo 1: Fondo (1344x768, sin transparencia).
        - Hilo 2...N: Sprites (1024x1024, sobre fondo verde #00FF00).
        - Post-Proceso: Los sprites pasan por 'Chroma Core' antes de colocarse en el canvas.`
    },

    // =============================================================================
    // SECCIÓN 3: KOREH DATOS STUDIO
    // =============================================================================
    {
        id: "data-01",
        category: "DATOS STUDIO",
        title: "Tecnología Chroma Core",
        content: `Algoritmo de procesamiento de imagen (chroma.core.js) para obtener transparencia.
        
        Pasos (Pixel-by-Pixel):
        1. **Despill:** Reduce el canal Verde si excede a Rojo/Azul para eliminar halos.
        2. **Soft Mask:** Calcula transparencia basada en el exceso de verde, creando bordes suaves para cabello o humo.
        3. **Auto-Crop:** Detecta la caja delimitadora (Bounding Box) de píxeles visibles y recorta la imagen automáticamente.`
    },
    {
        id: "data-02",
        category: "DATOS STUDIO",
        title: "Coherence Core",
        content: `Sistema de memoria global (coherence.core.js). Mantiene un archivo 'RESUMEN_GLOBAL.json'. Cada vez que generas una entidad, se actualiza este resumen para que las futuras generaciones tengan contexto de lo que ya existe.`
    },

    // =============================================================================
    // SECCIÓN 4: GENERADOR DE LIBROS (OmniGen)
    // =============================================================================
    {
        id: "book-01",
        category: "GENERADOR LIBROS",
        title: "Motor OmniGen v5.3",
        content: `Sistema de escritura iterativa (logic_gen.js) con ciclo de 3 agentes.
        
        Ciclo:
        1. **Arquitecto:** Analiza lo escrito y decide el modo (Acción/Diálogo/Descripción).
        2. **Escritor:** Redacta el texto siguiendo instrucciones de estilo humano.
        3. **Crítico:** Revisa repeticiones y fluidez.`
    },
    {
        id: "book-02",
        category: "GENERADOR LIBROS",
        title: "Anti-Loop & Memoria",
        content: `Implementa "Palabras Prohibidas Dinámicas". Analiza los últimos párrafos, extrae trigramas repetidos y los inyecta como restricción negativa en el siguiente prompt. Mantiene una memoria dual: Contexto Inmediato (2500 chars) y Resumen Global.`
    },

    // =============================================================================
    // SECCIÓN 5: CRONOLOGÍA
    // =============================================================================
    {
        id: "chrono-01",
        category: "CRONOLOGÍA",
        title: "Auditoría de Densidad (AI2)",
        content: `Módulo analítico (ai2.js) que lee la premisa de la historia.
        
        Algoritmo:
        1. Cuenta los "Beats Narrativos" (cambios de estado).
        2. Clasifica la historia (Micro, Corta, Novela).
        3. Calcula matemáticamente el número óptimo de capítulos y la densidad de escritura necesaria.`
    },
    {
        id: "chrono-02",
        category: "CRONOLOGÍA",
        title: "Timeline System",
        content: `Visualizador (crono.js) basado en Canvas. Permite zoom infinito y arrastrar eventos en el tiempo. Renderiza una regla temporal dinámica y gestiona colisiones de eventos.`
    },

    // =============================================================================
    // SECCIÓN 6: EXTRACTOR MAP-REDUCE
    // =============================================================================
    {
        id: "extr-01",
        category: "EXTRACTOR",
        title: "Algoritmo Map-Reduce V9",
        content: `Procesa libros enteros en el navegador.
        
        Fases:
        1. **Chunking:** Divide el texto en bloques de 15k caracteres con solapamiento.
        2. **Map:** Analiza cada bloque en paralelo extrayendo entidades.
        3. **Reduce:** Consolida listas, fusiona duplicados (ej: "Juan" = "Sr. Juan").
        4. **Generate:** Crea archivos JSON individuales para cada entidad.`
    },

    // =============================================================================
    // SECCIÓN 7: HERRAMIENTAS A/V & PROGRAMADOR
    // =============================================================================
    {
        id: "av-01",
        category: "A/V STUDIO",
        title: "Video & Música",
        content: `Integración multimedia.
        - **Video:** Usa Grok/Seedance. Soporta Text-to-Video e Image-to-Video.
        - **Música:** ElevenLabs Music. Genera tracks completos. Incluye visualizador de vinilo en React.`
    },
    {
        id: "prog-01",
        category: "PROGRAMADOR",
        title: "Lógica de Nodos",
        content: `Entorno No-Code (logic.js). Permite conectar nodos (Input, AI Text, AI Image, Folder). El motor de ejecución recorre el grafo desde la salida hacia atrás (Pull) para resolver dependencias.`
    },

    // =============================================================================
    // SECCIÓN 8: API & SEGURIDAD
    // =============================================================================
    {
        id: "api-01",
        category: "KOREH CORE",
        title: "Pollinations Cloud Integration",
        content: `Capa de abstracción (ai.core.js).
        - Endpoints compatibles con OpenAI.
        - Sistema de autenticación centralizado (Silenos Auth) compartido por todas las ventanas mediante window.parent.`
    }
];