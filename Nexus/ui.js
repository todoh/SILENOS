/* NEXUS SILENOS/ui.js */
/**
 * UI MANAGER V7 - INCLUDES NEXUS BRIDGE
 * Gestiona Personajes, Lugares, Mapas, Configuración, PLANIFICADOR, CÓDICE e IMPORTADOR.
 */

import { NexusImporter } from './nexus_importer.js';

class UIManager {
    constructor() {
        this.sagaData = this._loadFromCache();
        this.activeManagerType = null; // Para recargar la vista correcta tras importar
        
        // Referencias DOM Modales
        this.charModal = document.getElementById('charModal'); 
        this.placesManagerModal = document.getElementById('placesManagerModal'); 
        this.mapModal = document.getElementById('mapModal'); 
        this.plannerModal = document.getElementById('plannerModal'); 
        this.codexModal = document.getElementById('codexModal');
        this.settingsModal = document.getElementById('settingsModal');
        this.importerModal = document.getElementById('importerModal'); // NUEVO
        
        this.notification = document.getElementById('notification');
        
        // Instancia del Importador
        this.importer = new NexusImporter(this);
        
        this._exposeBridge(); // Exponer funciones al window para el HTML
        this._bindEvents();
    }

    _exposeBridge() {
        // Permitir que el HTML llame a funciones del importador
        window.NexusBridge = {
            copyTemplate: (type) => {
                const json = this.importer.getTemplate(type);
                navigator.clipboard.writeText(json).then(() => {
                    this.showNotification(`Esquema ${type} copiado al portapapeles.`);
                });
            }
        };
    }

    _bindEvents() {
        // 1. Gestor de Personajes
        const btnOpenChars = document.getElementById('btnOpenChars');
        if (btnOpenChars) btnOpenChars.onclick = () => this.openManager('CHAR');
        const btnCloseChars = document.getElementById('closeCharModal');
        if (btnCloseChars) btnCloseChars.onclick = () => this.charModal.classList.add('hidden');

        // 2. Gestor de Lugares (Base de Datos)
        const btnOpenPlacesDb = document.getElementById('btnOpenPlacesDb');
        if (btnOpenPlacesDb) btnOpenPlacesDb.onclick = () => this.openManager('PLACE_DB');
        const btnClosePlacesManager = document.getElementById('closePlacesManagerModal');
        if (btnClosePlacesManager) btnClosePlacesManager.onclick = () => this.placesManagerModal.classList.add('hidden');

        // 3. Gestor de Mapas
        const btnOpenMaps = document.getElementById('btnOpenMaps');
        if (btnOpenMaps) btnOpenMaps.onclick = () => this.openManager('MAP');
        const btnCloseMaps = document.getElementById('closeMapModal');
        if (btnCloseMaps) btnCloseMaps.onclick = () => this.mapModal.classList.add('hidden');

        // 4. PLANIFICADOR DE OBRAS
        const btnOpenPlanner = document.getElementById('btnOpenPlanner');
        if (btnOpenPlanner) btnOpenPlanner.onclick = () => this.openManager('PLANNER');
        const btnClosePlanner = document.getElementById('closePlannerModal');
        if (btnClosePlanner) btnClosePlanner.onclick = () => this.plannerModal.classList.add('hidden');

        // 5. CÓDICE
        const btnOpenCodex = document.getElementById('btnOpenCodex');
        if (btnOpenCodex) btnOpenCodex.onclick = () => this.openManager('CODEX');
        const btnCloseCodex = document.getElementById('closeCodexModal');
        if (btnCloseCodex) btnCloseCodex.onclick = () => this.codexModal.classList.add('hidden');

        // 6. NEXUS BRIDGE (IMPORTADOR UNIVERSAL) - NUEVO
        const btnOpenImporter = document.getElementById('btnOpenImporter');
        if (btnOpenImporter) btnOpenImporter.onclick = () => {
             this.sagaData = this._loadFromCache(); // Refrescar datos antes de abrir
             this.importerModal.classList.remove('hidden');
             document.getElementById('importTextarea').value = '';
             document.getElementById('importResult').innerText = '';
        };
        const btnCloseImporter = document.getElementById('closeImporterModal');
        if (btnCloseImporter) btnCloseImporter.onclick = () => this.importerModal.classList.add('hidden');
        
        const btnProcessImport = document.getElementById('btnProcessImport');
        if (btnProcessImport) btnProcessImport.onclick = () => {
            const text = document.getElementById('importTextarea').value;
            const res = this.importer.importData(text);
            const resDiv = document.getElementById('importResult');
            resDiv.innerText = res.msg;
            resDiv.style.color = res.success ? '#27ae60' : '#d63031';
            if(res.success) this.showNotification("Datos inyectados en NEXUS.");
        };

        // 7. Configuración
        const btnOpenSettings = document.getElementById('btnOpenSettings');
        if (btnOpenSettings) btnOpenSettings.onclick = () => this.openSettings();
        const btnCloseSettings = document.getElementById('closeSettingsModal');
        if (btnCloseSettings) btnCloseSettings.onclick = () => this.settingsModal.classList.add('hidden');
        
        const btnSaveSettings = document.getElementById('btnSaveSettings');
        if (btnSaveSettings) btnSaveSettings.onclick = () => this.saveSettings();
        
        const btnClearKeys = document.getElementById('btnClearKeys');
        if (btnClearKeys) btnClearKeys.onclick = () => this.clearKeys();

        const txtKeys = document.getElementById('inputApiKeys');
        if (txtKeys) {
            txtKeys.addEventListener('input', () => {
                const count = txtKeys.value.split(/[,;\n]+/).filter(k => k.trim().length > 5).length;
                this.updateKeyCountLabel(count);
            });
        }
    }

