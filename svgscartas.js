// svgscartas.js

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. HERO SVG: Monolitos flotantes, grilla de datos y texto brutalista
    const heroContainer = document.getElementById("hero-svg-container");
    if (heroContainer) {
        heroContainer.innerHTML = `
        <svg viewBox="0 0 800 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
            <style>
                @keyframes float-center { 
                    0%, 100% { transform: translateY(0px) rotate(0deg); } 
                    50% { transform: translateY(-15px) rotate(1deg); } 
                }
                @keyframes float-left { 
                    0%, 100% { transform: translate(-60px, 20px) rotate(-12deg); } 
                    50% { transform: translate(-65px, 5px) rotate(-14deg); } 
                }
                @keyframes float-right { 
                    0%, 100% { transform: translate(60px, -20px) rotate(12deg); } 
                    50% { transform: translate(65px, -35px) rotate(14deg); } 
                }
                @keyframes glitch {
                    0%, 100% { opacity: 1; }
                    92% { opacity: 1; }
                    94% { opacity: 0; }
                    96% { opacity: 1; transform: translateX(5px); }
                    98% { opacity: 0; }
                }
                @keyframes scanline {
                    0% { transform: translateY(-600px); }
                    100% { transform: translateY(600px); }
                }
                .wire-card { fill: rgba(0,0,0,0.8); stroke-width: 1.5; backdrop-filter: blur(4px); }
                .wire-center { stroke: white; animation: float-center 14s ease-in-out infinite; }
                .wire-left { stroke: rgb(131, 33, 33); animation: float-left 18s ease-in-out infinite; }
                .wire-right { stroke: rgba(255,255,255,0.3); animation: float-right 22s ease-in-out infinite; }
                .brutal-txt { font-family: monospace; fill: rgba(255,255,255,0.6); font-size: 12px; letter-spacing: 2px; }
                .glitch-txt { animation: glitch 8s infinite; font-weight: bold; fill: white; font-size: 18px; }
            </style>

            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            <rect width="100%" height="2" fill="rgba(131,33,33,0.3)">
                <animateTransform attributeName="transform" type="translate" from="0 -100" to="0 700" dur="8s" repeatCount="indefinite"/>
            </rect>

            <text x="30" y="40" class="brutal-txt">SYS_LOCKED // 0x88A1</text>
            <text x="30" y="60" class="brutal-txt">INIT_SEQ: STANDBY</text>
            <text x="30" y="560" class="brutal-txt glitch-txt">EXTRACTING KOREH LORE...</text>
            
            <text x="760" y="40" class="brutal-txt" text-anchor="end">ATK_DEF_MATRIX_ONLINE</text>
            <text x="760" y="560" class="brutal-txt" text-anchor="end" style="fill: rgb(131,33,33);">[ ENGAGE ]</text>

            <g transform="translate(400, 300)">
                <rect class="wire-card wire-left" x="-100" y="-150" width="200" height="300" rx="4"/>
                <rect class="wire-card wire-right" x="-100" y="-150" width="200" height="300" rx="4"/>
                <rect class="wire-card wire-center" x="-100" y="-150" width="200" height="300" rx="4"/>
                
                <circle cx="0" cy="0" r="45" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1" stroke-dasharray="2 6">
                    <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="30s" repeatCount="indefinite" />
                </circle>
                <circle cx="0" cy="0" r="30" fill="none" stroke="rgb(131, 33, 33)" stroke-width="2" stroke-dasharray="20 10">
                    <animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="15s" repeatCount="indefinite" />
                </circle>
            </g>
        </svg>`;
    }

    // 2. GUÍA DE JUEGO (Pasos 1, 2 y 3)
    const step1 = document.getElementById("svg-step-1");
    if (step1) {
        step1.innerHTML = `
        <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <style>
                @keyframes upload { 0% { transform: translateY(20px); opacity: 0; } 20% { opacity: 1; } 80% { transform: translateY(-20px); opacity: 1; } 100% { transform: translateY(-40px); opacity: 0; } }
            </style>
            <rect x="70" y="60" width="60" height="80" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" stroke-dasharray="4 4" />
            <g style="animation: upload 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;">
                <rect x="75" y="65" width="50" height="70" fill="white" />
                <rect x="85" y="75" width="30" height="30" fill="black" />
            </g>
            <path d="M 100 20 L 100 40 M 90 30 L 100 20 L 110 30" fill="none" stroke="white" stroke-width="2" />
        </svg>`;
    }

    const step2 = document.getElementById("svg-step-2");
    if (step2) {
        step2.innerHTML = `
        <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <style>
                @keyframes clash { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                @keyframes flash-red { 0%, 100% { fill: white; } 50% { fill: rgb(131,33,33); } }
            </style>
            <path d="M 60 40 L 140 120 M 140 40 L 60 120" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="4" />
            <circle cx="100" cy="80" r="15" fill="black" stroke="white" stroke-width="3" style="animation: clash 2s infinite;" />
            <text x="100" y="85" font-family="monospace" font-size="14" text-anchor="middle" font-weight="bold" style="animation: flash-red 2s infinite;">X</text>
        </svg>`;
    }

    const step3 = document.getElementById("svg-step-3");
    if (step3) {
        step3.innerHTML = `
        <svg viewBox="0 0 200 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <style>
                @keyframes pulse-link { 0%, 100% { stroke-opacity: 0.2; } 50% { stroke-opacity: 1; } }
                @keyframes spin-slow { 100% { transform: rotate(360deg); } }
            </style>
            <g transform="translate(100, 80) scale(0.8)">
                <g style="animation: spin-slow 10s linear infinite; transform-origin: 0 0;">
                    <polygon points="0,-40 34,20 -34,20" fill="none" stroke="white" stroke-width="2" />
                    <circle cx="0" cy="-40" r="6" fill="rgb(131,33,33)" />
                    <circle cx="34" cy="20" r="6" fill="white" />
                    <circle cx="-34" cy="20" r="6" fill="white" />
                </g>
                <circle cx="0" cy="0" r="60" fill="none" stroke="white" stroke-width="1" style="animation: pulse-link 3s infinite;" />
            </g>
        </svg>`;
    }

    // 3. FACCIONES (Iconos abstractos brutales)
    const factionData = [
        { id: "svg-faction-nigro", paths: `<polygon points="32,10 54,50 10,50" fill="none" stroke="white" stroke-width="3"/><circle cx="32" cy="35" r="8" fill="rgb(131,33,33)"/><path d="M 32 50 L 32 64 M 20 40 L 20 60 M 44 40 L 44 60" stroke="white" stroke-width="2" stroke-dasharray="2 4"/>` },
        { id: "svg-faction-mecha", paths: `<polygon points="32,10 52,20 52,44 32,54 12,44 12,20" fill="none" stroke="white" stroke-width="3"/><rect x="22" y="22" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2" style="transform-origin: 32px 32px; animation: spin-slow 6s linear infinite;"/>` },
        { id: "svg-faction-golem", paths: `<rect x="16" y="16" width="32" height="32" fill="white" /><rect x="10" y="26" width="44" height="12" fill="black" /><rect x="26" y="10" width="12" height="44" fill="black" />` },
        { id: "svg-faction-mago", paths: `<circle cx="32" cy="32" r="22" fill="none" stroke="white" stroke-width="2"/><circle cx="32" cy="32" r="14" fill="none" stroke="white" stroke-width="1" stroke-dasharray="4 4" style="transform-origin: 32px 32px; animation: spin-slow 4s linear infinite;"/><circle cx="32" cy="32" r="4" fill="white" />` }
    ];

    factionData.forEach(fac => {
        const el = document.getElementById(fac.id);
        if (el) {
            el.innerHTML = `
            <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <style>@keyframes spin-slow { 100% { transform: rotate(360deg); } }</style>
                ${fac.paths}
            </svg>`;
        }
    });

    // 4. FONDOS DE CARACTERÍSTICAS (Sutiles y de fondo)
    const renderFeatureBg = (id, svgContent) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
    };
    
    renderFeatureBg("svg-feature-deck", `
        <pattern id="pat-deck" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="18" height="18" fill="none" stroke="white" stroke-width="1"/>
        </pattern>
        <rect width="200" height="200" fill="url(#pat-deck)" />
    `);
    
    renderFeatureBg("svg-feature-ai", `
        <style>@keyframes pulse-ai { 50% { opacity: 0.3; } }</style>
        <circle cx="100" cy="100" r="80" fill="none" stroke="white" stroke-width="2" stroke-dasharray="10 20" style="animation: pulse-ai 4s infinite; transform-origin: center; transform: rotate(45deg);"/>
        <circle cx="100" cy="100" r="40" fill="none" stroke="white" stroke-width="4" stroke-dasharray="5 15"/>
    `);
    
    renderFeatureBg("svg-feature-data", `
        <style>@keyframes bar-grow { 0%, 100% { height: 20px; } 50% { height: 180px; } }</style>
        <rect x="20" y="20" width="30" height="160" fill="white" style="transform-origin: bottom; animation: bar-grow 6s ease-in-out infinite;" />
        <rect x="80" y="80" width="30" height="100" fill="white" style="transform-origin: bottom; animation: bar-grow 8s ease-in-out infinite reverse;" />
        <rect x="140" y="50" width="30" height="130" fill="white" style="transform-origin: bottom; animation: bar-grow 5s ease-in-out infinite;" />
    `);

    // 5. CTA FINAL: Red de nodos extensa y brutal
    const ctaContainer = document.getElementById("svg-cta-bg");
    if (ctaContainer) {
        ctaContainer.innerHTML = `
        <svg viewBox="0 0 1000 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <style>
                @keyframes drift-1 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(40px, -20px); } }
                @keyframes drift-2 { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(-30px, 40px); } }
                @keyframes blink-line { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.8; } }
            </style>
            <g style="animation: drift-1 25s ease-in-out infinite;">
                <circle cx="200" cy="100" r="4" fill="white" />
                <circle cx="800" cy="300" r="6" fill="rgb(131,33,33)" />
                <circle cx="500" cy="50" r="3" fill="white" />
                <line x1="200" y1="100" x2="500" y2="50" stroke="white" stroke-width="1" style="animation: blink-line 7s infinite;" />
                <line x1="500" y1="50" x2="800" y2="300" stroke="white" stroke-width="1" style="animation: blink-line 11s infinite;" />
            </g>
            <g style="animation: drift-2 30s ease-in-out infinite;">
                <circle cx="100" cy="300" r="5" fill="white" />
                <circle cx="600" cy="350" r="4" fill="white" />
                <circle cx="900" cy="100" r="3" fill="white" />
                <line x1="100" y1="300" x2="600" y2="350" stroke="white" stroke-width="1" style="animation: blink-line 9s infinite;" />
                <line x1="600" y1="350" x2="900" y2="100" stroke="white" stroke-width="1" style="animation: blink-line 13s infinite;" />
                <line x1="600" y1="350" x2="200" y2="100" stroke="rgba(131,33,33,0.5)" stroke-width="2" stroke-dasharray="10 5" style="animation: blink-line 5s infinite;" />
            </g>
            
            <text x="500" y="380" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.3)" text-anchor="middle" letter-spacing="10px">
                // OMNI_NETWORK_INFRASTRUCTURE //
            </text>
        </svg>`;
    }
});