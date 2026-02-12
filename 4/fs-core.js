// --- FS-CORE.JS (CORE FILE SYSTEM) ---
// Variables Globales para acceso desde otros scripts
window.rootHandle = null;
window.currentHandle = null; // Directorio actual

async function initFileSystem() {
    try {
        // Pedir permiso al usuario
        window.rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        window.currentHandle = window.rootHandle;
        
        // UI Updates
        if (typeof toggleInterface === 'function') toggleInterface(true);
        if (typeof log === 'function') log('ROOT DIRECTORY MOUNTED');
        if (typeof updatePathDisplay === 'function') updatePathDisplay('', window.rootHandle.name);
        
        // --- AQUÍ EL CAMBIO PRINCIPAL ---
        // Iniciamos el motor Universe en lugar del árbol de texto
        if (typeof Universe !== 'undefined') {
            Universe.init('drop-zone'); // Montar en el área principal
            await Universe.loadDirectory(window.currentHandle);
        } else {
            // Fallback si algo falló
            if (typeof refreshFileTree === 'function') await refreshFileTree();
        }
        
        console.log("📂 Sistema de Archivos Montado Exitosamente.");

    } catch (err) {
        console.error(err);
        if (err.name === 'AbortError') {
            if (typeof log === 'function') log('Selección cancelada por usuario.');
        } else {
            alert(`ERROR CRÍTICO: ${err.message}`);
        }
    }
}

// Función auxiliar para leer archivos (usada por fs-actions.js)
async function readFileContent(filename) {
    if (!window.currentHandle) return null;
    try {
        const fileHandle = await window.currentHandle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (err) {
        console.error("Error leyendo archivo:", err);
        return null;
    }
}

// Función auxiliar para escribir archivos
async function writeFileToSystem(filename, content) {
    if (!window.currentHandle) return;
    try {
        const fileHandle = await window.currentHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        if (typeof log === 'function') log(`GUARDADO: ${filename}`);
        
        // Actualizar Universo
        if (typeof Universe !== 'undefined') {
            await Universe.loadDirectory(window.currentHandle);
        } else if (typeof refreshFileTree === 'function') {
            await refreshFileTree();
        }
        
    } catch (err) {
        console.error("Error guardando:", err);
        alert("Error al guardar: " + err.message);
    }
}