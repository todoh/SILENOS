/* SILENOS 3/config.js */

const APPS = [
    {
        id: 'wikipedia',
        title: 'Wikipedia',
        icon: 'book-open',
        url: 'https://www.wikipedia.org',
        type: 'iframe',
        color: 'text-gray-700'
    },
    {
        id: 'silenos',
        title: 'Silenos.es',
        icon: 'globe',
        url: 'https://silenos.es',
        type: 'iframe',
        color: 'text-emerald-600'
    },
    {
        id: 'storage-tool',  // <--- RENOMBRADO A STORAGE
        title: 'Almacenamiento',
        icon: 'hard-drive', // Icono de disco duro
        type: 'custom',     
        color: 'text-indigo-600',
        width: 500,
        height: 600
    },
    {
        id: 'hextris',
        title: 'Hextris',
        icon: 'hexagon', 
        url: 'https://hextris.io/',
        type: 'iframe',
        color: 'text-yellow-500',
        width: 600,
        height: 650
    },
    {
        id: 'pacman',
        title: 'Pac-Man',
        icon: 'ghost',
        url: 'https://masonicgit.github.io/pacman/',
        type: 'iframe',
        color: 'text-yellow-400',
        width: 450,
        height: 520
    }
];

// --- ESTADO GLOBAL DEL SISTEMA ---
let openWindows = [];
let zIndexCounter = 100;