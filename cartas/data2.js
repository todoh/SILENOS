// --- PAQUETE DE EXPANSIÓN DE CARTAS (DATA 2) ---

// NOTA: Reemplaza las rutas "img/..." con la ubicación real de tus archivos PNG.

const EXTRA_CARDS = [
    { 
        id: 11, name: "Ninja del Viento", cost: 20, 
        power: 2,       
        strength: 40,   
        intelligence: 30, 
        maxHp: 200,
        image: "img/ninja_viento.jpg", 
        desc: "Velocidad invisible.",
        types: ["Viento", "Asesino", "Humano"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 12, name: "Yeti de la Tundra", cost: 30, 
        power: 2, 
        strength: 70,   
        intelligence: 10, 
        maxHp: 450,
        image: "img/yeti.jpg", 
        desc: "Abominable fuerza bruta.",
        types: ["Hielo", "Guerrero", "Bestia"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." }
        ]
    },
    { 
        id: 13, name: "Sacerdotisa Lunar", cost: 40, 
        power: 1, 
        strength: 25,   
        intelligence: 80, 
        maxHp: 250,
        image: "img/sacerdotisa.jpg", 
        desc: "Luz en la oscuridad.",
        types: ["Luz", "Soporte", "Elfo"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'meditate', name: "Bendición", type: "preparation", cost: 15, desc: "Cura 50 HP." }
        ]
    },
    { 
        id: 14, name: "Rey Esqueleto", cost: 60, 
        power: 3,       
        strength: 80, 
        intelligence: 50, 
        maxHp: 650,
        image: "img/rey_esqueleto.jpg", 
        desc: "El trono de huesos espera.",
        types: ["Oscuridad", "Guerrero", "No-Muerto"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'grow', name: "Mando", type: "preparation", cost: 20, desc: "+10 a todo." }
        ]
    },
    { 
        id: 15, name: "Leviatán", cost: 80, 
        power: 5,       
        strength: 100,  
        intelligence: 40, 
        maxHp: 900,
        image: "img/leviatan.jpg", 
        desc: "Terror de las profundidades.",
        types: ["Agua", "Dragón", "Bestia"],
        abilities: [
            { id: 'atk', name: "ATACAR", type: "interaction", cost: 0, desc: "Suma stats y ataca." },
            { id: 'def', name: "DEFENDER", type: "response", cost: 0, desc: "Bloquea un ataque entrante." },
            { id: 'breath', name: "Maremoto", type: "interaction", cost: 30, desc: "Daña sin contacto." }
        ]
    }
];