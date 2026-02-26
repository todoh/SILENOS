// main.js
// Lógica principal y renderizado dinámico del Hub Silenos + Entorno Original

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
// Función para inyectar el favicon en todas las páginas que carguen este script
(function() {
    function setFavicon(url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url;
        link.type = 'image/x-icon';
    }

    // Cambia 'favicon.ico' por la ruta correcta de tu icono
    setFavicon('favicon.ico');
    
    console.log("Favicon inyectado dinámicamente.");
})();
function initApp() {
    // 1. Renderizado Hub
    renderHero();
    renderEntertainment();
    renderCreators();
    renderSoftwareIntro();

    // 2. Renderizado Original (Intacto)
    renderKorehModules();
    renderEcosystemPipeline();
    renderSpecs();
    renderDocumentation(); 

    // 3. Utilidades
    initAnimations();
    initMarquee();
}

// --- FUNCIONES DEL HUB GLOBAL ---

function renderHero() {
    const hero = APP_DATA.hero;
    document.getElementById('hero-version').innerHTML = `${hero.version} <span class="text-black ml-2">BUILD ${hero.build}</span>`;
    
    document.getElementById('hero-title').innerHTML = `
        <span>${hero.title_lines[0]}</span>
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400">${hero.title_lines[1]}</span>
        <span>${hero.title_lines[2]}</span>
        <span class="italic font-serif text-red-600 tracking-normal">${hero.title_lines[3]}</span>
    `;
    
    document.getElementById('hero-desc').innerHTML = hero.description;
    
    document.getElementById('hero-buttons').innerHTML = hero.buttons.map(btn => {
        if (btn.style === 'solid') {
            return `<a href="${btn.link}" class="btn-nordic"><i class="fa-solid ${btn.icon} mr-3 text-[9px]"></i> ${btn.text}</a>`;
        } else {
            return `<a target="_blank" href="${btn.link}" class="btn-nordic bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-black" style="padding-left: 10px;">
                        ${btn.text} <i class="fa-solid ${btn.icon} ml-2 text-[11px] group-hover:scale-110 transition-transform"></i>
                    </a>`;
        }
    }).join('');
}

function renderEntertainment() {
    const container = document.getElementById('entertainment-grid');
    if (!container) return;

    container.innerHTML = APP_DATA.entertainment.map((item, index) => {
        const delay = (index + 1) * 0.1;
        const iconClass = item.bg_icon === 'black' ? 'bg-black text-white border-white/20 border' : 'bg-white text-black';
        const tagsHtml = item.tags.map(tag => `<span class="text-[9px] border border-white/20 px-2 py-1 bg-white/5 text-gray-300">${tag}</span>`).join('');

        return `
            <a href="${item.link}" target="${item.link.startsWith('http') ? '_blank' : '_self'}" class="block reveal text-white no-underline group" style="transition-delay: ${delay}s;">
                <div class="border border-white/10 rounded-lg p-8 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 h-full">
                    <div class="w-12 h-12 rounded-full ${iconClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <h3 class="font-bold text-xl mb-3 group-hover:text-red-500 transition-colors">${item.title}</h3>
                    <p class="text-sm text-gray-400 leading-relaxed mb-6">${item.desc}</p>
                    <div class="flex gap-2 flex-wrap">${tagsHtml}</div>
                </div>
            </a>
        `;
    }).join('');
}

function renderCreators() {
    const container = document.getElementById('creators-list');
    if (!container) return;

    container.innerHTML = APP_DATA.creators.map(creator => `
        <div class="flex gap-4 group reveal bg-white p-6 rounded-lg border border-gray-100 hover:border-gray-300 transition-all shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
            <div class="w-1 h-full bg-${creator.color} min-h-[50px] transition-all group-hover:h-full"></div>
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                    <i class="fa-solid ${creator.icon} text-gray-400 text-sm"></i>
                    <h4 class="font-bold text-lg tracking-tight">${creator.name}</h4>
                </div>
                <p class="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-3">${creator.role}</p>
                <p class="text-sm text-gray-600 mb-4">${creator.desc}</p>
                <div class="flex gap-3">
                    ${creator.link_web !== '#' ? `<a href="${creator.link_web}" class="text-[10px] font-mono text-black hover:text-red-600 border-b border-black/20 pb-1">Ver Perfil</a>` : ''}
                    <a href="${creator.link_amazon}" target="_blank" class="text-[10px] font-mono text-black hover:text-red-600 border-b border-black/20 pb-1">Obras en Amazon</a>
                </div>
            </div>
        </div>
    `).join('');
}

function renderSoftwareIntro() {
    const container = document.getElementById('software-intro-grid');
    if (!container) return;

    container.innerHTML = APP_DATA.software_intro.map(item => {
        const iconClass = item.bg_icon === 'black' ? 'bg-black text-white border-none' : 'bg-white text-black border border-black';
        const tagsHtml = item.tags.map(tag => `<span class="text-[9px] border border-gray-200 px-2 py-1 bg-white">${tag}</span>`).join('');

        return `
            <a href="${item.link}" class="card-module block reveal text-black no-underline hover:text-black">
                <div class="w-10 h-10 ${iconClass} flex items-center justify-center mb-6 rounded">
                    <i class="fa-solid ${item.icon}"></i>
                </div>
                <h3 class="font-bold text-xl mb-2">${item.title}</h3>
                <p class="text-sm text-gray-600 leading-relaxed mb-4">${item.desc}</p>
                <div class="flex gap-2 flex-wrap">${tagsHtml}</div>
            </a>
        `;
    }).join('');
}


// --- FUNCIONES ORIGINALES RESTAURADAS (INTACTAS) ---

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

    const items = container.querySelectorAll('.doc-accordion');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const isExpanded = item.classList.contains('expanded');
            if (!isExpanded) {
                item.classList.add('expanded');
            } else {
                item.classList.remove('expanded');
            }
        });
    });
}

// --- UTILIDADES ---

function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }, 100);
}

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
