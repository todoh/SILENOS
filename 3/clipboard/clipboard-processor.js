/* SILENOS 3/clipboard/clipboard-processor.js */

const ClipboardProcessor = {
    handlers: [],

    /**
     * Registra un nuevo tipo de manejador. 
     */
    registerHandler(handler) {
        this.handlers.push(handler);
    },

    /**
     * Procesa datos externos. Ahora recibe el texto directo.
     */
    async processExternalPaste(text, items, destParentId) {
        // Primero intentamos con los handlers que procesan texto (Links, YouTube, etc)
        if (text) {
            for (const handler of this.handlers) {
                // Si el handler tiene el método canHandleText, lo usamos
                if (handler.canHandleText && handler.canHandleText(text)) {
                    const success = await handler.handleText(text, destParentId);
                    if (success) return; 
                }
            }
        }

        // Si no se manejó como texto, probamos con los items (imágenes/archivos)
        for (const item of items) {
            for (const handler of this.handlers) {
                if (handler.canHandle && await handler.canHandle(item)) {
                    const success = await handler.handle(item, destParentId);
                    if (success) break;
                }
            }
        }
    },

    processInternalPaste(ids, targetParentId, mouseX, mouseY) {
        if (typeof InternalPasteHandler !== 'undefined') {
            InternalPasteHandler.execute(ids, targetParentId, mouseX, mouseY);
        } else {
            console.error("InternalPasteHandler no cargado.");
        }
    }
};