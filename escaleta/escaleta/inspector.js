// --- cronologia/escaleta/inspector.js ---
// INSPECTOR Y EDICIÓN DE PROPIEDADES INDIVIDUALES

const Inspector = {
    selectedTakeId: null,
    
    selectTake(takeId) {
        this.selectedTakeId = takeId;
        const take = EscaletaCore.data.takes.find(t => t.id === takeId);
        if(!take) return;
    
        // Resaltar Tarjeta
        document.querySelectorAll('.take-card').forEach(c => c.classList.remove('active'));
        document.getElementById(`card-${takeId}`).classList.add('active');
    
        // Configurar Reproductor Preview
        const videoEl = document.getElementById('inspector-video');
        const imageEl = document.getElementById('inspector-image');
        const placeholder = document.getElementById('video-placeholder');
        
        if (take.videoBlobUrl) {
            videoEl.src = take.videoBlobUrl;
            videoEl.classList.remove('hidden');
            imageEl.classList.add('hidden');
            imageEl.src = '';
            placeholder.classList.add('hidden');
            videoEl.play();
        } else if (take.imageBlobUrl) {
            videoEl.pause();
            videoEl.classList.add('hidden');
            imageEl.src = take.imageBlobUrl;
            imageEl.classList.remove('hidden');
            placeholder.classList.add('hidden');
        } else {
            videoEl.pause();
            videoEl.classList.add('hidden');
            imageEl.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    
        // Renderizar Formulario de Edición
        const container = document.getElementById('inspector-forms');
        container.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="label-text">ID TÉCNICO</label>
                    <input disabled value="${take.id}" class="escaleta-input text-gray-400 font-mono">
                </div>
                
                <div class="p-3 bg-gray-50 border border-gray-100 rounded-sm space-y-4">
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="label-text mb-0">ARCHIVO VISUAL</label>
                            <div class="flex gap-4">
                                <label class="cursor-pointer text-[9px] font-bold text-orange-500 hover:text-orange-700 uppercase flex items-center gap-1 transition-colors">
                                    <i class="fa-solid fa-image"></i> Imagen
                                    <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" onchange="if(this.files[0]) EscaletaCore.attachLocalMedia('${take.id}', this.files[0], 'image')">
                                </label>
                                <label class="cursor-pointer text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase flex items-center gap-1 transition-colors">
                                    <i class="fa-solid fa-video"></i> Video
                                    <input type="file" accept="video/mp4,video/webm" class="hidden" onchange="if(this.files[0]) EscaletaCore.attachLocalMedia('${take.id}', this.files[0], 'video')">
                                </label>
                            </div>
                        </div>
                        <input disabled value="${take.video_file || take.image_file || '---'}" class="escaleta-input text-gray-400 bg-white px-2 mt-1">
                    </div>
                    
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="label-text mb-0">ARCHIVO AUDIO</label>
                            <label class="cursor-pointer text-[9px] font-bold text-pink-500 hover:text-pink-700 uppercase flex items-center gap-1 transition-colors">
                                <i class="fa-solid fa-upload"></i> Subir Local
                                <input type="file" accept="audio/mp3,audio/wav,audio/mpeg" class="hidden" onchange="if(this.files[0]) EscaletaCore.attachLocalMedia('${take.id}', this.files[0], 'audio')">
                            </label>
                        </div>
                        <input disabled value="${take.audio_file || '---'}" class="escaleta-input text-gray-400 bg-white px-2 mt-1">
                    </div>
                </div>

                <div class="p-3 bg-gray-50 border border-gray-100 rounded-sm space-y-4">
                    <h4 class="label-text mb-2 text-blue-600"><i class="fa-solid fa-headphones"></i> DISEÑO SONORO AVANZADO</h4>
                    
                    <div>
                        <label class="label-text">MODO DE AUDIO</label>
                        <select class="escaleta-input bg-white font-medium" onchange="EscaletaCore.updateTake('${take.id}', 'audio_mode', this.value); Inspector.selectTake('${take.id}')">
                            <option value="diegetic" ${(!take.audio_mode || take.audio_mode === 'diegetic') ? 'selected' : ''}>Sonido Ambiente Fiel (Foley sin música)</option>
                            <option value="custom" ${take.audio_mode === 'custom' ? 'selected' : ''}>Diseño Libre + Diálogos</option>
                        </select>
                    </div>

                    ${(!take.audio_mode || take.audio_mode === 'diegetic') ? `
                        <div class="text-[9px] text-gray-400 italic leading-tight">La IA analizará la acción visual y generará automáticamente los efectos de sonido (Foley) correspondientes, silenciando cualquier música épica de fondo.</div>
                    ` : `
                        <div>
                            <label class="label-text">PROMPT DE SONIDO LIBRE / DIÁLOGO</label>
                            <textarea class="escaleta-input text-gray-600 bg-white p-2 border border-gray-200 rounded h-16" placeholder="Ej: Pasos lentos en la nieve y voz grave diciendo en español: 'No debiste venir'..." onchange="EscaletaCore.updateTake('${take.id}', 'audio_custom_prompt', this.value)">${take.audio_custom_prompt || ''}</textarea>
                        </div>
                        <div>
                            <label class="label-text">FORZAR VOZ DE PERSONAJE (Opcional)</label>
                            <input type="text" class="escaleta-input bg-white" placeholder="Ej: Nombre del personaje en la Biblia Visual" value="${take.audio_voice_lock || ''}" onchange="EscaletaCore.updateTake('${take.id}', 'audio_voice_lock', this.value)">
                        </div>
                    `}
                </div>
            </div>
        `;
    },
    
    togglePlay() {
        const v = document.getElementById('inspector-video');
        if(!v.classList.contains('hidden')) {
            if(v.paused) v.play(); else v.pause();
        }
    },
    
    toggleMute() {
        const v = document.getElementById('inspector-video');
        if(!v.classList.contains('hidden')) v.muted = !v.muted;
    }
};

window.Inspector = Inspector;