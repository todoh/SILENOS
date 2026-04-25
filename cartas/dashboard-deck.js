// 4. SUB-COMPONENTE: COLECCIÓN (Mazo)
// Guardar como: Cartas Silen/dashboard-deck.js

const DashboardDeck = ({ user, userData, setSelectedCard }) => {
    const [selectedDeckIndex, setSelectedDeckIndex] = React.useState(0);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [tempName, setTempName] = React.useState("");

    const savedDecks = userData.savedDecks || [];
    const currentEditingDeck = savedDecks[selectedDeckIndex] || { cards: [], name: 'Cargando...', id: 'temp' };
    const isEquipped = JSON.stringify(userData.deck?.slice().sort()) === JSON.stringify(currentEditingDeck.cards?.slice().sort());

    React.useEffect(() => {
        if (!userData.savedDecks && userData.deck) {
            db.collection('users').doc(user.uid).update({
                savedDecks: [{
                    id: Date.now().toString(),
                    name: "Mazo Principal",
                    cards: userData.deck
                }]
            });
        }
    }, [userData]);

    const createNewDeck = async () => {
        if (savedDecks.length >= 20) return alert("Límite máximo de 20 mazos.");
        const newDeck = { id: Date.now().toString(), name: `Mazo ${savedDecks.length + 1}`, cards: [] };
        const newSavedDecks = [...savedDecks, newDeck];
        try {
            await db.collection('users').doc(user.uid).update({ savedDecks: newSavedDecks });
            setSelectedDeckIndex(newSavedDecks.length - 1);
        } catch (err) { console.error(err); }
    };

    const deleteCurrentDeck = async () => {
        if (savedDecks.length <= 1) return alert("Debes tener al menos un mazo.");
        if (!confirm(`¿Borrar "${currentEditingDeck.name}"?`)) return;
        const newSavedDecks = savedDecks.filter((_, idx) => idx !== selectedDeckIndex);
        try {
            await db.collection('users').doc(user.uid).update({ savedDecks: newSavedDecks });
            setSelectedDeckIndex(0);
        } catch (err) { console.error(err); }
    };

    const startRenaming = () => { setTempName(currentEditingDeck.name); setIsRenaming(true); };

    const saveName = async () => {
        if (!tempName.trim()) return;
        const newSavedDecks = [...savedDecks];
        newSavedDecks[selectedDeckIndex] = { ...newSavedDecks[selectedDeckIndex], name: tempName.trim() };
        try {
            await db.collection('users').doc(user.uid).update({ savedDecks: newSavedDecks });
            setIsRenaming(false);
        } catch (err) { console.error(err); }
    };

    const equipCurrentDeck = async () => {
        if (currentEditingDeck.cards.length < 5) return alert("El mazo debe tener al menos 5 cartas.");
        try {
            await db.collection('users').doc(user.uid).update({ deck: currentEditingDeck.cards });
            alert(`¡${currentEditingDeck.name} equipado!`);
        } catch (err) { console.error(err); }
    };

    const userCards = (userData.collection || []).map(id => ALL_CARDS.find(c => c.id === id)).filter(Boolean);
    const currentDeckCounts = {};
    (currentEditingDeck.cards || []).forEach(id => { currentDeckCounts[id] = (currentDeckCounts[id] || 0) + 1; });

    const toggleDeckCard = async (cardId, isCurrentlySelected) => {
        let newCards = [...(currentEditingDeck.cards || [])];
        if (isCurrentlySelected) {
            const index = newCards.indexOf(cardId);
            if (index > -1) newCards.splice(index, 1);
        } else {
            if (newCards.length >= 50) return alert("Límite de 50 cartas en este mazo.");
            newCards.push(cardId);
        }
        const newSavedDecks = [...savedDecks];
        newSavedDecks[selectedDeckIndex] = { ...currentEditingDeck, cards: newCards };
        try {
            const updatePayload = { savedDecks: newSavedDecks };
            if (isEquipped) updatePayload.deck = newCards;
            await db.collection('users').doc(user.uid).update(updatePayload);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Top Bar Móvil Adaptable */}
            <div className="neo-box mb-4 p-3 md:p-4 flex flex-col md:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select 
                        value={selectedDeckIndex}
                        onChange={(e) => setSelectedDeckIndex(Number(e.target.value))}
                        className="neo-inset px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-[var(--text-main)] w-full md:w-48 cursor-pointer font-bold"
                    >
                        {savedDecks.map((d, idx) => (
                            <option key={d.id || idx} value={idx}>
                                {d.name} ({d.cards.length})
                            </option>
                        ))}
                    </select>

                    {isRenaming ? (
                        <div className="flex items-center gap-1">
                            <input 
                                type="text" value={tempName} onChange={(e) => setTempName(e.target.value)}
                                className="neo-inset px-2 py-1 w-24 md:w-32 text-xs" autoFocus
                            />
                            <button onClick={saveName} className="text-green-500 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                        </div>
                    ) : (
                        <button onClick={startRenaming} className="text-slate-400 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center w-full md:w-auto">
                    <div className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-full neo-inset ${
                        (currentEditingDeck.cards?.length || 0) >= 50 ? 'text-red-500' : 'text-slate-500'
                    }`}>
                        {currentEditingDeck.cards?.length || 0}/50
                    </div>

                    <button 
                        onClick={equipCurrentDeck} disabled={isEquipped}
                        className={`neo-btn py-1 px-2 md:py-2 md:px-4 text-[10px] md:text-xs ${isEquipped ? 'text-green-600 border border-green-500/20 bg-green-500/5' : 'warning'}`}
                    >
                        {isEquipped ? 'Equipado' : 'Equipar'}
                    </button>

                    <div className="h-6 w-[1px] bg-slate-300 mx-0.5"></div>

                    <button onClick={createNewDeck} className="neo-btn py-1 px-2 text-xs primary"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                    <button onClick={deleteCurrentDeck} className="neo-btn py-1 px-2 text-xs danger"><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 md:w-4 md:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                </div>
            </div>

            {/* Grid de Cartas Adaptable */}
            <div className="neo-inset p-2 md:p-6 min-h-[50vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-1 md:gap-2 justify-items-center">
                    {userCards.map((card, idx) => {
                        const remainingInDeck = currentDeckCounts[card.id] || 0;
                        const isSelected = remainingInDeck > 0;
                        if (isSelected) currentDeckCounts[card.id]--;

                        return (
                            <div key={idx} className="relative group w-full flex justify-center">
                                <div 
                                    onClick={(e) => { e.stopPropagation(); toggleDeckCard(card.id, isSelected); }}
                                    className={`
                                        absolute -top-1 -right-1 md:-top-2 md:-right-2 z-30 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center cursor-pointer transition-all shadow-md border
                                        ${isSelected ? 'bg-green-500 border-green-400 text-white' : 'bg-[var(--bg-main)] border-slate-300 text-slate-300'}
                                    `}
                                >
                                    {isSelected ? <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
                                </div>

                                <div className={`transition-all duration-300 ${isSelected ? 'brightness-110' : 'brightness-75 opacity-90'}`}>
                                    <CardDisplay card={card} size="small" canInteract={true} onClick={(c) => setSelectedCard(c)} />
                                </div>
                                
                                {isSelected && (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-green-500/90 text-white text-[7px] md:text-[8px] font-bold px-1 py-0.5 rounded pointer-events-none">
                                        EN MAZO
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};