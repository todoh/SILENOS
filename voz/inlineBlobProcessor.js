/**
 * inlineBlobProcessor.js
 * Sistema de Procesamiento Local, Inyección Inline y Blob Mapping en Memoria.
 * Permite ejecutar proyectos web multicapa (.html, .css, .js, módulos ES6, .svg, imágenes, audio)
 * directamente en el navegador sin necesidad de servidor HTTP local ni CORS.
 * 
 * Compatible con File System Access API (FileSystemDirectoryHandle).
 */

class InlineBlobProcessor {
    constructor(rootHandle) {
        this.rootHandle = rootHandle;
        this.fileCache = new Map();  // Ruta relativa normalizada -> File Object
        this.blobCache = new Map();  // Ruta relativa -> Blob URL
        this.mimeMap = {
            'html': 'text/html;charset=utf-8',
            'htm': 'text/html;charset=utf-8',
            'css': 'text/css;charset=utf-8',
            'js': 'text/javascript;charset=utf-8',
            'mjs': 'text/javascript;charset=utf-8',
            'json': 'application/json;charset=utf-8',
            'svg': 'image/svg+xml;charset=utf-8',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'ico': 'image/x-icon',
            'wav': 'audio/wav',
            'mp3': 'audio/mpeg',
            'ogg': 'audio/ogg',
            'mp4': 'video/mp4',
            'webm': 'video/webm',
            'woff': 'font/woff',
            'woff2': 'font/woff2',
            'ttf': 'font/ttf',
            'otf': 'font/otf'
        };
    }

    /**
     * Escanea recursivamente el directorio raíz y construye la caché de archivos en memoria.
     */
    async scanDirectory(dirHandle = this.rootHandle, currentPath = '') {
        const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '.next', 'vendor', 'analisis_masivo', 'Memoria'];
        
