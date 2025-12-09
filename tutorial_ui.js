// --- TUTORIAL UI LOGIC (v3.0 - Smart Positioning & Clamping) ---

console.log("Módulo Tutorial Cargado (v3.0 Anti-Overflow)");

const steps = [
    {
        title: "Bienvenid@ a S I L E N O S",
        text: "Silenos es tu entorno creativo asistido por IA. Este tutorial rápido te enseñará cómo organizar tu universo y escribir tus libros.",
        target: null, 
        tab: "tab1" 
    },
    {
        title: "Navegación Principal",
        text: "Usa esta barra para cambiar entre tus Datos, Guiones, Biblioteca y la configuración de IA.",
        target: ".nav-header",
        tab: "tab1"
    },
    {
        title: "Base de Datos (Worldbuilding)",
        text: "Aquí defines las reglas de tu mundo. Crea tarjetas para personajes y lugares. La IA leerá esto para mantener la coherencia.",
        target: "#data-sidebar-view",
        tab: "tab1"
    },
    {
        title: "Editor de Guiones",
        text: "Escribe en formato estándar de cine. Puedes usar la IA para estructurar tus ideas automáticamente o escribir a mano.",
        target: "#section-guion",
        tab: "tab2" 
    },
    {
        title: "Biblioteca de Novelas",
        text: "Convierte tus guiones en novelas completas. Silenos mantiene el estilo y la coherencia por capítulos.",
        target: "#section-libro",
        tab: "tab3"
    },
    {
        title: "El Cerebro (IA)",
        text: "Configura tu API Key de Google aquí. Es el motor que impulsa la generación de texto.",
        target: ".ia-container",
        tab: "tab5"
    },
    {
        title: "Copias de Seguridad",
        text: "¡Importante! Silenos no guarda en la nube. Descarga tu archivo JSON regularmente aquí.",
        target: ".io-container",
        tab: "tab4"
    }
];

let currentStep = 0;
let overlay, box, spotlight;

export function initTutorial() {
    if (document.querySelector('.tutorial-overlay')) return;

    createElements();
    
    const btn = document.createElement('button');
    btn.className = 'btn-help-float';
    btn.textContent = '?';
    btn.onclick = startTutorial;
    document.body.appendChild(btn);

    // Auto-inicio
    setTimeout(startTutorial, 1000);
}

function createElements() {
    overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.onclick = (e) => { if(e.target === overlay) endTutorial(); };
    document.body.appendChild(overlay);

    spotlight = document.createElement('div');
    spotlight.className = 'tutorial-spotlight';
    document.body.appendChild(spotlight);

    box = document.createElement('div');
    box.className = 'tutorial-box';
    box.innerHTML = `
        <div class="t-title" id="t-title"></div>
        <div class="t-text" id="t-text"></div>
        <div class="t-footer">
            <span class="t-steps" id="t-steps"></span>
            <div style="display:flex; gap:10px;">
                <button class="t-btn t-btn-skip" onclick="window.endTutorial()">Salir</button>
                <button class="t-btn t-btn-next" onclick="window.nextStep()">Siguiente</button>
            </div>
        </div>
    `;
    document.body.appendChild(box);

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") endTutorial();
    });
    
    window.addEventListener('resize', () => {
        if(overlay.style.display === 'block') showStep(currentStep);
    });
}

function startTutorial() {
    currentStep = 0;
    overlay.style.display = 'block'; 
    box.style.display = 'block';
    
    setTimeout(() => {
        overlay.classList.add('active');
        box.classList.add('active');
        showStep(currentStep);
    }, 50);
}

function showStep(index) {
    if (index >= steps.length) {
        endTutorial();
        return;
    }

    const step = steps[index];

    if (step.tab) {
        const radio = document.getElementById(step.tab);
        if (radio && !radio.checked) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
        }
    }

    document.getElementById('t-title').textContent = step.title;
    document.getElementById('t-text').textContent = step.text;
    document.getElementById('t-steps').textContent = `${index + 1} / ${steps.length}`;
    
    const nextBtn = box.querySelector('.t-btn-next');
    nextBtn.textContent = index === steps.length - 1 ? "Finalizar" : "Siguiente";

    if (step.target) {
        setTimeout(() => {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                
                // Mover Spotlight
                spotlight.style.width = `${rect.width + 10}px`; 
                spotlight.style.height = `${rect.height + 10}px`;
                spotlight.style.top = `${rect.top - 5}px`;
                spotlight.style.left = `${rect.left - 5}px`;
                spotlight.classList.add('active');

                // Mover Caja (Lógica Nueva)
                positionSmart(rect);
            } else {
                centerView();
            }
        }, 350);
    } else {
        centerView();
    }
}

function centerView() {
    spotlight.classList.remove('active');
    // Mover spotlight lejos para que no estorbe
    spotlight.style.top = '-5000px'; 
    
    // Centrar caja
    box.style.top = '50%';
    box.style.left = '50%';
    box.style.transform = 'translate(-50%, -50%)';
}

// --- FUNCIÓN MATEMÁTICA CORREGIDA ---
function positionSmart(targetRect) {
    const boxRect = box.getBoundingClientRect();
    const margin = 20;
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    let top, left;

    // 1. Decidir si ponemos la caja Arriba o Abajo (Prioridad Vertical)
    // Espacio disponible abajo
    const spaceBelow = windowH - targetRect.bottom;
    // Espacio disponible arriba
    const spaceAbove = targetRect.top;

    // Preferimos abajo si cabe
    if (spaceBelow > boxRect.height + margin) {
        top = targetRect.bottom + margin;
    } 
    // Si no cabe abajo, probamos arriba
    else if (spaceAbove > boxRect.height + margin) {
        top = targetRect.top - boxRect.height - margin;
    } 
    // Si no cabe en ninguno (el elemento es enorme), lo ponemos abajo flotando sobre el elemento
    else {
        top = windowH - boxRect.height - margin;
    }

    // 2. Calcular posición horizontal (Intentar centrar con respecto al objetivo)
    left = targetRect.left + (targetRect.width / 2) - (boxRect.width / 2);

    // 3. CLAMPING (Seguridad para que no se salga de la pantalla)
    // Límite Izquierdo
    if (left < margin) {
        left = margin;
    }
    // Límite Derecho
    if (left + boxRect.width > windowW - margin) {
        left = windowW - boxRect.width - margin;
    }

    // Límite Superior (Por si acaso la lógica de arriba falló)
    if (top < margin) {
        top = margin;
    }

    // Aplicar coordenadas
    box.style.transform = 'none'; // Quitar centrado automático
    box.style.top = `${top}px`;
    box.style.left = `${left}px`;
}

function nextStep() {
    currentStep++;
    showStep(currentStep);
}

function endTutorial() {
    overlay.classList.remove('active');
    box.classList.remove('active');
    spotlight.classList.remove('active');

    setTimeout(() => {
        overlay.style.display = 'none';
        box.style.display = 'none';
        spotlight.style.top = '-5000px';
    }, 400);

    const t1 = document.getElementById('tab1');
    if(t1) t1.checked = true;
}

window.startTutorial = startTutorial;
window.nextStep = nextStep;
window.endTutorial = endTutorial;

document.addEventListener('DOMContentLoaded', initTutorial);