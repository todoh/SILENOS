// live gemini/tools_config.js
// ─── TOOLS CONFIGURATION ──────────────────────────────────────────────

const geminiToolsConfig = [{
    function_declarations: [
        {
        name: "manage_os_windows",
        description: "Controla el Sistema Operativo SILENOS 4. Permite listar todas las ventanas abiertas, listar aplicaciones instaladas, abrir programas directamente y gestionar el estado de las ventanas (enfocar, minimizar, maximizar, cerrar).",
        parameters: {
            type: "OBJECT",
            properties: {
                action: { type: "STRING", description: "Acción a realizar: 'list' (ver ventanas abiertas), 'focus', 'minimize', 'maximize', 'close', 'list_apps' (listar programas del SO), 'open_app' (abrir programa directamente)." },
                window_id: { type: "STRING", description: "El ID de la ventana (necesario para acciones de ventana excepto 'list')." },
                app_name: { type: "STRING", description: "El nombre exacto del programa que quieres abrir (requerido solo para la acción 'open_app')." }
            },
            required: ["action"]
        }
        },
        {
        name: "control_running_app",
        description: "Controla CUALQUIER programa o ventana abierta en SILENOS 4. Permite inspeccionar su interfaz (leer campos y botones) o inyectar código para interactuar con ella físicamente.",
        parameters: {
            type: "OBJECT",
            properties: {
                action: { type: "STRING", description: "Acción a realizar: 'inspect' (para leer qué botones y campos hay en la ventana y obtener sus IDs) o 'execute' (para inyectar código JS y pulsar botones)." },
                window_id: { type: "STRING", description: "El ID de la ventana de la aplicación que quieres controlar." },
                code: { type: "STRING", description: "Código JavaScript a ejecutar (solo requerido para action 'execute'). Usa 'return' para devolver resultados. Usa dispatchEvent para simular el tipeo si modificas campos." }
            },
            required: ["action", "window_id"]
        }
        },
        {
        name: "manage_audio_player",
        description: "Reproduce y controla grabaciones de voz del usuario o cualquier archivo de audio (mp3, wav, webm). Te permite pausar, adelantar o detener el reproductor en pantalla.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción a realizar: 'play', 'pause', 'resume', 'stop', 'seek'." },
            path: { type: "STRING", description: "Ruta del archivo de audio (Requerido solo para 'play'). Ejemplo: 'conversaciones/grabaciones_voz/bloque_voz_123.webm'" },
            time: { type: "NUMBER", description: "Segundo exacto al que quieres saltar (Requerido solo para 'seek')." }
            },
            required: ["action"]
        }
        },
        {
        name: "analyze_audio_file",
        description: "Escucha, transcribe y analiza internamente un archivo de audio para saber exactamente qué se dice en él, sin tener que reproducirlo.",
        parameters: {
            type: "OBJECT",
            properties: {
            path: { type: "STRING", description: "Ruta del archivo de audio a analizar." }
            },
            required: ["path"]
        }
        },
        {
        name: "analyze_recent_voice",
        description: "Recopila y analiza todos los bloques de audio grabados recientemente en los últimos X minutos. Úsalo cuando el usuario te pida analizar lo que acaba de decir, la conversación actual, o lo que se escuchó recientemente en su micrófono.",
        parameters: {
            type: "OBJECT",
            properties: {
            minutes: { type: "NUMBER", description: "Cantidad de minutos hacia atrás que quieres recopilar y analizar (ej. 2, 5, 10)." }
            },
            required: ["minutes"]
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
            model: { type: "STRING", description: "El modelo a utilizar: 'nova-fast', 'gemini-fast', 'openai-fast' o 'openai'." }
            },
            required: ["path"]
        }
        },
        {
        name: "manage_svg_studio",
        description: "Abre, cierra y controla el SVG Studio. Úsalo para crear arte vectorial SVG inyectando el código directamente en la interfaz (para que el usuario lo vea), o para guardar ese arte en disco como archivo .svg, o exportarlo como imagen estática .png con la resolución deseada.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción a realizar: 'open', 'close', 'create_svg', 'save_svg', 'save_png'." },
            code: { type: "STRING", description: "Código fuente SVG completo que vas a inyectar (solo requerido para la acción 'create_svg')." },
            filename: { type: "STRING", description: "Ruta o nombre del archivo incluyendo la extensión .svg o .png (ej: 'arte/dibujo.svg' o 'dibujo.png') (solo requerido para 'save_svg' o 'save_png')." },
            width: { type: "NUMBER", description: "Ancho en píxeles para exportar el PNG (solo requerido para 'save_png')." },
            height: { type: "NUMBER", description: "Alto en píxeles para exportar el PNG (solo requerido para 'save_png')." }
            },
            required: ["action"]
        }
        },
        {
        name: "manage_ide",
        description: "Controla visualmente el Editor de Textos/Código (IDE) en la pantalla del usuario. Permite interactuar en tiempo real con archivos y carpetas, y crear estructuras de carpetas recursivas.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción: 'open', 'close', 'write_all', 'append', 'save', 'read', 'open_file', 'expand_folder', 'create_file', 'create_folder'." },
            content: { type: "STRING", description: "El texto o código a insertar (requerido para write_all, append o create_file)." },
            path: { type: "STRING", description: "Ruta del archivo o carpeta (requerido para open_file, expand_folder, create_file o create_folder, ej. 'src/app.js' o 'assets/css')." }
            },
            required: ["action"]
        }
        },
        {
        name: "manage_visualizer",
        description: "Abre el Visualizador de Archivos interactivo en la pantalla del usuario. Permite visualizar carpetas o abrir archivos concretos de cualquier tipo (imágenes, video, audio, código, etc.).",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acción a realizar: 'open_folder', 'open_file', 'close'." },
            path: { type: "STRING", description: "Ruta exacta a la carpeta o archivo (ej. '/' para la raíz, 'src/assets' o 'index.html'). Opcional si solo quieres usar la acción 'close'." }
            },
            required: ["action"]
        }
        },
        {
        name: "save_memory",
        description: "Guarda texto, datos o código en un archivo dentro de la carpeta local seleccionada por el usuario en su PC.",
        parameters: {
            type: "OBJECT",
            properties: {
            filename: { type: "STRING", description: "Nombre del archivo con extensión (ej. codigo.js, datos.txt, config.json)" },
            content: { type: "STRING", description: "El contenido completo a guardar" }
            },
            required: ["filename", "content"]
        }
        },
        {
        name: "read_memory",
        description: "Lee el contenido de un archivo real del disco duro del usuario. Úsalo cuando quieras ver el interior de un archivo en concreto.",
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
        description: "Usa esta herramienta cuando el usuario pregunte por un mapa general de sus archivos (requiere que el usuario haya procesado los datos previamente).",
        parameters: {
            type: "OBJECT",
            properties: {}
        }
        },
        {
        name: "manage_narrative_studio",
        description: "Abre, cierra y controla el Narrative Studio. Te permite crear, generar campos vía IA, guardar, cargar, analizar, leer y modificar plantillas estructuradas de JSON para narrativas en tiempo real.",
        parameters: {
            type: "OBJECT",
            properties: {
                action: { type: "STRING", description: "Acción a realizar: 'open', 'close', 'create_template', 'generate_field', 'save_template', 'load_template', 'analyze_template', 'read_template', 'update_field'." },
                field: { type: "STRING", description: "El campo específico a generar o actualizar (ej. 'premise', 'start', 'characters')." },
                value: { type: "STRING", description: "El texto o valor que quieres inyectar (solo requerido para la acción 'update_field')." },
                data_json: { type: "STRING", description: "String JSON opcional con los datos iniciales (solo para 'create_template')." }
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
            query: { type: "STRING", description: "Consulta a buscar" },
            model: { type: "STRING", description: "El modelo a utilizar: 'nova-fast', 'gemini-fast', 'openai-fast' o 'openai'." }
            },
            required: ["query"]
        }
        },
        {
        name: "advanced_search",
        description: "Realiza una búsqueda profunda en internet para investigaciones complejas.",
        parameters: {
            type: "OBJECT",
            properties: {
            query: { type: "STRING", description: "Consulta profunda a buscar" },
            model: { type: "STRING", description: "El modelo a utilizar: 'nova-fast', 'gemini-fast', 'openai-fast' o 'openai'." }
            },
            required: ["query"]
        }
        },
        {
        name: "browse_web",
        description: "Abre una página web en el navegador visual del sistema, extrae su contenido para que lo leas y opcionalmente lo analiza con el modelo indicado.",
        parameters: {
            type: "OBJECT",
            properties: {
            url: { type: "STRING", description: "La URL completa de la web a visitar (ej. https://es.wikipedia.org/)" },
            analyze_model: { type: "STRING", description: "El modelo para analizar el contenido de la web: 'none' (solo extraer texto sin análisis), 'nova-fast', 'gemini-fast', 'openai-fast' o 'openai'." }
            },
            required: ["url", "analyze_model"]
        }
        },
        {
        name: "interact_web",
        description: "Interactúa físicamente con el DOM de la web abierta en el iframe. Permite navegar, moverse, escalar y hacer clic.",
        parameters: {
            type: "OBJECT",
            properties: {
            action: { type: "STRING", description: "Acciones permitidas: 'navigate', 'scroll', 'zoom', 'click', 'right_click'." },
            param: { type: "STRING", description: "URL destino (si accion es navigate) o nivel de zoom (ej. '1.5' o '0.8') (si accion es zoom)." },
            x: { type: "NUMBER", description: "Píxeles a mover en el eje horizontal (solo para scroll)." },
            y: { type: "NUMBER", description: "Píxeles a mover en el eje vertical (solo para scroll)." },
            selector: { type: "STRING", description: "Selector CSS exacto del elemento HTML al que se le hará clic (para click o right_click)." }
            },
            required: ["action"]
        }
        },
        {
        name: "ask_external_ai",
        description: "Delega una tarea, consulta o procesamiento pesado a un modelo de IA externo. Se ejecutará en segundo plano.",
        parameters: {
            type: "OBJECT",
            properties: {
            prompt: { type: "STRING", description: "Las instrucciones detalladas, preguntas o datos para que el modelo procese." },
            model: { type: "STRING", description: "El modelo a llamar según la inteligencia requerida: 'nova-fast', 'gemini-fast', 'openai-fast' o 'openai'." },
            attached_file_path: { type: "STRING", description: "Ruta local del archivo que quieres adjuntar para que el modelo externo lo lea completo de forma automática como contexto." }
            },
            required: ["prompt", "model"]
        }
        },
        {
        name: "execute_dynamic_code",
        description: "Crea y ejecuta una herramienta o script de lógica en JavaScript al vuelo de forma asíncrona. Sirve para automatizar cálculos, procesar arrays complejos o interactuar con el entorno directamente.",
        parameters: {
            type: "OBJECT",
            properties: {
            code: { type: "STRING", description: "Código JavaScript puro que debe ser ejecutado (el cuerpo de una función asíncrona). Usa 'return' para devolver los resultados al final del proceso." }
            },
            required: ["code"]
        }
        },
        {
        name: "generate_image",
        description: "Genera una imagen usando IA basada en un prompt y la guarda en disco. Modelos disponibles: 'zimage' (por defecto), 'flux', 'klein'.",
        parameters: {
            type: "OBJECT",
            properties: {
                prompt: { type: "STRING", description: "Descripción detallada de la imagen a generar." },
                model: { type: "STRING", description: "Modelo a usar: 'zimage', 'flux', o 'klein'. Por defecto es 'zimage'." },
                path: { type: "STRING", description: "Ruta y nombre del archivo donde guardar (ej: 'imagenes/foto.png'). Si no se especifica, se guarda en la carpeta raíz actual." }
            },
            required: ["prompt"]
        }
        }
    ]
}];