
// 2. SUB-COMPONENTE: HOME (Batalla y Amigos)
// Sobreescribir: Cartas Silen/dashboard-home.js

const DashboardHome = ({ user, userData, onStartGame }) => {
    const [friendEmail, setFriendEmail] = React.useState("");
    const [friendsList, setFriendsList] = React.useState([]);
    const [loadingFriends, setLoadingFriends] = React.useState(false);

    // Cargar amigos
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

    // Agregar amigo
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

    // Eliminar amigo
    const removeFriend = async (fid) => {
        if(!confirm("¿Eliminar?")) return;
        await db.collection('users').doc(user.uid).update({ friends: firebase.firestore.FieldValue.arrayRemove(fid) });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CARD BATALLA */}
            <div className="neo-box p-8 flex flex-col items-center justify-center h-80 gap-4">
                <h2 className="text-3xl font-bold text-blue-400 text-center">Batalla Online</h2>
                <Button onClick={() => onStartGame({mode: 'normal'})} className="px-8 py-3 text-lg w-full" variant="primary">
                    PVP ALEATORIO
                </Button>
                
                <div className="w-full h-px bg-slate-300/20"></div>
                
                <h2 className="text-xl font-bold text-green-500 text-center">Entrenamiento</h2>
                <Button onClick={() => onStartGame({mode: 'ai'})} className="px-8 py-3 text-lg w-full" variant="success">
                    VS MÁQUINA
                </Button>
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
                                    <div className="w-6 h-6 rounded-full neo-box flex items-center justify-center text-[10px] text-slate-500">
                                        {friend.username[0]}
                                    </div>
                                    <div className="text-sm font-bold text-slate-400">{friend.username}</div>
                                </div>
                                <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <Button onClick={() => onStartGame({ mode: 'host_friend', targetFriendId: friend.uid })} variant="warning" className="px-2 py-1 text-[10px]">
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
    );
};
