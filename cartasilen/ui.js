/* -------------------------------------------------------------------------- */
/*                          1. CANVAS PARTICLE SYSTEM                         */
/* -------------------------------------------------------------------------- */
let canvas, ctx;
let particles = [];

function initCanvas() {
    canvas = document.getElementById('fx-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    
    particles = [];
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: (Math.random() - 0.5) * 0.2,
            vy: (Math.random() - 0.5) * 0.2,
            size: Math.random() * 2 + 1,
            color: '#a1a1aa',
            alpha: Math.random() * 0.15 + 0.05
        });
    }
}

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function spawnParticlesAt(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            size: Math.random() * 3 + 2,
            color: '#000000',
            alpha: 1,
            burst: true
        });
    }
}

function renderParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.burst) {
            p.alpha -= 0.03;
            if (p.alpha <= 0) particles.splice(idx, 1);
        } else {
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();
    });
    requestAnimationFrame(renderParticles);
}

/* -------------------------------------------------------------------------- */
/*                       2. ROUTER Y DIFICULTAD                               */
/* -------------------------------------------------------------------------- */
function showScreen(screenId) {
    state.activeScreen = screenId;
    document.getElementById('screen-home').classList.add('hidden');
    document.getElementById('screen-deck').classList.add('hidden');
    document.getElementById('screen-battle').classList.add('hidden');
    
    if (screenId === 'home') {
        renderHomeScreen();
        document.getElementById('screen-home').classList.remove('hidden');
    } else if (screenId === 'deck') {
        renderDeckManager();
        document.getElementById('screen-deck').classList.remove('hidden');
    } else if (screenId === 'battle') {
        document.getElementById('screen-battle').classList.remove('hidden');
    }
}

function showToast(msg, icon = 'ℹ️') {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-icon').textContent = icon;
    toast.classList.remove('translate-y-[-150%]', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-[-150%]', 'opacity-0');
    }, 2500);
}

function setDifficulty(diff) {
    state.difficulty = diff;
    ['easy', 'normal', 'hard'].forEach(d => {
        const btn = document.getElementById(`diff-${d}`);
        if (btn) {
            if (d === diff) {
                btn.className = 'px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-black text-white';
            } else {
                btn.className = 'px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-black hover:bg-neutral-200';
            }
        }
    });
}

/* -------------------------------------------------------------------------- */
/*                         3. HOME SCREEN RENDERER                            */
/* -------------------------------------------------------------------------- */
function renderHomeScreen() {
    const activeCards = state.activeDeckCardIds.map(id => CARDS_DATABASE.find(c => c.id === id)).filter(Boolean);
    
    document.getElementById('home-deck-count-badge').textContent = `${activeCards.length}/12`;
    document.getElementById('home-stat-cards').textContent = activeCards.length;
    const avgCost = (activeCards.reduce((acc, c) => acc + c.cost, 0) / (activeCards.length || 1)).toFixed(1);
    document.getElementById('home-stat-cost').textContent = avgCost;
    
    const elemCounts = {};
    activeCards.forEach(c => elemCounts[c.element] = (elemCounts[c.element] || 0) + 1);
    const pillsContainer = document.getElementById('home-element-pills');
    pillsContainer.innerHTML = '';
    
    Object.keys(elemCounts).forEach(elem => {
        const info = ELEMENT_INFO[elem] || { name: elem, emoji: '⚡' };
        const badge = document.createElement('span');
        badge.className = 'px-2 py-0.5 bg-white text-[9px] font-mono font-bold text-black uppercase border border-neutral-200';
        badge.textContent = `${info.emoji} ${info.name}: ${elemCounts[elem]}`;
        pillsContainer.appendChild(badge);
    });

    const miniGrid = document.getElementById('home-deck-preview-grid');
    miniGrid.innerHTML = '';
    activeCards.slice(0, 8).forEach(card => {
        const item = document.createElement('div');
        item.className = 'p-1 bg-white text-center flex flex-col items-center justify-between border border-neutral-200';
        item.innerHTML = `
            <div class="w-full aspect-square relative overflow-hidden mb-0.5 bg-neutral-100">
                <img src="${card.image}" alt="${card.name}" class="w-full h-full object-cover card-image-square" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' fill=\\'%23e4e4e7\\'><rect width=\\'100\\' height=\\'100\\'/></svg>';">
            </div>
            <span class="text-[7px] font-mono font-bold text-black truncate w-full uppercase tracking-tighter">${card.name}</span>
        `;
        miniGrid.appendChild(item);
    });
}

