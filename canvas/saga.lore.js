// SAGA - ENGINE DE GESTIÓN Y SÍNTESIS DE LORE GLOBAL
window.Saga = window.Saga || {};
window.Saga.Lore = {
    loreData: {
        resumenGeneral: "",
        faccionesYPersonajes: "",
        tecnologiaYMagia: "",
        cronologia: "",
        conflictos: "",
        geografiaYAsentamientos: "",
        misteriosYLeyendas: "",
        glosarioYTerminologia: ""
    },

    async loadLore() {
        if (!window.Saga.Core.dirHandle) return this.loreData;
        try {
            let handle = null;
            try {
                handle = await window.Saga.Core.dirHandle.getFileHandle('LORE_GLOBAL.json', { create: false });
            } catch (fileErr) {
                return this.loreData;
            }
            if (handle) {
                const file = await handle.getFile();
                const text = await file.text();
                if (text && text.trim()) {
                    this.loreData = { ...this.loreData, ...JSON.parse(text) };
                }
            }
        } catch (e) {
            console.error("Error al leer LORE_GLOBAL.json:", e);
        }
        return this.loreData;
    },

    async saveLore(newLoreData) {
        this.loreData = { ...this.loreData, ...newLoreData };
        if (!window.Saga.Core.dirHandle) return;
        try {
            const handle = await window.Saga.Core.dirHandle.getFileHandle('LORE_GLOBAL.json', { create: true });
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(this.loreData, null, 2));
            await writable.close();
        } catch (e) {
            console.error("Error al guardar LORE_GLOBAL.json:", e);
        }
    },

    getLoreContext() {
        return ` === LORE GLOBAL DEL MUNDO ===
[RESUMEN GENERAL]: ${this.loreData.resumenGeneral || 'Sin definir'}
[FACCIONES Y PERSONAJES]: ${this.loreData.faccionesYPersonajes || 'Sin definir'}
[TECNOLOGÍA Y MAGIA]: ${this.loreData.tecnologiaYMagia || 'Sin definir'}
[CRONOLOGÍA]: ${this.loreData.cronologia || 'Sin definir'}
[CONFLICTOS Y TRAMAS]: ${this.loreData.conflictos || 'Sin definir'}
[GEOGRAFÍA Y ASENTAMIENTOS]: ${this.loreData.geografiaYAsentamientos || 'Sin definir'}
[MISTERIOS Y LEYENDAS]: ${this.loreData.misteriosYLeyendas || 'Sin definir'}
[GLOSARIO Y TERMINOLOGÍA]: ${this.loreData.glosarioYTerminologia || 'Sin definir'}
=============================`.trim();
    },

    async executeLoreAgentMode(mode, onProgress = null) {
        const apiKey = window.Saga.Gemini.getApiKey();
        if (!apiKey) throw new Error("API Key de Gemini no configurada.");
        await this.loadLore();
        const allItems = window.Saga.Core.items.map(i => i.data);
        const existingLore = mode === 'zero' ? null : this.loreData;
        const updatedLore = await window.Saga.Agents.runLoreSynthesisAgent(
            allItems,
            existingLore,
            mode,
            (statusText) => {
                if (onProgress) {
                    onProgress(statusText, this.loreData);
                }
            }
        );
        await this.saveLore(updatedLore);
        return updatedLore;
    }
};