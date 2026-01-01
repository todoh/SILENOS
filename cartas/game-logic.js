// --- LÓGICA DEL JUEGO (HOOK PERSONALIZADO) ---

const useGameLogic = ({ user, userData, onBack, gameConfig }) => {
    const [peer, setPeer] = React.useState(null);
    const [conn, setConn] = React.useState(null);
    const [myPeerId, setMyPeerId] = React.useState("");
    const [targetPeerId, setTargetPeerId] = React.useState("");
    const [status, setStatus] = React.useState("init");
    const [gameLog, setGameLog] = React.useState([]);
    const [gameState, setGameState] = React.useState(getInitialGameState());

    const addLog = (msg) => setGameLog(prev => [msg, ...prev].slice(0, 10));
    const sendLog = (msg) => { if(conn) conn.send({ type: 'LOG_MSG', payload: { msg } }); addLog(msg); };
    const sendStateUpdate = (newState) => { if(conn) conn.send({ type: 'UPDATE_STATE', payload: newState }); };

    const gameContext = {
        user, userData, onBack, gameConfig,
        peer, conn, status, gameLog, gameState,
        setPeer, setConn, setStatus, setGameState, 
        addLog, sendLog, sendStateUpdate
    };

    React.useEffect(() => {
        const newPeer = new Peer(null, { debug: 2 });
        
        newPeer.on('open', (id) => {
            setMyPeerId(id);
            
            // LÓGICA AGREGADA: Si es modo desafío a amigo, enviamos la invitación a Firebase aquí
            if (gameConfig.mode === 'host_friend' && gameConfig.targetFriendId) {
                setStatus("waiting"); // Esperando que el amigo acepte y se conecte
                addLog("Tu ID generado. Enviando desafío al amigo...");
                
                db.collection('users').doc(gameConfig.targetFriendId).update({
                    incomingChallenge: {
                        hostPeerId: id,
                        hostName: userData.username,
                        timestamp: Date.now()
                    }
                })
                .then(() => {
                    addLog("¡Desafío enviado! Esperando a que acepte...");
                })
                .catch(err => {
                    console.error("Error enviando desafío:", err);
                    addLog("Error al enviar el desafío.");
                });
            }
            // Lógica existente para unirse a un amigo
            else if (gameConfig.mode === 'join_friend' && gameConfig.targetPeerId) {
                setTargetPeerId(gameConfig.targetPeerId);
                setTimeout(() => {
                    const c = newPeer.connect(gameConfig.targetPeerId);
                    setupConnection(c, false);
                    setStatus("connecting");
                }, 500);
            } 
            else { 
                setStatus("waiting"); 
            }
        });

        newPeer.on('connection', (c) => setupConnection(c, true));
        setPeer(newPeer);
        return () => newPeer.destroy();
    }, []);

    // Detectar inicio de turno real
    React.useEffect(() => {
        if (gameState.turn === gameState.myPlayerId && status === 'playing') {
            // Solo procesamos start si acabamos de recibir el turno (o es el primero)
            // Usamos una flag o checkeamos si ya estamos en una fase válida para evitar loop
            // Simplificación: GameActions.startTurn gestiona la lógica idempotente o se llama desde el evento de red.
            // MOVEMOS LA LOGICA A GAME-NETWORK al recibir 'pass_turn'.
        }
    }, [gameState.turn]);

    const connectToPeer = () => {
        if (!targetPeerId) return;
        setStatus("connecting");
        const c = peer.connect(targetPeerId);
        setupConnection(c, false);
    };

    const setupConnection = (c, amIHost) => {
        setConn(c);
        c.on('open', () => {
            setStatus("playing");
            addLog("Conexión establecida!");
            const myId = amIHost ? 0 : 1;
            
            // Construir mazo (mapeando IDs a objetos completos de data.js)
            const myDeckIds = userData.deck || [1,1,2,2,6,6,6,6,4,5];
            const myDeck = myDeckIds.map(id => {
                const base = ALL_CARDS.find(card => card.id === id);
                return base ? JSON.parse(JSON.stringify(base)) : null; // Deep copy para evitar ref compartida
            }).filter(Boolean);

            // Barajar
            for (let i = myDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [myDeck[i], myDeck[j]] = [myDeck[j], myDeck[i]];
            }
            const initialHand = myDeck.splice(0, 4); // Mano inicial de 4

            setGameState(prev => {
                const newPlayers = [...prev.players];
                newPlayers[myId] = { 
                    ...newPlayers[myId], 
                    name: userData.username, 
                    deck: myDeck, 
                    hand: initialHand,
                    maxHp: 30 // No se usa, es por compatibilidad
                };
                return { ...prev, myPlayerId: myId, players: newPlayers };
            });

            c.send({ type: 'INIT_HANDSHAKE', payload: { name: userData.username, deckCount: myDeck.length } });
            
            // Si soy host, empiezo yo
            if(amIHost) {
                 setTimeout(() => GameActions.startTurn({ ...gameContext, gameState: getInitialGameState() /*hack inicial*/, setGameState }), 1000);
            }
        });

        c.on('data', (data) => {
            GameNetwork.handleIncomingData(data, { 
                setGameState, addLog, onBack, user, conn, gameState: { ...gameState }, 
                // Pasamos funciones para startTurn
                runStartTurn: () => GameActions.startTurn({ setGameState, gameState: { ...gameState }, sendStateUpdate, addLog })
            });
        });
        c.on('close', () => { alert("Desconexión."); onBack(); });
    };

    return {
        peer, conn, myPeerId, targetPeerId, setTargetPeerId,
        status, gameLog, gameState,
        connectToPeer, 
        // Nuevas acciones expuestas
        playCard: (idx) => GameActions.playCard(idx, gameContext),
        useAbility: (uuid, abId) => GameActions.useAbility(uuid, abId, gameContext),
        advancePhase: () => GameActions.advancePhase(gameContext),
        assignDefender: (actUuid, blkUuid) => GameActions.assignDefender(actUuid, blkUuid, gameContext)
    };
};