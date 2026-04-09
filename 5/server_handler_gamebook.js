// live gemini/server_handler_gamebook.js

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
                return `Comando UI en proceso: Se ha solicitado ilustrar el nodo '${node_id}' con SVG. Genera el código vectorial en tu próxima llamada a 'illustrate_node_svg'.`;
            }
            return "Error: Motor visual no cargado.";
        } else if (action === 'illustrate_all') {
            if (typeof gamebookVisual !== 'undefined') {
                gamebookVisual.illustrateAllNodes();
                return "Comando UI en proceso: Se ha solicitado ilustrar TODOS los nodos con SVG. Hazlo secuencialmente llamando a 'illustrate_node_svg' por cada uno.";
            }
            return "Error: Motor visual no cargado.";
        }

        let activeFileHandle = null;
        if (typeof gamebookUI !== 'undefined' && gamebookUI.currentFileHandle && !filename) {
            activeFileHandle = gamebookUI.currentFileHandle;
        } else if (filename) {
            try {
                // Resolución dinámica para carpetas
                const parts = filename.replace(/\\/g, '/').split('/').filter(p => p && p !== '.');
                let name = parts.pop();
                let curr = workspaceHandle;
                for (const p of parts) {
                    curr = await curr.getDirectoryHandle(p, { create: true });
                }
                activeFileHandle = await curr.getFileHandle(name, { create: true });
            } catch(e) {
                return `Error al acceder o crear la ruta del archivo: ${e.message}`;
            }
        } else {
            return "Error: Se requiere 'filename' para inicializar la carga del archivo, o tener uno ya abierto en la interfaz.";
        }

        if (action === 'illustrate_node_svg') {
            if (!node_id || !svg_content) return "Error: Faltan parámetros 'node_id' o 'svg_content'.";

            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            let data;
            try { data = JSON.parse(jsonText); } catch(e) { return "Error: formato JSON de la aventura inválido."; }

            let node = data.nodes.find(n => n.id === node_id);
            if (!node) return `Error: El nodo ${node_id} no existe.`;

            const svgFilename = `IMG_SVG_${node_id}_${Date.now()}.svg`;
            const fileHandle = await workspaceHandle.getFileHandle(svgFilename, { create: true });
            const writableSvg = await fileHandle.createWritable();
            await writableSvg.write(svg_content);
            await writableSvg.close();

            node.imageUrl = svgFilename;
            node.imagePrompt = "Arte vectorial SVG generado nativamente por VOZ SILENOS.";
            const blob = new Blob([svg_content], { type: 'image/svg+xml' });
            if (node._cachedImageUrl) URL.revokeObjectURL(node._cachedImageUrl);
            node._cachedImageUrl = URL.createObjectURL(blob);

            const w = await activeFileHandle.createWritable();
            await w.write(JSON.stringify(data, null, 2));
            await w.close();

            if (typeof gamebookVisual !== 'undefined') {
                gamebookVisual.generatingNodes.delete(node_id);
            }

            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.currentFileHandle = activeFileHandle;
                gamebookUI.data = data;
                if (gamebookUI.selectedNodeId === node_id) {
                    gamebookUI.updateEditorPanel();
                }
                gamebookUI.renderNodes();
            }
            if (typeof showToast === 'function') showToast(`Arte SVG insertado en ${node_id}`, 'success');

            if (typeof historyManager !== 'undefined') historyManager.logAction('IA (Librojuego)', `Generó ilustración SVG para el nodo ${node_id}`);
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
                gamebookUI.open();
                gamebookUI.render();
            }
            if (typeof historyManager !== 'undefined') historyManager.logAction('IA (Librojuego)', `Creó el librojuego ${activeFileHandle.name}`);
            return `Librojuego creado exitosamente como ${activeFileHandle.name}. La interfaz visual ha sido abierta y actualizada.`;
        
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
                    const data = JSON.parse(textContent || '{"title":"Aventura Recuperada","visualStyle":"","nodes":[]}');
                    gamebookUI.currentFileHandle = activeFileHandle;
                    gamebookUI.data = data;
                    const titleInput = document.getElementById('gbTitleInput');
                    if (titleInput) titleInput.value = data.title || "Sin título";
                    const styleInput = document.getElementById('gbStyleInput');
                    if (styleInput) styleInput.value = data.visualStyle || "";
                    if (typeof gamebookUI.cacheImages === 'function') await gamebookUI.cacheImages();
                    
                    gamebookUI.open(); 
                    gamebookUI.focusAll(); 
                } catch(e) { console.warn("Archivo leído pero no es un JSON válido aún."); }
            }
            return textContent;
            
        } else if (action === 'add_node' || action === 'edit_node') {
            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            
            let data;
            try {
                data = JSON.parse(jsonText || '{"title":"Aventura Nueva","visualStyle":"","nodes":[]}');
            } catch(e) {
                data = { title: "Aventura Recuperada", visualStyle: "", nodes: [] };
            }
            
            let parsedChoices = [];
            if (choices) {
                try { 
                    parsedChoices = typeof choices === 'string' ? JSON.parse(choices) : choices; 
                } catch(e) { return "Error: choices no es un formato válido JSON."; }
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
                if (typeof historyManager !== 'undefined') historyManager.logAction('IA (Librojuego)', `Añadió el nodo ${node_id}`);
            } else {
                if (!node) return `Error: El nodo ${node_id} no existe. Usa add_node.`;
                if (text !== undefined) node.text = text;
                if (choices !== undefined) node.choices = parsedChoices;
                if (typeof historyManager !== 'undefined') historyManager.logAction('IA (Librojuego)', `Editó el nodo ${node_id}`);
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
                
                if (typeof gamebookUI.cacheImages === 'function') await gamebookUI.cacheImages();
                
                gamebookUI.selectedNodeId = node_id; 
                gamebookUI.updateEditorPanel();
                gamebookUI.render();
            }
            return `Nodo '${node_id}' guardado correctamente en ${activeFileHandle.name}. La interfaz visual ha sido actualizada enfocando el nodo.`;
            
        } else if (action === 'delete_node') {
            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            let data = JSON.parse(jsonText);
            
            const nodeIndex = data.nodes.findIndex(n => n.id === node_id);
            if (nodeIndex === -1) return `Error: Nodo '${node_id}' no encontrado.`;
            
            data.nodes.splice(nodeIndex, 1);
            
            data.nodes.forEach(n => {
                if (n.choices) {
                    n.choices = n.choices.filter(c => c.targetId !== node_id);
                }
            });
            
            const w = await activeFileHandle.createWritable();
            await w.write(JSON.stringify(data, null, 2));
            await w.close();
            
            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.data = data;
                if (gamebookUI.selectedNodeId === node_id) {
                    gamebookUI.selectedNodeId = null;
                    gamebookUI.updateEditorPanel();
                }
                gamebookUI.render();
            }
            if (typeof historyManager !== 'undefined') historyManager.logAction('IA (Librojuego)', `Eliminó el nodo ${node_id}`);
            return `Nodo '${node_id}' eliminado y desenlazado correctamente.`;
            
        } else {
            return `Error: Acción '${action}' no reconocida.`;
        }
    } catch(err) {
        return `Error del sistema: ${err.message}`;
    }
}