/* -------------------------------------------------------------------------- */
/*                       4. DECK MANAGER BUILDER LOGIC                        */
/* -------------------------------------------------------------------------- */
function filterCards(elem) {
    state.deckFilter = elem;
    document.querySelectorAll('#element-filters button').forEach(btn => {
        btn.className = 'filter-btn px-2.5 py-1 text-xs font-mono font-bold bg-white text-black hover:bg-black hover:text-white';
    });
    if (window.event && window.event.target) {
        window.event.target.className = 'filter-btn px-2.5 py-1 text-xs font-mono font-bold bg-black text-white';
    }
    renderDeckManager();
}

function renderDeckManager() {
    document.getElementById('deck-counter').textContent = state.activeDeckCardIds.length;
    
    const galleryGrid = document.getElementById('deck-gallery-grid');
    galleryGrid.innerHTML = '';
    const filtered = CARDS_DATABASE.filter(c => state.deckFilter === 'ALL' || c.element === state.deckFilter || c.type === state.deckFilter);
    document.getElementById('gallery-count').textContent = filtered.length;
    
    filtered.forEach(card => {
        const countInDeck = state.activeDeckCardIds.filter(id => id === card.id).length;
        const typeData = CARD_TYPES[card.type] || { name: card.type, emoji: '📌' };
        const elemData = ELEMENT_INFO[card.element] || { name: card.element, emoji: '⚡' };
        
        const cardEl = document.createElement('div');
        cardEl.className = `p-2.5 swiss-card flex flex-col justify-between relative transition-all h-[380px] ${
            countInDeck > 0 ? 'bg-neutral-200' : 'bg-neutral-100'
        }`;
        cardEl.innerHTML = `
            <div class="flex flex-col h-full min-h-0">
                <div class="flex flex-wrap items-center gap-1 mb-1.5 flex-shrink-0">
                    <span class="text-[8px] font-mono font-bold px-1 py-0.5 bg-black text-white uppercase tracking-wider">
                        ${elemData.emoji} ${elemData.name}
                    </span>
                    <span class="font-mono text-[8px] font-bold px-1 py-0.5 bg-white text-black">
                        ${card.cost} EN
                    </span>
                    <span class="text-[8px] font-mono font-bold px-1 py-0.5 bg-white text-black uppercase">
                        ${typeData.name}
                    </span>
                </div>
                <div class="relative w-full aspect-square overflow-hidden bg-neutral-200 mb-1.5 flex-shrink-0">
                    <img src="${card.image}" alt="${card.name}" class="w-full h-full object-cover card-image-square" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' fill=\\'%23e4e4e7\\'><rect width=\\'100\\' height=\\'100\\'/></svg>';">
                </div>
                <h4 class="font-bold text-xs font-mono uppercase text-black truncate mb-0.5 flex-shrink-0">${card.name}</h4>
                <p class="text-[9px] text-neutral-500 leading-tight overflow-y-auto flex-1">${card.desc}</p>
            </div>
            
            <div class="flex items-center justify-end pt-1.5 mt-1.5 border-t border-neutral-300/40 flex-shrink-0">
                <button onclick="addCardToDeck('${card.id}')" class="btn-brutalist w-full py-1 text-[10px] text-center">
                    + Añadir ${countInDeck > 0 ? `(${countInDeck})` : ''}
                </button>
            </div>
        `;
        galleryGrid.appendChild(cardEl);
    });

    const activeList = document.getElementById('active-deck-list');
    activeList.innerHTML = '';
    if (state.activeDeckCardIds.length === 0) {
        activeList.innerHTML = `<div class="p-3 text-center text-xs text-neutral-400 font-mono uppercase">El mazo está vacío.</div>`;
    } else {
        state.activeDeckCardIds.forEach((cardId, index) => {
            const card = CARDS_DATABASE.find(c => c.id === cardId);
            if (!card) return;
            const typeData = CARD_TYPES[card.type] || { name: card.type, emoji: '📌' };
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-1.5 bg-white border border-neutral-200';
            item.innerHTML = `
                <div class="flex items-center gap-2 overflow-hidden">
                    <img src="${card.image}" alt="${card.name}" class="w-7 h-7 aspect-square object-cover flex-shrink-0 bg-neutral-100" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' fill=\\'%23e4e4e7\\'><rect width=\\'100\\' height=\\'100\\'/></svg>';">
                    <div class="truncate">
                        <h5 class="text-[10px] font-bold font-mono text-black truncate uppercase leading-tight">${card.name}</h5>
                        <span class="text-[8px] font-mono text-neutral-400 uppercase block">${card.cost} EN | ${typeData.name}</span>
                    </div>
                </div>
                <button onclick="removeCardFromDeck(${index})" class="p-1 font-mono text-xs font-bold hover:bg-black hover:text-white flex-shrink-0">✕</button>
            `;
            activeList.appendChild(item);
        });
    }
}

