/* SILENOS 3/selection-manager.js */
// --- GESTOR DE SELECCIÓN MÚLTIPLE (H-Y) ---
// Escritorio: Derecho (Mantener) + Izquierdo (Arrastrar)
// Carpetas: Izquierdo (Arrastrar)

const SelectionManager = {
    selectedIds: new Set(),
    isSelecting: false,
    startPos: { x: 0, y: 0 },
    selectionBox: null,
    containerType: null,
    activeContainerId: null,
    preventNextContextMenu: false,
    didDrag: false,

    init() {
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        document.addEventListener('contextmenu', (e) => {
            if (this.preventNextContextMenu) {
                e.preventDefault();
                this.preventNextContextMenu = false;
            }
        }, true);
    },

    handleMouseDown(e) {
        const folderContent = e.target.closest('.folder-window-content');
        const isDesktopArea = e.target.closest('#desktop-area') || e.target.id === 'desktop-area' || e.target.tagName === 'CANVAS';
        
        const isIcon = e.target.closest('.desktop-icon-btn') || e.target.closest('[data-id]') || e.target.closest('.desktop-icon-3d');
        const isUi = e.target.closest('.window') || e.target.closest('.dock-item') || e.target.closest('button') || e.target.closest('#launcher-btn') || e.target.closest('#context-menu');
        
        if (isIcon || isUi) return;

        if (folderContent) {
            if (e.button !== 0) return;
            this.containerType = 'window';
            this.activeContainerId = folderContent.dataset.folderId;
        } else if (isDesktopArea) {
            // Combo Derecho (2) + Izquierdo (0)
            if (e.buttons !== 3) return;
            this.containerType = 'desktop';
            this.activeContainerId = 'desktop';
            e.preventDefault();
        } else {
            return;
        }

        if (!e.ctrlKey && !e.shiftKey) this.clearSelection();

        this.isSelecting = true;
        this.didDrag = false;
        this.startPos = { x: e.clientX, y: e.clientY };

        if (this.selectionBox) this.selectionBox.remove();

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

        this.didDrag = true;
        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(this.startPos.x, currentX);
        const top = Math.min(this.startPos.y, currentY);
        const width = Math.abs(this.startPos.x - currentX);
        const height = Math.abs(this.startPos.y - currentY);

        this.selectionBox.style.left = `${left}px`;
        this.selectionBox.style.top = `${top}px`;
        this.selectionBox.style.width = `${width}px`;
        this.selectionBox.style.height = `${height}px`;

        this.updateSelection(left, top, width, height, e.ctrlKey || e.shiftKey);
    },

    handleMouseUp(e) {
        if (!this.isSelecting) return;
        
        if (this.containerType === 'desktop' && this.didDrag) {
            this.preventNextContextMenu = true;
        }

        this.isSelecting = false;
        if (this.selectionBox) {
            this.selectionBox.remove();
            this.selectionBox = null;
        }
    },

    updateSelection(x, y, w, h, isAdding) {
        // H -> Selector coherente para 3D y 2D
        let selector = this.containerType === 'desktop' 
            ? '.desktop-icon-3d' 
            : `.folder-window-content[data-folder-id="${this.activeContainerId}"] [data-id]`;

        const items = document.querySelectorAll(selector);
        items.forEach(el => {
            const id = el.dataset.id;
            if (!id) return;
            
            const rect = el.getBoundingClientRect();
            // Intersección en espacio de pantalla
            const intersect = (rect.left < x + w && rect.right > x && rect.top < y + h && rect.bottom > y);
            
            if (intersect) {
                this.selectedIds.add(id);
            } else if (!isAdding) {
                this.selectedIds.delete(id);
            }
        });
        this.renderVisuals();
    },

    clearSelection() {
        this.selectedIds.clear();
        this.renderVisuals();
    },

    renderVisuals() {
        document.querySelectorAll('.icon-selected').forEach(el => el.classList.remove('icon-selected'));
        this.selectedIds.forEach(id => {
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el) el.classList.add('icon-selected');
        });
    },

    getSelectedIds() { return Array.from(this.selectedIds); },
    isSelected(id) { return this.selectedIds.has(id); },
    addId(id) { this.selectedIds.add(id); this.renderVisuals(); },
    setSelection(ids) { this.selectedIds = new Set(ids); this.renderVisuals(); }
};

document.addEventListener('DOMContentLoaded', () => SelectionManager.init());