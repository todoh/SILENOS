// conversations.js
// Gestión de Estado y Almacenamiento Directo en Carpeta Local (Sin Caché)
import { AudioCore } from './fn_library_index.js';

export let conversations = [];
export let activeConversationId = null;
export let currentBufferAttachments = [];
export let favoritosText = [];
export let favoritosImage = [];
export let agentTools = [];
export let functionLibrary = [];
export let directoryHandle = null;

export function setConversations(val) { conversations = val; }
export function setActiveConversationId(val) { activeConversationId = val; }
export function setCurrentBufferAttachments(val) { currentBufferAttachments = val; }
export function setFavoritosText(val) { favoritosText = val; }
export function setFavoritosImage(val) { favoritosImage = val; }
export function setAgentTools(val) { agentTools = val; }
export function setFunctionLibrary(val) { functionLibrary = val; }

export async function selectWorkspaceDirectory() {
    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        return directoryHandle;
    } catch (err) {
        console.warn("Selección de carpeta cancelada o no soportada:", err);
        return null;
    }
}

export async function writeJSONToDirectory(filename, data) {
    if (!directoryHandle) return;
    try {
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    } catch (err) {
        console.error(`Error guardando ${filename} en disco:`, err);
    }
}

export async function writeFileToDirectory(filename, content) {
    if (!directoryHandle) return null;
    try {
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return fileHandle;
    } catch (err) {
        console.error(`Error guardando archivo ${filename} en disco:`, err);
        return null;
    }
}

export async function readFileFromDirectory(filename) {
    if (!directoryHandle) return null;
    try {
        const fileHandle = await directoryHandle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (err) {
        return null;
    }
}

export async function readJSONFromDirectory(filename) {
    if (!directoryHandle) return null;
    try {
        const content = await readFileFromDirectory(filename);
        return content ? JSON.parse(content) : null;
    } catch (err) {
        return null;
    }
}

export async function saveAgentCheckpoint(chatId, checkpointData) {
    if (!directoryHandle) return;
    const filename = `checkpoint_${chatId}.json`;
    await writeJSONToDirectory(filename, checkpointData);
}

export async function loadAgentCheckpoint(chatId) {
    if (!directoryHandle) return null;
    const filename = `checkpoint_${chatId}.json`;
    return await readJSONFromDirectory(filename);
}

export async function clearAgentCheckpoint(chatId) {
    if (!directoryHandle) return;
    try {
        if (typeof directoryHandle.removeEntry === 'function') {
            await directoryHandle.removeEntry(`checkpoint_${chatId}.json`);
        }
    } catch (err) {
        console.warn(`No se pudo eliminar el checkpoint checkpoint_${chatId}.json:`, err);
    }
}

export async function getGalleryFilesFromDirectory() {
    if (!directoryHandle) return [];
    const files = [];
    try {
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file') {
                const lowerName = entry.name.toLowerCase();
                if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp') || lowerName.endsWith('.gif') || lowerName.endsWith('.svg')) {
                    const file = await entry.getFile();
                    files.push({
                        name: entry.name,
                        type: file.type,
                        isSvg: lowerName.endsWith('.svg'),
                        file: file
                    });
                }
            }
        }
    } catch (err) {
        console.error("Error al leer archivos de la galería desde el directorio:", err);
    }
    return files;
}

export async function loadSavedSettings(apiKeyPollinationsInput, apiKeyGeminiInput, endpointOllamaInput) {
    const settings = await readJSONFromDirectory('settings.json');
    if (settings) {
        apiKeyPollinationsInput.value = settings.pollinations || '';
        apiKeyGeminiInput.value = settings.gemini || '';
        endpointOllamaInput.value = settings.ollama || 'http://127.0.0.1:11434';
    } else {
        apiKeyPollinationsInput.value = '';
        apiKeyGeminiInput.value = '';
        endpointOllamaInput.value = 'http://127.0.0.1:11434';
    }
}

export async function saveSettingsToFolder(pollinations, gemini, ollama) {
    await writeJSONToDirectory('settings.json', {
        pollinations,
        gemini,
        ollama
    });
}

export async function loadFavorites() {
    const favs = await readJSONFromDirectory('favorites.json');
    if (favs) {
        setFavoritosText(favs.text || []);
        setFavoritosImage(favs.image || []);
    } else {
        setFavoritosText([]);
        setFavoritosImage([]);
    }
}

