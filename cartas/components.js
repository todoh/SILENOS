// --- COMPONENTES UI REUTILIZABLES (CORREGIDO) ---
// Guardar como: Cartas Silen/components.js

const Button = ({ children, onClick, disabled, className = "", variant = "primary" }) => {
    return (
        <button 
            onClick={onClick} 
            disabled={disabled} 
            className={`neo-btn ${variant} ${className}`}
        >
            {children}
        </button>
    );
};

const CardDisplay = ({ card, size = "normal", onClick, canInteract = false }) => {
    if (!card) return null;

    // --- CONFIGURACIÓN DE TAMAÑOS ---
    let containerClasses;
    let textSizeMain = "text-[10px] md:text-xs";
    let textSizeTiny = "text-[8px] md:text-[9px]";
    let costSize = "w-6 h-6 md:w-8 md:h-8 text-xs md:text-sm";
    
    // Configuración de la imagen según tamaño
    let imageContainerClass = "relative w-full flex-1 overflow-hidden bg-slate-900 group-hover:brightness-110 transition-all";

    if (size === "small") {
        containerClasses = "w-24 h-36 md:w-28 md:h-48";
        textSizeMain = "text-[8px]";
    } else if (size === "large") {
        containerClasses = "w-80 h-[36rem]"; 
        textSizeMain = "text-sm md:text-base";
        textSizeTiny = "text-xs";
        costSize = "w-10 h-10 md:w-12 md:h-12 text-lg";
        
        imageContainerClass = "relative w-full h-64 shrink-0 overflow-hidden bg-slate-900 group-hover:brightness-110 transition-all border-b border-slate-800";
    } else if (size === "normal" || !size) {
        containerClasses = "w-32 h-52 md:w-44 md:h-72";
    } else {
        // Si 'size' no es una de las palabras clave, se asume que es una clase de tamaño (p.ej. 'w-full aspect-[2/3]')
        containerClasses = size;
    }

    // --- RENDERIZADO REVERSO ---
    if (card.hidden) {
        return (
            <div 
                onClick={() => (onClick && onClick(card))}
                className={`${containerClasses} neo-card flex items-center justify-center m-1 flex-shrink-0 !bg-[#0a0a0a] border border-slate-800 shadow-xl rounded-xl cursor-pointer`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-slate-700 opacity-50">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                </svg>
            </div>
        );
    }

    // --- CÁLCULO DE VIDA ---
    const currentHp = card.currentHp !== undefined ? card.currentHp : card.maxHp;
    const hpPct = Math.max(0, Math.min(100, (currentHp / card.maxHp) * 100));
    
    let hpBarColor = "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]";
    if (hpPct <= 50) hpBarColor = "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]";
    if (hpPct <= 20) hpBarColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]";

    // --- OBTENER TIPOS (Seguridad si no están definidos) ---
    const cardTypes = card.types || ["Neutro", "Base", "Común"];

    return (
        <div 
            onClick={() => (onClick && onClick(card))}
            className={`
                ${containerClasses} 
                relative flex flex-col m-1 select-none group flex-shrink-0 
                rounded-xl overflow-hidden transition-all duration-300
                border border-slate-800 bg-[#121212]
                ${canInteract ? 'cursor-pointer ring-2 ring-yellow-500/50 hover:ring-yellow-400' : ''}
                ${size !== 'large' ? 'hover:-translate-y-1 hover:shadow-2xl' : ''}
            `}
        >
            {/* --- CABECERA --- */}
            <div className="absolute top-0 left-0 right-0 h-8 z-20 flex justify-between items-start p-1 pointer-events-none">
                <div className={`${costSize} rounded-full flex items-center justify-center font-black text-[#121212] bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg border border-blue-300 z-30`}>
                    {card.cost}
                </div>
                
                <div className="bg-black/80 backdrop-blur-md px-2 py-1 rounded-bl-lg rounded-tr-lg border-b border-l border-slate-700 ml-auto max-w-[80%]">
                    <div className={`${textSizeMain} font-bold text-gray-100 truncate tracking-tight`}>
                        {card.name}
                    </div>
                </div>
            </div>

            {/* --- ZONA 1: IMAGEN --- */}
            <div className={imageContainerClass}>
                <div className="w-full h-full flex items-center justify-center">
                    {typeof card.image === 'string' ? (
                        <img 
                            src={card.image} 
                            alt={card.name} 
                            className="w-full h-full object-cover opacity-90"
                            onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                    ) : (
                        card.image
                    )}
                </div>

                {card.isFrozen && (
                    <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <div className="bg-black/60 p-2 rounded-full border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 3v18M3 12h18m-6.36-6.36l-9.28 9.28m0-9.28l9.28 9.28" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>
                )}

                {/* --- INDICADORES DE HABILIDADES (ICONOS) --- */}
                {card.abilities && size !== 'large' && (
                    <div className="absolute top-10 right-1 flex flex-col gap-1 z-20 items-end">
                        {card.abilities.map((ab, idx) => {
                            let iconColor = "bg-gray-600";
                            let pathData = "";

                            if (ab.type === 'interaction') { 
                                iconColor = "bg-red-600 border-red-400";
                                pathData = "M14.5 17.5L3 6V3h3l11.5 11.5m-5 2.5 6-6m-4 4 4 4m3 1 2-2";
                            } else if (ab.type === 'response') { 
                                iconColor = "bg-blue-600 border-blue-400";
                                pathData = "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";
                            } else if (ab.type === 'preparation') { 
                                iconColor = "bg-purple-600 border-purple-400";
                                pathData = "m12 3-1.9 5.8a2 2 0 0 1-1.2 1.3l-6.1 2 6.1 2a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.2-1.3l6.1-2-6.1-2a2 2 0 0 1-1.3-1.3z";
                            }

                            return (
                                <div key={idx} className={`w-4 h-4 md:w-5 md:h-5 rounded-full ${iconColor} border flex items-center justify-center shadow-lg`} title={ab.name}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 text-white">
                                        <path d={pathData} />
                                    </svg>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- BARRA DE VIDA INTEGRADA --- */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                    <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-4 pb-1 px-2">
                        <div className="flex justify-between items-end mb-0.5">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">HP</span>
                            <span className="text-[10px] md:text-xs font-mono font-bold text-white drop-shadow-md">
                                {currentHp} <span className="text-gray-500 text-[8px]">/ {card.maxHp}</span>
                            </span>
                        </div>
                        <div className="w-full h-1.5 md:h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                            <div 
                                className={`h-full ${hpBarColor} transition-all duration-500 ease-out`} 
                                style={{ width: `${hpPct}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- ZONA 2: STATS (INAMOVIBLE) --- */}
            <div className="grid grid-cols-3 divide-x divide-slate-800 bg-[#0F0F0F] h-8 md:h-10 border-t border-b border-slate-800 flex-shrink-0 z-10 relative">
                 <div className="flex flex-col items-center justify-center pt-0.5">
                    <span className="text-[6px] md:text-[7px] text-red-500 font-bold uppercase tracking-widest">STR</span>
                    <span className="text-[10px] md:text-sm font-bold text-gray-200">{card.strength}</span>
                </div>
                 <div className="flex flex-col items-center justify-center pt-0.5">
                    <span className="text-[6px] md:text-[7px] text-blue-500 font-bold uppercase tracking-widest">INT</span>
                    <span className="text-[10px] md:text-sm font-bold text-gray-200">{card.intelligence}</span>
                </div>
                 <div className="flex flex-col items-center justify-center pt-0.5">
                    <span className="text-[6px] md:text-[7px] text-purple-500 font-bold uppercase tracking-widest">POW</span>
                    <span className="text-[10px] md:text-sm font-bold text-gray-200">{card.power}</span>
                </div>
            </div>

            {/* --- ZONA TIPOS (MODIFICADA: LETRAS GRANDES EN MODAL, ABREVIADAS EN TABLERO) --- */}
            <div className="flex justify-center items-center gap-1.5 py-1 px-1 bg-[#0c0c0c] border-b border-slate-800 min-h-[22px] flex-wrap z-10">
                {cardTypes.map((type, idx) => {
                    const styleClass = window.GameLogicSynergies?.getTypeColor(type) || 'text-slate-400 border-slate-700';
                    
                    // LÓGICA DE VISUALIZACIÓN DE TIPOS
                    const isLarge = size === 'large';
                    // Si es inspección (large), nombre completo. Si es tablero/mano, solo 3 letras.
                    const displayType = isLarge ? type : type.substring(0, 3);
                    // Si es inspección (large), letra mucho más grande. Si es tablero, pequeña.
                    const fontClass = isLarge ? "text-xs md:text-sm px-2 py-1" : "text-[7px] md:text-[8px] px-1.5 py-0.5";

                    return (
                        <span 
                            key={idx} 
                            className={`${fontClass} font-bold rounded border ${styleClass} uppercase tracking-wider`}
                            title={type} // Tooltip para ver el nombre completo si está abreviado
                        >
                            {displayType}
                        </span>
                    );
                })}
            </div>

            {/* --- ZONA 3: CONTENIDO VARIABLE (SCROLLABLE - SOLO LARGE) --- */}
            {size === 'large' ? (
                <div className="flex-1 overflow-y-auto bg-[#151515] p-0 flex flex-col no-scrollbar">
                    {/* Lista de Habilidades */}
                    {card.abilities && card.abilities.length > 0 && (
                        <div className="px-4 py-3 flex flex-col gap-3">
                            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-slate-700 pb-1 flex justify-between">
                                <span>Habilidades</span>
                                <span className="text-[8px]">Coste</span>
                            </div>
                            {card.abilities.map((ab, idx) => (
                                <div key={idx} className="flex flex-col">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={`text-xs font-bold flex items-center gap-2
                                            ${ab.type === 'interaction' ? 'text-red-400' : 
                                              ab.type === 'response' ? 'text-blue-400' : 'text-purple-400'}
                                        `}>
                                            <span className={`w-1.5 h-1.5 rounded-full inline-block
                                                 ${ab.type === 'interaction' ? 'bg-red-500' : 
                                                   ab.type === 'response' ? 'bg-blue-500' : 'bg-purple-500'}
                                            `}></span>
                                            {ab.name}
                                        </span>
                                        <span className="text-[7px] text-yellow-500 font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                            {ab.cost > 0 ? ab.cost : '0'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-slate-400 leading-snug pl-3.5 opacity-80">
                                        {ab.desc}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Descripción Narrativa */}
                    <div className="mt-auto p-4 border-t border-slate-800 bg-[#111]">
                        <p className="text-gray-500 italic text-xs md:text-sm text-center font-serif leading-relaxed">
                            "{card.desc}"
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
};