// live gemini/server_handler.js
// ─── SERVER MESSAGES ────────────────────────────────────────────────

let finishedGeminiText = ''; // Texto ya confirmado de este turno
let currentInterimText = ''; // Texto parcial (transcripción en vivo de la frase actual)
let currentInputInterim = ''; // Texto parcial para la voz del usuario desde el servidor
let isCurrentTurnAudio = false; // Controla si le ponemos la etiqueta de audio al final

// --- GESTIÓN DE VENTANAS Y PROGRAMAS DEL SO (SILENOS 4) ---
async function handleOSWindows(args) {
    const wm = window.parent.WindowManager;
    if (!wm) return "Error Crítico: No se detecta el sistema de ventanas WindowManager de SILENOS 4. Asegúrate de estar ejecutando Silenos Voz dentro del SO.";
    
    const { action, window_id, app_name } = args;

    try {
        if (action === 'list_apps') {
            const p = window.parent;
            let appList = [];
            
            // Estrategia 1: Registro global de apps común en arquitecturas web
            if (p.AppRegistry && typeof p.AppRegistry.getApps === 'function') {
                appList = p.AppRegistry.getApps().map(a => a.name || a.id);
            } else if (p.Programs) {
                appList = Object.keys(p.Programs);
            } 
            
            // Estrategia 2: Escáner de DOM para extraer iconos y accesos directos
            if (appList.length === 0) {
                const icons = Array.from(p.document.querySelectorAll('[data-app-id], .app-icon, .program-icon, .desktop-icon, [onclick*="openApp"], [onclick*="launch"]'));
                appList = icons.map(i => i.innerText.trim() || i.getAttribute('data-app-id')).filter(Boolean);
            }

            appList = [...new Set(appList)];

            if (appList.length === 0) {
                return "No se ha podido detectar la lista interna de programas. Puedes intentar buscar accesos en el DOM con execute_dynamic_code.";
            }
            return "=== PROGRAMAS DISPONIBLES EN SILENOS 4 ===\n- " + appList.join('\n- ');
        }
        
        if (action === 'open_app') {
            if (!app_name) return "Error: Se requiere especificar el 'app_name' para ejecutar un programa.";
            const p = window.parent;
            const targetName = app_name.toLowerCase();
            
            // Estrategia 1: Simulación de clic físico en el sistema operativo local
            const icons = Array.from(p.document.querySelectorAll('[data-app-id], .app-icon, .program-icon, .desktop-icon, [onclick*="openApp"], [onclick*="launch"]'));
            const targetIcon = icons.find(i => 
                (i.innerText.trim().toLowerCase() === targetName) || 
                (i.getAttribute('data-app-id') && i.getAttribute('data-app-id').toLowerCase() === targetName) ||
                (i.innerText.trim().toLowerCase().includes(targetName))
            );
            
            if (targetIcon) {
                targetIcon.click();
                return `Comando enviado: Programa '${app_name}' ejecutado directamente desde su enlace local.`;
            }

            // Estrategia 2: Invocación de las API troncales de lanzamiento
            if (typeof p.openApp === 'function') { p.openApp(app_name); return `Programa '${app_name}' ejecutado (API global abierta).`; }
            if (p.System && typeof p.System.launch === 'function') { p.System.launch(app_name); return `Programa '${app_name}' ejecutado (API del System).`; }
            if (p.AppManager && typeof p.AppManager.launch === 'function') { p.AppManager.launch(app_name); return `Programa '${app_name}' ejecutado (API del AppManager).`; }
            if (p.WindowManager && typeof p.WindowManager.open === 'function') { p.WindowManager.open(app_name); return `Programa '${app_name}' ejecutado (API del WindowManager).`; }

            return `Error: No se encontró la forma de abrir el programa '${app_name}'. Verifica el nombre exacto con 'list_apps'.`;
        }

        if (action === 'list') {
            const wins = wm.windows;
            if (wins.length === 0) return "No hay ninguna ventana abierta en el sistema.";
            let listStr = "=== VENTANAS ABIERTAS ===\n";
            wins.forEach(w => {
                listStr += `- ID: ${w.id} | Título: ${w.title} | Tipo: ${w.type} | Maximizada: ${w.isMaximized} | Minimizada: ${w.minimized}\n`;
            });
            return listStr;
        }
        
        if (!window_id) return "Error: Se requiere especificar el 'window_id' para gestionar ventanas.";
        
        const winExists = wm.windows.find(w => w.id === window_id);
        if (!winExists) return `Error: La ventana con ID ${window_id} no existe.`;

        if (action === 'focus') {
            wm.focusWindow(window_id);
            return `Ventana ${window_id} traída al frente.`;
        } else if (action === 'minimize') {
            wm.minimizeWindow(window_id);
            return `Ventana ${window_id} minimizada.`;
        } else if (action === 'maximize') {
            wm.toggleMaximize(window_id);
            return `Estado de maximización alternado para ventana ${window_id}.`;
        } else if (action === 'close') {
            wm.closeWindow(window_id);
            return `Ventana ${window_id} cerrada y destruida del sistema.`;
        } else {
            return `Error: Acción '${action}' no reconocida.`;
        }
    } catch(e) {
        return `Excepción al interactuar con el SO: ${e.message}`;
    }
}

