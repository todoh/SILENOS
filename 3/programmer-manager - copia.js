/* SILENOS 3/programmer-manager.js */

const ProgrammerManager = {
    instances: {}, 
    customModules: [], 

    init() {
        const saved = localStorage.getItem('silenos_custom_modules');
        if (saved) {
            try { this.customModules = JSON.parse(saved); } catch (e) { this.customModules = []; }
        }
    },

    saveModules() {
        localStorage.setItem('silenos_custom_modules', JSON.stringify(this.customModules));
        Object.keys(this.instances).forEach(wid => this.refreshSidebar(wid));
    },

    renderInWindow(windowId, fileId = null) {
        this.init(); 

        if (!document.getElementById('prog-styles-critical')) {
            const style = document.createElement('style');
            style.id = 'prog-styles-critical';
            style.innerHTML = `
                .prog-wrapper { display: flex; height: 100%; width: 100%; font-family: 'Segoe UI', sans-serif; overflow: hidden; background: #1e1e1e; }
                .prog-sidebar { width: 200px; background: #252526; border-right: 1px solid #333; display: flex; flex-direction: column; z-index: 20; user-select: none; }
                .prog-main { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
                
                .prog-palette-item { 
                    padding: 8px 12px; margin: 4px 10px; background: #333; color: #ddd; 
                    font-size: 0.8rem; cursor: grab; border-radius: 4px; border-left: 3px solid #555; display: flex; justify-content: space-between;
                }
                .prog-palette-item:hover { background: #444; }

                .prog-editor-container { position: relative; width: 100%; height: 100%; overflow: hidden; background-color: #1e1e1e; }
                .prog-world { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-origin: 0 0; }
                .prog-connections-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0; overflow: visible; }

                /* NODOS */
                .prog-node {
                    position: absolute; width: 200px; background: #252526; border: 1px solid #454545;
                    border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: flex; flex-direction: column; z-index: 10;
                }
                .prog-node-header {
                    padding: 6px 10px; background: #333; border-bottom: 1px solid #222; border-radius: 7px 7px 0 0;
                    font-size: 0.75rem; font-weight: bold; color: #aaa; cursor: grab; display: flex; align-items: center; justify-content: space-between;
                }
                .prog-node-close {
                    background: transparent; border: none; color: #666; font-size: 1.2rem; cursor: pointer; line-height: 1; padding: 0 2px;
                }
                .prog-node-close:hover { color: #ff5555; }

                .prog-node-body { padding: 8px; font-size: 0.8rem; color: #ccc; }
                .prog-node input, .prog-node select, .prog-node textarea { 
                    width: 100%; background: #111; border: 1px solid #444; color: #eee; padding: 4px; margin-top: 4px; border-radius:3px; font-size: 0.7rem;
                }

                .prog-ports { display: flex; justify-content: space-between; padding: 0 4px 6px 4px; }
                .prog-port {
                    width: 12px; height: 12px; border-radius: 50%; background: #555; border: 2px solid #252526;
                    cursor: crosshair; transition: background 0.2s; position: relative; z-index: 5;
                }
                .prog-port:hover { background: #fff; transform: scale(1.2); }
                .prog-port-in { margin-left: -10px; }
                .prog-port-out { margin-right: -10px; }

                .prog-console-overlay {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 100px;
                    background: rgba(0,0,0,0.9); color: #0f0; font-family: monospace; font-size: 0.7rem;
                    padding: 8px; overflow-y: auto; z-index: 50; border-top: 1px solid #333;
                }
                .prog-toolbar { position: absolute; top: 10px; right: 10px; z-index: 100; display: flex; gap: 8px; }
                .prog-btn-float {
                    background: #2ea043; color: white; border: none; padding: 5px 12px;
                    border-radius: 4px; font-size: 0.75rem; font-weight: bold; cursor: pointer;
                }
            `;
            document.head.appendChild(style);
        }

        this.initInterface(windowId, fileId);
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
                        <button class="prog-btn-float" onclick="ProgrammerManager.run('${windowId}')">▶ Ejecutar</button>
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
                    FileSystem.updateItem(fileId, { content: data });
                    const status = document.getElementById(`prog-save-status-${windowId}`);
                    if(status) {
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

        sb.innerHTML = `
            <div style="padding: 10px; font-weight:bold; color:#555; font-size:0.65rem; text-transform:uppercase;">Nodos</div>
            <div class="prog-palette-item" draggable="true" data-type="log" style="border-left-color:#007acc">📝 Log</div>
            <div class="prog-palette-item" draggable="true" data-type="wait" style="border-left-color:#6a00ff">⏳ Esperar</div>
            <div class="prog-palette-item" draggable="true" data-type="if-logic" style="border-left-color:#f59e0b">🔀 IF</div>
            <div class="prog-palette-item" draggable="true" data-type="logic-gate" style="border-left-color:#f59e0b">⚖️ Compuerta</div>
            <div class="prog-palette-item" draggable="true" data-type="set-var" style="border-left-color:#06b6d4">💾 Set Var</div>
            <div class="prog-palette-item" draggable="true" data-type="get-var" style="border-left-color:#06b6d4">📂 Get Var</div>
            <div class="prog-palette-item" draggable="true" data-type="ai-query" style="border-left-color:#3b82f6">🧠 AI Query</div>
            <div class="prog-palette-item" draggable="true" data-type="book-export" style="border-left-color:#e11d48">📕 Export</div>
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

    run(windowId) {
        const graph = this.instances[windowId];
        if (graph) graph.run();
    },

    log(windowId, msg) {
        const consoleEl = document.getElementById(`prog-console-${windowId}`);
        if (consoleEl) {
            const line = document.createElement('div');
            line.innerText = `> ${msg}`;
            consoleEl.appendChild(line);
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }
};