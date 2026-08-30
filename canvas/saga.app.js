// saga.app.js
window.app = {
    editingFilename: null,
    editingRegionId: null,
    
    // Historial de Undo/Redo (máximo 20)
    undoStack: [],
    redoStack: [],
    maxHistory: 20,
    isRestoringState: false,
    
    // Temporizadores de Autoguardado (Debounce)
    autoSaveDataTimer: null,
    autoSaveZoneTimer: null,
    autoSaveLoreTimer: null,

    async placeNodeFromCtx() {
        document.getElementById('ctx-menu-node').classList.add('hidden');
        const selectedId = window.Saga.Canvas.selectedNodeId;
        const item = window.Saga.Core.items.find(i => i.filename === selectedId);
        if (!item) return;

        // Clic del usuario en el espacio World del Canvas
        const ctxWorldPos = window.Saga.Canvas.ctxMenuWorldPos || {
            x: window.Saga.Canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x,
            y: window.Saga.Canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y
        };

        const targetWorldX = Math.round(ctxWorldPos.x);
        const targetWorldY = Math.round(ctxWorldPos.y);

        // ---------------------------------------------------------------------
        // PREPARAR CONTEXTO ESTRUCTURAL Y CRONOLÓGICO DEL CANVAS
        // ---------------------------------------------------------------------
        const canvasNodesData = (window.Saga.Core.items || [])
            .filter(i => i.filename !== selectedId)
            .map(i => {
                const node = (window.Saga.Canvas.nodes || []).find(n => n.id === i.filename);
                const wx = node ? Math.round(node.x) : 100;
                const wy = node ? Math.round(node.y) : 100;
                const calculatedDate = window.Saga.Canvas.worldXToDate(wx);
                const region = node ? window.Saga.Canvas.getNodeRegion(node) : null;
                return {
                    id: i.filename,
                    name: i.data.name || "Sin nombre",
                    type: i.data.type || "Dato",
                    tags: i.data.tags || [],
                    desc: (i.data.desc || "").substring(0, 150),
                    fechaAsignada: window.Saga.Canvas.formatDateLabel(calculatedDate, 'day'),
                    posicion: { x: wx, y: wy },
                    zona: region ? region.name : "Sin zona"
                };
            });

        const canvasRegionsData = (window.Saga.Canvas.regions || []).map(r => ({
            id: r.id,
            name: r.name,
            bounds: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }
        }));

        const currentTargetData = {
            name: item.data.name,
            type: item.data.type || "Dato",
            tags: item.data.tags || [],
            desc: item.data.desc || "",
            fechaReferenciaClic: window.Saga.Canvas.formatDateLabel(window.Saga.Canvas.worldXToDate(targetWorldX), 'day')
        };

        try {
            this.pushState();
            const modelName = "gemini-3.1-flash-lite";

            // =================================================================
            // LLAMADA 1: ANÁLISIS Y POSICIONAMIENTO TEMPORAL (EJE X PRIORITARIO)
            // =================================================================
            const sysInstruction1 = "Eres un Historiador Cronológico. Tu PRIORIDAD ABSOLUTA es determinar la fecha/momento exacto donde encaja el nodo en la línea temporal y calcular su coordenada ideal en el Eje X.";
            const userPrompt1 = `DATO A COLOCAR: ${JSON.stringify(currentTargetData)}
MAPA DE NODOS Y FECHAS ACTUALES EN EL CANVAS: ${JSON.stringify(canvasNodesData)}
FECHA DEL CLIC DEL USUARIO: ${currentTargetData.fechaReferenciaClic} (Coordenada X base: ${targetWorldX})

Analiza el contenido del dato e infiere su fecha lógica en la cronología. 
Devuelve estrictamente un JSON:
{
  "analisisTemporal": "Explicación del momento histórico/cronológico",
  "fechaInferidaISO": "AAAA-MM-DD",
  "posicionXPrioritaria": número (debe alinearse con su fecha en el Eje X)
}`;

            const resStep1 = await window.Saga.Generation.callGeminiRaw(sysInstruction1, userPrompt1, 0.3, modelName);

            // Determinar X prioritario según fecha inferida o fallback a posición del clic
            let priorityX = targetWorldX;
            if (resStep1 && resStep1.fechaInferidaISO) {
                const parsedDate = new Date(resStep1.fechaInferidaISO);
                if (!isNaN(parsedDate.getTime())) {
                    priorityX = Math.round(window.Saga.Canvas.dateToWorldX(parsedDate));
                }
            } else if (resStep1 && typeof resStep1.posicionXPrioritaria === 'number') {
                priorityX = Math.round(resStep1.posicionXPrioritaria);
            }

            // =================================================================
            // LLAMADA 2: ANÁLISIS ONTOLÓGICO Y AGRUPACIÓN DE VECINDAD (EJE Y)
            // =================================================================
            const sysInstruction2 = "Eres un Analista Ontológico. Tu función es identificar los nodos con mayor afinidad conceptual y determinar la posición ideal en el Eje Y para mantener la cercanía con datos relacionados sin alterar el tiempo (Eje X).";
            const userPrompt2 = `DATO A COLOCAR: ${JSON.stringify(currentTargetData)}
ZONAS DISPONIBLES EN CANVAS: ${JSON.stringify(canvasRegionsData)}
NODOS EXISTENTES: ${JSON.stringify(canvasNodesData)}
POSICIÓN CRONOLÓGICA FIJADA EN EJE X: ${priorityX}

Evalúa la red de relaciones para agrupar en el Eje Y. Devuelve estrictamente un JSON:
{
  "zonaDestino": "Nombre de la zona o 'Libre'",
  "nodosA fines": ["nombre_nodo_1", "nombre_nodo_2"],
  "sugerenciaY": número (Coordenada Y ideal cerca de nodos afines)
}`;

            const resStep2 = await window.Saga.Generation.callGeminiRaw(sysInstruction2, userPrompt2, 0.4, modelName);

            // =================================================================
            // LLAMADA 3: RESOLUCIÓN FINAL DE GEOMETRÍA Y DISPERSIÓN DE COLISIONES
            // =================================================================
            const sysInstruction3 = "Eres un Cartógrafo Espacial. Calcula las coordenadas finales X e Y fijando estrictamente el nodo en su tiempo (Eje X cercano a priorityX) y colocándolo verticalmente (Eje Y) cerca de sus nodos afines, garantizando una separación mínima de 180px para evitar colisiones.";
            const userPrompt3 = `DATO A COLOCAR: ${JSON.stringify(currentTargetData)}
POSICIÓN TEMPORAL OBJETIVO (EJE X): ${priorityX}
POSICIÓN CLIC USUARIO (Y REFERENCIA): ${targetWorldY}
FASE 1 (CRONOLOGÍA): ${JSON.stringify(resStep1)}
FASE 2 (RELACIONES): ${JSON.stringify(resStep2)}
NODOS EXISTENTES Y POSICIONES: ${JSON.stringify(canvasNodesData.map(n => ({ name: n.name, x: n.posicion.x, y: n.posicion.y, zona: n.zona })))}

Devuelve STRICTLY JSON: {"x": número, "y": número}`;

            const resStep3 = await window.Saga.Generation.callGeminiRaw(sysInstruction3, userPrompt3, 0.2, modelName);

            // Extraer coordenadas con fallbacks estructurados
            const finalX = (typeof resStep3.x === 'number' && !isNaN(resStep3.x)) ? resStep3.x : priorityX;
            const finalY = (typeof resStep3.y === 'number' && !isNaN(resStep3.y)) ? resStep3.y : (resStep2.sugerenciaY || targetWorldY);

            // Actualizar nodo en memoria y persistir en disco
            const canvasNode = window.Saga.Canvas.nodes.find(n => n.id === selectedId);
            if (canvasNode) {
                canvasNode.x = finalX;
                canvasNode.y = finalY;
            }
            item.data.x = finalX;
            item.data.y = finalY;

            await window.Saga.Core.saveNodeData(item.filename, item.data);
            window.Saga.Canvas.saveAllNodePositions();

        } catch (e) {
            alert("Error en el micro-agente de colocación (3.1 Flash Lite): " + e.message);
        }
    },

    async init() {
        window.Saga.Canvas.init('saga-canvas');

        const key = localStorage.getItem('koreh_gemini_book_api_key');
        if (key) document.getElementById('gemini-key').value = key;

        window.addEventListener('click', (e) => {
            if (!e.target.closest('#ctx-menu')) {
                document.getElementById('ctx-menu').classList.add('hidden');
            }
            if (!e.target.closest('#ctx-menu-node')) {
                document.getElementById('ctx-menu-node').classList.add('hidden');
            }
            if (!e.target.closest('#ctx-menu-zone')) {
                const zoneMenu = document.getElementById('ctx-menu-zone');
                if (zoneMenu) zoneMenu.classList.add('hidden');
            }
        });

        // Event listener global para comandos de teclado Ctrl+Z y Ctrl+Y
        window.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (!isCtrl) return;

            const target = e.target;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
                return;
            }

            if (e.key.toLowerCase() === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    this.redo();
                } else {
                    e.preventDefault();
                    this.undo();
                }
            } else if (e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
        });

        this.updateHistoryButtonsUI();
    },

    openRightDrawer(section) {
        if (section === 'lore') {
            this.loadLoreDisplay();
        }
        this.openDrawer(section);
    },

    async exportFullProjectJSON() {
        try {
            const lore = await window.Saga.Lore.loadLore();
            const items = window.Saga.Core.items.map(item => ({
                filename: item.filename,
                data: item.data
            }));
            const tramas = window.Saga.Core.tramas || [];
            const chatHistory = window.Saga.Chat.chatHistory || [];

            const exportPayload = {
                metadata: {
                    appName: "CANVAS SAGA",
                    exportDate: new Date().toISOString(),
                    totalItems: items.length,
                    totalZones: tramas.length
                },
                lore: lore,
                tramas: tramas,
                items: items,
                chatHistory: chatHistory
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `SAGA_UNIVERSO_COMPLETO_${Date.now()}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        } catch (err) {
            alert("Error al exportar el JSON completo: " + err.message);
        }
    },

    async exportCanvas4K() {
        if (window.Saga && window.Saga.Canvas && typeof window.Saga.Canvas.exportCanvas4K === 'function') {
            await window.Saga.Canvas.exportCanvas4K();
        } else {
            alert("No se pudo exportar el canvas.");
        }
    },

    async executeStandardGeneration() {
        const premise = document.getElementById('gen-inp-premise').value.trim();
        const category = document.getElementById('gen-inp-category').value.trim() || 'Dato';
        const count = parseInt(document.getElementById('gen-inp-count').value, 10) || 1;
        const modeKey = document.getElementById('gen-inp-mode').value;
        const useCanvasContext = document.getElementById('gen-chk-canvas').checked;
        const useLore = document.getElementById('gen-chk-lore').checked;

        if (!premise) return alert("Introduce una premisa.");

        const btn = document.getElementById('btn-exec-gen');
        btn.disabled = true;

        try {
            this.pushState();
            const entities = await window.Saga.Generation.generateEntities({
                premise,
                category,
                count,
                modeKey,
                useLore,
                useCanvasContext
            }, (statusMessage) => {
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${statusMessage}`;
            });

            for (let i = 0; i < entities.length; i++) {
                const itemData = entities[i];
                const cleanName = (itemData.name || 'dato').trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const filename = `${cleanName}_${Date.now()}_${i}.json`;
                await window.Saga.Core.saveNodeData(filename, itemData);
            }

            await window.Saga.Core.scanFiles();
            document.getElementById('gen-inp-premise').value = '';
        } catch (e) {
            alert("Error en el pipeline de generación: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-play"></i> GENERAR DATOS';
        }
    },

    async executeDatabaseAgent(mode) {
        const premise = document.getElementById('gen-inp-premise').value.trim();
        const category = document.getElementById('gen-inp-category').value.trim() || 'Dato';
        const count = parseInt(document.getElementById('gen-inp-count').value, 10) || 5;

        if (!premise) return alert("Introduce una premisa guía para el agente.");

        try {
            this.pushState();
            await window.Saga.Agents.runDatabaseBuilderAgent(mode, premise, category, count);
        } catch (e) {
            alert("Error del agente de base de datos: " + e.message);
        }
    },

    async executeLoreAgent(mode) {
        const fields = [
            'lore-field-resumenGeneral',
            'lore-field-faccionesYPersonajes',
            'lore-field-tecnologiaYMagia',
            'lore-field-cronologia',
            'lore-field-conflictos',
            'lore-field-geografiaYAsentamientos',
            'lore-field-misteriosYLeyendas',
            'lore-field-glosarioYTerminologia'
        ];

        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = "Sintetizando información con IA, por favor espera...";
        });

        try {
            const updatedLore = await window.Saga.Lore.executeLoreAgentMode(mode, (statusText, partialLore) => {
                if (partialLore) {
                    this.renderLoreFields(partialLore);
                }
                const firstEmpty = fields.find(f => {
                    const el = document.getElementById(f);
                    return el && (el.value.startsWith("Sintetizando") || !el.value);
                });
                if (firstEmpty) {
                    const el = document.getElementById(firstEmpty);
                    if (el) el.value = `[${statusText}]`;
                }
            });

            await window.Saga.Lore.saveLore(updatedLore);
            this.renderLoreFields(updatedLore);
        } catch (e) {
            alert("Error en agente de lore: " + e.message);
            await this.loadLoreDisplay();
        }
    },

    async loadLoreDisplay() {
        const lore = await window.Saga.Lore.loadLore();
        this.renderLoreFields(lore);
    },

    renderLoreFields(lore) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        setVal('lore-field-resumenGeneral', lore.resumenGeneral);
        setVal('lore-field-faccionesYPersonajes', lore.faccionesYPersonajes);
        setVal('lore-field-tecnologiaYMagia', lore.tecnologiaYMagia);
        setVal('lore-field-cronologia', lore.cronologia);
        setVal('lore-field-conflictos', lore.conflictos);
        setVal('lore-field-geografiaYAsentamientos', lore.geografiaYAsentamientos);
        setVal('lore-field-misteriosYLeyendas', lore.misteriosYLeyendas);
        setVal('lore-field-glosarioYTerminologia', lore.glosarioYTerminologia);
    },

    autoSaveLoreDrawer() {
        clearTimeout(this.autoSaveLoreTimer);
        this.autoSaveLoreTimer = setTimeout(async () => {
            const getVal = (id) => document.getElementById(id)?.value.trim() || '';
            const updatedLore = {
                resumenGeneral: getVal('lore-field-resumenGeneral'),
                faccionesYPersonajes: getVal('lore-field-faccionesYPersonajes'),
                tecnologiaYMagia: getVal('lore-field-tecnologiaYMagia'),
                cronologia: getVal('lore-field-cronologia'),
                conflictos: getVal('lore-field-conflictos'),
                geografiaYAsentamientos: getVal('lore-field-geografiaYAsentamientos'),
                misteriosYLeyendas: getVal('lore-field-misteriosYLeyendas'),
                glosarioYTerminologia: getVal('lore-field-glosarioYTerminologia')
            };
            await window.Saga.Lore.saveLore(updatedLore);
        }, 500);
    },

    async sendChatMessage(textOverride = null) {
        const inputEl = document.getElementById('chat-input-message');
        const userMsgText = textOverride || inputEl.value.trim();
        if (!userMsgText) return;

        const useCanvas = document.getElementById('chat-chk-canvas').checked;
        const useLore = document.getElementById('chat-chk-lore').checked;
        const btnSend = document.getElementById('btn-send-chat');

        this.clearChatSuggestions();
        inputEl.value = '';
        btnSend.disabled = true;
        btnSend.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> PENSANDO...';

        try {
            await window.Saga.Chat.sendMessage(userMsgText, useCanvas, useLore);
        } finally {
            btnSend.disabled = false;
            btnSend.innerHTML = '<i class="fa-solid fa-paper-plane"></i> ENVIAR MENSAJE';
        }
    },

    appendChatMessage(role, text) {
        const container = document.getElementById('chat-history-container');
        const defaultNotice = container.querySelector('.text-gray-400.text-center');
        if (defaultNotice) {
            defaultNotice.remove();
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `p-3 rounded-xl leading-relaxed text-xs shadow-sm relative group ${
            role === 'user' 
                ? 'bg-teal-600 text-white ml-6' 
                : 'bg-white text-gray-800 border border-gray-200 mr-4'
        }`;

        const roleHeader = document.createElement('div');
        roleHeader.className = 'flex justify-between items-center mb-1.5';

        const roleLabel = document.createElement('div');
        roleLabel.className = `font-bold text-[10px] uppercase ${role === 'user' ? 'text-teal-100' : 'text-teal-600'}`;
        roleLabel.innerText = role === 'user' ? 'Tú' : 'IA';
        roleHeader.appendChild(roleLabel);

        if (role === 'model') {
            const btnCreateNode = document.createElement('button');
            btnCreateNode.className = 'text-[10px] px-2 py-0.5 rounded google-button bg-gray-50 text-teal-700 hover:bg-teal-100 font-semibold border border-teal-200 transition';
            btnCreateNode.innerHTML = '<i class="fa-solid fa-cube text-teal-600 mr-1"></i>Crear Dato';
            btnCreateNode.title = "Selecciona texto para usarlo como dato, o pulsa directamente para usar todo el mensaje.";
            btnCreateNode.onclick = () => window.Saga.Chat.convertTextToDataNode(text);
            roleHeader.appendChild(btnCreateNode);
        }

        const textContent = document.createElement('div');
        textContent.className = 'text-xs break-words select-text';
        if (role === 'user') {
            textContent.innerText = text;
        } else {
            textContent.innerHTML = window.Saga.Chat.parseMarkdown(text);
        }

        msgDiv.appendChild(roleHeader);
        msgDiv.appendChild(textContent);
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    },

    renderChatSuggestions(suggestions) {
        const container = document.getElementById('chat-history-container');
        let suggBox = document.getElementById('chat-suggestions-box');
        if (!suggBox) {
            suggBox = document.createElement('div');
            suggBox.id = 'chat-suggestions-box';
            suggBox.className = 'flex flex-col gap-1.5 my-2 pt-2 border-t border-gray-200';
            container.appendChild(suggBox);
        } else {
            suggBox.innerHTML = '';
        }

        suggestions.forEach(optText => {
            const btn = document.createElement('button');
            btn.className = 'text-left px-3 py-1.5 google-button text-[11px] rounded-lg text-teal-700 hover:bg-teal-50 border-teal-200 transition font-medium';
            btn.innerHTML = `<i class="fa-solid fa-circle-dot text-[9px] mr-1.5 text-teal-500"></i>${optText}`;
            btn.onclick = () => this.sendChatMessage(optText);
            suggBox.appendChild(btn);
        });

        container.scrollTop = container.scrollHeight;
    },

    clearChatSuggestions() {
        const suggBox = document.getElementById('chat-suggestions-box');
        if (suggBox) suggBox.remove();
    },

    clearChatHistory() {
        window.Saga.Chat.clearHistory();
        const container = document.getElementById('chat-history-container');
        container.innerHTML = '<div class="text-gray-400 text-center text-[11px] py-4">Inicia la conversación preguntando cualquier duda sobre tu mundo.</div>';
    },

    pushState() {
        if (this.isRestoringState) return;
        const currentState = {
            items: JSON.parse(JSON.stringify(window.Saga.Core.items.map(i => ({ filename: i.filename, data: i.data })))),
            tramas: JSON.parse(JSON.stringify(window.Saga.Core.tramas))
        };
        this.undoStack.push(currentState);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
        this.updateHistoryButtonsUI();
    },

    async undo() {
        if (this.undoStack.length === 0) return;
        const currentState = {
            items: JSON.parse(JSON.stringify(window.Saga.Core.items.map(i => ({ filename: i.filename, data: i.data })))),
            tramas: JSON.parse(JSON.stringify(window.Saga.Core.tramas))
        };
        this.redoStack.push(currentState);
        const previousState = this.undoStack.pop();
        await this.applyState(previousState);
        this.updateHistoryButtonsUI();
    },

    async redo() {
        if (this.redoStack.length === 0) return;
        const currentState = {
            items: JSON.parse(JSON.stringify(window.Saga.Core.items.map(i => ({ filename: i.filename, data: i.data })))),
            tramas: JSON.parse(JSON.stringify(window.Saga.Core.tramas))
        };
        this.undoStack.push(currentState);
        const nextState = this.redoStack.pop();
        await this.applyState(nextState);
        this.updateHistoryButtonsUI();
    },

    async applyState(state) {
        this.isRestoringState = true;
        if (window.Saga.Core.dirHandle) {
            const targetFilenames = new Set(state.items.map(i => i.filename));
            for (const currentItem of [...window.Saga.Core.items]) {
                if (!targetFilenames.has(currentItem.filename)) {
                    await window.Saga.Core.deleteNodeData(currentItem.filename);
                }
            }
            for (const itemState of state.items) {
                await window.Saga.Core.saveNodeData(itemState.filename, itemState.data);
            }
            const regionsPayload = state.tramas.filter(t => t.type === 'Region');
            await window.Saga.Core.saveRegions(regionsPayload);
            await window.Saga.Core.scanFiles();
        } else {
            window.Saga.Core.tramas = state.tramas;
            window.Saga.Core.items = state.items.map(i => ({
                filename: i.filename,
                data: i.data,
                displayUrl: null
            }));
            window.Saga.Canvas.syncNodesFromCore();
        }
        this.isRestoringState = false;
    },

    updateHistoryButtonsUI() {
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');
        if (btnUndo) btnUndo.disabled = this.undoStack.length === 0;
        if (btnRedo) btnRedo.disabled = this.redoStack.length === 0;
    },

    async openFolder() {
        const name = await window.Saga.Core.openFolder();
        if (name) {
            document.getElementById('folder-label').innerText = name.toUpperCase();
            this.undoStack = [];
            this.redoStack = [];
            this.updateHistoryButtonsUI();
            await this.loadLoreDisplay();
        }
    },

    openRenderSettingsModal() {
        const settings = window.Saga.Comfy.getSettings();
        document.getElementById('cfg-render-steps').value = settings.steps;
        document.getElementById('cfg-render-width').value = settings.width;
        document.getElementById('cfg-render-height').value = settings.height;
        const currentPreset = `${settings.width}x${settings.height}`;
        const select = document.getElementById('cfg-render-preset');
        if ([...select.options].some(opt => opt.value === currentPreset)) {
            select.value = currentPreset;
        }
        document.getElementById('render-settings-modal').classList.remove('hidden');
    },

    closeRenderSettingsModal() {
        document.getElementById('render-settings-modal').classList.add('hidden');
    },

    handleRenderPresetChange(value) {
        if (!value) return;
        const [w, h] = value.split('x').map(Number);
        if (w && h) {
            document.getElementById('cfg-render-width').value = w;
            document.getElementById('cfg-render-height').value = h;
        }
    },

    saveRenderSettings() {
        const steps = parseInt(document.getElementById('cfg-render-steps').value, 10) || 6;
        const width = parseInt(document.getElementById('cfg-render-width').value, 10) || 1024;
        const height = parseInt(document.getElementById('cfg-render-height').value, 10) || 1024;
        window.Saga.Comfy.saveSettings({ steps, width, height });
        this.closeRenderSettingsModal();
    },

    async translateVisualPrompt() {
        const visualInput = document.getElementById('d-data-visual');
        const textToTranslate = visualInput.value.trim();
        if (!textToTranslate) return alert("No hay texto para traducir en el Visual Prompt.");

        const btn = document.getElementById('btn-translate-visual');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> TRADUCIENDO...';

        try {
            const translatedText = await window.Saga.Gemini.translateTextToEnglish(textToTranslate);
            if (translatedText) {
                visualInput.value = translatedText;
                this.autoSaveDataDrawer();
            }
        } catch (e) {
            alert("Error al traducir: " + e.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-language"></i> TRADUCIR A INGLÉS';
        }
    },

    updatePaintButtonUI() {
        const btn = document.getElementById('btn-drawer-ai-paint');
        if (!btn) return;
        const queueLength = window.Saga.Comfy.queue.length + (window.Saga.Comfy.isProcessing ? 1 : 0);
        if (queueLength > 0) {
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-clock"></i> EN COLA (${queueLength})`;
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> GENERAR CON IA';
        }
    },

    async paintDrawerNode() {
        const visualDesc = document.getElementById('d-data-visual').value.trim();
        const name = document.getElementById('d-data-name').value.trim();
        const prompt = visualDesc || name;
        if (!prompt) return alert("Introduce un nombre o un Visual Prompt.");

        let filename = window.app.editingFilename;
        if (!filename) {
            const cleanName = name ? name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'nuevo_dato';
            filename = `${cleanName}_${Date.now()}.json`;
            window.app.editingFilename = filename;
        }

        const targetFilename = filename;
        window.Saga.Comfy.enqueueGeneration(
            targetFilename,
            prompt,
            async (completedFilename, blob) => {
                this.pushState();
                await window.Saga.Core.saveImageBlob(completedFilename, blob);
                await window.Saga.Core.scanFiles();
                if (window.app.editingFilename === completedFilename) {
                    const item = window.Saga.Core.items.find(i => i.filename === completedFilename);
                    if (item && item.displayUrl) {
                        this.updateDrawerImagePreview(item.displayUrl);
                    }
                }
                this.updatePaintButtonUI();
            },
            (failedFilename, err) => {
                alert(`Error al generar imagen para ${failedFilename}: ` + err.message);
                this.updatePaintButtonUI();
            }
        );
        this.updatePaintButtonUI();
    },

    async handleLocalImageUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const name = document.getElementById('d-data-name').value.trim();
        let filename = window.app.editingFilename;
        if (!filename) {
            const cleanName = name ? name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'nuevo_dato';
            filename = `${cleanName}_${Date.now()}.json`;
            window.app.editingFilename = filename;
        }

        try {
            this.pushState();
            await window.Saga.Core.saveImageBlob(filename, file);
            await window.Saga.Core.scanFiles();
            const item = window.Saga.Core.items.find(i => i.filename === filename);
            if (item && item.displayUrl) {
                this.updateDrawerImagePreview(item.displayUrl);
            }
        } catch (e) {
            alert("Error al guardar la imagen local: " + e.message);
        }
    },

    updateDrawerImagePreview(url) {
        const imgEl = document.getElementById('drawer-data-img');
        const placeholder = document.getElementById('drawer-data-img-placeholder');
        if (url) {
            imgEl.src = url;
            imgEl.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            imgEl.src = '';
            imgEl.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    },

    openLightbox(src) {
        if (!src) return;
        document.getElementById('lightbox-img').src = src;
        document.getElementById('image-lightbox').classList.remove('hidden');
    },

    closeLightbox() {
        document.getElementById('image-lightbox').classList.add('hidden');
        document.getElementById('lightbox-img').src = '';
    },

    sortByName() {
        this.pushState();
        document.getElementById('ctx-menu').classList.add('hidden');
        window.Saga.Canvas.organizeNodesByName();
    },

    sortByTag() {
        this.pushState();
        document.getElementById('ctx-menu').classList.add('hidden');
        window.Saga.Canvas.organizeNodesByTag();
    },

    async sortByAI() {
        this.pushState();
        document.getElementById('ctx-menu').classList.add('hidden');
        await window.Saga.Canvas.organizeNodesByAI();
    },

    closeDrawer() {
        document.getElementById('side-drawer').classList.add('translate-x-full');
    },

    openDrawer(type) {
        const drawer = document.getElementById('side-drawer');
        const formData = document.getElementById('form-drawer-data');
        const formZone = document.getElementById('form-drawer-zone');
        const formGen = document.getElementById('form-drawer-generate');
        const formLore = document.getElementById('form-drawer-lore');
        const formChat = document.getElementById('form-drawer-chat');

        formData.classList.add('hidden');
        formZone.classList.add('hidden');
        formGen.classList.add('hidden');
        formLore.classList.add('hidden');
        if (formChat) formChat.classList.add('hidden');

        if (type === 'data') formData.classList.remove('hidden');
        else if (type === 'zone') formZone.classList.remove('hidden');
        else if (type === 'generate') formGen.classList.remove('hidden');
        else if (type === 'lore') formLore.classList.remove('hidden');
        else if (type === 'chat' && formChat) formChat.classList.remove('hidden');

        drawer.classList.remove('translate-x-full');
    },

    async openCreateDataDrawer() {
        document.getElementById('ctx-menu').classList.add('hidden');
        const worldPos = window.Saga.Canvas.ctxMenuWorldPos || { x: 100, y: 100 };
        const filename = `nuevo_dato_${Date.now()}.json`;

        const newEmptyData = {
            name: "Nuevo Dato",
            type: "Dato",
            tags: [],
            visualDesc: "",
            desc: "",
            imagen64: null,
            imageFile: null,
            connections: [],
            x: worldPos.x,
            y: worldPos.y
        };

        this.pushState();
        await window.Saga.Core.saveNodeData(filename, newEmptyData);
        await window.Saga.Core.scanFiles();

        document.getElementById('drawer-data-title').innerHTML = '<i class="fa-solid fa-cube text-blue-600"></i> EDITAR NUEVO DATO';
        document.getElementById('d-data-name').value = newEmptyData.name;
        document.getElementById('d-data-type').value = newEmptyData.type;
        document.getElementById('d-data-tags').value = "";
        document.getElementById('d-data-visual').value = "";
        document.getElementById('d-data-desc').value = "";
        this.updateDrawerImagePreview(null);

        window.app.editingFilename = filename;
        window.Saga.Canvas.selectedNodeId = filename;
        window.app.openDrawer('data');
    },

    openEditDataDrawer(input) {
        document.getElementById('ctx-menu').classList.add('hidden');
        document.getElementById('ctx-menu-node').classList.add('hidden');

        const filename = input.filename || input.id;
        const data = input.data || {
            name: input.title || '',
            type: input.type || 'Dato',
            tags: input.tags || [],
            desc: input.desc || '',
            visualDesc: input.visualDesc || ''
        };
        const displayUrl = input.displayUrl || null;

        document.getElementById('drawer-data-title').innerHTML = '<i class="fa-solid fa-database text-blue-600"></i> EDITAR DATO';
        document.getElementById('d-data-name').value = data.name || "";
        document.getElementById('d-data-type').value = data.type || "Dato";
        document.getElementById('d-data-tags').value = Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || "");
        document.getElementById('d-data-visual').value = data.visualDesc || "";
        document.getElementById('d-data-desc').value = data.desc || "";
        this.updateDrawerImagePreview(displayUrl);

        window.app.editingFilename = filename;
        window.app.openDrawer('data');
        this.updatePaintButtonUI();
    },

    editNodeFromCtx() {
        document.getElementById('ctx-menu-node').classList.add('hidden');
        const selectedId = window.Saga.Canvas.selectedNodeId;
        const coreItem = window.Saga.Core.items.find(i => i.filename === selectedId);
        if (coreItem) {
            this.openEditDataDrawer(coreItem);
        }
    },

    async duplicateNodeFromCtx() {
        document.getElementById('ctx-menu-node').classList.add('hidden');
        const selectedId = window.Saga.Canvas.selectedNodeId;
        const item = window.Saga.Core.items.find(i => i.filename === selectedId);
        if (!item) return;

        this.pushState();
        const dataPayload = JSON.parse(JSON.stringify(item.data));
        dataPayload.name = `${dataPayload.name} (Copia)`;
        dataPayload.x = (dataPayload.x || 100) + 30;
        dataPayload.y = (dataPayload.y || 100) + 30;

        const cleanName = dataPayload.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${cleanName}_${Date.now()}.json`;

        await window.Saga.Core.saveNodeData(filename, dataPayload);

        if (item.data.imageFile && window.Saga.Core.dirHandle) {
            try {
                const imgHandle = await window.Saga.Core.dirHandle.getFileHandle(item.data.imageFile);
                const imgFile = await imgHandle.getFile();
                await window.Saga.Core.saveImageBlob(filename, imgFile);
            } catch (e) {
                console.warn("No se pudo duplicar la imagen del nodo:", e);
            }
        }

        await window.Saga.Core.scanFiles();
    },

    async deleteNodeFromCtx() {
        document.getElementById('ctx-menu-node').classList.add('hidden');
        const selectedId = window.Saga.Canvas.selectedNodeId;
        if (!selectedId) return;

        this.pushState();
        await window.Saga.Core.deleteNodeData(selectedId);
        await window.Saga.Core.scanFiles();
        window.Saga.Canvas.selectedNodeId = null;
    },

    autoSaveDataDrawer() {
        const name = document.getElementById('d-data-name').value.trim() || "Sin nombre";
        const type = document.getElementById('d-data-type').value.trim() || "Dato";
        const tagsRaw = document.getElementById('d-data-tags').value;
        const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
        const visualDesc = document.getElementById('d-data-visual').value.trim();
        const desc = document.getElementById('d-data-desc').value.trim();

        let filename = window.app.editingFilename;
        if (!filename) return;

        const node = window.Saga.Canvas.nodes.find(n => n.id === filename);
        if (node) {
            node.title = name;
            node.type = type;
            node.tags = tags;
            node.visualDesc = visualDesc;
            node.desc = desc;
        }

        clearTimeout(this.autoSaveDataTimer);
        this.autoSaveDataTimer = setTimeout(async () => {
            const item = window.Saga.Core.items.find(i => i.filename === filename);
            const existingData = item ? item.data : {};
            const dataPayload = {
                ...existingData,
                name,
                type,
                tags,
                visualDesc,
                desc,
                imagen64: existingData.imagen64 || null,
                imageFile: existingData.imageFile || null,
                connections: existingData.connections || []
            };
            await window.Saga.Core.saveNodeData(filename, dataPayload);
        }, 300);
    },

    createRegionPrompt() {
        document.getElementById('ctx-menu').classList.add('hidden');
        const name = prompt("Nombre de la nueva Zona:", "Nueva Zona");
        if (!name) return;

        this.pushState();
        const worldPos = window.Saga.Canvas.ctxMenuWorldPos || { x: 100, y: 100 };

        window.Saga.Canvas.regions.push({
            id: 'region_' + Date.now(),
            name: name,
            x: worldPos.x,
            y: worldPos.y,
            w: 400,
            h: 300
        });

        window.Saga.Canvas.saveRegionsToCore();
    },

    openEditZoneDrawer(region) {
        document.getElementById('ctx-menu').classList.add('hidden');
        const zoneMenu = document.getElementById('ctx-menu-zone');
        if (zoneMenu) zoneMenu.classList.add('hidden');

        document.getElementById('d-zone-name').value = region.name;
        document.getElementById('d-zone-w').value = Math.round(region.w);
        document.getElementById('d-zone-h').value = Math.round(region.h);

        window.app.editingRegionId = region.id;
        window.app.openDrawer('zone');
    },

    editZoneFromCtx() {
        const zoneMenu = document.getElementById('ctx-menu-zone');
        if (zoneMenu) zoneMenu.classList.add('hidden');
        const selectedRegionId = window.Saga.Canvas.selectedRegionId;
        const region = window.Saga.Canvas.regions.find(r => r.id === selectedRegionId);
        if (region) {
            this.openEditZoneDrawer(region);
        }
    },

    async deleteZoneFromCtx() {
        const zoneMenu = document.getElementById('ctx-menu-zone');
        if (zoneMenu) zoneMenu.classList.add('hidden');
        const selectedRegionId = window.Saga.Canvas.selectedRegionId;
        if (!selectedRegionId) return;

        this.pushState();
        window.Saga.Canvas.regions = window.Saga.Canvas.regions.filter(r => r.id !== selectedRegionId);
        window.Saga.Canvas.saveRegionsToCore();
        window.Saga.Canvas.selectedRegionId = null;
    },

    autoSaveZoneDrawer() {
        const region = window.Saga.Canvas.regions.find(r => r.id === window.app.editingRegionId);
        if (!region) return;

        region.name = document.getElementById('d-zone-name').value.trim();
        region.w = parseFloat(document.getElementById('d-zone-w').value) || 400;
        region.h = parseFloat(document.getElementById('d-zone-h').value) || 300;

        clearTimeout(this.autoSaveZoneTimer);
        this.autoSaveZoneTimer = setTimeout(() => {
            window.Saga.Canvas.saveRegionsToCore();
        }, 300);
    }
};

window.onload = () => window.app.init();