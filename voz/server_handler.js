// live gemini/server_handler.js
// ─── SERVER MESSAGES ────────────────────────────────────────────────

let finishedGeminiText = ''; // Texto ya confirmado de este turno
let currentInterimText = ''; // Texto parcial (transcripción en vivo de la frase actual)
let currentInputInterim = ''; // Texto parcial para la voz del usuario desde el servidor
let isCurrentTurnAudio = false; // Controla si le ponemos la etiqueta de audio al final

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

        // Si no se especifica ruta, vamos a la raíz
        let targetPath = path || "/";
        const handle = await explorerLens.getHandleFromPath(targetPath);

        if (action === 'open_folder') {
            if (handle.kind !== 'directory') return `Error: '${targetPath}' no es una carpeta. Usa action: 'open_file'.`;
            await visualizadorUI.open(handle);
            return `El Visualizador ha sido abierto en la pantalla del usuario mostrando el contenido de la carpeta: '${targetPath}'.`;
        } 
        else if (action === 'open_file') {
            if (handle.kind !== 'file') return `Error: '${targetPath}' no es un archivo. Usa action: 'open_folder'.`;
            
            // Intentar abrir la carpeta padre de fondo para dar contexto visual
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

// Función para manejar las acciones directas de la IA en el Editor Textual / IDE
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
                
                // Expandir las carpetas padre en el árbol lateral automáticamente
                const parts = path.split('/');
                let currentPath = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i];
                    ide.expandedPaths.add(currentPath);
                }
                
                await ide.openFile(handle);
                await ide.refreshTree(); // Forzar actualización visual
                
                return `El archivo '${path}' ha sido abierto y ya se está mostrando visualmente en la pantalla del usuario.`;
            } catch(e) {
                return `Error al intentar abrir el archivo visualmente: ${e.message}`;
            }
        } else if (action === 'expand_folder') {
            if (!path) return "Error: Falta el parámetro 'path' para desplegar la carpeta.";
            try {
                const handle = await explorerLens.getHandleFromPath(path);
                if (handle.kind !== 'directory') return `Error: ${path} no es una carpeta.`;
                
                // Expandir la carpeta solicitada y sus padres
                const parts = path.split('/');
                let currentPath = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += (currentPath ? '/' : '') + parts[i];
                    ide.expandedPaths.add(currentPath);
                }
                
                await ide.refreshTree(); // Forzar actualización visual
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

// Función para manejar las peticiones del librojuego por la IA
async function handleGamebookTool(args) {
    if (!workspaceHandle) return "Error: El usuario no ha seleccionado una carpeta local (workspace).";
    const { action, filename, title, visual_style, node_id, text, choices, x, y, zoom, svg_content } = args;

    try {
        if (action === 'auto_layout') {
            if (typeof gamebookUI !== 'undefined') { gamebookUI.autoLayout(); return "Nodos ordenados automáticamente en la interfaz visual."; }
            return "Error: Interfaz no cargada.";
        } else if (action === 'reset_view') {
            if (typeof gamebookUI !== 'undefined') { gamebookUI.resetView(); return "Vista centrada al 100% en la interfaz visual."; }
            return "Error: Interfaz no cargada.";
        } else if (action === 'move_view') {
            if (typeof gamebookUI !== 'undefined') {
                if (x !== undefined) gamebookUI.panX = x;
                if (y !== undefined) gamebookUI.panY = y;
                if (zoom !== undefined) gamebookUI.zoom = Math.max(0.1, Math.min(zoom, 2));
                gamebookUI.applyPan();
                return `Vista movida a X:${gamebookUI.panX}, Y:${gamebookUI.panY}, Zoom:${gamebookUI.zoom}.`;
            }
            return "Error: Interfaz no cargada.";
        } else if (action === 'illustrate_node') {
            if (!node_id) return "Error: Falta especificar el 'node_id' para ilustrar.";
            if (typeof gamebookVisual !== 'undefined') {
                gamebookVisual.illustrateNode(node_id);
                return `Comando en proceso: Se ha ordenado al motor visual ilustrar el nodo '${node_id}'. Ocurrirá en segundo plano.`;
            }
            return "Error: Motor visual no cargado.";
        } else if (action === 'illustrate_all') {
            if (typeof gamebookVisual !== 'undefined') {
                gamebookVisual.illustrateAllNodes();
                return "Comando en proceso: Se ha ordenado al motor visual ilustrar TODOS los nodos secuencialmente. Ocurrirá en segundo plano y puede tardar.";
            }
            return "Error: Motor visual no cargado.";
        }

        let activeFileHandle = null;
        if (typeof gamebookUI !== 'undefined' && gamebookUI.currentFileHandle) {
            activeFileHandle = gamebookUI.currentFileHandle;
        } else if (filename) {
            activeFileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
        } else {
            return "Error: Se requiere 'filename' para inicializar la carga del archivo.";
        }

        // NUEVA ACCIÓN: ILUSTRACIÓN NATIVA SVG
        if (action === 'illustrate_node_svg') {
            if (!node_id || !svg_content) return "Error: Faltan parámetros 'node_id' o 'svg_content'.";

            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            let data;
            try { data = JSON.parse(jsonText); } catch(e) { return "Error: formato JSON de la aventura inválido."; }

            let node = data.nodes.find(n => n.id === node_id);
            if (!node) return `Error: El nodo ${node_id} no existe.`;

            // 1. Guardamos el SVG como un archivo real local (al igual que las imágenes JPG)
            const svgFilename = `IMG_SVG_${node_id}_${Date.now()}.svg`;
            const fileHandle = await workspaceHandle.getFileHandle(svgFilename, { create: true });
            const writableSvg = await fileHandle.createWritable();
            await writableSvg.write(svg_content);
            await writableSvg.close();

            // 2. Vinculamos la metadata y creamos el Blob para pintarlo en vivo
            node.imageUrl = svgFilename;
            node.imagePrompt = "Arte vectorial SVG generado nativamente por VOZ SILENOS.";
            const blob = new Blob([svg_content], { type: 'image/svg+xml' });
            if (node._cachedImageUrl) URL.revokeObjectURL(node._cachedImageUrl);
            node._cachedImageUrl = URL.createObjectURL(blob);

            // 3. Persistimos los datos del librojuego general
            const w = await activeFileHandle.createWritable();
            await w.write(JSON.stringify(data, null, 2));
            await w.close();

            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.currentFileHandle = activeFileHandle;
                gamebookUI.data = data;
                if (gamebookUI.selectedNodeId === node_id) {
                    gamebookUI.updateEditorPanel();
                }
                gamebookUI.renderNodes();
            }
            if (typeof showToast === 'function') showToast(`Arte SVG insertado en ${node_id}`, 'success');

            return `Nodo '${node_id}' ilustrado exitosamente con tu arte nativo SVG. Archivo guardado como ${svgFilename}.`;
        }

        if (action === 'create_book') {
            const data = { title: title || "Aventura Nueva", visualStyle: visual_style || "", nodes: [] };
            const w = await activeFileHandle.createWritable();
            await w.write(JSON.stringify(data, null, 2));
            await w.close();
            
            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.currentFileHandle = activeFileHandle;
                gamebookUI.data = data;
                const titleInput = document.getElementById('gbTitleInput');
                if (titleInput) titleInput.value = data.title;
                const styleInput = document.getElementById('gbStyleInput');
                if (styleInput) styleInput.value = data.visualStyle;
                gamebookUI.selectedNodeId = null;
                gamebookUI.updateEditorPanel();
                gamebookUI.render();
            }
            return `Librojuego creado exitosamente como ${activeFileHandle.name}. La interfaz visual ha sido actualizada.`;
        
        } else if (action === 'update_settings') {
            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            
            let data;
            try {
                data = JSON.parse(jsonText);
            } catch(e) {
                return "Error: el archivo actual no contiene un formato de datos JSON válido.";
            }

            if (title !== undefined) data.title = title;
            if (visual_style !== undefined) data.visualStyle = visual_style;

            const w = await activeFileHandle.createWritable();
            await w.write(JSON.stringify(data, null, 2));
            await w.close();

            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.currentFileHandle = activeFileHandle;
                gamebookUI.data = data;
                const titleInput = document.getElementById('gbTitleInput');
                if (titleInput) titleInput.value = data.title || "Sin título";
                const styleInput = document.getElementById('gbStyleInput');
                if (styleInput) styleInput.value = data.visualStyle || "";
                
                gamebookUI.autoSave();
            }
            return `Ajustes del libro actualizados: Título = '${data.title}', Estilo Visual = '${data.visualStyle}'.`;
            
        } else if (action === 'get_book') {
            const f = await activeFileHandle.getFile();
            const textContent = await f.text();
            
            if (typeof gamebookUI !== 'undefined') {
                try {
                    const data = JSON.parse(textContent);
                    gamebookUI.currentFileHandle = activeFileHandle;
                    gamebookUI.data = data;
                    document.getElementById('gbTitleInput').value = data.title || "Sin título";
                    const styleInput = document.getElementById('gbStyleInput');
                    if (styleInput) styleInput.value = data.visualStyle || "";
                    await gamebookUI.cacheImages();
                    gamebookUI.focusAll(); 
                } catch(e) { console.warn("Archivo leído pero no es un JSON válido aún."); }
            }
            return textContent;
            
        } else if (action === 'add_node' || action === 'edit_node') {
            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            
            let data;
            try {
                data = JSON.parse(jsonText);
            } catch(e) {
                data = { title: "Aventura Recuperada", visualStyle: "", nodes: [] };
            }
            
            let parsedChoices = [];
            if (choices) {
                try { 
                    parsedChoices = typeof choices === 'string' ? JSON.parse(choices) : choices; 
                } catch(e) { return "Error: choices no es un formato válido."; }
            }

            let node = data.nodes.find(n => n.id === node_id);
            
            if (action === 'add_node') {
                if (node) return `Error: El nodo ${node_id} ya existe. Usa edit_node.`;
                
                let vx = 100;
                let vy = 100;
                if (typeof gamebookUI !== 'undefined') {
                    vx = (100 - gamebookUI.panX) / gamebookUI.zoom;
                    vy = (100 - gamebookUI.panY) / gamebookUI.zoom;
                }
                node = { id: node_id, text: text || "", choices: parsedChoices, x: vx + (Math.random()*150), y: vy + (Math.random()*150) };
                data.nodes.push(node);
            } else {
                if (!node) return `Error: El nodo ${node_id} no existe. Usa add_node.`;
                if (text) node.text = text;
                if (choices) node.choices = parsedChoices;
            }

            const w = await activeFileHandle.createWritable();
            await w.write(JSON.stringify(data, null, 2));
            await w.close();

            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.currentFileHandle = activeFileHandle;
                gamebookUI.data = data;
                const titleInput = document.getElementById('gbTitleInput');
                if (titleInput) titleInput.value = data.title || "Sin título";
                const styleInput = document.getElementById('gbStyleInput');
                if (styleInput) styleInput.value = data.visualStyle || "";
                
                await gamebookUI.cacheImages();
                
                gamebookUI.selectedNodeId = node_id; 
                gamebookUI.updateEditorPanel();
                gamebookUI.render();
            }
            return `Nodo '${node_id}' guardado correctamente en ${activeFileHandle.name}. La interfaz visual ha sido actualizada enfocando el nodo.`;
            
        } else {
            return `Error: Acción '${action}' no reconocida.`;
        }
    } catch(err) {
        return `Error del sistema: ${err.message}`;
    }
}

