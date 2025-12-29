/* SILENOS 3/clipboard/clipboard-processor.js */

const ClipboardProcessor = {
    handlers: [],

    /**
     * Registra un nuevo tipo de manejador. 
     * [MEJORA] Ahora acepta una prioridad (mayor número = se ejecuta antes).
     * Por defecto 10. YouTube/JSON usarán 10, Texto usará 0.
     */
    registerHandler(handler, priority = 10) {
        handler._priority = priority;
        this.handlers.push(handler);
        // Ordenamos descendente: los de mayor prioridad van primero
        this.handlers.sort((a, b) => b._priority - a._priority);
    },

    /**
     * Procesa datos externos. Ahora recibe el texto directo.
     * [MEJORA] Acepta mouseX y mouseY para posicionamiento preciso.
     * Devuelve true si algo fue procesado.
     */
    async processExternalPaste(text, items, destParentId, mouseX = null, mouseY = null) {
        let processed = false;

        // 1. PRIMER BARRIDO: Manejadores de TEXTO (Links, YouTube, JSON, Texto Plano)
        if (text) {
            for (const handler of this.handlers) {
                // Si el handler tiene capacidad de texto, lo probamos
                if (handler.canHandleText && handler.canHandleText(text)) {
                    // Pasamos las coordenadas al handler
                    const success = await handler.handleText(text, destParentId, mouseX, mouseY);
                    if (success) return true; // Detenemos si se manejó con éxito
                }
            }
        }

        // 2. SEGUNDO BARRIDO: Manejadores de ITEMS (Imágenes, Archivos binarios)
        // Solo si no se manejó como texto o si hay items específicos
        if (items && items.length > 0) {
            for (const item of items) {
                for (const handler of this.handlers) {
                    if (handler.canHandle && await handler.canHandle(item)) {
                        // Pasamos las coordenadas al handler
                        const success = await handler.handle(item, destParentId, mouseX, mouseY);
                        if (success) {
                            processed = true;
                            break; // Pasamos al siguiente item
                        }
                    }
                }
            }
        }

        return processed;
    },

    processInternalPaste(ids, targetParentId, mouseX, mouseY) {
        if (typeof InternalPasteHandler !== 'undefined') {
            InternalPasteHandler.execute(ids, targetParentId, mouseX, mouseY);
        } else {
            console.error("InternalPasteHandler no cargado.");
        }
    }
};