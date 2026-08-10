// js/skillsCatalog.js
// Catálogo de Ramas, Especializaciones y Nodos de Talentos para Maddna City

export const SPECIALIZATIONS_CATALOG = {
    cooking: {
        minSkillLevel: 5,
        branches: {
            CHEF_EXECUTIVE: {
                id: "CHEF_EXECUTIVE",
                name: "Chef Ejecutivo",
                description: "Enfoque en producción comercial, gastronomía de alta gama y rentabilidad.",
                nodes: {
                    COMMERCIAL_BOOST: {
                        id: "COMMERCIAL_BOOST",
                        name: "Cocina Comercial",
                        description: "+30% de ingresos en empresas de hostelería.",
                        maxRank: 1,
                        modifiers: { businessRevenue_cooking: 0.30 }
                    },
                    GOURMET_RECIPES: {
                        id: "GOURMET_RECIPES",
                        name: "Recetas de Autor",
                        description: "+50% de restauración vital al consumir platillos.",
                        maxRank: 1,
                        modifiers: { foodVitalsBonus: 0.50 }
                    }
                }
            },
            BIOHACKER: {
                id: "BIOHACKER",
                name: "Nutricionista / Biohacker",
                description: "Enfoque en optimización metabólica y eficiencia de desgaste de energía.",
                nodes: {
                    METABOLIC_EFFICIENCY: {
                        id: "METABOLIC_EFFICIENCY",
                        name: "Eficiencia Metabólica",
                        description: "Reduce el consumo de energía en un 20% en todas las actividades.",
                        maxRank: 1,
                        modifiers: { energyCostMult: -0.20 }
                    },
                    BUFF_DURATION: {
                        id: "BUFF_DURATION",
                        name: "Sustancia de Retardo",
                        description: "Duplica la duración e impacto de los consumibles y restauraciones.",
                        maxRank: 1,
                        modifiers: { buffDurationMult: 1.0 }
                    }
                }
            }
        }
    },
    working: {
        minSkillLevel: 5,
        branches: {
            TYCOON: {
                id: "TYCOON",
                name: "Magnate Financiero",
                description: "Enfoque en rentas inmobiliarias, optimización fiscal y caja corporativa.",
                nodes: {
                    TAX_CUT: {
                        id: "TAX_CUT",
                        name: "Optimización Fiscal",
                        description: "Reducción del 25% en alquileres e impuestos de propiedades.",
                        maxRank: 1,
                        modifiers: { rentCostMult: -0.25 }
                    },
                    VAULT_BONUS: {
                        id: "VAULT_BONUS",
                        name: "Inversión Pasiva",
                        description: "+15% de rendimientos adicionales en cajas fuertes corporativas.",
                        maxRank: 1,
                        modifiers: { vaultYieldBonus: 0.15 }
                    }
                }
            },
            SYSTEMS_ENGINEER: {
                id: "SYSTEMS_ENGINEER",
                name: "Ingeniero de Sistemas",
                description: "Enfoque en logística, automatización de tareas y operaciones.",
                nodes: {
                    QUEUE_EXPAND: {
                        id: "QUEUE_EXPAND",
                        name: "Procesamiento Paralelo",
                        description: "Permite ampliar la cola de acciones de 5 a 8 actividades.",
                        maxRank: 1,
                        modifiers: { maxQueueBonus: 3 }
                    },
                    LOW_MAINTENANCE: {
                        id: "LOW_MAINTENANCE",
                        name: "Mantenimiento Eficiente",
                        description: "-20% en costes operativos de empresas.",
                        maxRank: 1,
                        modifiers: { bizMaintenanceMult: -0.20 }
                    }
                }
            }
        }
    },
    talking: {
        minSkillLevel: 5,
        branches: {
            POLITICIAN: {
                id: "POLITICIAN",
                name: "Político / Portavoz",
                description: "Enfoque en poder político, liderazgo de opinión e influencia pública.",
                nodes: {
                    INFLUENCE_MULT: {
                        id: "INFLUENCE_MULT",
                        name: "Oratoria de Masas",
                        description: "Multiplica x2 la ganancia de Influencia en actividades.",
                        maxRank: 1,
                        modifiers: { influenceGainMult: 1.0 }
                    }
                }
            },
            NEGOTIATOR: {
                id: "NEGOTIATOR",
                name: "Negociador Audaz",
                description: "Enfoque en regateo, descuentos comerciales y reputación de redes.",
                nodes: {
                    MARKET_DISCOUNT: {
                        id: "MARKET_DISCOUNT",
                        name: "Red de Contactos",
                        description: "Descuento del 15% en compras de bienes del mercado e inmuebles.",
                        maxRank: 1,
                        modifiers: { purchaseDiscount: 0.15 }
                    },
                    NET_REPUTATION: {
                        id: "NET_REPUTATION",
                        name: "Campaña Viral",
                        description: "+50% de reputación obtenida mediante interacciones públicas.",
                        maxRank: 1,
                        modifiers: { repGainMult: 0.50 }
                    }
                }
            }
        }
    },
    training: {
        minSkillLevel: 5,
        branches: {
            ELITE_ATHLETE: {
                id: "ELITE_ATHLETE",
                name: "Atleta de Elite",
                description: "Enfoque en resistencia muscular, capacidad pulmonar y prevención de colapso.",
                nodes: {
                    HEALTH_MAX_BOOST: {
                        id: "HEALTH_MAX_BOOST",
                        name: "Acondicionamiento Extremo",
                        description: "La Salud Máxima aumenta a 150 puntos.",
                        maxRank: 1,
                        modifiers: { maxHealthBonus: 50 }
                    },
                    COLLAPSE_SHIELD: {
                        id: "COLLAPSE_SHIELD",
                        name: "Tolerancia al Shock",
                        description: "Reduce al 50% las pérdidas monetarias y secuelas por colapso.",
                        maxRank: 1,
                        modifiers: { collapsePenaltyRed: 0.50 }
                    }
                }
            },
            INSTRUCTOR: {
                id: "INSTRUCTOR",
                name: "Instructor / Mentor",
                description: "Enfoque en aprendizaje acelerado e imagen deportiva pública.",
                nodes: {
                    TRAINING_XP_BOOST: {
                        id: "TRAINING_XP_BOOST",
                        name: "Metodología Avanzada",
                        description: "+50% de XP ganada al realizar actividades de entrenamiento.",
                        maxRank: 1,
                        modifiers: { xpGain_training: 0.50 }
                    }
                }
            }
        }
    }
};