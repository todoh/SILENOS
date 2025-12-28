/* SILENOS 3/clipboard/clipboard-manager.js */

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

// Evento Global de Pegado (Externo)
document.addEventListener('paste', (e) => {
    let destParentId = 'desktop';
    
    // Detectar ventana activa para pegar dentro
    if (typeof openWindows !== 'undefined' && openWindows.length > 0) {
        const activeWin = [...openWindows].sort((a, b) => b.zIndex - a.zIndex).find(w => !w.isMinimized);
        if (activeWin && activeWin.type === 'folder') {
            destParentId = activeWin.folderId;
        }
    }

    // EXTRAER DATOS INMEDIATAMENTE (Síncrono)
    // Extraemos el texto plano y los archivos antes de que el evento expire
    const text = e.clipboardData.getData('text/plain');
    const items = Array.from(e.clipboardData.items);

    // Delegamos al procesador pasando ya los datos extraídos
    ClipboardProcessor.processExternalPaste(text, items, destParentId);
    
    if (typeof refreshSystemViews === 'function') {
        // Pequeño delay para asegurar que el FS se guardó
        setTimeout(refreshSystemViews, 100);
    }
});

/**
 * Maneja el pegado interno (duplicación de items del sistema)
 */
function handlePasteAction(targetParentId, mouseX, mouseY) {
    const ids = SystemClipboard.getIds();
    if (ids.length === 0) return;

    FileSystem.init();
    ClipboardProcessor.processInternalPaste(ids, targetParentId, mouseX, mouseY);
    
    FileSystem.save();
    if (typeof refreshSystemViews === 'function') refreshSystemViews();
}