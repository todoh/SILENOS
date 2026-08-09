// Motor Financiero, Compras y Simulación Empresarial
import { PROPERTY_TYPES, BUSINESS_TYPES, MARKET_ITEMS } from "./economy.js";

export class BusinessEngine {
    constructor(timeEngine) {
        this.timeEngine = timeEngine;
    }

    // Comprar una propiedad inmobiliaria
    buyProperty(player, propertyTypeId) {
        const propDef = PROPERTY_TYPES[propertyTypeId];
        if (!propDef) return { success: false, reason: "Inmueble no reconocido." };
        if (player.money < propDef.price) {
            return { success: false, reason: "Fondos insuficientes para esta propiedad." };
        }

        player.money -= propDef.price;
        const newProperty = {
            id: "prop_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
            typeId: propertyTypeId,
            acquiredAt: Date.now()
        };

        if (!player.properties) player.properties = [];
        player.properties.push(newProperty);

        return { success: true, property: newProperty };
    }

    // Fundar una nueva empresa con verificación de nivel de habilidad requerido
    foundBusiness(player, businessTypeId, businessName, propertyId) {
        const bizDef = BUSINESS_TYPES[businessTypeId];
        if (!bizDef) return { success: false, reason: "Tipo de empresa no válido." };

        // 1. Verificación de nivel mínimo de habilidad
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

        if (player.money < bizDef.creationCost) {
            return { success: false, reason: "Fondos insuficientes para capital inicial." };
        }

        // Validar propiedad vinculada
        const prop = (player.properties || []).find(p => p.id === propertyId);
        if (!prop) return { success: false, reason: "Debes asignar una propiedad válida a la empresa." };

        const propDef = PROPERTY_TYPES[prop.typeId];
        if (propDef.category !== bizDef.requiredProperty) {
            return { success: false, reason: `Esta empresa requiere un inmueble de tipo ${bizDef.requiredProperty}.` };
        }

        player.money -= bizDef.creationCost;
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

        // Bonificación de influencia
        player.influence = (player.influence || 0) + 10;

        return { success: true, business: newBusiness };
    }

    // Comprar un objeto del mercado de consumo
    buyMarketItem(player, itemId, quantity = 1) {
        const item = MARKET_ITEMS[itemId];
        if (!item) return { success: false, reason: "Objeto no encontrado." };

        const totalCost = item.price * quantity;
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
            if (item.effects.health) player.stats.health = Math.min(100, player.stats.health + item.effects.health);
            if (item.effects.energy) player.stats.energy = Math.min(100, player.stats.energy + item.effects.energy);
            if (item.effects.mood) player.stats.mood = Math.min(100, player.stats.mood + item.effects.mood);
        }

        return { success: true };
    }

    // Procesar beneficios e ingresos pasivos de las empresas con bonificación por habilidad
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
                    // Cálculo de multiplicador por habilidad (+10% de ingresos por nivel adicional)
                    let skillMultiplier = 1.0;
                    if (bizDef.requiredSkill && player.skills?.[bizDef.requiredSkill]) {
                        const skillLevel = player.skills[bizDef.requiredSkill].level;
                        const minLevel = bizDef.minSkillLevel || 1;
                        const bonusLevels = Math.max(0, skillLevel - minLevel);
                        skillMultiplier += bonusLevels * 0.10;
                    }

                    const netProfitPerHour = (bizDef.baseRevenuePerGameHour * skillMultiplier) - bizDef.baseMaintenancePerGameHour;
                    const totalProfit = Math.max(0, netProfitPerHour) * gameHours * biz.level;

                    biz.vaultMoney += totalProfit;
                    biz.lastIncomeUpdate = currentRealTimestamp;
                    modified = true;
                }
            }
        });

        return modified;
    }

    // Retirar fondos de la caja fuerte de una empresa al dinero personal
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