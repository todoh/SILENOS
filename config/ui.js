/* 3/js/config/ui.js */
window.UIManager = {
    init: function() {
        this.setupTabs();
        this.setupEffects();
    },

    setupTabs: function() {
        const tabs = document.querySelectorAll('.nav-tab');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const targetId = tab.dataset.target;
                this.switchTab(targetId);
            });
        });

        // Activar pestaña por defecto (General)
        this.switchTab('general');
    },

    switchTab: function(tabId) {
        // 1. Ocultar todas las secciones
        document.querySelectorAll('.config-section').forEach(section => {
            section.classList.add('hidden');
            section.classList.remove('animate-fade-in');
        });

        // 2. Desactivar todos los botones
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('bg-indigo-600', 'text-white', 'shadow-lg');
            tab.classList.add('text-slate-400', 'hover:bg-slate-800');
        });

        // 3. Mostrar sección activa
        const activeSection = document.getElementById(`section-${tabId}`);
        if (activeSection) {
            activeSection.classList.remove('hidden');
            // Pequeño timeout para reiniciar animación CSS si fuera necesario
            setTimeout(() => activeSection.classList.add('animate-fade-in'), 10);
        }

        // 4. Activar botón
        const activeTab = document.querySelector(`.nav-tab[data-target="${tabId}"]`);
        if (activeTab) {
            activeTab.classList.remove('text-slate-400', 'hover:bg-slate-800');
            activeTab.classList.add('bg-indigo-600', 'text-white', 'shadow-lg');
        }

        window.ConfigState.currentTab = tabId;
    },

    setupEffects: function() {
        // Efectos visuales adicionales si se requieren
    }
};