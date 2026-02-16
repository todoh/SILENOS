// --- cronologia/storyboard.ui.js ---
// INTERFAZ DE STORYBOARD

const SbUI = {
    
    // Renderiza la "Biblia Visual" (Lista de propiedades extraídas)
    renderBible(bibleData) {
        const container = document.getElementById('visual-bible-container');
        if(!container) return; // Si no existe el contenedor en el HTML actual
        
        container.innerHTML = '';
        if(!bibleData || bibleData.length === 0) {
            container.innerHTML = '<div class="text-[10px] text-gray-400 italic">No hay datos visuales extraídos.</div>';
            return;
        }

        bibleData.forEach(item => {
            const el = document.createElement('div');
            el.className = "text-[10px] border-b border-gray-100 pb-2 mb-2 last:border-0";
            el.innerHTML = `
                <span class="font-bold text-indigo-600 block">${item.name}</span>
                <span class="text-gray-500 leading-tight block">${item.visual_tags}</span>
            `;
            container.appendChild(el);
        });
        
        // Mostrar el contenedor si estaba oculto
        document.getElementById('bible-panel').classList.remove('hidden');
    },

    // Abre el modal específico de Storyboard Input
    openStoryboardModal() {
        document.getElementById('storyboard-input-modal').classList.remove('hidden');
    }
};