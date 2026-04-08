// live gemini/svg_studio.js
// ─── SVG STUDIO (CREADOR Y EXPORTADOR DE ARTE VECTORIAL) ───────────────────

window.svgStudioUI = {
    _dragBound: null,

    open() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero (Workspace)', 'error');
            return;
        }
        const modal = document.getElementById('svgStudioModal');
        if (modal) {
            modal.classList.remove('hidden');
            if (typeof makeDraggable === 'function' && !this._dragBound) {
                makeDraggable(modal, document.getElementById('svgModalHeader'));
                this._dragBound = true;
            }
        }
    },

    close() {
        const modal = document.getElementById('svgStudioModal');
        if (modal) modal.classList.add('hidden');
    },

    updatePreview() {
        const code = document.getElementById('svgStudioEditor').value;
        const preview = document.getElementById('svgPreviewContainer');
        if (preview) {
            preview.innerHTML = code;
        }
    },

    async _getTargetHandle(filename) {
        if (!workspaceHandle) throw new Error("Sin workspace");
        if (!filename.includes('/')) return await workspaceHandle.getFileHandle(filename, {create: true});
        
        const parts = filename.split('/');
        const name = parts.pop();
        let curr = workspaceHandle;
        for (const p of parts) {
            if (p.trim() === '') continue;
            curr = await curr.getDirectoryHandle(p, {create: true});
        }
        return await curr.getFileHandle(name, {create: true});
    },

    async saveSvg(filenameParam) {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return "Error: Sin workspace";
        }
        const code = document.getElementById('svgStudioEditor').value;
        if (!code.trim()) return "Error: SVG vacío";
        
        const filename = filenameParam || prompt("Ruta y nombre del archivo SVG (ej: imagenes/arte.svg):", `arte_${Date.now()}.svg`);
        if (!filename) return "Cancelado por el usuario";

        try {
            const fileHandle = await this._getTargetHandle(filename);
            const writable = await fileHandle.createWritable();
            await writable.write(code);
            await writable.close();
            
            if (typeof showToast === 'function') showToast(`SVG guardado: ${filename}`, 'success');
            if (typeof ide !== 'undefined') ide.refreshTree(); // Actualiza el árbol del IDE
            return `SVG guardado exitosamente como ${filename}`;
        } catch (e) {
            return `Error al guardar SVG: ${e.message}`;
        }
    },

    async savePng(filenameParam, widthParam, heightParam) {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return "Error: Sin workspace";
        }
        const code = document.getElementById('svgStudioEditor').value;
        if (!code.trim()) return "Error: SVG vacío";

        const width = parseInt(widthParam) || parseInt(document.getElementById('svgWidthInp').value) || 1024;
        const height = parseInt(heightParam) || parseInt(document.getElementById('svgHeightInp').value) || 1024;

        const filename = filenameParam || prompt("Ruta y nombre del archivo PNG (ej: exports/imagen.png):", `arte_${Date.now()}.png`);
        if (!filename) return "Cancelado por el usuario";

        const blob = new Blob([code], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        
        if (typeof showToast === 'function') showToast(`Renderizando PNG...`, 'listening');

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                URL.revokeObjectURL(url);
                
                canvas.toBlob(async (pngBlob) => {
                    try {
                        const fileHandle = await this._getTargetHandle(filename);
                        const writable = await fileHandle.createWritable();
                        await writable.write(pngBlob);
                        await writable.close();
                        
                        if (typeof showToast === 'function') showToast(`PNG exportado a ${width}x${height}`, 'success');
                        if (typeof ide !== 'undefined') ide.refreshTree();
                        resolve(`PNG de ${width}x${height} guardado exitosamente como ${filename}`);
                    } catch(e) {
                        if (typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
                        resolve(`Error al escribir PNG en disco: ${e.message}`);
                    }
                }, 'image/png');
            };
            img.onerror = () => {
                if (typeof showToast === 'function') showToast(`Error al parsear el SVG`, 'error');
                resolve("Error estructural: No se pudo parsear o renderizar el código SVG actual para exportarlo a PNG.");
            }
            img.src = url;
        });
    }
};

// Herramienta nativa para ser invocada por la Inteligencia Artificial
async function handleSvgStudioTool(args) {
    const { action, code, filename, width, height } = args;
    
    try {
        if (action === 'open') {
            if (typeof svgStudioUI !== 'undefined') svgStudioUI.open();
            return "Interfaz de SVG Studio abierta en la pantalla del usuario.";
        } 
        else if (action === 'close') {
            if (typeof svgStudioUI !== 'undefined') svgStudioUI.close();
            return "Interfaz de SVG Studio cerrada.";
        } 
        else if (action === 'create_svg') {
            if (!code) return "Error lógico: Se requiere el parámetro 'code' con el SVG fuente.";
            if (typeof svgStudioUI !== 'undefined') {
                svgStudioUI.open();
                document.getElementById('svgStudioEditor').value = code;
                svgStudioUI.updatePreview();
                return "Código vectorial inyectado con éxito en el SVG Studio. Ya es visible para el usuario.";
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        } 
        else if (action === 'save_svg') {
            if (typeof svgStudioUI !== 'undefined') {
                return await svgStudioUI.saveSvg(filename);
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        } 
        else if (action === 'save_png') {
            if (typeof svgStudioUI !== 'undefined') {
                return await svgStudioUI.savePng(filename, width, height);
            }
            return "Error: Interfaz de SVG Studio no encontrada en el DOM.";
        }
        
        return `Acción '${action}' no reconocida para SVG Studio.`;
    } catch (e) {
        return `Fallo crítico en SVG Studio: ${e.message}`;
    }
}