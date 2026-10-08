/**
 * SAGA Comic Builder - Módulo de Exportación DOCX DinA5 para Amazon KDP
 * Recorta físicamente las imágenes de las viñetas para emular 'object-fit: cover'
 * exactamente como en el Modo Visualización antes de pasar por html2canvas.
 */
const SagaDocx = {
    A5_WIDTH_TWIPS: 8391,
    A5_HEIGHT_TWIPS: 11906,

    MAX_A5_WIDTH_PX: 559,
    MAX_A5_HEIGHT_PX: 794,

    async getDocxLibrary() {
        if (window.docx) return window.docx;
        return new Promise((resolve, reject) => {
            const cdnUrls = [
                "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js",
                "https://unpkg.com/docx@8.5.0/build/index.umd.js"
            ];
            let attempt = 0;
            const tryLoad = () => {
                if (attempt >= cdnUrls.length) {
                    reject(new Error("La librería 'docx.js' no está cargada. Por favor verifica tu conexión a Internet o reintenta."));
                    return;
                }
                const url = cdnUrls[attempt++];
                const script = document.createElement("script");
                script.src = url;
                script.onload = () => {
                    if (window.docx) resolve(window.docx);
                    else tryLoad();
                };
                script.onerror = () => tryLoad();
                document.head.appendChild(script);
            };
            tryLoad();
        });
    },

    /**
     * Recorta una imagen en un Canvas según las dimensiones exactas de su contenedor
     * aplicando la lógica de object-fit: cover para evitar cualquier deformación.
     */
    cropImageToCover(imgEl, containerWidth, containerHeight) {
        if (!imgEl.complete || imgEl.naturalWidth === 0 || containerWidth === 0 || containerHeight === 0) {
            return;
        }

        const imgWidth = imgEl.naturalWidth;
        const imgHeight = imgEl.naturalHeight;

        const containerRatio = containerWidth / containerHeight;
        const imgRatio = imgWidth / imgHeight;

        let renderW, renderH, offsetX, offsetY;

        if (imgRatio > containerRatio) {
            renderH = imgHeight;
            renderW = imgHeight * containerRatio;
            offsetX = (imgWidth - renderW) / 2;
            offsetY = 0;
        } else {
            renderW = imgWidth;
            renderH = imgWidth / containerRatio;
            offsetX = 0;
            offsetY = (imgHeight - renderH) / 2;
        }

        const canvas = document.createElement('canvas');
        canvas.width = containerWidth * 2; // Alta resolución (2x)
        canvas.height = containerHeight * 2;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
            imgEl,
            offsetX, offsetY, renderW, renderH,
            0, 0, canvas.width, canvas.height
        );

        imgEl.src = canvas.toDataURL('image/png');
        imgEl.style.objectFit = 'fill'; // Ya recortada físicamente, no se deformará
    },

    async exportComicToDocxA5(options = {}) {
        let docxLib;
        try {
            docxLib = await this.getDocxLibrary();
        } catch (err) {
            alert(err.message);
            return;
        }
        const {
            Document,
            Packer,
            Paragraph,
            ImageRun,
            AlignmentType
        } = docxLib;

        if (window.ComicPipeline && typeof ComicPipeline.renderFinalComic === 'function') {
            ComicPipeline.renderFinalComic();
            await new Promise(r => setTimeout(r, 200));
        }

        const pages = document.querySelectorAll('.comic-page');
        if (pages.length === 0) {
            alert("No hay páginas renderizadas para exportar. Pasa primero a la vista previa del cómic en el 'Modo Ver'.");
            return;
        }

        const btnExport = document.getElementById('btn-export-docx');
        const origText = btnExport ? btnExport.innerHTML : '';
        if (btnExport) {
            btnExport.innerHTML = '⌛ Maquetando A5 para KDP...';
            btnExport.disabled = true;
        }

        const savedMode = window.ComicPipeline?.comicLayoutMode || 'pdf';
        const savedZoom = window.ComicPipeline?.zoomLevel || 1.0;

        try {
            if (window.ComicPipeline) {
                ComicPipeline.setComicLayoutMode('pdf');
                ComicPipeline.setZoom(0);
            }
            await new Promise(r => setTimeout(r, 300));

            const targetPages = document.querySelectorAll('.comic-page');
            const sectionsChildren = [];

            for (let i = 0; i < targetPages.length; i++) {
                const pageEl = targetPages[i];
                const isHorizontal = pageEl.classList.contains('format-horizontal');
                const isCuadrado = pageEl.classList.contains('format-cuadrado');

                let targetWidth = 850;
                if (isHorizontal) targetWidth = 1100;
                if (isCuadrado) targetWidth = 850;

                if (btnExport) {
                    btnExport.innerHTML = `⌛ Procesando imágenes Pág ${i + 1}/${targetPages.length}...`;
                }

                const canvas = await html2canvas(pageEl, {
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    windowWidth: targetWidth + 100,
                    onclone: (clonedDoc) => {
                        const clonedPage = clonedDoc.getElementById(pageEl.id) || clonedDoc.querySelectorAll('.comic-page')[i];
                        if (clonedPage) {
                            clonedPage.style.width = `${targetWidth}px`;
                            clonedPage.style.maxWidth = 'none';
                            clonedPage.style.transform = 'none';
                            clonedPage.style.margin = '0 auto';
                            clonedPage.style.boxSizing = 'border-box';

                            // FORZAR RECORTE REAL EN CADA VIÑETA PARA ARREGLAR EL OBJECT-FIT DE HTML2CANVAS
                            const panelBoxes = clonedPage.querySelectorAll('.comic-panel-box, .comic-cover-box');
                            panelBoxes.forEach(box => {
                                const img = box.querySelector('img');
                                if (img) {
                                    const rect = box.getBoundingClientRect();
                                    const boxW = rect.width || box.clientWidth;
                                    const boxH = rect.height || box.clientHeight;

                                    if (boxW > 0 && boxH > 0) {
                                        this.cropImageToCover(img, boxW, boxH);
                                    }
                                }
                            });

                            const textNodes = clonedPage.querySelectorAll('.speech-bubble, .narrative-cartouche, .cover-title-overlay');
                            textNodes.forEach(el => {
                                el.style.webkitFontSmoothing = 'antialiased';
                                el.style.textRendering = 'optimizeLegibility';
                                el.style.wordBreak = 'break-word';
                                el.style.overflowWrap = 'break-word';
                                el.style.boxSizing = 'border-box';
                                el.style.lineHeight = '1.3';
                            });
                        }
                    }
                });

                const canvasRatio = canvas.width / canvas.height;

                let docxWidth = this.MAX_A5_WIDTH_PX;
                let docxHeight = Math.round(this.MAX_A5_WIDTH_PX / canvasRatio);

                if (docxHeight > this.MAX_A5_HEIGHT_PX) {
                    docxHeight = this.MAX_A5_HEIGHT_PX;
                    docxWidth = Math.round(this.MAX_A5_HEIGHT_PX * canvasRatio);
                }

                const rawPngDataUrl = canvas.toDataURL('image/png', 1.0);

                if (btnExport) {
                    btnExport.innerHTML = `⌛ Comprimiendo Pág ${i + 1}/${targetPages.length}...`;
                }

                const compressedDataUrl = window.ImageCompressor 
                    ? await window.ImageCompressor.compressDataURL(rawPngDataUrl, {
                        maxWidth: 1650,
                        maxHeight: 2340,
                        quality: 0.88,
                        mimeType: 'image/jpeg'
                    })
                    : rawPngDataUrl;

                const imageBuffer = window.ImageCompressor
                    ? window.ImageCompressor.dataURLToUint8Array(compressedDataUrl)
                    : this.dataURLToUint8Array(compressedDataUrl);

                if (imageBuffer) {
                    sectionsChildren.push(
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            pageBreakBefore: i > 0,
                            spacing: { before: 0, after: 0, line: 240 },
                            children: [
                                new ImageRun({
                                    data: imageBuffer,
                                    transformation: {
                                        width: docxWidth,
                                        height: docxHeight
                                    }
                                })
                            ]
                        })
                    );
                }

                await new Promise(r => setTimeout(r, 100));
            }

            if (btnExport) {
                btnExport.innerHTML = '⌛ Generando archivo DOCX...';
            }

            const doc = new Document({
                title: window.ComicPipeline?.state?.comicCoverTitle || "SAGA Comic DinA5",
                description: "Cómic maquetado con viñetas recortadas sin deformar para Amazon KDP",
                sections: [
                    {
                        properties: {
                            page: {
                                size: {
                                    width: this.A5_WIDTH_TWIPS,
                                    height: this.A5_HEIGHT_TWIPS
                                },
                                margin: {
                                    top: 0,
                                    bottom: 0,
                                    left: 0,
                                    right: 0
                                }
                            }
                        },
                        children: sectionsChildren
                    }
                ]
            });

            const blob = await Packer.toBlob(doc);
            const coverTitle = (window.ComicPipeline?.state?.comicCoverTitle || "SAGA_Comic")
                .replace(/[^a-zA-Z0-9_-]/g, "_");
            const filename = `${coverTitle}_DinA5_KDP.docx`;

            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);

            if (window.ComicPipeline && window.ComicPipeline.dirHandle) {
                try {
                    const fileHandle = await window.ComicPipeline.dirHandle.getFileHandle(filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                } catch (e) {
                    console.warn("[DOCX] No se pudo guardar en carpeta:", e);
                }
            }

            alert("¡Cómic exportado a DOCX corregido! Las imágenes de las viñetas ya no se deformarán.");
        } catch (err) {
            console.error("Error al exportar a DOCX DinA5:", err);
            alert("Hubo un error al generar el archivo DOCX: " + err.message);
        } finally {
            if (window.ComicPipeline) {
                ComicPipeline.setComicLayoutMode(savedMode);
                if (savedZoom !== 1.0) {
                    ComicPipeline.zoomLevel = savedZoom;
                    const container = document.getElementById('pages-container');
                    const badge = document.getElementById('zoom-percentage');
                    if (container) container.style.transform = `scale(${ComicPipeline.zoomLevel})`;
                    if (badge) badge.innerText = `${Math.round(ComicPipeline.zoomLevel * 100)}%`;
                }
            }
            if (btnExport) {
                btnExport.innerHTML = origText;
                btnExport.disabled = false;
            }
        }
    },

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

window.SagaDocx = SagaDocx;

function attachSagaDocxToPipeline() {
    if (window.ComicPipeline) {
        window.ComicPipeline.exportComicToDocxA5 = function(options) {
            return SagaDocx.exportComicToDocxA5(options);
        };
    }
}
attachSagaDocxToPipeline();
document.addEventListener("DOMContentLoaded", attachSagaDocxToPipeline);