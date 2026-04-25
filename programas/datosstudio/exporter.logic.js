/**
 * EXPORTER LOGIC - Módulo para empaquetar y descargar datos del proyecto
 * Archivo: datosstudio/exporter.logic.js
 * Versión: 1.2 - Limpieza de Base64 y filtrado estricto
 */

const Exporter = {
    /**
     * Función principal que orquesta la descarga
     */
    exportAllData: async function() {
        if (!window.app || !window.app.targetHandle) {
            return alert("Primero debes seleccionar una carpeta en la pestaña de Datos.");
        }

        console.log("Iniciando exportación de datos (limpieza de Base64 activa)...");

        try {
            let fullContent = `================================================\n`;
            fullContent += `   EXPORTACIÓN COMPLETA - DATOS STUDIO\n`;
            fullContent += `   Fecha: ${new Date().toLocaleString()}\n`;
            fullContent += `   Nota: Se han omitido datos binarios y Base64.\n`;
            fullContent += `================================================\n\n`;

            const files = await this.traverseDirectory(window.app.targetHandle);
            
            if (files.length === 0) {
                alert("No se encontraron archivos de texto válidos.");
                return;
            }

            for (const file of files) {
                fullContent += `------------------------------------------------\n`;
                fullContent += `ARCHIVO: ${file.path}\n`;
                fullContent += `------------------------------------------------\n`;
                fullContent += `${file.content}\n\n`;
            }

            this.downloadTxt(fullContent);
            console.log("Exportación finalizada con éxito.");

        } catch (error) {
            console.error("Error en la exportación:", error);
            alert("Error al intentar procesar los archivos.");
        }
    },

    /**
     * Recorre directorios filtrando extensiones y limpiando contenido
     */
    traverseDirectory: async function(dirHandle, path = "") {
        let files = [];
        // Solo permitimos estos formatos
        const allowedExtensions = ['.json', '.txt', '.js', '.html', '.css', '.md'];

        for await (const entry of dirHandle.values()) {
            const currentPath = path + entry.name;
            const extension = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
            
            if (entry.kind === 'file') {
                if (allowedExtensions.includes(extension)) {
                    try {
                        const file = await entry.getFile();
                        
                        // Si el archivo es demasiado grande (> 2MB), probablemente tenga mucha imagen incrustada
                        if (file.size > 2 * 1024 * 1024) {
                            console.warn(`Omitiendo ${currentPath} por tamaño excesivo.`);
                            continue;
                        }

                        let content = await file.text();
                        
                        // --- ELIMINAR BASE64 ---
                        // Busca patrones: data:image/png;base64,iVBORw...
                        const base64Regex = /data:image\/[a-zA-Z]*;base64,[^"']*/g;
                        if (base64Regex.test(content)) {
                            content = content.replace(base64Regex, "[IMAGEN BASE64 OMITIDA PARA REDUCIR TAMAÑO]");
                        }

                        files.push({ path: currentPath, content: content });
                    } catch (e) {
                        console.warn(`No se pudo leer ${currentPath}:`, e);
                    }
                }
            } else if (entry.kind === 'directory') {
                const subFiles = await this.traverseDirectory(entry, currentPath + "/");
                files = files.concat(subFiles);
            }
        }
        return files;
    },

    /**
     * Descarga el archivo TXT resultante
     */
    downloadTxt: function(text) {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `Datos_Studio_Clean_${timestamp}.txt`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
};