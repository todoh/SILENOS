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

    // [NUEVO] Función para descargar archivos HTML
    downloadHTML(item) {
        let filename = item.title;
        // Asegurar extensión .html
        if (!filename.toLowerCase().endsWith('.html')) {
            filename += '.html';
        }
        this.downloadBlob(item.content, filename, 'text/html');
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

    downloadBookDoc(item) {
        let html = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${item.title}</title></head>
            <body><h1>${item.title}</h1>
        `;
        const chapters = item.content.chapters || [];
        chapters.forEach(chap => {
            html += `<h2>${chap.title}</h2>`;
            chap.paragraphs.forEach(p => html += `<p>${p}</p>`);
            html += `<br/>`;
        });
        html += `</body></html>`;
        this.downloadBlob(html, `${item.title}.doc`, 'application/msword');
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
            chap.paragraphs.forEach(p => html += `<p>${p}</p>`);
        });
        html += `<script>window.onload = function() { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
    }
};