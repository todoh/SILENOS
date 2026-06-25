// ─── CHAT & TOOLS ───────────────────────────────────────────────────

// Función para obtener el informe de sesiones anteriores y el mapa global automáticamente
async function getLatestReport() {
  if (!analysisHandle) return "No hay espacio de trabajo seleccionado. Esta es una sesión nueva sin contexto previo.";
  try {
    let summaries = [];
    let voices = [];
    let reportText = "";

    // 0. CARGAR LA MEMORIA CORE A LARGO PLAZO (El Perfil e Historia del Usuario)
    try {
        const coreFile = await analysisHandle.getFileHandle('memoria_core.json');
        const file = await coreFile.getFile();
        const coreText = await file.text();
        reportText += "=== MEMORIA CORE A LARGO PLAZO (PERFIL E HISTORIA VITAL DEL USUARIO) ===\n";
        reportText += "Usa esta información para empatizar y sentirte humano conociendo el contexto vital de la persona con la que hablas.\n";
        reportText += coreText + "\n\n";
    } catch(e) {
        // Aún no existe la memoria a largo plazo (primera sesión o aún procesando)
    }

    // 1. Recopilar todos los informes pasados a medio plazo
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

    // Ordenar por fecha de modificación (los más recientes primero)
    summaries.sort((a, b) => b.lastModified - a.lastModified);
    voices.sort((a, b) => b.lastModified - a.lastModified);

    // Tomar hasta los 5 resúmenes más recientes y los 3 últimos informes de voz
    // Se usa reverse() para que la IA los lea en orden cronológico (el más nuevo al final)
    const recentSummaries = summaries.slice(0, 5).reverse();
    const recentVoices = voices.slice(0, 3).reverse();

    // 2. Intentar cargar el Índice Maestro a largo plazo (si el usuario procesó los datos)
    try {
        if (typeof conversationsHandle !== 'undefined' && conversationsHandle) {
            const masivoHandle = await conversationsHandle.getDirectoryHandle('analisis_masivo');
            const indexFileHandle = await masivoHandle.getFileHandle('INDICE_GENERAL_DECANTADO.txt');
            const indexFile = await indexFileHandle.getFile();
            const indexText = await indexFile.text();
            reportText += "=== CONTEXTO DE TRABAJO A LARGO PLAZO (ÍNDICE MAESTRO DEL PROYECTO) ===\n";
            reportText += indexText + "\n\n";
        }
    } catch(e) {
        // Si el índice no existe aún (no se han procesado datos), se omite silenciosamente
    }

    // 3. Añadir el historial de memoria evolutivo (Medio Plazo)
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
    console.error("Error leyendo reportes:", e);
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

// ─── SEARCH TOOLS (Pollinations) ──────────────────────────────────────
async function doPollinationsSearch(query, model) {
  if (!pollinationsKey) {
    return "Error: La IA de Pollinations no está conectada. Pide al usuario que conecte la IA desde el botón superior de la interfaz.";
  }
  
  try {
    const res = await fetch(POLLINATIONS_API_URL, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${pollinationsKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        model: model || 'nova-fast', // Forzado a modelo estable
        messages: [
          { role: 'system', content: 'Eres un asistente de búsqueda e investigación. Proporciona una respuesta detallada, actualizada y precisa basada en la consulta de búsqueda.'},
          { role: 'user', content: query }
        ],
        seed: Math.floor(Math.random() * 1000)
      })
    });
    
    const data = await res.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    return "Error: No se recibió ninguna información válida de la búsqueda.";
  } catch (err) {
    return "Error de red o de API al intentar buscar en internet: " + err.message;
  }
}