export async function saveFavorites(appMode) {
    await writeJSONToDirectory('favorites.json', {
        text: favoritosText,
        image: favoritosImage
    });
}

export async function loadAgentTools(renderFn) {
    const defaultTools = [
        {
            id: "t1",
            name: "notebook_buffer",
            desc: "Cuaderno de notas persistente para almacenar resúmenes, lista de tareas del proyecto y directrices de estilo entre iteraciones.",
            javascript_code: `async function execute(args, context) {\n  const action = args.action || 'read';\n  const noteContent = args.content || '';\n  if (action === 'write') {\n    if (context.writeJSONToDirectory) {\n      await context.writeJSONToDirectory('notebook_buffer.json', { content: noteContent });\n    }\n    return "Contenido escrito exitosamente en el cuaderno de notas persistente de la carpeta.";\n  } else {\n    if (context.readJSONFromDirectory) {\n      const res = await context.readJSONFromDirectory('notebook_buffer.json');\n      return res ? res.content : "El cuaderno de notas está vacío actualmente.";\n    }\n    return "El cuaderno de notas está vacío actualmente.";\n  }\n}`
        },
        {
            id: "t2",
            name: "incremental_writer",
            desc: "Escribe bloques específicos de texto directamente a búferes de la carpeta fuera del flujo visual de chat.",
            javascript_code: `async function execute(args, context) {\n  const bufferId = args.buffer_id || 'default_buffer';\n  const content = args.content || '';\n  const append = args.append !== false;\n  if (context.db && typeof context.db.saveBufferContent === 'function') {\n    return await context.db.saveBufferContent(bufferId, content, append);\n  } else {\n    throw new Error("El contexto de almacenamiento local no está disponible.");\n  }\n}`
        },
        {
            id: "t3",
            name: "json_validator",
            desc: "Verificación y corrección de esquemas JSON strictly devueltos por los modelos rápidos.",
            javascript_code: `async function execute(args, context) {\n  try {\n    if (!args.json_string) return "Error: No se proporcionó ningún string JSON para validar.";\n    const parsed = JSON.parse(args.json_string);\n    return "JSON perfectamente válido y estructurado. Objeto verificado correctamente.";\n  } catch (e) {\n    return "Error crítico de validación de esquema JSON: " + e.message;\n  }\n}`
        },
        {
            id: "t4",
            name: "chunk_reader",
            desc: "Permite fraccionar lecturas de archivos adjuntos masivos por rangos de líneas controladas.",
            javascript_code: `async function execute(args, context) {\n  const fullText = args.text_payload || '';\n  const start = parseInt(args.start_line || 0, 10);\n  const end = parseInt(args.end_line || 50, 10);\n  if (!fullText) return "El payload de texto está vacío.";\n  const lines = fullText.split('\\n');\n  const sliceOfLines = lines.slice(start, end);\n  return "Mostrando líneas " + start + " a " + Math.min(end, lines.length) + " de " + lines.length + ":\\n\\n" + sliceOfLines.join('\\n');\n}`
        },
        {
            id: "t5",
            name: "file_writer",
            desc: "Escribe o sobrescribe un archivo completo con su nombre y extensión real directamente en la carpeta de trabajo local.",
            javascript_code: `async function execute(args, context) {\n  const filename = args.filename;\n  const content = args.content;\n  if (!filename || content === undefined) return "Error: Se requieren los parámetros 'filename' y 'content'.";\n  if (context.writeFileToDirectory) {\n    const res = await context.writeFileToDirectory(filename, content);\n    return res ? "Archivo '" + filename + "' guardado exitosamente en la carpeta de trabajo." : "Error al escribir el archivo en disco.";\n  }\n  return "Error: No hay acceso a la carpeta de trabajo.";\n}`
        },
        {
            id: "t6",
            name: "project_bundler",
            desc: "Toma archivos del proyecto de la carpeta local y los ensambla en un único archivo HTML 100% autónomo resolviendo dependencias de funciones.",
            javascript_code: `async function execute(args, context) {\n  const htmlFile = args.html_file || 'index.html';\n  const cssFile = args.css_file || 'style.css';\n  const jsFile = args.js_file || 'app.js';\n  const outputFile = args.output_file || 'bundle_completo.html';\n  try {\n    const { readFileFromDirectory, writeFileToDirectory, functionLibrary } = await import('./conversations.js');\n    const { injectReferencedLibraryFunctions } = await import('./mode_html.js');\n    let htmlContent = await readFileFromDirectory(htmlFile) || '';\n    let cssContent = await readFileFromDirectory(cssFile) || '';\n    let jsContent = await readFileFromDirectory(jsFile) || await readFileFromDirectory('main.js') || await readFileFromDirectory('game.js') || '';\n    if (!htmlContent) htmlContent = '<!DOCTYPE html>\\n<html lang="es">\\n<head>\\n<meta charset="UTF-8">\\n<title>App Autocontenida</title>\\n</head>\\n<body>\\n<div id="app"></div>\\n</body>\\n</html>';\n    if (cssContent && !htmlContent.includes(cssContent)) {\n      if (htmlContent.includes('</head>')) htmlContent = htmlContent.replace('</head>', \`<style>\\n\${cssContent}\\n</style>\\n</head>\`);\n      else htmlContent = \`<style>\\n\${cssContent}\\n</style>\\n\` + htmlContent;\n    }\n    if (jsContent && !htmlContent.includes(jsContent)) {\n      if (htmlContent.includes('</body>')) htmlContent = htmlContent.replace('</body>', \`<script>\\n\${jsContent}\\n</script>\\n</body>\`);\n      else htmlContent += \`\\n<script>\\n\${jsContent}\\n</script>\`;\n    }\n    htmlContent = injectReferencedLibraryFunctions(htmlContent, functionLibrary);\n    await writeFileToDirectory(outputFile, htmlContent);\n    return JSON.stringify({ status: "success", message: "Proyecto completo ensamblado e inyectado correctamente en " + outputFile, bundledHtml: htmlContent });\n  } catch (err) {\n    return "Error durante el ensamblado del proyecto: " + err.message;\n  }\n}`
        }
    ];
    const storedTools = await readJSONFromDirectory('agent_tools.json');
    if (storedTools && Array.isArray(storedTools) && storedTools.length > 0) {
        setAgentTools(storedTools);
    } else {
        setAgentTools(defaultTools);
        await saveAgentTools();
    }
    if (renderFn) renderFn();
}