// --- CONTROL DINÁMICO DE APLICACIONES ABIERTAS (CON INSPECTOR DOM Y CONTEXTO AISLADO) ---
async function handleAppControl(args) {
    const wm = window.parent.WindowManager;
    if (!wm) return "Error: SILENOS 4 no detectado.";
    
    const action = args.action || 'execute'; 
    const { window_id, code } = args;

    const winExists = wm.windows.find(w => w.id === window_id);
    if (!winExists) return `Error: Ventana ${window_id} no existe.`;

    const winEl = window.parent.document.getElementById(window_id);
    if (!winEl) return "Error: La ventana no existe en el DOM local.";

    const iframe = winEl.querySelector('iframe');
    const targetDoc = iframe ? (iframe.contentDocument || iframe.contentWindow.document) : winEl;
    const targetWin = iframe ? iframe.contentWindow : window.parent;

    try {
        if (action === 'inspect') {
            let uiElements = `=== INTERFAZ VISUAL: ${winExists.title} ===\n\n`;
            
            const getSelector = (el) => {
                if (el.id) return `#${el.id}`;
                if (el.className && typeof el.className === 'string') return `.${el.className.trim().split(/\s+/).join('.')}`;
                return el.tagName.toLowerCase();
            };

            const labels = targetDoc.querySelectorAll('h1, h2, h3, p, label, span');
            labels.forEach(l => {
                const t = (l.innerText || '').trim();
                if (t && t.length > 2 && t.length < 200) uiElements += `[TEXTO] ${t}\n`;
            });

            const inputs = targetDoc.querySelectorAll('input, textarea, select');
            inputs.forEach(inp => {
                let tipo = inp.tagName.toLowerCase() === 'textarea' ? 'textarea' : inp.type;
                uiElements += `[CAMPO] Tipo: "${tipo}" | Selector: "${getSelector(inp)}" | Valor: "${inp.value || ''}" | Placeholder: "${inp.placeholder || ''}"\n`;
            });

            const buttons = targetDoc.querySelectorAll('button, .btn, [role="button"], input[type="button"], input[type="submit"]');
            buttons.forEach(b => {
                const text = (b.innerText || b.value || b.textContent || '').trim();
                uiElements += `[BOTÓN] Texto: "${text}" | Selector: "${getSelector(b)}"\n`;
            });

            if (uiElements === `=== INTERFAZ VISUAL: ${winExists.title} ===\n\n`) {
                return "La ventana no tiene campos, textos ni botones interactivos reconocibles.";
            }
            return uiElements;
        } 
        else if (action === 'execute') {
            if (!code) return "Error: La acción 'execute' requiere el parámetro 'code'.";

            // SECUESTRO DE CONTEXTO: Forzamos a que 'document' y 'window' apunten a la App, no al padre.
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const wrappedCode = `
                const document = targetDoc;
                const window = targetWin;
                ${code}
            `;
            
            const dynamicFn = new AsyncFunction('targetDoc', 'targetWin', wrappedCode);
            const result = await dynamicFn(targetDoc, targetWin);
            
            return `Comando inyectado y ejecutado con éxito en ${winExists.title}.\nResultado:\n${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`;
        } else {
            return `Error: Acción '${action}' no reconocida. Usa 'inspect' o 'execute'.`;
        }
    } catch (e) {
        return `Error en la inyección de código:\n${e.message}\nVerifica que el selector que usaste en querySelector existe según el comando 'inspect'.`;
    }
}

