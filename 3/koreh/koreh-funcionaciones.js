/* SILENOS - KOREH FUNCIONACIONES (Librería de Utilidades Compartidas) 
   Versión: 3.5 - Integración de Materia y Granularidad (G-F-H)
*/

window.Koreh = {
    // --- 1. GENERADOR DE FORMULARIOS ---
    createForm(parentId, fields, onSubmit) {
        const form = document.createElement('div');
        form.style.cssText = 'display:flex; flex-direction:column; gap:12px; padding:10px;';
        
        const inputs = {};
        fields.forEach(f => {
            const label = document.createElement('label');
            label.innerText = f.toUpperCase();
            label.style.cssText = 'font-size:9px; font-weight:bold; color:#888; margin-left:5px;';
            
            const input = document.createElement('input');
            input.placeholder = `Ingresar ${f}...`;
            input.style.cssText = 'width:100%; background:#e0e5ec; box-shadow:inset 2px 2px 5px #b8b9be, inset -2px -2px 5px #ffffff; border:none; padding:10px; border-radius:10px; outline:none; font-size:0.8rem; color:#333;';
            
            form.append(label, input);
            inputs[f] = input;
        });

        const btn = this.createButton("EJECUTAR ACCIÓN", true);
        btn.style.marginTop = "10px";
        btn.onclick = () => {
            const values = {};
            for(let key in inputs) values[key] = inputs[key].value;
            onSubmit(values);
        };

        form.appendChild(btn);
        return form;
    },

    // --- 2. CONTROL DE BUCLE (Optimizado) ---
    createLoop(winId, fps, callback) {
        const interval = 1000 / fps;
        let lastTime = performance.now();
        let active = true;

        const loop = (time) => {
            if (!active || !document.getElementById(winId)) return;
            const delta = time - lastTime;
            if (delta >= interval) {
                callback();
                lastTime = time - (delta % interval);
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return { stop: () => { active = false; } };
    },

    // --- 3. DIÁLOGOS DE CONFIRMACIÓN ---
    async confirm(title, message) {
        return new Promise(resolve => {
            const { win, header } = this.createWindow('sys-confirm', title, '#ef4444', '300px');
            const body = document.createElement('div');
            body.style.padding = '20px';
            body.innerHTML = `<p style="font-size:0.8rem; color:#475569; text-align:center; line-height:1.4;">${message}</p>`;
            
            const footer = document.createElement('div');
            footer.style.cssText = 'display:flex; gap:10px; justify-content:center; padding-bottom:20px;';
            
            const btnNo = this.createButton("CANCELAR");
            const btnYes = this.createButton("ACEPTAR", true);
            
            btnNo.onclick = () => { win.remove(); resolve(false); };
            btnYes.onclick = () => { win.remove(); resolve(true); };
            
            footer.append(btnNo, btnYes);
            win.append(header, body, footer);
            document.body.appendChild(win);
        });
    },

    // --- 4. DESCARGA DE MATERIA ---
    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // --- 5. VENTANAS (D) ---
    createWindow(id, title, color = '#475569', width = '400px') {
        const existing = document.getElementById(id);
        if (existing) { existing.remove(); return null; }

        const win = document.createElement('div');
        win.id = id;
        win.className = 'window pointer-events-auto pop-in';
        win.style.cssText = `
            position: absolute; top: 120px; left: 120px; width: ${width};
            z-index: 9999; display: flex; flex-direction: column;
            background: #e0e5ec; border-radius: 28px;
            box-shadow: 12px 12px 24px #b8b9be, -12px -12px 24px #ffffff;
            overflow: hidden; font-family: sans-serif; border: 1px solid rgba(255,255,255,0.4);
        `;

        win.addEventListener('mousedown', (e) => e.stopPropagation());
        win.addEventListener('wheel', (e) => e.stopPropagation());

        const header = document.createElement('div');
        header.style.cssText = `padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; cursor: grab; background: #e0e5ec; border-bottom: 1px solid rgba(0,0,0,0.05);`;
        header.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:8px; height:8px; background:${color}; border-radius:50%;"></div>
                <span style="font-weight:900; color:#475569; font-size:0.7rem; letter-spacing:1px; text-transform:uppercase;">${title}</span>
            </div>
            <button id="close-${id}" style="border:none; background:transparent; cursor:pointer; font-size:1.2rem; color:#888;">×</button>
        `;

        this.makeDraggable(win, header);
        header.querySelector(`#close-${id}`).onclick = () => win.remove();

        return { win, header };
    },

    // --- 6. ARRASTRE ---
    makeDraggable(element, handle) {
        let dragging = false, offset = {x:0, y:0};
        
        const onMouseMove = (e) => {
            if (!dragging) return;
            element.style.left = (e.clientX - offset.x) + 'px';
            element.style.top = (e.clientY - offset.y) + 'px';
        };

        const onMouseUp = () => {
            dragging = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        handle.onmousedown = (e) => {
            if (e.target.tagName === 'BUTTON') return;
            dragging = true;
            offset.x = e.clientX - element.offsetLeft;
            offset.y = e.clientY - element.offsetTop;
            element.style.zIndex = 10000;
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            e.stopPropagation();
        };
    },

    // --- 7. BOTONES (M) ---
    createButton(text, primary = false) {
        const btn = document.createElement('button');
        btn.innerText = text;
        const neumorph = primary 
            ? `background: #6366f1; color: #fff; box-shadow: 4px 4px 10px rgba(99,102,241,0.3);`
            : `background: #e0e5ec; color: #475569; box-shadow: 4px 4px 10px #b8b9be, -4px -4px 10px #ffffff;`;
        
        btn.style.cssText = `padding: 10px 18px; border: none; border-radius: 15px; font-weight: 900; cursor: pointer; font-size: 0.65rem; transition: all 0.2s; letter-spacing: 1px; ${neumorph}`;
        
        btn.onmousedown = () => {
            btn.style.transform = "scale(0.96)";
            btn.style.boxShadow = primary ? "2px 2px 5px rgba(99,102,241,0.2)" : "inset 3px 3px 6px #b8b9be, inset -3px -3px 6px #ffffff";
        };
        btn.onmouseup = () => {
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = neumorph.split('box-shadow:')[1].split(';')[0];
        };
        return btn;
    },

    // --- 8. UTILIDADES DE MATERIA (G, F) ---
    // G -> Escaneo recursivo de archivos (Granularidad)
    walkFileSystem(id, callback) {
        if (typeof FileSystem === 'undefined') return;
        const item = FileSystem.getItem(id);
        if (!item) return;
        if (item.type === 'folder') {
            FileSystem.getItems(id).forEach(child => this.walkFileSystem(child.id, callback));
        } else {
            callback(item);
        }
    },

    // F -> Generador de zona de detección (Forma)
    createDropZone(color = "#f59e0b") {
        const dz = document.createElement('div');
        dz.className = 'neumorph-in';
        dz.style.cssText = `
            height: 120px; border: 2px dashed ${color}; border-radius: 22px; 
            display: flex; flex-direction: column; align-items: center; 
            justify-content: center; gap: 10px; background: rgba(0,0,0,0.02);
            transition: all 0.3s ease;
        `;
        dz.innerHTML = `<div style="color:${color}; font-size:0.7rem; font-weight:900; text-align:center;">ESPERANDO MATERIA</div>`;
        return dz;
    }
};