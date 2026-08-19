// uiArchivos.js - Navegador de Archivos Ultra-Minimalista Cristal con Previsualizador Modal Limpio
let currentPath = '';
let blobCache = new Map();
let targetFileForMenu = '';

// Helper para convertir tamaño de bytes
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Renderizado del Árbol de Carpetas (Sidebar Izquierdo Cristal)
async function renderizarArbolDirectorio(dirHandle, contenedor, rutaRelativa = '') {
    const carpetasIgnoradas = ['Memoria', 'analisis_masivo', '.git', 'node_modules', 'dist', 'build'];
    const carpetas = [];               
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory' && !carpetasIgnoradas.includes(entry.name)) {
            carpetas.push(entry);
        }
    }
    carpetas.sort((a, b) => a.name.localeCompare(b.name));
    for (const folder of carpetas) {
        const rutaFolder = rutaRelativa ? `${rutaRelativa}/${folder.name}` : folder.name;
        const itemDiv = document.createElement('div');
        itemDiv.className = `folder-tree-item ${currentPath === rutaFolder ? 'active' : ''}`;                           
        itemDiv.innerHTML = `
            <div onclick="navegarACarpeta('${rutaFolder}')">
                <span class="icon">📁</span>
                <span class="name">${folder.name}</span>
            </div>
        `;                           
        contenedor.appendChild(itemDiv);
        const subContenedor = document.createElement('div');
        subContenedor.style.paddingLeft = '12px';
        contenedor.appendChild(subContenedor);                           
        if (currentPath.startsWith(rutaFolder)) {
            await renderizarArbolDirectorio(folder, subContenedor, rutaFolder);
        }
    }
}

// Navegación Activa
async function navegarACarpeta(path) {
    currentPath = path;
    await actualizarUIArchivos();
}

// Renderizado de Vista Rejilla (Grid de Tarjetas) con Menú Contextual Integrado
async function renderizarGridContenido(dirHandle) {
    const gridContainer = document.getElementById('gridContainer');
    if (!gridContainer) return;               
    const savedScrollTop = gridContainer.scrollTop;
    gridContainer.innerHTML = '';
    const entries = [];
    const carpetasIgnoradas = ['Memoria', 'analisis_masivo', '.git', 'node_modules'];               
    for await (const entry of dirHandle.values()) {
        if (!carpetasIgnoradas.includes(entry.name)) {
            entries.push(entry);
        }
    }
    entries.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
    });
    if (entries.length === 0) {
        gridContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px;">La carpeta está vacía</div>`;
        return;
    }
    for (const entry of entries) {
        const card = document.createElement('div');
        card.className = 'file-card';                           
        if (entry.kind === 'directory') {
            card.onclick = () => navegarACarpeta(currentPath ? `${currentPath}/${entry.name}` : entry.name);
            card.innerHTML = `
                <div class="file-card-preview">
                    <span style="font-size: 40px;">📁</span>
                </div>
                <div class="file-card-info">
                    <span class="file-card-title" title="${entry.name}">${entry.name}</span>
                    <span class="file-card-size">Carpeta</span>
                </div>
            `;
        } else {
            const file = await entry.getFile();
            const ext = entry.name.split('.').pop().toLowerCase();
            const isMedia = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
            let visualContent = `<span style="font-size: 36px;">📄</span>`;
            if (isMedia) {
                const blobUrl = URL.createObjectURL(file);
                visualContent = `<img src="${blobUrl}" alt="${entry.name}">`;
            }
            const fullFilePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            card.onclick = () => abrirArchivoManual(fullFilePath);
            card.oncontextmenu = (e) => mostrarContextMenu(e, fullFilePath);

            card.innerHTML = `
                <div class="file-card-preview">
                    ${visualContent}
                </div>
                <div class="file-card-info">
                    <span class="file-card-title" title="${entry.name}">${entry.name}</span>
                    <span class="file-card-size">${formatBytes(file.size)}</span>
                </div>
            `;
        }
        gridContainer.appendChild(card);
    }
    gridContainer.scrollTop = savedScrollTop;
}

