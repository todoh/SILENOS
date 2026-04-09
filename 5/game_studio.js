// live gemini/game_studio.js
// ─── GAME STUDIO (MOTOR 2D SIDE-SCROLLER CON SOPORTE SVG Y VOZ) ──────────────────

window.gameStudioUI = {
    _dragBound: false,
    canvas: null,
    ctx: null,
    animationId: null,
    lastTime: 0,
    keys: {},
    svgCache: {},
    camera: { x: 0, y: 0 },

    // Arquitectura Expandida: Mundos grandes, cielo, parallax, enemigos, interactuables e inventario
    levelData: {
        settings: { gravity: 900, skyColor: '#87CEEB', bgColor: '#111111', worldWidth: 3000, worldHeight: 1200 },
        player: { id: 'player', x: 50, y: 200, w: 40, h: 40, vx: 0, vy: 0, speed: 250, jumpForce: -500, color: '#00f0ff', svg: '', inventory: [] },
        backgrounds: [
            { id: 'bg_nubes', x: 0, y: 50, w: 800, h: 200, color: '#ffffff', svg: '', parallax: 0.8 },
            { id: 'bg_montanas', x: 0, y: 150, w: 1200, h: 300, color: '#4a5a6a', svg: '', parallax: 0.5 }
        ],
        platforms: [
            { id: 'floor_main', x: 0, y: 400, w: 3000, h: 800, color: '#2d8a3c', svg: '' }, // Suelo masivo
            { id: 'plat_1', x: 300, y: 300, w: 150, h: 20, color: '#555555', svg: '' },
            { id: 'plat_2', x: 600, y: 200, w: 150, h: 20, color: '#555555', svg: '' }
        ],
        enemies: [
            { id: 'enemy_1', x: 450, y: 360, w: 40, h: 40, vx: 100, vy: 0, speed: 100, patrolMin: 350, patrolMax: 550, color: '#ff0044', svg: '', isAlive: true }
        ],
        interactables: [
            { id: 'key_1', x: 650, y: 160, w: 30, h: 30, type: 'item', name: 'Llave Dorada', color: '#ffd700', svg: '', collected: false }
        ]
    },

    open() {
        const modal = document.getElementById('gameStudioModal');
        if (modal) {
            modal.classList.remove('hidden');
            if (typeof makeDraggable === 'function' && !this._dragBound) {
                makeDraggable(modal, document.getElementById('gsModalHeader'));
                this._dragBound = true;
            }
        }
        this.abriendo_la_funcion_del_canvas();
        
        const editor = document.getElementById('gsEditor');
        if (editor && !editor.value) {
            this.syncEditor();
        }
    },

    close() {
        const modal = document.getElementById('gameStudioModal');
        if (modal) modal.classList.add('hidden');
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    },

    abriendo_la_funcion_del_canvas() {
        this.canvas = document.getElementById('gsCanvas');
        if (!this.canvas) return; 
        
        this.ctx = this.canvas.getContext('2d');
        
        document.onkeydown = e => this.keys[e.code] = true;
        document.onkeyup = e => this.keys[e.code] = false;

        this.cacheAllSVGs();

        this.lastTime = performance.now();
        if (!this.animationId) {
            this.gameLoop(this.lastTime);
        }
    },

    async cacheAllSVGs() {
        this.svgCache = {};
        if (!this.levelData) return;
        if (this.levelData.player) await this.cacheSingleSVG(this.levelData.player.id, this.levelData.player.svg);
        
        const lists = ['platforms', 'backgrounds', 'enemies', 'interactables'];
        for (let listName of lists) {
            if (this.levelData[listName]) {
                for (let item of this.levelData[listName]) {
                    await this.cacheSingleSVG(item.id, item.svg);
                }
            }
        }
    },

    async cacheSingleSVG(id, svgString) {
        if (!svgString || typeof svgString !== 'string' || !svgString.trim().startsWith('<svg')) {
            delete this.svgCache[id];
            return;
        }
        
        let safeSvg = svgString.trim();
        if (!safeSvg.includes('xmlns=')) {
            safeSvg = safeSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!/width=["'][^"']+["']/.test(safeSvg)) {
            safeSvg = safeSvg.replace('<svg', '<svg width="100%"');
        }
        if (!/height=["'][^"']+["']/.test(safeSvg)) {
            safeSvg = safeSvg.replace('<svg', '<svg height="100%"');
        }

        return new Promise((resolve) => {
            const img = new Image();
            const svg64 = btoa(unescape(encodeURIComponent(safeSvg)));
            const b64Start = 'data:image/svg+xml;base64,';
            const image64 = b64Start + svg64;

            img.onload = () => {
                this.svgCache[id] = img;
                resolve();
            };
            img.onerror = (e) => {
                console.warn(`No se pudo renderizar el SVG para la entidad '${id}' en el Canvas. Revisa la sintaxis.`, e);
                resolve();
            };
            img.src = image64;
        });
    },

    applyCode() {
        const editor = document.getElementById('gsEditor');
        if (!editor) return;
        try {
            this.levelData = JSON.parse(editor.value);
            this.cacheAllSVGs();
            if (typeof showToast === 'function') showToast('Nivel y físicas recargados ✓', 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast('Error de sintaxis en el JSON del nivel', 'error');
        }
    },

    syncEditor() {
        const editor = document.getElementById('gsEditor');
        if (editor) {
            editor.value = JSON.stringify(this.levelData, null, 2);
        }
    },

    async updateSVG(entityId, svgCode) {
        if (!this.levelData) return false;
        
        let target = null;
        if (this.levelData.player && (entityId === 'player' || this.levelData.player.id === entityId)) {
            target = this.levelData.player;
        } else {
            const lists = ['platforms', 'backgrounds', 'enemies', 'interactables'];
            for (let listName of lists) {
                if (this.levelData[listName]) {
                    target = this.levelData[listName].find(item => item.id === entityId);
                    if (target) break;
                }
            }
        }

        if (target) {
            target.svg = svgCode;
            await this.cacheSingleSVG(target.id, svgCode);
            this.syncEditor();
            if (typeof showToast === 'function') showToast(`Arte SVG inyectado en '${target.id}' ✓`, 'success');
            return true;
        }
        return false;
    },

    addPlatform(platData) {
        if (!this.levelData.platforms) this.levelData.platforms = [];
        this.levelData.platforms.push(platData);
        if (platData.svg) this.cacheSingleSVG(platData.id, platData.svg);
        this.syncEditor();
        if (typeof showToast === 'function') showToast(`Plataforma '${platData.id}' añadida ✓`, 'success');
    },

    updateSettings(settings) {
        if (!this.levelData.settings) this.levelData.settings = {};
        Object.assign(this.levelData.settings, settings);
        this.syncEditor();
        if (typeof showToast === 'function') showToast('Ajustes del entorno actualizados ✓', 'success');
    },

    voiceCommand(command) {
        if (!this.levelData || !this.levelData.player) return;
        const p = this.levelData.player;
        if (command === 'right') p.vx = p.speed;
        else if (command === 'left') p.vx = -p.speed;
        else if (command === 'stop') p.vx = 0;
        else if (command === 'jump' && p.isGrounded) p.vy = p.jumpForce;
    },

    gameLoop(time) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;
        
        if (dt < 0.1) {
            this.update(dt);
            this.draw();
        }
        
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    },

    update(dt) {
        if (!this.levelData || !this.levelData.player) return;
        
        const p = this.levelData.player;
        const gravity = this.levelData.settings?.gravity ?? 900;
        const worldWidth = this.levelData.settings?.worldWidth ?? 3000;

        if (this.keys['ArrowRight'] || this.keys['KeyD']) p.vx = p.speed;
        else if (this.keys['ArrowLeft'] || this.keys['KeyA']) p.vx = -p.speed;
        else if (p.vx > 0) p.vx = Math.max(0, p.vx - 800 * dt);
        else if (p.vx < 0) p.vx = Math.min(0, p.vx + 800 * dt);

        if ((this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']) && p.isGrounded) {
            p.vy = p.jumpForce;
            p.isGrounded = false;
        }

        p.vy += gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Limitar jugador al mundo
        if (p.x < 0) { p.x = 0; p.vx = 0; }
        if (p.x + p.w > worldWidth) { p.x = worldWidth - p.w; p.vx = 0; }

        p.isGrounded = false;
        if (this.levelData.platforms) {
            for (let plat of this.levelData.platforms) {
                if (p.x < plat.x + plat.w && p.x + p.w > plat.x &&
                    p.y + p.h > plat.y && p.y + p.h - p.vy * dt <= plat.y) {
                    p.y = plat.y - p.h;
                    p.vy = 0;
                    p.isGrounded = true;
                }
            }
        }

        // Físicas y lógica de los enemigos (Patrulla horizontal y colisiones letales)
        if (this.levelData.enemies) {
            for (let e of this.levelData.enemies) {
                if (!e.isAlive) continue;
                
                e.x += e.vx * dt;
                if (e.x < e.patrolMin) { e.x = e.patrolMin; e.vx = Math.abs(e.speed); }
                if (e.x + e.w > e.patrolMax) { e.x = e.patrolMax - e.w; e.vx = -Math.abs(e.speed); }
                
                // Colisión Jugador vs Enemigo
                if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
                    p.x = 50; 
                    p.y = 100; 
                    p.vx = 0; 
                    p.vy = 0;
                    if (typeof showToast === 'function') showToast('¡Has muerto!', 'error');
                }
            }
        }

        // Lógica de Objetos Interaccionables
        if (this.levelData.interactables) {
            for (let item of this.levelData.interactables) {
                if (item.collected) continue;
                
                // Colisión Jugador vs Objeto
                if (p.x < item.x + item.w && p.x + p.w > item.x && p.y < item.y + item.h && p.y + p.h > item.y) {
                    if (item.type === 'item') {
                        item.collected = true;
                        if (!p.inventory) p.inventory = [];
                        p.inventory.push(item.name);
                        if (typeof showToast === 'function') showToast(`Recogido: ${item.name}`, 'success');
                        this.syncEditor(); // Actualizamos el JSON con el objeto recogido
                    }
                }
            }
        }

        if (this.canvas) {
            // Reiniciar si cae al abismo
            if (p.y > (this.levelData.settings?.worldHeight || 1500)) {
                p.x = 50;
                p.y = 100;
                p.vy = 0;
                p.vx = 0;
            }

            // Actualizar la posición de la cámara dinámica (Scroll Lateral fluido)
            this.camera.x = p.x - (this.canvas.width / 2) + (p.w / 2);
            if (this.camera.x < 0) this.camera.x = 0; 
            if (this.camera.x > worldWidth - this.canvas.width) this.camera.x = Math.max(0, worldWidth - this.canvas.width);
        }
    },

    draw() {
        if (!this.ctx || !this.canvas || !this.levelData) return;
        
        // 1. Dibujar Cielo
        this.ctx.fillStyle = this.levelData.settings?.skyColor || '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(-this.camera.x, 0); // Desplazamiento global de la cámara

        // 2. Dibujar Fondos (Parallax)
        if (this.levelData.backgrounds) {
            for (let bg of this.levelData.backgrounds) {
                // Cálculo de la posición paralaje (0.0=fijo al mundo, 1.0=fijo a la cámara)
                let renderX = bg.x + this.camera.x * (bg.parallax || 0);
                if (this.svgCache[bg.id]) {
                    this.ctx.drawImage(this.svgCache[bg.id], renderX, bg.y, bg.w, bg.h);
                } else {
                    this.ctx.fillStyle = bg.color || '#444444';
                    this.ctx.fillRect(renderX, bg.y, bg.w, bg.h);
                }
            }
        }

        // 3. Dibujar Objetos Interactuables
        if (this.levelData.interactables) {
            for (let item of this.levelData.interactables) {
                if (item.collected) continue;
                if (this.svgCache[item.id]) {
                    this.ctx.drawImage(this.svgCache[item.id], item.x, item.y, item.w, item.h);
                } else {
                    this.ctx.fillStyle = item.color || '#ffd700';
                    this.ctx.fillRect(item.x, item.y, item.w, item.h);
                }
            }
        }

        // 4. Dibujar Plataformas y Suelos
        if (this.levelData.platforms) {
            for (let plat of this.levelData.platforms) {
                if (this.svgCache[plat.id]) {
                    this.ctx.drawImage(this.svgCache[plat.id], plat.x, plat.y, plat.w, plat.h);
                } else {
                    this.ctx.fillStyle = plat.color || '#333333';
                    this.ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                }
            }
        }

        // 5. Dibujar Enemigos
        if (this.levelData.enemies) {
            for (let e of this.levelData.enemies) {
                if (!e.isAlive) continue;
                if (this.svgCache[e.id]) {
                    this.ctx.drawImage(this.svgCache[e.id], e.x, e.y, e.w, e.h);
                } else {
                    this.ctx.fillStyle = e.color || '#ff0000';
                    this.ctx.fillRect(e.x, e.y, e.w, e.h);
                }
            }
        }

        // 6. Dibujar Jugador
        if (this.levelData.player) {
            const p = this.levelData.player;
            if (this.svgCache[p.id]) {
                this.ctx.drawImage(this.svgCache[p.id], p.x, p.y, p.w, p.h);
            } else {
                this.ctx.fillStyle = p.color || '#00f0ff';
                this.ctx.fillRect(p.x, p.y, p.w, p.h);
            }
        }

        this.ctx.restore();

        // 7. Dibujar Interfaz de Usuario / HUD (Fijo a la cámara)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.fillRect(10, 10, 350, 40);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px monospace';
        const inventarioText = (this.levelData.player?.inventory && this.levelData.player.inventory.length > 0) 
            ? this.levelData.player.inventory.join(', ') 
            : 'Vacío';
        this.ctx.fillText(`Inventario: ${inventarioText}`, 20, 35);
    }
};

