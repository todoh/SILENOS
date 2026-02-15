window.ChromaProcessor = {
    // Procesa un Blob de imagen (con fondo verde) y devuelve un Blob (PNG transparente)
    process(blob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = URL.createObjectURL(blob);
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = frame.data;
                
                // Variables para Bounding Box (Recorte automático)
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                let foundPixel = false;

                for (let i = 0; i < data.length; i += 4) {
                    let r = data[i];
                    let g = data[i+1];
                    let b = data[i+2];

                    // --- ALGORITMO EXACTO DE IMAGEN STUDIO ---
                    
                    // 1. Calcular el límite esperado del verde basado en rojo y azul.
                    const rbMax = Math.max(r, b);
                    
                    // Si el verde es el canal dominante...
                    if (g > rbMax) {
                        // 2. "Clamping": Bajamos el verde para que coincida con el máximo de los otros canales.
                        // Esto neutraliza el tinte verde (Despill).
                        data[i+1] = rbMax;
                        
                        // 3. Calcular Alpha basado en el exceso de verde (Soft Mask).
                        const spillAmount = (g - rbMax);
                        
                        if (spillAmount > 60) {
                            data[i+3] = 0; // Transparente total
                        } else if (spillAmount > 20) {
                            // Borde suave (gradiente de opacidad)
                            const alpha = 255 - ((spillAmount - 20) * (255 / 40));
                            data[i+3] = alpha;
                        }
                        // Si spillAmount < 20, se mantiene la opacidad (reflejos leves corregidos).
                    }

                    // Chequeo de bounding box para crop
                    if (data[i+3] > 10) {
                        const x = (i / 4) % canvas.width;
                        const y = Math.floor((i / 4) / canvas.width);
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        foundPixel = true;
                    }
                }

                ctx.putImageData(frame, 0, 0);

                if (!foundPixel) {
                    // Si la imagen quedó vacía, devolver tal cual
                    canvas.toBlob(b => {
                        URL.revokeObjectURL(img.src);
                        resolve(b);
                    }, 'image/png');
                    return;
                }

                // Crop (Recorte) con margen
                const margin = 10;
                const w = maxX - minX + 1;
                const h = maxY - minY + 1;
                const sx = Math.max(0, minX - margin);
                const sy = Math.max(0, minY - margin);
                const sw = Math.min(canvas.width - sx, w + margin * 2);
                const sh = Math.min(canvas.height - sy, h + margin * 2);

                const cropCanvas = document.createElement('canvas');
                cropCanvas.width = sw;
                cropCanvas.height = sh;
                cropCanvas.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

                cropCanvas.toBlob(b => {
                    URL.revokeObjectURL(img.src);
                    resolve(b);
                }, 'image/png');
            };
            
            img.onerror = (e) => reject(new Error("Error cargando imagen para Chroma."));
        });
    }
};