// Función para manejar el Visualizador de Archivos
async function handleVisualizerTool(args) {
    if (typeof visualizadorUI === 'undefined') return "Error: El módulo Visualizador no está cargado en la web.";
    const { action, path } = args;

    try {
        if (action === 'close') {
            visualizadorUI.close();
            return "Visualizador cerrado exitosamente.";
        }

        if (!workspaceHandle) return "Error: Dile al usuario que seleccione una carpeta local (Workspace) primero.";

        let targetPath = path || "/";
        const handle = await explorerLens.getHandleFromPath(targetPath);

        if (action === 'open_folder') {
            if (handle.kind !== 'directory') return `Error: '${targetPath}' no es una carpeta. Usa action: 'open_file'.`;
            await visualizadorUI.open(handle);
            return `El Visualizador ha sido abierto en la pantalla del usuario mostrando el contenido de la carpeta: '${targetPath}'.`;
        } 
        else if (action === 'open_file') {
            if (handle.kind !== 'file') return `Error: '${targetPath}' no es un archivo. Usa action: 'open_folder'.`;
            
            let parentPath = targetPath.split('/').slice(0, -1).join('/');
            let parentHandle = workspaceHandle;
            if (parentPath) {
                try { parentHandle = await explorerLens.getHandleFromPath(parentPath); } catch(e) {}
            }
            
            await visualizadorUI.open(parentHandle);
            await visualizadorUI.openFilePreview(handle);
            
            return `El archivo '${targetPath}' ha sido abierto en el Visualizador para que el usuario lo vea.`;
        }
        else {
            return `Acción '${action}' no reconocida.`;
        }
    } catch (e) {
        return `Error en el visualizador: ${e.message}`;
    }
}

