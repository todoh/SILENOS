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
                return `Comando en proceso: Se ha ordenado al motor visual ilustrar el nodo '${node_id}'. Ocurrirá en segundo plano.`;
            }
            return "Error: Motor visual no cargado.";
        } else if (action === 'illustrate_all') {
            if (typeof gamebookVisual !== 'undefined') {
                gamebookVisual.illustrateAllNodes();
                return "Comando en proceso: Se ha ordenado al motor visual ilustrar TODOS los nodos secuencialmente. Ocurrirá en segundo plano y puede tardar.";
            }
            return "Error: Motor visual no cargado.";
        }

        let activeFileHandle = null;
        if (typeof gamebookUI !== 'undefined' && gamebookUI.currentFileHandle) {
            activeFileHandle = gamebookUI.currentFileHandle;
        } else if (filename) {
            activeFileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
        } else {
            return "Error: Se requiere 'filename' para inicializar la carga del archivo.";
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

            if (typeof gamebookUI !== 'undefined') {
                gamebookUI.currentFileHandle = activeFileHandle;
                gamebookUI.data = data;
                if (gamebookUI.selectedNodeId === node_id) {
                    gamebookUI.updateEditorPanel();
                }
                gamebookUI.renderNodes();
            }
            if (typeof showToast === 'function') showToast(`Arte SVG insertado en ${node_id}`, 'success');

            historyManager.logAction('IA (Librojuego)', `Generó ilustración SVG para el nodo ${node_id}`);
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
                gamebookUI.render();
            }
            historyManager.logAction('IA (Librojuego)', `Creó el librojuego ${activeFileHandle.name}`);
            return `Librojuego creado exitosamente como ${activeFileHandle.name}. La interfaz visual ha sido actualizada.`;
        
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
                    const data = JSON.parse(textContent);
                    gamebookUI.currentFileHandle = activeFileHandle;
                    gamebookUI.data = data;
                    document.getElementById('gbTitleInput').value = data.title || "Sin título";
                    const styleInput = document.getElementById('gbStyleInput');
                    if (styleInput) styleInput.value = data.visualStyle || "";
                    await gamebookUI.cacheImages();
                    gamebookUI.focusAll(); 
                } catch(e) { console.warn("Archivo leído pero no es un JSON válido aún."); }
            }
            return textContent;
            
        } else if (action === 'add_node' || action === 'edit_node') {
            const f = await activeFileHandle.getFile();
            const jsonText = await f.text();
            
            let data;
            try {
                data = JSON.parse(jsonText);
            } catch(e) {
                data = { title: "Aventura Recuperada", visualStyle: "", nodes: [] };
            }
            
            let parsedChoices = [];
            if (choices) {
                try { 
                    parsedChoices = typeof choices === 'string' ? JSON.parse(choices) : choices; 
                } catch(e) { return "Error: choices no es un formato válido."; }
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
                historyManager.logAction('IA (Librojuego)', `Añadió el nodo ${node_id}`);
            } else {
                if (!node) return `Error: El nodo ${node_id} no existe. Usa add_node.`;
                if (text) node.text = text;
                if (choices) node.choices = parsedChoices;
                historyManager.logAction('IA (Librojuego)', `Editó el nodo ${node_id}`);
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
                
                await gamebookUI.cacheImages();
                
                gamebookUI.selectedNodeId = node_id; 
                gamebookUI.updateEditorPanel();
                gamebookUI.render();
            }
            return `Nodo '${node_id}' guardado correctamente en ${activeFileHandle.name}. La interfaz visual ha sido actualizada enfocando el nodo.`;
            
        } else {
            return `Error: Acción '${action}' no reconocida.`;
        }
    } catch(err) {
        return `Error del sistema: ${err.message}`;
    }
}