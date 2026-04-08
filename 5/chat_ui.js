// live gemini/chat_ui.js
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
    if (typeof saveMessageToFile === 'function') saveMessageToFile('gemini', text);
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
  if (typeof saveMessageToFile === 'function') saveMessageToFile(role, text);
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
  if (!el) return; // Protección anti-nulos añadida
  el.textContent = text;
  el.classList.add('visible');
}

function clearLiveTranscript() {
  const el = document.getElementById('transcriptLive');
  if (!el) return; // Protección anti-nulos añadida
  el.textContent = '';
  el.classList.remove('visible');
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
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