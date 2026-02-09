/* 3/js/config/auth.js */
window.AuthManager = {
    init: function() {
        this.updateAuthUI();
        this.setupListeners();
    },

    setupListeners: function() {
        // Escuchar cambios en localStorage (multiventana)
        window.addEventListener('storage', () => {
            if(SERVICE) SERVICE.loadSettings();
            this.updateAuthUI();
        });

        // Escuchar postMessage del popup
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'POLLI_AUTH_SUCCESS' && event.data.key) {
                if(SERVICE) SERVICE.setKey(event.data.key);
                this.updateAuthUI();
            }
        });
    },

    loginPollinations: function() {
        const redirectUrl = encodeURIComponent("https://www.silenos.es/3/");
        const width = 500; const height = 700;
        const left = (window.screen.width / 2) - (width / 2);
        const top = (window.screen.height / 2) - (height / 2);
        
        window.open(
            `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}`, 
            'PollinationsAuth', 
            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
        );
    },

    logoutPollinations: function() {
        if(SERVICE) SERVICE.logout();
        this.updateAuthUI();
    },

    updateAuthUI: function() {
        const isAuth = localStorage.getItem('pollinations_api_key');
        
        // Elementos UI
        const statusDiv = document.getElementById('connection-status');
        const loginSection = document.getElementById('auth-login-section');
        const userSection = document.getElementById('auth-user-section');
        const keyDisplay = document.getElementById('api-key-display');
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');

        if (isAuth) {
            // ONLINE
            if(statusText) statusText.innerText = "ONLINE";
            if(statusText) statusText.classList.replace('text-slate-400', 'text-green-400');
            
            if(statusIndicator) {
                statusIndicator.classList.remove('bg-red-500');
                statusIndicator.classList.add('bg-green-500', 'shadow-[0_0_10px_#22c55e]');
            }

            if(loginSection) loginSection.style.display = 'none';
            if(userSection) userSection.style.display = 'flex';
            if(keyDisplay) keyDisplay.innerText = 'Key: ' + isAuth.substring(0, 10) + '...';
            
        } else {
            // OFFLINE
            if(statusText) statusText.innerText = "OFFLINE";
            if(statusText) statusText.classList.replace('text-green-400', 'text-slate-400');

            if(statusIndicator) {
                statusIndicator.classList.remove('bg-green-500', 'shadow-[0_0_10px_#22c55e]');
                statusIndicator.classList.add('bg-red-500');
            }

            if(loginSection) loginSection.style.display = 'block';
            if(userSection) userSection.style.display = 'none';
        }
    }
};