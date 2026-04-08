// live gemini/coder_studio.js
// ─── CODER STUDIO (INTERFAZ Y EJECUCIÓN EN VIVO) ──────────────────────────

window.coderStudioUI = {
    currentFileHandle: null,

    open() {
        const modal = document.getElementById('coderStudioModal');
        if (modal) {
            modal.classList.remove('hidden');
            if (typeof makeDraggable === 'function' && !this._dragBound) {
                makeDraggable(modal, document.getElementById('csModalHeader'));
                this._dragBound = true;
            }
        }
    },

    close() {
        const modal = document.getElementById('coderStudioModal');
        if (modal) modal.classList.add('hidden');
    },

    async runCode() {
        let code = document.getElementById('csEditor').value;
        const iframe = document.getElementById('csPreviewIframe');
        
        if (!iframe) return;
        
        // Destruir iframe antiguo y crear uno nuevo para evitar fugas de memoria o variables persistentes
        const container = iframe.parentElement;
        iframe.remove();
        
        const newIframe = document.createElement('iframe');
        newIframe.id = 'csPreviewIframe';
        newIframe.style.cssText = "width: 100%; height: 100%; border: none;";
        newIframe.setAttribute('allow', 'camera; microphone; display-capture; fullscreen; geolocation');
        container.appendChild(newIframe);

        // Procesar inyección de módulos locales si detectamos HTML y hay una carpeta activa
        if ((code.toLowerCase().includes('<html') || code.toLowerCase().includes('<!doctype') || code.toLowerCase().includes('<body')) && typeof explorerLens !== 'undefined' && workspaceHandle) {
            if (typeof showToast === 'function') showToast('Compilando e inyectando módulos locales...', 'listening');
            try {
                // Inyectar CSS local referenciado
                const cssRegex = /<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi;
                let cssMatch;
                while ((cssMatch = cssRegex.exec(code)) !== null) {
                    const cssPath = cssMatch[1];
                    if (!cssPath.startsWith('http')) {
                        try {
                            const handle = await explorerLens.getHandleFromPath(cssPath);
                            const file = await handle.getFile();
                            const cssText = await file.text();
                            code = code.replace(cssMatch[0], `<style>\n/* Módulo Local Inyectado: ${cssPath} */\n${cssText}\n</style>`);
                        } catch (e) { console.warn(`No se pudo inyectar el CSS local: ${cssPath}`, e); }
                    }
                }

                // Inyectar JS local referenciado
                const jsRegex = /<script[^>]+src=["']([^"']+\.js)["'][^>]*><\/script>/gi;
                let jsMatch;
                while ((jsMatch = jsRegex.exec(code)) !== null) {
                    const jsPath = jsMatch[1];
                    if (!jsPath.startsWith('http')) {
                        try {
                            const handle = await explorerLens.getHandleFromPath(jsPath);
                            const file = await handle.getFile();
                            const jsText = await file.text();
                            code = code.replace(jsMatch[0], `<script>\n/* Módulo Local Inyectado: ${jsPath} */\n${jsText}\n</script>`);
                        } catch (e) { console.warn(`No se pudo inyectar el JS local: ${jsPath}`, e); }
                    }
                }
            } catch(e) {
                console.error("Error inyectando dependencias modulares en Coder Studio", e);
            }
        }

        // Compilar y reproducir
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        newIframe.src = url;
        
        if (typeof showToast === 'function') showToast('Código Compilado y en Ejecución ▶', 'success');
    },

    async saveCode() {
        if (!workspaceHandle) {
            if (typeof showToast === 'function') showToast('Selecciona una carpeta local primero', 'error');
            return;
        }
        
        const filename = prompt("Nombre del archivo para guardar el código (ej: aplicacion.html):", "index.html");
        if (!filename) return;

        try {
            const fileHandle = await workspaceHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(document.getElementById('csEditor').value);
            await writable.close();
            this.currentFileHandle = fileHandle;
            if (typeof showToast === 'function') showToast(`Código guardado como ${filename}`, 'success');
        } catch (e) {
            if (typeof showToast === 'function') showToast(`Error al guardar: ${e.message}`, 'error');
        }
    },

    updateEditor(newCode) {
        const editor = document.getElementById('csEditor');
        if (editor) {
            editor.value = newCode;
            this.runCode(); // Auto-reproducir cuando se inyecta nuevo código
        }
    }
};

// Herramienta nativa para ser invocada por VOZ SILENOS
async function handleCoderStudioTool(args) {
    const { action, prompt, model, code } = args;
    
    try {
        if (action === 'open') {
            if (typeof coderStudioUI !== 'undefined') coderStudioUI.open();
            return "Interfaz de Coder Studio abierta al usuario. El entorno de ejecución en vivo está listo.";
        } 
        else if (action === 'close') {
            if (typeof coderStudioUI !== 'undefined') coderStudioUI.close();
            return "Interfaz de Coder Studio cerrada.";
        } 
        else if (action === 'delegate_code') {
            if (!prompt) return "Error logístico: Se requiere el parámetro 'prompt' para que el modelo sepa qué programar.";
            if (typeof coderStudioUI !== 'undefined') coderStudioUI.open();
            
            const targetModel = model || 'deepseek';
            const generatedCode = await coderAgents.generateCode(prompt, targetModel);
            
            if (!generatedCode.startsWith('Error')) {
                if (typeof coderStudioUI !== 'undefined') coderStudioUI.updateEditor(generatedCode);
                return `El modelo especializado [${targetModel}] ha generado el código exitosamente. Ha sido inyectado y auto-ejecutado en el Coder Studio del usuario.`;
            } else {
                return generatedCode; // Devuelve el error de red
            }
        } 
        else if (action === 'write_code') {
            if (!code) return "Error: Se requiere el parámetro 'code'.";
            if (typeof coderStudioUI !== 'undefined') {
                coderStudioUI.open();
                coderStudioUI.updateEditor(code);
                return "Has inyectado el código directamente en el Coder Studio. Se está ejecutando en tiempo real en la pantalla del usuario.";
            }
            return "Error: Coder Studio no está disponible en la interfaz actual.";
        }
        
        return `Acción '${action}' no reconocida para la herramienta Coder Studio.`;
    } catch (e) {
        return `Fallo crítico en el sistema de Coder Studio: ${e.message}`;
    }
}