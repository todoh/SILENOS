/* SILENOS 3 / desktop-organizer.js */
// --- ORGANIZADOR DE COHERENCIA ESPACIAL (Adaptado a FS Granular) ---

const DesktopOrganizer = {
    MIN_GAP: 190, // Espaciado
    PEAK_DEPTH: 0, // Plano de manifestación física
    
    /**
     * Inicia la reconfiguración del espacio visual.
     * Ahora mucho más rápido gracias al FS granular.
     */
    organize() {
        console.log("H-G -> Unificando materia en cuadrícula maestra (Z=0)...");
        
        const rawFiles = FileSystem.getItems('desktop');
        if (rawFiles.length === 0) return;

        // --- FASE DE ABSTRACCIÓN (PROXY) ---
        const layoutProxies = rawFiles.map(file => ({
            id: file.id,
            type: file.type,
            title: file.title || 'Sin título',
        }));

        // --- DEFINICIÓN DE PRIORIDADES (H) ---
        // Actualizado para reconocer todos los tipos de archivo del sistema
        const typePriority = {
            'folder': 1,
            'app': 2,
            'program': 2,
            'javascript': 2, // Agregado: Código JS junto a programas
            'json': 2,       // Agregado: Datos JSON
            'html': 2,       // Agregado: Web
            'css': 2,        // Agregado: Estilos
            'book': 3,       // Agregado: Libros
            'gamebook': 3,   // Agregado: Librojuegos
            'narrative': 3,  // Agregado: Narrativa
            'image': 3,      // Agregado: Imágenes
            'data': 4,       // Agregado: Datos genéricos
            'text': 4,       // Agregado: Texto plano
            'link': 5,
            'file': 6        // Resto
        };

        // --- ORDENAMIENTO DE CONFLUENCIA ---
        layoutProxies.sort((a, b) => {
            const prioA = typePriority[a.type] || 99; // 99 para tipos desconocidos
            const prioB = typePriority[b.type] || 99;
            
            if (prioA !== prioB) return prioA - prioB;
            // Orden alfabético secundario
            return a.title.localeCompare(b.title, undefined, {numeric: true, sensitivity: 'base'});
        });

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // --- CÁLCULO DE CUADRÍCULA MAESTRA (G) ---
        const totalItems = layoutProxies.length;
        // Factor 1.5 para hacer la cuadrícula un poco más ancha que alta (formato pantalla)
        const columns = Math.ceil(Math.sqrt(totalItems * 1.5)); 
        
        // Ejecutamos la organización
        this.arrangeGrid(layoutProxies, centerX, centerY, columns);

        // Ajuste de la cámara
        if (typeof window.ThreeDesktop !== 'undefined') {
            window.ThreeDesktop.targetX = 0;
            window.ThreeDesktop.targetY = 0;
            window.ThreeDesktop.targetZ = 1200; 
        }

        // Refrescamos la vista
        if (window.refreshSystemViews) window.refreshSystemViews();
        
        // Forzamos el guardado de las nuevas posiciones
        FileSystem.save();
        
        this.notifySuccess(totalItems);
    },

    /**
     * Función auxiliar para organizar un array de proxies
     */
    arrangeGrid(proxies, centerX, centerY, columns) {
        if (proxies.length === 0) return;

        const rows = Math.ceil(proxies.length / columns);
        
        const totalWidth = (columns - 1) * this.MIN_GAP;
        const totalHeight = (rows - 1) * this.MIN_GAP;
        
        const startX = centerX - totalWidth / 2;
        const startY = centerY - totalHeight / 2;

        // Iteramos sobre los proxies
        proxies.forEach((proxy, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);

            const newX = startX + (col * this.MIN_GAP);
            const newY = startY + (row * this.MIN_GAP);

            // ACTUALIZACIÓN RÁPIDA:
            // Ya no necesitamos suprimir el guardado (suppressSave=true)
            // porque FileSystem.updateItem ahora solo actualiza RAM y marca sucio.
            // La escritura a disco es asíncrona y no bloquea el hilo UI.
            FileSystem.updateItem(proxy.id, {
                x: newX,
                y: newY,
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

// Alias de compatibilidad
window.saveDesktopDebounced = () => FileSystem.save();