// --- JUEGO PRINCIPAL (CONTAINER) ---

const GameRoom = ({ user, userData, onBack, gameConfig }) => {
    const {
        status,
        gameLog,
        gameState,
        myPeerId,
        targetPeerId,
        setTargetPeerId,
        connectToPeer,
        playCard,
        useAbility,
        advancePhase,
        assignDefender
    } = useGameLogic({ user, userData, onBack, gameConfig });

    if (status !== 'playing') {
        return (
            <LobbyScreen 
                status={status}
                gameConfig={gameConfig}
                myPeerId={myPeerId}
                targetPeerId={targetPeerId}
                setTargetPeerId={setTargetPeerId}
                connectToPeer={connectToPeer}
                onBack={onBack}
            />
        );
    }

    const myId = gameState.myPlayerId;
    const opId = myId === 0 ? 1 : 0;
    const isMyTurn = gameState.turn === myId;
    const me = gameState.players[myId];
    const opponent = gameState.players[opId];

    return (
        // Contenedor principal con fondo neumorfista (sin texturas ruidosas)
        <div className="h-screen md:h-[100dvh] w-full flex flex-col bg-[var(--bg-main)] overflow-hidden select-none fixed inset-0">
            
            <GameTopBar isMyTurn={isMyTurn} phase={gameState.phase} gameLog={gameLog} onBack={onBack} />

            {/* Area de Tablero centrada */}
            <div className="flex-1 relative flex flex-col w-full max-w-2xl mx-auto shadow-2xl border-x border-[var(--shadow-dark)]">
                
                <OpponentBoard player={opponent} isMyTurn={isMyTurn} />

                <PlayerBoard 
                    player={me} 
                    isMyTurn={isMyTurn} 
                    phase={gameState.phase}
                    playCard={playCard} 
                    useAbility={useAbility}
                    advancePhase={advancePhase}
                    incomingStack={gameState.incomingStack}
                    assignDefender={assignDefender}
                />
            </div>
        </div>
    );
};