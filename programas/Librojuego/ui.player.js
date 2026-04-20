// Archivo: Librojuego/ui.player.js

const Player = {
    start() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes) bookBase.nodes = [];
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, poder: 10, inventario: [] };

        const nodesSource = bookBase.nodes;
        if (!nodesSource || nodesSource.length === 0) return alert("No hay historia.");
        
        let startNode = nodesSource.find(n => n.isStartNode);
        if (!startNode) startNode = nodesSource[0];

        Core.currentNodeId = startNode.id;
        Core.currentScore = startNode.scoreImpact || 0;
        Core.pendingDeathTarget = null;
        
        const init = bookBase.initialState;
        Core.playerState = { vida: init.vida, poder: init.poder, inventario: [...init.inventario] };
        
        if (startNode && startNode.eff && startNode.eff.type) {
            const eff = startNode.eff;
            if (eff.type === 'vida' || eff.type === 'poder') {
                let val = Number(eff.val);
                if (!isNaN(val)) {
                    if (eff.op === '+') Core.playerState[eff.type] += val;
                    if (eff.op === '-') Core.playerState[eff.type] -= val;
                }
            } else if (eff.type === 'item') {
                if (eff.op === 'ADD' && !Core.playerState.inventario.includes(eff.val)) {
                    Core.playerState.inventario.push(eff.val);
                }
                if (eff.op === 'REM') {
                    Core.playerState.inventario = Core.playerState.inventario.filter(i => i !== eff.val);
                }
            }
        }
        
        const view = document.getElementById('player-view');
        if (view) {
            view.className = "fixed inset-0 z-[150] hidden overflow-hidden bg-[#050505] transition-opacity duration-500";
            
            view.innerHTML = `
                <div id="player-bg-layer" class="absolute inset-0 w-full h-full z-0 transition-all duration-1000 bg-center bg-cover bg-no-repeat bg-[#050505]"></div>
                
                <button onclick="Player.close()" class="absolute top-6 right-6 text-white hover:text-gray-400 transition-all hover:scale-110 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-[200]">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>

                <div class="relative z-20 flex h-full w-full p-4 sm:p-6 flex-col">
                    <div class="w-full max-w-[480px] h-full flex flex-col gap-4">
                        <div id="player-hud-view" class="bg-[#0f0f0f]/60 backdrop-blur-md border border-white/5 rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-4 px-5 shrink-0"></div>
                        
                        <div id="player-text-view" class="bg-[#0f0f0f]/60 backdrop-blur-md border border-white/5 rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-6 px-7 text-[1.05rem] leading-[1.7] text-gray-200 flex-1 overflow-y-auto custom-scrollbar" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);"></div>
                        
                        <div id="player-choices-view" class="flex flex-col gap-3 shrink-0 pb-2"></div>
                    </div>
                </div>
            `;
            
            view.classList.remove('hidden');
            setTimeout(() => view.classList.remove('opacity-0'), 10);
        }
        this.render();
    },

    close() {
        const view = document.getElementById('player-view');
        if (view) {
            view.classList.add('opacity-0');
            setTimeout(() => view.classList.add('hidden'), 500);
        }
        if (window.PlayerAudioElement) {
            window.PlayerAudioElement.pause();
            window.PlayerAudioElement.src = '';
        }
    },

    render() {
        const node = Core.getNode(Core.currentNodeId);
        if (!node) return;

        const bookBase = Core.book || Core.bookData || {};
        const titleText = bookBase.title || "Sin título";
        const isEnd = !node.choices || node.choices.length === 0;

        const bgLayer = document.getElementById('player-bg-layer');
        if (bgLayer) {
            if (node._cachedImageUrl) {
                bgLayer.style.backgroundImage = `url('${node._cachedImageUrl}')`;
            } else {
                bgLayer.style.backgroundImage = `none`;
            }
        }

        const hud = document.getElementById('player-hud-view');
        if (hud) {
            let hudHtml = `
                <div class="flex justify-between items-center w-full mb-3">
                    <div class="text-[0.8rem] font-bold tracking-[0.15em] uppercase text-white">${titleText}</div>
                    <div class="bg-white/10 px-3 py-1 rounded-xl text-[0.75rem] font-bold tracking-widest text-gray-300">SCORE: ${Core.currentScore}</div>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <div class="bg-white/5 border border-white/5 text-red-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]"><i class="fa-solid fa-heart"></i> ${Core.playerState.vida}</div>
                    <div class="bg-white/5 border border-white/5 text-yellow-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]"><i class="fa-solid fa-bolt"></i> ${Core.playerState.poder}</div>
                    <div class="bg-white/5 border border-white/5 text-gray-300 px-3 py-1.5 rounded-xl font-semibold flex-1 flex items-center gap-1.5 truncate text-[0.75rem]"><i class="fa-solid fa-backpack"></i> ${Core.playerState.inventario.length > 0 ? Core.playerState.inventario.join(', ') : 'Vacío'}</div>
                </div>
            `;
            if (isEnd) {
                const finalScore = Math.max(0, Math.min(100, Core.currentScore));
                hudHtml += `<div class="mt-4 text-center text-blue-400 text-[0.95rem] font-extrabold tracking-widest bg-blue-400/10 py-2.5 rounded-xl border border-blue-400/20">NOTA FINAL: ${finalScore} / 100</div>`;
            }
            hud.innerHTML = hudHtml;
        }

        const textV = document.getElementById('player-text-view');
        if (textV) {
            textV.innerHTML = node.text.split('\n').filter(p => p.trim()).map(p => `<p class="mb-[1.4em] last:mb-0">${p}</p>`).join('');
            textV.scrollTop = 0; 
        }

        if (window.PlayerAudioElement) {
            window.PlayerAudioElement.pause();
            window.PlayerAudioElement.src = '';
        }
        if (node._cachedAudioUrl) {
            window.PlayerAudioElement = new Audio(node._cachedAudioUrl);
            window.PlayerAudioElement.play().catch(e => console.warn("Autoplay bloqueado:", e));
        }

        const choicesDiv = document.getElementById('player-choices-view');
        if (choicesDiv) {
            choicesDiv.innerHTML = '';
            
            // Lógica de Muerte Súbita Exclusiva
            if (Core.pendingDeathTarget && Core.playerState.vida <= 0) {
                const btn = document.createElement('button');
                btn.className = "bg-red-900/80 hover:bg-red-800 transition-all duration-200 backdrop-blur-md border border-red-500/50 hover:border-red-400 rounded-[16px] p-4 px-6 text-white text-[0.95rem] text-center flex flex-col gap-1.5 w-full";
                btn.innerHTML = `<div class="flex justify-center items-center w-full font-bold uppercase tracking-widest"><i class="fa-solid fa-skull mr-2"></i> Tu vida ha llegado a 0</div>`;
                btn.onclick = () => {
                    let target = Core.pendingDeathTarget;
                    Core.pendingDeathTarget = null;
                    Core.makeChoice(target);
                };
                choicesDiv.appendChild(btn);

            } else if (!isEnd) {
                node.choices.forEach(c => {
                    let canChoose = true;
                    let condText = "";
                    if (c.cond && c.cond.type) {
                        if (c.cond.type === 'vida' || c.cond.type === 'poder') {
                            let val = Number(c.cond.val);
                            let current = Core.playerState[c.cond.type];
                            if (c.cond.op === '>') canChoose = current > val;
                            if (c.cond.op === '<') canChoose = current < val;
                            if (c.cond.op === '==') canChoose = current == val;
                            let opName = c.cond.op === '>' ? 'más de' : (c.cond.op === '<' ? 'menos de' : 'exactamente');
                            condText = `[REQ: ${opName} ${val} ${c.cond.type}] `;
                        } else if (c.cond.type === 'item') {
                            let has = Core.playerState.inventario.includes(c.cond.val);
                            if (c.cond.op === 'HAS') canChoose = has;
                            if (c.cond.op === '!HAS') canChoose = !has;
                            condText = `[REQ: ${c.cond.op==='HAS'?'Tener':'No tener'} ${c.cond.val}] `;
                        }
                    }

                    if (canChoose) {
                        const btn = document.createElement('button');
                        btn.className = "bg-[#0f0f0f]/80 hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-md border border-white/10 hover:border-white/25 rounded-[16px] p-4 px-6 text-white text-[0.95rem] text-left flex flex-col gap-1.5 w-full";
                        
                        let effText = "";
                        if (c.eff && c.eff.type) {
                            let effDesc = "";
                            if (c.eff.type === 'item') {
                                effDesc = c.eff.op === 'ADD' ? `Consigues: ${c.eff.val}` : `Pierdes: ${c.eff.val}`;
                            } else {
                                let actName = c.eff.op === '+' ? 'Ganas' : 'Pierdes';
                                effDesc = `${actName} ${c.eff.val} de ${c.eff.type}`;
                            }
                            effText = `<div class="text-[#93c5fd] text-[0.8rem] font-semibold flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-bolt"></i> ${effDesc}</div>`;
                        }

                        btn.innerHTML = `
                            <div class="flex justify-between items-center w-full">
                                <span><span class="text-red-400 text-[0.85em] font-bold mr-2">${condText}</span>${c.text || 'Continuar...'}</span> 
                                <i class="fa-solid fa-arrow-right text-gray-500 text-[0.9rem]"></i>
                            </div>
                            ${effText}
                        `;
                        btn.onclick = () => {
                            Core.makeChoice(c.targetId, c.eff);
                        };
                        choicesDiv.appendChild(btn);
                    }
                });
            } else {
                const btn = document.createElement('button');
                btn.className = "bg-white/90 text-black hover:bg-white hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300 rounded-[16px] p-5 font-extrabold tracking-widest uppercase text-sm text-center w-full flex justify-center items-center";
                btn.innerHTML = `REINICIAR AVENTURA`;
                btn.onclick = () => {
                    this.start();
                };
                choicesDiv.appendChild(btn);
            }
        }
    }
};