// --- HTML-PROCESSOR.JS (ADVANCED DEPENDENCY RESOLVER) ---

let assetCache = new Map();

async function processHTMLAndAssets(entry, rootDirHandle) {
    assetCache.clear(); // Limpieza forzada de RAM
    
    try {
        const file = await entry.getFile();
        let htmlContent = await file.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');

        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        for (const link of links) {
            const href = link.getAttribute('href');
            if (isRelativePath(href)) {
                const blobUrl = await resolveAsset(rootDirHandle, href, 'text/css');
                if (blobUrl) link.setAttribute('href', blobUrl);
            }
        }

        const scripts = Array.from(doc.querySelectorAll('script[src]'));
        for (const script of scripts) {
            const src = script.getAttribute('src');
            const isModule = script.getAttribute('type') === 'module';
            
            if (isRelativePath(src)) {
                const type = isModule ? 'js-module' : 'application/javascript';
                const blobUrl = await resolveAsset(rootDirHandle, src, type);
                if (blobUrl) script.setAttribute('src', blobUrl);
            }
        }

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
        return `<div style="color:red; padding:20px;"><h3>Silenos Error</h3><p>${err.message}</p></div>`;
    }
}

async function resolveAsset(rootDirHandle, pathStr, type) {
    if (!pathStr) return null;

    try {
        const handle = await findHandleByPath(rootDirHandle, pathStr);
        if (!handle) return null;

        if (assetCache.has(handle.name)) return assetCache.get(handle.name);

        const file = await handle.getFile();

        if (type === 'js-module' || pathStr.endsWith('.js') || pathStr.endsWith('.mjs')) {
            let jsContent = await file.text();
            
            const importRegex = /from\s+['"]([^'"]+)['"]/g;
            let matches = [];
            let match;
            while ((match = importRegex.exec(jsContent)) !== null) {
                matches.push({ full: match[0], path: match[1], index: match.index });
            }

            for (let i = matches.length - 1; i >= 0; i--) {
                const m = matches[i];
                if (isRelativePath(m.path)) {
                    const parentPath = getParentPath(pathStr); 
                    const absolutePath = combinePaths(parentPath, m.path); 
                    const depBlob = await resolveAsset(rootDirHandle, absolutePath, 'js-module');
                    
                    if (depBlob) {
                        const newImport = `from "${depBlob}"`;
                        jsContent = jsContent.substring(0, m.index) + 
                                   jsContent.substring(m.index).replace(m.full, newImport);
                    }
                }
            }

            const blob = new Blob([jsContent], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            assetCache.set(handle.name, blobUrl);
            return blobUrl;

        } else {
            const blobUrl = URL.createObjectURL(file);
            assetCache.set(handle.name, blobUrl);
            return blobUrl;
        }

    } catch (e) {
        console.warn(`ASSET ERROR [${pathStr}]:`, e);
        return null;
    }
}

function isRelativePath(path) {
    if (!path) return false;
    return !path.startsWith('http') && 
           !path.startsWith('//') && 
           !path.startsWith('data:') && 
           !path.startsWith('blob:') &&
           !path.startsWith('#');
}

async function findHandleByPath(rootHandle, pathStr) {
    const cleanPath = pathStr.replace(/^\.\//, ''); 
    const rawParts = cleanPath.split('/');
    
    // Motor de resolución de rutas (ahora permite subir niveles con '..')
    const parts = [];
    for (const p of rawParts) {
        if (p === '.' || p === '') continue;
        if (p === '..') {
            parts.pop(); 
        } else {
            parts.push(p);
        }
    }

    if (parts.length === 0) return null;
    const fileName = parts.pop();
    let currentDir = rootHandle;

    try {
        for (const part of parts) {
            currentDir = await currentDir.getDirectoryHandle(part);
        }
        return await currentDir.getFileHandle(fileName);
    } catch (e) {
        return null;
    }
}

function getParentPath(filePath) {
    const parts = filePath.split('/');
    parts.pop(); 
    return parts.length > 0 ? parts.join('/') + '/' : '';
}

function combinePaths(base, relative) {
    if (!relative.startsWith('.')) return base + relative;
    if (relative.startsWith('./')) return base + relative.substring(2);
    
    const baseParts = base.split('/').filter(p => p !== '');
    const relParts = relative.split('/');
    
    for (const p of relParts) {
        if (p === '..') {
            baseParts.pop();
        } else if (p !== '.' && p !== '') {
            baseParts.push(p);
        }
    }
    return baseParts.length > 0 ? baseParts.join('/') + '/' : '';
}