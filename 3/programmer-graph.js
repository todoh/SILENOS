 

/* SILENOS 3/programmer-graph.js */

class ProgrammerGraph {
    constructor(containerId, windowId) {
        this.windowId = windowId;
        this.container = document.getElementById(containerId);
        this.nodes = [];
        this.connections = [];
        this.nodeCounter = 0;
        this.onChange = null;
        this.onLog = null;

        this.initDOM();
        this.ui = new ProgUIManager(this.container, this);
        this.connSystem = new ProgConnectionSystem(this.svgLayer, this);
        this.runtime = new ProgRuntime(this);
        
        this.setupEvents();
    }

    get scale() { return this.ui.scale; }
    get panX() { return this.ui.panX; }
    get panY() { return this.ui.panY; }

    initDOM() {
        this.container.innerHTML = '<div class="prog-world"></div>';
        this.world = this.container.querySelector('.prog-world');
        this.svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svgLayer.classList.add('prog-connections-layer');
        this.svgLayer.innerHTML = `
            <defs>
                <marker id="arrow-${this.windowId}" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#888" />
                </marker>
            </defs>`;
        this.world.appendChild(this.svgLayer);
    }

    setupEvents() {
        this.ui.setupEvents();
    }

    // [MODIFICADO] Acepta customPorts para restaurar o crear puertos dinámicos
    addNode(type, x, y, triggerSave = true, customData = null) {
        const def = NODE_REGISTRY[type] || { title: type.toUpperCase(), color: "#444" };
        const id = (customData && customData.id) ? customData.id : `node-${this.windowId}-${this.nodeCounter++}`;
        
        // --- GESTIÓN DE PUERTOS DINÁMICOS ---
        // Si vienen en customData (carga) se usan, si no, se usan los de la definición
        const inputs = (customData && customData.inputs) ? customData.inputs : (def.inputs || (def.hasIn !== false ? ['in'] : []));
        const outputs = (customData && customData.outputs) ? customData.outputs : (def.outputs || (def.hasOut !== false ? ['out'] : []));

        const el = document.createElement('div');
        el.className = 'prog-node';
        el.style.transform = `translate(${x}px, ${y}px)`;
        el.dataset.id = id;
        el.dataset.type = type;

        // Renderizado HTML de Puertos
        let portsHTML = '';
        
        // Renderizar Inputs
        const insHTML = inputs.map(p => `
            <div class="prog-port-row flex items-center justify-start relative">
                <div class="prog-port prog-port-in" data-port="${p}" title="${p}"></div>
                <span class="prog-port-label ml-2">${p}</span>
                ${def.isDynamic ? `<div class="prog-port-remover" onclick="ProgrammerManager.instances['${this.windowId}'].removePort('${id}', 'in', '${p}')">×</div>` : ''}
            </div>
        `).join('');

        // Renderizar Outputs
        const outsHTML = outputs.map(p => `
            <div class="prog-port-row flex items-center justify-end relative">
                <span class="prog-port-label mr-2">${p}</span>
                <div class="prog-port prog-port-out" data-port="${p}" title="${p}"></div>
                ${def.isDynamic ? `<div class="prog-port-remover" style="right:0; left:auto;" onclick="ProgrammerManager.instances['${this.windowId}'].removePort('${id}', 'out', '${p}')">×</div>` : ''}
            </div>
        `).join('');

        portsHTML = `
            <div class="flex flex-col gap-1 px-1 pb-2">
                <div class="flex flex-col gap-1 items-start w-full">${insHTML}</div>
                <div class="prog-node-body p-0">${this.renderFields(def.fields)}</div>
                <div class="flex flex-col gap-1 items-end w-full mt-1">${outsHTML}</div>
            </div>`;

        // Botones de añadir puertos (Solo si es dinámico)
        let dynamicControls = '';
        if (def.isDynamic) {
            dynamicControls = `
                <div class="prog-dynamic-controls">
                    <button class="prog-btn-add-port" onclick="ProgrammerManager.instances['${this.windowId}'].addPort('${id}', 'in')">+ In</button>
                    <button class="prog-btn-add-port" onclick="ProgrammerManager.instances['${this.windowId}'].addPort('${id}', 'out')">+ Out</button>
                </div>
            `;
        }

        el.innerHTML = `
            <div class="prog-node-header" style="border-top:3px solid ${def.color}">
                <span class="flex-1 truncate select-none">${def.title}</span>
                <button class="prog-node-close">×</button>
            </div>
            ${portsHTML}
            ${dynamicControls}
        `;

        this.world.appendChild(el);
        
        // Guardamos los puertos actuales en el objeto nodo para referencia rápida
        const node = { 
            id, type, x, y, element: el,
            inputs: [...inputs],
            outputs: [...outputs]
        };
        
        this.nodes.push(node);
        this.bindNodeEvents(node);
        
        if (triggerSave) this.triggerChange();
        return node;
    }

