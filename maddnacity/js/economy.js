// Catálogo de Economía, Propiedades e Inmuebles de Maddna City

export const PROPERTY_TYPES = {
    APARTMENT_BASIC: {
        id: "APARTMENT_BASIC",
        name: "Apartamento Modesto",
        category: "RESIDENTIAL",
        price: 25000,
        rentCostPerDay: 15, // Coste de mantenimiento por día de juego
        energyBonus: 0.05, // Bonificación a la regeneración de energía al descansar
        capacity: 1
    },
    LUXURY_PENTHOUSE: {
        id: "LUXURY_PENTHOUSE",
        name: "Ático de Lujo en Maddna Tower",
        category: "RESIDENTIAL",
        price: 250000,
        rentCostPerDay: 120,
        energyBonus: 0.2,
        moodBonus: 0.1,
        capacity: 2
    },
    COMMERCIAL_LOCAL: {
        id: "COMMERCIAL_LOCAL",
        name: "Local Comercial Centro",
        category: "COMMERCIAL",
        price: 80000,
        rentCostPerDay: 50,
        maxWorkers: 3
    },
    INDUSTRIAL_WAREHOUSE: {
        id: "INDUSTRIAL_WAREHOUSE",
        name: "Nave Industrial Polígono",
        category: "COMMERCIAL",
        price: 300000,
        rentCostPerDay: 180,
        maxWorkers: 10
    }
};

export const BUSINESS_TYPES = {
    BAKERY: {
        id: "BAKERY",
        name: "Cafetería / Panadería",
        requiredProperty: "COMMERCIAL",
        creationCost: 15000,
        baseRevenuePerGameHour: 45, // Ingresos base por hora de juego
        baseMaintenancePerGameHour: 15,
        requiredSkill: "cooking",
        minSkillLevel: 1
    },
    GYM: {
        id: "GYM",
        name: "Centro Deportivo Maddna",
        requiredProperty: "COMMERCIAL",
        creationCost: 45000,
        baseRevenuePerGameHour: 120,
        baseMaintenancePerGameHour: 40,
        requiredSkill: "training",
        minSkillLevel: 2
    },
    LOGISTICS: {
        id: "LOGISTICS",
        name: "Empresa de Logística y Envíos",
        requiredProperty: "INDUSTRIAL",
        creationCost: 180000,
        baseRevenuePerGameHour: 500,
        baseMaintenancePerGameHour: 150,
        requiredSkill: "working",
        minSkillLevel: 3
    }
};

export const MARKET_ITEMS = {
    ENERGY_DRINK: {
        id: "ENERGY_DRINK",
        name: "Bebida Energética Maddna",
        price: 15,
        effects: { energy: +25, mood: +5 }
    },
    HEALTH_KIT: {
        id: "HEALTH_KIT",
        name: "Botiquín de Primeros Auxilios",
        price: 50,
        effects: { health: +40 }
    },
    GOURMET_MEAL: {
        id: "GOURMET_MEAL",
        name: "Cena de Gran Lujo",
        price: 100,
        effects: { mood: +40, energy: +15 }
    }
};