/* SILENOS 3 / desktop-organizer.js */
// --- ORGANIZADOR DE COHERENCIA ESPACIAL POR CUADRÍCULAS COMPACTAS (H-G-Y) ---

const DesktopOrganizer = {
    MIN_GAP: 180, // Espaciado reducido para mayor compacidad
    PEAK_DEPTH: 0, // Plano de manifestación física (Z=0)
    
    /**
     * Inicia la reconfiguración del espacio visual en una cuadrícula única y compacta.
     * Refinamos la arquitectura para que la función sea clara: Unificar la materia.
     */
    organize() {
        console.log("H-G -> Unificando materia en cuadrícula maestra (Z=0)...");
        
        FileSystem.init();
        const files = FileSystem.getItems('desktop');
        if (files.length === 0) return;

        // --- DEFINICIÓN DE PRIORIDADES (H) ---
        // El orden de la esencia define su posición en la red
        const typePriority = {
            'folder': 1,
            'app': 2,
            'program': 2,
            'link': 3,
            'file': 4
        };

        // --- ORDENAMIENTO DE CONFLUENCIA ---
        // 1. Por tipo (Prioridad)
        // 2. Por título (Alfabético)
        const sortedFiles = [...files].sort((a, b) => {
            const prioA = typePriority[a.type] || 99;
            const prioB = typePriority[b.type] || 99;
            
            if (prioA !== prioB) return prioA - prioB;
            return a.title.localeCompare(b.title, undefined, {numeric: true, sensitivity: 'base'});
        });

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // --- CÁLCULO DE CUADRÍCULA MAESTRA (G) ---
        // Buscamos una proporción equilibrada (Equilibrium - E)
        const totalItems = sortedFiles.length;
        const columns = Math.ceil(Math.sqrt(totalItems * 1.5)); // Ajuste de ratio para no ser cuadrado perfecto
        
        this.arrangeGrid(sortedFiles, centerX, centerY, columns);

        FileSystem.save();

        // Ajuste de la cámara en el Canvas de ThreeDesktop
        if (typeof window.ThreeDesktop !== 'undefined') {
            window.ThreeDesktop.targetX = 0;
            window.ThreeDesktop.targetY = 0;
            window.ThreeDesktop.targetZ = 1200; // Un poco más alejado para ver la red completa
        }

        if (window.refreshSystemViews) window.refreshSystemViews();
        this.notifySuccess(totalItems);
    },

    /**
     * Función auxiliar para organizar un array de ítems en una cuadrícula compacta
     */
    arrangeGrid(items, centerX, centerY, columns) {
        if (items.length === 0) return;

        const rows = Math.ceil(items.length / columns);
        
        // Calculamos el tamaño total para centrar la red (U - Unión)
        const totalWidth = (columns - 1) * this.MIN_GAP;
        const totalHeight = (rows - 1) * this.MIN_GAP;
        
        const startX = centerX - totalWidth / 2;
        const startY = centerY - totalHeight / 2;

        items.forEach((item, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);

            FileSystem.updateItem(item.id, {
                x: startX + (col * this.MIN_GAP),
                y: startY + (row * this.MIN_GAP),
                z: this.PEAK_DEPTH
            });
        });
    },

    notifySuccess(itemCount) {
        const notif = document.createElement('div');
        notif.className = 'fixed top-10 left-1/2 -translate-x-1/2 bg-indigo-900/80 backdrop-blur-md text-white px-6 py-3 rounded-xl text-xs font-bold z-[10000] pop-in shadow-2xl border border-indigo-400/30 flex items-center gap-3 pointer-events-none';
        notif.innerHTML = `
            <div class="bg-indigo-500 p-1 rounded-lg">
                <i data-lucide="layout-grid" class="w-4 h-4 text-white"></i>
            </div>
            <div>
                <p class="opacity-100">Coherencia H restablecida</p>
                <p class="opacity-70 font-normal">${itemCount} elementos integrados en red compacta.</p>
            </div>
        `;
        document.body.appendChild(notif);
        if(window.lucide) lucide.createIcons();
        setTimeout(() => {
            notif.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
            notif.style.opacity = "0";
            notif.style.transform = "translate(-50%, -20px)";
            setTimeout(() => notif.remove(), 600);
        }, 4000);
    }
};