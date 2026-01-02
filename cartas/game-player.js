// --- TABLEROS DE JUGADORES (NEUMORFISTA) ---

const OpponentBoard = ({ player, isMyTurn, onInspect }) => {
    return (
        <div className="flex flex-col items-center pb-2 w-full flex-shrink-0 bg-[var(--bg-main)] border-b border-[var(--shadow-dark)]">
            {/* Stats Rival - Barra elevada */}
            <div className="flex w-full justify-between items-center px-4 py-2 bg-[var(--bg-main)] shadow-lg z-10">
                <div className="font-bold text-sm text-slate-400">{player.name}</div>
                <div className="flex gap-4">
                    <div className="neo-inset px-2 py-1 flex flex-col items-center w-10">
                        <span className="text-yellow-500 font-bold leading-none">{player.points}</span>
                        <span className="text-[6px] text-slate-500 uppercase">PTS</span>
                    </div>
                    <div className="neo-inset px-2 py-1 flex flex-col items-center w-10">
                        <span className="text-blue-500 font-bold leading-none">{player.energy}</span>
                        <span className="text-[6px] text-slate-500 uppercase">ENG</span>
                    </div>
                </div>
            </div>

            {/* Mano Rival (Cartas ocultas) */}
            <div className="w-full flex justify-center py-2 -space-x-2 overflow-hidden h-14 md:h-20 opacity-70">
                {player.hand.map((_, i) => (
                    <div key={i} className="w-8 h-10 md:w-10 md:h-14 neo-box bg-slate-700/50 transform rotate-3 border border-slate-600"></div>
                ))}
            </div>

            {/* Campo Rival */}
            <div className="w-full overflow-x-auto no-scrollbar py-2">
                <div className="flex items-center gap-2 px-4 min-w-max justify-center min-h-[140px]">
                    {player.field.length === 0 && <span className="text-slate-700 text-xs uppercase font-bold tracking-widest">Campo Rival Vacío</span>}
                    {player.field.map((unit, idx) => (
                        <CardDisplay 
                            key={idx} 
                            card={unit} 
                            size="small" 
                            canInteract={true}
                            onClick={() => onInspect(unit, 'opponent')} // Clic para ver carta del rival
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const PlayerBoard = ({ player, isMyTurn, phase, playCard, useAbility, advancePhase, incomingStack, assignDefender, onInspect }) => {
    const [dragState, setDragState] = React.useState(null);

    let phaseBtnText = "Esperando...";
    let canAdvance = false;
    let btnVariant = "secondary";
    
    if (isMyTurn) {
        if (phase === 'response') { 
            phaseBtnText = "🛡️ Confirmar Defensa"; 
            canAdvance = true; 
            btnVariant = "warning";
        }
        else if (phase === 'main') { 
            phaseBtnText = "Terminar Turno"; 
            canAdvance = true; 
            btnVariant = "danger";
        }
    }

    // Drag Logic Desktop
    const handleDragStart = (e, unit) => {
        if (phase !== 'response' || unit.isFrozen) { e.preventDefault(); return; }
        e.dataTransfer.setData("text/plain", unit.uuid);
    };
    const handleDropOnAttack = (e, actionUuid) => {
        e.preventDefault();
        const blockerUuid = Number(e.dataTransfer.getData("text/plain"));
        if (blockerUuid) assignDefender(actionUuid, blockerUuid);
    };
    const handleDragOver = (e) => e.preventDefault();

    // Touch Logic
    const handleTouchStart = (e, unit) => {
        if (phase !== 'response' || unit.isFrozen) return;
        const t = e.touches[0];
        setDragState({ uuid: unit.uuid, x: t.clientX, y: t.clientY });
    };
    const handleTouchMove = (e) => {
        if (!dragState) return;
        if(e.cancelable) e.preventDefault();
        const t = e.touches[0];
        setDragState(prev => ({ ...prev, x: t.clientX, y: t.clientY }));
    };
    const handleTouchEnd = (e) => {
        if (!dragState) return;
        const t = e.changedTouches[0];
        const target = document.elementFromPoint(t.clientX, t.clientY);
        const dropZone = target?.closest('[data-drop-zone="true"]');
        if (dropZone) assignDefender(Number(dropZone.getAttribute('data-action-uuid')), dragState.uuid);
        setDragState(null);
    };

    const draggingCard = dragState ? player.field.find(c => c.uuid === dragState.uuid) : null;

    return (
        <div className="flex-1 flex flex-col justify-end relative w-full overflow-hidden bg-[var(--bg-main)]">
            
            {dragState && draggingCard && (
                <div className="fixed z-50 pointer-events-none opacity-80" style={{ left: dragState.x, top: dragState.y, transform: 'translate(-50%, -50%)' }}>
                    <CardDisplay card={draggingCard} size="small" />
                </div>
            )}

            <div className="flex-1 overflow-y-auto flex flex-col justify-center gap-2 pb-2">
                
                {/* ZONA DE DEFENSA (NEO-INSET) */}
                {isMyTurn && phase === 'response' && incomingStack.length > 0 && (
                    <div className="neo-inset mx-2 my-2 p-2 flex flex-col border border-red-500/20">
                        <div className="text-red-400 text-[10px] text-center mb-2 font-bold animate-pulse">ARRASTRA TUS UNIDADES A LOS ATAQUES</div>
                        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                            {incomingStack.map((action, idx) => {
                                const blockerName = action.blockerUuid ? player.field.find(c => c.uuid === action.blockerUuid)?.name : null;
                                return (
                                    <div 
                                        key={idx} 
                                        data-drop-zone="true"
                                        data-action-uuid={action.uuid}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDropOnAttack(e, action.uuid)}
                                        className={`w-24 h-28 flex-shrink-0 rounded-lg flex flex-col items-center justify-between p-2 transition-all border
                                            ${action.blockerUuid 
                                                ? 'neo-box border-green-500/30' 
                                                : 'neo-inset bg-red-900/10 border-red-500/30'
                                            }
                                        `}
                                    >
                                        <span className="text-[9px] text-slate-400 truncate w-full text-center">{action.sourceCardName}</span>
                                        <div className="text-2xl text-red-500 font-bold">{action.sourceStats}</div>
                                        <div className={`text-[8px] px-2 py-1 rounded w-full text-center ${action.blockerUuid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {blockerName || "SIN DEFENSA"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CAMPO PROPIO */}
                <div className="w-full overflow-x-auto no-scrollbar py-2 min-h-[160px] flex flex-col justify-end">
                     <div className="flex gap-2 px-4 min-w-max justify-center items-end">
                        {player.field.length === 0 && <span className="text-slate-700 text-xs uppercase font-bold tracking-widest mb-10">Tu Campo Vacío</span>}
                        {player.field.map((unit, idx) => (
                            <div 
                                key={idx} 
                                draggable={isMyTurn && phase === 'response' && !unit.isFrozen}
                                onDragStart={(e) => handleDragStart(e, unit)}
                                onTouchStart={(e) => handleTouchStart(e, unit)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                className={`transition-transform ${isMyTurn && phase === 'response' && !unit.isFrozen ? 'cursor-grab active:cursor-grabbing hover:-translate-y-2' : ''}`}
                            >
                                <CardDisplay 
                                    card={unit} 
                                    size="small"
                                    canInteract={isMyTurn}
                                    showAbilities={isMyTurn && phase === 'main'}
                                    onUseAbility={(c, a) => useAbility(c.uuid, a.id)}
                                    onInspect={(c) => onInspect(c, 'field')} // Botón de ver carta en overlay
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CONTROLES INFERIORES */}
            <div className="neo-box rounded-b-none rounded-t-2xl border-b-0 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-20 pb-2">
                
                {/* Info Stats y Botón */}
                <div className="flex justify-between items-center px-6 py-3 border-b border-[var(--shadow-light)]">
                    <div className="flex gap-6">
                         <div className="neo-inset px-3 py-1 text-center min-w-[3rem]">
                            <span className="block text-xl font-bold text-yellow-500 leading-none">{player.points}</span>
                            <span className="text-[7px] uppercase text-slate-500">Pts</span>
                        </div>
                        <div className="neo-inset px-3 py-1 text-center min-w-[3rem]">
                            <span className="block text-xl font-bold text-blue-500 leading-none">{player.energy}</span>
                            <span className="text-[7px] uppercase text-slate-500">Eng</span>
                        </div>
                    </div>
                    <Button onClick={advancePhase} disabled={!canAdvance} variant={btnVariant} className="px-6 py-3 text-xs shadow-lg">
                        {phaseBtnText}
                    </Button>
                </div>

                {/* Mano */}
                <div className="w-full overflow-x-auto no-scrollbar p-3">
                    <div className="flex gap-2 px-2 min-w-max justify-center">
                        {player.hand.length === 0 && <span className="text-xs text-slate-600">Sin cartas en mano</span>}
                        {player.hand.map((card, idx) => (
                            <div key={idx} className="hover:-translate-y-6 transition-transform duration-300">
                                 <CardDisplay 
                                    card={card} 
                                    size="normal"
                                    canInteract={isMyTurn && phase === 'main'}
                                    // Cambiado de playCard a onInspect para ver primero
                                    onClick={() => onInspect(card, 'hand', idx)}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};