// Archivo: Librojuego/ui.player.js

const Player = {
    start() {
        const bookBase = Core.book || Core.bookData || {};
        if (!bookBase.nodes) bookBase.nodes = [];
        if (!bookBase.gameItems) bookBase.gameItems = [];
        if (!bookBase.initialState) bookBase.initialState = { vida: 10, vidaMax: 10, ataque: 5, defensa: 5, agilidad: 5, destreza: 5, inventario: [] };

        const nodesSource = bookBase.nodes;
        if (!nodesSource || nodesSource.length === 0) return alert("No hay historia.");
        
        let startNode = nodesSource.find(n => n.isStartNode) || nodesSource[0];

        Core.currentNodeId = startNode.id;
        Core.currentScore = startNode.scoreImpact || 0;
        Core.pendingDeathTarget = null;
        
        const init = bookBase.initialState;
        Core.playerState = { 
            vida: init.vida ?? 10, 
            vidaMax: init.vidaMax ?? 10, 
            ataque: init.ataque ?? 5, 
            defensa: init.defensa ?? 5, 
            agilidad: init.agilidad ?? 5, 
            destreza: init.destreza ?? 5, 
            inventario: [...(init.inventario || [])] 
        };
        
        if (startNode) {
            const startEffs = startNode.effs || (startNode.eff ? [startNode.eff] : []);
            startEffs.forEach(eff => {
                if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(eff.type)) {
                    let val = Number(eff.val);
                    if (!isNaN(val)) {
                        if (eff.op === '+') Core.playerState[eff.type] += val;
                        if (eff.op === '-') Core.playerState[eff.type] -= val;
                    }
                } else if (eff.type === 'item') {
                    let qty = Number(eff.qty) || 1;
                    if (eff.op === 'ADD') {
                        for(let i=0; i<qty; i++) Core.playerState.inventario.push(eff.val);
                    }
                    if (eff.op === 'REM') {
                        for(let i=0; i<qty; i++) {
                            const idx = Core.playerState.inventario.indexOf(eff.val);
                            if (idx > -1) Core.playerState.inventario.splice(idx, 1);
                        }
                    }
                }
            });
            if (Core.playerState.vida > Core.playerState.vidaMax) {
                Core.playerState.vida = Core.playerState.vidaMax;
            }
        }
        
        const view = document.getElementById('player-view');
        if (view) {
            view.className = "fixed inset-0 z-[150] hidden overflow-hidden bg-[#050505] transition-opacity duration-500";
            
            view.innerHTML = `
                <div id="player-bg-layer" class="absolute inset-0 w-full h-full z-0 transition-all duration-1000 bg-center bg-contain bg-no-repeat bg-[#050505]"></div>
                
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

        const formatInv = (inv) => {
            if (!inv || inv.length === 0) return 'Vacío';
            const c = {};
            inv.forEach(i => c[i] = (c[i] || 0) + 1);
            return Object.entries(c).map(([n, v]) => v > 1 ? `${n} x${v}` : n).join(', ');
        };

        const hud = document.getElementById('player-hud-view');
        if (hud) {
            let hudHtml = `
                <div class="flex justify-between items-center w-full mb-3">
                    <div class="text-[0.8rem] font-bold tracking-[0.15em] uppercase text-white">${titleText}</div>
                    <div class="bg-white/10 px-3 py-1 rounded-xl text-[0.75rem] font-bold tracking-widest text-gray-300">SCORE: ${Core.currentScore}</div>
                </div>
                <div class="flex gap-2 flex-wrap">
                    <div class="bg-white/5 border border-white/5 text-red-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]" title="Vida / Máxima"><i class="fa-solid fa-heart"></i> ${Core.playerState.vida} / ${Core.playerState.vidaMax}</div>
                    <div class="bg-white/5 border border-white/5 text-orange-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]" title="Ataque"><i class="fa-solid fa-khanda"></i> ${Core.playerState.ataque}</div>
                    <div class="bg-white/5 border border-white/5 text-blue-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]" title="Defensa"><i class="fa-solid fa-shield"></i> ${Core.playerState.defensa}</div>
                    <div class="bg-white/5 border border-white/5 text-green-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]" title="Agilidad"><i class="fa-solid fa-wind"></i> ${Core.playerState.agilidad}</div>
                    <div class="bg-white/5 border border-white/5 text-purple-300 px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 text-[0.75rem]" title="Destreza"><i class="fa-solid fa-hand-sparkles"></i> ${Core.playerState.destreza}</div>
                    <div class="bg-white/5 border border-white/5 text-gray-300 px-3 py-1.5 rounded-xl font-semibold flex-1 flex items-center gap-1.5 truncate text-[0.75rem] stat-inv"><i class="fa-solid fa-backpack"></i> ${formatInv(Core.playerState.inventario)}</div>
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
            
            let nodeEffs = node.effs || (node.eff ? [node.eff] : []);
            
            // ---> MÓDULOS BLOQUEANTES (Ej: Combate) <---
            let combatEff = nodeEffs.find(eff => eff.type === 'module_combat');
            if (combatEff && window.Modules) {
                window.Modules.renderWeb(combatEff, 'player-choices-view');
                return; // Detiene el dibujado de las opciones hasta acabar el combate
            }

            // ---> DIBUJO DE OPCIONES DE NAVEGACIÓN NORMALES <---
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
                        if (['vida', 'vidaMax', 'ataque', 'defensa', 'agilidad', 'destreza'].includes(c.cond.type)) {
                            let val = Number(c.cond.val);
                            let current = Core.playerState[c.cond.type];
                            if (c.cond.op === '>') canChoose = current > val;
                            if (c.cond.op === '<') canChoose = current < val;
                            if (c.cond.op === '==') canChoose = current == val;
                            let opName = c.cond.op === '>' ? 'más de' : (c.cond.op === '<' ? 'menos de' : 'exactamente');
                            condText = `[REQ: ${opName} ${val} ${c.cond.type}] `;
                        } else if (c.cond.type === 'item') {
                            let itemCount = 0;
                            Core.playerState.inventario.forEach(i => { if (i === c.cond.val) itemCount++; });
                            
                            if (c.cond.op === 'HAS') {
                                canChoose = itemCount > 0;
                                condText = `[REQ: Tener ${c.cond.val}] `;
                            } else if (c.cond.op === '!HAS') {
                                canChoose = itemCount === 0;
                                condText = `[REQ: No tener ${c.cond.val}] `;
                            } else {
                                let targetVal = Number(c.cond.qty);
                                if (isNaN(targetVal)) {
                                    targetVal = 0;
                                    Core.playerState.inventario.forEach(i => { if (i === c.cond.qty) targetVal++; });
                                }
                                
                                if (c.cond.op === '>') canChoose = itemCount > targetVal;
                                if (c.cond.op === '<') canChoose = itemCount < targetVal;
                                if (c.cond.op === '==') canChoose = itemCount == targetVal;
                                
                                let opName = c.cond.op === '>' ? 'más de' : (c.cond.op === '<' ? 'menos de' : 'exactamente');
                                condText = `[REQ: ${opName} ${c.cond.qty} ${c.cond.val}] `;
                            }
                        }
                    }

                    if (canChoose) {
                        const btn = document.createElement('button');
                        btn.className = "bg-[#0f0f0f]/80 hover:bg-white/15 hover:-translate-y-0.5 transition-all duration-200 backdrop-blur-md border border-white/10 hover:border-white/25 rounded-[16px] p-4 px-6 text-white text-[0.95rem] text-left flex flex-col gap-1.5 w-full";
                        
                        let effs = c.effs || (c.eff ? [c.eff] : []);
                        let effText = "";
                        if (effs.length > 0) {
                            let effHtmls = effs.map(eff => {
                                let effDesc = "";
                                if (eff.type === 'item') {
                                    let qtyStr = (eff.qty > 1) ? ` ${eff.qty}x` : '';
                                    effDesc = eff.op === 'ADD' ? `Consigues${qtyStr}: ${eff.val}` : `Pierdes${qtyStr}: ${eff.val}`;
                                } else {
                                    let actName = eff.op === '+' ? 'Ganas' : 'Pierdes';
                                    effDesc = `${actName} ${eff.val} de ${eff.type}`;
                                }
                                return `<div class="text-[#93c5fd] text-[0.8rem] font-semibold flex items-center gap-1.5 mt-0.5"><i class="fa-solid fa-bolt"></i> ${effDesc}</div>`;
                            });
                            effText = effHtmls.join('');
                        }

                        btn.innerHTML = `
                            <div class="flex justify-between items-center w-full">
                                <span><span class="text-red-400 text-[0.85em] font-bold mr-2">${condText}</span>${c.text || 'Continuar...'}</span> 
                                <i class="fa-solid fa-arrow-right text-gray-500 text-[0.9rem]"></i>
                            </div>
                            <div class="flex flex-col gap-1">${effText}</div>
                        `;
                        btn.onclick = () => {
                            let targetEffs = c.effs || (c.eff ? [c.eff] : []);
                            Core.makeChoice(c.targetId, targetEffs);
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

            // ---> MÓDULOS NO BLOQUEANTES (Tienda) DEBAJO de las opciones <---
            let shopEffs = nodeEffs.filter(eff => eff.type === 'module_shop');
            for (let eff of shopEffs) {
                if (window.Modules) window.Modules.renderWeb(eff, 'player-choices-view');
            }
        }
    }
};