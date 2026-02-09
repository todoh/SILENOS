/* 3/js/config/storage.js */
window.StorageManager = {
    init: function() {
        this.updateStats();
        this.setupListeners();
        setInterval(() => this.updateStats(), 5000);
    },

    setupListeners: function() {
        const btnBackup = document.getElementById('btn-backup-download');
        if(btnBackup) btnBackup.addEventListener('click', () => this.downloadBackup());

        const btnWipe = document.getElementById('btn-wipe-data');
        if(btnWipe) btnWipe.addEventListener('click', () => this.wipeData());
    },

    updateStats: async function() {
        const bar = document.getElementById('storage-bar');
        const text = document.getElementById('storage-text');
        const details = document.getElementById('storage-details');

        if (!navigator.storage || !navigator.storage.estimate) {
            if(text) text.innerText = "API no disponible";
            return;
        }

        try {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || (512 * 1024 * 1024);
            const percent = (usage / quota) * 100;
            
            const usageMB = (usage / (1024 * 1024)).toFixed(2);
            const quotaDisplay = (quota / (1024 * 1024 * 1024)).toFixed(1) + ' GB';

            if (bar) {
                bar.style.width = `${percent}%`;
                bar.className = percent > 80 
                    ? 'h-full bg-red-500 transition-all duration-1000 ease-out' 
                    : 'h-full bg-indigo-500 transition-all duration-1000 ease-out';
            }
            if (text) text.innerText = `${percent.toFixed(1)}% USADO`;
            if (details) details.innerHTML = `Utilizando <span class="text-white font-bold">${usageMB} MB</span> de <span class="text-slate-400">${quotaDisplay}</span>.`;

        } catch (error) {
            console.error("Storage Error:", error);
        }
    },

    downloadBackup: function() {
        let data = [];
        try {
            // Intentar obtener datos vivos del padre
            if (window.parent && window.parent.FileSystem) {
                data = window.parent.FileSystem.data || [];
            }
        } catch (e) { console.error(e); }

        if (!data || data.length === 0) {
            alert("No hay datos cargados para exportar.");
            return;
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SILENOS_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 100);
    },

    wipeData: function() {
        if(!confirm('☢️ PELIGRO: FORMATEO TOTAL ☢️\n\nSe eliminará la base de datos (IndexedDB), el almacenamiento local y la caché.\n\n¿Estás seguro?')) return;

        console.log("🔥 Iniciando protocolo de destrucción...");

        // 1. Matar la referencia en memoria RAM del padre inmediatamente
        if (window.parent && window.parent.FileSystem) {
            window.parent.FileSystem.data = [];
            window.parent.FileSystem._modifiedIds = new Set(); // Evitar guardados pendientes
            window.parent.FileSystem._deletedIds = new Set();
        }

        // 2. Destruir la Base de Datos (IndexedDB)
        // Usamos window.parent.indexedDB para asegurarnos de borrar la del dominio principal
        const dbRequest = (window.parent.indexedDB || window.indexedDB).deleteDatabase('SilenosFS');

        dbRequest.onsuccess = () => {
            console.log("✅ Base de datos eliminada.");
            this._finalizeWipe();
        };

        dbRequest.onerror = (e) => {
            console.error("❌ Error borrando DB:", e);
            alert("Error crítico borrando la base de datos. Intenta borrar los datos del sitio manualmente desde el navegador.");
            this._finalizeWipe(); // Intentamos seguir igual
        };

        dbRequest.onblocked = () => {
            console.warn("⚠️ Borrado bloqueado. Cerrando conexiones...");
            // Si está bloqueado, forzamos recarga inmediata para soltar el bloqueo y reintentar (manual por el usuario)
            window.parent.location.reload();
        };
    },

    _finalizeWipe: function() {
        // 3. Borrar LocalStorage (Legacy y Configs)
        try {
            window.parent.localStorage.clear();
            localStorage.clear();
        } catch(e) {}

        // 4. Borrar Caché de archivos (Blobs)
        if(window.caches) {
            caches.delete('silenos-fs-v1').then(() => {
                console.log("✅ Caché eliminada.");
                // 5. REINICIO FINAL
                window.parent.location.reload();
            });
        } else {
            window.parent.location.reload();
        }
    }
};