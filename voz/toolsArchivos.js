// SILENOS 5 VOZ/toolsArchivos.js

// ─── MANEJADOR DE TOOL CALLING DESDE WEBSOCKET ───
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
            addMessage('system', `⚙️ IA ejecutando: ${call.name}(${JSON.stringify(args)})`);
        }
        
        try {
            if (call.name === 'listarArchivos') {
                const archivos = await listarArchivos();
                resultadoTexto = archivos.length > 0 ? "Archivos encontrados: " + archivos.join(', ') : "La carpeta está vacía o no hay archivos .txt.";
            
            } else if (call.name === 'leerArchivo') {
                const contenido = await leerArchivo(args.nombre || "");
                resultadoTexto = `Contenido de ${args.nombre}:\n${contenido}`;
            
            } else if (call.name === 'escribirArchivo') {
                const nombreArchivo = args.nombre || "sin_nombre.txt";
                const contenidoArchivo = String(args.contenido || "");
                
                await escribirArchivo(nombreArchivo, contenidoArchivo);
                resultadoTexto = `Archivo ${nombreArchivo} guardado y actualizado completamente.`;
                
                // ACTUALIZACIÓN VISUAL INMEDIATA EN EL EDITOR
                const nombreConExt = nombreArchivo.toLowerCase().endsWith('.txt') ? nombreArchivo : nombreArchivo + '.txt';
                document.getElementById('editorFilename').value = nombreConExt;
                document.getElementById('editorContent').value = contenidoArchivo;
                document.getElementById('editorPanel').style.display = 'flex';

            } else if (call.name === 'reemplazarTexto') {
                const nombreArchivo = args.nombre || "";
                const textoBuscado = args.textoBuscado || "";
                const textoNuevo = args.textoNuevo || "";
                
                const nuevoContenido = await reemplazarTextoArchivo(nombreArchivo, textoBuscado, textoNuevo);
                resultadoTexto = `Texto reemplazado con éxito en ${nombreArchivo}.`;

                // ACTUALIZACIÓN VISUAL
                const nombreConExt = nombreArchivo.toLowerCase().endsWith('.txt') ? nombreArchivo : nombreArchivo + '.txt';
                if (document.getElementById('editorFilename').value === nombreConExt) {
                    document.getElementById('editorContent').value = nuevoContenido;
                }

            } else if (call.name === 'agregarAlFinal') {
                const nombreArchivo = args.nombre || "";
                const textoAgregar = args.textoAgregar || "";
                
                const nuevoContenido = await agregarAlFinalArchivo(nombreArchivo, textoAgregar);
                resultadoTexto = `Texto añadido al final de ${nombreArchivo} con éxito.`;

                // ACTUALIZACIÓN VISUAL
                const nombreConExt = nombreArchivo.toLowerCase().endsWith('.txt') ? nombreArchivo : nombreArchivo + '.txt';
                if (document.getElementById('editorFilename').value === nombreConExt) {
                    document.getElementById('editorContent').value = nuevoContenido;
                }

            } else if (call.name === 'leerLineas') {
                resultadoTexto = await leerLineas(args.nombre || "", args.lineaInicio || 1, args.lineaFin || 100);

            } else if (call.name === 'buscarEnArchivos') {
                resultadoTexto = await buscarEnArchivos(args.textoBuscado || "");

            } else if (call.name === 'renombrarArchivo') {
                resultadoTexto = await renombrarArchivoLocal(args.nombreAntiguo || "", args.nombreNuevo || "");
                
                // CIERRE VISUAL DEL EDITOR SI SE RENOMBRÓ EL QUE ESTABA ABIERTO
                const nombreConExt = (args.nombreAntiguo || "").toLowerCase().endsWith('.txt') ? args.nombreAntiguo : args.nombreAntiguo + '.txt';
                if (document.getElementById('editorFilename').value === nombreConExt) {
                    document.getElementById('editorPanel').style.display = 'none';
                    document.getElementById('editorFilename').value = '';
                    document.getElementById('editorContent').value = '';
                }

            } else if (call.name === 'borrarArchivo') {
                const nombreArchivo = args.nombre || "";
                await borrarArchivo(nombreArchivo);
                resultadoTexto = `Archivo ${nombreArchivo} eliminado permanentemente.`;
                
                // CIERRE VISUAL DEL EDITOR SI EL ARCHIVO BORRADO ESTABA ABIERTO
                const nombreConExt = nombreArchivo.toLowerCase().endsWith('.txt') ? nombreArchivo : nombreArchivo + '.txt';
                if (document.getElementById('editorFilename').value === nombreConExt) {
                    document.getElementById('editorPanel').style.display = 'none';
                    document.getElementById('editorFilename').value = '';
                    document.getElementById('editorContent').value = '';
                }

            } else if (call.name === 'abrirArchivoEnEditor') {
                const nombreArchivo = args.nombre || "";
                await abrirArchivoManual(nombreArchivo);
                resultadoTexto = `Archivo ${nombreArchivo} abierto con éxito en el editor visual del usuario.`;

            } else if (call.name === 'deshacerAccion') {
                resultadoTexto = await deshacerAccionSistema();

            } else if (call.name === 'rehacerAccion') {
                resultadoTexto = await rehacerAccionSistema();

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
            addMessage('system', `✅ Resultados empaquetados y enviados a la IA.`);
        }
    }
}