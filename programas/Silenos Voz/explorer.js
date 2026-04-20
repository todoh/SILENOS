// live gemini/explorer.js
// ─── EXPLORER LENS (Navegación e Inspección Profunda) ────────────────
const explorerLens = {
    async getHandleFromPath(path, baseHandle = null) {
        let root = baseHandle || workspaceHandle;
        
        // --- NUEVO: AUTO-ENLACE DE EMERGENCIA ---
        if (!root && window.parent && (window.parent.currentHandle || window.parent.rootHandle)) {
            root = window.parent.currentHandle || window.parent.rootHandle;
            workspaceHandle = root; // Reparamos el handle global
        }

        if (!root) throw new Error("No hay carpeta seleccionada por el usuario (Kernel desconectado).");
        
        if (!path || typeof path !== 'string') return root;
        
        // Normalización extrema de la ruta: cambiar '\' por '/', limpiar espacios.
        let normalizedPath = path.replace(/\\/g, '/').trim();
        
        // Identificar llamadas directas a la raíz
        if (normalizedPath === '/' || normalizedPath === '.' || normalizedPath === '') {
            return root;
        }
        
        // Eliminar prefijos que confunden la navegación ('/' inicial o './')
        if (normalizedPath.startsWith('/')) normalizedPath = normalizedPath.substring(1);
        if (normalizedPath.startsWith('./')) normalizedPath = normalizedPath.substring(2);
        
        const parts = normalizedPath.split('/').filter(p => p && p !== '.');
        let currentHandle = root;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            
            // Medida de seguridad y simplificación
            if (part === '..') {
                throw new Error("La navegación hacia atrás (..) no está soportada de forma relativa. Usa rutas absolutas desde la raíz.");
            }

            let found = false;
            
            // Búsqueda tolerante (Insensible a mayúsculas/minúsculas)
            for await (const [name, handle] of currentHandle.entries()) {
                if (name.toLowerCase() === part.toLowerCase()) {
                    currentHandle = handle;
                    found = true;
                    break;
                }
            }
            if (!found) throw new Error(`Ruta o elemento no encontrado: '${part}' en la ruta '${normalizedPath}'`);
        }
        return currentHandle;
    },

    async navigateFolder(path) {
        try {
            const handle = await this.getHandleFromPath(path);
            if (handle.kind !== 'directory') return `Error: '${path}' es un archivo, no una carpeta. Usa inspect_file o open_file.`;
            
            let contents = [];
            for await (const [name, entry] of handle.entries()) {
                contents.push(`[${entry.kind === 'directory' ? 'CARPETA' : 'ARCHIVO'}] ${name}`);
            }
            return `=== CONTENIDO DE '${path || 'RAÍZ'}' ===\n` + (contents.join('\n') || 'La carpeta está vacía.');
        } catch (e) {
            return `Error al navegar: ${e.message}`;
        }
    },

    async inspectFile(path) {
        try {
            const handle = await this.getHandleFromPath(path);
            if (handle.kind !== 'file') return `Error: '${path}' es una carpeta. Usa navigate_folder.`;
            
            const file = await handle.getFile();
            const ext = file.name.split('.').pop().toLowerCase();
            const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'mp3', 'wav', 'ogg', 'avi', 'mov'].includes(ext);
            
            let info = `=== METADATOS DEL ARCHIVO ===\n- Ruta: ${path}\n- Nombre: ${file.name}\n- Tamaño: ${(file.size / 1024).toFixed(2)} KB\n- Tipo MIME: ${file.type || 'Desconocido'}\n- Última modificación: ${new Date(file.lastModified).toLocaleString()}\n`;
            
            if (!isMedia && file.size < 500000) { 
                const text = await file.text();
                const snippet = text.substring(0, 300).replace(/\n/g, ' ');
                info += `\n=== VISTA PREVIA (Primeros 300 caracteres) ===\n${snippet}...`;
            } else if (isMedia) {
                info += `\n=== NOTA ===\nEs un archivo multimedia. No se puede leer como texto, pero ya conoces su tamaño y formato.`;
            } else {
                info += `\n=== NOTA ===\nEl archivo es demasiado grande para una vista previa de texto.`;
            }
            
            return info;
        } catch (e) {
            return `Error al inspeccionar: ${e.message}`;
        }
    },

    async openFileText(path) {
        try {
            const handle = await this.getHandleFromPath(path);
            if (handle.kind !== 'file') return `Error: '${path}' es una carpeta.`;
            
            const file = await handle.getFile();
            
            const ext = file.name.split('.').pop().toLowerCase();
            if (['png', 'jpg', 'jpeg', 'gif', 'mp4', 'webm', 'mp3', 'wav', 'ogg'].includes(ext)) {
                return `Error: Intentaste abrir un archivo multimedia (${ext}) como texto. Usa inspect_file en su lugar.`;
            }

            if (file.size > 3000000) {
                return `Error: El archivo pesa más de 3MB. Es demasiado masivo para inyectar de golpe. Usa inspect_file.`;
            }
            
            return await file.text();
        } catch (e) {
            return `Error al abrir archivo: ${e.message}`;
        }
    },

    async analyzeTarget(path, model = 'nova-fast') {
        if (!pollinationsKey) return `Error: La IA de Pollinations (${model}) no está conectada. Pide al usuario que conecte la IA.`;
        
        try {
            const handle = await this.getHandleFromPath(path);
            let contentToAnalyze = "";
            let type = "";
            
            if (handle.kind === 'file') {
                type = "archivo";
                const file = await handle.getFile();
                if (file.size > 1000000) return `Error: El archivo ${path} es demasiado grande (>1MB) para analizar de una vez.`;
                const text = await file.text();
                // Acotamos el tamaño para no desbordar el contexto de la API
                contentToAnalyze = text.substring(0, 40000); 
            } else {
                type = "carpeta";
                contentToAnalyze = await this.navigateFolder(path);
            }

            if (typeof showToast === 'function') showToast(`Analizando ${type} con ${model}...`, 'listening');

            const systemPrompt = `Eres un Arquitecto de Software y Analista de Datos de Élite. 
            El usuario ha solicitado un análisis experto del siguiente ${type} ubicado en la ruta local: '${path}'.
            OBJETIVO: Analiza su contenido o estructura de forma profunda. Explica de qué trata, para qué sirve, sus dependencias clave (si es código) y qué función cumple dentro de su ecosistema. Sé sumamente estructurado y técnico.`;

            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: model, 
                    messages: [
                        { role: 'system', content: systemPrompt }, 
                        { role: 'user', content: contentToAnalyze }
                    ],
                    jsonMode: false,
                    seed: Math.floor(Math.random() * 1000)
                })
            });
            
            if (!res.ok) return `Error HTTP al consultar a ${model}: ${res.status}`;
            const data = await res.json();
            
            if (data.choices && data.choices.length > 0) {
                if (typeof showToast === 'function') showToast(`Análisis de ${path} completado`, 'success');
                return `=== ANÁLISIS DE ${model.toUpperCase()} PARA '${path}' ===\n\n` + data.choices[0].message.content;
            }
            
            return `Error: ${model} no devolvió un análisis válido.`;
        } catch (e) {
            return `Error durante el análisis: ${e.message}`;
        }
    }
};