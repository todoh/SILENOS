// svgs.js

const svgAssets = {
    mainBackground: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="glowRed" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#d31111" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#d31111" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowPurple" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
    </radialGradient>

    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;400;600&amp;display=swap');
      
      .bg { fill: #000000; }
      
      /* Tipografías */
      .text-base { font-family: 'Montserrat', sans-serif; font-weight: 200; text-anchor: middle; opacity: 0; }
      .text-title { font-size: 110px; letter-spacing: 0.35em; }
      .text-x { font-size: 40px; letter-spacing: 0.1em; fill: #666666; font-weight: 400; }
      .text-sub { font-family: 'Montserrat', sans-serif; font-size: 24px; letter-spacing: 0.6em; fill: #888; font-weight: 400; text-anchor: middle; opacity: 0; animation: fadeSub 13s ease-in-out infinite; }
      .text-modules { font-family: 'Montserrat', sans-serif; font-size: 16px; letter-spacing: 0.4em; fill: #555; font-weight: 600; text-anchor: middle; opacity: 0; animation: fadeModules 13s ease-in-out infinite 2s; }
      
      /* Animaciones de Texto Principales */
      .silenos { animation: fadeSilenos 13s ease-in-out infinite; }
      .x-mark-group { animation: fadeX 13s ease-in-out infinite; }
      .pollination { animation: fadePollination 13s ease-in-out infinite; }

      @keyframes fadeSilenos {
        0% { opacity: 0; transform: translateY(30px); filter: blur(8px); }
        10%, 85% { opacity: 1; transform: translateY(0); filter: blur(0px); }
        92%, 100% { opacity: 0; transform: translateY(-30px); filter: blur(8px); }
      }
      
      @keyframes fadeX {
        0%, 15% { opacity: 0; transform: scale(0.3) rotate(-90deg); filter: blur(4px); }
        25%, 85% { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0px); }
        92%, 100% { opacity: 0; transform: scale(1.8) rotate(90deg); filter: blur(4px); }
      }
      
      @keyframes fadePollination {
        0%, 25% { opacity: 0; transform: translateY(30px); filter: blur(8px); }
        35%, 85% { opacity: 1; transform: translateY(0); filter: blur(0px); }
        92%, 100% { opacity: 0; transform: translateY(-30px); filter: blur(8px); }
      }

      @keyframes fadeSub {
        0%, 5% { opacity: 0; letter-spacing: 0.2em; }
        15%, 85% { opacity: 1; letter-spacing: 0.6em; }
        92%, 100% { opacity: 0; letter-spacing: 0.8em; }
      }

      @keyframes fadeModules {
        0%, 35% { opacity: 0; letter-spacing: 0.2em; transform: translateY(10px); }
        45%, 85% { opacity: 1; letter-spacing: 0.4em; transform: translateY(0); }
        92%, 100% { opacity: 0; letter-spacing: 0.6em; transform: translateY(-10px); }
      }

      /* Animación de Grid */
      .grid-line { stroke: rgba(255,255,255,0.03); stroke-width: 1; }
      .grid-moving { animation: panGrid 15s linear infinite; }
      @keyframes panGrid {
         0% { transform: translateY(-100px); }
         100% { transform: translateY(100px); }
      }

      /* Animación de Nodos Neuronales */
      .node-line { stroke: rgba(211, 17, 17, 0.3); stroke-width: 1.5; stroke-dasharray: 1000; stroke-dashoffset: 1000; fill: none; stroke-linecap: round; }
      .n1 { animation: drawNode 6s ease-in-out infinite alternate; }
      .n2 { animation: drawNode 8s ease-in-out infinite alternate 2s; }
      .n3 { animation: drawNode 7s ease-in-out infinite alternate 4s; }
      .n4 { animation: drawNode 9s ease-in-out infinite alternate 1s; }
      
      @keyframes drawNode {
         0%, 10% { stroke-dashoffset: 1000; opacity: 0;}
         50%, 100% { stroke-dashoffset: 0; opacity: 1;}
      }
      
      /* Animación de Partículas Flotantes */
      .particle { fill: #ffffff; opacity: 0; }
      .p1 { animation: floatParticle 8s ease-in-out infinite; }
      .p2 { animation: floatParticle 12s ease-in-out infinite 2s; }
      .p3 { animation: floatParticle 10s ease-in-out infinite 4s; }
      .p4 { animation: floatParticle 15s ease-in-out infinite 1s; }
      .p5 { animation: floatParticle 9s ease-in-out infinite 5s; }
      .p6 { animation: floatParticle 11s ease-in-out infinite 3s; }
      
      @keyframes floatParticle {
         0% { transform: translate(0, 0) scale(0.1); opacity: 0; }
         20% { opacity: 0.6; }
         50% { transform: translate(60px, -80px) scale(1.5); opacity: 0.9; }
         80% { opacity: 0.6; }
         100% { transform: translate(120px, -160px) scale(0.1); opacity: 0; }
      }

      /* Animación de Pulsos y Anillos */
      .glow-orb { animation: pulseOrb 8s ease-in-out infinite alternate; }
      @keyframes pulseOrb {
         0% { transform: scale(0.7); opacity: 0.4; }
         100% { transform: scale(1.3); opacity: 1; }
      }

      .ring-pulse { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 1; animation: expandRing 4s infinite linear; }
      .ring-pulse-2 { fill: none; stroke: rgba(211,17,17,0.1); stroke-width: 2; animation: expandRing 4s infinite linear 2s; }
      
      @keyframes expandRing {
         0% { r: 10px; opacity: 1; }
         100% { r: 150px; opacity: 0; }
      }
    </style>
  </defs>

  <rect class="bg" width="100%" height="100%" />

  <g style="mix-blend-mode: screen;">
      <circle class="glow-orb" cx="300" cy="200" r="500" fill="url(#glowPurple)" />
      <circle class="glow-orb" cx="1620" cy="880" r="600" fill="url(#glowBlue)" style="animation-delay: -4s;" />
      <circle class="glow-orb" cx="960" cy="540" r="700" fill="url(#glowRed)" style="animation-duration: 12s;" />
  </g>

  <g class="grid-moving">
     <line class="grid-line" x1="0" y1="-200" x2="1920" y2="-200" />
     <line class="grid-line" x1="0" y1="-100" x2="1920" y2="-100" />
     <line class="grid-line" x1="0" y1="0" x2="1920" y2="0" />
     <line class="grid-line" x1="0" y1="100" x2="1920" y2="100" />
     <line class="grid-line" x1="0" y1="200" x2="1920" y2="200" />
     <line class="grid-line" x1="0" y1="300" x2="1920" y2="300" />
     <line class="grid-line" x1="0" y1="400" x2="1920" y2="400" />
     <line class="grid-line" x1="0" y1="500" x2="1920" y2="500" />
     <line class="grid-line" x1="0" y1="600" x2="1920" y2="600" />
     <line class="grid-line" x1="0" y1="700" x2="1920" y2="700" />
     <line class="grid-line" x1="0" y1="800" x2="1920" y2="800" />
     <line class="grid-line" x1="0" y1="900" x2="1920" y2="900" />
     <line class="grid-line" x1="0" y1="1000" x2="1920" y2="1000" />
     <line class="grid-line" x1="0" y1="1100" x2="1920" y2="1100" />
     <line class="grid-line" x1="0" y1="1200" x2="1920" y2="1200" />
  </g>
  
  <g>
     <line class="grid-line" x1="160" y1="0" x2="160" y2="1080" />
     <line class="grid-line" x1="320" y1="0" x2="320" y2="1080" />
     <line class="grid-line" x1="480" y1="0" x2="480" y2="1080" />
     <line class="grid-line" x1="640" y1="0" x2="640" y2="1080" />
     <line class="grid-line" x1="800" y1="0" x2="800" y2="1080" />
     <line class="grid-line" x1="960" y1="0" x2="960" y2="1080" />
     <line class="grid-line" x1="1120" y1="0" x2="1120" y2="1080" />
     <line class="grid-line" x1="1280" y1="0" x2="1280" y2="1080" />
     <line class="grid-line" x1="1440" y1="0" x2="1440" y2="1080" />
     <line class="grid-line" x1="1600" y1="0" x2="1600" y2="1080" />
     <line class="grid-line" x1="1760" y1="0" x2="1760" y2="1080" />
  </g>

  <g opacity="0.6">
     <path class="node-line n1" d="M 160 850 L 480 700 L 800 600 L 960 550" />
     <path class="node-line n2" d="M 1760 200 L 1440 350 L 1120 480 L 960 550" />
     <path class="node-line n3" d="M 320 150 L 640 300 L 850 450 L 960 550" />
     <path class="node-line n4" d="M 1600 950 L 1280 800 L 1050 650 L 960 550" />
  </g>

  <g fill="rgba(255,255,255,0.2)">
      <circle cx="160" cy="850" r="4" />
      <circle cx="480" cy="700" r="3" />
      <circle cx="800" cy="600" r="5" fill="#d31111" />
      <circle cx="1760" cy="200" r="4" />
      <circle cx="1440" cy="350" r="3" />
      <circle cx="1120" cy="480" r="5" fill="#3b82f6" />
      <circle cx="320" cy="150" r="4" />
      <circle cx="640" cy="300" r="3" />
      <circle cx="1600" cy="950" r="4" />
      <circle cx="1280" cy="800" r="3" />
  </g>

  <circle class="particle p1" cx="300" cy="750" r="4" />
  <circle class="particle p2" cx="1500" cy="250" r="3" />
  <circle class="particle p3" cx="650" cy="200" r="5" fill="#d31111" />
  <circle class="particle p4" cx="1250" cy="850" r="4" fill="#a855f7" />
  <circle class="particle p5" cx="850" cy="900" r="3" fill="#3b82f6" />
  <circle class="particle p6" cx="1650" cy="550" r="4" />
  <circle class="particle p1" cx="250" cy="450" r="3" style="animation-delay: 1.5s;" />
  <circle class="particle p3" cx="1050" cy="150" r="5" fill="#d31111" style="animation-delay: 4.5s;" />
  <circle class="particle p2" cx="700" cy="750" r="4" fill="#10b981" style="animation-delay: 2.5s;" />
  <circle class="particle p4" cx="1350" cy="400" r="3" fill="#ec4899" style="animation-delay: 3.5s;" />

  <g>
     <text class="text-sub" x="960" y="300">GENERATIVE AI STUDIO</text>
     
     <text class="text-base text-title silenos" x="960" y="450">
        <tspan fill="#ffffff">SILEN</tspan><tspan fill="#d31111">OS</tspan>
     </text>
     
     <g transform="translate(960, 560)">
         <g class="x-mark-group">
             <circle class="ring-pulse" cx="0" cy="-15" r="10" />
             <circle class="ring-pulse-2" cx="0" cy="-15" r="10" />
             
             <circle cx="0" cy="-15" r="45" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
             <circle cx="0" cy="-15" r="55" fill="none" stroke="rgba(211,17,17,0.15)" stroke-width="1" stroke-dasharray="4 4" />
             <circle cx="0" cy="-15" r="35" fill="none" stroke="rgba(168,85,247,0.2)" stroke-width="1" />
             
             <text class="text-base text-x" x="0" y="0">X</text>
         </g>
     </g>
     
     <text class="text-base text-title pollination" x="960" y="730">
        <tspan fill="#ffffff">POLLINATION.</tspan><tspan fill="#d31111">AI</tspan>
     </text>
     
     <text class="text-modules" x="960" y="860">
        <tspan fill="#a855f7">VISION</tspan> 
        <tspan fill="#555555"> • </tspan> 
        <tspan fill="#d31111">KINEMATICS</tspan> 
        <tspan fill="#555555"> • </tspan> 
        <tspan fill="#ec4899">SOUND</tspan> 
        <tspan fill="#555555"> • </tspan> 
        <tspan fill="#3b82f6">VOICE</tspan> 
        <tspan fill="#555555"> • </tspan> 
        <tspan fill="#10b981">COGNITION</tspan>
     </text>
  </g>
</svg>`,

    moduleVision: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <style>
      .grid-line-img { stroke: rgba(255,255,255,0.03); stroke-width: 1; }
      .accent-box-img { fill: transparent; stroke: #a855f7; stroke-width: 2; opacity: 0; }
      .core-shape-img { fill: #ffffff; opacity: 0; }
      .scanline-img { stroke: #a855f7; stroke-width: 1; opacity: 0; animation: scanImg 4s linear infinite; }
      .anim-box-img { animation: drawBoxImg 6s ease-in-out infinite; }
      .anim-core-img { animation: pulseCoreImg 6s ease-in-out infinite; }
      @keyframes scanImg { 0% { transform: translateY(100px); opacity: 0; } 10%, 90% { opacity: 0.5; } 100% { transform: translateY(700px); opacity: 0; } }
      @keyframes drawBoxImg { 0%, 10% { stroke-dasharray: 0, 3000; opacity: 0; } 30%, 80% { stroke-dasharray: 3000, 0; opacity: 1; } 90%, 100% { opacity: 0; } }
      @keyframes pulseCoreImg { 0%, 20% { opacity: 0; transform: scale(0.8) translate(100px, 75px); } 40%, 70% { opacity: 1; transform: scale(1) translate(0, 0); } 85%, 100% { opacity: 0; transform: scale(1.1) translate(-20px, -15px); } }
    </style>
  </defs>
  <g>
    <line class="grid-line-img" x1="200" y1="0" x2="200" y2="800" /><line class="grid-line-img" x1="400" y1="0" x2="400" y2="800" /><line class="grid-line-img" x1="600" y1="0" x2="600" y2="800" />
    <line class="grid-line-img" x1="0" y1="200" x2="800" y2="200" /><line class="grid-line-img" x1="0" y1="400" x2="800" y2="400" /><line class="grid-line-img" x1="0" y1="600" x2="800" y2="600" />
  </g>
  <line class="scanline-img" x1="150" y1="0" x2="650" y2="0" />
  <rect class="accent-box-img anim-box-img" x="200" y="200" width="400" height="400" />
  <g class="anim-core-img">
    <polygon class="core-shape-img" points="400,280 520,480 280,480" />
    <circle class="core-shape-img" cx="400" cy="380" r="30" fill="#000" />
  </g>
</svg>`,

    moduleKinematics: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <style>
      .vid-frame { fill: transparent; stroke: rgba(255,255,255,0.1); stroke-width: 2; }
      .vid-accent { fill: transparent; stroke: #d31111; stroke-width: 3; opacity: 0; animation: flashFrame 4s infinite; }
      .play-btn { fill: #ffffff; opacity: 0; animation: pulsePlay 4s infinite; transform-origin: center; }
      .film-hole { fill: rgba(255,255,255,0.05); }
      .anim-film { animation: slideFilm 20s linear infinite; }
      
      @keyframes flashFrame { 0%, 10% { opacity: 0; } 20%, 80% { opacity: 1; } 90%, 100% { opacity: 0; } }
      @keyframes pulsePlay { 0%, 15% { opacity: 0; transform: scale(0.5); } 30%, 70% { opacity: 1; transform: scale(1); } 85%, 100% { opacity: 0; transform: scale(1.5); } }
      @keyframes slideFilm { from { transform: translateX(0); } to { transform: translateX(-400px); } }
    </style>
  </defs>
  <g class="anim-film">
    <rect class="film-hole" x="50" y="150" width="40" height="20" /><rect class="film-hole" x="150" y="150" width="40" height="20" />
    <rect class="film-hole" x="250" y="150" width="40" height="20" /><rect class="film-hole" x="350" y="150" width="40" height="20" />
    <rect class="film-hole" x="450" y="150" width="40" height="20" /><rect class="film-hole" x="550" y="150" width="40" height="20" />
    <rect class="film-hole" x="650" y="150" width="40" height="20" /><rect class="film-hole" x="750" y="150" width="40" height="20" />
    <rect class="film-hole" x="850" y="150" width="40" height="20" /><rect class="film-hole" x="950" y="150" width="40" height="20" />
    <rect class="film-hole" x="1050" y="150" width="40" height="20" /><rect class="film-hole" x="1150" y="150" width="40" height="20" />
    <rect class="film-hole" x="50" y="630" width="40" height="20" /><rect class="film-hole" x="150" y="630" width="40" height="20" />
    <rect class="film-hole" x="250" y="630" width="40" height="20" /><rect class="film-hole" x="350" y="630" width="40" height="20" />
    <rect class="film-hole" x="450" y="630" width="40" height="20" /><rect class="film-hole" x="550" y="630" width="40" height="20" />
    <rect class="film-hole" x="650" y="630" width="40" height="20" /><rect class="film-hole" x="750" y="630" width="40" height="20" />
    <rect class="film-hole" x="850" y="630" width="40" height="20" /><rect class="film-hole" x="950" y="630" width="40" height="20" />
    <rect class="film-hole" x="1050" y="630" width="40" height="20" /><rect class="film-hole" x="1150" y="630" width="40" height="20" />
  </g>
  <rect class="vid-frame" x="150" y="200" width="500" height="400" />
  <rect class="vid-accent" x="150" y="200" width="500" height="400" />
  <polygon class="play-btn" points="350,300 480,400 350,500" />
</svg>`,

    moduleSound: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <style>
      .eq-bar { fill: rgba(255,255,255,0.1); }
      .eq-active { fill: #ec4899; animation: eqBounce 1.5s ease-in-out infinite alternate; transform-origin: bottom; }
      .eq-active:nth-child(2) { animation-delay: 0.2s; }
      .eq-active:nth-child(3) { animation-delay: 0.5s; }
      .eq-active:nth-child(4) { animation-delay: 0.1s; }
      .eq-active:nth-child(5) { animation-delay: 0.4s; }
      .eq-active:nth-child(6) { animation-delay: 0.3s; }
      .eq-active:nth-child(7) { animation-delay: 0.6s; }
      .sound-circle { fill: transparent; stroke: rgba(236, 72, 153, 0.3); stroke-width: 1; animation: ripple 3s infinite linear; transform-origin: center; }
      .sound-circle:nth-child(9) { animation-delay: 1.5s; }
      
      @keyframes eqBounce { 0% { transform: scaleY(0.2); opacity: 0.5; } 100% { transform: scaleY(1); opacity: 1; } }
      @keyframes ripple { 0% { r: 50px; opacity: 1; } 100% { r: 350px; opacity: 0; } }
    </style>
  </defs>
  <circle class="sound-circle" cx="400" cy="400" r="50" />
  <circle class="sound-circle" cx="400" cy="400" r="50" />
  
  <g transform="translate(0, 150)">
    <rect class="eq-bar" x="180" y="200" width="30" height="300" rx="15" />
    <rect class="eq-bar" x="250" y="100" width="30" height="400" rx="15" />
    <rect class="eq-bar" x="320" y="250" width="30" height="250" rx="15" />
    <rect class="eq-bar" x="390" y="50"  width="30" height="450" rx="15" />
    <rect class="eq-bar" x="460" y="150" width="30" height="350" rx="15" />
    <rect class="eq-bar" x="530" y="300" width="30" height="200" rx="15" />
    <rect class="eq-bar" x="600" y="200" width="30" height="300" rx="15" />
    
    <rect class="eq-active" x="180" y="200" width="30" height="300" rx="15" />
    <rect class="eq-active" x="250" y="100" width="30" height="400" rx="15" />
    <rect class="eq-active" x="320" y="250" width="30" height="250" rx="15" />
    <rect class="eq-active" x="390" y="50"  width="30" height="450" rx="15" />
    <rect class="eq-active" x="460" y="150" width="30" height="350" rx="15" />
    <rect class="eq-active" x="530" y="300" width="30" height="200" rx="15" />
    <rect class="eq-active" x="600" y="200" width="30" height="300" rx="15" />
  </g>
</svg>`,

    moduleVoice: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <style>
      .mic-base { fill: transparent; stroke: rgba(255,255,255,0.1); stroke-width: 4; stroke-linecap: round; }
      .mic-core { fill: #ffffff; }
      .voice-wave { fill: transparent; stroke: #3b82f6; stroke-width: 3; stroke-linecap: round; animation: broadcast 2s infinite ease-out; opacity: 0; transform-origin: center; }
      .voice-wave:nth-child(2) { animation-delay: 0.6s; }
      .voice-wave:nth-child(3) { animation-delay: 1.2s; }
      
      @keyframes broadcast { 0% { transform: scale(1); opacity: 1; stroke-width: 4; } 100% { transform: scale(2.5); opacity: 0; stroke-width: 1; } }
    </style>
  </defs>
  <g transform="translate(400, 400)">
    <path class="voice-wave" d="M -60 -60 A 85 85 0 0 1 60 -60 A 85 85 0 0 1 60 60 A 85 85 0 0 1 -60 60 A 85 85 0 0 1 -60 -60" />
    <path class="voice-wave" d="M -90 -90 A 127 127 0 0 1 90 -90 A 127 127 0 0 1 90 90 A 127 127 0 0 1 -90 90 A 127 127 0 0 1 -90 -90" />
    <path class="voice-wave" d="M -120 -120 A 170 170 0 0 1 120 -120 A 170 170 0 0 1 120 120 A 170 170 0 0 1 -120 120 A 170 170 0 0 1 -120 -120" />
    
    <rect class="mic-core" x="-25" y="-60" width="50" height="90" rx="25" />
    <path class="mic-base" d="M -45 -10 v 20 a 45 45 0 0 0 90 0 v -20" />
    <line class="mic-base" x1="0" y1="55" x2="0" y2="100" />
    <line class="mic-base" x1="-30" y1="100" x2="30" y2="100" />
  </g>
</svg>`,

    moduleCognition: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="100%" height="100%">
  <defs>
    <style>
      .node-line { stroke: rgba(255,255,255,0.05); stroke-width: 2; }
      .active-line { stroke: #10b981; stroke-width: 2; opacity: 0; animation: tracePath 4s infinite linear; }
      .node-dot { fill: rgba(255,255,255,0.2); }
      .active-dot { fill: #10b981; opacity: 0; animation: blinkNode 4s infinite step-end; }
      .cursor-blink { fill: #ffffff; animation: blinkCursor 1s infinite step-end; }
      
      @keyframes tracePath { 0%, 10% { stroke-dasharray: 0, 1000; opacity: 0; } 20%, 80% { stroke-dasharray: 1000, 0; opacity: 1; } 90%, 100% { opacity: 0; } }
      @keyframes blinkNode { 0%, 20% { opacity: 0; } 25%, 75% { opacity: 1; box-shadow: 0 0 15px #10b981; } 80%, 100% { opacity: 0; } }
      @keyframes blinkCursor { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
    </style>
  </defs>
  <g transform="translate(100, 200)">
    <rect x="0" y="0" width="600" height="400" fill="transparent" stroke="rgba(255,255,255,0.1)" stroke-width="2" rx="10" />
    <circle cx="30" cy="30" r="6" fill="rgba(255,255,255,0.1)" />
    <circle cx="50" cy="30" r="6" fill="rgba(255,255,255,0.1)" />
    <circle cx="70" cy="30" r="6" fill="rgba(255,255,255,0.1)" />
    <line x1="0" y1="60" x2="600" y2="60" stroke="rgba(255,255,255,0.1)" stroke-width="2" />
    
    <line class="node-line" x1="100" y1="150" x2="300" y2="250" />
    <line class="node-line" x1="300" y1="250" x2="500" y2="150" />
    <line class="node-line" x1="300" y1="250" x2="300" y2="350" />
    
    <line class="active-line" x1="100" y1="150" x2="300" y2="250" />
    <line class="active-line" x1="300" y1="250" x2="500" y2="150" style="animation-delay: 1s" />
    <line class="active-line" x1="300" y1="250" x2="300" y2="350" style="animation-delay: 2s" />
    
    <circle class="node-dot" cx="100" cy="150" r="8" />
    <circle class="active-dot" cx="100" cy="150" r="8" />
    <circle class="node-dot" cx="300" cy="250" r="12" />
    <circle class="active-dot" cx="300" cy="250" r="12" style="animation-delay: 1s" />
    <circle class="node-dot" cx="500" cy="150" r="8" />
    <circle class="active-dot" cx="500" cy="150" r="8" style="animation-delay: 2s" />
    <circle class="node-dot" cx="300" cy="350" r="8" />
    <circle class="active-dot" cx="300" cy="350" r="8" style="animation-delay: 3s" />
    
    <text x="50" y="120" fill="rgba(255,255,255,0.5)" font-family="monospace" font-size="20">> SYS_READY</text>
    <rect class="cursor-blink" x="180" y="102" width="12" height="22" />
  </g>
</svg>`
};

document.addEventListener('DOMContentLoaded', () => {
    // Inyectar los SVGs en cualquier contenedor que tenga el atributo data-svg-inject
    document.querySelectorAll('[data-svg-inject]').forEach(container => {
        const key = container.getAttribute('data-svg-inject');
        if (svgAssets[key]) {
            container.innerHTML = svgAssets[key];
        }
    });
});