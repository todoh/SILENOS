/* SILENOS - KOREH FUNCIONACIONES 9 (Materia & Export System)
   Versión: 9.0 - Fábrica de Objetos de Sistema
   Ontología: M (Materia / Creación de Archivos)
   Dependencias: FileSystem, KorehIA (v8)
*/

// Extendemos el objeto global KorehIA manteniendo lo anterior
window.KorehIA = {
    ...window.KorehIA,

    // ==========================================
    // SECCIÓN M: MATERIA (Generación de Archivos)
    // ==========================================
    M: {
        /**
         * Genera o actualiza un LIBRO con capítulos y párrafos
         * @param {string} title - Título del libro
         * @param {Array} chapters - [{title: "Cap 1", paragraphs: ["...", "..."]}]
         */
        saveBook(title, chapters) {
            if (typeof FileSystem === 'undefined') return null;
            
            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'book');

            if (!item) {
                item = FileSystem.createBook(title, 'desktop');
            }

            // Estructura interna de BookManager
            item.content = {
                chapters: chapters.map(c => ({
                    title: c.title || "Capítulo sin título",
                    paragraphs: Array.isArray(c.paragraphs) ? c.paragraphs : [c.paragraphs]
                }))
            };

            FileSystem.save();
            this._refresh(item.id, 'book');
            return item.id;
        },

        /**
         * Genera o actualiza un DATO NARRATIVO (Nota)
         */
        saveNarrative(title, tag, text) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'narrative');

            if (!item) {
                item = FileSystem.createNarrative(title, 'desktop');
            }

            item.content = { 
                tag: tag.toUpperCase(), 
                text: text.trim() 
            };

            FileSystem.save();
            this._refresh(item.id, 'narrative');
            return item.id;
        },

        /**
         * Genera o actualiza un archivo de DATOS (JSON)
         */
        saveData(title, jsonObject) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'file');

            if (!item) {
                item = FileSystem.createData(title, jsonObject, 'desktop');
            } else {
                item.content = jsonObject;
            }

            FileSystem.save();
            this._refresh(item.id, 'file');
            return item.id;
        },

        /**
         * Genera o actualiza un PROGRAMA (Grafo de nodos)
         * @param {string} title - Nombre del programa
         * @param {object} graphData - {nodes: [], connections: []}
         */
        saveProgram(title, graphData) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'program');

            if (!item) {
                item = FileSystem.createProgram(title, 'desktop');
            }

            item.content = {
                nodes: graphData.nodes || [],
                connections: graphData.connections || [],
                panX: graphData.panX || 0,
                panY: graphData.panY || 0,
                scale: graphData.scale || 1
            };

            FileSystem.save();
            this._refresh(item.id, 'program');
            return item.id;
        },

        /**
         * Guarda una IMAGEN en el sistema (Materia Base64)
         */
        saveImage(title, base64Data) {
            if (typeof FileSystem === 'undefined') return null;

            const desktopItems = FileSystem.getItems('desktop');
            let item = desktopItems.find(i => i.title === title && i.type === 'image');

            if (!item) {
                item = FileSystem.createImageItem(title, 'desktop', base64Data);
            } else {
                item.content = base64Data;
            }

            FileSystem.save();
            this._refresh(item.id, 'image');
            return item.id;
        },

        // --- Utilidades Internas ---

        /**
         * Notifica al sistema y actualiza ventanas abiertas para reflejar cambios
         */
        _refresh(itemId, type) {
            // Refrescar vistas generales
            if (typeof refreshSystemViews === 'function') refreshSystemViews();

            // Refrescar contenido específico si la ventana está abierta
            if (typeof openWindows !== 'undefined') {
                const wins = openWindows.filter(w => w.fileId === itemId || w.id === itemId);
                wins.forEach(win => {
                    if (type === 'book' && typeof BookManager !== 'undefined') {
                        BookManager.renderInWindow(win.id, itemId);
                    } else if (type === 'narrative' && typeof NarrativeManager !== 'undefined') {
                        NarrativeManager.renderInWindow(win.id, itemId);
                    } else if (type === 'program' && typeof ProgrammerManager !== 'undefined') {
                        // El programa suele requerir recarga de su instancia
                        ProgrammerManager.loadProgram(win.id, itemId);
                    }
                });
            }
        }
    }
};

console.log("Koreh-IA V9.0: Sección M (Materia) lista para exportación masiva.");