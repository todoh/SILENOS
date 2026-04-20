// live gemini/narrative_studio.js
// ─── NARRATIVE STUDIO (GENERADOR DE PLANTILLAS Y LORE) ───────────────────

window.narrativeStudioUI = {
    currentData: {
        name: "Nueva_Plantilla",
        premise: "",
        start: "",
        idealEnd: "",
        characters: "",
        waypoints: "",
        protagonist: "",
        style: "",
        nodes: 50
    },
    currentFileHandle: null,
    _dragBound: false,
    _eventsBound: false,
    saveTimeout: null,

    open() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return;
        }
        const modal = document.getElementById('narrativeStudioModal');
        if (modal) {
            modal.classList.remove('hidden');
            if (typeof makeDraggable === 'function' && !this._dragBound) {
                makeDraggable(modal, document.getElementById('nsModalHeader'));
                this._dragBound = true;
            }
            this.bindEvents(); // Vincula inputs en vivo
            this.updateUI();
        }
    },

    close() {
        const modal = document.getElementById('narrativeStudioModal');
        if (modal) modal.classList.add('hidden');
    },

    // Sincronización bidireccional en tiempo real
    bindEvents() {
        if (this._eventsBound) return;
        const fields = ['name', 'premise', 'start', 'idealEnd', 'characters', 'waypoints', 'protagonist', 'style', 'nodes'];
        fields.forEach(f => {
            const el = document.getElementById(`nsInp_${f}`);
            if (el) {
                el.addEventListener('input', () => {
                    this.currentData[f] = f === 'nodes' ? parseInt(el.value) || 50 : el.value;
                    this.autoSave();
                });
            }
        });
        this._eventsBound = true;
    },

    updateUI() {
        const fields = ['name', 'premise', 'start', 'idealEnd', 'characters', 'waypoints', 'protagonist', 'style', 'nodes'];
        fields.forEach(f => {
            const el = document.getElementById(`nsInp_${f}`);
            if (el) el.value = this.currentData[f] || (f === 'nodes' ? 50 : '');
        });
    },

    readUI() {
        const fields = ['name', 'premise', 'start', 'idealEnd', 'characters', 'waypoints', 'protagonist', 'style', 'nodes'];
        fields.forEach(f => {
            const el = document.getElementById(`nsInp_${f}`);
            if (el) {
                this.currentData[f] = f === 'nodes' ? parseInt(el.value) || 50 : el.value;
            }
        });
    },

    async generateField(field) {
        if (!pollinationsKey) {
            if (typeof showToast === 'function') showToast('Conecta IA Pollinations primero', 'error');
            return;
        }
        
        this.readUI(); 

        // Bloqueo de UI y estado visual de "Cargando"
        const btn = document.querySelector(`button[onclick="narrativeStudioUI.generateField('${field}')"]`);
        let originalText = "✨ Generar (nova-fast)";
        if (btn) {
            originalText = btn.innerText;
            btn.innerText = "⏳ Generando...";
            btn.disabled = true;
            btn.style.opacity = "0.5";
        }

        if (typeof showToast === 'function') showToast(`Generando ${field} con nova-fast...`, 'listening');

        const systemPrompt = `Eres un experto creador de narrativas y game designer. Tu objetivo es generar contenido magistral para el campo "${field}" de una plantilla de historia interactiva o librojuego.
        Aquí está el estado actual de la plantilla para que mantengas coherencia absoluta:
        ${JSON.stringify(this.currentData, null, 2)}
        
        Instrucciones: Genera ÚNICAMENTE el texto que irá en el campo "${field}". Si hay información en otros campos, úsala para que todo encaje a la perfección. Sé creativo, inmersivo, profundo y directo. NUNCA devuelvas comillas adicionales al inicio o final, ni bloques de código markdown. Entrega solo la narrativa cruda.`;

        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${pollinationsKey}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    model: 'nova-fast', 
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: `Genera el contenido ideal para el campo: ${field}` }
                    ],
                    jsonMode: false,
                    seed: Math.floor(Math.random() * 99999)
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.choices && data.choices.length > 0) {
                    let result = data.choices[0].message.content.trim();
                    this.currentData[field] = result;
                    this.updateUI();
                    this.autoSave();
                    if (typeof showToast === 'function') showToast(`Campo ${field} generado ✓`, 'success');
                }
            } else {
                if (typeof showToast === 'function') showToast(`Error del servidor Pollinations`, 'error');
            }
        } catch(e) {
            console.error("Error generando campo:", e);
            if (typeof showToast === 'function') showToast(`Error al generar ${field}`, 'error');
        } finally {
            if (btn) {
                btn.innerText = originalText;
                btn.disabled = false;
                btn.style.opacity = "1";
            }
        }
    },

    autoSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if (this.currentFileHandle) {
                this._silentSave();
            }
        }, 1000);
    },

    async _silentSave() {
        if (!this.currentFileHandle) return;
        try {
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 4));
            await writable.close();
        } catch(e) {
            console.warn("Error silencioso en autoguardado de plantilla:", e);
        }
    },

    async saveTemplate() {
        if (!workspaceHandle) return;
        this.readUI();
        
        const safeName = (this.currentData.name || "SinNombre").replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `Plantilla_${safeName}.json`;
        
        try {
            // Reutiliza el handle si es el mismo, si no, crea uno nuevo
            if (!this.currentFileHandle || this.currentFileHandle.name !== filename) {
                this.currentFileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
            }
            const writable = await this.currentFileHandle.createWritable();
            await writable.write(JSON.stringify(this.currentData, null, 4));
            await writable.close();
            
            if (typeof showToast === 'function') showToast(`Plantilla guardada como ${filename}`, 'success');
            if (typeof ide !== 'undefined') ide.refreshTree(); 
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
        }
    },

    async loadTemplate() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return;
        }
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{description: 'JSON de Plantilla', accept: {'application/json': ['.json']}}]
            });
            const file = await fileHandle.getFile();
            const text = await file.text();
            const parsed = JSON.parse(text);
            
            this.currentData = { ...this.currentData, ...parsed };
            this.currentFileHandle = fileHandle; // Enlaza el archivo para el autoguardado
            this.updateUI();
            if (typeof showToast === 'function') showToast('Plantilla cargada correctamente', 'success');
        } catch(e) {
            console.warn("Carga de plantilla cancelada o fallida", e);
        }
    },

    async analyzeNarrative() {
        if (!pollinationsKey) {
            if (typeof showToast === 'function') showToast('Conecta IA Pollinations primero', 'error');
            return;
        }
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return;
        }

        this.readUI();
        if (typeof showToast === 'function') showToast('Analizando historia con nova-fast...', 'listening');

        const systemPrompt = `Eres un editor, guionista y consultor narrativo experto. Analiza la siguiente plantilla de historia interactiva/librojuego.
        OBJETIVO: Detectar huecos argumentales, problemas de ritmo, personajes planos o clichés. Devuelve una lista de sugerencias concretas y constructivas para mejorar y enriquecer la trama. Sé directo, profesional y muy crítico.`;

        const userPrompt = `Plantilla actual a analizar:\n${JSON.stringify(this.currentData, null, 2)}`;

        try {
            const res = await fetch(POLLINATIONS_API_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${pollinationsKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nova-fast',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    jsonMode: false,
                    seed: Math.floor(Math.random() * 99999)
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.choices && data.choices.length > 0) {
                    let result = data.choices[0].message.content.trim();
                    
                    const safeName = (this.currentData.name || "SinNombre").replace(/[^a-zA-Z0-9_-]/g, '_');
                    const filename = `Analisis_Narrativo_${safeName}_${Date.now()}.txt`;
                    const fileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(result);
                    await writable.close();
                    
                    if (typeof showToast === 'function') showToast(`Análisis guardado como ${filename}`, 'success');
                    
                    if (typeof visualizadorUI !== 'undefined') {
                        visualizadorUI.open(workspaceHandle);
                        visualizadorUI.openFilePreview(fileHandle);
                    }
                }
            } else {
                if (typeof showToast === 'function') showToast(`Error del servidor Pollinations`, 'error');
            }
        } catch(e) {
            console.error("Error analizando:", e);
            if (typeof showToast === 'function') showToast(`Error al analizar historia`, 'error');
        }
    }
};