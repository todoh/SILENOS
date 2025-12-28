/* SILENOS - KOREH FUNCIONACIONES 3 (Resonancia y Granularidad Avanzada) 
   Versión: 3.0 - Intelligence & Media Suite (Z-R-G)
*/

window.Koreh3 = {

    // ==========================================
    // SECCIÓN R: RESONANCIA (AUDIO Y FEEDBACK)
    // ==========================================
    
    Audio: {
        // R -> Genera un pulso de resonancia (Beep sintético) para feedback de interfaz
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

        // K -> Resonancia de éxito (Camino abierto)
        playSuccess() { this.playPulse(880, 'sine', 0.2); },
        // L -> Resonancia de error (Límite alcanzado)
        playError() { this.playPulse(110, 'sawtooth', 0.3); }
    },

    // ==========================================
    // SECCIÓN G: GRANULARIDAD (MANIPULACIÓN DE DATOS)
    // ==========================================

    Data: {
        // G -> Divide un texto en partículas (tokens) para análisis profundo
        tokenize(text) {
            return text.toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .split(/\s+/)
                .filter(word => word.length > 3);
        },

        // Z -> Extrae la esencia (palabras clave más frecuentes)
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
        // F -> Crea un Toast (Notificación efímera) Neumórfica
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

        // A -> Genera un efecto de partículas en un Canvas (Resonancia Visual)
        // Se abre en la función del canvas según instrucción [cite: 2025-11-16]
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
        // Z -> Limpia el código o texto de ruido de markdown
        sanitizeAIResponse(text) {
            return text.replace(/```json/g, '')
                       .replace(/```javascript/g, '')
                       .replace(/```/g, '')
                       .trim();
        },

        // G -> Formatea una respuesta larga en párrafos coherentes para el BookManager
        formatForBook(text) {
            return text.split('\n\n')
                       .filter(p => p.trim().length > 0)
                       .map(p => p.trim());
        }
    },

    // Registro de Nodos para el ProgrammerManager
    registrarNodos3() {
        if (typeof NODE_REGISTRY !== 'undefined') {
            // Nodo de Notificación (Forma)
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

            // Nodo de Esencia (Granularidad)
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

// Auto-registro tras breve delay para asegurar carga de NODE_REGISTRY
setTimeout(() => {
    Koreh3.registrarNodos3();
}, 600);