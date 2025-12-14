/* NEXUS SILENOS/maps_main.js */
/**
 * MAP MANAGER V6 - CORE COORDINATOR
 * Orquesta UI, Editor Gráfico y Sistema I/O.
 */

class MapManager {
    constructor(sagaData, saveCallback, notifyCallback) {
        this.sagaData = sagaData;
        this.save = saveCallback;
        this.notify = notifyCallback;

        // Asegurar estructura de datos
        if (!this.sagaData.maps) this.sagaData.maps = [];

        this.activeMapId = null;
        this.container = null;

        // Inicializar Sub-módulos
        // Pasamos 'this' para que tengan acceso al Core y datos compartidos
        this.ui = new MapUI(this);
        this.editor = new MapEditor(this);
        this.io = new MapIO(this);
    }

    mount(containerElement) {
        this.container = containerElement;
        
        // 1. Renderizar Estructura UI
        this.ui.mount(this.container);
        
        // 2. Inicializar Canvas (depende de que UI ya haya creado el DOM)
        const canvas = this.container.querySelector('#mapEditorCanvas');
        this.editor.init(canvas);

        // 3. Inicializar I/O (Listeners de inputs ocultos)
        this.io.init();

        // 4. Cargar lista
        this.ui.refreshList();
    }

    // --- GESTIÓN DE DATOS GLOBAL ---

    createMap() {
        const name = prompt("Nombre del Mapa:", "Nuevo Mundo");
        if(!name) return;
        const newMap = {
            id: 'map_' + Date.now(),
            name: name,
            width: 2000,  // NUEVO: Ancho por defecto
            height: 1500, // NUEVO: Alto por defecto
            polygons: [],
            pois: []
        };
        this.sagaData.maps.push(newMap);
        this.saveData();
        this.ui.refreshList();
        this.selectMap(newMap.id);
        this.notify("Mapa creado correctamente.");
    }

    selectMap(id) {
        this.activeMapId = id;
        this.editor.resetCamera();
        this.editor.deselect();
        this.ui.refreshList();
        
        // NUEVO: Al seleccionar mapa, mostramos sus propiedades base (tamaño)
        this.ui.updatePropPanel(null); 
    }

    getActiveMap() {
        return this.sagaData.maps.find(m => m.id === this.activeMapId);
    }

    // --- NUEVAS FUNCIONES DE GESTIÓN (DUPLICAR / BORRAR) ---

    duplicateActiveMap() {
        const map = this.getActiveMap();
        if (!map) return;

        // Clonado profundo para evitar referencias compartidas
        const copy = JSON.parse(JSON.stringify(map));
        
        // Modificar ID y Nombre
        copy.id = 'map_' + Date.now();
        copy.name = copy.name + ' (Copia)';
        
        this.sagaData.maps.push(copy);
        this.saveData();
        
        this.ui.refreshList();
        this.selectMap(copy.id); // Seleccionar la copia automáticamente
        this.notify("Mapa duplicado exitosamente.");
    }

    deleteActiveMap() {
        if (!this.activeMapId) return;
        
        if (confirm("¿Estás seguro de eliminar este mapa permanentemente?")) {
            // Filtrar para quitar el mapa actual
            this.sagaData.maps = this.sagaData.maps.filter(m => m.id !== this.activeMapId);
            
            // Resetear estado
            this.activeMapId = null;
            this.editor.resetCamera(); // Limpiar vista visual
            
            this.saveData();
            this.ui.refreshList();
            this.ui.updatePropPanel(null); // Ocultar panel de propiedades
            
            this.notify("Mapa eliminado.");
        }
    }

    deleteActiveObject() {
        const selection = this.editor.selection;
        if (selection) {
            const map = this.getActiveMap();
            if (selection.type === 'poi') {
                map.pois = map.pois.filter(p => p !== selection.obj);
            } else {
                map.polygons = map.polygons.filter(p => p !== selection.obj);
            }
            this.editor.deselect();
            this.saveData();
            // Al borrar objeto, volvemos a mostrar propiedades del mapa
            this.ui.updatePropPanel(null); 
        }
    }

    // --- UTILIDADES ---

    saveData() {
        if(this.save) this.save();
    }
}