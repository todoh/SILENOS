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
    // 1. Notificar y forzar actualización inmediata en el motor 3D
    if (window.ThreeEntities) {
        ThreeEntities.updateFileCache();
    }
    window.dispatchEvent(new Event('fs-data-changed'));
    
    // 2. Refrescar carpetas abiertas (2D)
    if (typeof refreshAllViews === 'function') refreshAllViews();
    
    // 3. Actualizar Dock
    if (typeof renderDock === 'function') renderDock();
    
    // 4. Limpiar capa 2D residual si existe
    if (typeof renderDesktopFiles === 'function') renderDesktopFiles();

    console.log("H -> Coherencia de vistas sincronizada.");
};