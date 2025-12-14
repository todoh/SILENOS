/* NEXUS SILENOS/characters.js */
/**
 * CHARACTER MANAGER V3.0 - SOCIAL MATRIX
 * Gestión lógica de entidades con Relaciones Recíprocas.
 */

class CharacterManager {
    constructor(sagaData, saveCallback, notifyCallback) {
        this.sagaData = sagaData;
        this.save = saveCallback;
        this.notify = notifyCallback;
        
        // Asegurar estructura
        if (!this.sagaData.characters) this.sagaData.characters = [];

        this.activeCharId = null;
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
                    <button class="btn primary full-width" id="btnNewChar">＋ NUEVO PERSONAJE</button>
                    <div class="char-list" id="charListContainer"></div>
                </div>

                <div class="char-details">
                    <div id="charEmptyState" class="char-empty-state">
                        <span style="font-size:2rem; margin-bottom:10px;">👤</span>
                        SELECCIONA O CREA UNA ENTIDAD
                    </div>

                    <div id="charForm" class="char-form" style="display:none;">
                        <div class="form-row">
                            <div class="form-group" style="flex:2">
                                <label>NOMBRE COMPLETO</label>
                                <input type="text" id="inpName" class="char-input" placeholder="Nombre...">
                            </div>
                            <div class="form-group" style="flex:1">
                                <label>ARQUETIPO / ROL</label>
                                <input type="text" id="inpRole" class="char-input" placeholder="Héroe, Villano...">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>OBJETIVO PRINCIPAL (DESEO)</label>
                            <textarea id="inpGoal" class="char-input" rows="2"></textarea>
                        </div>

                        <div class="form-group">
                            <label>MIEDO / DEBILIDAD</label>
                            <textarea id="inpFear" class="char-input" rows="2"></textarea>
                        </div>

                        <div class="form-group" style="background:rgba(255,255,255,0.3); padding:10px; border-radius:8px;">
                            <label style="color:#6c5ce7;">VÍNCULOS Y RELACIONES</label>
                            <div class="form-row" style="margin-bottom:8px;">
                                <select id="selRelTarget" class="char-input" style="flex:2"></select>
                                <input type="text" id="inpRelType" class="char-input" style="flex:2" placeholder="Ej: Hermano, Rival...">
                                <button id="btnAddRel" class="btn primary" style="flex:0.5">＋</button>
                            </div>
                            <div id="relList" style="display:flex; flex-wrap:wrap; gap:5px;"></div>
                        </div>

                        <div class="form-group">
                            <label>NOTAS DE EVOLUCIÓN</label>
                            <textarea id="inpNotes" class="char-input" rows="3"></textarea>
                        </div>

                        <div class="char-actions">
                            <button id="btnDelChar" class="btn danger">ELIMINAR</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        this.ui = {
            list: this.container.querySelector('#charListContainer'),
            form: this.container.querySelector('#charForm'),
            empty: this.container.querySelector('#charEmptyState'),
            
            inpName: this.container.querySelector('#inpName'),
            inpRole: this.container.querySelector('#inpRole'),
            inpGoal: this.container.querySelector('#inpGoal'),
            inpFear: this.container.querySelector('#inpFear'),
            inpNotes: this.container.querySelector('#inpNotes'),
            
            // Relaciones UI
            selRelTarget: this.container.querySelector('#selRelTarget'),
            inpRelType: this.container.querySelector('#inpRelType'),
            btnAddRel: this.container.querySelector('#btnAddRel'),
            relList: this.container.querySelector('#relList'),

            btnNew: this.container.querySelector('#btnNewChar'),
            btnDel: this.container.querySelector('#btnDelChar')
        };

        this.ui.btnNew.onclick = () => this.createCharacter();
        this.ui.btnDel.onclick = () => this.deleteActiveCharacter();
        this.ui.btnAddRel.onclick = () => this.addRelationship();

        // AUTO-SAVE INPUTS
        const inputs = [this.ui.inpName, this.ui.inpRole, this.ui.inpGoal, this.ui.inpFear, this.ui.inpNotes];
        inputs.forEach(input => {
            input.addEventListener('input', () => this.updateActiveCharacter());
        });
    }

    refreshList() {
        this.ui.list.innerHTML = '';
        const chars = this.sagaData.characters;

        if (chars.length === 0) {
            this.ui.list.innerHTML = '<div style="padding:10px; color:#999; text-align:center;">Sin registros.</div>';
            return;
        }

        chars.forEach(char => {
            const item = document.createElement('div');
            item.className = 'char-item';
            if (char.id === this.activeCharId) item.classList.add('active');
            
            const initials = char.name ? char.name.substring(0,2).toUpperCase() : '??';

            item.innerHTML = `
                <div class="char-avatar-small">${initials}</div>
                <div class="char-info-preview">
                    <span class="char-name-preview">${char.name || 'Sin Nombre'}</span>
                    <span class="char-role-preview">${char.role || 'Rol no definido'}</span>
                </div>
            `;
            item.onclick = () => this.selectCharacter(char.id);
            this.ui.list.appendChild(item);
        });
    }

