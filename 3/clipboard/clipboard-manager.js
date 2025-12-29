/* SILENOS 3/clipboard-manager.js */

const SystemClipboard = {
    ids: [],
    sourceMode: 'copy',

    copy(ids) {
        this.ids = [...ids];
        this.sourceMode = 'copy';
        console.log("Portapapeles: Copiado", this.ids);
    },

    hasItems() { return this.ids.length > 0; },
    getIds() { return this.ids; }
};

// Evento Global de Pegado (Teclado: Ctrl+V)
document.addEventListener('paste', async (e) => {
    let destParentId = 'desktop';
    
    // Detectar ventana activa para pegar dentro
    if (typeof openWindows !== 'undefined' && openWindows.length > 0) {
        const activeWin = [...openWindows].sort((a, b) => b.zIndex - a.zIndex).find(w => !w.isMinimized);
        if (activeWin && activeWin.type === 'folder') {
            destParentId = activeWin.folderId;
        }
    }

    // EXTRAER DATOS INMEDIATAMENTE (Síncrono)
    const text = e.clipboardData.getData('text/plain');
    const items = Array.from(e.clipboardData.items);

    // Delegamos al procesador y ESPERAMOS a que termine realmente
    await ClipboardProcessor.processExternalPaste(text, items, destParentId);
    
    // Ahora que estamos seguros de que la importación terminó, refrescamos
    if (typeof refreshSystemViews === 'function') {
        refreshSystemViews();
    }
});

/**
 * Maneja el pegado interno (duplicación de items del sistema - Iconos)
 */
function handlePasteAction(targetParentId, mouseX, mouseY) {
    const ids = SystemClipboard.getIds();
    if (ids.length === 0) return;

    FileSystem.init();
    ClipboardProcessor.processInternalPaste(ids, targetParentId, mouseX, mouseY);
    
    FileSystem.save();
    if (typeof refreshSystemViews === 'function') refreshSystemViews();
}
 
/**
 * [NUEVO] Acción para invocar el pegado externo desde UI (Menú Contextual)
 * Usa la API moderna del portapapeles (navigator.clipboard)
 * CORRECCIÓN: Acepta mouseX y mouseY para posicionamiento
 */
window.handleExternalPasteAction = async function(destParentId, mouseX = null, mouseY = null) {
    if (!navigator.clipboard) {
        console.error("Clipboard API no disponible en este contexto (requiere HTTPS o localhost).");
        if (typeof showNotification === 'function') showNotification("API Portapapeles no disponible");
        return;
    }

    try {
        let pastedSomething = false;

        // 1. Intentar leer TEXTO (Prioritario para JSON, YouTube, Texto plano)
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().length > 0) {
                console.log("📋 Pegado externo UI: Texto detectado.");
                // Pasamos las coordenadas al procesador
                await ClipboardProcessor.processExternalPaste(text, [], destParentId, mouseX, mouseY);
                pastedSomething = true;
            }
        } catch (e) {
            console.log("Lectura de texto saltada o vacía.");
        }

        // 2. Si no hubo texto, o para complementar, intentamos leer ITEMS (Imágenes)
        if (!pastedSomething) {
            try {
                const clipboardItems = await navigator.clipboard.read();
                const mockItems = [];

                for (const item of clipboardItems) {
                    // Buscamos tipos de imagen soportados
                    const imageType = item.types.find(t => t.startsWith('image/'));
                    if (imageType) {
                        const blob = await item.getType(imageType);
                        // Creamos un objeto similar a DataTransferItem para reutilizar ClipboardProcessor
                        mockItems.push({
                            kind: 'file',
                            type: imageType,
                            getAsFile: () => new File([blob], "imagen_externa", { type: imageType })
                        });
                    }
                }

                if (mockItems.length > 0) {
                    console.log("📋 Pegado externo UI: Imágenes detectadas.");
                    // Pasamos las coordenadas al procesador
                    await ClipboardProcessor.processExternalPaste(null, mockItems, destParentId, mouseX, mouseY);
                    pastedSomething = true;
                }
            } catch (e) {
                console.warn("No se pudieron leer items binarios del portapapeles:", e);
            }
        }

        if (pastedSomething) {
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            if (typeof showNotification === 'function') showNotification("Contenido pegado correctamente");
        } else {
            if (typeof showNotification === 'function') showNotification("Portapapeles vacío o formato no reconocido");
        }

    } catch (err) {
        console.error("Error general en pegado externo:", err);
        if (typeof showNotification === 'function') showNotification("Error al acceder al portapapeles");
    }
};