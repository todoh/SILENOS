// music.js

async function generateMusic() {
    const promptInput = document.getElementById('music-prompt').value.trim();
    if (!promptInput) return alert("Por favor, introduce una descripción o letra para la música.");

    const voiceSelect = document.getElementById('music-voice');
    const voice = voiceSelect ? voiceSelect.value : 'rachel'; // Rachel por defecto según ElevenLabs
    
    const apiKey = localStorage.getItem('pollinations_api_key') || '';
    
    if (!apiKey) {
        alert("Por favor, conecta tu API Key de Pollination primero para generar música.");
        const modal = document.getElementById('login-modal');
        if (modal) modal.classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('btn-generate-music');
    const originalBtnHtml = btn.innerHTML;
    
    // Estado de carga
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>PROCESANDO...</span>';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    // Cambiar vista a la galería
    const placeholder = document.getElementById('music-placeholder');
    const gallery = document.getElementById('music-gallery');
    if (placeholder) placeholder.classList.add('hidden');
    if (gallery) gallery.classList.remove('hidden');

    try {
        const endpoint = "https://gen.pollinations.ai/v1/audio/speech";
        const payload = {
            model: "elevenmusic",
            input: promptInput,
            voice: voice,
            response_format: "mp3"
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Error ${response.status}: ${errText.substring(0, 50)}...`);
        }

        const blob = await response.blob();
        addMusicToGallery(blob, promptInput, voice);

    } catch (e) {
        console.error("Error en generación de música:", e);
        alert("Error generando música: " + e.message);
    }

    // Restaurar botón
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    btn.innerHTML = originalBtnHtml;
}

function addMusicToGallery(blob, prompt, voice) {
    const url = URL.createObjectURL(blob);
    const grid = document.getElementById('music-grid');
    const id = Date.now();
    
    const div = document.createElement('div');
    div.className = "relative bg-black/40 border border-white/5 rounded-xl overflow-hidden flex flex-col hover:border-white/20 transition-all p-5 gap-4 w-full shadow-lg";
    
    div.innerHTML = `
        <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-4 w-full overflow-hidden">
                <div class="w-12 h-12 shrink-0 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
                    <i class="fa-solid fa-music text-white text-lg"></i>
                </div>
                <div class="flex flex-col overflow-hidden w-full">
                    <span class="text-sm text-white font-medium truncate w-full block" title="${prompt}">${prompt}</span>
                    <span class="text-[10px] text-gray-400 uppercase tracking-wider mt-1">VOZ BASE: ${voice} • ELEVENMUSIC</span>
                </div>
            </div>
            <a href="${url}" download="music-silenos-${id}.mp3" class="shrink-0 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs py-2 px-3 rounded-lg flex items-center justify-center transition-colors backdrop-blur-sm" title="Descargar MP3">
                <i class="fa-solid fa-download"></i>
            </a>
        </div>
        <div class="w-full mt-2 bg-black/50 rounded-lg p-2 border border-white/5">
            <audio controls src="${url}" class="w-full h-8 outline-none opacity-90 hover:opacity-100 transition-opacity"></audio>
        </div>
    `;
    
    // Prepend para que las nuevas pistas salgan arriba
    grid.prepend(div);
}