        for await (const entry of dirHandle.values()) {
            const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            const normPath = this.normalizePath(relPath);

            if (entry.kind === 'directory') {
                if (ignoredDirs.includes(entry.name)) continue;
                await this.scanDirectory(entry, relPath);
            } else if (entry.kind === 'file') {
                try {
                    const file = await entry.getFile();
                    this.fileCache.set(normPath, file);
                } catch (e) {
                    console.warn(`[InlineBlobProcessor] No se pudo leer el archivo ${normPath}:`, e);
                }
            }
        }
    }

    /**
     * Normaliza rutas relativas a un formato estándar sin slashes iniciales.
     */
    normalizePath(path) {
        if (!path) return '';
        let clean = path.replace(/\\/g, '/').trim();
        if (clean.startsWith('./')) clean = clean.substring(2);
        if (clean.startsWith('/')) clean = clean.substring(1);
        return clean.toLowerCase();
    }

    /**
     * Resuelve rutas relativas considerando el directorio base del archivo actual.
     */
    resolveRelativePath(targetPath, baseDir = '') {
        let cleanTarget = targetPath.trim().replace(/\\/g, '/');
        if (cleanTarget.startsWith('http://') || cleanTarget.startsWith('https://') || cleanTarget.startsWith('data:') || cleanTarget.startsWith('blob:')) {
            return cleanTarget;
        }

        if (cleanTarget.startsWith('/')) {
            return this.normalizePath(cleanTarget);
        }

        const baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
        const targetParts = cleanTarget.split('/').filter(Boolean);
        const stack = [...baseParts];

        for (const part of targetParts) {
            if (part === '.') continue;
            if (part === '..') {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }
        return this.normalizePath(stack.join('/'));
    }

    /**
     * Obtiene el tipo MIME adecuado según la extensión del archivo.
     */
    getMimeType(path) {
        const ext = path.split('.').pop().toLowerCase();
        return this.mimeMap[ext] || 'application/octet-stream';
    }

    /**
     * Convierte un objeto File a Data URI Base64.
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Procesa código CSS inyectando dependencias url(...) como Data URIs o Blob URLs.
     */
    async processCSS(cssText, currentDir = '') {
        const urlRegex = /url\((?:['"]?)(.*?)(?:['"]?)\)/gi;
        let match;
        let result = cssText;

        while ((match = urlRegex.exec(cssText)) !== null) {
            const rawUrl = match[1];
            if (rawUrl.startsWith('data:') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('blob:')) {
                continue;
            }

            const resolvedPath = this.resolveRelativePath(rawUrl, currentDir);
            const file = this.fileCache.get(resolvedPath);
            if (file) {
                const base64 = await this.fileToBase64(file);
                result = result.replace(match[0], `url("${base64}")`);
            }
        }
        return result;
    }

    /**
     * Procesa scripts JavaScript transformando imports relativos en Blob URLs.
     */
    async processJS(jsText, currentDir = '') {
        const importRegex = /(import\s+(?:[\s\S]*?\s+from\s+)?['"])(.*?)(['"])/gi;
        let result = jsText;
        let match;

        while ((match = importRegex.exec(jsText)) !== null) {
            const prefix = match[1];
            const importPath = match[2];
            const suffix = match[3];

            if (importPath.startsWith('http://') || importPath.startsWith('https://') || importPath.startsWith('data:') || importPath.startsWith('blob:')) {
                continue;
            }

            const resolvedPath = this.resolveRelativePath(importPath, currentDir);
            const file = this.fileCache.get(resolvedPath);
            if (file) {
                const blobUrl = await this.getOrCreateBlobUrl(resolvedPath, 'js');
                result = result.replace(match[0], `${prefix}${blobUrl}${suffix}`);
            }
        }
        return result;
    }

    /**
     * Genera o recupera una Blob URL para un recurso procesado.
     */
    async getOrCreateBlobUrl(normPath, type = 'auto') {
        if (this.blobCache.has(normPath)) {
            return this.blobCache.get(normPath);
        }

        const file = this.fileCache.get(normPath);
        if (!file) return normPath;

        const dir = normPath.includes('/') ? normPath.substring(0, normPath.lastIndexOf('/')) : '';
        let content;
        const mime = this.getMimeType(normPath);

        if (type === 'css' || normPath.endsWith('.css')) {
            const text = await file.text();
            content = await this.processCSS(text, dir);
        } else if (type === 'js' || normPath.endsWith('.js') || normPath.endsWith('.mjs')) {
            const text = await file.text();
            content = await this.processJS(text, dir);
        } else {
            content = await file.arrayBuffer();
        }

        const blob = new Blob([content], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        this.blobCache.set(normPath, blobUrl);
        return blobUrl;
    }

    /**
     * Inyecta un runtime ligero para interceptar peticiones fetch(), XHR y navegación local <a href="...">.
     */
    generateRuntimeShim(blobUrlMapping) {
        return `
            <script>
            (function() {
                const blobMap = ${JSON.stringify(blobUrlMapping)};
                
                function resolvePathKey(url) {
                    if (!url || typeof url !== 'string') return null;
                    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
                        return null;
                    }
                    let clean = url.replace(/^\\.\\//, '').replace(/^\\//, '').toLowerCase();
                    if (blobMap[clean]) return blobMap[clean];
                    
                    const filename = clean.split('/').pop();
                    if (blobMap[filename]) return blobMap[filename];
                    return null;
                }

                // Intercepción de fetch() local
                const originalFetch = window.fetch;
                window.fetch = function(resource, init) {
                    let urlStr = (typeof resource === 'string') ? resource : (resource && resource.url);
                    const mapped = resolvePathKey(urlStr);
                    if (mapped) {
                        return originalFetch(mapped, init);
                    }
                    return originalFetch(resource, init);
                };

                // Intercepción de XMLHttpRequest local
                const originalXHR = window.XMLHttpRequest.prototype.open;
                window.XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    const mapped = resolvePathKey(url);
                    return originalXHR.call(this, method, mapped || url, ...rest);
                };

                // Intercepción de navegación en enlaces locales <a href="...">
                document.addEventListener('click', function(e) {
                    const a = e.target.closest('a');
                    if (a && a.getAttribute('href')) {
                        const href = a.getAttribute('href');
                        const mapped = resolvePathKey(href);
                        if (mapped) {
                            e.preventDefault();
                            window.location.href = mapped;
                        }
                    }
                }, true);
            })();
            </script>
        `;
    }

    /**
     * Procesa y empaqueta un documento HTML autónomo ejecutable en memoria.
     * @param {string} entrypointPath Ruta del archivo HTML principal (ej: 'index.html').
     * @param {string} rawHTMLContent Opcional: contenido directo del HTML si se edita en vivo.
     */
    async bundleHTML(entrypointPath = 'index.html', rawHTMLContent = null) {
        await this.scanDirectory();

        const normEntry = this.normalizePath(entrypointPath);
        const entryDir = normEntry.includes('/') ? normEntry.substring(0, normEntry.lastIndexOf('/')) : '';

        let htmlText = rawHTMLContent;
        if (!htmlText) {
            const file = this.fileCache.get(normEntry);
            if (!file) throw new Error(`El archivo de entrada "${entrypointPath}" no fue encontrado en la carpeta.`);
            htmlText = await file.text();
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        // Mapa global de URLs de Blobs para inyección en el Runtime Shim
        const runtimeBlobMap = {};
        for (const [path] of this.fileCache.entries()) {
            const blobUrl = await this.getOrCreateBlobUrl(path, 'raw');
            runtimeBlobMap[path] = blobUrl;
            runtimeBlobMap[`./${path}`] = blobUrl;
            runtimeBlobMap[`/${path}`] = blobUrl;
            
            if (entryDir && path.startsWith(entryDir + '/')) {
                const relToEntry = path.substring(entryDir.length + 1);
                runtimeBlobMap[relToEntry] = blobUrl;
                runtimeBlobMap[`./${relToEntry}`] = blobUrl;
            }
            
            const filenameOnly = path.split('/').pop();
            if (!runtimeBlobMap[filenameOnly]) {
                runtimeBlobMap[filenameOnly] = blobUrl;
            }
        }

        // 1. Inyección Inline de Estilos CSS (<link rel="stylesheet" href="..."> -> <style>)
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        for (const link of links) {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('data:')) {
                const resolved = this.resolveRelativePath(href, entryDir);
                const cssFile = this.fileCache.get(resolved);
                if (cssFile) {
                    const cssText = await cssFile.text();
                    const cssDir = resolved.includes('/') ? resolved.substring(0, resolved.lastIndexOf('/')) : '';
                    const processedCSS = await this.processCSS(cssText, cssDir);

                    const styleEl = doc.createElement('style');
                    styleEl.textContent = `/* Inyectado automáticamente desde ${href} */\n` + processedCSS;
                    link.parentNode.replaceChild(styleEl, link);
                }
            }
        }

        // 2. Generación Dinámica de Import Maps para Módulos ES6
        const importMapObj = {};
        for (const [path] of this.fileCache.entries()) {
            if (path.endsWith('.js') || path.endsWith('.mjs')) {
                const blobUrl = await this.getOrCreateBlobUrl(path, 'js');
                importMapObj[`./${path}`] = blobUrl;
                importMapObj[`/${path}`] = blobUrl;
                importMapObj[path] = blobUrl;
                if (entryDir && path.startsWith(entryDir + '/')) {
                    const relToEntry = path.substring(entryDir.length + 1);
                    importMapObj[`./${relToEntry}`] = blobUrl;
                    importMapObj[relToEntry] = blobUrl;
                }
            }
        }

        if (Object.keys(importMapObj).length > 0) {
            const importMapScript = doc.createElement('script');
            importMapScript.type = 'importmap';
            importMapScript.textContent = JSON.stringify({ imports: importMapObj }, null, 2);
            doc.head.insertBefore(importMapScript, doc.head.firstChild);
        }

        // 3. Transformación de Scripts JS Tradicionales (<script src="...">)
        const scripts = Array.from(doc.querySelectorAll('script[src]'));
        for (const script of scripts) {
            const src = script.getAttribute('src');
            if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
                const resolved = this.resolveRelativePath(src, entryDir);
                const jsFile = this.fileCache.get(resolved);
                if (jsFile) {
                    const blobUrl = await this.getOrCreateBlobUrl(resolved, 'js');
                    script.setAttribute('src', blobUrl);
                }
            }
        }

        // 4. Transformación de Recursos Multimedia, Imágenes, Objetos e IFrames
        const mediaElements = Array.from(doc.querySelectorAll('img[src], video[src], audio[src], source[src], image[href], use[href], iframe[src], embed[src], object[data], link[rel*="icon"][href]'));
        for (const el of mediaElements) {
            const srcAttr = el.hasAttribute('src') ? 'src' : (el.hasAttribute('href') ? 'href' : 'data');
            const srcVal = el.getAttribute(srcAttr);

            if (srcVal && !srcVal.startsWith('http://') && !srcVal.startsWith('https://') && !srcVal.startsWith('data:') && !srcVal.startsWith('blob:')) {
                const resolved = this.resolveRelativePath(srcVal, entryDir);
                const file = this.fileCache.get(resolved);
                if (file) {
                    const blobUrl = await this.getOrCreateBlobUrl(resolved, 'raw');
                    el.setAttribute(srcAttr, blobUrl);
                }
            }
        }

        // 5. Inyección de Runtime Shim para fetch() y Links
        const shimHTML = this.generateRuntimeShim(runtimeBlobMap);
        doc.head.insertAdjacentHTML('beforeend', shimHTML);

        // 6. Generación de Blob URL final para la aplicación en memoria
        const finalHTML = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
        const mainBlob = new Blob([finalHTML], { type: 'text/html;charset=utf-8' });
        return URL.createObjectURL(mainBlob);
    }

    /**
     * Método estático de acceso rápido.
     */
    static async processWorkspace(rootHandle, entrypointPath = 'index.html', rawContent = null) {
        const processor = new InlineBlobProcessor(rootHandle);
        return await processor.bundleHTML(entrypointPath, rawContent);
    }
}