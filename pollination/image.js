// image.js

function setImageRatio(ratio, btnElement) {
    document.querySelectorAll('.ratio-btn-img').forEach(btn => {
        btn.classList.remove('active-ratio', 'bg-purple-500/20', 'border-purple-500/50', 'text-purple-400');
        btn.classList.add('bg-black/50', 'border-white/5', 'text-gray-400');
    });
    btnElement.classList.remove('bg-black/50', 'border-white/5', 'text-gray-400');
    btnElement.classList.add('active-ratio', 'bg-purple-500/20', 'border-purple-500/50', 'text-purple-400');
    btnElement.dataset.ratio = ratio;
}

function randomizeImageSeed() {
    const seedInput = document.getElementById('image-seed');
    const seedVal = document.getElementById('image-seed-val');
    
    if (seedInput && seedVal) {
        const seed = Math.floor(Math.random() * 9999999);
        seedInput.value = seed;
        seedVal.innerText = seed;
    }
}

function getImageDimensions(ratio) {
    switch(ratio) {
        case 'portrait': return { w: 768, h: 1344 };
        case 'square': return { w: 1024, h: 1024 };
        case 'landscape': default: return { w: 1344, h: 768 };
    }
}

async function generateImages() {
    let promptInput = document.getElementById('image-prompt').value.trim();
    if (!promptInput) return alert("Por favor, introduce una descripción para la imagen.");

    const count = Math.min(Math.max(parseInt(document.getElementById('image-batch').value) || 1, 1), 10);
    const isChroma = document.getElementById('image-chroma-toggle').checked;
    const model = document.getElementById('image-model').value;

    const ratioElement = document.querySelector('.ratio-btn-img.active-ratio');
    const ratio = ratioElement ? ratioElement.dataset.ratio : 'landscape';
    const dim = getImageDimensions(ratio);

    if (isChroma) {
        promptInput += ", isolated on pure vivid green background, hex color #00FF00, studio lighting, no shadows on background, hard rim lighting, crisp edges";
    }

    const btn = document.getElementById('btn-generate-image');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>PROCESANDO...</span>';
    btn.classList.add('opacity-50', 'cursor-not-allowed');

    document.getElementById('image-placeholder').classList.add('hidden');
    const gallery = document.getElementById('image-grid');
    gallery.innerHTML = '';
    document.getElementById('image-gallery').classList.remove('hidden');

    for (let i = 0; i < count; i++) {
        let seed = document.getElementById('image-seed').value;
        if(!seed || count > 1) { 
            // Si es batch, aleatorizamos la semilla para que no salgan idénticas
            seed = Math.floor(Math.random() * 9999999); 
        }

        await processSingleImage(promptInput, model, dim, seed, i, count, isChroma);
    }

    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
    btn.innerHTML = '<i class="fa-solid fa-image"></i> <span>GENERAR IMÁGENES</span>';
}

async function processSingleImage(prompt, model, dim, seed, index, totalCount, isChroma) {
    const safePrompt = encodeURIComponent(prompt);
    const apiKey = localStorage.getItem('pollinations_api_key') || '';
    
    let url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=${dim.w}&height=${dim.h}&seed=${seed}&nologo=true`;
    if (apiKey) url += `&key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("API Error: " + response.statusText);

        let blob = await response.blob();

        if (isChroma) {
            blob = await processGreenScreen(blob);
        }

        addImageToGallery(blob, seed, index, isChroma);

    } catch (e) {
        console.error("Error en la imagen " + index, e);
    }
}

function processGreenScreen(blob) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = URL.createObjectURL(blob);
        
        img.onload = () => {
            const canvas = document.getElementById('hidden-canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = frame.data;
            
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
            let foundPixel = false;

            for (let i = 0; i < data.length; i += 4) {
                let r = data[i];
                let g = data[i+1];
                let b = data[i+2];

                const rbMax = Math.max(r, b);
                
                if (g > rbMax) {
                    data[i+1] = rbMax;
                    const spillAmount = (g - rbMax);
                    
                    if (spillAmount > 60) {
                        data[i+3] = 0; 
                    } else if (spillAmount > 20) {
                        const alpha = 255 - ((spillAmount - 20) * (255 / 40));
                        data[i+3] = alpha;
                    }
                }

                if (data[i+3] > 10) {
                    const x = (i / 4) % canvas.width;
                    const y = Math.floor((i / 4) / canvas.width);
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                    foundPixel = true;
                }
            }

            ctx.putImageData(frame, 0, 0);

            if (!foundPixel) {
                canvas.toBlob(b => resolve(b), 'image/png');
                return;
            }

            const margin = 10;
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;
            const sx = Math.max(0, minX - margin);
            const sy = Math.max(0, minY - margin);
            const sw = Math.min(canvas.width - sx, w + margin * 2);
            const sh = Math.min(canvas.height - sy, h + margin * 2);

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = sw;
            cropCanvas.height = sh;
            cropCanvas.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);

            cropCanvas.toBlob(b => {
                URL.revokeObjectURL(img.src);
                resolve(b);
            }, 'image/png');
        };
        img.onerror = reject;
    });
}

function addImageToGallery(blob, seed, index, isPng) {
    const url = URL.createObjectURL(blob);
    const grid = document.getElementById('image-grid');
    
    const div = document.createElement('div');
    // Si es PNG con transparencia, le añadimos una clase especial para ver los cuadritos (definida en CSS) o un fondo específico
    div.className = `relative group bg-black/40 border border-white/5 rounded-xl overflow-hidden aspect-square flex items-center justify-center hover:border-white/20 transition-all cursor-zoom-in ${isPng ? 'transparency-bg' : ''}`;
    
    div.onclick = () => openLightbox(url, isPng);

    const ext = isPng ? 'png' : 'jpg';

    div.innerHTML = `
        <img src="${url}" class="w-full h-full object-contain ${isPng ? '' : 'bg-black'}">
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
            <span class="text-[10px] font-mono text-white/70 mb-auto self-start bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">SEED: ${seed}</span>
            <div class="flex gap-2 justify-end" onclick="event.stopPropagation()">
                 <a href="${url}" download="img-silenos-${seed}.${ext}" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs py-2 px-3 rounded-lg flex items-center gap-2 transition-colors backdrop-blur-sm">
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

function openLightbox(url, isPng) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-image');
    
    img.src = url;
    if (isPng) {
        img.classList.add('transparency-bg-lightbox');
        img.classList.remove('bg-black');
    } else {
        img.classList.remove('transparency-bg-lightbox');
        img.classList.add('bg-black');
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
    }, 10);
}

function closeLightbox() {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('lightbox-image').src = '';
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    const seedInputImg = document.getElementById('image-seed');
    if (seedInputImg) {
        seedInputImg.addEventListener('input', function() {
            document.getElementById('image-seed-val').innerText = this.value || 'Aleatoria';
        });
    }
});