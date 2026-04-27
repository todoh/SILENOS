//
// ─── INIT MODELS ──────────────────────────────────────────────
const sel = document.getElementById('model-select');
MODELS.forEach(m => {
  const o = document.createElement('option');
  o.value = m.id;
  o.textContent = m.label;
  if (m.id === state.selectedModel) o.selected = true;
  sel.appendChild(o);
});
sel.addEventListener('change', () => {
  state.selectedModel = sel.value;
  updateMetaBar();
  save();
});

function updateMetaBar() {
  const m = MODELS.find(x => x.id === state.selectedModel);
  document.getElementById('meta-model').textContent = m ? m.label : '';
}
updateMetaBar();

// ─── CONVERSATIONS SIDEBAR ────────────────────────────────────
function renderSidebar() {
  const list = document.getElementById('conversations-list');
  list.innerHTML = '';
  const sorted = [...state.conversations].reverse();
  sorted.forEach(conv => {
    const el = document.createElement('div');
    el.className = 'conv-item' + (conv.id === state.activeConvId ? ' active' : '');
    const title = conv.title || 'Sin título';
    el.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis">${title}</span><span class="conv-del" data-id="${conv.id}">✕</span>`;
    el.querySelector('span:first-child').addEventListener('click', () => {
      state.activeConvId = conv.id;
      renderSidebar();
      renderMessages();
    });
    el.querySelector('.conv-del').addEventListener('click', (e) => {
      e.stopPropagation();
      state.conversations = state.conversations.filter(c => c.id !== conv.id);
      if (state.activeConvId === conv.id) state.activeConvId = null;
      save();
      renderSidebar();
      renderMessages();
    });
    list.appendChild(el);
  });
}

document.getElementById('new-chat-btn').addEventListener('click', () => {
  const id = Date.now().toString();
  const conv = { id, title: 'Nueva conversación', messages: [], model: state.selectedModel, created: Date.now() };
  state.conversations.push(conv);
  state.activeConvId = id;
  save();
  renderSidebar();
  renderMessages();
});

// ─── MESSAGES & UI RENDERER ──────────────────────────────────
function renderMessages() {
  const container = document.getElementById('messages');
  const emptyState = document.getElementById('empty-state');
  const conv = getActiveConv();

  Array.from(container.children).forEach(c => {
    if (c.id !== 'empty-state') c.remove();
  });

  if (!conv || conv.messages.length === 0) {
    emptyState.style.display = 'flex';
    return;
  }
  emptyState.style.display = 'none';
  
  conv.messages.forEach(msg => appendMessageEl(msg));
  container.scrollTop = container.scrollHeight;
}

function appendMessageEl(msg) {
  const emptyState = document.getElementById('empty-state');
  if (emptyState) emptyState.style.display = 'none';

  const container = document.getElementById('messages');
  const div = document.createElement('div');
  div.id = 'msg-' + msg.id; 
  
  const isDoc = msg.role === 'assistant' && (msg.mode === 'midi' || msg.mode === 'conversor');
  div.className = `msg ${msg.role} ${isDoc ? 'document' : ''}`;
  
  div.innerHTML = buildMessageHTML(msg);
  container.appendChild(div);
  
  attachMessageEvents(div, msg);
  
  container.scrollTop = container.scrollHeight;
  return div;
}

function buildMessageHTML(msg) {
  const role = msg.role;
  const text = msg.content || '';
  const mode = msg.mode || 'chat';
  const isDoc = role === 'assistant' && (mode === 'midi' || mode === 'conversor');
  
  let label = 'Gemini';
  if (role === 'user') {
    label = 'Tú';
  } else if (isDoc) {
    label = mode === 'conversor' ? 'Sistema (CONVERSOR)' : `Gemini (${mode.toUpperCase()})`;
  }

  let html = `<div class="msg-label">${label}</div>`;

  if ((mode === 'midi' || mode === 'conversor') && role === 'assistant') {
    html += buildMidiHTML(msg, text);
  } else if (isDoc) {
    html += `<div class="msg-text doc-content">${escHtml(text)}</div>
             <div class="doc-actions">
               <button class="doc-btn copy-btn">Copiar</button>
             </div>`;
  } else {
    html += `<div class="msg-text">${escHtml(text)}</div>`;
  }
  
  return html;
}

function buildMidiHTML(msg, text) {
  let html = '';
  
  if (!msg.midiData && !text) {
    let statusText = msg.mode === 'conversor' ? 'Analizando JSON y convirtiendo a MIDI...' : 'Analizando petición y componiendo música...';
    return `<div class="msg-text doc-content">${statusText}</div>`;
  }
  
  html += `<div class="msg-text doc-content">${escHtml(text)}</div>`;
  
  html += `<div class="doc-actions">`;
  if (msg.midiData) {
    html += `<button class="doc-btn dl-midi-btn">⬇ Descargar .MID</button>`;
  }
  html += `<button class="doc-btn copy-btn">Copiar JSON</button>
         </div>`;
  return html;
}

