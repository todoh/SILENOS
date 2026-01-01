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
        <div className="h-screen flex flex-col bg-slate-900 overflow-hidden font-sans select-none">
            <GameTopBar isMyTurn={isMyTurn} phase={gameState.phase} gameLog={gameLog} onBack={onBack} />

            <div className="flex-1 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] relative flex flex-col">
                
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