/* NEXUS SILENOS/nexus_importer.js */
/**
 * NEXUS BRIDGE - UNIVERSAL IMPORTER V5.2 (FIX PLANNER IMPORT)
 * - Auto-creación de Carriles.
 * - Auto-vinculación de Lugares (Lore).
 * - Resolución de Personajes por nombre.
 * - Soporte para Etapas de eventos.
 * - FIX: Sanitización robusta de Capítulos en Project Planner.
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
                laneId: "ID_CARRIL_DESTINO (Opcional)",
                laneName: "Nombre del Carril (Si no existe, se crea)",
                linkedPlace: "Nombre del Lugar en DB (Para vincular Lore)", 
                k: 10,
                title: "Título del Suceso",
                desc: "Descripción...",
                characterNames: ["Nombre Exacto Personaje 1", "Nombre Exacto Personaje 2"],
                characters: ["ID_EXISTENTE_SI_LO_CONOCES"], 
                stages: ["Fase 1: Inicio", "Fase 2: Clímax", "Fase 3: Desenlace"]
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
                chapters: [
                    {
                        "title": "Capítulo 1",
                        "desc": "Descripción breve",
                        "linkedEventIds": []
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
            // Recargar visualmente si estamos en la vista principal
            if(window.location.reload && !this.ui.activeManagerType) {
                 // location.reload(); // Opcional: Descomentar si se desea recarga forzada
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
        // Generar ID si falta o si es una plantilla genérica para evitar colisiones
        if (!item.id || item.id.includes('_template')) {
            item.id = `${type.toLowerCase()}_imp_${Date.now()}_${Math.floor(Math.random()*1000)}`;
        }

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
                
                // Lógica de Vinculación Automática (PlaceDb)
                const tlLinkName = item.linkedPlace || item.name || "Lugar Sin Nombre";
                const tlDbId = this._ensurePlaceLore(tlLinkName, item.linkedPlace ? null : "Generado por Timeline");
                item.linkedDbId = tlDbId;
                delete item.linkedPlace;

                this._upsert(this.sagaData.timelines, item);
                break;

            case 'PROJECT_PLANNER':
                if (!this.sagaData.plannerProjects) this.sagaData.plannerProjects = [];
                
                // 1. Sanitización de Arrays principales
                if (!item.selectedCharIds) item.selectedCharIds = [];
                if (!item.selectedPlaceIds) item.selectedPlaceIds = [];
                if (!item.selectedEventIds) item.selectedEventIds = [];
                if (!item.aiGeneratedLore) item.aiGeneratedLore = [];
                
                // 2. Sanitización Profunda de Capítulos (FIX CRÍTICO)
                if (item.chapters && Array.isArray(item.chapters)) {
                    item.chapters.forEach(chap => {
                        // Si no existen estos arrays, la UI (planner_structure.js) se rompe al intentar hacer .forEach
                        if (!chap.linkedEventIds) chap.linkedEventIds = [];
                        if (!chap.title) chap.title = "Capítulo Sin Título";
                        if (!chap.desc) chap.desc = "";
                        if (!chap.povId) chap.povId = "";
                    });
                } else {
                    item.chapters = [];
                }

                this._upsert(this.sagaData.plannerProjects, item);
                break;
            
            case 'EVENT':
                // --- 1. RESOLUCIÓN DE CARRILES (LANES) ---
                let targetLane = null;
                const laneId = item.laneId;
                const laneName = item.laneName || (laneId ? `Carril ${laneId}` : "Bandeja Importada");

                if (laneId) {
                    targetLane = this.sagaData.places.find(p => p.id === laneId);
                } else if (item.laneName) {
                    targetLane = this.sagaData.places.find(p => p.name === item.laneName);
                }

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

                // --- 2. VINCULACIÓN DE LUGAR (LORE) ---
                let loreIdToLink = null;
                if (item.linkedPlace) {
                    loreIdToLink = this._ensurePlaceLore(item.linkedPlace);
                } else if (!targetLane.linkedDbId) {
                    loreIdToLink = this._ensurePlaceLore(targetLane.name, "Generado automáticamente por evento");
                }

                if (loreIdToLink) {
                    targetLane.linkedDbId = loreIdToLink;
                    if (targetLane.name.includes("Carril Generado")) {
                        const loreEntry = this.sagaData.placeDb.find(x => x.id === loreIdToLink);
                        if (loreEntry) targetLane.name = loreEntry.name;
                    }
                }

                // --- 3. RESOLUCIÓN DE PERSONAJES (NOMBRES -> IDS) ---
                if (item.characterNames && Array.isArray(item.characterNames)) {
                    if (!item.characters) item.characters = [];
                    item.characterNames.forEach(name => {
                        // Búsqueda insensible a mayúsculas
                        const char = this.sagaData.characters.find(c => c.name.toLowerCase() === name.toLowerCase());
                        if (char) {
                            if (!item.characters.includes(char.id)) item.characters.push(char.id);
                        } else {
                            console.warn(`[Importador] Personaje '${name}' no encontrado. Se ignora.`);
                        }
                    });
                    delete item.characterNames; // Limpieza
                }

                // --- 4. GESTIÓN DE ETAPAS (STAGES) ---
                if (!item.stages) item.stages = [];

                // Limpieza final
                delete item.laneId;
                delete item.laneName;
                delete item.linkedPlace;

                this._upsert(targetLane.events, item);
                break;
        }
    }

    _ensurePlaceLore(identifier, defaultDesc = "") {
        if (!this.sagaData.placeDb) this.sagaData.placeDb = [];
        
        let found = this.sagaData.placeDb.find(p => p.id === identifier);
        if (!found) {
            found = this.sagaData.placeDb.find(p => p.name.toLowerCase() === identifier.toLowerCase());
        }

        if (found) return found.id;

        const newId = 'place_db_imp_' + Date.now() + '_' + Math.floor(Math.random()*100);
        const newPlace = {
            id: newId,
            name: identifier,
            type: "Lugar Importado",
            color: this._getRandomColor(),
            desc: defaultDesc || "Lugar generado automáticamente durante la importación.",
            notes: ""
        };
        this.sagaData.placeDb.push(newPlace);
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