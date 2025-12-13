// --- SISTEMA UI DE NOTIFICACIONES (MICRO-CARDS v2.5 - Result Ack) ---
console.log("Módulo Notification UI Cargado (v2.5 - Result Ack)");

let container = null;

function initContainer() {
    if (!document.querySelector('.notification-container')) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    } else {
        container = document.querySelector('.notification-container');
    }
}

// --- MICRO-TARJETAS DE ACTIVIDAD (LIVE FEED) ---

export function updateMicroCard(id, data) {
    initContainer();
    let card = document.getElementById(`mc-${id}`);
    
    const progress = data.progress || 0;
    const isCompleted = data.status === 'completed';
    const isError = data.status === 'error';
    
    if (!card) {
        if (isCompleted && !isError) return; // Si ya acabó, no mostramos micro-card (usaremos la notificación de resultado)

        card = document.createElement('div');
        card.id = `mc-${id}`;
        card.className = 'micro-card';
        
        let typeLabel = "PROCESO";
        if (data.type === 'script') typeLabel = "GUION";
        if (data.type === 'book') typeLabel = "LIBRO";
        if (data.type === 'game') typeLabel = "JUEGO";

        card.innerHTML = `
            <div class="mc-header">
                <span>${typeLabel}</span>
                <span class="mc-percent">0%</span>
            </div>
            <div class="mc-title">${data.title || 'Sin Título'}</div>
            <div class="mc-meta">Iniciando...</div>
            <div class="mc-progress-bar"></div>
        `;
        container.appendChild(card);
    }

    const msgEl = card.querySelector('.mc-meta');
    const percentEl = card.querySelector('.mc-percent');
    const barEl = card.querySelector('.mc-progress-bar');
    
    if (msgEl) msgEl.textContent = data.msg || (isCompleted ? "Completado" : "Procesando...");
    if (percentEl) percentEl.textContent = isCompleted ? "100%" : `${Math.floor(progress)}%`;
    if (barEl) barEl.style.width = `${progress}%`;

    if (isError) {
        card.classList.add('error');
        if(msgEl) msgEl.textContent = "Error: " + (data.msg || "Desconocido");
        setTimeout(() => closeNotification(card), 6000);
    } 
    else if (isCompleted) {
        // Al completarse, cerramos la micro-card rápido para dar paso a la Notificación de Resultado
        card.classList.add('completed');
        setTimeout(() => closeNotification(card), 1000); 
    }
}

// --- NOTIFICACIONES DE RESULTADO (NUEVO PROTOCOLO) ---
export function showResultNotification(title, type, onSave) {
    initContainer();
    const id = Date.now(); // ID único temporal para el DOM
    
    const notif = document.createElement('div');
    notif.className = 'silenos-notification';
    notif.id = `res-${id}`;
    
    // Estilo distintivo para resultados listos
    notif.style.borderLeft = "4px solid #00b894"; 
    notif.style.background = "#f0fff4"; // Fondo muy sutil verde

    let icon = "📦";
    let label = "ARCHIVO LISTO";
    if (type === 'script') { icon = "🎬"; label = "GUION LISTO"; }
    if (type === 'book') { icon = "📖"; label = "LIBRO LISTO"; }
    if (type === 'game') { icon = "🎲"; label = "JUEGO LISTO"; }

    notif.innerHTML = `
        <div class="notif-header" style="color:#00b894;">${label}</div>
        <div class="notif-body" style="font-weight:bold; font-size:1rem; margin-bottom:5px;">${title}</div>
        <div style="font-size:0.8rem; color:#666; margin-bottom:10px;">
            El contenido está en la nube. Confirma para descargar y guardar.
        </div>
        <button class="save-btn" style="
            width:100%; padding:12px; background:#00b894; color:white; 
            border:none; border-radius:8px; font-weight:700; cursor:pointer;
            box-shadow: 0 4px 6px rgba(0,184,148,0.2); text-transform:uppercase; letter-spacing:1px;
        ">
            📥 RECIBIR Y GUARDAR
        </button>
    `;

    const btn = notif.querySelector('.save-btn');
    btn.onclick = async () => {
        btn.textContent = "Guardando...";
        btn.disabled = true;
        btn.style.opacity = 0.7;
        
        // Ejecutamos la lógica de guardado
        const success = await onSave();
        
        if (success) {
            closeNotification(notif);
        } else {
            btn.textContent = "Reintentar";
            btn.disabled = false;
            btn.style.background = "#d63031"; // Rojo para indicar fallo
            btn.style.opacity = 1;
        }
    };

    container.appendChild(notif);
}


// --- NOTIFICACIONES DE SOLICITUD (AMIGOS) ---

export function showRequestNotification(requestData, onAccept, onDecline) {
    initContainer();
    if (document.getElementById(`notif-${requestData.id}`)) return;

    const notif = document.createElement('div');
    notif.className = 'silenos-notification';
    notif.id = `notif-${requestData.id}`;
    notif.style.borderLeft = "3px solid #0984e3";

    notif.innerHTML = `
        <div class="notif-header">SOLICITUD</div>
        <div class="notif-body"><strong>${requestData.name}</strong> quiere conectar contigo.</div>
        <div class="notif-actions">
            <button class="notif-btn accept" style="color:#0984e3;">Aceptar</button>
            <button class="notif-btn decline" style="color:#d63031;">Rechazar</button>
        </div>
    `;

    notif.querySelector('.accept').onclick = () => { closeNotification(notif); onAccept(); };
    notif.querySelector('.decline').onclick = () => { closeNotification(notif); onDecline(); };

    container.appendChild(notif);
}

function closeNotification(element) {
    element.style.animation = 'slideOutMicro 0.4s ease forwards';
    setTimeout(() => {
        if(element.parentElement) element.parentElement.removeChild(element);
    }, 400);
}