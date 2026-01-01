// --- COMPONENTES DE UI GENERAL DEL JUEGO ---

const LobbyScreen = ({ status, gameConfig, myPeerId, targetPeerId, setTargetPeerId, connectToPeer, onBack }) => {
    // (Igual que antes, sin cambios necesarios aquí, se mantiene funcionalidad)
    const isChallenging = gameConfig.mode === 'host_friend';
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900">
            <Button variant="secondary" onClick={onBack} className="absolute top-4 left-4">Volver</Button>
            <div className="glass p-8 rounded-xl max-w-md w-full">
                <h2 className="text-2xl text-yellow-500 mb-6 text-center">
                    {isChallenging ? "Desafiando Amigo..." : "Sala de Espera"}
                </h2>
                {isChallenging ? (
                        <div className="text-center"><p className="text-slate-300">Esperando...</p></div>
                ) : (
                    <>
                        <div className="mb-6 text-center">
                            <p className="text-slate-400 mb-2">Tu ID:</p>
                            <div className="bg-slate-800 p-2 rounded text-xs break-all cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(myPeerId)}>
                                {myPeerId || "Generando..."} (Click copiar)
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input placeholder="ID del rival" value={targetPeerId} onChange={e => setTargetPeerId(e.target.value)} className="bg-slate-800 p-2 rounded w-full border border-slate-600 text-white" />
                            <Button onClick={connectToPeer}>Unirse</Button>
                        </div>
                    </>
                )}
                <div className="text-center mt-4 text-xs text-slate-500">{status}</div>
            </div>
        </div>
    );
};

const GameTopBar = ({ isMyTurn, gameLog, phase, onBack }) => {
    const phases = {
        'response': { label: 'FASE 1: RESPUESTA', color: 'text-orange-400' },
        'preparation': { label: 'FASE 2: PREPARACIÓN', color: 'text-blue-400' },
        'interaction': { label: 'FASE 3: INTERACCIÓN', color: 'text-red-400' },
        'waiting': { label: 'TURNO RIVAL', color: 'text-slate-500' }
    };

    const currentInfo = isMyTurn ? phases[phase] : phases['waiting'];

    return (
        <div className="bg-slate-950 p-2 flex justify-between items-center text-xs md:text-sm shadow-md z-30 border-b border-slate-800">
            <div className="flex items-center gap-4">
                <span className={`font-bold text-lg ${currentInfo.color} animate-pulse`}>
                    {currentInfo.label}
                </span>
                <span className="text-slate-400 hidden md:inline truncate max-w-xs">Log: {gameLog[0]}</span>
            </div>
            <Button variant="danger" onClick={onBack} className="px-2 py-1 text-[10px]">Abandonar</Button>
        </div>
    );
};