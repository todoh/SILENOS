// --- cronologia/escaleta/director.ui.js ---
// INTERFAZ DE MODO DIRECTOR (PELÍCULA MODULAR)

const DirectorUI = {
    actCount: 0,
    _tempPlanteamientos: [],
    
    init() {
        this.addAct();
        const savedMode = localStorage.getItem('director_output_mode') || 'video';
        const modeSelect = document.getElementById('dir-output-mode');
        if (modeSelect) modeSelect.value = savedMode;
    },

    toggleModal() {
        const modal = document.getElementById('director-modal');
        modal.classList.toggle('hidden');
    },

    calcDuration() {
        const takes = parseInt(document.getElementById('dir-takes').value) || 0;
        const seconds = takes * 6; 
        const minutes = Math.round(seconds / 60);
        document.getElementById('dir-duration-calc').innerText = `~ ${minutes} Minutos`;
    },

    addAct() {
        this.actCount++;
        const container = document.getElementById('dir-acts-container');
        const actId = `act-${Date.now()}`;
        const actNumber = container.children.length + 1;

        const el = document.createElement('div');
        el.className = "bg-white border border-gray-200 rounded p-4 shadow-sm relative group";
        el.id = actId;
        
        el.innerHTML = `
            <button onclick="DirectorUI.removeAct('${actId}')" class="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><i class="fa-solid fa-trash"></i></button>
            
            <div class="flex items-center gap-4 mb-3">
                <div class="w-8 h-8 bg-indigo-100 text-indigo-700 font-bold rounded flex items-center justify-center shrink-0">A${actNumber}</div>
                <input type="text" class="act-title config-input flex-1 font-bold text-gray-700" placeholder="Título / Enfoque del Acto">
                <div class="flex items-center gap-2 shrink-0 border-l border-gray-100 pl-4">
                    <label class="text-[9px] font-bold text-gray-400 uppercase">Tomas:</label>
                    <input type="number" class="act-takes config-input w-16 text-center font-bold text-indigo-600" value="50">
                </div>
            </div>
            
            <input type="text" class="act-synopsis config-input w-full mb-3 text-xs text-gray-500" placeholder="Breve sinopsis: ¿De qué va este acto?">
            
            <textarea class="act-text config-input w-full h-32 resize-y text-xs font-mono bg-gray-50 p-2 rounded" placeholder="Pega aquí el guion o historia detallada de ESTE ACTO en concreto..."></textarea>
        `;

        container.appendChild(el);
        this.updateExecutionPanel();
    },

    removeAct(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
        this.updateExecutionPanel();
    },

    updateExecutionPanel() {
        const container = document.getElementById('dir-acts-container');
        const execContainer = document.getElementById('dir-execution-acts');
        if (!execContainer) return;
        execContainer.innerHTML = '';

        const acts = container.children;
        for (let i = 0; i < acts.length; i++) {
            const actNum = i + 1;
            const btn = document.createElement('button');
            btn.className = "w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase rounded transition-colors flex justify-between items-center px-4";
            btn.innerHTML = `<span><i class="fa-solid fa-clapperboard mr-2"></i> Grabar Acto ${actNum}</span> <i id="status-act-${actNum}" class="fa-solid fa-circle-minus text-emerald-300"></i>`;
            btn.onclick = () => DirectorCore.generateAct(i);
            execContainer.appendChild(btn);
        }
    },

    unlockRodaje() {
        const panel = document.getElementById('panel-rodaje');
        if (panel) panel.classList.remove('opacity-50', 'pointer-events-none');
        const statusPrepro = document.getElementById('status-prepro');
        if (statusPrepro) statusPrepro.className = "fa-solid fa-circle-check text-indigo-500";
    },

    markActSuccess(actIndex) {
        const icon = document.getElementById(`status-act-${actIndex + 1}`);
        if (icon) icon.className = "fa-solid fa-circle-check text-emerald-600";
    },

    getFormData() {
        const actsElements = document.getElementById('dir-acts-container').children;
        const acts = [];
        
        for (let i = 0; i < actsElements.length; i++) {
            const el = actsElements[i];
            acts.push({
                index: i,
                title: el.querySelector('.act-title').value,
                synopsis: el.querySelector('.act-synopsis').value,
                text: el.querySelector('.act-text').value,
                targetTakes: parseInt(el.querySelector('.act-takes').value) || 50
            });
        }

        return {
            global: {
                title: document.getElementById('dir-title').value,
                totalTakes: parseInt(document.getElementById('dir-takes').value) || 150,
                premise: document.getElementById('dir-premise').value,
                globalStyle: document.getElementById('dir-style').value,
                audioStyle: document.getElementById('dir-audio-style') ? document.getElementById('dir-audio-style').value : "",
                outputMode: document.getElementById('dir-output-mode') ? document.getElementById('dir-output-mode').value : "video"
            },
            artBible: document.getElementById('dir-bible-manual').value,
            acts: acts
        };
    },

    async savePlanteamiento() {
        const data = this.getFormData();
        if (!data.global.title || data.global.title.trim() === '') return alert("Ponle un 'Título del Proyecto' antes de exportar el planteamiento.");
        
        data._isDirectorPlanteamiento = true;
        const jsonString = JSON.stringify(data, null, 2);

        const transferBox = document.getElementById('dir-json-transfer-box');
        if (transferBox) transferBox.value = jsonString;

        if (EscaletaCore.rootHandle) {
            const safeTitle = data.global.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `PLANT_${safeTitle}.json`;
            try {
                const handle = await EscaletaCore.rootHandle.getFileHandle(filename, { create: true });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                alert(`Planteamiento guardado en el archivo del proyecto y volcado en el cuadro JSON inferior:\n${filename}`);
                return;
            } catch (e) {
                console.warn("Fallo al escribir en el disco del proyecto, se usará volcado por texto.", e);
            }
        }
        alert("Planteamiento serializado con éxito en la caja de texto JSON inferior.");
    },

    loadPlanteamiento() {
        const transferBox = document.getElementById('dir-json-transfer-box');
        if (!transferBox || !transferBox.value.trim()) {
            return alert("Por favor, pega el código JSON de un planteamiento en la caja de texto inferior antes de pulsar Cargar.");
        }

        try {
            const rawJson = transferBox.value.trim();
            const data = JSON.parse(rawJson);
            
            if (!data.global || !data.acts) {
                throw new Error("El archivo no contiene la estructura global básica de un planteamiento válido.");
            }

            this.applyPlanteamiento(data);
        } catch (e) {
            console.error(e);
            alert("Error al parsear el JSON provisto. Asegúrate de que tiene un formato válido. Detalle: " + e.message);
        }
    },

    copyExampleTemplate() {
        const template = {
            "_isDirectorPlanteamiento": true,
            "global": {
                "title": "Cyber Hunter Motril",
                "totalTakes": 150,
                "premise": "Un cazador de replicantes de la Costa Tropical sigue el rastro de un núcleo cuántico robado.",
                "globalStyle": "Cine negro futurista, atmósfera húmeda saturada, neón rosa, lentes anamórficas",
                "audioStyle": "Diseño sonoro tenso, sintetizadores analógicos retro, foley de pasos y lluvia",
                "outputMode": "video"
            },
            "artBible": "- MANUEL (Personaje): 23 años, mirada analítica, chaqueta brutalista reflectante con el tag Nile Silog en la espalda.\n- PUERTO DE MOTRIL (Lugar): Grúas industriales gigantes oscuras bajo nubes púrpuras, reflejos de neón en el agua del mar.",
            "acts": [
                {
                    "index": 0,
                    "title": "Acto I: El Desembarco en la Costa",
                    "synopsis": "Manuel llega al muelle bajo una lluvia densa y encuentra el contenedor alterado.",
                    "text": "EXT. PUERTO DE MOTRIL - NOCHE\nLa lluvia golpea con fuerza sobre las planchas metálicas. @manuel camina lentamente con la mano apoyada en su gabardina protectora, observando la silueta del almacén abandonado del muelle.",
                    "targetTakes": 50
                }
            ]
        };

        const jsonString = JSON.stringify(template, null, 2);
        
        navigator.clipboard.writeText(jsonString).then(() => {
            const transferBox = document.getElementById('dir-json-transfer-box');
            if (transferBox) transferBox.value = jsonString;
            alert("¡Plantilla de ejemplo completa copiada al portapapeles e insertada en la caja de texto JSON!");
        }).catch(err => {
            console.error("Fallo al copiar plantilla:", err);
            alert("No se pudo acceder al portapapeles automáticamente. Copia el contenido de la caja de texto JSON manualmente.");
        });
    },

    applyPlanteamiento(data) {
        document.getElementById('dir-title').value = data.global.title || '';
        document.getElementById('dir-takes').value = data.global.totalTakes || 150;
        document.getElementById('dir-premise').value = data.global.premise || '';
        document.getElementById('dir-style').value = data.global.globalStyle || '';
        if (document.getElementById('dir-audio-style')) {
            document.getElementById('dir-audio-style').value = data.global.audioStyle || '';
        }
        if (document.getElementById('dir-output-mode') && data.global.outputMode) {
            document.getElementById('dir-output-mode').value = data.global.outputMode;
            localStorage.setItem('director_output_mode', data.global.outputMode);
        }
        
        document.getElementById('dir-bible-manual').value = data.artBible || '';

        const container = document.getElementById('dir-acts-container');
        container.innerHTML = '';
        this.actCount = 0;

        if (data.acts && data.acts.length > 0) {
            data.acts.forEach(act => {
                this.addAct(); 
                const currentEl = container.lastElementChild;
                if (currentEl) {
                    currentEl.querySelector('.act-title').value = act.title || '';
                    currentEl.querySelector('.act-synopsis').value = act.synopsis || '';
                    currentEl.querySelector('.act-text').value = act.text || '';
                    currentEl.querySelector('.act-takes').value = act.targetTakes || 50;
                }
            });
        } else {
            this.addAct(); 
        }

        this.calcDuration();
        this.updateExecutionPanel();
        alert(`Planteamiento "${data.global.title || 'Sin título'}" inyectado y structured con éxito en los formularios.`);
    }
};

window.DirectorUI = DirectorUI;