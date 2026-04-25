// --- TABLERO DEL OPONENTE (UI) ---
// Guardar como: Cartas Silen/board-opponent.js

const OpponentBoard = ({ player, isMyTurn, onInspect, isTargeting, onCardClick }) => {
    return (
        <div className={`flex flex-col items-center pb-1 md:pb-2 w-full flex-shrink-0 bg-[var(--bg-main)] border-b border-[var(--shadow-dark)] transition-all duration-300 ${isTargeting ? 'z-50 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]' : 'z-0'}`}>
            
            {isTargeting && (
                <div className="w-full bg-red-500 text-center py-1 animate-pulse shadow-md">
                    <span className="text-[9px] md:text-[10px] text-white font-bold uppercase tracking-widest">
                        ▼ SELECCIONA UN OBJETIVO ▼
                    </span>
                </div>
            )}

            {/* Stats Rival */}
            <div className="flex w-full justify-between items-center px-2 md:px-4 py-1.5 md:py-2 bg-[var(--bg-main)] shadow-sm z-10">
                <div className="font-bold text-xs md:text-sm text-slate-500 truncate max-w-[50%]">{player.name}</div>
                <div className="flex gap-2 md:gap-4">
                    <div className="neo-inset px-2 py-0.5 md:py-1 flex flex-col items-center min-w-[2.5rem]">
                        <span className="text-yellow-500 font-bold leading-none text-sm md:text-base">{player.points}</span>
                        <span className="text-[6px] text-slate-500 uppercase">PTS</span>
                    </div>
                    <div className="neo-inset px-2 py-0.5 md:py-1 flex flex-col items-center min-w-[2.5rem]">
                        <span className="text-blue-500 font-bold leading-none text-sm md:text-base">{player.energy}</span>
                        <span className="text-[6px] text-slate-500 uppercase">ENG</span>
                    </div>
                </div>
            </div>

            {/* Mano Rival */}
            <div className="w-full flex justify-center py-1 md:py-2 -space-x-2 md:-space-x-3 h-10 md:h-14 opacity-60">
                {player.hand.map((_, i) => (
                    <div key={i} className="w-6 h-8 md:w-8 md:h-12 neo-box bg-slate-700/30 transform rotate-3 border border-slate-600/30"></div>
                ))}
            </div>

            {/* Campo Rival */}
            <div className={`w-full overflow-x-auto no-scrollbar py-1 md:py-2 ${isTargeting ? 'cursor-crosshair bg-red-500/5' : ''}`}>
                <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 min-w-max justify-center min-h-[110px] md:min-h-[140px]">
                    {player.field.length === 0 && <span className="text-slate-600 text-[10px] uppercase font-bold tracking-widest">Campo Rival Vacío</span>}
                    {player.field.map((unit, idx) => (
                        <div 
                            key={idx}
                            className={`transition-all duration-200 ${isTargeting ? 'hover:scale-105 hover:shadow-[0_0_15px_rgba(239,68,68,0.5)] rounded-lg z-50 p-0.5' : ''}`}
                            onClick={() => { if (isTargeting) { onCardClick(unit.uuid); } else { onInspect(unit, 'opponent'); } }}
                        >
                            <CardDisplay card={unit} size="small" canInteract={true} onClick={isTargeting ? undefined : () => onInspect(unit, 'opponent')} />
                            {isTargeting && (
                                <div className="mt-1 text-center bg-red-600 text-white text-[7px] md:text-[8px] font-bold rounded px-1 animate-bounce">
                                    ATACAR
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};