// Herramienta nativa para ser invocada por VOZ SILENOS
async function handleGameStudioTool(args) {
    const { action, level_code, command, entity_id, svg_code, platform_data, settings_data } = args;
    
    try {
        if (action === 'open') {
            if (typeof gameStudioUI !== 'undefined') gameStudioUI.open();
            return "Interfaz de Game Studio abierta al usuario en pantalla.";
        } 
        else if (action === 'close') {
            if (typeof gameStudioUI !== 'undefined') gameStudioUI.close();
            return "Interfaz de Game Studio cerrada.";
        } 
        else if (action === 'build_level') {
            if (!level_code) return "Error: Se requiere 'level_code' (JSON estructurado).";
            if (typeof gameStudioUI !== 'undefined') {
                gameStudioUI.open();
                const editor = document.getElementById('gsEditor');
                if (editor) {
                    editor.value = level_code;
                    gameStudioUI.applyCode();
                }
                return "Nivel inyectado masivamente. Usar inyecciones parciales de SVG a partir de ahora.";
            }
        }
        else if (action === 'voice_command') {
            if (!command) return "Error: Se requiere el comando ('left', 'right', 'jump', 'stop').";
            if (typeof gameStudioUI !== 'undefined') {
                gameStudioUI.voiceCommand(command);
                return `Comando de voz ejecutado en las físicas: ${command}.`;
            }
        }
        else if (action === 'update_svg') {
            if (!entity_id || !svg_code) return "Error: Faltan 'entity_id' o 'svg_code'.";
            if (typeof gameStudioUI !== 'undefined') {
                gameStudioUI.open(); 
                const success = await gameStudioUI.updateSVG(entity_id, svg_code);
                if (success) return `Gráfico SVG inyectado en vivo a la entidad '${entity_id}'.`;
                return `Error: La entidad '${entity_id}' no existe en el motor.`;
            }
        }
        else if (action === 'add_platform') {
            if (!platform_data) return "Error: Falta 'platform_data' (String JSON).";
            if (typeof gameStudioUI !== 'undefined') {
                gameStudioUI.open();
                gameStudioUI.addPlatform(JSON.parse(platform_data));
                return "Nueva plataforma renderizada en vivo.";
            }
        }
        else if (action === 'update_settings') {
            if (!settings_data) return "Error: Falta 'settings_data' (String JSON).";
            if (typeof gameStudioUI !== 'undefined') {
                gameStudioUI.open();
                gameStudioUI.updateSettings(JSON.parse(settings_data));
                return "Ajustes globales de físicas/entorno actualizados.";
            }
        }
        
        return `Acción '${action}' no reconocida en el Game Studio.`;
    } catch (e) {
        return `Fallo crítico en Game Studio: ${e.message}`;
    }
}