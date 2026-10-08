Object.assign(window.ComicPipeline, {
    // ORGANIZA Y BALANCEA LAS VIÑETAS PARA QUE NINGUNA FILA DEJE HUECOS LATERALES NI ABAJO
    organizeAndBalancePagePanels(panels) {
        if (!panels || panels.length === 0) return { actualRows: 1, panels: [] };
        const processedPanels = panels.map((p, idx) => ({
            ...p,
            pagina: (p.pagina !== undefined && p.pagina !== null) ? parseInt(p.pagina, 10) : 1,
            vineta: (p.vineta !== undefined && p.vineta !== null) ? parseInt(p.vineta, 10) : (idx + 1),
            grid_span: Math.min(12, Math.max(1, parseInt(p.grid_span || 12, 10)))
        }));
        const rows = [];
        let currentRow = [];
        let currentCols = 0;
        processedPanels.forEach(panel => {
            if (currentCols + panel.grid_span > 12 && currentRow.length > 0) {
                rows.push(currentRow);
                currentRow = [panel];
                currentCols = panel.grid_span;
            } else {
                currentRow.push(panel);
                currentCols += panel.grid_span;
            }
        });
        if (currentRow.length > 0) {
            rows.push(currentRow);
        }
        // Balancea cada fila para que los spans sumen exactamente 12 sin dejar huecos
        rows.forEach(row => {
            const currentSum = row.reduce((sum, p) => sum + p.grid_span, 0);
            if (currentSum !== 12) {
                const diff = 12 - currentSum;
                if (row.length === 1) {
                    row[0].grid_span = 12;
                } else if (diff > 0) {
                    let remaining = diff;
                    for (let i = 0; i < row.length && remaining > 0; i++) {
                        const add = Math.ceil(remaining / (row.length - i));
                        row[i].grid_span += add;
                        remaining -= add;
                    }
                } else if (diff < 0) {
                    let overage = Math.abs(diff);
                    for (let i = row.length - 1; i >= 0 && overage > 0; i--) {
                        if (row[i].grid_span > 1) {
                            const sub = Math.min(row[i].grid_span - 1, overage);
                            row[i].grid_span -= sub;
                            overage -= sub;
                        }
                    }
                }
            }
        });
        return {
            actualRows: rows.length,
            panels: rows.flat()
        };
    },
    calculatePanelDimensions(format, span, totalRowsInPage = 3) {
        let pageW = 1024;
        let pageH = 1448; // Ratio 1:1.414 (A4 / Manga)
        if (format === 'horizontal') {
            pageW = 1280;
            pageH = 905;
        } else if (format === 'cuadrado') {
            pageW = 1024;
            pageH = 1024;
        }
        const padding = 25 * 2;
        const gap = 12;
        const gridColumns = 12;
        const usableWidth = pageW - padding;
        const usableHeight = pageH - padding;
        const rawWidth = (usableWidth * (span / gridColumns)) - gap;
        const rawHeight = (usableHeight / Math.max(1, totalRowsInPage)) - gap;
        const targetRatio = rawWidth / rawHeight;

        // TABLA OFICIAL DE RESOLUCIONES OPTIMAS BASE (PRESETS 1K)
        const OPTIMAL_PRESETS = [
            { name: "1:1 1K",   ratio: 1.0,     width: 1024, height: 1024 },
            { name: "16:9 1K",  ratio: 16 / 9,  width: 1280, height: 720  },
            { name: "9:16 1K",  ratio: 9 / 16,  width: 720,  height: 1280 },
            { name: "4:3 1K",   ratio: 4 / 3,   width: 1152, height: 864  },
            { name: "3:4 1K",   ratio: 3 / 4,   width: 864,  height: 1152 },
            { name: "3:2 1K",   ratio: 3 / 2,   width: 1248, height: 832  },
            { name: "2:3 1K",   ratio: 2 / 3,   width: 832,  height: 1248 },
            { name: "21:9 1K",  ratio: 21 / 9,  width: 1344, height: 576  }
        ];
        let bestPreset = OPTIMAL_PRESETS[0];
        let minDiff = Infinity;
        OPTIMAL_PRESETS.forEach(preset => {
            const diff = Math.abs(preset.ratio - targetRatio);
            if (diff < minDiff) {
                minDiff = diff;
                bestPreset = preset;
            }
        });

        // Obtener la escala activa guardada
        let scaleFactor = parseFloat(this.state.imageScale);
        if (isNaN(scaleFactor) || scaleFactor <= 0) {
            scaleFactor = 1.0;
        }

        const baseW = bestPreset.width;
        const baseH = bestPreset.height;

        let targetW = Math.round((baseW * scaleFactor) / 64) * 64;
        let targetH = Math.round((baseH * scaleFactor) / 64) * 64;

        return { 
            originalWidth: baseW,
            originalHeight: baseH,
            width: Math.max(128, targetW), 
            height: Math.max(128, targetH) 
        };
    },
    // RECALCULA LAS DIMENSIONES DE TODAS LAS VIÑETAS DEL COMIC A LA ESCALA SELECCIONADA
    updateAllPanelDimensions(newScale) {
        const scaleSidebar = document.getElementById('comfy-image-scale');
        const scaleHeader = document.getElementById('comfy-image-scale-header');
        const activeScale = newScale || (scaleSidebar ? scaleSidebar.value : (scaleHeader ? scaleHeader.value : '1.0'));
        this.state.imageScale = activeScale;

        // Sincronizar selectores en la UI
        if (scaleSidebar) scaleSidebar.value = activeScale;
        if (scaleHeader) scaleHeader.value = activeScale;

        if (!this.state.prompts || !Array.isArray(this.state.prompts)) return;

        const formatEl = document.getElementById('comic-page-format');
        const format = formatEl ? formatEl.value : 'vertical';

        // Agrupar viñetas garantizando pagina y vineta validas
        const pagesMap = {};
        this.state.prompts.forEach((p, idx) => {
            if (p.pagina === undefined || p.pagina === null) p.pagina = 1;
            if (p.vineta === undefined || p.vineta === null) p.vineta = idx + 1;
            if (!pagesMap[p.pagina]) pagesMap[p.pagina] = [];
            pagesMap[p.pagina].push(p);
        });

        Object.keys(pagesMap).forEach(pageNumStr => {
            const pageNum = parseInt(pageNumStr, 10);
            const pagePanels = pagesMap[pageNum];
            if (pageNum === 0) {
                const dims = this.calculatePanelDimensions(format, 12, 1);
                pagePanels[0].originalWidth = dims.originalWidth;
                pagePanels[0].originalHeight = dims.originalHeight;
                pagePanels[0].width = dims.width;
                pagePanels[0].height = dims.height;
            } else {
                const layout = this.organizeAndBalancePagePanels(pagePanels);
                layout.panels.forEach((p, pIdx) => {
                    const dims = this.calculatePanelDimensions(format, p.grid_span, layout.actualRows);
                    const original = pagePanels.find(orig => orig.vineta === p.vineta) || pagePanels[pIdx];
                    if (original) {
                        original.pagina = pageNum;
                        original.vineta = p.vineta;
                        original.grid_span = p.grid_span;
                        original.originalWidth = dims.originalWidth;
                        original.originalHeight = dims.originalHeight;
                        original.width = dims.width;
                        original.height = dims.height;
                    }
                });
            }
        });

        this.autoSave();

        // Refrescar manteniendo la vista activa (Modo Ver o Gestor)
        const btnViewer = document.getElementById('btn-mode-viewer');
        if (btnViewer && btnViewer.classList.contains('active')) {
            this.renderFinalComic();
        } else {
            this.renderGenerationUI();
        }
    }
});