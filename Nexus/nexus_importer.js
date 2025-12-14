/* NEXUS SILENOS/nexus_importer.js */
/**
 * NEXUS BRIDGE - UNIVERSAL IMPORTER
 * Gestiona la detección de tipos de datos JSON e inyección en SagaData.
 * CORREGIDO: Uso de puntero dinámico para evitar pérdida de datos tras recargas de caché.
 * ACTUALIZADO: Plantillas de Planner enriquecidas.
 */

export class NexusImporter {
    constructor(uiManager) {
        this.ui = uiManager;
        // CORRECCIÓN CRÍTICA: No guardamos this.sagaData en el constructor.
        // Usamos el getter de abajo para apuntar siempre a los datos vivos.
    }

    /**
     * ACCESO DINÁMICO A LOS DATOS
     * Esto asegura que si UIManager recarga la caché, el Importador no se quede
     * escribiendo en un objeto obsoleto ("memoria fantasma").
     */
    get sagaData() {
        return this.ui.sagaData;
    }

    /**
     * Devuelve el esquema base (Template) según el tipo solicitado.
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
                relationships: []
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
                        desc: "Descripción breve de la escena...",
                        focus: "Foco dramático (ej: Misterio)",
                        povId: "", 
                        linkedEventIds: []
                    }
                ]
            }
        };
        return JSON.stringify(templates[type] || {}, null, 2);
    }

    /**
     * Analiza el JSON pegado e intenta inyectarlo en la base de datos.
     */
    importData(jsonText) {
        let data;
        try {
            data = JSON.parse(jsonText);
        } catch (e) {
            return { success: false, msg: "Error de Sintaxis JSON. Revisa comas y llaves." };
        }

        // Convertir a array si es un objeto único para procesarlo igual
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
            // Guardar inmediatamente usando la referencia correcta de UI
            this.ui.saveToCache();
            
            // Recargar la UI actual para reflejar cambios (si hay un modal abierto)
            if(this.ui.activeManagerType) this.ui.openManager(this.ui.activeManagerType); 
            
            return { success: true, msg: `Importados ${count} elementos de tipo ${lastType}.` };
        } else {
            return { success: false, msg: "No se reconoció el tipo de datos. Revisa el formato." };
        }
    }

    _detectType(item) {
        // Heurística de detección de claves
        if (item.polygons && item.pois) return 'MAP';
        if (item.startVal !== undefined && item.endVal !== undefined && Array.isArray(item.events)) return 'TIMELINE';
        
        // Planner: Debe tener chapters Y (title o narrativeStyle)
        if (Array.isArray(item.chapters) && (item.title || item.narrativeStyle)) return 'PROJECT_PLANNER';
        
        // Diferenciar Personaje de Lugar (ambos tienen name, pero Character tiene role/goal)
        if (item.role !== undefined || item.goal !== undefined || item.fear !== undefined) return 'CHARACTER';
        
        // Diferenciar Evento de Lugar (Evento tiene k, Lugar tiene color/type)
        if (item.k !== undefined && item.title !== undefined) return 'EVENT';
        
        // Lógica corregida para PLACE_LORE: Si tiene color Y (tipo O descripción)
        if (item.color !== undefined && (item.type !== undefined || item.desc !== undefined)) return 'PLACE_LORE';

        return null;
    }

    _injectItem(item, type) {
        // Generar ID nuevo si colisiona o no existe (Opcional, aquí respetamos si trae ID para migraciones)
        if (!item.id) item.id = `${type.toLowerCase()}_imp_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;

        // NOTA: Al usar this.sagaData (el getter), escribimos en this.ui.sagaData real.
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
                // Asegurar arrays en el objeto entrante para evitar errores en PlannerManager
                if (!item.selectedCharIds) item.selectedCharIds = [];
                if (!item.selectedPlaceIds) item.selectedPlaceIds = [];
                if (!item.selectedEventIds) item.selectedEventIds = [];
                if (!item.aiGeneratedLore) item.aiGeneratedLore = [];
                
                this._upsert(this.sagaData.plannerProjects, item);
                break;
            case 'EVENT':
                // Eventos sueltos van a una bandeja de entrada
                let inbox = this.sagaData.places.find(p => p.id === 'inbox_import');
                if(!inbox) {
                    inbox = { id: 'inbox_import', name: 'BANDEJA IMPORTADA', color: '#95a5a6', events: [] };
                    this.sagaData.places.push(inbox);
                }
                this._upsert(inbox.events, item);
                break;
        }
    }

    _upsert(array, item) {
        if(!array) return; // Seguridad
        const idx = array.findIndex(x => x.id === item.id);
        if (idx !== -1) {
            array[idx] = item; // Reemplazar existente
        } else {
            array.push(item); // Añadir nuevo
        }
    }
}