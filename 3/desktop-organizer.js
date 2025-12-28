/* SILENOS 3 / desktop-organizer.js */
// --- ORGANIZADOR DE COHERENCIA ESPACIAL POR CUADRÍCULAS (H-G-Y) ---

const DesktopOrganizer = {
    MIN_GAP: 180, // Espaciado entre iconos
    PEAK_DEPTH: 0, // Plano de manifestación física (Z=0)
    
    /**
     * Inicia la reconfiguración del espacio visual.
     * Respetamos que en programación nunca es un fallo de caché, 
     * sino una necesidad de mayor orden en la estructura (H).
     */
    organize() {
        console.log("H-G -> Iniciando reordenamiento por cuadrículas en el plano Z=0...");
        
        FileSystem.init();
        const files = FileSystem.getItems('desktop');
        if (files.length === 0) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // --- ORDENAMIENTO ALFABÉTICO (H) ---
        // Ordenamos la materia antes de agruparla para que la confluencia sea armónica
        const sortedFiles = [...files].sort((a, b) => 
            a.title.localeCompare(b.title, undefined, {numeric: true, sensitivity: 'base'})
        );

        const folders = sortedFiles.filter(f => f.type === 'folder');
        const otherFiles = sortedFiles.filter(f => f.type !== 'folder');

        // Agrupamos archivos por tipo (G)
        const groups = {};
        otherFiles.forEach(file => {
            if (!groups[file.type]) groups[file.type] = [];
            groups[file.type].push(file);
        });

        // Ordenamos las categorías (nubes satélite) para mantener el equilibrio visual
        const typeKeys = Object.keys(groups).sort();

        // 1. ORGANIZAR CARPETAS (NÚCLEO CENTRAL)
        const folderCols = Math.ceil(Math.sqrt(folders.length)) || 1;
        const folderGridSize = this.arrangeGrid(folders, centerX, centerY, folderCols);

        // 2. ORGANIZAR NUBES SATÉLITE (ALREDEDOR)
        const orbitRadius = Math.max(folderGridSize.width, folderGridSize.height) / 2 + 400;
        const typeAngleStep = (Math.PI * 2) / (typeKeys.length || 1);

        typeKeys.forEach((type, idx) => {
            const clusterFiles = groups[type]; // Ya están ordenados por el sort inicial
            const angle = idx * typeAngleStep;

            const clusterCenterX = centerX + orbitRadius * Math.cos(angle);
            const clusterCenterY = centerY + orbitRadius * Math.sin(angle);

            const clusterCols = Math.ceil(Math.sqrt(clusterFiles.length));
            this.arrangeGrid(clusterFiles, clusterCenterX, clusterCenterY, clusterCols);
        });

        FileSystem.save();

        // Ajuste de la cámara en el Canvas de ThreeDesktop
        if (typeof window.ThreeDesktop !== 'undefined') {
            window.ThreeDesktop.targetX = 0;
            window.ThreeDesktop.targetY = 0;
            window.ThreeDesktop.targetZ = 1000; 
        }

        if (window.refreshSystemViews) window.refreshSystemViews();
        this.notifySuccess(files.length, typeKeys.length + (folders.length > 0 ? 1 : 0));
    },

    /**
     * Función auxiliar para organizar un array de ítems en una cuadrícula (G)
     */
    arrangeGrid(items, centerX, centerY, columns) {
        if (items.length === 0) return { width: 0, height: 0 };

        const rows = Math.ceil(items.length / columns);
        
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

        return { width: totalWidth + this.MIN_GAP, height: totalHeight + this.MIN_GAP };
    },

    notifySuccess(itemCount, groupCount) {
        const notif = document.createElement('div');
        notif.className = 'fixed top-10 left-1/2 -translate-x-1/2 bg-indigo-900/80 backdrop-blur-md text-white px-6 py-3 rounded-xl text-xs font-bold z-[10000] pop-in shadow-2xl border border-indigo-400/30 flex items-center gap-3 pointer-events-none';
        notif.innerHTML = `
            <div class="bg-indigo-500 p-1 rounded-lg">
                <i data-lucide="layout-grid" class="w-4 h-4 text-white"></i>
            </div>
            <div>
                <p class="opacity-100">Coherencia H restablecida</p>
                <p class="opacity-70 font-normal">${itemCount} elementos en ${groupCount} bloques de red.</p>
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