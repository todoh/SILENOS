// --- APP-BRIDGE.JS (CONNECTOR) ---

async function openFileInSilenos(entry, dirHandle) {
    const file = await entry.getFile();
    const type = detectFileType(entry.name); 

    log(`BRIDGE: Opening ${entry.name} as ${type}`);

    if (type === 'html') {
        const htmlContent = await processHTMLAndAssets(entry, dirHandle);
        if (htmlContent) {
            spawnWindow(entry.name, htmlContent, 'html');
        } else {
            showToast("Error processing HTML");
        }
    } 
    else if (type === 'image') {
        const blobUrl = URL.createObjectURL(file);
        spawnWindow(entry.name, blobUrl, 'image');
    }
    else if (type === 'video') {
        const blobUrl = URL.createObjectURL(file);
        spawnWindow(entry.name, blobUrl, 'video');
    }
    else {
        // Texto / Código / JSON / LIBROS / DATA
        const text = await file.text();
        
        // --- DETECCION INTELIGENTE DE LIBRO O DATA ---
        if (entry.name.endsWith('.json')) {
            try {
                const json = JSON.parse(text);
                
                // 0. DETECCIÓN DATA STUDIO (Objeto con Imagen)
                // Si tiene 'imagen64', es un objeto de datos visual
                if (json.imagen64 && typeof DataStudio !== 'undefined') {
                    console.log("BRIDGE: Objeto de Datos detectado. Lanzando Data Studio.");
                    DataStudio.init(entry, json);
                    return;
                }

                // 1. DETECCIÓN NUEVO FORMATO LIBRO (Generador Libros v5+)
                // Estructura: { title: "...", chapters: [...] }
                if (json.chapters && Array.isArray(json.chapters)) {
                     if (typeof BookStudio !== 'undefined') {
                        console.log("BRIDGE: Libro Estructurado detectado (v5). Lanzando Book Studio.");
                        BookStudio.init(entry, json); 
                        return;
                    }
                }

                // 2. DETECCIÓN FORMATO ANTIGUO LIBRO (Array plano)
                const dataArray = Array.isArray(json) ? json : Object.values(json);
                if (dataArray.length > 0 && dataArray[0].section !== undefined && dataArray[0].content !== undefined) {
                    if (typeof BookStudio !== 'undefined') {
                        console.log("BRIDGE: Libro Legacy detectado. Lanzando Book Studio.");
                        BookStudio.init(entry, dataArray);
                        return;
                    }
                }
            } catch (e) {
                console.warn("BRIDGE: JSON parse error or not a book/data", e);
            }
        }

        spawnWindow(entry.name, text, 'txt');
    }
}

function detectFileType(filename) {
    if (filename.endsWith('.html') || filename.endsWith('.htm')) return 'html';
    if (filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (filename.match(/\.(mp4|webm|ogg|mov|m4v)$/i)) return 'video';
    return 'txt';
}