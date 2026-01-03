// 5. COMPONENTE PRINCIPAL: DASHBOARD CONTENEDOR
// Sobreescribir: Cartas Silen/dashboard.js

const Dashboard = ({ user, userData, onLogout, onStartGame }) => {
    const [view, setView] = React.useState('home'); // home, shop, deck
    const [selectedCard, setSelectedCard] = React.useState(null);

    return (
        <div className="min-h-screen flex flex-col relative bg-[var(--bg-main)]">
            
            {/* --- MODAL DE CARTA GRANDE (ZOOM GLOBAL) --- */}
            {selectedCard && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedCard(null)} 
                >
                    <div 
                        className="relative transform transition-all scale-100" 
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <CardDisplay card={selectedCard} size="large" />
                        
                        <button 
                            onClick={() => setSelectedCard(null)}
                            className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Challenge Overlay (Desafíos entrantes) */}
            {userData.incomingChallenge && (
                <div className="absolute top-20 right-4 z-50 animate-bounce">
                    <div className="neo-box p-4 border border-yellow-600/30 flex flex-col gap-2 max-w-sm bg-[var(--bg-main)]">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-yellow-500">
                                <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
                                <path d="m13 19 6-6"/>
                                <path d="M16 16l4 4"/>
                                <path d="M19 21l2-2"/>
                            </svg>
                            <div>
                                <h3 className="font-bold text-yellow-500">DESAFÍO</h3>
                                <p className="text-sm text-slate-400">De: {userData.incomingChallenge.hostName}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button variant="success" onClick={() => {
                                const targetId = userData.incomingChallenge.hostPeerId;
                                onStartGame({ mode: 'join_friend', targetPeerId: targetId });
                                db.collection('users').doc(user.uid).update({ incomingChallenge: null });
                            }} className="flex-1">Aceptar</Button>
                            
                            <Button variant="danger" onClick={() => db.collection('users').doc(user.uid).update({ incomingChallenge: null })} className="flex-1">Rechazar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Neumorfista */}
            <header className="p-4 flex justify-between items-center z-10 neo-box rounded-none border-t-0 border-x-0 mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl md:text-2xl text-[var(--text-main)] font-bold tracking-widest pl-2"><span className="text-red-500">CARTAS </span>SILEN</h1>
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                    <div className="neo-inset px-4 py-2 rounded-full flex items-center gap-2">
                     {/* Nav Tabs */}
                <div >
                    <Button variant={view === 'home' ? 'primary' : 'secondary'} onClick={() => setView('home')}>Jugar</Button>
                    <Button variant={view === 'deck' ? 'primary' : 'secondary'} onClick={() => setView('deck')}>Colección</Button>
                    <Button variant={view === 'shop' ? 'primary' : 'secondary'} onClick={() => setView('shop')}>Tienda</Button>
                </div>
                
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-yellow-500">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                            <path d="M12 18V6"/>
                        </svg>
                        <span className="font-bold text-slate-300 text-sm">{userData.korehs}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 neo-box rounded-full flex items-center justify-center overflow-hidden p-1">
                            {userData.photoURL ? 
                                <img src={userData.photoURL} alt="Av" className="w-full h-full rounded-full object-cover" /> : 
                                <span className="text-slate-500 font-bold">{userData.username?.[0]}</span>
                            }
                        </div>
                        <span className="font-bold text-sm hidden md:inline text-slate-400">{userData.username}</span>
                    </div>
                    <Button variant="secondary" onClick={onLogout}>Salir</Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
                
               

                {/* --- RENDERIZADO DE SUB-COMPONENTES --- */}
                
                {view === 'home' && (
                    <DashboardHome 
                        user={user} 
                        userData={userData} 
                        onStartGame={onStartGame} 
                    />
                )}

                {view === 'shop' && (
                    <DashboardShop 
                        user={user} 
                        userData={userData} 
                        setSelectedCard={setSelectedCard} 
                    />
                )}

                {view === 'deck' && (
                    <DashboardDeck 
                        user={user} 
                        userData={userData} 
                        setSelectedCard={setSelectedCard} 
                    />
                )}
            </div>
        </div>
    );
};