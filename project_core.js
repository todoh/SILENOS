// --- PROJECT CORE (Lógica de Datos y Estado) ---
// Adaptado para estructura modular (Data, Script, Book, Game)

export const STORAGE_KEYS = {
    DATA: 'minimal_universal_data',
    BOOKS: 'minimal_books_v4',
    SCRIPTS: 'minimal_scripts_v1',
    GAMES: 'minimal_games_v1',
    PROJECT_NAME: 'silenos_universe_name'
};

// Claves de sesión para el PROYECTO DE DATOS ACTIVO
export const SESSION_DATA_ID_KEY = 'silenos_active_data_id';

// --- GESTIÓN DE DATOS ---

export function getUniversalDataSnapshot() {
    return {
        type: 'data_set',
        version: "4.0",
        universeName: localStorage.getItem(STORAGE_KEYS.PROJECT_NAME) || 'Proyecto Sin Nombre',
        items: JSON.parse(localStorage.getItem(STORAGE_KEYS.DATA)) || []
    };
}

// Helpers para obtener items individuales para guardar
export function getScriptById(id) {
    const scripts = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCRIPTS)) || [];
    return scripts.find(s => s.id === id);
}

export function getBookById(id) {
    const books = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || [];
    return books.find(b => b.id === id);
}

export function getGameById(id) {
    const games = JSON.parse(localStorage.getItem(STORAGE_KEYS.GAMES)) || [];
    return games.find(g => g.id === id);
}

// Importación de DATOS (Solo afecta al worldbuilding)
export function importDataSnapshot(data) {
    if (!data || !data.items) return false;
    try {
        localStorage.setItem(STORAGE_KEYS.DATA, JSON.stringify(data.items));
        localStorage.setItem(STORAGE_KEYS.PROJECT_NAME, data.universeName || "Proyecto Importado");
        return true;
    } catch (e) {
        console.error("Error Core Import Data:", e);
        return false;
    }
}

// --- UTILIDAD DE MERGE (Para cargar librería completa) ---
export function mergeItemToStorage(storageKey, item, remoteFileId) {
    let list = JSON.parse(localStorage.getItem(storageKey)) || [];
    
    // Inyectamos el ID de Drive para rastreo futuro
    item.driveFileId = remoteFileId;

    const index = list.findIndex(i => i.id === item.id);
    if (index !== -1) {
        // Si existe, actualizamos (asumimos que la nube es la verdad al cargar)
        list[index] = item;
    } else {
        list.push(item);
    }
    localStorage.setItem(storageKey, JSON.stringify(list));
}