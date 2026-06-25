// SILENOS 5 VOZ/gestorArchivos.js

// ─── GESTOR DE ARCHIVOS LOCALES (FILE SYSTEM ACCESS API) ───
let directoryHandle = null;

// Historial para deshacer y rehacer
let historialDeshacer = [];
let historialRehacer = [];
let ejecutandoHistorial = false;

async function abrirCarpeta() {
    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });
        document.getElementById('folderStatus').innerText = "📁 " + directoryHandle.name;
        await actualizarUIArchivos();
        
        document.getElementById('newFileBtn').style.display = 'block';
        
        if (typeof addMessage === 'function') {
            addMessage('system', `Carpeta "${directoryHandle.name}" vinculada. El asistente y tú podéis manipular los .txt`);
        }
    } catch (e) {
        console.error("Error al abrir carpeta:", e);
        if (typeof addMessage === 'function') {
            addMessage('system', 'Error o cancelación al abrir la carpeta.');
        }
    }
}

async function listarArchivos() {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    const archivos = [];
    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.txt')) {
            archivos.push(entry.name);
        }
    }
    return archivos;
}

async function leerArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    try {
        const fileHandle = await directoryHandle.getFileHandle(nombre);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text;
    } catch (e) {
        throw new Error(`No se pudo leer el archivo ${nombre}. ¿Existe?`);
    }
}

async function escribirArchivo(nombre, contenido) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    
    // Guardar estado para historial si no estamos deshaciendo/rehaciendo
    if (!ejecutandoHistorial) {
        let contenidoAnterior = null;
        try {
            const fileHandle = await directoryHandle.getFileHandle(nombre);
            const file = await fileHandle.getFile();
            contenidoAnterior = await file.text();
        } catch (e) {
            // El archivo no existía, es nuevo
        }
        
        historialDeshacer.push({
            accion: 'escribir',
            nombre: nombre,
            contenidoAnterior: contenidoAnterior,
            contenidoNuevo: contenido
        });
        historialRehacer = []; // Se invalida el futuro al hacer un cambio nuevo
    }

    const fileHandle = await directoryHandle.getFileHandle(nombre, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contenido);
    await writable.close();
    await actualizarUIArchivos();
}

async function borrarArchivo(nombre) {
    if (!directoryHandle) throw new Error("AVISO DEL SISTEMA PARA LA IA: No puedes ejecutar esta acción porque el usuario no ha conectado la carpeta. Infórmale de esto amablemente y explícale que debe pulsar el botón '📂 ABRIR CARPETA TXT' en la interfaz para conectarla.");
    if (!nombre.toLowerCase().endsWith('.txt')) nombre += '.txt';
    
    // Guardar estado para historial si no estamos deshaciendo/rehaciendo
    if (!ejecutandoHistorial) {
        let contenidoAnterior = null;
        try {
            const fileHandle = await directoryHandle.getFileHandle(nombre);
            const file = await fileHandle.getFile();
            contenidoAnterior = await file.text();
        } catch (e) {
            throw new Error(`El archivo ${nombre} no existe o no se pudo leer.`);
        }
        
        historialDeshacer.push({
            accion: 'borrar',
            nombre: nombre,
            contenidoAnterior: contenidoAnterior
        });
        historialRehacer = []; 
    }

    await directoryHandle.removeEntry(nombre);
    await actualizarUIArchivos();
}

// ─── LÓGICA DE DESHACER Y REHACER ───
function sincronizarEditor(nombre, contenido) {
    const nombreConExt = nombre.toLowerCase().endsWith('.txt') ? nombre : nombre + '.txt';
    if (document.getElementById('editorFilename').value === nombreConExt) {
        if (contenido === null) {
            document.getElementById('editorPanel').style.display = 'none';
            document.getElementById('editorFilename').value = '';
            document.getElementById('editorContent').value = '';
        } else {
            document.getElementById('editorContent').value = contenido;
            document.getElementById('editorPanel').style.display = 'flex';
        }
    }
}

