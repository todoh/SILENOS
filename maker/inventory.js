// inventory.js - SISTEMA DE INVENTARIO Y PANEL CONFIGURADOR
class InventoryManager {
    constructor() {
        this.items = [];
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

        const statsConf = (typeof statsManager !== 'undefined') ? statsManager.getStatsConfig() : null;
        if (statsConf && statsConf.inventoryButton && !statsConf.inventoryButton.enabled) {
            inventoryBar.style.display = 'none';
            return;
        } else {
            inventoryBar.style.display = 'flex';
        }

        const toggleBtn = document.createElement('button');
        toggleBtn.className = `inv-toggle-btn ${this.isOpen ? 'active' : ''}`;
        toggleBtn.title = "Inventario";
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
            this.toggle();
        };
        inventoryBar.appendChild(toggleBtn);
        const panel = document.createElement('div');
        panel.className = `inv-drawer ${this.isOpen ? 'open' : ''}`;
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
                const asset = typeof assetsMap !== 'undefined' ? assetsMap[assetKey] : null;
                const imgSrc = asset ? (asset.dataUrl || asset.url) : assetKey;
                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = itemConfig ? itemConfig.name : itemData.id;
                img.title = itemConfig ? itemConfig.name : itemData.id;
                img.onerror = () => {
                    img.remove();
                    const placeholder = document.createElement('span');
                    placeholder.className = 'inv-placeholder';
                    placeholder.textContent = itemData.id.substring(0, 3).toUpperCase();
                    slot.appendChild(placeholder);
                };
                slot.appendChild(img);
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