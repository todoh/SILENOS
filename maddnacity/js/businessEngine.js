// js/businessEngine.js
// Motor Financiero, Compras, Estilo de Vida y Simulación Empresarial
import { PROPERTY_TYPES, BUSINESS_TYPES, MARKET_ITEMS } from "./economy.js";
import { LIFESTYLE_CATALOG } from "./lifestyleCatalog.js";

export class BusinessEngine {
    constructor(timeEngine) {
        this.timeEngine = timeEngine;
    }

    // Comprar una propiedad inmobiliaria aplicando descuentos de Negociador
    buyProperty(player, propertyTypeId) {
        const propDef = PROPERTY_TYPES[propertyTypeId];
        if (!propDef) return { success: false, reason: "Inmueble no reconocido." };

        const discount = player.modifiers?.purchaseDiscount || 0;
        const finalPrice = Math.round(propDef.price * (1 - discount));

        if (player.money < finalPrice) {
            return { success: false, reason: "Fondos insuficientes para esta propiedad." };
        }

        player.money -= finalPrice;
        const newProperty = {
            id: "prop_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            typeId: propertyTypeId,
            acquiredAt: Date.now(),
            lastRentPaid: Date.now()
        };

        if (!player.properties) player.properties = [];
        player.properties.push(newProperty);
        return { success: true, property: newProperty };
    }

    // Fundar una nueva empresa
    foundBusiness(player, businessTypeId, businessName, propertyId) {
        const bizDef = BUSINESS_TYPES[businessTypeId];
        if (!bizDef) return { success: false, reason: "Tipo de empresa no válido." };

        if (bizDef.requiredSkill) {
            const playerSkill = player.skills?.[bizDef.requiredSkill];
            const currentLevel = playerSkill ? playerSkill.level : 1;
            const minLevel = bizDef.minSkillLevel || 1;
            if (currentLevel < minLevel) {
                const skillNames = {
                    cooking: "Cocina",
                    training: "Entrenamiento",
                    talking: "Socialización",
                    working: "Trabajo"
                };
                const readableSkill = skillNames[bizDef.requiredSkill] || bizDef.requiredSkill;
                return { 
                    success: false, 
                    reason: `Requiere Nivel ${minLevel} en ${readableSkill} (Nivel actual: ${currentLevel}).` 
                };
            }
        }

        const discount = player.modifiers?.purchaseDiscount || 0;
        const finalCost = Math.round(bizDef.creationCost * (1 - discount));

        if (player.money < finalCost) {
            return { success: false, reason: "Fondos insuficientes para capital inicial." };
        }

        const prop = (player.properties || []).find(p => p.id === propertyId);
        if (!prop) return { success: false, reason: "Debes asignar una propiedad válida a la empresa." };

        const propDef = PROPERTY_TYPES[prop.typeId];
        if (propDef.category !== bizDef.requiredProperty) {
            return { success: false, reason: `Esta empresa requiere un inmueble de tipo ${bizDef.requiredProperty}.` };
        }

        player.money -= finalCost;
        const newBusiness = {
            id: "biz_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            typeId: businessTypeId,
            name: businessName || bizDef.name,
            propertyId: propertyId,
            vaultMoney: 0,
            level: 1,
            employees: [],
            lastIncomeUpdate: Date.now()
        };

        if (!player.businesses) player.businesses = [];
        player.businesses.push(newBusiness);

        let infGain = 10;
        if (player.modifiers?.influenceGainMult) {
            infGain *= (1 + player.modifiers.influenceGainMult);
        }
        player.influence = (player.influence || 0) + infGain;

        return { success: true, business: newBusiness };
    }

