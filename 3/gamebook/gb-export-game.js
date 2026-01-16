/* SILENOS 3/gamebook/gb-export-game.js */
window.GB_ExportGame = {
    CODE: `
        // --- UTILIDAD DE EXPORTACIÓN: JUEGO INTERACTIVO ---
        const generateExportHTML = (storyData) => {
            const cleanScenes = storyData.scenes.map(({ x, y, ...keepAttrs }) => keepAttrs);
            const cleanStoryData = { ...storyData, scenes: cleanScenes };
            const jsonString = JSON.stringify(cleanStoryData).replace(/<\\/script>/g, '<\\\\/script>');
            
            // NOTA IMPORTANTE: Usamos triple backslash (\\\`) para escapar los backticks dentro del string generado
            return \`<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>\${storyData.title}</title><script src="https://cdn.tailwindcss.com"><\\/script><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=Merriweather:wght@300;400;700&display=swap');body{font-family:'Inter',sans-serif}.prose-text{font-family:'Merriweather',serif}.fade-in{animation:fadeIn 0.5s ease-in-out}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}</style></head>
<body class="bg-slate-900 text-slate-200 min-h-screen flex flex-col items-center justify-center p-4"><div id="game-container" class="max-w-2xl w-full bg-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700 fade-in"></div><script>const story=\${jsonString};let currentSceneId=story.startSceneId||story.scenes[0].id;const container=document.getElementById('game-container');function renderScene(id){const scene=story.scenes.find(s=>s.id===id);if(!scene)return alert('Error: Escena '+id);let html='';if(scene.image)html+=\\\`<div class="w-full h-64 overflow-hidden relative"><img src="\${scene.image}" class="w-full h-full object-cover"><div class="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent"></div></div>\\\`;html+=\\\`<div class="p-8"><p class="prose-text text-lg leading-relaxed text-slate-300 mb-8 whitespace-pre-line">\${scene.text}</p><div class="space-y-3">\\\`;if(scene.choices&&scene.choices.length>0){scene.choices.forEach(c=>{html+=\\\`<button onclick="renderScene('\${c.targetId}')" class="w-full text-left px-6 py-4 bg-slate-700 hover:bg-indigo-600 transition-colors rounded-lg border border-slate-600 text-white font-medium flex items-center justify-between group"><span>\${c.text}</span><span class="opacity-0 group-hover:opacity-100 transition-opacity">→</span></button>\\\`})}else{html+=\\\`<div class="text-center mt-8 p-4 border border-slate-700 rounded bg-slate-700/50"><span class="text-slate-400">Fin</span><button onclick="location.reload()" class="block w-full mt-4 text-indigo-400 hover:text-indigo-300">Reiniciar</button></div>\\\`}html+=\\\`</div></div>\\\`;container.innerHTML=html;container.classList.remove('fade-in');void container.offsetWidth;container.classList.add('fade-in');window.scrollTo(0,0)}renderScene(currentSceneId);<\\/script></body></html>\`;
        };
    `
};