/* SILENOS 3/archivos/type-js.js */
const TypeJS = {
    create(name, content, parentId, coords) {
        return {
            id: 'js-' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'javascript', 
            title: name || 'script.js', 
            parentId,
            content: { text: content || "" },
            x: coords?.x || 0, 
            y: coords?.y || 0, 
            z: coords?.z || 0, 
            icon: 'file-code', // O 'code'
            color: 'text-yellow-300' // Amarillo JS
        };
    },
    actions: [
        {
            label: "Descargar como .js",
            icon: "download",
            action: function(file) {
                // Obtenemos el texto. Según create(), la estructura es file.content.text
                const textContent = (file.content && file.content.text) ? file.content.text : "";
                
                // Crear el Blob con tipo MIME de JavaScript
                const blob = new Blob([textContent], { type: 'application/javascript' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                
                // Usar el título del archivo (file.title) y asegurar la extensión
                let fileName = file.title || "script.js";
                if (!fileName.toLowerCase().endsWith('.js')) {
                    fileName += '.js';
                }
                link.download = fileName;
                
                // Añadir al DOM, ejecutar click y limpiar
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Liberar memoria
                setTimeout(() => URL.revokeObjectURL(link.href), 100);
            }
        }
    ]
};