// Función para manejar el Editor Textual / IDE
async function handleIdeTool(args) {
    const { action, content, path } = args;
    if (typeof ide === 'undefined') return "Error: El módulo IDE no está cargado en la web.";
    
    try {
        if (action === 'open') {
            ide.open();
            return "Editor de textos/IDE abierto en la pantalla del usuario.";
        } else if (action === 'close') {
            ide.close();
            return "Editor visual (IDE) cerrado.";
        } else if (action === 'write_all') {
            const editor = document.getElementById('ideEditor');
            if (editor) {
                editor.value = content || '';
                return "Contenido reemplazado en el editor visual. (Aún no está guardado en disco, debes usar action:'save' para persistirlo).";
            }
            return "Error: No se encontró el área de texto.";
        } else if (action === 'append') {
            const editor = document.getElementById('ideEditor');
            if (editor) {
                editor.value += (content || '');
                return "Contenido añadido al final en el editor visual. (Aún no está guardado en disco, debes usar action:'save').";
            }
            return "Error: No se encontró el área de texto.";
        } else if (action === 'save') {
            if (ide.currentFileHandle) {
                await ide.saveFile();
                return `Archivo guardado exitosamente en el disco duro bajo el nombre de: ${ide.currentFileHandle.name}`;
            } else {
                return "Error: No hay ningún archivo abierto actualmente. Dile al usuario que seleccione un archivo o cree uno nuevo en el panel izquierdo.";
            }
        } else if (action === 'read') {
            const editor = document.getElementById('ideEditor');
            if (editor) {
                return editor.value || "(El editor está vacío)";
            }
            return "Error: No se encontró el área de texto.";
        } else if (action === 'open_file') {
            if (!path) return "Error: Falta el parámetro 'path' para abrir el archivo.";
            try {
                const handle = await explorerLens.getHandleFromPath(path);
                if (handle.kind !== 'file') return `Error: ${path} no es un archivo.`;
                
                const parts = path.split('/');
                let currentPath = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i];
                    ide.expandedPaths.add(currentPath);
                }
                
                await ide.openFile(handle);
                await ide.refreshTree(); 
                
                return `El archivo '${path}' ha sido abierto y ya se está mostrando visualmente en la pantalla del usuario.`;
            } catch(e) {
                return `Error al intentar abrir el archivo visualmente: ${e.message}`;
            }
        } else if (action === 'expand_folder') {
            if (!path) return "Error: Falta el parámetro 'path' para desplegar la carpeta.";
            try {
                const handle = await explorerLens.getHandleFromPath(path);
                if (handle.kind !== 'directory') return `Error: ${path} no es una carpeta.`;
                
                const parts = path.split('/');
                let currentPath = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i];
                    ide.expandedPaths.add(currentPath);
                }
                
                await ide.refreshTree();
                return `La carpeta '${path}' ha sido desplegada visualmente en el árbol lateral del usuario.`;
            } catch(e) {
                return `Error al desplegar la carpeta: ${e.message}`;
            }
        } else if (action === 'create_folder') {
            if (!path) return "Error: Falta el parámetro 'path' para crear la carpeta.";
            try {
                await ide.ensurePath(path, true);
                await ide.refreshTree();
                return `Estructura de carpetas '${path}' creada de forma recursiva y desplegada exitosamente en el entorno.`;
            } catch(e) {
                return `Error creando carpeta: ${e.message}`;
            }
        } else if (action === 'create_file') {
            if (!path) return "Error: Falta el parámetro 'path' para crear el archivo.";
            try {
                const handle = await ide.ensurePath(path, false);
                if (content) {
                    const w = await handle.createWritable();
                    await w.write(content);
                    await w.close();
                }
                await ide.openFile(handle);
                await ide.refreshTree();
                return `Archivo '${path}' creado${content ? ' (con contenido inicial)' : ''} y abierto correctamente en el IDE del usuario, generando automáticamente las carpetas intermedias necesarias.`;
            } catch(e) {
                return `Error creando archivo: ${e.message}`;
            }
        } else {
            return `Acción '${action}' no reconocida.`;
        }
    } catch(e) {
        return `Error en el editor visual: ${e.message}`;
    }
}

