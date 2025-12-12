// --- PROJECT MANAGER v6.2 (Full Data Pruning) ---
// Sincroniza ÍNDICES y realiza limpieza espejo completa (incluyendo Datasets eliminados).

import { initDriveSystem, listFilesByType, saveFileToDrive, deleteFile } from './drive_api.js';
import { currentUser } from './auth_ui.js';
import { STORAGE_KEYS } from './project_core.js';
import { createGlobalDialogUI, silenosAlert, silenosConfirm } from './project_ui.js';

console.log("Project Manager Cargado (v6.2 - Full Data Pruning)");

// CLAVE DE LIBRERÍA
const STORAGE_KEY_LIBRARY = 'silenos_datasets_library_v2';

document.addEventListener('DOMContentLoaded', () => {
    createGlobalDialogUI();
    window.openDriveSelector = openDataSelector; 
    window.saveToDriveManual = openSaveMenu;     
    window.syncLibrary = syncLibrary;            
});

// --- 1. SINCRONIZACIÓN DE LIBRERÍA (SOLO ÍNDICES) ---

function wipeLocalData() {
    console.log("🧹 Limpiando índices locales...");
    localStorage.removeItem(STORAGE_KEYS.SCRIPTS);
    localStorage.removeItem(STORAGE_KEYS.BOOKS);
    localStorage.removeItem(STORAGE_KEYS.GAMES);
    // Nota: No borramos la librería de datos aquí para no perder el dataset activo si falla la red,
    // pero se sobrescribirá al bajar los índices.
    
    if (window.renderScriptList) window.renderScriptList();
    if (window.renderBookList) window.renderBookList();
    if (window.renderGameList) window.renderGameList();
}

async function syncLibrary() {
    if (!currentUser) return;
    
    const dockName = document.getElementById('current-project-name');
    if(dockName) dockName.innerHTML = `☁️ Indexando...`;

    try {
        wipeLocalData();
        await initDriveSystem();

        await Promise.all([
            indexRemoteFiles('script', STORAGE_KEYS.SCRIPTS),
            indexRemoteFiles('book', STORAGE_KEYS.BOOKS),
            indexRemoteFiles('game', STORAGE_KEYS.GAMES),
            indexDatasetsLibrary() 
        ]);

        const activeName = localStorage.getItem('silenos_universe_name');
        if(dockName) dockName.textContent = activeName || "Silenos Conectado";
        
        console.log("✅ Índices sincronizados. Contenido bajo demanda.");
        
        if (window.renderScriptList) window.renderScriptList();
        if (window.renderBookList) window.renderBookList();
        if (window.renderGameList) window.renderGameList();

    } catch (e) {
        console.error("Error Sync Library:", e);
        if(dockName) dockName.textContent = "Error Sync";
    }
}

async function indexRemoteFiles(type, storageKey) {
    const files = await listFilesByType(type); 
    const placeholders = files.map(f => {
        return {
            id: f.id, 
            title: f.name.replace('.json', ''), 
            driveFileId: f.id, 
            isPlaceholder: true, 
            timestamp: Date.parse(f.modifiedTime) || Date.now()
        };
    });

    if (placeholders.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(placeholders));
    }
}

async function indexDatasetsLibrary() {
    console.log("📥 Indexando Datasets...");
    const files = await listFilesByType('data');
    const libraryIndex = files.map(f => {
        return {
            id: f.id,
            name: f.name.replace('.json', ''),
            driveFileId: f.id,
            isPlaceholder: true, 
            timestamp: Date.parse(f.modifiedTime) || Date.now()
        };
    });

    if (libraryIndex.length > 0) {
        localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(libraryIndex));
        if (window.refreshDatasetLibrary) window.refreshDatasetLibrary();
    }
}

// --- 2. GESTIÓN DE DATOS (PROYECTO ACTIVO) ---

async function openDataSelector() {
    if (!currentUser) return silenosAlert("Debes iniciar sesión.");
    const modal = document.getElementById('drive-modal');
    if (!modal) return; 
    
    const listContainer = document.getElementById('drive-file-list');
    listContainer.innerHTML = '<div style="text-align:center; padding:20px;">Cargando...</div>';
    
    modal.classList.add('active'); 
    modal.style.display = 'flex';

    await initDriveSystem();
    const files = await listFilesByType('data');
    
    listContainer.innerHTML = '';
    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'drive-file-item';
        div.innerHTML = `<span class="drive-name">${file.name.replace('.json','')}</span>`;
        div.onclick = async () => {
            await indexDatasetsLibrary(); 
            if(window.switchDataset) window.switchDataset(file.id); 
            window.closeDriveModal();
        };
        listContainer.appendChild(div);
    });
}

// --- 3. SISTEMA DE GUARDADO COMPLETO (MIRROR SYNC) ---

