// --- storyboard_adv.ui.js ---
// INTERFAZ DE USUARIO INTEGRADA (ESTILO SILENOS TABS)

window.setSbRatio = function(ratio, btnElement) {
    document.querySelectorAll('.ratio-btn-sb').forEach(btn => {
        btn.classList.remove('active-ratio', 'bg-purple-500/20', 'border-purple-500/50', 'text-purple-400');
        btn.classList.add('bg-black/50', 'border-white/5', 'text-gray-400');
    });
    btnElement.classList.remove('bg-black/50', 'border-white/5', 'text-gray-400');
    btnElement.classList.add('active-ratio', 'bg-purple-500/20', 'border-purple-500/50', 'text-purple-400');
    btnElement.dataset.ratio = ratio;
};

const SbAdvUI = {
    
    init() {
        const container = document.getElementById('section-storyboard');
        if (!container) return;

        container.innerHTML = `
            <div class="w-80 shrink-0 flex flex-col gap-6 bg-panel border border-white/5 rounded-2xl p-6 overflow-y-auto custom-scrollbar shadow-xl">
                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2 block">Narrative Core</label>
                    <textarea id="sb-prompt" rows="6" class="w-full bg-black/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-purple-500 block p-3 outline-none resize-none placeholder-gray-600 transition-colors" placeholder="Input the foundational narrative script..."></textarea>
                </div>

                <div class="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2 block">Aspect Ratio</label>
                        <div class="flex gap-2">
                            <button onclick="setSbRatio('square', this)" class="ratio-btn-sb flex-1 bg-black/50 border border-white/5 text-gray-400 py-2.5 rounded-lg hover:text-white hover:border-white/20 transition-all text-sm" data-ratio="square"><i class="fa-regular fa-square"></i></button>
                            <button onclick="setSbRatio('landscape', this)" class="ratio-btn-sb flex-1 bg-purple-500/20 border border-purple-500/50 text-purple-400 py-2.5 rounded-lg transition-all text-sm active-ratio" data-ratio="landscape"><i class="fa-solid fa-image"></i></button>
                            <button onclick="setSbRatio('portrait', this)" class="ratio-btn-sb flex-1 bg-black/50 border border-white/5 text-gray-400 py-2.5 rounded-lg hover:text-white hover:border-white/20 transition-all text-sm" data-ratio="portrait"><i class="fa-solid fa-mobile-screen"></i></button>
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2 block">Frames</label>
                        <input type="number" id="sb-count" value="5" min="1" max="20" class="w-full bg-black/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-purple-500 block p-2.5 outline-none font-mono text-center h-[42px]">
                    </div>
                </div>

                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2 block">Aesthetic Vision</label>
                    <input type="text" id="sb-style" class="w-full bg-black/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-purple-500 block p-2.5 outline-none" placeholder="e.g. 35mm, Neo-noir, Cinematic...">
                </div>

                <div>
                    <label class="text-[10px] text-gray-400 uppercase tracking-widest font-medium mb-2 block">Genre</label>
                    <input type="text" id="sb-genre" class="w-full bg-black/50 border border-white/5 text-white text-sm rounded-lg focus:ring-1 focus:ring-purple-500 block p-2.5 outline-none" placeholder="e.g. Cyberpunk, Space Opera...">
                </div>

                <div class="mt-auto pt-4 border-t border-white/5">
                    <button id="btn-generate-storyboard" onclick="StoryboardAdv.processStoryboard()" class="w-full bg-white text-black font-semibold py-3.5 rounded-xl hover:bg-gray-200 active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 text-xs tracking-widest uppercase">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> <span>Synthesize Sequence</span>
                    </button>
                </div>
            </div>

            <div class="flex-1 bg-panel border border-white/5 rounded-2xl p-6 flex flex-col relative overflow-hidden shadow-xl">
                <div id="sb-empty-state" class="w-full h-full flex items-center justify-center text-gray-500 flex-col gap-4">
                    <i class="fa-solid fa-layer-group text-5xl opacity-20"></i>
                    <p class="text-sm font-light tracking-wide">Awaiting sequence generation.</p>
                </div>
                
                <div id="sb-gallery-container" class="w-full h-full flex flex-col hidden">
                    <div class="shrink-0 mb-4 pb-4 border-b border-white/5 flex justify-between items-center">
                        <h3 class="text-xs text-purple-400 font-bold uppercase tracking-widest">Sequence Output</h3>
                        <button onclick="StoryboardExport.downloadHTML(StoryboardAdv.state.scenes)" class="bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-300 text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded-lg transition-all flex items-center gap-2">
                            <i class="fa-solid fa-file-export"></i> <span>Export HTML</span>
                        </button>
                    </div>

                    <div id="sb-gallery" class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-8 pb-10 max-w-4xl mx-auto w-full"></div>
                </div>

                <div id="sb-loading" class="absolute inset-0 bg-black/80 backdrop-blur-md z-50 hidden flex-col items-center justify-center transition-opacity">
                    <i class="fa-solid fa-circle-notch fa-spin text-4xl text-purple-500 mb-6 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]"></i>
                    <h3 id="sb-load-title" class="text-sm font-bold tracking-[0.3em] text-white uppercase mb-2">SYSTEM STANDBY</h3>
                    <p id="sb-load-sub" class="text-xs text-purple-300 font-mono tracking-wide">Awaiting input...</p>
                </div>
            </div>
        `;
    },

    getInputs() {
        const formatBtn = document.querySelector('.ratio-btn-sb.active-ratio');
        return {
            prompt: document.getElementById('sb-prompt').value.trim(),
            format: formatBtn ? formatBtn.dataset.ratio : 'landscape',
            style: document.getElementById('sb-style').value.trim(),
            genre: document.getElementById('sb-genre').value.trim(),
            sceneCount: parseInt(document.getElementById('sb-count').value) || 5
        };
    },

    toggleLoading(show, title = "", sub = "") {
        const loader = document.getElementById('sb-loading');
        const btn = document.getElementById('btn-generate-storyboard');
        
        if (show) {
            loader.classList.remove('hidden');
            loader.classList.add('flex');
            if (btn) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            this.updateLoading(title, sub);
        } else {
            loader.classList.add('hidden');
            loader.classList.remove('flex');
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    },

    updateLoading(title, sub) {
        document.getElementById('sb-load-title').innerText = title;
        document.getElementById('sb-load-sub').innerText = sub;
    },

    renderGallerySkeleton(scenes) {
        document.getElementById('sb-empty-state').classList.add('hidden');
        const container = document.getElementById('sb-gallery-container');
        const gallery = document.getElementById('sb-gallery');
        container.classList.remove('hidden');
        gallery.innerHTML = '';

        scenes.forEach((scene, idx) => {
            const card = document.createElement('div');
            card.className = "bg-black/30 border border-white/5 rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row transition-all hover:border-white/10 shrink-0";
            
            // Format index as 01, 02, etc.
            const frameNum = (idx + 1).toString().padStart(2, '0');

            // AQUÍ ESTÁ EL CAMBIO CLAVE: object-contain y p-4 para que la imagen no se corte
            card.innerHTML = `
                <div class="w-full md:w-1/2 bg-black/60 flex items-center justify-center min-h-[300px] relative border-r border-white/5">
                    <i class="fa-solid fa-image text-3xl text-gray-800 absolute"></i>
                    <img id="sb-img-${idx}" class="w-full h-full object-contain p-4 drop-shadow-2xl relative z-10 hidden">
                </div>
                <div class="w-full md:w-1/2 p-8 flex flex-col justify-center">
                    <div class="mb-4">
                        <span class="text-[9px] font-bold text-white bg-purple-600/60 px-2.5 py-1 rounded shadow-lg uppercase tracking-widest">FRAME ${frameNum}</span>
                    </div>
                    <p class="text-gray-200 text-base font-serif leading-relaxed mb-6 italic border-l-2 border-purple-500/50 pl-4">
                        "${scene.narrative_desc}"
                    </p>
                    <div class="mt-auto pt-4 border-t border-white/5">
                        <span class="text-[8px] text-gray-500 uppercase font-bold tracking-widest mb-2 block">DIFFUSION PROMPT</span>
                        <p class="text-[9px] text-gray-400 font-mono leading-tight bg-black/40 p-2 rounded border border-white/5">${scene.visual_prompt}</p>
                    </div>
                </div>
            `;
            gallery.appendChild(card);
        });
    },

    updateSceneCard(index, sceneData) {
        const imgEl = document.getElementById(`sb-img-${index}`);
        if (imgEl && sceneData.image64) {
            imgEl.src = sceneData.image64;
            imgEl.classList.remove('hidden');
        }
    }
};