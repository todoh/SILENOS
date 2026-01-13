/* SILENOS 3/desktop-manager.js */

// --- HELPERS ESTRUCTURALES (Separación de Lógica) ---

/**
 * Crea un objeto ligero (Proxy) desvinculado de la referencia pesada del FileSystem.
 * Solo transporta lo necesario para la visualización.
 */
function createDesktopProxy(file) {
    return {
        id: file.id,
        x: file.x,
        y: file.y,
        type: file.type,
        title: file.title,
        icon: file.icon,
        color: file.color,
        // ESTRATEGIA DE PROXY: Solo pasamos contenido si es estrictamente necesario (imágenes)
        // Todo lo demás se anula para liberar memoria en el renderizado.
        content: (file.type === 'image') ? file.content : null
    };
}

/**
 * Genera el DOM basándose EXCLUSIVAMENTE en el proxy.
 * No tiene acceso al objeto file original.
 */
function renderProxyItem(container, fileProxy) {
    const el = document.createElement('div');
    el.className = `absolute flex flex-col items-center gap-2 w-24 cursor-pointer pointer-events-auto ${fileProxy.type === 'folder' ? 'folder-drop-zone' : ''}`;
    el.style.left = `${fileProxy.x}px`;
    el.style.top = `${fileProxy.y}px`;
    el.dataset.id = fileProxy.id;

    el.onmousedown = (e) => {
        // Usamos el ID del proxy para iniciar el arrastre
        if (e.target.tagName !== 'INPUT') {
            if (typeof window.startIconDrag === 'function') {
                window.startIconDrag(e, fileProxy.id, 'desktop');
            }
        }
    };

    // --- LÓGICA DE ICONO DINÁMICO ---
    let iconContent = '';
    
    if (fileProxy.type === 'image' && fileProxy.content) {
        iconContent = `<img src="${fileProxy.content}" class="w-full h-full object-cover rounded-xl shadow-inner pointer-events-none">`;
    } else if (fileProxy.type === 'html') {
        iconContent = `
            <div class="w-full h-full flex items-center justify-center font-black text-3xl select-none ${fileProxy.color || 'text-orange-500'}">
                ${fileProxy.icon || 'H'}
            </div>`;
    } else {
        iconContent = `<i data-lucide="${fileProxy.icon}" class="${fileProxy.color} w-7 h-7"></i>`;
    }

    // Estructura visual
    el.innerHTML = `
        <div class="desktop-icon-btn w-12 h-12 rounded-xl hover:scale-105 transition-transform bg-[#e0e5ec]/80 backdrop-blur-sm overflow-hidden p-0 flex items-center justify-center border border-white/40 shadow-sm">
            ${iconContent}
        </div>
        <span 
            class="text-xs font-bold text-gray-700 text-center bg-white/30 px-2 py-0.5 rounded backdrop-blur-sm hover:bg-white/60 transition-colors select-none"
            onmousedown="event.stopPropagation()" 
            onclick="showRenameModal(event, '${fileProxy.id}', '${fileProxy.title}')"
        >
            ${fileProxy.title}
        </span>
    `;
    
    container.appendChild(el);
}


// --- FUNCIÓN PRINCIPAL EXPORTADA ---

window.renderDesktopFiles = function() {
    let container = document.getElementById('desktop-files-layer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'desktop-files-layer';
        container.className = 'absolute inset-0 pointer-events-none z-0'; 
        document.body.appendChild(container); 
    }
    container.innerHTML = ''; 

    // 1. Obtención de datos crudos
    const files = FileSystem.getItems('desktop');

    // 2. FASE DE PROXY (Procesamiento de datos puro)
    // Mapeamos primero para liberar referencias al objeto 'file' original antes de tocar el DOM
    const proxies = files.map(createDesktopProxy);

    // 3. FASE DE RENDERIZADO (Manifestación visual)
    // Iteramos sobre los proxies ya limpios
    proxies.forEach(proxy => {
        renderProxyItem(container, proxy);
    });
    
    if (window.lucide) lucide.createIcons();
};

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
            FileSystem.updateItem(itemId, { title: newName });
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