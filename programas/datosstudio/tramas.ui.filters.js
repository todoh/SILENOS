// --- datosstudio/tramas.ui.filters.js ---
// SISTEMA DE FILTRADO VISUAL EN EL CANVAS DE TRAMAS

window.TramasUI = window.TramasUI || {
    selectedNodeId: null,
    expandTargetId: null
};

Object.assign(window.TramasUI, {
    updateFilterUI() {
        const type = document.getElementById('filter-type').value;
        const valSelect = document.getElementById('filter-value');
        valSelect.innerHTML = '';
        
        if (type === 'pov') {
            app.items.forEach(item => {
                const title = item.data.name || item.name;
                valSelect.innerHTML += `<option value="${item.name}">${title}</option>`;
            });
            valSelect.classList.remove('hidden');
        } else {
            valSelect.classList.add('hidden');
        }
        this.applyFilter();
    },

    applyFilter() {
        const type = document.getElementById('filter-type').value;
        let value = null;
        if (type === 'pov') value = document.getElementById('filter-value').value;
        if (type === 'tension') value = 5;
        if (type === 'status') value = 'Completado';

        window.TramasCanvas.filterMode = type || null;
        window.TramasCanvas.filterValue = value;
        window.TramasCanvas.render();
    }
});