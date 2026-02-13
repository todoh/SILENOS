// --- HTML-PROCESSOR.JS (ADVANCED DEPENDENCY RESOLVER) ---

/**
 * Motor de procesamiento de activos.
 * Convierte un ecosistema de archivos (HTML, JS, CSS, IMG) en un entorno 
 * aislado basado en Blob URLs, resolviendo importaciones ES6 y rutas relativas.
 */

// Cache temporal para evitar re-procesar el mismo archivo (y bucles infinitos)
// Map<FileHandle, BlobURL>
let assetCache = new Map();

async function processHTMLAndAssets(entry, rootDirHandle) {
    assetCache.clear(); // Limpiar cache al iniciar una nueva apertura
    
    try {
        const file = await entry.getFile();
        let htmlContent = await file.text();
        
        // Determinar el directorio base del archivo HTML (normalmente es rootDirHandle si está en la raíz)
        // Nota: Para esta versión asumimos que el HTML está en la raíz o gestionamos rutas desde root.
        // Si el HTML está en subcarpeta, las rutas relativas deben resolverse desde ahí.
        
        console.log(`HTML-PROC: Processing ${entry.name}`);

        // Parseamos el HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // 1. CSS (<link href="...">)
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        for (const link of links) {
            const href = link.getAttribute('href');
            if (isRelativePath(href)) {
                // CSS se procesa como texto plano (podríamos procesar @import en el futuro)
                const blobUrl = await resolveAsset(rootDirHandle, href, 'text/css');
                if (blobUrl) link.setAttribute('href', blobUrl);
            }
        }

        // 2. Scripts (<script src="...">)
        // AQUÍ ESTÁ LA MAGIA: Detectamos módulos y procesamos su contenido
        const scripts = Array.from(doc.querySelectorAll('script[src]'));
        for (const script of scripts) {
            const src = script.getAttribute('src');
            const isModule = script.getAttribute('type') === 'module';
            
            if (isRelativePath(src)) {
                // Si es módulo, pasamos flag 'js-module' para que el resolver analice imports
                const type = isModule ? 'js-module' : 'application/javascript';
                const blobUrl = await resolveAsset(rootDirHandle, src, type);
                if (blobUrl) script.setAttribute('src', blobUrl);
            }
        }

        // 3. Imágenes y Media
        const mediaSelector = 'img[src], video[src], audio[src], source[src]';
        const mediaElements = Array.from(doc.querySelectorAll(mediaSelector));
        for (const el of mediaElements) {
            const src = el.getAttribute('src');
            if (isRelativePath(src)) {
                const blobUrl = await resolveAsset(rootDirHandle, src, 'media'); 
                if (blobUrl) el.setAttribute('src', blobUrl);
            }
        }

        return doc.documentElement.outerHTML;

    } catch (err) {
        console.error("HTML PROCESSOR CRITICAL ERROR:", err);
        return `<div style="color:red; padding:20px;">
                    <h3>Silenos Error</h3>
                    <p>Failed to process HTML: ${err.message}</p>
                </div>`;
    }
}

// --- RESOLVER CENTRAL ---

async function resolveAsset(rootDirHandle, pathStr, type) {
    if (!pathStr) return null;

    try {
        // 1. Encontrar el Handle del archivo navegando por carpetas
        const handle = await findHandleByPath(rootDirHandle, pathStr);
        if (!handle) return null;

        // 2. Verificar caché (si ya procesamos este archivo, devolvemos su BlobUrl)
        // Usamos el nombre del handle como clave simple (idealmente sería unique ID)
        if (assetCache.has(handle)) {
            return assetCache.get(handle);
        }

        // 3. Obtener contenido
        const file = await handle.getFile();

        // 4. PROCESAMIENTO RECURSIVO PARA JS MODULES
        if (type === 'js-module' || pathStr.endsWith('.js') || pathStr.endsWith('.mjs')) {
            let jsContent = await file.text();
            
            // Buscar sentencias 'import'
            // Regex captura: import ... from "CAPTURE";
            // Soporta comillas simples y dobles.
            const importRegex = /from\s+['"]([^'"]+)['"]/g;
            
            // Necesitamos reemplazar asíncronamente. 
            // Como replace no soporta async, usamos un truco:
            // Buscamos todas las coincidencias primero.
            let matches = [];
            let match;
            while ((match = importRegex.exec(jsContent)) !== null) {
                matches.push({ full: match[0], path: match[1], index: match.index });
            }

            // Procesar cada import
            // Invertimos el orden para reemplazar sin alterar índices de los anteriores
            for (let i = matches.length - 1; i >= 0; i--) {
                const m = matches[i];
                if (isRelativePath(m.path)) {
                    // Calculamos la ruta relativa desde la RAÍZ
                    // Si 'main.js' (en js/) importa './utils.js', la ruta real es 'js/utils.js'
                    const parentPath = getParentPath(pathStr); // "js/"
                    const absolutePath = combinePaths(parentPath, m.path); // "js/utils.js"
                    
                    // RECURSIVIDAD: Resolvemos la dependencia
                    const depBlob = await resolveAsset(rootDirHandle, absolutePath, 'js-module');
                    
                    if (depBlob) {
                        // Reemplazar en el texto del código
                        // Ej: from "./utils.js" -> from "blob:..."
                        const newImport = `from "${depBlob}"`;
                        jsContent = jsContent.substring(0, m.index) + 
                                   jsContent.substring(m.index).replace(m.full, newImport);
                    }
                }
            }

            // Crear Blob del JS procesado
            const blob = new Blob([jsContent], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            assetCache.set(handle, blobUrl);
            return blobUrl;

        } else {
            // Archivos normales (CSS, IMG, JS plano)
            // Usamos el blob directo del archivo
            const blobUrl = URL.createObjectURL(file);
            assetCache.set(handle, blobUrl);
            return blobUrl;
        }

    } catch (e) {
        console.warn(`ASSET ERROR [${pathStr}]:`, e);
        return null;
    }
}

// --- UTILS ---

function isRelativePath(path) {
    if (!path) return false;
    return !path.startsWith('http') && 
           !path.startsWith('//') && 
           !path.startsWith('data:') && 
           !path.startsWith('blob:') &&
           !path.startsWith('#');
}

// Navega (cd folder -> cd subfolder -> get file)
async function findHandleByPath(rootHandle, pathStr) {
    // Normalizar "./js/main.js" -> "js/main.js"
    const cleanPath = pathStr.replace(/^\.\//, ''); 
    const parts = cleanPath.split('/');
    const fileName = parts.pop();
    
    let currentDir = rootHandle;

    try {
        // Navegar carpetas
        for (const part of parts) {
            if (part === '.' || part === '') continue;
            if (part === '..') return null; // No soportamos subir niveles por seguridad simple
            currentDir = await currentDir.getDirectoryHandle(part);
        }
        // Obtener archivo final
        return await currentDir.getFileHandle(fileName);
    } catch (e) {
        return null;
    }
}

// Obtiene la carpeta padre de una ruta de archivo "js/libs/test.js" -> "js/libs/"
function getParentPath(filePath) {
    const parts = filePath.split('/');
    parts.pop(); // Quitar archivo
    return parts.length > 0 ? parts.join('/') + '/' : '';
}

// Combina ruta base + relativa simple
function combinePaths(base, relative) {
    // Caso simple: relative es "file.js"
    if (!relative.startsWith('.')) return base + relative;
    
    // Caso: relative es "./file.js"
    if (relative.startsWith('./')) return base + relative.substring(2);
    
    // Nota: No maneja "../" complejo en esta versión v1
    return base + relative;
}