/* 3/eye-pro-launcher.js - Diagnóstico y Lanzamiento */

(function() {
    console.log('Eye Pro Launcher: Inicializando...');

    function initLauncher() {
        const eyeTrigger = document.getElementById('launcher-btn') || document.getElementById('eye-pro-trigger');
        if (!eyeTrigger) {
            // Reintentar en un momento si el DOM no está listo
            setTimeout(initLauncher, 500);
            return;
        }

        console.log('Eye Pro Launcher: Botón detectado.');
        
        // Clonar para limpiar eventos previos
        const newTrigger = eyeTrigger.cloneNode(true);
        eyeTrigger.parentNode.replaceChild(newTrigger, eyeTrigger);
        
        const eyeIcon = newTrigger.querySelector('i');

        newTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Animación
            if (eyeIcon) {
                eyeIcon.style.transform = 'rotate(360deg)';
                eyeIcon.style.transition = 'transform 0.5s ease';
                setTimeout(() => { 
                    eyeIcon.style.transform = ''; 
                    eyeIcon.style.transition = ''; 
                }, 500);
            }

            console.log('Eye Pro: Click detectado. Buscando WindowManager...');

            // BUSQUEDA DEFENSA DEL WINDOW MANAGER
            let WM = null;
            if (typeof WindowManager !== 'undefined') {
                WM = WindowManager;
            } else if (window.WindowManager) {
                WM = window.WindowManager;
            }

            if (WM) {
                console.log('Eye Pro: WindowManager encontrado. Creando ventana...');
                
                // Centrado perfecto estilo HTML Window
                const w = 900;
                const h = 700;
                const x = (window.innerWidth - w) / 2;
                const y = (window.innerHeight - h) / 2;

                WM.createWindow('silenos', {
                    title: 'Configuración Silenos',
                    width: w,
                    height: h,
                    x: Math.max(0, x),
                    y: Math.max(0, y),
                    icon: 'eye'
                });
            } else {
                console.error('❌ ERROR FATAL: WindowManager es undefined.');
                console.log('Estado actual de window.WindowManager:', window.WindowManager);
                alert('Error Crítico: El sistema de ventanas (WindowManager) no se ha cargado. Verifica la consola (F12) para ver si hay errores de sintaxis en window-manager.js');
            }
        });
        
        // Efectos Hover
        newTrigger.addEventListener('mouseenter', () => { if(eyeIcon) eyeIcon.style.color = '#00ff00'; });
        newTrigger.addEventListener('mouseleave', () => { if(eyeIcon) eyeIcon.style.color = ''; });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLauncher);
    } else {
        initLauncher();
    }
})();