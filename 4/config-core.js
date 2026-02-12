// --- CONFIG-CORE.JS (SYSTEM LOGIC & AUTH) ---

window.SystemConfig = {
    // Clave para guardar variables en localStorage
    STORAGE_KEY_VARS: 'SILENOS_SYS_VARS',
    // Clave para la API Key de Pollinations
    STORAGE_KEY_AUTH: 'pollinations_api_key',
    
    // Estado en memoria
    variables: {},
    authKey: null,

    init() {
        this.loadVariables();
        this.loadAuth();
        this.attachAuthListener();
        console.log("⚙️ SystemConfig: Core Loaded");
    },

    // --- GESTIÓN DE VARIABLES ---
    loadVariables() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_VARS);
            this.variables = raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error("Error loading system vars", e);
            this.variables = {};
        }
    },

    saveVariables() {
        localStorage.setItem(this.STORAGE_KEY_VARS, JSON.stringify(this.variables));
        this.notifyChange();
    },

    setVar(key, value) {
        this.variables[key] = value;
        this.saveVariables();
    },

    getVar(key) {
        return this.variables[key] || null;
    },

    deleteVar(key) {
        delete this.variables[key];
        this.saveVariables();
    },

    getAllVars() {
        return this.variables;
    },

    // --- GESTIÓN DE AUTENTICACIÓN (POLLINATIONS) ---
    loadAuth() {
        this.authKey = localStorage.getItem(this.STORAGE_KEY_AUTH);
    },

    login() {
        // Redirige a la página de autenticación de Pollinations
        const redirectUrl = encodeURIComponent(window.location.href);
        window.open(`https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}`, 'PollinationsAuth', 'width=500,height=700');
    },

    logout() {
        localStorage.removeItem(this.STORAGE_KEY_AUTH);
        this.authKey = null;
        if (typeof showToast === 'function') showToast("AUTH: DISCONNECTED");
        this.notifyChange();
    },

    attachAuthListener() {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'POLLI_AUTH_SUCCESS' && event.data.key) {
                this.authKey = event.data.key;
                localStorage.setItem(this.STORAGE_KEY_AUTH, this.authKey);
                if (typeof showToast === 'function') showToast("AUTH: CONNECTED SUCCESSFULLY");
                this.notifyChange();
            }
        });
    },

    // --- SISTEMA DE NOTIFICACIÓN INTERNA ---
    notifyChange() {
        // Dispara un evento personalizado para que la UI sepa que debe repintarse
        window.dispatchEvent(new CustomEvent('silenos:config-updated'));
    }
};

// Inicializar al cargar
if (document.readyState === 'complete') {
    SystemConfig.init();
} else {
    window.addEventListener('load', () => SystemConfig.init());
}