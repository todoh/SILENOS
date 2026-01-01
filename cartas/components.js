// --- COMPONENTES UI REUTILIZABLES ---

const Button = ({ children, onClick, disabled, className = "", variant = "primary" }) => {
    const baseStyle = "px-3 py-1 rounded font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider";
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/50",
        secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600",
        danger: "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/50",
        success: "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-500/50",
        warning: "bg-yellow-600 hover:bg-yellow-500 text-white"
    };
    return (
        <button 
            onClick={onClick} 
            disabled={disabled} 
            className={`${baseStyle} ${variants[variant]} ${className}`}
        >
            {children}
        </button>
    );
};

const CardDisplay = ({ card, size = "normal", onClick, canInteract = false, showAbilities = false, onUseAbility }) => {
    if (!card) return null;

    // Reverso de la carta
    if (card.hidden) {
        return (
            <div className="w-32 h-48 bg-slate-800 border-2 border-slate-600 rounded-lg flex items-center justify-center m-1 shadow-md bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="text-4xl opacity-20">?</div>
            </div>
        );
    }

    // Cálculo barra de vida
    const hpPct = Math.max(0, Math.min(100, (card.currentHp / card.maxHp) * 100));
    const hpColor = hpPct > 50 ? 'bg-green-500' : hpPct > 20 ? 'bg-yellow-500' : 'bg-red-600';

    return (
        <div 
            onClick={() => canInteract && onClick && onClick(card)}
            className={`w-40 h-60 relative bg-slate-900 border border-slate-600 rounded-lg flex flex-col m-1 select-none transition-all group overflow-hidden ${canInteract ? 'cursor-pointer hover:border-yellow-400' : ''}`}
        >
            {/* Cabecera: Coste y Nombre */}
            <div className="bg-slate-950 p-1 flex justify-between items-center border-b border-slate-800">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-inner">
                    {card.cost}
                </div>
                <div className="text-[10px] font-bold text-slate-200 truncate flex-1 text-right ml-1 font-serif">
                    {card.name}
                </div>
            </div>

            {/* Imagen */}
            <div className="h-20 bg-slate-800 flex items-center justify-center text-4xl relative">
                {card.image}
                {/* Indicador de estado (Congelada/Usada) */}
                {card.isFrozen && (
                    <div className="absolute inset-0 bg-blue-500/30 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="text-xs font-bold bg-black/70 px-2 rounded text-blue-200">❄️ ESPERA</span>
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/50 text-[10px] text-center font-mono">
                <div className="text-red-400" title="Fuerza">
                    STR<br/><span className="text-white text-xs">{card.strength}</span>
                </div>
                <div className="text-blue-400" title="Inteligencia">
                    INT<br/><span className="text-white text-xs">{card.intelligence}</span>
                </div>
                <div className="text-purple-400" title="Poder">
                    POW<br/><span className="text-white text-xs">{card.power}</span>
                </div>
            </div>

            {/* Barra de Vida */}
            <div className="px-2 py-1 bg-slate-900">
                <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
                    <span>HP</span>
                    <span>{card.currentHp}/{card.maxHp}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${hpColor}`} style={{ width: `${hpPct}%` }}></div>
                </div>
            </div>

            {/* Descripción */}
            <div className="flex-1 p-1 text-[9px] text-slate-400 leading-tight overflow-hidden text-center bg-slate-900">
                {card.desc}
            </div>

            {/* Overlay de Habilidades (Solo si se solicita) */}
            {showAbilities && !card.isFrozen && (
                <div className="absolute inset-0 bg-black/80 flex flex-col gap-1 p-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    {card.abilities.map((ab, idx) => (
                        <button 
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); onUseAbility(card, ab); }}
                            className="bg-slate-700 hover:bg-slate-600 text-[10px] text-white py-1 px-2 rounded border border-slate-500 flex justify-between items-center"
                        >
                            <span>{ab.name}</span>
                            <span className="text-blue-300 font-mono ml-1">{ab.cost}E</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
