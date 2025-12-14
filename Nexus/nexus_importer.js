/* NEXUS SILENOS/nexus_importer.js */
/**
 * NEXUS BRIDGE - UNIVERSAL IMPORTER
 * Gestiona la detección de tipos de datos JSON e inyección en SagaData.
 * CORREGIDO: Uso de puntero dinámico para evitar pérdida de datos tras recargas de caché.
 * ACTUALIZADO V3: Auto-creación de carriles (Lanes) faltantes al importar eventos.
 * ACTUALIZADO V4: Ejemplo de relaciones en plantilla de personajes.
 */

export class NexusImporter {
    constructor(uiManager) {
        this.ui = uiManager;
    }

    /**
     * ACCESO DINÁMICO A LOS DATOS
     */
    get sagaData() {
        return this.ui.sagaData;
    }

    /**
     * Devuelve el esquema base (Template).
     */
    getTemplate(type) {
        const templates = {
            CHARACTER: {
                id: "char_template",
                name: "Nombre del Personaje",
                role: "Arquetipo",
                goal: "Objetivo Principal",
                fear: "Miedo / Debilidad",
                notes: "Notas adicionales...",
                relationships: [
                    { 
                        "targetId": "ID_DEL_OTRO_PJ", 
                        "type": "Hermano / Rival / Aliado" 
                    }
                ]
            },
            PLACE_LORE: {
                id: "place_db_template",
                name: "Nombre del Lugar",
                type: "Ciudad / Bosque / Ruina",
                color: "#3498db",
                desc: "Descripción del lore...",
                notes: "Secretos..."
            },
            EVENT: {
                id: "evt_template",
                laneId: "ID_CARRIL_DESTINO", // Si este ID no existe, el sistema creará el carril.
                k: 10,
                title: "Título del Suceso",
                desc: "Descripción de lo que ocurre...",
                characters: [],
                stages: []
            },
            TIMELINE: {
                id: "tl_template",
                name: "Nueva Línea Temporal",
                startVal: 0,
                endVal: 100,
                events: []
            },
            MAP: {
                id: "map_template",
                name: "Nuevo Mapa",
                width: 2000,
                height: 1500,
                polygons: [],
                pois: []
            },
            PROJECT_PLANNER: {
                id: "proj_template",
                title: "Título Obra",
                narrativeStyle: "STANDARD",
                selectedCharIds: [],
                selectedPlaceIds: [],
                selectedEventIds: [],
                aiGeneratedLore: [],
                chapters: [
                    {
                        title: "Capítulo 1",
                        desc: "Descripción breve...",
                        focus: "Foco dramático",
                        povId: "", 
                        linkedEventIds: []
                    }
                ]
            }
        };
        return JSON.stringify(templates[type] || {}, null, 2);
    }

    /**
     * Analiza el JSON pegado e intenta inyectarlo.
     */
    importData(jsonText) {
        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            return { success: false, msg: "Error de Sintaxis JSON. Revisa comas y llaves." };
        }

        const items = Array.isArray(data) ? data : [data];
        let count = 0;
        let lastType = "Desconocido";

        items.forEach(item => {
            const type = this._detectType(item);
            if (type) {
                this._injectItem(item, type);
                lastType = type;
                count++;
            }
        });

        if (count > 0) {
            this.ui.saveToCache();
            if(this.ui.activeManagerType) this.ui.openManager(this.ui.activeManagerType); 
            return { success: true, msg: `Importados ${count} elementos de tipo ${lastType}.` };
        } else {
            return { success: false, msg: "No se reconoció el tipo de datos." };
        }
    }

    _detectType(item) {
        if (item.polygons && item.pois) return 'MAP';
        if (item.startVal !== undefined && item.endVal !== undefined && Array.isArray(item.events)) return 'TIMELINE';
        if (Array.isArray(item.chapters) && (item.title || item.narrativeStyle)) return 'PROJECT_PLANNER';
        if (item.role !== undefined || item.goal !== undefined || item.fear !== undefined) return 'CHARACTER';
        if (item.k !== undefined && item.title !== undefined) return 'EVENT';
        if (item.color !== undefined && (item.type !== undefined || item.desc !== undefined)) return 'PLACE_LORE';
        return null;
    }

    _injectItem(item, type) {
        if (!item.id) item.id = `${type.toLowerCase()}_imp_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;

        switch (type) {
            case 'CHARACTER':
                this._upsert(this.sagaData.characters, item);
                break;
            case 'PLACE_LORE':
                if (!this.sagaData.placeDb) this.sagaData.placeDb = [];
                this._upsert(this.sagaData.placeDb, item);
                break;
            case 'MAP':
                if (!this.sagaData.maps) this.sagaData.maps = [];
                this._upsert(this.sagaData.maps, item);
                break;
            case 'TIMELINE':
                if (!this.sagaData.timelines) this.sagaData.timelines = [];
                this._upsert(this.sagaData.timelines, item);
                break;
            case 'PROJECT_PLANNER':
                if (!this.sagaData.plannerProjects) this.sagaData.plannerProjects = [];
                if (!item.selectedCharIds) item.selectedCharIds = [];
                if (!item.selectedPlaceIds) item.selectedPlaceIds = [];
                if (!item.selectedEventIds) item.selectedEventIds = [];
                if (!item.aiGeneratedLore) item.aiGeneratedLore = [];
                this._upsert(this.sagaData.plannerProjects, item);
                break;
            
            case 'EVENT':
                // --- LÓGICA INTELIGENTE DE CARRILES ---
                let targetLane = null;

                // 1. Si viene con ID de carril
                if (item.laneId) {
                    // Buscar carril existente
                    targetLane = this.sagaData.places.find(p => p.id === item.laneId);
                    
                    // SI NO EXISTE: CREARLO AL VUELO
                    if (!targetLane) {
                        targetLane = {
                            id: item.laneId, // Usamos el ID solicitado
                            name: `Carril Generado (${item.laneId})`, // Nombre provisional para identificarlo
                            color: this._getRandomColor(), // Color aleatorio para distinguirlo
                            events: []
                        };
                        this.sagaData.places.push(targetLane);
                        // Opcional: Notificar en consola o UI que se creó un carril
                        console.log(`[Importador] Carril '${item.laneId}' no existía. Creado automáticamente.`);
                    }
                }

                // 2. Si no venía con laneId, usar Bandeja de Entrada
                if (!targetLane) {
                    targetLane = this.sagaData.places.find(p => p.id === 'inbox_import');
                    if(!targetLane) {
                        targetLane = { id: 'inbox_import', name: 'BANDEJA IMPORTADA', color: '#95a5a6', events: [] };
                        this.sagaData.places.push(targetLane);
                    }
                }
                
                delete item.laneId; // Limpieza
                this._upsert(targetLane.events, item);
                break;
        }
    }

    _upsert(array, item) {
        if(!array) return;
        const idx = array.findIndex(x => x.id === item.id);
        if (idx !== -1) array[idx] = item;
        else array.push(item);
    }

    _getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
}