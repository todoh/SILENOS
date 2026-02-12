// --- HTML-PROCESSOR.JS (DEPENDENCY RESOLVER) ---

/**
 * Procesa un archivo HTML, busca sus dependencias locales (CSS, JS, IMG)
 * y las reemplaza por Blob URLs para que funcionen dentro de un entorno aislado.
 */
async function processHTMLAndAssets(fileHandle, dirHandle) {
    try {
        const file = await fileHandle.getFile();
        let htmlContent = await file.text();
        
        // Parseamos el HTML en un DOM virtual
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        // 1. Procesar CSS (<link href="...">)
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        for (const link of links) {
            const href = link.getAttribute('href');
            if (isRelativePath(href)) {
                const blobUrl = await getAssetBlobUrl(dirHandle, href, 'text/css');
                if (blobUrl) link.setAttribute('href', blobUrl);
            }
        }

        // 2. Procesar Scripts (<script src="...">)
        const scripts = Array.from(doc.querySelectorAll('script[src]'));
        for (const script of scripts) {
            const src = script.getAttribute('src');
            if (isRelativePath(src)) {
                const blobUrl = await getAssetBlobUrl(dirHandle, src, 'application/javascript');
                if (blobUrl) script.setAttribute('src', blobUrl);
            }
        }

        // 3. Procesar Imágenes (<img src="...">)
        const images = Array.from(doc.querySelectorAll('img[src]'));
        for (const img of images) {
            const src = img.getAttribute('src');
            if (isRelativePath(src)) {
                const blobUrl = await getAssetBlobUrl(dirHandle, src, 'image'); 
                if (blobUrl) img.setAttribute('src', blobUrl);
            }
        }

        // Serializar de nuevo a string.
        // NOTA: Devolvemos el string directo para usar en srcdoc, 
        // lo que permite mejor integración que un Blob URL externo.
        const processedHtml = doc.documentElement.outerHTML;
        return processedHtml;

    } catch (err) {
        console.error("HTML PROCESSOR ERROR:", err);
        return null;
    }
}

// Helper: Determina si es una ruta local relativa
function isRelativePath(path) {
    if (!path) return false;
    return !path.startsWith('http') && !path.startsWith('//') && !path.startsWith('data:');
}

// Helper: Busca el archivo en el directorio y devuelve un Blob URL
async function getAssetBlobUrl(dirHandle, path, mimeTypePrefix) {
    try {
        // Manejo simple de rutas (no soporta ../ por seguridad del API básico aún)
        // Se asume que los assets están en el mismo nivel o subcarpetas directas
        // Para este nivel de complejidad, buscamos en el handle actual.
        
        const fileName = path.split('/').pop(); // Simplificación: busca el archivo por nombre en el dir actual
        const fileHandle = await dirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (e) {
        console.warn(`Asset not found or access denied: ${path}`, e);
        return null;
    }
}