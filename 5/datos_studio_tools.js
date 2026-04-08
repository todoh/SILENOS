// live gemini/datos_studio_tools.js

async function handleDatosStudioTool(args) {
    const { action, filename, name, type, desc, visual_desc, path, svg_content } = args;

    // Acción especial para cambiar de carpeta (no requiere activeHandle previo)
    if (action === 'set_folder') {
        if (!path) return "Error: Se requiere el parámetro 'path' para establecer la carpeta.";
        try {
            const handle = await explorerLens.getHandleFromPath(path);
            if (handle.kind !== 'directory') return `Error: '${path}' no es una carpeta.`;
            
            if (typeof datosStudioUI !== 'undefined') {
                datosStudioUI.currentFolderHandle = handle;
                const label = document.getElementById('dsFolderLabel');
                if (label) label.innerText = `(${handle.name})`;
                
                // Si la UI está abierta, forzamos recarga visual
                const modal = document.getElementById('datosStudioModal');
                if (modal && !modal.classList.contains('hidden')) {
                    await datosStudioUI.loadFiles();
                }
            }
            return `Carpeta activa de Datos Studio cambiada exitosamente a: '${path}'.`;
        } catch(e) {
            return `Error al intentar cambiar la carpeta de Datos Studio: ${e.message}`;
        }
    }

    // Para el resto de acciones, necesitamos un handle activo
    let activeHandle = (typeof datosStudioUI !== 'undefined' && datosStudioUI.currentFolderHandle) ? datosStudioUI.currentFolderHandle : workspaceHandle;
    
    if (!activeHandle) return "Error: No hay una carpeta principal ni una específica de Datos Studio seleccionada.";

    try {
        if (action === 'create_data') {
            // CORRECCIÓN: Permitir que la IA especifique el nombre del archivo para no perder la referencia
            let newFilename = filename;
            if (!newFilename) {
                const cleanName = (name || "Nuevo Dato").trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
                newFilename = `${cleanName}_${Date.now()}.json`;
            } else if (!newFilename.endsWith('.json')) {
                newFilename += '.json';
            }
            
            const data = {
                name: name || "Nuevo Dato",
                type: type || "General",
                desc: desc || "",
                visualDesc: visual_desc || "",
                imagen64: null
            };

            // CORRECCIÓN: Procesar el SVG mediante Blob (Memory Safe) en el mismo paso de creación si se aporta
            if (svg_content) {
                const blob = new Blob([svg_content], { type: 'image/svg+xml' });
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                data.imagen64 = await base64Promise;
            }

            const fileHandle = await activeHandle.getFileHandle(newFilename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            if (typeof datosStudioUI !== 'undefined') {
                await datosStudioUI.loadFiles();
            }

            return `Dato narrativo creado exitosamente como ${newFilename} en la carpeta activa de Datos Studio.`;
        }
        else if (action === 'update_data') {
            if (!filename) return "Error: Se requiere 'filename' para actualizar el dato.";
            
            const fileHandle = await activeHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            let data = JSON.parse(text);

            if (name) data.name = name;
            if (type) data.type = type;
            if (desc) data.desc = desc;
            if (visual_desc) data.visualDesc = visual_desc;

            // CORRECCIÓN: Soporte de SVG inyectado durante una actualización ordinaria
            if (svg_content) {
                const blob = new Blob([svg_content], { type: 'image/svg+xml' });
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                data.imagen64 = await base64Promise;
            }

            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            if (typeof datosStudioUI !== 'undefined') {
                await datosStudioUI.loadFiles();
                if (datosStudioUI.currentFileHandle && datosStudioUI.currentFileHandle.name === filename) {
                    if (typeof datosStudioEditor !== 'undefined') datosStudioEditor.openItem({handle: fileHandle, data: data, name: filename});
                }
            }

            return `Dato narrativo '${filename}' actualizado correctamente con el nuevo lore/datos en la carpeta activa.`;
        }
        else if (action === 'delete_data') {
            if (!filename) return "Error: Se requiere 'filename' para eliminar.";
            await activeHandle.removeEntry(filename);
            
            if (typeof datosStudioUI !== 'undefined') {
                if (datosStudioUI.currentFileHandle && datosStudioUI.currentFileHandle.name === filename) {
                    datosStudioEditor.closeItem();
                }
                await datosStudioUI.loadFiles();
            }
            return `Dato '${filename}' eliminado y purgado de la base de datos activa.`;
        }
        else if (action === 'get_all_data') {
            let summaries = [];
            for await (const entry of activeHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.json') && !entry.name.includes('TIMELINE') && !entry.name.includes('TRAMAS')) {
                    try {
                        const file = await entry.getFile();
                        const text = await file.text();
                        const json = JSON.parse(text);
                        summaries.push(`- Archivo: ${entry.name} | Nombre: ${json.name} | Tipo: ${json.type} | Desc: ${json.desc.substring(0, 150)}...`);
                    } catch(e) {}
                }
            }
            if (summaries.length === 0) return "No hay datos narrativos en la carpeta activa de Datos Studio.";
            return "Lista de datos narrativos mapeados en la carpeta actual:\n" + summaries.join('\n');
        }
        else if (action === 'illustrate_data') {
            if (!filename) return "Error: Se requiere 'filename'.";
            if (!pollinationsKey) return "Error: La IA visual subyacente (Pollinations) no está conectada.";
            
            const fileHandle = await activeHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            let data = JSON.parse(text);

            if (typeof showToast === 'function') showToast(`Pintando ${data.name}...`, 'listening');

            const prompt = `${data.name}, ${data.visualDesc}, high quality, masterpiece, concept art`;
            const safePrompt = encodeURIComponent(prompt);
            const seed = Math.floor(Math.random() * 9999999);
            
            const url = `https://gen.pollinations.ai/image/${safePrompt}?model=klein&width=1024&height=1024&seed=${seed}&nologo=true&key=${pollinationsKey}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fallo en el servidor gráfico.");

            const blob = await response.blob();
            
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            const base64 = await base64Promise;

            data.imagen64 = base64;

            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            if (typeof datosStudioUI !== 'undefined') {
                await datosStudioUI.loadFiles();
                if (datosStudioUI.currentFileHandle && datosStudioUI.currentFileHandle.name === filename) {
                    datosStudioEditor.openItem({handle: fileHandle, data: data, name: filename});
                }
            }
            if (typeof showToast === 'function') showToast(`Imagen generada para ${data.name}`, 'success');

            return `Dato '${filename}' ilustrado exitosamente. La imagen se ha inyectado como Base64 en el archivo y mostrado en la interfaz.`;
        }
        else if (action === 'illustrate_data_svg') {
            if (!filename || !svg_content) return "Error: Se requiere 'filename' y 'svg_content'.";

            const fileHandle = await activeHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            const text = await file.text();
            let data = JSON.parse(text);

            // CORRECCIÓN PROFUNDA: Reemplazar el inestable btoa() con una conversión de memoria Blob pura nativa a Base64.
            const blob = new Blob([svg_content], { type: 'image/svg+xml' });
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
            data.imagen64 = await base64Promise;

            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();

            if (typeof datosStudioUI !== 'undefined') {
                await datosStudioUI.loadFiles();
                if (datosStudioUI.currentFileHandle && datosStudioUI.currentFileHandle.name === filename) {
                    datosStudioEditor.openItem({handle: fileHandle, data: data, name: filename});
                }
            }
            
            if (typeof showToast === 'function') showToast(`Arte SVG generado para ${data.name}`, 'success');
            return `Dato '${filename}' ilustrado exitosamente con tu arte vectorial SVG.`;
        }
        else {
            return `Acción '${action}' no reconocida en Datos Studio.`;
        }
    } catch (e) {
        return `Error crítico en Datos Studio Tools: ${e.message}`;
    }
}