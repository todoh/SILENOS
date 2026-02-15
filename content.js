// content.js
// Base de datos Maestra de Contenido para Silenos v4 & Koreh Suite
// Última actualización: Sincronizada con Build 2026.02

const APP_DATA = {
    hero: {
        version: "SISTEMA OPERATIVO WEB v4.0",
        build: "2026.02.15",
        title_lines: [
            "INTELIGENCIA",
            "ESTRUCTURADA.", 
            "CREATIVIDAD",
            "LÍQUIDA."       
        ],
        description: "Silenos es un entorno de escritorio web minimalista (OS) que opera sobre el sistema de archivos local (LocalFS). Integra <strong>KOREH</strong>, una orquestación de herramientas generativas diseñadas para el flujo de trabajo creativo completo: desde la concepción de datos hasta la producción audiovisual.",
        buttons: [
            { text: "EJECUTAR SILENOS", icon: "fa-power-off", link: "index.html", style: "solid" },
            { text: "LEER DOCUMENTACIÓN", icon: "fa-book", link: "#docs", style: "transparent" }
        ]
    },
    
    // Módulos de la Suite Koreh (Información extraída de los códigos fuente individuales)
    koreh_modules: [
        {
            id: "01",
            title: "Animation Studio",
            version: "v2.0 Strict Mode",
            icon: "fa-film",
            desc: "Plataforma de producción de escenas. Convierte guiones textuales en composiciones visuales completas. Orquesta la generación paralela de fondos y sprites, calculando automáticamente la perspectiva y el layout.",
            tags: ["Director IA", "Auto-Layout", "Paralelismo"],
            bg_icon: "black",
            technical_specs: "Modelos: Flux/Klein. Salida: Canvas 1280x720. Features: Clasificación de escenas, Desglose de assets (Budget Optimizer)."
        },
        {
            id: "02",
            title: "Generador Libros",
            version: "OmniGen v5.3",
            icon: "fa-feather-pointed",
            desc: "Motor narrativo de largo formato. Utiliza una arquitectura de 'Memoria Larga' (3000 tokens) y un sistema de tres agentes (Arquitecto, Escritor, Crítico) para escribir novelas coherentes sin bucles repetitivos.",
            tags: ["Anti-Loop Estricto", "Prosa Humana", "Estructura JSON"],
            bg_icon: "black",
            technical_specs: "Ciclo: Planificación -> Escritura -> Edición -> Memorización. Detección automática de Lore y continuidad."
        },
        {
            id: "03",
            title: "Datos Studio",
            version: "v3.3 Chroma Edition",
            icon: "fa-database",
            desc: "Fábrica de Worldbuilding. Generación masiva de entidades (NPCs, Lugares, Objetos). Integra 'Chroma Core' para procesar imágenes generadas, eliminar fondos verdes (Despill) y crear assets transparentes listos para usar.",
            tags: ["Chroma Core", "Batch Gen", "Coherencia Global"],
            bg_icon: "black",
            technical_specs: "Modos: Ficción, Realidad, Búsqueda (Perplexity). Algoritmo de recorte 'Bounding Box' y 'Soft Mask Alpha'."
        },
        {
            id: "04",
            title: "Cronología",
            version: "v6.NOVEL",
            icon: "fa-timeline",
            desc: "Arquitecto temporal y estructural. Permite visualizar la trama en una línea de tiempo infinita. Incluye un 'Auditor de Densidad' que analiza la premisa y calcula matemáticamente el número óptimo de capítulos necesarios.",
            tags: ["Auditoría Densidad", "Drag & Drop", "Beats Narrativos"],
            bg_icon: "white",
            technical_specs: "Zoom dinámico (5px a 500px por unidad). Integración directa con Datos Studio para importar entidades."
        },
        {
            id: "05",
            title: "Extractor Map-Reduce",
            version: "v8.0",
            icon: "fa-layer-group",
            desc: "Herramienta de análisis forense de textos. Procesa libros enteros mediante algoritmos Map-Reduce: divide el texto en 'chunks', extrae entidades en paralelo y luego consolida y normaliza los resultados en una base de datos JSON.",
            tags: ["Deep Scan", "Map-Reduce", "JSON Estricto"],
            bg_icon: "white",
            technical_specs: "Fases: Map (Escaneo), Reduce (Consolidación), Generate (Creación de Fichas). Capacidad: Textos de +200k palabras."
        },
        {
            id: "06",
            title: "A/V Studio",
            version: "v1.0 (Video) / ElevenMusic",
            icon: "fa-play",
            desc: "Suite multimedia compuesta por Video Studio (Grok/Seedance) y Music Generator (ElevenLabs). Permite la creación de clips de vídeo a partir de texto/imagen y bandas sonoras completas.",
            tags: ["Text-to-Video", "Audio Gen", "Multi-Model"],
            bg_icon: "white",
            technical_specs: "Video: Soporte para Grok, Seedance, Veo. Música: Integración ElevenLabs con selectores de voz obligatorios para API."
        },
        {
            id: "07",
            title: "Programador Visual",
            version: "v1.2",
            icon: "fa-diagram-project",
            desc: "Editor de lógica basado en nodos. Permite crear flujos de trabajo personalizados conectando módulos de IA (Texto, Imagen) con entradas y salidas del sistema de archivos visualmente.",
            tags: ["Visual Scripting", "Nodos IA", "Flujos Custom"],
            bg_icon: "white",
            technical_specs: "Motor de grafos SVG. Nodos: Input, AI-Text, AI-Image, File Output. Ejecución asíncrona de cadenas lógicas."
        }
    ],

    // Pipeline recomendado de uso
    pipeline_steps: [
        {
            title: "Génesis",
            subtitle: "DATOS STUDIO",
            icon: "fa-database",
            desc: "Creación masiva de la base de conocimiento (Lore). Generación de entidades y assets visuales recortados (PNG).",
            theme: "black" 
        },
        {
            title: "Estructura",
            subtitle: "CRONOLOGÍA",
            icon: "fa-timeline",
            desc: "Organización temporal. Importación de entidades para crear la causalidad de la trama y definir la escaleta de capítulos.",
            theme: "black"
        },
        {
            title: "Narrativa",
            subtitle: "GENERADOR LIBROS",
            icon: "fa-feather-pointed",
            desc: "Escritura automatizada. El motor OmniGen consume la estructura y el Lore para redactar la prosa final capítulo a capítulo.",
            theme: "black"
        },
        {
            title: "Producción",
            subtitle: "ANIMATION STUDIO",
            icon: "fa-film",
            desc: "Visualización. Conversión del guion narrativo en escenas visuales utilizando los assets generados en la fase de Génesis.",
            theme: "white"
        }
    ],

    // Especificaciones Técnicas del Sistema Operativo
    specs: [
        {
            title: "UNIVERSE ENGINE",
            desc: "Núcleo visual del sistema de archivos. Sustituye las listas de carpetas por un espacio físico 2D con gravedad, colisiones y zoom infinito. Renderizado en Canvas HTML5.",
            color: "black",
            hover: "red-600"
        },
        {
            title: "APP BRIDGE & LOCALFS",
            desc: "Silenos no usa base de datos en la nube. Opera directamente sobre el disco duro del usuario (File System Access API), garantizando soberanía total de los datos y persistencia real.",
            color: "gray-300",
            hover: "black"
        },
        {
            title: "POLLINATIONS CLOUD",
            desc: "Capa de inferencia unificada. Todas las aplicaciones comparten una única autenticación OAuth para acceder a modelos como OpenAI (GPT-4o), Google (Gemini 1.5), Black Forest (Flux) y más.",
            color: "gray-300",
            hover: "black"
        },
        {
            title: "WINDOW MANAGER",
            desc: "Sistema de ventanas flotantes 'Swiss Style'. Soporta multitarea real, redimensionado, minimizado y persistencia de estado visual. Gestión de Z-Index y foco avanzada.",
            color: "gray-300",
            hover: "black"
        }
    ],

    // Documentación detallada (Consolidada de documentation.js)
    docs: [
        {
            id: "doc-01",
            category: "CORE SYSTEM",
            title: "Arquitectura Silenos",
            content: "Silenos v4 opera como un sistema operativo web sobre el LocalFS. Esto elimina la necesidad de subir archivos a servidores; el navegador lee y escribe directamente en tu disco. El núcleo 'Universe' visualiza estos archivos como nodos físicos interactivos."
        },
        {
            id: "doc-02",
            category: "CORE SYSTEM",
            title: "Gestor de Ventanas",
            content: "Implementa un entorno de escritorio completo (Desktop Environment) en el navegador. Las ventanas son instancias aisladas que pueden comunicarse entre sí y con el sistema de archivos a través del 'App Bridge'."
        },
        {
            id: "doc-03",
            category: "KOREH SUITE",
            title: "Datos Studio (Chroma Tech)",
            content: "Incluye un pipeline de procesamiento de imagen avanzado. Cuando se activa el modo 'Sin Fondo', la IA genera el objeto sobre verde puro (#00FF00). Luego, el algoritmo 'Chroma Core' analiza los canales RGB para realizar un 'Despill' (eliminación de reflejos verdes) y calcular una máscara alfa suave, resultando en PNGs transparentes profesionales."
        },
        {
            id: "doc-04",
            category: "KOREH SUITE",
            title: "Generador de Libros (Lógica)",
            content: "El motor OmniGen v5.3 no escribe a ciegas. Antes de cada párrafo, un agente 'Arquitecto' analiza lo escrito anteriormente y decide el modo (Acción, Diálogo, Descripción). Luego, el 'Escritor' genera el texto, y finalmente un 'Crítico' lo pule y verifica que no haya bucles repetitivos."
        },
        {
            id: "doc-05",
            category: "KOREH SUITE",
            title: "Extractor (Map-Reduce)",
            content: "Para analizar libros de 500 páginas, el Extractor divide el texto en bloques de 15.000 caracteres (Map). Analiza cada bloque en paralelo buscando entidades. Luego, consolida las listas eliminando duplicados (Reduce) y finalmente genera fichas detalladas para cada entidad única."
        },
        {
            id: "doc-06",
            category: "KOREH SUITE",
            title: "Animation Studio (Director)",
            content: "El 'Director IA' es un módulo que lee una descripción de escena y la desglosa en una lista de assets necesarios (Fondo + Sprites). Optimiza la lista para ahorrar recursos, fusionando conceptos (ej: 'Hombre con espada' en vez de 'Hombre' + 'Espada')."
        }
    ],

    marquee_text: "SILENOS v4 :: KOREH AI SUITE :: OMNIGEN NARRATIVE ENGINE :: CHROMA DATA PROCESSING :: SWISS DESIGN SYSTEM :: LOCAL FILE SYSTEM ACCESS :: "
};