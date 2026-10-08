Object.assign(window.ComicPipeline, {
    dirHandle: null,
    // Reinicia la vinculación de carpeta
    resetSession() {
        this.dirHandle = null;
        this.updateFolderStatusUI(null);
    },
    updateFolderStatusUI(statusText) {
        const el = document.getElementById('folder-status');
        if (el) {
            el.innerText = statusText ? `  ${statusText}` : "Sin carpeta seleccionada";
            el.style.color = statusText ? "var(--accent)" : "var(--text-dim)";
        }
    },
    async selectProjectFolder() {
        try {
            const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
            if (!handle) return;
            
            this.dirHandle = handle;
            this.updateFolderStatusUI(handle.name);
            
            const loaded = await this.loadProjectFromFolder();
            if (loaded) {
                console.log(`[SAGA] Proyecto cargado desde: ${handle.name}`);
            } else {
                await this.autoSave();
            }
            if (typeof window.saveSettings === 'function') {
                window.saveSettings();
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                alert("Error al seleccionar carpeta: " + err.message);
            }
        }
    },
    async autoSave() {
        const autoSaveCheckbox = document.getElementById('comic-auto-save');
        if (autoSaveCheckbox && !autoSaveCheckbox.checked) return;
        if (!this.dirHandle) return;
        try {
            if ((await this.dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                return;
            }
            const projectData = this.collectFullProjectData();
            const fileHandle = await this.dirHandle.getFileHandle('saga_project.json', { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(projectData, null, 2));
            await writable.close();
            
            const now = new Date().toLocaleTimeString();
            this.updateFolderStatusUI(`${this.dirHandle.name} (Guardado ${now})`);
        } catch (err) {
            console.error("Error al auto-guardar en carpeta:", err);
        }
    },
    collectFullProjectData() {
        const rawBibleText = document.getElementById('comic-bible')?.value || '';
        const cleanBibleText = this.cleanBase64FromText ? this.cleanBase64FromText(rawBibleText) : rawBibleText;
        
        if (this.state && this.state.bible && this.cleanBibleObject) {
            this.state.bible = this.cleanBibleObject(this.state.bible);
        }
        return {
            geminiApiKey: document.getElementById('gemini-api-key')?.value || '',
            comfyUrl: document.getElementById('comfy-url')?.value || '',
            coverTitle: document.getElementById('comic-cover-title')?.value || '',
            plot: document.getElementById('comic-title')?.value || '',
            pages: document.getElementById('comic-pages')?.value || '2',
            includeCover: document.getElementById('comic-include-cover')?.checked ?? true,
            pageFormat: document.getElementById('comic-page-format')?.value || 'vertical',
            style: document.getElementById('comic-style')?.value || '',
            bibleRaw: cleanBibleText,
            comfySteps: document.getElementById('comfy-steps')?.value || '4',
            lang: document.getElementById('comic-lang')?.value || 'Español',
            state: this.state,
            savedAt: new Date().toISOString()
        };
    },
    async loadProjectFromFolder() {
        if (!this.dirHandle) return false;
        try {
            if ((await this.dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
                const perm = await this.dirHandle.requestPermission({ mode: 'readwrite' });
                if (perm !== 'granted') return false;
            }
            
            let fileHandle;
            try {
                fileHandle = await this.dirHandle.getFileHandle('saga_project.json');
            } catch (e) {
                return false; 
            }
            
            const file = await fileHandle.getFile();
            const text = await file.text();
            if (!text) return false;
            
            const data = JSON.parse(text);
            this.applyProjectData(data);
            return true;
        } catch (err) {
            console.error("Error al cargar proyecto:", err);
            return false;
        }
    },
    applyProjectData(data) {
        if (!data) return;
        if (data.geminiApiKey !== undefined) document.getElementById('gemini-api-key').value = data.geminiApiKey;
        if (data.comfyUrl !== undefined) document.getElementById('comfy-url').value = data.comfyUrl;
        if (data.coverTitle !== undefined) document.getElementById('comic-cover-title').value = data.coverTitle;
        if (data.plot !== undefined) document.getElementById('comic-title').value = data.plot;
        if (data.pages !== undefined) document.getElementById('comic-pages').value = data.pages;
        if (data.includeCover !== undefined) document.getElementById('comic-include-cover').checked = data.includeCover;
        if (data.pageFormat !== undefined) document.getElementById('comic-page-format').value = data.pageFormat;
        if (data.style !== undefined) document.getElementById('comic-style').value = data.style;
        if (data.bibleRaw !== undefined) {
            const cleanText = this.cleanBase64FromText ? this.cleanBase64FromText(data.bibleRaw) : data.bibleRaw;
            document.getElementById('comic-bible').value = cleanText;
        }
        if (data.comfySteps !== undefined) document.getElementById('comfy-steps').value = data.comfySteps;
        if (data.lang !== undefined) document.getElementById('comic-lang').value = data.lang;
        if (data.state) {
            this.state = data.state;
            if (this.state.imageScale) {
                const scaleSidebar = document.getElementById('comfy-image-scale');
                const scaleHeader = document.getElementById('comfy-image-scale-header');
                if (scaleSidebar) scaleSidebar.value = this.state.imageScale;
                if (scaleHeader) scaleHeader.value = this.state.imageScale;
            }
            if (this.cleanBibleObject && this.state.bible) {
                this.state.bible = this.cleanBibleObject(this.state.bible);
            }
            if (this.state.ingredients && this.renderIngredientsUI) {
                this.renderIngredientsUI();
            }
        }
        
        if (typeof window.saveSettings === 'function') {
            window.saveSettings();
        }
        if (this.state.bible) this.updateStepTag(0, 'completed');
        if (this.state.narrativeContext) this.updateStepTag(1, 'completed');
        if (this.state.script) this.updateStepTag(2, 'completed');
        if (this.state.prompts && this.state.prompts.length > 0) {
            this.updateStepTag(3, 'completed');
            this.renderGenerationUI();
        }
    },
    async saveImageToFolder(filename, dataUrl) {
        if (!this.dirHandle) return;
        try {
            if ((await this.dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') return;
            
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            
            const fileHandle = await this.dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (e) {
            console.error(`Error guardando ${filename}:`, e);
        }
    },
    async exportProjectJSON() {
        if (!this.state.prompts) return alert("No hay ningún proyecto activo para guardar.");
        
        await this.autoSave();
        const projectData = this.collectFullProjectData();
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
        const link = document.createElement('a');
        link.href = dataStr;
        link.download = "SAGA_Proyecto_Comic.json";
        link.click();
    }
});