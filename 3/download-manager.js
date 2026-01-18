/* SILENOS 3/download-manager.js */
// T -> Tramo funcional de descargas

const DownloadManager = {
    downloadBlob(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    downloadJSON(item) {
        const jsonStr = JSON.stringify(item, null, 2);
        this.downloadBlob(jsonStr, `${item.title.replace(/\s+/g, '_')}.json`, 'application/json');
    },

    // Función genérica para descargar archivos HTML planos
    downloadHTML(item) {
        let filename = item.title;
        // Asegurar extensión .html
        if (!filename.toLowerCase().endsWith('.html')) {
            filename += '.html';
        }
        this.downloadBlob(item.content, filename, 'text/html');
    },

    // [NUEVO] Función específica para generar un sitio web del libro con navegación
    downloadBookWeb(item) {
        const chapters = item.content.chapters || [];
        
        let menuItems = '';
        let contentHtml = '';
        
        chapters.forEach((chap, idx) => {
            const safeId = `chap-${idx}`;
            // Item del menú
            menuItems += `<li><a href="#${safeId}" onclick="closeMenu()">${chap.title}</a></li>`;
            
            // Contenido del capítulo
            contentHtml += `<section id="${safeId}" class="chapter">`;
            contentHtml += `<h2>${chap.title}</h2>`;
            chap.paragraphs.forEach(p => {
                if(p.trim()) contentHtml += `<p>${p.replace(/\n/g, '<br>')}</p>`;
            });
            contentHtml += `</section><hr class="chapter-divider">`;
        });

        const htmlStructure = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.title}</title>
    <style>
        :root { --bg-color: #fdfbf7; --text-color: #2c3e50; --accent: #d35400; --sidebar-w: 280px; }
        body { margin: 0; padding: 0; font-family: 'Georgia', 'Times New Roman', serif; background: var(--bg-color); color: var(--text-color); line-height: 1.8; }
        
        /* Header Flotante */
        .top-bar { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: white; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; padding: 0 20px; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .toggle-btn { background: #333; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-family: sans-serif; font-size: 14px; font-weight: bold; transition: background 0.2s; }
        .toggle-btn:hover { background: #555; }
        .book-header-title { margin-left: 20px; font-family: sans-serif; font-weight: 600; font-size: 1.1rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        /* Menú Lateral (Índice) */
        .sidebar { position: fixed; top: 60px; left: -100%; width: var(--sidebar-w); bottom: 0; background: white; border-right: 1px solid #ddd; transition: left 0.3s ease; overflow-y: auto; z-index: 999; padding: 20px; box-sizing: border-box; box-shadow: 4px 0 15px rgba(0,0,0,0.05); }
        .sidebar.active { left: 0; }
        .sidebar h3 { margin-top: 0; font-family: sans-serif; font-size: 1.2rem; border-bottom: 2px solid var(--accent); padding-bottom: 10px; }
        .sidebar ul { list-style: none; padding: 0; }
        .sidebar li { margin-bottom: 8px; }
        .sidebar a { text-decoration: none; color: #555; font-family: sans-serif; font-size: 0.95rem; display: block; padding: 5px 10px; border-radius: 4px; transition: background 0.2s; }
        .sidebar a:hover { background: #f0f0f0; color: var(--accent); }

        /* Contenido Principal */
        .main-content { max-width: 800px; margin: 0 auto; padding: 100px 20px 60px 20px; }
        h1.main-title { text-align: center; font-size: 3rem; margin-bottom: 60px; color: #1a1a1a; }
        .chapter h2 { color: var(--accent); margin-top: 60px; font-size: 2rem; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .chapter p { font-size: 1.2rem; margin-bottom: 1.5em; text-align: justify; }
        .chapter-divider { border: 0; height: 1px; background: #e0e0e0; margin: 80px auto; width: 50%; }

        @media (max-width: 768px) {
            .main-content { padding-top: 80px; }
            h1.main-title { font-size: 2rem; }
            .chapter p { font-size: 1.1rem; }
        }
    </style>
</head>
<body>

    <div class="top-bar">
        <button class="toggle-btn" onclick="toggleMenu()">☰ Índice de Capítulos</button>
        <span class="book-header-title">${item.title}</span>
    </div>

    <nav id="sidebar" class="sidebar">
        <h3>Tabla de Contenidos</h3>
        <ul>
            ${menuItems}
        </ul>
    </nav>

    <main class="main-content" onclick="clickOutside(event)">
        <h1 class="main-title">${item.title}</h1>
        ${contentHtml}
    </main>

    <script>
        const sidebar = document.getElementById('sidebar');
        
        function toggleMenu() {
            sidebar.classList.toggle('active');
        }

        function closeMenu() {
            sidebar.classList.remove('active');
        }

        function clickOutside(e) {
            // Si el menú está abierto y clicamos fuera, cerrar
            if(window.innerWidth > 768) return; // En desktop quizás queremos mantenerlo
            if(sidebar.classList.contains('active')) {
                closeMenu();
            }
        }
    </script>
</body>
</html>
        `;

        this.downloadBlob(htmlStructure, `${item.title}_web.html`, 'text/html');
    },

    downloadFolderRecursive(folder) {
        FileSystem.init();
        const allItems = [];
        const processedIds = new Set();
        
        const collect = (itemId) => {
            if (processedIds.has(itemId)) return;
            processedIds.add(itemId);
            const item = FileSystem.getItem(itemId);
            if (!item) return;
            allItems.push(JSON.parse(JSON.stringify(item)));
            if (item.type === 'folder') {
                const children = FileSystem.getItems(itemId);
                children.forEach(child => collect(child.id));
            }
        };

        collect(folder.id);
        const jsonStr = JSON.stringify(allItems, null, 2);
        const fileName = `PACK_${folder.title.replace(/\s+/g, '_')}.json`;
        this.downloadBlob(jsonStr, fileName, 'application/json');
    },

    downloadNarrativeTxt(item) {
        const content = item.content || {};
        const text = `TÍTULO: ${item.title}\nETIQUETA: ${content.tag || ''}\n\n${content.text || ''}`;
        this.downloadBlob(text, `${item.title}.txt`, 'text/plain');
    },

    downloadBookTxt(item) {
        let text = `LIBRO: ${item.title}\n====================\n\n`;
        const chapters = item.content.chapters || [];
        chapters.forEach(chap => {
            text += `### ${chap.title}\n\n`;
            chap.paragraphs.forEach(p => text += `${p}\n\n`);
            text += `--------------------\n\n`;
        });
        this.downloadBlob(text, `${item.title}.txt`, 'text/plain');
    },

    // =========================================================
    // NUEVAS FUNCIONES DE SOPORTE PARA DOC CON IMÁGENES
    // =========================================================

    extractSrc(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString;
        const img = div.querySelector('img');
        return img ? img.src : null;
    },

    convertSvgToPng(svgDataUri) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = function() {
                const canvas = document.createElement('canvas');
                // Configuración de calidad
                const scale = 2; 
                const width = (img.width || 800) * scale;
                const height = (img.height || 600) * scale;

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.fillStyle = "#FFFFFF"; // Fondo blanco para Word
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                try {
                    resolve(canvas.toDataURL('image/png'));
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = function(e) {
                console.warn("Error cargando imagen SVG para DOC, usando original...", e);
                resolve(svgDataUri);
            };
            img.src = svgDataUri;
        });
    },

    async downloadBookDoc(item) {
        // Configuración para el documento Word
        const DOC_CONFIG = {
            fontSize: '11pt',
            fontFamily: "'Times New Roman', serif",
            imageWidth: 600
        };

        let htmlBody = "";
        
        // Título del libro
        if (item.title) {
            htmlBody += `<h1 style="font-size:24pt; text-align:center; margin-bottom:40px;">${item.title}</h1>`;
        }

        const chapters = item.content.chapters || [];
        
        // Iterar sobre capítulos
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            
            // Salto de página antes de cada capítulo (excepto el primero si se desea, o siempre)
            if (i > 0) {
                htmlBody += `<br style="page-break-before:always;">`;
            }

            if (chapter.title) {
                htmlBody += `<h2 style="font-size:16pt; margin-top:30px; margin-bottom:15px; color:#2c3e50;">${chapter.title}</h2>`;
            }

            if (Array.isArray(chapter.paragraphs)) {
                for (const paragraph of chapter.paragraphs) {
                    if (typeof paragraph === 'string') {
                        // Detectar imágenes SVG/Base64
                        if (paragraph.trim().startsWith('<img') && (paragraph.includes('data:image') || paragraph.includes('src='))) {
                            const imgSrc = this.extractSrc(paragraph);
                            if (imgSrc) {
                                let finalSrc = imgSrc;
                                // Convertir SVGs a PNG para Word
                                if (imgSrc.includes('image/svg+xml')) {
                                    try {
                                        finalSrc = await this.convertSvgToPng(imgSrc);
                                    } catch (e) {
                                        console.error("Fallo conversión SVG->PNG", e);
                                    }
                                }
                                
                                htmlBody += `<p style="text-align:center; margin: 20px 0;">
                                    <img src="${finalSrc}" width="${DOC_CONFIG.imageWidth}" style="width:${DOC_CONFIG.imageWidth}px; height:auto;">
                                </p>`;
                            }
                        } else {
                            // Texto normal - Procesar negritas Markdown **texto**
                            let processedText = paragraph.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                            // Reemplazar saltos de línea por <br>
                            processedText = processedText.replace(/\n/g, '<br>');
                            
                            htmlBody += `<p style="font-size:${DOC_CONFIG.fontSize}; text-align:justify; line-height:1.5; margin-bottom:10px;">${processedText}</p>`;
                        }
                    }
                }
            }
        }

        const docContent = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset="utf-8">
                <title>${item.title || 'Documento'}</title>
                <style>
                    body { font-family: ${DOC_CONFIG.fontFamily}; }
                    p { mso-style-name:"Normal"; margin-bottom: 10pt; }
                    @page Section1 {
                        size: 595.35pt 841.99pt; 
                        margin: 70.85pt;
                        mso-header-margin: 35.4pt;
                        mso-footer-margin: 35.4pt;
                        mso-paper-source: 0;
                    }
                    div.Section1 { page: Section1; }
                </style>
            </head>
            <body>
                <div class="Section1">
                    ${htmlBody}
                </div>
            </body>
            </html>
        `;

        this.downloadBlob(docContent, `${item.title}.doc`, 'application/msword');
    },

    downloadBookPdf(item) {
        const printWindow = window.open('', '_blank');
        let html = `
            <html>
            <head>
                <title>${item.title}</title>
                <style>
                    body { font-family: 'Georgia', serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; color: #1a202c; }
                    h1 { text-align: center; border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 40px; }
                    h2 { margin-top: 50px; color: #2d3748; page-break-before: always; }
                    h2:first-of-type { page-break-before: auto; }
                    p { margin-bottom: 15px; text-align: justify; }
                    @media print { body { padding: 0; margin: 20mm; } button { display: none; } }
                </style>
            </head>
            <body><h1>${item.title}</h1>
        `;
        const chapters = item.content.chapters || [];
        chapters.forEach(chap => {
            html += `<h2>${chap.title}</h2>`;
            chap.paragraphs.forEach(p => html += `<p>${p.replace(/\n/g, '<br>')}</p>`);
        });
        html += `<script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    }
};