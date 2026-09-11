// inventory.js - SISTEMA DE INVENTARIO Y MENÚ DE JUGADOR (CRISTAL ULTRA TRANSPARENTE CON DESENFOQUE GAUSSIANO + ALTA SEPARACIÓN LATERAL)
class InventoryManager {
    constructor() {
        this.items = [];
        this.equipment = {
            head: null,
            chest: null,
            weapon: null,
            shield: null,
            feet: null
        };
        this.maxStack = 99;
        this.isOpen = false;
        this.isMenuOpen = false;
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
        this.equipment = { head: null, chest: null, weapon: null, shield: null, feet: null };
        this.isOpen = false;
        this.isMenuOpen = false;
        this.render();
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.render();
    }

    togglePlayerMenu(forceState = null) {
        if (forceState !== null) {
            this.isMenuOpen = forceState;
        } else {
            this.isMenuOpen = !this.isMenuOpen;
        }
        this.render();
    }

    equipItem(slotKey, itemId) {
        if (!this.equipment.hasOwnProperty(slotKey)) return false;
        if (this.equipment[slotKey]) {
            this.addItem(this.equipment[slotKey], 1);
        }
        this.equipment[slotKey] = itemId;
        this.removeItem(itemId, 1);
        this.render();
        return true;
    }

    unequipItem(slotKey) {
        if (!this.equipment.hasOwnProperty(slotKey) || !this.equipment[slotKey]) return false;
        const itemId = this.equipment[slotKey];
        this.equipment[slotKey] = null;
        this.addItem(itemId, 1);
        this.render();
        return true;
    }

    // Posicionamiento dinámico: separado lo más posible del centro del personaje
    updateMenuPosition() {
        if (!this.isMenuOpen) return;
        const equipPanel = document.getElementById('player-equip-panel');
        const invPanel = document.getElementById('player-inv-panel');
        if (!equipPanel && !invPanel) return;

        const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
        const player = scene && scene.elements ? scene.elements.find(e => e.isPlayer) : null;
        const viewport = document.getElementById('viewport-container');
        if (!viewport) return;

        const playerEl = player ? (document.getElementById('stage-el-' + player.id) ||
                                  document.getElementById('el-' + player.id) ||
                                  document.getElementById(player.id) ||
                                  document.querySelector(`[data-id="${player.id}"]`)) : null;

        let pCenterX, pCenterY, pHalfWidth;

        if (playerEl) {
            const pRect = playerEl.getBoundingClientRect();
            const vRect = viewport.getBoundingClientRect();
            pCenterX = pRect.left - vRect.left + (pRect.width / 2);
            pCenterY = pRect.top - vRect.top + (pRect.height / 2);
            pHalfWidth = pRect.width / 2;
        } else {
            const vRect = viewport.getBoundingClientRect();
            pCenterX = vRect.width / 2;
            pCenterY = vRect.height / 2;
            pHalfWidth = 20;
        }

        // Gran separación respecto al centro del personaje
        const gap = 180;

        // Panel de EQUIPO (Lejos a la izquierda)
        if (equipPanel) {
            equipPanel.style.left = `${pCenterX - pHalfWidth - gap}px`;
            equipPanel.style.top = `${pCenterY}px`;
            equipPanel.style.transform = `translate(-100%, -50%)`;
        }

        // Panel de INVENTARIO (Lejos a la derecha)
        if (invPanel) {
            invPanel.style.left = `${pCenterX + pHalfWidth + gap}px`;
            invPanel.style.top = `${pCenterY}px`;
            invPanel.style.transform = `translate(0, -50%)`;
        }
    }

