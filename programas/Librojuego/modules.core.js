// Archivo: Librojuego/modules.core.js

window.Modules = {
    registry: {},

    register(type, moduleDefinition) {
        this.registry[type] = moduleDefinition;
    },

    // Para el Web Player interactivo
    renderWeb(eff, containerId) {
        if (this.registry[eff.type] && this.registry[eff.type].renderWeb) {
            this.registry[eff.type].renderWeb(eff, containerId);
            return true;
        }
        return false;
    },

    // Para la exportación a HTML Imprimible
    renderPrintHTML(eff) {
        if (this.registry[eff.type] && this.registry[eff.type].renderPrintHTML) {
            return this.registry[eff.type].renderPrintHTML(eff);
        }
        return "";
    },

    // Para la exportación a DOCX
    getDocxElements(eff, docxLib) {
        if (this.registry[eff.type] && this.registry[eff.type].getDocxElements) {
            return this.registry[eff.type].getDocxElements(eff, docxLib);
        }
        return [];
    }
};