window.actualizarMensajeUI = function(msgId) {
  const el = document.getElementById('msg-' + msgId);
  if (!el) return;
  const conv = getActiveConv();
  const msg = conv.messages.find(m => m.id === msgId);
  if (!msg) return;
  
  el.innerHTML = buildMessageHTML(msg);
  attachMessageEvents(el, msg);
  
  const container = document.getElementById('messages');
  if (container.scrollHeight - container.scrollTop < container.clientHeight + 200) {
    container.scrollTop = container.scrollHeight;
  }
}

function attachMessageEvents(div, msg) {
  const copyBtn = div.querySelector('.copy-btn');
  if (copyBtn) copyBtn.addEventListener('click', () => { navigator.clipboard.writeText(msg.content); copyBtn.textContent='¡Copiado!'; setTimeout(()=>copyBtn.textContent='Copiar JSON',2000); });
  
  const dlBtn = div.querySelector('.download-btn');
  if (dlBtn) dlBtn.addEventListener('click', () => downloadText(msg.content, `${msg.mode}_${Date.now()}.txt`));

  const dlMidiBtn = div.querySelector('.dl-midi-btn');
  if (dlMidiBtn && msg.midiData) {
    dlMidiBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = msg.midiData;
      a.download = `Silenos_Composicion_${Date.now()}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
}

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── LOG ──────────────────────────────────────────────────────
function addLog(entry) {
  state.log.unshift(entry);
  if (state.log.length > 200) state.log = state.log.slice(0, 200);
  save();
}

function renderLog() {
  const body = document.getElementById('log-body');
  body.innerHTML = '';
  if (state.log.length === 0) {
    body.innerHTML = '<div style="font-size:11px;opacity:0.3">Sin registros todavía.</div>';
    return;
  }
  state.log.forEach(e => {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const statusLabel = e.status === 'ok' ? '✓ OK' : '✗ Error';
    let detail = e.status === 'ok' ? `tokens: ${e.tokens?.totalTokenCount || '–'}` : (e.error || '');
    div.innerHTML = `
      <div class="log-status ${e.status}">${statusLabel}</div>
      <div class="log-model">${e.model}</div>
      <div class="log-ts">${e.ts}</div>
      <div class="log-detail">${escHtml(detail)}</div>
    `;
    body.appendChild(div);
  });
}

document.getElementById('log-btn').addEventListener('click', () => { renderLog(); document.getElementById('log-modal').classList.add('open'); });
document.getElementById('log-close').addEventListener('click', () => document.getElementById('log-modal').classList.remove('open'));
document.getElementById('log-clear').addEventListener('click', () => { state.log = []; save(); renderLog(); });

// ─── CONFIG (Metralleta Integrada) ─────────────────────────
function openConfig() {
  document.getElementById('api-key-input').value = state.apiKey;
  document.getElementById('config-modal').classList.add('open');
}
document.getElementById('config-btn').addEventListener('click', openConfig);
document.getElementById('config-close').addEventListener('click', () => document.getElementById('config-modal').classList.remove('open'));

document.getElementById('save-config-btn').addEventListener('click', () => {
  const rawValue = document.getElementById('api-key-input').value.trim();
  state.apiKey = rawValue;
  state.apiKeys = rawValue.split(',')
    .map(k => k.trim())
    .filter(k => k.length > 5);
    
  state.currentKeyIndex = 0;
  save();
  alert(`Metralleta cargada con ${state.apiKeys.length} llaves.`);
  document.getElementById('config-modal').classList.remove('open');
});

// ─── MODE SELECTOR ────────────────────────────────────
window.currentMode = 'chat';
const modeBtns = document.querySelectorAll('.mode-btn');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    window.currentMode = btn.getAttribute('data-mode');
    
    if (window.currentMode === 'chat') {
      userInput.placeholder = "Escribe un mensaje...";
      sendBtn.textContent = "enviar";
    } else if (window.currentMode === 'midi') {
      userInput.placeholder = "Pide tu composición MIDI...";
      sendBtn.textContent = "enviar";
    } else if (window.currentMode === 'conversor') {
      userInput.placeholder = "Pega aquí el JSON generado por otro programa...";
      sendBtn.textContent = "generar y terminar";
    }
    userInput.focus();
  });
});

// ─── BOOT ─────────────────────────────────────────────────────
renderSidebar();
renderMessages();
// Hemos quitado la apertura automática de openConfig() para no molestar 
// a los que solo quieren usar el conversor. La app pedirá la clave 
// automáticamente si intentan usar "Chat" o "MIDI".