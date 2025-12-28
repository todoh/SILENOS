/* SILENOS 3/clipboard/clipboard-youtube.js */

const YouTubePasteHandler = {
    ytRegex: /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i,

    canHandleText(text) {
        return this.ytRegex.test(text.trim());
    },

    async handleText(text, destParentId) {
        const match = text.trim().match(this.ytRegex);
        if (!match) return false;

        const videoId = match[1];
        let videoTitle = "Cargando video..."; // Estado inicial

        // 1. OBTENCIÓN DEL TÍTULO REAL (Corregido para evitar bloqueo CORS)
        try {
            // Usamos el proxy de noembed.com porque youtube.com bloquea peticiones directas del navegador
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await response.json();
            
            if (data.title) {
                videoTitle = data.title;
            } else {
                videoTitle = "YouTube Video " + videoId;
            }
        } catch (e) {
            console.error("Error al obtener metadatos (fallback activo):", e);
            videoTitle = "YouTube Video " + videoId;
        }

        // 2. GENERACIÓN DE IDENTIFICADOR ÚNICO BASADO EN EL NOMBRE
        const nameId = videoTitle.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/[^a-z0-9]/g, '-') // Reemplazar símbolos por guiones
            .replace(/-+/g, '-')        // Evitar guiones duplicados
            .replace(/^-|-$/g, '');     // Limpiar extremos

        const instanceId = Math.random().toString(36).substring(2, 8);
        const uniqueId = `${nameId}-${instanceId}`;

        // 3. CREACIÓN DEL ITEM EN EL FILESYSTEM CON EL NOMBRE DEL VIDEO
        const newItem = {
            id: uniqueId, 
            type: "executable",
            title: "▶ " + videoTitle, // Ahora sí mostrará el título real
            parentId: destParentId,
            x: 100, y: 100, z: 0,
            content: {
                nodes: [
                    { id: "node-start", type: "start", x: 50, y: 150, inputs: [], outputs: ["out"], values: {}, uiFlags: {} },
                    { id: "node-player", type: "nile-video-player-v1", x: 300, y: 100, inputs: ["open"], outputs: ["done"], values: { "titulo": videoTitle }, uiFlags: { "titulo": false } }
                ],
                connections: [{ fromNode: "node-start", fromPort: "out", toNode: "node-player", toPort: "open" }],
                embeddedModules: [{
                    id: "nile-video-player-v1",
                    title: videoTitle,
                    color: "#ff0000",
                    inputs: ["open"], outputs: ["done"],
                    fields: [{ "name": "titulo", "type": "text", "value": videoTitle }],
                    code: this.generatePlayerCode(videoId, videoTitle, instanceId)
                }]
            }
        };

        FileSystem.data.push(newItem);
        FileSystem.save();
        
        console.log("📺 App creada con éxito con título:", videoTitle);
        return true;
    },

    generatePlayerCode(videoId, title, instanceId) {
        return `
// --- FUNCIÓN DEL CANVAS (SISTEMA DE VISUALIZACIÓN VISION PRO) ---
const winId = 'yt-app-${instanceId}';
const existing = document.getElementById(winId);
if (existing) { existing.remove(); return; }

if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    if (firstScriptTag) firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    else document.head.appendChild(tag);
}

// Aseguramos que el título escape comillas simples para no romper el JS string
const safeTitle = "${title.replace(/"/g, '\\"').replace(/'/g, "\\'")}";
const tracks = [{ id: '${videoId}', title: safeTitle, sub: 'SILENOS Vision Player' }];
let player;
let playerState = 'normal'; 
const normalStyles = { width: '1100px', height: '780px', top: '30px', left: '50px', radius: '40px' };

const win = document.createElement('div');
win.id = winId;
win.style.cssText = \`position:fixed; top:\${normalStyles.top}; left:\${normalStyles.left}; width:\${normalStyles.width}; height:\${normalStyles.height}; z-index:99999; display:flex; flex-direction:column; background:#e0e5ec; border-radius:\${normalStyles.radius}; box-shadow:20px 20px 60px #bebebe, -20px -20px 60px #ffffff; transition: width 0.5s, height 0.5s, border-radius 0.5s, top 0.5s, left 0.5s, opacity 0.4s; overflow:hidden; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; pointer-events: auto;\`;

win.onmousedown = (e) => e.stopPropagation();

const header = document.createElement('div');
header.style.cssText = \`padding:25px 35px; display:flex; justify-content:space-between; align-items:center; cursor:grab; border-bottom:1px solid rgba(0,0,0,0.02); transition: 0.3s;\`;

const hLeft = document.createElement('div');
hLeft.style.cssText = \`display:flex; align-items:center; gap:20px; transition: 0.3s; overflow:hidden;\`;

const canvas = document.createElement('canvas');
canvas.width = 150; canvas.height = 40;
canvas.style.cssText = \`border-radius:20px; background:#e0e5ec; box-shadow:inset 4px 4px 8px #b8b9be, inset -4px -4px 8px #ffffff;\`;
const gl = canvas.getContext('2d');

hLeft.innerHTML = \`
    <div style="width:40px; height:40px; background:#ff0000; border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:5px 5px 10px #b8b9be; flex-shrink:0;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M8 5v14l11-7z"/></svg>
    </div>
    <div id="dot-titles" style="white-space:nowrap; flex-shrink:0;">
        <span style="font-weight:900; color:#1a1a1a; font-size:14px; letter-spacing:0.5px; display:block;">\${tracks[0].title.toUpperCase()}</span>
        <span style="font-size:10px; color:#777; font-weight:600;">\${tracks[0].sub}</span>
    </div>\`;
hLeft.appendChild(canvas);

const hRight = document.createElement('div');
hRight.style.cssText = "display:flex; gap:12px; flex-shrink:0; align-items:center;";
const btnBase = "width:35px; height:35px; border-radius:50%; border:none; cursor:pointer; background:#e0e5ec; box-shadow: 4px 4px 8px #b8b9be, -4px -4px 8px #ffffff; color:#666; display:flex; align-items:center; justify-content:center; transition:0.2s; font-size:14px; font-weight:bold;";

const minBtn = document.createElement('button'); minBtn.innerHTML = '—'; minBtn.style.cssText = btnBase;
const maxBtn = document.createElement('button'); maxBtn.innerHTML = '▢'; maxBtn.style.cssText = btnBase;
const closeBtn = document.createElement('button'); closeBtn.innerHTML = '✕'; closeBtn.style.cssText = btnBase;

hRight.append(minBtn, maxBtn, closeBtn);
header.append(hLeft, hRight);

const body = document.createElement('div');
body.style.cssText = "flex:1; display:flex; padding:30px; gap:30px; overflow:hidden; transition: 0.3s;";

const screen = document.createElement('div');
screen.style.cssText = "flex:1; border-radius:30px; background:#000; box-shadow:18px 18px 36px #b8b9be; overflow:hidden; position:relative;";

const videoContainer = document.createElement('div');
videoContainer.id = 'yt-container-' + winId;
videoContainer.style.cssText = "width:100%; height:100%;";
screen.appendChild(videoContainer);

function updateUIState() {
    if (playerState === 'mini') {
        win.style.width = '320px'; win.style.height = '240px';
        win.style.left = '20px'; win.style.top = (window.innerHeight - 260) + 'px';
        win.style.borderRadius = '25px';
        hLeft.style.width = '0px'; hLeft.style.opacity = '0';
        body.style.padding = '10px';
        maxBtn.innerHTML = '▢'; minBtn.innerHTML = '⤢';
    } else if (playerState === 'max') {
        win.style.width = '100vw'; win.style.height = '100vh';
        win.style.top = '0'; win.style.left = '0';
        win.style.borderRadius = '0';
        hLeft.style.width = 'auto'; hLeft.style.opacity = '1';
        body.style.padding = '30px';
        maxBtn.innerHTML = '❐'; minBtn.innerHTML = '—';
    } else {
        win.style.width = normalStyles.width; win.style.height = normalStyles.height;
        win.style.top = normalStyles.top; win.style.left = normalStyles.left;
        win.style.borderRadius = normalStyles.radius;
        hLeft.style.width = 'auto'; hLeft.style.opacity = '1';
        body.style.padding = '30px';
        maxBtn.innerHTML = '▢'; minBtn.innerHTML = '—';
    }
}

minBtn.onclick = (e) => { e.stopPropagation(); playerState = (playerState === 'mini') ? 'normal' : 'mini'; updateUIState(); };
maxBtn.onclick = (e) => { e.stopPropagation(); playerState = (playerState === 'max') ? 'normal' : 'max'; updateUIState(); };

function initPlayer() {
    player = new YT.Player('yt-container-' + winId, {
        height: '100%', width: '100%', videoId: tracks[0].id,
        playerVars: { 'autoplay': 1, 'modestbranding': 1, 'rel': 0 }
    });
}

let time = 0;
function animate() {
    if (!document.getElementById(winId)) return;
    gl.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 15; const spacing = 8;
    for (let i = 0; i < bars; i++) {
        const wave = Math.sin(time + i * 0.4) * 0.5 + 0.5;
        const h = 5 + wave * 20;
        gl.fillStyle = i % 2 === 0 ? '#ff0000' : '#aab2bd';
        gl.fillRect(15 + i * spacing, 20 - h / 2, 4, h);
    }
    time += 0.08;
    requestAnimationFrame(animate);
}

body.append(screen); win.append(header, body); document.body.appendChild(win);
if (window.YT && window.YT.Player) initPlayer(); else window.onYouTubeIframeAPIReady = initPlayer;
animate();

let isDragging=false, offset={x:0,y:0};
header.onmousedown=(e)=>{
    e.stopPropagation(); 
    if(e.target.tagName==='BUTTON' || playerState !== 'normal') return;
    isDragging=true;
    offset.x=e.clientX-win.offsetLeft;
    offset.y=e.clientY-win.offsetTop;
    win.style.transition = 'none';
};

window.addEventListener('mousemove',(e)=>{
    if(!isDragging) return;
    e.preventDefault();
    win.style.left=(e.clientX-offset.x)+'px';
    win.style.top=(e.clientY-offset.y)+'px';
    normalStyles.left = win.style.left;
    normalStyles.top = win.style.top;
});

window.addEventListener('mouseup',()=>{ 
    if(isDragging) {
        isDragging=false; 
        win.style.transition = 'width 0.5s, height 0.5s, border-radius 0.5s, top 0.5s, left 0.5s';
    }
});

closeBtn.onclick = (e) => { 
    e.stopPropagation();
    win.style.opacity='0'; win.style.transform='scale(0.9)'; 
    setTimeout(()=>win.remove(), 400); 
};
`;
    }
};

ClipboardProcessor.registerHandler(YouTubePasteHandler);