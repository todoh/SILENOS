
// --- CLIENTE API GOOGLE DRIVE v3.4 (Search & Destroy Fix) ---
// Estructura: SILEN_SYSTEM/ [Silenos_Data, Silenos_Scripts, ...]
// FIX: Estrategia de guardado robusta que busca por nombre para eliminar duplicados reales,
// evitando errores 404 por IDs locales obsoletos.

import { getDriveToken, silenosLogout } from './auth_ui.js';

console.log("Módulo Drive API Cargado (v3.4 - Clean Save)");

// Configuración de Carpetas
const PARENT_SYSTEM_FOLDER = 'SILEN_SYSTEM';
const FOLDER_CONFIG = {
    data:   { name: 'Silenos_Data',   mime: 'application/vnd.google-apps.folder' },
    script: { name: 'Silenos_Scripts', mime: 'application/vnd.google-apps.folder' },
    book:   { name: 'Silenos_Books',   mime: 'application/vnd.google-apps.folder' },
    game:   { name: 'Silenos_Games',   mime: 'application/vnd.google-apps.folder' }
};

const JSON_MIME = 'application/json';

// Cache de IDs de carpetas para no buscar constantemente
let folderIds = {
    root: null,
    data: null,
    script: null,
    book: null,
    game: null
};

// --- HELPER DE SEGURIDAD ---
async function handleApiResponse(response, context) {
    if (response.ok) return response.json();
    if (response.status === 401) {
        console.warn(`Drive API 401 en ${context}: Token caducado.`);
        silenosLogout(); // Auto-logout
        throw new Error("AUTH_EXPIRED");
    }
    const text = await response.text();
    throw new Error(`API Error (${response.status}) en ${context}: ${text}`);
}

// Helper interno para buscar o crear carpetas
async function getOrCreateFolder(folderName, parentId = null) {
    const token = getDriveToken();
    const mimeFolder = 'application/vnd.google-apps.folder';
    
    // 1. Buscar
    let q = `mimeType='${mimeFolder}' and name='${folderName}' and trashed=false`;
    if (parentId) {
        q += ` and '${parentId}' in parents`;
    }

    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
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

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
    });
    const folderData = await handleApiResponse(createRes, `Crear carpeta ${folderName}`);
    return folderData.id;
}

// --- FUNCIONES PÚBLICAS ---

// 1. Inicialización del Sistema de Carpetas
export async function initDriveSystem() {
    const token = getDriveToken();
    if (!token) return null;
    
    try {
        // 1. Asegurar carpeta PADRE (SILEN_SYSTEM)
        if (!folderIds.root) {
            folderIds.root = await getOrCreateFolder(PARENT_SYSTEM_FOLDER);
        }

        // 2. Asegurar subcarpetas DENTRO de la padre
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

// 2. Listar Archivos
export async function listFilesByType(type) {
    const token = getDriveToken();
    if (!token) return [];
    
    if (!folderIds[type]) await initDriveSystem();
    const targetFolderId = folderIds[type];
    
    if (!targetFolderId) return [];

    try {
        const q = `'${targetFolderId}' in parents and mimeType='${JSON_MIME}' and trashed=false`;
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name, modifiedTime)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await handleApiResponse(res, `Listar ${type}`);
        return data.files || [];
    } catch (e) {
        console.error(`Error listando ${type}:`, e);
        return [];
    }
}

// 3. Descargar Archivo
export async function loadFileContent(fileId) {
    const token = getDriveToken();
    if (!token) return null;

    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return await handleApiResponse(res, "Descargar Archivo");
    } catch (e) {
        console.error("Error descarga:", e);
        return null;
    }
}

// 4. Guardar Archivo (Estrategia Robusta: Buscar y Destruir)
// Ignora existingFileId si falla, priorizando la búsqueda por nombre para limpiar duplicados.
export async function saveFileToDrive(type, fileName, jsonData, existingFileId = null) {
    const token = getDriveToken();
    if (!token) return null;

    // Asegurar carpeta destino
    if (!folderIds[type]) await initDriveSystem();
    const folderId = folderIds[type];

    const fileContent = JSON.stringify(jsonData, null, 2);
    const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;

    // 1. ESCANEO PREVIO: Buscar archivos existentes con el MISMO nombre en la carpeta
    // Esto detecta duplicados reales y archivos con IDs desincronizados.
    let filesToDelete = [];
    try {
        const q = `'${folderId}' in parents and name = '${safeName}' and trashed = false`;
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const searchData = await searchRes.json();
        if (searchData.files) {
            filesToDelete = searchData.files;
        }
    } catch (e) {
        console.warn("Advertencia: No se pudo verificar duplicados antes de guardar.", e);
    }

    // 2. SUBIDA: Crear el archivo nuevo (POST)
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
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        });

        const newFile = await handleApiResponse(res, `Guardar ${type}`);
        console.log(`💾 Guardado exitoso:`, newFile.name);

        // 3. LIMPIEZA: Borrar TODOS los archivos antiguos encontrados (Search & Destroy)
        // Esto elimina el archivo "oficial" anterior Y cualquier duplicado huérfano.
        if (filesToDelete.length > 0) {
            console.log(`🧹 Limpiando ${filesToDelete.length} versiones antiguas...`);
            
            // Usamos Promise.allSettled para que un fallo individual no pare el resto
            await Promise.allSettled(filesToDelete.map(f => 
                fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` }
                })
            ));
        }

        return newFile.id;

    } catch (e) {
        console.error(`Error crítico guardando en ${type}:`, e);
        throw e;
    }
}
