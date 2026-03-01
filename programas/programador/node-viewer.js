NodeRegistry.register('viewer', {
    label: 'VISOR RESULTADOS',
    inputs: ['in_1'],
    outputs: [],
    defaults: {},

    render: (node) => {
        return `
            <div class="flex flex-col gap-2">
                <div id="viewer-content-${node.id}" class="w-full h-40 bg-gray-900 rounded border border-gray-700 flex items-center justify-center overflow-hidden relative group">
                    <span class="text-gray-500 text-[9px] font-mono p-2 text-center group-hover:text-gray-400 transition-colors">
                        <i class="fa-solid fa-eye mb-1 block text-lg"></i>
                        Esperando ejecución...
                    </span>
                </div>
                <div class="flex justify-end">
                    <button onclick="UI.clearViewer('${node.id}')" class="text-[9px] text-gray-400 hover:text-red-500 underline">
                        Limpiar
                    </button>
                </div>
            </div>`;
    },

    execute: async (node, inputData) => {
        if (!inputData) throw new Error("Visor vacío. Conecta algo.");
        updateViewerInternal(node.id, inputData);
        return true;
    }
});

// --- FUNCIONES GLOBALES UI (VISOR) ---

window.UI.clearViewer = function(nodeId) {
    const el = document.getElementById(`viewer-content-${nodeId}`);
    if (el) {
        // Limpiar memoria si había una imagen
        const oldImg = el.querySelector('img');
        if (oldImg && oldImg.src.startsWith('blob:')) {
            URL.revokeObjectURL(oldImg.src);
        }
        
        el.innerHTML = `
            <span class="text-gray-500 text-[9px] font-mono p-2 text-center">
                <i class="fa-solid fa-eye mb-1 block text-lg"></i>
                Limpio
            </span>`;
    }
};

window.UI.openImageViewer = function(src) {
    initViewerModal(); // Aseguramos que el modal existe
    
    const modal = document.getElementById('koreh-image-modal');
    const img = document.getElementById('koreh-full-image');
    
    if (modal && img) {
        img.src = src;
        
        // Resetear transformaciones
        currentScale = 1;
        currentTranslate = { x: 0, y: 0 };
        updateTransform(img);
        
        modal.classList.remove('hidden');
        // Pequeño delay para la animación de opacidad
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
        });
    }
};

window.UI.closeImageViewer = function() {
    const modal = document.getElementById('koreh-image-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            const img = document.getElementById('koreh-full-image');
            if(img) img.src = ''; 
        }, 300); // Esperar a que termine la transición CSS
    }
};

// --- LÓGICA INTERNA Y VISUALIZACIÓN ---

function updateViewerInternal(nodeId, content) {
    const container = document.getElementById(`viewer-content-${nodeId}`);
    if (!container) return;

    // Limpieza preventiva de memoria
    const oldImg = container.querySelector('img');
    if (oldImg && oldImg.src.startsWith('blob:')) URL.revokeObjectURL(oldImg.src);

    container.innerHTML = ''; 

    if (content instanceof Blob) {
        const url = URL.createObjectURL(content);
        const img = document.createElement('img');
        img.src = url;
        img.className = "w-full h-full object-contain cursor-zoom-in hover:opacity-90 transition-opacity duration-200";
        
        // Fondo ajedrez para transparencia
        img.style.backgroundImage = "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)";
        img.style.backgroundSize = "20px 20px";
        img.style.backgroundPosition = "0 0, 0 10px, 10px -10px, -10px 0px";
        
        img.onclick = (e) => {
            e.stopPropagation();
            window.UI.openImageViewer(url);
        };

        container.appendChild(img);

    } else if (typeof content === 'string') {
        const div = document.createElement('div');
        div.className = "w-full h-full p-2 text-[10px] font-mono text-green-400 overflow-y-auto whitespace-pre-wrap leading-tight scrollbar-thin scrollbar-thumb-gray-600";
        div.innerText = content;
        container.appendChild(div);

    } else {
        container.innerText = "Data Type: " + typeof content;
    }
}

// --- SISTEMA DE MODAL CON ZOOM Y PAN (GPU ACCELERATED) ---

let currentScale = 1;
let currentTranslate = { x: 0, y: 0 };
let isDragging = false;
let startDrag = { x: 0, y: 0 };

function updateTransform(element) {
    element.style.transform = `translate(${currentTranslate.x}px, ${currentTranslate.y}px) scale(${currentScale})`;
}

// Declaración estándar (Hoisting) para evitar ReferenceError
function initViewerModal() {
    if (document.getElementById('koreh-image-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'koreh-image-modal';
    modal.className = "hidden fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm opacity-0 transition-opacity duration-300 overflow-hidden";
    
    modal.innerHTML = `
        <div class="absolute top-4 right-4 z-50 flex gap-2">
             <div class="bg-black/50 text-white text-[10px] px-2 py-1 rounded font-mono pointer-events-none">
                Rueda: Zoom | Arrastrar: Mover
            </div>
            <button id="btn-close-viewer" class="text-white hover:text-red-500 text-2xl">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
        <img id="koreh-full-image" class="max-w-none origin-center cursor-grab transition-transform duration-75 ease-out" src="" alt="Full view" style="max-height: 90vh; max-width: 90vw;">
    `;

    document.body.appendChild(modal);

    const img = document.getElementById('koreh-full-image');
    const closeBtn = document.getElementById('btn-close-viewer');

    // CERRAR
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        window.UI.closeImageViewer();
    };
    
    // Clic fuera de la imagen para cerrar
    modal.onmousedown = (e) => {
        if (e.target === modal) window.UI.closeImageViewer();
    };

    // --- EVENTOS DE ZOOM (RUEDA) ---
    modal.addEventListener('wheel', (e) => {
        e.preventDefault();
        e.stopPropagation(); // IMPORTANTE: No hacer zoom en el canvas de atrás

        const delta = -Math.sign(e.deltaY) * 0.1;
        const newScale = Math.min(Math.max(0.5, currentScale + delta), 5); // Límites de zoom 0.5x a 5x
        
        currentScale = newScale;
        updateTransform(img);
    }, { passive: false });

    // --- EVENTOS DE PAN (ARRASTRAR) ---
    img.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        startDrag = { x: e.clientX - currentTranslate.x, y: e.clientY - currentTranslate.y };
        img.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        if (modal.classList.contains('hidden')) return;
        
        e.preventDefault();
        currentTranslate.x = e.clientX - startDrag.x;
        currentTranslate.y = e.clientY - startDrag.y;
        updateTransform(img);
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        if (img) img.style.cursor = 'grab';
    });
}

// Inicializar al cargar
setTimeout(initViewerModal, 100);