function addCardToDeck(cardId) {
    if (state.activeDeckCardIds.length >= 12) {
        showToast('Límite máximo alcanzado (12 cartas)', '⚠️');
        return;
    }
    state.activeDeckCardIds.push(cardId);
    renderDeckManager();
}

function removeCardFromDeck(index) {
    state.activeDeckCardIds.splice(index, 1);
    renderDeckManager();
}

function clearDeck() {
    state.activeDeckCardIds = [];
    renderDeckManager();
}

function loadPreset(presetName) {
    if (presetName === 'balanced') {
        state.activeDeckCardIds = [...PRESET_BALANCED];
    } else if (presetName === 'aggressive') {
        state.activeDeckCardIds = [...PRESET_AGGRESSIVE];
    }
    showToast(`Preajuste ${presetName.toUpperCase()} cargado`, '✨');
    renderDeckManager();
}

function saveAndReturnHome() {
    if (state.activeDeckCardIds.length < 6) {
        showToast('Tu mazo necesita al menos 6 cartas', '⚠️');
        return;
    }
    saveDeckState();
    showToast('Baraja guardada con éxito', '💾');
    showScreen('home');
}

function startBattleFromHome() {
    if (state.activeDeckCardIds.length < 6) {
        showToast('Tu baraja debe tener al menos 6 cartas para luchar', '⚠️');
        showScreen('deck');
        return;
    }
    initBattle();
    showScreen('battle');
}

function endTurn() {
    if (state.battle.turn !== 'p1' || state.battleStatus !== 'PLAYING') return;
    state.pendingTarget = null;
    state.battle.turn = 'p2';
    state.battleStatus = 'CPU_TURN';
    const cpu = state.battle.p2;
    cpu.energy = MAX_ENERGY;
    cpu.entities.forEach(e => e.usedThisTurn = false);
    processTurnStartStatuses('p2');
    checkMatchOver();
    if (state.battleStatus !== 'PLAYING' && state.battleStatus !== 'CPU_TURN') return;
    drawCardsForPlayer('p2', 1);
    state.battle.lastLog = `TURNO DE LA ${cpu.name.toUpperCase()}...`;
    updateBattleUI();
    setTimeout(playCpuTurnAI, 800);
}

