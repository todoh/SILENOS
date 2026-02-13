// --- DATA-STUDIO.JS (VISUAL DATA FORM EDITOR) ---

window.DataStudio = {
    currentEntry: null,
    data: null, // Objeto JSON en memoria

    init(entry, jsonContent) {
        this.currentEntry = entry;
        this.data = jsonContent;
        this.openUI();
    },

    openUI() {
        if (typeof WindowManager === 'undefined') return;

        // ID único
        const winId = 'data-studio-' + Date.now();
        
        // 1. PREPARAR IMAGEN
        const imgSrc = this.data.imagen64 
            ? (this.data.imagen64.startsWith('data:') ? this.data.imagen64 : `data:image/png;base64,${this.data.imagen64}`)
            : 'https://via.placeholder.com/300x300?text=NO+IMAGE';

        // 2. GENERAR FORMULARIO DINÁMICO
        // Separamos la imagen del resto de datos
        const { imagen64, ...fields } = this.data;
        
        let formHTML = '';
        const sortedKeys = Object.keys(fields).sort(); // Ordenar alfabéticamente o mantener orden

        if (sortedKeys.length === 0) {
            formHTML = `<div class="text-center text-gray-400 text-xs mt-10 p-4 border border-dashed border-gray-300">
                            NO DATA FIELDS FOUND<br>
                            <span class="text-[10px]">Add properties manually in code first</span>
                        </div>`;
        } else {
            sortedKeys.forEach(key => {
                const val = fields[key];
                const valType = typeof val;
                const valStr = val === null || val === undefined ? '' : String(val);
                
                // Detectar si necesita textarea (texto largo) o input normal
                const isLongText = valStr.length > 60;
                
                formHTML += `
                <div class="field-group mb-5 group">
                    <div class="flex justify-between items-end mb-1">
                        <label class="text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">${key}</label>
                        <span class="text-[9px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">${valType}</span>
                    </div>
                    
                    ${isLongText 
                        ? `<textarea 
                                data-key="${key}" 
                                data-type="${valType}"
                                class="data-input w-full bg-gray-50 border-b border-gray-200 p-2 text-sm font-medium text-gray-800 focus:border-black focus:bg-white outline-none transition-colors resize-y min-h-[80px]"
                           >${valStr}</textarea>`
                        
                        : `<input 
                                type="${valType === 'number' ? 'number' : 'text'}" 
                                data-key="${key}" 
                                data-type="${valType}"
                                value="${valStr.replace(/"/g, '&quot;')}" 
                                class="data-input w-full bg-gray-50 border-b border-gray-200 p-2 text-sm font-medium text-gray-800 focus:border-black focus:bg-white outline-none transition-colors"
                           >`
                    }
                </div>`;
            });
        }

        const content = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body { background: #ffffff; font-family: 'Inter', sans-serif; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
                
                /* Scrollbar Minimalista */
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 2px; }
                ::-webkit-scrollbar-thumb:hover { background: #999; }

                .toolbar { border-bottom: 1px solid #000; padding: 10px 20px; display: flex; justify-content: space-between; align-items: center; background: #fff; flex-shrink: 0; z-index: 10; }
                .btn-tool { font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 6px 12px; border: 1px solid #000; cursor: pointer; text-transform: uppercase; background: white; color: #000; transition: all 0.2s; display: flex; gap: 8px; align-items: center; }
                .btn-tool:hover { background: #000; color: #fff; }
                
                .workspace { flex: 1; display: flex; overflow: hidden; }
                
                /* Panel Izquierdo: Imagen */
                .panel-image { width: 35%; border-right: 1px solid #eee; padding: 20px; display: flex; flex-direction: column; align-items: center; background: #fafafa; overflow-y: auto; }
                
                .img-card {
                    background: white; padding: 10px; border: 1px solid #eee; 
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
                    width: 100%; display: flex; flex-direction: column; align-items: center;
                }
                
                .img-preview-container { 
                    width: 100%; aspect-ratio: 1/1; 
                    border: 1px solid #eee; display: flex; align-items: center; justify-content: center; 
                    cursor: pointer; position: relative; overflow: hidden; background: #fff;
                    transition: border-color 0.2s;
                }
                .img-preview-container:hover { border-color: #000; }
                .img-preview { width: 100%; height: 100%; object-fit: contain; }
                
                .overlay-text { 
                    position: absolute; bottom: 0; left: 0; right: 0;
                    background: rgba(0,0,0,0.8); color: white; 
                    padding: 8px; font-size: 10px; text-align: center;
                    font-family: 'JetBrains Mono', monospace;
                    transform: translateY(100%); transition: transform 0.2s;
                }
                .img-preview-container:hover .overlay-text { transform: translateY(0); }

                /* Panel Derecho: Formulario */
                .panel-data { width: 65%; padding: 30px 40px; overflow-y: auto; background: white; }
                
                .data-input:focus { padding-left: 12px; } /* Animación sutil al enfocar */
            </style>
        </head>
        <body>
            <div class="toolbar">
                <div class="flex flex-col">
                    <span class="font-bold text-xs tracking-widest">DATA STUDIO</span>
                    <span class="text-[9px] text-gray-400 font-mono">${this.currentEntry.name}</span>
                </div>
                <button class="btn-tool" onclick="doSave()">
                    <i class="fa-solid fa-floppy-disk"></i> GUARDAR
                </button>
            </div>

            <div class="workspace">
                <div class="panel-image">
                    <input type="file" id="file-input" accept="image/*" style="display: none;" onchange="handleImageUpload(this)">
                    
                    <div class="img-card">
                        <div class="img-preview-container" onclick="document.getElementById('file-input').click()">
                            <img id="preview" src="${imgSrc}" class="img-preview">
                            <div class="overlay-text">CLICK TO UPLOAD</div>
                        </div>
                        <div class="mt-3 w-full border-t border-gray-100 pt-2 flex justify-between items-center">
                            <span class="text-[9px] font-mono text-gray-400">IMG PREVIEW</span>
                            <span class="text-[9px] font-mono text-gray-400 select-none cursor-pointer hover:text-red-500" onclick="clearImage()">[CLEAR]</span>
                        </div>
                    </div>

                    <div class="mt-auto mb-4 text-center">
                         <p class="text-[9px] text-gray-400 font-mono leading-relaxed max-w-[200px]">
                            La imagen se codifica en Base64 y se incrusta en el archivo JSON. 
                            Optimiza tus imágenes antes de subir.
                         </p>
                    </div>
                </div>
                
                <div class="panel-data">
                    <form id="data-form" onsubmit="event.preventDefault();">
                        ${formHTML}
                    </form>
                    
                    <div class="mt-10 pt-4 border-t border-dashed border-gray-200 text-center">
                         <span class="text-[9px] text-gray-300 font-mono">END OF FILE</span>
                    </div>
                </div>
            </div>

            <script>
                const Studio = window.parent.DataStudio;
                
                // Variable local para la imagen (para no perderla al redibujar si fuera necesario)
                let currentImageBase64 = Studio.data.imagen64 || null;

                // --- MANEJO DE IMAGEN ---
                window.handleImageUpload = function(input) {
                    if (input.files && input.files[0]) {
                        const file = input.files[0];
                        const reader = new FileReader();
                        
                        reader.onload = function(e) {
                            document.getElementById('preview').src = e.target.result;
                            currentImageBase64 = e.target.result;
                        }
                        reader.readAsDataURL(file);
                    }
                }

                window.clearImage = function() {
                    if(confirm('¿Eliminar imagen?')) {
                        document.getElementById('preview').src = 'https://via.placeholder.com/300x300?text=NO+IMAGE';
                        currentImageBase64 = null;
                    }
                }

                // --- GUARDADO SEGURO ---
                window.doSave = function() {
                    try {
                        // 1. Recolectar datos del formulario
                        const inputs = document.querySelectorAll('.data-input');
                        const newData = {};

                        inputs.forEach(input => {
                            const key = input.dataset.key;
                            const type = input.dataset.type;
                            let value = input.value;

                            // Restaurar tipos básicos
                            if (type === 'number') {
                                value = value === '' ? 0 : Number(value);
                            } else if (type === 'boolean') {
                                value = (value === 'true');
                            }
                            
                            newData[key] = value;
                        });

                        // 2. Insertar la imagen gestionada
                        if (currentImageBase64) {
                            newData.imagen64 = currentImageBase64;
                        }

                        // 3. Actualizar memoria y guardar
                        Studio.data = newData;
                        Studio.saveToDisk();

                    } catch (e) {
                        alert("Error al procesar datos: " + e.message);
                    }
                }
            </script>
        </body>
        </html>
        `;

        WindowManager.openWindow(`DATA: ${this.currentEntry.name}`, content, 'html');
    },

    async saveToDisk() {
        if (!this.currentEntry || !this.data) return;

        try {
            const contentStr = JSON.stringify(this.data, null, 4);
            const writable = await this.currentEntry.createWritable();
            await writable.write(contentStr);
            await writable.close();

            if (typeof showToast === 'function') showToast("DATOS GUARDADOS CORRECTAMENTE");
            console.log("DATA STUDIO: Saved", this.currentEntry.name);
            
            // Refrescar el Universo para ver cambios en la miniatura o datos
            if (typeof Universe !== 'undefined' && window.currentHandle) {
                 Universe.loadDirectory(window.currentHandle);
            }

        } catch (e) {
            console.error(e);
            alert("Error crítico al guardar en disco: " + e.message);
        }
    }
};