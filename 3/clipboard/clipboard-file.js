/* SILENOS 3/clipboard/clipboard-file.js */

const FilePasteHandler = {
    // Aceptamos cualquier archivo físico
    async canHandle(item) {
        return item.kind === 'file';
    },

    async handle(item, destParentId, mouseX, mouseY) {
        const file = item.getAsFile();
        if (!file) return false;

        console.log(`📂 FilePasteHandler: Procesando archivo raw: ${file.name}`);

        // 1. Guardar el Blob crudo
        const path = await FileSystem.saveRawFile(file);
        
        if (path) {
            // 2. Determinar tipo visual
            const isImage = file.type.startsWith('image/');
            const type = isImage ? 'image' : 'file';
            const icon = isImage ? 'image' : 'file';

            // 3. Crear item en el sistema
            // Usamos las coordenadas del ratón si están disponibles
            if (destParentId === 'desktop' && typeof ThreeDesktop !== 'undefined' && mouseX !== null) {
                const world = ThreeDesktop.screenToWorld(mouseX, mouseY);
                mouseX = world.x;
                mouseY = world.y;
            }

            if (isImage) {
                // Usamos la estructura de imagen existente pero con content = path
                FileSystem.data.push({
                    id: 'image-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    type: 'image',
                    title: file.name,
                    content: path,
                    parentId: destParentId,
                    icon: 'image',
                    color: 'text-blue-400',
                    x: mouseX || 100,
                    y: mouseY || 100
                });
                FileSystem.save();
            } else {
                // Item de archivo genérico
                FileSystem.createFileItem(file.name, destParentId, path, file.type, mouseX, mouseY);
            }

            return true; // Detener procesamiento (evita que JsonPasteHandler lea el archivo)
        }

        return false;
    }
};

// [IMPORTANTE] Registramos con Prioridad MUY ALTA (100)
// Esto asegura que intercepte los archivos antes que los manejadores de texto/JSON intenten leerlos.
if (typeof ClipboardProcessor !== 'undefined') {
    ClipboardProcessor.registerHandler(FilePasteHandler, 100);
}