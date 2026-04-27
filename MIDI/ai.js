// ─── AI CORE AND CHAT MODE (ai.js) ────────────────────────────

async function fetchGemini(promptText, history = []) {
  let attempts = 0;

  while (true) {
    const currentKey = getCurrentApiKey();
    if (!currentKey) throw new Error("No hay API Keys configuradas.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.selectedModel}:generateContent?key=${currentKey}`;
    
    const contents = history.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: promptText }] });
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });
      
      const data = await res.json();

      if (res.status === 429 || res.status === 503) {
        attempts++;
        const oldIndex = state.currentKeyIndex;
        const statusCode = res.status;
        
        getNextApiKey(); 
        console.warn(`Error ${statusCode} detectado en Llave #${oldIndex}. Rotando... Intento acumulado: ${attempts}`);
        
        if (window.ProgressBar) ProgressBar.update(ProgressBar.currentPercent || 0, `${statusCode}: Rotando a Llave #${state.currentKeyIndex} (Esperando 5s)`);

        await new Promise(resolve => setTimeout(resolve, 5000));
        continue; 
      }

      if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
      
      return {
        text: data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
        usage: data?.usageMetadata
      };

    } catch (err) {
      if (err.message.includes("429") || err.message.includes("503") || err.message.includes("fetch")) {
        attempts++;
        getNextApiKey();
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      throw err;
    }
  }
}

function extractJsonData(text) {
  try {
    const startObj = text.indexOf('{');
    const endObj = text.lastIndexOf('}');
    const startArr = text.indexOf('[');
    const endArr = text.lastIndexOf(']');
    
    let start = -1;
    let end = -1;

    if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
         start = startObj; end = endObj;
    } else if (startArr !== -1) {
         start = startArr; end = endArr;
    }

    if (start !== -1 && end !== -1) {
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

async function send() {
  const mode = window.currentMode || 'chat';
  const input = document.getElementById('user-input');
  const rawText = input.value.trim();
  
  if (!rawText || state.isLoading) return;
  if (state.apiKeys.length === 0) { openConfig(); return; }

  if (!state.activeConvId) {
    const id = Date.now().toString();
    const conv = { id, title: rawText.slice(0, 40), messages: [], model: state.selectedModel, created: Date.now() };
    state.conversations.push(conv);
    state.activeConvId = id;
    renderSidebar();
  }

  const conv = getActiveConv();
  
  const userMsgId = 'usr_' + Date.now().toString() + Math.random().toString(36).substr(2,5);
  const userMsg = { id: userMsgId, role: 'user', content: rawText, mode: mode };
  
  conv.messages.push(userMsg);
  input.value = '';
  input.style.height = 'auto';
  save();
  renderSidebar();
  appendMessageEl(userMsg);

  state.isLoading = true;
  document.getElementById('send-btn').disabled = true;

  try {
    const ts = new Date().toISOString();

    if (mode === 'chat') {
      const history = conv.messages.slice(0, -1);
      const res = await fetchGemini(rawText, history);
      
      const astMsgId = 'ast_' + Date.now().toString() + Math.random().toString(36).substr(2,5);
      const astMsg = { id: astMsgId, role: 'assistant', content: res.text, mode: mode };
      conv.messages.push(astMsg);
      save();
      appendMessageEl(astMsg);
      addLog({ status: 'ok', model: state.selectedModel, ts, prompt: rawText.slice(0, 80), tokens: res.usage });

    } else if (mode === 'midi') {
      const astMsgId = 'ast_' + Date.now().toString() + Math.random().toString(36).substr(2,5);
      const astMsg = { 
        id: astMsgId, 
        role: 'assistant', 
        content: '', 
        mode: 'midi',
        rawInput: rawText,
        midiData: null    
      };
      conv.messages.push(astMsg);
      save();
      appendMessageEl(astMsg);
      await window.procesarMidi(rawText, ts, astMsgId);

    } else if (mode === 'conversor') {
      // Usar la caja como conversor directo (sin Gemini)
      const astMsgId = 'ast_' + Date.now().toString() + Math.random().toString(36).substr(2,5);
      const astMsg = { 
        id: astMsgId, 
        role: 'assistant', 
        content: '', 
        mode: 'conversor',
        rawInput: rawText,
        midiData: null    
      };
      conv.messages.push(astMsg);
      save();
      appendMessageEl(astMsg);
      await window.procesarJsonAMidi(rawText, astMsgId);
    }

  } catch (err) {
    if (window.ProgressBar) ProgressBar.hide();
    const errId = 'err_' + Date.now().toString() + Math.random().toString(36).substr(2,5);
    const errMsg = { id: errId, role: 'assistant', content: `Error: ${err.message}`, mode: mode };
    conv.messages.push(errMsg);
    save();
    appendMessageEl(errMsg);
    addLog({ status: 'error', model: state.selectedModel, ts: new Date().toISOString(), prompt: rawText.slice(0, 80), error: err.message });
  }

  state.isLoading = false;
  document.getElementById('send-btn').disabled = false;
}

document.getElementById('send-btn').addEventListener('click', send);
document.getElementById('user-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); send(); }
});