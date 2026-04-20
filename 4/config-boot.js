// --- CONFIG-BOOT.JS (INJECTOR) ---

(function initConfigButton() {
    // Esperar a que el DOM esté listo
    const checkDOM = setInterval(() => {
        const btn = document.getElementById('btn-sys-config');
        
        if (btn) {
            clearInterval(checkDOM);
            
            // Añadir comportamiento de apertura
            btn.addEventListener('click', () => {
                if (typeof ConfigWindowUI !== 'undefined') {
                    ConfigWindowUI.open();
                } else {
                    console.error("ConfigWindowUI not loaded");
                    alert("Error: UI Module missing");
                }
            });

            console.log("⚙️ Config Boot: System Config Button Bound");
        }
    }, 100);
})();