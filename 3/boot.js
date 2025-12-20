// --- INICIALIZACIÓN DEL SISTEMA ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Renderizar iconos del escritorio
    renderDesktop();
    
    // 2. Renderizar sistema de archivos en el escritorio
    renderDesktopFiles();
    
    // 3. Inicializar iconos visuales
    if (window.lucide) lucide.createIcons();
});