async function deshacerAccionSistema() {
    if (!directoryHandle) throw new Error("Carpeta no conectada.");
    if (historialDeshacer.length === 0) return "No hay ninguna acción en el historial para deshacer.";
    
    const ultima = historialDeshacer.pop();
    ejecutandoHistorial = true;
    
    try {
        if (ultima.accion === 'escribir') {
            if (ultima.contenidoAnterior === null) {
                // Era un archivo nuevo, lo borramos
                await directoryHandle.removeEntry(ultima.nombre);
                sincronizarEditor(ultima.nombre, null);
            } else {
                // Restauramos contenido
                const fileHandle = await directoryHandle.getFileHandle(ultima.nombre, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(ultima.contenidoAnterior);
                await writable.close();
                sincronizarEditor(ultima.nombre, ultima.contenidoAnterior);
            }
        } else if (ultima.accion === 'borrar') {
            // Restauramos el archivo borrado
            const fileHandle = await directoryHandle.getFileHandle(ultima.nombre, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(ultima.contenidoAnterior);
            await writable.close();
        }
        await actualizarUIArchivos();
        historialRehacer.push(ultima);
    } finally {
        ejecutandoHistorial = false;
    }
    return `Se ha deshecho la acción con éxito. El archivo ${ultima.nombre} ha vuelto a su estado anterior.`;
}

async function rehacerAccionSistema() {
    if (!directoryHandle) throw new Error("Carpeta no conectada.");
    if (historialRehacer.length === 0) return "No hay ninguna acción en el historial para rehacer.";
    
    const siguiente = historialRehacer.pop();
    ejecutandoHistorial = true;
    
    try {
        if (siguiente.accion === 'escribir') {
            const fileHandle = await directoryHandle.getFileHandle(siguiente.nombre, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(siguiente.contenidoNuevo);
            await writable.close();
            sincronizarEditor(siguiente.nombre, siguiente.contenidoNuevo);
        } else if (siguiente.accion === 'borrar') {
            await directoryHandle.removeEntry(siguiente.nombre);
            sincronizarEditor(siguiente.nombre, null);
        }
        await actualizarUIArchivos();
        historialDeshacer.push(siguiente);
    } finally {
        ejecutandoHistorial = false;
    }
    return `Se ha rehecho la acción con éxito en el archivo ${siguiente.nombre}.`;
}

async function actualizarUIArchivos() {
    if (!directoryHandle) return;
    const panel = document.getElementById('fileList');
    panel.innerHTML = '';
    const archivos = await listarArchivos();
    archivos.forEach(arch => {
        const div = document.createElement('div');
        div.className = 'file-item';
        div.innerText = "📄 " + arch;
        div.onclick = () => abrirArchivoManual(arch);
        panel.appendChild(div);
    });
}

// ─── MANEJO MANUAL DE ARCHIVOS POR EL USUARIO ───

async function abrirArchivoManual(nombre) {
    try {
        const contenido = await leerArchivo(nombre);
        document.getElementById('editorFilename').value = nombre;
        document.getElementById('editorContent').value = contenido;
        document.getElementById('editorPanel').style.display = 'flex';
    } catch (e) {
        alert("Error al abrir para editar: " + e.message);
    }
}

function nuevoArchivoManual() {
    document.getElementById('editorFilename').value = '';
    document.getElementById('editorContent').value = '';
    document.getElementById('editorPanel').style.display = 'flex';
    document.getElementById('editorFilename').focus();
}

async function guardarManual() {
    const nombre = document.getElementById('editorFilename').value.trim();
    const contenido = document.getElementById('editorContent').value;
    
    if (!nombre) return alert("Debes darle un nombre al archivo (ej: lore.txt).");
    
    try {
        await escribirArchivo(nombre, contenido);
        const btn = document.querySelector('.editor-controls button');
        const oldText = btn.innerText;
        btn.innerText = "¡GUARDADO!";
        setTimeout(() => btn.innerText = oldText, 1000);
    } catch (e) {
        alert("Error al guardar: " + e.message);
    }
}

async function borrarManual() {
    const nombre = document.getElementById('editorFilename').value.trim();
    if (!nombre) return;

    if (confirm(`¿Estás seguro de que quieres destruir "${nombre}" de forma permanente?`)) {
        try {
            await borrarArchivo(nombre);
            document.getElementById('editorPanel').style.display = 'none';
            document.getElementById('editorFilename').value = '';
            document.getElementById('editorContent').value = '';
        } catch (e) {
            alert("Error al borrar: " + e.message);
        }
    }
}

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
                resultadoTexto = `Archivo ${nombreArchivo} guardado y actualizado correctamente.`;
                
                // ACTUALIZACIÓN VISUAL INMEDIATA EN EL EDITOR
                const nombreConExt = nombreArchivo.toLowerCase().endsWith('.txt') ? nombreArchivo : nombreArchivo + '.txt';
                document.getElementById('editorFilename').value = nombreConExt;
                document.getElementById('editorContent').value = contenidoArchivo;
                document.getElementById('editorPanel').style.display = 'flex';

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