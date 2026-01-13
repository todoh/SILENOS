/* SILENOS 3/boot.js */

// --- 0. INTERCEPTOR DE AUTENTICACIÓN (PUENTE/BRIDGE) ---
// Esto se ejecuta antes que nada. Si somos un popup de auth, enviamos la llave y cerramos.
(function() {
    try {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const keyFromUrl = hashParams.get('api_key');
        
        // Si hay API Key y tenemos un "opener" (ventana padre), somos el puente.
        if (keyFromUrl && window.opener) {
            console.log("🔑 [BOOT] Auth detectada. Transmitiendo al sistema principal...");
            window.opener.postMessage({ type: 'POLLI_AUTH_SUCCESS', key: keyFromUrl }, '*');
            
            // UI Feedback visual por si el cierre tarda
            document.body.innerHTML = `
                <div style="display:flex;height:100vh;justify-content:center;align-items:center;background:#111;color:#4ade80;font-family:monospace;flex-direction:column;text-align:center;">
                    <div style="font-size:40px;">✅</div>
                    <p>CONECTADO</p>
                    <p style="color:#666;font-size:12px;">Cerrando ventana...</p>
                </div>
            `;
            
            // Intentar cerrar la ventana
            setTimeout(() => window.close(), 500);
            
            // Detenemos la ejecución del resto de boot.js para no cargar todo el OS en el popup
            throw new Error("Auth Bridge Completed - Stopping Boot");
        }
    } catch (e) {
        if (e.message === "Auth Bridge Completed - Stopping Boot") return; // Salida limpia
        console.error("Error en Auth Bridge:", e);
    }
})();

// --- INICIO NORMAL DEL SISTEMA ---

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