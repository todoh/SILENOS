// js/lifestyleCatalog.js
// Catálogo de Bienes de Lujo y Estilo de Vida de Maddna City
export const LIFESTYLE_TYPES = {
    VEHICLES: "VEHICLES",
    APPAREL: "APPAREL",
    HOME_COMFORT: "HOME_COMFORT"
};

export const LIFESTYLE_CATALOG = {
    // VEHÍCULOS
    BIKE_ELEC: {
        id: "BIKE_ELEC",
        type: LIFESTYLE_TYPES.VEHICLES,
        name: "Bicicleta Eléctrica Urbana",
        description: "Transporte ecológico. Reduce en un 10% el tiempo consumido en desplazamientos y trabajo.",
        price: 1500,
        dailyMaintenance: 5,
        image: "images/bicicleta.jpg",
        modifiers: { timeReduction: 0.10 }
    },
    SEDAN_URBAN: {
        id: "SEDAN_URBAN",
        type: LIFESTYLE_TYPES.VEHICLES,
        name: "Sedán Urbano Automático",
        description: "Comodidad razonable. Reduce un 15% el tiempo de actividades.",
        price: 18000,
        dailyMaintenance: 35,
        image: "images/sedan.jpg",
        modifiers: { timeReduction: 0.15 }
    },
    CYBER_SPORTSCAR: {
        id: "CYBER_SPORTSCAR",
        type: LIFESTYLE_TYPES.VEHICLES,
        name: "Deportivo Cyberpunk V8",
        description: "Vehículo de altísimas prestaciones. Reduce un 25% el tiempo de actividades.",
        price: 120000,
        dailyMaintenance: 180,
        image: "images/sedan.jpg",
        modifiers: { timeReduction: 0.25 }
    },
    // ROPA Y ACCESORIOS
    STREET_WEAR: {
        id: "STREET_WEAR",
        type: LIFESTYLE_TYPES.APPAREL,
        name: "Indumentaria Callejera Premium",
        description: "Diseño urbano disruptivo. Aumenta la velocidad de socialización un +10%.",
        price: 800,
        dailyMaintenance: 2,
        image: "images/ropa.jpg",
        modifiers: { socializeSpeed: 0.10, dailyReputation: 1 }
    },
    EXECUTIVE_SUIT: {
        id: "EXECUTIVE_SUIT",
        type: LIFESTYLE_TYPES.APPAREL,
        name: "Traje Ejecutivo a Medida",
        description: "Elegancia corporativa. Aumenta el prestigio diario y otorga +20% a la oratoria.",
        price: 8500,
        dailyMaintenance: 25,
        image: "images/traje.jpg",
        modifiers: { socializeSpeed: 0.20, dailyReputation: 5 }
    },
    LUXURY_WATCH: {
        id: "LUXURY_WATCH",
        type: LIFESTYLE_TYPES.APPAREL,
        name: "Reloj de Alta Horología",
        description: "Símbolo máximo de estatus personal.",
        price: 45000,
        dailyMaintenance: 60,
        image: "images/relog.jpg",
        modifiers: { dailyReputation: 15, dailyInfluence: 2 }
    },
    // COMODIDADES DEL HOGAR
    BED_ERGONOMIC: {
        id: "BED_ERGONOMIC",
        type: LIFESTYLE_TYPES.HOME_COMFORT,
        name: "Cama Ergonómica de Viscoelástica",
        description: "+15% a la tasa de regeneración de vitales durante el sueño.",
        price: 2200,
        dailyMaintenance: 4,
        image: "images/cama.jpg",
        modifiers: { sleepRegenBonus: 0.15 }
    },
    ADVANCED_WORKSTATION: {
        id: "ADVANCED_WORKSTATION",
        type: LIFESTYLE_TYPES.HOME_COMFORT,
        name: "Estación de Trabajo Cuántica",
        description: "Mejora el ánimo y la recuperación mental pasiva.",
        price: 12000,
        dailyMaintenance: 30,
        image: "images/estacioncuantica.jpg",
        modifiers: { sleepRegenBonus: 0.25, moodRegenBonus: 0.20 }
    },
    CLIMATE_SYSTEM: {
        id: "CLIMATE_SYSTEM",
        type: LIFESTYLE_TYPES.HOME_COMFORT,
        name: "Sistema de Climatización Domótica",
        description: "Mantiene la temperatura ambiente idónea de forma autónoma.",
        price: 35000,
        dailyMaintenance: 75,
        image: "images/climatizacion.jpg",
        modifiers: { sleepRegenBonus: 0.40, healthRegenBonus: 0.20 }
    }
};