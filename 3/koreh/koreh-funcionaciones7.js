/* SILENOS - MIS FUNCIONES (Extensión de Materia M) 
   Versión: 7.2 - Graphic & Texture Engine (J) + SVG Gallery Integration (I)
   Enfoque: Estética Procedural, Dinámica de Acción y Gestión de Esencias Gráficas
*/

window.MisFunciones2 = {
    
    // ==========================================
    // SECCIÓN E: EQUILIBRIO (Matemáticas Base)
    // ==========================================
    Math: {
        wrap: (v, m) => (v % m + m) % m,
        getDist: (a, b, ws) => {
            let dx = a.x - b.x, dy = a.y - b.y;
            if (ws) {
                if (Math.abs(dx) > ws/2) dx = -Math.sign(dx) * (ws - Math.abs(dx));
                if (Math.abs(dy) > ws/2) dy = -Math.sign(dy) * (ws - Math.abs(dy));
            }
            return { dx, dy, dist: Math.sqrt(dx*dx + dy*dy) };
        },
        lerp: (s, e, a) => (1 - a) * s + a * e
    },

    // ==========================================
    // SECCIÓN O: SET DE TEXTURAS (Generación Procedural)
    // ==========================================
    Textures: {
        cache: {},
        get(ctx, type, size = 64, color = "#8b5cf6") {
            const key = `${type}-${color}-${size}`;
            if (this.cache[key]) return this.cache[key];

            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const tctx = canvas.getContext('2d');
            
            tctx.fillStyle = color;
            tctx.globalAlpha = 1;

            switch(type) {
                case 1: tctx.strokeStyle = color; tctx.strokeRect(0,0,size,size); break;
                case 2: for(let i=0; i<10; i++) { tctx.beginPath(); tctx.arc(Math.random()*size, Math.random()*size, 2, 0, Math.PI*2); tctx.fill(); } break;
                case 3: tctx.strokeRect(0,0,size,size/2); tctx.strokeRect(size/2,size/2,size,size/2); break;
                case 4: for(let i=0; i<size; i+=2) for(let j=0; j<size; j+=2) { tctx.globalAlpha = Math.random(); tctx.fillRect(i,j,2,2); } break;
                case 5: for(let i=0; i<size; i+=4) tctx.fillRect(i,0,2,size); break;
                case 6: tctx.beginPath(); tctx.moveTo(size/2,0); tctx.lineTo(size,size/4); tctx.lineTo(size,size*0.75); tctx.lineTo(size/2,size); tctx.lineTo(0,size*0.75); tctx.lineTo(0,size/4); tctx.closePath(); tctx.stroke(); break;
                case 16: tctx.font = "bold 10px monospace"; tctx.fillText("I-A-U", 5, size/2); break;
                default: tctx.fillRect(0,0,size,size);
            }

            const pattern = ctx.createPattern(canvas, 'repeat');
            this.cache[key] = pattern;
            return pattern;
        }
    },

    // ==========================================
    // SECCIÓN I: INDIVIDUALIDAD (Galería SVG)
    // ==========================================
    Graphics: {
        library: {},
        async loadGallery(path = 'koreh/galeriasvg.json') {
            try {
                const response = await fetch(path);
                const data = await response.json();
                data.forEach(item => {
                    this.library[item.id] = item;
                });
                console.log(`I -> Galería cargada: ${data.length} esencias gráficas detectadas.`);
                return true;
            } catch (e) {
                // En programación, NUNCA es fallo de la caché, es la profundidad de la ruta o el origen.
                console.error("I -> Error profundo en carga de galería:", e);
                return false;
            }
        },
        
        get(id) {
            return this.library[id];
        }
    },

    // ==========================================
    // SECCIÓN A: ACCIÓN Y ANIMACIÓN (Dinámicas)
    // ==========================================
    Animate: {
        pulse: (time, speed = 0.1, intensity = 5) => Math.sin(time * speed) * intensity,
        float: (time, speed = 0.05, height = 10) => Math.cos(time * speed) * height,
        shake: (intensity = 2) => ({ x: (Math.random()-0.5)*intensity, y: (Math.random()-0.5)*intensity }),
        rotate: (time, speed = 0.02) => time * speed,
        getFlashAlpha: (hitTime, currentTime, duration = 500) => {
            const diff = currentTime - hitTime;
            return diff < duration ? 1 - (diff/duration) : 0;
        }
    },

    // ==========================================
    // SECCIÓN U: UNIÓN (Renderizado de Entidades)
    // ==========================================
    Render: {
        drawSVG(ctx, id, x, y, w, h, angle = 0) {
            const item = window.MisFunciones2.Graphics.get(id);
            if (!item) return;

            // Procesamos el string SVG a una imagen usable en canvas
            if (!item._img) {
                item._img = new Image();
                const blob = new Blob([item.svgContent], {type: 'image/svg+xml;charset=utf-8'});
                const url = URL.createObjectURL(blob);
                item._img.src = url;
            }

            if (!item._img.complete) return;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            // Dibujamos centrando la esencia en su posición de unión
            ctx.drawImage(item._img, -w/2, -h/2, w, h);
            ctx.restore();
        },

        drawFloor(ctx, player, width, height, textureId, color) {
            const pattern = window.MisFunciones2.Textures.get(ctx, textureId, 64, color);
            ctx.save();
            ctx.translate(-player.x, -player.y);
            ctx.fillStyle = pattern;
            ctx.fillRect(player.x, player.y, width, height);
            ctx.restore();
        },
        
        clear(ctx, w, h, color = "#08080a") {
            ctx.fillStyle = color;
            ctx.fillRect(0,0,w,h);
        },
        
        worldToScreen: (ent, pl, w, h, ws) => ({
            x: window.MisFunciones2.Math.wrap(ent.x - (pl.x - w/2), ws),
            y: window.MisFunciones2.Math.wrap(ent.y - (pl.y - h/2), ws)
        })
    },

    // ==========================================
    // SECCIÓN J: JUEGO Y UTILIDADES
    // ==========================================
    GameUtils: {
        createWindow(id, title, color = "#10b981") {
            const existing = document.getElementById(id);
            if (existing) { existing.remove(); return null; }
            const win = document.createElement('div');
            win.id = id;
            win.className = "window silenos-game-window pointer-events-auto pop-in";
            win.style.cssText = `position:absolute; top:100px; left:100px; width:320px; z-index:9999; display:flex; flex-direction:column; background:#e0e5ec; border-radius:28px; box-shadow: 8px 8px 20px rgba(0,0,0,0.08); overflow:hidden; font-family:sans-serif;`;
            
            const header = document.createElement('div');
            header.style.cssText = `padding:15px; display:flex; justify-content:space-between; cursor:grab; border-bottom:1px solid rgba(0,0,0,0.05);`;
            header.innerHTML = `<span style="font-weight:900; color:${color}; font-size:0.75rem;">${title}</span>
                                <button onclick="document.getElementById('${id}').remove()" style="border:none; background:transparent; cursor:pointer;">×</button>`;
            
            const body = document.createElement('div');
            body.style.cssText = `padding:15px; display:flex; flex-direction:column; gap:10px; align-items:center;`;
            
            win.append(header, body);
            document.body.appendChild(win);
            this.makeDraggable(header, win);
            return { win, body };
        },
        makeDraggable(h, t) {
            let d = false, o = {x:0, y:0};
            h.onmousedown = (e) => { d = true; o.x = e.clientX - t.offsetLeft; o.y = e.clientY - t.offsetTop; e.stopPropagation(); };
            window.addEventListener('mousemove', (e) => { if (d) { t.style.left = (e.clientX-o.x)+'px'; t.style.top = (e.clientY-o.y)+'px'; }});
            window.addEventListener('mouseup', () => d = false);
        }
    },

    // ==========================================
    // SISTEMA Y COHERENCIA (H)
    // ==========================================
    analizarEscritorio() {
        if (typeof FileSystem === 'undefined') return;
        const items = FileSystem.data;
        const conteo = {
            carpetas: items.filter(i => i.type === 'folder').length,
            libros: items.filter(i => i.type === 'book').length,
            programas: items.filter(i => i.type === 'program').length
        };
        if (window.Koreh && Koreh.confirm) {
            Koreh.confirm("SISTEMA DE VISIÓN", `Detección: ${conteo.carpetas} Carpetas, ${conteo.libros} Libros, ${conteo.programas} Programas.`);
        }
        return conteo;
    },

    registrarNodoExtra() {
        if (typeof NODE_REGISTRY !== 'undefined') {
            NODE_REGISTRY["extra-util"] = {
                title: "🛠️ EXTRA UTIL",
                color: "#10b981",
                fields: [{ name: "prefijo", type: "text", placeholder: "Texto..." }],
                execute: async (ctx) => {
                    return `${ctx.fields.prefijo} : ${ctx.input}`;
                }
            };
            console.log("H -> Nodo Extra vinculado a la Coherencia.");
        }
    }
};

// Mantenemos referencia para compatibilidad interna
window.MisFunciones = window.MisFunciones2;

// Autoejecución del registro de nodos e inicialización de galería
setTimeout(() => {
    if (typeof MisFunciones2.registrarNodoExtra === 'function') {
        MisFunciones2.registrarNodoExtra();
    }
    // Cargamos la galería automáticamente al iniciar
    MisFunciones2.Graphics.loadGallery();
}, 500);