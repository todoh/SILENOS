/* SILENOS - KOREH BUNDLE (UNIFICADO) 
   Fecha: 30/12/2025, 3:43:58
   Archivos fusionados: 10
*/

window.Koreh = window.Koreh || {};

// ==========================================
// ORIGEN: koreh-funcionaciones.js
// ==========================================
/* SILENOS - KOREH FUNCIONACIONES (Librería de Utilidades Compartidas) 
   Versión: 3.5 - Integración de Materia y Granularidad (G-F-H)
   Refactor: Unificación en window.Koreh
*/

// Inicialización segura del núcleo
window.Koreh = window.Koreh || {};

Object.assign(window.Koreh, {
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
});

// ==========================================
// ORIGEN: koreh-funcionaciones2.js
// ==========================================
/* SILENOS - MIS FUNCIONES (Extensión de Materia M) 
   Versión: 2.5 - Game Development Suite (J)
   Refactor: Integración en window.Koreh.MisFunciones
*/

window.Koreh = window.Koreh || {};

window.Koreh.MisFunciones = {
    
    // ==========================================
    // SECCIÓN B, D, F: UTILIDADES DE INTERFAZ
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
        
        // Uso de Koreh (Base)
        if (window.Koreh && window.Koreh.confirm) {
            window.Koreh.confirm("SISTEMA DE VISIÓN", 
            `Se han detectado:\n- ${conteo.carpetas} Carpetas (D)\n- ${conteo.libros} Libros (M)\n- ${conteo.programas} Programas (T)`);
        }
        
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
    if (window.Koreh.MisFunciones) window.Koreh.MisFunciones.registrarNodoExtra();
}, 500);

// ==========================================
// ORIGEN: koreh-funcionaciones3.js
// ==========================================
/* SILENOS - KOREH FUNCIONACIONES 3 (Resonancia y Granularidad Avanzada) 
   Versión: 3.0 - Intelligence & Media Suite (Z-R-G)
   Refactor: Integración en window.Koreh.V3
*/

window.Koreh = window.Koreh || {};

window.Koreh.V3 = {

    // ==========================================
    // SECCIÓN R: RESONANCIA (AUDIO Y FEEDBACK)
    // ==========================================
    
    Audio: {
        playPulse(freq = 440, type = 'sine', duration = 0.1) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + duration);
        },

        playSuccess() { this.playPulse(880, 'sine', 0.2); },
        playError() { this.playPulse(110, 'sawtooth', 0.3); }
    },

    // ==========================================
    // SECCIÓN G: GRANULARIDAD (MANIPULACIÓN DE DATOS)
    // ==========================================

    Data: {
        tokenize(text) {
            return text.toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .split(/\s+/)
                .filter(word => word.length > 3);
        },

        getEsencia(text, limit = 5) {
            const tokens = this.tokenize(text);
            const freq = {};
            tokens.forEach(t => freq[t] = (freq[t] || 0) + 1);
            return Object.entries(freq)
                .sort((a, b) => b[1] - a[1])
                .slice(0, limit)
                .map(e => e[0]);
        }
    },

    // ==========================================
    // SECCIÓN F-A: FORMA Y ACCIÓN (UI AVANZADA)
    // ==========================================

    UI: {
        showToast(message, type = 'info') {
            const container = document.getElementById('process-list') || document.body;
            const toast = document.createElement('div');
            
            const colors = {
                info: '#3b82f6',
                success: '#10b981',
                error: '#ef4444',
                ai: '#7c3aed'
            };

            toast.className = "pop-in pointer-events-auto";
            toast.style.cssText = `
                min-width: 200px; padding: 12px 20px; margin-bottom: 10px;
                background: #e0e5ec; border-radius: 15px;
                box-shadow: 6px 6px 12px #b8b9be, -6px -6px 12px #ffffff;
                border-left: 5px solid ${colors[type]};
                display: flex; align-items: center; gap: 12px;
                font-family: sans-serif; font-size: 0.75rem; font-weight: 800;
                color: #475569; z-index: 10000;
            `;

            toast.innerHTML = `<span>${message}</span>`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(20px)';
                toast.style.transition = 'all 0.5s ease';
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        },

        createResonanceCanvas(parentId) {
            const container = document.getElementById(parentId);
            if (!container) return;

            const canvas = document.createElement('canvas');
            canvas.style.cssText = "width:100%; height:100%; border-radius:inherit;";
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');
            
            let particles = [];
            const resize = () => {
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            const animate = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (particles.length < 50) {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        r: Math.random() * 2 + 1,
                        o: Math.random(),
                        s: Math.random() * 0.02
                    });
                }

                particles.forEach((p, i) => {
                    p.o -= p.s;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(124, 58, 237, ${p.o})`;
                    ctx.fill();
                    if (p.o <= 0) particles.splice(i, 1);
                });
                requestAnimationFrame(animate);
            };
            animate();
        }
    },

    // ==========================================
    // SECCIÓN Z: CONOCIMIENTO (UTILIDADES IA)
    // ==========================================

    AI: {
        sanitizeAIResponse(text) {
            return text.replace(/```json/g, '')
                       .replace(/```javascript/g, '')
                       .replace(/```/g, '')
                       .trim();
        },

        formatForBook(text) {
            return text.split('\n\n')
                       .filter(p => p.trim().length > 0)
                       .map(p => p.trim());
        }
    },

    registrarNodos3() {
        if (typeof NODE_REGISTRY !== 'undefined') {
            NODE_REGISTRY["sys-toast"] = {
                title: "🔔 NOTIFICAR",
                color: "#3b82f6",
                fields: [
                    { name: "tipo", type: "select", options: ["info", "success", "error", "ai"] }
                ],
                execute: async (ctx) => {
                    this.UI.showToast(ctx.input || "Señal recibida", ctx.fields.tipo);
                    return ctx.input;
                }
            };

            NODE_REGISTRY["data-essence"] = {
                title: "💎 ESENCIA (Z)",
                color: "#7c3aed",
                fields: [{ name: "limite", type: "number", value: 5 }],
                execute: async (ctx) => {
                    const esencia = this.Data.getEsencia(String(ctx.input), ctx.fields.limite);
                    ctx.log("Esencia extraída: " + esencia.join(", "));
                    return esencia;
                }
            };
            
            console.log("H -> Funcionaciones 3 (Z-R-G) integradas en la Coherencia.");
        }
    }
};

