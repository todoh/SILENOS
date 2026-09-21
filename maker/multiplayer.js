// multiplayer.js - GESTIÓN DE CONFIGURACIÓN Y PESTAÑA MULTIJUGADOR EN EDITOR SILENOS MAKER
class MultiplayerManager {
    constructor() {
        this.initUI();
    }

    initUI() {
        document.addEventListener('DOMContentLoaded', () => {
            this.bindEvents();
            this.loadConfigToUI();
        });
    }

    bindEvents() {
        const chkEnabled = document.getElementById('mp-enable-chk');
        const btnSave = document.getElementById('btn-save-mp-config');

        if (chkEnabled) {
            chkEnabled.addEventListener('change', (e) => {
                if (!projectData.multiplayerConfig) projectData.multiplayerConfig = {};
                projectData.multiplayerConfig.enabled = e.target.checked;
                const configGroup = document.getElementById('mp-credentials-group');
                if (configGroup) configGroup.style.display = e.target.checked ? 'flex' : 'none';
                if (typeof autoSaveJSON === 'function') autoSaveJSON();
            });
        }

        if (btnSave) {
            btnSave.addEventListener('click', () => {
                this.saveUIToConfig();
            });
        }
    }

    loadConfigToUI() {
        if (!projectData.multiplayerConfig) {
            projectData.multiplayerConfig = {
                enabled: false,
                apiKey: "",
                authDomain: "",
                databaseURL: "",
                projectId: "",
                storageBucket: "",
                messagingSenderId: "",
                appId: ""
            };
        }

        const cfg = projectData.multiplayerConfig;
        const chkEnabled = document.getElementById('mp-enable-chk');
        const configGroup = document.getElementById('mp-credentials-group');

        if (chkEnabled) chkEnabled.checked = !!cfg.enabled;
        if (configGroup) configGroup.style.display = cfg.enabled ? 'flex' : 'none';

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('mp-api-key', cfg.apiKey);
        setVal('mp-auth-domain', cfg.authDomain);
        setVal('mp-database-url', cfg.databaseURL);
        setVal('mp-project-id', cfg.projectId);
        setVal('mp-storage-bucket', cfg.storageBucket);
        setVal('mp-messaging-sender-id', cfg.messagingSenderId);
        setVal('mp-app-id', cfg.appId);
    }

    saveUIToConfig() {
        if (!projectData.multiplayerConfig) projectData.multiplayerConfig = {};

        const getVal = (id) => (document.getElementById(id)?.value || '').trim();

        projectData.multiplayerConfig = {
            enabled: document.getElementById('mp-enable-chk')?.checked || false,
            apiKey: getVal('mp-api-key'),
            authDomain: getVal('mp-auth-domain'),
            databaseURL: getVal('mp-database-url'),
            projectId: getVal('mp-project-id'),
            storageBucket: getVal('mp-storage-bucket'),
            messagingSenderId: getVal('mp-messaging-sender-id'),
            appId: getVal('mp-app-id')
        };

        if (typeof autoSaveJSON === 'function') autoSaveJSON();

        const statusEl = document.getElementById('mp-status-msg');
        if (statusEl) {
            statusEl.textContent = " Credenciales guardadas con éxito";
            statusEl.style.color = "#34c759";
            setTimeout(() => { statusEl.textContent = ""; }, 2500);
        }
    }
}

const multiplayerManager = new MultiplayerManager();

function updateMultiplayerUI() {
    multiplayerManager.loadConfigToUI();
}