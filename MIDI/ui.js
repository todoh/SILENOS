// ════════════════════════════════════════════════════════════════
//  UI CONTROLLER & RENDERER (ui.js)
// ════════════════════════════════════════════════════════════════

// INIT MODELS
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

// CONVERSATIONS SIDEBAR
function renderSidebar() {
  const list = document.getElementById('conversations-list');
  list.innerHTML = '';
  const sorted = [...state.conversations].reverse();
  sorted.forEach(conv => {
    const el = document.createElement('div');
    el.className = 'conv-item' + (conv.id === state.activeConvId ? ' active' : '');
    const title = conv.title || 'Sin título';
    el.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis">${title}</span><span class="conv-del" data-id="${conv.id}">×</span>`;
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

// MESSAGES & UI RENDERER
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
    label = mode === 'conversor' ? 'Sistema (CONVERSOR MIDI)' : 'Sistema Agéntico MIDI (14 Llamadas)';
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
  const st = msg.agentState;

  if (st) {
    const stepNum = Math.min(st.currentStep || 1, st.totalSteps || 14);
    const statusClass = st.isGenerating ? 'book-status active' : 'book-status';
    const statusLabel = st.completed
      ? `✔ Obra Completada y Supervisada (14/14 llamadas) · "${escHtml(st.songData?.title || 'Silenos MIDI')}"`
      : st.isGenerating
        ? `⚡ Generando y Supervisando Obra: Llamada ${stepNum} de ${st.totalSteps}...`
        : `⏸ Generación Pausada en Llamada ${stepNum} de ${st.totalSteps}`;

    html += `<div class="${statusClass}">${statusLabel}</div>`;

    if (msg.errorText) {
      html += `<div style="color:#d93025;font-size:12px;margin-bottom:10px;font-weight:bold;">${escHtml(msg.errorText)}</div>`;
    }

    if (st.logs && st.logs.length > 0) {
      html += `<div class="agent-log-box">`;
      st.logs.forEach(l => {
        html += `<div class="agent-log-line">${escHtml(l)}</div>`;
      });
      html += `</div>`;
    }
  } else if (!msg.midiData && !text) {
    let statusText = msg.mode === 'conversor' ? 'Analizando JSON y convirtiendo a MIDI...' : 'Iniciando agentes compositores...';
    return `<div class="msg-text doc-content">${statusText}</div>`;
  }

  // REPRODUCTOR VISUAL Y PIANO ROLL SI HAY NOTAS
  const songObj = st?.songData || extractJsonData(text);
  const hasNotes = songObj && songObj.tracks && songObj.tracks.some(t => t.notes && t.notes.length > 0);

  if (hasNotes) {
    const bpm = songObj.bpm || 120;
    let trackPills = '';
    songObj.tracks.forEach((t, idx) => {
      const nCount = t.notes ? t.notes.length : 0;
      trackPills += `<button class="track-mute-pill" data-track="${idx}" title="Silenciar / Activar pista">${escHtml(t.name || `Pista ${idx+1}`)} (Ch ${t.channel || idx+1} · ${nCount} n)</button>`;
    });

    html += `
      <div id="player-${msg.id}" class="midi-player-box">
        <div class="midi-player-header">
          <span class="midi-song-title">${escHtml(songObj.title || 'Previsualización Interactiva')}</span>
          <span class="midi-time-readout">0:00 / 0:00 · ${bpm} BPM</span>
        </div>
        <canvas class="midi-canvas" width="680" height="125" title="Haz clic para saltar a cualquier compás"></canvas>
        <div class="midi-track-pills">${trackPills}</div>
        <div class="midi-player-controls">
          <button class="doc-btn midi-play-btn">▶ Escuchar MIDI</button>
          <button class="doc-btn midi-stop-btn">⏹ Stop</button>
          <button class="doc-btn midi-wav-btn download-all-btn">🔊 Descargar Audio (.WAV)</button>
          ${msg.midiData ? `<button class="doc-btn dl-midi-btn">⬇ Descargar .MID</button>` : ''}
        </div>
      </div>
    `;
  }

  if (text) {
    html += `
      <details class="midi-json-details">
        <summary>Ver Estructura JSON Musical Completa</summary>
        <div class="msg-text doc-content" style="margin-top:10px;">${escHtml(text)}</div>
      </details>
    `;
  }

  html += `<div class="doc-actions" style="margin-top:12px;">`;
  if (st && st.isGenerating) {
    html += `<button class="doc-btn stop-btn agent-stop-btn">⏹ Pausar Agentes</button>`;
  } else if (st && !st.completed) {
    html += `<button class="doc-btn resume-btn agent-resume-btn">▶ Reanudar (${st.currentStep}/14)</button>`;
  }
  html += `<button class="doc-btn copy-btn">Copiar JSON</button></div>`;

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
  if (container.scrollHeight - container.scrollTop < container.clientHeight + 240) {
    container.scrollTop = container.scrollHeight;
  }
};

function attachMessageEvents(div, msg) {
  const copyBtn = div.querySelector('.copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content);
      copyBtn.textContent = '¡Copiado!';
      setTimeout(() => copyBtn.textContent = 'Copiar JSON', 2000);
    });
  }

  const dlBtn = div.querySelector('.download-btn');
  if (dlBtn) dlBtn.addEventListener('click', () => downloadText(msg.content, `${msg.mode}_${Date.now()}.txt`));

  const dlMidiBtn = div.querySelector('.dl-midi-btn');
  if (dlMidiBtn && msg.midiData) {
    dlMidiBtn.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = msg.midiData;
      const cleanName = (msg.agentState?.songData?.title || 'Silenos_Composicion').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanName}_${Date.now()}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  // Botones Pausa / Reanudar Agente 14 llamadas
  const stopAgentBtn = div.querySelector('.agent-stop-btn');
  if (stopAgentBtn) {
    stopAgentBtn.addEventListener('click', () => {
      window.detenerMidiAgentico(msg.id);
    });
  }

  const resumeAgentBtn = div.querySelector('.agent-resume-btn');
  if (resumeAgentBtn) {
    resumeAgentBtn.addEventListener('click', () => {
      window.procesarMidi(msg.rawInput, new Date().toISOString(), msg.id);
    });
  }

  // Eventos del Reproductor MIDI y Sintetizador WAV
  const songObj = msg.agentState?.songData || extractJsonData(msg.content || '');
  if (songObj && songObj.tracks && window.MidiPlayer) {
    const totalBeats = window.MidiPlayer.getTotalBeats(songObj);
    const bpm = songObj.bpm || 120;

    setTimeout(() => {
      const inst = window.MidiPlayer.activeInstances[msg.id];
      const curBeat = inst ? inst.pausedBeat : 0;
      const muted = inst ? inst.mutedTracks : {};
      window.MidiPlayer.drawPianoRoll(msg.id, songObj, curBeat, totalBeats, muted);
      window.MidiPlayer.updateTimeUI(msg.id, curBeat, totalBeats, bpm);
    }, 20);

    const playBtn = div.querySelector('.midi-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        const inst = window.MidiPlayer.activeInstances[msg.id];
        if (inst && inst.isPlaying) {
          window.MidiPlayer.pause(msg.id);
        } else {
          window.MidiPlayer.play(msg.id, songObj);
        }
      });
    }

    const stopBtn = div.querySelector('.midi-stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        window.MidiPlayer.stop(msg.id, true);
      });
    }

    const wavBtn = div.querySelector('.midi-wav-btn');
    if (wavBtn) {
      wavBtn.addEventListener('click', (e) => {
        window.MidiPlayer.exportToWav(songObj, e.currentTarget);
      });
    }

    const canvas = div.querySelector('.midi-canvas');
    if (canvas) {
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        window.MidiPlayer.seek(msg.id, songObj, ratio * totalBeats);
      });
    }

    const mutePills = div.querySelectorAll('.track-mute-pill');
    mutePills.forEach(pill => {
      pill.addEventListener('click', () => {
        const tIdx = parseInt(pill.getAttribute('data-track'), 10);
        const isMuted = window.MidiPlayer.toggleTrackMute(msg.id, songObj, tIdx);
        pill.classList.toggle('muted', isMuted);
      });
    });
  }
}

