/* SILENOS 3/window/window-gamebook.js */

function openGamebookWindow(fileId) {
    const file = FileSystem.getItem(fileId);
    if (!file) return;

    // 1. Verificar si ya está abierta
    const existing = openWindows.find(w => w.id === fileId);
    if (existing) { 
        if (existing.isMinimized) toggleMinimize(fileId); 
        focusWindow(fileId); 
        return; 
    }

    // 2. Incrementar Z-Index global
    if (typeof zIndexCounter === 'undefined') window.zIndexCounter = 100;
    zIndexCounter++;

    // 3. Crear Objeto de Ventana
    const winObj = { 
        id: fileId, 
        type: 'gamebook', 
        title: file.title || 'Librojuego', 
        icon: 'gamepad-2', 
        zIndex: zIndexCounter, 
        x: 100, 
        y: 80 
    };
    
    // 4. Crear DOM de la ventana (usamos un tamaño grande para el editor)
    // Asegúrate de que createWindowDOM esté disponible globalmente
    createWindowDOM(winObj, { width: 1100, height: 750 });
    openWindows.push(winObj);
    
    // 5. Inicializar el Gestor (Renderizar el contenido)
    // Usamos un pequeño timeout para asegurar que el DOM de la ventana existe
    setTimeout(() => {
        if (typeof GamebookManager !== 'undefined') {
            GamebookManager.renderInWindow(fileId, fileId);
        } else {
            console.error("GamebookManager no encontrado. Asegúrate de cargar 3/gamebook-manager.js");
            const content = document.querySelector(`#window-${fileId} .content-area`);
            if(content) content.innerHTML = '<div class="flex items-center justify-center h-full text-red-500 font-bold p-4 text-center">Error: GamebookManager no cargado.<br>Revisa los scripts del sistema.</div>';
        }
    }, 50);

    if (typeof renderDock === 'function') renderDock();
}