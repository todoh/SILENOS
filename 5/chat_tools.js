// live gemini/chat_tools.js
// ─── CHAT & TOOLS ───────────────────────────────────────────────────

async function getLatestReport() {
  if (!analysisHandle) return "No hay espacio de trabajo seleccionado. Esta es una sesión nueva sin contexto previo.";
  try {
    let summaries = [];
    let voices = [];
    let reportText = "";

    try {
        const coreFile = await analysisHandle.getFileHandle('memoria_core.json');
        const file = await coreFile.getFile();
        const coreText = await file.text();
        reportText += "=== MEMORIA CORE A LARGO PLAZO (PERFIL E HISTORIA VITAL DEL USUARIO) ===\n";
        reportText += "Usa esta información para empatizar y sentirte humano conociendo el contexto vital de la persona con la que hablas.\n";
        reportText += coreText + "\n\n";
    } catch(e) {}

    for await (const entry of analysisHandle.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        if (entry.name.startsWith('resumen_interno-')) {
          summaries.push(file);
        } else if (entry.name.startsWith('informe_voz-')) {
          voices.push(file);
        }
      }
    }

    summaries.sort((a, b) => b.lastModified - a.lastModified);
    voices.sort((a, b) => b.lastModified - a.lastModified);

    const recentSummaries = summaries.slice(0, 5).reverse();
    const recentVoices = voices.slice(0, 3).reverse();

    try {
        if (typeof conversationsHandle !== 'undefined' && conversationsHandle) {
            const masivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo');
            const indexFileHandle = await masivoHandle.getFileHandle('INDICE_GENERAL_DECANTADO.txt');
            const indexFile = await indexFileHandle.getFile();
            const indexText = await indexFile.text();
            reportText += "=== CONTEXTO DE TRABAJO A LARGO PLAZO (ÍNDICE MAESTRO DEL PROYECTO) ===\n";
            reportText += indexText + "\n\n";
        }
    } catch(e) {}

    if (recentSummaries.length > 0) {
      reportText += "=== ÚLTIMOS 5 RESÚMENES INTERNOS DE MEMORIA (Evolución de la charla a medio plazo) ===\n";
      for (const file of recentSummaries) {
          reportText += `--- ${file.name} ---\n` + await file.text() + "\n\n";
      }
    }

    if (recentVoices.length > 0) {
      reportText += "=== ÚLTIMOS INFORMES DE COMPORTAMIENTO Y CONTEXTO EMOCIONAL ===\n";
      for (const file of recentVoices) {
          reportText += `--- ${file.name} ---\n` + await file.text() + "\n\n";
      }
    }

    if (reportText) {
      return "Contexto recuperado de las memorias de corto, medio y largo plazo del usuario:\n\n" + reportText;
    } else {
      return "Es la primera vez que interactúas en esta carpeta. Aún no hay informes de memoria ni contexto.";
    }
  } catch (e) {
    return "Error al leer la memoria persistente.";
  }
}

// ─── TEXT CHAT ────────────────────────────────────────────────────────
function sendTextMessage() {
  if (!isConnected || !session?.ws) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  
  addMessage('user', text); 
  input.value = '';
  autoResize(input);

  session.ws.send(JSON.stringify({
    realtimeInput: { text }
  }));
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
}

