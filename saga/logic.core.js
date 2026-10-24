// Abrir Canvas: logic.core.js
// --- APP PRINCIPAL (CORE) ---
class DataStudio {
    constructor() {
        this.rootHandle = null;     
        this.targetHandle = null;   
        this.items = [];            
        this.tramas = []; 
        this.currentFileHandle = null; 
        this.currentData = null;    
        this.processingIds = new Set();
        this.saveTimer = null; 
        this.sortBy = 'name'; // 'name' | 'type'
    }

    init() {
        ui.updateAuthUI();
        window.parent.addEventListener('silenos:config-updated', ui.updateAuthUI);
        if(typeof FS !== 'undefined' && FS.rootHandle) this.rootHandle = FS.rootHandle;
        
        setTimeout(() => ui.toggleFolderModal(), 500);

        const inputs = ['inp-title', 'inp-tag', 'inp-desc', 'inp-visual'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.scheduleSave());
            }
        });

        // Configuración del Menú Contextual para la zona de Datos
        const scrollContainer = document.getElementById('main-scroll');
        if (scrollContainer) {
            scrollContainer.addEventListener('contextmenu', (e) => {
                // Solo si la pestaña de datos está activa
                const tabDatos = document.getElementById('tab-datos');
                if (tabDatos && tabDatos.classList.contains('hidden')) return;
                e.preventDefault();
                
                // Determinar si hizo clic en una tarjeta o en el fondo del grid
                const card = e.target.closest('.data-card');
                if (card && card.dataset.index !== undefined) {
                    ui.renderContextMenu(e.clientX, e.clientY, parseInt(card.dataset.index));
                } else {
                    ui.renderContextMenu(e.clientX, e.clientY, null);
                }
            });

            // Cerrar visor al hacer clic izquierdo fuera de cualquier tarjeta
            scrollContainer.addEventListener('click', (e) => {
                const tabDatos = document.getElementById('tab-datos');
                if (tabDatos && tabDatos.classList.contains('hidden')) return;
                
                // Si no se pulsó sobre una tarjeta de datos, cerramos el sidebar de edición
                const card = e.target.closest('.data-card');
                if (!card) {
                    ui.closeSidebar();
                }
            });
        }
    }

    renderGrid() {
        const grid = document.getElementById('grid-container');
        if (!grid) return;
        grid.innerHTML = '';
        
        if(this.items.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center text-gray-300 text-xs italic py-12">Carpeta vacía.</div>';
            return;
        }

        if (this.sortBy === 'type') {
            // Agrupar elementos por tipo (etiqueta)
            const grouped = {};
            this.items.forEach((item) => {
                const type = (item.data.type || 'General').trim();
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(item);
            });

            // Ordenar claves de etiquetas alfabéticamente
            const sortedTypes = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

            sortedTypes.forEach((type) => {
                // Renderizar cabecera de la etiqueta
                const header = document.createElement('div');
                header.className = "col-span-full font-bold text-xs uppercase tracking-widest text-indigo-500 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between";
                header.innerHTML = `<span><i class="fa-solid fa-tag mr-2 text-[10px]"></i>${type}</span><span class="text-[10px] text-gray-400 font-mono">${grouped[type].length} ITEMS</span>`;
                grid.appendChild(header);

                // Ordenar elementos dentro del grupo por nombre
                grouped[type].sort((a, b) => {
                    const nameA = (a.data.name || a.data.title || "Sin Nombre").toLowerCase();
                    const nameB = (b.data.name || b.data.title || "Sin Nombre").toLowerCase();
                    return nameA.localeCompare(nameB);
                });

                grouped[type].forEach((item) => {
                    const realIndex = this.items.indexOf(item);
                    this.renderCardItem(grid, item, realIndex);
                });
            });
        } else {
            // Ordenación alfabética estándar por nombre
            this.items.sort((a, b) => {
                const nameA = (a.data.name || a.data.title || "Sin Nombre").toLowerCase();
                const nameB = (b.data.name || b.data.title || "Sin Nombre").toLowerCase();
                return nameA.localeCompare(nameB);
            });

            this.items.forEach((item, index) => {
                this.renderCardItem(grid, item, index);
            });
        }
    }

    renderCardItem(grid, item, index) {
        const card = document.createElement('div');
        card.className = "data-card group";
        card.dataset.index = index;
        card.onclick = () => this.openEditor(item);

        let imgHTML = '<i class="fa-solid fa-cube text-3xl text-gray-200"></i>';
        if (this.processingIds.has(item.name)) {
            imgHTML = `<div class="card-loading-overlay"><i class="fa-solid fa-palette fa-spin text-xl mb-2"></i><span class="text-[10px] font-bold">PINTANDO</span></div>`;
        } else if (item.displayImage || item.data.imagen64) {
            const src = item.displayImage || item.data.imagen64;
            if(src.startsWith('<svg')) {
                imgHTML = src;
            } else {
                imgHTML = `<img src="${src}" class="card-img cursor-zoom-in" loading="lazy" onclick="event.stopPropagation(); if(typeof ui !== 'undefined' && ui.zoomImage) ui.zoomImage(this.src);">`;
            }
        }

        card.innerHTML = `
            <span class="card-tag">${item.data.type || 'General'}</span>
            <div class="card-img-box">${imgHTML}</div>
            <div class="p-4 flex-1 flex flex-col">
                <h3 class="font-medium text-sm text-black mb-1 truncate">${item.data.name || item.data.title || "Sin Nombre"}</h3>
                <p class="text-[10px] text-gray-400 line-clamp-3 leading-relaxed">${item.data.desc || "Sin descripción..."}</p>
            </div>
        `;
        grid.appendChild(card);
    }
}

window.DataStudio = DataStudio;