// PLANTILLAS DEL MOTOR DEL JUEGO (CONSTANTES NECESARIAS)
const GAME_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Juego Generado</title>
</head>
<body>
    <div id="game-container">
        <div id="interactive-elements">
            <div id="interactive-npcs"></div>
            <div id="interactive-objects"></div>
        </div>
        
        <div id="player-stats" class="ui-panel"></div>

        <div id="location-info" class="ui-panel">
            <h2 id="location-name"></h2>
            <div id="location-actions"></div>
        </div>

        <div id="log-container" class="ui-panel">
            <h3>Registro</h3>
            <div id="log-messages"></div>
        </div>
    </div>

    <div id="dialogue-modal" class="modal">
        <div class="modal-content">
            <div id="dialogue-npc-image"></div>
            <h3 id="dialogue-npc-name"></h3>
            <p id="dialogue-text"></p>
            <div id="dialogue-options"></div>
        </div>
    </div>
</body>
</html>`;

const GAME_CSS_TEMPLATE = `
html, body { 
    margin: 0; 
    padding: 0; 
    overflow: hidden; 
    font-family: sans-serif; 
    color: #eee;
}
#game-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    background-size: cover;
    background-position: center;
    transition: background-image 0.5s ease-in-out;
}
#interactive-elements { 
    position: absolute; 
    top: 0; left: 0; 
    width: 100%; height: 100%; 
    z-index: 10;
    pointer-events: none; /* Permite hacer clic a través de este contenedor */
}

/* --- ESTILO DEL NPC --- */
.npc {
    position: absolute;
    bottom: 0; /* Anclado a la parte inferior */
    left: 50%;
    transform: translateX(-50%); /* Centrado horizontalmente por defecto */
    height: 85vh; /* Altura de casi toda la pantalla */
    width: auto;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
    z-index: 15;
    pointer-events: all; /* El NPC sí se puede clickear */
}
.npc:hover { 
    transform: translateX(-50%) scale(1.05);
}
.npc img {
    height: 100%;
    width: auto;
    object-fit: contain; /* Mantiene la proporción de la imagen sin recortar */
    border: none; /* Sin marcos */
    /* Sombra para que el personaje se despegue del fondo */
    filter: drop-shadow(3px 5px 8px rgba(0,0,0,0.7));
}

/* --- ESTILO DE PANELES DE UI SUPERPUESTOS --- */
.ui-panel {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 10px 15px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(4px);
    z-index: 20;
}

#player-stats {
    top: 20px;
    left: 20px;
}
#location-info {
    top: 20px;
    right: 20px;
    text-align: right;
}
#log-container {
    bottom: 20px;
    left: 20px;
    width: 450px;
    max-width: 40%;
}
#log-messages { 
    height: 120px; 
    overflow-y: auto; 
    font-size: 0.9em;
    margin-top: 5px;
}

