/* SILENOS 3/boot.js */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializar el Sistema de Archivos
    await FileSystem.init();

    // 2. Sincronizar la caché de entidades
    if (window.ThreeEntities) {
        ThreeEntities.updateFileCache();
    }

    // 3. Renderizar componentes visuales
    if (window.lucide) lucide.createIcons();
    if (typeof renderDock === 'function') renderDock();
    
    if (typeof refreshSystemViews === 'function') {
        refreshSystemViews();
    }

    console.log("H -> Confluencia de arranque completada.");
});

window.refreshSystemViews = function() {
    // 1. Sincronización con el motor 3D (si existe)
    if (window.ThreeEntities) {
        ThreeEntities.updateFileCache();
    }
    
    // 2. Disparar evento global de cambio en el sistema de archivos
    window.dispatchEvent(new Event('fs-data-changed'));
    
    // 3. Refrescar la capa de archivos del escritorio (iconos 2D)
    if (typeof renderDesktopFiles === 'function') {
        renderDesktopFiles();
    }
    
    // 4. Actualizar el contenido de todas las carpetas que estén abiertas en ventanas
    if (typeof openWindows !== 'undefined' && typeof renderFolderContent === 'function') {
        openWindows.forEach(win => {
            if (win.type === 'folder' && win.folderId) {
                renderFolderContent(win.id, win.folderId);
            }
        });
    }
    
    // 5. Refrescar otros componentes visuales (Dock y vistas auxiliares)
    if (typeof renderDock === 'function') renderDock();
    if (typeof refreshAllViews === 'function') refreshAllViews();

    console.log("H -> Coherencia de vistas sincronizada (Desktop, Folders & 3D).");
};