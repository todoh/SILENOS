/* SILENOS 3/programmer-manager.js */

const ProgrammerManager = {
    instances: {},
    customModules: [],
    runningProcesses: {}, // Almacena procesos en ejecución { execId: runtime }

    // [MODIFICADO] Asegura el registro inicial de módulos
    async init() {
        // 0. Crear contenedor de notificaciones si no existe
        if (!document.getElementById('process-list')) {
            const div = document.createElement('div');
            div.id = 'process-list';
            document.body.appendChild(div);
        }

        // 1. Cargar módulos guardados por el usuario (LocalStorage)
        const saved = localStorage.getItem('silenos_custom_modules');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                this.customModules = parsed.map(m => ({
                    ...m,
                    _isExternal: false
                }));
            } catch (e) {
                console.error("Error cargando módulos locales", e);
                this.customModules = [];
            }
        }

        // [NUEVO] Registrar lo que ya tenemos en memoria antes de buscar externos
        this.registerCustomModules();

        // 2. Cargar módulos "Nativos" desde JSON externo
        await this.loadExternalDefaults();
    },

    // [NUEVO] Esta es la función que faltaba y causaba el error
    // Se encarga de iterar y dar "Forma" (F) a los datos en el NODE_REGISTRY
    registerCustomModules() {
        if (!this.customModules) return;
        this.customModules.forEach(mod => {
            this._registerSingleModule(mod);
        });
    },

    loadExternalDefaults() {
        return fetch('modulos-koreh.json')
            .then(res => {
                if (!res.ok) throw new Error("No se encontró modulos-koreh.json");
                return res.json();
            })
            .then(data => {
                if (!Array.isArray(data)) return;

                let addedCount = 0;
                data.forEach(extMod => {
                    extMod._isExternal = true;

                    // Mezcla: Actualizar si existe, añadir si no
                    const existingIdx = this.customModules.findIndex(m => m.id === extMod.id);
                    if (existingIdx >= 0) {
                        this.customModules[existingIdx] = extMod;
                    } else {
                        this.customModules.push(extMod);
                    }
                    addedCount++;
                });

                if (addedCount > 0) {
                    console.log(`✅ ${addedCount} Módulos Koreh cargados (Nativos JSON).`);
                    // Ahora sí, esta llamada funcionará correctamente
                    this.registerCustomModules();
                    Object.keys(this.instances).forEach(wid => this.refreshSidebar(wid));
                }
            })
            .catch(err => {
                console.log("ℹ️ Info: No se cargó configuración externa (modulos-koreh.json no existe o error).");
            });
    },

    saveModules() {
        localStorage.setItem('silenos_custom_modules', JSON.stringify(this.customModules));
        this.registerCustomModules();
        Object.keys(this.instances).forEach(wid => this.refreshSidebar(wid));
    },

    _registerSingleModule(mod) {
        if (typeof NODE_REGISTRY === 'undefined') return;
        try {
            // Se crea la función de ejecución dinámica
            const userFunc = new Function('ctx', 'inputs', `
                try {
                    ${mod.code}
                } catch(err) {
                    ctx.log("Error en módulo ${mod.title}: " + err.message);
                    return null;
                }
            `);

            NODE_REGISTRY[mod.id] = {
                title: mod.title,
                color: mod.color || "#666",
                inputs: mod.inputs || [],
                outputs: mod.outputs || [],
                fields: mod.fields || [],
                isCustom: true,
                isDynamic: mod.isDynamic || false,
                execute: async (ctx) => {
                    if (!ctx.runtime.nodeStates) ctx.runtime.nodeStates = {};
                    if (!ctx.runtime.nodeStates[ctx.nodeId]) ctx.runtime.nodeStates[ctx.nodeId] = [];
                    
                    const portIndex = (mod.inputs || []).indexOf(ctx.port);
                    let realPortIndex = portIndex;
                    
                    if (portIndex === -1) {
                        const nodeDef = ctx.graph.nodes.find(n => n.id === ctx.nodeId);
                        if (nodeDef && nodeDef.inputs) realPortIndex = nodeDef.inputs.indexOf(ctx.port);
                    }
                    
                    if (realPortIndex !== -1) ctx.runtime.nodeStates[ctx.nodeId][realPortIndex] = ctx.input;
                    const inputs = ctx.runtime.nodeStates[ctx.nodeId];
                    
                    return await userFunc(ctx, inputs);
                }
            };
        } catch (e) {
            console.error(`Fallo al compilar módulo ${mod.title}`, e);
        }
    },

    async renderInWindow(windowId, fileId = null) {
        await this.init();

        if (!document.getElementById('prog-styles-critical')) {
            const style = document.createElement('style');
            style.id = 'prog-styles-critical';
            style.innerHTML = ``;
            document.head.appendChild(style);
        }

        this.initInterface(windowId, fileId);
    },

    renderRunnerInWindow(windowId, fileId) {
        const file = FileSystem.getItem(fileId);
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!file || !winContent) return;

        let dynamicFormHTML = '';
        const nodes = file.content?.nodes || [];

        nodes.forEach(node => {
            const def = NODE_REGISTRY[node.type];
            if (!def || !node.uiFlags) return;

            const exposedFields = Object.entries(node.uiFlags).filter(([key, visible]) => visible);

            if (exposedFields.length > 0) {
                dynamicFormHTML += `
                <div class="mb-4 bg-[#252526] p-3 rounded border border-[#333]">
                    <div class="flex items-center gap-2 mb-2 border-b border-[#444] pb-1">
                        <div class="w-3 h-3 rounded-full" style="background:${def.color || '#666'}"></div>
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">${node.values?.title || def.title}</span>
                        <span class="text-[9px] text-gray-600 ml-auto">ID: ${node.id.split('-').pop()}</span>
                    </div>
            `;

                exposedFields.forEach(([fieldName, _]) => {
                    const currentVal = node.values[fieldName] || "";
                    const fieldDef = (def.fields || []).find(f => f.name === fieldName);
                    const inputType = fieldDef ? fieldDef.type : 'text';
                    const label = fieldDef ? (fieldDef.placeholder || fieldName) : fieldName;

                    dynamicFormHTML += `<div class="mb-2">
                    <label class="text-[10px] text-gray-500 uppercase block mb-1">${label}</label>`;

                    if (inputType === 'file-drop') {
                        const fileInfo = currentVal ? FileSystem.getItem(currentVal) : null;
                        const displayTitle = fileInfo ? fileInfo.title : (currentVal || "Arrastra un archivo aquí");
                        const activeClass = currentVal ? 'border-green-500 text-green-400' : 'border-gray-600 text-gray-500';

                        dynamicFormHTML += `
                        <div class="runner-drop-zone p-4 border-2 border-dashed rounded flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer hover:border-blue-500 hover:bg-[#333] ${activeClass}"
                             id="drop-${node.id}-${fieldName}" data-node="${node.id}" data-field="${fieldName}">
                             <i data-lucide="${fileInfo ? fileInfo.icon : 'upload'}" class="w-6 h-6"></i>
                             <span class="text-[10px] uppercase font-bold text-center file-label">${displayTitle}</span>
                             <input type="hidden" class="runner-input" data-node="${node.id}" data-field="${fieldName}" value="${currentVal}">
                        </div>
                    `;

                    } else if (inputType === 'textarea') {
                        dynamicFormHTML += `<textarea data-node="${node.id}" data-field="${fieldName}" 
                        class="runner-input w-full bg-[#111] border border-[#444] text-white text-sm p-2 rounded outline-none focus:border-blue-500 h-20 resize-none">${currentVal}</textarea>`;
                    } else if (inputType === 'select' && fieldDef) {
                        const opts = fieldDef.options.map(o => `<option ${o===currentVal?'selected':''}>${o}</option>`).join('');
                        dynamicFormHTML += `<select data-node="${node.id}" data-field="${fieldName}" 
                        class="runner-input w-full bg-[#111] border border-[#444] text-white text-sm p-2 rounded outline-none focus:border-blue-500">${opts}</select>`;
                    } else {
                        dynamicFormHTML += `<input type="${inputType}" data-node="${node.id}" data-field="${fieldName}" value="${currentVal}"
                        class="runner-input w-full bg-[#111] border border-[#444] text-white text-sm p-2 rounded outline-none focus:border-blue-500">`;
                    }
                    dynamicFormHTML += `</div>`;
                });

                dynamicFormHTML += `</div>`;
            }
        });

        if (!dynamicFormHTML) {
            dynamicFormHTML = `<div class="text-center text-gray-500 text-xs italic p-4">Este programa no tiene campos configurables visibles.</div>`;
        }

        winContent.innerHTML = `
        <div class="flex flex-col h-full bg-[#1e1e1e] text-gray-300 font-sans">
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
                ${dynamicFormHTML}
            </div>
            <div class="p-4 bg-[#252526] border-t border-[#333] flex flex-col gap-4">
                <div class="flex justify-between items-center">
                    <span class="text-xs font-bold text-gray-500">Estado: <span id="runner-status-${windowId}" class="text-gray-300">Inactivo</span></span>
                    <button onclick="ProgrammerManager.runHeadless('${windowId}', '${fileId}')" 
                        class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center gap-2 transition-transform active:scale-95 shadow-lg">
                        <i data-lucide="play" class="w-4 h-4"></i> EJECUTAR
                    </button>
                </div>
                <div class="h-32 bg-black rounded border border-[#333] flex flex-col">
                     <div class="bg-[#333] px-2 py-1 text-[10px] font-bold text-gray-400 uppercase">Salida / Consola</div>
                     <div id="runner-console-${windowId}" class="flex-1 p-2 font-mono text-xs overflow-y-auto text-green-400 custom-scrollbar"></div>
                </div>
            </div>
        </div>
    `;
        if (window.lucide) lucide.createIcons();
    },

    handleRunnerFileDrop(nodeId, fieldName, fileIds) {
        if (fileIds.length === 0) return;
        const fileId = fileIds[0];
        const file = FileSystem.getItem(fileId);
        if (!file) return;

        const dropZone = document.getElementById(`drop-${nodeId}-${fieldName}`);
        if (!dropZone) return;

        const label = dropZone.querySelector('.file-label');
        const icon = dropZone.querySelector('i');
        const input = dropZone.querySelector('input');

        if (label) label.innerText = file.title;
        if (input) input.value = fileId;

        dropZone.classList.remove('border-gray-600', 'text-gray-500');
        dropZone.classList.add('border-green-500', 'text-green-400');

        if (icon) {
            dropZone.innerHTML = `
             <i data-lucide="${file.icon}" class="w-6 h-6"></i>
             <span class="text-[10px] uppercase font-bold text-center file-label">${file.title}</span>
             <input type="hidden" class="runner-input" data-node="${nodeId}" data-field="${fieldName}" value="${fileId}">
         `;
            if (window.lucide) lucide.createIcons();
        }
    },

    async runHeadless(windowId, fileId) {
        await this.init();
        const file = FileSystem.getItem(fileId);
        if (!file || !file.content) return;

        if (file.content.embeddedModules && Array.isArray(file.content.embeddedModules)) {
            file.content.embeddedModules.forEach(mod => {
                ProgrammerManager._registerSingleModule(mod);
            });
        }

        const execId = 'proc_' + Date.now();
        const effectiveWindowId = windowId || `headless-${execId}`;
        const consoleEl = windowId ? document.getElementById(`runner-console-${windowId}`) : null;
        if (consoleEl) consoleEl.innerHTML = '';
        
        this.createProcessNotification(execId, file.title);

        const overrides = {};
        if (windowId) {
            document.querySelectorAll(`#window-${windowId} .runner-input`).forEach(inp => {
                if (!overrides[inp.dataset.node]) overrides[inp.dataset.node] = {};
                overrides[inp.dataset.node][inp.dataset.field] = inp.value;
            });
        }

        const logFn = (msg) => {
            if (consoleEl) {
                consoleEl.innerHTML += `<div>> ${msg}</div>`;
                consoleEl.scrollTop = consoleEl.scrollHeight;
            } else { console.log(`[${file.title}]: ${msg}`); }
        };

        const headlessGraph = new HeadlessGraph(file.content, logFn, effectiveWindowId);
        const runtime = new ProgRuntime(headlessGraph);
        this.runningProcesses[execId] = runtime;

        try { await runtime.run(overrides); } 
        catch (e) { console.error(e); } 
        finally {
            this.removeProcessNotification(execId);
            delete this.runningProcesses[execId];
        }
    },

    createProcessNotification(execId, title) {
        const container = document.getElementById('process-list');
        if (!container) return;

        const toast = document.createElement('div');
        toast.id = `toast-${execId}`;
        toast.className = 'process-toast';
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="process-loader"></div>
                <div class="flex flex-col">
                    <span class="font-bold text-white truncate max-w-[150px]">${title}</span>
                    <span class="text-[10px] text-gray-400">Ejecutando...</span>
                </div>
            </div>
            <button class="process-close-btn" onclick="ProgrammerManager.killProcess('${execId}')" title="Detener Proceso">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;
        container.appendChild(toast);
        if (window.lucide) lucide.createIcons();
    },

    removeProcessNotification(execId) {
        const toast = document.getElementById(`toast-${execId}`);
        if (toast) {
            toast.classList.add('closing');
            setTimeout(() => toast.remove(), 300);
        }
    },

    killProcess(execId) {
        const runtime = this.runningProcesses[execId];
        if (runtime) {
            console.log(`🛑 Deteniendo proceso ${execId}...`);
            if (typeof runtime.stop === 'function') {
                runtime.stop();
            }
            this.removeProcessNotification(execId);
        }
    },

    initInterface(windowId, fileId) {
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        winContent.innerHTML = `
        <div class="prog-wrapper">
            <aside class="prog-sidebar" id="prog-sidebar-${windowId}"></aside>
            <main class="prog-main">
                <div id="prog-canvas-${windowId}" class="prog-editor-container"></div>
                <div class="prog-toolbar">
                    <div id="prog-save-status-${windowId}" style="color:#666; font-size:0.7rem; padding-top:4px; opacity:0;">Guardado</div>
                    
                    <button id="prog-run-btn-${windowId}" class="prog-btn-float" onclick="ProgrammerManager.run('${windowId}')">
                        ▶ Ejecutar (Debug)
                    </button>
                    
                </div>
                <div id="prog-console-${windowId}" class="prog-console-overlay"><div>> Consola lista...</div></div>
                <div id="prog-modal-container-${windowId}"></div>
            </main>
        </div>
    `;

        if (typeof ProgrammerGraph !== 'undefined') {
            const graph = new ProgrammerGraph(`prog-canvas-${windowId}`, windowId);
            this.instances[windowId] = graph;
            graph.onLog = (msg) => this.log(windowId, msg);

            if (fileId) {
                const file = FileSystem.getItem(fileId);
                if (file && file.content) graph.load(file.content);
                graph.onChange = (data) => {
                    FileSystem.updateItem(fileId, {
                        content: data
                    });
                    const status = document.getElementById(`prog-save-status-${windowId}`);
                    if (status) {
                        status.style.opacity = 1;
                        setTimeout(() => status.style.opacity = 0, 1000);
                    }
                };
            }
        }

        this.refreshSidebar(windowId);
    },

    refreshSidebar(windowId) {
        const sb = document.getElementById(`prog-sidebar-${windowId}`);
        if (!sb) return;

        let customHtml = '';
        this.customModules.forEach(mod => {
            customHtml += `<div class="prog-palette-item" draggable="true" data-type="${mod.id}" style="border-left-color:${mod.color}">🧩 ${mod.title}</div>`;
        });

        sb.innerHTML = `
        <div style="display:flex; gap:5px; margin:10px;">
            <button onclick="ProgrammerManager.openModuleCreator('${windowId}')" class="neumorph-btn" style="flex:1; padding:8px; font-size:0.65rem; font-weight:bold; color:#007acc; cursor:pointer; text-align:center;">+ CREAR</button>
            <button onclick="ProgrammerManager.openModuleExporter('${windowId}')" class="neumorph-btn" style="flex:1; padding:8px; font-size:0.65rem; font-weight:bold; color:#e11d48; cursor:pointer; text-align:center;">⬇ EXP</button>
        </div>
        
        <div style="padding: 10px; font-weight:bold; color:#555; font-size:0.65rem; text-transform:uppercase;">Nativos</div>
        <div class="prog-palette-item" draggable="true" data-type="log" style="border-left-color:#007acc">📝 Log</div>
        <div class="prog-palette-item" draggable="true" data-type="wait" style="border-left-color:#6a00ff">⏳ Esperar</div>
        <div class="prog-palette-item" draggable="true" data-type="if-logic" style="border-left-color:#f59e0b">🔀 IF</div>
        <div class="prog-palette-item" draggable="true" data-type="logic-gate" style="border-left-color:#f59e0b">⚖️ Compuerta</div>
        <div class="prog-palette-item" draggable="true" data-type="set-var" style="border-left-color:#06b6d4">💾 Set Var</div>
        <div class="prog-palette-item" draggable="true" data-type="get-var" style="border-left-color:#06b6d4">📂 Get Var</div>
        <div class="prog-palette-item" draggable="true" data-type="read-file" style="border-left-color:#8b5cf6">📂 Leer Archivo</div>
        <div class="prog-palette-item" draggable="true" data-type="ai-query" style="border-left-color:#3b82f6">🧠 AI Query</div>
        <div class="prog-palette-item" draggable="true" data-type="book-export" style="border-left-color:#e11d48">📕 Export</div>
        <div class="prog-palette-item" draggable="true" data-type="json-export" style="border-left-color:#16a34a">💾 Exportar JSON</div>
        <div class="prog-palette-item" draggable="true" data-type="dynamic-script" style="border-left-color:#d946ef">⚡ Script Dinámico</div>
        <div style="padding: 10px; font-weight:bold; color:#555; font-size:0.65rem; text-transform:uppercase; margin-top:10px;">Mis Módulos</div>
        ${customHtml}
    `;

        this.setupDragDrop(windowId);
    },

    setupDragDrop(windowId) {
        const canvas = document.getElementById(`prog-canvas-${windowId}`);
        const graph = this.instances[windowId];

        canvas.addEventListener('dragover', (e) => e.preventDefault());
        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (!type) return;

            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - graph.panX) / graph.scale;
            const y = (e.clientY - rect.top - graph.panY) / graph.scale;

            graph.addNode(type, x, y);
        });

        document.querySelectorAll(`#prog-sidebar-${windowId} .prog-palette-item`).forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('type', item.dataset.type);
            });
        });
    },

    handleFileDrop(windowId, fileIds, x, y) {
        const graph = this.instances[windowId];
        if (!graph) return;

        const rect = graph.container.getBoundingClientRect();
        const graphX = (x - rect.left - graph.panX) / graph.scale;
        const graphY = (y - rect.top - graph.panY) / graph.scale;

        fileIds.forEach((fid, i) => {
            const file = FileSystem.getItem(fid);
            if (!file) return;

            const node = graph.addNode('read-file', graphX + (i * 20), graphY + (i * 20));

            const inputId = node.element.querySelector('[name="fileId"]');
            if (inputId) {
                inputId.value = fid;
            }
            const headerTitle = node.element.querySelector('.prog-node-header span');
            if (headerTitle) headerTitle.innerText = `📂 ${file.title}`;
        });

        graph.triggerChange();
    },

    async run(windowId) {
        const graph = this.instances[windowId];
        if (!graph) return;

        const btn = document.getElementById(`prog-run-btn-${windowId}`);

        if (graph.runtime.isRunning) {
            graph.runtime.stop();
            if (btn) {
                btn.innerText = "▶ Ejecutar (Debug)";
                btn.style.backgroundColor = "#2ea043";
            }
            return;
        }

        if (btn) {
            btn.innerText = "⏹ DETENER";
            btn.style.backgroundColor = "#ef4444";
        }

        await graph.runtime.run();

        if (btn) {
            btn.innerText = "▶ Ejecutar (Debug)";
            btn.style.backgroundColor = "#2ea043";
        }
    },

    log(windowId, msg) {
        const consoleEl = document.getElementById(`prog-console-${windowId}`);
        if (consoleEl) {
            const line = document.createElement('div');
            line.innerText = `> ${msg}`;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    },

    openModuleExporter(windowId) {
        const container = document.getElementById(`prog-modal-container-${windowId}`);
        if (!container) return;

        let listHtml = '';
        if (this.customModules.length === 0) {
            listHtml = '<div class="text-gray-500 text-xs text-center p-4">No hay módulos personalizados.</div>';
        } else {
            this.customModules.forEach(mod => {
                listHtml += `
                <div class="flex items-center gap-2 p-2 bg-[#1e1e1e] rounded mb-1 border border-[#333]">
                    <input type="checkbox" class="export-check cursor-pointer" value="${mod.id}" checked>
                    <div class="w-3 h-3 rounded-full shadow-sm" style="background:${mod.color}"></div>
                    <span class="text-xs text-gray-300 font-mono">${mod.title}</span>
                </div>
            `;
            });
        }

        container.innerHTML = `
        <div class="prog-modal-bg">
            <div class="prog-modal" style="height:450px;">
                <div class="prog-modal-head">
                    <span>Gestionar Módulos</span>
                    <button onclick="document.getElementById('prog-modal-container-${windowId}').innerHTML=''" style="color:#aaa;">×</button>
                </div>
                
                <div class="prog-modal-body flex flex-col gap-2">
                    <div class="flex justify-between items-center mb-2 px-1">
                         <span class="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Selección</span>
                         <button onclick="document.querySelectorAll('#prog-modal-container-${windowId} .export-check').forEach(c => c.checked = false)" class="text-[10px] text-blue-500 hover:underline">De Seleccionar Todos</button>
                    </div>
                    <div class="flex-1 overflow-y-auto custom-scrollbar bg-[#111] p-2 rounded border border-[#333]">
                        ${listHtml}
                    </div>
                    <p class="text-[10px] text-gray-500 mt-2">
                        Selecciona módulos para exportarlos a un archivo JSON o eliminarlos permanentemente.
                    </p>
                </div>

                <div class="p-3 border-t border-[#444] flex justify-end gap-2 bg-[#252526]">
                    <button onclick="ProgrammerManager.deleteSelectedModules('${windowId}')" class="px-4 py-2 bg-red-900 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform mr-auto">
                        🗑 ELIMINAR
                    </button>
                    <button onclick="ProgrammerManager.executeExport('${windowId}')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold flex items-center gap-2 shadow-lg active:scale-95 transition-transform">
                        ⬇ DESCARGAR JSON
                    </button>
                </div>
            </div>
        </div>
    `;
    },

    deleteSelectedModules(windowId) {
        const checks = document.querySelectorAll(`#prog-modal-container-${windowId} .export-check:checked`);
        if (checks.length === 0) {
            alert("Selecciona al menos un módulo para eliminar.");
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar ${checks.length} módulo(s)? Esta acción no se puede deshacer.`)) {
            return;
        }

        const idsToDelete = Array.from(checks).map(c => c.value);
        this.customModules = this.customModules.filter(m => !idsToDelete.includes(m.id));
        this.saveModules();
        this.openModuleExporter(windowId);
    },

    executeExport(windowId) {
        const checks = document.querySelectorAll(`#prog-modal-container-${windowId} .export-check:checked`);
        if (checks.length === 0) {
            alert("Selecciona al menos un módulo.");
            return;
        }

        const ids = Array.from(checks).map(c => c.value);
        const modulesToExport = this.customModules
            .filter(m => ids.includes(m.id))
            .map(m => ({
                ...m,
                type: 'custom-module'
            }));

        const blob = new Blob([JSON.stringify(modulesToExport, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `silenos_modules_export_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    openModuleCreator(windowId) {
        const container = document.getElementById(`prog-modal-container-${windowId}`);
        if (!container) return;

        container.innerHTML = `
        <div class="prog-modal-bg">
            <div class="prog-modal">
                <div class="prog-modal-head">
                    <span>Nuevo Módulo</span>
                    <button onclick="document.getElementById('prog-modal-container-${windowId}').innerHTML=''" style="color:#aaa;">×</button>
                </div>
                
                <div class="prog-tab-bar">
                    <div class="prog-tab active" onclick="ProgrammerManager.switchTab('${windowId}', 'config', this)">Configuración</div>
                    <div class="prog-tab" onclick="ProgrammerManager.switchTab('${windowId}', 'code', this)">Código JS</div>
                </div>

                <div id="prog-tab-config-${windowId}" class="prog-modal-body">
                    <div class="flex flex-col gap-3">
                        <div>
                            <label class="block text-xs uppercase text-gray-500 mb-1">Nombre del Módulo</label>
                            <input type="text" id="new-mod-title" class="w-full bg-[#333] border border-[#555] p-2 text-white rounded" placeholder="Ej: Sumador Avanzado">
                        </div>
                         <div>
                            <label class="block text-xs uppercase text-gray-500 mb-1">Color (Hex)</label>
                            <input type="color" id="new-mod-color" value="#888888" class="w-full h-8 bg-transparent border-none">
                        </div>

                        <div class="flex gap-4">
                            <div class="flex-1 p-2 bg-[#1e1e1e] rounded">
                                <h4 class="text-xs uppercase text-blue-400 mb-2">Entradas (Inputs)</h4>
                                <div id="new-mod-inputs-list"></div>
                                <button onclick="ProgrammerManager.addFieldRow('new-mod-inputs-list')" class="text-xs text-blue-500 mt-2 hover:underline">+ Añadir Input</button>
                            </div>
                            <div class="flex-1 p-2 bg-[#1e1e1e] rounded">
                                <h4 class="text-xs uppercase text-green-400 mb-2">Salidas (Outputs)</h4>
                                <div id="new-mod-outputs-list"></div>
                                <button onclick="ProgrammerManager.addFieldRow('new-mod-outputs-list')" class="text-xs text-green-500 mt-2 hover:underline">+ Añadir Output</button>
                            </div>
                        </div>

                        <div class="p-2 bg-[#1e1e1e] rounded">
                            <h4 class="text-xs uppercase text-yellow-400 mb-2">Campos de Usuario (Params)</h4>
                            <div id="new-mod-fields-list"></div>
                            <button onclick="ProgrammerManager.addParamRow('new-mod-fields-list')" class="text-xs text-yellow-500 mt-2 hover:underline">+ Añadir Campo</button>
                        </div>
                    </div>
                </div>

                <div id="prog-tab-code-${windowId}" class="prog-modal-body" style="display:none; display:flex; flex-direction:column;">
                    <p class="text-xs text-gray-500 mb-2">
                        Variables disponibles: <code>ctx.input</code> (dato entrada), <code>ctx.fields.NombreCampo</code> (params), <code>ctx.log(msg)</code>.<br>
                        Debes retornar un valor para pasarlo a la salida.
                    </p>
                    <textarea id="new-mod-code" class="flex-1 bg-[#1e1e1e] text-green-400 font-mono text-xs p-3 border border-[#444] rounded resize-none" spellcheck="false">
// Tu lógica aquí 
return ctx.input; </textarea> </div>

                <div class="p-3 border-t border-[#444] flex justify-end gap-2 bg-[#252526]">
                    <button onclick="ProgrammerManager.createModule('${windowId}')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold">CREAR MÓDULO</button>
                </div>
            </div>
        </div>
    `;
    },

    switchTab(windowId, tabName, tabEl) {
        document.querySelector(`#prog-tab-config-${windowId}`).style.display = tabName === 'config' ? 'block' : 'none';
        document.querySelector(`#prog-tab-code-${windowId}`).style.display = tabName === 'code' ? 'flex' : 'none';

        tabEl.parentElement.querySelectorAll('.prog-tab').forEach(t => t.classList.remove('active'));
        tabEl.classList.add('active');
    },

    addFieldRow(containerId) {
        const div = document.createElement('div');
        div.className = 'prog-field-row';
        div.innerHTML = `
        <input type="text" placeholder="ID (ej: in1)" class="w-1/2 bg-[#333] border border-[#555] text-white text-xs p-1 rounded">
        <button onclick="this.parentElement.remove()" class="text-red-500 px-2">×</button>
    `;
        document.getElementById(containerId).appendChild(div);
    },

    addParamRow(containerId) {
        const div = document.createElement('div');
        div.className = 'prog-field-row';
        div.innerHTML = `
        <input type="text" placeholder="Nombre (ej: factor)" class="w-1/3 bg-[#333] border border-[#555] text-white text-xs p-1 rounded">
        <select class="w-1/3 bg-[#333] border border-[#555] text-white text-xs p-1 rounded">
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="textarea">Área Texto</option>
        </select>
        <button onclick="this.parentElement.remove()" class="text-red-500 px-2">×</button>
    `;
        document.getElementById(containerId).appendChild(div);
    },

    createModule(windowId) {
        const title = document.getElementById('new-mod-title').value || "Sin Nombre";
        const color = document.getElementById('new-mod-color').value;
        const code = document.getElementById('new-mod-code').value;

        const inputs = Array.from(document.querySelectorAll('#new-mod-inputs-list input')).map(i => i.value).filter(v => v);
        const outputs = Array.from(document.querySelectorAll('#new-mod-outputs-list input')).map(i => i.value).filter(v => v);

        const fields = [];
        document.querySelectorAll('#new-mod-fields-list .prog-field-row').forEach(row => {
            const inputs = row.querySelectorAll('input, select');
            if (inputs[0].value) {
                fields.push({
                    name: inputs[0].value,
                    type: inputs[1].value
                });
            }
        });

        const newMod = {
            id: 'custom-' + Date.now(),
            title,
            color,
            inputs,
            outputs,
            fields,
            code
        };

        this.customModules.push(newMod);
        this.saveModules();

        document.getElementById(`prog-modal-container-${windowId}`).innerHTML = '';
        this.refreshSidebar(windowId);
    }
};

class HeadlessGraph {
    constructor(data, logCallback, virtualWindowId) {
        this.nodes = data.nodes || [];
        this.connections = data.connections || [];
        this.logCallback = logCallback;
        this.windowId = virtualWindowId || 'headless-system';
    }
    log(msg) {
        if (this.logCallback) this.logCallback(msg);
    }
    extractNodeValues(node) {
        return node.values || {};
    }
    getPortCenter() {
        return {
            x: 0,
            y: 0
        };
    }
    triggerChange() {}
}