 document.addEventListener('DOMContentLoaded', () => {
        const asistenteBtn = document.getElementById('asistente-btn');
        const asistentePopup = document.getElementById('asistente-popup');
        const asistenteTituloInput = document.getElementById('asistente-titulo-input');
        const tituloProyecto = document.getElementById('titulo-proyecto');

        const togglePopup = (event) => {
            event.stopPropagation();
            const isVisible = asistentePopup.classList.toggle('visible');
            if (isVisible) {
                asistenteTituloInput.value = tituloProyecto.textContent.trim();
                asistenteTituloInput.focus();
            }
        };

        const closePopup = () => {
            asistentePopup.classList.remove('visible');
        };

        asistenteBtn.addEventListener('click', togglePopup);

        asistenteTituloInput.addEventListener('input', () => {
            tituloProyecto.textContent = asistenteTituloInput.value;
        });

        document.addEventListener('click', (event) => {
            if (!asistentePopup.contains(event.target) && !asistenteBtn.contains(event.target)) {
                if (asistentePopup.classList.contains('visible')) {
                    closePopup();
                }
            }
        });

        asistentePopup.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        // Lógica del interruptor 2D/3D en la sección de imágenes
        const toggle2dBtn = document.getElementById('toggle-2d-btn');
        const toggle3dBtn = document.getElementById('toggle-3d-btn');
        const controlPanel2d = document.getElementById('control-panel-2d');
        const controlPanel3d = document.getElementById('control-panel-3d');

        function toggleImageMode(mode) {
            if (mode === '2d') {
                toggle2dBtn.classList.add('active');
                toggle3dBtn.classList.remove('active');
                controlPanel2d.style.display = 'block'; // O 'flex' si es un flex container
                controlPanel3d.style.display = 'none';
            } else if (mode === '3d') {
                toggle3dBtn.classList.add('active');
                toggle2dBtn.classList.remove('active');
                controlPanel3d.style.display = 'block'; // O 'flex'
                controlPanel2d.style.display = 'none';
            }
        }

        toggle2dBtn.addEventListener('click', () => toggleImageMode('2d'));
        toggle3dBtn.addEventListener('click', () => toggleImageMode('3d'));

        // Establecer el modo 2D como predeterminado al cargar la página
        toggleImageMode('2d');
    });

function iniciarAnimacionSalida() {
    const principio = document.getElementById('principio');
    const esfera = document.getElementById('esfera');
    const silenos = document.getElementById('silenos');
    const asistenteBtn = document.getElementById('asistente-btn');
    const titulo1 = document.getElementById('titulo1');

    // Ocultar los botones dentro de la esfera para que no se vean durante la expansión
    const botonesEnEsfera = esfera.getElementsByTagName('button');
    for (let i = 0; i < botonesEnEsfera.length; i++) {
        botonesEnEsfera[i].style.opacity = '0';
    }

    // Ocultar el título superior
    if (titulo1) {
        titulo1.style.opacity = '0';
    }

    // Añadir la clase que inicia la expansión de la esfera
    esfera.classList.add('expandir');

    // La animación de expansión en styles2.css dura 1 segundo.
    // Los siguientes pasos están sincronizados con esa animación.

    // 1. Mostrar el botón del asistente durante la transición
    setTimeout(() => {
        if (asistenteBtn) {
            asistenteBtn.classList.add('visible');
        }
    }, 1000);

    // 2. Empezar a desvanecer toda la pantalla de bienvenida
    setTimeout(() => {
        principio.style.opacity = '0';
    }, 1500);

    // 3. Ocultar la pantalla de bienvenida y mostrar la aplicación principal
    setTimeout(() => {
        principio.style.display = 'none';
        silenos.style.display = 'flex';
        silenos.getBoundingClientRect(); // Forzar reflow para asegurar la animación
        silenos.style.opacity = '1';
    }, 2500); // Este tiempo es el delay de 1500ms + la duración del fade-out de 1000ms
}


 // ========= CÓDIGO P5.JS CON ESFERA DESPLAZADA HACIA ABAJO =========

    let particles = [];
    let centerSphere;
    const maxParticles = 250;
    let iniciarSalida = false;

    function setup() {
        const container = document.getElementById('p5-canvas-container');
        if (!container) return;
        
        const canvas = createCanvas(windowWidth, windowHeight, WEBGL);
        canvas.parent(container);

        centerSphere = new CenterSphere();
        
        while (particles.length < maxParticles) {
            particles.push(new Particle());
        }
    }

    function draw() {
        background(0);
        rotateY(frameCount * 0.005);
        
        // ▼▼▼ LÍNEA NUEVA: Desplaza toda la escena 3D hacia abajo ▼▼▼
        // El resultado es que la esfera y las partículas se ven más bajas.
        translate(0, windowHeight * 0.07, 0); 
        
        // El resto del código funciona igual
        if (iniciarSalida) {
            centerSphere.shrink();
            for (let p of particles) {
                p.maxSpeed = 25;
                p.applyForce(createVector(0, 0, -2));
                p.update();
                p.display();
            }
        } else {
            let strength = map(sin(frameCount * 0.02), -1, 1, 0, 10);
            let isAttracting = cos(frameCount * 0.02) > 0;
            centerSphere.display();
            for (let i = particles.length - 1; i >= 0; i--) {
                let p = particles[i];
                p.update();
                if (isAttracting) {
                    p.attract(centerSphere.position, strength);
                } else {
                    p.repel(centerSphere.position, strength);
                }
                if (p.isInside(centerSphere.position, centerSphere.size / 2)) {
                    particles.splice(i, 1);
                    particles.push(new Particle());
                } else {
                    p.display();
                }
            }
        }
    }
    
    function windowResized() {
        resizeCanvas(windowWidth, windowHeight);
    }

    // --- Clases para la animación (no necesitan cambios) ---
    class CenterSphere {
        constructor() { this.position = createVector(0, 0, 0); this.size = 137; }
        display() { push(); noStroke(); fill(255); sphere(this.size); pop(); }
        shrink() { this.size = lerp(this.size, 0, 0.1); }
    }
    class Particle {
        constructor() { let spawnRadius = max(windowWidth, windowHeight) / 1.5; this.position = p5.Vector.random3D().mult(random(300, spawnRadius)); this.velocity = createVector(); this.acceleration = createVector(); this.size = random(2, 6); this.maxSpeed = 4; }
        applyForce(force) { this.acceleration.add(force); }
        update() { this.velocity.add(this.acceleration); this.velocity.limit(this.maxSpeed); this.position.add(this.velocity); this.acceleration.mult(0); if(this.position.mag() > max(windowWidth, windowHeight)) { let spawnRadius = max(windowWidth, windowHeight) / 1.5; this.position = p5.Vector.random3D().mult(spawnRadius); this.velocity.mult(0); } }
        attract(target, strength) { let force = p5.Vector.sub(target, this.position); let d = force.mag(); d = constrain(d, 5, 100); let g = strength / (d * d); force.normalize().mult(g); this.applyForce(force); }
        repel(target, strength) { let force = p5.Vector.sub(target, this.position); let d = force.mag(); if (d < 250) { d = constrain(d, 5, 250); let g = -strength / (d * d); force.normalize().mult(g); this.applyForce(force); } }
        isInside(target, radius) { return this.position.dist(target) < radius; }
        display() { push(); translate(this.position); noStroke(); fill(255); sphere(this.size); pop(); }
    }