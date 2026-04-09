// live gemini/svg_studio.js
// ─── SVG STUDIO (CREADOR Y EXPORTADOR DE ARTE VECTORIAL AVANZADO Y FOTORREALISTA) ───────────────────

window.svgStudioUI = {
    _dragBound: null,
    undoStack: [], // Historial de estados para deshacer cambios de la IA

    // Guardar el estado actual del editor antes de modificarlo
    pushState(code) {
        if (code !== undefined && code !== null) {
            this.undoStack.push(code);
            if (this.undoStack.length > 50) this.undoStack.shift(); // Límite de 50 pasos
        }
    },

    // Función para echar atrás el último cambio (Undo)
    undo() {
        if (this.undoStack.length > 0) {
            const previousCode = this.undoStack.pop();
            const editor = document.getElementById('svgStudioEditor');
            if (editor) {
                editor.value = previousCode;
                this.updatePreview();
                if (typeof showToast === 'function') showToast('Cambio deshecho (Undo)', 'success');
            }
        } else {
            if (typeof showToast === 'function') showToast('No hay más cambios para deshacer', 'error');
        }
    },

    // Biblioteca de filtros y gradientes predefinidos de nivel profesional (Ampliados para hiperrealismo)
    _advancedDefs: `
        <defs>
            <filter id="ambientOcclusion" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="15" result="blurAO"/>
                <feComponentTransfer in="blurAO" result="darkAO">
                    <feFuncA type="linear" slope="0.8"/>
                </feComponentTransfer>
                <feOffset dx="0" dy="0" result="offsetAO"/>
                <feMerge>
                    <feMergeNode in="offsetAO"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
            
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#000000" flood-opacity="0.8"/>
            </filter>

            <filter id="realisticTexture">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 0.9 0 0 0  0 0.8 0 0 0  0 0 0 0.15 0" in="noise" result="coloredNoise"/>
                <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="texture"/>
                <feBlend mode="multiply" in="texture" in2="SourceGraphic"/>
            </filter>

            <filter id="metalReflection">
                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="2" result="noise"/>
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.2 0" in="noise" result="highContrastNoise"/>
                <feComposite operator="in" in="highContrastNoise" in2="SourceGraphic" result="texture"/>
                <feBlend mode="screen" in="texture" in2="SourceGraphic"/>
            </filter>
            
            <filter id="glassBevel" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
                <feSpecularLighting in="blur" surfaceScale="6" specularConstant="1.2" specularExponent="30" lighting-color="#ffffff" result="specOut">
                    <fePointLight x="-5000" y="-10000" z="20000"/>
                </feSpecularLighting>
                <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut"/>
                <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0"/>
            </filter>

            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="8" result="blur1"/>
                <feGaussianBlur stdDeviation="16" result="blur2"/>
                <feMerge>
                    <feMergeNode in="blur2"/>
                    <feMergeNode in="blur1"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            <linearGradient id="cyberpunkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff007f" />
                <stop offset="100%" stop-color="#00f0ff" />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8a6d2c" />
                <stop offset="30%" stop-color="#d4af37" />
                <stop offset="50%" stop-color="#fff8d6" />
                <stop offset="70%" stop-color="#d4af37" />
                <stop offset="100%" stop-color="#69511a" />
            </linearGradient>
            <radialGradient id="sunFlare" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
                <stop offset="20%" stop-color="#ffeedd" stop-opacity="0.9"/>
                <stop offset="60%" stop-color="#ffaa44" stop-opacity="0.4"/>
                <stop offset="100%" stop-color="#ff3300" stop-opacity="0"/>
            </radialGradient>
        </defs>
    `,

    // ─── MOTOR LÓGICO: SVG ARCHITECT ─────────────────────────────────────────
    architect: {
        width: 1024,
        height: 1024,
        
        buildPlan(layersConfig) {
            const plan = {
                metadata: { width: 1024, height: 1024, timestamp: Date.now() }, 
                layers: []
            };

            layersConfig.forEach((config, index) => {
                plan.layers.push({
                    zIndex: index,
                    layerId: config.id, 
                    content: [] 
                });
            });

            return plan;
        },

        addPartToLayer(plan, layerId, svgCodePart) {
            const layer = plan.layers.find(l => l.layerId === layerId);
            if (layer) {
                const safePart = `\n    \n    <g class="part-${layerId}-${layer.content.length}">\n      ${svgCodePart.trim()}\n    </g>`;
                layer.content.push(safePart);
                return true;
            }
            return false;
        },

        assemble(plan) {
            plan.layers.sort((a, b) => a.zIndex - b.zIndex);
            let bodyContent = '';
            plan.layers.forEach(layer => {
                bodyContent += `\n  \n  <g id="layer-${layer.layerId}">`;
                layer.content.forEach(part => bodyContent += part);
                bodyContent += `\n  </g>\n`;
            });
            const compiledDefs = svgStudioUI._advancedDefs;
            // Se fuerza el viewBox y las dimensiones siempre a 1024
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n${compiledDefs}${bodyContent}\n</svg>`;
        }
    },

    // ─── FEEDBACK VISUAL PARA GEMINI LIVE ────────────────────────────────────
    liveVisionFeedback: {
        async captureAndSend(plan) {
            // Verifica que la conexión WebSockets esté abierta para inyectar el frame
            if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) return;

            const currentSvg = svgStudioUI.architect.assemble(plan);
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                
                const blob = new Blob([currentSvg], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(blob);
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 640; // Resolución optimizada para Gemini Vision
                    canvas.height = 640;
                    const ctx = canvas.getContext('2d');
                    
                    // Fondo blanco para evitar transparencias que confundan al modelo
                    ctx.fillStyle = '#ffffff'; 
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, 1024, 1024, 0, 0, canvas.width, canvas.height);
                    URL.revokeObjectURL(url);
                    
                    const b64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    
                    try {
                        // Inyección directa del frame visual al WebSocket como si fuera la cámara del usuario
                        session.ws.send(JSON.stringify({
                            realtimeInput: {
                                video: { data: b64, mimeType: 'image/jpeg' }
                            }
                        }));
                    } catch(e) {
                        console.error("Error enviando frame a Gemini Live", e);
                    }
                    resolve();
                };
                img.onerror = () => {
                    resolve();
                };
                img.src = url;
            });
        }
    },
    // ─────────────────────────────────────────────────────────────────────────

    open() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero (Workspace)', 'error');
            return;
        }
        
        const editor = document.getElementById('svgStudioEditor');
        if (editor && !editor.value) {
            editor.placeholder = "Escribe código <svg> o usa instrucciones...\n\nLa IA puede dibujar por ti de forma serial.";
        }

        const modal = document.getElementById('svgStudioModal');
        if (modal) {
            modal.classList.remove('hidden');
            if (typeof makeDraggable === 'function' && !this._dragBound) {
                makeDraggable(modal, document.getElementById('svgModalHeader'));
                this._dragBound = true;
            }
        }
    },

    close() {
        const modal = document.getElementById('svgStudioModal');
        if (modal) modal.classList.add('hidden');
    },

    updatePreview() {
        const code = document.getElementById('svgStudioEditor').value;
        const preview = document.getElementById('svgPreviewContainer');
        if (preview) {
            if (code.trim().startsWith('<svg')) {
                let enhancedCode = code;
                if (!enhancedCode.includes('<defs>')) {
                    enhancedCode = enhancedCode.replace('>', `>\n${this._advancedDefs}`);
                }
                
                // Forzar viewBox y dimensiones si la IA las ha omitido o alterado
                if (!enhancedCode.includes('viewBox=')) {
                    enhancedCode = enhancedCode.replace('<svg', '<svg viewBox="0 0 1024 1024"');
                }
                if (!enhancedCode.includes('width=')) {
                    enhancedCode = enhancedCode.replace('<svg', '<svg width="1024" height="1024"');
                }
                
                preview.innerHTML = enhancedCode;
            } else {
                preview.innerHTML = this.compileSilenosScript(code);
            }
        }
    },

    compileSilenosScript(text) {
        const lines = text.split('\n');
        let svgContent = '';
        let width = 1024; // Siempre forzado a 1024
        let height = 1024; // Siempre forzado a 1024
        let localDefs = '';
        let inGroup = false;

        const wInp = document.getElementById('svgWidthInp');
        const hInp = document.getElementById('svgHeightInp');
        if (wInp) wInp.value = width;
        if (hInp) hInp.value = height;

        const extractExtra = (parts, startIndex) => {
            let extra = '';
            for(let i = startIndex; i < parts.length; i++) {
                if(parts[i].includes('=')) extra += ` ${parts[i].replace(/"/g, "'")}`;
            }
            return extra;
        };

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('//')) continue;
            
            const parts = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
            if(parts.length === 0) continue;
            const cmd = parts[0].toLowerCase();
            
            const getStr = (i, def) => parts[i] ? parts[i].replace(/(^"|"$)/g, '') : def;
            const getNum = (i, def) => parts[i] !== undefined ? parseFloat(parts[i]) : def;

            try {
                if (cmd === 'size' && parts.length >= 3) {
                    // Ignoramos completamente cualquier valor y forzamos 1024
                    width = 1024;
                    height = 1024;
                }
                else if (cmd === 'bg') {
                    svgContent += `  <rect width="100%" height="100%" fill="${getStr(1, 'none')}" ${extractExtra(parts, 2)}/>\n`;
                }
                else if (cmd === 'circle') {
                    svgContent += `  <circle cx="${getNum(1,0)}" cy="${getNum(2,0)}" r="${getNum(3,0)}" fill="${getStr(4,'#000')}" stroke="${getStr(5,'none')}" stroke-width="${getNum(6,0)}" ${extractExtra(parts, 7)}/>\n`;
                }
                else if (cmd === 'rect') {
                    svgContent += `  <rect x="${getNum(1,0)}" y="${getNum(2,0)}" width="${getNum(3,0)}" height="${getNum(4,0)}" fill="${getStr(5,'#000')}" stroke="${getStr(6,'none')}" stroke-width="${getNum(7,0)}" rx="${getNum(8,0)}" ${extractExtra(parts, 9)}/>\n`;
                }
                else if (cmd === 'line') {
                    svgContent += `  <line x1="${getNum(1,0)}" y1="${getNum(2,0)}" x2="${getNum(3,0)}" y2="${getNum(4,0)}" stroke="${getStr(5,'#000')}" stroke-width="${getNum(6,1)}" ${extractExtra(parts, 7)}/>\n`;
                }
                else if (cmd === 'text') {
                    svgContent += `  <text x="${getNum(1,0)}" y="${getNum(2,0)}" fill="${getStr(4,'#000')}" font-size="${getNum(5,20)}" font-family="${getStr(6,'sans-serif')}" ${extractExtra(parts, 7)}>${getStr(3,'')}</text>\n`;
                }
                else if (cmd === 'path') {
                    svgContent += `  <path d="${getStr(1,'')}" fill="${getStr(2,'none')}" stroke="${getStr(3,'#000')}" stroke-width="${getNum(4,1)}" ${extractExtra(parts, 5)}/>\n`;
                }
                else if (cmd === 'grid') {
                    const s = getNum(1, 20);
                    const id = 'grid_' + Math.random().toString(36).substr(2, 5);
                    localDefs += `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"><path d="M ${s} 0 L 0 0 0 ${s}" fill="none" stroke="${getStr(2,'#ccc')}" stroke-width="${getNum(3,0.5)}"/></pattern>\n`;
                    svgContent += `  <rect width="100%" height="100%" fill="url(#${id})" ${extractExtra(parts, 4)}/>\n`;
                }
                else if (cmd === 'star') {
                    const cx = getNum(1,0), cy = getNum(2,0), points = getNum(3,5), outer = getNum(4,20), inner = getNum(5,10);
                    let pts = [];
                    for(let i=0; i<points*2; i++) {
                        const r = (i%2 === 0) ? outer : inner;
                        const angle = (i * Math.PI) / points - (Math.PI/2);
                        pts.push(`${cx + r*Math.cos(angle)},${cy + r*Math.sin(angle)}`);
                    }
                    svgContent += `  <polygon points="${pts.join(' ')}" fill="${getStr(6,'#000')}" stroke="${getStr(7,'none')}" stroke-width="${getNum(8,0)}" ${extractExtra(parts, 9)}/>\n`;
                }
                else if (cmd === 'group') {
                    svgContent += `  <g id="${getStr(1,'')}" fill="${getStr(2,'none')}" stroke="${getStr(3,'none')}" stroke-width="${getNum(4,0)}" ${extractExtra(parts, 5)}>\n`;
                    inGroup = true;
                }
                else if (cmd === 'endgroup') {
                    svgContent += `  </g>\n`;
                    inGroup = false;
                }
            } catch(e) {
                console.warn("SilenosScript SVG Parser Error en línea: " + line);
            }
        }

        const compiledDefs = this._advancedDefs.replace('</defs>', `${localDefs}</defs>`);
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">\n${compiledDefs}\n${svgContent}</svg>`;
    },

    async _getTargetHandle(filename) {
        if (!workspaceHandle) throw new Error("Sin workspace");
        if (!filename.includes('/')) return await workspaceHandle.getFileHandle(filename, {create: true});
        
        const parts = filename.split('/');
        const name = parts.pop();
        let curr = workspaceHandle;
        for (const p of parts) {
            if (p.trim() === '') continue;
            curr = await curr.getDirectoryHandle(p, {create: true});
        }
        return await curr.getFileHandle(name, {create: true});
    },

    async saveSvg(filenameParam) {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return "Error: Sin workspace";
        }
        const code = document.getElementById('svgStudioEditor').value;
        if (!code.trim()) return "Error: SVG vacío";
        
        let finalContent = code;
        if (!code.trim().startsWith('<svg')) {
            finalContent = this.compileSilenosScript(code);
        } else {
            if (!finalContent.includes('<defs>')) {
                finalContent = finalContent.replace('>', `>\n${this._advancedDefs}`);
            }
        }

        const filename = filenameParam || prompt("Ruta y nombre del archivo SVG (ej: imagenes/arte.svg):", `arte_${Date.now()}.svg`);
        if (!filename) return "Cancelado por el usuario";

        try {
            const fileHandle = await this._getTargetHandle(filename);
            const writable = await fileHandle.createWritable();
            await writable.write(finalContent);
            await writable.close();
            
            if (typeof showToast === 'function') showToast(`SVG guardado: ${filename}`, 'success');
            if (typeof ide !== 'undefined') ide.refreshTree(); 
            return `SVG guardado exitosamente como ${filename}`;
        } catch (e) {
            return `Error al guardar SVG: ${e.message}`;
        }
    },

    async savePng(filenameParam, widthParam, heightParam) {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return "Error: Sin workspace";
        }
        const code = document.getElementById('svgStudioEditor').value;
        if (!code.trim()) return "Error: SVG vacío";

        let finalContent = code;
        if (!code.trim().startsWith('<svg')) {
            finalContent = this.compileSilenosScript(code);
        } else {
            if (!finalContent.includes('<defs>')) {
                finalContent = finalContent.replace('>', `>\n${this._advancedDefs}`);
            }
        }

        // Siempre forzamos a 1024 para la exportación final
        const width = 1024;
        const height = 1024;
        
        const wInp = document.getElementById('svgWidthInp');
        const hInp = document.getElementById('svgHeightInp');
        if (wInp) wInp.value = 1024;
        if (hInp) hInp.value = 1024;

        const filename = filenameParam || prompt("Ruta y nombre del archivo PNG (ej: exports/imagen.png):", `arte_${Date.now()}.png`);
        if (!filename) return "Cancelado por el usuario";

        const blob = new Blob([finalContent], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        
        if (typeof showToast === 'function') showToast(`Renderizando PNG...`, 'listening');

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                
                canvas.toBlob(async (pngBlob) => {
                    try {
                        const fileHandle = await this._getTargetHandle(filename);
                        const writable = await fileHandle.createWritable();
                        await writable.write(pngBlob);
                        await writable.close();
                        
                        if (typeof showToast === 'function') showToast(`PNG exportado a ${width}x${height}`, 'success');
                        if (typeof ide !== 'undefined') ide.refreshTree();
                        resolve(`PNG de ${width}x${height} guardado exitosamente como ${filename}`);
                    } catch(e) {
                        if (typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
                        resolve(`Error al escribir PNG en disco: ${e.message}`);
                    }
                }, 'image/png');
            };
            img.onerror = () => {
                if (typeof showToast === 'function') showToast(`Error al parsear el SVG`, 'error');
                resolve("Error estructural: No se pudo parsear o renderizar el código SVG actual para exportarlo a PNG.");
            }
            img.src = url;
        });
    }
};

