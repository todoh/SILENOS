/* SILENOS 3/config.js */

const APPS = [
    {
        id: 'local-chat',
        title: 'Llama 3.2 Local',
        icon: 'cpu', 
        type: 'custom',
        color: 'text-blue-600',
        width: 800,
        height: 600
    },
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
        id: 'storage-tool',
        title: 'Almacenamiento',
        icon: 'hard-drive',
        type: 'custom',     
        color: 'text-indigo-600',
        width: 500,
        height: 600
    },
    {
        id: '3d-viewer', // <--- APP REGISTRADA CORRECTAMENTE
        title: 'Visor 3D',
        icon: 'box', 
        type: 'custom',     
        color: 'text-orange-500',
        width: 900,
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