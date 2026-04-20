// Archivo: Librojuego/app.exporter.js

window.Exporter = {
    async getBase64Image(filename) {
        if (!Core.targetHandle) return null;
        try {
            const fileHandle = await Core.targetHandle.getFileHandle(filename);
            const file = await fileHandle.getFile();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        } catch (e) {
            console.warn(`No se pudo cargar el archivo local para exportar: ${filename}`);
            return null;
        }
    },

    formatPrintableChoice(c) {
        let result = c.text;
        if (c.cond && c.cond.type) {
            let req = "";
            if (c.cond.type === 'item') {
                req = c.cond.op === 'HAS' ? `Tener el objeto: ${c.cond.val}` : `No tener el objeto: ${c.cond.val}`;
            } else {
                let opMap = {'>': 'más de', '<': 'menos de', '==': 'exactamente'};
                req = `Tener ${opMap[c.cond.op] || c.cond.op} ${c.cond.val} de ${c.cond.type.charAt(0).toUpperCase() + c.cond.type.slice(1)}`;
            }
            result = `[Requisito: ${req}] ` + result;
        }
        if (c.eff && c.eff.type) {
            let eff = "";
            if (c.eff.type === 'item') {
                eff = c.eff.op === 'ADD' ? `Consigues el objeto: ${c.eff.val}` : `Pierdes el objeto: ${c.eff.val}`;
            } else {
                let actMap = {'+': 'Ganas', '-': 'Pierdes'};
                eff = `${actMap[c.eff.op] || c.eff.op} ${c.eff.val} de ${c.eff.type.charAt(0).toUpperCase() + c.eff.type.slice(1)}`;
            }
            result += ` (Consecuencia: ${eff})`;
        }
        return result;
    },

    async exportHTML() {
        if (!Core.book || Core.book.nodes.length === 0) {
            alert("No hay nodos para exportar.");
            return;
        }

        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Generando PDF/Print (Incrustando imágenes)...");

        try {
            const startNode = Core.book.nodes[0];
            const otherNodes = Core.book.nodes.slice(1);

            for (let i = otherNodes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [otherNodes[i], otherNodes[j]] = [otherNodes[j], otherNodes[i]];
            }

            const finalNodes = [startNode, ...otherNodes];
            const idToPassage = {};
            finalNodes.forEach((n, index) => { idToPassage[n.id] = index + 1; });

            const base64Images = {};
            for (const node of finalNodes) {
                if (node.imageUrl) {
                    const b64 = await this.getBase64Image(node.imageUrl);
                    if (b64) base64Images[node.id] = b64;
                }
            }

            let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${Core.book.title} - Librojuego Imprimible</title>
    <style>
        body { font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #000; background: #fff; }
        h1 { text-align: center; font-size: 2.5em; margin-bottom: 2em; text-transform: uppercase; letter-spacing: 0.1em; }
        .passage { margin-bottom: 60px; page-break-inside: avoid; }
        .passage-number { font-size: 1.8em; font-weight: bold; margin-bottom: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .passage-image { display: block; margin: 0 auto 20px auto; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .passage-text { margin-bottom: 15px; text-align: justify; }
        .choices { list-style-type: none; padding: 0; margin-top: 25px; }
        .choices li { margin-bottom: 15px; text-align: right; font-size: 1.1em; }
        .end-game { font-weight: bold; text-align: center; text-transform: uppercase; margin-top: 30px; letter-spacing: 0.2em; border-top: 1px solid #ccc; padding-top: 20px; }
        .end-score { font-size: 0.8em; color: #555; text-transform: none; letter-spacing: normal; margin-top: 10px; display: block; }
        @media print {
            body { font-size: 12pt; padding: 0; }
            .passage { margin-bottom: 40px; }
            .passage-image { max-width: 80%; max-height: 400px; page-break-inside: avoid; box-shadow: none; border: 1px solid #ddd; }
        }
    </style>
</head>
<body>
    <h1>${Core.book.title}</h1>`;

            finalNodes.forEach(node => {
                html += `\n    <div class="passage" id="pasaje-${idToPassage[node.id]}">`;
                html += `\n        <div class="passage-number">${idToPassage[node.id]}</div>`;
                
                if (base64Images[node.id]) {
                    html += `\n        <img src="${base64Images[node.id]}" alt="Ilustración" class="passage-image">`;
                }

                const formattedText = node.text.split('\n').filter(p => p.trim()).map(p => `<p class="passage-text">${p}</p>`).join('');
                html += `\n        ${formattedText}`;

                if (node.choices && node.choices.length > 0) {
                    html += `\n        <ul class="choices">`;
                    node.choices.forEach(c => {
                        const targetPassage = idToPassage[c.targetId];
                        const textFormatted = this.formatPrintableChoice(c);
                        if (targetPassage) {
                            html += `\n            <li>${textFormatted} <br><strong>Ve al pasaje ${targetPassage}</strong></li>`;
                        } else {
                            html += `\n            <li>${textFormatted} <br><em>(Destino roto/no encontrado)</em></li>`;
                        }
                    });
                    html += `\n        </ul>`;
                } else {
                    const finalScore = node.scoreImpact || 0;
                    html += `\n        <div class="end-game">Fin de la aventura<span class="end-score">Puntuación: ${finalScore} / 100</span></div>`;
                }
                html += `\n    </div>`;
            });

            html += `\n</body>\n</html>`;

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${Core.book.title.replace(/\s+/g, '_')}_Imprimible.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch(error) {
            console.error("Error al exportar HTML:", error);
            alert("Hubo un error al exportar: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    async exportInteractiveHTML() {
        if (!Core.book || Core.book.nodes.length === 0) {
            alert("No hay nodos para exportar.");
            return;
        }

        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Empaquetando App Web Standalone (Un solo archivo)...");

        try {
            const exportData = JSON.parse(JSON.stringify(Core.book));
            let mediaAssetsHTML = '';

            for (const node of exportData.nodes) {
                delete node._cachedImageUrl;
                delete node._cachedAudioUrl;
                
                if (node.imageUrl) {
                    const b64Img = await this.getBase64Image(node.imageUrl);
                    if (b64Img) {
                        mediaAssetsHTML += `\n<script id="img_${node.id}" type="text/plain">${b64Img}</script>`;
                        node.hasImage = true;
                    }
                    delete node.imageUrl;
                }
                
                if (node.audioUrl) {
                    const b64Aud = await this.getBase64Image(node.audioUrl);
                    if (b64Aud) {
                        mediaAssetsHTML += `\n<script id="aud_${node.id}" type="text/plain">${b64Aud}</script>`;
                        node.hasAudio = true;
                    }
                    delete node.audioUrl;
                }
            }

            const gameJSON = JSON.stringify(exportData);

            const html = this.getWebPlayerTemplate(gameJSON, mediaAssetsHTML, true);

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${Core.book.title.replace(/\s+/g, '_')}_Standalone.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch(error) {
            console.error("Error al exportar Interactive HTML:", error);
            alert("Hubo un error al exportar: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    async exportForItchIo() {
        if (!Core.book || Core.book.nodes.length === 0) {
            alert("No hay nodos para exportar.");
            return;
        }

        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Generando versión optimizada para Itch.io...");

        try {
            const exportData = JSON.parse(JSON.stringify(Core.book));

            for (const node of exportData.nodes) {
                delete node._cachedImageUrl;
                delete node._cachedAudioUrl;
                if (node.imageUrl) node.hasImage = true;
                if (node.audioUrl) node.hasAudio = true;
            }

            const gameJSON = JSON.stringify(exportData);
            const html = this.getWebPlayerTemplate(gameJSON, "", false);

            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `index.html`; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setTimeout(() => {
                alert("¡Exportación completada!\n\nINSTRUCCIONES PARA ITCH.IO:\n1. Coge el archivo 'index.html' que se acaba de descargar.\n2. Mételo en la misma carpeta de tu PC donde están guardados los archivos originales de tu librojuego (.mp3, .jpg, book.json).\n3. Selecciona todos los archivos de esa carpeta y comprímelos en un archivo .ZIP.\n4. Sube ese .ZIP a Itch.io y marca la opción 'This file will be played in the browser'.");
            }, 500);

        } catch(error) {
            console.error("Error al exportar para Itch.io:", error);
            alert("Hubo un error al exportar: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    getWebPlayerTemplate(gameJSON, mediaAssetsHTML, isStandaloneBase64) {
        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${JSON.parse(gameJSON).title}</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html {
            font-family: 'Inter', sans-serif;
            background-color: #050505;
            color: #f3f4f6;
            width: 100%;
            height: 100%;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }
        
        #bg-layer {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            background-color: #050505;
            transition: background-image 0.8s ease-in-out;
            z-index: 0;
        }
        
        #ui-layer {
            position: relative;
            z-index: 10;
            display: flex;
            height: 100%;
            width: 100%;
            padding: 24px;
            flex-direction: column;
        }
        
        .left-column {
            width: 100%;
            max-width: 480px;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .glass-panel {
            background: rgba(15, 15, 15, 0.6);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        #hud-container {
            padding: 16px 20px;
            flex-shrink: 0;
        }
        .hud-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .game-title {
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #fff;
        }
        .score-badge {
            background: rgba(255,255,255,0.1);
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #d1d5db;
        }
        .stats-row {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .stat-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stat-hp { color: #fca5a5; }
        .stat-mp { color: #fde047; }
        .stat-inv { color: #d1d5db; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        
        #story-container {
            padding: 24px 28px;
            flex-grow: 1;
            overflow-y: auto;
            font-size: 1.05rem;
            line-height: 1.7;
            color: #e5e7eb;
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
        #story-container p { margin-bottom: 1.4em; }
        #story-container p:last-child { margin-bottom: 0; }
        
        #story-container::-webkit-scrollbar { width: 4px; }
        #story-container::-webkit-scrollbar-track { background: transparent; }
        #story-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }

        #choices-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex-shrink: 0;
        }
        .choice-btn {
            background: rgba(15, 15, 15, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 16px;
            padding: 18px 24px;
            color: #fff;
            font-size: 0.95rem;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-family: inherit;
        }
        .choice-btn:hover, .choice-btn:active {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.25);
            transform: translateY(-2px);
        }
        .choice-top { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .choice-req { color: #fca5a5; font-size: 0.85em; font-weight: 700; margin-right: 8px; }
        .choice-eff { color: #93c5fd; font-size: 0.8rem; font-weight: 600; margin-top: 2px; display: flex; align-items: center; gap: 6px; }
        .choice-arrow { color: #6b7280; font-size: 0.9rem;}
        
        .end-btn {
            background: rgba(255, 255, 255, 0.9);
            color: #000;
            text-align: center;
            justify-content: center;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 20px;
        }
        .end-btn:hover, .end-btn:active {
            background: #fff;
            box-shadow: 0 0 20px rgba(255,255,255,0.2);
        }

        #audio-controls {
            position: fixed;
            top: 24px;
            right: 24px;
            display: none;
            align-items: center;
            gap: 12px;
            z-index: 20;
            background: rgba(0,0,0,0.5);
            padding: 10px 16px;
            border-radius: 30px;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.05);
        }
        .audio-btn {
            background: transparent;
            border: none;
            color: #fff;
            width: 24px; height: 24px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .audio-btn:hover { color: #9ca3af; transform: scale(1.1); }
        input[type=range] { width: 80px; accent-color: #fff; cursor: pointer; }

        @media (max-width: 768px) {
            #ui-layer { padding: 16px; }
            .left-column { max-width: 100%; }
            #audio-controls { top: auto; bottom: 20px; right: 20px; }
        }
    </style>
</head>
<body>
    <div id="bg-layer"></div>

    <div id="ui-layer">
        <div class="left-column">
            <div id="hud-container" class="glass-panel"></div>
            <div id="story-container" class="glass-panel"></div>
            <div id="choices-container"></div>
        </div>
    </div>
        
    <div id="audio-controls">
        <button id="btn-play-pause" class="audio-btn"><i class="fa-solid fa-pause"></i></button>
        <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="1">
        <button id="btn-mute" class="audio-btn"><i class="fa-solid fa-volume-high"></i></button>
    </div>

    ${mediaAssetsHTML}

    <script>
        const gameData = ${gameJSON};
        const isStandalone = ${isStandaloneBase64};
        
        const storyArea = document.getElementById('story-container');
        const choicesArea = document.getElementById('choices-container');
        const hudContainer = document.getElementById('hud-container');
        const bgLayer = document.getElementById('bg-layer');
        
        const gameAudio = new Audio();
        const audioControls = document.getElementById('audio-controls');
        const btnPlayPause = document.getElementById('btn-play-pause');
        const btnMute = document.getElementById('btn-mute');
        const volumeSlider = document.getElementById('volume-slider');
        
        let currentScore = 0;
        let isMuted = false;
        let playerState = { vida: 10, poder: 10, inventario: [] };
        let pendingDeathTarget = null;

        btnPlayPause.onclick = () => {
            if (gameAudio.paused) {
                gameAudio.play();
                btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
            } else {
                gameAudio.pause();
                btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
            }
        };

        btnMute.onclick = () => {
            isMuted = !isMuted;
            gameAudio.muted = isMuted;
            btnMute.innerHTML = isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
        };

        volumeSlider.oninput = (e) => {
            gameAudio.volume = e.target.value;
            if(gameAudio.volume === 0) {
                btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
            } else if (!isMuted) {
                btnMute.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            }
        };
        
        gameAudio.addEventListener('ended', () => {
            btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
        });

        function renderNode(id) {
            const node = gameData.nodes.find(n => n.id === id);
            if (!node) return;

            const isEndNode = (!node.choices || node.choices.length === 0);

            if (node.hasImage) {
                let imgSrc = "";
                if (isStandalone) {
                    const imgEl = document.getElementById('img_' + id);
                    if (imgEl) imgSrc = imgEl.textContent;
                } else {
                    imgSrc = node.imageUrl;
                }
                if (imgSrc) {
                    bgLayer.style.backgroundImage = \`url('\${imgSrc}')\`;
                }
            } else {
                bgLayer.style.backgroundImage = 'none';
            }

            let hudHtml = \`
                <div class="hud-top">
                    <div class="game-title">\${gameData.title || 'Aventura'}</div>
                    <div class="score-badge">SCORE: \${currentScore}</div>
                </div>
                <div class="stats-row">
                    <div class="stat-badge stat-hp"><i class="fa-solid fa-heart"></i> \${playerState.vida}</div>
                    <div class="stat-badge stat-mp"><i class="fa-solid fa-bolt"></i> \${playerState.poder}</div>
                    <div class="stat-badge stat-inv"><i class="fa-solid fa-backpack"></i> \${playerState.inventario.length > 0 ? playerState.inventario.join(', ') : 'Vacío'}</div>
                </div>
            \`;

            if (isEndNode) {
                const finalScore = Math.max(0, Math.min(100, currentScore));
                hudHtml += \`<div style="margin-top:16px; text-align:center; color:#60a5fa; font-size:0.95rem; font-weight:800; letter-spacing:0.1em; background:rgba(96, 165, 250, 0.1); padding:10px; border-radius:12px; border:1px solid rgba(96, 165, 250, 0.2);">NOTA FINAL: \${finalScore} / 100</div>\`;
            }
            
            hudContainer.innerHTML = hudHtml;
            
            if (node.hasAudio) {
                if (isStandalone) {
                    const audEl = document.getElementById('aud_' + id);
                    if (audEl) gameAudio.src = audEl.textContent;
                } else {
                    gameAudio.src = node.audioUrl;
                }
                
                audioControls.style.display = 'flex';
                const playPromise = gameAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
                    }).catch(e => {
                        btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
                    });
                }
            } else {
                gameAudio.pause();
                audioControls.style.display = 'none';
            }

            let pars = node.text.split('\\n').filter(p => p.trim() !== '').map(p => \`<p>\${p}</p>\`).join('');
            storyArea.innerHTML = pars;

            choicesArea.innerHTML = '';
            
            // Botón ÚNICO de muerte si hemos muerto
            if (pendingDeathTarget && playerState.vida <= 0) {
                const btn = document.createElement('button');
                btn.className = 'choice-btn';
                btn.style.background = 'rgba(153, 27, 27, 0.8)';
                btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                btn.innerHTML = \`<div class="choice-top" style="justify-content:center; text-transform:uppercase; font-weight:bold; letter-spacing:0.1em;"><i class="fa-solid fa-skull" style="margin-right:8px;"></i> Tu vida ha llegado a 0</div>\`;
                btn.onclick = () => {
                    let target = pendingDeathTarget;
                    pendingDeathTarget = null;
                    renderNode(target);
                };
                choicesArea.appendChild(btn);
                
            } else if (!isEndNode) {
                node.choices.forEach(c => {
                    let canChoose = true;
                    let condText = "";
                    
                    if (c.cond && c.cond.type) {
                        if (c.cond.type === 'vida' || c.cond.type === 'poder') {
                            let val = Number(c.cond.val);
                            let current = playerState[c.cond.type];
                            if (c.cond.op === '>') canChoose = current > val;
                            if (c.cond.op === '<') canChoose = current < val;
                            if (c.cond.op === '==') canChoose = current == val;
                            let opName = c.cond.op === '>' ? 'más de' : (c.cond.op === '<' ? 'menos de' : 'exactamente');
                            condText = \`[REQ: \${opName} \${val} \${c.cond.type}] \`;
                        } else if (c.cond.type === 'item') {
                            let has = playerState.inventario.includes(c.cond.val);
                            if (c.cond.op === 'HAS') canChoose = has;
                            if (c.cond.op === '!HAS') canChoose = !has;
                            condText = \`[REQ: \${c.cond.op==='HAS'?'Tener':'No tener'} \${c.cond.val}] \`;
                        }
                    }

                    if (canChoose) {
                        const btn = document.createElement('button');
                        btn.className = 'choice-btn';
                        
                        let effText = "";
                        if (c.eff && c.eff.type) {
                            let effDesc = "";
                            if (c.eff.type === 'item') {
                                effDesc = c.eff.op === 'ADD' ? \`Consigues: \${c.eff.val}\` : \`Pierdes: \${c.eff.val}\`;
                            } else {
                                let actName = c.eff.op === '+' ? 'Ganas' : 'Pierdes';
                                effDesc = \`\${actName} \${c.eff.val} de \${c.eff.type}\`;
                            }
                            effText = \`<div class="choice-eff"><i class="fa-solid fa-bolt"></i> \${effDesc}</div>\`;
                        }

                        btn.innerHTML = \`
                            <div class="choice-top">
                                <span><span class="choice-req">\${condText}</span>\${c.text}</span> 
                                <i class="fa-solid fa-arrow-right choice-arrow"></i>
                            </div>
                            \${effText}
                        \`;

                        btn.onclick = () => {
                            let deathTarget = null;
                            const wasAlive = playerState.vida > 0;

                            const checkDeath = (eff) => {
                                if (eff && eff.type === 'vida' && eff.op === '-' && playerState.vida <= 0) {
                                    if (eff.deathTarget) deathTarget = eff.deathTarget;
                                }
                            };

                            const applyEff = (eff) => {
                                if (!eff || !eff.type) return;
                                if (eff.type === 'vida' || eff.type === 'poder') {
                                    let val = Number(eff.val);
                                    if (!isNaN(val)) {
                                        if (eff.op === '+') playerState[eff.type] += val;
                                        if (eff.op === '-') playerState[eff.type] -= val;
                                    }
                                } else if (eff.type === 'item') {
                                    if (eff.op === 'ADD' && !playerState.inventario.includes(eff.val)) {
                                        playerState.inventario.push(eff.val);
                                    }
                                    if (eff.op === 'REM') {
                                        playerState.inventario = playerState.inventario.filter(i => i !== eff.val);
                                    }
                                }
                            };

                            applyEff(c.eff); 
                            checkDeath(c.eff);

                            const targetNode = gameData.nodes.find(n => n.id === c.targetId);
                            if (targetNode) {
                                currentScore += (targetNode.scoreImpact || 0);
                                applyEff(targetNode.eff); 
                                checkDeath(targetNode.eff);
                            }

                            if (wasAlive && playerState.vida <= 0) {
                                if (!deathTarget) {
                                    let startNode = gameData.nodes.find(n => n.isStartNode) || gameData.nodes[0];
                                    deathTarget = startNode.id;
                                }
                                pendingDeathTarget = deathTarget;
                            } else {
                                pendingDeathTarget = null;
                            }

                            renderNode(c.targetId);
                        };
                        choicesArea.appendChild(btn);
                    }
                });
            } else {
                const btn = document.createElement('button');
                btn.className = 'choice-btn end-btn';
                btn.innerHTML = 'REINICIAR AVENTURA';
                btn.onclick = () => {
                    gameAudio.pause();
                    startGame();
                };
                choicesArea.appendChild(btn);
            }

            storyArea.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function startGame() {
            if (gameData.nodes.length > 0) {
                const startNode = gameData.nodes[0];
                currentScore = startNode.scoreImpact || 0;
                pendingDeathTarget = null;
                
                const init = gameData.initialState || { vida: 10, poder: 10, inventario: [] };
                playerState = { 
                    vida: init.vida !== undefined ? init.vida : 10, 
                    poder: init.poder !== undefined ? init.poder : 10, 
                    inventario: [...(init.inventario || [])] 
                };
                
                // NO apliques muerte en el nodo de inicio por seguridad.
                if (startNode.eff && startNode.eff.type === 'vida' && startNode.eff.op === '-') {
                   playerState.vida -= Number(startNode.eff.val);
                } else if (startNode.eff) {
                   if (startNode.eff.type === 'vida' && startNode.eff.op === '+') playerState.vida += Number(startNode.eff.val);
                   if (startNode.eff.type === 'poder' && startNode.eff.op === '+') playerState.poder += Number(startNode.eff.val);
                   if (startNode.eff.type === 'poder' && startNode.eff.op === '-') playerState.poder -= Number(startNode.eff.val);
                   if (startNode.eff.type === 'item') {
                       if (startNode.eff.op === 'ADD') playerState.inventario.push(startNode.eff.val);
                       if (startNode.eff.op === 'REM') playerState.inventario = playerState.inventario.filter(i => i !== startNode.eff.val);
                   }
                }
                
                renderNode(startNode.id);
            } else {
                storyArea.innerHTML = '<div class="glass-panel" style="padding:20px;">No hay datos de historia en este librojuego.</div>';
            }
        }

        startGame();
    </script>
</body>
</html>`;
    },

    exportJSON() {
        if (!Core.book) return;
        const blob = new Blob([JSON.stringify(Core.book, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${Core.book.title.replace(/\s+/g, '_')}_Proyecto.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};