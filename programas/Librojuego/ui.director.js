// Objeto Controlador del Director de Juego
window.UIDirector = {
    openModal(nodeId, branchesCount) {
        document.getElementById('director-node-id').value = nodeId;
        document.getElementById('director-branches').value = branchesCount;

        // Limpiar y llenar los pines de gravedad
        const select = document.getElementById('director-pin-select');
        select.innerHTML = '<option value="">Ninguno (Exploración Libre)</option>';
        
        const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
        const pins = allNodes.filter(n => n.isPin);
        
        pins.forEach(pin => {
            // No podemos hacer que el destino sea el mismo nodo en el que estamos
            if (pin.id !== nodeId) {
                const pinName = pin.pinName || pin.id;
                select.innerHTML += `<option value="${pinName}">📍 ${pinName}</option>`;
            }
        });

        // Resetear sliders a 50 por defecto
        ['tension', 'mystery', 'action'].forEach(type => {
            const slider = document.getElementById(`slider-${type}`);
            const valLabel = document.getElementById(`val-${type}`);
            if (slider && valLabel) {
                slider.value = 50;
                valLabel.innerText = "50%";
            }
        });

        const modal = document.getElementById('ai-director-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeModal() {
        const modal = document.getElementById('ai-director-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    executeAI() {
        const nodeId = document.getElementById('director-node-id').value;
        const branchesCount = parseInt(document.getElementById('director-branches').value);
        
        const config = {
            targetPin: document.getElementById('director-pin-select').value,
            distance: document.getElementById('director-distance').value,
            tension: document.getElementById('slider-tension').value,
            mystery: document.getElementById('slider-mystery').value,
            action: document.getElementById('slider-action').value
        };

        this.closeModal();
        
        // Llamamos a la función de la IA pasándole nuestra configuración
        if (typeof AIContext !== 'undefined' && AIContext.bifurcateWithDirectorAI) {
            AIContext.bifurcateWithDirectorAI(nodeId, branchesCount, config);
        } else {
            alert("Error: AIContext.bifurcateWithDirectorAI no encontrada.");
        }
    }
};