// Menú Contextual (Clic Derecho)
function mostrarContextMenu(event, filePath) {
    event.preventDefault();
    event.stopPropagation();
    targetFileForMenu = filePath;
    const menu = document.getElementById('customContextMenu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
}

// Cerrar Menú Contextual
document.addEventListener('click', () => {
    const menu = document.getElementById('customContextMenu');
    if (menu) menu.style.display = 'none';
});

// Ejecutar Previsualización desde el Menú Contextual
async function ejecutarPrevisualizarDesdeMenu() {
    if (targetFileForMenu) {
        await previsualizarModalDirecto(targetFileForMenu);
    }
}

// Lógica para Abrir Modal Limpio (Sin Divs/Marcos/Bordes alrededor)
async function previsualizarModalDirecto(nombre) {
    try {
        const fileHandle = await obtenerFileHandlePorRuta(nombre, false);
        const file = await fileHandle.getFile();
        const ext = nombre.split('.').pop().toLowerCase();
        
        const modal = document.getElementById('previewModal');
        const container = document.getElementById('previewMediaContainer');
        if (!modal || !container) return;

        container.innerHTML = '';
        const url = URL.createObjectURL(file);

        if (['html', 'htm'].includes(ext)) {
            let htmlContent = await file.text();
            
            // Inyección automática de dependencias CSS/JS si existen
            if (typeof explorerLens !== 'undefined' && workspaceHandle) {
                const cssRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi;
                let cssMatch;
                while ((cssMatch = cssRegex.exec(htmlContent)) !== null) {
                    try {
                        const cssHandle = await explorerLens.getHandleFromPath(cssMatch[1]);
                        const cssFile = await cssHandle.getFile();
                        const cssText = await cssFile.text();
                        htmlContent = htmlContent.replace(cssMatch[0], `<style>\n${cssText}\n</style>`);
                    } catch (e) {}
                }
                const jsRegex = /<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi;
                let jsMatch;
                while ((jsMatch = jsRegex.exec(htmlContent)) !== null) {
                    try {
                        const jsHandle = await explorerLens.getHandleFromPath(jsMatch[1]);
                        const jsFile = await jsHandle.getFile();
                        const jsText = await jsFile.text();
                        htmlContent = htmlContent.replace(jsMatch[0], `<script>\n${jsText}\n<\/script>`);
                    } catch (e) {}
                }
            }
            
            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
            const htmlBlobUrl = URL.createObjectURL(blobHtml);
            container.innerHTML = `<iframe src="${htmlBlobUrl}"></iframe>`;

        } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
            container.innerHTML = `<img src="${url}" alt="Previsualización">`;

        } else if (ext === 'svg') {
            const svgText = await file.text();
            container.innerHTML = svgText;

        } else if (['mp4', 'webm', 'mov', 'ogv'].includes(ext)) {
            container.innerHTML = `<video controls autoplay src="${url}"></video>`;

        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
            container.innerHTML = `<audio controls autoplay src="${url}"></audio>`;

        } else {
            const text = await file.text();
            const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            container.innerHTML = `<textarea readonly class="clean-text-preview" spellcheck="false">${safeText}</textarea>`;
        }

        modal.style.display = 'flex';
    } catch (e) {
        console.error("Error al previsualizar:", e);
    }
}

// Cierre del Modal al Hacer Clic Fuera del Contenido
function manejarClickFueraModal(event) {
    const container = document.getElementById('previewMediaContainer');
    if (container && !container.contains(event.target)) {
        cerrarPrevisualizacion();
    }
}

function cerrarPrevisualizacion() {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewMediaContainer');
    if (modal) modal.style.display = 'none';
    if (container) container.innerHTML = '';
}

// Actualizador Global de la UI de Archivos
async function actualizarUIArchivos() {
    if (!directoryHandle) return;               
    const treePanel = document.getElementById('fileList');
    if (treePanel) {
        const savedTreeScroll = treePanel.scrollTop;
        treePanel.innerHTML = '';
        const rootDiv = document.createElement('div');
        rootDiv.className = `folder-tree-item ${currentPath === '' ? 'active' : ''}`;
        rootDiv.innerHTML = `<div onclick="navegarACarpeta('')"><span>📁 </span><strong>Raíz</strong></div>`;
        treePanel.appendChild(rootDiv);
        await renderizarArbolDirectorio(directoryHandle, treePanel, '');
        treePanel.scrollTop = savedTreeScroll;
    }               
    let targetHandle = directoryHandle;
    if (currentPath) {
        targetHandle = await obtenerDirHandlePorRuta(currentPath, false);
    }
    await renderizarGridContenido(targetHandle);
}

