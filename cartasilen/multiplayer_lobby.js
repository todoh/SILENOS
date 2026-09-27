/* -------------------------------------------------------------------------- */
/*                       MULTIPLAYER LOBBY MANAGEMENT                         */
/* -------------------------------------------------------------------------- */

function handleMultiplayerLobbyClick() {
    if (state.activeDeckCardIds.length < 10) {
        showToast('Tu baraja debe tener al menos 10 cartas para luchar en multijugador', '⚠️');
        showScreen('deck');
        return;
    }

    if (!mpState.playerName) {
        openPlayerNameModal();
    } else {
        openLobbyScreen();
    }
}

function openPlayerNameModal() {
    const modal = document.getElementById('modal-player-name');
    const input = document.getElementById('player-name-input');
    if (modal && input) {
        input.value = mpState.playerName || '';
        modal.classList.remove('hidden');
        setTimeout(() => { input.focus(); input.select(); }, 100);
    }
}

function closePlayerNameModal() {
    const modal = document.getElementById('modal-player-name');
    if (modal) modal.classList.add('hidden');
}

function confirmPlayerNameModal() {
    const input = document.getElementById('player-name-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) {
        showToast('Introduce un nombre válido', '⚠️');
        return;
    }
    setMpPlayerName(val);
    closePlayerNameModal();
    openLobbyScreen();
}

function openLobbyScreen() {
    updatePresence('FREE');
    showScreen('lobby');
    listenToOnlinePlayers();
    listenToInvitations();
    
    const nameDisplay = document.getElementById('lobby-my-name');
    if (nameDisplay) nameDisplay.textContent = mpState.playerName;
}

function closeLobbyScreen() {
    removePresence();
    if (mpState.listeners.players) db.ref('players').off('value', mpState.listeners.players);
    if (mpState.listeners.invitations) db.ref('invitations/' + mpState.playerId).off('child_added', mpState.listeners.invitations);
    showScreen('home');
}

function listenToOnlinePlayers() {
    const playersRef = db.ref('players');
    mpState.listeners.players = playersRef.on('value', (snapshot) => {
        const playersData = snapshot.val() || {};
        renderOnlinePlayersList(playersData);
    });
}

function renderOnlinePlayersList(playersData) {
    const container = document.getElementById('lobby-players-list');
    if (!container) return;
    container.innerHTML = '';

    const otherPlayers = Object.values(playersData).filter(p => p.id !== mpState.playerId);

    const countEl = document.getElementById('lobby-online-count');
    if (countEl) countEl.textContent = `${otherPlayers.length} JUGADORES CONECTADOS`;

    if (otherPlayers.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-neutral-400 font-mono text-xs uppercase bg-neutral-50 border border-neutral-200">
                No hay otros jugadores en la sala actualmente.<br/>
                Permanece en esta sala para recibir desafíos de otros convocadores.
            </div>
        `;
        return;
    }

    otherPlayers.forEach(player => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 bg-white border border-neutral-200 shadow-sm';

        const isFree = player.status === 'FREE';
        const statusBadge = isFree 
            ? `<span class="px-2.5 py-1 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">LIBRE</span>`
            : `<span class="px-2.5 py-1 text-[9px] font-mono font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">JUGANDO</span>`;

        const actionBtn = isFree
            ? `<button onclick="sendInvitation('${player.id}', '${player.name}')" class="btn-brutalist px-4 py-2 text-xs font-bold">INVITAR</button>`
            : `<button disabled class="btn-brutalist-outline px-4 py-2 text-xs font-bold opacity-40 cursor-not-allowed">JUGANDO</button>`;

        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-black text-white font-mono font-bold flex items-center justify-center text-xs">
                    ${player.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <h4 class="font-extrabold text-xs sm:text-sm font-mono uppercase text-black leading-tight">${player.name}</h4>
                    <span class="text-[9px] font-mono text-neutral-400 block uppercase">${player.deckCardIds ? player.deckCardIds.length : 10} cartas en mazo</span>
                </div>
            </div>
            <div class="flex items-center gap-3">
                ${statusBadge}
                ${actionBtn}
            </div>
        `;
        container.appendChild(item);
    });
}

function sendInvitation(targetPlayerId, targetPlayerName) {
    const activeDeck = getActiveDeck();
    const invitationRef = db.ref(`invitations/${targetPlayerId}`).push();
    
    const invitationData = {
        id: invitationRef.key,
        fromId: mpState.playerId,
        fromName: mpState.playerName,
        fromDeck: activeDeck ? activeDeck.cardIds : [...PRESET_BALANCED],
        status: 'PENDING',
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    invitationRef.set(invitationData);
    showToast(`Invitación enviada a ${targetPlayerName}`, '✉️');

    invitationRef.on('value', (snapshot) => {
        const inv = snapshot.val();
        if (!inv) return;
        if (inv.status === 'REJECTED') {
            showToast(`${targetPlayerName} rechazó la invitación`, '❌');
            invitationRef.off();
            invitationRef.remove();
        } else if (inv.status === 'ACCEPTED' && inv.matchId) {
            showToast(`${targetPlayerName} aceptó la batalla`, '⚔️');
            invitationRef.off();
            invitationRef.remove();
            startMultiplayerMatch(inv.matchId, 'p1', inv.fromDeck);
        }
    });
}

let activeInvitationData = null;

function listenToInvitations() {
    const invRef = db.ref(`invitations/${mpState.playerId}`);
    mpState.listeners.invitations = invRef.on('child_added', (snapshot) => {
        const inv = snapshot.val();
        if (inv && inv.status === 'PENDING') {
            activeInvitationData = inv;
            showInvitationModal(inv);
        }
    });
}

function showInvitationModal(inv) {
    const modal = document.getElementById('modal-invitation');
    const textEl = document.getElementById('invitation-modal-text');
    if (modal && textEl) {
        textEl.textContent = `${inv.fromName.toUpperCase()} te ha invitado a una Batalla Multijugador.`;
        modal.classList.remove('hidden');
    }
}

function respondInvitation(accepted) {
    const modal = document.getElementById('modal-invitation');
    if (modal) modal.classList.add('hidden');

    if (!activeInvitationData) return;

    const invRef = db.ref(`invitations/${mpState.playerId}/${activeInvitationData.id}`);

    if (!accepted) {
        invRef.update({ status: 'REJECTED' });
        showToast('Invitación rechazada', 'ℹ️');
        activeInvitationData = null;
    } else {
        const matchId = 'match_' + Math.random().toString(36).substring(2, 9);
        const myActiveDeck = getActiveDeck();

        invRef.update({
            status: 'ACCEPTED',
            matchId: matchId
        });

        startMultiplayerMatch(matchId, 'p2', activeInvitationData.fromDeck, myActiveDeck ? myActiveDeck.cardIds : [...PRESET_BALANCED], activeInvitationData.fromName);
        activeInvitationData = null;
    }
}

function ignoreInvitation() {
    const modal = document.getElementById('modal-invitation');
    if (modal) modal.classList.add('hidden');
    if (activeInvitationData) {
        db.ref(`invitations/${mpState.playerId}/${activeInvitationData.id}`).remove();
        activeInvitationData = null;
    }
}