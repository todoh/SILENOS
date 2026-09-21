// webModal.js - Control del modal de navegación web e iframe
const uiWeb = {
    modalEl: null,
    iframeEl: null,
    urlInputEl: null,

    init() {
        if (document.getElementById('webModalContainer')) return;

        const modalHTML = `
        <div id="webModalContainer" class="web-modal hidden">
            <div class="web-modal-header" id="webModalHeader">
                <span class="web-modal-title">Navegador IA</span>
                <div class="web-modal-controls">
                    <button onclick="uiWeb.toggleMinimize()" title="Minimizar">_</button>
                    <button onclick="uiWeb.toggleMaximize()" title="Maximizar">□</button>
                    <button onclick="uiWeb.close()" title="Cerrar">✕</button>
                </div>
            </div>
            <div class="web-modal-address">
                <input type="text" id="webModalUrl" placeholder="https://..." onkeydown="if(event.key==='Enter') uiWeb.navigateFromInput()">
            </div>
            <div class="web-modal-body">
                <iframe id="webIframe" sandbox="allow-scripts allow-forms allow-popups allow-modals allow-downloads"></iframe>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this.modalEl = document.getElementById('webModalContainer');
        this.iframeEl = document.getElementById('webIframe');
        this.urlInputEl = document.getElementById('webModalUrl');

        if (typeof makeDraggable === 'function') {
            makeDraggable(this.modalEl, document.getElementById('webModalHeader'));
        }
    },

    open(url) {
        this.init();
        if (this.modalEl) {
            this.modalEl.classList.remove('hidden');
            this.modalEl.classList.remove('minimized');
        }
        if (url) {
            this.navigate(url);
        }
    },

    close() {
        if (this.modalEl) {
            this.modalEl.classList.add('hidden');
        }
    },

    toggleMinimize() {
        if (this.modalEl) {
            this.modalEl.classList.toggle('minimized');
        }
    },

    toggleMaximize() {
        if (this.modalEl) {
            this.modalEl.classList.toggle('maximized');
        }
    },

    navigate(url) {
        this.init();
        if (this.urlInputEl) {
            this.urlInputEl.value = url;
        }
        if (this.iframeEl) {
            this.iframeEl.src = url;
        }
    },

    navigateFromInput() {
        if (!this.urlInputEl) return;
        let url = this.urlInputEl.value.trim();
        if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('local://') && !url.startsWith('blob:')) {
            url = 'https://' + url;
        }
        this.navigate(url);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    uiWeb.init();
});