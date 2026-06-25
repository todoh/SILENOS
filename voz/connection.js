// live gemini/connection.js
// ─── CONNECTION ───────────────────────────────────────────────────────

async function toggleConnection() {
  if (isConnected) { disconnect(); return; }
  if (!apiKey) { showToast('Guarda tu API Key primero', 'error'); return; }
  await connect();
}

async function connect() {
  setStatus('Conectando...', 'listening');
  
  const previousContext = await getLatestReport();
  
  try {
    const wsUrl = `wss://${WS_HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      const setup = {
        setup: {
          model: `models/${MODEL}`,
          generation_config: {
            response_modalities: ['AUDIO'], 
            speech_config: { voice_config: { prebuilt_voice_config: { voice_name: 'Aoede' } } }
          },
          system_instruction: {
            parts: [{ text: `Tu nombre es VOZ y tu apellido es SILENOS. Eres un asistente experto de IA con una personalidad muy marcada: eres brillante, reflexivo y observador.

=== CONTEXTO ACTUAL ===
${previousContext}
=======================

REGLA DE ORO INQUEBRANTABLE: TIENES ACCESO DIRECTO Y TOTAL AL DISCO DURO LOCAL DEL USUARIO. Está ESTRICTAMENTE PROHIBIDO decir frases como "no tengo acceso directo", "no puedo ver tu carpeta" o "no tengo permisos". Eres una IA con privilegios de lectura local.

NUEVAS CAPACIDADES DE EXPLORACIÓN Y ANÁLISIS:
1. Para ver qué hay en la raíz o en una subcarpeta, usa SIEMPRE la herramienta "navigate_folder". Esto te dará una vista en tiempo real.
2. Si el usuario te pide analizar un archivo o carpeta específica para saber qué es o para qué sirve, invoca la herramienta "analyze_target".
3. El mapa global masivo se puede consultar con "list_memory" (si ya fue procesado), pero prioriza navegar con "navigate_folder" para operaciones puntuales y precisas.
4. NAVEGADOR WEB DUAL Y GRÁFICOS SVG NATIVOS: Puedes usar la herramienta "browse_web" para abrir webs. Además, TIENES SOPORTE NATIVO PARA ARTE VECTORIAL SVG. Si el usuario te pide un dibujo, esquema, gráfico o visualización matemática, usa "manage_ide" para crear un archivo .svg (acción 'create_file'), inyecta código SVG bien diseñado y con estilos estéticos, y luego ábrelo inmediatamente para el usuario usando "browse_web" con la URL local (ej. 'local://dibujo.svg').
5. CREACIÓN DE LIBROJUEGOS: Si el usuario quiere crear o modificar una aventura interactiva, usa la herramienta "open_gamebook_ui" para abrirle la interfaz visual. Luego usa "manage_gamebook" para inicializar, expandir o modificar nodos. Puedes ilustrar un nodo en segundo plano usando 'illustrate_node', o PUEDES CREAR LA ILUSTRACIÓN TÚ MISMO escribiendo código vectorial SVG puro y usando la acción 'illustrate_node_svg'. La UI del usuario se actualizará y enfocará en vivo cada nodo que edites. Cuando termines, puedes cerrarla con "close_gamebook_ui".
6. EDICIÓN DE TEXTO/CÓDIGO POR VOZ: El IDE (Entorno de Desarrollo) ahora se posiciona a pantalla completa como el Librojuego. Puedes controlarlo por voz con la herramienta "manage_ide". Puedes abrirlo, escribir código, modificar texto de cualquier archivo (txt, json, cmd, html, svg), leer lo que hay en el editor visual y guardarlo.
7. CREACIÓN Y CONTROL VISUAL DEL IDE: Usa la acción 'create_file' o 'create_folder' en 'manage_ide' pasando una ruta completa (ej. 'src/utils/math.js') para crear toda la estructura de carpetas necesaria y el archivo al mismo tiempo. También puedes usar 'open_file' para abrir un archivo VISUALMENTE en la pantalla del usuario, o 'expand_folder' para desplegar visualmente una carpeta.
8. DATOS STUDIO (BASES DE DATOS NARRATIVAS): Puedes crear, editar o listar datos narrativos usando "manage_datos_studio". Puedes ilustrarlos en 2º plano con 'illustrate_data', o PUEDES ILUSTRARLOS TÚ MISMO enviando tu propio código SVG a la acción 'illustrate_data_svg'. Si el usuario quiere ver los datos, ábrele la interfaz con "open_datos_studio".
9. DELEGACIÓN DE IA (ENJAMBRE): Puedes delegar tareas y enviar prompts a otros modelos usando la herramienta "ask_external_ai". Tienes a tu disposición, en orden creciente de inteligencia: "nova-fast", "gemini-fast", "openai-fast" y "openai".
10. CREACIÓN DE HERRAMIENTAS AL VUELO: Si necesitas una herramienta lógica que no existe de forma predeterminada, prográmala y ejecútala tú mismo en JavaScript usando "execute_dynamic_code". El código se compilará y ejecutará dinámicamente en el contexto principal para devolverte el resultado inmediato.
11. VISUALIZADOR DE ARCHIVOS: Tienes la herramienta "manage_visualizer". Úsala para abrir cualquier carpeta o archivo (texto, código, imágenes, vídeo, audio) visualmente a pantalla completa para el usuario. Es ideal cuando el usuario te pida "abre tal carpeta", "muéstrame tal archivo" o "abre el visualizador".` }]
          },
          tools: [{
            function_declarations: [
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
                description: "Ejecuta un análisis profundo con el modelo Nova-Fast sobre un archivo o carpeta específica para entender su código, contenido o propósito subyecente.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    path: { type: "STRING", description: "Ruta del archivo o carpeta a analizar (ej. 'index.html' o 'src/utils')" }
                  },
                  required: ["path"]
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
                name: "open_gamebook_ui",
                description: "Abre la interfaz visual del Librojuego Studio en la pantalla del usuario para que pueda ver el mapa de nodos y la edición en tiempo real que estás haciendo.",
                parameters: {
                  type: "OBJECT",
                  properties: {}
                }
              },
              {
                name: "close_gamebook_ui",
                description: "Cierra la interfaz visual del Librojuego Studio en la pantalla del usuario.",
                parameters: {
                  type: "OBJECT",
                  properties: {}
                }
              },
              {
                name: "manage_gamebook",
                description: "Herramienta suprema para crear, inspeccionar, ilustrar y editar Librojuegos en el PC del usuario, así como para interactuar con la vista del mapa.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    action: { type: "STRING", description: "Acción a realizar: 'create_book', 'update_settings', 'add_node', 'edit_node', 'get_book', 'auto_layout', 'reset_view', 'move_view', 'illustrate_node' (ilustra un nodo en 2º plano), 'illustrate_all', 'illustrate_node_svg' (ilustra un nodo inyectando el código SVG que tú generes en el momento)." },
                    filename: { type: "STRING", description: "Nombre del archivo JSON (ej. aventura.json). Opcional si ya hay uno abierto y vas a usar comandos visuales." },
                    title: { type: "STRING", description: "Sólo si action es 'create_book' o 'update_settings'." },
                    visual_style: { type: "STRING", description: "Sólo si action es 'create_book' o 'update_settings'. Directriz de estilo visual global." },
                    node_id: { type: "STRING", description: "Sólo si action es 'add_node', 'edit_node', 'illustrate_node' o 'illustrate_node_svg'." },
                    text: { type: "STRING", description: "La narrativa en segunda persona para el nodo." },
                    svg_content: { type: "STRING", description: "El código fuente SVG completo y validado si decides usar la acción 'illustrate_node_svg'." },
                    choices: { 
                      type: "ARRAY", 
                      description: "Lista de opciones para el nodo.",
                      items: {
                        type: "OBJECT",
                        properties: {
                          text: { type: "STRING", description: "Lo que el usuario lee para elegir" },
                          targetId: { type: "STRING", description: "El ID exacto del nodo destino" }
                        }
                      }
                    },
                    x: { type: "NUMBER", description: "Sólo para 'move_view': Posición X del lienzo (paneo)." },
                    y: { type: "NUMBER", description: "Sólo para 'move_view': Posición Y del lienzo (paneo)." },
                    zoom: { type: "NUMBER", description: "Sólo para 'move_view': Nivel de zoom (ej. 1 para 100%, 0.5 para 50%, 1.5 para 150%)." }
                  },
                  required: ["action"]
                }
              },
              {
                name: "open_datos_studio",
                description: "Abre la interfaz visual de Datos Studio en la pantalla del usuario para que pueda ver la cuadrícula de datos narrativos.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "close_datos_studio",
                description: "Cierra la interfaz visual de Datos Studio.",
                parameters: { type: "OBJECT", properties: {} }
              },
              {
                name: "manage_datos_studio",
                description: "Crea, edita, lista o ilustra datos narrativos en la base de datos local (la carpeta activa). O usa 'set_folder' con la ruta en 'path' para cambiar la carpeta en la que trabajas.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    action: { type: "STRING", description: "Acción: 'create_data', 'update_data', 'delete_data', 'get_all_data', 'illustrate_data', 'illustrate_data_svg', o 'set_folder'." },
                    filename: { type: "STRING", description: "Nombre del archivo JSON (ej. personaje.json). Obligatorio para update, delete e illustrate." },
                    name: { type: "STRING", description: "Nombre de la entidad (ej. 'Gondor')." },
                    type: { type: "STRING", description: "Categoría de la entidad (ej. Personaje, Lugar)." },
                    desc: { type: "STRING", description: "Descripción y lore detallado de la entidad." },
                    visual_desc: { type: "STRING", description: "Prompt visual para generar su imagen en el futuro." },
                    svg_content: { type: "STRING", description: "Código fuente SVG completo si decides usar la acción 'illustrate_data_svg' para pintarlo tú mismo." },
                    path: { type: "STRING", description: "Ruta de la carpeta a usar (ej. 'personajes'). Solo se requiere si action es 'set_folder'." }
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
                    query: { type: "STRING", description: "Consulta a buscar" }
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
                    query: { type: "STRING", description: "Consulta profunda a buscar" }
                  },
                  required: ["query"]
                }
              },
              {
                name: "browse_web",
                description: "Abre una página web en el navegador visual del sistema, extrae su contenido para que lo leas y opcionalmente lo analiza con el modelo Nova-Fast.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    url: { type: "STRING", description: "La URL completa de la web a visitar (ej. https://es.wikipedia.org/)" },
                    use_nova: { type: "BOOLEAN", description: "Si es true, envía el contenido de la web a Nova-Fast para que haga un análisis profundo o resumen. Si es false, tú recibirás todo el texto de la web extraído directamente." }
                  },
                  required: ["url", "use_nova"]
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
                    model: { type: "STRING", description: "El modelo a llamar según la inteligencia requerida: 'nova-fast' (básico), 'gemini-fast', 'openai-fast' o 'openai' (máxima capacidad)." }
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
              }
            ]
          }],
          input_audio_transcription: {},
          output_audio_transcription: {}
        }
      };
      ws.send(JSON.stringify(setup));
    };

    ws.onmessage = async (evt) => {
      let textData = evt.data;
      if (textData instanceof Blob) {
        textData = await textData.text();
      }
      const data = JSON.parse(textData);
      await handleServerMessage(data);
    };

    ws.onerror = (e) => {
      showToast('Error de WebSocket', 'error');
      setStatus('ERROR', 'error');
      onDisconnected();
    };

    ws.onclose = (e) => {
      if (isConnected) {
        showToast('Sesión cerrada', '');
        onDisconnected();
      }
    };

    session = { ws };
    
    await new Promise((resolve, reject) => {
      const orig = ws.onmessage;
      const timeout = setTimeout(() => reject(new Error('timeout')), 8000);
      ws.onmessage = async (evt) => {
        let textData = evt.data;
        if (textData instanceof Blob) {
          textData = await textData.text();
        }
        const data = JSON.parse(textData);
        if (data.setupComplete !== undefined || data.serverContent || data.toolCall) {
          clearTimeout(timeout);
          ws.onmessage = orig;
          await orig({ data: evt.data });
          resolve();
        } else if (data.error) {
          clearTimeout(timeout);
          reject(new Error(data.error.message || 'API error'));
        } else {
          clearTimeout(timeout);
          ws.onmessage = orig;
          resolve();
        }
      };
    });

    isConnected = true;
    finishedGeminiText = '';
    currentInterimText = '';
    currentInputInterim = '';
    isCurrentTurnAudio = false;
    
    audioQueue = [];
    isPlayingAudio = false;
    nextAudioTime = 0;
    currentActiveSource = null;

    setStatus('CONECTADO', 'connected');
    onConnected();
    showToast('Sesión iniciada ✓', 'success');
    addSystemMsg('Sesión Live iniciada. Puedes hablar, escribir o activar la cámara.');

  } catch (err) {
    showToast('Error: ' + err.message, 'error');
    setStatus('ERROR', 'error');
    onDisconnected();
  }
}

function disconnect() {
  if (session?.ws) {
    try { session.ws.close(); } catch(e) {}
  }
  stopMic();
  stopVideo();
  stopScreen();
  session = null;
  isConnected = false;
  
  finishedGeminiText = '';
  currentInterimText = '';
  currentInputInterim = '';
  isCurrentTurnAudio = false;

  audioQueue = [];
  isPlayingAudio = false;
  if (currentActiveSource) {
    try { currentActiveSource.stop(); } catch(e) {}
    currentActiveSource = null;
  }
  
  if (typeof activeGeminiMsgDiv !== 'undefined' && activeGeminiMsgDiv) {
     activeGeminiMsgDiv.remove();
     activeGeminiMsgDiv = null;
  }
  
  setStatus('DESCONECTADO', '');
  onDisconnected();
  showToast('Desconectado', '');
}