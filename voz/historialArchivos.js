// SILENOS 5 VOZ/historialArchivos.js

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