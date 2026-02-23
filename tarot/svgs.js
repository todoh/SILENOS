// Ilustraciones vectoriales místicas para los 22 Arcanos Mayores
// Estilo: Geometría Sagrada, líneas dinámicas, misticismo.
// Sugerencia CSS: Usa "color: #tu-color" y ajusta el tamaño. Los trazos escalarán perfectamente.

const TAROT_SVGS = {
    "El Loco": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="50" r="45" stroke-width="0.5" stroke-opacity="0.3"/>
        <path d="M20 90 Q 40 70, 60 90" stroke-width="2"/>
        <path d="M55 25 C 70 10, 90 30, 75 45" stroke-width="2"/>
        <circle cx="80" cy="20" r="8" stroke-width="1.5"/>
        <path d="M40 70 L50 35 L30 25 M50 35 L65 30" stroke-width="2"/>
        <path d="M10 50 Q 30 40, 50 60 T 90 40" stroke-width="1" stroke-dasharray="3 3"/>
    </svg>`,

    "El Mago": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="50" r="40" stroke-width="0.5" stroke-opacity="0.4"/>
        <path d="M35 15 C 20 10, 20 30, 35 25 C 50 20, 50 40, 65 35 C 80 30, 80 10, 65 15 C 50 20, 50 0, 35 15 Z" stroke-width="2"/>
        <path d="M50 35 L50 10 M50 65 L50 90" stroke-width="2.5"/>
        <path d="M20 65 L80 65 M30 65 L30 95 M70 65 L70 95" stroke-width="1.5"/>
        <circle cx="30" cy="55" r="4" stroke-width="1.5"/>
        <path d="M45 50 L50 60 L55 50 Z M70 50 L65 60 L75 60 Z" stroke-width="1.5"/>
    </svg>`,

    "La Sacerdotisa": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M25 90 L25 30 M75 90 L75 30" stroke-width="4"/>
        <path d="M15 30 L35 30 M65 30 L85 30 M15 90 L35 90 M65 90 L85 90" stroke-width="2"/>
        <path d="M35 60 A 15 15 0 0 0 65 60 A 15 15 0 0 0 35 60" stroke-width="1.5"/>
        <path d="M40 60 A 10 10 0 0 1 60 60" stroke-width="1.5"/>
        <circle cx="50" cy="25" r="10" stroke-width="2"/>
        <path d="M35 25 A 15 15 0 0 0 30 15 M65 25 A 15 15 0 0 1 70 15" stroke-width="2"/>
        <path d="M35 90 Q 50 70, 65 90" stroke-width="1" stroke-dasharray="2 2"/>
    </svg>`,

    "La Emperatriz": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 80 Q 50 40, 80 80 Q 50 100, 20 80 Z" stroke-width="1" stroke-opacity="0.5"/>
        <circle cx="50" cy="35" r="15" stroke-width="2"/>
        <path d="M50 50 L50 90 M35 65 L65 65" stroke-width="2.5"/>
        <path d="M20 25 L30 15 L40 25 L50 10 L60 25 L70 15 L80 25" stroke-width="1.5"/>
        <path d="M10 90 C 30 70, 20 50, 40 40 M90 90 C 70 70, 80 50, 60 40" stroke-width="1"/>
    </svg>`,

    "El Emperador": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 90 L30 50 L50 70 L70 50 L90 90" stroke-width="1" stroke-opacity="0.4"/>
        <rect x="30" y="30" width="40" height="60" stroke-width="2"/>
        <path d="M20 30 L80 30 M40 30 L40 10 L60 10 L60 30" stroke-width="2"/>
        <circle cx="50" cy="45" r="8" stroke-width="1.5"/>
        <path d="M50 53 L50 80" stroke-width="1.5"/>
        <path d="M30 40 C 15 30, 15 50, 30 50 M70 40 C 85 30, 85 50, 70 50" stroke-width="2"/>
    </svg>`,

    "El Hierofante": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M50 10 L50 80 M35 30 L65 30 M40 50 L60 50 M45 70 L55 70" stroke-width="2.5"/>
        <path d="M20 90 L20 40 M80 90 L80 40" stroke-width="2"/>
        <path d="M30 90 L40 75 L50 90 L60 75 L70 90" stroke-width="1.5"/>
        <circle cx="50" cy="10" r="4" stroke-width="2"/>
        <path d="M40 20 L50 5 L60 20" stroke-width="1"/>
    </svg>`,

    "Los Enamorados": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M50 80 C 30 80, 10 50, 25 30 C 35 15, 50 25, 50 40 C 50 25, 65 15, 75 30 C 90 50, 70 80, 50 80 Z" stroke-width="1.5"/>
        <circle cx="50" cy="20" r="10" stroke-width="2"/>
        <path d="M50 30 L50 60 M30 70 C 40 50, 60 50, 70 70" stroke-width="2"/>
        <path d="M10 20 C 30 10, 40 20, 50 10 C 60 20, 70 10, 90 20" stroke-width="1" stroke-dasharray="4 4"/>
    </svg>`,

    "El Carro": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect x="25" y="45" width="50" height="25" stroke-width="2"/>
        <path d="M25 45 L15 15 L85 15 L75 45" stroke-width="1.5"/>
        <circle cx="35" cy="75" r="12" stroke-width="2"/>
        <circle cx="65" cy="75" r="12" stroke-width="2"/>
        <path d="M35 75 L65 75 M50 45 L50 25 M40 15 L50 5 L60 15" stroke-width="2"/>
        <path d="M15 85 L25 75 M85 85 L75 75" stroke-width="1.5"/>
    </svg>`,

    "La Fuerza": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M35 25 C 20 20, 20 40, 35 35 C 50 30, 50 50, 65 45 C 80 40, 80 20, 65 25 C 50 30, 50 10, 35 25 Z" stroke-width="1.5"/>
        <path d="M20 70 Q 30 50, 50 70 T 80 70" stroke-width="2"/>
        <path d="M50 40 L40 60 M50 40 L60 60" stroke-width="2"/>
        <path d="M30 60 Q 50 90, 70 60" stroke-width="2"/>
        <path d="M10 50 C 20 40, 30 80, 40 50 C 50 80, 60 40, 70 50 C 80 80, 90 40, 100 50" stroke-width="0.5" stroke-opacity="0.5"/>
    </svg>`,

    "El Ermitaño": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 90 L45 30 L55 30 L60 90" stroke-width="2"/>
        <circle cx="50" cy="50" r="45" stroke-width="0.5" stroke-opacity="0.3" stroke-dasharray="2 4"/>
        <path d="M70 30 L70 90" stroke-width="2.5"/>
        <polygon points="30,40 35,50 25,50" stroke-width="1.5"/>
        <polygon points="30,55 35,45 25,45" stroke-width="1.5"/>
        <path d="M10 90 L30 70 L50 90 L70 70 L90 90" stroke-width="1" stroke-opacity="0.5"/>
    </svg>`,

    "Rueda de la Fortuna": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="50" r="35" stroke-width="2"/>
        <circle cx="50" cy="50" r="25" stroke-width="1.5"/>
        <path d="M50 15 L50 85 M15 50 L85 50 M25 25 L75 75 M25 75 L75 25" stroke-width="1.5"/>
        <path d="M10 50 L30 40 L30 60 Z M90 50 L70 40 L70 60 Z" stroke-width="1"/>
        <circle cx="50" cy="50" r="6" stroke-width="2"/>
        <circle cx="50" cy="50" r="40" stroke-width="0.5" stroke-dasharray="4 4"/>
    </svg>`,

    "La Justicia": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <rect x="15" y="15" width="70" height="70" stroke-width="0.5" stroke-opacity="0.4"/>
        <path d="M50 10 L50 90 M40 80 L60 80" stroke-width="2.5"/>
        <path d="M45 20 L50 10 L55 20 Z" stroke-width="1.5"/>
        <path d="M20 30 L80 30" stroke-width="2"/>
        <path d="M20 30 L10 50 L30 50 Z M80 30 L70 50 L90 50 Z" stroke-width="1.5"/>
        <circle cx="50" cy="50" r="10" stroke-width="1"/>
    </svg>`,

    "El Colgado": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 15 L80 15 M70 15 L70 90" stroke-width="2.5"/>
        <path d="M50 15 L50 40" stroke-width="1.5" stroke-dasharray="4 2"/>
        <circle cx="50" cy="55" r="12" stroke-width="1.5"/>
        <circle cx="50" cy="55" r="20" stroke-width="0.5" stroke-dasharray="3 3"/>
        <path d="M50 67 L50 90 L35 75 M50 75 L65 85" stroke-width="2"/>
    </svg>`,

    "La Muerte": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="60" r="35" stroke-width="0.5" stroke-opacity="0.4"/>
        <path d="M15 85 L85 15" stroke-width="2.5"/>
        <path d="M85 15 C 60 10, 40 30, 30 50" stroke-width="2"/>
        <path d="M35 30 A 12 12 0 1 1 55 45 L 45 50 Z" stroke-width="1.5"/>
        <path d="M10 80 Q 50 70, 90 80" stroke-width="2"/>
        <path d="M70 80 A 20 20 0 0 1 100 60" stroke-width="1"/>
        <line x1="75" y1="70" x2="85" y2="60" stroke-width="1"/>
    </svg>`,

    "La Templanza": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="50,30 65,55 35,55" stroke-width="1.5"/>
        <path d="M50 55 L50 90" stroke-width="2"/>
        <path d="M25 40 Q 50 60, 25 80 M75 40 Q 50 60, 75 80" stroke-width="1.5"/>
        <path d="M30 45 C 50 30, 50 60, 70 45" stroke-width="1" stroke-dasharray="2 2"/>
        <path d="M20 20 Q 35 10, 50 25 Q 65 10, 80 20" stroke-width="1.5"/>
        <circle cx="50" cy="15" r="6" stroke-width="1.5"/>
    </svg>`,

    "El Diablo": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="50,60 35,30 65,30" stroke-width="1.5"/>
        <polygon points="50,20 35,50 65,50" stroke-width="1.5"/>
        <path d="M35 30 L10 10 M65 30 L90 10" stroke-width="2"/>
        <path d="M50 60 L50 90 M50 90 L30 80 M50 90 L70 80" stroke-width="2"/>
        <circle cx="30" cy="80" r="5" stroke-width="1.5"/>
        <circle cx="70" cy="80" r="5" stroke-width="1.5"/>
        <path d="M30 75 Q 50 60, 70 75" stroke-width="1" stroke-dasharray="3 3"/>
    </svg>`,

    "La Torre": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 95 L30 40 L70 40 L70 95" stroke-width="2"/>
        <path d="M20 40 L80 40 L75 30 L25 30 Z" stroke-width="1.5"/>
        <path d="M55 0 L45 15 L60 25 L40 45 L50 60" stroke-width="2" stroke="gold"/>
        <path d="M35 15 L35 25 M45 10 L45 20 M65 15 L65 25" stroke-width="1"/>
        <path d="M25 50 L40 65 M75 60 L60 75 M30 80 L50 95" stroke-width="1" stroke-opacity="0.5"/>
        <circle cx="50" cy="50" r="45" stroke-width="0.5" stroke-opacity="0.2"/>
    </svg>`,

    "La Estrella": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M50 15 L55 35 L75 40 L55 45 L50 65 L45 45 L25 40 L45 35 Z" stroke-width="1.5"/>
        <circle cx="20" cy="20" r="2" stroke-width="1"/><circle cx="80" cy="20" r="2" stroke-width="1"/>
        <circle cx="30" cy="15" r="1.5" stroke-width="1"/><circle cx="70" cy="15" r="1.5" stroke-width="1"/>
        <circle cx="15" cy="40" r="1.5" stroke-width="1"/><circle cx="85" cy="40" r="1.5" stroke-width="1"/>
        <circle cx="50" cy="5" r="2" stroke-width="1"/>
        <path d="M50 65 Q 30 80, 20 95 M50 65 Q 70 80, 80 95" stroke-width="1.5"/>
        <path d="M10 85 Q 20 95, 30 85 T 50 85" stroke-width="1" stroke-opacity="0.6"/>
    </svg>`,

    "La Luna": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M50 15 A 25 25 0 1 0 75 40 A 20 20 0 1 1 50 15 Z" stroke-width="2"/>
        <path d="M15 90 L15 50 L25 50 L25 90 M75 90 L75 50 L85 50 L85 90" stroke-width="1.5"/>
        <path d="M10 90 Q 50 70, 90 90 M20 95 Q 50 75, 80 95" stroke-width="1" stroke-opacity="0.6"/>
        <path d="M35 55 L35 65 M65 55 L65 65 M40 45 L40 50 M60 45 L60 50" stroke-width="1" stroke-dasharray="2 2"/>
        <circle cx="50" cy="40" r="35" stroke-width="0.5" stroke-opacity="0.2"/>
    </svg>`,

    "El Sol": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="50" cy="40" r="18" stroke-width="2"/>
        <circle cx="45" cy="35" r="2" fill="currentColor"/><circle cx="55" cy="35" r="2" fill="currentColor"/>
        <path d="M45 45 Q 50 50, 55 45" stroke-width="1.5"/>
        <path d="M50 10 L50 20 M50 60 L50 70 M20 40 L30 40 M70 40 L80 40" stroke-width="2"/>
        <path d="M28 18 Q 35 25, 35 28 M72 18 Q 65 25, 65 28 M28 62 Q 35 55, 35 52 M72 62 Q 65 55, 65 52" stroke-width="1.5"/>
        <path d="M10 90 Q 50 70, 90 90" stroke-width="2"/>
        <path d="M30 80 L70 80" stroke-width="1"/>
    </svg>`,

    "El Juicio": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M80 15 L50 40 L50 35 L20 15 L40 50 L30 50 L50 85 Z" stroke-width="1.5"/>
        <rect x="55" y="20" width="15" height="15" stroke-width="1.5"/>
        <line x1="62.5" y1="20" x2="62.5" y2="35" stroke-width="1.5"/>
        <line x1="55" y1="27.5" x2="70" y2="27.5" stroke-width="1.5"/>
        <path d="M30 95 L70 95 L70 75 L30 75 Z" stroke-width="2"/>
        <path d="M40 75 L40 65 C 40 55, 60 55, 60 65 L60 75" stroke-width="1.5"/>
        <path d="M50 40 C 30 50, 30 70, 50 80 C 70 70, 70 50, 50 40 Z" stroke-width="0.5" stroke-opacity="0.3"/>
    </svg>`,

    "El Mundo": `<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="50" cy="50" rx="25" ry="40" stroke-width="2"/>
        <ellipse cx="50" cy="50" rx="20" ry="35" stroke-width="0.5" stroke-dasharray="4 4"/>
        <path d="M50 20 Q 70 50, 50 80 Q 30 50, 50 20 Z" stroke-width="1.5"/>
        <circle cx="15" cy="15" r="6" stroke-width="1.5"/>
        <circle cx="85" cy="15" r="6" stroke-width="1.5"/>
        <circle cx="15" cy="85" r="6" stroke-width="1.5"/>
        <circle cx="85" cy="85" r="6" stroke-width="1.5"/>
        <path d="M40 40 L60 60 M40 60 L60 40" stroke-width="1.5"/>
        <path d="M50 10 L50 5 M50 90 L50 95 M10 50 L5 50 M90 50 L95 50" stroke-width="1"/>
    </svg>`
};