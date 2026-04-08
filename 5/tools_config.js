// live gemini/tools_config.js
// ─── TOOLS CONFIGURATION ──────────────────────────────────────────────

const geminiToolsConfig = [{
    functionDeclarations: [
        {
        name: "manage_history",
        description: "Accede al registro de auditoría de TODO lo que tú (la IA) o el usuario habéis hecho. Permite Deshacer (Undo) o Rehacer (Redo) cambios físicos en el disco.",
        parameters: {
            type: "OBJECT",
            properties: {
                action: { type: "STRING", description: "Acción a realizar: 'get_log' (lee qué has hecho últimamente), 'undo' (deshace el último cambio), 'redo' (rehace el último cambio deshecho)." }
            },
            required: ["action"]
        }
        },
        {
        name: "navigate_folder",
        description: "Navega por una carpeta específica y lista sus archivos y subcarpetas en tiempo real. Usa '' o '/' para la raíz.",
        parameters: {
            type: "OBJECT",
            properties: {
            path: { type: "STRING", description: "Ruta de la carpeta a explorar (ej. 'src/components' o '/')" }
            },
            required: ["path"]
        }
        },
        {
        name: "analyze_target",
        description: "Ejecuta un análisis profundo sobre un archivo o carpeta específica para entender su código, contenido o propósito subyecente.",
        parameters: {
            type: "OBJECT",
            properties: {
            path: { type: "STRING", description: "Ruta del archivo o carpeta a analizar (ej. 'index.html' o 'src/utils')" },
            model: { type: "STRING", description: "El modelo a utilizar." }
            },
            required: ["path"]
        }
        },
        {
        name: "manage_coder_studio",
        description: "Abre, cierra o interactúa con el Coder Studio (Entorno avanzado de programación y ejecución de código / Playground).",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción a realizar: 'open', 'close', 'delegate_code', o 'write_code'." },
            prompt: { type: "STRING", description: "Instrucciones precisas (sólo para 'delegate_code')." },
            model: { type: "STRING", description: "El modelo externo a usar." },
            code: { type: "STRING", description: "El código fuente a insertar en el editor y ejecutar en vivo (sólo para 'write_code')." }
            },
            required: ["action"]
        }
        },
        {
        name: "manage_svg_studio",
        description: "Abre, cierra y controla el SVG Studio para crear arte vectorial SVG.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción a realizar: 'open', 'close', 'create_svg', 'save_svg', 'save_png'." },
            code: { type: "STRING", description: "Código fuente SVG completo (solo para 'create_svg')." },
            filename: { type: "STRING", description: "Ruta o nombre del archivo." },
            width: { type: "NUMBER", description: "Ancho en píxeles para exportar." },
            height: { type: "NUMBER", description: "Alto en píxeles para exportar." }
            },
            required: ["action"]
        }
        },
        {
        name: "manage_visualizer",
        description: "Abre el Visualizador de Archivos interactivo, que ahora también funciona como IDE / Editor de código. Permite explorar carpetas visualmente y crear, editar o guardar archivos de texto/código.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acciones: 'open_folder', 'open_file', 'close', 'write_all', 'append', 'save', 'read', 'create_file', 'create_folder'." },
            path: { type: "STRING", description: "Ruta exacta a la carpeta o archivo (ej. '/' para la raíz, 'src/assets' o 'index.html')." },
            content: { type: "STRING", description: "Contenido de texto o código a insertar/guardar (requerido para write_all, append o create_file)." }
            },
            required: ["action"]
        }
        },
        {
        name: "file_operations",
        description: "Permite copiar o mover (cortar y pegar) archivos y carpetas directamente sin tener que leer su contenido. Útil para reubicar archivos masivos o binarios.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción a realizar: 'copy' o 'move'" },
            source_path: { type: "STRING", description: "Ruta origen completa (ej. 'src/app.js')" },
            destination_path: { type: "STRING", description: "Ruta destino completa, incluyendo el nuevo nombre (ej. 'backup/app.js')" }
            },
            required: ["action", "source_path", "destination_path"]
        }
        },
        {
        name: "save_memory",
        description: "Guarda texto, datos o código en un archivo dentro de la carpeta local seleccionada.",
        parameters: {
            type: "OBJECT",
            properties: {
            filename: { type: "STRING", description: "Nombre del archivo con extensión" },
            content: { type: "STRING", description: "El contenido completo a guardar" }
            },
            required: ["filename", "content"]
        }
        },
        {
        name: "read_memory",
        description: "Lee el contenido de un archivo real del disco duro del usuario.",
        parameters: {
            type: "OBJECT",
            properties: {
            filename: { type: "STRING", description: "El nombre o ruta del archivo a leer" }
            },
            required: ["filename"]
        }
        },
        {
        name: "list_memory",
        description: "Consulta el mapa de archivos de la carpeta local.",
        parameters: { type: "OBJECT", properties: {} }
        },
        {
        name: "open_gamebook_ui",
        description: "Abre la interfaz visual del Librojuego Studio.",
        parameters: { type: "OBJECT", properties: {} }
        },
        {
        name: "close_gamebook_ui",
        description: "Cierra la interfaz visual del Librojuego Studio.",
        parameters: { type: "OBJECT", properties: {} }
        },
        {
        name: "manage_gamebook",
        description: "Crea, inspecciona e ilustra Librojuegos.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING" },
            filename: { type: "STRING" },
            title: { type: "STRING" },
            visual_style: { type: "STRING" },
            node_id: { type: "STRING" },
            text: { type: "STRING" },
            svg_content: { type: "STRING" },
            choices: { type: "ARRAY", items: { type: "OBJECT", properties: { text: { type: "STRING" }, targetId: { type: "STRING" } } } },
            x: { type: "NUMBER" },
            y: { type: "NUMBER" },
            zoom: { type: "NUMBER" }
            },
            required: ["action"]
        }
        },
        {
        name: "open_datos_studio",
        description: "Abre la interfaz visual de Datos Studio. Puede abrirse en una subcarpeta específica si se indica.",
        parameters: { 
            type: "OBJECT", 
            properties: {
                path: { type: "STRING", description: "Ruta opcional de la carpeta a abrir (ej. 'lore/personajes'). Si no se indica, abre en la raíz. Si la ruta no existe, se creará automáticamente." }
            } 
        }
        },
        {
        name: "close_datos_studio",
        description: "Cierra la interfaz visual de Datos Studio.",
        parameters: { type: "OBJECT", properties: {} }
        },
        {
        name: "manage_datos_studio",
        description: "Crea, edita, lista o ilustra datos narrativos.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING" },
            filename: { type: "STRING" },
            name: { type: "STRING" },
            type: { type: "STRING" },
            desc: { type: "STRING" },
            visual_desc: { type: "STRING" },
            svg_content: { type: "STRING" },
            path: { type: "STRING" }
            },
            required: ["action"]
        }
        },
        {
        name: "light_search",
        description: "Realiza una búsqueda rápida en internet.",
        parameters: {
            type: "OBJECT",
            properties: {
            query: { type: "STRING" },
            model: { type: "STRING" }
            },
            required: ["query"]
        }
        },
        {
        name: "advanced_search",
        description: "Realiza una búsqueda profunda en internet.",
        parameters: {
            type: "OBJECT",
            properties: {
            query: { type: "STRING" },
            model: { type: "STRING" }
            },
            required: ["query"]
        }
        },
        {
        name: "browse_web",
        description: "Abre una página web en el navegador visual del sistema.",
        parameters: {
            type: "OBJECT",
            properties: {
            url: { type: "STRING" },
            analyze_model: { type: "STRING" }
            },
            required: ["url", "analyze_model"]
        }
        },
        {
        name: "interact_web",
        description: "Interactúa físicamente con el DOM de la web abierta en el iframe.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING" },
            param: { type: "STRING" },
            x: { type: "NUMBER" },
            y: { type: "NUMBER" },
            selector: { type: "STRING" }
            },
            required: ["action"]
        }
        },
        {
        name: "ask_external_ai",
        description: "Delega una tarea, consulta o procesamiento pesado a un modelo de IA externo.",
        parameters: {
            type: "OBJECT",
            properties: {
            prompt: { type: "STRING" },
            model: { type: "STRING" }
            },
            required: ["prompt", "model"]
        }
        },
        {
        name: "execute_dynamic_code",
        description: "Crea y ejecuta una herramienta o script de lógica en JavaScript al vuelo de forma asíncrona.",
        parameters: {
            type: "OBJECT",
            properties: {
            code: { type: "STRING" }
            },
            required: ["code"]
        }
        }
    ]
}];