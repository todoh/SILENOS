/* NEXUS SILENOS/chronos_io.js */
/**
 * CHRONOS IO (PERSISTENCIA)
 * Gestión de datos: Carga, Guardado, Importación y Exportación.
 */

export class ChronosIO {
    constructor(manager) {
        this.manager = manager;
    }

    loadData() {
        const raw = localStorage.getItem('nexus_saga_data');
        let places = [];
        let groups = [];
        let meta = { timeStart: 0, timeEnd: 100 };
        
        if (raw) {
            try {
                const data = JSON.parse(raw);
                if (data.meta && data.meta.timeline) {
                    meta = data.meta.timeline;
                }
                if (data.places && Array.isArray(data.places)) {
                    places = data.places;
                }
                if (data.groups && Array.isArray(data.groups)) {
                    groups = data.groups;
                }
            } catch (e) { console.error("Error Chronos IO load", e); }
        }
        
        // Datos por defecto si está vacío
        if (places.length === 0) {
            places = [
                { id: 'p1', name: 'Mundo Físico', color: '#2ecc71', groupId: null, events: [
                    { id: 'e1', k: 0, title: 'El Origen', desc: 'Inicio.', characters: [], stages: [] }
                ]}
            ];
        }
        
        return { places, groups, meta };
    }

    saveData() {
        const raw = localStorage.getItem('nexus_saga_data');
        let data = {};
        if (raw) { try { data = JSON.parse(raw); } catch (e) { data = {}; } }

        data.places = this.manager.places;
        data.groups = this.manager.groups;
        
        data.meta = data.meta || {};
        data.meta.lastModified = Date.now();
        data.meta.timeline = this.manager.projectMeta;

        localStorage.setItem('nexus_saga_data', JSON.stringify(data));
    }

    saveCharacters(newChars) {
        if (!newChars || newChars.length === 0) return;
        const raw = localStorage.getItem('nexus_saga_data');
        let data = { characters: [] };
        if (raw) { try { data = JSON.parse(raw); } catch(e) {} }
        if (!data.characters) data.characters = [];
        // Fusionar evitando duplicados por ID
        newChars.forEach(nc => {
            if(!data.characters.find(c => c.id === nc.id)) {
                data.characters.push(nc);
            }
        });
        localStorage.setItem('nexus_saga_data', JSON.stringify(data));
    }

    downloadData() {
        this.saveData();
        const fullData = localStorage.getItem('nexus_saga_data');
        if(!fullData) return;
        const blob = new Blob([fullData], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `NEXUS_PROJECT_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    }

    uploadData(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target.result);
                // Validación mínima
                if(json.places || json.maps || json.characters) {
                    localStorage.setItem('nexus_saga_data', JSON.stringify(json));
                    this.manager.ui.toast("Cargado. Reiniciando...");
                    setTimeout(() => location.reload(), 1000);
                } else {
                    alert("El archivo JSON no parece un proyecto válido de Nexus.");
                }
            } catch(err) { alert("Error: JSON inválido"); }
        };
        reader.readAsText(file);
    }
}