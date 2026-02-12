// --- CONFIG-BOOT.JS (INJECTOR) ---

(function initConfigButton() {
    // Esperar a que el DOM esté listo
    const checkDOM = setInterval(() => {
        const createBtn = document.getElementById('btn-create-folder');
        
        if (createBtn && createBtn.parentNode) {
            clearInterval(checkDOM);
            injectButton(createBtn);
        }
    }, 100);

    function injectButton(referenceBtn) {
        // Verificar si ya existe para no duplicar
        if (document.getElementById('btn-config')) return;

        const btn = document.createElement('button');
        btn.id = 'btn-config';
        btn.className = 'typo-mono text-xs hover:bg-black hover:text-white px-1 border border-transparent hover:border-black';
        btn.textContent = '[CFG]';
        btn.title = "System Configuration";
        
        // Insertar antes del botón de crear carpeta
        referenceBtn.parentNode.insertBefore(btn, referenceBtn);
        
        // Añadir comportamiento
        btn.addEventListener('click', () => {
            if (typeof ConfigWindowUI !== 'undefined') {
                ConfigWindowUI.open();
            } else {
                console.error("ConfigWindowUI not loaded");
                alert("Error: UI Module missing");
            }
        });

        console.log("⚙️ Config Boot: Button Injected");
    }
})();