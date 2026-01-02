// 4. SUB-COMPONENTE: COLECCIÓN (Mazo)
// Guardar como: Cartas Silen/dashboard-deck.js

const DashboardDeck = ({ user, userData, setSelectedCard }) => {
    
    // Calcular cartas disponibles y conteos
    const userCards = (userData.collection || []).map(id => ALL_CARDS.find(c => c.id === id)).filter(Boolean);
    const deckCounts = {};
    (userData.deck || []).forEach(id => {
        deckCounts[id] = (deckCounts[id] || 0) + 1;
    });

    // Toggle Carta en Mazo
    const toggleDeckCard = async (cardId, isCurrentlySelected) => {
        const currentDeck = userData.deck || [];
        let newDeck = [...currentDeck];

        if (isCurrentlySelected) {
            // Eliminar UNA instancia
            const index = newDeck.indexOf(cardId);
            if (index > -1) {
                newDeck.splice(index, 1);
            }
        } else {
            // Agregar al mazo
            if (newDeck.length >= 50) {
                alert("Has alcanzado el límite máximo de 50 cartas en el mazo.");
                return;
            }
            newDeck.push(cardId);
        }

        try {
            await db.collection('users').doc(user.uid).update({ deck: newDeck });
        } catch (err) {
            console.error("Error actualizando mazo:", err);
            alert("Error al guardar el mazo.");
        }
    };

    return (
        <div className="neo-inset p-4 md:p-6 min-h-[50vh]">
            <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl text-slate-400">Colección</h2>
                <div className={`text-sm font-bold px-3 py-1 rounded-full neo-box ${
                    (userData.deck?.length || 0) >= 50 ? 'text-red-500 border border-red-500/30' : 'text-blue-500'
                }`}>
                    Mazo: {userData.deck?.length || 0} / 50
                </div>
            </div>

            <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                {userCards.map((card, idx) => {
                    // Lógica de Selección de Instancia
                    const remainingInDeck = deckCounts[card.id] || 0;
                    const isSelected = remainingInDeck > 0;
                    
                    if (isSelected) deckCounts[card.id]--;

                    return (
                        <div key={idx} className="relative group">
                            {/* Casilla de selección */}
                            <div 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleDeckCard(card.id, isSelected);
                                }}
                                className={`
                                    absolute -top-3 -right-3 z-30 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shadow-lg border-2
                                    ${isSelected 
                                        ? 'bg-green-500 border-green-400 text-white scale-110' 
                                        : 'bg-[var(--bg-main)] border-slate-300 text-slate-300 hover:border-blue-400 hover:text-blue-400'
                                    }
                                `}
                            >
                                {isSelected ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                )}
                            </div>

                            {/* Carta visual */}
                            <div className={`transition-all duration-300 ${isSelected ? 'brightness-110' : 'brightness-75 opacity-80'}`}>
                                <CardDisplay 
                                    card={card} 
                                    size="normal"
                                    canInteract={true}
                                    onClick={(c) => setSelectedCard(c)} // Zoom
                                />
                            </div>
                            
                            {/* Etiqueta "EN MAZO" si está seleccionada */}
                            {isSelected && (
                                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 bg-green-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none">
                                    EN MAZO
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};