// Archivo: Librojuego/image.processor.js

window.ImageProcessor = {
    /**
     * Redimensiona y mejora la calidad de una imagen conservando el ratio de aspecto.
     * @param {Blob|File} imageBlob - El archivo de imagen original
     * @param {number} targetWidth - Anchura objetivo (ej. 1920)
     * @param {number} sharpenAmount - Intensidad del filtro de enfoque (0.0 a 1.0)
     * @returns {Promise<Blob>} - Promesa que devuelve el nuevo Blob procesado (JPG Alta Calidad)
     */
    async process(imageBlob, targetWidth = 1920, sharpenAmount = 0.15) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(imageBlob);

            img.onload = () => {
                URL.revokeObjectURL(objectUrl); // Liberar memoria

                // Mantener la relación de aspecto sin deformar
                const ratio = img.height / img.width;
                const targetHeight = Math.round(targetWidth * ratio);

                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                // willReadFrequently optimiza el rendimiento porque manipularemos los píxeles a nivel de byte
                const ctx = canvas.getContext('2d', { willReadFrequently: true });

                // Activar los mejores algoritmos nativos de interpolación del motor del navegador (Lanczos / Bicubic)
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Dibujar la imagen escalada
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // Aplicar matriz de convolución (Sharpen / Unsharp Mask) para recuperar la nitidez perdida en la ampliación
                if (sharpenAmount > 0) {
                    this.applySharpen(ctx, targetWidth, targetHeight, sharpenAmount);
                }

                // Exportar como JPEG de máxima calidad para ahorrar peso reteniendo la información visual
                canvas.toBlob((newBlob) => {
                    resolve(newBlob);
                }, 'image/jpeg', 0.95);
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("Error al cargar la imagen en el procesador."));
            };

            img.src = objectUrl;
        });
    },

    /**
     * Aplica una matriz de convolución espacial 3x3 (Sharpen) píxel a píxel para mejorar contornos.
     */
    applySharpen(ctx, width, height, amount) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const tempData = new Uint8ClampedArray(data);

        // Pesos de la matriz para el filtro direccional cruzado
        const wCenter = 1 + (4 * amount);
        const wEdge = -amount;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                const idxUp = ((y - 1) * width + x) * 4;
                const idxDown = ((y + 1) * width + x) * 4;
                const idxLeft = (y * width + x - 1) * 4;
                const idxRight = (y * width + x + 1) * 4;

                // Multiplicación cruzada para canales RGB (0=R, 1=G, 2=B)
                for (let c = 0; c < 3; c++) {
                    let val =
                        tempData[idx + c] * wCenter +
                        tempData[idxUp + c] * wEdge +
                        tempData[idxDown + c] * wEdge +
                        tempData[idxLeft + c] * wEdge +
                        tempData[idxRight + c] * wEdge;

                    // Clamping para asegurar que el valor se mantiene dentro del espectro visual (0-255)
                    data[idx + c] = Math.min(255, Math.max(0, val));
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
};