setTimeout(() => {
    if (window.Koreh.V3) window.Koreh.V3.registrarNodos3();
}, 600);

// ==========================================
// ORIGEN: koreh-funcionaciones4.js
// ==========================================
/* SILENOS - KOREH AUDIO ENGINE (Koreh4)
   Versión: 4.6 - Integración K, R, L, G
   Refactor: Integración en window.Koreh.Audio
*/

window.Koreh = window.Koreh || {};

window.Koreh.Audio = {
    ctx: null,
    isInitialized: false,
    bufferStorage: {}, 
    nodes: {},

    // ==========================================
    // SECCIÓN 1. N: NÚMERO (Sincronización)
    // ==========================================
    N: {
        bpm: 120,
        ppq: 96,
        isPlaying: false,
        startTime: 0,
        lastTickTime: 0,
        currentTick: 0,

        initializeAudioContext() {
            if (window.Koreh.Audio.isInitialized) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            window.Koreh.Audio.ctx = new AudioContext();
            window.Koreh.Audio.isInitialized = true;
            window.Koreh.Audio.K.createMainBus();
            console.log("N -> Motor de Tiempo y Coherencia inicializado.");
        },

        startMasterClock(onTickCallback) {
            const AudioEngine = window.Koreh.Audio;
            if (!AudioEngine.isInitialized) this.initializeAudioContext();
            if (this.isPlaying) return;
            this.isPlaying = true;
            this.startTime = AudioEngine.ctx.currentTime;
            this.lastTickTime = AudioEngine.ctx.currentTime;

            const runClock = () => {
                if (!this.isPlaying) return;
                const secondsPerTick = 60 / this.bpm / this.ppq;
                let nextTickTime = this.lastTickTime + secondsPerTick;
                while (nextTickTime < AudioEngine.ctx.currentTime + 0.1) {
                    if (nextTickTime > this.lastTickTime) {
                        this.currentTick++;
                        onTickCallback(this.currentTick, nextTickTime);
                        this.lastTickTime = nextTickTime;
                    }
                    nextTickTime += secondsPerTick;
                }
                requestAnimationFrame(runClock);
            };
            runClock();
        },

        stopMasterClock() {
            this.isPlaying = false;
            this.currentTick = 0;
            this.lastTickTime = 0;
        },

        getNoteDurations(bpm = this.bpm) {
            const beat = 60 / bpm;
            return {
                quarter: beat,
                eighth: beat / 2,
                sixteenth: beat / 4,
                ms: beat * 1000,
                samples: beat * (window.Koreh.Audio.ctx ? window.Koreh.Audio.ctx.sampleRate : 44100)
            };
        }
    },

    // ==========================================
    // SECCIÓN 2. M: MATERIAL (Buffers)
    // ==========================================
    M: {
        async loadSampleToMemory(name, url) {
            const AudioEngine = window.Koreh.Audio;
            if (!AudioEngine.isInitialized) AudioEngine.N.initializeAudioContext();
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await AudioEngine.ctx.decodeAudioData(arrayBuffer);
                AudioEngine.bufferStorage[name] = audioBuffer;
                return audioBuffer;
            } catch (error) {
                console.error(`M -> Error cargando materia: ${name}`, error);
            }
        },

        extractBufferRegion(sourceBuffer, startSec, endSec) {
            const rate = sourceBuffer.sampleRate;
            const startFrame = Math.floor(startSec * rate);
            const endFrame = Math.floor(endSec * rate);
            const durationFrames = endFrame - startFrame;
            const newBuffer = window.Koreh.Audio.ctx.createBuffer(sourceBuffer.numberOfChannels, durationFrames, rate);
            for (let ch = 0; ch < sourceBuffer.numberOfChannels; ch++) {
                const data = sourceBuffer.getChannelData(ch).subarray(startFrame, endFrame);
                newBuffer.copyToChannel(data, ch);
            }
            return newBuffer;
        }
    },

    // ==========================================
    // SECCIÓN 3. K: KI O CAMINO (Ruteo y Flujo)
    // ==========================================
    K: {
        mainBus: null,

        createMainBus() {
            const AudioEngine = window.Koreh.Audio;
            this.mainBus = AudioEngine.ctx.createGain();
            const safetyLimiter = AudioEngine.L.createLimiter();
            this.mainBus.connect(safetyLimiter);
            safetyLimiter.connect(AudioEngine.ctx.destination);
        },

        connectNodes(source, destination) {
            if (source && destination) {
                source.connect(destination);
                return true;
            }
            return false;
        },

        createSend(sourceNode, gainAmount = 0.5) {
            const sendGain = window.Koreh.Audio.ctx.createGain();
            sendGain.gain.value = gainAmount;
            sourceNode.connect(sendGain);
            return sendGain;
        },

        createDownmixer() {
            return window.Koreh.Audio.ctx.createChannelMerger(2);
        }
    },

    // ==========================================
    // SECCIÓN 4. R: RESONANCIA (DSP / Efectos)
    // ==========================================
    R: {
        createFilter(type = 'lowpass', frequency = 1000, q = 1) {
            const filter = window.Koreh.Audio.ctx.createBiquadFilter();
            filter.type = type;
            filter.frequency.setValueAtTime(frequency, window.Koreh.Audio.ctx.currentTime);
            filter.Q.setValueAtTime(q, window.Koreh.Audio.ctx.currentTime);
            return filter;
        },

        createSaturation(amount = 50) {
            const waveShaper = window.Koreh.Audio.ctx.createWaveShaper();
            const n_samples = 44100;
            const curve = new Float32Array(n_samples);
            const deg = Math.PI / 180;
            for (let i = 0; i < n_samples; ++i) {
                let x = (i * 2) / n_samples - 1;
                curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
            }
            waveShaper.curve = curve;
            waveShaper.oversample = '4x';
            return waveShaper;
        },

        createDelay(time = 0.3, feedback = 0.4) {
            const ctx = window.Koreh.Audio.ctx;
            const delay = ctx.createDelay();
            const fbGain = ctx.createGain();
            
            delay.delayTime.value = time;
            fbGain.gain.value = feedback;

            delay.connect(fbGain);
            fbGain.connect(delay); 
            
            return { input: delay, output: delay, feedback: fbGain };
        }
    },

    // ==========================================
    // SECCIÓN 5. L: LÍMITE (Dinámica)
    // ==========================================
    L: {
        createLimiter() {
            const ctx = window.Koreh.Audio.ctx;
            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.setValueAtTime(-0.5, ctx.currentTime);
            limiter.knee.setValueAtTime(0, ctx.currentTime);
            limiter.ratio.setValueAtTime(20, ctx.currentTime);
            limiter.attack.setValueAtTime(0.001, ctx.currentTime);
            limiter.release.setValueAtTime(0.1, ctx.currentTime);
            return limiter;
        },

        createCompressor(threshold = -24, ratio = 4) {
            const comp = window.Koreh.Audio.ctx.createDynamicsCompressor();
            comp.threshold.setValueAtTime(threshold, window.Koreh.Audio.ctx.currentTime);
            comp.ratio.setValueAtTime(ratio, window.Koreh.Audio.ctx.currentTime);
            return comp;
        },

        createSoftClipper() {
            return this.createSaturation(10);
        }
    },

    // ==========================================
    // SECCIÓN 6. G: GRANULARIDAD (Micro-Edición)
    // ==========================================
    G: {
        findNearestZeroCrossing(buffer, frame) {
            const data = buffer.getChannelData(0);
            let i = frame;
            while (i < data.length - 1 && Math.sign(data[i]) === Math.sign(data[i+1])) {
                i++;
            }
            return i;
        },

        applyFades(gainNode, duration, type = 'in') {
            const now = window.Koreh.Audio.ctx.currentTime;
            if (type === 'in') {
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(1, now + duration);
            } else {
                gainNode.gain.setValueAtTime(1, now);
                gainNode.gain.linearRampToValueAtTime(0, now + duration);
            }
        },

        createStutter(bufferName, rateInTicks = 12) {
            const AudioEngine = window.Koreh.Audio;
            const duration = (60 / AudioEngine.N.bpm / (AudioEngine.N.ppq / rateInTicks));
            const playGrain = () => {
                if (!AudioEngine.N.isPlaying) return;
                const source = AudioEngine.ctx.createBufferSource();
                source.buffer = AudioEngine.bufferStorage[bufferName];
                source.connect(AudioEngine.K.mainBus);
                source.start(0, 0, duration * 0.8);
            };
            return playGrain;
        }
    },

    // ==========================================
    // SECCIÓN B: VISIÓN (Puente de Canvas)
    // ==========================================
    Visual: {
        initializeCanvasBridge(canvasElementId, drawFunction) {
            const canvas = document.getElementById(canvasElementId);
            if (!canvas) return;
            const ctx2d = canvas.getContext('2d');
            const AudioEngine = window.Koreh.Audio;

            const renderLoop = () => {
                ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                
                drawFunction(ctx2d, {
                    currentTick: AudioEngine.N.currentTick,
                    currentTime: AudioEngine.ctx ? AudioEngine.ctx.currentTime : 0,
                    isPlaying: AudioEngine.N.isPlaying,
                    bpm: AudioEngine.N.bpm
                });

                requestAnimationFrame(renderLoop);
            };
            renderLoop();
        }
    }
};

