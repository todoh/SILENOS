// 4. SUB-COMPONENTE: COLECCIÓN (Mazo)
// Guardar como: Cartas Silen/dashboard-deck.js

const DashboardDeck = ({ user, userData, setSelectedCard }) => {
    // Estado local para manejar qué mazo estamos editando visualmente
    const [selectedDeckIndex, setSelectedDeckIndex] = React.useState(0);
    const [isRenaming, setIsRenaming] = React.useState(false);
    const [tempName, setTempName] = React.useState("");

    // --- 1. MIGRACIÓN Y OBTENCIÓN DE MAZOS ---
    // Si el usuario no tiene 'savedDecks', lo creamos basado en su 'deck' actual.
    const savedDecks = userData.savedDecks || [];
    
    // Referencia al mazo que estamos editando actualmente
    const currentEditingDeck = savedDecks[selectedDeckIndex] || { cards: [], name: 'Cargando...', id: 'temp' };
    
    // Verificar si el mazo que editamos es el que está "Equipado" (userData.deck)
    // Comparamos el contenido de los arrays (ordenados) para saber si son idénticos o si es el mismo objeto
    // Una forma simple es asumir que si equipas, sobreescribes userData.deck.
    // Aquí simplemente verificamos si el contenido coincide para mostrar un indicador visual.
    const isEquipped = JSON.stringify(userData.deck?.slice().sort()) === JSON.stringify(currentEditingDeck.cards?.slice().sort());

    React.useEffect(() => {
        // Migración automática para usuarios antiguos
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

    // --- 2. FUNCIONES DE GESTIÓN DE MAZOS ---

    const createNewDeck = async () => {
        if (savedDecks.length >= 20) {
            alert("Has alcanzado el límite máximo de 20 mazos.");
            return;
        }
        
        const newDeck = {
            id: Date.now().toString(),
            name: `Mazo Nuevo ${savedDecks.length + 1}`,
            cards: [] // Empieza vacío
        };

        const newSavedDecks = [...savedDecks, newDeck];
        
        try {
            await db.collection('users').doc(user.uid).update({ savedDecks: newSavedDecks });
            // Cambiar la vista al nuevo mazo
            setSelectedDeckIndex(newSavedDecks.length - 1);
        } catch (err) {
            console.error("Error creando mazo:", err);
        }
    };

    const deleteCurrentDeck = async () => {
        if (savedDecks.length <= 1) {
            alert("Debes tener al menos un mazo.");
            return;
        }
        if (!confirm(`¿Seguro que quieres borrar "${currentEditingDeck.name}"?`)) return;

        const newSavedDecks = savedDecks.filter((_, idx) => idx !== selectedDeckIndex);
        
        try {
            await db.collection('users').doc(user.uid).update({ savedDecks: newSavedDecks });
            setSelectedDeckIndex(0); // Volver al primero
        } catch (err) {
            console.error("Error borrando mazo:", err);
        }
    };

    const startRenaming = () => {
        setTempName(currentEditingDeck.name);
        setIsRenaming(true);
    };

    const saveName = async () => {
        if (!tempName.trim()) return;
        
        const newSavedDecks = [...savedDecks];
        newSavedDecks[selectedDeckIndex] = {
            ...newSavedDecks[selectedDeckIndex],
            name: tempName.trim()
        };

        try {
            await db.collection('users').doc(user.uid).update({ savedDecks: newSavedDecks });
            setIsRenaming(false);
        } catch (err) {
            console.error("Error renombrando:", err);
        }
    };

    const equipCurrentDeck = async () => {
        // Validar tamaño mínimo para jugar (opcional, por ahora permitimos cualquiera)
        if (currentEditingDeck.cards.length < 5) {
            alert("Tu mazo debe tener al menos 5 cartas para ser equipado.");
            return;
        }

        try {
            // Actualizamos 'deck' en la raíz del usuario, que es el que usa el juego
            await db.collection('users').doc(user.uid).update({ 
                deck: currentEditingDeck.cards 
            });
            alert(`¡${currentEditingDeck.name} equipado para el combate!`);
        } catch (err) {
            console.error("Error equipando mazo:", err);
        }
    };

    // --- 3. LÓGICA DE CARTAS (Añadir/Quitar del mazo actual) ---
    
    // Calcular cartas disponibles y conteos
    // userCards son todas las cartas que el usuario posee en su colección global
    const userCards = (userData.collection || []).map(id => ALL_CARDS.find(c => c.id === id)).filter(Boolean);
    
    // Conteo de cartas EN EL MAZO ACTUALMENTE EDITADO
    const currentDeckCounts = {};
    (currentEditingDeck.cards || []).forEach(id => {
        currentDeckCounts[id] = (currentDeckCounts[id] || 0) + 1;
    });

    const toggleDeckCard = async (cardId, isCurrentlySelected) => {
        let newCards = [...(currentEditingDeck.cards || [])];

        if (isCurrentlySelected) {
            // Eliminar UNA instancia
            const index = newCards.indexOf(cardId);
            if (index > -1) {
                newCards.splice(index, 1);
            }
        } else {
            // Agregar al mazo
            if (newCards.length >= 50) {
                alert("Has alcanzado el límite máximo de 50 cartas en este mazo.");
                return;
            }
            newCards.push(cardId);
        }

        // Actualizamos SOLO el mazo guardado específico
        const newSavedDecks = [...savedDecks];
        newSavedDecks[selectedDeckIndex] = {
            ...currentEditingDeck,
            cards: newCards
        };

        try {
            // Guardamos en savedDecks
            const updatePayload = { savedDecks: newSavedDecks };
            
            // SI el mazo que editamos es el que estaba equipado, actualizamos también el mazo activo en tiempo real
            // para que no haya desincronización
            if (isEquipped) {
                updatePayload.deck = newCards;
            }

            await db.collection('users').doc(user.uid).update(updatePayload);
        } catch (err) {
            console.error("Error actualizando cartas del mazo:", err);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* --- BARRA DE GESTIÓN DE MAZOS (Top Bar) --- */}
            <div className="neo-box mb-6 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* Selector y Nombre */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select 
                        value={selectedDeckIndex}
                        onChange={(e) => setSelectedDeckIndex(Number(e.target.value))}
                        className="neo-inset px-4 py-2 text-sm text-[var(--text-main)] w-full md:w-48 cursor-pointer font-bold"
                    >
                        {savedDecks.map((d, idx) => (
                            <option key={d.id || idx} value={idx}>
                                {d.name} ({d.cards.length})
                            </option>
                        ))}
                    </select>

                    {/* Botón de Renombrar / Input */}
                    {isRenaming ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={tempName} 
                                onChange={(e) => setTempName(e.target.value)}
                                className="neo-inset px-2 py-1 w-32 text-sm"
                                autoFocus
                            />
                            <button onClick={saveName} className="text-green-500 hover:text-green-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                        </div>
                    ) : (
                        <button onClick={startRenaming} className="text-slate-400 hover:text-blue-400 transition-colors" title="Renombrar mazo">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                    )}
                </div>

                {/* Acciones del Mazo */}
                <div className="flex items-center gap-3 flex-wrap justify-center">
                    
                    {/* Indicador de Cartas */}
                    <div className={`text-xs font-bold px-3 py-1 rounded-full neo-inset ${
                        (currentEditingDeck.cards?.length || 0) >= 50 ? 'text-red-500' : 'text-slate-500'
                    }`}>
                        {currentEditingDeck.cards?.length || 0} / 50
                    </div>

                    {/* Botón Equipar */}
                    <button 
                        onClick={equipCurrentDeck}
                        disabled={isEquipped}
                        className={`neo-btn py-2 px-4 text-xs ${isEquipped ? 'text-green-600 border border-green-500/20 bg-green-500/5' : 'warning'}`}
                    >
                        {isEquipped ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                <span>Equipado</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                                <span>Equipar</span>
                            </>
                        )}
                    </button>

                    <div className="h-6 w-[1px] bg-slate-300 mx-1"></div>

                    {/* Crear Nuevo */}
                    <button onClick={createNewDeck} className="neo-btn py-2 px-3 text-xs primary" title="Crear nuevo mazo">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>

                    {/* Borrar */}
                    <button onClick={deleteCurrentDeck} className="neo-btn py-2 px-3 text-xs danger" title="Borrar mazo actual">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>

            {/* --- LISTA DE CARTAS (Grid) --- */}
            <div className="neo-inset p-4 md:p-6 min-h-[50vh] overflow-y-auto">
                <div className="flex flex-wrap gap-6 justify-center md:justify-start">
                    {userCards.map((card, idx) => {
                        // Lógica de Selección de Instancia basada en el mazo EDITADO
                        const remainingInDeck = currentDeckCounts[card.id] || 0;
                        const isSelected = remainingInDeck > 0;
                        
                        if (isSelected) currentDeckCounts[card.id]--;

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
                                    <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 bg-green-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-lg pointer-events-none whitespace-nowrap">
                                        EN MAZO
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {userCards.length === 0 && (
                    <div className="text-center text-slate-400 py-10">
                        No tienes cartas en tu colección. Visita la tienda.
                    </div>
                )}
            </div>
        </div>
    );
};