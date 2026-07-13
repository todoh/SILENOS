import { CONFIG } from './main.js';
import { appendLog } from './ui.js';

export function updatePollinationsAuthUI() {
    const indicator = document.getElementById('polli-status-dot');
    const text = document.getElementById('polli-status-text');
    if (CONFIG.pollinationsApiKey) {
        indicator.className = "w-2 h-2 rounded-full bg-emerald-500";
        text.innerText = "ONLINE";
        text.className = "text-[10px] font-bold text-emerald-400 tracking-wider uppercase";
    } else {
        indicator.className = "w-2 h-2 rounded-full bg-slate-500";
        text.innerText = "OFFLINE";
        text.className = "text-[10px] font-medium text-slate-400 tracking-wider uppercase";
    }
}

export function manualAuthPollinations() {
    if (CONFIG.pollinationsApiKey && confirm("¿Desconectar API Key de Pollinations?")) {
        CONFIG.pollinationsApiKey = null;
        localStorage.removeItem('pollinations_api_key');
        updatePollinationsAuthUI();
        return;
    }
    
    // Cambiamos a la redirección limpia en la misma pestaña tal como lo hace Imagenes.html
    const params = new URLSearchParams({
        redirect_uri: window.location.href,
        client_id: 'pk_abc123', // Usa tu clave pública asignada si dispones de ella, o se asume el flujo de host alternativo por defecto
        scope: 'usage'
    });
    
    window.location.href = `https://enter.pollinations.ai/authorize?${params.toString()}`;
}

export async function sintetizarEInyectarImagenPollinations(idNodo, promptVisual) {
    const pollinationsModel = document.getElementById('pollinations-model');
    const pollinationsRatio = document.getElementById('pollinations-ratio');
    const chromaToggle = document.getElementById('chroma-toggle');

    const modeloSeleccionado = pollinationsModel.value;
    const formatoSeleccionado = pollinationsRatio.value;
    const isChroma = chromaToggle.checked;
    
    let width = 2344;
    let height = 1768;

    if (formatoSeleccionado === "square") { width = 2024; height = 2024; }
    else if (formatoSeleccionado === "portrait") { width = 1768; height = 2344; }

    let finalPrompt = promptVisual;
    if (isChroma) {
        finalPrompt += ", isolated on pure vivid green background, hex color #00FF00, studio lighting, no shadows on background, hard rim lighting, crisp edges";
    }

    const seedEstocastico = Math.floor(Math.random() * 9999999);
    let urlSintesis = `https://gen.pollinations.ai/image/${encodeURIComponent(finalPrompt)}?model=${modeloSeleccionado}&width=${width}&height=${height}&seed=${seedEstocastico}&nologo=true`;
    
    if (CONFIG.pollinationsApiKey) {
        urlSintesis += `&key=${CONFIG.pollinationsApiKey}`;
    }

    const response = await fetch(urlSintesis);
    if (!response.ok) throw new Error("No se obtuvo respuesta válida del servidor de Pollinations.");

    let blobImagen = await response.blob();
    
    if (isChroma) {
        blobImagen = await procesarChromaKeyCanvas(blobImagen);
    }
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blobImagen);
    });
}

function procesarChromaKeyCanvas(blob) {
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