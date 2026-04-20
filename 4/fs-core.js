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
        
        // --- SINCRONIZACIÓN AUTOMÁTICA GITHUB ---
        // Descarga la carpeta 'programas' (y 'KOREH') al disco local al iniciar
        if (typeof downloadGithubPrograms === 'function') {
            await downloadGithubPrograms(window.currentHandle);
        }

        // --- CARGA DE SUBSISTEMA KOREH ---
        // Escanea y carga los módulos globales .js en memoria
        await initKorehSystem(window.currentHandle);

        // --- INICIO DEL UNIVERSO ---
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

// --- SISTEMA KOREH (CARGADOR DE MÓDULOS) ---
async function initKorehSystem(rootHandle) {
    try {
        // 1. Intentar acceder a la ruta /programas/koreh
        const progHandle = await rootHandle.getDirectoryHandle('programas');
        const korehHandle = await progHandle.getDirectoryHandle('koreh');

        console.log("🧩 [KOREH] Escaneando módulos en /programas/koreh...");
        
        // 2. Iterar sobre todos los archivos de la carpeta
        for await (const entry of korehHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.js')) {
                try {
                    const file = await entry.getFile();
                    const text = await file.text();
                    
                    // 3. Inyectar el script en el <head> del entorno principal (Silenos)
                    const scriptId = `koreh-module-${entry.name}`;
                    
                    // Evitar duplicados si se refresca el sistema
                    const existing = document.getElementById(scriptId);
                    if (existing) existing.remove();

                    const script = document.createElement('script');
                    script.id = scriptId;
                    script.textContent = text;
                    document.head.appendChild(script);
                    
                    console.log(`✅ [KOREH] Módulo cargado globalmente: ${entry.name}`);
                } catch(err) {
                    console.error(`❌ [KOREH] Error evaluando el archivo ${entry.name}:`, err);
                }
            }
        }
    } catch (e) {
        // Si no existe la carpeta, no pasa nada, simplemente no hay módulos extra.
        console.log("ℹ️ [KOREH] Carpeta '/programas/koreh' no encontrada. Saltando inicialización de módulos.");
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
// MODIFICADO: Acepta targetHandle opcional para escribir en carpetas específicas
async function writeFileToSystem(filename, content, isBinary = false, targetHandle = null) {
    // Si no se especifica target, usa el directorio actual (Escritorio)
    const dir = targetHandle || window.currentHandle;
    
    if (!dir) {
        console.error("No hay directorio destino para guardar.");
        return;
    }

    try {
        const fileHandle = await dir.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        if (typeof log === 'function') log(`GUARDADO: ${filename}`);
        
        // Actualizar Universo o Ventanas
        // Usamos Actions.refreshViews si existe, ya que sabe qué ventana refrescar
        if (typeof Actions !== 'undefined' && typeof Actions.refreshViews === 'function') {
            Actions.refreshViews(dir);
        } else if (typeof Universe !== 'undefined') {
            // Fallback: Si estamos en el escritorio, recargar universo
            if (window.currentHandle && await window.currentHandle.isSameEntry(dir)) {
                await Universe.loadDirectory(window.currentHandle);
            }
        } else if (typeof refreshFileTree === 'function') {
            await refreshFileTree();
        }
        
    } catch (err) {
        console.error("Error guardando:", err);
        alert("Error al guardar: " + err.message);
    }
}