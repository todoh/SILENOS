// live gemini/ui.js
// ─── INIT & DOM EVENTS ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  const savedPersonality = localStorage.getItem('gemini_personality') || '';
  const savedInstructions = localStorage.getItem('gemini_instructions') || '';
  if(document.getElementById('aiPersonalityInput')) document.getElementById('aiPersonalityInput').value = savedPersonality;
  if(document.getElementById('aiInstructionsInput')) document.getElementById('aiInstructionsInput').value = savedInstructions;

  buildVoiceViz();
  animateIdleBars();
  
  makeDraggable(document.getElementById('webModal'), document.getElementById('webModalHeader'));

  // --- NUEVO: AUTO-ENLACE AL KERNEL DE SILENOS 4 ---
  setTimeout(() => {
      if (window.parent && (window.parent.currentHandle || window.parent.rootHandle)) {
          autoLinkToSilenos4();
      }
  }, 1000);
});

async function autoLinkToSilenos4() {
    try {
        workspaceHandle = window.parent.currentHandle || window.parent.rootHandle;
        
        conversationsHandle = await workspaceHandle.getDirectoryHandle('conversaciones', { create: true });
        analysisHandle = await conversationsHandle.getDirectoryHandle('analisis', { create: true });
        
        const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
        currentConversationFileHandle = await conversationsHandle.getFileHandle(`sesion-${dateStr}.txt`, { create: true });

        const statusEl = document.getElementById('workspaceStatus');
        const btnEl = document.getElementById('workspaceBtn');
        
        if (statusEl) statusEl.textContent = `KERNEL ENLAZADO: ${workspaceHandle.name}`;
        if (btnEl) {
            btnEl.innerHTML = `<svg width="18" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg> KERNEL CONECTADO`;
            btnEl.style.background = "var(--text)";
            btnEl.style.color = "var(--surface)";
        }
        
        showToast('Sistema de Archivos de Silenos 4 Enlazado ✓', 'success');

        if (typeof startContinuousRecording === 'function') {
            startContinuousRecording();
        }
    } catch (e) {
        console.error("Error al auto-enlazar con Silenos 4:", e);
    }
}

function savePersonalitySettings() {
  const personality = document.getElementById('aiPersonalityInput').value.trim();
  const instructions = document.getElementById('aiInstructionsInput').value.trim();
  localStorage.setItem('gemini_personality', personality);
  localStorage.setItem('gemini_instructions', instructions);
  showToast('Personalización guardada ✓', 'success');
}

// ─── DRAG LOGIC PARA EL MODAL ────────────────────────────────────────────
function makeDraggable(elmnt, header) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (header) {
    header.onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    if (elmnt.classList.contains('maximized') || elmnt.classList.contains('minimized')) return;
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// ─── UI WEB MODAL MANAGER (CON GESTIÓN PROFUNDA DEL DOM) ──────────────────
const uiWeb = {
  isMaximized: false,
  currentBlobUrl: null, // Memoria profunda del blob actual para evitar fugas

  open(url) {
    const m = document.getElementById('webModal');
    m.classList.remove('hidden', 'minimized');
    if(!this.isMaximized) m.classList.remove('maximized');
    document.getElementById('webModalUrl').value = url;
    
    const container = document.querySelector('.web-modal-body');
    const oldIframe = document.getElementById('webIframe');
    
    // Destrucción estructural del iframe para aniquilar bloqueos de seguridad previos
    if (oldIframe) {
        oldIframe.remove();
    }
    
    const newIframe = document.createElement('iframe');
    newIframe.id = 'webIframe';
    newIframe.setAttribute('allow', 'camera; microphone; display-capture; fullscreen');
    newIframe.src = url;
    container.appendChild(newIframe);

    // Revocar el Blob anterior en la capa del sistema
    if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentBlobUrl);
    }
    this.currentBlobUrl = url;
  },

  close() {
    document.getElementById('webModal').classList.add('hidden');
    const iframe = document.getElementById('webIframe');
    if (iframe) iframe.src = '';
    
    if (this.currentBlobUrl && this.currentBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.currentBlobUrl);
        this.currentBlobUrl = null;
    }
  },

  minimize() {
    const m = document.getElementById('webModal');
    m.classList.remove('maximized');
    m.classList.toggle('minimized');
  },

  maximize() {
    const m = document.getElementById('webModal');
    m.classList.remove('minimized');
    m.classList.toggle('maximized');
    this.isMaximized = m.classList.contains('maximized');
  },

  reload() {
    const iframe = document.getElementById('webIframe');
    if (iframe) {
        // Fuerza al iframe a recargar el blob o URL actual en el mismo contexto
        iframe.src = iframe.src;
    }
  }
};