    _loadFromCache() {
        const raw = localStorage.getItem('nexus_saga_data');
        let data = { 
            meta: { created: Date.now() }, 
            characters: [], 
            maps: [],
            places: [], // Carriles de tiempo
            placeDb: [], // Lore Places
            codex: {},
            timelines: [],
            plannerProjects: []
        };
        
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                data = { ...data, ...parsed };
                // Garantizar arrays
                if (!data.characters) data.characters = [];
                if (!data.maps) data.maps = []; 
                if (!data.places) data.places = [];
                if (!data.placeDb) data.placeDb = [];
                if (!data.codex) data.codex = {};
                if (!data.timelines) data.timelines = [];
                if (!data.plannerProjects) data.plannerProjects = [];
            } catch (e) { console.error("Error cache UI", e); }
        }
        return data;
    }

    saveToCache() {
        localStorage.setItem('nexus_saga_data', JSON.stringify(this.sagaData));
    }

    openManager(type) {
        // Recargar datos para asegurar frescura
        this.sagaData = this._loadFromCache();
        this.activeManagerType = type;

        if (type === 'CHAR') {
            this.charModal.classList.remove('hidden');
            let container = this.charModal.querySelector('.panel-body');
            container.innerHTML = '';
            
            if (typeof CharacterManager !== 'undefined') {
                const manager = new CharacterManager(this.sagaData, () => this.saveToCache(), (msg) => this.showNotification(msg));
                manager.mount(container);
            }
        } 
        else if (type === 'PLACE_DB') {
            this.placesManagerModal.classList.remove('hidden');
            let container = this.placesManagerModal.querySelector('.panel-body');
            container.innerHTML = '';

            if (typeof PlacesManager !== 'undefined') {
                const manager = new PlacesManager(this.sagaData, () => this.saveToCache(), (msg) => this.showNotification(msg));
                manager.mount(container);
            }
        }
        else if (type === 'MAP') {
            this.mapModal.classList.remove('hidden');
            let container = this.mapModal.querySelector('.panel-body');
            container.innerHTML = ''; 
            
            if (typeof MapManager !== 'undefined') {
                const manager = new MapManager(this.sagaData, () => this.saveToCache(), (msg) => this.showNotification(msg));
                manager.mount(container);
            }
        }
        else if (type === 'PLANNER') {
            this.plannerModal.classList.remove('hidden');
            let container = this.plannerModal.querySelector('.panel-body');
            container.innerHTML = ''; 
            
            if (typeof PlannerManager !== 'undefined') {
                const manager = new PlannerManager(this.sagaData, () => this.saveToCache(), (msg) => this.showNotification(msg));
                manager.mount(container);
            }
        }
        else if (type === 'CODEX') {
            this.codexModal.classList.remove('hidden');
            let container = this.codexModal.querySelector('.panel-body');
            container.innerHTML = ''; 
            
            if (typeof CodexManager !== 'undefined') {
                const manager = new CodexManager(this.sagaData, () => this.saveToCache(), (msg) => this.showNotification(msg));
                manager.mount(container);
            } else {
                container.innerHTML = "<p style='color:red; text-align:center;'>Error: codex.js no cargado.</p>";
            }
        }
    }

    openSettings() {
        this.settingsModal.classList.remove('hidden');
        if (window.NexusKeys) {
            const rawKeys = window.NexusKeys.getUserKeysRaw();
            const model = window.NexusKeys.getUserAIModel();
            
            document.getElementById('inputApiKeys').value = rawKeys;
            document.getElementById('inputAiModel').value = model;

            const count = window.NexusKeys.getUserKeyCount();
            this.updateKeyCountLabel(count);
        }
    }

    saveSettings() {
        if (!window.NexusKeys) return;
        const keyText = document.getElementById('inputApiKeys').value;
        const modelId = document.getElementById('inputAiModel').value;
        const count = window.NexusKeys.saveUserKeys(keyText);
        window.NexusKeys.saveUserAIModel(modelId);
        this.showNotification(`Configuración guardada. ${count} API Keys.`);
        this.settingsModal.classList.add('hidden');
    }

    clearKeys() {
        if(confirm("¿Borrar todas las API Keys guardadas?")) {
            document.getElementById('inputApiKeys').value = "";
            this.updateKeyCountLabel(0);
        }
    }

    updateKeyCountLabel(count) {
        const lbl = document.getElementById('keyCountLabel');
        if (lbl) {
            lbl.innerText = `${count} Key(s) lista(s)`;
            lbl.style.color = count > 0 ? '#27ae60' : '#d63031';
        }
    }

    showNotification(msg) {
        if(!this.notification) return;
        this.notification.innerText = `>> ${msg}`;
        this.notification.style.opacity = '1';
        this.notification.classList.remove('hidden');
        setTimeout(() => {
            this.notification.style.opacity = '0';
        }, 3000);
    }
}

// Exponer globalmente para arranque
window.UIManager = UIManager;