async function openSaveMenu() {
    if (!currentUser) return silenosAlert("Debes iniciar sesión.");

    const confirmed = await silenosConfirm(
        "¿Sincronizar con Drive?\nSe subirán tus cambios y SE BORRARÁN de la nube los archivos que hayas eliminado aquí.", 
        "Sincronizar Espejo"
    );

    if (confirmed) {
        await saveFullProjectToDrive();
    }
}

async function saveFullProjectToDrive() {
    const dockName = document.getElementById('current-project-name');
    const originalName = dockName ? dockName.textContent : "";
    if(dockName) dockName.innerHTML = `Sincronizando...`;

    try {
        await initDriveSystem(); 
        let totalUpdated = 0;
        let totalDeleted = 0;

        // ---------------------------------------------------------
        // A. GUARDAR LIBRERÍA DE DATASETS (CON PRUNING)
        // ---------------------------------------------------------
        
        // 1. Asegurar que el dataset activo actual está actualizado en la librería local
        const activeName = localStorage.getItem('silenos_universe_name');
        const activeData = JSON.parse(localStorage.getItem('minimal_universal_data')) || [];
        const activeId = localStorage.getItem('silenos_active_dataset_id');
        
        let library = JSON.parse(localStorage.getItem(STORAGE_KEY_LIBRARY)) || [];
        
        // Actualizar el activo en el array antes de subir
        const activeIndex = library.findIndex(p => p.id === activeId);
        if (activeIndex !== -1) {
            library[activeIndex].name = activeName;
            library[activeIndex].data = activeData;
            library[activeIndex].timestamp = Date.now();
            delete library[activeIndex].isPlaceholder;
        }

        // 2. Procesar la librería completa (Mirror Sync)
        const remoteDataFiles = await listFilesByType('data');
        const validDataDriveIds = [];

        for (const item of library) {
            // Solo subimos si NO es placeholder (si es placeholder, no tenemos los datos para subir)
            if (!item.isPlaceholder) {
                // Formato específico para Datasets
                const payload = {
                    type: 'data_set',
                    version: '4.0',
                    universeName: item.name,
                    items: item.data // Aquí va el array de cartas
                };

                const newId = await saveFileToDrive('data', item.name || 'SinTitulo', payload, item.driveFileId);
                if (newId) {
                    item.driveFileId = newId;
                    validDataDriveIds.push(newId);
                    totalUpdated++;
                }
            } else {
                // Si es placeholder, conservamos su ID existente como válido para no borrarlo
                if (item.driveFileId) validDataDriveIds.push(item.driveFileId);
            }
        }

        // Guardar librería actualizada con nuevos IDs
        localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(library));

        // 3. Limpieza de Datasets Huérfanos en Drive
        const dataOrphans = remoteDataFiles.filter(remote => !validDataDriveIds.includes(remote.id));
        if (dataOrphans.length > 0) {
            console.log(`🗑️ Eliminando ${dataOrphans.length} datasets obsoletos...`);
            await Promise.all(dataOrphans.map(o => deleteFile(o.id)));
            totalDeleted += dataOrphans.length;
        }

        // ---------------------------------------------------------
        // B. GUARDAR COLECCIONES (SCRIPTS, BOOKS, GAMES)
        // ---------------------------------------------------------
        const bulkSaveAndPrune = async (storageKey, typeFolder) => {
            const items = JSON.parse(localStorage.getItem(storageKey)) || [];
            
            // Subida
            for (const item of items) {
                if (!item.isPlaceholder) {
                    const newId = await saveFileToDrive(typeFolder, item.title || 'SinTitulo', item, item.driveFileId);
                    if(newId) item.driveFileId = newId;
                    totalUpdated++;
                }
            }
            localStorage.setItem(storageKey, JSON.stringify(items));

            // Limpieza
            const remoteFiles = await listFilesByType(typeFolder);
            const validDriveIds = items.map(i => i.driveFileId).filter(id => id);
            const orphans = remoteFiles.filter(remote => !validDriveIds.includes(remote.id));

            if (orphans.length > 0) {
                console.log(`🗑️ Eliminando ${orphans.length} archivos huérfanos en ${typeFolder}...`);
                await Promise.all(orphans.map(orphan => deleteFile(orphan.id)));
                totalDeleted += orphans.length;
            }
        };

        await bulkSaveAndPrune(STORAGE_KEYS.SCRIPTS, 'script');
        await bulkSaveAndPrune(STORAGE_KEYS.BOOKS, 'book');
        await bulkSaveAndPrune(STORAGE_KEYS.GAMES, 'game');

        if(dockName) dockName.textContent = originalName;
        await silenosAlert(`✅ Sincronización Completa.\n⬆️ Actualizados: ${totalUpdated}\n🗑️ Eliminados: ${totalDeleted}`);
        
    } catch (e) {
        console.error("Full Save Error:", e);
        if(dockName) dockName.textContent = "Error";
        await silenosAlert("Error sincronizando: " + e.message);
    }
}