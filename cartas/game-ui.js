// --- COMPONENTES DE UI JUEGO ---

const LobbyScreen = ({ status, gameConfig, myPeerId, targetPeerId, setTargetPeerId, connectToPeer, onBack }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[var(--bg-main)]">
            <Button variant="secondary" onClick={onBack} className="absolute top-4 left-4">Volver</Button>
            
            <div className="neo-box p-8 max-w-md w-full flex flex-col gap-6 text-center">
                <h2 className="text-2xl text-yellow-500 font-bold tracking-widest">
                    {gameConfig.mode === 'host_friend' ? "DESAFIANDO..." : "SALA DE ESPERA"}
                </h2>
                
                {gameConfig.mode === 'host_friend' ? (
                        <div className="py-8"><p className="text-slate-400 animate-pulse">Esperando a tu amigo...</p></div>
                ) : (
                    <>
                        <div className="neo-inset p-4">
                            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-2">Tu ID de Conexión</p>
                            <div 
                                className="text-slate-300 font-mono text-sm break-all cursor-pointer hover:text-blue-400 transition-colors" 
                                onClick={() => navigator.clipboard.writeText(myPeerId)}
                            >
                                {myPeerId || "..."} 
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-4 text-left">
                            <label className="text-xs text-slate-500 ml-1">ID del Rival:</label>
                            <div className="flex gap-2">
                                <input 
                                    placeholder="Pegar ID aquí..." 
                                    value={targetPeerId} 
                                    onChange={e => setTargetPeerId(e.target.value)} 
                                    className="neo-input text-sm"
                                />
                                <Button onClick={connectToPeer}>Unirse</Button>
                            </div>
                        </div>
                    </>
                )}
                <div className="text-xs text-slate-600 font-mono mt-2">Estado: {status}</div>
            </div>
        </div>
    );
};

const GameTopBar = ({ isMyTurn, gameLog, phase, onBack }) => {
    const phases = {
        'response': { label: 'DEFENSA', color: 'text-red-400' },
        'main': { label: 'TU TURNO', color: 'text-green-400' },
        'waiting': { label: 'RIVAL', color: 'text-slate-500' }
    };
    const current = isMyTurn ? (phases[phase] || phases['main']) : phases['waiting'];

    return (
        <div className="neo-box rounded-none border-x-0 border-t-0 z-30 flex justify-between items-center px-4 py-2 h-14 mb-0 relative bg-[var(--bg-main)]">
            <div className="flex items-center gap-4 w-full overflow-hidden">
                <div className={`font-bold text-lg ${current.color} whitespace-nowrap min-w-[80px]`}>
                    {current.label}
                </div>
                
                {/* Log en un contenedor hundido */}
                <div className="neo-inset flex-1 px-3 py-1.5 overflow-hidden flex items-center h-8">
                    <span className="text-slate-400 italic text-xs truncate w-full">
                        {gameLog[0] || "Inicio del duelo"}
                    </span>
                </div>
            </div>
            
            <Button variant="danger" onClick={onBack} className="ml-3 text-[10px] px-2">Salir</Button>
        </div>
    );
};