/* -------------------------------------------------------------------------- */
/*                     MULTIPLAYER CONFIG & FIREBASE SETUP                    */
/* -------------------------------------------------------------------------- */

const firebaseConfig = {
  apiKey: "AIzaSyBxlmzjYjOEAwc_DVtFpt9DnN7XnuRkbKw",
  authDomain: "silenos-fc5e5.firebaseapp.com",
  databaseURL: "https://silenos-fc5e5-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "silenos-fc5e5",
  storageBucket: "silenos-fc5e5.firebasestorage.app",
  messagingSenderId: "314671855826",
  appId: "1:314671855826:web:ea0af5cd962baa1fd6150b",
  measurementId: "G-V636CRYZ8X"
};

// Inicialización de Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();

let mpState = {
    playerId: localStorage.getItem('mp_player_id') || ('player_' + Math.random().toString(36).substring(2, 9)),
    playerName: localStorage.getItem('mp_player_name') || '',
    status: 'FREE', // 'FREE' | 'PLAYING'
    currentMatchId: null,
    role: null, // 'p1' | 'p2'
    listeners: {}
};

localStorage.setItem('mp_player_id', mpState.playerId);

function setMpPlayerName(name) {
    mpState.playerName = name.trim();
    localStorage.setItem('mp_player_name', mpState.playerName);
}

function updatePresence(status = 'FREE') {
    if (!mpState.playerName || !mpState.playerId) return;
    mpState.status = status;
    const playerRef = db.ref('players/' + mpState.playerId);
    
    const activeDeck = typeof getActiveDeck === 'function' ? getActiveDeck() : null;
    const playerData = {
        id: mpState.playerId,
        name: mpState.playerName,
        status: status,
        deckCardIds: activeDeck ? activeDeck.cardIds : [],
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    };

    playerRef.set(playerData);
    playerRef.onDisconnect().remove();
}

function removePresence() {
    if (mpState.playerId) {
        db.ref('players/' + mpState.playerId).remove();
    }
}