    render() {
        // Barra de Inventario Superior / Botón
        const inventoryBar = document.getElementById('inventory-bar');
        if (inventoryBar) {
            inventoryBar.innerHTML = '';
            const statsConf = (typeof statsManager !== 'undefined') ? statsManager.getStatsConfig() : null;
            if (statsConf && statsConf.inventoryButton && !statsConf.inventoryButton.enabled) {
                inventoryBar.style.display = 'none';
            } else {
                inventoryBar.style.display = 'flex';
            }
            const toggleBtn = document.createElement('button');
            toggleBtn.className = `inv-toggle-btn ${this.isOpen ? 'active' : ''}`;
            toggleBtn.title = "Inventario de Jugador";
            toggleBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                    <line x1="12" y1="12" x2="12" y2="12.01"></line>
                </svg>
            `;
            const totalItemsCount = this.items.reduce((acc, curr) => acc + curr.count, 0);
            if (totalItemsCount > 0) {
                const totalBadge = document.createElement('span');
                totalBadge.className = 'inv-total-badge';
                totalBadge.textContent = totalItemsCount;
                toggleBtn.appendChild(totalBadge);
            }
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                this.togglePlayerMenu();
            };
            inventoryBar.appendChild(toggleBtn);
        }

        const gameUI = document.getElementById('game-ui');
        if (!gameUI) return;

        let playerMenu = document.getElementById('player-game-menu');
        if (!playerMenu) {
            playerMenu = document.createElement('div');
            playerMenu.id = 'player-game-menu';
            gameUI.appendChild(playerMenu);
        }

        if (!this.isMenuOpen || !isPlayMode) {
            playerMenu.style.display = 'none';
            return;
        }

        playerMenu.style.display = 'block';
        playerMenu.innerHTML = '';
        playerMenu.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 100005;
        `;

        // CSS Cristal Design: Prácticamente transparente con desenfoque Gaussiano fuerte
        const crystalDesignStyle = `
            position: absolute;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(40px) saturate(220%);
            -webkit-backdrop-filter: blur(40px) saturate(220%);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-top: 1px solid rgba(255, 255, 255, 0.35);
            border-left: 1px solid rgba(255, 255, 255, 0.28);
            border-radius: 24px;
            padding: 16px;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35), inset 0 0 25px rgba(255, 255, 255, 0.06);
            pointer-events: auto;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        // =========================================================================
        // PANEL IZQUIERDO: EQUIPO (Cristal Ultra Transparente Gaussiano)
        // =========================================================================
        const equipPanel = document.createElement('div');
        equipPanel.id = 'player-equip-panel';
        equipPanel.style.cssText = crystalDesignStyle + `
            width: 175px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        const equipTitle = document.createElement('div');
        equipTitle.style.cssText = `
            font-size: 11px;
            font-weight: 800;
            color: #60a5fa;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            text-shadow: 0 0 12px rgba(96, 165, 250, 0.7);
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        equipTitle.innerHTML = `<span style="font-size: 13px;">🛡️</span> EQUIPO`;
        equipPanel.appendChild(equipTitle);

        const slotsConfig = [
            { key: 'head', label: 'Cabeza' },
            { key: 'chest', label: 'Pecho' },
            { key: 'weapon', label: 'Arma' },
            { key: 'shield', label: 'Escudo' },
            { key: 'feet', label: 'Pies' }
        ];

        slotsConfig.forEach(s => {
            const slotEl = document.createElement('div');
            slotEl.style.cssText = `
                display: flex;
                align-items: center;
                gap: 8px;
                background: rgba(255, 255, 255, 0.04);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 14px;
                padding: 4px 8px;
                height: 38px;
                cursor: pointer;
                transition: all 0.25s ease;
                box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.1);
            `;

            const equippedItemId = this.equipment[s.key];
            if (equippedItemId) {
                const itemConfig = projectData.itemsConfig ? projectData.itemsConfig[equippedItemId] : null;
                const assetKey = itemConfig ? itemConfig.imageAsset : equippedItemId;
                const asset = typeof assetsMap !== 'undefined' ? assetsMap[assetKey] : null;
                const imgSrc = asset ? (asset.dataUrl || asset.url) : assetKey;
                slotEl.innerHTML = `
                    <img src="${imgSrc}" style="width: 24px; height: 24px; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));">
                    <span style="font-size: 10px; color: #fff; font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${itemConfig ? itemConfig.name : equippedItemId}</span>
                `;
                slotEl.title = `Clic para desequipar ${s.label}`;
                slotEl.onclick = () => this.unequipItem(s.key);
            } else {
                slotEl.innerHTML = `<span style="font-size: 9px; color: rgba(255,255,255,0.45); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${s.label}</span>`;
            }

