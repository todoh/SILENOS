// live gemini/server_handler_fileops.js

async function handleFileOperationsTool(args) {
    if (!workspaceHandle) return "Error: El usuario no ha seleccionado una carpeta local (Workspace) primero.";
    const { action, source_path, destination_path } = args;

    if (!source_path || !destination_path) return "Error: Se requieren 'source_path' y 'destination_path'.";

    try {
        // Función helper para obtener el Handle del padre y construir rutas si no existen
        async function getParentAndName(fullPath) {
            let parts = fullPath.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
            if (parts.length === 0) throw new Error("Ruta inválida.");
            let name = parts.pop();
            let parentHandle = workspaceHandle;
            // Creamos los directorios intermedios si no existen para el destino
            for (const p of parts) {
                parentHandle = await parentHandle.getDirectoryHandle(p, { create: true });
            }
            return { parentHandle, name };
        }

        let srcHandle = null;
        let isDir = false;
        try {
            srcHandle = await explorerLens.getHandleFromPath(source_path);
            isDir = srcHandle.kind === 'directory';
        } catch(e) {
            return `Error: No se encontró el archivo o carpeta de origen '${source_path}'.`;
        }

        const { parentHandle: srcParent, name: srcName } = await getParentAndName(source_path);
        const { parentHandle: destParent, name: destName } = await getParentAndName(destination_path);

        // Copiador recursivo binario para mover cosas sin cargarlas como texto
        async function copyRecursive(src, targetParent, newName) {
            if (src.kind === 'file') {
                const destFile = await targetParent.getFileHandle(newName, { create: true });
                const file = await src.getFile();
                const writable = await destFile.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            } else if (src.kind === 'directory') {
                const newDir = await targetParent.getDirectoryHandle(newName, { create: true });
                for await (const entry of src.values()) {
                    await copyRecursive(entry, newDir, entry.name);
                }
            }
        }

        if (action === 'copy') {
            await copyRecursive(srcHandle, destParent, destName);
            historyManager.logAction('IA (FileOps)', `Copió ${source_path} a ${destination_path}`);
            if (typeof ide !== 'undefined' && ide.currentDirHandle) ide.refreshTree();
            if (typeof visualizadorUI !== 'undefined' && visualizadorUI.currentDirHandle) visualizadorUI.renderCurrentFolder();
            return `Operación exitosa: Se ha COPIADO '${source_path}' a '${destination_path}'.`;
        } else if (action === 'move' || action === 'cut') {
            await copyRecursive(srcHandle, destParent, destName);
            await srcParent.removeEntry(srcName, { recursive: isDir });
            historyManager.logAction('IA (FileOps)', `Movió/Cortó ${source_path} a ${destination_path}`);
            if (typeof ide !== 'undefined' && ide.currentDirHandle) ide.refreshTree();
            if (typeof visualizadorUI !== 'undefined' && visualizadorUI.currentDirHandle) visualizadorUI.renderCurrentFolder();
            return `Operación exitosa: Se ha MOVIDO/CORTADO '${source_path}' a '${destination_path}'.`;
        } else {
            return `Error: Acción '${action}' no reconocida. Usa 'copy' o 'move'.`;
        }

    } catch (e) {
        return `Error crítico en la operación de archivos: ${e.message}`;
    }
}