/* --- ESTILOS DEL MODAL (SIN CAMBIOS) --- */
.modal { display: none; position: fixed; z-index: 100; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); justify-content: center; align-items: center; }
.modal.active { display: flex; }
.modal-content { background: #222; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #444; }
#dialogue-npc-image img { width: 100px; height: 100px; border-radius: 50%; }
.dialogue-option { display: block; background: #444; color: #eee; padding: 10px; margin-top: 10px; border-radius: 5px; cursor: pointer; }
.dialogue-option:hover { background: #555; }`;

const GAME_UI_TEMPLATE = `
const ui = {
    init() {
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.dialogue-option')) {
                const npcId = e.target.closest('.dialogue-option').dataset.npcId;
                const optionIndex = e.target.closest('.dialogue-option').dataset.optionIndex;
                game.executeAction(game.npcs[npcId].options[optionIndex].action);
            }
            if (e.target.closest('.npc')) {
                this.showDialogue(e.target.closest('.npc').dataset.id);
            }
            if(e.target.closest('.object')) {
                game.executeAction({ function: 'collectObject', params: [e.target.closest('.object').dataset.id] });
            }
            if(e.target.closest('.action-btn')) {
                game.changeLocation(e.target.closest('.action-btn').dataset.target);
            }
        });
    },

    // --- FUNCIÓN MODIFICADA ---
    renderLocation(location) {
        // Ahora la imagen de fondo se aplica al contenedor principal
        document.getElementById('game-container').style.backgroundImage = \`url(\${location.image})\`;
        document.getElementById('location-name').textContent = location.name || game.currentLocation;
    },

    // --- FUNCIÓN MODIFICADA ---
    renderInteractiveElements(location) {
        const npcContainer = document.getElementById('interactive-npcs');
        npcContainer.innerHTML = (location.npcs || []).map(npcId => {
            const npc = game.npcs[npcId];
            // Usa la posición X del editor para desplazar al NPC del centro.
            const leftPosition = npc.x ? \`left: \${npc.x}%;\` : 'left: 50%;';
            return \`<div class="npc" data-id="\${npcId}" style="\${leftPosition}">
                        <img src="\${npc.image}" title="\${npc.name}">
                    </div>\`;
        }).join('');
        
        // La lógica de los objetos permanece, aunque puedes querer ajustarla también
        const objectContainer = document.getElementById('interactive-objects');
        objectContainer.innerHTML = (location.objects || []).map(objectId => {
            const object = game.items[objectId];
            return \`<div class="object" data-id="\${objectId}" style="top: \${object.y || '70'}%; left: \${object.x || '30'}%; width: 50px; position: absolute; cursor: pointer; pointer-events: all; z-index: 16;"><img src="\${object.image}" title="\${object.name}" style="width:100%;"></div>\`;
        }).join('');
    },
    
    // --- RESTO DE FUNCIONES (SIN CAMBIOS) ---
    renderLocationActions(location) {
        const actionsContainer = document.getElementById('location-actions');
        if (!actionsContainer) return;
        actionsContainer.innerHTML = (location.actions || []).map(action => \`
            <div class="action-btn" data-target="\${action.target}">
                <img src="\${action.image}" title="Ir a \${action.target}">
            </div>
        \`).join('');
    },
    renderPlayerStats(player) {
        document.getElementById('player-stats').innerHTML = \`
            <p>❤️ Salud: \${player.health} / \${player.maxHealth}</p>
            <p>⚡ Energía: \${player.energy}</p>
            <p>💰 Oro: \${player.gold}</p>
        \`;
    },
    updateLog(message) {
        const log = document.getElementById('log-messages');
        if (log) log.innerHTML += \`<div>> \${message}</div>\`;
        if (log) log.scrollTop = log.scrollHeight;
    },
    showDialogue(npcId) {
        const npc = game.npcs[npcId];
        const modal = document.getElementById('dialogue-modal');
        if (!npc || !modal) return;
        document.getElementById('dialogue-npc-image').innerHTML = \`<img src="\${npc.image}">\`;
        document.getElementById('dialogue-npc-name').textContent = npc.name;
        document.getElementById('dialogue-text').textContent = npc.dialogue;
        document.getElementById('dialogue-options').innerHTML = (npc.options || []).map((opt, i) => \`
            <div class="dialogue-option" data-npc-id="\${npcId}" data-option-index="\${i}">\${opt.text}</div>\`).join('');
        this.toggleModal('dialogue-modal', true);
    },
    toggleModal(id, show) {
        const modal = document.getElementById(id);
        if(modal) modal.style.display = show ? 'flex' : 'none';
    }
};`;

const GAME_MAIN_TEMPLATE = `
document.addEventListener('DOMContentLoaded', () => {
    const game = {
        player: { health: 100, maxHealth: 100, energy: 50, gold: 10, inventory: [], deck: [] },
        currentLocation: null,
        questStates: {},
        init() {
            Object.assign(this, gameData);
            this.currentLocation = this.settings.initialLocation;
            this.player.deck.push('hacha', 'pico'); // Initial deck
            ui.init();
            this.changeLocation(this.currentLocation);
            this.updateLog('Bienvenido al juego.');
        },
        changeLocation(locationId) {
            if (!this.locations[locationId]) return console.error(\`La ubicación "\${locationId}" no existe.\`);
            this.currentLocation = locationId;
            const location = this.locations[locationId];
            ui.renderLocation(location);
            ui.renderInteractiveElements(location);
            ui.renderLocationActions(location);
            ui.renderPlayerStats(this.player);
        },
        executeAction(actionData) {
            if (!actionData || !actionData.function) return;
            const actionToRun = gameActions[actionData.function];
            if (actionToRun) {
                actionToRun(actionData.params);
            } else {
                console.error(\`La acción "\${actionData.function}" no existe en gameActions.\`);
            }
        },
        addItem(itemId) { this.player.inventory.push(itemId); },
        removeItem(itemId) {
            const index = this.player.inventory.indexOf(itemId);
            if(index > -1) this.player.inventory.splice(index, 1);
        },
        addCardToLibrary(cardId) { this.player.deck.push(cardId); this.updateLog(\`Has obtenido la carta: \${this.cards[cardId].name}.\`)},
        updateLog(message) { ui.updateLog(message); }
    };
    window.game = game;
    game.init();
});`;

// --- FIN DE LAS PLANTILLAS ---

document.addEventListener('DOMContentLoaded', () => {
    // Definición del objeto editor unificada y corregida
    window.editor = {
        data: {
            settings: { initialLocation: '' },
            locations: {},
            npcs: {},
            items: {},
            cards: {}
        },
        currentEdit: { type: null, id: null },

        // MÉTODOS DE INICIALIZACIÓN Y EVENTOS
        init() {
            if (window.pendingInteractiveData) {
        this.data = window.pendingInteractiveData;
        delete window.pendingInteractiveData; // Limpiar para futuras cargas
    }
            this.initNav();
            this.initButtons();
            this.renderAll();
        },

        initButtons() {
            // Asignación de eventos a los botones principales
            document.getElementById('btn-add-location').addEventListener('click', () => this.showEditModal('locations'));
            document.getElementById('btn-add-npc').addEventListener('click', () => this.showEditModal('npcs'));
            document.getElementById('btn-add-item').addEventListener('click', () => this.showEditModal('items'));
            document.getElementById('btn-add-card').addEventListener('click', () => this.showEditModal('cards'));
            
            // Botones de Importar/Exportar
            document.getElementById('btn-load-data').addEventListener('click', () => this.loadData());
            document.getElementById('btn-export-data').addEventListener('click', () => this.exportData());
            document.getElementById('btn-export-game').addEventListener('click', () => this.exportFullGame());

            // Botones del modal
            document.getElementById('btn-save-modal').addEventListener('click', () => this.saveModalData());
            document.querySelectorAll('.btn-close').forEach(btn => btn.addEventListener('click', () => this.closeModal()));
        },

        initNav() {
            const nav = document.getElementById('main-nav');
            const initialTab = 'settings';
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            nav.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            document.getElementById(`tab-${initialTab}`).classList.add('active');
            nav.querySelector(`button[data-tab='${initialTab}']`).classList.add('active');

            nav.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    const tabId = e.target.dataset.tab;
                    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                    nav.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                    document.getElementById(`tab-${tabId}`).classList.add('active');
                    e.target.classList.add('active');
                }
            });
        },

        // MÉTODOS DE GESTIÓN DE DATOS (IO)
        loadData() {
            const dataString = document.getElementById('io-data').value;
            if (!dataString.trim()) return alert('El área de texto está vacía.');
            try {
                const jsonString = dataString.substring(dataString.indexOf('{'), dataString.lastIndexOf('}') + 1);
                const parsedData = JSON.parse(jsonString);
                this.data = { ...this.data, ...parsedData };
                this.renderAll();
                alert('Datos cargados correctamente.');
            } catch (error) {
                console.error('Error al parsear los datos:', error);
                alert('Error al procesar los datos.');
            }
        },

        exportData() {
            const output = `const gameData = ${JSON.stringify(this.data, null, 4)};`;
            this.downloadFile('datos.js', output, 'text/javascript');
        },

        exportFullGame() {
            console.log("Iniciando exportación del juego completo...");

            // --- INICIO DE LA CORRECCIÓN ---
            // 1. Crear una copia profunda de los datos para no modificar el editor original.
            const gameDataForExport = JSON.parse(JSON.stringify(this.data));

            // 2. Asegurarse de que las imágenes estén incluidas (opcional pero recomendado si hay problemas)
            // Esta parte asume que tus datos ya tienen las imágenes en Base64. Si no, habría que añadirlas aquí.
            // Por ahora, la copia profunda debería ser suficiente si las imágenes se guardan correctamente en el editor.
            
            // 3. Usar la copia de los datos para la exportación.
            const dataScript = `const gameData = ${JSON.stringify(gameDataForExport, null, 4)};`;
            // --- FIN DE LA CORRECCIÓN ---

            let actionsScript = 'const gameActions = {};';
            if(window.gameActions) {
                actionsScript = 'const gameActions = {\n';
                for (const key in window.gameActions) {
                    if (typeof window.gameActions[key] === 'function') {
                        actionsactionsScript += `    ${key}: ${window.gameActions[key].toString()},\n`;
                    }
                }
                actionsScript += '};';
            }

            // El resto de la función permanece igual
            const allScripts = `
                <script>${dataScript}<\/script>
                <script>${actionsScript}<\/script>
                <script>${(typeof GAME_UI_TEMPLATE !== 'undefined') ? GAME_UI_TEMPLATE : ''}<\/script>
                <script>${(typeof GAME_MAIN_TEMPLATE !== 'undefined') ? GAME_MAIN_TEMPLATE : ''}<\/script>
            `;
            
            let finalHTML = (typeof GAME_HTML_TEMPLATE !== 'undefined') ? GAME_HTML_TEMPLATE : '<!DOCTYPE html><html><head><title>Error</title></head><body>Error: Plantilla no encontrada</body></html>';
            finalHTML = finalHTML.replace('</head>', `<style>${(typeof GAME_CSS_TEMPLATE !== 'undefined') ? GAME_CSS_TEMPLATE : ''}</style></head>`);
            finalHTML = finalHTML.replace('</body>', `${allScripts}</body>`);
            
            this.downloadFile('juego.html', finalHTML, 'text/html');
            console.log("Exportación completada.");
        },
        
        downloadFile(filename, text, mimeType) {
            const element = document.createElement('a');
            const blob = new Blob([text], { type: mimeType });
            element.href = URL.createObjectURL(blob);
            element.download = filename;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            URL.revokeObjectURL(element.href);
        },

        // MÉTODOS DE RENDERIZADO Y UI
        renderAll() {
            this.renderSettings();
            this.renderSection('locations');
            this.renderSection('npcs');
            this.renderSection('items');
            this.renderSection('cards');
        },

        renderSettings() {
            const container = document.getElementById('settings-form');
            container.innerHTML = editorUI.getSettingsTabHTML(this.data.locations, this.data.settings);
            container.querySelector('#setting-initial-location').addEventListener('change', (e) => {
                this.data.settings.initialLocation = e.target.value;
            });
        },

        renderSection(type) {
            const list = document.getElementById(`${type}-list`);
            list.innerHTML = '';
            for (const id in this.data[type]) {
                const item = this.data[type][id];
                const entry = document.createElement('li');
                entry.className = 'item-list-entry';
                let displayName = item.name || id;
                const imagePreview = item.image ? `<img src="${item.image}" class="list-item-preview">` : `<div class="list-item-preview"></div>`;
                entry.innerHTML = `<div class="item-info"> ${imagePreview} <div><span class="id">${id}</span> - ${displayName}</div></div>
                    <div>
                        ${type === 'locations' ? `<button class="btn btn-edit-scene" data-type="${type}" data-id="${id}">Editar Escena</button>` : ''}
                        <button class="btn btn-edit" data-type="${type}" data-id="${id}">Editar</button>
                        <button class="btn btn-delete" data-type="${type}" data-id="${id}">Eliminar</button>
                    </div>`;
                list.appendChild(entry);
            }
            list.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => this.showEditModal(e.target.dataset.type, e.target.dataset.id)));
            list.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => this.deleteItem(e.target.dataset.type, e.target.dataset.id)));
            list.querySelectorAll('.btn-edit-scene').forEach(btn => btn.addEventListener('click', (e) => this.showEditModal(e.target.dataset.type, e.target.dataset.id, true)));
        },

        deleteItem(type, id) {
            if (confirm(`¿Seguro que quieres eliminar "${id}"?`)) {
                delete this.data[type][id];
                this.renderSection(type);
                if (type === 'locations') this.renderSettings();
            }
        },

        // MÉTODOS DEL MODAL
        showEditModal(type, id = null, isSceneEditor = false) {
            this.currentEdit = { type, id };
            const modal = document.getElementById('edit-modal');
            const modalTitle = document.getElementById('modal-title');
            const modalBody = document.getElementById('modal-body');
            modalTitle.textContent = id ? `Editando ${type}: ${id}` : `Añadir ${type.slice(0, -1)}`;
            if (isSceneEditor) modalTitle.textContent = `Editor de Escena: ${id}`;
            modalBody.innerHTML = editorUI.getModalFormHTML(type, id, this.data, isSceneEditor);
            modal.classList.add('active');
            this.attachModalListeners(modalBody);
        },

        closeModal() {
            document.getElementById('edit-modal').classList.remove('active');
        },

        saveModalData() {
            const { type, id } = this.currentEdit;
            const form = document.getElementById('modal-body');
            const newIdInput = form.querySelector('#edit-id');
            const newId = newIdInput ? newIdInput.value.trim().replace(/\\s+/g, '_') : null;
            if (!id && !newId) return alert('El campo ID es obligatorio.');
            if (!id && this.data[type][newId]) return alert(`Ya existe un elemento con el ID "${newId}".`);
            const finalId = id || newId;
            if (!this.data[type][finalId]) this.data[type][finalId] = {};
            const itemData = this.data[type][finalId];
            form.querySelectorAll('[data-key]').forEach(input => {
                const key = input.dataset.key;
                const valueType = input.dataset.valuetype;
                if(valueType === 'array') {
                    itemData[key] = Array.from(input.selectedOptions).map(opt => opt.value);
                } else {
                    itemData[key] = input.value;
                }
            });
            if (type === 'npcs') {
                itemData.options = [];
                form.querySelectorAll('.dialogue-option-row').forEach(row => {
                    const text = row.querySelector('.dialogue-option-text').value;
                    if (!text) return;
                    const actionEditor = row.querySelector('.action-editor-container');
                    const funcName = actionEditor.querySelector('.action-function-selector').value;
                    const params = Array.from(actionEditor.querySelectorAll('.action-param')).map(input => input.value);
                    itemData.options.push({ text: text, action: { function: funcName, params: params } });
                });
            }
            if (type === 'items') {
                const actionEditor = form.querySelector('#item-action-container .action-editor-container');
                const funcName = actionEditor.querySelector('.action-function-selector').value;
                if (funcName) {
                    const params = Array.from(actionEditor.querySelectorAll('.action-param')).map(input => input.value);
                    itemData.action = { function: funcName, params: params };
                } else {
                    delete itemData.action;
                }
            }
            this.renderSection(type);
            if (type === 'locations') this.renderSettings();
            this.closeModal();
        },

        attachModalListeners(modalBody) {
            modalBody.querySelectorAll('.btn-upload').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.target.closest('.image-uploader').querySelector('.image-input').click();
                });
            });
            modalBody.querySelectorAll('.image-input').forEach(input => {
                input.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const base64 = await this.fileToBase64(file);
                        const uploaderDiv = e.target.closest('.image-uploader');
                        uploaderDiv.querySelector('.image-preview').src = base64;
                        uploaderDiv.querySelector('input[type=hidden]').value = base64;
                    }
                });
            });
            modalBody.querySelectorAll('.action-function-selector').forEach(selector => {
                selector.addEventListener('change', (e) => {
                    const funcName = e.target.value;
                    const paramsContainer = e.target.closest('.action-editor-container').querySelector('.action-params');
                    paramsContainer.innerHTML = '';
                    if (funcName && gameActionsMetadata[funcName]) {
                        const metadata = gameActionsMetadata[funcName];
                        paramsContainer.innerHTML = metadata.params.map(paramLabel => `<div class="form-group"><label>${paramLabel}</label><input type="text" class="action-param"></div>`).join('');
                    }
                });
            });
            const btnAddOption = document.getElementById('btn-add-dialogue-option');
            if (btnAddOption) {
                btnAddOption.addEventListener('click', () => {
                    const container = document.getElementById('dialogue-options-container');
                    const newIndex = container.querySelectorAll('.dialogue-option-row').length;
                    const newRow = document.createElement('div');
                    newRow.className = 'dialogue-option-row';
                    newRow.dataset.index = newIndex;
                    newRow.innerHTML = `<div class="form-group"><label>Texto de la Opción</label><input type="text" class="dialogue-option-text"></div><label>Acción de la Opción</label>${editorUI.getActionEditorHTML({}, newIndex)}<button type="button" class="btn btn-delete btn-delete-option">Eliminar Opción</button>`;
                    container.appendChild(newRow);
                    this.attachModalListeners(newRow);
                });
            }
            modalBody.querySelectorAll('.btn-delete-option').forEach(btn => {
                btn.addEventListener('click', (e) => e.target.closest('.dialogue-option-row').remove());
            });
        },

        fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });
        }
    };

    // Iniciar el editor
    editor.init();
});