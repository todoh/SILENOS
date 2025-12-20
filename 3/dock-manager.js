// SILENOS 3/dock-manager.js
// --- DOCK DINÁMICO Y LANZADOR ---

// Definición de Aplicaciones del Sistema
const SYSTEM_APPS = [
    {
        title: "Crear Guion IA",
        icon: "clapperboard", 
        desc: "Generador de guiones y libros",
        action: () => {
             if (typeof openAICreatorWindow === 'function') openAICreatorWindow();
             else alert("Módulo IA no cargado.");
        }
    },{
        title: "Almacenamiento", // <--- ACTUALIZADO
        icon: "hard-drive", 
        desc: "Copia de Seguridad y Restauración",
        action: () => {
             if (typeof openStorageWindow === 'function') openStorageWindow();
             else alert("Módulo Import/Storage no cargado.");
        }
    },
    {
        title: "Crear Libro IA",
        icon: "book-open-check", 
        desc: "Acceso directo (Mismo módulo)",
        action: () => {
             if (typeof openAICreatorWindow === 'function') openAICreatorWindow();
             else alert("Módulo IA no cargado.");
        }
    },
     
];

// --- RENDERIZADO DEL DOCK ---
function renderDock() {
    const dockContainer = document.getElementById('dock-items');
    if (!dockContainer) return;
    
    dockContainer.innerHTML = '';

    if (openWindows.length === 0) {
        dockContainer.innerHTML = '<span class="text-gray-400 text-sm font-medium italic select-none empty-msg px-2">Sin apps</span>';
        return;
    }

    const visibleWindows = openWindows.filter(w => !w.isMinimized);
    let activeId = null;
    if (visibleWindows.length > 0) {
        const maxZ = Math.max(...visibleWindows.map(w => w.zIndex));
        activeId = visibleWindows.find(w => w.zIndex === maxZ)?.id;
    }

    openWindows.forEach(win => {
        let iconName = 'box'; 
        if(win.type === 'app') {
            const app = APPS.find(a => a.id === win.appId);
            iconName = app ? app.icon : 'box';
        } else {
            iconName = win.icon;
        }

        const isActive = (win.id === activeId) && !win.isMinimized;
        const isMinimized = win.isMinimized;

        const btn = document.createElement('button');
        let classes = "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 relative ";
        
        if (isActive) classes += "neumorph-in text-blue-500 transform scale-105";
        else classes += "neumorph-btn text-gray-500 hover:text-gray-700 hover:-translate-y-1";
        
        if (isMinimized) classes += " opacity-60";

        btn.className = classes;
        btn.onclick = () => {
            if (isActive) toggleMinimize(win.id);
            else {
                if (win.isMinimized) toggleMinimize(win.id);
                else focusWindow(win.id);
            }
        };

        btn.innerHTML = `
            <i data-lucide="${iconName}" class="w-6 h-6"></i>
            ${!isMinimized ? '<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400"></div>' : ''}
        `;
        
        dockContainer.appendChild(btn);
    });

    if (window.lucide) lucide.createIcons();
}

// --- LANZADOR ---
window.toggleLauncher = function() {
    const existing = document.getElementById('launcher-menu');
    
    if (existing) {
        existing.classList.remove('pop-in');
        existing.classList.add('pop-out');
        setTimeout(() => existing.remove(), 200);
        return;
    }

    createLauncherMenu();
};

function createLauncherMenu() {
    const btn = document.getElementById('launcher-btn');
    const rect = btn.getBoundingClientRect();

    const menu = document.createElement('div');
    menu.id = 'launcher-menu';
    menu.className = `
        fixed z-[9999] bg-[#e0e5ec] 
        p-4 rounded-2xl flex flex-col gap-3 w-64 
        border border-white/50 shadow-2xl pop-in
    `;

    const bottomPos = window.innerHeight - rect.top + 20; 
    const leftPos = rect.left;
    
    menu.style.bottom = `${bottomPos}px`;
    menu.style.left = `${leftPos}px`;

    menu.innerHTML = `
        <div class="pb-2 border-b border-gray-300/50 mb-1">
            <h3 class="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">Silenos Apps</h3>
        </div>
        <div class="flex flex-col gap-2" id="launcher-list">
        </div>
        
        <div class="mt-2 pt-2 border-t border-gray-300/50">
             <button onclick="toggleLauncher(); if(typeof openConfigWindow === 'function') openConfigWindow();" 
                class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/40 hover:shadow-sm transition-all text-left group">
                <div class="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center shadow-inner">
                    <i data-lucide="settings" class="w-4 h-4"></i>
                </div>
                <div class="flex flex-col">
                    <span class="text-sm font-bold text-gray-700 group-hover:text-gray-900">Configuración</span>
                    <span class="text-[10px] text-gray-500 leading-tight">API Keys y Preferencias</span>
                </div>
             </button>
        </div>
    `;

    document.body.appendChild(menu);

    const list = menu.querySelector('#launcher-list');
    
    SYSTEM_APPS.forEach(app => {
        const item = document.createElement('button');
        item.className = `
            flex items-center gap-3 p-3 rounded-xl 
            hover:bg-white/40 hover:shadow-sm transition-all text-left group
        `;
        item.onclick = () => {
            toggleLauncher(); 
            app.action();
        };

        item.innerHTML = `
            <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-inner">
                <i data-lucide="${app.icon}" class="w-4 h-4"></i>
            </div>
            <div class="flex flex-col">
                <span class="text-sm font-bold text-gray-700 group-hover:text-indigo-700">${app.title}</span>
                <span class="text-[10px] text-gray-500 leading-tight">${app.desc}</span>
            </div>
        `;
        list.appendChild(item);
    });

    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        document.addEventListener('click', function onClickOutside(ev) {
            const menuEl = document.getElementById('launcher-menu');
            const btnEl = document.getElementById('launcher-btn');
            if (menuEl && !menuEl.contains(ev.target) && !btnEl.contains(ev.target)) {
                toggleLauncher();
                document.removeEventListener('click', onClickOutside);
            }
        }, { once: true });
    }, 100);
}