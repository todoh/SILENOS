// --- MAIN.JS ---
const Sys = window.parent.SystemConfig;
const FS = window.parent;

window.app = {
    init() {
        // Verificar Auth
        this.checkAuth();
        window.parent.addEventListener('silenos:config-updated', () => this.checkAuth());

        // Inicializar UI y Lógica
        if(typeof Logic !== 'undefined') Logic.init();
        if(typeof UI !== 'undefined') UI.init();

        console.log("Koreh System Initialized.");
    },

    checkAuth() {
        const indicator = document.getElementById('status-indicator');
        const text = document.getElementById('status-text');
        
        if (Sys && Sys.authKey) {
            indicator.className = "w-2 h-2 rounded-full bg-black";
            text.innerText = "ONLINE";
            text.className = "text-[9px] font-mono text-black font-bold";
        } else {
            indicator.className = "w-2 h-2 rounded-full bg-gray-300";
            text.innerText = "OFFLINE";
            text.className = "text-[9px] font-mono text-gray-400";
        }
    },

    log(msg, type='info') {
        const consoleEl = document.getElementById('console-log');
        const div = document.createElement('div');
        div.className = `mb-1 ${type === 'error' ? 'text-red-500' : type === 'success' ? 'text-green-600' : 'text-gray-500'}`;
        div.innerText = `> ${msg}`;
        consoleEl.prepend(div);
    }
};

window.onload = () => window.app.init();