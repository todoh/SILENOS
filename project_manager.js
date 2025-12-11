// --- PROJECT MANAGER v6.0 (Lazy Load Optimization) ---
// Sincroniza ÍNDICES ligeros. El contenido se descarga solo al abrir (Lazy Loading).

import { initDriveSystem, listFilesByType, loadFileContent, saveFileToDrive } from './drive_api.js';
import { currentUser } from './auth_ui.js';
import { getUniversalDataSnapshot, importDataSnapshot, mergeItemToStorage, SESSION_DATA_ID_KEY, STORAGE_KEYS } from './project_core.js';
import { createGlobalDialogUI, silenosAlert, silenosConfirm, silenosPrompt } from './project_ui.js';

console.log("Project Manager Cargado (v6.0 - Lazy Sync)");

// CLAVE DE LIBRERÍA (Debe coincidir con datos_ui.js)
const STORAGE_KEY_LIBRARY = 'silenos_datasets_library_v2';

document.addEventListener('DOMContentLoaded', () => {
    createGlobalDialogUI();
    // Exportar funciones globales
    window.openDriveSelector = openDataSelector; 
    window.saveToDriveManual = openSaveMenu;     
    window.syncLibrary = syncLibrary;            
});

// --- 1. SINCRONIZACIÓN DE LIBRERÍA (SOLO ÍNDICES) ---

function wipeLocalData() {
    console.log("🧹 Limpiando índices locales...");
    // Borramos para reconstruir el índice limpio desde la nube
    localStorage.removeItem(STORAGE_KEYS.SCRIPTS);
    localStorage.removeItem(STORAGE_KEYS.BOOKS);
    localStorage.removeItem(STORAGE_KEYS.GAMES);
    
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

        // DESCARGA PARALELA DE ÍNDICES (Lightweight)
        await Promise.all([
            indexRemoteFiles('script', STORAGE_KEYS.SCRIPTS),
            indexRemoteFiles('book', STORAGE_KEYS.BOOKS),
            indexRemoteFiles('game', STORAGE_KEYS.GAMES),
            indexDatasetsLibrary() 
        ]);

        // Restaurar nombre del proyecto activo
        const activeName = localStorage.getItem('silenos_universe_name');
        if(dockName) dockName.textContent = activeName || "Silenos Conectado";
        
        console.log("✅ Índices sincronizados. Contenido bajo demanda.");
        
        // Refrescar vistas (Mostrarán los placeholders)
        if (window.renderScriptList) window.renderScriptList();
        if (window.renderBookList) window.renderBookList();
        if (window.renderGameList) window.renderGameList();

    } catch (e) {
        console.error("Error Sync Library:", e);
        if(dockName) dockName.textContent = "Error Sync";
    }
}

// Nueva función: Crea "Placeholders" en lugar de descargar todo el JSON
async function indexRemoteFiles(type, storageKey) {
    const files = await listFilesByType(type); // Solo obtiene ID, Name, ModifiedTime
    const placeholders = files.map(f => {
        return {
            id: f.id, // Usamos el ID de Drive temporalmente como ID local
            title: f.name.replace('.json', ''), // Título derivado del nombre de archivo
            driveFileId: f.id, // Enlace crítico para la descarga posterior
            isPlaceholder: true, // BANDERA: Indica que está vacío
            timestamp: Date.parse(f.modifiedTime) || Date.now()
        };
    });

    if (placeholders.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(placeholders));
    }
}

// Versión especial para Datasets
async function indexDatasetsLibrary() {
    console.log("📥 Indexando Datasets...");
    const files = await listFilesByType('data');
    const libraryIndex = files.map(f => {
        return {
            id: f.id,
            name: f.name.replace('.json', ''),
            driveFileId: f.id,
            isPlaceholder: true, // No tiene .data aún
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
            await indexDatasetsLibrary(); // Refrescar índice
            if(window.switchDataset) window.switchDataset(file.id); // switchDataset ahora manejará la descarga
            window.closeDriveModal();
        };
        listContainer.appendChild(div);
    });
}

// --- 3. SISTEMA DE GUARDADO COMPLETO ---

async function openSaveMenu() {
    if (!currentUser) return silenosAlert("Debes iniciar sesión.");

    const confirmed = await silenosConfirm(
        "¿Subir cambios a Drive?\nSe actualizará el proyecto activo y todos los guiones, libros y juegos.", 
        "Sincronizar Nube"
    );

    if (confirmed) {
        await saveFullProjectToDrive();
    }
}

async function saveFullProjectToDrive() {
    const dockName = document.getElementById('current-project-name');
    const originalName = dockName ? dockName.textContent : "";
    if(dockName) dockName.innerHTML = `Subiendo...`;

    try {
        await initDriveSystem(); 
        let total = 0;

        // 1. Guardar Dataset Activo
        const activeName = localStorage.getItem('silenos_universe_name');
        const activeData = JSON.parse(localStorage.getItem('minimal_universal_data'));
        
        // Recuperar ID de Drive si existe en la librería actual
        let activeDriveId = null;
        const lib = JSON.parse(localStorage.getItem(STORAGE_KEY_LIBRARY)) || [];
        // Intentar buscar por ID activo o por nombre
        const currentProjectEntry = lib.find(p => p.id === localStorage.getItem('silenos_active_dataset_id')) || lib.find(p => p.name === activeName);
        if (currentProjectEntry) activeDriveId = currentProjectEntry.driveFileId;

        const newDsId = await saveFileToDrive('data', activeName, { 
            type: 'data_set', 
            version: '4.0', 
            universeName: activeName, 
            items: activeData 
        }, activeDriveId);
        
        // Actualizar ID local
        if (newDsId && currentProjectEntry) {
            currentProjectEntry.driveFileId = newDsId;
            localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(lib));
        }
        total++;

        // 2. Guardar Colecciones (Solo las cargadas completamente o creadas nuevas)
        const bulkSave = async (storageKey, typeFolder) => {
            const items = JSON.parse(localStorage.getItem(storageKey)) || [];
            for (const item of items) {
                // IMPORTANTE: Si es placeholder y NO ha sido modificado, NO lo guardamos (ahorra tiempo y ancho de banda)
                // A menos que queramos forzar actualización. Por ahora, solo guardamos lo que no es placeholder (o sea, cargado/creado).
                if (!item.isPlaceholder) {
                    const newId = await saveFileToDrive(typeFolder, item.title || 'SinTitulo', item, item.driveFileId);
                    if(newId) item.driveFileId = newId;
                    total++;
                }
            }
            localStorage.setItem(storageKey, JSON.stringify(items));
        };

        await bulkSave(STORAGE_KEYS.SCRIPTS, 'script');
        await bulkSave(STORAGE_KEYS.BOOKS, 'book');
        await bulkSave(STORAGE_KEYS.GAMES, 'game');

        if(dockName) dockName.textContent = originalName;
        await silenosAlert(`✅ Guardado inteligente completado (${total} archivos actualizados).`);
        
    } catch (e) {
        console.error("Full Save Error:", e);
        if(dockName) dockName.textContent = "Error";
        await silenosAlert("Error guardando: " + e.message);
    }
}