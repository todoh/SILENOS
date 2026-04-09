// live gemini/server_handler.js
// ─── SERVER MESSAGES (MAIN ROUTER) ──────────────────────────────────

let finishedGeminiText = ''; 
let currentInterimText = ''; 
let currentInputInterim = ''; 
let isCurrentTurnAudio = false; 

async function handleServerMessage(data) {
  if (data.toolCall) {
    const toolResponses = [];
    
    for (const call of data.toolCall.functionCalls) {
      let result = "";
      
      // Agregamos get_news a las herramientas de segundo plano
      const backgroundTools = ["analyze_target", "light_search", "advanced_search", "browse_web", "get_weather", "get_news"];
      const isBackground = backgroundTools.includes(call.name);

      if (!isBackground) {
          try {
            if (call.name === "manage_history") {
                if (call.args.action === 'undo') {
                    result = await historyManager.undo();
                } else if (call.args.action === 'redo') {
                    result = await historyManager.redo();
                } else if (call.args.action === 'get_log') {
                    result = "=== REGISTRO DE ACCIONES RECIENTES ===\n" + historyManager.getLog();
                } else {
                    result = "Acción de historial no válida.";
                }
                addSystemMsg(`VOZ SILENOS ha inspeccionado/manipulado el Historial (${call.args.action})`);
            } else if (call.name === "navigate_folder") {
              result = await explorerLens.navigateFolder(call.args.path);
              addSystemMsg(`VOZ SILENOS exploró la carpeta: ${call.args.path || 'raíz'}`);
            } else if (call.name === "save_memory") {
              result = await saveToMemory(call.args.filename, call.args.content);
              addSystemMsg(`VOZ SILENOS guardó el archivo: ${call.args.filename}`);
              historyManager.logAction('IA (Memory)', `Guardó el archivo ${call.args.filename}`);
            } else if (call.name === "read_memory") {
              result = await readFromMemory(call.args.filename);
              addSystemMsg(`VOZ SILENOS leyó el archivo: ${call.args.filename}`);
            } else if (call.name === "list_memory") {
              result = await listMemoryFiles();
              addSystemMsg(`VOZ SILENOS consultó el mapa de archivos`);
            } else if (call.name === "interact_web") {
              result = await webBrowser.interact(call.args);
              addSystemMsg(`VOZ SILENOS interactuó con la web: ${call.args.action}`);
            } else if (call.name === "manage_gamebook") {
              result = await handleGamebookTool(call.args);
              addSystemMsg(`VOZ SILENOS modificó el librojuego (${call.args.action})`);
            } else if (call.name === "manage_visualizer") {
              result = await handleVisualizerTool(call.args);
              addSystemMsg(`VOZ SILENOS usó el Visualizador/Editor (${call.args.action})`);
            } else if (call.name === "file_operations") {
              result = await handleFileOperationsTool(call.args);
              addSystemMsg(`VOZ SILENOS movió/copió archivos (${call.args.action})`);
            } else if (call.name === "manage_game_studio") {
              if (typeof handleGameStudioTool !== 'undefined') {
                  result = await handleGameStudioTool(call.args);
              } else {
                  result = "Error: El módulo Game Studio no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS usó Game Studio (${call.args.action})`);
            } else if (call.name === "manage_coder_studio") {
              if (typeof handleCoderStudioTool !== 'undefined') {
                  result = await handleCoderStudioTool(call.args);
              } else {
                  result = "Error: El módulo Coder Studio no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS usó Coder Studio (${call.args.action})`);
            } else if (call.name === "manage_svg_studio") {
              if (typeof handleSvgStudioTool !== 'undefined') {
                  result = await handleSvgStudioTool(call.args);
              } else {
                  result = "Error: El módulo SVG Studio no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS usó SVG Studio (${call.args.action})`);
            } else if (call.name === "open_gamebook_ui") {
              if (!workspaceHandle) {
                  result = "Error: Dile al usuario que seleccione una carpeta local primero.";
              } else if (typeof gamebookUI !== 'undefined') {
                  gamebookUI.open();
                  gamebookUI.focusAll(); 
                  result = "Interfaz del Librojuego abierta exitosamente.";
              } else {
                  result = "Error: Módulo de Librojuego no cargado.";
              }
              addSystemMsg(`VOZ SILENOS abrió Librojuego Studio`);
            } else if (call.name === "close_gamebook_ui") {
              if (typeof gamebookUI !== 'undefined') {
                  gamebookUI.close();
                  result = "Interfaz del Librojuego cerrada.";
              } else {
                  result = "Error: Módulo de Librojuego no cargado.";
              }
            } else if (call.name === "open_datos_studio") {
              if (!workspaceHandle) {
                  result = "Error: Dile al usuario que seleccione una carpeta local primero.";
              } else if (typeof datosStudioUI !== 'undefined') {
                  let folderSet = false;
                  if (call.args.path) {
                      try {
                          // Resuelve y crea directorios automáticamente si la ruta no existe
                          let parts = call.args.path.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
                          let curr = workspaceHandle;
                          for(const p of parts) {
                              curr = await curr.getDirectoryHandle(p, { create: true });
                          }
                          datosStudioUI.currentFolderHandle = curr;
                          folderSet = true;
                      } catch(err) {
                          result = `Error al encontrar o crear la carpeta '${call.args.path}': ${err.message}`;
                      }
                  }
                  
                  if (!call.args.path || folderSet) {
                      await datosStudioUI.open();
                      result = folderSet ? `Interfaz de Datos Studio abierta en la carpeta: ${call.args.path}` : "Interfaz de Datos Studio abierta en la raíz.";
                  }
              } else {
                  result = "Error: Módulo de Datos Studio no cargado.";
              }
            } else if (call.name === "close_datos_studio") {
              if (typeof datosStudioUI !== 'undefined') {
                  datosStudioUI.close();
                  result = "Interfaz de Datos Studio cerrada.";
              } else {
                  result = "Error: Módulo de Datos Studio no cargado.";
              }
            } else if (call.name === "manage_datos_studio") {
              if (typeof handleDatosStudioTool !== 'undefined') {
                  result = await handleDatosStudioTool(call.args);
              } else {
                  result = "Error: Lógica de Datos Studio no cargada.";
              }
              addSystemMsg(`VOZ SILENOS gestionó la base de datos (${call.args.action})`);
            } else if (call.name === "execute_dynamic_code") {
              result = await executeDynamicTool(call.args.code);
              addSystemMsg(`VOZ SILENOS ejecutó código dinámico`);
              historyManager.logAction('IA (Logic)', 'Ejecutó código dinámico en Sandbox');
            }
            
            // Registro de actividad maestra en History Manager si no se ha interceptado internamente.
            if(call.name !== 'manage_visualizer' && call.name !== 'file_operations' && call.name !== 'manage_history') {
                historyManager.logAction('IA', `Invocó la herramienta: ${call.name}`);
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
          historyManager.logAction('IA', `Encoló tarea en 2º plano: ${call.name}`);
          
          apiTaskQueue.enqueue(call.name, async () => {
              let asyncResult = "";
              try {
                  if (call.name === "analyze_target") {
                      asyncResult = await explorerLens.analyzeTarget(call.args.path, call.args.model || 'gemini-1.5-flash');
                  } else if (call.name === "light_search") {
                      asyncResult = await doGeminiSearch(call.args.query, call.args.model || 'gemini-1.5-flash');
                  } else if (call.name === "advanced_search") {
                      asyncResult = await doGeminiSearch(call.args.query, call.args.model || 'gemini-1.5-pro');
                  } else if (call.name === "browse_web") {
                      asyncResult = await webBrowser.browse(call.args.url, call.args.analyze_model || 'none');
                  } else if (call.name === "get_weather") {
                      asyncResult = await getWeather(call.args.location);
                  } else if (call.name === "get_news") {
                      asyncResult = await getLatestNews(call.args.query);
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