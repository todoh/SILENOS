// 2. DASHBOARD (Perfil, Tienda, Mazo)
const Dashboard = ({ user, userData, onLogout, onStartGame }) => {
    const [view, setView] = React.useState('home'); // home, shop, deck
    const [loading, setLoading] = React.useState(false);
    
    // Estados para Amigos
    const [friendEmail, setFriendEmail] = React.useState("");
    const [friendsList, setFriendsList] = React.useState([]);
    const [loadingFriends, setLoadingFriends] = React.useState(false);

    // Cargar datos de amigos cuando cambie la lista de IDs en userData
    React.useEffect(() => {
        const fetchFriends = async () => {
            if (!userData.friends || userData.friends.length === 0) {
                setFriendsList([]);
                return;
            }
            
            try {
                // Buscamos la info de cada amigo
                const promises = userData.friends.map(uid => db.collection('users').doc(uid).get());
                const snapshots = await Promise.all(promises);
                const friendsData = snapshots.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                }));
                setFriendsList(friendsData);
            } catch (err) {
                console.error("Error cargando amigos:", err);
            }
        };

        fetchFriends();
    }, [userData.friends]);

    const handleAddFriend = async () => {
        if (!friendEmail.trim()) return;
        if (friendEmail === user.email) return alert("No puedes agregarte a ti mismo.");

        setLoadingFriends(true);
        try {
            // Buscar usuario por email
            const querySnapshot = await db.collection('users').where('email', '==', friendEmail).get();
            
            if (querySnapshot.empty) {
                alert("Usuario no encontrado.");
                setLoadingFriends(false);
                return;
            }

            const friendDoc = querySnapshot.docs[0];
            const friendId = friendDoc.id;

            // Verificar si ya es amigo
            if (userData.friends && userData.friends.includes(friendId)) {
                alert("Este usuario ya está en tu lista de amigos.");
                setLoadingFriends(false);
                return;
            }

            // Actualizar mi lista de amigos
            await db.collection('users').doc(user.uid).update({
                friends: firebase.firestore.FieldValue.arrayUnion(friendId)
            });

            setFriendEmail("");
            alert(`¡${friendDoc.data().username} agregado!`);

        } catch (err) {
            console.error("Error al agregar amigo:", err);
            alert("Error al agregar amigo.");
        }
        setLoadingFriends(false);
    };

    const removeFriend = async (friendId) => {
        if(!confirm("¿Eliminar amigo?")) return;
        try {
             await db.collection('users').doc(user.uid).update({
                friends: firebase.firestore.FieldValue.arrayRemove(friendId)
            });
        } catch (err) {
            console.error(err);
        }
    };

    // Funciones de Desafío
    const challengeFriend = (friendId) => {
        // Iniciar juego en modo HOST dirigido a un amigo
        onStartGame({ mode: 'host_friend', targetFriendId: friendId });
    };

    const acceptChallenge = async () => {
        if (!userData.incomingChallenge) return;
        const challenge = userData.incomingChallenge;
        
        // Limpiamos el desafío de la DB
        await db.collection('users').doc(user.uid).update({
            incomingChallenge: null
        });

        // Iniciamos juego en modo JOIN conectando al PeerID del retador
        onStartGame({ mode: 'join_friend', targetPeerId: challenge.hostPeerId });
    };

    const rejectChallenge = async () => {
        await db.collection('users').doc(user.uid).update({
            incomingChallenge: null
        });
    };

    const buyPack = async () => {
        if (userData.korehs < 50) return alert("No tienes suficientes Korehs");
        setLoading(true);
        const newCards = [];
        // Lógica de Gacha simple: 3 cartas aleatorias
        for(let i=0; i<3; i++) {
            const randomCard = ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
            newCards.push(randomCard.id);
        }

        try {
            await db.collection('users').doc(user.uid).update({
                korehs: firebase.firestore.FieldValue.increment(-50),
                collection: firebase.firestore.FieldValue.arrayUnion(...newCards)
            });
            alert(`¡Has conseguido: ${newCards.map(id => ALL_CARDS.find(c => c.id === id).name).join(', ')}!`);
        } catch (err) {
            console.error("Error comprando", err);
        }
        setLoading(false);
    };

    const userCards = (userData.collection || []).map(id => ALL_CARDS.find(c => c.id === id)).filter(Boolean);

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col relative">
            
            {/* Notificación de Desafío (Overlay) */}
            {userData.incomingChallenge && (
                <div className="absolute top-20 right-4 z-50 animate-bounce">
                    <div className="glass p-4 rounded-xl border border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] flex flex-col gap-2 max-w-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">⚔️</span>
                            <div>
                                <h3 className="font-bold text-yellow-500">¡DESAFÍO RECIBIDO!</h3>
                                <p className="text-sm text-white">De: <span className="font-bold">{userData.incomingChallenge.hostName}</span></p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <Button variant="success" onClick={acceptChallenge} className="text-sm flex-1">Aceptar</Button>
                            <Button variant="danger" onClick={rejectChallenge} className="text-sm flex-1">Rechazar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl text-yellow-500 font-bold tracking-widest">SILENOS</h1>
                    <span className="text-slate-400 text-sm">Beta v1.0</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="bg-slate-800 px-4 py-1 rounded-full border border-yellow-600 flex items-center gap-2">
                        <span className="text-yellow-400 text-lg">🪙</span>
                        <span className="font-bold text-yellow-100">{userData.korehs} Korehs</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white overflow-hidden border border-slate-500">
                            {userData.photoURL ? 
                                <img src={userData.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : 
                                userData.username?.[0].toUpperCase()
                            }
                        </div>
                        <span className="font-bold hidden md:inline">{userData.username}</span>
                    </div>
                    <Button variant="secondary" onClick={onLogout} className="text-xs">Salir</Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
                {/* Navigation Tabs */}
                <div className="flex gap-4 mb-8">
                    <Button variant={view === 'home' ? 'primary' : 'secondary'} onClick={() => setView('home')}>Jugar</Button>
                    <Button variant={view === 'deck' ? 'primary' : 'secondary'} onClick={() => setView('deck')}>Mi Colección</Button>
                    <Button variant={view === 'shop' ? 'primary' : 'secondary'} onClick={() => setView('shop')}>Tienda</Button>
                </div>

                {view === 'home' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* CARD BATALLA */}
                        <div className="glass p-8 rounded-xl flex flex-col items-center justify-center h-96 border-t-4 border-blue-500">
                            <h2 className="text-3xl mb-4 font-bold">Batalla Online</h2>
                            <p className="text-slate-400 mb-6 text-center">Desafía a tus amigos mediante conexión P2P directa.</p>
                            <Button onClick={() => onStartGame({mode: 'normal'})} className="text-xl px-8 py-3 w-full md:w-auto">ENTRAR A LA ARENA</Button>
                        </div>

                        {/* CARD AMIGOS (MODIFICADA) */}
                        <div className="glass p-6 rounded-xl flex flex-col h-96 border-t-4 border-purple-500">
                            <h2 className="text-2xl mb-4 font-bold text-center flex items-center justify-center gap-2">
                                👥 Amigos <span className="text-sm text-slate-400 font-normal">({friendsList.length})</span>
                            </h2>
                            
                            {/* Input Añadir */}
                            <div className="flex gap-2 mb-4">
                                <input 
                                    type="email" 
                                    placeholder="Email del amigo..." 
                                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 w-full text-sm focus:border-purple-500 outline-none"
                                    value={friendEmail}
                                    onChange={(e) => setFriendEmail(e.target.value)}
                                />
                                <Button onClick={handleAddFriend} disabled={loadingFriends} variant="success" className="text-sm px-3">
                                    +
                                </Button>
                            </div>

                            {/* Lista Scrollable */}
                            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-2 bg-slate-950/30 p-2 rounded">
                                {friendsList.length === 0 ? (
                                    <p className="text-slate-500 text-center text-sm mt-10">No tienes amigos agregados.</p>
                                ) : (
                                    friendsList.map(friend => (
                                        <div key={friend.uid} className="bg-slate-800 p-2 rounded flex items-center justify-between group hover:bg-slate-750 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-purple-900 rounded-full flex items-center justify-center text-xs overflow-hidden">
                                                    {friend.photoURL ? <img src={friend.photoURL} className="w-full h-full object-cover"/> : friend.username[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-sm text-slate-200">{friend.username}</div>
                                                    <div className="text-[10px] text-slate-400">Online</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => challengeFriend(friend.uid)}
                                                    className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-1 rounded font-bold shadow-md"
                                                    title="Desafiar"
                                                >
                                                    ⚔️
                                                </button>
                                                <button 
                                                    onClick={() => removeFriend(friend.uid)}
                                                    className="text-slate-500 hover:text-red-400 px-1"
                                                    title="Eliminar"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {view === 'shop' && (
                    <div className="text-center">
                        <h2 className="text-3xl text-yellow-500 mb-8">Mercado Negro</h2>
                        <div className="flex justify-center">
                            <div className="glass p-6 rounded-xl w-64 flex flex-col items-center border border-yellow-600 hover:shadow-yellow-900/50 shadow-2xl transition-all">
                                <div className="text-6xl mb-4">📦</div>
                                <h3 className="text-xl font-bold mb-2">Sobre Estándar</h3>
                                <p className="text-slate-400 text-sm mb-4">Contiene 3 cartas aleatorias.</p>
                                <Button onClick={buyPack} disabled={loading || userData.korehs < 50} variant="success" className="w-full">
                                    Comprar (50 🪙)
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'deck' && (
                    <div>
                        <h2 className="text-2xl mb-4 border-b border-slate-700 pb-2">Tu Colección ({userCards.length})</h2>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            {userCards.map((card, idx) => (
                                <CardDisplay key={idx} card={card} size="normal" />
                            ))}
                            {userCards.length === 0 && <p className="text-slate-500">No tienes cartas aún. Visita la tienda.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};