// --- PANTALLAS PRINCIPALES ---

// 1. LOGIN CON GOOGLE
const AuthScreen = ({ onLogin }) => {
    const [error, setError] = React.useState("");

    const handleGoogleLogin = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Verificar si el perfil existe, si no, crearlo
            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                // Crear nuevo perfil con datos de Google
                await db.collection('users').doc(user.uid).set({
                    username: user.displayName || "Jugador Anónimo",
                    email: user.email,
                    photoURL: user.photoURL,
                    korehs: 100, // Moneda inicial
                    collection: [1,1,2,2,6,6,6,6,4,5], // Cartas iniciales
                    deck: [1,1,2,2,6,6,6,6,4,5],
                    friends: [], // LISTA DE AMIGOS INICIALIZADA VACÍA
                    incomingChallenge: null, // Campo para recibir desafíos
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[url('https://images.unsplash.com/photo-1635326444826-06c3f7690183?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/70"></div>
            <div className="glass p-8 rounded-xl shadow-2xl w-96 relative z-10 flex flex-col items-center">
                <h1 className="text-4xl text-center text-yellow-500 mb-8 drop-shadow-lg font-bold">SILENOS TCG</h1>
                
                <p className="text-slate-300 text-center mb-6">Únete a la batalla de cartas definitiva.</p>

                <button 
                    onClick={handleGoogleLogin}
                    className="bg-white text-slate-700 hover:bg-slate-100 w-full py-3 px-4 rounded font-bold shadow-lg flex items-center justify-center gap-3 transition-all transform hover:scale-105"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google Logo" />
                    <span>Iniciar sesión con Google</span>
                </button>

                {error && <p className="text-red-400 text-sm mt-4 bg-red-900/50 p-2 rounded border border-red-800 text-center">{error}</p>}
                
                <div className="mt-8 text-xs text-slate-500 text-center border-t border-slate-700 pt-4 w-full">
                    Al continuar, aceptas las reglas del duelo.
                </div>
            </div>
        </div>
    );
};

// --- APP ROOT ---
const App = () => {
    const [user, setUser] = React.useState(null);
    const [userData, setUserData] = React.useState(null);
    const [appState, setAppState] = React.useState('loading'); // loading, auth, dashboard, game
    
    // Configuración de la partida actual (para desafíos)
    // mode: 'normal', 'host_friend', 'join_friend'
    // targetFriendId: uid del amigo a retar
    // targetPeerId: id p2p del host al que unirse
    const [gameConfig, setGameConfig] = React.useState({ mode: 'normal' });

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                // Escuchar cambios en tiempo real del perfil (Korehs, coleccion, amigos, challenges)
                const unsubDoc = db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if(doc.exists) {
                        setUserData(doc.data());
                        if(appState === 'loading' || appState === 'auth') setAppState('dashboard');
                    }
                });
                return () => unsubDoc();
            } else {
                setUser(null);
                setUserData(null);
                setAppState('auth');
            }
        });
        return () => unsubscribe();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStartGame = (config = { mode: 'normal' }) => {
        setGameConfig(config);
        setAppState('game');
    };

    if (appState === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-900 text-yellow-500 text-2xl animate-pulse">Cargando Silenos...</div>;

    if (appState === 'auth') return <AuthScreen />;

    if (appState === 'game') return <GameRoom user={user} userData={userData} gameConfig={gameConfig} onBack={() => setAppState('dashboard')} />;

    return <Dashboard user={user} userData={userData} onLogout={() => auth.signOut()} onStartGame={handleStartGame} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);