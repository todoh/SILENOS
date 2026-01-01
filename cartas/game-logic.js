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
        // Creamos el Peer
        const newPeer = new Peer(null, { debug: 1 });
        
        newPeer.on('open', (id) => {
            console.log("Mi Peer ID:", id);
            setMyPeerId(id);

            // --- MODO HOST (CREAR DESAFÍO) ---
            if (gameConfig.mode === 'host_friend' && gameConfig.targetFriendId) {
                setStatus("waiting");
                addLog("Generando sala... Desafío enviado.");
                
                // Guardamos el desafío en Firebase
                db.collection('users').doc(gameConfig.targetFriendId).update({
                    incomingChallenge: {
                        hostPeerId: id,
                        hostName: userData.username,
                        timestamp: Date.now()
                    }
                }).catch(err => console.error("Error enviando desafío:", err));
            }
            
            // --- MODO JOIN AUTOMÁTICO (DESDE BOTÓN ACEPTAR) ---
            else if (gameConfig.mode === 'join_friend' && gameConfig.targetPeerId) {
                setTargetPeerId(gameConfig.targetPeerId);
                setStatus("connecting");
                addLog("Conectando con el rival...");

                setTimeout(() => {
                    if(newPeer.destroyed) return;
                    
                    // Usamos newPeer directamente aquí porque 'peer' del estado podría ser null aún
                    const c = newPeer.connect(gameConfig.targetPeerId, { reliable: true });
                    
                    if(!c) {
                        alert("Error crítico: No se pudo iniciar la conexión.");
                        onBack();
                        return;
                    }

                    c.on('error', (err) => {
                        console.error("Error de conexión:", err);
                        alert("Fallo al conectar con el rival.");
                        onBack();
                    });

                    setupConnection(c, false);
                }, 1000);
            } 
            else { 
                setStatus("waiting"); 
            }
        });

        // --- MANEJO DE ERRORES GLOBAL DEL PEER ---
        newPeer.on('error', (err) => {
            console.error("Peer Error:", err);
            if (err.type === 'peer-unavailable') {
                alert("Error: El desafío ha caducado o el rival ya no está en línea con ese ID.");
                onBack(); 
            } else if (err.type === 'disconnected') {
                addLog("Desconectado del servidor de señalización.");
            } else {
                addLog(`Error de red: ${err.type}`);
            }
        });

        // --- RECIBIR CONEXIÓN (HOST) ---
        newPeer.on('connection', (c) => {
            console.log("¡Alguien se está conectando!", c.peer);
            setupConnection(c, true);
        });

        setPeer(newPeer);

        // --- LIMPIEZA AL SALIR ---
        return () => {
            newPeer.destroy();
            console.log("Peer destruido y desconectado.");
        };
    }, []); 

    const setupConnection = (c, amIHost) => {
        setConn(c);
        
        c.on('open', () => {
            console.log("¡CONEXIÓN ABIERTA!");
            setStatus("playing");
            addLog("¡Conectado con éxito!");
            
            const myId = amIHost ? 0 : 1;
            
            // Construir mazo
            const myDeckIds = userData.deck || [1,1,2,2,6,6,6,6,4,5];
            const myDeck = myDeckIds.map(id => {
                const base = ALL_CARDS.find(card => card.id === id);
                return base ? JSON.parse(JSON.stringify(base)) : null;
            }).filter(Boolean);

            // Barajar
            for (let i = myDeck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [myDeck[i], myDeck[j]] = [myDeck[j], myDeck[i]];
            }
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
            console.log("Datos recibidos:", data.type);
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

    // --- FUNCIÓN MANUAL DE CONEXIÓN (PARA EL LOBBY) ---
    // Esta es la función que faltaba y causaba el error
    const connectToPeer = () => {
        if (!targetPeerId || !peer) return;
        setStatus("connecting");
        addLog("Conectando manualmente...");
        
        const c = peer.connect(targetPeerId, { reliable: true });
        
        if(!c) {
             alert("Error al intentar conectar.");
             return;
        }
        
        c.on('error', (err) => {
            console.error("Manual connection error:", err);
            alert("Error al conectar: " + err.type);
            setStatus("waiting");
        });

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