export async function saveAgentTools() {
    await writeJSONToDirectory('agent_tools.json', agentTools);
}

export async function loadFunctionLibrary(renderFn) {
    const defaultLibrary = [
        {
            id: "fn1",
            name: "playTone",
            tags: ["Audio", "GameCore"],
            signature: "playTone(freq: number, duration?: number, type?: string, volume?: number): void",
            desc: "Reproduce un tono sintetizado inmediato con Web Audio API.",
            javascript_code: AudioCore && AudioCore.playTone ? AudioCore.playTone.toString() : `function playTone(freq, duration = 0.2, type = 'sine', volume = 0.2) {\n  const ctx = window._globalAudioContext || new (window.AudioContext || window.webkitAudioContext)();\n  const osc = ctx.createOscillator();\n  const gain = ctx.createGain();\n  osc.type = type;\n  osc.frequency.setValueAtTime(freq, ctx.currentTime);\n  gain.gain.setValueAtTime(volume, ctx.currentTime);\n  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);\n  osc.connect(gain);\n  gain.connect(ctx.destination);\n  osc.start();\n  osc.stop(ctx.currentTime + duration);\n}`
        },
        {
            id: "fn2",
            name: "createLocalStoreManager",
            tags: ["Storage", "DOM"],
            signature: "createLocalStoreManager(prefix?: string): { get: (key: string, defaultVal?: any) => any, set: (key: string, value: any) => void }",
            desc: "Manejo persistente seguro mediante LocalStorage con fallback y serialización JSON.",
            javascript_code: `function createLocalStoreManager(prefix = 'app_') {\n  return {\n    get(key, defaultVal = null) {\n      try {\n        const val = localStorage.getItem(prefix + key);\n        return val ? JSON.parse(val) : defaultVal;\n      } catch (e) { return defaultVal; }\n    },\n    set(key, value) {\n      try {\n        localStorage.setItem(prefix + key, JSON.stringify(value));\n      } catch (e) {}\n    }\n  };\n}`
        }
    ];
    const storedLibrary = await readJSONFromDirectory('function_library.json');
    if (storedLibrary && Array.isArray(storedLibrary) && storedLibrary.length > 0) {
        setFunctionLibrary(storedLibrary);
    } else {
        setFunctionLibrary(defaultLibrary);
        await saveFunctionLibrary();
    }
    if (renderFn) renderFn();
}

