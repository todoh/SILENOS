// --- datosstudio/tramas.ui.inspector.js ---
// INSPECTOR OMEGA Y GESTIÓN DE PROPIEDADES DE NODOS

window.TramasUI = window.TramasUI || {
    selectedNodeId: null,
    expandTargetId: null
};

Object.assign(window.TramasUI, {
    openInspector(nodeId) {
        this.selectedNodeId = nodeId;
        const node = app.tramas.find(n => n.id === nodeId);
        if (!node) return;

        document.getElementById('omega-sidebar').classList.add('open');
        document.getElementById('omega-sidebar-actions').classList.remove('hidden');
        const content = document.getElementById('omega-sidebar-content');

        if (node.type === 'Region') {
            content.innerHTML = `
                <div class="space-y-4">
                    <div>
                        <span class="label-text">Nombre de la Región / Acto</span>
                        <input type="text" id="omega-inp-name" class="config-input font-medium text-lg" value="${node.name}" onchange="TramasUI.updateNodeField('name', this.value)">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <span class="label-text">Ancho</span>
                            <input type="number" class="config-input" value="${node.width || 600}" onchange="TramasUI.updateNodeField('width', parseInt(this.value))">
                        </div>
                        <div>
                            <span class="label-text">Alto</span>
                            <input type="number" class="config-input" value="${node.height || 400}" onchange="TramasUI.updateNodeField('height', parseInt(this.value))">
                        </div>
                    </div>
                    <div>
                        <span class="label-text">Color de Fondo</span>
                        <select class="config-input" onchange="TramasUI.updateNodeField('color', this.value)">
                            <option value="#f3f4f6" ${node.color==='#f3f4f6'?'selected':''}>Gris Claro (Neutro)</option>
                            <option value="#fee2e2" ${node.color==='#fee2e2'?'selected':''}>Rojo Suave (Acción)</option>
                            <option value="#e0e7ff" ${node.color==='#e0e7ff'?'selected':''}>Azul Suave (Misterio)</option>
                            <option value="#fef9c3" ${node.color==='#fef9c3'?'selected':''}>Amarillo Suave (Tensión)</option>
                            <option value="#dcfce7" ${node.color==='#dcfce7'?'selected':''}>Verde Suave (Paz)</option>
                            <option value="#f3e8ff" ${node.color==='#f3e8ff'?'selected':''}>Morado Suave (Magia)</option>
                        </select>
                    </div>
                    <div class="mt-6 p-4 bg-gray-50 border border-gray-100 text-xs text-gray-500 rounded-sm leading-relaxed">
                        <i class="fa-solid fa-circle-info mr-1"></i> <strong>Tip de Diseño:</strong><br>
                        Para mover una región, arrástrala desde su <strong>barra de título superior</strong> en el canvas. Al hacerlo, arrastrarás todos los eventos que se encuentren en su interior de forma automática.
                    </div>
                </div>
            `;
            return;
        }

        if (!node.status) node.status = "Borrador";
        if (!node.tension) node.tension = 1;
        
        let availableOptionsHtml = '<option value="" disabled selected>Selecciona un Dato para vincular...</option>';
        app.items.forEach(item => {
            const title = item.data.name || item.name;
            availableOptionsHtml += `<option value="${item.name}">${title} (${item.data.type || 'General'})</option>`;
        });

        let refsHtml = '';
        if (node.dataRefs && node.dataRefs.length > 0) {
            node.dataRefs.forEach((refId, idx) => {
                const foundItem = app.items.find(i => i.name === refId);
                const displayTitle = foundItem ? (foundItem.data.name || refId) : refId;
                const isPov = node.pov === refId;
                
                refsHtml += `
                    <div class="flex justify-between items-center bg-gray-50 border border-gray-100 px-3 py-2 rounded-sm text-xs mt-1 ${isPov ? 'border-yellow-400 bg-yellow-50' : ''}">
                        <span class="truncate font-medium ${isPov ? 'text-yellow-700' : 'text-gray-700'} w-[70%]">
                            ${isPov ? '<i class="fa-solid fa-camera text-yellow-500 mr-1"></i>' : ''}${displayTitle}
                        </span>
                        <div class="flex gap-2">
                            <button onclick="TramasUI.setPov('${refId}')" class="${isPov ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'}" title="Fijar como POV"><i class="fa-solid fa-star"></i></button>
                            <button onclick="TramasUI.removeDataRef(${idx})" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                    </div>
                `;
            });
        } else {
            refsHtml = `<div class="text-[10px] text-gray-400 italic py-2 text-center">Ningún dato vinculado a este evento.</div>`;
        }

        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex gap-4 items-end">
                    <div class="flex-1">
                        <span class="label-text">Título del Evento</span>
                        <input type="text" id="omega-inp-name" class="config-input font-medium text-lg" value="${node.name}" onchange="TramasUI.updateNodeField('name', this.value)">
                    </div>
                    <div class="w-32">
                        <span class="label-text">Fase / Estado</span>
                        <select id="omega-inp-status" class="config-input text-xs font-bold ${node.status === 'Completado' ? 'text-green-600' : (node.status === 'Activo' ? 'text-blue-600' : 'text-gray-400')}" onchange="TramasUI.updateNodeField('status', this.value); TramasUI.openInspector('${node.id}')">
                            <option value="Borrador" ${node.status === 'Borrador' ? 'selected' : ''}>Borrador</option>
                            <option value="Activo" ${node.status === 'Activo' ? 'selected' : ''}>Activo</option>
                            <option value="Completado" ${node.status === 'Completado' ? 'selected' : ''}>Completado</option>
                        </select>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <span class="label-text">Rol Estructural</span>
                        <select id="omega-inp-type" class="config-input" onchange="TramasUI.updateNodeField('type', this.value)">
                            <option value="General" ${node.type === 'General' ? 'selected' : ''}>Punto General</option>
                            <option value="Gancho" ${node.type === 'Gancho' ? 'selected' : ''}>Gancho / Inicio</option>
                            <option value="Contexto" ${node.type === 'Contexto' ? 'selected' : ''}>Contexto / Setup</option>
                            <option value="Incidente" ${node.type === 'Incidente' ? 'selected' : ''}>Incidente Incitador</option>
                            <option value="Inflexión" ${node.type === 'Inflexión' ? 'selected' : ''}>Punto de Inflexión (Twist)</option>
                            <option value="Desarrollo" ${node.type === 'Desarrollo' ? 'selected' : ''}>Desarrollo / Acción</option>
                            <option value="Obstáculo" ${node.type === 'Obstáculo' ? 'selected' : ''}>Obstáculo / Complicación</option>
                            <option value="Medio" ${node.type === 'Medio' ? 'selected' : ''}>Punto Medio (Midpoint)</option>
                            <option value="Crisis" ${node.type === 'Crisis' ? 'selected' : ''}>Crisis / Todo Perdido</option>
                            <option value="Clímax" ${node.type === 'Clímax' ? 'selected' : ''}>Clímax / Pico</option>
                            <option value="Resolución" ${node.type === 'Resolución' ? 'selected' : ''}>Resolución</option>
                            <option value="Epílogo" ${node.type === 'Epílogo' ? 'selected' : ''}>Epílogo / Secuela</option>
                        </select>
                    </div>
                    <div>
                        <div class="flex justify-between">
                            <span class="label-text">Tensión Narrativa</span>
                            <span class="text-[10px] font-bold" id="tension-val-display">${node.tension} / 5</span>
                        </div>
                        <input type="range" min="1" max="5" value="${node.tension}" class="w-full mt-2 accent-black" 
                            oninput="document.getElementById('tension-val-display').innerText = this.value + ' / 5'"
                            onchange="TramasUI.updateNodeField('tension', parseInt(this.value))">
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-2">
                    <div>
                        <span class="label-text">Momento / Fecha</span>
                        <input type="text" class="config-input text-xs" placeholder="Ej. Año 24 / Día 3..." value="${node.timestamp || ''}" onchange="TramasUI.updateNodeField('timestamp', this.value)">
                    </div>
                    <div>
                        <span class="label-text">Duración</span>
                        <input type="text" class="config-input text-xs" placeholder="Ej. 3 meses / 2 horas..." value="${node.duration || ''}" onchange="TramasUI.updateNodeField('duration', this.value)">
                    </div>
                </div>

                <div class="mt-4">
                    <div class="flex justify-between items-end mb-1">
                        <span class="label-text">Sinopsis / Acción Principal</span>
                        <button onclick="TramasUI.enrichEventAgent('${node.id}')" class="text-[9px] text-indigo-600 font-bold hover:text-indigo-800 uppercase tracking-wider transition-colors"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>Enriquecer Info (IA)</button>
                    </div>
                    <textarea id="omega-inp-desc" rows="4" class="config-input resize-none leading-relaxed text-sm text-gray-700" placeholder="Describe qué ocurre exactamente en este punto de la trama..." onchange="TramasUI.updateNodeField('desc', this.value)">${node.desc || ''}</textarea>
                </div>

                <div>
                    <span class="label-text text-yellow-600">Notas de Diseño (Meta)</span>
                    <textarea id="omega-inp-notes" rows="2" class="config-input resize-none text-xs bg-yellow-50/30 text-yellow-800 border-yellow-200 p-2" placeholder="Ej: Asegurarse de que el personaje pierda su mapa aquí..." onchange="TramasUI.updateNodeField('notes', this.value)">${node.notes || ''}</textarea>
                </div>
            </div>

            <div class="mt-6 border-t border-gray-100 pt-4">
                <span class="label-text mb-2 text-indigo-600">Datos Implicados (Actores/Contexto)</span>
                
                <div class="flex gap-2 mb-3">
                    <select id="omega-data-select" class="config-input text-xs bg-indigo-50/30">
                        ${availableOptionsHtml}
                    </select>
                    <button onclick="TramasUI.addDataRef()" class="btn-nordic px-3"><i class="fa-solid fa-link"></i></button>
                </div>

                <div class="flex flex-col gap-1">
                    ${refsHtml}
                </div>
            </div>
            
            <div class="mt-6 border-t border-gray-100 pt-4">
                <span class="label-text">Rutas Salientes</span>
                <div class="text-[10px] text-gray-500 font-mono mt-1 bg-gray-50 p-2 border border-gray-100 rounded-sm">
                    Conecta hacia: ${node.connections && node.connections.length > 0 ? node.connections.length + ' Nodos sucesivos' : 'Fin de línea'}
                </div>
            </div>
        `;
    },

    closeInspector() {
        this.selectedNodeId = null;
        document.getElementById('omega-sidebar').classList.remove('open');
        setTimeout(() => {
            document.getElementById('omega-sidebar-actions').classList.add('hidden');
        }, 300);
    },

    updateNodeField(field, value) {
        if (!this.selectedNodeId) return;
        const node = app.tramas.find(n => n.id === this.selectedNodeId);
        if (node) {
            node[field] = value;
            window.TramasCanvas.render();
        }
    },

    addDataRef() {
        if (!this.selectedNodeId) return;
        const select = document.getElementById('omega-data-select');
        const fileId = select.value;
        if (!fileId) return;

        const node = app.tramas.find(n => n.id === this.selectedNodeId);
        if (node) {
            if (!node.dataRefs) node.dataRefs = [];
            if (!node.dataRefs.includes(fileId)) {
                node.dataRefs.push(fileId);
                this.saveCurrentOmega(); 
                this.openInspector(this.selectedNodeId);
            }
        }
    },

    removeDataRef(index) {
        if (!this.selectedNodeId) return;
        const node = app.tramas.find(n => n.id === this.selectedNodeId);
        if (node && node.dataRefs) {
            const refToRemove = node.dataRefs[index];
            node.dataRefs.splice(index, 1);
            if (node.pov === refToRemove) node.pov = null; 
            this.saveCurrentOmega();
            this.openInspector(this.selectedNodeId);
        }
    },

    setPov(refId) {
        if (!this.selectedNodeId) return;
        const node = app.tramas.find(n => n.id === this.selectedNodeId);
        if (node) {
            node.pov = node.pov === refId ? null : refId; 
            this.saveCurrentOmega();
            this.openInspector(this.selectedNodeId);
        }
    }
});