// Herramienta nativa para ser invocada por la Inteligencia Artificial (TÚ)
async function handleSvgStudioTool(args) {
    const { action, code, filename, width, height, layersConfig, layerCode, layerId, old_code, new_code } = args;
    
    try {
        if (action === 'open') {
            if (typeof svgStudioUI !== 'undefined') svgStudioUI.open();
            return "Interfaz de SVG Studio abierta en la pantalla del usuario.";
        } 
        else if (action === 'close') {
            if (typeof svgStudioUI !== 'undefined') svgStudioUI.close();
            return "Interfaz de SVG Studio cerrada.";
        } 
        else if (action === 'create_svg') {
            if (!code) return "Error lógico: Se requiere el parámetro 'code' con el SVG o script fuente.";
            if (typeof svgStudioUI !== 'undefined') {
                svgStudioUI.open();
                // GUARDAR ESTADO PARA EL DESHACER
                svgStudioUI.pushState(document.getElementById('svgStudioEditor').value);
                
                document.getElementById('svgStudioEditor').value = code;
                svgStudioUI.updatePreview();
                return "Código inyectado con éxito en el SVG Studio. Ya es visible para el usuario.";
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        }
        else if (action === 'append_svg') {
            if (!code) return "Error lógico: Se requiere el parámetro 'code' para añadir al SVG.";
            if (typeof svgStudioUI !== 'undefined') {
                svgStudioUI.open();
                svgStudioUI.pushState(document.getElementById('svgStudioEditor').value);
                
                let currentCode = document.getElementById('svgStudioEditor').value;
                if (currentCode.toLowerCase().includes('</svg>')) {
                    currentCode = currentCode.replace(/<\/svg>/i, code + '\n</svg>');
                } else {
                    currentCode += '\n' + code;
                }
                
                document.getElementById('svgStudioEditor').value = currentCode;
                svgStudioUI.updatePreview();
                return "Nuevos elementos inyectados con éxito al final del SVG existente.";
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        }
        else if (action === 'replace_in_svg') {
            if (!old_code || new_code === undefined) return "Error: Se requieren 'old_code' y 'new_code'.";
            if (typeof svgStudioUI !== 'undefined') {
                svgStudioUI.open();
                svgStudioUI.pushState(document.getElementById('svgStudioEditor').value);
                
                let currentCode = document.getElementById('svgStudioEditor').value;
                if (currentCode.includes(old_code)) {
                    currentCode = currentCode.replace(old_code, new_code);
                    document.getElementById('svgStudioEditor').value = currentCode;
                    svgStudioUI.updatePreview();
                    return "Fragmento de código reemplazado con éxito. Cambios aplicados.";
                } else {
                    return "Error: No se encontró el fragmento 'old_code' exacto en el editor. Revisa el código e inténtalo de nuevo con el string exacto.";
                }
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        }
        // ─── COMANDOS DEL MOTOR ARCHITECT CON FEEDBACK VISUAL ───
        else if (action === 'architect_start') {
            if (!layersConfig) return "Error: Se requiere 'layersConfig' (Array JSON con {id}).";
            try {
                const parsedConfig = typeof layersConfig === 'string' ? JSON.parse(layersConfig) : layersConfig;
                window._activeSvgPlan = svgStudioUI.architect.buildPlan(parsedConfig);
                if (typeof svgStudioUI !== 'undefined') svgStudioUI.open();
                return `Plan estructural creado con éxito. Capas inicializadas: ${parsedConfig.map(l => l.id).join(', ')}. Llama a 'architect_add_part' para inyectar código en la primera capa.`;
            } catch(e) { return "Error al parsear layersConfig: " + e.message; }
        }
        else if (action === 'architect_add_part') {
            if (!window._activeSvgPlan) return "Error: Inicia un plan primero con 'architect_start'.";
            if (!layerId || !layerCode) return "Error: Se requiere 'layerId' y 'layerCode' (el código SVG a inyectar).";
            
            // GUARDAR ESTADO ANTES DE INYECTAR LA NUEVA PIEZA
            svgStudioUI.pushState(document.getElementById('svgStudioEditor').value);

            const success = svgStudioUI.architect.addPartToLayer(window._activeSvgPlan, layerId, layerCode);
            if (!success) {
                svgStudioUI.undoStack.pop(); // Revertimos el push si falla
                return `Error: La capa '${layerId}' no existe en el plan actual.`;
            }

            // Ensamblamos y actualizamos la UI para que se vea la pieza
            const partialSvg = svgStudioUI.architect.assemble(window._activeSvgPlan);
            document.getElementById('svgStudioEditor').value = partialSvg;
            svgStudioUI.updatePreview();

            // Tomamos la foto y la inyectamos en tu cámara
            await svgStudioUI.liveVisionFeedback.captureAndSend(window._activeSvgPlan);

            return `Código inyectado en '${layerId}'. He enviado a tu cámara una FOTO del resultado actual. Úsala ÚNICAMENTE para alinear coordenadas espaciales. SENTIDO COMÚN: Si ves que la capa ya tiene forma y volumen, avanza a la siguiente capa en tu próxima llamada. Si consideras que necesita más sombras/detalles, inyecta más en esta misma capa. Ejecuta la siguiente llamada AHORA, del tirón.`;
        }
        else if (action === 'architect_render') {
            if (!window._activeSvgPlan) return "Error: No hay plan activo para renderizar.";
            
            // GUARDAR ESTADO PARA EL DESHACER
            svgStudioUI.pushState(document.getElementById('svgStudioEditor').value);
            
            const finalSvg = svgStudioUI.architect.assemble(window._activeSvgPlan);
            
            svgStudioUI.open();
            document.getElementById('svgStudioEditor').value = finalSvg;
            svgStudioUI.updatePreview();
            
            // Limpiamos el plan tras el renderizado exitoso
            window._activeSvgPlan = null; 
            return "El montaje lógico se ha completado y renderizado en la pantalla del usuario. Has terminado la obra. Ahora sí, comunícaselo por voz.";
        }
        // ─────────────────────────────────────
        else if (action === 'save_svg') {
            if (typeof svgStudioUI !== 'undefined') {
                return await svgStudioUI.saveSvg(filename);
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        } 
        else if (action === 'save_png') {
            if (typeof svgStudioUI !== 'undefined') {
                return await svgStudioUI.savePng(filename, width, height);
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        }
        
        return `Acción '${action}' no reconocida para SVG Studio.`;
    } catch (e) {
        return `Fallo crítico en SVG Studio: ${e.message}`;
    }
}