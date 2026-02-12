// --- APP-BRIDGE.JS (CONNECTOR) ---

/**
 * Función maestra para abrir archivos.
 * Determina el tipo y llama al procesador adecuado.
 */
async function openFileInSilenos(entry, dirHandle) {
    const file = await entry.getFile();
    const type = detectFileType(entry.name); // Usamos logic.js helper o local

    log(`BRIDGE: Opening ${entry.name} as ${type}`);

    if (type === 'html') {
        // Proceso complejo: Resolver dependencias e inyectar en srcdoc
        const htmlContent = await processHTMLAndAssets(entry, dirHandle);
        if (htmlContent) {
            spawnWindow(entry.name, htmlContent, 'html');
        } else {
            showToast("Error processing HTML");
        }
    } 
    else if (type === 'image') {
        // Proceso simple: Blob directo
        const blobUrl = URL.createObjectURL(file);
        spawnWindow(entry.name, blobUrl, 'image');
    }
    else if (type === 'video') {
        // NUEVO: Proceso de video
        const blobUrl = URL.createObjectURL(file);
        spawnWindow(entry.name, blobUrl, 'video');
    }
    else {
        // Texto / Código
        const text = await file.text();
        spawnWindow(entry.name, text, 'txt');
    }
}

function detectFileType(filename) {
    if (filename.endsWith('.html') || filename.endsWith('.htm')) return 'html';
    if (filename.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) return 'image';
    if (filename.match(/\.(mp4|webm|ogg|mov|m4v)$/i)) return 'video'; // Detectar videos
    return 'txt';
}