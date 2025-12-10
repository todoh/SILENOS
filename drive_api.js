// --- CLIENTE API GOOGLE DRIVE v1.1 (CORS FIX) ---
// Gestiona la conexión REST con Drive para guardar/cargar proyectos.
// Actualización: Solución al error CORS en PATCH usando Override Header.

import { getDriveToken } from './auth_ui.js';

console.log("Módulo Drive API Cargado (v1.1 - CORS Patch Fix)");

const FOLDER_NAME = 'Silenos_Projects';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const JSON_MIME = 'application/json';

// --- FUNCIONES PÚBLICAS ---

// 1. Inicialización: Busca o crea la carpeta raíz del proyecto
export async function initDriveFolder() {
    const token = getDriveToken();
    if (!token) return null;

    try {
        // Buscar carpeta existente
        const q = `mimeType='${FOLDER_MIME}' and name='${FOLDER_NAME}' and trashed=false`;
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await searchRes.json();

        if (data.files && data.files.length > 0) {
            console.log("Carpeta Silenos encontrada:", data.files[0].id);
            return data.files[0].id;
        } else {
            // Crear carpeta si no existe
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
            const folderData = await createRes.json();
            return folderData.id;
        }
    } catch (e) {
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
        const data = await res.json();
        return data.files || [];
    } catch (e) {
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
        const json = await res.json();
        return json;
    } catch (e) {
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

    // Si es nuevo, añadimos el padre. Si es actualización, no hace falta.
    if (!existingFileId) {
        metadata.parents = [folderId];
    }

    // Construimos el cuerpo multipart (Metadata + Content)
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
        // --- FIX CORS: USAR SIEMPRE POST CON OVERRIDE ---
        // El navegador bloquea PATCH en cross-origin para uploads.
        // Google permite enviar POST y especificar el método real en la cabecera.
        const method = 'POST'; 
        
        const url = existingFileId 
            ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
            : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        };

        // Si estamos actualizando, inyectamos la cabecera mágica
        if (existingFileId) {
            headers['X-HTTP-Method-Override'] = 'PATCH';
        }

        const res = await fetch(url, {
            method: method,
            headers: headers,
            body: body
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Google API Error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        console.log("Proyecto guardado en Drive:", data.id);
        return data.id;

    } catch (e) {
        console.error("Error Guardando en Drive:", e);
        throw e;
    }
}