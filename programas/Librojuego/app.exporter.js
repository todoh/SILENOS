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
                if (c.cond.op === 'HAS' || c.cond.op === '!HAS') {
                    req = c.cond.op === 'HAS' ? `Tener el objeto: ${c.cond.val}` : `No tener el objeto: ${c.cond.val}`;
                } else {
                    let opMap = {'>': 'más de', '<': 'menos de', '==': 'exactamente'};
                    req = `Tener ${opMap[c.cond.op] || c.cond.op} ${c.cond.qty} de ${c.cond.val}`;
                }
            } else {
                let opMap = {'>': 'más de', '<': 'menos de', '==': 'exactamente'};
                req = `Tener ${opMap[c.cond.op] || c.cond.op} ${c.cond.val} de ${c.cond.type.charAt(0).toUpperCase() + c.cond.type.slice(1)}`;
            }
            result = `[Requisito: ${req}] ` + result;
        }
        
        let effs = c.effs || (c.eff ? [c.eff] : []);
        if (effs.length > 0) {
            let effTexts = effs.map(eff => {
                if (eff.type === 'item') {
                    let qtyStr = (eff.qty > 1) ? ` ${eff.qty}x` : '';
                    return eff.op === 'ADD' ? `Consigues${qtyStr}: ${eff.val}` : `Pierdes${qtyStr}: ${eff.val}`;
                } else {
                    let actMap = {'+': 'Ganas', '-': 'Pierdes'};
                    return `${actMap[eff.op] || eff.op} ${eff.val} de ${eff.type.charAt(0).toUpperCase() + eff.type.slice(1)}`;
                }
            }).join(', ');
            result += ` (Consecuencia: ${effTexts})`;
        }
        return result;
    },

    async exportHTML() {
        if (!Core.book || Core.book.nodes.length === 0) return alert("No hay nodos.");
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Generando PDF/Print...");

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
        table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 0.9em; }
        table th, table td { border: 1px solid black; padding: 8px; text-align: left; }
        table th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>${Core.book.title}</h1>`;

            finalNodes.forEach(node => {
                html += `\n    <div class="passage" id="pasaje-${idToPassage[node.id]}">`;
                html += `\n        <div class="passage-number">${idToPassage[node.id]}</div>`;
                if (base64Images[node.id]) html += `\n        <img src="${base64Images[node.id]}" alt="Ilustración" class="passage-image">`;

                const formattedText = node.text.split('\n').filter(p => p.trim()).map(p => `<p class="passage-text">${p}</p>`).join('');
                html += `\n        ${formattedText}`;

                let nEffsPrint = node.effs || (node.eff ? [node.eff] : []);
                for(let eff of nEffsPrint) {
                    if(eff.type.startsWith('module_') && window.Modules) {
                        html += window.Modules.renderPrintHTML(eff);
                    }
                }

                if (node.choices && node.choices.length > 0) {
                    html += `\n        <ul class="choices">`;
                    node.choices.forEach(c => {
                        const targetPassage = idToPassage[c.targetId];
                        const textFormatted = this.formatPrintableChoice(c);
                        if (targetPassage) html += `\n            <li>${textFormatted} <br><strong>Ve al pasaje ${targetPassage}</strong></li>`;
                        else html += `\n            <li>${textFormatted} <br><em>(Destino roto/no encontrado)</em></li>`;
                    });
                    html += `\n        </ul>`;
                } else {
                    html += `\n        <div class="end-game">Fin de la aventura<span class="end-score">Puntuación: ${node.scoreImpact || 0} / 100</span></div>`;
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
            alert("Hubo un error al exportar: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    async exportInteractiveHTML() {
        if (!Core.book || Core.book.nodes.length === 0) return alert("No hay nodos.");
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Empaquetando App Web Standalone...");

        try {
            const exportData = JSON.parse(JSON.stringify(Core.book));
            let mediaAssetsHTML = '';

            for (const node of exportData.nodes) {
                delete node._cachedImageUrl;
                delete node._cachedAudioUrl;
                if (node.imageUrl) {
                    const b64Img = await this.getBase64Image(node.imageUrl);
                    if (b64Img) { mediaAssetsHTML += `\n<script id="img_${node.id}" type="text/plain">${b64Img}</script>`; node.hasImage = true; }
                    delete node.imageUrl;
                }
                if (node.audioUrl) {
                    const b64Aud = await this.getBase64Image(node.audioUrl);
                    if (b64Aud) { mediaAssetsHTML += `\n<script id="aud_${node.id}" type="text/plain">${b64Aud}</script>`; node.hasAudio = true; }
                    delete node.audioUrl;
                }
            }

            let modulesJS = "";
            if (Core.targetHandle) {
                try {
                    const filesToInject = ['modules.core.js', 'module.combat.js', 'module.shop.js'];
                    for (const f of filesToInject) {
                        try {
                            const fh = await Core.targetHandle.getFileHandle(f);
                            const file = await fh.getFile();
                            modulesJS += await file.text() + "\n\n";
                        } catch(e) { console.warn("No se pudo adjuntar el módulo al standalone:", f); }
                    }
                } catch(e) {}
            }

            const gameJSON = JSON.stringify(exportData);
            const html = this.getWebPlayerTemplate(gameJSON, mediaAssetsHTML, true, modulesJS);
            
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
            alert("Hubo un error al exportar: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    async exportForItchIo() {
        if (!Core.book || Core.book.nodes.length === 0) return alert("No hay nodos.");
        if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(true, "Generando versión optimizada Itch.io...");

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
                alert("¡Exportación completada!\n\nINSTRUCCIONES PARA ITCH.IO:\n1. Coge el archivo 'index.html' descargado.\n2. Mételo en la misma carpeta donde están los activos (.mp3, .jpg, book.json) y los módulos.\n3. Selecciona todos y comprímelos en un .ZIP.\n4. Sube ese .ZIP a Itch.io.");
            }, 500);
        } catch(error) {
            alert("Hubo un error al exportar: " + error.message);
        } finally {
            if (typeof UI !== 'undefined' && UI.setLoading) UI.setLoading(false);
        }
    },

    getWebPlayerTemplate(gameJSON, mediaAssetsHTML, isStandaloneBase64, modulesJS = "") {
        let scriptsHTML = "";
        if (isStandaloneBase64) {
            scriptsHTML = `<script>\n${modulesJS}\n</script>`;
        } else {
            scriptsHTML = `
                <script src="modules.core.js"></script>
                <script src="module.combat.js"></script>
                <script src="module.shop.js"></script>
            `;
        }

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
        body, html { font-family: 'Inter', sans-serif; background-color: #050505; color: #f3f4f6; width: 100%; height: 100%; overflow: hidden; -webkit-font-smoothing: antialiased; }
        #bg-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-size: contain; background-position: center; background-repeat: no-repeat; background-color: #050505; transition: background-image 0.8s ease-in-out; z-index: 0; }
        #ui-layer { position: relative; z-index: 10; display: flex; height: 100%; width: 100%; padding: 24px; flex-direction: column; }
        .left-column { width: 100%; max-width: 480px; height: 100%; display: flex; flex-direction: column; gap: 16px; }
        .glass-panel { background: rgba(15, 15, 15, 0.6); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); }
        #hud-container { padding: 16px 20px; flex-shrink: 0; }
        .hud-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .game-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #fff; }
        .score-badge { background: rgba(255,255,255,0.1); padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; color: #d1d5db; }
        .stats-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .stat-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.05); }
        .stat-hp { color: #fca5a5; }
        .stat-atk { color: #fdba74; }
        .stat-def { color: #93c5fd; }
        .stat-agi { color: #86efac; }
        .stat-des { color: #d8b4fe; }
        .stat-inv { color: #d1d5db; flex-grow: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        #story-container { padding: 24px 28px; flex-grow: 1; overflow-y: auto; font-size: 1.05rem; line-height: 1.7; color: #e5e7eb; text-shadow: 0 1px 2px rgba(0,0,0,0.8); }
        #story-container p { margin-bottom: 1.4em; }
        #story-container p:last-child { margin-bottom: 0; }
        #story-container::-webkit-scrollbar { width: 4px; }
        #story-container::-webkit-scrollbar-track { background: transparent; }
        #story-container::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        #choices-container { display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; padding-bottom: 30px; }
        .choice-btn { background: rgba(15, 15, 15, 0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 18px 24px; color: #fff; font-size: 0.95rem; text-align: left; cursor: pointer; transition: all 0.2s ease; display: flex; flex-direction: column; gap: 6px; font-family: inherit; }
        .choice-btn:hover, .choice-btn:active { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.25); transform: translateY(-2px); }
        .choice-top { display: flex; justify-content: space-between; align-items: center; width: 100%; }
        .choice-req { color: #fca5a5; font-size: 0.85em; font-weight: 700; margin-right: 8px; }
        .choice-arrow { color: #6b7280; font-size: 0.9rem;}
        .end-btn { background: rgba(255, 255, 255, 0.9); color: #000; text-align: center; justify-content: center; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; padding: 20px; }
        .end-btn:hover, .end-btn:active { background: #fff; box-shadow: 0 0 20px rgba(255,255,255,0.2); }
        #audio-controls { position: fixed; top: 24px; right: 24px; display: none; align-items: center; gap: 12px; z-index: 20; background: rgba(0,0,0,0.5); padding: 10px 16px; border-radius: 30px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.05); }
        .audio-btn { background: transparent; border: none; color: #fff; width: 24px; height: 24px; cursor: pointer; transition: all 0.2s; }
        .audio-btn:hover { color: #9ca3af; transform: scale(1.1); }
        input[type=range] { width: 80px; accent-color: #fff; cursor: pointer; }
        @media (max-width: 768px) { #ui-layer { padding: 16px; } .left-column { max-width: 100%; } #audio-controls { top: auto; bottom: 20px; right: 20px; } }
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
    ${scriptsHTML}
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
        
        let currentScore = 0; let isMuted = false; 
        let playerState = { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] }; 
        let pendingDeathTarget = null;
        
        window.Core = {
            get playerState() { return playerState; },
            set playerState(v) { playerState = v; },
            get pendingDeathTarget() { return pendingDeathTarget; },
            set pendingDeathTarget(v) { pendingDeathTarget = v; },
            makeChoice: function(id) { 
                if(id) renderNode(id); 
            }
        };

        btnPlayPause.onclick = () => { if (gameAudio.paused) { gameAudio.play(); btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>'; } else { gameAudio.pause(); btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>'; } };
        btnMute.onclick = () => { isMuted = !isMuted; gameAudio.muted = isMuted; btnMute.innerHTML = isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>'; };
        volumeSlider.oninput = (e) => { gameAudio.volume = e.target.value; if(gameAudio.volume === 0) { btnMute.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>'; } else if (!isMuted) { btnMute.innerHTML = '<i class="fa-solid fa-volume-high"></i>'; } };
        gameAudio.addEventListener('ended', () => { btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>'; });
        const formatInv = (inv) => { if (!inv || inv.length === 0) return 'Vacío'; const c = {}; inv.forEach(i => c[i] = (c[i] || 0) + 1); return Object.entries(c).map(([n, v]) => v > 1 ? n + ' x' + v : n).join(', '); };

        function renderNode(id) {
            const node = gameData.nodes.find(n => n.id === id);
            if (!node) return;
            const isEndNode = (!node.choices || node.choices.length === 0);
            if (node.hasImage) { let imgSrc = ""; if (isStandalone) { const imgEl = document.getElementById('img_' + id); if (imgEl) imgSrc = imgEl.textContent; } else { imgSrc = node.imageUrl; } if (imgSrc) bgLayer.style.backgroundImage = \`url('\${imgSrc}')\`; } else bgLayer.style.backgroundImage = 'none';

            let hudHtml = \`<div class="hud-top"><div class="game-title">\${gameData.title || 'Aventura'}</div><div class="score-badge">SCORE: \${currentScore}</div></div>
                <div class="stats-row">
                    <div class="stat-badge stat-hp"><i class="fa-solid fa-heart"></i> \${playerState.vida} / \${playerState.vidaMax}</div>
                    <div class="stat-badge stat-atk" title="Ataque"><i class="fa-solid fa-khanda"></i> \${playerState.ataque}</div>
                    <div class="stat-badge stat-def" title="Defensa"><i class="fa-solid fa-shield"></i> \${playerState.defensa}</div>
                    <div class="stat-badge stat-agi" title="Agilidad"><i class="fa-solid fa-wind"></i> \${playerState.agilidad}</div>
                    <div class="stat-badge stat-des" title="Destreza"><i class="fa-solid fa-hand-sparkles"></i> \${playerState.destreza}</div>
                    <div class="stat-badge stat-inv"><i class="fa-solid fa-backpack"></i> \${formatInv(playerState.inventario)}</div>
                </div>\`;
            if (isEndNode) { const finalScore = Math.max(0, Math.min(100, currentScore)); hudHtml += \`<div style="margin-top:16px; text-align:center; color:#60a5fa; font-size:0.95rem; font-weight:800; letter-spacing:0.1em; background:rgba(96, 165, 250, 0.1); padding:10px; border-radius:12px; border:1px solid rgba(96, 165, 250, 0.2);">NOTA FINAL: \${finalScore} / 100</div>\`; }
            hudContainer.innerHTML = hudHtml;
            
            if (node.hasAudio) {
                if (isStandalone) { const audEl = document.getElementById('aud_' + id); if (audEl) gameAudio.src = audEl.textContent; } else gameAudio.src = node.audioUrl;
                audioControls.style.display = 'flex'; const playPromise = gameAudio.play(); if (playPromise !== undefined) playPromise.then(() => btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>').catch(e => btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>');
            } else { gameAudio.pause(); audioControls.style.display = 'none'; }

            let pars = node.text.split('\\n').filter(p => p.trim() !== '').map(p => \`<p>\${p}</p>\`).join('');
            storyArea.innerHTML = pars;
            choicesArea.innerHTML = '';

            let nodeEffs = node.effs || (node.eff ? [node.eff] : []);
            
            // ---> MÓDULOS BLOQUEANTES (Combate) <---
            let combatEff = nodeEffs.find(eff => eff.type === 'module_combat');
            if (combatEff && window.Modules) {
                window.Modules.renderWeb(combatEff, 'choices-container');
                return; 
            }

            // ---> OPCIONES NORMALES DE NAVEGACIÓN <---
            if (pendingDeathTarget && playerState.vida <= 0) {
                const btn = document.createElement('button'); btn.className = 'choice-btn'; btn.style.background = 'rgba(153, 27, 27, 0.8)'; btn.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                btn.innerHTML = \`<div class="choice-top" style="justify-content:center; text-transform:uppercase; font-weight:bold; letter-spacing:0.1em;"><i class="fa-solid fa-skull" style="margin-right:8px;"></i> Tu vida ha llegado a 0</div>\`;
                btn.onclick = () => { let target = pendingDeathTarget; pendingDeathTarget = null; renderNode(target); }; choicesArea.appendChild(btn);
            } else if (!isEndNode) {
                node.choices.forEach(c => {
                    let canChoose = true; let condText = "";
                    if (c.cond && c.cond.type) {
                        if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(c.cond.type)) {
                            let val = Number(c.cond.val); let current = playerState[c.cond.type];
                            if (c.cond.op === '>') canChoose = current > val; if (c.cond.op === '<') canChoose = current < val; if (c.cond.op === '==') canChoose = current == val;
                            let opName = c.cond.op === '>' ? 'más de' : (c.cond.op === '<' ? 'menos de' : 'exactamente'); condText = \`[REQ: \${opName} \${val} \${c.cond.type}] \`;
                        } else if (c.cond.type === 'item') {
                            let itemCount = 0;
                            playerState.inventario.forEach(i => { if (i === c.cond.val) itemCount++; });
                            
                            if (c.cond.op === 'HAS') {
                                canChoose = itemCount > 0;
                                condText = \`[REQ: Tener \${c.cond.val}] \`;
                            } else if (c.cond.op === '!HAS') {
                                canChoose = itemCount === 0;
                                condText = \`[REQ: No tener \${c.cond.val}] \`;
                            } else {
                                let targetVal = Number(c.cond.qty);
                                if (isNaN(targetVal)) {
                                    targetVal = 0;
                                    playerState.inventario.forEach(i => { if (i === c.cond.qty) targetVal++; });
                                }
                                if (c.cond.op === '>') canChoose = itemCount > targetVal;
                                if (c.cond.op === '<') canChoose = itemCount < targetVal;
                                if (c.cond.op === '==') canChoose = itemCount == targetVal;
                                let opName = c.cond.op === '>' ? 'más de' : (c.cond.op === '<' ? 'menos de' : 'exactamente');
                                condText = \`[REQ: \${opName} \${c.cond.qty} \${c.cond.val}] \`;
                            }
                        }
                    }
                    if (canChoose) {
                        const btn = document.createElement('button'); btn.className = 'choice-btn';
                        
                        let effs = c.effs || (c.eff ? [c.eff] : []);
                        let effText = "";
                        if (effs.length > 0) {
                            let effHtmls = effs.map(eff => {
                                let effDesc = "";
                                if (eff.type === 'item') {
                                    let qtyStr = (eff.qty > 1) ? \` \${eff.qty}x\` : '';
                                    effDesc = eff.op === 'ADD' ? \`Consigues\${qtyStr}: \${eff.val}\` : \`Pierdes\${qtyStr}: \${eff.val}\`;
                                } else {
                                    let actName = eff.op === '+' ? 'Ganas' : 'Pierdes';
                                    effDesc = \`\${actName} \${eff.val} de \${eff.type}\`;
                                }
                                return \`<div class="choice-eff"><i class="fa-solid fa-bolt"></i> \${effDesc}</div>\`;
                            });
                            effText = effHtmls.join('');
                        }
                        btn.innerHTML = \`<div class="choice-top"><span><span class="choice-req">\${condText}</span>\${c.text}</span><i class="fa-solid fa-arrow-right choice-arrow"></i></div>\${effText}\`;

                        btn.onclick = () => {
                            let deathTarget = null; const wasAlive = playerState.vida > 0;
                            const applyEffs = (effsList) => {
                                const list = Array.isArray(effsList) ? effsList : (effsList ? [effsList] : []);
                                list.forEach(eff => {
                                    if (!eff || !eff.type) return;
                                    if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(eff.type)) {
                                        let val = Number(eff.val);
                                        if (!isNaN(val)) { if (eff.op === '+') playerState[eff.type] += val; if (eff.op === '-') playerState[eff.type] -= val; }
                                    } else if (eff.type === 'item') {
                                        let qty = Number(eff.qty) || 1;
                                        if (eff.op === 'ADD') { for(let i=0; i<qty; i++) playerState.inventario.push(eff.val); }
                                        if (eff.op === 'REM') { for(let i=0; i<qty; i++) { const idx = playerState.inventario.indexOf(eff.val); if (idx > -1) playerState.inventario.splice(idx, 1); } }
                                    }
                                });
                                if (playerState.vida > playerState.vidaMax) playerState.vida = playerState.vidaMax;
                            };
                            const checkDeath = (effsList) => {
                                const list = Array.isArray(effsList) ? effsList : (effsList ? [effsList] : []);
                                list.forEach(eff => { if (eff && eff.type === 'vida' && eff.op === '-' && playerState.vida <= 0) { if (eff.deathTarget) deathTarget = eff.deathTarget; } });
                            };

                            let cEffs = c.effs || (c.eff ? [c.eff] : []);
                            applyEffs(cEffs); checkDeath(cEffs);

                            const targetNode = gameData.nodes.find(n => n.id === c.targetId);
                            if (targetNode) {
                                currentScore += (targetNode.scoreImpact || 0);
                                let nEffs = targetNode.effs || (targetNode.eff ? [targetNode.eff] : []);
                                applyEffs(nEffs); checkDeath(nEffs);
                            }

                            if (wasAlive && playerState.vida <= 0) {
                                if (!deathTarget) { let startNode = gameData.nodes.find(n => n.isStartNode) || gameData.nodes[0]; deathTarget = startNode.id; }
                                pendingDeathTarget = deathTarget;
                            } else { pendingDeathTarget = null; }
                            renderNode(c.targetId);
                        };
                        choicesArea.appendChild(btn);
                    }
                });
            } else {
                const btn = document.createElement('button'); btn.className = 'choice-btn end-btn'; btn.innerHTML = 'REINICIAR AVENTURA';
                btn.onclick = () => { gameAudio.pause(); startGame(); }; choicesArea.appendChild(btn);
            }

            // ---> MÓDULOS NO BLOQUEANTES (Tienda) <---
            let shopEffs = nodeEffs.filter(eff => eff.type === 'module_shop');
            for (let eff of shopEffs) {
                if (window.Modules) window.Modules.renderWeb(eff, 'choices-container');
            }

            storyArea.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function startGame() {
            if (gameData.nodes.length > 0) {
                const startNode = gameData.nodes.find(n => n.isStartNode) || gameData.nodes[0]; 
                currentScore = startNode.scoreImpact || 0; pendingDeathTarget = null;
                const init = gameData.initialState || { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] };
                playerState = { 
                    vida: init.vida ?? 10, 
                    vidaMax: init.vidaMax ?? 10, 
                    ataque: init.ataque ?? 5, 
                    defensa: init.defensa ?? 5, 
                    agilidad: init.agilidad ?? 5, 
                    destreza: init.destreza ?? 5, 
                    inventario: [...(init.inventario || [])] 
                };
                
                let startEffs = startNode.effs || (startNode.eff ? [startNode.eff] : []);
                startEffs.forEach(eff => {
                    if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(eff.type)) {
                        let val = Number(eff.val);
                        if (!isNaN(val)) {
                            if (eff.op === '+') playerState[eff.type] += val;
                            if (eff.op === '-') playerState[eff.type] -= val;
                        }
                    } else if (eff.type === 'item') {
                        let qty = Number(eff.qty) || 1;
                        if (eff.op === 'ADD') { for(let i=0;i<qty;i++) playerState.inventario.push(eff.val); }
                        if (eff.op === 'REM') { for(let i=0;i<qty;i++) { const idx = playerState.inventario.indexOf(eff.val); if (idx > -1) playerState.inventario.splice(idx, 1); } }
                    }
                });
                if (playerState.vida > playerState.vidaMax) playerState.vida = playerState.vidaMax;
                renderNode(startNode.id);
            } else { storyArea.innerHTML = '<div class="glass-panel" style="padding:20px;">No hay datos de historia en este librojuego.</div>'; }
        }
        startGame();
    </script>
</body>
</html>`;
    }
};