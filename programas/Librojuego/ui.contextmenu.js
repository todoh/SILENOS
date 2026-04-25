// Archivo: Librojuego/ui.contextmenu.js

window.ContextMenu = {
    menuElement: null,
    currentNodeId: null,

    init() {
        this.menuElement = document.getElementById('omega-context-menu');
        if (!this.menuElement) {
            this.menuElement = document.createElement('div');
            this.menuElement.id = 'omega-context-menu';
            // Ampliamos el ancho a 520px para albergar la doble columna cómodamente
            this.menuElement.className = 'fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] hidden flex-col w-[520px] overflow-hidden text-xs font-sans transition-opacity duration-150 opacity-0';
            document.body.appendChild(this.menuElement);

            document.addEventListener('click', (e) => {
                if (e.button !== 2) this.hide();
            });

            document.addEventListener('contextmenu', e => {
                if (e.target && e.target.closest && e.target.closest('#canvas-container')) {
                    e.preventDefault();
                }
            });
        }
    },

    show(clientX, clientY, nodeId) {
        if (!this.menuElement) this.init();
        this.currentNodeId = nodeId;
        const menu = this.menuElement;

        // Estructura en doble columna
        menu.innerHTML = `
            <div class="px-3 py-2 bg-gray-900 border-b border-gray-800 text-[10px] font-bold uppercase tracking-widest text-white truncate shadow-md shrink-0">
                <i class="fa-solid fa-microchip mr-2 text-indigo-400"></i> NODO: ${nodeId}
            </div>

            <div class="flex max-h-[75vh] overflow-y-auto custom-scrollbar bg-white">
                
                <div class="flex-1 border-r border-gray-100 flex flex-col">
                    
                    <div class="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-b border-gray-100">🌿 Estructura</div>
                    
                    <button class="w-full text-left px-3 py-2 hover:bg-yellow-50 transition-colors flex items-center gap-2 text-yellow-700 font-bold border-b border-gray-100" onclick="ContextMenu.togglePin('${nodeId}')">
                        <i class="fa-solid fa-thumbtack w-4 text-center"></i> Marcar/Quitar Destino (Pin)
                    </button>

                    <button class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-600" onclick="ContextMenu.manualBifurcate(2)">
                        <i class="fa-solid fa-code-branch w-4 text-center"></i> Bifurcar a 2 (Manual)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-600" onclick="ContextMenu.manualBifurcate(3)">
                        <i class="fa-solid fa-sitemap w-4 text-center"></i> Trifurcar a 3 (Manual)
                    </button>
                    
                    <button class="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-2 text-indigo-700 font-bold" onclick="UIDirector.openModal('${nodeId}', 2)">
                        <i class="fa-solid fa-clapperboard w-4 text-center"></i> Bifurcar a 2 (Director IA)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-2 text-indigo-700 font-bold" onclick="UIDirector.openModal('${nodeId}', 3)">
                        <i class="fa-solid fa-clapperboard w-4 text-center"></i> Trifurcar a 3 (Director IA)
                    </button>

                    <button class="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-700 font-bold border-t border-red-50 bg-red-50/30" onclick="AICombat.generateCombatStructure('${nodeId}')">
                        <i class="fa-solid fa-khanda w-4 text-center text-red-600"></i> Estructura de Combate (IA)
                    </button>

                    <button class="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-2 text-indigo-700 font-bold border-t border-gray-100" onclick="AIAdvanced.generateFractal('${nodeId}')">
                        <i class="fa-solid fa-code-merge w-4 text-center"></i> Sub-trama Fractal (IA)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors flex items-center gap-2 text-indigo-700 font-bold border-b border-gray-50" onclick="AIAdvanced.generatePuzzle('${nodeId}')">
                        <i class="fa-solid fa-puzzle-piece w-4 text-center"></i> Puzle Múltiple (IA)
                    </button>

                    <div class="px-3 py-2 text-[9px] font-bold text-purple-600 uppercase tracking-widest bg-purple-50 border-y border-purple-100">🔮 Narrativa / Lore</div>
                    <button class="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-gray-700" onclick="AIEnhancer.completeNode('${nodeId}')">
                        <i class="fa-solid fa-pen-nib w-4 text-center text-purple-500"></i> Auto-Escribir (IA)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-gray-700" onclick="AILinks.rewriteLinks('${nodeId}')">
                        <i class="fa-solid fa-link w-4 text-center text-purple-500"></i> Reescribir Enlaces (IA)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-gray-700" onclick="AIBitacora.updateLogbook('${nodeId}')">
                        <i class="fa-solid fa-book-bookmark w-4 text-center text-purple-500"></i> Resumir en Bitácora (IA)
                    </button>
                    <div class="flex border-b border-gray-50 border-t border-gray-50">
                        <button class="flex-1 text-center px-2 py-2 hover:bg-gray-100 transition-colors text-[10px] text-gray-600 border-r border-gray-50" onclick="AIAdvanced.changePerspective('${nodeId}', 'primera')">1ª Pers (IA)</button>
                        <button class="flex-1 text-center px-2 py-2 hover:bg-gray-100 transition-colors text-[10px] text-gray-600" onclick="AIAdvanced.changePerspective('${nodeId}', 'tercera')">3ª Pers (IA)</button>
                    </div>
                    <button class="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-gray-700" onclick="AIAdvanced.analyzeTension('${nodeId}')">
                        <i class="fa-solid fa-heart-pulse w-4 text-center text-purple-500"></i> Radar Tensión Dramática
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-gray-700" onclick="AIAdvanced.extractLore('${nodeId}')">
                        <i class="fa-solid fa-book-journal-whills w-4 text-center text-purple-500"></i> Extraer Lore a Biblia
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-500 border-t border-gray-50" onclick="ContextMenu.clearText()">
                        <i class="fa-solid fa-eraser w-4 text-center"></i> Limpiar Texto
                    </button>
                </div>

                <div class="flex-1 flex flex-col">
                    
                    <div class="px-3 py-2 text-[9px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 border-b border-blue-100">🎨 Multimedia</div>
                    <button class="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 text-gray-700" onclick="VisualEngine.illustrateNode('${nodeId}')">
                        <i class="fa-solid fa-image w-4 text-center text-blue-500"></i> Generar Ilustración (IA)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 text-gray-700" onclick="AudioEngine.generateNodeAudio('${nodeId}')">
                        <i class="fa-solid fa-microphone w-4 text-center text-blue-500"></i> Locutar Escena (TTS)
                    </button>

                    <div class="px-3 py-2 text-[9px] font-bold text-red-600 uppercase tracking-widest bg-red-50 border-y border-red-100 mt-auto">⚙️ Mecánicas Analíticas</div>
                    <button class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-600" onclick="ContextMenu.setEffect('vida', '-', '3')">
                        <i class="fa-solid fa-skull w-4 text-center"></i> Trampa Rápida (-3 Vida)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-600" onclick="ContextMenu.setEffect('vida', '+', '5')">
                        <i class="fa-solid fa-campground w-4 text-center"></i> Santuario (+5 Vida)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-700 font-bold border-t border-gray-50" onclick="AIAdvanced.simulateMortality('${nodeId}')">
                        <i class="fa-solid fa-skull-crossbones w-4 text-center"></i> Simulador (1000 runs)
                    </button>

                    <div class="px-3 py-2 text-[9px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 border-y border-gray-200 mt-auto">🗺️ Organización Local</div>
                    
                    <button class="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors flex items-center gap-2 text-purple-700 font-bold" onclick="ContextMenu.setStartNode()">
                        <i class="fa-solid fa-flag w-4 text-center"></i> Empezar desde aquí
                    </button>

                    <button class="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors flex items-center gap-2 text-gray-600 border-t border-gray-50" onclick="ContextMenu.cloneNode()">
                        <i class="fa-solid fa-clone w-4 text-center"></i> Clonar Nodo (Plantilla)
                    </button>
                    <button class="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 border-t border-gray-50" onclick="ContextMenu.deleteNode()">
                        <i class="fa-solid fa-trash w-4 text-center"></i> Eliminar Nodo
                    </button>
                </div>
            </div>
        `;

        // Posicionamiento de seguridad inteligente
        menu.style.left = `${clientX}px`;
        menu.style.top = `${clientY}px`;
        menu.classList.remove('hidden');
        
        setTimeout(() => {
            menu.classList.remove('opacity-0');
            const rect = menu.getBoundingClientRect();
            let newLeft = clientX;
            let newTop = clientY;
            
            if (rect.right > window.innerWidth) newLeft = window.innerWidth - rect.width - 10;
            if (rect.bottom > window.innerHeight) newTop = window.innerHeight - rect.height - 10;
            
            if (newLeft < 10) newLeft = 10;
            if (newTop < 10) newTop = 10;

            menu.style.left = `${newLeft}px`;
            menu.style.top = `${newTop}px`;
        }, 10);
    },

    hide() {
        if (this.menuElement && !this.menuElement.classList.contains('hidden')) {
            this.menuElement.classList.add('opacity-0');
            setTimeout(() => this.menuElement.classList.add('hidden'), 150);
        }
    },

    /* --- FUNCIÓN PARA MARCAR NODO INICIAL --- */
    setStartNode() {
        const nodes = Core.book?.nodes || Core.bookData?.nodes || [];
        // Quitamos la marca a todos
        nodes.forEach(n => n.isStartNode = false);
        // Ponemos la marca al nodo actual
        const node = Core.getNode(this.currentNodeId);
        if (node) {
            node.isStartNode = true;
        }
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        if (typeof UI !== 'undefined' && UI.renderNodeList) UI.renderNodeList();
        if (Core.scheduleSave) Core.scheduleSave();
        this.hide();
    },

    /* --- FUNCIÓN PARA MARCAR PINES (GRAVEDAD) --- */
    togglePin(nodeId) {
        const node = Core.getNode(nodeId);
        if (!node) return;
        
        if (node.isPin) {
            node.isPin = false;
            node.pinName = "";
        } else {
            const name = prompt("Dale un nombre clave a este destino (Ej: Castillo del Rey, Templo de Fuego...):");
            if (name && name.trim() !== "") {
                node.isPin = true;
                node.pinName = name.trim();
            }
        }
        
        if (typeof Canvas !== 'undefined') Canvas.renderNodes();
        if (Core.scheduleSave) Core.scheduleSave();
        this.hide();
    },

    /* --- ACCIONES RÁPIDAS (MANUALES) --- */
    manualBifurcate(count) {
        const parent = Core.getNode(this.currentNodeId);
        if (!parent) return;

        if (!parent.choices) parent.choices = [];

        const startY = parent.y - ((count - 1) * 150);
        
        for (let i = 0; i < count; i++) {
            const childId = `nodo_${Math.random().toString(36).substr(2, 5)}`;
            Core.book.nodes.push({ 
                id: childId, 
                text: "Continúa la historia aquí...", 
                choices: [], 
                x: parent.x + 350, 
                y: startY + (i * 300), 
                scoreImpact: 0 
            });
            parent.choices.push({ text: `Opción ${i + 1}`, targetId: childId });
        }

        Canvas.render();
        Core.scheduleSave();
        this.hide();
    },

    cloneNode() {
        const source = Core.getNode(this.currentNodeId);
        if (!source) return;

        const cloneId = `nodo_${Math.random().toString(36).substr(2, 5)}`;
        const clone = JSON.parse(JSON.stringify(source));
        clone.id = cloneId;
        clone.choices = []; 
        clone.x = source.x;
        clone.y = source.y + 350; 
        
        delete clone._cachedImageUrl;
        delete clone._cachedAudioUrl;

        Core.book.nodes.push(clone);
        Canvas.render();
        Core.scheduleSave();
        this.hide();
    },

    clearText() {
        const node = Core.getNode(this.currentNodeId);
        if (node) {
            node.text = "";
            Canvas.renderNodes();
            if (Core.selectedNodeId === node.id && typeof Editor !== 'undefined') Editor.loadNode(node.id);
            Core.scheduleSave();
        }
        this.hide();
    },

    setEffect(type, op, val) {
        const node = Core.getNode(this.currentNodeId);
        if (node) {
            node.eff = { type, op, val };
            Canvas.renderNodes();
            if (Core.selectedNodeId === node.id && typeof Editor !== 'undefined') Editor.loadNode(node.id);
            Core.scheduleSave();
        }
        this.hide();
    },

    deleteNode() {
        Core.selectNode(this.currentNodeId);
        Core.deleteSelectedNode();
        this.hide();
    }
};

window.addEventListener('load', () => {
    if (window.ContextMenu) ContextMenu.init();
});