async function handleServerMessage(data) {
  if (data.toolCall) {
    const toolResponses = [];
    
    for (const call of data.toolCall.functionCalls) {
      let result = "";
      
      const backgroundTools = ["analyze_target", "light_search", "advanced_search", "browse_web", "ask_external_ai"];
      const isBackground = backgroundTools.includes(call.name);

      if (!isBackground) {
          try {
            if (call.name === "navigate_folder") {
              result = await explorerLens.navigateFolder(call.args.path);
              addSystemMsg(`VOZ SILENOS ha explorado la carpeta: ${call.args.path || 'raíz'}`);
            } else if (call.name === "save_memory") {
              result = await saveToMemory(call.args.filename, call.args.content);
              addSystemMsg(`VOZ SILENOS ha guardado el archivo: ${call.args.filename}`);
            } else if (call.name === "read_memory") {
              result = await readFromMemory(call.args.filename);
              addSystemMsg(`VOZ SILENOS ha leído el archivo: ${call.args.filename}`);
            } else if (call.name === "list_memory") {
              result = await listMemoryFiles();
              addSystemMsg(`VOZ SILENOS ha consultado el mapa de archivos local`);
            } else if (call.name === "interact_web") {
              result = await webBrowser.interact(call.args);
              addSystemMsg(`VOZ SILENOS interactuó con la web: ${call.args.action}`);
            } else if (call.name === "manage_gamebook") {
              result = await handleGamebookTool(call.args);
              addSystemMsg(`VOZ SILENOS modificó el librojuego (${call.args.action})`);
            } else if (call.name === "manage_ide") {
              result = await handleIdeTool(call.args);
              addSystemMsg(`VOZ SILENOS modificó el editor visual (${call.args.action})`);
            } else if (call.name === "manage_visualizer") {
              result = await handleVisualizerTool(call.args);
              addSystemMsg(`VOZ SILENOS usó el Visualizador (${call.args.action})`);
            } else if (call.name === "open_gamebook_ui") {
              if (!workspaceHandle) {
                  result = "Error: Dile al usuario que seleccione una carpeta local primero.";
              } else if (typeof gamebookUI !== 'undefined') {
                  gamebookUI.open();
                  gamebookUI.focusAll(); 
                  result = "Interfaz del Librojuego abierta exitosamente en la pantalla del usuario.";
              } else {
                  result = "Error: El módulo de Librojuego no está cargado en el cliente.";
              }
              addSystemMsg(`VOZ SILENOS abrió la interfaz de Librojuego Studio`);
            } else if (call.name === "close_gamebook_ui") {
              if (typeof gamebookUI !== 'undefined') {
                  gamebookUI.close();
                  result = "Interfaz del Librojuego cerrada exitosamente.";
              } else {
                  result = "Error: El módulo de Librojuego no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS cerró la interfaz de Librojuego Studio`);
            } else if (call.name === "open_datos_studio") {
              if (!workspaceHandle) {
                  result = "Error: Dile al usuario que seleccione una carpeta local primero.";
              } else if (typeof datosStudioUI !== 'undefined') {
                  await datosStudioUI.open();
                  result = "Interfaz de Datos Studio abierta exitosamente en la pantalla del usuario.";
              } else {
                  result = "Error: El módulo de Datos Studio no está cargado en el cliente.";
              }
              addSystemMsg(`VOZ SILENOS abrió la interfaz de Datos Studio`);
            } else if (call.name === "close_datos_studio") {
              if (typeof datosStudioUI !== 'undefined') {
                  datosStudioUI.close();
                  result = "Interfaz de Datos Studio cerrada exitosamente.";
              } else {
                  result = "Error: El módulo de Datos Studio no está cargado.";
              }
              addSystemMsg(`VOZ SILENOS cerró la interfaz de Datos Studio`);
            } else if (call.name === "manage_datos_studio") {
              if (typeof handleDatosStudioTool !== 'undefined') {
                  result = await handleDatosStudioTool(call.args);
              } else {
                  result = "Error: La lógica de Datos Studio Tools no está cargada en la web.";
              }
              addSystemMsg(`VOZ SILENOS gestionó la base de datos narrativa (${call.args.action})`);
            } else if (call.name === "execute_dynamic_code") {
              result = await executeDynamicTool(call.args.code);
              addSystemMsg(`VOZ SILENOS creó y ejecutó una herramienta de lógica dinámica`);
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
          result = "SISTEMA: La tarea ha sido enviada a segundo plano. Sigue conversando normalmente con el usuario y dile que estás trabajando en ello. Te notificaré con los resultados cuando termine.";
          toolResponses.push({
            id: call.id,
            name: call.name,
            response: { result: result }
          });
          
          addSystemMsg(`Procesando en segundo plano: ${call.name}...`);
          
          (async () => {
              let asyncResult = "";
              try {
                  if (call.name === "analyze_target") {
                      asyncResult = await explorerLens.analyzeTarget(call.args.path);
                  } else if (call.name === "light_search") {
                      asyncResult = await doPollinationsSearch(call.args.query, 'openai');
                  } else if (call.name === "advanced_search") {
                      asyncResult = await doPollinationsSearch(call.args.query, 'openai');
                  } else if (call.name === "browse_web") {
                      asyncResult = await webBrowser.browse(call.args.url, call.args.use_nova);
                  } else if (call.name === "ask_external_ai") {
                      asyncResult = await askExternalAI(call.args.prompt, call.args.model);
                  }
              } catch (err) {
                  asyncResult = "Error ejecutando en segundo plano: " + err.message;
              }
              
              if (session?.ws && session.ws.readyState === WebSocket.OPEN) {
                  const notificacion = `[AVISO DEL SISTEMA: La herramienta '${call.name}' ha terminado su proceso en segundo plano. Resultado:\n${asyncResult}\n\nPor favor, informa al usuario sobre este resultado de forma natural en tu próxima respuesta.]`;
                  
                  session.ws.send(JSON.stringify({
                      realtimeInput: { text: notificacion }
                  }));
                  
                  addSystemMsg(`VOZ SILENOS ha recibido los datos de: ${call.name}`);
              }
          })();
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