/**
 * Gestión de Estado, Almacenamiento y Persistencia Multi-hilo
 */
import { fetchOllamaModels } from './ollama.js';

export let conversations = []; 
export let activeConversationId = null; 
export let currentBufferAttachments = []; 
export let favoritosText = []; 
export let favoritosImage = []; 
export let agentTools = [];

export function setConversations(val) { conversations = val; }
export function setActiveConversationId(val) { activeConversationId = val; }
export function setCurrentBufferAttachments(val) { currentBufferAttachments = val; }
export function setFavoritosText(val) { favoritosText = val; }
export function setFavoritosImage(val) { favoritosImage = val; }
export function setAgentTools(val) { agentTools = val; }

export function loadSavedSettings(apiKeyPollinationsInput, apiKeyGeminiInput, endpointOllamaInput) {
    apiKeyPollinationsInput.value = localStorage.getItem('hub_key_pollinations') || '';
    apiKeyGeminiInput.value = localStorage.getItem('hub_key_gemini') || '';
    endpointOllamaInput.value = localStorage.getItem('hub_endpoint_ollama') || 'http://127.0.0.1:11434';
}

export function loadFavorites() {
    const dataText = localStorage.getItem('hub_favorites_text');
    setFavoritosText(dataText ? JSON.parse(dataText) : []);
    const dataImg = localStorage.getItem('hub_favorites_image');
    setFavoritosImage(dataImg ? JSON.parse(dataImg) : []);
}

export function saveFavorites(appMode) {
    if (appMode === 'chat' || appMode === 'agent') {
        localStorage.setItem('hub_favorites_text', JSON.stringify(favoritosText));
    } else {
        localStorage.setItem('hub_favorites_image', JSON.stringify(favoritosImage));
    }
}

export function loadAgentTools(renderFn) {
    // Forzamos la carga de herramientas reales con scripts ejecutables lógicos correctos
    const defaultTools = [
        { 
            id: "t1", 
            name: "notebook_buffer", 
            desc: "Cuaderno de notas persistente para almacenar resúmenes y directrices de estilo entre iteraciones.",
            javascript_code: `function execute(args) {
  const action = args.action || 'read';
  const noteContent = args.content || '';
  if (action === 'write') {
    localStorage.setItem('agent_notebook_buffer', noteContent);
    return "Contenido escrito exitosamente en el cuaderno de notas persistente.";
  } else {
    return localStorage.getItem('agent_notebook_buffer') || "El cuaderno de notas está vacío actualmente.";
  }
}`
        },
        { 
            id: "t2", 
            name: "incremental_writer", 
            desc: "Escribe bloques específicos de texto directamente a buffers limpios fuera del flujo visual de chat.",
            javascript_code: `function execute(args) {
  const bufferId = args.buffer_id || 'default_buffer';
  const content = args.content || '';
  const append = args.append !== false;
  if (append) {
    const prev = localStorage.getItem('agent_buffer_' + bufferId) || '';
    localStorage.setItem('agent_buffer_' + bufferId, prev + content);
  } else {
    localStorage.setItem('agent_buffer_' + bufferId, content);
  }
  return "Escritura completada exitosamente en el buffer: " + bufferId;
}`
        },
        { 
            id: "t3", 
            name: "json_validator", 
            desc: "Verificación y corrección de esquemas JSON estrictos devueltos por los modelos rápidos.",
            javascript_code: `function execute(args) {
  try {
    if (!args.json_string) return "Error: No se proporcionó ningún string JSON para validar.";
    const parsed = JSON.parse(args.json_string);
    return "JSON perfectamente válido y estructurado. Objeto verificado correctamente.";
  } catch (e) {
    return "Error crítico de validación de esquema JSON: " + e.message;
  }
}`
        },
        { 
            id: "t4", 
            name: "chunk_reader", 
            desc: "Permite fraccionar lecturas de archivos adjuntos masivos por rangos de líneas controladas.",
            javascript_code: `function execute(args) {
  const fullText = args.text_payload || '';
  const start = parseInt(args.start_line || 0, 10);
  const end = parseInt(args.end_line || 50, 10);
  if (!fullText) return "El payload de texto está vacío.";
  const lines = fullText.split('\\n');
  const sliceOfLines = lines.slice(start, end);
  return "Mostrando líneas " + start + " a " + Math.min(end, lines.length) + " de " + lines.length + ":\\n\\n" + sliceOfLines.join('\\n');
}`
        }
    ];

    const storedData = localStorage.getItem('hub_agent_tools');
    if (storedData) {
        const parsedTools = JSON.parse(storedData);
        // Comprobamos si las herramientas existentes arrastran el string vacío "Sin lógica" para repararlas automáticamente
        const necesitaReparacion = parsedTools.some(t => t.javascript_code && t.javascript_code.includes("Sin lógica de script asociada"));
        
        if (necesitaReparacion) {
            setAgentTools(defaultTools);
            saveAgentTools();
        } else {
            setAgentTools(parsedTools);
        }
    } else {
        setAgentTools(defaultTools);
        saveAgentTools();
    }

    if (renderFn) renderFn();
}

export function saveAgentTools() {
    localStorage.setItem('hub_agent_tools', JSON.stringify(agentTools));
}

export function loadConversations(sidebarRender, activeRender) {
    const data = localStorage.getItem('hub_conversations');
    if (data) {
        setConversations(JSON.parse(data));
    } else {
        setConversations([]);
    }
    if (conversations.length === 0) {
        createNewConversation("Nueva Conversación", sidebarRender, activeRender);
    } else {
        setActiveConversationId(localStorage.getItem('hub_active_conversation_id') || conversations[0].id);
        conversations.forEach(c => {
            if (c.id === activeConversationId) c.status = 'none';
        });
        if (sidebarRender) sidebarRender();
        if (activeRender) activeRender();
    }
}

export function saveConversations() {
    localStorage.setItem('hub_conversations', JSON.stringify(conversations));
    localStorage.setItem('hub_active_conversation_id', activeConversationId);
}

export function createNewConversation(titleName = "Nueva Conversación", sidebarRender, activeRender) {
    const newChat = {
        id: `chat-${Date.now()}`,
        title: titleName,
        messages: [],
        status: 'none'
    };
    conversations.unshift(newChat);
    setActiveConversationId(newChat.id);
    saveConversations();
    if (sidebarRender) sidebarRender();
    if (activeRender) activeRender();
}

export function selectConversation(id, sidebarRender, activeRender) {
    setActiveConversationId(id);
    const chat = conversations.find(c => c.id === id);
    if (chat && chat.status === 'completed') {
        chat.status = 'none';
    }
    saveConversations();
    if (sidebarRender) sidebarRender();
    if (activeRender) activeRender();
}

export function deleteConversation(id, event, sidebarRender, activeRender) {
    event.stopPropagation();
    setConversations(conversations.filter(c => c.id !== id));
    if (conversations.length === 0) {
        createNewConversation("Nueva Conversación", sidebarRender, activeRender);
    } else {
        if (activeConversationId === id) {
            setActiveConversationId(conversations[0].id);
        }
        saveConversations();
        if (sidebarRender) sidebarRender();
        if (activeRender) activeRender();
    }
}

export function renameConversation(id, event, sidebarRender) {
    event.stopPropagation();
    const chat = conversations.find(c => c.id === id);
    if (!chat) return;
    
    const newTitle = prompt("Escribe el nuevo nombre de la conversación:", chat.title);
    if (newTitle && newTitle.trim() !== "") {
        chat.title = newTitle.trim();
        saveConversations();
        if (sidebarRender) sidebarRender();
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