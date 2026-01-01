// --- ESTADO INICIAL Y CONSTANTES ---

const getInitialGameState = () => ({
    turn: 0, // 0 = P1, 1 = P2
    turnCount: 1, // Para calcular energía (10, 20, 30...)
    phase: 'response', // 'response', 'preparation', 'interaction'
    myPlayerId: 0, 
    
    // Pilas de acciones para la fase de respuesta
    incomingStack: [], // Ataques que recibo este turno (vienen del turno anterior del rival)
    outgoingStack: [], // Ataques que preparo para el rival
    
    players: [
        { 
            id: 0, 
            points: 0, // Gana al llegar a 30
            energy: 10, 
            maxEnergy: 10, 
            hand: [], 
            field: [], 
            deck: [], 
            retirement: [], // Cementerio/Retiro
            name: '' 
        },
        { 
            id: 1, 
            points: 0, 
            energy: 10, 
            maxEnergy: 10, 
            hand: [], 
            field: [], 
            deck: [], 
            retirement: [], 
            name: '' 
        }
    ]
});