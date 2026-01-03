// --- PANTALLAS PRINCIPALES ---
// Guardar como: Cartas Silen/main.js

// 1. LOGIN CON GOOGLE
const AuthScreen = ({ onLogin }) => {
    const [error, setError] = React.useState("");

    const handleGoogleLogin = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            const userDoc = await db.collection('users').doc(user.uid).get();

            if (!userDoc.exists) {
                // Mazo inicial por defecto
                const starterDeck = [1,1,2,2,6,6,6,6,4,5];
                
                await db.collection('users').doc(user.uid).set({
                    username: user.displayName || "Jugador Anónimo",
                    email: user.email,
                    photoURL: user.photoURL,
                    korehs: 100,
                    collection: starterDeck, // Inicialmente la colección es igual al mazo
                    deck: starterDeck,       // El mazo ACTIVO para jugar
                    // NUEVO: Estructura para múltiples mazos guardados
                    savedDecks: [
                        {
                            id: Date.now().toString(), // ID único simple
                            name: "Mazo Inicial",
                            cards: starterDeck
                        }
                    ],
                    friends: [],
                    incomingChallenge: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--bg-main)]">
            <div className="neo-box p-10 flex flex-col items-center max-w-sm w-full">
                <h1 className="text-4xl text-center text-[var(--accent-gold)] mb-8 font-bold tracking-widest" style={{ textShadow: '2px 2px 4px var(--shadow-dark)' }}>
                    SILENOS
                </h1>
                
                <p className="text-slate-400 text-center mb-10 text-sm">Estrategia Táctica Elemental</p>

                <button 
                    onClick={handleGoogleLogin}
                    className="neo-btn w-full py-4 text-slate-300 hover:text-white gap-3 transition-transform hover:scale-105"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                    <span>Entrar con Google</span>
                </button>

                {error && <p className="text-red-400 text-xs mt-6 text-center">{error}</p>}
                
                <div className="mt-12 text-[10px] text-slate-600 text-center w-full">
                    v1.0 Beta - Neumorphism Edition
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
    
    const [gameConfig, setGameConfig] = React.useState({ mode: 'normal' });

    React.useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                const unsubDoc = db.collection('users').doc(u.uid).onSnapshot(doc => {
                    if(doc.exists) {
                        setUserData(doc.data());
                        
                        // --- CORRECCIÓN IMPORTANTE AQUÍ ---
                        // Usamos la forma funcional setAppState(prev => ...) para leer el estado ACTUAL.
                        // El código anterior leía el estado "viejo" ('loading') y forzaba el Dashboard,
                        // cerrando el juego cuando se actualizaba Firebase (al borrar el desafío).
                        setAppState(prev => {
                            // Solo si estamos cargando o en login vamos al dashboard.
                            // Si ya estamos en 'game', NOS QUEDAMOS en 'game'.
                            if (prev === 'loading' || prev === 'auth') {
                                return 'dashboard';
                            }
                            return prev; 
                        });
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
    }, []);

    const handleStartGame = (config = { mode: 'normal' }) => {
        setGameConfig(config);
        setAppState('game');
    };

    if (appState === 'loading') return <div className="h-screen flex items-center justify-center bg-[var(--bg-main)] text-[var(--text-muted)] animate-pulse">Cargando Silenos...</div>;

    if (appState === 'auth') return <AuthScreen />;

    if (appState === 'game') return <GameRoom user={user} userData={userData} gameConfig={gameConfig} onBack={() => setAppState('dashboard')} />;

    return <Dashboard user={user} userData={userData} onLogout={() => auth.signOut()} onStartGame={handleStartGame} />;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);