// --- ANIMACIÓN DE APERTURA DE SOBRES (ULTRA MINIMALISTA) ---
// Guardar como: cartas/dashboard-pack-animation.js

const PackOpeningAnimation = ({ cards, onClose }) => {
    const [phase, setPhase] = React.useState('intro'); // Fases: 'intro', 'reveal'
    const [revealedCount, setRevealedCount] = React.useState(0);

    React.useEffect(() => {
        // Fase 1: El sobre aparece brevemente (1 segundo)
        if (phase === 'intro') {
            const t = setTimeout(() => setPhase('reveal'), 1000);
            return () => clearTimeout(t);
        }
        // Fase 2: Las cartas van apareciendo suavemente sin flash
        if (phase === 'reveal') {
            if (revealedCount < cards.length) {
                const t = setTimeout(() => setRevealedCount(prev => prev + 1), 200);
                return () => clearTimeout(t);
            }
        }
    }, [phase, revealedCount, cards.length]);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-md transition-all duration-700">
            
            {/* Botón para cerrar: Minimalista y elegante */}
            {phase === 'reveal' && revealedCount >= cards.length && (
                <div 
                    className="absolute bottom-10 animate-in fade-in slide-in-from-bottom-4 duration-700 cursor-pointer text-slate-300 hover:text-white tracking-[0.3em] text-sm font-light uppercase transition-all px-8 py-2 border border-white/20 rounded-full hover:bg-white/10 shadow-lg z-50 bg-black/20"
                    onClick={onClose}
                >
                    Continuar
                </div>
            )}

            {/* Fase 1: El Sobre (Icono sutil y rápido) */}
            {phase === 'intro' && (
                <div className="relative flex items-center justify-center animate-in zoom-in duration-500">
                    <div className="w-20 h-28 border border-white/30 rounded-lg flex items-center justify-center bg-black/20 shadow-[0_0_30px_rgba(255,255,255,0.1)] animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7V4h16v3"/>
                            <path d="M4 20h16v-3"/>
                            <path d="M12 11v6"/>
                            <path d="m8 14 4 3 4-3"/>
                        </svg>
                    </div>
                </div>
            )}

            {/* Fase 2: Revelación de las Cartas */}
            {phase === 'reveal' && (
                <div className="flex flex-wrap justify-center items-center gap-6 px-4 w-full h-full pb-20 pt-10 overflow-y-auto">
                    {cards.map((card, idx) => (
                        <div 
                            key={idx} 
                            className={`
                                transition-all duration-700 ease-out transform
                                ${idx < revealedCount ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-8'}
                            `}
                        >
                            <div className="relative group">
                                {/* Brillo sutil al hacer hover para resaltar la carta */}
                                <div className="absolute -inset-1 bg-white/10 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="transform transition-transform duration-300 group-hover:-translate-y-2 shadow-2xl">
                                    <CardDisplay card={card} size="normal" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};