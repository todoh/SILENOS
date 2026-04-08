// live gemini/connection.js
// ─── CONNECTION ───────────────────────────────────────────────────────

async function toggleConnection() {
  if (isConnected) { disconnect(); return; }
  if (!apiKey) { showToast('Guarda tu API Key primero', 'error'); return; }
  await connect();
}

async function connect() {
  setStatus('Conectando...', 'listening');
  
  try {
    // Generamos el Prompt del Sistema dinámico desde system_prompt.js
    const systemInstruction = await getSystemInstruction();

    const wsUrl = `wss://${WS_HOST}/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      // CORRECCIÓN PROFUNDA: Se exige estricto camelCase para la API Bidi de Gemini
      const setup = {
        setup: {
          model: `models/${MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'], 
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } }
          },
          systemInstruction: systemInstruction, // Referenciado desde system_prompt.js
          tools: geminiToolsConfig              // Referenciado desde tools_config.js
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
      const origOnMessage = ws.onmessage;
      const origOnClose = ws.onclose;
      
      const timeout = setTimeout(() => reject(new Error('Timeout de conexión (sin respuesta)')), 8000);

      // CORRECCIÓN PROFUNDA: Escuchar cierres prematuros para evitar el "timeout silencioso"
      ws.onclose = (e) => {
        clearTimeout(timeout);
        reject(new Error(`El servidor cerró la conexión prematuramente. Revisa la API Key o el modelo.`));
      };

      ws.onmessage = async (evt) => {
        let textData = evt.data;
        if (textData instanceof Blob) {
          textData = await textData.text();
        }
        const data = JSON.parse(textData);
        if (data.setupComplete !== undefined || data.serverContent || data.toolCall) {
          clearTimeout(timeout);
          ws.onmessage = origOnMessage;
          ws.onclose = origOnClose;
          await origOnMessage({ data: evt.data });
          resolve();
        } else if (data.error) {
          clearTimeout(timeout);
          ws.onmessage = origOnMessage;
          ws.onclose = origOnClose;
          reject(new Error(data.error.message || 'API error'));
        } else {
          clearTimeout(timeout);
          ws.onmessage = origOnMessage;
          ws.onclose = origOnClose;
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