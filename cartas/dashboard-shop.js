// 3. SUB-COMPONENTE: TIENDA
// Guardar como: Cartas Silen/dashboard-shop.js

const DashboardShop = ({ user, userData, setSelectedCard }) => {
    const [loading, setLoading] = React.useState(false);
    const [shopTab, setShopTab] = React.useState('packs'); // 'packs' | 'catalog'
    const [packResult, setPackResult] = React.useState(null); // Guarda las cartas abiertas para la animación

    // Compra de Sobres
    const buyPack = async (pack) => {
        if (userData.korehs < pack.cost) return alert("Korehs insuficientes");
        setLoading(true);
        
        let newCards = [];

        // Lógica Especial: Pack Maestro (Todas las cartas)
        if (pack.id === 'master') {
            newCards = ALL_CARDS.map(c => c.id);
        } else {
            // Generar cartas aleatorias según la cantidad del sobre
            for(let i=0; i < pack.count; i++) {
                newCards.push(ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)].id);
            }
        }

        try {
            await db.collection('users').doc(user.uid).update({
                korehs: firebase.firestore.FieldValue.increment(-pack.cost),
                collection: firebase.firestore.FieldValue.arrayUnion(...newCards)
            });
            
            if (pack.id === 'master') {
                alert(`¡Has adquirido la Colección Maestra!\nTodas las cartas disponibles han sido añadidas a tu colección.`);
            } else {
                // En lugar del alert, obtenemos los objetos de las cartas y lanzamos la animación
                const obtainedCards = newCards.map(id => ALL_CARDS.find(c => c.id === id));
                setPackResult(obtainedCards);
            }
            
        } catch (err) {
            console.error(err);
            alert("Error en la transacción.");
        }
        
        setLoading(false);
    };

    // Compra Individual (Catálogo)
    const buySingleCard = async (card) => {
        const price = getSingleCardPrice(card);
        
        if (userData.korehs < price) {
            alert(`Necesitas ${price} Korehs para comprar "${card.name}".`);
            return;
        }

        if(!confirm(`¿Comprar "${card.name}" por ${price} Korehs?`)) return;

        setLoading(true);
        try {
            await db.collection('users').doc(user.uid).update({
                korehs: firebase.firestore.FieldValue.increment(-price),
                collection: firebase.firestore.FieldValue.arrayUnion(card.id)
            });
            alert(`¡Has comprado a ${card.name}!`);
        } catch (err) {
            console.error(err);
            alert("Error al comprar la carta.");
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col gap-6 mt-2 pb-10 relative">
            
            {/* OVERLAY DE ANIMACIÓN: Se monta solo si hay cartas que revelar */}
            {packResult && (
                <PackOpeningAnimation 
                    cards={packResult} 
                    onClose={() => setPackResult(null)} 
                />
            )}

            {/* MENÚ DE NAVEGACIÓN INTERNO (Minimalista) */}
            <div className="flex justify-center gap-8 border-b border-white/5 pb-2">
                <button 
                    onClick={() => setShopTab('packs')}
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 border-b-2 outline-none ${shopTab === 'packs' ? 'text-blue-400 border-blue-400' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
                >
                    Sobres de Poder
                </button>
                <button 
                    onClick={() => setShopTab('catalog')}
                    className={`pb-3 px-2 text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 border-b-2 outline-none ${shopTab === 'catalog' ? 'text-yellow-500 border-yellow-500' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
                >
                    Catálogo Directo
                </button>
            </div>

            {/* 1. VISTA DE SOBRES */}
            {shopTab === 'packs' && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
                    <div className="flex flex-wrap justify-center gap-8 w-full">
                        {PACK_TYPES.map((pack) => (
                            <div key={pack.id} className="neo-box p-6 w-72 flex flex-col items-center transform hover:scale-105 transition-transform duration-300 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>

                                <div className={`text-6xl mb-4 ${pack.color} drop-shadow-md`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20">
                                        <path d="m7.5 4.27 9 5.15"/>
                                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                                        <path d="m3.3 7 8.7 5 8.7-5"/>
                                        <path d="M12 22v-10"/>
                                    </svg>
                                </div>
                                
                                <h3 className={`text-xl font-bold mb-1 ${pack.color}`}>{pack.name}</h3>
                                
                                {pack.id === 'master' ? (
                                    <p className="text-slate-500 text-xs mb-1 font-bold uppercase text-red-400 tracking-widest">Colección Completa</p>
                                ) : (
                                    <p className="text-slate-500 text-xs mb-1 font-bold uppercase tracking-widest">{pack.count} Cartas</p>
                                )}
                                
                                <p className="text-slate-400 text-sm mb-6 text-center italic font-light mt-2">"{pack.desc}"</p>
                                
                                <Button 
                                    onClick={() => buyPack(pack)} 
                                    disabled={loading || userData.korehs < pack.cost} 
                                    variant="secondary" 
                                    className={`w-full group-hover:text-white transition-colors duration-300 ${userData.korehs >= pack.cost ? 'group-hover:bg-blue-500/80 group-hover:border-blue-400' : ''}`}
                                >
                                    <span className="font-bold">{pack.cost}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mx-1 inline">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                                        <path d="M12 18V6"/>
                                    </svg>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 2. VISTA DE CATÁLOGO */}
            {shopTab === 'catalog' && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 pt-6">
                    <div className="neo-inset p-6 w-full max-w-6xl">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
                            {ALL_CARDS.map((card, idx) => {
                                const price = getSingleCardPrice(card);
                                const canAfford = userData.korehs >= price;

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-3 group w-full">
                                        {/* Contenedor Carta */}
                                        <div 
                                            className="cursor-pointer hover:-translate-y-2 transition-transform duration-300 w-full flex justify-center"
                                            onClick={() => setSelectedCard(card)}
                                        >
                                            {/* Usamos el tamaño normal del componente, asegurándonos que encaja */}
                                            <CardDisplay card={card} size="small" />
                                        </div>

                                        {/* Botón de Compra Minimalista */}
                                        <button 
                                            onClick={() => buySingleCard(card)}
                                            disabled={loading || !canAfford}
                                            className={`
                                                flex items-center justify-center gap-2 w-[80%] py-1.5 rounded-md text-[10px] font-bold tracking-widest border transition-all
                                                ${canAfford 
                                                    ? 'bg-transparent border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-400' 
                                                    : 'bg-transparent border-slate-700/30 text-slate-600 cursor-not-allowed'}
                                            `}
                                        >
                                            <span>{price}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                <circle cx="12" cy="12" r="10"/>
                                                <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                                                <path d="M12 18V6"/>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};