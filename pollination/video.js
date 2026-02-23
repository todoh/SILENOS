// video.js

function setVideoRatio(ratio, btnElement) {
    // Restaurar el estilo de todos los botones de ratio
    document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.classList.remove('active-ratio', 'bg-purple-500/20', 'border-purple-500/50', 'text-purple-400');
        btn.classList.add('bg-black/50', 'border-white/5', 'text-gray-400');
    });
    // Aplicar el estilo activo al botón seleccionado
    btnElement.classList.remove('bg-black/50', 'border-white/5', 'text-gray-400');
    btnElement.classList.add('active-ratio', 'bg-purple-500/20', 'border-purple-500/50', 'text-purple-400');
    btnElement.dataset.ratio = ratio;
}

function randomizeVideoSeed() {
    const seedInput = document.getElementById('video-seed');
    const seedVal = document.getElementById('video-seed-val');
    
    if (seedInput && seedVal) {
        const seed = Math.floor(Math.random() * 10000000);
        seedInput.value = seed;
        seedVal.innerText = seed;
    }
}

async function generateVideo() {
    const promptInput = document.getElementById('video-prompt').value.trim();
    if (!promptInput) return alert("Por favor, introduce una descripción para el video.");

    const model = document.getElementById('video-model').value;
    const duration = document.getElementById('video-duration').value;
    let seed = document.getElementById('video-seed').value;
    
    if(!seed) {
        seed = Math.floor(Math.random() * 10000000);
        document.getElementById('video-seed').value = seed;
        document.getElementById('video-seed-val').innerText = seed;
    }

    const ratioElement = document.querySelector('.ratio-btn.active-ratio');
    const ratio = ratioElement ? ratioElement.dataset.ratio : 'landscape';

    const btn = document.getElementById('btn-generate-video');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>PROCESANDO...</span>';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    document.getElementById('video-placeholder').classList.add('hidden');
    document.getElementById('video-gallery').classList.remove('hidden');

    try {
        let dim = {w: 1280, h: 720};
        let aspectRatio = '16:9';
        if(ratio === 'portrait') { dim = {w: 720, h: 1280}; aspectRatio = '9:16'; }
        if(ratio === 'square') { dim = {w: 1024, h: 1024}; aspectRatio = '1:1'; }

        const safePrompt = encodeURIComponent(promptInput);
        const apiKey = localStorage.getItem('pollinations_api_key') || '';

        // Formato estricto para texto a video en Pollinations GET
        let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${dim.w}&height=${dim.h}&aspect_ratio=${aspectRatio}&seed=${seed}&nologo=true&duration=${duration}`;
        if (apiKey) url += `&key=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Error en la API: " + response.statusText);

        const blob = await response.blob();
        if (!blob.type.includes('video') && !blob.type.includes('mp4')) {
            console.warn("Se ha recibido un tipo diferente a video: " + blob.type);
        }

        addVideoToGallery(blob, seed);

    } catch (e) {
        console.error(e);
        alert("Error generando video: " + e.message);
    }

    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    btn.innerHTML = '<i class="fa-solid fa-video"></i> <span>GENERAR VIDEO</span>';
}

function addVideoToGallery(blob, seed) {
    const url = URL.createObjectURL(blob);
    const grid = document.getElementById('video-grid');
    
    const div = document.createElement('div');
    div.className = "relative group bg-black/40 border border-white/5 rounded-xl overflow-hidden aspect-video flex items-center justify-center hover:border-white/20 transition-all";
    
    div.innerHTML = `
        <video src="${url}" class="w-full h-full object-contain bg-black" loop muted playsinline onmouseover="this.play()" onmouseout="this.pause()"></video>
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
            <span class="text-[10px] font-mono text-white/70 mb-auto self-start bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">SEED: ${seed}</span>
            <div class="flex gap-2 justify-end">
                 <a href="${url}" download="video-silenos-${seed}.mp4" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs py-2 px-3 rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm">
                    <i class="fa-solid fa-download"></i>
                </a>
                <button onclick="window.open('${url}', '_blank')" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs py-2 px-3 rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm">
                    <i class="fa-solid fa-expand"></i>
                </button>
            </div>
        </div>
    `;
    
    grid.prepend(div);
}

// Inicializadores de Eventos para Video
document.addEventListener('DOMContentLoaded', () => {
    // Configurar listener para reflejar el ID de la semilla mientras se escribe
    const seedInput = document.getElementById('video-seed');
    if (seedInput) {
        seedInput.addEventListener('input', function() {
            document.getElementById('video-seed-val').innerText = this.value || 'Aleatoria';
        });
    }
});