    // Comprar objeto de estilo de vida
    buyLifestyleItem(player, itemId) {
        const itemDef = LIFESTYLE_CATALOG[itemId];
        if (!itemDef) return { success: false, reason: "Objeto de estilo de vida no encontrado." };

        if (!player.lifestyle) {
            player.lifestyle = { equippedVehicle: null, equippedApparel: null, equippedHomeComfort: null, ownedItems: {} };
        }

        if (player.lifestyle.ownedItems && player.lifestyle.ownedItems[itemId]) {
            return { success: false, reason: "Ya posees este bien de lujo." };
        }

        const discount = player.modifiers?.purchaseDiscount || 0;
        const finalPrice = Math.round(itemDef.price * (1 - discount));

        if (player.money < finalPrice) {
            return { success: false, reason: "Fondos insuficientes para adquirir este objeto." };
        }

        player.money -= finalPrice;
        player.lifestyle.ownedItems[itemId] = {
            acquiredAt: Date.now(),
            status: "ACTIVE"
        };

        return { success: true };
    }

    // Equipar / Asignar bien de lujo
    equipLifestyleItem(player, itemId) {
        if (!player.lifestyle || !player.lifestyle.ownedItems || !player.lifestyle.ownedItems[itemId]) {
            return { success: false, reason: "No posees este objeto en tus bienes." };
        }

        const itemDef = LIFESTYLE_CATALOG[itemId];
        if (!itemDef) return { success: false, reason: "Definición de objeto no encontrada." };

        if (itemDef.type === "VEHICLES") player.lifestyle.equippedVehicle = itemId;
        if (itemDef.type === "APPAREL") player.lifestyle.equippedApparel = itemId;
        if (itemDef.type === "HOME_COMFORT") player.lifestyle.equippedHomeComfort = itemId;

        return { success: true };
    }

    // Comprar un objeto del mercado de consumo
    buyMarketItem(player, itemId, quantity = 1) {
        const item = MARKET_ITEMS[itemId];
        if (!item) return { success: false, reason: "Objeto no encontrado." };

        const discount = player.modifiers?.purchaseDiscount || 0;
        const unitPrice = Math.round(item.price * (1 - discount));
        const totalCost = unitPrice * quantity;

        if (player.money < totalCost) {
            return { success: false, reason: "Dinero insuficiente." };
        }

        player.money -= totalCost;
        if (!player.inventory) player.inventory = {};
        player.inventory[itemId] = (player.inventory[itemId] || 0) + quantity;
        return { success: true };
    }

    // Usar objeto del inventario
    useMarketItem(player, itemId) {
        if (!player.inventory || !player.inventory[itemId] || player.inventory[itemId] <= 0) {
            return { success: false, reason: "No tienes este objeto en el inventario." };
        }

        const item = MARKET_ITEMS[itemId];
        player.inventory[itemId] -= 1;

        if (item.effects) {
            const mult = 1 + (player.modifiers?.foodVitalsBonus || 0);
            const maxHealth = 100 + (player.modifiers?.maxHealthBonus || 0);

            if (item.effects.health) player.stats.health = Math.min(maxHealth, player.stats.health + (item.effects.health * mult));
            if (item.effects.energy) player.stats.energy = Math.min(100, player.stats.energy + (item.effects.energy * mult));
            if (item.effects.mood) player.stats.mood = Math.min(100, player.stats.mood + (item.effects.mood * mult));
        }

        return { success: true };
    }

    // Procesar beneficios pasivos de las empresas con multiplicadores de especialización
    processBusinessIncome(player, currentRealTimestamp) {
        if (!player.businesses || player.businesses.length === 0) return false;
        let modified = false;

        player.businesses.forEach(biz => {
            const lastUpdate = biz.lastIncomeUpdate || currentRealTimestamp;
            const elapsedRealMs = currentRealTimestamp - lastUpdate;
            const elapsedGameMinutes = ((elapsedRealMs / 1000) * this.timeEngine.TIME_FACTOR) / 60;

            if (elapsedGameMinutes >= 60) {
                const gameHours = Math.floor(elapsedGameMinutes / 60);
                const bizDef = BUSINESS_TYPES[biz.typeId];

                if (bizDef) {
                    let skillMultiplier = 1.0;
                    if (bizDef.requiredSkill && player.skills?.[bizDef.requiredSkill]) {
                        const skillLevel = player.skills[bizDef.requiredSkill].level;
                        const minLevel = bizDef.minSkillLevel || 1;
                        const bonusLevels = Math.max(0, skillLevel - minLevel);
                        skillMultiplier += bonusLevels * 0.10;

                        // Bonificador de Chef Ejecutivo si la empresa utiliza la habilidad de cocina
                        if (bizDef.requiredSkill === "cooking" && player.modifiers?.businessRevenue_cooking) {
                            skillMultiplier += player.modifiers.businessRevenue_cooking;
                        }
                    }

                    let maintenance = bizDef.baseMaintenancePerGameHour;
                    if (player.modifiers?.bizMaintenanceMult) {
                        maintenance *= (1 + player.modifiers.bizMaintenanceMult);
                    }

                    const netProfitPerHour = (bizDef.baseRevenuePerGameHour * skillMultiplier) - maintenance;
                    let totalProfit = Math.max(0, netProfitPerHour) * gameHours * biz.level;

                    if (player.modifiers?.vaultYieldBonus) {
                        totalProfit *= (1 + player.modifiers.vaultYieldBonus);
                    }

                    biz.vaultMoney += totalProfit;
                    biz.lastIncomeUpdate = currentRealTimestamp;
                    modified = true;
                }
            }
        });

        return modified;
    }

