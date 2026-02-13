
// --- BOOK-STUDIO-EXPORT.JS (HTML GENERATOR) ---

window.BookExporter = {

    async generate(data, originalName) {
        const title = originalName.replace('.json', '');
        
        // Construimos el HTML
        let html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Montserrat:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #fdfbf7; --text: #2c2c2c; --accent: #8b0000; }
        body { background-color: var(--bg); color: var(--text); font-family: 'Merriweather', serif; margin: 0; padding: 0; line-height: 1.9; }
        
        /* Sidebar Navigation */
        .sidebar { position: fixed; left: 0; top: 0; height: 100vh; width: 250px; background: #fff; border-right: 1px solid #eee; overflow-y: auto; padding: 40px 20px; font-family: 'Montserrat', sans-serif; transition: transform 0.3s; z-index: 100; }
        .sidebar h1 { font-size: 1.2rem; margin-bottom: 30px; letter-spacing: -0.05em; text-transform: uppercase; font-weight: 600; }
        .toc-link { display: block; text-decoration: none; color: #888; font-size: 0.85rem; padding: 8px 0; border-bottom: 1px solid transparent; transition: all 0.2s; cursor: pointer; }
        .toc-link:hover, .toc-link.active { color: var(--accent); padding-left: 10px; border-bottom-color: #eee; }
        
        /* Main Content */
        .main { margin-left: 250px; padding: 80px 10%; max-width: 900px; }
        
        .chapter { margin-bottom: 100px; opacity: 0; transform: translateY(20px); animation: fadeInUp 0.8s forwards; }
        .chapter-title { font-family: 'Montserrat', sans-serif; font-size: 2.5rem; font-weight: 300; margin-bottom: 40px; color: #000; letter-spacing: -0.05em; border-bottom: 2px solid var(--accent); padding-bottom: 20px; display: inline-block; }
        .chapter-content p { margin-bottom: 1.5em; font-size: 1.1rem; text-align: justify; }
        .drop-cap { float: left; font-size: 3.5rem; line-height: 0.8; padding-top: 4px; padding-right: 8px; font-weight: 700; color: var(--accent); }

        /* Mobile */
        @media (max-width: 768px) {
            .sidebar { transform: translateX(-100%); width: 80%; box-shadow: 2px 0 10px rgba(0,0,0,0.1); }
            .sidebar.open { transform: translateX(0); }
            .main { margin-left: 0; padding: 40px 20px; }
            .menu-toggle { position: fixed; top: 20px; right: 20px; z-index: 200; background: var(--accent); color: white; border: none; padding: 10px; border-radius: 50%; cursor: pointer; display: block; }
        }
        .menu-toggle { display: none; }
        
        @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <button class="menu-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰</button>
    
    <nav class="sidebar">
        <h1>${title}</h1>
        <div id="toc">
            </div>
    </nav>

    <div class="main">
`;

        // Iterar capítulos
        data.forEach((block, i) => {
            if (!block.content.trim()) return;
            
            const safeId = 'chap-' + i;
            const paragraphs = block.content.split('\n\n').filter(p => p.trim());
            
            // Primer párrafo con Drop Cap (Letra capital)
            let htmlContent = '';
            paragraphs.forEach((p, idx) => {
                if (idx === 0) {
                    const firstLetter = p.charAt(0);
                    const rest = p.slice(1);
                    htmlContent += `<p><span class="drop-cap">${firstLetter}</span>${rest}</p>`;
                } else {
                    htmlContent += `<p>${p}</p>`;
                }
            });

            html += `
        <article id="${safeId}" class="chapter">
            <h2 class="chapter-title">${block.section || 'Sin Título'}</h2>
            <div class="chapter-content">
                ${htmlContent}
            </div>
        </article>`;
        });

        html += `
    </div>
    <script>
        // Auto-generate TOC links active state
        const toc = document.getElementById('toc');
        const articles = document.querySelectorAll('article');
        
        articles.forEach(art => {
            const id = art.id;
            const title = art.querySelector('h2').innerText;
            const link = document.createElement('a');
            link.className = 'toc-link';
            link.innerText = title;
            link.href = '#' + id;
            link.onclick = () => { if(window.innerWidth < 768) document.querySelector('.sidebar').classList.remove('open'); };
            toc.appendChild(link);
        });
    </script>
</body>
</html>`;

        // Guardar el archivo HTML generado
        try {
            const newName = title + '_EXPORT.html';
            // Escribir en la misma carpeta que el JSON (usamos el padre del archivo actual si es posible, 
            // pero Actions.js no guarda el dirHandle. Usamos window.currentHandle como fallback o pedimos guardar)
            
            // Mejor opción: Guardar en el directorio actual montado
            if (typeof writeFileToSystem === 'function') {
                await writeFileToSystem(newName, html, false);
                if (typeof showToast === 'function') showToast("EXPORTADO: " + newName);
            } else {
                console.error("No se encuentra función de escritura global.");
            }
        } catch (e) {
            console.error("Export error", e);
            alert("Error al exportar");
        }
    }
};
