/* -------------------------------------------------------------------------- */
/*                         DEFINICIÓN DE TIPOS E ELEMENTOS                     */
/* -------------------------------------------------------------------------- */

const CARD_TYPES = {
    ATTACK: { id: 'ATTACK', name: 'Ataque', emoji: '⚔️', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    DEFENSE: { id: 'DEFENSE', name: 'Defensa', emoji: '🛡️', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    HEAL: { id: 'HEAL', name: 'Curación', emoji: '💚', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    BOOST: { id: 'BOOST', name: 'Potenciador', emoji: '⚡', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    DRAIN: { id: 'DRAIN', name: 'Drenaje', emoji: '🩸', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    STATUS: { id: 'STATUS', name: 'Estado', emoji: '✨', color: 'text-violet-600 bg-violet-50 border-violet-200' },
    ENTITY: { id: 'ENTITY', name: 'Entidad', emoji: '👾', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' }
};

const ELEMENT_CATEGORIES = {
    'Psíquico': { id: 'Psíquico', name: '1. Psíquicos & Mentales (La Psique)', emoji: '🧠' },
    'Sensorial': { id: 'Sensorial', name: '2. Perceptivos & Sensoriales (Los Sentidos)', emoji: '👁️' },
    'Físico': { id: 'Físico', name: '3. Clásicos & Físicos (La Materia)', emoji: '🪨' },
    'Biológico': { id: 'Biológico', name: '4. Biológicos & Orgánicos (La Vida)', emoji: '🌿' },
    'Energético': { id: 'Energético', name: '5. Energéticos & Radiales (La Luz y la Oscuridad)', emoji: '✨' },
    'Cósmico': { id: 'Cósmico', name: '6. Cósmicos & Espacio-Temporales (El Universo)', emoji: '🌌' },
    'Místico': { id: 'Místico', name: '7. Místicos & Espirituales (El Alma)', emoji: '🔮' },
    'Sintético': { id: 'Sintético', name: '8. Sintéticos & Caóticos (Lo Artificial y lo Abstruso)', emoji: '🤖' }
};

const ELEMENT_INFO = {
    // 1. Psíquicos & Mentales (La Psique)
    MENTE: { name: 'Mente', emoji: '🧠', category: 'Psíquico' },
    SUENO: { name: 'Sueño', emoji: '🌙', category: 'Psíquico' },
    PESADILLA: { name: 'Pesadilla', emoji: '👁️', category: 'Psíquico' },
    PSICODELIA: { name: 'Psicodelia', emoji: '🌀', category: 'Psíquico' },
    AMNESIA: { name: 'Amnesia', emoji: '🌫️', category: 'Psíquico' },
    HIPNOSIS: { name: 'Hipnosis', emoji: '💫', category: 'Psíquico' },
    LUCIDEZ: { name: 'Lucidez', emoji: '💡', category: 'Psíquico' },
    TRAUMA: { name: 'Trauma', emoji: '⚡', category: 'Psíquico' },

    // 2. Perceptivos & Sensoriales (Los Sentidos)
    SINESTESIA: { name: 'Sinestesia', emoji: '🎨', category: 'Sensorial' },
    TRANCE: { name: 'Trance', emoji: '🔮', category: 'Sensorial' },
    FRENESI: { name: 'Frenesí', emoji: '🔥', category: 'Sensorial' },
    VERTIGO: { name: 'Vértigo', emoji: '💫', category: 'Sensorial' },
    DELIRIO: { name: 'Delirio', emoji: '🌀', category: 'Sensorial' },
    EXTASIS: { name: 'Éxtasis', emoji: '✨', category: 'Sensorial' },
    EGO: { name: 'Ego', emoji: '👑', category: 'Sensorial' },
    CATARSIS: { name: 'Catarsis', emoji: '💥', category: 'Sensorial' },

    // 3. Clásicos & Físicos (La Materia)
    FIRE: { name: 'Fuego', emoji: '🔥', category: 'Físico' },
    WATER: { name: 'Agua', emoji: '💧', category: 'Físico' },
    EARTH: { name: 'Tierra', emoji: '🪨', category: 'Físico' },
    AIR: { name: 'Aire', emoji: '🌪️', category: 'Físico' },
    RAYO: { name: 'Rayo', emoji: '⚡', category: 'Físico' },
    ICE: { name: 'Hielo', emoji: '❄️', category: 'Físico' },
    METAL: { name: 'Metal', emoji: '⚙️', category: 'Físico' },
    MAGMA: { name: 'Magma', emoji: '🌋', category: 'Físico' },

    // 4. Biológicos & Orgánicos (La Vida)
    PLANT: { name: 'Planta', emoji: '🌿', category: 'Biológico' },
    POISON: { name: 'Veneno', emoji: '☠️', category: 'Biológico' },
    ESPORA: { name: 'Espora', emoji: '🍄', category: 'Biológico' },
    SANGRE: { name: 'Sangre', emoji: '🩸', category: 'Biológico' },
    HUESO: { name: 'Hueso', emoji: '🦴', category: 'Biológico' },
    SAVIA: { name: 'Savia', emoji: '🌱', category: 'Biológico' },
    PESTE: { name: 'Peste', emoji: '☣️', category: 'Biológico' },
    CARNE: { name: 'Carne', emoji: '🥩', category: 'Biológico' },

    // 5. Energéticos & Radiales (La Luz y la Oscuridad)
    LIGHT: { name: 'Luz', emoji: '☀️', category: 'Energético' },
    SHADOW: { name: 'Sombra', emoji: '🌑', category: 'Energético' },
    ESPECTRO: { name: 'Espectro', emoji: '🌈', category: 'Energético' },
    CEGUERA: { name: 'Ceguera', emoji: '🙈', category: 'Energético' },
    AURA: { name: 'Aura', emoji: '✨', category: 'Energético' },
    RADIATION: { name: 'Radiación', emoji: '☢️', category: 'Energético' },
    ETER: { name: 'Éter', emoji: '✨', category: 'Energético' },
    VACIO: { name: 'Vacío', emoji: '🕳️', category: 'Energético' },

    // 6. Cósmicos & Espacio-Temporales (El Universo)
    TIEMPO: { name: 'Tiempo', emoji: '⏳', category: 'Cósmico' },
    GRAVEDAD: { name: 'Gravedad', emoji: '🌌', category: 'Cósmico' },
    ESPACIO: { name: 'Espacio', emoji: '🪐', category: 'Cósmico' },
    ESTELAR: { name: 'Estelar', emoji: '⭐', category: 'Cósmico' },
    SINGULARIDAD: { name: 'Singularidad', emoji: '🕳️', category: 'Cósmico' },
    MATERIA_OSCURA: { name: 'Materia Oscura', emoji: '🌌', category: 'Cósmico' },
    PLASMA: { name: 'Plasma', emoji: '⚡', category: 'Cósmico' },
    POLVO: { name: 'Polvo', emoji: '✨', category: 'Cósmico' },

    // 7. Místicos & Espirituales (El Alma)
    ALMA: { name: 'Alma', emoji: '👻', category: 'Místico' },
    FANTASMA: { name: 'Fantasma', emoji: '👻', category: 'Místico' },
    KARMA: { name: 'Karma', emoji: '☯️', category: 'Místico' },
    CURSE: { name: 'Maldición', emoji: '📜', category: 'Místico' },
    SACRO: { name: 'Sacro', emoji: '✝️', category: 'Místico' },
    SINIESTRO: { name: 'Siniestro', emoji: '👿', category: 'Místico' },
    NECRO: { name: 'Necro', emoji: '💀', category: 'Místico' },
    RUNA: { name: 'Runa', emoji: '🪨', category: 'Místico' },

    // 8. Sintéticos & Caóticos (Lo Artificial y lo Abstruso)
    CIBER: { name: 'Ciber', emoji: '💻', category: 'Sintético' },
    SONICO: { name: 'Sónico', emoji: '🔊', category: 'Sintético' },
    CRISTAL: { name: 'Cristal', emoji: '💎', category: 'Sintético' },
    GLITCH: { name: 'Glitch', emoji: '👾', category: 'Sintético' },
    CAOS: { name: 'Caos', emoji: '🎲', category: 'Sintético' },
    INERCIA: { name: 'Inercia', emoji: '⚙️', category: 'Sintético' },
    POLIMERO: { name: 'Polímero', emoji: '🧪', category: 'Sintético' },
    NUBE: { name: 'Nube / Humo', emoji: '☁️', category: 'Sintético' }
};