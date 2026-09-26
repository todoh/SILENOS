/* -------------------------------------------------------------------------- */
/*                          CPU AI DECISION MATRIX                            */
/* -------------------------------------------------------------------------- */
function playCpuTurnAI() {
    if (state.battleStatus !== 'CPU_TURN') return;
    const cpu = state.battle.p2;
    const p1 = state.battle.p1;

    function selectCpuTarget(scope) {
        if (scope === 'ANY_SELF' || scope === 'SELF_HERO') {
            return { targetPlayerKey: 'p2', targetKind: 'HERO', instanceId: null };
        }
        
        if (p1.entities.length > 0 && (scope === 'ANY_ENEMY' || scope === 'ENEMY_ENTITY')) {
            const highAtkEntity = [...p1.entities].sort((a, b) => b.atk - a.atk)[0];
            return { targetPlayerKey: 'p1', targetKind: 'ENTITY', instanceId: highAtkEntity.instanceId };
        }
        
        return { targetPlayerKey: 'p1', targetKind: 'HERO', instanceId: null };
    }

    // 1. PRIORIDAD: Gestión táctica de Entidades en el Campo
    const unusedEntity = cpu.entities.find(e => !e.usedThisTurn);
    if (unusedEntity) {
        if (unusedEntity.statuses && unusedEntity.statuses.some(s => s.id === 'FREEZE')) {
            unusedEntity.usedThisTurn = true;
            createFloatingText('p2', '❄️ Congelado!', '#3b82f6');
            if (state.battle.p1.hp > 0 && state.battleStatus === 'CPU_TURN') {
                setTimeout(playCpuTurnAI, 400);
                return;
            }
        }

        let action = 'ATTACK';
        if (unusedEntity.id === 'entity_golem') {
            if (cpu.shield < 12 || cpu.hp < 50) {
                action = 'USE';
            } else {
                action = 'ATTACK';
            }
        } else if (unusedEntity.id === 'entity_fairy') {
            if (cpu.hp <= cpu.maxHp - 10) {
                action = 'USE';
            } else {
                action = 'ATTACK';
            }
        } else if (unusedEntity.id === 'entity_demon') {
            if (cpu.hp <= cpu.maxHp - 8) {
                action = 'USE';
            } else {
                action = 'ATTACK';
            }
        } else if (unusedEntity.id === 'entity_phoenix') {
            action = 'ATTACK';
        } else {
            if (cpu.hp < 25 && unusedEntity.mode !== 'DEFEND') {
                action = 'DEFEND';
            } else {
                action = 'ATTACK';
            }
        }

        if (action === 'DEFEND') {
            unusedEntity.usedThisTurn = true;
            executeEntityAction('p2', unusedEntity.instanceId, 'DEFEND');
        } else if (action === 'ATTACK') {
            unusedEntity.usedThisTurn = true;
            unusedEntity.mode = 'ATTACK';
            let damage = Math.round((unusedEntity.atk || 10) * cpu.boost);
            cpu.boost = 1;
            const target = selectCpuTarget('ANY_ENEMY');
            resolveAttackWithTarget('p2', target.targetPlayerKey, target.targetKind, target.instanceId, damage, `${unusedEntity.name} (Ataque)`);
        } else if (action === 'USE') {
            if (!unusedEntity.statuses || !unusedEntity.statuses.some(s => s.id === 'AMNESIA')) {
                unusedEntity.usedThisTurn = true;
                const scope = unusedEntity.abilityScope || 'ANY_SELF';
                const target = selectCpuTarget(scope);
                useEntityAbilityWithTarget('p2', unusedEntity.instanceId, target.targetPlayerKey, target.targetKind, target.instanceId);
            } else {
                unusedEntity.usedThisTurn = true;
            }
        }

        if (state.battle.p1.hp > 0 && state.battleStatus === 'CPU_TURN') {
            setTimeout(playCpuTurnAI, 700);
            return;
        }
    }

    // 2. SELECCIÓN Y EVALUACIÓN DE CARTAS EN LA MANO
    const playable = cpu.hand.filter(c => c.cost <= cpu.energy);
    if (playable.length > 0 && cpu.energy > 0) {
        let chosenCard = null;
        if (state.difficulty === 'easy') {
            chosenCard = playable[Math.floor(Math.random() * playable.length)];
        } else if (state.difficulty === 'normal') {
            const hasAttackInHand = playable.some(c => c.type === 'ATTACK' || c.type === 'DRAIN' || c.type === 'STATUS');
            const lethalCard = playable.find(c => (c.type === 'ATTACK' || c.type === 'DRAIN') && Math.round((c.val || 0) * cpu.boost) >= p1.hp);
            if (lethalCard) {
                chosenCard = lethalCard;
            } else if (cpu.entities.length < 3 && playable.some(c => c.type === 'ENTITY')) {
                chosenCard = playable.find(c => c.type === 'ENTITY');
            } else if (cpu.hp < 40 && playable.some(c => c.type === 'HEAL' || c.type === 'DRAIN' || c.type === 'DEFENSE')) {
                chosenCard = playable.find(c => c.type === 'HEAL' || c.type === 'DRAIN' || c.type === 'DEFENSE');
            } else if (cpu.boost === 1 && hasAttackInHand && playable.some(c => c.type === 'BOOST') && (!cpu.statuses || !cpu.statuses.some(s => s.id === 'AMNESIA'))) {
                chosenCard = playable.find(c => c.type === 'BOOST');
            } else if (p1.hp < 30 && playable.some(c => c.type === 'ATTACK' || c.type === 'DRAIN')) {
                chosenCard = playable.find(c => c.type === 'ATTACK' || c.type === 'DRAIN');
            } else {
                chosenCard = playable[0];
            }
        } else if (state.difficulty === 'hard') {
            playable.sort((a, b) => {
                let valA = a.val || (a.atk ? a.atk + a.hp : 10);
                let valB = b.val || (b.atk ? b.atk + b.hp : 10);
                let scoreA = valA / a.cost;
                let scoreB = valB / b.cost;
                scoreA += (Math.random() * 0.4 - 0.2);
                scoreB += (Math.random() * 0.4 - 0.2);
                
                if (a.statusEffect) scoreA += 5;
                if (b.statusEffect) scoreB += 5;

                if (a.type === 'ENTITY' && cpu.entities.length < 5) scoreA += (5 - cpu.entities.length) * 4;
                if (b.type === 'ENTITY' && cpu.entities.length < 5) scoreB += (5 - cpu.entities.length) * 4;
                if (cpu.hp < 50) {
                    if (a.type === 'HEAL' || a.type === 'DRAIN') scoreA += 10;
                    if (b.type === 'HEAL' || b.type === 'DRAIN') scoreB += 10;
                    if (a.type === 'DEFENSE' && cpu.shield < 10) scoreA += 8;
                    if (b.type === 'DEFENSE' && cpu.shield < 10) scoreB += 8;
                }
                const hasAttackInHand = cpu.hand.some(c => c.type === 'ATTACK' || c.type === 'DRAIN' || c.type === 'STATUS');
                const hasAttackingEntity = cpu.entities.some(e => !e.usedThisTurn);
                if (a.type === 'BOOST' && cpu.boost === 1 && (hasAttackInHand || hasAttackingEntity)) scoreA += 9;
                if (b.type === 'BOOST' && cpu.boost === 1 && (hasAttackInHand || hasAttackingEntity)) scoreB += 9;
                if (a.type === 'ATTACK' || a.type === 'DRAIN') {
                    let dmgA = Math.round((a.val || 0) * cpu.boost);
                    if (p1.hp <= dmgA) scoreA += 50;
                    if (p1.hp < 30) scoreA += 6;
                }
                if (b.type === 'ATTACK' || b.type === 'DRAIN') {
                    let dmgB = Math.round((b.val || 0) * cpu.boost);
                    if (p1.hp <= dmgB) scoreB += 50;
                    if (p1.hp < 30) scoreB += 6;
                }
                return scoreB - scoreA;
            });
            chosenCard = playable[0];
        }

        if (chosenCard) {
            const cardIndex = cpu.hand.findIndex(c => c.uid === chosenCard.uid);
            if (cardIndex !== -1) {
                cpu.energy -= chosenCard.cost;
                cpu.hand.splice(cardIndex, 1);
                
                if (chosenCard.type === 'ENTITY') {
                    const baseHp = chosenCard.hp || 20;
                    const baseAtk = chosenCard.atk || 10;
                    cpu.entities.push({
                        ...chosenCard,
                        instanceId: 'ent_' + Math.random().toString(36).substring(2, 9),
                        hp: baseHp,
                        maxHp: baseHp,
                        atk: baseAtk,
                        mode: 'NONE',
                        usedThisTurn: false,
                        statuses: []
                    });
                    state.battle.lastLog = `${cpu.name} invocó a ${chosenCard.name}.`;
                    createFloatingText('p2', '✨ Entidad convocada!', '#6366f1');
                } else if (chosenCard.type === 'BOOST') {
                    if (!cpu.statuses || !cpu.statuses.some(s => s.id === 'AMNESIA')) {
                        cpu.discard.push(chosenCard);
                        cpu.boost = chosenCard.val;
                        state.battle.lastLog = `${cpu.name} usó ${chosenCard.name} (+50% Daño).`;
                        createFloatingText('p2', '⚡ Potenciado X1.5!', '#f59e0b');
                    }
                } else {
                    cpu.discard.push(chosenCard);
                    const scope = chosenCard.targetScope || 'ANY_ENEMY';
                    const target = selectCpuTarget(scope);
                    
                    if (chosenCard.type === 'ATTACK' || chosenCard.type === 'STATUS') {
                        let damage = Math.round((chosenCard.val || 0) * cpu.boost);
                        cpu.boost = 1;
                        if (damage > 0) {
                            resolveAttackWithTarget('p2', target.targetPlayerKey, target.targetKind, target.instanceId, damage, chosenCard.name);
                        }
                    } else if (chosenCard.type === 'DRAIN') {
                        let drainAmt = Math.round(chosenCard.val * cpu.boost);
                        cpu.boost = 1;
                        resolveDrainWithTarget('p2', target.targetPlayerKey, target.targetKind, target.instanceId, drainAmt, chosenCard.name);
                    } else if (chosenCard.type === 'HEAL') {
                        resolveHealWithTarget('p2', target.targetPlayerKey, target.targetKind, target.instanceId, chosenCard.val, chosenCard.name);
                    } else if (chosenCard.type === 'DEFENSE') {
                        resolveShieldWithTarget('p2', target.targetPlayerKey, target.targetKind, target.instanceId, chosenCard.val, chosenCard.name);
                    }

                    if (chosenCard.statusEffect) {
                        applyStatusEffect(target.targetPlayerKey, target.targetKind, target.instanceId, chosenCard.statusEffect, chosenCard.statusVal || 1, chosenCard.statusDuration || 2);
                    }
                }

                updateBattleUI();
                checkMatchOver();

                const remainingPlayable = cpu.hand.filter(c => c.cost <= cpu.energy);
                const hasUnusedEntity = cpu.entities.some(e => !e.usedThisTurn);
                if ((cpu.energy > 0 && remainingPlayable.length > 0) || hasUnusedEntity) {
                    if (state.battle.p1.hp > 0 && state.battleStatus === 'CPU_TURN') {
                        setTimeout(playCpuTurnAI, 800);
                        return;
                    }
                }
            }
        }
    }

    // 3. FINALIZAR TURNO CPU
    setTimeout(() => {
        if (state.battleStatus !== 'CPU_TURN') return;
        state.turnCount++;
        state.battle.turn = 'p1';
        state.battleStatus = 'PLAYING';
        const p1 = state.battle.p1;
        p1.energy = MAX_ENERGY;
        p1.entities.forEach(e => e.usedThisTurn = false);

        processTurnStartStatuses('p1');
        checkMatchOver();
        if (state.battleStatus !== 'PLAYING') return;

        drawCardsForPlayer('p1', 1);
        state.battle.lastLog = 'Tu Turno. Selecciona una carta o activa tus entidades.';
        updateBattleUI();
    }, 600);
}