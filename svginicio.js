// svginicio.js

function iniciarMotorCanvasSVG() {
    const container = document.getElementById('svg-canvas-container');
    if (!container) return;

    // Configuración del entorno SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.position = "absolute";
    container.appendChild(svg);

    // Estado central
    let centerX = window.innerWidth / 2;
    let centerY = window.innerHeight * 0.35; 

    // Generador de polígonos regulares para el círculo alquímico
    function getPolygonPoints(sides) {
        let points = [];
        for (let i = 0; i < sides; i++) {
            let angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            // Radio 1 base para escalarlo nativamente con SVG transform
            points.push(`${Math.cos(angle)},${Math.sin(angle)}`);
        }
        return points.join(' ');
    }

    // Grupo para las formas alquímicas (fondo)
    const shapesGroup = document.createElementNS(svgNS, "g");
    svg.appendChild(shapesGroup);

    // Elemento central: el núcleo
    const coreCircle = document.createElementNS(svgNS, "circle");
    coreCircle.setAttribute("fill", "white");
    svg.appendChild(coreCircle);

    // Configuración Compleja del Círculo Alquímico (Múltiples grosores y superposiciones)
    const shapeConfigs = [
        // Anillos interiores (Alta velocidad)
        { sides: 3, offset: 20, speed: 0.015, color: "rgba(255, 255, 255, 0.8)", dash: "none", width: "2" },
        { sides: 3, offset: 25, speed: -0.018, color: "rgb(131, 33, 33)", dash: "2 4", width: "0.5" },
        { sides: 4, offset: 45, speed: -0.012, color: "rgba(255, 255, 255, 0.6)", dash: "none", width: "3.5" },
        { sides: 4, offset: 50, speed: 0.01, color: "rgb(131, 33, 33)", dash: "8 4", width: "1.5" },
        
        // Anillos medios (Estabilidad y estructura)
        { sides: 5, offset: 80, speed: 0.01, color: "rgba(255, 255, 255, 0.5)", dash: "none", width: "1" },
        { sides: 6, offset: 115, speed: -0.008, color: "rgb(131, 33, 33)", dash: "12 6", width: "2.5" },
        { sides: 6, offset: 125, speed: 0.005, color: "rgba(255, 255, 255, 0.3)", dash: "none", width: "0.5" },
        { sides: 7, offset: 160, speed: 0.006, color: "rgb(131, 33, 33)", dash: "none", width: "1.5" },
        
        // Anillos exteriores (Lentos, majestuosos, gran grosor)
        { sides: 8, offset: 205, speed: -0.004, color: "rgba(255, 255, 255, 0.4)", dash: "2 6", width: "3" },
        { sides: 9, offset: 250, speed: 0.003, color: "rgb(131, 33, 33)", dash: "10 10", width: "0.8" },
        { sides: 10, offset: 310, speed: -0.002, color: "rgba(255, 255, 255, 0.2)", dash: "none", width: "4" },
        
        // Círculos de contención rúnicos (Muchos lados = casi un círculo)
        { sides: 12, offset: 380, speed: 0.0015, color: "rgba(255, 255, 255, 0.15)", dash: "4 12", width: "1" },
        { sides: 24, offset: 450, speed: -0.001, color: "rgb(131, 33, 33)", dash: "1 4", width: "0.5" }
    ];

    // Inicialización de las formas geométricas
    const alchemyShapes = shapeConfigs.map(conf => {
        const poly = document.createElementNS(svgNS, "polygon");
        poly.setAttribute("points", getPolygonPoints(conf.sides));
        // Aseguramos relleno transparente y aplicamos los nuevos contornos
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke", conf.color);
        poly.setAttribute("stroke-width", conf.width);
        if (conf.dash !== "none") poly.setAttribute("stroke-dasharray", conf.dash);
        shapesGroup.appendChild(poly);

        return {
            node: poly,
            angle: Math.random() * Math.PI * 2, // Rotación inicial aleatoria para generar patrones únicos
            speed: conf.speed,
            offset: conf.offset,
            scale: 1,
            opacity: 1,
            exploding: false,
            velScale: 0
        };
    });

    // Sistema de partículas (Letras)
    const numParticles = 800;
    const particles = [];
    const charset = "SILENOSKOREH0101XYZSYSTEMDATA";

    for (let i = 0; i < numParticles; i++) {
        const textNode = document.createElementNS(svgNS, "text");
        textNode.textContent = charset[Math.floor(Math.random() * charset.length)];
        textNode.setAttribute("fill", i % 5 === 0 ? "rgb(131, 33, 33)" : "rgba(255, 255, 255, 0.8)");
        textNode.setAttribute("font-family", "monospace");
        textNode.setAttribute("font-size", Math.random() * 16 + 10 + "px"); 
        textNode.setAttribute("text-anchor", "middle");
        textNode.setAttribute("dominant-baseline", "middle");
        textNode.style.opacity = 0;
        svg.appendChild(textNode);

        particles.push({
            node: textNode,
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            speed: Math.random() * 40 + 15, 
            active: false
        });
    }

    // Máquina de estados y variables dinámicas
    let phase = 0; 
    let phaseTime = 0;
    
    const minRadius = 45; 
    let radius = minRadius;
    let targetMaxRadius = 130; 
    
    let dynamicTimes = { GROW: 100, HOLD: 40, EXPLODE: 150, RETURN: 120, SHRINK: 80, WAIT: 60 };

    function randomizeCycle() {
        dynamicTimes.GROW = Math.floor(Math.random() * 120 + 60);
        dynamicTimes.HOLD = Math.floor(Math.random() * 80 + 20); 
        dynamicTimes.EXPLODE = Math.floor(Math.random() * 100 + 150); 
        dynamicTimes.RETURN = Math.floor(Math.random() * 50 + 120);
        dynamicTimes.WAIT = Math.floor(Math.random() * 100 + 20);
        targetMaxRadius = Math.random() * 60 + 100; 
    }

    window.addEventListener('resize', () => {
        centerX = window.innerWidth / 2;
        centerY = window.innerHeight * 0.35;
    });

    // Bucle principal (Draw Loop)
    function drawLoop() {
        phaseTime++;
        
        let currentGlitchX = 0;
        let currentGlitchY = 0;

        switch(phase) {
            case 0: // Crecer con Glitch
                if (phaseTime < dynamicTimes.GROW) {
                    radius += (targetMaxRadius - radius) * 0.05;
                    
                    let isGlitching = Math.random() > 0.85;
                    currentGlitchX = isGlitching ? (Math.random() - 0.5) * 12 : 0;
                    currentGlitchY = isGlitching ? (Math.random() - 0.5) * 12 : 0;
                    let glitchRadius = isGlitching ? radius + (Math.random() - 0.5) * 20 : radius;

                    coreCircle.setAttribute("cx", centerX + currentGlitchX);
                    coreCircle.setAttribute("cy", centerY + currentGlitchY);
                    coreCircle.setAttribute("r", Math.max(minRadius, glitchRadius));
                    coreCircle.setAttribute("opacity", 1);
                } else {
                    phase = 1; phaseTime = 0;
                }
                break;
                
            case 1: // Mantener tensión y temblor violento
                if (phaseTime >= dynamicTimes.HOLD) {
                    phase = 2; phaseTime = 0;
                    coreCircle.setAttribute("opacity", 0);
                    
                    // Detonar el círculo alquímico
                    alchemyShapes.forEach(shape => {
                        shape.exploding = true;
                        shape.velScale = 15 + Math.random() * 25; // Expansión explosiva
                    });
                    
                    // Desplegar letras
                    particles.forEach(p => {
                        const angleOffset = Math.random() * Math.PI * 2;
                        const radiusOffset = Math.random() * radius;
                        p.x = centerX + Math.cos(angleOffset) * radiusOffset;
                        p.y = centerY + Math.sin(angleOffset) * radiusOffset;
                        
                        let finalAngle = Math.random() * Math.PI * 2; 
                        
                        p.vx = Math.cos(finalAngle) * p.speed;
                        p.vy = Math.sin(finalAngle) * p.speed;
                        
                        p.active = true;
                        p.node.style.opacity = 1;
                    });
                } else {
                    let severity = phaseTime / dynamicTimes.HOLD; 
                    currentGlitchX = (Math.random() - 0.5) * 20 * severity;
                    currentGlitchY = (Math.random() - 0.5) * 20 * severity;
                    let glitchRadius = radius + (Math.random() - 0.5) * 30 * severity;
                    
                    coreCircle.setAttribute("cx", centerX + currentGlitchX);
                    coreCircle.setAttribute("cy", centerY + currentGlitchY);
                    coreCircle.setAttribute("r", Math.max(minRadius, glitchRadius));
                }
                break;

            case 2: // Estallar
                particles.forEach(p => {
                    if (p.active) {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vx *= 0.97;
                        p.vy *= 0.97;
                        
                        p.node.setAttribute("x", p.x);
                        p.node.setAttribute("y", p.y);
                    }
                });
                if (phaseTime >= dynamicTimes.EXPLODE) {
                    phase = 3; phaseTime = 0;
                }
                break;

            case 3: // Reagrupar
                let allReturned = true;

                particles.forEach(p => {
                    if (p.active) {
                        const dx = centerX - p.x;
                        const dy = centerY - p.y;
                        p.vx += dx * 0.008; 
                        p.vy += dy * 0.008;
                        p.vx *= 0.88; 
                        p.vy *= 0.88;
                        
                        p.x += p.vx;
                        p.y += p.vy;
                        
                        p.node.setAttribute("x", p.x);
                        p.node.setAttribute("y", p.y);

                        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) allReturned = false;
                    }
                });
                
                if (phaseTime >= dynamicTimes.RETURN || allReturned) {
                    phase = 4; phaseTime = 0;
                    
                    particles.forEach(p => p.node.style.opacity = 0);
                    
                    // Preparar el círculo alquímico para reaparecer
                    alchemyShapes.forEach(shape => {
                        shape.exploding = false;
                        shape.opacity = 0; 
                    });

                    coreCircle.setAttribute("opacity", 1);
                    radius = minRadius * 1.5; 
                    coreCircle.setAttribute("r", radius);
                    coreCircle.setAttribute("cx", centerX);
                    coreCircle.setAttribute("cy", centerY);
                }
                break;

            case 4: // Menguar
                radius += (minRadius - radius) * 0.1; 
                coreCircle.setAttribute("r", radius);
                
                if (Math.abs(radius - minRadius) < 1 || phaseTime >= dynamicTimes.SHRINK) {
                    phase = 5; phaseTime = 0;
                    randomizeCycle(); 
                }
                break;

            case 5: // Esperar
                radius = minRadius + Math.sin(phaseTime * 0.1) * 3; 
                coreCircle.setAttribute("r", radius);
                
                if (phaseTime >= dynamicTimes.WAIT) {
                    phase = 0; phaseTime = 0;
                }
                break;
        }

        // --- ACTUALIZACIÓN DE LAS FORMAS ALQUÍMICAS ---
        alchemyShapes.forEach(shape => {
            shape.angle += shape.speed; 
            
            if (!shape.exploding) {
                shape.scale = radius + shape.offset;
                if (shape.opacity < 1) shape.opacity += 0.03; 
            } else {
                shape.scale += shape.velScale;
                shape.velScale *= 0.94; 
                shape.opacity -= 0.025; 
                if (shape.opacity < 0) shape.opacity = 0;
            }

            // Aplicar matriz de transformación con control de grosores inversos (para que no se engrosen con el scale)
            const inverseStrokeWidth = parseFloat(shape.node.getAttribute("data-original-width") || shape.node.getAttribute("stroke-width")) / shape.scale;
            shape.node.setAttribute("stroke-width", isNaN(inverseStrokeWidth) ? "1" : inverseStrokeWidth);

            shape.node.setAttribute(
                "transform", 
                `translate(${centerX + currentGlitchX}, ${centerY + currentGlitchY}) rotate(${(shape.angle * 180) / Math.PI}) scale(${shape.scale})`
            );
            shape.node.style.opacity = shape.opacity;
        });

        requestAnimationFrame(drawLoop);
    }

    // Guardar el grosor original de cada línea antes de animar
    alchemyShapes.forEach(shape => {
        shape.node.setAttribute("data-original-width", shape.node.getAttribute("stroke-width"));
    });

    randomizeCycle();
    requestAnimationFrame(drawLoop);
}

document.addEventListener('DOMContentLoaded', iniciarMotorCanvasSVG);