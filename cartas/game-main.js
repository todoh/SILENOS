// --- JUEGO PRINCIPAL (CONTAINER) ---

const GameRoom = ({ user, userData, onBack, gameConfig }) => { const { status, gameLog, gameState, myPeerId, targetPeerId, setTargetPeerId, connectToPeer, playCard, useAbility, advancePhase, assignDefender, autoDefend,

    // PROPS DE TARGETING
    targetingData,
    cancelTargeting,
    resolveTargetedAbility

} = useGameLogic({ user, userData, onBack, gameConfig });

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

const handleInspect = (card, source, index) => {
    setSelectedCard({ card, source, index });
};

const handlePlayFromModal = () => {
    if (selectedCard && selectedCard.source === 'hand') {
        playCard(selectedCard.index);
        setSelectedCard(null); 
    }
};

// Determinar estilo del targeting (Rojo para enemigos, Azul para aliados)
const isTargetingAlly = targetingData?.targetScope === 'ally';
const overlayColor = isTargetingAlly ? 'border-blue-500' : 'border-red-500';
const textColor = isTargetingAlly ? 'text-blue-400' : 'text-red-400';
const highlightColor = isTargetingAlly ? 'text-cyan-400' : 'text-yellow-400';

return (
    <div className="h-screen md:h-[100dvh] w-full flex flex-col bg-[var(--bg-main)] overflow-hidden select-none fixed inset-0">
        
        {/* --- OVERLAY DE MODO APUNTADO --- */}
        {targetingData && (
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md cursor-crosshair flex flex-col items-center justify-end pb-32 pointer-events-none transition-all duration-300">
                <div className={`pointer-events-auto bg-slate-900/90 text-white px-6 py-4 rounded-xl border ${overlayColor} shadow-2xl flex flex-col items-center gap-2 animate-in slide-in-from-bottom-10 z-50`}>
                    <span className={`text-xs uppercase font-bold ${textColor} tracking-widest`}>
                        {isTargetingAlly ? 'SELECCIONA UN ALIADO' : 'SELECCIONA UN ENEMIGO'}
                    </span>
                    <div className="text-sm">
                        Usando <span className={`font-bold ${highlightColor}`}>{targetingData.abilityName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Toca una carta válida para aplicar el efecto</div>
                    <Button variant="secondary" onClick={cancelTargeting} className="mt-2 text-xs py-1 h-8">
                        Cancelar
                    </Button>
                </div>
            </div>
        )}

        {selectedCard && (
            <div 
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                onClick={() => setSelectedCard(null)} 
            >
                <div 
                    className="relative flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200" 
                    onClick={(e) => e.stopPropagation()}
                >
                    <CardDisplay card={selectedCard.card} size="large" />
                    
                    <div className="flex gap-4 w-full justify-center">
                        <Button variant="danger" onClick={() => setSelectedCard(null)}>
                            Cerrar
                        </Button>
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

        <div className="flex-1 relative flex flex-col w-full max-w-[90%] mx-auto shadow-2xl border-x border-[var(--shadow-dark)]">
            
            <OpponentBoard 
                player={opponent} 
                isMyTurn={isMyTurn}
                onInspect={handleInspect}
                // Activar targeting SOLO si el scope es 'enemy' (o undefined/default)
                isTargeting={!!targetingData && !isTargetingAlly}
                onCardClick={(targetUuid) => resolveTargetedAbility(targetUuid)}
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
                autoDefend={autoDefend}
                onInspect={handleInspect}
                // NUEVO: Props para targeting aliado
                isTargeting={!!targetingData && isTargetingAlly}
                onCardClick={(targetUuid) => resolveTargetedAbility(targetUuid)}
            />
        </div>
    </div>
);
};