// --- TABLERO DEL JUGADOR (UI & DRAG-DROP) ---
// Sobreescribir: Cartas Silen/game-player.js

const PlayerBoard = ({ player, isMyTurn, phase, playCard, useAbility, advancePhase, incomingStack, assignDefender, onInspect, autoDefend, isTargeting, onCardClick }) => { 
    const [dragState, setDragState] = React.useState(null);

    let phaseBtnText = "Esperando...";
    let canAdvance = false;
    let btnVariant = "secondary";

    if (isMyTurn) {
        if (phase === 'response') { phaseBtnText = "Defensa"; canAdvance = true; btnVariant = "warning"; }
        else if (phase === 'main') { phaseBtnText = "Fin Turno"; canAdvance = true; btnVariant = "danger"; }
    }

    const handleHandDragStart = (e, index, card) => {
        if (phase !== 'main' || !isMyTurn || isTargeting) { e.preventDefault(); return; }
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'hand', index: index }));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleFieldDragStart = (e, unit) => {
        if (phase !== 'response' || unit.isFrozen || isTargeting) { e.preventDefault(); return; }
        e.dataTransfer.setData("text/plain", JSON.stringify({ type: 'field', uuid: unit.uuid }));
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDropOnFieldArea = (e) => {
        e.preventDefault();
        if (isTargeting) return;
        try {
            const raw = e.dataTransfer.getData("text/plain");
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type === 'hand') playCard(data.index);
        } catch (err) {}
    };

    const handleDropOnAttack = (e, actionUuid) => {
        e.preventDefault();
        if (isTargeting) return;
        try {
            const raw = e.dataTransfer.getData("text/plain");
            if (!raw) return;
            const data = JSON.parse(raw);
            if (data.type === 'field') assignDefender(actionUuid, data.uuid);
        } catch (err) {}
    };

    const handleDragOver = (e) => { e.preventDefault(); if (!isTargeting) e.dataTransfer.dropEffect = "move"; };

    const handleTouchStart = (e, item, type, indexOrUuid) => {
        if (!isMyTurn || isTargeting) return;
        if (type === 'field' && (phase !== 'response' || item.isFrozen)) return;
        if (type === 'hand' && phase !== 'main') return;
        const t = e.touches[0];
        setDragState({ type: type, data: indexOrUuid, cardObj: item, x: t.clientX, y: t.clientY });
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
        
        if (dragState.type === 'hand') {
            const dropZoneField = target?.closest('[data-drop-zone="field"]');
            if (dropZoneField) playCard(dragState.data); 
        }
        if (dragState.type === 'field') {
            const dropZoneAttack = target?.closest('[data-drop-zone="attack"]');
            if (dropZoneAttack) {
                const actionUuid = Number(dropZoneAttack.getAttribute('data-action-uuid'));
                assignDefender(actionUuid, dragState.data); 
            }
        }
        setDragState(null);
    };

    const handleFieldCardClick = (unit) => {
        if (isTargeting) onCardClick(unit.uuid);
        else onInspect(unit, 'field');
    };

    return (
        <div className="flex-1 flex flex-col justify-end relative w-full overflow-hidden bg-[var(--bg-main)]">
            {dragState && dragState.cardObj && (
                <div className="fixed z-[100] pointer-events-none opacity-90 shadow-2xl scale-75 origin-center" style={{ left: dragState.x, top: dragState.y, transform: 'translate(-50%, -50%) rotate(5deg)' }}>
                    <CardDisplay card={dragState.cardObj} size="small" />
                </div>
            )}
            
            {isTargeting && (
                <div className="absolute top-2 left-0 right-0 z-30 flex justify-center pointer-events-none">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full shadow-md animate-bounce text-[9px] font-bold uppercase tracking-widest border border-blue-400">
                        ▼ Toca un aliado ▼
                    </div>
                </div>
            )}

            <div className={`flex-1 overflow-y-auto flex flex-col justify-center gap-1 pb-1 transition-colors duration-300 ${isTargeting ? 'bg-blue-500/5 cursor-crosshair' : ''}`}>
                {isMyTurn && phase === 'response' && incomingStack.length > 0 && !isTargeting && (
                    <div className="neo-inset mx-2 my-1 p-1 md:p-2 flex flex-col border border-red-500/20">
                        <div className="flex justify-between items-center mb-1 px-1">
                            <span className="text-red-400 text-[9px] font-bold animate-pulse">ATAQUES ENTRANTES</span>
                            <button onClick={autoDefend} className="bg-blue-600/20 border border-blue-500/50 text-blue-400 text-[8px] px-2 py-0.5 rounded font-bold uppercase">✨ Auto-Def</button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {incomingStack.map((action, idx) => {
                                const blockerName = action.blockerUuid ? player.field.find(c => c.uuid === action.blockerUuid)?.name : null;
                                return (
                                    <div key={idx} data-drop-zone="attack" data-action-uuid={action.uuid} onDragOver={handleDragOver} onDrop={(e) => handleDropOnAttack(e, action.uuid)}
                                        className={`w-20 md:w-24 flex-shrink-0 rounded-md flex flex-col items-center justify-between p-1.5 border ${action.blockerUuid ? 'neo-box border-green-500/30' : 'neo-inset bg-red-900/10 border-red-500/30'}`}
                                    >
                                        <span className="text-[8px] text-slate-500 truncate w-full text-center">{action.sourceCardName}</span>
                                        <div className="flex items-center justify-center gap-1 w-full my-1">
                                            <div className="flex flex-col items-center"><span className="text-[6px] text-red-500 font-bold">ATK</span><span className="text-sm text-red-500 font-bold leading-none">{action.sourceStats}</span></div>
                                            <div className="w-px h-4 bg-slate-300"></div>
                                            <div className="flex flex-col items-center"><span className="text-[6px] text-yellow-500 font-bold">PTS</span><span className="text-sm text-yellow-500 font-bold leading-none">{(action.sourcePoints !== undefined && action.sourcePoints !== null) ? action.sourcePoints : 1}</span></div>
                                        </div>
                                        <div className={`text-[7px] md:text-[8px] px-1 py-0.5 rounded w-full text-center truncate ${action.blockerUuid ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                            {blockerName || "SIN DEFENSA"}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div data-drop-zone="field" onDragOver={handleDragOver} onDrop={handleDropOnFieldArea}
                    className={`w-full overflow-x-auto no-scrollbar py-1 md:py-2 min-h-[170px] md:min-h-[220px] flex flex-col justify-end transition-all ${(dragState && dragState.type === 'hand' && !isTargeting) ? 'bg-green-500/5 shadow-[inset_0_0_10px_rgba(74,222,128,0.2)]' : ''}`}
                >
                     <div className="flex gap-2 md:gap-4 px-2 md:px-4 min-w-max justify-center items-start h-full">
                        {player.field.length === 0 && <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-10 pointer-events-none">{isMyTurn && phase === 'main' ? "Arrastra cartas aquí" : "Campo Vacío"}</span>}
                        {player.field.map((unit, idx) => {
                            const showActions = isMyTurn && phase === 'main' && !unit.isFrozen && !isTargeting;
                            return (
                                <div key={idx} className={`flex flex-col items-center gap-1 md:gap-2 transition-all duration-300 ${isTargeting ? 'hover:scale-105 z-40' : ''}`}>
                                    <div draggable={isMyTurn && phase === 'response' && !unit.isFrozen && !isTargeting} onDragStart={(e) => handleFieldDragStart(e, unit)} onTouchStart={(e) => handleTouchStart(e, unit, 'field', unit.uuid)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                                        className={`transition-transform ${isMyTurn && phase === 'response' && !unit.isFrozen && !isTargeting ? 'cursor-grab' : ''}`}
                                    >
                                        <CardDisplay card={unit} size="small" canInteract={isMyTurn || isTargeting} onClick={() => handleFieldCardClick(unit)} />
                                    </div>
                                    {!isTargeting && (
                                        <div className="w-[5.5rem] md:w-24 flex flex-col gap-1 pb-1">
                                            {showActions ? (
                                                unit.abilities.map((ab, abIdx) => (
                                                    <button key={abIdx} onClick={() => useAbility(unit.uuid, ab.id)}
                                                        className={`w-full py-0.5 px-1 rounded text-[7px] md:text-[8px] font-bold uppercase tracking-wide flex justify-between items-center shadow-sm border transition-all active:scale-95
                                                            ${ab.type === 'interaction' ? 'bg-red-50 text-red-600 border-red-200' : ab.type === 'response' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}
                                                        `}
                                                    >
                                                        <span className="truncate max-w-[70%] text-left">{ab.name}</span>
                                                        <span className="bg-slate-200 px-1 rounded text-slate-700 font-mono">{ab.cost}</span>
                                                    </button>
                                                ))
                                            ) : <div className="h-3 md:h-4"></div> }
                                            {unit.isFrozen && <div className="text-[7px] md:text-[8px] text-slate-400 font-bold text-center border border-slate-200 rounded bg-slate-100">AGOTADA</div>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Panel Inferior (Mano y Stats) adaptado */}
            <div className={`neo-box rounded-b-none rounded-t-xl border-b-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-20 pb-1 md:pb-2 ${isTargeting ? 'opacity-50 pointer-events-none blur-sm' : ''}`}>
                <div className="flex justify-between items-center px-3 md:px-6 py-2 border-b border-[var(--shadow-light)]">
                    <div className="flex gap-3 md:gap-6">
                         <div className="neo-inset px-2 md:px-3 py-1 text-center min-w-[2.5rem]">
                            <span className="block text-base md:text-xl font-bold text-yellow-500 leading-none">{player.points}</span>
                            <span className="text-[6px] md:text-[7px] uppercase text-slate-500">Pts</span>
                        </div>
                        <div className="neo-inset px-2 md:px-3 py-1 text-center min-w-[2.5rem]">
                            <span className="block text-base md:text-xl font-bold text-blue-500 leading-none">{player.energy}</span>
                            <span className="text-[6px] md:text-[7px] uppercase text-slate-500">Eng</span>
                        </div>
                    </div>
                    <Button onClick={advancePhase} disabled={!canAdvance} variant={btnVariant} className="px-3 md:px-6 py-1 md:py-2 text-[10px] md:text-xs">
                        {phaseBtnText}
                    </Button>
                </div>

                <div className="w-full overflow-x-auto no-scrollbar p-2 md:p-3">
                    <div className="flex gap-1.5 md:gap-2 px-1 min-w-max justify-center h-[9rem] md:h-[10rem] items-end">
                        {player.hand.length === 0 && <span className="text-[10px] text-slate-400 mb-6">Mano vacía</span>}
                        {player.hand.map((card, idx) => {
                            const canDrag = isMyTurn && phase === 'main' && player.energy >= card.cost && !isTargeting;
                            return (
                                <div key={idx} className={`transition-transform duration-300 ${canDrag ? 'cursor-grab active:cursor-grabbing hover:-translate-y-2' : 'opacity-80 grayscale-[0.3]'}`}
                                    draggable={canDrag} onDragStart={(e) => handleHandDragStart(e, idx, card)} onTouchStart={(e) => handleTouchStart(e, card, 'hand', idx)} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                                >
                                     <CardDisplay card={card} size="small" canInteract={isMyTurn && phase === 'main' && !isTargeting} onClick={() => onInspect(card, 'hand', idx)} />
                                    {isMyTurn && phase === 'main' && player.energy < card.cost && <div className="text-[7px] text-red-500 text-center font-bold bg-slate-100 rounded mt-0.5">NO ENG</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};