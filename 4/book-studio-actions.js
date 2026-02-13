// --- BOOK-STUDIO-ACTIONS.JS (DATA MANIPULATION) ---

window.BookActions = {
    
    update(index, key, value) {
        if (BookStudio.data[index]) {
            BookStudio.data[index][key] = value;
            // No guardamos a disco inmediatamente por rendimiento, solo en memoria
        }
    },

    insert(index) {
        const newBlock = {
            timestamp: new Date().toISOString(),
            section: "Nueva Sección",
            content: "Escribe aquí el contenido..."
        };
        // Splice inserta en la posición indicada
        BookStudio.data.splice(index, 0, newBlock);
    },

    delete(index) {
        BookStudio.data.splice(index, 1);
    },

    duplicate(index) {
        const original = BookStudio.data[index];
        const copy = JSON.parse(JSON.stringify(original)); // Deep copy
        copy.timestamp = new Date().toISOString();
        copy.section += " (Copia)";
        BookStudio.data.splice(index + 1, 0, copy);
    },

    async save() {
        if (!BookStudio.currentEntry) return;

        try {
            let contentStr = "";

            // --- LÓGICA DE GUARDADO DUAL ---
            if (BookStudio.metadata) {
                // MODO NUEVO: Reconstruir estructura completa { title, chapters... }
                const newFormatData = {
                    ...BookStudio.metadata,
                    updated: new Date().toISOString(),
                    chapters: BookStudio.data.map(block => ({
                        title: block.section,
                        // Convertir texto corrido de vuelta a array de párrafos
                        paragraphs: block.content.split('\n\n').map(p => p.trim()).filter(p => p.length > 0)
                    }))
                };
                contentStr = JSON.stringify(newFormatData, null, 4);
                
            } else {
                // MODO LEGACY: Array plano
                contentStr = JSON.stringify(BookStudio.data, null, 4);
            }
            
            const writable = await BookStudio.currentEntry.createWritable();
            await writable.write(contentStr);
            await writable.close();
            
            if (typeof showToast === 'function') showToast("LIBRO GUARDADO EXITOSAMENTE");
            console.log("BOOK STUDIO: Saved", BookStudio.currentEntry.name);
            
        } catch (e) {
            console.error(e);
            alert("Error al guardar: " + e.message);
        }
    }
};