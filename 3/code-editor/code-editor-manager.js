/* SILENOS 3/code-editor/code-editor-manager.js */

class CodeEditorManager {
    constructor(container, fileId) {
        this.container = container;
        this.fileId = fileId;
        this.file = FileSystem.getItem(fileId);
        this.content = (this.file.content && this.file.content.text) ? this.file.content.text : "";
    }

    init() {
        this.render();
        this.setupEvents();
        this.updateHighlighting(this.content);
    }

    render() {
        this.container.innerHTML = `
            <div class="flex flex-col h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm overflow-hidden">
                <div class="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-yellow-500">JavaScript</span>
                        <span id="editor-status-${this.fileId}" class="text-xs text-gray-500 italic"></span>
                    </div>
                    <button id="btn-save-${this.fileId}" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1">
                        <i data-lucide="save" class="w-3 h-3"></i> Guardar
                    </button>
                </div>

                <div class="relative flex-1 overflow-hidden" id="editor-wrapper-${this.fileId}">
                    <pre class="editor-layer highlight-layer" aria-hidden="true"><code id="highlight-code-${this.fileId}" class="language-javascript"></code></pre>
                    
                    <textarea id="editor-textarea-${this.fileId}" class="editor-layer input-layer" spellcheck="false">${this.escapeHtml(this.content)}</textarea>
                </div>
            </div>
        `;
        
        if (window.lucide) lucide.createIcons();
    }

    setupEvents() {
        const textarea = this.container.querySelector(`#editor-textarea-${this.fileId}`);
        const codeBlock = this.container.querySelector(`#highlight-code-${this.fileId}`);
        const saveBtn = this.container.querySelector(`#btn-save-${this.fileId}`);
        const status = this.container.querySelector(`#editor-status-${this.fileId}`);

        // Sincronizar scroll
        textarea.addEventListener('scroll', () => {
            codeBlock.parentElement.scrollTop = textarea.scrollTop;
            codeBlock.parentElement.scrollLeft = textarea.scrollLeft;
        });

        // Input y resaltado
        textarea.addEventListener('input', () => {
            const text = textarea.value;
            this.updateHighlighting(text);
            status.textContent = "Modificado *";
        });

        // Manejo de tabulaciones
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const value = textarea.value;
                textarea.value = value.substring(0, start) + "  " + value.substring(end);
                textarea.selectionStart = textarea.selectionEnd = start + 2;
                this.updateHighlighting(textarea.value);
            }
            // Ctrl+S para guardar
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveFile();
            }
        });

        // Guardar
        saveBtn.addEventListener('click', () => this.saveFile());
    }

    saveFile() {
        const textarea = this.container.querySelector(`#editor-textarea-${this.fileId}`);
        const status = this.container.querySelector(`#editor-status-${this.fileId}`);
        const newText = textarea.value;

        // Aquí es donde aseguramos que se guarda como estructura interna de Silenos,
        // pero manteniendo el contenido como texto puro JS dentro del objeto.
        const success = FileSystem.updateItem(this.fileId, {
            content: { text: newText }
        });

        if (success) {
            // Forzamos el persistido en disco
            if (typeof FileSystem.save === 'function') FileSystem.save();
            
            status.textContent = "Guardado ✅";
            setTimeout(() => { status.textContent = ""; }, 2000);
        } else {
            status.textContent = "Error al guardar ❌";
        }
    }

    updateHighlighting(text) {
        const codeBlock = this.container.querySelector(`#highlight-code-${this.fileId}`);
        // Al final añadimos un carácter extra para evitar problemas de scroll/corte
        let highlighted = this.escapeHtml(text);
        highlighted = this.applySyntaxColors(highlighted);
        if (highlighted.endsWith('\n')) highlighted += ' '; 
        codeBlock.innerHTML = highlighted;
    }

    escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    applySyntaxColors(text) {
        // Regex muy básico para Javascript
        // Orden importa: Strings > Comments > Keywords > Numbers
        
        return text
            // Strings (comillas simples y dobles)
            .replace(/(['"`])(.*?)\1/g, '<span class="token-string">$&</span>')
            // Comentarios (línea) - Cuidado con colisión con URLs en strings, es un highlighter simple
            .replace(/(\/\/.*)/g, '<span class="token-comment">$1</span>')
            // Keywords
            .replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|import|export|default|class|new|this|async|await)\b/g, '<span class="token-keyword">$1</span>')
            // Funciones (nombre seguido de parentesis)
            .replace(/(\w+)(?=\()/g, '<span class="token-function">$1</span>')
            // Números
            .replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>');
    }
}

// Exponer globalmente
window.CodeEditorManager = CodeEditorManager;