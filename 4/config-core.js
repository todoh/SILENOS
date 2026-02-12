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

    // --- INTERCEPTOR DE REDIRECCIÓN (CRÍTICO) ---
    checkAuthRedirect() {
        const hash = window.location.hash;
        if (!hash) return false;

        // Extraer parámetros del hash (#api_key=...)
        const params = new URLSearchParams(hash.substring(1));
        
        // BUSCAMOS 'api_key' (que es el que usa Pollinations actualmente)
        const key = params.get('api_key') || params.get('key') || params.get('access_token');

        if (key) {
            console.log("AUTH: Key found in URL. Handshaking...");
            
            // Si hay ventana padre, le pasamos la llave
            if (window.opener) {
                window.opener.postMessage({
                    type: 'POLLI_AUTH_SUCCESS',
                    key: key
                }, '*');
                
                console.log("AUTH: Closing popup.");
                window.close(); // Cerrar ventana inmediatamente
                return true; 
            }
        }
        return false;
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
        // Abrimos popup
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

    notifyChange() {
        window.dispatchEvent(new CustomEvent('silenos:config-updated'));
    }
};

// --- EJECUCIÓN ---

// 1. PRIMERO: Verificar si somos el Popup de Auth ANTES de cargar nada más.
if (window.SystemConfig.checkAuthRedirect()) {
    // Si devolvió true, es que encontró la key y mandó cerrar.
    // Detenemos la carga visual ocultando el body para evitar el "flash" de la interfaz.
    if (document.body) document.body.style.display = 'none';
    // No llamamos a init() para no arrancar el resto del sistema en el popup.
} 
else {
    // 2. Si NO es popup, iniciamos normal.
    if (document.readyState === 'complete') {
        SystemConfig.init();
    } else {
        window.addEventListener('load', () => SystemConfig.init());
    }
}