/* SILENOS 3/gamebook-manager.js */

window.GamebookManager = {
    // Generamos el HTML completo inyectando las partes desde los submódulos
    getTemplate(fileId, initialTitle) {
        // Verificar que los módulos están cargados
        const styles = (window.GB_UI && window.GB_UI.STYLES) || '';
        const icons = (window.GB_UI && window.GB_UI.ICONS_CODE) || '';
        const exportGame = (window.GB_ExportGame && window.GB_ExportGame.CODE) || '';
        const exportBook = (window.GB_ExportBook && window.GB_ExportBook.CODE) || '';
        const componentCode = (window.GB_Logic && window.GB_Logic.COMPONENT_CODE) || '';

        // Escapamos las comillas invertidas para el string template global
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>${styles}</style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, useRef } = React;
        const FILE_ID = "${fileId}";
        const initialTitle = "${initialTitle}";

        ${icons}
        ${exportGame}
        ${exportBook}
        ${componentCode}

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<GamebookMaker />);
    </script>
</body>
</html>`;
    },

    renderInWindow(windowId, fileId) {
        const file = FileSystem.getItem(fileId);
        if (!file) return;

        const winContent = document.querySelector(`#window-${windowId} .content-area`);
        if (!winContent) return;

        // Limpiar contenido previo
        winContent.innerHTML = '';
        
        // Crear iframe para aislamiento total (CSS global del sistema vs CSS del editor)
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        
        // Asignar el contenido ensamblado
        const template = this.getTemplate(fileId, file.title || 'Proyecto Librojuego');
        iframe.srcdoc = template;
        
        // Handlers de comunicación
        const messageHandler = (event) => {
            // Ignorar mensajes de otros iframes/fuentes
            if (event.source !== iframe.contentWindow) return;

            const { type, id, content } = event.data;
            if (id !== fileId) return;

            if (type === 'ready') {
                // El iframe cargó y pide datos. Se los enviamos.
                const currentFile = FileSystem.getItem(fileId);
                iframe.contentWindow.postMessage({
                    type: 'load',
                    content: currentFile.content
                }, '*');
            } else if (type === 'save') {
                // El iframe quiere guardar.
                if (content) {
                    FileSystem.updateItem(fileId, { content: content, title: content.title }, true);
                }
            }
        };

        window.addEventListener('message', messageHandler);
        
        // Adjuntamos al iframe un atributo para identificarlo
        iframe.setAttribute('data-file-id', fileId);

        winContent.appendChild(iframe);
    }
};