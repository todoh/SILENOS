// SILENOS 5 VOZ / toolsArchivos.js
// MANEJADOR DE TOOL CALLING DESDE WEBSOCKET INTEGRADO CON BÚSQUEDAS LIBRES Y APISERVICES
async function manejarLlamadasHerramientas(calls) {
    const functionResponses = [];
    for (const call of calls) {
        let resultadoTexto = "";
        let args = call.args || {};
        if (typeof args === 'string') {
            try { args = JSON.parse(args); } catch(e) {}
        }
        console.log("Herramienta solicitada por la IA:", call.name, args, "ID:", call.id);
        if (typeof addMessage === 'function') {
            addMessage('system', `  IA ejecutando: ${call.name}(${JSON.stringify(args)})`);
        }
        try {
            if (call.name === 'listarArchivos') {
                const archivos = await listarArchivos();
                resultadoTexto = archivos.length > 0 ? "Archivos encontrados: " + archivos.join(', ') : "La carpeta está vacía o no hay archivos compatibles.";
            } else if (call.name === 'abrirCarpeta') {
                const rutaCarpeta = args.rutaCarpeta || args.path || args.nombre || "";
                if (typeof navegarACarpeta === 'function') {
                    await navegarACarpeta(rutaCarpeta);
                    resultadoTexto = `Carpeta '${rutaCarpeta}' abierta correctamente en la interfaz.`;
                } else {
                    resultadoTexto = "Error: La función de navegación no está disponible.";
                }
            } else if (call.name === 'cerrarCarpeta') {
                if (typeof navegarACarpeta === 'function') {
                    await navegarACarpeta('');
                    resultadoTexto = "Se ha cerrado la carpeta actual y regresado exitosamente a la raíz del espacio de trabajo.";
                } else {
                    resultadoTexto = "Error: La función de navegación no está disponible.";
                }
            } else if (call.name === 'crearCarpeta') {
                const rutaCarpeta = args.rutaCarpeta || args.path || "";
                resultadoTexto = await crearCarpeta(rutaCarpeta);
                if (typeof renderizarGridContenido === 'function') {
                    await renderizarGridContenido(directoryHandle);
                }
            } else if (call.name === 'renombrarCarpeta') {
                resultadoTexto = await renombrarCarpeta(args.rutaAntigua || "", args.rutaNueva || "");
                if (typeof renderizarGridContenido === 'function') {
                    await renderizarGridContenido(directoryHandle);
                }
            } else if (call.name === 'borrarCarpeta') {
                const rutaCarpeta = args.rutaCarpeta || args.path || "";
                const autorizacion = args.autorizacionExpresa || args.confirmacionVerbalUsuario || false;
                if (!autorizacion) {
                    resultadoTexto = `ACCIÓN DETENIDA: Para borrar la carpeta '${rutaCarpeta}', DEBES preguntar primero en la conversación para solicitar la confirmación explícita del usuario. No ejecutes la herramienta hasta recibir una respuesta afirmativa.`;
                } else {
                    resultadoTexto = await borrarCarpeta(rutaCarpeta, true);
                    if (typeof renderizarGridContenido === 'function') {
                        await renderizarGridContenido(directoryHandle);
                    }
                }
            } else if (call.name === 'leerArchivo') {
                const contenido = await leerArchivo(args.nombre || "");
                resultadoTexto = `Contenido de ${args.nombre}:\n${contenido}`;
            } else if (call.name === 'leerLineas') {
                resultadoTexto = await leerLineas(args.nombre || "", args.lineaInicio || 1, args.lineaFin || 100);
            
            // BÚSQUEDA LOCAL EN ARCHIVOS (SIN API)
            } else if (call.name === 'buscarEnArchivos' || call.name === 'buscarLocal') {
                resultadoTexto = await freeSearchEngine.searchLocalFiles(args.textoBuscado || args.query || "");
            
            // BÚSQUEDA EN INTERNET / WIKIPEDIA (SIN API)
            } else if (call.name === 'browse_web' || call.name === 'buscar_internet' || call.name === 'light_search') {
                const rawParam = args.query || args.url || args.textoBuscado || "";
                let queryOrUrl = rawParam;
                if (rawParam.startsWith('http://') || rawParam.startsWith('https://')) {
                    try {
                        const parsed = new URL(rawParam);
                        if (parsed.hostname.includes('google.') && parsed.searchParams.has('q')) {
                            queryOrUrl = parsed.searchParams.get('q');
                        }
                    } catch(e) {}
                }
                if (args.type === 'wikipedia' || args.type === 'wiki') {
                    resultadoTexto = await freeSearchEngine.searchWikipedia(queryOrUrl, args.lang || 'es');
                } else if (queryOrUrl && (!queryOrUrl.startsWith('http://') && !queryOrUrl.startsWith('https://'))) {
                    resultadoTexto = await freeSearchEngine.search(queryOrUrl, 'auto', args.lang || 'es');
                } else {
                    if (typeof webBrowser !== 'undefined' && typeof webBrowser.browse === 'function') {
                        resultadoTexto = await webBrowser.browse(queryOrUrl, args.use_nova || false);
                    } else {
                        resultadoTexto = await freeSearchEngine.search(queryOrUrl, 'auto');
                    }
                }

            // SERVICIOS EXTERNOS SIN API KEY (apiServices.js)
            } else if (call.name === 'obtenerClima') {
                resultadoTexto = await apiServices.obtenerClima(args.latitud, args.longitud);
            } else if (call.name === 'obtenerPrecioCripto') {
                resultadoTexto = await apiServices.obtenerPrecioCripto(args.ids, args.divisas);
            } else if (call.name === 'obtenerDatosCoinPaprika') {
                resultadoTexto = await apiServices.obtenerDatosCoinPaprika(args.coinId);
            } else if (call.name === 'obtenerEstadoMempool') {
                resultadoTexto = await apiServices.obtenerEstadoMempool();
            } else if (call.name === 'convertirDivisa') {
                resultadoTexto = await apiServices.convertirDivisa(args.cantidad, args.desde, args.hacia);
            } else if (call.name === 'obtenerDatosPais') {
                resultadoTexto = await apiServices.obtenerDatosPais(args.nombrePais);
            } else if (call.name === 'consultarWikipedia') {
                resultadoTexto = await apiServices.consultarWikipedia(args.termino, args.idioma);

            } else if (call.name === 'escribirArchivo') {
                const nombreArchivo = args.nombre || "index.html";
                const contenidoArchivo = String(args.contenido || "");
                await escribirArchivo(nombreArchivo, contenidoArchivo);
                resultadoTexto = `Archivo ${nombreArchivo} guardado y actualizado completamente en su formato correcto.`;
                const editorFilename = document.getElementById('editorFilename');
                const editorContent = document.getElementById('editorContent');
                const editorPanel = document.getElementById('editorPanel');
                if (editorFilename) editorFilename.value = nombreArchivo;
                if (editorContent) editorContent.value = contenidoArchivo;
                if (editorPanel) editorPanel.style.display = 'flex';
            } else if (call.name === 'reemplazarTexto') {
                const nombreArchivo = args.nombre || "";
                const textoBuscado = args.textoBuscado || "";
                const textoNuevo = args.textoNuevo || "";
                const nuevoContenido = await reemplazarTextoArchivo(nombreArchivo, textoBuscado, textoNuevo);
                resultadoTexto = `Texto modificado con éxito en ${nombreArchivo}.`;
                const editorFilename = document.getElementById('editorFilename');
                const editorContent = document.getElementById('editorContent');
                if (editorFilename && editorFilename.value === nombreArchivo && editorContent) {
                    editorContent.value = nuevoContenido;
                }
            } else if (call.name === 'agregarAlFinal') {
                const nombreArchivo = args.nombre || "";
                const textoAgregar = args.textoAgregar || "";
                const nuevoContenido = await agregarAlFinalArchivo(nombreArchivo, textoAgregar);
                resultadoTexto = `Texto añadido al final de ${nombreArchivo} con éxito.`;
                const editorFilename = document.getElementById('editorFilename');
                const editorContent = document.getElementById('editorContent');
                if (editorFilename && editorFilename.value === nombreArchivo && editorContent) {
                    editorContent.value = nuevoContenido;
                }
            } else if (call.name === 'renombrarArchivo') {
                resultadoTexto = await renombrarArchivoLocal(args.nombreAntiguo || "", args.nombreNuevo || "");
                const editorFilename = document.getElementById('editorFilename');
                if (editorFilename && editorFilename.value === args.nombreAntiguo) {
                    const editorPanel = document.getElementById('editorPanel');
                    if (editorPanel) editorPanel.style.display = 'none';
                    editorFilename.value = '';
                    const editorContent = document.getElementById('editorContent');
                    if (editorContent) editorContent.value = '';
                }
            } else if (call.name === 'borrarArchivo') {
                const nombreArchivo = args.nombre || "";
                await borrarArchivo(nombreArchivo);
                resultadoTexto = `Archivo ${nombreArchivo} eliminado permanentemente.`;
                const editorFilename = document.getElementById('editorFilename');
                if (editorFilename && editorFilename.value === nombreArchivo) {
                    const editorPanel = document.getElementById('editorPanel');
                    if (editorPanel) editorPanel.style.display = 'none';
                    editorFilename.value = '';
                    const editorContent = document.getElementById('editorContent');
                    if (editorContent) editorContent.value = '';
                }
            } else if (call.name === 'abrirArchivoEnEditor') {
                const nombreArchivo = args.nombre || "";
                if (typeof abrirArchivoManual === 'function') {
                    await abrirArchivoManual(nombreArchivo);
                    resultadoTexto = `Archivo ${nombreArchivo} abierto con éxito en el editor visual.`;
                }
            } else if (call.name === 'deshacerAccion') {
                resultadoTexto = await deshacerAccionSistema();
            } else if (call.name === 'rehacerAccion') {
                resultadoTexto = await rehacerAccionSistema();
            } else if (call.name === 'analizarContenido') {
                resultadoTexto = await analizarContenido(args.tipoAnalisis, args.objetivo, args.instrucciones, args.nombreResultado);
            } else if (call.name === 'generarImagenesSVG') {
                resultadoTexto = await generarImagenesSVG(args.prompts, args.nombresArchivos);
            } else if (call.name === 'analisisCompleto') {
                resultadoTexto = await ejecutarAnalisisCompletoModeloFuerte(args.objetivo, args.instrucciones);
            } else {
                resultadoTexto = "Error: Función de herramienta no reconocida.";
            }
        } catch (err) {
            console.error("Error ejecutando herramienta local:", err);
            resultadoTexto = err.message;
        }

        const respuestaEmpaquetada = {
            name: call.name,
            response: { result: resultadoTexto }
        };
        if (call.id) {
            respuestaEmpaquetada.id = call.id;
        }
        functionResponses.push(respuestaEmpaquetada);
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
        const payload = {
            toolResponse: {
                functionResponses: functionResponses
            }
        };
        console.log("Enviando paquete toolResponse al servidor:", payload);
        ws.send(JSON.stringify(payload));
        if (typeof addMessage === 'function') {
            addMessage('system', `  Resultados empaquetados y enviados a la IA.`);
        }
    }
}