async function handleServerMessage(data) {
  if (data.toolCall) {
    const toolResponses = [];
    
    for (const call of data.toolCall.functionCalls) {
      let result = "";
      
      const backgroundTools = ["analyze_target", "light_search", "advanced_search", "browse_web", "ask_external_ai", "generate_image"];
      const isBackground = backgroundTools.includes(call.name);

      if (!isBackground) {
          try {
            if (call.name === "manage_os_windows") {
              result = await handleOSWindows(call.args);
              addSystemMsg(`VOZ SILENOS controló SO: ${call.args.action}`);
            } else if (call.name === "control_running_app") {
              result = await handleAppControl(call.args);
              addSystemMsg(`VOZ SILENOS interactuó con App (${call.args.action || 'execute'})`);
            } else if (call.name === "navigate_folder") {
              result = await explorerLens.navigateFolder(call.args.path);
              addSystemMsg(`VOZ SILENOS exploró la carpeta: ${call.args.path || 'raíz'}`);
            } else if (call.name === "save_memory") {
              result = await saveToMemory(call.args.filename, call.args.content);
              addSystemMsg(`VOZ SILENOS guardó el archivo: ${call.args.filename}`);
            } else if (call.name === "read_memory") {
              result = await readFromMemory(call.args.filename);
              addSystemMsg(`VOZ SILENOS leyó el archivo: ${call.args.filename}`);
            } else if (call.name === "list_memory") {
              result = await listMemoryFiles();
              addSystemMsg(`VOZ SILENOS consultó el mapa de archivos`);
            } else if (call.name === "interact_web") {
              result = await webBrowser.interact(call.args);
              addSystemMsg(`VOZ SILENOS interactuó con la web: ${call.args.action}`);
            } else if (call.name === "manage_ide") {
              result = await handleIdeTool(call.args);
              addSystemMsg(`VOZ SILENOS usó el IDE (${call.args.action})`);
            } else if (call.name === "manage_visualizer") {
              result = await handleVisualizerTool(call.args);
              addSystemMsg(`VOZ SILENOS usó el Visualizador (${call.args.action})`);
            } else if (call.name === "manage_svg_studio") {
              if (typeof handleSvgStudioTool !== 'undefined') {
                  result = await handleSvgStudioTool(call.args);
              } else {
                  result = "Error: El módulo SVG Studio no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS usó SVG Studio (${call.args.action})`);
            } else if (call.name === "manage_narrative_studio") {
              if (typeof handleNarrativeStudioTool !== 'undefined') {
                  result = await handleNarrativeStudioTool(call.args);
              } else {
                  result = "Error: El módulo Narrative Studio no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS usó Narrative Studio (${call.args.action})`);
            } else if (call.name === "execute_dynamic_code") {
              result = await executeDynamicTool(call.args.code);
              addSystemMsg(`VOZ SILENOS ejecutó código dinámico`);
            }
          } catch (err) {
            result = "Error ejecutando la herramienta: " + err.message;
          }
          
          toolResponses.push({
            id: call.id,
            name: call.name,
            response: { result: result }
          });
      } else {
          result = "SISTEMA: La tarea ha sido enviada a la cola asíncrona de procesamiento en segundo plano. Sigue conversando normalmente con el usuario y dile que estás trabajando en ello (si procede). Te notificaré con los resultados cuando termine.";
          toolResponses.push({
            id: call.id,
            name: call.name,
            response: { result: result }
          });
          
          addSystemMsg(`Encolando tarea en 2º plano: ${call.name}...`);
          
          apiTaskQueue.enqueue(call.name, async () => {
              let asyncResult = "";
              try {
                  if (call.name === "analyze_target") {
                      asyncResult = await explorerLens.analyzeTarget(call.args.path, call.args.model || 'nova-fast');
                  } else if (call.name === "light_search") {
                      asyncResult = await doPollinationsSearch(call.args.query, call.args.model || 'openai-fast');
                  } else if (call.name === "advanced_search") {
                      asyncResult = await doPollinationsSearch(call.args.query, call.args.model || 'openai');
                  } else if (call.name === "browse_web") {
                      asyncResult = await webBrowser.browse(call.args.url, call.args.analyze_model || 'none');
                  } else if (call.name === "ask_external_ai") {
                      let finalPrompt = call.args.prompt;
                      if (call.args.attached_file_path && typeof explorerLens !== 'undefined') {
                          try {
                              const fileContent = await explorerLens.openFileText(call.args.attached_file_path);
                              if (!fileContent.startsWith("Error")) {
                                  const safeContent = fileContent.length > 300000 ? fileContent.substring(0, 300000) + "\n...[TRUNCADO POR LÍMITE DE TAMAÑO]" : fileContent;
                                  finalPrompt += `\n\n=== CONTENIDO DEL ARCHIVO ADJUNTO: ${call.args.attached_file_path} ===\n${safeContent}\n================================================`;
                              } else {
                                  finalPrompt += `\n\n[Nota: Error al adjuntar archivo: ${fileContent}]`;
                              }
                          } catch (e) {
                              finalPrompt += `\n\n[Nota: Error crítico al intentar adjuntar ${call.args.attached_file_path}: ${e.message}]`;
                          }
                      }
                      asyncResult = await askExternalAI(finalPrompt, call.args.model || 'nova-fast');
                  } else if (call.name === "generate_image") {
                      if (typeof handleImageGenerationTool !== 'undefined') {
                          asyncResult = await handleImageGenerationTool(call.args);
                      } else {
                          asyncResult = "Error: Función handleImageGenerationTool no encontrada.";
                      }
                  }
              } catch (err) {
                  asyncResult = "Error ejecutando en segundo plano: " + err.message;
              }
              
              if (session?.ws && session.ws.readyState === WebSocket.OPEN) {
                  const notificacion = `[AVISO DEL SISTEMA: La herramienta '${call.name}' ha terminado su proceso en la cola asíncrona. Resultado:\n${asyncResult}\n\nPor favor, informa al usuario sobre este resultado de forma natural en tu próxima respuesta o comunícale si hubo un error.]`;
                  
                  session.ws.send(JSON.stringify({
                      realtimeInput: { text: notificacion }
                  }));
                  
                  addSystemMsg(`VOZ SILENOS ha recibido los datos asíncronos de: ${call.name}`);
              }
          }).catch(err => console.error("Error en cola de tareas:", err));
      }
    }
    
    if (session?.ws) {
      session.ws.send(JSON.stringify({
        toolResponse: {
          functionResponses: toolResponses
        }
      }));
    }
  }

  if (data.serverContent?.modelTurn?.parts) {
    for (const part of data.serverContent.modelTurn.parts) {
      if (part.inlineData?.mimeType?.startsWith('audio/')) {
        const pcm = base64ToFloat32(part.inlineData.data);
        queueAudio(pcm);
        isCurrentTurnAudio = true;
      }
      if (part.text) {
        finishedGeminiText += part.text;
        if (typeof updateActiveGeminiMessage === 'function') {
           updateActiveGeminiMessage(finishedGeminiText + currentInterimText);
        }
      }
    }
  }

  if (data.serverContent?.inputTranscription) {
    const t = data.serverContent.inputTranscription.text || '';
    currentInputInterim += t; 
    updateLiveTranscript('TÚ: ' + currentInputInterim);
    
    if (data.serverContent.inputTranscription.finished) {
      addMessage('user', currentInputInterim.trim(), true); 
      currentInputInterim = '';
      clearLiveTranscript();
    }
  }
  
  if (data.serverContent?.outputTranscription) {
    isCurrentTurnAudio = true;
    const t = data.serverContent.outputTranscription.text || '';
    currentInterimText += t;
    
    if (data.serverContent.outputTranscription.finished) {
      finishedGeminiText += currentInterimText;
      currentInterimText = ''; 
      if (typeof updateActiveGeminiMessage === 'function') {
         updateActiveGeminiMessage(finishedGeminiText);
      }
    } else {
      if (typeof updateActiveGeminiMessage === 'function') {
         updateActiveGeminiMessage(finishedGeminiText + currentInterimText);
      }
    }
  }

  if (data.serverContent?.turnComplete) {
    const finalStr = (finishedGeminiText + currentInterimText).trim();
    if (finalStr !== '') {
      if (typeof finalizeActiveGeminiMessage === 'function') {
         finalizeActiveGeminiMessage(finalStr, isCurrentTurnAudio);
      } else {
         addMessage('gemini', finalStr, isCurrentTurnAudio);
      }
    }
    finishedGeminiText = '';
    currentInterimText = '';
    isCurrentTurnAudio = false;
    clearLiveTranscript();
  }

  if (data.serverContent?.interrupted) {
    audioQueue = [];
    isPlayingAudio = false;
    
    if (currentActiveSource) {
      try { currentActiveSource.stop(); } catch(e) {}
      currentActiveSource = null;
    }
    
    const finalStr = (finishedGeminiText + currentInterimText).trim();
    if (finalStr !== '') {
      if (typeof finalizeActiveGeminiMessage === 'function') {
         finalizeActiveGeminiMessage(finalStr + ' [Interrumpido]', isCurrentTurnAudio);
      } else {
         addMessage('gemini', finalStr + ' [Interrumpido]', isCurrentTurnAudio);
      }
    }
    
    finishedGeminiText = '';
    currentInterimText = '';
    isCurrentTurnAudio = false;
    clearLiveTranscript();
  }
}