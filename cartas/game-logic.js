
// --- LÓGICA DEL JUEGO (HOOK PERSONALIZADO) ---
// Sobreescribir: Cartas Silen/game-logic.js

const useGameLogic = ({ user, userData, onBack, gameConfig }) => {
    const [peer, setPeer] = React.useState(null);
    const [conn, setConn] = React.useState(null);
    const [myPeerId, setMyPeerId] = React.useState("");
    const [targetPeerId, setTargetPeerId] = React.useState("");
    const [status, setStatus] = React.useState("init");
    const [gameLog, setGameLog] = React.useState([]);
    const [gameState, setGameState] = React.useState(getInitialGameState());

    const addLog = (msg) => setGameLog(prev => [msg, ...prev].slice(0, 10));
    
    // En modo IA, sendLog solo loguea localmente. En online, envía.
    const sendLog = (msg) => { 
        if(conn) conn.send({ type: 'LOG_MSG', payload: { msg } }); 
        addLog(msg); 
    };

    // En modo IA, sendStateUpdate no hace nada (estado compartido). En online, envía.
    const sendStateUpdate = (newState) => { 
        if(conn) conn.send({ type: 'UPDATE_STATE', payload: newState }); 
    };

    const gameContext = {
        user, userData, onBack, gameConfig,
        peer, conn, status, gameLog, gameState,
        setPeer, setConn, setStatus, setGameState, 
        addLog, sendLog, sendStateUpdate
    };

    React.useEffect(() => {
        // --- MODO OFFLINE / IA ---
        if (gameConfig.mode === 'ai') {
            setStatus("playing");
            addLog("Iniciando simulación contra la Máquina...");
            
            // Construir mazo del jugador
            const myDeckIds = userData.deck || [1,1,2,2,6,6,6,6,4,5];
            const myDeck = buildDeck(myDeckIds);
            const initialHand = myDeck.splice(0, 4);

            // Construir mazo de la IA (Aleatorio del pool completo)
            const aiDeckIds = Array(30).fill(0).map(() => ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)].id);
            const aiDeck = buildDeck(aiDeckIds);
            const aiHand = aiDeck.splice(0, 4);

            setGameState(prev => {
                const newPlayers = [...prev.players];
                // Jugador (ID 0)
                newPlayers[0] = { 
                    ...newPlayers[0], 
                    name: userData.username, 
                    deck: myDeck, 
                    hand: initialHand,
                    maxHp: 30
                };
                // IA (ID 1)
                newPlayers[1] = {
                    ...newPlayers[1],
                    name: "Silenos AI",
                    deck: aiDeck,
                    hand: aiHand,
                    maxHp: 30
                };
                return { ...prev, myPlayerId: 0, players: newPlayers };
            });

            // Iniciar juego (Turno 0 - Jugador)
            setTimeout(() => {
                 GameActions.startTurn({ ...gameContext, gameState: getInitialGameState(), setGameState });
            }, 1000);

            return; // Salir, no inicializar PeerJS
        }

        // --- MODO ONLINE (PEERJS) ---
        const newPeer = new Peer(null, { debug: 1 });
        
        newPeer.on('open', (id) => {
            console.log("Mi Peer ID:", id);
            setMyPeerId(id);

            // --- MODO HOST (CREAR DESAFÍO) ---
            if (gameConfig.mode === 'host_friend' && gameConfig.targetFriendId) {
                setStatus("waiting");
                addLog("Generando sala... Desafío enviado.");
                
                db.collection('users').doc(gameConfig.targetFriendId).update({
                    incomingChallenge: {
                        hostPeerId: id,
                        hostName: userData.username,
                        timestamp: Date.now()
                    }
                }).catch(err => console.error("Error enviando desafío:", err));
            }
            // --- MODO JOIN AUTOMÁTICO ---
            else if (gameConfig.mode === 'join_friend' && gameConfig.targetPeerId) {
                setTargetPeerId(gameConfig.targetPeerId);
                setStatus("connecting");
                addLog("Conectando con el rival...");

                setTimeout(() => {
                    if(newPeer.destroyed) return;
                    const c = newPeer.connect(gameConfig.targetPeerId, { reliable: true });
                    if(!c) { alert("Error crítico."); onBack(); return; }
                    c.on('error', (err) => { alert("Fallo al conectar."); onBack(); });
                    setupConnection(c, false);
                }, 1000);
            } 
            else { 
                setStatus("waiting"); 
            }
        });

        newPeer.on('error', (err) => {
            console.error("Peer Error:", err);
            if (err.type === 'peer-unavailable') {
                alert("Rival no encontrado o desconectado.");
                onBack(); 
            } else {
                addLog(`Error de red: ${err.type}`);
            }
        });

        newPeer.on('connection', (c) => {
            console.log("¡Alguien se está conectando!", c.peer);
            setupConnection(c, true);
        });

        setPeer(newPeer);

        return () => {
            newPeer.destroy();
            console.log("Peer destruido.");
        };
    }, []); 

    // Helper para construir mazos
    const buildDeck = (ids) => {
        const deck = ids.map(id => {
            const base = ALL_CARDS.find(card => card.id === id);
            return base ? JSON.parse(JSON.stringify(base)) : null;
        }).filter(Boolean);
        // Barajar
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    };

    const setupConnection = (c, amIHost) => {
        setConn(c);
        
        c.on('open', () => {
            setStatus("playing");
            addLog("¡Conectado con éxito!");
            
            const myId = amIHost ? 0 : 1;
            const myDeckIds = userData.deck || [1,1,2,2,6,6,6,6,4,5];
            const myDeck = buildDeck(myDeckIds);
            const initialHand = myDeck.splice(0, 4);

            setGameState(prev => {
                const newPlayers = [...prev.players];
                newPlayers[myId] = { 
                    ...newPlayers[myId], 
                    name: userData.username, 
                    deck: myDeck, 
                    hand: initialHand,
                    maxHp: 30
                };
                return { ...prev, myPlayerId: myId, players: newPlayers };
            });

            c.send({ type: 'INIT_HANDSHAKE', payload: { name: userData.username, deckCount: myDeck.length } });
            
            if(amIHost) {
                 setTimeout(() => GameActions.startTurn({ ...gameContext, gameState: getInitialGameState(), setGameState }), 1000);
            }
        });

        c.on('data', (data) => {
            GameNetwork.handleIncomingData(data, { 
                setGameState, addLog, onBack, user, conn, gameState: { ...gameState }, 
                runStartTurn: () => GameActions.startTurn({ setGameState, gameState: { ...gameState }, sendStateUpdate, addLog })
            });
        });

        c.on('close', () => { 
            alert("El oponente se ha desconectado."); 
            onBack(); 
        });
    };

    const connectToPeer = () => {
        if (!targetPeerId || !peer) return;
        setStatus("connecting");
        addLog("Conectando manualmente...");
        const c = peer.connect(targetPeerId, { reliable: true });
        if(!c) return;
        setupConnection(c, false);
    };

    return {
        peer, conn, myPeerId, targetPeerId, setTargetPeerId,
        status, gameLog, gameState,
        connectToPeer, 
        playCard: (idx) => GameActions.playCard(idx, gameContext),
        useAbility: (uuid, abId) => GameActions.useAbility(uuid, abId, gameContext),
        advancePhase: () => GameActions.advancePhase(gameContext),
        assignDefender: (actUuid, blkUuid) => GameActions.assignDefender(actUuid, blkUuid, gameContext)
    };
};
