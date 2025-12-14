/* NEXUS SILENOS/nexus_importer.js */
/**
 * NEXUS BRIDGE - UNIVERSAL IMPORTER V5.0
 * - Auto-creación de Carriles.
 * - Auto-vinculación con Base de Datos de Lugares (Lore).
 * - Templates enriquecidos.
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
                    { "targetId": "ID_DEL_OTRO_PJ", "type": "Hermano / Rival" }
                ]
            },
            PLACE_LORE: {
                id: "place_db_template",
                name: "Nombre del Lugar",
                type: "Ciudad / Bosque",
                color: "#3498db",
                desc: "Lore del lugar...",
                notes: "Secretos..."
            },
            EVENT: {
                id: "evt_template",
                laneId: "ID_CARRIL_DESTINO (Opcional si usas laneName)",
                laneName: "Nombre del Carril (Si no existe, se crea)",
                linkedPlace: "Nombre del Lugar en DB (Para vincular Lore)", 
                k: 10,
                title: "Título del Suceso",
                desc: "Descripción...",
                characters: []
            },
            TIMELINE: {
                id: "tl_template",
                name: "Nueva Línea Temporal",
                linkedPlace: "Nombre del Lugar a Vincular (Crea uno vacío si falta)",
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
                chapters: []
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
            // Recargar la vista activa si corresponde
            if(this.ui.activeManagerType) this.ui.openManager(this.ui.activeManagerType); 
            // Si estamos en Chronos (vista principal), forzamos recarga visual si se puede
            if(window.location.reload && !this.ui.activeManagerType) {
                 // Opción: Notificar al usuario que recargue o hacerlo auto si es safe
            }
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
                
                // LÓGICA DE VINCULACIÓN AUTOMÁTICA PARA TIMELINES
                // 1. Resolver o Crear el Lugar en Base de Datos (Lore)
                const tlLinkName = item.linkedPlace || item.name || "Lugar Sin Nombre";
                const tlDbId = this._ensurePlaceLore(tlLinkName, item.linkedPlace ? null : "Generado por Timeline");
                
                // 2. Asignar vinculación
                item.linkedDbId = tlDbId;
                
                // Limpieza de propiedad auxiliar
                delete item.linkedPlace;

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
                // --- LÓGICA INTELIGENTE DE CARRILES Y VINCULACIÓN ---
                let targetLane = null;
                const laneId = item.laneId;
                const laneName = item.laneName || (laneId ? `Carril ${laneId}` : "Bandeja Importada");

                // 1. Buscar Carril Existente
                if (laneId) {
                    targetLane = this.sagaData.places.find(p => p.id === laneId);
                } else if (item.laneName) {
                    targetLane = this.sagaData.places.find(p => p.name === item.laneName);
                }

                // 2. Si NO existe el Carril, crearlo
                if (!targetLane) {
                    targetLane = {
                        id: laneId || 'lane_' + Date.now() + '_' + Math.floor(Math.random()*1000),
                        name: laneName,
                        color: this._getRandomColor(),
                        events: [],
                        linkedDbId: null 
                    };
                    this.sagaData.places.push(targetLane);
                    console.log(`[Importador] Carril '${targetLane.name}' creado.`);
                }

                // 3. VINCULACIÓN AUTOMÁTICA (Magia solicitada)
                // Si el carril NO tiene vínculo, o el JSON pide uno específico:
                
                let loreIdToLink = null;

                if (item.linkedPlace) {
                    // A: El JSON especifica explícitamente un lugar (Nombre o ID)
                    loreIdToLink = this._ensurePlaceLore(item.linkedPlace);
                } else if (!targetLane.linkedDbId) {
                    // B: El JSON NO dice nada, y el carril está huérfano.
                    // Creamos un lugar vacío con el nombre del carril para vincularlo.
                    loreIdToLink = this._ensurePlaceLore(targetLane.name, "Generado automáticamente por evento");
                }

                // Aplicar el vínculo si encontramos/creamos un ID
                if (loreIdToLink) {
                    targetLane.linkedDbId = loreIdToLink;
                    // Opcional: Si el carril se llamaba "Generado...", actualizar su nombre al del lugar
                    if (targetLane.name.includes("Carril Generado")) {
                        const loreEntry = this.sagaData.placeDb.find(x => x.id === loreIdToLink);
                        if (loreEntry) targetLane.name = loreEntry.name;
                    }
                }

                // Limpieza de campos auxiliares del evento antes de guardar
                delete item.laneId;
                delete item.laneName;
                delete item.linkedPlace;

                this._upsert(targetLane.events, item);
                break;
        }
    }

    /**
     * Busca un lugar en placeDb por ID o Nombre.
     * Si no existe, LO CREA.
     * @returns {string} ID del lugar en placeDb
     */
    _ensurePlaceLore(identifier, defaultDesc = "") {
        if (!this.sagaData.placeDb) this.sagaData.placeDb = [];
        
        // 1. Buscar por ID exacto
        let found = this.sagaData.placeDb.find(p => p.id === identifier);
        
        // 2. Buscar por Nombre (insensible a mayúsculas)
        if (!found) {
            found = this.sagaData.placeDb.find(p => p.name.toLowerCase() === identifier.toLowerCase());
        }

        if (found) return found.id;

        // 3. Crear Nuevo si no existe
        const newId = 'place_db_imp_' + Date.now() + '_' + Math.floor(Math.random()*100);
        const newPlace = {
            id: newId,
            name: identifier, // Usamos el identificador como nombre (ej: "Castillo")
            type: "Lugar Importado",
            color: this._getRandomColor(),
            desc: defaultDesc || "Lugar generado automáticamente durante la importación.",
            notes: ""
        };
        
        this.sagaData.placeDb.push(newPlace);
        console.log(`[Importador] Lugar Lore '${identifier}' creado y vinculado.`);
        return newId;
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