// item-effects-construction.js - LÓGICA DE EFECTOS DE ITEMS (VIDA, HAMBRE, SED, STATS) Y CONSTRUCCIÓN EN MAPA
class ItemEffectsConstructionManager {
    constructor() {
        this.pendingConstruction = null;
        this.initUIHooks();
        this.initPlayModeHooks();
    }

    // ==========================================
    // 1. CONFIGURACIÓN Y EXTENSIÓN DE LA UI (PESTAÑA DE DATOS)
    // ==========================================
    initUIHooks() {
        document.addEventListener('DOMContentLoaded', () => {
            this.injectInventoryConfigFields();
            const btnSave = document.getElementById('btn-save-inv-item');
            if (btnSave) {
                btnSave.addEventListener('click', () => {
                    this.saveItemExtendedData();
                }, true);
            }
        });
    }

    injectInventoryConfigFields() {
        const viewInv = document.getElementById('view-inventory-config');
        if (!viewInv) return;
        const btnSave = document.getElementById('btn-save-inv-item');
        if (!btnSave) return;
        if (document.getElementById('item-effects-container')) return;

        const container = document.createElement('div');
        container.id = 'item-effects-container';
        container.style.cssText = 'display: flex; flex-direction: column; gap: 10px; margin-top: 8px; background: rgba(0,0,0,0.03); padding: 10px; border-radius: 8px; border: 1px solid var(--border-subtle);';
        container.innerHTML = `
            <strong style="font-size: 11px; color: var(--accent-blue);">Efectos al Consumir / Usar</strong>
            <div class="row-group" style="display: flex; gap: 6px;">
                <div class="form-group" style="flex:1;">
                    <label style="font-size: 9px;">+ Vida (HP):</label>
                    <input type="number" id="inv-item-hp" value="0" style="font-size: 10px; padding: 4px;">
                </div>
                <div class="form-group" style="flex:1;">
                    <label style="font-size: 9px;">+ Hambre:</label>
                    <input type="number" id="inv-item-hunger" value="0" style="font-size: 10px; padding: 4px;">
                </div>
                <div class="form-group" style="flex:1;">
                    <label style="font-size: 9px;">+ Sed:</label>
                    <input type="number" id="inv-item-thirst" value="0" style="font-size: 10px; padding: 4px;">
                </div>
            </div>
            <div class="form-group">
                <label style="font-size: 9px;">Modificar Estadística Personalizada:</label>
                <div style="display: flex; gap: 6px;">
                    <input type="text" id="inv-item-stat-id" placeholder="Ej: fuerza, velocidad" style="flex:1; font-size: 10px; padding: 4px;">
                    <input type="number" id="inv-item-stat-val" value="0" style="width: 60px; font-size: 10px; padding: 4px;">
                </div>
            </div>
            <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 4px 0;">
            <strong style="font-size: 11px; color: #107c41;">Propiedades de Construcción</strong>
            <div class="form-group" style="flex-direction: row; align-items: center; gap: 8px;">
                <input type="checkbox" id="inv-item-is-constructible" style="width: auto; cursor: pointer;">
                <label for="inv-item-is-constructible" style="margin: 0; cursor: pointer; font-size: 10px; font-weight: 600;">Es Objeto Construible en Mapa</label>
            </div>
            <div id="constructible-select-group" class="form-group" style="display: none;">
                <label style="font-size: 9px;">Elemento Guardado a Colocar:</label>
                <select id="inv-item-saved-element" style="font-size: 10px; padding: 4px;"></select>
            </div>
        `;
        btnSave.parentNode.insertBefore(container, btnSave);

        const chkConstruct = document.getElementById('inv-item-is-constructible');
        const groupSelect = document.getElementById('constructible-select-group');
        if (chkConstruct && groupSelect) {
            chkConstruct.addEventListener('change', () => {
                groupSelect.style.display = chkConstruct.checked ? 'flex' : 'none';
                if (chkConstruct.checked) {
                    this.populateSavedElementsDropdown();
                }
            });
        }
    }

