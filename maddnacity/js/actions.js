// Catálogo Universal de Acciones de Maddna City
// Las duraciones se definen en MINUTOS DE JUEGO (Maddna City Time)

export const ACTION_TYPES = {
    SLEEP: "SLEEP",
    EAT: "EAT",
    WORK_ENTRY: "WORK_ENTRY",
    TRAIN: "TRAIN",
    SOCIALIZE: "SOCIALIZE"
};

export const ACTIONS_CATALOG = {
    [ACTION_TYPES.SLEEP]: {
        id: ACTION_TYPES.SLEEP,
        name: "Dormir / Descansar",
        description: "Recupera energía y salud gradualmente.",
        minGameMinutes: 60,
        maxGameMinutes: 480,
        costPerMinute: 0,
        effectsPerMinute: {
            health: +0.05,
            energy: +0.25,
            mood: +0.02
        },
        xpGain: { skill: null, xpPerMinute: 0 }
    },
    [ACTION_TYPES.EAT]: {
        id: ACTION_TYPES.EAT,
        name: "Cocinar / Comer",
        description: "Restaura salud y ánimo a cambio de un coste de suministros.",
        minGameMinutes: 15,
        maxGameMinutes: 60,
        costPerMinute: 0.5, // ~30€ por 1 hora de comida
        effectsPerMinute: {
            health: +0.2,
            energy: +0.1,
            mood: +0.15
        },
        xpGain: { skill: "cooking", xpPerMinute: 0.5 }
    },
    [ACTION_TYPES.WORK_ENTRY]: {
        id: ACTION_TYPES.WORK_ENTRY,
        name: "Trabajo No Cualificado",
        description: "Genera dinero a costa de energía y salud.",
        minGameMinutes: 60,
        maxGameMinutes: 480,
        costPerMinute: 0,
        moneyGainPerMinute: 0.25, // 15€/hora nivel base
        effectsPerMinute: {
            health: -0.02,
            energy: -0.2,
            mood: -0.05
        },
        xpGain: { skill: "working", xpPerMinute: 0.8 }
    },
    [ACTION_TYPES.TRAIN]: {
        id: ACTION_TYPES.TRAIN,
        name: "Entrenar en el Gimnasio",
        description: "Aumenta la salud y disciplina reduciendo energía.",
        minGameMinutes: 30,
        maxGameMinutes: 120,
        costPerMinute: 0.2, // Coste de pase/equipamiento
        effectsPerMinute: {
            health: +0.15,
            energy: -0.25,
            mood: +0.1
        },
        xpGain: { skill: "training", xpPerMinute: 1.0 }
    },
    [ACTION_TYPES.SOCIALIZE]: {
        id: ACTION_TYPES.SOCIALIZE,
        name: "Socializar en el Centro",
        description: "Aumenta significativamente el ánimo y mejora tus dotes de comunicación.",
        minGameMinutes: 30,
        maxGameMinutes: 180,
        costPerMinute: 0.3,
        effectsPerMinute: {
            health: 0,
            energy: -0.1,
            mood: +0.3
        },
        xpGain: { skill: "talking", xpPerMinute: 0.7 }
    }
};