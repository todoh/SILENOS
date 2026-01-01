// --- LÓGICA DE RED Y MANEJO DE MENSAJES ---

const GameNetwork = {
    handleIncomingData: (data, context) => {
        const { type, payload } = data;
        const { setGameState, addLog, onBack, user, runStartTurn } = context;
        
        if (type === 'INIT_HANDSHAKE') {
            setGameState(prev => {
                const opId = prev.myPlayerId === 0 ? 1 : 0;
                const newPlayers = [...prev.players];
                newPlayers[opId].name = payload.name;
                newPlayers[opId].deck = Array(payload.deckCount).fill({}); 
                return { ...prev, players: newPlayers };
            });
            addLog(`Oponente ${payload.name} conectado.`);
        }
        else if (type === 'pass_turn') {
            // El rival me pasó el turno.
            // payload contiene: { turn: myId, incomingStack: [...] }
            setGameState(prev => ({
                ...prev,
                incomingStack: payload.incomingStack || []
            }));
            
            // Iniciar mi turno lógica (Fases, Energía)
            setTimeout(() => runStartTurn(), 100);
        }
        else if (type === 'UPDATE_STATE') {
            setGameState(prev => {
                const incomingPlayers = payload.players;
                const myId = prev.myPlayerId;
                
                // Merge inteligente para no pisar mi mano/deck ocultos
                const mergedPlayers = incomingPlayers.map((p, idx) => {
                    if (idx === myId) {
                        return {
                            ...p,
                            hand: prev.players[myId].hand,
                            deck: prev.players[myId].deck,
                            retirement: prev.players[myId].retirement
                        };
                    }
                    return p;
                });

                return {
                    ...prev,
                    players: mergedPlayers
                };
            });
        }
        else if (type === 'DAMAGE_REPORT') {
            // Mi carta atacó y perdió, recibo el daño de vuelta
            const { targetUuid, targetName, damage } = payload;
            addLog(`Tu ${targetName} sufrió ${damage} daño al atacar.`);

            setGameState(prev => {
                const myId = prev.myPlayerId;
                const newPlayers = [...prev.players];
                const me = newPlayers[myId];

                // Buscar la carta por UUID
                const cardIndex = me.field.findIndex(c => c.uuid === targetUuid);
                
                if (cardIndex !== -1) {
                    const card = me.field[cardIndex];
                    card.currentHp -= damage;
                    
                    if (card.currentHp <= 0) {
                        addLog(`${card.name} ha muerto por el contraataque.`);
                        me.field.splice(cardIndex, 1);
                        me.retirement.push(card);
                    }
                }
                return { ...prev, players: newPlayers };
            });
        }
        else if (type === 'GAME_OVER') {
            if(payload.winner === context.gameState.myPlayerId) {
                alert("¡VICTORIA! Alcanzaste 30 Puntos.");
                db.collection('users').doc(user.uid).update({ korehs: firebase.firestore.FieldValue.increment(50) });
            } else {
                alert("DERROTA. El rival alcanzó 30 Puntos.");
                 db.collection('users').doc(user.uid).update({ korehs: firebase.firestore.FieldValue.increment(10) });
            }
            onBack();
        }
        else if (type === 'LOG_MSG') {
            addLog(payload.msg);
        }
    }
};