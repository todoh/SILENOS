// --- PROJECT CORE (Lógica de Datos y Estado) ---
// Responsable de: Snapshots, Importación de JSON y Autoguardado.

import { initDriveFolder, saveProjectToDrive } from './drive_api.js';

console.log("Project Core Cargado");

// Claves de Sistema
export const STORAGE_KEYS = [
    'minimal_universal_data',
    'minimal_books_v4',
    'minimal_scripts_v1',
    'minimal_games_v1',
    'silenos_universe_name'
];

export const SESSION_FILE_ID_KEY = 'silenos_active_drive_id';
export const SESSION_FILE_NAME_KEY = 'silenos_active_project_name';

let autosaveTimer = null;
let lastSnapshot = ""; 

// --- GESTIÓN DE DATOS (SNAPSHOTS) ---

export function getProjectSnapshot() {
    return {
        version: "3.7",
        timestamp: new Date().toISOString(),
        universeName: localStorage.getItem('silenos_universe_name') || 'Proyecto Sin Nombre',
        universalData: JSON.parse(localStorage.getItem('minimal_universal_data')) || [],
        books: JSON.parse(localStorage.getItem('minimal_books_v4')) || [],
        scripts: JSON.parse(localStorage.getItem('minimal_scripts_v1')) || [],
        games: JSON.parse(localStorage.getItem('minimal_games_v1')) || []
    };
}

export function importProjectSnapshot(data) {
    if (!data) return false;
    
    try {
        console.log("📥 Inyectando snapshot al núcleo...");
        // Limpieza preventiva (opcional, dependiendo de si quieres mezclar o reemplazar)
        // localStorage.clear(); // Cuidado con esto si hay otras keys

        if (data.universalData) localStorage.setItem('minimal_universal_data', JSON.stringify(data.universalData));
        if (data.books) localStorage.setItem('minimal_books_v4', JSON.stringify(data.books));
        if (data.scripts) localStorage.setItem('minimal_scripts_v1', JSON.stringify(data.scripts));
        if (data.games) localStorage.setItem('minimal_games_v1', JSON.stringify(data.games));
        
        // Mantener nombre o usar el entrante
        const newName = data.universeName || "Proyecto Importado";
        localStorage.setItem('silenos_universe_name', newName);

        // Si viene de P2P, limpiamos la referencia a Drive para no sobrescribir el archivo del otro usuario
        sessionStorage.removeItem(SESSION_FILE_ID_KEY);
        sessionStorage.setItem(SESSION_FILE_NAME_KEY, newName);

        return true;
    } catch (e) {
        console.error("Error Core Import:", e);
        return false;
    }
}

// --- SISTEMA DE AUTOGUARDADO ---

export function startAutosaveSystem() {
    lastSnapshot = JSON.stringify(getProjectSnapshot());
    if (autosaveTimer) clearInterval(autosaveTimer);

    console.log("💾 Autoguardado iniciado...");

    autosaveTimer = setInterval(async () => {
        const fileId = sessionStorage.getItem(SESSION_FILE_ID_KEY);
        const currentLocalName = localStorage.getItem('silenos_universe_name');
        const sessionCloudName = sessionStorage.getItem(SESSION_FILE_NAME_KEY);

        // Solo guardamos si hay un archivo vinculado y los nombres coinciden
        if (!fileId || currentLocalName !== sessionCloudName) return;

        const currentData = getProjectSnapshot();
        const currentString = JSON.stringify(currentData);

        if (currentString !== lastSnapshot) {
            const folderId = await initDriveFolder();
            const dockName = document.getElementById('current-project-name');
            
            if(dockName) dockName.innerHTML = `${sessionCloudName} <span style="font-size:0.8em; opacity:0.7">↻</span>`;
            
            try {
                await saveProjectToDrive(folderId, sessionCloudName, currentData, fileId);
                lastSnapshot = currentString;
                if(dockName) dockName.textContent = sessionCloudName;
                console.log("Autoguardado exitoso.");
            } catch (e) { 
                console.warn("Autosave fail", e); 
                if(dockName) dockName.innerHTML = `${sessionCloudName} <span style="color:red; font-size:0.8em;">⚠</span>`;
            }
        }
    }, 15000); // Cada 15 segundos
}

export function stopAutosaveSystem() {
    if (autosaveTimer) clearInterval(autosaveTimer);
}