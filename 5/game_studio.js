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
    camera: { x: 0, y: 0 }, // Nueva variable para controlar el scroll lateral

    // Nueva Arquitectura: Orientada a Entidades con ID
    levelData: {
        settings: { gravity: 900, bgColor: '#111111' },
        player: { id: 'player', x: 50, y: 200, w: 40, h: 40, vx: 0, vy: 0, speed: 200, jumpForce: -450, color: '#00f0ff', svg: '' },
        platforms: [
            { id: 'floor_1', x: 0, y: 400, w: 800, h: 50, color: '#333333', svg: '' },
            { id: 'plat_1', x: 300, y: 300, w: 150, h: 20, color: '#555555', svg: '' }
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
        if (!this.canvas) return; // Evitar fallos si no existe en el DOM
        
        this.ctx = this.canvas.getContext('2d');
        
        // Limpiar listeners anteriores para no duplicar eventos
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
        if (this.levelData.platforms) {
            for (let plat of this.levelData.platforms) {
                await this.cacheSingleSVG(plat.id, plat.svg);
            }
        }
    },

    async cacheSingleSVG(id, svgString) {
        if (!svgString || typeof svgString !== 'string' || !svgString.trim().startsWith('<svg')) {
            delete this.svgCache[id];
            return;
        }
        
        // SANITIZACIÓN ESTRICTA
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
            // Codificación robusta en Base64 para evitar bloqueos del Canvas
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
        } else if (this.levelData.platforms) {
            target = this.levelData.platforms.find(p => p.id === entityId);
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

        if (this.canvas) {
            // Eliminar tope derecho para permitir exploración de mapas extensos
            if (p.x < 0) { p.x = 0; p.vx = 0; }
            // Si cae mucho, reiniciar
            if (p.y > this.canvas.height + 1000) {
                p.x = 50;
                p.y = 50;
                p.vy = 0;
                p.vx = 0;
            }

            // Actualizar la posición de la cámara (Scroll Lateral)
            this.camera.x = p.x - (this.canvas.width / 2) + (p.w / 2);
            if (this.camera.x < 0) this.camera.x = 0; // Bloquear cámara para que no vea la izquierda del inicio
        }
    },

    draw() {
        if (!this.ctx || !this.canvas || !this.levelData) return;
        
        // Dibujar el fondo estático (no afectado por la cámara)
        this.ctx.fillStyle = this.levelData.settings?.bgColor || '#111111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        // Aplicar transformación para el Scroll Lateral
        this.ctx.translate(-this.camera.x, 0);

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
                return "Nivel base inyectado masivamente. Usar inyecciones parciales a partir de ahora.";
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
                gameStudioUI.open(); // Asegurar que el modal esté abierto para que haya canvas y loop
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