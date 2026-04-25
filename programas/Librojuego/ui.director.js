// Archivo: Librojuego/ui.director.js

window.UIDirector = {
    openModal(nodeId, branchesCount) {
        document.getElementById('director-node-id').value = nodeId;
        document.getElementById('director-branches').value = branchesCount;

        const select = document.getElementById('director-pin-select');
        select.innerHTML = '<option value="">Ninguno (Exploración Libre)</option>';
        
        const allNodes = Core.book?.nodes || Core.bookData?.nodes || [];
        const pins = allNodes.filter(n => n.isPin);
        
        pins.forEach(pin => {
            if (pin.id !== nodeId) {
                const pinName = pin.pinName || pin.id;
                select.innerHTML += `<option value="${pinName}">📍 ${pinName}</option>`;
            }
        });

        // Limpiar directriz manual si existe
        const customGuidance = document.getElementById('director-custom-prompt');
        if (customGuidance) {
            customGuidance.value = "";
        }

        // Inyectar Botón Auto de forma dinámica si no existe
        let autoContainer = document.getElementById('director-auto-container');
        if(!autoContainer) {
            const slidersContainer = document.getElementById('slider-tension').parentElement.parentElement;
            slidersContainer.insertAdjacentHTML('afterbegin', `
                <div id="director-auto-container" class="flex items-center justify-between bg-indigo-50 border border-indigo-200 p-3 rounded-xl mb-4">
                    <span class="text-[10px] font-bold uppercase text-indigo-700"><i class="fa-solid fa-robot"></i> Dejar que la IA decida la atmósfera (Auto)</span>
                    <input type="checkbox" id="director-auto-mode" class="cursor-pointer w-4 h-4 accent-indigo-600" onchange="UIDirector.toggleAutoMode()">
                </div>
            `);
        }

        ['tension', 'mystery', 'action'].forEach(type => {
            const slider = document.getElementById(`slider-${type}`);
            const valLabel = document.getElementById(`val-${type}`);
            if (slider && valLabel) {
                slider.value = 50;
                slider.disabled = false;
                slider.classList.remove('opacity-50');
                valLabel.innerText = "50%";
            }
        });
        
        if(document.getElementById('director-auto-mode')) {
            document.getElementById('director-auto-mode').checked = false;
        }

        const modal = document.getElementById('ai-director-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    toggleAutoMode() {
        const isAuto = document.getElementById('director-auto-mode').checked;
        ['tension', 'mystery', 'action'].forEach(type => {
            const slider = document.getElementById(`slider-${type}`);
            if (slider) {
                slider.disabled = isAuto;
                slider.classList.toggle('opacity-50', isAuto);
            }
        });
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
            autoMode: document.getElementById('director-auto-mode')?.checked || false,
            tension: document.getElementById('slider-tension').value,
            mystery: document.getElementById('slider-mystery').value,
            action: document.getElementById('slider-action').value,
            customGuidance: document.getElementById('director-custom-prompt')?.value || ""
        };

        this.closeModal();
        
        if (typeof AIContext !== 'undefined' && AIContext.bifurcateWithDirectorAI) {
            AIContext.bifurcateWithDirectorAI(nodeId, branchesCount, config);
        } else {
            alert("Error: AIContext.bifurcateWithDirectorAI no encontrada.");
        }
    }
};