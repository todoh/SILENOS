/* SILENOS - MIS FUNCIONES (Extensión de Materia M) 
   Versión: 2.5 - Game Development Suite (J)
*/

window.MisFunciones = {
    
    // ==========================================
    // SECCIÓN B, D, F: UTILIDADES DE INTERFAZ
    // ==========================================

    GameUtils: {
        // F -> Crea el contenedor base con estilo Neomórfico
        createWindow(id, title, color = "#10b981") {
            const existing = document.getElementById(id);
            if (existing) { existing.remove(); return null; }

            const win = document.createElement('div');
            win.id = id;
            // H -> Coherencia: Añadimos 'window' y 'pointer-events-auto' para bloquear el traspaso de clics
            win.className = "window silenos-game-window pointer-events-auto pop-in";
            win.style.cssText = `
                position: absolute; top: 100px; left: 100px; width: 320px;
                z-index: 9999; display: flex; flex-direction: column;
                background: #e0e5ec; border-radius: 28px;
                box-shadow: 8px 8px 20px rgba(0,0,0,0.08), -2px -2px 10px rgba(255,255,255,0.2);
                user-select: none; overflow: hidden; font-family: sans-serif;
            `;

            // Impedir que el clic o el scroll lleguen al escritorio 3D
            win.addEventListener('mousedown', (e) => e.stopPropagation());
            win.addEventListener('wheel', (e) => e.stopPropagation());

            const header = document.createElement('div');
            header.style.cssText = `
                padding: 15px; display: flex; justify-content: space-between;
                align-items: center; cursor: grab; border-bottom: 1px solid rgba(0,0,0,0.05);
            `;
            header.innerHTML = `
                <span style="font-weight:900; color:${color}; font-size:0.75rem; letter-spacing:1px;">${title}</span>
                <button onclick="document.getElementById('${id}').remove()" style="border:none; background:transparent; cursor:pointer; font-size:1.2rem; color:#888;">×</button>
            `;

            const body = document.createElement('div');
            body.style.cssText = `padding: 20px; display: flex; flex-direction: column; gap: 15px; align-items: center;`;

            win.append(header, body);
            this.makeDraggable(header, win);
            document.body.appendChild(win);

            return { win, body, header };
        },

        // K -> Añade la capacidad de movimiento (Camino)
        makeDraggable(handle, target) {
            let dragging = false, offset = {x:0, y:0};
            handle.onmousedown = (e) => {
                dragging = true;
                offset.x = e.clientX - target.offsetLeft;
                offset.y = e.clientY - target.offsetTop;
                target.style.zIndex = 10000;
                e.stopPropagation(); // No activar selección múltiple al arrastrar la ventana
            };
            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                target.style.left = (e.clientX - offset.x) + 'px';
                target.style.top = (e.clientY - offset.y) + 'px';
            });
            window.addEventListener('mouseup', () => dragging = false);
        },

        // N -> Crea una barra de estadísticas (Número)
        createStatsBar(parent, stats) {
            const bar = document.createElement('div');
            bar.style.cssText = `
                width: 100%; display: flex; justify-content: space-between; 
                background: rgba(0,0,0,0.03); padding: 8px 15px; border-radius: 12px;
            `;
            stats.forEach(s => {
                const container = document.createElement('div');
                container.style.cssText = `display:flex; flex-direction:column; align-items:${s.align || 'flex-start'};`;
                container.innerHTML = `
                    <span style="font-size:0.5rem; color:#718096; font-weight:bold;">${s.label}</span>
                    <span id="${s.id}" style="font-weight:900; color:#475569;">${s.value}</span>
                `;
                bar.appendChild(container);
            });
            parent.appendChild(bar);
        },

        // J -> Botón estándar de acción (Juego)
        createButton(text, onClick, color = "#10b981") {
            const btn = document.createElement('button');
            btn.innerText = text;
            btn.style.cssText = `
                width: 100%; padding: 12px; border: none; border-radius: 15px; 
                background: #e0e5ec; color: ${color}; font-weight: 900; 
                cursor: pointer; box-shadow: 4px 4px 10px rgba(0,0,0,0.08);
                transition: transform 0.2s;
            `;
            btn.onclick = onClick;
            btn.onmousedown = (e) => {
                btn.style.transform = "scale(0.95)";
                e.stopPropagation();
            };
            btn.onmouseup = () => btn.style.transform = "scale(1)";
            return btn;
        }
    },

    // ==========================================
    // FUNCIONES ORIGINALES (B, K, Z)
    // ==========================================

    analizarEscritorio() {
        const items = FileSystem.data;
        console.log(`H -> Iniciando análisis de coherencia sobre ${items.length} partículas.`);
        
        const conteo = {
            carpetas: items.filter(i => i.type === 'folder').length,
            libros: items.filter(i => i.type === 'book').length,
            programas: items.filter(i => i.type === 'program').length
        };
        
        Koreh.confirm("SISTEMA DE VISIÓN", 
            `Se han detectado:\n- ${conteo.carpetas} Carpetas (D)\n- ${conteo.libros} Libros (M)\n- ${conteo.programas} Programas (T)`);
        
        return conteo;
    },

    caosCreativo() {
        FileSystem.data.forEach(item => {
            if (item.parentId === 'desktop') {
                item.x += (Math.random() - 0.5) * 100;
                item.y += (Math.random() - 0.5) * 100;
            }
        });
        FileSystem.save();
        if (window.refreshSystemViews) window.refreshSystemViews();
        console.log("R -> Resonancia aplicada a la materia del escritorio.");
    },

    registrarNodoExtra() {
        if (typeof NODE_REGISTRY !== 'undefined') {
            NODE_REGISTRY["extra-util"] = {
                title: "🛠️ EXTRA UTIL",
                color: "#10b981",
                fields: [{ name: "prefijo", type: "text", placeholder: "Texto..." }],
                execute: async (ctx) => {
                    const res = `${ctx.fields.prefijo} : ${ctx.input}`;
                    ctx.log("Procesando en MisFunciones: " + res);
                    return res;
                }
            };
            console.log("H -> Nodo Extra vinculado a la Coherencia del Programador.");
        }
    }
};

setTimeout(() => {
    MisFunciones.registrarNodoExtra();
}, 500);