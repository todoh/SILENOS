/* NEXUS SILENOS/maps_ui.js */
/**
 * MAP UI V6.1 - INTERFACE + BACKGROUND SUPPORT
 * Gestión del DOM, Sidebar y Botones.
 */

class MapUI {
    constructor(system) {
        this.system = system; // Referencia al Core (MapManager)
        this.container = null;
    }

    mount(container) {
        this.container = container;
        this.renderLayout();
        this.bindEvents();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="map-editor-wrapper">
                <div class="map-sidebar">
                    <div class="sidebar-header">EXPLORADOR</div>
                    
                    <div style="padding:10px; display:flex; flex-direction:column; gap:8px;">
                        <button id="btnNewMap" class="btn primary" style="width:100%">＋ NUEVO MAPA</button>
                        
                        <div style="display:flex; gap:5px;">
                            <button id="btnExportMap" class="btn" style="flex:1; font-size:0.75rem;" title="Descargar JSON">⬇ EXPORTAR</button>
                            <button id="btnImportMap" class="btn" style="flex:1; font-size:0.75rem;" title="Cargar JSON">⬆ IMPORTAR</button>
                        </div>
                        <input type="file" id="mapImportInput" style="display:none" accept=".json">
                    </div>
                    
                    <div id="mapList" class="map-list-container"></div>

                    <div id="propPanel" class="properties-panel hidden">
                        <div class="sidebar-header" style="padding-left:0; border:none; color:#00acc1;" id="propHeader">PROPIEDADES</div>
                        
                        <div id="mapSettingsGroup">
                            <div class="prop-group">
                                <label class="prop-label">NOMBRE DEL MAPA</label>
                                <input type="text" id="mapNameInput" class="prop-input">
                            </div>
                            <div style="display:flex; gap:10px; margin-top:5px;">
                                <div class="prop-group" style="flex:1">
                                    <label class="prop-label">ANCHO (PX)</label>
                                    <input type="number" id="mapWidthInput" class="prop-input">
                                </div>
                                <div class="prop-group" style="flex:1">
                                    <label class="prop-label">ALTO (PX)</label>
                                    <input type="number" id="mapHeightInput" class="prop-input">
                                </div>
                            </div>
                            
                            <div class="prop-group" style="margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
                                <label class="prop-label">IMAGEN DE FONDO (CALCO)</label>
                                <input type="file" id="mapBgInput" class="prop-input" accept="image/*" style="font-size:0.7rem;">
                                <button id="btnRemoveBg" class="btn danger" style="margin-top:5px; font-size:0.7rem; padding:4px;">QUITAR FONDO</button>
                            </div>

                            <div style="display:flex; gap:10px; margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
                                <button id="btnDupMap" class="btn" style="flex:1; font-size:0.7rem; color:#27ae60;">DUPLICAR</button>
                                <button id="btnDelMap" class="btn danger" style="flex:1; font-size:0.7rem;">ELIMINAR MAPA</button>
                            </div>
                        </div>

                        <div id="objSettingsGroup" style="display:none;">
                            <div class="prop-group">
                                <label class="prop-label">ETIQUETA / NOMBRE</label>
                                <input type="text" id="propName" class="prop-input">
                            </div>

                            <div class="prop-group" id="propTypeGroup">
                                <label class="prop-label">TIPO / BIOMA</label>
                                <select id="propType" class="prop-input">
                                    <option value="plain">Llano (Blanco)</option>
                                    <option value="water">Agua (Azul)</option>
                                    <option value="forest">Bosque (Verde)</option>
                                    <option value="mountain">Montaña (Gris)</option>
                                    <option value="danger">Peligro (Rojo)</option>
                                    <option value="dot">Punto (POI)</option>
                                </select>
                            </div>
                            
                            <div class="prop-group" id="layerControls">
                                <label class="prop-label">ORDEN DE CAPAS</label>
                                <div class="layer-actions">
                                    <button class="layer-btn" id="btnLayerBack" title="Enviar al Fondo">▼ FONDO</button>
                                    <button class="layer-btn" id="btnLayerFront" title="Traer al Frente">▲ FRENTE</button>
                                </div>
                            </div>

                            <div style="margin-top:20px; display:flex; gap:10px;">
                                <button id="btnDeleteObj" class="btn danger" style="flex:1; font-size:0.8rem;">ELIMINAR OBJETO</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="map-canvas-area" id="mapCanvasContainer">
                    <canvas id="mapEditorCanvas"></canvas>
                    
                    <div class="map-toolbar">
                        <div class="tool-group">
                            <button class="tool-btn active" data-tool="SELECT" data-title="Seleccionar / Editar (V)">🖱️</button>
                            <button class="tool-btn" data-tool="PAN" data-title="Mover Cámara (Espacio)">✋</button>
                        </div>
                        <div class="vr"></div>
                        <div class="tool-group">
                            <button class="tool-btn" data-tool="POLY" data-title="Dibujar Región (P)">✏️</button>
                            <button class="tool-btn" data-tool="POINT" data-title="Añadir Lugar (L)">📍</button>
                        </div>
                        <div class="vr"></div>
                        <div class="tool-group" id="terrainTools">
                            <div class="terrain-swatch bg-plain active" data-type="plain" title="Llano"></div>
                            <div class="terrain-swatch bg-water" data-type="water" title="Agua"></div>
                            <div class="terrain-swatch bg-forest" data-type="forest" title="Bosque"></div>
                            <div class="terrain-swatch bg-mountain" data-type="mountain" title="Montaña"></div>
                            <div class="terrain-swatch bg-danger" data-type="danger" title="Peligro"></div>
                        </div>
                    </div>

                    <div class="map-info-overlay">
                        <span id="coordDisplay">X: 0 Y: 0</span>
                        <span id="zoomDisplay">100%</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        const C = this.container;

        // ACCIONES GLOBALES
        C.querySelector('#btnNewMap').onclick = () => this.system.createMap();
        
        // ACCIONES GESTIÓN MAPA
        C.querySelector('#btnDupMap').onclick = () => this.system.duplicateActiveMap();
        C.querySelector('#btnDelMap').onclick = () => this.system.deleteActiveMap();
        
        // I/O BINDING
        C.querySelector('#btnExportMap').onclick = () => this.system.io.downloadCurrentMap();
        C.querySelector('#btnImportMap').onclick = () => document.getElementById('mapImportInput').click();
        C.querySelector('#mapImportInput').onchange = (e) => this.system.io.uploadMap(e);

        // MAP SETTINGS
        const mapNameIn = C.querySelector('#mapNameInput');
        const mapWIn = C.querySelector('#mapWidthInput');
        const mapHIn = C.querySelector('#mapHeightInput');
        const mapBgIn = C.querySelector('#mapBgInput');
        const btnRemoveBg = C.querySelector('#btnRemoveBg');

        const updateMapData = () => {
            const map = this.system.getActiveMap();
            if(map) {
                map.name = mapNameIn.value;
                map.width = parseInt(mapWIn.value) || 2000;
                map.height = parseInt(mapHIn.value) || 2000;
                this.system.saveData();
                this.refreshList();
            }
        };
        mapNameIn.onchange = updateMapData;
        mapWIn.onchange = updateMapData;
        mapHIn.onchange = updateMapData;

        // MANEJO DE IMAGEN DE FONDO
        mapBgIn.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const map = this.system.getActiveMap();
                if(map) {
                    map.backgroundImage = evt.target.result; // Guardar base64
                    this.system.saveData();
                    this.system.notify("Fondo de mapa actualizado");
                }
            };
            reader.readAsDataURL(file);
        };

        btnRemoveBg.onclick = () => {
            const map = this.system.getActiveMap();
            if(map) {
                delete map.backgroundImage;
                mapBgIn.value = ""; // Reset input
                this.system.saveData();
                this.system.notify("Fondo eliminado");
            }
        };

        // HERRAMIENTAS EDITOR
        C.querySelectorAll('.tool-btn').forEach(btn => {
            btn.onclick = () => {
                this.system.editor.setTool(btn.dataset.tool);
                this.updateToolbarUI();
            };
        });

        // TERRENOS
        C.querySelectorAll('.terrain-swatch').forEach(sw => {
            sw.onclick = () => {
                this.system.editor.setTerrain(sw.dataset.type);
                this.updateToolbarUI();
            };
        });

        // PROPIEDADES OBJETO
        const inpName = C.querySelector('#propName');
        const inpType = C.querySelector('#propType');
        
        inpName.addEventListener('input', () => this.system.editor.updateSelectionProp('label', inpName.value));
        inpType.addEventListener('change', () => this.system.editor.updateSelectionProp('type', inpType.value));

        C.querySelector('#btnDeleteObj').onclick = () => this.system.deleteActiveObject();

        // CAPAS
        C.querySelector('#btnLayerBack').onclick = () => this.system.editor.moveLayer('BACK');
        C.querySelector('#btnLayerFront').onclick = () => this.system.editor.moveLayer('FRONT');
    }

    refreshList() {
        const list = this.container.querySelector('#mapList');
        list.innerHTML = '';
        this.system.sagaData.maps.forEach(m => {
            const div = document.createElement('div');
            div.className = 'map-list-item ' + (m.id === this.system.activeMapId ? 'active' : '');
            div.innerHTML = `<span>${m.name}</span> <span style="font-size:0.7em; color:#999">🗺️</span>`;
            div.onclick = () => this.system.selectMap(m.id);
            list.appendChild(div);
        });
    }

    togglePropPanel(show) {
        const p = this.container.querySelector('#propPanel');
        if(show) p.classList.remove('hidden');
        else p.classList.add('hidden');
    }

    updatePropPanel(selection) {
        // Siempre mostrar panel si hay un mapa activo
        if (!this.system.activeMapId) {
            this.togglePropPanel(false);
            return;
        }
        this.togglePropPanel(true);

        const mapGroup = this.container.querySelector('#mapSettingsGroup');
        const objGroup = this.container.querySelector('#objSettingsGroup');
        const header = this.container.querySelector('#propHeader');

        if (!selection) {
            // MODO MAPA
            mapGroup.style.display = 'block';
            objGroup.style.display = 'none';
            header.innerText = "CONFIGURACIÓN DE MAPA";
            
            const map = this.system.getActiveMap();
            if(map) {
                this.container.querySelector('#mapNameInput').value = map.name;
                this.container.querySelector('#mapWidthInput').value = map.width || 2000;
                this.container.querySelector('#mapHeightInput').value = map.height || 1500;
                // Resetear el input file visualmente si no hay imagen
                if(!map.backgroundImage) this.container.querySelector('#mapBgInput').value = "";
            }

        } else {
            // MODO OBJETO
            mapGroup.style.display = 'none';
            objGroup.style.display = 'block';
            header.innerText = "PROPIEDADES DE OBJETO";

            const inpName = this.container.querySelector('#propName');
            const inpType = this.container.querySelector('#propType');
            const layerControls = this.container.querySelector('#layerControls');

            if (selection.type === 'poi') {
                inpName.value = selection.obj.label;
                inpType.value = 'dot';
                layerControls.style.display = 'none';
            } else {
                inpName.value = "Región"; 
                inpType.value = selection.obj.type;
                layerControls.style.display = 'flex';
            }
        }
    }

    updateToolbarUI() {
        const editor = this.system.editor;
        this.container.querySelectorAll('.tool-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === editor.tool);
        });
        this.container.querySelectorAll('.terrain-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.type === editor.currentTerrain);
        });
    }

    updateCoords(x, y, zoom) {
        if(!this.container.isConnected) return;
        this.container.querySelector('#coordDisplay').innerText = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
        this.container.querySelector('#zoomDisplay').innerText = Math.round(zoom * 100) + '%';
    }
}