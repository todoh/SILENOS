/* NEXUS SILENOS/chronos_main.js */
/**
 * CHRONOS CORE MANAGER
 * Punto de entrada principal. Coordina IO, View y UI.
 */

import { ChronosGenerator } from './chronos_gen.js';
import { ChronosIO } from './chronos_io.js';
import { ChronosUI } from './chronos_ui.js';
import { ChronosView } from './chronos_view.js';

class ChronosManager {
    constructor() {
        // Inicializar módulos
        this.io = new ChronosIO(this);
        
        // Cargar datos ANTES de inicializar la vista
        const loaded = this.io.loadData();
        this.places = loaded.places;
        this.groups = loaded.groups;
        this.projectMeta = loaded.meta;

        // Estado de edición temporal
        this.editing = { placeId: null, eventId: null, targetPlace: null };

        // Generador IA
        this.generator = new ChronosGenerator({
            places: this.places,
            characters: [],
            maps: []
        });

        // Inicializar UI y Vista
        this.ui = new ChronosUI(this);
        this.view = new ChronosView(this);

        this.init();
    }

    init() {
        // Vincular eventos iniciales
        this.ui.bindEvents();
        
        // Calcular lista de renderizado inicial
        this.view.recalcRenderList();
    }

    // --- ACCIONES GLOBALES ---

    newProject() {
        if(confirm("⚠ ¿Borrar todo e iniciar de cero?")) {
            localStorage.removeItem('nexus_saga_data');
            location.reload();
        }
    }

    async runAIGeneration(prompt, useContext) {
        const timeRange = {
            min: this.projectMeta.timeStart || 0,
            max: this.projectMeta.timeEnd || 100
        };

        // Leer contexto fresco
        const rawData = localStorage.getItem('nexus_saga_data');
        let currentChars = [];
        let currentMaps = [];
        if (rawData) { 
            const d = JSON.parse(rawData);
            currentChars = d.characters || [];
            currentMaps = d.maps || []; 
        }
        
        this.generator.systemData = { 
            places: this.places, 
            characters: currentChars,
            maps: currentMaps 
        };

        this.ui.toast("Procesando realidad con datos geográficos...");
        const result = await this.generator.generateTimeline(prompt, useContext, timeRange);
        
        if (result.newCharacters?.length) {
            this.io.saveCharacters(result.newCharacters);
        }
        
        if (result.places) {
            result.places.forEach(gp => {
                if (gp._isUpdate) {
                    const rp = this.places.find(p => p.id === gp.id);
                    if (rp && gp.events) rp.events.push(...gp.events);
                } else {
                    this.places.push(gp);
                }
            });
            this.io.saveData();
            this.view.recalcRenderList();
            this.ui.toast("¡Integración completada!");
        }
    }
}

// ARRANQUE PRINCIPAL
// Este archivo reemplaza la lógica monolítica de chronos.js
window.onload = () => {
    window.ChronosApp = new ChronosManager();
};