
// --- COMPONENTES DEL TABLERO DE JUGADORES ---

const OpponentBoard = ({ player, isMyTurn }) => {
    return (
        <div className="flex flex-col items-center border-b border-white/10 bg-black/20 pb-2">
            {/* Stats Rival */}
            <div className="flex w-full justify-between items-center px-4 py-2 bg-slate-950 text-slate-300">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-yellow-500">{player.points} / 30</span>
                        <span className="text-[10px] uppercase">Puntos</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-xl font-bold text-blue-400">⚡ {player.energy}</span>
                        <span className="text-[10px] uppercase">Energía</span>
                    </div>
                </div>
                <div className="font-bold text-lg">{player.name}</div>
            </div>

            {/* Mano Rival (Oculta) */}
            <div className="flex justify-center -mt-4 mb-2">
                {player.hand.map((_, i) => (
                    <div key={i} className="w-16 h-24 bg-slate-800 border border-slate-600 rounded m-1 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] shadow-lg"></div>
                ))}
            </div>

            {/* Campo Rival */}
            <div className="flex justify-center gap-2 min-h-[160px] items-center">
                {player.field.map((unit, idx) => (
                    <CardDisplay key={idx} card={unit} size="small" />
                ))}
            </div>
        </div>
    );
};

const PlayerBoard = ({ player, isMyTurn, phase, playCard, useAbility, advancePhase, incomingStack, assignDefender }) => {
    // Texto del botón de fase
    let phaseBtnText = "Esperando...";
    let canAdvance = false;
    
    if (isMyTurn) {
        if (phase === 'response') { phaseBtnText = "Resolver Combates"; canAdvance = true; }
        else if (phase === 'preparation') { phaseBtnText = "Fin Preparación -> Combatir"; canAdvance = true; }
        else if (phase === 'interaction') { phaseBtnText = "Terminar Turno"; canAdvance = true; }
    }

    // Manejador inteligente de clics en unidades (Shortcut UX)
    const handleUnitClick = (unit) => {
        if (!isMyTurn) return;

        // Si estamos defendiendo, clic en carta = usar habilidad 'def'
        if (phase === 'response') {
            useAbility(unit.uuid, 'def');
        }
        // Si estamos atacando, clic en carta = usar habilidad 'atk'
        else if (phase === 'interaction') {
            useAbility(unit.uuid, 'atk');
        }
    };

    return (
        <div className="flex-1 flex flex-col justify-end bg-gradient-to-t from-slate-900 to-slate-900/50 relative">
            
            {/* ZONA DE RESPUESTA (Solo visible en Fase Respuesta) */}
            {isMyTurn && phase === 'response' && incomingStack.length > 0 && (
                <div className="absolute top-0 left-0 right-0 bg-red-900/80 p-2 z-20 flex flex-col items-center animate-pulse">
                    <h3 className="text-white font-bold text-lg mb-2">⚠️ ¡ATAQUES ENTRANTES! ASIGNA DEFENSORES ⚠️</h3>
                    <div className="flex gap-4 overflow-x-auto w-full justify-center">
                        {incomingStack.map((action, idx) => (
                            <div key={idx} className="bg-slate-800 p-2 rounded border border-red-500 min-w-[200px] flex flex-col gap-2">
                                <div className="text-white text-sm font-bold">{action.sourceCardName}</div>
                                <div className="text-xs text-red-300">Poder de Ataque: {action.sourceStats}</div>
                                <div className="text-xs text-yellow-300">Habilidad: {action.abilityName}</div>
                                
                                {action.blockerUuid ? (
                                    <div className="bg-green-700 text-white text-xs p-1 text-center rounded">
                                        Bloqueado por tu carta
                                    </div>
                                ) : (
                                    <div className="text-xs text-center text-slate-400 italic">Clic en tu carta para bloquear</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Campo Jugador */}
            <div className="flex justify-center gap-2 mb-4 min-h-[160px] items-end px-4">
                {player.field.map((unit, idx) => (
                    <div key={idx} onClick={() => handleUnitClick(unit)}>
                        <CardDisplay 
                            card={unit} 
                            canInteract={isMyTurn}
                            // Mostrar habilidades en TODAS las fases activas (Prep, Interacción y Respuesta)
                            showAbilities={isMyTurn && ['preparation', 'interaction', 'response'].includes(phase)}
                            // CORRECCIÓN IMPORTANTE: Extraer los IDs antes de enviarlos a useAbility
                            onUseAbility={(c, a) => useAbility(c.uuid, a.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Panel de Control Stats + Mano */}
            <div className="bg-slate-950 p-4 border-t border-slate-700 flex flex-col md:flex-row items-center gap-4 relative">
                
                {/* Stats */}
                <div className="flex items-center gap-6 min-w-max">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-yellow-500 drop-shadow-lg">{player.points}</div>
                        <div className="text-[10px] uppercase text-slate-400">Puntos (Meta 30)</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-500 drop-shadow-lg">⚡ {player.energy}</div>
                        <div className="text-[10px] uppercase text-slate-400">Energía / {player.maxEnergy}</div>
                    </div>
                </div>

                {/* Botón Fase */}
                <div className="flex-1 flex justify-center w-full">
                     <Button 
                        onClick={advancePhase} 
                        disabled={!canAdvance} 
                        className={`w-full md:w-auto py-3 px-8 text-lg shadow-xl ${phase === 'interaction' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600'}`}
                    >
                        {phaseBtnText}
                    </Button>
                </div>

                {/* Mano */}
                <div className="flex gap-2 overflow-x-auto pb-2 absolute bottom-full md:bottom-auto md:relative right-0 md:right-auto px-4 md:px-0">
                    {player.hand.map((card, idx) => (
                        <div key={idx} className="hover:-translate-y-10 transition-transform duration-300">
                             <CardDisplay 
                                card={card} 
                                size="normal" 
                                canInteract={isMyTurn && phase === 'preparation'}
                                onClick={() => playCard(idx)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