    // [NUEVO] Añadir puerto dinámicamente
    addPort(nodeId, type) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        const name = prompt(`Nombre del nuevo puerto (${type}):`, type === 'in' ? `in${node.inputs.length + 1}` : `out${node.outputs.length + 1}`);
        if (!name) return;

        // Evitar duplicados
        const list = type === 'in' ? node.inputs : node.outputs;
        if (list.includes(name)) return alert("Ya existe un puerto con ese nombre");

        list.push(name);
        
        // Re-renderizar nodo completo (Es costoso pero seguro para mantener estructura)
        // Guardamos estado
        const x = node.x;
        const y = node.y;
        const values = this.extractNodeValues(node);
        const nodeType = node.type;

        this.removeNode(nodeId, false); // false = no trigger save yet
        
        // Recreamos con los nuevos datos de puertos
        const newNode = this.addNode(nodeType, x, y, true, { 
            id: nodeId, 
            inputs: node.inputs, 
            outputs: node.outputs 
        });

        // Restauramos valores
        this.restoreNodeValues(newNode, values);
    }

    // [NUEVO] Eliminar puerto dinámicamente
    removePort(nodeId, type, portName) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        if (!confirm(`¿Eliminar puerto ${portName}? Se perderán las conexiones.`)) return;

        const list = type === 'in' ? node.inputs : node.outputs;
        const idx = list.indexOf(portName);
        if (idx > -1) list.splice(idx, 1);

        // Guardar estado y recrear
        const x = node.x; const y = node.y; const values = this.extractNodeValues(node); const nodeType = node.type;
        
        this.removeNode(nodeId, false);
        const newNode = this.addNode(nodeType, x, y, true, { id: nodeId, inputs: node.inputs, outputs: node.outputs });
        this.restoreNodeValues(newNode, values);
    }

    renderFields(fields) {
        if (!fields) return "";
        return fields.map(f => {
            let inputHtml = '';
            if (f.type === 'select') {
                inputHtml = `<select name="${f.name}">${f.options.map(o => `<option>${o}</option>`).join('')}</select>`;
            } else if (f.type === 'textarea') {
                inputHtml = `<textarea name="${f.name}" placeholder="${f.placeholder || f.name}"></textarea>`;
            } else {
                inputHtml = `<input type="${f.type}" name="${f.name}" value="${f.value || ''}" placeholder="${f.placeholder || f.name}">`;
            }

            return `
                <div class="mb-2 relative group px-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[9px] text-gray-500 uppercase font-bold">${f.name}</span>
                        <label class="flex items-center gap-1 cursor-pointer" title="Mostrar en Interfaz de Usuario">
                            <input type="checkbox" class="prog-field-expose" data-name="${f.name}">
                            <span class="text-[8px] text-gray-600 group-hover:text-blue-400">UI</span>
                        </label>
                    </div>
                    ${inputHtml}
                </div>
            `;
        }).join('');
    }

    bindNodeEvents(node) {
        const header = node.element.querySelector('.prog-node-header');
        const closeBtn = node.element.querySelector('.prog-node-close');

        // Drag del nodo
        header.onmousedown = (e) => {
            if (e.target === closeBtn) return;
            let lastX = e.clientX, lastY = e.clientY;
            const move = (me) => {
                node.x += (me.clientX - lastX) / this.ui.scale;
                node.y += (me.clientY - lastY) / this.ui.scale;
                node.element.style.transform = `translate(${node.x}px, ${node.y}px)`;
                lastX = me.clientX; lastY = me.clientY;
                this.connSystem.render();
            };
            const up = () => { window.removeEventListener('mousemove', move); this.triggerChange(); };
            window.addEventListener('mousemove', move);
            window.addEventListener('mouseup', up);
        };

        closeBtn.onclick = () => this.removeNode(node.id);

        // Eventos de puertos dinámicos
        node.element.querySelectorAll('.prog-port').forEach(p => {
            p.onmousedown = (e) => this.startConnDrag(e, node, p.dataset.port);
        });

        node.element.querySelectorAll('input, select, textarea').forEach(inp => {
            inp.addEventListener('change', () => this.triggerChange());
        });
    }

    removeNode(nodeId, triggerSave = true) {
        const index = this.nodes.findIndex(n => n.id === nodeId);
        if (index === -1) return;

        this.nodes[index].element.remove();
        this.connections = this.connections.filter(c => c.fromNode !== nodeId && c.toNode !== nodeId);
        this.nodes.splice(index, 1);
        
        this.connSystem.render();
        if(triggerSave) this.triggerChange();
    }

    startConnDrag(e, node, port) {
        e.stopPropagation();
        e.preventDefault(); // Evitar selects
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("stroke", "#007acc"); 
        line.setAttribute("stroke-dasharray", "4");
        line.setAttribute("stroke-width", "3");
        line.setAttribute("fill", "none");
        this.svgLayer.appendChild(line);

        const move = (me) => {
            const p1 = this.getPortCenter(node.id, port);
            if (!p1) return; // Puerto borrado o error
            
            const rect = this.container.getBoundingClientRect();
            const p2 = { 
                x: (me.clientX - rect.left - this.ui.panX) / this.ui.scale, 
                y: (me.clientY - rect.top - this.ui.panY) / this.ui.scale 
            };
            line.setAttribute("d", this.connSystem.calculateBezier(p1.x, p1.y, p2.x, p2.y));
        };

        const up = (ue) => {
            window.removeEventListener('mousemove', move); 
            line.remove();
            
            const target = ue.target.closest('.prog-port');
            if (target) {
                const targetNode = this.nodes.find(n => n.element.contains(target));
                if (targetNode && targetNode.id !== node.id) {
                    this.addConnection(node.id, port, targetNode.id, target.dataset.port);
                }
            }
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up, { once: true });
    }

    addConnection(f, fp, t, tp) {
        const exists = this.connections.some(c => c.fromNode === f && c.fromPort === fp && c.toNode === t && c.toPort === tp);
        if (exists) return;
        this.connections.push({ fromNode: f, fromPort: fp, toNode: t, toPort: tp });
        this.connSystem.render();
        this.triggerChange();
    }

    removeConnection(c) {
        this.connections = this.connections.filter(conn => conn !== c);
        this.connSystem.render();
        this.triggerChange();
    }

    getPortCenter(nodeId, portName) {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return null;
        
        const port = node.element.querySelector(`.prog-port[data-port="${portName}"]`);
        if (!port) return null; // Importante: si el puerto dinámico fue borrado, devolver null
        
        const nodeRect = node.element.getBoundingClientRect();
        const portRect = port.getBoundingClientRect();
        
        return {
            x: node.x + (portRect.left - nodeRect.left) / this.ui.scale + (portRect.width / 2) / this.ui.scale,
            y: node.y + (portRect.top - nodeRect.top) / this.ui.scale + (portRect.height / 2) / this.ui.scale
        };
    }

    load(data) {
        this.nodes.forEach(n => n.element.remove());
        this.nodes = []; this.connections = [];
        this.nodeCounter = 0;

        if (!data || !data.nodes || data.nodes.length === 0) return this.addNode('start', 50, 50);
        
        this.ui.panX = data.panX || 0; 
        this.ui.panY = data.panY || 0; 
        this.ui.scale = data.scale || 1;
        this.ui.updateTransform();

        data.nodes.forEach(n => {
            // [MODIFICADO] Pasamos n completo como customData para restaurar puertos
            const newNode = this.addNode(n.type, n.x, n.y, false, n);
            
            // Actualizar contador para evitar colisiones
            const parts = n.id.split('-');
            const num = parseInt(parts[parts.length - 1]);
            if (!isNaN(num) && num >= this.nodeCounter) this.nodeCounter = num + 1;

            if (n.values) this.restoreNodeValues(newNode, n.values);
            
            if (n.uiFlags) {
                Object.entries(n.uiFlags).forEach(([key, isExposed]) => {
                    const checkbox = newNode.element.querySelector(`.prog-field-expose[data-name="${key}"]`);
                    if (checkbox) checkbox.checked = isExposed;
                });
            }
        });
        this.connections = data.connections || [];
        this.connSystem.render();
    }

    restoreNodeValues(node, values) {
        Object.entries(values).forEach(([key, val]) => {
            const input = node.element.querySelector(`[name="${key}"]`);
            if (input) input.value = val;
        });
    }

    serialize() {
        return {
            nodes: this.nodes.map(n => ({ 
                id: n.id, type: n.type, x: n.x, y: n.y, 
                inputs: n.inputs, // [MODIFICADO] Guardamos inputs actuales
                outputs: n.outputs, // [MODIFICADO] Guardamos outputs actuales
                values: this.extractNodeValues(n),
                uiFlags: this.extractNodeUiFlags(n)
            })),
            connections: this.connections,
            panX: this.ui.panX, panY: this.ui.panY, scale: this.ui.scale
        };
    }

    extractNodeValues(node) {
        const vals = {};
        node.element.querySelectorAll('input:not([type="checkbox"]), select, textarea').forEach(i => vals[i.name] = i.value);
        return vals;
    }

    extractNodeUiFlags(node) {
        const flags = {};
        node.element.querySelectorAll('.prog-field-expose').forEach(cb => {
            flags[cb.dataset.name] = cb.checked;
        });
        return flags;
    }

    run() { this.runtime.run(); }
    log(m) { this.onLog?.(m); }
    triggerChange() { this.onChange?.(this.serialize()); }
}