    selectCharacter(id) {
        this.activeCharId = id;
        const char = this.sagaData.characters.find(c => c.id === id);

        if (char) {
            // Migración de datos on-the-fly
            if (!char.relationships) char.relationships = [];

            this.ui.inpName.value = char.name || '';
            this.ui.inpRole.value = char.role || '';
            this.ui.inpGoal.value = char.goal || '';
            this.ui.inpFear.value = char.fear || '';
            this.ui.inpNotes.value = char.notes || '';

            this.refreshRelDropdown();
            this.renderRelList(char);

            this.ui.empty.style.display = 'none';
            this.ui.form.style.display = 'flex';
            this.refreshList();
        }
    }

    // --- GESTIÓN DE RELACIONES ---

    refreshRelDropdown() {
        this.ui.selRelTarget.innerHTML = '';
        this.sagaData.characters.forEach(c => {
            if (c.id !== this.activeCharId) {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.innerText = c.name;
                this.ui.selRelTarget.appendChild(opt);
            }
        });
    }

    renderRelList(char) {
        this.ui.relList.innerHTML = '';
        (char.relationships || []).forEach((rel, idx) => {
            const targetChar = this.sagaData.characters.find(c => c.id === rel.targetId);
            const targetName = targetChar ? targetChar.name : '???';
            
            const tag = document.createElement('div');
            tag.style = "background:#eee; padding:4px 8px; border-radius:4px; font-size:0.75rem; display:flex; align-items:center; gap:5px;";
            tag.innerHTML = `<b>${targetName}:</b> ${rel.type} <button style="border:none; background:none; color:red; cursor:pointer; font-weight:bold;">×</button>`;
            
            tag.querySelector('button').onclick = () => this.removeRelationship(idx);
            this.ui.relList.appendChild(tag);
        });
    }

    addRelationship() {
        if (!this.activeCharId) return;
        const targetId = this.ui.selRelTarget.value;
        const type = this.ui.inpRelType.value.trim();

        if (!targetId || !type) return;

        const char = this.sagaData.characters.find(c => c.id === this.activeCharId);
        
        // Evitar duplicados
        const exists = char.relationships.find(r => r.targetId === targetId);
        if (exists) {
            exists.type = type; // Actualizar existente
        } else {
            char.relationships.push({ targetId, type });
        }

        this.syncReciprocalRelationship(this.activeCharId, targetId, type);

        this.ui.inpRelType.value = '';
        this.renderRelList(char);
        this.save();
    }

    removeRelationship(idx) {
        if (!this.activeCharId) return;
        const char = this.sagaData.characters.find(c => c.id === this.activeCharId);
        // Opcional: ¿Eliminar también en el otro lado? Por ahora no, para no ser destructivo.
        char.relationships.splice(idx, 1);
        this.renderRelList(char);
        this.save();
    }

    /**
     * MAGIA: Sincronización Recíproca
     * Si A dice que es amigo de B -> B dice que es amigo de A.
     */
    syncReciprocalRelationship(sourceId, targetId, type) {
        const targetChar = this.sagaData.characters.find(c => c.id === targetId);
        if (!targetChar) return;

        if (!targetChar.relationships) targetChar.relationships = [];

        // Buscamos si ya tiene relación con nosotros
        const reverseRel = targetChar.relationships.find(r => r.targetId === sourceId);
        
        if (reverseRel) {
            // Ya existe, actualizamos para mantener coherencia (o podríamos dejarlo si queremos asimetría)
            // Para "nitidez", asumimos que actualizamos.
            reverseRel.type = type; 
        } else {
            // Creamos la relación inversa
            targetChar.relationships.push({ targetId: sourceId, type: type });
        }
        
        // Notificación sutil
        // console.log(`Sincronizado: ${targetChar.name} ahora sabe que es ${type} de ${sourceId}`);
    }

    // --- CRUD ESTÁNDAR ---

    createCharacter() {
        const newId = 'char_' + Date.now();
        const newChar = {
            id: newId,
            name: 'Nueva Entidad',
            role: '', goal: '', fear: '', notes: '',
            relationships: []
        };
        this.sagaData.characters.push(newChar);
        this.save();
        this.selectCharacter(newId);
    }

    updateActiveCharacter() {
        if (!this.activeCharId) return;
        const char = this.sagaData.characters.find(c => c.id === this.activeCharId);
        if (char) {
            char.name = this.ui.inpName.value;
            char.role = this.ui.inpRole.value;
            char.goal = this.ui.inpGoal.value;
            char.fear = this.ui.inpFear.value;
            char.notes = this.ui.inpNotes.value;
            this.save();
            
            const listItem = Array.from(this.ui.list.children).find(el => el.classList.contains('active'));
            if(listItem) {
                listItem.querySelector('.char-name-preview').innerText = char.name || 'Sin Nombre';
                listItem.querySelector('.char-avatar-small').innerText = char.name ? char.name.substring(0,2).toUpperCase() : '??';
            }
        }
    }

    deleteActiveCharacter() {
        if (!this.activeCharId) return;
        if (confirm("¿Eliminar entidad?")) {
            this.sagaData.characters = this.sagaData.characters.filter(c => c.id !== this.activeCharId);
            this.activeCharId = null;
            this.ui.form.style.display = 'none';
            this.ui.empty.style.display = 'flex';
            this.save();
            this.refreshList();
            this.notify("Personaje eliminado.");
        }
    }
}