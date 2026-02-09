/* 3/window/window-silenos.js - Versión DESBLOQUEADA */

(function() {
    window.WindowSilenos = {
        render: function(winId) {
            const winEl = document.getElementById(`window-${winId}`);
            if (!winEl) return;

            const contentArea = winEl.querySelector('.content-area');
            if (!contentArea) return;

            // 1. LIMPIEZA
            contentArea.innerHTML = '';
            
            // 2. FORZAR INTERACTIVIDAD (Desbloqueo)
            contentArea.style.pointerEvents = "auto"; 
            contentArea.style.userSelect = "text";

            // 3. CREAR IFRAME
            const iframe = document.createElement('iframe');
            iframe.src = "SILEN.html"; // Carga el panel de configuración
            
            // Estilos críticos para evitar bordes blancos o bloqueos
            iframe.className = "w-full h-full border-none";
            iframe.style.display = "block";
            iframe.style.backgroundColor = "#0f172a"; // Fondo oscuro por defecto
            
            // Permisos completos
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; microphone; camera');
            
            // 4. INSERCIÓN
            contentArea.appendChild(iframe);
            
            console.log(`WindowSilenos: Ventana ${winId} desbloqueada y cargada.`);
        }
    };
})();