/* -------------------------------------------------------------------------- */
/*                         5. BATTLE UI RENDER ENGINE                         */
/* -------------------------------------------------------------------------- */
function updateBattleUI() {
    const p1 = state.battle.p1;
    const p2 = state.battle.p2;
    const isTargeting = state.pendingTarget !== null;
    const targetingBanner = document.getElementById('targeting-banner');
    if (targetingBanner) {
        if (isTargeting) {
            targetingBanner.classList.remove('hidden');
            document.getElementById('targeting-banner-text').textContent = 
                `MODO SELECCIÓN DE OBJETIVO (${state.pendingTarget.targetScope}) - Haz clic en una entidad o Invocador válido.`;
        } else {
            targetingBanner.classList.add('hidden');
        }
    }

    const p1AvatarBox = document.getElementById('p1-avatar-box');
    document.getElementById('p1-name').textContent = p1.name;
    document.getElementById('p1-hp-text').textContent = `${p1.hp} / ${p1.maxHp}`;
    document.getElementById('p1-hp-bar').style.width = `${Math.max(0, (p1.hp / p1.maxHp) * 100)}%`;
    const p1Shield = document.getElementById('p1-shield-text');
    if (p1.shield > 0) {
        p1Shield.textContent = `🛡️ ${p1.shield}`;
        p1Shield.classList.remove('hidden');
    } else p1Shield.classList.add('hidden');

    if (p1AvatarBox) {
        const canTargetP1 = isTargeting && isValidTarget('p1', 'HERO', null, state.pendingTarget.targetScope);
        p1AvatarBox.className = `flex items-center justify-between transition-all p-1 ${
            canTargetP1 ? 'ring-4 ring-amber-400 bg-amber-50 cursor-pointer animate-pulse' : ''
        }`;
        p1AvatarBox.onclick = canTargetP1 ? () => selectTarget('p1', 'HERO') : null;
    }

    const p2AvatarBox = document.getElementById('p2-avatar-box');
    document.getElementById('p2-name').textContent = p2.name;
    document.getElementById('p2-hp-text').textContent = `${p2.hp} / ${p2.maxHp}`;
    document.getElementById('p2-hp-bar').style.width = `${Math.max(0, (p2.hp / p2.maxHp) * 100)}%`;
    const p2Shield = document.getElementById('p2-shield-text');
    if (p2.shield > 0) {
        p2Shield.textContent = `🛡️ ${p2.shield}`;
        p2Shield.classList.remove('hidden');
    } else p2Shield.classList.add('hidden');

    if (p2AvatarBox) {
        const canTargetP2 = isTargeting && isValidTarget('p2', 'HERO', null, state.pendingTarget.targetScope);
        p2AvatarBox.className = `flex items-center justify-between transition-all p-1 ${
            canTargetP2 ? 'ring-4 ring-amber-400 bg-amber-50 cursor-pointer animate-pulse' : ''
        }`;
        p2AvatarBox.onclick = canTargetP2 ? () => selectTarget('p2', 'HERO') : null;
    }

    renderEnergyDots('p1-energy-dots', p1.energy);
    renderEnergyDots('p2-energy-dots', p2.energy);
    renderBuffs('p1-buffs', p1);
    renderBuffs('p2-buffs', p2);

    const turnText = document.getElementById('turn-text');
    const dotP1 = document.getElementById('turn-dot-p1');
    const dotP2 = document.getElementById('turn-dot-p2');
    if (state.battle.turn === 'p1') {
        turnText.textContent = 'TU TURNO';
        dotP1.className = 'w-2 h-2 bg-black';
        dotP2.className = 'w-2 h-2 bg-neutral-300';
        document.getElementById('btn-end-turn').disabled = false;
    } else {
        turnText.textContent = 'TURNO IA';
        dotP1.className = 'w-2 h-2 bg-neutral-300';
        dotP2.className = 'w-2 h-2 bg-black';
        document.getElementById('btn-end-turn').disabled = true;
    }

    document.getElementById('combat-log').textContent = state.battle.lastLog;
    document.getElementById('deck-remaining-tag').textContent = `Mazo: ${p1.deck.length} rest.`;

    renderBoardEntities('p1-entities', 'p1');
    renderBoardEntities('p2-entities', 'p2');
    renderHandCards(p1, state.battle.turn === 'p1' && state.battleStatus === 'PLAYING');
}

