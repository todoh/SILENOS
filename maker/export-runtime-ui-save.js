// export-runtime-ui-save.js - SUBMÓDULO DE SISTEMA DE GUARDADO, MENÚ E INVENTARIO
function buildExportRuntimeUISave() {
    return `
        class SaveSystem {
            static SAVE_KEY = 'koreh_game_save_data';
            static saveGame() {
                if (typeof projectData === 'undefined' || typeof gameState === 'undefined') return false;
                const saveData = {
                    timestamp: Date.now(),
                    currentSceneId: currentSceneId,
                    variables: JSON.parse(JSON.stringify(gameState.variables || {})),
                    inventory: (typeof inventoryManager !== 'undefined') ? JSON.parse(JSON.stringify(inventoryManager.items || [])) : [],
                    equipment: (typeof inventoryManager !== 'undefined') ? JSON.parse(JSON.stringify(inventoryManager.equipment || {})) : {},
                    playerPos: null,
                    scenesDelta: {}
                };
                const currentScene = projectData.scenes[currentSceneId];
                if (currentScene && currentScene.elements) {
                    const player = currentScene.elements.find(e => e.isPlayer);
                    if (player) saveData.playerPos = { x: player.x, y: player.y };
                }
                Object.keys(projectData.scenes).forEach(sId => {
                    saveData.scenesDelta[sId] = JSON.parse(JSON.stringify(projectData.scenes[sId].elements));
                });
                try {
                    localStorage.setItem(SaveSystem.SAVE_KEY, JSON.stringify(saveData));
                    return true;
                } catch (e) { return false; }
            }
            static hasSaveGame() { return !!localStorage.getItem(SaveSystem.SAVE_KEY); }
            static loadGame() {
                const raw = localStorage.getItem(SaveSystem.SAVE_KEY);
                if (!raw) return false;
                try {
                    const saveData = JSON.parse(raw);
                    if (saveData.scenesDelta) {
                        Object.keys(saveData.scenesDelta).forEach(sId => {
                            if (projectData.scenes[sId]) projectData.scenes[sId].elements = saveData.scenesDelta[sId];
                        });
                    }
                    if (saveData.variables) gameState.variables = saveData.variables;
                    if (typeof inventoryManager !== 'undefined') {
                        inventoryManager.items = saveData.inventory || [];
                        inventoryManager.equipment = saveData.equipment || { head: null, chest: null, weapon: null, shield: null, feet: null };
                        inventoryManager.render();
                    }
                    const targetScene = saveData.currentSceneId || projectData.startScene;
                    const posX = saveData.playerPos ? saveData.playerPos.x : null;
                    const posY = saveData.playerPos ? saveData.playerPos.y : null;
                    changeSceneWithTransition(targetScene, posX, posY);
                    return true;
                } catch (e) { return false; }
            }
        }

        class GameMenu {
            constructor() { this.initUI(); }
            initUI() {
                this.createOverlayMenu();
                this.injectSaveHUDButton();
            }
            createOverlayMenu() {
                const viewport = document.getElementById('viewport-container');
                if (!viewport || document.getElementById('main-game-menu')) return;
                const menuOverlay = document.createElement('div');
                menuOverlay.id = 'main-game-menu';
                menuOverlay.style.cssText = 'position: absolute; inset: 0; background: rgba(13, 14, 18, 0.85); backdrop-filter: blur(25px); -webkit-backdrop-filter: blur(25px); z-index: 300000; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; color: #ffffff; font-family: -apple-system, sans-serif;';
                const hasSave = SaveSystem.hasSaveGame();
                menuOverlay.innerHTML = \`
                    <div style="text-align: center; margin-bottom: 10px;">
                        <h1 style="font-size: 32px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-shadow: 0 0 20px rgba(0,113,227,0.6);">\${projectData?.name || 'AVENTURA KOREH'}</h1>
                        <p style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 4px;">Selecciona una opción para empezar</p>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px; width: 220px;">
                        <button id="btn-start-new-game" style="background: #0071e3; color: #fff; border: none; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">Nueva Partida</button>
                        <button id="btn-continue-game" style="background: \${hasSave ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}; color: \${hasSave ? '#ffffff' : 'rgba(255,255,255,0.3)'}; border: 1px solid \${hasSave ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}; padding: 12px 20px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: \${hasSave ? 'pointer' : 'not-allowed'};" \${!hasSave ? 'disabled' : ''}>Continuar Partida</button>
                    </div>
                \`;
                viewport.appendChild(menuOverlay);
                document.getElementById('btn-start-new-game').onclick = () => {
                    menuOverlay.style.opacity = '0';
                    menuOverlay.style.transition = 'opacity 0.3s ease';
                    setTimeout(() => { menuOverlay.style.display = 'none'; }, 300);
                };
                const btnContinue = document.getElementById('btn-continue-game');
                if (hasSave) {
                    btnContinue.onclick = () => {
                        if (SaveSystem.loadGame()) {
                            menuOverlay.style.opacity = '0';
                            menuOverlay.style.transition = 'opacity 0.3s ease';
                            setTimeout(() => { menuOverlay.style.display = 'none'; }, 300);
                        }
                    };
                }
            }
            injectSaveHUDButton() {
                const uiContainer = document.getElementById('game-ui');
                if (!uiContainer || document.getElementById('btn-quick-save')) return;
                const btnSave = document.createElement('button');
                btnSave.id = 'btn-quick-save';
                btnSave.style.cssText = 'position: absolute; top: 16px; left: 120px; pointer-events: auto; z-index: 100001; background: rgba(0, 0, 0, 0.75); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.25); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); padding: 8px 14px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer;';
                btnSave.textContent = 'Guardar';
                btnSave.onclick = () => {
                    if (SaveSystem.saveGame()) {
                        btnSave.textContent = 'Guardado!';
                        btnSave.style.background = '#34c759';
                        setTimeout(() => {
                            btnSave.textContent = 'Guardar';
                            btnSave.style.background = 'rgba(0, 0, 0, 0.75)';
                        }, 1500);
                    }
                };
                uiContainer.appendChild(btnSave);
            }
        }

        class InventoryManager {
            constructor() {
                this.items = [];
                this.equipment = { head: null, chest: null, weapon: null, shield: null, feet: null };
                this.maxStack = 99;
                this.isOpen = false;
            }
            addItem(itemId, amount = 1) {
                if (!itemId) return false;
                const existingItem = this.items.find(item => item.id === itemId && item.count < this.maxStack);
                if (existingItem) {
                    const spaceLeft = this.maxStack - existingItem.count;
                    if (amount <= spaceLeft) {
                        existingItem.count += amount;
                        this.render();
                        return true;
                    } else {
                        existingItem.count = this.maxStack;
                        amount -= spaceLeft;
                    }
                }
                while (amount > 0) {
                    const addCount = Math.min(amount, this.maxStack);
                    this.items.push({ id: itemId, count: addCount });
                    amount -= addCount;
                }
                this.render();
                return true;
            }
            removeItem(itemId, amount = 1) {
                if (!itemId) return false;
                for (let i = this.items.length - 1; i >= 0; i--) {
                    if (this.items[i].id === itemId) {
                        if (this.items[i].count > amount) {
                            this.items[i].count -= amount;
                            amount = 0;
                            break;
                        } else {
                            amount -= this.items[i].count;
                            this.items.splice(i, 1);
                        }
                    }
                    if (amount <= 0) break;
                }
                this.render();
                return amount <= 0;
            }
            hasItem(itemId) {
                if (!itemId) return false;
                return this.items.some(item => item.id === itemId && item.count > 0);
            }
            clear() {
                this.items = [];
                this.isOpen = false;
                this.render();
            }
            toggle() {
                this.isOpen = !this.isOpen;
                this.render();
            }
            render() {
                const inventoryBar = document.getElementById('inventory-bar');
                if (!inventoryBar) return;
                inventoryBar.innerHTML = '';
                const toggleBtn = document.createElement('button');
                toggleBtn.className = 'inv-toggle-btn ' + (this.isOpen ? 'active' : '');
                toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path><line x1="12" y1="12" x2="12" y2="12.01"></line></svg>';
                const totalItemsCount = this.items.reduce((acc, curr) => acc + curr.count, 0);
                if (totalItemsCount > 0) {
                    const totalBadge = document.createElement('span');
                    totalBadge.className = 'inv-total-badge';
                    totalBadge.textContent = totalItemsCount;
                    toggleBtn.appendChild(totalBadge);
                }
                toggleBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggle();
                };
                inventoryBar.appendChild(toggleBtn);
                const panel = document.createElement('div');
                panel.className = 'inv-drawer ' + (this.isOpen ? 'open' : '');
                if (this.items.length === 0) {
                    const emptyMsg = document.createElement('div');
                    emptyMsg.className = 'inv-empty-msg';
                    emptyMsg.textContent = 'Vacío';
                    panel.appendChild(emptyMsg);
                } else {
                    this.items.forEach((itemData) => {
                        const slot = document.createElement('div');
                        slot.className = 'inv-slot has-item';
                        const itemConfig = projectData.itemsConfig ? projectData.itemsConfig[itemData.id] : null;
                        const assetKey = itemConfig ? itemConfig.imageAsset : itemData.id;
                        const assetDataUrl = assetsData[assetKey] || assetsData[itemData.id];
                        if (assetDataUrl) {
                            const img = document.createElement('img');
                            img.src = assetDataUrl;
                            slot.appendChild(img);
                        } else {
                            const placeholder = document.createElement('span');
                            placeholder.className = 'inv-placeholder';
                            placeholder.textContent = itemData.id.substring(0, 3).toUpperCase();
                            slot.appendChild(placeholder);
                        }
                        if (itemData.count > 1) {
                            const badge = document.createElement('span');
                            badge.className = 'inv-badge';
                            badge.textContent = itemData.count;
                            slot.appendChild(badge);
                        }
                        panel.appendChild(slot);
                    });
                }
                inventoryBar.appendChild(panel);
            }
        }
        const inventoryManager = new InventoryManager();
    `;
}