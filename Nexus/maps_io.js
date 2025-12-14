/* NEXUS SILENOS/maps_io.js */
/**
 * MAP IO V6 - IMPORT/EXPORT
 * Carga y Descarga de mapas individuales JSON.
 */

class MapIO {
    constructor(system) {
        this.system = system;
    }

    init() {
        // Inicialización pasiva (los listeners se vinculan en UI)
    }

    downloadCurrentMap() {
        const map = this.system.getActiveMap();
        if (!map) {
            this.system.notify("¡No hay mapa seleccionado para exportar!");
            return;
        }

        // Creamos una copia limpia
        const exportData = JSON.stringify(map, null, 2);
        const blob = new Blob([exportData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        // Nombre de archivo seguro
        const safeName = map.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `nexus_map_${safeName}_${Date.now()}.json`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        this.system.notify(`Mapa "${map.name}" exportado.`);
    }

    uploadMap(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedMap = JSON.parse(e.target.result);

                // Validación básica
                if (!importedMap.name || (!importedMap.polygons && !importedMap.pois)) {
                    throw new Error("Formato de mapa inválido.");
                }

                // Generar nuevo ID para evitar colisiones
                importedMap.id = 'map_imp_' + Date.now();
                importedMap.name = importedMap.name + ' (Importado)';

                // Inyectar en el sistema
                this.system.sagaData.maps.push(importedMap);
                this.system.saveData();
                this.system.ui.refreshList();
                this.system.selectMap(importedMap.id);

                this.system.notify(`Mapa "${importedMap.name}" cargado exitosamente.`);

            } catch (err) {
                console.error(err);
                this.system.notify("Error: El archivo no es un mapa válido.");
            }
            // Limpiar input para permitir cargar el mismo archivo de nuevo si se desea
            event.target.value = '';
        };
        reader.readAsText(file);
    }
}