function escHtml(t) {
  return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function downloadText(text, filename, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// LOG
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
    const statusLabel = e.status === 'ok' ? '● OK' : '✕ Error';
    let detail = e.status === 'ok' ? `${e.prompt || ''} · tokens: ${e.tokens?.totalTokenCount || '—'}` : (e.error || '');
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

// GESTOR DE GENERACIONES MIDI MODAL
const midiManagerBtn = document.getElementById('midi-manager-btn');
if (midiManagerBtn) {
  midiManagerBtn.addEventListener('click', () => {
    if (window.MidiPlayer) window.MidiPlayer.renderLibraryModal();
    document.getElementById('midi-manager-modal').classList.add('open');
  });
}
const midiManagerClose = document.getElementById('midi-manager-close');
if (midiManagerClose) {
  midiManagerClose.addEventListener('click', () => {
    if (window.MidiPlayer) window.MidiPlayer.stopAll();
    document.getElementById('midi-manager-modal').classList.remove('open');
  });
}

// CONFIG (Metralleta Integrada)
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

// MODE SELECTOR
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
      userInput.placeholder = "Describe la obra musical para componerla en 14 llamadas agénticas con dirección y supervisión...";
      sendBtn.textContent = "componer (14 llamadas)";
    } else if (window.currentMode === 'conversor') {
      userInput.placeholder = "Pega aquí el JSON generado por otro programa...";
      sendBtn.textContent = "generar y escuchar";
    }
    userInput.focus();
  });
});

// BOOT
renderSidebar();
renderMessages();