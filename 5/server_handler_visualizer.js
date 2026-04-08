// live gemini/server_handler_visualizer.js

async function handleVisualizerTool(args) {
    if (typeof visualizadorUI === 'undefined') return "Error: El módulo Visualizador no está cargado en la web.";
    const { action, path, content } = args;

    try {
        if (action === 'close') {
            visualizadorUI.close();
            return "Visualizador cerrado exitosamente.";
        }

        if (!workspaceHandle) return "Error: Dile al usuario que seleccione una carpeta local (Workspace) primero.";

        let targetPath = path || "/";

        if (action === 'open_folder') {
            const handle = await explorerLens.getHandleFromPath(targetPath);
            if (handle.kind !== 'directory') return `Error: '${targetPath}' no es una carpeta.`;
            await visualizadorUI.open(handle);
            return `El Visualizador ha sido abierto mostrando la carpeta: '${targetPath}'.`;
        } 
        else if (action === 'open_file') {
            const handle = await explorerLens.getHandleFromPath(targetPath);
            if (handle.kind !== 'file') return `Error: '${targetPath}' no es un archivo.`;
            
            let parentPath = targetPath.split('/').slice(0, -1).join('/');
            let parentHandle = workspaceHandle;
            if (parentPath) {
                try { parentHandle = await explorerLens.getHandleFromPath(parentPath); } catch(e) {}
            }
            
            await visualizadorUI.open(parentHandle);
            await visualizadorUI.openFilePreview(handle);
            
            return `El archivo '${targetPath}' ha sido abierto en el Visualizador/Editor.`;
        }
        else if (action === 'write_all') {
            const editor = document.getElementById('visEditor');
            if (editor && visualizadorUI.currentFileHandle) {
                const oldContent = editor.value;
                editor.value = content || '';
                
                // Guardado de persistencia y en histórico
                await historyManager.saveState(visualizadorUI.currentFileHandle, oldContent, editor.value);
                await visualizadorUI.saveFile();
                historyManager.logAction('IA (Visualizer)', `Sobrescribió el archivo ${visualizadorUI.currentFileHandle.name}`);

                return "Contenido reemplazado y guardado permanentemente en disco. El cambio está registrado en tu historial y el del usuario (Ctrl+Z para deshacer).";
            }
            return "Error: No se encontró un archivo de texto abierto actualmente en el visualizador.";
        } 
        else if (action === 'append') {
            const editor = document.getElementById('visEditor');
            if (editor && visualizadorUI.currentFileHandle) {
                const oldContent = editor.value;
                editor.value += (content || '');

                await historyManager.saveState(visualizadorUI.currentFileHandle, oldContent, editor.value);
                await visualizadorUI.saveFile();
                historyManager.logAction('IA (Visualizer)', `Añadió contenido al final de ${visualizadorUI.currentFileHandle.name}`);

                return "Contenido añadido y guardado en disco.";
            }
            return "Error: No se encontró un archivo abierto.";
        } 
        else if (action === 'save') {
            if (visualizadorUI.currentFileHandle) {
                await visualizadorUI.saveFile();
                historyManager.logAction('IA (Visualizer)', `Forzó guardado en disco de ${visualizadorUI.currentFileHandle.name}`);
                return `Archivo guardado exitosamente en disco: ${visualizadorUI.currentFileHandle.name}`;
            } else {
                return "Error: No hay ningún archivo abierto actualmente para guardar.";
            }
        } 
        else if (action === 'read') {
            const editor = document.getElementById('visEditor');
            if (editor) {
                return editor.value || "(El archivo está vacío)";
            }
            return "Error: No se encontró ningún archivo de texto abierto.";
        } 
        else if (action === 'create_folder') {
            if (!path) return "Error: Falta el parámetro 'path'.";
            await visualizadorUI.ensurePath(path, true);
            
            historyManager.logAction('IA (Visualizer)', `Creó la carpeta ${path}`);
            
            // Actualización forzada en vivo
            await visualizadorUI.open(workspaceHandle); 
            if (typeof ide !== 'undefined' && ide.currentDirHandle) ide.refreshTree();

            return `Carpetas creadas: '${path}'. Vista actualizada.`;
        } 
        else if (action === 'create_file') {
            if (!path) return "Error: Falta el parámetro 'path'.";
            const handle = await visualizadorUI.ensurePath(path, false);
            if (content) {
                const w = await handle.createWritable();
                await w.write(content);
                await w.close();
            }
            
            let parentPath = path.split('/').slice(0, -1).join('/');
            let parentHandle = workspaceHandle;
            if (parentPath) {
                try { parentHandle = await explorerLens.getHandleFromPath(parentPath); } catch(e) {}
            }
            
            historyManager.logAction('IA (Visualizer)', `Creó el archivo ${path}`);

            // Actualización forzada en vivo de las Vistas y apertura
            await visualizadorUI.open(parentHandle);
            await visualizadorUI.openFilePreview(handle);
            if (typeof ide !== 'undefined' && ide.currentDirHandle) ide.refreshTree();

            return `Archivo '${path}' creado, guardado y abierto correctamente. El entorno visual ha sido recargado para mostrarlo.`;
        }
        else {
            return `Acción '${action}' no reconocida para el Visualizador.`;
        }
    } catch (e) {
        return `Error en el visualizador/editor: ${e.message}`;
    }
}