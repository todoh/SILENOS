// --- datosstudio/tramas.ui.filters.js ---
// SISTEMA DE FILTRADO VISUAL EN EL CANVAS DE TRAMAS (Arquitectura Blindada)

window.TramasUI = window.TramasUI || {};
window.TramasUI.selectedNodeId = window.TramasUI.selectedNodeId || null;
window.TramasUI.expandTargetId = window.TramasUI.expandTargetId || null;

// Inyectamos dinámicamente la opción en el HTML si no existe (blindaje anti-modificación de DOM manual)
document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('filter-type');
    if (select && !select.querySelector('option[value="thread"]')) {
        const opt = document.createElement('option');
        opt.value = 'thread';
        opt.innerText = 'AISLAR HILO DE TRAMA';
        select.appendChild(opt);
    }
});

window.TramasUI.updateFilterUI = function() {
    const type = document.getElementById('filter-type').value;
    const valSelect = document.getElementById('filter-value');
    valSelect.innerHTML = '';
    
    if (type === 'pov') {
        window.app.items.forEach(item => {
            const title = item.data.name || item.name;
            valSelect.innerHTML += `<option value="${item.name}">${title}</option>`;
        });
        valSelect.classList.remove('hidden');
    } 
    // NUEVO MODO: Extraemos todos los hilos nombrados que existen en el canvas actual
    else if (type === 'thread') {
        const allThreads = window.app.tramas
            .filter(n => n.type !== 'Region' && n.threadName && n.threadName.trim() !== '')
            .map(n => n.threadName.trim());
        
        const uniqueThreads = [...new Set(allThreads)];
        
        if (uniqueThreads.length === 0) {
            valSelect.innerHTML = `<option value="">NO HAY HILOS CREADOS</option>`;
        } else {
            uniqueThreads.forEach(t => {
                valSelect.innerHTML += `<option value="${t}">${t.toUpperCase()}</option>`;
            });
        }
        valSelect.classList.remove('hidden');
    } 
    else {
        valSelect.classList.add('hidden');
    }
    this.applyFilter();
};

window.TramasUI.applyFilter = function() {
    const type = document.getElementById('filter-type').value;
    let value = null;
    
    if (type === 'pov' || type === 'thread') value = document.getElementById('filter-value').value;
    if (type === 'tension') value = 5;
    if (type === 'status') value = 'Completado';

    window.TramasCanvas.filterMode = type || null;
    window.TramasCanvas.filterValue = value;
    window.TramasCanvas.render();
};