console.log("Koreh-Audio: Secciones N, M, K, R, L y G integradas en window.Koreh.Audio.");

// ==========================================
// ORIGEN: koreh-funcionaciones5.js
// ==========================================
/* SILENOS - KOREH AUDIO ENGINE (Koreh5)
   Versión: 5.0 - Integración F (Forma), Y (Confluencia) y T (Tramo)
   Refactor: Integración en window.Koreh.Audio
*/

window.Koreh = window.Koreh || {};

// Importante: Si Koreh.Audio ya existe (por archivo 4), extendemos, sino creamos.
window.Koreh.Audio = window.Koreh.Audio || {
    ctx: null, isInitialized: false, bufferStorage: {}, nodes: {}
};

// Usamos Object.assign para extender sin borrar propiedades previas si existen
Object.assign(window.Koreh.Audio, {
    
    // ==========================================
    // SECCIÓN 1 - 6 (Re-declaraciones core)
    // ==========================================
    N: {
        bpm: 120, ppq: 96, isPlaying: false, currentTick: 0,
        initializeAudioContext() {
            if (window.Koreh.Audio.isInitialized) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            window.Koreh.Audio.ctx = new AudioContext();
            window.Koreh.Audio.isInitialized = true;
            window.Koreh.Audio.K.createMainBus();
        },
        startMasterClock(onTickCallback) {
            if (!window.Koreh.Audio.isInitialized) this.initializeAudioContext();
            this.isPlaying = true;
            const runClock = () => {
                if (!this.isPlaying) return;
                const secondsPerTick = 60 / this.bpm / this.ppq;
                onTickCallback(this.currentTick++, window.Koreh.Audio.ctx.currentTime);
                setTimeout(runClock, secondsPerTick * 1000);
            };
            runClock();
        }
    },

    K: {
        mainBus: null,
        createMainBus() {
            this.mainBus = window.Koreh.Audio.ctx.createGain();
            const limiter = window.Koreh.Audio.L.createLimiter();
            this.mainBus.connect(limiter);
            limiter.connect(window.Koreh.Audio.ctx.destination);
        }
    },

    L: {
        createLimiter() {
            const comp = window.Koreh.Audio.ctx.createDynamicsCompressor();
            comp.threshold.value = -0.5; comp.ratio.value = 20;
            return comp;
        }
    },

    // ==========================================
    // SECCIÓN 7. F: FORMA (Síntesis y Envolventes)
    // ==========================================
    F: {
        createOscillator(type = 'sine', frequency = 440) {
            const osc = window.Koreh.Audio.ctx.createOscillator();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, window.Koreh.Audio.ctx.currentTime);
            return osc;
        },

        applyADSR(gainNode, settings = { a: 0.1, d: 0.2, s: 0.5, r: 0.4 }) {
            const now = window.Koreh.Audio.ctx.currentTime;
            const g = gainNode.gain;
            g.cancelScheduledValues(now);
            g.setValueAtTime(0, now);
            g.linearRampToValueAtTime(1, now + settings.a);
            g.linearRampToValueAtTime(settings.s, now + settings.a + settings.d);
            return (releaseTime) => {
                const rNow = window.Koreh.Audio.ctx.currentTime;
                g.cancelScheduledValues(rNow);
                g.setValueAtTime(g.value, rNow);
                g.linearRampToValueAtTime(0, rNow + settings.r);
            };
        },

        createSubOsc(frequency) {
            return this.createOscillator('square', frequency / 2);
        },

        createWavetable(real, imag) {
            return window.Koreh.Audio.ctx.createPeriodicWave(new Float32Array(real), new Float32Array(imag));
        }
    },

    // ==========================================
    // SECCIÓN 8. Y: CONFLUENCIA (Mezcla y Sidechain)
    // ==========================================
    Y: {
        createMixerChannel(name) {
            const input = window.Koreh.Audio.ctx.createGain();
            const panner = window.Koreh.Audio.ctx.createStereoPanner();
            const output = window.Koreh.Audio.ctx.createGain();

            input.connect(panner);
            panner.connect(output);
            output.connect(window.Koreh.Audio.K.mainBus);

            window.Koreh.Audio.nodes[name] = { input, panner, output };
            return window.Koreh.Audio.nodes[name];
        },

        setPan(channelName, value) {
            if (window.Koreh.Audio.nodes[channelName]) {
                window.Koreh.Audio.nodes[channelName].panner.pan.setTargetAtTime(value, window.Koreh.Audio.ctx.currentTime, 0.05);
            }
        },

        applySidechain(sourceNode, targetGainNode, ratio = -20) {
            const analyzer = window.Koreh.Audio.ctx.createAnalyser();
            sourceNode.connect(analyzer);
        }
    },

    // ==========================================
    // SECCIÓN 9. T: TRAMO (Gestión del Timeline)
    // ==========================================
    T: {
        playhead: 0,
        regions: [],

        seek(tick) {
            this.playhead = tick;
            window.Koreh.Audio.N.currentTick = tick;
        },

        addRegion(name, startTick, durationTicks, bufferName) {
            this.regions.push({ name, startTick, durationTicks, bufferName });
        },

        checkPlayback(currentTick) {
            this.regions.forEach(region => {
                if (currentTick === region.startTick) {
                    this.triggerRegion(region);
                }
            });
        },

        triggerRegion(region) {
            const source = window.Koreh.Audio.ctx.createBufferSource();
            source.buffer = window.Koreh.Audio.bufferStorage[region.bufferName];
            source.connect(window.Koreh.Audio.K.mainBus);
            source.start();
        }
    },

    // ==========================================
    // SECCIÓN B: VISIÓN (Puente de Canvas)
    // ==========================================
    Visual: {
        initializeCanvasBridge(canvasElementId, drawFunction) {
            const canvas = document.getElementById(canvasElementId);
            if (!canvas) return;
            const ctx2d = canvas.getContext('2d');

            const renderLoop = () => {
                ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                
                drawFunction(ctx2d, {
                    tick: window.Koreh.Audio.N.currentTick,
                    time: window.Koreh.Audio.ctx ? window.Koreh.Audio.ctx.currentTime : 0,
                    activeNodes: Object.keys(window.Koreh.Audio.nodes).length,
                    bpm: window.Koreh.Audio.N.bpm
                });

                requestAnimationFrame(renderLoop);
            };
            renderLoop();
        }
    }
});