            slotEl.onmouseenter = () => { slotEl.style.background = 'rgba(255, 255, 255, 0.12)'; slotEl.style.borderColor = 'rgba(255, 255, 255, 0.3)'; };
            slotEl.onmouseleave = () => { slotEl.style.background = 'rgba(255, 255, 255, 0.04)'; slotEl.style.borderColor = 'rgba(255, 255, 255, 0.12)'; };
            slotEl.ondragover = (e) => e.preventDefault();
            slotEl.ondrop = (e) => {
                e.preventDefault();
                const itemId = e.dataTransfer.getData('text/plain');
                if (itemId) {
                    this.equipItem(s.key, itemId);
                }
            };
            equipPanel.appendChild(slotEl);
        });

        playerMenu.appendChild(equipPanel);

        // =========================================================================
        // PANEL DERECHO: INVENTARIO DE OBJETOS (Cristal Ultra Transparente Gaussiano)
        // =========================================================================
        const invPanel = document.createElement('div');
        invPanel.id = 'player-inv-panel';
        invPanel.style.cssText = crystalDesignStyle + `
            min-width: 250px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;

        const invHeader = document.createElement('div');
        invHeader.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.12); padding-bottom: 6px;';
        invHeader.innerHTML = `
            <span style="font-size: 11px; font-weight: 800; color: #4ade80; text-transform: uppercase; letter-spacing: 1.2px; text-shadow: 0 0 12px rgba(74, 222, 128, 0.7); display: flex; align-items: center; gap: 6px;">
                <span>🎒</span> OBJETOS
            </span>
            <button id="close-player-menu" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255,255,255,0.85); font-size: 14px; cursor: pointer; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">&times;</button>
        `;
        invPanel.appendChild(invHeader);

        const itemsGrid = document.createElement('div');
        itemsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            max-height: 200px;
            overflow-y: auto;
            padding-right: 2px;
        `;

        if (this.items.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.style.cssText = 'grid-column: span 4; font-size: 10px; color: rgba(255,255,255,0.4); text-align: center; padding: 24px 0; font-style: italic;';
            emptyMsg.textContent = 'Inventario vacío';
            itemsGrid.appendChild(emptyMsg);
        } else {
            this.items.forEach((itemData) => {
                const slot = document.createElement('div');
                slot.style.cssText = `
                    position: relative;
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.04);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: grab;
                    transition: all 0.25s ease;
                    box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.1);
                `;
                slot.draggable = true;

                const itemConfig = projectData.itemsConfig ? projectData.itemsConfig[itemData.id] : null;
                const assetKey = itemConfig ? itemConfig.imageAsset : itemData.id;
                const asset = typeof assetsMap !== 'undefined' ? assetsMap[assetKey] : null;
                const imgSrc = asset ? (asset.dataUrl || asset.url) : assetKey;

                const img = document.createElement('img');
                img.src = imgSrc;
                img.style.cssText = 'max-width: 80%; max-height: 80%; object-fit: contain; pointer-events: none; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));';
                img.alt = itemConfig ? itemConfig.name : itemData.id;
                slot.title = itemConfig ? itemConfig.name : itemData.id;
                slot.appendChild(img);

                if (itemData.count > 1) {
                    const badge = document.createElement('span');
                    badge.style.cssText = `
                        position: absolute;
                        bottom: -3px;
                        right: -3px;
                        background: rgba(0, 113, 227, 0.85);
                        color: #ffffff;
                        font-size: 8.5px;
                        font-weight: 800;
                        padding: 1px 5px;
                        border-radius: 6px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                        border: 1px solid rgba(255,255,255,0.4);
                    `;
                    badge.textContent = itemData.count;
                    slot.appendChild(badge);
                }

                slot.onmouseenter = () => { slot.style.background = 'rgba(255, 255, 255, 0.14)'; slot.style.borderColor = 'rgba(255, 255, 255, 0.35)'; slot.style.transform = 'scale(1.06)'; };
                slot.onmouseleave = () => { slot.style.background = 'rgba(255, 255, 255, 0.04)'; slot.style.borderColor = 'rgba(255, 255, 255, 0.14)'; slot.style.transform = 'scale(1)'; };
                slot.ondragstart = (e) => {
                    e.dataTransfer.setData('text/plain', itemData.id);
                };
                itemsGrid.appendChild(slot);
            });
        }
        invPanel.appendChild(itemsGrid);
        playerMenu.appendChild(invPanel);

        const closeBtn = playerMenu.querySelector('#close-player-menu');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.togglePlayerMenu(false);
            };
        }

        // Sincronizar posición inicial
        this.updateMenuPosition();
    }
}

