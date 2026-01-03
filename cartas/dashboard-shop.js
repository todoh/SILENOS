// 3. SUB-COMPONENTE: TIENDA
// Guardar como: Cartas Silen/dashboard-shop.js

const DashboardShop = ({ user, userData, setSelectedCard }) => {
    const [loading, setLoading] = React.useState(false);

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
            // Al usar ALL_CARDS, ahora incluye también las cartas de data3.js
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
                const cardNames = newCards.map(id => ALL_CARDS.find(c => c.id === id).name).join(', ');
                alert(`¡Has abierto un ${pack.name}!\nObtenido: ${cardNames}`);
            }
            
        } catch (err) {
            console.error(err);
            alert("Error en la transacción.");
        }
        
        setLoading(false);
    };

    // Compra Individual
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
        <div className="flex flex-col gap-10 mt-4 pb-10">
            {/* 1. SECCIÓN SOBRES */}
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-slate-300 mb-6 uppercase tracking-widest">
                    <span className="text-blue-500">Sobres</span> de Poder
                </h2>
                <div className="flex flex-wrap justify-center gap-8 w-full">
                    {PACK_TYPES.map((pack) => (
                        <div key={pack.id} className="neo-box p-6 w-72 flex flex-col items-center transform hover:scale-105 transition-transform duration-300 relative overflow-hidden group">
                            {/* Efecto de brillo en hover */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"/>

                            {/* Icono del Sobre */}
                            <div className={`text-6xl mb-4 ${pack.color} drop-shadow-md`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20">
                                    <path d="m7.5 4.27 9 5.15"/>
                                    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                                    <path d="m3.3 7 8.7 5 8.7-5"/>
                                    <path d="M12 22v-10"/>
                                </svg>
                            </div>
                            
                            <h3 className={`text-xl font-bold mb-1 ${pack.color}`}>{pack.name}</h3>
                            
                            {/* Condicional para mostrar texto especial en el pack maestro */}
                            {pack.id === 'master' ? (
                                <p className="text-slate-500 text-xs mb-1 font-bold uppercase text-red-400">TODAS LAS CARTAS</p>
                            ) : (
                                <p className="text-slate-500 text-xs mb-1 font-bold uppercase">{pack.count} Cartas</p>
                            )}
                            
                            <p className="text-slate-400 text-sm mb-6 text-center italic">"{pack.desc}"</p>
                            
                            <Button 
                                onClick={() => buyPack(pack)} 
                                disabled={loading || userData.korehs < pack.cost} 
                                variant="secondary" 
                                className={`w-full group-hover:text-white ${userData.korehs >= pack.cost ? 'group-hover:bg-blue-500' : ''}`}
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

            <div className="w-full h-px bg-slate-300/20 my-2"></div>

            {/* 2. SECCIÓN CATÁLOGO (Compra Directa) */}
            <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                    <h2 className="text-2xl font-bold text-slate-300 mb-2 uppercase tracking-widest">
                    Compra por <span className="text-yellow-500">Catálogo</span>
                </h2>
                <p className="text-slate-500 text-sm mb-6">Adquiere cartas específicas a un precio premium.</p>

                <div className="neo-inset p-6 w-full max-w-5xl">
                    <div className="flex flex-wrap gap-4 justify-center">
                        {/* ALL_CARDS contiene:
                           - CORE_CARDS (data.js)
                           - EXTRA_CARDS (data2.js)
                           - NARRATIVE_CARDS (data3.js)
                        */}
                        {ALL_CARDS.map((card, idx) => {
                            const price = getSingleCardPrice(card);
                            const canAfford = userData.korehs >= price;

                            return (
                                <div key={idx} className="flex flex-col items-center gap-1 group">
                                    {/* Contenedor Carta */}
                                    <div 
                                        className="cursor-pointer hover:scale-115 transition-transform duration-200"
                                        onClick={() => setSelectedCard(card)}
                                    >
                                        <CardDisplay card={card} size="w-32 md:w-32 aspect-[2/3]" />
                                    </div>

                                    {/* Botón de Compra */}
                                    <Button 
                                        onClick={() => buySingleCard(card)}
                                        disabled={loading || !canAfford}
                                        className={`px-4 py-2 text-xs w-full shadow-lg ${canAfford ? 'hover:bg-green-500 hover:text-white' : 'opacity-50'}`}
                                        variant={canAfford ? 'primary' : 'secondary'}
                                    >
                                        <div className="flex flex-col items-center leading-none gap-1">
                                            <span className="font-bold">COMPRAR</span>
                                            <div className="flex items-center gap-1">
                                                <span>{price}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                                                    <circle cx="12" cy="12" r="10"/>
                                                    <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                                                    <path d="M12 18V6"/>
                                                </svg>
                                            </div>
                                        </div>
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};