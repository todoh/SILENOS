/* NEXUS SILENOS/places.js */
/**
 * PLACE MANAGER (D - CONTENEDOR)
 * Gestión lógica de Lugares (Lore/Base de datos), independiente de los carriles temporales.
 */

class PlacesManager {
    constructor(sagaData, saveCallback, notifyCallback) {
        this.sagaData = sagaData;
        this.save = saveCallback;
        this.notify = notifyCallback;
        
        // Asegurar estructura de datos para la DB de lugares
        if (!this.sagaData.placeDb) {
            this.sagaData.placeDb = [];
        }

        this.activePlaceId = null;
        this.container = null;
    }

    mount(containerElement) {
        this.container = containerElement;
        this.renderLayout();
        this.bindEvents();
        this.refreshList();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="char-manager-container">
                <div class="char-sidebar">
                    <button class="btn primary full-width" id="btnNewPlaceDb">＋ NUEVO LUGAR (LORE)</button>
                    <div class="char-list" id="placeListContainer"></div>
                </div>

                <div class="char-details">
                    <div id="placeEmptyState" class="char-empty-state">
                        <span style="font-size:2rem; margin-bottom:10px;">uD83C\uDFD9FE0F</span>
                        SELECCIONA O CREA UN LUGAR
                    </div>

                    <div id="placeForm" class="char-form" style="display:none;">
                        <div class="form-row">
                            <div class="form-group" style="flex:2">
                                <label>NOMBRE DEL LUGAR</label>
                                <input type="text" id="inpPlaceName" class="char-input" placeholder="Ej: La Ciudadela...">
                            </div>
                            <div class="form-group" style="flex:0.5">
                                <label>COLOR</label>
                                <input type="color" id="inpPlaceColor" class="char-input" style="height:45px; padding:2px;">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>TIPO / BIOMA</label>
                            <input type="text" id="inpPlaceType" class="char-input" placeholder="Ciudad, Bosque, Ruina...">
                        </div>

                        <div class="form-group">
                            <label>DESCRIPCIÓN GENERAL</label>
                            <textarea id="inpPlaceDesc" class="char-input" rows="4"></textarea>
                        </div>

                        <div class="form-group">
                            <label>NOTAS OCULTAS / SECRETOS</label>
                            <textarea id="inpPlaceNotes" class="char-input" rows="3"></textarea>
                        </div>

                        <div class="char-actions">
                            <button id="btnDelPlaceDb" class="btn danger">ELIMINAR</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.ui = {
            list: this.container.querySelector('#placeListContainer'),
            form: this.container.querySelector('#placeForm'),
            empty: this.container.querySelector('#placeEmptyState'),
            
            inpName: this.container.querySelector('#inpPlaceName'),
            inpColor: this.container.querySelector('#inpPlaceColor'),
            inpType: this.container.querySelector('#inpPlaceType'),
            inpDesc: this.container.querySelector('#inpPlaceDesc'),
            inpNotes: this.container.querySelector('#inpPlaceNotes'),
            
            btnNew: this.container.querySelector('#btnNewPlaceDb'),
            btnDel: this.container.querySelector('#btnDelPlaceDb')
        };

        this.ui.btnNew.onclick = () => this.createPlace();
        this.ui.btnDel.onclick = () => this.deleteActivePlace();

        // Auto-save en inputs
        [this.ui.inpName, this.ui.inpType, this.ui.inpDesc, this.ui.inpNotes].forEach(input => {
            input.addEventListener('input', () => this.updateActivePlace());
        });
        this.ui.inpColor.addEventListener('change', () => this.updateActivePlace());
    }

    refreshList() {
        this.ui.list.innerHTML = '';
        const places = this.sagaData.placeDb;

        if (places.length === 0) {
            this.ui.list.innerHTML = '<div style="padding:10px; color:#999; text-align:center;">Sin lugares registrados.</div>';
            return;
        }

        places.forEach(p => {
            const item = document.createElement('div');
            item.className = 'char-item';
            if (p.id === this.activePlaceId) item.classList.add('active');
            
            const initials = p.name ? p.name.substring(0,2).toUpperCase() : '??';

            item.innerHTML = `
                <div class="char-avatar-small" style="background:${p.color || '#666'}">${initials}</div>
                <div class="char-info-preview">
                    <span class="char-name-preview">${p.name || 'Sin Nombre'}</span>
                    <span class="char-role-preview">${p.type || 'General'}</span>
                </div>
            `;

            item.onclick = () => this.selectPlace(p.id);
            this.ui.list.appendChild(item);
        });
    }

    selectPlace(id) {
        this.activePlaceId = id;
        const p = this.sagaData.placeDb.find(x => x.id === id);

        if (p) {
            this.ui.inpName.value = p.name || '';
            this.ui.inpColor.value = p.color || '#00acc1';
            this.ui.inpType.value = p.type || '';
            this.ui.inpDesc.value = p.desc || '';
            this.ui.inpNotes.value = p.notes || '';

            this.ui.empty.style.display = 'none';
            this.ui.form.style.display = 'flex';
            this.refreshList();
        }
    }

    createPlace() {
        const newId = 'place_db_' + Date.now();
        const newPlace = {
            id: newId,
            name: 'Nuevo Lugar',
            color: '#3498db',
            type: '',
            desc: '',
            notes: ''
        };

        this.sagaData.placeDb.push(newPlace);
        this.save();
        this.selectPlace(newId);
    }

    updateActivePlace() {
        if (!this.activePlaceId) return;

        const p = this.sagaData.placeDb.find(x => x.id === this.activePlaceId);
        if (p) {
            p.name = this.ui.inpName.value;
            p.color = this.ui.inpColor.value;
            p.type = this.ui.inpType.value;
            p.desc = this.ui.inpDesc.value;
            p.notes = this.ui.inpNotes.value;

            this.save();
            
            // Actualizar visualmente la lista sin recargar todo para no perder foco
            const listItem = Array.from(this.ui.list.children).find(el => el.classList.contains('active'));
            if(listItem) {
                listItem.querySelector('.char-name-preview').innerText = p.name;
                listItem.querySelector('.char-avatar-small').style.background = p.color;
            }
        }
    }

    deleteActivePlace() {
        if (!this.activePlaceId) return;
        if (confirm("¿Eliminar este lugar de la base de datos?")) {
            this.sagaData.placeDb = this.sagaData.placeDb.filter(x => x.id !== this.activePlaceId);
            this.activePlaceId = null;
            this.ui.form.style.display = 'none';
            this.ui.empty.style.display = 'flex';
            this.save();
            this.refreshList();
            this.notify("Lugar eliminado.");
        }
    }
}