// ─── FILE SYSTEM / ESPACIO DE TRABAJO ────────────────────────────────────
async function selectWorkspace() {
  try {
    workspaceHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    conversationsHandle = await workspaceHandle.getDirectoryHandle('conversaciones', { create: true });
    analysisHandle = await conversationsHandle.getDirectoryHandle('analisis', { create: true });
    
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    currentConversationFileHandle = await conversationsHandle.getFileHandle(`sesion-${dateStr}.txt`, { create: true });

    document.getElementById('workspaceStatus').textContent = `Carpeta: ${workspaceHandle.name}`;
    showToast('Espacio de trabajo listo ✓', 'success');

    // Iniciar grabación continua al conectar la carpeta
    if (typeof startContinuousRecording === 'function') {
        startContinuousRecording();
    }
  } catch (e) {
    console.error(e);
    if (e.name !== 'AbortError') showToast('Error al seleccionar carpeta', 'error');
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
    showToast("Selecciona una carpeta primero", "error");
    return;
  }
  await dataProcessor.start(workspaceHandle);
}

// ─── MEMORY TOOL FUNCTIONS ─────────────────────────────────────────────
async function getFileHandleFromPath(dirHandle, path) {
    // Normalización extrema idéntica a explorer.js para compatibilidad universal
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
      // Primero intenta encontrarlo en la carpeta de memoria interna
      const fileHandle = await getFileHandleFromPath(conversationsHandle, filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e1) {
      // Si falla, busca en todo el Workspace de manera tolerante a errores
      const fileHandle = await getFileHandleFromPath(workspaceHandle, filename);
      const file = await fileHandle.getFile();
      return await file.text();
    }
  } catch (e) {
    return `Error al leer '${filename}'. Verifica que la ruta o el nombre sean correctos: ${e.message}`;
  }
}

// ─── VOICE VIZ ───────────────────────────────────────────────────────────
function buildVoiceViz() {
  const viz = document.getElementById('voiceViz');
  if(!viz) return;
  viz.innerHTML = '';
  bars = [];
  for (let i = 0; i < 28; i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    viz.appendChild(b);
    bars.push(b);
  }
}

function animateIdleBars() {
  clearInterval(idleAnim);
  idleAnim = setInterval(() => {
    bars.forEach((b, i) => {
      const h = 4 + Math.sin(Date.now() * 0.003 + i * 0.5) * 3;
      b.style.height = h + 'px';
      b.classList.remove('active');
    });
  }, 50);
}

function animateActiveBars(dataArray) {
  clearInterval(idleAnim);
  if (!analyserNode || !dataArray) return;
  analyserNode.getByteFrequencyData(dataArray);
  const step = Math.floor(dataArray.length / bars.length);
  bars.forEach((b, i) => {
    const val = dataArray[i * step] / 255;
    const h = 4 + val * 40;
    b.style.height = h + 'px';
    b.classList.toggle('active', val > 0.05);
  });
  if (isMicActive) requestAnimationFrame(() => animateActiveBars(dataArray));
  else animateIdleBars();
}