function renderBoardEntities(containerId, playerKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    const player = state.battle[playerKey];
    
    if (!player.entities || player.entities.length === 0) {
        container.innerHTML = `<span class="text-[9px] font-mono text-neutral-400 italic py-1">Sin entidades invocadas</span>`;
        return;
    }

    const isMyTurn = state.battle.turn === playerKey && state.battleStatus === 'PLAYING';
    const isTargeting = state.pendingTarget !== null;

    player.entities.forEach((entity, index) => {
        const canAct = isMyTurn && !entity.usedThisTurn && !isTargeting;
        const canBeTargeted = isTargeting && isValidTarget(playerKey, 'ENTITY', entity.instanceId, state.pendingTarget.targetScope);
        
        const cardBox = document.createElement('div');
        cardBox.className = `flex flex-col items-center justify-between bg-white border border-neutral-300 p-1.5 w-28 sm:w-32 shrink-0 transition-all relative select-none ${
            entity.usedThisTurn ? 'opacity-60 grayscale' : ''
        } ${playerKey === 'p1' && !isTargeting ? 'cursor-grab active:cursor-grabbing' : ''} ${
            canBeTargeted ? 'ring-4 ring-amber-400 bg-amber-50 cursor-pointer animate-pulse' : ''
        }`;
        
        if (canBeTargeted) {
            cardBox.onclick = (e) => {
                e.stopPropagation();
                selectTarget(playerKey, 'ENTITY', entity.instanceId);
            };
        }

        if (playerKey === 'p1' && !isTargeting) {
            cardBox.draggable = true;
            cardBox.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'move';
                cardBox.classList.add('opacity-40');
            };
            cardBox.ondragend = () => {
                cardBox.classList.remove('opacity-40');
            };
            cardBox.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                cardBox.classList.add('bg-neutral-100');
            };
            cardBox.ondragleave = () => {
                cardBox.classList.remove('bg-neutral-100');
            };
            cardBox.ondrop = (e) => {
                e.preventDefault();
                cardBox.classList.remove('bg-neutral-100');
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (!isNaN(fromIndex) && fromIndex !== index) {
                    reorderEntityToPosition('p1', fromIndex, index);
                }
            };
        }

        const modeBadge = entity.mode === 'DEFEND' 
            ? '<span class="text-[7px] font-bold bg-blue-600 text-white px-1 py-0.2 uppercase">DEFENDIENDO</span>'
            : entity.mode === 'ATTACK'
            ? '<span class="text-[7px] font-bold bg-rose-600 text-white px-1 py-0.2 uppercase">ATACANDO</span>'
            : '<span class="text-[7px] font-bold bg-neutral-200 text-black px-1 py-0.2 uppercase">NEUTRO</span>';

        const statusBadges = (entity.statuses && entity.statuses.length > 0)
            ? `<div class="flex flex-wrap justify-center gap-0.5 my-0.5">
                ${entity.statuses.map(s => {
                    const sInfo = STATUS_EFFECTS_INFO[s.id] || { desc: s.name };
                    return `<span class="text-[7px] bg-purple-800 text-white px-1 font-bold cursor-pointer hover:bg-purple-600" title="${s.name} (${s.duration}t): ${sInfo.desc}" onclick="event.stopPropagation(); showToast('${s.name}: ${sInfo.desc}', '${s.emoji}')">${s.emoji}${s.duration}t</span>`;
                }).join('')}
               </div>`
            : '';

        const onInfoClick = canBeTargeted 
            ? `event.stopPropagation(); selectTarget('${playerKey}', 'ENTITY', '${entity.instanceId}')`
            : `event.stopPropagation(); showCardInfoModalByInstance('${playerKey}', '${entity.instanceId}')`;

        cardBox.innerHTML = `
            <div class="mb-1 flex items-center justify-between w-full">
                ${modeBadge}
                ${playerKey === 'p1' ? '<span class="text-[8px] text-neutral-400 font-mono" title="Arrastra para mover">⋮⋮</span>' : ''}
            </div>
            <div onclick="${onInfoClick}" class="w-full flex flex-col items-center cursor-pointer group">
                <div class="w-12 h-12 sm:w-14 sm:h-14 aspect-square relative bg-neutral-100 overflow-hidden mb-1 border border-neutral-200">
                    <img src="${entity.image}" alt="${entity.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' fill=\\'%23e4e4e7\\'><rect width=\\'100\\' height=\\'100\\'/></svg>';">
                </div>
                <span class="text-[8px] sm:text-[9px] font-bold font-mono text-black truncate w-full text-center uppercase leading-tight">${entity.name}</span>
                <div class="flex items-center gap-1.5 text-[8px] font-mono font-extrabold text-neutral-700 my-0.5">
                    <span>❤️ ${entity.hp}/${entity.maxHp}</span>
                    <span>⚔️ ${entity.atk}</span>
                </div>
                ${statusBadges}
            </div>
            
            <div class="w-full mt-1">
                ${playerKey === 'p1' ? `
                    <div class="grid grid-cols-3 gap-0.5 w-full">
                        <button 
                            onclick="event.stopPropagation(); executeEntityAction('p1', '${entity.instanceId}', 'ATTACK')"
                            ${!canAct ? 'disabled' : ''}
                            class="py-0.5 text-[7px] font-mono font-bold uppercase transition-all ${
                                canAct ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                            }">
                            ATK
                        </button>
                        <button 
                            onclick="event.stopPropagation(); executeEntityAction('p1', '${entity.instanceId}', 'DEFEND')"
                            ${!isMyTurn || isTargeting ? 'disabled' : ''}
                            class="py-0.5 text-[7px] font-mono font-bold uppercase transition-all ${
                                isMyTurn && !isTargeting ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                            }">
                            DEF
                        </button>
                        <button 
                            onclick="event.stopPropagation(); executeEntityAction('p1', '${entity.instanceId}', 'USE')"
                            ${!canAct ? 'disabled' : ''}
                            class="py-0.5 text-[7px] font-mono font-bold uppercase transition-all ${
                                canAct ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                            }">
                            USAR
                        </button>
                    </div>
                ` : `
                    <span class="block w-full text-center text-[8px] font-mono font-bold py-0.5 ${
                        entity.usedThisTurn ? 'bg-neutral-200 text-neutral-500' : 'bg-black text-white'
                    } uppercase">
                        ${entity.usedThisTurn ? 'USADO' : 'LISTO'}
                    </span>
                `}
            </div>
        `;
        container.appendChild(cardBox);
    });
}

