// Archivo: Librojuego/module.combat.js

window.Modules.register('module_combat', {
    /* Estructura esperada en el nodo (eff):
      {
          type: 'module_combat',
          enemyName: 'Orco Rabioso',
          stats: { vida: 15, ataque: 6, defensa: 3, agilidad: 4, destreza: 4 },
          winTargetId: 'nodo_victoria',
          loseTargetId: 'nodo_muerte'
      }
    */

    renderWeb(eff, containerId) {
        const container = document.getElementById(containerId);
        const hero = window.Core.playerState;
        const enemy = { ...eff.stats, currentHp: eff.stats.vida };
        
        let html = `
            <div class="mt-6 border-2 border-red-500 bg-red-950/40 rounded-xl p-4 relative overflow-hidden" id="combat-arena">
                <div class="absolute top-0 left-0 w-full bg-red-600 text-white text-center text-xs font-bold uppercase tracking-widest py-1">¡COMBATE!</div>
                <div class="flex justify-between items-center mt-4">
                    <div class="text-center w-1/3">
                        <div class="font-bold text-blue-300">TÚ</div>
                        <div class="text-2xl font-black text-red-400" id="hero-hp-display">${hero.vida} / ${hero.vidaMax} HP</div>
                    </div>
                    <div class="text-center w-1/3 text-4xl font-black text-gray-600 opacity-50">VS</div>
                    <div class="text-center w-1/3">
                        <div class="font-bold text-red-300">${eff.enemyName}</div>
                        <div class="text-2xl font-black text-red-400" id="enemy-hp-display">${enemy.currentHp} / ${eff.stats.vida} HP</div>
                    </div>
                </div>
                <div id="combat-log" class="mt-4 h-32 overflow-y-auto bg-black/50 p-2 rounded text-xs font-mono text-gray-300 border border-white/10 flex flex-col gap-1">
                    <div>El combate está a punto de empezar...</div>
                </div>
                <div class="flex gap-2 mt-4" id="combat-actions">
                    <button id="btn-roll-combat" class="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all">
                        <i class="fa-solid fa-khanda"></i> ATACAR
                    </button>
                    <button id="btn-potion-combat" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.5)] transition-all" title="Beber Poción">
                        <i class="fa-solid fa-flask"></i>
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += html;

        const btnAttack = document.getElementById('btn-roll-combat');
        const btnPotion = document.getElementById('btn-potion-combat');
        const log = document.getElementById('combat-log');
        const logMsg = (msg, color = 'text-gray-300') => {
            log.innerHTML += `<div class="${color}">${msg}</div>`;
            log.scrollTop = log.scrollHeight;
        };

        const calculateDamage = (attacker, defender, nameAtk, nameDef) => {
            let dado = Math.floor(Math.random() * 6) + 1;
            if (dado === 1) { logMsg(`❌ ¡PIFIA! ${nameAtk} falla el ataque.`, 'text-red-500'); return 0; }
            let isCrit = (dado === 6);
            let baseDmg = (dado + attacker.ataque) - defender.defensa;
            if (baseDmg < 0) baseDmg = 0; 
            let dmg = isCrit ? (baseDmg * 2) : baseDmg;
            logMsg(`🎲 ${nameAtk} tira 1d6: [${dado}] + ${attacker.ataque} ATK - ${defender.defensa} DEF.`);
            if (isCrit) logMsg(`💥 ¡CRÍTICO! Daño duplicado.`, 'text-yellow-400');
            if (dmg > 0) logMsg(`⚔️ ${nameAtk} impacta causando ${dmg} puntos de daño.`, 'text-orange-400');
            else logMsg(`🛡️ La armadura absorbe el impacto.`, 'text-blue-400');
            return dmg;
        };

        const processTurn = (playerActed = true) => {
            let heroGoesFirst = hero.agilidad >= enemy.agilidad;
            let first = heroGoesFirst ? {obj: hero, name: 'Tú', isHero: true} : {obj: enemy, name: eff.enemyName, isHero: false};
            let second = heroGoesFirst ? {obj: enemy, name: eff.enemyName, isHero: false} : {obj: hero, name: 'Tú', isHero: true};

            if (first.isHero && playerActed) enemy.currentHp -= calculateDamage(first.obj, second.obj, first.name, second.name);
            else if (!first.isHero) hero.vida -= calculateDamage(first.obj, second.obj, first.name, second.name);

            if (enemy.currentHp > 0 && hero.vida > 0) {
                if (second.isHero && playerActed) enemy.currentHp -= calculateDamage(second.obj, first.obj, second.name, first.name);
                else if (!second.isHero) hero.vida -= calculateDamage(second.obj, first.obj, second.name, first.name);
            }

            document.getElementById('hero-hp-display').innerText = `${Math.max(0, hero.vida)} / ${hero.vidaMax} HP`;
            document.getElementById('enemy-hp-display').innerText = `${Math.max(0, enemy.currentHp)} / ${eff.stats.vida} HP`;

            if (hero.vida <= 0 || enemy.currentHp <= 0) {
                document.getElementById('combat-actions').style.display = 'none';
                if (hero.vida <= 0) {
                    logMsg(`💀 Has caído...`, 'text-red-500 font-bold');
                    setTimeout(() => window.Core.makeChoice(eff.loseTargetId || window.Core.pendingDeathTarget), 2000);
                } else {
                    logMsg(`🏆 ¡VICTORIA!`, 'text-green-400 font-bold');
                    setTimeout(() => window.Core.makeChoice(eff.winTargetId), 2000);
                }
            }
        };

        btnAttack.onclick = () => processTurn(true);
        btnPotion.onclick = () => {
            const idx = hero.inventario.findIndex(i => i.toLowerCase().includes('pocion') || i.toLowerCase().includes('poción'));
            if (idx !== -1) {
                hero.inventario.splice(idx, 1);
                hero.vida = Math.min(hero.vidaMax, hero.vida + 5);
                logMsg(`🧪 Te curas 5 HP, pero pierdes tu turno.`, 'text-green-400');
                processTurn(false);
            } else logMsg(`⚠️ Sin pociones.`, 'text-gray-400');
        };
    },

    // Para la Exportación HTML (Impresión)
    renderPrintHTML(eff) {
        return `
            <div class="combat-table-print">
                <h3>⚔️ TABLA DE COMBATE: ${eff.enemyName.toUpperCase()}</h3>
                <table>
                    <tr><th>Atributo</th><th>Enemigo</th></tr>
                    <tr><td>Vida (HP)</td><td>${eff.stats.vida}</td></tr>
                    <tr><td>Ataque (ATK)</td><td>${eff.stats.ataque}</td></tr>
                    <tr><td>Defensa (DEF)</td><td>${eff.stats.defensa}</td></tr>
                    <tr><td>Agilidad (AGI)</td><td>${eff.stats.agilidad}</td></tr>
                </table>
                <p><i>REGLAS: 1d6 + Tu ATK - DEF enemiga. El 1 falla, el 6 es Crítico (Daño x2).</i></p>
                <div style="display:flex; gap:10px;">
                    Casillas Vida: ${Array(10).fill('▢').join(' ')}
                </div>
            </div>
        `;
    },

    getDocxElements(eff, docx) {
        const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType } = docx;
        return [
            new Paragraph({ children: [new TextRun({ text: `⚔️ HOJA DE COMBATE: ${eff.enemyName.toUpperCase()}`, bold: true, size: 24 })], spacing: { before: 400, after: 200 }, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "REGLAS: Tira 1d6 + tu Ataque. Resta la Defensa enemiga. Ese es el daño. El 1 falla, el 6 es Crítico (x2). Beber poción consume tu turno de ataque.", italics: true, size: 16, spacing: { after: 150 } }),
            new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: "Atributo", bold: true })] }), new TableCell({ children: [new Paragraph({ text: "Enemigo", bold: true })] })] }),
                    new TableRow({ children: [new TableCell({ children: [new Paragraph("Vida (HP)")] }), new TableCell({ children: [new Paragraph(`${eff.stats.vida}`)] })] }),
                    new TableRow({ children: [new TableCell({ children: [new Paragraph("Ataque (ATK)")] }), new TableCell({ children: [new Paragraph(`${eff.stats.ataque}`)] })] }),
                    new TableRow({ children: [new TableCell({ children: [new Paragraph("Defensa (DEF)")] }), new TableCell({ children: [new Paragraph(`${eff.stats.defensa}`)] })] }),
                    new TableRow({ children: [new TableCell({ children: [new Paragraph("Agilidad (AGI)")] }), new TableCell({ children: [new Paragraph(`${eff.stats.agilidad}`)] })] }),
                ]
            }),
            new Paragraph({ text: "Registro salud enemigo: [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ]", spacing: { before: 200, after: 400 } })
        ];
    }
});