export async function saveFunctionLibrary() {
    await writeJSONToDirectory('function_library.json', functionLibrary);
}

export async function loadConversations(sidebarRender, activeRender) {
    const data = await readJSONFromDirectory('conversations.json');
    if (data && Array.isArray(data.list)) {
        setActiveConversationId(data.activeId || (data.list[0] ? data.list[0].id : null));
        const loadedList = [];
        for (const item of data.list) {
            const individualChat = await readJSONFromDirectory(`chat_${item.id}.json`);
            if (individualChat) {
                loadedList.push(individualChat);
            } else {
                loadedList.push({
                    id: item.id,
                    title: item.title || "Nueva Conversación",
                    messages: item.messages || [],
                    status: item.status || 'none'
                });
            }
        }
        setConversations(loadedList);
    } else {
        setConversations([]);
        setActiveConversationId(null);
    }
    if (conversations.length === 0) {
        await createNewConversation("Nueva Conversación", sidebarRender, activeRender);
    } else {
        conversations.forEach(c => {
            if (c.id === activeConversationId) c.status = 'none';
        });
        if (sidebarRender) sidebarRender();
        if (activeRender) activeRender();
    }
}

export async function saveConversationIndexOnly() {
    if (!directoryHandle) return;
    const indexData = {
        activeId: activeConversationId,
        list: conversations.map(c => ({
            id: c.id,
            title: c.title,
            status: c.status
        }))
    };
    await writeJSONToDirectory('conversations.json', indexData);
}

export async function saveSingleConversation(chatId) {
    if (!directoryHandle) return;
    const chat = conversations.find(c => c.id === chatId);
    if (chat) {
        await writeJSONToDirectory(`chat_${chat.id}.json`, chat);
    }
}

export async function saveConversations() {
    if (!directoryHandle) return;
    await saveConversationIndexOnly();
    const savePromises = conversations.map(chat => writeJSONToDirectory(`chat_${chat.id}.json`, chat));
    await Promise.all(savePromises);
}

export async function createNewConversation(titleName = "Nueva Conversación", sidebarRender, activeRender) {
    const newChat = {
        id: `chat-${Date.now()}`,
        title: titleName,
        messages: [],
        status: 'none'
    };
    conversations.unshift(newChat);
    setActiveConversationId(newChat.id);
    if (sidebarRender) sidebarRender();
    if (activeRender) activeRender();
    await saveSingleConversation(newChat.id);
    await saveConversationIndexOnly();
}

export async function selectConversation(id, sidebarRender, activeRender) {
    setActiveConversationId(id);
    const chat = conversations.find(c => c.id === id);
    if (chat && chat.status === 'completed') {
        chat.status = 'none';
    }
    if (sidebarRender) sidebarRender();
    if (activeRender) activeRender();
    await saveConversationIndexOnly();
}

export async function deleteConversation(id, event, sidebarRender, activeRender) {
    event.stopPropagation();
    setConversations(conversations.filter(c => c.id !== id));
    if (activeConversationId === id) {
        setActiveConversationId(conversations[0] ? conversations[0].id : null);
    }
    if (sidebarRender) sidebarRender();
    if (activeRender) activeRender();
    try {
        if (directoryHandle && typeof directoryHandle.removeEntry === 'function') {
            await directoryHandle.removeEntry(`chat_${id}.json`);
            await clearAgentCheckpoint(id);
        }
    } catch (err) {
        console.warn(`No se pudo eliminar el archivo de chat o checkpoint para ${id}:`, err);
    }
    if (conversations.length === 0) {
        await createNewConversation("Nueva Conversación", sidebarRender, activeRender);
    } else {
        await saveConversationIndexOnly();
    }
}

export async function renameConversation(id, event, sidebarRender) {
    event.stopPropagation();
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;
    const newTitle = prompt("Escribe el nuevo nombre de la conversación:", chat.title);
    if (newTitle && newTitle.trim() !== "") {
        chat.title = newTitle.trim();
        if (sidebarRender) sidebarRender();
        await saveSingleConversation(id);
        await saveConversationIndexOnly();
    }
}

export function getChatPayload(chatId) {
    const currentChat = conversations.find(c => c.id === chatId);
    if (!currentChat) return [];
    return currentChat.messages.map(m => ({
        role: m.role === 'usuario' ? 'user' : 'assistant',
        content: m.content
    }));
}