/* SILENOS 3/gamebook/gb-export-book.js */
window.GB_ExportBook = {
    CODE: `
        // --- UTILIDAD DE EXPORTACIÓN: LIBRO ---
        const generateBookHTML = (storyData) => {
            const shuffledScenes = [...storyData.scenes];
            // Barajar para que no sean secuenciales
            for (let i = shuffledScenes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledScenes[i], shuffledScenes[j]] = [shuffledScenes[j], shuffledScenes[i]];
            }
            const idToSectionNumber = {};
            shuffledScenes.forEach((scene, index) => { idToSectionNumber[scene.id] = index + 1; });
            const startSection = idToSectionNumber[storyData.startSceneId] || 1;
            
            return \`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>\${storyData.title} - Libro</title><style>body{font-family:'Georgia',serif;max-width:800px;margin:0 auto;padding:40px;line-height:1.6;background:#fdfbf7;color:#1a1a1a}.section{margin-bottom:60px;border-top:2px solid #eee;padding-top:30px}.section-header{font-weight:bold;font-size:1.4em;margin-bottom:20px}.choice{margin-bottom:10px;font-weight:bold}a{text-decoration:none;color:#000;border-bottom:1px dotted #000}img{max-width:100%;max-height:400px;display:block;margin:20px auto;filter:grayscale(20%) sepia(10%);border:4px solid #fff;box-shadow:0 4px 6px rgba(0,0,0,0.1)}</style></head><body><h1 style="text-align:center">\${storyData.title}</h1><div style="text-align:center;margin-bottom:60px;background:#f0eee9;padding:20px;border-radius:8px"><p>Comienza leyendo la <a href="#s\${startSection}">SECCIÓN \${startSection}</a>.</p></div>\${shuffledScenes.map((scene,i)=>{const secNum=i+1;return \`<div class="section" id="s\${secNum}"><div class="section-header">SECCIÓN \${secNum}</div>\${scene.image?\`<img src="\${scene.image}"/>\`:''}<div class="section-content">\${scene.text?scene.text.replace(/\\n/g,'<br>'):'<p><em>(Sin texto)</em></p>'}</div><div style="margin-top:20px;padding-left:20px;">\${scene.choices&&scene.choices.length>0?scene.choices.map(c=>{const t=idToSectionNumber[c.targetId];return \`<div class="choice">• Si decides \${c.text}, pasa a la <a href="#s\${t}">SECCIÓN \${t}</a>.</div>\`}).join(''):'<div style="text-align:center;margin-top:30px">★ FIN ★</div>'}</div></div>\`}).join('')}</body></html>\`;
        };
    `
};