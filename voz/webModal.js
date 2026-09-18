// webModal.js
// ─── CONTROL DEL MODAL DE NAVEGACIÓN Y BÚSQUEDA WEB ─────────────────────

window.uiWeb = {
    isMaximized: false,
    isMinimized: false,
    previousStyle: {},

    init() {
        if (document.getElementById('webModal')) return;

        const modalHTML = `
        <div id="webModal" class="web-modal hidden" style="position: fixed; bottom: 20px; left: 20px; width: 480px; height: 380px; z-index: 9999; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; transition: all 0.25s ease;">
            <div id="webModalHeader" class="web-modal-header" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: var(--surface2); border-bottom: 1px solid var(--border); cursor: move; user-select: none;">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                    <span style="font-size: 12px; font-weight: 700; color: var(--text); font-family: monospace;">🌐 BÚSQUEDA / NAVEGADOR</span>
                </div>
                <div class="web-modal-controls" style="display: flex; align-items: center; gap: 6px;">
                    <button onclick="uiWeb.toggleMinimize()" title="Minimizar (Esquina)" style="background: transparent; border: none; font-size: 14px; cursor: pointer; color: var(--text-dim); padding: 2px 6px;">🗕</button>
                    <button id="webModalMaxBtn" onclick="uiWeb.toggleMaximize()" title="Pantalla Completa" style="background: transparent; border: none; font-size: 14px; cursor: pointer; color: var(--text-dim); padding: 2px 6px;">🗖</button>
                    <button onclick="uiWeb.close()" title="Cerrar" style="background: transparent; border: none; font-size: 14px; font-weight: bold; cursor: pointer; color: var(--gem-red, #ef4444); padding: 2px 6px;">✕</button>
                </div>
            </div>
            <div class="web-modal-address" style="padding: 6px 10px; background: var(--surface2); border-bottom: 1px solid var(--border); display: flex; gap: 6px;">
                <input type="text" id="webModalUrl" readonly placeholder="https://..." style="flex: 1; padding: 6px 10px; font-family: monospace; font-size: 11px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); outline: none;">
            </div>
            <div class="web-modal-body" style="flex: 1; position: relative; background: #ffffff;">
                <iframe id="webIframe" style="width: 100%; height: 100%; border: none;" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Permitir arrastrar la ventana en su estado normal
        const modal = document.getElementById('webModal');
        const header = document.getElementById('webModalHeader');
        if (typeof makeDraggable === 'function') {
            makeDraggable(modal, header);
        }
    },

    open(url) {
        this.init();
        const modal = document.getElementById('webModal');
        const urlInput = document.getElementById('webModalUrl');
        const iframe = document.getElementById('webIframe');

        modal.classList.remove('hidden');
        if (urlInput) urlInput.value = url;
        if (iframe) iframe.src = url;

        // Si estaba minimizado, restaurar a ventana flotante inferior izquierda
        if (this.isMinimized) {
            this.toggleMinimize();
        }
    },

    close() {
        const modal = document.getElementById('webModal');
        if (modal) {
            modal.classList.add('hidden');
            const iframe = document.getElementById('webIframe');
            if (iframe) iframe.src = 'about:blank';
        }
    },

    toggleMinimize() {
        const modal = document.getElementById('webModal');
        if (!modal) return;

        if (!this.isMinimized) {
            // Guardar estilos antes de minimizar
            this.previousStyle = {
                top: modal.style.top,
                left: modal.style.left,
                bottom: modal.style.bottom,
                right: modal.style.right,
                width: modal.style.width,
                height: modal.style.height
            };

            modal.style.top = 'auto';
            modal.style.right = 'auto';
            modal.style.bottom = '20px';
            modal.style.left = '20px';
            modal.style.width = '320px';
            modal.style.height = '40px';
            modal.classList.add('minimized');
            this.isMinimized = true;
        } else {
            // Restaurar tamaño y posición original
            modal.style.top = this.previousStyle.top || 'auto';
            modal.style.left = this.previousStyle.left || '20px';
            modal.style.bottom = this.previousStyle.bottom || '20px';
            modal.style.right = this.previousStyle.right || 'auto';
            modal.style.width = this.previousStyle.width || '480px';
            modal.style.height = this.previousStyle.height || '380px';
            modal.classList.remove('minimized');
            this.isMinimized = false;
        }
    },

    toggleMaximize() {
        const modal = document.getElementById('webModal');
        const maxBtn = document.getElementById('webModalMaxBtn');
        if (!modal) return;

        if (!this.isMaximized) {
            // Guardar dimensiones previas si no estaba minimizado
            if (!this.isMinimized) {
                this.previousStyle = {
                    top: modal.style.top,
                    left: modal.style.left,
                    bottom: modal.style.bottom,
                    right: modal.style.right,
                    width: modal.style.width,
                    height: modal.style.height
                };
            }

            modal.style.top = '0px';
            modal.style.left = '0px';
            modal.style.bottom = 'auto';
            modal.style.right = 'auto';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.borderRadius = '0px';
            modal.classList.remove('minimized');
            modal.classList.add('maximized');
            if (maxBtn) maxBtn.innerText = '🗗';
            this.isMaximized = true;
            this.isMinimized = false;
        } else {
            // Restaurar tamaño flotante
            modal.style.top = this.previousStyle.top || 'auto';
            modal.style.left = this.previousStyle.left || '20px';
            modal.style.bottom = this.previousStyle.bottom || '20px';
            modal.style.right = this.previousStyle.right || 'auto';
            modal.style.width = this.previousStyle.width || '480px';
            modal.style.height = this.previousStyle.height || '380px';
            modal.style.borderRadius = 'var(--radius)';
            modal.classList.remove('maximized');
            if (maxBtn) maxBtn.innerText = '🗖';
            this.isMaximized = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    uiWeb.init();
});