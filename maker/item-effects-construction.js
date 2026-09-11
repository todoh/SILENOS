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
            
            // Interceptar el guardado de items en inventory.js
            const btnSave = document.getElementById('btn-save-inv-item');
            if (btnSave) {
                const originalOnClick = btnSave.onclick;
                btnSave.addEventListener('click', () => {
                    this.saveItemExtendedData();
                });
            }
        });
    }

    injectInventoryConfigFields() {
        const viewInv = document.getElementById('view-inventory-config');
        if (!viewInv) return;

        const btnSave = document.getElementById('btn-save-inv-item');
        if (!btnSave) return;

        // Evitar duplicar la inyección de campos
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

        // Evento toggle de construible
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
        select.innerHTML = '<option value="">-- Seleccionar Elemento --</option>';

        const savedConfig = projectData.savedElementsConfig || {};
        Object.keys(savedConfig).forEach(key => {
            const elem = savedConfig[key];
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = `${elem.savedName || key} (${elem.width || 100}x${elem.height || 100}px)`;
            select.appendChild(opt);
        });
    }

    saveItemExtendedData() {
        const idInput = document.getElementById('inv-item-id');
        if (!idInput) return;
        const id = idInput.value.trim().replace(/\s+/g, '_');
        if (!id || !projectData.itemsConfig || !projectData.itemsConfig[id]) return;

        const hp = parseInt(document.getElementById('inv-item-hp')?.value, 10) || 0;
        const hunger = parseInt(document.getElementById('inv-item-hunger')?.value, 10) || 0;
        const thirst = parseInt(document.getElementById('inv-item-thirst')?.value, 10) || 0;
        const statId = document.getElementById('inv-item-stat-id')?.value.trim() || '';
        const statVal = parseInt(document.getElementById('inv-item-stat-val')?.value, 10) || 0;
        
        const isConstructible = document.getElementById('inv-item-is-constructible')?.checked || false;
        const savedElementKey = document.getElementById('inv-item-saved-element')?.value || '';

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
    }

    // ==========================================
    // 2. EJECUCIÓN DE EFECTOS AL CLICAR EN EL INVENTARIO
    // ==========================================
    useItem(itemId) {
        if (!itemId || !projectData.itemsConfig) return false;
        const config = projectData.itemsConfig[itemId];
        if (!config) return false;

        let used = false;

        // A) Aplicar Efectos de Consumo (Vida, Hambre, Sed, Stats)
        if (config.effects) {
            const eff = config.effects;
            
            // Integración con statsManager si existe, o gameState.variables
            if (typeof statsManager !== 'undefined' && statsManager.stats) {
                if (eff.hp && statsManager.stats.hp !== undefined) {
                    statsManager.stats.hp = Math.min(statsManager.stats.maxHp || 100, statsManager.stats.hp + eff.hp);
                    used = true;
                }
                if (eff.hunger && statsManager.stats.hunger !== undefined) {
                    statsManager.stats.hunger = Math.min(statsManager.stats.maxHunger || 100, statsManager.stats.hunger + eff.hunger);
                    used = true;
                }
                if (eff.thirst && statsManager.stats.thirst !== undefined) {
                    statsManager.stats.thirst = Math.min(statsManager.stats.maxThirst || 100, statsManager.stats.thirst + eff.thirst);
                    used = true;
                }
                if (eff.statId && statsManager.stats[eff.statId] !== undefined) {
                    statsManager.stats[eff.statId] += eff.statVal;
                    used = true;
                }
            }

            // Fallback a gameState.variables
            if (typeof gameState !== 'undefined' && gameState.variables) {
                if (eff.hp && gameState.variables.hp !== undefined) {
                    gameState.variables.hp += eff.hp;
                    used = true;
                }
                if (eff.hunger && gameState.variables.hunger !== undefined) {
                    gameState.variables.hunger += eff.hunger;
                    used = true;
                }
                if (eff.thirst && gameState.variables.thirst !== undefined) {
                    gameState.variables.thirst += eff.thirst;
                    used = true;
                }
                if (eff.statId) {
                    gameState.variables[eff.statId] = (gameState.variables[eff.statId] || 0) + eff.statVal;
                    used = true;
                }
            }
        }

        // Si tuvo efecto, consumir 1 unidad del inventario
        if (used && typeof inventoryManager !== 'undefined') {
            inventoryManager.removeItem(itemId, 1);
            if (typeof renderStage === 'function') renderStage();
            return true;
        }

        return false;
    }

    // ==========================================
    // 3. CONSTRUCCIÓN Y DESPLAZAMIENTO DEL JUGADOR
    // ==========================================
    initPlayModeHooks() {
        document.addEventListener('DOMContentLoaded', () => {
            const viewport = document.getElementById('viewport-container');
            if (!viewport) return;

            // Escuchar drag and drop desde el inventario al mundo en Play Mode
            viewport.addEventListener('dragover', (e) => {
                if (isPlayMode) e.preventDefault();
            });

            viewport.addEventListener('drop', (e) => {
                if (!isPlayMode) return;
                const itemId = e.dataTransfer.getData('text/plain');
                if (!itemId || !projectData.itemsConfig) return;

                const config = projectData.itemsConfig[itemId];
                if (config && config.isConstructible && config.savedElementKey) {
                    e.preventDefault();
                    const coords = getCanvasWorldCoordinates(e);
                    this.startConstructionPipeline(itemId, config.savedElementKey, coords.clickX, coords.clickY);
                }
            });
        });
    }

    startConstructionPipeline(itemId, savedElementKey, targetX, targetY) {
        const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
        if (!scene) return;

        const player = scene.elements ? scene.elements.find(e => e.isPlayer) : null;
        if (!player) {
            // Si no hay jugador, colocar directamente
            this.placeElementOnMap(itemId, savedElementKey, targetX, targetY);
            return;
        }

        // Ordenar al motor de movimiento desplazarse hacia la posición elegida
        if (typeof movementEngine !== 'undefined') {
            movementEngine.setTarget(targetX, targetY);

            // Bucle de verificación de llegada
            const checkArrival = setInterval(() => {
                const pPivot = movementEngine.getPlayerPivot();
                const dist = Math.hypot(pPivot.x - targetX, pPivot.y - targetY);

                // Distancia de interacción de llegada (100px)
                if (dist <= 100 || !movementEngine.isMoving) {
                    clearInterval(checkArrival);
                    if (dist <= 120) {
                        this.placeElementOnMap(itemId, savedElementKey, targetX, targetY);
                    }
                }
            }, 100);
        } else {
            this.placeElementOnMap(itemId, savedElementKey, targetX, targetY);
        }
    }

    placeElementOnMap(itemId, savedElementKey, x, y) {
        const scene = projectData.scenes ? projectData.scenes[currentSceneId] : null;
        if (!scene) return;

        const template = projectData.savedElementsConfig ? projectData.savedElementsConfig[savedElementKey] : null;
        const width = template ? template.width : 100;
        const height = template ? template.height : 100;

        const instanceId = 'constructed_' + Date.now() + Math.random().toString(36).substring(2, 6);
        const newElem = {
            id: instanceId,
            image: template ? template.image : 'placeholder.svg',
            x: Math.max(0, Math.round(x - width / 2)),
            y: Math.max(0, Math.round(y - height / 2)),
            width: width,
            height: height,
            rotation: 0,
            type: template ? template.type : 'decoracion',
            billboardMode: template ? template.billboardMode : 'fixed',
            hasCollision: template ? template.hasCollision : true,
            collisionX: template ? template.collisionX : 0,
            collisionY: template ? template.collisionY : 0,
            collisionW: template ? template.collisionW : width,
            collisionH: template ? template.collisionH : height,
            dialog: template ? template.dialog : '',
            targetScene: '',
            addItem: [],
            removeItem: [],
            condition: { type: 'none' },
            setVariable: { varId: '', value: '' }
        };

        scene.elements.push(newElem);

        // Descontar objeto del inventario
        if (typeof inventoryManager !== 'undefined') {
            inventoryManager.removeItem(itemId, 1);
        }

        if (typeof renderStage === 'function') renderStage();
        if (typeof autoSaveJSON === 'function') autoSaveJSON();
    }
}

const itemEffectsConstruction = new ItemEffectsConstructionManager();

// Interceptar clics directos en los slots de inventario en tiempo de juego
if (typeof InventoryManager !== 'undefined') {
    const originalRender = InventoryManager.prototype.render;
    InventoryManager.prototype.render = function() {
        originalRender.call(this);

        if (!isPlayMode) return;

        // Añadir evento click a las casillas del inventario
        const slots = document.querySelectorAll('#player-inv-panel .inv-slot, #inventory-bar .inv-slot');
        slots.forEach(slot => {
            const img = slot.querySelector('img');
            if (img && img.alt) {
                const itemId = img.alt;
                slot.onclick = (e) => {
                    e.stopPropagation();
                    const config = projectData.itemsConfig ? projectData.itemsConfig[itemId] : null;

                    if (config && config.isConstructible) {
                        alert("Arrastra este objeto al mapa para construirlo en la ubicación deseada.");
                    } else {
                        itemEffectsConstruction.useItem(itemId);
                    }
                };
            }
        });
    };
}