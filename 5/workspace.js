// live gemini/workspace.js
// ─── FILE SYSTEM / ESPACIO DE TRABAJO ────────────────────────────────────

async function selectWorkspace() {
  try {
    workspaceHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    conversationsHandle = await workspaceHandle.getDirectoryHandle('conversaciones', { create: true });
    analysisHandle = await conversationsHandle.getDirectoryHandle('analisis', { create: true });
    
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    currentConversationFileHandle = await conversationsHandle.getFileHandle(`sesion-${dateStr}.txt`, { create: true });

    document.getElementById('workspaceStatus').textContent = `Carpeta: ${workspaceHandle.name}`;
    if (typeof showToast === 'function') showToast('Espacio de trabajo listo ✓', 'success');
  } catch (e) {
    console.error(e);
    if (e.name !== 'AbortError' && typeof showToast === 'function') showToast('Error al seleccionar carpeta', 'error');
  }
}

async function saveMessageToFile(role, text) {
  if (!currentConversationFileHandle) return;
  try {
    const file = await currentConversationFileHandle.getFile();
    const writable = await currentConversationFileHandle.createWritable({ keepExistingData: true });
    await writable.seek(file.size);
    const prefix = role === 'user' ? 'TÚ' : 'GEMINI';
    const timestamp = new Date().toLocaleTimeString('es-ES');
    await writable.write(`[${timestamp}] ${prefix}:\n${text}\n\n`);
    await writable.close();
  } catch (e) {}
}

async function startDataProcessing() {
  if (!workspaceHandle) {
    if (typeof showToast === 'function') showToast("Selecciona una carpeta primero", "error");
    return;
  }
  if (typeof dataProcessor !== 'undefined') await dataProcessor.start(workspaceHandle);
}

// ─── MEMORY TOOL FUNCTIONS ─────────────────────────────────────────────

async function getFileHandleFromPath(dirHandle, path) {
    let normalizedPath = path.replace(/\\/g, '/').trim();
    if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.substring(1);
    if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.substring(2);
    
    const parts = normalizedPath.split('/').filter(p => p && p !== '.');
    let currentHandle = dirHandle;
    
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = (i === parts.length - 1);
        let found = false;
        let nextHandle = null;
        
        for await (const [name, handle] of currentHandle.entries()) {
            if (name.toLowerCase() === part.toLowerCase()) {
                nextHandle = handle;
                found = true;
                break;
            }
        }
        if (!found) throw new Error(`Elemento no encontrado en memoria: '${part}'`);
        if (isLast && nextHandle.kind !== 'file') throw new Error(`'${part}' no es un archivo.`);
        currentHandle = nextHandle;
    }
    return currentHandle;
}

async function listMemoryFiles() {
  if (!conversationsHandle) return "Error: El usuario no ha seleccionado un espacio de trabajo aún.";
  try {
    try {
        const amHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo');
        const indexFile = await amHandle.getFileHandle('INDICE_GENERAL_DECANTADO.txt');
        const file = await indexFile.getFile();
        const indexContent = await file.text();
        return "=== MAPA EXACTO DE LA CARPETA LOCAL DEL USUARIO ===\n\n" + indexContent;
    } catch(e) {
        return "ALERTA INTERNA: El mapa aún no existe. Dile TEXTUALMENTE al usuario: 'Aún no veo tus archivos. Por favor, haz clic en el botón PROCESAR DATOS para que analice la carpeta.'";
    }
  } catch(e) {
    return `Error al listar informes: ${e.message}`;
  }
}

async function saveToMemory(filename, content) {
  if (!conversationsHandle) return "Error: Sin espacio de trabajo.";
  try {
    const fileHandle = await conversationsHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return `Éxito. '${filename}' guardado en 'conversaciones'.`;
  } catch (e) { return `Error al guardar: ${e.message}`; }
}

async function readFromMemory(filename) {
  if (!workspaceHandle) return "Error: Sin espacio de trabajo.";
  try {
    try {
      const fileHandle = await getFileHandleFromPath(conversationsHandle, filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e1) {
      const fileHandle = await getFileHandleFromPath(workspaceHandle, filename);
      const file = await fileHandle.getFile();
      return await file.text();
    }
  } catch (e) {
    return `Error al leer '${filename}'. Verifica que la ruta o el nombre sean correctos: ${e.message}`;
  }
}