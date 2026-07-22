/**
 * Módulo de Exportación de Cronología como Cómic en Alta Resolución (4K)
 * Configuración: 1 Columna x 2 Filas (Imágenes Completa ocupando medio folio)
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

        alert(`Iniciando renderizado optimizado de cómic 4K (1x2 medio folio). Total de viñetas detectadas: ${allMoments.length}. Por favor espere...`);

        // Configuración de página de alta definición 4K Estándar Vertical
        const PAGE_WIDTH = 3840;
        const PAGE_HEIGHT = 5430; 
        
        // Rejilla 1x2 (Medio folio por viñeta)
        const COLS = 1;
        const ROWS = 2; 
        
        const MARGIN_X = 140;
        const MARGIN_Y = 180;
        const GAP_X = 0;
        const GAP_Y = 80; // Espaciado vertical entre paneles

        const AVAILABLE_WIDTH = PAGE_WIDTH - (MARGIN_X * 2);
        const AVAILABLE_HEIGHT = PAGE_HEIGHT - (MARGIN_Y * 2) - (GAP_Y * (ROWS - 1));
        
        const PANEL_WIDTH = AVAILABLE_WIDTH / COLS;
        const PANEL_HEIGHT = AVAILABLE_HEIGHT / ROWS;

        let momentIndex = 0;
        let pageNumber = 1;

        while (momentIndex < allMoments.length) {
            const canvas = document.createElement('canvas');
            canvas.width = PAGE_WIDTH;
            canvas.height = PAGE_HEIGHT;
            const ctx = canvas.getContext('2d');

            // Fondo Negro Cómic Limpio
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

            // Encabezado de página Premium
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 52px "Inter", "Roboto", "Segoe UI", sans-serif';
            const bookTitle = (document.getElementById('gemini-book-title')?.value || "NEXUS SAGA").toUpperCase();
            ctx.fillText(bookTitle, MARGIN_X, MARGIN_Y - 80);
            
            ctx.font = 'bold 38px "Courier New", monospace';
            ctx.fillStyle = '#AAAAAA';
            ctx.fillText(`PÁGINA ${pageNumber}`, PAGE_WIDTH - MARGIN_X - 240, MARGIN_Y - 80);

            // Línea de separación superior
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(MARGIN_X, MARGIN_Y - 45);
            ctx.lineTo(PAGE_WIDTH - MARGIN_X, MARGIN_Y - 45);
            ctx.stroke();

            // Renderizar la rejilla de 1x2
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (momentIndex >= allMoments.length) break;

                    const moment = allMoments[momentIndex];
                    
                    // Coordenadas del slot del panel
                    const px = MARGIN_X + c * (PANEL_WIDTH + GAP_X);
                    const py = MARGIN_Y + r * (PANEL_HEIGHT + GAP_Y);

                    // RECOLECCIÓN OPTIMIZADA Y CORRECTA DE IMÁGENES
                    let imgSource = null;
                    
                    // Prioridad 1: Buscar archivo físico real en la carpeta abierta
                    if (moment.imageFile && window.app && window.app.targetHandle) {
                        try {
                            const imgHandle = await window.app.targetHandle.getFileHandle(moment.imageFile);
                            const imgFile = await imgHandle.getFile();
                            imgSource = URL.createObjectURL(imgFile);
                        } catch(e) {
                            console.warn("No se pudo leer el archivo físico de imagen:", moment.imageFile, e);
                        }
                    }

                    // Prioridad 2: Usar base64 embebido original
                    if (!imgSource && moment.image64) {
                        imgSource = moment.image64;
                    }

                    // Prioridad 3: Fallback por ítem coincidente
                    if (!imgSource && window.app && window.app.items) {
                        const matchingItem = window.app.items.find(item => {
                            if (!item.displayImage) return false;
                            const filenameClean = item.name.toLowerCase().replace('.json', '');
                            return filenameClean === moment.id || (moment.visualPrompt && moment.visualPrompt.toLowerCase().includes(filenameClean));
                        });
                        if (matchingItem) {
                            imgSource = matchingItem.displayImage;
                        }
                    }

                    // 1. DIBUJAR LA IMAGEN OCUPANDO TODO EL ESPACIO DE LA VIÑETA (COVER FULL PANEL)
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(px, py, PANEL_WIDTH, PANEL_HEIGHT);
                    ctx.clip();

                    if (imgSource) {
                        try {
                            const img = await this.loadImageAsync(imgSource);
                            
                            // Algoritmo COVER para llenar el 100% del cuadro sin bordes negros
                            const imgRatio = img.width / img.height;
                            const containerRatio = PANEL_WIDTH / PANEL_HEIGHT;
                            let nw, nh, nx, ny;

                            if (imgRatio > containerRatio) {
                                nh = PANEL_HEIGHT;
                                nw = PANEL_HEIGHT * imgRatio;
                                nx = px + (PANEL_WIDTH - nw) / 2;
                                ny = py;
                            } else {
                                nw = PANEL_WIDTH;
                                nh = PANEL_WIDTH / imgRatio;
                                nx = px;
                                ny = py + (PANEL_HEIGHT - nh) / 2;
                            }
                            
                            ctx.drawImage(img, nx, ny, nw, nh);
                        } catch (err) {
                            this.drawPlaceholder(ctx, px, py, PANEL_WIDTH, PANEL_HEIGHT, "Error de Imagen");
                        }
                    } else {
                        this.drawPlaceholder(ctx, px, py, PANEL_WIDTH, PANEL_HEIGHT, "Viñeta sin Ilustración");
                    }
                    ctx.restore();

                    // 2. DIBUJAR LA CAJA DE TEXTO DENTRO DE LA IMAGEN (TEXTO TRIPLICADO Y CAJA DINÁMICA)
                    const textMargin = 50; // Margen entre el borde del panel y la caja flotante
                    const boxPaddingX = 60;
                    const boxPaddingY = 50;
                    const maxTextWidth = PANEL_WIDTH - (textMargin * 2) - (boxPaddingX * 2);

                    const paragraphText = moment.text || "...";
                    
                    // Tamaño de letra triplicado (44px * 3 = 132px) e interlineado proporcional (168px)
                    const fontSize = 78;
                    const lineHeight = 98;
                    const fontStyle = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`;

                    ctx.font = fontStyle;
                    const lines = this.calculateLines(ctx, paragraphText, maxTextWidth);
                    
                    // Cálculo dinámico de alto y ancho de la caja según el contenido exacto
                    const calculatedBoxHeight = (lines.length * lineHeight) + (boxPaddingY * 2);

                    let maxLineWidth = 0;
                    for (let l = 0; l < lines.length; l++) {
                        const w = ctx.measureText(lines[l]).width;
                        if (w > maxLineWidth) maxLineWidth = w;
                    }

                    // El ancho se adapta al contenido más sus paddings
                    const calculatedBoxWidth = Math.min(PANEL_WIDTH - (textMargin * 2), maxLineWidth + (boxPaddingX * 2));

                    // Dimensiones y coordenadas de la caja flotante alineada abajo a la izquierda con sus márgenes
                    const boxX = px + textMargin;
                    const boxY = py + PANEL_HEIGHT - textMargin - calculatedBoxHeight;

                    // Dibujar fondo flotante de la caja de texto (blanco con opacidad)
                    ctx.save();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
                    
                    // Sombreado suave para destacar del fondo de la imagen
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                    ctx.shadowBlur = 30;
                    ctx.shadowOffsetY = 12;

                    this.drawRoundedRect(ctx, boxX, boxY, calculatedBoxWidth, calculatedBoxHeight, 28);
                    ctx.fill();

                    // Borde de la caja flotante
                    ctx.restore();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 6;
                    this.drawRoundedRect(ctx, boxX, boxY, calculatedBoxWidth, calculatedBoxHeight, 28);
                    ctx.stroke();

                    // Renderizar texto en color oscuro
                    ctx.fillStyle = '#111111';
                    ctx.font = fontStyle;
                    ctx.textBaseline = 'top';
                    
                    let currentY = boxY + boxPaddingY;
                    for (let l = 0; l < lines.length; l++) {
                        ctx.fillText(lines[l], boxX + boxPaddingX, currentY);
                        currentY += lineHeight;
                    }

                    ctx.textBaseline = 'alphabetic'; // Restaurar baseline

                    // Marco exterior de la viñeta
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 8;
                    ctx.strokeRect(px, py, PANEL_WIDTH, PANEL_HEIGHT);

                    momentIndex++;
                }
            }

            // Descargar folio resultante en formato PNG 4K
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

        alert("¡Páginas de cómic 1x2 exportadas exitosamente en PNG de alta resolución!");
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
        ctx.fillStyle = '#111111';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = '#6B7280';
        ctx.font = 'italic bold 32px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + width / 2, y + height / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    },

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    },

    calculateLines(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let line = '';

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line.trim());
        return lines;
    }
};