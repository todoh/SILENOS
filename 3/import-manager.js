/* SILENOS 3/import-manager.js */
/* Controlador Principal: Coordina UI y Core */

const ImportManager = {
    renderInWindow(windowId) {
        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        // Delegar renderizado a ImportUI
        winContent.innerHTML = ImportUI.getMainWindowTemplate(windowId);

        this.setupEvents(windowId);
        if (window.lucide) lucide.createIcons();
    },

    setupEvents(windowId) {
        const textarea = document.getElementById(`import-text-${windowId}`);
        const overlay = document.getElementById(`import-overlay-${windowId}`);

        if (!textarea) return;

        // UI Drag & Drop feedback
        textarea.addEventListener('dragover', (e) => { e.preventDefault(); overlay.style.opacity = '1'; });
        textarea.addEventListener('dragleave', (e) => { e.preventDefault(); overlay.style.opacity = '0'; });
        
        // Manejo del Drop real
        textarea.addEventListener('drop', async (e) => {
            e.preventDefault(); 
            e.stopPropagation();
            overlay.style.opacity = '0';

            const items = e.dataTransfer.items;
            if (items && items.length > 0) {
                ImportUI.setStatus(windowId, "Analizando materia binaria...", "text-blue-500");
                
                // Delegar procesamiento a ImportCore
                const collectedItems = await ImportCore.processDroppedItems(items);

                if (collectedItems.length > 0) {
                    textarea.value = JSON.stringify(collectedItems, null, 2);
                    ImportUI.setStatus(windowId, `${collectedItems.length} elementos listos para confluencia.`, "text-green-600");
                }
            }
        });
    },

    async executeImport(windowId) {
        let raw = document.getElementById(`import-text-${windowId}`).value.trim();
        
        // Limpieza de bloques de código Markdown (útil si se pega desde IA)
        if (raw.startsWith('```')) {
            raw = raw.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
        }

        if (!raw) return ImportUI.setStatus(windowId, "El área está vacía.", "text-red-500");

        try {
            let data = JSON.parse(raw);
            if (!Array.isArray(data)) data = [data]; 

            // Delegar la lógica de negocio a ImportCore
            const { count, modulesCount } = await ImportCore.importToSystem(data);

            ImportUI.setStatus(windowId, `Importado: ${count} items, ${modulesCount} módulos.`, "text-green-600 font-bold");
            if (typeof refreshSystemViews === 'function') refreshSystemViews();
            
        } catch (e) {
            ImportUI.setStatus(windowId, "Error JSON: " + e.message, "text-red-600");
        }
    },

    async downloadBackup(windowId) {
        try {
            const backupData = await ImportCore.generateBackupData();
            
            const jsonStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `silenos_full_backup_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            ImportUI.setStatus(windowId, `Backup generado (${backupData.length} items).`, "text-indigo-600");
        } catch (e) {
            ImportUI.setStatus(windowId, "Error: " + e.message, "text-red-500");
        }
    },

    showResetModal(windowId) {
        const container = document.getElementById(`modal-container-${windowId}`);
        if (!container) return;
        
        container.innerHTML = ImportUI.getResetModalTemplate(windowId);
        if (window.lucide) lucide.createIcons();
    },

    executeReset(windowId) {
        // Preservar API Keys
        const savedKeys = localStorage.getItem('silenos_api_keys');
        localStorage.clear();
        if (savedKeys) localStorage.setItem('silenos_api_keys', savedKeys);

        // Mostrar UI de carga
        const container = document.getElementById(`modal-container-${windowId}`);
        if (container) {
            container.innerHTML = ImportUI.getResettingTemplate();
            if (window.lucide) lucide.createIcons();
        }

        setTimeout(() => location.reload(), 1500);
    }
};