// Apertura Manual de Archivo en Editor
async function abrirArchivoManual(nombre) {
    try {
        const fileHandle = await obtenerFileHandlePorRuta(nombre, false);
        const file = await fileHandle.getFile();
        const ext = nombre.split('.').pop().toLowerCase();
        const inputFilename = document.getElementById('editorFilename');
        const editorPanel = document.getElementById('editorPanel');
        if (inputFilename) inputFilename.value = nombre;
        if (editorPanel) editorPanel.style.display = 'flex';
        
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
            const url = URL.createObjectURL(file);
            reemplazarContenedorEditor(`<div style="display:flex; justify-content:center; align-items:center; width:100%; height:300px; background:var(--bg); border-radius:8px; overflow:hidden;"><img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;"></div>`);
        } else if (ext === 'svg') {
            const text = await file.text();
            reemplazarContenedorEditor(`<div style="display:flex; justify-content:center; align-items:center; width:100%; height:300px; background:var(--bg); border-radius:8px; overflow:hidden; padding:10px;">${text}</div>`);
        } else if (['mp4', 'webm', 'mov', 'ogv'].includes(ext)) {
            const url = URL.createObjectURL(file);
            reemplazarContenedorEditor(`<div style="display:flex; justify-content:center; align-items:center; width:100%; height:300px; background:var(--bg); border-radius:8px; overflow:hidden;"><video controls autoplay src="${url}" style="max-width:100%; max-height:100%;"></video></div>`);
        } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
            const url = URL.createObjectURL(file);
            reemplazarContenedorEditor(`<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; width:100%; height:150px; background:var(--bg); border-radius:8px; gap:15px;"><span style="font-size:40px;">🎵</span><audio controls autoplay src="${url}" style="width:80%;"></audio></div>`);
        } else {
            const text = await file.text();
            reemplazarContenedorEditor(`<textarea id="editorContent" placeholder="Contenido del archivo...">${text}</textarea>`);
        }
    } catch (e) {
        console.error("Error al abrir archivo:", e);
    }
}

// Auxiliar para reemplazar el contenido del panel editor
function reemplazarContenedorEditor(html) {
    const editorPanel = document.getElementById('editorPanel');
    if (!editorPanel) return;
    const oldElement = document.getElementById('editorContent') || editorPanel.children[1];
    if (oldElement && oldElement.id !== 'editorFilename') {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const newElement = temp.firstElementChild;
        oldElement.replaceWith(newElement);
    }
}

function nuevoArchivoManual() {
    const editorFilename = document.getElementById('editorFilename');
    const editorPanel = document.getElementById('editorPanel');
    if (editorFilename) editorFilename.value = currentPath ? `${currentPath}/nuevo_archivo.txt` : 'nuevo_archivo.txt';
    reemplazarContenedorEditor(`<textarea id="editorContent" placeholder="Contenido del archivo..."></textarea>`);
    if (editorPanel) editorPanel.style.display = 'flex';
    if (editorFilename) editorFilename.focus();
}

async function guardarManual() {
    const editorFilename = document.getElementById('editorFilename');
    const editorContent = document.getElementById('editorContent');
    if (!editorFilename) return;
    const nombre = editorFilename.value.trim();
    if (!nombre) return;
    const contenido = editorContent && editorContent.tagName === 'TEXTAREA' ? editorContent.value : '';               
    try {
        if (editorContent && editorContent.tagName === 'TEXTAREA') {
            await escribirArchivo(nombre, contenido);
            await actualizarUIArchivos();
        }
    } catch (e) {
        console.error("Error al guardar manualmente:", e);
    }
}

async function borrarManual() {
    const editorFilename = document.getElementById('editorFilename');
    if (!editorFilename) return;
    const nombre = editorFilename.value.trim();
    if (!nombre) return;               
    try {
        await borrarArchivo(nombre);
        const editorPanel = document.getElementById('editorPanel');
        if (editorPanel) editorPanel.style.display = 'none';
        editorFilename.value = '';
        reemplazarContenedorEditor(`<textarea id="editorContent" placeholder="Contenido del archivo..."></textarea>`);
        await actualizarUIArchivos();
    } catch (e) {
        console.error("Error al borrar manualmente:", e);
    }
}