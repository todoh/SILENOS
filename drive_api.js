import { getDriveToken, silenosLogout, refreshGoogleSession } from './auth_ui.js';

console.log("Módulo Drive API Cargado (v4.0 - Auto Retry)");

// Configuración de Carpetas
const PARENT_SYSTEM_FOLDER = 'SILEN_SYSTEM';
const FOLDER_CONFIG = {
    data:   { name: 'Silenos_Data',   mime: 'application/vnd.google-apps.folder' },
    script: { name: 'Silenos_Scripts', mime: 'application/vnd.google-apps.folder' },
    book:   { name: 'Silenos_Books',   mime: 'application/vnd.google-apps.folder' },
    game:   { name: 'Silenos_Games',   mime: 'application/vnd.google-apps.folder' }
};

// Cache de IDs de carpetas
let folderIds = {
    root: null,
    data: null,
    script: null,
    book: null,
    game: null
};

// --- CORE: FETCH CON REINTENTO AUTOMÁTICO (WRAPPER) ---
// Esta función envuelve todas las llamadas a la API de Drive.
// Si recibe un 401 (Token Caducado), pide renovar y reintenta la petición original.
async function driveFetch(url, options = {}) {
    let token = getDriveToken();
    
    // Inyectar Authorization si no está
    if (!options.headers) options.headers = {};
    options.headers['Authorization'] = `Bearer ${token}`;

    let response = await fetch(url, options);

    // Si el token caducó (Error 401)
    if (response.status === 401) {
        console.warn("⚠️ Token de Drive caducado (1h). Iniciando protocolo de renovación...");
        
        // 1. Preguntar al usuario (necesario para habilitar el popup de seguridad)
        // Usamos confirm nativo porque necesitamos bloquear la ejecución hasta que el usuario decida.
        const userWantsRefresh = confirm("⚠️ Tu sesión de seguridad con Google ha expirado (Límite 1h).\n\nPara no perder tu trabajo, pulsa 'Aceptar' y se renovará la conexión sin recargar la página.\n(Si pulsas Cancelar, la operación fallará).");

        if (userWantsRefresh) {
            // 2. Intentar renovar (abre popup momentáneo)
            const newToken = await refreshGoogleSession();
            
            if (newToken) {
                // 3. Reintentar la petición original con el nuevo token
                console.log("🔄 Reintentando operación con nuevo token...");
                options.headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(url, options); // Segundo intento
            } else {
                throw new Error("AUTH_REFRESH_FAILED: No se pudo renovar el token.");
            }
        } else {
             throw new Error("AUTH_EXPIRED_USER_CANCELLED");
        }
    }

    return response;
}

// --- HELPER DE RESPUESTA ---
async function handleApiResponse(response, context) {
    if (response.ok) {
        if (response.status === 204) return null;
        return response.json();
    }
    const text = await response.text();
    throw new Error(`API Error (${response.status}) en ${context}: ${text}`);
}

// Helper interno para buscar o crear carpetas
async function getOrCreateFolder(folderName, parentId = null) {
    const mimeFolder = 'application/vnd.google-apps.folder';
    
    // 1. Buscar
    let q = `mimeType='${mimeFolder}' and name='${folderName}' and trashed=false`;
    if (parentId) {
        q += ` and '${parentId}' in parents`;
    }

    const searchRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`);
    const data = await handleApiResponse(searchRes, `Buscar carpeta ${folderName}`);

    if (data.files && data.files.length > 0) {
        return data.files[0].id;
    }

    // 2. Crear si no existe
    console.log(`Creando carpeta ${folderName}...`);
    const metadata = { 
        name: folderName, 
        mimeType: mimeFolder 
    };
    if (parentId) {
        metadata.parents = [parentId];
    }

    const createRes = await driveFetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
    });
    const folderData = await handleApiResponse(createRes, `Crear carpeta ${folderName}`);
    return folderData.id;
}

// --- FUNCIONES PÚBLICAS ---

export async function initDriveSystem() {
    const token = getDriveToken();
    if (!token) return null;
    
    try {
        if (!folderIds.root) {
            folderIds.root = await getOrCreateFolder(PARENT_SYSTEM_FOLDER);
        }
        const promises = Object.keys(FOLDER_CONFIG).map(async (key) => {
            if (folderIds[key]) return folderIds[key];
            const config = FOLDER_CONFIG[key];
            folderIds[key] = await getOrCreateFolder(config.name, folderIds.root);
            return folderIds[key];
        });
        await Promise.all(promises);
        return folderIds;
    } catch (e) {
        console.error("Error Drive Init:", e);
        return null;
    }
}

export async function listFilesByType(type) {
    if (!folderIds[type]) await initDriveSystem();
    const targetFolderId = folderIds[type];
    if (!targetFolderId) return [];

    try {
        const q = `'${targetFolderId}' in parents and trashed=false`;
        const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name, modifiedTime, mimeType)`);
        
        const data = await handleApiResponse(res, `Listar ${type}`);
        const files = data.files || [];
        return files.filter(f => f.name.toLowerCase().endsWith('.json'));
        
    } catch (e) {
        console.error(`Error listando ${type}:`, e);
        return [];
    }
}

export async function loadFileContent(fileId) {
    try {
        const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
        return await handleApiResponse(res, "Descargar Archivo");
    } catch (e) {
        console.error("Error descarga:", e);
        return null;
    }
}

export async function saveFileToDrive(type, fileName, jsonData, existingFileId = null) {
    if (!folderIds[type]) await initDriveSystem();
    const folderId = folderIds[type];

    const fileContent = JSON.stringify(jsonData, null, 2);
    const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    // 1. ESCANEO PREVIO
    let filesToDelete = [];
    try {
        const q = `'${folderId}' in parents and name = '${safeName}' and trashed = false`;
        const searchRes = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`);
        const searchData = await searchRes.json();
        if (searchData.files) {
            filesToDelete = searchData.files;
        }
    } catch (e) {
        console.warn("Advertencia: No se pudo verificar duplicados.", e);
    }

    // 2. SUBIDA MULTIPART
    const metadata = {
        name: safeName,
        mimeType: 'application/json',
        parents: [folderId]
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const body =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelim;

    try {
        const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        const res = await driveFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        });

        const newFile = await handleApiResponse(res, `Guardar ${type}`);
        console.log(`💾 Guardado exitoso:`, newFile.name);

        if (filesToDelete.length > 0) {
            await Promise.allSettled(filesToDelete.map(f => deleteFile(f.id)));
        }

        return newFile.id;

    } catch (e) {
        console.error(`Error crítico guardando en ${type}:`, e);
        throw e;
    }
}

export async function deleteFile(fileId) {
    if (!fileId) return;
    try {
        console.log(`🔥 Eliminando archivo remoto: ${fileId}`);
        await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE'
        });
    } catch (e) {
        console.error(`Error eliminando archivo ${fileId}:`, e);
    }
}