// ─── WEB BROWSING TOOLS ────────────────────────────────────────────────
const webBrowser = {
  async browse(url, useNova) {
    // 1. Detectar si es un archivo local (no empieza con http/https)
    if (!url.startsWith('http')) {
      try {
        // Decodificar %20 y limpiar prefijos inyectados por la IA
        let cleanPath = decodeURIComponent(url.replace(/^(file|local):\/\/\/?/i, '').replace(/^(file|local):/i, ''));
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

        // Primer intento: búsqueda directa y estricta
        let content = await explorerLens.openFileText(cleanPath);

        // Segundo intento: Búsqueda Profunda y Difusa (Fuzzy Deep Search) si falló la ruta
        if (content.startsWith('Error: Ruta no encontrada')) {
            const targetName = cleanPath.split('/').pop(); // Extraemos solo el nombre por si venía con ruta inventada
            
            async function deepSearch(dirHandle, target) {
                const cleanTarget = target.toLowerCase().replace(/[^a-z0-9.]/g, ''); // Quitamos espacios y símbolos raros
                
                for await (const [name, handle] of dirHandle.entries()) {
                    const cleanName = name.toLowerCase().replace(/[^a-z0-9.]/g, '');
                    
                    // Coincidencia exacta pero ignorando mayúsculas y espacios
                    if (cleanName === cleanTarget || (cleanName.includes(cleanTarget.replace('.html', '')) && name.endsWith('.html'))) {
                        return handle;
                    }
                    
                    // Si es carpeta, buscamos dentro recursivamente (ignorando carpetas muy pesadas)
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
                    cleanPath = file.name; // Actualizamos la variable para que el modal muestre el nombre real
                } else {
                    return content; // Devolvemos el error original si la búsqueda profunda fracasó
                }
            } else {
                return content;
            }
        } else if (content.startsWith('Error:')) {
            return content; // Devolver otros errores (ej. archivo muy grande)
        }

        // Determinar MIME type
        const ext = cleanPath.split('.').pop().toLowerCase();
        let mimeType = 'text/plain';
        if (ext === 'html') mimeType = 'text/html';
        else if (ext === 'css') mimeType = 'text/css';
        else if (ext === 'js') mimeType = 'text/javascript';
        else if (ext === 'svg') mimeType = 'image/svg+xml'; // SOPORTE NATIVO SVG AÑADIDO

        // Crear Blob y URL local para el sandbox (evitando bloqueos CORS)
        const blob = new Blob([content], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        // Abrir en el modal
        if (typeof uiWeb !== 'undefined') {
          const m = document.getElementById('webModal');
          m.classList.remove('hidden', 'minimized');
          if (!uiWeb.isMaximized) m.classList.remove('maximized');
          document.getElementById('webModalUrl').value = `local://${cleanPath}`;
          document.getElementById('webIframe').src = blobUrl;
        }

        if (useNova) {
          if (!pollinationsKey) return "Error: IA de Pollinations no conectada para análisis con Nova.";
          if (typeof showToast === 'function') showToast(`Analizando archivo local con Nova-Fast...`, 'listening');
          
          const prompt = `Analiza el siguiente contenido extraído del archivo local ${cleanPath}. Devuelve un resumen estructurado, puntos clave y de qué trata. Contenido: ${content.substring(0, 15000)}`;
          const result = await doPollinationsSearch(prompt, 'nova-fast');
          return `=== ANÁLISIS DE NOVA-FAST DEL ARCHIVO LOCAL ${cleanPath} ===\n\n${result}`;
        } else {
          return `Comando ejecutado: Archivo local '${cleanPath}' encontrado exitosamente y renderizado visualmente en el navegador IA del usuario.`;
        }
      } catch (e) {
        return `Error crítico abriendo archivo local ${url}: ${e.message}`;
      }
    }

    // 2. Flujo normal para URLs externas (Internet)
    if (typeof uiWeb !== 'undefined') {
      uiWeb.open(url);
    }
    
    try {
      // Usamos un proxy CORS público para poder extraer el texto de la web e ignorar bloqueos
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      
      if (!data.contents) return `Error: No se pudo obtener el contenido de ${url}`;
      
      // Extraemos el texto básico eliminando tags HTML para que la IA lo lea bien
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      let textContent = doc.body ? doc.body.innerText.replace(/\s+/g, ' ').trim() : '';
      
      if (textContent.length > 30000) textContent = textContent.substring(0, 30000) + "... [Contenido truncado]";

      if (useNova) {
        if (!pollinationsKey) return "Error: IA de Pollinations no conectada para análisis con Nova.";
        if (typeof showToast === 'function') showToast(`Analizando web con Nova-Fast...`, 'listening');
        
        const prompt = `Analiza el siguiente contenido extraído de la web ${url}. Devuelve un resumen estructurado, puntos clave y de qué trata. Contenido: ${textContent.substring(0, 15000)}`;
        const result = await doPollinationsSearch(prompt, 'nova-fast');
        return `=== ANÁLISIS DE NOVA-FAST DE LA WEB ${url} ===\n\n${result}`;
      } else {
        return `=== CONTENIDO DE LA WEB ${url} ===\n\n${textContent}`;
      }
    } catch (err) {
      return `Error navegando a ${url}: ${err.message}`;
    }
  },

  async interact(args) {
    const { action, param, x, y, selector } = args;

    // Si la acción es navegar, usamos la función browse que ya extrae el texto
    if (action === 'navigate') {
      return await this.browse(param, false);
    } 

    const iframe = document.getElementById('webIframe');
    if (!iframe) return "Error: No hay ningún navegador abierto en la interfaz.";

    try {
      // Intentar acceder al DOM del iframe
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
          // Simular clic derecho (context menu)
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
      // Si salta un error aquí suele ser por políticas CORS del navegador impidiendo tocar el DOM cross-origin
      return `Aviso técnico: El navegador bloqueó la manipulación directa del DOM por políticas de seguridad Cross-Origin (CORS). Detalle del error: ${err.message}`;
    }
  }
};

// ─── DELEGACIÓN A MODELOS Y HERRAMIENTAS DINÁMICAS ─────────────────────

async function askExternalAI(prompt, model) {
  if (!pollinationsKey) {
    return "Error: La IA de Pollinations no está conectada. Pide al usuario que la conecte.";
  }
  try {
    const res = await fetch(POLLINATIONS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pollinationsKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'nova-fast',
        messages: [
          { role: 'system', content: 'Eres un modelo subyacente ejecutando una tarea delegada de forma eficiente y directa por un IA superior (VOZ SILENOS). Responde con precisión a lo que se te pide.'},
          { role: 'user', content: prompt }
        ],
        seed: Math.floor(Math.random() * 1000)
      })
    });

    const data = await res.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    return "Error: No se recibió ninguna respuesta válida del modelo externo.";
  } catch (err) {
    return "Error de red al intentar consultar al modelo externo: " + err.message;
  }
}

async function executeDynamicTool(code) {
  try {
    // Creación de un contexto asíncrono seguro y dinámico para autoejecutar lógica
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const dynamicFn = new AsyncFunction(code);
    const result = await dynamicFn();
    return `Ejecución dinámica exitosa. Resultado:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
  } catch (e) {
    return `Error en la compilación o ejecución de la herramienta dinámica:\n${e.message}\nRevisa tu código JavaScript inyectado e inténtalo de nuevo.`;
  }
}