// js/questsCatalog.js
// Catálogo Universal de Misiones y Encargos de Maddna City (Versión Completa)
export const QUEST_TYPES = {
    DELIVERY: "DELIVERY",     // Consumir o entregar ítems del inventario
    ACTION: "ACTION",         // Realizar X actividad N minutos
    BUSINESS: "BUSINESS",     // Poseer/fundar X negocio o inmueble
    SKILL: "SKILL"            // Alcanzar nivel N en X habilidad
};

export const QUESTS_CATALOG = {
    QUEST_001: {
        id: "QUEST_001",
        title: "Primeros Pasos en Maddna",
        description: "Completa un turno de trabajo no cualificado para familiarizarte con la ciudad.",
        type: QUEST_TYPES.ACTION,
        targetAction: "WORK_ENTRY",
        targetAmount: 60, // 60 minutos de trabajo
        rewards: {
            money: 500,
            reputation: 5,
            xp: { skill: "working", amount: 100 }
        },
        nextQuest: "QUEST_002"
    },
    QUEST_002: {
        id: "QUEST_002",
        title: "Cuidado Personal",
        description: "Dedica tiempo a descansar o comer para mantener tus vitales estables.",
        type: QUEST_TYPES.ACTION,
        targetAction: "SLEEP",
        targetAmount: 120, // 120 minutos de descanso
        rewards: {
            money: 300,
            reputation: 3,
            xp: { skill: "working", amount: 50 }
        },
        nextQuest: "QUEST_003"
    },
    QUEST_003: {
        id: "QUEST_003",
        title: "Vida Saludable",
        description: "Entrena en el gimnasio para mejorar tu condición física.",
        type: QUEST_TYPES.ACTION,
        targetAction: "TRAIN",
        targetAmount: 60,
        rewards: {
            money: 400,
            reputation: 5,
            xp: { skill: "training", amount: 100 }
        },
        nextQuest: "QUEST_004"
    },
    QUEST_004: {
        id: "QUEST_004",
        title: "Contactos en la Ciudad",
        description: "Pasa tiempo socializando en el centro para expandir tus relaciones.",
        type: QUEST_TYPES.ACTION,
        targetAction: "SOCIALIZE",
        targetAmount: 60,
        rewards: {
            money: 600,
            reputation: 10,
            xp: { skill: "talking", amount: 120 }
        },
        nextQuest: "QUEST_005"
    },
    QUEST_005: {
        id: "QUEST_005",
        title: "Alta Gastronomía",
        description: "Prepara y cocina alimentos para dominar la disciplina gastronómica.",
        type: QUEST_TYPES.ACTION,
        targetAction: "EAT",
        targetAmount: 60,
        rewards: {
            money: 500,
            reputation: 5,
            xp: { skill: "cooking", amount: 150 }
        },
        nextQuest: "QUEST_006"
    },
    QUEST_006: {
        id: "QUEST_006",
        title: "Suministro Energético",
        description: "Adquiere 2 Bebidas Energéticas en el Mercado para abastecer a la patrulla nocturna.",
        type: QUEST_TYPES.DELIVERY,
        targetItem: "ENERGY_DRINK",
        targetAmount: 2,
        rewards: {
            money: 800,
            reputation: 12,
            xp: { skill: "talking", amount: 180 }
        },
        nextQuest: "QUEST_007"
    },
    QUEST_007: {
        id: "QUEST_007",
        title: "Jornada Intensiva",
        description: "Completa un turno extendido de trabajo para conseguir suficiente capital inicial.",
        type: QUEST_TYPES.ACTION,
        targetAction: "WORK_ENTRY",
        targetAmount: 240,
        rewards: {
            money: 1200,
            reputation: 15,
            xp: { skill: "working", amount: 250 }
        },
        nextQuest: "QUEST_008"
    },
    QUEST_008: {
        id: "QUEST_008",
        title: "Primer Inmueble",
        description: "Adquiere tu primera propiedad inmobiliaria en la ciudad.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "BUY_PROPERTY",
        targetAmount: 1,
        rewards: {
            money: 1500,
            reputation: 20,
            xp: { skill: "working", amount: 200 }
        },
        nextQuest: "QUEST_009"
    },
    QUEST_009: {
        id: "QUEST_009",
        title: "Espacio Comercial",
        description: "Adquiere un Local Comercial en el centro para expandir tus opciones de negocio.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "SPECIFIC_PROPERTY",
        targetKey: "COMMERCIAL_LOCAL",
        targetAmount: 1,
        rewards: {
            money: 3000,
            reputation: 30,
            xp: { skill: "working", amount: 300 }
        },
        nextQuest: "QUEST_010"
    },
    QUEST_010: {
        id: "QUEST_010",
        title: "Emprendedor Local",
        description: "Funda tu primera empresa en la ciudad asociándola a un inmueble.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "FOUND_BUSINESS",
        targetAmount: 1,
        rewards: {
            money: 2500,
            reputation: 35,
            xp: { skill: "working", amount: 350 }
        },
        nextQuest: "QUEST_011"
    },
    QUEST_011: {
        id: "QUEST_011",
        title: "Cafetería Abierta",
        description: "Registra oficialmente tu propia Cafetería / Panadería en Maddna City.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "SPECIFIC_BUSINESS",
        targetKey: "BAKERY",
        targetAmount: 1,
        rewards: {
            money: 4000,
            reputation: 40,
            xp: { skill: "cooking", amount: 400 }
        },
        nextQuest: "QUEST_012"
    },
    QUEST_012: {
        id: "QUEST_012",
        title: "Patrimonio Inmobiliario",
        description: "Expande tu cartera y llega a poseer un total de 3 propiedades inmobiliarias.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "PROPERTIES_COUNT",
        targetAmount: 3,
        rewards: {
            money: 6000,
            reputation: 50,
            xp: { skill: "working", amount: 500 }
        },
        nextQuest: "QUEST_013"
    },
    QUEST_013: {
        id: "QUEST_013",
        title: "Imperio Comercial",
        description: "Establece y administra un total de 2 empresas activas en la ciudad.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "BUSINESS_COUNT",
        targetAmount: 2,
        rewards: {
            money: 8000,
            reputation: 60,
            xp: { skill: "working", amount: 600 }
        },
        nextQuest: "QUEST_014"
    },
    QUEST_014: {
        id: "QUEST_014",
        title: "Infraestructura Industrial",
        description: "Adquiere una Nave Industrial en el polígono comercial.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "SPECIFIC_PROPERTY",
        targetKey: "INDUSTRIAL_WAREHOUSE",
        targetAmount: 1,
        rewards: {
            money: 10000,
            reputation: 75,
            xp: { skill: "working", amount: 750 }
        },
        nextQuest: "QUEST_015"
    },
    QUEST_015: {
        id: "QUEST_015",
        title: "Red Logística",
        description: "Funda una Empresa de Logística y Envíos en tu nave industrial.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "SPECIFIC_BUSINESS",
        targetKey: "LOGISTICS",
        targetAmount: 1,
        rewards: {
            money: 15000,
            reputation: 100,
            xp: { skill: "working", amount: 1000 }
        },
        nextQuest: "QUEST_016"
    },
    QUEST_016: {
        id: "QUEST_016",
        title: "Magnate de Maddna City",
        description: "Consolida tu presencia corporativa administrando un total de 3 empresas.",
        type: QUEST_TYPES.BUSINESS,
        targetAction: "BUSINESS_COUNT",
        targetAmount: 3,
        rewards: {
            money: 25000,
            reputation: 150,
            xp: { skill: "working", amount: 1500 }
        },
        nextQuest: null
    }
};