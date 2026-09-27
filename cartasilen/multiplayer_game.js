/* -------------------------------------------------------------------------- */
/*                       MULTIPLAYER GAME SYNCHRONIZATION                      */
/* -------------------------------------------------------------------------- */

function startMultiplayerMatch(matchId, role, hostDeckCardIds, myDeckCardIds = null, hostName = null) {
    mpState.currentMatchId = matchId;
    mpState.role = role;
    updatePresence('PLAYING');
    state.isMultiplayer = true;
    state.turnCount = 1;
    state.battleStatus = 'PLAYING';
    state.pendingTarget = null;

    const matchRef = db.ref(`matches/${matchId}`);

    if (role === 'p1') {
        const p1DeckCards = createInstanceCards(shuffle(hostDeckCardIds));
        
        state.battle = {
            turn: 'p1',
            lastLog: `⚔️ Duelo multijugador iniciado. Es tu turno.`,
            lastCardPlayed: null,
            p1: { id: mpState.playerId, name: mpState.playerName, avatar: '🧙‍♂️', hp: MAX_HP, maxHp: MAX_HP, energy: INITIAL_ENERGY, maxEnergy: INITIAL_ENERGY, shield: 0, boost: 1, statuses: [], deck: p1DeckCards, hand: [], discard: [], entities: [] },
            p2: { id: 'pending', name: 'Oponente', avatar: '🥷', hp: MAX_HP, maxHp: MAX_HP, energy: INITIAL_ENERGY, maxEnergy: INITIAL_ENERGY, shield: 0, boost: 1, statuses: [], deck: [], hand: [], discard: [], entities: [] }
        };

        drawCardsForPlayer('p1', HAND_SIZE);

        matchRef.set({
            battle: state.battle,
            lastUpdated: firebase.database.ServerValue.TIMESTAMP
        });

        listenToMatchUpdates(matchId);
        showScreen('battle');
        updateBattleUI();
    } else if (role === 'p2') {
        const p2DeckCards = createInstanceCards(shuffle(myDeckCardIds));

        // Escuchar activamente hasta que P1 cree el objeto de batalla en Firebase
        const onMatchInit = matchRef.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && data.battle) {
                matchRef.off('value', onMatchInit); // Desvincular listener de inicialización

                state.battle = data.battle;
                state.battle.p1 = state.battle.p1 || {};
                state.battle.p1.entities = state.battle.p1.entities || [];
                state.battle.p1.hand = state.battle.p1.hand || [];
                state.battle.p1.deck = state.battle.p1.deck || [];
                state.battle.p1.discard = state.battle.p1.discard || [];
                state.battle.p1.statuses = state.battle.p1.statuses || [];

                state.battle.p2 = {
                    id: mpState.playerId,
                    name: mpState.playerName,
                    avatar: '🥷',
                    hp: MAX_HP,
                    maxHp: MAX_HP,
                    energy: INITIAL_ENERGY,
                    maxEnergy: INITIAL_ENERGY,
                    shield: 0,
                    boost: 1,
                    statuses: [],
                    deck: p2DeckCards,
                    hand: [],
                    discard: [],
                    entities: []
                };

                drawCardsForPlayer('p2', HAND_SIZE);
                state.battle.lastLog = `⚔️ Batalla contra ${hostName || 'Oponente'}. Turno de ${state.battle.p1.name}.`;
                
                syncMultiplayerBattleState();
                listenToMatchUpdates(matchId);
                showScreen('battle');
                updateBattleUI();
            }
        });
    }
}

function endTurnMP() {
    const myKey = mpState.role;
    if (!myKey || state.battle.turn !== myKey || state.battleStatus !== 'PLAYING') return;

    state.pendingTarget = null;
    const opponentKey = myKey === 'p1' ? 'p2' : 'p1';
    state.battle.turn = opponentKey;

    if (opponentKey === 'p1') {
        state.turnCount = (state.turnCount || 1) + 1;
    }

    const nextPlayer = state.battle[opponentKey];
    if (nextPlayer) {
        nextPlayer.maxEnergy = Math.min(10, (nextPlayer.maxEnergy || 1) + 1);
        nextPlayer.energy = nextPlayer.maxEnergy;
        if (nextPlayer.entities) {
            nextPlayer.entities.forEach(e => e.usedThisTurn = false);
        }
    }

    processTurnStartStatuses(opponentKey);
    checkMatchOverMP();

    if (state.battleStatus !== 'PLAYING') {
        syncMultiplayerBattleState();
        updateBattleUI();
        return;
    }

    drawCardsForPlayer(opponentKey, 1);
    state.battle.lastLog = `Turno de ${nextPlayer ? nextPlayer.name : 'Oponente'} (${state.turnCount}).`;

    syncMultiplayerBattleState();
    updateBattleUI();
}

function syncMultiplayerBattleState() {
    if (!state.isMultiplayer || !mpState.currentMatchId) return;
    db.ref(`matches/${mpState.currentMatchId}/battle`).set(state.battle);
}

function listenToMatchUpdates(matchId) {
    const battleRef = db.ref(`matches/${matchId}/battle`);
    mpState.listeners.match = battleRef.on('value', (snapshot) => {
        const remoteBattle = snapshot.val();
        if (remoteBattle) {
            // Garantizar arrays vacíos cuando Firebase los elimina en la BD
            ['p1', 'p2'].forEach(pKey => {
                if (remoteBattle[pKey]) {
                    remoteBattle[pKey].entities = remoteBattle[pKey].entities || [];
                    remoteBattle[pKey].hand = remoteBattle[pKey].hand || [];
                    remoteBattle[pKey].deck = remoteBattle[pKey].deck || [];
                    remoteBattle[pKey].discard = remoteBattle[pKey].discard || [];
                    remoteBattle[pKey].statuses = remoteBattle[pKey].statuses || [];
                }
            });

            state.battle = remoteBattle;
            recalculatePositionAuras('p1');
            recalculatePositionAuras('p2');
            updateBattleUI();
            checkMatchOverMP();
        }
    });
}

function leaveMultiplayerMatch() {
    if (mpState.currentMatchId) {
        db.ref(`matches/${mpState.currentMatchId}`).remove();
        if (mpState.listeners.match) db.ref(`matches/${mpState.currentMatchId}/battle`).off('value', mpState.listeners.match);
    }
    state.isMultiplayer = false;
    mpState.currentMatchId = null;
    mpState.role = null;
    updatePresence('FREE');
    showScreen('home');
}

function checkMatchOverMP() {
    if (!state.isMultiplayer || !state.battle) return;

    const p1 = state.battle.p1;
    const p2 = state.battle.p2;

    if ((p1 && p1.hp <= 0) || (p2 && p2.hp <= 0)) {
        state.battleStatus = 'GAME_OVER';
        const myKey = mpState.role;
        const iWon = state.battle[myKey] && state.battle[myKey].hp > 0;

        document.getElementById('gameover-icon').textContent = iWon ? '🏆' : '💀';
        document.getElementById('gameover-title').textContent = iWon ? '⚔️ VICTORIA MULTIJUGADOR!' : '💀 DERROTA MULTIJUGADOR';
        document.getElementById('gameover-subtitle').textContent = iWon 
            ? 'Has demostrado tu supremacía elemental online.' 
            : 'Tu oponente te ha superado en combate.';
        document.getElementById('stat-final-turn').textContent = `Turno ${state.turnCount}`;
        document.getElementById('stat-final-hp').textContent = `${state.battle[myKey] ? state.battle[myKey].hp : 0} HP`;
        document.getElementById('modal-gameover').classList.remove('hidden');
    }
}