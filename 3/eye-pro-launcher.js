/* SILENOS 3 / eye-pro-launcher.js */
// H -> RECONFIGURACIÓN DE LA VISIÓN (B) PARA ACCESO DIRECTO A LA MATERIA (M)
// Optimización Estética: Tienda Minimalista sin persistencia en Escritorio.

(function() {
    // Definición de la Materia Pro (M) 
    const APP_PRO_DATA = {
        "id": "program-github-repo-v3",
        "type": "executable",
        "title": "Aplicaciones de SILENOS",
        "parentId": "desktop",
        "icon": "store",
        "color": "text-black-500",
        "content": {
            "nodes": [
                { "id": "node-start", "type": "start", "x": 50, "y": 50, "inputs": [], "outputs": ["out"] },
                { 
                    "id": "node-store-v3", "type": "github-store-v3", "x": 300, "y": 50, 
                    "inputs": ["open"], "outputs": ["done"],
                    "values": { "base_url": "https://api.github.com/repos/todoh/silenos3/contents/aplicaciones" }
                }
            ],
            "connections": [
                { "fromNode": "node-start", "fromPort": "out", "toNode": "node-store-v3", "toPort": "open" }
            ],
            "embeddedModules": [
                {
                    "id": "github-store-v3",
                    "title": "GitHub Store Fixed",
                    "color": "#1e293b",
                    "code": `
                        const winId = 'github-store-v3-window';
                        const existing = document.getElementById(winId);
                        if (existing) { existing.remove(); return; }

                        const styleId = 'github-store-styles';
                        if (!document.getElementById(styleId)) {
                            const style = document.createElement('style');
                            style.id = styleId;
                            style.innerHTML = \`
                                .silen-scroll::-webkit-scrollbar { width: 4px; }
                                .silen-scroll::-webkit-scrollbar-track { background: transparent; }
                                .silen-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                                .app-card {
                                    position: relative;
                                    padding: 16px;
                                    border-radius: 24px;
                                    background: #e0e5ec;
                                    box-shadow: 8px 8px 16px #bebebe, -8px -8px 16px #ffffff;
                                    transition: all 0.3s ease;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: space-between;
                                    min-height: 100px;
                                    border: 1px solid rgba(255,255,255,0.4);
                                }
                                .app-card:hover {
                                    box-shadow: 4px 4px 8px #bebebe, -4px -4px 8px #ffffff;
                                    transform: translateY(-2px);
                                }
                                .dl-btn-mini {
                                    position: absolute;
                                    bottom: 12px;
                                    right: 12px;
                                    width: 32px;
                                    height: 32px;
                                    border-radius: 10px;
                                    border: none;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    cursor: pointer;
                                    font-weight: 900;
                                    font-size: 0.7rem;
                                    box-shadow: 4px 4px 8px #bebebe, -4px -4px 8px #ffffff;
                                    transition: 0.2s;
                                }
                                .dl-btn-mini:active {
                                    box-shadow: inset 2px 2px 5px #bebebe, inset -2px -2px 5px #ffffff;
                                }
                            \`;
                            document.head.appendChild(style);
                        }

                        const win = document.createElement('div');
                        win.id = winId;
                        win.className = 'window pop-in pointer-events-auto';
                        win.style.cssText = 'position:absolute; top:40px; left:50px; width:1100px; height:720px; z-index:9999; display:flex; flex-direction:column; background:#e0e5ec; border-radius:40px; box-shadow: 30px 30px 60px #bebebe, -30px -30px 60px #ffffff; overflow:hidden; font-family:sans-serif;';

                        const header = document.createElement('div');
                        header.style.cssText = 'padding:25px 40px; display:flex; justify-content:space-between; align-items:center; cursor:grab; background:transparent; color:#1e293b; flex-shrink:0;';
                        header.innerHTML = \`
                            <div style="display:flex; align-items:center; gap:15px;">
                                <div style="width:12px; height:12px; background:#6366f1; border-radius:50%;"></div>
                                <span style="font-weight:900; font-size:1rem; letter-spacing:1px; text-transform:uppercase; opacity:0.8;">Materia Store</span>
                            </div>
                            <button id="close-\${winId}" style="border:none; background:#e0e5ec; width:35px; height:35px; border-radius:50%; box-shadow: 4px 4px 8px #bebebe, -4px -4px 8px #ffffff; cursor:pointer; font-size:1.2rem; color:#ef4444; display:flex; align-items:center; justify-content:center;">×</button>
                        \`;

                        const mainArea = document.createElement('div');
                        mainArea.style.cssText = 'padding:0 30px 30px 30px; flex:1; display:grid; grid-template-columns: repeat(4, 1fr); gap:25px; overflow:hidden;';

                        const createColumn = (title, folderName, icon, accentColor) => {
                            const col = document.createElement('div');
                            col.style.cssText = 'display:flex; flex-direction:column; gap:20px; height:100%; min-height:0;';
                            
                            const colHeader = document.createElement('div');
                            colHeader.style.cssText = 'padding:10px 5px; font-weight:900; font-size:0.75rem; color:#64748b; text-transform:uppercase; letter-spacing:2px; display:flex; align-items:center; gap:10px; flex-shrink:0;';
                            colHeader.innerHTML = \`<i data-lucide="\${icon}" style="width:18px; color:\${accentColor}"></i> \${title}\`;
                            
                            const listContainer = document.createElement('div');
                            listContainer.className = 'silen-scroll';
                            listContainer.style.cssText = 'flex:1; padding:5px; overflow-y:auto; display:flex; flex-direction:column; gap:20px; min-height:0;';
                            
                            col.append(colHeader, listContainer);
                            mainArea.appendChild(col);
                            fetchData(folderName, listContainer, accentColor);
                        };

                        async function fetchData(folder, container, color) {
                            container.innerHTML = '<div style="font-size:0.6rem; color:#aaa; text-align:center; margin-top:20px; letter-spacing:2px;">SINCRONIZANDO (U)...</div>';
                            try {
                                const apiURL = ctx.fields.base_url + '/' + folder;
                                const response = await fetch(apiURL);
                                const files = await response.json();
                                if (!Array.isArray(files)) { container.innerHTML = '<div style="font-size:0.6rem; color:#ef4444; text-align:center;">VACIÓ</div>'; return; }
                                container.innerHTML = "";
                                
                                files.forEach(file => {
                                    if (!file.name.endsWith('.json')) return;
                                    const name = file.name.replace('.json', '').replace(/_/g, ' ');
                                    
                                    const item = document.createElement('div');
                                    item.className = 'app-card';
                                    
                                    item.innerHTML = \`
                                        <div style="display:flex; flex-direction:column; gap:4px;">
                                            <div style="font-size:0.55rem; color:\${color}; font-weight:bold; text-transform:uppercase; opacity:0.7;">App</div>
                                            <div style="font-weight:800; font-size:0.8rem; color:#1e293b; line-height:1.2; padding-right:20px;">\${name}</div>
                                        </div>
                                        <div style="font-size:0.6rem; color:#94a3b8;">v1.0.0</div>
                                        <button class="dl-btn-mini" style="background:\${color}; color:white;" title="Instalar">
                                            <i data-lucide="download" style="width:14px; height:14px;"></i>
                                        </button>
                                    \`;

                                    const btn = item.querySelector('.dl-btn-mini');
                                    btn.onclick = async () => {
                                        btn.innerHTML = '<div style="width:10px; height:10px; border:2px solid white; border-top-color:transparent; border-radius:50%; animation:spin 1s linear infinite;"></div>';
                                        try {
                                            const raw = await fetch(file.download_url);
                                            const appData = await raw.json();
                                            if (typeof FileSystem !== 'undefined') {
                                                const newProg = FileSystem.createProgram(appData.title || name, 'desktop');
                                                newProg.type = appData.type || "executable";
                                                newProg.icon = appData.icon || "package";
                                                newProg.color = appData.color || "text-slate-600";
                                                newProg.content = appData.content || appData;
                                                FileSystem.save();
                                                if (typeof refreshSystemViews === 'function') refreshSystemViews();
                                                btn.style.background = "#22c55e";
                                                btn.innerHTML = '<i data-lucide="check" style="width:14px"></i>';
                                            }
                                        } catch (e) { btn.style.background = "#ef4444"; btn.innerHTML = "!"; }
                                    };
                                    container.appendChild(item);
                                });
                                if (window.lucide) lucide.createIcons();
                            } catch (err) { container.innerHTML = '<div style="font-size:0.6rem; color:#ef4444; text-align:center;">ERROR (A)</div>'; }
                        }

                        if(!document.getElementById('silen-spin-style')){
                            const s = document.createElement('style');
                            s.id = 'silen-spin-style';
                            s.innerHTML = '@keyframes spin { to { transform: rotate(360deg); } }';
                            document.head.appendChild(s);
                        }

                        createColumn("IA", "Inteligencia-Artificial", "brain-circuit", "#6366f1");
                        createColumn("Utilidades", "Utilidades", "wrench", "#f59e0b");
                        createColumn("Videojuegos", "Videojuegos", "gamepad-2", "#ec4899");
                        createColumn("Artes", "Artes", "palette", "#8b5cf6");

                        win.append(header, mainArea);
                        document.body.appendChild(win);
                        if (window.lucide) lucide.createIcons();

                        let d=false, o={x:0,y:0};
                        header.onmousedown=(e)=>{ if(e.target.id.includes('close'))return; d=true; o.x=e.clientX-win.offsetLeft; o.y=e.clientY-win.offsetTop; };
                        window.addEventListener('mousemove',(e)=>{ if(!d)return; win.style.left=(e.clientX-o.x)+'px'; win.style.top=(e.clientY-o.y)+'px'; });
                        window.addEventListener('mouseup',()=>{ d=false; });
                        document.getElementById('close-' + winId).onclick = () => win.remove();
                    `
                }
            ]
        }
    };

    /**
     * REDEFINICIÓN DE TOGGLELAUNCHER (A)
     * Ejecución directa de la Materia sin registro en FileSystem (E).
     */
    function injectProLauncher() {
        console.log("B -> Resonancia focalizada en Materia Store (Volátil).");

        window.toggleLauncher = async function() {
            // Cerramos cualquier menú previo si existe
            const existingMenu = document.getElementById('launcher-menu');
            if (existingMenu) existingMenu.remove();

            // Localizamos el módulo y sus valores de configuración
            const storeModule = APP_PRO_DATA.content.embeddedModules.find(m => m.id === 'github-store-v3');
            const storeNode = APP_PRO_DATA.content.nodes.find(n => n.id === 'node-store-v3');

            if (storeModule && storeNode) {
                try {
                    // Creamos el contexto (ctx) que el código interno espera
                    const ctx = {
                        fields: storeNode.values
                    };

                    // Ejecución inmediata del código del módulo
                    // Esto abre la ventana sin crear archivos en el escritorio
                    const executeStore = new Function('ctx', storeModule.code);
                    executeStore(ctx);
                    
                } catch (error) {
                    console.error("L -> Error en la ejecución de la Materia:", error);
                }
            } else {
                console.error("L -> Estructura de Materia Pro no encontrada.");
            }
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectProLauncher);
    } else {
        setTimeout(injectProLauncher, 100);
    }

    console.log("H -> Lógica del Ojo blindada para Visión Pro (Sin Huella).");
})();