// --- ACCIONES: LÓGICA DE COMBATE Y DEFENSA ---
// Guardar como: Cartas Silen/actions-combat.js

window.GameActionsCombat = {
    autoAssignDefenders: (context) => {
        const { setGameState, addLog, gameState } = context;
        if (gameState.phase !== 'response') return;

        setGameState(prev => {
            const myId = prev.myPlayerId;
            const newPlayers = [...prev.players];
            const me = newPlayers[myId];
            
            me.field.forEach(c => c.isFrozen = false);
            let newIncoming = prev.incomingStack.map(a => ({ ...a, blockerUuid: null }));
            
            let availableDefenders = me.field.filter(c => !c.isFrozen);

            newIncoming = newIncoming.map(action => {
                if (availableDefenders.length === 0) return action;

                const isAbilityAttack = action.damageValue !== undefined;
                const attackPower = isAbilityAttack ? Number(action.damageValue) : (Number(action.sourceStats) || 0);

                let bestIdx = availableDefenders.findIndex(d => {
                    const defenseStat = isAbilityAttack ? (Number(d.specialDefense) || 0) : (Number(d.defense) || 0);
                    return defenseStat >= attackPower;
                });
                
                if (bestIdx === -1) {
                    bestIdx = 0; 
                }

                const defender = availableDefenders[bestIdx];
                defender.isFrozen = true;
                availableDefenders.splice(bestIdx, 1);

                return { ...action, blockerUuid: defender.uuid };
            });

            addLog("Autodefensa calculada.");
            return { ...prev, incomingStack: newIncoming, players: newPlayers };
        });
    },

    assignDefender: (actionUuid, blockerCardUuid, context) => {
        const { gameState, setGameState, addLog } = context;
        if (gameState.phase !== 'response') return;

        setGameState(prev => {
            const myId = prev.myPlayerId;
            const newPlayers = [...prev.players];
            const me = newPlayers[myId];
            
            const actionIndex = prev.incomingStack.findIndex(a => a.uuid === actionUuid);
            if (actionIndex === -1) return prev;
            const currentAction = prev.incomingStack[actionIndex];

            if (currentAction.blockerUuid) {
                const oldBlocker = me.field.find(c => c.uuid === currentAction.blockerUuid);
                if (oldBlocker) {
                    oldBlocker.isFrozen = false; 
                }
            }

            let newIncoming = [...prev.incomingStack];

            if (blockerCardUuid === null) {
                newIncoming[actionIndex] = { ...currentAction, blockerUuid: null };
                addLog("Defensa retirada.");
            } else {
                const newBlocker = me.field.find(c => c.uuid === blockerCardUuid);
                if (newBlocker) {
                    newIncoming = newIncoming.map(act => {
                        if (act.blockerUuid === blockerCardUuid) {
                            return { ...act, blockerUuid: null };
                        }
                        return act;
                    });
                    newBlocker.isFrozen = true;
                    newIncoming[actionIndex] = { ...currentAction, blockerUuid: blockerCardUuid };
                    addLog(`${newBlocker.name} defiende.`);
                }
            }

            return { ...prev, incomingStack: newIncoming, players: newPlayers };
        });
    },

    resolveCombatPhase: (context) => {
        const { gameState, setGameState, addLog, onBack, conn, gameConfig } = context;
        
        const defenderId = gameState.turn; 
        const attackerId = defenderId === 0 ? 1 : 0;

        const newPlayers = JSON.parse(JSON.stringify(gameState.players));
        const defender = newPlayers[defenderId];
        const attackerPlayer = newPlayers[attackerId]; 
        
        gameState.incomingStack.forEach(action => {
            const isAbilityAttack = action.damageValue !== undefined;
            const potentialPoints = (action.sourcePoints !== undefined && action.sourcePoints !== null) ? Number(action.sourcePoints) : 1; 
            
            if (action.blockerUuid) {
                const blockerIndex = defender.field.findIndex(c => c.uuid === action.blockerUuid);
                if (blockerIndex !== -1) {
                    const blocker = defender.field[blockerIndex];
                    
                    if (isAbilityAttack) {
                        const attackValue = Number(action.damageValue) || 0;
                        const blockerSDef = Number(blocker.specialDefense) || 0;
                        
                        const finalDamage = Math.max(0, attackValue - blockerSDef);
                        blocker.currentHp -= finalDamage;
                        
                        addLog(`${blocker.name} (SDEF: ${blockerSDef}) recibe ${finalDamage} daño de ${action.abilityName}.`);
                    } else {
                        const attackValue = Number(action.sourceStats) || 0; 
                        const blockerDef = Number(blocker.defense) || 0;
                        const blockerAtk = Number(blocker.attack) || 0;
                        
                        const attackerCardIndex = attackerPlayer.field.findIndex(c => c.uuid === action.sourceCardUuid);
                        let attackerDef = 0;
                        let attackerCard = null;
                        
                        if (attackerCardIndex !== -1) {
                            attackerCard = attackerPlayer.field[attackerCardIndex];
                            attackerDef = Number(attackerCard.defense) || 0;
                        }

                        const damageToBlocker = Math.max(0, attackValue - blockerDef);
                        const damageToAttacker = Math.max(0, blockerAtk - attackerDef);

                        addLog(`Choque: ${action.sourceCardName} (ATK:${attackValue}) vs ${blocker.name} (DEF:${blockerDef}, ATK:${blockerAtk})`);

                        if (damageToBlocker > 0) {
                            blocker.currentHp -= damageToBlocker;
                            addLog(`${blocker.name} sufre ${damageToBlocker} de daño.`);
                        } else {
                            addLog(`${blocker.name} bloqueó todo el daño físico.`);
                        }

                        if (attackerCard && damageToAttacker > 0) {
                            attackerCard.currentHp -= damageToAttacker;
                            addLog(`${attackerCard.name} sufre ${damageToAttacker} daño por contraataque.`);
                            
                            if (attackerCard.currentHp <= 0) {
                                addLog(`${attackerCard.name} ha muerto contraatacado.`);
                                attackerPlayer.field.splice(attackerCardIndex, 1);
                                attackerPlayer.retirement.push(attackerCard);
                            }
                            
                            if (conn && gameConfig?.mode !== 'ai') {
                                conn.send({ 
                                    type: 'DAMAGE_REPORT', 
                                    payload: { targetUuid: action.sourceCardUuid, targetName: action.sourceCardName, damage: damageToAttacker } 
                                });
                            }
                        }
                    }

                    if (blocker.currentHp <= 0) {
                        addLog(`${blocker.name} ha sido destruida.`);
                        defender.field.splice(blockerIndex, 1);
                        defender.retirement.push(blocker);
                    }
                }
            } else {
                const currentPoints = Number(newPlayers[attackerId].points) || 0;
                newPlayers[attackerId].points = currentPoints + potentialPoints; 
                addLog(`¡Impacto Directo! ${action.sourceCardName} conecta por ${potentialPoints} pts.`);
            }
        });

        const myId = gameState.myPlayerId;
        const opId = myId === 0 ? 1 : 0;
        
        if (newPlayers[opId].points >= 30) {
            alert(gameConfig?.mode === 'ai' ? "DERROTA. La IA ha ganado." : "EL RIVAL HA ALCANZADO 30 PUNTOS. DERROTA.");
            if (conn) conn.send({ type: 'GAME_OVER', payload: { winner: opId } });
            onBack();
        } else if (newPlayers[myId].points >= 30) {
            alert("¡VICTORIA! Has alcanzado 30 Puntos.");
            if (conn) conn.send({ type: 'GAME_OVER', payload: { winner: myId } });
            onBack();
        }

        return {
            players: newPlayers,
            incomingStack: []
        };
    }
};