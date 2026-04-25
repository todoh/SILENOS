// --- COMPONENTES UI REUTILIZABLES ---
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

    if (card.hidden) {
        let hiddenClasses = "w-32 h-48 md:w-44 md:h-64";
        if (size === "small") hiddenClasses = "w-24 h-36 md:w-28 md:h-44";
        if (size === "large") hiddenClasses = "w-[40rem] h-[28rem]";
        
        return (
            <div 
                onClick={() => (onClick && onClick(card))}
                className={`${hiddenClasses} flex items-center justify-center m-1 flex-shrink-0 bg-[#111] border border-white/5 rounded-xl cursor-pointer shadow-lg transition-transform hover:scale-105`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-white/20">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                </svg>
            </div>
        );
    }

    const currentHp = card.currentHp !== undefined ? card.currentHp : card.maxHp;
    const hpPct = Math.max(0, Math.min(100, (currentHp / card.maxHp) * 100));
    
    let hpBarColor = "bg-green-400";
    if (hpPct <= 50) hpBarColor = "bg-yellow-400";
    if (hpPct <= 20) hpBarColor = "bg-red-500";

    const cardTypes = card.types || ["Neutro", "Base"];

    // --- VISTA GRANDE (ZOOM GLOBAL - MINIMALISTA PURE) ---
    if (size === "large") {
        return (
            <div 
                onClick={() => (onClick && onClick(card))}
                className={`
                    w-[90vw] max-w-[850px] h-[80vh] md:h-[65vh] max-h-[600px]
                    relative flex flex-col md:flex-row m-1 select-none group flex-shrink-0 
                    rounded-2xl overflow-hidden transition-all duration-300
                    bg-[#0a0a0c] shadow-2xl border border-white/10
                `}
            >
                {/* LADO IZQUIERDO: Imagen 100% limpia, sin degradados ni sombras */}
                <div className="relative w-full md:w-5/12 h-1/2 md:h-full flex-shrink-0 bg-black">
                    {typeof card.image === 'string' ? (
                        <img 
                            src={card.image} 
                            alt={card.name} 
                            className="w-full h-full object-cover object-center"
                            onError={(e) => { e.target.style.display = 'none'; }} 
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900">{card.image}</div>
                    )}
                    
                    {/* Coste Minimalista en la esquina */}
                    <div className="absolute top-4 left-4 z-20">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white bg-black/40 backdrop-blur-md border border-white/20 text-lg">
                            {card.cost}
                        </div>
                    </div>

                    {/* Estado de Congelación (Efecto cristal claro, no oscuro) */}
                    {card.isFrozen && (
                        <div className="absolute inset-0 bg-blue-400/10 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-blue-300/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M12 3v18M3 12h18m-6.36-6.36l-9.28 9.28m0-9.28l9.28 9.28" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* LADO DERECHO: Información organizada, sin cajas negras de fondo */}
                <div className="w-full md:w-7/12 flex flex-col h-1/2 md:h-full p-6 md:p-8 text-white">
                    
                    {/* Cabecera: Nombre y Tipos */}
                    <div className="mb-6">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none mb-3">
                            {card.name}
                        </h2>
                        <div className="flex gap-2 flex-wrap">
                            {cardTypes.map((type, idx) => {
                                const styleClass = window.GameLogicSynergies?.getTypeColor(type) || 'text-gray-400';
                                // Extraer solo el color del texto para un look minimalista
                                const textColor = styleClass.split(' ')[0]; 
                                return (
                                    <span key={idx} className={`text-xs font-bold uppercase tracking-widest ${textColor}`}>
                                        {type}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Barra de Vida Minimalista */}
                    <div className="mb-8">
                        <div className="flex justify-between items-end mb-1.5">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Vitalidad</span>
                            <span className="text-sm font-mono font-bold">
                                {currentHp} <span className="text-gray-600">/ {card.maxHp}</span>
                            </span>
                        </div>
                        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full ${hpBarColor} transition-all duration-500`} style={{ width: `${hpPct}%` }}></div>
                        </div>
                    </div>

                    {/* Estadísticas (Puro texto, sin bordes ni cajas) */}
                    <div className="flex justify-between items-center mb-8 px-2">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">ATK</span>
                            <span className="text-2xl font-light text-red-400">{card.attack || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">SATK</span>
                            <span className="text-2xl font-light text-orange-400">{card.specialAttack || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">DEF</span>
                            <span className="text-2xl font-light text-blue-400">{card.defense || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">SDEF</span>
                            <span className="text-2xl font-light text-cyan-400">{card.specialDefense || 0}</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">POW</span>
                            <span className="text-2xl font-light text-yellow-400">{card.power || 0}</span>
                        </div>
                    </div>

                    {/* Lista de Habilidades */}
                    <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        {card.abilities && card.abilities.length > 0 ? (
                            <div className="flex flex-col gap-5">
                                {card.abilities.map((ab, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-1.5 h-1.5 rounded-full 
                                                ${ab.type === 'interaction' ? 'bg-red-400' : 
                                                  ab.type === 'response' ? 'bg-blue-400' : 'bg-purple-400'}
                                            `}></span>
                                            <span className="text-sm font-bold text-gray-200 tracking-wide uppercase">{ab.name}</span>
                                            {ab.cost > 0 && (
                                                <span className="ml-auto text-[10px] text-yellow-500 font-mono border border-yellow-500/30 px-1.5 py-0.5 rounded">
                                                    {ab.cost} ENG
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 leading-relaxed pl-3.5 font-light">
                                            {ab.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-600 font-light mt-4">Sin habilidades especiales.</div>
                        )}
                    </div>
                    
                    {/* Lore / Descripción */}
                    {card.desc && (
                        <div className="mt-6 pt-4 border-t border-white/5 flex-shrink-0">
                            <p className="text-gray-500 italic text-xs font-serif leading-relaxed">
                                "{card.desc}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VISTA NORMAL/PEQUEÑA (Full Art Minimalista para Tablero/Mano) ---
    let containerClasses = size === "small" ? "w-[6rem] h-[8.5rem] md:w-[6.5rem] md:h-[9.5rem]" : "w-[8.5rem] h-[12rem] md:w-40 md:h-[14rem]";
    let nameSize = size === "small" ? "text-[8px]" : "text-[10px]";
    let costSize = size === "small" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[11px]";
    let statsSize = size === "small" ? "text-[8px]" : "text-[10px]";
    let statsLabelSize = size === "small" ? "text-[4px]" : "text-[5px]";

    return (
        <div 
            onClick={() => (onClick && onClick(card))}
            className={`
                ${containerClasses} 
                relative flex flex-col m-1 select-none group flex-shrink-0 
                rounded-lg overflow-hidden transition-all duration-300
                bg-[#0a0a0a] border border-white/10
                ${canInteract ? 'cursor-pointer hover:-translate-y-1 hover:border-white/40 shadow-[0_4px_12px_rgba(0,0,0,0.5)]' : 'shadow-md'}
            `}
        >
            {/* Imagen 100% visible sin gradientes oscurecedores arriba */}
            {typeof card.image === 'string' ? (
                <img 
                    src={card.image} 
                    alt={card.name} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { e.target.style.display = 'none'; }} 
                />
            ) : (
                <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">{card.image}</div>
            )}

            {/* Efecto Congelado suave */}
            {card.isFrozen && (
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-200 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 3v18M3 12h18m-6.36-6.36l-9.28 9.28m0-9.28l9.28 9.28" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            )}

            {/* Coste Minimalista */}
            <div className="absolute top-1.5 left-1.5 z-20">
                <div className={`${costSize} rounded-full flex items-center justify-center font-bold text-white bg-black/60 backdrop-blur-sm border border-white/20`}>
                    {card.cost}
                </div>
            </div>

            {/* Nombre (Flotante arriba a la derecha con sombra de texto sutil, sin caja) */}
            <div className="absolute top-2 right-2 z-20 max-w-[70%] text-right pointer-events-none">
                <div className={`${nameSize} font-bold text-white uppercase tracking-wider leading-tight`} style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9), 0px 0px 1px rgba(0,0,0,1)' }}>
                    {card.name}
                </div>
            </div>

            {/* Panel Inferior: Stats y Vida (Cristalino y ultra fino) */}
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-md border-t border-white/10 pt-1 pb-1.5 px-1.5 pointer-events-none">
                
                {/* Cuadrícula de Stats */}
                <div className="flex justify-between items-center mb-1 px-0.5">
                    <div className="flex flex-col items-center">
                        <span className={`${statsLabelSize} text-gray-300 uppercase`}>Atk</span>
                        <span className={`${statsSize} font-bold text-red-400 leading-none`}>{card.attack || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className={`${statsLabelSize} text-gray-300 uppercase`}>Sat</span>
                        <span className={`${statsSize} font-bold text-orange-400 leading-none`}>{card.specialAttack || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className={`${statsLabelSize} text-gray-300 uppercase`}>Def</span>
                        <span className={`${statsSize} font-bold text-blue-400 leading-none`}>{card.defense || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className={`${statsLabelSize} text-gray-300 uppercase`}>Sdf</span>
                        <span className={`${statsSize} font-bold text-cyan-400 leading-none`}>{card.specialDefense || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className={`${statsLabelSize} text-gray-300 uppercase`}>Pow</span>
                        <span className={`${statsSize} font-bold text-yellow-400 leading-none`}>{card.power || 0}</span>
                    </div>
                </div>

                {/* Barra de HP super fina */}
                <div className="px-0.5">
                    <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                        <div className={`h-full ${hpBarColor}`} style={{ width: `${hpPct}%` }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};