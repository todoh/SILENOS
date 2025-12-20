// --- GESTOR DE SELECCIÓN MÚLTIPLE ---

const SelectionManager = {
    selectedIds: new Set(),
    isSelecting: false,
    startPos: { x: 0, y: 0 },
    selectionBox: null,
    containerType: null, // 'desktop' | 'window'
    activeContainerId: null, // 'desktop' o windowId

    init() {
        // Listener global para iniciar selección
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    },

    handleMouseDown(e) {
        // Ignorar si es click derecho o si estamos sobre un icono o ventana/botón interactivo
        if (e.button !== 0) return;
        if (e.target.closest('.desktop-icon-btn') || 
            e.target.closest('.window-header') || 
            e.target.closest('button') ||
            e.target.closest('input') ||
            e.target.closest('.dock-item')) {
            return;
        }

        // Determinar contexto: ¿Escritorio o Ventana de Carpeta?
        const folderContent = e.target.closest('.folder-window-content');
        const desktopLayer = e.target.closest('#desktop-area') || e.target.closest('#desktop-files-layer');

        if (folderContent) {
            this.containerType = 'window';
            this.activeContainerId = folderContent.dataset.folderId;
        } else if (desktopLayer || e.target === document.body) {
            this.containerType = 'desktop';
            this.activeContainerId = 'desktop';
        } else {
            return; // Click en zona muerta o no válida
        }

        // Si no se pulsa Ctrl/Shift, limpiar selección previa
        if (!e.ctrlKey && !e.shiftKey) {
            this.clearSelection();
        }

        this.isSelecting = true;
        this.startPos = { x: e.clientX, y: e.clientY };

        // Crear elemento visual
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.left = `${e.clientX}px`;
        this.selectionBox.style.top = `${e.clientY}px`;
        this.selectionBox.style.width = '0px';
        this.selectionBox.style.height = '0px';
        document.body.appendChild(this.selectionBox);
    },

    handleMouseMove(e) {
        if (!this.isSelecting || !this.selectionBox) return;

        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(this.startPos.x, currentX);
        const top = Math.min(this.startPos.y, currentY);
        const width = Math.abs(currentX - this.startPos.x);
        const height = Math.abs(currentY - this.startPos.y);

        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;

        this.updateSelection(left, top, width, height);
    },

    handleMouseUp(e) {
        if (!this.isSelecting) return;
        
        this.isSelecting = false;
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
    },

    updateSelection(x, y, w, h) {
        // Buscar iconos dentro del contenedor activo
        let selector = '';
        if (this.containerType === 'desktop') {
            selector = '#desktop-files-layer > div[data-id]';
        } else {
            // Buscamos la ventana específica
            selector = `.folder-window-content[data-folder-id="${this.activeContainerId}"] > div[data-id]`;
        }

        const items = document.querySelectorAll(selector);
        
        items.forEach(el => {
            const rect = el.getBoundingClientRect();
            // Lógica simple de intersección de rectángulos
            const intersect = (
                rect.left < x + w &&
                rect.right > x &&
                rect.top < y + h &&
                rect.bottom > y
            );

            if (intersect) {
                this.addId(el.dataset.id);
            } 
            // NOTA: No deseleccionamos si sale del cuadro para permitir comportamiento tipo "Ctrl" acumulativo si se desea,
            // pero lo estándar es recalcular. Para simplificar, añadimos. 
            // Si quieres selección estricta (solo lo que está debajo AHORA):
            // else if (!event.ctrlKey) { this.removeId(el.dataset.id); }
        });
    },

    // --- API PÚBLICA ---

    addId(id) {
        this.selectedIds.add(id);
        this.renderVisuals();
    },

    removeId(id) {
        this.selectedIds.delete(id);
        this.renderVisuals();
    },

    clearSelection() {
        this.selectedIds.clear();
        this.renderVisuals();
    },

    setSelection(idArray) {
        this.selectedIds = new Set(idArray);
        this.renderVisuals();
    },

    isSelected(id) {
        return this.selectedIds.has(id);
    },

    getSelectedIds() {
        return Array.from(this.selectedIds);
    },

    renderVisuals() {
        // Quitar clase selected de todos
        document.querySelectorAll('.icon-selected').forEach(el => el.classList.remove('icon-selected'));

        // Poner clase selected a los IDs actuales
        this.selectedIds.forEach(id => {
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el) el.classList.add('icon-selected');
        });
    }
};

// Iniciar al cargar
document.addEventListener('DOMContentLoaded', () => SelectionManager.init());