    // Procesar el cobro de alquileres y el coste de mantenimiento de Estilo de Vida
    processDailyRent(player, currentRealTimestamp) {
        let modified = false;

        // 1. Alquileres Inmobiliarios
        if (player.properties && player.properties.length > 0) {
            player.properties.forEach(prop => {
                const lastRent = prop.lastRentPaid || prop.acquiredAt || currentRealTimestamp;
                const elapsedRealMs = currentRealTimestamp - lastRent;
                const elapsedGameMinutes = ((elapsedRealMs / 1000) * this.timeEngine.TIME_FACTOR) / 60;

                if (elapsedGameMinutes >= 1440) {
                    const gameDays = Math.floor(elapsedGameMinutes / 1440);
                    const propDef = PROPERTY_TYPES[prop.typeId];

                    if (propDef && propDef.rentCostPerDay) {
                        let rent = propDef.rentCostPerDay;
                        if (player.modifiers?.rentCostMult) {
                            rent *= (1 + player.modifiers.rentCostMult);
                        }

                        const totalRent = rent * gameDays;
                        player.money = Math.max(0, player.money - totalRent);

                        if (player.money === 0) {
                            player.reputation = Math.max(0, (player.reputation || 0) - (2 * gameDays));
                        }
                        prop.lastRentPaid = currentRealTimestamp;
                        modified = true;
                    }
                }
            });
        }

        // 2. Mantenimiento Diario de Objetos de Estilo de Vida
        const lastMaint = player.lastLifestyleMaintenancePaid || currentRealTimestamp;
        const elapsedRealMs = currentRealTimestamp - lastMaint;
        const elapsedGameMinutes = ((elapsedRealMs / 1000) * this.timeEngine.TIME_FACTOR) / 60;

        if (elapsedGameMinutes >= 1440 && player.lifestyle && player.lifestyle.ownedItems) {
            const gameDays = Math.floor(elapsedGameMinutes / 1440);

            Object.keys(player.lifestyle.ownedItems).forEach(itemId => {
                const itemDef = LIFESTYLE_CATALOG[itemId];
                const itemState = player.lifestyle.ownedItems[itemId];

                if (itemDef && itemDef.dailyMaintenance > 0) {
                    const totalMaintCost = itemDef.dailyMaintenance * gameDays;

                    if (player.money >= totalMaintCost) {
                        player.money -= totalMaintCost;
                        itemState.status = "ACTIVE";
                    } else {
                        itemState.status = "INACTIVE"; // Pierde bonificaciones por impago
                    }
                }
            });

            player.lastLifestyleMaintenancePaid = currentRealTimestamp;
            modified = true;
        }

        return modified;
    }

    // Retirar fondos de la caja fuerte
    withdrawBusinessVault(player, businessId) {
        const biz = (player.businesses || []).find(b => b.id === businessId);
        if (!biz) return { success: false, reason: "Empresa no encontrada." };
        if (biz.vaultMoney <= 0) return { success: false, reason: "La caja fuerte está vacía." };

        const amount = biz.vaultMoney;
        player.money += amount;
        biz.vaultMoney = 0;
        return { success: true, amount };
    }
}