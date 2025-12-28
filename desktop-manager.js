/* SILENOS 3/desktop-manager.js - GESTIÓN DE ETIQUETAS Y RENOMBRADO */

// 1. Función que dibuja los archivos y sus nombres en el escritorio
function renderDesktopFiles() {
    let container = document.getElementById('desktop-files-layer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'desktop-files-layer';
        container.className = 'absolute inset-0 pointer-events-none z-0'; 
        document.body.appendChild(container); 
    }
    container.innerHTML = ''; // Limpieza para evitar duplicados

    const files = FileSystem.getItems('desktop');

    files.forEach(file => {
        const el = document.createElement('div');
        el.className = `absolute flex flex-col items-center gap-2 w-24 cursor-pointer pointer-events-auto ${file.type === 'folder' ? 'folder-drop-zone' : ''}`;
        el.style.left = `${file.x}px`;
        el.style.top = `${file.y}px`;
        el.dataset.id = file.id;

        el.onmousedown = (e) => {
            if (e.target.tagName !== 'INPUT') startIconDrag(e, file.id, 'desktop');
        };

        let iconContent = `<i data-lucide="${file.icon}" class="${file.color} w-8 h-8"></i>`;
        if (file.type === 'image' && file.content) {
            iconContent = `<img src="${file.content}" class="w-full h-full object-cover rounded-xl shadow-inner pointer-events-none">`;
        }

        // El SPAN es el encargado de mostrar el nombre y activar el renombrado
        el.innerHTML = `
            <div class="desktop-icon-btn hover:scale-105 transition-transform bg-[#e0e5ec]/80 backdrop-blur-sm overflow-hidden p-0">
                ${iconContent}
            </div>
            <span 
                class="text-xs font-bold text-gray-700 text-center bg-white/30 px-2 py-0.5 rounded backdrop-blur-sm hover:bg-white/60 transition-colors select-none"
                onmousedown="event.stopPropagation()" 
                onclick="showRenameModal(event, '${file.id}', '${file.title}')"
            >
                ${file.title}
            </span>
        `;
        container.appendChild(el);
    });
    
    if (window.lucide) lucide.createIcons();
}

// 2. Función que abre el editor de nombres y guarda los cambios
window.showRenameModal = function(e, itemId, currentName) {
    e.stopPropagation();
    const existing = document.getElementById('rename-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'rename-modal';
    modal.className = 'fixed z-[9999] bg-[#e0e5ec]/90 backdrop-blur border border-white/50 shadow-xl rounded-xl p-2 flex items-center gap-2 pop-in';
    
    const x = Math.min(e.clientX + 10, window.innerWidth - 220);
    const y = Math.min(e.clientY - 20, window.innerHeight - 60);
    modal.style.left = `${x}px`;
    modal.style.top = `${y}px`;

    modal.innerHTML = `
        <input type="text" id="rename-input" value="${currentName}" 
               class="bg-transparent border-none outline-none text-sm font-medium text-gray-700 w-40 placeholder-gray-400"
               autocomplete="off">
        <button id="rename-save" class="text-green-600 hover:text-green-700"><i data-lucide="check" class="w-4 h-4"></i></button>
        <button id="rename-cancel" class="text-red-500 hover:text-red-600"><i data-lucide="x" class="w-4 h-4"></i></button>
    `;

    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();

    const input = document.getElementById('rename-input');
    input.focus();
    input.select();

    const save = () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            // Actualizamos la materia en el FileSystem
            FileSystem.updateItem(itemId, { title: newName });
            // Forzamos la actualización de todas las vistas (incluyendo el escritorio)
            if (typeof window.refreshSystemViews === 'function') {
                window.refreshSystemViews();
            }
        }
        modal.remove();
    };

    document.getElementById('rename-save').onclick = save;
    document.getElementById('rename-cancel').onclick = () => modal.remove();
    
    input.addEventListener('keydown', (k) => {
        if (k.key === 'Enter') save();
        if (k.key === 'Escape') modal.remove();
    });

    setTimeout(() => {
        document.addEventListener('click', function onClickOutside(ev) {
            if (!modal.contains(ev.target) && ev.target !== input) {
                modal.remove();
                document.removeEventListener('click', onClickOutside);
            }
        }, { once: true });
    }, 100);
};