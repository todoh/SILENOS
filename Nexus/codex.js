/* NEXUS SILENOS/codex.js */
/**
 * CODEX MANAGER (H - COHERENCIA)
 * Gestiona las leyes inmutables, el sistema de magia, tecnología y tono.
 * La IA consultará esto para afinar la "nitidez" de la generación.
 */

class CodexManager {
    constructor(sagaData, saveCallback, notifyCallback) {
        this.sagaData = sagaData;
        this.save = saveCallback;
        this.notify = notifyCallback;

        // --- CORRECCIÓN DE ERROR Y ESTRUCTURA DEFENSIVA ---
        // Aseguramos que 'codex' exista
        if (!this.sagaData.codex) {
            this.sagaData.codex = {};
        }

        // Aseguramos que CADA propiedad exista individualmente.
        // Esto arregla el error "reading 'forEach' of undefined" si 'axioms' no existía en datos antiguos.
        const defaults = {
            worldType: "",      
            magicSystem: "",    
            cosmology: "",      
            tone: "",           
            axioms: []          
        };

        for (const key in defaults) {
            if (this.sagaData.codex[key] === undefined) {
                this.sagaData.codex[key] = defaults[key];
            }
        }

        this.container = null;
    }

    mount(containerElement) {
        this.container = containerElement;
        this.renderLayout();
        this.bindEvents();
    }

    renderLayout() {
        const c = this.sagaData.codex;
        
        // Se ha eliminado el botón de guardado manual del HTML
        this.container.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:20px; height:100%; overflow-y:auto; padding-right:5px;">
                
                <div style="background:#eef2f5; padding:15px; border-radius:12px; border-left:4px solid #00acc1;">
                    <p style="font-size:0.85rem; color:#555; margin:0;">
                        <b>EL CÓDICE</b> define las reglas que KOREH (la IA) debe respetar. 
                        Los cambios se guardan automáticamente.
                    </p>
                </div>

                <div class="form-group">
                    <label style="color:#00acc1; font-weight:bold;">GÉNERO Y AMBIENTACIÓN</label>
                    <input type="text" id="cdxWorldType" class="char-input" 
                        placeholder="Ej: Hard Sci-Fi, Fantasía Oscura, Realismo Mágico..." value="${c.worldType || ''}">
                </div>

                <div style="display:flex; gap:20px;">
                    <div class="form-group" style="flex:1;">
                        <label style="color:#00acc1; font-weight:bold;">SISTEMA DE PODER (MAGIA/TECH)</label>
                        <textarea id="cdxMagic" class="char-input" rows="6" 
                            placeholder="¿Cómo funciona la magia o tecnología? ¿Tiene coste? ¿Límites?">${c.magicSystem || ''}</textarea>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label style="color:#00acc1; font-weight:bold;">COSMOLOGÍA Y SOCIEDAD</label>
                        <textarea id="cdxCosmo" class="char-input" rows="6" 
                            placeholder="Dioses, gobiernos, economía base, creencias...">${c.cosmology || ''}</textarea>
                    </div>
                </div>

                <div class="form-group">
                    <label style="color:#00acc1; font-weight:bold;">TONO Y ESTILO NARRATIVO</label>
                    <input type="text" id="cdxTone" class="char-input" 
                        placeholder="Ej: Crudo, violento, poético, humorístico, introspectivo..." value="${c.tone || ''}">
                </div>

                <div class="form-group">
                    <label style="color:#d63031; font-weight:bold;">AXIOMAS (REGLAS INQUEBRANTABLES)</label>
                    <div style="display:flex; gap:10px; margin-bottom:10px;">
                        <input type="text" id="inpNewAxiom" class="char-input" placeholder="Ej: 'Los elfos no pueden mentir' o 'El viaje FTL es imposible'.">
                        <button id="btnAddAxiom" class="btn primary">＋</button>
                    </div>
                    <div id="axiomList" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>
                
                <div style="height:20px;"></div> </div>
        `;
        
        this.renderAxioms();
    }

    renderAxioms() {
        const list = this.container.querySelector('#axiomList');
        list.innerHTML = '';
        
        // Ahora es seguro acceder a axioms porque el constructor lo garantiza
        this.sagaData.codex.axioms.forEach((ax, idx) => {
            const div = document.createElement('div');
            div.className = 'char-item'; // Reutilizamos estilo
            div.style.justifyContent = 'space-between';
            div.style.background = 'white';
            div.innerHTML = `
                <span style="font-weight:600; color:#333;">⚖️ ${ax}</span>
                <button class="btn danger" style="padding:2px 8px; font-size:0.7rem;" onclick="window.CodexManagerInstance.removeAxiom(${idx})">×</button>
            `;
            list.appendChild(div);
        });
    }

    bindEvents() {
        window.CodexManagerInstance = this;

        // --- AUTOGUARDADO (Sustituye al botón) ---
        const inputs = ['cdxWorldType', 'cdxMagic', 'cdxCosmo', 'cdxTone'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.autoSaveFields());
            }
        });

        // Axiomas (Añadir)
        this.container.querySelector('#btnAddAxiom').onclick = () => {
            const inp = document.getElementById('inpNewAxiom');
            const val = inp.value.trim();
            if(val) {
                this.sagaData.codex.axioms.push(val);
                inp.value = '';
                this.renderAxioms();
                this.save(); // Guardado automático
            }
        };
        
        // Enter en input de axioma
        document.getElementById('inpNewAxiom').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.container.querySelector('#btnAddAxiom').click();
        });
    }

    autoSaveFields() {
        // Captura los valores actuales y guarda
        this.sagaData.codex.worldType = document.getElementById('cdxWorldType').value;
        this.sagaData.codex.magicSystem = document.getElementById('cdxMagic').value;
        this.sagaData.codex.cosmology = document.getElementById('cdxCosmo').value;
        this.sagaData.codex.tone = document.getElementById('cdxTone').value;
        
        this.save();
        // Opcional: Podríamos mostrar un indicador sutil de "Guardando..." aquí si quisieras
    }

    removeAxiom(idx) {
        this.sagaData.codex.axioms.splice(idx, 1);
        this.renderAxioms();
        this.save(); // Guardado automático al borrar
    }
}

// Exponer globalmente
window.CodexManager = CodexManager;