    populateSavedElementsDropdown() {
        const select = document.getElementById('inv-item-saved-element');
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- Seleccionar Elemento --</option>';
        const savedConfig = projectData.savedElementsConfig || {};
        Object.keys(savedConfig).forEach(key => {
            const elem = savedConfig[key];
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${elem.savedName || key} (${elem.width || 100}x${elem.height || 100}px)`;
            if (key === currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    }

    saveItemExtendedData() {
        const idInput = document.getElementById('inv-item-id');
        if (!idInput) return;
        const id = idInput.value.trim().replace(/\s+/g, '_');
        if (!id) return;

        const hp = parseInt(document.getElementById('inv-item-hp')?.value, 10) || 0;
        const hunger = parseInt(document.getElementById('inv-item-hunger')?.value, 10) || 0;
        const thirst = parseInt(document.getElementById('inv-item-thirst')?.value, 10) || 0;
        const statId = document.getElementById('inv-item-stat-id')?.value.trim() || '';
        const statVal = parseInt(document.getElementById('inv-item-stat-val')?.value, 10) || 0;

        const isConstructible = document.getElementById('inv-item-is-constructible')?.checked || false;
        const savedElementKey = document.getElementById('inv-item-saved-element')?.value || '';

        setTimeout(() => {
            if (!projectData.itemsConfig) projectData.itemsConfig = {};
            if (!projectData.itemsConfig[id]) {
                projectData.itemsConfig[id] = { name: id };
            }
            projectData.itemsConfig[id].effects = {
                hp,
                hunger,
                thirst,
                statId,
                statVal
            };
            projectData.itemsConfig[id].isConstructible = isConstructible;
            projectData.itemsConfig[id].savedElementKey = savedElementKey;
            if (typeof autoSaveJSON === 'function') autoSaveJSON();
        }, 0);
    }

    // ==========================================
    // 2. EJECUCIÓN DE EFECTOS AL CLICAR O USAR EN EL INVENTARIO
    // ==========================================
    useItem(itemId) {
        if (!itemId || !projectData.itemsConfig) return false;
        const config = projectData.itemsConfig[itemId];
        if (!config) return false;

        let used = false;
        if (typeof gameState === 'undefined') window.gameState = { variables: {} };
        if (!gameState.variables) gameState.variables = {};

        if (config.effects) {
            const eff = config.effects;
            if (eff.hp && eff.hp !== 0) {
                if (typeof statsManager !== 'undefined' && statsManager.stats) {
                    statsManager.stats.hp = Math.min(statsManager.stats.maxHp || 100, (statsManager.stats.hp || 0) + eff.hp);
                }
                gameState.variables.hp = (gameState.variables.hp || 0) + eff.hp;
                used = true;
            }
            if (eff.hunger && eff.hunger !== 0) {
                if (typeof statsManager !== 'undefined' && statsManager.stats) {
                    statsManager.stats.hunger = Math.min(statsManager.stats.maxHunger || 100, (statsManager.stats.hunger || 0) + eff.hunger);
                }
                gameState.variables.hunger = (gameState.variables.hunger || 0) + eff.hunger;
                used = true;
            }
            if (eff.thirst && eff.thirst !== 0) {
                if (typeof statsManager !== 'undefined' && statsManager.stats) {
                    statsManager.stats.thirst = Math.min(statsManager.stats.maxThirst || 100, (statsManager.stats.thirst || 0) + eff.thirst);
                }
                gameState.variables.thirst = (gameState.variables.thirst || 0) + eff.thirst;
                used = true;
            }
            if (eff.statId && eff.statVal !== 0) {
                if (typeof statsManager !== 'undefined' && statsManager.stats) {
                    statsManager.stats[eff.statId] = (statsManager.stats[eff.statId] || 0) + eff.statVal;
                }
                gameState.variables[eff.statId] = (gameState.variables[eff.statId] || 0) + eff.statVal;
                used = true;
            }
        }

        if (!used && config.effects && (config.effects.hp || config.effects.hunger || config.effects.thirst || config.effects.statId)) {
            used = true;
        }

        if (used && typeof inventoryManager !== 'undefined') {
            inventoryManager.removeItem(itemId, 1);
            if (typeof renderStage === 'function') renderStage(false);
            return true;
        }
        return false;
    }

    // ==========================================
    // 3. CONSTRUCCIÓN Y DESPLAZAMIENTO CON DETECCIÓN DE DRAG & DROP SOBRE PLAYER O MAPA
    // ==========================================
    initPlayModeHooks() {
        document.addEventListener('DOMContentLoaded', () => {
            const viewport = document.getElementById('viewport-container');
            const stage = document.getElementById('stage');

            const handleDragOver = (e) => {
                if (typeof isPlayMode !== 'undefined' && isPlayMode) {
                    e.preventDefault();
                    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
                }
            };

            if (viewport) viewport.addEventListener('dragover', handleDragOver);
            if (stage) stage.addEventListener('dragover', handleDragOver);
            window.addEventListener('dragover', handleDragOver, false);

            const handleDrop = (e) => {
                if (typeof isPlayMode === 'undefined' || !isPlayMode) return;
                if (e.target.closest('#player-inv-panel') || e.target.closest('#player-equip-panel')) return;

                const itemId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : null;
                if (!itemId) return;

                e.preventDefault();
                e.stopPropagation();

                const config = projectData.itemsConfig ? projectData.itemsConfig[itemId] : null;
                const coords = typeof getCanvasWorldCoordinates === 'function' ? getCanvasWorldCoordinates(e) : { clickX: e.clientX, clickY: e.clientY };
                const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
                const player = scene && scene.elements ? scene.elements.find(el => el.isPlayer) : null;

                const isConstructible = config ? (config.isConstructible !== false) : true;
                const savedElementKey = config ? config.savedElementKey : null;
                const isConsumable = !!(config && config.effects && (config.effects.hp || config.effects.hunger || config.effects.thirst || config.effects.statId));

                let isDroppedOnPlayer = false;
                if (player) {
                    const margin = 35;
                    const inPlayerBounds = coords.clickX >= (player.x - margin) &&
                        coords.clickX <= (player.x + player.width + margin) &&
                        coords.clickY >= (player.y - margin) &&
                        coords.clickY <= (player.y + player.height + margin);
                    if (inPlayerBounds) {
                        isDroppedOnPlayer = true;
                    }
                }

                if (isDroppedOnPlayer) {
                    if (isConsumable) {
                        this.useItem(itemId);
                    } else if (isConstructible || savedElementKey) {
                        this.placeElementOnMap(itemId, savedElementKey, coords.clickX, coords.clickY);
                    }
                } else {
                    if (isConstructible || savedElementKey || this.findTemplate(itemId, savedElementKey)) {
                        this.startConstructionPipeline(itemId, savedElementKey, coords.clickX, coords.clickY);
                    } else if (isConsumable) {
                        this.startConsumablePipeline(itemId, coords.clickX, coords.clickY);
                    }
                }
            };

            if (viewport) viewport.addEventListener('drop', handleDrop);
            if (stage) stage.addEventListener('drop', handleDrop);
            window.addEventListener('drop', handleDrop, false);
        });
    }

    startConsumablePipeline(itemId, targetX, targetY) {
        if (typeof movementEngine !== 'undefined' && movementEngine.player) {
            movementEngine.setTarget(targetX, targetY);
            let attempts = 0;
            const checkArrival = setInterval(() => {
                attempts++;
                const pPivot = movementEngine.getPlayerPivot();
                const dist = Math.hypot(pPivot.x - targetX, pPivot.y - targetY);
                if (dist <= 120 || !movementEngine.isMoving || attempts > 50) {
                    clearInterval(checkArrival);
                    this.useItem(itemId);
                }
            }, 100);
        } else {
            this.useItem(itemId);
        }
    }

    startConstructionPipeline(itemId, savedElementKey, targetX, targetY) {
        const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
        if (!scene) return;
        const player = scene.elements ? scene.elements.find(e => e.isPlayer) : null;
        if (!player) {
            this.placeElementOnMap(itemId, savedElementKey, targetX, targetY);
            return;
        }
        if (typeof movementEngine !== 'undefined' && movementEngine.player) {
            movementEngine.setTarget(targetX, targetY);
            let attempts = 0;
            const checkArrival = setInterval(() => {
                attempts++;
                const pPivot = movementEngine.getPlayerPivot();
                const dist = Math.hypot(pPivot.x - targetX, pPivot.y - targetY);
                if (dist <= 120 || !movementEngine.isMoving || attempts > 50) {
                    clearInterval(checkArrival);
                    this.placeElementOnMap(itemId, savedElementKey, targetX, targetY);
                }
            }, 100);
        } else {
            this.placeElementOnMap(itemId, savedElementKey, targetX, targetY);
        }
    }

    findTemplate(itemId, savedElementKey) {
        const savedConfig = projectData.savedElementsConfig || {};
        if (savedElementKey && savedConfig[savedElementKey]) {
            return savedConfig[savedElementKey];
        }
        if (savedConfig[itemId]) {
            return savedConfig[itemId];
        }
        if (savedConfig['saved_' + itemId]) {
            return savedConfig['saved_' + itemId];
        }
        const keys = Object.keys(savedConfig);
        for (const k of keys) {
            const el = savedConfig[k];
            if (el.savedName && el.savedName.toLowerCase() === itemId.toLowerCase()) {
                return el;
            }
        }
        const itemConf = projectData.itemsConfig ? projectData.itemsConfig[itemId] : null;
        if (itemConf && itemConf.imageAsset) {
            return {
                image: itemConf.imageAsset,
                width: 100,
                height: 100,
                type: 'entidad',
                billboardMode: 'fixed',
                hasCollision: true
            };
        }
        return null;
    }

    placeElementOnMap(itemId, savedElementKey, x, y) {
        if (!itemId) return;
        const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
        if (!scene) return;

        const template = this.findTemplate(itemId, savedElementKey);
        if (!template) {
            console.warn("No se pudo obtener plantilla para el elemento:", savedElementKey || itemId);
            return;
        }

        const newElem = JSON.parse(JSON.stringify(template));
        const instanceId = 'constructed_' + Date.now() + Math.random().toString(36).substring(2, 6);
        newElem.id = instanceId;
        delete newElem.savedName;

        const width = newElem.width || 100;
        const height = newElem.height || 100;
        newElem.x = Math.max(0, Math.round(x - width / 2));
        newElem.y = Math.max(0, Math.round(y - height / 2));

        if (!newElem.type) newElem.type = 'entidad';
        if (!newElem.billboardMode) newElem.billboardMode = 'fixed';
        if (newElem.hasCollision === undefined) newElem.hasCollision = true;

        if (!scene.elements) scene.elements = [];
        scene.elements.push(newElem);

        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.removeItem(itemId, 1);
        }

        if (typeof renderStage === 'function') renderStage(false);
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    }
}

const itemEffectsConstruction = new ItemEffectsConstructionManager();

if (typeof InventoryManager !== 'undefined') {
    const originalRender = InventoryManager.prototype.render;
    InventoryManager.prototype.render = function() {
        originalRender.call(this);
        if (!isPlayMode) return;
        const slots = document.querySelectorAll('#player-inv-panel .inv-slot, #inventory-bar .inv-slot');
        slots.forEach(slot => {
            const img = slot.querySelector('img');
            if (img && img.alt) {
                const itemId = img.alt;
                slot.onclick = (e) => {
                    e.stopPropagation();
                    const config = projectData.itemsConfig ? projectData.itemsConfig[itemId] : null;
                    if (config && config.isConstructible && config.savedElementKey) {
                        alert("Arrastra este objeto al mapa para construirlo en la ubicación deseada.");
                    } else if (config && config.effects && (config.effects.hp || config.effects.hunger || config.effects.thirst || config.effects.statId)) {
                        itemEffectsConstruction.useItem(itemId);
                    }
                };
            }
        });
    };
}