console.log("Koreh-Audio V5: Secciones F, Y y T operativas.");

// ==========================================
// ORIGEN: koreh-funcionaciones6.js
// ==========================================
/* SILENOS - MIS FUNCIONES (Extensión de Materia M) 
   Versión: 6.0 - Universal Game & UI Engine (J)
   Refactor: Integración en window.Koreh.MisFunciones
*/

window.Koreh = window.Koreh || {};

window.Koreh.MisFunciones = {
    
    // ==========================================
    // SECCIÓN E: EQUILIBRIO (Matemáticas y Coherencia)
    // ==========================================
    Math: {
        wrap(val, max) {
            return (val % max + max) % max;
        },

        getDist(a, b, worldSize) {
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            if (worldSize) {
                if (Math.abs(dx) > worldSize / 2) dx = -Math.sign(dx) * (worldSize - Math.abs(dx));
                if (Math.abs(dy) > worldSize / 2) dy = -Math.sign(dy) * (worldSize - Math.abs(dy));
            }
            return { dx, dy, dist: Math.sqrt(dx * dx + dy * dy) };
        },

        lerp(start, end, amt) {
            return (1 - amt) * start + amt * end;
        }
    },

    // ==========================================
    // SECCIÓN A: ACCIÓN (Física y Dinámica)
    // ==========================================
    Physics: {
        updateEntities(entities, worldSize) {
            entities.forEach(e => {
                if (e.vx !== undefined) {
                    const MF = window.Koreh.MisFunciones;
                    e.x = MF.Math.wrap(e.x + e.vx, worldSize);
                    e.y = MF.Math.wrap(e.y + e.vy, worldSize);
                }
                if (e.life !== undefined) e.life--;
            });
            return entities.filter(e => e.life === undefined || e.life > 0);
        },

        checkCollision(a, b, radius, worldSize) {
            return window.Koreh.MisFunciones.Math.getDist(a, b, worldSize).dist < radius;
        }
    },

    // ==========================================
    // SECCIÓN U: UNIÓN (Renderizado y Cámara)
    // ==========================================
    Render: {
        clear(ctx, width, height, color = "#08080a") {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, width, height);
        },

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

        worldToScreen(entity, player, width, height, worldSize) {
            const camX = player.x - width / 2;
            const camY = player.y - height / 2;
            const MF = window.Koreh.MisFunciones;
            return {
                x: MF.Math.wrap(entity.x - camX, worldSize),
                y: MF.Math.wrap(entity.y - camY, worldSize)
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

            if (player.isMoving) {
                const walkCycle = Math.sin(time * 0.2) * 12;
                ctx.strokeStyle = '#5a2fb8'; ctx.lineWidth = 6;
                ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-8, 15 + walkCycle); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(8, 15 - walkCycle); ctx.stroke();
            }

            ctx.rotate(player.isMoving ? Math.sin(time * 0.2) * 0.05 : 0);
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath(); ctx.roundRect(-12, -15, 24, 25, 8); ctx.fill();
            
            ctx.fillStyle = '#a78bfa';
            ctx.beginPath(); ctx.arc(0, -22, 10, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(-5, -25, 10, 4);

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
        if (window.Koreh && window.Koreh.confirm) {
            window.Koreh.confirm("SISTEMA DE VISIÓN", `Detección: ${conteo.carpetas} Carpetas, ${conteo.libros} Libros, ${conteo.programas} Programas.`);
        }
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

setTimeout(() => window.Koreh.MisFunciones.registrarNodoExtra(), 500);

// ==========================================
// ORIGEN: koreh-funcionaciones7.js
// ==========================================
/* SILENOS - MIS FUNCIONES (Extensión de Materia M) 
   Versión: 7.2 - Graphic & Texture Engine (J) + SVG Gallery Integration (I)
   Refactor: Integración en window.Koreh.MisFunciones2
*/

window.Koreh = window.Koreh || {};

window.Koreh.MisFunciones2 = {
    
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
            const item = window.Koreh.MisFunciones2.Graphics.get(id);
            if (!item) return;

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
            ctx.drawImage(item._img, -w/2, -h/2, w, h);
            ctx.restore();
        },

        drawFloor(ctx, player, width, height, textureId, color) {
            const pattern = window.Koreh.MisFunciones2.Textures.get(ctx, textureId, 64, color);
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
            x: window.Koreh.MisFunciones2.Math.wrap(ent.x - (pl.x - w/2), ws),
            y: window.Koreh.MisFunciones2.Math.wrap(ent.y - (pl.y - h/2), ws)
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

// Mantenemos referencia para compatibilidad interna si otros scripts lo buscan
window.Koreh.MisFunciones = window.Koreh.MisFunciones2;

setTimeout(() => {
    if (typeof window.Koreh.MisFunciones2.registrarNodoExtra === 'function') {
        window.Koreh.MisFunciones2.registrarNodoExtra();
    }
    window.Koreh.MisFunciones2.Graphics.loadGallery();
}, 500);

// ==========================================
// ORIGEN: koreh-funcionaciones8.js
// ==========================================
/* SILENOS - KOREH FUNCIONACIONES (IA) 
   Refactor: Integración en window.Koreh.IA
*/

window.Koreh = window.Koreh || {};

window.Koreh.IA = {
    Z: {
        async call(userPrompt, systemPrompt = "", config = {}) {
            const settings = {
                model: config.model || "gemma-3-27b-it",
                maxRetries: config.maxRetries || 10,
                temperature: config.temperature ?? 0.7
            };

            let keyList = [];
            if (typeof AIService !== 'undefined') {
                keyList = AIService.getAllKeys();
            }

            if (keyList.length === 0) {
                throw new Error("Koreh: No hay API Keys disponibles. Ejecuta el Configurador de API.");
            }

            const delay = ms => new Promise(res => setTimeout(res, ms));
            let lastError = null;

            for (let attempt = 0; attempt < settings.maxRetries; attempt++) {
                const currentKey = keyList[attempt % keyList.length];
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${currentKey}`;

                const payload = {
                    contents: [{
                        role: "user",
                        parts: [{ 
                            text: (systemPrompt ? `=== SYSTEM ===\n${systemPrompt}\n\n` : "") + `=== INPUT ===\n${userPrompt}` 
                        }]
                    }],
                    generationConfig: { temperature: settings.temperature }
                };

                try {
                    const res = await fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(`API Error (${res.status}): ${errData.error?.message || res.statusText}`);
                    }
                    
                    const data = await res.json();
                    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                        throw new Error("Respuesta vacía de la IA.");
                    }

                    return data.candidates[0].content.parts[0].text;

                } catch (error) {
                    lastError = error;
                    console.warn(`Koreh: Intento ${attempt + 1} fallido. Rotando llave...`);
                    if (attempt < settings.maxRetries - 1) await delay(500 + (attempt * 200)); 
                }
            }

            throw new Error(`Koreh: Fallo total tras ${settings.maxRetries} disparos. ${lastError.message}`);
        },

        async getList(data, quantity, instructions) {
            const prompt = `DATOS: ${data}\nINSTR: ${instructions}\nGenera un JSON array de strings con EXACTAMENTE ${quantity} elementos. Ejemplo: ["punto1", "punto2"]`;
            const raw = await this.call(prompt, "Solo respondes en JSON estricto.");
            
            try {
                const firstBrace = raw.indexOf('[');
                const lastBrace = raw.lastIndexOf(']');
                let clean = raw;
                if (firstBrace !== -1 && lastBrace !== -1) {
                    clean = raw.substring(firstBrace, lastBrace + 1);
                }
                clean = clean.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(clean);
            } catch (e) {
                console.error("Koreh: Error parseando lista:", e);
                return [];
            }
        },

        async getTitle(text) {
            const prompt = `Genera un título muy corto (max 4 palabras) y descriptivo. Sin puntuación: ${text.substring(0, 500)}`;
            let title = await this.call(prompt, "Eres un experto en síntesis.");
            return title.replace(/[\\/\?\%\*\:\|\"\<\>\.]/g, "").trim();
        }
    },

    // ==========================================
    // SECCIÓN H: COHERENCIA (Escritura en Disco)
    // ==========================================
    H: {
        saveNarrative(title, tag, content) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'narrative');

            if (!item) {
                item = FileSystem.createNarrative(title, 'desktop');
            }

            item.content = { 
                tag: tag.toUpperCase(), 
                text: content.trim() 
            };

            FileSystem.save();
            
            if (typeof NarrativeManager !== 'undefined' && typeof openWindows !== 'undefined') {
                const wins = openWindows.filter(w => w.id === item.id || w.fileId === item.id);
                wins.forEach(win => NarrativeManager.renderInWindow(win.id, item.id));
            }
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            
            return item.id;
        }
    }
};

console.log("Koreh-IA V8.1: Modo Metralleta activo en Sección Z (window.Koreh.IA).");

// ==========================================
// ORIGEN: koreh-funcionaciones9.js
// ==========================================
/* SILENOS - KOREH FUNCIONACIONES 9 (Materia & Export System)
   Versión: 9.0 - Fábrica de Objetos de Sistema
   Refactor: Integración en window.Koreh.IA
*/

window.Koreh = window.Koreh || {};
window.Koreh.IA = window.Koreh.IA || {};

// Extendemos el objeto global Koreh.IA manteniendo lo anterior
Object.assign(window.Koreh.IA, {

    // ==========================================
    // SECCIÓN M: MATERIA (Generación de Archivos)
    // ==========================================
    M: {
        saveBook(title, chapters) {
            if (typeof FileSystem === 'undefined') return null;
            
            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'book');

            if (!item) {
                item = FileSystem.createBook(title, 'desktop');
            }

            item.content = {
                chapters: chapters.map(c => ({
                    title: c.title || "Capítulo sin título",
                    paragraphs: Array.isArray(c.paragraphs) ? c.paragraphs : [c.paragraphs]
                }))
            };

            FileSystem.save();
            this._refresh(item.id, 'book');
            return item.id;
        },

        saveNarrative(title, tag, text) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'narrative');

            if (!item) {
                item = FileSystem.createNarrative(title, 'desktop');
            }

            item.content = { 
                tag: tag.toUpperCase(), 
                text: text.trim() 
            };

            FileSystem.save();
            this._refresh(item.id, 'narrative');
            return item.id;
        },

        saveData(title, jsonObject) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'file');

            if (!item) {
                item = FileSystem.createData(title, jsonObject, 'desktop');
            } else {
                item.content = jsonObject;
            }

            FileSystem.save();
            this._refresh(item.id, 'file');
            return item.id;
        },

        saveProgram(title, graphData) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'program');

            if (!item) {
                item = FileSystem.createProgram(title, 'desktop');
            }

            item.content = {
                nodes: graphData.nodes || [],
                connections: graphData.connections || [],
                panX: graphData.panX || 0,
                panY: graphData.panY || 0,
                scale: graphData.scale || 1
            };

            FileSystem.save();
            this._refresh(item.id, 'program');
            return item.id;
        },

        saveImage(title, base64Data) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'image');

            if (!item) {
                item = FileSystem.createImageItem(title, 'desktop', base64Data);
            } else {
                item.content = base64Data;
            }

            FileSystem.save();
            this._refresh(item.id, 'image');
            return item.id;
        },

        // --- Utilidades Internas ---

        _refresh(itemId, type) {
            if (typeof refreshSystemViews === 'function') refreshSystemViews();

            if (typeof openWindows !== 'undefined') {
                const wins = openWindows.filter(w => w.fileId === itemId || w.id === itemId);
                wins.forEach(win => {
                    if (type === 'book' && typeof BookManager !== 'undefined') {
                        BookManager.renderInWindow(win.id, itemId);
                    } else if (type === 'narrative' && typeof NarrativeManager !== 'undefined') {
                        NarrativeManager.renderInWindow(win.id, itemId);
                    } else if (type === 'program' && typeof ProgrammerManager !== 'undefined') {
                        ProgrammerManager.loadProgram(win.id, itemId);
                    }
                });
            }
        }
    }
});

console.log("Koreh-IA V9.0: Sección M (Materia) lista para exportación masiva en window.Koreh.IA.");

// ==========================================
// ORIGEN: koreh-funcionaciones10.js
// ==========================================
/* SILENOS - MIS FUNCIONES 3 (Extensión de Materia M) 
   Versión: 10.0 - Advanced 3D Software Engine (B-E-A-U-I)
   Refactor: Integración en window.Koreh.MisFunciones3
*/

window.Koreh = window.Koreh || {};

window.Koreh.MisFunciones3 = {

    // ==========================================
    // SECCIÓN E: EQUILIBRIO (Álgebra 3D)
    // ==========================================
    Math3D: {
        project(point, camera, width, height) {
            const z = point.z - camera.z;
            if (z <= 0) return null; 
            const factor = camera.fov / z;
            return {
                x: (point.x - camera.x) * factor + width / 2,
                y: (point.y - camera.y) * factor + height / 2,
                scale: factor
            };
        },

        rotate(p, rx, ry, rz) {
            let { x, y, z } = p;
            // X-Axis
            let ty = y * Math.cos(rx) - z * Math.sin(rx);
            let tz = y * Math.sin(rx) + z * Math.cos(rx);
            y = ty; z = tz;
            // Y-Axis
            let tx = x * Math.cos(ry) + z * Math.sin(ry);
            tz = -x * Math.sin(ry) + z * Math.cos(ry);
            x = tx; z = tz;
            // Z-Axis
            tx = x * Math.cos(rz) - y * Math.sin(rz);
            ty = x * Math.sin(rz) + y * Math.cos(rz);
            x = tx; y = ty;
            return { x, y, z };
        }
    },

    // ==========================================
    // SECCIÓN M: MATERIA (Modelos y Texturas)
    // ==========================================
    Models: {
        createCube(size, color) {
            const s = size / 2;
            return {
                vertices: [
                    {x:-s, y:-s, z:-s}, {x:s, y:-s, z:-s}, {x:s, y:s, z:-s}, {x:-s, y:s, z:-s},
                    {x:-s, y:-s, z:s}, {x:s, y:-s, z:s}, {x:s, y:s, z:s}, {x:-s, y:s, z:s}
                ],
                faces: [
                    {indices: [0,1,2,3], color: color, texture: 1}, 
                    {indices: [1,5,6,2], color: color, texture: 4}, 
                    {indices: [5,4,7,6], color: color, texture: 1}, 
                    {indices: [4,0,3,7], color: color, texture: 4}, 
                    {indices: [3,2,6,7], color: color, texture: 2}, 
                    {indices: [4,5,1,0], color: color, texture: 5} 
                ]
            };
        },

        createPyramid(size, color) {
            const s = size / 2;
            return {
                vertices: [
                    {x:0, y:-s, z:0}, {x:-s, y:s, z:-s}, {x:s, y:s, z:-s}, {x:s, y:s, z:s}, {x:-s, y:s, z:s}
                ],
                faces: [
                    {indices: [0,1,2], color: color, texture: 6},
                    {indices: [0,2,3], color: color, texture: 6},
                    {indices: [0,3,4], color: color, texture: 6},
                    {indices: [0,4,1], color: color, texture: 6},
                    {indices: [1,4,3,2], color: color, texture: 4}
                ]
            };
        }
    },

    // ==========================================
    // SECCIÓN U: UNIÓN (Renderizado del Canvas)
    // ==========================================
    Render3D: {
        initEngine(parentId) {
            const container = document.getElementById(parentId);
            if (!container) return;

            const canvas = document.createElement('canvas');
            canvas.style.cssText = "width:100%; height:100%; display:block; background:#050508;";
            container.appendChild(canvas);
            const ctx = canvas.getContext('2d');

            const state = {
                width: 0, height: 0,
                camera: { x: 0, y: 0, z: -400, fov: 400 },
                objects: [],
                time: 0
            };

            const resize = () => {
                state.width = canvas.width = container.offsetWidth;
                state.height = canvas.height = container.offsetHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            const loop = () => {
                state.time += 0.02;
                this.draw(ctx, state);
                requestAnimationFrame(loop);
            };

            canvas.onclick = (e) => {
                const rect = canvas.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                this.checkInteraction(mx, my, state);
            };

            requestAnimationFrame(loop);
            return state;
        },

        draw(ctx, state) {
            ctx.clearRect(0, 0, state.width, state.height);
            
            let allFaces = [];

            state.objects.forEach(obj => {
                const rotatedVerts = obj.model.vertices.map(v => {
                    const MF3 = window.Koreh.MisFunciones3;
                    let rv = MF3.Math3D.rotate(v, obj.rx, obj.ry, obj.rz);
                    return { x: rv.x + obj.x, y: rv.y + obj.y, z: rv.z + obj.z };
                });

                obj.model.faces.forEach(face => {
                    const faceVerts = face.indices.map(i => rotatedVerts[i]);
                    const avgZ = faceVerts.reduce((sum, v) => sum + v.z, 0) / faceVerts.length;
                    
                    allFaces.push({
                        verts: faceVerts,
                        color: face.color,
                        texture: face.texture,
                        avgZ: avgZ,
                        parent: obj
                    });
                });
            });

            allFaces.sort((a, b) => b.avgZ - a.avgZ);

            allFaces.forEach(face => {
                const MF3 = window.Koreh.MisFunciones3;
                const projected = face.verts.map(v => 
                    MF3.Math3D.project(v, state.camera, state.width, state.height)
                );

                if (projected.some(p => p === null)) return;

                ctx.beginPath();
                ctx.moveTo(projected[0].x, projected[0].y);
                for(let i=1; i<projected.length; i++) ctx.lineTo(projected[i].x, projected[i].y);
                ctx.closePath();

                if (window.Koreh.MisFunciones2 && face.texture) {
                    ctx.fillStyle = window.Koreh.MisFunciones2.Textures.get(ctx, face.texture, 32, face.color);
                } else {
                    ctx.fillStyle = face.color;
                }

                const shade = Math.max(0.2, 1 - (face.avgZ / 1000));
                ctx.globalAlpha = shade;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                
                ctx.strokeStyle = "rgba(255,255,255,0.1)";
                ctx.stroke();
            });
        },

        checkInteraction(mx, my, state) {
            console.log("I -> Escaneando materia en el plano visual...");
            state.objects.forEach(obj => {
                const MF3 = window.Koreh.MisFunciones3;
                const p = MF3.Math3D.project(obj, state.camera, state.width, state.height);
                if (p && Math.hypot(mx - p.x, my - p.y) < 50) {
                    if (window.Koreh.V3) window.Koreh.V3.UI.showToast(`OBJETO: ${obj.id} SELECCIONADO`, "success");
                    obj.ry += 0.5; 
                }
            });
        }
    },

    // ==========================================
    // SECCIÓN A: ACCIÓN (Control de Objetos)
    // ==========================================
    createEntity(id, modelType, x, y, z, color) {
        let model = modelType === 'pyramid' ? 
            this.Models.createPyramid(100, color) : 
            this.Models.createCube(100, color);

        return {
            id: id,
            model: model,
            x: x, y: y, z: z,
            rx: 0, ry: 0, rz: 0,
            update() {
                this.ry += 0.01;
                this.rx += 0.005;
            }
        };
    }
};

setTimeout(() => {
    if (typeof NODE_REGISTRY !== 'undefined') {
        NODE_REGISTRY["render-3d"] = {
            title: "🧊 RENDER 3D",
            color: "#6366f1",
            fields: [
                { name: "modelo", type: "select", options: ["cube", "pyramid"] },
                { name: "color", type: "color", value: "#6366f1" }
            ],
            execute: async (ctx) => {
                const MF3 = window.Koreh.MisFunciones3;
                const scene = MF3.Render3D.initEngine('desktop');
                const obj = MF3.createEntity("OBJ-"+Date.now(), ctx.fields.modelo, 0, 0, 0, ctx.fields.color);
                scene.objects.push(obj);
                setInterval(() => obj.update(), 16);
                return "Escena 3D Iniciada";
            }
        };
        console.log("H -> Motor 3D (v10) vinculado a la Coherencia.");
    }
}, 600);

