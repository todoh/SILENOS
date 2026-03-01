/**
 * TRAMAS STATE - Gestión de estado (Corregido)
 */
const TramasState = {
    panX: 0,
    panY: 0,
    zoom: 1,
    selectedNodes: new Set(),
    isDraggingCanvas: false,
    isDraggingNode: false,
    isConnecting: false,
    isSelecting: false,
    draggedNodeId: null,
    connectionStartNodeId: null,
    hoveredConnection: null,
    selectionStartWorld: null,
    selectionCurrentWorld: null,
    filterMode: null,
    filterValue: null,
    lastMouseX: 0,
    lastMouseY: 0,
    currentMouseX: 0,
    currentMouseY: 0,

    init(canvas) {
        this.panX = canvas.width / 2;
        this.panY = canvas.height / 2;
        this.zoom = 1;
        this.reset();
    },

    screenToWorld(x, y) {
        return {
            x: (x - this.panX) / this.zoom,
            y: (y - this.panY) / this.zoom
        };
    },

    reset() {
        this.isDraggingCanvas = false;
        this.isDraggingNode = false;
        this.isConnecting = false;
        this.isSelecting = false;
        this.draggedNodeId = null;
        this.connectionStartNodeId = null;
    }
};

window.TramasState = TramasState;