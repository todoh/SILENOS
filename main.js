// main.js
// Lógica principal y renderizado dinámico

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderKorehModules();
    renderEcosystemPipeline();
    renderSpecs();
    renderDocumentation(); // Lógica de acordeón actualizada
    initAnimations();
    initMarquee();
}

/**
 * Renderiza las tarjetas de los módulos Koreh
 */
function renderKorehModules() {
    const container = document.getElementById('koreh-grid');
    if (!container) return;

    const html = APP_DATA.koreh_modules.map(module => {
        const iconClass = module.bg_icon === 'black' 
            ? 'bg-black text-white border-none' 
            : 'bg-white text-black border border-black';

        const tagsHtml = module.tags.map(tag => 
            `<span class="text-[9px] border border-gray-200 px-2 py-1 bg-white">${tag}</span>`
        ).join('');

        return `
            <div class="card-module reveal">
                <span class="card-number">${module.id}</span>
                <div class="w-10 h-10 ${iconClass} flex items-center justify-center mb-6">
                    <i class="fa-solid ${module.icon}"></i>
                </div>
                <h3 class="font-bold text-xl mb-2">${module.title}</h3>
                <p class="text-sm text-gray-600 leading-relaxed mb-4">
                    ${module.desc}
                </p>
                <div class="flex gap-2 flex-wrap">
                    ${tagsHtml}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Renderiza el pipeline del ecosistema
 */
function renderEcosystemPipeline() {
    const container = document.getElementById('ecosystem-pipeline');
    if (!container) return;

    let html = '';
    
    APP_DATA.pipeline_steps.forEach((step, index) => {
        const isLast = index === APP_DATA.pipeline_steps.length - 1;
        const delay = (index + 1) * 0.1;
        
        const circleStyle = step.theme === 'black' 
            ? 'bg-black border-white/20 text-white' 
            : 'bg-white text-black border-white/20';

        const badge = index === 0 
            ? `<span class="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold px-2 rounded-full">JSON</span>` 
            : '';

        html += `
            <div class="flex flex-col items-center text-center reveal" style="transition-delay: ${delay}s;">
                <div class="w-16 h-16 border rounded-full flex items-center justify-center mb-6 ${circleStyle} z-10 relative">
                    <i class="fa-solid ${step.icon} text-xl"></i>
                    ${badge}
                </div>
                <h3 class="font-bold text-lg mb-2">${step.title}</h3>
                <p class="text-xs text-gray-400 font-mono mb-4">${step.subtitle}</p>
                <p class="text-xs text-gray-500 leading-relaxed px-4">
                    ${step.desc}
                </p>
            </div>
        `;

        if (!isLast) {
            html += `
                <div class="hidden md:flex items-center justify-center reveal">
                    <div class="h-px w-full bg-white/20 relative">
                        <i class="fa-solid fa-chevron-right absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                    </div>
                </div>
            `;
        }
    });

    container.innerHTML = html;
}

/**
 * Renderiza las especificaciones técnicas
 */
function renderSpecs() {
    const container = document.getElementById('specs-list');
    if (!container) return;

    const html = APP_DATA.specs.map(spec => `
        <div class="flex gap-4 group">
            <div class="w-1 h-full bg-${spec.color} min-h-[50px] transition-all group-hover:h-full group-hover:bg-${spec.hover}"></div>
            <div>
                <h4 class="font-bold text-sm uppercase tracking-widest mb-1">${spec.title}</h4>
                <p class="text-sm text-gray-600">${spec.desc}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

/**
 * Renderiza la sección de documentación con efecto Acordeón
 */
function renderDocumentation() {
    const container = document.getElementById('docs-grid');
    if (!container || typeof DOCS_DATA === 'undefined') return;

    const html = DOCS_DATA.map(doc => `
        <div class="doc-accordion reveal group" data-id="${doc.id}">
            <div class="doc-header">
                <div>
                    <span class="text-[9px] font-mono text-gray-400 uppercase tracking-widest border border-gray-100 px-2 py-1 mb-2 inline-block">
                        ${doc.category}
                    </span>
                    <h3 class="font-bold text-lg group-hover:text-black transition-colors">${doc.title}</h3>
                </div>
                <i class="fa-solid fa-chevron-down doc-icon text-gray-300"></i>
            </div>
            <div class="doc-content">
                <p class="text-sm text-gray-600 leading-relaxed font-light pb-4 border-t border-gray-100 pt-4">
                    ${doc.content}
                </p>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;

    // LÓGICA CORREGIDA: Usamos 'expanded' en lugar de 'active'
    const items = container.querySelectorAll('.doc-accordion');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const isExpanded = item.classList.contains('expanded');
            
            // Opcional: Cerrar los demás si quieres comportamiento de acordeón estricto
            // items.forEach(i => i.classList.remove('expanded'));

            if (!isExpanded) {
                item.classList.add('expanded');
            } else {
                item.classList.remove('expanded');
            }
        });
    });
}

/**
 * Inicializa animaciones (Scroll Reveal)
 */
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Esto añade 'active' para hacer visible el elemento (opacity 1)
                // Ya no interfiere con el acordeón porque el acordeón usa 'expanded'
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);
}

/**
 * Controla el Marquee
 */
function initMarquee() {
    const marquee = document.getElementById('marquee-text');
    if (!marquee) return;

    const baseText = APP_DATA.marquee_text;
    marquee.innerText = baseText.repeat(20); 
    
    let pos = 0;
    function animate() {
        pos--;
        if (pos < -1000) pos = 0;
        marquee.style.transform = `translateX(${pos}px)`;
        requestAnimationFrame(animate);
    }
    animate();
}