function showCardInfoModalByInstance(playerKey, instanceId) {
    const player = state.battle[playerKey];
    if (!player) return;
    const entity = player.entities.find(e => e.instanceId === instanceId);
    if (entity) {
        showCardInfoModal(entity);
    }
}

function showCardInfoModal(cardData) {
    const modal = document.getElementById('modal-card-info');
    if (!modal) return;
    
    const elemInfo = ELEMENT_INFO[cardData.element] || { name: cardData.element, emoji: '⚡' };
    const typeInfo = CARD_TYPES[cardData.type] || { name: cardData.type, emoji: '📌' };
    
    document.getElementById('info-card-elem').textContent = `${elemInfo.emoji} ${elemInfo.name}`;
    document.getElementById('info-card-cost').textContent = `${cardData.cost} ENERGÍA`;
    document.getElementById('info-card-img').src = cardData.image;
    document.getElementById('info-card-title').textContent = cardData.name;
    document.getElementById('info-card-type').textContent = `TIPO: ${typeInfo.name}`;
    
    let descText = cardData.desc || 'Sin descripción disponible.';
    if (cardData.statuses && cardData.statuses.length > 0) {
        descText += '\n\nEstados Alterados Actuales:';
        cardData.statuses.forEach(s => {
            const statusInfo = STATUS_EFFECTS_INFO[s.id] || { name: s.name, desc: '' };
            descText += `\n • ${s.emoji} ${statusInfo.name || s.name} (${s.duration} turnos): ${statusInfo.desc}`;
        });
    }
    const descEl = document.getElementById('info-card-desc');
    descEl.style.whiteSpace = 'pre-line';
    descEl.textContent = descText;
    
    modal.classList.remove('hidden');
}

function closeCardInfoModal() {
    const modal = document.getElementById('modal-card-info');
    if (modal) modal.classList.add('hidden');
}

function renderEnergyDots(containerId, count) {
    const el = document.getElementById(containerId);
    el.innerHTML = '<span class="text-[9px] text-neutral-400 font-mono font-bold mr-0.5 uppercase">ENERGÍA</span>';
    for (let i = 0; i < MAX_ENERGY; i++) {
        const dot = document.createElement('div');
        dot.className = `w-2.5 h-2.5 ${i < count ? 'bg-black' : 'bg-neutral-200'}`;
        el.appendChild(dot);
    }
}

function renderBuffs(containerId, player) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (player.boost > 1) {
        const b = document.createElement('span');
        b.className = 'text-[8px] bg-black text-white px-1.5 py-0.5 font-mono font-bold uppercase';
        b.textContent = '⚡ X1.5 DAÑO';
        container.appendChild(b);
    }
    if (player.statuses && player.statuses.length > 0) {
        player.statuses.forEach(s => {
            const sInfo = STATUS_EFFECTS_INFO[s.id] || { desc: s.name };
            const badge = document.createElement('span');
            badge.className = 'text-[8px] bg-purple-900 text-white px-1.5 py-0.5 font-mono font-bold uppercase tracking-wider shadow-sm flex items-center gap-1 cursor-pointer hover:bg-purple-700 transition-colors';
            badge.innerHTML = `${s.emoji} ${s.name} (${s.duration}t)`;
            badge.title = `${s.name} (${s.duration} turnos): ${sInfo.desc}`;
            badge.onclick = () => {
                showToast(`${s.name}: ${sInfo.desc}`, s.emoji);
            };
            container.appendChild(badge);
        });
    }
}

