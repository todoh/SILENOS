/* 3/js/config/models.js */
window.ModelManager = {
    init: function() {
        this.loadModelSettings();
        // Escuchar cambios externos también recarga modelos
        window.addEventListener('storage', () => {
            this.loadModelSettings();
        });
    },

    loadModelSettings: function() {
        if (!SERVICE) return;
        const config = SERVICE.state.config;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.value = val;
        };

        setVal('text-fast', config.textModelFast);
        setVal('text-slow', config.textModelSlow);
        setVal('img-fast', config.imageModelFast);
        setVal('img-slow', config.imageModelSlow);
    },

    saveModelSettings: function() {
        const newConfig = {
            textModelFast: document.getElementById('text-fast').value,
            textModelSlow: document.getElementById('text-slow').value,
            imageModelFast: document.getElementById('img-fast').value,
            imageModelSlow: document.getElementById('img-slow').value,
        };
        
        if(SERVICE) SERVICE.saveSettings(newConfig);
        
        // Feedback visual
        const btn = document.getElementById('btn-save-models');
        if(btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> GUARDADO';
            btn.classList.add('text-green-400');
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('text-green-400');
            }, 1000);
        }
    }
};