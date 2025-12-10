// --- CLIENTE API GOOGLE DRIVE v2.1 (Auto-Logout) ---
// Gestiona la conexión REST con Drive para guardar/cargar proyectos.
// Actualización: Si el token caduca (401), cierra sesión automáticamente.

import { getDriveToken, silenosLogout } from './auth_ui.js';

console.log("Módulo Drive API Cargado (v2.1 - Auto Logout)");

const FOLDER_NAME = 'Silenos_Projects';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const JSON_MIME = 'application/json';

// --- HELPER DE SEGURIDAD ---
async function handleApiResponse(response, context) {
    if (response.ok) return response.json();
    
    // Si la respuesta es 401 (No autorizado), el token murió.
    if (response.status === 401) {
        console.warn(`Drive API 401 en ${context}: Token caducado.`);
        throw new Error("AUTH_EXPIRED");
    }

    const text = await response.text();
    throw new Error(`API Error (${response.status}) en ${context}: ${text}`);
}

// --- FUNCIONES PÚBLICAS ---

// 1. Inicialización: Busca o crea la carpeta raíz del proyecto
export async function initDriveFolder() {
    const token = getDriveToken();
    if (!token) return null;

    try {
        // PASO 1: Búsqueda
        const q = `mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME}' and trashed=false`;
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        // Verificamos respuesta
        const data = await handleApiResponse(searchRes, "Buscar Carpeta");

        if (data.files && data.files.length > 0) {
            console.log("Carpeta Silenos encontrada:", data.files[0].id);
            return data.files[0].id;
        } else {
            // PASO 2: Creación (Solo si búsqueda OK y 0 resultados)
            console.log("Creando carpeta Silenos...");
            const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: FOLDER_NAME,
                    mimeType: FOLDER_MIME
                })
            });
            const folderData = await handleApiResponse(createRes, "Crear Carpeta");
            return folderData.id;
        }
    } catch (e) {
        if (e.message === "AUTH_EXPIRED") {
            alert("⚠️ Tu sesión ha caducado. Desconectando por seguridad...");
            silenosLogout(); // <--- CIERRE DE SESIÓN AUTOMÁTICO
            return null;
        }
        console.error("Error Drive Init:", e);
        return null;
    }
}

// 2. Listar Proyectos (Archivos JSON en la carpeta)
export async function listDriveProjects(folderId) {
    const token = getDriveToken();
    if (!token || !folderId) return [];

    try {
        const q = `'${folderId}' in parents and mimeType='${JSON_MIME}' and trashed=false`;
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id, name, modifiedTime)`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const data = await handleApiResponse(res, "Listar Proyectos");
        return data.files || [];
    } catch (e) {
        if (e.message === "AUTH_EXPIRED") {
            alert("⚠️ Sesión caducada.");
            silenosLogout(); // <--- CIERRE DE SESIÓN AUTOMÁTICO
            return [];
        }
        console.error("Error Listando Proyectos:", e);
        return [];
    }
}

// 3. Descargar Proyecto (Leer contenido JSON)
export async function loadProjectFile(fileId) {
    const token = getDriveToken();
    if (!token) return null;

    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        return await handleApiResponse(res, "Descargar Archivo");
    } catch (e) {
        if (e.message === "AUTH_EXPIRED") {
            alert("⚠️ Sesión caducada.");
            silenosLogout(); // <--- CIERRE DE SESIÓN AUTOMÁTICO
            return null;
        }
        console.error("Error Descargando Proyecto:", e);
        return null;
    }
}

// 4. Guardar Proyecto (Crear nuevo o Actualizar existente)
export async function saveProjectToDrive(folderId, fileName, jsonData, existingFileId = null) {
    const token = getDriveToken();
    if (!token || !folderId) return null;

    const fileContent = JSON.stringify(jsonData, null, 2);
    
    // Metadatos
    const metadata = {
        name: fileName.endsWith('.json') ? fileName : `${fileName}.json`,
        mimeType: JSON_MIME
    };

    if (!existingFileId) {
        metadata.parents = [folderId];
    }

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
        const method = 'POST'; 
        
        const url = existingFileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        };

        if (existingFileId) {
            headers['X-HTTP-Method-Override'] = 'PATCH';
        }

        const res = await fetch(url, {
            method: method,
            headers: headers,
            body: body
        });

        const data = await handleApiResponse(res, "Guardar Proyecto");
        console.log("Proyecto guardado en Drive:", data.id);
        return data.id;

    } catch (e) {
        if (e.message === "AUTH_EXPIRED") {
            alert("⚠️ Sesión caducada. No se pudo guardar.");
            silenosLogout(); // <--- CIERRE DE SESIÓN AUTOMÁTICO
            throw e;
        }
        console.error("Error Guardando en Drive:", e);
        throw e;
    }
}