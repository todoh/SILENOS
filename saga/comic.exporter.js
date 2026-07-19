/**
 * Módulo de Exportación de Cronología como Cómic en Alta Resolución (4K)
 * Configuración: 3 Columnas x 4 Filas (Imágenes Horizontales Completas)
 * Espacio de nombres: window.ComicExporter
 */

window.ComicExporter = {
    async exportAsComic() {
        if (!window.mainCrono || !window.mainCrono.data || !window.mainCrono.data.events) {
            return alert("No hay datos de cronología activos para exportar.");
        }

        // Extraer todos los momentos ordenados cronológicamente
        const sortedEvents = [...window.mainCrono.data.events].sort((a, b) => parseFloat(a.time) - parseFloat(b.time));
        const allMoments = [];
        
        sortedEvents.forEach(evt => {
            if (evt.moments && Array.isArray(evt.moments)) {
                evt.moments.forEach(m => {
                    allMoments.push({
                        ...m,
                        eventTitle: evt.description || evt.title || "Escena"
                    });
                });
            }
        });

        if (allMoments.length === 0) {
            return alert("La cronología actual no contiene momentos con viñetas para renderizar.");
        }

        alert(`Iniciando renderizado optimizado de cómic 4K (3x4). Total de viñetas detectadas: ${allMoments.length}. Por favor espere...`);

        // Configuración de página de alta definición 4K Estándar Vertical
        const PAGE_WIDTH = 3840;
        const PAGE_HEIGHT = 5430; 
        
        // Nueva Rejilla solicitada
        const COLS = 3;
        const ROWS = 4; 
        
        const MARGIN_X = 140;
        const MARGIN_Y = 180;
        const GAP_X = 80;
        const GAP_Y = 110; // Espaciado vertical entre filas adaptado

        const AVAILABLE_WIDTH = PAGE_WIDTH - (MARGIN_X * 2) - (GAP_X * (COLS - 1));
        const AVAILABLE_HEIGHT = PAGE_HEIGHT - (MARGIN_Y * 2) - (GAP_Y * (ROWS - 1));
        
        const PANEL_WIDTH = AVAILABLE_WIDTH / COLS;
        const PANEL_HEIGHT = AVAILABLE_HEIGHT / ROWS;
        
        // Proporción dorada para imágenes horizontales dentro de la rejilla 3x4:
        const IMAGE_HEIGHT = PANEL_WIDTH * (9 / 16); // Forzado de caja base a proporción panorámica ideal
        const TEXT_BOX_HEIGHT = PANEL_HEIGHT - IMAGE_HEIGHT - 15;

        let momentIndex = 0;
        let pageNumber = 1;

        while (momentIndex < allMoments.length) {
            const canvas = document.createElement('canvas');
            canvas.width = PAGE_WIDTH;
            canvas.height = PAGE_HEIGHT;
            const ctx = canvas.getContext('2d');

            // Fondo Blanco Cómic Limpio
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

            // Encabezado de página Premium
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 52px "Inter", "Roboto", "Segoe UI", sans-serif';
            const bookTitle = (document.getElementById('gemini-book-title')?.value || "NEXUS SAGA").toUpperCase();
            ctx.fillText(`${bookTitle}   |   CRONOLOGÍA NARRATIVA VISUAL`, MARGIN_X, MARGIN_Y - 80);
            
            ctx.font = 'bold 38px "Courier New", monospace';
            ctx.fillStyle = '#666666';
            ctx.fillText(`PÁGINA ${pageNumber}`, PAGE_WIDTH - MARGIN_X - 240, MARGIN_Y - 80);

            // Línea de separación superior
            ctx.strokeStyle = '#111111';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(MARGIN_X, MARGIN_Y - 45);
            ctx.lineTo(PAGE_WIDTH - MARGIN_X, MARGIN_Y - 45);
            ctx.stroke();

            // Renderizar la rejilla dinámica de 3x4
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (momentIndex >= allMoments.length) break;

                    const moment = allMoments[momentIndex];
                    
                    // Coordenadas del slot de la rejilla
                    const px = MARGIN_X + c * (PANEL_WIDTH + GAP_X);
                    const py = MARGIN_Y + r * (PANEL_HEIGHT + GAP_Y);

                    // Fondo de seguridad oscuro para la viñeta por si la imagen horizontal es más estrecha
                    ctx.fillStyle = '#1A1A1A';
                    ctx.fillRect(px, py, PANEL_WIDTH, IMAGE_HEIGHT);

                    // RECOLECCIÓN OPTIMIZADA Y CORRECTA DE IMÁGENES
                    let imgSource = null;
                    
                    // Prioridad 1: Buscar archivo físico real en la carpeta abierta como imagen
                    if (moment.imageFile && window.app && window.app.targetHandle) {
                        try {
                            const imgHandle = await window.app.targetHandle.getFileHandle(moment.imageFile);
                            const imgFile = await imgHandle.getFile();
                            imgSource = URL.createObjectURL(imgFile);
                        } catch(e) {
                            console.warn("No se pudo leer el archivo físico de imagen:", moment.imageFile, e);
                        }
                    }

                    // Prioridad 2: Si no hay archivo o falló, usar su base64 embebido original
                    if (!imgSource && moment.image64) {
                        imgSource = moment.image64;
                    }

                    // Prioridad 3 (Fallback restrictivo): Solo si no tiene imagen propia, buscar ítem estricto por ID o Prompt Visual
                    if (!imgSource && window.app && window.app.items) {
                        const matchingItem = window.app.items.find(item => {
                            if (!item.displayImage) return false;
                            const filenameClean = item.name.toLowerCase().replace('.json', '');
                            // Se remueve la búsqueda difusa por texto descriptivo para prevenir la duplicación accidental de fotos de personajes
                            return filenameClean === moment.id || (moment.visualPrompt && moment.visualPrompt.toLowerCase().includes(filenameClean));
                        });
                        if (matchingItem) {
                            imgSource = matchingItem.displayImage;
                        }
                    }

                    if (imgSource) {
                        try {
                            const img = await this.loadImageAsync(imgSource);
                            ctx.save();
                            ctx.beginPath();
                            ctx.rect(px, py, PANEL_WIDTH, IMAGE_HEIGHT);
                            ctx.clip();
                            
                            // LÓGICA DE AJUSTE PROPORCIONAL COMPLETO (CONTAIN) NO-DEFORMABLE
                            const imgRatio = img.width / img.height;
                            const containerRatio = PANEL_WIDTH / IMAGE_HEIGHT;
                            let nw, nh, nx, ny;
                            
                            if (imgRatio > containerRatio) {
                                // La imagen es proporcionalmente más ancha que el contenedor
                                nw = PANEL_WIDTH;
                                nh = PANEL_WIDTH / imgRatio;
                                nx = px;
                                ny = py + (IMAGE_HEIGHT - nh) / 2;
                            } else {
                                // La imagen es proporcionalmente más alta
                                nh = IMAGE_HEIGHT;
                                nw = IMAGE_HEIGHT * imgRatio;
                                nx = px + (PANEL_WIDTH - nw) / 2;
                                ny = py;
                            }
                            
                            ctx.drawImage(img, nx, ny, nw, nh);
                            ctx.restore();
                        } catch (err) {
                            this.drawPlaceholder(ctx, px, py, PANEL_WIDTH, IMAGE_HEIGHT, "Error de Imagen");
                        }
                    } else {
                        this.drawPlaceholder(ctx, px, py, PANEL_WIDTH, IMAGE_HEIGHT, "Viñeta sin Ilustración");
                    }

                    // Marco exterior negro nítido (Estilo Novela Gráfica / Manga)
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 8;
                    ctx.strokeRect(px, py, PANEL_WIDTH, IMAGE_HEIGHT);

                    // 3. Bloque de Texto Inferior Estilizado
                    const textY = py + IMAGE_HEIGHT + 15;
                    
                    // Fondo limpio para lectura optimizada de los subtítulos
                    ctx.fillStyle = '#FAFAFA';
                    ctx.fillRect(px, textY, PANEL_WIDTH, TEXT_BOX_HEIGHT);
                    ctx.strokeStyle = '#D1D5DB';
                    ctx.lineWidth = 7;
                    ctx.strokeRect(px, textY, PANEL_WIDTH, TEXT_BOX_HEIGHT);

                    // Renderizado del texto con sangría limpia
                    ctx.fillStyle = '#111111';
                    ctx.font = '48px "Inter", "Segoe UI", sans-serif'; // Reducida ligeramente para encajar de forma óptima en 3x4
                    
                    const paragraphText = moment.text || "...";
                    this.wrapText(ctx, paragraphText, px + 20, textY + 45, PANEL_WIDTH - 40, 40);

                    momentIndex++;
                }
            }

            // Descargar folio resultante en formato de alta calidad PNG 4K
            const dataUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            const timelineName = (window.mainCrono?.currentTimelineName || "TIMELINE").replace('.json', '');
            downloadLink.download = `${timelineName}_Comic_Pag_${pageNumber}_4K.png`;
            downloadLink.href = dataUrl;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            pageNumber++;
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        alert("¡Páginas de cómic 3x4 exportadas exitosamente en PNG de alta resolución!");
    },

    loadImageAsync(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (e) => reject(e);
            img.src = src;
        });
    },

    drawPlaceholder(ctx, x, y, width, height, text) {
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = '#9CA3AF';
        ctx.font = 'italic bold 28px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + width / 2, y + height / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
};