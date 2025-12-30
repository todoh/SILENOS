/**
 * Procesa el contenido HTML para inyectar CSS, JS e imágenes del sistema de archivos virtual.
 * @param {string} htmlContent - El código HTML original del archivo.
 * @param {string} currentPath - La ruta de la carpeta donde está el archivo HTML (para resolver rutas relativas).
 * @param {object} fs - La referencia a tu sistema de archivos (filesystem).
 * @returns {Promise<string>} - El HTML con todo el contenido incrustado.
 */
async function processHTML(htmlContent, currentPath, fs) {
    // Usamos DOMParser para manipular el HTML fácilmente
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Helper para resolver rutas (simple)
    const resolvePath = (base, relative) => {
        // Si es absoluta en tu sistema virtual
        if (relative.startsWith('/')) return relative;
        // Si es http/https, ignorar (es externo)
        if (relative.startsWith('http') || relative.startsWith('//')) return null;
        
        // Limpieza básica de ruta (puedes mejorar esto con una librería de path si tienes)
        let parts = base.split('/').filter(p => p.length > 0);
        const relParts = relative.split('/');
        
        for (let p of relParts) {
            if (p === '.') continue;
            if (p === '..') parts.pop();
            else parts.push(p);
        }
        return '/' + parts.join('/');
    };

    // 1. Inyectar CSS (<link rel="stylesheet">)
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
    for (const link of links) {
        const href = link.getAttribute('href');
        const fullPath = resolvePath(currentPath, href);
        
        if (fullPath) {
            try {
                // Asumiendo que fs.readFile devuelve el texto o una promesa con el texto
                // Ajusta 'utf8' según tu implementación de fs
                const cssContent = await fs.readFile(fullPath, 'utf8'); 
                
                const style = doc.createElement('style');
                style.textContent = cssContent;
                link.parentNode.replaceChild(style, link);
                console.log(`[HTML-Process] Injected CSS: ${fullPath}`);
            } catch (e) {
                console.warn(`[HTML-Process] Failed to inject CSS: ${fullPath}`, e);
            }
        }
    }

    // 2. Inyectar Scripts (<script src="...">)
    const scripts = Array.from(doc.querySelectorAll('script[src]'));
    for (const script of scripts) {
        const src = script.getAttribute('src');
        const fullPath = resolvePath(currentPath, src);

        if (fullPath) {
            try {
                const jsContent = await fs.readFile(fullPath, 'utf8');
                
                // Quitamos el atributo src y ponemos el contenido dentro
                script.removeAttribute('src');
                script.textContent = jsContent;
                console.log(`[HTML-Process] Injected JS: ${fullPath}`);
            } catch (e) {
                console.warn(`[HTML-Process] Failed to inject JS: ${fullPath}`, e);
            }
        }
    }

    // 3. Inyectar Imágenes (<img src="...">) - Opcional pero recomendado
    const images = Array.from(doc.querySelectorAll('img[src]'));
    for (const img of images) {
        const src = img.getAttribute('src');
        const fullPath = resolvePath(currentPath, src);

        if (fullPath) {
            try {
                // Aquí necesitas leer como base64 o blob
                // Asumiendo que tienes un método para leer base64 o convertirlo
                const imgContent = await fs.readFile(fullPath, 'base64'); // O 'blob'
                const mimeType = fullPath.endsWith('.png') ? 'image/png' : 'image/jpeg'; // Detección simple
                
                // Si tu fs devuelve raw bytes, necesitarás convertir a base64 aquí
                img.setAttribute('src', `data:${mimeType};base64,${imgContent}`);
                console.log(`[HTML-Process] Injected Image: ${fullPath}`);
            } catch (e) {
                console.warn(`[HTML-Process] Failed to inject Image: ${fullPath}`, e);
            }
        }
    }

    return doc.documentElement.outerHTML;
}