// ─── SEARCH TOOLS (GRATIS SIN API KEY) ──────────────────────────────────────
async function doGeminiSearch(query, model) {
  try {
    if (typeof showToast === 'function') showToast(`Buscando en red: ${query}...`, 'listening');
    
    // Intento 1: API de Respuestas Rápidas de DuckDuckGo
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const ddgResponse = await fetch(ddgUrl);
    const ddgData = await ddgResponse.json();

    if (ddgData.AbstractText) {
        return `=== RESULTADO DE INTERNET (DuckDuckGo) ===\n\nResumen: ${ddgData.AbstractText}\nFuente: ${ddgData.AbstractURL}`;
    }

    // Intento 2: Búsqueda abierta en Wikipedia
    const wikiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
    const wikiResponse = await fetch(wikiUrl);
    const wikiData = await wikiResponse.json();

    if (wikiData.query && wikiData.query.search.length > 0) {
        const pageId = wikiData.query.search[0].pageid;
        const textUrl = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&pageids=${pageId}&explaintext=1&exchars=2000&format=json&origin=*`;
        const textResponse = await fetch(textUrl);
        const textData = await textResponse.json();
        const extract = textData.query.pages[pageId].extract;
        
        return `=== RESULTADO DE INTERNET (Wikipedia) ===\n\nTítulo: ${wikiData.query.search[0].title}\nResumen: ${extract}`;
    }

    return `La búsqueda en internet finalizó pero no encontró resúmenes directos para la consulta: "${query}".`;
  } catch (err) {
    return `Error ejecutando la búsqueda en red: ${err.message}`;
  }
}

// ─── WEATHER TOOL (GRATIS SIN API KEY) ──────────────────────────────────────
async function getWeather(location) {
  try {
    if (typeof showToast === 'function') showToast(`Consultando clima de ${location}...`, 'listening');

    // 1. Geocodificación: Buscar latitud y longitud de la ciudad
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=es&format=json`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("Servicio de coordenadas inactivo.");

    const geoData = await geoResponse.json();
    if (!geoData.results || geoData.results.length === 0) {
        return `Aviso: No se ha encontrado ninguna ciudad llamada "${location}".`;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // 2. Consulta del clima usando las coordenadas exactas
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error("Servicio meteorológico inactivo.");

    const weatherData = await weatherResponse.json();
    const current = weatherData.current_weather;

    // Diccionario de códigos WMO (Organización Meteorológica Mundial) al español
    const wmo = {
        0: "Despejado ☀️", 1: "Mayormente despejado 🌤️", 2: "Parcialmente nublado ⛅", 3: "Nublado ☁️",
        45: "Niebla 🌫️", 48: "Niebla escarchada 🌫️", 51: "Llovizna ligera 🌧️", 53: "Llovizna moderada 🌧️", 55: "Llovizna densa 🌧️",
        61: "Lluvia leve 🌦️", 63: "Lluvia moderada 🌧️", 65: "Lluvia fuerte 🌧️", 71: "Nieve leve 🌨️", 73: "Nieve moderada ❄️", 75: "Nieve fuerte ❄️",
        95: "Tormenta eléctrica ⛈️", 96: "Tormenta con granizo leve ⛈️", 99: "Tormenta con granizo fuerte ⛈️"
    };

    const conditionText = wmo[current.weathercode] || "Condiciones variables";

    return `=== REPORTE DEL CLIMA PARA ${name.toUpperCase()} (${country}) ===
Estado: ${conditionText}
Temperatura Actual: ${current.temperature}°C
Viento: ${current.windspeed} km/h (Dirección: ${current.winddirection}°)
`;
  } catch (err) {
    return `Aviso técnico: Fallo al consultar el clima de ${location}. Error: ${err.message}.`;
  }
}

// ─── WEB BROWSING TOOLS ────────────────────────────────────────────────
const webBrowser = {
  async browse(url, analyzeModel) {
    let useModel = (analyzeModel && analyzeModel !== 'none' && analyzeModel !== false) ? analyzeModel : false;

    if (!url.startsWith('http')) {
      try {
        let cleanPath = decodeURIComponent(url.replace(/^(file|local):\/\/\/?/i, '').replace(/^(file|local):/i, ''));
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

        let content = await explorerLens.openFileText(cleanPath);

        if (content.startsWith('Error: Ruta no encontrada')) {
            const targetName = cleanPath.split('/').pop();
            
            async function deepSearch(dirHandle, target) {
                const cleanTarget = target.toLowerCase().replace(/[^a-z0-9.]/g, '');
                for await (const [name, handle] of dirHandle.entries()) {
                    const cleanName = name.toLowerCase().replace(/[^a-z0-9.]/g, '');
                    if (cleanName === cleanTarget || (cleanName.includes(cleanTarget.replace('.html', '')) && name.endsWith('.html'))) {
                        return handle;
                    }
                    if (handle.kind === 'directory' && !['node_modules', '.git', 'dist', 'build', '.next'].includes(name)) {
                        const found = await deepSearch(handle, target);
                        if (found) return found;
                    }
                }
                return null;
            }

            if (workspaceHandle) {
                const foundHandle = await deepSearch(workspaceHandle, targetName);
                if (foundHandle) {
                    const file = await foundHandle.getFile();
                    content = await file.text();
                    cleanPath = file.name; 
                } else {
                    return content; 
                }
            } else {
                return content;
            }
        } else if (content.startsWith('Error:')) {
            return content; 
        }

        const ext = cleanPath.split('.').pop().toLowerCase();
        let mimeType = 'text/plain';
        if (ext === 'html') mimeType = 'text/html';
        else if (ext === 'css') mimeType = 'text/css';
        else if (ext === 'js') mimeType = 'text/javascript';
        else if (ext === 'svg') mimeType = 'image/svg+xml'; 

        const blob = new Blob([content], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        if (typeof uiWeb !== 'undefined') {
          const m = document.getElementById('webModal');
          m.classList.remove('hidden', 'minimized');
          if (!uiWeb.isMaximized) m.classList.remove('maximized');
          document.getElementById('webModalUrl').value = `local://${cleanPath}`;
          document.getElementById('webIframe').src = blobUrl;
        }

        if (useModel) {
          return `=== ANÁLISIS DESACTIVADO DEL ARCHIVO LOCAL ${cleanPath} ===\n\nEl análisis de navegación ha sido desactivado. Solo opera Gemini Live.`;
        } else {
          return `Comando ejecutado: Archivo local '${cleanPath}' encontrado exitosamente y renderizado visualmente en el navegador IA del usuario.`;
        }
      } catch (e) {
        return `Error crítico abriendo archivo local ${url}: ${e.message}`;
      }
    }

    if (typeof uiWeb !== 'undefined') {
      uiWeb.open(url);
    }
    
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) return `Error: No se pudo obtener el contenido de ${url}`;
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      let textContent = doc.body ? doc.body.innerText.replace(/\s+/g, ' ').trim() : '';
      
      if (textContent.length > 30000) textContent = textContent.substring(0, 30000) + "... [Contenido truncado]";

      if (useModel) {
        return `=== ANÁLISIS DESACTIVADO DE LA WEB ${url} ===\n\nEl análisis de navegación ha sido desactivado. Solo opera Gemini Live.`;
      } else {
        return `=== CONTENIDO DE LA WEB ${url} ===\n\n${textContent}`;
      }
    } catch (err) {
      return `Error navegando a ${url}: ${err.message}`;
    }
  },

  async interact(args) {
    const { action, param, x, y, selector } = args;

    if (action === 'navigate') {
      return await this.browse(param, 'none');
    } 

    const iframe = document.getElementById('webIframe');
    if (!iframe) return "Error: No hay ningún navegador abierto en la interfaz.";

    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument || win.document;

      if (action === 'scroll') {
        win.scrollBy(x || 0, y || 0);
        return `Comando ejecutado: Scroll realizado horizontalmente (${x || 0}px) y verticalmente (${y || 0}px).`;
      
      } else if (action === 'zoom') {
        doc.body.style.zoom = param || '1';
        return `Comando ejecutado: Nivel de zoom ajustado a ${param}.`;
      
      } else if (action === 'click' || action === 'right_click') {
        if (!selector) return "Error: Se necesita especificar un 'selector' CSS válido para hacer clic.";
        
        const element = doc.querySelector(selector);
        if (!element) return `Error: No se encontró ningún elemento en la web con el selector CSS '${selector}'.`;
        
        if (action === 'click') {
          element.click();
          return `Comando ejecutado: Clic izquierdo realizado exitosamente en el elemento '${selector}'.`;
        } else {
          const ev = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: false,
            view: win,
            button: 2,
            buttons: 2
          });
          element.dispatchEvent(ev);
          return `Comando ejecutado: Clic derecho simulado en el elemento '${selector}'.`;
        }
      } else {
        return `Error: Acción '${action}' no reconocida.`;
      }
    } catch (err) {
      return `Aviso técnico: El navegador bloqueó la manipulación directa del DOM por políticas de seguridad Cross-Origin (CORS). Detalle del error: ${err.message}`;
    }
  }
};

// ─── DELEGACIÓN A MODELOS Y HERRAMIENTAS DINÁMICAS ─────────────────────

async function executeDynamicTool(code) {
  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const dynamicFn = new AsyncFunction(code);
    const result = await dynamicFn();
    return `Ejecución dinámica exitosa. Resultado:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
  } catch (e) {
    return `Error en la compilación o ejecución de la herramienta dinámica:\n${e.message}\nRevisa tu código JavaScript inyectado e inténtalo de nuevo.`;
  }
}