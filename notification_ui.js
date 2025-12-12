// --- SISTEMA UI DE NOTIFICACIONES (MICRO-CARDS v2.0) ---
console.log("Módulo Notification UI Cargado (v2.0 - MicroCards)");

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
    
    // Calcular estado
    const progress = data.progress || 0;
    const isCompleted = data.status === 'completed';
    const isError = data.status === 'error';
    
    // Si no existe, crearla
    if (!card) {
        // Si ya terminó antes de pintarla, la ignoramos (salvo error) para no saturar
        if (isCompleted && !isError) return;

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
        
        // Append al contenedor
        container.appendChild(card);
    }

    // Actualizar contenido (DOM Directo para rendimiento)
    const msgEl = card.querySelector('.mc-meta');
    const percentEl = card.querySelector('.mc-percent');
    const barEl = card.querySelector('.mc-progress-bar');
    
    if (msgEl) msgEl.textContent = data.msg || (isCompleted ? "Completado" : "Procesando...");
    if (percentEl) percentEl.textContent = isCompleted ? "100%" : `${Math.floor(progress)}%`;
    
    if (barEl) {
        barEl.style.width = `${progress}%`;
    }

    // Manejo de Estados Finales
    if (isError) {
        card.classList.add('error');
        if(msgEl) msgEl.textContent = "Error: " + (data.msg || "Desconocido");
        setTimeout(() => closeNotification(card), 6000); // Dar tiempo a leer el error
    } 
    else if (isCompleted) {
        card.classList.add('completed');
        setTimeout(() => closeNotification(card), 4000); // Auto-cierre suave
    }
}

// --- NOTIFICACIONES CLÁSICAS (SOLICITUDES) ---

export function showRequestNotification(requestData, onAccept, onDecline) {
    initContainer();
    if (document.getElementById(`notif-${requestData.id}`)) return;

    const notif = document.createElement('div');
    notif.className = 'micro-card'; // Reutilizamos estilo base pero personalizado
    notif.id = `notif-${requestData.id}`;
    notif.style.borderLeft = "3px solid #0984e3";

    notif.innerHTML = `
        <div class="mc-header"><span>SOLICITUD</span></div>
        <div class="mc-title">${requestData.name}</div>
        <div class="mc-meta">Quiere conectar contigo</div>
        <div style="display:flex; gap:5px; margin-top:8px;">
            <button class="accept-btn" style="flex:1; background:#00b894; color:white; border:none; border-radius:4px; cursor:pointer; padding:4px;">ACEPTAR</button>
            <button class="decline-btn" style="flex:1; background:#ff7675; color:white; border:none; border-radius:4px; cursor:pointer; padding:4px;">X</button>
        </div>
    `;

    notif.querySelector('.accept-btn').onclick = () => { closeNotification(notif); onAccept(); };
    notif.querySelector('.decline-btn').onclick = () => { closeNotification(notif); onDecline(); };

    container.appendChild(notif);
}

function closeNotification(element) {
    element.style.animation = 'slideOutMicro 0.4s ease forwards';
    setTimeout(() => {
        if(element.parentElement) element.parentElement.removeChild(element);
    }, 400);
}