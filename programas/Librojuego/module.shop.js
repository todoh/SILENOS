// Archivo: Librojuego/module.shop.js

window.Modules.register('module_shop', {
    renderWeb(eff, containerId) {
        const container = document.getElementById(containerId);
        // Usamos la referencia dinámica (Core si está en el editor, o la global en Standalone)
        const hero = window.Core ? window.Core.playerState : window.playerState;
        
        let oroActual = 0;
        hero.inventario.forEach(i => { if (i.toLowerCase() === 'oro') oroActual++; });

        const shopId = `shop-${Math.random().toString(36).substr(2, 5)}`;

        let html = `
            <div class="mt-6 border-2 border-yellow-500 bg-yellow-950/40 rounded-xl p-4 relative overflow-hidden" id="${shopId}">
                <div class="absolute top-0 left-0 w-full bg-yellow-600 text-black text-center text-xs font-bold uppercase tracking-widest py-1">MERCADER</div>
                <div class="flex justify-between items-center mt-6">
                    <div class="text-center w-1/3">
                        <div class="font-bold text-yellow-300">TU ORO</div>
                        <div class="text-2xl font-black text-yellow-400" id="hero-gold-display-${shopId}">${oroActual} <i class="fa-solid fa-coins"></i></div>
                    </div>
                    <div class="text-center w-1/3 text-4xl font-black text-gray-500 opacity-50"><i class="fa-solid fa-store"></i></div>
                    <div class="text-center w-1/3">
                        <div class="font-bold text-white text-sm">${eff.itemName}</div>
                        <div class="text-xl font-black text-yellow-400">${eff.itemPrice} <i class="fa-solid fa-coins"></i></div>
                    </div>
                </div>
                <div id="shop-log-${shopId}" class="mt-4 h-24 overflow-y-auto bg-black/50 p-2 rounded text-xs font-mono text-gray-300 border border-white/10 flex flex-col gap-1">
                    <div>Mercader: "Échale un vistazo. Es de primera calidad."</div>
                </div>
                <div class="flex gap-2 mt-4" id="shop-actions-${shopId}">
                    <button id="btn-buy-${shopId}" class="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(202,138,4,0.5)] transition-all">
                        <i class="fa-solid fa-cart-shopping"></i> COMPRAR (${eff.itemPrice} ORO)
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);

        const btnBuy = document.getElementById(`btn-buy-${shopId}`);
        const log = document.getElementById(`shop-log-${shopId}`);
        
        const logMsg = (msg, color = 'text-gray-300') => {
            log.innerHTML += `<div class="${color}">${msg}</div>`;
            log.scrollTop = log.scrollHeight;
        };

        btnBuy.onclick = () => {
            let oro = 0;
            hero.inventario.forEach(i => { if (i.toLowerCase() === 'oro') oro++; });

            if (oro >= eff.itemPrice) {
                // Descontar oro del inventario
                for (let i = 0; i < eff.itemPrice; i++) {
                    const idx = hero.inventario.findIndex(item => item.toLowerCase() === 'oro');
                    if (idx > -1) hero.inventario.splice(idx, 1);
                }
                
                // Añadir objeto comprado
                hero.inventario.push(eff.itemName);
                oro -= eff.itemPrice;
                
                document.getElementById(`hero-gold-display-${shopId}`).innerHTML = `${oro} <i class="fa-solid fa-coins"></i>`;
                logMsg(`✅ Has comprado: ${eff.itemName}.`, 'text-green-400 font-bold');
                
                // Actualizar UI del inventario en tiempo real
                const invDisplay = document.querySelector('.stat-inv');
                if (invDisplay) {
                    const formatInv = (inv) => { if (!inv || inv.length === 0) return 'Vacío'; const c = {}; inv.forEach(i => c[i] = (c[i] || 0) + 1); return Object.entries(c).map(([n, v]) => v > 1 ? n + ' x' + v : n).join(', '); };
                    invDisplay.innerHTML = `<i class="fa-solid fa-backpack"></i> ${formatInv(hero.inventario)}`;
                }
                
                btnBuy.style.display = 'none';
                logMsg(`Mercader: "¡Un placer hacer negocios!"`, 'text-gray-300');

            } else {
                logMsg(`❌ No tienes suficiente oro (Necesitas ${eff.itemPrice}).`, 'text-red-400 font-bold');
            }
        };

        return true; 
    },

    renderPrintHTML(eff) {
        return `
            <div class="shop-table-print" style="margin: 20px 0; border: 2px solid #eab308; padding: 15px; border-radius: 8px; background-color: #fefce8; color: #000;">
                <h3 style="color: #a16207; margin-top: 0; text-transform: uppercase; letter-spacing: 1px;">🛒 TIENDA / MERCADER</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.95em;">
                    <tr>
                        <th style="border: 1px solid #ca8a04; padding: 10px; background-color: #fef08a; text-align: left;">Artículo en venta</th>
                        <th style="border: 1px solid #ca8a04; padding: 10px; background-color: #fef08a; text-align: center;">Precio</th>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #ca8a04; padding: 10px; font-weight: bold;">${eff.itemName}</td>
                        <td style="border: 1px solid #ca8a04; padding: 10px; text-align: center; font-weight: bold;">${eff.itemPrice} Oro</td>
                    </tr>
                </table>
                <p style="font-size: 0.85em; margin-bottom: 0; margin-top: 10px; color: #713f12;">
                    <i><b>REGLAS DE COMPRA:</b> Si deseas adquirir este objeto, tacha o borra ${eff.itemPrice} unidades de Oro de tu hoja de aventura y anota "${eff.itemName}" en tu Inventario.</i>
                </p>
            </div>
        `;
    },

    getDocxElements(eff, docx) {
        const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, ShadingType } = docx;
        return [
            new Paragraph({ 
                children: [new TextRun({ text: `🛒 TIENDA / MERCADER`, bold: true, size: 24, color: "A16207" })], 
                spacing: { before: 400, after: 200 }, 
                alignment: AlignmentType.CENTER 
            }),
            new Paragraph({ 
                text: `REGLAS DE COMPRA: Si deseas adquirir este objeto, tacha o borra ${eff.itemPrice} unidades de Oro de tu hoja de aventura y anota "${eff.itemName}" en tu Inventario.`, 
                italics: true, 
                size: 16, 
                spacing: { after: 200 } 
            }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ 
                        children: [
                            new TableCell({ shading: { fill: "FEF08A", type: ShadingType.CLEAR }, children: [new Paragraph({ text: "Artículo en venta", bold: true, alignment: AlignmentType.CENTER })] }), 
                            new TableCell({ shading: { fill: "FEF08A", type: ShadingType.CLEAR }, children: [new Paragraph({ text: "Precio (Oro)", bold: true, alignment: AlignmentType.CENTER })] })
                        ] 
                    }),
                    new TableRow({ 
                        children: [
                            new TableCell({ children: [new Paragraph({ text: eff.itemName, bold: true, alignment: AlignmentType.CENTER })] }), 
                            new TableCell({ children: [new Paragraph({ text: `${eff.itemPrice}`, alignment: AlignmentType.CENTER })] })
                        ] 
                    })
                ]
            }),
            new Paragraph({ text: " ", spacing: { before: 100, after: 200 } })
        ];
    }
});