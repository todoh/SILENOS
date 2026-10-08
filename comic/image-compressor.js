/**
 * SAGA Comic Builder - Módulo de Compresión de Imágenes para Exportación
 * Proporciona utilidades para comprimir imágenes y DataURLs antes de empaquetarlas en DOCX/PDF.
 */
const ImageCompressor = {
    /**
     * Comprime una imagen en formato DataURL ajustando calidad y/o dimensiones máximas.
     * @param {string} dataUrl - Cadena DataURL (base64) original de la imagen.
     * @param {Object} options - Opciones de compresión.
     * @param {number} options.maxWidth - Ancho máximo permitido (px). Default: 1650 (suficiente para 300DPI en A5).
     * @param {number} options.maxHeight - Alto máximo permitido (px). Default: 2340.
     * @param {number} options.quality - Calidad de compresión (0.1 a 1.0). Default: 0.85.
     * @param {string} options.mimeType - Tipo MIME objetivo ('image/jpeg' o 'image/png'). Default: 'image/jpeg'.
     * @returns {Promise<string>} Promise que resuelve con el DataURL comprimido.
     */
    async compressDataURL(dataUrl, options = {}) {
        const {
            maxWidth = 1650,
            maxHeight = 2340,
            quality = 0.85,
            mimeType = 'image/jpeg'
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Redimensionar manteniendo la relación de aspecto si excede los límites
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                // Calidad de renderizado
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';

                // Fondo blanco por si hay transparencias al convertir a JPEG
                if (mimeType === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                }

                ctx.drawImage(img, 0, 0, width, height);

                const compressedDataUrl = canvas.toDataURL(mimeType, quality);
                resolve(compressedDataUrl);
            };
            img.onerror = (err) => reject(new Error("Error al cargar la imagen para compresión: " + err));
            img.src = dataUrl;
        });
    },

    /**
     * Convierte una cadena DataURL (base64) a Uint8Array.
     * @param {string} dataUrl 
     * @returns {Uint8Array|null}
     */
    dataURLToUint8Array(dataUrl) {
        if (!dataUrl) return null;
        const arr = dataUrl.split(',');
        if (arr.length < 2) return null;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return u8arr;
    }
};

window.ImageCompressor = ImageCompressor;