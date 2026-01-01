// 2. DASHBOARD (Perfil, Tienda, Mazo) - NEUMORFISTA
const Dashboard = ({ user, userData, onLogout, onStartGame }) => {
    const [view, setView] = React.useState('home'); // home, shop, deck
    const [loading, setLoading] = React.useState(false);
    const [friendEmail, setFriendEmail] = React.useState("");
    const [friendsList, setFriendsList] = React.useState([]);
    const [loadingFriends, setLoadingFriends] = React.useState(false);
    
    // Estado para la carta seleccionada (Zoom)
    const [selectedCard, setSelectedCard] = React.useState(null);

    React.useEffect(() => {
        const fetchFriends = async () => {
            if (!userData.friends || userData.friends.length === 0) {
                setFriendsList([]);
                return;
            }
            try {
                const promises = userData.friends.map(uid => db.collection('users').doc(uid).get());
                const snapshots = await Promise.all(promises);
                setFriendsList(snapshots.map(doc => ({ uid: doc.id, ...doc.data() })));
            } catch (err) { console.error(err); }
        };
        fetchFriends();
    }, [userData.friends]);

    const handleAddFriend = async () => {
        if (!friendEmail.trim()) return;
        setLoadingFriends(true);
        try {
            const qs = await db.collection('users').where('email', '==', friendEmail).get();
            if (qs.empty) { alert("Usuario no encontrado."); setLoadingFriends(false); return; }
            const fid = qs.docs[0].id;
            if (userData.friends && userData.friends.includes(fid)) { alert("Ya es tu amigo."); setLoadingFriends(false); return; }
            await db.collection('users').doc(user.uid).update({ friends: firebase.firestore.FieldValue.arrayUnion(fid) });
            setFriendEmail(""); alert("Agregado!");
        } catch (err) { alert("Error."); }
        setLoadingFriends(false);
    };

    const removeFriend = async (fid) => {
        if(!confirm("¿Eliminar?")) return;
        await db.collection('users').doc(user.uid).update({ friends: firebase.firestore.FieldValue.arrayRemove(fid) });
    };

    const buyPack = async () => {
        if (userData.korehs < 50) return alert("Korehs insuficientes");
        setLoading(true);
        const newCards = [];
        for(let i=0; i<3; i++) newCards.push(ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)].id);
        await db.collection('users').doc(user.uid).update({
            korehs: firebase.firestore.FieldValue.increment(-50),
            collection: firebase.firestore.FieldValue.arrayUnion(...newCards)
        });
        alert(`¡Conseguido: ${newCards.map(id => ALL_CARDS.find(c => c.id === id).name).join(', ')}!`);
        setLoading(false);
    };

    const userCards = (userData.collection || []).map(id => ALL_CARDS.find(c => c.id === id)).filter(Boolean);

    return (
        <div className="min-h-screen flex flex-col relative bg-[var(--bg-main)]">
            
            {/* --- MODAL DE CARTA GRANDE (ZOOM) --- */}
            {selectedCard && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedCard(null)} // Cerrar al hacer clic fuera
                >
                    <div 
                        className="relative transform transition-all scale-100" 
                        onClick={(e) => e.stopPropagation()} // Evitar cierre al hacer clic en la carta
                    >
                        <CardDisplay card={selectedCard} size="large" />
                        
                        {/* Botón Cerrar Flotante */}
                        <button 
                            onClick={() => setSelectedCard(null)}
                            className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* Challenge Overlay */}
            {userData.incomingChallenge && (
                <div className="absolute top-20 right-4 z-50 animate-bounce">
                    <div className="neo-box p-4 border border-yellow-600/30 flex flex-col gap-2 max-w-sm bg-[var(--bg-main)]">
                        <div className="flex items-center gap-2">
                            {/* Icono Espadas */}
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
                                db.collection('users').doc(user.uid).update({ incomingChallenge: null });
                                onStartGame({ mode: 'join_friend', targetPeerId: userData.incomingChallenge.hostPeerId });
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
                        {/* Icono Moneda */}
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
                
                {/* Nav Tabs */}
                <div className="flex gap-4 mb-8 justify-center md:justify-start">
                    <Button variant={view === 'home' ? 'primary' : 'secondary'} onClick={() => setView('home')}>Jugar</Button>
                    <Button variant={view === 'deck' ? 'primary' : 'secondary'} onClick={() => setView('deck')}>Colección</Button>
                    <Button variant={view === 'shop' ? 'primary' : 'secondary'} onClick={() => setView('shop')}>Tienda</Button>
                </div>

                {view === 'home' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* CARD BATALLA */}
                        <div className="neo-box p-8 flex flex-col items-center justify-center h-80">
                            <h2 className="text-3xl mb-4 font-bold text-blue-400">Batalla Online</h2>
                            <p className="text-slate-500 mb-8 text-center max-w-xs">Encuentra un rival aleatorio o espera un desafío.</p>
                            <Button onClick={() => onStartGame({mode: 'normal'})} className="px-8 py-3 text-lg" variant="primary">ENTRAR A LA ARENA</Button>
                        </div>

                        {/* CARD AMIGOS */}
                        <div className="neo-box p-6 flex flex-col h-80">
                            <h2 className="text-xl mb-4 font-bold text-center text-purple-400">Lista de Amigos</h2>
                            
                            <div className="flex gap-2 mb-4">
                                <input 
                                    className="neo-input"
                                    placeholder="Email..." 
                                    value={friendEmail}
                                    onChange={(e) => setFriendEmail(e.target.value)}
                                />
                                <Button onClick={handleAddFriend} disabled={loadingFriends} variant="success">+</Button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-3 neo-inset p-3">
                                {friendsList.length === 0 ? (
                                    <p className="text-slate-600 text-center text-xs mt-10">Sin amigos agregados.</p>
                                ) : (
                                    friendsList.map(friend => (
                                        <div key={friend.uid} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full neo-box flex items-center justify-center text-[10px] text-slate-500">
                                                    {friend.username[0]}
                                                </div>
                                                <div className="text-sm font-bold text-slate-400">{friend.username}</div>
                                            </div>
                                            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <Button onClick={() => onStartGame({ mode: 'host_friend', targetFriendId: friend.uid })} variant="warning" className="px-2 py-1 text-[10px]">
                                                    {/* Espada SVG small */}
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                                                        <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
                                                        <path d="m13 19 6-6"/>
                                                        <path d="M16 16l4 4"/>
                                                        <path d="M19 21l2-2"/>
                                                    </svg>
                                                </Button>
                                                <Button onClick={() => removeFriend(friend.uid)} variant="danger" className="px-2 py-1 text-[10px]">✕</Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'shop' && (
                    <div className="flex justify-center mt-10">
                        <div className="neo-box p-8 w-72 flex flex-col items-center">
                            {/* Icono Paquete SVG */}
                            <div className="text-6xl mb-6 text-slate-300">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20">
                                    <path d="m7.5 4.27 9 5.15"/>
                                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                                    <path d="m3.3 7 8.7 5 8.7-5"/>
                                    <path d="M12 22v-10"/>
                                </svg>
                            </div>
                            
                            <h3 className="text-xl font-bold mb-2 text-slate-200">Sobre Estándar</h3>
                            <p className="text-slate-500 text-sm mb-6">3 cartas aleatorias.</p>
                            <Button onClick={buyPack} disabled={loading || userData.korehs < 50} variant="success" className="w-full">
                                Comprar (50 
                                {/* Moneda SVG Inline mini */}
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mx-1 inline">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                                    <path d="M12 18V6"/>
                                </svg>
                                )
                            </Button>
                        </div>
                    </div>
                )}

                {view === 'deck' && (
                    <div className="neo-inset p-4 md:p-6 min-h-[50vh]">
                        <h2 className="text-xl mb-4 text-slate-400">Cartas Desbloqueadas ({userCards.length})</h2>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            {userCards.map((card, idx) => (
                                <CardDisplay 
                                    key={idx} 
                                    card={card} 
                                    size="normal"
                                    canInteract={true} // Hacemos que parezca interactiva (cursor pointer)
                                    onClick={(c) => setSelectedCard(c)} // Abrir modal al hacer clic
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};