const inventoryManager = new InventoryManager();

function renderInventory() {
    inventoryManager.render();
}

function updateInventoryConfigUI() {
    const list = document.getElementById('registered-items-list');
    if (!list) return;
    list.innerHTML = '';
    if (!projectData.itemsConfig || Object.keys(projectData.itemsConfig).length === 0) {
        list.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary);">No hay ítems configurados.</span>';
        return;
    }
    Object.keys(projectData.itemsConfig).forEach(itemId => {
        const item = projectData.itemsConfig[itemId];
        const card = document.createElement('div');
        card.style.cssText = 'display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.7); border: 1px solid var(--border-subtle); padding: 6px 10px; border-radius: 8px;';
        const asset = assetsMap[item.imageAsset];
        const imgSrc = asset ? asset.url : '';
        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${imgSrc ? `<img src="${imgSrc}" style="width: 24px; height: 24px; object-fit: contain;">` : '<div style="width:24px;height:24px;background:#eee;border-radius:4px;"></div>'}
                <div>
                    <strong style="font-size: 11px; display: block; color: var(--text-primary);">${item.name}</strong>
                    <span style="font-size: 9px; color: var(--text-secondary);">${itemId}</span>
                </div>
            </div>
            <button class="btn" style="padding: 2px 6px; font-size: 10px; background: #ff3b30; color: white; border: none;">Borrar</button>
        `;
        card.querySelector('button').onclick = () => {
            delete projectData.itemsConfig[itemId];
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            updateInventoryConfigUI();
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
        };
        list.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const btnPickerTrigger = document.getElementById('btn-picker-trigger');
    const dropdown = document.getElementById('picker-grid-dropdown');
    const btnSaveInvItem = document.getElementById('btn-save-inv-item');
    const btnLoadItemImage = document.getElementById('btn-load-item-image');
    const invItemFileInput = document.getElementById('inv-item-file-input');

    if (btnPickerTrigger && dropdown) {
        btnPickerTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.style.display === 'none' || dropdown.style.display === '';
            dropdown.style.display = isHidden ? 'block' : 'none';
            if (isHidden && typeof renderAssetPickerGrid === 'function') {
                renderAssetPickerGrid();
            }
        });
        document.addEventListener('click', () => {
            dropdown.style.display = 'none';
        });
        dropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    if (btnLoadItemImage && invItemFileInput) {
        btnLoadItemImage.addEventListener('click', () => invItemFileInput.click());
        invItemFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await registerAsset(file.name, file);
                selectPickerAsset(file.name);
                if (dirHandle) {
                    try {
                        const newFileHandle = await dirHandle.getFileHandle(file.name, { create: true });
                        const writable = await newFileHandle.createWritable();
                        await writable.write(file);
                        await writable.close();
                    } catch (err) {
                        console.error("Error guardando imagen en el directorio local:", err);
                    }
                }
            }
        });
    }

    if (btnSaveInvItem) {
        btnSaveInvItem.addEventListener('click', () => {
            const idInput = document.getElementById('inv-item-id');
            const nameInput = document.getElementById('inv-item-name');
            const id = idInput ? idInput.value.trim().replace(/\s+/g, '_') : '';
            const name = nameInput ? nameInput.value.trim() : '';

            if (!id) {
                alert('Por favor, introduce un ID único para el ítem.');
                return;
            }
            if (!selectedPickerAssetKey) {
                alert('Por favor, selecciona o carga una imagen para el ítem.');
                return;
            }

            if (!projectData.itemsConfig) projectData.itemsConfig = {};
            projectData.itemsConfig[id] = {
                name: name || id,
                imageAsset: selectedPickerAssetKey
            };

            if (typeof autoSaveJSON === 'function') autoSaveJSON();
            updateInventoryConfigUI();
            if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();

            if (idInput) idInput.value = '';
            if (nameInput) nameInput.value = '';
            selectedPickerAssetKey = '';
            const triggerText = document.getElementById('picker-trigger-text');
            if (triggerText) triggerText.textContent = '-- Seleccionar Imagen --';
        });
    }
});