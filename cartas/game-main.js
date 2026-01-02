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

    // Estado para la carta inspeccionada (Zoom en combate)
    // Estructura: { card: Object, source: 'hand' | 'field' | 'opponent', index: number }
    const [selectedCard, setSelectedCard] = React.useState(null);

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

    // Manejar inspección de carta
    const handleInspect = (card, source, index) => {
        setSelectedCard({ card, source, index });
    };

    // Manejar jugar carta desde el modal
    const handlePlayFromModal = () => {
        if (selectedCard && selectedCard.source === 'hand') {
            playCard(selectedCard.index);
            setSelectedCard(null); // Cerrar modal tras jugar
        }
    };

    return (
        // Contenedor principal con fondo neumorfista (sin texturas ruidosas)
        <div className="h-screen md:h-[100dvh] w-full flex flex-col bg-[var(--bg-main)] overflow-hidden select-none fixed inset-0">
            
            {/* --- MODAL DE INSPECCIÓN DE CARTA (EN COMBATE) --- */}
            {selectedCard && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedCard(null)} // Cerrar al hacer clic fuera
                >
                    <div 
                        className="relative flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200" 
                        onClick={(e) => e.stopPropagation()} // Evitar cierre al hacer clic en la carta
                    >
                        <CardDisplay card={selectedCard.card} size="large" />
                        
                        {/* Botones de Acción en el Modal */}
                        <div className="flex gap-4 w-full justify-center">
                            <Button variant="danger" onClick={() => setSelectedCard(null)}>
                                Cerrar
                            </Button>

                            {/* Mostrar botón JUGAR solo si es mi turno, fase principal y carta de la mano */}
                            {selectedCard.source === 'hand' && isMyTurn && gameState.phase === 'main' && (
                                <Button variant="success" onClick={handlePlayFromModal} className="shadow-xl ring-2 ring-green-400/50">
                                    JUGAR ({selectedCard.card.cost} ENG)
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <GameTopBar isMyTurn={isMyTurn} phase={gameState.phase} gameLog={gameLog} onBack={onBack} />

            {/* Area de Tablero centrada */}
            <div className="flex-1 relative flex flex-col w-full max-w-2xl mx-auto shadow-2xl border-x border-[var(--shadow-dark)]">
                
                <OpponentBoard 
                    player={opponent} 
                    isMyTurn={isMyTurn}
                    onInspect={handleInspect} // Pasamos la función
                />

                <PlayerBoard 
                    player={me} 
                    isMyTurn={isMyTurn} 
                    phase={gameState.phase}
                    playCard={playCard} 
                    useAbility={useAbility}
                    advancePhase={advancePhase}
                    incomingStack={gameState.incomingStack}
                    assignDefender={assignDefender}
                    onInspect={handleInspect} // Pasamos la función
                />
            </div>
        </div>
    );
};