function renderHandCards(player, isMyTurn) {
    const handContainer = document.getElementById('hand-container');
    handContainer.innerHTML = '';
    const isTargeting = state.pendingTarget !== null;
    
    player.hand.forEach((card) => {
        const canAfford = player.energy >= card.cost && isMyTurn && !isTargeting;
        const typeData = CARD_TYPES[card.type] || { name: card.type, emoji: '📌' };
        const elemData = ELEMENT_INFO[card.element] || { name: card.element, emoji: '⚡' };
        
        const cardEl = document.createElement('div');
        cardEl.className = `card-playable relative flex-shrink-0 w-32 sm:w-36 h-[260px] p-2 flex flex-col justify-between border border-neutral-300 shadow-sm ${
            canAfford ? 'cursor-pointer opacity-100 bg-white hover:bg-neutral-100 hover:-translate-y-2' : 'opacity-40 cursor-not-allowed bg-neutral-100 filter grayscale'
        }`;
        
        cardEl.innerHTML = `
            <div class="flex items-center justify-between mb-1 flex-shrink-0">
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-black text-white uppercase">
                    ${elemData.emoji} ${elemData.name}
                </span>
                <span class="font-mono text-[10px] font-extrabold px-1.5 py-0.5 bg-neutral-200 text-black">
                    ${card.cost} EN
                </span>
            </div>
            
            <div class="relative w-full aspect-square overflow-hidden my-1 bg-neutral-200 border border-neutral-200 flex-shrink-0">
                <img src="${card.image}" alt="${card.name}" class="w-full h-full object-cover card-image-square" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'100\\' fill=\\'%23e4e4e7\\'><rect width=\\'100\\' height=\\'100\\'/></svg>';">
            </div>
            <div class="my-0.5 flex-1 flex flex-col min-h-0">
                <h4 class="font-extrabold text-xs font-mono uppercase text-black leading-tight truncate flex-shrink-0">${card.name}</h4>
                <p class="text-[9px] text-neutral-600 mt-0.5 leading-tight overflow-y-auto font-mono flex-1">${card.desc}</p>
            </div>
            <div class="flex items-center justify-between pt-1 mt-auto border-t border-neutral-200 flex-shrink-0">
                <span class="text-[8px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                    ${typeData.emoji} ${typeData.name}
                </span>
            </div>
        `;
        
        if (canAfford) {
            cardEl.onclick = () => playCard(card.uid);
        }
        handContainer.appendChild(cardEl);
    });
}

function createFloatingText(targetPlayerKey, text, color) {
    const boardId = targetPlayerKey === 'p1' ? 'p1-board' : 'p2-board';
    const board = document.getElementById(boardId);
    if (!board) return;
    
    const rect = board.getBoundingClientRect();
    const floatEl = document.createElement('div');
    floatEl.className = 'float-text fixed font-mono font-black text-xs sm:text-sm z-50 bg-black text-white px-2 py-1 shadow-lg';
    floatEl.style.left = `${rect.left + rect.width / 2 - 20}px`;
    floatEl.style.top = `${rect.top + 20}px`;
    floatEl.textContent = text;
    document.body.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 800);
}

function triggerParticlesAtPlayer(targetPlayerKey, color) {
    const boardId = targetPlayerKey === 'p1' ? 'p1-board' : 'p2-board';
    const board = document.getElementById(boardId);
    if (board) {
        const rect = board.getBoundingClientRect();
        spawnParticlesAt(rect.left + rect.width / 2, rect.top + rect.height / 2, color);
    }
}

function togglePauseModal() {
    const modal = document.getElementById('modal-pause');
    if (modal) modal.classList.toggle('hidden');
}

function restartMatch() {
    document.getElementById('modal-gameover').classList.add('hidden');
    initBattle();
}