// --- storyboard_adv.export.js ---
// MÓDULO DE EXPORTACIÓN HTML PARA SILENOS STORYBOARD

const StoryboardExport = {
    
    // Función principal para descargar el archivo
    downloadHTML(scenes) {
        if (!scenes || scenes.length === 0) {
            alert("No hay escenas para exportar.");
            return;
        }

        const htmlContent = this.generateHTMLStructure(scenes);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `silenos-storyboard-${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Generador de la estructura HTML
    generateHTMLStructure(scenes) {
        // Preparamos los datos para inyectar en el script del HTML generado
        const scenesJson = JSON.stringify(scenes).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Silenos Storyboard Export</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: { extend: { colors: { dark: '#050505', panel: '#1a1a1c' } } }
        }
    </script>
    <style>
        body { background-color: #050505; color: #e5e7eb; }
        .glass { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
        .btn-action { @apply px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-white/10 hover:bg-white/10 active:scale-95 flex items-center gap-2; }
    </style>
</head>
<body class="min-h-screen p-8 font-sans">
    
    <header class="max-w-6xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-white/10">
        <div>
            <h1 class="text-3xl font-light tracking-tight text-white mb-2">SILENOS <span class="text-purple-500 font-bold">STORYBOARD</span></h1>
            <p class="text-gray-400 text-sm">Archivo de exportación autónomo • ${scenes.length} Escenas</p>
        </div>
        
        <div class="flex flex-wrap gap-3">
            <button onclick="downloadAllImages()" class="btn-action bg-purple-600/20 text-purple-400 border-purple-500/50 hover:bg-purple-600/40">
                <i class="fa-solid fa-download"></i> Descargar Todo (Imágenes)
            </button>
            <button onclick="copyAllPrompts()" class="btn-action bg-white/5 text-gray-300">
                <i class="fa-solid fa-copy"></i> Copiar Todos Prompts
            </button>
            <button onclick="copyAllNarratives()" class="btn-action bg-white/5 text-gray-300">
                <i class="fa-solid fa-book-open"></i> Copiar Guion
            </button>
        </div>
    </header>

    <main class="max-w-6xl mx-auto flex flex-col gap-12" id="gallery">
        ${scenes.map((scene, index) => `
        <article class="glass rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl group">
            <div class="w-full md:w-1/2 relative bg-black/50 border-r border-white/5 min-h-[300px]">
                <img src="${scene.image64}" class="w-full h-full object-contain scene-img" data-filename="scene-${index+1}.png">
                <div class="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded text-xs font-mono border border-white/10 text-white">
                    ESCENA ${index + 1}
                </div>
            </div>
            
            <div class="w-full md:w-1/2 p-8 flex flex-col">
                <div class="mb-6">
                    <h3 class="text-xs text-purple-400 font-bold uppercase tracking-widest mb-2">Narrativa</h3>
                    <p class="text-lg text-gray-200 font-serif italic leading-relaxed border-l-2 border-purple-500/30 pl-4 narrative-text">${scene.narrative_desc}</p>
                </div>

                <div class="mb-8">
                    <h3 class="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Prompt Visual</h3>
                    <div class="bg-black/40 rounded-lg p-3 border border-white/5 text-xs font-mono text-gray-400 relative group-hover:border-white/20 transition-colors">
                        <p class="prompt-text">${scene.visual_prompt}</p>
                    </div>
                </div>

                <div class="mt-auto flex gap-3 pt-6 border-t border-white/5">
                    <button onclick="downloadSingle('${index}')" class="flex-1 btn-action justify-center bg-white/5 hover:bg-white/10 text-white">
                        <i class="fa-solid fa-download"></i> Imagen
                    </button>
                    <button onclick="copyText('${scene.visual_prompt.replace(/'/g, "\\'")}')" class="flex-1 btn-action justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white">
                        <i class="fa-solid fa-terminal"></i> Prompt
                    </button>
                </div>
            </div>
        </article>
        `).join('')}
    </main>

    <footer class="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-xs text-gray-600 uppercase tracking-widest">
        Generado con Silenos x Pollination AI
    </footer>

    <script>
        // Datos embebidos
        const scenesData = ${scenesJson};

        function downloadSingle(index) {
            const img = document.querySelectorAll('.scene-img')[index];
            const link = document.createElement('a');
            link.href = img.src;
            link.download = \`silenos_scene_\${parseInt(index)+1}.png\`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        async function downloadAllImages() {
            const imgs = document.querySelectorAll('.scene-img');
            let delay = 0;
            
            if(!confirm("Esto intentará descargar " + imgs.length + " imágenes. Permite las descargas múltiples si tu navegador lo pide.")) return;

            imgs.forEach((img, i) => {
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = img.src;
                    link.download = \`silenos_scene_\${i+1}.png\`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, delay);
                delay += 300; // Retardo para evitar bloqueo del navegador
            });
        }

        function copyText(text) {
            navigator.clipboard.writeText(text).then(() => alert('Copiado al portapapeles'));
        }

        function copyAllPrompts() {
            // DOBLE SALTO DE LÍNEA como solicitado
            const allPrompts = scenesData.map(s => s.visual_prompt).join('\\n\\n');
            navigator.clipboard.writeText(allPrompts).then(() => alert('Todos los prompts copiados (separados por doble línea).'));
        }

        function copyAllNarratives() {
            const allText = scenesData.map(s => s.narrative_desc).join('\\n');
            navigator.clipboard.writeText(allText).then(() => alert('Guion completo copiado.'));
        }
    </script>
</body>
</html>`;
    }
};