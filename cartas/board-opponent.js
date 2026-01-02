// --- TABLERO DEL OPONENTE (UI) ---
// Guardar como: Cartas Silen/board-opponent.js

const OpponentBoard = ({ player, isMyTurn, onInspect, isTargeting, onCardClick }) => {
    return (
        <div 
            className={`
                flex flex-col items-center pb-2 w-full flex-shrink-0 bg-[var(--bg-main)] border-b border-[var(--shadow-dark)] transition-all duration-300
                ${isTargeting ? 'z-50 relative shadow-[0_0_100px_rgba(0,0,0,0.8)] scale-[1.02]' : 'z-0'}
            `}
        >
            {/* Indicador visual de targeting */}
            {isTargeting && (
                <div className="w-full bg-red-500 text-center py-1 animate-pulse shadow-lg">
                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">
                        ▼ SELECCIONA UN OBJETIVO ▼
                    </span>
                </div>
            )}

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
            <div className={`w-full overflow-x-auto no-scrollbar py-2 ${isTargeting ? 'cursor-crosshair bg-red-500/5' : ''}`}>
                <div className="flex items-center gap-2 px-4 min-w-max justify-center min-h-[140px]">
                    {player.field.length === 0 && <span className="text-slate-700 text-xs uppercase font-bold tracking-widest">Campo Rival Vacío</span>}
                    {player.field.map((unit, idx) => (
                        <div 
                            key={idx}
                            className={`transition-all duration-200 ${isTargeting ? 'hover:scale-110 hover:shadow-[0_0_25px_rgba(239,68,68,0.8)] rounded-xl z-50' : ''}`}
                            onClick={() => {
                                if (isTargeting) {
                                    onCardClick(unit.uuid);
                                } else {
                                    onInspect(unit, 'opponent');
                                }
                            }}
                        >
                            <CardDisplay 
                                card={unit} 
                                size="small" 
                                canInteract={true}
                                // Si estamos apuntando, el clic lo maneja el div padre
                                onClick={isTargeting ? undefined : () => onInspect(unit, 'opponent')} 
                            />
                            
                            {isTargeting && (
                                <div className="mt-1 text-center bg-red-600 text-white text-[8px] font-bold rounded px-1 animate-bounce shadow-md">
                                    ¡ATACAR!
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};