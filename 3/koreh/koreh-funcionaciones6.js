/* SILENOS - MIS FUNCIONES (Extensión de Materia M) 
   Versión: 6.0 - Universal Game & UI Engine (J)
   Refinado con Arquitectura de Resonancia (A, E, I, U, O)
*/

window.MisFunciones = {
    
    // ==========================================
    // SECCIÓN E: EQUILIBRIO (Matemáticas y Coherencia)
    // ==========================================
    Math: {
        // Envoltorio toroidal para mundos infinitos
        wrap(val, max) {
            return (val % max + max) % max;
        },

        // Distancia euclidiana con soporte para mundos envolventes
        getDist(a, b, worldSize) {
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            if (worldSize) {
                if (Math.abs(dx) > worldSize / 2) dx = -Math.sign(dx) * (worldSize - Math.abs(dx));
                if (Math.abs(dy) > worldSize / 2) dy = -Math.sign(dy) * (worldSize - Math.abs(dy));
            }
            return { dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
        },

        // Interpolar valores para suavidad (Resonancia)
        lerp(start, end, amt) {
            return (1 - amt) * start + amt * end;
        }
    },

    // ==========================================
    // SECCIÓN A: ACCIÓN (Física y Dinámica)
    // ==========================================
    Physics: {
        // Actualiza proyectiles y filtra los que mueren
        updateEntities(entities, worldSize) {
            entities.forEach(e => {
                if (e.vx !== undefined) {
                    e.x = MisFunciones.Math.wrap(e.x + e.vx, worldSize);
                    e.y = MisFunciones.Math.wrap(e.y + e.vy, worldSize);
                }
                if (e.life !== undefined) e.life--;
            });
            return entities.filter(e => e.life === undefined || e.life > 0);
        },

        // Detector de colisiones simple por radio
        checkCollision(a, b, radius, worldSize) {
            return MisFunciones.Math.getDist(a, b, worldSize).dist < radius;
        }
    },

    // ==========================================
    // SECCIÓN U: UNIÓN (Renderizado y Cámara)
    // ==========================================
    Render: {
        // Limpia el canvas y dibuja el fondo base
        clear(ctx, width, height, color = "#08080a") {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, width, height);
        },

        // Dibuja una rejilla de fondo basada en la posición del jugador
        drawGrid(ctx, player, width, height, spacing = 100, color = "#1a1a20") {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            const offsetX = -(player.x % spacing);
            const offsetY = -(player.y % spacing);
            
            for (let x = offsetX; x < width; x += spacing) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
            }
            for (let y = offsetY; y < height; y += spacing) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
            }
            ctx.restore();
        },

        // Convierte coordenadas del mundo a coordenadas de pantalla (Centrado en jugador)
        worldToScreen(entity, player, width, height, worldSize) {
            const camX = player.x - width / 2;
            const camY = player.y - height / 2;
            return {
                x: MisFunciones.Math.wrap(entity.x - camX, worldSize),
                y: MisFunciones.Math.wrap(entity.y - camY, worldSize)
            };
        }
    },

    // ==========================================
    // SECCIÓN I: INDIVIDUALIDAD (Identidad de Actores)
    // ==========================================
    Actors: {
        drawPlayer(ctx, width, height, player, mouse, time) {
            ctx.save();
            ctx.translate(width / 2, height / 2);

            // Animación de piernas (Equilibrio en movimiento)
            if (player.isMoving) {
                const walkCycle = Math.sin(time * 0.2) * 12;
                ctx.strokeStyle = '#5a2fb8'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-8, 15 + walkCycle); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(8, 15 - walkCycle); ctx.stroke();
            }

            // Cuerpo
            ctx.rotate(player.isMoving ? Math.sin(time * 0.2) * 0.05 : 0);
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath(); ctx.roundRect(-12, -15, 24, 25, 8); ctx.fill();
            
            // Cabeza y Visor (Esencia I)
            ctx.fillStyle = '#a78bfa';
            ctx.beginPath(); ctx.arc(0, -22, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(-5, -25, 10, 4);

            // Arma
            ctx.restore();
            ctx.save();
            ctx.translate(width / 2, height / 2);
            const armAngle = Math.atan2(mouse.y - height / 2, mouse.x - width / 2);
            ctx.rotate(armAngle);
            ctx.fillStyle = '#333'; ctx.fillRect(12, -4, 28, 8);
            ctx.restore();
        },

        drawMonster(ctx, pos, monster, time) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            const pulse = Math.sin(time * 0.1) * 3;
            ctx.fillStyle = monster.color;
            ctx.shadowBlur = 10; ctx.shadowColor = monster.color;
            ctx.beginPath(); ctx.arc(0, 0, 12 + pulse, 0, Math.PI * 2); ctx.fill();
            
            // Tentáculos/Partes (Acción Dinámica)
            for (let i = 0; i < (monster.parts || 4); i++) {
                const angle = (i / monster.parts) * Math.PI * 2 + (time * 0.05);
                const length = 18 + Math.sin(time * 0.2 + i) * 6;
                ctx.strokeStyle = monster.color; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length); ctx.stroke();
            }
            ctx.restore();
        }
    },

    // ==========================================
    // SECCIÓN O: SET (Gestión de Sistemas y UI)
    // ==========================================
    GameUtils: {
        createWindow(id, title, color = "#10b981") {
            const existing = document.getElementById(id);
            if (existing) { existing.remove(); return null; }

            const win = document.createElement('div');
            win.id = id;
            win.className = "window silenos-game-window pointer-events-auto pop-in";
            win.style.cssText = `
                position: absolute; top: 100px; left: 100px; width: 320px;
                z-index: 9999; display: flex; flex-direction: column;
                background: #e0e5ec; border-radius: 28px;
                box-shadow: 8px 8px 20px rgba(0,0,0,0.08), -2px -2px 10px rgba(255,255,255,0.2);
                user-select: none; overflow: hidden; font-family: sans-serif;
            `;

            win.addEventListener('mousedown', (e) => e.stopPropagation());
            win.addEventListener('wheel', (e) => e.stopPropagation());

            const header = document.createElement('div');
            header.style.cssText = `padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: grab; border-bottom: 1px solid rgba(0,0,0,0.05);`;
            header.innerHTML = `<span style="font-weight:900; color:${color}; font-size:0.75rem; letter-spacing:1px;">${title}</span>
                                <button onclick="document.getElementById('${id}').remove()" style="border:none; background:transparent; cursor:pointer; font-size:1.2rem; color:#888;">×</button>`;

            const body = document.createElement('div');
            body.style.cssText = `padding: 20px; display: flex; flex-direction: column; gap: 15px; align-items: center;`;

            win.append(header, body);
            this.makeDraggable(header, win);
            document.body.appendChild(win);

            return { win, body, header };
        },

        makeDraggable(handle, target) {
            let dragging = false, offset = {x:0, y:0};
            handle.onmousedown = (e) => {
                dragging = true;
                offset.x = e.clientX - target.offsetLeft;
                offset.y = e.clientY - target.offsetTop;
                target.style.zIndex = 10000;
                e.stopPropagation();
            };
            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                target.style.left = (e.clientX - offset.x) + 'px';
                target.style.top = (e.clientY - offset.y) + 'px';
            });
            window.addEventListener('mouseup', () => dragging = false);
        },

        createStatsBar(parent, stats) {
            const bar = document.createElement('div');
            bar.style.cssText = `width: 100%; display: flex; justify-content: space-between; background: rgba(0,0,0,0.03); padding: 8px 15px; border-radius: 12px;`;
            stats.forEach(s => {
                const container = document.createElement('div');
                container.style.cssText = `display:flex; flex-direction:column; align-items:${s.align || 'flex-start'};`;
                container.innerHTML = `<span style="font-size:0.5rem; color:#718096; font-weight:bold;">${s.label}</span>
                                       <span id="${s.id}" style="font-weight:900; color:#475569;">${s.value}</span>`;
                bar.appendChild(container);
            });
            parent.appendChild(bar);
        }
    },

    // ==========================================
    // UTILIDADES DE SISTEMA (Análisis y Caos)
    // ==========================================
    analizarEscritorio() {
        const items = FileSystem.data;
        const conteo = {
            carpetas: items.filter(i => i.type === 'folder').length,
            libros: items.filter(i => i.type === 'book').length,
            programas: items.filter(i => i.type === 'program').length
        };
        Koreh.confirm("SISTEMA DE VISIÓN", `Detección: ${conteo.carpetas} Carpetas, ${conteo.libros} Libros, ${conteo.programas} Programas.`);
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
        }
    }
};

// Autoejecución del registro de nodos
setTimeout(() => MisFunciones.registrarNodoExtra(), 500);