// ─── UI HELPERS ──────────────────────────────────────────────────────────
function onConnected() {
  document.getElementById('connectBtn').textContent = '';
  document.getElementById('connectBtn').innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>
    </svg> ACTIVO`;
  document.getElementById('disconnectBtn').style.display = 'flex';
  document.getElementById('disconnectBtn').disabled = false;
  document.getElementById('micBtn').disabled = false;
  document.getElementById('videoBtn').disabled = false;
  document.getElementById('screenBtn').disabled = false;
  document.getElementById('sendBtn').disabled = false;
  document.getElementById('emptyState').style.display = 'none';
  audioContext = new AudioContext({ sampleRate: 24000 });
  
  startSummarizer();
  startParallelAgents();
}

function onDisconnected() {
  document.getElementById('connectBtn').innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
    </svg> CONECTAR`;
  document.getElementById('disconnectBtn').style.display = 'none';
  document.getElementById('disconnectBtn').disabled = true;
  document.getElementById('micBtn').disabled = true;
  document.getElementById('videoBtn').disabled = true;
  document.getElementById('screenBtn').disabled = true;
  document.getElementById('sendBtn').disabled = true;
  
  stopSummarizer();
  stopParallelAgents();
}

// ─── FUNCIONES PARA CHAT EN TIEMPO REAL ──────────────────────────────────
let activeGeminiMsgDiv = null;

function updateActiveGeminiMessage(text) {
  const msgs = document.getElementById('messages');
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.style.display = 'none';

  if (!activeGeminiMsgDiv) {
    activeGeminiMsgDiv = document.createElement('div');
    activeGeminiMsgDiv.className = 'msg gemini';
    activeGeminiMsgDiv.innerHTML = `
      <div class="msg-label">GEMINI</div>
      <div class="msg-bubble">${escapeHtml(text)}</div>`;
    msgs.appendChild(activeGeminiMsgDiv);
  } else {
    const bubble = activeGeminiMsgDiv.querySelector('.msg-bubble');
    if (bubble) bubble.innerHTML = escapeHtml(text);
  }
  msgs.scrollTop = msgs.scrollHeight;
}

function finalizeActiveGeminiMessage(text, isTranscript = false) {
  if (activeGeminiMsgDiv) {
    const bubble = activeGeminiMsgDiv.querySelector('.msg-bubble');
    if (bubble) bubble.innerHTML = escapeHtml(text) + (isTranscript ? '<div class="msg-audio-badge">◉ audio</div>' : '');
    activeGeminiMsgDiv = null; 
    saveMessageToFile('gemini', text);
    fullConversationText += `[GEMINI]: ${text}\n`;
  } else {
    addMessage('gemini', text, isTranscript);
  }
}

function addMessage(role, text, isTranscript = false) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  div.innerHTML = `
    <div class="msg-label">${role === 'user' ? 'TÚ' : 'GEMINI'}</div>
    <div class="msg-bubble">${escapeHtml(text)}${isTranscript ? '<div class="msg-audio-badge">◉ audio</div>' : ''}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  saveMessageToFile(role, text);
  const prefix = role === 'user' ? 'TÚ' : 'GEMINI';
  fullConversationText += `[${prefix}]: ${text}\n`;
}

function addSystemMsg(text) {
  const msgs = document.getElementById('messages');
  const div = document.createElement('div');
  div.style.cssText = 'text-align:center; font-family: Space Mono, monospace; font-size:9px; color: var(--text-dim); letter-spacing:0.1em; padding: 4px 0;';
  div.textContent = '— ' + text.toUpperCase() + ' —';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function updateLiveTranscript(text) {
  const el = document.getElementById('transcriptLive');
  el.textContent = text;
  el.classList.add('visible');
}

function clearLiveTranscript() {
  const el = document.getElementById('transcriptLive');
  el.textContent = '';
  el.classList.remove('visible');
}

function setStatus(text, type) {
  document.getElementById('statusText').textContent = text;
  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot' + (type ? ' ' + type : '');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.className = 'toast', 2800);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function updateProcessStatus(id, isActive) {
  const el = document.getElementById(id);
  if (el) {
    if (isActive) el.classList.add('active');
    else el.classList.remove('active');
  }
}

// ─── TOGGLE MENU ─────────────────────────────────────────────────────────
function toggleSettingsMenu() {
  const menu = document.getElementById('settingsMenu');
  if (menu) {
    menu.classList.toggle('open');
  }
}